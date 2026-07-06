---
title: "Building a Real-time WebSocket Chat Server with Go"
description: "A hands-on tutorial for building a full-featured WebSocket chat server in Go using gorilla/websocket, covering connection management, room-based messaging, concurrency patterns, and graceful shutdown."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Real-time WebSocket Chat Server with Go

## Summary

This tutorial walks through building a complete real-time chat server in Go using the `gorilla/websocket` library. You will learn how to manage WebSocket connections concurrently using the Hub pattern, implement room-based chat rooms with message broadcasting, handle client lifecycle (connect, disconnect, reconnect), and properly coordinate goroutines with channels for graceful shutdown. By the end, you will have a production-style WebSocket server that multiple users can connect to and chat in real time.

## Target Audience

- Backend developers with intermediate Go knowledge (structs, interfaces, goroutines, channels).
- Developers who have completed a basic Go tutorial and want to explore real-time networking and concurrency in depth.
- Engineers looking to understand production WebSocket patterns (connection pooling, graceful shutdown, broadcast fan-out).

## Prerequisites

- Go 1.22 or later installed on your machine.
- Basic familiarity with Go syntax (functions, structs, methods, slices, maps).
- A basic understanding of HTTP and the client-server model.
- `curl` and a WebSocket client (such as `wscat` installed via `npm install -g wscat`, or a browser developer console).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up a WebSocket endpoint in Go using `gorilla/websocket` with HTTP upgrade.
- Implement the Hub pattern for centralized WebSocket connection management across goroutines.
- Design a room-based messaging model with typed message protocols using discriminated unions.
- Coordinate goroutine lifecycle with `context.Context`, `sync.WaitGroup`, and channel-based signaling.
- Handle client connection lifecycle: authentication, disconnect detection, ping/pong keep-alive, and graceful teardown.
- Build a simple browser-based chat client that communicates with the Go server.

## Context and Motivation

Real-time communication is a core requirement for modern web applications — chat systems, live notifications, collaborative editing, multiplayer games, and live dashboards all demand low-latency bidirectional data transfer. Traditional HTTP request-response cycles introduce unacceptable overhead for these use cases.

WebSocket, standardized as RFC 6455, provides a full-duplex persistent connection between client and server over a single TCP socket. Go's concurrency model — goroutines and channels — maps naturally to WebSocket programming: each connection can be managed by its own goroutine, and channels provide safe, composable communication between them.

However, building a WebSocket server that correctly handles concurrent connections, room-based message fan-out, reconnection, and graceful shutdown involves non-trivial concurrency patterns that many tutorials gloss over. This tutorial bridges that gap by building a production-quality chat server from scratch, explaining each concurrency decision along the way.

## Core Content

### Architecture Overview

The chat server follows the **Hub** pattern, a well-known design from the Gorilla WebSocket examples:

```text
Client A ──ws──▶ WebSocket Handler ──reg──▶ Hub (central state) ──broadcast──▶ Room Manager
Client B ──ws──▶ WebSocket Handler ──reg──┘                                       │
Client C ──ws──▶ WebSocket Handler ──join──▶ Room "general" ◀──message──┐         │
Client D ──ws──▶ WebSocket Handler ──join──▶ Room "random"  ◀──message──┤         │
                                                                            │         │
                                                                            ▼         ▼
                                                                     Broadcasts to  Broadcasts to
                                                                     Room "general" Room "random"
```

Three primary goroutine types coordinate to form the server:

1. **Hub goroutine** — owns the master set of all connected clients and room membership state. It never locks — state is confined to a single goroutine, eliminating mutex contention.
2. **Client readPump goroutine** — one per connection, reads incoming messages from the WebSocket, parses them, and forwards action events to the Hub via channels.
3. **Client writePump goroutine** — one per connection, receives outgoing messages from the Hub's broadcast channel and writes them to the WebSocket connection.

This design ensures that each goroutine has a single responsibility and communicates with others exclusively through typed channels — the core Go concurrency mantra: "Do not communicate by sharing memory; instead, share memory by communicating."

### Project Structure

```text
chat-server/
├── main.go          # HTTP server, route registration, graceful shutdown
├── hub.go           # Central Hub: manages clients, rooms, message routing
├── client.go        # Client: WebSocket connection wrapper (readPump, writePump)
├── message.go       # Message type definitions (discriminated union protocol)
└── room.go          # Room: manages a set of clients subscribed to a topic
```

### Message Protocol Design

All communication between client and server uses a JSON-based discriminated union. Every message has a `type` field that determines its structure:

```text
Client → Server:
  {"type": "join",   "room": "general"}
  {"type": "leave",  "room": "general"}
  {"type": "message","room": "general", "text": "Hello, world!"}

Server → Client:
  {"type": "error",              "text": "Unknown room"}
  {"type": "system",  "room": "general", "text": "Alice joined the room"}
  {"type": "message", "room": "general", "sender": "Alice", "text": "Hello, world!"}
  {"type": "history", "room": "general", "messages": [...]}
```

This protocol is simple, extensible, and easy to parse on the client side.

### Step 1: Message Types and Protocol

Start by defining the message structures and a helper function to parse inbound messages:

```go
// message.go
package main

import "encoding/json"

// InboundMessage represents a message sent from the client to the server.
type InboundMessage struct {
    Type string `json:"type"`
    Room string `json:"room,omitempty"`
    Text string `json:"text,omitempty"`
}

// OutboundMessage represents a message sent from the server to clients.
type OutboundMessage struct {
    Type   string   `json:"type"`
    Room   string   `json:"room,omitempty"`
    Sender string   `json:"sender,omitempty"`
    Text   string   `json:"text,omitempty"`
    List   []string `json:"list,omitempty"`
}

// parseInbound decodes a raw JSON byte slice into an InboundMessage.
func parseInbound(data []byte) (InboundMessage, error) {
    var msg InboundMessage
    if err := json.Unmarshal(data, &msg); err != nil {
        return InboundMessage{}, err
    }
    return msg, nil
}
```

### Step 2: The Hub — Central State Manager

The Hub is the central coordinator. It runs as a single goroutine that owns all mutable state, receiving commands through typed channels:

```go
// hub.go
package main

// Hub maintains the set of active clients and room memberships.
type Hub struct {
    clients    map[*Client]bool          // all connected clients
    rooms      map[string]map[*Client]bool // room name → set of clients
    register   chan *Client              // client wants to connect
    unregister chan *Client              // client wants to disconnect
    broadcast  chan HubMessage           // message to fan out
}

// HubMessage wraps an outbound message with optional room targeting.
type HubMessage struct {
    Message OutboundMessage
    Room    string // if set, broadcast only to this room
    Sender  *Client // if set, exclude this client (echo suppression)
}

// NewHub creates and returns a new Hub instance.
func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        rooms:      make(map[string]map[*Client]bool),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        broadcast:  make(chan HubMessage, 256),
    }
}

// Run starts the Hub's event loop. Must be called as a goroutine.
func (h *Hub) Run(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        case client := <-h.register:
            h.clients[client] = true
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                // Remove client from all rooms
                for _, members := range h.rooms {
                    delete(members, client)
                }
                delete(h.clients, client)
                close(client.send)
            }
        case hmsg := <-h.broadcast:
            if hmsg.Room != "" {
                // Room-specific broadcast
                if members, ok := h.rooms[hmsg.Room]; ok {
                    for client := range members {
                        if client != hmsg.Sender {
                            select {
                            case client.send <- hmsg.Message:
                            default:
                                close(client.send)
                                delete(h.clients, client)
                            }
                        }
                    }
                }
            } else {
                // Global broadcast (system-wide)
                for client := range h.clients {
                    select {
                    case client.send <- hmsg.Message:
                    default:
                        close(client.send)
                        delete(h.clients, client)
                    }
                }
            }
        }
    }
}
```

Key design decisions in the Hub:

- **Single-ownership concurrency**: all room membership and client state is only ever read or mutated by the Hub goroutine. No mutexes needed.
- **Buffered broadcast channel**: the `256` buffer absorbs temporary spikes in broadcast volume without blocking senders.
- **Non-blocking client sends**: the `select` with `default` drops messages to slow clients instead of blocking the entire broadcast pipeline (back-pressure protection).
- **Context-based shutdown**: passing `ctx` to `Run()` allows the main function to signal termination cleanly.

### Step 3: The Client — Connection Lifecycle

Each WebSocket connection is wrapped in a `Client` struct with two goroutines — one for reading (readPump) and one for writing (writePump):

```go
// client.go
package main

import (
    "context"
    "log"
    "time"

    "github.com/gorilla/websocket"
)

const (
    // Time allowed to write a message to the peer.
    writeWait = 10 * time.Second

    // Time allowed to read the next pong message from the peer.
    pongWait = 60 * time.Second

    // Send pings to peer with this period. Must be less than pongWait.
    pingPeriod = (pongWait * 9) / 10

    // Maximum message size allowed from peer.
    maxMessageSize = 4096
)

// Client represents a single WebSocket connection.
type Client struct {
    hub  *Hub
    conn *websocket.Conn
    send chan OutboundMessage
    name string // display name, set after the first message
}

// readPump pumps messages from the WebSocket connection to the hub.
func (c *Client) readPump(ctx context.Context) {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        select {
        case <-ctx.Done():
            return
        default:
            _, message, err := c.conn.ReadMessage()
            if err != nil {
                if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
                    log.Printf("read error: %v", err)
                }
                return
            }

            inbound, err := parseInbound(message)
            if err != nil {
                c.send <- OutboundMessage{Type: "error", Text: "Invalid message format"}
                continue
            }

            c.handleMessage(inbound)
        }
    }
}

// handleMessage processes an inbound message and routes it through the hub.
func (c *Client) handleMessage(msg InboundMessage) {
    switch msg.Type {
    case "join":
        if msg.Room == "" {
            c.send <- OutboundMessage{Type: "error", Text: "Room name is required"}
            return
        }
        c.hub.joinRoom(c, msg.Room)

    case "leave":
        c.hub.leaveRoom(c, msg.Room)

    case "message":
        if msg.Room == "" || msg.Text == "" {
            c.send <- OutboundMessage{Type: "error", Text: "Room and text are required"}
            return
        }
        c.hub.broadcast <- HubMessage{
            Message: OutboundMessage{
                Type:   "message",
                Room:   msg.Room,
                Sender: c.name,
                Text:   msg.Text,
            },
            Room:   msg.Room,
            Sender: c,
        }

    default:
        c.send <- OutboundMessage{Type: "error", Text: "Unknown message type: " + msg.Type}
    }
}

// writePump pumps messages from the hub to the WebSocket connection.
func (c *Client) writePump(ctx context.Context) {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case <-ctx.Done():
            // Flush remaining messages with a deadline
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            c.conn.WriteMessage(websocket.CloseMessage, []byte{})
            return

        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            if err := c.conn.WriteJSON(message); err != nil {
                return
            }

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

### Step 4: The Room — Membership Management

Add room management methods to the Hub:

```go
// room.go
package main

import "log"

// joinRoom adds a client to a room and notifies existing members.
func (h *Hub) joinRoom(c *Client, room string) {
    if h.rooms[room] == nil {
        h.rooms[room] = make(map[*Client]bool)
    }
    h.rooms[room][c] = true

    // Set display name from first room join
    if c.name == "" {
        c.name = "User-" + randomID(4)
    }

    // Notify the room
    h.broadcast <- HubMessage{
        Message: OutboundMessage{
            Type: "system",
            Room: room,
            Text: c.name + " joined the room",
        },
        Room: room,
    }

    log.Printf("Client %s joined room %s", c.name, room)
}

// leaveRoom removes a client from a room and notifies remaining members.
func (h *Hub) leaveRoom(c *Client, room string) {
    if members, ok := h.rooms[room]; ok {
        delete(members, c)
        if len(members) == 0 {
            delete(h.rooms, room)
        }
        h.broadcast <- HubMessage{
            Message: OutboundMessage{
                Type: "system",
                Room: room,
                Text: c.name + " left the room",
            },
            Room: room,
        }
        log.Printf("Client %s left room %s", c.name, room)
    }
}

// randomID generates a short random identifier for display names.
func randomID(length int) string {
    const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
    buf := make([]byte, length)
    for i := range buf {
        buf[i] = letters[hashIndex(i, length)]
    }
    return string(buf)
}

func hashIndex(i, length int) int {
    // Simple deterministic seeding — in production, use crypto/rand
    return (i*7 + length*13) % len("abcdefghijklmnopqrstuvwxyz0123456789")
}
```

### Step 5: HTTP Server with WebSocket Upgrade and Graceful Shutdown

Wire everything together in `main.go`:

```go
// main.go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true // Allow all origins for development
    },
}

func main() {
    hub := NewHub()
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Start the Hub's event loop
    go hub.Run(ctx)

    // WebSocket endpoint
    http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        serveWS(hub, w, r)
    })

    // Health check endpoint
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok"}`))
    })

    server := &http.Server{
        Addr:         ":8080",
        Handler:      nil,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
    }

    // Start HTTP server
    go func() {
        log.Printf("Chat server starting on :8080")
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("listen error: %v", err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    log.Println("Shutting down server...")

    // Cancel the Hub context (stops Hub Run loop)
    cancel()

    // Give existing connections time to drain
    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer shutdownCancel()

    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited cleanly")
}

// serveWS handles the WebSocket upgrade handshake.
func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("upgrade error: %v", err)
        return
    }

    client := &Client{
        hub:  hub,
        conn: conn,
        send: make(chan OutboundMessage, 256),
    }

    hub.register <- client

    // Start read and write pumps in separate goroutines
    ctx := context.Background()
    go client.writePump(ctx)
    go client.readPump(ctx)
}
```

### Step 6: Running the Server

Create a `go.mod` file and install the dependency:

```bash
go mod init chat-server
go get github.com/gorilla/websocket
```

Run the server:

```bash
go run .
```

### Step 7: Testing with wscat

In a terminal window, start the server:

```bash
go run .
```

In a second terminal, connect using `wscat`:

```bash
# Install wscat if needed
npm install -g wscat

# Connect to the server
wscat -c ws://localhost:8080/ws
```

Once connected, send JSON commands:

```json
{"type": "join", "room": "general"}
{"type": "message", "room": "general", "text": "Hello from wscat!"}
{"type": "leave", "room": "general"}
```

Open a second terminal with another `wscat` connection to see real-time message broadcasting between clients.

## Code Examples

### Complete Working Example — Browser Chat Client

Save the following HTML file and open it in a browser while the Go server is running:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Go WebSocket Chat</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; background: #1a1a2e; color: #eee; display: flex; height: 100vh; }
        #app { display: flex; width: 100%; max-width: 900px; margin: auto; height: 80vh; }
        #sidebar { width: 200px; background: #16213e; padding: 16px; border-radius: 8px 0 0 8px; }
        #sidebar h3 { margin-bottom: 8px; color: #0f3460; }
        #room-list { list-style: none; }
        #room-list li { padding: 4px 8px; cursor: pointer; border-radius: 4px; }
        #room-list li:hover { background: #0f3460; }
        #room-list li.active { background: #e94560; color: #fff; }
        #chat { flex: 1; display: flex; flex-direction: column; background: #0f3460; border-radius: 0 8px 8px 0; }
        #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .msg { padding: 8px 12px; border-radius: 8px; max-width: 70%; background: #1a1a2e; }
        .msg.system { background: transparent; color: #aaa; font-style: italic; font-size: 0.9em; text-align: center; }
        .msg.self { align-self: flex-end; background: #e94560; }
        .sender { font-size: 0.8em; font-weight: bold; color: #e94560; margin-bottom: 2px; }
        #input-bar { display: flex; padding: 12px; gap: 8px; background: #16213e; border-radius: 0 0 8px 0; }
        #input { flex: 1; padding: 10px; border: none; border-radius: 4px; background: #1a1a2e; color: #eee; }
        #send { padding: 10px 20px; background: #e94560; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        #status { position: fixed; top: 16px; right: 16px; padding: 8px 16px; border-radius: 4px; font-size: 0.9em; }
        .connected { background: #2ecc71; color: #fff; }
        .disconnected { background: #e74c3c; color: #fff; }
    </style>
</head>
<body>
    <div id="status" class="disconnected">Disconnected</div>
    <div id="app">
        <div id="sidebar">
            <h3>Rooms</h3>
            <ul id="room-list">
                <li data-room="general"># general</li>
                <li data-room="random"># random</li>
                <li data-room="golang"># golang</li>
            </ul>
        </div>
        <div id="chat">
            <div id="messages"></div>
            <div id="input-bar">
                <input id="input" type="text" placeholder="Type a message..." />
                <button id="send">Send</button>
            </div>
        </div>
    </div>
    <script>
        const status = document.getElementById('status');
        const messages = document.getElementById('messages');
        const input = document.getElementById('input');
        const sendBtn = document.getElementById('send');
        const roomList = document.getElementById('room-list');

        let ws = null;
        let currentRoom = 'general';
        let userName = 'User-' + Math.random().toString(36).slice(2, 6);

        function connect() {
            ws = new WebSocket('ws://localhost:8080/ws');

            ws.onopen = () => {
                status.textContent = 'Connected';
                status.className = 'connected';
                ws.send(JSON.stringify({ type: 'join', room: currentRoom }));
            };

            ws.onclose = () => {
                status.textContent = 'Disconnected';
                status.className = 'disconnected';
                setTimeout(connect, 3000);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const div = document.createElement('div');

                if (data.type === 'system') {
                    div.className = 'msg system';
                    div.textContent = data.text;
                } else if (data.type === 'error') {
                    div.className = 'msg system';
                    div.style.color = '#e74c3c';
                    div.textContent = 'Error: ' + data.text;
                } else if (data.type === 'message') {
                    div.className = 'msg';
                    if (data.sender === userName) div.classList.add('self');
                    div.innerHTML = `<div class="sender">${data.sender}</div>${data.text}`;
                }

                messages.appendChild(div);
                messages.scrollTop = messages.scrollHeight;
            };
        }

        function sendMessage() {
            const text = input.value.trim();
            if (!text || !ws) return;
            ws.send(JSON.stringify({ type: 'message', room: currentRoom, text }));
            input.value = '';
        }

        function switchRoom(room) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'leave', room: currentRoom }));
                ws.send(JSON.stringify({ type: 'join', room }));
            }
            currentRoom = room;
            document.querySelectorAll('#room-list li').forEach(li => li.classList.remove('active'));
            document.querySelector(`[data-room="${room}"]`).classList.add('active');
            messages.innerHTML = ''; // Clear messages for new room
        }

        roomList.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li) switchRoom(li.dataset.room);
        });

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

        connect();
    </script>
</body>
</html>
```

Open the HTML file in two browser tabs. Both connect to the same Go server and can chat in real time across rooms.

## Key Insights

- **Hub pattern eliminates mutexes**: By confining all shared state to a single goroutine and using channels for communication, the Hub avoids the complexity and pitfalls of mutex-based synchronization. This is the idiomatic Go approach to shared state.
- **Non-blocking sends prevent broadcast back-pressure**: The `select` with `default` in the Hub's broadcast loop ensures that a slow or disconnected client cannot block message delivery to all other clients. This is critical for production reliability.
- **Ping/pong keep-alive detects dead connections**: The `gorilla/websocket` library provides built-in ping/pong handlers. Setting read deadlines and pong handlers ensures that stale connections are detected and cleaned up within the `pongWait` window (60 seconds in this example).
- **Context-based cancellation for graceful shutdown**: Passing a `context.Context` to goroutines and selecting on `<-ctx.Done()` allows the server to shut down without abruptly terminating in-flight connections. The 10-second drain window gives clients time to reconnect.
- **Read deadline + pong handler pairing**: The `SetReadDeadline` is extended every time a pong is received. This creates a simple heartbeat mechanism: if no data arrives within `pongWait`, the connection is considered dead. Always pair these two — setting one without the other leads to premature disconnections or undetected dead connections.
- **Message protocol versioning**: The type-discriminated JSON protocol (`"type": "message"`, `"type": "join"`, etc.) is easy to extend. Adding a new message type (e.g., `"typing"` for typing indicators) requires only adding a new case to the `handleMessage` switch without breaking existing clients.

## Next Steps

- Explore authentication by issuing JWT tokens before allowing WebSocket connections (validate tokens in `serveWS`).
- Add message persistence with PostgreSQL or Redis so clients see history when joining a room.
- Implement horizontal scaling using Redis Pub/Sub as a message bus between multiple Go server instances.
- Build a more sophisticated client with React, Vue.js, or a mobile framework (see the Flutter or React Native tutorials in this library).
- Study the [Gorilla WebSocket documentation](https://github.com/gorilla/websocket) for advanced features like compression, subprotocols, and TLS support.
- Review the [Go concurrency patterns guide](../guides/golang-concurrency-patterns-guide.md) in this library for deeper coverage of pipeline, fan-out/fan-in, and errgroup patterns.

## Conclusion

In this tutorial, you built a complete real-time WebSocket chat server in Go using the `gorilla/websocket` library. You learned how to implement the Hub pattern for centralized connection management, design a JSON-based message protocol with discriminated union types, manage room membership with safe concurrent broadcasting, and handle graceful shutdown with context cancellation. These patterns — single-owner goroutines, channel-based communication, non-blocking fan-out, and lifecycle-aware connection management — are directly applicable to any real-time Go application, from live dashboards to multiplayer games to collaborative editing tools.

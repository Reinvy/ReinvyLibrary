---
title: "Building a Real-time Chat Application with Bun WebSocket"
description: "A project-based tutorial on building a real-time group chat application using Bun's built-in WebSocket support. Covers server-side WebSocket handling, room management, and a browser-based client."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Real-time Chat Application with Bun WebSocket

## Summary

In this project-based tutorial, you will build a fully functional real-time group chat application using Bun's built-in WebSocket API. You will learn how to handle WebSocket connections, manage chat rooms, broadcast messages, and build a browser-based client interface — all without any external dependencies beyond Bun itself.

## Target Audience

- Backend developers and JavaScript/TypeScript developers interested in real-time applications.
- Developers who have basic familiarity with Bun and want to explore its WebSocket capabilities.
- Intermediate-level developers comfortable with JavaScript and async programming.

## Prerequisites

- Bun installed on your system (see the [Getting Started with Bun](/backend/bun/tutorials/getting-started-with-bun) tutorial).
- Basic knowledge of JavaScript (ES modules, arrow functions, `async`/`await`).
- A modern web browser for testing the chat client.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up a Bun HTTP server with WebSocket support using `Bun.serve()`.
- Handle WebSocket lifecycle events (`open`, `message`, `close`) on the server.
- Implement a room-based chat system with message broadcasting.
- Build a browser-based WebSocket client with a chat UI.
- Manage connection state, heartbeat pings, and graceful disconnection.
- Deploy a Bun WebSocket server for production use.

## Context and Motivation

Real-time communication is a cornerstone of modern web applications — from chat apps and live notifications to collaborative editing and multiplayer games. Traditional Node.js setups require external libraries like `socket.io` or `ws` to handle WebSocket connections, adding complexity to the dependency tree and configuration.

Bun changes this by baking WebSocket support directly into its HTTP server runtime. With `Bun.serve()`, you can handle both HTTP requests and WebSocket connections in a single server instance using a unified configuration object — no extra packages, no middleware, no complex wiring. This makes Bun an excellent choice for building lightweight, high-performance real-time services.

In this project, you will build a group chat application where users can join rooms, send messages, and see updates in real time. The same patterns you learn here apply directly to building live dashboards, notification systems, and collaborative tools.

## Core Content

### Project Setup

Create a new directory and initialize a Bun project:

```bash
mkdir bun-chat-app
cd bun-chat-app
bun init -y
```

The `-y` flag creates a minimal `package.json` and `tsconfig.json`. No external dependencies are needed — everything we use comes from Bun's built-in APIs.

### Bun.serve() with WebSocket Support

Bun's `Bun.serve()` accepts a `websocket` configuration object alongside the standard `fetch` handler. This dual-mode setup lets a single server process HTTP requests (like serving the chat client HTML) and manage WebSocket connections simultaneously.

The `websocket` object requires three handler functions:

| Handler | Purpose |
|---------|---------|
| `open(ws)` | Called when a new WebSocket connection is established |
| `message(ws, data)` | Called when the server receives a message from a client |
| `close(ws)` | Called when a client disconnects |

Here is the basic server scaffold:

```typescript
const server = Bun.serve({
  port: 3000,
  
  // HTTP handler — serves the chat client page
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("./index.html"));
    }
    
    return new Response("Not Found", { status: 404 });
  },
  
  // WebSocket handler
  websocket: {
    open(ws) {
      console.log(`Client connected`);
    },
    
    message(ws, data) {
      console.log(`Received: ${data}`);
    },
    
    close(ws) {
      console.log(`Client disconnected`);
    },
  },
});

console.log(`Server running on ${server.hostname}:${server.port}`);
```

### Room Management Architecture

Our chat application needs to support multiple rooms. Each room is a named space where connected clients can exchange messages. Messages sent in one room should only reach other members of that room — not the entire server.

We will track rooms with an in-memory `Map`:

```typescript
type ClientData = {
  username: string;
  room: string;
};

const rooms = new Map<string, Set<ServerWebSocket<ClientData>>>();
```

Each WebSocket connection carries typed metadata (`ClientData`) that stores the user's chosen username and the room they have joined. Bun's WebSocket API supports per-socket typed data through the generic `ServerWebSocket<T>` type, which we set when calling `ws.data`.

When a client sends a `join` message, we register them in the room. When they send a `message` type, we broadcast it to all other members of the same room.

### Message Protocol

We define a simple JSON-based protocol for client-server communication:

```typescript
type IncomingMessage = 
  | { type: "join"; username: string; room: string }
  | { type: "message"; text: string }
  | { type: "ping" };

type OutgoingMessage =
  | { type: "system"; content: string }
  | { type: "chat"; username: string; text: string; timestamp: number }
  | { type: "user-joined"; username: string }
  | { type: "user-left"; username: string }
  | { type: "room-users"; users: string[] }
  | { type: "error"; content: string };
```

Using a discriminated union on the `type` field makes message parsing predictable and type-safe.

### Full Server Implementation

Now let us assemble the complete server logic:

```typescript
import { ServerWebSocket } from "bun";

type ClientData = {
  username: string;
  room: string;
};

const rooms = new Map<string, Set<ServerWebSocket<ClientData>>>();

function broadcastToRoom(room: string, message: object, exclude?: ServerWebSocket<ClientData>) {
  const clients = rooms.get(room);
  if (!clients) return;
  
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (exclude && client === exclude) continue;
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function getRoomUsers(room: string): string[] {
  const clients = rooms.get(room);
  if (!clients) return [];
  return Array.from(clients).map((ws) => ws.data.username);
}

function removeFromRooms(ws: ServerWebSocket<ClientData>) {
  for (const [roomName, clients] of rooms.entries()) {
    if (clients.has(ws)) {
      clients.delete(ws);
      
      // Notify remaining users
      broadcastToRoom(roomName, {
        type: "user-left",
        username: ws.data.username,
      });
      
      broadcastToRoom(roomName, {
        type: "room-users",
        users: getRoomUsers(roomName),
      });
      
      // Clean up empty rooms
      if (clients.size === 0) {
        rooms.delete(roomName);
      }
      break;
    }
  }
}

const server = Bun.serve<ClientData>({
  port: 3000,
  
  async fetch(request, server) {
    const url = new URL(request.url);
    
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("./index.html"));
    }
    
    // WebSocket upgrade endpoint
    if (url.pathname === "/chat") {
      const upgraded = server.upgrade(request);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }
    
    return new Response("Not Found", { status: 404 });
  },
  
  websocket: {
    open(ws) {
      console.log(`New WebSocket connection`);
    },
    
    message(ws, data) {
      try {
        const msg: IncomingMessage = JSON.parse(data.toString());
        
        switch (msg.type) {
          case "join": {
            const username = msg.username.trim();
            const room = msg.room.trim();
            
            if (!username || !room) {
              ws.send(JSON.stringify({
                type: "error",
                content: "Username and room are required",
              }));
              return;
            }
            
            ws.data = { username, room };
            
            if (!rooms.has(room)) {
              rooms.set(room, new Set());
            }
            rooms.get(room)!.add(ws);
            
            ws.send(JSON.stringify({
              type: "system",
              content: `Welcome to #${room}`,
            }));
            
            broadcastToRoom(room, {
              type: "user-joined",
              username,
            }, ws);
            
            broadcastToRoom(room, {
              type: "room-users",
              users: getRoomUsers(room),
            });
            break;
          }
          
          case "message": {
            if (!ws.data || !ws.data.room) {
              ws.send(JSON.stringify({
                type: "error",
                content: "You must join a room before sending messages",
              }));
              return;
            }
            
            broadcastToRoom(ws.data.room, {
              type: "chat",
              username: ws.data.username,
              text: msg.text,
              timestamp: Date.now(),
            }, ws);
            break;
          }
          
          case "ping": {
            ws.send(JSON.stringify({ type: "pong" }));
            break;
          }
          
          default:
            ws.send(JSON.stringify({
              type: "error",
              content: `Unknown message type: ${msg.type}`,
            }));
        }
      } catch (err) {
        ws.send(JSON.stringify({
          type: "error",
          content: "Invalid message format",
        }));
      }
    },
    
    close(ws) {
      if (ws.data) {
        removeFromRooms(ws);
        console.log(`User ${ws.data.username} disconnected`);
      }
    },
  },
});

console.log(`Chat server running on http://localhost:${server.port}`);
```

Key design decisions in this implementation:

- **Room isolation**: The `broadcastToRoom` function only sends messages to clients in the same room. Users in different rooms never see each other's messages.
- **Stateful cleanup**: When a client disconnects, `removeFromRooms` notifies remaining members and cleans up empty rooms.
- **Typed data**: Bun's `ServerWebSocket<T>` carries per-connection metadata through `ws.data`, avoiding external lookup tables.
- **Error boundaries**: Every message parse is wrapped in try-catch, and unknown message types are reported back to the client.

### Browser-Based Chat Client

The client is a single HTML file served by the Bun server. It uses the native `WebSocket` API available in all modern browsers:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bun Chat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; height: 100vh; display: flex; justify-content: center; align-items: center; }
    #app { width: 480px; max-width: 100vw; height: 600px; display: flex; flex-direction: column; border: 1px solid #16213e; border-radius: 12px; overflow: hidden; }
    #join-screen { display: flex; flex-direction: column; gap: 12px; padding: 24px; background: #16213e; height: 100%; justify-content: center; }
    #join-screen h1 { text-align: center; margin-bottom: 8px; color: #0f3460; }
    #join-screen input { padding: 10px 14px; border: 1px solid #0f3460; border-radius: 8px; background: #1a1a2e; color: #e0e0e0; font-size: 14px; }
    #join-screen button { padding: 10px; border: none; border-radius: 8px; background: #0f3460; color: #e0e0e0; font-size: 14px; font-weight: 600; cursor: pointer; }
    #join-screen button:hover { background: #533483; }
    #chat-screen { display: none; flex-direction: column; height: 100%; }
    #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; background: #1a1a2e; }
    .msg { padding: 8px 12px; border-radius: 8px; max-width: 80%; line-height: 1.4; }
    .msg.self { background: #0f3460; align-self: flex-end; }
    .msg.other { background: #16213e; align-self: flex-start; }
    .msg.system { background: transparent; color: #888; font-size: 12px; text-align: center; align-self: center; }
    .msg .author { font-size: 11px; font-weight: 600; color: #533483; margin-bottom: 2px; }
    .msg .time { font-size: 10px; color: #666; text-align: right; margin-top: 2px; }
    #input-bar { display: flex; padding: 12px; gap: 8px; background: #16213e; }
    #input-bar input { flex: 1; padding: 10px 14px; border: 1px solid #0f3460; border-radius: 8px; background: #1a1a2e; color: #e0e0e0; font-size: 14px; }
    #input-bar button { padding: 10px 18px; border: none; border-radius: 8px; background: #0f3460; color: #e0e0e0; font-size: 14px; font-weight: 600; cursor: pointer; }
    #input-bar button:hover { background: #533483; }
    #room-header { padding: 12px 16px; background: #0f3460; font-weight: 600; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
    #room-header #user-count { font-size: 12px; color: #aaa; }
    .error-msg { color: #e74c3c; text-align: center; padding: 4px; font-size: 13px; }
  </style>
</head>
<body>
<div id="app">
  <div id="join-screen">
    <h1>💬 Bun Chat</h1>
    <input id="username-input" placeholder="Username" autofocus />
    <input id="room-input" placeholder="Room name (e.g., general)" />
    <button id="join-btn">Join Room</button>
    <div id="join-error" class="error-msg"></div>
  </div>
  <div id="chat-screen">
    <div id="room-header">
      <span id="room-name"></span>
      <span id="user-count">0 users</span>
    </div>
    <div id="messages"></div>
    <div id="input-bar">
      <input id="message-input" placeholder="Type a message..." />
      <button id="send-btn">Send</button>
    </div>
  </div>
</div>

<script>
  const WS_URL = `ws://${location.host}/chat`;
  let ws = null;
  let username = "";
  let room = "";

  const $joinScreen = document.getElementById("join-screen");
  const $chatScreen = document.getElementById("chat-screen");
  const $messages = document.getElementById("messages");
  const $usernameInput = document.getElementById("username-input");
  const $roomInput = document.getElementById("room-input");
  const $joinBtn = document.getElementById("join-btn");
  const $joinError = document.getElementById("join-error");
  const $messageInput = document.getElementById("message-input");
  const $sendBtn = document.getElementById("send-btn");
  const $roomName = document.getElementById("room-name");
  const $userCount = document.getElementById("user-count");

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", username, room }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handleMessage(msg);
    };

    ws.onclose = () => {
      appendMessage("system", "Disconnected from server. Reconnecting in 3s...");
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      appendMessage("system", "Connection error. Please try again.");
    };
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case "system":
        appendMessage("system", msg.content);
        break;
      case "chat":
        appendMessage(msg.username === username ? "self" : "other", msg.text, msg.username, msg.timestamp);
        break;
      case "user-joined":
        appendMessage("system", `${msg.username} joined the room`);
        break;
      case "user-left":
        appendMessage("system", `${msg.username} left the room`);
        break;
      case "room-users":
        $userCount.textContent = `${msg.users.length} user${msg.users.length !== 1 ? "s" : ""}`;
        break;
      case "error":
        appendMessage("system", "Error: " + msg.content);
        break;
      case "pong":
        break;
    }
  }

  function appendMessage(type, content, author, timestamp) {
    const div = document.createElement("div");
    div.className = `msg ${type}`;

    if (type === "system") {
      div.textContent = content;
    } else {
      const authorEl = document.createElement("div");
      authorEl.className = "author";
      authorEl.textContent = type === "self" ? "You" : author;
      div.appendChild(authorEl);

      const textEl = document.createElement("div");
      textEl.textContent = content;
      div.appendChild(textEl);

      if (timestamp) {
        const timeEl = document.createElement("div");
        timeEl.className = "time";
        timeEl.textContent = new Date(timestamp).toLocaleTimeString();
        div.appendChild(timeEl);
      }
    }

    $messages.appendChild(div);
    $messages.scrollTop = $messages.scrollHeight;
  }

  function joinRoom() {
    username = $usernameInput.value.trim();
    room = $roomInput.value.trim() || "general";

    if (!username) {
      $joinError.textContent = "Please enter a username.";
      return;
    }

    $joinError.textContent = "";
    $joinScreen.style.display = "none";
    $chatScreen.style.display = "flex";
    $roomName.textContent = `#${room}`;
    connect();
  }

  function sendMessage() {
    const text = $messageInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "message", text }));
    $messageInput.value = "";
    $messageInput.focus();
  }

  // Event listeners
  $joinBtn.addEventListener("click", joinRoom);
  $roomInput.addEventListener("keydown", (e) => { if (e.key === "Enter") joinRoom(); });
  $usernameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") $roomInput.focus(); });
  $sendBtn.addEventListener("click", sendMessage);
  $messageInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
</script>
</body>
</html>
```

### Running the Chat Application

Start the server:

```bash
bun run server.ts
```

Open `http://localhost:3000` in two browser tabs. Enter different usernames and the same room name (e.g., `general`). Messages typed in one tab appear in the other in real time.

To test room isolation, open a third tab and enter a different room name. Messages sent in `general` will not appear in the other room and vice versa.

### Production Considerations

For a production deployment, consider these enhancements:

- **Persistent message history**: Store chat messages in a SQLite database (using Bun's built-in `bun:sqlite`) so past messages survive server restarts.
- **Authentication**: Require a token or session before allowing WebSocket upgrades. Bun's `server.upgrade(request)` can inspect cookies or headers from the initial HTTP request.
- **Horizontal scaling**: Use Redis Pub/Sub to synchronize messages across multiple Bun server instances behind a load balancer.
- **Rate limiting**: Track message frequency per user and disconnect clients that exceed the limit.
- **TLS support**: Bun.serve accepts `tls: { key, cert }` configuration for secure WebSocket (wss://).

## Code Examples

The complete project source code is available in two files. Run the server and open the client in your browser:

```bash
# Create the project
mkdir bun-chat-app && cd bun-chat-app
bun init -y

# Save server.ts with the full server code above
# Save index.html with the full client HTML above

# Start the server
bun run server.ts
```

## Key Insights

- **Bun's unified API simplifies real-time development**: With `Bun.serve()`, HTTP and WebSocket share the same configuration and port — no separate WebSocket library or middleware setup is needed. This reduces boilerplate and keeps the codebase lean.

- **Room management is entirely your responsibility**: Bun provides the raw WebSocket primitives (open, message, close) but does not include built-in room or channel abstractions. Our room implementation using `Map<string, Set<ServerWebSocket>>` is lightweight and sufficient for moderate scale, but for massive multi-room applications, consider Redis-backed channel management.

- **Typed per-socket data prevents corruption**: Setting `ws.data` during the `join` handler means every subsequent message handler has immediate access to the user's identity and room. This sidesteps the common pitfall of maintaining external maps that can get out of sync with actual connection state.

- **Auto-reconnection on the client side**: In the browser client, the `ws.onclose` handler auto-reconnects after 3 seconds. This handles transient network issues gracefully, but you should also implement exponential backoff and a maximum retry limit for production use.

- **Memory management is critical**: Each WebSocket connection holds resources until explicitly closed. Always clean up references in the `close` handler — Bun's garbage collector cannot reclaim connections that are still referenced in room maps.

- **Production WebSocket requires sticky sessions or a shared state layer**: When scaling across multiple Bun instances, a client's WebSocket connection is pinned to one server. Use Redis, NATS, or similar to broadcast messages across instances.

## Next Steps

- Explore Bun's **`bun:sqlite`** module to add message persistence to your chat application so history survives restarts.
- Build on this foundation by adding **private messaging**, **file sharing**, or **typing indicators** using the WebSocket protocol you already understand.
- Read the [Bun Production Patterns Guide](/backend/bun/guides/bun-production-patterns-guide) for deployment and scaling best practices.
- Study the [WebSocket standard (RFC 6455)](https://datatracker.ietf.org/doc/html/rfc6455) for deeper understanding of frame types, masking, and control frames.

## Conclusion

In this tutorial, you built a real-time group chat application using Bun's built-in WebSocket API. You learned how to configure WebSocket handlers in `Bun.serve()`, implement room-based message broadcasting, manage connection lifecycle, and build a browser-based client. These patterns are directly applicable to any real-time feature — from live notifications and dashboards to collaborative editing tools — and demonstrate how Bun's integrated design reduces complexity compared to traditional Node.js WebSocket setups.

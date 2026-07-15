---
title: "Elysia.js Real-Time Applications with WebSocket and SSE Guide"
description: "A comprehensive guide to building real-time features with Elysia.js, covering WebSocket server setup, room-based messaging, Server-Sent Events, connection lifecycle management, authentication for WebSocket connections, and production deployment patterns."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Elysia.js Real-Time Applications with WebSocket and SSE Guide

## Introduction

Real-time features have become a core expectation in modern web applications. From live chat and collaborative editing to real-time dashboards and push notifications, users expect instant updates without polling. Elysia.js, built on the Bun runtime, provides first-class support for WebSocket connections through its integration with Bun's native WebSocket API, making it straightforward to build scalable real-time applications.

This guide covers the complete spectrum of real-time communication patterns with Elysia.js. You will learn how to implement WebSocket servers with room-based messaging, use Server-Sent Events (SSE) for one-way real-time updates, handle connection lifecycle (connect, disconnect, reconnection), authenticate WebSocket connections, and deploy real-time applications to production with horizontal scaling.

Unlike traditional Node.js frameworks that require separate libraries (Socket.IO, ws) and additional infrastructure for WebSocket support, Elysia.js leverages Bun's built-in WebSocket server — zero external dependencies, native performance, and a unified API that works seamlessly with the HTTP server.

## Best Practices

### Use Bun's Native WebSocket Handler

Elysia.js delegates WebSocket handling to Bun's native `Bun.serve()` WebSocket API. When you configure the `websocket` option on an Elysia instance, it creates a single WebSocket server that shares the same port as your HTTP server. This co-location eliminates the need for a separate WebSocket process and simplifies deployment.

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .ws('/ws', {
    open(ws) {
      console.log('Client connected:', ws.data?.userId)
      ws.subscribe('broadcast')
      ws.send(JSON.stringify({ type: 'connected', id: ws.data?.userId }))
    },
    message(ws, message) {
      const data = JSON.parse(message.toString())
      handleMessage(ws, data)
    },
    close(ws) {
      console.log('Client disconnected:', ws.data?.userId)
    },
  })
  .listen(3000)
```

The `.ws(path, handlers)` method registers a WebSocket endpoint at the given path. The handlers receive the `ws` object (a `ServerWebSocket`) which supports `send()`, `subscribe()`, `unsubscribe()`, `publish()`, and `close()`.

### Implement Room-Based Architecture

For multi-user applications like chat rooms or collaborative documents, organize connections into logical rooms rather than broadcasting to all clients. This reduces message overhead and enforces privacy boundaries.

```typescript
// Room management using Bun's native pub/sub
function joinRoom(ws: ServerWebSocket, roomId: string, userId: string) {
  ws.data = { ...ws.data, roomId, userId }
  ws.subscribe(`room:${roomId}`)
  // Notify room members
  ws.publish(`room:${roomId}`, JSON.stringify({
    type: 'user:joined',
    userId,
  }))
}

function leaveRoom(ws: ServerWebSocket) {
  if (ws.data?.roomId) {
    ws.unsubscribe(`room:${ws.data.roomId}`)
    ws.publish(`room:${ws.data.roomId}`, JSON.stringify({
      type: 'user:left',
      userId: ws.data.userId,
    }))
  }
}

function sendToRoom(roomId: string, event: object) {
  // Bun's publish sends to all subscribers of this topic
  app.server?.publish(`room:${roomId}`, JSON.stringify(event))
}
```

Use `ws.subscribe(topic)` to join a pub/sub channel and `ws.publish(topic, message)` to broadcast to all subscribers of that channel. Topic names should follow a namespaced convention like `room:{id}`, `user:{id}`, or `global:{event}`.

### Structure Messages with a Discriminated Protocol

Define a typed message protocol using TypeScript discriminated unions. This ensures every message has a predictable `type` field that determines the payload structure, making message handling type-safe and maintainable.

```typescript
// Message protocol types
interface ChatMessage {
  type: 'message:send'
  payload: {
    roomId: string
    content: string
    replyTo?: string  // message ID for threaded replies
  }
}

interface TypingIndicator {
  type: 'typing:start' | 'typing:stop'
  payload: {
    roomId: string
  }
}

interface PresenceUpdate {
  type: 'presence:update'
  payload: {
    status: 'online' | 'away' | 'busy'
  }
}

type WSMessage = ChatMessage | TypingIndicator | PresenceUpdate

// Type-safe message dispatcher
function handleMessage(ws: ServerWebSocket, message: WSMessage) {
  switch (message.type) {
    case 'message:send':
      return handleChatMessage(ws, message.payload)
    case 'typing:start':
    case 'typing:stop':
      return handleTyping(ws, message)
    case 'presence:update':
      return handlePresence(ws, message.payload)
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }))
  }
}
```

Always include an error response for unrecognized message types. This prevents clients from hanging silently when they send an invalid payload.

### Manage Connection Lifecycle

Every WebSocket connection goes through three lifecycle phases: open, message, and close. Implement handlers for all three to maintain a clean connection state.

```typescript
// Connection registry for active clients
const activeConnections = new Map<string, Set<ServerWebSocket>>()

const ws = app.ws('/ws', {
  open(ws) {
    // Track the connection
    const userId = ws.data?.userId
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set())
    }
    activeConnections.get(userId)!.add(ws)

    // Send connection acknowledgment
    ws.send(JSON.stringify({
      type: 'connection:established',
      payload: { userId, timestamp: Date.now() },
    }))
  },

  message(ws, message) {
    try {
      const parsed = JSON.parse(message.toString())
      handleMessage(ws, parsed)
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
    }
  },

  close(ws) {
    // Clean up the connection
    const userId = ws.data?.userId
    if (userId && activeConnections.has(userId)) {
      activeConnections.get(userId)!.delete(ws)
      if (activeConnections.get(userId)!.size === 0) {
        activeConnections.delete(userId)
      }
    }

    // Leave all subscribed rooms
    if (ws.data?.roomId) {
      ws.publish(`room:${ws.data.roomId}`, JSON.stringify({
        type: 'user:disconnected',
        userId: ws.data.userId,
      }))
    }
  },
})
```

Store per-connection metadata in `ws.data` (a typed property available on Bun's `ServerWebSocket`). Use a connection registry (`Map<userId, Set<ServerWebSocket>>`) to track multiple tabs or devices per user.

### Authenticate WebSocket Connections

WebSocket connections require special authentication handling because the standard HTTP request headers are available only during the initial upgrade handshake. Elysia.js allows you to validate authentication during the `open` handler or, more securely, during the upgrade phase.

```typescript
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

const app = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret',
    })
  )
  .ws('/ws', {
    // Validate during upgrade — reject before the WebSocket is established
    async upgrade(request) {
      const url = new URL(request.url)
      const token = url.searchParams.get('token')

      if (!token) {
        return false // Reject the upgrade
      }

      try {
        const payload = await app.jwt.verify(token)
        // Attach user info to ws.data during upgrade
        return { userId: payload.sub, roles: payload.roles }
      } catch {
        return false
      }
    },
    open(ws) {
      // ws.data already contains { userId, roles } from upgrade
      console.log('Authenticated user:', ws.data.userId)
    },
    message(ws, message) {
      // Handle messages — authentication is already verified
    },
  })
```

The `upgrade` handler runs before the WebSocket connection is established. Return `true` with metadata to allow the connection, or `false` to reject it. This prevents unauthenticated clients from ever establishing a WebSocket connection, which is more efficient than validating in `open` and closing immediately.

### Use Server-Sent Events for One-Way Updates

When you only need to push updates from server to client (live scores, stock tickers, deployment logs), Server-Sent Events (SSE) are a simpler alternative to WebSocket. SSE uses standard HTTP connections, works through HTTP/2 multiplexing, and has built-in reconnection behavior in browsers.

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/events/notifications', ({ set }) => {
    set.headers['Content-Type'] = 'text/event-stream'
    set.headers['Cache-Control'] = 'no-cache'
    set.headers['Connection'] = 'keep-alive'

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`
        ))

        // Push notifications every 5 seconds
        const interval = setInterval(() => {
          controller.enqueue(new TextEncoder().encode(
            `event: notification\ndata: ${JSON.stringify(generateNotification())}\n\n`
          ))
        }, 5000)

        // Clean up on connection close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval)
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  })
```

SSE events follow a specific wire format: each event is separated by double newlines (`\n\n`), with optional `event:` and required `data:` fields. The browser's native `EventSource` API handles reconnection automatically when the connection drops.

### Handle Backpressure and Connection Draining

In production, clients may disconnect unexpectedly or fall behind on message processing. Implement backpressure handling and graceful connection draining to prevent memory leaks and ensure reliable delivery.

```typescript
// Backpressure-aware message sending
function safeSend(ws: ServerWebSocket, data: string): boolean {
  const buffered = ws.bufferedAmount
  if (buffered > 1024 * 64) {
    // Client is too slow — drop or queue
    console.warn('Backpressure detected for client:', ws.data?.userId)
    return false
  }
  ws.send(data)
  return true
}

// Graceful shutdown — drain existing connections
async function shutdown(server: { stop: () => void }) {
  // Notify all connected clients
  for (const [userId, sockets] of activeConnections) {
    for (const ws of sockets) {
      try {
        ws.send(JSON.stringify({ type: 'server:shutdown', payload: { reconnect: true } }))
        ws.close()
      } catch {
        // Socket already closed
      }
    }
  }

  // Stop accepting new connections
  server.stop()
}
```

Monitor `ws.bufferedAmount` to detect slow clients and apply backpressure strategies (drop messages, queue with TTL, or close the connection). During shutdown, notify connected clients so they can reconnect to another instance.

### Implement Typing Indicators Efficiently

Typing indicators are a common real-time feature that requires careful design to avoid flooding the server with messages. Use debouncing and throttle updates rather than sending a message on every keystroke.

```typescript
// Server-side typing handler with debounce
const typingTimers = new Map<string, NodeJS.Timeout>()

function handleTypingStart(ws: ServerWebSocket, roomId: string) {
  const key = `${roomId}:${ws.data.userId}`

  // Clear existing timer
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key)!)
  }

  // Notify room
  ws.publish(`room:${roomId}`, JSON.stringify({
    type: 'typing',
    userId: ws.data.userId,
    isTyping: true,
  }))

  // Auto-stop typing after 3 seconds of inactivity
  typingTimers.set(key, setTimeout(() => {
    ws.publish(`room:${roomId}`, JSON.stringify({
      type: 'typing',
      userId: ws.data.userId,
      isTyping: false,
    }))
    typingTimers.delete(key)
  }, 3000))
}
```

On the client side, send a typing notification only when the user starts typing after a pause of at least 500ms, and stop sending when typing pauses for 3 seconds. The server maintains a timer to automatically clear stale typing states.

### Test Real-Time Features with Bun's Test Runner

Testing WebSocket and SSE endpoints requires special setup. Use Bun's built-in test runner with `WebSocket` client connections in tests.

```typescript
import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'

let app: Elysia
let server: { stop: () => void }

beforeAll(() => {
  app = new Elysia()
    .ws('/chat', {
      open(ws) {
        ws.subscribe('general')
        ws.send(JSON.stringify({ type: 'welcome', room: 'general' }))
      },
      message(ws, message) {
        const data = JSON.parse(message.toString())
        if (data.type === 'chat') {
          ws.publish('general', JSON.stringify({
            type: 'chat',
            user: ws.data?.userId,
            text: data.text,
          }))
          ws.send(JSON.stringify({ type: 'ack', id: data.id }))
        }
      },
    })
    .listen(0) // Random port

  server = app.server!
})

afterAll(() => {
  server.stop()
})

it('should connect and receive welcome message', async () => {
  const ws = new WebSocket(`ws://localhost:${server.port}/chat`)

  const message = await new Promise((resolve) => {
    ws.onmessage = (event) => {
      resolve(JSON.parse(event.data))
    }
  })

  expect(message).toMatchObject({ type: 'welcome', room: 'general' })
  ws.close()
})

it('should broadcast chat messages to all clients', async () => {
  const client1 = new WebSocket(`ws://localhost:${server.port}/chat`)
  const client2 = new WebSocket(`ws://localhost:${server.port}/chat`)

  // Wait for both to connect
  await Promise.all([
    new Promise((r) => { client1.onopen = r }),
    new Promise((r) => { client2.onopen = r }),
  ])

  // Client 1 sends a message
  client1.send(JSON.stringify({ type: 'chat', text: 'Hello!', id: 'msg-1' }))

  // Client 2 should receive the broadcast
  const received = await new Promise((resolve) => {
    client2.onmessage = (event) => resolve(JSON.parse(event.data))
  })

  expect(received).toMatchObject({ type: 'chat', text: 'Hello!' })

  client1.close()
  client2.close()
})
```

Use `app.listen(0)` to bind to a random available port, avoiding port conflicts in parallel test runs. Always clean up WebSocket connections in `afterAll` to prevent hanging processes.

## Implementation Steps

### Step 1: Plan the Real-Time Architecture

Before writing code, design your real-time architecture by answering these questions:

1. **Communication pattern**: Do you need bidirectional (WebSocket) or one-way (SSE) communication? Use WebSocket for chat, collaborative editing, and live cursors. Use SSE for notifications, feed updates, and log streaming.

2. **Channel topology**: How will messages be routed? Room-based (chat rooms), user-based (personal notifications), or global (system-wide announcements)? Design a topic naming convention like `room:{roomId}`, `user:{userId}`, `global:{eventType}`.

3. **Authentication model**: Will WebSocket connections authenticate via token query parameter, cookie, or custom header? Decide how token validation works during the upgrade handshake.

4. **State requirements**: What per-connection state must be stored? User identity, subscribed rooms, connection metadata. Plan the `ws.data` shape and whether state needs to survive reconnection.

5. **Scaling strategy**: Will you need multiple server instances? If yes, plan for a pub/sub broker (Redis) to relay messages between instances.

### Step 2: Create the WebSocket Plugin

Organize real-time logic into a dedicated Elysia plugin. This keeps the WebSocket handlers isolated from HTTP route handlers and makes the feature independently testable.

```typescript
// src/plugins/realtime/realtime.plugin.ts
import { Elysia, t } from 'elysia'

interface ClientData {
  userId: string
  username: string
  roles: string[]
}

interface ChatPayload {
  roomId: string
  content: string
  replyTo?: string
}

const activeUsers = new Map<string, Set<ServerWebSocket>>()

export const realtimePlugin = (app: Elysia) =>
  app
    .ws('/ws', {
      async upgrade(request) {
        const url = new URL(request.url)
        const token = url.searchParams.get('token')

        if (!token) return false

        try {
          const payload = await verifyToken(token)
          return {
            userId: payload.sub,
            username: payload.username,
            roles: payload.roles || [],
          } satisfies ClientData
        } catch {
          return false
        }
      },

      open(ws) {
        // Track the connection
        const { userId } = ws.data as ClientData
        if (!activeUsers.has(userId)) {
          activeUsers.set(userId, new Set())
        }
        activeUsers.get(userId)!.add(ws)

        // Auto-join user's personal channel
        ws.subscribe(`user:${userId}`)

        // Send initial state
        ws.send(JSON.stringify({
          type: 'connected',
          payload: { userId, activeUsers: activeUsers.size },
        }))
      },

      message(ws, raw) {
        const data = JSON.parse(raw.toString())
        const client = ws.data as ClientData

        switch (data.type) {
          case 'room:join':
            ws.subscribe(`room:${data.payload.roomId}`)
            ws.publish(`room:${data.payload.roomId}`, JSON.stringify({
              type: 'user:joined',
              payload: { userId: client.userId, username: client.username },
            }))
            break

          case 'room:leave':
            ws.unsubscribe(`room:${data.payload.roomId}`)
            break

          case 'message:send':
            ws.publish(`room:${data.payload.roomId}`, JSON.stringify({
              type: 'message',
              payload: {
                id: crypto.randomUUID(),
                userId: client.userId,
                username: client.username,
                content: data.payload.content,
                timestamp: Date.now(),
                replyTo: data.payload.replyTo,
              },
            }))
            break

          case 'typing':
            ws.publish(`room:${data.payload.roomId}`, JSON.stringify({
              type: 'typing',
              payload: {
                userId: client.userId,
                username: client.username,
                isTyping: data.payload.isTyping,
              },
            }))
            break

          default:
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: `Unknown message type: ${data.type}` },
            }))
        }
      },

      close(ws) {
        const client = ws.data as ClientData

        // Remove from active users
        if (client?.userId && activeUsers.has(client.userId)) {
          activeUsers.get(client.userId)!.delete(ws)
          if (activeUsers.get(client.userId)!.size === 0) {
            activeUsers.delete(client.userId)
          }
        }

        // Announce disconnection
        ws.publish('global', JSON.stringify({
          type: 'user:disconnected',
          payload: { userId: client?.userId },
        }))
      },
    })
```

Register this plugin in your main app file:

```typescript
// src/index.ts
import { Elysia } from 'elysia'
import { realtimePlugin } from './plugins/realtime/realtime.plugin'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
  .use(cors())
  .use(realtimePlugin)
  .get('/health', () => ({ status: 'ok' }))
  .listen(process.env.PORT || 3000)

console.log(`Server running at http://localhost:${app.server?.port}`)
```

### Step 3: Add Server-Sent Events for Notifications

Implement an SSE endpoint for one-way real-time updates that don't require bidirectional communication. This is ideal for notification feeds, deployment logs, or live analytics dashboards.

```typescript
// src/plugins/notifications/sse.plugin.ts
import { Elysia } from 'elysia'

interface SSEClient {
  id: string
  controller: ReadableStreamDefaultController
  userId?: string
}

const sseClients = new Map<string, SSEClient>()

export const ssePlugin = (app: Elysia) =>
  app.get('/events', ({ request, set }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    const clientId = crypto.randomUUID()

    const stream = new ReadableStream({
      start(controller) {
        sseClients.set(clientId, { id: clientId, controller, userId: userId || undefined })

        // Send initial connection event
        controller.enqueue(new TextEncoder().encode(
          `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`
        ))

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(':\n\n'))
          } catch {
            clearInterval(keepAlive)
          }
        }, 30000)

        // Clean up on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAlive)
          sseClients.delete(clientId)
        })
      },
    })

    set.headers['Content-Type'] = 'text/event-stream'
    set.headers['Cache-Control'] = 'no-cache'
    set.headers['Connection'] = 'keep-alive'

    return new Response(stream)
  })

// Helper to broadcast to all SSE clients
export function broadcastSSE(event: string, data: object, targetUserId?: string) {
  const encoder = new TextEncoder()
  const message = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  for (const client of sseClients.values()) {
    if (targetUserId && client.userId !== targetUserId) continue
    try {
      client.controller.enqueue(message)
    } catch {
      sseClients.delete(client.id)
    }
  }
}

// Helper to broadcast to specific user
export function notifyUser(userId: string, event: string, data: object) {
  broadcastSSE(event, data, userId)
}
```

The keep-alive mechanism sends a blank comment line (`:\n\n`) every 30 seconds to prevent proxy servers and load balancers from closing idle connections. The `EventSource` API on the browser side handles automatic reconnection — no custom client-side logic needed.

### Step 4: Integrate WebSocket and SSE with HTTP Routes

Real-time applications often need HTTP endpoints that trigger real-time events. For example, a POST endpoint that creates a resource and then notifies connected clients.

```typescript
// src/plugins/notifications/notification.http.ts
import { Elysia, t } from 'elysia'
import { broadcastSSE, notifyUser } from './sse.plugin'

export const notificationHttpPlugin = (app: Elysia) =>
  app
    .post(
      '/notifications',
      ({ body }) => {
        // Broadcast to all connected SSE clients
        broadcastSSE('notification', {
          id: crypto.randomUUID(),
          type: body.type,
          title: body.title,
          message: body.message,
          timestamp: Date.now(),
        })

        return { success: true }
      },
      {
        body: t.Object({
          type: t.String(),
          title: t.String(),
          message: t.String(),
        }),
      }
    )
    .post(
      '/notifications/user/:userId',
      ({ params, body }) => {
        // Send to a specific user only
        notifyUser(params.userId, 'notification', {
          id: crypto.randomUUID(),
          type: body.type,
          title: body.title,
          message: body.message,
          timestamp: Date.now(),
        })

        return { success: true }
      },
      {
        body: t.Object({
          type: t.String(),
          title: t.String(),
          message: t.String(),
        }),
      }
    )
```

This pattern is useful for webhook receivers that process external events and push them to connected clients, or for admin panels that trigger server-wide announcements.

### Step 5: Scale with Redis Pub/Sub

When you deploy multiple Elysia instances behind a load balancer, WebSocket connections are distributed across instances. A WebSocket message sent to instance A cannot reach clients connected to instance B. Solve this with a shared Redis pub/sub channel that relays messages between instances.

```typescript
// src/lib/redis-pubsub.ts
import { Redis } from 'ioredis'

const publisher = new Redis(process.env.REDIS_URL!)
const subscriber = new Redis(process.env.REDIS_URL!)

type MessageHandler = (channel: string, message: string) => void

export class RedisPubSub {
  private handlers = new Map<string, Set<MessageHandler>>()

  constructor() {
    subscriber.on('message', (channel, message) => {
      const channelHandlers = this.handlers.get(channel)
      if (channelHandlers) {
        for (const handler of channelHandlers) {
          handler(channel, message)
        }
      }
    })
  }

  subscribe(channel: string, handler: MessageHandler) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
      subscriber.subscribe(channel)
    }
    this.handlers.get(channel)!.add(handler)
  }

  unsubscribe(channel: string, handler: MessageHandler) {
    const handlers = this.handlers.get(channel)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.handlers.delete(channel)
        subscriber.unsubscribe(channel)
      }
    }
  }

  publish(channel: string, message: string) {
    publisher.publish(channel, message)
  }

  quit() {
    publisher.quit()
    subscriber.quit()
  }
}
```

Integrate the Redis pub/sub with your WebSocket plugin:

```typescript
// src/plugins/realtime/realtime.plugin.ts (with Redis scaling)
import { RedisPubSub } from '../../lib/redis-pubsub'

const pubsub = new RedisPubSub()

export const realtimePlugin = (app: Elysia) =>
  app
    .ws('/ws', {
      open(ws) {
        // Subscribe to Redis relay channel
        pubsub.subscribe(`relay:room:${roomId}`, (channel, message) => {
          // Forward messages received from other instances to local clients
          ws.send(message)
        })
      },
      message(ws, raw) {
        const data = JSON.parse(raw.toString())

        if (data.type === 'message:send') {
          // Publish to local clients
          ws.publish(`room:${data.payload.roomId}`, raw.toString())
          // Relay to other instances via Redis
          pubsub.publish(`relay:room:${data.payload.roomId}`, raw.toString())
        }
      },
      close(ws) {
        // Clean up Redis subscriptions
        pubsub.unsubscribe(`relay:room:${roomId}`, handler)
      },
    })
```

This pattern ensures that a message published on any instance reaches all connected clients across all instances. Use a dedicated Redis instance or the Redis pub/sub feature from your existing Redis cache to keep infrastructure minimal.

### Step 6: Test the Real-Time Features End-to-End

Write comprehensive tests that cover connection lifecycle, message broadcasting, typing indicators, authentication rejection, and SSE delivery.

```typescript
import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { realtimePlugin } from '../src/plugins/realtime/realtime.plugin'

let app: Elysia
let server: { stop: () => void; port: number }

beforeAll(() => {
  app = new Elysia().use(realtimePlugin).listen(0)
  server = app.server!
})

afterAll(() => {
  server.stop()
})

it('rejects unauthenticated connections', () => {
  const ws = new WebSocket(`ws://localhost:${server.port}/ws`)
  expect(ws.readyState).toBe(WebSocket.CLOSED)
})

it('broadcasts messages to room members', async () => {
  const token = await getTestToken()
  const ws1 = new WebSocket(`ws://localhost:${server.port}/ws?token=${token}`)
  const ws2 = new WebSocket(`ws://localhost:${server.port}/ws?token=${token}`)

  // Wait for both connections to open
  await Promise.all([
    new Promise((r) => { ws1.onopen = r }),
    new Promise((r) => { ws2.onopen = r }),
  ])

  // Join room
  ws1.send(JSON.stringify({ type: 'room:join', payload: { roomId: 'test-room' } }))
  ws2.send(JSON.stringify({ type: 'room:join', payload: { roomId: 'test-room' } }))

  // Wait for room:joined events to settle
  await Bun.sleep(100)

  // ws1 sends a message
  ws1.send(JSON.stringify({
    type: 'message:send',
    payload: { roomId: 'test-room', content: 'Hello from ws1!' },
  }))

  // ws2 should receive it
  const received = await new Promise((resolve) => {
    ws2.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'message') resolve(data)
    }
  })

  expect(received).toMatchObject({
    type: 'message',
    payload: expect.objectContaining({
      content: 'Hello from ws1!',
    }),
  })

  ws1.close()
  ws2.close()
})

it('delivers SSE notifications', async () => {
  const response = await fetch(
    `http://localhost:${server.port}/events?userId=test-user`
  )

  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/event-stream')

  // Trigger a notification via HTTP
  await fetch(`http://localhost:${server.port}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test',
    }),
  })

  // Read the SSE stream
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  const { value } = await reader.read()
  const text = decoder.decode(value)

  expect(text).toContain('event: notification')
  expect(text).toContain('Test Notification')

  reader.cancel()
})
```

Use `Bun.sleep()` for small delays between async WebSocket operations. Test with random ports (`app.listen(0)`) to enable parallel test execution.

### Step 7: Handle Production Deployment

Configure your deployment environment for real-time workloads:

```typescript
// src/index.ts — production configuration
import { Elysia } from 'elysia'
import { realtimePlugin } from './plugins/realtime/realtime.plugin'
import { ssePlugin } from './plugins/notifications/sse.plugin'
import { RedisPubSub } from './lib/redis-pubsub'

const app = new Elysia()

// Enable Redis pub/sub when multiple instances are deployed
if (process.env.REDIS_URL) {
  const pubsub = new RedisPubSub()
  // Configure realtime plugin with Redis
  app.state('pubsub', pubsub)
}

app
  .use(ssePlugin)
  .use(realtimePlugin)
  .listen(process.env.PORT || 3000)

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  app.server?.stop()
  process.exit(0)
})
```

Deployment considerations for real-time Elysia.js applications:

1. **Session affinity (sticky sessions)**: Configure your load balancer to route WebSocket connections to the same instance based on the initial handshake. Without Redis pub/sub, this ensures clients can communicate directly. With Redis pub/sub, sticky sessions are optional but reduce Redis relay latency.

2. **Connection limits**: Bun's WebSocket server handles thousands of concurrent connections efficiently. Monitor `ulimit -n` on the server and set appropriate file descriptor limits. Bun on Linux can handle approximately 100,000 concurrent connections per instance with proper tuning.

3. **TLS termination**: Terminate TLS at the load balancer level and forward plain WebSocket (ws://) traffic to your Elysia instances. For end-to-end TLS, use Bun's built-in TLS support with `bun.serve({ tls: { key, cert } })`.

4. **Health checks**: Expose a health check endpoint that verifies the WebSocket server is accepting connections and the Redis pub/sub (if configured) is responsive.

5. **Resource monitoring**: Track the number of active WebSocket connections, message throughput per second, and memory usage. Use `process.memoryUsage()` in a metrics endpoint or integrate with your observability stack.

```typescript
// Metrics endpoint for monitoring
app.get('/metrics', () => ({
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  activeConnections: activeUsers.size,
  sseClients: sseClients.size,
}))
```

## Conclusion

Building real-time applications with Elysia.js leverages Bun's native WebSocket implementation for zero-dependency, high-performance bidirectional communication. This guide covered the complete spectrum of real-time patterns:

- **WebSocket server setup** with room-based messaging and typed message protocols
- **Connection lifecycle management** with authentication during the upgrade handshake
- **Server-Sent Events** for efficient one-way real-time updates
- **Horizontal scaling** with Redis pub/sub to relay messages across instances
- **Testing strategies** for WebSocket and SSE endpoints using Bun's test runner
- **Production deployment** considerations for sticky sessions, connection limits, and graceful shutdown

The key architectural decisions — room-based pub/sub channels, discriminated message protocols, WebSocket for bidirectional communication versus SSE for one-way updates, and Redis relay for multi-instance scaling — provide a foundation that scales from a single-process prototype to a multi-instance production deployment.

For next steps, explore integrating Elysia.js real-time features with frontend frameworks (React, Vue, Svelte), implementing end-to-end encryption for chat applications, or building collaborative editing features with CRDT-based data structures on top of the WebSocket transport layer established in this guide.

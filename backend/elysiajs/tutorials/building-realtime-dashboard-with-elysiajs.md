---
title: "Building a Real-Time Dashboard with Elysia.js"
description: "Build a live metrics dashboard on Elysia.js with native WebSockets, topic-based rooms, authenticated handshakes, and a client that reconnects safely."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Real-Time Dashboard with Elysia.js

## Summary

Build a production-shaped real-time dashboard: a Bun/Elysia server that authenticates WebSocket handshakes, groups sockets into tenant and dashboard rooms, and pushes metric snapshots only when they change. You finish with a browser client that recovers from drops without leaking sockets or showing stale numbers.

## Target Audience

- Backend developers who already ship HTTP APIs with Elysia.js or a similar TypeScript framework.
- Full-stack engineers responsible for an operations or analytics dashboard.
- Developers comfortable with TypeScript generics, async/await, and browser APIs.

## Prerequisites

- Bun 1.1 or newer (`bun --version`).
- Working knowledge of Elysia.js routing, plugins, and TypeBox schemas.
- Familiarity with the WebSocket protocol (frames, close codes, ping/pong).
- A token source you can verify server-side (JWT issuer, session store).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Register a WebSocket route with a type-safe payload schema.
- Authenticate a handshake before any data leaves the server.
- Model rooms with pub/sub topics instead of hand-rolled socket registries.
- Push updates from timers and HTTP handlers, not just from routes.
- Build a client with exponential backoff, jitter, and correct teardown.

## Context and Motivation

Polling a metrics endpoint every two seconds looks harmless until a hundred operators open the dashboard: the API answers 3,000 requests per minute, mostly returning numbers that did not change. A push channel inverts that cost — the server speaks only when there is something to say. Elysia.js serves WebSockets on Bun's HTTP server, so there is no second gateway and no adapter mismatch; the hard parts are authentication at upgrade time, room routing, and reconnecting without hammering the server.

## Core Content

### Push pipeline shape

Four pieces, one job each: a **collector** that samples your source on a timer, a **room map** that decides entitlement, the **transport** that subscribes and validates, and a **client** that renders and retries. Keep the collector free of socket references — it publishes to a topic and forgets.

### Rooms without a registry

Elysia exposes Bun's native pub/sub: a socket subscribes to topic strings, and `server.publish(topic, payload)` fans out to every subscriber. Two levels are usually enough — `tenant:<id>` for everything an organization may see, `dash:<id>` for one saved dashboard. Never keep a `Map<socket, room>` yourself; you would have to clean it up on abnormal closes and you would lose publishing from outside a handler.

### Authenticating the handshake

Browsers cannot set headers on `new WebSocket()`, so the token arrives as a query parameter or an httpOnly cookie. Verify it inside `open` before subscribing and close with `4401` on failure: the client must distinguish "session expired" from "network blinked". Query tokens land in access logs, so prefer cookies on same-origin dashboards and keep lifetimes short.

## Code Examples

### Authenticated route with rooms

```typescript
import { Elysia, t } from 'elysia'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? '')

async function tenantOf(token?: string) {
    if (!token) return null
    try {
        const { payload } = await jwtVerify(token, secret)
        return String(payload.tenant)
    } catch {
        return null
    }
}

export const realtime = new Elysia({ name: 'realtime' }).ws('/ws/metrics', {
    query: t.Object({ token: t.Optional(t.String()), dashboard: t.Optional(t.String()) }),
    open(ws) {
        void (async () => {
            const tenant = await tenantOf(ws.data.query.token)
            if (!tenant) return ws.close(4401, 'unauthorized')
            ws.subscribe(`tenant:${tenant}`)
            if (ws.data.query.dashboard) ws.subscribe(`dash:${ws.data.query.dashboard}`)
            ws.send(JSON.stringify({ type: 'ready' }))
        })()
    }
})
```

### Publishing snapshots from a timer

```typescript
import type { Elysia } from 'elysia'

export function startMetricPump(app: Elysia, tenants: string[], intervalMs = 2000) {
    const last = new Map<string, string>()
    const timer = setInterval(async () => {
        for (const tenant of tenants) {
            try {
                const snapshot = await collectSnapshot(tenant)
                const payload = JSON.stringify({ type: 'metrics', at: Date.now(), ...snapshot })
                if (last.get(tenant) === payload) continue // unchanged, skip the tick
                last.set(tenant, payload)
                app.server?.publish(`tenant:${tenant}`, payload)
            } catch (error) {
                console.error(`[metrics] tenant=${tenant} snapshot failed`, error)
            }
        }
    }, intervalMs)
    return () => clearInterval(timer)
}
```

### Client with backoff, jitter, and teardown

```typescript
export function connectDashboard(opts: { url: string; token: string; onMetrics: (d: any) => void }) {
    let socket: WebSocket | null = null
    let attempt = 0
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined

    const open = () => {
        socket = new WebSocket(`${opts.url}?token=${encodeURIComponent(opts.token)}`)
        socket.onopen = () => { attempt = 0 }
        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data)
                if (message.type === 'metrics') opts.onMetrics(message)
            } catch (error) {
                console.warn('[ws] dropping malformed frame', error)
            }
        }
        socket.onerror = () => socket?.close()
        socket.onclose = (event) => {
            if (stopped || event.code === 4401) return // expired session: go to login
            const delay = Math.min(30_000, 500 * 2 ** attempt++) + Math.random() * 250
            retry = setTimeout(open, delay) // jitter avoids thundering herds
        }
    }

    open()
    return () => {
        stopped = true
        if (retry) clearTimeout(retry)
        socket?.close(1000, 'page unmounted')
    }
}
```

## Key Insights

- Authenticate in `open`, not in `message`: subscribing before verification hands data to unauthenticated sockets.
- Topics beat registries — `server.publish` works from timers, queue consumers, and HTTP handlers.
- Close codes are API: `4401` must stop the retry loop, network drops must not.
- Always add jitter, or a restarted server gets every client's reconnect in one 200 ms window.
- One Bun process holds only its own sockets. Multiple replicas need a broker (Redis pub/sub, NATS) or sticky routing.
- Treat a missing `close` as a leak: evict idle sessions instead of trusting the network.

## Next Steps

- Add per-widget subscriptions so a dashboard receives only the panels it renders.
- Put Redis pub/sub behind `publish` to scale horizontally.
- Continue with the Elysia.js Microservices Syllabus to apply this inside a service mesh.

## Conclusion

You now have the full path from collector to browser: verified handshakes, tenant-scoped rooms, change-aware pushes, and a client that degrades politely. What remains is operational — scaling fan-out and watching connection counts the way you watch error rate.

---
title: "Building a Real-Time App with Next.js WebSockets"
description: "A hands-on tutorial for adding real-time features to a Next.js App Router app: choosing between a custom server and an external WebSocket service, integrating Socket.IO, authenticating the handshake, scoping broadcasts with rooms, and scaling across instances."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Real-Time App with Next.js WebSockets

## Summary

Route handlers cannot hold long-lived connections, so real-time features need a WebSocket process outside the request/response cycle. You will build a separate Socket.IO service, authenticate each connection against your existing Next.js session, scope messages with authorized rooms, and scale it with the Redis adapter. Server Components render the initial history; a thin client hook keeps it fresh.

## Target Audience

- Full-stack developers comfortable with the App Router, Server Components, and route handlers.
- Frontend engineers who need presence, live cursors, or chat without rewriting the app as a separate SPA.
- Expected level: advanced. You should be able to reason about process boundaries and TypeScript config.

## Prerequisites

- Node.js 20+ with npm, pnpm, or yarn.
- A Next.js 14/15 project using the App Router and Auth.js v5.
- Redis 7 locally (`docker run -p 6379:6379 redis:7-alpine`).
- Working knowledge of JWT signing.

## Learning Objectives

By the end of this tutorial you will be able to:

- Explain why route handlers cannot upgrade to WebSockets and pick the right hosting model.
- Run a Socket.IO server with a Redis adapter and a health endpoint.
- Mint a short-lived token in Next.js and verify it during the handshake.
- Authorize room joins per user, and configure reconnection so deploys do not drop messages.

## Context and Motivation

Serverless and edge runtimes bill per request and terminate idle connections, which is a poor home for a socket that must stay open for minutes. Teams usually discover this after shipping a route handler that "works" in `next dev` and fails in production. The fix is an explicit decision: own the HTTP server with a custom Next.js server, or run a dedicated realtime process beside the app.

The second problem is identity. A WebSocket handshake is a plain HTTP request, so you get cookies only when client and server share a domain, and no per-message auth layer. If room membership comes from the client payload, any user can subscribe to another tenant's data. Treating the handshake as a login and every join as an authorization check is the same discipline you already apply to route handlers.

## Core Content

### Step 1: Choose the hosting model

| Model | How it works | Trade-offs |
| --- | --- | --- |
| Route handler | `app/api/ws/route.ts` | Cannot upgrade. Only works behind a custom Node server. Do not use. |
| Custom server | `server.ts` wraps `next()` in `http.createServer` | One process and deploy unit; disables some Next.js optimizations; unsupported on Vercel. |
| External service | Separate Node process; Next.js serves only HTTP/RSC | Scales independently, survives app deploys, clear failure domains. Recommended. |
| Managed provider | Pusher, Ably, Supabase Realtime | No ops burden, but per-message cost and lock-in. |

### Step 2: Authenticate the handshake, then authorize each join

Issue a token from a route handler after `auth()` confirms the session. Keep it short-lived (minutes) and re-verify privileges on every room join, because a socket outlives its token. A room is a server-side set of socket ids: join only after checking that this user may see that room, and derive the room id from server data (order id, tenant id) rather than free-form client input.

### Step 3: Scale horizontally

Each instance only knows its own sockets; the Redis adapter forwards `io.to(room).emit()` across instances via pub/sub. If you keep the HTTP polling fallback, add sticky sessions at the load balancer (nginx `ip_hash` or a routing cookie), because the upgrade and the poll must reach the same instance.

## Code Examples

### The realtime server

```typescript
// realtime/server.ts
import { createServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { canAccessRoom, verifyRealtimeToken } from "./auth";

const httpServer = createServer((req, res) => res.end("ok")); // /health probe
const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: (process.env.APP_ORIGIN ?? "").split(","), credentials: true },
    connectionStateRecovery: { maxDisconnectionDuration: 120_000 },
});
const pub = createClient({ url: process.env.REDIS_URL });
const sub = pub.duplicate();

io.use(async (socket, next) => {
    try {
        const claims = await verifyRealtimeToken(socket.handshake.auth?.token ?? "");
        Object.assign(socket.data, { userId: claims.sub, tenantId: claims.tenant });
        next();
    } catch {
        next(new Error("unauthorized")); // missing, expired, or forged
    }
});
io.on("connection", (socket) => {
    socket.on("room:join", async (roomId: string, ack) => {
        const allowed = await canAccessRoom(socket.data.userId, socket.data.tenantId, roomId);
        if (!allowed) return ack({ ok: false, error: "forbidden" });
        await socket.join(roomId);
        ack({ ok: true });
    });
});
async function main() {
    await Promise.all([pub.connect(), sub.connect()]);
    io.adapter(createAdapter(pub, sub));
    httpServer.listen(Number(process.env.PORT ?? 4001), () => console.log("realtime up"));
}
main().catch((error) => {
    console.error("realtime bootstrap failed", error);
    process.exit(1);
});
```

### Minting the token

```typescript
// app/api/realtime-token/route.ts
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });
    const token = await new SignJWT({ tenant: session.user.tenantId })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(session.user.id)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(new TextEncoder().encode(process.env.REALTIME_JWT_SECRET));
    return Response.json({ token }, { headers: { "cache-control": "no-store" } });
}
```

### Client hook

```typescript
// hooks/use-room-socket.ts
"use client";

export function useRoomSocket(roomId: string, onMessage: (message: Message) => void) {
    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL!, { path: "/socket.io", autoConnect: false });
        socket.on("message:new", onMessage);
        socket.on("connect_error", (error) => console.error("realtime auth failed", error.message));
        fetch("/api/realtime-token", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`token ${res.status}`))))
            .then(({ token }: { token: string }) => {
                socket.auth = { token };
                socket.connect();
                socket.on("connect", () => socket.emit("room:join", roomId));
            })
            .catch((error) => console.error("realtime join failed", error));
        return () => socket.disconnect();
    }, [roomId, onMessage]);
}
```

## Key Insights

- **Treat the handshake as a login, not a formality.** Verify the signature, check expiry, and store `userId` on `socket.data`. Never accept a `userId` field from the client.
- **Re-authorize privileged actions.** A 5-minute token does not protect a connection open for an hour; `canAccessRoom` must run on join and on send.
- **`transports: ["websocket"]` skips the polling fallback** and the sticky-session requirement, at the cost of failing behind proxies that block upgrades.
- **The Redis adapter is not persistence.** It fans out live messages; anything a reconnecting client missed must be fetched over HTTP with a cursor.
- **Validate payloads and batch high-frequency events.** Old tabs send the previous event shape after a deploy, and cursors or typing indicators should be throttled to about 10 per second and never persisted.

## Next Steps

- Add presence with a Redis set and clean up on `disconnect`.
- Replace the manual token with a signed session cookie when both services share a domain.
- Build a cursor API (`GET /api/rooms/:id/messages?after=`) and refetch on reconnect; load-test with `k6` first.

## Conclusion

You separated realtime from the Next.js request cycle, authenticated every socket with a short-lived token minted inside an authenticated route handler, scoped delivery through authorized rooms, and made the service horizontally scalable with the Redis adapter and sticky routing. The Next.js side stays a normal App Router app: Server Components render history, and the hook only adds what the server cannot push.

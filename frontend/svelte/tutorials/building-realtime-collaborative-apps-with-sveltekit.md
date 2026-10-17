---
title: "Building Real-Time Collaborative Applications with SvelteKit"
description: "Build a production-grade collaborative editor with SvelteKit: attach a WebSocket server to adapter-node, authenticate upgrades with session cookies, model rooms as server-authoritative actors, synchronize edits with Yjs CRDTs, broadcast presence, and scale horizontally with Redis pub/sub."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building Real-Time Collaborative Applications with SvelteKit

## Summary

This tutorial builds a multi-user collaborative document editor on top of SvelteKit. You will attach a WebSocket endpoint to the Node adapter, authenticate the protocol upgrade with the same session cookie your HTTP routes already use, model each document as a server-authoritative room, merge concurrent edits with Yjs CRDTs, broadcast presence and cursors, and fan out messages across multiple Node processes with Redis pub/sub. By the end you will have a working editor where two browsers modify the same document without lost keystrokes, duplicated text, or cursor jumps.

## Target Audience

- Fullstack and frontend engineers who have already shipped at least one SvelteKit application and are comfortable with `+page.server.ts`, hooks, and the adapter system.
- Advanced developers who need real-time behavior that survives reconnects, multiple server instances, and concurrent writers.
- Backend-leaning engineers evaluating whether a SvelteKit monolith can host real-time features without a separate service.

## Prerequisites

- SvelteKit 2 with Svelte 5 (runes: `$state`, `$derived`, `$effect`) and TypeScript enabled.
- Node.js 20 or newer, plus a Redis instance reachable from your development machine.
- Working knowledge of HTTP cookies, sessions, and the WebSocket handshake.
- Familiarity with `adapter-node` — the default `adapter-auto` does not support long-lived connections on most platforms.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Attach a `ws` server to SvelteKit's Node adapter without breaking Vite's dev server or production builds.
- Authenticate a WebSocket upgrade using the session cookie issued by SvelteKit hooks, instead of passing tokens in query strings.
- Structure rooms as server-authoritative actors that own membership, presence, and persistence.
- Merge concurrent text edits with a Yjs CRDT and explain why last-write-wins is the wrong default for documents.
- Implement optimistic local rendering with server reconciliation and cursor-preserving remote patches.
- Scale fan-out across multiple processes with Redis pub/sub while keeping the socket protocol unchanged.
- Handle reconnects, exponential backoff, and queued offline edits without duplicating operations.

## Context and Motivation

Most SvelteKit applications start as request/response systems: a form action mutates the database, a load function reads it back, and the page refreshes. That model collapses the moment two users need to see each other's changes within a few hundred milliseconds. Polling wastes bandwidth and produces visible lag; naive WebSocket code introduces three problems that do not exist in HTTP land — authentication on a connection that outlives any single request, state that must be consistent across concurrent writers, and fan-out across more than one server process.

The tempting shortcut is a document-level last-write-wins merge: whoever saves last wins. For a single text field it feels acceptable. For a document with two cursors it produces silently destroyed paragraphs, which users experience as data loss — the single most damaging failure mode a collaborative product can ship. CRDTs solve this by making every edit a commutative operation, so the merge outcome is identical regardless of arrival order.

SvelteKit is a good host for this if you respect three constraints: the adapter must be long-lived (`adapter-node`), the upgrade handler must sit outside the fetch handler, and authoritative state must never live only in a component. The architecture in this tutorial keeps SvelteKit responsible for routing, rendering, and session identity, and gives the real-time concern its own small, explicit boundary.

## Core Content

### Why Collaboration Breaks Naive Realtime Code

A collaborative editor is a distributed system with human-visible failure modes. Before writing code, name the four failure classes you are designing against.

- **Lost updates.** Two clients send `set text` messages with full document bodies; the one processed second overwrites the first. No error surfaces.
- **Duplicated inserts.** A client retries after a dropped acknowledgement and the server appends the same character twice.
- **Cursor theft.** A remote patch replaces the whole document, so the local selection collapses to the end of the buffer while the user is mid-sentence.
- **Split state across instances.** Instance A broadcasts to its sockets only; users connected to instance B never see the edit until they reload.

Each one has a specific remedy: CRDT operations fix lost and duplicated updates, delta patches rather than whole-document writes fix cursor theft, and a pub/sub bridge fixes split state. The rest of this tutorial implements those remedies in order.

### Choosing the Transport: SSE, WebSocket, or WebTransport

Server-Sent Events are the right tool when data flows mostly one direction — a dashboard, a log tail, a job progress bar. They ride on ordinary HTTP, survive proxies, and reconnect automatically. They cannot send client edits without a second HTTP request per keystroke, which is disqualifying for an editor.

WebSockets give you a duplex channel with a single handshake and per-message framing overhead of a few bytes. They require the server to hold open file descriptors, which means your platform must support long-lived connections; serverless platforms that spin down after a response are out.

WebTransport over HTTP/3 offers better multiplexing and unreliable datagrams, but browser support and infrastructure maturity still make it a specialist choice. Choose it only for media or high-frequency telemetry where head-of-line blocking is genuinely measurable.

For a document editor, WebSockets are the correct default. The important architectural point is that the transport should be swappable: everything downstream of this section consumes a typed message envelope, not a socket.

### Attaching a WebSocket Server to SvelteKit

SvelteKit builds to a `build/` directory containing a `handler.js` that exports a Node request listener. To add a WebSocket endpoint, you create your own entry file that composes the SvelteKit handler with an HTTP server, and you import the built handler so both share one port.

In development, `vite dev` owns the port, so you register a Vite plugin that attaches the same `WebSocketServer` to Vite's HTTP server in `configureServer`. Keeping the room logic in an adapter-agnostic module means dev and production share one implementation and only the wiring differs.

```text
src/
  hooks.server.ts        session resolution for HTTP requests
  lib/server/rooms.ts    room registry — membership, presence, persistence
  lib/server/auth.ts     upgrade authentication (cookie -> user)
  lib/collab/protocol.ts shared message types (client + server)
  lib/collab/client.ts   browser client: reconnect, backoff, queueing
  routes/doc/[id]/
    +page.server.ts      authorization for the document page
    +page.svelte         editor UI, binds Yjs to the DOM
server.js                production entry: SvelteKit handler + ws server
vite.config.ts           dev plugin: same ws server on Vite's HTTP server
```

The single most common mistake here is calling `wss.handleUpgrade` for every request path. Your server also serves assets, form actions, and health checks; upgrade only the paths you own and destroy the socket otherwise, or SvelteKit's fetch handler will receive a socket it cannot answer.

### Authenticating the Upgrade with Session Cookies

The browser attaches cookies to the WebSocket handshake automatically, because the handshake is an HTTP GET. That means you can reuse the exact session mechanism your SvelteKit app already trusts — no signed token in the query string, no `Sec-WebSocket-Protocol` smuggling.

Parse the `cookie` header from the `IncomingMessage`, resolve the session exactly as `hooks.server.ts` does, and reject with a `401` written directly to the socket before the upgrade completes. This has to happen *before* `handleUpgrade`, because once the protocol switches you can only close with a WebSocket close code — the browser will not surface an HTTP status.

Two subtleties matter in production. First, `Origin` must be validated: WebSocket connections are not covered by the same-origin policy, so a malicious page can open a socket to your server and the browser will attach the user's cookies. Compare `Origin` against an allowlist. Second, the session must be re-checked periodically for long-lived sockets, because a logout or role change does not terminate open connections by itself.

### Modelling Rooms as Server-Authoritative Actors

A room is the unit of consistency. It owns its member set, its presence map, its Yjs document, and its persistence debounce. Clients never receive other clients' raw messages; the server reads, applies, and re-broadcasts.

This indirection is what makes the system debuggable. Every message passes one function, so you can log it, validate it, rate-limit it, and replay it. Peer-to-peer topologies look attractive for latency but move trust to the client, which is unacceptable for documents with permissions.

Each room keeps a sequence number that increments per accepted operations batch. Clients send `lastSeq` on reconnect; the server replies with a snapshot plus any operations produced after that sequence. Without this handshake, a client that reconnects after thirty seconds silently loses thirty seconds of remote edits, and the next local edit re-introduces stale text.

The room lifecycle matters for memory. Reference-count members: create the document on the first join, start a persistence debounce, and evict the room after the last member leaves plus a grace period. Evicting immediately destroys the in-memory CRDT and forces a cold load on every refresh.

### Presence and Awareness Without Noise

Presence — who is here, where their cursor is, what they have selected — is high-frequency, low-value state. It must never touch the database and must never be persisted. Broadcasting a presence message per mousemove will saturate the socket and burn CPU on every client.

Throttle cursor updates to roughly 20-30 milliseconds, coalescing intermediate positions. Send a full presence snapshot on join and incremental updates afterward. When a socket closes, remove the member and broadcast the departure immediately rather than waiting for a timeout; users read a ghost avatar as a broken product.

Yjs ships an awareness protocol that already implements this pattern — heartbeat, timeout, and per-client state — and reusing it saves you from writing the cleanup logic. Awareness state is ephemeral by design and is not part of the document history, which is exactly the semantics presence needs.

### Conflict Resolution with Yjs CRDTs

A CRDT makes concurrent edits merge deterministically. Yjs represents a document as a sequence of items with unique identifiers and origin references; inserting at the same index on two clients produces two items with defined ordering, not one overwritten item. Deletions are tombstones, so a delete and a concurrent insert at the same position both survive correctly.

The integration point is a shared `Y.Text` bound to an editor. On the client you observe text events and apply remote deltas; on the server you hold the same `Y.Doc`, apply updates from clients, and broadcast the encoded update. Because Yjs updates are commutative and idempotent, the server does not need to order them — it only needs to deliver every update at least once.

Persistence is a snapshot of the CRDT state, not the rendered text. Store `Y.encodeStateAsUpdate(doc)` as a `bytea`/`BLOB` column plus a periodic compaction, and you can reconstruct the exact document including history. Storing rendered markdown instead loses the tombstones and breaks merging after a restart.

The trade-off to state honestly: Yjs payloads are binary, opaque in logs, and grow with edit history until you run garbage collection. For rich-text editors the alternative — operational transformation — requires a central server to transform every operation against every concurrent one, which is far harder to get right and does not survive offline editing.

### Optimistic Updates and Reconciliation

Local edits must render before the server acknowledges them, or typing feels laggy at 80 ms round-trip times. With a CRDT you get this for free: apply the local operation to the local document immediately, emit the update to the server, and let the echo arrive as a no-op merge.

The reconciliation problem appears with non-CRDT state — saving a document title, toggling a share flag, reordering a list. For those, keep a small pending-operation map keyed by client-generated operation id. The server echoes the id in its acknowledgement; on receipt you drop the optimistic entry and reconcile with the authoritative value. If a conflict is detected, the server value wins and the UI shows a brief "updated by another user" affordance rather than silently reverting.

Never block input on the acknowledgement. Never apply a remote snapshot over a document that has unacknowledged local operations — merge, do not replace. This is the single rule that prevents the "my typing disappeared" bug report.

### Scaling Across Processes with Redis Pub/Sub

A single Node process broadcasts to sockets on that process only. The moment you run two instances behind a load balancer, users connected to different instances stop seeing each other's edits.

The fix is a message bus between processes. Each room subscribes to a Redis channel; when any instance accepts an operation, it publishes the encoded update to that channel; every instance — including the publisher — applies it to its local copy of the room's `Y.Doc` and broadcasts to its own sockets. Members that arrive on a new instance get a snapshot loaded from the database and then join the live channel.

Redis pub/sub is fire-and-forget: a subscriber that disconnects mid-message loses that message. That is acceptable here precisely because Yjs updates are idempotent and the reconnect handshake replays anything missed after `lastSeq`. If you also need durability for the bus itself, Redis Streams with a consumer group is the upgrade path, at the cost of ack bookkeeping.

Keep the channel per room, not per tenant or global. A global channel makes every instance deserialize every edit in the system; per-room channels keep fan-out proportional to active rooms.

### Reconnection, Backoff, and Offline Queues

Networks drop. Laptops sleep. A collaborative client must assume the socket dies regularly and recover without user action.

Three pieces make that work. First, exponential backoff with jitter, capped around thirty seconds, so a restarting server does not receive a thundering herd. Second, a resume handshake carrying the last sequence number, so the client can request the delta it missed instead of a full reload. Third, an outbound queue of unacknowledged updates persisted in memory (and in IndexedDB for longer sessions) that flushes on reconnect — since updates are idempotent, a double flush is harmless, which is why this design does not need exactly-once delivery.

Show connection state in the UI. A discreet "reconnecting" pill is far better than a frozen editor; users tolerate a visible reconnection and distrust an invisible one. Suppress destructive actions while disconnected, and mark the document read-only if the session expired rather than accepting edits you will reject.

## Code Examples

### The shared protocol

```typescript
// src/lib/collab/protocol.ts
export type ClientMessage =
  | { type: 'join'; docId: string; lastSeq: number }
  | { type: 'update'; docId: string; update: Uint8Array; opId: string }
  | { type: 'awareness'; docId: string; update: Uint8Array }
  | { type: 'leave'; docId: string };

export type ServerMessage =
  | { type: 'snapshot'; docId: string; update: Uint8Array; seq: number }
  | { type: 'update'; docId: string; update: Uint8Array; seq: number; opId?: string }
  | { type: 'awareness'; docId: string; update: Uint8Array }
  | { type: 'presence'; docId: string; members: PresenceMember[] }
  | { type: 'error'; code: 'unauthorized' | 'forbidden' | 'rate_limited'; message: string };

export interface PresenceMember {
  clientId: number;
  userId: string;
  name: string;
  color: string;
  cursor: { anchor: number; head: number } | null;
}
```

### Upgrade authentication

```typescript
// src/lib/server/auth.ts
import type { IncomingMessage } from 'node:http';
import { parse } from 'cookie';
import { getSessionUser } from './session';

const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'http://localhost:5173'
]);

export interface UpgradeIdentity {
  userId: string;
  name: string;
  token: string;
}

export async function authenticateUpgrade(
  req: IncomingMessage
): Promise<UpgradeIdentity | null> {
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return null;
  }

  const header = req.headers.cookie;
  if (!header) return null;

  const cookies = parse(header);
  const token = cookies.session;
  if (!token) return null;

  const user = await getSessionUser(token);
  if (!user) return null;

  return { userId: user.id, name: user.name, token };
}
```

### Production entry: one port, two concerns

```javascript
// server.js
import { createServer } from 'node:http';
import { handler } from './build/handler.js';
import { WebSocketServer } from 'ws';
import { authenticateUpgrade } from './src/lib/server/auth.js';
import { rooms } from './src/lib/server/rooms.js';

const PORT = Number(process.env.PORT ?? 3000);
const server = createServer(handler);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/api/collab') {
    socket.destroy();
    return;
  }

  let identity;
  try {
    identity = await authenticateUpgrade(req);
  } catch (error) {
    console.error('upgrade auth failed', error);
    identity = null;
  }

  if (!identity) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  const docId = url.searchParams.get('docId');
  if (!docId) {
    socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, { identity, docId });
  });
});

wss.on('connection', async (ws, _req, { identity, docId }) => {
  const room = await rooms.acquire(docId, identity);
  room.attach(ws);

  ws.on('message', (raw) => {
    room.receive(identity, raw).catch((error) => {
      console.error('room message error', error);
      ws.close(1011, 'internal error');
    });
  });

  ws.on('close', () => {
    room.detach(ws);
  });
});

server.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
```

### Room registry with eviction

```typescript
// src/lib/server/rooms.ts
import * as Y from 'yjs';
import type { WebSocket } from 'ws';
import { loadSnapshot, saveSnapshot } from './documents';
import { bridge } from './bus';
import type { PresenceMember } from '$lib/collab/protocol';

const GRACE_MS = 60_000;

class Room {
  readonly doc = new Y.Doc();
  readonly members = new Map<WebSocket, PresenceMember>();
  private seq = 0;
  private evictTimer: NodeJS.Timeout | null = null;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(readonly id: string) {}

  async hydrate(): Promise<void> {
    const stored = await loadSnapshot(this.id);
    if (stored) Y.applyUpdate(this.doc, stored);
    this.doc.on('update', (update: Uint8Array) => {
      this.seq += 1;
      this.broadcast({ type: 'update', docId: this.id, update, seq: this.seq });
      this.scheduleSave();
    });
  }

  attach(ws: WebSocket): void {
    if (this.evictTimer) {
      clearTimeout(this.evictTimer);
      this.evictTimer = null;
    }
    this.members.set(ws, {
      clientId: Math.floor(Math.random() * 2 ** 31),
      userId: '',
      name: '',
      color: '',
      cursor: null
    });
    ws.send(
      JSON.stringify({
        type: 'snapshot',
        docId: this.id,
        update: Y.encodeStateAsUpdate(this.doc),
        seq: this.seq
      })
    );
    this.broadcastPresence();
  }

  detach(ws: WebSocket): void {
    this.members.delete(ws);
    this.broadcastPresence();
    if (this.members.size === 0) {
      this.evictTimer = setTimeout(() => rooms.release(this.id), GRACE_MS);
    }
  }

  receive(identity: { userId: string }, raw: unknown): Promise<void> {
    const message = JSON.parse(String(raw));
    if (message.type === 'update' && message.update) {
      Y.applyUpdate(this.doc, new Uint8Array(message.update));
    }
    return bridge.publish(this.id, message);
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      saveSnapshot(this.id, Y.encodeStateAsUpdate(this.doc)).catch((error) =>
        console.error('snapshot save failed', error)
      );
    }, 2_000);
  }

  private broadcastPresence(): void {
    const members = [...this.members.values()];
    this.broadcast({ type: 'presence', docId: this.id, members });
  }

  private broadcast(message: unknown): void {
    const payload = JSON.stringify(message);
    for (const ws of this.members.keys()) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }
}

class RoomRegistry {
  private rooms = new Map<string, Room>();

  async acquire(id: string, identity: { userId: string; name: string }): Promise<Room> {
    let room = this.rooms.get(id);
    if (!room) {
      room = new Room(id);
      await room.hydrate();
      this.rooms.set(id, room);
    }
    return room;
  }

  release(id: string): void {
    this.rooms.delete(id);
  }
}

export const rooms = new RoomRegistry();
```

### Redis fan-out bridge

```typescript
// src/lib/server/bus.ts
import { createClient } from 'redis';
import type { ServerMessage } from '$lib/collab/protocol';

const publisher = createClient({ url: process.env.REDIS_URL });
const subscriber = publisher.duplicate();

const handlers = new Map<string, (message: ServerMessage) => void>();

await Promise.all([publisher.connect(), subscriber.connect()]);

await subscriber.pSubscribe('room:*', (payload) => {
  const parsed = JSON.parse(payload) as { docId: string; message: ServerMessage };
  handlers.get(parsed.docId)?.(parsed.message);
});

export const bridge = {
  subscribe(docId: string, handler: (message: ServerMessage) => void) {
    handlers.set(docId, handler);
  },
  async publish(docId: string, message: unknown) {
    await publisher.publish(
      `room:${docId}`,
      JSON.stringify({ docId, message })
    );
  }
};
```

### Browser client with backoff and resume

```typescript
// src/lib/collab/client.ts
import * as Y from 'yjs';

export interface CollabOptions {
  docId: string;
  doc: Y.Doc;
  onPresence: (members: unknown[]) => void;
  onStatus: (status: 'connecting' | 'open' | 'reconnecting' | 'closed') => void;
}

export function connectCollab({ docId, doc, onPresence, onStatus }: CollabOptions) {
  let socket: WebSocket | null = null;
  let attempt = 0;
  let lastSeq = 0;
  let closedByUser = false;
  const queue: Uint8Array[] = [];

  const url = () => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}/api/collab?docId=${encodeURIComponent(docId)}`;
  };

  const send = (payload: unknown) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  const flush = () => {
    while (queue.length > 0) {
      const update = queue[0];
      if (!send({ type: 'update', docId, update, opId: crypto.randomUUID() })) return;
      queue.shift();
    }
  };

  const localUpdate = (update: Uint8Array) => {
    if (!send({ type: 'update', docId, update, opId: crypto.randomUUID() })) {
      queue.push(update);
    }
  };

  const open = () => {
    onStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    socket = new WebSocket(url());
    socket.binaryType = 'arraybuffer';

    socket.addEventListener('open', () => {
      attempt = 0;
      onStatus('open');
      send({ type: 'join', docId, lastSeq });
      flush();
    });

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data as string);
      if (message.type === 'snapshot') {
        Y.applyUpdate(doc, new Uint8Array(message.update), 'server');
        lastSeq = Math.max(lastSeq, message.seq);
      } else if (message.type === 'update') {
        lastSeq = Math.max(lastSeq, message.seq);
        Y.applyUpdate(doc, new Uint8Array(message.update), 'server');
      } else if (message.type === 'presence') {
        onPresence(message.members);
      }
    });

    socket.addEventListener('close', () => {
      onStatus(closedByUser ? 'closed' : 'reconnecting');
      if (closedByUser) return;
      const delay = Math.min(30_000, 500 * 2 ** attempt) + Math.random() * 250;
      attempt += 1;
      setTimeout(open, delay);
    });

    socket.addEventListener('error', () => socket?.close());
  };

  doc.on('update', localUpdate);
  open();

  return {
    disconnect() {
      closedByUser = true;
      doc.off('update', localUpdate);
      socket?.close();
    }
  };
}
```

### Authorizing the page and wiring the editor

```typescript
// src/routes/doc/[id]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import { getDocumentForUser } from '$lib/server/documents';

export async function load({ params, locals }) {
  if (!locals.user) throw redirect(303, `/login?next=/doc/${params.id}`);

  const document = await getDocumentForUser(params.id, locals.user.id);
  if (!document) throw error(404, 'Document not found');

  return {
    docId: document.id,
    title: document.title,
    canEdit: document.role !== 'viewer'
  };
}
```

```svelte
<!-- src/routes/doc/[id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as Y from 'yjs';
  import { connectCollab } from '$lib/collab/client';

  export let data;

  let editor: HTMLTextAreaElement;
  let presence = $state<{ name: string; color: string }[]>([]);
  let status = $state<'connecting' | 'open' | 'reconnecting' | 'closed'>('connecting');

  const doc = new Y.Doc();
  const text = doc.getText('content');

  onMount(() => {
    const connection = connectCollab({
      docId: data.docId,
      doc,
      onPresence: (members) => {
        presence = members as { name: string; color: string }[];
      },
      onStatus: (next) => {
        status = next;
      }
    });

    const render = () => {
      const selectionStart = editor?.selectionStart ?? 0;
      const selectionEnd = editor?.selectionEnd ?? 0;
      const value = text.toString();
      if (editor && editor.value !== value) {
        editor.value = value;
        editor.selectionStart = Math.min(selectionStart, value.length);
        editor.selectionEnd = Math.min(selectionEnd, value.length);
      }
    };

    render();
    text.observe(render);

    return () => {
      text.unobserve(render);
      connection.disconnect();
    };
  });

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLTextAreaElement;
    const next = target.value;
    const current = text.toString();

    if (next === current) return;

    let start = 0;
    while (start < current.length && current[start] === next[start]) start += 1;
    let endCurrent = current.length;
    let endNext = next.length;
    while (endCurrent > start && endNext > start && current[endCurrent - 1] === next[endNext - 1]) {
      endCurrent -= 1;
      endNext -= 1;
    }

    doc.transact(() => {
      if (endCurrent > start) text.delete(start, endCurrent - start);
      if (endNext > start) text.insert(start, next.slice(start, endNext));
    });
  }
</script>

<div class="editor">
  <header>
    <h1>{data.title}</h1>
    <span class="status" data-state={status}>{status}</span>
    <ul class="presence">
      {#each presence as member (member.name)}
        <li style:background={member.color} title={member.name}>{member.name[0]}</li>
      {/each}
    </ul>
  </header>

  <textarea
    bind:this={editor}
    readonly={!data.canEdit}
    oninput={handleInput}
    aria-label="Document content"
  ></textarea>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status[data-state='open'] {
    color: #157347;
  }

  .status[data-state='reconnecting'] {
    color: #b58105;
  }

  .status[data-state='closed'] {
    color: #b02a37;
  }

  .presence {
    display: flex;
    list-style: none;
    gap: 0.25rem;
    margin-left: auto;
  }

  .presence li {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 0.75rem;
  }

  textarea {
    min-height: 60vh;
    font-family: ui-monospace, monospace;
    line-height: 1.6;
  }
</style>
```

### Dev-server wiring

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import { authenticateUpgrade } from './src/lib/server/auth';

function collabPlugin(): Plugin {
  return {
    name: 'collab-websocket',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on('upgrade', async (req, socket, head) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname !== '/api/collab') return;

        const identity = await authenticateUpgrade(req).catch(() => null);
        if (!identity) {
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [sveltekit(), collabPlugin()]
});
```

## Key Insights

- **Long-lived connections require a long-lived adapter.** `adapter-node` keeps a process alive; most serverless adapters terminate after the response, which kills the socket. Decide the deployment target before writing protocol code.
- **Authenticate before the upgrade, authorize after it.** Cookies arrive on the handshake, so resolve identity there and reject with a raw `401`. But membership must be re-authorized on each room join and periodically afterward, because a WebSocket created before a permission change stays open until something closes it.
- **Validate `Origin` on every upgrade.** WebSockets are exempt from the same-origin policy; without an allowlist, any page can open a socket with the user's cookies attached. This is the most frequently missed security control in realtime SvelteKit code.
- **Never persist rendered text as the collaboration source of truth.** Store the encoded CRDT update. Persisting markdown loses tombstones and merge metadata, so the next write resurrects deleted paragraphs.
- **CRDTs make retries safe, so design for at-least-once delivery** instead of exactly-once. Idempotent updates are the reason the reconnect queue can flush twice without corrupting the document.
- **Broadcast deltas, not snapshots.** A full-document replace on every keystroke destroys remote selections and turns a 90 MB/s room into a 9 GB/s room at realistic sizes.
- **Room-scoped Redis channels, not global ones.** Fan-out cost should scale with active rooms, and a global channel makes every instance parse every edit in the system.
- **Presence is ephemeral and must never touch the database.** Persisting cursor positions adds write load for data that is stale within a second, and complicates deletion obligations under privacy rules.
- **Evict rooms with a grace period.** Reference counting with a one-minute tail avoids a cold CRDT load on every page refresh while still bounding memory.
- **Compaction is not optional.** Yjs retains tombstones and older item identifiers; schedule `encodeStateAsUpdate` with garbage collection or snapshot memory grows without bound on long-lived documents.

## Next Steps

- Add offline-first persistence by mirroring the `Y.Doc` into IndexedDB with `y-indexeddb`, then flushing the queue on `online` events.
- Move from a plain textarea to a rich-text binding using ProseMirror with `y-prosemirror`, or CodeMirror 6 with `y-codemirror.next`, and observe how the same protocol carries richer operations.
- Replace Redis pub/sub with Redis Streams and a consumer group when you need replayable, acknowledged fan-out.
- Layer role-based document permissions on top of the room actor, and add an audit log by recording accepted operation batches with their author identity.
- Study the Advanced Svelte syllabus for streaming SSR, islands, and adapter-level deployment trade-offs that pair well with this realtime boundary.

## Conclusion

You built a collaborative editor that separates concerns cleanly: SvelteKit owns routing, rendering, and session identity; a room actor owns consistency; Yjs owns conflict resolution; Redis owns cross-process fan-out; and the browser client owns reconnection. Each boundary is individually testable, which is what makes the system maintainable as features accumulate.

The durable lessons are architectural rather than syntactic. Authenticate the upgrade before the handshake and re-authorize afterwards. Persist CRDT updates rather than rendered text. Broadcast deltas and let idempotent merges absorb retries. Scope fan-out per room and evict with a grace period. Get those four decisions right and the transport, the editor binding, and the deployment platform all become swappable details.

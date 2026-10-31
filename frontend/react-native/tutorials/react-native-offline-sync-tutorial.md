---
title: "React Native Offline Sync Tutorial"
description: "Build an offline-first React Native data layer that persists every mutation locally, replays the queue when connectivity returns, and resolves conflicts deterministically across devices."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# React Native Offline Sync Tutorial

## Summary

This tutorial builds an offline-first data layer for React Native: every write lands in a durable local outbox first, the UI confirms immediately, and a sync engine replays the queue when the network returns. You end with a module that survives app restarts, avoids duplicate writes on retry, and resolves conflicting edits instead of silently losing one.

## Target Audience

- React Native and Expo developers whose screens already talk to a REST or GraphQL API.
- Intermediate to advanced developers comfortable with TypeScript, `async`/`await`, and one local database.

## Prerequisites

- Node.js 20+, a React Native 0.74+ or Expo SDK 51+ project, and TypeScript configured.
- `@react-native-community/netinfo` for connectivity, `expo-sqlite` (or `op-sqlite`) for storage.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Model local state so a write is never lost between the tap and the server acknowledgement.
- Build an append-only mutation queue keyed by stable, client-generated identifiers.
- Replay mutations safely with idempotency keys and jittered exponential backoff.
- Apply an explicit conflict policy instead of accidental last-write-wins.

## Context and Motivation

A courier taps "Confirm delivery" in a basement with no signal. The naive version fires `fetch`, gets a network error, and shows a red toast: the work is gone. On a flaky link the user taps again and the server records two deliveries. Then the app is backgrounded, JavaScript stops, and the queue never drains at all. Offline-first is not a feature bolted on later; it is a property of how you persist and transmit writes. The pattern below is the smallest version that is genuinely correct: a write-ahead log on the device, an idempotent server contract, and a loop that treats connectivity as a hint rather than a source of truth.

## Core Content

### Persistence and an Append-Only Outbox

State held only in React state or Zustand dies with the process, and Android kills backgrounded processes aggressively, so pending mutations must reach SQLite before the UI confirms. AsyncStorage is fine for small caches but wrong here: you need indexed queries (`WHERE next_attempt_at <= ?`) and rows that survive a crash. Model each mutation as one row — client UUID, operation kind, JSON payload, and scheduling metadata (`attempts`, `next_attempt_at`) — inserted, retried, then deleted after an acknowledgement. Never rewrite an existing payload to "fix" it; enqueue a new operation so the log stays legible.

### Connectivity Is a Hint, Not a Gate

NetInfo reports link state, not reachability: a captive portal shows `connected`, and a VPN drop can leave a socket that looks alive. Treat `connected` as "try now" and a network error as "back off", never the reverse. A foreground timer covers the cases where the connectivity event never fires.

### Replay with Idempotency and Backoff

Send `Idempotency-Key: <row.id>` on every attempt. The server stores that key with the response and replays the stored response for duplicates, so an attempt that timed out after a successful write returns `200` instead of creating a second record. Failures increment `attempts` and reschedule at `min(2^attempts * 1000, 300000)` ms plus jitter, so devices reconnecting together do not form a thundering herd.

### Conflict Resolution Needs a Declared Policy

When two devices edit the same record, one loses unless the merge is defined. Three policies cover most apps: server-wins for configuration and reference data, field-level merge when edits touch disjoint columns, and last-write-wins on a server clock for free text. Whichever you pick, surface the outcome — a "your version was replaced" banner beats a silent revert.

## Code Examples

The outbox module writes before returning, so the caller can show "saved" the moment `enqueue` resolves. The index on `next_attempt_at` keeps replay cheap as the table grows.

```typescript
// src/sync/outbox.ts
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export type MutationKind = 'create_order' | 'update_delivery' | 'delete_note';
export type OutboxRow = { id: string; kind: MutationKind; payload: string; attempts: number };

const db = SQLite.openDatabaseSync('app.db');

export async function initOutbox(): Promise<void> {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL,
            payload TEXT NOT NULL, created_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
            next_attempt_at INTEGER NOT NULL DEFAULT 0);
        CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox (next_attempt_at);
    `);
}

export async function enqueue(kind: MutationKind, payload: unknown): Promise<string> {
    const id = Crypto.randomUUID();
    await db.runAsync(
        'INSERT INTO outbox (id, kind, payload, created_at) VALUES (?, ?, ?, ?)',
        [id, kind, JSON.stringify(payload), Date.now()],
    );
    return id;
}

export async function takeReady(limit = 20): Promise<OutboxRow[]> {
    return db.getAllAsync<OutboxRow>(
        'SELECT id, kind, payload, attempts FROM outbox WHERE next_attempt_at <= ? ORDER BY created_at ASC LIMIT ?',
        [Date.now(), limit],
    );
}
```

The engine drains the queue serially — parallel replay reorders dependent mutations:

```typescript
// src/sync/engine.ts
import { takeReady, type OutboxRow } from './outbox';
import { db } from './db';
import { postMutation } from '../api/client';

let draining = false;
const backoffMs = (n: number) => Math.min(2 ** n * 1000, 300_000) + Math.floor(Math.random() * 1000);

export async function drainQueue(): Promise<void> {
    if (draining) return;
    draining = true;
    try {
        for (const row of await takeReady()) {
            if ((await replay(row)) !== 'retry') {
                await db.runAsync('DELETE FROM outbox WHERE id = ?', [row.id]);
                continue;
            }
            await db.runAsync(
                'UPDATE outbox SET attempts = attempts + 1, next_attempt_at = ? WHERE id = ?',
                [Date.now() + backoffMs(row.attempts + 1), row.id],
            );
        }
    } finally {
        draining = false;
    }
}

async function replay(row: OutboxRow): Promise<'done' | 'retry' | 'drop'> {
    try {
        await postMutation(row.kind, JSON.parse(row.payload), { idempotencyKey: row.id });
        return 'done';
    } catch (error) {
        const status = (error as { status?: number }).status;
        const permanent = status !== undefined && status >= 400 && status < 500;
        // A 4xx never succeeds on retry; 409 and 429 are the recoverable exceptions.
        return permanent && status !== 409 && status !== 429 ? 'drop' : 'retry';
    }
}
```

Trigger the drain from three places: a NetInfo subscription, `AppState` returning to `active`, and a foreground timer that covers events the OS never delivered. On iOS and Android, register the same `drainQueue` function with `expo-background-task` (or `react-native-background-fetch`) so a queue that outlives the session still drains; guard it with `draining` exactly as above, since background callbacks can overlap a foreground drain.

```typescript
// src/sync/scheduler.ts
import NetInfo from '@react-native-community/netinfo';
import { drainQueue } from './engine';

export const startSyncScheduler = (): (() => void) =>
    NetInfo.addEventListener((state) => {
        if (state.isConnected && state.isInternetReachable !== false) void drainQueue();
    });
```

## Key Insights

- Write first, confirm second: the only reliable acknowledgement is the SQLite row, not a promise resolving in memory.
- Client-generated UUIDs make retries idempotent for free; server IDs force a reconciliation step you do not need.
- Cap and jitter the backoff — synchronized retries overload a backend that just came back.
- Treat `409` as a merge trigger: fetch the server record, apply the policy, enqueue the resolution.
- Delete rows only after a confirmed ack; optimistic deletes are how queues silently lose data.

## Next Steps

- Add server-side delta sync (`/changes?since=`) so devices pull edits they did not originate.
- Study CRDTs (Yjs, Automerge) when field-level merge is not enough for collaborative text.

## Conclusion

You now have a correct offline write path: a durable outbox, idempotent replay, jittered backoff, and a conflict policy chosen on purpose. What remains is product surface — pending indicators, conflict banners, a debug view — but the data layer no longer loses a user's work when the signal disappears.

---
title: "Building an Offline-First PWA with Vue.js 3"
description: "A hands-on tutorial on turning a Vue 3 application into an offline-first progressive web app with Workbox caching, IndexedDB persistence, an outbox queue for background synchronisation, and a safe service worker update flow."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building an Offline-First PWA with Vue.js 3

## Summary

This tutorial turns a Vue.js 3 single-page application into a progressive web app that keeps working when the network does not. You will install the tooling that generates a service worker, choose caching strategies per request type, persist domain data in IndexedDB, queue writes made while offline, replay them through the Background Sync API with a deterministic retry policy, resolve conflicting edits, and ship service worker updates without trapping users on a stale bundle. The end result is an installable application that loads instantly from cache, accepts mutations with no connectivity, and converges to the server state once the connection returns.

## Target Audience

- Frontend developers who already build Vue 3 applications with the Composition API and are comfortable with Pinia.
- Engineers responsible for reliability of field applications: point-of-sale terminals, logistics scanners, field service tools, offline-first dashboards.
- Advanced level — the tutorial assumes fluency with Vite, TypeScript, and asynchronous state management. Service workers are explained, not assumed.

## Prerequisites

- Node.js 20 or newer with npm.
- Working knowledge of Vue 3 (`setup` script, `ref`, `computed`, `watch`), Pinia, and TypeScript.
- A REST API for your domain data. Any endpoint that supports `GET` and `PUT` works; the examples assume `/api/orders`.
- Chrome or Edge for testing Background Sync. Firefox and Safari are covered with a fallback path, but their support for the Background Sync API is limited or absent.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Generate and register a service worker with `vite-plugin-pwa` and explain what lands in the precache manifest.
- Match caching strategies to request classes: app shell, static assets, API reads, and navigations.
- Model a local database in IndexedDB with Dexie and keep it in sync with your Pinia stores.
- Implement the outbox pattern so mutations survive a page reload while offline.
- Replay queued mutations with the Background Sync API and a fallback that works in every browser.
- Resolve write conflicts deterministically instead of silently overwriting server state.
- Ship a new service worker version without leaving users on an outdated bundle.

## Context and Motivation

Users do not experience your application as "online with occasional failures". They experience it as broken the moment a train enters a tunnel, a warehouse loses Wi-Fi, or a phone switches to a captive portal. Retry buttons and spinners are an admission that the application depends on a resource it does not control.

An offline-first application inverts that dependency. The local cache and local database become the source of truth for rendering, and the network becomes a synchronisation channel that may be slow, intermittent, or absent. Reads resolve from IndexedDB in single-digit milliseconds. Writes are accepted immediately, persisted locally, and forwarded when possible. The interface stays responsive because it never waits for a packet to come back.

Vue 3 is a good fit for this model. Its reactivity system lets you render straight from an IndexedDB-backed store, and its composables make connectivity and sync state reusable across views. The hard parts are not in the framework — they are in the service worker lifecycle, cache invalidation, and conflict resolution, which is exactly what this tutorial covers.

## Core Content

### What Offline-First Actually Means

Offline-first is a data-flow decision, not a checkbox in a Lighthouse report. Three properties define it:

- **Reads never block on the network.** The first paint of any route comes from a cache or a local database. A network response only refreshes what is already on screen.
- **Writes are accepted unconditionally.** The user can create, edit, and delete records with no connectivity. The application records the intent and owns the responsibility of delivering it later.
- **Synchronisation is a background concern.** Queue draining, retries, and conflict resolution happen outside the interaction the user is performing.

A useful way to separate the two storage layers:

| Layer | Technology | Holds | Lifetime |
|-------|------------|-------|----------|
| Asset cache | Service worker Cache Storage | HTML shell, JS, CSS, fonts, images | Until a new service worker version activates |
| Domain data | IndexedDB | Records, queued mutations, sync metadata | Until the user clears site data |

The asset cache answers "can the application boot?". The local database answers "does the application have data to show?". Both are required; neither substitutes for the other.

### Setting Up the PWA Toolchain

The build tooling does two jobs: it emits a web app manifest and it generates the service worker from a Workbox configuration. `vite-plugin-pwa` wraps both and integrates with Vite's build pipeline.

```bash
npm install -D vite-plugin-pwa workbox-window
npm install dexie
```

Two settings deserve attention before anything else:

- `registerType: 'prompt'` keeps a new service worker in the waiting state until you tell it to activate. This is what lets you show an "update available" banner instead of swapping the running application under the user's hands. `autoUpdate` is convenient for marketing sites and dangerous for applications with unsaved local state.
- `injectRegister: 'auto'` writes the registration call into the entry HTML, so you do not need to hand-roll a registration script.

### The App Shell and Precache Manifest

Workbox precaches a fixed list of files at install time. Everything in that list is available offline on the very first visit after installation, which is why the HTML entry, the JS bundles, and the CSS bundle must be there.

Vite produces hashed filenames such as `index-C3f9a1.js`. The plugin reads the build output and injects the real names into the precache manifest, so you never maintain that list by hand. The default `globPatterns` covers the common cases:

```text
**/*.{js,css,html,ico,png,svg,woff2}
```

Deliberately excluded from precache: API responses, large media, and anything user-specific. Precache is shared by every user of the deployment and is versioned with the build, so it is the wrong place for data.

The manifest itself is small. What matters is that `start_url` matches a route the service worker can serve offline, and that icons exist at the two sizes browsers actually require for installability.

### Choosing a Caching Strategy per Request Type

A single caching rule for every request is the most common cause of stale-data bugs in PWAs. Match the strategy to the semantics of the resource instead.

| Resource | Strategy | Rationale |
|----------|----------|-----------|
| Navigation requests (HTML) | NetworkFirst with a 3 second timeout, falling back to the precached shell | Content freshness matters, but a slow network must not block the boot |
| Hashed JS and CSS | CacheFirst | Filenames change on every build, so a cache hit is always correct |
| API reads (list and detail) | NetworkFirst, cached with a short expiry | Fresh when possible, usable when not |
| Reference data (currencies, tax tables, categories) | StaleWhileRevalidate | Instant response, refreshed in the background |
| API writes | NetworkOnly plus a background sync queue | Writes must never be served from cache |
| Images and fonts | CacheFirst with an expiration cap | Immutable payloads, bounded disk usage |

The timeout in NetworkFirst is the detail that separates a usable offline app from a white screen. Without it, a captive portal that accepts the TCP connection but never responds leaves the user staring at a spinner for a minute or more.

### Persisting Domain Data in IndexedDB

IndexedDB is the only browser storage with enough capacity and structure to hold a working data set: hundreds of megabytes on desktop, tens on mobile, with indexes and transactions. Its raw API is callback-based and verbose, so use Dexie as a thin typed wrapper.

Two schema decisions shape everything downstream:

- **Store records exactly as the server returns them**, plus two local fields: `_dirty` (the record has unpublished local changes) and `_deleted` (a tombstone, so deletions survive a reload).
- **Separate the outbox from the records.** Queued mutations belong in their own table with their own ordering, because they are a log of intent, not a copy of state.

Indexes should match the queries you actually run while offline: list by status, sort by `updatedAt`, look up by server id. Do not index everything; each index costs write time on every mutation.

### Optimistic Writes and the Outbox Pattern

When the user saves an order, three things must happen in one atomic sequence:

1. Write the record into IndexedDB with `_dirty: true`.
2. Append an operation to the outbox describing the intent (`create`, `update`, or `delete`, plus the payload and a client-generated id).
3. Update the Pinia store so the UI re-renders immediately.

Order matters. Writing to the store first and to the database second means a reload between the two steps loses the mutation while the user believes it was saved. Keeping both writes inside a single Dexie transaction keeps them consistent.

The client-generated id is essential. If the device creates the record offline, the UI needs a stable identity before the server assigns one. Use `crypto.randomUUID()` and send it as an `Idempotency-Key` header so a retried request cannot create two orders.

### Background Sync with Workbox

The Background Sync API lets the browser retry a failed request even after the tab is closed or the device is asleep. Workbox exposes it as `BackgroundSyncPlugin`, configured on the route that handles writes.

Two constraints matter in practice:

- **Chrome and Edge only.** Safari and Firefox do not implement the API. The outbox in IndexedDB is the portable layer: the service worker path is an optimisation, not the contract.
- **The browser owns the retry schedule.** You cannot control the delay, and a failed sync does not throw an error to your code. Report queue depth to the user instead of promising a delivery time.

For the portable path, drain the outbox from the page whenever connectivity returns and whenever the app regains focus, with exponential backoff and a maximum attempt count per operation.

### Detecting Real Connectivity

`navigator.onLine` reports whether the device has a network interface attached. It returns `true` on a captive portal, on a Wi-Fi network with no upstream route, and on an LTE connection that has run out of data. Treat it as a hint, not a fact.

The reliable signal is a successful request to a health endpoint, cached for a few seconds to avoid probing on every render. The pattern that works:

- Subscribe to `online` and `offline` events for instant feedback.
- Probe `/api/health` with a two-second timeout and a `no-store` cache policy.
- Cache the last probe result for a short interval and expose a `recheck()` function for user-initiated retries.

When offline, switch queries to the local database. When online returns, drain the outbox first and then refresh reads, in that order — otherwise a refresh can overwrite optimistic local state with stale server rows.

### Resolving Conflicts Deterministically

Two devices editing the same record is not an edge case in an offline application; it is the normal state. Pick a resolution rule per entity and write it down.

- **Last write wins with a server timestamp.** Simplest and adequate for independent fields. Send `updatedAt` with each write; the server rejects or overrides older writes.
- **Field-level merge.** Send only changed fields so concurrent edits to different fields both survive. Requires tracking a per-field diff in the outbox.
- **Optimistic concurrency with a version token.** The server returns a `version` or `ETag`; a write carries the version it read. A mismatch returns `409` and the client rebases or asks the user.

For money, inventory counts, and anything else where a silent overwrite destroys value, use a version token and surface the conflict. For preference flags and profile fields, last-write-wins is fine. The failure mode to avoid is defaulting to blind overwrite everywhere because it is the easiest to implement.

### Shipping Service Worker Updates Safely

A service worker never updates itself in place. The new version installs, waits, and activates later — and if it activates while the old page is running, two versions of your application code can talk to the same IndexedDB schema.

The sequence that avoids that:

- Detect `onNeedRefresh` from `virtual:pwa-register`, show a persistent banner offering to reload.
- Run any schema migration in the new service worker's `install` step, or gate the migration in the page behind a check that no older tab is open.
- Call `updateServiceWorker(true)` only after the user accepts, then reload.
- Never use `skipWaiting: true` in an application with queued mutations. It can activate a new worker in the middle of a background sync.

### Testing Offline Behaviour

Offline testing is mostly about simulating the three states that break naive implementations: no network at all, a network that accepts connections but never answers, and a network that ignores writes while serving reads.

- Use DevTools → Network → Offline for the hard-offline case. Reload twice: the first load installs the worker, the second proves the precache works.
- Throttle to "Slow 3G" and confirm the navigation timeout falls back to the cached shell instead of hanging.
- Use the Application panel to inspect Cache Storage contents and IndexedDB rows after each interaction. A mutation that is not in the outbox did not happen.
- Test with the tab closed: queue two writes offline, close the tab, reconnect, and verify both eventually land on the server exactly once.

## Code Examples

The examples build a small order-management slice. Everything runs against `npm run dev` for development and `npm run build && npm run preview` for service worker behaviour, because service workers only work over HTTPS or on `localhost`.

### Project Structure

```text
src/
  components/
    OfflineBanner.vue
    UpdatePrompt.vue
  composables/
    useConnectivity.ts
  db/
    schema.ts
    outbox.ts
  stores/
    orders.ts
  App.vue
  main.ts
  sw.ts
vite.config.ts
```

### Vite and Workbox Configuration

The configuration below precaches the app shell, applies a timeout-aware NetworkFirst policy to API reads, and routes writes through a background sync queue.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: {
        name: 'Field Orders',
        short_name: 'Orders',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f6feb',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith('/api/') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-reads',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/orders(\?.*)?$/,
            method: 'POST',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'orders-write-queue',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
```

A `maxAgeSeconds` of one hour on API reads is a deliberate compromise. Longer retention means a faster offline start but more stale data after a reconnect, and every successful network response refreshes the entry.

### IndexedDB Schema with Dexie

```typescript
// src/db/schema.ts
import Dexie, { type Table } from 'dexie';

export interface Order {
  id: string;
  serverId?: string;
  customerName: string;
  status: 'draft' | 'confirmed' | 'shipped';
  total: number;
  updatedAt: string;
  version: number;
  _dirty: 0 | 1;
  _deleted: 0 | 1;
}

export interface OutboxOp {
  seq?: number;
  opId: string;
  entity: 'order';
  kind: 'create' | 'update' | 'delete';
  entityId: string;
  payload: Partial<Order>;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

class OrdersDatabase extends Dexie {
  orders!: Table<Order, string>;
  outbox!: Table<OutboxOp, number>;

  constructor() {
    super('field-orders');
    this.version(1).stores({
      orders: 'id, serverId, status, updatedAt, _dirty',
      outbox: '++seq, opId, entityId, createdAt',
    });
  }
}

export const db = new OrdersDatabase();

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
```

`_dirty` and `_deleted` are numeric rather than boolean by convention, because some browsers historically failed to index booleans. `requestPersistentStorage()` asks the browser to exempt the origin from automatic eviction — worth calling once, after the first successful load, on applications that hold unsynced work.

### Connectivity Composable

```typescript
// src/composables/useConnectivity.ts
import { onMounted, onUnmounted, readonly, ref } from 'vue';

const isReachable = ref(navigator.onLine);
const lastCheck = ref(0);
const CHECK_INTERVAL_MS = 5000;

async function probe(): Promise<boolean> {
  if (Date.now() - lastCheck.value < CHECK_INTERVAL_MS) return isReachable.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    isReachable.value = res.ok;
  } catch {
    isReachable.value = false;
  } finally {
    clearTimeout(timer);
    lastCheck.value = Date.now();
  }

  return isReachable.value;
}

export function useConnectivity() {
  const handleOnline = () => probe();
  const handleOffline = () => {
    isReachable.value = false;
  };

  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    probe();
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });

  return { isReachable: readonly(isReachable), recheck: probe };
}
```

The module-level refs make connectivity a singleton: ten components can call `useConnectivity()` and they all observe one probe loop rather than ten competing timers.

### Outbox Queue Implementation

```typescript
// src/db/outbox.ts
import { db, type OutboxOp, type Order } from './schema';

export async function enqueue(op: Omit<OutboxOp, 'seq' | 'attempts' | 'createdAt'>) {
  await db.outbox.add({
    ...op,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
}

export async function pendingCount(): Promise<number> {
  return db.outbox.count();
}

async function send(op: OutboxOp): Promise<void> {
  const res = await fetch(`/api/orders/${op.entityId}`, {
    method: op.kind === 'create' ? 'POST' : op.kind === 'delete' ? 'DELETE' : 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': op.opId,
    },
    body: op.kind === 'delete' ? undefined : JSON.stringify(op.payload),
  });

  if (!res.ok && res.status !== 409) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function drainOutbox(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const ops = await db.outbox.orderBy('seq').toArray();

  for (const op of ops) {
    try {
      await send(op);
      await db.outbox.delete(op.seq!);
      await db.orders.update(op.entityId, { _dirty: 0 });
      sent += 1;
    } catch (error) {
      failed += 1;
      const attempts = op.attempts + 1;
      await db.outbox.update(op.seq!, {
        attempts,
        lastError: (error as Error).message,
      });
      if (attempts >= 5) break;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempts * 250));
    }
  }

  return { sent, failed };
}

export async function applyServerRecord(record: Order): Promise<void> {
  const local = await db.orders.get(record.id);
  if (local?._dirty) return;
  await db.orders.put({ ...record, _dirty: 0, _deleted: 0 });
}
```

Two behaviours here are deliberate. Operations are drained in `seq` order so a create always precedes its updates, and a `409` response counts as delivered because a conflict means the server already has a newer version — retrying it would loop forever. The loop stops after five failed attempts on one operation rather than skipping ahead, which would reorder dependent writes.

### Pinia Store with Optimistic Mutations

```typescript
// src/stores/orders.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, type Order } from '../db/schema';
import { drainOutbox, enqueue } from '../db/outbox';

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([]);
  const pending = ref(0);

  async function load() {
    orders.value = await db.orders
      .filter((o) => o._deleted === 0)
      .reverse()
      .sortBy('updatedAt')
      .then((rows) => rows.reverse());
  }

  async function saveOrder(input: Omit<Order, 'updatedAt' | 'version' | '_dirty' | '_deleted'>) {
    const now = new Date().toISOString();
    const existing = await db.orders.get(input.id);

    const record: Order = {
      ...existing,
      ...input,
      updatedAt: now,
      version: existing?.version ?? 0,
      _dirty: 1,
      _deleted: 0,
    };

    await db.transaction('rw', db.orders, db.outbox, async () => {
      await db.orders.put(record);
      await enqueue({
        opId: crypto.randomUUID(),
        entity: 'order',
        kind: existing?.serverId ? 'update' : 'create',
        entityId: record.id,
        payload: record,
      });
    });

    await load();
    pending.value = await db.outbox.count();
  }

  async function sync() {
    await drainOutbox();
    pending.value = await db.outbox.count();
    await load();
  }

  return { orders, pending, load, saveOrder, sync };
});
```

Wrapping the record write and the outbox append in one `db.transaction` is the line that makes the whole design reliable. Without it, a crash between the two writes leaves a record marked dirty with no operation to publish it — a permanent ghost that never reconciles.

### Offline Banner Component

```vue
<!-- src/components/OfflineBanner.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useConnectivity } from '../composables/useConnectivity';

const props = defineProps<{ pending: number }>();
const { isReachable, recheck } = useConnectivity();

const label = computed(() => {
  if (!isReachable.value) {
    return props.pending > 0
      ? `Offline — ${props.pending} change(s) saved on this device`
      : 'Offline — showing saved data';
  }
  return props.pending > 0 ? `Syncing ${props.pending} change(s)` : '';
});
</script>

<template>
  <div v-if="label" class="banner" role="status" aria-live="polite">
    <span>{{ label }}</span>
    <button v-if="!isReachable" type="button" @click="recheck">Retry</button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #fff4d6;
  color: #5c4400;
  font-size: 0.875rem;
}
</style>
```

The banner is not cosmetic. Users who cannot see that their work is queued will retry the same action, creating duplicates. `role="status"` with `aria-live="polite"` announces the state change to screen readers without stealing focus.

### Update Prompt Component

```vue
<!-- src/components/UpdatePrompt.vue -->
<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    setInterval(() => registration.update(), 60 * 60 * 1000);
  },
});

async function applyUpdate() {
  await updateServiceWorker(true);
}
</script>

<template>
  <div v-if="needRefresh" class="update" role="alert">
    <span>A new version is available.</span>
    <button type="button" @click="applyUpdate">Reload</button>
  </div>
</template>
```

Polling for updates hourly is a pragmatic middle ground: the tab finds a new deployment within an hour without hammering the server on every navigation. Pair the reload with a check for `pending` in the store and refuse to reload while unsynced operations exist.

### Verifying the Build

```bash
npm run build
npm run preview
```

Then, in DevTools:

```text
Application → Service Workers   → status "activated and is running"
Application → Cache Storage     → precache-and-update plus api-reads and images
Application → IndexedDB         → field-orders with orders and outbox tables
Network → Offline               → reload twice, application still boots
```

A quick automated guard against regressions in the data layer:

```typescript
// tests/outbox.spec.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { db } from '../src/db/schema';
import { drainOutbox, enqueue } from '../src/db/outbox';

describe('outbox', () => {
  beforeEach(async () => {
    await db.outbox.clear();
    await db.orders.clear();
  });

  it('keeps operations when the request fails', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as typeof fetch;

    await db.orders.put({
      id: 'local-1', customerName: 'Ada', status: 'draft', total: 42,
      updatedAt: new Date().toISOString(), version: 0, _dirty: 1, _deleted: 0,
    });
    await enqueue({
      opId: 'op-1', entity: 'order', kind: 'create',
      entityId: 'local-1', payload: { customerName: 'Ada' },
    });

    const result = await drainOutbox();

    expect(result.failed).toBe(1);
    expect(await db.outbox.count()).toBe(1);
    expect((await db.orders.get('local-1'))?._dirty).toBe(1);
  });
});
```

## Key Insights

- **Local writes and queue appends belong in one transaction.** Any gap between them produces records that look saved to the user and can never be published.
- **Client-generated ids plus an idempotency key make retries safe.** Without both, a timeout after a successful request creates a duplicate record that no amount of retrying can undo.
- **Configure a network timeout on navigation and API reads.** A captive portal is worse than no network, because it accepts the connection and then never responds.
- **`navigator.onLine` is not a connectivity check.** Probe a health endpoint with a short timeout and cache the result; treat the events as hints that trigger a probe.
- **Never enable `skipWaiting` in an app with a local queue.** It can activate a new worker mid-sync, mixing two versions of your code against one database.
- **Conflict resolution is a product decision.** Choose last-write-wins, field merge, or version tokens per entity and document it; silent overwrite is only acceptable where the data is cheap.
- **Bound the queue.** Cap retries, expose the pending count in the UI, and provide a manual retry so a permanently rejected operation cannot block the queue forever.
- **Precache is shared and versioned; user data is not.** Keep API responses out of the precache manifest and let runtime caching or IndexedDB hold them.

## Next Steps

- Add a service-worker-driven offline fallback page for navigations that are not in the app shell.
- Replace the manual drain loop with the Background Sync API on Chromium and keep the page-driven drain as the fallback, measuring which path delivers most operations.
- Extend conflict handling to field-level merges by storing per-field diffs in the outbox payload.
- Study the related Vue.js Performance Optimization Guide for bundle-size and rendering techniques that complement instant offline boot.
- Read the Vue.js Testing Guide for component-level tests of offline states and error paths.

## Conclusion

An offline-first Vue 3 application is built from four cooperating pieces: a service worker that serves the shell and applies per-route caching strategies, an IndexedDB schema that holds records and queued intent, a Pinia layer that renders from local state and writes optimistically, and a sync routine that drains the queue with safe retries. The framework contributes reactivity and composables; the reliability comes from the ordering of writes, the idempotency of requests, and a deliberately chosen conflict rule.

Build these in that order. Get the shell caching right and verify it with the network throttled, then persist reads, then accept writes, then sync. Each step is testable in isolation, and each one leaves the application usable even if the next is not finished.

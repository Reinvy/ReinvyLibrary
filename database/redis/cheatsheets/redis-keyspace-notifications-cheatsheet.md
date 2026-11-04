---
title: "Redis Keyspace Notifications and Event-Driven Invalidation Cheatsheet"
description: "Flag strings, channel names, and client recipes for turning Redis key events into cache invalidation, audit trails, and TTL-driven workflows without silently losing events."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Redis Keyspace Notifications and Event-Driven Invalidation Cheatsheet

Keyspace notifications let Redis publish a Pub/Sub message whenever the keyspace changes. That sounds like a free event bus, and teams often wire it straight into cache invalidation — then discover weeks later that events are best-effort, node-local, and published after the fact. This cheatsheet is the operational reference: how to switch the events on, what the channel names actually contain, which events you must instrument yourself, and how to build an invalidation path that degrades gracefully when a subscriber goes down.

## Quick Reference Table

| Action | Command | Description |
|--------|---------|-------------|
| Enable notifications | `CONFIG SET notify-keyspace-events KEA` | Both channel families, all standard classes |
| Inspect current flags | `CONFIG GET notify-keyspace-events` | Returns the active flag string |
| Persist across restart | `CONFIG REWRITE` | Flushes the running config back to the config file |
| Disable notifications | `CONFIG SET notify-keyspace-events ""` | Empty string stops all publishing immediately |
| Expiries only | `CONFIG SET notify-keyspace-events Ex` | Keyevent channels, expired class only |
| Expiries plus evictions | `CONFIG SET notify-keyspace-events Eex` | Covers TTL expiry and maxmemory eviction |
| Keyspace channels | `PSUBSCRIBE '__keyspace@0__:*'` | Payload is the event name, channel carries the key |
| Keyevent channels | `PSUBSCRIBE '__keyevent@0__:*'` | Payload is the key name, channel carries the event |
| Watch one namespace | `PSUBSCRIBE '__keyspace@0__:session:*'` | Glob matching happens on the channel name |
| Cluster fan-out | `CLUSTER NODES` | Enumerate nodes, then subscribe to each one |
| Durable alternative | `XADD key-events * event expired key k1` | Streams survive subscriber downtime |
| Missed-event detection | `INFO stats` | `keyspace_hits`, `keyspace_misses`, `expired_keys` |

Fifteen seconds of verification beats an hour of debugging: `PSUBSCRIBE '__key*__:*'` in one terminal and `SET`/`PEXPIRE` in another shows exactly which events your workload emits.

## Common Commands

### Flag strings and what each letter switches on

At least one of `K` or `E` must be present in the flag string. Without either, nothing is published no matter what else you set.

```bash
# K publishes to __keyspace@<db>__:<key> with the event name as payload.
# E publishes to __keyevent@<db>__:<event> with the key name as payload.
redis-cli CONFIG SET notify-keyspace-events KE

# Read the active value back — useful when a restart silently reverts it.
redis-cli CONFIG GET notify-keyspace-events
```

```text
| Flag | Class of events                                              |
|------|---------------------------------------------------------------|
| K    | Keyspace channels: __keyspace@<db>__:<key>                   |
| E    | Keyevent channels: __keyevent@<db>__:<event>                 |
| g    | Generic commands: del, expire, rename, persist               |
| $    | String commands                                              |
| l    | List commands                                                |
| s    | Set commands                                                 |
| h    | Hash commands                                                |
| z    | Sorted set commands                                          |
| t    | Stream commands                                              |
| a    | Array commands (recent versions)                             |
| d    | Module key type events                                       |
| x    | Expired events                                               |
| e    | Evicted events                                               |
| m    | Key miss events (not part of the A alias)                    |
| n    | New key events (not part of the A alias)                     |
| o    | Overwrite events (not part of the A alias)                   |
| c    | Type-changed events (not part of the A alias)                |
| A    | Alias for g, $, l, s, h, z, t, a, d, x, e                    |
```

The `A` alias is the convenient default, but it excludes `m`, `n`, `o`, and `c`. If you need miss tracking or overwrite detection, spell those letters out explicitly.

```bash
# Cache invalidation on writes and expiries, without paying for miss events.
redis-cli CONFIG SET notify-keyspace-events KEA

# Misses matter when you want to warm a cache on demand.
redis-cli CONFIG SET notify-keyspace-events KEmn
```

### Channel anatomy and event names

Each published event produces up to two messages, one per enabled family. The database index is part of the channel name, so `__keyevent@2__:expired` never collides with the default database.

```bash
# Two messages for a single SET, when both K and E are enabled.
# channel: __keyspace@0__:user:42    payload: set
# channel: __keyevent@0__:set        payload: user:42
redis-cli PSUBSCRIBE '__key*__:*'
```

Event names are command-shaped rather than semantic, and a few commands emit more than one event:

```text
| Command        | Events emitted                                  |
|----------------|--------------------------------------------------|
| DEL / UNLINK   | del                                             |
| HSET / HSETNX  | hset (one event for the whole call)             |
| MSET           | set per key                                     |
| RENAME         | rename_from for the source, rename_to for the dest |
| EXPIRE         | expire (the TTL being set, not a removal)       |
| PERSIST        | persist, only when a TTL was actually removed   |
| LPUSH / RPUSH  | lpush / rpush                                   |
| SADD           | sadd                                            |
| SETEX          | set plus expire                                 |
```

The distinction between `expire` and `expired` is the single most common source of bugs: `expire` fires when a TTL is attached, `expired` fires when the key is actually deleted.

### Expiry, eviction, and the value you no longer have

Expiry is not a scheduler. Redis removes expired keys lazily when they are touched, and an active cycle samples keys ten times per second. A key with a one-minute TTL can therefore surface its `expired` event later than expected.

```bash
# Subscribe to removals caused by TTL and by maxmemory pressure.
redis-cli PSUBSCRIBE '__keyevent@0__:expired' '__keyevent@0__:evicted'
```

Rules that matter in production:

- The `expired` payload is only the key name. There is no value in the message, and the key is already gone by the time you read it — so it cannot be used to archive the last value.
- `evicted` fires under `maxmemory` pressure; keys evicted this way are unrecoverable, which makes the event a loss signal rather than a cleanup hook.
- Notifications are not replicated. A replica does not expire keys on its own schedule and does not publish the primary's events, so subscribe to the node that owns the writes.
- Bulk operations such as `FLUSHDB` and `FLUSHALL` do not emit one event per key. If you depend on `del` events, use `DEL` or `UNLINK` for the deletions you care about.
- Write-side events fire even when the write is later lost. Notifications are not a transaction log; a crash between the write and your consumer's acknowledgement still leaves a gap.

### Subscribing across a Redis Cluster

In Cluster mode each node generates events only for the slots it owns, and unlike ordinary Pub/Sub there is no cluster-wide broadcast. A single `PSUBSCRIBE` against one node sees roughly a third of the keyspace.

```bash
# Enumerate the nodes, then open one subscriber connection per node.
redis-cli -c CLUSTER NODES
redis-cli -h 10.0.0.11 -p 6379 PSUBSCRIBE '__keyevent@0__:expired'
redis-cli -h 10.0.0.12 -p 6379 PSUBSCRIBE '__keyevent@0__:expired'
redis-cli -h 10.0.0.13 -p 6379 PSUBSCRIBE '__keyevent@0__:expired'
```

Every new node added by a resharding operation must be wired into the subscriber set too, otherwise events go missing silently after a scale-out.

### Keeping the setting alive across restarts

`CONFIG SET` is runtime state. A restart, a failover to a replica that never received the setting, or a config-management push of the original file all revert it to the default of disabled.

```bash
# Persist the runtime value into the config file the server was started with.
redis-cli CONFIG REWRITE

# Or set it declaratively in redis.conf / the container command line.
redis-cli CONFIG GET dir
```

Treat the flag string as part of your infrastructure definition, and add a startup assertion that fails loudly when `CONFIG GET notify-keyspace-events` returns an empty string.

## Code Snippets

### Node.js subscriber with ioredis

```javascript
const Redis = require('ioredis');

const client = new Redis(process.env.REDIS_URL);
const subscriber = client.duplicate();

(async () => {
  await client.config('SET', 'notify-keyspace-events', 'KEA');

  // One pattern per family keeps the handler able to tell them apart.
  await subscriber.psubscribe(
    '__keyevent@0__:expired',
    '__keyevent@0__:evicted',
    '__keyevent@0__:del',
    '__keyevent@0__:set'
  );

  subscriber.on('pmessage', (pattern, channel, payload) => {
    const event = channel.split(':').pop();
    const key = payload;

    invalidateLocalCache(key);
    metrics.increment('redis.key_event', { event });
  });

  // Pub/Sub connections drop without an error event on some network paths.
  subscriber.on('close', () => metrics.increment('redis.subscriber.disconnected'));
})().catch((error) => {
  console.error('subscriber failed to start', error);
  process.exit(1);
});

function invalidateLocalCache(key) {
  localCache.delete(key);
}
```

### Python subscriber with redis-py

```python
import redis

client = redis.Redis(host="localhost", port=6379, decode_responses=True)
client.config_set("notify-keyspace-events", "KEA")

subscriber = client.pubsub(ignore_subscribe_messages=True)
subscriber.psubscribe("__keyevent@0__:expired", "__keyevent@0__:evicted")

for message in subscriber.listen():
    if message["type"] != "pmessage":
        continue

    event = message["channel"].split(":")[-1]
    key = message["data"]
    handle_removal(event=event, key=key)
```

`ignore_subscribe_messages=True` matters: without it the first item in `listen()` is the subscription confirmation, not an event.

### Invalidating a second-level cache on write events

```javascript
// Pattern: keep the event handler idempotent and cheap. Re-read on demand
// instead of trying to recover the deleted value from the notification.
const pending = new Set();

async function onKeyEvent(event, key) {
  if (event === 'expired' || event === 'evicted' || event === 'del') {
    pending.add(key);
    await flushInvalidations();
  }
}

async function flushInvalidations() {
  if (pending.size === 0) return;

  const keys = [...pending];
  pending.clear();

  // Publish to the other service instances after this one is consistent.
  await client.publish('cache:invalidate', JSON.stringify(keys));
  await client.del(...keys.map((key) => `cache:${key}`));
}
```

### Batching burst invalidations

Active expiry processes keys in cycles, so expiries arrive in clusters rather than evenly spaced. A short debounce window converts hundreds of single-key events into a handful of batched invalidations.

```javascript
const buffer = new Set();
let timer = null;

function scheduleInvalidation(key) {
  buffer.add(key);

  if (timer) return;

  // 50 ms is long enough to coalesce one expiry cycle, short enough to stay fresh.
  timer = setTimeout(async () => {
    const keys = [...buffer];
    buffer.clear();
    timer = null;

    await client.del(...keys.map((key) => `cache:${key}`));
    metrics.increment('cache.invalidated', {}, keys.length);
  }, 50);
}
```

### Reproducing the behaviour locally

```bash
# Terminal 1 — watch every event in database 0.
redis-cli CONFIG SET notify-keyspace-events KEA
redis-cli --csv PSUBSCRIBE '__key*__:*'

# Terminal 2 — trigger a write, a TTL, and an expiry.
redis-cli SET session:demo value EX 2
redis-cli DEL session:demo
redis-cli SET counter:demo 1
```

With `KEA` you should see paired `__keyspace@0__` and `__keyevent@0__` messages, then an `expired` pair roughly two seconds later.

### Choosing between notifications, Streams, and client tracking

```text
| Requirement                        | Keyspace notifications | Streams         | Client tracking |
|------------------------------------|------------------------|-----------------|-----------------|
| Fire-and-forget invalidation       | good                   | overkill        | best            |
| No loss when a consumer is down    | no                     | yes (consumer groups) | no        |
| Works across a cluster untouched   | no, per node           | yes             | yes             |
| Carries the previous value         | no                     | depends on you  | no              |
| Costs extra writes at command time | small                  | larger          | small           |
| Needs RESP3 support on the client  | no                     | no              | yes (7.0+)      |
```

Use notifications for best-effort cache freshness, Streams when the event itself is business data that must not be lost, and `CLIENT TRACKING` when the goal is purely to keep a client-side cache coherent.

### Production checklist before shipping

- Assert the flag string at startup and alert when `CONFIG GET notify-keyspace-events` is empty.
- Subscribe to every node in a cluster, and re-enumerate nodes after any resharding or failover event.
- Never reconstruct a deleted value from an event; treat events as hints to re-read.
- Deduplicate by key, because a burst of writes to one key produces a burst of events.
- Monitor subscriber reconnects: a silent disconnect looks exactly like an idle keyspace.
- Compare `INFO stats` `expired_keys` against events received to measure how many messages you actually dropped.

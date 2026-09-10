---
title: "Redis Pub/Sub Messaging Tutorial"
description: "A hands-on tutorial on Redis Pub/Sub messaging — PUBLISH and SUBSCRIBE, pattern matching with PSUBSCRIBE, fire-and-forget semantics, chat and notification use cases, and a complete node-redis v4 example."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Redis Pub/Sub Messaging Tutorial

## Summary

This tutorial teaches you how to build lightweight real-time messaging with Redis Pub/Sub: the `PUBLISH`, `SUBSCRIBE`, and `PSUBSCRIBE` commands, fire-and-forget delivery semantics and their limits, plus a working chat and notification system built with the official `node-redis` v4 client.

## Target Audience

- Backend and full-stack developers building chat, notifications, live feeds, or websocket backends.
- Expected level: Intermediate — comfortable with Node.js and basic Redis concepts.

## Prerequisites

- Prior knowledge: JavaScript/TypeScript basics and a working understanding of Redis data types and `redis-cli`.
- Required tools: Node.js 18+, a running Redis server (local or Docker), and `npm`.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Publish messages to channels with `PUBLISH` and receive them with `SUBSCRIBE`.
- Match multiple channels at once using glob patterns with `PSUBSCRIBE`.
- Explain why Pub/Sub is fire-and-forget and what that means for reliability.
- Build a real-time chat room and notification broadcaster with `node-redis` v4, including error handling and reconnection.
- Choose between Pub/Sub and Redis Streams based on delivery guarantees.

## Context and Motivation

Real-time features — chat messages, notifications, live scores — need instant fan-out to many consumers. Polling a database on a timer is wasteful, and a full message broker like RabbitMQ or Kafka is heavy machinery when all you need is a broadcast. Redis Pub/Sub fills this gap with a tiny command set at extremely low latency.

Its key limitation, however, is that messages are fire-and-forget: if no subscriber is listening, the message is lost forever — a trade-off that Redis Streams addresses with durable, replayable messaging and consumer groups.

## Core Content

### How Pub/Sub Works

A publisher sends a message to a named channel with `PUBLISH channel message`; subscribers listening with `SUBSCRIBE channel` receive it in real time. Redis fans the message out to every connected subscriber of that channel and then drops it — nothing is stored. Delivery is fire-and-forget: the publisher never waits for acknowledgment, and a disconnected or slow subscriber simply misses messages. This yields very high throughput and low latency, but makes Pub/Sub the wrong tool for queues, jobs, or anything that cannot tolerate loss.

### Channel Patterns with PSUBSCRIBE

A channel is just a string such as `chat:room:42` or `notify:email`. Subscribers can listen to many channels at once with glob patterns: `PSUBSCRIBE chat:*` matches `chat:room:1`, `chat:room:42`, and `chat:general`; `PSUBSCRIBE notify.*` matches any channel beginning with `notify.`. Pattern messages include both the matched pattern and the concrete channel, so your handler knows exactly what fired. Inspect activity with `PUBSUB CHANNELS [pattern]` and `PUBSUB NUMSUB channel`.

## Code Examples

Install the promise-based v4 client:

```bash
npm install redis
```

### Subscriber with Channel and Pattern Subscriptions

```javascript
// subscriber.js — listens on chat:general and chat:room:* with reconnection
import { createClient } from 'redis';

const subscriber = createClient({
  url: 'redis://localhost:6379',
  socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3000) }
});
subscriber.on('error', (err) => console.error('Subscriber error:', err.message));

async function main() {
  try {
    await subscriber.connect();
    await subscriber.subscribe('chat:general', (message, channel) => {
      console.log(`[${channel}] ${message}`);
    });
    await subscriber.pSubscribe('chat:room:*', (message, channel) => {
      console.log(`[pattern] ${channel}: ${message}`);
    });
    console.log('Listening on chat:general and chat:room:* — press Ctrl+C to exit.');
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await subscriber.quit();
  process.exit(0);
});

main();
```

### Publisher

```javascript
// publisher.js — publishes a message and reports how many clients received it
import { createClient } from 'redis';

const publisher = createClient({ url: 'redis://localhost:6379' });
publisher.on('error', (err) => console.error('Publisher error:', err.message));

async function main() {
  try {
    await publisher.connect();
    const room = process.argv[2] || 'chat:general';
    const message = process.argv.slice(3).join(' ') || 'Hello from node-redis!';
    const recipients = await publisher.publish(room, message);
    console.log(`Published to "${room}" — ${recipients} subscriber(s) received it.`);
    await publisher.quit();
  } catch (err) {
    console.error('Publish failed:', err.message);
    await publisher.quit();
    process.exit(1);
  }
}

main();
```

```bash
# Terminal 1 — run with Redis up (local or Docker)
node subscriber.js
# Terminal 2 — messages show in Terminal 1; publisher prints recipient count
node publisher.js chat:general "Hello world"
node publisher.js chat:room:42 "anyone here?"
```

### Notification Broadcaster with Pattern Matching

Pattern subscriptions shine when targets are dynamic — a single subscriber can serve every user's notification channel without server-side registry code:

```javascript
// notifications.js — delivers JSON payloads to per-user channels
import { createClient } from 'redis';

const subscriber = createClient({ url: 'redis://localhost:6379' });
subscriber.on('error', (err) => console.error(err.message));

async function main() {
  try {
    await subscriber.connect();
    await subscriber.pSubscribe('notify:user:*', (payload, channel) => {
      const userId = channel.split(':').pop();
      // e.g. channel "notify:user:12" -> push via SSE/websocket to user 12
      console.log(`Deliver to user ${userId}: ${payload}`);
    });
    console.log('Broadcasting to all users via notify:user:*');
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

main();
```

```bash
redis-cli publish notify:user:12 '{"type":"like","from":"alice"}'
```

## Key Insights

- **Fire-and-forget is the core trade-off**: messages are never stored, so only publish ephemeral data (live feeds, presence, transient alerts). For durable work, use Redis Streams (`XADD`/`XREAD`) or a queue.
- **Graceful shutdown**: call `subscriber.quit()` on exit; always attach an `error` listener and a `reconnectStrategy` — node-redis v4 throws on unhandled connection failures.
- **One connection per role**: a connection is either fully in subscriber mode or normal mode — use separate clients (or `duplicate()`) for publishing and subscribing.
- **Scale-out is trivial**: any number of app instances can subscribe to the same channel and all receive every message. If instead you need each message handled by exactly one worker, you need Streams consumer groups, not Pub/Sub.
- **Pattern overhead**: `PSUBSCRIBE` scans the pattern space per published message — keep patterns few and specific, not many overlapping ones.

## Next Steps

- Learn durable, replayable messaging in the Redis Streams tutorial, the natural upgrade path: `redis-streams-event-driven-architecture`.
- Study the [node-redis Pub/Sub docs](https://redis.js.org/) for `duplicate()`, `unsubscribe`/`pUnsubscribe`, and buffer modes.

## Conclusion

You now understand the complete Redis Pub/Sub model: publishing and subscribing to channels, matching them with patterns, the fire-and-forget semantics that make it fast but lossy, and how to build chat rooms and notification fan-out with `node-redis` v4 — plus when to graduate to Redis Streams. With the publisher and subscriber scripts running in two terminals, you have a working real-time messaging foundation you can extend into production services.

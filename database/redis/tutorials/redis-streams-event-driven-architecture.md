---
title: "Building an Event-Driven System with Redis Streams"
description: "A comprehensive tutorial on Redis Streams — mastering consumer groups, message acknowledgment, event sourcing patterns, and building a production-ready event-driven notification system with ioredis and Node.js."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building an Event-Driven System with Redis Streams

## Summary

Redis Streams is a powerful data structure introduced in Redis 5.0 that enables reliable, persistent, and scalable event streaming. Unlike Pub/Sub — where messages are ephemeral and lost if no consumer is connected — Streams persist messages on disk, support consumer groups for workload distribution, and provide explicit acknowledgment semantics for exactly-once processing. This tutorial walks through the Streams data model, consumer group mechanics, message acknowledgment and delivery guarantees, and a complete event-driven notification system built with ioredis and Node.js.

## Target Audience

- Backend Developers, Fullstack Developers, and DevOps engineers.
- Intermediate level. Basic familiarity with Redis (core data types) and Node.js is assumed.

## Prerequisites

- Redis 5.0 or later installed (local, Docker, or cloud instance).
- Node.js 18 or later and npm installed.
- Basic knowledge of Redis CLI commands and the ioredis library.
- Understanding of asynchronous programming with Node.js (async/await, Promises).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Understand the Redis Streams data model: entries, IDs, and fields.
- Create and consume streams using Redis CLI and ioredis.
- Implement consumer groups for distributed message processing.
- Handle message acknowledgment, pending entries, and failure recovery.
- Compare Streams with Pub/Sub and traditional message queues.
- Build a complete event-driven notification system with multiple consumer workers.

## Context and Motivation

Traditional message queuing systems like RabbitMQ and Apache Kafka provide robust event streaming capabilities but introduce significant operational complexity. Redis Streams bridges this gap by offering a lightweight, Redis-native streaming solution that inherits Redis's simplicity, sub-millisecond latency, and minimal configuration overhead.

Consider a typical e-commerce platform: when a user places an order, multiple downstream services need to react — sending a confirmation email, updating inventory, notifying the warehouse, and processing payment. Without a streaming layer, each service must poll the database or coordinate through tight API couplings. With Redis Streams, the order service writes a single event to a stream, and multiple consumer groups process it independently and reliably.

Redis Streams are particularly well-suited for:
- **Event-driven microservices**: Decouple producers and consumers with persistent, replayable event logs.
- **Job queues**: Distribute work across multiple workers with guaranteed processing.
- **Activity feeds**: Maintain ordered, time-series event logs for auditing or feed generation.
- **Real-time analytics**: Stream metrics and events to aggregation pipelines.

## Core Content

### Understanding the Stream Data Structure

A Redis Stream is an append-only log of entries. Each entry has a unique ID (automatically generated as `<timestamp>-<sequenceNumber>`) and a list of field-value pairs, similar to a Redis Hash.

```text
Stream: orders
─────────────────────────────────────
ID                    Fields
─────────────────────────────────────
1719500001000-0    → orderId: "ORD-001", userId: "usr_42", amount: 99.95
1719500002000-0    → orderId: "ORD-002", userId: "usr_17", amount: 149.50
1719500003000-0    → orderId: "ORD-003", userId: "usr_88", amount: 25.00
─────────────────────────────────────
```

Each ID is composed of a millisecond-precision timestamp and a sequence number, ensuring global ordering even within the same millisecond. The stream grows indefinitely, and you can trim it by length or by time.

### Working with Streams in the CLI

Add entries to a stream with `XADD`:

```bash
XADD orders * orderId "ORD-001" userId "usr_42" amount 99.95
```

The `*` tells Redis to auto-generate the ID. Read entries with `XRANGE`:

```bash
# Read all entries
XRANGE orders - +

# Read entries from a specific ID onward
XRANGE orders 1719500001000-0 +

# Read the last N entries
XREVRANGE orders + - COUNT 5
```

Get the length of a stream:

```bash
XLEN orders
```

### Consumer Groups: Distributed Processing

Consumer groups are the heart of reliable stream processing. They allow multiple consumers to cooperate in processing a stream, with Redis tracking which messages each consumer has processed.

```bash
# Create a consumer group
XGROUP CREATE orders email-group $

# The $ means "start from the end" (new messages only)
# Use 0 to process all existing messages from the beginning
```

Consumers within a group automatically distribute messages among themselves. When a consumer reads a message, Redis marks it as "pending" for that consumer:

```bash
# Consumer reads a message
XREADGROUP GROUP email-group worker-1 COUNT 1 STREAMS orders >

# The > means "read only new messages not yet delivered to any consumer"
```

After processing, the consumer acknowledges the message:

```bash
XACK orders email-group 1719500001000-0
```

### Message Acknowledgment and Pending Entries

Unacknowledged messages remain in the consumer group's pending entries list (PEL). This is the foundation of Redis Streams' reliability guarantee:

```bash
# View pending messages
XPENDING orders email-group

# Inspect specific pending entries
XPENDING orders email-group - + 10

# Claim pending messages from a failed consumer
XCLAIM orders email-group worker-2 60000 1719500001000-0
```

The `XCLAIM` command transfers ownership of a pending message to another consumer after a minimum idle time (60 seconds in the example above). This enables dead-letter handling and recovery from consumer crashes.

### Stream Trimming

Streams grow unbounded by default. Use `XTRIM` or the `MAXLEN` option with `XADD` to cap the stream:

```bash
# Keep only the latest 1000 entries
XTRIM orders MAXLEN 1000

# Trim with ~ for near-exact trimming (more efficient)
XTRIM orders MAXLEN ~ 1000
```

The tilde (`~`) tells Redis to trim only when it is efficient to do so, trading exact length for better performance.

### Blocking Reads

Consumers can block and wait for new stream data, eliminating the need for polling:

```bash
# Block for up to 5 seconds, reading 10 messages at a time
XREADGROUP GROUP email-group worker-1 COUNT 10 BLOCK 5000 STREAMS orders >
```

A `BLOCK` value of `0` means block indefinitely. Blocking reads are the recommended pattern for consumer workers.

## Code Examples

### Setting Up the Project

```bash
mkdir redis-streams-notification-system
cd redis-streams-notification-system
npm init -y
npm install ioredis dotenv
```

### Producing Events — Order Service

```javascript
// producer.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const STREAM_KEY = 'orders';

async function placeOrder(order) {
  const entryId = await redis.xadd(
    STREAM_KEY,
    '*',
    'orderId', order.orderId,
    'userId', order.userId,
    'email', order.email,
    'amount', String(order.amount),
    'items', JSON.stringify(order.items),
    'timestamp', new Date().toISOString(),
  );
  console.log(`Order placed: ${order.orderId} (entry: ${entryId})`);
  return entryId;
}

async function main() {
  const orders = [
    { orderId: 'ORD-001', userId: 'usr_42', email: 'alice@example.com', amount: 99.95, items: [{ sku: 'WIDGET-A', qty: 2 }] },
    { orderId: 'ORD-002', userId: 'usr_17', email: 'bob@example.com', amount: 149.50, items: [{ sku: 'GADGET-B', qty: 1 }] },
    { orderId: 'ORD-003', userId: 'usr_88', email: 'carol@example.com', amount: 25.00, items: [{ sku: 'WIDGET-A', qty: 1 }] },
  ];

  for (const order of orders) {
    await placeOrder(order);
  }

  await redis.quit();
}

main().catch(console.error);
```

### Consumer Worker — Email Notification Service

```javascript
// consumer-email.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const STREAM_KEY = 'orders';
const GROUP_NAME = 'email-notification-group';
const CONSUMER_NAME = `worker-email-${process.pid}`;

async function sendEmail(userId, email, orderId) {
  // Simulate sending an email (2-3 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));
  console.log(`[EMAIL] Confirmation sent to ${email} for order ${orderId}`);
}

async function processOrder(entry) {
  const [entryId, fields] = entry;
  const data = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1];
  }

  console.log(`[${CONSUMER_NAME}] Processing order ${data.orderId} for ${data.email}`);

  try {
    await sendEmail(data.userId, data.email, data.orderId);
    await redis.xack(STREAM_KEY, GROUP_NAME, entryId);
    console.log(`[${CONSUMER_NAME}] Acknowledged ${entryId} — email sent`);
  } catch (err) {
    console.error(`[${CONSUMER_NAME}] Failed to process ${entryId}:`, err.message);
    // Message stays in PEL — another consumer can claim it after timeout
  }
}

async function main() {
  // Create consumer group (ignore error if it already exists)
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$');
    console.log(`Created consumer group: ${GROUP_NAME}`);
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      throw err;
    }
    console.log(`Consumer group ${GROUP_NAME} already exists`);
  }

  console.log(`${CONSUMER_NAME} started, waiting for orders...`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const results = await redis.xreadgroup(
        'GROUP', GROUP_NAME, CONSUMER_NAME,
        'COUNT', 5,
        'BLOCK', 5000,
        'STREAMS', STREAM_KEY,
        '>',
      );

      if (!results) {
        // No new messages within the BLOCK timeout
        continue;
      }

      for (const [, entries] of results) {
        for (const entry of entries) {
          await processOrder(entry);
        }
      }
    } catch (err) {
      console.error(`[${CONSUMER_NAME}] Error in read loop:`, err.message);
      // Wait before retrying to avoid tight error loops
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

main().catch(console.error);
```

### Running Multiple Consumer Workers

Open multiple terminals and run:

```bash
# Terminal 1 — Producer
node producer.js

# Terminal 2 — Consumer Worker 1
node consumer-email.js

# Terminal 3 — Consumer Worker 2
node consumer-email.js
```

Each worker automatically receives a fair share of messages. When one worker crashes mid-processing, its pending messages become claimable by other workers after the idle timeout.

### Claiming Pending Messages — Recovery Worker

```javascript
// recovery-worker.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const STREAM_KEY = 'orders';
const GROUP_NAME = 'email-notification-group';
const CLAIM_CONSUMER = 'worker-recovery';
const MIN_IDLE_MS = 60000; // Claim messages idle for 60+ seconds
const BATCH_SIZE = 10;

async function main() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$');
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) throw err;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Check for pending messages that are idle (consumer likely crashed)
    const pending = await redis.xpending(STREAM_KEY, GROUP_NAME, '-', '+', BATCH_SIZE);

    if (pending && pending.length > 0) {
      for (const entry of pending) {
        const [entryId, consumer, idleMs] = entry;
        if (idleMs >= MIN_IDLE_MS) {
          console.log(`Claiming stale entry ${entryId} from ${consumer} (idle: ${idleMs}ms)`);
          await redis.xclaim(STREAM_KEY, GROUP_NAME, CLAIM_CONSUMER, MIN_IDLE_MS, entryId);
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}

main().catch(console.error);
```

### Consumer Group Monitoring

```javascript
// monitor.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

async function main() {
  const streamKey = process.argv[2] || 'orders';

  const info = await redis.xinfo('GROUPS', streamKey);
  console.log(`Consumer groups for stream "${streamKey}":`);
  console.log('─'.repeat(60));

  for (const group of info) {
    const [name, consumers, pending, lastDelivered] = group;
    console.log(`\nGroup: ${name}`);
    console.log(`  Consumers:      ${consumers}`);
    console.log(`  Pending:        ${pending}`);
    console.log(`  Last Delivered: ${lastDelivered}`);

    if (consumers > 0) {
      const consumerInfo = await redis.xinfo('CONSUMERS', streamKey, name);
      for (const c of consumerInfo) {
        const [cName, cPending, cIdle, cInactive] = c;
        console.log(`  └─ ${cName}: pending=${cPending}, idle=${cIdle}ms`);
      }
    }
  }

  await redis.quit();
}

main().catch(console.error);
```

## Key Insights

- **Streams persist; Pub/Sub does not**: Use Streams when delivery guarantees matter. Pub/Sub is suitable for fire-and-forget notifications where message loss is acceptable.
- **Consumer groups enable horizontal scaling**: Each message within a group is delivered to exactly one consumer, enabling linear scaling of processing capacity.
- **Pending Entries List (PEL) is the reliability backbone**: Unacknowledged messages remain in the PEL, enabling recovery from consumer crashes. Monitor PEL size — a growing PEL indicates processing bottlenecks or failed consumers.
- **Acknowledge after processing, not before**: Always call `XACK` after the side effect (email sent, database updated) completes. Acknowledging before processing creates a window for data loss.
- **Use `MAXLEN ~` for efficient trimming**: The approximate trimming mode avoids the O(N) overhead of exact trimming and is safe for production use.
- **Consumer naming**: Use stable consumer names (e.g., `worker-email-hostname-pid`) so that the same physical consumer is recognized across restarts. Random consumer names cause PEL fragmentation.
- **Dead-letter handling**: Messages that repeatedly fail should be moved to a separate dead-letter stream using `XCLAIM` and `XACK`, then inspected manually.

## Next Steps

- Explore the Redis Streams tutorial for more advanced patterns: [Redis Streams Documentation](https://redis.io/docs/data-types/streams-tutorial/)
- Learn about Redis Stack modules: [RedisJSON](https://redis.io/docs/data-types/json/) for document storage alongside streams
- Study the [Redis Development Syllabus](/database/redis/syllabi/redis-development-syllabus) for a structured learning path
- Compare Redis Streams with Apache Kafka for high-throughput event sourcing

## Conclusion

Redis Streams provide a powerful, lightweight alternative to dedicated message queuing systems, combining Redis's operational simplicity with robust stream processing capabilities. You have learned how to create and manage streams, implement consumer groups for distributed processing, handle message acknowledgment and recovery, and build a complete event-driven notification system with ioredis. These patterns form the foundation for building resilient, scalable event-driven architectures with Redis.

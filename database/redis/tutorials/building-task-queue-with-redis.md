---
title: "Building a Task Queue with Redis"
description: "A hands-on tutorial on building a reliable task queue with Redis lists and sorted sets — covering FIFO queues, blocking workers, delayed tasks, retry logic, queue monitoring, and a complete Node.js implementation."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Task Queue with Redis

## Summary

Task queues are a fundamental building block in modern application architecture — they decouple request processing from background work, absorb traffic spikes, and enable reliable asynchronous execution. Redis, with its lightweight list data structures and built-in blocking operations, provides an excellent foundation for building custom task queues without the operational overhead of dedicated queue systems like RabbitMQ or Amazon SQS. This tutorial walks through implementing a production-ready task queue using Redis lists, starting with the classic FIFO pattern using LPUSH and BRPOP, then adding reliability with BRPOPLPUSH backup lists, delayed task scheduling with sorted sets, retry logic with exponential backoff, and health monitoring — all with a complete Node.js implementation powered by the ioredis library.

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

- Implement a FIFO task queue using Redis lists (LPUSH + BRPOP).
- Build reliable queues with BRPOPLPUSH for crash recovery.
- Create worker processes with graceful shutdown and configurable concurrency.
- Schedule delayed tasks using Redis sorted sets.
- Implement retry logic with exponential backoff and dead-letter queues.
- Monitor queue depth, processing rates, and worker health.
- Understand the trade-offs between Redis-based queues and dedicated message brokers.

## Context and Motivation

In every non-trivial application, certain operations cannot execute synchronously within an HTTP request-response cycle: sending confirmation emails, processing image uploads, generating PDF reports, synchronizing data with external APIs, or running nightly batch jobs. These tasks demand asynchronous execution — but they also require guarantees. If the server crashes mid-operation, the task should not be lost. If a downstream API is slow, other tasks should not be blocked. If a task fails transiently, it should be retried rather than abandoned.

Production systems often turn to dedicated message brokers — RabbitMQ, Apache Kafka, Amazon SQS — to address these requirements. These are powerful tools, but they introduce significant operational complexity: cluster management, configuration tuning, client library maintenance, and infrastructure cost. For many applications — particularly startups, side projects, and internal tools — this overhead is disproportionate to the actual queueing needs.

Redis strikes a compelling middle ground. Its list data structure is a natural fit for FIFO queues: LPUSH enqueues from one end, BRPOP dequeues from the other with blocking semantics that eliminate busy-waiting. Its sorted sets can schedule delayed tasks with millisecond precision. Its built-in persistence, replication, and high-availability (Sentinel, Cluster) provide the durability guarantees that production queues require. And since many applications already use Redis for caching and session storage, adding queueing capabilities introduces zero new infrastructure.

This tutorial builds a task queue incrementally — starting simple, then layering on reliability features as real-world requirements emerge.

## Core Content

### Understanding Redis Lists as Queues

Redis lists are linked-list data structures optimized for operations at both ends. Six commands form the foundation of list-based queues:

| Command | Operation | Time Complexity |
|---------|-----------|-----------------|
| `LPUSH key value [value ...]` | Insert one or more values at the head | O(1) per value |
| `RPUSH key value [value ...]` | Insert one or more values at the tail | O(1) per value |
| `LPOP key` | Remove and return the first element | O(1) |
| `RPOP key` | Remove and return the last element | O(1) |
| `BLPOP key [key ...] timeout` | Blocking LPOP — waits for element | O(1) |
| `BRPOP key [key ...] timeout` | Blocking RPOP — waits for element | O(1) |

For a FIFO (first-in, first-out) queue, the producer pushes to the tail (RPUSH) and the consumer pops from the head (BLPOP). This ensures tasks are processed in the order they were submitted.

### FIFO Queue Pattern with RPUSH and BLPOP

The simplest Redis queue uses just two commands:

```text
Producer → RPUSH queue:task "send-email"
Consumer → BLPOP queue:task 0
```

The `0` timeout means block indefinitely until an element is available. The consumer stays idle, consuming almost zero resources, and wakes instantly when a task arrives. This is far more efficient than polling with a sleep loop.

Here is the minimal producer:

```javascript
// producer.js — enqueue tasks
const Redis = require('ioredis');
const redis = new Redis();

async function enqueue(queue, task) {
  await redis.rpush(queue, JSON.stringify(task));
}

// Usage
await enqueue('queue:tasks', {
  type: 'send_email',
  to: 'user@example.com',
  template: 'welcome'
});
```

And the minimal consumer:

```javascript
// worker.js — blocking consumer
const Redis = require('ioredis');
const redis = new Redis();

async function startWorker(queue) {
  while (true) {
    const result = await redis.blpop(queue, 0);
    const task = JSON.parse(result[1]);
    await processTask(task);
  }
}

async function processTask(task) {
  console.log(`Processing: ${task.type}`);
  // Execute the task...
}
```

This pattern works, but it has a critical flaw: if the worker crashes after `blpop` removes the task from the queue but before `processTask` completes, the task is **permanently lost**. The next section addresses this with the BRPOPLPUSH reliability pattern.

### Building a Reliable Queue with BRPOPLPUSH

Redis provides the `BRPOPLPUSH` command (and its blocking variant `BLMOVE` in Redis 6.2+) that atomically pops from one list and pushes to another. This enables a **backup list** pattern: popped tasks are moved to a processing list before execution, ensuring they can be recovered if the worker crashes.

```javascript
async function startReliableWorker(queue, processing) {
  while (true) {
    // Atomically move from queue to processing list (block until available)
    const result = await redis.blpop(queue, 0);
    const taskJson = result[1];

    // Push to processing list via lpush
    await redis.lpush(processing, taskJson);

    try {
      const task = JSON.parse(taskJson);
      await executeTask(task);
      // Success — remove from processing list
      await redis.lrem(processing, 1, taskJson);
    } catch (err) {
      // Failure — remove from processing and handle retry
      await redis.lrem(processing, 1, taskJson);
      await handleFailure(taskJson, err);
    }
  }
}
```

With `BRPOPLPUSH` (or `BLMOVE`), the move is atomic — the element is popped from the source and pushed to the destination in a single operation. If the worker dies after the move, the task remains in the processing list and can be recovered by a recovery process on restart:

```javascript
// recover.js — reclaim orphaned tasks on worker startup
async function recoverOrphaned(source, processing) {
  while (true) {
    const orphaned = await redis.rpoplpush(processing, source);
    if (!orphaned) break;
    console.log(`Recovered orphaned task: ${orphaned}`);
  }
}
```

**Important**: `BRPOPLPUSH` provides **at-least-once** delivery semantics. A task may be processed more than once if the worker crashes after completing the task but before removing it from the processing list. Tasks should be designed to be idempotent.

### Delayed Tasks with Sorted Sets

Many workloads require delayed execution: retry a failed task after 30 seconds, schedule a welcome email 24 hours after signup, or defer non-urgent processing to off-peak hours. Redis sorted sets provide an elegant solution.

The pattern uses a sorted set as a delay queue, with the task serialized as the member and the scheduled timestamp as the score:

```javascript
// schedule a task for future execution
async function scheduleDelayed(queue, task, delayMs) {
  const executeAt = Date.now() + delayMs;
  await redis.zadd(queue, executeAt, JSON.stringify(task));
}

// poll for due tasks and move them to the processing queue
async function processDelayedQueue(delayedQueue, workQueue) {
  while (true) {
    const now = Date.now();
    // Atomically retrieve and remove all tasks with score <= now
    const tasks = await redis.zrangebyscore(delayedQueue, 0, now);

    if (tasks.length > 0) {
      // Remove them from the sorted set
      await redis.zremrangebyscore(delayedQueue, 0, now);

      for (const taskJson of tasks) {
        await redis.rpush(workQueue, taskJson);
      }
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

For higher precision, combine polling with the sorted set's count command to check queue depth, and adjust the poll interval dynamically:

```javascript
async function smartPoll(delayedQueue, workQueue, minInterval = 200, maxInterval = 5000) {
  while (true) {
    const now = Date.now();

    // Peek at the earliest task
    const next = await redis.zrange(delayedQueue, 0, 0, 'WITHSCORES');
    if (next.length === 2) {
      const nextTime = parseInt(next[1], 10);
      const waitFor = Math.min(Math.max(nextTime - now, minInterval), maxInterval);

      if (nextTime <= now) {
        const tasks = await redis.zrangebyscore(delayedQueue, 0, now);
        await redis.zremrangebyscore(delayedQueue, 0, now);
        for (const task of tasks) {
          await redis.rpush(workQueue, task);
        }
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, waitFor));
    } else {
      await new Promise(resolve => setTimeout(resolve, maxInterval));
    }
  }
}
```

### Retry Logic and Error Handling

Failures are inevitable in distributed systems. A production queue must distinguish between transient failures (network timeouts, temporary API unavailability) and permanent failures (invalid input, business rule violations).

#### Retry Queue with Exponential Backoff

Use a sorted set for retry scheduling, with increasing delays between attempts:

```javascript
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // 1 second base delay

async function handleFailure(taskJson, error, attempt = 1) {
  const task = JSON.parse(taskJson);

  if (attempt >= MAX_RETRIES) {
    // Permanent failure — move to dead-letter queue
    await redis.rpush('queue:dead-letter', taskJson);
    console.error(`Task permanently failed after ${attempt} attempts:`, task.type);
    return;
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  task._retryAttempt = attempt + 1;
  task._lastError = error.message;

  const executeAt = Date.now() + delay;
  await redis.zadd('queue:retry', executeAt, JSON.stringify(task));
  console.log(`Scheduled retry ${attempt + 1} for ${task.type} in ${delay}ms`);
}
```

#### Dead-Letter Queue

Tasks that exceed the maximum retry count move to a dead-letter queue (DLQ) for manual inspection or alerting:

```javascript
// dlq-monitor.js — dead-letter queue processor
async function monitorDeadLetter() {
  while (true) {
    const deadTask = await redis.blpop('queue:dead-letter', 0);
    const task = JSON.parse(deadTask[1]);

    console.error('DEAD LETTER:', {
      type: task.type,
      attempts: task._retryAttempt,
      lastError: task._lastError,
      timestamp: new Date().toISOString()
    });

    // Optionally alert: send to Slack, PagerDuty, etc.
  }
}
```

#### Distinguishing Failure Types

Not all errors should trigger a retry. Classify errors by type:

```javascript
class TransientError extends Error {
  constructor(message) { super(message); this.name = 'TransientError'; }
}

class PermanentError extends Error {
  constructor(message) { super(message); this.name = 'PermanentError'; }
}

async function executeTask(task) {
  try {
    switch (task.type) {
      case 'send_email':
        await sendEmail(task.to, task.template);
        break;
      case 'process_image':
        await processImage(task.url);
        break;
      default:
        throw new PermanentError(`Unknown task type: ${task.type}`);
    }
  } catch (error) {
    if (error instanceof PermanentError) {
      // Immediately send to DLQ without retry
      await redis.rpush('queue:dead-letter', JSON.stringify({ ...task, _error: error.message }));
      return;
    }
    throw error; // Transient errors propagate to the retry handler
  }
}
```

### Monitoring Queue Health

A queue without observability is a black box. Track these metrics using Redis key patterns:

**Queue Depth**: The length of the work queue reveals backlog pressure.

```javascript
async function getQueueDepth(queue) {
  return await redis.llen(queue);
}
```

**Processing Rate**: Track how many tasks complete per minute using a sorted set with minute-granularity timestamps.

```javascript
async function recordProcessed(taskType) {
  const minute = Math.floor(Date.now() / 60000);
  await redis.zincrby('metrics:processed', 1, `${taskType}:${minute}`);
}

async function getProcessingRate(taskType, minutesBack = 5) {
  const now = Math.floor(Date.now() / 60000);
  const start = now - minutesBack;
  const results = await redis.zrangebyscore('metrics:processed', start, now, 'WITHSCORES');
  const rate = {};
  for (let i = 0; i < results.length; i += 2) {
    if (results[i].startsWith(taskType)) {
      rate[results[i]] = parseInt(results[i + 1], 10);
    }
  }
  return rate;
}
```

**Worker Heartbeat**: Workers periodically update a key with TTL to signal liveness.

```javascript
async function workerHeartbeat(workerId, ttlSeconds = 30) {
  await redis.set(`worker:heartbeat:${workerId}`, Date.now(), 'EX', ttlSeconds);
}

async function getLiveWorkers() {
  const keys = await redis.keys('worker:heartbeat:*');
  const workers = [];
  for (const key of keys) {
    const heartbeat = await redis.get(key);
    workers.push({ id: key.replace('worker:heartbeat:', ''), lastSeen: parseInt(heartbeat, 10) });
  }
  return workers;
}
```

### Graceful Shutdown

Worker processes must drain in-flight tasks before shutting down to avoid unnecessary retries:

```javascript
async function startWorkerWithGracefulShutdown(queue, processing) {
  let shuttingDown = false;

  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    shuttingDown = true;
  });
  process.on('SIGINT', () => {
    shuttingDown = true;
  });

  while (!shuttingDown) {
    try {
      // Use a short timeout instead of blocking indefinitely
      const result = await redis.blpop(queue, 1);
      if (!result) continue;

      const taskJson = result[1];
      await redis.lpush(processing, taskJson);

      const task = JSON.parse(taskJson);
      await executeTask(task);

      await redis.lrem(processing, 1, taskJson);
      await recordProcessed(task.type);
    } catch (err) {
      console.error('Worker error:', err);
    }
  }

  console.log('Worker stopped. In-flight tasks remain in processing list.');
  process.exit(0);
}
```

## Code Examples

Below is a complete, self-contained implementation of a Redis-backed task queue. Save these files to a project directory and run them with `node <filename>.js`.

### Directory Structure

```text
redis-task-queue/
├── package.json
├── queue.js          # Core queue operations
├── worker.js         # Worker process with graceful shutdown
├── producer.js       # Task producer / enqueuer
├── delayed-worker.js # Delayed task scheduler
└── monitor.js        # Queue health monitoring
```

### package.json

```json
{
  "name": "redis-task-queue",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "ioredis": "^5.4.0"
  }
}
```

### queue.js — Core Queue Operations

```javascript
import Redis from 'ioredis';

const redis = new Redis();

// Constants
const WORK_QUEUE = 'queue:tasks';
const PROCESSING_QUEUE = 'queue:processing';
const RETRY_QUEUE = 'queue:retry';
const DEAD_LETTER_QUEUE = 'queue:dead-letter';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

// Enqueue a task
export async function enqueue(task) {
  await redis.rpush(WORK_QUEUE, JSON.stringify(task));
  return task;
}

// Poll delayed queue and move due tasks to work queue
export async function processDelayedQueue() {
  const now = Date.now();
  const due = await redis.zrangebyscore(RETRY_QUEUE, 0, now);

  if (due.length > 0) {
    await redis.zremrangebyscore(RETRY_QUEUE, 0, now);
    for (const taskJson of due) {
      await redis.rpush(WORK_QUEUE, taskJson);
    }
  }
}

// Handle task failure with exponential backoff
export async function handleFailure(taskJson, error, attempt = 1) {
  const task = JSON.parse(taskJson);

  if (attempt >= MAX_RETRIES) {
    task._finalError = error.message;
    await redis.rpush(DEAD_LETTER_QUEUE, JSON.stringify(task));
    console.error(`[DLQ] ${task.type} failed permanently after ${attempt} attempts`);
    return;
  }

  const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  task._retryAttempt = attempt + 1;
  task._lastError = error.message;
  task._scheduledAt = Date.now() + delay;

  await redis.zadd(RETRY_QUEUE, Date.now() + delay, JSON.stringify(task));
  console.log(`[RETRY] ${task.type} attempt ${attempt + 1} in ${delay}ms`);
}

// Queue metrics
export async function getQueueDepth() {
  const [tasks, processing, retry, dead] = await Promise.all([
    redis.llen(WORK_QUEUE),
    redis.llen(PROCESSING_QUEUE),
    redis.zcard(RETRY_QUEUE),
    redis.llen(DEAD_LETTER_QUEUE),
  ]);
  return { tasks, processing, retry, dead };
}

export { WORK_QUEUE, PROCESSING_QUEUE, RETRY_QUEUE, DEAD_LETTER_QUEUE };
```

### worker.js — Reliable Worker Process

```javascript
import Redis from 'ioredis';
import {
  WORK_QUEUE, PROCESSING_QUEUE,
  handleFailure, processDelayedQueue, getQueueDepth
} from './queue.js';

const redis = new Redis();
let shuttingDown = false;

process.on('SIGTERM', () => { shuttingDown = true; });
process.on('SIGINT', () => { shuttingDown = true; });

// Task execution router
async function executeTask(task) {
  switch (task.type) {
    case 'send_email':
      console.log(`Sending email to ${task.to}: ${task.subject}`);
      // Simulate work
      await new Promise(r => setTimeout(r, 500));
      break;

    case 'process_image':
      console.log(`Processing image: ${task.url}`);
      await new Promise(r => setTimeout(r, 1000));
      break;

    case 'generate_report':
      console.log(`Generating report: ${task.reportId}`);
      await new Promise(r => setTimeout(r, 2000));
      break;

    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}

// Main worker loop
async function startWorker(workerId) {
  console.log(`Worker ${workerId} started`);

  while (!shuttingDown) {
    try {
      // Poll delayed queue periodically
      await processDelayedQueue();

      // Blocking pop with 1-second timeout
      const result = await redis.blpop(WORK_QUEUE, 1);
      if (!result) continue;

      const taskJson = result[1];

      // Move to processing list for crash recovery
      await redis.lpush(PROCESSING_QUEUE, taskJson);
      const task = JSON.parse(taskJson);
      task._workerId = workerId;

      console.log(`Processing: ${task.type} (${task.id || 'no-id'})`);

      // Execute with retry context
      const attempt = task._retryAttempt || 1;
      try {
        await executeTask(task);
        // Success — remove from processing list
        await redis.lrem(PROCESSING_QUEUE, 1, taskJson);
        // Record metrics
        await redis.zincrby('metrics:processed', 1, `${task.type}`);
      } catch (err) {
        await redis.lrem(PROCESSING_QUEUE, 1, taskJson);
        await handleFailure(taskJson, err, attempt);
      }
    } catch (err) {
      console.error('Worker error:', err);
    }
  }

  console.log('Worker shut down gracefully');
  process.exit(0);
}

const workerId = process.argv[2] || `worker-${Date.now()}`;
startWorker(workerId);
```

### producer.js — Enqueuing Tasks

```javascript
import { enqueue } from './queue.js';

async function main() {
  const tasks = [
    { id: '1', type: 'send_email', to: 'alice@example.com', subject: 'Welcome!' },
    { id: '2', type: 'send_email', to: 'bob@example.com', subject: 'Your invoice' },
    { id: '3', type: 'process_image', url: 'https://example.com/photo.jpg' },
    { id: '4', type: 'generate_report', reportId: 'RPT-2026-001' },
    { id: '5', type: 'send_email', to: 'carol@example.com', subject: 'Newsletter' },
    { id: '6', type: 'unknown_task', payload: 'will fail' },
  ];

  for (const task of tasks) {
    await enqueue(task);
    console.log(`Enqueued: ${task.type} (${task.id})`);
  }

  console.log('All tasks enqueued');
  process.exit(0);
}

main();
```

### delayed-worker.js — Delayed Task Scheduler

```javascript
import Redis from 'ioredis';

const redis = new Redis();

async function scheduleTask(task, delayMs) {
  const executeAt = Date.now() + delayMs;
  await redis.zadd('queue:delayed', executeAt, JSON.stringify(task));
  console.log(`Scheduled ${task.type} in ${delayMs}ms (at ${new Date(executeAt).toISOString()})`);
}

async function main() {
  // Schedule a welcome email 10 seconds from now
  await scheduleTask(
    { id: 'd1', type: 'send_email', to: 'dave@example.com', subject: 'Welcome (delayed)' },
    10000
  );

  // Schedule a report for 30 seconds from now
  await scheduleTask(
    { id: 'd2', type: 'generate_report', reportId: 'RPT-NIGHTLY' },
    30000
  );

  console.log('Delayed tasks scheduled. Run worker.js to process them when due.');
  process.exit(0);
}

main();
```

### monitor.js — Queue Health Dashboard

```javascript
import Redis from 'ioredis';
import { getQueueDepth } from './queue.js';

const redis = new Redis();

async function showMetrics() {
  const depth = await getQueueDepth();
  const processed = await redis.zrange('metrics:processed', -10, -1, 'WITHSCORES');
  const liveWorkers = [];

  const heartbeatKeys = await redis.keys('worker:heartbeat:*');
  for (const key of heartbeatKeys) {
    const ts = await redis.get(key);
    liveWorkers.push({ id: key.replace('worker:heartbeat:', ''), lastSeen: new Date(parseInt(ts, 10)) });
  }

  console.log('\n=== Queue Metrics ===');
  console.log(`Work queue:     ${depth.tasks}`);
  console.log(`Processing:     ${depth.processing}`);
  console.log(`Retry queue:    ${depth.retry}`);
  console.log(`Dead letter:    ${depth.dead}`);
  console.log(`Live workers:   ${liveWorkers.length}`);

  if (processed.length > 1) {
    console.log('\nRecent processing:');
    for (let i = 0; i < processed.length; i += 2) {
      console.log(`  ${processed[i]}: ${processed[i + 1]}`);
    }
  }

  console.log('====================\n');
}

// Run every 5 seconds
setInterval(showMetrics, 5000);
showMetrics();
```

### Running the System

```bash
# Install dependencies
npm install ioredis

# Start a Redis instance (if not already running)
redis-server --daemonize yes

# Start the worker (in terminal 1)
node worker.js worker-1

# Enqueue tasks (in terminal 2)
node producer.js

# Schedule delayed tasks (in terminal 2)
node delayed-worker.js

# Monitor queue health (in terminal 3)
node monitor.js
```

## Key Insights

- **Redis lists are ideal for FIFO queues because LPUSH and BRPOP are both O(1) operations**, and BRPOP's blocking semantics eliminate busy-waiting. A worker using `blpop(queue, 0)` consumes near-zero CPU while idle.
- **BRPOPLPUSH (or BLMOVE) is essential for reliability** — it atomically moves tasks to a processing list, preventing data loss on worker crashes. Without it, a crash between `blpop` and task execution permanently loses the task.
- **Always design tasks to be idempotent**. Redis queues provide at-least-once delivery — a task may be processed multiple times if the worker crashes after completing the work but before removing it from the processing list. An idempotent task produces the same result regardless of how many times it executes.
- **Sorted sets enable precise delayed execution** at the cost of polling. The smart-poll pattern (checking the earliest task's timestamp to determine sleep duration) minimizes CPU waste while maintaining scheduling precision.
- **The dead-letter queue is not optional** — in production, tasks eventually fail permanently. Without a DLQ, those tasks either loop in retry indefinitely or are silently discarded. Route all permanent failures to a dedicated list and alert on its depth.
- **Exponential backoff prevents retry storms** — when a downstream service is degraded, retrying immediately at full rate only makes it worse. Multiplying the delay by 2 on each attempt (1s, 2s, 4s, 8s, 16s) gives the service time to recover.
- **Redis queues trade throughput for simplicity** — they lack routing, message deduplication, and persistent subscriptions. For workloads exceeding 10,000 tasks/second or requiring complex routing, evaluate dedicated message brokers like RabbitMQ or Kafka.

## Next Steps

- Explore the Redis Streams data structure for persistent, consumer-group-based messaging — covered in the [Redis Streams Event-Driven Architecture](redis-streams-event-driven-architecture.md) tutorial.
- Learn about Redis caching patterns and production strategies in the [Redis Caching Patterns Guide](../guides/redis-caching-patterns-guide.md).
- Study Redis Persistence and Data Durability in the [Redis Persistence Guide](../guides/redis-persistence-and-data-durability-guide.md).
- Build a complete real-time analytics dashboard using the metrics and monitoring patterns from this tutorial.

## Conclusion

Redis provides a surprisingly capable foundation for building production task queues. Starting with just two commands — RPUSH and BLPOP — you can implement a functional FIFO queue. By layering on BRPOPLPUSH for reliability, sorted sets for delayed execution, exponential-backoff retry logic, and a dead-letter queue for failure handling, you arrive at a system that meets the requirements of many real-world applications without the operational overhead of dedicated message brokers.

The trade-off is deliberate: Redis queues offer simplicity and low latency at the cost of advanced features like message routing, exactly-once delivery, and persistent subscriptions. For many teams — particularly those already running Redis for caching or session storage — this trade-off is well worth making.

---
title: "NestJS Background Jobs and Queues Guide"
description: "A comprehensive guide to building reliable background job pipelines with NestJS and BullMQ — covering queue architecture, producers and workers, retries and backoff, job scheduling, monitoring, and production operation."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# NestJS Background Jobs and Queues Guide

## Introduction

HTTP requests should return fast. Any work that takes longer than a few hundred milliseconds — sending emails, generating PDF reports, resizing images, calling third-party APIs, processing payments, or syncing data with external systems — belongs in the background. Running it inline in a request handler blocks the user experience, ties up database connections, and makes the whole API fragile under load.

A **job queue** solves this by decoupling work production from work execution. A producer adds a job description to a queue, and one or more workers pick jobs up, execute them, and report the outcome. If a worker crashes mid-job, the job is retried. If the queue grows, you add more workers. The API stays responsive, and the background work becomes observable, resumable, and independently scalable.

This guide covers the standard production stack for background processing in NestJS: **BullMQ** on top of **Redis**. You will learn the queue architecture, how to model jobs, how to build producers and workers, how to make job execution resilient, how to schedule recurring work, and how to monitor and operate queues in production.

## Best Practices

### 1. Route all background work through a queue, never through raw timers

`setTimeout`, `setInterval`, and in-process cron packages run inside your application process. When the process restarts, restarts mid-task, or scales horizontally, that work is silently lost or duplicated. A queue stores the job in Redis — an external, durable system — so the work survives process restarts, and any worker instance can pick it up.

### 2. Model jobs as small, idempotent units of work

A job should represent one indivisible task ("send password-reset email for user 42"), not a pipeline ("onboard new user" — which may involve ten steps). Keep steps separate so each can be retried independently. Wherever possible, make job execution **idempotent**: if the same job runs twice, the outcome must be identical. Idempotency is what makes retries safe.

### 3. Version your job payloads

Jobs sit in Redis and may be processed by a newer version of your code after a deploy. Never change a job's payload shape without a plan. Add an explicit `version` field (or use a job-type discriminator) and write processors that can handle at least the previous version. Treat the payload as a persisted contract, not a transient function argument.

### 4. Keep workers stateless and let BullMQ manage lifecycle

A worker should do nothing but fetch a job, execute it, and report success or failure. No in-memory side state, no own retry loops, no manual `setTimeout` before acknowledging. BullMQ handles attempts, backoff, stalled-job detection, and job states; your processor only throws on failure and returns on success.

### 5. Choose explicit retry and backoff policies per job type

The default retry behavior is rarely right for everything. A transient network call may deserve 5 attempts with exponential backoff; a job that fails validation should not be retried at all. Set `attempts`, `backoff`, and `removeOnFail` per job type, and route permanently failing jobs to a dead-letter queue or a monitoring alert so they are visible instead of retried forever.

### 6. Bound worker concurrency and tune it with metrics

`concurrency` on a processor controls how many jobs a single worker runs in parallel. Too low and throughput suffers; too high and you exhaust Redis connections, database pools, or memory. Start with a modest number (4–8 per worker), watch queue latency and worker CPU, and scale concurrency or worker count from evidence.

### 7. Separate queues by domain and priority, not by size

One shared "everything" queue couples unrelated workloads: a slow PDF-rendering job can delay time-critical email jobs. Use separate queues per domain (emails, reports, media, payments) and use BullMQ's priority support for ordering within a queue. Independent queues also let you scale worker pools per workload.

### 8. Make queue state observable from day one

You cannot operate what you cannot see. Expose the queues through Bull Board for human inspection, track queue metrics (waiting, active, delayed, failed counts) in your monitoring system, and alert on failed jobs, stalled jobs, and queue-depth growth. The cost of adding this later is far higher than building it in.

### 9. Plan for graceful shutdown and job completion

On deploy or scale-in, a worker may be holding an active job. Listen for shutdown signals, stop accepting new jobs, and give the worker time to finish the active job before the process exits, so `active` jobs are not left stranded for the stalled-job detector to reclaim.

### 10. Secure and persist Redis like the production database it is

The queue's reliability is only as good as its Redis. Run Redis with persistence enabled (AOF) for at least-weak durability, protect it with a password and network isolation, and never use a local development Redis for production queues.

## Implementation Steps

### Step 1: Install dependencies and start Redis

BullMQ requires a Redis server (version 6.2 or higher is recommended). Install Redis locally or use a managed instance, then install the NestJS packages:

```bash
npm install @nestjs/bullmq bullmq ioredis
```

```bash
# Start a local Redis server (Linux/macOS with Homebrew)
redis-server --daemonize yes
redis-cli ping
```

If you want the optional web dashboard later, also install:

```bash
npm install @bull-board/express @bull-board/api
```

### Step 2: Configure the root queue connection

Register BullMQ globally in `AppModule` with `BullModule.forRoot()`, pointing at your Redis instance. The connection options follow ioredis conventions and are reused by every queue:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
        // Keeps job data safe across brief network hiccups
        maxRetriesPerRequest: null,
      },
    }),
  ],
})
export class AppModule {}
```

`maxRetriesPerRequest: null` is important: BullMQ issues blocking commands (BRPOPLPUSH-style waits) that fail when ioredis caps retries per request, so leave it disabled.

### Step 3: Register a queue and inject the producer

Register each queue with `BullModule.registerQueue()`. The queue name is the contract your producers and workers share — it must match exactly between both sides:

```typescript
// notifications.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
```

With `BullModule.registerQueue`, the queue is injected through a token derived from the queue name (`getQueueToken('notifications')`), resolved with the `@InjectQueue()` decorator:

```typescript
// notification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType } from './notification.types';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async sendWelcomeEmail(userId: string, email: string): Promise<void> {
    await this.notificationsQueue.add('send-email', {
      userId,
      email,
      template: 'welcome',
      version: 1,
    });
  }
}
```

The job `name` (`'send-email'`) lets one queue host several job kinds, each handled by its own processor method.

### Step 4: Set per-job options deliberately

The second argument to `queue.add()` is the payload; the third is a `JobOptions` object. This is where retry policy, delay, priority, and lifecycle behavior are declared per job — not per queue:

```typescript
await this.notificationsQueue.add(
  'send-email',
  { userId, email, template: 'welcome', version: 1 },
  {
    attempts: 5,                    // retry up to 5 times
    backoff: {
      type: 'exponential',          // 2s, 4s, 8s, 16s between attempts
      delay: 2000,
    },
    removeOnComplete: { age: 3600, count: 1000 }, // keep recent results for monitoring
    removeOnFail: { age: 24 * 3600 },             // keep failures for a day
  },
);
```

Common options:

- `delay: number` — hold the job in the delayed set for at least this many milliseconds (useful for "send reminder in 24h").
- `priority: number` — lower numbers run first (1 = highest priority).
- `jobId: string` — a stable custom ID; BullMQ rejects duplicate `jobId`s, which makes job deduplication trivial.
- `attempts: number` — total execution attempts including the first.
- `backoff: { type: 'fixed' | 'exponential', delay: number }` — wait between attempts.

### Step 5: Build the worker with a processor

A worker is created with the `@Processor()` decorator; each `@Process()` method handles one job name. The processor runs outside the HTTP request lifecycle, so it must not depend on request-scoped providers:

```typescript
// notification.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';

@Processor('notifications', { concurrency: 5 })
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-email':
        return this.sendEmail(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async sendEmail(job: Job): Promise<void> {
    const { userId, email, template } = job.data;

    const start = Date.now();
    await this.mailService.send(email, template);
    await job.updateProgress(100);

    // Log the outcome for observability
    console.log(`Email sent to ${email} in ${Date.now() - start}ms (attempt ${job.attemptsMade + 1})`);
  }
}
```

`WorkerHost` + `process()` is the recommended pattern because one worker class can route any job name. Throw to mark the job failed (it will retry per the job's `attempts`/`backoff`), return to mark it completed.

### Step 6: Report progress and handle long-running work

For jobs that take minutes, update progress so operators can see activity, and support cancellation in long loops:

```typescript
import { Job } from 'bullmq';

export async function renderReport(job: Job): Promise<string> {
  const total = job.data.rows.length;
  const chunks: string[] = [];

  for (let i = 0; i < total; i += 100) {
    // Check whether the job was cancelled or removed while we worked
    if (await job.isWaiting() === false && job.isActive() === false) {
      throw new Error('Job no longer active — aborting');
    }

    const chunk = await renderChunk(job.data.rows.slice(i, i + 100));
    chunks.push(chunk);
    await job.updateProgress(Math.round((i / total) * 100));
  }

  return chunks.join('\n');
}
```

Call `job.updateProgress(0–100)` sparingly — every call writes to Redis, so update at coarse intervals, not per row.

### Step 7: Schedule recurring jobs

BullMQ supports repeatable jobs with cron expressions or fixed intervals. Register them once at application startup (they survive worker restarts because the repeat configuration is stored in Redis):

```typescript
// cleanup.module.ts — schedules a nightly job at app bootstrap
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CleanupScheduler implements OnApplicationBootstrap {
  constructor(@InjectQueue('maintenance') private readonly maintenanceQueue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.maintenanceQueue.add(
      'purge-expired-sessions',
      { olderThanDays: 30, version: 1 },
      {
        repeat: { pattern: '0 3 * * *' }, // every day at 03:00 server time
        jobId: 'purge-expired-sessions-daily', // fixed id prevents duplicates
        removeOnComplete: true,
      },
    );
  }
}
```

Always give repeatable jobs a stable `jobId`; otherwise every deploy and every scheduler restart can add duplicate repeat entries. Changing the schedule later requires `queue.removeRepeatable()` with the old pattern.

### Step 8: Handle failures, stalls, and dead letters

A job fails when the processor throws. BullMQ then applies the job's `attempts` and `backoff`. Once attempts are exhausted the job moves to the `failed` state and stays there until `removeOnFail` cleans it up.

Listen to queue events to react to failures — log them, alert on them, or move them to a dead-letter queue (a separate queue that only stores terminal failures for inspection and replay):

```typescript
// queue-events.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('notifications', { concurrency: 5 })
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job): Promise<void> {
    // ... job execution ...
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    if (job) {
      this.logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`, error.stack);
      // Alerting integration (e.g. Sentry, PagerDuty, Slack) goes here
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`Job ${jobId} stalled — likely a worker crash; it will be retried`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} completed in ${job.finishedOn ? Date.now() - job.finishedOn : 'n/a'}ms`);
  }
}
```

A job becomes **stalled** when a worker crashes while executing it and does not renew its lock; BullMQ automatically moves stalled jobs back to `waiting` for retry. A stalled job count above zero usually means workers are dying — investigate crashes rather than assuming retries fix everything.

### Step 9: Coordinate multi-step workflows with parent-child jobs

BullMQ supports **flows** — a parent job with child jobs processed by different workers. This is the queue-native alternative to sagas for fan-out workflows (e.g., "generate report" → ["fetch data", "render charts", "compile PDF"]). Use `QueueEvents` and the `FlowProducer` class:

```typescript
// report.flow.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { FlowProducer, Queue } from 'bullmq';

@Injectable()
export class ReportFlowService {
  private readonly flow = new FlowProducer({
    connection: { host: 'localhost', port: 6379 },
  });

  constructor(@InjectQueue('reports') private readonly reportsQueue: Queue) {}

  async enqueueReport(reportId: string): Promise<void> {
    await this.flow.add({
      name: 'compile-report',
      queueName: 'reports',
      data: { reportId, version: 1 },
      children: [
        { name: 'fetch-report-data', queueName: 'reports-data', data: { reportId } },
        { name: 'render-charts', queueName: 'reports-charts', data: { reportId } },
      ],
    });
  }
}
```

The parent job starts only after all children complete, and their results are attached to the parent's job data (`job.data.childrenValues` in the parent processor). Keep flows shallow — deep parent-child trees are hard to reason about and harder to debug.

### Step 10: Monitor, alert, and operate in production

Add the Bull Board dashboard to inspect queues from the browser, using `@bull-board/express` with the NestJS adapter:

```typescript
// bull-board.module.ts
import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'notifications',
      adapter: BullMQAdapter,
    }),
  ],
})
export class QueueDashboardModule {}
```

```text
Production queue monitoring checklist
| Metric            | Where to watch            | Alert when                              |
|-------------------|---------------------------|-----------------------------------------|
| waiting count     | Bull Board / BullMQ stats | grows over minutes without workers      |
| active count      | Bull Board / BullMQ stats | exceeds worker concurrency for a while  |
| failed count      | Bull Board / failed list  | any permanently failed job              |
| stalled count     | Bull Board / events       | greater than zero for several minutes   |
| job latency       | custom timing events      | p95 completion time exceeds SLO         |
| Redis memory      | Redis INFO / provider UI  | approaches maxmemory                     |
```

Operational checklist:

- Export `QUEUE_NAME`, `ACTIVE`, `WAITING`, `FAILED`, and `STALLED` counters to Prometheus/DataDog and alert on the row that matters to your SLO.
- Deploy new processor code **before** removing old code — jobs in flight or delayed may still carry old payload shapes. Rolling deploys that keep the previous version around for one job lifetime avoid deserialization failures.
- On worker shutdown, call `worker.close()` in `onModuleDestroy` (NestJS does this automatically for processors created by `@nestjs/bullmq`), and stop accepting new jobs before draining active ones.
- If you scale to high throughput, use a dedicated Redis instance for queues rather than sharing one with your cache — queue load patterns (blocking commands, large payloads) can starve cache traffic.

### Step 11: Test queues with real Redis

Queue tests are integration tests: you need a live Redis (use a throwaway database via `SELECT`, or a Dockerized Redis per test run). Never mock the queue in tests that exercise job processing — a full integration test that adds a job, runs the worker, and asserts the side effect is the only trustworthy check:

```typescript
// notification.processor.spec.ts
import { Test } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationProcessor } from './notification.processor';
import { MailService } from './mail.service';

describe('NotificationProcessor', () => {
  let queue: Queue;
  let mailService: { send: jest.Mock };

  beforeEach(async () => {
    mailService = { send: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ connection: { host: 'localhost', port: 6379, db: 15 } }),
        BullModule.registerQueue({ name: 'notifications' }),
      ],
      providers: [
        NotificationProcessor,
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    queue = moduleRef.get(getQueueToken('notifications'));
    await queue.obliterate({ force: true }); // clean slate per test
  });

  afterAll(async () => {
    await queue.close();
  });

  it('sends the email when a send-email job is processed', async () => {
    await queue.add('send-email', { userId: 'u1', email: 'a@b.co', template: 'welcome', version: 1 });
    await new Promise((resolve) => setTimeout(resolve, 300)); // let the worker run

    expect(mailService.send).toHaveBeenCalledWith('a@b.co', 'welcome');
  });
});
```

Use a dedicated Redis database number (`db: 15` above) for tests and `await queue.obliterate({ force: true })` in `beforeEach` so tests never interfere with each other or with dev data.

## Keep the pipeline boring

Background processing rewards boring, predictable systems: explicit job contracts, conservative concurrency, visible metrics, and retry policies that fail loudly instead of looping quietly. Start with one queue, one processor, and a dashboard; add flows, priorities, and per-domain queues only when the metrics tell you they are needed.

# Handling Background Jobs and Task Queues in Express JS

## Ringkasan Singkat

This tutorial explores how to handle long-running tasks in an Express JS application using background jobs and task queues. By delegating heavy operations like email sending, image processing, or data imports to a background worker, you can maintain a fast, responsive API and avoid blocking the main Node.js event loop.

---

## Untuk Siapa Materi Ini

* **Target pembaca:** Backend developers, Express JS engineers, and API designers.
* **Level pembaca:** Intermediate.

---

## Prasyarat

* Basic understanding of Express JS and Node.js.
* Familiarity with the Node.js event loop and asynchronous programming.
* Basic knowledge of Redis (used as a backing store for many queue libraries).

---

## Tujuan Belajar

Setelah membaca materi ini, pembaca akan memahami:

* Why blocking the Node.js event loop with synchronous or long-running tasks is problematic.
* What background jobs and task queues are and when to use them.
* How to implement a robust task queue using BullMQ and Redis in an Express app.
* Best practices for structuring workers, handling failed jobs, and retrying tasks.

---

## Konteks dan Motivasi

Node.js is single-threaded and uses an event-driven, non-blocking I/O model. While this makes Express extremely efficient at handling thousands of concurrent requests, it also means that executing CPU-intensive tasks or slow third-party API calls directly within a route handler will block the event loop. When the event loop is blocked, your application cannot process any other incoming requests, leading to poor performance and timeouts.

Background jobs solve this by moving the heavy lifting outside the main API thread. Instead of processing the task immediately, the Express app quickly pushes a "job" onto a queue and responds to the user. A separate worker process then pulls jobs from the queue and executes them independently. This architecture is essential for operations like generating PDF reports, sending bulk emails, processing video/audio files, or syncing data with external services.

---

## Materi Inti

### 1. The Problem with Inline Processing

Imagine a route where a user uploads a high-resolution image, and the server needs to resize it into multiple thumbnails before responding. If the resizing takes 5 seconds, the user waits 5 seconds for a response. Even worse, any other user trying to access the site during those 5 seconds will also be delayed. This is known as "blocking the event loop."

### 2. What is a Task Queue?

A task queue is a data structure (often backed by a fast in-memory database like Redis) that holds jobs waiting to be processed.

* **Producer:** The Express application that creates jobs and adds them to the queue.
* **Queue:** The storage layer holding pending, active, completed, and failed jobs.
* **Consumer/Worker:** A separate Node.js process (or thread) that constantly polls the queue, takes jobs, and executes them.

### 3. Choosing a Queue Library

For Node.js and Express, [BullMQ](https://docs.bullmq.io/) (the successor to Bull) is the industry standard. It relies on Redis, provides advanced features like job retries, delayed jobs, rate-limiting, and parent-child flows, and is highly reliable.

### 4. Basic Architecture using BullMQ

In a typical setup, you will have your Express API server and one or more background worker processes. When a request comes in, the Express controller instantiates a BullMQ `Queue` and calls `queue.add('jobName', data)`. The controller then immediately returns a `202 Accepted` response. In a separate file (often run as a different process in production), a BullMQ `Worker` listens to the same queue and processes the job asynchronously.

---

## Contoh / Ilustrasi

Let's implement a simple background job for sending a welcome email when a user registers. We'll use `bullmq` and `ioredis`.

### 1. Install Dependencies

```bash
npm install bullmq ioredis
```

### 2. Setup the Queue (queue.js)

```javascript
const { Queue } = require('bullmq');

// Connect to Redis
const connection = {
  host: '127.0.0.1',
  port: 6379
};

// Create a new queue instance
const emailQueue = new Queue('EmailQueue', { connection });

module.exports = emailQueue;
```

### 3. Express Route (Producer) (app.js)

```javascript
const express = require('express');
const emailQueue = require('./queue');

const app = express();
app.use(express.json());

app.post('/register', async (req, res) => {
  try {
    const { email, username } = req.body;

    // Save user to database here...

    // Add an email job to the queue instead of sending it inline
    await emailQueue.add('sendWelcomeEmail', {
      email,
      username
    }, {
      attempts: 3, // Retry up to 3 times if it fails
      backoff: { type: 'exponential', delay: 1000 } // Wait before retrying
    });

    // Respond immediately
    res.status(202).json({ message: 'User registered, welcome email is being processed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => console.log('API listening on port 3000'));
```

### 4. Worker Process (worker.js)

```javascript
const { Worker } = require('bullmq');

const connection = {
  host: '127.0.0.1',
  port: 6379
};

// The worker processes jobs from 'EmailQueue'
const worker = new Worker('EmailQueue', async (job) => {
  console.log(`Processing job ${job.id} of type ${job.name}...`);
  const { email, username } = job.data;

  // Simulate sending an email (e.g., calling SendGrid or AWS SES)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`Successfully sent welcome email to ${email}`);
}, { connection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

To run this, you need Redis running locally, start the API (`node app.js`), and start the worker (`node worker.js`).

---

## Insight Penting

* **Idempotency:** Ensure your background jobs are idempotent. If a job fails halfway through and is retried, running it again should not cause unintended side effects (like charging a credit card twice).
* **Separate Processes:** While you *can* run the worker in the same Node.js process as your Express app, it defeats the purpose of offloading CPU work. Always run workers as separate processes in production (e.g., separate Docker containers).
* **Error Handling and Retries:** Temporary network glitches will happen. Always configure retries with exponential backoff for jobs that communicate with external APIs.
* **Dead Letter Queues (DLQ):** Keep an eye on jobs that fail repeatedly. BullMQ allows you to handle failed jobs, log them, or move them to a DLQ so you can inspect why they failed without blocking the main queue.
* **Avoid Queueing Everything:** Do not use task queues for quick, fast operations that need an immediate synchronous response back to the client. Task queues are specifically for operations where the client doesn't need to wait for the result.

---

## Ringkasan Akhir

* Blocking the Node.js event loop with heavy processing degrades API performance and hurts user experience.
* Background jobs move heavy, slow, or error-prone tasks out of the request-response cycle.
* Tools like BullMQ and Redis provide robust job queueing, complete with retries, concurrency control, and job state management.
* Always separate API servers and worker processes to maximize application responsiveness and scalability.

---

## Langkah Belajar Berikutnya

* Explore advanced BullMQ features like delayed jobs, repeatable (cron) jobs, and job events.
* Learn about implementing WebSockets or Server-Sent Events (SSE) to notify the client when a background job is finally completed.
* Study "Dockerizing Express JS Applications" to learn how to deploy your API and Worker containers alongside a Redis instance.

---

## Metadata

* **Level:** Intermediate
* **Topik utama:** Express JS, Background Jobs, Task Queues
* **Topik terkait:** Performance, Architecture, Redis
* **Kata kunci:** Express, BullMQ, Redis, Background Tasks, Event Loop, Queues, Worker
* **Estimasi waktu baca:** 10 menit

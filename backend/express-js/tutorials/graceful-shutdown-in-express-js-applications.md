---
title: "Graceful Shutdown in Express JS Applications"
description: "This material discusses the concept of \"Graceful Shutdown\" in Express.js applications. It explains how to safely stop a Node.js server, ensuring that all ongoin"
category: "backend"
technology: "express-js"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Graceful Shutdown in Express JS Applications

## Summary

This material discusses the concept of "Graceful Shutdown" in Express.js applications. It explains how to safely stop a Node.js server, ensuring that all ongoing requests are completed and external resources (like database connections) are closed properly before the application exits.

---

## Target Audience

- **Target Audience:** Intermediate to Advanced backend developers.
- **Level:** Intermediate.

---

## Prerequisites

- Solid understanding of JavaScript and Node.js.
- Experience building APIs with Express.js.
- Basic knowledge of system signals (like `SIGTERM` and `SIGINT`) and application deployment environments.

---

## Learning Objectives

Setelah membaca materi ini, pembaca akan memahami:

- The definition and importance of a graceful shutdown.
- How Node.js handles system signals when stopping a process.
- The steps to implement a graceful shutdown in an Express application.
- How to correctly close server connections, database pools, and clear timers before exit.

---

## Context and Motivation

When deploying your Express.js application, whether on a virtual machine, a containerized environment like Docker, or a PaaS, the environment will occasionally need to stop or restart your application. This can happen during deployments, scaling events, or system maintenance.

If your application stops immediately (a "hard" shutdown), any user currently making a request will experience a sudden connection drop or timeout. Furthermore, active database connections might be left hanging, potentially causing connection limits to be reached or data to be corrupted. Graceful shutdown ensures that the application stops accepting *new* requests, finishes processing *current* requests, gracefully closes resources, and then exits safely.

---

## Core Content

### 1. What are System Signals?

When an operating system wants to stop a process, it sends a signal. The two most common signals you need to handle are:

- `SIGINT` (Signal Interrupt): Sent when a user presses `Ctrl+C` in the terminal.
- `SIGTERM` (Signal Terminate): Sent by process managers (like systemd, PM2, or Docker/Kubernetes) to request a polite termination.

### 2. The Process of Graceful Shutdown

A graceful shutdown typically follows these sequential steps:

1. **Receive the Signal:** Listen for `SIGINT` or `SIGTERM`.
2. **Stop Accepting New Requests:** Tell the Express server to stop listening on its port.
3. **Finish Ongoing Requests:** Wait for the server to finish responding to active HTTP requests.
4. **Close Resources:** Close connections to databases (e.g., MongoDB, PostgreSQL), Redis, or other external services.
5. **Exit:** Terminate the Node.js process using `process.exit(0)` (success) or `process.exit(1)` (if an error occurred during shutdown).

### 3. Implementing Graceful Shutdown in Express

By default, calling `server.close()` on a Node.js HTTP server will stop it from accepting new connections, but it will wait for existing connections to finish.

```javascript
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  // Simulate a slow request
  setTimeout(() => {
    res.send('Request completed successfully!');
  }, 5000);
});

const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Function to handle the shutdown process
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // 1. Stop the server from accepting new requests
  server.close(() => {
    console.log('HTTP server closed. All ongoing requests finished.');

    // 2. Close database connections (Simulation)
    console.log('Closing database connections...');
    // db.close()

    // 3. Exit the process cleanly
    console.log('Process exiting cleanly.');
    process.exit(0);
  });

  // Optional: Force shutdown if it takes too long
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

// Listen for system signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 4. Handling Keep-Alive Connections

One edge case in Node.js HTTP servers is "keep-alive" connections. A client might hold a connection open without sending a request. Standard `server.close()` will wait indefinitely for these connections to drop, preventing the server from shutting down.
To solve this, modern Node.js versions provide options like `server.closeAllConnections()` or tracking active connections manually to destroy idle sockets during shutdown. Alternatively, libraries like `stoppable` can help manage this automatically.

---

## Code Examples

Imagine a **Restaurant Closing Time**.

1. **The Signal:** At 9:45 PM, the manager announces the restaurant is closing (`SIGTERM`).
2. **Stop Accepting New Requests:** The host locks the front door. No new customers can enter (`server.close()`).
3. **Finish Ongoing Requests:** The kitchen continues cooking for the customers already seated, and the waiters serve them until they finish their meals.
4. **Close Resources:** Once the last customer leaves, the staff cleans the kitchen, turns off the ovens (closing database connections), and counts the register.
5. **Exit:** The manager turns off the lights and locks the back door (`process.exit(0)`).

A "hard shutdown" would be like the manager turning off all the lights and kicking everyone out at exactly 9:45 PM, even if they are halfway through their meal.

---

## Insight Penting

- **Kubernetes and Docker:** In modern infrastructure, container orchestrators rely heavily on graceful shutdowns. Kubernetes sends a `SIGTERM` and waits a specific `grace period` (usually 30 seconds) before sending a forceful `SIGKILL`. If your app doesn't handle `SIGTERM`, it will just abruptly die when the grace period ends.
- **Timeout Fallback:** Always implement a `setTimeout` during your shutdown process. If a database connection hangs while trying to close, you don't want your Node.js process to be stuck in a zombie state forever. Forcefully exit if the shutdown takes too long.
- **Statelessness:** Graceful shutdown is much easier if your application is stateless. If you are processing long-running background jobs, you need more complex logic to pause or requeue those jobs before exiting.

---

## Ringkasan Akhir

- Graceful shutdown prevents user disruption and data corruption when a server stops.
- Node.js listens for OS signals like `SIGTERM` and `SIGINT`.
- The process involves stopping the HTTP server (`server.close()`), waiting for requests to finish, closing external resources, and finally terminating the process.
- Always include a timeout mechanism to forcefully exit if the graceful shutdown hangs.

---

## Langkah Belajar Berikutnya

- Explore how to implement background job processing queues (like BullMQ) that support graceful pausing.
- [Deploying Express JS Applications to Production](Deploying%20Express%20JS%20Applications%20to%20Production.md)
- [Dockerizing Express JS Applications](Dockerizing%20Express%20JS%20Applications.md)

---

## Metadata

- **Level:** Intermediate
- **Topik utama:** Express.js, Deployment, Reliability
- **Topik terkait:** Process Management, Node.js Events, DevOps
- **Kata kunci:** graceful shutdown, sigterm, sigint, server close, express deployment
- **Estimasi waktu baca:** 7 - 10 minutes

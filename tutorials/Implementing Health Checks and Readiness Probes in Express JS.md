# Implementing Health Checks and Readiness Probes in Express JS

## Ringkasan Singkat

This tutorial explains how to implement health checks and readiness probes in an Express.js application. You will learn the difference between liveness and readiness, why they are critical for modern deployments like Docker and Kubernetes, and how to build reliable endpoints to monitor your app's state.

## Untuk Siapa Materi Ini

Intermediate to advanced backend developers who are preparing their Express.js applications for production environments, containerization, or orchestration systems like Kubernetes.

## Prasyarat

- Solid understanding of Express.js routing and middleware.
- Basic familiarity with deployment concepts, containerization (Docker), or orchestration (Kubernetes).
- Understanding of HTTP status codes and asynchronous operations in Node.js.

## Tujuan Belajar

- Understand the distinction between liveness probes (health checks) and readiness probes.
- Learn how to implement simple and advanced health check endpoints in Express.js.
- Understand how to integrate database or external service status into readiness checks.
- Avoid common pitfalls that can cause cascading failures in production.

## Konteks dan Motivasi

In modern infrastructure, applications are rarely deployed as single, static instances. They are managed by orchestrators like Kubernetes or load balancers that need to know if an application instance is running properly.
If an app crashes, the system needs to restart it (Liveness). If an app is still booting up or temporarily disconnected from its database, the system should stop sending traffic to it until it recovers (Readiness). Without these checks, users might experience timeouts, errors, or silent failures.

## Materi Inti

### 1. Liveness vs Readiness

It is crucial to understand the difference between the two main types of probes:

- **Liveness Probe (Health Check):** Answers the question, "Is the application running?" If this fails, the system (like Kubernetes) will restart the container. It should be a simple check that doesn't rely on external services.
- **Readiness Probe:** Answers the question, "Is the application ready to handle traffic?" If this fails, the system stops sending HTTP requests to this instance but does not restart it. This check often verifies connections to databases, caches, or external APIs.

### 2. Basic Liveness Check

A liveness check should be as lightweight as possible. It only needs to confirm that the Express server is responsive to HTTP requests.

### 3. Advanced Readiness Check

A readiness check is more complex. It needs to ensure that the application's dependencies are functioning. For example, if your Express app requires a MongoDB connection to serve requests, the readiness probe should check that connection.

### 4. Handling Probe Failures Gracefully

When a readiness probe fails, return an appropriate HTTP status code, typically `503 Service Unavailable`. Do not return `500 Internal Server Error` unless the probe mechanism itself is broken. Provide a JSON response detailing what specific component failed to help with debugging.

## Contoh / Ilustrasi

Here is an example of implementing both liveness and readiness endpoints in an Express application using a hypothetical database connection.

```javascript
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database (simulated)
mongoose.connect('mongodb://localhost:27017/myapp', { useNewUrlParser: true });

// --- Liveness Probe ---
// Simply returns 200 OK if the server is running.
app.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Application is running' });
});

// --- Readiness Probe ---
// Checks if the database is connected and ready.
app.get('/health/readiness', async (req, res) => {
  try {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbState = mongoose.connection.readyState;

    if (dbState === 1) {
      res.status(200).json({ status: 'READY', components: { database: 'UP' } });
    } else {
      res.status(503).json({ status: 'NOT_READY', components: { database: 'DOWN' } });
    }
  } catch (error) {
    res.status(503).json({ status: 'NOT_READY', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

## Insight Penting

- **Keep Liveness Checks Simple:** Never query a database in a liveness check. If the database goes down, all your app instances will fail their liveness checks and be restarted simultaneously, causing a massive outage (cascading failure).
- **Timeouts Matter:** Ensure your probes respond quickly. If a probe takes too long, orchestrators will treat it as a failure. Use strict timeouts on database checks within the readiness probe.
- **Security:** Consider securing your health endpoints or exposing them on a different internal port so they aren't accessible to the public internet, preventing potential Denial of Service (DoS) attacks on the probe itself.

## Ringkasan Akhir

- Health checks are essential for container orchestration and load balancing.
- **Liveness probes** determine if the app needs to be restarted.
- **Readiness probes** determine if the app can safely accept traffic.
- Design liveness probes to be fast and isolated, while readiness probes should verify critical dependencies like databases.

## Langkah Belajar Berikutnya

- Graceful Shutdown in Express JS Applications.
- Dockerizing Express JS Applications.
- Deploying Express JS Applications to Production.

## Metadata

- Level: Intermediate
- Topik utama: Express JS
- Topik terkait: Deployment, DevOps, Containerization, Kubernetes
- Kata kunci: health check, liveness probe, readiness probe, express health, kubernetes, docker
- Estimasi waktu baca: 8 menit

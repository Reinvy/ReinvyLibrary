# Implementing Health Checks in Express JS

## Ringkasan Singkat

This article explains the importance of implementing health check and readiness probe endpoints in your Express.js applications. You will learn how to design these endpoints to inform load balancers, orchestrators (like Kubernetes), and monitoring systems whether your application is alive and ready to accept traffic.

## Untuk Siapa Materi Ini

- **Target Audience:** Backend Developers and DevOps Engineers.
- **Level:** Intermediate.

## Prasyarat

- Basic understanding of Express.js routing.
- Familiarity with the concepts of load balancing and container orchestration (e.g., Docker, Kubernetes).
- Understanding of HTTP status codes.

## Tujuan Belajar

After completing this material, you will be able to:

- Understand the difference between a Liveness Probe and a Readiness Probe.
- Implement a simple `/health` endpoint to indicate application uptime.
- Implement a `/ready` endpoint to verify database and external service connectivity.
- Integrate health checks seamlessly into an Express.js application architecture.

## Konteks dan Motivasi

When deploying an Express.js application to production, especially in containerized environments like Kubernetes or behind an AWS Application Load Balancer (ALB), the infrastructure needs a reliable way to know if your app is functioning correctly.

If your app crashes but the container is still running, the load balancer might continue sending traffic to it, resulting in failed requests for users. By exposing health check endpoints, the infrastructure can automatically detect when the app is unhealthy, stop sending traffic to it, and potentially restart it.

There are two main concepts to understand:

1. **Liveness (Health Check):** Is the application running? (If not, restart it).
2. **Readiness:** Is the application ready to serve traffic? (Are the database and cache connected? If not, do not send traffic to it yet, but do not restart it).

## Materi Inti

### 1. The Liveness Probe (Basic Health Check)

The liveness probe is a very simple endpoint, usually `/health` or `/ping`. Its only job is to return a `200 OK` status immediately. If this endpoint fails to respond or returns a `5xx` error, the infrastructure assumes the application has crashed or is deadlocked and will restart it.

This endpoint should *not* check external dependencies like databases. It only checks if the Express server itself is alive and can process a request.

### 2. The Readiness Probe

The readiness probe, often `/ready` or `/health/ready`, is more complex. It verifies if the application is fully initialized and all its critical dependencies (like the database, Redis cache, or third-party APIs) are connected and responding.

If this endpoint fails (e.g., returns `503 Service Unavailable`), the load balancer will stop sending traffic to this specific instance until the endpoint succeeds again. It will *not* restart the application.

### 3. Implementation in Express.js

Here is how you can implement both endpoints in a typical Express.js application:

```javascript
const express = require('express');
const mongoose = require('mongoose'); // Example database dependency

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. Liveness Probe ---
// Simply returns 200 OK if the server is running.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// --- 2. Readiness Probe ---
// Checks connections to databases and other critical services.
app.get('/ready', async (req, res) => {
  try {
    // Example: Check Mongoose connection state
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      return res.status(200).json({
        status: 'ready',
        database: 'connected'
      });
    } else {
      // If the database is not ready, return 503 Service Unavailable
      return res.status(503).json({
        status: 'not ready',
        database: 'disconnected'
      });
    }
  } catch (error) {
    // Log the error internally for debugging
    console.error('[Readiness Check Error]:', error);

    // Return a generic error to the client
    res.status(503).json({
      status: 'error',
      message: 'Service is not ready'
    });
  }
});

// Other routes...
app.get('/api/users', (req, res) => {
  res.json([{ name: 'Alice' }]);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### 4. Best Practices for Health Checks

- **Keep Liveness Simple:** Do not put heavy logic in the liveness probe. It is called frequently (e.g., every 5-10 seconds). If it takes too long to respond, the system might mistakenly think the app is dead.
- **Protect Endpoints (Optional):** If your health endpoints expose sensitive system information (like detailed dependency versions or internal IP addresses), consider adding basic authentication or restricting access to internal network IPs only. However, simple `/health` endpoints are usually safe to keep public.
- **Graceful Shutdown Integration:** Ensure your health checks work well with your Graceful Shutdown logic. When a shutdown signal is received, the readiness probe should immediately start returning `503` so traffic is drained, while the liveness probe should continue returning `200` until the process finally exits.

## Contoh / Ilustrasi

Imagine your Express application is a **Restaurant**.

- **Liveness Probe (`/health`):** The manager checking if the chef is physically present in the kitchen and awake. If the chef has fainted, the manager needs to hire a new one (restart the container).
- **Readiness Probe (`/ready`):** The manager checking if the gas is on, the ingredients have arrived, and the oven is hot. If the ingredients haven't arrived (database disconnected), the chef is alive but cannot cook. The manager won't fire the chef, but they will put a "Temporarily Closed" sign on the door until the ingredients arrive (stop routing traffic).

## Insight Penting

- **Common Mistake:** Checking the database connection in the `/health` (Liveness) probe. If the database goes down, the liveness probe fails, and Kubernetes will constantly restart your application container. Restarting the application won't fix a broken database, and the constant restarts only consume more CPU and delay recovery. Only check the database in the Readiness probe.
- **Timeouts:** Ensure your readiness checks have strict timeouts (e.g., 2-3 seconds). If querying the database takes 10 seconds, it's a sign of a problem, and the endpoint should fail fast rather than hanging indefinitely.

## Ringkasan Akhir

- Health checks are essential for load balancers and orchestrators to route traffic correctly and manage application lifecycle.
- **Liveness probes (`/health`)** indicate if the application process is running and should be extremely lightweight.
- **Readiness probes (`/ready`)** indicate if the application can successfully handle requests by checking critical dependencies like databases.
- Implementing these correctly prevents downtime and improves application reliability in production.

## Langkah Belajar Berikutnya

- [Graceful Shutdown in Express JS Applications](Graceful%20Shutdown%20in%20Express%20JS%20Applications.md)
- [Logging and Monitoring in Express JS](Logging%20and%20Monitoring%20in%20Express%20JS.md)
- [Dockerizing Express JS Applications](Dockerizing%20Express%20JS%20Applications.md)

## Metadata

- **Level:** Intermediate
- **Topik utama:** Express JS, DevOps, Production Readiness
- **Topik terkait:** Liveness Probe, Readiness Probe, Kubernetes, Load Balancing
- **Kata kunci:** express health check, liveness probe, readiness probe, express production, load balancer health
- **Estimasi waktu baca:** 6 - 8 minutes

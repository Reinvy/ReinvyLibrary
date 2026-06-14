# Implementing Health Checks in Express JS

## Ringkasan Singkat

This tutorial covers the essential concept of implementing health checks in an Express.js application. You will learn how to create endpoints that report the application's status to infrastructure tools, ensuring high availability and seamless monitoring in production environments.

---

## Untuk Siapa Materi Ini

- **Target Audience:** Intermediate backend developers, DevOps engineers, and system administrators.
- **Level:** Intermediate.

---

## Prasyarat

- Understanding of Express.js routing and basics.
- Familiarity with deployment concepts or containerization (e.g., Docker).
- Basic understanding of what a load balancer or a container orchestrator (like Kubernetes) does.

---

## Tujuan Belajar

After completing this material, you will be able to:

- Understand what health checks are and why they are critical for production systems.
- Differentiate between Liveness and Readiness probes.
- Implement robust health check endpoints in an Express.js application.
- Integrate database or external service checks into your application's health status.

---

## Konteks dan Motivasi

When you deploy your Express.js application to production, especially in containerized environments (like Docker) or orchestrated platforms (like Kubernetes), the infrastructure needs to know if your application is actually running and ready to handle traffic.

A process that is "running" does not necessarily mean it's "healthy" or "ready". For example, the server might be up, but the database connection might have failed, or the server might be overloaded. By providing dedicated health check endpoints, load balancers and orchestrators can automatically restart failed containers or stop sending traffic to unhealthy instances, significantly increasing system reliability and uptime.

---

## Materi Inti

### 1. What is a Health Check?

A health check is a special HTTP endpoint (usually `/health` or `/status`) that your application exposes. Infrastructure monitoring tools ping this endpoint at regular intervals. If it returns a `200 OK` status, the service is considered healthy. If it returns an error or times out, the service is considered unhealthy.

### 2. Liveness vs. Readiness Probes

In modern infrastructure (like Kubernetes), health checks are often divided into two types:

- **Liveness Probe:** "Is the application running?" If this fails, the system will restart the application. It simply checks if the server process is alive and responsive.
- **Readiness Probe:** "Is the application ready to accept traffic?" If this fails, the system won't restart the app, but it will remove it from the load balancer's pool so no new requests are sent to it. This is useful when the app is starting up and loading caches, or when a dependent service (like a database) is temporarily unavailable.

### 3. Basic Liveness Health Check

The simplest form of a health check is an endpoint that just returns `200 OK`.

```javascript
app.get('/health/liveness', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});
```

### 4. Comprehensive Readiness Health Check

A readiness check should verify connections to essential backing services, such as your database or cache.

```javascript
app.get('/health/readiness', async (req, res) => {
  try {
    // Example: Check database connection (pseudo-code)
    // await mongoose.connection.db.admin().ping();

    // Example: Check Redis connection (pseudo-code)
    // await redisClient.ping();

    res.status(200).json({
      status: 'READY',
      services: {
        database: 'UP',
        redis: 'UP'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Health Check Failed]', error);
    res.status(503).json({
      status: 'NOT_READY',
      error: 'Dependent services are unavailable'
    });
  }
});
```

### 5. Best Practices

- **Keep it fast:** Health checks are called frequently (e.g., every 5-10 seconds). Do not put heavy queries or slow operations in these endpoints.
- **Do not expose sensitive data:** Never return internal IP addresses, full stack traces, or credentials in a health check response.
- **Use standard status codes:** `200` for healthy, `503` (Service Unavailable) for unhealthy.

---

## Contoh / Ilustrasi

Let's build a complete, runnable example of an Express app with both liveness and readiness checks. We will simulate a database connection.

```javascript
const express = require('express');
const app = express();

// Simulated state of the database connection
let isDatabaseConnected = true;

// Simulate a database failure after 30 seconds
setTimeout(() => {
  isDatabaseConnected = false;
  console.log('Simulated database disconnection.');
}, 30000);

// 1. Liveness Check: Only checks if the Express server is responsive
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ALIVE' });
});

// 2. Readiness Check: Checks dependent services (e.g., database)
app.get('/health/ready', (req, res) => {
  if (isDatabaseConnected) {
    res.status(200).json({
      status: 'READY',
      checks: { database: 'OK' }
    });
  } else {
    // 503 Service Unavailable is standard for failed readiness checks
    res.status(503).json({
      status: 'UNAVAILABLE',
      checks: { database: 'FAILED' }
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

*Illustration:* Imagine your app is a restaurant.

- **Liveness** means the restaurant's front door is unlocked and staff is inside.
- **Readiness** means the kitchen has gas and ingredients, so they can actually cook. If the gas is cut (database down), the restaurant is still "alive", but it is not "ready" to serve customers.

---

## Insight Penting

- **Separation of Concerns:** Don't mix liveness and readiness. If a database goes down, you want to stop sending traffic to the app (Readiness = Fail), but you *don't* want Kubernetes to constantly restart the app in a loop (Liveness = Pass). Restarting the app won't fix the external database.
- **Security:** Sometimes developers put health checks behind authentication. **Do not do this for infrastructure checks.** Kubernetes or your Load Balancer shouldn't need a JWT token to ping `/health`. Keep it open but secure (no sensitive data).
- **Graceful Shutdown Integration:** Health checks often work hand-in-hand with Graceful Shutdown. When the app receives a `SIGTERM` signal to shut down, you can immediately make the Readiness check fail so the load balancer stops sending new requests, while the app finishes processing existing ones.

---

## Ringkasan Akhir

- Health checks are crucial for system reliability, allowing infrastructure to monitor application state.
- **Liveness probes** check if the application process is running and responsive.
- **Readiness probes** check if the application is fully ready to handle traffic, including dependent service connectivity.
- Keep health checks fast and avoid exposing sensitive internal information.

---

## Langkah Belajar Berikutnya

- [Graceful Shutdown in Express JS Applications](Graceful%20Shutdown%20in%20Express%20JS%20Applications.md)
- [Logging and Monitoring in Express JS](Logging%20and%20Monitoring%20in%20Express%20JS.md)
- [Deploying Express JS Applications to Production](Deploying%20Express%20JS%20Applications%20to%20Production.md)

---

## Metadata

- Level: Intermediate
- Topik utama: Backend Development, Express.js, DevOps
- Topik terkait: Health Checks, Liveness Probe, Readiness Probe, Kubernetes, Docker
- Kata kunci: express health check, nodejs readiness probe, liveness probe, express status endpoint
- Estimasi waktu baca: 8 - 10 minutes

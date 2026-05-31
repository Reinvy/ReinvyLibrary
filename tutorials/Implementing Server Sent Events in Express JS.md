# Implementing Server-Sent Events (SSE) in Express JS

## Ringkasan Singkat

This material explains how to implement Server-Sent Events (SSE) in Express JS for real-time, unidirectional communication from the server to the client. You will learn the mechanics of SSE, how to set up the appropriate headers, handle client disconnections, and understand when to choose SSE over WebSockets.

---

## Untuk Siapa Materi Ini

* **Target Audience:** Backend developers and full-stack developers working with Node.js and Express.
* **Level:** Intermediate.

---

## Prasyarat

* Solid understanding of JavaScript and asynchronous programming.
* Basic knowledge of building APIs with Express JS.
* Familiarity with HTTP concepts (headers, persistent connections).

---

## Tujuan Belajar

After reading this material, you will understand:

* What Server-Sent Events (SSE) are and how they differ from WebSockets.
* How to establish an SSE connection in an Express JS route.
* How to properly format and send data streams to connected clients.
* How to handle client disconnections to prevent memory leaks.
* Best practices and limitations of using SSE in production.

---

## Konteks dan Motivasi

In modern web applications, real-time updates are often necessary for features like live notifications, stock price tickers, or real-time dashboards. While WebSockets are a popular choice for bi-directional real-time communication, they can be overkill for scenarios where data only flows from the server to the client.

Server-Sent Events (SSE) provide a simpler, native HTTP-based alternative for unidirectional real-time data flow. They leverage standard HTTP connections, making them easier to deploy, scale, and integrate with existing infrastructure (like load balancers and API gateways) without requiring a separate protocol upgrade. Understanding SSE adds a valuable, lightweight tool to your developer toolkit for real-time features.

---

## Materi Inti

### What is Server-Sent Events (SSE)?

Server-Sent Events (SSE) is a web standard that allows a browser to receive automatic updates from a server via an HTTP connection. Once the client establishes the connection, the server keeps it open and pushes events to the client whenever new data is available.

### SSE vs WebSockets

While both provide real-time capabilities, they serve different purposes:

* **Direction:** WebSockets are bidirectional (client and server can both send and receive data at any time). SSE is unidirectional (server sends data to the client).
* **Protocol:** WebSockets use a custom protocol (`ws://` or `wss://`). SSE uses standard HTTP (`http://` or `https://`).
* **Complexity:** SSE is generally easier to implement on both the server (just standard HTTP responses) and the client (using the built-in `EventSource` API).
* **Features:** SSE has built-in support for automatic reconnection and event IDs, which WebSockets lack out of the box.

### Establishing an SSE Connection in Express

To create an SSE endpoint in Express, you must set specific HTTP headers to inform the client that the response will be an event stream and keep the connection alive:

* `Content-Type: text/event-stream`
* `Cache-Control: no-cache`
* `Connection: keep-alive`

### Formatting the Data

SSE requires a specific text-based format for sending messages. Each message must start with `data:`, followed by the actual data payload, and end with a double newline `\n\n`. You can also specify event names and IDs.

---

## Contoh / Ilustrasi

### 1. Basic SSE Server Implementation

Here is how you can set up a simple Express route that sends a server timestamp to the client every second using SSE.

```javascript
const express = require('express');
const app = express();

app.get('/api/stream', (req, res) => {
  // 1. Set mandatory SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // 2. Send an initial message (optional)
  res.write('data: {"message": "Connection established"}\n\n');

  // 3. Set up an interval to push data periodically
  const intervalId = setInterval(() => {
    const data = {
      timestamp: new Date().toISOString(),
      status: 'active'
    };

    // Format the message according to SSE specification
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 1000);

  // 4. Handle client disconnection
  req.on('close', () => {
    console.log('Client disconnected');
    clearInterval(intervalId);
    res.end();
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

### 2. Client-Side Implementation (EventSource)

To consume this stream on the frontend, you use the native `EventSource` API in the browser.

```javascript
// Connect to the SSE endpoint
const eventSource = new EventSource('http://localhost:3000/api/stream');

// Listen for messages
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received data:', data.timestamp);
};

// Handle errors or disconnections
eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  // EventSource will automatically attempt to reconnect
};
```

---

## Insight Penting

* **Connection Limits:** Browsers enforce a strict limit on the number of concurrent SSE connections to a single domain (historically 6 connections for HTTP/1.1). If your application requires many streams, consider multiplexing them or upgrading to HTTP/2, which supports multiplexing over a single connection.
* **Handling Disconnections (Memory Leaks):** It is critical to listen for the `req.on('close')` event in Express. If a client navigates away or closes the browser, the server must clean up resources (like `setInterval`, event listeners, or database subscriptions) associated with that connection to prevent memory leaks.
* **Firewalls and Proxies:** Some corporate firewalls, proxy servers, or load balancers might buffer HTTP responses or aggressively close long-lived connections. You may need to configure your infrastructure (e.g., Nginx) to disable proxy buffering for SSE endpoints and periodically send "ping" or "heartbeat" comments (`: ping\n\n`) to keep the connection alive.
* **Data Format Limitations:** SSE only supports sending UTF-8 text data. If you need to send binary data (like images or files in real-time), WebSockets might be a better choice, or you will need to Base64 encode the binary data, which adds overhead.

---

## Ringkasan Akhir

* Server-Sent Events (SSE) offer a straightforward, native HTTP solution for unidirectional real-time communication from server to client.
* SSE is ideal for live dashboards, notifications, and feeds where the client does not need to send high-frequency data back to the server.
* Express implementations require specific headers (`text/event-stream`) and strict message formatting (`data: ... \n\n`).
* Resource cleanup upon client disconnection (`req.on('close')`) is mandatory to maintain a healthy and scalable application.

---

## Langkah Belajar Berikutnya

* **Real-Time Communication with Socket.IO:** Explore WebSockets for bi-directional communication.
* **Handling Background Jobs in Express JS with BullMQ and Redis:** Learn how to use SSE to notify clients about the status of long-running background tasks.
* **Scaling Real-Time Apps:** Investigate how to scale SSE across multiple Express server instances using Redis Pub/Sub.

---

## Metadata

* Level: Intermediate
* Topik utama: Real-Time Communication
* Topik terkait: Event Stream, Express Routing, Performance
* Kata kunci: SSE, Server-Sent Events, EventSource, Express real-time, push notifications
* Estimasi waktu baca: 15 menit

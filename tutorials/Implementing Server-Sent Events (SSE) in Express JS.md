# Implementing Server-Sent Events (SSE) in Express JS

## Ringkasan Singkat

This material covers Server-Sent Events (SSE), a technology for establishing a unidirectional real-time connection from the server to the client. You will learn how to set up an SSE endpoint in Express.js, stream updates to the client, and understand when to use SSE over WebSockets.

---

## Untuk Siapa Materi Ini

- **Target Audience:** Backend developers and full-stack developers.
- **Level:** Intermediate.

---

## Prasyarat

- Basic understanding of Express.js routing.
- Knowledge of HTTP request/response lifecycles.
- Familiarity with basic real-time concepts.

---

## Tujuan Belajar

After reading this material, you will be able to:

- Understand the concept and mechanics of Server-Sent Events.
- Implement an SSE endpoint in an Express.js application.
- Handle client connections and disconnections properly.
- Compare SSE with WebSockets to make informed architectural decisions.

---

## Konteks dan Motivasi

In many modern applications, users expect real-time updates—such as live sports scores, stock price tickers, or notification alerts. While WebSockets provide full-duplex communication, they can be overkill for scenarios where the server only needs to push data to the client. Server-Sent Events (SSE) offers a simpler, lightweight, and native HTTP-based solution for one-way real-time communication. Understanding SSE allows developers to build efficient real-time features without the overhead of WebSockets.

---

## Materi Inti

### What is Server-Sent Events (SSE)?

Server-Sent Events (SSE) is a web standard that allows a browser to receive automatic updates from a server via an HTTP connection. Unlike polling, where the client repeatedly asks for data, SSE keeps a single HTTP connection open, and the server pushes new data whenever it is available.

### How SSE Works in HTTP

SSE works over standard HTTP. The server responds with a specific `Content-Type` of `text/event-stream`. It then keeps the connection open using `Connection: keep-alive` and streams text data in a specific format (`data: ... \n\n`).

### Managing Connections in Express.js

To implement SSE in Express.js, you need to:

1. Set the appropriate HTTP headers on the response object.
2. Write data to the response stream without closing it (`res.write()`).
3. Handle the `close` event on the request to clean up resources when the client disconnects.

---

## Contoh / Ilustrasi

### Basic SSE Implementation in Express.js

Here is a simple example of how to implement an SSE endpoint in Express.js that sends a timestamp every second.

```javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/events', (req, res) => {
  // 1. Set the necessary headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Flush headers immediately if using compression middleware (optional)
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // 2. Send an initial message
  res.write('data: Connected to SSE stream\n\n');

  // 3. Set up an interval to send data periodically
  const intervalId = setInterval(() => {
    const time = new Date().toLocaleTimeString();
    res.write(`data: ${JSON.stringify({ time })}\n\n`);
  }, 1000);

  // 4. Handle client disconnect
  req.on('close', () => {
    console.log('Client disconnected from SSE');
    clearInterval(intervalId);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`SSE server running on http://localhost:${PORT}`);
});
```

### Consuming SSE on the Client

On the frontend, you can use the built-in `EventSource` API to listen to the SSE stream.

```javascript
// Run this in the browser console or client-side script
const eventSource = new EventSource('http://localhost:3000/events');

eventSource.onmessage = function(event) {
  console.log('New message from server:', event.data);
};

eventSource.onerror = function(error) {
  console.error('SSE Error:', error);
  eventSource.close(); // Stop retrying on error
};
```

---

## Insight Penting

### SSE vs WebSockets

- **Directionality:** SSE is unidirectional (Server to Client). WebSockets are bidirectional.
- **Protocol:** SSE uses standard HTTP/1.1 or HTTP/2, meaning it works seamlessly with existing load balancers and corporate firewalls. WebSockets use a custom protocol (ws:// or wss://) starting with an HTTP Upgrade.
- **Built-in Features:** The browser's `EventSource` API automatically handles automatic reconnection. WebSockets require manual implementation of reconnection logic.
- **Connection Limits:** In HTTP/1.1, browsers typically limit the number of open SSE connections to a single domain (usually 6). This limitation goes away when using HTTP/2, where connections are multiplexed.

### Handling Disconnections and Memory Leaks

It is critical to listen to the `req.on('close')` event in your Express.js route. If you do not clear intervals or remove event listeners when a client disconnects, your server will continue to execute code for phantom connections, quickly leading to severe memory leaks and CPU exhaustion.

---

## Ringkasan Akhir

- Server-Sent Events (SSE) provide a simple HTTP-based method for one-way real-time communication from server to client.
- In Express.js, SSE is implemented by setting the `text/event-stream` header and keeping the response connection open using `res.write()`.
- SSE is often preferable to WebSockets for features like live notifications or social feeds, where data only flows outward from the server.
- Proper cleanup of resources on the `close` event is mandatory to prevent memory leaks.

---

## Langkah Belajar Berikutnya

- Explore "Real-Time Communication in Express with Socket.IO" to learn about bidirectional communication.
- Study how to implement message queues (like Redis Pub/Sub) to scale SSE across multiple server instances.
- Investigate HTTP/2 and how its multiplexing capabilities enhance SSE performance.

---

## Metadata

- **Level:** Intermediate
- **Topik utama:** Express.js, Real-Time Communication
- **Topik terkait:** SSE, WebSockets, HTTP, EventSource
- **Kata kunci:** server-sent events, sse, express real-time, one-way communication
- **Estimasi waktu baca:** 10 menit

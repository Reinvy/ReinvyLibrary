---
title: "Implementing Server-Sent Events (SSE) in Express JS"
description: "This material explores Server-Sent Events (SSE), a standard technology for sending real-time, unidirectional data from the server to the client. You will learn"
category: "backend"
technology: "express-js"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Implementing Server-Sent Events (SSE) in Express JS

## Summary

This material explores Server-Sent Events (SSE), a standard technology for sending real-time, unidirectional data from the server to the client. You will learn how to implement SSE in Express.js as a lighter alternative to WebSockets when you only need one-way real-time communication.

---

## Target Audience

* Beginner to intermediate backend developers.
* Developers looking to add real-time features like live feeds, notifications, or ticker updates without the overhead of WebSockets.

---

## Prerequisites

* Basic understanding of Express.js routing and middleware.
* Understanding of standard HTTP requests and responses.
* Familiarity with asynchronous JavaScript.

---

## Learning Objectives

Setelah membaca materi ini, pembaca akan memahami:

* What Server-Sent Events (SSE) are and how they differ from WebSockets.
* How to configure an Express.js endpoint to send SSE.
* How to keep the connection open and stream data to the client continuously.
* How to gracefully handle client disconnections.

---

## Context and Motivation

In modern web applications, users expect real-time updates. Whether it's a live sports score, a notification system, or a stock ticker, polling the server every few seconds is inefficient and resource-heavy.

While WebSockets are a popular solution for real-time communication, they provide full duplex (two-way) communication, which can be overkill and complex to set up if you only need the server to send updates to the client. SSE is built on top of standard HTTP, making it simpler to implement, easier to route through firewalls/proxies, and perfect for one-way (server-to-client) streaming scenarios. Understanding SSE allows developers to choose the most efficient tool for their specific real-time requirements.

---

## Core Content

### 1. What are Server-Sent Events (SSE)?

Server-Sent Events (SSE) is a web standard that allows a web browser to receive automatic updates from a server via an HTTP connection. Unlike standard HTTP requests where the server closes the connection after sending a response, with SSE, the server keeps the connection open and pushes messages to the client whenever new data is available.

SSE uses the `text/event-stream` content type and relies on a specific plain-text format to parse messages.

### 2. SSE vs. WebSockets

* **Directionality:** SSE is unidirectional (Server to Client). WebSockets are bidirectional.
* **Protocol:** SSE uses standard HTTP/HTTPS. WebSockets require protocol switching (ws/wss).
* **Reconnection:** Built-in automatic reconnection in browsers for SSE. WebSockets require manual implementation for reconnection.
* **Use Cases:** SSE is ideal for notifications, feeds, and status updates. WebSockets are better for chat apps and multiplayer games.

### 3. Setting Up an SSE Endpoint in Express

To create an SSE endpoint in Express.js, you need to set specific HTTP headers to tell the client that the response will be an event stream and that the connection should be kept alive.

```javascript
app.get('/api/stream', (req, res) => {
  // 1. Set required SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 2. Send an initial message
  res.write(`data: {"message": "Connected to SSE stream"}\n\n`);

  // ... setup intervals or event listeners to send more data
});
```

*Note: In SSE, each message must be prefixed with `data:` and terminated with two newline characters (`\n\n`).*

### 4. Sending Continuous Updates

Once the connection is established, you can use `res.write()` to continuously push data to the client.

```javascript
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send an update every 2 seconds
  const intervalId = setInterval(() => {
    const data = JSON.stringify({ time: new Date().toISOString() });
    res.write(`data: ${data}\n\n`);
  }, 2000);

  // Handle client disconnects to prevent memory leaks
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});
```

### 5. Secure Error Handling

When implementing real-time features, errors might occur (e.g., failed database fetches before pushing data). As always, prevent *Information Exposure* by logging the actual error internally and either silently failing or sending a generic SSE error event to the client if needed.

```javascript
try {
   // ... some logic
} catch (error) {
   console.error('[SSE Error]', error);
   res.write(`data: {"error": "Internal update error"}\n\n`);
}
```

---

## Code Examples

Imagine you are at an airport waiting for your flight.

* **Polling:** You repeatedly walk up to the information desk every 5 minutes asking, "Is my flight delayed?" (Inefficient).
* **WebSockets:** You have a walkie-talkie with the dispatcher. You can ask questions, and they can talk back. (Two-way, but complex).
* **SSE:** You are looking at the digital flight information board. You do not talk to the board. The airport server simply pushes updates to the board continuously. If the board briefly loses power (connection drops), it automatically turns back on and catches up (SSE's built-in reconnection).

**Client-Side Implementation (Vanilla JS):**

To consume the SSE stream created above in the browser, you use the native `EventSource` API:

```javascript
const eventSource = new EventSource('/api/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received update:', data);
  // Update the UI with the new data
};

eventSource.onerror = (error) => {
  console.error('EventSource failed:', error);
  // The browser will automatically attempt to reconnect
};
```

---

## Insight Penting

* **Connection Limits:** Browsers typically limit the number of concurrent SSE connections to the same domain (often 6 connections for HTTP/1.1). Using HTTP/2 multiplexing heavily mitigates this issue.
* **Memory Leaks:** Always listen for the `req.on('close')` event to clear intervals, timeouts, or remove event listeners. Failing to do so will result in memory leaks on the server as "ghost" connections pile up.
* **Load Balancing & Proxies:** Since SSE uses long-lived HTTP connections, ensure your load balancers, proxies (like Nginx), and cloud providers are configured to support long timeouts and do not buffer the SSE responses.

---

## Ringkasan Akhir

* Server-Sent Events (SSE) provide a simple, standard HTTP-based mechanism for sending real-time, one-way updates from the server to the client.
* SSE is implemented in Express by setting the `Content-Type: text/event-stream` header and keeping the connection alive.
* Data sent via SSE must follow a specific text format, starting with `data:` and ending with `\n\n`.
* Always handle the client's `close` event to clean up resources and prevent memory leaks.
* SSE is a more lightweight and cacheable alternative to WebSockets for unidirectional data flows.

---

## Langkah Belajar Berikutnya

* [Real-Time Communication in Express with Socket.IO](Real-Time%20Communication%20in%20Express%20with%20Socket.IO.md) (Learn WebSockets for bidirectional communication).
* Explore integrating SSE with an Event Emitter or Redis Pub/Sub to broadcast updates across multiple server instances.

---

## Metadata

* Level: Intermediate
* Topik utama: Express.js, Backend Development
* Topik terkait: Real-time, SSE, Event Streaming, WebSockets
* Kata kunci: express sse, server sent events, real time updates, event stream
* Estimasi waktu baca: 8 - 10 menit

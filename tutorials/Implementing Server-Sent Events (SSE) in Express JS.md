# Implementing Server-Sent Events (SSE) in Express JS

## Ringkasan Singkat

This article explains how to implement Server-Sent Events (SSE) in an Express JS application. You will learn the mechanics of pushing real-time updates from a server to a client over a single HTTP connection, making it an excellent, lightweight alternative to WebSockets for unidirectional data flow.

---

## Untuk Siapa Materi Ini

* **Target pembaca:** Backend developers and full-stack engineers who need real-time features in their applications.
* **Level pembaca:** Intermediate.

---

## Prasyarat

Before reading this material, it is recommended to have a solid understanding of:

* Basic Routing and Middleware in Express.
* Understanding the Express JS Request Lifecycle.
* Fundamentals of HTTP protocol (specifically persistent connections).

---

## Tujuan Belajar

After reading this material, you will understand:

* How Server-Sent Events differ from WebSockets and long-polling.
* How to configure an Express route to establish and maintain an SSE connection.
* How to send formatted event streams to the client.
* When to choose SSE over other real-time communication protocols.

---

## Konteks dan Motivasi

In modern web applications, the client often needs real-time updates from the server. Common scenarios include live news feeds, stock price tickers, progress indicators for background jobs, and notification systems. While WebSockets provide full-duplex communication (two-way), they can be overkill for applications where data only needs to flow from the server to the client.

Server-Sent Events (SSE) provide a simpler, standard HTTP-based solution for unidirectional communication. Because SSE runs over standard HTTP, it seamlessly integrates with existing infrastructure, easily passes through firewalls and proxies, and leverages HTTP/2 multiplexing. Understanding SSE empowers developers to build efficient real-time systems without the overhead and complexity of managing WebSockets when they are unnecessary.

---

## Materi Inti

### 1. Understanding the SSE Protocol

SSE is built on top of standard HTTP. When a client requests an SSE endpoint, the server responds with specific headers that tell the client to keep the connection open. The server then streams text data in a specific format (`text/event-stream`).

### 2. Setting the Correct HTTP Headers

To initiate an SSE connection, your Express route must set the following headers:

* `Content-Type: text/event-stream`: This tells the browser to expect a stream of events.
* `Cache-Control: no-cache`: This prevents proxies and browsers from caching the event stream.
* `Connection: keep-alive`: This ensures the TCP connection remains open.

### 3. Formatting SSE Messages

Messages sent over SSE must follow a strict text-based format. Each message is composed of fields, followed by a newline, and the entire message is terminated by a double newline (`\n\n`).
Common fields include:

* `data`: The actual payload (often a JSON string).
* `event`: (Optional) The type of event. If omitted, it defaults to "message".
* `id`: (Optional) A unique identifier for the event, useful for reconnecting.
* `retry`: (Optional) The reconnection time (in milliseconds) the client should use if the connection drops.

### 4. Handling Client Disconnects

Since SSE connections are persistent, it is crucial to handle the scenario where the client closes the connection (e.g., closing the browser tab). You must listen for the `close` event on the `req` object to stop sending data and clean up any intervals or resources, preventing memory leaks.

---

## Contoh / Ilustrasi

Below is a complete example of setting up an SSE endpoint in Express and simulating a continuous stream of data (e.g., a simple time tick).

### Server-Side Code (Express)

```javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/events', (req, res) => {
  // 1. Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // 2. Send an initial payload
  res.write('data: {"message": "Connected to SSE stream"}\n\n');

  // 3. Simulate periodic data updates
  const intervalId = setInterval(() => {
    const payload = JSON.stringify({ time: new Date().toISOString() });
    // Write data following the SSE format requirements
    res.write(`data: ${payload}\n\n`);
  }, 2000); // Send data every 2 seconds

  // 4. Handle client disconnection
  req.on('close', () => {
    console.log('Client disconnected from SSE');
    clearInterval(intervalId); // Clean up the interval to avoid memory leaks
    res.end(); // End the response process
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
```

### Client-Side Code (Browser)

On the client side, you use the built-in `EventSource` API to consume the stream.

```javascript
// Connect to the SSE endpoint
const eventSource = new EventSource('http://localhost:3000/events');

// Listen for standard messages
eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received time update:', data.time);
};

// Handle connection errors
eventSource.onerror = function(error) {
  console.error('SSE Error:', error);
  // EventSource automatically attempts to reconnect!
};
```

---

## Insight Penting

* **Unidirectional Nature:** SSE is strictly server-to-client. If your application requires frequent, low-latency client-to-server communication, WebSockets (`Real-Time Communication in Express with Socket.IO.md`) are the correct choice.
* **Connection Limits:** In HTTP/1.1, browsers typically limit the number of active SSE connections to the same domain (usually 6). This limitation is virtually eliminated if you use HTTP/2.
* **Automatic Reconnection:** One of the biggest advantages of the `EventSource` API is that it automatically handles reconnections. The server can also dictate the retry interval by sending a `retry: <milliseconds>` field.
* **Resource Leaks:** Forgetting to listen to `req.on('close')` and failing to clean up intervals or remove event listeners is a very common source of memory leaks in Express applications using SSE.
* **Proxy Configuration:** If you are using Nginx or another reverse proxy, you may need to explicitly disable buffering for your SSE endpoints (e.g., `proxy_buffering off;` in Nginx) so that messages are sent to the client immediately instead of being held in a buffer.

---

## Ringkasan Akhir

* SSE is a standard, HTTP-based technology for pushing real-time updates from server to client.
* It requires setting specific headers (`Content-Type: text/event-stream`, `Connection: keep-alive`).
* Messages must be formatted as plain text, prefixed with `data:`, and terminated with a double newline (`\n\n`).
* Developers must meticulously handle the `req.on('close')` event to perform cleanup and prevent memory leaks.
* SSE is ideal for unidirectional data flows, avoiding the complexity of WebSockets.

---

## Langkah Belajar Berikutnya

* Explore real-time bidirectional communication in **Real-Time Communication in Express with Socket.IO**.
* Learn how to implement message queues to trigger SSE updates in **Handling Background Jobs in Express JS with BullMQ and Redis**.
* Study advanced topics in **Deploying Express JS Applications to Production** to understand how to handle persistent connections behind load balancers.

---

## Metadata

* **Level:** Intermediate
* **Topik utama:** Real-Time Communication
* **Topik terkait:** WebSockets, HTTP Protocols, Express Routing
* **Kata kunci:** Server-Sent Events, SSE, EventSource, Real-time, Express JS, Streaming
* **Estimasi waktu baca:** 10 menit

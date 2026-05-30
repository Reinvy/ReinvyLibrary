# Implementing Server-Sent Events (SSE) in Express JS

## Ringkasan Singkat

Server-Sent Events (SSE) is a lightweight protocol that enables a server to push real-time updates to web clients over a single HTTP connection. This tutorial explains how to implement SSE in an Express.js application, allowing you to build real-time features like live feeds, notifications, and dashboards without the complexity of WebSockets.

## Untuk Siapa Materi Ini

This material is designed for intermediate to advanced backend developers who are familiar with Express.js and want to learn a straightforward method for streaming data from the server to the client.

## Prasyarat

- Basic understanding of Express.js routing and middleware.
- Familiarity with HTTP headers and client-server architecture.
- Understanding of asynchronous programming in Node.js.

## Tujuan Belajar

- Understand what Server-Sent Events are and when to use them over WebSockets or long polling.
- Learn how to configure an Express.js route to send SSE.
- Understand the required HTTP headers for SSE (`Content-Type: text/event-stream`).
- Learn how to format and push data events to the client.
- Know how to handle client disconnections gracefully to avoid memory leaks.

## Konteks dan Motivasi

In modern web applications, real-time data is essential for features like live sports scores, stock market tickers, or system status dashboards. While WebSockets provide full duplex (two-way) communication, they can be overkill if the client only needs to *receive* updates from the server. Server-Sent Events (SSE) offer a simpler, built-in browser standard for one-way (server-to-client) real-time communication using standard HTTP. SSE is easier to set up, works well over standard HTTP/2, and automatically handles reconnections in the browser.

## Materi Inti

### Understanding Server-Sent Events

SSE works by the client opening an HTTP connection and the server keeping that connection open, sending back a stream of textual data formatted in a specific way.

### Step 1: Setting up the Express Route

To enable SSE, the server must respond with specific headers to tell the client that it should expect an event stream rather than a standard one-off JSON response.

The essential headers are:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

### Step 2: Formatting the Data

Data sent via SSE must follow a strict format. Each event must start with `data:`, followed by the payload, and end with two newline characters (`\n\n`). If you are sending JSON, you must stringify it.

### Step 3: Handling Disconnections

Because the connection is kept open indefinitely, it's crucial to listen for the `close` event on the client request object. When the client disconnects (e.g., closes the browser tab), the server should stop attempting to send data and clean up any resources (like intervals or event listeners) to prevent memory leaks.

## Contoh / Ilustrasi

Here is a complete, minimal example of an Express.js server implementing an SSE endpoint that sends a timestamp to the client every 2 seconds.

```javascript
const express = require('express');
const app = express();

app.get('/events', (req, res) => {
  // 1. Set the necessary headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Optional: Send an initial event to let the client know connection is established
  res.write('data: {"message": "Connected to SSE stream"}\n\n');

  // 2. Set up an interval to push data to the client periodically
  const intervalId = setInterval(() => {
    const data = {
      time: new Date().toISOString(),
      status: 'active'
    };

    // 3. Write the data following the specific SSE format
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 2000);

  // 4. Handle client disconnection
  req.on('close', () => {
    console.log('Client disconnected, stopping stream.');
    clearInterval(intervalId);
    res.end();
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

To test this on the client side, a simple HTML file can use the built-in `EventSource` API:

```html
<!DOCTYPE html>
<html>
<body>
  <h2>Server-Sent Events Example</h2>
  <div id="result"></div>

  <script>
    if(typeof(EventSource) !== "undefined") {
      const source = new EventSource("http://localhost:3000/events");

      source.onmessage = function(event) {
        document.getElementById("result").innerHTML += event.data + "<br>";
      };
    } else {
      document.getElementById("result").innerHTML = "Sorry, your browser does not support server-sent events...";
    }
  </script>
</body>
</html>
```

## Insight Penting

- **One-Way Communication:** SSE is strictly server-to-client. If you need the client to continuously send rapid updates to the server (like in a multiplayer game or a chat app), use WebSockets.
- **Connection Limits:** In older browsers (HTTP/1.1), there is a strict limit on the number of open concurrent connections to the same domain (usually 6). If a user opens many tabs, they might exhaust this limit. HTTP/2 multiplexing solves this problem, allowing many SSE streams over a single connection.
- **Built-in Reconnection:** The browser's `EventSource` API automatically attempts to reconnect if the connection drops. You can control the reconnection timeout by sending a `retry: <milliseconds>\n\n` event from the server.
- **Text Only:** SSE only supports UTF-8 text data. Binary data must be base64 encoded.
- **State Management:** Because connections are long-lived, scaling SSE across multiple server instances usually requires a Pub/Sub mechanism (like Redis) so that an event generated on one server can be broadcast to clients connected to other servers.

## Ringkasan Akhir

- Server-Sent Events (SSE) provide a simple, HTTP-based mechanism for pushing real-time updates from an Express.js server to a client.
- SSE requires setting headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive`.
- Data must be formatted correctly, prefixed with `data:` and ending with `\n\n`.
- Always handle the `req.on('close')` event to clean up intervals and listeners when the client disconnects, ensuring your server remains performant and free of memory leaks.

## Langkah Belajar Berikutnya

- "Real-Time Communication in Express with Socket.IO" (to compare SSE with two-way WebSocket communication).
- "Handling Background Jobs in Express JS with BullMQ and Redis" (to learn how to notify clients via SSE when a background job completes).
- "Scaling Node.js Applications with Redis Pub/Sub" (to manage SSE connections across multiple server instances).

## Metadata

- Level: Intermediate
- Topik utama: Real-Time Communication
- Topik terkait: Express.js, HTTP, Performance
- Kata kunci: sse, server-sent events, real-time, express, eventsource, http streaming
- Estimasi waktu baca: 10 menit

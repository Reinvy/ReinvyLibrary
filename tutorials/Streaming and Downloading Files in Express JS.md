# Streaming and Downloading Files in Express JS

## Ringkasan Singkat

This material explains the different methods to serve files to clients in Express.js. You will learn how to prompt file downloads using `res.download()`, serve static files using `res.sendFile()`, and efficiently handle large file transfers using Node.js Streams to optimize memory usage and performance.

## Untuk Siapa Materi Ini

- **Target Audience:** Backend developers who need to serve or transfer files from an Express application to clients.
- **Level:** Intermediate.

## Prasyarat

- Understanding of basic Express.js concepts (Routing and Middleware).
- Familiarity with the Node.js `fs` (File System) module.
- Basic understanding of how HTTP requests and responses work.

## Tujuan Belajar

After completing this material, you will be able to:

- Prompt clients to download files using `res.download()`.
- Serve static files directly to the browser using `res.sendFile()`.
- Understand the concept of Node.js Streams and why they are necessary for handling large files.
- Implement file streaming using `fs.createReadStream()` and `.pipe()`.

## Konteks dan Motivasi

In many web applications, serving files to users is a fundamental requirement. This could be anything from generating and downloading a PDF invoice, serving an image, or providing large video files. While sending small files is straightforward, sending large files incorrectly can consume all available server memory and cause the application to crash.

Express provides built-in methods for simple file serving, but understanding when to use these methods versus when to drop down to native Node.js Streams is crucial for building scalable, high-performance backends.

## Materi Inti

### 1. Forcing File Downloads with `res.download()`

When you want the user's browser to prompt a "Save As" dialog rather than displaying the file in the browser, use `res.download()`. This method automatically sets the appropriate headers (like `Content-Disposition: attachment`) and handles the file transfer.

```javascript
const express = require('express');
const path = require('path');
const app = express();

app.get('/download/invoice', (req, res) => {
  // Construct the absolute path to the file
  const filePath = path.join(__dirname, 'files', 'invoice-123.pdf');

  // Send the file as an attachment
  res.download(filePath, 'Your_Invoice.pdf', (err) => {
    if (err) {
      // Handle error, but don't expose internal paths to the client
      console.error('File download failed:', err);
      if (!res.headersSent) {
        res.status(500).send('Could not download the file.');
      }
    }
  });
});
```

### 2. Serving Files to the Browser with `res.sendFile()`

If you want the file to be displayed within the browser (like showing an image or opening a PDF in a new tab) rather than forcing a download, use `res.sendFile()`. It sets the correct `Content-Type` header based on the file extension.

```javascript
app.get('/view/image', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'logo.png');

  // Note: res.sendFile requires an absolute path unless you set the 'root' option
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(err.status || 500).send('Error serving file');
    }
  });
});
```

### 3. Handling Large Files with Node.js Streams

Both `res.download()` and `res.sendFile()` are convenient and suitable for most files. However, under the hood, if you try to read a massive file (e.g., a 2GB video) into memory all at once using `fs.readFile`, your server will run out of RAM and crash.

**Streams** allow you to read a file chunk by chunk and send it to the client as it's being read. Because Express's `res` object is a Writable Stream, you can `pipe()` a Readable Stream (the file) directly into it.

```javascript
const fs = require('fs');

app.get('/stream/video', (req, res) => {
  const filePath = path.join(__dirname, 'media', 'large-video.mp4');

  // Optional: Get file stats to set headers (like Content-Length)
  fs.stat(filePath, (err, stats) => {
    if (err) {
      return res.status(404).send('Video not found');
    }

    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': 'video/mp4',
    });

    // Create a read stream and pipe it to the response
    const readStream = fs.createReadStream(filePath);

    readStream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      res.end(); // Close the connection if an error occurs
    });

    readStream.pipe(res);
  });
});
```

## Contoh / Ilustrasi

Imagine you are filling a swimming pool (the client's browser) with water from a massive reservoir (a large file on your server).

- Using `fs.readFile()` is like trying to lift the entire reservoir at once to pour it into the pool. You will likely break your back (the server crashes from out-of-memory errors).
- **Streaming** (`fs.createReadStream().pipe(res)`) is like connecting a hose from the reservoir to the pool. The water flows continuously chunk by chunk. Your server only needs enough memory to hold the water currently in the hose, making it highly efficient regardless of the reservoir's size.

## Insight Penting

- **Always Use Absolute Paths:** When using `res.sendFile()` or `res.download()`, always provide an absolute path to prevent directory traversal attacks. Use `path.join(__dirname, '...')`.
- **Set Headers Carefully:** When streaming files manually, ensure you set the correct `Content-Type`. If you want a stream to trigger a download, add `'Content-Disposition': 'attachment; filename="file.ext"'` to your headers.
- **Clean Up on Errors:** When using streams, listen for the `'error'` event on the read stream to gracefully close the response (`res.end()`) if the file read fails mid-way, preventing the client from hanging indefinitely.
- **Use `express.static()` for Static Assets:** For serving static frontend files (CSS, JS, images), do not manually create routes with `res.sendFile()`. Instead, use the built-in `express.static('public')` middleware.

## Ringkasan Akhir

- Use `res.download(path)` to force the client browser to download a file.
- Use `res.sendFile(path)` to send a file for the browser to render or display.
- Use `fs.createReadStream(path).pipe(res)` to stream large files chunk-by-chunk, protecting your server's memory.

## Langkah Belajar Berikutnya

- [Handling File Uploads in Express JS with Multer](Handling%20File%20Uploads%20in%20Express%20JS%20with%20Multer.md) (Learn the reverse process: receiving files from the client).
- Explore HTTP Range Requests to allow pausing and resuming video streams or large downloads.

## Metadata

- Level: Intermediate
- Topik utama: Express.js, File Handling
- Topik terkait: Streams, Node.js Core, HTTP Headers
- Kata kunci: res.download, res.sendFile, nodejs streams, pipe, file serving
- Estimasi waktu baca: 8 - 10 minutes

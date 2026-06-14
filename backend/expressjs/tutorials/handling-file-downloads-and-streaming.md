---
title: "Handling File Downloads and Streaming in Express JS"
description: "This material covers how to effectively handle file downloads and stream large files in Express.js. You will learn the difference between sending small files as"
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Handling File Downloads and Streaming in Express JS

## Summary

This material covers how to effectively handle file downloads and stream large files in Express.js. You will learn the difference between sending small files as attachments and streaming large files efficiently to optimize memory usage and improve client performance.

## Target Audience

- **Target Audience:** Backend developers who need to serve files to clients, especially large files like videos, audio, or large documents.
- **Level:** Intermediate.

## Prerequisites

- Basic understanding of Express.js routing and middleware.
- Familiarity with the Node.js `fs` (File System) module.
- Completion of the [Handling File Uploads in Express JS with Multer](Handling%20File%20Uploads%20in%20Express%20JS%20with%20Multer.md) tutorial is recommended.

## Learning Objectives

After completing this material, you will be able to:

- Use `res.download()` to prompt clients to download files.
- Understand the difference between `res.sendFile()` and `res.download()`.
- Use Node.js streams to serve large files efficiently.
- Implement partial content delivery (HTTP 206) for streaming media like videos.

## Context and Motivation

While building web applications, you will often need to allow users to download files, such as reports, invoices, or media. For small files, simple methods work fine. However, loading a massive 1GB video file into server memory before sending it to the client will cause your Express server to crash due to out-of-memory errors.

Streaming solves this by reading the file in small chunks and sending them to the client piece by piece. This keeps memory usage low and allows the client to start processing the data immediately, which is essential for video streaming or downloading large assets.

## Core Content

### 1. Sending Simple Downloads

If you have a relatively small file and want to force the browser to download it (instead of displaying it in the browser window), Express provides the `res.download()` method. This method automatically sets the `Content-Disposition` header to `attachment`.

```javascript
const express = require('express');
const path = require('path');
const app = express();

app.get('/download/report', (req, res, next) => {
  const filePath = path.join(__dirname, 'files', 'annual_report.pdf');

  // res.download(path, filename, callback)
  res.download(filePath, 'Report_2023.pdf', (err) => {
    if (err) {
      // Handle error, but don't expose internal paths
      console.error('File download failed:', err.message);
      if (!res.headersSent) {
        res.status(404).send('File not found or an error occurred.');
      }
    }
  });
});
```

### 2. Using `res.sendFile()`

If you want to display the file in the browser (e.g., an image or a PDF) rather than forcing a download, use `res.sendFile()`. It sets the appropriate `Content-Type` header based on the file extension.

```javascript
app.get('/view/image', (req, res) => {
  const imagePath = path.join(__dirname, 'images', 'logo.png');
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Error sending file:', err.message);
      res.status(404).send('Image not found.');
    }
  });
});
```

### 3. Streaming Large Files

For very large files, reading the entire file into memory using `fs.readFile` is dangerous. Instead, we use Node.js `fs.createReadStream` and pipe it to the response object (`res`), which is a writable stream.

```javascript
const fs = require('fs');

app.get('/stream/large-file', (req, res) => {
  const filePath = path.join(__dirname, 'files', 'large_dataset.csv');

  // Set appropriate headers
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="dataset.csv"');

  const fileStream = fs.createReadStream(filePath);

  // Pipe the read stream to the response writable stream
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error('Stream error:', err.message);
    res.status(500).send('Error streaming file.');
  });
});
```

### 4. Video Streaming with Partial Content (HTTP 206)

To allow scrubbing (skipping forward/backward) in a video player, you must handle the HTTP `Range` header and respond with a `206 Partial Content` status.

```javascript
app.get('/video', (req, res) => {
  const videoPath = path.join(__dirname, 'videos', 'sample.mp4');

  // Ensure the file exists before attempting to read stats
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('Video not found');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Parse Range
    // Example: "bytes=32324-"
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);

    file.on('error', (err) => {
      console.error('Stream error:', err.message);
    });
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});
```

## Code Examples

Imagine you are serving soup at a restaurant.

- **`res.download` / `fs.readFile`:** This is like trying to serve an entire giant cauldron of soup in a single massive bowl to the customer. It might spill, break the bowl, or the waiter might drop it (Out of Memory).
- **Streaming (`fileStream.pipe(res)`):** This is like using a ladle to continuously pour soup from the cauldron into the customer's bowl bit by bit. It’s manageable, efficient, and ensures the soup safely reaches the customer without overwhelming anyone.
- **Partial Content (Range Requests):** The customer says, "I only want the bottom half of the soup." You measure exactly where the bottom half starts and only serve them that specific portion.

## Key Insights

- **Always handle errors in streams:** If the file doesn't exist or permissions are denied, an unhandled stream error will crash your Node.js application. Always listen for the `'error'` event on your streams.
- **`res.download` uses streams internally:** Express is smart enough to use streams under the hood for `res.download()` and `res.sendFile()`. However, manually using `createReadStream` gives you more control, especially for things like progress tracking, on-the-fly compression, or handling `Range` requests for media.
- **Security:** Never construct file paths directly using user input (e.g., `path.join(__dirname, req.query.fileName)`). This leads to Path Traversal vulnerabilities where an attacker could download sensitive files like `/etc/passwd`. Always sanitize filenames and restrict them to a specific directory.

## Conclusion

- Use `res.download()` to force file downloads with ease.
- Use `res.sendFile()` to display files natively in the browser.
- Use `fs.createReadStream()` paired with `res` for handling large files manually to prevent server memory exhaustion.
- Implement Range requests to support video/audio streaming and scrubbing functionality.

## Next Steps

- Learn how to compress streamed data on-the-fly using the built-in Node.js `zlib` module.
- Explore storing and streaming files directly from Cloud Storage (like AWS S3) instead of the local file system.

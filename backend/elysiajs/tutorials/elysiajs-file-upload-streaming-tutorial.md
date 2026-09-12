---
title: "Elysia.js File Upload and Streaming Tutorial"
description: "An intermediate tutorial on handling file uploads and streaming responses with Elysia.js and Bun — covering @elysiajs/multipart, upload validation, ReadableStream, and a complete image upload plus JSON streaming example."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Elysia.js File Upload and Streaming Tutorial

## Summary

This tutorial shows how to accept file uploads and produce streaming responses with Elysia.js running on Bun. You will validate images with `@elysiajs/multipart`, save them to disk safely, and then build an NDJSON (newline-delimited JSON) streaming endpoint — ending with a single runnable app that uploads images and streams processing results back to the client.

## Target Audience

- Backend Developers building APIs with Bun and Elysia.js.
- Intermediate level. Basic TypeScript and HTTP knowledge is assumed.

## Prerequisites

- Bun 1.1+ installed (`curl -fsSL https://bun.sh/install | bash`) and a fresh project via `bun create elysia upload-demo`.
- Understanding of HTTP multipart/form-data and the Fetch `Request`/`Response` web standards.
- An API client that can send multipart data and read NDJSON streams (curl or Insomnia).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Parse multipart uploads with the `@elysiajs/multipart` plugin.
- Validate file types, sizes, and field presence with schema and manual checks.
- Save uploaded files safely with `Bun.write` and unique filenames.
- Build streaming responses with `ReadableStream` and `TextEncoder`.
- Stream NDJSON so clients consume events as they arrive.
- Handle upload and stream errors with Elysia's `onError` hook.

## Context and Motivation

File uploads are everywhere — profile pictures, documents, videos — but a naive "read the whole file into memory" approach collapses under real load. A 200 MB video would consume a huge chunk of RAM per request, and clients that must wait for an entire response before seeing anything create a poor UX for slow jobs like image resizing or report generation.

Elysia.js, built on Bun, leans into the web platform: multipart parsing is handled by the `@elysiajs/multipart` plugin, uploads arrive as `File` objects that can be streamed to disk instead of buffered, and responses are plain web `ReadableStream`s. That combination lets you build memory-efficient uploads and progressive, event-driven endpoints — like an endpoint that streams back per-image processing status instead of a single blocking JSON blob — without pulling in heavy framework machinery.

## Core Content

### The @elysiajs/multipart Plugin

Install it with `bun add @elysiajs/multipart`. When applied to a route's `body` schema, each file field of the multipart form is exposed as a standard `File` object. The plugin supports limits via `multipart({ limits: { fileSize, files, fields, parts } })`; when a limit is exceeded, the request is rejected before your handler runs.

### Upload Validation

Two layers of validation matter. Schema validation rejects requests with the wrong shape (missing field, wrong type) with a 422. Content validation — checking `file.type` against an allowlist and enforcing a maximum size — protects against malicious payloads that are technically correct multipart bodies. Never trust the client's declared MIME type alone; check the magic bytes if the upload is security-sensitive.

### Streaming Responses

A streaming response returns a `Response` whose body is a `ReadableStream`. The server writes chunks with `controller.enqueue()`, and the client receives data incrementally. For JSON, use NDJSON: one JSON object per line, with a trailing newline as the frame delimiter — easy for clients to parse line-by-line and ideal for progress events.

## Code Examples

Install the plugin and scaffold the upload directory:

```bash
bun add @elysiajs/multipart && mkdir -p uploads
```

`src/index.ts` — image upload with validation, plus an NDJSON streaming endpoint:

```typescript
import { Elysia } from 'elysia'
import { multipart } from '@elysiajs/multipart'
import { randomUUID } from 'node:crypto'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UPLOAD_DIR = './uploads'

const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return { error: 'Invalid request', detail: error.message }
    }
    set.status = 500
    return { error: 'Internal error', detail: (error as Error).message }
  })
  .post(
    '/upload',
    async ({ body }) => {
      const file = body.file
      // Content-level validation: type and size — never trust the client alone
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error(`Unsupported image type: ${file.type}`)
      }
      if (file.size > MAX_SIZE) {
        throw new Error(`Image exceeds ${MAX_SIZE / 1024 / 1024} MB limit`)
      }
      const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
      const filename = `${randomUUID()}.${ext}`
      const destination = `${UPLOAD_DIR}/${filename}`
      // Stream to disk in chunks instead of buffering the whole file
      await Bun.write(destination, file.stream())
      return { ok: true, filename, size: file.size, url: `/files/${filename}` }
    },
    {
      body: multipart({ limits: { fileSize: MAX_SIZE, files: 1, fields: 2 } })
    }
  )
  .get('/process', () => {
    // NDJSON stream: report progress per item, not one blocking response
    const encoder = new TextEncoder()
    const tasks = ['resize', 'optimize', 'hash', 'upload']
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for (const task of tasks) {
            controller.enqueue(encoder.encode(JSON.stringify({ status: 'processing', task }) + '\n'))
            await Bun.sleep(250) // simulate real work
          }
          controller.enqueue(encoder.encode(JSON.stringify({ status: 'done', tasks }) + '\n'))
        } catch (err) {
          controller.enqueue(encoder.encode(JSON.stringify({ status: 'error', error: (err as Error).message }) + '\n'))
        } finally {
          controller.close()
        }
      }
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    })
  })
  .listen(3000)

console.log(`Upload demo running at http://localhost:${app.server?.port}`)
```

Test the upload:

```bash
curl -s -X POST http://localhost:3000/upload \
  -F "file=@photo.png" | bun -e 'console.log(await Bun.stdin.json())'
```

Consume the NDJSON stream as events arrive:

```bash
curl -s -N http://localhost:3000/process
# {"status":"processing","task":"resize"}
# {"status":"processing","task":"optimize"}
# ...one line per second, streamed incrementally
```

## Key Insights

- Apply `limits` in `multipart()` — checking size only inside the handler still buffers the oversized body first, wasting memory.
- `Bun.write(destination, file.stream())` writes chunks as they arrive; `await file.arrayBuffer()` on a 200 MB file spikes memory. Stream whenever files can be large.
- Use the plugin's `isFile` helper to distinguish files from text fields when a form mixes both (e.g., `file` plus a `caption` string).
- Use a UUID or timestamp in stored filenames; never trust the original name, which may contain path traversal sequences (`../`).
- NDJSON framing (one JSON object per line) is the lowest-friction streaming JSON format. Always set an explicit `Content-Type` and consider `Cache-Control: no-store` so intermediaries do not buffer the response.

## Next Steps

- Explore Elysia's built-in `stream` helper and `ServerSentEvents` plugin for SSE (event-streaming) use cases.
- Add authentication to uploads with `bearer` or JWT plugins, per-user storage quotas, and `Bun.file()` range requests for efficient file serving.

## Conclusion

You built a memory-efficient image upload endpoint with `@elysiajs/multipart`, correct type and size validation, and safe disk storage — plus an NDJSON streaming endpoint that pushes progress events instead of a single blocking response. These two patterns cover the large majority of real-world media and live-data APIs on the Bun + Elysia stack.

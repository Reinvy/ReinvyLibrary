---
title: "Bun File I/O and Stream Processing Guide"
description: "A comprehensive guide to Bun's native file I/O APIs and stream processing capabilities — covering efficient file reading and writing, streaming data through pipelines, shell command integration, and production-grade file processing patterns."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Bun File I/O and Stream Processing Guide

## Introduction

Bun provides a modern, high-performance set of file system and stream processing APIs that are significantly faster than Node.js equivalents. Built on top of the JavaScriptCore engine and leveraging native system calls like `copy_file_range` and `sendfile`, Bun's I/O operations avoid unnecessary data copying between kernel and user space. This guide covers production-ready patterns for reading and writing files, streaming data, integrating shell commands with `Bun.$`, and building efficient data processing pipelines — all using Bun's native APIs.

## Best Practices

- **Prefer `Bun.file()` over `fs.readFile()`** — `Bun.file()` returns a `BunFile` object that lazily reads metadata without blocking. It supports `text()`, `json()`, `arrayBuffer()`, `stream()`, and `bytes()` methods, each optimized for the specific data format. Unlike Node.js `fs.readFile`, which buffers the entire file into memory, `Bun.file()` can stream data directly from disk.

- **Use `Bun.write()` for efficient file writes** — `Bun.write()` automatically selects the fastest write strategy based on the output destination (file path, file descriptor, `BunFile`, `S3File`, or `Response`). It accepts strings, `Uint8Array`, `Blob`, `Response`, and `BunFile` as input, eliminating manual serialization in most cases.

- **Leverage `Bun.file().stream()` for large file processing** — When working with files larger than available memory, use the streaming API to process data in chunks. Bun's streams implement the Web Streams API (`ReadableStream`, `WritableStream`, `TransformStream`), making them compatible with browser-standard stream patterns while running at native speed.

- **Use `Bun.$` for shell-level file operations** — Bun's template tag function `Bun.$` runs shell commands directly from TypeScript/JavaScript without spawning a child process in most cases. It supports piping, `Bun.file()` as stdin/stdout, and automatic string-to-Buffer conversion, making it ideal for glue operations like `grep`, `sed`, `awk`, and pipeline composition.

- **Stream multipart uploads directly from disk** — When serving large files over HTTP, pass a `BunFile` directly as the body of a `Response` object. Bun automatically uses the `sendfile` system call to stream file contents with zero-copy efficiency, avoiding the memory overhead of reading the entire file into a buffer.

- **Process structured data with `Bun.file().json()` and `Bun.file().text()`** — For configuration files, JSON datasets, and text-based formats, use the typed reader methods on `BunFile`. They return `Promise` values that resolve with the parsed content, integrating naturally with Bun's first-class async/await support.

- **Pipeline shell commands with `Bun.$` composition** — Chain multiple `Bun.$` invocations by passing the `stdout` of one command as the `stdin` of another. This creates efficient Unix-style pipelines entirely in JavaScript, without the overhead of intermediate files or manual buffer management.

- **Handle binary data with `Uint8Array` and `Buffer`** — While Bun prefers `Uint8Array` for binary data, it maintains compatibility with Node.js `Buffer`. For maximum performance with Bun's native APIs, use `Uint8Array` directly — Bun's file methods natively return and accept typed arrays without conversion overhead.

- **Monitor file system changes with `Bun.file()` and polling** — Bun does not yet include a built-in file watcher, but you can efficiently poll file metadata using `Bun.file().lastModified` and `Bun.file().size`. For cross-platform file watching, consider combining `fs.watch` (from Node.js compatibility) with Bun's `Bun.file()` for the actual I/O.

- **Use `Bun.write()` with `Response` for HTTP caching** — When fetching remote resources, pass the `Response` object directly to `Bun.write()` to save the response body to disk. Bun streams the response data through the native HTTP client directly to the file system without buffering the entire payload in memory.

## Implementation Steps

### Step 1: Reading Files with `Bun.file()`

The `Bun.file()` function creates a `BunFile` reference without immediately reading the file into memory. This lazy evaluation lets you inspect file metadata before deciding how to read the content.

```typescript
import { BunFile } from "bun";

// Create a BunFile reference (lazy — no disk I/O yet)
const file: BunFile = Bun.file("./data/config.json");

// Read metadata without loading content
console.log("Size:", file.size, "bytes");
console.log("Type:", file.type);       // MIME type
console.log("Modified:", file.lastModified); // Unix timestamp

// Read content using typed methods
const config = await file.json();
console.log("Config:", config);

// Alternative reading strategies:
const text = await Bun.file("./data/readme.txt").text();
const buffer = await Bun.file("./data/image.png").arrayBuffer();
const raw = await Bun.file("./data/data.bin").bytes();
```

For large files that exceed available memory, always use the streaming API:

```typescript
const stream = Bun.file("./data/large-dataset.csv").stream();
const reader = stream.getReader();
const decoder = new TextDecoder();
let headerRow = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  headerRow += decoder.decode(value, { stream: true });
  // Process chunk incrementally
  const lines = headerRow.split("\n");
  headerRow = lines.pop() || ""; // Keep incomplete line for next chunk
  for (const line of lines) {
    processRow(line);
  }
}
```

### Step 2: Writing Files with `Bun.write()`

`Bun.write()` provides a unified interface for writing data to various destinations. The function automatically selects the optimal write strategy based on the destination type.

```typescript
import { BunFile } from "bun";

// Write a string to a file
await Bun.write("./output/hello.txt", "Hello, Bun!");

// Write JSON data (auto-serialized via BunFile)
const data = { user: "bun", version: 1, features: ["file", "stream", "shell"] };
await Bun.write("./output/data.json", JSON.stringify(data, null, 2));

// Write a Blob or Uint8Array to disk
const blob = new Blob(["<html><body>Bun</body></html>"], { type: "text/html" });
await Bun.write("./output/page.html", blob);

// Write to a file descriptor
const fd = Bun.file("./output/log.txt");
await Bun.write(fd, "Appended log entry\n");

// Efficient file copy using copy_file_range syscall
await Bun.write(Bun.file("./backup/config.json"), Bun.file("./data/config.json"));
```

For appending to existing files without overwriting:

```typescript
import { open } from "node:fs/promises";

// Open file in append mode using Node.js compatibility API
const fileHandle = await open("./output/app.log", "a");
await fileHandle.writeFile("[INFO] Application started\n");
await fileHandle.close();

// Or use Bun.file() with explicit read-then-write for small files
const existing = await Bun.file("./output/counter.txt").text().catch(() => "0");
const count = parseInt(existing, 10) + 1;
await Bun.write("./output/counter.txt", String(count));
```

### Step 3: Building Stream Processing Pipelines

Bun implements the Web Streams API natively, enabling composable stream processing without external dependencies.

```typescript
// Create a transform stream for line-by-line processing
const lineSplitter = new TransformStream<string, string>({
  transform(chunk, controller) {
    // Buffer partial lines across chunks
    this.buffer = (this.buffer || "") + chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || ""; // Keep incomplete last line
    for (const line of lines) {
      controller.enqueue(line);
    }
  },
  flush(controller) {
    if (this.buffer) controller.enqueue(this.buffer);
  },
});

// Pipe a file through a processing pipeline
async function processLogFile(inputPath: string, outputPath: string) {
  const source = Bun.file(inputPath).stream();
  const sink = new WritableStream<string>({
    async write(line) {
      const parsed = parseLogLine(line);
      if (parsed.level === "ERROR") {
        await Bun.write(
          Bun.file("./output/errors.log"),
          JSON.stringify(parsed) + "\n",
        );
      }
    },
  });

  await source
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(lineSplitter)
    .pipeTo(sink);
}
```

For JSON array streaming — processing large JSON arrays element by element without loading the entire array into memory:

```typescript
async function* streamJsonArray(filePath: string) {
  const stream = Bun.file(filePath).stream();
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let depth = 0;
  let elementStart = -1;

  while (true) {
    const { done, value } = await reader.read();
    if (done && buffer.length === 0) break;

    buffer += value || "";

    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];
      if (char === "{" && depth === 1 && elementStart === -1) {
        elementStart = i;
      }
      if (char === "{") depth++;
      if (char === "}") depth--;
      if (depth === 1 && char === "}" && elementStart !== -1) {
        yield JSON.parse(buffer.slice(elementStart, i + 1));
        elementStart = -1;
      }
    }

    // Keep only unprocessed portion
    buffer = elementStart !== -1 ? buffer.slice(elementStart) : "";
    if (elementStart !== -1) {
      elementStart = 0; // Reset relative to new buffer start
    }
  }
}

// Usage
for await (const item of streamJsonArray("./data/large-array.json")) {
  console.log("Item:", item);
}
```

### Step 4: Integrating Shell Commands with `Bun.$`

Bun's `Bun.$` template tag provides shell integration without spawning a child process, using native system calls for common commands.

```typescript
import { $ } from "bun";

// Run a simple shell command
const result = await $`echo "Hello from Bun"`;
console.log(result.stdout.toString()); // "Hello from Bun\n"
console.log(result.exitCode);          // 0

// Pass BunFile as stdin
const input = Bun.file("./data/input.csv");
const grepResult = await $`grep "ERROR" ${input}`;
console.log("Matching lines:", grepResult.stdout.toString());

// Capture stdout as BunFile output
await $`ls -la ./data`.stdout(Bun.file("./output/file-list.txt"));

// Build a multi-command pipeline
const pipeline = await $`
  cat ${Bun.file("./data/access.log")} |
  grep "500" |
  awk '{print $1, $7}' |
  sort | uniq -c | sort -rn |
  head -10
`;
console.log("Top 500 error endpoints:\n", pipeline.stdout.toString());

// Pipe data between Bun.$ processes
const process1 = $`cat ./data/large-file.csv`;
const process2 = $`wc -l`;
// This counts lines using a pipe between the two processes
const lineCount = await $`${process1} | ${process2}`;
console.log("Lines:", parseInt(lineCount.stdout.toString(), 10));

// Handle shell command failures with typed errors
try {
  await $`cat ./nonexistent-file.txt`;
} catch (err: any) {
  console.error("Shell command failed:", err.stderr?.toString());
  console.error("Exit code:", err.exitCode);
}
```

### Step 5: Serving Files Over HTTP with Zero-Copy Streaming

Bun's HTTP server can stream files directly from disk using the `sendfile` syscall, achieving near-zero memory overhead for file serving.

```typescript
const server = Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);
    const filePath = `./public${url.pathname}`;

    // Try to serve the file
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      return new Response("Not Found", { status: 404 });
    }

    // Return the BunFile directly — Bun streams it via sendfile
    return new Response(file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(file.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
```

For streaming large generated responses (e.g., CSV export):

```typescript
async function* generateCSV() {
  yield "id,name,email\n";
  for (let i = 1; i <= 100_000; i++) {
    yield `${i},user${i}@example.com,user${i}@example.com\n`;
    // Yield control periodically for fair scheduling
    if (i % 1000 === 0) await Bun.sleep(0);
  }
}

Bun.serve({
  port: 3001,
  fetch() {
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of generateCSV()) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=export.csv",
      },
    });
  },
});
```

### Step 6: Processing Multipart File Uploads

Bun handles file uploads efficiently by streaming multipart data directly to disk without buffering the entire payload in memory.

```typescript
const server = Bun.serve({
  port: 3002,
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response("Expected multipart/form-data", { status: 400 });
    }

    const formData = await request.formData();
    const uploadDir = "./uploads";
    const results: string[] = [];

    // Ensure uploads directory exists
    await $`mkdir -p ${uploadDir}`;

    for (const [fieldName, value] of formData.entries()) {
      if (value instanceof File) {
        const filePath = `${uploadDir}/${value.name}`;
        // Write directly from the File object to disk
        await Bun.write(filePath, value);
        results.push(`Saved ${value.name} (${value.size} bytes) to ${filePath}`);
      }
    }

    return new Response(results.join("\n"), { status: 200 });
  },
});
```

### Step 7: Implementing a Log Rotation Utility

Combine file I/O, streams, and shell commands to build a production-grade log rotation utility.

```typescript
async function rotateLog(
  logPath: string,
  maxSizeMB: number = 100,
  maxBackups: number = 5,
) {
  const logFile = Bun.file(logPath);
  const size = logFile.size;
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (size < maxBytes) {
    console.log(`Log file (${(size / 1024 / 1024).toFixed(1)}MB) under limit`);
    return;
  }

  console.log(`Rotating ${logPath} (${(size / 1024 / 1024).toFixed(1)}MB)`);

  // Shift existing backups: remove the oldest
  const oldestBackup = `${logPath}.${maxBackups}`;
  if (await Bun.file(oldestBackup).exists()) {
    await $`rm ${oldestBackup}`;
  }

  // Rename backups: .4→.5, .3→.4, etc.
  for (let i = maxBackups - 1; i >= 1; i--) {
    const oldName = `${logPath}.${i}`;
    const newName = `${logPath}.${i + 1}`;
    if (await Bun.file(oldName).exists()) {
      await $`mv ${oldName} ${newName}`;
    }
  }

  // Rename current log to .1
  await $`mv ${logPath} ${logPath}.1`;

  // Compress the rotated log in the background
  $`gzip ${logPath}.1`.then(() => {
    console.log(`Compressed ${logPath}.1.gz`);
  });

  // Signal the application to reopen its log file handle
  // (Applications should listen for SIGHUP or similar)
  console.log(`Rotation complete. Created ${logPath}.1`);
  console.log("Send SIGHUP to running processes to reopen log handles.");
}
```

### Step 8: Building a Directory Synchronization Script

Use Bun's file I/O and shell integration to build a fast directory sync tool.

```typescript
async function syncDirectories(source: string, dest: string) {
  await $`mkdir -p ${dest}`;

  // Read source directory
  const sourceFiles: string[] = [];
  const dir = Bun.file(source);
  const entries: string[] = [];

  // List files using shell
  const result = await $`find ${source} -type f`.quiet();
  const files = result.stdout.toString().trim().split("\n").filter(Boolean);

  for (const file of files) {
    const relativePath = file.replace(source, "").replace(/^\//, "");
    const destPath = `${dest}/${relativePath}`;
    const destDir = destPath.substring(0, destPath.lastIndexOf("/"));

    // Ensure destination directory exists
    await $`mkdir -p ${destDir}`;

    // Compare modification times
    const sourceStat = Bun.file(file);
    const destStat = Bun.file(destPath);

    const sourceMtime = sourceStat.lastModified;
    const destMtime = destStat.lastModified;

    if (!sourceMtime) {
      console.log(`Skipping ${file}: cannot read source`);
      continue;
    }

    if (!destMtime || sourceMtime > destMtime) {
      await Bun.write(destPath, sourceStat);
      console.log(`Synced: ${relativePath}`);
    }
  }

  console.log(`Sync complete: ${files.length} files checked`);
}

// Usage
await syncDirectories("./src", "./dist/backup");
```

## Key Insights

- **`Bun.file()` is lazy** — Metadata properties like `size` and `lastModified` are cached after the first read. To refresh metadata, create a new `BunFile` instance.
- **Zero-copy file serving** — Passing a `BunFile` as the body of a `Response` enables the `sendfile` syscall, which copies data directly from the file system to the network socket without passing through user-space memory.
- **`Bun.write()` auto-detects destination type** — When writing to a file path (string), it uses the `write` syscall. When writing to a `BunFile`, it uses `copy_file_range` for efficient file-to-file copy. When writing to a `Response`, it streams the data.
- **Shell injection is not automatically escaped** — `Bun.$` passes arguments as positional parameters to the shell, which means variable interpolation follows shell semantics. Always validate or sanitize user input before passing it to `Bun.$`.
- **Stream backpressure is automatic** — Bun's Web Streams implementation handles backpressure natively. When a `ReadableStream` is piped to a slow consumer, Bun automatically pauses reading from the source until the consumer is ready for more data.
- **Large file considerations** — For files larger than 500MB, always use `.stream()` instead of `.text()` or `.json()`. The typed methods load the entire file into memory, which can cause out-of-memory errors on resource-constrained systems.

## Next Steps

After mastering Bun's file I/O and stream processing, explore these related topics:

- Bun WebSocket patterns for real-time data streaming
- Bun SQLite integration for persistent data storage
- Bun's `Bun.build()` for production bundling and asset processing
- Bun test runner for testing file processing pipelines
- Node.js compatibility layer for migrating existing file-processing applications

## Conclusion

This guide covered Bun's native file I/O and stream processing capabilities, from basic file reading and writing with `Bun.file()` and `Bun.write()` to advanced patterns like zero-copy HTTP file serving, shell command integration with `Bun.$`, JSON array streaming, and production-grade log rotation. Bun's efficient file APIs — built on native system calls like `sendfile` and `copy_file_range` — enable developers to build high-performance data processing pipelines with cleaner, more idiomatic code than traditional Node.js approaches.

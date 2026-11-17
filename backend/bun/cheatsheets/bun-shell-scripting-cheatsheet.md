---
title: "Bun Shell Scripting Cheatsheet"
description: "Quick reference for Bun's built-in shell — the $ template tag, output readers, exit-code handling, redirects, environment and cwd control, escaping rules, and .sh script loading."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Bun Shell Scripting Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Import the shell tag | `import { $ } from "bun"` | Runs commands in-process, without spawning `/bin/sh` |
| Silence forwarded output | `.quiet()` | Stops stdout/stderr from being written to the terminal |
| Read stdout as text | `.text()` | Returns a string; implies `.quiet()` |
| Parse stdout as JSON | `.json()` | Applies `JSON.parse` to the captured stdout |
| Iterate stdout lines | `.lines()` | Async iterator that yields one line at a time |
| Read stdout as a Blob | `.blob()` | Convenient for binary payloads |
| Inspect exit codes | `.nothrow()` | Returns `exitCode` instead of throwing |
| Change the global throw policy | `$.nothrow()` and `$.throws(true)` | Applies to every command in the process |
| Set env for one command | `.env({ ...process.env, NODE_ENV: "test" })` | Per-invocation environment |
| Set env globally | `$.env({ CI: "1" })` | Reset by calling `$.env()` with no arguments |
| Set cwd for one command | `.cwd("packages/api")` | Leaves `process.cwd()` untouched |
| Set cwd globally | `$.cwd("packages/api")` | Applies to subsequent commands |
| Escape a string yourself | `$.escape(userInput)` | Same escaping the template tag applies |
| Skip escaping | `{ raw: "value" }` | Interpolation wrapper for trusted static strings |
| Expand braces | `$.braces("echo {1,2,3}")` | Returns the expanded command strings |
| Run a `.sh` file | `bun ./script.sh` | Cross-platform Bun Shell script loader |

## Common Commands

### Executing a Command

```typescript
import { $ } from "bun";

// Output is forwarded to the terminal as the command runs
await $`echo "Hello from Bun Shell"`;

// Capture instead of printing
const branch = await $`git rev-parse --abbrev-ref HEAD`.text();
console.log(branch.trim());
```

### Reading Structured Output

```typescript
import { $ } from "bun";

// JSON produced by a CLI flag
const state = await $`docker inspect --format "{{json .State}}" api`.json();
console.log(state.Running);

// Line-by-line streaming: the loop body runs as lines arrive
for await (const line of $`cat access.log`.lines()) {
  if (line.includes(" 500 ")) console.error(line);
}
```

### Handling Exit Codes

```typescript
import { $, ShellError } from "bun";

try {
  await $`test -f package.json`;
} catch (error) {
  if (error instanceof ShellError) {
    console.error(`failed with exit code ${error.exitCode}`);
    console.error(error.stderr.toString());
  }
}

// No exception: decide what to do with the code yourself
const typecheck = await $`tsc --noEmit`.nothrow().quiet();
if (typecheck.exitCode !== 0) {
  process.exitCode = typecheck.exitCode;
}
```

### Redirecting Streams

```typescript
import { $ } from "bun";

await $`echo "build finished" > build.log`;     // overwrite stdout
await $`echo "done" >> build.log`;               // append stdout
await $`bun run build 2> build.err`;             // stderr only
await $`bun test &> test.log`;                   // stdout and stderr
await $`bun test 2>&1`;                          // merge stderr into stdout
await $`bun run report 1>&2`;                    // send stdout to stderr

// Redirect from and to JavaScript objects
await $`cat < ${Bun.file("./seed.sql")}`;
const buffer = Buffer.alloc(64);
await $`echo "cached" > ${buffer}`;
```

### Piping Between Commands

```typescript
import { $ } from "bun";

const slowest = await $`sort -k2 -nr timings.txt | head -5`.text();
console.log(slowest);

// JavaScript objects can sit on either side of a pipeline
const body = new Response(JSON.stringify({ ok: true }));
const words = await $`cat < ${body} | wc -w`.text();
```

### Setting Environment Variables

```typescript
import { $ } from "bun";

// Inline for a single command
await $`NODE_ENV=production bun run build`;

// Per invocation, inheriting the parent environment
await $`bun test`.env({ ...process.env, DATABASE_URL: "postgres://localhost/test" });

// Global default for the rest of the process
$.env({ ...process.env, CI: "1" });
```

### Changing the Working Directory

```typescript
import { $ } from "bun";

await $`ls`.cwd("packages/api");   // one command only
$.cwd("packages/api");              // every later command
await $`bun run build`;
$.cwd(process.cwd());               // restore
```

### Escaping Untrusted Input

```typescript
import { $ } from "bun";

const filename = "report; rm -rf /.txt";

// Interpolated values are always passed as a single literal argument
await $`ls ${filename}`;

// Escape manually when composing a command string yourself
const safe = $.escape(filename);

// Opt out only for values you fully control
await $`echo ${{ raw: "static && trusted" }}`;
```

### Builtins You Can Rely On

```text
cd   ls    rm     echo   pwd    bun    cat    touch   mkdir
which  mv  exit   true   false  yes    seq    dirname  basename
```

### Writing Standalone Shell Scripts

```bash
# deploy.sh — executed with: bun ./deploy.sh
REV=$(git rev-parse --short HEAD)
echo "Deploying revision $REV"
bun run build
bun run test
```

## Code Snippets

### Deploy Script That Fails Fast

```typescript
import { $, ShellError } from "bun";

const sha = process.env.GIT_SHA;
if (!sha) throw new Error("GIT_SHA is not set");

$.env({ ...process.env, NODE_ENV: "production" });

try {
  await $`bun run build`.quiet();
  await $`bun run test`.quiet();
  await $`docker build -t registry.example.com/api:${sha} .`.quiet();
  await $`docker push registry.example.com/api:${sha}`.quiet();
  console.log(`deployed ${sha}`);
} catch (error) {
  if (error instanceof ShellError) {
    console.error(error.stderr.toString());
    process.exitCode = error.exitCode;
  }
  throw error;
}
```

### Streaming a Live Log

```typescript
import { $ } from "bun";

// Piped stages run concurrently, so lines surface as the child writes them
for await (const line of $`tail -f /var/log/api.log | grep -i error`.lines()) {
  console.log(line);
}
```

### Cross-Platform Clean Script

```typescript
import { $ } from "bun";

// rm and mkdir are builtins, so this also works on Windows
await $`rm -rf dist`;
await $`mkdir -p dist/assets`;
await $`mv public/assets dist/assets`;
```

### Safe Path Handling

```typescript
import { $ } from "bun";

async function listFiles(dir: string) {
  // The value is escaped by the shell; no manual quoting needed
  const result = await $`find ${dir} -maxdepth 1 -type f`.nothrow().quiet();
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString());
  }
  return result.stdout.toString().trim().split("\n");
}
```

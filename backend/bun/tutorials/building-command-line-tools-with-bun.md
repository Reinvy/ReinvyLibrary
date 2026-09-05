---
title: "Building Command-Line Tools with Bun"
description: "A project-based tutorial on building a production-ready task tracker CLI using Bun's built-in APIs — shebang execution, Bun.argv parsing, interactive stdin prompts, JSON persistence with Bun.file, subprocess spawning with Bun.spawn, and compiling a standalone executable with bun build --compile."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building Command-Line Tools with Bun

## Summary

In this project-based tutorial, you will build a fully functional **task tracker CLI** using only Bun's built-in APIs — no `commander`, no `yargs`, no `prompts`, no `pkg`. You will learn how to write executable scripts with the `#!/usr/bin/env bun` shebang, parse arguments with `Bun.argv`, read interactive input from stdin, persist data with `Bun.file()` and atomic writes, spawn subprocesses with `Bun.spawn()`, handle `Ctrl+C` gracefully, and compile everything into a single standalone executable with `bun build --compile`.

## Target Audience

- Backend developers and TypeScript developers who want to build fast, dependency-free command-line tools.
- Developers already familiar with Bun who want to explore its scripting and binary-compilation capabilities.
- Intermediate-level developers comfortable with asynchronous JavaScript and file I/O.

## Prerequisites

- Bun installed on your system (see the [Getting Started with Bun](/backend/bun/tutorials/getting-started-with-bun) tutorial).
- Basic knowledge of TypeScript or JavaScript (ES modules, `async`/`await`, destructuring).
- Comfort using a terminal: running commands, setting file permissions, and reading error output.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Write executable Bun scripts using the `#!/usr/bin/env bun` shebang and `chmod +x`.
- Parse positional arguments and flags from `Bun.argv` without external libraries.
- Read interactive user input from stdin with `Bun.stdin` and a `for await` loop.
- Persist CLI state using `Bun.file()` and atomic rename-based writes.
- Spawn and wait for subprocesses with `Bun.spawn()` and `exited`.
- Handle interruption signals and set meaningful process exit codes.
- Compile a CLI into a standalone executable with `bun build --compile`.
- Publish a Bun CLI to the npm registry with a proper `bin` entry.

## Context and Motivation

Command-line tools are the backbone of developer workflows — scaffolding projects, automating deploys, managing data, and gluing together pipelines. For years, writing a serious CLI in the Node.js ecosystem meant pulling in a stack of dependencies: `commander` or `yargs` for argument parsing, `prompts` or `inquirer` for interactive input, `chalk` for colors, and `pkg` or `nexe` for producing standalone binaries. Each dependency adds install time, audit surface, and version churn.

Bun collapses this stack. The runtime ships with argument access (`Bun.argv`), a full duplex stream API (`Bun.stdin`), a fast file abstraction (`Bun.file`), a subprocess manager (`Bun.spawn`), a signal helper (`Bun.signal`), and a bundler that can emit self-contained executables (`bun build --compile`). Because Bun starts up in milliseconds — powered by JavaScriptCore instead of V8 — even a plain script feels snappy, which matters a lot for tools invoked dozens of times a day.

In this tutorial you will apply these APIs to a realistic product: a task tracker that can add, list, complete, and delete tasks, support interactive confirmation, open a task's details in your `$EDITOR`, and be distributed either as an npm package or as a single compiled binary. The patterns translate directly to real-world tools: release scripts, database seeders, code generators, and deployment utilities.

## Core Content

### Anatomy of a Bun CLI script

A Bun CLI script is an ordinary TypeScript file with one magic addition — a shebang line on the very first line:

```typescript
#!/usr/bin/env bun

console.log("Hello from a Bun CLI!");
```

The shebang tells the operating system which interpreter to use when the file is executed directly. `env bun` resolves the `bun` executable from the `PATH`, which keeps the script portable across machines.

To run the script directly, mark it executable and invoke it by path:

```bash
chmod +x hello.ts
./hello.ts
```

You can also run it explicitly with `bun`:

```bash
bun hello.ts
```

Bun compiles TypeScript and JSX on the fly, so there is no build step for development — you edit, save, and run.

### Reading arguments with Bun.argv

Inside a Bun script, `Bun.argv` holds the command-line arguments:

```text
Bun.argv[0] -> path to the bun binary
Bun.argv[1] -> path to the script being executed
Bun.argv[2] -> first user argument
Bun.argv[3] -> second user argument
...
```

The indexing is a common source of off-by-one errors. A helper that skips the first two entries makes the rest of the code clearer:

```typescript
function userArgs(): string[] {
  return Bun.argv.slice(2);
}
```

For the task tracker you will define simple, predictable commands: `add`, `list`, `done`, `delete`, `open`, and `help`. A tiny dispatcher routes the first argument to the right handler:

```typescript
const args = userArgs();
const command = args[0] ?? "help";

switch (command) {
  case "add":
    await addTask(args.slice(1));
    break;
  case "list":
    await listTasks(args.slice(1));
    break;
  case "done":
    await markDone(args.slice(1));
    break;
  ...
  default:
    printHelp();
}
```

### Setting up the task-tracker project

Create the project directory and initialize it:

```bash
mkdir bun-task-tracker
cd bun-task-tracker
bun init -y
```

The `-y` flag produces a minimal `package.json` and `tsconfig.json`. The final structure looks like this:

```text
bun-task-tracker/
├── package.json
├── tsconfig.json
└── src/
    ├── storage.ts      # JSON load/save helpers
    ├── prompts.ts      # interactive stdin helpers
    └── cli.ts          # argument parsing + command handlers
```

Add a `bin` entry to `package.json` so the CLI can be installed globally and linked as an executable. Also point the `name` at a real package name and add a version:

```json
{
  "name": "task-tracker-bun",
  "version": "1.0.0",
  "module": "src/cli.ts",
  "bin": {
    "task-tracker": "src/cli.ts"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

When npm installs a package with a `bin` entry, it creates a symlink in the global `node_modules/.bin` folder. Because the target file carries the `#!/usr/bin/env bun` shebang, the linked command starts Bun automatically.

### Defining the task model

Each task is a plain object with a stable shape so the JSON store stays predictable:

```typescript
interface Task {
  id: number;
  description: string;
  createdAt: string;
  completedAt: string | null;
  done: boolean;
}
```

The `id` is a monotonically increasing number derived from the highest existing id plus one. `createdAt` and `completedAt` use ISO-8601 strings from `new Date().toISOString()` — always store UTC timestamps and format them only at display time.

### Building the JSON storage module

The storage layer is the backbone of the CLI: it loads the task list from disk, mutates it in memory, and writes it back. Bun's `Bun.file()` gives you a lazy file handle with a built-in `json()` helper:

```typescript
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const DATA_DIR = join(homedir(), ".task-tracker");
const DATA_FILE = join(DATA_DIR, "tasks.json");

export async function loadTasks(): Promise<Task[]> {
  const file = Bun.file(DATA_FILE);
  if (!(await file.exists())) {
    return [];
  }
  return (await file.json()) as Task[];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  await Bun.write(DATA_FILE, JSON.stringify(tasks, null, 2));
}
```

Storing data in the user's home directory (with a dot-prefixed folder) follows the XDG convention for user-level config and keeps the CLI usable from any working directory.

### Writing atomically with a temporary file

A naive `Bun.write` to the destination can leave a truncated file if the process crashes mid-write. The standard fix is a write-to-temp-then-rename sequence. Rename is atomic on POSIX filesystems, so readers always see either the old file or the complete new one:

```typescript
import { renameSync } from "node:fs";

export async function saveTasks(tasks: Task[]): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = join(DATA_DIR, `tasks.json.tmp-${process.pid}`);
  await Bun.write(tmpFile, JSON.stringify(tasks, null, 2));
  renameSync(tmpFile, DATA_FILE);
}
```

Including `process.pid` in the temporary name avoids collisions between concurrent invocations of the CLI.

### Adding a task

The `add` handler reads the description from the remaining arguments, builds a `Task`, appends it, and saves:

```typescript
async function addTask(args: string[]): Promise<void> {
  const description = args.join(" ").trim();
  if (!description) {
    console.error("Usage: task-tracker add <description>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;

  tasks.push({
    id: nextId,
    description,
    createdAt: new Date().toISOString(),
    completedAt: null,
    done: false,
  });

  await saveTasks(tasks);
  console.log(`Added task #${nextId}: ${description}`);
}
```

Note the use of `process.exitCode` instead of `process.exit()`. Setting the exit code lets the script unwind naturally — pending writes and stream flushes complete before the process ends.

### Listing tasks with formatting

The `list` handler sorts open tasks first, then by id, and prints a compact table using `padEnd` for column alignment:

```typescript
async function listTasks(args: string[]): Promise<void> {
  const tasks = await loadTasks();
  if (tasks.length === 0) {
    console.log("No tasks yet. Add one with: task-tracker add <description>");
    return;
  }

  const showAll = args.includes("--all");
  const visible = showAll ? tasks : tasks.filter((t) => !t.done);

  for (const task of visible) {
    const status = task.done ? "[x]" : "[ ]";
    console.log(
      `${String(task.id).padStart(3)} ${status} ${task.description}`,
    );
  }

  const doneCount = tasks.filter((t) => t.done).length;
  console.log(`\n${tasks.length - doneCount} open, ${doneCount} done`);
}
```

Using `padStart` instead of hard-coded spaces keeps the columns aligned even when task ids grow past nine.

### Completing and deleting tasks

Marking a task as done updates its flags and persists the change:

```typescript
async function markDone(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker done <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  task.done = true;
  task.completedAt = new Date().toISOString();
  await saveTasks(tasks);
  console.log(`Completed task #${id}`);
}
```

Deleting is the destructive operation, so it asks for confirmation before touching the file — the interactive prompt helper comes next.

### Reading interactive input from stdin

For the confirmation prompt, read a line from `Bun.stdin`. The `for await` loop yields each chunk; accumulate the chunks until a newline arrives:

```typescript
async function readLine(promptText: string): Promise<string> {
  Bun.stdout.write(promptText);

  let input = "";
  for await (const chunk of Bun.stdin.stream()) {
    const text = new TextDecoder().decode(chunk);
    input += text;
    if (input.includes("\n")) {
      break;
    }
  }

  return input.trim();
}

async function confirm(message: string): Promise<boolean> {
  const answer = (await readLine(`${message} [y/N] `)).toLowerCase();
  return answer === "y" || answer === "yes";
}
```

The default-on-`N` behavior protects users: pressing Enter alone answers "no", which is the safe choice for destructive actions.

### Wiring confirmation into delete

With the helper in place, the delete handler becomes:

```typescript
async function deleteTask(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker delete <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  if (!(await confirm(`Delete task #${id} ("${task.description}")?`))) {
    console.log("Aborted");
    return;
  }

  await saveTasks(tasks.filter((t) => t.id !== id));
  console.log(`Deleted task #${id}`);
}
```

### Opening a task in your editor with Bun.spawn

A handy power feature: open a task's details in the user's preferred editor. `Bun.spawn` starts a subprocess without blocking; awaiting `exited` waits for it to finish:

```typescript
import { Bun } from "bun";

async function openTask(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker open <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  // Write a scratch file with the current details
  const scratch = join(DATA_DIR, `task-${id}.md`);
  const content = [
    `# Task #${id}`,
    "",
    task.description,
    "",
    `Created: ${task.createdAt}`,
    `Completed: ${task.completedAt ?? "not yet"}`,
  ].join("\n");
  await Bun.write(scratch, content);

  const editor = process.env.EDITOR ?? "vi";
  const proc = Bun.spawn([editor, scratch], {
    stdout: "inherit",
    stdin: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}
```

Passing `stdio: "inherit"` for all three streams makes the editor interactive exactly as if it were launched from the shell directly. The `?? "vi"` fallback keeps the tool working on machines where `EDITOR` is unset.

### Handling Ctrl+C with Bun.signal

Interactive subprocesses can leave the terminal in a messy state when interrupted. Register a `SIGINT` handler with `Bun.signal` to clean up and exit politely:

```typescript
import { signal } from "bun";

const sigint = signal("SIGINT");
sigint.addEventListener("unload", () => {
  console.log("\nInterrupted — no changes were lost.");
  process.exit(130);
});
```

Exit code 130 is the conventional "terminated by SIGINT" status (128 + 2), which shell pipelines understand. Because writes go through the atomic save helper, an interruption between edits never corrupts the JSON store.

### Compiling a standalone executable

Bun's bundler can produce a single self-contained executable that embeds the JavaScriptCore runtime. No Node.js or Bun installation is required on the target machine:

```bash
bun build ./src/cli.ts --compile --outfile task-tracker
```

The result is a native binary in the current directory:

```bash
./task-tracker add "ship the release notes"
./task-tracker list
```

Size and startup trade-offs can be tuned with flags:

```text
--minify        minify the embedded JavaScript (smaller binary)
--sourcemap     embed source maps for better stack traces
--bytecode      pre-compile to bytecode (faster cold start)
--target        cross-compile target, e.g. bun-linux-x64, bun-windows-x64
```

Cross-compiling is a standout advantage: you can build a Windows binary from a Linux machine with `--target=bun-windows-x64`, which the old Node.js `pkg` workflow could not do reliably.

### Publishing to npm

When the target audience is other developers, distribute the CLI as a package instead of a binary. With the `bin` entry already in `package.json`, publishing is two commands:

```bash
bun publish
```

Consumers can then install it globally and run `task-tracker` directly:

```bash
bun install -g task-tracker-bun
task-tracker list
```

The `files` field in `package.json` (or the default inclusion rules) ensures `src/cli.ts` and its imports ship together. Because the shebang points at `bun`, the consumer needs Bun installed — for a dependency-free distribution, prefer the compiled executable.

## Code Examples

Here is the complete storage module, `src/storage.ts`:

```typescript
import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Task {
  id: number;
  description: string;
  createdAt: string;
  completedAt: string | null;
  done: boolean;
}

const DATA_DIR = join(homedir(), ".task-tracker");
const DATA_FILE = join(DATA_DIR, "tasks.json");

export async function loadTasks(): Promise<Task[]> {
  const file = Bun.file(DATA_FILE);
  if (!(await file.exists())) {
    return [];
  }
  return (await file.json()) as Task[];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = join(DATA_DIR, `tasks.json.tmp-${process.pid}`);
  await Bun.write(tmpFile, JSON.stringify(tasks, null, 2));
  renameSync(tmpFile, DATA_FILE);
}
```

And the complete interactive prompt helper, `src/prompts.ts`:

```typescript
export async function readLine(promptText: string): Promise<string> {
  Bun.stdout.write(promptText);

  let input = "";
  for await (const chunk of Bun.stdin.stream()) {
    const text = new TextDecoder().decode(chunk);
    input += text;
    if (input.includes("\n")) {
      break;
    }
  }

  return input.trim();
}

export async function confirm(message: string): Promise<boolean> {
  const answer = (await readLine(`${message} [y/N] `)).toLowerCase();
  return answer === "y" || answer === "yes";
}
```

Finally, the entry point `src/cli.ts` that wires everything together:

```typescript
#!/usr/bin/env bun

import { signal } from "bun";
import { loadTasks, saveTasks, type Task } from "./storage";
import { confirm } from "./prompts";

const signalHandler = signal("SIGINT");
signalHandler.addEventListener("unload", () => {
  console.log("\nInterrupted — no changes were lost.");
  process.exit(130);
});

function userArgs(): string[] {
  return Bun.argv.slice(2);
}

async function addTask(args: string[]): Promise<void> {
  const description = args.join(" ").trim();
  if (!description) {
    console.error("Usage: task-tracker add <description>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;

  tasks.push({
    id: nextId,
    description,
    createdAt: new Date().toISOString(),
    completedAt: null,
    done: false,
  });

  await saveTasks(tasks);
  console.log(`Added task #${nextId}: ${description}`);
}

async function listTasks(args: string[]): Promise<void> {
  const tasks = await loadTasks();
  if (tasks.length === 0) {
    console.log("No tasks yet. Add one with: task-tracker add <description>");
    return;
  }

  const showAll = args.includes("--all");
  const visible = showAll ? tasks : tasks.filter((t) => !t.done);

  for (const task of visible) {
    const status = task.done ? "[x]" : "[ ]";
    console.log(
      `${String(task.id).padStart(3)} ${status} ${task.description}`,
    );
  }

  const doneCount = tasks.filter((t) => t.done).length;
  console.log(`\n${tasks.length - doneCount} open, ${doneCount} done`);
}

async function markDone(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker done <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  task.done = true;
  task.completedAt = new Date().toISOString();
  await saveTasks(tasks);
  console.log(`Completed task #${id}`);
}

async function deleteTask(args: string[]): Promise<void> {
  const id = Number(args[0]);
  if (!Number.isInteger(id)) {
    console.error("Usage: task-tracker delete <id>");
    process.exitCode = 1;
    return;
  }

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`Task #${id} not found`);
    process.exitCode = 1;
    return;
  }

  if (!(await confirm(`Delete task #${id} ("${task.description}")?`))) {
    console.log("Aborted");
    return;
  }

  await saveTasks(tasks.filter((t) => t.id !== id));
  console.log(`Deleted task #${id}`);
}

async function printHelp(): Promise<void> {
  console.log(
    [
      "task-tracker — a minimal task tracker built with Bun",
      "",
      "Usage:",
      "  task-tracker add <description>   add a task",
      "  task-tracker list [--all]        list open tasks (or all with --all)",
      "  task-tracker done <id>           mark a task as done",
      "  task-tracker delete <id>         delete a task (asks for confirmation)",
      "  task-tracker help                show this help",
      "",
    ].join("\n"),
  );
}

const args = userArgs();
const command = args[0] ?? "help";

switch (command) {
  case "add":
    await addTask(args.slice(1));
    break;
  case "list":
    await listTasks(args.slice(1));
    break;
  case "done":
    await markDone(args.slice(1));
    break;
  case "delete":
    await deleteTask(args.slice(1));
    break;
  case "help":
  case "--help":
  case "-h":
    await printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
    await printHelp();
}
```

A sample session shows the tool in action:

```text
$ ./task-tracker add "write the tutorial"
Added task #1: write the tutorial
$ ./task-tracker add "publish to npm"
Added task #2: publish to npm
$ ./task-tracker list
  1 [ ] write the tutorial
  2 [ ] publish to npm

2 open, 0 done
$ ./task-tracker done 1
Completed task #1
$ ./task-tracker delete 2
Delete task #2 ("publish to npm")? n
Aborted
$ ./task-tracker list --all
  1 [x] write the tutorial
  2 [ ] publish to npm

1 open, 1 done
```

## Key Insights

- **`Bun.argv` starts at index 2 for user arguments**: `argv[0]` is the Bun binary and `argv[1]` is the script path. Always slice at 2 or you will silently drop the first argument.
- **Atomic writes prevent corrupted state**: write to a temp file and `renameSync` into place. A crash mid-write then leaves the previous good file intact instead of a truncated JSON document.
- **Prefer `process.exitCode` over `process.exit()`**: setting the exit code lets pending async work finish and avoids truncating buffered output.
- **`Bun.spawn` with `stdio: "inherit"` gives full terminal interactivity**: subprocesses like editors receive the real TTY, so key bindings and colors behave as users expect.
- **Compiled binaries remove the runtime requirement**: `bun build --compile` embeds JavaScriptCore, and `--target` even enables cross-platform builds from a single machine.
- **Signals deserve explicit handling**: a `SIGINT` handler that exits with code 130 keeps pipelines well-behaved and lets you run cleanup before the process dies.

## Next Steps

- Read the [Bun Test Runner and Testing Best Practices guide](/backend/bun/guides/bun-test-runner-and-testing-guide) to add unit tests to your CLI's storage and parsing logic.
- Explore the [Bun Production Patterns guide](/backend/bun/guides/bun-production-patterns-guide) for deployment and operational concerns.
- Deepen your knowledge with the [Advanced Bun syllabus](/backend/bun/syllabi/advanced-bun-syllabus), which covers runtime internals and native modules.
- Experiment with `bun:sqlite` (see the [Bun SQLite Database Cheatsheet](/backend/bun/cheatsheets/bun-sqlite-database-cheatsheet)) when your CLI outgrows JSON files and needs real queries.

## Conclusion

You have built a complete, production-shaped command-line tool using nothing but Bun's built-in APIs: shebang execution for instant scripts, `Bun.argv` for argument parsing, `Bun.stdin` for interactive prompts, `Bun.file` plus atomic renames for safe persistence, `Bun.spawn` for subprocess integration, and `bun build --compile` for standalone distribution. The same building blocks power real-world CLIs across the ecosystem — release automation, scaffolding tools, database seeders, and CI helpers. With Bun, the entire toolchain fits in a single runtime with zero runtime dependencies.

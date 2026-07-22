---
title: "Building a Task Management Application with SvelteKit"
description: "Learn how to build a full-stack task management application with SvelteKit, SQLite, authentication, and form actions."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Task Management Application with SvelteKit

## Summary

This tutorial walks through building a complete task management application with SvelteKit. You will create a multi-page app with user authentication, a SQLite database for persistence, and server-side form actions for CRUD operations. By the end, you will have a working application where users can register, log in, and manage their personal task lists.

## Target Audience

- Frontend developers interested in full-stack development with SvelteKit.
- Developers with basic Svelte knowledge who want to learn SvelteKit's server-side features.
- Intermediate level: comfortable with JavaScript and basic web development concepts.

## Prerequisites

- Node.js 18+ and npm installed on your machine.
- Basic knowledge of Svelte (components, reactivity, stores).
- Familiarity with SQL and relational databases is helpful but not required.
- A code editor (VS Code recommended with the Svelte extension).

## Learning Objectives

By the end of this tutorial, you will be able to:
- Scaffold a SvelteKit project from scratch.
- Integrate SQLite with better-sqlite3 for data persistence.
- Implement user registration and login with password hashing using bcrypt.
- Build server-side form actions for creating, updating, and deleting tasks.
- Protect routes with authentication guards using SvelteKit hooks.
- Deploy the finished application to a production environment.

## Context and Motivation

Task management is one of the most common application patterns in web development. It combines essential features found in nearly every production app: user accounts, data persistence, CRUD operations, and protected routes. Building a task manager from scratch with SvelteKit teaches you how these pieces fit together in a modern full-stack context.

SvelteKit is an ideal framework for this because it provides server-side rendering, API endpoints, form actions, and hooks out of the box — all within a single codebase. You do not need a separate backend framework or REST API server.

## Core Content

### Project Scaffolding

Start by creating a new SvelteKit project with the demo app template:

```bash
npm create svelte@latest task-manager
```

Select the following options when prompted:
- **Skeleton project** (not the demo app)
- **Yes** to TypeScript
- **Yes** to ESLint and Prettier

Navigate into the project and install dependencies:

```bash
cd task-manager
npm install
```

### Database Setup with better-sqlite3

Install the database dependencies:

```bash
npm install better-sqlite3 bcrypt
npm install -D @types/better-sqlite3 @types/bcrypt
```

Create a database helper module at `src/lib/server/database.ts`:

```typescript
import Database from 'better-sqlite3';
import type { BetterSqlite3Database } from 'drizzle-orm/better-sqlite3';
import { dev } from '$app/environment';

const dbPath = dev ? 'dev.db' : 'prod.db';
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export { sqlite };
```

### Schema Definition and Migration

Create the schema at `src/lib/server/schema.ts`:

```typescript
export function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
  `);
}
```

Call this initialization function when the app starts. In `src/hooks.server.ts`:

```typescript
import { sqlite } from '$lib/server/database';
import { initializeDatabase } from '$lib/server/schema';

initializeDatabase(sqlite);

// The rest of your hooks...
```

### Authentication Service

Create `src/lib/server/auth.ts` with registration and login functions:

```typescript
import bcrypt from 'bcrypt';
import { sqlite } from './database';

interface User {
  id: number;
  username: string;
}

export function registerUser(username: string, password: string): User {
  const existing = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    throw new Error('Username already exists');
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = sqlite.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).run(username, passwordHash);

  return { id: Number(result.lastInsertRowid), username };
}

export function loginUser(username: string, password: string): User {
  const user = sqlite.prepare(
    'SELECT id, username, password_hash FROM users WHERE username = ?'
  ).get(username) as { id: number; username: string; password_hash: string } | undefined;

  if (!user) {
    throw new Error('Invalid username or password');
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid username or password');
  }

  return { id: user.id, username: user.username };
}
```

### Session Management with Cookies

Create `src/lib/server/session.ts` to manage authentication cookies:

```typescript
import { sqlite } from './database';
import crypto from 'crypto';

interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
}

export function createSession(userId: number): Session {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  sqlite.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(sessionId, userId, expiresAt.toISOString());

  return { id: sessionId, userId, expiresAt };
}

export function getSession(sessionId: string): Session | null {
  const session = sqlite.prepare(
    'SELECT id, user_id as userId, expires_at as expiresAt FROM sessions WHERE id = ? AND expires_at > datetime(\'now\')'
  ).get(sessionId) as Session | undefined;

  return session || null;
}

export function deleteSession(sessionId: string) {
  sqlite.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
```

Update the schema to include the sessions table:

```typescript
export function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);
}
```

### Authentication Hook

Create `src/hooks.server.ts` to load the user from the session cookie on every request:

```typescript
import { sqlite } from '$lib/server/database';
import { initializeDatabase } from '$lib/server/schema';
import { getSession } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

// Initialize database on first load
initializeDatabase(sqlite);

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session');

  if (sessionId) {
    const session = getSession(sessionId);
    if (session) {
      const user = sqlite.prepare(
        'SELECT id, username FROM users WHERE id = ?'
      ).get(session.userId) as { id: number; username: string } | undefined;

      if (user) {
        event.locals.user = { id: user.id, username: user.username };
      }
    }
  }

  const response = await resolve(event);
  return response;
};
```

Add the user type to your app types. Create `src/app.d.ts`:

```typescript
declare global {
  namespace App {
    interface Locals {
      user?: {
        id: number;
        username: string;
      };
    }
  }
}

export {};
```

### Task Service

Create `src/lib/server/tasks.ts`:

```typescript
import { sqlite } from './database';

export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getTasks(userId: number): Task[] {
  const rows = sqlite.prepare(
    'SELECT id, title, description, completed, created_at as createdAt, updated_at as updatedAt FROM tasks WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId) as Task[];

  return rows.map(r => ({ ...r, completed: Boolean(r.completed) }));
}

export function createTask(userId: number, title: string, description: string): Task {
  const result = sqlite.prepare(
    'INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)'
  ).run(userId, title, description);

  return {
    id: Number(result.lastInsertRowid),
    title,
    description,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function updateTask(taskId: number, userId: number, data: { title?: string; description?: string; completed?: boolean }): Task {
  const existing = sqlite.prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).get(taskId, userId) as Record<string, unknown> | undefined;

  if (!existing) {
    throw new Error('Task not found');
  }

  const title = data.title ?? existing.title;
  const description = data.description ?? existing.description;
  const completed = data.completed !== undefined ? (data.completed ? 1 : 0) : existing.completed;

  sqlite.prepare(
    'UPDATE tasks SET title = ?, description = ?, completed = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?'
  ).run(title, description, completed, taskId, userId);

  return {
    id: taskId,
    title,
    description,
    completed: Boolean(completed),
    createdAt: existing.created_at as string,
    updatedAt: new Date().toISOString()
  };
}

export function deleteTask(taskId: number, userId: number): void {
  const result = sqlite.prepare(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?'
  ).run(taskId, userId);

  if (result.changes === 0) {
    throw new Error('Task not found');
  }
}
```

### Page Routes

#### Registration Page

Create `src/routes/register/+page.server.ts`:

```typescript
import { fail, redirect } from '@sveltejs/kit';
import { registerUser } from '$lib/server/auth';
import { createSession } from '$lib/server/session';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const username = data.get('username') as string;
    const password = data.get('password') as string;
    const confirmPassword = data.get('confirmPassword') as string;

    if (!username || username.length < 3) {
      return fail(400, { error: 'Username must be at least 3 characters' });
    }

    if (!password || password.length < 6) {
      return fail(400, { error: 'Password must be at least 6 characters' });
    }

    if (password !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match' });
    }

    try {
      const user = registerUser(username, password);
      const session = createSession(user.id);
      cookies.set('session', session.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }

    throw redirect(303, '/tasks');
  }
};
```

Create `src/routes/register/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  export let form: { error?: string } | null = null;
</script>

<h1>Register</h1>

<form method="POST" use:enhance>
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label>
    Username
    <input type="text" name="username" required minlength={3} />
  </label>

  <label>
    Password
    <input type="password" name="password" required minlength={6} />
  </label>

  <label>
    Confirm Password
    <input type="password" name="confirmPassword" required minlength={6} />
  </label>

  <button type="submit">Register</button>
</form>

<p>Already have an account? <a href="/login">Log in</a></p>

<style>
  form {
    max-width: 400px;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  button {
    padding: 0.75rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .error {
    color: #dc2626;
    padding: 0.5rem;
    background: #fef2f2;
    border-radius: 4px;
  }
</style>
```

#### Login Page

Create `src/routes/login/+page.server.ts`:

```typescript
import { fail, redirect } from '@sveltejs/kit';
import { loginUser } from '$lib/server/auth';
import { createSession } from '$lib/server/session';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const username = data.get('username') as string;
    const password = data.get('password') as string;

    if (!username || !password) {
      return fail(400, { error: 'Username and password are required' });
    }

    try {
      const user = loginUser(username, password);
      const session = createSession(user.id);
      cookies.set('session', session.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7
      });
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }

    throw redirect(303, '/tasks');
  }
};
```

Create `src/routes/login/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  export let form: { error?: string } | null = null;
</script>

<h1>Log In</h1>

<form method="POST" use:enhance>
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label>
    Username
    <input type="text" name="username" required />
  </label>

  <label>
    Password
    <input type="password" name="password" required />
  </label>

  <button type="submit">Log In</button>
</form>

<p>Don't have an account? <a href="/register">Register</a></p>

<style>
  form {
    max-width: 400px;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  button {
    padding: 0.75rem;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .error {
    color: #dc2626;
    padding: 0.5rem;
    background: #fef2f2;
    border-radius: 4px;
  }
</style>
```

#### Logout Action

Create `src/routes/logout/+page.server.ts`:

```typescript
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/session';

export function load() {
  throw redirect(303, '/login');
}

export const actions = {
  default: async ({ cookies, locals }) => {
    const sessionId = cookies.get('session');
    if (sessionId) {
      deleteSession(sessionId);
      cookies.delete('session', { path: '/' });
    }
    throw redirect(303, '/login');
  }
};
```

#### Tasks Page (Protected)

Create `src/routes/tasks/+page.server.ts`:

```typescript
import { fail, redirect } from '@sveltejs/kit';
import { getTasks, createTask, updateTask, deleteTask } from '$lib/server/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  const tasks = getTasks(locals.user.id);
  return { tasks, user: locals.user };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const data = await request.formData();
    const title = data.get('title') as string;
    const description = data.get('description') as string || '';

    if (!title || title.trim().length === 0) {
      return fail(400, { error: 'Title is required' });
    }

    createTask(locals.user.id, title.trim(), description.trim());
    return { success: true };
  },

  update: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const data = await request.formData();
    const taskId = Number(data.get('id'));
    const title = data.get('title') as string;
    const completed = data.get('completed') === 'on';

    if (!taskId) {
      return fail(400, { error: 'Task ID is required' });
    }

    try {
      updateTask(taskId, locals.user.id, { title, completed });
      return { success: true };
    } catch (e) {
      return fail(404, { error: (e as Error).message });
    }
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const data = await request.formData();
    const taskId = Number(data.get('id'));

    if (!taskId) {
      return fail(400, { error: 'Task ID is required' });
    }

    try {
      deleteTask(taskId, locals.user.id);
      return { success: true };
    } catch (e) {
      return fail(404, { error: (e as Error).message });
    }
  }
};
```

Create `src/routes/tasks/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  export let data: {
    tasks: Array<{
      id: number;
      title: string;
      description: string;
      completed: boolean;
      createdAt: string;
    }>;
    user: { username: string };
  };

  let newTitle = '';
  let newDescription = '';
</script>

<h1>Task Manager</h1>
<p>Welcome, {data.user.username}!</p>

<form method="POST" action="?/logout" use:enhance>
  <button type="submit">Log Out</button>
</form>

<h2>New Task</h2>
<form
  method="POST"
  action="?/create"
  use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'success') {
        newTitle = '';
        newDescription = '';
        await invalidateAll();
      }
    };
  }}
>
  <input
    type="text"
    name="title"
    placeholder="Task title"
    required
    bind:value={newTitle}
  />
  <input
    type="text"
    name="description"
    placeholder="Description (optional)"
    bind:value={newDescription}
  />
  <button type="submit">Add Task</button>
</form>

<h2>Your Tasks</h2>

{#if data.tasks.length === 0}
  <p>No tasks yet. Create one above!</p>
{/if}

{#each data.tasks as task (task.id)}
  <div class="task" class:completed={task.completed}>
    <form method="POST" action="?/update" use:enhance>
      <input type="hidden" name="id" value={task.id} />
      <label>
        <input
          type="checkbox"
          name="completed"
          checked={task.completed}
          on:change={() => {
            // Submit the form when checkbox changes
            const form = this.closest('form') as HTMLFormElement;
            form.requestSubmit();
          }}
        />
        <span class:done={task.completed}>{task.title}</span>
      </label>
    </form>

    {#if task.description}
      <p class="description">{task.description}</p>
    {/if}

    <form method="POST" action="?/delete" use:enhance>
      <input type="hidden" name="id" value={task.id} />
      <button type="submit" class="delete">Delete</button>
    </form>
  </div>
{/each}

<style>
  .task {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .task.completed {
    background: #f9fafb;
  }
  .done {
    text-decoration: line-through;
    color: #9ca3af;
  }
  .description {
    color: #6b7280;
    font-size: 0.875rem;
    flex: 1;
  }
  .delete {
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.75rem;
  }
  input, button {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  button[type="submit"] {
    background: #4f46e5;
    color: white;
    border: none;
    cursor: pointer;
  }
</style>
```

### Layout with Navigation

Create `src/routes/+layout.svelte` to provide consistent navigation:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
</script>

<nav>
  <a href="/">Home</a>
  {#if $page.data?.user}
    <a href="/tasks">Tasks</a>
  {:else}
    <a href="/login">Log In</a>
    <a href="/register">Register</a>
  {/if}
</nav>

<main>
  <slot />
</main>

<style>
  nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: #1f2937;
  }
  nav a {
    color: white;
    text-decoration: none;
  }
  nav a:hover {
    text-decoration: underline;
  }
  main {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
</style>
```

Create `src/routes/+layout.server.ts` to pass the user to every page:

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return { user: locals.user };
};
```

## Code Examples

The complete project structure after following this tutorial:

```text
task-manager/
├── src/
│   ├── app.d.ts
│   ├── app.html
│   ├── hooks.server.ts
│   ├── lib/
│   │   └── server/
│   │       ├── auth.ts
│   │       ├── database.ts
│   │       ├── schema.ts
│   │       ├── session.ts
│   │       └── tasks.ts
│   └── routes/
│       ├── +layout.server.ts
│       ├── +layout.svelte
│       ├── login/
│       │   ├── +page.server.ts
│       │   └── +page.svelte
│       ├── logout/
│       │   └── +page.server.ts
│       ├── register/
│       │   ├── +page.server.ts
│       │   └── +page.svelte
│       └── tasks/
│           ├── +page.server.ts
│           └── +page.svelte
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

### Running the Application

```bash
npm run dev
```

Visit `http://localhost:5173`, register a new account, and start managing tasks.

## Key Insights

- **SvelteKit form actions handle both rendering and API logic** — the `+page.server.ts` file acts as both a data loader and an API endpoint, eliminating the need for a separate REST API.
- **Progressive enhancement with `use:enhance`** — your forms work without JavaScript (full page reload) and are progressively enhanced when JavaScript is available, providing a smooth UX without sacrificing accessibility.
- **SQLite with better-sqlite3 is ideal for small to medium apps** — it requires zero configuration and no separate database server, making it perfect for prototyping and small production deployments.
- **The hooks pattern separates concerns cleanly** — `hooks.server.ts` handles authentication on every request without cluttering individual route files.
- **Always hash passwords server-side** — bcrypt with a cost factor of 10 provides adequate protection for user credentials. Never store plain-text passwords.

## Next Steps

- Explore SvelteKit's [official documentation](https://kit.svelte.dev/docs) for advanced patterns like paginated data loading and caching.
- Add a shared task feature to allow users to collaborate on tasks.
- Learn about SvelteKit's adapter system to deploy your app to platforms like Vercel, Netlify, or Node.
- Check out the [Svelte syllabus](/frontend/svelte/syllabi/svelte-syllabus) for a structured learning path.

## Conclusion

You have built a complete, full-stack task management application with SvelteKit. The application includes user registration and login, session-based authentication, a SQLite database for persistence, and full CRUD operations for tasks — all within a single SvelteKit codebase. This pattern applies to a wide range of web applications, from personal productivity tools to small team collaboration platforms.

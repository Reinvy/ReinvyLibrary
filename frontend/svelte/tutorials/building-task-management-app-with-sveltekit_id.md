---
title: "Membangun Aplikasi Manajemen Tugas dengan SvelteKit"
description: "Pelajari cara membangun aplikasi manajemen tugas full-stack dengan SvelteKit, SQLite, autentikasi, dan form actions."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Manajemen Tugas dengan SvelteKit

## Ringkasan

Tutorial ini memandu Anda dalam membangun aplikasi manajemen tugas yang lengkap dengan SvelteKit. Anda akan membuat aplikasi multi-halaman dengan autentikasi pengguna, database SQLite untuk penyimpanan data, dan form actions sisi server untuk operasi CRUD. Di akhir tutorial, Anda akan memiliki aplikasi yang berfungsi di mana pengguna dapat mendaftar, masuk, dan mengelola daftar tugas pribadi mereka.

## Target Audiens

- Pengembang frontend yang tertarik pada pengembangan full-stack dengan SvelteKit.
- Pengembang dengan pengetahuan dasar Svelte yang ingin mempelajari fitur sisi server SvelteKit.
- Level menengah: nyaman dengan JavaScript dan konsep dasar pengembangan web.

## Prasyarat

- Node.js 18+ dan npm terinstal di komputer Anda.
- Pengetahuan dasar tentang Svelte (komponen, reaktivitas, store).
- Keakraban dengan SQL dan database relasional membantu tetapi tidak wajib.
- Editor kode (VS Code direkomendasikan dengan ekstensi Svelte).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Membuat proyek SvelteKit dari awal.
- Mengintegrasikan SQLite dengan better-sqlite3 untuk penyimpanan data.
- Mengimplementasikan registrasi dan login pengguna dengan hashing password menggunakan bcrypt.
- Membangun form actions sisi server untuk membuat, memperbarui, dan menghapus tugas.
- Melindungi rute dengan guard autentikasi menggunakan hooks SvelteKit.
- Men-deploy aplikasi jadi ke lingkungan produksi.

## Konteks dan Motivasi

Manajemen tugas adalah salah satu pola aplikasi paling umum dalam pengembangan web. Ini menggabungkan fitur penting yang ditemukan di hampir setiap aplikasi produksi: akun pengguna, persistensi data, operasi CRUD, dan rute yang dilindungi. Membangun aplikasi manajemen tugas dari awal dengan SvelteKit mengajarkan Anda bagaimana bagian-bagian ini bekerja bersama dalam konteks full-stack modern.

SvelteKit adalah framework yang ideal untuk ini karena menyediakan server-side rendering, endpoint API, form actions, dan hooks langsung dari kotaknya — semuanya dalam satu codebase. Anda tidak memerlukan framework backend terpisah atau server REST API.

## Konten Inti

### Membuat Proyek

Mulai dengan membuat proyek SvelteKit baru menggunakan template skeleton:

```bash
npm create svelte@latest task-manager
```

Pilih opsi berikut saat diminta:
- **Skeleton project** (bukan demo app)
- **Ya** untuk TypeScript
- **Ya** untuk ESLint dan Prettier

Masuk ke direktori proyek dan instal dependensi:

```bash
cd task-manager
npm install
```

### Setup Database dengan better-sqlite3

Instal dependensi database:

```bash
npm install better-sqlite3 bcrypt
npm install -D @types/better-sqlite3 @types/bcrypt
```

Buat modul database di `src/lib/server/database.ts`:

```typescript
import Database from 'better-sqlite3';
import { dev } from '$app/environment';

const dbPath = dev ? 'dev.db' : 'prod.db';
const sqlite = new Database(dbPath);

// Aktifkan mode WAL untuk performa konkuren yang lebih baik
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export { sqlite };
```

### Definisi Skema dan Migrasi

Buat skema di `src/lib/server/schema.ts`:

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

Panggil fungsi inisialisasi ini saat aplikasi dimulai. Di `src/hooks.server.ts`:

```typescript
import { sqlite } from '$lib/server/database';
import { initializeDatabase } from '$lib/server/schema';

initializeDatabase(sqlite);
```

### Layanan Autentikasi

Buat `src/lib/server/auth.ts` dengan fungsi registrasi dan login:

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
    throw new Error('Username sudah digunakan');
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
    throw new Error('Username atau password salah');
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    throw new Error('Username atau password salah');
  }

  return { id: user.id, username: user.username };
}
```

### Manajemen Sesi dengan Cookie

Buat `src/lib/server/session.ts`:

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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

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

### Hook Autentikasi

Di `src/hooks.server.ts`, tambahkan middleware untuk memuat pengguna dari cookie sesi:

```typescript
import { sqlite } from '$lib/server/database';
import { initializeDatabase } from '$lib/server/schema';
import { getSession } from '$lib/server/session';
import type { Handle } from '@sveltejs/kit';

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

Tambahkan tipe user ke app types. Buat `src/app.d.ts`:

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

### Layanan Tugas

Buat `src/lib/server/tasks.ts`:

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
    throw new Error('Tugas tidak ditemukan');
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
    throw new Error('Tugas tidak ditemukan');
  }
}
```

### Halaman Rute

#### Halaman Registrasi

Buat `src/routes/register/+page.server.ts`:

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
      return fail(400, { error: 'Username minimal 3 karakter' });
    }

    if (!password || password.length < 6) {
      return fail(400, { error: 'Password minimal 6 karakter' });
    }

    if (password !== confirmPassword) {
      return fail(400, { error: 'Password tidak cocok' });
    }

    try {
      const user = registerUser(username, password);
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

Buat `src/routes/register/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  export let form: { error?: string } | null = null;
</script>

<h1>Daftar</h1>

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
    Konfirmasi Password
    <input type="password" name="confirmPassword" required minlength={6} />
  </label>

  <button type="submit">Daftar</button>
</form>

<p>Sudah punya akun? <a href="/login">Masuk</a></p>

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

#### Halaman Login

Buat `src/routes/login/+page.server.ts`:

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
      return fail(400, { error: 'Username dan password wajib diisi' });
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

Buat `src/routes/login/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  export let form: { error?: string } | null = null;
</script>

<h1>Masuk</h1>

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

  <button type="submit">Masuk</button>
</form>

<p>Belum punya akun? <a href="/register">Daftar</a></p>

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

#### Aksi Logout

Buat `src/routes/logout/+page.server.ts`:

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

#### Halaman Tugas (Dilindungi)

Buat `src/routes/tasks/+page.server.ts`:

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
      return fail(401, { error: 'Belum terautentikasi' });
    }

    const data = await request.formData();
    const title = data.get('title') as string;
    const description = data.get('description') as string || '';

    if (!title || title.trim().length === 0) {
      return fail(400, { error: 'Judul tugas wajib diisi' });
    }

    createTask(locals.user.id, title.trim(), description.trim());
    return { success: true };
  },

  update: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Belum terautentikasi' });
    }

    const data = await request.formData();
    const taskId = Number(data.get('id'));
    const title = data.get('title') as string;
    const completed = data.get('completed') === 'on';

    if (!taskId) {
      return fail(400, { error: 'ID tugas wajib diisi' });
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
      return fail(401, { error: 'Belum terautentikasi' });
    }

    const data = await request.formData();
    const taskId = Number(data.get('id'));

    if (!taskId) {
      return fail(400, { error: 'ID tugas wajib diisi' });
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

Buat `src/routes/tasks/+page.svelte`:

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

<h1>Manajemen Tugas</h1>
<p>Selamat datang, {data.user.username}!</p>

<form method="POST" action="?/logout" use:enhance>
  <button type="submit">Keluar</button>
</form>

<h2>Tugas Baru</h2>
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
    placeholder="Judul tugas"
    required
    bind:value={newTitle}
  />
  <input
    type="text"
    name="description"
    placeholder="Deskripsi (opsional)"
    bind:value={newDescription}
  />
  <button type="submit">Tambah Tugas</button>
</form>

<h2>Daftar Tugas</h2>

{#if data.tasks.length === 0}
  <p>Belum ada tugas. Buat satu di atas!</p>
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
      <button type="submit" class="delete">Hapus</button>
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

### Layout dengan Navigasi

Buat `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
</script>

<nav>
  <a href="/">Beranda</a>
  {#if $page.data?.user}
    <a href="/tasks">Tugas</a>
  {:else}
    <a href="/login">Masuk</a>
    <a href="/register">Daftar</a>
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

Buat `src/routes/+layout.server.ts`:

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return { user: locals.user };
};
```

## Contoh Kode

Struktur proyek lengkap setelah mengikuti tutorial ini:

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

### Menjalankan Aplikasi

```bash
npm run dev
```

Kunjungi `http://localhost:5173`, daftar akun baru, dan mulailah mengelola tugas.

## Insight Penting

- **Form actions SvelteKit menangani logika rendering dan API sekaligus** — file `+page.server.ts` bertindak sebagai pemuat data dan endpoint API, menghilangkan kebutuhan akan REST API terpisah.
- **Progressive enhancement dengan `use:enhance`** — formulir Anda berfungsi tanpa JavaScript (reload halaman penuh) dan ditingkatkan secara progresif saat JavaScript tersedia, memberikan UX yang mulus tanpa mengorbankan aksesibilitas.
- **SQLite dengan better-sqlite3 ideal untuk aplikasi kecil hingga menengah** — tidak memerlukan konfigurasi dan tidak memerlukan server database terpisah, sempurna untuk prototyping dan deployment produksi kecil.
- **Pola hooks memisahkan concern dengan bersih** — `hooks.server.ts` menangani autentikasi pada setiap permintaan tanpa mengotori file rute individual.
- **Selalu hash password di sisi server** — bcrypt dengan cost factor 10 memberikan perlindungan yang memadai untuk kredensial pengguna. Jangan pernah menyimpan password plain-text.

## Langkah Berikutnya

- Jelajahi [dokumentasi resmi SvelteKit](https://kit.svelte.dev/docs) untuk pola lanjutan seperti pemuatan data terpaginator dan caching.
- Tambahkan fitur tugas bersama untuk memungkinkan pengguna berkolaborasi dalam tugas.
- Pelajari tentang sistem adapter SvelteKit untuk men-deploy aplikasi ke platform seperti Vercel, Netlify, atau Node.
- Lihat [silabus Svelte](/frontend/svelte/syllabi/svelte-syllabus) untuk jalur pembelajaran terstruktur.

## Kesimpulan

Anda telah membangun aplikasi manajemen tugas full-stack yang lengkap dengan SvelteKit. Aplikasi ini mencakup registrasi dan login pengguna, autentikasi berbasis sesi, database SQLite untuk persistensi, dan operasi CRUD penuh untuk tugas — semuanya dalam satu codebase SvelteKit. Pola ini berlaku untuk berbagai aplikasi web, dari alat produktivitas pribadi hingga platform kolaborasi tim kecil.

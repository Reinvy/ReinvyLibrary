---
title: "Cheat Sheet Server Actions dan Formulir Next.js"
description: "Referensi cepat untuk menguasai Server Actions Next.js — mendefinisikan dan memanggil aksi, progressive enhancement dengan formulir native, state dan validasi formulir, UI pending dan optimistik, revalidasi cache, pertimbangan keamanan, serta kapan lebih baik memakai route handler."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Server Actions dan Formulir Next.js

## Tabel Referensi Cepat

| Aksi | Kode / Konfigurasi | Deskripsi |
|------|--------------------|-----------|
| Direktif tingkat file | `"use server"` di bagian atas file | Menandai setiap fungsi async yang diekspor di file tersebut sebagai Server Action |
| Aksi inline | `"use server"` di dalam fungsi async | Menandai satu fungsi tunggal yang didefinisikan di Client Component sebagai Server Action |
| Aksi formulir | `<form action={action}>` | Memanggil aksi saat formulir dikirim; tetap berfungsi tanpa JavaScript (progressive enhancement) |
| Argumen terikat | `action.bind(null, userId)` | Menutup Server Action dengan argumen tambahan sambil menjaga data event/submission sebagai argumen terakhir |
| State formulir terkelola | `const [state, formAction] = useActionState(fn, init)` | Mengembalikan nilai balik aksi plus aksi formulir baru (pengganti `useFormState`) |
| State pending | `const { pending } = useFormStatus()` | Membaca status pengiriman dari `<form>` induk terdekat (harus menjadi anak dari formulir) |
| UI optimistik | `const [opt, addOpt] = useOptimistic(state, reducer)` | Menampilkan snapshot langsung, lalu merekonsiliasi dengan hasil server yang sebenarnya |
| Revalidasi sebuah jalur | `revalidatePath('/blog')` | Membersihkan Data Cache dan Full Route Cache untuk jalur tertentu setelah mutasi |
| Revalidasi berdasarkan tag | `revalidateTag('posts')` | Membersihkan setiap entri cache yang diberi tag `posts` setelah mutasi |
| Redirect setelah mutasi | `redirect('/posts/id-baru')` | Berpindah halaman dari dalam aksi setelah mutasi berhasil |
| Membuat cookie | `(await cookies()).set('theme', 'dark')` | Menulis cookie dari Server Action (dibaca dengan `get`) |
| Menghapus cookie | `(await cookies()).delete('session')` | Menghapus cookie dari Server Action |
| Membaca header permintaan | `(await headers()).get('user-agent')` | Mengakses metadata permintaan masuk di dalam aksi |
| Pemeriksaan asal | `await isOriginAllowed(req)` | Proteksi CSRF bawaan Next.js 15+ untuk Server Actions (dilempar saat asal tidak cocok) |
| Aksi tanpa formulir | `onClick={async () => { await action() }}` | Memanggil Server Action dari event handler Client Component (membutuhkan JS) |
| Fallback route handler | `app/api/items/route.ts` | Gunakan endpoint `POST` saat klien non-formulir (mobile, pihak ketiga) harus memanggil mutasi |

## Perintah Umum

### Setup Proyek dan Dependensi

```bash
# Server Actions sudah tersedia di App Router (stabil sejak Next.js 14) — tanpa dependensi tambahan
npx create-next-app@latest my-app --typescript --app

# Library validasi yang umum dipasangkan dengan Server Actions
npm install zod

# Cek versi Next.js yang terpasang (Server Actions stabil membutuhkan >= 14)
npm list next
```

### Verifikasi Server Action Saat Build

```bash
# Server Actions dikompilasi saat build; direktif yang salah akan membuat build gagal
npm run build

# Server Actions bukan endpoint REST — curl POST ke URL halaman mengembalikan HTML,
# bukan hasil aksi. Uji dengan pengiriman formulir browser sungguhan.
npm run dev
```

### Perintah Revalidasi

```bash
# Setelah mutasi digabungkan, pastikan header cache menunjukkan MISS yang segar
curl -sI https://example.com/blog | grep -i x-nextjs-cache
# x-nextjs-cache: HIT | MISS | STALE
```

## Potongan Kode

### Server Action Tingkat File dengan Formulir Native

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  // Simpan ke database di sini (menggunakan klien DB atau ORM)

  revalidatePath('/posts');
  redirect('/posts');
}
```

```typescript
// app/posts/new/page.tsx — formulir mengirim ke server action
import { createPost } from '@/app/actions';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required placeholder="Judul postingan" />
      <button type="submit">Buat</button>
    </form>
  );
}
```

### Aksi Inline dengan Validasi dan State

```typescript
// app/login/page.tsx — Client Component yang memakai useActionState
'use client';

import { useActionState } from 'react';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function login(_prev: unknown, formData: FormData) {
  'use server';

  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  // Proses login di sini...

  return { success: true };
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <form action={formAction}>
      {state && 'error' in state && <p>{state.error}</p>}
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Masuk</button>
    </form>
  );
}
```

### State Pending dengan useFormStatus

```typescript
// app/posts/_components/submit-button.tsx — harus menjadi anak dari formulir
'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Menyimpan...' : 'Simpan'}
    </button>
  );
}
```

```typescript
// app/posts/_components/post-form.tsx
import { SubmitButton } from './submit-button';
import { createPost } from '@/app/actions';

export function PostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <SubmitButton />
    </form>
  );
}
```

### Argumen Terikat untuk Aksi Per-Item

```typescript
// app/todos/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function deleteTodo(id: string) {
  // DELETE FROM todos WHERE id = $1
  revalidatePath('/todos');
}
```

```typescript
// app/todos/page.tsx — bind menutup setiap id todo
import { deleteTodo } from './actions';

export default function TodosPage({ todos }: { todos: { id: string; title: string }[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          {todo.title}
          <form action={deleteTodo.bind(null, todo.id)}>
            <button type="submit">Hapus</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
```

### Pembaruan Optimistik dengan useOptimistic

```typescript
// app/messages/page.tsx — menandai pesan terkirim sebelum aksi selesai
'use client';

import { useOptimistic } from 'react';
import { sendMessage } from './actions';

type Message = { id: number; text: string; pending?: boolean };

export default function MessagesPage({ messages }: { messages: Message[] }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state: Message[], newMessage: Message) => [...state, newMessage],
  );

  async function handleSubmit(formData: FormData) {
    addOptimistic({ id: Date.now(), text: String(formData.get('text')), pending: true });
    await sendMessage(formData);
  }

  return (
    <>
      <ul>
        {optimisticMessages.map((m) => (
          <li key={m.id} style={{ opacity: m.pending ? 0.6 : 1 }}>
            {m.text}
          </li>
        ))}
      </ul>
      <form action={handleSubmit}>
        <input name="text" required />
        <button type="submit">Kirim</button>
      </form>
    </>
  );
}
```

### Akses Cookie dan Header di Dalam Aksi

```typescript
// app/settings/actions.ts
'use server';

import { cookies, headers } from 'next/headers';

export async function updateTheme(formData: FormData) {
  const theme = String(formData.get('theme'));

  const cookieStore = await cookies();
  cookieStore.set('theme', theme);

  const headerStore = await headers();
  const userAgent = headerStore.get('user-agent');
  // Catat atau sesuaikan perilaku berdasarkan klien, lalu revalidasi jika perlu
}
```

### Memanggil Server Action dari Event Handler

```typescript
// app/dashboard/page.tsx — Client Component yang memanggil aksi yang diimpor
'use client';

import { likePost } from '@/app/actions';

export function LikeButton({ postId }: { postId: string }) {
  return (
    <button
      onClick={async () => {
        await likePost(postId);
      }}
    >
      Suka
    </button>
  );
}
```

### Validasi Server-Side dengan Nilai Balik Error

```typescript
// app/register/actions.ts
'use server';

import { z } from 'zod';

const schema = z.object({
  username: z.string().min(3),
  age: z.coerce.number().min(18, 'Harus berusia minimal 18 tahun'),
});

export type RegisterState = { error?: string; values?: { username: string; age: number } };

export async function register(
  _prev: RegisterState | null,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    username: formData.get('username'),
    age: formData.get('age'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  // Simpan data pengguna yang sudah tervalidasi, lalu revalidasi atau redirect
  return { values: parsed.data };
}
```

### Fallback Route Handler untuk Klien Non-Formulir

```typescript
// app/api/items/route.ts — endpoint POST untuk klien mobile atau pihak ketiga
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  // Simpan item (logika mutasi yang sama dengan Server Action)

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

### Daftar Periksa Keamanan

```text
- Validasi SEMUA input di sisi server dengan library skema (zod) — pemeriksaan klien hanya kosmetik
- Jangan pernah percaya nilai dari FormData.get() — lakukan konversi dan parsing
- Server Actions menyertakan pemeriksaan asal CSRF bawaan sejak Next.js 15; biarkan tetap aktif
- Simpan rahasia di kode khusus server — aksi tidak pernah dikirim ke bundle browser
- Batasi kecepatan mutasi yang mahal (email, pembayaran) di lapisan aksi atau infrastruktur
- Hindari mencatat formData yang berisi kata sandi atau token
- Gunakan `cookies()` dan `headers()` hanya di aksi atau Server Components, jangan di Client Components
```

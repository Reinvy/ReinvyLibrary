---
title: "Cheat Sheet Routing dan Data Loading SvelteKit"
description: "Panduan referensi cepat untuk konvensi routing berbasis file SvelteKit, fungsi load, form actions, hooks, opsi halaman, dan konfigurasi adapter."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Routing dan Data Loading SvelteKit

## Tabel Referensi Cepat

| Aksi | Kode / Konvensi | Deskripsi |
|------|-----------------|-----------|
| Route halaman | `src/routes/+page.svelte` | Komponen halaman root dan bersarang |
| Route layout | `src/routes/+layout.svelte` | Layout bersama yang membungkus halaman bersarang |
| Parameter dinamis | `src/routes/blog/[slug]/+page.svelte` | Segmen route sebagai `params.slug` |
| Endpoint API | `src/routes/api/posts/+server.js` | Handler permintaan GET/POST/PUT/DELETE |
| Server load | `export const load = async (event) => {...}` di `+page.server.js` | Berjalan di server untuk data halaman awal |
| Universal load | `export const load = async (event) => {...}` di `+page.js` | Berjalan di server dan klien |
| Form action | `export const actions = { default: async (event) => {...} }` di `+page.server.js` | Menangani POST form dengan progressive enhancement |
| Hook handle | `export const handle = async ({ event, resolve }) => {...}` di `hooks.server.js` | Mencegat semua permintaan masuk |
| Opsi halaman | `export const ssr = false` / `export const prerender = true` | Mengonfigurasi strategi rendering per route |
| Pencocok parameter | `export function match(param) { return /^\d+$/.test(param); }` | Memvalidasi parameter route dinamis |

## Perintah Umum

### Konvensi Routing Berbasis File

```text
src/routes/
  +page.svelte             -- halaman root (/)
  +layout.svelte           -- layout root membungkus semua halaman
  +error.svelte            -- batas error root
  about/
    +page.svelte           -- /about
  blog/
    [slug]/
      +page.svelte         -- /blog/halo-dunia (params.slug = 'halo-dunia')
    [category]/
      [article]/
        +page.svelte       -- /blog/tech/mendalam (params: {category, article})
  (auth)/
    login/
      +page.svelte         -- /login (route group, tidak ada segmen di URL)
    register/
      +page.svelte         -- /register (layout auth bersama)
  api/
    posts/
      +server.js           -- /api/posts (menangani GET, POST, PUT, DELETE)
    posts/
      [id]/
        +server.js         -- /api/posts/123
```

### Route Group, Parameter Opsional, dan Rest Parameter

```text
# Route group -- mengorganisir file tanpa memengaruhi path URL
(src/routes/(marketing)/)  ->  /harga  (tanpa prefiks /marketing/)

# Parameter opsional -- gunakan [[opsional]] untuk parameter yang mungkin tidak ada
src/routes/[[lang]]/+page.svelte     -- cocok dengan /id, /en, atau /

# Rest parameter -- [...slug] menangkap satu atau lebih segmen
src/routes/[...path]/+page.svelte    -- cocok dengan /a, /a/b, /a/b/c
```

```javascript
// src/params/integer.js -- memvalidasi bahwa parameter adalah integer
/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
  return /^\d+$/.test(param);
}
```

### Fungsi Server Load (+page.server.js / +layout.server.js)

```javascript
// +page.server.js -- berjalan hanya di server; memiliki akses ke cookies, headers, platform
export const load = async ({ params, url, locals, cookies, request, fetch, depends, parent, route }) => {
  // params: parameter route (misal: { slug: 'halo-dunia' })
  // url: URL permintaan saat ini (objek URL)
  // locals: data kustom dari hooks.handle (misal: pengguna terautentikasi)
  // cookies: API Cookie (get, set, delete)
  // fetch: fetch terautentikasi (meneruskan cookie)
  // depends: mendeklarasikan dependensi untuk invalidasi
  // parent: memuat data dari layout induk
  // route: { id: 'blog/[slug]' }

  const post = await db.post.findUnique({ where: { slug: params.slug } });
  if (!post) throw error(404, 'Postingan tidak ditemukan');

  const parentData = await parent();

  return { post, parentData };
};
```

### Fungsi Universal Load (+page.js / +layout.js)

```javascript
// +page.js -- berjalan di server saat SSR, lalu di klien saat navigasi
// Akses terbatas: url, params, fetch, parent, depends, route, data (dari server load)
export const load = async ({ params, fetch, data, depends, parent, url }) => {
  // data: hasil dari fungsi server load (dari +page.server.js)
  // fetch: fetch standar (tidak terautentikasi kecuali diteruskan secara eksplisit)

  const comments = await fetch(`/api/posts/${params.slug}/comments`).then(r => r.json());

  return { ...data, comments };
};
```

### Invalidasi Dependensi

```javascript
// +page.js atau +page.server.js
export const load = async ({ depends, fetch }) => {
  depends('posts:list');     // mendeklarasikan kunci dependensi
  const posts = await fetch('/api/posts').then(r => r.json());
  return { posts };
};
```

```javascript
// Invalidasi dari komponen atau action mana pun
import { invalidate, invalidateAll } from '$app/navigation';

// Invalidasi kunci spesifik
await invalidate('posts:list');

// Invalidasi semua data
await invalidateAll();
```

### Form Actions

```javascript
// +page.server.js -- form actions menangani permintaan POST
export const actions = {
  // Named action -- diakses melalui ?/create di atribut action form
  create: async ({ request, locals, cookies, url, params, fetch }) => {
    const data = await request.formData();
    const title = data.get('title');
    const content = data.get('content');

    // Mengembalikan error validasi -- tersedia sebagai $page.form di halaman
    const errors = {};
    if (!title) errors.title = 'Judul wajib diisi';
    if (title && title.length < 3) errors.title = 'Judul minimal 3 karakter';
    if (Object.keys(errors).length) return { errors, title, content };

    const post = await db.post.create({ data: { title, content, authorId: locals.user.id } });

    // Action berhasil -- gunakan redirect untuk pola POST-redirect-GET
    throw redirect(303, `/posts/${post.id}`);
  },

  // Default action (ketika tidak ada ?/actionName yang ditentukan)
  default: async ({ request }) => {
    const data = await request.formData();
    // ... menangani pengiriman default
  }
};
```

```svelte
<!-- +page.svelte -- form dengan progressive enhancement -->
<script>
  import { enhance } from '$app/forms';
  export let form;
</script>

<form method="POST" action="?/create" use:enhance>
  <input name="title" placeholder="Judul postingan" />
  {#if form?.errors?.title}
    <p class="error">{form.errors.title}</p>
  {/if}
  <textarea name="content" placeholder="Konten"></textarea>
  <button type="submit">Buat Postingan</button>
</form>
```

### Server Hooks

```javascript
// src/hooks.server.js -- hook handle untuk intersepsi permintaan
export const handle = async ({ event, resolve }) => {
  // event.locals -- isi dengan pengguna terautentikasi, klien DB, dll.
  const session = await getSession(event.cookies.get('session'));
  event.locals.user = session?.user ?? null;

  // resolve(event) -- render respons
  const response = await resolve(event);

  // Menambahkan header keamanan
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
};

// Error hook -- menangkap error server untuk monitoring
export const handleError = async ({ error, event }) => {
  console.error('Server error:', error, 'di', event.url.pathname);
  return { message: 'Terjadi kesalahan yang tidak terduga.' };
};

// Fetch hook -- mencegat fetch selama fungsi load
export const handleFetch = async ({ event, request, fetch }) => {
  // Meneruskan token auth ke permintaan API internal
  if (request.url.startsWith('https://api.internal.com')) {
    request.headers.set('Authorization', `Bearer ${event.locals.user.token}`);
  }
  return fetch(request);
};
```

```javascript
// src/hooks.client.js -- hook sisi klien
export const handleError = async ({ error, event }) => {
  console.error('Client error:', error);
  return { message: 'Terjadi error di sisi klien.' };
};
```

### Opsi Halaman

```javascript
// +page.js, +layout.js, +page.server.js, atau +layout.server.js
export const ssr = true;             // mengaktifkan server-side rendering (default: true)
export const csr = true;             // mengaktifkan client-side rendering (default: true)
export const prerender = 'auto';     // prerender saat build ('auto', true, false)
export const trailingSlash = 'never';// penanganan trailing slash ('never', 'always', 'ignore')
export const entries = [];           // entri prerender untuk route dinamis
```

### Konfigurasi Adapter

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true,
      envPrefix: '',
    })
  }
};
```

```text
Panduan pemilihan adapter:

@sveltejs/adapter-node     -- server Node.js (SSR, API routes)
@sveltejs/adapter-static   -- static site generation (tanpa server)
@sveltejs/adapter-vercel   -- fungsi serverless Vercel
@sveltejs/adapter-cloudflare -- Cloudflare Workers/Pages
@sveltejs/adapter-netlify  -- Edge Functions Netlify
```

## Potongan Kode

### Halaman Lengkap dengan Data Loading dan Penanganan Error

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
  export let data;

  $: ({ post, comments } = data);
</script>

<svelte:head>
  <title>{post.title} - Blog Saya</title>
  <meta name="description" content={post.excerpt} />
</svelte:head>

<article>
  <h1>{post.title}</h1>
  <div class="meta">
    <time datetime={post.date}>{post.formattedDate}</time>
    {#each post.tags as tag}
      <span class="tag">{tag}</span>
    {/each}
  </div>
  <div class="content">
    {@html post.html}
  </div>
</article>

<section class="comments">
  <h2>Komentar ({comments.length})</h2>
  {#each comments as comment}
    <div class="comment">
      <strong>{comment.author}</strong>
      <p>{comment.text}</p>
    </div>
  {/each}
</section>
```

```svelte
<!-- src/routes/blog/[slug]/+error.svelte -->
<script>
  import { page } from '$app/stores';
  export let error;
</script>

<h1>{error.message}</h1>
<p>Kode status: {$page.status}</p>
<p>Route: /blog/{$page.params.slug}</p>

<a href="/blog">Kembali ke blog</a>
```

### Layout Bersama dengan Autentikasi

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { page } from '$app/stores';
  import { navigating } from '$app/stores';
  export let data;
  export let children;
</script>

<nav>
  <a href="/">Beranda</a>
  <a href="/blog">Blog</a>
  {#if data.user}
    <span>Selamat datang, {data.user.name}</span>
    <a href="/logout">Keluar</a>
  {:else}
    <a href="/login">Masuk</a>
  {/if}
</nav>

{#if $navigating}
  <div class="loading-bar" />
{/if}

<main>
  {@render children()}
</main>
```

```javascript
// src/routes/+layout.server.js
export const load = async ({ locals }) => {
  return {
    user: locals.user ?? null
  };
};
```

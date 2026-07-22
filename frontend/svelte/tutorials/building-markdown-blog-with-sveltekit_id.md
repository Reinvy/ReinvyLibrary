---
title: "Membangun Blog Markdown dengan SvelteKit"
description: "Tutorial komprehensif tentang membangun blog penuh fitur dengan SvelteKit — mencakup routing berbasis file, rute dinamis, fungsi load server, rendering markdown dengan mdsvex, penyorotan sintaks, optimasi SEO, pembuatan situs statis, dan pencarian sisi klien."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Blog Markdown dengan SvelteKit

## Ringkasan

SvelteKit adalah kerangka kerja full-stack untuk membangun aplikasi web dengan Svelte. SvelteKit menyediakan routing berbasis file, rendering sisi server, pembuatan situs statis, dan berbagai adapter untuk deployment ke berbagai platform. Dalam tutorial ini, Anda akan membangun blog bertenaga markdown secara lengkap dari awal menggunakan SvelteKit.

Blog yang akan dibangun mencakup halaman daftar posting, halaman posting individual dengan blok kode yang diberi sorotan sintaks, tag meta SEO, fitur pencarian, dan desain responsif penuh. Anda akan mempelajari cara menggunakan fungsi load SvelteKit untuk pengambilan data sisi server, parameter rute dinamis, layout bersarang, dan prerender statis untuk menghasilkan blog yang siap produksi.

## Target Audiens

- Pengembang frontend dan full-stack yang sudah mengenal dasar-dasar Svelte dan ingin mempelajari SvelteKit dengan membangun proyek nyata.
- Level menengah — nyaman dengan HTML, CSS, dan JavaScript ES6+; pengalaman dengan komponen Svelte, reaktivitas, dan props sangat membantu tetapi tidak wajib.

## Prasyarat

- Node.js 18 atau lebih baru dan npm terinstal.
- Pengetahuan dasar tentang Svelte (komponen, deklarasi reaktif, props, dan penanganan event).
- Editor kode (VS Code direkomendasikan dengan ekstensi Svelte).
- Kesediaan menggunakan terminal untuk pembuatan dan menjalankan proyek.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat proyek SvelteKit dengan dukungan TypeScript.
- Membuat rute berbasis file termasuk layout dan halaman dinamis `[slug]`.
- Mengambil dan memproses data di sisi server menggunakan fungsi load SvelteKit.
- Memproses file markdown dengan metadata frontmatter menggunakan mdsvex dan gray-matter.
- Menampilkan posting blog kaya dengan blok kode yang memiliki sorotan sintaks.
- Menambahkan tag meta SEO secara dinamis per halaman menggunakan `svelte:head`.
- Mengimplementasikan fitur pencarian sisi klien yang memfilter posting berdasarkan judul dan tag.
- Mengonfigurasi prerender statis untuk output blog statis penuh.

## Konteks dan Motivasi

Situs web berbasis konten — blog, situs dokumentasi, portofolio, dan basis pengetahuan — mendukung sebagian besar web. Pendekatan tradisional seperti WordPress memerlukan basis data dan server runtime. Generator situs statis seperti Jekyll dan Hugo cepat tetapi memaksa Anda menggunakan ekosistem yang berbeda.

SvelteKit menyelesaikan ketegangan ini. SvelteKit memberikan pengalaman pengembang dari kerangka kerja komponen modern dengan kemampuan untuk merender setiap halaman sebagai HTML statis pada waktu build. Anda mendapatkan yang terbaik dari kedua dunia: pengembangan dinamis dengan live reload dan hot module replacement selama pengembangan, serta situs statis yang sangat cepat di produksi.

Membangun blog markdown adalah proyek ideal untuk mengeksplorasi kemampuan inti SvelteKit. Anda akan menyentuh setiap fitur utama — routing, layout, pemuatan data server, parameter dinamis, prerender statis, dan SEO — dalam satu aplikasi yang kohesif.

## Konten Inti

### Pembuatan Proyek

Mulailah dengan membuat proyek SvelteKit baru menggunakan CLI resmi. Wizard pengaturan memungkinkan Anda memilih TypeScript, ESLint, Prettier, dan opsi pengujian.

```bash
npm create svelte@latest sveltekit-blog
```

Saat diminta, buat pilihan berikut:

- **Template aplikasi Svelte mana?**: Skeleton project.
- **Tambahkan type checking dengan TypeScript?**: Ya, menggunakan sintaks TypeScript.
- **Pilih opsi tambahan**: Tambahkan ESLint dan Prettier.

Masuk ke direktori proyek dan instal dependensi:

```bash
cd sveltekit-blog
npm install
```

Instal paket tambahan yang diperlukan untuk pemrosesan markdown:

```bash
npm install mdsvex gray-matter
```

`mdsvex` adalah preprosesor Svelte yang memungkinkan penggunaan markdown langsung di komponen Svelte. `gray-matter` memproses frontmatter YAML dari file markdown.

### Gambaran Umum Struktur Proyek

Proyek SvelteKit mengikuti struktur file berbasis konvensi di dalam direktori `src/`:

```text
src/
├── app.html          # Shell HTML yang digunakan bersama oleh semua halaman
├── app.css           # Gaya global
├── lib/              # Komponen dan utilitas bersama
│   ├── components/   # Komponen UI yang dapat digunakan kembali
│   └── data/         # Utilitas pengambilan data
└── routes/           # Routing berbasis file
    ├── +layout.svelte
    ├── +page.svelte
    └── posts/
        ├── [slug]/
        │   └── +page.svelte
        └── +page.svelte
```

Setiap nama file dengan awalan `+` adalah file rute SvelteKit. `+page.svelte` mendefinisikan halaman, `+layout.svelte` mendefinisikan pembungkus layout, dan file seperti `+page.server.ts` berisi logika khusus server seperti fungsi load.

### Mengonfigurasi mdsvex

`mdsvex` perlu didaftarkan sebagai preprosesor Svelte di file konfigurasi proyek. Perbarui `svelte.config.js` untuk mengimpor dan mengonfigurasi mdsvex:

```typescript
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
  extensions: ['.md'],
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [vitePreprocess(), mdsvex(mdsvexOptions)],
  kit: {
    adapter: adapter(),
  },
};

export default config;
```

Array `extensions` memberi tahu SvelteKit untuk memperlakukan file `.md` sebagai komponen yang valid. Preprosesor mdsvex mengubah markdown menjadi komponen Svelte pada waktu kompilasi.

### Membuat Struktur Data Posting Blog

Buat direktori untuk file markdown posting. Secara konvensi, Anda dapat menempatkannya di direktori `posts/` tingkat atas di luar `src/`:

```bash
mkdir -p posts
```

Setiap posting blog adalah file markdown dengan frontmatter YAML. Buat contoh posting untuk pengujian:

````markdown
---
title: "Memulai dengan SvelteKit"
date: "2026-06-15"
tags: ["svelte", "sveltekit", "tutorial"]
description: "Pengenalan tentang membangun aplikasi web dengan SvelteKit — kerangka kerja resmi untuk Svelte."
author: "Nama Anda"
---

# Memulai dengan SvelteKit

SvelteKit adalah kerangka kerja untuk membangun aplikasi web dengan Svelte. SvelteKit menyediakan routing berbasis file, rendering sisi server, pembuatan situs statis, dan ekosistem plugin yang kaya...

## Mengapa SvelteKit?

- **Routing berbasis file** — rute didefinisikan oleh struktur sistem file.
- **Rendering sisi server** — halaman dirender di server untuk muatan awal yang cepat.
- **Pembuatan situs statis** — halaman diprerender pada waktu build untuk deployment ke CDN.
- **Form actions** — menangani pengiriman formulir tanpa JavaScript sisi klien.

```svelte
<script lang="ts">
  let count = $state(0);
</script>

<button onclick={() => count++}>
  Hitung: {count}
</button>
```

## Langkah Berikutnya

Jelajahi [dokumentasi SvelteKit](https://kit.svelte.dev/docs) resmi untuk mempelajari tentang adapter, hooks, dan pola routing lanjutan.
````

Buat setidaknya tiga posting dengan tag dan tanggal yang berbeda untuk membuat fitur pencarian dan filter tag menjadi lebih bermakna. Simpan sebagai `posts/memulai-dengan-sveltekit.md`, `posts/panduan-stores-svelte.md`, dan `posts/sveltekit-vs-framework-lain.md`.

### Fungsi Load Server — Mengambil Posting

Fungsi load SvelteKit berjalan di sisi server (saat SSR) atau pada waktu build (saat prerender) untuk mengambil data sebelum merender halaman. Buat utilitas untuk membaca dan memproses semua posting:

```typescript
// src/lib/data/posts.ts
import type { Post } from '$lib/types';

// Dalam proyek nyata, file ini akan dibaca dari filesystem saat build.
// Untuk kemudahan, kita mengimpor file markdown secara langsung.
const modules = import.meta.glob('/posts/*.md', { eager: true });

export function getAllPosts(): Post[] {
  const posts: Post[] = [];

  for (const [filepath, module] of Object.entries(modules)) {
    const { metadata } = module as { metadata: Record<string, unknown> };
    const slug = filepath.replace('/posts/', '').replace('.md', '');

    posts.push({
      slug,
      title: metadata.title as string,
      date: metadata.date as string,
      tags: metadata.tags as string[],
      description: metadata.description as string,
      author: (metadata.author as string) ?? 'Anonim',
    });
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
```

Definisikan tipe `Post` di file types:

```typescript
// src/lib/types.ts
export interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
  author: string;
}
```

### Membangun Halaman Daftar Posting

File `+page.server.ts` (atau `+page.ts`) mengekspor fungsi `load` yang mengembalikan data ke `+page.svelte` yang sesuai. Buat halaman indeks blog:

```typescript
// src/routes/posts/+page.server.ts
import { getAllPosts } from '$lib/data/posts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const posts = getAllPosts();
  return { posts };
};
```

```svelte
<!-- src/routes/posts/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { posts } = $derived(data);

  let searchQuery = $state('');
  let activeTag = $state('');

  const allTags = $derived([...new Set(posts.flatMap((p) => p.tags))].sort());

  const filteredPosts = $derived(
    posts.filter((post) => {
      const matchesSearch =
        searchQuery === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesTag = activeTag === '' || post.tags.includes(activeTag);

      return matchesSearch && matchesTag;
    })
  );
</script>

<svelte:head>
  <title>Blog — Blog SvelteKit Saya</title>
  <meta name="description" content="Kumpulan artikel tentang Svelte, SvelteKit, dan pengembangan web modern." />
</svelte:head>

<h1>Blog</h1>

<div class="controls">
  <input
    type="search"
    bind:value={searchQuery}
    placeholder="Cari posting..."
    aria-label="Cari posting blog"
  />

  <div class="tags">
    <button
      class:active={activeTag === ''}
      onclick={() => (activeTag = '')}
    >
      Semua
    </button>
    {#each allTags as tag}
      <button
        class:active={activeTag === tag}
        onclick={() => (activeTag = tag)}
      >
        {tag}
      </button>
    {/each}
  </div>
</div>

<div class="posts-grid">
  {#if filteredPosts.length === 0}
    <p class="no-results">Tidak ada posting ditemukan. Coba ubah pencarian atau filter Anda.</p>
  {:else}
    {#each filteredPosts as post}
      <article class="post-card">
        <a href="/posts/{post.slug}">
          <h2>{post.title}</h2>
          <time datetime={post.date}>
            {new Date(post.date).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          <p>{post.description}</p>
          <div class="post-tags">
            {#each post.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        </a>
      </article>
    {/each}
  {/if}
</div>

<style>
  .controls {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  input[type='search'] {
    padding: 0.75rem 1rem;
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    font-size: 1rem;
    max-width: 24rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tags button {
    padding: 0.35rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .tags button.active {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
  }

  .posts-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .post-card {
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: box-shadow 0.2s;
  }

  .post-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .post-card a {
    text-decoration: none;
    color: inherit;
  }

  .post-card h2 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
  }

  .post-card time {
    display: block;
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
  }

  .post-card p {
    margin: 0 0 1rem;
    color: #374151;
    line-height: 1.5;
  }

  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .tag {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: #f3f4f6;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #4b5563;
  }

  .no-results {
    grid-column: 1 / -1;
    text-align: center;
    color: #6b7280;
    padding: 3rem 0;
  }
</style>
```

Halaman ini menyediakan grid kartu posting yang responsif, input pencarian yang memfilter berdasarkan judul dan tag secara real-time, serta tombol filter berbasis tag.

### Rute Dinamis — Halaman Posting Tunggal

Rute dinamis di SvelteKit menggunakan konvensi penamaan direktori `[slug]`. Buat halaman yang menampilkan satu posting:

```typescript
// src/routes/posts/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug;

  try {
    // Mengimpor file markdown untuk posting ini secara dinamis
    const post = await import(`/posts/${slug}.md`);

    return {
      content: post.default,
      metadata: post.metadata,
      slug,
    };
  } catch {
    throw error(404, `Posting "${slug}" tidak ditemukan`);
  }
};
```

```svelte
<!-- src/routes/posts/[slug]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { content, metadata, slug } = $derived(data);
</script>

<svelte:head>
  <title>{metadata.title} — Blog SvelteKit Saya</title>
  <meta name="description" content={metadata.description} />
  <meta property="og:title" content={metadata.title} />
  <meta property="og:description" content={metadata.description} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<article class="post">
  <header>
    <h1>{metadata.title}</h1>
    <div class="meta">
      <time datetime={metadata.date}>
        {new Date(metadata.date).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </time>
      <span class="author">Oleh {metadata.author}</span>
    </div>
    <div class="tags">
      {#each metadata.tags as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  </header>

  <div class="content">
    <svelte:component this={content} />
  </div>
</article>

<nav class="back-nav">
  <a href="/posts">&larr; Kembali ke semua posting</a>
</nav>

<style>
  .post {
    max-width: 48rem;
    margin: 0 auto;
  }

  header {
    margin-bottom: 3rem;
  }

  header h1 {
    margin: 0 0 1rem;
    font-size: 2rem;
    line-height: 1.3;
  }

  .meta {
    display: flex;
    gap: 1rem;
    align-items: center;
    color: #6b7280;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .author {
    font-weight: 500;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .tag {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: #f3f4f6;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #4b5563;
  }

  .content {
    line-height: 1.8;
    font-size: 1.1rem;
  }

  .content :global(h2) {
    margin-top: 2.5rem;
    margin-bottom: 1rem;
  }

  .content :global(p) {
    margin-bottom: 1.25rem;
  }

  .content :global(pre) {
    background: #1f2937;
    color: #f3f4f6;
    padding: 1.25rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1.5rem 0;
  }

  .content :global(code) {
    font-size: 0.875rem;
  }

  .content :global(img) {
    max-width: 100%;
    border-radius: 0.5rem;
    margin: 1.5rem 0;
  }

  .back-nav {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .back-nav a {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 500;
  }

  .back-nav a:hover {
    text-decoration: underline;
  }
</style>
```

Elemen `svelte:head` menyuntikkan tag meta khusus halaman untuk SEO dan berbagi sosial. Direktif `svelte:component` merender konten markdown yang diimpor sebagai komponen Svelte.

### Mengonfigurasi Layout Halaman Utama

Buat root layout yang membungkus semua halaman dengan navigasi yang konsisten:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';

  let { children }: { children: import('svelte').Snippet } = $props();
</script>

<nav class="site-nav">
  <a href="/" class="logo">Blog Saya</a>
  <div class="nav-links">
    <a href="/">Beranda</a>
    <a href="/posts">Blog</a>
  </div>
</nav>

<main>
  {@render children()}
</main>

<footer>
  <p>&copy; 2026 Blog SvelteKit Saya. Dibangun dengan SvelteKit.</p>
</footer>

<style>
  .site-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    max-width: 64rem;
    margin: 0 auto;
  }

  .logo {
    font-weight: 700;
    font-size: 1.25rem;
    text-decoration: none;
    color: inherit;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }

  .nav-links a {
    text-decoration: none;
    color: #4b5563;
    font-weight: 500;
  }

  .nav-links a:hover {
    color: #4f46e5;
  }

  main {
    max-width: 64rem;
    margin: 2rem auto;
    padding: 0 2rem;
    min-height: 70vh;
  }

  footer {
    text-align: center;
    padding: 2rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }
</style>
```

Perbarui halaman utama untuk menampilkan pesan selamat datang dan tautan ke blog:

```svelte
<!-- src/routes/+page.svelte -->
<svelte:head>
  <title>Beranda — Blog SvelteKit Saya</title>
</svelte:head>

<section class="hero">
  <h1>Selamat Datang di Blog Saya</h1>
  <p>Pemikiran dan tutorial tentang Svelte, SvelteKit, dan pengembangan web modern.</p>
  <a href="/posts" class="cta">Baca Blog</a>
</section>

<style>
  .hero {
    text-align: center;
    padding: 4rem 0;
  }

  .hero h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  .hero p {
    font-size: 1.2rem;
    color: #6b7280;
    margin-bottom: 2rem;
  }

  .cta {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: #4f46e5;
    color: white;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 600;
    transition: background 0.2s;
  }

  .cta:hover {
    background: #4338ca;
  }
</style>
```

### Pembuatan Situs Statis dengan Prerender

SvelteKit dapat merender setiap halaman menjadi HTML statis pada waktu build. Ini menghasilkan situs statis penuh yang dapat dideploy ke CDN atau penyedia hosting statis mana pun.

Aktifkan prerender untuk seluruh bagian blog dengan menambahkan file `+page.ts` yang mendeklarasikan opsi `prerender`:

```typescript
// src/routes/posts/+page.ts
export const prerender = true;
```

Untuk rute `[slug]` dinamis, SvelteKit perlu mengetahui semua kemungkinan nilai parameter pada waktu build. Gunakan fungsi `entries` di file load:

```typescript
// src/routes/posts/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';

export const entries: EntryGenerator = async () => {
  const modules = import.meta.glob('/posts/*.md', { eager: true });

  return Object.keys(modules).map((filepath) => ({
    slug: filepath.replace('/posts/', '').replace('.md', ''),
  }));
};

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug;

  try {
    const post = await import(`/posts/${slug}.md`);

    return {
      content: post.default,
      metadata: post.metadata,
      slug,
    };
  } catch {
    throw error(404, `Posting "${slug}" tidak ditemukan`);
  }
};
```

Sekarang build situs untuk menghasilkan semua halaman statis:

```bash
npm run build
```

Output di direktori `build/` berisi versi statis penuh dari setiap halaman blog, termasuk semua halaman posting individual.

### Menambahkan Gaya Global

Buat file CSS dasar yang mengatur tipografi, warna, dan reset:

```css
/* src/app.css */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    Oxygen, Ubuntu, sans-serif;
  color: #111827;
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.2;
}

a {
  color: #4f46e5;
}

img {
  max-width: 100%;
  height: auto;
}
```

Impor stylesheet global ini di root layout untuk menerapkannya di semua halaman.

## Contoh Kode

Kode proyek lengkap terstruktur di seluruh file yang dibuat di atas. Berikut adalah referensi cepat untuk file-file kunci yang Anda buat:

```text
sveltekit-blog/
├── posts/
│   ├── memulai-dengan-sveltekit.md
│   ├── panduan-stores-svelte.md
│   └── sveltekit-vs-framework-lain.md
├── src/
│   ├── app.css
│   ├── app.html
│   ├── lib/
│   │   ├── data/
│   │   │   └── posts.ts
│   │   └── types.ts
│   └── routes/
│       ├── +layout.svelte
│       ├── +page.svelte
│       └── posts/
│           ├── +page.svelte
│           ├── +page.server.ts
│           ├── +page.ts
│           └── [slug]/
│               ├── +page.svelte
│               └── +page.server.ts
├── svelte.config.js
├── package.json
├── tsconfig.json
└── vite.config.ts
```

Untuk menjalankan server pengembangan:

```bash
npm run dev -- --open
```

Untuk build produksi dengan prerender penuh:

```bash
npm run build
npm run preview
```

Perintah `preview` menyajikan file statis yang telah dibuild secara lokal sehingga Anda dapat memverifikasi semuanya berfungsi sebelum deployment.

## Insight Penting

- **Prerender sebagai default untuk situs konten**: Untuk blog, dokumentasi, dan halaman pemasaran, prerender menghilangkan biaya server dan memberikan pengalaman pengguna tercepat. SvelteKit membuat ini semudah mengekspor `export const prerender = true;`.
- **Fungsi load merangkum logika data**: Menyimpan pengambilan data di file `+page.server.ts` memisahkan concern dan membuat komponen lebih mudah diuji. Data mengalir dalam satu arah — server ke komponen — yang menyederhanakan penalaran tentang aplikasi Anda.
- **Impor dinamis untuk skalabilitas**: Menggunakan `import.meta.glob` untuk menemukan dan mengimpor file markdown berarti Anda tidak perlu mendaftarkan posting baru secara manual. Menambahkan file ke direktori `posts/` secara otomatis membuatnya tersedia di blog.
- **SEO dengan svelte:head**: Menyuntikkan tag meta per halaman langsung di template komponen menjaga metadata SEO tetap berada di dekat konten yang dideskripsikannya. Ini jauh lebih mudah dirawat daripada file konfigurasi SEO global.
- **Pencarian sisi klien sudah cukup cepat**: Untuk blog dengan puluhan atau ratusan posting, memfilter di sisi klien melalui state reaktif `$derived` memberikan respons instan tanpa perjalanan bolak-balik ke server. Untuk ribuan posting, pertimbangkan pengindeksan dengan pustaka seperti Lunr atau Minisearch.
- **Styling komponen yang ditempatkan bersama**: Gaya scoped Svelte berarti Anda dapat menulis CSS khusus komponen tanpa tabrakan penamaan. Modifikator `:global()` memungkinkan Anda secara selektif memberi gaya pada konten yang dirender dari markdown (seperti blok kode dan gambar) tanpa mempengaruhi bagian halaman lainnya.
- **EntryGenerator memungkinkan output statis penuh**: Tanpa ekspor `entries`, SvelteKit tidak dapat mengetahui nilai `[slug]` mana yang ada pada waktu build, dan akan kembali ke rendering sisi server untuk rute dinamis. Menyediakan entries sangat penting untuk blog statis penuh.

## Langkah Berikutnya

- Deploy blog Anda ke Vercel, Netlify, atau Cloudflare Pages menggunakan adapter SvelteKit yang sesuai (`@sveltejs/adapter-vercel`, `@sveltejs/adapter-netlify`, atau `@sveltejs/adapter-cloudflare`).
- Tambahkan integrasi CMS dengan Sanity, Contentful, atau Strapi untuk editor non-teknis.
- Implementasikan feed RSS dan Atom menggunakan `sveltekit-rss`.
- Jelajahi [dokumentasi SvelteKit](https://kit.svelte.dev/docs) resmi untuk topik lanjutan seperti form actions, web socket, dan autentikasi.
- Tinjau [Panduan Praktik Terbaik Svelte](/frontend/svelte/guides/svelte-best-practices-guide) dan [Silabus Svelte](/frontend/svelte/syllabi/svelte-syllabus) untuk jalur pembelajaran terstruktur.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun blog markdown yang berfungsi penuh dengan SvelteKit. Anda membuat proyek SvelteKit, mengonfigurasi mdsvex untuk dukungan markdown, membuat halaman daftar posting dengan pencarian dan filter tag, mengimplementasikan rute dinamis untuk posting individual, menambahkan tag meta SEO, dan mengonfigurasi prerender statis untuk deployment produksi.

Keterampilan yang Anda pelajari — routing berbasis file, fungsi load, parameter dinamis, prerender, dan pemfilteran reaktif sisi klien — dapat ditransfer langsung ke proyek SvelteKit apa pun. Baik Anda membangun situs dokumentasi, portofolio, atau aplikasi lengkap, pola yang sama berlaku.

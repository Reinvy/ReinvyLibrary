---
title: "Panduan SEO dan Social Sharing SvelteKit"
description: "Panduan siap-produksi untuk optimasi mesin pencari dan social sharing di SvelteKit — rendering SSR/SSG, meta tag svelte:head, Open Graph, URL kanonikal, JSON-LD, robots.txt, dan sitemap.xml."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan SEO dan Social Sharing SvelteKit

## Pendahuluan

Mesin pencari dan platform sosial adalah bot: mereka mengambil HTML Anda, membaca meta tag, lalu memutuskan apa yang akan ditampilkan sebelum satu baris pun JavaScript dijalankan. Aplikasi yang hanya dirender di sisi klien akan terlihat seperti halaman kosong bagi Google, Slack, WhatsApp, Twitter/X, dan Facebook. SvelteKit menyelesaikan masalah ini secara alami — setiap rute dapat dirender di server (SSR) atau di-prerender saat build (SSG), menghasilkan HTML asli yang bisa dibaca bot.

Panduan ini menyajikan pengaturan SEO lengkap untuk SvelteKit: memilih antara SSR dan SSG, menyuntikkan metadata per halaman dengan `svelte:head`, mengimplementasikan Open Graph dan Twitter Card untuk pratinjau sosial yang kaya, menegakkan URL kanonikal, menyematkan data terstruktur JSON-LD, serta mengirimkan `robots.txt` dan `sitemap.xml` dinamis.

## Praktik Terbaik

- **Prerender konten statis, SSR konten dinamis**: halaman statis (dokumentasi, blog, pemasaran) sebaiknya di-prerender saat build via `adapter-static` atau opsi `prerender` menjadi HTML polos yang terindeks sempurna; halaman spesifik per pengguna (dashboard, profil) membutuhkan SSR per permintaan. Jangan pernah mengirim `export const ssr = false` secara global saat SEO penting.
- **Pastikan `svelte:head` setiap halaman lengkap dan unik**: setiap rute merender `title`, `description`, kanonikal, dan tag Open Graph miliknya sendiri. Title yang hilang dan kanonikal duplikat adalah penyebab paling umum peringkat rendah dan pratinjau sosial yang salah.
- **Selalu pasang URL kanonikal eksplisit**: bot memperlakukan `https://example.com/post/1` dan `https://example.com/post/1?ref=email` sebagai halaman berbeda. Kirim `<link rel="canonical">` yang merujuk URL absolut ber-norma trailingslash agar sinyal peringkat menyatu.
- **Implementasikan Open Graph dan Twitter Card di mana-mana**: platform sosial hanya membaca properti `og:` — sediakan `og:title`, `og:description`, `og:type`, `og:url`, dan `og:image` besar (minimal 1200x630 px) dari URL publik yang stabil, plus `twitter:card` untuk X/Twitter.
- **Gunakan JSON-LD untuk data terstruktur**: sematkan skrip `application/ld+json` untuk hasil kaya (Article, BreadcrumbList, FAQPage, Organization) — format yang direkomendasikan Google, mudah dibuat dari fungsi load, dan dapat divalidasi dengan Rich Results Test.
- **Kirim robots.txt dan sitemap.xml sebagai endpoint**: `robots.txt` statis mengontrol perayapan dan mengarahkan bot ke sitemap; generate `sitemap.xml` secara dinamis dari sumber konten agar tidak pernah basi.

## Langkah Implementasi

### Langkah 1: Konfigurasi Strategi Rendering

Tetapkan default yang masuk akal di layout akar — SSR aktif, prerender sesuai kebutuhan — dan pilih halaman secara eksplisit untuk SSG.

```javascript
// src/routes/+layout.ts
export const ssr = true;         // render di server secara default
export const prerender = false;  // halaman statis memilih sendiri secara individual

// src/routes/blog/[slug]/+page.ts — posting blog statis → SSG
export const prerender = true;
```

### Langkah 2: Bangun Komponen SEO yang Dapat Dipakai Ulang

Buat komponen yang merender semua meta tag dari satu objek `Meta` sehingga halaman tetap konsisten.

```svelte
<!-- src/lib/components/Seo.svelte -->
<script lang="ts">
  import { page } from '$app/stores';

  export let title: string;
  export let description: string;
  export let image = 'https://example.com/og-default.png';
  export let type: 'website' | 'article' = 'website';
  export let jsonLd: Record<string, unknown> | null = null;

  $: canonical = `https://example.com${$page.url.pathname}`;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta property="og:type" content={type} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={image} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
  {#if jsonLd}
    <script type="application/ld+json" data-sveltekit-prefetch>
      {JSON.stringify(jsonLd)}
    </script>
  {/if}
</svelte:head>
```

### Langkah 3: Gunakan di Halaman dengan Data dari Fungsi Load

```typescript
// src/routes/blog/[slug]/+page.ts
import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
  const res = await fetch(`/api/posts/${params.slug}`);
  if (!res.ok) throw error(404, 'Posting tidak ditemukan');
  return { post: await res.json() };
}
```

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  import Seo from '$lib/components/Seo.svelte';
  export let data;
  const post = data.post;
</script>

<Seo
  title={post.title}
  description={post.excerpt}
  image={post.coverImage}
  type="article"
  jsonLd={{
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author }
  }}
/>

<article>
  <h1>{post.title}</h1>
  <p>{post.excerpt}</p>
  {@html post.html}
</article>
```

### Langkah 4: Tambahkan robots.txt

Sajikan `robots.txt` sebagai aset statis (atau sebagai endpoint dinamis `src/routes/robots.txt.ts` yang mengembalikan Response `text/plain`):

```text
# static/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://example.com/sitemap.xml
```

### Langkah 5: Generate sitemap.xml Secara Terprogram

```typescript
// src/routes/sitemap.xml.ts
export const prerender = true;

const BASE_URL = 'https://example.com';

async function getAllRoutes(): Promise<Array<{ path: string; updatedAt: string }>> {
  const res = await fetch(`${BASE_URL}/api/posts`);
  if (!res.ok) throw new Error('Gagal memuat rute');
  const posts = await res.json();
  return posts.map((p: { slug: string; updated_at: string }) => ({
    path: `/blog/${p.slug}`,
    updatedAt: p.updated_at
  }));
}

export async function GET() {
  const routes = await getAllRoutes();
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { path: '/', updatedAt: today },
    { path: '/about', updatedAt: today },
    ...routes
  ];
  const urls = entries
    .map(
      (entry) =>
        `<url><loc>${BASE_URL}${entry.path}</loc><lastmod>${entry.updatedAt}</lastmod></url>`
    )
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml' } });
}
```

### Langkah 6: Validasi Sebelum Deploy

- Jalankan `npm run build`, lalu `curl -s http://localhost:4173/blog/my-post | head -40` — `title`, kanonikal, dan tag `og:` harus muncul di HTML mentah.
- Uji URL produksi di Rich Results Test milik Google dan Facebook Sharing Debugger.
- Pastikan `robots.txt` dan `sitemap.xml` dapat diakses dan sesuai dengan rute yang dikirim.
- Submit sitemap di Google Search Console dan pantau Index Coverage untuk error perayapan.

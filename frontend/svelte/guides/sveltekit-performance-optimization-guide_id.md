---
title: "Panduan Optimasi Performa SvelteKit"
description: "Panduan praktis membuat aplikasi SvelteKit cepat: prerendering, streaming SSR, code splitting, optimasi gambar, header cache, dan analisis bundle."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Optimasi Performa SvelteKit

## Pendahuluan

SvelteKit cepat secara bawaan, tetapi "bawaan" berarti optimal untuk kebenaran, bukan untuk pola trafik Anda. Halaman marketing, dashboard yang butuh login, dan daftar produk punya bottleneck yang sangat berbeda, dan satu aplikasi sering memuat ketiganya.

Panduan ini membahas tuas yang benar-benar menggerakkan Core Web Vitals di proyek SvelteKit: strategi render per rute, streaming data yang lambat namun tidak memblokir, menjaga bundle klien tetap kecil, menyajikan format gambar modern, caching di edge, serta mengukur sebelum dan sesudah perubahan. Setiap bagian menyebutkan aturan, alasannya, dan kode penerapannya.

Urutan di bawah mengikuti dampak: mengubah strategi render biasanya mengalahkan optimasi mikro, dan pengukuran mencegah Anda mengoptimasi rute yang tidak pernah dikunjungi.

## Praktik Terbaik

- **Pilih mode render per rute, bukan per aplikasi.** Prerender yang statis, SSR yang personal, dan sisakan CSR untuk shell terautentikasi yang tidak perlu diindeks.
- **Streaming data lambat, jangan ditunggu.** Mengembalikan promise dari `load` membuat shell tampil segera sementara fragmen lambat menyusul.
- **Jaga layout root tanpa dependensi berat.** Apa pun yang diimpor di `+layout.svelte` dikirim ke semua rute; pustaka chart di sana membebani seluruh situs.
- **Sajikan gambar responsif dalam format modern.** Atribut `width`/`height` yang benar mencegah layout shift, dan AVIF/WebP memangkas 30-60% byte dibanding PNG.
- **Cache yang publik, jangan yang privat.** Aset statis memakai `max-age` panjang dengan nama ber-hash; HTML memakai TTL pendek dengan `stale-while-revalidate`.
- **Ukur pertumbuhan bundle di setiap PR.** Laporan visualizer menangkap impor `moment` yang tidak sengaja sebelum pengguna merasakannya.
- **Anggaran lebih baik daripada opini.** Tetapkan target numerik (misalnya 170 KB JS di halaman produk) agar regresi gagal di review, bukan jadi bahan debat.

## Langkah Implementasi

### Langkah 1: Prerender rute statis

Tandai rute yang tidak bergantung pada request sebagai prerenderable. SvelteKit merendernya saat build dan menyajikan HTML biasa dari CDN, sehingga latensi server dan biaya hidrasi keluar dari jalur kritis.

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter(),
        prerender: {
            entries: ['/', '/pricing', '/legal/*'],
            handleHttpError: ({ path, message }) => {
                console.warn(`Peringatan prerender untuk ${path}: ${message}`);
            }
        }
    }
};

export default config;
```

Satu rute bisa memilih sendiri lewat `export const prerender = true;` di `+page.ts`, dan cara ini lebih baik daripada memperluas daftar entri global.

### Langkah 2: Stream data yang lambat tetapi tidak memblokir

Menunggu API lambat sebelum mengirim HTML menunda semuanya, termasuk bagian yang dicari pengguna. Kembalikan promise-nya dan biarkan halaman menampilkan fallback selama menunggu.

```typescript
// src/routes/products/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    const reviews = fetch('/api/reviews/summary')
        .then((res) => (res.ok ? res.json() : { average: null, count: 0 }))
        .catch((err) => {
            console.error('Ringkasan ulasan gagal dimuat', err);
            return { average: null, count: 0 };
        });

    const products = await fetch('/api/products').then((res) => res.json());
    return { products, reviews }; // ulasan menyusul setelah shell terkirim
};
```

Halaman merender shell lebih dulu, lalu membuka promise dengan `{#await}`:

```svelte
<script lang="ts">
    let { data } = $props();
</script>

<ul>
    {#each data.products as product (product.id)}
        <li>{product.name}</li>
    {/each}
</ul>

{#await data.reviews}
    <p>Memuat ulasan…</p>
{:then reviews}
    <p>Rating {reviews.average ?? 'belum ada'} dari {reviews.count} ulasan</p>
{:catch}
    <p>Ulasan tidak tersedia</p>
{/await}
```

### Langkah 3: Pecah bundle dan audit hasilnya

Code splitting per rute berjalan otomatis, tetapi impor bersama tidak. Pindahkan widget berat ke komponen yang dimuat saat interaksi dengan `import()` dinamis, lalu periksa hasilnya memakai visualizer.

```javascript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
    plugins: [
        sveltekit(),
        visualizer({ filename: 'stats/bundle.html', gzipSize: true, template: 'treemap' })
    ],
    build: { reportCompressedSize: true }
});
```

Impor widget seperti itu dengan `await import(...)` di dalam event handler, bukan di level atas modul, dan bungkus dengan `try/catch` agar kegagalan memuat chunk menampilkan pesan inline, bukan panel kosong.

### Langkah 4: Optimasi gambar

Gunakan `@sveltejs/enhanced-img` agar build menghasilkan entri `srcset` responsif dalam format modern dan memaksakan dimensi intrinsik.

```svelte
<script lang="ts">
    import heroImage from '$lib/assets/hero.jpg?enhanced';
</script>

<enhanced:img src={heroImage} alt="Hero storefront" sizes="(max-width: 768px) 100vw, 50vw" />
```

### Langkah 5: Atur header cache dengan sengaja

HTML publik sebaiknya di-cache singkat dan direvalidasi di latar belakang; respons API untuk pengguna yang login tidak boleh di-cache sama sekali.

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);

    if (event.url.pathname.startsWith('/api/')) {
        response.headers.set('cache-control', 'private, no-store');
        return response;
    }

    if (response.status === 200 && !event.locals.user) {
        response.headers.set('cache-control', 'public, max-age=30, stale-while-revalidate=300');
    }
    return response;
};
```

### Langkah 6: Verifikasi dengan angka nyata

Jalankan `npm run build`, lalu ukur aplikasi hasil build, bukan dev server, karena mode dev melewati minifikasi dan code splitting. Bandingkan skor Lighthouse mobile dan laporan visualizer sebelum serta sesudah setiap perubahan, dan simpan angkanya di deskripsi pull request agar regresi terlihat. Pada praktiknya, optimasi performa di SvelteKit sebagian besar adalah keputusan routing: prerender yang statis, streaming yang lambat, dan bundle bersama yang tetap tipis.

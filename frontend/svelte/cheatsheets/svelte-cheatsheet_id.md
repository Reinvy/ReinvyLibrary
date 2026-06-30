---
title: "Cheat Sheet Svelte"
description: "Panduan referensi cepat untuk deklarasi reaktif Svelte, sintaks komponen, direktif template, store, fungsi siklus hidup, transisi, dan konvensi file SvelteKit."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Svelte

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Membuat proyek SvelteKit | `npm create svelte@latest my-app` | Membuat proyek SvelteKit baru |
| Membuat proyek Svelte vanilla | `npm create vite@latest my-app -- --template svelte` | Membuat proyek dengan template Svelte Vite |
| Menginstal dependensi | `npm install` | Menginstal dependensi proyek |
| Menjalankan server dev | `npm run dev` | Menjalankan server development dengan hot reload |
| Build untuk produksi | `npm run build` | Build aplikasi untuk produksi |
| Pratinjau build produksi | `npm run preview` | Pratinjau build produksi secara lokal |
| Menjalankan tes | `npm test` | Menjalankan rangkaian tes (Vitest) |
| Assignment reaktif | `count += 1` | Memicu reaktivitas pada assignment |
| Pernyataan reaktif | `$: doubled = count * 2` | Menjalankan ulang saat dependensi berubah |
| Blok reaktif | `$: { ... }` | Blok pernyataan multi-baris |
| Deklarasi prop | `export let name` | Mendeklarasikan prop komponen |
| Membuat dispatcher event | `const dispatch = createEventDispatcher()` | Membuat emitter event kustom |
| Mendeklarasikan store | `const count = writable(0)` | Membuat store writable |
| Langganan otomatis store | `$count` | Langganan dan berhenti otomatis dengan prefiks `$` |
| Siklus hidup: on mount | `onMount(() => { ... })` | Menjalankan kode setelah komponen dimount |
| Siklus hidup: before update | `beforeUpdate(() => { ... })` | Menjalankan kode sebelum DOM diperbarui |
| Siklus hidup: after update | `afterUpdate(() => { ... })` | Menjalankan kode setelah DOM diperbarui |
| Siklus hidup: on destroy | `onDestroy(() => { ... })` | Membersihkan saat komponen unmount |
| Menerapkan transisi | `<div transition:fade>` | Menerapkan transisi fade pada masuk/keluar |
| Gaya terlingkup | `<style>` | CSS terlingkup dalam komponen secara default |
| Escape gaya global | `:global(body)` | Menerapkan gaya di luar lingkup komponen |
| Konteks modul | `<script context="module">` | Kode berjalan sekali per grup instance komponen |

## Perintah Umum

### Inisialisasi Proyek

```bash
# Membuat proyek SvelteKit baru dengan CLI interaktif
npm create svelte@latest my-app

# Membuat proyek Svelte vanilla melalui Vite
npm create vite@latest my-app -- --template svelte

# Membuat proyek Svelte dengan TypeScript melalui Vite
npm create vite@latest my-app -- --template svelte-ts

# Masuk ke direktori proyek dan instal dependensi
cd my-app && npm install

# Menjalankan server development
npm run dev

# Build untuk produksi
npm run build

# Pratinjau build produksi secara lokal
npm run preview
```

### CLI SvelteKit (adapter dan konfigurasi)

```bash
# Menambahkan adapter Node.js untuk server-side rendering
npm install --save-dev @sveltejs/adapter-node

# Menambahkan adapter statis untuk static site generation
npm install --save-dev @sveltejs/adapter-static

# Menambahkan adapter Vercel
npm install --save-dev @sveltejs/adapter-vercel

# Menambahkan adapter Netlify
npm install --save-dev @sveltejs/adapter-netlify

# Memeriksa status migrasi Svelte 5
npx svelte-migrate
```

### Manajemen Paket dan Alat

```bash
# Menginstal type checking Svelte
npm install --save-dev typescript svelte-check

# Linting file Svelte dengan ESLint
npm install --save-dev eslint eslint-plugin-svelte

# Format dengan Prettier
npm install --save-dev prettier prettier-plugin-svelte

# Menginstal utilitas testing
npm install --save-dev vitest @sveltejs/vite-plugin-svelte

# Menjalankan type checking
npx svelte-check
```

### Routing SvelteKit

```bash
# Membuat route halaman
# src/routes/+page.svelte — halaman root
# src/routes/about/+page.svelte — route /about
# src/routes/blog/[slug]/+page.svelte — route dinamis

# Membuat API endpoint
# src/routes/api/posts/+server.js — GET /api/posts
# src/routes/api/posts/[id]/+server.js — GET /api/posts/:id
```

## Potongan Kode

### Dasar Komponen

```svelte
<script>
  // Props — dideklarasikan dengan export let
  export let name = 'World';
  export let count = 0;
  export let items = [];

  // Deklarasi reaktif
  $: doubled = count * 2;
  $: greeting = `Halo, ${name}!`;

  // Pernyataan reaktif (dijalankan ulang saat dependensi berubah)
  $: {
    console.log(`Count berubah menjadi ${count}`);
    document.title = `Count: ${count}`;
  }

  // Pernyataan reaktif dengan kondisi
  $: if (count > 10) {
    console.log('Count melebihi batas!');
  }
</script>

<p>{greeting}</p>
<p>Count dua kali lipat adalah {doubled}</p>
```

### Penanganan Event dan Modifier

```svelte
<script>
  let count = 0;
  function handleClick(event) {
    count += 1;
  }
  function handleSubmit(event) {
    event.preventDefault();
    // menangani pengiriman form
  }
  function handleKeydown(event) {
    console.log('Tombol ditekan:', event.key);
  }
</script>

<!-- Penangan event standar -->
<button on:click={handleClick}>
  Diklik {count} kali
</button>

<!-- Penangan event inline -->
<button on:click={() => count = 0}>
  Reset
</button>

<!-- Modifier event: preventDefault, stopPropagation, once, passive, capture -->
<form on:submit|preventDefault={handleSubmit}>
  <input type="text" />
  <button type="submit">Kirim</button>
</form>

<!-- Modifier berantai -->
<div on:click|stopPropagation|once={handleKeydown}>
  Klik saya (hanya berjalan sekali, hentikan propagasi)
</div>

<!-- Modifier umum lainnya -->
<!-- on:click|self — hanya memicu jika event.target === elemen -->
<!-- on:scroll|passive — meningkatkan performa scroll -->
<!-- on:click|capture — menggunakan fase capture bukan bubble -->
```

### Rendering Bersyarat dan Perulangan

```svelte
<script>
  let user = null;
  let loggedIn = false;
  let todos = [
    { id: 1, text: 'Belajar Svelte', done: true },
    { id: 2, text: 'Membangun aplikasi', done: false },
    { id: 3, text: 'Deploy ke produksi', done: false }
  ];
  let promise = fetch('/api/data').then(res => res.json());
</script>

<!-- Bersyarat: {#if} ... {:else if} ... {:else} -->
{#if user}
  <p>Selamat datang kembali, {user.name}!</p>
{:else if loggedIn}
  <p>Memuat data pengguna...</p>
{:else}
  <p>Silakan masuk.</p>
{/if}

<!-- Perulangan: {#each} dengan key -->
<ul>
  {#each todos as todo, i (todo.id)}
    <li class:done={todo.done}>
      {i + 1}. {todo.text}
    </li>
  {/each}
</ul>

<!-- Keadaan kosong untuk {#each} -->
{#each items as item}
  <div>{item.name}</div>
{:else}
  <p>Tidak ada item untuk ditampilkan.</p>
{/each}

<!-- Await promise states -->
{#await promise}
  <p>Memuat...</p>
{:then data}
  <pre>{JSON.stringify(data, null, 2)}</pre>
{:catch error}
  <p class="error">Error: {error.message}</p>
{/await}
```

### Pengikatan Dua Arah

```svelte
<script>
  let name = '';
  let checked = false;
  let selected = 'all';
  let volume = 50;
  let bio = '';
  let toppings = [];

  // Untuk pola bind:this
  let inputElement;
  function focusInput() {
    inputElement.focus();
  }
</script>

<!-- Input teks -->
<input bind:value={name} placeholder="Masukkan nama" />
<p>Halo, {name}!</p>

<!-- Checkbox -->
<label>
  <input type="checkbox" bind:checked={checked} />
  Setuju dengan syarat
</label>

<!-- Grup radio -->
<label><input type="radio" bind:group={selected} value="all" /> Semua</label>
<label><input type="radio" bind:group={selected} value="active" /> Aktif</label>
<label><input type="radio" bind:group={selected} value="completed" /> Selesai</label>

<!-- Select dropdown -->
<select bind:value={selected}>
  <option value="all">Semua</option>
  <option value="active">Aktif</option>
  <option value="completed">Selesai</option>
</select>

<!-- Range slider -->
<input type="range" bind:value={volume} min="0" max="100" />
<p>Volume: {volume}%</p>

<!-- Textarea -->
<textarea bind:value={bio}></textarea>

<!-- Div dengan konten yang dapat diedit -->
<div contenteditable="true" bind:innerHTML={bio}></div>

<!-- Ikatan ke referensi elemen -->
<input bind:this={inputElement} />
<button on:click={focusInput}>Fokus Input</button>
```

### Store

```svelte
<script>
  import { writable, readable, derived } from 'svelte/store';
  import { onMount } from 'svelte';

  // Store writable — store baca/tulis dasar
  export const count = writable(0);

  // Store readable — hanya baca, berguna untuk data eksternal
  export const time = readable(null, (set) => {
    set(new Date().toLocaleTimeString('id-ID'));
    const interval = setInterval(() => {
      set(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(interval);
  });

  // Store derived — dihitung dari store lain
  export const doubled = derived(count, ($count) => $count * 2);

  // Store kustom — membungkus writable dengan method kustom
  function createTodoStore() {
    const { subscribe, set, update } = writable([]);

    return {
      subscribe,
      addItem: (text) => update(items => [...items, { id: Date.now(), text, done: false }]),
      toggleItem: (id) => update(items => items.map(item =>
        item.id === id ? { ...item, done: !item.done } : item
      )),
      removeItem: (id) => update(items => items.filter(item => item.id !== id)),
      reset: () => set([])
    };
  }

  export const todos = createTodoStore();

  // Method store
  count.set(10);              // Mengatur nilai langsung
  count.update(n => n + 1);   // Memperbarui berdasarkan nilai saat ini
  const unsubscribe = count.subscribe(value => {
    console.log('Count:', value);
  });
  unsubscribe();              // Berhenti berlangganan manual
</script>

<!-- Langganan otomatis dengan prefiks $ — berhenti berlangganan otomatis -->
<h1>Count: {$count}</h1>
<h2>Dua Kali Lipat: {$doubled}</h2>
<h3>Waktu saat ini: {$time}</h3>

<!-- Menggunakan store kustom -->
<button on:click={() => $count = $count + 1}>Tambah</button>
<button on:click={count.set(0)}>Reset</button>
```

### Fungsi Siklus Hidup

```svelte
<script>
  import { onMount, onDestroy, beforeUpdate, afterUpdate, tick } from 'svelte';

  let scrollPosition = 0;

  // Berjalan sekali saat komponen di-mount
  onMount(() => {
    console.log('Komponen di-mount');
    // Mengembalikan fungsi pembersihan (sama seperti onDestroy)
    return () => {
      console.log('Pembersihan saat unmount');
    };
  });

  // Berjalan sebelum DOM diperbarui
  beforeUpdate(() => {
    console.log('Akan memperbarui DOM');
  });

  // Berjalan setelah DOM diperbarui
  afterUpdate(() => {
    console.log('DOM diperbarui');
    scrollPosition = window.scrollY;
  });

  // Berjalan saat komponen di-destroy
  onDestroy(() => {
    console.log('Komponen di-unmount');
    // Membersihkan event listener, interval, dll.
  });

  // tick() — mengembalikan promise yang selesai setelah pembaruan DOM tertunda
  async function handleClick() {
    scrollPosition = 0;
    // Menunggu semua perubahan state diterapkan
    await tick();
    // DOM sekarang sudah diperbarui
    console.log('DOM tersinkronisasi');
  }
</script>

<button on:click={handleClick}>
  Reset Scroll
</button>
```

### Transisi dan Animasi

```svelte
<script>
  import { fade, fly, slide, scale, blur, crossfade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { sineOut, elasticInOut } from 'svelte/easing';

  let visible = false;
  let items = ['Apel', 'Pisang', 'Ceri', 'Kurma'];

  function removeItem(index) {
    items = items.filter((_, i) => i !== index);
  }
</script>

<button on:click={() => visible = !visible}>
  Toggle
</button>

<!-- Transisi fade dasar -->
{#if visible}
  <div transition:fade={{ duration: 300 }}>
    Muncul dan menghilang dengan fade
  </div>
{/if}

<!-- Transisi fly (slide dari arah tertentu) -->
{#if visible}
  <div transition:fly={{ y: 20, duration: 400, easing: sineOut }}>
    Terbang dari bawah
  </div>
{/if}

<!-- Transisi slide -->
{#if visible}
  <div transition:slide={{ duration: 300 }}>
    Slide terbuka dan tertutup
  </div>
{/if}

<!-- Transisi scale -->
{#if visible}
  <div transition:scale={{ start: 0.5, duration: 300 }}>
    Skala dari 0.5 ke ukuran penuh
  </div>
{/if}

<!-- Transisi blur dengan custom easing -->
{#if visible}
  <div transition:blur={{ duration: 500, easing: elasticInOut }}>
    Muncul blur dengan elastic easing
  </div>
{/if}

<!-- Transisi masuk/keluar (efek berbeda saat masuk vs keluar) -->
{#if visible}
  <div in:fly={{ x: -100 }} out:fade>
    Masuk dari kiri, keluar dengan fade
  </div>
{/if}

<!-- Flip animation untuk pengurutan ulang daftar -->
<ul>
  {#each items as item, i (item)}
    <li animate:flip={{ duration: 300, easing: sineOut }}>
      {item}
      <button on:click={() => removeItem(i)}>Hapus</button>
    </li>
  {/each}
</ul>
```

### Direktif Class dan Style

```svelte
<script>
  let active = false;
  let error = false;
  let large = true;
  let theme = 'dark';
  let color = 'blue';
</script>

<!-- Direktif class: toggle kelas CSS -->
<button class:active={active} class:error>
  Toggle
</button>

<!-- Direktif class singkatan (nama kelas sama dengan nama variabel) -->
<button class:active>
  {active ? 'Aktif' : 'Tidak Aktif'}
</button>

<!-- Multi direktif class -->
<div class:active class:error class:large>
  Indikator status
</div>

<!-- Direktif style: mengatur gaya inline secara dinamis -->
<div style:color={color}>
  Warna teks adalah {color}
</div>

<div style:background-color={theme === 'dark' ? '#333' : '#fff'}
     style:color={theme === 'dark' ? '#fff' : '#333'}>
  Konten bertema
</div>
```

### Komunikasi Komponen

```svelte
<!-- Parent.svelte -->
<script>
  import Child from './Child.svelte';

  let message = '';
  function handleCustomEvent(event) {
    message = event.detail;
  }

  // bind:property untuk pengikatan dua arah dengan prop komponen
  let parentValue = 'Halo dari parent';
</script>

<!-- Mendengarkan event kustom dari child -->
<Child on:greet={handleCustomEvent} />

<!-- Meneruskan event -->
<Child on:click on:keydown />

<!-- Pengikatan dua arah dengan prop komponen -->
<Child bind:value={parentValue} />

<p>Pesan dari child: {message}</p>

<!-- Slot untuk proyeksi konten -->
<Child>
  <span>Ini adalah konten slot</span>
</Child>

<!-- Slot bernama -->
<Child>
  <h1 slot="header">Konten Header</h1>
  <p slot="footer">Konten Footer</p>
</Child>
```

```svelte
<!-- Child.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let value = '';

  function greet() {
    dispatch('greet', { text: 'Halo dari child!' });
  }
</script>

<button on:click={greet}>
  Sapa Parent
</button>

<!-- Menerima konten slot -->
<slot></slot>

<!-- Slot bernama dengan konten fallback -->
<slot name="header">
  <h2>Header Default</h2>
</slot>
<slot name="footer">
  <p>Footer Default</p>
</slot>

<!-- Slot props (scoped slots) -->
<slot name="item" {item} index={i}>
  <span>Rendering item default</span>
</slot>
```

### CSS Terlingkup dan Gaya Global

```svelte
<!-- Gaya komponen terlingkup secara default — hanya memengaruhi komponen ini -->

<style>
  /* Gaya ini hanya berlaku untuk elemen dalam komponen ini */
  p {
    color: #333;
    font-size: 1rem;
  }

  button {
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
  }

  button:hover {
    background: #4338ca;
  }

  /* :global() — keluar dari lingkup untuk menata elemen di luar komponen */
  :global(body) {
    margin: 0;
    font-family: system-ui, sans-serif;
  }

  :global(.toast) {
    position: fixed;
    top: 1rem;
    right: 1rem;
  }

  /* :global() pada selector — menerapkan kelas global dalam blok terlingkup */
  .card :global(h2) {
    font-size: 1.25rem;
  }
</style>

<p>Paragraf ini terpengaruh oleh gaya terlingkup di atas.</p>
<button>Tombol Bergaya</button>
```

### Konvensi File SvelteKit

```svelte
<!-- src/routes/+page.svelte — Route halaman root -->
<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
</script>

<h1>Halaman Beranda</h1>
<p>Path saat ini: {$page.url.pathname}</p>
<button on:click={() => goto('/about')}>Ke Tentang</button>

<!-- +page.svelte di src/routes/about/+page.svelte — route /about -->
<h1>Halaman Tentang</h1>

<!-- Route dinamis: src/routes/blog/[slug]/+page.svelte -->
<script>
  import { page } from '$app/stores';
  export let data; // data dari +page.server.js atau +page.js
</script>

<h1>{data.post.title}</h1>
<p>Slug: {$page.params.slug}</p>
```

```javascript
// src/routes/+layout.svelte — Layout pembungkus untuk semua route anak
<script>
  import { navigating } from '$app/stores';
</script>

<header>
  <nav>
    <a href="/">Beranda</a>
    <a href="/about">Tentang</a>
    <a href="/blog">Blog</a>
  </nav>
</header>

{#if $navigating}
  <div class="loading-bar">Memuat...</div>
{/if}

<main>
  <slot />
</main>

<footer>
  <p>&copy; 2026 Aplikasi Saya</p>
</footer>
```

```javascript
// src/routes/blog/[slug]/+page.server.js — Fungsi load server
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, fetch }) {
  const res = await fetch(`/api/posts/${params.slug}`);

  if (!res.ok) {
    throw error(404, 'Postingan tidak ditemukan');
  }

  return {
    post: await res.json()
  };
}
```

```javascript
// src/routes/api/posts/+server.js — API endpoint (handler GET)
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, fetch }) {
  const limit = Number(url.searchParams.get('limit')) || 10;
  const posts = await fetchPosts(limit);

  return json(posts);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  const body = await request.json();
  const newPost = await createPost(body);

  return json(newPost, { status: 201 });
}
```

### API Context

```svelte
<!-- Komponen parent: mengatur context -->
<script>
  import { setContext } from 'svelte';

  // Key context (gunakan simbol atau string unik untuk menghindari bentrok)
  const THEME_KEY = Symbol('theme');

  setContext(THEME_KEY, {
    color: 'blue',
    background: '#f0f0f0',
    fontSize: '16px'
  });
</script>

<slot />
```

```svelte
<!-- Komponen child: mendapatkan context -->
<script>
  import { getContext } from 'svelte';

  const THEME_KEY = Symbol('theme');
  const theme = getContext(THEME_KEY);
</script>

<div style="color: {theme.color}; background: {theme.background}; font-size: {theme.fontSize};">
  <slot />
</div>
```

### Fungsi Action

```svelte
<script>
  // Action kustom — fungsi yang menerima elemen DOM
  function clickOutside(node, callback) {
    function handleClick(event) {
      if (!node.contains(event.target)) {
        callback();
      }
    }

    document.addEventListener('click', handleClick, true);

    return {
      destroy() {
        document.removeEventListener('click', handleClick, true);
      },
      update(newCallback) {
        callback = newCallback;
      }
    };
  }

  let showDropdown = false;
</script>

<button on:click={() => showDropdown = !showDropdown}>
  Toggle Dropdown
</button>

{#if showDropdown}
  <div use:clickOutside={() => showDropdown = false} class="dropdown">
    <p>Dropdown ini menutup saat klik di luar.</p>
  </div>
{/if}
```

### Variabel Lingkungan (SvelteKit)

```javascript
// .env — variabel lingkungan (prefiks PUBLIC_ untuk akses sisi klien)
// PUBLIC_API_URL=https://api.example.com
// SECRET_API_KEY=kunci-rahasia-saya (hanya server)

// Di +page.server.js atau +page.js (fungsi load sisi server)
// Akses semua variabel melalui:
// import { env } from '$env/dynamic/private';

// Di kode sisi klien atau file .svelte:
import { env } from '$env/dynamic/public';
console.log(env.PUBLIC_API_URL);

// Env statis (tersedia saat build time):
import { PUBLIC_API_URL } from '$env/static/public';
import { SECRET_API_KEY } from '$env/static/private';
```

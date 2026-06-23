---
title: "Memulai dengan Svelte"
description: "Tutorial komprehensif tentang Svelte — mencakup model deklarasi reaktif, arsitektur komponen, styling scoped, props dan penanganan event, pernyataan reaktif, fungsi lifecycle, store untuk manajemen state, dan membangun aplikasi interaktif yang lengkap."
category: "frontend"
technology: "svelte"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Memulai dengan Svelte

## Ringkasan

Svelte adalah framework frontend radikal yang memindahkan pekerjaan dari browser ke tahap kompilasi. Tidak seperti React atau Vue, yang mengirimkan runtime library ke browser dan menggunakan virtual DOM diffing, Svelte adalah compiler yang mengubah komponen deklaratif Anda menjadi kode imperatif yang sangat efisien pada waktu build. Hasilnya adalah ukuran bundle yang lebih kecil, performa runtime yang lebih cepat, dan pengalaman pengembang yang lebih sederhana.

Tutorial ini mencakup semua yang Anda butuhkan untuk mulai membangun aplikasi web dengan Svelte — dari pengaturan proyek dan arsitektur komponen hingga deklarasi reaktif, penanganan event, gaya scoped, dan manajemen state dengan store Svelte. Pada akhirnya, Anda akan membangun aplikasi to-do interaktif lengkap yang mendemonstrasikan semua konsep inti.

## Target Audiens

- Pengembang frontend dan pengembang full-stack yang ingin mempelajari pendekatan berbasis compiler modern untuk pengembangan UI.
- Tingkat pemula hingga menengah — tidak diperlukan pengalaman Svelte sebelumnya, tetapi familiaritas dasar dengan HTML, CSS, dan JavaScript diharapkan.

## Prasyarat

- Pengetahuan dasar HTML, CSS, dan JavaScript (sintaks ES6+, arrow functions, modul).
- Node.js (versi 16 atau lebih baru) dan npm terinstal di mesin pengembangan Anda.
- Editor kode (VS Code direkomendasikan dengan ekstensi Svelte).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Menginisialisasi proyek Svelte menggunakan alat scaffolding resmi
- Memahami model komponen Svelte (file `.svelte`, bagian script, style, markup)
- Menggunakan deklarasi reaktif (`$:`) untuk memperbarui nilai turunan secara otomatis
- Menangani event pengguna dan mengelola state komponen dengan two-way binding
- Mengoper data antar komponen menggunakan props dan mengirim event kustom
- Menerapkan CSS scoped dan menggunakan modifier `:global()`
- Mengelola state aplikasi bersama dengan store writable Svelte
- Membuild dan mendeploy aplikasi Svelte ke produksi

## Konteks dan Motivasi

Framework frontend tradisional seperti React, Vue, dan Angular beroperasi pada runtime. Ketika pengguna mengunjungi halaman, browser mengunduh bundle JavaScript yang mencakup runtime framework, kemudian menggunakan virtual DOM diffing untuk menentukan apa yang berubah dan memperbarui DOM asli. Overhead runtime ini mempengaruhi waktu muat awal (bundle lebih besar) dan performa berkelanjutan (biaya diffing pada setiap perubahan state).

Svelte mengambil pendekatan yang fundamentally berbeda. Svelte adalah **compiler**, bukan runtime. Ketika Anda membangun aplikasi, Svelte mengkompilasi komponen Anda menjadi JavaScript yang sangat teroptimasi dan bebas framework yang secara langsung memanipulasi DOM. Tidak ada virtual DOM, tidak ada algoritma diffing, dan tidak ada runtime framework yang perlu diunduh. Hasilnya adalah ukuran bundle yang jauh lebih kecil — aplikasi Svelte minimal sekitar 1,5 KB gzip dibandingkan dengan 30+ KB untuk React — dan performa lebih cepat karena pembaruan bersifat langsung (surgical) bukan komparatif.

Selain performa, Svelte menawarkan pengalaman pengembang yang menyegarkan. Komponen ditulis dalam file `.svelte` tunggal yang menggabungkan HTML, CSS, dan JavaScript secara alami. CSS di-scoped secara default, reaktivitas bersifat deklaratif (Anda menulis `count += 1` dan UI diperbarui), dan konsep yang perlu dipelajari lebih sedikit dibandingkan framework lain. Ini membuat Svelte menjadi pilihan yang sangat baik untuk proyek di mana ukuran bundle dan performa penting — seperti embed interaktif, web mobile, dan situs berbasis konten — sambil tetap cukup kuat untuk aplikasi halaman tunggal skala penuh.

## Konten Inti

### Pengaturan Proyek dengan SvelteKit

SvelteKit adalah framework aplikasi resmi untuk Svelte, mirip dengan Next.js untuk React atau Nuxt untuk Vue. SvelteKit menyediakan routing berbasis file, server-side rendering, static site generation, dan route API secara built-in.

Buat proyek SvelteKit baru:

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

Selama pengaturan, Anda akan diminta memilih opsi seperti dukungan TypeScript, ESLint, dan testing. Untuk tutorial ini, pilih proyek skeleton dengan JavaScript.

Struktur proyek terlihat seperti ini:

```text
my-app/
├── src/
│   ├── routes/
│   │   ├── +page.svelte
│   │   └── +layout.svelte
│   └── app.html
├── static/
├── svelte.config.js
├── vite.config.js
└── package.json
```

### Memahami Komponen Svelte

Komponen Svelte adalah file `.svelte` tunggal yang berisi tiga bagian: `<script>`, `<style>`, dan markup (HTML). Berikut adalah komponen paling sederhana:

```svelte
<script>
  let name = 'world';
</script>

<h1>Hello {name}!</h1>

<style>
  h1 {
    color: purple;
  }
</style>
```

Sintaks `{name}` adalah interpolasi template Svelte. Ketika `name` berubah, DOM diperbarui secara otomatis tanpa panggilan render eksplisit. Bagian `<style>` di-**scoped secara default** — CSS hanya berlaku untuk elemen dalam komponen ini, menghindari konflik gaya di seluruh aplikasi Anda.

### Deklarasi Reaktif

Salah satu fitur paling khas dari Svelte adalah deklarasi reaktif, dilambangkan dengan `$:`. Anggap saja sebagai formula spreadsheet — setiap kali variabel yang dirujuk dalam deklarasi berubah, deklarasi tersebut akan berjalan ulang secara otomatis.

```svelte
<script>
  let count = 0;
  let doubled = count * 2;

  // Deklarasi reaktif: berjalan setiap kali count berubah
  $: doubled = count * 2;

  // Pernyataan reaktif dengan efek samping
  $: console.log(`count sekarang ${count}`);

  // Blok reaktif multi-baris
  $: {
    console.log(`doubled adalah ${doubled}`);
    // Anda dapat menempatkan pernyataan apa pun di sini
  }

  function increment() {
    count += 1;
  }
</script>

<button on:click={increment}>
  Diklik {count} kali
</button>

<p>{count} dikali 2 adalah {doubled}</p>
```

Perhatikan bahwa `doubled = count * 2` saja (tanpa `$:`) tidak akan reaktif — hanya akan menghitung nilai sekali saat komponen diinisialisasi. Prefiks `$:` membuatnya reaktif.

### Penanganan Event dan Binding

Svelte menggunakan direktif `on:` untuk penanganan event dan `bind:` untuk two-way data binding.

```svelte
<script>
  let name = '';
  let items = [];

  function handleSubmit() {
    items = [...items, name];
    name = '';
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<input
  bind:value={name}
  on:keydown={handleKeydown}
  placeholder="Masukkan item"
/>

<button on:click={handleSubmit}>Tambah</button>

<ul>
  {#each items as item, i}
    <li>{i + 1}: {item}</li>
  {/each}
</ul>
```

Contoh ini mendemonstrasikan:
- `bind:value={name}` — binding dua arah antara input dan variabel `name`
- `on:click` dan `on:keydown` — event listener
- `{#each items as item, i}` — sintaks template Svelte untuk melakukan looping array

### Props dan Event Komponen

Komponen menerima data melalui **props** (`export let`) dan berkomunikasi ke atas melalui **event** (`createEventDispatcher`).

**Komponen anak** (`Item.svelte`):

```svelte
<script>
  import { createEventDispatcher } from 'svelte';

  // Deklarasikan props dengan export let
  export let text = '';
  export let done = false;

  const dispatch = createEventDispatcher();

  function toggle() {
    dispatch('toggle', !done);
  }

  function remove() {
    dispatch('remove');
  }
</script>

<div class="item" class:done>
  <span on:click={toggle}>{text}</span>
  <button on:click={remove}>✕</button>
</div>

<style>
  .item { display: flex; align-items: center; gap: 0.5rem; }
  .done span { text-decoration: line-through; opacity: 0.5; }
</style>
```

**Komponen induk** menggunakan komponen anak:

```svelte
<script>
  import Item from './Item.svelte';

  let todos = [
    { id: 1, text: 'Belajar Svelte', done: false },
    { id: 2, text: 'Bangun aplikasi', done: false }
  ];

  function handleToggle(event, id) {
    todos = todos.map(t =>
      t.id === id ? { ...t, done: event.detail } : t
    );
  }

  function handleRemove(id) {
    todos = todos.filter(t => t.id !== id);
  }
</script>

{#each todos as todo (todo.id)}
  <Item
    text={todo.text}
    done={todo.done}
    on:toggle={(e) => handleToggle(e, todo.id)}
    on:remove={() => handleRemove(todo.id)}
  />
{/each}
```

`(todo.id)` dalam blok `{#each}` adalah **key expression** yang membantu Svelte memperbarui daftar secara efisien ketika item ditambahkan, dihapus, atau diurutkan ulang, mirip dengan prop `key` di React.

### Pernyataan Reaktif dan Kontrol Alur

Svelte menyediakan sintaks template untuk kondisional dan loop yang tetap dekat dengan HTML:

```svelte
<script>
  let user = null;
  let score = 85;
  let colors = ['red', 'green', 'blue'];
</script>

<!-- Kondisional -->
{#if user}
  <p>Selamat datang kembali, {user.name}!</p>
{:else if user === null}
  <p>Memuat...</p>
{:else}
  <p>Silakan login.</p>
{/if}

<!-- Loop -->
<ul>
  {#each colors as color, index}
    <li style="color: {color}">{index}: {color}</li>
  {/each}
</ul>

<!-- Menunggu promise -->
{#await promise}
  <p>Memuat...</p>
{:then value}
  <p>Hasil: {value}</p>
{:catch error}
  <p>Error: {error.message}</p>
{/await}
```

### Manajemen State dengan Store

Untuk state bersama antar komponen, Svelte menyediakan **store**. Yang paling umum adalah writable store:

```svelte
<script>
  // lib/stores.js
  import { writable, derived } from 'svelte/store';

  // Writable store menyimpan nilai yang dapat dibaca dan diubah dari mana saja
  export const todos = writable([]);

  // Derived store menghitung nilainya dari store lain
  export const activeCount = derived(todos, ($todos) =>
    $todos.filter(t => !t.done).length
  );

  export function addTodo(text) {
    todos.update(t => [...t, { id: Date.now(), text, done: false }]);
  }

  export function toggleTodo(id) {
    todos.update(t => t.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ));
  }
</script>
```

Menggunakan store dalam komponen:

```svelte
<script>
  import { todos, activeCount, addTodo } from './lib/stores.js';

  let newTodo = '';

  // Auto-subscribe: awali nama store dengan $ untuk membaca nilainya
  // $todos dan $activeCount secara otomatis di-subscribe/unsubscribe
</script>

<p>{$activeCount} item tersisa</p>

<input bind:value={newTodo} placeholder="Tambah todo" />
<button on:click={() => { addTodo(newTodo); newTodo = ''; }}>Tambah</button>

{#each $todos as todo (todo.id)}
  <div>
    <input type="checkbox" checked={todo.done} on:click={() => toggleTodo(todo.id)} />
    <span class:done={todo.done}>{todo.text}</span>
  </div>
{/each}
```

Prefiks `$` adalah sintaks **store auto-subscription** Svelte. Ketika Anda mengawali variabel store dengan `$`, Svelte secara otomatis subscribe ke store di `onMount` dan unsubscribe di `onDestroy`. Ini berarti Anda tidak perlu memanggil `.subscribe()` secara manual atau khawatir tentang pembersihan.

### Fungsi Lifecycle

Svelte menyediakan beberapa fungsi lifecycle yang dapat diimpor dari `svelte`:

```svelte
<script>
  import { onMount, onDestroy, beforeUpdate, afterUpdate, tick } from 'svelte';

  onMount(() => {
    // Berjalan setelah komponen pertama kali di-render
    // Mengembalikan fungsi pembersihan yang berjalan saat destroy
    const interval = setInterval(() => console.log('tick'), 1000);
    return () => clearInterval(interval);
  });

  beforeUpdate(() => {
    // Berjalan sebelum DOM diperbarui
  });

  afterUpdate(() => {
    // Berjalan setelah DOM diperbarui
  });

  onDestroy(() => {
    // Berjalan ketika komponen dihancurkan
    // Pembersihan juga ditangani dengan mengembalikan dari onMount
  });
</script>
```

### Gaya Scoped dan Modifier Global

Gaya dalam file `.svelte` di-scoped secara default. Svelte menghasilkan nama class unik untuk mencegah kebocoran:

```svelte
<style>
  /* Hanya mempengaruhi elemen <p> di komponen INI */
  p {
    color: blue;
  }

  /* Menonaktifkan scoping untuk selector tertentu */
  :global(body) {
    margin: 0;
    font-family: sans-serif;
  }

  /* Menggabungkan scoped dan global: terapkan class scoped ke elemen global */
  :global(.dark-mode) p {
    color: white;
  }
</style>
```

## Contoh Kode

### Aplikasi Todo Interaktif Lengkap

Berikut adalah aplikasi todo Svelte lengkap yang menggabungkan semua konsep yang dibahas dalam tutorial ini.

**`src/lib/stores.js`** — State bersama:

```javascript
import { writable, derived } from 'svelte/store';

export const todos = writable([]);

export const activeCount = derived(todos, ($todos) =>
  $todos.filter(t => !t.done).length
);

export const filter = writable('all');

export function addTodo(text) {
  todos.update(t => [...t, { id: Date.now(), text, done: false }]);
}

export function toggleTodo(id) {
  todos.update(t => t.map(item =>
    item.id === id ? { ...item, done: !item.done } : item
  ));
}

export function removeTodo(id) {
  todos.update(t => t.filter(item => item.id !== id));
}

export function clearCompleted() {
  todos.update(t => t.filter(item => !item.done));
}
```

**`src/routes/+page.svelte`** — Halaman utama:

```svelte
<script>
  import { todos, activeCount, filter, addTodo, toggleTodo, removeTodo, clearCompleted } from '$lib/stores.js';

  let newTodo = '';

  $: filteredTodos = $filter === 'all'
    ? $todos
    : $filter === 'active'
      ? $todos.filter(t => !t.done)
      : $todos.filter(t => t.done);

  function handleAdd() {
    if (newTodo.trim()) {
      addTodo(newTodo.trim());
      newTodo = '';
    }
  }
</script>

<main>
  <h1>Aplikasi Todo</h1>

  <div class="input-row">
    <input
      bind:value={newTodo}
      on:keydown={(e) => e.key === 'Enter' && handleAdd()}
      placeholder="Apa yang perlu dilakukan?"
    />
    <button on:click={handleAdd}>Tambah</button>
  </div>

  {#if $todos.length > 0}
    <div class="filters">
      <button class:active={$filter === 'all'} on:click={() => filter.set('all')}>Semua</button>
      <button class:active={$filter === 'active'} on:click={() => filter.set('active')}>Aktif</button>
      <button class:active={$filter === 'completed'} on:click={() => filter.set('completed')}>Selesai</button>
    </div>

    <ul>
      {#each filteredTodos as todo (todo.id)}
        <li class:done={todo.done}>
          <input
            type="checkbox"
            checked={todo.done}
            on:click={() => toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
          <button class="remove" on:click={() => removeTodo(todo.id)}>✕</button>
        </li>
      {/each}
    </ul>

    <div class="footer">
      <span>{$activeCount} item tersisa</span>
      {#if $todos.some(t => t.done)}
        <button on:click={clearCompleted}>Hapus selesai</button>
      {/if}
    </div>
  {:else}
    <p class="empty">Belum ada todo. Tambahkan satu di atas!</p>
  {/if}
</main>

<style>
  main {
    max-width: 500px;
    margin: 2rem auto;
    font-family: system-ui, sans-serif;
  }

  h1 {
    text-align: center;
    color: #333;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  input[type="text"] {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  button:hover {
    background: #f0f0f0;
  }

  .filters {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
    justify-content: center;
  }

  .filters button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }

  li.done span {
    text-decoration: line-through;
    opacity: 0.5;
  }

  li .remove {
    margin-left: auto;
    border: none;
    background: none;
    color: #999;
    cursor: pointer;
  }

  li .remove:hover {
    color: #e74c3c;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: #666;
  }

  .empty {
    text-align: center;
    color: #999;
    font-style: italic;
  }
</style>
```

## Insight Penting

- **Compile-time alih-alih runtime**: Keunggulan utama Svelte adalah mengkompilasi framework pada waktu build. Outputnya adalah JavaScript biasa tanpa overhead virtual DOM, menghasilkan bundle yang 5–10× lebih kecil dibandingkan aplikasi React atau Vue yang setara.
- **Reaktivitas adalah model mental inti**: Memahami deklarasi reaktif `$:` adalah konsep terpenting setelah model komponen itu sendiri. Tidak seperti `useState` React — di mana Anda harus memanggil fungsi setter — Svelte memungkinkan Anda menulis `count += 1` dan UI diperbarui secara otomatis karena compiler menginstrumentasi assignment.
- **CSS scoped secara default**: Gaya dalam file `.svelte` di-scoped ke komponen tersebut, yang menghilangkan konflik CSS tanpa memerlukan CSS Modules, styled-components, atau konvensi penamaan BEM. Gunakan `:global()` secara intensional untuk gaya yang perlu keluar dari lingkup komponen.
- **Store untuk state bersama, bukan state lokal**: Reaktivitas lokal Svelte (deklarasi reaktif dan direktif `bind:`) menangani sebagian besar state lokal komponen. Store harus digunakan untuk state yang benar-benar perlu dibagikan antar komponen yang tidak terkait. Penggunaan store secara berlebihan untuk state lokal menambah indirection yang tidak perlu.
- **Prefiks `$` store itu ajaib**: Ketika Anda menulis `$storeName`, Svelte secara otomatis subscribe di `onMount` dan unsubscribe di `onDestroy`. Anda juga dapat menulis `$storeName = value` untuk memanggil `.set()` — sintaks `$` menangani pembacaan dan penulisan dengan mulus.

## Langkah Berikutnya

- Pelajari tentang transisi dan animasi Svelte untuk menambahkan gerakan ke aplikasi Anda
- Jelajahi pola routing lanjutan SvelteKit (layout groups, page endpoints, form actions)
- Siapkan server-side rendering dan static site generation dengan SvelteKit
- Pelajari tutorial Svelte di [learn.svelte.dev](https://learn.svelte.dev) untuk latihan interaktif

## Kesimpulan

Svelte menawarkan alternatif yang menarik untuk framework frontend tradisional dengan memindahkan pekerjaan ke waktu kompilasi. Model komponennya intuitif — HTML, CSS, dan JavaScript hidup berdampingan secara alami dalam satu file — dan model reaktifnya membuat manajemen state terasa seperti JavaScript biasa. Kombinasi ukuran bundle kecil, performa runtime yang sangat baik, dan kurva pembelajaran yang landai membuat Svelte menjadi pilihan ideal untuk widget interaktif kecil maupun aplikasi web skala penuh.

Anda sekarang memiliki pengetahuan dasar untuk membangun aplikasi nyata dengan Svelte. Mulailah dengan aplikasi todo dari tutorial ini, bereksperimenlah dengan store dan deklarasi reaktif, dan jelajahi kemampuan routing dan server-side rendering SvelteKit seiring pertumbuhan aplikasi Anda.

---
title: "Cheat Sheet Runes dan Reaktivitas Modern Svelte 5"
description: "Referensi cepat untuk runes Svelte 5 — $state, $derived, $effect, $props, $bindable, $inspect, snippet, dan atribut event — dengan contoh praktis untuk menulis komponen reaktif modern."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Runes dan Reaktivitas Modern Svelte 5

## Tabel Referensi Cepat

| Rune / Fitur | Kode | Deskripsi |
|--------------|------|-----------|
| Mode runes | `runes: true` di `svelte.config.js` | Mengaktifkan sistem reaktivitas modern di seluruh proyek |
| `$state` | `let count = $state(0)` | Mendeklarasikan variabel reaktif; penugasan memicu render ulang |
| `$state` objek/kelas | `let user = $state({ nama: 'Ada' })` | Reaktivitas mendalam — properti bersarang ikut reaktif |
| `$state.raw` | `let rows = $state.raw(arrBesar)` | State reaktif dangkal tanpa proxying mendalam |
| `$state.snapshot` | `const plain = $state.snapshot(user)` | Mengambil salinan data non-reaktif dari state reaktif |
| `$state.is` | `$state.is(nilai)` | Mengembalikan `true` jika suatu nilai adalah state reaktif |
| `$derived` | `let duaKali = $derived(count * 2)` | Mendeklarasikan nilai turunan dari state reaktif |
| `$derived.by` | `let total = $derived.by(() => jumlah(items))` | Menurunkan nilai dari sebuah blok kode |
| `$effect` | `$effect(() => subscribe(store))` | Menjalankan kode saat state yang dilacak berubah dan membersihkan efek |
| `$effect.pre` | `$effect.pre(() => ukur())` | Berjalan sebelum DOM diperbarui |
| `$effect.untracked` | `$effect.untracked(() => log())` | Menjalankan kode tanpa melacak dependensi |
| `$props` | `let { judul = 'Hai' } = $props()` | Mendeklarasikan props komponen beserta nilai default |
| `$bindable` | `let { nilai = $bindable(0) } = $props()` | Menandai sebuah prop agar bisa di-bind dua arah |
| `$inspect` | `$inspect(count)` | Mencatat perubahan state terpantau beserta lokasi sumber |
| `$host` | `const el = $host()` | Mengembalikan elemen host di dalam komponen custom element |
| Snippet | `{#snippet chip(teks)}...{/snippet}` | Fragmen markup yang dapat dipakai ulang, dirender dengan `{@render chip(teks)}` |
| Atribut event | `onclick={() => count++}` | Sintaks event modern pengganti `on:click` |

## Perintah Umum

### Penyiapan Proyek

```bash
# Membuat proyek Svelte 5 baru dengan CLI sv
npx sv create aplikasi-saya

# Menambahkan Svelte ke proyek Vite yang sudah ada
npm create vite@latest aplikasi-saya -- --template svelte

# Memasang dependensi
npm install
```

### Mengaktifkan Mode Runes

```bash
# Tambahkan compilerOptions.runes di svelte.config.js, lalu mulai ulang server dev
npm run dev
```

### Pemeriksaan Tipe dan Migrasi

```bash
# Memeriksa tipe di semua file Svelte
npx svelte-check

# Memigrasikan komponen lama ke sintaks runes
npx sv migrate runes
```

### Perintah Pengembangan

```bash
npm run dev      # menjalankan server dev
npm run build    # build produksi
npm run preview  # pratinjau hasil build produksi
```

## Potongan Kode

### Konfigurasi Mode Runes

```javascript
// svelte.config.js — mengaktifkan runes untuk seluruh proyek
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: { runes: true }
};

export default config;
```

### `$state` — Variabel Reaktif

```svelte
<script>
  let count = $state(0);

  function tambah() {
    count += 1;
  }
</script>

<button onclick={tambah}>
  Klik: {count}
</button>
```

### `$derived` — Nilai Turunan

```svelte
<script>
  let jumlah = $state(2);
  let harga = $state(19.99);

  // Derivasi inline
  let total = $derived(jumlah * harga);

  // Bentuk blok untuk derivasi bertingkat
  let pajak = $derived.by(() => {
    const dasar = total * 0.1;
    return Math.round(dasar * 100) / 100;
  });
</script>

<p>{jumlah} x {harga} = {total} (pajak {pajak})</p>
```

### `$effect` — Efek Samping

```svelte
<script>
  let tema = $state('terang');

  // Berjalan ulang setiap kali `tema` berubah; fungsi yang dikembalikan adalah pembersih
  $effect(() => {
    document.documentElement.dataset.theme = tema;
    return () => console.log('efek tema dibersihkan');
  });

  // Berjalan sebelum pembaruan DOM — aman untuk mengukur tata letak
  $effect.pre(() => {
    console.log('Lebar tata letak:', document.body.offsetWidth);
  });

  // Membaca tanpa membuat langganan
  $effect.untracked(() => {
    console.log('Bacaan tanpa pelacakan:', tema);
  });
</script>

<button onclick={() => (tema = tema === 'terang' ? 'gelap' : 'terang')}>
  Ganti tema
</button>
```

### `$props` dan `$bindable` — Komunikasi Antar Komponen

```svelte
<!-- Counter.svelte -->
<script>
  let { label = 'Penghitung', nilai = $bindable(0) } = $props();
</script>

<button onclick={() => nilai++}>
  {label}: {nilai}
</button>
```

```svelte
<!-- App.svelte -->
<script>
  import Counter from './Counter.svelte';
  let total = $state(0);
</script>

<Counter label="Skor" bind:nilai={total} />
<p>Total: {total}</p>
```

### Reaktivitas Mendalam dengan Objek dan Array

```svelte
<script>
  let todos = $state([{ id: 1, selesai: false, teks: 'Belajar runes' }]);

  function toggle(id) {
    // Mutasi bersarang bersifat reaktif — tanpa perlu penugasan ulang
    const todo = todos.find((t) => t.id === id);
    if (todo) todo.selesai = !todo.selesai;
  }

  function tambahTodo(teks) {
    todos.push({ id: todos.length + 1, selesai: false, teks });
  }
</script>

{#each todos as todo}
  <button onclick={() => toggle(todo.id)}>
    {todo.selesai ? 'selesai' : 'proses'} — {todo.teks}
  </button>
{/each}
```

### `$state.raw` dan `$state.snapshot`

```svelte
<script>
  // State dangkal: ubah dengan menugaskan ulang seluruh nilai, bukan kolom bersarang
  let baris = $state.raw(muatBaris());

  function tandaiSemua() {
    baris = baris.map((r) => ({ ...r, ditandai: true }));
  }

  // Keluar dari reaktivitas saat menyerahkan data ke pustaka non-reaktif
  function eksporJson() {
    const plain = $state.snapshot(baris);
    console.log(JSON.stringify(plain));
  }
</script>
```

### `$inspect` — Pelacakan Saat Pengembangan

```svelte
<script>
  let pencarian = $state('');

  // Mencatat setiap perubahan beserta tautan ke lokasi sumber (khusus dev)
  $inspect(pencarian);
</script>

<input bind:value={pencarian} placeholder="Ketik untuk memeriksa" />
```

### Snippet dan Tag Render

```svelte
<script>
  let items = $state(['Svelte', 'Runes', 'Snippets']);
</script>

{#snippet chip(teks)}
  <span class="chip">{teks}</span>
{/snippet}

{#snippet renderList(daftar)}
  {#each daftar as item}
    {@render chip(item)}
  {/each}
{/snippet}

{@render renderList(items)}
```

### Atribut Event vs Direktif Lama

```svelte
<script>
  let nama = $state('dunia');
</script>

<!-- Modern: atribut event langsung menerima fungsi -->
<input value={nama} oninput={(e) => (nama = e.target.value)} />

<!-- Binding dua arah tetap didukung -->
<input bind:value={nama} />

<!-- Direktif on:event lama masih dikompilasi namun sudah deprecated -->
```

### Kelas Reaktif dan `$state.is`

```svelte
<script>
  class Timer {
    detik = $state(0);
    #interval;

    mulai() {
      this.#interval = setInterval(() => this.detik++, 1000);
    }

    berhenti() {
      clearInterval(this.#interval);
    }
  }

  const timer = new Timer();
  timer.mulai();

  // `$state.is` membedakan data reaktif dari data biasa
  let angkaBiasa = 42;
  console.log($state.is(timer.detik)); // true
  console.log($state.is(angkaBiasa));  // false
</script>

<p>Berlalu: {timer.detik} detik</p>
```

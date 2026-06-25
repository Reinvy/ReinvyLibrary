---
title: "Memulai dengan Bun"
description: "Pengenalan komprehensif tentang Bun — runtime JavaScript all-in-one, package manager, test runner, dan bundler. Pelajari instalasi, API inti, dan alur kerja produksi."
category: "backend"
technology: "bun"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Memulai dengan Bun

## Ringkasan

Tutorial ini memperkenalkan Bun, runtime JavaScript all-in-one dan toolkit yang dirancang untuk kecepatan. Anda akan mempelajari cara menginstal Bun, menggunakan package manager bawaan, menulis server HTTP dan operasi file, mengintegrasikan database SQLite, menjalankan pengujian, dan men-deploy aplikasi Bun ke produksi.

## Target Audiens

- Developer backend dan full-stack JavaScript/TypeScript.
- Developer yang sudah familiar dengan Node.js atau Deno dan mencari alternatif runtime yang lebih cepat.

## Prasyarat

- Pengetahuan dasar JavaScript (ES modules, arrow functions, `async`/`await`).
- Familiar dengan penggunaan terminal/command-line.
- Tidak diperlukan pengalaman Bun sebelumnya.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginstal dan mengonfigurasi Bun di mesin pengembangan Anda.
- Menggunakan perintah CLI `bun` untuk menginisialisasi, menjalankan, dan men-debug proyek.
- Membuat server HTTP menggunakan `Bun.serve()` dengan pola routing dan middleware.
- Membaca dan menulis file menggunakan `Bun.file()` dan `Bun.write()`.
- Melakukan operasi database SQLite dengan `Bun.sqlite()`.
- Menulis dan menjalankan pengujian menggunakan test runner bawaan Bun.
- Mengelola dependensi dengan `bun install`, `bun add`, dan `bun remove`.
- Build dan bundle proyek TypeScript untuk deployment produksi.

## Konteks dan Motivasi

Kinerja runtime JavaScript telah menjadi hambatan kritis seiring bertambahnya kompleksitas aplikasi. Meskipun Node.js telah menjadi runtime sisi server yang dominan selama lebih dari satu dekade, arsitekturnya — yang berakar pada desain V8 era 2009 — menimbulkan latensi yang melekat dalam resolusi modul, instalasi paket, dan eksekusi skrip. Bun diciptakan untuk mengatasi masalah-masalah ini secara langsung.

Bun dibangun di atas **JavaScriptCore** (mesin yang mendukung Safari) dan bukan V8, serta menyertakan package manager asli yang menyelesaikan dependensi hingga 30× lebih cepat dari npm. Bun juga dilengkapi dengan test runner bawaan (kompatibel dengan Node.js), bundler, dan transpiler — menghilangkan kebutuhan akan alat terpisah seperti Webpack, Babel, atau Jest di banyak proyek.

Untuk tim yang bekerja dengan **Elysia.js** (sudah dibahas di perpustakaan ini), Bun adalah runtime asli yang memungkinkan karakteristik kinerja Elysia. Bun juga menyederhanakan pengembangan TypeScript full-stack dengan memahami TypeScript dan JSX secara native tanpa konfigurasi, menghilangkan langkah kompilasi `tsc` atau `Babel` tradisional.

## Konten Inti

### Instalasi

Bun menyediakan skrip instalasi tunggal untuk macOS, Linux, dan Windows (melalui WSL):

```bash
curl -fsSL https://bun.sh/install | bash
```

Setelah instalasi, verifikasi versi:

```bash
bun --version
```

Untuk metode instalasi alternatif (npm, Homebrew, atau mengunduh biner), lihat [dokumentasi resmi](https://bun.sh/docs/installation).

### Inisialisasi Proyek

Buat proyek baru dan inisialisasi dengan Bun:

```bash
mkdir my-bun-project
cd my-bun-project
bun init
```

Perintah `bun init` akan meminta detail proyek dan menghasilkan `package.json`, `tsconfig.json`, dan file entri (`index.ts`). Proyek Bun menggunakan TypeScript secara default, tetapi JavaScript biasa juga didukung penuh.

### Menjalankan Skrip

Jalankan file dengan Bun:

```bash
bun run index.ts
```

Bun juga mendukung skrip inline dan mode watch:

```bash
# Jalankan sekali
bun -e "console.log('Halo dari Bun!')"

# Watch mode — restart saat file berubah
bun --watch index.ts
```

### Manajemen Paket

Bun adalah pengganti langsung untuk npm, Yarn, dan pnpm. Semua perintah yang familiar berfungsi seperti yang diharapkan:

```bash
# Install dependensi dari package.json
bun install

# Tambah dependensi
bun add express
bun add -d typescript    # dev dependency

# Hapus dependensi
bun remove express

# Update semua dependensi
bun update
```

Bun menginstal dependensi menggunakan cache modul global — identik dengan strategi pnpm — yang berarti proyek kedua di mesin Anda yang menginstal paket yang sama akan hampir instan.

### Server HTTP dengan Bun.serve()

Bun menyertakan server HTTP asli yang menangani permintaan tanpa framework apa pun:

```typescript
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response('Selamat datang di Bun!', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (url.pathname === '/api/hello' && request.method === 'GET') {
      return Response.json({ message: 'Halo dari Bun!' });
    }

    return new Response('Tidak Ditemukan', { status: 404 });
  },
});

console.log(`Server berjalan di http://localhost:${server.port}`);
```

Fitur utama `Bun.serve()`:

- **TLS/SSL otomatis**: Berikan `tls: { key, cert }` untuk mengaktifkan HTTPS tanpa setup reverse proxy.
- **Streaming respons**: Kembalikan objek `Response` dengan body `ReadableStream` untuk SSE atau payload besar.
- **Dukungan WebSocket**: Tambahkan handler `websocket` bersama `fetch` untuk komunikasi dua arah real-time.

### I/O File

Bun menyediakan API file yang cepat dan ergonomis:

```typescript
// Baca file sebagai teks
const content = await Bun.file('data.txt').text();
console.log(content);

// Baca file sebagai JSON
const config = await Bun.file('config.json').json();
console.log(config.port);

// Tulis ke file
await Bun.write('output.txt', 'Halo, sistem file!');

// Stream file ke respons HTTP
const file = Bun.file('large-file.mp4');
return new Response(file);
```

`Bun.file()` mengembalikan objek `BunFile` yang membaca file secara lazy. Ini mendukung `text()`, `json()`, `arrayBuffer()`, `stream()`, dan konversi langsung ke body `Response` — membuatnya ideal untuk serving file statis.

### Integrasi SQLite

Bun dilengkapi dengan klien SQLite bawaan berkinerja tinggi. Tidak perlu paket npm `sqlite3` terpisah:

```typescript
import { Database } from 'bun:sqlite';

// Buka atau buat database
const db = new Database('app.db');

// Buat tabel
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`);

// Masukkan data
const insert = db.prepare('INSERT INTO users (name, email) VALUES ($name, $email)');
insert.run({ $name: 'Alice', $email: 'alice@example.com' });

// Kueri data
const users = db.query('SELECT * FROM users').all();
console.log(users);

// Prepared statements untuk keamanan
const getUser = db.prepare('SELECT * FROM users WHERE id = $id');
const user = getUser.get({ $id: 1 });
console.log(user);

db.close();
```

`bun:sqlite` adalah binding native ke SQLite, membuatnya jauh lebih cepat dari paket npm `better-sqlite3`. Ini mendukung prepared statements, transaksi, dan mode WAL.

### Variabel Lingkungan

Bun menyediakan pemuatan file `.env` bawaan dan objek `Bun.env` yang praktis:

```bash
# .env
DATABASE_URL=sqlite://app.db
PORT=3000
```

```typescript
console.log(Bun.env.PORT);        // "3000"
console.log(Bun.env.DATABASE_URL); // "sqlite://app.db"
```

Tidak perlu paket `dotenv` — Bun secara otomatis memuat `.env`, `.env.local`, `.env.production`, dan file env standar lainnya.

### Pengujian dengan Bun

Bun menyertakan test runner yang kompatibel dengan Jest tanpa konfigurasi:

```typescript
// math.test.ts
import { describe, expect, test, beforeAll } from 'bun:test';

function add(a: number, b: number): number {
  return a + b;
}

describe('utilitas matematika', () => {
  beforeAll(() => {
    console.log('Menyiapkan suite pengujian...');
  });

  test('menambahkan dua angka positif', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('menambahkan angka negatif', () => {
    expect(add(-1, -1)).toBe(-2);
  });
});
```

Jalankan pengujian:

```bash
bun test
```

Test runner Bun mendukung:

- **Snapshot testing** (`toMatchSnapshot`)
- **Mock functions** (`mock`)
- **Spies** (`spyOn`)
- **Timers** (`fakeTimers`)
- **Lifecycle hooks** (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`)
- **Watch mode** (`bun test --watch`)

### Bundling untuk Produksi

Bun dapat membundel aplikasi Anda untuk produksi dengan bundler bawaannya:

```bash
bun build ./src/index.ts --outdir ./dist --target bun
```

Flag `--target bun` mengoptimalkan output untuk runtime Bun. Untuk aplikasi browser, gunakan `--target browser`; untuk kompatibilitas Node.js, gunakan `--target node`. Bundler secara otomatis menangani TypeScript, JSX, impor CSS, dan code splitting.

## Contoh Kode

### Server REST API Lengkap

```typescript
import { Database } from 'bun:sqlite';

const db = new Database(':memory:');
db.run(`
  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0
  )
`);
db.run("INSERT INTO tasks (title) VALUES ('Belajar Bun'), ('Buat API'), ('Deploy ke produksi')");

const server = Bun.serve({
  port: 3001,
  fetch(request) {
    const url = new URL(request.url);

    // GET /tasks — daftar semua tugas
    if (url.pathname === '/tasks' && request.method === 'GET') {
      const tasks = db.query('SELECT * FROM tasks').all();
      return Response.json(tasks);
    }

    // GET /tasks/:id — ambil satu tugas
    const taskMatch = url.pathname.match(/^\/tasks\/(\d+)$/);
    if (taskMatch && request.method === 'GET') {
      const task = db.query('SELECT * FROM tasks WHERE id = $id').get({ $id: +taskMatch[1] });
      if (!task) return new Response('Tidak ditemukan', { status: 404 });
      return Response.json(task);
    }

    return new Response('Tidak ditemukan', { status: 404 });
  },
});

console.log(`Task API berjalan di http://localhost:${server.port}`);
```

### File Server dengan Streaming

```typescript
Bun.serve({
  port: 3002,
  fetch(request) {
    const url = new URL(request.url);
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;

    // Coba untuk menyajikan file
    const file = Bun.file(`./public${filePath}`);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response('Tidak ditemukan', { status: 404 });
  },
});
```

## Insight Penting

- **Bun bukan fork dari Node.js**: Bun adalah penulisan ulang dari awal menggunakan JavaScriptCore, bukan V8. Sebagian besar API Node.js diimplementasikan sebagai lapisan kompatibilitas, sehingga paket yang ada umumnya berfungsi, tetapi native C++ addons mungkin tidak.
- **Package manager native adalah pembeda utama**: `bun install` dapat mengurangi waktu pipeline CI hingga 50–80% dibandingkan npm, terutama dalam build Docker di mana caching terbatas.
- **SQLite sudah terintegrasi, bukan tambahan**: Tidak seperti Node.js di mana SQLite memerlukan langkah kompilasi C++ addon, `bun:sqlite` Bun tersedia segera — keuntungan signifikan untuk penyimpanan data ringan dan prototyping.
- **TypeScript berfungsi tanpa konfigurasi**: Bun secara native memahami TypeScript dan JSX, menghilangkan kebutuhan akan `tsc` atau `Babel` di sebagian besar proyek. Ini menghilangkan seluruh lapisan kerumitan tooling.
- **Watch mode adalah fitur kelas utama**: `bun --watch` menyediakan restart otomatis saat file berubah, membuat iterasi pengembangan lebih cepat tanpa bergantung pada alat pihak ketiga seperti `nodemon` atau `ts-node-dev`.

## Langkah Berikutnya

- Jelajahi **Elysia.js** — framework web native Bun yang memanfaatkan kinerja Bun untuk server HTTP cepat dengan validasi type-safe (sudah dibahas di perpustakaan ini).
- Coba **WebSocket API** Bun dengan `Bun.serve({ websocket })` untuk fitur real-time.
- Siapkan pipeline CI/CD menggunakan **GitHub Actions** yang memanfaatkan `bun install` untuk instalasi dependensi yang lebih cepat.
- Deploy aplikasi Bun Anda menggunakan Docker dengan image dasar `oven/bun`.

## Kesimpulan

Bun mewakili lompatan signifikan dalam kinerja runtime JavaScript dan pengalaman pengembang. Toolchain terintegrasinya — package manager, test runner, bundler, dan transpiler — mengurangi kompleksitas pengembangan JavaScript modern sambil memberikan peningkatan kecepatan yang dramatis. Dengan menguasai Bun, Anda mendapatkan akses ke runtime modern yang melengkapi ekosistem yang ada dan memungkinkan alur kerja pengembangan full-stack yang lebih cepat dan sederhana.

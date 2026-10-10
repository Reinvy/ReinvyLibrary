---
title: "Panduan Optimasi Performa Bun"
description: "Panduan komprehensif untuk mengoptimalkan aplikasi Bun — mencakup metodologi profiling dengan bun:jsc serta profiler CPU dan heap bawaan, penyetelan memori JavaScriptCore, optimasi server HTTP Bun.serve, pembentukan bundle produksi, pengurangan waktu start, dan pengamanan regresi dengan benchmark di CI."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Optimasi Performa Bun

## Pendahuluan

Bun memang cepat secara bawaan: engine JavaScriptCore, inti runtime Zig dengan I/O native, dan bundler yang mengubah pohon sumber menjadi biner tunggal. Namun kecepatan platform tidak sama dengan performa aplikasi. Server Bun tetap bisa tersendat karena parser JSON yang lambat di dalam handler permintaan, membocorkan memori melalui cache tanpa batas, atau mengirim bundle 40 MB yang butuh satu detik untuk mulai berjalan. Performa di Bun adalah hasil rekayasa, bukan warisan.

Panduan ini memberikan metodologi lengkap dan dapat diulang untuk membuat aplikasi Bun menjadi cepat: ukur, profile, optimalkan, dan verifikasi. Panduan ini jauh melampaui satu langkah profiling yang biasa ditemukan di panduan produksi umum. Anda akan mempelajari cara membangun baseline benchmark yang dapat dipercaya dengan `bun test --bench` dan alat load testing, cara membaca profil CPU dan heap yang dihasilkan oleh `bun --cpu-prof` dan `bun --heap-prof`, cara menyetel `Bun.serve()` untuk throughput dan latensi, cara membentuk bundle produksi dengan `bun build`, cara memangkas waktu start dengan lazy loading dan biner terkompilasi, serta cara menjaga hasil tersebut tetap permanen dengan gerbang regresi di CI.

Pembaca sasaran adalah pengembang yang sudah men-deploy aplikasi Bun dan ingin meningkatkan kedisiplinan seputar kecepatan dan memori. Setiap praktik terbaik di bagian Praktik Terbaik didemonstrasikan secara konkret di Langkah Implementasi.

## Praktik Terbaik

### 1. Ukur sebelum mengoptimalkan

Optimasi tanpa baseline adalah tebakan. Sebelum mengubah apa pun, kumpulkan angka yang bisa dipercaya: micro-benchmark dengan `bench()` dari `bun:test` untuk titik panas yang terisolasi, dan load test realistis dengan alat seperti `oha`, `wrk`, atau `autocannon` untuk perilaku ujung-ke-ujung. Catat persentil — p50, p95, p99 — beserta throughput dan puncak RSS, bukan hanya rata-rata. Rata-rata menyembunyikan tail latency, dan tail itulah yang dirasakan pengguna.

```bash
# Load test baseline terhadap server lokal (keep-alive, 100 koneksi konkuren)
oha -z 30s -c 100 http://localhost:3000/api/items
```

Simpan baseline tersebut secara tertulis (berkas di dalam repo Anda adalah pilihan terbaik) sehingga setiap optimasi berikutnya menjawab satu pertanyaan: apakah perubahan ini menggerakkan angka, dan seberapa besar?

### 2. Profile dengan profiler bawaan

Profil mengalahkan intuisi. Bun menyediakan profiler CPU dan profiler heap secara bawaan, ditambah modul `bun:jsc` untuk introspeksi tingkat engine. Ketika sebuah route terasa lambat, ambil profil CPU dan lihat frame sebenarnya; ketika memori bertumbuh seiring waktu, ambil heap snapshot sebelum dan sesudah satu siklus soak lalu bandingkan. API `bun:jsc` mengekspos `heapStats()` untuk ringkasan heap, `memoryUsage()` untuk RSS dan memori engine, serta `captureHeapSnapshot()` untuk snapshot penuh yang bisa dimuat ke alat analisis heap.

```bash
# Profil CPU: menulis bun-profile-<timestamp>.cpuprofile di direktori saat ini
bun --cpu-prof run src/index.ts

# Profil heap: berguna untuk menemukan fase yang banyak melakukan alokasi
bun --heap-prof run src/index.ts
```

```typescript
// Introspeksi memori tingkat engine saat runtime
import { heapStats, memoryUsage } from 'bun:jsc';

setInterval(() => {
  const stats = heapStats();
  console.log('Objek hidup:', stats.objectCount);
  console.log('Ukuran heap (byte):', stats.heapSize);
  console.log('RSS (byte):', memoryUsage().rss);
}, 30_000);
```

Selidiki apa yang dikatakan profil, bukan apa yang Anda asumsikan. Kejutan yang paling umum adalah frame paling lambat ternyata panggilan pustaka standar di lokasi yang tidak terduga — yang mengubah solusinya sepenuhnya.

### 3. Utamakan API native Bun

Bun mengimplementasikan primitif I/O dan server-nya secara native, dan itu adalah jalur tercepat di platform ini. Gunakan `Bun.file()` dan `Bun.write()` untuk I/O berkas, API streaming untuk payload besar, dan `bun:sqlite` untuk akses basis data lokal. Ketika Anda mengimpor lapisan kompatibilitas Node (`node:fs`, `node:http`, abstraksi gaya Express), Anda membayar biaya penerjemahan yang tidak diperlukan oleh permukaan native.

Yang sama pentingnya: jalankan dalam mode produksi. Bun mengaktifkan kemudahan pengembangan — hook hot reload, pemeriksaan mode dev, error verbose — ketika `NODE_ENV` bukan `production`. Setel variabel tersebut di lingkungan deployment Anda, dan Bun otomatis melewati pekerjaan khusus dev.

```bash
NODE_ENV=production bun run src/index.ts
```

### 4. Desain untuk efisiensi memori

Garbage collector Bun menangani churn alokasi dengan baik, tetapi tidak bisa memperbaiki pertumbuhan tanpa batas. Pola yang menjaga proses Bun tetap sehat selama berhari-hari uptime adalah:

- Gunakan prepared statement dan mode WAL dengan `bun:sqlite` alih-alih mengurai string SQL berulang kali.
- Stream payload besar dari ujung ke ujung alih-alih mem-buffer seluruh objek di memori.
- Batasi cache Anda — `Map` tanpa batas yang dipakai sebagai cache adalah kebocoran lambat, bukan optimasi cepat.
- Gunakan `WeakRef` dan `FinalizationRegistry` untuk cache yang dikunci oleh objek dengan siklus hidup alami.
- Deploy kontainer memori rendah dengan `--smol`, yang menyetel JavaScriptCore agar lebih mengutamakan penggunaan memori rendah daripada throughput puncak.

```typescript
// Cache dengan ukuran terbatas — keluarkan entri tertua alih-alih tumbuh selamanya
const MAX_CACHE = 10_000;
const cache = new Map<string, unknown>();

export function memoize<T>(key: string, compute: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = compute();
  cache.set(key, value);
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return value;
}
```

### 5. Jaga hot path tetap bersih

Sebuah handler permintaan berjalan ribuan kali per detik; setiap biaya tersembunyi berlipat ganda. Pajak hot path yang umum meliputi regex yang dikompilasi ulang per pemanggilan, penggabungan string dalam loop, I/O sinkron di dalam handler async, serta `JSON.parse`/`JSON.stringify` berulang untuk payload yang sama. Precompile regex di lingkup modul, lebih suka array join atau template literal daripada `+=` di dalam loop, dan parse body permintaan sekali per permintaan, bukan sekali per akses field.

```typescript
// Precompile sekali di lingkup modul — jangan membangun regex di dalam handler
const ROUTE_PATTERN = /^\/items\/([a-f0-9-]{36})$/;

export function parseItemRoute(path: string) {
  const match = ROUTE_PATTERN.exec(path);
  return match ? match[1] : null;
}
```

### 6. Setel runtime secara sengaja

Default JavaScriptCore bagus untuk beban kerja rata-rata; kasus tepi membutuhkan penyetelan eksplisit, dan hanya setelah profiling menunjukkan masalah nyata. `--smol` menukar throughput dengan jejak memori yang lebih kecil. `heapStats()` dari `bun:jsc` memberi tahu Anda apakah memori benar-benar bertumbuh atau hanya teralokasi. Ketika Anda menemukan kebocoran sungguhan, perbaiki retensinya (cache, closure, stream yang tidak dikonsumsi) alih-alih menutupinya dengan heap yang lebih besar. Jangan pernah menaikkan batas untuk membungkam peringatan memori tanpa mengetahui objek apa yang menahan memori tersebut.

### 7. Optimalkan lapisan HTTP

`Bun.serve()` adalah cara tercepat untuk melayani HTTP dari Bun, dan opsi-opsinya langsung memetakan ke tuas performa:

- `idleTimeout` mengontrol berapa lama koneksi keep-alive tetap terbuka — setel sesuai pola lalu lintas Anda alih-alih menutup koneksi terlalu cepat.
- `reusePort` mengaktifkan `SO_REUSEPORT`, memungkinkan beberapa proses berbagi satu port dan menyebar beban — pasangkan dengan beberapa proses tetapi jangan pernah melebihi jumlah inti yang Anda miliki.
- `maxRequestBodySize` melindungi server dari payload yang terlalu besar; jaga sedikit di atas permintaan terbesar yang sah.
- Stream respons untuk body besar, dan kompres respons teks dengan `CompressionStream` alih-alih mem-buffer seluruh payload.
- Jaga event loop tetap longgar: tanpa I/O sinkron di dalam `fetch`, tanpa komputasi berat tanpa melepas proses.

```typescript
import { CompressionStream } from 'node:stream/web';

const server = Bun.serve({
  port: 3000,
  reusePort: true,
  idleTimeout: 30,
  maxRequestBodySize: 10 * 1024 * 1024,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/api/report') {
      // Stream payload besar yang dibangkitkan dengan kompresi langsung
      const { readable } = generateReportStream();
      const compressed = readable.pipeThrough(new CompressionStream('gzip'));
      return new Response(compressed, {
        headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
      });
    }
    return new Response('Tidak ditemukan', { status: 404 });
  },
});
```

### 8. Kecilkan dan bentuk bundle

Ukuran bundle memengaruhi waktu start, memori, dan payload deploy. `bun build` mengaktifkan tree shaking secara default; buat sisanya eksplisit: `--minify` untuk output yang lebih kecil, `--splitting` untuk berbagi chunk antar entry point, `--drop=console,debugger` untuk membuang statement debug, dan `--external` untuk menjaga dependensi native atau besar di luar bundle bila sesuai. Untuk aplikasi server, kompilasi menjadi satu biner standalone dengan `--compile` — Bun menyematkan runtime dan bytecode, menghilangkan langkah instalasi dan memangkas latensi cold start.

```bash
# Bundle server produksi: tree-shaken, minified, biner tunggal
bun build src/index.ts --compile --minify --bytecode --target=bun -o server
```

```text
# Perbandingan bundle untuk aplikasi yang sama
| Strategi                 | Ukuran output | Waktu start (p50) |
|--------------------------|---------------|-------------------|
| Menjalankan sumber tsx   | -             | 152 ms            |
| bun build (minified)     | 2,1 MB        | 84 ms             |
| --compile --bytecode     | 41 MB         | 39 ms             |
```

### 9. Kurangi waktu start

Latensi start penting untuk alat CLI, cold start serverless, dan penskalaan horizontal yang cepat. Tuasnya adalah: `import()` lazy untuk modul yang jarang dipakai, modul tanpa efek samping tingkat atas, lebih sedikit dependensi di jalur entry, lingkungan yang di-inline melalui `--env-inline`, dan biner terkompilasi. `bun --preload` dapat memuat modul panas kecil secara eager, tetapi kemenangan yang lebih besar hampir selalu menghapus pekerjaan dari jalur entry daripada menambahkan lebih banyak pekerjaan.

```typescript
// Tunda klien analytics yang berat sampai benar-benar digunakan
const { AnalyticsClient } = await import('./analytics-client.ts');

export const analytics = {
  async track(event: string, data: unknown) {
    const client = new AnalyticsClient();
    await client.send(event, data);
  },
};
```

### 10. Amankan regresi di CI

Kecepatan adalah fitur, dan fitur membutuhkan regression test. Jalankan `bun test --bench` di CI dengan ambang batas: merge yang membuat p95 lebih buruk dari baseline tercatat lebih dari beberapa persen harus menggagalkan pipeline. Hal yang sama berlaku untuk anggaran ukuran bundle dan, jika memungkinkan, anggaran cold start. Ketika setiap optimasi diverifikasi terhadap baseline yang dilacak, performa berhenti menjadi anekdot dan menjadi rekayasa.

## Langkah Implementasi

### Langkah 1: Membangun Baseline Benchmark

Buat direktori benchmarks dengan kasus `bench()` untuk jalur kritis Anda. Jaga tetap fokus dan stabil: kelas mesin yang sama, run pemanasan, dan iterasi yang cukup agar konvergen.

```typescript
// benchmarks/items.bench.ts
import { bench, run } from 'bun:test';

const sample = Array.from({ length: 100 }, (_, i) => ({
  id: `item-${i}`,
  price: i * 1.5,
}));

bench('serialisasi daftar item', () => {
  JSON.stringify(sample);
});

bench('parse payload item', () => {
  JSON.parse(JSON.stringify(sample));
});

await run();
```

```bash
bun test --bench benchmarks/items.bench.ts
```

Catat keluarannya — operasi per detik serta latensi p50/p95 — ke dalam berkas baseline `PERFORMANCE.md` di repo. Kemudian jalankan satu load test dunia nyata agar micro-benchmark memiliki konteks:

```bash
oha -z 30s -c 100 -m GET http://localhost:3000/api/items > baseline-oha.txt
```

Simpan juga `baseline-oha.txt`. Mulai sekarang, setiap optimasi dihakimi berdasarkan berkas ini.

### Langkah 2: Profile CPU dan Temukan Hot Path

Jalankan server di bawah profiler CPU, bangkitkan lalu lintas selama beberapa menit, lalu hentikan dan buka berkas `.cpuprofile` di penampil flame graph (tab Performance di Chrome DevTools berfungsi dengan baik).

```bash
bun --cpu-prof run src/index.ts &
# bangkitkan beban selama server berjalan
oha -z 60s -c 200 http://localhost:3000/api/items
kill %1
```

Baca profil dari atas ke bawah: frame terlebar di puncak flame graph adalah tempat waktu CPU sebenarnya digunakan. Perhatikan tiga tanda:

- Frame pustaka standar yang lebar di lokasi tak terduga — bentuk data Anda bertabrakan dengan API (misalnya parsing berulang atau penggunaan regex tanpa batas).
- Frame aplikasi yang lebar — algoritma Anda sendiri adalah hambatannya; optimalkan algoritmanya, bukan runtime-nya.
- Banyak frame tipis alokasi — beban kerja tersebut berat alokasi; lihat langkah memori sebelum mengubah algoritma.

Apa pun yang Anda temukan, tuliskan di sebelah baseline. Profil adalah buktinya; perbaikan datang setelahnya.

### Langkah 3: Profile Memori dan Deteksi Kebocoran

Mulai server dengan beban kerja yang diketahui, ambil heap snapshot, jalankan siklus soak, lalu ambil snapshot kedua. Bandingkan keduanya untuk menemukan apa yang tertahan.

```typescript
// scripts/snapshot.ts — ambil heap snapshot sesuai permintaan
import { captureHeapSnapshot, heapStats } from 'bun:jsc';

const targetPath = process.argv[2] ?? './heap.heapsnapshot';
captureHeapSnapshot(targetPath);
console.log('Snapshot ditulis ke', targetPath);

const stats = heapStats();
console.log('Objek hidup:', stats.objectCount, '| Ukuran heap:', stats.heapSize);
```

```bash
bun scripts/snapshot.ts ./before.heapsnapshot
# jalankan beban kerja soak (mis. 100 ribu permintaan dengan payload beragam)
oha -z 120s -c 150 http://localhost:3000/api/items
bun scripts/snapshot.ts ./after.heapsnapshot
```

Muat kedua snapshot ke alat analisis heap dan bandingkan objek yang tertahan. Entri berulang dari kelas yang sama, event listener, atau objek stream menunjuk ke sumber retensi: cache tanpa eviction, subscription yang tidak pernah dibersihkan, stream yang tidak pernah dikonsumsi. Perbaiki retensinya, bukan ukuran heap-nya. RSS yang datar selama soak panjang adalah tanda proses yang sehat.

### Langkah 4: Setel Server HTTP

Terapkan konfigurasi `Bun.serve()` yang sesuai dengan lalu lintas Anda: `reusePort` ketika Anda menjalankan beberapa proses, `idleTimeout` yang memungkinkan klien nyata menggunakan kembali koneksi, `maxRequestBodySize` yang masuk akal, serta streaming dan kompresi untuk respons besar.

```typescript
// src/server.ts
import { BunFile } from 'bun';

const server = Bun.serve({
  hostname: '0.0.0.0',
  port: 3000,
  reusePort: true,
  idleTimeout: 30,
  maxRequestBodySize: 10 * 1024 * 1024,
  websocket: {
    perMessageDeflate: true,
  },
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === '/api/items') {
      const items = await loadItems();
      return Response.json(items);
    }

    if (url.pathname === '/static/app.js') {
      // Layani berkas statis melalui jalur zero-copy
      const file: BunFile = Bun.file('./dist/app.js');
      return new Response(file);
    }

    return new Response('Tidak ditemukan', { status: 404 });
  },
});

console.log(`Mendengarkan di http://${server.hostname}:${server.port}`);
```

Jalankan ulang load test dari Langkah 1 dan bandingkan. Jika latensi p95 turun, pertahankan perubahan; jika tidak, kembalikan dan coba tuas berikutnya. Jangan menyimpan konfigurasi yang tidak menggerakkan angka yang diukur.

Untuk beban kerja dengan banyak koneksi, pertimbangkan penyetelan endpoint WebSocket (`perMessageDeflate`, interval ping) dan awasi event loop dengan pemeriksaan tenggat microtask secara berkala:

```typescript
const startedAt = performance.now();
// di dalam loop panas
if (performance.now() - startedAt > 4) {
  await new Promise((resolve) => setTimeout(resolve, 0)); // lepaskan ke event loop
  startedAt = performance.now();
}
```

### Langkah 5: Optimalkan Bundle Produksi

Bentuk artefak yang benar-benar dijalankan deployment Anda. Untuk server Bun, biner terkompilasi adalah tujuan akhir; untuk konteks lain, setel bundle JS.

```bash
# Bundle server standar
bun build src/index.ts --target=bun --minify --sourcemap=external -o dist/index.js

# Buang statement debug dan inline nilai env
bun build src/index.ts --target=bun --minify --drop=console,debugger --env-inline -o dist/index.js

# Eksekutabel standalone dengan bytecode
bun build src/index.ts --compile --minify --bytecode --target=bun -o dist/server
```

Verifikasi dengan laporan bundle bahwa tidak ada hal absurd yang disertakan:

```bash
bun build src/index.ts --target=bun --minify > /dev/null && ls -lh dist/
```

Jika output ternyata sangat besar, periksa dependensi yang tidak sengaja ikut ter-bundle (`--external`), modul duplikat dari versi yang tidak kompatibel, dan `--drop` yang hilang. Jalankan ulang pengukuran waktu start setelah perubahan; cold start biner terkompilasi diukur dalam puluhan milidetik.

### Langkah 6: Kurangi Waktu Start dan Cold Start

Telusuri jalur entry dan buang pekerjaan yang tidak perlu. Mulai dengan impor mahal yang jarang digunakan dan ubah menjadi `import()` lazy. Hapus efek samping tingkat atas yang berjalan saat pemuatan modul — `setInterval`, connection pool yang dibuka saat impor, pembacaan berkas konfigurasi di puncak modul entry — dan jalankan semuanya di dalam fungsi `start()` yang eksplisit.

```typescript
// Sebelum: semuanya melakukan inisialisasi saat impor
import { connect } from './db.ts';
const db = connect(); // terhubung pada setiap pemuatan modul, bahkan untuk CLI --help

// Sesudah: inisialisasi eksplisit dan lazy
let db: ReturnType<typeof import('./db.ts')['connect']> | undefined;

export function getDb() {
  db ??= connect();
  return db;
}
```

Setel `NODE_ENV=production` di lingkungan deployment agar Bun melewati pekerjaan mode dev, dan ukur cold start lagi dengan timer:

```bash
/usr/bin/time -v ./dist/server --help
```

Bandingkan angka sebelum/sesudah dengan berkas baseline Langkah 1. Optimasi start berlipat ganda: server yang mulai berjalan dalam 40 ms menskalakan keluar lebih cepat dan lebih murah dalam tagihan waktu serverless.

### Langkah 7: Optimalkan Akses Data dan Hot Path

Terapkan aturan hot path di tempat yang paling menguntungkan: akses data dan penanganan permintaan. Dengan `bun:sqlite`, siapkan statement sekali lalu gunakan kembali, pertahankan mode WAL, dan kelompokkan penulisan di dalam transaksi.

```typescript
// Gunakan kembali prepared statement — jangan pernah menyiapkan ulang per permintaan
import { Database } from 'bun:sqlite';

const db = new Database('app.db', { create: true });
db.exec('PRAGMA journal_mode = WAL;');

const getItem = db.query('SELECT * FROM items WHERE id = ?1');
const insertItem = db.query('INSERT INTO items (id, name, price) VALUES (?1, ?2, ?3)');

export function findItem(id: string) {
  return getItem.get(id);
}

export function createItem(id: string, name: string, price: number) {
  insertItem.run(id, name, price);
}
```

Untuk route yang berat payload, utamakan streaming daripada buffering, parse body sekali, dan hindari alokasi per permintaan yang lolos ke heap. Kemudian jalankan ulang suite benchmark dan load test. Angkanya memberi tahu Anda apakah pembersihan hot path berhasil.

### Langkah 8: Verifikasi, Bandingkan, dan Kunci Kemenangan

Setiap optimasi sejauh ini adalah hipotesis yang diuji terhadap baseline. Sekarang formalisasikan.

```bash
# Jalankan ulang perintah baseline yang persis sama
bun test --bench benchmarks/items.bench.ts
oha -z 30s -c 100 -m GET http://localhost:3000/api/items > after-optimization.txt
```

Bandingkan `after-optimization.txt` dengan `baseline-oha.txt` dan perbarui `PERFORMANCE.md` dengan angka final, perubahan yang menghasilkannya, serta trade-off apa pun (misalnya, biner bytecode menukar ukuran disk dengan kecepatan start). Kemudian kunci kemenangan tersebut di CI:

```yaml
# .github/workflows/performance.yml
name: Performance Gates
on: [pull_request]
jobs:
  benchmarks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun test --bench benchmarks/ --timeout 30
```

Tambahkan pemeriksaan anggaran ukuran bundle dan, jika deployment Anda mendukungnya, anggaran cold start. Mulai titik ini, regresi pada metrik terukur menghalangi merge, dan kisah performa repository tercatat, dapat direproduksi, dan ditegakkan secara permanen.

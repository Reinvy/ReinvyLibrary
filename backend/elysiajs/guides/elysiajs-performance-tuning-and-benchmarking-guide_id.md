---
title: "Panduan Performa dan Benchmarking Elysia.js"
description: "Cara mengukur, memprofil, dan mengoptimalkan layanan Elysia.js di Bun: harness benchmark yang reproducible, biaya validasi skema, alokasi per request, tuning Bun.serve, caching, round-trip database, dan gerbang regresi di CI."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Performa dan Benchmarking Elysia.js

## Pendahuluan

Elysia mempromosikan angka throughput yang jarang bisa direproduksi tim lain, dan selisihnya hampir tidak pernah berasal dari framework-nya. Penyebabnya adalah handler yang membangun ulang skema TypeBox pada setiap request, respons yang menyerialisasi objek berkali-kali, `await` yang memanggil empat query secara berurutan, atau load test yang dijalankan di laptop dengan `--watch` aktif dan debugger terpasang. Pekerjaan performa pada layanan Elysia karena itu adalah dua disiplin yang saling terkait: benchmark yang bisa dipercaya, dan daftar biaya yang benar-benar ada di jalur request Anda.

Panduan ini mengasumsikan aplikasi sudah berjalan — route, plugin, validasi, dan penanganan error sudah ada — dan membahas apa yang harus dilakukan ketika grafik latensi p95 mulai bergerak ke arah yang salah. Setiap langkah menghasilkan angka yang dapat dibandingkan sebelum dan sesudah; tidak ada langkah yang meminta Anda menerima perubahan tanpa bukti.

Optimasi di sini diurutkan berdasarkan dampak terukur pada layanan Elysia di Bun: validasi skema, alokasi per request, serialisasi, opsi server, caching, dan terakhir lapisan database, yang biasanya mendominasi semua poin di atas secara gabungan.

## Praktik Terbaik

### Ukur dulu sebelum mengubah apa pun

Setiap optimasi adalah hipotesis tentang di mana waktu habis, dan sebagian besar hipotesis itu salah. Ambil baseline — request per detik, p50, p95, p99, dan memori residen — pada commit persis yang akan Anda ubah. Tanpa angka itu, implementasi yang "lebih cepat" tidak bisa dibedakan dari regresi yang kebetulan terasa lebih baik.

### Jauhkan konstruksi dari jalur request

Bug performa Elysia yang paling umum adalah pekerjaan yang seharusnya berada di scope modul tetapi dieksekusi per request: skema yang didefinisikan di dalam handler, regex yang dikompilasi inline, `new URL()` yang dipanggil berulang pada string yang sama, objek konfigurasi yang dibangun ulang setiap pemanggilan. Apa pun yang hanya bergantung pada kode — bukan pada request — harus dibuat sekali saat modul dimuat.

### Jadikan validasi bagian termurah dari request

Validasi TypeBox di Elysia cepat karena skema dikompilasi menjadi validator satu kali. Jaminan itu hilang ketika Anda membangun ulang skema per request, mengaktifkan coercion mahal pada setiap field, atau memakai `t.Union` berisi banyak varian objek besar sehingga validator harus mencoba setiap cabang. Simpan skema sebagai konstanta modul, utamakan discriminated union dibanding union terbuka, dan gunakan `t.Transform` hanya untuk field yang benar-benar membutuhkannya.

### Utamakan route statis dan method yang tepat

Elysia mengompilasi route menjadi router yang dioptimalkan, tetapi path dengan parameter atau wildcard tetap lebih mahal daripada path literal. Ketika himpunan nilai yang diketahui memang ada, `/v1/users/me` lebih murah daripada `/v1/users/:id` pada jalur panas. Mengelompokkan handler dalam plugin bernama juga memungkinkan reuse tabel route yang sudah dikompilasi alih-alih mendaftarkannya ulang.

### Kompilasi artefak dan panaskan runtime sebelum menilai

Proses JSC yang masih dingin tidak representatif. Kompilasi dengan `bun build --compile` untuk produksi dan jalankan fase warmup — beberapa ribu request — sebelum jendela pengukuran dibuka. Tanpa warmup, Anda mengukur JIT, bukan aplikasi.

### Batasi request sebelum menanganinya

`maxRequestBodySize` dan `idleTimeout` bukan hanya katup keamanan; keduanya adalah kontrol performa. Handler yang menerima payload tanpa batas menghabiskan anggarannya untuk parsing dan pertumbuhan memori. Tolak request yang kebesaran di level server, dan matikan parsing body sepenuhnya pada route yang hanya membaca header.

### Cache di lapisan yang paling dekat dengan data

Request termurah adalah yang tidak pernah mencapai handler. Urutkan caching berdasarkan risiko: `Cache-Control` dan ETag di level HTTP, lalu cache in-process ber-TTL pendek untuk data turunan yang sering dibaca, lalu cache bersama seperti Redis ketika beberapa instance harus sepakat. Cache in-process tanpa strategi invalidasi adalah bug korektness yang menyamar sebagai optimasi performa.

### Perlakukan round-trip database sebagai anggaran latensi sesungguhnya

Pada layanan yang menyentuh database, biaya CPU handler biasanya hanya pembulatan dibanding round-trip jaringan. Hitung query per request, hilangkan loop N+1, batch pembacaan yang independen, dan gunakan kembali prepared statement. Peningkatan validasi sebesar 10% jauh lebih kecil nilainya dibanding menghapus dua query berurutan.

### Kunci regresi di CI, bukan menemukannya kembali nanti

Angka performa yang hanya ada di deskripsi pull request akan hilang dalam sepekan. Jalankan benchmark pada setiap perubahan jalur panas, bandingkan dengan baseline yang dikomit, dan gagalkan build ketika latensi p95 atau throughput bergerak melewati toleransi eksplisit. Inilah satu-satunya optimasi yang tetap bekerja setelah penulisnya pindah tugas.

## Langkah Implementasi

### Langkah 1: Bangun harness benchmark yang reproducible

Kunci setiap input yang bisa bervariasi: konkurensi, durasi, ukuran payload, jumlah CPU, dan mode build. Jalankan generator beban di mesin terpisah atau minimal proses terpisah, dan jangan pernah melakukan benchmark terhadap server `--watch`.

```typescript
// bench/server.ts — jalankan app dengan cara yang sama seperti produksi
import { app } from '../src/index'

app.listen({ port: 3100, idleTimeout: 30, maxRequestBodySize: 1024 * 1024 })
console.log('bench server ready on :3100')
```

```bash
# Panaskan JIT lebih dulu, lalu ukur jendela waktu yang tetap
bun run bench/server.ts &
npx autocannon -c 50 -d 5 http://localhost:3100/v1/users/me   # warmup
npx autocannon -c 50 -d 30 -j http://localhost:3100/v1/users/me > baseline.json
```

`-c 50` menetapkan koneksi konkuren, `-d 30` jendela pengukuran dalam detik, dan `-j` menghasilkan JSON sehingga angkanya bisa dikomit dan dibandingkan secara mekanis. Simpan folder `bench/` berisi harness di version control — benchmark yang hanya hidup di riwayat shell seseorang tidak bisa menjaga build.

### Langkah 2: Ambil dan catat baseline

Ekstrak tiga angka yang penting dan simpan bersama hash commit.

```bash
python3 - <<'PY'
import json, statistics
data = json.load(open('baseline.json'))
lat = data['latency']
print(f"rps={data['requests']['average']:.0f}")
print(f"p50={lat['p50']}ms p95={lat['p97_5']}ms p99={lat['p99']}ms max={lat['max']}ms")
print(f"errors={data['errors']} timeouts={data['timeouts']}")
PY
```

Catat `rps`, `p95`, `p99`, dan laju error. Jika error atau timeout tidak nol, jalankan ulang — pengukuran itu tidak valid, selidiki saturasinya lebih dulu. Simpan berkasnya sebagai `bench/baseline/<commit>.json` agar gerbang regresi di Langkah 10 punya pembanding.

### Langkah 3: Profil jalur request, jangan menebak

Bun menyertakan profiler CPU dan profiler heap. Keduanya menghasilkan artefak yang bisa dibuka di Chrome DevTools atau `speedscope`.

```bash
# Profil CPU: temukan frame panas di bawah beban nyata
bun --cpu-prof --cpu-prof-dir=./prof bench/server.ts &
npx autocannon -c 50 -d 20 http://localhost:3100/v1/orders

# Profil heap: pastikan apakah churn alokasi yang memicu jeda GC
bun --heap-prof --heap-prof-dir=./prof bench/server.ts &
```

Cari tiga pola spesifik di flame graph: kompilasi validator di dalam frame handler, `JSON.stringify` yang dipanggil lebih dari sekali per request, dan pembuatan objek atau simbol di dalam loop. Profil yang tidak menunjukkan frame framework di atas 5% berarti waktu habis di kode Anda sendiri atau di I/O — sesuaikan tuning-nya.

### Langkah 4: Jadikan validasi skema biaya satu kali

Skema harus berada di scope modul; mereferensikan `t.Object` yang sama dari beberapa route memungkinkan Elysia memakai kembali validator yang sudah dikompilasi.

```typescript
// src/schemas/order.ts — didefinisikan sekali, diimpor di mana-mana
import { t } from 'elysia'

export const OrderStatus = t.Union([
  t.Literal('pending'),
  t.Literal('paid'),
  t.Literal('shipped')
])

export const OrderBody = t.Object({
  items: t.Array(t.Object({ sku: t.String({ minLength: 1 }), qty: t.Integer({ minimum: 1 }) }), {
    minItems: 1,
    maxItems: 50
  }),
  coupon: t.Optional(t.String({ maxLength: 32 }))
}, { additionalProperties: false })
```

Ada dua keuntungan konkret dari bentuk ini. Pertama, `t.Union` terbuka berisi varian objek dievaluasi cabang demi cabang, sedangkan discriminated union yang dikunci pada field literal bisa langsung menuju cabang yang tepat. Kedua, coercion (`t.Numeric`, `t.Boolean`) membutuhkan parsing per field — pakai hanya untuk nilai yang memang datang sebagai string, dan gunakan `t.Integer` ketika klien sudah mengirim angka.

```typescript
// Hindari: dikompilasi ulang per request, dan meng-coerce field yang sudah bertipe
app.post('/orders', ({ body }) => createOrder(body as any), {
  body: t.Object({ qty: t.Numeric(), total: t.Numeric() })
})
```

### Langkah 5: Hilangkan konstruksi per request

Telusuri handler panas dan pindahkan setiap nilai yang tidak bergantung pada request ke scope modul.

```typescript
// src/routes/users.ts
import { Elysia, t } from 'elysia'
import { UserParams, UserResponse } from '../schemas/user'
import { users } from '../repositories/users'

// Di-hoist: dibuat sekali saat startup
const cacheControl = 'private, max-age=15'
const selectFields = { id: true, name: true, email: true } as const

export const userRoutes = new Elysia({ prefix: '/v1/users' })
  .get('/me', async ({ user, set }) => {
    set.headers['cache-control'] = cacheControl
    return users.findById(user.id, selectFields) // tanpa bangun skema, tanpa objek konfigurasi
  }, { response: UserResponse })
  .get('/:id', async ({ params }) => users.findById(params.id, selectFields), {
    params: UserParams,
    response: UserResponse
  })
```

Keuntungan kedua di sini adalah `selectFields`: mengembalikan seluruh baris memaksa serializer dan database memindahkan kolom yang tidak pernah dibaca klien. Proyeksi yang sempit biasanya lebih bernilai daripada micro-optimization apa pun di badan handler.

### Langkah 6: Setel opsi server yang membatasi pekerjaan

`Bun.serve` menerima beberapa batas yang diteruskan Elysia lewat `listen`. Tetapkan nilainya secara sadar, jangan menerima default yang disetel untuk pemakaian umum.

```typescript
app.listen({
  port: Number(process.env.PORT ?? 3000),
  idleTimeout: 30,                        // detik; putus socket keep-alive yang menganggur
  maxRequestBodySize: 2 * 1024 * 1024,    // tolak body besar sebelum parsing
  development: false                      // tanpa overlay error verbose di produksi
})
```

Untuk layanan yang juga melayani WebSocket, jangan aktifkan per-message deflate untuk frame kecil berfrekuensi tinggi — biaya kompresinya melebihi penghematan bandwidth. Dan jika sebuah route tidak pernah membaca body, utamakan semantik `GET` daripada menerima lalu membuang unggahan.

### Langkah 7: Tambahkan cache dengan strategi invalidasi yang jelas

Cache hanya data yang kebasianya bisa Anda batasi lewat waktu atau event.

```typescript
// src/cache/ttl.ts — cache in-process berbatas, tidak tumbuh tanpa kendali
type Entry<T> = { value: T; expires: number }

export function createTtlCache<T>(ttlMs: number, maxEntries = 5_000) {
  const store = new Map<string, Entry<T>>()
  return {
    get(key: string): T | undefined {
      const hit = store.get(key)
      if (!hit) return undefined
      if (hit.expires < Date.now()) {
        store.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key: string, value: T) {
      if (store.size >= maxEntries) store.delete(store.keys().next().value as string)
      store.set(key, { value, expires: Date.now() + ttlMs })
    }
  }
}
```

Map berbatas dengan TTL menjaga memori tetap dapat diprediksi dan evikasinya murah. Pasangkan dengan respons `ETag` + `If-None-Match` pada pembacaan publik agar klien berhenti membayar byte yang sudah dimilikinya, dan gunakan Redis ketika beberapa instance harus melakukan invalidasi bersama.

### Langkah 8: Serang lapisan database

Hitung query per request sebelum menyentuh hal lain. Satu loop N+1 akan mengalahkan seluruh poin lain di panduan ini.

```typescript
// Sebelum: satu query per order, ditambah satu per customer
const orders = await db.order.findMany({ where: { userId } })
for (const order of orders) order.customer = await db.customer.findUnique({ where: { id: order.customerId } })

// Sesudah: satu query dengan join, proyeksi sempit, prepared statement
const orders = await db.order.findMany({
  where: { userId },
  select: { id: true, total: true, status: true, customer: { select: { id: true, name: true } } }
})
```

Lalu periksa pool-nya: pool yang lebih kecil dari konkurensi akan membuat event loop kelaparan di bawah beban, sementara pool yang lebih besar dari batas koneksi database menghasilkan timeout yang tampak seperti error aplikasi. Ukur sesuai kapasitas database, bukan sesuai jumlah request yang Anda harapkan.

### Langkah 9: Kirim artefak terkompilasi dan ukur ulang

Jalankan benchmark lagi terhadap build produksi, bukan server development.

```bash
bun build --compile --target=bun-linux-x64-modern src/index.ts --outfile dist/api
./dist/api &
npx autocannon -c 50 -d 30 -j http://localhost:3000/v1/users/me > after.json
```

Bandingkan `after.json` dengan baseline dari Langkah 2 dan hubungkan setiap selisih ke satu perubahan. Jika sebuah perubahan tidak menggerakkan angka apa pun, kembalikan — kompleksitas yang tidak terukur adalah biaya tanpa hasil. Pada instance dengan memori terbatas, `bun --smol` menukar sebagian throughput dengan heap yang lebih kecil dan layak diukur terpisah, bukan diasumsikan.

### Langkah 10: Kunci peningkatan itu di CI

Ubah baseline menjadi kondisi build agar keuntungannya bertahan pada pull request berikutnya.

```yaml
# .github/workflows/bench.yml
name: bench
on: [pull_request]
jobs:
  measure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run bench/harness.ts --out after.json
      - run: python3 bench/compare.py bench/baseline/main.json after.json --p95-tolerance 0.10
```

`compare.py` harus keluar dengan status non-zero ketika latensi p95 tumbuh melewati toleransi atau throughput turun di bawahnya. Jaga toleransi tetap longgar agar tahan terhadap derau runner bersama — 10% adalah titik awal yang wajar — dan tolak merge pada regresi nyata. Catat setiap perubahan baseline yang diterima pada pull request penyebabnya, sehingga riwayatnya menjelaskan dirinya sendiri.

### Langkah 11: Dokumentasikan hasil dan biayanya

Tutup siklusnya dengan menuliskan apa yang berubah, apa manfaatnya, dan berapa biaya kompleksitasnya. Tabel singkat di pull request sudah cukup, dan ini mencegah kontributor berikutnya memasukkan kembali kode yang baru saja Anda hapus.

```text
| Perubahan                       | p95 sebelum | p95 sesudah | Catatan                        |
|---------------------------------|-------------|-------------|--------------------------------|
| Skema di scope modul            | 41 ms       | 33 ms       | validator terkompilasi reusable |
| Proyeksi select dipersempit     | 33 ms       | 24 ms       | 40% kolom lebih sedikit        |
| Cache TTL pada pembacaan katalog| 24 ms       | 9 ms        | TTL 15s, invalidasi via event  |
| Deploy binary terkompilasi      | 9 ms        | 8 ms        | menghapus transpile runtime    |
```

Catat dengan jujur perubahan yang tidak menggerakkan apa pun. Panduan tuning yang hanya melaporkan keberhasilan mengajari engineer berikutnya untuk meniru tanpa memahami.

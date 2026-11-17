---
title: "Cheat Sheet Skrip Shell Bun"
description: "Referensi cepat shell bawaan Bun — template tag $, pembaca keluaran, penanganan kode keluar, redireksi, kontrol environment dan cwd, aturan escaping, serta pemuatan skrip .sh."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Skrip Shell Bun

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Mengimpor tag shell | `import { $ } from "bun"` | Menjalankan perintah di dalam proses, tanpa memanggil `/bin/sh` |
| Membungkam keluaran | `.quiet()` | Menghentikan stdout/stderr ditulis ke terminal |
| Membaca stdout sebagai teks | `.text()` | Mengembalikan string; otomatis memanggil `.quiet()` |
| Membaca stdout sebagai JSON | `.json()` | Menerapkan `JSON.parse` pada stdout yang ditangkap |
| Mengiterasi baris stdout | `.lines()` | Async iterator yang menghasilkan satu baris setiap iterasi |
| Membaca stdout sebagai Blob | `.blob()` | Praktis untuk payload biner |
| Memeriksa kode keluar | `.nothrow()` | Mengembalikan `exitCode` alih-alih melempar error |
| Mengubah kebijakan lempar global | `$.nothrow()` dan `$.throws(true)` | Berlaku untuk semua perintah di proses tersebut |
| Mengatur env satu perintah | `.env({ ...process.env, NODE_ENV: "test" })` | Environment khusus satu pemanggilan |
| Mengatur env global | `$.env({ CI: "1" })` | Direset dengan memanggil `$.env()` tanpa argumen |
| Mengatur cwd satu perintah | `.cwd("packages/api")` | `process.cwd()` tidak berubah |
| Mengatur cwd global | `$.cwd("packages/api")` | Berlaku untuk perintah berikutnya |
| Melakukan escape manual | `$.escape(userInput)` | Escaping yang sama dengan yang dipakai template tag |
| Melewati escaping | `{ raw: "value" }` | Pembungkus interpolasi untuk string statis yang tepercaya |
| Memekarkan brace | `$.braces("echo {1,2,3}")` | Mengembalikan daftar perintah hasil pemekaran |
| Menjalankan berkas `.sh` | `bun ./script.sh` | Loader skrip Bun Shell yang lintas platform |

## Perintah Umum

### Menjalankan Perintah

```typescript
import { $ } from "bun";

// Keluaran diteruskan ke terminal saat perintah berjalan
await $`echo "Halo dari Bun Shell"`;

// Tangkap keluarannya alih-alih mencetaknya
const branch = await $`git rev-parse --abbrev-ref HEAD`.text();
console.log(branch.trim());
```

### Membaca Keluaran Terstruktur

```typescript
import { $ } from "bun";

// JSON dari flag sebuah CLI
const state = await $`docker inspect --format "{{json .State}}" api`.json();
console.log(state.Running);

// Streaming baris demi baris: isi loop berjalan begitu baris tiba
for await (const line of $`cat access.log`.lines()) {
  if (line.includes(" 500 ")) console.error(line);
}
```

### Menangani Kode Keluar

```typescript
import { $, ShellError } from "bun";

try {
  await $`test -f package.json`;
} catch (error) {
  if (error instanceof ShellError) {
    console.error(`gagal dengan kode keluar ${error.exitCode}`);
    console.error(error.stderr.toString());
  }
}

// Tanpa exception: tentukan sendiri apa yang dilakukan terhadap kodenya
const typecheck = await $`tsc --noEmit`.nothrow().quiet();
if (typecheck.exitCode !== 0) {
  process.exitCode = typecheck.exitCode;
}
```

### Mengalihkan Stream

```typescript
import { $ } from "bun";

await $`echo "build selesai" > build.log`;     // timpa stdout
await $`echo "selesai" >> build.log`;            // tambahkan ke stdout
await $`bun run build 2> build.err`;             // hanya stderr
await $`bun test &> test.log`;                   // stdout dan stderr
await $`bun test 2>&1`;                          // gabungkan stderr ke stdout
await $`bun run report 1>&2`;                    // kirim stdout ke stderr

// Redireksi dari dan ke objek JavaScript
await $`cat < ${Bun.file("./seed.sql")}`;
const buffer = Buffer.alloc(64);
await $`echo "cached" > ${buffer}`;
```

### Pipa Antar Perintah

```typescript
import { $ } from "bun";

const terlama = await $`sort -k2 -nr timings.txt | head -5`.text();
console.log(terlama);

// Objek JavaScript bisa berada di salah satu sisi pipeline
const body = new Response(JSON.stringify({ ok: true }));
const jumlahKata = await $`cat < ${body} | wc -w`.text();
```

### Mengatur Variabel Lingkungan

```typescript
import { $ } from "bun";

// Inline untuk satu perintah
await $`NODE_ENV=production bun run build`;

// Per pemanggilan, mewarisi environment induk
await $`bun test`.env({ ...process.env, DATABASE_URL: "postgres://localhost/test" });

// Default global untuk sisa proses
$.env({ ...process.env, CI: "1" });
```

### Mengubah Direktori Kerja

```typescript
import { $ } from "bun";

await $`ls`.cwd("packages/api");   // hanya satu perintah
$.cwd("packages/api");              // semua perintah berikutnya
await $`bun run build`;
$.cwd(process.cwd());               // kembalikan ke semula
```

### Melakukan Escape Input Tak Tepercaya

```typescript
import { $ } from "bun";

const namaBerkas = "laporan; rm -rf /.txt";

// Nilai interpolasi selalu diteruskan sebagai satu argumen literal
await $`ls ${namaBerkas}`;

// Escape manual saat menyusun string perintah sendiri
const aman = $.escape(namaBerkas);

// Lewati escaping hanya untuk nilai yang sepenuhnya Anda kendalikan
await $`echo ${{ raw: "statis && tepercaya" }}`;
```

### Builtin yang Bisa Diandalkan

```text
cd   ls    rm     echo   pwd    bun    cat    touch   mkdir
which  mv  exit   true   false  yes    seq    dirname  basename
```

### Menulis Skrip Shell Mandiri

```bash
# deploy.sh — dijalankan dengan: bun ./deploy.sh
REV=$(git rev-parse --short HEAD)
echo "Men-deploy revisi $REV"
bun run build
bun run test
```

## Potongan Kode

### Skrip Deploy yang Gagal Cepat

```typescript
import { $, ShellError } from "bun";

const sha = process.env.GIT_SHA;
if (!sha) throw new Error("GIT_SHA belum diatur");

$.env({ ...process.env, NODE_ENV: "production" });

try {
  await $`bun run build`.quiet();
  await $`bun run test`.quiet();
  await $`docker build -t registry.example.com/api:${sha} .`.quiet();
  await $`docker push registry.example.com/api:${sha}`.quiet();
  console.log(`berhasil men-deploy ${sha}`);
} catch (error) {
  if (error instanceof ShellError) {
    console.error(error.stderr.toString());
    process.exitCode = error.exitCode;
  }
  throw error;
}
```

### Streaming Log Langsung

```typescript
import { $ } from "bun";

// Tahap pipeline berjalan bersamaan, jadi baris muncul saat anak menulis
for await (const line of $`tail -f /var/log/api.log | grep -i error`.lines()) {
  console.log(line);
}
```

### Skrip Pembersihan Lintas Platform

```typescript
import { $ } from "bun";

// rm dan mkdir adalah builtin, jadi ini juga berjalan di Windows
await $`rm -rf dist`;
await $`mkdir -p dist/assets`;
await $`mv public/assets dist/assets`;
```

### Penanganan Path yang Aman

```typescript
import { $ } from "bun";

async function daftarBerkas(dir: string) {
  // Nilai di-escape oleh shell; tidak perlu kutip manual
  const hasil = await $`find ${dir} -maxdepth 1 -type f`.nothrow().quiet();
  if (hasil.exitCode !== 0) {
    throw new Error(hasil.stderr.toString());
  }
  return hasil.stdout.toString().trim().split("\n");
}
```

---
title: "Cheat Sheet API Bundler dan Plugin Bun"
description: "Referensi cepat untuk API bundler JavaScript Bun — opsi Bun.build(), flag build CLI, sistem plugin (onResolve/onLoad), loader, macro, dan kompilasi eksekutabel mandiri."
category: "backend"
technology: "bun"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet API Bundler dan Plugin Bun

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Membundel dengan API JS | `Bun.build({ entrypoints, outdir })` | Setara terprogram dari `bun build` |
| Mengatur target output | `target: "bun"` | `"bun"`, `"browser"`, atau `"node"` |
| Memilih format modul | `format: "esm"` | `"esm"`, `"cjs"`, atau `"iife"` |
| Memperkecil output | `minify: true` | Juga menerima `{ syntax, whitespace, identifiers }` |
| Membuat source map | `sourcemap: "external"` | `"none"`, `"inline"`, `"external"`, `"linked"` |
| Memecah kode bersama | `splitting: true` | Chunk umum untuk beberapa entrypoint |
| Mengganti nama file output | `naming: "[dir]/[name].[ext]"` | Pola dengan placeholder |
| Menjaga paket tetap eksternal | `external: ["react"]` | Tidak membundel paket yang terdaftar |
| Menghapus panggilan console | `drop: ["console"]` | Menghapus pernyataan `console` dan `debugger` |
| Menyuntikkan variabel lingkungan | `env: "BUN_"` | Menyisipkan env var yang cocok dengan prefix |
| Mengganti konstanta | `define: { "KEY": "value" }` | Substitusi konstanta saat kompilasi |
| Mendaftarkan plugin | `plugin(myPlugin)` | `Bun.plugin` atau ekspor bernama `plugin` |
| Menyelesaikan jalur modul | `onResolve({ filter })` | Resolusi kustom di dalam plugin |
| Mentransformasi konten modul | `onLoad({ filter })` | Pemuatan kustom di dalam plugin |
| Memetakan ekstensi file | `loader: { ".txt": "text" }` | Loader bawaan per ekstensi |
| Menjalankan kode saat build | `import f from "./m" with { type: "macro" }` | Impor macro dieksekusi saat build |
| Mengompilasi menjadi biner | `bun build --compile src.ts --outfile app` | Eksekutabel native mandiri |

## Perintah Umum

### Build Terprogram dengan Bun.build()

```typescript
import { build } from "bun";

const result = await build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun", // "bun" | "browser" | "node"
  format: "esm", // "esm" | "cjs" | "iife"
  minify: true,
  sourcemap: "external",
  splitting: true,
  naming: "[dir]/[name].[ext]",
  external: ["react", "sharp"],
  env: "BUN_",
  define: {
    "import.meta.env.MODE": '"production"',
  },
  drop: ["console", "debugger"],
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}
```

### Membaca Output Build

```typescript
const result = await Bun.build({
  entrypoints: ["./src/index.ts", "./src/worker.ts"],
  outdir: "./dist",
  splitting: true,
});

for (const output of result.outputs) {
  console.log(output.path); // jalur absolut output
  console.log(output.kind); // "entry-point" | "chunk" | "asset" | "sourcemap"
  console.log(output.hash); // hash konten yang dipakai di nama file
}

// result.success: boolean — false saat build gagal
// result.logs: array berisi error dan warning build
```

### Flag Build CLI yang Setara

```bash
# Build dasar untuk runtime Bun
bun build src/index.ts --outdir dist --target bun

# Bundel browser dengan code splitting
bun build src/index.ts src/admin.ts --outdir dist --target browser --splitting

# Perkecil dan buat source map eksternal
bun build src/index.ts --outdir dist --minify --sourcemap=external

# Build ulang saat file berubah
bun build src/index.ts --outdir dist --watch

# Hapus pernyataan console dan debugger
bun build src/index.ts --outdir dist --drop=console,debugger

# Sisipkan variabel lingkungan dengan prefix tertentu
bun build src/index.ts --outdir dist --env BUN_

# Jaga paket tetap di luar bundel
bun build src/index.ts --outdir dist --external react

# Kompilasi menjadi eksekutabel mandiri
bun build --compile src/cli.ts --outfile ./dist/mycli

# Build sadar-HTML (membundel skrip, gaya, dan aset)
bun build src/index.html --outdir dist --minify --html
```

### Mendaftarkan Plugin

```typescript
import { plugin } from "bun";

plugin({
  name: "markdown-loader",
  setup(build) {
    build.onLoad({ filter: /\.md$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      return { contents: JSON.stringify(text), loader: "js" };
    });
  },
});
```

### Menyelesaikan Modul Kustom dengan onResolve

```typescript
import { plugin } from "bun";

plugin({
  name: "app-alias",
  setup(build) {
    // Menulis ulang impor @app/ ke direktori src lokal
    build.onResolve({ filter: /^@app\// }, (args) => ({
      path: args.path.replace(/^@app\//, "./src/"),
    }));

    // Menjaga paket native yang berat tetap tidak dibundel
    build.onResolve({ filter: /^aws-sdk$/ }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
});
```

### Modul Virtual dengan Namespace

```typescript
import { plugin } from "bun";

plugin({
  name: "virtual-config",
  setup(build) {
    // Mengarahkan impor "config" ke modul sintetis
    build.onResolve({ filter: /^config$/ }, () => ({
      path: "config",
      namespace: "virtual",
    }));

    // Menyediakan isi modul
    build.onLoad({ filter: /.*/, namespace: "virtual" }, () => ({
      contents: `export const apiUrl = "https://api.example.com";`,
      loader: "ts",
    }));
  },
});
```

### Memetakan Ekstensi File ke Loader

```typescript
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  loader: {
    ".svg": "file",
    ".png": "file",
    ".txt": "text",
    ".sql": "text",
    ".yaml": "text",
  },
});

// Nilai loader bawaan:
// "js" | "jsx" | "ts" | "tsx" | "json" | "toml" | "text" | "base64"
// | "dataurl" | "file" | "wasm"
```

### Macro — Kode yang Berjalan Saat Build

```typescript
// build-time-math.ts — dieksekusi oleh bundler, tidak dikirim ke runtime
export function double(x: number): number {
  return x * 2;
}

// app.ts — fungsi macro disisipkan ke dalam bundel
import { double } from "./build-time-math" with { type: "macro" };

console.log(double(21)); // disisipkan sebagai console.log(42)
```

## Potongan Kode

### Skrip Build Produksi

```typescript
// build.ts — jalankan dengan: bun run build.ts
import { build } from "bun";

const result = await build({
  entrypoints: ["./src/server.ts", "./src/worker.ts"],
  outdir: "./dist",
  target: "bun",
  format: "esm",
  minify: true,
  sourcemap: "external",
  splitting: true,
  naming: "[dir]/[name].[ext]",
  external: ["sharp", "aws-sdk"],
  env: "BUN_",
  define: {
    "import.meta.env.MODE": '"production"',
  },
  drop: ["console", "debugger"],
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}

for (const output of result.outputs) {
  console.log(`built: ${output.path}`);
}
```

### Plugin: Mengompilasi Konfigurasi YAML Saat Build

```typescript
import { plugin } from "bun";

plugin({
  name: "yaml-config",
  setup(build) {
    build.onLoad({ filter: /\.yaml$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const config = parseYaml(source); // parser YAML apa pun
      return {
        contents: `export default ${JSON.stringify(config)};`,
        loader: "js",
      };
    });
  },
});
```

### Plugin: Menyisipkan Feature Flag

```typescript
import { plugin } from "bun";

plugin({
  name: "feature-flags",
  setup(build) {
    build.onLoad({ filter: /feature-flags\.ts$/ }, () => ({
      contents: `export const flags = ${JSON.stringify({
        checkoutEnabled: true,
        recommendationsEnabled: false,
      })};`,
      loader: "ts",
    }));
  },
});
```

### Watch untuk Rebuild Inkremental

```typescript
// Dengan watch: true, promise selesai setelah build pertama
// tuntas, lalu rebuild berikutnya dicatat ke stdout.
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  watch: true,
});
```

### Mengompilasi Biner Mandiri

```bash
# Membundel CLI menjadi satu eksekutabel native
bun build --compile src/cli.ts --outfile ./dist/checkout

# Menyematkan aset yang diimpor langsung ke dalam eksekutabel
bun build --compile src/cli.ts --outfile ./dist/checkout --assetPrefix "bun-embed:"

# Memperkecil bundel yang masuk ke dalam biner
bun build --compile --minify src/cli.ts --outfile ./dist/checkout
```

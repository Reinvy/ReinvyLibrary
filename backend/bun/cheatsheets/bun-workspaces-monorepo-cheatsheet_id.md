---
title: "Cheat Sheet Monorepo Bun Workspaces"
description: "Referensi cepat Bun workspaces — glob workspace, penautan antar paket, filter script, katalog versi, publikasi, dan caching CI berbasis lockfile."
category: "backend"
technology: "bun"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Monorepo Bun Workspaces

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Mendeklarasikan workspace | `"workspaces": ["apps/*", "packages/*"]` | Daftar glob di `package.json` root |
| Memasang semua paket | `bun install` | Satu lockfile, satu `node_modules` di root |
| Menambah dependensi satu workspace | `bun add zod --cwd apps/api` | Ditulis ke manifest workspace tersebut |
| Menambah tool khusus root | `bun add -d typescript --cwd .` | DevDependency root, bukan per paket |
| Menjalankan script satu workspace | `bun run --cwd apps/web dev` | Sama dengan `bun --cwd apps/web run dev` |
| Menjalankan lintas workspace | `bun run --filter '*' test` | Filter nama paket, glob, atau path |
| Mencocokkan nama paket | `bun run --filter '@acme/api' build` | Cocok persis dengan field `name` |
| Urut sesuai dependensi | `bun run --filter './packages/*' build` | Bun mengurutkan lewat graf internal |
| Merujuk paket saudara | `"@acme/ui": "workspace:*"` | Selalu menautkan salinan lokal |
| Tautkan ulang setelah ubah manifest | `bun install --force` | Membangun ulang graf symlink |
| Pin versi bersama | `"catalog": { "react": "^19.0.0" }` | Dipakai sebagai `"catalog:"` di paket |
| Menerbitkan satu paket | `bun publish --cwd packages/ui` | Dijalankan dari direktori paket |
| Memeriksa tarball | `bun pm pack --cwd packages/ui` | Membuat paket tanpa menerbitkan |
| Instalasi reprodusibel | `bun install --frozen-lockfile` | Gagal bila lockfile akan berubah |

## Perintah Umum

### Menyiapkan struktur

```bash
mkdir -p apps/api apps/web packages/ui
cd apps/api && bun init -y
cd ../../apps/web && bun init -y

# Manifest root mengatur seluruh instalasi
cat > package.json <<'JSON'
{ "name": "acme", "private": true, "workspaces": ["apps/*", "packages/*"] }
JSON

bun install
```

### Menjalankan script dengan filter

```bash
# Semua workspace yang mendefinisikan "test"
bun run --filter '*' test

# Satu paket berdasarkan nama
bun run --filter '@acme/api' dev

# Semua paket dalam glob direktori, urut dependensi
bun run --filter './packages/*' build

# Beberapa filter sekaligus, dijalankan paralel
bun run --filter '*' lint --parallel
```

### Dependensi dan publikasi

```bash
# Dependensi runtime untuk satu workspace
bun add drizzle-orm --cwd apps/api

# Selesaikan ulang setelah manifest diedit manual
bun install --force

# Uji kering, lalu terbitkan
bun publish --cwd packages/ui --dry-run
bun publish --cwd packages/ui --access public
```

## Potongan Kode

### package.json root

```json
{
  "name": "acme-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "catalog": { "react": "^19.0.0", "typescript": "^5.6.0" },
  "scripts": {
    "build": "bun run --filter './packages/*' build",
    "test": "bun run --filter '*' test"
  },
  "devDependencies": { "typescript": "catalog:" }
}
```

### Manifest paket workspace

```json
{
  "name": "@acme/ui",
  "version": "1.2.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "files": ["src"],
  "dependencies": {
    "@acme/config": "workspace:*",
    "react": "catalog:"
  },
  "scripts": { "test": "bun test" }
}
```

### Memakai paket saudara dengan penanganan error

```typescript
// apps/api/src/routes/users.ts
import { db } from "@acme/db";
import { HttpError } from "@acme/errors";

try {
    const users = await db.query.users.findMany();
    return Response.json({ users });
} catch (error) {
    // Ubah kegagalan infrastruktur menjadi error bertipe, simpan cause
    throw error instanceof HttpError
        ? error
        : new HttpError(500, "Gagal memuat daftar pengguna", { cause: error });
}
```

### CI dengan cache berkunci lockfile

```yaml
name: ci
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lock') }}
      - run: bun install --frozen-lockfile
      - run: bun run --filter '*' build
```

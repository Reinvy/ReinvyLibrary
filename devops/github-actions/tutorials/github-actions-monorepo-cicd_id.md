---
title: "Membangun Pipeline CI/CD Monorepo dengan GitHub Actions"
description: "Pelajari cara mendesain pipeline CI/CD yang cepat dan benar untuk monorepo dengan GitHub Actions — path filtering, deteksi perubahan, matrix build, caching, dan rilis otomatis."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Pipeline CI/CD Monorepo dengan GitHub Actions

## Ringkasan

Monorepo memusatkan banyak paket dan aplikasi dalam satu repositori, tetapi juga merusak setup CI yang naif: setiap push membangun ulang semuanya, perubahan yang tidak terkait memblokir rilis, dan cache miss memperlambat seluruh pipeline. Tutorial ini mengajarkan cara mendesain pipeline CI/CD yang cepat dan benar untuk monorepo menggunakan GitHub Actions. Anda akan mempelajari trigger berbasis jalur file, deteksi perubahan dengan `dorny/paths-filter`, matrix build untuk paket workspace, pengurutan build yang sadar dependensi, strategi caching yang tetap efektif di tengah perubahan struktur monorepo, dan workflow rilis otomatis untuk paket yang berubah.

## Target Audiens

- DevOps engineer dan platform engineer yang mengelola pipeline CI/CD.
- Fullstack developer yang bekerja pada monorepo dengan workspace npm, pnpm, atau Yarn.
- Ekspektasi tingkat kemampuan pembaca: Mahir — nyaman dengan dasar-dasar GitHub Actions dan YAML, serta familier dengan konsep monorepo.

## Prasyarat

- Pengetahuan kerja tentang GitHub Actions: workflow, job, step, trigger, dan secrets (lihat tutorial "Memulai dengan GitHub Actions" jika diperlukan).
- Monorepo dengan package workspace (npm, pnpm, atau Yarn) — atau kesiapan menerapkan pola ini pada proyek Bazel/Nx/Turborepo.
- Keterampilan dasar YAML dan repositori GitHub tempat Anda dapat menguji workflow.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan mengapa monorepo merusak CI yang naif dan fitur GitHub Actions mana yang menyelesaikan setiap masalahnya.
- Menulis trigger workflow dengan path filter yang melewati build untuk perubahan yang tidak terkait.
- Mendeteksi paket yang berubah dengan `dorny/paths-filter` dan mengubahnya menjadi matrix build dinamis.
- Mengurutkan build sehingga paket dependen dibangun sebelum aplikasi yang mengonsumsinya.
- Mendesain cache key yang tetap efektif meski struktur monorepo berubah.
- Menyiapkan branch protection dengan required checks dan merge queue.
- Mengotomatiskan versioning dan penerbitan hanya untuk paket yang benar-benar berubah.

## Konteks dan Motivasi

Monorepo menarik karena memberi commit atomik, tooling bersama, dan refactoring lintas paket yang mudah. Biayanya adalah kompleksitas CI. Pipeline naif — checkout repositori, install semuanya, tes semuanya, build semuanya, deploy semuanya — tidak bisa diskalakan. Dengan sepuluh paket, perubahan satu file di dalam `packages/utils/README.md` dapat memicu pipeline penuh selama 30 menit yang sebagian besar mengulang pekerjaan yang tidak dibutuhkan siapa pun. Lebih buruk lagi, build yang rusak di paket yang tidak terkait memblokir rilis paket yang sehat.

GitHub Actions memiliki serangkaian fitur bawaan yang, jika digunakan bersama, mengubah pipeline monorepo dari beban menjadi keuntungan:

- **Path filter** pada trigger menentukan *apakah* sebuah workflow berjalan sama sekali.
- **Deteksi perubahan** menentukan *apa* yang dibangun di dalam workflow.
- **Strategi matrix** menjalankan bentuk job yang sama secara paralel di semua paket terpilih.
- **Caching** menjaga install dan artefak build tetap cepat tanpa meng-hard-code struktur repositori Anda.
- **Required checks dengan merge queue** melindungi branch utama tanpa memaksa setiap run repositori selesai sebelum semua merge.

Pergeseran mental yang penting: pipeline CI monorepo bukan satu pipeline dengan banyak step — melainkan *lapisan pengambil keputusan* di atas banyak pipeline kecil yang berskala paket. Tutorial ini membangun lapisan keputusan tersebut selangkah demi selangkah.

## Konten Inti

### Tantangan CI pada Monorepo

Perhatikan struktur workspace yang umum:

```text
apps/
  web/          # Aplikasi Next.js
  api/          # API Express
packages/
  ui/           # library komponen React bersama
  utils/        # fungsi utilitas murni
  config/       # konfigurasi lint/TS bersama
package.json
pnpm-lock.yaml
```

`apps/web` bergantung pada `packages/ui` dan `packages/utils`; `apps/api` bergantung pada `packages/utils`; `packages/ui` bergantung pada `packages/utils`. Ada tiga mode kegagalan yang dominan:

1. **Pekerjaan sia-sia** — perubahan pada `apps/api` ikut membangun ulang `apps/web`.
2. **Sinyal yang tidak stabil** — build `packages/ui` yang rusak menggagalkan check pada PR `apps/api` yang tidak terkait.
3. **Cache churn** — satu cache key yang me-hash seluruh source file menjadi tidak valid pada edit apa pun.

Setiap teknik dalam tutorial ini menyerang salah satu dari tiga mode di atas.

### Path Filtering dengan Workflow Trigger

Optimasi termurah terjadi *sebelum* job dimulai. Trigger workflow menerima filter `paths` dan `paths-ignore`:

```yaml
on:
  push:
    branches: [main]
    paths:
      - "apps/web/**"
      - "packages/ui/**"
      - "packages/utils/**"
      - "pnpm-lock.yaml"
  pull_request:
    paths:
      - "apps/web/**"
      - "packages/ui/**"
      - "packages/utils/**"
      - "pnpm-lock.yaml"
```

Aturan yang penting dalam praktik:

- `paths` dan `paths-ignore` tidak boleh digabung dalam satu trigger — gunakan salah satunya.
- Filter berlaku per file dalam *event*: workflow aktif hanya jika minimal satu file yang berubah cocok dengan pola.
- Daftar `paths-ignore` tidak pernah mem-filter workflow saat PR mengubah file workflow itu sendiri (`.github/workflows/**`); GitHub memperlakukan perubahan file workflow sebagai selalu memenuhi syarat, sehingga perubahan pipeline Anda benar-benar bisa diuji.
- Path filter tidak *mencegah* workflow berjalan saat branch dibuat, dan pola dibandingkan dengan jalur penuh, jadi `apps/web/**` cocok dengan `apps/web/package.json` tetapi tidak dengan `packages/web/package.json`.

Path filter adalah instrumen yang kasar: setiap push yang menyentuh `packages/ui` juga menjalankan check web, karena `apps/web` bergantung padanya. Itu benar — dependensi butuh diuji oleh konsumennya — tetapi tugas *deteksi perubahan* lah yang merutekan check tersebut secara presisi.

### Deteksi Perubahan dengan dorny/paths-filter

Di dalam workflow, Anda membutuhkan jawaban yang bisa dibaca mesin untuk "paket mana yang berubah?". Alat standarnya adalah `dorny/paths-filter`, yang membandingkan diff antara base SHA dan head SHA lalu mengeluarkan array JSON berisi nama filter yang cocok:

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - "apps/web/**"
            api:
              - "apps/api/**"
            ui:
              - "packages/ui/**"
            utils:
              - "packages/utils/**"
            config:
              - "packages/config/**"
            root:
              - "package.json"
              - "pnpm-lock.yaml"
              - ".github/workflows/**"
```

Output `changes` adalah array JSON seperti `["ui","utils"]`. Sebuah job kecil yang khusus menghitung diff sekali; semua job hilir mengonsumsinya melalui `needs`. Ini menghindari setiap job menghitung ulang diff dan memberi satu sumber kebenaran untuk seluruh run.

Kasus tepi yang klasik: perubahan lockfile berarti dependensi bisa saja berubah di mana-mana. Filter `root` ada persis untuk ini — ketika cocok, Anda harus fall back membangun semuanya:

```yaml
  build:
    needs: changes
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Membangun ${{ matrix.package }}"
```

Dengan `fromJson`, matrix diisi secara dinamis dari job deteksi. Jika tidak ada yang berubah, `outputs.packages` bernilai `[]` dan kondisi `if` melewati job sepenuhnya — nol menit terbuang.

Untuk fall-back lockfile, pola yang umum adalah memperluas matrix ke daftar paket penuh saat `root` cocok:

```yaml
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            # ...filter paket...
            root:
              - "pnpm-lock.yaml"
      - id: set-matrix
        run: |
          if [ "${{ steps.filter.outputs.root }}" == "true" ]; then
            echo "matrix=[\"web\",\"api\",\"ui\",\"utils\",\"config\"]" >> "$GITHUB_OUTPUT"
          else
            echo "matrix=${{ steps.filter.outputs.changes }}" >> "$GITHUB_OUTPUT"
          fi
```

### Matrix Build untuk Paket Workspace

Matrix dinamis mengubah satu definisi job menjadi N run paralel, satu per paket yang berubah. Bentuk kanonisnya:

```yaml
  build:
    needs: [changes]
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - name: Install dependensi
        run: pnpm install --frozen-lockfile
      - name: Build paket
        run: pnpm --filter "${{ matrix.package }}" build
```

Dua keputusan penyetelan yang penting:

- **`fail-fast: false`** membuat semua kaki matrix tetap berjalan saat satu gagal. Pada monorepo Anda ingin laporan *lengkap* paket mana yang rusak, bukan abort dini yang menyembunyikan kegagalan.
- **Scoping `pnpm --filter`** menjaga setiap kaki jujur terhadap paketnya. Dengan Turborepo atau Nx, ganti step terakhir dengan task runner milik alat tersebut (`pnpm turbo run build --filter=...[origin/main]`), yang menangani scoping sekaligus urutan build untuk Anda.

### Urutan Build dan Penanganan Paket Dependen

Matrix di atas benar untuk paket yang *independen*, tetapi `apps/web` bergantung pada `packages/ui`. Jika sebuah PR mengubah keduanya, membangun web secara paralel dengan ui dapat memakai artefak ui yang basi. Ada tiga strategi:

1. **Reactive dependency builds** — perubahan pada `packages/ui` juga memicu build untuk setiap paket yang bergantung padanya. Inilah yang dilakukan Turborepo/Nx secara native melalui dependency graph mereka.
2. **Pengurutan topologis** — bangun daun terlebih dahulu, baru dependennya. GitHub Actions sendiri tidak memiliki mesin DAG, jadi tanpa task runner Anda mengodekan urutannya secara manual: satu job yang menjalankan `pnpm --filter <deps> build` sebelum `pnpm --filter <app> build`.
3. **Publish-and-consume** — paket UI menerbitkan versi internal (atau memakai tarball lokal), dan aplikasi dibangun terhadap artefak yang diterbitkan. Fidelitas tertinggi, kompleksitas tertinggi.

Titik manis yang pragmatis bagi kebanyakan tim adalah task runner dengan **remote cache**:

```yaml
  build:
    needs: [changes]
    if: ${{ needs.changes.outputs.packages != '[]' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Jalankan build sesuai urutan dependensi (remote-cached)
        run: pnpm turbo run build --filter=...[origin/main]
```

`--filter=...[origin/main]` memberi tahu Turborepo untuk membangun hanya paket yang terpengaruh sejak branch utama, dalam urutan dependensi, dengan hasil yang di-cache jarak jauh sehingga paket yang tidak berubah dilayani dari cache dalam hitungan detik.

### Strategi Caching untuk Monorepo yang Berubah

Caching adalah titik di mana pipeline monorepo biasanya menurun mutunya. Satu key naif seperti `cache: ${{ hashFiles('**') }}` menjadi tidak valid pada perubahan *file apa pun*. Caching monorepo yang benar mengikuti hierarki:

- **Cache dependensi** — hanya di-key oleh lockfile, dengan fallback restore yang anggun:

```yaml
      - uses: actions/cache@v4
        with:
          path: node_modules
          key: deps-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            deps-${{ runner.os }}-
```

- **Cache task runner** — di-key oleh lapisan dependensi plus sumber yang di-cache, sehingga paket yang tidak berubah tidak pernah dieksekusi ulang:

```yaml
      - uses: actions/cache@v4
        with:
          path: node_modules/.cache/turbo
          key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            turbo-${{ runner.os }}-
```

- **Cache package manager yang disediakan GitHub** — `actions/setup-node` dengan `cache: pnpm` (atau npm/yarn) menangani lapisan dependensi untuk Anda dan biasanya sudah cukup jika dikombinasikan dengan remote cache task runner.

Prinsip panduannya: **key yang stabil tetapi presisi**. Lockfile me-hash apa yang berubah, sumber mengontrol apa yang dieksekusi ulang, dan `restore-keys` membuat cache miss menurun ke cache terbaru yang kompatibel alih-alih cold start. Jangan pernah meletakkan `hashFiles('**/*')` di key dependensi — satu edit komentar menghancurkan cache untuk seluruh repositori.

### Required Checks, Concurrency, dan Merge Queues

Presisi dalam *check mana* yang berjalan menciptakan masalah branch protection: jika PR yang hanya menyentuh `apps/api` melewati check web, required check "web" akan memblokirnya selamanya. Tiga mekanisme menjaga branch utama tetap terlindungi tanpa menahan PR yang tidak terkait:

1. **Required status checks** harus merujuk check yang benar-benar berjalan. Dengan deteksi perubahan, jadikan check yang diwajibkan sebagai *gateway job* — misalnya job `checks` yang lolos ketika pipeline berjalan dan tidak ada yang gagal — atau pastikan *nama* job dinamisnya stabil apa pun isi matrix.
2. **`concurrency`** membatalkan run yang digantikan sehingga perbaikan typo yang cepat tidak menunggu di belakang build penuh yang dipicu push sebelumnya:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

1. **Merge queues** menyerialkan merge dan menjalankan ulang check pada hasil *gabungan*. Workflow harus bereaksi terhadap trigger `merge_group` juga, atau queue menunggu selamanya:

```yaml
on:
  pull_request:
  merge_group:
```

Dengan merge queue, check per-paket tetap presisi dan queue memvalidasi ulang integrasi di atas main — kedua mekanisme saling melengkapi.

### Merilis Paket yang Berubah

Rilis mengikuti filosofi yang sama: hanya paket yang file versinya berubah yang diterbitkan. Alat `changesets` adalah workflow standarnya:

```yaml
name: release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Buat PR versi atau publikasikan
        uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Action ini membuka PR "Version Packages" yang menaikkan versi hanya pada paket yang terdaftar di changeset yang tertunda; ketika PR tersebut di-merge ke main (atau saat `publish` diatur dan push membawa rilis), ia menjalankan `pnpm changeset publish` — yang menerbitkan hanya paket dengan versi yang berubah. Paket yang tidak terkait tidak pernah naik versi dan tidak pernah diterbitkan ulang.

Pola yang sama berlaku di luar npm: image Docker dapat dibangun dan didorong hanya untuk aplikasi yang berubah, ditandai dengan Git SHA, memakai output `paths-filter` yang sama.

## Contoh Kode

### Struktur monorepo referensi

```text
monorepo/
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── ui/
│   ├── utils/
│   └── config/
├── package.json
├── pnpm-lock.yaml
└── turbo.json
```

### Workflow CI lengkap dengan deteksi perubahan dan matrix

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - "apps/web/**"
            api:
              - "apps/api/**"
            ui:
              - "packages/ui/**"
            utils:
              - "packages/utils/**"
            config:
              - "packages/config/**"
            root:
              - "pnpm-lock.yaml"
              - ".github/workflows/**"

  lint:
    needs: changes
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter "${{ matrix.package }}" lint

  build:
    needs: changes
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build --filter=...[origin/main]

  test:
    needs: changes
    if: ${{ needs.changes.outputs.packages != '[]' }}
    strategy:
      fail-fast: false
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter "${{ matrix.package }}" test
```

### Fall-back lockfile dengan matrix terhitung

```yaml
  build:
    needs: changes
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - id: set-matrix
        run: |
          if [ "${{ needs.changes.outputs.root }}" == "true" ]; then
            echo "matrix=[\"web\",\"api\",\"ui\",\"utils\",\"config\"]" >> "$GITHUB_OUTPUT"
          else
            echo "matrix=${{ needs.changes.outputs.packages }}" >> "$GITHUB_OUTPUT"
          fi
```

### Cache toolchain dengan fallback restore

```yaml
      - uses: actions/cache@v4
        with:
          path: node_modules/.cache/turbo
          key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
          restore-keys: |
            turbo-${{ runner.os }}-
```

### Workflow rilis dengan changesets

```yaml
name: release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Insight Penting

- **Gerbang punya dua lapisan dengan job berbeda**: path filter pada trigger menentukan apakah sebuah workflow berjalan; deteksi perubahan di dalam workflow menentukan apa yang berjalan. Jangan mencampurnya — filter `paths` adalah saklar repo yang kasar, `dorny/paths-filter` adalah router per-paket yang presisi.
- **Simpan komputasi diff dalam satu job**: setiap job yang membutuhkan daftar perubahan harus membaca `needs.changes.outputs` alih-alih menghitung ulang diff. Satu sumber kebenaran mencegah inkonsistensi matrix antar job.
- **Jangan pernah meletakkan source hash di cache key dependensi**: key cache dependensi hanya pada lockfile, dan biarkan `restore-keys` menurun secara anggun. Key dependensi `hashFiles('**')` menjadikan setiap edit sebagai install dingin.
- **`fail-fast: false` adalah default monorepo**: abort dini menyembunyikan daftar paket yang rusak. Anda menginginkan laporan kegagalan lengkap di merge queue, bukan korban pertama.
- **Merge queue menuntut trigger `merge_group`**: queue yang menjalankan workflow yang tidak pernah mendengarkan `merge_group` akan macet selamanya. Tambahkan trigger itu sejak hari Anda mengaktifkan queue.
- **Terbitkan hanya apa yang berubah**: changesets menjaga kenaikan versi dan penerbitan tetap terbatas pada perubahan nyata; output paths-filter yang sama dapat menggerakkan build image Docker kondisional hanya untuk aplikasi yang berubah.

## Langkah Berikutnya

- Perdalam penulisan workflow Anda dengan panduan GitHub Actions Workflow Testing & Debugging.
- Pindahkan job kritis ke infrastruktur Anda sendiri dengan panduan Self-Hosted Runners.
- Pelajari GitHub Actions DevOps Syllabus untuk jalur terstruktur dari fondasi hingga CI/CD produksi.
- Jelajahi Advanced GitHub Actions Syllabus untuk strategi matrix, caching, dan security hardening dalam skala besar.

## Kesimpulan

Pipeline monorepo adalah lapisan pengambil keputusan, bukan sekadar skrip. Path filter menentukan *apakah* sebuah workflow berjalan, deteksi perubahan menentukan *apa* yang dibangunnya, matrix dinamis menyejajarkan pekerjaan, dan cache key yang stabil menjaganya tetap cepat. Tambahkan merge queue untuk memvalidasi ulang integrasi di atas main, dan changesets untuk menerbitkan hanya yang benar-benar berubah. Diterapkan bersama, pola-pola ini mengubah monorepo dari beban CI menjadi salah satu pengalaman developer tercepat yang bisa ditawarkan GitHub Actions.

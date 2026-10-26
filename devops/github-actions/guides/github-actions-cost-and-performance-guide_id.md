---
title: "Panduan Biaya dan Performa GitHub Actions"
description: "Panduan praktis menekan biaya dan waktu eksekusi GitHub Actions melalui kontrol konkurensi, strategi cache, pemangkasan matrix, timeout, dan perhitungan ekonomis runner."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Biaya dan Performa GitHub Actions

## Pendahuluan

GitHub Actions menagih berdasarkan **menit runner**, dan setiap menit dihargai sesuai label runner yang menjalankannya. Workflow yang terasa "gratis" saat prototipe berubah menjadi pos biaya begitu repositori punya dua puluh kontributor, matrix harian, dan test suite yang memakan sebelas menit. Biaya dan latensi biasanya bergerak bersama: pipeline yang lambat hampir selalu pipeline yang mahal, karena ia menahan runner tetap hidup untuk pekerjaan yang sebenarnya bisa di-cache, dilewati, atau diparalelkan dengan cara lain.

Model penagihan punya tiga pengali yang perlu diingat: runner Linux ditagih pada tarif dasar, Windows sekitar dua kali lipat, dan macOS sekitar sepuluh kali tarif Linux, dengan runner berukuran besar mengalikan lagi sesuai jumlah vCPU. Penyimpanan artefak dan cache ditagih terpisah, sehingga pipeline yang mengunggah artefak build 2 GB pada setiap push membayar dua kali: sekali untuk komputasi dan sekali untuk menyimpannya selama sembilan puluh hari. Panduan ini memperlakukan optimasi sebagai siklus — ukur, ubah satu tuas, ukur lagi — karena setiap tuas di bawah bersifat reversibel dan tuning CI yang prematur hanya menghasilkan YAML rapuh.

| Label runner | Biaya menit relatif | Penggunaan umum |
| --- | --- | --- |
| `ubuntu-latest` | 1x | Build, test, lint, container |
| `windows-latest` | ~2x | Biner khusus Windows, paket MSI |
| `macos-latest` | ~10x | Signing dan notarization iOS/macOS |

## Praktik Terbaik

- **Batalkan run yang sudah usang lebih dulu.** `concurrency` dengan `cancel-in-progress` menghilangkan sumber pemborosan terbesar di branch aktif: run yang sudah kedaluwarsa bahkan sebelum mulai.
- **Selalu set `timeout-minutes`.** Test integrasi yang menunggu service mati akan dengan senang hati menghabiskan batas default enam jam. Timeout per job mengubah gangguan menjadi kegagalan lima menit.
- **Cache berdasarkan hash lockfile, bukan branch.** Key dari `hashFiles('**/package-lock.json')` tetap kena antar-branch; key dari `github.ref` selalu meleset di setiap push.
- **Jaga cakupan cache tetap sempit.** Meng-cache `node_modules` langsung lebih lambat dan kurang portabel dibanding meng-cache direktori unduhan package manager. Cache yang mahal diambil, bukan yang murah dipasang.
- **Pangkas matrix sebelum mengoptimasi isinya.** Matrix 3 x 4 berarti dua belas runner. Menurunkan matrix dari path yang berubah, atau memisahkan suite "cepat" dan "lambat", biasanya lebih hemat daripada memangkas detik di dalam satu job.
- **Utamakan Linux untuk semua yang tidak benar-benar butuh OS lain.** Cross-compile dan container menutupi sebagian besar kasus yang dikira butuh Windows atau macOS.
- **Unggah artefak secara sadar.** Set `retention-days` per artefak dan hindari mengunggah log yang sudah tercetak di konsol job.
- **Gagal cepat, lalu melebar.** Jalankan lint dan unit test dalam satu job pendek; baru sebar ke job integrasi dan e2e yang lambat setelah lolos.
- **Baru pertimbangkan self-hosted setelah itu.** Runner self-hosted menguntungkan pada volume stabil, bukan volume meledak-meledak, dan membawa kewajiban patch serta keamanan yang jarang muncul di perbandingan biaya.

## Langkah Implementasi

### Langkah 1: Ukur pengeluaran saat ini

Mulai dari angka nyata, bukan intuisi. API penagihan mengembalikan menit per repositori dan per OS, cukup untuk mengurutkan sumber pemborosan.

```bash
# Menit yang ditagih per repositori bulan lalu - urutkan pelaku pemborosan
gh api "/orgs/acme/settings/billing/actions" \
    --jq '.repositories[] | [.name, .total_minutes_used] | @tsv' \
    | sort -k2 -nr | head -10
```

Bila organisasi tidak punya scope penagihan, baca `.minutes_used_breakdown` dari endpoint yang sama, atau gunakan `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs` untuk waktu per job. Apa pun caranya, catat baseline sebelum mengubah YAML.

### Langkah 2: Tambahkan konkurensi dan timeout

Dua pengaturan ini tidak memakan biaya dan menjadi perubahan paling berdampak di sebagian besar repositori.

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

concurrency:
    group: ci-${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint && npm test
```

Membiarkan `cancel-in-progress` bernilai false di `main` menjaga urutan deploy tetap utuh, sambil tetap menciutkan push pull request yang berisik.

### Langkah 3: Bangun cache yang benar-benar kena

Cache hanya berguna bila key-nya bertahan saat berpindah branch. Hash lockfile dan tambahkan prefix restore agar hit parsial tetap membantu.

```yaml
      - name: Pulihkan cache dependensi
        id: deps
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            ~/.cache/playwright
          key: deps-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            deps-${{ runner.os }}-

      - name: Pasang hanya saat cache meleset
        if: steps.deps.outputs.cache-hit != 'true'
        run: npm ci --prefer-offline --no-audit
```

Periksa rasio hit di log job (`Cache restored from key: ...`), jangan berasumsi. Cache yang selalu meleset lebih buruk daripada tanpa cache, karena ia menambah waktu unggah di atas biaya yang ingin Anda hilangkan.

### Langkah 4: Pangkas matrix

Ganti matrix tanpa syarat dengan cakupan eksplisit yang bermakna. Pertahankan matrix penuh di `main` dan versi lebih kecil di pull request.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        node: ${{ fromJSON(github.event_name == 'pull_request' && '[20]' || '[18, 20, 22]') }}
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npx jest --shard=${{ matrix.shard }}/4
```

Sharding memotong waktu dinding tanpa menambah total menit; pemangkasan memotong keduanya. Gunakan sharding ketika pengembang sedang menunggu, dan pemangkasan ketika tagihan yang menjadi masalah.

### Langkah 5: Hitung ekonomi self-hosted secara jujur

Runner self-hosted menukar penagihan per menit dengan biaya tetap plus tenaga kerja. Di bawah titik impas ia hanya hobi; di atasnya ia baru lebih murah bila ada yang benar-benar merawatnya.

```bash
#!/usr/bin/env bash
set -euo pipefail

menit_bulanan=${1:?pemakaian: breakeven.sh MENIT}
tarif_hosted=0.008         # USD per menit Linux, sesuaikan dengan paket Anda
biaya_server=120           # instance + penyimpanan + egress yang diamortisasi
jam_operasional=6          # patching, upgrade, insiden per bulan
tarif_ops=45

biaya_hosted=$(awk -v m="$menit_bulanan" -v r="$tarif_hosted" 'BEGIN { printf "%.2f", m * r }')
biaya_sendiri=$(awk -v s="$biaya_server" -v h="$jam_operasional" -v r="$tarif_ops" 'BEGIN { printf "%.2f", s + h * r }')

echo "hosted: \$$biaya_hosted   self-hosted: \$$biaya_sendiri"
awk -v a="$biaya_hosted" -v b="$biaya_sendiri" 'BEGIN { exit (a > b) ? 0 : 1 }' \
    && echo "self-hosted lebih murah pada volume ini" \
    || echo "tetap gunakan runner GitHub-hosted"
```

### Langkah 6: Kunci perbaikan dengan pagar pengaman

Optimasi akan luntur ketika fitur berikutnya menambah job. Jadikan default-nya struktural: batas pengeluaran tingkat organisasi, reusable workflow bersama yang sudah menyetel timeout dan konkurensi, serta required check yang menolak workflow tanpa keduanya.

```yaml
# .github/workflows/ci.yml - panggil template terkelola, bukan salinannya
jobs:
  ci:
    uses: acme/ci-templates/.github/workflows/node-ci.yml@v3
    with:
      node-version: "20"
      timeout-minutes: 15
    secrets: inherit
```

Ukur ulang setiap bulan terhadap baseline Langkah 1. Angka yang penting adalah menit per pull request yang di-merge, bukan menit per bulan, karena yang kedua tumbuh seiring jumlah orang sementara yang pertama mencerminkan efisiensi rekayasa sebenarnya.

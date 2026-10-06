---
title: "Cheat Sheet Ekspresi dan Konteks GitHub Actions"
description: "Referensi cepat untuk sintaks ekspresi GitHub Actions, operator, fungsi status, dan semua konteks runtime."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Ekspresi dan Konteks GitHub Actions

## Tabel Referensi Cepat

| Konteks | Akses | Deskripsi |
|---------|-------|-----------|
| `github` | `github.event_name`, `github.ref` | Metadata tentang run workflow: event pemicu, ref, repository, aktor, SHA |
| `env` | `env.NAMA_VAR` | Variabel lingkungan yang diatur di level workflow, job, atau step |
| `vars` | `vars.NAMA_VAR` | Variabel konfigurasi repository, organisasi, atau environment |
| `secrets` | `secrets.NAMA_SECRET` | Secret terenkripsi; termasking di log; tidak bisa dibaca langsung di kondisi `if:` |
| `inputs` | `inputs.NAMA` | Input yang diberikan ke workflow yang dapat digunakan kembali (`workflow_call`) atau run `workflow_dispatch` |
| `needs` | `needs.ID_JOB.result` | Hasil dan output dari job yang menjadi dependensi job ini |
| `strategy` | `strategy.job-index`, `strategy.job-total` | Indeks dan jumlah total job saat ini di dalam sebuah matrix |
| `matrix` | `matrix.NAMA_SUMBU` | Nilai sumbu dari kombinasi matrix saat ini |
| `steps` | `steps.ID_STEP.outputs.NAMA` | Output dan hasil dari step di job saat ini |
| `runner` | `runner.os`, `runner.arch` | Runner yang mengeksekusi job: OS, arsitektur, direktori sementara |
| `job` | `job.status`, `job.container` | Status, container, dan services dari job saat ini |
| `jobs` | `jobs.ID_JOB.result` | Hasil dan output semua job; hanya bisa dipakai di kondisi `jobs.<id>.if` |

## Perintah Umum

### Sintaks Ekspresi

Setiap ekspresi dibungkus dengan `${{ }}` dan dievaluasi saat run berjalan, setelah kunci `on:` dari workflow terselesaikan.

```yaml
# Literal
${{ true }}                  # boolean
${{ 42 }}                    # angka
${{ 'string dalam kutip' }}  # string dengan kutip tunggal; gandakan kutip untuk escape: 'itu''s'
${{ null }}                  # null — tampil sebagai string kosong

# Akses properti — notasi titik atau kurung siku setara
${{ github.ref }}
${{ github['ref'] }}

# Kondisi `if:` mengevaluasi ekspresi secara implisit — pembungkus bersifat opsional
if: github.ref == 'refs/heads/main'
if: ${{ github.ref == 'refs/heads/main' }}   # bentuk eksplisit, disarankan

# Semuanya adalah string saat run berjalan
# Ekspresi di dalam `run:` diekspansi oleh shell, jadi kutip:
run: echo "Menyebarkan ${{ github.ref_name }}"
```

Urutan prioritas operator, dari tertinggi ke terendah: `( )` pengelompokan, `[ ]` indeks, `.` akses properti, `!`, `<` `<=` `>` `>=`, `==` `!=`, `&&`, `||`.

```yaml
# GAGAL: prioritas membuat ini dievaluasi sebagai `(A) && (B || C)`
# if: ${{ A || B && C }}
# Selalu kelompokkan operator campuran secara eksplisit:
if: ${{ (A || B) && C }}
```

### Referensi Operator

```text
| Operator | Deskripsi           | Contoh                               |
|----------|---------------------|--------------------------------------|
| `( )`    | Pengelompokan       | `${{ (a == 1) && (b == 2) }}`        |
| `[ ]`    | Indeks / kunci      | `${{ matrix.os[0] }}`                |
| `.`      | Akses properti      | `${{ github.ref }}`                  |
| `!`      | NOT logis           | `${{ !cancelled() }}`                |
| `<`      | Kurang dari         | `${{ steps.load.outputs.n < 10 }}`   |
| `<=`     | Kurang atau sama    | `${{ github.run_attempt <= 2 }}`     |
| `>`      | Lebih dari          | `${{ needs.build.outputs.size > 1 }}`|
| `>=`     | Lebih atau sama     | `${{ runner.arch >= 'X64' }}`        |
| `==`     | Kesetaraan          | `${{ github.ref_name == 'main' }}`   |
| `!=`     | Ketidaksamaan       | `${{ inputs.env != 'prod' }}`        |
| `&&`     | DAN logis           | `${{ success() && env.RUN_E2E }}`    |
| `||`     | ATAU logis          | `${{ failure() || cancelled() }}`    |
```

Perbandingan longgar: GitHub mengonversi tipe sebelum membandingkan. `${{ 1 == '1' }}` bernilai `true` (string dikonversi menjadi angka), dan boolean dikonversi menjadi `1`/`0` saat dibandingkan dengan angka. Gunakan `fromJSON()` ketika tipe harus cocok secara persis.

### Fungsi Status

Tanpa fungsi status eksplisit, pemeriksaan implisit bawaan adalah `success()` untuk step maupun job.

```yaml
# success()   — true ketika semua step/job sebelumnya sukses (nilai bawaan)
# always()    — true apa pun hasilnya, termasuk pembatalan; gunakan untuk
#               menjalankan pekerjaan pembersihan setelah kegagalan
# cancelled() — true hanya ketika run dibatalkan (tidak pernah dengan success())
# failure()   — true ketika ada step/job sebelumnya yang gagal (false saat dibatalkan)

# Fungsi status memiliki prioritas khusus: dievaluasi sebelum || dan &&
if: ${{ !cancelled() }}                                   # jalankan kecuali run dibatalkan
if: ${{ failure() }}                                      # jalankan hanya setelah kegagalan
if: ${{ always() }}                                       # tanpa syarat, bahkan saat batal
if: ${{ success() && github.ref == 'refs/heads/main' }}   # dikombinasikan dengan pemeriksaan lain
```

### Fungsi String dan Koleksi

```yaml
# contains(cari, item) — pemeriksaan substring pada string, atau keanggotaan pada array
if: ${{ contains(github.ref_name, 'release') }}
if: ${{ contains(needs.*.result, 'failure') }}     # ada job dependensi yang gagal?

# startsWith(cari, awalan) / endsWith(cari, akhiran)
if: ${{ startsWith(github.ref, 'refs/tags/') }}
if: ${{ endsWith(github.repository, '-api') }}

# format(string, nilai0, nilai1, ...) — mengganti placeholder {0}, {1}, ...
run: echo "${{ format('Menyebarkan {0} ke {1}', github.ref_name, inputs.env) }}"

# join(array, pemisah?) — menggabungkan nilai; pemisah bawaan adalah koma
run: echo "Sumbu: ${{ join(matrix.*, ' | ') }}"
```

### Fungsi Konversi Data

```yaml
# toJSON(nilai) — JSON yang diformat rapi untuk nilai apa pun (berguna untuk debugging)
run: echo "${{ toJSON(github.event) }}" > event.json

# fromJSON(nilai) — mengurai string JSON kembali menjadi objek/array
# Roti dan mentega untuk matrix dinamis dan output job:
matrix: ${{ fromJSON(needs.load.outputs.matrix) }}

# hashFiles(path1, path2, ...) — hash stabil dari file yang cocok
# Pola glob menggunakan ** untuk pencocokan mendalam; ideal untuk kunci cache
key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

### Filter Objek

Sintaks filter memungkinkan Anda menjangkau objek dan array bersarang tanpa perulangan.

```text
| Filter     | Deskripsi                   | Contoh                                  |
|------------|-----------------------------|-----------------------------------------|
| `*`        | Semua properti / elemen     | `${{ needs.*.result }}`                 |
| `[n]`      | Elemen pada indeks `n`      | `${{ matrix.os[0] }}`                   |
| `[kunci]`  | Properti berdasarkan kunci  | `${{ github.event['pull_request'] }}`   |
| `*.prop`   | Akses bersarang pada objek  | `${{ steps.*.outputs.version }}`        |
```

### Referensi Konteks — github

Konteks `github` adalah yang paling kaya. Berikut adalah kolom yang paling sering digunakan:

| Properti | Deskripsi |
|----------|-----------|
| `github.event_name` | Nama event yang memicu run (`push`, `pull_request`, ...) |
| `github.event` | Payload webhook lengkap dari event pemicu |
| `github.ref` | Ref lengkap yang memicu run (`refs/heads/main`, `refs/tags/v1.0.0`) |
| `github.ref_name` | Nama branch atau tag pendek (`main`, `v1.0.0`) |
| `github.ref_type` | `branch` atau `tag` |
| `github.sha` | SHA commit yang memicu run |
| `github.repository` | Repository dalam bentuk `owner/nama` |
| `github.repository_owner` | Login pemilik |
| `github.actor` | Login pengguna yang memulai run |
| `github.triggering_actor` | Login pengguna yang memulai run (berbeda dari `actor` untuk workflow yang dapat digunakan kembali) |
| `github.run_id`, `github.run_number` | ID run unik; nomor run yang bertambah |
| `github.run_attempt` | Nomor percobaan (1 untuk percobaan pertama, 2+ untuk run ulang) |
| `github.workflow` | Nama file workflow |
| `github.job` | ID job saat ini |
| `github.workspace` | Direktori kerja bawaan untuk runner (~/work/.../repo) |
| `github.token` | `GITHUB_TOKEN` untuk run (otomatis dimasking) |
| `github.server_url` | URL akar server, mis. `https://github.com` |
| `github.event_path` | Path ke file payload webhook di runner |

```yaml
# Mengakses kolom payload event bersarang — kolom harus ada untuk event tersebut
# (${{ github.event.pull_request.number }} hanya valid pada run pull_request)
run: echo "PR #${{ github.event.pull_request.number }}"
```

### Variabel Lingkungan, Variabel, dan Secret

```yaml
# env — prioritas berlapis saat nama yang sama diatur di beberapa level:
#       step > job > workflow > runner (setiap level menimpa level di bawahnya)
env:
  NODE_ENV: production
jobs:
  build:
    env:
      NODE_ENV: test          # menimpa nilai level workflow di job ini
    steps:
      - run: echo "$NODE_ENV" # mencetak test; env level step akan menang atas ini

# vars — konfigurasi non-secret; cakupan yang paling spesifik menang:
#       vars environment > vars repository > vars organisasi
run: echo "Region: ${{ vars.AWS_REGION }}"

# secrets — nilai dimasking di log; tolak di level workflow untuk
# menjauhkannya dari setiap job:
if: ${{ inputs.canary == 'true' }}

# Secret TIDAK BISA dibaca langsung di kondisi `if:`:
#   if: ${{ secrets.ENABLED == 'true' }}   # TIDAK VALID
# Teruskan melalui env sebagai gantinya:
env:
  ENABLED: ${{ secrets.ENABLED }}
if: ${{ env.ENABLED == 'true' }}           # VALID
```

### Konversi dan Paksaan Tipe

```yaml
# Setiap hasil ekspresi adalah string saat mencapai shell
# null tampil sebagai string kosong — lindungi diri secara eksplisit
run: echo "Aktor: ${{ github.actor || 'unknown' }}"

# Input boolean dan angka workflow_dispatch / workflow_call tiba sebagai string
#   inputs.production == true            # SALAH — 'true' vs true
#   inputs.production == 'true'          # benar
#   fromJSON(inputs.retries) > 3         # konversi ke angka terlebih dahulu

# toJSON mempertahankan tipe saat mengirim data antar job dan matrix
outputs:
  matrix: ${{ toJSON(matrix) }}

# Konteks array — matrix.* menampilkan setiap sumbu kombinasi saat ini
run: echo "Nilai sumbu: ${{ join(matrix.*, ', ') }}"
```

## Potongan Kode

### Eksekusi Job Bersyarat

```yaml
name: penyebaran-bersyarat
on:
  push:
    tags:
      - "v*"

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Jalankan hanya untuk rilis tag dari manusia, tidak pernah dari bot dependensi
    if: ${{ startsWith(github.ref, 'refs/tags/') && github.actor != 'dependabot[bot]' }}
    steps:
      - run: echo "Menyebarkan tag ${{ github.ref_name }}"
      - run: echo "Run rilis #${{ github.run_number }} percobaan ${{ github.run_attempt }}"
```

### Matrix Dinamis dari File JSON

```yaml
name: matrix-dinamis

jobs:
  load:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.gen.outputs.matrix }}
    steps:
      - id: gen
        run: |
          echo "matrix=$(cat .github/matrix.json | jq -c .)" >> "$GITHUB_OUTPUT"

  build:
    needs: load
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix: ${{ fromJSON(needs.load.outputs.matrix) }}
    steps:
      - run: echo "Membangun di ${{ matrix.os }} dengan Node ${{ matrix.node }}"
```

### Berbagi Data Antar Job

```yaml
name: meneruskan-output

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.tag.outputs.image }}
    steps:
      - id: tag
        run: |
          echo "image=registry.example/app:${GITHUB_SHA::8}" >> "$GITHUB_OUTPUT"

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "Menyebarkan ${{ needs.build.outputs.image }}"
      - run: echo "Status build: ${{ needs.build.result }}"
```

### Kunci Cache dengan hashFiles

```yaml
name: build-dengan-cache

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            npm-${{ runner.os }}-
      - run: npm ci
```

### Input dan Secret Workflow yang Dapat Digunakan Kembali

```yaml
# .github/workflows/reusable-deploy.yml
name: deploy-usable
on:
  workflow_call:
    inputs:
      environment:
        type: string
        required: true
      debug:
        type: boolean
        default: false
    secrets:
      CLOUD_TOKEN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - run: |
          echo "Environment: ${{ inputs.environment }}"
          echo "Debug: ${{ inputs.debug }}"
      - name: Autentikasi
        run: echo "Menggunakan token cloud (dimasking)"
        env:
          TOKEN: ${{ secrets.CLOUD_TOKEN }}
```

### Output Step dan Penanganan Kegagalan

```yaml
name: e2e-tangguh

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - id: flaky
        continue-on-error: true        # pertahankan run tetap hidup setelah step ini gagal
        run: ./run-e2e.sh
      - name: Kumpulkan artefak
        if: ${{ always() }}
        run: ./collect-logs.sh
      - name: Peringatan untuk kegagalan yang tidak pulih
        if: ${{ failure() && steps.flaky.outcome == 'failure' }}
        run: ./notify-slack.sh
      - name: Gerbang pipeline
        if: ${{ steps.flaky.outcome != 'failure' }}
        run: echo "E2E lulus"
```

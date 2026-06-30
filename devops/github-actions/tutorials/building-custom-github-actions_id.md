---
title: "Membangun GitHub Actions Kustom"
description: "Tutorial komprehensif tentang membuat GitHub Actions kustom yang dapat digunakan kembali menggunakan pendekatan composite, JavaScript, dan Docker container, beserta alur kerja pengujian dan publikasi."
category: "devops"
technology: "github-actions"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun GitHub Actions Kustom

## Ringkasan

Workflow GitHub Actions menjadi jauh lebih kuat ketika Anda membuat action kustom yang dapat digunakan kembali. Tutorial ini mengajarkan cara membangun, menguji, dan mempublikasikan GitHub Actions kustom dalam tiga varian: composite actions yang mengorkestrasi banyak langkah, JavaScript actions yang didukung oleh Node.js, dan Docker container actions untuk lingkungan runtime yang konsisten. Anda akan menyelesaikannya dengan sebuah action kustom yang dipublikasikan ke GitHub Marketplace.

## Target Audiens

- Engineer DevOps dan pengembang yang secara rutin menulis workflow GitHub Actions dan ingin membuat komponen yang dapat digunakan kembali.
- Level menengah — familiarity dengan sintaks workflow GitHub Actions (jobs, steps, triggers) sudah diasumsikan.
- Pengalaman sebelumnya dengan shell scripting, Node.js, atau Docker membantu tergantung pada jenis action yang dibangun.

## Prasyarat

- Akun GitHub dan repositori dengan GitHub Actions yang diaktifkan.
- Pemahaman dasar tentang workflow GitHub Actions (jobs, steps, trigger `on`).
- Untuk JavaScript actions: Node.js 16+ dan npm terinstal secara lokal.
- Untuk Docker container actions: Docker Desktop atau Docker Engine terinstal secara lokal.
- Untuk composite actions: nyaman dengan shell scripting dan YAML.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Memahami tiga jenis GitHub Actions kustom dan kapan menggunakan masing-masing.
- Membuat composite action yang membungkus beberapa langkah workflow menjadi satu unit yang dapat digunakan kembali.
- Membangun JavaScript action dengan Node.js menggunakan toolkit `@actions/core`.
- Mengemas Docker container action untuk eksekusi yang dapat direproduksi dan tidak tergantung bahasa.
- Menangani input, output, dan error dengan benar di semua jenis action.
- Menguji action kustom secara lokal dengan `act` (emulator GitHub Actions runner).
- Memberi versi dan mempublikasikan action ke GitHub Marketplace.

## Konteks dan Motivasi

### Mengapa Membangun Action Kustom?

Action bawaan dari Marketplace mencakup tugas-tugas umum (checkout, setup-node, cache), tetapi proyek Anda pasti mengembangkan pola otomatisasi yang unik. Alih-alih menyalin-tempel urutan lima langkah yang sama di puluhan workflow, Anda mengekstraknya menjadi action yang dapat digunakan kembali. Manfaatnya meliputi:

- **Workflow yang DRY**: Satu baris `uses:` menggantikan blok langkah yang berulang.
- **Enkapsulasi**: Logika kompleks, penanganan error, dan kasus tepi berada di satu tempat yang terawat.
- **Versioning**: Konsumen mengunci ke `@v1`, `@v2`, dan Anda mengirimkan peningkatan secara independen.
- **Berbagi dengan komunitas**: Action publik bermanfaat bagi seluruh ekosistem GitHub.

### Ringkasan Jenis Action

| Tipe | Runtime | Terbaik Untuk |
|------|---------|---------------|
| **Composite** | Perintah shell + langkah GitHub Actions | Membungkus urutan multi-langkah, menginstal alat, orkestrasi bersyarat |
| **JavaScript** | Node.js (di-host runner) | Action dengan logika berat: panggilan API, pemrosesan file, kondisional kompleks |
| **Docker Container** | Image Docker kustom | Eksekusi tidak tergantung bahasa, lingkungan yang dapat direproduksi, alat yang tidak tersedia di runner |

## Konten Inti

### 1. Anatomi Sebuah Action Kustom

Setiap GitHub Action didefinisikan oleh file `action.yml` (atau `action.yaml`) di root repositorinya (atau subdirektori). File metadata ini mendeklarasikan:

```yaml
name: 'My Action'
description: 'Apa yang dilakukan action ini'
author: 'Nama Anda'
branding:
  icon: 'activity'
  color: 'blue'
inputs:
  my-input:
    description: 'Parameter input'
    required: true
    default: 'nilai-bawaan'
outputs:
  my-output:
    description: 'Nilai output'
runs:
  using: 'composite'  # atau 'node20' atau 'docker'
  # ... konfigurasi spesifik tipe
```

Ketiga jenis action berbagi struktur tingkat atas ini. Blok `runs` yang membedakannya.

### 2. Composite Actions

Composite actions memungkinkan Anda menggabungkan beberapa langkah `run` dan action lain ke dalam satu unit yang dapat digunakan kembali. Ini adalah jenis yang paling sederhana untuk dibuat dan tidak memerlukan alat build.

#### Struktur Direktori Composite Action

```text
my-composite-action/
├── action.yml
└── README.md
```

#### Contoh: Composite Action untuk Linting

Buat `action.yml`:

```yaml
name: 'Lint and Format Checker'
description: 'Menjalankan pemeriksaan ESLint dan Prettier pada proyek Node.js'
author: 'Org Anda'
branding:
  icon: 'check-circle'
  color: 'green'
inputs:
  working-directory:
    description: 'Direktori yang berisi proyek'
    required: false
    default: '.'
runs:
  using: 'composite'
  steps:
    - name: Install Dependencies
      shell: bash
      run: |
        cd ${{ inputs.working-directory }}
        npm ci

    - name: Run ESLint
      shell: bash
      run: |
        cd ${{ inputs.working-directory }}
        npx eslint .

    - name: Run Prettier Check
      shell: bash
      run: |
        cd ${{ inputs.working-directory }}
        npx prettier --check .
```

Gunakan dalam workflow:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: ./.github/actions/lint-checker
        with:
          working-directory: './packages/web-app'
```

#### Praktik Terbaik Composite Action

- **Selalu tentukan `shell:`** — langkah composite tidak memiliki shell secara bawaan, jadi jangan dihilangkan kecuali untuk langkah `uses:`.
- **Berikan input secara eksplisit** — composite actions tidak mewarisi input tingkat workflow secara implisit.
- **Gunakan `${{ inputs.* }}`** — composite actions mereferensikan input secara berbeda dari JavaScript/Docker actions.
- **Jaga langkah tetap fokus** — setiap langkah harus memiliki satu tanggung jawab.

### 3. JavaScript Actions

JavaScript actions berjalan sebagai skrip Node.js pada runner yang di-host. Mereka memiliki akses ke paket `@actions/core` dan `@actions/github` untuk berinteraksi dengan konteks workflow.

#### Struktur Direktori JavaScript Action

```text
my-js-action/
├── action.yml
├── package.json
├── index.js
└── README.md
```

#### Persiapan

Inisialisasi proyek Node.js dan instal toolkit:

```bash
npm init -y
npm install @actions/core @actions/github
```

#### Contoh: Action Pengurut Label

`action.yml`:

```yaml
name: 'Issue Label Sorter'
description: 'Memvalidasi dan mengurutkan label issue terhadap daftar yang telah ditentukan'
author: 'Org Anda'
branding:
  icon: 'tag'
  color: 'blue'
inputs:
  github-token:
    description: 'Token GitHub untuk akses API'
    required: true
  allowed-labels:
    description: 'Daftar label yang diizinkan, dipisahkan koma'
    required: false
    default: 'bug,enhancement,documentation,question'
outputs:
  valid:
    description: 'Apakah semua label valid (true/false)'
runs:
  using: 'node20'
  main: 'index.js'
```

`index.js`:

```javascript
const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const allowedRaw = core.getInput('allowed-labels');
    const token = core.getInput('github-token');
    const allowed = allowedRaw.split(',').map(l => l.trim().toLowerCase());

    const context = github.context;
    const octokit = github.getOctokit(token);

    // Ambil label dari issue atau PR
    const labels = context.payload.issue?.labels
      || context.payload.pull_request?.labels
      || [];

    if (labels.length === 0) {
      core.setOutput('valid', 'true');
      core.info('Tidak ada label untuk divalidasi — dilewati.');
      return;
    }

    const invalidLabels = labels.filter(
      l => !allowed.includes(l.name.toLowerCase())
    );

    if (invalidLabels.length > 0) {
      core.setFailed(
        `Label tidak valid ditemukan: ${invalidLabels.map(l => l.name).join(', ')}`
      );
      core.setOutput('valid', 'false');
      return;
    }

    core.setOutput('valid', 'true');
    core.info('Semua label valid.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

#### Input, Output, dan Utilitas Inti

Paket `@actions/core` menyediakan fungsi-fungsi penting:

```javascript
const core = require('@actions/core');

// Membaca input
const name = core.getInput('name', { required: true });
const config = core.getInput('config-file');
const debugMode = core.getBooleanInput('debug');

// Mengatur output
core.setOutput('report-path', '/tmp/report.json');
core.setOutput('summary', 'Build selesai dengan sukses.');

// Logging dengan level
core.debug('Informasi debug detail');
core.info('Pesan informasional normal');
core.warning('Pesan peringatan', { title: 'Depresiasi' });
core.error('Pesan error');

// Menggagalkan action
core.setFailed('Build gagal: tes tidak lulus');

// Mengelompokkan baris log
core.startGroup('Install Dependencies');
console.log('output npm install...');
core.endGroup();

// Mengekspor variabel untuk langkah selanjutnya
core.exportVariable('MY_VAR', 'nilai');
core.setSecret('nilai-rahasia-saya');  // Disamarkan di log
```

#### Mengakses Konteks GitHub

Paket `@actions/github` memberikan Anda payload event lengkap:

```javascript
const github = require('@actions/github');

// Konteks saat ini
console.log(github.context.action);       // misalnya, 'opened'
console.log(github.context.eventName);    // misalnya, 'issues'
console.log(github.context.sha);          // commit SHA
console.log(github.context.ref);          // 'refs/heads/main'
console.log(github.context.actor);        // username pengguna yang memicu

// Klien Octokit (terautentikasi)
const octokit = github.getOctokit(token);
const { data: issue } = await octokit.rest.issues.get({
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  issue_number: 42
});
```

### 4. Docker Container Actions

Docker container actions berjalan di dalam image Docker kustom. Gunakan ketika action Anda membutuhkan dependensi sistem spesifik, runtime bahasa tertentu, atau harus berperilaku identik di OS runner mana pun.

#### Struktur Direktori Docker Action

```text
my-docker-action/
├── action.yml
├── Dockerfile
├── entrypoint.sh
└── README.md
```

#### Contoh: Action Lint Terraform

`Dockerfile`:

```dockerfile
FROM alpine:3.19

RUN apk add --no-cache terraform-doc

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

`entrypoint.sh`:

```bash
#!/bin/sh
set -e

# Validasi input yang diperlukan
if [ -z "$INPUT_DIRECTORY" ]; then
  echo "Error: input directory diperlukan"
  exit 1
fi

cd "$INPUT_DIRECTORY"

echo "Menjalankan pemeriksaan terraform fmt..."
terraform fmt -check -recursive .
echo "Pemeriksaan format Terraform berhasil."
```

`action.yml`:

```yaml
name: 'Terraform Format Checker'
description: 'Memeriksa format file Terraform menggunakan runtime Alpine yang konsisten'
author: 'Org Anda'
branding:
  icon: 'terminal'
  color: 'purple'
inputs:
  directory:
    description: 'Direktori yang berisi file Terraform'
    required: true
    default: '.'
runs:
  using: 'docker'
  image: 'Dockerfile'
  env:
    INPUT_DIRECTORY: ${{ inputs.directory }}
```

#### Arsitektur Docker Action

| Komponen | Tujuan |
|----------|--------|
| `Dockerfile` | Mendefinisikan lingkungan. Kunci versi base image untuk reprodusibilitas. |
| `entrypoint.sh` | Skrip yang berjalan saat container dimulai. Harus menangani input melalui variabel lingkungan. |
| `action.yml` bidang `image:` | Dapat mereferensikan `Dockerfile` (build lokal), URL registry, atau image Docker Hub. |

**Perbedaan utama dari composite dan JavaScript actions:**

- Input diteruskan sebagai **variabel lingkungan** dengan prefiks `INPUT_` (misalnya, `directory` menjadi `INPUT_DIRECTORY`).
- Entrypoint harus menangani ekspansi variabel `INPUT_` — ini tidak otomatis.
- Container actions hanya berjalan di runner Linux (runner macOS dan Windows tidak dapat menjalankan container Docker).

### 5. Menguji Action Kustom secara Lokal

Alat `act` menjalankan workflow GitHub Actions secara lokal menggunakan Docker:

```bash
# Install act
curl -fsSL https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Uji workflow yang menggunakan action kustom Anda
act -j lint --reuse

# Dengan payload event tertentu
act issue_opened -e .github/issue-event.json

# Menggunakan token GitHub tertentu (token sering diperlukan untuk akses API)
act -s GITHUB_TOKEN="ghp_xxxx"
```

Untuk JavaScript actions secara khusus, Anda juga dapat menulis unit test:

```bash
npm install --save-dev jest
```

```javascript
// index.test.js
const core = require('@actions/core');

jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test', repo: 'test' },
    payload: { issue: { labels: [{ name: 'bug' }] } }
  },
  getOctokit: jest.fn()
}));

describe('Label Sorter Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('berhasil ketika label valid', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'allowed-labels') return 'bug,enhancement,docs';
      if (name === 'github-token') return 'fake-token';
    });

    await require('./index');

    expect(core.setOutput).toHaveBeenCalledWith('valid', 'true');
  });

  it('gagal ketika label tidak valid', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'allowed-labels') return 'bug,enhancement';
      if (name === 'github-token') return 'fake-token';
    });

    await require('./index');

    expect(core.setFailed).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('valid', 'false');
  });
});
```

### 6. Versioning dan Publikasi

#### Semantic Versioning dengan Tag

GitHub Actions mengenali tiga format tag untuk penguncian versi:

```bash
# Buat rilis
git tag -a v1.0.0 -m "Rilis awal"
git push origin v1.0.0

# Perbarui tag versi utama untuk menunjuk ke rilis ini
git tag -f v1 v1.0.0
git push origin v1 --force
```

Pengguna mengunci ke `@v1` untuk menerima pembaruan patch secara otomatis sambil menghindari perubahan yang merusak.

#### Publikasi ke GitHub Marketplace

1. Pastikan action Anda memiliki `README.md` dengan dokumentasi yang jelas.
2. Buka halaman **Releases** repositori Anda dan buat rilis baru.
3. GitHub secara otomatis mendeteksi `action.yml` dan menawarkan untuk **Publish this Action to the Marketplace**.
4. Tambahkan file `LICENSE` (MIT, Apache-2.0, dll.) — Marketplace mewajibkannya.

**Praktik terbaik untuk action Marketplace:**

- Sertakan `README.md` dengan contoh penggunaan, tabel input/output, dan cuplikan workflow.
- Atur `branding.icon` dan `branding.color` di `action.yml` untuk tampilan Marketplace.
- Ikuti semantic versioning secara ketat.
- Uji di beberapa OS runner jika memungkinkan.

## Contoh Kode

### Composite Action Lengkap: Setup dan Cache Alat

`action.yml`:

```yaml
name: 'Setup and Cache Tool'
description: 'Menginstal alat CLI dan menyimpannya di cache antar eksekusi workflow'
author: 'Org Anda'
branding:
  icon: 'package'
  color: 'orange'
inputs:
  tool-name:
    description: 'Nama alat yang akan diinstal'
    required: true
  install-script:
    description: 'Perintah shell untuk menginstal alat'
    required: true
  cache-path:
    description: 'Path untuk cache (biasanya direktori instalasi)'
    required: true
runs:
  using: 'composite'
  steps:
    - name: Restore Cached Tool
      id: cache
      uses: actions/cache@v4
      with:
        path: ${{ inputs.cache-path }}
        key: ${{ runner.os }}-${{ inputs.tool-name }}-${{ hashFiles('**/lockfiles') }}

    - name: Install Tool
      if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      run: ${{ inputs.install-script }}

    - name: Verify Installation
      shell: bash
      run: ${{ inputs.tool-name }} --version
```

### JavaScript Action Lengkap: Pemberi Komentar PR

`action.yml`:

```yaml
name: 'PR Commenter'
description: 'Memposting komentar berformat pada pull request dengan informasi ringkasan build'
author: 'Org Anda'
branding:
  icon: 'message-square'
  color: 'gray'
inputs:
  github-token:
    description: 'Token GitHub'
    required: true
  message:
    description: 'Pesan untuk diposting sebagai komentar'
    required: true
runs:
  using: 'node20'
  main: 'index.js'
```

`index.js`:

```javascript
const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const message = core.getInput('message');
    const token = core.getInput('github-token');
    const octokit = github.getOctokit(token);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.warning('Bukan event pull request — melewati komentar.');
      return;
    }

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body: `## Ringkasan Build\n\n${message}\n\n---\n*Diposting oleh PR Commenter action*`
    });

    core.info('Komentar berhasil diposting.');
  } catch (error) {
    core.setFailed(`Gagal memposting komentar: ${error.message}`);
  }
}

run();
```

## Insight Penting

- **Composite actions adalah yang paling sederhana untuk dibuat dan dirawat** — gunakan sebagai pilihan bawaan. Gunakan JavaScript atau Docker hanya ketika Anda membutuhkan kondisional, perulangan, atau dependensi runtime spesifik.
- **Selalu kunci versi action dengan tag utama** — pengguna mengunci `@v1` untuk stabilitas. Gunakan `git tag -f v1 v1.0.1` untuk mendorong pembaruan patch tanpa merusak konsumen.
- **Tangani input secara eksplisit** — JavaScript actions menggunakan `core.getInput()`, composite actions menggunakan `${{ inputs.* }}`, dan Docker actions membaca variabel lingkungan `INPUT_*`. Jangan mencampur pola.
- **Uji secara lokal sebelum mendorong** — `act` menangkap error kutipan shell, input yang hilang, dan masalah izin yang seharusnya membuang menit CI dalam lingkaran debugging.
- **Docker actions hanya untuk Linux** — eksekutor Docker GitHub Actions hanya didukung di runner `ubuntu-*`. Jika konsumen Anda menggunakan runner macOS atau Windows, gunakan composite atau JavaScript actions.
- **Jaga `action.yml` tetap mendokumentasikan diri sendiri** — kolom `description` yang teliti dan flag `required` yang eksplisit memudahkan orang lain (dan Anda di masa depan) untuk menggunakan action dengan benar.

## Langkah Berikutnya

- Pelajari pola orkestrasi workflow lanjutan di [Panduan Praktik Terbaik CI/CD GitHub Actions](../guides/github-actions-cicd-best-practices-guide.md).
- Jelajahi reusable workflow untuk memanggil file workflow utuh dari repositori lain.
- Coba [Silabus DevOps GitHub Actions 12 Minggu](../syllabi/github-actions-devops-syllabus.md) untuk jalur pembelajaran terstruktur.
- Lihat [referensi cepat struktur workflow](../cheatsheets/github-actions-cheatsheet.md) untuk pengingat sintaks.

## Kesimpulan

GitHub Actions kustom mengubah workflow CI/CD Anda dari salin-tempel berulang menjadi komponen otomatisasi modular, berversi, dan dapat dibagikan. Anda sekarang tahu cara membangun ketiga jenis action — composite, JavaScript, dan Docker container — serta cara menguji, memberi versi, dan mempublikasikannya. Mulailah dengan mengidentifikasi pola dalam workflow Anda sendiri yang berulang di beberapa repositori, ekstrak menjadi composite action, dan iterate dari sana.

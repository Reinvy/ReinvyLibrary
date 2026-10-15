---
title: "Panduan Migrasi CI/CD ke GitHub Actions"
description: "Playbook praktis untuk memindahkan pipeline CI/CD dari Jenkins, GitLab CI, dan CircleCI ke GitHub Actions — pemetaan konsep, penerjemahan workflow, peralihan kredensial ke OIDC, paritas caching dan artifact, shadow build, serta jalur dekomisioning yang aman."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Migrasi CI/CD ke GitHub Actions

## Pendahuluan

Sebagian besar tim yang mengadopsi GitHub Actions tidak memulai dari lembar kosong — mereka datang dengan definisi pipeline yang sudah berjalan bertahun-tahun di Jenkins, GitLab CI, atau CircleCI. Pipeline tersebut menyimpan pengetahuan institusional: tes mana yang menjadi gerbang untuk branch mana, bagaimana artifact dipromosikan, kredensial apa yang dibutuhkan sebuah deploy, dan kegagalan seperti apa yang masih ditoleransi. Migrasi yang memperlakukan pipeline lama sebagai masalah sintaks untuk ditulis ulang biasanya kehilangan pengetahuan itu dan menghasilkan sistem CI/CD yang diam-diam lebih lemah.

Panduan ini memperlakukan migrasi sebagai latihan penerjemahan dan verifikasi. Anda akan memetakan konsep alih-alih menyalin YAML, membangun ulang kredensial pada model identitas OIDC GitHub alih-alih memindahkan secret berumur panjang, mereproduksi semantik caching dan artifact secara sengaja, serta membuktikan paritas dengan shadow build sebelum sistem lama dimatikan. Sasaran pembacanya adalah engineer yang memelihara pipeline produksi dan membutuhkan cutover yang bisa di-rollback.

Tiga platform sumber dibahas karena celah semantiknya berbeda secara penting: Jenkins menawarkan DSL Groovy imperatif dengan workspace persisten, GitLab CI menawarkan model YAML deklaratif dengan DAG kelas satu, dan CircleCI menawarkan orb yang dapat dipakai ulang dengan workspace berlingkup workflow. Masing-masing dipetakan ke GitHub Actions dengan cara berbeda, dan masing-masing menyembunyikan jebakan yang berbeda.

## Praktik Terbaik

### 1. Inventarisasi dan Urutkan Pipeline Sebelum Menulis YAML Apa Pun

Migrasi gagal ketika dimulai dari pipeline paling rumit. Mulailah dengan inventaris tertulis berisi setiap pipeline yang berjalan di platform tersebut, dilengkapi jenis trigger, durasi, jumlah job, integrasi eksternal, dan radius dampaknya. Lalu urutkan berdasarkan risiko dan migrasikan sesuai urutan itu — job linter terjadwal mingguan adalah kandidat pertama yang benar, bukan jalur rilis produksi.

Inventaris ini juga membuka duplikasi. Job Jenkins sering kali merupakan salinan bercabang satu sama lain, dan rantai `include` GitLab sering mengarah ke hidden job yang hampir identik. Menyatukan lima pipeline yang nyaris duplikat menjadi satu reusable workflow adalah keuntungan nyata yang akan hilang jika Anda menerjemahkan satu per satu.

### 2. Petakan Konsep, Bukan Sintaks

Sebelum menerjemahkan satu file pun, tulis tabel pemetaan untuk platform sumber. Penerjemahan baris per baris menghasilkan workflow yang berperilaku seperti pipeline asing yang memakai pakaian YAML GitHub — asumsi workspace persisten, urutan implisit, dan konvensi caching buatan sendiri semuanya ikut bocor.

Setiap platform memiliki sekumpulan kecil konsep penopang: bagaimana pekerjaan diparalelkan, bagaimana state berpindah antar job, bagaimana secret disuntikkan, dan bagaimana persetujuan ditegakkan. Terjemahkan keempatnya secara sengaja dan sintaksnya akan mengikuti dengan sendirinya.

### 3. Migrasikan Pipeline Referensi Terlebih Dahulu

Pilih satu pipeline representatif — idealnya yang memiliki tes, artifact build, dan deploy — lalu migrasikan menyeluruh: caching, artifact, secret, gerbang, notifikasi. Gunakan pipeline itu sebagai templat untuk sisanya. Tim yang memigrasikan sepuluh pipeline sekaligus berakhir dengan sepuluh workflow yang sedikit berbeda dan tanpa konvensi bersama untuk dipakai ulang.

Setelah pipeline referensi hijau dan dipercaya, ekstrak blok yang berulang menjadi reusable workflow (`workflow_call`) dan composite action agar migrasi berikutnya hanya perlu merakit.

### 4. Bangun Ulang Kredensial dengan OIDC, Jangan Pindahkan Secret Statis

Perubahan dengan daya ungkit terbesar selama migrasi adalah menolak memindahkan kredensial cloud statis. Jenkins credentials store, variabel CI/CD bertopeng GitLab, dan konteks CircleCI semuanya membawa kunci berumur panjang yang hanya ada karena platform tersebut tidak punya pilihan lebih baik. GitHub Actions dapat meminta token OIDC berumur pendek dan menukarnya menjadi kredensial cloud yang dibatasi pada repository, branch, dan environment tertentu.

Memigrasikan kredensial apa adanya akan menanam utang rotasi kunci bertahun-tahun di dalam sistem baru. Memigrasikannya ke OIDC menghapus kuncinya sama sekali. Perlakukan setiap secret statis yang tetap dipindahkan sebagai pengecualian yang disengaja, dengan pemilik dan tanggal kedaluwarsa.

### 5. Buat Ulang Caching dari Awal — Cache Key Tidak Portabel

Cache key dari platform lain tidak bermakna di GitHub Actions karena namespace cache, penurunan key, dan aturan eviction-nya berbeda. `cache:key: $CI_COMMIT_REF_SLUG` milik GitLab dan perhitungan checksum milik CircleCI tidak punya padanan langsung; bentuk idiomatik GitHub adalah `hashFiles` yang digabung ke dalam key yang juga memuat OS dan versi runtime.

Syarat kebenarannya lebih ketat daripada syarat performa: cache key yang terlalu kasar lintas sistem operasi atau versi Node menghasilkan restore rusak yang muncul sebagai kegagalan build yang sulit dijelaskan. Selalu sertakan `runner.os` dan versi toolchain di dalam key, dan biarkan `restore-keys` menangani fallback secara halus.

### 6. Buat Paralelisme Eksplisit dengan `needs` dan Matrix

`stages` dan `needs` GitLab, blok `parallel` Jenkins, serta `requires` CircleCI semuanya menyatakan urutan, tetapi GitHub Actions mengharapkan Anda mendeklarasikannya lewat `needs` dan menyatakan fan-out lewat `strategy.matrix`. Jangan mengodekan urutan secara implisit melalui awalan nama job — pengurutan implisit tak terlihat di tampilan graf dan langsung rusak saat job diganti nama.

Job matrix juga merupakan pengganti yang benar untuk `parallelism` bernama `circleci tests split`: pecah test suite berdasarkan indeks sehingga setiap leg matrix menjalankan potongan yang deterministik, lalu agregasikan hasilnya di job lanjutan.

### 7. Reproduksi Quality Gate dan Persetujuan dengan Environment

Langkah `input` Jenkins, job `when: manual` GitLab, dan approval job CircleCI semuanya mengimplementasikan ide yang sama: gerbang manusia sebelum aksi yang terlindungi. Di GitHub Actions, ini adalah Environment terproteksi dengan required reviewer, dipadukan dengan `workflow_dispatch` untuk memulai secara sengaja.

Environment secara tegas lebih baik karena satu alasan — secret baru dilepaskan ke job setelah gerbang disetujui. Migrasi adalah momen yang tepat untuk memindahkan secret deploy dari lingkup repository ke lingkup environment, sehingga workflow yang terkompromi hanya menyentuh satu environment alih-alih seluruh organisasi.

### 8. Jalankan Shadow Build Sebelum Cutover

Pipeline hasil migrasi yang belum pernah dibandingkan dengan aslinya adalah pipeline yang belum terverifikasi. Jalankan kedua sistem pada commit yang sama selama satu periode — pipeline lama sebagai sumber kebenaran, workflow GitHub Actions sebagai pengamat — lalu bandingkan hasilnya: jumlah tes, checksum artifact, durasi, dan exit code.

Mode shadow murah karena tidak memblokir apa pun, dan ia menangkap mode kegagalan yang tidak bisa ditangkap review kode: celah semantik seperti default penanganan error shell yang berbeda, variabel environment yang hilang, atau tes yang diam-diam terlewat saat service container tidak ada.

### 9. Pertahankan Sistem Lama Sampai Rollback Terbukti

Nonaktifkan sistem lama hanya setelah jendela observasi yang jelas dengan pipeline baru sebagai gerbang resmi. Simpan konfigurasi lama di version control (atau branch arsip) alih-alih menghapusnya, dan dokumentasikan prosedur rollback persisnya — status check wajib mana yang harus dipulihkan, webhook mana yang harus diaktifkan kembali, dan siapa yang dapat mengeksekusi rollback.

Menghapus controller Jenkins atau mencabut project GitLab pada hari cutover berarti menghapus satu-satunya cadangan Anda ketika jalur rilis gagal pukul 02.00.

### 10. Ukur Migrasi dengan Metrik DORA

Catat empat angka sebelum dan sesudah migrasi: frekuensi deployment, lead time perubahan, change failure rate, dan waktu pemulihan layanan. Tanpa baseline sebelum dan sesudah, "migrasinya berjalan lancar" hanyalah pendapat, bukan temuan.

Metrik ini juga membenarkan pekerjaan lanjutan. Migrasi umumnya langsung memperbaiki lead time (runner lebih cepat, caching lebih baik), sementara change failure rate baru membaik setelah gerbang dan paritas tes benar-benar direproduksi — mengetahui mana yang mana memberi tahu Anda di mana harus terus berinvestasi.

## Langkah Implementasi

### Langkah 1: Inventarisasi dan Klasifikasikan Pipeline

Ekspor definisi pipeline yang ada dan klasifikasikan satu per satu. Untuk Jenkins, daftarkan setiap job dari API controller dan catat mana yang freestyle dan mana yang pipeline. Untuk GitLab, urai `.gitlab-ci.yml` beserta graf `include`-nya. Untuk CircleCI, enumerasi job dan workflow di `.circleci/config.yml`.

```bash
# Jenkins: daftar job dan tipenya
curl -s "https://jenkins.example.com/api/json?tree=jobs[name,url,_class]" \
  --user "$JENKINS_USER:$JENKINS_TOKEN" > /tmp/jenkins-jobs.json
jq -r '.jobs[] | "\(.name)\t\(._class)"' /tmp/jenkins-jobs.json | sort

# GitLab: selesaikan graf include untuk pipeline sebuah proyek
curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/repository/files/.gitlab-ci.yml/raw?ref=main" \
  > /tmp/gitlab-ci.yml
grep -n "include:\|extends:\|stage:" /tmp/gitlab-ci.yml

# CircleCI: daftar nama workflow dan job di dalamnya
curl -s --header "Circle-Token: $CIRCLECI_TOKEN" \
  "https://circleci.com/api/v2/config/validate" > /dev/null
python3 -c "
import yaml, sys
cfg = yaml.safe_load(open('.circleci/config.yml'))
for wf, node in cfg.get('workflows', {}).items():
    jobs = [k for k in node.get('jobs', []) if k != 'version']
    print(wf, '->', ', '.join(jobs))
" > /tmp/circleci-workflows.txt
cat /tmp/circleci-workflows.txt
```

1. Catat untuk setiap pipeline: trigger (push, jadwal, manual, tag), perkiraan durasi, jumlah job, layanan eksternal, dan apakah ia melakukan deploy ke produksi.
2. Tandai pipeline dengan radius dampak terkecil dan memiliki tahap tes sebagai kandidat migrasi referensi.
3. Catat setiap kredensial yang dipakai pipeline tersebut dan apakah cloud tujuannya mendukung federasi OIDC.

### Langkah 2: Susun Tabel Pemetaan Konsep

Tulis tabel pemetaan untuk platform sumber Anda ke dalam branch migrasi sebagai dokumen yang bisa ditinjau tim. Tabel di bawah adalah baseline Jenkins; tabel GitLab dan CircleCI mengikuti bentuk yang sama.

```text
| Jenkins concept                | GitHub Actions equivalent                     |
|--------------------------------|-----------------------------------------------|
| Jenkinsfile (declarative)      | .github/workflows/<name>.yml                  |
| stage('Build')                 | a job in jobs.<id>                            |
| steps { sh '...' }             | steps: with a run: entry                      |
| agent { label 'linux' }        | runs-on: [self-hosted, linux]                 |
| environment { FOO = 'bar' }    | env: at workflow, job, or step level          |
| when { branch 'main' }         | if: github.ref == 'refs/heads/main'           |
| parallel { stage('A') ... }    | strategy.matrix or sibling jobs with needs    |
| post { always { ... } }        | a step with if: always()                      |
| post { failure { ... } }       | a step with if: failure()                     |
| withCredentials(...)           | secrets plus OIDC token exchange              |
| archiveArtifacts               | actions/upload-artifact                       |
| stash / unstash                | upload-artifact then download-artifact        |
| input message: 'Deploy?'       | Environment with required reviewers           |
| build cause / upstream job     | workflow_run or repository_dispatch trigger   |
| Jenkins cron schedule          | on.schedule with UTC cron syntax              |
```

1. Untuk GitLab, baris penopangnya adalah `stages` dan `needs` (menjadi `needs`), `cache:key` (menjadi `actions/cache` dengan `hashFiles`), `extends` (menjadi reusable workflow), `services:` (menjadi `services:`), dan `environment:` (menjadi Environment).
2. Untuk CircleCI, baris penopangnya adalah `orbs` (menjadi composite action atau reusable workflow), `persist_to_workspace` dan `attach_workspace` (menjadi upload-artifact dan download-artifact), `parallelism` (menjadi `strategy.matrix`), dan `contexts` (menjadi Environment).
3. Tinjau setiap baris bersama orang yang memiliki pipeline lama — perbedaan pendapat yang muncul di sini justru adalah celah semantik yang nantinya akan ditemukan shadow build.

### Langkah 3: Terjemahkan Pipeline Referensi

Terjemahkan pipeline referensi sebagai graf job yang eksplisit. Contoh berikut mengubah pipeline Jenkins yang melakukan lint, tes, build container, dan deploy ke produksi di balik gerbang manual.

```groovy
// Jenkinsfile (sebelum)
pipeline {
  agent { label 'linux' }
  environment { REGISTRY = 'ghcr.io/acme' }
  stages {
    stage('Verify') {
      when { branch 'main' }
      steps {
        sh 'npm ci'
        sh 'npm run lint'
        sh 'npm test -- --ci'
      }
    }
    stage('Build') {
      steps {
        sh 'docker build -t $REGISTRY/api:$GIT_COMMIT .'
        archiveArtifacts artifacts: 'dist/**', fingerprint: true
      }
    }
    stage('Deploy') {
      input { message 'Deploy to production?' }
      steps {
        withCredentials([string(credentialsId: 'prod-key', variable: 'PROD_KEY')]) {
          sh 'scripts/deploy.sh'
        }
      }
    }
  }
  post {
    failure { sh 'scripts/notify.sh failed' }
  }
}
```

```yaml
# .github/workflows/reference-pipeline.yml (sesudah)
name: Reference Pipeline

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write
  packages: write

env:
  REGISTRY: ghcr.io/acme

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --ci

  build:
    needs: verify
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.meta.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - id: meta
        run: echo "image=$REGISTRY/api:${GITHUB_SHA}" >> "$GITHUB_OUTPUT"
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ${{ steps.meta.outputs.image }}
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 14

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.example.com
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gha-prod-deploy
          aws-region: ap-southeast-1
      - run: scripts/deploy.sh "${{ needs.build.outputs.image }}"

  notify:
    needs: [verify, build, deploy]
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - run: scripts/notify.sh failed
```

1. Perhatikan bahwa penjaga `when { branch 'main' }` pada satu stage Jenkins menjadi filter `on.push.branches` di tingkat workflow — menurunkan kondisi tingkat stage ke trigger biasanya penerjemahan yang lebih bersih.
2. Perhatikan bahwa gerbang `input` Jenkins menjadi Environment dengan required reviewer, yang sekaligus memindahkan kredensial deploy keluar dari lingkup repository.
3. Perhatikan bahwa `post { failure { ... } }` menjadi job dengan `needs: [verify, build, deploy]` dan `if: failure()` — GitHub Actions tidak punya langkah yang otomatis selalu berjalan, jadi notifikasi kegagalan harus menjadi job tersendiri.

### Langkah 4: Migrasikan Kredensial ke OIDC dan Environment

Ubah setiap kredensial yang dipindahkan menjadi relasi kepercayaan OIDC atau secret GitHub yang berlingkup. Mulailah dari penyedia cloud, karena OIDC menghapus beban rotasi secara keseluruhan.

```yaml
# Pola pertukaran OIDC yang dapat dipakai ulang, diparameterkan per environment
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          role-session-name: gha-${{ github.run_id }}
          aws-region: ${{ vars.AWS_REGION }}
```

1. Buat satu role cloud per environment alih-alih satu role per repository, dan batasi trust policy-nya pada klaim repository, branch, dan environment.
2. Ganti `secrets.*` dengan `vars.*` untuk konfigurasi tidak sensitif seperti ARN role dan region; variabel dapat dibaca di log dan membuat kesalahan konfigurasi langsung terlihat.
3. Untuk kredensial yang tidak dapat memakai OIDC, simpan sebagai environment secret alih-alih repository secret agar gerbang persetujuan mengendalikan pelepasannya.
4. Rotasi setiap secret statis yang dimigrasikan sekali saat cutover, supaya nilai yang ada di platform lama sudah mati saat platform lama dinonaktifkan.

### Langkah 5: Pindahkan Caching, Artifact, dan Layer Docker

Bangun ulang caching secara sengaja, dengan key yang memuat semua hal yang membatalkan validitas konten yang di-cache.

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: npm-${{ runner.os }}-node${{ matrix.node }}-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            npm-${{ runner.os }}-node${{ matrix.node }}-
      - run: npm ci
      - run: npm test -- --ci --shard=${{ strategy.job-index + 1 }}
```

1. Sertakan `runner.os` dan versi runtime di setiap cache key — menghilangkan salah satunya menghasilkan restore lintas platform yang gagal dengan gejala mirip tes tidak stabil.
2. Gunakan `restore-keys` untuk degradasi yang halus alih-alih satu key eksak, yang merupakan padanan terdekat dari daftar fallback key CircleCI.
3. Ganti `stash` dan `unstash` dengan `upload-artifact` dan `download-artifact`; ingat bahwa artifact berlingkup workflow secara default dan butuh `needs` untuk menjamin ketersediaannya.
4. Pertahankan caching layer Docker dengan `docker/build-push-action` beserta pasangan `cache-from` dan `cache-to` yang menunjuk ke registry, yang merupakan pengganti portabel untuk daemon Docker bersama milik Jenkins.

### Langkah 6: Reproduksi Gerbang, Persetujuan, dan Notifikasi

Bangun ulang permukaan kendali bagi manusia sebelum cutover, karena bagian inilah yang setiap hari disentuh oleh reviewer dan operator.

```yaml
on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: "Tag to release"
        required: true

jobs:
  release:
    runs-on: ubuntu-latest
    environment:
      name: release
      url: https://github.com/${{ github.repository }}/releases
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.release_tag }}
      - run: scripts/release.sh "${{ inputs.release_tag }}"
```

1. Konfigurasikan required reviewer pada setiap Environment terproteksi dan batasi branch mana yang boleh melakukan deploy ke sana, menggantikan `input` Jenkins, `when: manual` GitLab, dan approval job CircleCI.
2. Tambahkan grup `concurrency` yang di-key pada environment dan ref agar run kedua membatalkan atau mengantre alih-alih berlomba dengan yang pertama — ini menggantikan `resource_group` GitLab dan auto-cancel CircleCI.
3. Ubah notifikasi platform menjadi permukaan review native GitHub plus langkah webhook eksplisit, dan pastikan run yang gagal tetap mengirim tepat satu notifikasi.
4. Reproduksi pipeline terjadwal dengan `on.schedule` memakai ekspresi cron UTC, dan konfirmasi pergeseran zona waktu terhadap jadwal lama sebelum dinonaktifkan.

### Langkah 7: Jalankan Shadow Build dan Bandingkan Hasil

Jalankan workflow hasil migrasi pada setiap commit bersama pipeline lama, dengan workflow baru berperan sebagai pengamat yang tidak melakukan deploy.

```bash
# Bandingkan hasil untuk commit yang sama di kedua sistem
LEGACY_RESULT=$(curl -s --user "$JENKINS_USER:$JENKINS_TOKEN" \
  "https://jenkins.example.com/job/api-ci/lastBuild/api/json?tree=result,duration" \
  | jq -r '"\(.result) \(.duration)"')

GHA_RESULT=$(gh run list --workflow=reference-pipeline.yml --limit 1 \
  --json conclusion,createdAt,databaseId \
  | jq -r '.[0] | "\(.conclusion) \(.databaseId)"')

echo "legacy: $LEGACY_RESULT"
echo "github-actions: $GHA_RESULT"
```

1. Bandingkan total tes, bukan hanya status lulus atau gagal — pipeline hasil migrasi yang menjalankan 812 tes sementara pipeline lama menjalankan 840 tes telah diam-diam kehilangan satu suite.
2. Bandingkan checksum artifact untuk build yang reprodusibel, dan perlakukan setiap perbedaan sebagai temuan nyata, bukan noise.
3. Tetapkan default shell secara sengaja. GitHub Actions menjalankan `bash -e` tanpa `pipefail`, sedangkan CircleCI dan banyak runner GitLab memakai `set -eo pipefail`; jika ada skrip yang bergantung pada kegagalan pipe yang berisik, setel `defaults.run.shell: bash -eo pipefail {0}`.
4. Pantau durasi selama dua minggu dan pastikan pipeline baru tidak lebih lambat sebelum ia menjadi gerbang resmi.

### Langkah 8: Cutover, Dekomisioning, dan Pembersihan

Cutover adalah perubahan konfigurasi, bukan perubahan kode. Lakukan secara eksplisit dan dapat dibalik.

1. Daftarkan workflow baru sebagai required status check di branch protection, lalu hapus check lama — dalam urutan itu, agar tidak ada commit yang pernah tidak terjaga.
2. Matikan trigger deploy pipeline lama sambil membiarkan build read-only-nya berjalan satu siklus rilis lagi.
3. Cabut kredensial yang telah dimigrasikan di platform lama dan rotasi setiap secret yang tidak bisa pindah ke OIDC.
4. Arsipkan definisi pipeline lama ke branch bertanggal, beri tag, dan tautkan dari dokumen migrasi agar rollback cukup dengan checkout, bukan proyek arkeologi.
5. Setelah dua siklus rilis bersih, nonaktifkan controller atau project lama dan hapus webhook-nya.

## Langkah Berikutnya

- Ekstrak blok berulang dari pipeline referensi menjadi reusable workflow `workflow_call` dan composite action agar migrasi berikutnya hanya tinggal merakit.
- Terapkan metode migrasi yang sama pada pipeline terjadwal dan operasional, yang risikonya lebih rendah tetapi mudah terlupakan sampai job mingguan diam-diam berhenti berjalan.
- Perkuat pipeline baru dengan pola dari panduan praktik terbaik CI/CD dan pengujian workflow — versioning reusable workflow, desain strategi matrix, dan telemetri.
- Ukur kembali metrik DORA sebulan setelah dekomisioning untuk memastikan migrasi benar-benar memperbaiki pengiriman, bukan sekadar memindahkannya.

## Kesimpulan

Migrasi ke GitHub Actions adalah masalah penerjemahan dengan syarat verifikasi, bukan penulisan ulang YAML. Tim yang berhasil menginventarisasi pipeline lebih dulu, menyusun pemetaan konsep di awal, menerjemahkan satu pipeline referensi secara menyeluruh, lalu membuktikan paritas dengan shadow build sebelum sistem lama kehilangan satu kemampuan pun.

Keputusan yang paling menentukan justru yang tidak dipaksa oleh sintaks: menolak memindahkan kredensial berumur panjang demi OIDC, membangun ulang cache key dari aturan invalidasi alih-alih dari string key lama, memindahkan secret deploy ke Environment bergerbang, dan menyimpan jalur rollback yang teruji sampai jendela observasi ditutup. Tangani hal-hal itu dengan sengaja dan workflow-nya sendiri menjadi hampir mekanis.

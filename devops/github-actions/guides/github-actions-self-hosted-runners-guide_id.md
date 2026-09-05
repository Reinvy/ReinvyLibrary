---
title: "Panduan Self-Hosted Runner GitHub Actions"
description: "Panduan komprehensif untuk menjalankan self-hosted runner GitHub Actions di produksi — perencanaan kapasitas fleet, instalasi, registrasi, label dan runner group, ephemeral runner, auto-scaling dengan actions-runner-controller, penguatan keamanan, pemantauan, dan pemecahan masalah."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Self-Hosted Runner GitHub Actions

## Pendahuluan

GitHub-hosted runner adalah lingkungan eksekusi default untuk GitHub Actions: runner dikelola, dipatch, dan diskalakan oleh GitHub, serta siap digunakan dalam hitungan detik. Bagi banyak tim, ini adalah pilihan yang tepat untuk seluruh beban kerja CI/CD. Namun seiring pipeline berkembang — build yang lebih berat, pekerjaan GPU, akses jaringan privat, persyaratan kepatuhan, atau sekadar tagihan runner-minute bulanan yang semakin besar — lingkungan default mulai terasa seperti batasan.

Self-hosted runner menempatkan lingkungan eksekusi di bawah kendali Anda. Anda yang memilih sistem operasi, arsitektur, perangkat keras, dan lokasi jaringan. Anda menginstal dan mendaftarkan aplikasi runner (`actions-runner`) di mesin, kontainer, atau kluster Kubernetes milik Anda sendiri, dan GitHub mengirimkan pekerjaan workflow ke runner tersebut persis seperti mengirimkannya ke hosted runner. Imbalannya adalah kepemilikan operasional: Anda kini bertanggung jawab atas ketersediaan, keamanan, penskalaan, dan pembaruan.

Panduan ini adalah pembahasan mendalam berorientasi produksi tentang self-hosted runner. Panduan ini mencakup kerangka keputusan kapan self-hosted runner masuk akal, arsitektur fleet runner (label, runner group, ephemeral runner), panduan instalasi dan registrasi lengkap di Linux, ephemeral runner berbasis kontainer, auto-scaling dengan `actions-runner-controller` (ARC) di Kubernetes, penguatan keamanan, serta praktik pemantauan dan pemecahan masalah yang menjaga fleet tetap sehat. Pada akhirnya Anda akan mampu mendesain, men-deploy, dan mengoperasikan fleet self-hosted runner yang aman, elastis, dan dapat diamati.

## Praktik Terbaik

### 1. Gunakan Self-Hosted Runner Hanya Jika Lebih Unggul dari Hosted Runner

Self-hosted runner tidak secara intrinsik lebih baik — hanya lebih baik dalam situasi tertentu. Terapkan kerangka keputusan berikut sebelum berinvestasi pada fleet:

| Situasi | Lingkungan yang direkomendasikan | Alasan |
|---------|----------------------------------|--------|
| CI Linux/macOS standar di x64 | GitHub-hosted | Nol perawatan, siap dalam hitungan detik, tanpa permukaan serangan |
| Build berat (C/C++ besar, bundle monorepo) | Self-hosted dengan VM besar | Biaya per menit lebih baik pada perangkat khusus, cache hangat di disk |
| Pekerjaan GPU (training ML, evaluasi model) | Self-hosted dengan GPU | GitHub-hosted runner tidak memiliki kelas GPU |
| Arsitektur non-x64 (arm64, s390x) | Self-hosted | Tidak ada padanan hosted arm64 atau s390x untuk Actions |
| Pekerjaan yang harus mencapai subnet privat | Self-hosted di dalam VPC | Menghindari manuver NAT/proxy dan biaya egress |
| Kendala residensi data atau kepatuhan | Self-hosted di wilayah yang sama | Data tetap berada di infrastruktur yang Anda kendalikan |
| CI open-source kecil dan jarang | GitHub-hosted | Gratis untuk repositori publik; self-hosted hanya menambah beban |

Tema yang berulang: pilih self-hosted ketika Anda membutuhkan properti perangkat keras, jaringan, arsitektur, atau kepatuhan yang tidak dapat diberikan oleh hosted runner — bukan sekadar untuk menghemat beberapa menit waktu antrean.

### 2. Desain Fleet dengan Label dan Runner Group

Dua mekanisme mengontrol runner mana yang mengeksekusi pekerjaan mana:

- **Label** mengarahkan pekerjaan ke kapabilitas tertentu. Satu runner dapat memiliki banyak label (`self-hosted`, `linux`, `arm64`, `gpu`). Kunci `runs-on` di workflow memilih runner berdasarkan irisan label:
  ```yaml
  jobs:
    build-arm:
      runs-on: [self-hosted, linux, arm64]
    train:
      runs-on: [self-hosted, gpu]
  ```
  Semantik label bersifat AND: pekerjaan berjalan di runner mana pun yang membawa semua label yang tercantum.

- **Runner group** adalah batas tata kelola. Definisikan grup di tingkat organisasi (atau tingkat repositori untuk satu repo), lalu batasi repositori mana yang boleh menggunakannya:
  ```text
  org > Settings > Actions > Runner groups
  - group: linux-prod  (repos: platform/*, data/*)   -> runners: linux-prod-*
  - group: gpu-dev     (repos: ml/*)                 -> runners: gpu-dev-*
  ```
  Runner group mencegah repositori yang tidak terkait mengonsumsi kapasitas dan memberi Anda tempat untuk menegakkan kebijakan akses pada perangkat keras sensitif.

Praktik terbaik: jangan pernah hanya mengandalkan satu grup default. Buat grup khusus tujuan dengan pembatasan repositori eksplisit, dan beri setiap runner label yang menggambarkan kapabilitas sebenarnya — runner berlabel `ubuntu-latest` yang sebenarnya bukan image Ubuntu kanonik akan diam-diam menghasilkan build yang bergantung pada lingkungan.

### 3. Perlakukan Setiap Pekerjaan sebagai Berpotensi Berbahaya

Self-hosted runner sering mengeksekusi kode pihak ketiga: workflow pull request dari fork, action dari marketplace, skrip `npm install`, dan toolchain build. Asumsikan salah satu dari mereka dapat menjalankan perintah arbitrer di runner. Praktik yang sesuai:

- Gunakan **ephemeral runner** untuk apa pun yang mengeksekusi kode yang tidak tepercaya (lihat praktik 4).
- Beri `GITHUB_TOKEN` hak akses paling minimal yang diperlukan per pekerjaan dan batasi dengan `permissions:`.
- Jangan pernah menyimpan kredensial berumur panjang di runner persisten. Gunakan federasi OIDC atau token berumur pendek yang diambil dari secrets manager di dalam pekerjaan.
- Tempatkan runner yang membangun pull request yang tidak tepercaya di segmen jaringan yang sepenuhnya terpisah dari runner yang men-deploy ke produksi.
- Nonaktifkan atau beri gerbang pada input `workflow_dispatch` yang mengalir ke perintah shell — injeksi skrip melalui `${{ github.event.inputs.foo }}` adalah vektor serangan klasik untuk self-hosted runner.

### 4. Utamakan Ephemeral Runner daripada Runner Persisten

Runner persisten menumpuk state: file sisa, penyimpangan lingkungan, kredensial dalam riwayat shell, dan proses yang tidak terlacak. **Ephemeral runner** mendaftar untuk tepat satu pekerjaan, mengeksekusinya, lalu melepas pendaftaran dan menghilang. Image `actions/runner` dari GitHub sendiri dalam kontainer memang dirancang ephemeral.

Opsi deployment, dari isolasi paling sedikit hingga paling banyak:

1. **VM runner persisten** — paling sederhana, isolasi terburuk. Hanya dapat diterima jika runner mengeksekusi kode tepercaya di dalam repo secara eksklusif.
2. **Snapshot VM per pekerjaan** — pulihkan VM ke snapshot bersih sebelum setiap pekerjaan. Isolasi baik, beban tambahan sedang.
3. **Ephemeral runner berbasis kontainer** — satu kontainer per pekerjaan (praktik 5). Standar untuk menjalankan kode yang tidak tepercaya.
4. **Ephemeral runner Kubernetes** — satu Pod per pekerjaan dengan `actions-runner-controller` (praktik 6). Elastisitas dan isolasi terbaik dalam skala besar.

Jika Anda harus menjalankan runner persisten, setidaknya jalankan setiap pekerjaan yang tidak tepercaya di mesin ephemeral terpisah dan jaga pekerjaan deploy di runner persisten khusus dengan akses yang terkunci ketat.

### 5. Skalakan Secara Horizontal, Bukan Vertikal

Penagihan runner-minute tidak berlaku untuk self-hosted runner, tetapi latensi antrean tetap ada: pekerjaan menunggu runner yang tersedia. Primitif penskalaan yang benar adalah **jumlah instance runner**, bukan ukuran masing-masing.

- Pantau kedalaman antrean (`actions/runner` mengekspos status antrean pekerjaan; ARC mengekspos metrik `horizontal_runner_autoscaler`) — lihat praktik 7.
- Skalakan runner berdasarkan permintaan: minimum untuk beban stabil, maksimum untuk lonjakan (misalnya hari rilis), dengan histeresis untuk menghindari flapping.
- Jaga buffer idle kecil (satu atau dua runner) agar run `workflow_dispatch` interaktif tidak menunggu berjam-jam.
- Untuk fleet Kubernetes, gunakan `RunnerDeployment` dengan `HorizontalRunnerAutoscaler` dan skala berdasarkan panjang antrean, bukan CPU — runner yang menunggu pekerjaan tidak mengonsumsi CPU yang berarti, tetapi antrean yang tumbuh berarti pekerjaan terblokir.

### 6. Tempatkan Runner Dekat dengan Sumber Daya yang Diaksesnya

Setiap langkah deployment membutuhkan biaya round-trip jaringan. Tempatkan fleet runner di wilayah yang sama dan, idealnya, di VPC yang sama dengan artefak yang dibangun dan layanan yang di-deploy.

- Jalankan fleet di wilayah cloud yang sama dengan cache build Anda (bucket S3/GCS, registry kontainer). Hit cache yang membutuhkan 2 ms di dalam wilayah bisa memakan 200 ms atau lebih lintas wilayah.
- Arahkan webhook Actions dan polling pekerjaan melalui internet keluar runner (runner yang melakukan polling ke GitHub, bukan sebaliknya). Jika jaringan dikunci, izinkan HTTPS keluar ke `api.github.com` dan `*.actions.githubusercontent.com`, serta buat daftar putih rentang IP meta GitHub.
- Gunakan jaringan privat untuk target deployment: runner di dalam VPC dapat mencapai alamat `10.x` secara langsung, sementara hosted runner membutuhkan VPN, bastion, atau sidecar `tailscale`/`wireguard`.
- Untuk fleet multi-wilayah, gunakan satu runner group per wilayah dan biarkan tim menargetkan wilayah dengan label (`runs-on: [self-hosted, eu-central-1]`).

### 7. Instrumentasi Kesehatan Runner dan Metrik Antrean

Runner yang mati diam-diam membuat pekerjaan menunggu selamanya. Instrumentasi kedua sisi fleet:

- **Liveness runner**: setiap proses `actions-runner` menulis file `.runner` dan memperbarui stempel waktu `last_contact` yang terlihat di UI GitHub (Settings > Actions > Runner groups). Beri alert jika kontak terakhir runner melewati ambang batas. Untuk runner kontainer, health check kontainer itu sendiri.
- **Antrean pekerjaan**: untuk ARC, lacak `github_runner_registration_count` dan metrik antrean `horizontalrunnerautoscaler`; bangun dashboard di Grafana dengan alert pada pertumbuhan antrean.
- **Tingkat kegagalan**: lacak keberhasilan/kegagalan pekerjaan berdasarkan label runner sehingga host yang bermasalah (misalnya disk penuh) terlihat sebagai pola, bukan misteri.
- **Garbage collection**: fleet ephemeral membocorkan kontainer dan volume jika pekerjaan terganggu. Tambahkan pekerjaan pembersihan berkala yang menghapus kontainer dan jaringan yang lebih tua dari durasi pekerjaan maksimum.

### 8. Otomatiskan Pembaruan Runner dan Patch Keamanan

Aplikasi `actions-runner` diperbarui secara berkala, dan OS di bawahnya juga perlu di-patch. Otomatiskan keduanya:

- Berlangganan rilis baru `actions/runner` dan gulirkan pembaruan melalui fleet secara terjadwal (mingguan adalah tipikal). GitHub menandai runner yang usang di UI pengaturan Actions; perlakukan daftar itu sebagai antrean kerja.
- Untuk VM runner, gunakan otomatisasi manajer paket OS (`unattended-upgrades` untuk patch keamanan) dan bangun ulang image dasar secara terjadwal.
- Untuk runner kontainer, bangun ulang image setiap minggu dari image dasar terbaru (`ubuntu:24.04`, ter-patch) ditambah biner runner terbaru, lalu gulirkan Pod.
- Kunci versi runner di konfigurasi Anda (misalnya variabel lingkungan atau tag image) sehingga Anda dapat memutar balik pembaruan yang rusak ke seluruh fleet, bukan men-debug setiap host.

## Langkah Implementasi

### Langkah 1: Hitung Kapasitas dan Rencanakan Fleet Runner

Mulailah dari beban kerja, bukan perangkat keras. Kumpulkan tiga angka dari CI Anda saat ini:

```bash
# Dari laporan penggunaan GitHub atau log workflow
# 1. Konkurensi puncak: jumlah maksimum pekerjaan berjalan bersamaan (misalnya 12)
# 2. Durasi pekerjaan rata-rata: misalnya 9 menit/pekerjaan build
# 3. Kebutuhan khusus: pekerjaan GPU, pekerjaan arm64, pekerjaan jaringan privat
echo "Jumlah workflow: $(gh api repos/your-org/your-repo/actions/workflows --paginate | jq '[.workflows[].id] | length')"
```

Untuk build x64, aturan praktis yang pragmatis adalah **2 vCPU dan 8 GB RAM per pekerjaan build bersamaan**, dengan ruang kepala ekstra 50% untuk lonjakan puncak. Catat rencana fleet dalam tabel sebelum membeli apa pun:

```text
| Group        | Tujuan                 | OS/Arch      | Jumlah | Ephemeral? |
|--------------|------------------------|--------------|--------|------------|
| linux-prod   | Pipeline deploy        | ubuntu-24.04 x64 | 2 | tidak      |
| build-apps   | Kompilasi web app      | ubuntu-24.04 x64 | 6 | ya         |
| build-arm64  | Kompilasi silang arm64 | ubuntu-24.04 arm64 | 2 | ya        |
| gpu-dev      | Pekerjaan training ML  | ubuntu-22.04 + GPU | 1 | tidak    |
```

Rencanakan penempatan jaringan sekarang (di wilayah, di dalam VPC) agar Langkah 6 tidak membutuhkan arsitektur ulang di kemudian hari.

### Langkah 2: Instal Runner di Linux dengan systemd

Unduh dan ekstrak biner runner. Setiap runner membutuhkan direktori sendiri; jangan pernah berbagi satu direktori untuk beberapa runner:

```bash
# Buat pengguna dan direktori khusus
sudo adduser --system --group runner
sudo mkdir -p /srv/actions-runner && sudo chown runner:runner /srv/actions-runner
sudo -u runner bash -c 'cd /srv/actions-runner && \
  curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz && \
  tar xzf actions-runner.tar.gz'
```

Instal dependensi untuk toolchain umum dan konfigurasikan runner sebagai layanan systemd:

```bash
# Dependency (sesuaikan dengan beban kerja Anda)
sudo -u runner bash -c 'cd /srv/actions-runner && ./bin/installdependencies.sh'
sudo -u runner bash -c 'cd /srv/actions-runner && \
  sudo ./svc.sh install runner && sudo ./svc.sh start'
```

Skrip `svc.sh` menghasilkan unit systemd yang memulai runner saat boot dan me-restart-nya jika gagal. Verifikasi layanan:

```bash
sudo systemctl status actions.runner.your-org.your-runner
```

### Langkah 3: Daftarkan Runner Menggunakan Registration Token

Runner didaftarkan dengan registration token berumur pendek yang terikat pada cakupan (repositori, organisasi, atau enterprise). Token tingkat organisasi lebih disukai untuk fleet:

```bash
# Dapatkan registration token (izin admin pada org)
REG_TOKEN=$(curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/orgs/your-org/actions/runners/registration-token \
  | jq -r .token)

# Daftarkan runner
cd /srv/actions-runner
sudo -u runner ./config.sh \
  --url https://github.com/your-org \
  --token "${REG_TOKEN}" \
  --name "linux-prod-01" \
  --labels self-hosted,linux,x64 \
  --group linux-prod \
  --work _work \
  --replace
```

Flag penting:

- `--labels` — kapabilitas yang digunakan oleh `runs-on`. Selalu sertakan `self-hosted` plus `linux`/`windows`/`macos` serta label arsitektur/perangkat keras.
- `--group` — runner group untuk tata kelola (praktik 2).
- `--replace` — mengganti runner yang ada dengan nama yang sama, berguna dalam otomatisasi.
- `--work` — direktori kerja; berikan kapasitas disk yang proporsional dengan output build Anda.

Untuk registrasi ephemeral (satu pekerjaan lalu melepas pendaftaran), berikan `--ephemeral` saat registrasi, atau andalkan pengaturan kontainer/Kubernetes di Langkah 5 dan 6, yang menanganinya secara otomatis.

### Langkah 4: Konfigurasi Label dan Runner Group

Buat runner group terlebih dahulu, lalu tetapkan runner dan repositori:

```bash
# Buat runner group dengan API (atau di UI: Settings > Actions > Runner groups)
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/orgs/your-org/actions/runner-groups \
  -d '{"name": "linux-prod", "visibility": "selected", "selected_repository_ids": [123456, 789012]}'
```

Perbarui label runner yang ada dan keanggotaan grup:

```bash
# Pindahkan runner ke grup
curl -s -X PATCH \
  -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/orgs/your-org/actions/runner-groups/1/runners
# Tambahkan label ke runner
curl -s -X POST \
  -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/your-org/your-repo/actions/runners/5/labels \
  -d '{"labels": ["gpu"]}'
```

Sekarang workflow dapat menargetkan fleet secara presisi:

```yaml
jobs:
  deploy:
    runs-on: [self-hosted, linux-prod]
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

Label bersifat AND, sehingga `[self-hosted, linux-prod]` cocok dengan runner di grup `linux-prod` yang membawa label `self-hosted`. Jaga label tetap kecil, stabil, dan terdokumentasi di `CONTRIBUTING` repositori agar tim menggunakan kosakata yang sama.

### Langkah 5: Jalankan Ephemeral Runner Berbasis Kontainer

Pengaturan ephemeral paling bersih untuk pool tepercaya adalah image Docker resmi `actions/runner` dengan wrapper kecil yang mendaftar per pekerjaan. Buat kontainer runner:

```bash
# Daftarkan ephemeral container runner (satu pekerjaan per kontainer)
docker run -d \
  --name "runner-$(echo $RANDOM)" \
  -e RUNNER_NAME="ephem-$(date +%s)" \
  -e RUNNER_SCOPE=org \
  -e ORG_NAME=your-org \
  -e ACCESS_TOKEN="${GITHUB_PAT}" \
  -e RUNNER_LABELS="self-hosted,linux,x64,ephemeral" \
  -e RUNNER_GROUP=linux-prod \
  -e RUNNER_WORKDIR=/tmp/runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  docker.io/myoung34/github-runner:latest
```

Setiap kontainer mendaftar, menjalankan satu pekerjaan, lalu melepas pendaftaran dan keluar. Pekerjaan mendapatkan filesystem yang benar-benar baru, dan tidak ada state yang bertahan antar pekerjaan.

Hubungkan wrapper ke CI agar fleet menyediakan diri sendiri — workflow yang meminta label seperti `ephemeral` memicu manajer pool untuk membuat kontainer on-demand. Untuk skala produksi, ganti pool rakitan tangan ini dengan Kubernetes dan ARC (Langkah 6).

### Langkah 6: Auto-Scaling dengan actions-runner-controller di Kubernetes

`actions-runner-controller` (ARC) menjalankan self-hosted runner sebagai Pod Kubernetes dan menskalakannya berdasarkan panjang antrean. Instal ARC dengan Helm:

```bash
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller
helm upgrade --install arc actions-runner-controller/actions-runner-controller \
  --namespace arc-system \
  --create-namespace \
  --set githubConfigSecret=gha-runner-scale-set-controller \
  --set metrics.enabled=true
```

Buat secret scale set dan `RunnerDeployment`:

```bash
kubectl create secret generic gh-arc-secret \
  --namespace arc-system \
  --from-literal=github_app_id="${GITHUB_APP_ID}" \
  --from-literal=github_app_installation_id="${GITHUB_APP_INSTALLATION_ID}" \
  --from-literal=github_app_private_key="$(cat github-app.pem)"
```

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: linux-build-runners
spec:
  replicas: 2
  template:
    spec:
      repository: your-org/your-repo
      labels:
        - self-hosted
        - linux
        - x64
        - linux-build
      group: linux-prod
      resources:
        limits:
          cpu: "2"
          memory: 8Gi
```

Hubungkan penskalaan ke kedalaman antrean dengan `HorizontalRunnerAutoscaler`:

```yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: HorizontalRunnerAutoscaler
metadata:
  name: linux-build-autoscaler
spec:
  scaleTargetRef:
    name: linux-build-runners
  minReplicas: 2
  maxReplicas: 12
  metrics:
    - type: TotalNumberOfQueuedAndInFlightWorkflowRuns
      repositoryNames:
        - your-repo
```

ARC memantau API GitHub untuk workflow run yang antre dan menskalakan replika naik/turun sesuai kebutuhan. Setiap Pod baru mendaftarkan ephemeral runner, mengeksekusi satu atau lebih pekerjaan, lalu dihapus. Ini adalah pola kelas produksi: elastis, terisolasi, dan dapat diamati (metrik prometheus melalui `metrics.enabled=true`).

### Langkah 7: Pantau, Perbarui, dan Pecahkan Masalah

**Pantau fleet.** Ekspor sinyal kunci dan beri alert:

```text
| Sinyal                     | Sumber                                  | Alert ketika                 |
|----------------------------|-----------------------------------------|------------------------------|
| Kontak terakhir runner     | UI GitHub Actions / API                 | > 10 menit sejak kontak      |
| Kedalaman antrean          | Metrik ARC / endpoint API antrean       | > 30 detik untuk run interaktif |
| Kegagalan pekerjaan per label | Statistik workflow run               | Tingkat kegagalan > 5% per label |
| Churn / kebocoran kontainer| `docker ps -a` / jumlah Pod k8s         | Kontainer bocor menumpuk     |
| Penyimpangan versi runner  | UI pengaturan Actions / skrip inventaris| Runner mana pun tertinggal 2+ versi |

Untuk ARC, kikis metrik controller dengan Prometheus dan bangun dashboard kecil dengan `github_runner_registration_count`, `horizontalrunnerautoscaler_sync_total`, dan gauge antrean.

**Perbarui fleet.**

```bash
# Pembaruan bergulir untuk runner kontainer: bangun ulang image dengan versi runner baru
# dan biarkan manajer pool mengganti kontainer lama
docker build -t registry.example.com/github-runner:v2.320.0 .
docker push registry.example.com/github-runner:v2.320.0
# Untuk ARC, patch image RunnerDeployment dan gulirkan
kubectl set image deployment/linux-build-runners runner=registry.example.com/github-runner:v2.320.0
```

**Pecahkan kegagalan umum:**

- **Runner tampak offline** — periksa layanan (`systemctl status`), jalur jaringan ke `api.github.com`, dan log runner di `/srv/actions-runner/_diag/`. Runner yang terjebak di "processing" biasanya berarti pekerjaan menggantung; restart layanan dan periksa langkah pekerjaan.
- **Pekerjaan tetap antre** — verifikasi irisan label: label `runs-on` harus merupakan subset dari label runner yang terdaftar. `gh api repos/your-org/your-repo/actions/runners` mencantumkan label untuk diagnosis.
- **Secret tidak ada di pekerjaan** — self-hosted runner tidak mendekripsi secret lingkungan kecuali aturan perlindungan lingkungan lolos dan runner group memiliki akses. Konfirmasi runner group dipilih di "Selected runner groups" pada lingkungan.
- **Runner kontainer tidak mulai** — periksa apakah kontainer dapat mencapai API GitHub (firewall egress), token registrasi valid, dan volume workdir memiliki ruang. Pod ARC di `CrashLoopBackOff` biasanya berarti `github_app_private_key` salah atau installation ID tidak tepat.
- **Build lambat di mesin cepat** — periksa disk `_work` runner (disk penuh adalah pembunuh diam-diam klasik), dan konfirmasi cache build berada di disk lokal (`actions/cache` dengan `cache-to:` menunjuk ke volume lokal) daripada layanan jaringan jarak jauh.

Jalankan skrip diagnostik ini untuk memeriksa kesehatan fleet dengan cepat:

```bash
for r in $(gh api repos/your-org/your-repo/actions/runners --jq '.runners[].name'); do
  status=$(gh api repos/your-org/your-repo/actions/runners --jq --arg n "$r" '.runners[] | select(.name==$n) | .status')
  echo "$r -> $status"
done
```

Fleet yang sehat menjawab tiga pertanyaan setiap saat: setiap runner terdaftar dan berkontak, kedalaman antrean mendekati nol selama kondisi stabil, dan tidak ada runner yang tertinggal lebih dari satu atau dua versi dari rilis `actions/runner` terbaru.

## Langkah Berikutnya

Setelah fleet berjalan, kembangkan ke tiga arah:

1. **Perkuat lebih lanjut** — terapkan federasi OIDC untuk deployment cloud, pindahkan semua kredensial berumur panjang keluar dari lingkungan runner, dan tambahkan pool terpisah yang terisolasi untuk build pull request yang tidak tepercaya.
2. **Perdalam observabilitas** — ekspor metrik per runner ke dashboard terpusat, tambahkan alert untuk pertumbuhan antrean, dan dokumentasikan runbook untuk mode kegagalan teratas di wiki tim Anda.
3. **Pola penskalaan** — migrasikan fleet ke ARC di Kubernetes untuk elastisitas, atau tambahkan runner group regional jika tim men-deploy di banyak cloud.

## Kesimpulan

Self-hosted runner adalah ekstensi yang kuat untuk GitHub Actions, tetapi mereka menukar layanan terkelola dengan kepemilikan operasional. Praktik dalam panduan ini — kerangka keputusan yang ketat untuk kapan berself-host, label dan runner group untuk routing dan tata kelola, ephemeral runner untuk isolasi, ARC untuk elastisitas, serta pemantauan sistematis — mengubah kepemilikan itu dari beban menjadi keunggulan kompetitif. Mulailah dari satu grup kecil yang dibuat khusus, buktikan model keamanan dan keandalannya, dan kembangkan fleet hanya ketika beban kerja benar-benar menuntut kendali tingkat runner.

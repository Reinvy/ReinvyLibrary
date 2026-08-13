---
title: "Silabus Lanjutan Internals PM2 dan Keandalan Produksi"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk operator Node.js berpengalaman, mencakup arsitektur internal PM2, daemon God dan protokol IPC, API programatik, modul kustom, orkestrasi cluster tingkat lanjut, pola ketersediaan tinggi, rekayasa performa, observabilitas berskala besar, penguatan keamanan, dan rekayasa keandalan."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Lanjutan Internals PM2 dan Keandalan Produksi

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang Node.js berpengalaman, insinyur DevOps, dan SRE yang sudah mengelola aplikasi dengan PM2 dan ingin menguasai proses manager itu sendiri. Jika kurikulum PM2 tingkat pengantar mengajarkan *cara menggunakan* PM2, kursus ini menyelami bagian dalamnya: arsitektur daemon God, protokol IPC/RPC yang menghubungkan CLI ke daemon, mesin status proses, API programatik, sistem modul kustom, dan semantik kegagalan yang menentukan bagaimana sebuah fleet berperilaku di bawah beban, crash, dan chaos.

Kurikulum disusun dalam tiga fase. Minggu 1–4 membedah internals PM2: daemon, komunikasi berbasis socket, API programatik, dan modul kustom. Minggu 5–8 berfokus pada arsitektur produksi: orkestrasi cluster tingkat lanjut, pola ketersediaan tinggi dan multi-host, rekayasa performa, serta observabilitas berskala besar. Minggu 9–12 membahas disiplin keandalan: penguatan keamanan, pengujian chaos, rekayasa rilis berskala besar, dan proyek puncak di mana peserta merancang serta mengoperasikan platform multi-host yang dapat menyembuhkan diri sendiri sepenuhnya melalui PM2.

Setiap modul memadukan landasan konseptual yang mendalam dengan lab praktik yang menuntut peserta memeriksa kondisi daemon secara nyata, menulis skrip kontrol programatik, membangun modul kustom, dan menjalankan latihan kegagalan terhadap layanan yang berjalan. Pada akhir kursus ini, peserta akan mampu menjelaskan cara kerja internal PM2, mengendalikannya secara programatik, memperluasnya dengan modul kustom, merancang arsitektur multi-host yang tersedia tinggi, memperkuat lapisan proses manager terhadap serangan, dan menjalankan eksperimen keandalan yang membuktikan bahwa sebuah sistem dapat bertahan dari kegagalan nyata.

## Kurikulum

### Modul 1: Arsitektur PM2 dan Daemon God (Minggu 1)

- **Lanskap proses manager**
  - Yang harus dijamin oleh proses manager: restart, respawn, penangkapan log, dan pelacakan status
  - PM2 vs systemd vs supervisord vs kebijakan restart Docker — di mana masing-masing cocok
  - Trade-off daemon di ruang pengguna versus layanan init system
- **Daemon God**
  - Mengapa PM2 menjalankan daemon persisten alih-alih supervisor di latar depan
  - Bootstrap daemon: `pm2 kill`, `pm2 resurrect`, dan siklus hidup daemon
  - Bagaimana daemon bertahan dari terminal yang meluncurkannya
- **IPC dan RPC antara CLI dan daemon**
  - Transport socket/pipe yang digunakan oleh perintah CLI `pm2`
  - Protokol request/response dan bagaimana perintah dipetakan ke aksi daemon
  - Memeriksa daemon dengan `pm2 report` dan `pm2 prettylist`
- **pm2 vs pm2-runtime**
  - Kapan varian runtime menggantikan model daemon (container, CI)
  - Operasi latar depan dan semantik penerusan sinyal
- **Lab Praktik**: Luncurkan aplikasi sekali pakai, periksa pohon proses daemon dengan `ps`, lacak koneksi socket dengan `lsof`, dan bandingkan status `pm2 list` dengan keluaran mentah `pm2 prettylist`

### Modul 2: API Programatik PM2 (Minggu 2)

- **Menghubungkan ke daemon dari kode**
  - `pm2.connect()` dan siklus hidup koneksi
  - Gaya callback, promise, dan async/await
  - Menangani mode kegagalan "daemon tidak dapat dijangkau"
- **Kontrol proses dari JavaScript**
  - `pm2.start()`, `pm2.stop()`, `pm2.restart()`, `pm2.delete()` dengan objek opsi lengkap
  - `pm2.list()`, `pm2.describe()`, `pm2.jlist()` dan interpretasi deskriptor proses
  - `pm2.sendSignalToProcessId()` untuk alur kerja sinyal kustom
- **Event bus PM2**
  - Berlangganan ke peristiwa siklus hidup proses: `online`, `exit`, `restart`, `stop`
  - `pm2.launchBus()` dan anatomi payload peristiwa
  - Membangun otomasi yang bereaksi terhadap crash secara real-time
- **Penanganan error dan koneksi ulang**
  - Restart daemon dan menghubungkan ulang klien
  - Skrip start idempoten untuk CI dan urutan boot
- **Lab Praktik**: Tulis control plane Node.js yang memulai layanan, memantau event bus-nya, me-restart saat crash, dan mengekspos daftar proses melalui endpoint HTTP

### Modul 3: Modul Kustom PM2 dan Sistem Modul (Minggu 3)

- **Model modul**
  - Bagaimana `pm2 install` berbeda dari `npm install`
  - Tata letak direktori modul dan manifes `module.json`
  - Hook siklus hidup: skrip pre-install, post-install, dan uninstall
- **Membangun modul kustom**
  - Titik masuk modul dan API modul PM2
  - Membaca konfigurasi yang diberikan saat instalasi
  - Menerbitkan metrik dari modul melalui `@pm2/io`
- **pm2-logrotate sebagai implementasi referensi**
  - Bagaimana modul logrotate terhubung ke daemon
  - Fork, throttling, dan interaksi dengan event bus
- **Mengelola fleet modul**
  - Memperbarui modul di seluruh host, mengunci versi, dan menghapus modul
  - Modul vs proses biasa: kapan menggunakan yang mana
- **Lab Praktik**: Bangun dan instal modul PM2 kustom yang memantau endpoint health layanan dan menerbitkan metrik kustom, lalu verifikasi kemunculannya di `pm2 monit`

### Modul 4: Orkestrasi Cluster Tingkat Lanjut (Minggu 4)

- **Internals mode cluster**
  - Modul cluster Node.js di bawah PM2: peran master/worker
  - `NODE_APP_INSTANCE` dan konfigurasi per-instance
  - Penjadwalan round-robin dan fallback shared-socket
- **Manajemen siklus hidup instance**
  - `-i max` versus jumlah instance eksplisit di container dan bare metal
  - Mekanika `pm2 reload` tanpa downtime: penggantian worker per worker
  - Interaksi `wait_ready`, `listen_timeout`, dan `kill_timeout`
- **Scaling dan autoscaling**
  - Scaling manual dengan `pm2 scale`
  - Mengintegrasikan jumlah instance PM2 dengan sinyal gaya HPA Kubernetes
  - Right-sizing: pola beban kerja terikat CPU vs terikat I/O
- **Sticky session dan worker stateful**
  - Mengapa round-robin merusak beban kerja WebSocket dan SSE
  - Load balancing sticky dengan reverse proxy
  - Eksternalisasi state agar instance mana pun dapat melayani permintaan apa pun
- **Lab Praktik**: Terapkan layanan berbasis WebSocket dalam mode cluster, verifikasi reload yang mulus di bawah koneksi yang berkelanjutan, dan reproduksi kegagalan worker stateful untuk memotivasi desain sticky session

### Modul 5: Mesin Status Proses dan Semantik Kegagalan (Minggu 5)

- **Mesin status**
  - `online`, `launching`, `stopping`, `stopped`, `errored`, `one-launch-status`
  - Apa yang memicu setiap transisi dan bagaimana daemon mencatatnya
- **Kebijakan restart secara mendalam**
  - Semantik `max_restarts`, `min_uptime`, dan `autorestart`
  - Exponential backoff dan deteksi crash loop
  - `restart_delay` dan jendela restart terbatas waktu
- **Kode exit dan kegagalan yang tidak tertangkap**
  - Bagaimana PM2 menginterpretasikan kode exit dan sinyal
  - Pengecualian tak tertangkap, rejection tak tertangani, dan `--kill-timeout`
  - Pembunuhan OOM dan `max_memory_restart` — pola batas memori
- **Protokol shutdown yang mulus**
  - Penanganan SIGINT/SIGTERM dan pengeringan koneksi
  - `shutdown_with_message` dan jabat tangan shutdown kustom
  - Shutdown idempoten: apa yang terjadi ketika proses mengabaikan sinyal
- **Lab Praktik**: Bangun proses yang gagal dengan lima cara berbeda (throw, OOM, rejection tak tertangani, hang, sinyal diabaikan) dan rancang kebijakan restart yang memulihkan masing-masing dengan benar

### Modul 6: Arsitektur Ketersediaan Tinggi dan Multi-Host (Minggu 6)

- **Batas satu host**
  - Apa yang dijamin PM2 pada satu mesin dan apa yang tidak dapat dijamin
  - Blast radius dari kegagalan host
- **Pola multi-host**
  - Active-active dengan reverse proxy (HAProxy, Nginx) dan health check
  - Active-passive dengan failover melalui DNS atau keepalived
  - Deployment regional dan pertimbangan failover lintas region
- **Berbagi state antar host**
  - Layanan stateless dan sesi yang dieksternalisasi (Redis, database)
  - Leader election untuk worker tunggal (cron, konsumen antrean)
  - Distributed lock untuk mencegah pemrosesan pekerjaan ganda
- **Interaksi orkestrasi**
  - PM2 di dalam container versus PM2 di VM versus pod Kubernetes
  - Kapan proses manager naik ke lapisan yang lebih tinggi: supervisi tingkat node vs tingkat pod
- **Lab Praktik**: Dirikan dua host (atau dua container) yang menjalankan layanan yang sama di bawah PM2 di belakang load balancer, matikan satu host, dan verifikasi failover tanpa downtime dengan health check otomatis

### Modul 7: Rekayasa Performa dan Perencanaan Kapasitas (Minggu 7)

- **Profil Node.js di bawah PM2**
  - Profil CPU dengan `--node-args="--cpu-prof"` dan protokol inspector
  - Heap snapshot dan diagnosis kebocoran memori untuk proses yang berjalan lama
  - Pengukuran event-loop lag dan jeda GC dengan `@pm2/io`
- **Penentuan ukuran instance**
  - Menyesuaikan jumlah instance dengan inti CPU dan jenis beban kerja
  - Biaya oversubscription: context switching dan tekanan memori
  - Keputusan scaling vertikal vs horizontal untuk lapisan proses manager
- **Metodologi load testing**
  - Merancang load test yang realistis dengan autocannon dan k6
  - Mengidentifikasi bottleneck: event loop, I/O, database, atau jumlah proses
  - Menggunakan `pm2 prettylist` dan metrik sistem untuk mengorelasikan gejala
- **Perencanaan kapasitas**
  - Mengubah hasil load test menjadi formula jumlah instance
  - Headroom, penanganan lonjakan, dan pemicu autoscaling
- **Lab Praktik**: Profil layanan yang bocor memori di bawah PM2, ambil heap snapshot, perbaiki kebocoran, dan jalankan ulang load test untuk mengukur peningkatannya

### Modul 8: Observabilitas Berskala Besar (Minggu 8)

- **Metrik kustom dengan @pm2/io**
  - Gauge, counter, meter, dan histogram — memilih jenis metrik yang tepat
  - Namespace dan label metrik untuk fleet multi-layanan
  - Mengekspos metrik bisnis bersama metrik sistem
- **Mengekspor metrik**
  - Eksportir Prometheus untuk PM2 dan `pm2-prometheus-exporter`
  - Dashboard Grafana dan aturan alerting
  - Integrasi tracing: OpenTelemetry dan vendor APM
- **Arsitektur log**
  - Logging JSON terstruktur dan pengiriman log (Loki, ELK, CloudWatch)
  - Rotasi log berskala besar dengan pm2-logrotate dan rotasi eksternal
  - Correlation ID lintas proses dan host
- **Alerting dan SLO**
  - Dari metrik ke alert: ambang batas, jendela, dan runbook
  - Mendefinisikan SLO untuk kesehatan proses: uptime, frekuensi restart, waktu pemulihan
  - Error budget dan bagaimana restart storm menghabiskannya
- **Lab Praktik**: Instrumentasi aplikasi multi-layanan dengan metrik kustom, ekspor ke Prometheus, bangun dashboard Grafana, dan konfigurasikan alert yang memicu saat restart storm

### Modul 9: Penguatan Keamanan Tumpukan PM2 (Minggu 9)

- **Mengamankan daemon**
  - Socket daemon dan siapa yang dapat berkomunikasi dengannya
  - Menjalankan PM2 di bawah akun layanan khusus dengan hak istimewa paling rendah
  - Membatasi akses CLI `pm2` dan mengaudit riwayat perintah
- **Environment dan rahasia**
  - Blok `env`, `env_file`, dan di mana rahasia tidak boleh disimpan
  - Injeksi rahasia dari vault (HashiCorp Vault, cloud secret manager)
  - Melindungi rahasia dalam file ecosystem yang di-commit ke kontrol versi
- **Keamanan supply chain dan container**
  - Mengunci versi PM2 dan mengaudit pohon dependensi
  - Eksekusi non-root, filesystem read-only, dan profil seccomp di container
  - Image distroless dan minimal dengan pm2-runtime
- **Paparan jaringan**
  - Mengikat antarmuka PM2 dan endpoint metrik ke jaringan tepercaya
  - TLS untuk reverse proxy dan komunikasi antar-layanan
- **Lab Praktik**: Perkuat deployment PM2 — pengguna khusus, rahasia yang diinjeksi vault, dependensi terkunci, dan root container read-only — lalu jalankan daftar periksa penetrasi terhadap hasilnya

### Modul 10: Rekayasa Keandalan dan Pengujian Chaos (Minggu 10)

- **Pola pikir keandalan**
  - Dari "apakah ia restart?" menjadi "apakah sistem pulih?"
  - Mendefinisikan domain kegagalan dan target waktu pemulihan (RTO/RPO) untuk proses
- **Injeksi kegagalan**
  - Membunuh proses dengan `kill -9`, SIGKILL, dan OOM killer
  - Partisi jaringan, kegagalan DNS, dan gangguan dependensi
  - Skenario disk penuh dan kehabisan inode
- **Eksperimen chaos untuk proses manager**
  - Merancang eksperimen yang aman: blast radius, rollback, dan observabilitas
  - Game day: latihan terjadwal yang membuktikan runbook
  - Mengotomasi chaos dengan skrip yang menargetkan layanan yang dikelola PM2
- **Otomasi runbook**
  - Mendokumentasikan prosedur pemulihan dan mengubahnya menjadi skrip
  - Pola auto-remediasi: restart yang digerakkan health check, circuit breaker
  - Tinjauan pasca-insiden: apa yang diungkapkan log proses manager
- **Lab Praktik**: Jalankan game day chaos — bunuh daemon, bunuh proses dengan SIGKILL, habiskan memori, dan simulasikan gangguan dependensi — lalu verifikasi runbook pemulihan mengembalikan layanan dalam SLO

### Modul 11: Rekayasa Rilis Berskala Besar (Minggu 11)

- **Strategi deployment dengan PM2**
  - Rilis blue-green dan canary menggunakan file ecosystem
  - Pembaruan bergulir dengan `pm2 reload` di seluruh cluster
  - Rollback instan: menjaga rilis sebelumnya satu perintah jauhnya
- **Pola integrasi CI/CD**
  - Membangun, menguji, dan men-deploy melalui pipeline dengan hook PM2
  - `pm2 deploy` dengan hook pre/post-deploy untuk migrasi dan health gate
  - Alur gaya GitOps: konfigurasi sebagai kode untuk fleet proses
- **Feature flag dan progressive delivery**
  - Menggabungkan reload PM2 dengan layanan feature flag
  - Traffic canary berbasis persentase serta promosi/rollback otomatis
- **Manajemen konfigurasi**
  - Versi file ecosystem dan validasinya di CI
  - Promosi environment: dev → staging → produksi tanpa drift
- **Lab Praktik**: Implementasikan rilis canary dari versi layanan baru di belakang load balancer, verifikasi health gate, dan rollback seketika saat canary gagal

### Modul 12: Proyek Puncak — Platform Multi-Host yang Menyembuhkan Diri (Minggu 12)

- **Persyaratan proyek puncak**
  - Tier API stateless dan tier worker tunggal, masing-masing di bawah PM2
  - Deployment multi-host dengan load balancer dan failover health check
  - Metrik kustom, ekspor Prometheus, dan dashboard Grafana
  - Penguatan keamanan: pengguna khusus, rahasia vault, dependensi terkunci
  - Latihan chaos yang membunuh proses dan host, dengan runbook yang terdokumentasi
  - Deployment canary dan rollback instan untuk tier API
- **Hasil akhir**
  - File ecosystem lengkap, skrip control plane, dan konfigurasi CI/CD
  - Konfigurasi tumpukan observabilitas dan aturan alerting
  - Runbook insiden dengan prosedur pemulihan dan templat tinjauan pasca-insiden
  - Analisis tertulis mode kegagalan dan bagaimana masing-masing dimitigasi
- **Fokus evaluasi**
  - Kebenaran desain pemulihan kegagalan
  - Kedalaman observabilitas dan alerting
  - Kualitas runbook dan bukti latihan chaos

## Proyek Akhir

Peserta akan merancang, membangun, dan mengoperasikan **platform Node.js multi-host yang menyembuhkan diri sendiri** yang dikelola sepenuhnya melalui PM2. Platform ini terdiri dari tiga tier:

1. **Tier API stateless (Express/Fastify)**: Berjalan dalam mode cluster di dua host atau lebih, di belakang reverse proxy dengan failover berbasis health check. Mendukung rilis canary dan rollback instan.

2. **Tier worker tunggal (BullMQ/Agenda)**: Mengonsumsi pekerjaan dari antrean Redis bersama. Berjalan tepat satu instance di seluruh fleet menggunakan pola leader election terdistribusi, sehingga pemrosesan ganda tidak pernah terjadi.

3. **Lapisan observabilitas**: Setiap layanan menerbitkan metrik kustom dengan `@pm2/io`, diekspor ke Prometheus dan divisualisasikan di Grafana, dengan aturan alerting yang memicu saat restart storm, event-loop lag, dan lonjakan tingkat error.

Proyek harus mencakup rangkaian file ecosystem lengkap dengan konfigurasi spesifik environment, control plane programatik yang bereaksi terhadap event bus PM2, deployment yang diperkuat (pengguna khusus, rahasia yang diinjeksi vault, versi PM2 terkunci), dan runbook latihan chaos yang terdokumentasi yang membuktikan pemulihan dari pembunuhan proses, restart daemon, dan kegagalan host penuh — semuanya dalam target waktu pemulihan yang ditentukan.

## Kriteria Penilaian

- **Lab Modul (40%)**: Setiap modul menyertakan lab praktik yang dievaluasi berdasarkan kelengkapan, kebenaran, dan kepatuhan terhadap pola lanjutan yang diajarkan. Lab dikumpulkan sebagai skrip control plane, modul kustom, file ecosystem, dashboard, dan laporan latihan.

- **Ujian Tengah Kursus (20%)**: Ujian tertulis dan praktik setelah Modul 6 yang mencakup internals daemon, API programatik, orkestrasi cluster, dan arsitektur ketersediaan tinggi.

- **Proyek Akhir (40%)**: Proyek puncak dievaluasi berdasarkan:
  - **Arsitektur dan desain (25%)**: Topologi multi-host yang benar, kepemimpinan worker tunggal, dan pemisahan tier yang bersih
  - **Kebenaran pemulihan kegagalan (30%)**: Platform bertahan dari pembunuhan proses, restart daemon, dan kehilangan host dalam RTO, dengan bukti dari latihan chaos
  - **Kedalaman observabilitas (20%)**: Metrik kustom, dashboard, dan alert benar-benar mendorong keputusan operasional
  - **Postur keamanan (15%)**: Eksekusi hak istimewa paling rendah, penanganan rahasia, dan penguncian dependensi ditunjukkan
  - **Dokumentasi (10%)**: Runbook lengkap, dapat diulang, dan menyertakan templat tinjauan pasca-insiden

## Referensi

- [Dokumentasi Resmi PM2](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/) — Referensi lengkap untuk semua perintah, konfigurasi, dan API programatik PM2
- [Referensi API Programatik PM2](https://pm2.keymetrics.io/docs/usage/pm2-api/) — Modul npm `pm2` untuk mengendalikan daemon dari kode
- [Panduan Mode Cluster PM2](https://pm2.keymetrics.io/docs/usage/cluster-mode/) — Internals mode cluster, mekanika reload, dan scaling
- [Sistem Modul PM2](https://pm2.keymetrics.io/docs/advanced/pm2-module-system/) — Membangun dan menerbitkan modul PM2 kustom
- [Plugin pm2-logrotate](https://github.com/keymetrics/pm2-logrotate) — Implementasi modul referensi untuk rotasi log
- [Dokumentasi @pm2/io](https://github.com/keymetrics/pm2-io-apm) — Metrik kustom, tracing, dan instrumentasi APM
- [Dokumentasi PM2 Plus](https://pm2.keymetrics.io/docs/usage/pm2-plus/) — Monitoring terkelola, dashboard, dan alerting
- [Dokumentasi Cluster Node.js](https://nodejs.org/api/cluster.html) — Referensi resmi modul cluster Node.js
- [Integrasi Docker PM2](https://pm2.keymetrics.io/docs/usage/docker-pm2/) — pm2-runtime dan praktik terbaik container
- [Panduan Startup Hook PM2](https://pm2.keymetrics.io/docs/usage/startup/) — Integrasi init system dan siklus hidup daemon
- [Prinsip Chaos Engineering](https://principlesofchaos.org/) — Prinsip chaos engineering kanonik untuk merancang latihan kegagalan

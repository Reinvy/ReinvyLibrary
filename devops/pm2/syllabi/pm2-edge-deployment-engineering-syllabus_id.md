---
title: "Silabus Rekayasa Deployment Edge dan Sumber Daya Terbatas dengan PM2"
description: "Kurikulum lanjutan 12 minggu yang komprehensif bagi para insinyur yang menjalankan PM2 pada perangkat keras terbatas dan fleet edge: jejak memori PM2 sendiri, penentuan jumlah instance terhadap batas memori yang keras, keterkaitan cgroup v2 dan OOM killer, kebangkitan proses saat boot dengan systemd, rotasi log pada disk kecil, modul native ARM dan musl, container multi-arsitektur dengan pm2-runtime, kelaparan CPU dan throttling termal, bootstrap fleet yang toleran offline, rollout bertahap per kohort, serta keamanan tingkat perangkat."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Deployment Edge dan Sumber Daya Terbatas dengan PM2

## Ringkasan

Silabus lanjutan 12 minggu ini mengajarkan cara menjalankan PM2 ketika host-nya sendiri menjadi hambatan: single-board computer, instance cloud 512 MB hingga 2 GB, gateway industri, kios retail, node yang terpasang di kendaraan, dan fleet mesin kecil apa pun yang harus tetap bekerja saat jaringan tidak tersedia. Pada laptop atau server 16 GB, konfigurasi bawaan PM2 tidak berbahaya. Pada perangkat dengan RAM 512 MB, satu inti CPU tersisa, dan kartu SD 16 GB, konfigurasi yang sama menentukan apakah layanan bisa hidup setahun atau mati saat boot setelah tiga minggu.

Masalah rekayasanya berbeda dari operasi PM2 biasa dalam empat hal. Pertama, **anggaran sumber daya bersifat mutlak**: Anda tidak bisa menambah node ketika memori penuh, sehingga setiap megabyte yang dipakai daemon PM2 dan setiap worker yang dijalankan harus dibenarkan dengan perhitungan, bukan perasaan. Kedua, **sistem operasi adalah peserta aktif**: batas cgroup, OOM killer, urutan boot systemd, pembatasan laju journald, dan ketahanan tulis kartu SD semuanya menentukan apakah layanan bertahan. Ketiga, **platformnya asing**: CPU ARM, distribusi berbasis musl, modul native yang harus dikompilasi di tempat ia berjalan, dan image container yang harus tersedia untuk arsitektur tersebut. Keempat, **jaringannya tidak andal**: perangkat hanya online beberapa menit, sehingga deployment, telemetri, dan rollback harus dirancang untuk menoleransi ketiadaan, bukan mengasumsikan control plane yang selalu hidup.

Kurikulum ini disusun dalam empat fase. Minggu 1–3 membangun model host terbatas dan melakukan aritmetika memori yang menjadi dasar semua keputusan berikutnya. Minggu 4–6 mengintegrasikan PM2 dengan sistem operasi: batas cgroup v2, perilaku OOM, kebangkitan saat boot, serta tekanan log dan disk pada volume kecil. Minggu 7–9 menghadapi perangkat keras dan penjadwal: build ARM dan musl, container pada perangkat edge, kelaparan CPU, throttling termal, dan keadilan event loop dengan jumlah inti lebih sedikit daripada worker. Minggu 10–12 mengubah satu perangkat yang bertahan menjadi sebuah fleet: bootstrap idempoten, konfigurasi yang toleran offline, rollout bertahap per kohort dengan rollback otomatis, identitas perangkat dan distribusi secret, serta control plane sebagai proyek akhir.

Setiap modul memadukan penalaran dengan lab yang benar-benar berjalan pada perangkat keras terbatas — Raspberry Pi, VPS 1 GB, atau container yang dibatasi 256 MB — dan menghasilkan sebuah angka: memori resident per worker, waktu restart setelah OOM kill, waktu dari boot dingin hingga respons sehat pertama, atau porsi satu inti CPU yang dikonsumsi cluster saat idle.

## Kurikulum

### Modul 1: Realitas Host Terbatas (Minggu 1)

- **Apa yang termasuk terbatas**
  - Host yang dibatasi memori: single-board computer 512 MB, instance VPS 1 GB, gateway 2 GB yang berbagi dengan agen lain
  - Host yang dibatasi CPU: SoC ARM satu inti atau big.LITTLE yang harus melayani semua worker pada satu inti
  - Host yang dibatasi penyimpanan: kartu SD dan eMMC 8–32 GB dengan ketahanan tulis terbatas serta tulis acak yang lambat
  - Host yang dibatasi daya: node tenaga surya atau baterai yang bisa kehilangan daya tanpa shutdown bersih
- **Mode kegagalan yang khas pada host kecil**
  - OOM kill senyap yang dilaporkan PM2 sebagai restart, menutupi penyebab sebenarnya
  - Korupsi filesystem setelah listrik padam, membuat file dump PM2 tidak terbaca
  - Kondisi disk penuh yang disebabkan oleh log, bukan oleh data aplikasi
  - Pergeseran jam dan celah zona waktu yang merusak validasi TLS dan timestamp log
- **Buku besar anggaran**
  - Biaya tetap: kernel, init system, journald, SSH, dan agen pemantauan
  - Biaya variabel: daemon PM2, satu atau beberapa worker, dan memori yang dipatok setiap request HTTP
  - Ruang cadangan: mengapa kernel membutuhkan 10–15 persen dan mengapa anggaran yang terpakai penuh adalah anggaran yang gagal
- **Memilih model supervisi**
  - PM2 langsung di bawah systemd pada perangkat khusus
  - PM2 di dalam container ketika container itu sendiri menjadi batas anggaran
  - Kapan host terbatas sebaiknya menjalankan satu proses tanpa PM2 sama sekali — dan apa yang hilang
- **Lab Praktik**: Siapkan host 512 MB hingga 1 GB, catat `free -m`, `nproc`, dan tata letak disk, lalu jalankan aplikasi PM2 sepele dan susun buku besar anggaran tertulis yang menampilkan setiap biaya resident sebelum ada kode aplikasi sama sekali

### Modul 2: Mengukur Jejak PM2 Sendiri (Minggu 2)

- **Daemon God**
  - Apa yang disimpan daemon: tabel proses, handle file log, socket IPC, dan registry modul
  - Kisaran memori resident yang umum pada ARM 64-bit dan 32-bit, serta mengapa jejak daemon bertambah seiring jumlah proses
  - Mengapa daemon adalah satu proses yang tidak boleh direstart sembarangan pada perangkat yang tidak dapat Anda jangkau
- **Baseline per worker**
  - Mengukur RSS worker Node.js kosong sebelum dan sesudah agen PM2 terpasang
  - Biaya instrumentasi `@pm2/io` di bawah batas 512 MB
  - Source map, heap snapshot, dan biaya lain khusus pengembangan yang harus dimatikan di produksi
- **Membaca angka yang benar**
  - Field `pm2 prettylist` dan `pm2 jlist` yang benar-benar penting pada host terbatas: `monit.memory`, `pm2_env.restart_time`, `pm2_env.unstable_restarts`
  - RSS versus heap used versus heap total, dan mengapa `max_memory_restart` membandingkan nilai yang salah ketika salah konfigurasi
  - Page cache dan bagaimana akuntansi Linux membuat perangkat sehat tampak penuh
- **Instrumentasi yang terjangkau**
  - Mengambil sampel `pm2 jlist` dari skrip shell alih-alih menjalankan agen metrik yang lebih berat
  - Menulis satu baris JSON ringkas per sampel ke ring buffer di tmpfs
  - Menghindari tumpukan observabilitas yang memakan memori lebih besar daripada layanan yang diamatinya
- **Lab Praktik**: Ukur daemon, worker idle, dan worker di bawah beban pada perangkat yang sama; ambil profil RSS sepuluh menit dengan dan tanpa `@pm2/io`; lalu terbitkan tabel jejak memori yang dipakai untuk penentuan ukuran di Minggu 3

### Modul 3: Menentukan Ukuran Instance dan Batas Memori (Minggu 3)

- **Persamaan batas atas**
  - Total anggaran dikurangi overhead kernel dan init dikurangi biaya daemon dikurangi ruang cadangan sama dengan anggaran worker
  - Membagi anggaran worker dengan RSS puncak per worker untuk memperoleh jumlah instance maksimum
  - Mengapa nilai puncak, bukan rata-rata, menentukan jumlahnya: lonjakan garbage collection dan burst request menetapkan batas
- **Konfigurasi heap Node.js pada host kecil**
  - `--max-old-space-size` dan `--max-semi-space-size` sebagai batas keras, bukan harapan
  - Mengapa heap lebih kecil berarti koleksi lebih sering tetapi memori yang dapat diprediksi
  - Menetapkan `node_args` per aplikasi pada file ecosystem dan memverifikasinya dengan `pm2 describe`
- **Jumlah instance versus jumlah inti CPU**
  - Mode cluster pada perangkat satu inti: kontensi, bukan throughput
  - `instances: 1` dengan `exec_mode: fork` untuk layanan yang terikat I/O pada CPU terbatas
  - Kapan `-i max` benar dan kapan ia diam-diam menghancurkan latensi
- **Kebijakan restart sebagai kendali memori**
  - Nilai `max_memory_restart` yang benar-benar sesuai dengan batas atas yang terukur
  - Membedakan pola restart berbentuk kebocoran dari pola berbentuk beban pada `pm2 logs`
  - `min_uptime`, `max_restarts`, dan `exp_backoff_restart_delay` untuk mencegah crash loop menghabiskan seluruh anggaran
- **Lab Praktik**: Turunkan jumlah instance untuk layanan nyata dari RSS terukur, tetapkan `max_old_space_size` dan `max_memory_restart` yang sesuai, lalu jalankan uji beban yang sebelumnya akan gagal dan tunjukkan layanan tetap berada di dalam batas atasnya

### Modul 4: cgroup v2 dan OOM Killer (Minggu 4)

- **Dua sistem batas yang harus sejalan**
  - `max_memory_restart` milik PM2 sebagai pemicu restart di tingkat aplikasi
  - `MemoryHigh` dan `MemoryMax` cgroup v2 sebagai batas yang ditegakkan kernel
  - Patologi ketidaksepakatan: PM2 restart sebelum kernel bertindak, atau kernel membunuh sebelum PM2 menyadarinya
- **Membaca cgroup v2 pada perangkat**
  - Hierarki terpadu di `/sys/fs/cgroup` serta `memory.current`, `memory.peak`, dan `memory.events`
  - Slice systemd dan `MemoryMax` pada unit PM2 versus batas global
  - Batas runtime container yang muncul sebagai file cgroup yang sama
- **Perilaku OOM dan jejaknya**
  - Bagaimana kernel memilih korban melalui `oom_score` dan `oom_score_adj`
  - Melindungi daemon PM2 agar tetap hidup ketika sebuah worker terpilih
  - Di mana menemukan buktinya: `dmesg`, `journalctl -k`, dan penghitung `memory.events` pada cgroup
- **Merancang untuk pembunuhan itu**
  - Membuat setiap worker aman untuk restart: startup idempoten, tanpa state di memori yang penting
  - Membedakan exit bersih, restart mandiri, dan OOM kill pada penghitung restart PM2
  - Memberi alert pada peristiwa OOM cgroup, bukan hanya pada jumlah restart
- **Lab Praktik**: Batasi aplikasi PM2 dengan limit memori cgroup di bawah jejak alaminya, picu OOM kill, buktikan daemon tetap hidup, lalu setel `oom_score_adj` dan `max_memory_restart` sehingga layanan terdegradasi dengan merestart satu worker alih-alih mati

### Modul 5: Boot, Kebangkitan Proses, dan Anggaran Cold Start (Minggu 5)

- **Urutan boot pada perangkat**
  - Mengapa `pm2 startup` harus berjalan setelah jaringan dan filesystem siap, bukan sekadar terpasang
  - Unit systemd yang dihasilkan, `WantedBy=multi-user.target`, dan dependensi `After=` yang penting
  - Menjalankan PM2 sebagai pengguna tanpa hak istimewa dan jebakan PATH yang merusak kebangkitan proses
- **File dump sebagai state**
  - Apa yang sebenarnya disimpan `pm2 save` dan apa yang diam-diam dihilangkannya
  - Korupsi setelah listrik padam dan jalur pemulihan ketika `dump.pm2` tidak dapat diurai
  - Membangun ulang daftar proses dari file ecosystem alih-alih mempercayai dump
- **Anggaran cold start**
  - Mengukur waktu dari daya menyala hingga respons HTTP sehat pertama pada perangkat sebenarnya
  - Faktor yang memperlambat: baca acak kartu SD, startup Node.js pada ARM, ukuran graf modul, dan overhead `pm2 resurrect`
  - Teknik yang mempersingkat anggaran: bundling, lazy import, bytecode terkompilasi, dan menonaktifkan source map
- **Boot idempoten**
  - Merancang startup sehingga boot parsial berkonvergensi alih-alih menduplikasi proses
  - Mendeteksi dan membersihkan referensi PID usang yang tertinggal dari shutdown tidak bersih
  - Watchdog yang memverifikasi kesehatan setelah resurrect dan menjalankan ulang `pm2 start` hanya saat diperlukan
- **Lab Praktik**: Buat unit systemd untuk PM2, putus daya perangkat di tengah proses berjalan, lalu ukur dan dokumentasikan waktu boot-ke-sehat, integritas file dump, dan langkah pemulihan yang dibutuhkan untuk tiga shutdown tidak bersih berturut-turut

### Modul 6: Log, Tekanan Disk, dan Mode Kegagalan Volume Kecil (Minggu 6)

- **Mengapa log memenuhi disk tertanam**
  - Lokasi log bawaan di `~/.pm2/logs` dan laju pertumbuhan layanan yang banyak bicara
  - Interaksi antara file log PM2 dan journald ketika keduanya menangkap aliran yang sama
  - Amplifikasi tulis kartu SD: bagaimana penambahan log terus-menerus memperpendek umur perangkat
- **Rotasi yang sesuai perangkat**
  - Setelan `pm2-logrotate` yang masuk akal pada 32 GB: `max_size`, `retain`, `compress`, dan `rotateInterval`
  - Merotasi ke tmpfs untuk aliran debug bervolume tinggi dan menyimpan hanya ringkasannya
  - Batas `SystemMaxUse` dan `RateLimitBurst` journald sebagai lapisan pertahanan kedua
- **Perilaku saat disk penuh**
  - Apa yang rusak lebih dulu: penulisan log, lalu state SQLite atau leveldb, lalu dump PM2 sendiri
  - Menulis penjaga disk yang memicu rotasi dan alert sebelum filesystem penuh
  - Remount read-only sebagai mode bertahan darurat dan bagaimana aplikasi harus berperilaku di bawahnya
- **Volume log sebagai batasan desain**
  - Structured logging dengan sampling alih-alih verbose per request
  - Memindahkan agregasi keluar perangkat dengan buffer terbatas agar perangkat offline tidak tumbuh tanpa batas
  - Mengukur byte log per seribu request sebagai metrik kapasitas
- **Lab Praktik**: Jalankan layanan bervolume tinggi pada volume yang sengaja dibuat kecil, konfigurasikan rotasi dan batas journald, lalu ukur pertumbuhan log per jam, volume tulis perangkat, dan perilaku persis layanan ketika filesystem mencapai sembilan puluh sembilan persen

### Modul 7: ARM, musl, dan Modul Native (Minggu 7)

- **Realitas arsitektur**
  - armv7 versus aarch64 versus x86_64 dan mengapa binary yang dibangun untuk target salah gagal saat dimuat
  - glibc versus musl: kesalahan undefined symbol yang menyusul ketika node_modules hasil build Debian dibawa ke Alpine
  - Memverifikasi apa yang benar-benar terpasang: `uname -m`, `ldd`, dan `node -p process.arch`
- **Native addon**
  - Dependensi mana yang mengompilasi kode native dan cara menemukannya sebelum deployment
  - Membangun di perangkat dengan toolchain tersedia versus cross-compile di mesin yang lebih cepat
  - Binary prebuilt, prebuild-install, dan jalur cadangan ketika tidak ada artefak untuk target tersebut
- **Pipeline build untuk target terbatas**
  - Menghasilkan bundle mandiri per arsitektur dan menjaganya di luar source tree
  - Determinisme: mematok versi Node.js dan membangun ulang saat runtime berubah
  - Meng-cache artefak build agar rollout fleet tidak mengompilasi ulang di setiap perangkat
- **Batas memori 32-bit**
  - Kendala ruang alamat pada armv7 dan batas heap praktisnya
  - Mengapa worker yang baik-baik saja pada aarch64 bisa gagal mengalokasikan memori pada armv7
  - Memilih target 64-bit untuk apa pun yang membutuhkan heap lebih dari kecil
- **Lab Praktik**: Deploy layanan yang sama ke perangkat armv7, perangkat aarch64, dan host x86_64; rusak lalu perbaiki ketidakcocokan modul native; dan hasilkan matriks build yang menjamin artefak benar untuk setiap target

### Modul 8: Container pada Perangkat Edge dengan pm2-runtime (Minggu 8)

- **Mode container PM2**
  - `pm2-runtime` sebagai PID 1: penerusan sinyal, reaping zombie, dan propagasi exit code
  - Mengapa `pm2 start` di dalam container salah dan bagaimana container mati senyap ketika itu dipakai
  - Perilaku `--no-daemon` dan streaming log ke stdout untuk runtime container
- **Container sebagai batas anggaran**
  - `--memory` dan `--cpus` Docker yang diterjemahkan menjadi batas cgroup v2 yang dapat diamati PM2
  - Menetapkan `max_memory_restart` di bawah batas container agar PM2 bertindak lebih dulu
  - Memilih antara `--memory-swap` sama dengan memori (tanpa swap) dan sedikit kelonggaran swap
- **Image untuk perangkat kecil**
  - Build multi-arsitektur dengan buildx untuk armv7, arm64, dan amd64
  - Memilih basis slim atau Alpine serta konsekuensi musl dari Modul 7
  - Ukuran image sebagai batasan deployment pada tautan lambat atau berbasis kuota
- **Kekhawatiran runtime terbatas**
  - Root filesystem read-only dan jalur yang dapat ditulis yang benar-benar dibutuhkan PM2
  - Kebijakan restart container versus kebijakan restart PM2 sendiri, tanpa penghitungan ganda
  - Healthcheck yang mencerminkan kesiapan, bukan sekadar keberadaan proses
- **Lab Praktik**: Kemas layanan PM2 sebagai image multi-arsitektur, jalankan dengan batas 256 MB dan setengah inti, verifikasi penanganan sinyal pada `docker stop`, dan buktikan bahwa OOM container menghasilkan satu restart bersih alih-alih crash loop

### Modul 9: Kelaparan CPU, Throttling Termal, dan Keadilan Event Loop (Minggu 9)

- **Ketika CPU menjadi batas atas**
  - Perangkat satu inti yang menjalankan lebih banyak worker daripada inti: latensi run-queue dan derau penjadwalan
  - Mengukur kontensi dengan load average, `vmstat`, dan waktu CPU per proses
  - Event loop lag sebagai gejala paling awal dari kelaparan CPU
- **Perilaku termal dan daya**
  - Frequency scaling dan throttling termal yang mengubah SoC cepat menjadi lambat di bawah beban berkelanjutan
  - Benchmark beban berkelanjutan alih-alih benchmark burst, dan faktor derating yang terungkap
  - Toleransi kehilangan daya: kebijakan sinkronisasi filesystem, daya tahan dump PM2, dan restart idempoten
- **Keadilan dengan inti lebih sedikit daripada worker**
  - CPU affinity dan `cpu.weight` cgroup untuk menjaga daemon tetap responsif di bawah beban
  - Mengurangi jumlah worker dan menaikkan konkurensi per worker untuk layanan yang terikat I/O
  - Mengapa `nice` pada daemon lebih aman daripada memaku daemon ke inti tersibuk
- **Watch mode, reload, dan biaya CPU**
  - Harga `--watch` pada perangkat ber-CPU sedang: restart berulang yang bersaing dengan lalu lintas
  - Pengaturan waktu `pm2 reload` bertahap pada satu inti agar jendela rolling tidak membuat fleet kelaparan
  - Tenggat shutdown yang anggun dengan asumsi inti lambat, bukan inti cepat
- **Lab Praktik**: Bebani perangkat satu inti dengan cluster multi-worker, ukur event loop lag dan throughput, lalu kurangi worker, sesuaikan konkurensi, dan terapkan bobot CPU hingga latensi p95 masuk anggaran; dokumentasikan derating termal yang teramati

### Modul 10: Bootstrap Fleet dan Konfigurasi Toleran Offline (Minggu 10)

- **Provisioning perangkat idempoten**
  - Bootstrap yang berkonvergensi dari image kosong ke layanan berjalan tanpa langkah manual
  - Pematokan versi Node.js dan PM2, serta pengambilan artefak yang diverifikasi checksum
  - Membuat eksekusi kedua bootstrap menjadi no-op, dan membuktikannya
- **Konfigurasi tanpa control plane yang hidup**
  - File desired-state yang dikirim bersama artefak alih-alih diambil saat boot
  - Bundel konfigurasi bertanda tangan dengan masa berlaku tertanam dan jalur cadangan yang terdokumentasi
  - Pelapisan environment: identitas perangkat, parameter situs, dan secret dipisahkan
- **Telemetri dari perangkat intermiten**
  - Buffer store-and-forward dengan batas ukuran keras dan kebijakan eviction
  - Heartbeat yang membawa sidik versi perangkat, uptime, jumlah restart, dan error terakhir
  - Merekonstruksi pandangan perangkat dengan pandangan control plane setelah beberapa hari offline
- **Operasi PM2 tingkat fleet**
  - `pm2 deploy` dan batasannya pada perangkat di belakang NAT atau dengan DNS tidak stabil
  - Rollout berbasis push memakai artefak plus langkah konvergensi saat boot, alih-alih fan-out SSH
  - Menangani clock skew dan sertifikat kedaluwarsa pada perangkat yang tertidur berminggu-minggu
- **Lab Praktik**: Provision lima perangkat (atau lima container yang meniru perangkat) dengan satu skrip bootstrap, matikan tiga di antaranya selama satu hari, lalu pulihkan konektivitas dan buktikan kelimanya berkonvergensi ke versi yang sama dan melaporkan telemetri yang konsisten

### Modul 11: Rollout Bertahap, Rollback, dan Keamanan Perangkat (Minggu 11)

- **Rollout berbasis kohort**
  - Mendefinisikan kohort berdasarkan situs, revisi perangkat keras, atau identitas perangkat yang stabil
  - Stage gate dengan kriteria kesehatan yang harus terpenuhi sebelum kohort berikutnya berjalan
  - Mendeteksi rilis buruk dari sinyal fleet, bukan dari satu perangkat
- **Rollback otomatis pada perangkat terbatas**
  - Menyimpan artefak sebelumnya di disk dalam anggaran penyimpanan yang tersedia
  - Pemicu rollback yang bertindak lokal ketika perangkat tidak dapat menjangkau control plane
  - Memverifikasi bahwa versi hasil rollback benar-benar berjalan, bukan hanya filenya dipulihkan
- **Identitas perangkat dan secret**
  - Kredensial per perangkat yang diterbitkan saat provisioning dan dirotasi tanpa reflash penuh
  - Menjaga secret di luar image dan file ecosystem; memakai file environment milik root
  - Daemon PM2 dengan hak paling rendah, direktori `.pm2` terlindungi, dan socket IPC terkunci
- **Pengurangan permukaan serangan**
  - Menonaktifkan autentikasi password SSH dan layanan tak perlu pada perangkat yang diakses pengguna
  - Root read-only dengan partisi data yang dapat ditulis sebagai langkah keamanan sekaligus ketahanan
  - Mengaudit apa yang terungkap dari perangkat yang dicuri: log, file environment, dan artefak cache
- **Lab Praktik**: Kirim rilis yang sengaja dirusak ke satu kohort, buktikan rollback otomatis memulihkan layanan tanpa akses remote, lalu rotasi secret perangkat di seluruh fleet dan audit perangkat yang disimulasikan dicuri untuk mencari materi yang terekspos

### Modul 12: Proyek Akhir — Control Plane Fleet Terbatas (Minggu 12)

- **Lingkup proyek akhir**: merancang, membangun, dan mengoperasikan fleet minimal lima perangkat bersumber daya terbatas yang menjalankan layanan terkelola PM2, dengan control plane yang menoleransi perangkat hilang selama berhari-hari
- **Persyaratan arsitektur**
  - Buku besar memori terdokumentasi per perangkat dengan jejak daemon dan worker terukur serta kebijakan ruang cadangan yang dinyatakan
  - Batas cgroup v2, ambang `max_memory_restart` yang selaras, dan kebangkitan boot systemd yang bertahan dari kehilangan daya tidak bersih
  - Artefak yang benar per arsitektur, dalam container atau bare, dengan salinan rollback yang tersimpan di perangkat
- **Persyaratan operasional**
  - Rotasi dan batas journald yang disesuaikan dengan volume sebenarnya, dengan penjaga disk yang aktif sebelum kehabisan ruang
  - Telemetri store-and-forward dengan buffer terbatas dan kebijakan eviction yang terdokumentasi
  - Rollout kohort dengan dua stage gate dan jalur rollback lokal otomatis
- **Luaran**: perkakas bootstrap dan rollout, konfigurasi ecosystem dan systemd, skrip pengukuran, skema telemetri, serta runbook yang mencakup pemulihan OOM, pemulihan disk penuh, pemulihan boot loop, dan rollback
- **Presentasi**: pertahankan aritmetika memori, tunjukkan satu OOM kill nyata dan satu rollback nyata beserta angka sebelum/sesudah, serta jelaskan apa yang dilakukan fleet ketika control plane tidak terjangkau selama sepekan

## Proyek Akhir

Peserta membangun dan mengoperasikan fleet lima perangkat terbatas yang menjalankan layanan nyata di bawah PM2, dengan seluruh siklus hidup dipandu oleh pengukuran. Proyek harus mencakup buku besar memori tertulis yang diturunkan dari pembacaan aktual pada perangkat keras target; konfigurasi PM2 yang `max_old_space_size`, `max_memory_restart`, dan batas cgroup-nya selaras secara konstruksi; unit systemd beserta strategi kebangkitan proses yang telah bertahan dari minimal tiga pemutusan daya tidak bersih; rotasi log dan batas journald dengan penjaga disk yang terbukti aktif sebelum kehabisan ruang; artefak multi-arsitektur dengan salinan rollback di perangkat; telemetri store-and-forward dengan buffer terbatas; serta rollout kohort yang menjangkau setiap perangkat melalui dua stage gate.

Proyek juga harus mendokumentasikan empat latihan kegagalan yang dijalankan pada perangkat keras nyata: OOM kill yang dipicu dengan bukti daemon tetap hidup dan hanya satu worker yang restart, kondisi disk penuh yang diselesaikan oleh penjaga disk, boot loop yang dipulihkan tanpa akses fisik, dan rilis rusak yang di-rollback otomatis saat perangkat offline. Setiap latihan harus menyertakan pengukuran sebelum, selama, dan sesudah, serta langkah runbook yang akan diikuti operator.

## Kriteria Penilaian

- **Tugas**: Lab mingguan dinilai berdasarkan apakah klaim didukung pengukuran dari perangkat keras terbatas yang sebenarnya, kebenaran konfigurasi yang diuji, dan kualitas analisis kegagalan. Lab yang melaporkan angka dari laptop atau container tanpa batas, bukan dari perangkat target, tidak diterima. Lab 4, 5, dan 7 memiliki bobot lebih karena perilaku OOM, integritas boot, dan kebenaran arsitektur adalah tiga mode kegagalan yang paling sering membuat perangkat nyata berhenti melayani secara permanen.
- **Proyek Akhir**: Proyek akhir divalidasi terhadap persyaratan arsitektur (buku besar memori terukur, sistem batas yang selaras, kebangkitan proses yang aman dari kehilangan daya, artefak benar per arsitektur), persyaratan operasional (rotasi dan penjaga disk yang berfungsi, buffer telemetri terbatas, rollout bertahap dengan rollback otomatis), serta empat latihan kegagalan terdokumentasi dengan angka yang dapat direproduksi. Proyek yang batasnya tidak selaras — ketika kernel membunuh sebelum PM2 bertindak, atau PM2 restart sebelum kernel akan melakukannya — tidak lulus, seberapa baik pun performa layanan pada beban normal.

## Referensi

- [Dokumentasi resmi PM2](https://pm2.keymetrics.io/docs/usage/quick-start/) — manajemen proses, file ecosystem, kebijakan restart, dan mode cluster
- [PM2 di Docker / pm2-runtime](https://pm2.keymetrics.io/docs/usage/docker-pm2-nodejs/) — menjalankan PM2 sebagai PID 1 dengan penerusan sinyal dan log stdout
- [pm2-logrotate](https://github.com/keymetrics/pm2-logrotate) — konfigurasi ukuran, retensi, kompresi, dan interval untuk volume terbatas
- [Startup dan kebangkitan proses PM2](https://pm2.keymetrics.io/docs/usage/startup/) — integrasi systemd, `pm2 save`, dan pemulihan proses saat boot
- [Opsi CLI Node.js](https://nodejs.org/api/cli.html) — `--max-old-space-size`, `--max-semi-space-size`, dan konfigurasi heap V8
- [Diagnostik memori Node.js](https://nodejs.org/en/learn/diagnostics/memory) — akuntansi RSS versus heap dan investigasi kebocoran
- [Kontrol sumber daya systemd](https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html) — `MemoryHigh`, `MemoryMax`, `CPUWeight`, dan konfigurasi slice
- [Dokumentasi Control Group v2](https://docs.kernel.org/admin-guide/cgroup-v2.html) — hierarki terpadu, peristiwa memori, dan `oom_score_adj`
- [Build multi-platform Docker](https://docs.docker.com/build/building/multi-platform/) — target buildx untuk armv7, arm64, dan amd64
- [node-gyp](https://github.com/nodejs/node-gyp) — mengompilasi dan cross-compile native addon untuk target ARM
- [Alpine Linux dan musl](https://wiki.alpinelinux.org/wiki/Main_Page) — kompatibilitas glibc versus musl dan pengaruhnya pada binary prebuilt

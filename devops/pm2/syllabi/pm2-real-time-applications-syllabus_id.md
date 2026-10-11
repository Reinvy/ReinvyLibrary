---
title: "Silabus Rekayasa Aplikasi Real-Time dengan PM2"
description: "Kurikulum lanjutan 12 minggu yang komprehensif bagi para insinyur yang membangun dan mengoperasikan aplikasi real-time di atas PM2: layanan WebSocket dan SSE, mode cluster dengan sticky sessions, reload yang mulus untuk koneksi berumur panjang, backpressure dan kontrol aliran, ketahanan terhadap reconnect storm, penskalaan horizontal antar host, observabilitas real-time, serta penanganan koneksi jangka panjang yang aman."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Aplikasi Real-Time dengan PM2

## Ringkasan

Kurikulum lanjutan selama 12 minggu ini mengajarkan para insinyur cara merancang, mengoperasikan, dan menskalakan aplikasi real-time sepenuhnya dengan PM2. Beban kerja real-time — sistem chat, dasbor langsung, kolaborasi pengeditan, backend game, telemetri IoT, dan umpan streaming — memiliki profil operasional yang fundamental berbeda dari aplikasi web request/response. Koneksi bersifat jangka panjang, status hidup di sisi server sama seperti di basis data, dan satu reload atau crash tunggal dapat memutus ribuan soket sekaligus. Di mana kurikulum PM2 pengantar mengajarkan manajemen proses secara umum dan silabus lanjutan membedah internal PM2, kursus ini berpusat pada koneksi jangka panjang itu sendiri: cara menjaganya tetap hidup, cara mengurasnya dengan mulus, cara me-reload armada tanpa memutuskannya, serta cara mengamati dan mengamankannya.

Kurikulum disusun dalam tiga fase. Minggu 1–4 membangun layanan real-time inti: endpoint WebSocket dan SSE, mode cluster dengan sticky sessions, serta siklus hidup koneksi di bawah process manager. Minggu 5–8 menjadikannya siap produksi: reload yang mulus untuk koneksi jangka panjang, rekayasa backpressure dan memori, ketahanan terhadap reconnect storm, serta penskalaan horizontal antar host. Minggu 9–12 menambahkan disiplin operasional yang khas untuk sistem real-time: observabilitas dan SLO di tingkat koneksi, alur kerja pengembangan real-time, pengamanan saluran jangka panjang, serta capstone yang merangkai semuanya menjadi platform real-time yang mampu menyembuhkan diri sendiri.

Setiap modul memasangkan landasan konseptual yang mendalam dengan praktikum langsung yang menjalankan layanan sungguhan: membuka ribuan koneksi bersamaan ke sebuah cluster, me-reload armada di tengah lalu lintas, menghantam layanan dengan reconnect storm, serta menjalankan latihan kegagalan terhadap endpoint WebSocket yang hidup. Di akhir kursus, peserta didik akan mampu merancang backend real-time sebagai kumpulan layanan yang dikelola PM2, meluncurkan versi baru tanpa memutus koneksi, bertahan dari reconnect storm klien, serta membuktikan kapasitas dan latensi dengan pengukuran nyata.

## Kurikulum

### Modul 1: Bentang Beban Kerja Real-Time (Minggu 1)

- **Apa yang membuat beban kerja real-time berbeda**
  - Koneksi jangka panjang versus siklus request/response pendek: soket yang tetap terbuka berjam-jam atau berhari-hari
  - Status di sisi server: room, presence, subscription, dan kursor yang lenyap saat proses mati
  - Jangkauan ledakan sebuah restart: satu proses yang keluar dapat memutus ratusan ribu koneksi
- **Taksonomi transport real-time**
  - WebSocket: full-duplex, berorientasi pesan, upgrade dari HTTP
  - Server-Sent Events (SSE): satu arah dari server ke klien melalui HTTP biasa, dengan koneksi ulang otomatis
  - Long-polling dan transport cadangan: saat perantara memblokir upgrade WebSocket
- **Memilih transport yang tepat untuk kebutuhan**
  - SSE ketika server hanya mengirim (feed, notifikasi, ekor log)
  - WebSocket ketika kedua sisi perlu mengirim (chat, kolaborasi, game)
  - Rantai fallback (websocket → polling) dan biaya operasionalnya
- **Peran PM2 dalam tumpukan real-time**
  - PM2 sebagai pengawas antara aplikasi dan init system untuk layanan satu-host
  - Kapan armada real-time masih muat di satu host dengan mode cluster — dan kapan butuh beberapa host
  - Melengkapi runtime kontainer dengan `pm2-runtime` di dalam kontainer layanan real-time
- **Praktikum**: Deploy layanan echo WebSocket minimal dan umpan SSE sebagai dua proses PM2, hubungkan dengan klien WebSocket, dan telusuri keduanya melalui `pm2 logs`

### Modul 2: Mode Cluster PM2 untuk Layanan Real-Time (Minggu 2)

- **Fondasi mode cluster**
  - Modul cluster Node.js dan opsi `-i max` / `instances` milik PM2
  - Bagaimana OS menyeimbangkan koneksi TCP yang masuk ke seluruh worker cluster
  - Perilaku round-robin versus penyeimbangan OS serta distribusi koneksi
- **Sticky sessions dan afinitas soket**
  - Mengapa koneksi real-time harus menempel pada satu worker: room dalam memori, presence, dan status broadcast
  - Penyeimbangan sticky dengan Nginx `ip_hash` dan HAProxy `balance source`
  - Jebakan sticky session: proxy, NAT, dan penggunaan ulang alamat IPv6
- **Broadcast dan status lintas worker**
  - Realitas shared-nothing pada worker cluster: setiap worker memiliki memorinya sendiri
  - Redis sebagai tulang punggung pub/sub bersama: Redis adapter Socket.IO, presence berbasis redis
  - Kapan broadcast dalam memori cukup (satu worker) dan kapan tidak
- **Rekayasa jumlah instance**
  - Menentukan ukuran instance berdasarkan kapasitas koneksi bersamaan, bukan throughput permintaan
  - Batas koneksi per worker, batas file descriptor (`ulimit -n`), dan kehabisan port ephemeral
- **Praktikum**: Jalankan layanan Socket.IO dalam mode cluster, verifikasi routing sticky dengan `ip_hash`, broadcast lintas worker dengan Redis adapter, dan ukur distribusi koneksi dengan `pm2 monit`

### Modul 3: Layanan WebSocket di Bawah PM2 (Minggu 3)

- **Siklus hidup WebSocket**
  - Jabat tangan upgrade HTTP beserta header-nya (`Upgrade`, `Sec-WebSocket-Key`)
  - Pembukaan, framing, heartbeat ping/pong, dan jabat tangan penutupan
  - Koneksi half-open: mengapa soket klien yang mati bisa tampak sehat bagi server
- **Membangun layanan soket dengan `ws` dan Socket.IO**
  - Pustaka `ws` untuk endpoint WebSocket yang minimal
  - Socket.IO untuk room, acknowledgement, dan koneksi ulang otomatis dengan transport fallback
  - Namespace dan room sebagai satuan fan-out broadcast
- **Heartbeat dan pemanenan koneksi mati**
  - Interval ping/pong di tingkat aplikasi dan eskalasi timeout
  - Menghentikan koneksi half-open agar memori proses tidak disandera
  - Interaksi status proses PM2 dengan timer per-koneksi
- **Shutdown yang mulus untuk layanan soket**
  - `process.on('SIGTERM')`: berhenti menerima koneksi baru, kuras koneksi aktif dengan tenggat
  - Penyelesaian pesan yang sedang berjalan versus penutupan paksa: apa yang klien amati pada masing-masing jalur
  - Menyetel `kill_timeout` dan `listen_timeout` untuk layanan dengan koneksi berat
- **Praktikum**: Bangun layanan chat dengan room, tambahkan heartbeat, hentikan satu worker di tengah lalu lintas dengan `pm2 stop`, dan amati perilaku koneksi ulang serta join ulang room di sisi klien

### Modul 4: SSE dan Endpoint Streaming (Minggu 4)

- **Mekanika Server-Sent Events**
  - Respons `text/event-stream`, baris `data:` dan `event:`, serta replay berbasis `id:`
  - Koneksi ulang klien yang otomatis dan header `Last-Event-ID`
  - Batas koneksi per peramban dan per host
- **Keep-alive dan pertimbangan proxy**
  - Mengapa timeout HTTP yang naif membunuh koneksi SSE yang menganggur (read timeout, idle timeout proxy)
  - Menonaktifkan buffering respons: `X-Accel-Buffering: no`, `Cache-Control: no-cache`, semantik flush
  - Penyetelan keep-alive dan timeout load balancer untuk HTTP jangka panjang
- **Backpressure pada aliran satu arah**
  - Penanganan konsumen lambat ketika klien tidak mampu mengikuti feed
  - Buffer peristiwa terbatas dan kebijakan drop, bukan pertumbuhan memori tanpa batas
- **Menjalankan layanan SSE di bawah PM2**
  - Mode cluster untuk SSE: worker stateless dengan bus peristiwa bersama melalui Redis
  - Semantik restart: klien SSE terhubung ulang otomatis, sehingga drain bisa cepat
  - Menggabungkan SSE dengan `max_memory_restart` PM2 untuk membatasi kebocoran akumulasi feed
- **Praktikum**: Bangun layanan umpan SSE yang mengalirkan tick pasar, jalankan di belakang proxy, verifikasi buffering dinonaktifkan, dan pastikan klien terhubung ulang dengan mulus melintasi `pm2 reload`

### Modul 5: Reload yang Mulus untuk Koneksi Jangka Panjang (Minggu 5)

- **Mengapa reload adalah peristiwa pemutusan koneksi**
  - Mekanika `pm2 reload`: restart bergilir pada worker cluster
  - Apa yang klien amati ketika worker-nya restart: soket terputus dan koneksi ulang otomatis
- **Menguras sebelum mati**
  - Pola drain: tutup soket pendengar, beri tahu klien untuk menyeimbangkan ulang, tunggu pekerjaan yang sedang berjalan
  - Penolakan koneksi baru selama drain versus penolakan diam-diam
  - Mengoordinasikan drain di seluruh cluster agar armada tidak pernah terputus serentak
- **Disiplin koneksi ulang di sisi klien**
  - Exponential backoff dengan jitter untuk menghindari gelombang koneksi ulang yang tersinkronisasi
  - Semantik rejoin: room, subscription, dan presence yang dipulihkan setelah koneksi ulang
  - Serah terima koneksi ulang: bagaimana worker baru mempelajari status lama klien
- **Strategi reload untuk armada real-time**
  - Reload bergilir dengan jendela drain per worker
  - Blue-green via nama aplikasi PM2 kedua dan pengalihan lalu lintas secara atomik
  - Kapan `pm2 reload` aman dan kapan butuh stop/start penuh dengan orkestrasi eksternal
- **Praktikum**: Jalankan cluster Socket.IO 4 instance di bawah beban, lakukan `pm2 reload`, dan ukur waktu henti koneksi, gelombang koneksi ulang, serta kehilangan pesan dengan dan tanpa logika drain

### Modul 6: Backpressure, Memori, dan Kontrol Aliran (Minggu 6)

- **Biaya memori dari koneksi**
  - Overhead per koneksi: buffer soket, timer, dan status aplikasi
  - Masalah konsumen lambat: klien yang macet menumpuk pesan di buffer kirim server
  - Mendeteksi pertumbuhan buffer sebelum menjadi pembunuh OOM
- **Primitif backpressure**
  - Nilai kembalian `socket.write()` dan peristiwa drain
  - Antrean terbatas, batas watermark, dan kebijakan buang-terlama versus buang-terbaru
  - Konflasi status (nilai terakhir menang) untuk aliran telemetri berfrekuensi tinggi
- **Manajemen memori V8 untuk layanan real-time**
  - Pertumbuhan heap dari objek koneksi jangka panjang dan retensi closure
  - `max_memory_restart` sebagai jaring pengaman dan interaksinya dengan drain
  - Keterlambatan event loop sebagai gejala pertama kegagalan backpressure
- **Kontrol aliran lintas pipeline**
  - Rantai backpressure produsen → antrean → broker → konsumen
  - Pembatasan laju pesan masuk per koneksi dan per pengguna
  - Penjadwalan kooperatif: memberi kesempatan event loop selama broadcast besar
- **Praktikum**: Jenuhkan klien lambat dengan feed berfrekuensi tinggi, amati memori yang menanjak, tambahkan backpressure berbasis watermark, dan verifikasi `max_memory_restart` memulihkan proses tanpa kehilangan armada

### Modul 7: Reconnect Storm dan Semantik Kegagalan (Minggu 7)

- **Thundering herd**
  - Apa yang terjadi ketika ribuan klien terhubung ulang sekaligus: badai koneksi, lonjakan CPU, dan kehancuran upstream
  - Pemicu umum: restart host, deploy, timeout proxy, rotasi sertifikat
- **Pertahanan badai di sisi server**
  - Degradasi yang mulus di bawah banjir koneksi: kontrol penerimaan dan pelampauan kapasitas
  - Menunda koneksi dengan isyarat coba-ulang yang dikendalikan server (HTTP 503 dengan `Retry-After`)
  - Circuit breaking pada dependensi hilir agar badai tidak berjenjang
- **Pertahanan badai di sisi klien**
  - Exponential backoff dengan jitter penuh, dibatasi pada interval maksimum
  - Penundaan awal koneksi ulang yang acak untuk desinkronisasi kawanan
  - Anggaran koneksi ulang: total percobaan dan jendela waktu sebelum menyerah
- **Peran PM2 dalam ketahanan badai**
  - `min_uptime` dan `max_restarts` untuk menahan layanan soket yang crash-loop
  - `exp_backoff_restart_delay` untuk mencegah PM2 sendiri me-restart armada secara serempak
  - Restart instance yang diacak agar seluruh cluster tidak melakukan reset bersamaan
- **Praktikum**: Putuskan jaringan ke cluster yang hidup dengan ribuan klien terhubung, restart armada, dan ukur waktu penyelesaian koneksi ulang dengan dan tanpa backoff berjitter serta restart yang diacak

### Modul 8: Penskalaan Horizontal dan Deployment Multi-Host (Minggu 8)

- **Melampaui satu host**
  - Kapan file descriptor, CPU, atau memori satu host membatasi armada
  - PM2 per host versus cluster: unit skala horizontal adalah host
- **Pola worker stateless**
  - Menyimpan status koneksi secara eksternal: Redis untuk presence, room, dan antrean pengiriman
  - Redis adapter Socket.IO untuk broadcast lintas host
  - Rejoin yang idempoten sehingga host mana pun dapat menyerap koneksi klien mana pun
- **Routing dan penyeimbangan beban lintas host**
  - Routing sticky di load balancer sehingga status koneksi tetap lokal sedapat mungkin
  - DNS, upstream Nginx, dan health check HAProxy untuk lalu lintas real-time
  - Health check yang mencerminkan kesiapan real-time (menerima upgrade, broker terjangkau)
- **Mengoperasikan armada PM2 multi-host**
  - File ecosystem yang seragam dan otomatisasi deployment lintas host
  - `pm2 deploy` untuk peluncuran dan rollback armada
  - Drain terkoordinasi lintas host untuk menghindari jendela pemutusan seluruh armada
- **Praktikum**: Deploy armada Socket.IO dua host di belakang Nginx dengan routing sticky dan Redis adapter, verifikasi broadcast lintas host, dan reload satu host sementara host lain membawa lalu lintas

### Modul 9: Observabilitas dan SLO untuk Sistem Real-Time (Minggu 9)

- **Metrik real-time yang penting**
  - Jumlah koneksi: total, per worker, per namespace; laju churn (koneksi/putus per detik)
  - Laju pesan dan rasio fan-out: satu pesan masuk → N pengiriman keluar
  - Persentil latensi: p50, p95, dan p99 untuk perjalanan pulang-pergi pesan dan waktu koneksi
- **Instrumentasi dengan @pm2/io**
  - Gauge khusus untuk koneksi langsung dan kedalaman buffer
  - Counter untuk pesan masuk/keluar dan pemutusan; meter untuk laju
  - Histogram untuk latensi pulang-pergi dan durasi koneksi
  - Mengekspos metrik ke Prometheus dan dasbor
- **SLO untuk perilaku real-time**
  - Ketersediaan jalur koneksi, bukan sekadar endpoint HTTP
  - Anggaran latensi: pengiriman pesan p95, waktu koneksi p95
  - Error budget yang didorong oleh laju pesan hilang dan pemutusan paksa
- **Mengorelasikan status proses PM2 dengan kesehatan koneksi**
  - `pm2 monit`, `pm2 prettylist`, dan restart proses sebagai aliran peristiwa
  - Alerting laju restart dan deteksi crash-loop dari `pm2 jlist`
  - Log JSON terstruktur dengan peristiwa siklus hidup koneksi (connect, disconnect, drain)
- **Praktikum**: Instrumentasi layanan chat dengan metrik koneksi dan latensi @pm2/io, dorong ke Prometheus, tetapkan SLO dengan error budget, dan picu badai reload untuk menyaksikan anggaran terbakar

### Modul 10: Alur Kerja Pengembangan Real-Time (Minggu 10)

- **Mengembangkan layanan soket dengan mode watch PM2**
  - `--watch` dengan `ignore_watch` untuk node_modules dan direktori dist
  - Bagaimana restart mode watch berbeda dari reload produksi: koneksi terputus secara lokal
  - Pola hot reload untuk pengalaman pengembangan sisi klien
- **Men-debug koneksi jangka panjang**
  - Integrasi inspector dengan PM2 dan debugging berbasis attach pada layanan soket yang hidup
  - Mereproduksi masalah koneksi secara lokal dengan banyak klien simulasi
- **Menguji layanan real-time**
  - Pengujian unit dan integrasi dengan `socket.io-client` terhadap instance nyata yang dikelola PM2
  - Pengujian konformansi implementasi WebSocket dengan suite pengujian Autobahn
  - Pengujian beban dengan generator koneksi (Artillery, klien ws khusus) di CI
- **Paritas lingkungan**
  - Konfigurasi ecosystem bersama lintas dev, staging, dan produksi
  - Transport, proxy, dan konfigurasi TLS yang sama di setiap lingkungan
  - Kontainer untuk infrastruktur lokal (Redis, broker) melalui Docker Compose dengan `pm2-runtime`
- **Praktikum**: Bangun pengaturan dev mode watch untuk layanan soket, tulis pengujian integrasi yang menghubungkan klien nyata, dan jalankan pengujian beban koneksi secara lokal terhadap layanan yang dikelola PM2

### Modul 11: Pengamanan Layanan Real-Time (Minggu 11)

- **Mengamankan transport**
  - Terminasi WSS/TLS: di load balancer atau di dalam aplikasi
  - Rotasi sertifikat tanpa memutus koneksi: rebinding yang mulus
  - Risiko di tingkat protokol: origin yang tidak divalidasi, cross-site WebSocket hijacking
- **Mengautentikasi koneksi**
  - Mengautentikasi upgrade HTTP sebelum soket terbuka
  - Auth berbasis token di query string versus cookie versus subprotocol (beserta trade-off-nya)
  - Autentikasi ulang saat koneksi ulang dan saat join room
- **Otorisasi dan kontrol penyalahgunaan**
  - Kontrol akses tingkat room dan pencegahan kebocoran presence
  - Pembatasan laju per koneksi dan per pengguna: banjir pesan dan banjir join
  - Validasi masukan pada setiap pesan: batas ukuran payload dan pemeriksaan skema
- **Mengamankan lapisan process manager**
  - Menjalankan daemon PM2 di bawah akun layanan dengan hak istimewa minimal
  - Melindungi direktori home `.pm2` dan soket IPC dari pengguna lain
  - Menjauhkan rahasia dari file ecosystem dan URL koneksi
- **Praktikum**: Amankan layanan chat dari ujung ke ujung: terminasi TLS, validasi origin, auth token saat upgrade, batas laju per pengguna, dan daemon PM2 berhak istimewa minimal; lalu coba serangan hijacking, banjir, dan spam join terhadapnya

### Modul 12: Capstone — Platform Real-Time yang Menyembuhkan Diri Sendiri (Minggu 12)

- **Cakupan capstone**: rancang, bangun, dan operasikan platform real-time lengkap — aplikasi presence kolaboratif dengan kursor langsung, room, dan umpan aktivitas — yang dikelola sepenuhnya oleh PM2
- **Persyaratan arsitektur**
  - Mode cluster dengan sticky sessions, broadcast dan presence berbasis Redis
  - Reload tanpa waktu henti dengan drain, koneksi ulang klien berjitter, dan pemulihan status koneksi ulang
  - Opsi deployment multi-host dengan file ecosystem seragam dan peluncuran armada
- **Persyaratan operasional**
  - Dasbor @pm2/io untuk koneksi, latensi, dan kedalaman buffer
  - SLO dengan error budget dan alerting saat anggaran terbakar
  - Latihan kekacauan: bunuh worker, reload di tengah lalu lintas, putuskan satu host, dan buktikan platform pulih
- **Hasil akhir**: repositori berisi platform dan file ecosystem, perangkat pengujian beban, tumpukan pemantauan, serta runbook tertulis yang mendokumentasikan setiap latihan kegagalan beserta hasilnya
- **Presentasi**: pertahankan arsitektur, tunjukkan SLO yang terukur, dan jelaskan hasil setiap latihan kegagalan

## Proyek Akhir

Peserta didik membangun platform kolaborasi real-time berbentuk produksi dan mengoperasikannya di bawah PM2. Proyek harus mencakup layanan Socket.IO ber-cluster dengan routing sticky session dan Redis adapter sehingga room dan presence bertahan melintasi worker dan host; implementasi shutdown dan drain yang mulus sehingga `pm2 reload` selesai tanpa kehilangan pesan yang terukur; pustaka klien dengan exponential backoff berjitter yang memulihkan room dan status setelah setiap pemutusan; komponen umpan SSE untuk aliran aktivitas; lapisan observabilitas @pm2/io yang melacak koneksi langsung, fan-out pesan, dan persentil latensi pulang-pergi; serta SLO terdokumentasi dengan error budget untuk waktu koneksi p95 dan pengiriman pesan.

Peserta didik juga harus menjalankan dan mendokumentasikan tiga latihan kegagalan: `pm2 reload` di tengah lalu lintas dengan lebih dari 5.000 koneksi bersamaan, pemutusan di tingkat host pada deployment multi-host, dan reconnect storm setelah restart seluruh armada — masing-masing dengan metrik sebelum/sesudah yang membuktikan platform pulih dalam batas error budget-nya. Pengumpulan akhir adalah repositori lengkap, skrip pengujian beban dan latihan, dasbor pemantauan, serta runbook yang dapat diikuti operator baru untuk men-deploy, menskalakan, dan memulihkan platform.

## Kriteria Penilaian

- **Tugas**: Praktikum mingguan dinilai berdasarkan kebenaran layanan yang berjalan (koneksi bertahan melintasi restart, broadcast menjangkau seluruh anggota, metrik nyata), kualitas analisis tertulis terhadap perilaku yang diamati, serta kelengkapan kode relatif terhadap tujuan modul. Praktikum 7 (latihan badai) dan Praktikum 9 (penetapan SLO) diberi bobot ekstra karena mendemonstrasikan dua keterampilan terkeras dalam kursus ini: rekayasa ketahanan dan keandalan yang terukur.
- **Proyek Akhir**: Capstone divalidasi terhadap persyaratan arsitektur (cluster dengan sticky sessions, status berbasis Redis, reload berbasis drain, pemulihan koneksi ulang), persyaratan operasional (dasbor @pm2/io yang nyata, SLO yang dipertahankan, tiga latihan kegagalan yang dieksekusi dan didokumentasikan), serta kualitas runbook. Proyek yang tidak dapat menyelesaikan reload di tengah lalu lintas dalam batas error budget-nya, atau yang metriknya tidak dapat direproduksi oleh penilai, tidak lulus.

## Referensi

- [Dokumentasi resmi PM2](https://pm2.keymetrics.io/docs/usage/quick-start/) — referensi manajemen proses, mode cluster, reload, dan file ecosystem
- [API programatik PM2](https://pm2.keymetrics.io/docs/usage/pm2-api/) — modul npm pm2 dan aliran peristiwa launchBus
- [Dokumentasi Socket.IO](https://socket.io/docs/) — room, namespace, Redis adapter, dan koneksi ulang klien
- [Redis adapter Socket.IO](https://socket.io/docs/v4/redis-adapter/) — broadcast lintas worker dan lintas host
- [Pustaka WebSocket ws](https://github.com/websockets/ws) — server WebSocket minimal dan integrasi suite pengujian Autobahn
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) — format event-stream, koneksi ulang, dan replay `Last-Event-ID`
- [Dokumentasi @pm2/io](https://github.com/keymetrics/pm2-io-apm) — metrik khusus, gauge, counter, dan histogram
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) — pola pencegahan reconnect storm

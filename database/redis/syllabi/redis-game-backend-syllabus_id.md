---
title: "Silabus Rekayasa Backend Game dengan Redis"
description: "Kurikulum 12 minggu tingkat lanjut untuk membangun backend game multiplayer real-time di atas Redis, mencakup state game otoritatif, antrean matchmaking, papan peringkat dan sistem ranking, ekonomi dan inventori pemain, presence dan chat, fitur geospasial dan sosial, penegakan anti-cheat, serta operasional pada skala peluncuran."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Backend Game dengan Redis

## Ringkasan

Silabus tingkat lanjut 12 minggu ini dirancang untuk backend engineer, pengembang game server, dan platform engineer yang ingin menguasai Redis sebagai lapisan state real-time pada backend game online. Jika kursus Redis pada umumnya memperlakukan struktur data sebagai katalog fitur, kurikulum ini memperlakukannya sebagai primitif dari sebuah game yang hidup: sorted set adalah papan peringkat musiman yang melayani ratusan ribu pembacaan bersamaan, hash adalah ruang pertandingan otoritatif yang setiap transisinya harus divalidasi di sisi server, skrip Lua adalah unit atomik yang menjamin pemain tidak pernah membelanjakan mata uang yang tidak dimilikinya, dan Stream adalah catatan tahan lama bahwa hasil pertandingan dihitung tepat sekali.

Setiap modul memadukan teori arsitektur backend game — anggaran latensi, state otoritatif, reward yang idempoten, lonjakan trafik hari peluncuran — dengan lab praktik menggunakan Redis CLI, skrip Lua, klien Node.js dan Python, gateway WebSocket, Docker Compose, dan Redis Cluster. Peserta membangun secara bertahap: dari layanan sesi dan presence, melalui matchmaking dan mesin state dalam pertandingan, hingga backend game multiplayer lengkap dengan matchmaking, papan peringkat, ekonomi, chat, telemetri, dan runbook operasional hari peluncuran. Di akhir kursus, peserta mampu merancang dan mengoperasikan backend game di mana Redis menyerap puluhan ribu operasi per detik dengan p99 latensi di bawah satu milidetik tanpa pernah merusak state pemain.

Silabus ini adalah kurikulum kelima redis dan secara sengaja mengambil sudut pandang industri game: silabus pertama membahas struktur data inti dan pengembangan umum, silabus kedua membahas internal, modul, dan operasional perusahaan, silabus ketiga membahas analitik real-time dengan RedisTimeSeries, dan silabus keempat membahas pola koordinasi microservices. Kurikulum kelima ini adalah sudut pandang hiburan interaktif, di mana setiap primitif dinilai dari perilakunya di hadapan populasi pemain yang aktif: jaminan atomisitas, tekanan hot-key dari jutaan pembaca satu key papan peringkat, dan kebenaran operasi ekonomi yang mungkin terkait dengan uang sungguhan.

## Kurikulum

### Modul 1: Arsitektur Backend Game dan Fondasi Redis (Minggu 1)

- **Anatomi Backend Game Online**
  - Model server otoritatif: klien mengirim niat, backend memegang kebenaran
  - Anggaran latensi per genre: turn-based (ratusan milidetik) versus kompetitif real-time (satuan milidetik)
  - Tingkatan state: state pertandingan yang panas, state profil dan ekonomi yang hangat, state arsip yang dingin
  - Mengapa Redis cocok: operasi di bawah milidetik, primitif atomik, siklus hidup TTL, dan perilaku memori yang dapat diprediksi
- **Pilihan Topologi untuk Beban Kerja Game**
  - Satu instance dengan Sentinel versus Redis Cluster versus deployment per-shard per region
  - Lokalitas data regional: menyimpan state panas pemain di regionnya sementara profil tetap global
  - Fitur Redis 7+ yang penting untuk game: client-side caching, function library, ACL
- **Desain Key untuk Sistem Game**
  - Konvensi penamaan: `game:{match_id}:state`, `player:{player_id}:wallet`, `lb:{season}:global`
  - Hash tag pada Cluster dan mengapa key yang saling terkait harus berbagi slot untuk operasi atomik multi-key
  - Memilih antara hash, sorted set, stream, dan string biasa untuk setiap kebutuhan game
- **Persiapan Lab**
  - Stack Docker Compose: Redis Stack, gateway game Node.js, worker Python, dan generator beban
  - Mengukur latensi baseline dengan `redis-cli --latency` dan harness benchmark klien
- **Lab Praktik**: Bangun stack, tulis skema penamaan key untuk game arena fiktif, dan benchmark throughput `HSET`/`HGETALL` versus `ZADD`/`ZREVRANGE` untuk menetapkan baseline p99

### Modul 2: Sesi Pemain, Presence, dan Rekoneksi (Minggu 2)

- **State Sesi pada Skala Pemain**
  - Token sesi opaque yang dipetakan ke hash alih-alih token mandiri, agar pencabutan instan dapat dilakukan
  - Kedaluwarsa bergulir saat ada aktivitas dengan `EXPIRE` serta kebijakan idle-timeout yang benar-benar dipakai game
  - Batas sesi bersamaan per akun, pengikatan perangkat, dan pemaksaan keluar saat login mencurigakan
- **Presence dan Status Online**
  - Set presence per region, shard, dan mode permainan dengan penyegaran heartbeat
  - Pelacakan terakhir terlihat dengan sorted set untuk daftar teman dan kueri roster
  - Fan-out presence ke instance gateway dan biaya menyiarkan ke graf teman yang besar
- **Rekoneksi dan Bergabung Ulang ke Pertandingan**
  - Menyimpan cukup banyak state dalam pertandingan agar pemain yang terputus bisa bergabung kembali dalam jendela tenggang
  - Membedakan klien yang terputus dari pemain yang keluar sengaja, serta aturan pembersihan state untuk masing-masing
  - Penanganan rejoin yang idempoten agar rejoin ganda tidak pernah memunculkan avatar kedua
- **Lab Praktik**: Bangun layanan sesi dan presence dengan kedaluwarsa bergulir, tambahkan batas sesi bersamaan dengan eviksi, dan implementasikan alur rejoin yang mengembalikan pemain ke pertandingan yang sedang berjalan

### Modul 3: Papan Peringkat dan Sistem Ranking (Minggu 3)

- **Mekanisme Sorted Set Secara Mendalam**
  - Flag `ZADD` yang penting di produksi: `GT`, `LT`, `NX`, `XX`, dan penggunaannya untuk anti-cheat
  - Pengodean skor untuk ranking gabungan: rating plus penentu tie-break melalui pengodean member
  - Pembaruan skor atomik dengan `ZINCRBY`, dan pencegahan eksploit kemunduran skor dengan skrip bersyarat
- **Topologi Papan Peringkat**
  - Papan global, musiman, mingguan, dan per mode dengan key berjendela dan pergantian TTL
  - Papan khusus teman dan guild yang dibangun dengan mengiris set kecil terhadap papan global
  - Kueri Top-N, pencarian peringkat dengan `ZREVRANK`, dan tampilan sekitar saya dengan pembacaan jendela peringkat
- **Menskalakan Papan Peringkat yang Panas**
  - Memecah satu papan logis menjadi N segmen dan menggabungkannya untuk halaman yang ditampilkan
  - Reset musim dengan mekanisme snapshot-and-swap yang tidak memblokir pembacaan pada papan aktif
  - Penskalaan pembacaan dengan replika dan client-side caching untuk halaman puncak papan
- **Lab Praktik**: Bangun papan peringkat tiga tingkat (global, mingguan, hanya teman) dengan reset musim, lalu pecah papan global menjadi empat segmen dan implementasikan penggabungan yang mengembalikan 100 teratas secara benar

### Modul 4: Antrean Matchmaking dan Sistem Rating (Minggu 4)

- **Desain Antrean**
  - Bucket rating dengan toleransi yang melebar seiring waktu tunggu agar durasi menunggu tetap terbatas
  - Antrean sorted set dengan skor berupa rating atau waktu masuk antrean, dibaca dengan kueri rentang
  - Antrean party dan tim: mengelompokkan pemain sebelum pencocokan dan menjaga keutuhan party
- **Pemasangan Pasangan Secara Atomik**
  - Mengapa pemasangan harus menjadi satu operasi atomik: kondisi balapan double-match
  - Mengimplementasikan langkah pasangkan-dan-hapus dalam Lua agar dua worker tidak pernah mengambil pemain yang sama
  - Menangani kegagalan sebagian: membatalkan pertandingan setengah jadi dan memasukkan kembali entri yang terbengkalai
- **Kendala dan Keadilan**
  - Kendala region dan latensi, memakai pencarian geospasial agar pertandingan tetap berpindah rendah
  - Aturan komposisi peran dan skill, serta kapan aturan itu dilonggarkan agar tidak terjadi kelaparan antrean
  - Pengisian ulang ke pertandingan yang sedang berjalan tanpa merusak keseimbangan tim
- **Lab Praktik**: Implementasikan matchmaker berbasis Lua dengan toleransi rating yang melebar, suntikkan beberapa worker pencocokan bersamaan untuk membuktikan tidak ada pemain yang dipasangkan dua kali, dan tambahkan kendala region yang ditopang pencarian geospasial

### Modul 5: State Game Real-Time dan Transisi Atomik (Minggu 5)

- **Pemodelan State Otoritatif**
  - State ruang, pertandingan, dan giliran dalam hash dengan field versi yang eksplisit
  - Konkurensi optimistik dengan `WATCH`/`MULTI`/`EXEC` dan loop percobaan ulang yang membuatnya aman
  - Pemodelan snapshot plus delta untuk game berbasis tick versus penulisan state penuh untuk game turn-based
- **Aturan Otoritatif Server dalam Lua**
  - Memvalidasi niat, menerapkannya, dan memancarkan event hasilnya dalam satu skrip atomik
  - Menolak langkah ilegal tanpa meninggalkan state setengah jadi
  - Menjaga skrip tetap deterministik dan menghindari perintah non-deterministik di dalamnya
- **Mendistribusikan State ke Gateway**
  - Pub/Sub untuk fan-out state sementara ke instance gateway yang menangani tiap pemain
  - Stream untuk transisi state yang harus dapat diputar ulang setelah gateway dimulai ulang
  - Masalah routing antar instance dan cara tabel routing di Redis menyelesaikannya
- **Lab Praktik**: Bangun ruang pertandingan turn-based dengan validator langkah Lua yang menolak aksi di luar giliran dan aksi ilegal, lalu fan-out pembaruan state ke dua instance gateway WebSocket melalui Pub/Sub

### Modul 6: Inventori Pemain, Ekonomi, dan Keamanan Transaksi (Minggu 6)

- **Pemodelan State Ekonomi**
  - Dompet sebagai counter integer, inventori sebagai hash, pembukaan kepemilikan sebagai set
  - Soft currency versus hard currency, dan isolasi yang dibutuhkan masing-masing
  - Jejak audit: setiap kredit dan debit dicatat, tidak pernah disimpulkan
- **Transaksi Atomik dalam Lua**
  - Periksa saldo, debit, berikan item, dan tulis entri ledger dalam satu skrip
  - Menjamin tidak ada saldo negatif saat banyak percobaan pembelian terjadi bersamaan
  - Alur perdagangan dan hadiah antar dua pemain dengan kedua sisi divalidasi secara atomik
- **Idempotensi dan Pemulihan**
  - Kunci idempotensi untuk endpoint pembelian dan reward agar percobaan ulang tidak pernah memberi dua kali
  - Menyimpan payload respons untuk pemutaran ulang dan menetapkan jendela retensi kunci
  - Jalur kompensasi untuk pemberian yang hanya terpenuhi sebagian serta alur pengembalian dana
- **Lab Praktik**: Bangun toko dengan jalur pembelian Lua yang atomik, buktikan di bawah beban bersamaan bahwa tidak ada akun yang pernah negatif, dan implementasikan klaim reward idempoten yang tahan terhadap percobaan ulang klien

### Modul 7: Event Real-Time, Chat, dan Telemetri (Minggu 7)

- **Memilih Primitif Messaging yang Tepat**
  - Pub/Sub untuk trafik sementara: chat dalam pertandingan, pembaruan lobi, ping presence
  - Stream untuk apa pun yang harus bertahan saat konsumen gagal: hasil pertandingan, pembelian, telemetri
  - Biaya kehilangan sebuah event versus biaya mengirimkannya dua kali
- **Pipeline Event yang Tahan Lama**
  - Grup produsen dan konsumen dengan `XADD`, `XREADGROUP`, `XACK`, dan `XAUTOCLAIM`
  - Mempartisi berdasarkan pertandingan atau shard, dan menyeimbangkan beban antar replika worker
  - Dead-letter stream, retensi dengan `MAXLEN`, dan pemantauan lag dengan `XLEN`
- **Chat, Moderasi, dan Sinyal Penyalahgunaan**
  - Kanal chat per ruang, pengiriman dengan batas laju, dan jendela retensi pesan
  - Menangkap sinyal moderasi ke log event untuk peninjauan di luar jalur langsung
  - Fan-out ke beberapa instance gateway dan jaminan urutan pesan yang diberikan tiap pendekatan
- **Lab Praktik**: Bangun pipeline hasil pertandingan di atas Stream dengan dead-letter stream, tambahkan chat ruang melalui Pub/Sub dengan pembatasan laju kirim, dan ukur lag konsumen saat simulasi gangguan worker

### Modul 8: Fitur Geospasial, Sosial, dan Progresi (Minggu 8)

- **Sistem Geospasial**
  - `GEOADD` dan `GEOSEARCH` untuk matchmaking berbasis jarak, acara lokal, dan papan regional
  - Papan peringkat per region dan biaya kueri radius pada skala besar
  - Menggabungkan filter geospasial dengan filter rating untuk matchmaking sadar lokasi
- **Fitur Graf Sosial**
  - Daftar teman dan permintaan pertemanan, komposisi party, dan keanggotaan guild yang dimodelkan dengan set dan hash
  - Meng-cache graf sosial dan membatalkannya saat pertemanan berubah
  - Feed aktivitas teman yang diturunkan dari sorted set berisi event terbaru
- **Progresi, Retensi, dan Counter Analitik**
  - Pelacakan aktivitas harian dan streak dengan bitmap, satu bit per pemain per hari
  - Penghitungan pemain unik dengan HyperLogLog untuk DAU, MAU, dan adopsi fitur
  - Counter achievement, progres quest, dan amplifikasi penulisan saat memperbarui banyak counter per aksi
- **Lab Praktik**: Bangun filter matchmaking sadar lokasi, papan peringkat hanya teman, dan dasbor retensi yang ditopang bitmap serta estimasi HyperLogLog

### Modul 9: Caching Konten dan Lonjakan Trafik Hari Peluncuran (Minggu 9)

- **Meng-cache Konten Game**
  - Cache-aside untuk konfigurasi, data level, katalog item, dan bundel lokalisasi
  - Caching nilai konfigurasi jarak jauh dengan TTL pendek agar perubahan live-ops cepat tersebar
  - Pilihan serialisasi untuk payload konten besar dan biaya memori masing-masing
- **Pertahanan terhadap Stampede dan Hot-Key**
  - Pembangunan ulang berbasis mutex dengan `SET NX PX` agar satu worker mengisi ulang dan yang lain menunggu sebentar
  - Jitter TTL untuk mencegah kedaluwarsa serentak pada ribuan key
  - Pemecahan hot-key saat satu key konfigurasi global menjadi key paling banyak dibaca di seluruh fleet
- **Persiapan Peluncuran dan Acara Langsung**
  - Memanaskan cache sebelum peluncuran atau acara waktu terbatas
  - Perhitungan kapasitas untuk lonjakan peluncuran: koneksi, operasi per detik, dan pertumbuhan memori
  - Strategi degradasi saat cache dingin dan database menjadi hambatan
- **Lab Praktik**: Bangun layanan konten, jalankan dengan simulasi lonjakan peluncuran 100x, dan tunjukkan kegagalan stampede tanpa mutex serta pemulihannya dengan mutex

### Modul 10: Anti-Cheat, Rate Limiting, dan Pencegahan Penyalahgunaan (Minggu 10)

- **Otoritas Server sebagai Pertahanan Utama**
  - Tidak pernah memercayai skor, posisi, timer, atau reward yang dilaporkan klien
  - Memvalidasi kewajaran di batas sistem: laju progres, frekuensi aksi, dan keabsahan reward
  - Perbedaan antara mencegah eksploit dan mendeteksinya setelah terjadi
- **Rate Limiting Terdistribusi**
  - Batas per pemain, per IP, dan per endpoint dengan token bucket Lua
  - Penegakan sliding window untuk pola buruk yang bersifat ledakan
  - Respons backpressure yang terdegradasi dengan baik alih-alih memutus pemain yang jujur
- **Sinyal Deteksi dan Respons**
  - Sinyal anomali dari counter Redis: kecepatan yang mustahil, pemberian ganda, percobaan pemutaran ulang
  - Mencatat event mencurigakan ke Stream untuk analisis di luar jalur langsung dan proses banding
  - Alur eskalasi: tandai, batasi secara senyap, dan ban, beserta state yang dibutuhkan masing-masing
- **Lab Praktik**: Bangun rate limiter berlapis untuk endpoint game, implementasikan detektor anomali pemberian reward di atas Stream, dan hasilkan laporan akun yang ditandai dari simulasi kecurangan

### Modul 11: Penskalaan, Ketersediaan, dan Biaya pada Skala Peluncuran (Minggu 11)

- **Desain Cluster untuk Beban Kerja Game**
  - Distribusi slot, hash tag untuk co-location, dan mengapa skrip lintas slot gagal di produksi
  - Memisahkan sistem panas (papan peringkat, matchmaking) dari sistem dingin (profil, arsip)
  - Konfigurasi klien: penyegaran topologi, penanganan redirect, dan connection pooling per gateway
- **Kompromi Ketersediaan dan Ketahanan**
  - Replikasi, failover otomatis, dan dampak yang terlihat pemain pada setiap mode gangguan
  - Pilihan persistensi untuk state game: apa yang harus bertahan setelah restart, dan apa yang boleh dibangun ulang dari log event
  - Pertimbangan multi-region: failover aktif-pasif untuk profil, state panas regional, dan ekspektasi konsistensi
- **Observabilitas, Kapasitas, dan Biaya**
  - Metrik yang penting: p99 latensi perintah, operasi per detik, hit rate, pemain terhubung, eviksi
  - Akuntansi memori per pemain dan per pertandingan aktif, ditambah ruang cadangan untuk failover dan fragmentasi
  - Tuas biaya: tingkatan data, kebersihan TTL key, jumlah replika, dan pemangkasan stream event secara agresif
- **Lab Praktik**: Deploy Redis Cluster, jalankan latihan failover terkendali saat simulasi trafik pertandingan, dan hasilkan rencana kapasitas dengan angka p99 latensi serta memori per pemain yang terukur

### Modul 12: Proyek Kapstone — Backend Game Multiplayer Real-Time (Minggu 12)

- **Definisi Proyek**
  - Backend game arena kompetitif online dengan lobi, matchmaking, pertandingan langsung, papan peringkat, ekonomi, dan chat
  - Redis memegang seluruh state panas: sesi, presence, antrean, ruang pertandingan, dompet, inventori, papan, dan stream telemetri
- **Persyaratan Arsitektur**
  - Setiap transisi state divalidasi di sisi server, dengan niat ilegal ditolak tanpa penulisan sebagian
  - Pemasangan matchmaking terbukti bebas double-match di bawah worker bersamaan
  - Operasi ekonomi atomik dan idempoten, dengan ledger yang dapat diaudit untuk setiap pemberian dan pembelanjaan
  - Papan peringkat tetap benar di bawah penulisan bersamaan dan selamat melewati reset musim
  - Telemetri dan hasil pertandingan terkirim setidaknya sekali melalui Stream dengan penanganan dead-letter
- **Tahapan Pengiriman**
  - Tahap 1: sesi, presence, dan rekoneksi (pola minggu 2)
  - Tahap 2: antrean matchmaking dan pemasangan atomik (pola minggu 4)
  - Tahap 3: ruang pertandingan, mata uang, dan inventori dengan pembelian idempoten (pola minggu 5-6)
  - Tahap 4: papan peringkat, chat, telemetri, dan operasional skala peluncuran (pola minggu 3, 7, 9-11)
- **Dokumen yang Harus Diserahkan**
  - Architecture decision record untuk setiap pilihan model data dan atomisitas Redis
  - Analisis mode kegagalan yang mencakup failover Redis, restart gateway, dan percobaan ulang klien yang ganda
  - Hasil load test dengan p99 latensi, throughput, dan memori per pemain bersamaan

## Proyek Akhir

Peserta membangun dan mengoperasikan backend game multiplayer lengkap: game bergaya arena dengan autentikasi, presence, antrean matchmaking berbasis skill, ruang pertandingan otoritatif, papan peringkat tiga tingkat dengan reset musiman, ekonomi soft currency dan item dengan ledger yang dapat diaudit, chat ruang, dan pipeline telemetri. Redis harus memegang seluruh kebutuhan state panas dalam sistem — sesi, presence, antrean, state ruang, dompet, inventori, papan peringkat, rate limit, dan stream event — dan setiap jalur penulisan yang menyentuh nilai pemain harus atomik, idempoten, serta divalidasi di server. Backend diserahkan dalam keadaan berjalan di Redis Cluster dengan gateway pada dua instance, latihan failover terkendali yang sudah diselesaikan saat simulasi trafik pertandingan, load test yang menunjukkan p99 latensi target pada jumlah pemain bersamaan yang diharapkan, serta architecture decision record yang menjelaskan setiap model data dan jaminan atomisitasnya.

## Kriteria Penilaian

- **Tugas**: Lab mingguan dikumpulkan sebagai repositori berisi kode yang dapat dijalankan dan tulisan singkat. Setiap lab dinilai dari kebenaran di bawah konkurensi (apakah jalur atomik benar-benar bertahan saat worker berjalan paralel), kualitas model data (apakah struktur Redis yang dipakai sesuai pola akses), dan penanganan kegagalan (rekoneksi, percobaan ulang, jalur dead-letter).
- **Kuis Modul**: Kuis singkat setelah setiap modul memverifikasi pemahaman konsep — flag sorted set dan penentuan tie-break, mengapa pemasangan harus atomik, loop percobaan ulang pada konkurensi optimistik, semantik pengiriman Pub/Sub versus Stream, dan perbedaan antara mencegah dan mendeteksi eksploit.
- **Proyek Akhir**: Kapstone dinilai terhadap persyaratan arsitektur: tidak ada transisi state ilegal yang pernah tercommit, tidak ada double-match di bawah worker bersamaan, tidak ada dompet negatif saat pembelian bersamaan, tidak ada pemberian ganda pada permintaan yang diulang, papan peringkat benar di bawah beban dan melewati reset musim, telemetri terkirim setidaknya sekali dengan dead-letter tertangani, latihan failover berhasil, dan load test memenuhi p99 latensi target.
- **Presentasi**: Peserta mempresentasikan model data, pilihan atomisitas, dan analisis mode kegagalan mereka, serta mempertahankan mengapa setiap struktur Redis dan setiap batas skrip Lua dipilih untuk sistem game terkait.

## Referensi

- [Dokumentasi Redis — Sorted Sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/)
- [Dokumentasi Redis — Scripting dengan Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [Dokumentasi Redis — Streams dan Consumer Group](https://redis.io/docs/latest/develop/data-types/streams/)
- [Dokumentasi Redis — Kueri Geospasial](https://redis.io/docs/latest/develop/data-types/geospatial/)
- [Dokumentasi Redis — Client-Side Caching](https://redis.io/docs/latest/develop/clients/client-side-caching/)
- [Dokumentasi Redis — Penskalaan dengan Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [Pola Redis — Rate Limiting](https://redis.io/docs/latest/develop/patterns/rate-limiting/)
- [Blog Redis — Cara Membangun Papan Peringkat](https://redis.io/blog/leaderboards/)
- [Redis University — RU101: Pengantar Struktur Data Redis](https://university.redis.com/courses/ru101/)

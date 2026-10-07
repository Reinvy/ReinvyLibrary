---
title: "Silabus Strategi Caching Redis"
description: "Silabus enam modul untuk merancang cache Redis produksi: pola caching, desain TTL, invalidasi, perlindungan stampede, observabilitas, dan kendali biaya."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Strategi Caching Redis

## Ringkasan

Sebagian besar tim mengadopsi Redis dalam satu sore, lalu menghabiskan bertahun-tahun memperbaiki konsekuensinya. Perintahnya sederhana, tetapi caching adalah disiplin desain: bagian yang sulit adalah memutuskan data mana yang boleh basi dan sampai kapan, menjaga cache tetap jujur ketika database berubah, serta bertahan saat satu key populer kedaluwarsa di tengah trafik penuh. Kursus enam modul ini memperlakukan cache sebagai komponen arsitektur dengan kontrak kebenaran dan biaya yang eksplisit, bukan sebagai variabel global yang diberi TTL.

Setiap modul berlangsung satu minggu dan memasangkan kuliah konsep singkat dengan lab pada instance Redis nyata (Docker Compose, `redis-cli`, serta klien Node.js atau Python). Peserta membangun satu service yang terus berkembang — API katalog produk — dan menambahkan satu persoalan caching per modul sehingga setiap trade-off dari minggu sebelumnya tetap terlihat. Kursus mengasumsikan pengetahuan SQL dan HTTP; pengalaman Redis sebelumnya tidak wajib, meskipun pemahaman struktur data Redis membantu pada Modul 1.

Di akhir kursus, peserta mampu mempertahankan rancangan cache dalam review: menyebutkan jendela basi yang dapat diterima per endpoint, menunjukkan jalur invalidasi untuk setiap key yang di-cache, dan menunjuk dashboard yang membuktikan cache bekerja sekaligus terjangkau.

## Kurikulum

### Modul 1: Pola Caching dan Jalur Baca (Minggu 1)

- **Mengapa perlu cache**
  - Anggaran latensi: request mana yang layak di-cache dan mana yang sebaiknya tetap ke database
  - Amplifikasi baca, baris panas, dan kurva biaya query identik yang berulang
- **Empat pola utama**
  - Cache-aside (lazy loading): baca ke database saat miss, isi cache hanya bila berhasil
  - Read-through: pustaka cache yang memiliki fungsi loader
  - Write-through dan write-behind: konsistensi versus latensi tulis
  - Kapan write-behind dapat diterima dan kapan ia diam-diam kehilangan data
- **Desain key**
  - Konvensi namespace: `app:v1:product:{id}` dan versioning saat skema berubah
  - Pilihan serialisasi (JSON, MessagePack) dan batas ukuran payload
  - Cache objek versus cache fragmen (daftar, hitungan, HTML hasil render)
- **Lab**: tambahkan cache-aside ke API katalog dan ukur p50/p99 dengan dan tanpa cache

### Modul 2: Desain TTL dan Kontrak Kebasian (Minggu 2)

- **Menentukan masa hidup dari aturan bisnis**
  - Menurunkan TTL dari seberapa sering data dasar benar-benar berubah
  - Kontrak kebasian per endpoint yang dituliskan, bukan ditebak
- **Mekanika TTL**
  - `EX`, `PX`, `EXAT`, serta perbedaan kedaluwarsa relatif dan absolut
  - Expiry Redis bersifat lazy plus sampling: memori dibebaskan bertahap, bukan seketika
- **Jitter dan thundering herd**
  - Menambahkan sebaran acak pada TTL agar key yang ditulis bersamaan tidak kedaluwarsa bersamaan
  - Negative caching untuk baris yang tidak ada, dengan TTL jauh lebih pendek
- **Kebijakan eviction**
  - `allkeys-lru` versus `volatile-lru` versus `noeviction`, dan mengapa `noeviction` pada cache adalah bug
  - `maxmemory` sebagai anggaran keras, dan laju eviction sebagai sinyal kesehatan
- **Lab**: instrumentasi API untuk mengeluarkan hit ratio per endpoint, lalu setel TTL dan jitter hingga mencapai target

### Modul 3: Invalidasi dan Konsistensi (Minggu 3)

- **Dua masalah sulit**
  - Dual write: database lalu cache, atau sebaliknya, dan apa yang rusak pada tiap urutan
  - Delete-on-write versus update-on-write, dan mengapa menghapus biasanya lebih aman
- **Strategi invalidasi**
  - Invalidasi berbasis key dengan `DEL` eksplisit setelah commit berhasil
  - Key berversi: naikkan `app:v2:` dan biarkan entri lama kedaluwarsa sendiri
  - Invalidasi berbasis tag menggunakan set untuk melacak keanggotaan key
  - Pub/Sub atau Streams sebagai bus invalidasi antar service
- **Kondisi balapan**
  - Balapan read-repair saat baca yang lambat mengisi ulang data basi setelah penulisan
  - Delayed double delete, dan mengapa ia hanya mitigasi, bukan solusi
- **Lab**: paksa terjadi stale read dengan penulisan bersamaan, reproduksi dalam test, lalu perbaiki

### Modul 4: Perlindungan Stampede dan Hot Key (Minggu 4)

- **Mode kegagalan**
  - Satu key populer kedaluwarsa dan ribuan request menghantam database sekaligus
  - Mengapa database yang tadinya terlihat memiliki kapasitas cukup bisa runtuh dalam hitungan detik
- **Mitigasi**
  - Rekomputasi dini probabilistik (XFetch) untuk menyegarkan sebelum kedaluwarsa
  - Distributed lock (`SET NX PX`) agar hanya satu worker yang menghitung ulang, lengkap dengan batas waktu dan fencing
  - Stale-while-revalidate: sajikan data yang sedikit basi sementara satu klien menyegarkan
  - Penggabungan request (request coalescing) di dalam proses aplikasi
- **Hot key di luar soal kedaluwarsa**
  - Kemiringan satu key dan hotspot slot pada Redis Cluster
  - Cache L1 lokal di depan Redis, beserta biaya koherensinya
- **Lab**: load test endpoint 500 rps, kedaluwarsakan hot key, dan jaga p99 tetap di bawah 200 ms

### Modul 5: Observabilitas (Minggu 5)

- **Apa yang harus dibuktikan cache**
  - Hit ratio per endpoint, latensi miss, dan biaya sebuah miss
  - Metrik sisi Redis: `keyspace_hits`, `keyspace_misses`, `evicted_keys`, `connected_clients`, `used_memory`
  - Slow log dan persentil latensi perintah dengan `LATENCY DOCTOR`
- **Praktik instrumentasi**
  - Mengeluarkan metrik dari wrapper cache, bukan dari setiap call site
  - Tracing operasi cache agar request lambat dapat diatribusikan ke cache atau database
- **Alerting**
  - Alert pada penurunan hit ratio, badai eviction, memori di atas 85%, dan lag replikasi
  - Dashboard yang menjawab "apakah cache sedang membantu?" dalam satu pandangan
- **Lab**: bangun dashboard dan tulis tiga alert yang seharusnya menangkap kegagalan dari lab sebelumnya

### Modul 6: Biaya, Kapasitas, dan Operasi (Minggu 6)

- **Menentukan ukuran instance**
  - Estimasi working set dari jumlah key nyata dan ukuran nilai rata-rata
  - Ruang cadangan untuk fragmentasi (1,2–1,5x), replika, dan buffer failover
- **Tuas biaya**
  - Meng-cache hal yang mahal dihitung, bukan yang murah diambil
  - Mengompresi nilai besar, memperpendek TTL, dan membuang cache yang tidak pernah hit
  - Trade-off managed versus self-hosted, serta egress jaringan pada setup multi-AZ
- **Keamanan operasional**
  - Pilihan persistensi untuk cache (umumnya tanpa persistensi, kadang AOF) dan apa yang hilang saat failover
  - Connection pooling, timeout, dan circuit breaker agar gangguan Redis menurunkan performa, bukan meruntuhkan sistem
- **Lab**: susun model kapasitas dan biaya untuk API katalog pada trafik 10x

## Proyek Akhir

Bangun dan dokumentasikan lapisan caching untuk service katalog e-commerce kecil. Deliverable mencakup:

- Service berjalan dengan minimal tiga endpoint ter-cache, masing-masing memiliki kontrak kebasian tertulis
- Pembacaan cache-aside, invalidasi delete-on-write, dan TTL ber-jitter
- Perlindungan stampede pada endpoint terpanas, dibuktikan dengan load test sebelum dan sesudah
- Dashboard yang menampilkan hit ratio, eviction, memori, dan p99 dengan serta tanpa cache
- Catatan desain satu halaman yang mencakup penamaan key, perilaku saat Redis mati, dan biaya bulanan pada trafik 10x saat ini

## Kriteria Penilaian

- **Lab mingguan (40%)**: setiap lab dinilai dari apakah hasil pengukuran mendukung klaim, bukan dari apakah kodenya berjalan
- **Catatan desain (10%)**: kejelasan kontrak kebasian dan penalaran invalidasi
- **Proyek akhir (40%)**: kebenaran saat terjadi kegagalan, bukti dari load test, dan model biaya yang dapat dipertahankan
- **Peer review (10%)**: kualitas komentar review pada catatan desain peserta lain

Proyek yang melaporkan hit ratio tanpa perbandingan latensi, atau model biaya tanpa estimasi working set, dinyatakan belum lengkap terlepas dari kualitas kodenya.

## Referensi

- Dokumentasi Redis: https://redis.io/docs/latest/
- Internal eviction dan expiry Redis: https://redis.io/docs/latest/develop/reference/eviction/
- Client-side caching dan connection pool Redis: https://redis.io/docs/latest/develop/clients/
- Martin Kleppmann, *Designing Data-Intensive Applications* — bab tentang replikasi dan konsistensi
- AWS Builders' Library, "Caching challenges and strategies": https://aws.amazon.com/builders-library/

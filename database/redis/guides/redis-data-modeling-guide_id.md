---
title: "Panduan Pemodelan Data dan Desain Skema Redis"
description: "Panduan praktis merancang model data Redis: konvensi penamaan kunci, pemodelan entitas dengan hash, indeks sekunder eksplisit, pemodelan relasi, desain skor sorted set, struktur penghitung dan analitik, serta evolusi skema."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Pemodelan Data dan Desain Skema Redis

## Pendahuluan

Redis bukanlah database relasional serba guna, dan memodelkan data untuk Redis adalah disiplin yang berbeda. Skema relasional dimulai dari tabel yang dinormalisasi, kunci asing, dan query planner yang bisa menggabungkannya secara dinamis. Redis tidak memiliki semua itu: setiap pembacaan adalah operasi langsung pada struktur data yang dialamatkan oleh sebuah kunci, dan struktur yang Anda pilih saat menulis adalah struktur yang Anda bayar saat membaca selama umur aplikasi tersebut.

Hal ini menjadikan pemodelan data sebagai keputusan desain dengan dampak terbesar dalam sistem berbasis Redis. Jika tata letak kunci dan pilihan struktur tepat, Redis melayani jutaan operasi per detik di perangkat keras sederhana; jika salah, Anda berakhir dengan hot key, nilai yang terlalu besar, N+1 round trip, dan migrasi yang menyentuh setiap layanan.

Panduan ini menyajikan alur kerja pemodelan yang dapat diulang: mulailah dari pola akses, bukan dari diagram entitas; berikan setiap kunci nama yang disengaja dan mengodekan tujuannya; pilih struktur terkecil yang melayani kueri dominan; bangun indeks eksplisit untuk pencarian yang tidak bisa dilakukan Redis secara native; dan rancang untuk evolusi sejak hari pertama. Setiap praktik terbaik dipasangkan dengan perintah Redis konkret, dan langkah-langkah implementasi membangun satu model data realistis — sebuah marketplace kecil — dari nol.

## Praktik Terbaik

### 1. Perlakukan Nama Kunci sebagai Bagian dari Skema

Di Redis, kunci adalah satu-satunya mekanisme pengalamatan, sehingga nama kunci membawa informasi skema yang dalam database relasional disimpan di kolom. Konvensi penamaan yang disengaja bukan sekadar kosmetik; ini adalah cara Anda memberi namespace untuk tenant, versi, dan domain data di satu server bersama.

Adopsi format konsisten yang dipisahkan titik dua dan terapkan di mana saja:

```text
<domain>:<objek>:<id>:<subfield>

user:1000                 # hash entitas
user:by-email:ada@x.com   # indeks sekunder
cart:1000                 # kontainer data per pengguna
product:by-category:books # indeks kategori
clicks:product:42:2026-09-24  # penghitung per hari
```

Aturan yang mencegah penulisan ulang yang mahal di kemudian hari:

- **Gunakan titik dua sebagai satu-satunya pemisah.** Titik dua adalah konvensi yang dipahami klien, perkakas, dan Redis itu sendiri (hash slot cluster, SCAN MATCH). Jangan mencampur `_`, `-`, dan `:` dalam satu ruang kunci.
- **Jangan pernah menyematkan data yang berubah ke dalam kunci.** Nama tampilan pengguna, alamat email, atau judul produk bersifat mutable; jika muncul di kunci, setiap pergantian nama menjadi migrasi. Simpan sebagai nilai field, bukan komponen kunci.
- **Versikan kunci, bukan nilainya.** Saat skema berubah, kunci lama dan baru bisa hidup berdampingan jika versi berada di nama: `user:1000` menjadi `user:v2:1000`. Tidak ada `ALTER TABLE` di Redis; nama kunci adalah penanda versi.
- **Gunakan ID yang stabil.** Utamakan ID numerik atau UUID yang tidak berubah daripada slug yang bisa berganti.
- **Beri namespace berdasarkan lingkungan atau tenant dengan segmen awal** (`prod:user:1000`, `tenant7:user:1000`) ketika satu instance melayani beberapa domain logis, sehingga SCAN atau flush bisa menargetkan satu namespace.

### 2. Pilih Struktur Data Berdasarkan Pola Akses, Bukan Bentuk Data

Kesalahan pemodelan paling umum adalah bertanya "data apa ini?" alih-alih "bagaimana data ini akan dibaca?". Struktur Redis adalah mesin akses terspesialisasi, sehingga pola baca menentukan struktur:

| Pola akses yang Anda butuhkan | Struktur Redis | Contoh kunci | Mengapa cocok |
|-------------------------------|----------------|--------------|---------------|
| Baca atau ubah entitas per ID | Hash | `user:1000` | Pembaruan parsial per field, encoding listpack ringkas |
| Simpan satu nilai skalar turunan | String | `user:1000:avatar-url` | Pembacaan paling sederhana, tanpa parsing |
| Tambah ke urutan berbatas | List | `queue:email:outbox` | Push/pop O(1) di kedua ujung |
| Tegakkan keunikan atau keanggotaan | Set | `user:1000:roles` | Tambah/cek/hapus O(1), dedupe otomatis |
| Peringkat per skor atau kueri rentang | Sorted Set | `leaderboard:2026:09` | Terurut per skor dengan baca rentang O(log N) |
| Log peristiwa append-only dengan replay | Stream | `order:events` | Consumer group, ID per entri, replay |
| Hitung elemen unik secara perkiraan | HyperLogLog | `analytics:visitors:2026-09-24` | Memori konstan ~12 KB pada kardinalitas apa pun |
| Lacak flag harian per pengguna | Bitmap | `analytics:active:2026-09-24` | 1 bit per pengguna, union dan hitung di tempat |

Jika satu bentuk data memetakan ke beberapa pola akses, denormalisasi menjadi beberapa kunci (Praktik 5). Satu objek yang disimpan sekali sebagai hash dan kemudian membutuhkan peringkat akan menghasilkan round trip dan kode tambahan; menyimpan objek sebagai hash dan pegangan peringkatnya sebagai member sorted set adalah bentuk ala Redis.

### 3. Modelkan Entitas sebagai Hash untuk Pembaruan Parsial dan Memori yang Ringkas

Entitas dengan beberapa field — pengguna, produk, sesi — sebaiknya berada di Hash. Setiap field diperbarui secara independen tanpa race read-modify-write, dan hash kecil disimpan dengan encoding listpack, yang bisa jauh lebih ringkas daripada string JSON:

```bash
redis-cli HSET user:1000 name "Ada Lovelace" email "ada@example.com" country "GB" \
  created-at 1695600000
redis-cli HGET user:1000 email
redis-cli HINCRBY user:1000 login-count 1
redis-cli HGETALL user:1000
```

Aturan praktis:

- **Satu hash per entitas, field untuk atribut.** Info profil, preferensi, penghitung yang menjadi bagian dari entitas.
- **Utamakan Hash daripada String+JSON untuk entitas mutable.** String JSON memaksa penulisan ulang penuh setiap kali field berubah dan tidak memiliki atomisitas per field; hash memperbarui satu field dengan satu perintah.
- **Jaga jumlah field tetap terbatas.** Hash dengan ratusan field masih bisa dipakai tetapi mulai berperilaku seperti big key; pisahkan subset yang sering diakses ke kunci sendiri (`user:1000:stats`).
- **Seluruh kunci kedaluwarsa bersamaan.** TTL berlaku pada kunci, bukan field individual. Jika field membutuhkan umur berbeda, pecah entitas menjadi dua hash dengan TTL berbeda.

### 4. Bangun Indeks Sekunder Secara Eksplisit

Redis tidak memiliki pencarian bawaan berdasarkan nilai, sehingga setiap kueri non-ID membutuhkan indeks yang Anda kelola sendiri. Pola standarnya adalah Set (atau Sorted Set) yang namanya mengodekan nilai pencarian dan member-nya berupa ID entitas:

```bash
# Temukan ID pengguna di balik sebuah email
redis-cli SADD user:by-email ada@example.com 1000
redis-cli SISMEMBER user:by-email ada@example.com

# Produk dalam satu kategori, diurutkan per harga
redis-cli ZADD product:by-category:books 29.99 5001
redis-cli ZADD product:by-category:books 12.50 5002
redis-cli ZRANGE product:by-category:books 0 9 WITHSCORES
```

Karena Redis tidak memiliki transaksi lintas kunci dengan rollback, jaga agar penulisan entitas dan penulisan indeksnya atomik menggunakan MULTI/EXEC atau skrip Lua:

```bash
redis-cli MULTI
redis-cli HSET product:5001 name "Clean Code" price 29.99 category books
redis-cli ZADD product:by-category:books 29.99 5001
redis-cli EXEC
```

Biaya indeks adalah write amplification: setiap penulisan entitas kini menyentuh dua kunci. Hanya indeks jalur pencarian yang benar-benar dibutuhkan inventaris akses (Langkah 1), dan jangan pernah mengindeks field yang tidak Anda kueri.

### 5. Modelkan Relasi dengan Mendenormalisasi ID ke dalam Koleksi

Redis tidak memiliki join, sehingga relasi dimodelkan dengan menyimpan ID entitas terkait di dalam sebuah koleksi. Jenis koleksi mengikuti kardinalitas dan urutan relasi:

- **Satu-ke-banyak, terurut per waktu**: List atau Sorted Set berisi ID anak (`user:1000:orders` dengan skor timestamp).
- **Satu-ke-banyak, hanya keanggotaan**: Set berisi ID anak (`user:1000:roles`).
- **Banyak-ke-banyak**: dua Set, satu untuk tiap arah (`user:1000:follows`, `user:1000:followers`).
- **Item terbaru berbatas**: List yang dipangkas dengan LTRIM (`user:1000:recent-items`, batas 50).

Membaca relasi adalah pola dua langkah: ambil daftar ID, lalu ambil entitasnya. Jangan pernah mengeluarkan satu round trip per ID — pipeline langkah keduanya:

```bash
# Ambil 10 pesanan terbaru pengguna 1000, lalu hash-nya dalam satu round trip
redis-cli ZREVRANGE user:1000:orders 0 9
redis-cli --pipe <<'EOF'
HGETALL order:9001
HGETALL order:9002
HGETALL order:9003
EOF
```

Imbalannya adalah duplikasi yang disengaja. Terima sedikit kebasian pada koleksi turunan dan segarkan pada peristiwa tulis, alih-alih mencoba menjaga setiap relasi konsisten secara transaksional.

### 6. Rancang Skor Sorted Set untuk Mengodekan Semantik Peringkat

Skor sorted set adalah seluruh model pengurutan, sehingga skor harus mengodekan apa yang ingin Anda urutkan — dan ini adalah tempat termurah untuk mengodekan tie-break, arah, serta jendela waktu:

```bash
# Peringkat satu angka: rating penjual
redis-cli ZADD seller:leaderboard:rating 4.9 7
redis-cli ZADD seller:leaderboard:rating 4.7 12
redis-cli ZREVRANGE seller:leaderboard:rating 0 2 WITHSCORES

# Feed terurut per waktu: timestamp sebagai skor
redis-cli ZADD newsfeed:user:1000 1695600000 post:501
redis-cli ZREVRANGEBYSCORE newsfeed:user:1000 +inf -inf LIMIT 0 10
```

- **Gunakan timestamp untuk koleksi terurut waktu.** Pengurutan, paginasi rentang, dan pemangkasan entri lama semuanya keluar dari satu skor.
- **Gabungkan peringkat dan tie-break ke dalam satu skor.** Satu double memiliki presisi terbatas, jadi gunakan pengali tetap: skor = `poin * 1000000 + tiebreak`. Ini menjaga `ZREVRANGE` tetap benar untuk peringkat utama sementara bagian pecahan memutuskan skor yang sama.
- **Koleksi panas Zipfian sebaiknya berada di jendela waktu.** Papan peringkat "sepanjang masa" global memusatkan tulis pada satu kunci; kunci berjendela (`leaderboard:2026:09`) menyebarkan beban dan membuat "bulan ini" mudah dikueri, sejalan dengan praktik sharding di Praktik 7.
- **Pilih arah secara eksplisit.** `ZREVRANGE` untuk menurun (papan peringkat, feed terbaru dulu), `ZRANGE` untuk menaik (terlama dulu, filter harga). Jangan mengodekan arah dengan skor negatif kecuali skor itu tidak memiliki makna lain.

### 7. Jaga Kunci Tetap Kecil: Pecah Berdasarkan Waktu atau Bucket

Redis mengeksekusi setiap perintah pada satu thread, sehingga kunci yang menyimpan jutaan elemen membuat setiap operasi padanya mahal dan memblokir server saat nilai besar ditransfer atau dihapus. Koleksi besar harus dibatasi atau dipecah:

- **Kunci berjendela waktu** untuk apa pun yang terakumulasi: papan peringkat, penghitung analitik, indeks peristiwa. `leaderboard:2026:09` kedaluwarsa atau diarsipkan bersama bulan tersebut.
- **Kunci pecahan bucket** untuk entitas panas: satu produk yang menerima sebagian besar trafik menjadi `product:42:0` hingga `product:42:3`, dipilih dengan `id % 4` di sisi klien.
- **List berbatas**: batasi dengan `LTRIM` setelah setiap push agar koleksi tidak tumbuh tanpa batas:

```bash
redis-cli RPUSH user:1000:recent-items 9001
redis-cli LTRIM user:1000:recent-items -50 -1
```

- **Stream berbatas** dengan `XTRIM` dan panjang maksimum, atau kebijakan umur maksimum via `XADD ... MAXLEN`.

Disiplin yang baik: sebelum menulis kunci koleksi, tanyakan berapa ukuran maksimumnya dan apa yang terjadi pada ukuran itu. Jika jawabannya "terus bertambah", pecahlah sekarang.

### 8. Berikan Masa Kedaluwarsa pada Setiap Kunci Ephemeral

Redis sering menjadi penopang data yang berumur pendek: sesi, entri cache, jendela rate-limit, token sekali pakai. Setiap kunci semacam itu membutuhkan TTL yang ditentukan saat menulis, dan TTL itu sendiri adalah bagian dari model:

```bash
# Sesi dengan umur absolut
redis-cli SETEX session:tk-81f2 3600 '{"user_id":1000}'

# Penghitung yang harus menghapus diri: setel TTL hanya pada kenaikan pertama
redis-cli INCR rate:user:1000:minute
redis-cli EXPIRE rate:user:1000:minute 60  # hanya ketika INCR mengembalikan 1
```

Setel EXPIRE secara kondisional (hanya saat penghitung baru) agar penghitung panas tidak diperbarui tanpa henti oleh kenaikan berikutnya. Untuk tampilan turunan dengan kebasian yang dapat diterima, TTL juga berfungsi sebagai mekanisme pembersihan — kunci hilang saat kedaluwarsa, tanpa pekerja pembersih.

**Waspadai thundering herd kedaluwarsa massal.** Jika 100.000 kunci membawa TTL yang sama karena ditulis secara beruntun, semuanya kedaluwarsa pada detik yang sama dan semua pembacaan miss serentak. Tambahkan sedikit jitter acak pada TTL kunci yang ditulis berkelompok dan biarkan pembacaan jatuh ke sumber kebenaran.

### 9. Rencanakan Evolusi Skema dengan Kunci Berversi

Skema Redis berevolusi, dan tidak ada perkakas migrasi, sehingga evolusi harus dirancang ke dalam nama kunci sejak awal. Alur kerja yang terbukti di produksi:

1. **Tulis versi baru di samping versi lama**: `user:1000` dan `user:v2:1000` sama-sama menerima tulis selama transisi (dual-write di aplikasi).
2. **Backfill secara lazy**: saat membaca, jika `user:v2:1000` tidak ada, bangun dari `user:1000` dan tulis kembali (gaya Write-Through) — tanpa pekerjaan offline untuk data yang sering dibaca.
3. **Backfill secara eager dengan SCAN** untuk data yang harus dimigrasi penuh sebelum cutover:

    ```bash
    redis-cli --scan --pattern 'user:*' | while read -r key; do
      redis-cli COPY "$key" "${key/user:/user:v2:}" REPLACE
    done
    ```

4. **Alihkan pembacaan dengan feature flag**, lalu hentikan dual-write.
5. **Biarkan namespace lama mati**: beri TTL pendek pada sisa kunci lama atau hapus di jendela pemeliharaan.

Versi di dalam kunci membuat kode lama dan baru aman pada server yang sama — kebiasaan paling berguna untuk higiene produksi Redis.

### 10. Hindari Anti-Pola Pemodelan

Kesalahan yang sama berulang di berbagai codebase Redis. Pelajari sebagai daftar periksa:

| Anti-pola | Akibat | Perbaikan |
|-----------|--------|-----------|
| List atau set tanpa batas | Memori tumbuh selamanya, eviction kejutan di `maxmemory` | Batas LTRIM, XTRIM, atau kunci berjendela waktu |
| Entitas atau blob JSON terlalu besar | Stall big key, replikasi dan failover lambat | Pisahkan field ke beberapa hash, pecah per bucket |
| Satu hot key per entitas populer | Satu thread memikul semua trafik kunci itu | Pecah kunci per bucket (Praktik 7) |
| Round trip per ID (N+1) | Latensi berlipat seiring ukuran daftar | Pipeline atau MGET untuk batch dalam satu round trip |
| `KEYS *` di kode produksi | Pemindaian memblokir seluruh keyspace | SCAN dengan MATCH, atau kelola indeks sungguhan |
| Tanpa TTL pada data ephemeral | Kunci basi menumpuk hingga tekanan memori | EXPIRE saat menulis (Praktik 8) |
| Prefiks sama untuk cache dan data tahan lama | Kebijakan eviction tidak bisa membedakannya | Pisahkan domain: `cache:` vs namespace tahan lama |

Anti-pola biasanya jalan pintas pemodelan yang terasa lokal dan murah saat menulis; perbaikannya selalu diputuskan satu level di atas, di tingkat desain kunci.

## Langkah Implementasi

Sisa panduan ini membangun model data lengkap untuk marketplace kecil — pengguna, produk, keranjang, papan peringkat rating penjual, dan analitik klik per produk — dengan menerapkan setiap praktik di atas.

### Langkah 1: Inventarisasi Pola Akses Sebelum Menulis Kunci Apa Pun

Mulailah dari kueri produk, bukan dari diagram entitasnya. Tuliskan setiap pembacaan yang dilakukan aplikasi, frekuensinya, dan bentuk jawaban yang dibutuhkan:

| Kueri | Frekuensi | Struktur target |
|-------|-----------|-----------------|
| Ambil profil pengguna per ID | Tinggi | Hash `user:1000` |
| Temukan pengguna per email (login) | Sedang | Indeks Set `user:by-email:<email>` |
| Daftar produk dalam kategori | Tinggi | Sorted Set `product:by-category:books` |
| Ambil halaman detail produk | Tinggi | Hash `product:5001` |
| Baca keranjang pengguna | Tinggi | Hash `cart:1000` |
| Penjual teratas per rating | Rendah | Sorted Set `seller:leaderboard:rating` |
| Pengunjung unik per hari | Sedang | HyperLogLog `analytics:visitors:2026-09-24` |
| Klik produk per hari | Sedang | String `clicks:product:5001:2026-09-24` |

Inventaris ini adalah kontrak yang harus dilayani skema. Jika sebuah kueri tidak ada di tabel ini, kueri itu belum ada — dan Anda tidak akan mendesain untuknya.

### Langkah 2: Tentukan Konvensi Penamaan Kunci

Adopsi `domain:objek:id:subfield` dengan pemisah titik dua, huruf kecil, satu kosakata per domain. Namespace marketplace:

```text
user:1000                    # hash entitas pengguna
user:by-email:ada@example.com  # indeks pencarian email
product:5001                 # hash entitas produk
product:by-category:books    # produk dari satu kategori, diskor per harga
cart:1000                   # item keranjang: productId -> kuantitas
seller:leaderboard:rating   # rating penjual, menurun
analytics:visitors:2026-09-24  # pengunjung unik harian (HyperLogLog)
clicks:product:5001:2026-09-24 # penghitung klik harian per produk
```

Tuliskan konvensi ini ke dokumentasi tim, lalu perlakukan kunci apa pun yang menyimpang sebagai bug dalam review.

### Langkah 3: Modelkan Entitas Utama dengan Hash

Pengguna dan produk adalah entitas biasa: kumpulan atribut berbatas yang diubah secara independen. Modelkan masing-masing sebagai satu Hash:

```bash
redis-cli HSET user:1000 name "Ada Lovelace" email "ada@example.com" \
  country "GB" created-at 1695600000 login-count 0
redis-cli HSET product:5001 name "Clean Code" price 29.99 \
  category books stock 42

# Pembaruan per field tanpa read-modify-write
redis-cli HINCRBY user:1000 login-count 1
redis-cli HINCRBY product:5001 stock -1

# Pembacaan penuh untuk halaman profil
redis-cli HGETALL user:1000
```

Perhatikan apa yang tidak ada di sini: tidak ada blob JSON di bawah kunci string, tidak ada kunci per field yang mengotori keyspace. Hash menjaga entitas tetap di belakang satu kunci, dapat diperbarui field demi field dan dibaca dalam satu round trip.

### Langkah 4: Buat Indeks Sekunder

Pencarian email dan daftar kategori bukan pencarian ID, sehingga keduanya mendapat indeks eksplisit yang dikelola secara atomik dengan penulisan entitas:

```bash
# Indeks email: member set = ID pengguna
redis-cli MULTI
redis-cli HSET user:1000 email "ada@example.com"
redis-cli SADD user:by-email ada@example.com 1000
redis-cli EXEC

# Pemeriksaan login
redis-cli SISMEMBER user:by-email ada@example.com

# Indeks kategori: sorted set diskor per harga, daftar terurut otomatis
redis-cli MULTI
redis-cli HSET product:5001 category books price 29.99
redis-cli ZADD product:by-category:books 29.99 5001
redis-cli EXEC

# Halaman kategori, termurah dulu
redis-cli ZRANGE product:by-category:books 0 9 WITHSCORES
```

Pembungkus MULTI/EXEC membuat penulisan entitas dan penulisan indeks atomik dari sudut pandang klien lain: tidak ada yang mengamati produk yang ada tetapi hilang dari indeks kategorinya. Jaga jumlah indeks tetap kecil — satu indeks per jalur kueri di inventaris Langkah 1, tidak lebih.

### Langkah 5: Modelkan Relasi Satu-ke-Banyak dan Banyak-ke-Banyak

Marketplace memiliki dua relasi: pesanan pengguna (satu-ke-banyak, terurut waktu) dan penjual yang diikuti pengguna (banyak-ke-banyak). Keduanya adalah koleksi ID:

```bash
# 1:N — pesanan pengguna, diskor timestamp untuk kebaruan
redis-cli ZADD user:1000:orders 1695600000 9001
redis-cli ZADD user:1000:orders 1695700000 9002

# N:N — follow di kedua arah
redis-cli SADD user:1000:follows 7
redis-cli SADD user:7:followers 1000

# Baca relasinya, lalu entitasnya — dalam satu round trip
redis-cli ZREVRANGE user:1000:orders 0 9
redis-cli --pipe <<'EOF'
HGETALL order:9001
HGETALL order:9002
EOF
```

Langkah kedua adalah kebiasaan penting untuk kinerja: jangan pernah melakukan loop per ID dan mengeluarkan satu perintah per ID. Kelompokkan pembacaan entitas (pipeline, atau MGET/HGETALL dalam satu round trip) sehingga pembacaan relasi memakan dua perintah total berapa pun ukuran daftarnya.

### Langkah 6: Kodekan Urutan dan Peringkat dengan Sorted Set

Papan peringkat penjual memberi peringkat per rating; feed produk mengurutkan per waktu. Keduanya adalah model sorted set dengan semantik skor eksplisit:

```bash
# Papan peringkat: skor = rating. Seri dipecahkan dengan menyisipkan
# tiebreak kecil, atau dengan penggabungan: skor = rating * 1000 + tiebreak_id
redis-cli ZADD seller:leaderboard:rating 4.9 7
redis-cli ZADD seller:leaderboard:rating 4.7 12
redis-cli ZINCRBY seller:leaderboard:rating 0.1 12

# 3 teratas beserta ratingnya
redis-cli ZREVRANGE seller:leaderboard:rating 0 2 WITHSCORES

# Peringkat seorang penjual, 1-indexed untuk tampilan
redis-cli ZREVRANK seller:leaderboard:rating 12
```

```bash
# Feed: skor = timestamp peristiwa, terbaru dulu
redis-cli ZADD newsfeed:user:1000 1695600000 post:501
redis-cli ZADD newsfeed:user:1000 1695680000 post:502

# Halaman 2 feed (lebih lama dari timestamp terakhir yang terlihat)
redis-cli ZREVRANGEBYSCORE newsfeed:user:1000 1695679999 -inf LIMIT 0 10
```

Karena skor adalah kunci pengurutan, menambahkan jendela waktu ke nama kunci (Praktik 7) menjaga peringkat panas tetap tersebar di banyak kunci, bukan satu.

### Langkah 7: Modelkan Penghitung dan Analitik dengan String, Bitmap, HyperLogLog

Bentuk analitik adalah penghitung, dan Redis memiliki struktur khusus untuk setiap varian:

```bash
# Penghitung biasa: klik per produk per hari
redis-cli INCR clicks:product:5001:2026-09-24
redis-cli GET clicks:product:5001:2026-09-24

# Pengguna aktif harian: satu bit per ID pengguna
redis-cli SETBIT analytics:active:2026-09-24 1000 1
redis-cli BITCOUNT analytics:active:2026-09-24

# Pengunjung unik: HyperLogLog, ~12 KB berapa pun trafiknya
redis-cli PFADD analytics:visitors:2026-09-24 "203.0.113.4"
redis-cli PFADD analytics:visitors:2026-09-24 "203.0.113.9"
redis-cli PFCOUNT analytics:visitors:2026-09-24

# Pengguna aktif mingguan: union dari tujuh bitmap harian
redis-cli BITOP OR analytics:active:week-39 \
  analytics:active:2026-09-21 analytics:active:2026-09-22 \
  analytics:active:2026-09-23 analytics:active:2026-09-24
```

Beri kunci analitik TTL saat pertama kali ditulis (Praktik 8) agar hari lama kedaluwarsa otomatis, tidak menumpuk selamanya.

### Langkah 8: Modelkan Log Peristiwa dan Deret Waktu dengan Stream

Ketika kebutuhannya adalah log append-only dengan replay terurut — peristiwa pesanan, jejak audit, deret sensor — Stream mengalahkan List karena entrinya membawa ID dan mendukung consumer group untuk pemrosesan paralel:

```bash
# Tambahkan peristiwa; ID entri adalah urutan timestamp
redis-cli XADD order:events * event created order-id 9001 amount 29.99
redis-cli XADD order:events * event shipped order-id 9001 carrier "DHL"

# Replay semua peristiwa pesanan
redis-cli XRANGE order:events - +

# Fan out ke pekerja dengan consumer group
redis-cli XGROUP CREATE order:events workers 0
redis-cli XREADGROUP GROUP workers worker-1 COUNT 10 STREAMS order:events >
```

Pilih Stream saat Anda membutuhkan replay, group, atau acknowledgment; pilih List saat Anda hanya butuh FIFO berbatas sederhana; pilih Sorted Set saat log sebenarnya adalah peringkat terurut waktu yang harus mendukung kueri rentang.

### Langkah 9: Validasi Model di Lingkungan Staging

Sebelum model mencapai produksi, verifikasi setiap kunci dengan perintah diagnostik bawaan:

```bash
# Pemeriksaan encoding: listpack = ringkas, hashtable = tumbuh melewati batas listpack
redis-cli OBJECT ENCODING user:1000

# Biaya memori satu kunci
redis-cli MEMORY USAGE user:1000

# Temukan big key di seluruh instance (hanya di luar jam sibuk)
redis-cli --bigkeys

# Temukan hot key (Redis 7+)
redis-cli --hotkeys

# Sampel keyspace, jangan pernah KEYS
redis-cli --scan --pattern 'user:*' | head -20

# Perintah lambat yang menyelinap ke produksi
redis-cli SLOWLOG GET 20
```

Tiga tanda model sehat: tidak ada kunci yang muncul di `--bigkeys`, setiap kunci entitas melaporkan encoding ringkas, dan jalur baca dari Langkah 1 masing-masing selesai dalam satu atau dua round trip.

### Langkah 10: Migrasi dan Evolusi Skema Produksi

Ketika marketplace menambahkan field baru dengan bentuk berbeda — misalnya rating penjual berpindah dari field hash ke struktur berperingkat — ikuti alur kerja kunci berversi:

```bash
# 1. Dual-write selama transisi: jaga kunci lama dan baru sinkron di aplikasi
# 2. Backfill kunci baru dari kunci lama dengan salinan SCAN berbatas
redis-cli --scan --pattern 'seller:*' | while read -r key; do
  redis-cli COPY "$key" "${key/seller:/seller:v2:}" REPLACE
done

# 3. Alihkan pembacaan di belakang feature flag, hentikan dual-write
# 4. Pensiunkan namespace lama: TTL pendek, lalu hapus di jendela pemeliharaan
redis-cli --scan --pattern 'seller:*' | while read -r key; do
  redis-cli EXPIRE "$key" 86400
done
```

Kunci berversi membuat transisi tidak terlihat oleh klien yang masih berada di jalur kode lama. Ini disiplin yang sama dengan Praktik 1: putuskan strategi migrasi saat Anda mendesain nama kunci, bukan saat Anda perlu mengganti namanya.

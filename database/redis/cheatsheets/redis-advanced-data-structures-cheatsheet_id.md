---
title: "Cheat Sheet Struktur Data Lanjutan Redis"
description: "Referensi cepat struktur data lanjutan Redis — bitmap, HyperLogLog, dan indeks geospasial — lengkap dengan perintah inti, kompleksitas waktu, dan pola penggunaan di produksi."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Struktur Data Lanjutan Redis

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Mengatur satu bit | `SETBIT key offset value` | Mengatur bit pada `offset` (0 atau 1) — O(1) |
| Membaca satu bit | `GETBIT key offset` | Mengembalikan nilai bit pada `offset` — O(1) |
| Menghitung bit yang aktif | `BITCOUNT key [start end]` | Menghitung bit yang bernilai 1, opsional pada rentang byte atau bit tertentu — O(N) |
| Mencari bit pertama yang aktif atau kosong | `BITPOS key bit [start [end]]` | Mencari bit pertama yang bernilai 0 atau 1 — O(N) |
| Operasi bitwise | `BITOP AND / OR / XOR / NOT destkey srckey [srckey ...]` | Menggabungkan satu atau lebih bitmap ke sebuah key tujuan — O(N) |
| Operasi bitfield atomik | `BITFIELD key [GET type offset] [SET type offset value] [INCRBY type offset increment]` | Mengemas beberapa counter dalam satu string dengan kontrol overflow — O(1) per sub-perintah |
| Menambah elemen HLL | `PFADD key elemen [elemen ...]` | Menambahkan elemen ke HyperLogLog — O(1) per elemen |
| Estimasi kardinalitas | `PFCOUNT key [key ...]` | Mengembalikan estimasi jumlah elemen unik; beberapa key dihitung gabungannya secara langsung — O(1) |
| Menggabungkan HyperLogLog | `PFMERGE destkey srckey [srckey ...]` | Menggabungkan beberapa HLL menjadi satu — O(N) |
| Menambah lokasi | `GEOADD key [NX atau XX] [CH] longitude latitude member [longitude latitude member ...]` | Menyimpan satu atau lebih member beserta bujur dan lintang — O(log N) per item |
| Mengambil koordinat member | `GEOPOS key member [member ...]` | Mengembalikan bujur dan lintang yang tersimpan — O(log N) |
| Jarak antar member | `GEODIST key member1 member2 [M atau KM atau FT atau MI]` | Menghitung jarak antara dua member — O(log N) |
| Geohash dari member | `GEOHASH key member [member ...]` | Mengembalikan geohash sepanjang 11 karakter per member — O(log N) |
| Pencarian radius atau kotak | `GEOSEARCH key FROMMEMBER member atau FROMLONLAT longitude latitude BYRADIUS radius unit [ASC atau DESC] [COUNT count [ANY]] [WITHCOORD] [WITHDIST] [WITHHASH]` | Mencari member di dalam radius atau kotak, opsional diurutkan berdasarkan jarak — O(N + log M) |
| Menyimpan hasil pencarian | `GEOSEARCHSTORE destkey sumber FROMMEMBER member atau FROMLONLAT longitude latitude BYRADIUS radius unit [ASC atau DESC] [COUNT count [ANY]] [WITHCOORD] [WITHDIST] [WITHHASH]` | Menjalankan pencarian geospasial lalu menyimpan hasilnya ke key baru — O(N + log M) |
| Menghapus lokasi | `ZREM key member [member ...]` | Menghapus member — entri geospasial tersimpan di dalam sorted set — O(log N) |

## Perintah Umum

### Operasi Bitmap

```bash
# Bitmap sejatinya adalah string biasa tempat setiap bit menjadi flag terpisah.
# Konvensi umum: satu bitmap per jendela waktu, ID pengguna = offset bit.

# Menandai pengguna 42 aktif pada hari tertentu
SETBIT dau:2026-09-14 42 1
# => (integer) 0        (nilai bit sebelumnya, 0 = belum diset)

# Menandai lagi — bit sudah bernilai 1
SETBIT dau:2026-09-14 42 1
# => (integer) 1        (nilai bit sebelumnya)

# Mengecek apakah pengguna 42 aktif
GETBIT dau:2026-09-14 42
# => (integer) 1

# Membaca bit yang tidak pernah diset (di luar rentang / key kosong)
GETBIT dau:2026-09-14 999
# => (integer) 0

# Total pengguna aktif pada hari itu
BITCOUNT dau:2026-09-14
# => (integer) 1

# Bit pertama yang aktif — ID pengguna terkecil dalam contoh ini
BITPOS dau:2026-09-14 1
# => (integer) 42

# Menggabungkan bitmap harian selama seminggu: pengguna yang aktif di SEMBARANG hari
BITOP OR dau:week:2026-09 dau:2026-09-08 dau:2026-09-09 dau:2026-09-10 \
  dau:2026-09-11 dau:2026-09-12 dau:2026-09-13 dau:2026-09-14
# => (integer) 6        (ukuran string tujuan dalam byte)

# Pengguna unik sepanjang minggu
BITCOUNT dau:week:2026-09
# => (integer) <jumlah pengguna unik>

# Mengemas banyak counter kecil ke dalam satu string dengan BITFIELD
BITFIELD visit:stats SET u8 0 5 INCRBY u8 8 1
# SET u8 0 5      -> menyimpan 5 di slot 8-bit pertama (offset 0)
# INCRBY u8 8 1   -> menaikkan slot 8-bit kedua (offset 8) sebesar 1
# => 1) (integer) 0     (nilai sebelumnya sebelum SET)
#    2) (integer) 1     (hasil INCRBY)

# Kontrol overflow: SAT menjepit nilai di batas tipe data
BITFIELD counter OVERFLOW SAT SET u8 0 250 INCRBY u8 0 10
# => 1) (integer) 0     (nilai sebelumnya sebelum SET)
#    2) (integer) 255   (250 + 10, dijepit di maksimum u8)
```

### Operasi HyperLogLog

```bash
# HyperLogLog adalah penghitung probabilistik: galat standar ±0,81%,
# memori konstan (±12 KB per key) berapa pun jumlah elemennya.
# Sangat cocok untuk menghitung pengunjung unik di halaman dengan trafik tinggi.

# Mencatat kunjungan berdasarkan ID pengunjung — duplikat diabaikan otomatis
PFADD hll:page:home "visitor-101" "visitor-102" "visitor-101"
# => (integer) 1        (1 = minimal ada satu elemen baru)

# Estimasi jumlah unik
PFCOUNT hll:page:home
# => (integer) 2

# Hitung gabungan TANPA menggabungkan: berikan beberapa key, Redis menghitung union di memori
PFADD hll:page:product "visitor-102" "visitor-103"
PFCOUNT hll:page:home hll:page:product
# => (integer) 3        (union = 101, 102, 103)

# Menggabungkan HLL harian ke key mingguan untuk penyimpanan jangka panjang
PFMERGE hll:week:2026-09 hll:page:home hll:page:product
PFCOUNT hll:week:2026-09
# => (integer) 3

# Memverifikasi jejak memori yang konstan
MEMORY USAGE hll:page:home
# => sekitar 12 KB berapa pun jumlah elemen yang ditambahkan
```

### Operasi Geospasial

```bash
# Entri geospasial tersimpan di dalam sorted set, dengan skor berupa
# geohash dari koordinat. PERHATIKAN urutan argumen: bujur (longitude)
# lebih dulu, baru lintang (latitude)!

# Contoh sintetis: sebuah pangkalan pengiriman dan tiga titik penjemputan
GEOADD places:base 106.8400 -6.2000 "Pos A"
GEOADD places:base 106.8500 -6.2000 "Pos B" 106.8400 -6.2100 "Pos C"

# Koordinat disimpan dengan presisi ganda penuh (wajar ada noise pembulatan)
GEOPOS places:base "Pos A"
# => 1) 1) "106.8399999141693115"
#       2) "-6.19999980926513672"

# Jarak antar dua member — satuan: m, km, ft, atau mi
GEODIST places:base "Pos A" "Pos B" km
# => "1.11"

# Member terdekat dari sebuah member, urut dari yang terdekat, beserta jaraknya
GEOSEARCH places:base FROMMEMBER "Pos A" BYRADIUS 5 km ASC WITHDIST
# => 1) 1) "Pos A"
#       2) "0.00"
#    2) 1) "Pos B"
#       2) "1.11"
#    3) 1) "Pos C"
#       2) "1.11"

# Member terdekat dari koordinat mentah (tanpa member)
GEOSEARCH places:base FROMLONLAT 106.8400 -6.2000 BYRADIUS 2 km ASC COUNT 2 WITHDIST
# => 1) 1) "Pos A"
#       2) "0.00"
#    2) 1) "Pos B"
#       2) "1.11"

# Pencarian radius berbentuk kotak, bukan lingkaran (Redis 7.0+)
GEOSEARCH places:base FROMMEMBER "Pos A" BYBOX 5 5 km ASC WITHDIST

# Menghapus lokasi — pada dasarnya member dari sorted set
ZREM places:base "Pos C"
# => (integer) 1
```

## Potongan Kode

### Pengguna Aktif Harian dengan Bitmap

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Satu bitmap per hari; ID pengguna menjadi offset bit.
async function markActive(userId) {
  const today = new Date().toISOString().slice(0, 10); // mis. "2026-09-14"
  await redis.setbit(`dau:${today}`, userId, 1);
}

// Total pengguna aktif pada suatu tanggal — satu BITCOUNT O(1) setelah penulisan.
async function activeUsersOn(date) {
  return redis.bitcount(`dau:${date}`);
}

// Pengguna unik yang aktif di beberapa hari: BITOP OR melipat semua bitmap
// menjadi satu key, lalu BITCOUNT menghitung gabungannya.
async function activeUsersBetween(dateKeys) {
  const dest = 'dau:range';
  await redis.bitop('OR', dest, ...dateKeys);
  const total = await redis.bitcount(dest);
  await redis.del(dest); // bersihkan key bantu
  return total;
}

(async () => {
  await markActive(42);
  await markActive(7);
  const today = new Date().toISOString().slice(0, 10);
  console.log('Aktif hari ini:', await activeUsersOn(today)); // 2
  console.log('Aktif dalam rentang:', await activeUsersBetween([
    'dau:2026-09-13', 'dau:2026-09-14'
  ]));
})().catch(console.error);
```

### Penghitungan Pengunjung Unik dengan HyperLogLog

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Setiap kunjungan menambahkan ID pengunjung — deduplikasi ditangani oleh HLL.
async function trackVisit(page, visitorId) {
  await redis.pfadd(`hll:${page}`, visitorId);
}

// Estimasi pengunjung unik (±0,81% pada skala besar, ±12 KB per key).
async function uniqueVisitors(page) {
  return redis.pfcount(`hll:${page}`);
}

// Pengunjung unik mingguan tanpa menyimpan hasil gabungan:
// PFCOUNT dengan banyak key menghitung union di dalam memori.
async function weeklyUniqueVisitors(dayKeys) {
  return redis.pfcount(...dayKeys);
}

(async () => {
  await trackVisit('home', 'user-1');
  await trackVisit('home', 'user-2');
  await trackVisit('home', 'user-1'); // duplikat, diabaikan
  console.log('Pengunjung unik home:', await uniqueVisitors('home')); // 2

  await trackVisit('product', 'user-2');
  await trackVisit('product', 'user-3');
  console.log('Unik mingguan:', await weeklyUniqueVisitors([
    'hll:home', 'hll:product'
  ])); // 3
})().catch(console.error);
```

### Pencarian Lokasi Terdekat dengan Indeks Geospasial

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Ingat: GEOADD menerima bujur (longitude) LEBIH DULU, lalu lintang.
async function addPlace(key, name, longitude, latitude) {
  await redis.geoadd(key, longitude, latitude, name);
}

// Redis 6.2+ — GEOSEARCH menggantikan keluarga GEORADIUS yang tidak dipakai lagi.
// Dipanggil lewat redis.call agar opsi-opsinya eksplisit.
async function findNearby(key, longitude, latitude, radiusKm, limit = 10) {
  return redis.call(
    'GEOSEARCH', key,
    'FROMLONLAT', longitude, latitude,
    'BYRADIUS', radiusKm, 'km',
    'ASC', 'COUNT', limit, 'WITHDIST'
  );
  // Mengembalikan array berisi pasangan [member, jarakKm] karena hanya
  // WITHDIST yang diminta; jika WITHCOORD ikut digunakan, tiap entri
  // menjadi [member, jarakKm, longitude, latitude].
}

// Jarak antara dua member yang tersimpan
async function distanceBetween(key, memberA, memberB) {
  return redis.geodist(key, memberA, memberB, 'km');
}

(async () => {
  await addPlace('places:jakarta', 'Monas', 106.8171, -6.1754);
  await addPlace('places:jakarta', 'Gelora Bung Karno', 106.8036, -6.2189);

  const nearby = await findNearby('places:jakarta', 106.8171, -6.1754, 10);
  console.log('Lokasi terdekat:', nearby);

  const distance = await distanceBetween(
    'places:jakarta', 'Monas', 'Gelora Bung Karno'
  );
  console.log('Jarak (km):', distance);
})().catch(console.error);
```

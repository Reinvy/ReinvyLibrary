---
title: "Tutorial Geospatial dan Pencarian Jarak dengan Redis"
description: "Menyimpan koordinat lintang dan bujur di Redis dengan GEOADD, menjalankan kueri radius dan kotak dengan GEOSEARCH, lalu membangun pencari lokasi toko yang menjawab dalam milidetik."
category: "database"
technology: "redis"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Geospatial dan Pencarian Jarak dengan Redis

## Ringkasan

Tutorial ini menunjukkan cara menyimpan koordinat di dalam sorted set Redis dan mengkuerinya berdasarkan jarak. Anda akan membangun pencari lokasi toko yang menjawab pertanyaan "cabang mana yang berjarak di bawah 5 km dari pelanggan ini?" menggunakan `GEOADD`, `GEOSEARCH`, dan `GEOSEARCHSTORE`, sekaligus memahami mengapa indeks ini tetap cepat saat datanya membesar.

## Target Audiens

- Pengembang backend dan platform yang sudah memakai Redis sebagai cache atau datastore utama.
- Tingkat menengah: sudah nyaman dengan perintah Redis dan minimal satu library klien.

## Prasyarat

- Redis 6.2 atau lebih baru agar `GEOSEARCH` tersedia (`GEORADIUS` ada sejak 3.2 tetapi sudah deprecated).
- Node.js 18+ dengan paket `redis`, atau `redis-cli` untuk langkah manual.
- Pemahaman dasar sorted set (`ZADD`, `ZRANGE`, `ZSCORE`).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan mampu:

- Menambah dan memperbarui anggota geospasial dengan `GEOADD` serta membaca kembali koordinatnya.
- Menjalankan kueri radius dan kotak pembatas dalam satuan meter, kilometer, mil, atau kaki.
- Menyimpan hasil kueri ke key baru dengan `GEOSEARCHSTORE`.
- Menjelaskan bagaimana encoding geohash mengubah pencarian jarak menjadi pemindaian rentang sorted set.

## Konteks dan Motivasi

Hampir setiap produk konsumen akhirnya membutuhkan pencarian "di sekitar saya": toko, pengemudi, restoran, stasiun pengisian daya. Implementasi naif memuat seluruh baris berisi lintang dan bujur lalu menghitung jarak Haversine di aplikasi — cukup untuk 500 data, tetapi mematikan untuk 5 juta data.

Redis menyelesaikannya dengan indeks geospasial di atas sorted set. Koordinat di-encode menjadi bilangan geohash 52-bit, disimpan sebagai score, dan kueri radius berubah menjadi beberapa pemindaian rentang ditambah penyaringan jarak. Hasilnya: pencarian di bawah satu milidetik untuk jutaan titik, tanpa infrastruktur tambahan.

## Konten Inti

### Bagaimana indeks disimpan

Key geospasial sebenarnya adalah sorted set biasa. Member adalah identitas Anda (id toko), dan score adalah geohash 52-bit hasil interleaving lintang dan bujur. Karena score terurut, titik yang berdekatan cenderung berada pada rentang score yang berdekatan — inilah inti triknya. `ZREM`, `ZSCORE`, dan `DEL` tetap bekerja, dan Anda bisa mencampur member geospasial dengan member biasa, meski jarang merupakan ide bagus.

### Menambah titik

`GEOADD key longitude latitude member` menerima **longitude lebih dulu**. Menukar urutan keduanya adalah bug paling umum di API ini: lintang harus berada di antara -85.05112878 dan 85.05112878, dan bujur di luar -180..180 akan ditolak. `GEOADD` bersifat variadik — satu panggilan bisa menyisipkan ribuan titik — dan menambahkan member yang sudah ada akan memperbarui posisinya.

### Menjalankan kueri

`GEOSEARCH` adalah perintah kueri modern. Ia menerima pusat (`FROMMEMBER` atau `FROMLONLAT`), bentuk (`BYRADIUS` atau `BYBOX`), satuan, dan modifier opsional: `ASC`/`DESC`, `COUNT n [ANY]`, serta `WITHCOORD`, `WITHDIST`, `WITHHASH`. `BYBOX` lebih murah daripada `BYRADIUS` untuk viewport peta karena langsung memetakan ke grid sel geohash, sedangkan `BYRADIUS` memerlukan penyaringan jarak pada kandidat.

`COUNT n ANY` langsung mengembalikan hasil begitu `n` kecocokan ditemukan tanpa mengurutkan semua kandidat — pilihan tepat untuk daftar autocomplete, dan pilihan salah bila Anda butuh toko yang benar-benar terdekat.

### Menyimpan hasil

`GEOSEARCHSTORE destination source ... STOREDIST` menulis hasil ke sorted set baru dengan score berupa jarak, bukan geohash. Ini memberi Anda paginasi di sisi server lewat `ZRANGE ... LIMIT`, atau cache berumur pendek berisi "toko di sekitar gudang ini" yang bisa dipakai ulang oleh request lain.

## Contoh Kode

Menyisipkan tiga cabang Jakarta dan mengkuerinya lewat `redis-cli`:

```bash
redis-cli GEOADD stores:jakarta \
    106.8229 -6.1944 "store-monas" \
    106.8456 -6.2088 "store-thamrin" \
    106.7972 -6.2615 "store-kemang"

# Toko dalam radius 3 km, terdekat lebih dulu, beserta jarak dalam km
redis-cli GEOSEARCH stores:jakarta FROMLONLAT 106.8271 -6.1754 \
    BYRADIUS 3 km ASC WITHDIST WITHCOORD COUNT 10

# Menyimpan hasil sebagai sorted set berskor jarak
redis-cli GEOSEARCHSTORE nearby:monas stores:jakarta \
    FROMMEMBER store-monas BYRADIUS 10 km ASC STOREDIST
```

Endpoint pencari toko dengan klien Node.js:

```javascript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', (err) => console.error('kesalahan redis', err));
await redis.connect();

export async function findNearbyStores({ lat, lng, radiusKm = 5, limit = 20 }) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new TypeError('lat dan lng harus berupa angka valid');
    }

    try {
        const results = await redis.geoSearchWith(
            'stores:jakarta',
            { longitude: lng, latitude: lat },
            { radius: radiusKm, unit: 'km' },
            ['WITHDIST', 'WITHCOORD'],
            { SORT: 'ASC', COUNT: limit }
        );

        return results.map(({ member, distance, coordinates }) => ({
            id: member,
            distanceKm: Number(distance),
            lat: coordinates.latitude,
            lng: coordinates.longitude,
        }));
    } catch (err) {
        console.error('geoSearchWith gagal', err);
        throw new Error('layanan pencarian toko tidak tersedia');
    }
}
```

Memuat massal dari database dalam satu pipeline:

```javascript
async function indexStores(stores) {
    const multi = redis.multi();
    for (const s of stores) {
        multi.geoAdd('stores:jakarta', {
            longitude: s.lng,
            latitude: s.lat,
            member: s.id,
        });
    }
    const replies = await multi.exec();
    console.log(`${replies.length} toko berhasil diindeks`);
}
```

## Insight Penting

- **Longitude selalu lebih dulu** di setiap perintah dan helper klien. Validasi rentangnya (-180..180 / -85.05..85.05) di tepi API Anda.
- **Presisi sekitar 0,6 meter** pada 52 bit. Jauh di bawah akurasi GPS, jadi tidak perlu indeks kedua "untuk presisi".
- **`COUNT ... ANY` menukar ketepatan dengan kecepatan.** Jangan pakai untuk "toko terdekat", hanya untuk "beberapa toko di sekitar".
- **Jarak yang dihitung adalah garis lurus**, bukan jarak tempuh. Untuk rute sebenarnya, gunakan indeks geo sebagai penyaring kandidat lalu panggil routing engine pada hasilnya.
- **Satu key per wilayah** membuat kueri lebih kecil; satu key global tetap bekerja tetapi memindai lebih banyak sel geohash.

## Langkah Berikutnya

- Tambahkan cache ber-TTL di atas hasil `GEOSEARCHSTORE` agar pergeseran peta berulang tidak menyentuh Redis sama sekali.
- Baca panduan data modeling Redis untuk memutuskan antara satu key geospasial per kota atau per negara.
- Pelajari kueri rentang sorted set untuk membangun filter "buka sekarang" di atas key yang sama.

## Kesimpulan

Indeks geospasial Redis hanyalah sorted set dengan score yang cerdas. Setelah memahami urutan argumen yang selalu longitude dulu, perbedaan `BYRADIUS` dan `BYBOX`, serta biaya `COUNT ANY`, Anda bisa merilis pencarian jarak yang melayani jutaan titik jauh di bawah satu milidetik — tanpa database tambahan, tanpa ekstensi spasial, dan tanpa job reindex latar belakang.

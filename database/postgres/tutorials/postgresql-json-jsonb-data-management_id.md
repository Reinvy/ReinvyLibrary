---
title: "Manajemen Data JSON dan JSONB di PostgreSQL"
description: "Sebuah tutorial komprehensif tentang bekerja dengan tipe data JSON dan JSONB di PostgreSQL — mulai dari penyimpanan dan kueri hingga pengindeksan, optimalisasi performa, dan pola hibrid relasional-dokumen."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Manajemen Data JSON dan JSONB di PostgreSQL

## Ringkasan

Aplikasi modern sering membutuhkan fleksibilitas penyimpanan dokumen di samping ketelitian basis data relasional. Tipe data JSON dan JSONB PostgreSQL memberikan keduanya dalam satu sistem — Anda dapat menyimpan dokumen tanpa skema, mengindeks isinya, menelusuri struktur bersarang dengan SQL, dan bahkan mencampur kolom relasional dengan atribut JSON dalam tabel yang sama. Tutorial ini mencakup seluruh perangkat: memilih antara JSON dan JSONB, menyisipkan dan menelusuri dokumen, menggunakan indeks GIN untuk performa, memperbarui nilai bersarang, dan menerapkan pola desain hibrid relasional-dokumen. Anda akan membangun katalog produk yang mendemonstrasikan setiap teknik dalam skenario realistis.

## Target Audiens

- Pengembang backend dan arsitek basis data yang ingin menambahkan fleksibilitas dokumen ke PostgreSQL tanpa memperkenalkan basis data NoSQL terpisah.
- Pengembang yang nyaman dengan SQL dasar (CREATE TABLE, SELECT, INSERT, UPDATE) yang ingin mempelajari kemampuan JSON PostgreSQL.

## Prasyarat

- PostgreSQL 12 atau lebih baru terinstal dan berjalan (kueri path JSONB membutuhkan PostgreSQL 12+; SQL/JSON `jsonpath` membutuhkan PostgreSQL 15+).
- Familiaritas dasar dengan SQL dan klien SQL (psql, pgAdmin, atau DBeaver).
- Basis data sampel untuk mengikuti contoh (semua contoh bersifat mandiri).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Memilih tipe data JSON yang tepat (JSON vs JSONB) berdasarkan kebutuhan kasus penggunaan.
- Menyisipkan, menelusuri, dan memanipulasi dokumen JSON menggunakan API operator dan fungsi PostgreSQL.
- Membuat indeks GIN pada kolom JSONB untuk pencarian dokumen yang efisien dan pemindaian indeks penuh.
- Memperbarui bidang bersarang dan elemen array dalam dokumen JSONB tanpa menulis ulang seluruh dokumen.
- Menggunakan ekspresi SQL/JSON `jsonpath` untuk kueri pencocokan pola terhadap struktur JSON.
- Mendesain tabel hibrid yang menggabungkan kolom relasional yang dinormalisasi dengan atribut JSONB yang fleksibel.
- Mengevaluasi trade-off performa antara jalur akses berorientasi dokumen dan relasional.

## Konteks dan Motivasi

Basis data relasional tradisional membutuhkan skema tetap — setiap kolom harus dideklarasikan sebelum data dimasukkan. Meskipun kekakuan ini memastikan integritas data, hal ini menciptakan gesekan ketika model data Anda berkembang pesat, ketika kategori produk yang berbeda memiliki atribut yang berbeda, atau ketika Anda mengintegrasikan API eksternal yang mengirimkan payload yang tidak dapat diprediksi.

Penyimpanan dokumen NoSQL memecahkan masalah ini dengan memperlakukan setiap catatan sebagai dokumen yang mendeskripsikan diri sendiri, tetapi mereka mengorbankan JOIN, transaksi, dan pengoptimal kueri matang yang disediakan basis data SQL.

PostgreSQL menjembatani kesenjangan ini. Dengan menyimpan dokumen JSON di dalam tabel biasa, Anda mendapatkan:

- **Fleksibilitas skema** — setiap baris dapat memiliki struktur JSON yang berbeda.
- **Kekuatan relasional** — kolom JSON berdampingan dengan kolom relasional yang diindeks, kunci asing, dan JOIN.
- **Keanekaragaman kueri** — menelusuri JSON dengan operator khusus ( `->`, `->>`, `@>`, `?` ) atau dengan SQL/JSON `jsonpath` standar.
- **Keamanan transaksi** — semua jaminan ACID yang Anda harapkan dari PostgreSQL.

Kombinasi ini membuat PostgreSQL menjadi pilihan yang sangat baik untuk katalog produk, event sourcing, penyimpanan konfigurasi, dan domain apa pun di mana bentuk data berubah seiring waktu.

## Konten Inti

### JSON vs JSONB: Memilih Tipe yang Tepat

PostgreSQL menawarkan dua tipe data JSON. Keduanya menerima masukan yang sama tetapi berbeda secara mendasar dalam penyimpanan dan kemampuan.

**JSON (penyimpanan tekstual):**
- Menyimpan teks masukan apa adanya, mempertahankan spasi, urutan kunci, dan kunci duplikat.
- Setiap operasi baca harus mengurai ulang teks, yang menambah overhead.
- Indeks JSON tidak didukung secara langsung (Anda membutuhkan indeks ekspresi pada nilai yang diekstrak).
- Berguna hanya ketika Anda harus mempertahankan representasi byte yang tepat dari masukan.

**JSONB (penyimpanan biner):**
- Mengurai masukan dan menyimpannya dalam format biner yang terdekomposisi.
- Menghilangkan spasi, mendeduplikasi kunci (nilai terakhir yang menang), dan mengurutkan kunci secara alfabetis.
- Mendukung serangkaian operator yang kaya (`@>`, `?`, `?|`, `?&`, `#-`, `||`, `->`, `->>`, `#>`, `#>>`).
- **Mendukung pengindeksan GIN** — alasan utama memilih JSONB daripada JSON.
- Sedikit lebih lambat untuk disisipkan karena overhead penguraian, tetapi secara signifikan lebih cepat untuk dibaca dan ditelusuri.

**Aturan praktis:** Selalu gunakan JSONB kecuali Anda memiliki kebutuhan spesifik untuk mempertahankan representasi teks yang tepat (misalnya, verifikasi kriptografis dari payload API mentah).

```sql
-- Buat tabel dengan kedua kolom untuk membandingkan
CREATE TABLE json_demo (
    id SERIAL PRIMARY KEY,
    data_json JSON,
    data_jsonb JSONB
);

INSERT INTO json_demo (data_json, data_jsonb)
VALUES ('{"name": "Widget", "price": 9.99}'::JSON, '{"name": "Widget", "price": 9.99}'::JSONB);

-- Perhatikan JSONB menghilangkan spasi dan mengurutkan ulang kunci
SELECT data_json AS json_col, data_jsonb AS jsonb_col FROM json_demo;
```

### Menyisipkan dan Menelusuri Data JSON

Menyisipkan JSON ke kolom JSONB sangat mudah — nilai JSON apa pun yang valid diterima. Penelusuran menggunakan keluarga operator yang mengekstrak atau menguji nilai di suatu jalur.

**Operator inti:**

```text
| Operator | Tujuan                            | Mengembalikan | Contoh                              |
|----------|-----------------------------------|---------------|-------------------------------------|
| ->       | Akses field berdasarkan kunci/indeks | JSON        | data->'name'                        |
| ->>      | Akses field berdasarkan kunci/indeks | Teks        | data->>'name'                       |
| #>       | Akses jalur bersarang              | JSON          | data #> '{address, city}'           |
| #>>      | Akses jalur bersarang              | Teks          | data #>> '{address, city}'          |
| @>       | Apakah JSONB kiri mengandung kanan? | Boolean     | data @> '{"status": "active"}'      |
| ?        | Apakah kunci tingkat atas ada?     | Boolean       | data ? 'email'                      |
| ?|       | Apakah salah satu kunci ada?       | Boolean       | data ?| array['phone', 'fax']       |
| ?&       | Apakah semua kunci ada?            | Boolean       | data ?& array['name', 'email']      |
| ||       | Gabungkan dua dokumen JSONB        | JSONB         | data || '{"source": "web"}'         |
| -        | Hapus kunci dari JSONB             | JSONB         | data - 'temporary'                  |
```

```sql
-- Buat tabel katalog produk
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sisipkan produk dengan bentuk atribut yang berbeda
INSERT INTO products (sku, name, category, attributes) VALUES
('WIDG-001', 'Standard Widget', 'hardware',
 '{"material": "steel", "weight_kg": 1.5, "color": "red", "stock": 100, "dimensions": {"width": 10, "height": 5, "depth": 2}}'),
('WIDG-002', 'Premium Widget', 'hardware',
 '{"material": "titanium", "weight_kg": 0.8, "color": "black", "stock": 50, "certified": true, "dimensions": {"width": 10, "height": 5, "depth": 2}}'),
('DIG-001', 'Basic License', 'software',
 '{"license_type": "single-user", "version": "1.0", "platforms": ["linux", "macos"], "trial_days": 30}'),
('DIG-002', 'Enterprise License', 'software',
 '{"license_type": "unlimited", "version": "2.0", "platforms": ["linux", "macos", "windows"], "trial_days": 0, "features": {"sso": true, "audit": true, "api_access": true}}'),
('SRV-001', 'Consulting Package', 'service',
 '{"hours_included": 40, "rate_per_hour": 150, "specialties": ["deployment", "training"], "remote_only": true}');

-- Kueri: dapatkan semua produk software (category adalah kolom relasional)
SELECT name, attributes->>'license_type' AS license_type
FROM products
WHERE category = 'software';

-- Kueri: temukan produk dengan nilai atribut tertentu
SELECT name, attributes->>'material' AS material
FROM products
WHERE attributes @> '{"material": "titanium"}';

-- Kueri: temukan produk di mana sebuah kunci ada
SELECT name FROM products WHERE attributes ? 'certified';

-- Kueri: akses nilai bersarang dengan operator path
SELECT name, attributes #>> '{dimensions, width}' AS width_cm
FROM products
WHERE attributes ? 'dimensions';
```

### Operator dan Fungsi JSONB

PostgreSQL menyediakan puluhan fungsi khusus JSONB. Yang paling sering digunakan tercantum di bawah ini.

```sql
-- jsonb_each: perluas kunci tingkat atas menjadi pasangan kunci/nilai
SELECT id, name, (jsonb_each(attributes)).*
FROM products
WHERE id = 1;

-- jsonb_object_keys: daftar semua kunci tingkat atas dalam dokumen JSONB
SELECT DISTINCT jsonb_object_keys(attributes) AS attribute_key
FROM products
ORDER BY attribute_key;

-- jsonb_typeof: tentukan tipe data dari suatu nilai
SELECT name,
       jsonb_typeof(attributes->'material') AS material_type,
       jsonb_typeof(attributes->'platforms') AS platforms_type,
       jsonb_typeof(attributes->'certified') AS certified_type
FROM products WHERE id = 2;

-- jsonb_pretty: format JSONB untuk keterbacaan manusia
SELECT jsonb_pretty(attributes) FROM products WHERE id = 4;

-- jsonb_array_length: hitung jumlah elemen array
SELECT name, jsonb_array_length(attributes->'platforms') AS platform_count
FROM products
WHERE attributes ? 'platforms';

-- jsonb_path_exists: uji ekspresi jsonpath (PostgreSQL 12+)
SELECT name
FROM products
WHERE jsonb_path_exists(attributes, '$.platforms[*] ? (@ == "windows")');

-- jsonb_path_query: ekstrak nilai yang cocok dengan ekspresi jsonpath
SELECT name, jsonb_path_query(attributes, '$.specialties[*]') AS specialty
FROM products
WHERE attributes ? 'specialties';
```

### Pengindeksan JSONB dengan GIN

Tanpa indeks, kueri apa pun yang memfilter atribut JSONB melakukan pemindaian sekuensial — dapat diterima untuk tabel kecil tetapi bencana pada skala besar. PostgreSQL menyediakan **indeks GIN (Generalized Inverted Index)** yang dirancang untuk JSONB.

```sql
-- Indeks GIN default: mendukung operator @>, ?, ?|, ?&
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Periksa rencana kueri sebelum dan sesudah indeks
EXPLAIN ANALYZE
SELECT name FROM products WHERE attributes @> '{"material": "titanium"}';
```

Indeks GIN default menangani pemeriksaan kandungan (`@>`), keberadaan (`?`, `?|`, `?&`), dan pemeriksaan kesetaraan pada jalur penuh. Untuk pemeriksaan kesetaraan nilai seperti `attributes->>'color' = 'red'`, Anda membutuhkan pendekatan berbeda:

```sql
-- Indeks ekspresi untuk jalur atribut tertentu
CREATE INDEX idx_products_color ON products ((attributes->>'color'));

-- Sekarang kueri ini menggunakan indeks ekspresi
EXPLAIN ANALYZE
SELECT name FROM products WHERE attributes->>'color' = 'red';
```

**Pertimbangan indeks GIN:**

- Indeks GIN **lebih besar** daripada indeks B-tree — harapkan 2–3× ukuran data JSONB itu sendiri.
- Operasi tulis ke kolom JSONB yang diindeks GIN **lebih lambat** karena setiap pasangan kunci-nilai harus dimasukkan ke dalam indeks terbalik.
- Untuk beban kerja yang menelusuri banyak jalur atribut yang berbeda, indeks GIN JSONB default sangat ideal. Untuk beban kerja yang selalu memfilter pada 2–3 jalur yang sama, indeks ekspresi pada jalur tersebut lebih ringkas dan lebih cepat.
- Gunakan kelas operator `jsonb_path_ops` untuk indeks yang lebih kecil dan lebih cepat ketika Anda hanya menggunakan kueri `@>`:

```sql
-- Lebih kecil dan lebih cepat untuk kueri kontainmen saja
CREATE INDEX idx_products_attributes_path_ops
ON products USING GIN (attributes jsonb_path_ops);
```

### Memperbarui dan Memodifikasi Dokumen JSONB

PostgreSQL memperlakukan JSONB sebagai tipe nilai — memperbarui bidang bersarang akan menulis ulang seluruh kolom. Fungsi `jsonb_set()` membantu dengan menyediakan API berbasis jalur untuk pembaruan yang ditargetkan.

```sql
-- Perbarui satu bidang bersarang (PostgreSQL 9.5+)
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{stock}',
    '75'::jsonb,
    true   -- create_if_missing
)
WHERE sku = 'WIDG-001';

-- Perbarui kunci bersarang di dalam objek
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{dimensions, width}',
    '12'::jsonb
)
WHERE sku = 'WIDG-001';

-- Tambahkan ke array JSONB
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{platforms}',
    attributes->'platforms' || '["freebsd"]'::jsonb
)
WHERE sku = 'DIG-002';

-- Hapus kunci dari JSONB
UPDATE products
SET attributes = attributes - 'trial_days'
WHERE sku = 'DIG-002';

-- Hapus kunci bersarang
UPDATE products
SET attributes = attributes #- '{dimensions}'
WHERE sku = 'WIDG-001';

-- Tambah atau timpa beberapa kunci dengan concatenation
UPDATE products
SET attributes = attributes || '{"color": "blue", "weight_kg": 1.2}'::jsonb
WHERE sku = 'WIDG-001';
```

**Penting:** Setiap UPDATE menulis ulang seluruh nilai JSONB. Jika dokumen Anda besar (100 KB+) dan Anda sering memperbaruinya, pertimbangkan untuk menormalisasi bidang yang sering berubah menjadi kolom biasa.

### Ekspresi JSON Path (SQL/JSON)

PostgreSQL 12 memperkenalkan bahasa SQL/JSON `jsonpath` — sintaks ekspresi yang kuat untuk pencocokan pola dalam dokumen JSON. PostgreSQL 15 menambahkan `jsonb_set_lax()` dan fungsi standar SQL/JSON yang lengkap.

```sql
-- jsonb_path_exists: uji pola tanpa mengekstrak
SELECT name FROM products
WHERE jsonb_path_exists(attributes, '$.features ? (@.sso == true)');

-- jsonb_path_query: ekstrak elemen yang cocok sebagai kumpulan baris
SELECT name, jsonb_path_query(attributes, '$.platforms[*]') AS platform
FROM products
WHERE attributes ? 'platforms';

-- jsonb_path_match: mengembalikan true hanya jika ekspresi path bernilai true
-- (path harus berupa ekspresi boolean)
SELECT name FROM products
WHERE jsonb_path_match(attributes,
    '$.license_type == "unlimited" && $.features.api_access == true');

-- Filter dengan wildcard dan rentang
SELECT name, attributes->>'weight_kg' AS weight
FROM products
WHERE jsonb_path_exists(attributes,
    '$.weight_kg ? (@ >= 0.5 && @ <= 2.0)');
```

**Referensi cepat tata bahasa jsonpath:**

| Ekspresi | Arti |
|------------|---------|
| `$.key` | Akses kunci di akar |
| `$.a.b.c` | Navigasi objek bersarang |
| `$.arr[*]` | Buka semua elemen array |
| `$.arr[0, -1]` | Elemen array pertama dan terakhir |
| `$ ? (@.price > 10)` | Predikat filter |
| `$.key.type()` | Kembalikan tipe (string, number, boolean, array, object) |
| `$.key.double()` | Cast ke double untuk perbandingan |

### Pola Hibrid Relasional-Dokumen

Kekuatan sebenarnya dari JSONB PostgreSQL muncul ketika Anda menggabungkan kolom relasional dengan atribut dokumen dalam tabel yang sama. Bagian ini mendemonstrasikan tiga pola umum.

**Pola 1: Kolom bersama + atribut fleksibel**

Normalisasi bidang yang harus dimiliki setiap catatan dan sering ditelusuri atau diindeks; gunakan JSONB untuk atribut opsional atau spesifik kategori.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Info pengiriman disimpan dalam JSONB untuk fleksibilitas
INSERT INTO orders (customer_id, status, total_amount, metadata) VALUES
(1, 'shipped', 149.99,
 '{"shipping": {"method": "express", "tracking": "1Z999AA10123456784", "estimated_delivery": "2026-08-01"},
   "gift": true,
   "notes": "Leave at front door"}'),
(2, 'pending', 29.99,
 '{"shipping": {"method": "standard"},
   "coupon_code": "SAVE10"}');

-- Filter relasional + filter JSONB digabungkan
SELECT id, total_amount, metadata->'shipping'->>'method' AS shipping_method
FROM orders
WHERE status = 'shipped'
  AND metadata @> '{"shipping": {"method": "express"}}';
```

**Pola 2: Event sourcing dengan payload JSONB**

Simpan setiap event domain sebagai baris, dengan body event sebagai dokumen JSONB. Pola ini fundamental untuk log audit, CQRS, dan kueri temporal.

```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_aggregate
    ON events (aggregate_type, aggregate_id, version);

-- Rekonstruksi status terkini dari sebuah aggregate
SELECT payload FROM events
WHERE aggregate_type = 'order' AND aggregate_id = 'a1b2c3d4-...'
ORDER BY version DESC
LIMIT 1;
```

**Pola 3: Penyimpanan konfigurasi**

Simpan konfigurasi aplikasi sebagai dokumen, memanfaatkan kemampuan JSONB untuk menampung nilai hierarkis arbitrer sambil menjaga antarmuka pengambilan tetap sederhana dengan `@>` dan kueri path.

```sql
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    service VARCHAR(100) UNIQUE NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config (service, environment, settings) VALUES
('auth-service', 'production',
 '{"jwt": {"ttl_seconds": 3600, "algorithm": "RS256"}, "rate_limit": {"requests": 100, "window_seconds": 60}, "features": {"mfa": true}}'),
('payment-service', 'production',
 '{"gateway": "stripe", "webhook_secret": "...", "retry_policy": {"max_attempts": 3, "backoff_ms": 1000}}');

-- Temukan semua layanan yang memiliki MFA diaktifkan
SELECT service, settings->'jwt'->>'algorithm' AS jwt_algo
FROM config
WHERE settings @> '{"features": {"mfa": true}}';
```

### Pertimbangan Performa

JSONB kuat tetapi tidak gratis. Ingatlah panduan berikut.

**Kapan menggunakan JSONB:**
- Atribut yang jarang atau polimorfik yang berbeda per baris (katalog produk, preferensi pengguna).
- Skema yang berkembang pesat di mana ALTER TABLE akan mengganggu.
- Dokumen kecil yang tertanam (di bawah 100 KB) yang lebih sering dibaca daripada ditulis.
- Payload event dan log audit di mana setiap baris memiliki struktur yang unik.

**Kapan menggunakan kolom relasional sebagai gantinya:**
- Bidang yang muncul dalam klausa WHERE dengan operator selain `@>`, `?`, atau ekspresi path (misalnya, kueri rentang, LIKE, JOIN kunci asing).
- Bidang yang membutuhkan batasan NOT NULL atau batasan CHECK.
- Bidang yang sering diperbarui pada dokumen besar (setiap UPDATE menulis ulang seluruh nilai JSONB).
- Data yang harus diagregasi dengan SUM, AVG, atau GROUP BY di banyak baris — kolom relasional aman tipe dan ramah indeks.

**JSONB bukan pengganti desain skema.** Normalisasi yang bijaksana masih unggul untuk jalur yang kritis terhadap performa. Gunakan JSONB untuk tepi fleksibel dari model data Anda, bukan untuk hubungan inti.

## Contoh Kode

Skrip mandiri berikut membuat tabel katalog produk dan menjalankan semua kueri yang didemonstrasikan dalam tutorial ini. Anda dapat menjalankannya langsung terhadap instance PostgreSQL 15+ mana pun.

```sql
-- =============================================================
-- PostgreSQL JSON/JSONB Tutorial — Skrip Contoh Lengkap
-- =============================================================

-- 1. Setup tabel
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Data seed
INSERT INTO products (sku, name, category, attributes) VALUES
('WIDG-001', 'Standard Widget', 'hardware',
 '{"material": "steel", "weight_kg": 1.5, "color": "red", "stock": 100, "dimensions": {"width": 10, "height": 5, "depth": 2}}'),
('WIDG-002', 'Premium Widget', 'hardware',
 '{"material": "titanium", "weight_kg": 0.8, "color": "black", "stock": 50, "certified": true, "dimensions": {"width": 10, "height": 5, "depth": 2}}'),
('DIG-001', 'Basic License', 'software',
 '{"license_type": "single-user", "version": "1.0", "platforms": ["linux", "macos"], "trial_days": 30}'),
('DIG-002', 'Enterprise License', 'software',
 '{"license_type": "unlimited", "version": "2.0", "platforms": ["linux", "macos", "windows"], "trial_days": 0, "features": {"sso": true, "audit": true, "api_access": true}}'),
('SRV-001', 'Consulting Package', 'service',
 '{"hours_included": 40, "rate_per_hour": 150, "specialties": ["deployment", "training"], "remote_only": true}');

-- 3. Kueri JSON dasar
-- 3a. Ekstrak nilai teks
SELECT name, attributes->>'license_type' AS license_type
FROM products
WHERE category = 'software';

-- 3b. Pemeriksaan kontainmen
SELECT name, attributes->>'material' AS material
FROM products
WHERE attributes @> '{"material": "titanium"}';

-- 3c. Pemeriksaan keberadaan kunci
SELECT name FROM products WHERE attributes ? 'certified';

-- 3d. Akses jalur bersarang
SELECT name, attributes #>> '{dimensions, width}' AS width_cm
FROM products
WHERE attributes ? 'dimensions';

-- 4. Fungsi array dan objek
SELECT name, jsonb_array_length(attributes->'platforms') AS platform_count
FROM products
WHERE attributes ? 'platforms';

-- 5. Indeks GIN
CREATE INDEX idx_products_attributes_gin ON products USING GIN (attributes);

-- 6. Pembaruan JSONB
UPDATE products SET attributes = jsonb_set(
    attributes, '{stock}', '75'::jsonb, true
) WHERE sku = 'WIDG-001';

UPDATE products SET attributes = attributes || '{"color": "blue"}'::jsonb
WHERE sku = 'WIDG-001';

-- 7. Kueri JSON path (PostgreSQL 15+)
SELECT name FROM products
WHERE jsonb_path_exists(attributes, '$.features ? (@.sso == true)');

SELECT jsonb_path_query(attributes, '$.specialties[*]') AS specialty
FROM products WHERE attributes ? 'specialties';
```

## Insight Penting

- **JSONB daripada JSON selalu:** Format biner JSONB, dukungan pengindeksan, dan kumpulan operator yang kaya menjadikannya pilihan yang tepat untuk hampir semua beban kerja. Cadangkan JSON untuk kasus tepi di mana ketepatan teks penting.
- **Indeks GIN adalah tuas performa Anda:** Kolom JSONB tanpa indeks GIN memaksa pemindaian sekuensial. Buat `USING GIN (attributes)` pada tabel mana pun yang memfilter atribut JSONB pada waktu kueri.
- **jsonb_set() adalah kemudahan, bukan peluru ajaib:** Di balik layar, setiap panggilan `jsonb_set()` menulis ulang seluruh dokumen. Untuk dokumen di atas 100 KB yang menerima pembaruan parsial yang sering, ekstrak bidang yang sering berubah menjadi kolom biasa.
- **Pemodelan hibrid adalah fitur utamanya:** Pola yang paling berdampak bukanlah tabel all-JSONB tetapi tabel dengan beberapa kolom relasional untuk jalur akses inti dan kolom JSONB untuk atribut fleksibel. Ini memberi Anda integritas referensial di tempat yang penting dan fleksibilitas di tempat yang Anda butuhkan.
- **jsonpath membuka kunci kueri kompleks:** Fungsi `jsonb_path_exists()` dan `jsonb_path_query()` memungkinkan Anda mengekspresikan logika pencocokan yang membutuhkan kode prosedural dengan API berbasis operator. Investasikan waktu untuk mempelajari `jsonpath` — ini akan berguna untuk struktur dokumen yang tidak sepele.
- **Tidak ada pencarian teks lengkap pada nilai JSONB:** Operator `@>` menguji kontainmen, bukan pencocokan substring. Jika Anda perlu mencari di dalam nilai string JSONB, gunakan pencarian teks lengkap PostgreSQL dengan `to_tsvector()` pada field teks yang diekstrak atau indeks pencarian khusus.

## Langkah Berikutnya

- Pelajari bagaimana [Pencarian Teks Lengkap PostgreSQL](/database/postgres/tutorials/postgresql-full-text-search-tutorial) melengkapi JSONB untuk beban kerja pencarian hibrid.
- Pelajari [Panduan Penyetelan Performa PostgreSQL](/database/postgres/guides/postgresql-performance-tuning-guide) untuk cakupan lebih dalam tentang internal indeks GIN dan strategi optimalisasi penulisan.
- Jelajahi [Silabus PostgreSQL](/database/postgres/syllabi/postgresql-syllabus) untuk jalur pembelajaran terstruktur.
- Berlatih dengan [Kartu Referensi Kueri PostgreSQL](/database/postgres/cheatsheets/postgresql-query-cheatsheet) untuk referensi cepat tentang operator JSONB.

## Kesimpulan

Tipe data JSON dan JSONB PostgreSQL memungkinkan Anda menjembatani dunia basis data relasional dan dokumen tanpa meninggalkan keamanan dan kedewasaan satu RDBMS. Anda mempelajari cara memilih antara JSON dan JSONB, menelusuri dokumen bersarang dengan operator dan fungsi, mempercepat pencarian dengan indeks GIN, memperbarui dokumen parsial dengan `jsonb_set()`, dan mendesain tabel hibrid yang mendapatkan yang terbaik dari kedua paradigma. Inti dari semuanya adalah penempatan strategis — gunakan JSONB untuk tepi yang fleksibel dan polimorfik dari model data Anda sambil menjaga hubungan inti Anda di kolom relasional yang berskema baik. Keseimbangan ini memberi Anda fleksibilitas skema di tempat yang bernilai dan ketelitian relasional di tempat yang paling penting.

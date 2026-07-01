---
title: "Tutorial Pencarian Teks Lengkap PostgreSQL"
description: "Tutorial komprehensif tentang mesin pencarian teks lengkap bawaan PostgreSQL — dari dasar tsvector dan tsquery hingga perangkingan, pencarian berbobot, dan penggunaan di produksi."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial Pencarian Teks Lengkap PostgreSQL

## Ringkasan

PostgreSQL dilengkapi dengan mesin pencarian teks lengkap (full-text search) kelas produksi yang dapat mendukung fitur pencarian tanpa ketergantungan pada layanan eksternal seperti Elasticsearch atau Algolia. Tutorial ini mencakup seluruh tumpukan — dari normalisasi teks dengan tsvector dan pencocokan kueri dengan tsquery hingga perangkingan relevansi, pencarian berbobot di beberapa kolom, penyorotan hasil, dan optimalisasi performa dengan indeks GIN. Anda akan membangun repositori dokumen yang dapat dicari dan mempelajari pola yang dapat diskalakan dari blog kecil hingga sistem konten enterprise.

## Target Audiens

- Pengembang backend dan administrator basis data yang membangun fitur pencarian untuk aplikasi.
- Pengembang dengan pengetahuan dasar PostgreSQL yang ingin mengganti kueri `LIKE` atau `ILIKE` sederhana dengan pencarian teks lengkap yang tepat.

## Prasyarat

- PostgreSQL versi 12 atau lebih baru yang sudah terinstal dan berjalan.
- Familiar dengan SQL dasar (CREATE TABLE, INSERT, SELECT).
- Akses ke instans PostgreSQL dengan psql atau klien SQL lainnya.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Memahami tipe data tsvector dan tsquery serta cara keduanya memodelkan teks untuk pencarian.
- Membuat indeks GIN untuk mempercepat kueri teks lengkap.
- Menulis kueri pencarian menggunakan `@@`, `to_tsvector`, dan `to_tsquery`.
- Memberi peringkat hasil pencarian berdasarkan relevansi dengan `ts_rank` dan `ts_rank_cd`.
- Mengimplementasikan pencarian berbobot di beberapa kolom (judul vs konten).
- Menggunakan `ts_headline` untuk menyorot istilah yang cocok dalam cuplikan hasil.
- Mengonfigurasi kamus pencarian teks dan tesaurus khusus bahasa.
- Membandingkan performa pencarian teks lengkap dengan pencocokan pola `ILIKE`.

## Konteks dan Motivasi

Fitur pencarian dalam aplikasi sering dimulai dengan sederhana — `WHERE title LIKE '%kata%'` — dan dengan cepat menjadi masalah performa dan akurasi. Kueri `ILIKE` tidak dapat menggunakan indeks secara efisien dengan wildcard di awal, tidak dapat memahami varian kata (mencari "lari" tidak akan cocok dengan "berlari" atau "larian"), dan tidak menawarkan cara untuk memberi peringkat hasil berdasarkan relevansi.

Pencarian teks lengkap (FTS) PostgreSQL menyelesaikan semua masalah ini secara native. FTS menormalkan kata ke bentuk akarnya (leksem), mendukung hasil yang diperingkat dengan kolom berbobot, dan memanfaatkan indeks GIN untuk pencarian sub-milidetik di jutaan dokumen. Untuk banyak aplikasi — blog, situs dokumentasi, katalog e-commerce, basis pengetahuan — FTS PostgreSQL menghilangkan kebutuhan akan layanan pencarian terpisah, mengurangi kompleksitas operasional dan biaya.

## Konten Inti

### Memahami tsvector dan tsquery

Pencarian teks lengkap PostgreSQL dibangun di atas dua tipe data khusus:

**tsvector** — Dokumen teks yang dipecah menjadi token ternormalisasi (leksem) dengan informasi posisi. Teks masukan diurai, diubah menjadi huruf kecil, kata-kata berhenti (stop words) dihapus, dan setiap kata direduksi ke akar linguistiknya (stemming).

```text
Input:  "Kucing coklat yang cepat melompati anjing malas"
Output: 'anjing':5 'cepat':3 'coklat':2 'kucing':1 'malas':6 'lompat':4
```

Perhatikan: "melompati" menjadi "lompat", "malas" tetap "malas", dan kata-kata berhenti seperti "yang" dihapus seluruhnya. Setiap entri mencatat posisi kata dalam teks asli.

**tsquery** — Ekspresi kueri pencarian ternormalisasi yang menggabungkan leksem dengan operator boolean:
- `&` — DAN (kedua istilah harus cocok)
- `|` — ATAU (salah satu istilah boleh cocok)
- `!` — TIDAK (istilah tidak boleh cocok)
- `<->` — DIIKUTI OLEH (istilah muncul berurutan)
- `<N>` — JARAK (istilah muncul dalam N kata)

```text
Kueri: 'kucing & coklat'
Kueri: 'kucing <-> coklat'       -- "kucing" langsung diikuti "coklat"
Kueri: 'kucing <2> coklat'       -- "kucing" dalam 2 kata dari "coklat"
```

Operator pencocokan `@@` menguji apakah tsvector memenuhi tsquery:

```sql
SELECT to_tsvector('indonesian', 'Kucing coklat yang cepat') @@ to_tsquery('indonesian', 'kucing & coklat');
-- true

SELECT to_tsvector('indonesian', 'Kucing coklat yang cepat') @@ to_tsquery('indonesian', 'lambat | kura');
-- false
```

### Menyiapkan Repositori Dokumen yang Dapat Dicari

Mari bangun sistem basis pengetahuan yang dapat dicari. Mulai dengan tabel dan isi dengan contoh artikel:

```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Anonim',
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    search_vector tsvector
);

INSERT INTO articles (title, body, author) VALUES
('Memulai dengan PostgreSQL',
 'PostgreSQL adalah sistem basis data relasional open-source yang kuat. Ini mendukung tipe data lanjutan, pengindeksan, dan kemampuan pencarian teks lengkap.',
 'Alice'),
('Strategi Pengindeksan Lanjutan',
 'Pengindeksan sangat penting untuk performa basis data. Indeks B-tree, Hash, GiST, GIN, dan BRIN masing-masing melayani kasus penggunaan yang berbeda. Memahami kapan menggunakan setiap tipe secara dramatis meningkatkan performa kueri.',
 'Bob'),
('Pencarian Teks Lengkap di PostgreSQL',
 'PostgreSQL menyediakan pencarian teks lengkap bawaan melalui tipe data tsvector dan tsquery. Fitur ini memungkinkan Anda mengimplementasikan pencarian canggih tanpa ketergantungan eksternal.',
 'Alice'),
('Optimalisasi Performa Basis Data',
 'Optimasi kueri melibatkan pemahaman rencana eksekusi, pengindeksan yang tepat, connection pooling, dan penyesuaian konfigurasi. Pemeliharaan rutin seperti VACUUM dan ANALYZE sangat penting.',
 'Charlie'),
('Pengantar JSON di PostgreSQL',
 'PostgreSQL menawarkan dukungan JSON yang kuat dengan tipe data JSON dan JSONB. JSONB menyediakan pengindeksan dan kueri data semi-terstruktur yang efisien.',
 'Bob');
```

### Menghasilkan Kolom tsvector

Memelihara kolom `search_vector` secara manual rentan terhadap kesalahan. Pendekatan yang direkomendasikan adalah menggunakan trigger yang memperbaruinya secara otomatis pada setiap operasi INSERT atau UPDATE:

```sql
CREATE OR REPLACE FUNCTION articles_search_update()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('indonesian', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('indonesian', COALESCE(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articles_search
    BEFORE INSERT OR UPDATE
    ON articles
    FOR EACH ROW
    EXECUTE FUNCTION articles_search_update();
```

**Mengapa pencarian berbobot?** Fungsi `setweight` memberikan label bobot (`A`, `B`, `C`, atau `D`) ke setiap fragmen tsvector. Saat kita melakukan kueri nanti, kecocokan di judul (bobot A) dapat diperingkat lebih tinggi daripada kecocokan di konten (bobot B). Ini menghasilkan hasil yang lebih relevan.

Terapkan trigger ke baris yang sudah ada:

```sql
UPDATE articles SET title = title WHERE search_vector IS NULL;
-- Trigger akan mengisi search_vector untuk setiap baris

SELECT id, title, search_vector FROM articles LIMIT 3;
```

### Membuat Indeks GIN

Tanpa indeks, setiap pencarian teks lengkap melakukan pemindaian sekuensial. Indeks GIN (Generalized Inverted Index) mempercepat kueri `@@` secara dramatis:

```sql
CREATE INDEX idx_articles_search
    ON articles
    USING GIN (search_vector);
```

Indeks GIN menyimpan setiap leksem sebagai kunci dengan pointer ke baris yang mengandungnya — struktur data inti yang sama yang digunakan oleh mesin pencari. Kueri yang sebelumnya membutuhkan puluhan milidetik dapat selesai dalam waktu sub-milidetik pada tabel yang diindeks dengan benar dengan jutaan baris.

### Menulis Kueri Pencarian Teks Lengkap

Sekarang mari kita cari artikel kita:

```sql
-- Pencocokan sederhana: temukan artikel yang mengandung "pengindeksan"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('indonesian', 'pengindeksan');

-- Kombinasi boolean: "pengindeksan" DAN "performa"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('indonesian', 'pengindeksan & performa');

-- ATAU: "basis" ATAU "json"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('indonesian', 'basis | json');

-- Negasi: "pencarian" tetapi TIDAK "json"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('indonesian', 'pencarian & !json');
```

**Konstruktor tsquery yang berbeda:**

```sql
-- to_tsquery: membutuhkan input yang sudah diproses dengan operator
SELECT to_tsquery('indonesian', 'pengindeksan & performa');
-- 'pengindeks' & 'performa'

-- plainto_tsquery: mengonversi teks biasa ke tsquery (AND antar kata)
SELECT plainto_tsquery('indonesian', 'pengindeksan performa');
-- 'pengindeks' & 'performa'

-- phraseto_tsquery: mengonversi teks biasa menjadi pencarian frasa
SELECT phraseto_tsquery('indonesian', 'pencarian teks lengkap');
-- 'pencarian' <-> 'teks' <-> 'lengkap'
```

Untuk kotak pencarian yang digunakan pengguna, `plainto_tsquery` adalah pilihan teraman karena pengguna secara alami mengetik kata kunci yang dipisahkan spasi:

```sql
SELECT id, title
FROM articles
WHERE search_vector @@ plainto_tsquery('indonesian', 'basis data pengindeksan');
```

### Memberi Peringkat Hasil Pencarian

Peringkat relevansi menentukan hasil mana yang muncul pertama. PostgreSQL menyediakan dua fungsi peringkat:

**`ts_rank`** — Memberi peringkat berdasarkan frekuensi istilah (TF) dan frekuensi dokumen terbalik (IDF). Kecocokan di dokumen pendek mendapat peringkat lebih tinggi daripada di dokumen panjang.

**`ts_rank_cd`** — Memberi peringkat berdasarkan kepadatan cakupan: seberapa dekat istilah yang cocok satu sama lain. Hasil di mana istilah muncul berkelompok mendapat peringkat lebih tinggi.

```sql
SELECT
    id,
    title,
    ts_rank(search_vector, query) AS rank
FROM articles, plainto_tsquery('indonesian', 'basis data pengindeksan') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- Sertakan cuplikan konten untuk konteks
SELECT
    id,
    title,
    ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('indonesian', 'pengindeksan & performa') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

Karena kita menggunakan `setweight` (judul bobot A, konten bobot B), kecocokan judul secara alami berkontribusi lebih banyak pada peringkat. Anda juga dapat melewatkan opsi normalisasi:

```sql
-- Normalisasi peringkat berdasarkan panjang dokumen (1=bagi dengan panjang)
SELECT
    id,
    title,
    ts_rank(search_vector, query, 1) AS rank_ternormalisasi
FROM articles, plainto_tsquery('indonesian', 'basis data') AS query
WHERE search_vector @@ query
ORDER BY rank_ternormalisasi DESC;
```

### Menyorot Hasil Pencarian dengan ts_headline

Menampilkan hasil pencarian dengan istilah yang cocok disorot meningkatkan pengalaman pengguna. Fungsi `ts_headline` menghasilkan cuplikan dengan istilah yang cocok dibungkus dalam tag `<b>`:

```sql
SELECT
    id,
    title,
    ts_headline('indonesian', body, query,
        'StartSel = <mark>, StopSel = </mark>,
         MaxWords = 50, MinWords = 20'
    ) AS cuplikan
FROM articles, plainto_tsquery('indonesian', 'performa pengindeksan') AS query
WHERE search_vector @@ query
ORDER BY ts_rank(search_vector, query) DESC;
```

Contoh output untuk artikel "Strategi Pengindeksan Lanjutan":

> **Pengindeksan** sangat penting untuk **performa** basis data. Indeks B-tree, Hash, GiST, GIN, dan BRIN masing-masing melayani kasus penggunaan yang berbeda. Memahami kapan menggunakan setiap tipe secara dramatis meningkatkan **performa** kueri.

Sesuaikan penanda sorotan menggunakan opsi `StartSel` dan `StopSel`. Parameter `MaxWords` dan `MinWords` mengontrol panjang cuplikan di sekitar kecocokan.

### Pencocokan Prefix dan Pencarian Wildcard

Terkadang pengguna mengetik kata sebagian. Pencarian teks lengkap PostgreSQL mendukung pencocokan prefix menggunakan operator `:*`:

```sql
-- Cocokkan kata apa pun yang dimulai dengan "post"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('indonesian', 'post:*');

-- Temukan "performa", "performansi", dll.
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('indonesian', 'perf:*');
```

Perhatikan bahwa pencocokan suffix (misalnya, `*ormansi`) tidak didukung di tsquery. Untuk pencocokan substring, Anda masih memerlukan `ILIKE` atau indeks trigram dengan `pg_trgm`.

## Contoh Kode

### Aplikasi Pencarian Lengkap (Node.js + pg)

Contoh ini mengintegrasikan pencarian teks lengkap PostgreSQL ke dalam aplikasi Node.js:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://user:password@localhost:5432/searchdb'
});

async function searchArticles(keywords, options = {}) {
    const {
        limit = 20,
        offset = 0,
        highlight = true
    } = options;

    const query = `
        SELECT
            id,
            title,
            author,
            published_at,
            ts_rank(search_vector, plainto_tsquery('indonesian', $1)) AS rank
            ${highlight ? `,
            ts_headline('indonesian', body, plainto_tsquery('indonesian', $1),
                'StartSel=<mark>, StopSel=</mark>, MaxWords=60, MinWords=25'
            ) AS excerpt` : ''}
        FROM articles
        WHERE search_vector @@ plainto_tsquery('indonesian', $1)
        ORDER BY rank DESC
        LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [keywords, limit, offset]);
    return result.rows;
}

// Penggunaan
async function main() {
    const results = await searchArticles('basis data pengindeksan', { limit: 5 });
    console.log(`Ditemukan ${results.length} hasil:`);
    for (const row of results) {
        console.log(`\n  [${row.rank.toFixed(3)}] ${row.title}`);
        if (row.excerpt) console.log(`  > ${row.excerpt}`);
    }
    await pool.end();
}

main().catch(console.error);
```

### Perbandingan Performa: FTS vs ILIKE

```sql
-- Pendekatan LIKE biasa (pemindaian sekuensial, tidak bisa menggunakan indeks dengan % di awal)
EXPLAIN ANALYZE
SELECT * FROM articles
WHERE title ILIKE '%pengindeksan%' OR body ILIKE '%pengindeksan%';

-- Pencarian teks lengkap dengan indeks GIN
EXPLAIN ANALYZE
SELECT * FROM articles
WHERE search_vector @@ plainto_tsquery('indonesian', 'pengindeksan');
```

Pada tabel dengan satu juta dokumen, kueri FTS dengan indeks GIN biasanya selesai dalam waktu di bawah 2 milidetik. Kueri `ILIKE` dengan wildcard `%` di awal memerlukan pemindaian sekuensial penuh dan dapat memakan waktu puluhan detik.

### Konfigurasi Pencarian Khusus Bahasa

PostgreSQL mendukung banyak bahasa secara bawaan. Setiap bahasa memiliki aturan stemming dan kata berhenti (stop words) sendiri:

```sql
-- Buat tabel dengan pencarian khusus bahasa
CREATE TABLE dokumen_multibahasa (
    id SERIAL PRIMARY KEY,
    judul TEXT NOT NULL,
    konten TEXT NOT NULL,
    bahasa TEXT NOT NULL DEFAULT 'english',
    search_vector tsvector
);

-- Trigger yang mendukung banyak bahasa
CREATE OR REPLACE FUNCTION multilingual_search_update()
RETURNS trigger AS $$
DECLARE
    config regconfig := NEW.bahasa::regconfig;
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector(config, COALESCE(NEW.judul, '')), 'A') ||
        setweight(to_tsvector(config, COALESCE(NEW.konten, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Kueri dengan stemming sesuai bahasa
SELECT id, judul, bahasa
FROM dokumen_multibahasa
WHERE search_vector @@ plainto_tsquery('indonesian', 'optimasi basis data');
```

Konfigurasi bahasa yang tersedia meliputi: `english`, `indonesian`, `simple`, `french`, `german`, `spanish`, `dutch`, `italian`, `russian`, `arabic`, `turkish`, `hindi`, `japanese`, `korean`, dan masih banyak lagi.

## Insight Penting

- **Indeks GIN sangat penting** untuk performa pencarian teks lengkap dalam skala besar. Tanpanya, setiap kueri melakukan pemindaian sekuensial. Buat indeks GIN pada kolom tsvector segera setelah Anda menambahkan pencarian teks lengkap ke sebuah tabel.

- **Pencarian berbobot secara dramatis meningkatkan kualitas hasil.** Berikan bobot A pada judul, bobot B pada heading atau ringkasan, dan bobot C pada teks konten. Ini memastikan bahwa kecocokan judul muncul di atas kecocokan konten.

- **Gunakan `plainto_tsquery` untuk kotak pencarian yang digunakan pengguna.** Fungsi ini menangani input pengguna dengan aman dan mengonversinya ke tsquery dengan operator AND di antara semua istilah. Menggunakan `to_tsquery` secara langsung berisiko error ketika pengguna mengetik karakter khusus atau operator boolean.

- **Penyimpanan search_vector terpisah adalah praktik standar.** Meskipun Anda dapat menghitung `to_tsvector()` secara langsung dalam kueri, menyimpan vektor yang telah dihitung sebelumnya di kolom dengan trigger lebih cepat untuk beban kerja dengan banyak tulisan dan menghindari komputasi ulang pada setiap pencarian.

- **Gabungkan FTS dengan fitur PostgreSQL lainnya.** Gunakan `ts_headline` untuk penyorotan hasil, materialized views untuk indeks pencarian agregat di seluruh tabel yang digabungkan, dan indeks GIN parsial untuk memfilter pencarian berdasarkan penyewa (tenant) atau kategori.

- **Pantau ukuran indeks.** Indeks GIN pada kolom tsvector dapat tumbuh besar (30-50% dari ukuran teks sumber). Pertimbangkan hal ini dalam perencanaan penyimpanan untuk dataset besar.

## Langkah Berikutnya

- Jelajahi [Panduan Penyetelan Performa PostgreSQL](../guides/postgresql-performance-tuning-guide.md) untuk mengoptimalkan kueri pencarian Anda lebih lanjut.
- Pelajari tentang [Partisi Tabel PostgreSQL](../tutorials/postgresql-table-partitioning-and-lifecycle-management.md) untuk mengelola indeks pencarian skala besar.
- Pertimbangkan [Silabus PostgreSQL](../syllabi/postgresql-syllabus.md) untuk jalur pembelajaran terstruktur yang mencakup semua fitur utama PostgreSQL.
- Untuk kebutuhan pencarian dengan throughput yang sangat tinggi, pelajari Elasticsearch atau Meilisearch sebagai mesin pencari khusus.

## Kesimpulan

Pencarian teks lengkap bawaan PostgreSQL adalah fitur yang kuat dan siap produksi yang menghilangkan kebutuhan akan layanan pencarian eksternal di banyak aplikasi. Dengan menguasai tipe data tsvector/tsquery, pengindeksan GIN, peringkat berbobot, dan penyorotan hasil, Anda dapat mengimplementasikan fungsionalitas pencarian yang canggih sepenuhnya di dalam basis data Anda. Ini mengurangi kompleksitas arsitektur, beban operasional, dan biaya sambil memanfaatkan keandalan dan jaminan ACID PostgreSQL.

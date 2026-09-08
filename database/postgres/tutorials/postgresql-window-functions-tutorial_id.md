---
title: "Tutorial Fungsi Window pada PostgreSQL"
description: "Tutorial SQL mendalam tentang fungsi window PostgreSQL: klausa OVER, PARTITION BY, ROW_NUMBER/RANK/DENSE_RANK, LAG/LEAD, window agregat, dan frame ROWS BETWEEN, dengan contoh analitik penjualan yang realistis."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Tutorial Fungsi Window pada PostgreSQL

## Ringkasan

Fungsi window menghitung suatu nilai pada sekumpulan baris yang berhubungan dengan baris saat ini tanpa menggabungkan baris-baris tersebut menjadi satu baris keluaran. Tutorial ini menjelaskan klausa `OVER`, `PARTITION BY`, fungsi ranking, `LAG`/`LEAD`, fungsi agregat yang dipakai sebagai window, serta kontrol frame `ROWS BETWEEN` — semuanya diterapkan pada dataset penjualan yang realistis. Pada akhirnya Anda akan menulis total berjalan, rata-rata bergerak, ranking per tenaga penjual, perbandingan hari-ke-hari, dan kueri "teratas per grup" murni dalam SQL.

## Target Audiens

- Pengembang SQL dan backend engineer yang menulis kueri analitik atau pelaporan.
- Ekspektasi tingkat kemampuan: **Mahir** (nyaman dengan `GROUP BY`, join, dan subkueri).

## Prasyarat

- Instance PostgreSQL yang berjalan (disarankan 11+; frame `ROWS`/`RANGE` bekerja di semua versi, `GROUPS` butuh 11+).
- Klien `psql`, atau editor SQL apa pun yang terhubung ke database percobaan.
- Pemahaman kuat tentang `SELECT`, `WHERE`, `GROUP BY`, dan `ORDER BY`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menjelaskan bagaimana `OVER` mendefinisikan window baris untuk setiap baris saat ini.
- Mempartisi baris dengan `PARTITION BY` dan mengurutkannya dengan `ORDER BY` di dalam `OVER`.
- Memberi peringkat baris dengan `ROW_NUMBER()`, `RANK()`, dan `DENSE_RANK()` serta tahu kapan masing-masing tepat digunakan.
- Membandingkan sebuah baris dengan baris tetangganya menggunakan `LAG()` dan `LEAD()`.
- Memakai fungsi agregat seperti `SUM` dan `AVG` sebagai fungsi window.
- Mengontrol frame secara presisi dengan `ROWS BETWEEN` dan memahami jebakan frame bawaan.

## Konteks dan Motivasi

`GROUP BY` menjawab pertanyaan "berapa per grup" tetapi menghancurkan baris detail, sedangkan self-join untuk ranking atau total berjalan menghasilkan SQL yang lambat dan sulit dibaca. Pelaporan nyata membutuhkan kedua sudut pandang sekaligus: setiap baris invoice DAN total kumulatifnya, setiap tenaga penjual diranking di dalam regionnya tanpa kehilangan barisnya, pendapatan hari ini berdampingan dengan pendapatan kemarin.

Fungsi window menyelesaikan semua ini dalam satu lintasan data. Setiap baris mempertahankan identitasnya sementara fungsi window dievaluasi di atas sebuah window — seluruh himpunan, satu partisi, atau frame bergerak — relatif terhadap baris tersebut. Inilah mesin di balik saldo berjalan, rata-rata bergerak, papan peringkat, retensi kohort, nomor sesi, dan laporan "teratas N per grup".

## Konten Inti

### Klausa OVER

Pemanggilan fungsi window berbentuk `fungsi(args) OVER (spesifikasi_window)`. Spesifikasi window inilah yang menjadikannya fungsi window: hapus `OVER` dari sebuah agregat dan Anda kembali ke perilaku `GROUP BY` biasa. Di dalam spesifikasi tersebut Anda dapat mendefinisikan partisi, urutan, dan frame.

### PARTITION BY

`PARTITION BY` membagi hasil kueri menjadi grup-grup independen, seperti `GROUP BY` tetapi tanpa menggabungkan baris. Fungsi window dimulai ulang untuk setiap partisi. Tanpa `PARTITION BY`, seluruh hasil kueri menjadi satu partisi tunggal.

### Fungsi Ranking

- `ROW_NUMBER()`: nomor urut unik untuk setiap baris sesuai urutan window.
- `RANK()`: nilai yang sama untuk baris seri (tie), dengan celah (1, 1, 3).
- `DENSE_RANK()`: nilai yang sama untuk baris seri, tanpa celah (1, 1, 2).

### LAG dan LEAD

`LAG(kolom, offset, default)` mengakses baris *sebelum* baris saat ini dalam urutan window; `LEAD` mengakses baris *setelahnya*. Keduanya mengembalikan `NULL` jika baris tersebut tidak ada, kecuali Anda memberikan nilai default.

### Fungsi Agregat sebagai Window

`SUM`, `AVG`, `COUNT`, `MIN`, dan `MAX` semuanya dapat dipakai dengan `OVER`. Dengan `ORDER BY` di dalam window, `SUM` berubah menjadi total berjalan; tanpa `ORDER BY`, window-nya adalah seluruh partisi dan setiap baris mengulang nilai yang sama.

### Frame: ROWS BETWEEN

Frame menentukan secara tepat baris mana saja yang disertakan dalam perhitungan. Sintaksnya: `ROWS BETWEEN <awal> AND <akhir>` dengan batas seperti `UNBOUNDED PRECEDING`, `2 PRECEDING`, `CURRENT ROW`, `1 FOLLOWING`, dan `UNBOUNDED FOLLOWING`. Default yang kritis: ketika `ORDER BY` ada, frame-nya adalah `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.

## Contoh Kode

Semua contoh berjalan di atas tabel penjualan kecil — salin blok ini ke `psql` untuk mengikuti langkah:

```sql
-- sales.sql — persiapan untuk setiap contoh dalam tutorial ini
DROP TABLE IF EXISTS sales;

CREATE TABLE sales (
    id          SERIAL PRIMARY KEY,
    region      TEXT          NOT NULL,
    salesperson TEXT          NOT NULL,
    amount      NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    sold_on     DATE          NOT NULL
);

INSERT INTO sales (region, salesperson, amount, sold_on) VALUES
    ('Jakarta', 'Sari',  120.00, '2026-09-01'),
    ('Jakarta', 'Sari',   95.50, '2026-09-02'),
    ('Jakarta', 'Budi',  210.25, '2026-09-02'),
    ('Jakarta', 'Sari',   88.00, '2026-09-05'),
    ('Bandung', 'Dewi',  180.00, '2026-09-01'),
    ('Bandung', 'Dewi',   60.00, '2026-09-03'),
    ('Bandung', 'Agus',  340.75, '2026-09-03'),
    ('Bandung', 'Agus',  150.00, '2026-09-06');
```

Total berjalan dengan window agregat:

```sql
SELECT
    sold_on,
    amount,
    SUM(amount) OVER (ORDER BY sold_on) AS running_total
FROM sales
ORDER BY sold_on;
```

Ranking jumlah penjualan setiap tenaga penjual di dalam partisinya sendiri:

```sql
SELECT
    salesperson,
    amount,
    ROW_NUMBER() OVER (PARTITION BY salesperson ORDER BY amount DESC) AS row_num,
    RANK()       OVER (PARTITION BY salesperson ORDER BY amount DESC) AS rank_pos,
    DENSE_RANK() OVER (PARTITION BY salesperson ORDER BY amount DESC) AS dense_pos
FROM sales
ORDER BY salesperson, amount DESC;
```

Dua baris milik Sari mendapat `row_num` 1 dan 2 dengan `rank_pos` yang sama; baris seri memperlihatkan perbedaan antara `RANK` (menyisakan celah) dan `DENSE_RANK` (tidak) — tambahkan jumlah duplikat lalu jalankan ulang untuk melihatnya.

Perbandingan hari-ke-hari dengan `LAG`:

```sql
SELECT
    sold_on,
    amount,
    LAG(amount) OVER (ORDER BY sold_on) AS prev_day,
    amount - COALESCE(LAG(amount) OVER (ORDER BY sold_on), 0) AS delta_from_prev
FROM sales
ORDER BY sold_on;
```

`COALESCE` mengubah `NULL` yang muncul di baris pertama menjadi `0` sehingga selisihnya tetap numerik.

Rata-rata bergerak tiga hari dengan frame eksplisit:

```sql
SELECT
    sold_on,
    amount,
    AVG(amount) OVER (
        ORDER BY sold_on
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3
FROM sales
ORDER BY sold_on;
```

Baris 1 hanya merata-ratakan nilainya sendiri, baris 2 merata-ratakan baris 1–2, dan mulai baris 3 tepat tiga baris berada di dalam frame.

Tenaga penjual terbaik per region — window di dalam subkueri, karena `WHERE` tidak dapat merujuk hasil window:

```sql
SELECT region, salesperson, amount
FROM (
    SELECT
        region,
        salesperson,
        amount,
        ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC) AS rn
    FROM sales
) AS ranked
WHERE ranked.rn = 1;
```

Ganti `ROW_NUMBER()` dengan `RANK()` jika Anda ingin menyertakan semua penjual teratas yang seri.

Pangsa region terhadap total keseluruhan — agregat di atas agregat:

```sql
SELECT
    region,
    SUM(amount) AS region_total,
    ROUND(
        100.0 * SUM(amount) / SUM(SUM(amount)) OVER (),
        2
    ) AS share_pct
FROM sales
GROUP BY region;
```

`SUM(amount)` bagian dalam adalah agregat GROUP BY biasa; `SUM(...) OVER ()` menjumlahkan nilai-nilai berkelompok tersebut ke seluruh hasil kueri.

## Insight Penting

- Fungsi window dievaluasi setelah `WHERE`, `GROUP BY`, dan `HAVING` tetapi sebelum `ORDER BY` dan `LIMIT`. Anda tidak dapat merujuk hasil window di dalam `WHERE` — bungkus dalam subkueri atau CTE.
- Dengan `ORDER BY` di dalam `OVER`, frame bawaan adalah `RANGE UNBOUNDED PRECEDING TO CURRENT ROW`; kunci pengurutan yang duplikat kemudian menyertakan *semua* baris seri ke dalam total berjalan. Pilih frame `ROWS` eksplisit agar hasilnya deterministik.
- Setiap klausa `OVER` adalah lintasan independen — dua pemanggilan dengan spesifikasi yang sama dijalankan dua kali. Faktorkan dengan `WINDOW w AS (PARTITION BY region ORDER BY amount DESC)` lalu pakai `ROW_NUMBER() OVER w`.
- `LAG`/`LEAD` mengembalikan `NULL` di luar tepi; berikan argumen default atau bungkus dengan `COALESCE`. `IGNORE NULLS` untuk `LAG`/`LEAD` membutuhkan PostgreSQL 14+.
- Evaluasi window berorde `O(n log n)` pada kunci partisi/urutan; index pada `(partition_col, order_col)` menjaga kueri analitik tetap cepat pada tabel besar.

## Langkah Berikutnya

- Jelajahi `NTILE()`, `FIRST_VALUE()`/`LAST_VALUE()`, mode frame `GROUPS`, serta opsi `EXCLUDE` yang dipakai untuk persentil dan kuartil.
- Perdalam analitik PostgreSQL pada [silabus PostgreSQL lanjutan](../syllabi/advanced-postgresql-syllabus.md).
- Bandingkan fungsi window dengan alternatif klasiknya — subkueri berkorelasi dan join `LATERAL` — di [cheat sheet kueri PostgreSQL](../cheatsheets/postgresql-query-cheatsheet.md).

## Kesimpulan

Anda kini dapat mengekspresikan total berjalan, rata-rata bergerak, ranking, perbandingan antar baris tetangga, dan laporan "teratas per grup" sebagai pernyataan SQL tunggal. Fungsi window mempertahankan baris detail di tempat `GROUP BY` menggabungkannya, dan klausa `OVER` — dengan `PARTITION BY`, `ORDER BY` window, serta frame `ROWS` — memberi Anda kendali presisi atas baris yang dilihat setiap perhitungan. Terapkan pola-pola ini pada saldo, papan peringkat, dan analitik deret waktu, serta gunakan `EXPLAIN ANALYZE` untuk memastikan lintasan window memakai index Anda.

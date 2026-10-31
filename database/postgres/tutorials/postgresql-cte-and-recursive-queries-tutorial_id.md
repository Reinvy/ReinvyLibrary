---
title: "Tutorial CTE dan Query Rekursif PostgreSQL"
description: "Pelajari cara kerja klausa WITH di PostgreSQL serta penggunaan CTE rekursif untuk menelusuri pohon, mendeteksi siklus, dan menghitung agregat hierarki lewat SQL yang bisa dijalankan."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Tutorial CTE dan Query Rekursif PostgreSQL

## Ringkasan

Common table expression (CTE) memberi nama pada sebuah subquery sehingga bisa dipakai ulang dalam satu pernyataan; CTE rekursif boleh merujuk dirinya sendiri, dan itulah yang membuat PostgreSQL mampu menelusuri pohon. Tutorial ini membahas klausa `WITH` biasa, lalu membangun query rekursif untuk struktur organisasi, menambahkan proteksi terhadap siklus, dan diakhiri dengan agregat payroll per subtree.

## Target Audiens

- Backend engineer dan data engineer yang menulis SQL analitik di PostgreSQL.
- Developer yang saat ini menyelesaikan masalah hierarki dengan kode rekursif di aplikasi.
- Tingkat pembaca yang diharapkan: **Menengah** (terbiasa dengan join, agregat, dan window function).

## Prasyarat

- PostgreSQL 12 atau lebih baru (14+ untuk klausa `CYCLE` dan `SEARCH`), dengan `psql` terhubung ke database percobaan tempat Anda boleh membuat tabel.
- Pemahaman dasar `SELECT`, `JOIN`, `GROUP BY`, dan subquery.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menulis klausa `WITH` dan merangkai beberapa CTE dalam satu pernyataan yang mudah dibaca.
- Menentukan kapan `MATERIALIZED` perlu mencegah planner melakukan inlining pada CTE.
- Menyusun CTE rekursif dari anchor term dan recursive term yang digabung dengan `UNION ALL`.
- Menelusuri hierarki ke bawah dan ke atas sambil melacak kedalaman.
- Mendeteksi siklus dengan array jalur yang sudah dikunjungi atau klausa `CYCLE` bawaan.

## Konteks dan Motivasi

Hierarki ada di mana-mana: garis pelaporan, kategori produk, bill-of-materials, thread komentar, pohon folder. Mengambil satu level per query dari kode aplikasi memakan satu round trip per level dan menuntut batas loop yang arbitrer; rantai self-join statis justru membatasi kedalaman secara diam-diam dan makin lambat di setiap level. CTE rekursif menyatakan seluruh penelusuran dalam satu pernyataan. PostgreSQL mengevaluasinya dengan working table — baris seed lebih dulu, lalu hasil sebelumnya di-join berulang ke tabel sumber sampai tidak ada baris baru — sehingga hanya ada satu plan, satu round trip, dan baris antara tetap tersedia untuk difilter, diagregasi, dan diurutkan.

## Konten Inti

### Anatomi dan Perangkaian

`WITH nama AS (SELECT ...) SELECT ...` mendefinisikan result set bernama yang hanya hidup selama pernyataan itu berjalan. Ini bukan tabel sementara: tidak punya statistik, tidak bisa diberi indeks, dan hilang setelahnya. Nilainya ada pada keterbacaan dan pemakaian ulang — satu definisi, beberapa rujukan. Sebuah CTE boleh merujuk CTE yang didefinisikan sebelumnya, jadi pipeline terbaca dari atas ke bawah: filter, agregasi, lalu peringkat.

### Materialisasi

Sejak PostgreSQL 12, CTE yang dirujuk tepat satu kali akan di-inline ke query luar, sehingga `WITH` tidak lagi menjadi pagar optimasi. Tambahkan `MATERIALIZED` untuk memaksa evaluasi tunggal pada pekerjaan mahal atau volatil, atau `NOT MATERIALIZED` bila ingin predikat didorong masuk ke dalam CTE.

### Struktur Rekursif

`WITH RECURSIVE` menaungi kedua jenis: anchor term menghasilkan baris awal, `UNION ALL` menggabungkannya dengan recursive term, dan recursive term mem-join CTE kembali ke tabel dasar. Evaluasi berulang sampai recursive term mengembalikan nol baris. Utamakan `UNION ALL` daripada `UNION`; deduplikasi mengurutkan setiap level dan membuang baris yang memang valid ketika satu node punya beberapa parent.

### Arah Penelusuran dan Kedalaman

Telusuri ke bawah dengan menjadikan akar sebagai seed (`manager_id IS NULL`) lalu join anak lewat `child.manager_id = parent.id`. Telusuri ke atas dari sebuah leaf dengan menjadikan node itu seed dan join parent lewat `parent.id = node.manager_id`. Pertahankan kolom `depth` eksplisit agar output bisa diindentasi, urutan pohon bisa ditentukan, dan penelusuran punya batas keras untuk data yang cacat.

### Deteksi Siklus

Siklus membuat recursive term menghasilkan baris tanpa henti. PostgreSQL 14 menyediakan `CYCLE id SET is_cycle USING path` yang melacak nilai yang sudah dikunjungi dan menandai pengulangan. Pada versi lama, bawa array id yang sudah dikunjungi dan saring dengan `NOT c.id = ANY(visited)` supaya baris yang menutup lingkaran tidak pernah dihasilkan.

## Contoh Kode

Buat hierarki contoh sekali, lalu jalankan semua contoh terhadapnya:

```sql
-- skema dan data seed yang dipakai seluruh contoh di bawah
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    id integer PRIMARY KEY,
    name text NOT NULL,
    manager_id integer REFERENCES employees(id),
    department text NOT NULL,
    salary numeric(10, 2) NOT NULL
);

INSERT INTO employees (id, name, manager_id, department, salary) VALUES
    (1, 'Rina', NULL, 'Executive', 24000),
    (2, 'Budi', 1, 'Engineering', 15000),
    (3, 'Sari', 1, 'Sales', 14000),
    (4, 'Agus', 2, 'Engineering', 11000),
    (5, 'Dewi', 2, 'Engineering', 10500),
    (6, 'Tono', 3, 'Sales', 9000),
    (7, 'Lestari', 4, 'Engineering', 8500);
```

Pipeline berantai: agregasi lebih dulu, lalu beri peringkat pada hasil agregatnya:

```sql
-- Rantai CTE: setiap CTE memakai hasil CTE di atasnya
WITH payroll AS (
    SELECT department, sum(salary) AS total_salary FROM employees GROUP BY department
),
ranked AS (
    SELECT *, rank() OVER (ORDER BY total_salary DESC) AS spend_rank FROM payroll
)
SELECT spend_rank, department, total_salary FROM ranked ORDER BY spend_rank;
```

Penelusuran rekursif ke bawah, lengkap dengan kedalaman dan jalur yang mudah dibaca:

```sql
WITH RECURSIVE org AS (
    SELECT id, name, manager_id, 1 AS depth, name::text AS path
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, o.depth + 1, o.path || ' > ' || e.name
    FROM employees e JOIN org o ON e.manager_id = o.id
    WHERE o.depth < 10          -- batas keras untuk data yang cacat
)
SELECT depth, repeat('  ', depth - 1) || name AS tree FROM org ORDER BY path;
```

Penelusuran yang aman dari siklus memakai klausa bawaan (PostgreSQL 14+) pada tabel `categories(id, parent_id)`, dan varian array yang portabel:

```sql
-- CYCLE menjaga penelusuran tetap berhingga walau ada edge yang menunjuk kembali ke atas
WITH RECURSIVE parts AS (
    SELECT id, parent_id, 1 AS depth FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.parent_id, p.depth + 1
    FROM categories c JOIN parts p ON c.parent_id = p.id
) CYCLE id SET is_cycle USING path
SELECT id, depth, is_cycle FROM parts ORDER BY path;

-- Berjalan di semua versi yang didukung: node tidak pernah dikunjungi dua kali
WITH RECURSIVE walk AS (
    SELECT id, parent_id, ARRAY[id] AS visited FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.parent_id, w.visited || c.id
    FROM categories c JOIN walk w ON c.parent_id = w.id
    WHERE NOT c.id = ANY(w.visited)
)
SELECT id, parent_id, visited FROM walk;
```

Agregat per subtree — total payroll setiap node, tanpa self-join per level:

```sql
WITH RECURSIVE subtree AS (
    SELECT id AS root_id, id, salary FROM employees
    UNION ALL
    SELECT s.root_id, e.id, e.salary
    FROM employees e JOIN subtree s ON e.manager_id = s.id
)
SELECT e.name, count(*) - 1 AS reports, sum(s.salary) AS subtree_payroll
FROM subtree s JOIN employees e ON e.id = s.root_id
GROUP BY e.name ORDER BY subtree_payroll DESC;
```

## Insight Penting

- Gunakan `UNION ALL` pada recursive term; `UNION` menambah pengurutan di setiap level dan membuang baris yang memang muncul lebih dari sekali.
- Selalu sertakan batas kedalaman (`WHERE o.depth < n`). Satu edge yang salah bisa berubah menjadi query tak berujung yang menghabiskan memori dan satu slot koneksi.
- Urutkan hasil akhir berdasarkan string jalur yang terakumulasi, bukan hanya `depth`, agar pohon tidak rata menjadi urutan per level.
- CTE rekursif bersifat iteratif, bukan gratis: setiap level memindai tabel sumber kecuali kolom parent (`manager_id`, `parent_id`) sudah berindeks.
- Recursive term tidak boleh memuat agregat atau `DISTINCT`, dan tidak boleh merujuk CTE di dalam subquery — lakukan agregasi pada query luar.
- `CYCLE` membutuhkan PostgreSQL 14; jika harus mendukung versi lama, jaga array kunjungan tetap ramping (id saja, bukan seluruh baris).

## Langkah Berikutnya

- Ganti kolom jalur buatan sendiri dengan `SEARCH DEPTH FIRST BY id SET ordercol` atau `SEARCH BREADTH FIRST`.
- Kombinasikan CTE rekursif dengan window function untuk total berjalan per level.
- Pertimbangkan closure table atau `ltree` ketika pembacaan hierarki jauh lebih sering daripada penulisan.

## Kesimpulan

Anda kini bisa menyatakan hierarki sebagai satu pernyataan, bukan loop di kode aplikasi. Anda sudah membangun CTE biasa dan berantai, beralih ke penelusuran rekursif dengan pelacakan kedalaman, menjaga penelusuran dari siklus lewat dua cara, serta menghasilkan agregat subtree tanpa satu pun self-join.

---
title: "Memulai dengan PostgreSQL"
description: "Tutorial hands-on yang komprehensif tentang fundamental PostgreSQL, mulai dari instalasi dan pengaturan hingga kueri lanjutan dan integrasi aplikasi."
category: "database"
technology: "postgres"
difficulty: "beginner"
type: "tutorial"
locale: "id"
---

# Memulai dengan PostgreSQL

## Ringkasan

Tutorial ini memberikan pengenalan lengkap tentang PostgreSQL, salah satu sistem manajemen basis data relasional open-source terkuat. Anda akan mempelajari cara menginstal PostgreSQL, membuat dan mengelola basis data, menulis kueri SQL, mendefinisikan relasi antar tabel, dan menghubungkan aplikasi Anda ke basis data PostgreSQL.

## Target Audiens

- Calon pengembang backend dan profesional data.
- Pengembang dengan pengetahuan pemrograman dasar yang baru mengenal basis data relasional.
- Pengembang tingkat pemula yang belum memiliki pengalaman PostgreSQL.

## Prasyarat

- Pemahaman dasar tentang konsep pemrograman (variabel, fungsi, tipe data).
- Komputer dengan akses administrator untuk menginstal perangkat lunak.
- Familiaritas dengan baris perintah / terminal sangat membantu tetapi tidak diwajibkan.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menginstal dan mengonfigurasi PostgreSQL di komputer lokal Anda.
- Membuat basis data, tabel, dan mendefinisikan skema dengan tipe data yang sesuai.
- Menulis kueri SQL CRUD (Create, Read, Update, Delete).
- Menggunakan JOIN untuk menggabungkan data dari beberapa tabel.
- Membuat indeks untuk optimalisasi performa kueri.
- Menghubungkan PostgreSQL dari aplikasi Node.js menggunakan driver basis data.

## Konteks dan Motivasi

PostgreSQL telah menjadi standar emas untuk basis data relasional open-source selama lebih dari tiga dekade. Ia mendukung segala hal mulai dari proyek pribadi kecil hingga sistem perusahaan besar di perusahaan seperti Apple, Instagram, dan Reddit. Tidak seperti beberapa sistem basis data yang mengunci Anda pada vendor tertentu, PostgreSQL gratis, dapat diperluas, dan sepenuhnya sesuai dengan standar SQL.

Memahami PostgreSQL adalah keterampilan fundamental bagi setiap pengembang backend. Baik Anda membangun REST API, pipeline analitik data, atau layanan geolokasi, PostgreSQL menyediakan keandalan, performa, dan fitur yang Anda butuhkan. Dukungannya terhadap tipe data tingkat lanjut (JSON, array, tipe geometris), pencarian teks lengkap (full-text search), dan integritas transaksional dengan kepatuhan ACID menjadikannya alat yang sangat diperlukan dalam pengembangan perangkat lunak modern.

## Konten Inti

### Apa itu PostgreSQL?

PostgreSQL (sering disingkat "Postgres") adalah sistem manajemen basis data objek-relasional (ORDBMS). Ia menyimpan data dalam tabel dengan baris dan kolom, menegakkan hubungan antar tabel menggunakan foreign key, dan menjamin integritas data melalui transaksi.

### Menginstal PostgreSQL

**Di Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**Di macOS (menggunakan Homebrew):**

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Di Windows:**

Unduh installer dari [postgresql.org/download](https://www.postgresql.org/download/windows/) dan jalankan wizard pengaturan.

Setelah instalasi, verifikasi bahwa PostgreSQL berjalan:

```bash
psql --version
sudo systemctl status postgresql   # Linux
```

### Mengakses Shell PostgreSQL

PostgreSQL membuat pengguna sistem bawaan bernama `postgres`. Beralih ke pengguna ini untuk mengakses shell interaktif (`psql`):

```bash
sudo -u postgres psql
```

Anda akan melihat prompt PostgreSQL:

```text
psql (16.x)
Type "help" for help.

postgres=#
```

### Membuat Basis Data dan Pengguna

Dari shell `psql`, buat basis data baru dan pengguna khusus:

```sql
CREATE DATABASE library;
CREATE USER librarian WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE library TO librarian;
```

Hubungkan ke basis data baru Anda:

```sql
\c library
```

### Membuat Tabel dan Mendefinisikan Skema

Tabel adalah fondasi dari setiap basis data relasional. Mari buat tabel untuk sistem manajemen perpustakaan sederhana:

```sql
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    birth_year INTEGER,
    nationality VARCHAR(100)
);

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    published_year INTEGER,
    author_id INTEGER REFERENCES authors(id) ON DELETE CASCADE,
    available_copies INTEGER DEFAULT 1 CHECK (available_copies >= 0)
);

CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    membership_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE borrowings (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    borrow_date DATE DEFAULT CURRENT_DATE,
    return_date DATE
);
```

Poin-poin penting:
- `SERIAL` melakukan auto-increment pada nilai integer.
- `PRIMARY KEY` menegakkan keunikan dan menyediakan pencarian cepat.
- `REFERENCES` membuat constraint foreign key yang memastikan integritas referensial.
- `ON DELETE CASCADE` secara otomatis menghapus record terkait ketika parent dihapus.
- `CHECK` memvalidasi bahwa nilai memenuhi kondisi tertentu sebelum penyisipan.

### Memasukkan Data (CREATE)

Tambahkan record ke dalam tabel Anda:

```sql
INSERT INTO authors (name, birth_year, nationality)
VALUES ('George Orwell', 1903, 'British');

INSERT INTO authors (name, birth_year, nationality)
VALUES ('Harper Lee', 1926, 'American');

INSERT INTO books (title, isbn, published_year, author_id, available_copies)
VALUES ('1984', '978-0451524935', 1949, 1, 5);

INSERT INTO books (title, isbn, published_year, author_id, available_copies)
VALUES ('To Kill a Mockingbird', '978-0061120084', 1960, 2, 3);

INSERT INTO members (name, email)
VALUES ('Alice Johnson', 'alice@example.com');

INSERT INTO members (name, email)
VALUES ('Bob Smith', 'bob@example.com');
```

### Membaca Data (SELECT)

Ambil data dari tabel Anda:

```sql
-- Pilih semua kolom
SELECT * FROM books;

-- Pilih kolom tertentu
SELECT title, isbn FROM books;

-- Filter dengan WHERE
SELECT * FROM books WHERE published_year > 1950;

-- Urutkan hasil
SELECT * FROM books ORDER BY published_year DESC;

-- Hitung baris
SELECT COUNT(*) FROM books;

-- Group dan agregasi
SELECT nationality, COUNT(*) AS author_count
FROM authors
GROUP BY nationality;
```

### Memperbarui Data (UPDATE)

Ubah record yang sudah ada:

```sql
UPDATE books
SET available_copies = 4
WHERE title = 'To Kill a Mockingbird';

UPDATE members
SET email = 'alice.johnson@newdomain.com'
WHERE name = 'Alice Johnson';
```

### Menghapus Data (DELETE)

Hapus record:

```sql
DELETE FROM borrowings WHERE return_date IS NOT NULL;
```

Berhati-hatilah dengan `DELETE` — tanpa klausa `WHERE`, semua baris akan dihapus.

### Menggabungkan Tabel dengan JOIN

Gabungkan data dari beberapa tabel menggunakan join:

```sql
-- INNER JOIN: hanya record yang cocok di kedua tabel
SELECT books.title, authors.name AS author
FROM books
INNER JOIN authors ON books.author_id = authors.id;

-- LEFT JOIN: semua buku, bahkan yang penulisnya tidak diketahui
SELECT books.title, authors.name AS author
FROM books
LEFT JOIN authors ON books.author_id = authors.id;

-- Menggabungkan tiga tabel
SELECT members.name AS member, books.title, borrowings.borrow_date
FROM borrowings
INNER JOIN members ON borrowings.member_id = members.id
INNER JOIN books ON borrowings.book_id = books.id;
```

### Indeks untuk Performa

Indeks mempercepat kueri pada tabel besar. Buat indeks pada kolom yang sering dicari:

```sql
-- Indeks satu kolom
CREATE INDEX idx_books_title ON books (title);

-- Indeks komposit untuk pencarian multi-kolom
CREATE INDEX idx_borrowings_dates ON borrowings (borrow_date, return_date);

-- Indeks parsial untuk kueri yang difilter
CREATE INDEX idx_available_books ON books (id) WHERE available_copies > 0;
```

Selalu analisis pola kueri Anda sebelum membuat indeks. Terlalu banyak indeks akan memperlambat operasi tulis.

## Contoh Kode

### Menghubungkan dari Node.js

Buat proyek Node.js baru dan instal driver `pg`:

```bash
mkdir library-app
cd library-app
npm init -y
npm install pg
```

Tulis skrip untuk melakukan kueri ke basis data:

```javascript
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'library',
  user: 'librarian',
  password: 'secure_password',
});

async function main() {
  try {
    await client.connect();
    console.log('Terhubung ke PostgreSQL');

    const res = await client.query('SELECT * FROM books');
    console.log('Buku:', res.rows);

    const authorBooks = await client.query(
      'SELECT books.title, authors.name AS author FROM books INNER JOIN authors ON books.author_id = authors.id WHERE authors.name = $1',
      ['George Orwell']
    );
    console.log('Buku Orwell:', authorBooks.rows);

    const insertResult = await client.query(
      'INSERT INTO borrowings (book_id, member_id) VALUES ($1, $2) RETURNING *',
      [1, 1]
    );
    console.log('Peminjaman baru:', insertResult.rows[0]);
  } catch (err) {
    console.error('Kesalahan basis data:', err);
  } finally {
    await client.end();
  }
}

main();
```

### Menggunakan Connection Pooling

Untuk aplikasi produksi, gunakan connection pool sebagai pengganti satu klien:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'library',
  user: 'librarian',
  password: 'secure_password',
  max: 10,          // Maksimum koneksi dalam pool
  idleTimeoutMillis: 30000,
});

async function getBooks() {
  const result = await pool.query('SELECT * FROM books ORDER BY title');
  return result.rows;
}

async function borrowBook(bookId, memberId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const book = await client.query(
      'SELECT available_copies FROM books WHERE id = $1 FOR UPDATE',
      [bookId]
    );
    
    if (book.rows[0].available_copies <= 0) {
      throw new Error('Tidak ada salinan tersedia');
    }
    
    await client.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
      [bookId]
    );
    
    await client.query(
      'INSERT INTO borrowings (book_id, member_id) VALUES ($1, $2)',
      [bookId, memberId]
    );
    
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getBooks, borrowBook };
```

### Menggunakan psql untuk Kueri Cepat

Anda juga dapat menjalankan SQL langsung dari baris perintah tanpa masuk ke shell interaktif:

```bash
# Jalankan satu kueri
psql -U librarian -d library -c "SELECT title, published_year FROM books ORDER BY published_year;"

# Jalankan perintah dari file
psql -U librarian -d library -f seed_data.sql
```

## Insight Penting

- **Gunakan `SERIAL` untuk primary key auto-increment** — ini membuat sekuens integer secara otomatis dan merupakan pola standar untuk ID tabel di PostgreSQL.
- **Selalu gunakan parameterized query** — Jangan pernah menggabungkan input pengguna ke dalam string SQL. Gunakan placeholder `$1`, `$2`, dll. untuk mencegah serangan SQL injection.
- **Gunakan connection pooling di produksi** — Membuat dan menghancurkan koneksi baru untuk setiap permintaan itu mahal. Pool menggunakan ulang koneksi dan menangani akses konkuren dengan baik.
- **Transaksi adalah jaring pengaman Anda** — Bungkus operasi multi-langkah dalam blok `BEGIN` / `COMMIT` / `ROLLBACK` untuk memastikan atomicity. Jika ada langkah yang gagal, semua perubahan akan di-rollback.
- **Buat indeks dengan bijak** — Indeks mempercepat pembacaan tetapi memperlambat penyisipan dan pembaruan. Pantau kueri lambat dengan `EXPLAIN ANALYZE` sebelum menambahkan indeks.
- **Gunakan `VARCHAR` tanpa batas panjang untuk sebagian besar kolom teks** — Di PostgreSQL, `VARCHAR` dan `VARCHAR(255)` memiliki performa identik, tetapi menghilangkan batas menghindari constraint yang tidak diperlukan.

## Langkah Berikutnya

- Jelajahi tipe data JSONB PostgreSQL untuk penyimpanan hybrid relasional-dokumen.
- Pelajari pencarian teks lengkap (full-text search) dengan kemampuan bawaan `tsvector` dan `tsquery` PostgreSQL.
- Pelajari strategi normalisasi dan denormalisasi basis data untuk desain skema.
- Siapkan replikasi dan cadangan PostgreSQL untuk kesiapan produksi.

## Kesimpulan

Selamat! Anda telah mengambil langkah pertama dengan PostgreSQL. Anda belajar cara menginstalnya, membuat basis data dan tabel, melakukan operasi CRUD, menggabungkan data terkait, mengoptimalkan kueri dengan indeks, dan menghubungkannya dari aplikasi nyata menggunakan Node.js. PostgreSQL adalah sistem yang dalam dan kuat — konsep yang Anda pelajari di sini membentuk fondasi untuk segala hal mulai dari aplikasi web sederhana hingga gudang data yang kompleks. Teruslah bereksperimen, dan rujuk dokumentasi resmi PostgreSQL saat Anda membangun proyek berikutnya.

---
title: "Panduan pgvector PostgreSQL dan Pencarian Bertenaga AI"
description: "Panduan komprehensif pencarian semantik dengan pgvector — pemodelan dan penyimpanan embedding, strategi indeks HNSW dan IVFFlat, query kemiripan, pencarian hibrida dengan fusi peringkat full-text, pemfilteran metadata, serta evaluasi recall dan latensi produksi."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan pgvector PostgreSQL dan Pencarian Bertenaga AI

## Pendahuluan

Pencarian kata kunci tradisional gagal ketika pengguna tidak mengetik kata yang persis tersimpan di database. Query "headphone nirkabel murah" tidak cocok dengan baris yang berisi deskripsi "earbuds Bluetooth terjangkau" — tidak ada token yang sama, tidak ada hasil. Pencarian semantik memecahkan masalah ini dengan membandingkan *makna* teks, bukan ejaannya. Setiap dokumen dan setiap query diubah menjadi embedding: vektor angka floating-point dengan panjang tetap yang menangkap makna dalam ruang berdimensi tinggi, sehingga teks yang bermakna serupa berada berdekatan dalam ruang tersebut.

Ekstensi **pgvector** PostgreSQL membawa penyimpanan embedding, pencarian kemiripan, dan pengambilan hibrida langsung ke dalam database yang sudah Anda miliki. Alih-alih mengoperasikan basis data vektor terpisah, Anda menyimpan vektor di kolom biasa, memfilter dan menggabungkannya dengan SQL standar, serta mengamankannya dengan transaksi, backup, role, dan monitoring yang sama. Panduan ini mencakup alur kerja produksi secara lengkap: memilih model embedding, memodelkan kolom `vector`, membangun indeks HNSW atau IVFFlat, menjalankan query kemiripan, menggabungkan hasil vektor dengan full-text search, memfilter berdasarkan metadata, serta mengevaluasi recall dan latensi sebelum berskala.

## Praktik Terbaik

### 1. Pilih Model Embedding yang Sesuai dengan Data dan Indeks Anda

Model embedding menentukan batas kualitas pencarian, jadi pilihlah sebelum mendesain skema. Model teks menghasilkan dimensi tetap — `text-embedding-3-small` menghasilkan 1536 dimensi, `text-embedding-3-large` menghasilkan 3072, dan model lokal seperti `all-MiniLM-L6-v2` menghasilkan 384. Model yang lebih kecil lebih murah dijalankan dan menghasilkan indeks yang lebih kecil, sedangkan model yang lebih besar umumnya menangkap nuansa dengan lebih baik. Apa pun pilihannya, **pertahankan model yang sama selama masa hidup data yang diindeks**: mengganti model mengubah ruang koordinat, dan baris lama menjadi tidak dapat dibandingkan dengan baris baru sampai semuanya di-embed ulang. Untuk konten multibahasa, pilih model multibahasa dan uji pada campuran bahasa Anda yang sebenarnya, jangan berasumsi kualitas bahasa Inggris menular.

### 2. Tentukan HNSW atau IVFFlat Berdasarkan Beban Kerja

pgvector menyediakan dua jenis indeks approximate nearest neighbor (ANN) dengan trade-off yang sangat berbeda:

| Indeks | Profil memori | Kecepatan build | Latensi query | Terbaik untuk |
|--------|---------------|-----------------|---------------|---------------|
| HNSW | Lebih besar (graf sebagian besar di memori) | Lambat dibangun | Cepat pada recall tinggi | Dataset besar, query produksi berlatensi rendah |
| IVFFlat | Lebih kecil (di disk) | Cepat dibangun | Perlu tuning (`probes`) | Server dengan memori terbatas, dataset lebih kecil, beban batch |

HNSW adalah pilihan default yang tepat untuk sebagian besar pencarian produksi: recall tinggi dengan latensi rendah dan tidak memerlukan data pelatihan. IVFFlat mengharuskan tabel berisi data **sebelum** indeks dibuat (ia mengelompokkan baris ke dalam list) dan biasanya memerlukan `probes` dinaikkan dari default agar recall dapat diterima. Jika dataset Anda muat dengan nyaman di memori dan latensi query penting, pilih HNSW; jika memori tidak mencukupi, pilih IVFFlat dan benchmark nilai `probes`.

### 3. Simpan Metadata yang Dapat Difilter di Kolom Relasional, Bukan di Dalam Vektor

Embedding menangkap makna, bukan fakta. Kategori, harga, ID tenant, dan status publikasi termasuk kolom biasa dengan indeks B-tree sendiri, bukan dimasukkan ke dalam vektor atau hanya disimpan di dalam embedding. Kolom relasional memberi Anda pemfilteran `WHERE` yang presisi, pemindaian rentang, dan peluang indeks parsial yang tidak pernah bisa diberikan jarak vektor. Saat memfilter, PostgreSQL menerapkan kondisi B-tree bersama indeks ANN — jaga kolom filter tetap kecil dan selektif agar tidak memindai terlalu banyak tetangga.

### 4. Rencanakan Konsistensi Antara Konten dan Embedding

Embedding adalah data turunan: setiap kali teks sumber berubah, vektor tersimpan menjadi basi. Tentukan sejak awal bagaimana pembaruan mengalir: embed di aplikasi saat penulisan (sederhana dan andal bila model berada di balik API), atau pelihara kolom `tsvector` hasil-generate untuk pencarian teks dan worker latar untuk embedding. Saat melakukan upgrade model, jadwalkan backfill yang meng-embed ulang setiap baris secara berkelompok dan bangun ulang indeks setelahnya — jangan pernah mencampur vektor dari dua model dalam satu indeks dan berharap hasilnya bermakna.

### 5. Gabungkan Pencarian Vektor dan Kata Kunci untuk Recall yang Lebih Baik

Vektor unggul pada sinonim, parafrase, dan konsep kabur; full-text search unggul pada istilah persis, kode produk, nama diri, dan token langka. Mesin pencari produksi menjalankan keduanya dan menggabungkan hasil, karena masing-masing menangkap kecocokan yang dilewatkan yang lain. Gunakan reciprocal rank fusion (RRF) atau penjumlahan berbobot untuk menggabungkan dua daftar peringkat. Jatuh kembali ke pencarian kata kunci ketika query mengandung istilah yang kurang ditangani model (ID, string versi, nama merek).

### 6. Benchmark Recall, Latensi, dan Memori Sebelum Berskala

Jangan menyimpulkan kualitas dari segelintir query demo. Bangun set uji query realistis dengan dokumen relevan yang diketahui, ukur recall pada top-k, dan ukur waktu query dengan `EXPLAIN (ANALYZE, BUFFERS)` untuk memastikan indeks ANN benar-benar digunakan. Setelah itu tentukan apakah perlu menaikkan `hnsw.ef_search`, menaikkan `ivfflat.probes`, atau mengkuantisasi vektor (`halfvec`, `int8`, biner) untuk mengurangi memori. Pantau pembangunan indeks dengan `pg_stat_progress_create_index` dan periksa ulang rencana query setelah pemuatan data besar.

## Langkah Implementasi

### Langkah 1: Instal dan Aktifkan pgvector

Instal ekstensi dengan manajer paket sistem operasi Anda, lalu aktifkan di database:

```bash
# Debian/Ubuntu dengan repositori PGDG (sesuaikan versi dengan PostgreSQL Anda)
sudo apt install postgresql-16-pgvector

# Docker
docker run -d --name pg -e POSTGRES_PASSWORD=secret pgvector/pgvector:pg16
```

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verifikasi versi terinstal
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

Layanan terkelola (Amazon RDS, Google Cloud SQL dan AlloyDB, Azure Database for PostgreSQL, Supabase, Neon) sudah menyertakan pgvector — cek dokumentasi penyedianya untuk versi persisnya, karena fitur pengindeksan seperti kuantisasi biner memerlukan pgvector 0.7 atau lebih baru. Tipe `vector` mendukung hingga 16.000 dimensi pada pgvector 0.5+.

### Langkah 2: Buat Tabel dengan Kolom Vektor

Model tabel sehingga kolom embedding menyimpan tepat satu vektor per baris dan metadata berada di kolom yang dapat dipindai. Dimensi `1536` di bawah harus sesuai dengan keluaran model embedding Anda:

```sql
CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  embedding VECTOR(1536),                                  -- sesuai keluaran model
  content_tsv TSVECTOR GENERATED ALWAYS AS
    (to_tsvector('english', description)) STORED           -- untuk pencarian hibrida (Langkah 6)
);

-- Indeks B-tree untuk pemfilteran metadata (Langkah 7)
CREATE INDEX products_category_idx ON products (category);

-- Indeks GIN untuk peringkat full-text (Langkah 6)
CREATE INDEX products_content_tsv_idx ON products USING gin (content_tsv);
```

Kolom `tsvector` hasil-generate menjaga sisi full-text tetap sinkron secara otomatis, yang diandalkan query hibrida di Langkah 6. Jika data Anda multibahasa, ganti `'english'` dengan konfigurasi text search yang sesuai, atau konfigurasi kustom yang dibangun dari beberapa kamus.

### Langkah 3: Buat dan Simpan Embedding

Embedding dibuat di luar PostgreSQL, saat ingest. Aplikasi memanggil penyedia embedding, lalu menyisipkan vektornya sebagai string yang di-cast ke `vector`:

```javascript
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getEmbeddings(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  const data = await res.json();
  // Urutkan berdasarkan index agar hasil tetap sejajar dengan array masukan
  return data.data.sort((a, b) => a.index - b.index).map((e) => e.embedding);
}

async function insertProduct(product) {
  const [embedding] = await getEmbeddings([product.description]);
  await pool.query(
    `INSERT INTO products (name, description, category, price, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`,
    [product.name, product.description, product.category, product.price, JSON.stringify(embedding)]
  );
}
```

Untuk backfill dalam jumlah besar, lakukan insert berkelompok dengan `unnest` agar tidak ada satu round trip per baris:

```sql
INSERT INTO products (name, description, category, price, embedding)
SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::numeric[], $5::vector[]);
```

Gunakan query berparameter seperti di atas — jangan pernah menyisipkan array embedding langsung ke string SQL. Penyedia embedding yang umum meliputi OpenAI (`text-embedding-3-small`), Cohere, serta opsi lokal seperti Ollama atau `sentence-transformers` ketika data tidak boleh keluar dari jaringan Anda.

### Langkah 4: Bangun Indeks HNSW

Buat indeks HNSW **setelah** pemuatan data awal, dengan operator jarak yang sesuai dengan query Anda:

```sql
CREATE INDEX products_embedding_hnsw_idx
  ON products
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

Operator class `vector_cosine_ops` mengindeks jarak kosinus (`<=>`), pilihan default untuk embedding teks. Gunakan `vector_l2_ops` untuk jarak Euclidean (`<->`) atau `vector_ip_ops` untuk inner product (`<#>`), yang sama dengan kemiripan kosinus bila semua vektor dinormalisasi. Knob tuning: `m` yang lebih tinggi meningkatkan recall dengan biaya memori dan waktu build; `ef_construction` yang lebih tinggi meningkatkan recall dengan biaya waktu build. Pantau build yang lama dengan `pg_stat_progress_create_index`, jangan menebak.

Jika Anda memilih IVFFlat (server dengan memori terbatas), tabel harus sudah berisi data, dan jumlah list ditentukan dari jumlah baris:

```sql
CREATE INDEX products_embedding_ivfflat_idx
  ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);   -- aturan praktis: ~akar kuadrat jumlah baris
```

### Langkah 5: Jalankan Query Kemiripan Semantik

Buat query dengan `ORDER BY` pada operator jarak dan `LIMIT` untuk top-k. Ubah jarak kosinus menjadi skor kemiripan dengan `1 - jarak`:

```sql
-- $1 adalah embedding query, mis. '[...]'::vector
SELECT name, category, price,
       1 - (embedding <=> $1::vector) AS similarity
FROM products
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

```javascript
const query = 'headphone nirkabel peredam bising';
const [queryEmbedding] = await getEmbeddings([query]);

const { rows } = await pool.query(
  `SELECT name, category, price,
          1 - (embedding <=> $1::vector) AS similarity
   FROM products
   ORDER BY embedding <=> $1::vector
   LIMIT 5`,
  [JSON.stringify(queryEmbedding)]
);
```

Pencarian perkiraan dapat diatur per sesi: naikkan `hnsw.ef_search` (default 40) atau `ivfflat.probes` (default 1) untuk recall yang lebih baik, dan gunakan `SET LOCAL` di dalam transaksi bila pengaturan hanya berlaku untuk satu query:

```sql
BEGIN;
SET LOCAL hnsw.ef_search = 100;
-- jalankan query
COMMIT;
```

Verifikasi bahwa planner benar-benar menggunakan indeks ANN — sequential scan yang tidak disengaja diam-diam menghancurkan latensi:

```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT name FROM products ORDER BY embedding <=> $1::vector LIMIT 5;
-- Cari: Index Scan using products_embedding_hnsw_idx
```

### Langkah 6: Implementasikan Pencarian Hibrida dengan Fusi Peringkat Full-Text

Pencarian vektor melewatkan token persis dan pencarian kata kunci melewatkan sinonim — jalankan keduanya dan gabungkan daftar peringkat dengan reciprocal rank fusion. Query ini menghitung peringkat untuk setiap kandidat di masing-masing jalur pengambilan, lalu menjumlahkan `1 / (60 + peringkat)` per dokumen sehingga posisi tinggi di salah satu daftar menang:

```sql
WITH vector_hits AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
  FROM products
  ORDER BY embedding <=> $1::vector
  LIMIT 100
), text_hits AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(content_tsv, plainto_tsquery('english', $2)) DESC) AS rank
  FROM products
  WHERE content_tsv @@ plainto_tsquery('english', $2)
  LIMIT 100
), fused AS (
  SELECT id, SUM(1.0 / (60.0 + rank)) AS score
  FROM (
    SELECT id, rank FROM vector_hits
    UNION ALL
    SELECT id, rank FROM text_hits
  ) combined
  GROUP BY id
)
SELECT p.id, p.name, p.category, f.score
FROM fused f
JOIN products p ON p.id = f.id
ORDER BY f.score DESC
LIMIT 10;
```

Konstanta 60 (nilai `k` RRF) meredam pengaruh peringkat rendah; sesuaikan dengan evaluasi recall Anda. Query ini menggunakan indeks GIN `content_tsv` dan indeks HNSW secara berdampingan, sehingga kedua jalur tetap cepat. Jika satu jalur jelas dominan untuk data Anda, fusi penjumlahan berbobot (`0.6 * skor_vektor + 0.4 * skor_teks`) adalah alternatif yang lebih sederhana dan lebih murah.

### Langkah 7: Tambahkan Pemfilteran Metadata dan Isolasi Tenant

Gabungkan pencarian ANN dengan kondisi `WHERE` untuk membatasi hasil — planner menerapkan filter B-tree terhadap kandidat yang dikembalikan indeks:

```sql
SELECT name, category, price,
       1 - (embedding <=> $1::vector) AS similarity
FROM products
WHERE category = $2
  AND price BETWEEN $3 AND $4
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

Untuk sistem multi-tenant, tegakkan lingkup tenant sama seperti query PostgreSQL lainnya: sertakan `tenant_id` di setiap predikat (sebaiknya melalui Row-Level Security) agar filter yang terlewat tidak membocorkan data antar-tenant:

```sql
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id')::bigint);
```

Perhatikan selektivitas filter: HNSW menelusuri graf lalu memeriksa filter, sehingga filter yang hanya cocok dengan sebagian kecil baris tetap memindai banyak tetangga. Jika satu kombinasi filter mendominasi beban kerja (misalnya "cari hanya di kategori X"), pertimbangkan indeks parsial untuk setiap nilai filter yang panas:

```sql
CREATE INDEX products_hnsw_electronics_idx
  ON products USING hnsw (embedding vector_cosine_ops)
  WHERE category = 'Electronics';
```

### Langkah 8: Evaluasi Recall, Latensi, dan Tuning Indeks

Sebelum masuk produksi, kuantifikasi kualitas dan kecepatan:

1. Susun set uji berisi 50–100 query pengguna nyata dengan ID dokumen relevan yang diketahui.
2. Jalankan setiap query melalui pipeline dan hitung **recall@k**: proporsi dokumen relevan yang muncul di hasil top-k.
3. Ukur latensi p95 dengan `EXPLAIN (ANALYZE, BUFFERS)` di bawah beban; pastikan indeks digunakan dan periksa rasio buffer hit.
4. Naikkan `hnsw.ef_search` (atau `ivfflat.probes`) hingga recall@10 berhenti membaik, lalu tetapkan nilai itu sebagai pengaturan produksi Anda.

Jika memori menjadi hambatan, perkecil indeks sebelum menambah hardware. pgvector menawarkan tipe penyimpanan terkuantisasi yang menukar sedikit recall dengan penghematan memori besar:

```sql
-- halfvec: floating-point presisi setengah, kira-kira setengah memori (pgvector >= 0.5)
ALTER TABLE products ADD COLUMN embedding_half halfvec(1536);

-- kuantisasi int8 dengan binary_quantize() menjadi 1 bit per dimensi (pgvector >= 0.7)
CREATE INDEX products_embedding_binary_idx
  ON products USING hnsw ((binary_quantize(embedding)::bit(1536)) bit_hamming_ops);
```

Jalankan ulang evaluasi recall setelah perubahan kuantisasi — penurunan recall yang dapat diterima biasanya 1–3%, tetapi hanya pengukuran yang memastikannya. Terakhir, jadwalkan siklus operasional yang menjaga pencarian tetap sehat: pantau bloat indeks, embed ulang dan bangun ulang setelah upgrade model, serta beri peringatan ketika latensi p95 naik seiring pertumbuhan dataset.

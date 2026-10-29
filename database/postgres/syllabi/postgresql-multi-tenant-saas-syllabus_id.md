---
title: "Silabus PostgreSQL Multi-Tenant SaaS"
description: "Spesialisasi 12 minggu tentang menjalankan SaaS multi-tenant di PostgreSQL — model isolasi tenant, row-level security, konteks tenant melalui connection pool, migrasi sadar-tenant, perlindungan noisy neighbour, backup per tenant dan residensi data, serta penskalaan dengan sharding."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus PostgreSQL Multi-Tenant SaaS

## Ringkasan

Hampir setiap produk B2B SaaS akhirnya menjalankan eksperimen yang sama: menempatkan ratusan hingga ribuan pelanggan berbayar dalam satu klaster PostgreSQL dan berusaha menjaga mereka tetap terisolasi, cepat, dan tertagih dengan benar tanpa membuat satu database per pelanggan. Bagian sulitnya jarang berhenti pada sintaks SQL. Persoalannya ada pada keputusan yang mahal untuk dibalik — model isolasi mana yang dipakai, bagaimana identitas tenant bergerak melewati connection pool, bagaimana perubahan skema digulirkan ke 4.000 tenant tanpa jendela pemeliharaan, dan apa yang terjadi ketika laporan satu pelanggan menghabiskan I/O bersama.

Spesialisasi 12 minggu ini ditujukan untuk backend engineer, database engineer, dan tim platform yang sudah nyaman dengan PostgreSQL dan kini memegang lapisan multi-tenant dari sebuah produk. Kurikulum membangun satu sistem yang berkelanjutan — SaaS manajemen proyek dengan organisasi, anggota, proyek, dan penagihan berbasis pemakaian — lalu kembali ke sistem itu setiap minggu seiring model isolasi, pipeline migrasi, dan perkakas operasional tumbuh di sekelilingnya. Isolasi diperlakukan sebagai spektrum, bukan pilihan biner: tabel bersama dengan row-level security, skema-per-tenant, database-per-tenant, dan shard-per-tenant semuanya diimplementasikan, diukur, dan dibandingkan pada beban kerja yang sama sehingga trade-off-nya diamati langsung, bukan dihafal.

Kurikulum ini sengaja menghindari materi yang sudah dicakup jalur PostgreSQL umum. Tuning query, internal indeks, dan topologi replikasi adalah prasyarat, bukan topik. Setiap minggu ditutup dengan lab yang berjalan pada dataset sepuluh ribu tenant yang sudah di-seed, sehingga peserta merasakan perbedaan antara desain yang terlihat skalabel di atas kertas dan desain yang bertahan saat berhadapan dengan skew tenant yang nyata.

## Kurikulum

### Minggu 1: Ruang Keputusan Multi-Tenancy
- **Model isolasi dan biaya sebenarnya**
  - Tabel bersama dengan kolom diskriminator tenant, ditambah row-level security
  - Skema-per-tenant: satu database bersama, namespace terpisah
  - Database-per-tenant dan klaster-per-tenant
  - Shard-per-tenant serta arsitektur berbasis cell
- **Memilih berdasarkan bukti, bukan intuisi**
  - Radius dampak, risiko noisy neighbour, dan batasan kepatuhan per model
  - Kurva biaya operasional: migrasi, backup, jumlah koneksi
  - Jalur migrasi antar model dan pilihan mana yang bersifat satu arah

### Minggu 2: Desain Skema untuk Skew Tenant
- **Kunci yang membawa tenant ke mana-mana**
  - Primary key komposit pada `(tenant_id, id)` dan alasan UUID saja tidak cukup
  - Foreign key komposit yang membuat referensi lintas tenant mustahil
  - Desain indeks dengan kolom tenant di posisi terdepan
- **Pola model data**
  - Data milik tenant versus data referensi bersama
  - Soft delete, tabel arsip, dan retensi per tenant
  - Tabel audit yang mencatat tenant dan pengguna yang beraksi

### Minggu 3: Row-Level Security Secara Mendalam
- **Mekanika policy**
  - Mengaktifkan RLS dan postur default-deny
  - `USING` versus `WITH CHECK` serta pemetaannya ke operasi baca dan tulis
  - Policy per perintah, per role, dan kombinasi permissive dengan restrictive
- **Membuat policy dapat dipercaya**
  - Variabel sesi versus fungsi lookup untuk identitas tenant
  - Memaksa RLS bagi pemilik tabel dengan `FORCE ROW LEVEL SECURITY`
  - Menguji policy: query adversarial yang mencoba keluar dari tenant

### Minggu 4: Konteks Tenant Melewati Connection Pool
- **Masalah pooling**
  - Mengapa `SET` bocor pada koneksi pooled mode transaction
  - `SET LOCAL` di dalam transaksi dan mengapa batas transaksi penting
  - Mode PgBouncer dan apa yang diizinkan masing-masing mode
- **Menyebarkan identitas dengan aman di aplikasi**
  - Wrapper transaksi per request yang menetapkan konteks tenant sekali
  - Pagar pengaman: gagal tertutup ketika tenant tidak ada
  - Background job, migrasi, dan tool admin yang harus melewati isolasi secara sengaja

### Minggu 5: Migrasi Sadar-Tenant dalam Skala Besar
- **Migrasi tabel bersama**
  - Pola expand dan contract untuk perubahan kolom tanpa downtime
  - Backfill dibatch per tenant agar tekanan lock dan WAL tetap terbatas
  - Urutan rollout kode yang kompatibel mundur
- **Migrasi skema-per-tenant**
  - Migration runner yang mengiterasi tenant dengan checkpoint dan dapat dilanjutkan
  - Deteksi dan perbaikan drift untuk tenant yang melewatkan sebuah rilis
  - Tenant kanari, rollout per kohort, dan strategi rollback

### Minggu 6: Pengendalian Noisy Neighbour
- **Tata kelola sumber daya per tenant**
  - Statement timeout, `idle_in_transaction_session_timeout`, dan batas work memory
  - Antrean query dan batas konkurensi per tenant di pooler
  - Menghentikan sesi liar dengan aman dan memberi tahu tim pemiliknya
- **Keadilan di bawah beban**
  - Mendeteksi pemakai terbesar dengan `pg_stat_statements` dan view aktivitas
  - Memisahkan trafik analitik berat dari trafik transaksional
  - Load test dengan distribusi ukuran tenant yang realistis, bukan tenant seragam

### Minggu 7: Otomasi Siklus Hidup Tenant
- **Onboarding**
  - Menyediakan tenant di dalam klaster bersama versus membuat database baru
  - Seeding data referensi dan default secara idempoten
  - Menyiapkan kredensial, role, dan limit pada saat pembuatan
- **Offboarding dan permintaan kepatuhan**
  - Mengekspor seluruh data satu tenant sebagai berkas portabel
  - Penghapusan permanen dengan penyelesaian yang dapat diverifikasi
  - Residensi data, jendela retensi, dan legal hold

### Minggu 8: Backup dan Pemulihan per Tenant
- **Granularitas pemulihan**
  - Mengapa restore seluruh klaster bukan jawaban yang dapat diterima untuk kesalahan satu pelanggan
  - Ekspor logis per tenant dan ekstraksi baris satu tenant pada titik waktu tertentu
  - Memulihkan satu tenant ke database sementara untuk diperiksa
- **Membuktikan pemulihan benar-benar bekerja**
  - Drill restore terjadwal dan waktu pemulihan terukur per tenant
  - Runbook terdokumentasi dengan pemilik yang jelas
  - Rekonsiliasi setelah restore parsial ketika tenant sudah melanjutkan aktivitasnya

### Minggu 9: Metering, Kuota, dan Penagihan Berbasis Pemakaian
- **Menangkap pemakaian di database**
  - Tabel event yang dipartisi berdasarkan waktu dengan indeks berawalan tenant
  - Strategi agregasi yang tidak memindai seluruh event saat pembuatan invoice
  - Rollup idempoten dan event yang datang terlambat
- **Menegakkan batas**
  - Peringatan lunak versus blokir keras, dan di mana masing-masing ditempatkan
  - Kuota rate dan penyimpanan yang diperiksa tanpa satu round trip per request
  - Rekonsiliasi pemakaian terukur terhadap invoice

### Minggu 10: Penskalaan Melampaui Satu Primary
- **Penskalaan baca dan partisi**
  - Merutekan trafik baca per tenant tanpa merusak read-your-writes
  - Partisi deklaratif berdasarkan tenant atau berdasarkan hash tenant
  - Membedakan tenant panas dan memberi mereka sumber daya khusus
- **Sharding dengan Citus**
  - Tabel terdistribusi, tabel referensi, dan kolom distribusi
  - Join terko-lokasi dan biaya query lintas shard
  - Rebalance shard dan penambahan node tanpa downtime

### Minggu 11: Observabilitas dan Operasi Sistem Multi-Tenant
- **Telemetri berdimensi tenant**
  - Menyertakan identitas tenant ke log, metrik, dan trace tanpa membocorkan PII
  - Dashboard untuk latensi, error rate, dan pemakaian koneksi per tenant
  - Alerting pada anomali lintas tenant, bukan pada rata-rata
- **Mengoperasikan platform**
  - Perencanaan kapasitas dengan distribusi tenant yang miring
  - Upgrade dan perubahan ekstensi pada skema bersama maupun per tenant
  - Playbook respons insiden ketika radius dampaknya hanya sebagian pelanggan

### Minggu 12: Proyek Akhir — Pengiriman Platform Multi-Tenant
- **Mengonsolidasikan sistem**
  - Menjalankan SaaS manajemen proyek pada model isolasi yang dipilih di minggu 1
  - Migrasi sadar-tenant, kuota, metering, dan pemulihan per tenant sudah terpasang
  - Satu tenant kanari yang bermigrasi dari skema-per-tenant ke tabel bersama, atau sebaliknya
- **Bukti dan serah terima**
  - Hasil benchmark dengan skew tenant realistis sebelum dan sesudah tuning
  - Suite pengujian isolasi yang membuktikan tidak ada tenant dapat membaca atau menulis baris tenant lain
  - Dokumen arsitektur dan runbook operasional

## Proyek Akhir

Peserta menyerahkan platform PostgreSQL multi-tenant yang berjalan untuk SaaS manajemen proyek. Sistem harus mendukung minimal 500 tenant yang di-seed dengan volume data yang sengaja tidak merata, mengisolasi mereka menggunakan model yang diperdebatkan pada minggu 1, dan mengekspos permukaan operasional yang dibutuhkan tim platform nyata: provisioning tenant, eksekusi migrasi sadar-tenant, metering pemakaian per tenant dengan kuota yang ditegakkan, ekspor dan restore satu tenant, serta dashboard yang menampilkan latensi dan pemakaian koneksi per tenant.

Hasil yang dikumpulkan mencakup skema database dan desain role, wrapper transaksi di sisi aplikasi yang menetapkan konteks tenant, migration runner dengan checkpoint yang dapat dilanjutkan, suite pengujian isolasi, keluaran benchmark dari beban kerja yang miring, dan runbook yang mencakup onboarding, offboarding, pemulihan, serta respons insiden. Sebuah dokumen desain singkat harus membenarkan model isolasi yang dipilih dibandingkan minimal dua alternatif, termasuk biaya migrasi jika model tersebut diubah di kemudian hari.

## Kriteria Penilaian

- **Tugas**: Lab mingguan dinilai dari kebenaran policy RLS terhadap query adversarial, penanganan konteks tenant yang aman melalui pooler mode transaction, kemampuan migration runner dilanjutkan setelah terhenti, dan akurasi rollup metering (tugas mandiri ditambah kuis singkat tentang trade-off isolasi dan perilaku pooling).
- **Proyek Akhir**: Dievaluasi dari integritas isolasi (suite pengujian membuktikan akses lintas tenant mustahil melalui jalur aplikasi), kelengkapan operasional (provisioning, migrasi, kuota, metering, dan pemulihan per tenant berjalan end to end), performa di bawah skew tenant (latensi per tenant terdokumentasi, bukan rata-rata klaster), serta kualitas dokumen desain dan runbook.

## Referensi

- [Kebijakan row security PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Partisi deklaratif PostgreSQL](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Konfigurasi dan mode pooling PgBouncer](https://www.pgbouncer.org/config.html)
- [Dokumentasi Citus](https://docs.citusdata.com/)
- [Ekspor logis PostgreSQL dengan pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Model tenancy AWS SaaS Factory](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.html)

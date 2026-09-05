---
title: "Silabus Analitik Time-Series PostgreSQL"
description: "Kurikulum khusus 12 minggu untuk membangun dan mengoperasikan platform analitik time-series kelas produksi di atas PostgreSQL dengan TimescaleDB — pemodelan hypertable, continuous aggregate, kompresi, retensi dan siklus hidup data, tuning performa, serta pola analitik dunia nyata."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Analitik Time-Series PostgreSQL

## Ringkasan

Data time-series — telemetri sensor, tick keuangan, metrik aplikasi, dan log peristiwa — adalah salah satu beban kerja dengan pertumbuhan tercepat dalam rekayasa data modern, dan PostgreSQL adalah fondasi yang sangat kuat untuknya. Dengan ekstensi TimescaleDB, PostgreSQL mendapatkan hypertable, continuous aggregate, kompresi kolom native, dan manajemen siklus hidup data otomatis sambil tetap mempertahankan kekuatan penuh SQL, JOIN, dan ekosistem PostgreSQL yang matang.

Spesialisasi 12 minggu ini mengajarkan peserta cara merancang, membangun, dan mengoperasikan platform analitik time-series di atas PostgreSQL. Kurikulum ini mengasumsikan pemahaman fundamental PostgreSQL yang solid dan berfokus pada sisi analitik: memodelkan data bervolume tinggi dengan kardinalitas tinggi, menyerapnya secara efisien, mengagregasinya secara real-time, mengompresi dan mempertahankannya secara hemat biaya, serta mengkuerinya dengan SQL time-series tingkat lanjut. Kurikulum ini sengaja berbeda dari kursus administrasi PostgreSQL generik — setiap minggu membangun menuju capstone, yaitu platform analitik kelas produksi dengan runbook operasional yang terdokumentasi.

## Kurikulum

### Minggu 1: Fundamental Pemodelan Data Time-Series
- **Karakteristik data time-series**
  - Struktur timestamp + pengukuran + metadata (tag)
  - Volume tulis tinggi, akses append-heavy, keterurutan waktu
  - Trade-off granularitas, kardinalitas, dan retensi
- **Pemodelan relasional untuk time-series**
  - Desain tabel wide vs narrow (long)
  - Normalisasi tag vs denormalisasi untuk kecepatan query
  - Kapan partisi PostgreSQL native cukup dan kapan tidak

### Minggu 2: Arsitektur dan Setup TimescaleDB
- **Instalasi dan konfigurasi TimescaleDB**
  - Instalasi ekstensi dan `timescaledb-tune`
  - Background worker dan konfigurasi memori
- **Internal hypertable**
  - Cara hypertable mempartisi data menjadi chunk
  - Pemilihan interval chunk dan target ukuran chunk
  - Partisi spasial untuk distribusi tambahan

### Minggu 3: Desain Hypertable dan Ingestion Data
- **Membuat dan mengelola hypertable**
  - Parameter `create_hypertable` dan praktik terbaik
  - Memilih kolom dimensi dan interval chunk
- **Pola ingestion throughput tinggi**
  - Ingestion batch dengan `COPY`
  - Ingestion dari Kafka, gateway IoT, dan peristiwa aplikasi
  - Menghindari hotspot dengan kunci partisi yang tepat

### Minggu 4: Continuous Aggregate dan Analitik Real-Time
- **Materialized view untuk time-series**
  - Fundamental pengelompokan `time_bucket`
  - Membuat continuous aggregate dan kebijakan refresh
- **Agregasi real-time**
  - Mengkueri data terbaru yang belum ter-materialisasi
  - Hierarki rollup: raw → per jam → per hari → per bulan

### Minggu 5: SQL Tingkat Lanjut untuk Time-Series
- **Fungsi SQL time-series**
  - `time_bucket`, `time_bucket_gapfill`
  - `locf` (last observation carried forward) dan `interpolate`
  - `first`, `last`, `histogram`, dan `candlestick_agg`
- **Pola query analitik**
  - Fungsi window pada baris terurut waktu
  - JOIN `LATERAL` untuk kalkulasi per-series

### Minggu 6: Kompresi dan Optimalisasi Penyimpanan
- **Kompresi native TimescaleDB**
  - Mekanik kompresi kolom dan segment-by/order-by
  - Kebijakan kompresi dan rekompresi chunk
- **Rekayasa biaya penyimpanan**
  - Mengukur rasio kompresi pada beban kerja nyata
  - Penyimpanan berjenjang dengan data tiering ke penyimpanan objek

### Minggu 7: Retensi, Siklus Hidup Data, dan Pengarsipan
- **Retensi data otomatis**
  - `drop_chunks` dan kebijakan retensi
  - Reorder dan `move_chunk` untuk pemeliharaan
- **Merancang siklus hidup data**
  - Tier hot, warm, dan cold
  - Pengarsipan ke penyimpanan historis yang immutable

### Minggu 8: Tuning Performa untuk Beban Kerja Time-Series
- **Strategi pengindeksan**
  - Indeks BRIN untuk data yang terurut alami
  - Indeks GiST untuk data multidimensi
- **Perencanaan query untuk hypertable**
  - Chunk exclusion dan constraint-aware planning
  - Menghindari pemindaian lambat dengan penggunaan `time_bucket` yang benar
  - Tuning continuous aggregate dan lag materialisasi

### Minggu 9: Ekstensi dan Ekosistem Time-Series
- **TimescaleDB Toolkit dan hyperfunction**
  - `hyperloglog`, `uddsketch`, dan aproksimasi persentil
  - Primitif deteksi anomali dan peramalan
- **Ekstensi pelengkap**
  - `pg_stat_statements` untuk analisis beban kerja
  - Citus untuk time-series terdistribusi, PostGIS untuk join temporal-spasial

### Minggu 10: Observabilitas dan Operasional
- **Memantau platform time-series**
  - Pemeriksaan kesehatan ukuran chunk, kompresi, dan retensi
  - Perilaku vacuum dan autovacuum pada hypertable
- **Backup, restore, dan upgrade**
  - `pg_dump`/`pg_restore` dengan TimescaleDB
  - Upgrade versi dan migrasi ekstensi `timescaledb`

### Minggu 11: Pola Analitik Dunia Nyata
- **Platform IoT dan telemetri**
  - Metrik armada perangkat dan deteksi anomali
- **Data pasar keuangan**
  - Agregasi candlestick dan analisis data tick
- **Metrik DevOps**
  - Penyimpanan scrape ala Prometheus dan query SLO
- **Dasar peramalan**
  - Dekomposisi musiman dan peramalan sederhana dengan hyperfunction

### Minggu 12: Capstone — Platform Time-Series Produksi
- **Pembangunan platform end-to-end**
  - Desain skema, pipeline ingestion, dan continuous aggregate
  - Kebijakan kompresi, retensi, dan pengarsipan
  - Dashboard dan query analitik
- **Runbook operasional**
  - Prosedur monitoring, backup, recovery, dan upgrade
  - Validasi performa terhadap SLO yang ditetapkan

## Proyek Akhir

Peserta merancang dan membangun platform analitik time-series kelas produksi di atas PostgreSQL dengan TimescaleDB. Pilih satu domain yang realistis — telemetri armada, data tick keuangan, atau metrik aplikasi/DevOps — dan berikan:

1. Skema hypertable dengan interval chunk dan pengaturan kompresi yang dapat dipertanggungjawabkan.
2. Pipeline ingestion yang memuat minimal 10 juta baris dan mendemonstrasikan praktik terbaik loading batch.
3. Hierarki continuous aggregate berjenjang (raw → per jam → per hari) dengan kebijakan refresh.
4. Query analitik menggunakan gap filling, interpolasi, dan minimal satu hyperfunction.
5. Kebijakan retensi dan pengarsipan yang mengendalikan pertumbuhan penyimpanan.
6. Laporan performa yang mengukur throughput ingestion, latensi query, dan rasio kompresi.
7. Runbook operasional tertulis yang mencakup monitoring, backup, dan recovery.

## Kriteria Penilaian

- **Tugas**: Lab praktis mingguan (minggu 1–11) dinilai berdasarkan kebenaran skema, performa query, dan kepatuhan terhadap praktik terbaik TimescaleDB. Setiap tugas menyertakan justifikasi tertulis singkat untuk keputusan desain.
- **Proyek Akhir**: Capstone dievaluasi berdasarkan kualitas pemodelan data, throughput ingestion, desain continuous aggregate, efektivitas kompresi, kebenaran siklus hidup, dan kelengkapan runbook operasional. Demonstrasi query langsung dan presentasi 15 menit diperlukan.
- **Kuis**: Dua kuis di tengah kursus memvalidasi pemahaman konseptual tentang internal hypertable dan SQL time-series.

## Referensi

- [Dokumentasi TimescaleDB](https://docs.timescale.com/)
- [Dokumentasi PostgreSQL](https://www.postgresql.org/docs/)
- [Referensi TimescaleDB Toolkit & Hyperfunctions](https://docs.timescale.com/api/latest/hyperfunctions/)
- [Blog Timescale — Rekayasa Data Time-Series](https://www.timescale.com/blog)
- [Dokumentasi Partisi PostgreSQL](https://www.postgresql.org/docs/current/ddl-partitioning.html)

---
title: "Silabus MongoDB Tingkat Lanjut"
description: "Kurikulum 12 minggu yang komprehensif bagi pengembang MongoDB berpengalaman, mencakup arsitektur enterprise, sharding, operasi replica set, transaksi ACID multi-dokumen, change streams, keamanan, rekayasa performa, administrasi Atlas, dan keunggulan operasional."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus MongoDB Tingkat Lanjut

## Ringkasan

Silabus tingkat lanjut selama 12 minggu ini dirancang bagi pengembang dan administrator basis data yang telah memiliki pengalaman langsung dengan MongoDB dan ingin menguasai operasi, arsitektur, dan optimasi tingkat enterprise. Kurikulum ini melampaui operasi CRUD dasar dan agregasi untuk mencakup konsep sistem terdistribusi yang mendukung MongoDB dalam skala besar: strategi sharding, internal replica set, semantik transaksi ACID multi-dokumen, penangkapan perubahan data dengan change streams, arsitektur keamanan komprehensif, rekayasa performa, administrasi cloud Atlas, pencadangan dan pemulihan bencana, serta perangkat operasional otomatis. Setiap modul menggabungkan fondasi teoretis yang mendalam dengan laboratorium berorientasi produksi dan studi kasus dunia nyata. Kursus ini diakhiri dengan proyek akhir yang membutuhkan perancangan, penyebaran, dan pengoperasian klaster MongoDB multi-region yang ter-shard untuk aplikasi throughput tinggi.

Di akhir kursus ini, peserta akan mampu merancang shard key untuk berbagai pola akses, merencanakan dan menjalankan upgrade klaster tanpa waktu henti, menyetel kueri dan indeks untuk latensi sub-milidetik, mengimplementasikan enkripsi ujung-ke-ujung dan RBAC, mengonfigurasi replikasi lintas-region untuk pemulihan bencana, serta mengotomatiskan tugas operasional rutin menggunakan Ops Manager atau API Atlas.

## Kurikulum

### Modul 1: Arsitektur dan Internal Replica Set (Minggu 1)

- **Mekanisme pemilihan dan konsensus**
  - Algoritma konsensus Raft di MongoDB: pemilihan pemimpin, pemungutan suara, dan semantik komit
  - Pengaturan prioritas dan timer pemilihan: penyesuaian `electionTimeoutMillis`
  - Anggota yang memenuhi syarat voting serta anggota tersembunyi dan arbiter
  - Bagaimana write concern (`w: majority`) berinteraksi dengan replikasi

- **Mekanisme replikasi**
  - Struktur Oplog, ukuran, dan pengelolaan jendela
  - Sinkronisasi sekunder: sinkronisasi awal vs. tailing replikasi
  - Skenario rollback: deteksi, pemulihan, dan praktik terbaik untuk menghindari rollback
  - Replikasi berantai dan implikasi kinerjanya

- **Preferensi baca dan model konsistensi**
  - Mode preferensi baca: `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred`, `nearest`
  - Konfigurasi `maxStalenessSeconds` dan ambang latensi
  - Sesi konsistensi kausal dan `afterClusterTime`
  - Snapshot reads dan tingkat `readConcern` (`local`, `available`, `majority`, `linearizable`, `snapshot`)

- **Penyebaran replica set produksi**
  - Topologi minimum yang direkomendasikan (3 anggota pembawa data di 2+ pusat data)
  - Anggota tersembunyi untuk analitik dan pencadangan
  - Anggota tertunda untuk pemulihan titik-waktu
  - Penanganan partisi jaringan dan skenario split-brain

### Modul 2: Arsitektur dan Desain Sharding (Minggu 2)

- **Dasar-dasar sharding**
  - Komponen klaster sharded: `mongos`, `config servers`, shard replica set
  - Persyaratan Config Server Replica Set (CSRS)
  - Rentang chunk, titik pemisahan, dan balancer

- **Pemilihan shard key**
  - Karakteristik shard key: kardinalitas, frekuensi, dan monotonisitas
  - Sharding dengan rentang vs. hash
  - Compound shard key dan trade-off-nya
  - Zone sharding untuk isolasi data dan kepatuhan regulasi
  - Anti-pola umum: kunci monotonik, kunci kardinalitas rendah, jumbo chunk

- **Manajemen balancing dan chunk**
  - Penjadwalan jendela balancer
  - Pemecahan dan penggabungan chunk manual
  - Mekanisme `moveChunk` dan dampaknya terhadap performa klaster
  - Pembatasan migrasi chunk dan implikasi `writeConcern`

- **Pertimbangan sharding produksi**
  - Memilih jumlah shard yang tepat
  - Pre-splitting untuk pemuatan data massal
  - Penambahan, penghapusan, dan penyeimbangan ulang shard
  - Strategi mitigasi hot shard

### Modul 3: Transaksi ACID Multi-Dokumen (Minggu 3)

- **Dasar-dasar transaksi**
  - Cakupan jaminan ACID multi-dokumen (replica set dan sharded cluster)
  - Sintaks transaksi: `startSession`, `startTransaction`, `commitTransaction`, `abortTransaction`
  - Batas masa transaksi (default 1000ms, batas tulis 16MB)
  - Kesalahan `TransactionTooLargeForCache` dan cara mengatasinya

- **Read dan write concern dalam transaksi**
  - Mengonfigurasi `readConcern` (`snapshot`, `local`, `majority`) per transaksi
  - `writeConcern` untuk komit transaksi
  - Konsistensi kausal lintas batas transaksi

- **Logika percobaan ulang dan penanganan kesalahan**
  - Kesalahan transaksi sementara dan percobaan ulang otomatis
  - Penanganan label `TransientTransactionError`
  - Mengimplementasikan exponential backoff dengan jitter dalam kode aplikasi
  - Menyeimbangkan percobaan ulang dengan SLO latensi

- **Pertimbangan performa**
  - Overhead transaksi pada mesin penyimpanan WiredTiger
  - Kontensi `wiredTigerMaxWriteLock`
  - Dampak ukuran oplog dari transaksi berdurasi panjang
  - Pola aplikasi: kapan menggunakan transaksi vs. operasi atomik dokumen tunggal
  - Pembuatan profil dan pemantauan aktivitas transaksi

### Modul 4: Change Streams dan Pola Data Reaktif (Minggu 4)

- **Dasar-dasar change streams**
  - Tahapan agregasi `$changeStream` dan struktur pipeline
  - Resume token: bidang `_data`, struktur token, dan pemulihan
  - Change streams terbuka vs. tertutup

- **Peristiwa perubahan dan pemfilteran**
  - Jenis peristiwa: `insert`, `update`, `replace`, `delete`, `invalidate`, `drop`, `rename`, `dropDatabase`
  - Pemfilteran `$match` pada `operationType`, `ns`, dan `documentKey`
  - `$project` pada `fullDocument` untuk pencarian pembaruan
  - Opsi `fullDocument: "required"` dan `fullDocumentBeforeChange`

- **Topologi change stream**
  - Penyebaran di replica set dan sharded cluster
  - Pertimbangan sharded cluster: urutan per-shard vs. urutan global
  - Kemampuan dilanjutkan dan persistensi resume token
  - Mengoordinasikan beberapa konsumen dengan resume token yang sama

- **Pola integrasi enterprise**
  - Pipeline Change Data Capture (CDC) ke gudang data
  - Event sourcing dan CQRS dengan change streams
  - Memicu invalidasi cache dan penyegaran materialized view
  - Integrasi change stream dengan Kafka dan RabbitMQ

### Modul 5: Arsitektur Keamanan (Minggu 5)

- **Otentikasi dan otorisasi**
  - Mekanisme otentikasi SCRAM, x.509, LDAP, dan Kerberos
  - Role-Based Access Control (RBAC): peran bawaan vs. peran kustom
  - Model hak istimewa: tindakan, sumber daya, dan pewarisan hak istimewa
  - Otorisasi lokal vs. eksternal

- **Enkripsi transport**
  - Konfigurasi TLS/SSL untuk `mongod`, `mongos`, dan klien
  - Manajemen sertifikat: CA, server, dan sertifikat klien
  - Rotasi sertifikat tanpa waktu henti
  - Opsi konfigurasi `net.tls` dan mode FIPS

- **Enkripsi saat istirahat**
  - Enkripsi mesin penyimpanan WiredTiger
  - Manajemen kunci enkripsi dengan integrasi KMIP
  - Manajemen kunci lokal vs. manajer kunci eksternal
  - Enkripsi log audit

- **Enkripsi tingkat bidang dan sisi klien**
  - Arsitektur Client-Side Field Level Encryption (CSFLE)
  - Enkripsi otomatis vs. enkripsi eksplisit
  - Koleksi key vault dan konfigurasi penyedia KMS
  - Enkripsi deterministik vs. acak
  - Queryable Encryption (MongoDB 7.0+)

- **Audit**
  - Konfigurasi jejak audit peristiwa sistem
  - Konfigurasi filter audit untuk penangkapan peristiwa yang ditargetkan
  - Format log audit: JSON, BSON, syslog
  - Pertimbangan kepatuhan (SOC2, HIPAA, PCI-DSS)

### Modul 6: Rekayasa Performa dalam Skala Besar (Minggu 6)

- **Profil kueri dan optimasi**
  - Koleksi `system.profile`: tingkat pembuatan profil dan analisis log
  - Penguraian output `explain()`: `executionStats`, `winningPlan`, `rejectedPlans`
  - Penggunaan index filter untuk menguji kandidat indeks
  - `$indexStats` untuk analisis penggunaan indeks

- **Strategi optimasi indeks**
  - Indeks parsial, sparse, dan wildcard untuk beban kerja khusus
  - Flexible indexes dan indeks wildcard `$**` untuk lingkungan fleksibel skema
  - Pembangunan indeks di produksi: latar depan vs. latar belakang (`createIndexes`)
  - Pembangunan indeks bergulir pada replica set
  - Interseksi indeks dan analisis covering query

- **Penyetelan mesin penyimpanan**
  - Konfigurasi cache WiredTiger: `wiredTigerCacheSizeGB`
  - Interval checkpoint WiredTiger dan kompresi jurnal
  - Kompresi: `snappy`, `zlib`, `zstd` untuk data dan indeks
  - Penyetelan kompresi blok dan kompresi prefiks

- **Manajemen memori dan I/O**
  - Penentuan ukuran working set dan pelacakan page fault
  - Metrik `serverStatus` dan `dbStats` untuk perencanaan kapasitas
  - Read-ahead dan optimasi sistem berkas untuk WiredTiger
  - Connection pooling: `maxPoolSize`, `minPoolSize`, dan `waitQueueTimeoutMS`

### Modul 7: Pencadangan, Pemulihan, dan Pemulihan Bencana (Minggu 7)

- **Strategi pencadangan**
  - `mongodump`/`mongorestore`: kasus penggunaan, keterbatasan, dan batasan point-in-time
  - Snapshot sistem berkas (LVM, EBS) untuk pencadangan yang konsisten
  - Pencadangan Ops Manager: pencadangan inkremental berkelanjutan dengan snapshot yang dapat dikueri
  - Pencadangan Atlas: snapshot penyedia cloud dan pencadangan serverless berkelanjutan
  - Manajemen jendela pencadangan dan dampak pada performa produksi

- **Metodologi pemulihan**
  - Pemulihan penuh vs. pemulihan selektif (tingkat koleksi atau basis data)
  - Pemulihan lintas-region untuk pengujian DR
  - Pemulihan titik-waktu dari data oplog
  - Prosedur validasi: checksum, jumlah dokumen, verifikasi indeks

- **Perencanaan pemulihan bencana**
  - Definisi RTO dan RPO untuk beban kerja MongoDB
  - Penyebaran replica set lintas-region
  - Pengujian failover otomatis (pemilihan paksa)
  - Anggota replica set tertunda untuk pemulihan titik-waktu cepat
  - Pengembangan runbook DR dan uji coba berkala

- **Kelangsungan bisnis**
  - Pola penyebaran multi-pusat data (active-passive, active-active)
  - Enkripsi pencadangan dan penyimpanan di luar lokasi
  - Pemantauan kesehatan pencadangan dan pengiriman peringatan kegagalan
  - Jejak audit kepatuhan untuk operasi pencadangan dan pemulihan

### Modul 8: Administrasi Lanjutan MongoDB Atlas (Minggu 8)

- **Arsitektur Atlas dan manajemen klaster**
  - Tingkatan klaster: M0-M2-M5 (serverless), M10-M700 (dedicated), dan multi-region
  - Auto-scaling klaster: komputasi, penyimpanan, dan IOPS
  - Penyebaran multi-cloud dan multi-region
  - Global clusters dengan zone sharding

- **Fitur keamanan Atlas**
  - Daftar akses IP dan VPC peering
  - Private endpoints (AWS PrivateLink, Azure Private Link, GCP Private Service Connect)
  - Network peering untuk topologi multi-cloud
  - Enkripsi Atlas saat istirahat dengan manajemen kunci pelanggan (CMK)

- **Performa dan optimasi Atlas**
  - Performance Advisor: rekomendasi indeks dan penyetelan kueri
  - Real-Time Performance Panel untuk analisis beban kerja langsung
  - Atlas Search: indeks pencarian teks lengkap berbasis Lucene
  - Online archive dan penyimpanan bertingkat untuk optimasi biaya
  - Integrasi data lake: Atlas Data Federation dan kueri berbasis S3

- **Otomatisasi dan API Atlas**
  - Atlas Administration API untuk penyediaan klaster
  - Infrastructure-as-Code dengan Terraform dan Atlas Provider
  - Konfigurasi peringatan dan saluran notifikasi
  - Maintenance windows dan pembaruan bergulir

### Modul 9: Pemodelan Data untuk Beban Kerja Enterprise (Minggu 9)

- **Pola desain skema**
  - Pemodelan beban kerja operasional vs. analitis
  - Satu-ke-satu, satu-ke-banyak, banyak-ke-banyak: trade-off embedding vs. referencing
  - Pola desain perluasan kolom, atribut, dan polimorfik
  - Pola perkiraan, terkomputasi, dan outlier untuk beban kerja yang menantang

- **Beban kerja deret waktu dan IoT**
  - Koleksi time-series MongoDB: bucket granularity, metaField, dan timeField
  - Kompaksi bucket otomatis dan indeks sekunder pada data time-series
  - Versioning skema untuk format data IoT yang berkembang
  - Downsampling dan kebijakan retensi

- **Data graf dan hierarkis**
  - Materialized path, nested sets, dan referensi untuk struktur pohon
  - `$graphLookup` untuk penelusuran graf rekursif
  - Kasus penggunaan graf: jejaring sosial, mesin rekomendasi, deteksi penipuan
  - Pemodelan hibrida dengan array tersemat dan referensi graf

- **Migrasi dan evolusi skema**
  - Strategi migrasi skema langsung: migrasi inkremental, lambat, dan massal
  - `validator` dan `validationLevel` untuk tata kelola skema
  - Perubahan skema kompatibel mundur dalam produksi
  - Pipeline transformasi data untuk alur kerja ETL dan ELT

### Modul 10: Pemantauan, Peringatan, dan Otomatisasi (Minggu 10)

- **Dasar-dasar pemantauan**
  - Pemantauan MongoDB Cloud Manager dan Ops Manager
  - `mongostat` dan `mongotop` untuk wawasan klaster waktu nyata
  - Indikator kinerja utama: latensi kueri, koneksi, page fault, jendela oplog
  - Pemantauan kustom dengan `db.currentOp()` dan `db.serverStatus()`

- **Peringatan dan respons insiden**
  - Ambang peringatan kritis: keterlambatan replikasi, kueri panjang, hitungan asersi
  - Konfigurasi peringatan Atlas untuk notifikasi multi-saluran
  - Integrasi Prometheus dan Grafana melalui MongoDB exporter
  - Runbook respons insiden untuk skenario kegagalan umum

- **Otomatisasi dengan Ops Manager**
  - Penyebaran, peningkatan, dan manajemen patch otomatis
  - Prosedur pemeliharaan bergulir (pembangunan indeks, upgrade)
  - Konfigurasi agen dan pemantauan kesehatan
  - Otomatisasi pencadangan dan pengujian pemulihan terjadwal

- **Infrastructure as Code**
  - Terraform provider untuk MongoDB Atlas
  - Kubernetes Operator untuk MongoDB Enterprise
  - Playbook Ansible untuk otomatisasi MongoDB
  - Integrasi CI/CD untuk manajemen perubahan basis data

### Modul 11: Migrasi, Upgrade, dan Manajemen Versi (Minggu 11)

- **Strategi upgrade versi**
  - Penomoran versi MongoDB dan siklus rilis
  - Prosedur upgrade bergulir untuk replica set dan sharded cluster
  - Manajemen Feature Compatibility Version (`FCV`)
  - Pertimbangan downgrade dan matriks kompatibilitas

- **Pola migrasi data**
  - Migrasi langsung dari versi MongoDB lama
  - Migrasi lintas-platform (on-premises ke Atlas, atau sebaliknya)
  - Migrasi heterogen: RDBMS ke MongoDB dengan pipeline ETL
  - Migrasi kumpulan data besar dengan waktu henti rendah
  - Validasi data dan rekonsiliasi setelah migrasi

- **Perencanaan perangkat keras dan kapasitas**
  - Penentuan ukuran klaster yang tepat: kebutuhan CPU, memori, penyimpanan, dan IOPS
  - Keputusan penskalaan vertikal vs. horizontal
  - Perbandingan mesin penyimpanan untuk optimasi beban kerja spesifik
  - Metodologi benchmarking untuk perencanaan kapasitas

- **Manajemen siklus hidup**
  - Perencanaan akhir masa pakai dan irama upgrade
  - Kompatibilitas driver dengan versi server
  - Pelacakan penghentian fitur dan perencanaan migrasi
  - Metodologi pengujian: staging, canary, dan blue-green deployment untuk basis data

### Modul 12: Proyek Akhir — Platform E-Commerce Multi-Region (Minggu 12)

- **Ruang lingkup proyek**
  - Merancang klaster MongoDB sharded yang mendukung platform e-commerce dengan 50.000 permintaan per detik
  - Penyebaran di tiga region AWS (us-east-1, eu-west-1, ap-southeast-1)
  - Mengimplementasikan manajemen pesanan, pelacakan inventaris, sesi pengguna, dan katalog produk

- **Persyaratan arsitektur**
  - Desain shard key untuk pesanan (kunci gabungan berbasis region + waktu)
  - Konfigurasi replica set dengan penskalaan baca lintas-region
  - Change streams untuk sinkronisasi inventaris
  - Enkripsi data PII (CSFLE) dan TLS untuk semua koneksi

- **Persyaratan operasional**
  - Jadwal pencadangan dengan RPO 1 jam dan RTO 4 jam
  - Dashboard pemantauan untuk latensi kueri, keterlambatan replikasi, dan utilisasi sumber daya
  - Pengujian failover otomatis dan latihan pemulihan bencana
  - Rencana upgrade untuk migrasi versi MongoDB

- **Hasil akhir**
  - Diagram arsitektur dan dokumen analisis shard key
  - Skrip otomatisasi penyebaran (Terraform atau Atlas API)
  - Konfigurasi pemantauan dan peringatan
  - Runbook pemulihan bencana
  - Laporan benchmark performa

## Proyek Akhir

Peserta akan merancang, mendokumentasikan, dan mengotomatiskan penyebaran klaster MongoDB sharded multi-region yang siap produksi untuk platform e-commerce lalu lintas tinggi. Proyek harus mencakup:

- Dokumen arsitektur tertulis yang menjelaskan pemilihan shard key, topologi replikasi, strategi distribusi data, dan arsitektur keamanan
- Otomatisasi Infrastructure-as-Code (skrip Terraform atau Atlas API) yang menyediakan klaster di tiga region cloud
- Konfigurasi pemantauan dan peringatan komprehensif yang mencakup metrik kritis: latensi kueri, keterlambatan replikasi, tingkat opcounter, tingkat page fault, dan utilisasi koneksi
- Runbook pemulihan bencana yang merinci prosedur failover, langkah validasi pencadangan, dan waktu pemulihan lintas-region
- Benchmark performa yang menunjukkan klaster menangani throughput yang ditentukan dengan latensi P99 di bawah 100ms

## Kriteria Penilaian

- **Desain Arsitektur (30%)**: Kualitas analisis shard key, pilihan topologi replica set, strategi distribusi data, dan arsitektur keamanan. Evaluasi mencakup justifikasi tertulis yang menjelaskan trade-off dan alternatif yang dipertimbangkan.
- **Implementasi Otomatisasi (25%)**: Kelengkapan dan kebenaran skrip IaC. Konfigurasi Terraform/Atlas API harus valid secara sintaksis dan dapat digunakan. Dikelola dengan kontrol versi dan komentar yang bermakna.
- **Pemantauan dan Observabilitas (20%)**: Cakupan metrik kritis, ambang peringatan yang tepat, pengaturan notifikasi multi-saluran, dan desain dashboard. Harus mencakup setidaknya 15 metrik berbeda di seluruh kesehatan klaster, performa kueri, dan utilisasi sumber daya.
- **Rencana Pemulihan Bencana (15%)**: Kelengkapan runbook DR, termasuk langkah failover, prosedur pengembalian, validasi pencadangan, dan target RTO/RPO yang didokumentasikan dengan jelas.
- **Validasi Performa (10%)**: Metodologi benchmarking, hasil pengujian beban, dan analisis hambatan. Harus menunjukkan klaster memenuhi atau melampaui target throughput dan SLO latensi.

## Referensi

- [MongoDB Production Notes — Panduan Penyebaran Resmi](https://docs.mongodb.com/manual/administration/production-notes/)
- [Dokumentasi Sharding MongoDB](https://docs.mongodb.com/manual/sharding/)
- [Arsitektur Referensi Keamanan MongoDB](https://www.mongodb.com/collateral/mongodb-security-reference-architecture)
- [Daftar Periksa Keamanan MongoDB Atlas](https://docs.atlas.mongodb.com/security-checklist/)
- [Dokumentasi Change Streams MongoDB](https://docs.mongodb.com/manual/changeStreams/)
- [Panduan Transaksi MongoDB](https://docs.mongodb.com/manual/core/transactions/)
- [MongoDB University: Advanced Deployment (Kursus)](https://university.mongodb.com/courses/M121/about)
- [Whitepaper Praktik Terbaik Performa MongoDB](https://www.mongodb.com/collateral/mongodb-performance-best-practices)
- [Dokumentasi Mesin Penyimpanan WiredTiger](https://docs.mongodb.com/manual/core/wiredtiger/)
- [Dokumentasi MongoDB Ops Manager](https://docs.opsmanager.mongodb.com/current/)

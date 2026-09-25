---
title: "Silabus Pengujian dan Rekayasa Kualitas MongoDB"
description: "Kurikulum 12 minggu tingkat lanjut bagi pengembang dan insinyur QA untuk menguasai tumpukan pengujian dan rekayasa kualitas MongoDB — pengujian unit dengan test double, Testcontainers dan klaster ephemeral, pengujian perilaku agregasi dan indeks, manajemen data uji, pengujian transaksi dan konkurensi, contract testing change streams, pengujian BDD dan end-to-end, quality gate validasi skema, pengujian performa dan chaos, serta pipeline kualitas CI/CD."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Pengujian dan Rekayasa Kualitas MongoDB

## Ringkasan

Silabus 12 minggu tingkat lanjut ini dirancang bagi pengembang, insinyur QA, dan spesialis pengujian yang sudah memahami cara membangun aplikasi dengan MongoDB dan ingin menguasai disiplin pengujian yang ketat. Kebanyakan kurikulum MongoDB mengajarkan CRUD, agregasi, dan operasional; kursus ini seluruhnya berfokus pada rekayasa kualitas untuk sistem berbasis MongoDB: piramida pengujian pada lapisan data, test double yang menyimulasikan perilaku MongoDB tanpa server, pengujian integrasi dengan Testcontainers dan replica set ephemeral, validasi perilaku kueri dan pipeline agregasi, pengujian transaksi dan konkurensi yang deterministik, contract testing untuk change streams dan event, validasi skema sebagai quality gate otomatis, pengujian tanda tangan performa, simulasi chaos terhadap replica set, serta pipeline CI/CD yang menggagalkan build sebelum regresi mencapai produksi.

Setiap modul memadukan fondasi konseptual dengan lab langsung menggunakan perkakas nyata: `mongodb-memory-server`, `mongomock`, Testcontainers untuk JVM dan runner berbasis Docker, skrip `mongosh`, serta GitHub Actions dengan service container MongoDB. Kurikulum mengikuti perjalanan tim rekayasa kualitas yang mengeraskan aplikasi realistis: merancang strategi pengujian, membangun rangkaian pengujian berlapis, mengotomatisasi pemeriksaan integritas data, dan akhirnya merangkai semuanya ke dalam pipeline yang menggerbang setiap penggabungan kode. Kursus berpuncak pada proyek akhir yang menuntut perancangan, implementasi, dan dokumentasi kerangka kualitas lengkap untuk aplikasi MongoDB, termasuk piramida pengujian, baseline performa, dan runbook latihan chaos.

Pada akhir kursus, peserta akan mampu merancang piramida pengujian untuk layanan berbasis MongoDB, mengisolasi lapisan data dengan mock dan mesin in-memory, menjalankan rangkaian integrasi yang tahan lama dengan replica set ber-container, menulis asersi yang mendeteksi regresi rencana kueri melalui `explain()`, membangun strategi seed dan fixture yang dapat diulang, menguji transaksi multi-dokumen dan penulis konkuren secara deterministik, memverifikasi konsumen change streams dengan contract test, menegakkan validitas skema pada lapisan pengujian, menetapkan baseline performa dan failover, serta menggerbang deployment dengan pipeline kualitas otomatis.

## Kurikulum

### Modul 1: Fondasi Rekayasa Kualitas dengan MongoDB (Minggu 1)

- **Pola pikir kualitas untuk sistem padat data**
  - Piramida pengujian untuk database dokumen: unit, integrasi, kontrak, end-to-end
  - Pengujian berbasis risiko: apa yang bisa rusak secara senyap ketika skema fleksibel
  - Quality gate didefinisikan sebelum kode: lint, cakupan, pemeriksaan rencana, baseline performa
  - Biaya regresi: korupsi data senyap vs. build yang gagal

- **Topologi pengujian khusus MongoDB**
  - Standalone vs. replica set vs. klaster sharded di lingkungan pengujian
  - Topologi hat: satu primary nyata, banyak koneksi langsung dari proses pengujian
  - Mengapa pengujian tidak boleh berbagi primary yang dapat ditulis dengan rangkaian lain
  - Simulator berbasis proxy (`mongodb-memory-server` vs. emulator wired)

- **Lanskap lingkungan**
  - Lokal, CI, staging, produksi — fitur MongoDB mana yang tersedia di mana
  - Perbedaan fitur: transaksi butuh replica set, change streams butuh oplog
  - Pengujian terhadap Atlas vs. MongoDB yang dikelola sendiri
  - Menyusun rangkaian pengujian berdasarkan kapabilitas lingkungan

- **Mendefinisikan strategi kualitas**
  - Memilih tumpukan asersi per driver: `testcontainers`, `mongomock`, Jest/Mocha/PyTest/JUnit
  - Konvensi penamaan dan organisasi rangkaian berdasarkan lapisan
  - Mengukur sinyal yang tepat: cakupan jalur data, bukan hanya baris
  - Menulis rencana kualitas satu halaman untuk layanan MongoDB

### Modul 2: Pengujian Unit pada Lapisan Data (Minggu 2)

- **Seam repository dan DAO**
  - Merancang koleksi agar dapat diinjeksi: injeksi konstruktor untuk handle `Collection`
  - Pola repository sebagai batas pengujian unit
  - Memisahkan logika transformasi murni dari panggilan driver
  - Batas serialisasi: pemeta BSON, codec, dan konversi POJO ke dokumen

- **Test double untuk MongoDB**
  - `mongomock` untuk PyMongo: parsing realistis, operator yang didukung vs. tidak
  - Mocking driver resmi: mockito, Moq, dan builder mock
  - Fake in-memory vs. mock vs. mesin nyata — memilih per kelas pengujian
  - Menguji logika validasi yang hidup di middleware/interceptor

- **Menguji logika murni secara unit**
  - Builder stage agregasi yang diuji tanpa server
  - Konstruksi filter, pemetaan proyeksi, dan builder update
  - Logika pengodean kunci dan pengurutan yang diekstrak dan diuji
  - Lapisan pemetaan error: pengecualian driver ke pengecualian domain

- **Jebakan rangkaian unit cepat**
  - Rasa percaya palsu dari pengujian yang terlalu banyak di-mock
  - Mem-mock driver yang tidak Anda kendalikan — jebakan seam
  - Menjaga rangkaian unit tetap deterministik: tanpa wall-clock, tanpa keacakan
  - Ketika pengujian unit butuh mesin nyata, ia masuk Modul 3

### Modul 3: Pengujian Integrasi dengan MongoDB Nyata (Minggu 3)

- **Testcontainers untuk MongoDB**
  - Menjalankan container `mongo:7` per rangkaian atau per kelas
  - Health check: menunggu `rs.status()` pada container replica set
  - Siklus hidup container: berbagi vs. per-pengujian, penganggaran biaya startup
  - Menandai image dan mengunci versi agar cocok dengan produksi

- **Replica set ephemeral**
  - `mongodb-memory-server` untuk lingkungan CI tanpa Docker
  - Skrip `replSetInitiate` dan menunggu pemilihan primary
  - Kapan set ephemeral berbeda dari produksi: catatan storage engine
  - Strategi hibrida: container di CI, memory server di laptop pengembang

- **Strategi seed dan fixture**
  - Seeding deterministik: `ObjectId` tetap, tanggal yang diketahui, array stabil
  - Fixture `insertOne`/`insertMany` vs. dump yang dipulihkan
  - Builder fixture yang dibagikan antara rangkaian integrasi dan end-to-end
  - Membersihkan antar-pengujian: `dropDatabase` vs. delete tertarget, dan alasannya

- **Isolasi dan paralelisme**
  - Isolasi database-per-pengujian untuk runner paralel bergaya sharded
  - Menjalankan rangkaian secara bersamaan terhadap satu replica set dengan aman
  - Menghindari race `collection already exists` yang flaky
  - Melaporkan kegagalan dengan konteks kondisi klaster lengkap

### Modul 4: Pengujian Agregasi, Kueri, dan Indeks (Minggu 4)

- **Pengujian perilaku pipeline agregasi**
  - Pengujian golden-file: dokumen yang diharapkan untuk stage pipeline
  - Kasus tepi `$lookup`, `$unwind`, `$group`: array kosong, null, kunci duplikat
  - Nilai batas `$setWindowFields` dan `$bucket`
  - Pengujian pipeline yang mengassert bentuk keluaran, bukan implementasi

- **Pengujian perilaku kueri**
  - Semantik matcher: `$in` dengan null, `$elemMatch`, paritas array dan dot-notation
  - Kueri sadar kolasi: perilaku case-insensitive dan peka locale
  - Type bracketing: mengapa `"5"` dan `5` berperilaku berbeda pada kueri rentang
  - Pengujian negatif untuk operator yang diserialisasi driver secara tak terduga

- **Validasi indeks sebagai pengujian**
  - Mengassert indeks mana yang ada di database pengujian
  - Pemeriksaan regresi berbasis `explain()`: gagalkan pengujian ketika rencana menjadi `COLLSCAN`
  - Asersi `winningPlan` untuk jalur indeks yang dipaksa hint
  - Pemeriksaan kewarasan `$indexStats` pada rangkaian jangka panjang

- **Koleksi time series dan khusus**
  - Perilaku `timeField`/`metaField` dalam pengujian
  - Ekspektasi downsample bucket dan `$densify`
  - Menguji logika retensi dan kedaluwarsa tanpa menunggu

### Modul 5: Manajemen Data Uji dan Seeding (Minggu 5)

- **Builder data uji**
  - Fungsi factory yang menghasilkan dokumen valid untuk invarian domain
  - Input acak dengan PRNG berseri untuk pemeriksaan bergaya property yang dapat direproduksi
  - Matriks field gaya fuzz: hilang, null, kosong, tipe salah, terlalu besar
  - Membangun dokumen minimal yang memicu validator skema

- **Identifikator deterministik**
  - Generasi `ObjectId` tetap (`ObjectId("0000...")`) untuk pengujian join yang stabil
  - Jaminan urutan: urutan penyisipan monotonik dalam asersi
  - Identifikator berbentuk timestamp dan jebakan pengurutannya
  - Mereferensikan fixture berdasarkan nama logis, bukan nilai mentah

- **Fixture turunan produksi**
  - Menganonimkan dokumen nyata untuk pengujian bentuk yang realistis
  - Strategi sampling: subsampel yang mempertahankan distribusi
  - Membuat versi dataset fixture seiring perubahan skema
  - Batasan hukum dan privasi pada penggunaan ulang data uji

- **Siklus hidup data dalam rangkaian**
  - Urutan setup/teardown dan pola rollback transaksi bertingkat
  - Snapshotting koleksi untuk pengujian pemulihan status
  - Mendeteksi fixture basi: pemeriksaan drift antara fixture dan skema
  - Katalog fixture didokumentasikan sebagai kode

### Modul 6: Pengujian Transaksi dan Konkurensi (Minggu 6)

- **Menguji transaksi multi-dokumen**
  - Skenario: transfer dana, pesanan-dan-inventaris, penulisan multi-koleksi
  - Mengassert atomisitas: kegagalan yang diinjeksi di tengah transaksi me-rollback semuanya
  - Read concern snapshot: konsistensi lintas pembacaan dalam transaksi
  - Semantik `writeConcern` dan hasil commit dalam pengujian

- **Pengujian konkurensi yang deterministik**
  - Kontensi dua penulis pada dokumen yang sama: pola pemeriksaan versi
  - Deteksi lost-update dengan CAS berbasis `findOneAndUpdate`
  - Badai insert paralel ke satu koleksi
  - Barrier dan latch untuk membuat race dapat direproduksi

- **Menyimulasikan kegagalan transien**
  - Memaksa `TransientTransactionError` dengan abort yang diinjeksi
  - Retryable writes: menguji jalur retry, bukan hanya jalur bahagia
  - Verifikasi exponential backoff dan jitter pada kode aplikasi
  - Mematikan anggota replica set di tengah operasi (perkakas Modul 10)

- **Asersi konsistensi dan isolasi**
  - Perilaku read preference saat failover primary
  - Sesi konsistensi kausal: monotonisitas `afterClusterTime`
  - Isolasi snapshot: dua pembaca mengamati status yang stabil
  - Mengassert tidak ada penulisan parsial setelah fault apa pun yang diinjeksi

### Modul 7: Pengujian Change Streams dan Arsitektur Event-Driven (Minggu 7)

- **Menguji pipeline change streams**
  - Asersi transformasi `$match`/`$project` pada dokumen event
  - Ekspektasi `fullDocument` dan `fullDocumentBeforeChange`
  - Persistensi resume token: memulai ulang dari `_data` dan melanjutkan
  - Semantik replay `startAtOperationTime` vs. `startAfter`

- **Contract testing konsumen**
  - Kontrak JSON Schema untuk event perubahan yang dibagikan lintas tim
  - Validasi schema registry di sisi produsen dan konsumen
  - Envelope event ber-versi: perubahan field aditif vs. merusak
  - Pengujian idempotensi: mereplay event yang sama dua kali menghasilkan satu efek

- **Jaminan urutan dan pengiriman**
  - Urutan per-dokumen vs. urutan global pada klaster sharded
  - Pengiriman at-least-once: toleransi duplikat pada konsumen
  - Event heartbeat dan invalidation pada listener jangka panjang
  - Menguji pemulihan dari celah oplog

- **Verifikasi pipeline CDC**
  - Change stream ke Kafka/queue: asersi latensi end-to-end
  - Perilaku dead-letter queue untuk event yang malformed
  - Kebenaran backpressure dan checkpointing
  - Deteksi drift: rekonsiliasi koleksi sumber vs. koleksi turunan

### Modul 8: Pengujian Berbasis Perilaku dan End-to-End (Minggu 8)

- **BDD untuk skenario MongoDB**
  - Fitur Gherkin untuk cerita padat data: `Given` status seed, `When` operasi, `Then` dokumen
  - Implementasi step yang membaca dan mengassert koleksi nyata
  - Dokumentasi hidup: skenario sebagai spesifikasi yang dapat dieksekusi
  - Memelihara rangkaian BDD: menghindari pembengkakan step definition

- **Pengujian API end-to-end**
  - Rangkaian full-stack terhadap stack nyata dengan replica set dalam topologi hat
  - Asersi request → write → read-back dengan koneksi yang sama
  - Alur multi-layanan: layanan A menulis, layanan B mengonsumsi change streams
  - Contract testing dengan Pact untuk konsumen dan produsen HTTP

- **Perilaku search dan full-text**
  - Pengujian perilaku indeks Atlas Search di tempat node search ada
  - Perilaku fallback ketika search tidak tersedia
  - Asersi relevansi dan peringkat dengan korpus tetap
  - Semantik `$text` vs. Atlas Search dijaga oleh lingkungan

- **Golden dan snapshot testing**
  - Snapshot body respons untuk kontrak API
  - Golden serialisasi dokumen-ke-JSON
  - Alur peninjauan drift snapshot dalam code review
  - Kapan snapshot menyembunyikan regresi nyata: meninjau diff secara mekanis

### Modul 9: Pengujian Validasi Skema dan Integritas Data (Minggu 9)

- **Validasi skema sebagai quality gate**
  - Aturan validator sebagai kontrak yang diuji: matriks dokumen valid/tidak valid
  - `validationLevel` dan `validationAction` dalam pengujian
  - Matriks pengujian untuk `$jsonSchema`: required, type, enum, pattern, dependencies
  - Migrasi koleksi lama ke koleksi skema tervalidasi

- **Verifikasi integritas data**
  - Pemeriksaan integritas referensial dengan deteksi orphan berbasis `$lookup`
  - Asersi kardinalitas: jumlah, keunikan, dan penjaga distribusi
  - Hashing dokumen bergaya checksum untuk perbandingan snapshot
  - `db.collection.validate()` dijalankan dalam pipeline kualitas

- **Deteksi drift antar lingkungan**
  - Drift skema: skema dev vs. bentuk koleksi produksi
  - Drift indeks: indeks hilang atau ekstra antar lingkungan
  - Drift konfigurasi: opsi `wiredTiger` dan ketidakcocokan kolasi
  - Laporan rekonsiliasi: skrip perbandingan otomatis yang menggagalkan CI saat drift

- **Pengujian migrasi**
  - Pengujian migrasi yang kompatibel mundur: pembaca lama, penulis baru
  - Skrip transformasi data diuji terhadap korpus fixture
  - Migrasi aman rollback: memverifikasi jalur undo
  - Gladi skema tanpa downtime di staging

### Modul 10: Pengujian Performa dan Beban (Minggu 10)

- **Pengujian tanda tangan performa**
  - Anggaran waktu eksekusi dan pemindaian dokumen berbasis `explain()`
  - Baseline latensi kueri di CI dengan jendela varians yang ditoleransi
  - Rangkaian benchmark terisolasi dari rangkaian fungsional
  - Metodologi warm-up, pengukuran, dan pelaporan

- **Pengujian beban workload MongoDB**
  - Beban sintetis dengan skrip `mongosh` dan `mongostat`
  - Generator beban tingkat driver untuk lalu lintas realistis
  - Soak test: rangkaian jangka panjang yang menyingkap kebocoran dan drift lambat
  - Pemodelan campuran baca/tulis untuk lalu lintas berbentuk produksi

- **Chaos engineering untuk MongoDB**
  - Gladi failover replica set: bunuh primary, assert pemilihan otomatis
  - Simulasi partisi jaringan: drop `iptables` dan injeksi latensi
  - Pengujian crash `SIGKILL`: pemulihan oplog dan perilaku rollback
  - Eviksi anggota klaster sharded dan perilaku balancer di bawah beban

- **Asersi ketahanan**
  - Logika retry aplikasi terbukti di bawah kegagalan yang diinjeksi
  - Pemulihan connection pool setelah failover
  - Jalur timeout dan fallback diverifikasi, bukan diasumsikan
  - Pemeriksaan konsistensi data pasca-chaos

### Modul 11: Quality Gates CI/CD dan Cakupan Kode (Minggu 11)

- **Arsitektur pipeline**
  - GitHub Actions dengan service container MongoDB
  - Build matriks lintas versi driver dan versi MongoDB
  - Struktur job: unit → integrasi → kontrak → e2e → perf
  - Caching image container dan dependensi driver

- **Cakupan dan analisis statis**
  - Ambang cakupan yang ditegakkan per lapisan (gate lapisan data)
  - Cakupan cabang untuk logika transformasi dan validasi
  - Mutation testing: membunuh mutant pada mapper repository
  - Linting definisi skema dan factory seed

- **Manajemen pengujian flaky**
  - Alur karantina: skip-dan-lapor alih-alih nonaktif senyap
  - Kebijakan retry dengan exponential backoff pada tingkat runner
  - Menemukan akar flake: kelas waktu, urutan, dan status bersama
  - Anggaran flake dan dashboard

- **Metrik kualitas dan gate rilis**
  - Sinyal terinspirasi DORA: change failure rate, MTTR untuk layanan data
  - Definisi gate: merge diblokir kecuali semua rangkaian dan anggaran lolos
  - Pemeriksaan contract dan schema registry pada setiap merge
  - Verifikasi pasca-rilis: kueri smoke terhadap replica produksi

### Modul 12: Proyek Akhir — Kerangka Kualitas untuk Aplikasi MongoDB (Minggu 12)

- **Ruang lingkup proyek**
  - Membangun kerangka kualitas lengkap untuk layanan berbasis MongoDB yang realistis
  - Pilih domain: pesanan e-commerce, platform telemetri, atau layanan konten
  - Luaran: piramida pengujian, pipeline CI, baseline performa, runbook chaos

- **Luaran yang disyaratkan**
  - Rangkaian unit dengan lapisan data terisolasi di balik seam
  - Rangkaian integrasi dengan Testcontainers dan replica set ephemeral
  - Pengujian regresi rencana kueri berbasis `explain()` untuk kueri panas
  - Rangkaian kontrak transaksi dan change streams
  - Matriks validasi skema dan skrip deteksi drift
  - Pipeline CI di GitHub Actions yang menggerbang merge
  - Baseline tanda tangan performa dan rekaman gladi failover

- **Fokus evaluasi**
  - Kebenaran strategi pengujian per lapisan dan risiko
  - Determinisme: rangkaian lolos berulang kali, dalam urutan apa pun, di mesin bersih
  - Cakupan risiko integritas data, bukan hanya baris
  - Keandalan CI: tidak ada flake selama jendela evaluasi
  - Dokumentasi quality gate beserta alasannya

## Proyek Akhir

Proyek akhir adalah kerangka kualitas lengkap untuk aplikasi MongoDB, dibangun selama dua minggu terakhir kursus. Peserta memilih skenario realistis — layanan pesanan e-commerce, platform telemetri, atau layanan rekomendasi konten — dan merancang seluruh tumpukan pengujian di sekelilingnya: rangkaian unit dengan lapisan data terisolasi di balik test double, rangkaian integrasi yang berjalan di atas replica set Testcontainers, pengujian regresi rencana yang gagal pada rencana `COLLSCAN`, pengujian transaksi dan konkurensi yang deterministik, rangkaian kontrak konsumen change streams, matriks validasi skema, skrip deteksi drift, pipeline GitHub Actions yang menggerbang setiap merge, serta gladi chaos yang menunjukkan ketahanan failover. Peserta mempresentasikan demonstrasi langsung pipeline yang menggagalkan regresi yang sengaja diinjeksi, beserta rencana kualitas tertulis yang menjelaskan setiap gate, ambang batasnya, dan risiko yang dilindunginya.

## Kriteria Penilaian

- **Tugas**: Sepuluh lab (satu per modul dari Minggu 1-11) dievaluasi berdasarkan kebenaran, determinisme, dan penggunaan teknik pengujian spesifik yang diajarkan. Kuis mingguan memverifikasi pemahaman konseptual tentang isolasi pengujian, analisis rencana kueri, dan desain quality gate.
- **Proyek Akhir**: Dievaluasi berdasarkan kelengkapan dan kebenaran piramida pengujian, cakupan risiko integritas data yang nyata, keandalan pipeline (nol flake selama evaluasi), gladi failover yang didemonstrasikan, dan kualitas dokumentasi rencana kualitas.
- **Partisipasi**: Peninjauan sejawat terhadap kerangka kualitas peserta lain, berfokus pada trade-off strategi pengujian dan identifikasi celah.

## Referensi

- Dokumentasi MongoDB: Testing and Development — https://www.mongodb.com/docs/manual/administration/testing-and-development/
- Dokumentasi MongoDB: Transaksi — https://www.mongodb.com/docs/manual/core/transactions/
- Dokumentasi MongoDB: Change Streams — https://www.mongodb.com/docs/manual/changeStreams/
- Dokumentasi MongoDB: Validasi Skema — https://www.mongodb.com/docs/manual/core/schema-validation/
- Dokumentasi MongoDB: `explain()` dan Rencana Kueri — https://www.mongodb.com/docs/manual/reference/explain-results/
- Dokumentasi MongoDB: Perintah `validate` — https://www.mongodb.com/docs/manual/reference/command/validate/
- Testcontainers untuk MongoDB — https://java.testcontainers.org/modules/databases/mongodb/
- `mongodb-memory-server` (MongoDB Ephemeral untuk Pengujian) — https://github.com/nodkz/mongodb-memory-server
- Dokumentasi MongoDB Atlas Search — https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB University: Kursus Pengembang M220JS/M220P — https://learn.mongodb.com/

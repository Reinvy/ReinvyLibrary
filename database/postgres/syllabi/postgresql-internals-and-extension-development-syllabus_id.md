---
title: "Silabus Internal PostgreSQL dan Pengembangan Ekstensi"
description: "Kurikulum tingkat sistem selama 12 minggu tentang internal server PostgreSQL dan penulisan ekstensi C — memory context, tata letak page dan tuple, buffer manager, WAL, SPI, hook planner, custom scan dan access method, background worker, foreign data wrapper, pengujian memory safety, serta paket lintas versi."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Internal PostgreSQL dan Pengembangan Ekstensi

## Ringkasan

Sebagian besar pembelajaran PostgreSQL berhenti pada permukaan SQL: menulis kueri, membaca rencana, menambah indeks. Padahal sebagian besar nilai PostgreSQL justru berada satu lapis di bawahnya — pada kode C yang memiliki heap, write-ahead log, planner, dan API ekstensi yang memungkinkan pihak ketiga mengubah ketiganya. Tim yang memahami lapisan itu dapat mendiagnosis masalah yang tidak bisa diperbaiki oleh flag konfigurasi mana pun, dan tim yang mampu menulis ekstensi tidak perlu menunggu upstream menyelesaikan masalah mereka.

Kurikulum lanjutan 12 minggu ini ditujukan bagi senior backend engineer, database platform engineer, dan systems programmer yang sudah menguasai PostgreSQL sebagai pengguna — nyaman dengan semantik MVCC, strategi pengindeksan, dan replikasi — dan kini ingin bekerja di dalam server, bukan di sampingnya. Setiap minggu bergerak antara source tree dan server yang berjalan: membaca subsistem terkait, lalu menulis kode yang berbicara dengannya. Jalur ini sengaja dibuat sempit. Ini bukan kursus tuning performa dan bukan kursus operasional; keduanya dibahas di tempat lain dalam pustaka ini. Di sini hasil karyanya selalu berupa kode — fungsi C, tipe kustom, background worker, sebuah access method — yang dikompilasi terhadap header server dan berperilaku benar di bawah konkurensi, crash recovery, serta upgrade versi.

Pada akhirnya, peserta telah merilis ekstensi terpaket yang toleran terhadap perbedaan versi, lengkap dengan pengujian, benchmark, dan dokumentasi, serta mampu membaca source tree PostgreSQL dengan percaya diri ketika perilaku asing berikutnya muncul di produksi.

## Kurikulum

### Minggu 1: Arsitektur Proses, Memory Context, dan Penanganan Error
- **Model proses server**
  - Postmaster, proses backend, dan proses auxiliari (`checkpointer`, `bgwriter`, `walwriter`, `autovacuum launcher`)
  - Tata letak shared memory: buffer pool, tabel lock, proc array, dan free space map
  - Siklus hidup backend dari `fork()` sampai query loop, dan apa yang bertahan saat backend crash
- **Manajemen memori**
  - Pohon `MemoryContext` dan argumen implisit `CurrentMemoryContext`
  - `palloc`, `palloc0`, `pfree`, dan alasan ekstensi tidak boleh memakai `malloc` untuk data berumur kueri
  - `AllocSetContextCreate`, reset context, dan pola per-tuple context
- **Penanganan error dan logging**
  - Level `ereport` dan `elog`, serta perbedaan `ERROR` dan `FATAL` bagi kode ekstensi
  - `PG_TRY` / `PG_CATCH` / `PG_FINALLY` dan mengapa semantik `longjmp` melarang melewati langkah pembersihan
  - `errmsg`, `errdetail`, `errhint`, dan cara membangun diagnostik yang berguna bagi DBA
- **Lab praktik**
  - Membangun PostgreSQL dari source dengan simbol debug dan menjalankan regression suite
  - Menempelkan `gdb` pada backend dan memeriksa pohon memory context selama kueri berjalan
  - Memicu dan memulihkan dari `ERROR` di dalam fungsi C tanpa kebocoran memori

### Minggu 2: Tata Letak Penyimpanan, Heap, dan Buffer Manager
- **Struktur on-disk**
  - Header page, line pointer, free space, dan special space di ujung page
  - `HeapTupleHeaderData`: `xmin`, `xmax`, `ctid`, bit infomask, dan rantai HOT
  - Fork relasi (main, free space map, visibility map, init) dan lapisan `smgr`
- **TOAST dan data panjang variabel**
  - Ambang tuple 2 KB dan empat strategi TOAST
  - Penyimpanan out-of-line, kompresi, dan cara membaca nilai TOAST secara aman di C
  - Kapan sebuah ekstensi sebaiknya menyimpan payload besar di luar heap
- **Buffer manager dan caching**
  - `ReadBuffer`, `ReadBufferExtended`, buffer pin, dan content lock
  - Buffer kotor, clock sweep, dan bagaimana background writer berinteraksi dengan ekstensi
  - Checksum data dan implikasinya bagi kode penyimpanan kustom
- **Lab praktik**
  - Menulis fungsi bergaya pageinspect yang membuang isi line pointer sebuah tabel aktif
  - Melacak jumlah buffer pin saat memindai tabel dengan `pg_buffercache`
  - Mengukur ambang ukuran tuple tempat TOAST aktif dan memverifikasi strategi yang dipilih

### Minggu 3: Ekstensi Pertama — Sistem Build, Control File, dan Fungsi C
- **Anatomi proyek**
  - `PG_MODULE_MAGIC`, `_PG_init`, dan entry point shared library
  - File `.control`: `default_version`, `module_pathname`, `relocatable`, `requires`
  - Skrip instalasi SQL dan konvensi skrip upgrade `--2.0--2.1.sql`
- **Memanggil C dari SQL**
  - `PG_FUNCTION_INFO_V1` dan konvensi pemanggilan versi 1
  - `Datum` masuk, `Datum` keluar: `PG_GETARG_*`, `PG_RETURN_*`, dan strictness
  - Mengembalikan set, tipe komposit, dan pola materialisasi `SRF_FIRSTCALL_INIT`
- **Membangun dan iterasi**
  - Makefile PGXS versus build meson yang dipakai rilis terbaru
  - Variabel `pg_config`, include path, dan kompilasi terhadap beberapa versi mayor yang terpasang
  - Loop pengembangan: kompilasi ulang, `DROP EXTENSION` / `CREATE EXTENSION`, iterasi tanpa restart
- **Lab praktik**
  - Menyiapkan kerangka ekstensi yang mengekspos fungsi C penghitung checksum atas `bytea`
  - Menambahkan fungsi SQL-callable kedua dengan antarmuka set-returning
  - Mengemasnya agar `CREATE EXTENSION ... VERSION` naik dari 1.0 ke 1.1 dengan bersih

### Minggu 4: Sistem Tipe — Tipe Kustom, Operator, dan Cast
- **Katalog tipe**
  - Internal `pg_type`: `typlen`, `typbyval`, `typalign`, `typstorage`, dan `typcategory`
  - Base type versus domain versus tipe komposit, dari sudut pandang katalog
  - Mengapa fungsi I/O menentukan perilaku sebuah tipe di batas SQL
- **Mengimplementasikan base type**
  - Fungsi input, output, receive, dan send untuk protokol teks dan biner
  - Typmod input/output untuk tipe berparameter
  - `CREATE TYPE ... (INPUT = ..., OUTPUT = ...)` dan varian yang binary-coercible
- **Operator, cast, dan operator class**
  - `CREATE OPERATOR` berbasis fungsi C, plus hint commutator/negator
  - Cast: implisit, assignment, dan eksplisit — serta konsekuensi planner untuk masing-masing
  - Mendukung penggunaan indeks dengan menempelkan tipe pada operator class yang sudah ada
- **Lab praktik**
  - Mengimplementasikan base type berukuran tetap dengan dukungan send/receive biner yang benar
  - Menambahkan cast ke dan dari `text`, lalu memverifikasi perilaku rencana pada cast implisit versus eksplisit
  - Menulis regression test yang mengunci format output tekstual

### Minggu 5: SPI — Menjalankan SQL dari Dalam Server
- **Server Programming Interface**
  - `SPI_connect` / `SPI_finish`, dan mengapa nesting menuntut kehati-hatian di dalam trigger
  - `SPI_execute`, `SPI_execute_with_args`, dan `SPI_prepare` dengan rencana tersimpan
  - Membaca hasil `SPITupleTable` dan melakukan detoast kolom dengan benar
- **Kebenaran di bawah executor**
  - Mengelola memori dengan `SPI_palloc` dan procedure context milik SPI
  - Kenaikan command counter saat menulis di dalam fungsi
  - SPI read-only versus read-write, serta kontrak volatilitas dengan planner
- **Pola performa**
  - Rencana tersimpan, eksekusi berparameter, dan menghindari biaya parse di loop panas
  - Cursor melalui `SPI_cursor_open` untuk result set besar
  - Operasi massal: `SPI_execute` dengan `UPSERT` dan alternatif `COPY`
- **Lab praktik**
  - Menulis fungsi C yang menjalankan agregasi berparameter dan mengembalikan baris komposit
  - Membangun fungsi trigger yang memelihara tabel turunan tanpa memicu rekursi
  - Membandingkan eksekusi rencana tersimpan versus parse ulang pada sepuluh ribu iterasi

### Minggu 6: WAL, Durabilitas, dan Kebenaran Write-Ahead
- **Cara kerja durabilitas**
  - Struktur record WAL, urutan LSN, dan jalur `XLogInsert` / `XLogFlush`
  - Checkpoint, restartpoint, dan loop redo yang memutar ulang log
  - Full-page write, torn page, dan mengapa penulisan pertama setelah checkpoint bersifat khusus
- **Menulis kode yang sadar WAL**
  - Mendaftarkan resource manager kustom dengan ID `rmgr` dan callback redo
  - Antarmuka generic WAL bagi ekstensi yang membutuhkannya tanpa rmgr penuh
  - Aturan urutan: log sebelum data, dan menandai buffer kotor hanya setelah record dimasukkan
- **Desain ekstensi yang aman saat recovery**
  - Tabel unlogged, relasi temporer, dan apa yang tidak boleh diasumsikan bertahan setelah crash
  - Interaksi dengan replikasi fisik: apa yang harus bisa di-replay oleh standby
  - Menguji recovery dengan `pg_waldump` dan skenario crash yang dipaksakan
- **Lab praktik**
  - Mendaftarkan resource manager WAL kustom minimal dan melakukan replay setelah crash
  - Menginstrumentasi ekstensi dengan keluaran `pg_waldump` untuk membuktikan urutan yang benar
  - Mematikan backend di tengah penulisan dengan `kill -9` dan memverifikasi pemulihan yang konsisten

### Minggu 7: Locking, Latch, dan Konkurensi
- **Primitif locking**
  - Lightweight lock, spinlock, dan lock tag milik heavyweight lock manager
  - Mode `LWLockAcquire`, tranche lock, dan menghindari inversi urutan lock
  - Latch, `WaitLatch`, dan membangun penantian yang dapat diinterupsi serta menghormati cancel kueri
- **Kontrak konkurensi**
  - Penggunaan snapshot dan `GetTransactionSnapshot` di dalam fungsi maupun worker
  - Atomik, memory barrier, dan publikasi state bersama yang aman
  - Menghindari deadlock ketika ekstensi mengambil lock lintas subsistem
- **Parallel safety**
  - Penandaan `PARALLEL SAFE` / `RESTRICTED` / `UNSAFE` dan konsekuensinya di planner
  - State bersama pada parallel worker melalui dynamic shared memory (`dsa`, `shm_toc`)
  - Apa yang rusak ketika ekstensi melakukan penulisan di dalam parallel worker
- **Lab praktik**
  - Mengimplementasikan penghitung bersama yang dilindungi LWLock dan memvalidasinya dengan `pgbench`
  - Membangun fungsi yang berhenti bersih ketika pengguna menekan Ctrl-C
  - Mereproduksi deadlock yang melibatkan lock ekstensi lalu memperbaiki urutannya

### Minggu 8: Hook Planner dan Executor, Custom Scan, dan Access Method
- **Mengaitkan planner**
  - Registrasi hook di `_PG_init` dan pola chain-of-responsibility
  - `planner_hook`, `set_rel_pathlist_hook`, `set_join_pathlist_hook`, dan penyesuaian biaya
  - Kapan menambahkan path dan kapan menulis ulang query tree
- **Integrasi executor**
  - Node `CustomScan`: `custom_plans`, `custom_private`, dan serialisasi lintas worker
  - `ExecutorStart_hook` / `ExecutorRun_hook` untuk instrumentasi dan penegakan kebijakan
  - Evaluasi ekspresi dengan `ExecInitExpr` dan `ExecEvalExpr`
- **Antarmuka access method**
  - Callback table AM versus callback index AM, dan kumpulan minimal yang layak
  - Membangun index AM dengan mendelegasikan ke implementasi yang sudah ada
  - Fungsi `amhandler` dan pendaftaran AM di katalog
- **Lab praktik**
  - Menambahkan hook planner yang mencatat path yang ditolak untuk satu keluarga kueri
  - Mengimplementasikan `CustomScan` yang membaca file dan mengembalikan baris tanpa relasi
  - Membungkus table AM heap untuk menambah audit per tuple dan mengukur overhead-nya

### Minggu 9: Background Worker, Hook, dan Event Trigger
- **Worker statis dan dinamis**
  - Registrasi `BackgroundWorker`, `bgw_main`, dan hook permintaan shared memory
  - Menghubungkan worker ke database dengan `BackgroundWorkerInitializeConnection`
  - Worker dinamis, kebijakan restart, dan ekstensi bergaya supervisor
- **Hook di luar planner**
  - `ProcessUtility_hook` untuk intersepsi DDL dan penegakan kebijakan
  - `object_access_hook` dan `ExecutorCheckPerms_hook` untuk keamanan berbutir halus
  - Event trigger dalam C versus PL/pgSQL, serta batas transaksi
- **Aspek operasional**
  - Singleton, pemilihan leader antar worker, dan menghindari scheduler ganda
  - Siklus hidup worker melewati promosi, `pg_ctl reload`, dan restart pasca crash
  - Observabilitas: mengekspos state worker melalui view atau GUC kustom
- **Lab praktik**
  - Membangun worker periodik yang menyegarkan materialized view sesuai jadwal
  - Mengintersepsi dan mengaudit `CREATE ROLE` melalui utility hook
  - Mengekspos lag worker melalui fungsi yang membaca shared memory

### Minggu 10: Foreign Data Wrapper dan Internal Federasi
- **Kontrak callback FDW**
  - `GetForeignRelSize`, `GetForeignPaths`, `GetForeignPlan`, dan `BeginForeignScan`
  - Siklus `IterateForeignScan`, `ReScanForeignScan`, dan `EndForeignScan`
  - `ExplainForeignScan` dan pelaporan biaya yang jujur
- **Pushdown dan optimasi**
  - Mengklasifikasikan restriksi dengan logika bergaya `is_foreign_expr`
  - Pushdown join dan agregat, beserta jebakan kebenaran pada masing-masing
  - `AnalyzeForeignTable` dan `ImportForeignSchema` untuk statistik yang realistis
- **Dukungan penulisan dan implementasi acuan**
  - `BeginForeignModify`, `ExecForeignInsert`, dan strategi batching
  - Membaca `postgres_fdw` dan `file_fdw` sebagai implementasi acuan
  - Model keamanan: user mapping, kredensial, dan caching koneksi
- **Lab praktik**
  - Mengimplementasikan FDW read-only di atas endpoint HTTP berbasis CSV
  - Menambahkan pushdown restriksi dan membuktikannya dengan `EXPLAIN VERBOSE`
  - Memperluas wrapper dengan dukungan `IMPORT FOREIGN SCHEMA`

### Minggu 11: Pengujian, Memory Safety, dan Dukungan Lintas Versi
- **Infrastruktur pengujian**
  - Suite `pg_regress`, file expected-output, dan format keluaran yang stabil
  - TAP test untuk skenario multi-sesi dan crash recovery
  - Isolation tester untuk bug konkurensi, dan fuzzing terhadap fungsi I/O
- **Debugging memori dan konkurensi**
  - Membangun dengan `--enable-cassert`, `--enable-debug`, dan sanitizer
  - Menjalankan Valgrind terhadap regression suite dan membaca laporannya
  - Breakpoint `gdb` pada proses backend, core dump, dan stack trace dari produksi
- **Pergeseran versi dan distribusi**
  - Guard `PG_VERSION_NUM` dan memelihara shim kompatibilitas lintas versi mayor
  - Matriks CI yang mengompilasi terhadap tiga atau empat branch rilis
  - Pengemasan: metadata PGXN, spec Debian dan RPM, serta artefak rilis bertanda tangan
- **Lab praktik**
  - Mengubah skrip uji manual menjadi suite `pg_regress` dengan keluaran stabil
  - Menjalankan pengujian ekstensi di bawah Valgrind dan memperbaiki setiap kebocoran yang dilaporkan
  - Menyiapkan matriks CI yang membangun terhadap PostgreSQL 14 sampai 17

### Minggu 12: Capstone — Merilis Ekstensi Kelas Produksi
- **Cakupan dan desain**
  - Memilih masalah yang layak diselesaikan dengan tipe kustom, access method, atau worker
  - Menulis catatan desain lebih dulu: durabilitas, konkurensi, dan cerita upgrade
  - Mendefinisikan permukaan SQL secara sengaja, karena itulah bagian yang tidak bisa diubah belakangan
- **Implementasi dan pengerasan**
  - Mengimplementasikan, menguji, dan melakukan benchmark terhadap dataset realistis
  - Menjalankan skenario crash, konkurensi, dan upgrade dengan bukti pemulihan
  - Menyusun dokumentasi bagi DBA maupun developer
- **Rilis dan tinjauan**
  - Mengemas rilis bertanda tangan dengan changelog dan skrip upgrade
  - Mempresentasikan desain dan hasil benchmark untuk kritik sejawat
  - Menerbitkan, memberi tag, dan memelihara issue tracker untuk ekstensi tersebut

## Proyek Akhir

Peserta merancang, mengimplementasikan, menguji, mengemas, dan mendokumentasikan **ekstensi PostgreSQL kelas produksi** pilihan mereka sendiri, dengan persetujuan instruktur. Ekstensi harus menyentuh sedikitnya tiga subsistem yang dibahas dalam kursus — misalnya tipe kustom dengan operator class, FDW dengan pushdown, atau background worker yang dipadukan dengan utility hook.

Hasil yang harus dikumpulkan:

1. **Repositori sumber**: kode ekstensi, control file, skrip SQL berversi, dan skrip upgrade antar sedikitnya dua versi.
2. **Permukaan SQL**: fungsi, tipe, atau access method terdokumentasi dengan volatilitas, parallel safety, dan persyaratan hak akses yang eksplisit.
3. **Suite pengujian**: suite `pg_regress` dengan keluaran yang stabil, sedikitnya satu TAP test untuk skenario multi-sesi atau crash recovery, serta satu uji konkurensi.
4. **Bukti kebenaran**: analisis durabilitas tertulis yang menjelaskan penggunaan WAL, urutan lock, dan perilaku recovery, didukung uji crash yang diperagakan.
5. **Benchmark**: overhead atau percepatan terukur terhadap baseline, dengan harness disertakan dan dapat direproduksi.
6. **Pengemasan**: metadata siap PGXN atau paket distribusi, changelog, dan rentang kompatibilitas lintas versi mayor PostgreSQL yang terdokumentasi.
7. **Dokumentasi**: catatan arsitektur untuk maintainer serta panduan penggunaan bagi DBA beserta peringatan operasionalnya.

## Kriteria Penilaian

- **Pemahaman internal (20%)**: Penggunaan memory context, buffer pin, dan primitif lock yang benar; kode yang lolos `--enable-cassert` dan Valgrind tanpa keluhan.
- **Kebenaran durabilitas dan konkurensi (25%)**: Urutan WAL yang terbukti, locking bebas deadlock, penandaan parallel safety yang tepat, dan uji crash yang benar-benar membuktikan recovery berjalan.
- **Kualitas desain (15%)**: Permukaan SQL yang koheren, batas tipe dan API yang masuk akal, serta jalur upgrade yang kredibel.
- **Ketelitian pengujian (15%)**: Cakupan regression, isolation, dan TAP yang mampu menangkap regresi nyata; keluaran yang stabil, bukan pencocokan teks yang rapuh.
- **Bukti performa (10%)**: Metodologi benchmark yang memisahkan sinyal dari noise, dengan trade-off overhead yang dapat dijustifikasi.
- **Pengemasan dan dokumentasi (15%)**: Rilis yang bisa dipasang, di-upgrade, didiagnosis, dan dipelihara orang lain tanpa perlu bertanya kepada penulisnya.

## Referensi

- **Dokumentasi resmi**: [PostgreSQL Documentation](https://www.postgresql.org/docs/)
  - Ikhtisar internal: [https://www.postgresql.org/docs/current/internals.html](https://www.postgresql.org/docs/current/internals.html)
  - Server programming dan API ekstensi: [https://www.postgresql.org/docs/current/server-programming.html](https://www.postgresql.org/docs/current/server-programming.html)
  - Write-ahead logging: [https://www.postgresql.org/docs/current/wal-internals.html](https://www.postgresql.org/docs/current/wal-internals.html)
  - Foreign data wrapper: [https://www.postgresql.org/docs/current/fdwhandler.html](https://www.postgresql.org/docs/current/fdwhandler.html)
  - Background worker: [https://www.postgresql.org/docs/current/bgworker.html](https://www.postgresql.org/docs/current/bgworker.html)
- **Buku**:
  - "The Internals of PostgreSQL" oleh Hironobu Suzuki — bab daring gratis tentang penyimpanan, WAL, dan planner
  - "PostgreSQL 14 Internals" oleh Egor Rogov — pembahasan mendalam tentang page, MVCC, dan buffer manager
  - "The Art of PostgreSQL" oleh Dimitri Fontaine — konteks tingkat SQL untuk desain ekstensi
- **Source dan komunitas**:
  - [Source tree PostgreSQL](https://github.com/postgres/postgres) — mulailah membaca `src/backend/access/heap` dan `src/backend/utils/mmgr`
  - [Mailing list pgsql-hackers](https://www.postgresql.org/list/pgsql-hackers/) — tempat perubahan API didebatkan dan ditinjau
  - [PGXN](https://pgxn.org/) — ekosistem pengemasan ekstensi dan rilis acuan
  - [PostgreSQL Wiki](https://wiki.postgresql.org/) — catatan developer dan internal
- **Perkakas**:
  - [Valgrind](https://valgrind.org/) dan sanitizer kompiler untuk verifikasi memory safety
  - [Panduan pgTAP dan pg_regress](https://pgtap.org/) untuk desain harness pengujian
  - [pg_waldump](https://www.postgresql.org/docs/current/pgwaldump.html) untuk membaca log selama latihan recovery

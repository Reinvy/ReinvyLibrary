---
title: "Panduan Upgrade Versi Major PostgreSQL"
description: "Panduan produksi untuk memindahkan cluster PostgreSQL antar versi major — audit kompatibilitas, cutover dengan pg_upgrade versus logical replication, strategi rehearsal, anggaran downtime, jalur rollback, dan penyetelan ulang pasca-upgrade."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Upgrade Versi Major PostgreSQL

## Pendahuluan

Upgrade minor hanyalah restart satu baris perintah. Upgrade major — 15 ke 16, 16 ke 17 — adalah kelas operasi yang berbeda: format katalog on-disk berubah, query planner berubah, ekstensi harus dibangun ulang, dan setiap driver aplikasi di fleet Anda harus tetap bekerja terhadap server yang sekarang berperilaku sedikit berbeda. Tim yang memperlakukannya seperti instalasi patch biasanya menemukan celahnya di tengah maintenance window, saat primary lama sudah dimatikan.

Kabar baiknya: upgrade major PostgreSQL adalah salah satu operasi yang paling dipahami dalam playbook operasional, dan hanya ada dua strategi yang benar-benar penting:

- **Upgrade biner in-place dengan `pg_upgrade`**, di mana biner server baru membaca data directory lama secara langsung. Cepat (hitungan menit, bahkan untuk database besar), mudah di-rollback sebelum penulisan pertama, tetapi memerlukan downtime untuk seluruh cutover.
- **Cutover dengan logical replication**, di mana versi major baru berjalan sebagai subscriber, menyusul di bawah beban, dan Anda mempromosikannya saat lag replikasi mencapai nol. Nyaris tanpa downtime, tanpa keterikatan filesystem, dan rollback tetap tersedia selama berhari-hari — tetapi lebih lambat disiapkan, tidak mereplikasi sequence atau large object secara otomatis, dan memerlukan kehati-hatian terhadap DDL.

Cara berpikir yang paling berguna adalah ini sebuah keputusan, bukan preferensi: `pg_upgrade` mengoptimalkan **downtime yang pendek dan terbatas**; logical replication mengoptimalkan **toleransi downtime yang tak terbatas**. Sebagian besar organisasi menjalankan kedua pola — `pg_upgrade` untuk cluster kecil atau internal, logical replication untuk primary tier-1 yang tidak bisa menanggung pembekuan penulisan lima belas menit.

Apa pun jalurnya, upgrade itu sendiri adalah bagian yang singkat. Pekerjaannya ada pada audit kompatibilitas, rehearsal, dan validasi pasca-upgrade — dan itulah yang dibahas panduan ini.

## Praktik Terbaik

### 1. Perlakukan upgrade sebagai proyek migrasi data, bukan maintenance window

Upgrade major mengubah format on-disk, nilai konfigurasi default, model biaya planner, dan sering juga default untuk beberapa GUC. Itu adalah proyek dengan rencana rollback dan checklist validasi, bukan tugas yang diselipkan pada malam Selasa.

- Tetapkan satu pemilik dan runbook cutover tertulis dengan timestamp, bukan rencana lisan.
- Pisahkan *rehearsal*, *cutover*, dan *validasi* menjadi aktivitas terjadwal tersendiri dengan sign-off masing-masing.
- Anggarkan downtime dalam satuan jam, lalu kurangi: sisanya adalah satu-satunya angka yang Anda janjikan ke stakeholder.
- Tentukan pemicu rollback di muka ("batalkan jika kumpulan query validasi X gagal dua kali dalam 10 menit"), bukan saat insiden berlangsung.

### 2. Audit kompatibilitas sebelum menjadwalkan apa pun

Tiga permukaan kompatibilitas yang paling sering menggagalkan upgrade, diurutkan berdasarkan frekuensinya:

1. **Ekstensi** — setiap ekstensi harus punya build untuk versi major baru. `pg_stat_statements`, `pgvector`, `PostGIS`, `pg_repack`, dan `TimescaleDB` semuanya mengikuti rilis major secara terpisah, dan sebagian tertinggal berminggu-minggu. Ekstensi tanpa build untuk versi target adalah penghalang mutlak.
2. **Driver dan pool klien** — `libpq` lama, driver JDBC lama, dan build PgBouncer lama bisa menegosiasikan protokol atau mengasumsikan bentuk katalog yang berubah. PgBouncer khususnya harus berada pada versi yang memahami default autentikasi server baru.
3. **Permukaan SQL** — fungsi yang dihapus, perilaku default yang berubah, dan reserved word baru. Setiap rilis major menyertakan bagian "migration" pada release notes-nya; bacalah baris per baris, jangan sekadar dipindai.

Audit ketiganya sebelum menetapkan tanggal. Menemukan build ekstensi yang hilang saat cutover adalah penyebab paling umum upgrade yang dibatalkan.

### 3. Utamakan logical replication untuk cluster besar atau sensitif latensi

Logical replication adalah default yang tepat bila salah satu kondisi ini benar:

- primary melayani trafik pengguna yang tidak bisa menoleransi pembekuan penulisan selama beberapa menit;
- database cukup besar sehingga rehearsal `pg_upgrade` penuh memakan waktu lebih lama daripada window yang bersedia Anda pesan;
- Anda ingin rollback tetap tersedia berhari-hari, bukan beberapa menit.

Bentuknya lugas: publikasikan seluruh database di cluster lama, subscribe dari cluster baru, biarkan menyusul, lalu hentikan penulisan, kuras lag ke nol, dan promosikan. Karena cluster lama tetap berjalan dan menyimpan datanya, rollback adalah "arahkan ulang connection string", bukan "restore 800 GB dari backup".

Tiga hal yang **tidak** dibawa logical replication secara default adalah sequence, large object, dan DDL. Sequence memerlukan `setval` eksplisit saat cutover, large object perlu ditangani di luar jalur `pg_largeobject`, dan perubahan skema harus diterapkan di kedua sisi selama replikasi aktif.

### 4. Gunakan pg_upgrade dengan mode link dan rehearsal untuk fleet lebih kecil

Untuk cluster yang bisa menerima pembekuan terbatas, `pg_upgrade --link` jauh lebih cepat daripada mode copy karena ia melakukan hard link pada file relasi alih-alih menyalinnya. Dua konsekuensi mengikutinya, dan keduanya penting:

- **Mode link membuat cluster lama tidak bisa dipakai lagi.** Setelah `--link`, data directory lama berbagi inode dengan yang baru; satu-satunya rollback nyata adalah snapshot filesystem atau backup fisik yang diambil sebelum upgrade. Jangan pernah menjalankan mode link tanpa base backup terverifikasi atau snapshot tingkat storage.
- **Mode copy adalah alternatif aman-tapi-lambat.** Gunakan bila Anda tidak bisa melakukan snapshot, dengan menerima bahwa waktu migrasi berskala linear terhadap ukuran database.

`pg_upgrade` juga memerlukan biner target, cluster target kosong yang sudah diinisialisasi, dan biner *lama* yang masih terpasang — ia memanggil server lama untuk melakukan dump skema. Jangan hapus paket lama sampai upgrade tervalidasi.

### 5. Bekukan DDL dan deploy aplikasi selama cutover

Kedua strategi upgrade sensitif terhadap pergeseran skema pada momen yang tepat salahnya.

- Dengan `pg_upgrade`, cluster lama harus dimatikan secara bersih dan tetap mati; DDL apa pun setelah pemeriksaan shutdown tetapi sebelum server baru menyala akan hilang.
- Dengan logical replication, DDL tidak direplikasi, sehingga deploy yang menambahkan kolom di tengah cutover menciptakan divergensi yang baru muncul setelah promosi.

Berlakukan pembekuan perubahan yang mencakup migrasi skema, rilis aplikasi, dan pernyataan `ALTER` ad-hoc sejak awal penyiapan replikasi hingga validasi selesai. Umumkan di kanal yang sama dengan yang tim Anda pakai untuk insiden, bukan hanya di tiket.

### 6. Sediakan jalur rollback yang teruji — dan ketahui masa berlakunya

Setiap rencana upgrade perlu jawaban eksplisit atas "bagaimana kita kembali, dan sampai kapan?"

```text
Strategi             Mekanisme rollback                    Rollback berakhir
-------------------  ------------------------------------  ---------------------------
pg_upgrade --link    restore snapshot / base backup        saat penulisan pertama ke cluster baru
pg_upgrade (copy)    jalankan cluster lama di data lama    saat penulisan pertama ke cluster baru
logical replication  arahkan ulang connection string       saat cluster lama dimatikan permanen
```

Aturan kritis untuk kedua varian `pg_upgrade`: rollback hanya bersih **sebelum cluster baru menerima penulisan**. Begitu aplikasi menulis ke versi baru, kembali berarti merekonsiliasi data yang divergen, yang merupakan migrasi data tersendiri. Tuliskan kondisi berakhirnya di runbook agar tidak ada yang mencoba rollback naif pada jam keenam.

### 7. Bangun ulang statistik dan setel ulang parameter setelah upgrade

Cluster yang baru di-upgrade dimulai dengan statistik apa pun yang dimiliki cluster lama — dan itu sering kali tidak bisa dipakai, karena `pg_upgrade` tidak membawa `pg_statistic` dalam bentuk yang dipercaya planner baru secara setara, dan model biaya planner baru berbeda pula. Jam-jam pertama setelah promosi adalah waktu terburuk untuk memercayai plan cache.

- Jalankan `ANALYZE` (atau `vacuumdb --analyze-only`) di seluruh database sebelum mengembalikan trafik ke volume penuh.
- Tinjau `postgresql.conf` terhadap default versi baru — beberapa default berubah antar major, dan file konfigurasi warisan bisa diam-diam mematikan fitur baru atau mengatur parameter yang berubah ke nilai yang tidak cocok.
- Perkirakan regresi plan. Versi major baru sering mengubah default strategi join, ambang parallel query, dan heuristik JIT. Sertakan langkah pembandingan query plan dalam validasi, bukan hanya "apakah query mengembalikan baris".

## Langkah Implementasi

### Langkah 1: Inventarisasi versi, ekstensi, dan klien

Mulai dengan mencatat keadaan saat ini — Anda tidak bisa mengaudit berdasarkan dugaan.

```bash
# Versi dan build server sumber
psql -c "SELECT version();" -c "SHOW server_version_num;"

# Ekstensi terpasang beserta versinya
psql -c "SELECT extname, extversion FROM pg_extension ORDER BY 1;"

# Build ekstensi yang tersedia untuk server SAAT INI
psql -c "SELECT name, default_version, installed_version
         FROM pg_available_extensions ORDER BY 1;"

# Prasyarat logical replication (dibutuhkan untuk jalur rolling)
psql -c "SHOW wal_level;" -c "SHOW max_replication_slots;" -c "SHOW max_wal_senders;"
```

Di host target, pastikan biner baru dan paket ekstensi yang sesuai benar-benar dapat dipasang:

```bash
# Setelah memasang paket versi major baru
/usr/lib/postgresql/17/bin/postgres --version
ls /usr/share/postgresql/17/extension/ | sort
```

Bandingkan kedua daftar ekstensi. Ekstensi apa pun yang ada di sumber tetapi tidak ada di direktori `extension/` target adalah penghalang sampai paketnya tersedia.

Terakhir, inventarisasi klien:

```bash
# Versi driver / pooler di seluruh fleet
psql -c "SELECT DISTINCT application_name, client_addr, backend_start
         FROM pg_stat_activity WHERE backend_type = 'client backend';"
```

Pastikan PgBouncer dan proxy apa pun di depan database mendukung versi major target, dan setiap driver aplikasi berada pada rilis yang sudah diuji terhadapnya.

### Langkah 2: Susun laporan kompatibilitas

Baca release notes untuk setiap versi major yang Anda lewati, bukan hanya target. Upgrade 14 ke 17 berarti membaca bagian migrasi 15, 16, dan 17.

Lalu ubah catatan itu menjadi laporan yang dapat dicari terhadap kode Anda sendiri:

```bash
# Cari migrasi aplikasi, view, fungsi, dan definisi ORM
# untuk konstruksi yang ditandai dihapus atau berubah pada rilis target
grep -RIn -e "pg_stat_activity.wait_event" -e "pg_class.relhasoids" \
  -e "pg_stat_statements.track_planning" -e "abstime" -e "relhaspkey" \
  db/ app/ --include="*.sql" --include="*.rb" --include="*.py" --include="*.ts"
```

Catat setiap temuan sebagai *harus diperbaiki sebelum upgrade*, *perubahan perilaku yang dapat diterima*, atau *false positive*, lengkap dengan file dan barisnya. Laporan itulah artefak yang ditinjau pada saat go/no-go.

Dua pemeriksaan yang layak mendapat perhatian khusus:

```sql
-- Objek yang bergantung pada fungsi yang dihapus atau diganti nama
SELECT n.nspname, p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema');

-- Konfigurasi text search dan collation yang defaultnya berubah
SELECT datname, datcollate, datctype, datlocprovider FROM pg_database;
```

Default provider collation berubah untuk sejumlah locale pada major terbaru; jika Anda mengandalkan `ORDER BY` pada teks di output yang dilihat pengguna, verifikasi urutan sortir terhadap salinan alih-alih berasumsi stabil.

### Langkah 3: Lakukan rehearsal pada salinan seukuran produksi

Rehearsal pada database kosong tidak membuktikan apa pun. Restore base backup terbaru plus WAL ke host scratch dengan biner target, lalu jalankan seluruh runbook di sana, dengan pengukuran waktu.

```bash
# Restore base backup ke cluster scratch
pg_basebackup -h source-host -D /var/lib/postgresql/17/main_fresh -X stream -P

# Jalankan upgrade in-place terhadap salinan hasil restore
/usr/lib/postgresql/17/bin/pg_upgrade \
  --old-bindir=/usr/lib/postgresql/16/bin \
  --new-bindir=/usr/lib/postgresql/17/bin \
  --old-datadir=/var/lib/postgresql/16/main \
  --new-datadir=/var/lib/postgresql/17/main_fresh \
  --link \
  --check
```

Jalankan `--check` lebih dulu, perbaiki semua yang dilaporkan, baru jalankan migrasi sesungguhnya. `pg_upgrade` menulis direktori `pg_upgrade_output.d` berisi log per langkah; bacalah meskipun hasilnya sukses.

Rehearsal harus menghasilkan tiga angka yang tidak bisa diperoleh dengan cara lain:

- **waktu migrasi wall-clock** pada data seukuran produksi, sehingga maintenance window berdasar pada pengukuran;
- **runtime query validasi**, sehingga Anda tahu berapa lama pemeriksaan pasca-cutover berlangsung;
- **daftar pemeriksaan yang gagal**, yang menjadi daftar perbaikan Anda.

Untuk jalur logical replication, rehearsal adalah gagasan yang sama dengan pasangan publisher/subscriber:

```bash
# Di cluster baru
psql -h new-host -d appdb -c "
  CREATE SUBSCRIPTION upgrade_sub
  CONNECTION 'host=old-host dbname=appdb user=repl_user password=...'
  PUBLICATION upgrade_pub
  WITH (copy_data = true, create_slot = true);"

# Pantau proses menyusul
psql -h new-host -d appdb -c "
  SELECT subname, received_lsn, latest_end_lsn, last_msg_send_time
  FROM pg_stat_subscription;"
```

Ukur berapa lama sinkronisasi awal pada volume data realistis — angka itulah yang menentukan apakah jalur rolling layak dijalankan sama sekali.

### Langkah 4: Siapkan cluster target dan replikasi

Sebelum cutover, cluster target harus terkonfigurasi dan siap, bukan instalasi default.

```bash
# Inisialisasi cluster target dengan locale dan encoding yang sesuai
/usr/lib/postgresql/17/bin/initdb -D /var/lib/postgresql/17/main \
  --locale=C.UTF-8 --encoding=UTF8

# Nyalakan dan pastikan menerima koneksi
pg_ctl -D /var/lib/postgresql/17/main -l /var/log/postgresql/17.log start
psql -h new-host -c "SHOW server_version;"
```

Salin parameter yang sudah disetel dari sumber, lalu rekonsiliasikan dengan default versi baru — jangan menempel seluruh file begitu saja, karena parameter yang benar untuk versi lama bisa jadi salah atau sudah digantikan sekarang:

```bash
# Bandingkan setting efektif non-default antar versi
psql -h old-host -Atc "SELECT name, setting FROM pg_settings
                       WHERE source = 'configuration file' ORDER BY 1;" > /tmp/old_settings.txt
psql -h new-host -Atc "SELECT name, setting FROM pg_settings
                       WHERE source = 'configuration file' ORDER BY 1;" > /tmp/new_settings.txt
diff -u /tmp/old_settings.txt /tmp/new_settings.txt
```

Untuk jalur rolling, buat role replikasi dan publication di sumber:

```sql
CREATE ROLE repl_user WITH REPLICATION LOGIN PASSWORD '...';

CREATE PUBLICATION upgrade_pub FOR ALL TABLES;

-- Tabel tanpa primary key tidak dapat direplikasi dengan aman — temukan lebih dulu
SELECT schemaname, tablename
FROM pg_tables t
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = t.schemaname AND c.relname = t.tablename AND i.indisprimary
  );
```

Setiap tabel pada hasil itu adalah bahaya replikasi: update dan delete pada tabel tanpa key bisa diterapkan lebih dari sekali oleh subscriber. Tambahkan primary key atau kecualikan tabel tersebut dan rencanakan rekonsiliasi manual untuknya.

### Langkah 5: Jalankan cutover

Ikuti runbook tertulis secara berurutan, dan umumkan setiap fasenya. Jangan berimprovisasi.

**Untuk jalur pg_upgrade:**

```bash
# 1. Hentikan penulisan dan ambil base backup final yang terverifikasi
pg_ctl -D /var/lib/postgresql/16/main stop -m fast
pg_basebackup -D /var/backups/pg16_final -X stream -c fast

# 2. Verifikasi backup dapat dibaca sebelum menyentuh apa pun
pg_controldata /var/backups/pg16_final | head -5

# 3. Jalankan upgrade dalam mode link
/usr/lib/postgresql/17/bin/pg_upgrade \
  --old-bindir=/usr/lib/postgresql/16/bin \
  --new-bindir=/usr/lib/postgresql/17/bin \
  --old-datadir=/var/lib/postgresql/16/main \
  --new-datadir=/var/lib/postgresql/17/main \
  --link

# 4. Nyalakan cluster baru pada port yang sama dan arahkan service ke sana
pg_ctl -D /var/lib/postgresql/17/main -l /var/log/postgresql/17.log start
```

**Untuk jalur logical replication:**

```sql
-- 1. Pastikan lag nol dan stabil pada beberapa pemeriksaan
SELECT subname, latest_end_lsn, last_msg_send_time FROM pg_stat_subscription;

-- 2. Hentikan penulisan di lapisan aplikasi, lalu kuras sisa lag
-- 3. Bawa sequence ke depan — logical replication tidak melakukan ini
SELECT setval(pg_get_serial_sequence('orders', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM orders), true);
```

Ulangi `setval` untuk setiap sequence, atau hasilkan pernyataannya secara massal:

```sql
SELECT format(
  'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 1), true);',
  pg_get_serial_sequence(format('%I.%I', schemaname, tablename), column_name),
  column_name, schemaname, tablename)
FROM information_schema.columns
WHERE column_default LIKE 'nextval%';
```

Jalankan pernyataan yang dihasilkan di cluster **baru**, lalu promosikan, lalu arahkan ulang connection string. Biarkan cluster lama tetap berjalan dan read-only sampai validasi lolos — itulah rollback Anda.

### Langkah 6: Validasi, setel, dan matikan yang lama

Validasi adalah checklist dengan angka, bukan smoke test.

```bash
# Bangun ulang statistik sebelum memvalidasi plan
vacuumdb -h new-host --all --analyze-only --jobs=4

# Verifikasi jumlah objek sama dengan sumber
psql -h new-host -Atc "SELECT count(*) FROM pg_class WHERE relkind = 'r';"
psql -h old-host -Atc "SELECT count(*) FROM pg_class WHERE relkind = 'r';"

# Bangun ulang objek ekstensi bila upgrade memerlukannya
psql -h new-host -c "ALTER EXTENSION pg_stat_statements UPDATE;"
```

Lalu jalankan validasi milik aplikasi itu sendiri: kumpulan query dari rehearsal, endpoint laporan yang menguji join terberat, dan perbandingan jumlah baris serta checksum pada tabel dengan trafik tertinggi.

Awasi cluster baru selama satu siklus bisnis penuh sebelum mematikan apa pun:

```sql
-- Sisa lag replikasi (jalur rolling) dan kesehatan koneksi
SELECT subname, latest_end_lsn FROM pg_stat_subscription;
SELECT state, count(*) FROM pg_stat_activity GROUP BY 1;
```

Setelah validasi lolos dan jendela rollback berakhir, matikan dalam urutan yang benar: hapus replication slot dan subscription (slot yang terlupakan menahan WAL dan memenuhi volume lama), hentikan dan hapus service cluster lama, lalu uninstal biner lama — dan hanya setelah Anda memastikan tidak ada yang masih terhubung ke port lama.

```sql
-- Di cluster SUMBER, setelah rollback tidak lagi diperlukan
SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots;
```

Terakhir, catat hasilnya — waktu rehearsal versus waktu cutover sebenarnya, masalah yang ditemui, dan regresi plan apa pun yang ditemukan — di tempat yang sama dengan riwayat maintenance Anda. Upgrade major berikutnya dimulai dari dokumen itu, dan dokumen yang akurat mengubah proyek dua minggu menjadi dua hari.

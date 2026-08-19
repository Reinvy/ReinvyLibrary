---
title: "Panduan Penguatan Keamanan PostgreSQL"
description: "Panduan komprehensif untuk memperkuat keamanan deployment PostgreSQL di produksi — autentikasi SCRAM yang kuat, desain role dengan hak akses minimum, enkripsi TLS, pembatasan jaringan via pg_hba.conf, row-level security, audit dengan pgaudit, enkripsi data saat disimpan, dan praktik terbaik keamanan di lapisan aplikasi."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Penguatan Keamanan PostgreSQL

## Pendahuluan

PostgreSQL terkenal karena keandalan dan kedalaman fiturnya, tetapi instalasi bawaan dioptimalkan untuk kenyamanan pengembang, bukan untuk lingkungan yang bermusuhan. Secara bawaan, autentikasi bisa jatuh ke metode yang lemah, setiap database dilengkapi skema `public` yang bisa ditulisi siapa saja, aturan jaringan sering mempercayai seluruh subnet, dan tidak ada yang diaudit. Di produksi, setiap bawaan tersebut menjadi titik masuk: kredensial yang bocor, server aplikasi yang dikompromikan, orang dalam dengan terlalu banyak hak akses, atau penyerang yang langsung mendarat di port database.

Penguatan keamanan (security hardening) adalah disiplin untuk menghapus bawaan-bawaan tersebut secara sistematis dan menggantinya dengan kontrol yang eksplisit dan dapat diverifikasi. Panduan ini mengikuti model defense-in-depth, yang mengasumsikan setiap lapisan tunggal bisa gagal dan karena itu menyusun lapisan kontrol yang saling independen:

- **Autentikasi** — membuktikan siapa yang terhubung (SCRAM-SHA-256, sertifikat, LDAP).
- **Otorisasi** — membatasi apa yang boleh dilakukan setiap identitas terverifikasi (role, hak akses, row-level security).
- **Keamanan jaringan** — mengontrol dari mana koneksi boleh berasal (`pg_hba.conf`, TLS).
- **Perlindungan data** — mengenkripsi data saat transit dan saat disimpan.
- **Audit** — mencatat apa yang benar-benar terjadi (`pgaudit`, logging terstruktur).
- **Penguatan aplikasi** — menghentikan serangan sebelum mencapai database (pertahanan SQL injection, pengelolaan secret).

Database yang diperkuat bukanlah database yang terkunci dan tidak bisa dipakai. Setiap kontrol dalam panduan ini menjaga operasional normal — tujuannya adalah membuat *permukaan izin* menjadi eksplisit dan minimal sambil tetap membuat database berfungsi penuh untuk beban kerja yang sah. Panduan ini ditujukan untuk tim yang sudah menjalankan PostgreSQL di produksi dan ingin menutup celah keamanan yang ditinggalkan oleh konfigurasi bawaan. Panduan ini mengasumsikan keakraban dengan `psql`, manajemen role dasar, dan `postgresql.conf`; tidak mengasumsikan latar belakang keamanan.

## Praktik Terbaik

### 1. Autentikasi Setiap Koneksi dengan SCRAM-SHA-256

Autentikasi kata sandi hanya sekuat algoritma hash yang digunakan untuk menyimpannya. Metode `md5` menyimpan hash MD5 warisan yang lemah terhadap brute force dan cracking offline; `trust` menerima koneksi apa pun tanpa kata sandi sama sekali. SCRAM-SHA-256 adalah standar modern: tidak pernah mengirim kata sandi melalui jaringan, menggunakan nonce acak per koneksi untuk mencegah serangan replay, dan menyimpan hash bergaram dengan iterasi di `pg_authid`.

```conf
# postgresql.conf
password_encryption = 'scram-sha-256'
```

Setelah mengubah pengaturan ini, setiap kata sandi baru (dan setiap `ALTER ROLE ... PASSWORD`) disimpan sebagai SCRAM. Kata sandi lama yang tersimpan sebagai `md5` ditingkatkan secara otomatis saat kata sandi berikutnya diubah. `pg_hba.conf` kemudian merujuk metode tersebut:

```conf
# pg_hba.conf — hanya terima autentikasi kata sandi SCRAM
hostssl all             all             0.0.0.0/0               scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
```

Untuk pengguna manusia dan role aplikasi, hindari `trust` sepenuhnya — bahkan di localhost, di mana proses lokal bisa terhubung sebagai pengguna mana pun. Jika organisasi Anda memiliki penyedia identitas terpusat, PostgreSQL juga mendukung autentikasi LDAP dan GSSAPI, yang memindahkan verifikasi kredensial ke direktori dan memusatkan rotasi kata sandi.

### 2. Terapkan Hak Akses Minimum dengan Role dan Privilege

Kesalahan produksi yang paling umum adalah menjalankan aplikasi sebagai superuser `postgres`. Superuser melewati setiap pemeriksaan hak akses, bisa membaca dan menghapus setiap tabel, dan bisa mengeksekusi kode arbitrer di host melalui ekstensi. Prinsip hak akses minimum berarti setiap role mendapat izin yang persis dibutuhkan pekerjaannya dan tidak lebih.

Rancang role secara berlapis:

- Simpan `postgres` (superuser) hanya untuk operasi administratif — jangan pernah untuk koneksi aplikasi.
- Buat satu **role login aplikasi** per layanan dengan `LOGIN` dan tanpa atribut superuser.
- Berikan hak akses skema dan tabel secara eksplisit, jangan pernah `GRANT ALL ON SCHEMA public` secara menyeluruh.
- Gunakan `REVOKE` pada skema `public` agar role sembarang tidak bisa membuat objek di dalamnya.
- Gunakan `SET ROLE` untuk tugas operasional alih-alih masuk sebagai role berhak akses tinggi.

```sql
-- Buat role aplikasi dengan hak akses minimum
CREATE ROLE app_orders LOGIN PASSWORD 'ganti-dengan-secret-acak-panjang';

-- Batasi ke satu database dan satu skema
REVOKE ALL ON DATABASE orders FROM PUBLIC;
GRANT CONNECT ON DATABASE orders TO app_orders;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO app_orders;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_orders;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_orders;

-- Pastikan objek di masa depan juga terkunci
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_orders;
```

Default privileges adalah bagian yang paling sering dilupakan tim: tabel baru yang dibuat setelah `GRANT` awal mewarisi bawaan skema, bukan grant Anda sebelumnya, sehingga `ALTER DEFAULT PRIVILEGES` menutup celah drift itu.

### 3. Kunci Akses Jaringan dengan pg_hba.conf

`pg_hba.conf` (host-based authentication) adalah firewall jaringan PostgreSQL. Aturan dievaluasi dari atas ke bawah dan **aturan pertama yang cocok yang menang**, sehingga urutan sangat penting: taruh aturan paling spesifik di awal dan akhiri dengan `reject` eksplisit. Setiap aturan menyatakan tipe koneksi, database, pengguna, alamat sumber, dan metode autentikasi.

```conf
# pg_hba.conf — aturan pertama yang cocok menang
# Koneksi lokal (socket) menggunakan autentikasi peer
local  all             all                                     peer

# Tolak semuanya dari internet publik terlebih dahulu
host   all             all             0.0.0.0/0               reject
host   all             all             ::/0                    reject

# Izinkan hanya subnet aplikasi, dengan TLS dan SCRAM
hostssl orders        app_orders      10.0.12.0/24            scram-sha-256
```

Selain itu, atur `listen_addresses` ke antarmuka spesifik yang harus dilayani database. Mendengarkan di `*` mengekspos PostgreSQL ke setiap jaringan tempat host berada; mendengarkan hanya di antarmuka privat (atau loopback untuk deployment satu host) mengecilkan permukaan serangan sebelum `pg_hba.conf` bekerja. Untuk koneksi Unix socket, autentikasi `peer` memetakan pengguna OS ke role database, yang merupakan bawaan lokal paling aman di host pengguna tunggal.

### 4. Enkripsi Data Saat Transit dengan TLS

Tanpa TLS, setiap kredensial dan setiap baris data yang melintasi jaringan adalah teks polos yang bisa dibaca pengamat mana pun di jalurnya. PostgreSQL telah mendukung TLS native sejak lama; mengaktifkannya adalah perubahan konfigurasi, bukan perubahan arsitektur, dan klien modern memverifikasinya dengan ketat.

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/certs/server.crt'
ssl_key_file  = '/etc/postgresql/certs/server.key'
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers   = 'HIGH:!aNULL:!MD5'
```

Sertifikat harus diterbitkan oleh CA internal (atau CA publik untuk endpoint yang menghadap internet) dan harus mencantumkan hostname yang digunakan klien. File key harus dimiliki pengguna `postgres` dengan mode `0600` — PostgreSQL menolak untuk memulai dengan key yang bisa dibaca semua orang. Di `pg_hba.conf`, lebih pilih `hostssl` daripada `host` polos untuk koneksi jarak jauh sehingga percobaan tanpa enkripsi ditolak alih-alih diam-diam diturunkan. Di sisi klien, connection string harus menggunakan `sslmode=verify-full`, yang memvalidasi rantai sertifikat dan hostname, mengalahkan serangan man-in-the-middle yang tidak dicegah mode `require` biasa.

### 5. Implementasikan Row-Level Security untuk Data Multi-Tenant

Privilege mengontrol *tabel mana* yang bisa disentuh role, tetapi row-level security (RLS) mengontrol *baris mana* di dalam tabel. Untuk aplikasi multi-tenant — di mana data setiap pengguna berada di tabel yang sama tetapi harus tidak terlihat oleh tenant lain — RLS adalah perbedaan antara satu kesalahan query yang membocorkan catatan setiap pelanggan dan satu query yang mengembalikan himpunan kosong.

```sql
-- Aktifkan RLS pada tabel (baris lama masih terlihat sampai FORCE)
ALTER TABLE app.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.orders FORCE ROW LEVEL SECURITY;

-- Baris tenant membawa tenant_id; role aplikasi mengaturnya per sesi
CREATE POLICY tenant_isolation ON app.orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Role admin dan layanan yang harus melihat semua data memilih keluar secara eksplisit
ALTER TABLE app.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_full_access ON app.orders
  USING (pg_has_role(current_user, 'orders_admin', 'MEMBER'));
```

`FORCE ROW LEVEL SECURITY` adalah baris yang sangat penting: tanpa baris ini, pemilik tabel melewati RLS sepenuhnya, yang diam-diam mengalahkan kebijakan justru untuk role yang biasanya menjalankan migrasi. Role aplikasi mengatur `app.tenant_id` sekali per sesi (dari token terautentikasi, tidak pernah dari input klien) dan setiap query otomatis dibatasi cakupannya. Untuk pemfilteran read-only, view `security_barrier` menyediakan lapisan pelengkap yang mencegah planner membocorkan baris terfilter melalui urutan join.

### 6. Audit Aktivitas dengan pgaudit dan Logging Terstruktur

Anda tidak bisa mengamankan apa yang tidak bisa Anda lihat. Ekstensi `pgaudit` menulis jejak audit terperinci tingkat sesi dari setiap pernyataan yang dieksekusi — siapa yang menjalankannya, kapan, pada objek apa, dan apakah berhasil. Berbeda dengan `log_statement` yang hanya mencatat teks pernyataan, `pgaudit` mencatat gambaran lengkap termasuk nilai parameter, role, dan nama objek, dan dirancang untuk dikirim ke kolektor log terpusat.

```conf
# postgresql.conf
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'write, ddl, role'
pgaudit.log_catalog = off
pgaudit.log_client = off
pgaudit.log_level = 'log'
```

```sql
-- Buat ekstensi di database yang ingin diaudit
CREATE EXTENSION IF NOT EXISTS pgaudit;
```

Padukan `pgaudit` dengan logging PostgreSQL yang disiplin: `log_line_prefix` harus menyertakan timestamp, pengguna, database, dan alamat klien agar entri audit siap dikorelasikan, dan `log_destination = 'csvlog'` (atau `syslog`) membuatnya mudah diurai mesin. Rotasikan log dan kirim ke SIEM terpusat; log audit yang hanya hidup di server database akan hilang bersama server tersebut.

### 7. Lindungi Data Saat Disimpan

Enkripsi saat transit tidak berguna ketika penyerang mencuri disk. Data saat disimpan memiliki tiga lapisan, masing-masing sesuai untuk ancaman yang berbeda:

- **Enkripsi disk penuh / volume** (LVM LUKS, enkripsi EBS cloud): melindungi dari pencurian fisik server atau volumenya. Ini transparan bagi PostgreSQL dan harus diaktifkan di lapisan infrastruktur untuk setiap host database.
- **Enkripsi tingkat kolom dengan `pgcrypto`**: melindungi bidang sensitif tertentu (token pembayaran, kunci API, pengenal pribadi) sehingga bahkan file database yang dibuang atau backup yang bocor tidak mengeksposnya. Aplikasi yang mengenkripsi dan mendekripsi, tetapi `pgcrypto` menyediakan primitifnya (`pgp_sym_encrypt`, `pgp_pub_encrypt`) dan menjaga SQL tetap ergonomis.
- **Backup terenkripsi**: `pgBackRest` dan `pg_probackup` sama-sama mendukung enkripsi repositori dengan kunci terpisah dari database. Pita backup adalah salinan data yang paling tidak dijaga; kunci enkripsi tidak boleh ikut dalam backup yang sama.

```sql
-- Enkripsi tingkat kolom dengan pgcrypto (aplikasi memegang passphrase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO app.payment_tokens (user_id, token)
VALUES (123, pgp_sym_encrypt('tok_live_123456', current_setting('app.crypto_key')));
```

Manajemen kunci adalah bagian tersulit dari enkripsi: simpan kunci di pengelola secret atau KMS khusus, rotasikan sesuai jadwal, dan jangan pernah memasukkannya ke repositori aplikasi atau connection string.

### 8. Perkuat Aplikasi terhadap SQL Injection dan Kebocoran Kredensial

Database adalah garis pertahanan terakhir, tetapi keamanan terbaik menghentikan serangan sebelum mencapai database. SQL injection masih menjadi cara paling umum database dikompromikan, dan perbaikannya sepenuhnya di lapisan aplikasi: gunakan query berparameter (prepared statement) untuk setiap nilai dinamis, jangan pernah menggabungkan input pengguna ke dalam SQL dengan string concatenation, dan validasi tipe input di batas API.

```python
# Python (psycopg) — berparameter, aman dari injection
cursor.execute(
    "SELECT * FROM app.orders WHERE tenant_id = %s AND id = %s",
    (tenant_id, order_id)
)
```

Hygiene secret di sisi aplikasi melengkapi hardening database: connection string harus menggunakan role khusus dengan hak akses minimum; kredensial harus berasal dari environment variable atau pengelola secret, bukan dari kode; dan connection pool harus dikonfigurasi dengan TLS `verify-full` sehingga identitas database divalidasi pada setiap koneksi baru. Pertimbangkan juga mengatur `statement_timeout` dan `idle_in_transaction_session_timeout` di tingkat role — sesi aplikasi yang dikompromikan seharusnya tidak bisa menyandera database dengan query berjalan lama.

## Langkah Implementasi

### Langkah 1: Buat Inventaris Pengguna, Role, dan Akses

Sebelum mengubah apa pun, ketahui apa yang Anda miliki. Daftarkan setiap role, atributnya, dan aturan jaringan saat ini.

```sql
-- Setiap role, atributnya, dan keanggotaannya
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin,
       rolpassword IS NOT NULL AS has_password, rolvaliduntil
FROM pg_roles
ORDER BY rolsuper DESC, rolname;

-- Aturan jaringan efektif sebagaimana PostgreSQL menyelesaikannya
SELECT type, database, user_name, address, auth_method
FROM pg_hba_file_rules
ORDER BY rule_number;
```

```bash
# Verifikasi juga dari sisi OS: siapa yang bisa mencapai port?
ss -ltnp | grep 5432
```

Catat role mana yang digunakan aplikasi, IP mana yang terhubung, dan role mana yang masih memiliki `rolsuper = true`. Inventaris ini adalah baseline yang akan dibandingkan setelah setiap langkah.

### Langkah 2: Terapkan SCRAM-SHA-256 untuk Semua Kata Sandi

Nonaktifkan penyimpanan kata sandi yang lemah dan tingkatkan setiap role yang masih menggunakan MD5.

```conf
# postgresql.conf
password_encryption = 'scram-sha-256'
```

```sql
-- Paksa re-hash saat penggunaan berikutnya; perubahan kata sandi menyimpan ulang sebagai SCRAM
ALTER ROLE app_orders PASSWORD 'ganti-dengan-secret-acak-panjang-baru';
ALTER ROLE alice PASSWORD 'ganti-dengan-kata-sandi-baru-alice';
```

Lalu pastikan tidak ada jalur autentikasi `trust` atau `md5` yang tersisa di `pg_hba.conf` dan satu-satunya metode kata sandi yang dirujuk adalah `scram-sha-256`:

```sql
SELECT type, user_name, address, auth_method
FROM pg_hba_file_rules
WHERE auth_method IN ('trust', 'md5', 'password');
```

Query ini harus mengembalikan nol baris. Metode `password` (teks polos lewat jaringan, bahkan dengan TLS sekalipun ini lebih buruk dari SCRAM) juga harus dihilangkan.

### Langkah 3: Susun Ulang Role dengan Hak Akses Minimum

Buat role aplikasi khusus dan buang bawaan yang memberi semua orang akses tulis.

```sql
-- Kunci skema public di setiap database
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC;

-- Role aplikasi
CREATE ROLE app_orders LOGIN PASSWORD 'ganti-dengan-secret-acak-panjang';
GRANT CONNECT ON DATABASE orders TO app_orders;
GRANT USAGE ON SCHEMA app TO app_orders;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_orders;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_orders;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_orders;

-- Role migrasi/deployment yang bisa mengubah skema tetapi tidak membaca data
CREATE ROLE app_migrations LOGIN PASSWORD 'ganti-dengan-secret-acak-panjang-lain';
GRANT CONNECT ON DATABASE orders TO app_migrations;
GRANT CREATE ON SCHEMA app TO app_migrations;
```

Pastikan tidak ada aplikasi yang menggunakan superuser `postgres`:

```sql
SELECT usename, application_name, client_addr
FROM pg_stat_activity
WHERE usename = 'postgres' AND application_name NOT IN ('psql', 'pg_dump');
```

Setiap baris dalam hasil tersebut adalah pelanggaran yang harus diperbaiki di konfigurasi koneksi aplikasi.

### Langkah 4: Konfigurasi Enkripsi TLS

Buat atau dapatkan sertifikat server dan alihkan PostgreSQL ke mode TLS.

```bash
# Self-signed untuk pengujian CA internal; produksi harus memakai CA sungguhan
mkdir -p /etc/postgresql/certs && cd /etc/postgresql/certs
openssl req -new -x509 -days 3650 -nodes \
  -keyout server.key -out server.crt \
  -subj "/CN=db.internal.example.com"
chown postgres:postgres server.key server.crt
chmod 0600 server.key
```

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/certs/server.crt'
ssl_key_file  = '/etc/postgresql/certs/server.key'
ssl_min_protocol_version = 'TLSv1.2'
```

Muat ulang dan verifikasi:

```bash
pg_ctl reload -D /var/lib/postgresql/data   # atau: SELECT pg_reload_conf();
```

```sql
-- Hanya koneksi TLS yang boleh terlihat dari host jarak jauh
SELECT pid, usename, client_addr, ssl, version
FROM pg_stat_ssl JOIN pg_stat_activity USING (pid)
WHERE client_addr IS NOT NULL;
```

Setiap sesi jarak jauh harus melaporkan `ssl = t`. Connection string klien harus menggunakan `sslmode=verify-full` (atau `sslmode=require` sebagai minimum mutlak) dan `sslrootcert` yang benar untuk CA internal.

### Langkah 5: Perketat pg_hba.conf

Tulis ulang `pg_hba.conf` dengan aturan izin eksplisit dan ekor penolakan eksplisit. Urutan penting — aturan pertama yang cocok yang menang.

```conf
# TYPE  DATABASE  USER        ADDRESS          METHOD
# Akses admin lokal melalui Unix socket
local   all       postgres                      peer
local   all       all                           scram-sha-256

# Subnet aplikasi — hanya TLS, hanya SCRAM
hostssl orders    app_orders 10.0.12.0/24       scram-sha-256
hostssl orders    app_migrations 10.0.14.0/24   scram-sha-256

# Replikasi dari subnet standby
hostssl replication repl_user 10.0.13.0/24      scram-sha-256

# Tolak eksplisit untuk semua hal lain (harus terakhir — aturan pertama yang cocok menang)
host    all       all       0.0.0.0/0           reject
host    all       all       ::/0                reject
```

Setelah memuat ulang, uji dari subnet aplikasi, dari subnet yang tidak diizinkan, dan via plaintext (tanpa TLS) — dua yang terakhir harus gagal dengan lantang:

```bash
psql "host=10.0.99.99 port=5432 dbname=orders user=app_orders sslmode=require"  # harus gagal
psql "host=10.0.12.5 port=5432 dbname=orders user=app_orders sslmode=disable"  # harus gagal (tidak ada kecocokan hostssl)
```

```conf
# listen_addresses harus menyebut antarmuka spesifik, bukan '*'
listen_addresses = '10.0.12.5,127.0.0.1'
```

### Langkah 6: Aktifkan Row-Level Security pada Tabel Tenant

Untuk tabel yang menyimpan data per tenant, aktifkan dan paksakan RLS, lalu buat kebijakan isolasi tenant.

```sql
ALTER TABLE app.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.orders FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON app.orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Override admin untuk tim dukungan dan data
CREATE POLICY admin_full_access ON app.orders
  USING (pg_has_role(current_user, 'orders_admin', 'MEMBER'));
```

Perbarui bootstrap koneksi aplikasi sehingga setiap sesi mengatur konteks tenant segera setelah terhubung — dari token sesi terautentikasi, tidak pernah dari parameter yang dikirim klien:

```python
# Bootstrap koneksi psycopg
conn.execute("SET app.tenant_id = %s", (tenant_uuid,))
```

Verifikasi isolasi dengan dua sesi yang menyamar sebagai tenant berbeda: masing-masing hanya boleh melihat barisnya sendiri, dan pelanggaran `WITH CHECK` (menulis id tenant lain) harus memunculkan error.

```sql
SET app.tenant_id = '11111111-1111-1111-1111-111111111111';
SELECT count(*) FROM app.orders;   -- hitungan tenant A

SET app.tenant_id = '22222222-2222-2222-2222-222222222222';
SELECT count(*) FROM app.orders;   -- hitungan tenant B, berbeda
```

### Langkah 7: Terapkan Audit Logging dengan pgaudit

Pasang ekstensi dan arahkan keluarannya ke log terstruktur dan terpusat.

```conf
# postgresql.conf
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'write, ddl, role'
pgaudit.log_catalog = off
pgaudit.log_parameter = on
pgaudit.log_relation = on
log_destination = 'csvlog'
log_line_prefix = '%m [%p] %q%u@%d %a %r '
```

```bash
# Pasang paket ekstensi, lalu (re)start PostgreSQL agar preload berlaku
apt-get install -y postgresql-16-pgaudit   # atau versi yang sesuai
systemctl restart postgresql
```

```sql
CREATE EXTENSION IF NOT EXISTS pgaudit;
```

Picu satu tulis uji dan pastikan jejak audit menangkapnya:

```sql
INSERT INTO app.orders (id, tenant_id, total) VALUES (1, '11111111-1111-1111-1111-111111111111', 42.00);
```

```bash
# Log CSV harus berisi entri AUDIT yang menyebut role, pernyataan, dan objek
grep -i 'AUDIT' /var/log/postgresql/postgresql-16-main.csv | tail -5
```

Sambungkan log CSV ke log shipper Anda (Promtail, Filebeat, forwarder rsyslog) sehingga peristiwa audit mencapai SIEM sebelum server database dihancurkan oleh penyerang yang direkamnya.

### Langkah 8: Jalankan Tinjauan Keamanan dan Dokumentasikan Baseline

Tutup siklus dengan pemeriksaan verifikasi yang melatih setiap lapisan sekaligus.

```sql
-- 1. Tidak ada metode autentikasi lemah yang tersisa
SELECT type, user_name, address, auth_method
FROM pg_hba_file_rules
WHERE auth_method IN ('trust', 'md5', 'password');

-- 2. Tidak ada sesi aplikasi superuser
SELECT usename, application_name, client_addr
FROM pg_stat_activity
WHERE usename = 'postgres';

-- 3. TLS aktif untuk semua koneksi jarak jauh
SELECT count(*) FILTER (WHERE NOT ssl) AS insecure_remote
FROM pg_stat_ssl JOIN pg_stat_activity USING (pid)
WHERE client_addr IS NOT NULL;

-- 4. RLS aktif pada tabel tenant
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('orders', 'customers', 'payments');

-- 5. Ekstensi audit dimuat
SELECT name, setting FROM pg_settings WHERE name = 'shared_preload_libraries';
```

Dokumentasikan hasilnya — matriks role, kumpulan aturan `pg_hba.conf`, tanggal rotasi sertifikat, dan tujuan log audit — di runbook tim. Keamanan adalah proses berkelanjutan, bukan acara satu kali: jadwalkan tinjauan role dan aturan setiap kuartal, rotasikan sertifikat TLS dan kata sandi database dalam irama tetap, dan perlakukan setiap fitur baru yang menyentuh database sebagai kesempatan untuk menjalankan ulang daftar periksa ini. Baseline yang terdokumentasi adalah yang memungkinkan Anda melihat drift sebelum menjadi pelanggaran.

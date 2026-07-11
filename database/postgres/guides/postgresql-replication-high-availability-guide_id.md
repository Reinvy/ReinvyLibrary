---
title: "Panduan Replikasi dan Ketersediaan Tinggi PostgreSQL"
description: "Panduan komprehensif tentang strategi replikasi dan ketersediaan tinggi PostgreSQL mencakup streaming replication, logical replication, failover dengan Patroni, pemulihan pg_rewind, dan pola arsitektur HA untuk produksi."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Replikasi dan Ketersediaan Tinggi PostgreSQL

## Pendahuluan

PostgreSQL menawarkan serangkaian fitur replikasi bawaan yang tangguh untuk memungkinkan ketersediaan tinggi (HA), skalabilitas baca, dan pemulihan bencana. Baik Anda menjalankan satu basis data produksi atau sistem yang terdistribusi secara global, memahami arsitektur replikasi PostgreSQL sangat penting untuk merancang lapisan data yang tangguh yang dapat bertahan dari kegagalan perangkat keras, partisi jaringan, dan pemadaman pusat data tanpa kehilangan data.

Panduan ini mencakup spektrum penuh replikasi dan HA PostgreSQL — dari menyiapkan streaming replication untuk standby panas, hingga mengonfigurasi replikasi sinkron untuk nol kehilangan data, mengimplementasikan logical replication untuk distribusi data selektif, dan menerapkan Patroni untuk failover otomatis. Anda akan mempelajari prinsip arsitektur di balik setiap pendekatan, trade-off antara konsistensi dan ketersediaan, serta praktik operasional yang diperlukan untuk menjalankan kluster PostgreSQL tingkat produksi.

Di akhir panduan ini, Anda akan mampu merancang, menerapkan, dan memelihara kluster PostgreSQL yang memenuhi persyaratan recovery point objective (RPO) dan recovery time objective (RTO).

## Praktik Terbaik

### 1. Pilih Strategi Replikasi yang Tepat

PostgreSQL mendukung dua paradigma replikasi utama, masing-masing cocok untuk kasus penggunaan yang berbeda:

**Physical (Streaming) Replication** mereplikasi seluruh kluster basis data di tingkat blok. Server standby menerapkan catatan Write-Ahead Log (WAL) secara identik dengan primary. Ini adalah fondasi untuk ketersediaan tinggi dan tepat ketika Anda membutuhkan salinan basis data yang identik secara byte-for-byte.

**Logical Replication** mereplikasi tabel atau basis data individual menggunakan model publish-subscribe. Perubahan didekode dari WAL menjadi aliran logis (INSERT, UPDATE, DELETE) dan diterapkan secara independen di subscriber. Ini ideal untuk berbagi data selektif, upgrade antar versi utama PostgreSQL, dan arsitektur multi-master.

| Kriteria | Streaming (Physical) Replication | Logical Replication |
|---|---|---|
| Granularitas | Seluruh kluster | Per-tabel |
| Kompatibilitas versi | Versi utama yang sama | Lintas versi (sama atau lebih baru) |
| Tulis di standby | Hanya-baca (replica) | Hanya-baca (subscriber) |
| Replikasi DDL | Otomatis | Manual (tidak direplikasi) |
| Kasus penggunaan | HA, failover, read replica | Distribusi data, migrasi, ETL |

**Rekomendasi**: Gunakan streaming replication sebagai default untuk HA dan failover. Cadangkan logical replication untuk kebutuhan khusus seperti upgrade versi utama, berbagi data selektif antar layanan, atau pipeline integrasi data real-time.

### 2. Konfigurasi Replikasi Sinkron untuk Nol Kehilangan Data

Replikasi asinkron (default) memberikan kinerja terbaik tetapi berisiko kehilangan transaksi yang telah dikomit jika primary gagal sebelum standby menerima WAL. Replikasi sinkron menjamin bahwa setiap commit ditulis ke setidaknya satu standby sinkron sebelum mengakui klien.

```conf
# postgresql.conf pada primary
synchronous_standby_names = 'FIRST 1 (standby1, standby2)'
synchronous_commit = 'remote_write'  # atau 'on' untuk sinkron penuh
```

Tingkat `synchronous_commit` menawarkan jaminan ketahanan yang berbeda:

| Tingkat | Ketahanan | Dampak Kinerja |
|---|---|---|
| `off` | Tidak sinkron — commit sebelum flush WAL | Tercepat, risiko kehilangan data |
| `on` | Commit setelah WAL di-flush di primary dan sync standby | Seimbang |
| `remote_write` | Commit setelah WAL di-flush di primary, ditulis ke OS standby | Kinerja baik, keamanan sedang |
| `remote_apply` | Commit setelah perubahan diterapkan di standby (terlihat di sana) | Terlambat, konsistensi terkuat |

**Aturan praktis**: Gunakan `remote_write` untuk sebagian besar beban kerja produksi — ini memberikan ketahanan yang kuat dengan latensi sekitar 2x lipat dari replikasi asinkron. Gunakan `remote_apply` hanya ketika aplikasi memerlukan konsistensi read-your-writes pada pembacaan standby.

**PERINGATAN**: Jika semua standby sinkron mati, primary berhenti memproses commit. Selalu konfigurasikan setidaknya dua standby sinkron atau gunakan `FIRST N` dengan `N < total_standbys` untuk menghindari gangguan ketersediaan.

### 3. Rancang Standby untuk Produksi

Konfigurasi standby tingkat produksi memerlukan perhatian pada perangkat keras, jaringan, dan pengaturan khusus PostgreSQL.

**Kesetaraan perangkat keras**: Standby harus cocok dengan primary dalam hal CPU, memori, dan kinerja penyimpanan. Jika standby secara signifikan lebih lambat, ia akan tertinggal selama beban tulis puncak, membuat failover berisiko.

**Pertimbangan jaringan**: Jaga latensi replikasi di bawah 10 milidetik untuk replikasi sinkron. Untuk replikasi asinkron antar pusat data, pantau `pg_stat_replication.replay_lag` dan atur ambang peringatan berdasarkan RPO Anda.

**Konfigurasi khusus standby**:

```conf
# standby/postgresql.conf
hot_standby = on                    # Izinkan kueri baca di standby
hot_standby_feedback = on           # Cegah pembatalan kueri dari konflik VACUUM
wal_receiver_timeout = 60000        # Timeout 60 detik untuk penerima WAL
primary_conninfo = 'host=primary_host port=5432 user=replicator password=...'
primary_slot_name = 'standby1'      # Gunakan slot replikasi fisik
```

Replication slot mencegah primary membuang segmen WAL yang belum diterima oleh standby. Ini penting untuk pemutusan sambungan standby yang lama:

```sql
-- Pada primary: buat physical replication slot
SELECT pg_create_physical_replication_slot('standby1');

-- Pantau ketertinggalan slot
SELECT slot_name, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS bytes_behind
FROM pg_replication_slots;
```

### 4. Otomatiskan Failover dengan Patroni

Failover manual rentan terhadap kesalahan dan lambat. Untuk sistem produksi, gunakan **Patroni** — orkestrator HA yang teruji yang mengelola instance PostgreSQL, mendeteksi kegagalan primary, dan mempromosikan standby paling maju secara otomatis.

Patroni menggunakan penyimpanan konsensus terdistribusi (etcd, Consul, atau ZooKeeper) untuk melacak status kluster dan mengoordinasikan keputusan failover:

```yaml
# patroni.yml
scope: postgres-prod
namespace: /db/
name: pg-primary

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.1:8008

consul:
  host: 10.0.0.10:8500

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.0.1:5432
  data_dir: /var/lib/postgresql/16/main
  parameters:
    hot_standby: "on"
    wal_level: replica
    max_wal_senders: 5
    wal_keep_size: 1024
  authentication:
    replication:
      username: replicator
      password: password_aman_disini
    superuser:
      username: postgres
      password: password_super_aman
    rewind:
      username: rewind_user
      password: password_rewind_aman

  create_replica_methods:
    - basebackup
  basebackup:
    checkpoint: fast

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

**Anggota kluster Patroni**: Setiap instance PostgreSQL menjalankan agen Patroni yang:

1. Mendaftarkan dirinya di DCS (Distributed Configuration Store)
2. Menjalankan pemeriksaan kesehatan berkala terhadap PostgreSQL
3. Memilih pemimpin (primary) melalui mekanisme sewa DCS
4. Secara otomatis mempromosikan kandidat terbaik saat primary gagal
5. Menggabungkan kembali primary yang gagal sebagai replica (melalui `pg_rewind`)

**Perilaku failover**:

- Patroni memeriksa interval `loop_wait` (default 10 detik) untuk kesehatan primary
- Setelah `ttl` (default 30 detik) tanpa detak jantung pemimpin, pemilihan pemimpin baru dimulai
- Standby dengan posisi WAL tertinggi (paling sedikit tertinggal) dipromosikan
- Primary yang gagal, saat kembali, secara otomatis dikonfigurasi ulang sebagai standby menggunakan `pg_rewind`

```bash
# Periksa status kluster Patroni
patronictl -c /etc/patroni/patroni.yml list

# Switchover terjadwal
patronictl -c /etc/patroni/patroni.yml switchover --master pg-primary --candidate pg-standby-1

# Failover paksa dalam keadaan darurat
patronictl -c /etc/patroni/patroni.yml failover --master pg-primary --candidate pg-standby-1 --force
```

### 5. Gunakan pg_rewind untuk Pemulihan Cepat Setelah Split-Brain

Ketika primary yang gagal bergabung kembali ke kluster setelah failover, garis waktunya menyimpang dari primary baru. Menggunakan `pg_rewind` jauh lebih cepat daripada membangun ulang standby dari awal — ini hanya memutar ulang segmen WAL yang berbeda daripada melakukan base backup penuh.

Patroni menggunakan `pg_rewind` secara otomatis, tetapi memahami cara kerjanya penting untuk mendiagnosis masalah pemulihan:

```bash
# pg_rewind manual (dari primary yang gagal)
systemctl stop postgresql-16

# Jalankan pg_rewind untuk sinkronisasi dengan primary baru
pg_rewind --target-pgdata /var/lib/postgresql/16/main \
          --source-server="host=new-primary-host port=5432 user=rewind_user dbname=postgres" \
          --progress

# Mulai PostgreSQL sebagai standby
systemctl start postgresql-16
```

**Prasyarat untuk pg_rewind**:
- `wal_log_hints = on` atau `data_checksums = enabled` di primary asli
- Replication slot atau retensi WAL yang cukup untuk mencakup periode divergensi
- `rewind_user` harus memiliki keanggotaan `pg_monitor` atau menjadi superuser
- Server target harus dimatikan dengan bersih (mode `fast` atau `immediate`)

### 6. Konfigurasi Skalabilitas Baca dengan Load Balancing

Replica streaming dapat melayani kueri baca, secara dramatis meningkatkan throughput baca kluster Anda. Gabungkan replica dengan load balancer untuk skala baca yang transparan:

```text
Aplikasi
    │
    ▼
┌─────────────┐
│   HAProxy   │  Port 5432 (primary), Port 5433 (replica)
│  atau Pgpool│
└──────┬──────┘
       │
       ├───────────────┐
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│  Primary    │ │  Standby 1  │
│  (tulis)    │ │  (baca)     │
└─────────────┘ └─────────────┘
                    ┌─────────────┐
                    │  Standby 2  │
                    │  (baca)     │
                    └─────────────┘
```

**Konfigurasi HAProxy untuk pemisahan baca/tulis**:

```haproxy
# haproxy.cfg
frontend pg_frontend
    bind *:5432
    default_backend pg_primary

backend pg_primary
    option pgsql-check user haproxy_check
    server primary 10.0.0.1:5432 check port 5432

frontend pg_read_frontend
    bind *:5433
    default_backend pg_replicas

backend pg_replicas
    option pgsql-check user haproxy_check
    server replica1 10.0.0.2:5432 check port 5432
    server replica2 10.0.0.3:5432 check port 5432
```

**URL koneksi untuk pemisahan baca/tulis**:
```text
# Operasi tulis → pool primary
DATABASE_URL=postgresql://user:password@haproxy:5432/mydb

# Operasi baca → pool replica
DATABASE_READ_URL=postgresql://user:password@haproxy:5433/mydb
```

### 7. Pantau Kesehatan Replikasi Secara Berkelanjutan

Replikasi rentan terhadap gangguan — masalah jaringan, beban tulis berat, dan penyimpangan konfigurasi dapat secara diam-diam menyebabkan ketertinggalan replica yang melanggar RPO Anda. Pantau metrik ini:

```sql
-- Ketertinggalan replikasi: byte dan waktu
SELECT client_addr, application_name, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS sent_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) AS write_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_bytes,
       write_lag, flush_lag, replay_lag
FROM pg_stat_replication;

-- Ketertinggalan slot replikasi
SELECT slot_name, slot_type, database,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS bytes_behind,
       active
FROM pg_replication_slots;

-- Di sisi standby: periksa apakah server ini replica
SELECT pg_is_in_recovery();

-- Di sisi standby: ukur keterlambatan penerimaan dan pemutaran ulang
SELECT now() - pg_last_xact_replay_timestamp() AS replication_delay;
```

**Ambang peringatan untuk pemantauan replikasi**:

| Metrik | Peringatan | Kritis |
|---|---|---|
| Keterlambatan replay (asinkron) | > 30 detik | > 5 menit |
| Keterlambatan replay (sinkron) | > 1 detik | > 5 detik |
| Ketertinggalan slot replikasi | > 10 GB | > 50 GB |
| Jumlah WAL sender | > 80% dari max_wal_senders | Semua WAL sender terpakai |

### 8. Rencanakan Pemulihan Bencana Antar Pusat Data

Strategi HA yang lengkap harus memperhitungkan kegagalan pusat data. Terapkan standby di region sekunder dengan replikasi asinkron untuk pemulihan bencana:

```text
┌──────────────┐     Async     ┌──────────────┐
│ Pusat Data A │◄──────────────│ Pusat Data B │
│ (Primary)    │  Replikasi    │ (DR Standby)  │
│              │               │               │
│ Patroni+etcd │               │ Patroni+etcd  │
│ Koneksi app  │               │ Arsip WAL     │
└──────────────┘               └───────────────┘
```

**Praktik terbaik arsitektur multi-pusat-data**:
- Jalankan kluster etcd/Consul terpisah per region — jangan rentangkan kluster konsensus antar pusat data
- Gunakan `recovery_target_time` atau `recovery_target_lsn` untuk point-in-time recovery (PITR) di DR standby
- Uji failover ke situs DR setiap triwulan dengan latihan penuh
- Arsipkan segmen WAL ke penyimpanan objek (S3/GCS) sebagai cadangan terakhir

```conf
# Konfigurasi pengarsipan Postgres (primary)
archive_mode = on
archive_command = 'aws s3 cp %p s3://my-db-wal-archive/%f'
archive_timeout = 60
```

**Pemulihan dari arsip WAL untuk pemulihan bencana**:

```bash
# Di server baru, pulihkan base backup terbaru
pg_basebackup -h primary-host -D /var/lib/postgresql/16/main -P -X stream

# Atau pulihkan dari snapshot pgBackRest
pgbackrest --stanza=prod --type=latest restore

# Konfigurasi restore_command untuk mengambil WAL dari arsip
restore_command = 'aws s3 cp s3://my-db-wal-archive/%f %p'
```

## Langkah Implementasi

### Langkah 1: Terapkan Kluster Streaming Replication (Manual)

Siapkan primary dan standby dari awal untuk memahami mekanisme sebelum memperkenalkan otomatisasi.

**Di server primary**:

```conf
# postgresql.conf
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1024             # Simpan 1 GB WAL untuk standby yang tertinggal
hot_standby = on
listen_addresses = '*'
```

```bash
# Buat pengguna replikasi
sudo -u postgres psql -c "CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'password_aman';"

# Konfigurasi pg_hba.conf untuk mengizinkan koneksi replikasi
echo 'host replication replicator ip_standby/32 scram-sha-256' | \
  sudo tee -a /etc/postgresql/16/main/pg_hba.conf

# Muat ulang konfigurasi
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Buat replication slot
sudo -u postgres psql -c "SELECT pg_create_physical_replication_slot('standby1');"
```

**Di server standby**:

```bash
# Hentikan PostgreSQL yang berjalan
sudo systemctl stop postgresql

# Ambil base backup dari primary
sudo -u postgres pg_basebackup -h primary-host -D /var/lib/postgresql/16/main \
  -U replicator -P -v --slot=standby1 --write-recovery-conf

# Mulai standby
sudo systemctl start postgresql

# Verifikasi replikasi
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
# Harus mengembalikan 't' (true) di standby
```

**Verifikasi replikasi berfungsi**:

```sql
-- Di primary: periksa koneksi standby
SELECT client_addr, application_name, state, sync_state, replay_lag
FROM pg_stat_replication;

-- Buat tabel uji di primary
CREATE TABLE test_replication (id serial primary key, data text);
INSERT INTO test_replication (data) VALUES ('halo dari primary');

-- Di standby: verifikasi data muncul
SELECT * FROM test_replication;
```

### Langkah 2: Terapkan Patroni untuk HA Otomatis

Ganti konfigurasi manual dengan Patroni untuk failover otomatis dan penyembuhan mandiri.

**Instal Patroni di semua node**:

```bash
# Menggunakan pip (Python 3.8+ diperlukan)
pip install patroni[etcd] psycopg2-binary

# Buat direktori konfigurasi Patroni
sudo mkdir -p /etc/patroni
```

**Siapkan etcd (atau Consul) sebagai backend DCS**:

```bash
# Instal etcd di tiga node untuk kuorum
wget https://github.com/etcd-io/etcd/releases/download/v3.5.15/etcd-v3.5.15-linux-amd64.tar.gz
tar xzf etcd-v3.5.15-linux-amd64.tar.gz
sudo mv etcd-v3.5.15-linux-amd64/etcd* /usr/local/bin/

# Buat konfigurasi etcd
cat > /etc/etcd/etcd.conf.yml << 'EOF'
name: 'etcd-node-1'
data-dir: /var/lib/etcd
listen-client-urls: 'http://0.0.0.0:2379'
advertise-client-urls: 'http://10.0.0.1:2379'
listen-peer-urls: 'http://0.0.0.0:2380'
initial-advertise-peer-urls: 'http://10.0.0.1:2380'
initial-cluster: 'etcd-node-1=http://10.0.0.1:2380,etcd-node-2=http://10.0.0.2:2380,etcd-node-3=http://10.0.0.3:2380'
initial-cluster-token: 'pg-cluster'
initial-cluster-state: 'new'
EOF
```

**Buat konfigurasi Patroni** di setiap node PostgreSQL (`/etc/patroni/patroni.yml`):

```yaml
scope: pg-ha-cluster
namespace: /db/
name: pg-node-1        # Unik per node

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.1:8008

etcd:
  host: 10.0.0.1:2379,10.0.0.2:2379,10.0.0.3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1 MB
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        wal_keep_size: 1024
        max_connections: 200

  initdb: [auth: scram-sha-256]
  pg_hba:
    - host replication replicator 0.0.0.0/0 scram-sha-256
    - host all all 0.0.0.0/0 scram-sha-256

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.0.1:5432
  data_dir: /var/lib/postgresql/16/main
  bin_dir: /usr/lib/postgresql/16/bin
  authentication:
    replication:
      username: replicator
      password: rep_pass_123
    superuser:
      username: postgres
      password: admin_pass_123
    rewind:
      username: rewind_user
      password: rewind_pass_123
  create_replica_methods:
    - basebackup
  basebackup:
    checkpoint: fast

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

**Mulai Patroni di semua node**:

```bash
# Hentikan PostgreSQL yang berjalan — Patroni mengelolanya
sudo systemctl stop postgresql

# Mulai Patroni (sebagai pengguna postgres atau root)
patroni /etc/patroni/patroni.yml &

# Atau instal sebagai layanan systemd
cat > /etc/systemd/system/patroni.service << 'EOF'
[Unit]
Description=Patroni HA Manager
After=network.target etcd.service

[Service]
User=postgres
Group=postgres
ExecStart=/usr/local/bin/patroni /etc/patroni/patroni.yml
KillMode=process
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now patroni
```

**Verifikasi kluster Patroni**:

```bash
# Periksa status kluster
patronictl -c /etc/patroni/patroni.yml list

# Contoh output:
# + Cluster: pg-ha-cluster -----+--------+--------+----+-----------+
# | Member    | Host            | Role    | State  | TL | Lag in MB |
# +-----------+-----------------+---------+--------+----+-----------+
# | pg-node-1 | 10.0.0.1:5432   | Leader  | running|  1 |           |
# | pg-node-2 | 10.0.0.2:5432   | Replica | running|  1 |         0 |
# | pg-node-3 | 10.0.0.3:5432   | Replica | running|  1 |         0 |
# +-----------+-----------------+---------+--------+----+-----------+
```

### Langkah 3: Uji Failover Otomatis

Simulasikan kegagalan primary dan verifikasi Patroni mempromosikan pemimpin baru:

```bash
# Identifikasi pemimpin saat ini
LEADER=$(patronictl -c /etc/patroni/patroni.yml list | grep Leader | awk '{print $2}')
echo "Pemimpin saat ini: $LEADER"

# Simulasikan kegagalan dengan menghentikan PostgreSQL di pemimpin
ssh "$LEADER" "sudo systemctl stop postgresql"

# Amati Patroni mendeteksi kegagalan dan mempromosikan pemimpin baru
patronictl -c /etc/patroni/patroni.yml list --watch
# Dalam ~30 detik, pemimpin baru akan terpilih
```

```sql
-- Di primary yang baru dipromosikan, verifikasi ia menerima tulis
CREATE TABLE failover_test (id serial primary key, promoted_at timestamptz DEFAULT now());
INSERT INTO failover_test DEFAULT VALUES;
SELECT * FROM failover_test;
```

**Kembalikan node yang gagal**:

```bash
# Patroni secara otomatis mengkonfigurasi ulang node yang gagal sebagai replica.
# Cukup mulai proses Patroni di node tersebut dan ia bergabung kembali:
sudo systemctl start patroni
# Patroni menjalankan pg_rewind secara otomatis untuk sinkronisasi dengan primary baru
```

```bash
# Verifikasi ketiga node sehat kembali
patronictl -c /etc/patroni/patroni.yml list
```

### Langkah 4: Implementasi Pemisahan Baca/Tulis

Konfigurasi HAProxy untuk mengarahkan lalu lintas tulis ke pemimpin Patroni dan lalu lintas baca ke replica. Patroni mengekspos REST API untuk pemeriksaan kesehatan yang menunjukkan peran node.

**Endpoint REST Patroni untuk pemeriksaan kesehatan**:

```bash
# Di setiap node Patroni
curl -s http://localhost:8008/health | python3 -m json.tool
# Respons mencakup "role": "master" atau "replica"

# Dapatkan topologi kluster
curl -s http://localhost:8008/cluster | python3 -m json.tool
```

**Konfigurasi HAProxy dengan pemeriksaan kesehatan Patroni**:

```haproxy
# haproxy.cfg
global
    maxconn 5000

defaults
    mode tcp
    timeout connect 5s
    timeout client 60s
    timeout server 60s

# Lalu lintas tulis → pemimpin Patroni (port 8008 health check mengembalikan 200 hanya untuk pemimpin)
frontend pg_write_frontend
    bind *:5432
    use_backend pg_primary

backend pg_primary
    option httpchk GET /health
    http-check expect status 200
    server pg-node-1 10.0.0.1:5432 check port 8008 fall 3 rise 2
    server pg-node-2 10.0.0.2:5432 check port 8008 fall 3 rise 2 backup
    server pg-node-3 10.0.0.3:5432 check port 8008 fall 3 rise 2 backup

# Lalu lintas baca → replica (port 8008 health check untuk peran replica)
frontend pg_read_frontend
    bind *:5433
    use_backend pg_replicas

backend pg_replicas
    option httpchk GET /replica
    http-check expect status 200
    server pg-node-2 10.0.0.2:5432 check port 8008 fall 3 rise 2
    server pg-node-3 10.0.0.3:5432 check port 8008 fall 3 rise 2
    server pg-node-1 10.0.0.1:5432 check port 8008 fall 3 rise 2 backup
```

### Langkah 5: Siapkan Logical Replication untuk Distribusi Data Selektif

Logical replication berguna ketika hanya subset tabel yang perlu didistribusikan, atau ketika subscriber menjalankan versi PostgreSQL yang berbeda.

**Di publisher (primary)**:

```sql
-- Buat publikasi untuk tabel tertentu
CREATE PUBLICATION orders_pub
FOR TABLE orders, order_items, customers
WITH (publish = 'insert, update, delete, truncate');

-- Atau publikasikan semua tabel
CREATE PUBLICATION all_tables_pub
FOR ALL TABLES;

-- Verifikasi publikasi
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;
```

**Di subscriber**:

```sql
-- Buat skema tabel yang sama (harus ada di subscriber)
CREATE TABLE orders (id serial primary key, ...);
CREATE TABLE order_items (id serial primary key, ...);
CREATE TABLE customers (id serial primary key, ...);

-- Buat subscription yang terhubung ke publisher
CREATE SUBSCRIPTION orders_sub
CONNECTION 'host=publisher-host port=5432 dbname=mydb user=replicator password=...'
PUBLICATION orders_pub
WITH (copy_data = true,        -- Salin data yang ada saat pembuatan
      create_slot = true,      -- Buat slot WAL secara otomatis
      enabled = true);         -- Mulai replikasi segera

-- Pantau status subscription
SELECT oid, subname, subenabled, subslotname
FROM pg_subscription;
```

**Memantau logical replication**:

```sql
-- Di subscriber: periksa status sinkronisasi
SELECT * FROM pg_stat_subscription;

-- Di publisher: periksa WAL sender untuk logical replication
SELECT application_name, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS bytes_behind
FROM pg_stat_replication
WHERE application_name LIKE '%sub%';
```

**Menangani perubahan skema**: Logical replication tidak mereplikasi DDL. Ketika Anda mengubah tabel di publisher, Anda harus melakukan perubahan yang sama di subscriber:

```sql
-- Di publisher
ALTER TABLE orders ADD COLUMN diskon numeric(10,2) DEFAULT 0;

-- Di subscriber (transaksi terpisah)
ALTER TABLE orders ADD COLUMN diskon numeric(10,2) DEFAULT 0;
```

### Langkah 6: Konfigurasi Point-in-Time Recovery dan Pengarsipan WAL

Pengarsipan WAL menyediakan kemampuan untuk memulihkan ke titik waktu tertentu, yang penting untuk pemulihan bencana dan pemulihan data dari kesalahan logis.

**Konfigurasi pengarsipan WAL di primary**:

```conf
# postgresql.conf
archive_mode = on
archive_command = 'pgbackrest --stanza=prod archive-push %p'
archive_timeout = 60
```

**Menggunakan pgBackRest untuk manajemen cadangan dan arsip**:

```conf
# /etc/pgbackrest/pgbackrest.conf
[prod]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432

[global]
repo1-path=/backup/pgbackrest
repo1-retention-full=4
repo1-cipher-pass=kunci_enkripsi_cadangan

# Repositori S3 (untuk DR di luar situs)
repo2-type=s3
repo2-s3-bucket=my-db-backups
repo2-s3-region=us-east-1
repo2-retention-full=2
```

```bash
# Buat backup penuh pertama
sudo -u postgres pgbackrest --stanza=prod --type=full backup

# Buat backup diferensial
sudo -u postgres pgbackrest --stanza=prod --type=diff backup

# Buat backup inkremental
sudo -u postgres pgbackrest --stanza=prod --type=incr backup

# Daftar backup
sudo -u postgres pgbackrest --stanza=prod info

# Pulihkan ke titik waktu terbaru
sudo -u postgres pgbackrest --stanza=prod --type=latest restore

# Pulihkan ke titik waktu tertentu (PITR)
sudo -u postgres pgbackrest --stanza=prod --type=time \
  --target="2025-06-15 03:30:00 EST" --target-action=promote restore
```

### Langkah 7: Lakukan Latihan Failover Terjadwal

HA produksi hanya sebaik pengujian failover Anda. Jalankan latihan ini setiap triwulan:

```bash
# 1. Umumkan jendela pemeliharaan
echo "Memulai latihan failover HA triwulanan"

# 2. Periksa dasar kesehatan kluster
patronictl -c /etc/patroni/patroni.yml list

# 3. Jalankan beban kerja tulis berkelanjutan untuk verifikasi
psql -h haproxy -p 5432 -c "
  CREATE TABLE IF NOT EXISTS ha_drill_log (
    id serial primary key, ts timestamptz default now(), host text
  );
  INSERT INTO ha_drill_log (host) VALUES (current_setting('listen_addresses'));
"

# 4. Lakukan switchover terkendali
patronictl -c /etc/patroni/patroni.yml switchover \
  --master pg-node-1 --candidate pg-node-2

# 5. Verifikasi tulis berlanjut selama switchover
psql -h haproxy -p 5432 -c "
  INSERT INTO ha_drill_log (host) VALUES ('setelah_switchover');
  SELECT count(*) FROM ha_drill_log;
"

# 6. Verifikasi lalu lintas baca di replica
psql -h haproxy -p 5433 -c "SELECT * FROM ha_drill_log ORDER BY id DESC LIMIT 5;"

# 7. Verifikasi pemimpin baru
patronictl -c /etc/patroni/patroni.yml list
# Diharapkan: pg-node-2 sebagai Leader, pg-node-1 sebagai Replica

# 8. Kembalikan switch (opsional)
patronictl -c /etc/patroni/patroni.yml switchover \
  --master pg-node-2 --candidate pg-node-1

# 9. Dokumentasikan hasil
echo "Latihan failover selesai dengan sukses"
echo "Keterlambatan replikasi maksimum selama switchover: ..."
```

**Daftar periksa validasi untuk latihan HA**:

- [ ] Aplikasi tanpa downtime selama switchover (tidak ada error 5xx)
- [ ] Tidak ada kehilangan data (jumlah baris di `ha_drill_log` sama dengan sisipan yang diharapkan)
- [ ] Keterlambatan replica kembali ke nol dalam 60 detik setelah switchover selesai
- [ ] Semua peringatan pemantauan menyala dengan benar untuk peristiwa failover
- [ ] Failback (kembali ke primary asli) selesai dengan bersih

### Langkah 8: Bangun Pemantauan Replikasi Berkelanjutan

Terapkan stack pemantauan yang memberikan visibilitas real-time ke dalam kesehatan replikasi:

```bash
# Menggunakan postgres_exporter untuk Prometheus
cat > ~/postgres_exporter_replication.queries.yaml << 'EOF'
pg_replication:
  query: |
    SELECT client_addr, application_name, state, sync_state,
           pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_bytes
    FROM pg_stat_replication
  metrics:
    - client_addr:
        usage: "LABEL"
    - application_name:
        usage: "LABEL"
    - state:
        usage: "LABEL"
    - sync_state:
        usage: "LABEL"
    - replay_bytes:
        usage: "GAUGE"
        description: "Keterlambatan replikasi dalam byte"
EOF

# Jalankan exporter
DATA_SOURCE_NAME="postgresql://monitor_user:password@localhost:5432/postgres?sslmode=disable" \
  postgres_exporter \
  --extend.query-path=~/postgres_exporter_replication.queries.yaml \
  --web.listen-address=:9187
```

**Panel dashboard Grafana untuk replikasi**:

1. **Panel Keterlambatan Replikasi** — Grafik deret waktu `replay_bytes` per standby, diwarnai berdasarkan status sinkronisasi (hijau untuk sinkron, kuning untuk asinkron)
2. **Tingkat Pembuatan WAL** — Byte WAL yang dihasilkan per detik di primary, berguna untuk perencanaan kapasitas
3. **Penggunaan Slot Replikasi** — Byte di belakang per slot dengan peringatan untuk slot yang mendekati batas retensi
4. **Peristiwa Failover** — Anotasi pada garis waktu dashboard yang menandai setiap perubahan pemimpin Patroni

Siapkan peringatan otomatis di sistem pemantauan Anda untuk kondisi berikut:

- Keterlambatan replikasi melebihi 30 detik untuk standby asinkron
- Slot replikasi tidak aktif selama lebih dari 1 jam
- Jumlah WAL sender yang terhubung turun di bawah jumlah standby yang dikonfigurasi
- Sewa pemimpin Patroni kedaluwarsa (menunjukkan potensi skenario split-brain)

## Kesimpulan

Replikasi dan ketersediaan tinggi PostgreSQL adalah topik mendalam yang memerlukan perencanaan matang, otomatisasi yang kuat, dan validasi berkelanjutan. Mulailah dengan streaming replication untuk HA dan skala baca, lapisi dengan Patroni untuk manajemen failover otomatis, dan tambahkan logical replication untuk kebutuhan distribusi data khusus. Kunci keberhasilan penerapan HA bukan hanya konfigurasi awal tetapi disiplin berkelanjutan dalam memantau, menguji prosedur failover, dan memvalidasi bahwa target RPO dan RTO Anda terpenuhi secara konsisten. Lakukan latihan failover setiap triwulan, arsipkan segmen WAL ke penyimpanan di luar situs, dan selalu miliki rencana pemulihan yang teruji sebelum Anda membutuhkannya.

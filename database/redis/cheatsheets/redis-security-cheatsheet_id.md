---
title: "Redis Security Cheatsheet"
description: "Referensi cepat untuk mengamankan deployment Redis — autentikasi dengan requirepass, ACL Redis 6+, enkripsi TLS, penguatan jaringan, penggantian nama perintah, perlindungan dari perintah berbahaya, dan pemantauan keamanan produksi."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Redis Security Cheatsheet

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Mengatur autentikasi kata sandi | `requirepass <password>` | Wajibkan kata sandi AUTH untuk setiap koneksi (redis.conf) |
| Autentikasi dengan kata sandi | `AUTH <password>` | Autentikasi ke server dengan kata sandi yang dikonfigurasi |
| Autentikasi sebagai pengguna ACL | `AUTH <username> <password>` | Autentikasi sebagai pengguna ACL tertentu (Redis 6+) |
| Menampilkan daftar pengguna ACL | `ACL LIST` | Tampilkan setiap pengguna ACL beserta aturannya |
| Melihat aturan pengguna | `ACL GETUSER <username>` | Tampilkan izin persis dari satu pengguna ACL |
| Membuat atau mengubah pengguna | `ACL SETUSER <username> [rules...]` | Buat atau perbarui pengguna ACL dengan aturan granular |
| Menghapus pengguna | `ACL DELUSER <username>` | Hapus pengguna ACL sepenuhnya |
| Menampilkan kategori perintah | `ACL CAT` | Tampilkan semua kategori perintah untuk aturan ACL |
| Menampilkan pengguna aktif | `ACL WHOAMI` | Kembalikan nama pengguna dari koneksi saat ini |
| Membuat hash kata sandi | `ACL GENPASS [bits]` | Buat kata sandi acak yang kuat untuk aturan `>password` |
| Memuat aturan ACL dari file | `aclfile /etc/redis/users.acl` | Simpan pengguna ACL di file khusus (redis.conf) |
| Mengaktifkan port TLS | `tls-port 6379` | Dengarkan koneksi TLS pada port yang diberikan |
| Mengatur sertifikat TLS | `tls-cert-file /path/redis.crt` | Konfigurasi sertifikat server untuk TLS |
| Mengatur kunci privat TLS | `tls-key-file /path/redis.key` | Konfigurasi kunci privat server untuk TLS |
| Memverifikasi sertifikat klien | `tls-auth-clients yes` | Wajibkan klien menampilkan sertifikat klien yang valid |
| Enkripsi lalu lintas replikasi | `tls-replication yes` | Wajibkan TLS untuk jalur replika dan Sentinel |
| Membatasi antarmuka jaringan | `bind 127.0.0.1` | Ikat Redis ke antarmuka jaringan privat tertentu |
| Memblokir akses eksternal tanpa autentikasi | `protected-mode yes` | Tolak koneksi eksternal saat kata sandi tidak diatur |
| Menonaktifkan perintah | `rename-command FLUSHALL ""` | Hapus perintah berbahaya sepenuhnya |
| Menyamarkan perintah | `rename-command CONFIG "secret-name"` | Ganti nama perintah berbahaya dengan nama yang sulit ditebak |
| Memeriksa status keamanan server | `INFO server` | Tampilkan port TCP, port TLS, dan konfigurasi autentikasi |

## Perintah Umum

### Autentikasi Kata Sandi

```bash
# Aktifkan autentikasi kata sandi di redis.conf
# requirepass S3cur3M@sterP@ssw0rd

# Autentikasi pada koneksi yang sudah ada
AUTH S3cur3M@sterP@ssw0rd
# => OK

# Autentikasi dari CLI tanpa mengekspos kata sandi di riwayat
export REDISCLI_AUTH='S3cur3M@sterP@ssw0rd'
redis-cli PING
# => PONG

# Verifikasi bahwa autentikasi diwajibkan
redis-cli -p 6379 GET secret:key
# => (error) NOAUTH Authentication required.
```

### Manajemen Pengguna ACL

```bash
# Tampilkan semua pengguna (pengguna default selalu ada)
ACL LIST
# => 1) "user default on nopass ~* &* +@all"

# Buat pengguna dengan hak minimal: akses baca hanya untuk key cache
ACL SETUSER app-cache on '>s3cr3tP4ss' '~cache:*' +@read +@string +@hash

# Beri pengguna semua akses kecuali kategori berbahaya
ACL SETUSER dev-team on '>DevP4ssw0rd' '~*' +@all -@dangerous -@admin

# Batasi pengguna ke perintah tertentu dengan pola key
ACL SETUSER analytics on '>An4lyt1csP4ss' '~stats:*' +get +mget +type +ttl

# Hapus perintah dari pengguna setelah dibuat
ACL SETUSER app-cache -keys

# Hapus pengguna
ACL DELUSER old-service

# Uji aturan pengguna tanpa terhubung
ACL DRYRUN app-cache GET cache:home
# => OK
ACL DRYRUN app-cache FLUSHALL
# => (error) NOPERM this user has no permissions to run the 'flushall' command

# Buat kata sandi kuat untuk aturan '>password'
ACL GENPASS 256
# => 5f4dcc3b5aa765d61d8327deb882cf99b959d1d3...

# Simpan ACL di file (redis.conf)
# aclfile /etc/redis/users.acl
# Kemudian kelola pengguna langsung di users.acl dan muat ulang dengan:
redis-cli ACL LOAD
```

### Konfigurasi TLS

```bash
# Konfigurasi TLS minimal di redis.conf
# tls-port 6379
# port 0
# tls-cert-file /etc/redis/tls/redis.crt
# tls-key-file /etc/redis/tls/redis.key
# tls-ca-cert-file /etc/redis/tls/ca.crt
# tls-auth-clients yes
# tls-replication yes

# Buat sertifikat self-signed untuk penggunaan internal (hanya pengujian)
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout /etc/redis/tls/redis.key \
  -out /etc/redis/tls/redis.crt \
  -days 365 -subj "/CN=redis.internal"

# Hubungkan ke Redis dengan TLS dari CLI
redis-cli --tls \
  --cacert /etc/redis/tls/ca.crt \
  -h redis.internal -p 6379 \
  -a 'S3cur3M@sterP@ssw0rd' \
  INFO server

# Periksa konfigurasi TLS saat runtime
redis-cli --tls --cacert /etc/redis/tls/ca.crt -p 6379 CONFIG GET tls-port
```

### Penguatan Keamanan Jaringan

```bash
# Ikat hanya ke antarmuka privat (redis.conf)
# bind 127.0.0.1 10.0.0.5
# protected-mode yes

# Aturan firewall — izinkan hanya server aplikasi
sudo ufw allow from 10.0.0.0/24 to any port 6379 proto tcp
sudo ufw deny 6379/tcp

# Verifikasi port yang sedang mendengarkan
ss -tlnp | grep 6379
# => LISTEN 0 511 127.0.0.1:6379 ...

# Jangan pernah mengekspos Redis ke 0.0.0.0 tanpa TLS dan autentikasi
# (security group cloud harus membatasi port 6379 ke subnet privat)
```

### Mengganti Nama dan Menonaktifkan Perintah

```bash
# Nonaktifkan perintah berbahaya sepenuhnya (redis.conf)
# rename-command FLUSHALL ""
# rename-command FLUSHDB ""
# rename-command DEBUG ""
# rename-command SHUTDOWN ""

# Ganti nama perintah agar hanya operator yang tahu (redis.conf)
# rename-command CONFIG "3f2a9c1e7b8d4e5f"
# rename-command SLAVEOF "a1b2c3d4e5f60718"

# Verifikasi penggantian nama berhasil
redis-cli CONFIG GET maxmemory
# => (error) ERR unknown command 'CONFIG', with args beginning with:
# (gunakan nama samaran sebagai gantinya)
redis-cli 3f2a9c1e7b8d4e5f GET maxmemory
```

### Audit dan Pemantauan

```bash
# Lihat semua pengguna ACL dan status izinnya
ACL LIST

# Hitung percobaan autentikasi yang gagal
redis-cli INFO stats | grep -i auth
# => total_error_replies:0

# Periksa slow log untuk perintah mencurigakan
SLOWLOG GET 20
SLOWLOG RESET

# Periksa klien yang terhubung beserta alamatnya
CLIENT LIST

# Pantau kegagalan autentikasi secara langsung (jendela singkat saja)
redis-cli MONITOR
# => 172.16.0.10:50012 [0] "auth" "wrongpassword"
```

## Potongan Kode

### redis.conf yang Diperkuat

```text
# --- Jaringan ---
bind 127.0.0.1 10.0.0.5
protected-mode yes
port 6379

# --- Autentikasi ---
requirepass S3cur3M@sterP@ssw0rd

# --- Pengguna ACL (Redis 6+) ---
aclfile /etc/redis/users.acl

# --- TLS (Redis 6+) ---
tls-port 6379
port 0
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients yes
tls-replication yes

# --- Penguatan perintah ---
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command DEBUG ""
rename-command CONFIG "3f2a9c1e7b8d4e5f"

# --- Batas sumber daya ---
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Membuat Pengguna ACL dengan Hak Minimal

```bash
# users.acl — satu baris per pengguna
user app-cache on #5f4dcc3b5aa765d61d8327deb882cf99 ~cache:* +@read +@string +@hash
user app-queue on #e10adc3949ba59abbe56e057f20f883e ~queue:* +lpush +rpop +llen +brpop
user admin on #a2d1f2c3e4b5a6978 ~* +@all -@dangerous

# Terapkan file tersebut
redis-cli ACL LOAD

# Konfirmasi
ACL LIST
# => 1) "user app-cache on #5f4dcc3b... ~cache:* +@read +@string +@hash"
# => 2) "user app-queue on #e10adc39... ~queue:* +lpush +rpop +llen +brpop"
# => 3) "user admin on #a2d1f2c3... ~* +@all -@dangerous"
# => 4) "user default on nopass ~* &* +@all"
```

### Node.js (ioredis) dengan TLS dan Pengguna ACL

```javascript
const Redis = require('ioredis');
const fs = require('fs');

const redis = new Redis({
  host: 'redis.internal',
  port: 6379,
  username: 'app-cache',          // pengguna ACL, bukan pengguna default
  password: 's3cr3tP4ss',         // sesuai dengan aturan >password pengguna
  tls: {
    ca: fs.readFileSync('/etc/ssl/certs/redis-ca.crt'),
    cert: fs.readFileSync('/etc/ssl/certs/client.crt'),
    key: fs.readFileSync('/etc/ssl/private/client.key'),
    rejectUnauthorized: true
  },
  retryStrategy: (times) => Math.min(times * 100, 2000)
});

redis.on('error', (err) => console.error('Redis security error:', err.message));

async function demo() {
  await redis.set('cache:home', 'cached-payload', 'EX', 60);
  const value = await redis.get('cache:home');
  console.log(value);
  await redis.quit();
}

demo();
```

### Docker dengan TLS dan Kata Sandi

```bash
# Jalankan dengan konfigurasi diperkuat read-only dan sertifikat TLS
docker run -d \
  --name redis-secure \
  --restart unless-stopped \
  -v /etc/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro \
  -v /etc/redis/tls:/etc/redis/tls:ro \
  -p 127.0.0.1:6379:6379 \
  redis:7-alpine \
  redis-server /usr/local/etc/redis/redis.conf

# Verifikasi dari dalam kontainer
docker exec -it redis-secure redis-cli --tls \
  --cacert /etc/redis/tls/ca.crt \
  -a 'S3cur3M@sterP@ssw0rd' \
  ACL WHOAMI
```

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
      - ./tls:/etc/redis/tls:ro
    ports:
      - "127.0.0.1:6379:6379"
    restart: unless-stopped
```

### Referensi Perintah Berbahaya

```text
| Perintah  | Risiko                                  | Mitigasi                       |
|-----------|-----------------------------------------|--------------------------------|
| FLUSHALL  | Menghapus semua key di semua database   | rename-command FLUSHALL ""     |
| FLUSHDB   | Menghapus semua key di satu database    | rename-command FLUSHDB ""      |
| CONFIG    | Membaca atau menulis konfigurasi runtime| rename-command CONFIG <secret> |
| DEBUG     | Introspeksi server tingkat rendah       | rename-command DEBUG ""        |
| KEYS      | Pemindaian O(n) yang memblokir semua key| Blokir untuk pengguna non-admin|
| MONITOR   | Mengalirkan setiap perintah ke klien    | Blokir untuk pengguna non-admin|
| EVAL      | Mengeksekusi Lua arbitrer di server     | Batasi untuk pengguna tepercaya|
| SLAVEOF   | Mengonfigurasi ulang replikasi langsung | rename-command SLAVEOF ""      |
| SHUTDOWN  | Menghentikan server                     | rename-command SHUTDOWN ""     |
```

### Daftar Periksa Keamanan Produksi

```text
1. Jangan pernah mengekspos Redis ke internet publik — ikat ke antarmuka privat atau VPC.
2. Selalu atur requirepass atau, lebih baik, buat pengguna ACL per aplikasi (Redis 6+).
3. Aktifkan TLS untuk semua lalu lintas yang meninggalkan host tepercaya atau melintasi batas jaringan.
4. Nonaktifkan atau ganti nama perintah berbahaya (FLUSHALL, DEBUG, CONFIG, KEYS, MONITOR).
5. Pertahankan protected-mode yes dan tambahkan aturan firewall eksplisit di host dan cloud.
6. Jalankan Redis sebagai pengguna non-root dengan izin filesystem minimal.
7. Utamakan kategori ACL (-@dangerous, -@admin) daripada memblokir perintah satu per satu.
8. Simpan kredensial di secrets manager, rotasi secara berkala, dan jangan pernah commit ke kode.
9. Pantau kegagalan AUTH, slow log, status replika, dan koneksi klien yang tidak terduga.
10. Kunci versi image Redis di Docker dan pindai image untuk CVE yang diketahui.
```

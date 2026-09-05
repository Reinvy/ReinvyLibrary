---
title: "Panduan Penyimpanan dan Volume Docker"
description: "Panduan komprehensif untuk mengelola data persisten di Docker — mencakup volume bernama, bind mount, tmpfs, storage driver, siklus hidup volume, strategi backup dan pemulihan, serta pola produksi untuk workload stateful."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Penyimpanan dan Volume Docker

## Pendahuluan

Kontainer bersifat sementara (ephemeral) oleh desainnya. Setiap byte yang ditulis ke lapisan writable kontainer ikut hidup dan mati bersama kontainer: `docker rm` menghapus kontainer, dan data ikut lenyap — tidak ada keranjang sampah, tidak ada undo. Perilaku ini benar untuk workload stateless, tetapi aplikasi produksi jarang sepenuhnya stateless. Basis data, antrean pesan, unggahan file, cache, dan antrean pekerjaan semuanya membutuhkan data yang tetap bertahan melewati restart, redeploy, dan pemeliharaan host.

Docker menyediakan tiga mekanisme penyimpanan, yang ditopang oleh lapisan storage driver di bawahnya:

- **Volume** — mekanisme yang paling direkomendasikan. Docker mengelola direktori di bawah `/var/lib/docker/volumes/`, dan volume sepenuhnya portabel, mudah di-backup, serta dapat dibagikan antar kontainer.
- **Bind mount** — direktori host mana pun yang dipasang ke dalam kontainer. Sederhana dan familier, tetapi bergantung pada host, kurang portabel, dan membutuhkan pengelolaan izin manual.
- **Mount tmpfs** — filesystem di dalam memori untuk data sensitif atau sementara yang tidak boleh menyentuh disk.

Panduan ini membahas cara memilih di antara mekanisme tersebut, mengelola siklus hidupnya, melakukan backup dan pemulihan, serta menjalankan workload stateful di produksi tanpa kehilangan data. Setiap bagian memadukan praktik terbaik dengan perintah konkret dan konfigurasi Compose yang bisa langsung Anda terapkan.

## Praktik Terbaik

### Utamakan Volume Bernama daripada Bind Mount

Volume bernama adalah satu-satunya opsi penyimpanan yang sepenuhnya dikelola Docker, sehingga menjadi default paling aman untuk data aplikasi yang persisten.

- **Docker yang mengurus path dan izin**: volume berada di bawah `/var/lib/docker/volumes/`, jadi Anda tidak pernah bergantung pada keberadaan path host tertentu.
- **Portabel antar host**: `docker run` dan konfigurasi Compose mereferensikan volume berdasarkan nama, bukan path yang spesifik per mesin, sehingga resep yang sama berfungsi di laptop, runner CI, dan server produksi.
- **Ramah backup**: karena semua data volume berada di satu tempat, backup, pemulihan, dan migrasi menjadi operasi salin sederhana (lihat Langkah Implementasi 6 dan 7).
- **Bind mount tetap alat yang tepat untuk pengembangan**: saat Anda membutuhkan reload kode secara langsung, memasang direktori proyek ke dalam kontainer adalah hal yang tepat. Pertahankan bind mount untuk pengembangan, file konfigurasi, dan perkakas lama — bukan untuk data aplikasi di produksi.

### Pertahankan Lapisan Writable agar Stateless

Lapisan writable kontainer adalah overlay copy-on-write yang menumpuk data saat kontainer berjalan. Mengandalkannya untuk state yang tahan lama memunculkan tiga masalah sekaligus.

- **Kehilangan data saat kontainer dihapus**: `docker rm` (atau `docker compose down` tanpa volume) menghancurkan semua yang ditulis kontainer.
- **Image membengkak saat di-commit**: jika Anda menjalankan `docker commit` pada kontainer yang sedang berjalan, semua tulisan runtime ikut dibekukan ke lapisan image baru, memperbesar ukuran image dan membocorkan rahasia yang terakumulasi saat runtime.
- **Performa buruk di bawah tulis berat**: setiap tulis ke overlay memicu pembukuan copy-on-write. Mengarahkan path dengan tulis tinggi ke volume atau tmpfs menghindari overhead tersebut.

Model mental yang berguna: lapisan writable untuk file runtime sementara (log sebelum dikirim, file PID, soket); volume untuk apa pun yang akan Anda cari jika hilang.

### Gunakan tmpfs untuk Rahasia dan Data Sementara

Mount tmpfs sepenuhnya berada di RAM dan terhapus saat kontainer berhenti. Gunakan untuk data yang tidak boleh dipersistensikan.

- **Rahasia runtime di pengembangan**: nilai konfigurasi seperti kata sandi basis data atau API key yang diteruskan lewat environment atau file yang di-mount dapat ditaruh di tmpfs agar tidak pernah menyentuh disk.
- **Cache dan ruang kerja sementara**: cache build, token sesi, dan file sementara diuntungkan oleh kecepatan RAM dan pembersihan yang terjamin.
- **Pahami komprominya**: tmpfs mengonsumsi memori kontainer, dihitung terhadap limit memori kontainer, dan tidak menawarkan durabilitas sama sekali — reboot host atau OOM kill menghapus semuanya. Jangan pernah menyimpan satu-satunya salinan data penting di sana.

### Kelola Izin (Permissions) secara Eksplisit

Ketidakcocokan izin adalah penyebab paling umum bug "berfungsi di mesin saya, gagal di produksi" — terutama dengan bind mount dan volume plugin.

- **Tetapkan kepemilikan di tingkat kontainer**: jalankan dengan `--user "$(id -u):$(id -g)"` atau tetapkan user yang cocok di Dockerfile agar proses dapat menulis ke direktori yang di-mount.
- **Perhatikan perilaku penyalinan awal**: ketika volume bernama dipasang di atas direktori yang sudah berisi file di dalam image, Docker menyalin file tersebut ke volume pada penggunaan pertama — tetapi hanya jika volume masih kosong. Bind mount tidak pernah melakukan penyalinan ini. Perbedaan halus ini menjelaskan banyak kejutan "file hilang" saat berpindah di antara keduanya.
- **Perbaiki kepemilikan dari entrypoint**: jika volume tiba dengan file milik root (umum terjadi dengan NFS atau hasil restore backup), jalankan langkah `chown` kecil saat kontainer mulai, alih-alih berkelahi dengan izin di dalam build image.
- **Pertimbangkan user namespace remapping**: mengaktifkan `userns-remap` di daemon Docker memetakan root di dalam kontainer ke user host yang tidak memiliki hak istimewa, mengurangi radius ledakan jika root di dalam kontainer disusupi. Verifikasi bahwa mount volume Anda mentoleransi UID yang dipetakan ulang sebelum mengaktifkannya di produksi.

### Kelola Siklus Hidup Volume secara Sadar

Volume adalah objek independen dengan siklus hidupnya sendiri. Menganggap umurnya sama dengan umur kontainer adalah tempat kehilangan data terjadi.

- **`docker rm` tidak menghapus volume**: volume bernama dari kontainer yang berhenti tetap bertahan secara desain, itulah sebabnya `docker rm -v` (yang menghapus volume anonim) adalah pisau tajam — baca dua kali sebelum menjalankannya.
- **Bersihkan volume yatim secara terjadwal**: volume anonim dan volume yang tertinggal akibat deploy gagal menumpuk diam-diam. Gunakan `docker volume ls -f dangling=true` untuk menemukannya, lalu `docker volume prune` setelah memastikan tidak ada yang membutuhkannya.
- **Jangan pernah menjalankan `-a` secara sembrono**: `docker volume prune -a` menghapus setiap volume yang tidak direferensikan kontainer yang berjalan, termasuk volume yang kontainernya hanya sedang berhenti. Selalu konfirmasi daftarnya terlebih dahulu.
- **Utamakan nama yang eksplisit**: volume anonim (`-v /data` tanpa nama) sulit dianalisis dan mudah menjadi yatim. Beri nama pada setiap volume yang ingin Anda pertahankan.

### Lakukan Backup dan Uji Pemulihan

Backup yang belum pernah Anda pulihkan hanyalah harapan, bukan rencana. Backup volume adalah snapshot direktori, sehingga prosesnya lurus — dan mudah diotomatisasi.

- **Lakukan backup di tingkat aplikasi bila memungkinkan**: untuk basis data, utamakan alat dump native (`pg_dump`, `mongodump`, `redis-cli --rdb`) karena menghasilkan snapshot yang konsisten dan sadar-aplikasi. Salinan tingkat file adalah cadangan untuk semua hal lain.
- **Buat snapshot secara konsisten**: untuk data berbasis file, utamakan menghentikan sementara (quiesce) aplikasi atau menggunakan snapshot filesystem untuk menghindari menyalin state yang setengah tertulis; `tar` sederhana pada volume yang sedang aktif dapat menangkap tulis yang robek (torn writes).
- **Uji pemulihan secara rutin**: pulihkan ke kontainer uji secara terjadwal dan verifikasi aplikasi menyala serta membaca data. Prosedur pemulihan yang tidak pernah diuji adalah penyebab utama kegagalan disaster recovery.
- **Simpan backup di luar host Docker**: menyimpan tarball backup di volume yang sama, filesystem yang sama, atau mesin yang sama sama sekali tidak melindungi apa pun. Dorong ke object storage, host lain, atau share NFS yang terpasang.

### Awasi Kapasitas dan Biaya Penyimpanan

Volume tidak terlihat sampai memenuhi disk, dan pada saat itu setiap kontainer di host mulai berperilaku buruk.

- **Pantau secara proaktif**: `docker system df` menampilkan total penggunaan image, kontainer, volume, dan cache dalam satu pandangan; `docker system df -v` merinci penggunaan per volume.
- **Tetapkan kebijakan retensi dan rotasi**: log, cache, dan data sementara harus memiliki kebijakan retensi eksplisit — baik di dalam aplikasi maupun di tingkat volume.
- **Gunakan `--log-opt max-size` dan `max-file`** untuk membatasi pertumbuhan log kontainer, konsumen disk tersembunyi yang paling umum di host Docker.
- **Perhitungkan pembengkakan copy-on-write**: alat backup yang menyalin isi volume ke volume atau bind mount lain untuk sementara menggandakan penggunaan disk. Rencanakan ruang cadangan yang memadai.

### Sesuaikan Storage Driver dengan Beban Kerja

Storage driver menentukan bagaimana image dan lapisan writable direpresentasikan di disk. Sebagian besar deployment tidak pernah perlu mengubahnya, tetapi memahami komprominya mencegah kesalahan arsitektur.

- **overlay2 adalah default dan pilihan yang tepat untuk sebagian besar workload**: menawarkan performa bagus, mendukung copy-on-write secara efisien, dan merupakan driver paling teruji di kernel modern.
- **Volume plugin khusus untuk kebutuhan khusus**: driver `local` bawaan menangani direktori lokal dan NFS; plugin pihak ketiga menambahkan block storage cloud, filesystem terdistribusi, dan replikasi. Pilih driver yang sesuai dengan kebutuhan durabilitas Anda, bukan yang paling mudah.
- **Uji asumsi performa**: workload I/O tinggi (basis data, message broker) diuntungkan oleh benchmarking nyata di infrastruktur target — driver, filesystem, dan tipe volume saling berinteraksi dengan kernel dengan cara yang sulit diprediksi tanpa pengukuran.

## Langkah Implementasi

### Langkah 1: Petakan Setiap Beban Kerja ke Jenis Penyimpanan

Sebelum menulis konfigurasi apa pun, klasifikasikan setiap jalur data di aplikasi Anda. Tabel keputusan di bawah ini adalah titik awal yang andal:

```text
| Jenis data                    | Jenis penyimpanan   | Catatan                                   |
|-------------------------------|---------------------|-------------------------------------------|
| File basis data (Postgres,    | Volume bernama      | Dump tingkat aplikasi untuk backup        |
| MySQL, MongoDB)               |                     |                                           |
| File unggahan / media         | Volume bernama      | Object storage adalah rumah jangka panjang|
|                               |                     | yang lebih baik                           |
| Data message broker (Redis,   | Volume bernama      | RDB/AOF atau setara untuk snapshot yang   |
| RabbitMQ)                     |                     | konsisten                                 |
| Kode sumber saat pengembangan | Bind mount          | Memungkinkan hot-reload                   |
| File konfigurasi / kredensial | Bind mount (ro)     | Atau mount rahasia dengan tmpfs           |
| Cache build, file sementara   | tmpfs               | Cepat, terhapus saat berhenti             |
| Log sebelum dikirim           | tmpfs atau stdout   | Utamakan stdout terstruktur + log driver  |
```

Mulailah dengan mendaftar path yang dapat ditulis di Dockerfile dan konfigurasi kontainer Anda, lalu tetapkan setiap path ke satu baris dari tabel ini. Apa pun yang tidak ditetapkan mekanisme penyimpanan secara implisit memakai lapisan writable — yang, sesuai Praktik Terbaik di atas, seharusnya hanya menampung data sementara.

### Langkah 2: Buat dan Pasang Volume Bernama

Buat volume di awal ketika Anda menginginkan kontrol eksplisit atas konfigurasinya:

```bash
docker volume create app-data
docker volume inspect app-data
```

Pasang dengan sintaks `-v` klasik atau sintaks `--mount` yang lebih eksplisit — keduanya setara, tetapi `--mount` membuat sumber dan target tidak ambigu:

```bash
# Singkatan -v
docker run -d --name postgres \
  -v app-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Bentuk verbose --mount
docker run -d --name postgres \
  --mount type=volume,source=app-data,target=/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16
```

Volume bernama dapat dibagikan antar kontainer secara bersamaan — berguna untuk penulis plus kontainer sidecar backup atau analitik:

```bash
docker run --rm -v app-data:/data alpine ls -la /data
```

### Langkah 3: Gunakan Bind Mount untuk Pengembangan dan Konfigurasi

Bind mount memetakan path host absolut ke dalam kontainer. Ideal untuk hot-reloading pengembangan dan untuk menyuntikkan konfigurasi yang harus berada di host:

```bash
# Pengembangan: reload kode langsung
docker run -d -p 3000:3000 \
  -v "$(pwd)":/app \
  -w /app \
  node:20 npm run dev

# Injeksi konfigurasi read-only
docker run -d --name nginx \
  -v /etc/nginx/conf.d:/etc/nginx/conf.d:ro \
  nginx:1.27
```

Dua penyempurnaan penting dalam praktik:

- **Mount read-only**: tambahkan `:ro` untuk apa pun yang tidak boleh dimodifikasi kontainer — direktori konfigurasi dan rahasia adalah kandidat umum.
- **Konteks SELinux**: di host dengan SELinux aktif, bind mount mungkin memerlukan label `:z` (berbagi) atau `:Z` (pribadi); tanpa label tersebut kontainer bisa melihat direktori kosong atau ditolak izinnya.

Ingat asimetri penyalinan awal dari Praktik Terbaik: bind mount tidak pernah menyalin konten image ke direktori yang di-mount. Jika image mengharapkan file di titik mount, Anda harus menyediakannya sendiri di host.

### Langkah 4: Pasang tmpfs untuk Data Sementara

Mount tmpfs berbasis memori dan hilang saat kontainer berhenti. Buat dengan batas ukuran dan opsi yang diperketat:

```bash
docker run -d --name cache \
  --tmpfs /scratch:size=64m,noexec,nosuid \
  nginx:1.27
```

Bentuk `--mount` memberikan kontrol yang sama dengan sintaks yang lebih jelas:

```bash
docker run -d --name cache \
  --mount type=tmpfs,target=/scratch,tmpfs-size=64m,tmpfs-mode=1700 \
  nginx:1.27
```

Gunakan pola ini untuk cache build, state sesi, dan kredensial yang tidak boleh dipersistensikan. Verifikasi mount dengan `docker inspect`:

```bash
docker inspect cache --format '{{ json .Mounts }}'
```

### Langkah 5: Definisikan Penyimpanan di Docker Compose

Compose adalah tempat konfigurasi volume menunjukkan nilainya — seluruh tata letak penyimpanan menjadi deklaratif dan terversi-kontrol. Volume bernama dideklarasikan di tingkat atas dan direferensikan per layanan:

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/initdb:/docker-entrypoint-initdb.d:ro
    environment:
      POSTGRES_PASSWORD: secret

  app:
    build: .
    volumes:
      - ./src:/app/src
      - app-uploads:/app/uploads
    tmpfs:
      - /tmp:size=128m

volumes:
  pgdata:
  app-uploads:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=10.0.0.5,rw,nfsvers=4"
      device: ":/srv/docker-uploads"
```

Perilaku penting yang perlu dipahami:

- **Volume bernama bertahan melewati `docker compose down`**: hanya `docker compose down -v` yang menghapusnya, dan flag itu menghapus *semua* volume yang dideklarasikan — termasuk data basis data Anda.
- **`external: true`** mereferensikan volume yang dibuat di luar Compose (misalnya, volume yang dibagikan antar proyek): deklarasikan sebagai `volumes: { shared-data: { external: true } }` dan Compose akan mensyaratkan volume itu sudah ada.
- **`tmpfs` per layanan** memetakan langsung ke mount tmpfs dari Langkah 4, dengan ukuran dinyatakan dalam byte (contoh di atas memakai 128m = 134217728 byte).

### Langkah 6: Backup dan Pulihkan Volume

Backup tingkat file dari volume bernama adalah pipeline tar dengan kontainer pembantu. Backup `pgdata` ke direktori saat ini:

```bash
docker run --rm \
  -v pgdata:/source \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/pgdata-$(date +%F).tar.gz -C /source .
```

Pulihkan ke volume baru (volume target harus sudah ada dan sebaiknya kosong):

```bash
docker volume create pgdata-restored
docker run --rm \
  -v pgdata-restored:/target \
  -v "$(pwd)":/backup \
  alpine tar xzf /backup/pgdata-2026-08-30.tar.gz -C /target
```

Lalu arahkan kontainer ke volume yang dipulihkan dan verifikasi aplikasi berfungsi:

```bash
docker run -d --name postgres-restored \
  -v pgdata-restored:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16
```

Untuk basis data, utamakan dump native daripada tar file — `pg_dump`, `mongodump`, dan `redis-cli --rdb` menghasilkan snapshot yang konsisten dan bertahan melewati upgrade versi. Urutkan kedua pendekatan: tar tingkat file untuk pemulihan cepat dari state yang persis, dump native untuk backup logis yang toleran terhadap versi.

### Langkah 7: Migrasi Data Antar Host

Memindahkan volume ke mesin lain adalah salin-plus-pulihkan, tetapi beberapa teknik membuatnya lebih mulus:

- **Salin volume-ke-volume langsung** di host yang sama:

  ```bash
  docker run --rm \
    -v pgdata:/from \
    -v pgdata-copy:/to \
    alpine sh -c "cd /from && cp -a . /to"
  ```

- **Alirkan lintas host tanpa tarball perantara** — pipa output tar melalui SSH:

  ```bash
  docker run --rm -v pgdata:/source \
    alpine tar czf - -C /source . \
    | ssh deploy@db-host "docker run --rm -i -v pgdata:/target alpine tar xzf - -C /target"
  ```

- **Volume berbasis NFS**: jika kedua host memasang NFS export yang sama, `docker volume create --driver local --opt type=nfs --opt o=addr=10.0.0.5,rw --opt device=:/srv/pgdata shared-pgdata` membuat volume terlihat dari host mana pun yang memiliki akses — tanpa perlu menyalin, dengan mengorbankan latensi jaringan dan domain kegagalan bersama.

Apapun jalur yang dipilih, verifikasi kepemilikan dan integritas di tujuan sebelum mengalihkan trafik — izin (Praktik Terbaik bagian izin) biasanya menjadi korban utama migrasi lintas host.

### Langkah 8: Pantau dan Bersihkan Penyimpanan

Bangun rutinitas visibilitas penyimpanan sebelum tekanan disk menjadi insiden:

```bash
# Ringkasan penggunaan dalam satu baris
docker system df

# Rincian per volume
docker system df -v

# Temukan volume menggantung (tidak direferensikan kontainer mana pun)
docker volume ls -f dangling=true
```

Bersihkan secara hati-hati — hanya hapus yang aman:

```bash
# Hapus hanya volume menggantung
docker volume prune

# Hapus kontainer, jaringan, dan image menggantung juga
docker system prune

# JANGAN PERNAH menjalankan ini tanpa membaca daftarnya dulu — perintah ini
# menghapus setiap volume yang tidak terpasang ke kontainer yang berjalan
docker system prune -a --volumes
```

Gabungkan dengan batas rotasi log (`--log-opt max-size=10m --log-opt max-file=3`) dan kebijakan retensi tingkat aplikasi, lalu jadwalkan pemeriksaan kapasitas (`df -h /var/lib/docker`) di stack monitoring Anda. Penyimpanan itu terbatas; disiplin pruning, retensi, dan alerting adalah yang menjaga host Docker tetap sehat selama berbulan-bulan pergantian kontainer.

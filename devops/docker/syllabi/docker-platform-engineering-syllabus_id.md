---
title: "Silabus Platform Engineering Docker"
description: "Kurikulum tujuh modul yang membawa engineer dari dasar Docker hingga mengoperasikan platform container yang aman dan terobservasi: image, jaringan, penyimpanan, Compose, keamanan, registry, dan operasi produksi."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Platform Engineering Docker

## Ringkasan

Silabus ini adalah kursus tujuh modul untuk developer dan platform engineer yang sudah menguasai perintah `docker run` dasar dan perlu memiliki Docker sebagai infrastruktur bersama, bukan sekadar alat bantu lokal. Kurikulum disusun mengikuti tujuh keputusan yang harus diambil setiap platform container: bagaimana image dibangun, bagaimana container saling berkomunikasi, di mana state disimpan, bagaimana sistem multi-service dideskripsikan, bagaimana beban kerja dibatasi, bagaimana artefak didistribusikan, dan bagaimana semuanya dioperasikan setelah rilis. Setiap modul berdurasi satu minggu, diakhiri lab yang wajib berjalan di infrastruktur nyata, dan membangun satu bagian dari platform referensi yang sama untuk proyek akhir.

Urutannya disengaja. Image diletakkan pertama karena semua modul berikutnya mengasumsikan kontrak build yang reprodusibel; registry diletakkan hampir di akhir karena registry privat baru sepadan dengan biaya operasionalnya setelah aturan tagging dan immutability disepakati di modul satu. Keamanan ditempatkan setelah Compose agar pengerasan diterapkan pada stack multi-service yang realistis, bukan pada satu container contoh.

## Kurikulum

### Modul 1: Image dan Kontrak Build

- **Dockerfile sebagai Antarmuka**
  - Multi-stage build serta pemisahan dependensi build-time dan runtime
  - `COPY --from`, `--chown`, dan memisahkan perkakas build dari image runtime
  - Aturan urutan layer: manifest dependensi sebelum source, source sebelum build
- **Build yang Reprodusibel**
  - Digest base image yang dipin dibanding tag yang mengambang
  - Build argument, batasan `--build-arg`, dan larangan membocorkan secret ke layer
  - `.dockerignore` dan ukuran build context
- **Higiene Image**
  - Trade-off base image distroless, Alpine, dan slim
  - Mengurangi jumlah layer tanpa menggabungkan urusan yang tidak berkaitan
- **Lab**: Mengubah Dockerfile single-stage menjadi multi-stage di bawah 150 MB dengan digest yang dipin.

### Modul 2: Jaringan Container

- **Jalur Default**
  - Network bridge default dan alasan tidak layak dipakai untuk lebih dari satu container
  - Bridge network buatan pengguna dan resolusi DNS bawaan berdasarkan nama service
  - Publikasi port: bind ke host, ekspos hanya ke loopback, dan proxy Docker
- **Isolasi dan Keterjangkauan**
  - Menempelkan dan melepas container yang sedang berjalan dengan `docker network connect`
  - Beberapa network pada satu container sebagai alat segmentasi
  - Masalah head-of-line akibat berbagi satu network datar
- **Diagnostik**
  - `docker network inspect`, `nsenter`, dan container netshoot sementara
  - Membaca `/etc/resolv.conf` dan memastikan alias DNS
- **Lab**: Membangun topologi tiga lapis di mana database hanya dapat dijangkau dari network aplikasi.

### Modul 3: Penyimpanan dan State

- **Memilih Jenis Mount**
  - Named volume, bind mount, dan `tmpfs`
  - Mengapa bind mount adalah alat development dan volume adalah alat produksi
  - Kepemilikan file, pemetaan UID, dan kegagalan izin pada user non-root
- **Pola Persistensi**
  - Siklus hidup volume, `docker volume prune`, dan kehilangan data tanpa sengaja
  - Mencadangkan dan memulihkan volume database secara konsisten
  - Container stateful dibanding tier aplikasi stateless
- **Lab**: Mencadangkan dan memulihkan volume Postgres saat container berjalan, lalu memverifikasi jumlah baris.

### Modul 4: Compose sebagai Kontrak Platform

- **Mendeskripsikan Sistem**
  - Service, network, volume, dan graf dependensi
  - `depends_on` dengan kondisi health, bukan loop `sleep`
  - File environment, `env_file`, dan interpolasi variabel
- **Override per Lingkungan**
  - Pola file dasar ditambah `docker-compose.override.yml`
  - Profil Compose untuk service opsional dan tugas sekali jalan
  - `docker compose config` sebagai sumber kebenaran sebelum deployment
- **Compose untuk Operasi**
  - Health check, restart policy, dan shutdown yang rapi melalui `stop_grace_period`
  - Logging driver dan rotasi log di level service
- **Lab**: Memodelkan stack empat service yang start bersih dari nol dan bertahan saat database restart.

### Modul 5: Pengerasan Keamanan

- **Identitas dan Privilege**
  - User non-root, direktif `USER`, dan root filesystem read-only
  - Membuang capability lalu menambahkan kembali seminimal mungkin
  - `no-new-privileges` dan alasan `--privileged` sama dengan kompromi host
- **Pembatasan**
  - Profil seccomp: mulai dari default, kurangi, jangan mengarang dari nol
  - Label AppArmor dan SELinux pada host
  - Batas resource: memori, CPU, dan plafon PID sebagai pertahanan denial-of-service
- **Secret dan Supply Chain**
  - Secret sebagai file yang di-mount, bukan environment variable
  - Pemindaian image di CI, pembuatan SBOM, dan verifikasi tanda tangan
- **Lab**: Mengeraskan stack modul empat hingga lolos checklist keamanan yang diotomatiskan.

### Modul 6: Registry dan Distribusi

- **Dasar Registry**
  - API registry, manifest, dan layer berbasis content-addressable
  - Strategi tagging, tag immutable, dan pinning digest saat deployment
  - Menjalankan registry privat dengan TLS dan autentikasi
- **Manajemen Siklus Hidup**
  - Kebijakan retensi, garbage collection, dan penghematan disk
  - Mirroring dan pull-through cache untuk CI serta lingkungan edge
  - Image multi-arsitektur dan indeks image OCI
- **Lab**: Menjalankan registry privat di belakang TLS, mendorong image, dan menjalankan garbage collection dengan penghematan disk yang terukur.

### Modul 7: Operasi dan Keandalan

- **Observabilitas**
  - Logging terstruktur dengan driver `json-file` dan `local`
  - Metrik melalui cAdvisor atau endpoint metrik daemon Docker
  - Health check yang memicu alert, bukan inspeksi manual
- **Operasi Siklus Hidup**
  - Penggantian container bergulir di belakang reverse proxy
  - Latihan backup, restore, dan disaster recovery untuk volume serta konfigurasi
  - Upgrade daemon, pengelolaan `daemon.json`, dan rencana rollback
- **Respons Insiden**
  - Urutan triase: state, exit code, log, resource, jaringan
  - Perencanaan kapasitas dengan `docker system df` dan monitoring host
- **Lab**: Menulis runbook dan mengeksekusi upgrade tanpa request yang gagal.

## Proyek Akhir

Peserta membangun dan mengoperasikan platform internal lengkap untuk estate aplikasi kecil: frontend web, API, worker latar belakang, dan Postgres.

Luaran yang wajib dikumpulkan:

- Repositori image multi-stage dengan digest terpin, dibangun di CI lengkap dengan pemindaian dan keluaran SBOM
- Stack berbasis Compose dengan startup bergerbang health check, network terisolasi, dan named volume
- Konfigurasi runtime yang diperkeras: user non-root, root read-only, capability dibuang, dan batas resource
- Registry privat dengan TLS, autentikasi, retensi, dan garbage collection
- Paket operasi: dashboard atau query metrik, prosedur backup dan restore, serta runbook upgrade
- Dokumen desain singkat yang menjelaskan alasan setiap pilihan, termasuk apa yang dikorbankan

Proyek dinilai berdasarkan apakah engineer lain dapat mengoperasikan platform ini hanya bermodal dokumentasi.

## Kriteria Penilaian

- **Lab Mingguan (35%)**: Setiap lab harus berjalan menyeluruh di host bersih; tidak ada nilai parsial untuk perintah yang hanya bekerja setelah perbaikan manual yang tidak terdokumentasi.
- **Kuis Modul (15%)**: Kuis singkat tentang mekanisme, bukan hafalan — misalnya menjelaskan mengapa named volume bertahan setelah `docker rm` sementara anonymous volume tidak.
- **Checklist Keamanan (20%)**: Pengerasan modul lima yang diterapkan pada stack akhir, dinilai dengan checklist terotomatisasi yang mencakup identitas, capability, pembatasan, batas resource, dan penanganan secret.
- **Proyek Akhir (30%)**: Dinilai dari reprodusibilitas, kemudahan operasi, kualitas dokumen desain, dan apakah runbook benar-benar berhasil saat dijalankan orang lain.
- **Bonus (maksimal 5%)**: Otomatisasi yang menghapus langkah manual dari platform — gate validasi compose di CI, skrip latihan restore, atau perkakas retensi registry.

## Referensi

- [Dokumentasi Docker](https://docs.docker.com/)
- [Referensi Dockerfile](https://docs.docker.com/engine/reference/builder/)
- [Spesifikasi Compose](https://compose-spec.io/)
- [Dokumentasi Keamanan Docker](https://docs.docker.com/engine/security/)
- [Spesifikasi Distribution (Registry)](https://github.com/distribution/distribution)
- [Spesifikasi Image dan Runtime OCI](https://opencontainers.org/)
- [Praktik Terbaik Penulisan Dockerfile](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

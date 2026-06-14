---
title: "Silabus Penguasaan Kontainerisasi Docker"
description: "Kurikulum kursus 12 minggu yang komprehensif mencakup fundamental Docker, orkestrasi kontainer, Docker Compose, keamanan, dan strategi deployment produksi."
category: "devops"
technology: "docker"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Penguasaan Kontainerisasi Docker

## Ringkasan

Silabus ini menyediakan kurikulum terstruktur selama 12 minggu untuk menguasai kontainerisasi Docker. Dimulai dari konsep dasar kontainer dan berkembang hingga deployment tingkat produksi, kursus ini membekali peserta didik dengan keterampilan praktis dalam membangun, mengirimkan, dan menjalankan aplikasi terdistribusi menggunakan Docker. Kurikulum ini menyeimbangkan pemahaman konseptual dengan laboratorium praktik langsung, yang berpuncak pada proyek kapstone di mana peserta didik mengkontainerisasi aplikasi mikroservis lengkap.

## Kurikulum

### Minggu 1: Pengenalan Kontainerisasi
- **Memahami Kontainer vs. Mesin Virtual**
  - Konteks historis dan evolusi virtualisasi
  - Bagaimana kontainer berbagi kernel OS host
  - Isolasi sumber daya dengan cgroups dan namespaces
- **Ekosistem Docker**
  - Docker Engine, Docker CLI, dan Docker Desktop
  - Docker Hub dan registry citra
  - Gambaran umum Docker Compose dan Docker Swarm

### Minggu 2: Citra Docker
- **Fundamental Citra**
  - Lapisan dan union filesystem (OverlayFS)
  - Lapisan read-only dan copy-on-write
  - ID citra, tag, dan digest
- **Membangun Citra dengan Dockerfile**
  - `FROM`, `RUN`, `COPY`, `ADD`, `CMD`, `ENTRYPOINT`
  - Strategi optimasi caching lapisan
  - Build multi-tahap untuk citra yang lebih kecil
- **Lab**: Bangun citra Node.js yang dioptimalkan untuk produksi

### Minggu 3: Kontainer Docker
- **Siklus Hidup Kontainer**
  - `docker create`, `docker start`, `docker stop`, `docker rm`
  - Mode terlepas (detached) vs. latar depan (foreground)
  - Kebijakan restart kontainer
- **Batasan Sumber Daya**
  - Batasan CPU dan memori (`--cpus`, `--memory`)
  - Pembatasan I/O disk
- **Logging dan Debugging**
  - `docker logs`, `docker exec`, `docker inspect`
  - Debugging kontainer yang mengalami crash
- **Lab**: Jalankan dan debug kontainer yang salah konfigurasi

### Minggu 4: Jaringan
- **Driver Jaringan Docker**
  - Bridge, host, overlay, macvlan, none
  - Bridge default vs. bridge yang ditentukan pengguna
- **Komunikasi Kontainer**
  - Pemetaan port (`-p` dan `-P`)
  - Resolusi DNS dan penemuan layanan
  - Komunikasi antar kontainer
- **Keamanan Jaringan**
  - Mengisolasi kontainer dengan jaringan kustom
  - Kebijakan jaringan dan aturan firewall
- **Lab**: Siapkan aplikasi web multi-kontainer dengan jaringan bridge kustom

### Minggu 5: Volume dan Persistensi Data
- **Opsi Penyimpanan**
  - Bind mount vs. volume vs. tmpfs
  - Volume bernama dan driver volume
- **Mengelola Data**
  - Berbagi data antar kontainer
  - Pola persistensi basis data
  - Strategi backup dan restore
- **Lab**: Deploy PostgreSQL dengan penyimpanan persisten

### Minggu 6: Docker Compose
- **Struktur File Compose**
  - Definisi layanan, jaringan, dan volume
  - Variabel lingkungan dan file `.env`
  - Manajemen dependensi dengan `depends_on`
- **Aplikasi Multi-Kontainer**
  - Mendefinisikan layanan yang saling terhubung
  - Pemeriksaan kesehatan dan urutan startup
  - Penskalaan layanan dengan `--scale`
- **Lab**: Kontainerisasi aplikasi full-stack (React + Express + PostgreSQL)

### Minggu 7: Docker Swarm dan Orkestrasi
- **Fundamental Mode Swarm**
  - Node manager dan worker
  - Layanan, tasks, dan replika
  - Routing Mesh dan jaringan ingress
- **Men-deploy Stack**
  - File Compose dalam mode swarm
  - Pembaruan bergulir (rolling updates) dan rollback
  - Manajemen rahasia (secrets) di swarm
- **Lab**: Deploy klaster swarm 3-node dengan layanan tereplikasi

### Minggu 8: Praktik Terbaik Keamanan
- **Keamanan Citra**
  - Memindai citra untuk kerentanan (`docker scan`)
  - Menggunakan citra dasar minimal (Alpine, distroless)
  - Menandatangani citra dengan Docker Content Trust
- **Keamanan Runtime**
  - Menjalankan kontainer dengan pengguna non-root
  - Sistem file root read-only
  - Penurunan kapabilitas dan profil seccomp
- **Lab**: Perkuat kontainer produksi dengan praktik keamanan terbaik

### Minggu 9: CI/CD dengan Docker
- **Docker dalam Pipeline CI**
  - Membangun citra di GitHub Actions dan GitLab CI
  - Caching lapisan antar proses CI
  - Pengujian otomatis citra Docker
- **Manajemen Registry Citra**
  - Mendorong ke Docker Hub dan registry privat
  - Strategi penandaan untuk rilis
  - Kebijakan retensi dan pembersihan citra
- **Lab**: Siapkan pipeline CI/CD lengkap menggunakan GitHub Actions dan Docker

### Minggu 10: Monitoring dan Logging
- **Monitoring Kontainer**
  - `docker stats` dan metrik sumber daya
  - Integrasi Prometheus dan cAdvisor
  - Menyiapkan dasbor Grafana
- **Logging Terpusat**
  - Driver logging Docker (json-file, syslog, fluentd)
  - Agregasi log dengan ELK stack
  - Praktik terbaik logging terstruktur
- **Lab**: Deploy stack monitoring untuk kontainer Docker

### Minggu 11: Deployment Produksi
- **Docker di Produksi**
  - Menjalankan Docker di VM cloud (AWS EC2, GCP Compute Engine)
  - Docker dengan manajer proses (systemd)
  - Backup dan disaster recovery
- **Alternatif Orkestrasi Kontainer**
  - Kubernetes vs. Docker Swarm
  - Amazon ECS, Google Cloud Run, Azure Container Instances
  - Kapan memilih orkestrator tertentu
- **Lab**: Deploy aplikasi terkontainerisasi ke VM cloud dengan Docker

### Minggu 12: Proyek Kapstone
- **Lingkup Proyek**: Kontainerisasi aplikasi mikroservis lengkap
  - Beberapa layanan dengan komunikasi antar-layanan
  - Basis data persisten dengan manajemen volume
  - Reverse proxy (Nginx/Traefik) untuk routing
  - Pemeriksaan kesehatan, logging, dan monitoring
  - Pipeline CI/CD untuk deployment otomatis
- **Hasil Akhir**: Dockerfiles, file Compose, skrip deployment, dan dokumentasi

## Proyek Akhir

Peserta didik akan merancang, membangun, dan men-deploy aplikasi mikroservis yang sepenuhnya terkontainerisasi yang terdiri dari setidaknya tiga layanan yang saling terhubung (misalnya, gateway API REST, layanan autentikasi pengguna, dan pekerja pemrosesan data). Proyek harus mencakup:

- Dockerfile multi-tahap untuk setiap layanan dengan caching lapisan yang dioptimalkan
- File Docker Compose untuk pengembangan lokal dengan hot-reload
- Volume persisten untuk layanan basis data
- Jaringan bridge kustom dengan isolasi layanan yang tepat
- Pemeriksaan kesehatan dan kebijakan restart untuk setiap layanan
- Pipeline CI/CD yang membangun, menguji, dan mendorong citra ke registry
- Konfigurasi deployment produksi (stack swarm atau deployment cloud)
- Dokumentasi komprehensif yang mencakup arsitektur, pengaturan, dan pemecahan masalah

## Kriteria Penilaian

- **Tugas (40%)**: Laboratorium praktik mingguan dan kuis yang menilai keterampilan Docker praktis, termasuk pembuatan citra, manajemen kontainer, jaringan, dan konfigurasi Compose.
- **Proyek Tengah Semester (20%)**: Aplikasi multi-kontainer yang di-deploy dengan Docker Compose, yang menunjukkan jaringan, volume, dan konfigurasi lingkungan yang tepat.
- **Proyek Akhir Kapstone (40%)**: Proyek kontainerisasi mikroservis lengkap yang dievaluasi berdasarkan kebenaran, keamanan, optimasi performa, kualitas dokumentasi, dan otomatisasi deployment.
- **Bonus (hingga 10%)**: Menerapkan topik lanjutan seperti Docker Content Trust, profil seccomp, atau integrasi dengan Kubernetes.

## Referensi

- [Dokumentasi Resmi Docker](https://docs.docker.com/)
- [Docker Deep Dive oleh Nigel Poulton](https://www.amazon.com/Docker-Deep-Dive-Nigel-Poulton/dp/1521822808)
- [Play with Docker Classroom](https://training.play-with-docker.com/)
- [Kurikulum Docker oleh Prakhar Srivastav](https://docker-curriculum.com/)
- [Lembar Curang Keamanan Docker (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Saluran YouTube Resmi Docker](https://www.youtube.com/@DockerInc)

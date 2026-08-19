---
title: "Silabus Rekayasa Platform Docker Tingkat Lanjut"
description: "Silabus kursus 12 minggu tingkat lanjut bagi insinyur senior yang mencakup internal runtime dan kontainer, BuildKit, internal jaringan, penyimpanan tingkat lanjut, penguatan keamanan pada tingkat kernel, serta menjalankan platform kontainer dalam produksi berskala besar."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Platform Docker Tingkat Lanjut

## Ringkasan

Silabus ini merupakan kurikulum 12 minggu tingkat lanjut bagi para insinyur yang sudah menguasai penggunaan Docker sehari-hari dan ingin memahami serta mengoperasikan platform kontainer pada tingkat sistem. Jika kursus menengah mengajarkan *bagaimana* membangun image, menjalankan kontainer, dan menyusun aplikasi multi-layanan, kursus ini menggali *apa yang sebenarnya terjadi* di balik layar: spesifikasi runtime OCI, bagaimana BuildKit merencanakan dan mengeksekusi build, bagaimana kernel mengisolasi proses dengan namespace dan cgroups, bagaimana jalur data jaringan kontainer disusun, serta cara memperketat keamanan dan mengoperasikan Docker berskala besar dalam produksi. Kurikulum ini memadukan setiap pendalaman teknis dengan lab langsung yang memeriksa platform secara nyata, dan berpuncak pada proyek akhir di mana peserta membangun, mengamankan, serta mengoperasikan platform kontainer internal yang siap produksi.

## Kurikulum

### Minggu 1: Tumpukan Runtime Kontainer
- **Internal OCI dan Containerd**
  - Spesifikasi Runtime OCI dan Spesifikasi Image
  - Bagaimana Docker CLI, containerd, dan runc menyusun tumpukan runtime
  - Namespace containerd, snapshotters, dan content store
- **Siklus Hidup di Balik Layar**
  - Dari `docker run` hingga proses berjalan: seluruh jalur panggilan
  - Container shim dan cara runtime bertahan dari restart daemon
- **Lab**: Gunakan `ctr`, `nerdctl`, dan `crictl` untuk menyelidiki runtime secara langsung

### Minggu 2: Namespace dan cgroups Linux
- **Pendalaman Namespace**
  - Namespace mount, PID, network, UTS, IPC, user, dan cgroup
  - Bagaimana flag `unshare` dan `clone` menciptakan isolasi
- **cgroups v2**
  - Hirarki terpadu dan organisasi controller
  - Controller CPU, memori, dan I/O beserta pengaruhnya pada kontainer
- **Lab**: Periksa `/proc/self/ns`, file cgroup, dan data host `docker inspect`

### Minggu 3: Build Image dengan BuildKit
- **Arsitektur BuildKit**
  - Menjalankan build secara paralel dan dengan caching pada tingkat layer
  - Grafik eksekusi LLB (low-level builder) dan build secrets
- **Teknik Dockerfile Tingkat Lanjut**
  - Cache mounts, secrets mounts, dan SSH agent forwarding
  - Argument waktu build vs. konfigurasi waktu berjalan
- **Lab**: Optimalkan pipeline build dengan BuildKit cache mounts dan buildx

### Minggu 4: Storage Driver dan Filesystem
- **Internal Storage Driver**
  - OverlayFS, overlay2, dan model copy-on-write
  - Bagaimana layer image disusun menjadi tampilan kontainer
- **Volume Driver dan Mount secara Mendalam**
  - Bind mounts, named volumes, dan kontrak filesystem kontainer
  - Volume driver lokal vs. pihak ketiga
- **Lab**: Ukur write amplification di berbagai storage driver dan tipe mount

### Minggu 5: Internal Jaringan Kontainer
- **Jalur Data Jaringan**
  - Linux bridge, veth pairs, dan network namespace
  - Bagaimana bridge default dan bridge buatan pengguna menghubungkan kontainer
  - Aturan iptables dan nftables yang mengatur NAT serta publikasi port
- **Driver Tingkat Lanjut**
  - Trade-off macvlan, ipvlan, dan host networking
  - Peran CNI saat berpindah menuju platform terorkestrasi
- **Lab**: Lacak paket melalui `ip netns`, `brctl`, dan chain iptables

### Minggu 6: Ingress, Load Balancing, dan Service Discovery
- **Traffic Eksternal menuju Kontainer**
  - Published ports, Docker proxy, dan perilaku hairpin NAT
  - Reverse proxy dan load balancer di depan kontainer
- **Pola Service Discovery**
  - DNS tertanam dan discovery berbasis alias
  - Konfigurasi ulang proxy dinamis dengan Traefik, Nginx, dan Caddy
- **Lab**: Dirikan tumpukan ingress dengan discovery rute otomatis dan TLS

### Minggu 7: Keamanan pada Tingkat Kernel
- **Memperketat Runtime**
  - Menurunkan Linux capabilities dan model capability penuh
  - Seccomp profiles, AppArmor, dan pembatasan SELinux
- **Image Minimal dan Immutable**
  - Image distroless dan scratch, root filesystem hanya-baca
  - Menjalankan sebagai non-root dengan storage yang diperketat
- **Keamanan Rantai Pasokan**
  - Penandatanganan image dengan Docker Content Trust dan cosign
  - Pemindaian, pembuatan SBOM, dan penegakan kebijakan
- **Lab**: Perketat image produksi dan tegakkan kebijakan penandatanganan

### Minggu 8: Build Multi-Arsitektur dan Edge
- **Image Lintas Platform**
  - Multi-platform manifests dan OCI image index
  - Emulasi (QEMU) vs. cross-compilation native dengan buildx
- **Distribusi Image Berskala Besar**
  - Registry, mirroring, garbage collection, dan retensi
  - Penyimpanan content-addressable dan deduplikasi image
- **Lab**: Bangun dan kirim keluarga image multi-arsitektur dengan buildx

### Minggu 9: Compose Tingkat Lanjut dan Infrastructure as Code
- **Compose sebagai Kontrak Platform**
  - Spesifikasi Compose di target lokal, CI, dan produksi
  - Profiles, extensions, dan overrides untuk topologi spesifik lingkungan
- **Secrets, Configs, dan Manajemen Siklus Hidup**
  - Mendistribusikan secrets dan config tanpa membakarnya ke dalam image
  - Health checks, dependensi, dan urutan shutdown yang benar
- **Lab**: Modelkan stack multi-lingkungan yang tangguh dengan Compose overrides

### Minggu 10: Menjalankan Docker dalam Produksi Berskala Besar
- **Kematangan Operasional**
  - Logging drivers, metric exporters, dan observabilitas terpusat
  - Siklus hidup image, kebersihan rantai pasokan, dan remediasi kerentanan
- **High Availability dan Disaster Recovery**
  - Strategi persistensi data dan backup untuk state yang dikontainerisasi
  - Prosedur upgrade dan rollback untuk runtime Docker itu sendiri
- **Lab**: Bangun tumpukan observabilitas dan backup di sekitar deployment live

### Minggu 11: Platform Engineering dan Orkestrasi
- **Dari Docker menuju Platform Terorkestrasi**
  - Kapan Docker Swarm, Kubernetes, atau runtime terkelola cloud yang tepat
  - Merancang platform internal yang menstandarkan kontrak kontainer
- **Interoperabilitas**
  - Image yang sesuai OCI berjalan di berbagai runtime
  - Pendekatan portabilitas beban kerja dan abstraksi platform
- **Lab**: Terapkan set image OCI yang sama ke dua runtime berbeda

### Minggu 12: Proyek Akhir
- **Cakupan Proyek**: Rekayasa platform kontainer internal
  - Pipeline build image multi-arsitektur yang immutable dan ditandatangani
  - Base image yang diperketat dengan kebijakan keamanan yang ditegakkan
  - Lapisan ingress dan service discovery untuk beban kerja dinamis
  - Prosedur observabilitas, backup, dan rollback untuk platform
- **Deliverables**: Blueprint platform, Dockerfile yang diperketat, pipeline build, definisi Compose/stack, kebijakan keamanan, dan runbook

## Proyek Akhir

Peserta akan merancang dan mengoperasikan platform kontainer internal yang siap produksi untuk kumpulan aplikasi yang sudah ada. Proyek ini harus mencakup:

- Pipeline build BuildKit multi-arsitektur yang menghasilkan image distroless yang ditandatangani dan diperkaya SBOM
- Penguatan runtime pada tingkat kernel yang diterapkan konsisten: eksekusi non-root, root filesystem hanya-baca, dropped capabilities, dan profil seccomp/AppArmor kustom
- Lapisan ingress dan service discovery yang secara dinamis merutekan traffic ke kontainer dengan TLS otomatis
- Logging, metrik, dan visibilitas kesehatan terpusat di seluruh beban kerja
- Runbook backup, disaster recovery, dan rollback, serta rencana upgrade untuk runtime itu sendiri
- Blueprint platform engineering tertulis yang menjelaskan keputusan desain dan trade-off

Hasil dinilai dari seberapa dalam peserta menunjukkan pemahaman tentang internal runtime, keamanan, dan jaringan yang mendasarinya — bukan sekadar merangkai file Compose yang berfungsi.

## Kriteria Penilaian

- **Lab (40%)**: Lab langsung mingguan yang memeriksa internal runtime (namespace, cgroups, jalur data jaringan, storage driver) dan dievaluasi berdasarkan kebenaran serta kedalaman observasi.
- **Deep-Dive Tengah Semester (20%)**: Analisis tertulis dan tervalidasi tentang subsistem pilihan (misalnya caching BuildKit atau jalur data jaringan) yang menjelaskan internalnya dengan bukti dari pemeriksaan langsung.
- **Proyek Akhir (40%)**: Proyek rekayasa platform internal, dievaluasi berdasarkan penguatan keamanan, reproduktibilitas build, kematangan operasional, dokumentasi, dan ketepatan keputusan arsitektural.
- **Bonus (hingga 10%)**: Kontribusi kebijakan atau otomasi penguatan (seccomp profiles, kebijakan penandatanganan, tooling runbook) yang dapat digeneralisasi melampaui proyek peserta itu sendiri.

## Referensi

- [Dokumentasi Docker — Runtime dan Konfigurasi](https://docs.docker.com/engine/)
- [Spesifikasi Open Container Initiative](https://opencontainers.org/)
- [Dokumentasi BuildKit dan buildx](https://docs.docker.com/build/)
- [Man Pages Linux — namespaces(7) dan cgroups(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)
- [Dokumentasi Capabilities dan Keamanan Docker](https://docs.docker.com/engine/security/)
- [Dokumentasi Jaringan di Compose](https://docs.docker.com/compose/networking/)
- [The Docker Book — Topik Lanjutan](https://www.dockerbook.com/)

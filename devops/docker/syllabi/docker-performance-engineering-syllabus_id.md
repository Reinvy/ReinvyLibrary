---
title: "Silabus Rekayasa Performa dan Sumber Daya Docker"
description: "Silabus lanjutan 10 modul untuk engineer yang perlu memprediksi, mengukur, dan menyetel performa container: kontrol sumber daya cgroup v2, akuntansi CPU dan memori, overhead I/O dan jaringan, trade-off isolasi runtime, profiling dengan eBPF, biaya start-up image, dan perencanaan kapasitas berbasis densitas."
category: "devops"
technology: "docker"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Performa dan Sumber Daya Docker

## Ringkasan

Sebagian besar materi Docker mengajarkan cara menjalankan container. Jauh lebih sedikit yang mengajarkan cara menjelaskan mengapa container berjalan lebih lambat daripada proses yang sama di host, ke mana waktu CPU yang hilang pergi, atau berapa banyak instance yang muat di satu node sebelum latensi jatuh. Silabus ini mengisi celah tersebut. Isinya kurikulum lanjutan 10 modul untuk platform engineer, SRE, dan backend engineer yang bertanggung jawab atas performa dan biaya sistem tercontainerisasi.

Kursus ini sengaja dibuat measurement-first. Setiap modul dimulai dari model bagaimana kernel mencatat suatu sumber daya, lalu beralih ke tooling yang mengeksposnya, dan berakhir dengan lab di mana peserta menghasilkan angka, bukan opini. Modul 4 sampai 7 menelaah permukaan overhead yang khas diperkenalkan container: filesystem overlay, jaringan virtual, intersepsi syscall oleh runtime alternatif, serta biaya pull dan start-up image. Modul 8 dan 9 mengubah pengukuran tersebut menjadi keputusan rekayasa tentang bin packing, right-sizing, dan gerbang regresi di CI.

Materi ini bukan pengulangan silabus containerization tingkat dasar atau silabus platform engineering. Keduanya membahas apa itu container dan bagaimana mengoperasikan platform container; silabus ini mengasumsikan kefasihan dengan image, Compose, dan flag `docker run` dasar, lalu menggali semantik kontrol sumber daya, metodologi benchmarking, dan matematika kapasitas. Peserta yang menyelesaikan kursus ini seharusnya mampu mempertahankan pilihan limit CPU, pilihan runtime, dan target densitas dengan data.

## Kurikulum

### Modul 1: Model Biaya Sebuah Container
- **Apa yang Sebenarnya Ditambahkan Container**
  - Isolasi proses ditambah batas pengemasan; tidak ada hypervisor pada jalur default
  - Di mana overhead itu nyata (intersepsi syscall, lookup overlay, traversal veth) dan di mana hanya persepsi (start-up versus waktu berjalan)
  - Mitos umum: "container lebih lambat", "limit itu gratis", "satu core tetap satu core"
- **Metodologi Benchmark Sebelum Melakukan Benchmark**
  - Warm-up, jumlah pengulangan, variansi, dan mengapa satu pengukuran `time` bukan benchmark
  - Mengendalikan CPU frequency scaling, noisy neighbor, dan kondisi page cache
  - Melaporkan p50/p95/p99 beserta interval kepercayaan yang benar-benar dimiliki
- **Lab**: Jalankan beban kerja CPU-bound dan I/O-bound yang identik di host, di container tanpa limit, dan di container dengan limit, lalu jelaskan setiap selisih yang terukur

### Modul 2: Semantik Kontrol dan Penjadwalan CPU
- **Kontrol CPU cgroup v2**
  - Perbedaan antara `cpu.weight` (porsi proporsional saat terjadi kontensi) dan `cpu.max` (kuota keras)
  - Mengapa kuota yang terlalu ketat menghasilkan throttling meski node terlihat idle
  - Counter `cpu.stat`: `nr_periods`, `nr_throttled`, `throttled_usec`
- **Kontrol Penempatan**
  - Pinning `cpuset`, kesadaran NUMA, dan lokalitas cache untuk layanan yang sensitif latensi
  - Hyperthread sibling dan trade-off throughput versus latensi saat berbagi core fisik
- **Mendiagnosis Throttling**
  - Mengorelasikan lonjakan latensi p99 dengan periode throttled, bukan menebak
  - Kegagalan klasik: burst start-up multi-thread menabrak kuota 1 CPU
- **Lab**: Reproduksi jurang latensi dengan menyetel `cpu.max` pada beban kerja tetap dan plot latensi terhadap kuota

### Modul 3: Akuntansi Memori, Perilaku OOM, dan Swap
- **Bagaimana Kernel Membebankan Memori ke cgroup**
  - `memory.current`, `memory.max`, `memory.stat`, dan pembagian antara memori anon, file, serta kernel
  - Page cache sebagai memori yang dapat direklaim; mengapa "container memakai 2 GB" biasanya salah
  - Estimasi working set: delta file/anon pada `memory.stat` selama satu interval
- **Limit, Reservasi, dan OOM Killer**
  - `memory.max` versus `memory.high` sebagai katup throttling sebelum killer bekerja
  - `oom_score_adj` per proses dan mengapa korban yang salah ikut terbunuh
  - Perilaku heap runtime Java, Go, dan Node di bawah limit cgroup; menghormati `GOMEMLIMIT` dan flag JVM yang sadar container
- **Swap dan zram di Host Container**
  - `memory.swap.max`, biaya latensi swapping, dan kapan sebaiknya dimatikan sama sekali
- **Lab**: Paksa kondisi OOM terkendali dan tunjukkan container yang tetap hidup berkat konfigurasi heap yang benar

### Modul 4: Performa Penyimpanan dan Filesystem
- **Mekanika Filesystem Overlay**
  - Layer, lowerdir/upperdir, biaya copy-up pada penulisan pertama, dan mengapa menulis ke layer image itu lambat
  - Kapan volume atau bind mount lebih baik daripada layer writable, dan kapan tmpfs adalah jawaban yang tepat
- **Kontrol Block I/O**
  - Batas bandwidth dan IOPS `io.max` per device, akuntansi `io.stat`
  - Amplifikasi baca/tulis dari beban kerja blok kecil pada penyimpanan jaringan
- **Trade-off Driver Volume**
  - Volume lokal, volume berbasis NFS, dan block device cloud: profil latensi serta mode kegagalan
  - Container database di penyimpanan bersama: apa yang harus diukur sebelum menyebutnya layak
- **Lab**: Benchmark I/O sekuensial dan acak pada layer writable, volume, bind mount, dan tmpfs

### Modul 5: Throughput dan Latensi Jaringan Container
- **Jalur Bridge Default**
  - Pasangan veth, forwarding bridge, aturan NAT, dan biaya per paket saat melewatinya
  - Ketidakcocokan MTU sebagai pembunuh throughput senyap; perilaku TCP segmentation offload
- **Jalur Jaringan Alternatif**
  - Jaringan `host` untuk throughput maksimum beserta biaya isolasinya
  - macvlan dan ipvlan untuk kehadiran L2 tanpa NAT
  - Datapath berbasis eBPF dan kapan sebenarnya ia menang
- **Mengukur, Bukan Menebak**
  - Throughput, overhead request-per-detik, dan latensi pembentukan koneksi secara terpisah
  - `iperf3`, `wrk`/`hey`, dan tracing tingkat socket antara dua container
- **Lab**: Ukur beban kerja request identik melalui jaringan bridge, host, dan macvlan lalu kuantifikasi perbedaannya

### Modul 6: Runtime Isolasi dan Biaya Performanya
- **Spektrum Runtime**
  - `runc` dengan namespace dan cgroup: biaya syscall mendekati native
  - gVisor: kernel di ruang pengguna, intersepsi syscall, dan beban kerja yang dirugikan
  - Kata Containers dan Firecracker microVM: overhead memori, waktu boot, dan biaya densitas
- **Memilih Berdasarkan Bukti**
  - Profil syscall-heavy, compute-heavy, dan I/O-heavy serta reaksi masing-masing
  - Celah kompatibilitas: `io_uring`, sebagian jalur `ioctl`, passthrough GPU
- **Mengukur Pajaknya**
  - Benchmark layanan yang sama di dua runtime dan laporkan selisihnya secara jujur
- **Lab**: Jalankan satu layanan di `runc` dan satu di gVisor, lalu buat tabel perbandingan throughput, latensi, dan jejak memori

### Modul 7: Profiling dan Observabilitas di Dalam Container
- **Profiling dari Sudut Pandang Host**
  - `perf` melintasi batas container, pemetaan PID namespace, dan resolusi simbol kernel
  - `bpftrace` dan eBPF untuk atribusi latensi per cgroup tanpa instrumentasi aplikasi
- **Metrik yang Sadar Container**
  - cAdvisor, endpoint Docker stats, dan perbedaan antara persentase CPU container dengan waktu CPU host
  - Pressure stall information (PSI) sebagai sinyal jujur untuk kelangkaan sumber daya
- **Flame Graph dan Trace**
  - Membangun flame graph CPU untuk layanan tercontainerisasi
  - Distributed tracing untuk memisahkan waktu di dalam container dari waktu jaringan
- **Lab**: Atribusikan regresi latensi sintetis ke sumber daya tertentu hanya dengan alat profiling

### Modul 8: Pull Image, Layering, dan Biaya Start-Up
- **Ke Mana Waktu Start-Up Pergi**
  - Waktu pull, ekstraksi layer, pembuatan container, dan boot aplikasi sebagai anggaran terpisah
  - Lokalitas registry, deduplikasi layer, dan mengapa ukuran image adalah proksi lemah untuk waktu pull
- **Lazy Loading dan Snapshotter**
  - Remote snapshotter (stargz, nydus) dan trade-off-nya terhadap caching lokal penuh
  - Image node yang sudah dipanaskan dan masalah cold start di klaster autoscaling
- **Disiplin Waktu Boot**
  - Memangkas pekerjaan entrypoint, menghindari instalasi paket saat runtime, menunda inisialisasi non-kritis
- **Lab**: Pecah start-up sebuah layanan menjadi empat anggaran dan turunkan total cold start minimal 40 persen

### Modul 9: Densitas, Perencanaan Kapasitas, dan Biaya
- **Dari Pengukuran ke Model Kapasitas**
  - Menurunkan envelope sumber daya per instance dari load test, bukan menyalin nilai default
  - Lutut kurva latensi sebagai plafon densitas yang sebenarnya
- **Packing dan Right-Sizing**
  - Request versus limit sebagai kontrak penjadwalan; biaya over-reserving
  - Perilaku bin packing, fragmentasi, dan mengapa node identik tetap saja tidak seimbang bebannya
- **Kontrol Noisy Neighbour**
  - Page cache bersama, CPU bersama, dan jaringan bersama sebagai kanal interferensi
  - Kontrol blast radius yang murah namun membeli prediktabilitas
- **Lab**: Bangun model kapasitas untuk stack tiga layanan dan hitung selisih biaya antara konfigurasi default dan yang sudah disetel

### Modul 10: Gerbang Regresi Performa dan Tata Kelola
- **Lingkungan Benchmark yang Reproducible**
  - Image yang dipin, kelas hardware yang dipin, dan noise yang dikendalikan untuk CI
  - Gating statistik: seberapa besar perubahan yang benar-benar nyata
- **Gerbang yang Tidak Diabaikan**
  - Anggaran per layanan (start-up, memori, throughput) yang ditegakkan di pipeline
  - Alerting pada peristiwa throttling dan OOM sebagai indikator awal, bukan insiden yang terlambat
- **Mendokumentasikan Alasannya**
  - Mencatat pengukuran, limit yang dipilih, dan kondisi kapan keputusan itu perlu ditinjau ulang
- **Lab**: Tambahkan gerbang performa ke pipeline CI yang menggagalkan build pada regresi berarti tanpa flaky

## Proyek Akhir

Peserta menyetel stack multi-layanan yang realistis dan mempertahankan setiap keputusan dengan data. Keluarannya berupa laporan rekayasa performa beserta konfigurasi yang mendukungnya:

- Harness benchmark yang reproducible dan menjalankan profil beban sama terhadap host, container tanpa batasan, dan konfigurasi container yang sudah disetel
- Envelope sumber daya per layanan yang diturunkan dari kurva latensi terukur: kuota CPU, plafon memori, dan batas I/O beserta alasannya
- Rekomendasi pilihan runtime (runc, gVisor, atau microVM) yang dibenarkan oleh biaya syscall dan memori terukur untuk minimal satu layanan
- Rincian anggaran start-up beserta perubahan yang menurunkan cold start, diukur sebelum dan sesudah
- Model kapasitas yang memprediksi berapa instance muat per node dan berapa selisih biaya bulanannya dibanding pengaturan default
- Gerbang performa CI yang terpasang di pipeline, lengkap dengan ambang batas dan catatan cara menangani false positive

Laporan diharapkan menampilkan pengukuran mentah, bukan hanya kesimpulan. Rekomendasi tanpa angka di belakangnya dianggap belum lengkap.

## Kriteria Penilaian

- **Lab (35%)**: Lab pengukuran mingguan, dinilai pada metodologi (kontrol, pengulangan, penanganan variansi) sama beratnya dengan angka akhirnya.
- **Tinjauan Pengukuran (20%)**: Dua tinjauan singkat di mana peserta mempresentasikan benchmark dan mempertahankannya terhadap pertanyaan tentang noise, confounder, dan signifikansi statistik.
- **Proyek Akhir (35%)**: Laporan penyetelan beserta konfigurasinya, dinilai pada ketepatan envelope sumber daya, kejujuran perbandingan runtime, akurasi model kapasitas, dan reproducibility harness.
- **Bonus (hingga 10%)**: Menyumbangkan resep benchmark atau dashboard yang dapat diadopsi tim lain tanpa modifikasi.

## Referensi

- [Docker Docs: Resource Constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [Docker Docs: Runtime Metrics dan `docker stats`](https://docs.docker.com/reference/cli/docker/container/stats/)
- [Linux Kernel Documentation: Control Group v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [Linux Kernel Documentation: Pressure Stall Information](https://docs.kernel.org/accounting/psi.html)
- [Docker Docs: Alternative Container Runtimes](https://docs.docker.com/engine/daemon/alternative-runtimes/)
- [Dokumentasi gVisor](https://gvisor.dev/docs/)
- [Dokumentasi Kata Containers](https://katacontainers.io/docs/)
- [containerd: Remote Snapshotters](https://github.com/containerd/containerd/blob/main/docs/remote-snapshotter.md)
- [Brendan Gregg: Systems Performance dan flame graph](https://www.brendangregg.com/)
- [Panduan Referensi bpftrace](https://bpftrace.org/docs/)
- [Dokumentasi cAdvisor](https://github.com/google/cadvisor)

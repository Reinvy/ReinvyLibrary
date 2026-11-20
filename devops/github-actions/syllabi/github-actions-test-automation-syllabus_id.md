---
title: "Silabus Otomasi Pengujian dan Rekayasa Kualitas CI dengan GitHub Actions"
description: "Kurikulum lanjutan 10 minggu tentang menjalankan rangkaian pengujian aplikasi di GitHub Actions sebagai sebuah disiplin rekayasa — ekonomi umpan balik, lingkungan pengujian hermetik, sharding dan eksekusi paralel, gerbang analisis statis berbasis diff, rekayasa pengujian end-to-end browser, sistem karantina tes flaky, pengujian coverage dan mutasi, pengujian beban dengan ambang batas, pengujian kontrak dan lapisan data, serta pelaporan dan kendali biaya yang menjaga platform pengujian tetap cepat dan dapat dipercaya."
category: "devops"
technology: "github-actions"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Otomasi Pengujian dan Rekayasa Kualitas CI dengan GitHub Actions

## Ringkasan

Sebagian besar tim tidak memiliki strategi pengujian di CI; yang mereka punya adalah alur kerja pengujian yang tumbuh sendiri. Satu job menjalankan semua yang pernah ditulis siapa pun, memakan waktu tiga puluh delapan menit, gagal karena alasan yang tidak pernah diselidiki, dan akhirnya dilewati dengan admin merge pada hari Jumat sebelum rilis. Masalahnya jarang terletak pada rangkaian tesnya — melainkan pada platform yang membungkusnya.

Silabus lanjutan 10 minggu ini memperlakukan platform pengujian CI sebagai sebuah produk yang memiliki pengguna (pengembang yang menunggu umpan balik), SLO (waktu hingga sinyal kegagalan yang dapat dipercaya), dan pusat biaya (menit runner ditambah pemborosan dari pengulangan akibat flaky). Modul dimulai dari ekonomi umpan balik dan penahapan pipeline, lalu berlanjut ke lingkungan hermetik dan eksekusi paralel bersharding, masuk ke disiplin yang lebih sulit: gerbang analisis statis dan pemeriksaan tipe yang hanya melaporkan apa yang berubah, rangkaian browser yang dirancang agar kegagalan dapat didiagnosis tanpa menjalankan ulang, serta sistem karantina tes flaky yang memiliki pemilik dan telemetri, bukan sekadar penghitung retry.

Kurikulum ini diurutkan berdasarkan ketergantungan antar kemampuan, bukan berdasarkan tren perkakas. Pengukuran datang lebih dulu, karena setiap keputusan berikutnya — melakukan sharding, caching, karantina, atau membelanjakan anggaran — hanyalah dugaan selama durasi, waktu antre, dan tingkat flaky belum tercatat. Determinisme menjadi langkah kedua, karena pipeline cepat yang menghasilkan jawaban berbeda pada dua eksekusi berurutan lebih buruk daripada pipeline lambat yang dapat dipercaya. Paralelisasi dan gerbang berbasis perubahan menyusul, sebab keduanya adalah pengganda termurah di atas fondasi yang stabil. Sepertiga akhir kursus membahas jenis pengujian yang mahal dan stokastik — end-to-end, performa, kontrak — di mana usaha rekayasanya diarahkan pada bukti, bukan pada kecepatan eksekusi.

Lulusan diharapkan mampu mempertahankan desain platform pengujian dalam sesi review: mengapa sebuah pemeriksaan bersifat wajib atau asinkron, apa batas rollback ketika sebuah gerbang salah menilai, bagaimana tes flaky dipensiunkan tanpa menghapus cakupan secara diam-diam, dan berapa biaya platform per pull request pada dua puluh commit per hari.

## Kurikulum

### Modul 1: Ekonomi Umpan Balik dan Arsitektur Pipeline (Minggu 1)

- **Sinyal Adalah Produknya**
  - Waktu hingga kegagalan pertama dibandingkan durasi total: pengembang meninggalkan antrean yang tidak bisa dibaca dalam sepuluh menit, seberapa lengkap pun laporan akhirnya
  - Mengukur durasi p50/p95/p99 per tahap dan per shard, tidak pernah sebagai rata-rata tingkat workflow yang menyembunyikan ekor distribusi
  - Biaya dari merah palsu: menit pengulangan, perpindahan konteks, dan terkikisnya kepercayaan yang selalu mendahului budaya melewati pemeriksaan
  - Definisi selesai untuk perubahan pipeline: memperpendek waktu hingga kegagalan pertama atau menambah informasi pada setiap kegagalan, dan idealnya keduanya
- **Menahapkan Rangkaian Tes**
  - Urutan gagal-cepat — pemeriksaan format dan lint sebelum unit test, unit sebelum integrasi, integrasi sebelum rangkaian browser
  - Graf `needs:` dibandingkan satu job monolitik: apa yang berjalan paralel dengan bersih, apa yang membutuhkan serah-terima artifact, dan di mana kegagalan sebaiknya memutus pekerjaan hilir
  - Pemeriksaan wajib, merge queue, dan job mana yang benar-benar harus sinkron sebelum merge dibandingkan yang cukup dilaporkan asinkron sesudahnya
  - Penyaringan path untuk perubahan dokumentasi saja: `paths-ignore` yang dibatasi agar pemeriksaan wajib tidak tertinggal dalam status pending selamanya
- **Konkurensi, Pembatalan, dan Kebersihan Antrean**
  - Grup `concurrency` yang dikunci pada ref dengan `cancel-in-progress` pada pull request — biasanya penghematan menit CI terbesar yang tersedia bagi repositori sibuk
  - Tidak pernah membatalkan job deployment atau migrasi: mekanisme yang sama harus diterapkan secara selektif, bukan global
  - Memisahkan waktu antre dari waktu eksekusi agar kelangkaan runner tidak disalahartikan sebagai tes yang lambat
- **Menganggarkan Siklus Umpan Balik**
  - Anggaran latensi per tahap yang disepakati bersama tim sebelum perkakas dipilih
  - Tindakan ketika sebuah tahap melampaui anggarannya: pecah, cache, shard, atau pindahkan ke eksekusi terjadwal — dalam urutan preferensi tersebut
- **Lab Praktik**: Menyusun ulang workflow satu-job menjadi job bertahap dengan `needs:`, pembatalan konkurensi pada pull request, dan pelaporan durasi per tahap; menghasilkan perbandingan sebelum/sesudah untuk waktu hingga kegagalan pertama pada dua puluh commit nyata

### Modul 2: Lingkungan Pengujian Hermetik (Minggu 2)

- **Determinisme Sebelum Kecepatan**
  - Empat sumber kebocoran pada setiap eksekusi tes di CI: akses jaringan, jam dan zona waktu, state database bersama, serta kredensial dari lingkungan sekitar
  - Mereproduksi kegagalan secara lokal dari log CI, dan memperlakukan image container sebagai kontrak antar lingkungan
  - Mengunci semua yang bisa bergeser — `ubuntu-24.04` alih-alih `ubuntu-latest`, SHA action alih-alih tag, lockfile alih-alih rentang versi mengambang, dan versi toolchain yang dipublikasikan di repositori
  - Jurang migrasi `ubuntu-latest`: apa yang rusak ketika label tersebut menunjuk ke image baru di tengah kuartal
- **Service Container dan Dependensi**
  - `services:` untuk PostgreSQL, MySQL, Redis, dan message broker, termasuk pemetaan port yang benar ketika job berjalan di host
  - Pemeriksaan kesehatan melalui `options: --health-cmd` dan sifat flaky yang muncul saat tes dimulai sebelum kesiapan benar-benar tercapai
  - Memversikan image layanan dan mencerminkannya ke registry yang Anda kendalikan agar perubahan tag di hulu tidak mengubah hasil pengujian
  - Kapan Docker Compose di dalam job lebih baik daripada `services:`, dan kapan Testcontainers menjadi jawaban yang tepat
- **Disiplin State Database**
  - Migrasi sekali per job, lalu truncate antar rangkaian tes — membuat ulang skema untuk setiap tes adalah penyebab durasi terpanjang yang paling sering diciptakan sendiri
  - Dump fixture berversi dibandingkan factory, serta biaya runtime masing-masing pada lima ratus tes
  - Isolasi aman-paralel: satu skema atau database per shard, dikunci pada `matrix.shard`, dengan teardown yang dapat diprediksi
  - Menguji migrasi sebagai objek kelas satu: terapkan semua pada database kosong, rollback, lalu pastikan diff skema kosong
- **Meng-cache yang Aman Di-cache**
  - Kunci `actions/cache` yang diturunkan dari hash lockfile, dengan prefiks restore-key untuk hit parsial yang tetap mulus
  - Yang tidak boleh di-cache: database pengujian berisi baris sisa, berkas `.env`, kredensial, dan hasil build yang mengandung path absolut
  - Cakupan cache dan risiko keracunan ketika kunci dapat dijangkau dari pull request fork, serta mengapa `pull_request_target` tidak boleh melakukan checkout kode tak terpercaya
  - Tingkat hit cache sebagai metrik yang dipantau, bukan harapan
- **Lab Praktik**: Mengubah workflow yang menginstal semuanya dari nol menjadi pipeline hermetik, ter-cache, dan didukung service container yang menghasilkan hasil identik pada dua eksekusi berurutan dan satu pengulangan dari cache, dengan tingkat hit cache dilaporkan

### Modul 3: Sharding, Matriks, dan Eksekusi Paralel (Minggu 3)

- **Memecah Pekerjaan dengan Benar**
  - Sharding matriks statis (`shard: [1, 2, 3, 4]`) dan masalah straggler yang bisa membuat empat shard lebih lambat daripada satu job
  - Split-by-timing: memasukkan laporan durasi eksekusi sebelumnya kembali ke matriks agar setiap shard selesai pada waktu yang berdekatan
  - Matriks dinamis dari job penemuan (`fromJSON(needs.discover.outputs.matrix)`) ketika jumlah paket atau berkas spesifikasi tidak diketahui sebelumnya
  - Pengukuran keseimbangan sebagai kriteria penerimaan: durasi antar shard berada dalam lima belas persen, bukan sekadar "job lebih banyak"
- **Paralelisme Tingkat Framework**
  - `--shard=1/4` pada Playwright, `--shard` dan `--maxWorkers` pada Jest, `-n auto` pada pytest-xdist, serta bagaimana pemecahan tingkat framework berinteraksi dengan matriks di tingkat CI
  - Oversubscription: mengapa `--maxWorkers=8` pada runner 4 vCPU justru memperpanjang durasi karena pergantian konteks dan tekanan memori
  - Jumlah worker yang diturunkan dari `nproc` alih-alih di-hard-code, sehingga konfigurasi yang sama bekerja pada runner hosted maupun self-hosted
  - Menggabungkan coverage dan JUnit XML dari beberapa shard: konkatenasi `lcov`, `coverage combine`, dan perkakas penggabung laporan
- **Ukuran Runner dan Ekonominya**
  - Runner lebih besar dibandingkan lebih banyak shard, dan mana yang benar-benar menurunkan waktu dinding per dolar pada ukuran rangkaian tes Anda
  - Biaya cold-start — tarik image, restore dependensi, boot framework — yang dikalikan oleh jumlah shard
  - Pool self-hosted dengan image yang sudah dipanggang untuk rangkaian tes berat, dan runner hosted untuk yang ringan serta bursty
- **Semantik Kegagalan pada Fan-Out**
  - `fail-fast: false` agar satu shard yang gagal tetap melaporkan gambaran lengkap alih-alih membatalkan saudaranya
  - `max-parallel` sebagai pembatas lonjakan menit runner, batas laju registry, dan kejenuhan lingkungan hilir
  - Menjalankan ulang hanya shard yang gagal bila framework mendukungnya, dan mengetahui kapan pengulangan penuh adalah pilihan yang jujur
- **Lab Praktik**: Mengubah rangkaian tes serial dua puluh menit menjadi pipeline bersharding yang selesai di bawah enam menit dengan durasi antar shard dalam lima belas persen, coverage yang digabung, dan satu laporan JUnit teragregasi

### Modul 4: Analisis Statis, Pemeriksaan Tipe, dan Gerbang Berbasis Diff (Minggu 4)

- **Gerbang yang Gagal Cepat dan Murah**
  - Urutan: pemeriksaan format, lint, pemeriksaan tipe, build — selalu laporkan kegagalan deterministik termurah lebih dulu
  - Pemeriksaan tipe inkremental (`tsc --incremental`, direktori cache mypy, build cache Gradle) dengan kunci yang diturunkan dari hash sumber, bukan dari ID eksekusi
  - Eksekusi berbasis affected-graph di monorepo: hanya jalankan paket yang klausa dependensinya berubah, dihitung dari diff merge base
  - Analisis statis di CI sebagai ratchet, bukan dinding kebisingan historis yang akhirnya diabaikan reviewer
- **Pelaporan yang Benar-Benar Dibaca Reviewer**
  - Anotasi sebagai komentar review inline alih-alih log galat sembilan ratus baris
  - `$GITHUB_STEP_SUMMARY` untuk ringkasan per paket tentang apa yang rusak, beserta tautan ke baris yang bermasalah
  - Unggah SARIF ke code scanning agar temuan hidup di pull request dan bertahan lintas push
  - Satu check run per perhatian: satu pemeriksaan raksasa yang gagal karena salah satu dari enam alasan mengajarkan reviewer untuk mengabaikan keenamnya
- **Baseline, Supresi, dan Kedaluwarsa**
  - Berkas baseline yang menerima utang teknis yang ada sekaligus menggagalkan setiap pelanggaran baru
  - Ratchet yang melarang `any` baru, type ignore baru, dan pemadaman lint baru kecuali disertai komentar justifikasi
  - Tanggal kedaluwarsa pada supresi agar utang yang diterima memiliki biaya dan akhirnya terlihat kembali
  - Mengaudit baseline dalam review: supresi yang ditambahkan di dalam pull request fitur tak terkait adalah tanda bahaya
- **Lab Praktik**: Membangun gerbang kualitas berbasis diff untuk monorepo — lint dan pemeriksaan tipe hanya untuk paket terdampak, anotasi review, baseline yang di-commit, dan ratchet yang menggagalkan build ketika supresi ditambahkan tanpa masa berlaku

### Modul 5: Rekayasa Rangkaian Browser dan End-to-End (Minggu 5)

- **Membuat Kegagalan Dapat Didebug**
  - Artifact yang ditangkap saat gagal dan diunggah tanpa syarat dengan `if: always()`: trace, video, tangkapan layar, log konsol, log jaringan
  - `trace: on-first-retry` pada Playwright dan laporan HTML yang dipublikasikan ke URL yang dapat dibagikan per eksekusi dan per shard
  - Retry diperlakukan sebagai instrumentasi, tidak pernah sebagai perbaikan — setiap tes yang lulus hanya pada retry adalah data tentang flake yang masih ada
  - Checklist triase yang di-commit bersama rangkaian tes, sehingga on-call dapat mendiagnosis tanpa bertanya kepada penulis tes
- **Penyiapan Lingkungan dan Data**
  - Lingkungan preview efemeral per pull request dibandingkan staging bersama, dengan kejujuran tentang kegagalan mana yang dapat diatribusikan dan mana yang tidak
  - Penggunaan ulang state autentikasi melalui `storageState` agar dua ratus tes tidak masing-masing login lewat UI
  - Isolasi data pengujian antar shard: prefiks tenant atau email yang unik, pembersihan deterministik, dan tanpa asumsi lintas shard
  - Menjalankan rangkaian tes terhadap build produksi dengan pipeline aset yang sama seperti deployment, karena waktu hidrasi mengubah setiap asersi
- **Rekayasa Stabilitas**
  - Tunggu deterministik (`expect(locator).toBeVisible()`) dibandingkan tidur tetap, yang tak lain adalah balapan dengan langkah tambahan
  - Kendali jam dan zona waktu: `TZ=UTC` di job ditambah waktu yang dibekukan atau dimock di aplikasi, tidak pernah keduanya diterapkan setengah-setengah
  - Determinisme viewport, locale, dan font agar perbandingan tangkapan layar tidak gagal karena pembaruan image runner
  - Memilih rangkaian terkecil yang tetap melewati batas nyata — rangkaian browser untuk perjalanan pengguna, bukan untuk menutup cakupan logika bisnis
- **Lab Praktik**: Menghasilkan pipeline end-to-end yang setiap artifact kegagalannya cukup untuk diagnosis tanpa pengulangan — laporan HTML tergabung, trace, log konsol — divalidasi terhadap tiga bug yang sengaja diperkenalkan

### Modul 6: Deteksi Tes Flaky dan Sistem Karantina (Minggu 6)

- **Mengukur Flake Alih-Alih Menebak**
  - Deteksi kandidat: commit yang sama menghasilkan hasil berbeda, tes yang hanya lulus pada retry, dan pencilan durasi di dalam shard yang sama
  - JUnit XML sebagai format ingesti, beserta field yang membawa sinyal — `time`, `failure`, `flaky`, `classname`
  - Eksekusi berulang malam hari (`--repeat-each=10`) pada workflow terjadwal sebagai detektor, alih-alih memperbesar biaya deteksi di setiap pull request
  - Membedakan flake dari kegagalan lingkungan yang sesungguhnya agar daftar karantina tidak berubah menjadi kuburan bug nyata
- **Siklus Karantina**
  - Manifest karantina di dalam repositori yang mencantumkan setiap tes beserta pemilik, alasan, tanggal deteksi, dan tautan issue
  - Langkah workflow yang mengeluarkan tes terkait dari jalur wajib sambil tetap menjalankannya di job non-blocking, sehingga tidak ada yang terhapus diam-diam
  - Karantina otomatis yang digerakkan analitik pengujian (CI Visibility, BuildPulse, Trunk) dibandingkan manifest yang dikurasi, beserta biaya tata kelola masing-masing
  - Kriteria keluar yang ditegakkan oleh kebijakan: tes yang dikarantina tanpa pemilik dan tanpa issue dihapus, secara sengaja dan tercatat
- **Kepemilikan dan Insentif**
  - CODEOWNERS yang memetakan direktori tes ke tim sehingga setiap flake memiliki nama yang bertanggung jawab
  - Review mingguan tingkat flake per rangkaian tes dan per tim, dengan tren yang terlihat oleh semua orang yang merasakan kebisingannya
  - Mengukur biaya "tinggal retry saja": cacat yang tersamarkan ditambah menit runner ditambah hilangnya kepercayaan yang mengubah build merah menjadi sekadar saran
- **Lab Praktik**: Membangun sistem karantina untuk rangkaian tes dengan tiga tes flaky yang ditanam — job detektor, manifest pemilik, pengeluaran dari jalur wajib, job karantina non-blocking, dan laporan tingkat flake yang dihasilkan oleh pipeline itu sendiri

### Modul 7: Coverage, Pengujian Mutasi, dan Metrik Kualitas (Minggu 7)

- **Coverage sebagai Diff, Bukan Angka**
  - Gerbang line coverage yang hampir tidak memprediksi apa pun dibandingkan diff coverage pada baris yang berubah, yang benar-benar dapat dicerna reviewer
  - Menggabungkan coverage dari shard sebelum menerapkan ambang apa pun, agar angkanya mencerminkan keseluruhan eksekusi
  - Ambang per paket di monorepo, dengan ratchet yang menaikkan lantai sebuah paket setiap kali paket itu membaik
  - Coverage sebagai detektor asap, bukan nilai rapor — metrik yang penting adalah apakah sebuah cacat akan tertangkap
- **Pengujian Mutasi di CI**
  - Stryker (JavaScript dan TypeScript), PIT atau Infection (PHP), mutmut (Python) — biaya runtime, dan cara membatasi eksekusi pada berkas yang berubah
  - Cache mutasi inkremental yang membuat eksekusi penuh terjangkau hanya pada jadwal malam
  - Membaca mutant yang bertahan: entah asersi yang hilang atau mutant yang ekuivalen, beserta disiplin untuk membedakan keduanya
  - Tren skor mutasi sebagai ukuran jujur apakah asersi benar-benar membaik
- **Metrik yang Bertahan Saat Dipertanyakan**
  - Jumlah tes adalah kemewahan kosong; cacat yang lolos, waktu rata-rata untuk mendeteksi, dan proporsi tes yang pernah gagal bukanlah demikian
  - Komentar coverage pada pull request dengan ambang eksplisit dan sinyal bagi reviewer, bukan badge yang tidak dibaca siapa pun
  - Menjaga dari permainan metrik yang mengikuti setiap gerbang: tes tanpa asersi yang menggelembungkan coverage, tes snapshot yang tidak memeriksa apa pun bermakna, dan rangkaian tes yang memanggil kode tanpa memeriksa hasil
- **Lab Praktik**: Menambahkan diff coverage dan job pengujian mutasi terbatas pada repositori nyata, membuktikan bahwa penghapusan satu asersi tertangkap oleh pipeline, dan menerbitkan laporan kualitas satu halaman yang mencakup tren coverage, skor mutasi, dan cacat yang lolos

### Modul 8: Pengujian Performa dan Beban di CI (Minggu 8)

- **Load Test sebagai Kode**
  - Skrip k6 yang berversi bersama aplikasi, dengan skenario eksplisit (`constant-arrival-rate`, `ramping-vus`) dan ambang batas yang menggagalkan eksekusi
  - Ambang batas sebagai asersi: pelanggaran p95 latensi atau tingkat galat menggagalkan job, bukan menghasilkan grafik yang ditafsirkan belakangan
  - Padanan Locust dan Artillery, serta mengapa pilihan perkakas jauh lebih tidak penting daripada keseragaman lingkungan
  - Profil beban yang diturunkan dari distribusi trafik nyata, bukan campuran permintaan seragam yang tidak dikenali siapa pun
- **Lingkungan yang Menghasilkan Angka Dapat Dibandingkan**
  - Tidak pernah menguji beban pada staging bersama di jam kerja; lingkungan efemeral, khusus, dan dengan kelas instance sama yang diasumsikan oleh setiap perbandingan
  - Warm-up, kesamaan ukuran dataset, dan konfigurasi identik sehingga perubahan lima persen bermakna alih-alih sekadar derau
  - Baseline JSON yang di-commit per skenario dengan toleransi eksplisit, dan kegagalan ketika terjadi regresi di luar toleransi itu
  - Mencatat kelas runner dan image bersama hasil, karena perubahan runner membatalkan setiap baseline historis
- **Eksekusi Terjadwal dan Pra-Rilis**
  - Eksekusi `schedule:` malam untuk data tren, dan eksekusi berpagar pull request untuk dua atau tiga jalur kritis yang layak dibayar per commit
  - Skenario soak dan spike yang hanya masuk akal pada jadwal, plus retensi artifact yang cukup panjang untuk analisis tren
  - Mengorelasikan hasil beban dengan metrik aplikasi dan database pada stempel waktu yang sama, atau angkanya tidak dapat diuji
- **Lab Praktik**: Menyiapkan job k6 malam hari dengan baseline yang di-commit dan kegagalan berbasis ambang, lalu membuktikan gerbang itu bekerja dengan men-deploy build yang sengaja diregresikan dan menangkap keluaran kegagalannya

### Modul 9: Pengujian Integrasi, Kontrak, dan Lapisan Data (Minggu 9)

- **Pipeline Pengujian Kontrak**
  - Menerbitkan kontrak dari pipeline konsumen dan memverifikasinya di CI penyedia sebelum merge, dengan broker sebagai sumber kebenaran bersama
  - Gerbang deployment yang memblokir pada kompatibilitas terverifikasi dengan versi yang benar-benar di-deploy, bukan dengan `main`
  - Memversikan kontrak berdasarkan SHA commit dan menjaga konsistensi nama partisipan agar matriks kompatibilitas tetap terbaca
  - Menghindari jalan buntu ketika kedua pihak saling menunggu pihak lain menerbitkan kontrak sebelum memverifikasi
- **Batas Integrasi**
  - Tes integrasi berbasis Testcontainers di Actions, termasuk ketersediaan Docker socket, caching tarik image, dan batas waktu startup
  - Pengujian migrasi sebagai job: terapkan semua migrasi pada database kosong, rollback satu langkah, terapkan ulang, dan pastikan diff skema kosong
  - Tes kontrak data ter-seed yang gagal dengan jelas ketika tipe kolom, constraint, atau nilai default berubah diam-diam
  - Gagal cepat pada flake infrastruktur agar kegagalan integrasi mempertahankan nilai diagnostiknya
- **Batas Pihak Ketiga di CI**
  - Fixture terekam (VCR, Polly, nock) di pemeriksaan wajib dibandingkan sandbox nyata di smoke test terjadwal, dan mengapa keduanya dibutuhkan
  - Smoke test terjadwal terhadap sandbox penyedia untuk menangkap drift sebelum mencapai fixture terekam
  - Kredensial melalui OIDC dan token berumur pendek alih-alih secret berumur panjang yang tersedia bagi setiap workflow
  - Memberi tag pada tes yang membutuhkan penyedia eksternal agar dapat dikeluarkan dari eksekusi fork yang tidak memiliki kredensial
- **Lab Praktik**: Menambahkan verifikasi kontrak dan job konsistensi migrasi pada repositori layanan, lalu menunjukkan perubahan konsumen menggagalkan CI penyedia sebelum merge alih-alih sesudah deploy

### Modul 10: Pelaporan, Observabilitas, dan Kendali Biaya (Minggu 10)

- **Satu Kebenaran per Eksekusi**
  - Menggabungkan artifact shard menjadi satu laporan JUnit, SARIF, dan coverage di bawah nama check-run yang stabil sehingga branch protection dapat mewajibkannya
  - Menerbitkan hasil ketika job gagal atau dibatalkan (`if: always()`), karena justru itulah eksekusi yang secara bawaan tidak memiliki artifact
  - Kebijakan retensi: bawaan sembilan puluh hari dibandingkan tujuh hari yang benar-benar berguna untuk sebuah trace
  - Ringkasan eksekusi yang menjawab "apa yang rusak, di mana, dan siapa pemiliknya" dalam satu layar
- **Telemetri untuk Platform Itu Sendiri**
  - Melacak durasi, waktu antre, tingkat flake, tingkat hit cache, dan biaya per workflow sebagai deret waktu, bukan hiasan dashboard
  - Peringatan pada SLO platform sendiri: regresi waktu hingga kegagalan pertama, runtuhnya tingkat hit cache, kejenuhan antrean runner
  - Memanfaatkan metadata eksekusi workflow dan Actions API untuk membangun dataset yang benar-benar dibutuhkan retrospektif
  - Memperlakukan pipeline sebagai produksi: ia memiliki pemilik, rotasi on-call, dan template postmortem
- **Biaya dan Kapasitas**
  - Akuntansi menit runner per workflow dan per tim, serta memindahkan rangkaian tes berat ke eksekusi terjadwal atau self-hosted
  - Perhitungan ROI caching: waktu restore dibandingkan waktu komputasi pada tingkat hit yang terukur, dihitung ulang setelah setiap perubahan besar rangkaian tes
  - Pagar anggaran: batas `max-parallel`, batas ukuran matriks, dan menghapus rangkaian tes yang tidak lagi dibaca siapa pun
  - Review kuartalan yang memensiunkan setidaknya satu pemeriksaan yang sinyalnya tidak lagi sepadan dengan biayanya
- **Lab Praktik**: Membangun dashboard platform pengujian dan laporan biaya bulanan dari data eksekusi workflow, lalu menerbitkan rencana yang memindahkan satu rangkaian tes mahal ke model eksekusi yang lebih murah dengan angka sebelum/sesudah yang terukur

## Proyek Akhir

Membangun platform pengujian CI untuk monorepo TypeScript berisi empat puluh paket yang pipeline-nya saat ini menjalankan semuanya secara serial dalam satu job berdurasi 38 menit.

Repositori disertai utang teknis yang realistis: tanpa penyaringan path, database staging bersama yang membocorkan state antar eksekusi, empat tes end-to-end yang sengaja dibuat flaky, diff coverage sebelas persen pada paket checkout, tidak ada tes kontrak antara aplikasi web dan layanan pesanan, serta load test yang hanya ada sebagai instruksi README yang belum pernah dijalankan siapa pun. Proyek ini menuntut peserta untuk:

- Menyusun ulang pipeline menjadi job bertahap dengan pembatalan konkurensi, dan mengukur waktu hingga kegagalan pertama sebelum dan sesudahnya
- Membuat lingkungan hermetik: service container, skema per shard, fixture berversi, kunci cache yang diturunkan dari lockfile
- Melakukan sharding pada rangkaian unit, integrasi, dan end-to-end sehingga durasi p95 berada di bawah delapan menit dengan keseimbangan shard dalam lima belas persen
- Menambahkan gerbang lint dan pemeriksaan tipe berbasis diff dengan anotasi, baseline yang di-commit, dan ratchet yang memblokir supresi tanpa justifikasi
- Menghasilkan kegagalan browser yang dapat didebug: trace, laporan HTML tergabung, dan checklist triase yang divalidasi terhadap bug yang ditanam
- Mengirim sistem karantina, termasuk job detektor, manifest pemilik, pengeluaran dari jalur wajib, dan pelaporan tingkat flake
- Menambahkan diff coverage dan job pengujian mutasi malam yang terbukti menangkap asersi yang dihapus
- Menyiapkan job beban k6 malam dengan baseline yang di-commit dan kegagalan berbasis ambang
- Menambahkan verifikasi kontrak dan job konsistensi migrasi, membuktikan perubahan konsumen menggagalkan CI penyedia sebelum merge
- Menerbitkan dashboard platform dan laporan biaya dari Modul 10

Luaran yang diharapkan adalah repositori ditambah runbook platform: diagram arsitektur pipeline dalam bentuk teks, definisi SLO dengan baseline terukur, kebijakan karantina, model biaya, dan template insiden yang dipakai ketika platform itu sendiri bermasalah. Penilai harus mampu merekonstruksi setiap keputusan desain dari runbook tanpa mewawancarai peserta.

## Kriteria Penilaian

- **Lab Mingguan (40%)**: Setiap lab dinilai berdasarkan apakah artifact-nya akan lolos review seorang engineer senior — matriks bersharding dengan keseimbangan terukur, hasil identik lintas eksekusi dari lingkungan hermetik, manifest karantina dengan pemilik nyata, gerbang beban yang gagal pada regresi nyata. Kredit parsial tidak diberikan untuk artifact yang hanya bekerja pada jalur bahagia.
- **Pengukuran Platform (20%)**: Setiap klaim tentang kecepatan, biaya, atau keandalan harus didukung angka dari eksekusi nyata. Peserta yang melakukan sharding tanpa melaporkan keseimbangan, atau caching tanpa melaporkan tingkat hit, kehilangan poin meskipun pipeline-nya bekerja.
- **Bukti Debugging (15%)**: Kegagalan harus dapat didiagnosis hanya dari artifact. Rangkaian end-to-end yang kegagalannya memerlukan pengulangan untuk dijelaskan dinilai belum lengkap.
- **Proyek Akhir (25%)**: Dinilai berdasarkan ketepatan keadaan akhir (semua cacat yang ditanam tertangkap oleh pipeline), pencapaian SLO yang terukur, kualitas runbook, dan apakah biaya platform dapat dipertanggungjawabkan pada volume pull request yang dinyatakan. Pipeline yang bekerja tanpa runbook memperoleh paling banyak setengah dari poin proyek.
- **Standar Kelulusan**: Semua lab dikumpulkan, platform memenuhi SLO latensi dan flake yang dinyatakan pada sepuluh pull request berturut-turut, satu rollback gerbang yang salah menilai dieksekusi, dan kebijakan karantina yang telah diterapkan pada tes flaky nyata alih-alih hanya dideskripsikan.

## Referensi

- [Dokumentasi GitHub Actions](https://docs.github.com/en/actions) — sintaks workflow, konkurensi, matriks, dan perilaku caching yang menjadi fondasi kursus ini
- [Referensi Sintaks Workflow](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions) — semantik `needs`, `concurrency`, `strategy`, dan `services`
- [Sharding dan Test Runner Playwright](https://playwright.dev/docs/test-sharding) — model paralelisasi dan pelaporan rangkaian browser pada Modul 3 dan 5
- [Referensi CLI Jest](https://jestjs.io/docs/cli) — opsi `--shard`, `--maxWorkers`, dan penggabungan coverage
- [pytest-xdist](https://pytest-xdist.readthedocs.io/) — eksekusi tes terdistribusi dan paralel untuk padanan Python dari disiplin yang sama
- [Ambang Batas dan Skenario k6](https://grafana.com/docs/k6/latest/) — pola load-test-as-code dan kegagalan berbasis ambang untuk Modul 8
- [Testcontainers](https://testcontainers.com/getting-started/) — pengujian dependensi dalam container yang dipakai modul integrasi
- [Dokumentasi Pact](https://docs.pact.io/) — pengujian kontrak berbasis konsumen dan gerbang deployment pada Modul 9
- [Stryker Mutator](https://stryker-mutator.io/docs/) — konfigurasi pengujian mutasi dan mode inkremental untuk Modul 7
- [actions/cache](https://github.com/actions/cache) — kunci cache, restore key, dan batasan cakupan yang dibahas pada Modul 2
- [Google Testing Blog: Ukuran Tes dan Flakiness](https://testing.googleblog.com/) — taksonomi flake yang mendasari Modul 6
- [Martin Fowler: Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) — argumen bentuk rangkaian tes di balik keputusan penahapan dan pemilihan tes

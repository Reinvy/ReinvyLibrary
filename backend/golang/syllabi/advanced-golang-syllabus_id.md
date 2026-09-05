---
title: "Silabus Optimasi Kinerja dan Profiling Go Tingkat Lanjut"
description: "Kurikulum lanjutan 12 minggu untuk pengembang Go berpengalaman yang mencakup benchmarking dengan ketelitian statistik, profiling CPU dan memori dengan pprof, escape analysis, penyetelan garbage collector, execution tracing, optimasi kompilator, pola kinerja jaringan dan konkurensi, serta rekayasa kinerja produksi."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Optimasi Kinerja dan Profiling Go Tingkat Lanjut

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang Go berpengalaman yang sudah menulis layanan produksi dan ingin menguasai rekayasa kinerja. Kurikulum ini melampaui sekadar "menulis kode yang lebih cepat" menuju ilmu pengukuran: benchmarking dengan ketelitian statistik, profiling CPU dan memori dengan `pprof`, escape analysis dan eliminasi alokasi, penyetelan garbage collector, execution tracing, internal optimasi kompilator, pola konkurensi tanpa kunci dan berlatensi rendah, kinerja jaringan dan I/O, serta pengelolaan anggaran kinerja di produksi.

Setiap modul memadukan teori mendalam dengan lab praktik yang mewajibkan profiling aplikasi nyata, membaca keluaran assembly, menafsirkan flame graph, dan menyetel runtime Go. Kursus ini diakhiri dengan proyek akhir di mana peserta mengambil layanan yang sudah ada, menetapkan baseline kinerja, mengoptimalkannya terhadap anggaran yang terukur, dan mempertahankan setiap optimasi dengan data profil.

Pada akhir kursus ini, peserta akan mampu mendiagnosis mengapa sebuah layanan Go lambat atau boros memori, membuktikan hipotesis dengan profil alih-alih menebak, menerapkan penyetelan runtime dan kompilator secara aman, merancang sistem konkurensi berthroughput tinggi, serta membangun budaya rekayasa kinerja di sekitar service level objective (SLO) yang terukur.

## Kurikulum

### Modul 1: Pola Pikir Kinerja dan Fondasi Pengukuran (Minggu 1)

- **Mengapa pengukuran didahulukan**
  - Kinerja adalah disiplin empiris: profil, hipotesis, optimasi, ukur ulang
  - Biaya premature optimization dan mitos kode yang "jelas lebih cepat"
  - Mendefinisikan anggaran kinerja: persentil latensi, throughput, laju alokasi
- **Menyiapkan laboratorium kinerja**
  - Pembangkitan beban yang dapat direproduksi dengan `hey`, `wrk`, atau generator kustom
  - Mengisolasi lingkungan: kuota CPU, batas cgroup, dan noisy neighbor
  - Mengumpulkan baseline sebelum mengubah kode apa pun
- **Fundamental latensi dan throughput**
  - Persentil (p50, p99, p999), tail latency, dan mengapa rata-rata menipu
  - Hukum Little dan hubungan antara konkurensi, latensi, dan throughput
  - Hukum Amdahl dan di mana percepatan paralel berhenti
- **Lab Praktik**: Tulis layanan HTTP kecil, bangkitkan beban dengan `hey`, dan catat laporan baseline persentil latensi serta throughput

### Modul 2: Benchmarking dengan Ketelitian Statistik (Minggu 2)

- **Kerangka kerja benchmarking Go**
  - Siklus hidup `testing.B`: `b.ResetTimer`, `b.ReportAllocs`, `b.SetBytes`
  - Konvensi penamaan benchmark dan sintaks filter `-bench`
  - Benchmarking dengan bendera `-benchtime`, `-count`, dan `-cpu`
- **Validitas benchmark**
  - Menghindari eliminasi oleh kompilator dengan `//go:noinline` dan variabel sink
  - Jerat dead-code elimination dan cara menjaga hasil tetap jujur
  - Efek pemanasan, resolusi timer, dan derau latar
- **Membandingkan hasil**
  - `benchstat` untuk perbandingan statistik antar hasil benchmark
  - Memahami varians: deviasi standar, interval kepercayaan, dan pencilan
  - Mendeteksi regresi dengan `benchstat` di CI
- **Benchmark yang sadar alokasi**
  - Membaca `B/op` (byte per operasi) dan `allocs/op`
  - Keluaran `-benchmem` dan apa yang diungkapkan oleh jumlah alokasi
- **Lab Praktik**: Buat benchmark tiga strategi penggabungan string, publikasikan hasilnya dengan `benchstat`, dan identifikasi pola alokasi masing-masing

### Modul 3: Profiling CPU dengan pprof (Minggu 3)

- **Alur kerja pprof**
  - Mengimpor `net/http/pprof` dan `runtime/pprof` dengan benar
  - Menangkap profil CPU: `go tool pprof` dengan `-seconds`
  - Perbedaan antara profil sampling dan trace penuh
- **Membaca keluaran profil**
  - Perintah `top` serta biaya kumulatif vs flat
  - Flame graph dengan `-http` dan antarmuka web interaktif
  - `peek`, `list`, dan `disasm` untuk membedah fungsi panas
- **Investigasi berbasis profil**
  - Mengorelasikan titik panas CPU dengan logika bisnis
  - Mengenali pola titik panas umum: penanganan string, refleksi, boxing, syscall
  - Bias sampling dan pentingnya workload yang representatif
- **Profiling berkelanjutan**
  - Profil terpicu `runtime/pprof` dan `net/http/pprof` di produksi
  - Menyimpan profil untuk perbandingan antar rilis
- **Lab Praktik**: Profil layanan pemrosesan JSON yang sengaja dibuat tidak efisien, identifikasi tiga titik panas teratas, dan verifikasi perbaikan dengan profil sebelum/sesudah

### Modul 4: Profiling Memori dan Analisis Heap (Minggu 4)

- **Profil heap**
  - `runtime.MemStats` dan kapan menggunakan profil heap sebagai gantinya
  - `go tool pprof -alloc_space` vs `-alloc_objects` vs `-inuse_space`
  - Membaca grafik heap: siapa yang mengalokasikan dan siapa yang menahan
- **Menemukan kebocoran memori**
  - Membedakan kebocoran asli dari pertumbuhan yang disebabkan cache dan pool
  - Profil objek hidup dengan `-inuse_space` untuk menemukan titik retensi
  - Profil `runtime/pprof.Lookup("goroutine")` untuk kebocoran goroutine
- **Akuntansi memori**
  - Kolom `runtime.MemStats`: `HeapAlloc`, `HeapInuse`, `HeapObjects`, `Sys`
  - Memahami memori yang tidak muncul di profil heap
  - Pertumbuhan RSS vs heap Go: memori cgo, region mmap, dan akuntansi tingkat OS
- **Lab Praktik**: Suntikkan kebocoran goroutine dan kebocoran objek tertahan ke sebuah layanan, temukan keduanya dengan profil, dan perbaiki dengan verifikasi

### Modul 5: Escape Analysis dan Optimasi Alokasi (Minggu 5)

- **Stack vs heap**
  - Bagaimana kompilator memutuskan tempat sebuah nilai hidup
  - `go build -gcflags="-m"` dan membaca keluaran escape analysis
  - Mengapa alokasi heap lebih mahal daripada alokasi stack
- **Escape analysis dalam praktik**
  - Pemicu escape umum: mengembalikan pointer, interface boxing, closure, map dan slice
  - Konversi interface dan mengapa ia mengalokasikan
  - Interaksi inlining: kapan inlining mengubah perilaku escape
- **Teknik eliminasi alokasi**
  - Value receiver vs pointer receiver dan dampaknya terhadap alokasi
  - `sync.Pool` untuk buffer scratch yang dapat digunakan ulang
  - Menggunakan ulang slice dan menghindari pertumbuhan `append`
  - Pembuatan string tanpa alokasi dengan `strings.Builder` dan buffer `[]byte`
- **Lab Praktik**: Ambil fungsi parsing yang panas, baca keluaran `-gcflags="-m"`, eliminasi setidaknya 80% alokasi, dan verifikasi dengan `-benchmem`

### Modul 6: Garbage Collector dan Penyetelan Runtime (Minggu 6)

- **Cara kerja GC Go**
  - Concurrent mark-and-sweep, write barrier, dan siklus GC
  - Penentuan kecepatan GC: hubungan antara laju alokasi, pertumbuhan heap, dan `GOGC`
  - Heuristik default 100% `GOGC` dan trade-off-nya
- **Menyetel GC**
  - `GOGC` dan `GOMEMLIMIT` sebagai kenop yang saling melengkapi
  - `debug.SetMemoryLimit` untuk kontrol memori yang sadar container
  - Batas memori soft vs hard dan implikasi latensinya
  - Kapan TIDAK menyetel: biaya melawan heuristik default
- **Desain yang sadar GC**
  - Mengurangi kepadatan pointer pada struktur data panas
  - Dampak `sync.Pool` terhadap tekanan GC
  - Mengukur biaya GC dengan `GODEBUG=gctrace=1` dan execution trace
- **Lab Praktik**: Jalankan layanan yang sensitif latensi di bawah beban, eksperimen dengan pengaturan `GOGC` dan `GOMEMLIMIT`, dan dokumentasikan trade-off latensi/throughput untuk setiap konfigurasi

### Modul 7: Execution Tracing dan Analisis Latensi (Minggu 7)

- **Execution tracer Go**
  - Menangkap trace dengan `runtime/trace` dan `go test -trace`
  - Penampil trace: status goroutine, blok jaringan, syscall, peristiwa GC
  - Menemukan latensi dalam penjadwalan: goroutine runnable vs running
- **Internal penjadwalan goroutine**
  - Model M-P-G: machine, processor, goroutine
  - Preemption, `GOMAXPROCS`, dan kapan menyesuaikannya
  - Pemblokiran pada channel, mutex, dan I/O jaringan
- **Alur kerja analisis latensi**
  - Melacak jalur permintaan ujung-ke-ujung melalui sebuah layanan
  - Mengorelasikan peristiwa trace dengan latensi p99
  - Mengidentifikasi lock contention, kemacetan syscall, dan jeda GC
- **Lab Praktik**: Tangkap execution trace dari pipeline konkuren, identifikasi penundaan penjadwalan terpanjang, dan susun ulang pipeline untuk mengurangi tail latency

### Modul 8: Optimasi Kompilator dan Inspeksi Assembly (Minggu 8)

- **Apa yang dilakukan kompilator Go untuk Anda**
  - Inlining: biaya, manfaat, dan anggaran inlining
  - Bounds check elimination dan escape analysis sebagai optimasi
  - Constant propagation, dead code elimination, dan strength reduction
- **Membaca assembly**
  - `go tool compile -S` dan `go build -gcflags="-S"`
  - Mengidentifikasi alokasi dalam keluaran assembly (panggilan `runtime.newobject`)
  - Bounds check dan bagaimana `//go:noescape` serta `//go:nosplit` memengaruhi codegen
- **Direktif kompilator**
  - `//go:noinline`, `//go:noescape`, `//go:uintptrescapes` beserta risikonya
  - Kapan direktif adalah alat yang tepat dan kapan bukan
  - Build tag untuk optimasi spesifik arsitektur
- **Lab Praktik**: Kompilasi loop panas dengan `-S`, temukan tiga alokasi atau bounds check yang tidak perlu, dan eliminasi dengan perubahan tingkat sumber yang diverifikasi melalui disassembly

### Modul 9: Pola Kinerja Konkurensi (Minggu 9)

- **Penskalaan dengan goroutine**
  - Biaya pembuatan goroutine dan pembatasan konkurensi dengan semaphore
  - Worker pool: ukuran, backpressure, dan pengurasan yang mulus
  - Fan-out/fan-in dan penyetelan throughput pipeline
- **Desain tanpa kunci dan kontensi rendah**
  - Operasi `sync/atomic` dan kapan operasi ini mengalahkan mutex
  - `atomic.Pointer` dan pembacaan tanpa kunci
  - Sharded lock dan striped map untuk mengurangi kontensi
  - Biaya `sync.RWMutex` di bawah beban baca-berat dan tulis-berat
- **Kinerja channel**
  - Channel buffered vs unbuffered dan semantik rendezvous
  - Alokasi dan daur ulang channel
  - Kapan channel lebih lambat daripada mutex dan sebaliknya
- **Lab Praktik**: Bangun dispatcher tugas berbatas laju, buat benchmark implementasi berbasis mutex vs sharded vs atomic di bawah kontensi, dan publikasikan hasil penskalaannya

### Modul 10: Kinerja Jaringan dan I/O (Minggu 10)

- **Netpoller dan I/O non-blocking**
  - Bagaimana Go melakukan multipleks soket tanpa satu thread per koneksi
  - `GOMAXPROCS` dan throughput jaringan
  - Ukuran buffer baca/tulis serta `SetReadBuffer`/`SetWriteBuffer`
- **Kinerja server HTTP**
  - Penyetelan `http.Server`: `ReadTimeout`, `WriteTimeout`, `IdleTimeout`, `MaxHeaderBytes`
  - Penggunaan ulang koneksi, keep-alive, dan multipleksing HTTP/2
  - Penyetelan klien `http.Transport`: `MaxIdleConns`, `MaxConnsPerHost`, `MaxIdleConnsPerHost`
- **Pola I/O throughput tinggi**
  - Mengelompokkan penulisan dan mengurangi frekuensi syscall
  - `bufio` dan pembaca/penulis buffer kustom
  - Jalur zero-copy dengan `io.Copy` dan dukungan `sendfile`
- **Lab Praktik**: Setel layanan proxy HTTP untuk 10.000 koneksi bersamaan, ukur throughput dan latensi p99 sebelum serta sesudah setiap perubahan `http.Server` dan `Transport`

### Modul 11: Rekayasa Kinerja di Produksi (Minggu 11)

- **Membangun SLO kinerja**
  - Memilih target latensi dan error budget yang sesuai ekspektasi pengguna
  - Instrumentasi dengan `expvar`, metrik Prometheus, dan OpenTelemetry
  - Histogram dan bahaya rata-rata timer yang naif
- **Load testing dan perencanaan kapasitas**
  - Merancang load test yang realistis: skenario ramp-up, soak, dan spike
  - Menemukan titik jenuh dan merencanakan ruang kepala
  - Sinyal auto-scaling: CPU, kedalaman antrean, dan latensi p99
- **Pemantauan kinerja berkelanjutan**
  - Pelacakan baseline di CI dengan `benchstat` dan gerbang benchmark
  - Profiling produksi tanpa overhead: interval sampling dan rotasi profil
  - Playbook insiden: apa yang harus ditangkap saat latensi melonjak
- **Lab Praktik**: Tambahkan histogram latensi dan SLO p99 ke sebuah layanan, jalankan soak test, dan produksi runbook kinerja yang mendokumentasikan keputusan penyetelan selama kursus

### Modul 12: Proyek Akhir (Minggu 12)

- **Spesifikasi proyek**
  - Pilih layanan Go yang sudah ada (dari pekerjaan peserta atau layanan contoh kursus) dan tetapkan anggaran kinerja yang terukur: latensi p99, throughput, dan laju alokasi
  - Target yang disarankan: key-value store dalam memori, pipeline agregasi log, API gateway berbatas laju, atau agregator metrik real-time
- **Alur kerja optimasi**
  - Minggu 1-3 proyek: tetapkan baseline dengan profiling dan tracing
  - Minggu 4-8 proyek: terapkan optimasi alokasi, GC, konkurensi, dan I/O satu per satu
  - Minggu 9-12 proyek: verifikasi setiap perubahan dengan benchmark dan profil, lalu jalankan ulang load test
- **Hasil akhir**
  - Laporan kinerja dengan flame graph sebelum/sesudah, tabel `benchstat`, dan hasil load test
  - Log keputusan terdokumentasi yang menjelaskan mengapa setiap optimasi diterapkan
  - Runbook untuk mereproduksi pengukuran dan memantau layanan

## Proyek Akhir

Peserta akan mengambil layanan Go yang sudah ada, menetapkan anggaran kinerja yang eksplisit, dan mengoptimalkannya untuk memenuhi anggaran tersebut dengan setiap perubahan yang dibenarkan oleh data profil. Proyek harus menunjukkan:

- **Baseline yang terukur**: profil CPU, profil heap, execution trace, dan laporan load test yang ditangkap sebelum optimasi apa pun
- **Setidaknya lima optimasi terverifikasi** di setidaknya tiga kategori: eliminasi alokasi, penyetelan GC/runtime, restrukturisasi konkurensi, perubahan tingkat kompilator, atau penyetelan jaringan/I-O
- **Ketelitian statistik**: perbandingan `benchstat` untuk micro-benchmark dan load test dengan metodologi yang dapat diulang
- **Laporan kinerja** dengan flame graph, profil alokasi, histogram latensi, dan angka throughput sebelum serta sesudah
- **Log keputusan** yang mendokumentasikan setiap hipotesis, bukti untuk hipotesis tersebut, dan hasil terukur
- **Runbook produksi** yang mencakup sinyal pemantauan, SLO, dan langkah respons insiden untuk regresi latensi

Contoh ide proyek:

- **Key-Value Store Dalam Memori**: Layanan `GET`/`SET` berthroughput tinggi dengan anggaran latensi p99 di bawah 1 ms pada 50 ribu permintaan per detik, menggunakan sharded map, pembacaan atomik, dan penyetelan GC
- **Pipeline Agregasi Log**: Layanan penerimaan konkuren yang memproses 100 MB/detik baris log dengan laju alokasi terbatas, menggunakan worker pool, buffer `sync.Pool`, dan penulisan berkelompok
- **API Gateway Berbatas Laju**: Proksi yang menerapkan rate limit per penyewa dengan anggaran overhead p99 sebesar 500 mikrodetik, menggunakan token bucket, penghitung sharded, dan operasi atomik
- **Agregator Metrik Real-Time**: Layanan berbasis WebSocket yang menggabungkan jutaan pembaruan penghitung per detik dengan struktur data tanpa kunci dan batas memori tetap

## Kriteria Penilaian

- **Lab Mingguan (30%)**
  - 10 lab bernilai (Minggu 1-11, tidak termasuk minggu proyek akhir)
  - Setiap lab mensyaratkan analisis tertulis: hipotesis, bukti profil, dan hasil terukur
  - Dinilai berdasarkan ketepatan metodologi pengukuran, kualitas optimasi, dan kejujuran pelaporan
  - Keterlambatan pengumpulan dikenai penalti 10% per hari

- **Kuis (20%)**
  - 4 kuis (akhir Minggu 3, 6, 9, 11)
  - Campuran pertanyaan konseptual dan latihan interpretasi profil
  - Peserta harus menafsirkan flame graph, keluaran `benchstat`, dan log `gctrace`
  - Nilai kelulusan minimum 70% untuk melanjutkan ke proyek akhir

- **Proyek Akhir (40%)**
  - Kualitas baseline dan metodologi pengukuran (10%)
  - Jumlah dan kedalaman optimasi terverifikasi (10%)
  - Pencapaian anggaran kinerja yang dideklarasikan (10%)
  - Kualitas laporan kinerja dan log keputusan (10%)

- **Partisipasi dan Tinjauan Kode (10%)**
  - Tinjauan rekan atas dua laporan kinerja peserta lain
  - Kritik konstruktif terhadap metodologi pengukuran, bukan hanya gaya kode
  - Kualitas dokumentasi runbook dan definisi SLO

## Referensi

- [Dokumentasi pprof](https://go.dev/doc/diagnostics) — Panduan diagnostik resmi Go yang mencakup profil CPU, heap, goroutine, dan mutex
- [Paket runtime/metrics](https://pkg.go.dev/runtime/metrics) — Metrik runtime stabil dan berversi untuk pemantauan produksi
- [Blog Go: Profiling Program Go](https://go.dev/blog/pprof) — Pengantar klasik Russ Cox tentang pprof
- [Blog Go: Execution Tracer Go](https://go.dev/blog/trace) — Panduan execution tracer dan penampilnya
- [Blog Go: GOMEMLIMIT dan penyetelan GC](https://go.dev/blog/gomemlimit) — Panduan resmi tentang batas memori dan penyetelan garbage collector
- [Bendera kompilator dan escape analysis](https://pkg.go.dev/cmd/go) — Bendera `go build` termasuk `-gcflags` dan `-m`
- [benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat) — Perbandingan statistik hasil benchmark
- [Buku Kerja SRE Google: SLO](https://sre.google/workbook/implementing-slos/) — Panduan praktis service level objective dan error budget
- [Ultimate Go Software Design](https://github.com/ardanlabs/gotraining) — Materi pelatihan Ardan Labs dengan konten kinerja tingkat lanjut

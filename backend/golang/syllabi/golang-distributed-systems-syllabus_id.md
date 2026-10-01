---
title: "Silabus Rekayasa Sistem Terdistribusi Go"
description: "Kurikulum lanjutan 12 minggu untuk pengembang Go berpengalaman yang mencakup teori sistem terdistribusi, konsensus Raft, koordinasi terdistribusi dengan etcd, replikasi dan partisi, saga dan pola outbox, event streaming, service discovery, ketahanan terhadap kegagalan, observabilitas, dan desain aplikasi terdistribusi yang aman."
category: "backend"
technology: "golang"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Rekayasa Sistem Terdistribusi Go

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang Go berpengalaman yang sudah mampu membangun layanan web produksi dan ingin menguasai lapisan sistem terdistribusi di baliknya. Go adalah bahasa era cloud-native — etcd, Kubernetes, Consul, dan CockroachDB semuanya ditulis dalam Go — karena goroutine, channel, dan biner statisnya membuat koordinasi terdistribusi menjadi praktis. Kursus ini mengajarkan teori dan praktik membangun sistem yang membentang di banyak mesin: konsensus dengan Raft, koordinasi dengan etcd, replikasi berbasis kuorum, consistent hashing dan partisi, transaksi terdistribusi melalui saga dan pola outbox, event streaming, service discovery, pola ketahanan seperti circuit breaker dan bulkhead, distributed tracing, serta keamanan zero-trust dengan mTLS.

Setiap modul memadukan teori fundamental dengan lab praktik yang mewajibkan menulis, menjalankan, dan merusak program Go terdistribusi yang nyata. Kursus ini diakhiri dengan proyek akhir di mana peserta membangun key-value store yang direplikasi dan toleran terhadap kegagalan atau platform microservice berbasis event kecil, lalu memvalidasinya dengan eksperimen chaos.

Pada akhir kursus ini, peserta akan mampu bernalar secara presisi tentang konsistensi, ketersediaan, dan toleransi partisi; mengimplementasikan atau mengintegrasikan primitif konsensus dan koordinasi; merancang strategi replikasi dan partisi yang cocok dengan pola akses data; membuat transaksi terdistribusi aman dengan saga dan tabel outbox; serta mengoperasikan sistem tersebut dengan tracing, log terstruktur, dan pengujian chaos.

## Kurikulum

### Modul 1: Fondasi Sistem Terdistribusi (Minggu 1)

- **Mengapa sistem terdistribusi itu sulit**
  - Kesalahpahaman komputasi terdistribusi dan mana yang sering dilanggar proyek Go
  - Kegagalan parsial sebagai kondisi default, bukan pengecualian: mesin mogok, jaringan terpartisi, jam melenceng
  - Keandalan jaringan: paket bisa hilang, digandakan, diurutkan ulang, atau tertunda
- **Konsistensi, ketersediaan, dan partisi**
  - Teorema CAP (Brewer): apa yang sebenarnya diklaim dan apa yang tidak
  - Trade-off CP vs AP di sistem nyata (etcd adalah CP, store gaya Dynamo adalah AP)
  - Konsistensi dinamis: linearizability, konsistensi sekuensial, konsistensi kausal, konsistensi eventual
- **Waktu dan pengurutan dalam sistem terdistribusi**
  - Mengapa jam dinding bohong: skew jam, NTP, dan pendekatan TrueTime Google
  - Lamport clock dan pelacakan kausalitas dengan vector clock
  - Urutan total vs urutan parsial dan mengapa partisi Kafka memberi urutan total per kunci
- **Lab Praktik**: Jalankan dua node layanan Go yang terhubung lewat koneksi ala `net.Pipe`, induksi pengurutan ulang dan duplikasi dengan transport penyuntik kegagalan, lalu amati efeknya pada penghitung naif

### Modul 2: Komunikasi Jarak Jauh dan RPC di Go (Minggu 2)

- **Merancang batas layanan**
  - Kapan pemanggilan fungsi sebaiknya menjadi RPC dan kapan tidak
  - Kontrak API: versioning, kompatibilitas mundur, dan evolusi skema
  - Kunci idempotensi: membuat operasi yang aman untuk diulang sejak awal
- **Framework dan protokol RPC**
  - `net/rpc`, gRPC, dan ConnectRPC: kelebihan dan trade-off untuk sistem terdistribusi
  - Varian streaming RPC (unary, server, client, bidirectional) dan kapan masing-masing cocok
  - Multipleksing HTTP/2 dan penggunaan ulang koneksi dengan gRPC
- **Serialisasi dan kinerja**
  - JSON vs protobuf vs messagepack: trade-off skema, ukuran, dan CPU
  - Menangani field tak dikenal dan kompatibilitas maju
  - Kompresi di lapisan transport vs lapisan pesan
- **Deadline dan propagasi konteks**
  - Menyebarkan deadline dan pembatalan `context.Context` melintasi batas RPC
  - Pola `WithTimeout` di `grpc-go` dan mengapa deadline mencegah kegagalan berantai
- **Lab Praktik**: Bangun rantai tiga layanan dengan gRPC, sebarkan deadline 500 ms dari pemanggil, dan buktikan seluruh rantai membatalkan saat deadline habis

### Modul 3: Konsensus dan Algoritma Raft (Minggu 3)

- **Masalah konsensus**
  - Mengapa pemilihan pemimpin dan kesepakatan log yang direplikasi butuh protokol, bukan strategi
  - Ketidakmungkinan FLP dan artinya bagi sistem praktis
  - Paxos dalam satu paragraf (mengapa Raft ada)
- **Fondasi Raft**
  - Status server: leader, follower, candidate, dan timeout yang mendorong transisi
  - Nomor term dan timeout pemilihan acak
  - Log entry, commit index, dan heartbeat append-entries dari leader
- **Sifat keamanan Raft**
  - Election safety dan properti kelengkapan leader
  - Log matching dan log entry hanya dari term berjalan
  - Peran kuorum: `(n/2 + 1)` dan apa yang terjadi di bawahnya
- **Raft di Go**
  - Membaca `etcd/raft` dan `hashicorp/raft`: abstraksi apa yang masing-masing sediakan
  - Antarmuka FSM `hashicorp/raft`: `Apply`, `Snapshot`, `Restore`
  - Mengintegrasikan pustaka Raft ke layanan ter-replikasi sederhana
- **Lab Praktik**: Jalankan cluster `hashicorp/raft` tiga node secara lokal, matikan leader, amati leader baru terpilih, dan buktikan log yang direplikasi konvergen

### Modul 4: Koordinasi Terdistribusi dengan etcd (Minggu 4)

- **Perangkat koordinasi**
  - Distributed lock, lease, pemilihan pemimpin, dan mengapa semuanya butuh konsensus di bawahnya
  - etcd sebagai store koordinasi kanonis Go
- **Lease dan TTL**
  - Membuat lease, memberikan TTL, dan memperbaruinya di dalam loop heartbeat
  - Apa yang terjadi pada kunci ber-lease saat client mati
- **Pola pemilihan pemimpin**
  - `NewSession` + `NewElection` pada `clientv3/concurrency`: pola campaign/proclaim
  - Menangani pergantian kepemimpinan: serah terima state dan demosi yang anggun
  - Membandingkan pemilihan pemimpin etcd dengan pemilihan internal Raft (masalah yang berbeda!)
- **Distributed lock yang benar**
  - Mutex `clientv3/concurrency` dan jaminan berbasis kuorumnya
  - Identifikasi pemegang lock, fencing token, dan mengapa lock saja tidak cukup
- **Service discovery dengan etcd**
  - Mendaftarkan instance di bawah prefix dan mengamati perubahannya
  - API `watch`, nomor revisi, dan menghindari update yang terlewat
- **Lab Praktik**: Bangun worker failover: dua worker Go mengikuti pemilihan kepemimpinan di etcd; saat leader mati, follower harus mengambil alih dalam satu periode lease

### Modul 5: Replikasi dan Partisi (Minggu 5)

- **Strategi replikasi**
  - Replikasi single-leader (primary-secondary), multi-leader, dan tanpa leader
  - Replikasi sinkron vs asinkron dan trade-off durabilitas/ketersediaan
  - Konsistensi read-your-writes dan monotonic read untuk follower asinkron
- **Sistem kuorum**
  - Baca dan tulis kuorum dengan nomor versi: `W + R > N`
  - Read repair, anti-entropy, dan hinted handoff
  - Kuorum ala Raft vs sloppy quorum gaya Dynamo
- **Mempartisi data**
  - Partisi rentang vs partisi hash dan perilaku hotspot
  - Consistent hashing dengan virtual node dan mengapa rebalancing tetap kecil
  - Indeks sekunder lintas partisi: scatter-gather
- **Sticky session dan perutean permintaan**
  - Membuat layanan Go ter-shard merutekan permintaan ke shard yang tepat
  - Migrasi shard saat keanggotaan berubah tanpa downtime
- **Lab Praktik**: Implementasikan consistent hashing di Go dengan virtual node, tambah dan hapus node, lalu ukur berapa sedikit kunci yang berpindah pada setiap perubahan keanggotaan

### Modul 6: Transaksi Terdistribusi, Saga, dan Pola Outbox (Minggu 6)

- **Mengapa ACID tidak membentang antar layanan**
  - Transaksi lokal vs transaksi global dan masalah 2PC
  - Kapan 2PC dapat diterima (kecil, tepercaya, satu lokasi) dan kapan tidak
- **Orkestrasi dan koreografi saga**
  - Saga terorkestrasi: koordinator yang memanggil aksi kompensasi
  - Saga terkoreografi: layanan bereaksi terhadap event dan memancarkan kompensasi
  - Desain transaksi kompensasi: apa yang terjadi saat kompensasi itu sendiri gagal
- **Pola outbox**
  - Menulis baris bisnis dan baris outbox dalam satu transaksi lokal
  - Worker relay Go yang memindai outbox dan menerbitkan event
  - Pengiriman exactly-once-ish: at-least-once + konsumen idempoten
- **Idempotensi dalam praktik**
  - Kunci idempotensi, tabel dedupe, dan menyimpan ID event yang telah diproses
  - Idempotensi alami: `INSERT ... ON CONFLICT DO NOTHING` untuk konsumen event
- **Lab Praktik**: Bangun pasangan layanan order + payment di mana pembuatan order memakai transactional outbox, relay menerbitkan event, dan payment mengonsumsinya secara idempoten dengan tabel dedupe

### Modul 7: Event Streaming dan Messaging (Minggu 7)

- **Message broker vs event stream**
  - Antrean (NATS JetStream, RabbitMQ) vs stream berbasis log (Kafka, Redpanda)
  - Semantik at-least-once vs at-most-once vs exactly-once dan apa yang dibutuhkan masing-masing
  - Consumer group, offset, dan replay: kekuatan log
- **Pola streaming di Go**
  - Kafka/Redpanda dengan `franz-go` atau `segmentio/kafka-go`: API producer dan consumer
  - NATS JetStream untuk antrean durable ringan dengan `nats.go`
  - Memilih partisi gaya Kafka vs subject NATS
- **Event sourcing dan CQRS**
  - Event sebagai sumber kebenaran; state sebagai proyeksi
  - Membangun ulang proyeksi, versioning event, dan migrasi
  - Kapan event sourcing menguntungkan dan kapan berlebihan
- **Backpressure dan flow control**
  - Konkurensi konsumen terbatas dan urutan pemrosesan per partisi
  - Dead-letter queue dan poison message
- **Lab Praktik**: Alirkan umpan event telemetri melalui Redpanda (atau NATS JetStream), proses dengan consumer group, dan demonstrasikan replay dari offset yang telah di-commit setelah crash

### Modul 8: Service Discovery dan Load Balancing (Minggu 8)

- **Dari alamat hard-coded menuju discovery**
  - DNS round-robin, record SRV, dan mengapa alamat tetap rusak di dalam container
  - Discovery berbasis registry: Consul, etcd, dan DNS native Kubernetes
  - Load balancing sisi client vs sisi server
- **Consul untuk layanan Go**
  - Mendaftarkan layanan dengan health check via API Consul
  - Pola watch `hashicorp/consul/api` untuk perubahan topologi
- **Load balancing gRPC**
  - `WithDefaultServiceConfig` pada `grpc-go` dengan `round_robin` dan `pick_first`
  - Balancing berbasis xDS dengan `grpc-go` dan Envoy
- **Health check dan readiness**
  - Semantik liveness vs readiness dan apa yang dilakukan load balancer terhadap masing-masing
- **Lab Praktik**: Daftarkan dua instance layanan HTTP Go di Consul, bangun client Go yang mengamati perubahan layanan, dan lakukan failover dengan mematikan satu instance

### Modul 9: Ketahanan terhadap Kegagalan dan Resiliensi (Minggu 9)

- **Pola resiliensi**
  - Timeout, retry dengan exponential backoff dan jitter, serta masalah retry storm
  - Circuit breaker: status closed, open, half-open dan `sony/gobreaker` di Go
  - Bulkhead: mengisolasi domain kegagalan dengan batas konkurensi per dependensi
- **Strategi backoff dan jitter**
  - Full jitter vs equal jitter vs decorrelated jitter dan profil beban clientnya
  - Retry terbatas dengan anggaran deadline keseluruhan
- **Propagasi error dan degradasi yang anggun**
  - Fallback, penyajian cache basi, dan degradasi per-permintaan
  - Keputusan kebijakan fail-fast vs fail-soft per dependensi
- **Pengujian chaos**
  - Menyuntikkan latensi, kehilangan paket, dan kegagalan proses di staging dengan proxy injeksi kegagalan Go
  - Runbook game day: apa yang harus diuji sebelum mengandalkan sebuah pola
- **Lab Praktik**: Bungkus dependensi yang tidak stabil dengan `gobreaker` + retry dengan full jitter, bangkitkan kegagalan sintetis, dan buat grafik perilaku pemulihan di bawah beban

### Modul 10: Observabilitas untuk Sistem Terdistribusi (Minggu 10)

- **Tiga pilar**
  - Log terstruktur, metrik, dan trace terdistribusi — dan apa yang masing-masing bisa dan tidak bisa katakan
  - ID korelasi yang disebarkan melalui setiap batas layanan
- **Distributed tracing**
  - OpenTelemetry di Go: penyiapan tracer `go.opentelemetry.io/otel` dan siklus hidup span
  - Menyebarkan konteks trace dengan interceptor gRPC dan middleware HTTP
  - Strategi sampling: head-based vs tail-based untuk sistem bervolume tinggi
- **Metrik yang penting**
  - Metodologi RED (rate, errors, duration) dan USE (utilization, saturation, errors)
  - Histogram, summary, dan dukungan exemplar `prometheus/client_golang`
  - Perangkap kardinalitas metrik di layanan Go
- **Log terstruktur**
  - `log/slog` dengan keluaran JSON dan ID trace di setiap record
  - Kontrol volume log: sampling, level, dan event yang dipertahankan untuk audit
- **Lab Praktik**: Instrumentasikan rantai tiga layanan dari Modul 2 dengan OpenTelemetry, ekspor trace ke collector lokal, dan gunakan ID korelasi untuk menelusuri satu permintaan di ketiga layanan

### Modul 11: Keamanan untuk Sistem Terdistribusi (Minggu 11)

- **Threat modeling untuk layanan**
  - Batas kepercayaan antar layanan dan apa yang melintasinya
  - Postur default-deny: tidak ada layanan yang memercayai layanan lain secara implisit
- **mTLS dan identitas layanan**
  - Mutual TLS: sertifikat client X.509 untuk setiap pasangan layanan
  - Penerbitan sertifikat dengan SPIRE atau cert-manager dan sertifikat berumur pendek
  - Mengimplementasikan mTLS dengan `ClientAuth: tls.RequireAndVerifyClientCert` pada `crypto/tls` Go
- **Autentikasi dan otorisasi**
  - Autentikasi layanan-ke-layanan: JWT bertanda tangan, ID SPIFFE, atau API key
  - Otorisasi berskop: least privilege antar layanan, bukan hanya untuk pengguna
- **Manajemen secret**
  - Tidak pernah mengirim secret dalam biner atau file env untuk produksi
  - Integrasi Vault atau KMS cloud dari Go, dengan rotasi secret
- **Perlindungan data**
  - Enkripsi dalam perjalanan (selalu mTLS/TLS) dan enkripsi saat disimpan
  - Melindungi payload sensitif dalam log dan trace (redaksi)
- **Lab Praktik**: Bangkitkan CA dan sertifikat server/client, tegakkan mTLS antara dua layanan Go, dan buktikan client tanpa sertifikat bertanda tangan ditolak

### Modul 12: Proyek Akhir (Minggu 12)

- Bangun **key-value store terdistribusi yang direplikasi dan toleran kegagalan** di Go, atau **platform microservice berbasis event kecil**, lalu validasi di bawah kegagalan
- Harus mendemonstrasikan setidaknya lima hal berikut: konsensus via pustaka Raft, pemilihan pemimpin berbasis etcd, partisi kuorum atau consistent hash, transactional outbox, event streaming dengan replay, service discovery, circuit breaker, distributed tracing, dan mTLS
- Jalankan eksperimen chaos terkontrol: matikan node, partisi jaringan, atau suntikkan latensi, lalu buktikan sistem pulih dalam SLO yang dinyatakan
- Tulis runbook operasional yang mendokumentasikan mode kegagalan, langkah pemulihan, dan sinyal pemantauan

## Proyek Akhir

Peserta akan merancang, membangun, dan mengoperasikan sistem Go terdistribusi yang bertahan dari kegagalan nyata, dengan setiap keputusan arsitektur dijustifikasi terhadap teori dari kursus.

- **Pilih satu sistem utama**:
  - **Key-value store ter-replikasi**: store CP berbasis `hashicorp/raft` dengan API HTTP/gRPC, cluster multi-node, dan jaminan konsistensi berbasis kuorum, divalidasi dengan mematikan leader di tengah penulisan
  - **Platform order berbasis event**: dua atau tiga layanan (order, payment, inventory) yang terhubung oleh stream pesan, transactional outbox untuk pembuatan order, konsumen idempoten, dan saga yang melakukan kompensasi saat payment gagal
- **Bukti yang diperlukan**:
  - Dokumen arsitektur di README: model konsistensi, strategi replikasi, asumsi kegagalan, dan trade-off CAP yang dibuat desain
  - Laporan pengujian chaos: setidaknya tiga kegagalan yang disuntikkan (mati node, partisi jaringan, dependensi lambat) dengan garis waktu pemulihan yang diamati
  - Distributed tracing yang menunjukkan satu permintaan end-to-end di semua layanan
  - Bagian keamanan: bagaimana layanan saling mengautentikasi dan di mana secret disimpan
- **Presentasi**: walkthrough 15 menit yang menjelaskan apa yang rusak, bagaimana sistem mendeteksinya, dan bagaimana sistem pulih

## Kriteria Penilaian

- **Lab Mingguan (30%)**
  - 10 lab yang dinilai di Minggu 1-11 (Modul 1-10), masing-masing menghasilkan program Go yang berfungsi plus tulisan satu halaman tentang perilaku yang diamati
  - Dinilai berdasarkan kebenaran perilaku terdistribusi, bukan sekadar gaya kode — lab harus mendemonstrasikan sifat kegagalan/konsistensi yang diuji
  - Keterlambatan pengumpulan dikenai penalti 10% per hari

- **Kuis (20%)**
  - 4 kuis di akhir Minggu 3, 6, 9, dan 11
  - Pertanyaan konseptual tentang CAP, keamanan Raft, kuorum, saga, dan pola resiliensi
  - Peserta harus mampu menelusuri skenario kegagalan dan memprediksi perilaku sistem
  - Tingkat kelulusan minimum 70% diperlukan untuk melanjutkan ke proyek akhir

- **Proyek Akhir (40%)**
  - Kualitas arsitektur: model konsistensi, partisi, dan asumsi kegagalan dinyatakan dengan jelas (10%)
  - Kebenaran di bawah chaos: sistem memenuhi SLO yang dinyatakan selama kegagalan yang disuntikkan (15%)
  - Kualitas rekayasa: organisasi kode, pengujian, dan integrasi observabilitas (10%)
  - Kualitas runbook dan presentasi akhir (5%)

- **Partisipasi dan Code Review (10%)**
  - Peer review atas desain proyek akhir dua peserta lain sebelum implementasi
  - Kritik konstruktif atas penalaran mode kegagalan dan pilihan konsistensi
  - Kehadiran dan partisipasi diskusi lab

## Referensi

- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/) — Buku otoritatif tentang replikasi, partisi, transaksi, dan konsistensi
- [The Raft Consensus Algorithm](https://raft.github.io/) — Paper Raft, visualisasi, dan implementasi referensi
- [hashicorp/raft](https://github.com/hashicorp/raft) — Implementasi Raft produksi di Go yang dipakai Consul dan Nomad
- [Dokumentasi etcd](https://etcd.io/docs/) — Dokumen resmi etcd, lease, `clientv3/concurrency`, dan API watch
- [Paket konkurensi etcd clientv3](https://pkg.go.dev/go.etcd.io/etcd/client/v3/concurrency) — Primitif `Session`, `Election`, dan `Mutex`
- [Dokumentasi gRPC Go](https://grpc.io/docs/languages/go/) — Quickstart resmi gRPC Go dan referensi API
- [franz-go](https://github.com/twmb/franz-go) — Client Kafka untuk Go yang cepat dan sadar skema
- [nats.go](https://github.com/nats-io/nats.go) — Client resmi NATS dan JetStream untuk Go
- [sony/gobreaker](https://github.com/sony/gobreaker) — Implementasi circuit breaker untuk Go
- [OpenTelemetry Go](https://opentelemetry.io/docs/languages/go/) — Dokumentasi resmi SDK dan instrumentasi OTel Go
- [log/slog](https://pkg.go.dev/log/slog) — Paket logging terstruktur pustaka standar Go
- [prometheus/client_golang](https://github.com/prometheus/client_golang) — Client metrik Prometheus untuk Go
- [crypto/tls Go](https://pkg.go.dev/crypto/tls) — Konfigurasi TLS dan mTLS di pustaka standar
- [API Consul untuk Go](https://pkg.go.dev/github.com/hashicorp/consul/api) — Registrasi layanan, discovery, dan health checking
- [SPIFFE dan SPIRE](https://spiffe.io/) — Standar identitas layanan di sistem terdistribusi produksi

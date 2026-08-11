---
title: "Silabus Lanjutan Elysia.js"
description: "Kurikulum lanjutan 12 minggu yang komprehensif untuk pengembang TypeScript berpengalaman yang mencakup sistem tipe Elysia.js, keamanan tipe ujung-ke-ujung dengan Eden Treaty, sistem macro, pengembangan plugin khusus, rekayasa kinerja, observabilitas, pengerasan keamanan, dan penskalaan ke arsitektur mikroservis."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Lanjutan Elysia.js

## Ringkasan

Silabus lanjutan 12 minggu ini dirancang untuk pengembang TypeScript berpengalaman yang sudah membangun web API dengan Elysia.js dan ingin menguasai framework ini pada tingkat tipe dan pada skala produksi. Kurikulum ini melampaui sekadar menulis route dan handler untuk mengeksplorasi hal yang membuat Elysia.js unik: pipeline inferensi tipe waktu-kompilasi yang mengubah server Anda menjadi kontrak bertipe, klien Eden Treaty yang mengonsumsi kontrak tersebut tanpa pembuatan kode, sistem macro yang memindahkan pekerjaan dari runtime ke waktu kompilasi, serta arsitektur plugin yang digunakan untuk menyusun fitur-fitur kelas produksi.

Setiap modul memadukan fondasi konseptual yang mendalam dengan lab praktik. Peserta akan menulis macro khusus, menerbitkan plugin yang dapat digunakan ulang, membangun sistem multi-layanan bertipe penuh dengan Eden Treaty, melakukan benchmark dan mengoptimalkan layanan mereka terhadap anggaran kinerja yang terukur, menginstrumentasikannya dengan OpenTelemetry, mengeraskannya terhadap pola serangan nyata, dan mengoperasikannya di bawah beban produksi.

Di akhir kursus ini, peserta akan mampu merancang API yang aman terhadap tipe sehingga kompiler menangkap perubahan yang merusak sebelum pengguna mengalaminya, membangun dan menerbitkan plugin yang terintegrasi dengan baik ke sistem tipe Elysia, mengidentifikasi dan menghilangkan hambatan kinerja menggunakan profiler dan pengujian beban, menerapkan observabilitas dan pengerasan keamanan untuk layanan dengan lalu lintas tinggi, serta menguraikan monolit menjadi arsitektur mikroservis bertipe tanpa kehilangan keamanan ujung-ke-ujung.

## Kurikulum

### Modul 1: TypeBox Lanjutan dan Desain Skema (Minggu 1)

- **Sistem tipe TypeBox secara mendalam**
  - Melampaui `t.Object()`: `t.Recursive()`, `t.Union()`, `t.Intersect()`, `t.DiscriminatedUnion()`
  - Format dan pola string: `t.String({ format: 'email' })`, format khusus
  - Generik dan parameterisasi tipe: `t.Generic()`, `t.Type()`
  - Skema referensi dengan `$id` dan `$defs` untuk graf skema yang dapat digunakan ulang
- **Tipe TypeBox khusus**
  - Membuat tipe khusus aplikasi dengan `Type.Unsafe()`
  - Logika validasi dan pesan kesalahan khusus
  - Integrasi dengan kata kunci khusus Ajv
- **Desain skema untuk API nyata**
  - Discriminated union untuk payload polimorfik (metode pembayaran, peristiwa notifikasi)
  - Skema rekursif untuk struktur pohon (komentar, kategori, bagan organisasi)
  - Tipe transformasi untuk normalisasi input (`t.Transform()`)
- **Lab Praktik**: Modelkan API peristiwa polimorfik (order.created, payment.failed, refund.issued) dengan discriminated union dan pohon kategori yang mereferensikan diri sendiri, lalu validasi keduanya terhadap payload runtime

### Modul 2: Pipeline Inferensi Tipe Elysia (Minggu 2)

- **Bagaimana Elysia menurunkan tipe**
  - Rantai generik `Elysia<...>` dan bagaimana definisi route mengakumulasi tipe
  - Bagaimana `.state()`, `.decorate()`, `.derive()`, dan `.resolve()` memperluas konteks tipe
  - Dari mana tipe berasal dalam handler: `context.body`, `context.query`, `context.params`, `context.store`
- **Komposisi tipe lintas plugin**
  - Bagaimana tipe plugin bergabung ke instance induk
  - Tipe terlingkup dan menghindari kebocoran tipe antar plugin
  - Tipe kondisional dan modifikator `as const` pada skema
- **Men-debug masalah tingkat tipe**
  - Membaca kesalahan tipe yang dihasilkan Elysia
  - Mengisolasi masalah tipe dengan reproduksi minimal
  - Menggunakan utilitas tipe Elysia untuk memeriksa tipe handler yang diinferensikan
- **Lab Praktik**: Bangun tumpukan middleware bertipe di mana dekorator autentikasi, konteks tenant, dan metadata paginasi semuanya terinferensi dengan benar melintasi batas plugin, lalu tulis pengujian tingkat tipe yang gagal ketika bentuk respons sebuah route berubah

### Modul 3: Keamanan Tipe Ujung-ke-Ujung dengan Eden Treaty (Minggu 3)

- **Bagaimana Eden Treaty bekerja**
  - Menginferensikan kontrak API lengkap dari instance server
  - Klien `treaty` dan metode berantainya
  - Jaminan runtime vs waktu-kompilasi: apa yang diperiksa Eden dan apa yang tidak bisa
- **Pola Eden lanjutan**
  - Berbagi tipe lintas monorepo dengan paket workspace
  - Mengonfigurasi header, kredensial, dan implementasi fetch khusus
  - Unggah file bertipe dan permintaan multipart melalui Eden
  - Koneksi WebSocket bertipe dengan `$ws`
- **Eden di sisi frontend**
  - Menggunakan Eden Treaty dengan klien React, Next.js, Svelte, dan Vue
  - Pemanggil sisi server: pola BFF (backend-for-frontend)
  - Menangani versioning API dan perubahan yang merusak dalam kontrak bersama
- **Lab Praktik**: Siapkan monorepo dengan paket server Elysia bersama dan klien Next.js; ubah skema respons dan amati kesalahan kompilasi di klien, lalu perkenalkan versioning API yang dapat dikonsumsi kedua sisi secara aman

### Modul 4: Sistem Macro (Minggu 4)

- **Apa itu macro**
  - Macro vs hook lifecycle: kapan pekerjaan terjadi
  - Macro inline dan argumennya
  - Bagaimana macro menghasilkan kode pada waktu kompilasi
- **Membangun macro yang dapat digunakan ulang**
  - Menulis macro yang menyuntikkan nilai ke dalam handler
  - Menggabungkan macro dengan plugin
  - Batasan dan jebakan macro (serialisasi, closure, nilai dinamis)
- **Implikasi kinerja**
  - Mengapa pekerjaan waktu-kompilasi mengungguli pemeriksaan runtime
  - Mengukur perbedaannya: auth berbasis macro vs auth berbasis hook
  - Kapan TIDAK menggunakan macro
- **Lab Praktik**: Implementasikan macro `@UsePermission('admin')` yang menyuntikkan pemeriksaan izin secara statis, lalu bandingkan kinerjanya dengan implementasi hook `onBeforeHandle` yang setara

### Modul 5: Pengembangan Plugin Khusus (Minggu 5)

- **Anatomi plugin**
  - Apa yang dapat disumbangkan plugin: route, state, dekorator, macro, hook, skema
  - Pola `plugin` dan semantik `.use()`
  - Konteks lokal-plugin vs konteks warisan
- **Opsi plugin bertipe**
  - Merancang objek konfigurasi dengan validasi TypeBox
  - Fungsi pabrik yang mengembalikan instance plugin bertipe
  - Mempertahankan tipe ketika plugin disusun
- **Menerbitkan dan menguji plugin**
  - Struktur paket, konvensi penamaan, dan peer dependencies
  - Menguji plugin terhadap instance Elysia sungguhan
  - Mendokumentasikan API plugin dengan OpenAPI yang dihasilkan
- **Lab Praktik**: Bangun, uji, dan terbitkan secara lokal plugin rate-limiter yang dapat digunakan ulang dengan backend penyimpanan yang dapat dikonfigurasi (memori, Redis), opsi bertipe, dan macro untuk batas per-route

### Modul 6: Lifecycle Lanjutan dan Arsitektur Peristiwa (Minggu 6)

- **Hook lifecycle secara mendalam**
  - Pipeline lengkap: `onRequest` → `derive` → `resolve` → `beforeHandle` → handler → `afterHandle` → `mapResponse` → `onError` → `onResponse`
  - Evaluasi malas: `derive` vs `resolve` dan kapan masing-masing berjalan
  - Hook lokal vs global dan jaminan urutan hook
- **Desain berbasis peristiwa di dalam layanan**
  - Bus peristiwa khusus dengan payload peristiwa bertipe
  - Pengiriman webhook dengan percobaan ulang dan kunci idempotensi
  - Pola outbox transaksional untuk penerbitan peristiwa yang andal
- **Penanganan kesalahan terpusat**
  - Membangun taksonomi kesalahan dengan kelas kesalahan bertipe
  - Memetakan kesalahan domain ke respons HTTP secara konsisten
  - Integrasi pelacakan kesalahan
- **Lab Praktik**: Implementasikan sistem pengiriman webhook dengan tabel outbox, percobaan ulang dengan backoff eksponensial, dan kontrak peristiwa bertipe yang dikonsumsi bus peristiwa internal

### Modul 7: Rekayasa Kinerja (Minggu 7)

- **Memahami model kinerja Elysia**
  - Mengapa Elysia unggul dalam benchmark: abstraksi minimal, kompilasi skema, penanganan jalur yang dioptimalkan
  - Di mana overhead sebenarnya muncul dalam aplikasi nyata
- **Metodologi benchmark**
  - Pengujian beban dengan autocannon, wrk, dan k6
  - Merancang benchmark yang adil: warmup, persentil, tingkat kesalahan
  - Profiling CPU dan memori dengan profiler Bun dan `bun --profile`
- **Teknik optimasi**
  - Urutan pendaftaran route dan ukuran handler
  - Menghindari kompilasi ulang skema yang tidak perlu
  - Pola hot-path: meminimalkan alokasi, menggunakan ulang buffer
  - Caching pada lapisan yang tepat: HTTP, aplikasi, database
- **Lab Praktik**: Profil sebuah API contoh, identifikasi tiga hambatan teratas, terapkan optimasi yang ditargetkan, dan tunjukkan hasil sebelum/sesudah terhadap anggaran latensi p95

### Modul 8: Akses Data Lanjutan dan Caching (Minggu 8)

- **SQLite berkinerja tinggi dengan Bun**
  - Prepared statements, mode WAL, dan busy timeout
  - Transaksi, savepoint, dan insert massal
- **PostgreSQL dalam skala besar**
  - Connection pooling dengan PgBouncer dan pg-pool
  - Optimasi query, indeks, dan `EXPLAIN ANALYZE`
  - Replica baca dan pemisahan baca/tulis
- **Arsitektur caching**
  - Lapisan caching Redis: cache-aside, write-through, write-behind
  - Strategi invalidasi cache dan proteksi stampede
  - CQRS dan read model yang dimaterialisasi
- **Lab Praktik**: Rancang lapisan caching untuk endpoint baca yang panas, lindungi dari cache stampede dengan pola single-flight, dan ukur peningkatan hit-ratio di bawah beban

### Modul 9: Observabilitas dalam Skala Besar (Minggu 9)

- **Logging terstruktur**
  - Logging dengan pino dan logger bawaan Bun
  - ID korelasi lintas permintaan dan layanan
  - Level log, redaksi, dan pengambilan sampel log
- **Tracing dan metrik**
  - Instrumentasi OpenTelemetry untuk route Elysia
  - Trace terdistribusi melintasi batas layanan
  - Metrik Prometheus: histogram durasi permintaan, tingkat kesalahan, permintaan berjalan
- **Health dan readiness**
  - Probe liveness dan readiness untuk orkestrator
  - Pemeriksaan kesehatan dependensi (database, Redis, API eksternal)
  - Shutdown yang anggun dan draining
- **Lab Praktik**: Instrumentasikan demo multi-layanan dengan OpenTelemetry, ekspor trace ke kolektor lokal, tambahkan metrik Prometheus, dan verifikasi bahwa trace terdistribusi melintasi kedua layanan

### Modul 10: Pengerasan Keamanan (Minggu 10)

- **Autentikasi dan otorisasi secara mendalam**
  - Alur OAuth2 dan OIDC dengan Elysia
  - Rotasi dan pencabutan refresh token
  - Kebijakan otorisasi berbutir halus melampaui RBAC (ABAC)
- **Pengerasan input dan payload**
  - Batasan melampaui TypeBox: batas ukuran body, timeout permintaan, rate limiting
  - Perlindungan terhadap DoS: slowloris, batas koneksi, backpressure
  - Prototype pollution dan risiko deserialisasi
- **Rahasia dan rantai pasokan**
  - Mengelola rahasia dengan Bun secrets dan vault eksternal
  - Audit dependensi dan kebersihan lockfile
  - Rilis bertanda tangan dan verifikasi integritas
- **Lab Praktik**: Keraskan API contoh terhadap rangkaian serangan terotomasi (payload berukuran besar, permintaan cepat bertubi-tubi, JSON tidak valid), lalu verifikasi bahwa rate limiting, batas payload, dan log audit semuanya berperilaku benar

### Modul 11: Mikroservis dan Sistem Terdistribusi (Minggu 11)

- **Dekomposisi layanan dengan Elysia**
  - Mengidentifikasi bounded context dan batas layanan
  - Pola gateway dengan klien upstream bertipe melalui Eden
  - Autentikasi antar-layanan (mTLS, service token)
- **Messaging dan antrean**
  - Konsumen Redis Streams, NATS, dan RabbitMQ di Bun
  - Konsumen idempoten dan semantik exactly-once
  - Percobaan ulang, dead-letter queue, dan kebijakan backoff
- **Konsistensi terdistribusi**
  - Pola saga untuk transaksi multi-layanan
  - Pola outbox ditinjau ulang pada batas layanan
  - Tracing terdistribusi di seluruh jalur permintaan
- **Lab Praktik**: Pecah monolit menjadi tiga layanan (pesanan, pembayaran, inventaris), hubungkan dengan Eden Treaty dan backbone peristiwa Redis Streams, lalu implementasikan saga yang mengkompensasi pembayaran yang gagal

### Modul 12: Penskalaan dan Operasi Produksi (Minggu 12)

- **Penskalaan horizontal**
  - Desain stateless dan penyimpanan sesi bersama
  - Strategi load balancing dan sticky session
  - Kebijakan autoscaling berdasarkan metrik nyata
- **Deployment Kubernetes**
  - Kontainerisasi layanan Elysia dengan multi-stage build
  - Deployment, service, dan horizontal pod autoscaling
  - Pembaruan bergulir tanpa downtime dan readiness gate
- **Praktik keandalan**
  - Perencanaan kapasitas dan pengujian beban terhadap SLO yang ditargetkan
  - Dasar-dasar chaos engineering: mematikan pod, menyuntikkan latensi
  - Postmortem, SLO, dan error budget
- **Lab Praktik**: Deploy sistem tiga layanan dari Modul 11 ke klaster Kubernetes lokal, konfigurasikan autoscaling dan readiness probe, lalu jalankan pengujian beban dan latihan chaos (pod dimatikan, latensi disuntikkan) untuk memverifikasi pemulihan

## Proyek Akhir

Bangun platform e-commerce bertipe penuh dan siap produksi sebagai kumpulan layanan Elysia.js. Proyek harus mencakup:

- Layanan gateway yang mengekspos API publik, dengan semua skema didefinisikan dalam TypeBox
- Tiga layanan internal (katalog, pesanan, pembayaran) yang berkomunikasi melalui Eden Treaty dengan keamanan tipe ujung-ke-ujung penuh
- Setidaknya satu plugin khusus berkualitas terbitan (auth, rate limiting, atau audit logging) dengan opsi bertipe
- Satu macro yang dapat digunakan ulang yang memindahkan pemeriksaan runtime ke waktu kompilasi
- Sistem pengiriman webhook bertipe menggunakan pola outbox
- Tracing OpenTelemetry dan metrik Prometheus di semua layanan
- Satu putaran pengerasan keamanan: rate limiting, batas payload, dan autentikasi OAuth2 atau OIDC
- Anggaran kinerja: latensi p95 di bawah 150ms pada 500 RPS di gateway, dibuktikan dengan laporan pengujian beban
- Manifes Kubernetes dengan readiness probe, autoscaling, dan konfigurasi rollout tanpa downtime

Deliverable: Repositori GitHub dengan kode sumber lengkap, paket kontrak bersama bertipe, hasil pengujian beban, tangkapan layar tracing, dan runbook yang mencakup deployment, penskalaan, dan respons insiden.

## Kriteria Penilaian

- **Tugas (40%)**
  - Lab praktik mingguan dinilai berdasarkan kebenaran, keamanan tipe, dan kualitas kode
  - Pengujian tingkat tipe yang menegakkan kontrak API
  - Tinjauan sejawat atas implementasi plugin dan macro
- **Proyek Akhir (50%)**
  - Keamanan tipe ujung-ke-ujung yang benar di semua layanan (terverifikasi waktu-kompilasi)
  - Anggaran kinerja terpenuhi dengan bukti pengujian beban yang dapat direproduksi
  - Observabilitas: trace terdistribusi dan metrik tersedia serta bermanfaat
  - Keamanan: autentikasi, rate limiting, dan pengerasan input terverifikasi
  - Kesiapan operasional: deployment Kubernetes berjalan dengan autoscaling dan shutdown yang anggun
- **Partisipasi (10%)**
  - Keterlibatan dalam tinjauan desain dan diskusi arsitektur
  - Pengumpulan lab tepat waktu dan umpan balik konstruktif atas karya sejawat

## Referensi

- [Dokumentasi Resmi Elysia.js](https://elysiajs.com/)
- [Peristiwa Lifecycle Elysia.js](https://elysiajs.com/essential/lifecycle.html)
- [Macro Elysia.js](https://elysiajs.com/patterns/macro.html)
- [Plugin Elysia.js](https://elysiajs.com/plugins/overview.html)
- [Dokumentasi Eden Treaty](https://elysiajs.com/eden/treaty.html)
- [Dokumentasi TypeBox](https://github.com/sinclairzx81/typebox)
- [Dokumentasi Runtime Bun](https://bun.sh/docs)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [Dokumentasi Prometheus](https://prometheus.io/docs/introduction/overview/)
- [Pengujian Beban k6](https://k6.io/docs/)

---
title: "Silabus Microservices Elysia.js"
description: "Kursus enam modul untuk memecah monolit Elysia.js menjadi layanan: batas domain, messaging, gateway, observabilitas, deployment, dan pengujian."
category: "backend"
technology: "elysiajs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Microservices Elysia.js

## Ringkasan

Kursus ini mengubah aplikasi Elysia.js yang sudah berjalan menjadi sekumpulan layanan kecil yang bisa dioperasikan. Cakupannya sengaja tidak menyapu semua pola sistem terdistribusi: fokusnya enam keputusan yang menentukan berhasil atau tidaknya pemecahan — di mana batas domain diletakkan, bagaimana layanan berkomunikasi, apa yang berdiri di depan, bagaimana Anda melihat ke dalam, bagaimana rilis dilakukan, dan bagaimana membuktikan sistemnya masih bekerja.

Urutan modul mengikuti urutan kegagalan. Tim biasanya salah menentukan batas lebih dulu, lalu menemukan request tidak bisa dilacak, lalu menyadari pipeline deploy-nya mengasumsikan satu artefak. Karena itu setiap modul berakhir dengan artefak yang tetap dipakai: peta batas, kontrak pesan, konfigurasi gateway, dashboard, pipeline, dan test suite.

Enam modul, sekitar tiga minggu per modul pada 8–10 jam per minggu. Semua modul memakai Bun dan Elysia.js; Docker dan container registry dipakai mulai Modul 5.

## Kurikulum

### Modul 1: Dekomposisi Layanan dan Batas Domain

- **Dari modul ke layanan**
  - Bounded context, bukan nama folder: apa yang benar-benar berubah bersamaan
  - Kurva biaya pemecahan — panggilan jaringan, kegagalan parsial, data terduplikasi
- **Menemukan seam pada kode Elysia**
  - Memetakan ketergantungan plugin lewat `dependsOn` dan nama service
  - Mengukur panggilan per request untuk menemukan batas yang terlalu "ramai"
- **Kepemilikan data**
  - Satu penulis per tabel; gejala anti-pattern database bersama
  - Memilih antara skema bersama, skema per layanan, dan read model
- **Antarmuka contract-first**
  - Skema TypeBox sebagai sumber kebenaran antar layanan
  - Aturan versi: hanya perubahan aditif, tidak ada penggunaan ulang field secara diam-diam
- **Luaran**: peta batas dengan pemilik, tabel kepemilikan data, dan decision record tertulis untuk ekstraksi pertama.

### Modul 2: Messaging dan Kontrak Event

- **Sinkron vs asinkron**
  - Kapan request harus menunggu, dan kapan tidak boleh
  - Anggaran timeout dan masalah kaskade
- **Desain pesan**
  - Event (fakta) versus command (permintaan); penamaan dalam bentuk lampau
  - Field envelope: `id`, `type`, `occurredAt`, `schemaVersion`, `traceId`
- **Semantik pengiriman**
  - Kenyataan at-least-once, idempotency key, dan tabel dedupe
  - Pola outbox: menulis event dalam transaksi yang sama dengan perubahan state
- **Pilihan broker**
  - NATS JetStream, Redis Streams, RabbitMQ — trade-off untuk tim kecil
- **Penanganan kegagalan**
  - Retry dengan backoff, dead-letter queue, dan prosedur replay
- **Luaran**: dua kontrak event, implementasi outbox, dan runbook pesan beracun.

### Modul 3: API Gateway dan Kebutuhan Tepi

- **Tanggung jawab gateway**
  - Routing, terminasi auth, rate limit, penyeragaman request
  - Hal yang tidak boleh ada di gateway (aturan bisnis)
- **Implementasi dengan Elysia**
  - Memasang plugin gateway, meneruskan header, menyebarkan trace context
  - Timeout upstream per route dan circuit breaking
- **Autentikasi di tepi**
  - Verifikasi JWT sekali, header identitas ke hilir, batas kepercayaan
  - Scope token dipetakan ke route, bukan diperiksa di setiap layanan
- **Kompatibilitas**
  - Penyeragaman respons yang tetap kompatibel selama pemecahan
  - Header deprecation dan kebijakan sunset
- **Luaran**: gateway dengan tiga upstream, timeout per route, dan kebijakan load shedding.

### Modul 4: Observabilitas

- **Log terstruktur**
  - Log JSON dengan `service`, `requestId`, `traceId`, `tenant`
  - Level log yang benar-benar berarti saat insiden
- **Metrik**
  - RED (rate, error, duration) per route dan per dependensi
  - Sinyal saturasi: event loop lag, kedalaman antrean, jumlah koneksi
- **Tracing**
  - Pemasangan OpenTelemetry di Bun, propagasi konteks lewat HTTP dan pesan
  - Membaca trace untuk menemukan hop lambat, bukan layanan lambat
- **Health dan readiness**
  - Liveness versus readiness; mengapa dependensi yang gagal tidak boleh me-restart pod
- **Luaran**: satu dashboard per layanan dan satu trace lintas layanan untuk satu proses checkout.

### Modul 5: Deployment dan Operasi Runtime

- **Packaging**
  - Membangun binary Bun atau image ramping; instalasi reprodusibel dengan lockfile
- **Environment dan konfigurasi**
  - Konfigurasi twelve-factor, injeksi secret, validasi skema per environment
- **Rollout**
  - Graceful shutdown: berhenti menerima, kuras socket, flush outbox
  - Blue-green dan canary dengan health gate; rollback tanpa rebuild
- **Scaling**
  - Layanan stateless, sticky session untuk WebSocket, fan-out lewat broker
- **Luaran**: pipeline CI yang menghasilkan image bertanda tangan dan rencana rollout dengan timing drain.

### Modul 6: Menguji Perilaku Terdistribusi

- **Piramida tes untuk layanan**
  - Unit test pada logika domain, contract test di batas, sedikit jalur end-to-end
- **Kontrak berbasis konsumen**
  - Pemeriksaan bergaya Pact agar perubahan upstream gagal sebelum deploy
- **Harness integrasi**
  - `docker compose` dengan broker dan database; isolasi per tes
  - Menyimulasikan kegagalan parsial: timeout, 503, pengiriman duplikat
- **Load dan chaos**
  - Baseline load test per layanan, lalu eksperimen mematikan dependensi
- **Luaran**: contract test di CI, harness integrasi, dan laporan hasil injeksi kegagalan.

## Proyek Akhir

Bangun **OrderFlow**, sistem tiga layanan di Elysia.js: `orders` (write model dan outbox), `inventory` (reservasi stok, konsumen event), dan `gateway` (auth, routing, rate limit). Ketentuan:

- `orders` menerbitkan `OrderPlaced`; `inventory` mengonsumsinya secara idempoten dan mengirim `StockReserved` atau `StockRejected`.
- Gateway mengautentikasi sekali dan meneruskan identitas; tidak ada layanan yang mem-parse token mentah.
- Setiap request membawa trace id dari gateway sampai konsumen.
- Satu perintah menyalakan seluruh stack secara lokal; satu pipeline merilis ketiga layanan.
- Mematikan layanan `inventory` tidak boleh menghilangkan order — event diputar ulang dari outbox saat konsumen kembali.

Kumpulkan repositori, catatan arsitektur singkat yang menjelaskan setiap batas, dan demo saat `inventory` mati lalu pulih.

## Kriteria Penilaian

- **Luaran modul (45%)**: enam artefak, dinilai dari kelengkapan dan apakah decision record menjelaskan trade-off, bukan mengulang nama pola.
- **Kualitas kontrak (15%)**: skema berversi, event berupa fakta bentuk lampau, konsumen toleran terhadap field baru.
- **Operabilitas (15%)**: dashboard menjawab "apakah sehat?" dalam waktu kurang dari satu menit; shutdown menguras koneksi tanpa pesan hilang.
- **Proyek akhir (20%)**: demo kegagalan berjalan, tidak ada order hilang atau stok terpesan ganda, dan trace menunjukkan jalur lengkap.
- **Partisipasi code review (5%)**: komentar yang menemukan masalah batas atau kontrak, bukan soal gaya.

Proyek yang lulus wajib bertahan saat dependensi dimatikan tanpa pemberitahuan di tengah demo. Solusi yang hanya bekerja pada jalur bahagia dinilai belum selesai, berapa pun jumlah fiturnya.

## Referensi

- Dokumentasi Elysia.js: plugin, lifecycle hook, WebSocket, dan validasi.
- Dokumentasi Bun: server HTTP, `Bun.serve`, packaging, dan test runner.
- Spesifikasi OpenTelemetry: propagasi konteks dan semantic convention.
- *Building Microservices* (Sam Newman) — pola dekomposisi dan migrasi.
- *Release It!* (Michael Nygard) — circuit breaker, timeout, dan pola stabilitas.
- *Enterprise Integration Patterns* (Hohpe & Woolf) — routing pesan dan idempotensi.
- Dokumentasi NATS JetStream dan Redis Streams untuk jaminan pengiriman.

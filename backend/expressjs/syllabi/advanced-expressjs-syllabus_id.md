---
title: "Silabus Lanjutan Express.js"
description: "Kursus lanjutan 8 modul yang membahas internal Express.js, performa, hardening keamanan, observabilitas, deployment, scaling, testing, dan arsitektur jangka panjang."
category: "backend"
technology: "expressjs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Lanjutan Express.js

## Ringkasan

Sebagian besar materi Express berhenti pada routing dan middleware. Kursus ini berangkat dari titik itu dan masuk ke hal yang menentukan apakah layanan bertahan di produksi: bagaimana request pipeline benar-benar dieksekusi, di mana latency bersembunyi, bagaimana mengeraskan API publik, bagaimana mengamati sistem yang tidak bisa dipasangi debugger, dan bagaimana melakukan scaling tanpa menulis ulang.

Delapan modul, masing-masing sekitar dua minggu, dibangun di atas satu layanan yang terus dikembangkan peserta. Setiap modul memasangkan teori singkat dengan deliverable terukur, sehingga kemajuan terlihat dari angka load test, temuan audit, atau dashboard — bukan nilai kuis.

Urutannya disengaja. Internal dan performa di awal karena modul berikutnya mengasumsikan peserta mampu membaca flame graph dan menalar blocking pada event loop. Arsitektur di akhir agar keputusan struktural dipandu oleh semua hasil pengukuran sebelumnya.

## Kurikulum

### Modul 1: Internal Request Pipeline
- **Router sebagai mesin pencocokan**
  - Layer stack, kompilasi path-to-regexp, penghapusan mount point
  - Semantik `next()`, middleware sinkron vs asinkron, dan mengapa memanggil `next()` dua kali merusak state
- **Urutan dan mode kegagalan**
  - Body parser sebelum router, error handler di akhir, fallthrough 404
  - Mendiagnosis "headers already sent" dan respons ganda yang senyap
- **Siklus hidup**: unhandled rejection, `server.close()` vs request yang masih berjalan
- **Deliverable**: Dokumen jejak satu request melewati 12 middleware, plus perbaikan bug urutan pada repositori starter.

### Modul 2: Rekayasa Performa
- **Ukur sebelum optimasi**
  - Baseline autocannon dan k6, p50/p95/p99, kurva throughput terhadap konkurensi
- **Biaya pada hot path**
  - Serialisasi JSON, alokasi per request, route regex, trade-off kompresi
- **Lapisan cache**: header cache HTTP, ETag, response caching Redis, proteksi stampede
- **Deliverable**: Menurunkan p95 endpoint referensi sebesar 40% dan mendokumentasikan metode pengukurannya.

```javascript
// scripts/bench.js — baseline reprodusibel sebelum optimasi
const autocannon = require("autocannon");

(async () => {
    const result = await autocannon({
        url: process.env.TARGET_URL || "http://localhost:3000/orders",
        connections: 50,
        duration: 20,
        headers: { authorization: `Bearer ${process.env.BENCH_TOKEN}` },
    });
    console.log({
        rps: Math.round(result.requests.average),
        p95: result.latency.p95,
        errors: result.errors,
    });
    // Exit code non-nol saat baseline bergeser, agar CI menangkap regresi
    if (result.errors > 0 || result.latency.p95 > 250) {
        process.exitCode = 1;
    }
})().catch((error) => {
    console.error("benchmark gagal:", error);
    process.exit(1);
});
```

### Modul 3: Hardening Keamanan
- **Pemetaan attack surface**: validasi skema di setiap batas, pembentukan output untuk mencegah kebocoran data
- **Transport dan header**: Helmet, HSTS, CORS sebagai allowlist bukan wildcard, flag cookie
- **AuthZ di luar autentikasi**: otorisasi level objek, isolasi tenant, IDOR pada resource bersarang
- **Resistensi penyalahgunaan**: rate limit per identitas dan IP, batas ukuran request, timeout slow-loris, audit dependency
- **Deliverable**: Threat model plus remediasi temuan dari pengujian OWASP Top 10 terhadap layanan.

### Modul 4: Observabilitas
- **Structured logging**: Pino, correlation ID per request, level yang bermakna, redaksi PII
- **Metrik yang menjawab pertanyaan**: metode RED (rate, errors, duration), bucket histogram, kardinalitas label terbatas
- **Tracing**: auto-instrumentation OpenTelemetry, propagasi konteks melewati batas asinkron
- **Deliverable**: Dashboard yang membuat satu request gagal dapat ditelusuri dari alert hingga baris log.

### Modul 5: Deployment dan Release Engineering
- **Kontainer**: multi-stage build, user non-root, penanganan sinyal untuk shutdown bersih
- **Konfigurasi runtime**: konfigurasi twelve-factor, injeksi secret, validasi environment saat boot
- **Strategi rilis**: rolling vs blue-green, readiness gate, migrasi terpisah dari deploy, rencana rollback
- **Deliverable**: Pipeline yang melakukan deploy, memverifikasi health check, dan rollback di bawah lima menit.

### Modul 6: Scaling
- **Statelessness**: session dieksternalisasi, sticky session vs state bersama, idempotency key
- **Scale horizontal**: cluster mode dan replika, perhitungan connection pool, database sebagai bottleneck sesungguhnya
- **Backpressure**: isolasi beban kerja lewat queue, timeout, circuit breaker, bulkhead
- **Deliverable**: Load test pada 5x baseline dengan p99 terkendali dan tanpa pool exhaustion.

```yaml
# k8s/express-deployment.yaml (potongan): readiness sebelum trafik, drain bertahap
spec:
  replicas: 4
  strategy:
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: registry.example.com/orders-api:1.14.0
          readinessProbe:
            httpGet: { path: /health/ready, port: 3000 }
            periodSeconds: 5
```

### Modul 7: Testing dalam Skala Besar
- **Suite berlapis**: unit test untuk aturan, integration test supertest untuk kontrak HTTP, lapisan E2E tipis
- **Isolasi dan kecepatan**: schema per worker, truncate alih-alih migrasi, clock dan ID deterministik
- **Quality gate**: threshold coverage per direktori, mutation testing pada modul kritis, anggaran flaky
- **Deliverable**: Pipeline CI yang menjalankan seluruh suite di bawah empat menit tanpa flaky pada 50 eksekusi.

### Modul 8: Arsitektur dan Evolusi
- **Lapisan yang bertahan saat tumbuh**: router, service, repository, dependency injection tanpa framework
- **Batas domain**: kapan mengekstrak service, contract testing, kepemilikan data shared-nothing
- **Migrasi legacy**: strangler-fig, dual write, feature flag, kebijakan deprecation untuk API publik
- **Deliverable**: Architecture decision record yang mengusulkan ekstraksi berikutnya beserta biaya, risiko, dan rollback.

## Proyek Akhir

Bangun **OrderFlow**, API pemesanan bertaraf produksi, dan bawa dari prototipe yang benar menjadi layanan yang dapat dioperasikan.

- **Dua bounded context**: orders dan inventory, masing-masing dengan schema dan lapisan repository sendiri, dikoordinasikan lewat queue untuk reservasi stok.
- **API contract-first**: spesifikasi OpenAPI diterbitkan, validasi request dan response ditegakkan, error envelope konsisten dengan correlation ID.
- **Keamanan**: route terautentikasi dengan otorisasi level objek, scoping tenant ditegakkan di lapisan repository, rate limit pada endpoint tulis, audit dependency bersih.
- **Observabilitas**: log terstruktur dengan correlation ID, metrik RED per route, trace yang mencakup handler, query database, dan publish ke queue.
- **Performa**: p95 di bawah 150 ms pada 200 request per detik di perangkat referensi, skrip benchmark ikut dikomit.
- **Operasional**: terkontainerisasi, readiness dan liveness probe, graceful shutdown yang menuntaskan request berjalan, runbook migrasi, rollback satu perintah.
- **Kualitas**: suite berlapis, threshold coverage per direktori terpenuhi, tidak ada test flaky pada 50 eksekusi CI berturut-turut.

Deliverable: repositori, dokumen desain 6-8 halaman yang membahas trade-off pada modul 2, 5, 6, dan 8, serta sesi pembelaan 15 menit dengan load test langsung dan walkthrough dashboard.

## Kriteria Penilaian

- **Deliverable modul (40%)**: Delapan artefak yang dinilai dari tercapainya metrik yang ditetapkan dan dapat tidaknya metode pengukuran diulang orang lain.
- **Dokumen desain (20%)**: Trade-off eksplisit, alternatif yang ditolak beserta alasannya, pengakuan jujur tentang apa yang gagal lebih dulu pada trafik 10x.
- **Fungsionalitas proyek akhir (20%)**: Semua persyaratan terpenuhi; kebenaran diverifikasi oleh suite pengajar yang dijalankan terhadap API yang dikumpulkan.
- **Kesiapan operasional (10%)**: Deployment, rollback, dan observabilitas didemonstrasikan langsung, termasuk satu kegagalan yang disuntikkan dan dipulihkan tanpa kehilangan data.
- **Pembelaan dan code review (10%)**: Menjelaskan perilaku event loop, ukuran pool, dan keputusan otorisasi tanpa catatan.

Rentang nilai: 90+ siap produksi dengan trade-off terdokumentasi; 75-89 benar dan teramati namun ada celah scaling; 60-74 fungsional dengan operasional lemah; di bawah 60 wajib mengumpulkan ulang.

## Referensi

- Dokumentasi Express.js dan panduan migrasi 4.x ke 5.x: https://expressjs.com
- Panduan diagnostik dan event loop Node.js: https://nodejs.org/en/learn/diagnostics
- Instrumentasi OpenTelemetry JavaScript: https://opentelemetry.io/docs/languages/js/
- OWASP ASVS dan Top 10: https://owasp.org/www-project-application-security-verification-standard/
- "Designing Data-Intensive Applications" — Kleppmann, bab replikasi dan partisi
- "Site Reliability Engineering" — Google, bab monitoring dan penanganan overload
- Dokumentasi load testing Autocannon dan k6: https://github.com/mcollina/autocannon dan https://k6.io/docs/

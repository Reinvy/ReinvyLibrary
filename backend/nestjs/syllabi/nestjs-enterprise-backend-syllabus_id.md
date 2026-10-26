---
title: "Silabus Backend Enterprise NestJS"
description: "Kurikulum delapan modul yang membawa pengembang berpengalaman dari struktur proyek NestJS hingga pengiriman platform kelas enterprise, mencakup arsitektur, batas modul, autentikasi dan otorisasi, persistensi, messaging, observability, pengujian, dan deployment."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Backend Enterprise NestJS

## Ringkasan

Sebagian besar materi NestJS berhenti pada "controller, service, dan koneksi database". Sistem enterprise sesungguhnya menuntut jauh lebih banyak: batas modul yang tetap rapi saat tim bertambah, model otorisasi yang lolos audit, strategi transaksi yang tidak merusak data saat terjadi konkurensi, serta pipeline deployment yang bisa di-rollback dengan aman pada pukul tiga pagi.

Kurikulum delapan modul ini dibangun di atas satu sistem yang berjalan terus — platform order dan billing multi-tenant — yang diperluas modul demi modul. Setiap modul memadukan sesi konseptual dengan lab yang meninggalkan codebase dalam kondisi berjalan dan siap dideploy. Urutannya disengaja: keputusan arsitektur diambil lebih dulu karena seluruh modul berikutnya (persistensi, messaging, observability) mewarisi batasannya, dan pengujian diletakkan tepat sebelum deployment agar modul terakhir memiliki gate nyata untuk diotomatisasi.

Kursus ini mengasumsikan Anda sudah mampu membangun API CRUD di NestJS. Ini bukan pengantar framework, melainkan pengantar menjalankan framework pada skala organisasi.

## Kurikulum

### Modul 1: Arsitektur dan Batas Proyek

- **Struktur Berlapis vs. Heksagonal**
  - Lapisan domain, aplikasi, dan infrastruktur dalam istilah NestJS
  - Menjauhkan decorator framework dari logika domain
  - Batas antara DTO dan entity domain
- **Konvensi Repository dan Port**
  - Abstract class sebagai token injeksi
  - Membungkus klien pihak ketiga di balik port
  - Trade-off pelapisan ketat pada tim kecil

### Modul 2: Modul, Provider, dan Konfigurasi

- **Desain Modul**
  - Modul fitur vs. modul infrastruktur bersama
  - Disiplin `exports` dan menghindari global state tak sengaja
  - Modul dinamis dengan `forRootAsync` untuk konfigurasi
- **Konfigurasi dan Validasi**
  - `@nestjs/config` dengan validasi skema memakai Joi atau Zod
  - Konfigurasi per tahap dan injeksi secret
  - Fail-fast saat startup: menolak konfigurasi tidak valid sebelum listening

### Modul 3: Autentikasi, Otorisasi, dan Multi-Tenancy

- **Identitas**
  - Rotasi access token dan refresh token JWT
  - Invalidasi sesi dan daftar pencabutan token di Redis
  - Parameter hashing password dan jalur peningkatannya
- **Penegakan Kebijakan**
  - Guard, `Reflector`, dan metadata izin deklaratif
  - Kontrol akses berbasis peran vs. berbasis atribut
  - Isolasi tenant di lapisan query, bukan hanya di controller

### Modul 4: Persistensi dan Transaksi

- **Pemodelan Data dengan TypeORM atau Prisma**
  - Migrasi di CI: forward-only, direview, dan dirancang agar dapat dibalik
  - Relasi entity dan menghindari pola query N+1
  - Soft delete, kolom audit, dan optimistic locking
- **Integritas Transaksi**
  - Unit-of-work dengan `QueryRunner` dan transaksi per request
  - Isolation level dan retry saat terjadi serialization failure
  - Prasyarat pola outbox untuk Modul 5

### Modul 5: Messaging dan Alur Kerja Asinkron

- **Broker dan Queue**
  - BullMQ untuk background job, retry, dan backoff
  - RabbitMQ atau Kafka untuk event antar-service
  - Consumer idempoten dan kunci deduplikasi
- **Keandalan**
  - Transactional outbox dan pengiriman at-least-once
  - Dead-letter queue dan penanganan pesan beracun
  - Evolusi skema untuk event yang dipakai lintas tim

### Modul 6: Observability dan Operasional

- **Telemetri**
  - Structured logging dengan korelasi request dan trace
  - Trace OpenTelemetry yang membentang dari HTTP, database, hingga broker
  - Metrik RED dan USE dengan Prometheus serta Grafana
- **Kesiapan Operasional**
  - Health check: liveness vs. readiness vs. startup
  - Graceful shutdown dan pengosongan request yang sedang berjalan
  - Ambang alert yang hanya memanggil manusia saat benar-benar perlu

### Modul 7: Strategi Pengujian

- **Test Pyramid dalam Praktik**
  - Unit test untuk logika domain tanpa container Nest
  - Integration test dengan `Test.createTestingModule` dan Testcontainers
  - Contract test antar-service dengan skema consumer-driven
- **Quality Gate**
  - Ambang coverage yang mengukur risiko, bukan jumlah baris
  - Seeding dan fixture factory untuk data deterministik
  - Load test dengan k6 terhadap dataset realistis

### Modul 8: Deployment dan Release Engineering

- **Packaging**
  - Docker multi-stage build dan pemangkasan dependensi
  - Migrasi sebagai langkah rilis terpisah yang berurutan
  - Konfigurasi dan secret per environment
- **Keamanan Rilis**
  - Blue-green dan canary rollout dengan rollback otomatis
  - Feature flag untuk memisahkan deploy dari release
  - Verifikasi pasca-deploy dan dokumentasi runbook

## Proyek Akhir

Bangun dan operasikan platform kursus secara menyeluruh: API order dan billing multi-tenant di NestJS dengan minimal tiga service yang benar-benar dideploy.

Kemampuan yang wajib ada:

- Autentikasi sadar-tenant dengan rotasi refresh token dan kebijakan peran
- Pembuatan order transaksional dengan outbox yang menerbitkan event `order.created`
- Worker background yang mengonsumsi event tersebut untuk membuat invoice, lengkap dengan retry dan dead-letter queue
- Instrumentasi OpenTelemetry penuh dengan dashboard untuk latensi, error rate, dan kedalaman queue
- Pipeline CI yang menjalankan unit, integration, dan contract test, lalu canary deployment dengan rollback otomatis saat error budget terlampaui

Luaran berupa repository, architecture decision record tertulis untuk setiap batas modul, dan runbook yang mencakup respons on-call untuk tiga mode kegagalan paling mungkin.

## Kriteria Penilaian

- **Lab Modul (40%)**: Setiap modul memiliki lab yang dinilai dengan rubrik mencakup kebenaran, pengujian, dan kepatuhan pada batasan arsitektur modul tersebut.
- **Architecture Decision Record (15%)**: Kejelasan rumusan masalah, alternatif yang dipertimbangkan, dan konsekuensi yang diterima.
- **Proyek Akhir (35%)**: Deployment berjalan, rollback yang didemonstrasikan, injeksi kegagalan yang terobservasi, serta kualitas kode.
- **Peer Review (10%)**: Kualitas komentar review pada dua pull request peserta lain.

Nilai kelulusan mensyaratkan proyek akhir mampu melewati kegagalan yang disuntikkan (broker mati atau latensi database) tanpa kehilangan data.

## Referensi

- [Dokumentasi Resmi NestJS](https://docs.nestjs.com/)
- [Kursus NestJS Fundamentals dan Advanced](https://courses.nestjs.com/)
- [Dokumentasi TypeORM](https://typeorm.io/) dan [Dokumentasi Prisma](https://www.prisma.io/docs)
- [Dokumentasi BullMQ](https://docs.bullmq.io/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- *Designing Data-Intensive Applications* — Martin Kleppmann
- *Release It!* — Michael Nygard
- [The Twelve-Factor App](https://12factor.net/)

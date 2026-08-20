---
title: "Silabus Arsitektur NestJS Lanjutan dan Rekayasa Produksi"
description: "Kurikulum lanjutan 10 minggu untuk pengembang NestJS berpengalaman yang mencakup arsitektur modul kustom, dekorator dan refleksi metadata, internal DI container, federasi GraphQL, mikrosistem, CQRS dan event sourcing, observability, caching, multi-tenancy, serta pola deployment tingkat produksi."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "syllabus"
locale: "id"
---

# Silabus Arsitektur NestJS Lanjutan dan Rekayasa Produksi

## Ringkasan

Kurikulum lanjutan 10 minggu ini dirancang bagi pengembang yang sudah membangun aplikasi NestJS dan ingin menguasai kedalaman arsitektur di balik framework tersebut. Jauh melampaui konten dasar hingga produksi pada silabus pengantar, kursus ini menyelami cara kerja Nest itu sendiri: sistem modul sebagai dependency graph, modul dan provider dinamis, dekorator TypeScript dan API refleksi metadata, injector kustom beserta scope provider, dan siklus hidup request. Dari sana kursus berkembang ke masalah-masalah tersulit yang dihadapi insinyur backend berpengalaman — menskalakan akses data, merancang topologi mikrosistem yang tangguh dengan message broker, menerapkan CQRS dan event sourcing, membangun gateway GraphQL federated, memperkuat keamanan di edge, membuat sistem observable, dan mengoperasikan platform yang tetap sehat di bawah beban. Setiap minggu memadukan materi konseptual mendalam dengan lab intensif berbasis kode, dan kursus memuncak pada capstone lanjutan: platform multi-tenant berbasis event yang dipecah menjadi layanan yang dapat di-deploy secara independen. Peserta diharapkan sudah nyaman dengan TypeScript, dasar-dasar NestJS, dan basis data relasional sebelum mendaftar.

## Kurikulum

### Minggu 1: Sistem Modul sebagai Dependency Graph

- **Internal Resolusi Modul**
  - Bagaimana metadata `@Module()` dipindai dan diubah menjadi dependency graph
  - Impor, ekspor, dan urutan resolusi topological modul
  - Referensi modul sirkular: mengapa berfungsi, kapan rusak, dan cara menghindarinya
- **Modul Dinamis**
  - Konvensi `forRoot()` / `forFeature()` / `register()`
  - Membangun modul yang dapat dikonfigurasi yang menerima opsi saat import
  - Bentuk `DynamicModule` dan provider async di dalam modul dinamis
- **Modul Global dan Scoped**
  - Semantik `@Global()` dan jaminan instansi tunggal
  - Jebakan urutan modul global
  - Re-export modul dan pola barrel

### Minggu 2: Dekorator, Metadata, dan Enhancements Kustom

- **Dekorator TypeScript dan `reflect-metadata`**
  - Mekanika dekorator class, method, property, dan parameter
  - `Reflect.getMetadata` / `defineMetadata` dan sistem tipe design-time
  - `@SetMetadata()` dan utilitas `Reflector`
- **Dekorator Parameter dan Method Kustom**
  - `createParamDecorator` dan dekorator kustom yang membaca konteks request
  - `createMethodDecorator` dan flag ability/metadata
  - Menggabungkan dekorator kustom dengan guard dan interceptor
- **Titik Ekstensi Framework**
  - Exception filter, pipe, dan guard kustom ditinjau ulang pada level framework
  - Provider `APP_*` dan registrasi enhancement global
  - Menyusun pipeline enhancement: pipes → guards → interceptors → handler

### Minggu 3: Pendalaman Dependency Injection

- **Injector Kustom**
  - Jenis token provider: class, string, simbol, dan interface
  - `useClass`, `useValue`, `useFactory`, `useExisting` ditinjau mendalam
  - Factory provider dengan dependency yang di-inject dan inisialisasi async
- **Scope Provider**
  - Scope `SINGLETON`, `REQUEST`, dan `TRANSIENT` secara mendalam
  - Provider ber-scope request dan mekanisme propagasi konteks
  - Implikasi performa dan memori singleton ber-scope request
- **Dependency Lazy dan Opsional**
  - `Inject()` dengan provider opsional dan fallback yang aman
  - Modul lazy dan `LazyModuleLoader`
  - Menguji skenario injection lanjutan dengan provider kustom

### Minggu 4: Akses Data dalam Skala Besar

- **Arsitektur Repository dan Service**
  - Pola lapisan akses data: repository, service, dan unit-of-work
  - Manajemen transaksi dengan `QueryRunner` dan interceptor
  - Kontrol konkurensi: optimistic locking, pessimistic locking, dan retry
- **Optimasi Query dan Performa**
  - Loading relasi eager/lazy yang efisien dan menghindari query N+1
  - Strategi paginasi: offset vs keyset (cursor) pagination
  - Read/write splitting dan connection pooling
- **Migrasi dan Evolusi Skema**
  - Alur kerja migrasi dan perubahan skema tanpa downtime
  - Model data yang ramah eventual-consistency
  - Isolasi data multi-basis-data dan multi-tenant

### Minggu 5: Mikrosistem dan Arsitektur Berbasis Pesan

- **Transport Mikrosistem NestJS**
  - Adapter transport Redis, NATS, Kafka, RabbitMQ, dan gRPC
  - Komunikasi request-response vs berbasis event (fire-and-forget)
  - Pola pesan, payload, dan correlation ID
- **Aplikasi Hybrid**
  - Menggabungkan server HTTP dengan listener mikrosistem dalam satu proses
  - Client proxy dan `ClientProxyFactory`
  - Service discovery serta strategi retry/backoff
- **Pola Ketahanan**
  - Konsumen idempoten dan semantik exactly-once
  - Dead-letter queue dan topologi retry
  - Circuit breaker, timeout, dan bulkhead di gateway

### Minggu 6: CQRS dan Event Sourcing

- **Dasar-dasar CQRS**
  - Memisahkan command, query, dan event
  - `CommandBus`, `QueryBus`, dan `EventBus` dari `@nestjs/cqrs`
  - Command dan query handler dengan pola sagas
- **Event Sourcing**
  - Aliran event, desain event store, dan rekonstruksi aggregate
  - Snapshot dan kompaksi aliran
  - Proyeksi dan materialisasi read-model
- **Sagas dan Koordinasi Terdistribusi**
  - Saga untuk alur kerja jangka panjang
  - Pola outbox untuk outbox transaksional + penerbitan pesan
  - Transaksi kompensasi dan eventual consistency

### Minggu 7: GraphQL dengan Code-First dan Federation

- **GraphQL Code-First**
  - `@nestjs/graphql` dengan pendekatan schema-first vs code-first
  - Object type, input, enum, dan pola `@Resolver()`
  - Query, mutation, dan subscription dalam arsitektur resolvers
- **GraphQL Lanjutan**
  - DataLoader untuk batching dan eliminasi N+1
  - Caching DataLoader, auth directive, dan kebijakan level field
  - Union type, interface, dan desain skema siap federation
- **Federation dan Gateway**
  - Membangun skema federated dari banyak service
  - Integrasi Apollo Gateway / `@apollo/federation`
  - Entity reference, directive `@key`, dan resolver lintas-service

### Minggu 8: Penguatan Keamanan dan Perhatian Edge

- **Autentikasi dan Otorisasi dalam Skala Besar**
  - Siklus hidup JWT, refresh token, dan strategi rotasi
  - RBAC/ABAC halus dengan guard dan dekorator kustom
  - API key, scope, dan alur OAuth2 dalam topologi mikrosistem
- **Keamanan Edge**
  - Rate limiting dengan `@nestjs/throttler` dan penyimpanan Redis
  - Sanitasi input, guard deserialisasi, dan perlindungan mass-assignment
  - CSRF, CORS, dan hardening header HTTP
- **Audit dan Kepatuhan**
  - Audit aksi dan log audit yang tidak dapat diubah
  - Penanganan data sensitif, masking, dan enkripsi saat istirahat
  - Manajemen secrets dan konfigurasi aman

### Minggu 9: Observability, Logging, dan Keandalan

- **Logging Terstruktur**
  - Log terstruktur yang dapat diurai mesin dengan request ID
  - Correlation ID yang menyebar antar-service
  - Level log, sampling, dan pengiriman log
- **Tracing dan Metrik**
  - Instrumentasi OpenTelemetry dan distributed tracing
  - Metrik: RED (rate, errors, duration) vs USE (utilization, saturation, errors)
  - Mengekspos metrik Prometheus dan membangun dashboard
- **Rekayasa Keandalan**
  - Health check, probe readiness/liveness, dan graceful shutdown
  - Urutan startup dan kesiapan dependency
  - Pengujian ketahanan dan load testing

### Minggu 10: Deployment, Multi-Tenancy, dan Pola Platform

- **Deployment Kontainer dan Orchestrasi**
  - Multi-stage build dan optimasi image untuk service NestJS
  - Pola deployment Kubernetes, HPA, dan rolling update
  - Pertimbangan service mesh dan mTLS
- **Pola Multi-Tenancy**
  - Tenancy database-per-tenant, schema-per-tenant, dan shared-schema
  - Middleware resolusi tenant dan akses data ber-scope
  - Isolasi caching dan rate-limit per-tenant
- **Platform Engineering**
  - Versioning API dan manajemen kontrak
  - Feature flags dan progressive delivery
  - Membangun platform internal yang dapat digunakan kembali dari mikrosistem

## Proyek Akhir

Bangun **"Ledgerly"**, sebuah platform pembukuan finansial multi-tenant berbasis event yang dipecah menjadi layanan yang dapat di-deploy secara independen. Platform ini harus menunjukkan pola arsitektur lanjutan dari kurikulum:

- **Topologi Layanan**: Setidaknya tiga service (auth, ledger/inti transaksi, dan reporting/read-model) yang berkomunikasi melalui message broker dengan pola request-response dan event.
- **CQRS + Event Sourcing**: Inti transaksi menggunakan event store dengan aggregate, proyeksi, dan publisher berbasis outbox untuk menjamin pengiriman.
- **GraphQL Federation**: Gateway federated yang menggabungkan skema dari service auth dan ledger dengan entity reference.
- **Multi-Tenancy**: Isolasi tenant pada lapisan data dengan akses ber-scope tenant, caching, dan rate limiting.
- **Observability**: Tracing OpenTelemetry di seluruh service, logging correlation-ID terstruktur, dan metrik Prometheus untuk seluruh topologi.
- **Ketahanan**: Konsumen idempoten, penanganan dead-letter, circuit breaker, dan degradasi yang mulus di bawah kegagalan parsial.
- **Keamanan**: Rotasi refresh JWT, otorisasi halus, dan rate limiting berbasis Redis.

Peserta harus menyerahkan kode sumber multi-repo lengkap, dokumen arsitektur yang menjelaskan setiap pola beserta trade-off-nya, bukti tracing/metrik, dan manifest deployment untuk seluruh platform.

## Kriteria Penilaian

- **Tugas Lab Mingguan (30%)**: Lab intensif berbasis kode setiap minggu yang menunjukkan konsep mendalam (dekorator kustom, modul dinamis, CQRS, federation, dan seterusnya).
- **Tinjauan Arsitektur Tengah Kursus (20%)**: Tinjauan tertulis dan berbasis kode atas topologi layanan dan desain akses data pada Minggu 6.
- **Proyek Akhir (40%)**: Platform Ledgerly yang memenuhi semua persyaratan — gateway federated, inti event-sourced, multi-tenancy, observability, dan ketahanan — dengan pengujian yang lolos untuk jalur kritis.
- **Kualitas Rekayasa (10%)**: Standar berorientasi produksi — kode ber-tipe, penanganan error eksplisit, log terstruktur, batas modul yang koheren, dan cakupan yang bermakna.

## Referensi

- [Dokumentasi Resmi NestJS](https://docs.nestjs.com/)
- [Dokumentasi Mikrosistem NestJS](https://docs.nestjs.com/microservices/techniques)
- [Dokumentasi GraphQL Code-First NestJS](https://docs.nestjs.com/graphql/quick-start)
- [@nestjs/cqrs dan Pola CQRS](https://docs.nestjs.com/recipes/cqrs)
- [Dokumentasi Apollo Federation](https://www.apollographql.com/docs/federation/)
- [Dokumentasi OpenTelemetry](https://opentelemetry.io/docs/)
- [Microsoft Cloud Design Patterns (CQRS, Saga, Outbox)](https://learn.microsoft.com/en-us/azure/architecture/patterns/)
- [Dokumentasi Kubernetes](https://kubernetes.io/docs/)

---
title: "Silabus Pengembangan NestJS"
description: "Kurikulum komprehensif 12 minggu yang mencakup pengembangan NestJS dari dasar hingga deployment produksi — modul, controller, provider, dependency injection, TypeORM, autentikasi, WebSocket gateway, pengujian, dan proyek akhir REST API."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "syllabus"
locale: "id"
---

# Silabus Pengembangan NestJS

## Ringkasan

Kurikulum 12 minggu ini dirancang untuk mengembangkan kemampuan peserta dari dasar NestJS hingga pengembangan aplikasi siap produksi. Dimulai dari blok bangunan inti — modul, controller, provider, dan dependency injection — kursus ini secara progresif mencakup integrasi database dengan TypeORM, strategi autentikasi, komunikasi real-time melalui WebSocket gateway, metodologi pengujian, dan deployment dengan Docker dan CI/CD. Setiap model menggabungkan pembelajaran konseptual dengan latihan coding langsung, yang berpuncak pada proyek akhir aplikasi full-stack. Silabus ini mengasumsikan peserta sudah familiar dengan TypeScript dan konsep dasar Node.js.

## Kurikulum

### Minggu 1: Fundamental NestJS dan Persiapan Proyek

- **CLI NestJS**
  - Instalasi CLI (`npm i -g @nestjs/cli`)
  - Pembuatan proyek dengan `nest new`
  - Memahami struktur proyek yang dihasilkan
  - `nest generate` untuk modul, controller, service
- **Arsitektur Aplikasi**
  - Entry point (`main.ts`) dan `NestFactory`
  - Pohon modul dan `AppModule` root
  - Gambaran umum siklus hidup request
- **Alat Pengembangan**
  - Hot-reload dengan `nest start --watch`
  - Mode debug dengan `--debug`
  - Konfigurasi TypeScript untuk NestJS

### Minggu 2: Modul dan Controller

- **Modul**
  - Dekorator `@Module()` dan metadata-nya (imports, controllers, providers, exports)
  - Pola feature module
  - Shared module dan global module (`@Global()`)
  - Dynamic module dengan `forRoot()` / `forFeature()`
- **Controller**
  - Dekorator `@Controller()` dan prefix rute
  - Handler request: `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`
  - Parameter rute (`@Param()`), parameter query (`@Query()`)
  - Body request (`@Body()`) dan header (`@Headers()`)
  - Kustomisasi respons dengan `@Res()` (integrasi Express/Fastify)

### Minggu 3: Provider dan Dependency Injection

- **Provider**
  - Dekorator `@Injectable()` dan pendaftaran provider
  - Standard provider, value provider, factory provider
  - Custom provider dengan `useClass`, `useValue`, `useFactory`, `useExisting`
- **Dependency Injection**
  - Injeksi berbasis constructor
  - Injeksi berbasis properti dengan `@Inject()`
  - Scope provider: `SINGLETON` (default), `REQUEST`, `TRANSIENT`
  - Token injeksi kustom
- **Pola Service Layer**
  - Enkapsulasi logika bisnis dalam service
  - Wiring dependensi antar service

### Minggu 4: Pipe, DTO, dan Validasi

- **Pipe**
  - Pipe bawaan: `ValidationPipe`, `ParseIntPipe`, `ParseUUIDPipe`, `ParseBoolPipe`
  - Pipe transformasi vs validasi
  - Pipe kustom: mengimplementasikan `PipeTransform`
- **DTO dan Validasi**
  - DTO berbasis class dengan `class-validator` dan `class-transformer`
  - Whitelisting dan melarang properti non-dekorasi
  - Global pipe vs pipe terbatas (tingkat controller/handler)
  - Dekorator `@UsePipes()`
- **Serialisasi Data**
  - `ClassSerializerInterceptor` untuk transformasi respons
  - Dekorator `@Exclude()`, `@Expose()`, `@Transform()`

### Minggu 5: Guard dan Autentikasi

- **Guard**
  - `@Injectable()` dengan antarmuka `CanActivate`
  - Execution context dan kelas `Reflector`
  - Kontrol akses berbasis peran dengan guard kustom
  - Guard global, controller, dan method-level
- **Strategi Autentikasi**
  - Integrasi Passport.js dengan `@nestjs/passport`
  - Autentikasi JWT (`@nestjs/jwt`)
  - Local strategy, JWT strategy
  - Auth guard dan perlindungan rute
  - Ekstraksi token, verifikasi, dan penanganan payload

### Minggu 6: Interceptor, Middleware, dan Exception Filter

- **Interceptor**
  - `@Injectable()` dengan antarmuka `NestInterceptor`
  - Transformasi request/respons
  - Interceptor logging dan auditing
  - Interceptor caching dengan operator `map()` dan `tap()`
  - Pola pemrograman aspek-oriented
- **Middleware**
  - Middleware berbasis class dengan `NestMiddleware`
  - Middleware fungsional
  - Middleware consumer dan pola pengecualian
- **Exception Filter**
  - Dekorator `@Catch()` dan antarmuka `ExceptionFilter`
  - HTTP exception bawaan
  - Custom exception filter untuk respons error terstruktur

### Minggu 7: Integrasi Database dengan TypeORM

- **Setup TypeORM**
  - Konfigurasi modul `@nestjs/typeorm`
  - `forRoot()` untuk koneksi database
  - Koneksi multi-database
- **Entitas dan Repository**
  - Dekorator entitas: `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn()`
  - Relasi: `@OneToOne()`, `@OneToMany()`, `@ManyToOne()`, `@ManyToMany()`
  - Pola Repository dengan `@InjectRepository()`
  - Custom repository
- **Migrasi**
  - Membuat migrasi dari perubahan entitas
  - Menjalankan dan mengembalikan migrasi
  - Seeding data

### Minggu 8: TypeORM Lanjutan dan Optimasi Query

- **Query Builder**
  - Query select, join, where, dan paginasi
  - Subquery dan SQL mentah
  - Pemantauan performa dengan logging
- **Relasi dan Eager/Lazy Loading**
  - Strategi loading relasi
  - Paginasi dengan `skip` / `take`
  - Loading relasi bertingkat
- **Transaksi dan Event**
  - `QueryRunner` untuk transaksi manual
  - Dekorator transaksi
  - Subscriber siklus hidup entitas (`@AfterInsert`, `@BeforeUpdate`, dll.)

### Minggu 9: WebSocket Gateway dan Fitur Real-Time

- **Fundamental WebSocket**
  - Dekorator `@WebSocketGateway()`
  - Konfigurasi gateway (namespace, CORS, adapter)
  - Handler event `@SubscribeMessage()`
  - Dekorator `@ConnectedSocket()` dan `@MessageBody()`
- **Manajemen State**
  - Melacak klien terhubung dengan `Map` atau `Set`
  - Broadcasting berbasis ruangan
  - Autentikasi di gateway
- **Pola Lanjutan**
  - Aplikasi hybrid WebSocket + HTTP
  - Exception filter untuk WebSocket
  - Pipe dan guard di gateway

### Minggu 10: Dokumentasi OpenAPI dan Swagger

- **Setup Swagger**
  - Konfigurasi modul `@nestjs/swagger`
  - `SwaggerModule.createDocument()` dan `setup()`
  - Kustomisasi Swagger UI (judul, deskripsi, versi)
- **Dekorator untuk Dokumentasi API**
  - `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`
  - `@ApiBearerAuth()`, `@ApiQuery()`, `@ApiParam()`
  - `@ApiBody()`, `@ApiProperty()` untuk dekorator DTO
- **Swagger Lanjutan**
  - Pembuatan model dinamis
  - Dokumentasi enum dan union type
  - Komponen dan skema yang dapat digunakan kembali

### Minggu 11: Pengujian — Unit, Integrasi, dan E2E

- **Pengujian Unit dengan Jest**
  - Menguji service dengan `Test.createTestingModule()`
  - Mocking provider dan repository
  - Factory mock kustom
- **Pengujian Integrasi**
  - Menguji controller dengan supertest
  - Database test container (SQLite in-memory untuk TypeORM)
  - Helper pengujian autentikasi
- **Pengujian E2E**
  - Setup pengujian E2E `@nestjs/testing`
  - Siklus hidup pengujian (`beforeAll`, `afterAll`)
  - Pengujian siklus request/respons penuh
  - Laporan coverage

### Minggu 12: Deployment, Docker, dan CI/CD

- **Build Produksi**
  - `nest build` dan optimasi output
  - Konfigurasi environment dengan `@nestjs/config`
  - Manajemen proses dengan PM2
- **Containerization**
  - Multi-stage Dockerfile untuk NestJS
  - Docker Compose untuk orkestrasi service (aplikasi + database)
  - Health check dan graceful shutdown
- **Pipeline CI/CD**
  - Workflow GitHub Actions untuk test + build + deploy
  - Manajemen environment variable dan secret
  - Pipeline migrasi database di CI

## Proyek Akhir

Bangun REST API siap produksi untuk **platform manajemen tugas** dengan fitur-fitur berikut:

- **Manajemen Pengguna**: Registrasi, login, manajemen profil dengan autentikasi JWT
- **CRUD Tugas**: Membuat, membaca, memperbarui, dan menghapus tugas dengan tag dan tingkat prioritas
- **Organisasi Proyek**: Mengelompokkan tugas ke dalam proyek dengan penugasan anggota tim
- **Notifikasi Real-Time**: Pembaruan langsung berbasis WebSocket saat tugas ditugaskan atau dimodifikasi
- **Kontrol Akses Berbasis Peran**: Peran admin, manajer proyek, dan anggota dengan izin berbeda
- **Dokumentasi API**: Dokumentasi Swagger/OpenAPI lengkap untuk semua endpoint
- **Suite Pengujian**: Pengujian unit untuk service, pengujian integrasi untuk controller, pengujian E2E untuk alur kritis
- **Deployment Docker**: Aplikasi ter-container dengan Docker Compose

Peserta harus mengirimkan kode sumber lengkap, dokumentasi API, laporan coverage pengujian, dan panduan deployment.

## Kriteria Penilaian

- **Tugas Mingguan (30%)**: Latihan coding langsung di akhir setiap minggu untuk memperkuat konsep
- **Proyek Tengah Semester (20%)**: Mini-proyek di Minggu 6 yang mencakup modul, controller, service, guard, dan integrasi TypeORM dasar
- **Proyek Akhir (40%)**: API manajemen tugas lengkap yang memenuhi semua persyaratan yang ditentukan, dengan pengujian dan dokumentasi yang lulus
- **Kualitas Kode (10%)**: Kepatuhan terhadap konvensi NestJS, penanganan error yang tepat, type safety TypeScript, dan coverage pengujian yang bermakna

## Referensi

- [Dokumentasi Resmi NestJS](https://docs.nestjs.com/)
- [Repositori GitHub NestJS](https://github.com/nestjs/nest)
- [Dokumentasi TypeORM](https://typeorm.io/)
- [Dokumentasi Passport.js](http://www.passportjs.org/docs/)
- [JWT.io](https://jwt.io/)
- [Spesifikasi Swagger / OpenAPI](https://swagger.io/specification/)
- [Framework Pengujian Jest](https://jestjs.io/)
- [Dokumentasi Docker](https://docs.docker.com/)

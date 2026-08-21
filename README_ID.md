# ReinvyLibrary

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Reinvy/ReinvyLibrary/actions/workflows/verify-content.yml/badge.svg)](https://github.com/Reinvy/ReinvyLibrary/actions)

Selamat datang di **ReinvyLibrary**! Repositori ini adalah koleksi materi edukasi teknologi berbasis markdown terkurasi yang bersifat open-source. Dibuat oleh Reinvy, repositori ini berfungsi sebagai pusat pembelajaran berbasis komunitas dan ramah mesin (machine-readable) yang berisi tutorial, silabus, cheat sheet, dan panduan praktis.

Baik Anda seorang pengembang yang ingin mempelajari keahlian baru, pendidik yang merancang kurikulum, atau **Agentic AI** yang ingin mempelajari serta menghasilkan konten teknologi, Anda akan menemukan materi bilingual yang terstruktur dan konsisten di sini.

---

## Pilihan Bahasa

- [English](README.md)
- [Bahasa Indonesia](README_ID.md)

---

## Daftar Isi

- [Pendahuluan](#pendahuluan)
- [Taksonomi Repositori](#taksonomi-repositori)
- [Indeks Perpustakaan Konten](#indeks-perpustakaan-konten)
- [Memulai](#memulai)
- [Cara Berkontribusi](#cara-berkontribusi)
- [Otomatisasi & Validasi](#otomatisasi--validasi)
- [Lisensi](#lisensi)
- [Kontak](#kontak)

---

## Pendahuluan

**ReinvyLibrary** dirancang dari awal untuk memastikan konsistensi dan kualitas konten. Seluruh materi ditulis dalam format Markdown standar, dimulai dengan skema metadata YAML frontmatter yang seragam, dan divalidasi secara otomatis menggunakan skrip lokal serta GitHub Actions. Hal ini membuat repositori ini sangat skalabel dan mudah diintegrasikan dengan alat otomatisasi atau AI agent.

---

## Taksonomi Repositori

Perpustakaan ini diatur berdasarkan **Bidang/Kategori** terlebih dahulu, kemudian **Teknologi**, lalu diikuti oleh **Tipe Konten**:

```plaintext
<kategori>/
├── <teknologi>/
│   ├── tutorials/      # Panduan pengkodean langkah demi langkah
│   ├── syllabi/        # Garis besar kursus dan silabus
│   ├── cheatsheets/    # Referensi cepat perintah dan sintaks
│   └── guides/         # Pedoman arsitektur dan praktik terbaik
```

---

## Indeks Perpustakaan Konten

Di bawah ini adalah daftar semua materi yang tersedia di perpustakaan, diperbarui secara dinamis:

<!-- INDEX_START -->
### 📁 Backend

#### 🏷️ Expressjs

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Strategi Versioning API di Express JS](backend/expressjs/tutorials/api-versioning-strategies.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/api-versioning-strategies.md) \| [ID](backend/expressjs/tutorials/api-versioning-strategies_id.md) |
| [Pemrosesan Tugas Asinkron di Express JS dengan BullMQ](backend/expressjs/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq.md) \| [ID](backend/expressjs/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq_id.md) |
| [Autentikasi dan Otorisasi Menggunakan JWT di Express.js](backend/expressjs/tutorials/authentication-and-authorization-with-jwt.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/authentication-and-authorization-with-jwt.md) \| [ID](backend/expressjs/tutorials/authentication-and-authorization-with-jwt_id.md) |
| [Autentikasi dengan Passport JS di Express](backend/expressjs/tutorials/authentication-with-passport-js.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/authentication-with-passport-js.md) \| [ID](backend/expressjs/tutorials/authentication-with-passport-js_id.md) |
| [Memahami Routing dan Middleware Dasar di Express.js](backend/expressjs/tutorials/basic-routing-and-middleware.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/basic-routing-and-middleware.md) \| [ID](backend/expressjs/tutorials/basic-routing-and-middleware_id.md) |
| [Membangun GraphQL API dengan Express dan Apollo Server](backend/expressjs/tutorials/building-graph-ql-apis.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/building-graph-ql-apis.md) \| [ID](backend/expressjs/tutorials/building-graph-ql-apis_id.md) |
| [Membangun Aplikasi Express yang Type-Safe dengan TypeScript](backend/expressjs/tutorials/building-type-safe-express-apps-with-type-script.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/building-type-safe-express-apps-with-type-script.md) \| [ID](backend/expressjs/tutorials/building-type-safe-express-apps-with-type-script_id.md) |
| [Caching di API Express JS menggunakan Redis](backend/expressjs/tutorials/caching-in-express-js-apis-with-redis.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/caching-in-express-js-apis-with-redis.md) \| [ID](backend/expressjs/tutorials/caching-in-express-js-apis-with-redis_id.md) |
| [Validasi Data dan Penanganan Error Terpusat di Express.js](backend/expressjs/tutorials/data-validation-and-error-handling.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/data-validation-and-error-handling.md) \| [ID](backend/expressjs/tutorials/data-validation-and-error-handling_id.md) |
| [Validasi Data dengan Zod di Express JS](backend/expressjs/tutorials/data-validation-with-zod.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/data-validation-with-zod.md) \| [ID](backend/expressjs/tutorials/data-validation-with-zod_id.md) |
| [Integrasi Database dengan Express JS dan Mongoose](backend/expressjs/tutorials/database-integration-with-express-js-and-mongoose.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/database-integration-with-express-js-and-mongoose.md) \| [ID](backend/expressjs/tutorials/database-integration-with-express-js-and-mongoose_id.md) |
| [Men-deploy Aplikasi Express JS ke Production](backend/expressjs/tutorials/deploying-express-js-applications-to-production.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/deploying-express-js-applications-to-production.md) \| [ID](backend/expressjs/tutorials/deploying-express-js-applications-to-production_id.md) |
| [Dockerizing Aplikasi Express JS](backend/expressjs/tutorials/dockerizing-express-js-applications.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/dockerizing-express-js-applications.md) \| [ID](backend/expressjs/tutorials/dockerizing-express-js-applications_id.md) |
| [Environment Variables di Express JS](backend/expressjs/tutorials/environment-variables.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/environment-variables.md) \| [ID](backend/expressjs/tutorials/environment-variables_id.md) |
| [Praktik Terbaik Keamanan di Express.js](backend/expressjs/tutorials/express-js-security-best-practices.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/express-js-security-best-practices.md) \| [ID](backend/expressjs/tutorials/express-js-security-best-practices_id.md) |
| [Langkah Integrasi Prisma dengan Express.js](backend/expressjs/tutorials/express-with-prisma.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/express-with-prisma.md) \| [ID](backend/expressjs/tutorials/express-with-prisma_id.md) |
| [Panduan Praktik Terbaik Express.js](backend/expressjs/guides/expressjs-best-practices-guide.md) | Guide | Intermediate | [EN](backend/expressjs/guides/expressjs-best-practices-guide.md) \| [ID](backend/expressjs/guides/expressjs-best-practices-guide_id.md) |
| [Cheat Sheet Express.js](backend/expressjs/cheatsheets/expressjs-cheatsheet.md) | Cheatsheet | Beginner | [EN](backend/expressjs/cheatsheets/expressjs-cheatsheet.md) \| [ID](backend/expressjs/cheatsheets/expressjs-cheatsheet_id.md) |
| [Silabus Pengembangan Express.js](backend/expressjs/syllabi/expressjs-development-syllabus.md) | Syllabus | Intermediate | [EN](backend/expressjs/syllabi/expressjs-development-syllabus.md) \| [ID](backend/expressjs/syllabi/expressjs-development-syllabus_id.md) |
| [Langkah Membuat Project Express.js dengan Express Generator](backend/expressjs/tutorials/getting-started-with-express-generator.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/getting-started-with-express-generator.md) \| [ID](backend/expressjs/tutorials/getting-started-with-express-generator_id.md) |
| [Graceful Shutdown di Aplikasi Express JS](backend/expressjs/tutorials/graceful-shutdown-in-express-js-applications.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/graceful-shutdown-in-express-js-applications.md) \| [ID](backend/expressjs/tutorials/graceful-shutdown-in-express-js-applications_id.md) |
| [Handling File Downloads and Streaming in Express JS](backend/expressjs/tutorials/handling-file-downloads-and-streaming.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/handling-file-downloads-and-streaming.md) \| [ID](backend/expressjs/tutorials/handling-file-downloads-and-streaming_id.md) |
| [Menangani Upload File di Express JS dengan Multer](backend/expressjs/tutorials/handling-file-uploads-in-express-js-with-multer.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/handling-file-uploads-in-express-js-with-multer.md) \| [ID](backend/expressjs/tutorials/handling-file-uploads-in-express-js-with-multer_id.md) |
| [Mengimplementasikan Health Checks dan Readiness Probes di Express JS](backend/expressjs/tutorials/implementing-health-checks-and-readiness-probes.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/implementing-health-checks-and-readiness-probes.md) \| [ID](backend/expressjs/tutorials/implementing-health-checks-and-readiness-probes_id.md) |
| [Mengimplementasikan OAuth 2.0 dan Social Login di Express JS](backend/expressjs/tutorials/implementing-oauth-2-0-and-social-login.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/implementing-oauth-2-0-and-social-login.md) \| [ID](backend/expressjs/tutorials/implementing-oauth-2-0-and-social-login_id.md) |
| [Mengimplementasikan Refresh Token dengan JWT di Express.js](backend/expressjs/tutorials/implementing-refresh-tokens-with-jwt.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/implementing-refresh-tokens-with-jwt.md) \| [ID](backend/expressjs/tutorials/implementing-refresh-tokens-with-jwt_id.md) |
| [Implementing Role-Based Access Control in Express JS](backend/expressjs/tutorials/implementing-role-based-access-control.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/implementing-role-based-access-control.md) \| [ID](backend/expressjs/tutorials/implementing-role-based-access-control_id.md) |
| [Implementasi Server-Sent Events (SSE) di Express JS](backend/expressjs/tutorials/implementing-server-sent-events-sse.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/implementing-server-sent-events-sse.md) \| [ID](backend/expressjs/tutorials/implementing-server-sent-events-sse_id.md) |
| [Implementasi Webhooks di Express JS](backend/expressjs/tutorials/implementing-webhooks.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/implementing-webhooks.md) \| [ID](backend/expressjs/tutorials/implementing-webhooks_id.md) |
| [Mengintegrasikan Swagger UI untuk Dokumentasi API di Express.js](backend/expressjs/tutorials/integrating-swagger-ui-for-api-documentation.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/integrating-swagger-ui-for-api-documentation.md) \| [ID](backend/expressjs/tutorials/integrating-swagger-ui-for-api-documentation_id.md) |
| [Logging dan Monitoring di Express JS](backend/expressjs/tutorials/logging-and-monitoring.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/logging-and-monitoring.md) \| [ID](backend/expressjs/tutorials/logging-and-monitoring_id.md) |
| [Paginasi, Filtering, dan Sorting pada API Express.js](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis.md) \| [ID](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis_id.md) |
| [Password Hashing and Salting di Express JS dengan Bcrypt](backend/expressjs/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt.md) \| [ID](backend/expressjs/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt_id.md) |
| [Teknik Optimasi Performa di Express JS](backend/expressjs/tutorials/performance-optimization-techniques.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/performance-optimization-techniques.md) \| [ID](backend/expressjs/tutorials/performance-optimization-techniques_id.md) |
| [Rate Limiting dan API Throttling di Express JS](backend/expressjs/tutorials/rate-limiting-and-api-throttling.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/rate-limiting-and-api-throttling.md) \| [ID](backend/expressjs/tutorials/rate-limiting-and-api-throttling_id.md) |
| [Real-Time Communication di Express dengan Socket.IO](backend/expressjs/tutorials/real-time-communication-in-express-with-socket-io.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/real-time-communication-in-express-with-socket-io.md) \| [ID](backend/expressjs/tutorials/real-time-communication-in-express-with-socket-io_id.md) |
| [Scaling Express JS Applications with PM2 and Clustering](backend/expressjs/tutorials/scaling-express-js-applications-with-pm2-and-clustering.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/scaling-express-js-applications-with-pm2-and-clustering.md) \| [ID](backend/expressjs/tutorials/scaling-express-js-applications-with-pm2-and-clustering_id.md) |
| [Sending Emails in Express JS with Nodemailer](backend/expressjs/tutorials/sending-emails-in-express-js-with-nodemailer.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/sending-emails-in-express-js-with-nodemailer.md) \| [ID](backend/expressjs/tutorials/sending-emails-in-express-js-with-nodemailer_id.md) |
| [Menyajikan File Statis (Static Files) di Express.js](backend/expressjs/tutorials/serving-static-files.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/serving-static-files.md) \| [ID](backend/expressjs/tutorials/serving-static-files_id.md) |
| [Menata Struktur Aplikasi Express.js yang Skalabel: MVC dan Service Layer](backend/expressjs/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer.md) \| [ID](backend/expressjs/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer_id.md) |
| [Pengujian API Express dengan Jest dan Supertest](backend/expressjs/tutorials/testing-express-api-with-jest-and-supertest.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/testing-express-api-with-jest-and-supertest.md) \| [ID](backend/expressjs/tutorials/testing-express-api-with-jest-and-supertest_id.md) |
| [Memahami Cookies dan Manajemen Session di Express.js](backend/expressjs/tutorials/understanding-cookies-and-session-management.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/understanding-cookies-and-session-management.md) \| [ID](backend/expressjs/tutorials/understanding-cookies-and-session-management_id.md) |
| [Memahami CORS di Express JS](backend/expressjs/tutorials/understanding-cors.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/understanding-cors.md) \| [ID](backend/expressjs/tutorials/understanding-cors_id.md) |
| [Memahami Prinsip Desain RESTful API di Express](backend/expressjs/tutorials/understanding-restful-api-design-principles.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/understanding-restful-api-design-principles.md) \| [ID](backend/expressjs/tutorials/understanding-restful-api-design-principles_id.md) |
| [Memahami Siklus Hidup Request pada Express.js](backend/expressjs/tutorials/understanding-the-express-js-request-lifecycle.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/understanding-the-express-js-request-lifecycle.md) \| [ID](backend/expressjs/tutorials/understanding-the-express-js-request-lifecycle_id.md) |

#### 🏷️ Elysiajs

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Lanjutan Elysia.js](backend/elysiajs/syllabi/advanced-elysiajs-syllabus.md) | Syllabus | Advanced | [EN](backend/elysiajs/syllabi/advanced-elysiajs-syllabus.md) \| [ID](backend/elysiajs/syllabi/advanced-elysiajs-syllabus_id.md) |
| [Membangun REST API dengan ElysiaJS](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs.md) | Tutorial | Intermediate | [EN](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs.md) \| [ID](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs_id.md) |
| [Membangun URL Shortener dengan Elysia.js](backend/elysiajs/tutorials/building-url-shortener-with-elysiajs.md) | Tutorial | Intermediate | [EN](backend/elysiajs/tutorials/building-url-shortener-with-elysiajs.md) \| [ID](backend/elysiajs/tutorials/building-url-shortener-with-elysiajs_id.md) |
| [Cheat Sheet Elysia.js](backend/elysiajs/cheatsheets/elysiajs-cheatsheet.md) | Cheatsheet | Beginner | [EN](backend/elysiajs/cheatsheets/elysiajs-cheatsheet.md) \| [ID](backend/elysiajs/cheatsheets/elysiajs-cheatsheet_id.md) |
| [Cheat Sheet Integrasi Database Elysia.js](backend/elysiajs/cheatsheets/elysiajs-database-integration-cheatsheet.md) | Cheatsheet | Intermediate | [EN](backend/elysiajs/cheatsheets/elysiajs-database-integration-cheatsheet.md) \| [ID](backend/elysiajs/cheatsheets/elysiajs-database-integration-cheatsheet_id.md) |
| [Panduan Pola Produksi Elysia.js](backend/elysiajs/guides/elysiajs-production-patterns-guide.md) | Guide | Intermediate | [EN](backend/elysiajs/guides/elysiajs-production-patterns-guide.md) \| [ID](backend/elysiajs/guides/elysiajs-production-patterns-guide_id.md) |
| [Panduan Aplikasi Real-Time dengan WebSocket dan SSE di Elysia.js](backend/elysiajs/guides/elysiajs-realtime-websocket-guide.md) | Guide | Intermediate | [EN](backend/elysiajs/guides/elysiajs-realtime-websocket-guide.md) \| [ID](backend/elysiajs/guides/elysiajs-realtime-websocket-guide_id.md) |
| [Silabus Pengembangan Web Elysia.js](backend/elysiajs/syllabi/elysiajs-web-development-syllabus.md) | Syllabus | Intermediate | [EN](backend/elysiajs/syllabi/elysiajs-web-development-syllabus.md) \| [ID](backend/elysiajs/syllabi/elysiajs-web-development-syllabus_id.md) |

#### 🏷️ Golang

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Optimasi Kinerja dan Profiling Go Tingkat Lanjut](backend/golang/syllabi/advanced-golang-syllabus.md) | Syllabus | Advanced | [EN](backend/golang/syllabi/advanced-golang-syllabus.md) \| [ID](backend/golang/syllabi/advanced-golang-syllabus_id.md) |
| [Membangun RESTful API dengan Go](backend/golang/tutorials/building-restful-api-with-go.md) | Tutorial | Intermediate | [EN](backend/golang/tutorials/building-restful-api-with-go.md) \| [ID](backend/golang/tutorials/building-restful-api-with-go_id.md) |
| [Membangun Server Chat WebSocket Real-time dengan Go](backend/golang/tutorials/building-websocket-chat-server-with-go.md) | Tutorial | Intermediate | [EN](backend/golang/tutorials/building-websocket-chat-server-with-go.md) \| [ID](backend/golang/tutorials/building-websocket-chat-server-with-go_id.md) |
| [Memulai Pemrograman Go](backend/golang/tutorials/getting-started-with-go.md) | Tutorial | Beginner | [EN](backend/golang/tutorials/getting-started-with-go.md) \| [ID](backend/golang/tutorials/getting-started-with-go_id.md) |
| [Silabus Bahasa Pemrograman Go](backend/golang/syllabi/go-syllabus.md) | Syllabus | Intermediate | [EN](backend/golang/syllabi/go-syllabus.md) \| [ID](backend/golang/syllabi/go-syllabus_id.md) |
| [Panduan Pengujian dan Benchmarking Go](backend/golang/guides/go-testing-and-benchmarking-guide.md) | Guide | Intermediate | [EN](backend/golang/guides/go-testing-and-benchmarking-guide.md) \| [ID](backend/golang/guides/go-testing-and-benchmarking-guide_id.md) |
| [Cheat Sheet Pengembangan Web Go dan HTTP API](backend/golang/cheatsheets/go-web-development-cheatsheet.md) | Cheatsheet | Intermediate | [EN](backend/golang/cheatsheets/go-web-development-cheatsheet.md) \| [ID](backend/golang/cheatsheets/go-web-development-cheatsheet_id.md) |
| [Cheat Sheet Golang](backend/golang/cheatsheets/golang-cheatsheet.md) | Cheatsheet | Intermediate | [EN](backend/golang/cheatsheets/golang-cheatsheet.md) \| [ID](backend/golang/cheatsheets/golang-cheatsheet_id.md) |
| [Panduan Pola Konkurensi Go](backend/golang/guides/golang-concurrency-patterns-guide.md) | Guide | Intermediate | [EN](backend/golang/guides/golang-concurrency-patterns-guide.md) \| [ID](backend/golang/guides/golang-concurrency-patterns-guide_id.md) |

#### 🏷️ Laravel

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Membangun Aplikasi Chat Real-Time dengan Laravel Reverb](backend/laravel/tutorials/building-real-time-chat-with-laravel-reverb.md) | Tutorial | Advanced | [EN](backend/laravel/tutorials/building-real-time-chat-with-laravel-reverb.md) \| [ID](backend/laravel/tutorials/building-real-time-chat-with-laravel-reverb_id.md) |
| [Panduan Praktik Terbaik Laravel](backend/laravel/guides/laravel-best-practices-guide.md) | Guide | Intermediate | [EN](backend/laravel/guides/laravel-best-practices-guide.md) \| [ID](backend/laravel/guides/laravel-best-practices-guide_id.md) |
| [Cheat Sheet Laravel](backend/laravel/cheatsheets/laravel-cheatsheet.md) | Cheatsheet | Beginner | [EN](backend/laravel/cheatsheets/laravel-cheatsheet.md) \| [ID](backend/laravel/cheatsheets/laravel-cheatsheet_id.md) |
| [Tutorial CRUD REST API Laravel](backend/laravel/tutorials/laravel-crud-rest-api-tutorial.md) | Tutorial | Intermediate | [EN](backend/laravel/tutorials/laravel-crud-rest-api-tutorial.md) \| [ID](backend/laravel/tutorials/laravel-crud-rest-api-tutorial_id.md) |
| [Silabus Pengembangan Laravel](backend/laravel/syllabi/laravel-development-syllabus.md) | Syllabus | Intermediate | [EN](backend/laravel/syllabi/laravel-development-syllabus.md) \| [ID](backend/laravel/syllabi/laravel-development-syllabus_id.md) |
| [Cheat Sheet Eloquent ORM Lanjutan](backend/laravel/cheatsheets/laravel-eloquent-advanced-cheatsheet.md) | Cheatsheet | Advanced | [EN](backend/laravel/cheatsheets/laravel-eloquent-advanced-cheatsheet.md) \| [ID](backend/laravel/cheatsheets/laravel-eloquent-advanced-cheatsheet_id.md) |
| [Panduan Pengembangan Paket Laravel](backend/laravel/guides/laravel-package-development-guide.md) | Guide | Advanced | [EN](backend/laravel/guides/laravel-package-development-guide.md) \| [ID](backend/laravel/guides/laravel-package-development-guide_id.md) |
| [Tutorial Queue dan Pemrosesan Job Laravel](backend/laravel/tutorials/laravel-queue-job-processing-tutorial.md) | Tutorial | Advanced | [EN](backend/laravel/tutorials/laravel-queue-job-processing-tutorial.md) \| [ID](backend/laravel/tutorials/laravel-queue-job-processing-tutorial_id.md) |

#### 🏷️ Nestjs

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Arsitektur NestJS Lanjutan dan Rekayasa Produksi](backend/nestjs/syllabi/advanced-nestjs-syllabus.md) | Syllabus | Advanced | [EN](backend/nestjs/syllabi/advanced-nestjs-syllabus.md) \| [ID](backend/nestjs/syllabi/advanced-nestjs-syllabus_id.md) |
| [Membangun API GraphQL dengan NestJS](backend/nestjs/tutorials/building-graphql-api-with-nestjs.md) | Tutorial | Intermediate | [EN](backend/nestjs/tutorials/building-graphql-api-with-nestjs.md) \| [ID](backend/nestjs/tutorials/building-graphql-api-with-nestjs_id.md) |
| [Membangun API Chat Real-Time dengan NestJS dan WebSocket Gateway](backend/nestjs/tutorials/building-real-time-chat-api-with-nestjs-websocket.md) | Tutorial | Intermediate | [EN](backend/nestjs/tutorials/building-real-time-chat-api-with-nestjs-websocket.md) \| [ID](backend/nestjs/tutorials/building-real-time-chat-api-with-nestjs-websocket_id.md) |
| [Memulai dengan NestJS](backend/nestjs/tutorials/getting-started-with-nestjs.md) | Tutorial | Intermediate | [EN](backend/nestjs/tutorials/getting-started-with-nestjs.md) \| [ID](backend/nestjs/tutorials/getting-started-with-nestjs_id.md) |
| [Panduan Praktik Terbaik NestJS](backend/nestjs/guides/nestjs-best-practices-guide.md) | Guide | Intermediate | [EN](backend/nestjs/guides/nestjs-best-practices-guide.md) \| [ID](backend/nestjs/guides/nestjs-best-practices-guide_id.md) |
| [Cheat Sheet NestJS](backend/nestjs/cheatsheets/nestjs-cheatsheet.md) | Cheatsheet | Intermediate | [EN](backend/nestjs/cheatsheets/nestjs-cheatsheet.md) \| [ID](backend/nestjs/cheatsheets/nestjs-cheatsheet_id.md) |
| [Silabus Pengembangan NestJS](backend/nestjs/syllabi/nestjs-development-syllabus.md) | Syllabus | Intermediate | [EN](backend/nestjs/syllabi/nestjs-development-syllabus.md) \| [ID](backend/nestjs/syllabi/nestjs-development-syllabus_id.md) |
| [Panduan Mikroservis NestJS](backend/nestjs/guides/nestjs-microservices-guide.md) | Guide | Advanced | [EN](backend/nestjs/guides/nestjs-microservices-guide.md) \| [ID](backend/nestjs/guides/nestjs-microservices-guide_id.md) |
| [Cheatsheet Pengujian NestJS](backend/nestjs/cheatsheets/nestjs-testing-cheatsheet.md) | Cheatsheet | Advanced | [EN](backend/nestjs/cheatsheets/nestjs-testing-cheatsheet.md) \| [ID](backend/nestjs/cheatsheets/nestjs-testing-cheatsheet_id.md) |

#### 🏷️ Bun

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Lanjutan Internal Runtime Bun](backend/bun/syllabi/advanced-bun-syllabus.md) | Syllabus | Advanced | [EN](backend/bun/syllabi/advanced-bun-syllabus.md) \| [ID](backend/bun/syllabi/advanced-bun-syllabus_id.md) |
| [Membangun Aplikasi Chat Real-time dengan Bun WebSocket](backend/bun/tutorials/building-real-time-chat-with-bun-websocket.md) | Tutorial | Intermediate | [EN](backend/bun/tutorials/building-real-time-chat-with-bun-websocket.md) \| [ID](backend/bun/tutorials/building-real-time-chat-with-bun-websocket_id.md) |
| [Cheat Sheet CLI dan API Bun](backend/bun/cheatsheets/bun-cheatsheet.md) | Cheatsheet | Intermediate | [EN](backend/bun/cheatsheets/bun-cheatsheet.md) \| [ID](backend/bun/cheatsheets/bun-cheatsheet_id.md) |
| [Silabus Pengembangan Bun](backend/bun/syllabi/bun-development-syllabus.md) | Syllabus | Intermediate | [EN](backend/bun/syllabi/bun-development-syllabus.md) \| [ID](backend/bun/syllabi/bun-development-syllabus_id.md) |
| [Panduan I/O Berkas dan Pemrosesan Stream dengan Bun](backend/bun/guides/bun-file-io-stream-processing-guide.md) | Guide | Intermediate | [EN](backend/bun/guides/bun-file-io-stream-processing-guide.md) \| [ID](backend/bun/guides/bun-file-io-stream-processing-guide_id.md) |
| [Panduan Pola Produksi Bun](backend/bun/guides/bun-production-patterns-guide.md) | Guide | Intermediate | [EN](backend/bun/guides/bun-production-patterns-guide.md) \| [ID](backend/bun/guides/bun-production-patterns-guide_id.md) |
| [Cheat Sheet SQLite dan Operasi Database Bun](backend/bun/cheatsheets/bun-sqlite-database-cheatsheet.md) | Cheatsheet | Intermediate | [EN](backend/bun/cheatsheets/bun-sqlite-database-cheatsheet.md) \| [ID](backend/bun/cheatsheets/bun-sqlite-database-cheatsheet_id.md) |
| [Panduan Test Runner Bun dan Praktik Terbaik Pengujian](backend/bun/guides/bun-test-runner-and-testing-guide.md) | Guide | Advanced | [EN](backend/bun/guides/bun-test-runner-and-testing-guide.md) \| [ID](backend/bun/guides/bun-test-runner-and-testing-guide_id.md) |
| [Memulai dengan Bun](backend/bun/tutorials/getting-started-with-bun.md) | Tutorial | Beginner | [EN](backend/bun/tutorials/getting-started-with-bun.md) \| [ID](backend/bun/tutorials/getting-started-with-bun_id.md) |

### 📁 Frontend

#### 🏷️ Nextjs

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Arsitektur Produksi dan Performa Next.js Tingkat Lanjut](frontend/nextjs/syllabi/advanced-nextjs-syllabus.md) | Syllabus | Advanced | [EN](frontend/nextjs/syllabi/advanced-nextjs-syllabus.md) \| [ID](frontend/nextjs/syllabi/advanced-nextjs-syllabus_id.md) |
| [Membangun Blog Full-Stack dengan Next.js App Router](frontend/nextjs/tutorials/building-a-full-stack-blog-with-nextjs-app-router.md) | Tutorial | Intermediate | [EN](frontend/nextjs/tutorials/building-a-full-stack-blog-with-nextjs-app-router.md) \| [ID](frontend/nextjs/tutorials/building-a-full-stack-blog-with-nextjs-app-router_id.md) |
| [Membangun Toko E-commerce dengan Next.js](frontend/nextjs/tutorials/building-ecommerce-store-with-nextjs.md) | Tutorial | Advanced | [EN](frontend/nextjs/tutorials/building-ecommerce-store-with-nextjs.md) \| [ID](frontend/nextjs/tutorials/building-ecommerce-store-with-nextjs_id.md) |
| [Membangun Dashboard Keuangan Pribadi dengan Next.js](frontend/nextjs/tutorials/building-personal-finance-dashboard-nextjs.md) | Tutorial | Intermediate | [EN](frontend/nextjs/tutorials/building-personal-finance-dashboard-nextjs.md) \| [ID](frontend/nextjs/tutorials/building-personal-finance-dashboard-nextjs_id.md) |
| [Panduan Autentikasi dan Otorisasi Next.js](frontend/nextjs/guides/nextjs-authentication-and-authorization-guide.md) | Guide | Advanced | [EN](frontend/nextjs/guides/nextjs-authentication-and-authorization-guide.md) \| [ID](frontend/nextjs/guides/nextjs-authentication-and-authorization-guide_id.md) |
| [Cheat Sheet Caching dan Revalidasi Next.js](frontend/nextjs/cheatsheets/nextjs-caching-revalidation-cheatsheet.md) | Cheatsheet | Advanced | [EN](frontend/nextjs/cheatsheets/nextjs-caching-revalidation-cheatsheet.md) \| [ID](frontend/nextjs/cheatsheets/nextjs-caching-revalidation-cheatsheet_id.md) |
| [Cheat Sheet Next.js](frontend/nextjs/cheatsheets/nextjs-cheatsheet.md) | Cheatsheet | Intermediate | [EN](frontend/nextjs/cheatsheets/nextjs-cheatsheet.md) \| [ID](frontend/nextjs/cheatsheets/nextjs-cheatsheet_id.md) |
| [Struktur Proyek Next.js dan Praktik Terbaik](frontend/nextjs/guides/nextjs-project-structure-and-best-practices.md) | Guide | Intermediate | [EN](frontend/nextjs/guides/nextjs-project-structure-and-best-practices.md) \| [ID](frontend/nextjs/guides/nextjs-project-structure-and-best-practices_id.md) |
| [Silabus Pengembangan Next.js](frontend/nextjs/syllabi/nextjs-syllabus.md) | Syllabus | Intermediate | [EN](frontend/nextjs/syllabi/nextjs-syllabus.md) \| [ID](frontend/nextjs/syllabi/nextjs-syllabus_id.md) |

#### 🏷️ React Native

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Membangun Aplikasi Maps dan Lokasi dengan React Native](frontend/react-native/tutorials/building-maps-and-location-app-with-react-native.md) | Tutorial | Intermediate | [EN](frontend/react-native/tutorials/building-maps-and-location-app-with-react-native.md) \| [ID](frontend/react-native/tutorials/building-maps-and-location-app-with-react-native_id.md) |
| [Membangun Aplikasi Mobile Berbasis REST API dengan React Native](frontend/react-native/tutorials/building-rest-api-driven-mobile-app-with-react-native.md) | Tutorial | Intermediate | [EN](frontend/react-native/tutorials/building-rest-api-driven-mobile-app-with-react-native.md) \| [ID](frontend/react-native/tutorials/building-rest-api-driven-mobile-app-with-react-native_id.md) |
| [Membangun Aplikasi Media Sosial dengan React Native dan Firebase](frontend/react-native/tutorials/building-social-media-app-with-react-native-firebase.md) | Tutorial | Advanced | [EN](frontend/react-native/tutorials/building-social-media-app-with-react-native-firebase.md) \| [ID](frontend/react-native/tutorials/building-social-media-app-with-react-native-firebase_id.md) |
| [Cheat Sheet React Native](frontend/react-native/cheatsheets/react-native-cheatsheet.md) | Cheatsheet | Intermediate | [EN](frontend/react-native/cheatsheets/react-native-cheatsheet.md) \| [ID](frontend/react-native/cheatsheets/react-native-cheatsheet_id.md) |
| [Silabus Pengembangan React Native](frontend/react-native/syllabi/react-native-development-syllabus.md) | Syllabus | Intermediate | [EN](frontend/react-native/syllabi/react-native-development-syllabus.md) \| [ID](frontend/react-native/syllabi/react-native-development-syllabus_id.md) |
| [Panduan Optimasi Performa dan Debugging React Native](frontend/react-native/guides/react-native-performance-debugging-guide.md) | Guide | Advanced | [EN](frontend/react-native/guides/react-native-performance-debugging-guide.md) \| [ID](frontend/react-native/guides/react-native-performance-debugging-guide_id.md) |
| [Cheat Sheet Keamanan React Native](frontend/react-native/cheatsheets/react-native-security-cheatsheet.md) | Cheatsheet | Advanced | [EN](frontend/react-native/cheatsheets/react-native-security-cheatsheet.md) \| [ID](frontend/react-native/cheatsheets/react-native-security-cheatsheet_id.md) |
| [Panduan Manajemen State React Native](frontend/react-native/guides/react-native-state-management-guide.md) | Guide | Intermediate | [EN](frontend/react-native/guides/react-native-state-management-guide.md) \| [ID](frontend/react-native/guides/react-native-state-management-guide_id.md) |

#### 🏷️ Vuejs

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Membangun Aplikasi Web dengan Vue.js 3](frontend/vuejs/tutorials/building-web-apps-with-vuejs.md) | Tutorial | Intermediate | [EN](frontend/vuejs/tutorials/building-web-apps-with-vuejs.md) \| [ID](frontend/vuejs/tutorials/building-web-apps-with-vuejs_id.md) |
| [Membangun Dashboard Real-Time dengan Vue.js dan WebSocket](frontend/vuejs/tutorials/real-time-dashboard-with-vuejs-websocket.md) | Tutorial | Advanced | [EN](frontend/vuejs/tutorials/real-time-dashboard-with-vuejs-websocket.md) \| [ID](frontend/vuejs/tutorials/real-time-dashboard-with-vuejs-websocket_id.md) |
| [Cheat Sheet Animasi dan Transisi Vue.js](frontend/vuejs/cheatsheets/vuejs-animations-transitions-cheatsheet.md) | Cheatsheet | Intermediate | [EN](frontend/vuejs/cheatsheets/vuejs-animations-transitions-cheatsheet.md) \| [ID](frontend/vuejs/cheatsheets/vuejs-animations-transitions-cheatsheet_id.md) |
| [Panduan Praktik Terbaik Vue.js](frontend/vuejs/guides/vuejs-best-practices-guide.md) | Guide | Advanced | [EN](frontend/vuejs/guides/vuejs-best-practices-guide.md) \| [ID](frontend/vuejs/guides/vuejs-best-practices-guide_id.md) |
| [Cheat Sheet Vue.js](frontend/vuejs/cheatsheets/vuejs-cheatsheet.md) | Cheatsheet | Beginner | [EN](frontend/vuejs/cheatsheets/vuejs-cheatsheet.md) \| [ID](frontend/vuejs/cheatsheets/vuejs-cheatsheet_id.md) |
| [Silabus Aplikasi Enterprise Vue.js dengan TypeScript](frontend/vuejs/syllabi/vuejs-enterprise-typescript-syllabus.md) | Syllabus | Advanced | [EN](frontend/vuejs/syllabi/vuejs-enterprise-typescript-syllabus.md) \| [ID](frontend/vuejs/syllabi/vuejs-enterprise-typescript-syllabus_id.md) |
| [Panduan Penanganan dan Validasi Formulir Vue.js](frontend/vuejs/guides/vuejs-form-handling-validation-guide.md) | Guide | Intermediate | [EN](frontend/vuejs/guides/vuejs-form-handling-validation-guide.md) \| [ID](frontend/vuejs/guides/vuejs-form-handling-validation-guide_id.md) |
| [Silabus Pengembangan Frontend Vue.js](frontend/vuejs/syllabi/vuejs-frontend-development-syllabus.md) | Syllabus | Intermediate | [EN](frontend/vuejs/syllabi/vuejs-frontend-development-syllabus.md) \| [ID](frontend/vuejs/syllabi/vuejs-frontend-development-syllabus_id.md) |
| [Panduan Optimasi Performa Vue.js](frontend/vuejs/guides/vuejs-performance-optimization-guide.md) | Guide | Advanced | [EN](frontend/vuejs/guides/vuejs-performance-optimization-guide.md) \| [ID](frontend/vuejs/guides/vuejs-performance-optimization-guide_id.md) |

#### 🏷️ Tailwindcss

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Tailwind CSS Lanjutan](frontend/tailwindcss/syllabi/advanced-tailwindcss-syllabus.md) | Syllabus | Advanced | [EN](frontend/tailwindcss/syllabi/advanced-tailwindcss-syllabus.md) \| [ID](frontend/tailwindcss/syllabi/advanced-tailwindcss-syllabus_id.md) |
| [Membangun Dashboard UI dengan Tailwind CSS](frontend/tailwindcss/tutorials/building-dashboard-ui-with-tailwind-css.md) | Tutorial | Intermediate | [EN](frontend/tailwindcss/tutorials/building-dashboard-ui-with-tailwind-css.md) \| [ID](frontend/tailwindcss/tutorials/building-dashboard-ui-with-tailwind-css_id.md) |
| [Membangun Landing Page Responsif dengan Tailwind CSS](frontend/tailwindcss/tutorials/building-responsive-landing-page-with-tailwind-css.md) | Tutorial | Beginner | [EN](frontend/tailwindcss/tutorials/building-responsive-landing-page-with-tailwind-css.md) \| [ID](frontend/tailwindcss/tutorials/building-responsive-landing-page-with-tailwind-css_id.md) |
| [Memulai dengan Tailwind CSS](frontend/tailwindcss/tutorials/getting-started-with-tailwind-css.md) | Tutorial | Beginner | [EN](frontend/tailwindcss/tutorials/getting-started-with-tailwind-css.md) \| [ID](frontend/tailwindcss/tutorials/getting-started-with-tailwind-css_id.md) |
| [Panduan Praktik Terbaik Tailwind CSS](frontend/tailwindcss/guides/tailwind-css-best-practices-guide.md) | Guide | Intermediate | [EN](frontend/tailwindcss/guides/tailwind-css-best-practices-guide.md) \| [ID](frontend/tailwindcss/guides/tailwind-css-best-practices-guide_id.md) |
| [Cheat Sheet Tailwind CSS](frontend/tailwindcss/cheatsheets/tailwind-css-cheatsheet.md) | Cheatsheet | Beginner | [EN](frontend/tailwindcss/cheatsheets/tailwind-css-cheatsheet.md) \| [ID](frontend/tailwindcss/cheatsheets/tailwind-css-cheatsheet_id.md) |
| [Panduan Mode Gelap dan Tema untuk Tailwind CSS](frontend/tailwindcss/guides/tailwind-css-dark-mode-and-theming-guide.md) | Guide | Intermediate | [EN](frontend/tailwindcss/guides/tailwind-css-dark-mode-and-theming-guide.md) \| [ID](frontend/tailwindcss/guides/tailwind-css-dark-mode-and-theming-guide_id.md) |
| [Silabus Tailwind CSS](frontend/tailwindcss/syllabi/tailwind-css-syllabus.md) | Syllabus | Beginner | [EN](frontend/tailwindcss/syllabi/tailwind-css-syllabus.md) \| [ID](frontend/tailwindcss/syllabi/tailwind-css-syllabus_id.md) |
| [Cheat Sheet Konfigurasi CSS-First Tailwind CSS v4](frontend/tailwindcss/cheatsheets/tailwind-css-v4-css-first-configuration-cheatsheet.md) | Cheatsheet | Advanced | [EN](frontend/tailwindcss/cheatsheets/tailwind-css-v4-css-first-configuration-cheatsheet.md) \| [ID](frontend/tailwindcss/cheatsheets/tailwind-css-v4-css-first-configuration-cheatsheet_id.md) |

#### 🏷️ Svelte

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Arsitektur Svelte 5 Runes dan SvelteKit Tingkat Lanjut](frontend/svelte/syllabi/advanced-svelte-syllabus.md) | Syllabus | Advanced | [EN](frontend/svelte/syllabi/advanced-svelte-syllabus.md) \| [ID](frontend/svelte/syllabi/advanced-svelte-syllabus_id.md) |
| [Membangun Blog Markdown dengan SvelteKit](frontend/svelte/tutorials/building-markdown-blog-with-sveltekit.md) | Tutorial | Intermediate | [EN](frontend/svelte/tutorials/building-markdown-blog-with-sveltekit.md) \| [ID](frontend/svelte/tutorials/building-markdown-blog-with-sveltekit_id.md) |
| [Membangun Aplikasi Manajemen Tugas dengan SvelteKit](frontend/svelte/tutorials/building-task-management-app-with-sveltekit.md) | Tutorial | Intermediate | [EN](frontend/svelte/tutorials/building-task-management-app-with-sveltekit.md) \| [ID](frontend/svelte/tutorials/building-task-management-app-with-sveltekit_id.md) |
| [Memulai dengan Svelte](frontend/svelte/tutorials/getting-started-with-svelte.md) | Tutorial | Beginner | [EN](frontend/svelte/tutorials/getting-started-with-svelte.md) \| [ID](frontend/svelte/tutorials/getting-started-with-svelte_id.md) |
| [Panduan Praktik Terbaik Svelte](frontend/svelte/guides/svelte-best-practices-guide.md) | Guide | Intermediate | [EN](frontend/svelte/guides/svelte-best-practices-guide.md) \| [ID](frontend/svelte/guides/svelte-best-practices-guide_id.md) |
| [Cheat Sheet Svelte](frontend/svelte/cheatsheets/svelte-cheatsheet.md) | Cheatsheet | Intermediate | [EN](frontend/svelte/cheatsheets/svelte-cheatsheet.md) \| [ID](frontend/svelte/cheatsheets/svelte-cheatsheet_id.md) |
| [Silabus Pengembangan Svelte dan SvelteKit](frontend/svelte/syllabi/svelte-syllabus.md) | Syllabus | Intermediate | [EN](frontend/svelte/syllabi/svelte-syllabus.md) \| [ID](frontend/svelte/syllabi/svelte-syllabus_id.md) |
| [Panduan Internasionalisasi (i18n) dan Lokalisasi SvelteKit](frontend/svelte/guides/sveltekit-internationalization-guide.md) | Guide | Intermediate | [EN](frontend/svelte/guides/sveltekit-internationalization-guide.md) \| [ID](frontend/svelte/guides/sveltekit-internationalization-guide_id.md) |
| [Cheat Sheet Routing dan Data Loading SvelteKit](frontend/svelte/cheatsheets/sveltekit-routing-data-loading-cheatsheet.md) | Cheatsheet | Intermediate | [EN](frontend/svelte/cheatsheets/sveltekit-routing-data-loading-cheatsheet.md) \| [ID](frontend/svelte/cheatsheets/sveltekit-routing-data-loading-cheatsheet_id.md) |

### 📁 Mobile

#### 🏷️ Flutter

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Membangun Aplikasi E-Commerce dengan Flutter](mobile/flutter/tutorials/building-ecommerce-app-with-flutter.md) | Tutorial | Intermediate | [EN](mobile/flutter/tutorials/building-ecommerce-app-with-flutter.md) \| [ID](mobile/flutter/tutorials/building-ecommerce-app-with-flutter_id.md) |
| [Membangun Aplikasi Chat Real-Time dengan Flutter dan Firebase](mobile/flutter/tutorials/building-real-time-chat-app-with-flutter-and-firebase.md) | Tutorial | Advanced | [EN](mobile/flutter/tutorials/building-real-time-chat-app-with-flutter-and-firebase.md) \| [ID](mobile/flutter/tutorials/building-real-time-chat-app-with-flutter-and-firebase_id.md) |
| [Cheat Sheet Animasi dan Transisi Flutter](mobile/flutter/cheatsheets/flutter-animations-cheatsheet.md) | Cheatsheet | Intermediate | [EN](mobile/flutter/cheatsheets/flutter-animations-cheatsheet.md) \| [ID](mobile/flutter/cheatsheets/flutter-animations-cheatsheet_id.md) |
| [Panduan Arsitektur Clean Architecture Flutter](mobile/flutter/guides/flutter-clean-architecture-guide.md) | Guide | Advanced | [EN](mobile/flutter/guides/flutter-clean-architecture-guide.md) \| [ID](mobile/flutter/guides/flutter-clean-architecture-guide_id.md) |
| [Cheat Sheet Networking dan Integrasi API Flutter](mobile/flutter/cheatsheets/flutter-networking-api-cheatsheet.md) | Cheatsheet | Intermediate | [EN](mobile/flutter/cheatsheets/flutter-networking-api-cheatsheet.md) \| [ID](mobile/flutter/cheatsheets/flutter-networking-api-cheatsheet_id.md) |
| [Panduan Optimasi Performa Flutter](mobile/flutter/guides/flutter-performance-optimization-guide.md) | Guide | Advanced | [EN](mobile/flutter/guides/flutter-performance-optimization-guide.md) \| [ID](mobile/flutter/guides/flutter-performance-optimization-guide_id.md) |
| [Silabus Pemrograman Flutter](mobile/flutter/syllabi/flutter-syllabus.md) | Syllabus | Advanced | [EN](mobile/flutter/syllabi/flutter-syllabus.md) \| [ID](mobile/flutter/syllabi/flutter-syllabus_id.md) |
| [Panduan Pengujian Flutter](mobile/flutter/guides/flutter-testing-guide.md) | Guide | Intermediate | [EN](mobile/flutter/guides/flutter-testing-guide.md) \| [ID](mobile/flutter/guides/flutter-testing-guide_id.md) |
| [Silabus Desain UI/UX dan Animasi Flutter](mobile/flutter/syllabi/flutter-ui-ux-design-and-animations-syllabus.md) | Syllabus | Intermediate | [EN](mobile/flutter/syllabi/flutter-ui-ux-design-and-animations-syllabus.md) \| [ID](mobile/flutter/syllabi/flutter-ui-ux-design-and-animations-syllabus_id.md) |
| [Cheat Sheet Widget Flutter](mobile/flutter/cheatsheets/flutter-widget-cheatsheet.md) | Cheatsheet | Beginner | [EN](mobile/flutter/cheatsheets/flutter-widget-cheatsheet.md) \| [ID](mobile/flutter/cheatsheets/flutter-widget-cheatsheet_id.md) |
| [Manajemen State dengan Provider di Flutter](mobile/flutter/tutorials/state-management-with-provider-in-flutter.md) | Tutorial | Intermediate | [EN](mobile/flutter/tutorials/state-management-with-provider-in-flutter.md) \| [ID](mobile/flutter/tutorials/state-management-with-provider-in-flutter_id.md) |

#### 🏷️ Swift

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus SwiftUI Lanjutan](mobile/swift/syllabi/advanced-swiftui-syllabus.md) | Syllabus | Advanced | [EN](mobile/swift/syllabi/advanced-swiftui-syllabus.md) \| [ID](mobile/swift/syllabi/advanced-swiftui-syllabus_id.md) |
| [Membangun Aplikasi Sadar Lokasi dengan SwiftUI dan MapKit](mobile/swift/tutorials/building-location-aware-app-swiftui-mapkit.md) | Tutorial | Intermediate | [EN](mobile/swift/tutorials/building-location-aware-app-swiftui-mapkit.md) \| [ID](mobile/swift/tutorials/building-location-aware-app-swiftui-mapkit_id.md) |
| [Pengembangan Aplikasi iOS dengan Swift](mobile/swift/tutorials/ios-app-development-with-swift.md) | Tutorial | Intermediate | [EN](mobile/swift/tutorials/ios-app-development-with-swift.md) \| [ID](mobile/swift/tutorials/ios-app-development-with-swift_id.md) |
| [Silabus Pengembangan iOS](mobile/swift/syllabi/ios-development-syllabus.md) | Syllabus | Intermediate | [EN](mobile/swift/syllabi/ios-development-syllabus.md) \| [ID](mobile/swift/syllabi/ios-development-syllabus_id.md) |
| [Membangun Lapisan Jaringan Modern di Swift dengan Async/Await](mobile/swift/tutorials/networking-layer-swift-async-await.md) | Tutorial | Advanced | [EN](mobile/swift/tutorials/networking-layer-swift-async-await.md) \| [ID](mobile/swift/tutorials/networking-layer-swift-async-await_id.md) |
| [Cheat Sheet Swift](mobile/swift/cheatsheets/swift-cheatsheet.md) | Cheatsheet | Beginner | [EN](mobile/swift/cheatsheets/swift-cheatsheet.md) \| [ID](mobile/swift/cheatsheets/swift-cheatsheet_id.md) |
| [Panduan Concurrency Swift: async/await, Actors, dan Structured Concurrency](mobile/swift/guides/swift-concurrency-async-await-actors-guide.md) | Guide | Advanced | [EN](mobile/swift/guides/swift-concurrency-async-await-actors-guide.md) \| [ID](mobile/swift/guides/swift-concurrency-async-await-actors-guide_id.md) |
| [Panduan Praktik Terbaik Swift iOS](mobile/swift/guides/swift-ios-best-practices-guide.md) | Guide | Advanced | [EN](mobile/swift/guides/swift-ios-best-practices-guide.md) \| [ID](mobile/swift/guides/swift-ios-best-practices-guide_id.md) |
| [Panduan Keamanan dan Perlindungan Data iOS dengan Swift](mobile/swift/guides/swift-ios-security-data-protection-guide.md) | Guide | Advanced | [EN](mobile/swift/guides/swift-ios-security-data-protection-guide.md) \| [ID](mobile/swift/guides/swift-ios-security-data-protection-guide_id.md) |
| [Cheat Sheet Manajemen Memori dan ARC Swift](mobile/swift/cheatsheets/swift-memory-management-arc-cheatsheet.md) | Cheatsheet | Advanced | [EN](mobile/swift/cheatsheets/swift-memory-management-arc-cheatsheet.md) \| [ID](mobile/swift/cheatsheets/swift-memory-management-arc-cheatsheet_id.md) |
| [Cheat Sheet Komponen dan Pola SwiftUI](mobile/swift/cheatsheets/swiftui-components-cheatsheet.md) | Cheatsheet | Intermediate | [EN](mobile/swift/cheatsheets/swiftui-components-cheatsheet.md) \| [ID](mobile/swift/cheatsheets/swiftui-components-cheatsheet_id.md) |

#### 🏷️ Kotlin

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Kotlin Tingkat Lanjut](mobile/kotlin/syllabi/advanced-kotlin-syllabus.md) | Syllabus | Advanced | [EN](mobile/kotlin/syllabi/advanced-kotlin-syllabus.md) \| [ID](mobile/kotlin/syllabi/advanced-kotlin-syllabus_id.md) |
| [Pengembangan Aplikasi Android dengan Kotlin](mobile/kotlin/tutorials/android-app-development-with-kotlin.md) | Tutorial | Intermediate | [EN](mobile/kotlin/tutorials/android-app-development-with-kotlin.md) \| [ID](mobile/kotlin/tutorials/android-app-development-with-kotlin_id.md) |
| [Silabus Pengembangan Android](mobile/kotlin/syllabi/android-development-syllabus.md) | Syllabus | Intermediate | [EN](mobile/kotlin/syllabi/android-development-syllabus.md) \| [ID](mobile/kotlin/syllabi/android-development-syllabus_id.md) |
| [Membangun Aplikasi Pencatat Pengeluaran dengan Kotlin, Room, dan Jetpack Compose](mobile/kotlin/tutorials/building-expense-tracker-app-kotlin-room-compose.md) | Tutorial | Intermediate | [EN](mobile/kotlin/tutorials/building-expense-tracker-app-kotlin-room-compose.md) \| [ID](mobile/kotlin/tutorials/building-expense-tracker-app-kotlin-room-compose_id.md) |
| [Membangun Aplikasi Chat Real-Time dengan Kotlin dan WebSocket](mobile/kotlin/tutorials/building-real-time-chat-app-kotlin-websockets.md) | Tutorial | Intermediate | [EN](mobile/kotlin/tutorials/building-real-time-chat-app-kotlin-websockets.md) \| [ID](mobile/kotlin/tutorials/building-real-time-chat-app-kotlin-websockets_id.md) |
| [Panduan Praktik Terbaik Android Kotlin](mobile/kotlin/guides/kotlin-android-best-practices-guide.md) | Guide | Advanced | [EN](mobile/kotlin/guides/kotlin-android-best-practices-guide.md) \| [ID](mobile/kotlin/guides/kotlin-android-best-practices-guide_id.md) |
| [Cheat Sheet Kotlin](mobile/kotlin/cheatsheets/kotlin-cheatsheet.md) | Cheatsheet | Beginner | [EN](mobile/kotlin/cheatsheets/kotlin-cheatsheet.md) \| [ID](mobile/kotlin/cheatsheets/kotlin-cheatsheet_id.md) |
| [Panduan Pola Lanjutan Coroutine dan Flow Kotlin](mobile/kotlin/guides/kotlin-coroutines-flow-advanced-patterns-guide.md) | Guide | Advanced | [EN](mobile/kotlin/guides/kotlin-coroutines-flow-advanced-patterns-guide.md) \| [ID](mobile/kotlin/guides/kotlin-coroutines-flow-advanced-patterns-guide_id.md) |
| [Cheat Sheet Kotlin Jetpack Compose](mobile/kotlin/cheatsheets/kotlin-jetpack-compose-cheatsheet.md) | Cheatsheet | Intermediate | [EN](mobile/kotlin/cheatsheets/kotlin-jetpack-compose-cheatsheet.md) \| [ID](mobile/kotlin/cheatsheets/kotlin-jetpack-compose-cheatsheet_id.md) |
| [Cheat Sheet Ktor Kotlin](mobile/kotlin/cheatsheets/kotlin-ktor-cheatsheet.md) | Cheatsheet | Advanced | [EN](mobile/kotlin/cheatsheets/kotlin-ktor-cheatsheet.md) \| [ID](mobile/kotlin/cheatsheets/kotlin-ktor-cheatsheet_id.md) |
| [Panduan Kotlin Multiplatform dan Compose Multiplatform](mobile/kotlin/guides/kotlin-multiplatform-compose-multiplatform-guide.md) | Guide | Advanced | [EN](mobile/kotlin/guides/kotlin-multiplatform-compose-multiplatform-guide.md) \| [ID](mobile/kotlin/guides/kotlin-multiplatform-compose-multiplatform-guide_id.md) |
| [Membangun Aplikasi Discovery Film dengan Kotlin, Retrofit, dan Jetpack Compose](mobile/kotlin/tutorials/movie-discovery-app-kotlin-retrofit-compose.md) | Tutorial | Intermediate | [EN](mobile/kotlin/tutorials/movie-discovery-app-kotlin-retrofit-compose.md) \| [ID](mobile/kotlin/tutorials/movie-discovery-app-kotlin-retrofit-compose_id.md) |

### 📁 Devops

#### 🏷️ Docker

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Rekayasa Platform Docker Tingkat Lanjut](devops/docker/syllabi/advanced-docker-syllabus.md) | Syllabus | Advanced | [EN](devops/docker/syllabi/advanced-docker-syllabus.md) \| [ID](devops/docker/syllabi/advanced-docker-syllabus_id.md) |
| [Cheat Sheet Pipeline CI/CD Docker](devops/docker/cheatsheets/docker-ci-cd-pipelines-cheatsheet.md) | Cheatsheet | Intermediate | [EN](devops/docker/cheatsheets/docker-ci-cd-pipelines-cheatsheet.md) \| [ID](devops/docker/cheatsheets/docker-ci-cd-pipelines-cheatsheet_id.md) |
| [Cheat Sheet Perintah Docker](devops/docker/cheatsheets/docker-command-cheatsheet.md) | Cheatsheet | Beginner | [EN](devops/docker/cheatsheets/docker-command-cheatsheet.md) \| [ID](devops/docker/cheatsheets/docker-command-cheatsheet_id.md) |
| [Panduan Jaringan Docker Compose dan Orkestrasi Multi-Layanan](devops/docker/guides/docker-compose-networking-guide.md) | Guide | Intermediate | [EN](devops/docker/guides/docker-compose-networking-guide.md) \| [ID](devops/docker/guides/docker-compose-networking-guide_id.md) |
| [Silabus Penguasaan Kontainerisasi Docker](devops/docker/syllabi/docker-containerization-syllabus.md) | Syllabus | Intermediate | [EN](devops/docker/syllabi/docker-containerization-syllabus.md) \| [ID](devops/docker/syllabi/docker-containerization-syllabus_id.md) |
| [Panduan Optimasi Gambar Docker dan Praktik Terbaik](devops/docker/guides/docker-image-optimization-guide.md) | Guide | Intermediate | [EN](devops/docker/guides/docker-image-optimization-guide.md) \| [ID](devops/docker/guides/docker-image-optimization-guide_id.md) |
| [Tutorial Logging dan Monitoring Docker](devops/docker/tutorials/docker-logging-and-monitoring-tutorial.md) | Tutorial | Intermediate | [EN](devops/docker/tutorials/docker-logging-and-monitoring-tutorial.md) \| [ID](devops/docker/tutorials/docker-logging-and-monitoring-tutorial_id.md) |
| [Build Multi-Arsitektur Docker dengan Buildx](devops/docker/tutorials/docker-multi-architecture-builds.md) | Tutorial | Intermediate | [EN](devops/docker/tutorials/docker-multi-architecture-builds.md) \| [ID](devops/docker/tutorials/docker-multi-architecture-builds_id.md) |
| [Manajemen Rahasia Docker dan Praktik Keamanan Terbaik](devops/docker/tutorials/docker-secrets-management-and-security.md) | Tutorial | Intermediate | [EN](devops/docker/tutorials/docker-secrets-management-and-security.md) \| [ID](devops/docker/tutorials/docker-secrets-management-and-security_id.md) |
| [Membuat Aplikasi Full-Stack dengan Docker](devops/docker/tutorials/dockerizing-a-full-stack-application.md) | Tutorial | Intermediate | [EN](devops/docker/tutorials/dockerizing-a-full-stack-application.md) \| [ID](devops/docker/tutorials/dockerizing-a-full-stack-application_id.md) |

#### 🏷️ Pm2

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Lanjutan Internals PM2 dan Keandalan Produksi](devops/pm2/syllabi/advanced-pm2-syllabus.md) | Syllabus | Advanced | [EN](devops/pm2/syllabi/advanced-pm2-syllabus.md) \| [ID](devops/pm2/syllabi/advanced-pm2-syllabus_id.md) |
| [Mengelola Aplikasi Node.js dengan PM2](devops/pm2/tutorials/managing-node-js-applications-with-pm2.md) | Tutorial | Intermediate | [EN](devops/pm2/tutorials/managing-node-js-applications-with-pm2.md) \| [ID](devops/pm2/tutorials/managing-node-js-applications-with-pm2_id.md) |
| [Cheat Sheet PM2](devops/pm2/cheatsheets/pm2-cheatsheet.md) | Cheatsheet | Intermediate | [EN](devops/pm2/cheatsheets/pm2-cheatsheet.md) \| [ID](devops/pm2/cheatsheets/pm2-cheatsheet_id.md) |
| [Panduan Alur Kerja Pengembangan dan Development Lokal dengan PM2](devops/pm2/guides/pm2-development-workflows-guide.md) | Guide | Intermediate | [EN](devops/pm2/guides/pm2-development-workflows-guide.md) \| [ID](devops/pm2/guides/pm2-development-workflows-guide_id.md) |
| [Cheat Sheet PM2 dalam Kontainer Docker](devops/pm2/cheatsheets/pm2-docker-container-cheatsheet.md) | Cheatsheet | Advanced | [EN](devops/pm2/cheatsheets/pm2-docker-container-cheatsheet.md) \| [ID](devops/pm2/cheatsheets/pm2-docker-container-cheatsheet_id.md) |
| [Membangun Arsitektur Microservices dengan PM2](devops/pm2/tutorials/pm2-microservices-architecture.md) | Tutorial | Advanced | [EN](devops/pm2/tutorials/pm2-microservices-architecture.md) \| [ID](devops/pm2/tutorials/pm2-microservices-architecture_id.md) |
| [Monitoring dan Observabilitas Aplikasi dengan PM2](devops/pm2/tutorials/pm2-monitoring-and-observability.md) | Tutorial | Intermediate | [EN](devops/pm2/tutorials/pm2-monitoring-and-observability.md) \| [ID](devops/pm2/tutorials/pm2-monitoring-and-observability_id.md) |
| [Silabus Manajemen Proses PM2](devops/pm2/syllabi/pm2-process-management-syllabus.md) | Syllabus | Intermediate | [EN](devops/pm2/syllabi/pm2-process-management-syllabus.md) \| [ID](devops/pm2/syllabi/pm2-process-management-syllabus_id.md) |
| [Panduan Deployment Produksi dan Monitoring dengan PM2](devops/pm2/guides/pm2-production-deployment-guide.md) | Guide | Intermediate | [EN](devops/pm2/guides/pm2-production-deployment-guide.md) \| [ID](devops/pm2/guides/pm2-production-deployment-guide_id.md) |

#### 🏷️ Kubernetes

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Lanjutan Platform Engineering dan Internals Cluster Kubernetes](devops/kubernetes/syllabi/advanced-kubernetes-syllabus.md) | Syllabus | Advanced | [EN](devops/kubernetes/syllabi/advanced-kubernetes-syllabus.md) \| [ID](devops/kubernetes/syllabi/advanced-kubernetes-syllabus_id.md) |
| [Memulai dengan Kubernetes](devops/kubernetes/tutorials/getting-started-with-kubernetes.md) | Tutorial | Intermediate | [EN](devops/kubernetes/tutorials/getting-started-with-kubernetes.md) \| [ID](devops/kubernetes/tutorials/getting-started-with-kubernetes_id.md) |
| [Cheat Sheet Kubernetes](devops/kubernetes/cheatsheets/kubernetes-cheatsheet.md) | Cheatsheet | Beginner | [EN](devops/kubernetes/cheatsheets/kubernetes-cheatsheet.md) \| [ID](devops/kubernetes/cheatsheets/kubernetes-cheatsheet_id.md) |
| [Silabus DevOps Kubernetes](devops/kubernetes/syllabi/kubernetes-devops-syllabus.md) | Syllabus | Intermediate | [EN](devops/kubernetes/syllabi/kubernetes-devops-syllabus.md) \| [ID](devops/kubernetes/syllabi/kubernetes-devops-syllabus_id.md) |
| [GitOps dengan ArgoCD di Kubernetes](devops/kubernetes/tutorials/kubernetes-gitops-argocd.md) | Tutorial | Advanced | [EN](devops/kubernetes/tutorials/kubernetes-gitops-argocd.md) \| [ID](devops/kubernetes/tutorials/kubernetes-gitops-argocd_id.md) |
| [Panduan Praktik Terbaik Produksi Kubernetes](devops/kubernetes/guides/kubernetes-production-best-practices.md) | Guide | Advanced | [EN](devops/kubernetes/guides/kubernetes-production-best-practices.md) \| [ID](devops/kubernetes/guides/kubernetes-production-best-practices_id.md) |
| [Cheat Sheet Keamanan Kubernetes](devops/kubernetes/cheatsheets/kubernetes-security-cheatsheet.md) | Cheatsheet | Advanced | [EN](devops/kubernetes/cheatsheets/kubernetes-security-cheatsheet.md) \| [ID](devops/kubernetes/cheatsheets/kubernetes-security-cheatsheet_id.md) |
| [Aplikasi Stateful di Kubernetes: Menjalankan Database dengan StatefulSets](devops/kubernetes/tutorials/kubernetes-stateful-applications-statefulsets.md) | Tutorial | Advanced | [EN](devops/kubernetes/tutorials/kubernetes-stateful-applications-statefulsets.md) \| [ID](devops/kubernetes/tutorials/kubernetes-stateful-applications-statefulsets_id.md) |
| [Panduan Troubleshooting Kubernetes](devops/kubernetes/guides/kubernetes-troubleshooting-guide.md) | Guide | Advanced | [EN](devops/kubernetes/guides/kubernetes-troubleshooting-guide.md) \| [ID](devops/kubernetes/guides/kubernetes-troubleshooting-guide_id.md) |

#### 🏷️ Github Actions

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Lanjutan Otomasi Enterprise GitHub Actions](devops/github-actions/syllabi/advanced-github-actions-syllabus.md) | Syllabus | Advanced | [EN](devops/github-actions/syllabi/advanced-github-actions-syllabus.md) \| [ID](devops/github-actions/syllabi/advanced-github-actions-syllabus_id.md) |
| [Membangun GitHub Actions Kustom](devops/github-actions/tutorials/building-custom-github-actions.md) | Tutorial | Intermediate | [EN](devops/github-actions/tutorials/building-custom-github-actions.md) \| [ID](devops/github-actions/tutorials/building-custom-github-actions_id.md) |
| [Memulai dengan GitHub Actions](devops/github-actions/tutorials/getting-started-with-github-actions.md) | Tutorial | Beginner | [EN](devops/github-actions/tutorials/getting-started-with-github-actions.md) \| [ID](devops/github-actions/tutorials/getting-started-with-github-actions_id.md) |
| [GitHub Actions Cheat Sheet](devops/github-actions/cheatsheets/github-actions-cheatsheet.md) | Cheatsheet | Beginner | [EN](devops/github-actions/cheatsheets/github-actions-cheatsheet.md) \| [ID](devops/github-actions/cheatsheets/github-actions-cheatsheet_id.md) |
| [Panduan Praktik Terbaik CI/CD GitHub Actions](devops/github-actions/guides/github-actions-cicd-best-practices-guide.md) | Guide | Intermediate | [EN](devops/github-actions/guides/github-actions-cicd-best-practices-guide.md) \| [ID](devops/github-actions/guides/github-actions-cicd-best-practices-guide_id.md) |
| [Membangun Pipeline Deployment dengan GitHub Actions](devops/github-actions/tutorials/github-actions-deployment-pipelines.md) | Tutorial | Intermediate | [EN](devops/github-actions/tutorials/github-actions-deployment-pipelines.md) \| [ID](devops/github-actions/tutorials/github-actions-deployment-pipelines_id.md) |
| [Silabus DevOps GitHub Actions](devops/github-actions/syllabi/github-actions-devops-syllabus.md) | Syllabus | Intermediate | [EN](devops/github-actions/syllabi/github-actions-devops-syllabus.md) \| [ID](devops/github-actions/syllabi/github-actions-devops-syllabus_id.md) |
| [Cheat Sheet Keamanan dan Manajemen Secret GitHub Actions](devops/github-actions/cheatsheets/github-actions-security-secrets-cheatsheet.md) | Cheatsheet | Intermediate | [EN](devops/github-actions/cheatsheets/github-actions-security-secrets-cheatsheet.md) \| [ID](devops/github-actions/cheatsheets/github-actions-security-secrets-cheatsheet_id.md) |
| [Panduan Pengujian dan Debugging Workflow GitHub Actions](devops/github-actions/guides/github-actions-workflow-testing-debugging-guide.md) | Guide | Intermediate | [EN](devops/github-actions/guides/github-actions-workflow-testing-debugging-guide.md) \| [ID](devops/github-actions/guides/github-actions-workflow-testing-debugging-guide_id.md) |

### 📁 Database

#### 🏷️ Redis

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Redis Tingkat Lanjut](database/redis/syllabi/advanced-redis-syllabus.md) | Syllabus | Advanced | [EN](database/redis/syllabi/advanced-redis-syllabus.md) \| [ID](database/redis/syllabi/advanced-redis-syllabus_id.md) |
| [Membangun Antrean Tugas dengan Redis](database/redis/tutorials/building-task-queue-with-redis.md) | Tutorial | Intermediate | [EN](database/redis/tutorials/building-task-queue-with-redis.md) \| [ID](database/redis/tutorials/building-task-queue-with-redis_id.md) |
| [Memulai dengan Redis](database/redis/tutorials/getting-started-with-redis.md) | Tutorial | Beginner | [EN](database/redis/tutorials/getting-started-with-redis.md) \| [ID](database/redis/tutorials/getting-started-with-redis_id.md) |
| [Panduan Pola dan Strategi Caching Redis](database/redis/guides/redis-caching-patterns-guide.md) | Guide | Intermediate | [EN](database/redis/guides/redis-caching-patterns-guide.md) \| [ID](database/redis/guides/redis-caching-patterns-guide_id.md) |
| [Cheat Sheet Redis](database/redis/cheatsheets/redis-cheatsheet.md) | Cheatsheet | Beginner | [EN](database/redis/cheatsheets/redis-cheatsheet.md) \| [ID](database/redis/cheatsheets/redis-cheatsheet_id.md) |
| [Silabus Pengembangan Redis](database/redis/syllabi/redis-development-syllabus.md) | Syllabus | Intermediate | [EN](database/redis/syllabi/redis-development-syllabus.md) \| [ID](database/redis/syllabi/redis-development-syllabus_id.md) |
| [Panduan Ketersediaan Tinggi Redis](database/redis/guides/redis-high-availability-guide.md) | Guide | Advanced | [EN](database/redis/guides/redis-high-availability-guide.md) \| [ID](database/redis/guides/redis-high-availability-guide_id.md) |
| [Cheat Sheet Skrip Lua dan Pemrograman Server-Side Redis](database/redis/cheatsheets/redis-lua-scripting-cheatsheet.md) | Cheatsheet | Intermediate | [EN](database/redis/cheatsheets/redis-lua-scripting-cheatsheet.md) \| [ID](database/redis/cheatsheets/redis-lua-scripting-cheatsheet_id.md) |
| [Panduan Persistensi dan Ketahanan Data Redis](database/redis/guides/redis-persistence-and-data-durability-guide.md) | Guide | Intermediate | [EN](database/redis/guides/redis-persistence-and-data-durability-guide.md) \| [ID](database/redis/guides/redis-persistence-and-data-durability-guide_id.md) |
| [Redis Security Cheatsheet](database/redis/cheatsheets/redis-security-cheatsheet.md) | Cheatsheet | Advanced | [EN](database/redis/cheatsheets/redis-security-cheatsheet.md) \| [ID](database/redis/cheatsheets/redis-security-cheatsheet_id.md) |
| [Membangun Sistem Berbasis Event dengan Redis Streams](database/redis/tutorials/redis-streams-event-driven-architecture.md) | Tutorial | Intermediate | [EN](database/redis/tutorials/redis-streams-event-driven-architecture.md) \| [ID](database/redis/tutorials/redis-streams-event-driven-architecture_id.md) |

#### 🏷️ Mongodb

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus MongoDB Tingkat Lanjut](database/mongodb/syllabi/advanced-mongodb-syllabus.md) | Syllabus | Advanced | [EN](database/mongodb/syllabi/advanced-mongodb-syllabus.md) \| [ID](database/mongodb/syllabi/advanced-mongodb-syllabus_id.md) |
| [Pipeline Agregasi MongoDB: Tutorial Praktis](database/mongodb/tutorials/mongodb-aggregation-pipeline.md) | Tutorial | Intermediate | [EN](database/mongodb/tutorials/mongodb-aggregation-pipeline.md) \| [ID](database/mongodb/tutorials/mongodb-aggregation-pipeline_id.md) |
| [Cheat Sheet Pipeline Agregasi MongoDB](database/mongodb/cheatsheets/mongodb-aggregation-pipeline-cheatsheet.md) | Cheatsheet | Intermediate | [EN](database/mongodb/cheatsheets/mongodb-aggregation-pipeline-cheatsheet.md) \| [ID](database/mongodb/cheatsheets/mongodb-aggregation-pipeline-cheatsheet_id.md) |
| [Membangun Pipeline Data Real-Time dengan MongoDB Change Streams](database/mongodb/tutorials/mongodb-change-streams-real-time-pipelines.md) | Tutorial | Advanced | [EN](database/mongodb/tutorials/mongodb-change-streams-real-time-pipelines.md) \| [ID](database/mongodb/tutorials/mongodb-change-streams-real-time-pipelines_id.md) |
| [Silabus Pengembangan MongoDB](database/mongodb/syllabi/mongodb-development-syllabus.md) | Syllabus | Intermediate | [EN](database/mongodb/syllabi/mongodb-development-syllabus.md) \| [ID](database/mongodb/syllabi/mongodb-development-syllabus_id.md) |
| [Strategi Indexing MongoDB dan Optimasi Performa Query](database/mongodb/tutorials/mongodb-indexing-strategies.md) | Tutorial | Intermediate | [EN](database/mongodb/tutorials/mongodb-indexing-strategies.md) \| [ID](database/mongodb/tutorials/mongodb-indexing-strategies_id.md) |
| [Panduan Optimasi Kinerja dan Monitoring MongoDB](database/mongodb/guides/mongodb-performance-optimization-guide.md) | Guide | Advanced | [EN](database/mongodb/guides/mongodb-performance-optimization-guide.md) \| [ID](database/mongodb/guides/mongodb-performance-optimization-guide_id.md) |
| [Cheat Sheet Query MongoDB](database/mongodb/cheatsheets/mongodb-query-cheatsheet.md) | Cheatsheet | Beginner | [EN](database/mongodb/cheatsheets/mongodb-query-cheatsheet.md) \| [ID](database/mongodb/cheatsheets/mongodb-query-cheatsheet_id.md) |
| [Panduan Replica Set dan Sharding MongoDB](database/mongodb/guides/mongodb-replica-sets-and-sharding-guide.md) | Guide | Advanced | [EN](database/mongodb/guides/mongodb-replica-sets-and-sharding-guide.md) \| [ID](database/mongodb/guides/mongodb-replica-sets-and-sharding-guide_id.md) |
| [Panduan Desain Skema dan Pemodelan Data MongoDB](database/mongodb/guides/mongodb-schema-design-and-data-modeling-guide.md) | Guide | Intermediate | [EN](database/mongodb/guides/mongodb-schema-design-and-data-modeling-guide.md) \| [ID](database/mongodb/guides/mongodb-schema-design-and-data-modeling-guide_id.md) |
| [Cheatsheet Keamanan MongoDB](database/mongodb/cheatsheets/mongodb-security-cheatsheet.md) | Cheatsheet | Advanced | [EN](database/mongodb/cheatsheets/mongodb-security-cheatsheet.md) \| [ID](database/mongodb/cheatsheets/mongodb-security-cheatsheet_id.md) |

#### 🏷️ Postgres

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus PostgreSQL Lanjutan](database/postgres/syllabi/advanced-postgresql-syllabus.md) | Syllabus | Advanced | [EN](database/postgres/syllabi/advanced-postgresql-syllabus.md) \| [ID](database/postgres/syllabi/advanced-postgresql-syllabus_id.md) |
| [Memulai dengan PostgreSQL](database/postgres/tutorials/getting-started-with-postgresql.md) | Tutorial | Beginner | [EN](database/postgres/tutorials/getting-started-with-postgresql.md) \| [ID](database/postgres/tutorials/getting-started-with-postgresql_id.md) |
| [Cheat Sheet Administrasi Database PostgreSQL](database/postgres/cheatsheets/postgresql-administration-cheatsheet.md) | Cheatsheet | Intermediate | [EN](database/postgres/cheatsheets/postgresql-administration-cheatsheet.md) \| [ID](database/postgres/cheatsheets/postgresql-administration-cheatsheet_id.md) |
| [Tutorial Pencarian Teks Lengkap PostgreSQL](database/postgres/tutorials/postgresql-full-text-search-tutorial.md) | Tutorial | Intermediate | [EN](database/postgres/tutorials/postgresql-full-text-search-tutorial.md) \| [ID](database/postgres/tutorials/postgresql-full-text-search-tutorial_id.md) |
| [Cheatsheet Indexing PostgreSQL](database/postgres/cheatsheets/postgresql-indexing-cheatsheet.md) | Cheatsheet | Intermediate | [EN](database/postgres/cheatsheets/postgresql-indexing-cheatsheet.md) \| [ID](database/postgres/cheatsheets/postgresql-indexing-cheatsheet_id.md) |
| [Manajemen Data JSON dan JSONB di PostgreSQL](database/postgres/tutorials/postgresql-json-jsonb-data-management.md) | Tutorial | Intermediate | [EN](database/postgres/tutorials/postgresql-json-jsonb-data-management.md) \| [ID](database/postgres/tutorials/postgresql-json-jsonb-data-management_id.md) |
| [Panduan Tuning Performa dan Optimasi PostgreSQL](database/postgres/guides/postgresql-performance-tuning-guide.md) | Guide | Advanced | [EN](database/postgres/guides/postgresql-performance-tuning-guide.md) \| [ID](database/postgres/guides/postgresql-performance-tuning-guide_id.md) |
| [Cheat Sheet Query PostgreSQL](database/postgres/cheatsheets/postgresql-query-cheatsheet.md) | Cheatsheet | Beginner | [EN](database/postgres/cheatsheets/postgresql-query-cheatsheet.md) \| [ID](database/postgres/cheatsheets/postgresql-query-cheatsheet_id.md) |
| [Panduan Replikasi dan Ketersediaan Tinggi PostgreSQL](database/postgres/guides/postgresql-replication-high-availability-guide.md) | Guide | Advanced | [EN](database/postgres/guides/postgresql-replication-high-availability-guide.md) \| [ID](database/postgres/guides/postgresql-replication-high-availability-guide_id.md) |
| [Panduan Penguatan Keamanan PostgreSQL](database/postgres/guides/postgresql-security-hardening-guide.md) | Guide | Advanced | [EN](database/postgres/guides/postgresql-security-hardening-guide.md) \| [ID](database/postgres/guides/postgresql-security-hardening-guide_id.md) |
| [Silabus PostgreSQL](database/postgres/syllabi/postgresql-syllabus.md) | Syllabus | Beginner | [EN](database/postgres/syllabi/postgresql-syllabus.md) \| [ID](database/postgres/syllabi/postgresql-syllabus_id.md) |
| [Partisi Tabel PostgreSQL dan Manajemen Siklus Hidup Data](database/postgres/tutorials/postgresql-table-partitioning-and-lifecycle-management.md) | Tutorial | Advanced | [EN](database/postgres/tutorials/postgresql-table-partitioning-and-lifecycle-management.md) \| [ID](database/postgres/tutorials/postgresql-table-partitioning-and-lifecycle-management_id.md) |
<!-- INDEX_END -->

---

## Memulai

Untuk menjelajahi atau menjalankan repositori ini secara lokal, silakan clone repositori:

```bash
git clone https://github.com/Reinvy/ReinvyLibrary.git
cd ReinvyLibrary
```

Instal dependensi proyek untuk menjalankan alat pemformatan dan validasi:

```bash
npm install
```

---

## Cara Berkontribusi

Kontribusi Anda sangat dihargai! Baik pengembang manusia maupun Agentic AI dapat dengan mudah mengirimkan konten baru. Silakan baca **[Panduan Kontribusi](CONTRIBUTING_ID.md)** terlebih dahulu sebelum memulai.

Langkah umum:
1. Fork repositori ini.
2. Buat branch baru Anda (`git checkout -b feature/nama-topik`).
3. Tambahkan konten baru di folder yang sesuai mengikuti templat kami.
4. Jalankan `npm run validate` dan `npm run lint` secara lokal.
5. Ajukan Pull Request.

---

## Otomatisasi & Validasi

Kami menggunakan workflow otomatis untuk memastikan semua konten mematuhi aturan repositori:
- **Linter**: Kami menggunakan `markdownlint` untuk menegakkan format penulisan standar markdown. Jalankan secara lokal:
  ```bash
  npm run lint
  ```
- **Validator**: Kami menjalankan skrip Node.js kustom untuk memverifikasi penamaan file, struktur folder, dan kesesuaian metadata YAML frontmatter. Jalankan secara lokal:
  ```bash
  npm run validate
  ```

---

## Lisensi

**ReinvyLibrary** dilisensikan di bawah Lisensi MIT. Anda bebas menggunakan, memodifikasi, dan mendistribusikan konten ini dengan menyertakan atribusi yang tepat kepada penulis asli.

---

## Kontak

Jika Anda memiliki pertanyaan, saran, atau umpan balik:
- **Email**: reinvy.dev@gmail.com
- **GitHub**: [Reinvy](https://github.com/Reinvy)

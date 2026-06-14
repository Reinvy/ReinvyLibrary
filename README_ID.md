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

#### 🏷️ Express Js

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Strategi Versioning API di Express JS](backend/express-js/tutorials/api-versioning-strategies.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/api-versioning-strategies.md) \| [ID](backend/express-js/tutorials/api-versioning-strategies_id.md) |
| [Memahami Routing dan Middleware Dasar di Express.js](backend/express-js/tutorials/basic-routing-and-middleware.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/basic-routing-and-middleware.md) \| [ID](backend/express-js/tutorials/basic-routing-and-middleware_id.md) |
| [Membangun GraphQL API dengan Express dan Apollo Server](backend/express-js/tutorials/building-graph-ql-apis.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/building-graph-ql-apis.md) \| [ID](backend/express-js/tutorials/building-graph-ql-apis_id.md) |
| [Validasi Data dan Penanganan Error Terpusat di Express.js](backend/express-js/tutorials/data-validation-and-error-handling.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/data-validation-and-error-handling.md) \| [ID](backend/express-js/tutorials/data-validation-and-error-handling_id.md) |
| [Men-deploy Aplikasi Express JS ke Production](backend/express-js/tutorials/deploying-express-js-applications-to-production.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/deploying-express-js-applications-to-production.md) \| [ID](backend/express-js/tutorials/deploying-express-js-applications-to-production_id.md) |
| [Environment Variables di Express JS](backend/express-js/tutorials/environment-variables.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/environment-variables.md) \| [ID](backend/express-js/tutorials/environment-variables_id.md) |
| [Praktik Terbaik Keamanan di Express.js](backend/express-js/tutorials/express-js-security-best-practices.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/express-js-security-best-practices.md) \| [ID](backend/express-js/tutorials/express-js-security-best-practices_id.md) |
| [Graceful Shutdown di Aplikasi Express JS](backend/express-js/tutorials/graceful-shutdown-in-express-js-applications.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/graceful-shutdown-in-express-js-applications.md) \| [ID](backend/express-js/tutorials/graceful-shutdown-in-express-js-applications_id.md) |
| [Handling File Downloads and Streaming in Express JS](backend/express-js/tutorials/handling-file-downloads-and-streaming.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/handling-file-downloads-and-streaming.md) \| [ID](backend/express-js/tutorials/handling-file-downloads-and-streaming_id.md) |
| [Menangani Upload File di Express JS dengan Multer](backend/express-js/tutorials/handling-file-uploads-in-express-js-with-multer.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/handling-file-uploads-in-express-js-with-multer.md) \| [ID](backend/express-js/tutorials/handling-file-uploads-in-express-js-with-multer_id.md) |
| [Implementing Role-Based Access Control in Express JS](backend/express-js/tutorials/implementing-role-based-access-control.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/implementing-role-based-access-control.md) \| [ID](backend/express-js/tutorials/implementing-role-based-access-control_id.md) |
| [Implementasi Server-Sent Events (SSE) di Express JS](backend/express-js/tutorials/implementing-server-sent-events.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/implementing-server-sent-events.md) \| [ID](backend/express-js/tutorials/implementing-server-sent-events_id.md) |
| [Implementasi Server-Sent Events (SSE) di Express JS](backend/express-js/tutorials/implementing-server-sent-events-sse.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/implementing-server-sent-events-sse.md) \| [ID](backend/express-js/tutorials/implementing-server-sent-events-sse_id.md) |
| [Implementasi Webhooks di Express JS](backend/express-js/tutorials/implementing-webhooks.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/implementing-webhooks.md) \| [ID](backend/express-js/tutorials/implementing-webhooks_id.md) |
| [Mengintegrasikan Swagger UI untuk Dokumentasi API di Express.js](backend/express-js/tutorials/integrating-swagger-ui-for-api-documentation.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/integrating-swagger-ui-for-api-documentation.md) \| [ID](backend/express-js/tutorials/integrating-swagger-ui-for-api-documentation_id.md) |
| [Logging dan Monitoring di Express JS](backend/express-js/tutorials/logging-and-monitoring.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/logging-and-monitoring.md) \| [ID](backend/express-js/tutorials/logging-and-monitoring_id.md) |
| [Judul](backend/express-js/tutorials/pagination-filtering-and-sorting-in-express-apis.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/pagination-filtering-and-sorting-in-express-apis.md) \| [ID](backend/express-js/tutorials/pagination-filtering-and-sorting-in-express-apis_id.md) |
| [Password Hashing and Salting di Express JS dengan Bcrypt](backend/express-js/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt.md) \| [ID](backend/express-js/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt_id.md) |
| [Performance Optimization in Express JS](backend/express-js/tutorials/performance-optimization.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/performance-optimization.md) \| [ID](backend/express-js/tutorials/performance-optimization_id.md) |
| [Teknik Optimasi Performa di Express JS](backend/express-js/tutorials/performance-optimization-techniques.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/performance-optimization-techniques.md) \| [ID](backend/express-js/tutorials/performance-optimization-techniques_id.md) |
| [Rate Limiting dan API Throttling di Express JS](backend/express-js/tutorials/rate-limiting-and-api-throttling_id.md) | Tutorial | Intermediate | [ID](backend/express-js/tutorials/rate-limiting-and-api-throttling_id.md) |
| [Menyajikan File Statis (Static Files) di Express.js](backend/express-js/tutorials/serving-static-files.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/serving-static-files.md) \| [ID](backend/express-js/tutorials/serving-static-files_id.md) |
| [Streaming and Downloading Files in Express JS](backend/express-js/tutorials/streaming-and-downloading-files.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/streaming-and-downloading-files.md) \| [ID](backend/express-js/tutorials/streaming-and-downloading-files_id.md) |
| [Menata Struktur Aplikasi Express.js yang Skalabel: MVC dan Service Layer](backend/express-js/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer.md) \| [ID](backend/express-js/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer_id.md) |
| [Memahami Cookies dan Manajemen Session di Express.js](backend/express-js/tutorials/understanding-cookies-and-session-management.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/understanding-cookies-and-session-management.md) \| [ID](backend/express-js/tutorials/understanding-cookies-and-session-management_id.md) |
| [Memahami CORS di Express JS](backend/express-js/tutorials/understanding-cors.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/understanding-cors.md) \| [ID](backend/express-js/tutorials/understanding-cors_id.md) |
| [Memahami Prinsip Desain RESTful API di Express](backend/express-js/tutorials/understanding-restful-api-design-principles.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/understanding-restful-api-design-principles.md) \| [ID](backend/express-js/tutorials/understanding-restful-api-design-principles_id.md) |
| [Memahami Siklus Hidup Request pada Express.js](backend/express-js/tutorials/understanding-the-express-js-request-lifecycle.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/understanding-the-express-js-request-lifecycle.md) \| [ID](backend/express-js/tutorials/understanding-the-express-js-request-lifecycle_id.md) |
| [Bekerja dengan Cookie dan Session di Express JS](backend/express-js/tutorials/working-with-cookies-and-sessions.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/working-with-cookies-and-sessions.md) \| [ID](backend/express-js/tutorials/working-with-cookies-and-sessions_id.md) |

#### 🏷️ Typescript

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Membangun Aplikasi Express yang Type-Safe dengan TypeScript](backend/typescript/tutorials/building-type-safe-express-apps-with-type-script.md) | Tutorial | Advanced | [EN](backend/typescript/tutorials/building-type-safe-express-apps-with-type-script.md) \| [ID](backend/typescript/tutorials/building-type-safe-express-apps-with-type-script_id.md) |
| [Mengintegrasikan TypeScript dengan Express JS](backend/typescript/tutorials/integrating-type-script.md) | Tutorial | Intermediate | [EN](backend/typescript/tutorials/integrating-type-script.md) \| [ID](backend/typescript/tutorials/integrating-type-script_id.md) |

#### 🏷️ Zod

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Validasi Data dengan Zod di Express JS](backend/zod/tutorials/data-validation-with-zod.md) | Tutorial | Advanced | [EN](backend/zod/tutorials/data-validation-with-zod.md) \| [ID](backend/zod/tutorials/data-validation-with-zod_id.md) |
| [Validasi Skema di Express JS dengan Zod](backend/zod/tutorials/schema-validation-in-express-js-with-zod.md) | Tutorial | Advanced | [EN](backend/zod/tutorials/schema-validation-in-express-js-with-zod.md) \| [ID](backend/zod/tutorials/schema-validation-in-express-js-with-zod_id.md) |

#### 🏷️ Passport Js

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Autentikasi dengan Passport JS di Express](backend/passport-js/tutorials/authentication-with-passport-js.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/authentication-with-passport-js.md) \| [ID](backend/passport-js/tutorials/authentication-with-passport-js_id.md) |
| [Implementasi OAuth 2.0 dan Social Login di Express JS](backend/passport-js/tutorials/implementing-oauth-2-0-and-social-login.md) | Tutorial | Advanced | [EN](backend/passport-js/tutorials/implementing-oauth-2-0-and-social-login.md) \| [ID](backend/passport-js/tutorials/implementing-oauth-2-0-and-social-login_id.md) |
| [Implementing OAuth 2.0 Authentication in Express JS](backend/passport-js/tutorials/implementing-oauth-2-0-authentication.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth-2-0-authentication.md) \| [ID](backend/passport-js/tutorials/implementing-oauth-2-0-authentication_id.md) |
| [Implementing OAuth 2.0 Authentication in Express JS with Passport](backend/passport-js/tutorials/implementing-oauth-2-0-authentication-in-express-js-with-passport.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth-2-0-authentication-in-express-js-with-passport.md) \| [ID](backend/passport-js/tutorials/implementing-oauth-2-0-authentication-in-express-js-with-passport_id.md) |
| [Implementing OAuth 2.0 Social Login in Express JS](backend/passport-js/tutorials/implementing-oauth-2-0-social-login.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth-2-0-social-login.md) \| [ID](backend/passport-js/tutorials/implementing-oauth-2-0-social-login_id.md) |
| [Menerapkan OAuth2 dan Social Login di Express.js](backend/passport-js/tutorials/implementing-oauth2-and-social-login.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-and-social-login.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-and-social-login_id.md) |
| [Implementing OAuth2 Authentication in Express JS](backend/passport-js/tutorials/implementing-oauth2-authentication.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-authentication.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-authentication_id.md) |
| [Implementing OAuth2 Authentication in Express JS with Passport](backend/passport-js/tutorials/implementing-oauth2-authentication-in-express-js-with-passport.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-authentication-in-express-js-with-passport.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-authentication-in-express-js-with-passport_id.md) |
| [Mengimplementasikan Autentikasi OAuth2 dengan Passport di Express JS](backend/passport-js/tutorials/implementing-oauth2-authentication-with-passport.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-authentication-with-passport.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-authentication-with-passport_id.md) |
| [Implementasi Login Google OAuth2 di Express JS](backend/passport-js/tutorials/implementing-oauth2-google-login.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-google-login.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-google-login_id.md) |
| [Mengimplementasikan OAuth2 Social Login di Express JS dengan Passport](backend/passport-js/tutorials/implementing-oauth2-social-login-in-express-js-with-passport.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-social-login-in-express-js-with-passport.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-social-login-in-express-js-with-passport_id.md) |

#### 🏷️ Bullmq

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Pemrosesan Tugas Asinkron di Express JS dengan BullMQ](backend/bullmq/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq_id.md) | Tutorial | Beginner | [ID](backend/bullmq/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq_id.md) |
| [Menangani Background Jobs dan Task Queues di Express JS](backend/bullmq/tutorials/handling-background-jobs-and-task-queues.md) | Tutorial | Advanced | [EN](backend/bullmq/tutorials/handling-background-jobs-and-task-queues.md) \| [ID](backend/bullmq/tutorials/handling-background-jobs-and-task-queues_id.md) |

#### 🏷️ Nodemailer

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Sending Emails in Express JS with Nodemailer](backend/nodemailer/tutorials/sending-emails-in-express-js-with-nodemailer.md) | Tutorial | Intermediate | [EN](backend/nodemailer/tutorials/sending-emails-in-express-js-with-nodemailer.md) \| [ID](backend/nodemailer/tutorials/sending-emails-in-express-js-with-nodemailer_id.md) |

#### 🏷️ Socket Io

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Real-Time Communication di Express dengan Socket.IO](backend/socket-io/tutorials/real-time-communication-in-express-with-socket-io.md) | Tutorial | Advanced | [EN](backend/socket-io/tutorials/real-time-communication-in-express-with-socket-io.md) \| [ID](backend/socket-io/tutorials/real-time-communication-in-express-with-socket-io_id.md) |

#### 🏷️ Jwt

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Autentikasi dan Otorisasi Menggunakan JWT di Express.js](backend/jwt/tutorials/authentication-and-authorization-with-jwt.md) | Tutorial | Intermediate | [EN](backend/jwt/tutorials/authentication-and-authorization-with-jwt.md) \| [ID](backend/jwt/tutorials/authentication-and-authorization-with-jwt_id.md) |
| [Mengimplementasikan Refresh Token dengan JWT di Express.js](backend/jwt/tutorials/implementing-refresh-tokens-with-jwt.md) | Tutorial | Advanced | [EN](backend/jwt/tutorials/implementing-refresh-tokens-with-jwt.md) \| [ID](backend/jwt/tutorials/implementing-refresh-tokens-with-jwt_id.md) |

#### 🏷️ Express Generator

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Langkah Membuat Project Express.js dengan Express Generator](backend/express-generator/tutorials/install_id.md) | Tutorial | Intermediate | [ID](backend/express-generator/tutorials/install_id.md) |

### 📁 Mobile

#### 🏷️ Flutter

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Flutter Syllabi](mobile/flutter/syllabi/flutter-syllabi_id.md) | Syllabus | Advanced | [ID](mobile/flutter/syllabi/flutter-syllabi_id.md) |

### 📁 Devops

#### 🏷️ Docker

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Judul](devops/docker/tutorials/dockerizing-express-js-applications.md) | Tutorial | Intermediate | [EN](devops/docker/tutorials/dockerizing-express-js-applications.md) \| [ID](devops/docker/tutorials/dockerizing-express-js-applications_id.md) |

#### 🏷️ Pm2

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Scaling Express JS Applications with PM2 and Clustering](devops/pm2/tutorials/scaling-express-js-applications-with-pm2-and-clustering.md) | Tutorial | Advanced | [EN](devops/pm2/tutorials/scaling-express-js-applications-with-pm2-and-clustering.md) \| [ID](devops/pm2/tutorials/scaling-express-js-applications-with-pm2-and-clustering_id.md) |

### 📁 Database

#### 🏷️ Redis

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Asynchronous Task Processing in Express JS with BullMQ](database/redis/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq.md) | Tutorial | Advanced | [EN](database/redis/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq.md) |
| [Caching di API Express JS menggunakan Redis](database/redis/tutorials/caching-in-express-js-apis-with-redis.md) | Tutorial | Advanced | [EN](database/redis/tutorials/caching-in-express-js-apis-with-redis.md) \| [ID](database/redis/tutorials/caching-in-express-js-apis-with-redis_id.md) |
| [Handling Background Jobs in Express JS with BullMQ and Redis](database/redis/tutorials/handling-background-jobs-in-express-js-with-bull-mq-and-redis.md) | Tutorial | Advanced | [EN](database/redis/tutorials/handling-background-jobs-in-express-js-with-bull-mq-and-redis.md) \| [ID](database/redis/tutorials/handling-background-jobs-in-express-js-with-bull-mq-and-redis_id.md) |
| [Rate Limiting and API Throttling in Express JS](database/redis/tutorials/rate-limiting-and-api-throttling.md) | Tutorial | Advanced | [EN](database/redis/tutorials/rate-limiting-and-api-throttling.md) |

#### 🏷️ Mongodb

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Integrasi Database dengan Express JS dan Mongoose](database/mongodb/tutorials/database-integration-with-express-js-and-mongoose.md) | Tutorial | Beginner | [EN](database/mongodb/tutorials/database-integration-with-express-js-and-mongoose.md) \| [ID](database/mongodb/tutorials/database-integration-with-express-js-and-mongoose_id.md) |
| [Database Integration with MongoDB and Mongoose in Express JS](database/mongodb/tutorials/database-integration-with-mongo-db-and-mongoose.md) | Tutorial | Beginner | [EN](database/mongodb/tutorials/database-integration-with-mongo-db-and-mongoose.md) \| [ID](database/mongodb/tutorials/database-integration-with-mongo-db-and-mongoose_id.md) |
| [Menerapkan Health Checks di Express JS](database/mongodb/tutorials/implementing-health-checks.md) | Tutorial | Intermediate | [EN](database/mongodb/tutorials/implementing-health-checks.md) \| [ID](database/mongodb/tutorials/implementing-health-checks_id.md) |
| [Mengimplementasikan Health Checks dan Readiness Probes di Express JS](database/mongodb/tutorials/implementing-health-checks-and-readiness-probes.md) | Tutorial | Advanced | [EN](database/mongodb/tutorials/implementing-health-checks-and-readiness-probes.md) \| [ID](database/mongodb/tutorials/implementing-health-checks-and-readiness-probes_id.md) |

#### 🏷️ Prisma

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Langkah Integrasi Prisma dengan Express.js](database/prisma/tutorials/express-with-prisma_id.md) | Tutorial | Intermediate | [ID](database/prisma/tutorials/express-with-prisma_id.md) |

### 📁 Testing

#### 🏷️ Jest

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Pengujian API Express dengan Jest dan Supertest](testing/jest/tutorials/testing-express-api-with-jest-and-supertest.md) | Tutorial | Advanced | [EN](testing/jest/tutorials/testing-express-api-with-jest-and-supertest.md) \| [ID](testing/jest/tutorials/testing-express-api-with-jest-and-supertest_id.md) |
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

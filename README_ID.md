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
| [Judul](backend/expressjs/tutorials/dockerizing-express-js-applications.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/dockerizing-express-js-applications.md) \| [ID](backend/expressjs/tutorials/dockerizing-express-js-applications_id.md) |
| [Environment Variables di Express JS](backend/expressjs/tutorials/environment-variables.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/environment-variables.md) \| [ID](backend/expressjs/tutorials/environment-variables_id.md) |
| [Praktik Terbaik Keamanan di Express.js](backend/expressjs/tutorials/express-js-security-best-practices.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/express-js-security-best-practices.md) \| [ID](backend/expressjs/tutorials/express-js-security-best-practices_id.md) |
| [Langkah Integrasi Prisma dengan Express.js](backend/expressjs/tutorials/express-with-prisma.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/express-with-prisma.md) \| [ID](backend/expressjs/tutorials/express-with-prisma_id.md) |
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
| [Judul](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis.md) \| [ID](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis_id.md) |
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
| [Membangun REST API dengan ElysiaJS](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs.md) | Tutorial | Intermediate | [EN](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs.md) \| [ID](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs_id.md) |

#### 🏷️ Golang

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Memulai Pemrograman Go](backend/golang/tutorials/getting-started-with-go.md) | Tutorial | Beginner | [EN](backend/golang/tutorials/getting-started-with-go.md) \| [ID](backend/golang/tutorials/getting-started-with-go_id.md) |

### 📁 Frontend

#### 🏷️ Nextjs

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Struktur Proyek Next.js dan Praktik Terbaik](frontend/nextjs/guides/nextjs-project-structure-and-best-practices.md) | Guide | Intermediate | [EN](frontend/nextjs/guides/nextjs-project-structure-and-best-practices.md) \| [ID](frontend/nextjs/guides/nextjs-project-structure-and-best-practices_id.md) |

#### 🏷️ React Native

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Pengembangan React Native](frontend/react-native/syllabi/react-native-development-syllabus.md) | Syllabus | Intermediate | [EN](frontend/react-native/syllabi/react-native-development-syllabus.md) \| [ID](frontend/react-native/syllabi/react-native-development-syllabus_id.md) |

### 📁 Mobile

#### 🏷️ Flutter

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Pemrograman Flutter](mobile/flutter/syllabi/flutter-syllabus.md) | Syllabus | Advanced | [EN](mobile/flutter/syllabi/flutter-syllabus.md) \| [ID](mobile/flutter/syllabi/flutter-syllabus_id.md) |
| [Cheat Sheet Widget Flutter](mobile/flutter/cheatsheets/flutter-widget-cheatsheet.md) | Cheatsheet | Beginner | [EN](mobile/flutter/cheatsheets/flutter-widget-cheatsheet.md) \| [ID](mobile/flutter/cheatsheets/flutter-widget-cheatsheet_id.md) |
| [Manajemen State dengan Provider di Flutter](mobile/flutter/tutorials/state-management-with-provider-in-flutter.md) | Tutorial | Intermediate | [EN](mobile/flutter/tutorials/state-management-with-provider-in-flutter.md) \| [ID](mobile/flutter/tutorials/state-management-with-provider-in-flutter_id.md) |

### 📁 Devops

#### 🏷️ Docker

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Silabus Penguasaan Kontainerisasi Docker](devops/docker/syllabi/docker-containerization-syllabus.md) | Syllabus | Intermediate | [EN](devops/docker/syllabi/docker-containerization-syllabus.md) \| [ID](devops/docker/syllabi/docker-containerization-syllabus_id.md) |
| [Membuat Aplikasi Full-Stack dengan Docker](devops/docker/tutorials/dockerizing-a-full-stack-application.md) | Tutorial | Intermediate | [EN](devops/docker/tutorials/dockerizing-a-full-stack-application.md) \| [ID](devops/docker/tutorials/dockerizing-a-full-stack-application_id.md) |

### 📁 Database

#### 🏷️ Mongodb

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Cheat Sheet Query MongoDB](database/mongodb/cheatsheets/mongodb-query-cheatsheet.md) | Cheatsheet | Beginner | [EN](database/mongodb/cheatsheets/mongodb-query-cheatsheet.md) \| [ID](database/mongodb/cheatsheets/mongodb-query-cheatsheet_id.md) |

#### 🏷️ Postgres

| Topik | Format | Kesulitan | Bahasa Tersedia |
| :--- | :--- | :--- | :--- |
| [Memulai dengan PostgreSQL](database/postgres/tutorials/getting-started-with-postgresql.md) | Tutorial | Beginner | [EN](database/postgres/tutorials/getting-started-with-postgresql.md) \| [ID](database/postgres/tutorials/getting-started-with-postgresql_id.md) |
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

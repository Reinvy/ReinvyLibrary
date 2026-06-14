# ReinvyLibrary

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Reinvy/ReinvyLibrary/actions/workflows/verify-content.yml/badge.svg)](https://github.com/Reinvy/ReinvyLibrary/actions)

Welcome to **ReinvyLibrary**! This repository is an open-source, highly structured, curated collection of educational markdown files created by Reinvy. It serves as a community-driven and machine-readable learning hub containing tutorials, syllabi, cheat sheets, and practical guides.

Whether you are a developer learning new skills, an educator planning a curriculum, or an **Agentic AI** looking to study or generate tech content, you'll find organized, structured, and consistent bilingual resources here.

---

## Language Options

- [English](README.md)
- [Bahasa Indonesia](README_ID.md)

---

## Table of Contents

- [Introduction](#introduction)
- [Repository Taxonomy](#repository-taxonomy)
- [Content Library Index](#content-library-index)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Automation & Verification](#automation--verification)
- [License](#license)
- [Contact](#contact)

---

## Introduction

**ReinvyLibrary** is organized from the ground up to ensure consistency and quality. All content is written in standard Markdown, starts with a unified YAML frontmatter schema, and is validated automatically via scripts and GitHub Actions. This makes the project highly scalable and friendly for automated toolchains and AI agents.

---

## Repository Taxonomy

The library is organized by **Subject/Discipline** first, followed by **Technology**, and then by **Content Type**:

```plaintext
<category>/
├── <technology>/
│   ├── tutorials/      # Step-by-step programming lessons
│   ├── syllabi/        # Course outlines and syllabi
│   ├── cheatsheets/    # Quick reference syntax guides
│   └── guides/         # Architectural and best practice guides
```

---

## Content Library Index

Below is the dynamically updated list of all materials available in the library:

<!-- INDEX_START -->
### 📁 Backend

#### 🏷️ Express Js

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [API Versioning Strategies in Express JS](backend/express-js/tutorials/api-versioning-strategies.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/api-versioning-strategies.md) \| [ID](backend/express-js/tutorials/api-versioning-strategies_id.md) |
| [Understanding Basic Routing and Middleware in Express.js](backend/express-js/tutorials/basic-routing-and-middleware.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/basic-routing-and-middleware.md) \| [ID](backend/express-js/tutorials/basic-routing-and-middleware_id.md) |
| [Building GraphQL APIs with Express and Apollo Server](backend/express-js/tutorials/building-graph-ql-apis.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/building-graph-ql-apis.md) \| [ID](backend/express-js/tutorials/building-graph-ql-apis_id.md) |
| [Centralized Data Validation and Error Handling in Express.js](backend/express-js/tutorials/data-validation-and-error-handling.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/data-validation-and-error-handling.md) \| [ID](backend/express-js/tutorials/data-validation-and-error-handling_id.md) |
| [Deploying Express JS Applications to Production](backend/express-js/tutorials/deploying-express-js-applications-to-production.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/deploying-express-js-applications-to-production.md) \| [ID](backend/express-js/tutorials/deploying-express-js-applications-to-production_id.md) |
| [Environment Variables in Express JS](backend/express-js/tutorials/environment-variables.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/environment-variables.md) \| [ID](backend/express-js/tutorials/environment-variables_id.md) |
| [Express.js Security Best Practices](backend/express-js/tutorials/express-js-security-best-practices.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/express-js-security-best-practices.md) \| [ID](backend/express-js/tutorials/express-js-security-best-practices_id.md) |
| [Graceful Shutdown in Express JS Applications](backend/express-js/tutorials/graceful-shutdown-in-express-js-applications.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/graceful-shutdown-in-express-js-applications.md) \| [ID](backend/express-js/tutorials/graceful-shutdown-in-express-js-applications_id.md) |
| [Handling File Downloads and Streaming in Express JS](backend/express-js/tutorials/handling-file-downloads-and-streaming.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/handling-file-downloads-and-streaming.md) \| [ID](backend/express-js/tutorials/handling-file-downloads-and-streaming_id.md) |
| [Handling File Uploads in Express JS with Multer](backend/express-js/tutorials/handling-file-uploads-in-express-js-with-multer.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/handling-file-uploads-in-express-js-with-multer.md) \| [ID](backend/express-js/tutorials/handling-file-uploads-in-express-js-with-multer_id.md) |
| [Implementing Role-Based Access Control in Express JS](backend/express-js/tutorials/implementing-role-based-access-control.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/implementing-role-based-access-control.md) \| [ID](backend/express-js/tutorials/implementing-role-based-access-control_id.md) |
| [Implementing Server-Sent Events (SSE) in Express JS](backend/express-js/tutorials/implementing-server-sent-events.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/implementing-server-sent-events.md) \| [ID](backend/express-js/tutorials/implementing-server-sent-events_id.md) |
| [Implementing Server-Sent Events (SSE) in Express JS](backend/express-js/tutorials/implementing-server-sent-events-sse.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/implementing-server-sent-events-sse.md) \| [ID](backend/express-js/tutorials/implementing-server-sent-events-sse_id.md) |
| [Implementing Webhooks in Express JS](backend/express-js/tutorials/implementing-webhooks.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/implementing-webhooks.md) \| [ID](backend/express-js/tutorials/implementing-webhooks_id.md) |
| [Integrating Swagger UI for API Documentation in Express.js](backend/express-js/tutorials/integrating-swagger-ui-for-api-documentation.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/integrating-swagger-ui-for-api-documentation.md) \| [ID](backend/express-js/tutorials/integrating-swagger-ui-for-api-documentation_id.md) |
| [Logging and Monitoring in Express JS](backend/express-js/tutorials/logging-and-monitoring.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/logging-and-monitoring.md) \| [ID](backend/express-js/tutorials/logging-and-monitoring_id.md) |
| [Judul](backend/express-js/tutorials/pagination-filtering-and-sorting-in-express-apis.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/pagination-filtering-and-sorting-in-express-apis.md) \| [ID](backend/express-js/tutorials/pagination-filtering-and-sorting-in-express-apis_id.md) |
| [Password Hashing and Salting in Express JS with Bcrypt](backend/express-js/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt.md) \| [ID](backend/express-js/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt_id.md) |
| [Performance Optimization in Express JS](backend/express-js/tutorials/performance-optimization.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/performance-optimization.md) \| [ID](backend/express-js/tutorials/performance-optimization_id.md) |
| [Performance Optimization Techniques in Express JS](backend/express-js/tutorials/performance-optimization-techniques.md) | Tutorial | Advanced | [EN](backend/express-js/tutorials/performance-optimization-techniques.md) \| [ID](backend/express-js/tutorials/performance-optimization-techniques_id.md) |
| [Rate Limiting dan API Throttling di Express JS](backend/express-js/tutorials/rate-limiting-and-api-throttling_id.md) | Tutorial | Intermediate | [ID](backend/express-js/tutorials/rate-limiting-and-api-throttling_id.md) |
| [Serving Static Files in Express.js](backend/express-js/tutorials/serving-static-files.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/serving-static-files.md) \| [ID](backend/express-js/tutorials/serving-static-files_id.md) |
| [Streaming and Downloading Files in Express JS](backend/express-js/tutorials/streaming-and-downloading-files.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/streaming-and-downloading-files.md) \| [ID](backend/express-js/tutorials/streaming-and-downloading-files_id.md) |
| [Structuring a Scalable Express.js Application: MVC and Service Layer](backend/express-js/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer.md) \| [ID](backend/express-js/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer_id.md) |
| [Understanding Cookies and Session Management in Express.js](backend/express-js/tutorials/understanding-cookies-and-session-management.md) | Tutorial | Intermediate | [EN](backend/express-js/tutorials/understanding-cookies-and-session-management.md) \| [ID](backend/express-js/tutorials/understanding-cookies-and-session-management_id.md) |
| [Understanding CORS in Express JS](backend/express-js/tutorials/understanding-cors.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/understanding-cors.md) \| [ID](backend/express-js/tutorials/understanding-cors_id.md) |
| [Understanding RESTful API Design Principles in Express](backend/express-js/tutorials/understanding-restful-api-design-principles.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/understanding-restful-api-design-principles.md) \| [ID](backend/express-js/tutorials/understanding-restful-api-design-principles_id.md) |
| [Understanding the Express JS Request Lifecycle](backend/express-js/tutorials/understanding-the-express-js-request-lifecycle.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/understanding-the-express-js-request-lifecycle.md) \| [ID](backend/express-js/tutorials/understanding-the-express-js-request-lifecycle_id.md) |
| [Working with Cookies and Sessions in Express JS](backend/express-js/tutorials/working-with-cookies-and-sessions.md) | Tutorial | Beginner | [EN](backend/express-js/tutorials/working-with-cookies-and-sessions.md) \| [ID](backend/express-js/tutorials/working-with-cookies-and-sessions_id.md) |

#### 🏷️ Typescript

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Building Type-Safe Express Apps with TypeScript](backend/typescript/tutorials/building-type-safe-express-apps-with-type-script.md) | Tutorial | Advanced | [EN](backend/typescript/tutorials/building-type-safe-express-apps-with-type-script.md) \| [ID](backend/typescript/tutorials/building-type-safe-express-apps-with-type-script_id.md) |
| [Integrating TypeScript with Express JS](backend/typescript/tutorials/integrating-type-script.md) | Tutorial | Intermediate | [EN](backend/typescript/tutorials/integrating-type-script.md) \| [ID](backend/typescript/tutorials/integrating-type-script_id.md) |

#### 🏷️ Zod

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Data Validation with Zod in Express JS](backend/zod/tutorials/data-validation-with-zod.md) | Tutorial | Advanced | [EN](backend/zod/tutorials/data-validation-with-zod.md) \| [ID](backend/zod/tutorials/data-validation-with-zod_id.md) |
| [Schema Validation in Express JS with Zod](backend/zod/tutorials/schema-validation-in-express-js-with-zod.md) | Tutorial | Advanced | [EN](backend/zod/tutorials/schema-validation-in-express-js-with-zod.md) \| [ID](backend/zod/tutorials/schema-validation-in-express-js-with-zod_id.md) |

#### 🏷️ Passport Js

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Authentication with Passport JS in Express](backend/passport-js/tutorials/authentication-with-passport-js.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/authentication-with-passport-js.md) \| [ID](backend/passport-js/tutorials/authentication-with-passport-js_id.md) |
| [Implementing OAuth 2.0 and Social Login in Express JS](backend/passport-js/tutorials/implementing-oauth-2-0-and-social-login.md) | Tutorial | Advanced | [EN](backend/passport-js/tutorials/implementing-oauth-2-0-and-social-login.md) \| [ID](backend/passport-js/tutorials/implementing-oauth-2-0-and-social-login_id.md) |
| [Implementing OAuth 2.0 Authentication in Express JS](backend/passport-js/tutorials/implementing-oauth-2-0-authentication.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth-2-0-authentication.md) \| [ID](backend/passport-js/tutorials/implementing-oauth-2-0-authentication_id.md) |
| [Implementing OAuth 2.0 Authentication in Express JS with Passport](backend/passport-js/tutorials/implementing-oauth-2-0-authentication-in-express-js-with-passport.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth-2-0-authentication-in-express-js-with-passport.md) \| [ID](backend/passport-js/tutorials/implementing-oauth-2-0-authentication-in-express-js-with-passport_id.md) |
| [Implementing OAuth 2.0 Social Login in Express JS](backend/passport-js/tutorials/implementing-oauth-2-0-social-login.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth-2-0-social-login.md) \| [ID](backend/passport-js/tutorials/implementing-oauth-2-0-social-login_id.md) |
| [Implementing OAuth2 and Social Login in Express.js](backend/passport-js/tutorials/implementing-oauth2-and-social-login.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-and-social-login.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-and-social-login_id.md) |
| [Implementing OAuth2 Authentication in Express JS](backend/passport-js/tutorials/implementing-oauth2-authentication.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-authentication.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-authentication_id.md) |
| [Implementing OAuth2 Authentication in Express JS with Passport](backend/passport-js/tutorials/implementing-oauth2-authentication-in-express-js-with-passport.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-authentication-in-express-js-with-passport.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-authentication-in-express-js-with-passport_id.md) |
| [Implementing OAuth2 Authentication with Passport in Express JS](backend/passport-js/tutorials/implementing-oauth2-authentication-with-passport.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-authentication-with-passport.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-authentication-with-passport_id.md) |
| [Implementing OAuth2 Google Login in Express JS](backend/passport-js/tutorials/implementing-oauth2-google-login.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-google-login.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-google-login_id.md) |
| [Implementing OAuth2 Social Login in Express JS with Passport](backend/passport-js/tutorials/implementing-oauth2-social-login-in-express-js-with-passport.md) | Tutorial | Intermediate | [EN](backend/passport-js/tutorials/implementing-oauth2-social-login-in-express-js-with-passport.md) \| [ID](backend/passport-js/tutorials/implementing-oauth2-social-login-in-express-js-with-passport_id.md) |

#### 🏷️ Bullmq

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Pemrosesan Tugas Asinkron di Express JS dengan BullMQ](backend/bullmq/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq_id.md) | Tutorial | Beginner | [ID](backend/bullmq/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq_id.md) |
| [Handling Background Jobs and Task Queues in Express JS](backend/bullmq/tutorials/handling-background-jobs-and-task-queues.md) | Tutorial | Advanced | [EN](backend/bullmq/tutorials/handling-background-jobs-and-task-queues.md) \| [ID](backend/bullmq/tutorials/handling-background-jobs-and-task-queues_id.md) |

#### 🏷️ Nodemailer

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Sending Emails in Express JS with Nodemailer](backend/nodemailer/tutorials/sending-emails-in-express-js-with-nodemailer.md) | Tutorial | Intermediate | [EN](backend/nodemailer/tutorials/sending-emails-in-express-js-with-nodemailer.md) \| [ID](backend/nodemailer/tutorials/sending-emails-in-express-js-with-nodemailer_id.md) |

#### 🏷️ Socket Io

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Real-Time Communication in Express with Socket.IO](backend/socket-io/tutorials/real-time-communication-in-express-with-socket-io.md) | Tutorial | Advanced | [EN](backend/socket-io/tutorials/real-time-communication-in-express-with-socket-io.md) \| [ID](backend/socket-io/tutorials/real-time-communication-in-express-with-socket-io_id.md) |

#### 🏷️ Jwt

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Authentication and Authorization Using JWT in Express.js](backend/jwt/tutorials/authentication-and-authorization-with-jwt.md) | Tutorial | Intermediate | [EN](backend/jwt/tutorials/authentication-and-authorization-with-jwt.md) \| [ID](backend/jwt/tutorials/authentication-and-authorization-with-jwt_id.md) |
| [Implementing Refresh Tokens with JWT in Express.js](backend/jwt/tutorials/implementing-refresh-tokens-with-jwt.md) | Tutorial | Advanced | [EN](backend/jwt/tutorials/implementing-refresh-tokens-with-jwt.md) \| [ID](backend/jwt/tutorials/implementing-refresh-tokens-with-jwt_id.md) |

#### 🏷️ Express Generator

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Langkah Membuat Project Express.js dengan Express Generator](backend/express-generator/tutorials/install_id.md) | Tutorial | Intermediate | [ID](backend/express-generator/tutorials/install_id.md) |

### 📁 Mobile

#### 🏷️ Flutter

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Flutter Syllabi](mobile/flutter/syllabi/flutter-syllabi_id.md) | Syllabus | Advanced | [ID](mobile/flutter/syllabi/flutter-syllabi_id.md) |

### 📁 Devops

#### 🏷️ Docker

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Judul](devops/docker/tutorials/dockerizing-express-js-applications.md) | Tutorial | Intermediate | [EN](devops/docker/tutorials/dockerizing-express-js-applications.md) \| [ID](devops/docker/tutorials/dockerizing-express-js-applications_id.md) |

#### 🏷️ Pm2

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Scaling Express JS Applications with PM2 and Clustering](devops/pm2/tutorials/scaling-express-js-applications-with-pm2-and-clustering.md) | Tutorial | Advanced | [EN](devops/pm2/tutorials/scaling-express-js-applications-with-pm2-and-clustering.md) \| [ID](devops/pm2/tutorials/scaling-express-js-applications-with-pm2-and-clustering_id.md) |

### 📁 Database

#### 🏷️ Redis

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Asynchronous Task Processing in Express JS with BullMQ](database/redis/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq.md) | Tutorial | Advanced | [EN](database/redis/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq.md) |
| [Caching in Express JS APIs with Redis](database/redis/tutorials/caching-in-express-js-apis-with-redis.md) | Tutorial | Advanced | [EN](database/redis/tutorials/caching-in-express-js-apis-with-redis.md) \| [ID](database/redis/tutorials/caching-in-express-js-apis-with-redis_id.md) |
| [Handling Background Jobs in Express JS with BullMQ and Redis](database/redis/tutorials/handling-background-jobs-in-express-js-with-bull-mq-and-redis.md) | Tutorial | Advanced | [EN](database/redis/tutorials/handling-background-jobs-in-express-js-with-bull-mq-and-redis.md) \| [ID](database/redis/tutorials/handling-background-jobs-in-express-js-with-bull-mq-and-redis_id.md) |
| [Rate Limiting and API Throttling in Express JS](database/redis/tutorials/rate-limiting-and-api-throttling.md) | Tutorial | Advanced | [EN](database/redis/tutorials/rate-limiting-and-api-throttling.md) |

#### 🏷️ Mongodb

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Database Integration with Express JS and Mongoose](database/mongodb/tutorials/database-integration-with-express-js-and-mongoose.md) | Tutorial | Beginner | [EN](database/mongodb/tutorials/database-integration-with-express-js-and-mongoose.md) \| [ID](database/mongodb/tutorials/database-integration-with-express-js-and-mongoose_id.md) |
| [Database Integration with MongoDB and Mongoose in Express JS](database/mongodb/tutorials/database-integration-with-mongo-db-and-mongoose.md) | Tutorial | Beginner | [EN](database/mongodb/tutorials/database-integration-with-mongo-db-and-mongoose.md) \| [ID](database/mongodb/tutorials/database-integration-with-mongo-db-and-mongoose_id.md) |
| [Implementing Health Checks in Express JS](database/mongodb/tutorials/implementing-health-checks.md) | Tutorial | Intermediate | [EN](database/mongodb/tutorials/implementing-health-checks.md) \| [ID](database/mongodb/tutorials/implementing-health-checks_id.md) |
| [Implementing Health Checks and Readiness Probes in Express JS](database/mongodb/tutorials/implementing-health-checks-and-readiness-probes.md) | Tutorial | Advanced | [EN](database/mongodb/tutorials/implementing-health-checks-and-readiness-probes.md) \| [ID](database/mongodb/tutorials/implementing-health-checks-and-readiness-probes_id.md) |

#### 🏷️ Prisma

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Langkah Integrasi Prisma dengan Express.js](database/prisma/tutorials/express-with-prisma_id.md) | Tutorial | Intermediate | [ID](database/prisma/tutorials/express-with-prisma_id.md) |

### 📁 Testing

#### 🏷️ Jest

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Testing Express API with Jest and Supertest](testing/jest/tutorials/testing-express-api-with-jest-and-supertest.md) | Tutorial | Advanced | [EN](testing/jest/tutorials/testing-express-api-with-jest-and-supertest.md) \| [ID](testing/jest/tutorials/testing-express-api-with-jest-and-supertest_id.md) |
<!-- INDEX_END -->

---

## Getting Started

To explore or run the library locally, clone the repository:

```bash
git clone https://github.com/Reinvy/ReinvyLibrary.git
cd ReinvyLibrary
```

Install the project dependencies to run formatting and validation tools:

```bash
npm install
```

---

## How to Contribute

Contributions are highly encouraged! Both human developers and Agentic AIs can easily submit new content. Please review our **[Contributing Guidelines](CONTRIBUTING.md)** first.

General steps:
1. Fork the repository.
2. Create your branch (`git checkout -b feature/topic-name`).
3. Add your content to the appropriate folder following our templates.
4. Run `npm run validate` and `npm run lint` locally.
5. Open a Pull Request.

---

## Automation & Verification

We use automated workflows to ensure all content conforms to repository guidelines:
- **Linter**: We use `markdownlint` to enforce standard markdown formatting. Run it locally:
  ```bash
  npm run lint
  ```
- **Validator**: We run a custom Node.js script to check file naming, folder structures, and YAML frontmatter metadata. Run it locally:
  ```bash
  npm run validate
  ```

---

## License

**ReinvyLibrary** is licensed under the MIT License. Feel free to use, modify, and distribute the content with proper attribution to the original author.

---

## Contact

If you have any questions, suggestions, or feedback:
- **Email**: reinvy.dev@gmail.com
- **GitHub**: [Reinvy](https://github.com/Reinvy)

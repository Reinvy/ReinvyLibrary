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

#### 🏷️ Expressjs

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [API Versioning Strategies in Express JS](backend/expressjs/tutorials/api-versioning-strategies.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/api-versioning-strategies.md) \| [ID](backend/expressjs/tutorials/api-versioning-strategies_id.md) |
| [Asynchronous Task Processing in Express JS with BullMQ](backend/expressjs/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq.md) \| [ID](backend/expressjs/tutorials/asynchronous-task-processing-in-express-js-with-bull-mq_id.md) |
| [Authentication and Authorization Using JWT in Express.js](backend/expressjs/tutorials/authentication-and-authorization-with-jwt.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/authentication-and-authorization-with-jwt.md) \| [ID](backend/expressjs/tutorials/authentication-and-authorization-with-jwt_id.md) |
| [Authentication with Passport JS in Express](backend/expressjs/tutorials/authentication-with-passport-js.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/authentication-with-passport-js.md) \| [ID](backend/expressjs/tutorials/authentication-with-passport-js_id.md) |
| [Understanding Basic Routing and Middleware in Express.js](backend/expressjs/tutorials/basic-routing-and-middleware.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/basic-routing-and-middleware.md) \| [ID](backend/expressjs/tutorials/basic-routing-and-middleware_id.md) |
| [Building GraphQL APIs with Express and Apollo Server](backend/expressjs/tutorials/building-graph-ql-apis.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/building-graph-ql-apis.md) \| [ID](backend/expressjs/tutorials/building-graph-ql-apis_id.md) |
| [Building Type-Safe Express Apps with TypeScript](backend/expressjs/tutorials/building-type-safe-express-apps-with-type-script.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/building-type-safe-express-apps-with-type-script.md) \| [ID](backend/expressjs/tutorials/building-type-safe-express-apps-with-type-script_id.md) |
| [Caching in Express JS APIs with Redis](backend/expressjs/tutorials/caching-in-express-js-apis-with-redis.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/caching-in-express-js-apis-with-redis.md) \| [ID](backend/expressjs/tutorials/caching-in-express-js-apis-with-redis_id.md) |
| [Centralized Data Validation and Error Handling in Express.js](backend/expressjs/tutorials/data-validation-and-error-handling.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/data-validation-and-error-handling.md) \| [ID](backend/expressjs/tutorials/data-validation-and-error-handling_id.md) |
| [Data Validation with Zod in Express JS](backend/expressjs/tutorials/data-validation-with-zod.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/data-validation-with-zod.md) \| [ID](backend/expressjs/tutorials/data-validation-with-zod_id.md) |
| [Database Integration with Express JS and Mongoose](backend/expressjs/tutorials/database-integration-with-express-js-and-mongoose.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/database-integration-with-express-js-and-mongoose.md) \| [ID](backend/expressjs/tutorials/database-integration-with-express-js-and-mongoose_id.md) |
| [Deploying Express JS Applications to Production](backend/expressjs/tutorials/deploying-express-js-applications-to-production.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/deploying-express-js-applications-to-production.md) \| [ID](backend/expressjs/tutorials/deploying-express-js-applications-to-production_id.md) |
| [Judul](backend/expressjs/tutorials/dockerizing-express-js-applications.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/dockerizing-express-js-applications.md) \| [ID](backend/expressjs/tutorials/dockerizing-express-js-applications_id.md) |
| [Environment Variables in Express JS](backend/expressjs/tutorials/environment-variables.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/environment-variables.md) \| [ID](backend/expressjs/tutorials/environment-variables_id.md) |
| [Express.js Security Best Practices](backend/expressjs/tutorials/express-js-security-best-practices.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/express-js-security-best-practices.md) \| [ID](backend/expressjs/tutorials/express-js-security-best-practices_id.md) |
| [Integrating Prisma ORM with Express.js](backend/expressjs/tutorials/express-with-prisma.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/express-with-prisma.md) \| [ID](backend/expressjs/tutorials/express-with-prisma_id.md) |
| [Getting Started with Express Generator](backend/expressjs/tutorials/getting-started-with-express-generator.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/getting-started-with-express-generator.md) \| [ID](backend/expressjs/tutorials/getting-started-with-express-generator_id.md) |
| [Graceful Shutdown in Express JS Applications](backend/expressjs/tutorials/graceful-shutdown-in-express-js-applications.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/graceful-shutdown-in-express-js-applications.md) \| [ID](backend/expressjs/tutorials/graceful-shutdown-in-express-js-applications_id.md) |
| [Handling File Downloads and Streaming in Express JS](backend/expressjs/tutorials/handling-file-downloads-and-streaming.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/handling-file-downloads-and-streaming.md) \| [ID](backend/expressjs/tutorials/handling-file-downloads-and-streaming_id.md) |
| [Handling File Uploads in Express JS with Multer](backend/expressjs/tutorials/handling-file-uploads-in-express-js-with-multer.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/handling-file-uploads-in-express-js-with-multer.md) \| [ID](backend/expressjs/tutorials/handling-file-uploads-in-express-js-with-multer_id.md) |
| [Implementing Health Checks and Readiness Probes in Express JS](backend/expressjs/tutorials/implementing-health-checks-and-readiness-probes.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/implementing-health-checks-and-readiness-probes.md) \| [ID](backend/expressjs/tutorials/implementing-health-checks-and-readiness-probes_id.md) |
| [Implementing OAuth 2.0 and Social Login in Express JS](backend/expressjs/tutorials/implementing-oauth-2-0-and-social-login.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/implementing-oauth-2-0-and-social-login.md) \| [ID](backend/expressjs/tutorials/implementing-oauth-2-0-and-social-login_id.md) |
| [Implementing Refresh Tokens with JWT in Express.js](backend/expressjs/tutorials/implementing-refresh-tokens-with-jwt.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/implementing-refresh-tokens-with-jwt.md) \| [ID](backend/expressjs/tutorials/implementing-refresh-tokens-with-jwt_id.md) |
| [Implementing Role-Based Access Control in Express JS](backend/expressjs/tutorials/implementing-role-based-access-control.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/implementing-role-based-access-control.md) \| [ID](backend/expressjs/tutorials/implementing-role-based-access-control_id.md) |
| [Implementing Server-Sent Events (SSE) in Express JS](backend/expressjs/tutorials/implementing-server-sent-events-sse.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/implementing-server-sent-events-sse.md) \| [ID](backend/expressjs/tutorials/implementing-server-sent-events-sse_id.md) |
| [Implementing Webhooks in Express JS](backend/expressjs/tutorials/implementing-webhooks.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/implementing-webhooks.md) \| [ID](backend/expressjs/tutorials/implementing-webhooks_id.md) |
| [Integrating Swagger UI for API Documentation in Express.js](backend/expressjs/tutorials/integrating-swagger-ui-for-api-documentation.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/integrating-swagger-ui-for-api-documentation.md) \| [ID](backend/expressjs/tutorials/integrating-swagger-ui-for-api-documentation_id.md) |
| [Logging and Monitoring in Express JS](backend/expressjs/tutorials/logging-and-monitoring.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/logging-and-monitoring.md) \| [ID](backend/expressjs/tutorials/logging-and-monitoring_id.md) |
| [Judul](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis.md) \| [ID](backend/expressjs/tutorials/pagination-filtering-and-sorting-in-express-apis_id.md) |
| [Password Hashing and Salting in Express JS with Bcrypt](backend/expressjs/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt.md) \| [ID](backend/expressjs/tutorials/password-hashing-and-salting-in-express-js-with-bcrypt_id.md) |
| [Performance Optimization Techniques in Express JS](backend/expressjs/tutorials/performance-optimization-techniques.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/performance-optimization-techniques.md) \| [ID](backend/expressjs/tutorials/performance-optimization-techniques_id.md) |
| [Rate Limiting and API Throttling in Express JS](backend/expressjs/tutorials/rate-limiting-and-api-throttling.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/rate-limiting-and-api-throttling.md) \| [ID](backend/expressjs/tutorials/rate-limiting-and-api-throttling_id.md) |
| [Real-Time Communication in Express with Socket.IO](backend/expressjs/tutorials/real-time-communication-in-express-with-socket-io.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/real-time-communication-in-express-with-socket-io.md) \| [ID](backend/expressjs/tutorials/real-time-communication-in-express-with-socket-io_id.md) |
| [Scaling Express JS Applications with PM2 and Clustering](backend/expressjs/tutorials/scaling-express-js-applications-with-pm2-and-clustering.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/scaling-express-js-applications-with-pm2-and-clustering.md) \| [ID](backend/expressjs/tutorials/scaling-express-js-applications-with-pm2-and-clustering_id.md) |
| [Sending Emails in Express JS with Nodemailer](backend/expressjs/tutorials/sending-emails-in-express-js-with-nodemailer.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/sending-emails-in-express-js-with-nodemailer.md) \| [ID](backend/expressjs/tutorials/sending-emails-in-express-js-with-nodemailer_id.md) |
| [Serving Static Files in Express.js](backend/expressjs/tutorials/serving-static-files.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/serving-static-files.md) \| [ID](backend/expressjs/tutorials/serving-static-files_id.md) |
| [Structuring a Scalable Express.js Application: MVC and Service Layer](backend/expressjs/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer.md) \| [ID](backend/expressjs/tutorials/structuring-a-scalable-express-app-mvc-and-service-layer_id.md) |
| [Testing Express API with Jest and Supertest](backend/expressjs/tutorials/testing-express-api-with-jest-and-supertest.md) | Tutorial | Advanced | [EN](backend/expressjs/tutorials/testing-express-api-with-jest-and-supertest.md) \| [ID](backend/expressjs/tutorials/testing-express-api-with-jest-and-supertest_id.md) |
| [Understanding Cookies and Session Management in Express.js](backend/expressjs/tutorials/understanding-cookies-and-session-management.md) | Tutorial | Intermediate | [EN](backend/expressjs/tutorials/understanding-cookies-and-session-management.md) \| [ID](backend/expressjs/tutorials/understanding-cookies-and-session-management_id.md) |
| [Understanding CORS in Express JS](backend/expressjs/tutorials/understanding-cors.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/understanding-cors.md) \| [ID](backend/expressjs/tutorials/understanding-cors_id.md) |
| [Understanding RESTful API Design Principles in Express](backend/expressjs/tutorials/understanding-restful-api-design-principles.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/understanding-restful-api-design-principles.md) \| [ID](backend/expressjs/tutorials/understanding-restful-api-design-principles_id.md) |
| [Understanding the Express JS Request Lifecycle](backend/expressjs/tutorials/understanding-the-express-js-request-lifecycle.md) | Tutorial | Beginner | [EN](backend/expressjs/tutorials/understanding-the-express-js-request-lifecycle.md) \| [ID](backend/expressjs/tutorials/understanding-the-express-js-request-lifecycle_id.md) |

### 📁 Frontend

#### 🏷️ Nextjs

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Next.js Project Structure and Best Practices](frontend/nextjs/guides/nextjs-project-structure-and-best-practices.md) | Guide | Intermediate | [EN](frontend/nextjs/guides/nextjs-project-structure-and-best-practices.md) \| [ID](frontend/nextjs/guides/nextjs-project-structure-and-best-practices_id.md) |

### 📁 Mobile

#### 🏷️ Flutter

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Flutter App Development Syllabus](mobile/flutter/syllabi/flutter-syllabus.md) | Syllabus | Advanced | [EN](mobile/flutter/syllabi/flutter-syllabus.md) \| [ID](mobile/flutter/syllabi/flutter-syllabus_id.md) |
| [State Management with Provider in Flutter](mobile/flutter/tutorials/state-management-with-provider-in-flutter.md) | Tutorial | Intermediate | [EN](mobile/flutter/tutorials/state-management-with-provider-in-flutter.md) \| [ID](mobile/flutter/tutorials/state-management-with-provider-in-flutter_id.md) |

### 📁 Devops

#### 🏷️ Docker

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Docker Containerization Mastery Syllabus](devops/docker/syllabi/docker-containerization-syllabus.md) | Syllabus | Intermediate | [EN](devops/docker/syllabi/docker-containerization-syllabus.md) \| [ID](devops/docker/syllabi/docker-containerization-syllabus_id.md) |

### 📁 Database

#### 🏷️ Mongodb

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [MongoDB Query Cheatsheet](database/mongodb/cheatsheets/mongodb-query-cheatsheet.md) | Cheatsheet | Beginner | [EN](database/mongodb/cheatsheets/mongodb-query-cheatsheet.md) \| [ID](database/mongodb/cheatsheets/mongodb-query-cheatsheet_id.md) |
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

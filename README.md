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
| [Express.js Best Practices Guide](backend/expressjs/guides/expressjs-best-practices-guide.md) | Guide | Intermediate | [EN](backend/expressjs/guides/expressjs-best-practices-guide.md) \| [ID](backend/expressjs/guides/expressjs-best-practices-guide_id.md) |
| [Express.js Cheatsheet](backend/expressjs/cheatsheets/expressjs-cheatsheet.md) | Cheatsheet | Beginner | [EN](backend/expressjs/cheatsheets/expressjs-cheatsheet.md) \| [ID](backend/expressjs/cheatsheets/expressjs-cheatsheet_id.md) |
| [Express.js Development Syllabus](backend/expressjs/syllabi/expressjs-development-syllabus.md) | Syllabus | Intermediate | [EN](backend/expressjs/syllabi/expressjs-development-syllabus.md) \| [ID](backend/expressjs/syllabi/expressjs-development-syllabus_id.md) |
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

#### 🏷️ Elysiajs

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Building REST APIs with ElysiaJS](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs.md) | Tutorial | Intermediate | [EN](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs.md) \| [ID](backend/elysiajs/tutorials/building-rest-apis-with-elysiajs_id.md) |
| [Elysia.js Cheatsheet](backend/elysiajs/cheatsheets/elysiajs-cheatsheet.md) | Cheatsheet | Beginner | [EN](backend/elysiajs/cheatsheets/elysiajs-cheatsheet.md) \| [ID](backend/elysiajs/cheatsheets/elysiajs-cheatsheet_id.md) |
| [Elysia.js Production Patterns Guide](backend/elysiajs/guides/elysiajs-production-patterns-guide.md) | Guide | Intermediate | [EN](backend/elysiajs/guides/elysiajs-production-patterns-guide.md) \| [ID](backend/elysiajs/guides/elysiajs-production-patterns-guide_id.md) |
| [Elysia.js Web Development Syllabus](backend/elysiajs/syllabi/elysiajs-web-development-syllabus.md) | Syllabus | Intermediate | [EN](backend/elysiajs/syllabi/elysiajs-web-development-syllabus.md) \| [ID](backend/elysiajs/syllabi/elysiajs-web-development-syllabus_id.md) |

#### 🏷️ Golang

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Getting Started with Go Programming](backend/golang/tutorials/getting-started-with-go.md) | Tutorial | Beginner | [EN](backend/golang/tutorials/getting-started-with-go.md) \| [ID](backend/golang/tutorials/getting-started-with-go_id.md) |
| [Go Programming Language Syllabus](backend/golang/syllabi/go-syllabus.md) | Syllabus | Intermediate | [EN](backend/golang/syllabi/go-syllabus.md) \| [ID](backend/golang/syllabi/go-syllabus_id.md) |
| [Golang Cheatsheet](backend/golang/cheatsheets/golang-cheatsheet.md) | Cheatsheet | Intermediate | [EN](backend/golang/cheatsheets/golang-cheatsheet.md) \| [ID](backend/golang/cheatsheets/golang-cheatsheet_id.md) |
| [Go Concurrency Patterns Guide](backend/golang/guides/golang-concurrency-patterns-guide.md) | Guide | Intermediate | [EN](backend/golang/guides/golang-concurrency-patterns-guide.md) \| [ID](backend/golang/guides/golang-concurrency-patterns-guide_id.md) |

#### 🏷️ Laravel

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Laravel Best Practices Guide](backend/laravel/guides/laravel-best-practices-guide.md) | Guide | Intermediate | [EN](backend/laravel/guides/laravel-best-practices-guide.md) \| [ID](backend/laravel/guides/laravel-best-practices-guide_id.md) |
| [Laravel Cheat Sheet](backend/laravel/cheatsheets/laravel-cheatsheet.md) | Cheatsheet | Beginner | [EN](backend/laravel/cheatsheets/laravel-cheatsheet.md) \| [ID](backend/laravel/cheatsheets/laravel-cheatsheet_id.md) |
| [Laravel CRUD REST API Tutorial](backend/laravel/tutorials/laravel-crud-rest-api-tutorial.md) | Tutorial | Intermediate | [EN](backend/laravel/tutorials/laravel-crud-rest-api-tutorial.md) \| [ID](backend/laravel/tutorials/laravel-crud-rest-api-tutorial_id.md) |
| [Laravel Development Syllabus](backend/laravel/syllabi/laravel-development-syllabus.md) | Syllabus | Intermediate | [EN](backend/laravel/syllabi/laravel-development-syllabus.md) \| [ID](backend/laravel/syllabi/laravel-development-syllabus_id.md) |

#### 🏷️ Nestjs

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Getting Started with NestJS](backend/nestjs/tutorials/getting-started-with-nestjs.md) | Tutorial | Intermediate | [EN](backend/nestjs/tutorials/getting-started-with-nestjs.md) \| [ID](backend/nestjs/tutorials/getting-started-with-nestjs_id.md) |

### 📁 Frontend

#### 🏷️ Nextjs

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Building a Full-Stack Blog with Next.js App Router](frontend/nextjs/tutorials/building-a-full-stack-blog-with-nextjs-app-router.md) | Tutorial | Intermediate | [EN](frontend/nextjs/tutorials/building-a-full-stack-blog-with-nextjs-app-router.md) \| [ID](frontend/nextjs/tutorials/building-a-full-stack-blog-with-nextjs-app-router_id.md) |
| [Next.js Cheatsheet](frontend/nextjs/cheatsheets/nextjs-cheatsheet.md) | Cheatsheet | Intermediate | [EN](frontend/nextjs/cheatsheets/nextjs-cheatsheet.md) \| [ID](frontend/nextjs/cheatsheets/nextjs-cheatsheet_id.md) |
| [Next.js Project Structure and Best Practices](frontend/nextjs/guides/nextjs-project-structure-and-best-practices.md) | Guide | Intermediate | [EN](frontend/nextjs/guides/nextjs-project-structure-and-best-practices.md) \| [ID](frontend/nextjs/guides/nextjs-project-structure-and-best-practices_id.md) |
| [Next.js Development Syllabus](frontend/nextjs/syllabi/nextjs-syllabus.md) | Syllabus | Intermediate | [EN](frontend/nextjs/syllabi/nextjs-syllabus.md) \| [ID](frontend/nextjs/syllabi/nextjs-syllabus_id.md) |

#### 🏷️ React Native

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Building a REST API-Driven Mobile App with React Native](frontend/react-native/tutorials/building-rest-api-driven-mobile-app-with-react-native.md) | Tutorial | Intermediate | [EN](frontend/react-native/tutorials/building-rest-api-driven-mobile-app-with-react-native.md) \| [ID](frontend/react-native/tutorials/building-rest-api-driven-mobile-app-with-react-native_id.md) |
| [React Native Cheatsheet](frontend/react-native/cheatsheets/react-native-cheatsheet.md) | Cheatsheet | Intermediate | [EN](frontend/react-native/cheatsheets/react-native-cheatsheet.md) \| [ID](frontend/react-native/cheatsheets/react-native-cheatsheet_id.md) |
| [React Native Development Syllabus](frontend/react-native/syllabi/react-native-development-syllabus.md) | Syllabus | Intermediate | [EN](frontend/react-native/syllabi/react-native-development-syllabus.md) \| [ID](frontend/react-native/syllabi/react-native-development-syllabus_id.md) |
| [React Native Performance Optimization and Debugging Guide](frontend/react-native/guides/react-native-performance-debugging-guide.md) | Guide | Advanced | [EN](frontend/react-native/guides/react-native-performance-debugging-guide.md) \| [ID](frontend/react-native/guides/react-native-performance-debugging-guide_id.md) |

#### 🏷️ Vuejs

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Building Web Apps with Vue.js 3](frontend/vuejs/tutorials/building-web-apps-with-vuejs.md) | Tutorial | Intermediate | [EN](frontend/vuejs/tutorials/building-web-apps-with-vuejs.md) \| [ID](frontend/vuejs/tutorials/building-web-apps-with-vuejs_id.md) |
| [Vue.js Best Practices Guide](frontend/vuejs/guides/vuejs-best-practices-guide.md) | Guide | Advanced | [EN](frontend/vuejs/guides/vuejs-best-practices-guide.md) \| [ID](frontend/vuejs/guides/vuejs-best-practices-guide_id.md) |
| [Vue.js Cheat Sheet](frontend/vuejs/cheatsheets/vuejs-cheatsheet.md) | Cheatsheet | Beginner | [EN](frontend/vuejs/cheatsheets/vuejs-cheatsheet.md) \| [ID](frontend/vuejs/cheatsheets/vuejs-cheatsheet_id.md) |
| [Vue.js Frontend Development Syllabus](frontend/vuejs/syllabi/vuejs-frontend-development-syllabus.md) | Syllabus | Intermediate | [EN](frontend/vuejs/syllabi/vuejs-frontend-development-syllabus.md) \| [ID](frontend/vuejs/syllabi/vuejs-frontend-development-syllabus_id.md) |

### 📁 Mobile

#### 🏷️ Flutter

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Flutter Clean Architecture Guide](mobile/flutter/guides/flutter-clean-architecture-guide.md) | Guide | Advanced | [EN](mobile/flutter/guides/flutter-clean-architecture-guide.md) \| [ID](mobile/flutter/guides/flutter-clean-architecture-guide_id.md) |
| [Flutter App Development Syllabus](mobile/flutter/syllabi/flutter-syllabus.md) | Syllabus | Advanced | [EN](mobile/flutter/syllabi/flutter-syllabus.md) \| [ID](mobile/flutter/syllabi/flutter-syllabus_id.md) |
| [Flutter Widget Cheatsheet](mobile/flutter/cheatsheets/flutter-widget-cheatsheet.md) | Cheatsheet | Beginner | [EN](mobile/flutter/cheatsheets/flutter-widget-cheatsheet.md) \| [ID](mobile/flutter/cheatsheets/flutter-widget-cheatsheet_id.md) |
| [State Management with Provider in Flutter](mobile/flutter/tutorials/state-management-with-provider-in-flutter.md) | Tutorial | Intermediate | [EN](mobile/flutter/tutorials/state-management-with-provider-in-flutter.md) \| [ID](mobile/flutter/tutorials/state-management-with-provider-in-flutter_id.md) |

#### 🏷️ Swift

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [iOS App Development with Swift](mobile/swift/tutorials/ios-app-development-with-swift.md) | Tutorial | Intermediate | [EN](mobile/swift/tutorials/ios-app-development-with-swift.md) \| [ID](mobile/swift/tutorials/ios-app-development-with-swift_id.md) |
| [iOS Development Syllabus](mobile/swift/syllabi/ios-development-syllabus.md) | Syllabus | Intermediate | [EN](mobile/swift/syllabi/ios-development-syllabus.md) \| [ID](mobile/swift/syllabi/ios-development-syllabus_id.md) |
| [Swift Cheat Sheet](mobile/swift/cheatsheets/swift-cheatsheet.md) | Cheatsheet | Beginner | [EN](mobile/swift/cheatsheets/swift-cheatsheet.md) \| [ID](mobile/swift/cheatsheets/swift-cheatsheet_id.md) |
| [Swift iOS Best Practices Guide](mobile/swift/guides/swift-ios-best-practices-guide.md) | Guide | Advanced | [EN](mobile/swift/guides/swift-ios-best-practices-guide.md) \| [ID](mobile/swift/guides/swift-ios-best-practices-guide_id.md) |

#### 🏷️ Kotlin

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Android App Development with Kotlin](mobile/kotlin/tutorials/android-app-development-with-kotlin.md) | Tutorial | Intermediate | [EN](mobile/kotlin/tutorials/android-app-development-with-kotlin.md) \| [ID](mobile/kotlin/tutorials/android-app-development-with-kotlin_id.md) |
| [Android Development Syllabus](mobile/kotlin/syllabi/android-development-syllabus.md) | Syllabus | Intermediate | [EN](mobile/kotlin/syllabi/android-development-syllabus.md) \| [ID](mobile/kotlin/syllabi/android-development-syllabus_id.md) |
| [Kotlin Android Best Practices Guide](mobile/kotlin/guides/kotlin-android-best-practices-guide.md) | Guide | Advanced | [EN](mobile/kotlin/guides/kotlin-android-best-practices-guide.md) \| [ID](mobile/kotlin/guides/kotlin-android-best-practices-guide_id.md) |
| [Kotlin Cheat Sheet](mobile/kotlin/cheatsheets/kotlin-cheatsheet.md) | Cheatsheet | Beginner | [EN](mobile/kotlin/cheatsheets/kotlin-cheatsheet.md) \| [ID](mobile/kotlin/cheatsheets/kotlin-cheatsheet_id.md) |

### 📁 Devops

#### 🏷️ Docker

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Docker Command Cheatsheet](devops/docker/cheatsheets/docker-command-cheatsheet.md) | Cheatsheet | Beginner | [EN](devops/docker/cheatsheets/docker-command-cheatsheet.md) \| [ID](devops/docker/cheatsheets/docker-command-cheatsheet_id.md) |
| [Docker Compose Networking and Multi-Service Orchestration Guide](devops/docker/guides/docker-compose-networking-guide.md) | Guide | Intermediate | [EN](devops/docker/guides/docker-compose-networking-guide.md) \| [ID](devops/docker/guides/docker-compose-networking-guide_id.md) |
| [Docker Containerization Mastery Syllabus](devops/docker/syllabi/docker-containerization-syllabus.md) | Syllabus | Intermediate | [EN](devops/docker/syllabi/docker-containerization-syllabus.md) \| [ID](devops/docker/syllabi/docker-containerization-syllabus_id.md) |
| [Dockerizing a Full-Stack Application](devops/docker/tutorials/dockerizing-a-full-stack-application.md) | Tutorial | Intermediate | [EN](devops/docker/tutorials/dockerizing-a-full-stack-application.md) \| [ID](devops/docker/tutorials/dockerizing-a-full-stack-application_id.md) |

#### 🏷️ Pm2

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Managing Node.js Applications with PM2](devops/pm2/tutorials/managing-node-js-applications-with-pm2.md) | Tutorial | Intermediate | [EN](devops/pm2/tutorials/managing-node-js-applications-with-pm2.md) \| [ID](devops/pm2/tutorials/managing-node-js-applications-with-pm2_id.md) |
| [PM2 Cheatsheet](devops/pm2/cheatsheets/pm2-cheatsheet.md) | Cheatsheet | Intermediate | [EN](devops/pm2/cheatsheets/pm2-cheatsheet.md) \| [ID](devops/pm2/cheatsheets/pm2-cheatsheet_id.md) |
| [PM2 Process Management Syllabus](devops/pm2/syllabi/pm2-process-management-syllabus.md) | Syllabus | Intermediate | [EN](devops/pm2/syllabi/pm2-process-management-syllabus.md) \| [ID](devops/pm2/syllabi/pm2-process-management-syllabus_id.md) |
| [PM2 Production Deployment and Monitoring Guide](devops/pm2/guides/pm2-production-deployment-guide.md) | Guide | Intermediate | [EN](devops/pm2/guides/pm2-production-deployment-guide.md) \| [ID](devops/pm2/guides/pm2-production-deployment-guide_id.md) |

#### 🏷️ Kubernetes

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Getting Started with Kubernetes](devops/kubernetes/tutorials/getting-started-with-kubernetes.md) | Tutorial | Intermediate | [EN](devops/kubernetes/tutorials/getting-started-with-kubernetes.md) \| [ID](devops/kubernetes/tutorials/getting-started-with-kubernetes_id.md) |
| [Kubernetes Cheat Sheet](devops/kubernetes/cheatsheets/kubernetes-cheatsheet.md) | Cheatsheet | Beginner | [EN](devops/kubernetes/cheatsheets/kubernetes-cheatsheet.md) \| [ID](devops/kubernetes/cheatsheets/kubernetes-cheatsheet_id.md) |
| [Kubernetes DevOps Syllabus](devops/kubernetes/syllabi/kubernetes-devops-syllabus.md) | Syllabus | Intermediate | [EN](devops/kubernetes/syllabi/kubernetes-devops-syllabus.md) \| [ID](devops/kubernetes/syllabi/kubernetes-devops-syllabus_id.md) |
| [Kubernetes Production Best Practices Guide](devops/kubernetes/guides/kubernetes-production-best-practices.md) | Guide | Advanced | [EN](devops/kubernetes/guides/kubernetes-production-best-practices.md) \| [ID](devops/kubernetes/guides/kubernetes-production-best-practices_id.md) |

### 📁 Database

#### 🏷️ Redis

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Getting Started with Redis](database/redis/tutorials/getting-started-with-redis.md) | Tutorial | Beginner | [EN](database/redis/tutorials/getting-started-with-redis.md) \| [ID](database/redis/tutorials/getting-started-with-redis_id.md) |
| [Redis Caching Patterns and Strategies Guide](database/redis/guides/redis-caching-patterns-guide.md) | Guide | Intermediate | [EN](database/redis/guides/redis-caching-patterns-guide.md) \| [ID](database/redis/guides/redis-caching-patterns-guide_id.md) |
| [Redis Cheatsheet](database/redis/cheatsheets/redis-cheatsheet.md) | Cheatsheet | Beginner | [EN](database/redis/cheatsheets/redis-cheatsheet.md) \| [ID](database/redis/cheatsheets/redis-cheatsheet_id.md) |
| [Redis Development Syllabus](database/redis/syllabi/redis-development-syllabus.md) | Syllabus | Intermediate | [EN](database/redis/syllabi/redis-development-syllabus.md) \| [ID](database/redis/syllabi/redis-development-syllabus_id.md) |

#### 🏷️ Mongodb

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [MongoDB Aggregation Pipeline: A Practical Tutorial](database/mongodb/tutorials/mongodb-aggregation-pipeline.md) | Tutorial | Intermediate | [EN](database/mongodb/tutorials/mongodb-aggregation-pipeline.md) \| [ID](database/mongodb/tutorials/mongodb-aggregation-pipeline_id.md) |
| [MongoDB Development Syllabus](database/mongodb/syllabi/mongodb-development-syllabus.md) | Syllabus | Intermediate | [EN](database/mongodb/syllabi/mongodb-development-syllabus.md) \| [ID](database/mongodb/syllabi/mongodb-development-syllabus_id.md) |
| [MongoDB Query Cheatsheet](database/mongodb/cheatsheets/mongodb-query-cheatsheet.md) | Cheatsheet | Beginner | [EN](database/mongodb/cheatsheets/mongodb-query-cheatsheet.md) \| [ID](database/mongodb/cheatsheets/mongodb-query-cheatsheet_id.md) |
| [MongoDB Schema Design and Data Modeling Guide](database/mongodb/guides/mongodb-schema-design-and-data-modeling-guide.md) | Guide | Intermediate | [EN](database/mongodb/guides/mongodb-schema-design-and-data-modeling-guide.md) \| [ID](database/mongodb/guides/mongodb-schema-design-and-data-modeling-guide_id.md) |

#### 🏷️ Postgres

| Topic | Format | Difficulty | Available Languages |
| :--- | :--- | :--- | :--- |
| [Getting Started with PostgreSQL](database/postgres/tutorials/getting-started-with-postgresql.md) | Tutorial | Beginner | [EN](database/postgres/tutorials/getting-started-with-postgresql.md) \| [ID](database/postgres/tutorials/getting-started-with-postgresql_id.md) |
| [PostgreSQL Performance Tuning and Optimization Guide](database/postgres/guides/postgresql-performance-tuning-guide.md) | Guide | Advanced | [EN](database/postgres/guides/postgresql-performance-tuning-guide.md) \| [ID](database/postgres/guides/postgresql-performance-tuning-guide_id.md) |
| [PostgreSQL Query Cheatsheet](database/postgres/cheatsheets/postgresql-query-cheatsheet.md) | Cheatsheet | Beginner | [EN](database/postgres/cheatsheets/postgresql-query-cheatsheet.md) \| [ID](database/postgres/cheatsheets/postgresql-query-cheatsheet_id.md) |
| [PostgreSQL Syllabus](database/postgres/syllabi/postgresql-syllabus.md) | Syllabus | Beginner | [EN](database/postgres/syllabi/postgresql-syllabus.md) \| [ID](database/postgres/syllabi/postgresql-syllabus_id.md) |
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

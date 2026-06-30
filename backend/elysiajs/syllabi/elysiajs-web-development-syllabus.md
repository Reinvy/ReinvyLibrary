---
title: "Elysia.js Web Development Syllabus"
description: "A comprehensive 12-week curriculum for learning Elysia.js, a modern Bun-native web framework, covering fundamentals, TypeBox validation, plugins, testing, and production deployment."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Elysia.js Web Development Syllabus

## Overview

Elysia.js is a modern, high-performance web framework built specifically for the Bun runtime. It combines an elegant API design inspired by Express.js and Koa with first-class TypeScript support through TypeBox schema validation, a powerful plugin system, and built-in OpenAPI documentation generation.

This 12-week curriculum is designed for developers who already have foundational JavaScript/TypeScript knowledge and want to master building production-ready web APIs with Elysia.js. You will learn the framework from the ground up—core concepts, request handling, validation, middleware, plugins, database integration, testing, and deployment—culminating in a capstone REST API project.

## Curriculum

### Week 1: Introduction to Elysia.js and the Bun Runtime

- **Ecosystem Overview**
  - What is Bun? Runtime features and performance characteristics
  - Why Elysia.js? Comparison with Express.js, Hono, and other frameworks
  - The Bun toolchain: bun install, bun run, bun test, bunx
- **Project Setup**
  - Installing Bun and creating a new Elysia.js project
  - Project structure conventions
  - TypeScript configuration for Elysia.js projects
- **Hello World Application**
  - The `new Elysia().listen()` pattern
  - Understanding the app instance and request lifecycle
  - Hot reloading with `bun --watch`

### Week 2: Routing Fundamentals

- **HTTP Method Handlers**
  - Defining routes with `.get()`, `.post()`, `.put()`, `.delete()`, `.patch()`
  - Chaining route definitions
- **Route Parameters**
  - Path parameters (`:id`, `:slug` syntax)
  - Query parameters (`query` property)
  - Route grouping with `.group()`
- **Request and Response Objects**
  - Accessing request body, headers, and IP
  - Setting response status codes, headers, and body
  - Streaming responses

### Week 3: Input Validation with TypeBox

- **Introduction to TypeBox**
  - What is TypeBox? Relation to JSON Schema
  - TypeBox type system: `t.String()`, `t.Number()`, `t.Boolean()`, `t.Object()`
- **Schema-Based Validation**
  - Validating request body with `.post('/path', { body: schema }, handler)`
  - Validating query parameters and path parameters
  - Complex schemas: `t.Optional()`, `t.Union()`, `t.Array()`, `t.Enum()`
- **Error Handling for Validation**
  - Default validation error responses
  - Customizing error messages and status codes
  - Using `onError` hook for validation errors

### Week 4: Middleware and Guards

- **Lifecycle Hooks Overview**
  - `onBeforeHandle`, `onAfterHandle`, `onError`, `onRequest`, `onResponse`
  - Hook execution order and the request pipeline
- **Implementing Middleware**
  - Logging middleware
  - Authentication and authorization middleware
  - Rate limiting with hooks
- **Guards Pattern**
  - What are guards and when to use them
  - Combining guards with route groups
  - Guard composition for complex authorization flows

### Week 5: Plugin System and Code Organization

- **Plugin Architecture**
  - Creating and using plugins with `.use()`
  - Plugin configuration and options
  - Scoped vs global plugins
- **State and Decorators**
  - Sharing state across routes with `.state()`
  - Dependency injection with `.decorate()`
  - Accessing decorators in route handlers
- **Code Organization Patterns**
  - Feature-based folder structure
  - Separating routes, middleware, and plugins into modules
  - Dynamic route registration

### Week 6: Database Integration

- **Bun SQLite Integration**
  - Setting up Bun's built-in SQLite driver
  - CRUD operations with prepared statements
  - Migrations and schema management
- **ORM Options**
  - Using Drizzle ORM with Elysia.js
  - Using Prisma with Elysia.js and Bun
- **Database Patterns**
  - Repository pattern for data access
  - Connection pooling and transaction management
  - Error handling for database operations

### Week 7: Authentication and Authorization

- **JWT Authentication**
  - Using `@elysiajs/jwt` plugin
  - Token generation, verification, and refresh
  - Protecting routes with auth guards
- **Session Management**
  - Cookie-based sessions with `@elysiajs/cookie`
  - Bearer token authentication pattern
- **Role-Based Access Control**
  - Implementing RBAC with decorators and guards
  - Permission checking middleware

### Week 8: File Uploads, CORS, and Static Files

- **File Upload Handling**
  - Using `@elysiajs/upload` plugin
  - Single and multiple file uploads
  - File validation (type, size) and storage strategies
- **CORS Configuration**
  - Using `@elysiajs/cors` plugin
  - Configuring allowed origins, methods, and headers
  - Handling preflight requests
- **Serving Static Files**
  - Using `@elysiajs/static` plugin
  - Static asset organization and caching headers

### Week 9: WebSocket and Real-Time Features

- **WebSocket Support**
  - WebSocket routes with `.ws()`
  - Broadcasting messages to connected clients
  - Connection lifecycle: open, message, close, drain
- **Real-Time Patterns**
  - Chat application fundamentals
  - Live notifications and event streaming
  - Room-based broadcasting pattern

### Week 10: Testing

- **Unit Testing with Bun Test Runner**
  - Setting up `bun test` with Elysia.js
  - Testing individual route handlers
  - Mocking dependencies and decorators
- **Integration Testing**
  - Using `@elysiajs/testing` or `bun test` with fetch API
  - Testing HTTP endpoints end-to-end
  - Testing validation, error responses, and middleware
- **Test Organization**
  - Arrange-Act-Assert pattern
  - Test fixtures and factories
  - Coverage reporting with `bun test --coverage`

### Week 11: API Documentation and OpenAPI

- **Swagger/OpenAPI Generation**
  - Using `@elysiajs/swagger` plugin
  - Automatic endpoint documentation from TypeBox schemas
  - Configuring API metadata, tags, and descriptions
- **Eden Treaty Type-Safe Client**
  - Generating type-safe client code with Eden
  - Consuming Elysia.js APIs with full type safety
  - Eden Treaty for frontend-backend integration

### Week 12: Production Deployment and Operations

- **Production Build**
  - Building for production with `bun build`
  - Environment variable management with `@elysiajs/eden`
  - Graceful shutdown handling
- **Deployment Strategies**
  - Deploying Elysia.js on Fly.io, Railway, and Docker
  - Reverse proxy configuration with Caddy or Nginx
  - Health check endpoints and readiness probes
- **Monitoring and Observability**
  - Structured logging with custom middleware
  - Performance metrics and uptime monitoring
  - Error tracking and alerting setup

## Final Project

Build a production-grade REST API for a task management application using Elysia.js. The project must include:

- Complete CRUD operations for tasks, projects, and users
- TypeBox schema validation for all inputs
- JWT-based authentication with role-based access control (admin, manager, user)
- File upload support for task attachments
- WebSocket-based real-time notifications for task updates
- Database integration with SQLite and Drizzle ORM
- Comprehensive test suite with unit and integration tests
- Swagger/OpenAPI documentation
- Docker containerization and deployment configuration
- Graceful shutdown and health check endpoints

Deliverables: A GitHub repository with full source code, test suite, API documentation, and a deployment guide.

## Assessment Criteria

- **Assignments (40%)**
  - Weekly coding exercises based on the module content
  - Code review participation and peer feedback
  - Short quizzes on conceptual topics
- **Final Project (50%)**
  - Correct implementation of all required features
  - Code quality: modularity, error handling, TypeScript types
  - Test coverage: minimum 70% line coverage
  - API documentation completeness
  - Deployment readiness and configuration
- **Participation (10%)**
  - Engagement in discussions and code reviews
  - Timely submission of assignments

## References

- [Elysia.js Official Documentation](https://elysiajs.com/)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Bun Runtime Documentation](https://bun.sh/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Eden Treaty Documentation](https://elysiajs.com/eden/treaty.html)
- [Elysia.js GitHub Repository](https://github.com/elysiajs/elysia)

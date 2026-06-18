---
title: "Laravel Development Syllabus"
description: "A comprehensive 12-week curriculum for mastering Laravel development from PHP OOP foundations to production deployment, covering MVC architecture, Eloquent ORM, API development, testing, and security."
category: "backend"
technology: "laravel"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Laravel Development Syllabus

## Overview

This 12-week syllabus provides a structured, project-based learning path for mastering Laravel development. Starting with a PHP OOP refresher and Composer fundamentals, the curriculum progressively builds through MVC architecture, routing, Eloquent ORM, Blade templating, authentication, API development, testing, deployment, and security hardening. Each week combines conceptual learning with hands-on coding, culminating in a capstone project where students build a complete multi-tenant task management platform. The course is designed for developers with basic PHP knowledge who want to transition into professional Laravel development.

## Curriculum

### Week 1: PHP OOP Review and Composer Fundamentals

- **Object-Oriented PHP**
  - Classes, objects, inheritance, interfaces, traits, and abstract classes.
  - Namespaces and PSR-4 autoloading.
  - Dependency injection and service container concepts.
- **Composer Deep Dive**
  - `composer.json` structure, `require` vs `require-dev`.
  - Version constraints (`^`, `~`, `*`, exact).
  - Autoloading configuration (`psr-4`, `classmap`, `files`).
  - Creating and publishing a custom Composer package.
- **Hands-on**: Create a PHP library with OOP patterns, publish it via Composer, and consume it in a test project.

### Week 2: Laravel MVC Architecture and Project Structure

- **Laravel Installation**
  - Composer create-project vs Laravel Sail (Docker).
  - Environment configuration with `.env`.
- **Request Lifecycle**
  - Entry point (`public/index.php`), Kernel, service providers.
  - How routes, middleware, controllers, and views compose a response.
- **Directory Structure**
  - `app/`, `config/`, `database/`, `resources/`, `routes/`, `storage/`.
  - Convention over configuration philosophy.
- **Hands-on**: Install Laravel, explore directory structure, create a "Hello World" route and controller.

### Week 3: Routing — Web and API

- **Route Files**
  - `routes/web.php` (session-based, Blade views).
  - `routes/api.php` (stateless, JSON responses).
  - `routes/console.php` (Artisan commands).
- **Route Methods and Patterns**
  - GET, POST, PUT, PATCH, DELETE, and resourceful routing.
  - Route parameters, constraints, and named routes.
  - Route groups, prefixes, and middleware assignment.
- **Route Model Binding**
  - Implicit and explicit binding.
  - Custom key binding.
- **Hands-on**: Design routes for a blog system with web routes (public pages) and API routes (CRUD endpoints).

### Week 4: Eloquent ORM — Models, Migrations, and Relationships

- **Migrations**
  - Schema builder methods, column types, indexes, foreign keys.
  - Migration rollback and squashing.
- **Eloquent Models**
  - Conventions (table name, primary key, timestamps).
  - `$fillable`, `$guarded`, `$casts`, `$appends`, `$hidden`.
  - Accessors, mutators, and attribute casting.
- **Relationships**
  - One-to-one, one-to-many, many-to-many, has-many-through.
  - Polymorphic relationships.
  - Eager loading (`with()`, `load()`), N+1 problem.
- **Query Scopes**
  - Local and global scopes.
- **Hands-on**: Build a complete database schema for an e-commerce system with products, categories, orders, and users.

### Week 5: Blade Templating and Frontend Integration

- **Blade Syntax**
  - `{{ }}` escaped output, `{!! !!}` raw output.
  - Control structures (`@if`, `@foreach`, `@while`, `@switch`).
  - `@include`, `@extends`, `@section`, `@yield`.
- **Blade Components**
  - Class-based components and anonymous components.
  - Slots and component attributes.
- **Forms and CSRF**
  - `@csrf`, `@method` directives.
  - Form model binding.
- **Vite Integration**
  - Laravel Vite setup for CSS/JS asset bundling.
- **Hands-on**: Build a product listing and checkout UI with Blade components, form validation, and Vite asset pipeline.

### Week 6: Authentication and Authorization

- **Laravel Breeze / Jetstream**
  - Scaffolding authentication with Breeze (Blade + Alpine.js or Inertia).
  - Two-factor authentication with Jetstream.
- **Authorization Gates and Policies**
  - Defining gates in `App\Providers\AuthServiceProvider`.
  - Creating and registering policies.
  - Using `@can`, `@cannot` in Blade, `can()` in controllers.
- **Laravel Permissions (Spatie)**
  - Roles and permissions management.
- **Hands-on**: Add role-based authorization (admin, editor, viewer) to the e-commerce application.

### Week 7: API Development with Laravel

- **RESTful API Design**
  - Resource controllers, API resources, and transformers.
  - JSON response structure and HTTP status codes.
- **Laravel Sanctum**
  - Token-based authentication for SPAs and mobile apps.
  - Token abilities and scopes.
- **API Versioning**
  - URL prefix vs header-based versioning.
  - Best practices for backward compatibility.
- **API Documentation**
  - Scribe or Scramble for auto-generated OpenAPI specs.
- **Hands-on**: Build a JSON API for the e-commerce system with Sanctum authentication, resource collections, pagination, and API documentation.

### Week 8: Form Validation and Error Handling

- **Form Request Validation**
  - Creating custom Form Request classes.
  - Rule objects, custom validation rules.
  - `before_validation` and `after_validation` hooks.
- **Error Handling**
  - Custom exception classes.
  - Rendering exceptions in `bootstrap/app.php` (or `Handler` class).
  - Consistent JSON error responses for APIs.
- **Logging**
  - Laravel Log stack (single, daily, syslog, Slack, Papertrail).
  - Structured logging and context enrichment.
- **Hands-on**: Implement comprehensive form validation and error handling for the e-commerce order placement flow.

### Week 9: Testing with PHPUnit

- **Testing Fundamentals**
  - PHPUnit configuration and Laravel test helpers.
  - `RefreshDatabase`, `DatabaseTransactions`, `DatabaseMigrations`.
- **Feature Tests**
  - HTTP tests (`get()`, `post()`, `put()`, `delete()`).
  - Authentication and session helpers.
  - Assertions (`assertStatus`, `assertJson`, `assertDatabaseHas`).
- **Unit Tests**
  - Testing models, services, and custom classes.
  - Mocking with Mockery.
- **Browser Tests (Laravel Dusk)**
  - End-to-end JavaScript testing.
- **Test-Driven Development**
  - Red-green-refactor cycle.
- **Hands-on**: Write feature tests achieving 80%+ code coverage for the e-commerce API.

### Week 10: Queues, Events, and Broadcasting

- **Laravel Queues**
  - Job classes, dispatching, delaying, and chaining.
  - Queue workers and supervisors (Supervisor).
  - Horizon dashboard for queue monitoring.
- **Events and Listeners**
  - Defining events and listeners.
  - Event subscribers and queued event listeners.
- **Broadcasting**
  - Real-time events with Pusher or Reverb.
  - Presence channels and private channels.
- **Task Scheduling**
  - Artisan command scheduling with `schedule()`.
- **Hands-on**: Implement event-driven order processing with queue workers (send confirmation email, update inventory, notify admin).

### Week 11: Caching, Performance, and Deployment

- **Caching Strategies**
  - Cache drivers: file, database, Redis, Memcached.
  - Cache tags, cache locks, and atomic locks.
  - Query caching with `remember()` and `rememberForever()`.
- **Performance Optimization**
  - Route caching: `php artisan route:cache`.
  - Config caching: `php artisan config:cache`.
  - View caching, event caching.
  - Laravel Octane for high-performance serving.
- **Deployment**
  - Laravel Forge for server management.
  - Envoyer for zero-downtime deployments.
  - CI/CD pipelines with GitHub Actions.
- **Hands-on**: Deploy the e-commerce application to a production server, configure Redis caching, and set up Horizon for queue management.

### Week 12: Security, Monitoring, and Capstone Project Kickoff

- **Laravel Security**
  - Mass assignment protection, SQL injection prevention (Eloquent prepared statements).
  - XSS defense (Blade escaping), CSRF tokens.
  - Rate limiting, input sanitization.
  - Security headers with `laravel-security` packages.
- **Monitoring and Debugging**
  - Laravel Telescope for request/exception/query insights.
  - Sentry or Flare for error tracking.
  - Health checks and alerting.
- **Capstone Project**
  - Students begin building a multi-tenant task management platform.
  - Requirements: authentication, role-based access, API-first design, queue workers, Redis caching, comprehensive tests, and CI/CD pipeline.

## Final Project

**Multi-Tenant Task Management Platform**: Students build a complete SaaS-style application where multiple organizations (tenants) can manage their tasks independently. Required features:

- Tenant isolation via database scoping (single database with tenant_id or separate databases).
- User registration and invitation system with role-based permissions (admin, manager, member).
- CRUD for projects, tasks, comments, and file attachments.
- RESTful API for each resource with Sanctum authentication.
- Queue jobs for sending email notifications and generating reports.
- Redis caching for frequently accessed data (project listings, user profiles).
- Comprehensive test suite (feature tests for all API endpoints).
- Deployment to production with Forge or similar platform.
- API documentation using Scribe or Scramble.

## Assessment Criteria

- **Weekly Assignments (30%)**: Each week includes hands-on coding exercises that build toward the final project. Submissions are evaluated for correctness, code quality, and adherence to Laravel conventions.
- **Quiz Assessments (20%)**: Bi-weekly multiple-choice and short-answer quizzes covering conceptual understanding of MVC, Eloquent, routing, authentication, testing, and security.
- **Final Project (40%)**: Evaluated on functionality (all requirements met), code architecture (SOLID principles, design patterns), testing coverage (80%+), and deployment quality (zero-downtime, caching, monitoring).
- **Code Review Participation (10%)**: Students review peers' pull requests, providing constructive feedback on code style, potential bugs, and architectural improvements.

## References

- [Laravel Official Documentation](https://laravel.com/docs) — The definitive reference for all Laravel features.
- [Laracasts](https://laracasts.com) — Video tutorials for Laravel from beginner to advanced topics.
- [Laravel News](https://laravel-news.com) — Community news, packages, and tutorials.
- [Spatie Laravel Packages](https://spatie.be/docs) — High-quality packages for permissions, media, and more.
- [Laravel Bootcamp](https://bootcamp.laravel.com) — Official hands-on introduction to building Laravel applications.
- [PHP The Right Way](https://phptherightway.com) — PHP best practices companion.
- [Laravel Best Practices Guide](/backend/laravel/guides/laravel-best-practices-guide) — In-repo production patterns reference.
- [Laravel Cheat Sheet](/backend/laravel/cheatsheets/laravel-cheatsheet) — Quick command and syntax reference.

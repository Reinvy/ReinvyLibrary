---
title: "NestJS Development Syllabus"
description: "A comprehensive 12-week curriculum covering NestJS from fundamentals to production deployment — modules, controllers, providers, dependency injection, TypeORM, authentication, WebSocket gateways, testing, and a capstone REST API project."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# NestJS Development Syllabus

## Overview

This 12-week curriculum is designed to take developers from NestJS fundamentals to production-ready application development. Starting with the core building blocks — modules, controllers, providers, and dependency injection — the course progressively covers database integration with TypeORM, authentication strategies, real-time communication via WebSocket gateways, testing methodologies, and deployment with Docker and CI/CD. Each module combines conceptual learning with hands-on coding exercises, culminating in a capstone full-stack application project. The syllabus assumes familiarity with TypeScript and basic Node.js concepts.

## Curriculum

### Week 1: NestJS Fundamentals and Project Setup

- **NestJS CLI**
  - Installing the CLI (`npm i -g @nestjs/cli`)
  - Project scaffolding with `nest new`
  - Understanding the generated project structure
  - `nest generate` for modules, controllers, services
- **Application Architecture**
  - Entry point (`main.ts`) and the `NestFactory`
  - Module tree and the root `AppModule`
  - Request lifecycle overview
- **Development Tools**
  - Hot-reload with `nest start --watch`
  - Debug mode with `--debug`
  - TypeScript configuration for NestJS

### Week 2: Modules and Controllers

- **Modules**
  - `@Module()` decorator and its metadata (imports, controllers, providers, exports)
  - Feature modules pattern
  - Shared modules and global modules (`@Global()`)
  - Dynamic modules with `forRoot()` / `forFeature()`
- **Controllers**
  - `@Controller()` decorator and route prefixes
  - Request handlers: `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`
  - Route parameters (`@Param()`), query parameters (`@Query()`)
  - Request body (`@Body()`) and headers (`@Headers()`)
  - Response customization with `@Res()` (Express/Fastify integration)

### Week 3: Providers and Dependency Injection

- **Providers**
  - `@Injectable()` decorator and provider registration
  - Standard providers, value providers, factory providers
  - Custom providers with `useClass`, `useValue`, `useFactory`, `useExisting`
- **Dependency Injection**
  - Constructor-based injection
  - Property-based injection with `@Inject()`
  - Provider scopes: `SINGLETON` (default), `REQUEST`, `TRANSIENT`
  - Custom injection tokens
- **Service Layer Pattern**
  - Business logic encapsulation in services
  - Service-to-service dependency wiring

### Week 4: Pipes, DTOs, and Validation

- **Pipes**
  - Built-in pipes: `ValidationPipe`, `ParseIntPipe`, `ParseUUIDPipe`, `ParseBoolPipe`
  - Transformation vs validation pipes
  - Custom pipes: implementing `PipeTransform`
- **DTOs and Validation**
  - Class-based DTOs with `class-validator` and `class-transformer`
  - Whitelisting and forbidding non-decorated properties
  - Global pipes vs scoped (controller / handler-level) pipes
  - `@UsePipes()` decorator
- **Data Serialization**
  - `ClassSerializerInterceptor` for response transformation
  - `@Exclude()`, `@Expose()`, `@Transform()` decorators

### Week 5: Guards and Authentication

- **Guards**
  - `@Injectable()` with `CanActivate` interface
  - Execution context and the `Reflector` class
  - Role-based access control with custom guards
  - Global, controller, and method-level guards
- **Authentication Strategies**
  - Passport.js integration with `@nestjs/passport`
  - JWT authentication (`@nestjs/jwt`)
  - Local strategy, JWT strategy
  - Auth guards and route protection
  - Token extraction, verification, and payload handling

### Week 6: Interceptors, Middleware, and Exception Filters

- **Interceptors**
  - `@Injectable()` with `NestInterceptor` interface
  - Request/response transformation
  - Logging and auditing interceptors
  - Caching interceptors with `map()` and `tap()` operators
  - Aspect-oriented programming patterns
- **Middleware**
  - Class-based middleware with `NestMiddleware`
  - Functional middleware
  - Middleware consumers and exclusion patterns
- **Exception Filters**
  - `@Catch()` decorator and `ExceptionFilter` interface
  - Built-in HTTP exceptions
  - Custom exception filters for structured error responses

### Week 7: TypeORM Database Integration

- **TypeORM Setup**
  - `@nestjs/typeorm` module configuration
  - `forRoot()` for database connection
  - Multiple database connections
- **Entities and Repositories**
  - Entity decorators: `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn()`
  - Relationships: `@OneToOne()`, `@OneToMany()`, `@ManyToOne()`, `@ManyToMany()`
  - Repository pattern with `@InjectRepository()`
  - Custom repositories
- **Migrations**
  - Generating migrations from entity changes
  - Running and reverting migrations
  - Seeding data

### Week 8: Advanced TypeORM and Query Optimization

- **Query Builder**
  - Select, join, where, and pagination queries
  - Subqueries and raw SQL
  - Performance monitoring with logging
- **Relations and Eager/Lazy Loading**
  - Relation loading strategies
  - Pagination with `skip` / `take`
  - Nested relation loading
- **Transactions and Events**
  - `QueryRunner` for manual transactions
  - Transaction decorators
  - Entity lifecycle subscribers (`@AfterInsert`, `@BeforeUpdate`, etc.)

### Week 9: WebSocket Gateways and Real-Time Features

- **WebSocket Fundamentals**
  - `@WebSocketGateway()` decorator
  - Gateway configuration (namespace, CORS, adapter)
  - `@SubscribeMessage()` event handlers
  - `@ConnectedSocket()` and `@MessageBody()` decorators
- **State Management**
  - Tracking connected clients with `Map` or `Set`
  - Room-based broadcasting
  - Authentication in gateways
- **Advanced Patterns**
  - WebSocket + HTTP hybrid applications
  - Exception filters for WebSockets
  - Pipes and guards in gateways

### Week 10: OpenAPI Documentation and Swagger

- **Swagger Setup**
  - `@nestjs/swagger` module configuration
  - `SwaggerModule.createDocument()` and `setup()`
  - Swagger UI customization (title, description, version)
- **Decorators for API Documentation**
  - `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`
  - `@ApiBearerAuth()`, `@ApiQuery()`, `@ApiParam()`
  - `@ApiBody()`, `@ApiProperty()` for DTO decorators
- **Advanced Swagger**
  - Dynamic model generation
  - Enum and union type documentation
  - Reusable components and schemas

### Week 11: Testing — Unit, Integration, and E2E

- **Unit Testing with Jest**
  - Testing services with `Test.createTestingModule()`
  - Mocking providers and repositories
  - Custom mock factories
- **Integration Testing**
  - Testing controllers with supertest
  - Database test containers (SQLite in-memory for TypeORM)
  - Authentication test helpers
- **E2E Testing**
  - `@nestjs/testing` E2E testing setup
  - Test lifecycle (`beforeAll`, `afterAll`)
  - Full request/response cycle testing
  - Coverage reporting

### Week 12: Deployment, Docker, and CI/CD

- **Production Build**
  - `nest build` and output optimization
  - Environment configuration with `@nestjs/config`
  - Process management with PM2
- **Containerization**
  - Multi-stage Dockerfile for NestJS
  - Docker Compose for service orchestration (app + database)
  - Health checks and graceful shutdown
- **CI/CD Pipeline**
  - GitHub Actions workflow for test + build + deploy
  - Environment variables and secrets management
  - Database migration pipeline in CI

## Final Project

Build a production-ready REST API for a **task management platform** with the following features:

- **User Management**: Registration, login, profile management with JWT authentication
- **Task CRUD**: Create, read, update, and delete tasks with tags and priority levels
- **Project Organization**: Group tasks into projects with team member assignments
- **Real-Time Notifications**: WebSocket-based live updates when tasks are assigned or modified
- **Role-Based Access Control**: Admin, project manager, and member roles with different permissions
- **API Documentation**: Full Swagger/OpenAPI documentation for all endpoints
- **Testing Suite**: Unit tests for services, integration tests for controllers, E2E tests for critical flows
- **Docker Deployment**: Containerized application with Docker Compose

Students must submit the complete source code, API documentation, test coverage report, and a deployment guide.

## Assessment Criteria

- **Weekly Assignments (30%)**: Hands-on coding exercises at the end of each week to reinforce concepts
- **Mid-Term Project (20%)**: A mini-project at Week 6 covering modules, controllers, services, guards, and basic TypeORM integration
- **Final Project (40%)**: Full-featured task management API meeting all specified requirements, with passing tests and documentation
- **Code Quality (10%)**: Adherence to NestJS conventions, proper error handling, TypeScript type safety, and meaningful test coverage

## References

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [TypeORM Documentation](https://typeorm.io/)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [JWT.io](https://jwt.io/)
- [Swagger / OpenAPI Specification](https://swagger.io/specification/)
- [Jest Testing Framework](https://jestjs.io/)
- [Docker Documentation](https://docs.docker.com/)

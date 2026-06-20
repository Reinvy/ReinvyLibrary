---
title: "Getting Started with NestJS"
description: "A comprehensive tutorial on building efficient server-side applications with NestJS, covering modules, controllers, providers, dependency injection, and database integration."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Getting Started with NestJS

## Summary

NestJS is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications. Built with TypeScript by default, it combines elements of Object-Oriented Programming (OOP), Functional Programming (FP), and Functional Reactive Programming (FRP). This tutorial will guide you through setting up a NestJS project, understanding its core architectural building blocks — modules, controllers, and providers — implementing dependency injection, adding request validation with pipes, securing endpoints with guards, and integrating a database using TypeORM.

## Target Audience

- Backend developers familiar with Node.js and TypeScript.
- Developers looking to build structured, maintainable server-side applications.
- Intermediate to advanced skill level expected.

## Prerequisites

- Node.js v18 or later installed.
- npm or yarn package manager.
- Basic understanding of TypeScript (interfaces, decorators, classes).
- Familiarity with REST API concepts (HTTP methods, routes, JSON).
- A code editor (VS Code recommended).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a new NestJS project using the CLI.
- Understand the role of modules, controllers, and providers in NestJS.
- Implement dependency injection to decouple application logic.
- Create RESTful API endpoints with full CRUD operations.
- Validate incoming request data using Pipes with class-validator.
- Protect routes using Guards for authentication and authorization.
- Integrate a PostgreSQL database using TypeORM.
- Apply NestJS best practices for modular and testable code.

## Context and Motivation

Building a production-ready Node.js server requires more than just wiring Express routes together. As applications grow, lack of structure leads to tangled code, difficult testing, and costly refactors. NestJS addresses this by enforcing a modular architecture inspired by Angular. It provides a built-in dependency injection system, decorator-based routing, and first-class support for TypeScript, making it an excellent choice for teams building enterprise-grade APIs, microservices, or GraphQL backends.

NestJS leverages Express under the hood (with Fastify as an optional alternative) but layers on top of it a rich set of abstractions that promote separation of concerns. Whether you are migrating from plain Express or starting fresh, NestJS helps you ship maintainable code from day one.

## Core Content

### Installing the NestJS CLI and Scaffolding a Project

The NestJS CLI is the fastest way to start a new project. Install it globally and generate a starter application:

```bash
npm install -g @nestjs/cli
nest new nestjs-blog-api
cd nestjs-blog-api
```

During scaffolding, choose `npm` as the package manager. The CLI generates a minimal project with a single `app.module` and a root `app.controller`.

### Project Structure Overview

A typical NestJS project follows a module-based directory layout:

```text
src/
├── app.module.ts          # Root module
├── app.controller.ts      # Root controller
├── app.service.ts         # Root service
└── main.ts                # Application entry point
```

Each feature should live in its own module directory. For this tutorial, we will build a blog API with `posts` and `users` modules.

### Modules

Modules are the fundamental building blocks in NestJS. Every application has at least one root module. Use `@Module()` to group related features:

```typescript
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
```

A module can import other modules, export providers for shared use, and declare controllers that belong to it.

### Controllers and Routing

Controllers handle incoming HTTP requests and return responses. Use decorators to define routes:

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findAll() {
    return this.postsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  async create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }
}
```

### Providers and Dependency Injection

Services, repositories, and helpers are registered as providers. NestJS uses constructor-based dependency injection:

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  private posts: any[] = [];

  async findAll() {
    return this.posts;
  }

  async findOne(id: string) {
    return this.posts.find(p => p.id === id);
  }

  async create(data: any) {
    const post = { id: Date.now().toString(), ...data };
    this.posts.push(post);
    return post;
  }
}
```

The `@Injectable()` decorator marks `PostsService` as a provider. NestJS's DI container resolves the dependency when `PostsController` is instantiated.

### DTOs and Validation with Pipes

Data Transfer Objects (DTOs) define the shape of incoming request bodies. Combine them with `class-validator` and `ValidationPipe` for automatic validation:

```bash
npm install class-validator class-transformer
```

```typescript
// posts/dto/create-post.dto.ts
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  content: string;
}
```

Enable `ValidationPipe` globally in `main.ts`:

```typescript
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(3000);
}
```

The `whitelist: true` option strips any properties not defined in the DTO, preventing mass-assignment vulnerabilities.

### Guards for Authentication

Guards determine whether a request should proceed based on conditions (authentication, roles, etc.):

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return request.headers['x-api-key'] === process.env.API_KEY;
  }
}
```

Apply guards to a controller or individual handler:

```typescript
@Controller('posts')
@UseGuards(ApiKeyGuard)
export class PostsController {}
```

### Database Integration with TypeORM

TypeORM is the most popular ORM for NestJS. Install the required packages:

```bash
npm install @nestjs/typeorm typeorm pg
```

Configure TypeORM in the root module:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'nestjs_blog',
      autoLoadEntities: true,
      synchronize: true, // disable in production
    }),
    PostsModule,
  ],
})
export class AppModule {}
```

Define entities:

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

Register the entity in the feature module:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
```

Update the service to use the repository pattern:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async findAll(): Promise<Post[]> {
    return this.postsRepository.find();
  }

  async findOne(id: string): Promise<Post> {
    return this.postsRepository.findOneBy({ id });
  }

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create(createPostDto);
    return this.postsRepository.save(post);
  }
}
```

## Code Examples

### Complete Module Wiring

Bring everything together by importing `PostsModule` into the root `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'nestjs_blog',
      autoLoadEntities: true,
      synchronize: true,
    }),
    PostsModule,
  ],
})
export class AppModule {}
```

### Running the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

Test the API:

```bash
# Create a post
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{"title":"Hello NestJS","content":"This is my first NestJS post with validation and guards!"}'

# Get all posts
curl http://localhost:3000/posts

# Get a single post
curl http://localhost:3000/posts/<uuid>
```

## Key Insights

- **Modular architecture is enforced by design**: NestJS modules are not optional. They prevent the "spaghetti code" problem that plagues large Express applications by providing clear boundaries between features.
- **Dependency injection simplifies testing**: Because providers are injected rather than instantiated, you can easily swap real implementations with mocks in unit tests using NestJS's testing utilities.
- **Validation and guards are declarative**: Pipes and Guards use decorators, keeping your controller methods clean and focused on business logic rather than boilerplate validation or auth checks.
- **TypeORM synchronize is a development-only tool**: In production, disable `synchronize: true` and use TypeORM migrations instead to avoid accidental data loss or schema drift.
- **Decorators reduce ceremony but hide complexity**: While `@Body()`, `@Param()`, and `@Query()` are convenient, understand the underlying request parsing to debug issues effectively.

## Next Steps

- Learn about NestJS middleware and custom decorators for cross-cutting concerns.
- Explore GraphQL integration with `@nestjs/graphql` and Apollo.
- Study microservices patterns using NestJS's built-in transport layer (TCP, Redis, RabbitMQ).
- Check the official NestJS documentation at https://docs.nestjs.com for advanced topics like interceptors, exception filters, and lifecycle events.

## Conclusion

NestJS provides a powerful and opinionated framework for building server-side applications with Node.js. By enforcing modular architecture, dependency injection, and decorator-based routing, it helps developers maintain clean, testable, and scalable codebases. This tutorial walked you through project setup, core building blocks (modules, controllers, providers), validation with pipes, authorization with guards, and database integration with TypeORM. With these foundations, you are ready to build production-ready APIs that follow industry best practices.

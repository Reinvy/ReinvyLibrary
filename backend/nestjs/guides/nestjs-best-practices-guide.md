---
title: "NestJS Best Practices Guide"
description: "A comprehensive guide to NestJS project structure, architecture patterns, testing strategies, and production deployment best practices for building scalable server-side applications."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# NestJS Best Practices Guide

## Introduction

NestJS is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications. It leverages TypeScript by default and combines elements of object-oriented programming, functional programming, and functional reactive programming under a modular architecture. While NestJS provides robust defaults, building production-grade applications requires deliberate decisions about project structure, module organization, dependency injection, error handling, testing, and deployment.

This guide covers the architectural patterns and best practices that help teams build maintainable, testable, and performant NestJS applications. It draws from real-world production experience and community conventions, offering concrete recommendations for every layer of a NestJS application — from project scaffolding and module design to database integration, authentication, testing, and deployment.

## Best Practices

### Project Structure Conventions

Organize your NestJS project using the **feature module** pattern, where each domain concern gets its own module with a self-contained directory. Avoid dumping all controllers, services, and providers into a flat `src/` directory.

```text
src/
├── common/              # Shared utilities, guards, interceptors, filters
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   └── filters/
├── config/              # Configuration modules and validation schemas
├── database/            # Database connection, migrations, seeds
│   ├── migrations/
│   └── seeds/
├── modules/             # Feature modules grouped by domain
│   ├── users/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.service.spec.ts
│   ├── auth/
│   ├── orders/
│   └── payments/
├── app.module.ts
└── main.ts
```

Keep each feature module focused and independently testable. A module should import only what it needs and export only what other modules require. Use `@Global()` sparingly — prefer explicit imports that make dependency graphs visible.

### Module Design Principles

**Single Responsibility per Module**: Each module should own one domain concept. A `UsersModule` handles user CRUD and user-related events; an `AuthModule` handles authentication and authorization. Avoid mixing concerns like putting password reset logic inside the users module — create a dedicated `PasswordModule` or keep it in `AuthModule`.

**Circular Dependency Avoidance**: Circular imports between modules are a common pitfall in NestJS. Use `forwardRef(() => Module)` only as a last resort. Prefer restructuring the module boundaries or introducing a shared common module that both modules can import. For bidirectional communication, consider using NestJS's built-in event system (`@nestjs/event-emitter`) or a message queue instead of direct service references.

**Dynamic Modules for Configurability**: When building reusable modules (e.g., a database module, a caching module), expose them as dynamic modules using the `forRoot()` / `forRootAsync()` pattern. This allows consumers to pass configuration asynchronously, which is essential when config depends on environment variables fetched at runtime.

```typescript
@Module({})
export class DatabaseModule {
  static forRootAsync(options: DatabaseAsyncOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        ConfigModule,
        {
          provide: 'DATABASE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      providers: [DatabaseService],
      exports: [DatabaseService],
    };
  }
}
```

### Dependency Injection Patterns

**Provider Scopes**: Understand NestJS's three provider scopes:
- **DEFAULT (singleton)**: One instance shared across the entire application. Best for stateless services, database connections, and configuration providers.
- **REQUEST**: A new instance per incoming request. Useful for request-scoped data like tenant context in multi-tenant apps. Be aware of the performance overhead — each request creates a new instance tree.
- **TRANSIENT**: A new instance per injection. Rarely needed; use when the provider must maintain isolated state for each consumer.

Use request-scoped providers sparingly and document them clearly, as they change the behavior of the entire injection chain.

**Custom Providers**: When you need more control over provider creation, use custom providers with `useFactory`, `useClass`, or `useExisting`. The `useFactory` pattern is especially useful for integrating third-party libraries that require async initialization:

```typescript
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const client = new Redis(configService.get('redis.url'));
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
})
export class CacheModule {}
```

### Guard, Interceptor, and Pipe Composition

**Guards** handle authentication and authorization. Keep them narrowly focused — one guard per concern. Compose them with `@UseGuards()` rather than building monolithic guards:

```typescript
@UseGuards(AuthGuard, RolesGuard, ThrottlerGuard)
```

**Interceptors** are ideal for cross-cutting concerns: logging, response transformation, caching, and timing. Layer interceptors by scope: global interceptors for infrastructure concerns (request logging, timing), controller-level interceptors for response shaping, and method-level interceptors for specific transformations.

**Pipes** handle validation and transformation at the boundary. Use `ValidationPipe` globally with `whitelist: true` and `forbidNonWhitelisted: true` to strip unexpected fields and reject malicious payloads early.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

**Exception Filters** centralize error handling. Create a single global exception filter that catches all `HttpException` instances and maps them to a consistent API response shape. Extend it to handle unexpected errors by catching the base `Exception` class:

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      message: exception instanceof HttpException
        ? exception.message
        : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Custom Decorator Design

Create custom decorators to reduce boilerplate and make controllers more expressive:

**Parameter Decorators** for extracting common request properties:

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Method Decorators** for metadata-driven routing or permission checks:

```typescript
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
```

Always pair custom decorators with a guard or interceptor that reads the metadata — the decorator itself should only store metadata, never execute logic.

### Database Integration with TypeORM

**Repository Pattern**: Use TypeORM's repository pattern with custom repository classes to encapsulate database queries. Inject repositories via `@InjectRepository()` rather than using the `EntityManager` directly in services.

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
}
```

**Migrations over Synchronize**: Set `synchronize: false` in production. Use TypeORM migrations to manage schema changes in a version-controlled, repeatable way. Generate migrations after entity changes:

```bash
npx typeorm migration:generate src/database/migrations/AddEmailVerificationColumn -d src/database/data-source.ts
```

**Query Optimization**: Use `select` to fetch only needed columns. Use `relations` or `QueryBuilder` with `leftJoinAndSelect` judiciously — eager loading too many relations causes the N+1 problem. Consider using `find` with `loadEagerRelations: false` and explicit relation loading for complex queries.

### Configuration Management

Use NestJS's built-in `@nestjs/config` package with a validated schema. Define a strongly-typed configuration class or interface and validate all environment variables at application startup:

```typescript
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  @IsOptional()
  DATABASE_PORT: number = 5432;

  @IsString()
  JWT_SECRET: string;
}
```

Load and validate in the root module:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => {
        const validated = plainToClass(EnvironmentVariables, config, {
          enableImplicitConversion: true,
        });
        const errors = validateSync(validated, { skipMissingProperties: false });
        if (errors.length > 0) {
          throw new Error(errors.toString());
        }
        return validated;
      },
    }),
  ],
})
```

Use environment-specific `.env` files (`.env.development`, `.env.production`) and load them conditionally based on `NODE_ENV`. Never commit `.env` files to version control — use `.env.example` as a template.

### Testing Strategy

Follow the **testing pyramid** for NestJS applications:

**Unit Tests**: Test services and providers in isolation. Use `Test.createTestingModule()` to set up a testing module with mocked dependencies. Focus on business logic — mock repositories, external API calls, and infrastructure providers.

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: MockType<Repository<User>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: createMock<Repository<User>>() },
      ],
    }).compile();
    service = module.get(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should create a user', async () => {
    repository.save.mockResolvedValue({ id: 1, email: 'test@test.com' });
    const result = await service.create({ email: 'test@test.com', password: 'hashed' });
    expect(result.email).toBe('test@test.com');
  });
});
```

**Integration Tests**: Test controllers with their dependencies. Use `superTest` with `@nestjs/testing` to make HTTP requests against the application instance. Use an in-memory database or test containers for database-dependent tests.

**E2E Tests**: Test the full application stack. Create a dedicated `test/` directory at the project root. Use database transactions that roll back after each test to maintain isolation.

```typescript
describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@test.com', password: 'Password123!' })
      .expect(201);
  });
});
```

### Logging and Monitoring

Replace the default NestJS logger with a structured logging solution like `pino` or `winston` for production. Structured logs output JSON, making them parseable by log aggregation tools (ELK, Datadog, Grafana Loki).

```typescript
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  await app.listen(3000);
}
```

Add request IDs (correlation IDs) using a middleware or interceptor so all logs for a single request can be correlated:

```typescript
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    request.correlationId = correlationId;
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        response.setHeader('x-correlation-id', correlationId);
      }),
    );
  }
}
```

### Error Handling Patterns

**Domain-Specific Exceptions**: Create custom exception classes that extend `HttpException` for domain-level errors. This keeps error handling expressive and allows the global exception filter to map them consistently.

```typescript
export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`, HttpStatus.NOT_FOUND);
  }
}
```

**Business Logic Errors**: Use NestJS's built-in `BadRequestException`, `UnauthorizedException`, and `ForbiddenException` for standard HTTP errors. Reserve `InternalServerErrorException` for truly unexpected conditions — never throw it for validation failures.

**Async Error Handling**: Wrap async controller methods in try-catch or rely on NestJS's global exception filter, which automatically catches unhandled promise rejections. Avoid empty catch blocks — always log or re-throw.

## Implementation Steps

### Step 1: Project Scaffolding

Initialize a new NestJS project with the CLI and set up the recommended directory structure:

```bash
nest new my-app --package-manager npm --strict
cd my-app
npm install @nestjs/config @nestjs/typeorm typeorm pg class-validator class-transformer
npm install -D @types/node typescript
```

Create the directory structure:

```bash
mkdir -p src/{common/{decorators,guards,interceptors,filters},config,database/{migrations,seeds},modules}
```

### Step 2: Configure Global Pipes, Filters, and Validation

Set up `main.ts` with the recommended global configuration:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

### Step 3: Implement a Feature Module

Create a feature module following the best practices outlined above. Start with the module definition:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

Implement the service with proper error handling and logging:

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return user;
  }
}
```

### Step 4: Set Up Database Migrations

Configure the data source and set up migration generation in `package.json`:

```json
{
  "scripts": {
    "migration:generate": "typeorm migration:generate -d src/database/data-source.ts",
    "migration:run": "typeorm migration:run -d src/database/data-source.ts",
    "migration:revert": "typeorm migration:revert -d src/database/data-source.ts"
  }
}
```

Create the data source configuration:

```typescript
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
```

### Step 5: Write and Run Tests

Set up Jest configuration for unit, integration, and E2E testing:

```typescript
// jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

Implement tests for each layer. Run the full test suite before every commit:

```bash
npm test           # Unit + integration tests
npm run test:e2e   # E2E tests
```

### Step 6: Prepare for Production Deployment

Configure the application for production with these essential steps:

1. **Build**: Use `nest build` which compiles TypeScript and generates the bundle in the `dist/` directory.
2. **Environment Variables**: Set all config via environment variables. Use a validated config schema.
3. **Dockerize**: Create a multi-stage `Dockerfile` for efficient image builds:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

1. **Health Checks**: Add a dedicated health check endpoint using `@nestjs/terminus`:

```bash
npm install @nestjs/terminus
```

1. **CI/CD Integration**: Set up GitHub Actions or GitLab CI to run linting, tests, and build on every push. Add a deployment job that runs migrations before starting the application.

## Key Insights

- **Feature modules** are the backbone of maintainable NestJS applications. Invest time in defining clear module boundaries up front — refactoring module boundaries later is significantly more expensive than refactoring code within a module.
- **Global pipes and filters** eliminate repetitive code. Configuring `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` at the application level prevents data corruption and security issues across all endpoints.
- **Migrations over synchronize**: Always disable `synchronize` in production and use version-controlled migrations. Schema auto-sync is convenient in development but catastrophic in production — it can drop columns or tables without warning.
- **Request-scoped providers are expensive**. Each request creates a new instance tree for request-scoped providers, including all their dependencies. Use them only when necessary (e.g., multi-tenant context) and document the performance trade-off.
- **Correlation IDs** transform debugging from guesswork into traceable request flows. Adding them early in the project lifecycle is trivial; retrofitting them after hundreds of endpoints exist is painful.
- **TypeORM repository pattern** is the recommended approach for data access. Direct `EntityManager` usage in services couples business logic to infrastructure concerns and makes testing more difficult.

## Next Steps

After implementing the patterns in this guide, deepen your NestJS knowledge with these topics:

- **GraphQL with NestJS**: Explore `@nestjs/graphql` with the code-first approach for building GraphQL APIs that integrate seamlessly with the module system.
- **Microservices with NestJS**: Learn about NestJS's built-in microservice transport layer (TCP, Redis, RabbitMQ, Kafka) and how to build event-driven architectures using the `@nestjs/microservices` package.
- **Caching Strategies**: Implement distributed caching with `@nestjs/cache-manager` and Redis to improve application response times for read-heavy workloads.
- **WebSocket Gateways**: Build real-time features using NestJS's WebSocket support with `@nestjs/websockets` and `@nestjs/platform-socket.io`.
- **Advanced Testing**: Explore snapshot testing, contract testing with Pact, and load testing with k6 for NestJS applications.

## Conclusion

Building production-grade NestJS applications requires more than understanding the framework's decorators and module system. This guide covered the architectural patterns, dependency injection strategies, testing approaches, and deployment practices that help teams build applications that are maintainable over time and performant under load.

The key takeaways are: organize code by feature modules, leverage NestJS's DI system with appropriate provider scopes, use global pipes and filters to enforce consistent validation and error handling, follow the testing pyramid with unit, integration, and E2E tests, and use TypeORM migrations for safe database schema management. Apply these practices from the start of your project to avoid costly refactoring later.

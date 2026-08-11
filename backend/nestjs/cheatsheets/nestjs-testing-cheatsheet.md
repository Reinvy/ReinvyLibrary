---
title: "NestJS Testing Cheatsheet"
description: "A quick reference for testing NestJS applications covering unit tests for services, controllers, guards, pipes, and interceptors, e2e testing with Supertest, mocking strategies, Jest configuration, and database testing patterns."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# NestJS Testing Cheatsheet

## Quick Reference Table

| Action | Command / Pattern | Description |
|--------|-------------------|-------------|
| Create a test module | `Test.createTestingModule({...})` | Bootstrap a module for unit or e2e tests |
| Unit test a service | `Test.createTestingModule({ providers: [UsersService] })` | Compile a module with only the provider under test |
| Mock a provider | `{ provide: UsersService, useValue: mock }` | Replace a real provider with a mock object |
| Override a provider | `module.overrideProvider(UsersService).useValue(mock)` | Swap a provider after the module is created |
| Mock a guard | `module.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })` | Bypass a guard in tests |
| Mock a pipe | `module.overridePipe(ValidationPipe).useValue({ transform: (v) => v })` | Replace a pipe with a passthrough |
| Mock an interceptor | `module.overrideInterceptor(LoggingInterceptor).useValue({ intercept: (ctx, next) => next.handle() })` | Disable an interceptor in tests |
| Get a provider instance | `module.get(UsersService)` | Retrieve a provider from the compiled module |
| Run unit tests | `npm test` | Execute the Jest suite once |
| Run tests in watch mode | `npm run test -- --watch` | Re-run tests on file changes |
| Run e2e tests | `npm run test:e2e` | Execute end-to-end tests in `test/` |
| Check coverage | `npm run test:cov` | Generate a coverage report |
| Send an HTTP request | `request(app.getHttpServer())` | Drive the app with Supertest in e2e tests |
| Initialize the app | `app.init()` | Initialize the app before e2e assertions |

## Common Commands

### Running the Test Suite

```bash
# Run all unit tests once
npm test

# Run tests in watch mode (default for `npm test` in Nest projects)
npm run test -- --watch

# Run a single test file
npx jest src/users/users.service.spec.ts

# Run tests matching a path pattern
npm test -- --testPathPattern="users"

# Stop on the first failing test
npm test -- --bail

# Generate a coverage report (HTML output in coverage/)
npm run test:cov

# Run end-to-end tests (uses test/jest-e2e.json)
npm run test:e2e
```

### Jest Configuration

```json
// package.json — default NestJS Jest configuration
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

### E2E Jest Configuration

```json
// test/jest-e2e.json — e2e specs live outside src/
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### Useful Jest CLI Flags

```bash
# Run only tests whose name matches
npx jest -t "creates a user"

# Update snapshots
npx jest -u

# Run with verbose output
npx jest --verbose

# Detect open handles (e.g., unclosed database connections)
npx jest --detectOpenHandles

# Force Jest to exit after the suite finishes
npx jest --forceExit
```

## Code Snippets

### Unit Testing a Service with a Mocked Repository

```typescript
// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = { id: 1, name: 'Alice', email: 'alice@example.com' };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue(mockUser),
    find: jest.fn().mockResolvedValue([mockUser]),
    findOne: jest.fn().mockResolvedValue(mockUser),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create a user', async () => {
    const dto = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
    };
    await expect(service.create(dto)).resolves.toEqual(mockUser);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should throw when a user is not found', async () => {
    mockRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne(999)).rejects.toThrow('not found');
  });
});
```

### Unit Testing a Controller with a Mocked Service

```typescript
// src/users/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
    create: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 2, ...dto })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should return all users', async () => {
    await expect(controller.findAll()).resolves.toEqual([{ id: 1, name: 'Alice' }]);
  });

  it('should create a user', async () => {
    const dto = { name: 'Bob', email: 'bob@example.com', password: 'secret123' };
    await expect(controller.create(dto)).resolves.toEqual({ id: 2, ...dto });
  });
});
```

### Testing a Custom Guard

```typescript
// src/auth/guards/roles.guard.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockContext = (user: any, roles?: string[]) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow a user with the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockContext({ user: { roles: ['admin'] } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny a user without the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockContext({ user: { roles: ['user'] } });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
```

### Testing a Custom Pipe

```typescript
// src/common/pipes/parse-id.pipe.spec.ts
import { BadRequestException } from '@nestjs/common';
import { ParseIdPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('should transform a valid numeric string', () => {
    expect(pipe.transform('42')).toBe(42);
  });

  it('should reject a non-numeric string', () => {
    expect(() => pipe.transform('abc')).toThrow(BadRequestException);
  });

  it('should reject zero and negative values', () => {
    expect(() => pipe.transform('0')).toThrow(BadRequestException);
    expect(() => pipe.transform('-3')).toThrow(BadRequestException);
  });
});
```

### Testing an Interceptor

```typescript
// src/common/interceptors/logging.interceptor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  it('should pass the response through', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/users' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;

    const next: CallHandler = { handle: () => of({ ok: true }) };
    const result = await lastValueFrom(interceptor.intercept(context, next));
    expect(result).toEqual({ ok: true });
  });
});
```

### E2E Testing with Supertest

```typescript
// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /users returns an array', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((res) => Array.isArray(res.body));
  });

  it('POST /users validates the payload', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ name: '' })
      .expect(400);
  });
});
```

### Database Testing with In-Memory SQLite

```typescript
// test/users.e2e-spec.ts — TypeORM against an in-memory SQLite database
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { UsersModule } from './../src/users/users.module';
import { User } from './../src/users/entities/user.entity';

describe('Users (e2e with SQLite)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a user and persists it', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' })
      .expect(201);

    const list = await request(app.getHttpServer()).get('/users').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });
});
```

### Custom Jest Matchers

```typescript
// test/custom-matchers.ts
import { expect } from '@jest/globals';

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () =>
        `expected ${received} to be within range ${floor}..${ceiling}`,
      pass,
    };
  },
});

// Add the type declaration in a .d.ts file (e.g. test/types.d.ts):
// declare global {
//   namespace jest {
//     interface Matchers<R> {
//       toBeWithinRange(floor: number, ceiling: number): R;
//     }
//   }
// }

// Usage in a spec:
// expect(service.calculateDiscount(100)).toBeWithinRange(5, 15);
```

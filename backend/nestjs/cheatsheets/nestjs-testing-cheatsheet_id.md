---
title: "Cheatsheet Pengujian NestJS"
description: "Referensi cepat untuk menguji aplikasi NestJS yang mencakup unit test untuk service, controller, guard, pipe, dan interceptor, e2e test dengan Supertest, strategi mocking, konfigurasi Jest, dan pola pengujian database."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Pengujian NestJS

## Tabel Referensi Cepat

| Aksi | Perintah / Pola | Deskripsi |
|------|-----------------|-----------|
| Membuat modul test | `Test.createTestingModule({...})` | Membuat modul untuk unit test atau e2e test |
| Unit test sebuah service | `Test.createTestingModule({ providers: [UsersService] })` | Menyusun modul hanya dengan provider yang diuji |
| Mock sebuah provider | `{ provide: UsersService, useValue: mock }` | Mengganti provider asli dengan objek mock |
| Menimpa sebuah provider | `module.overrideProvider(UsersService).useValue(mock)` | Menukar provider setelah modul dibuat |
| Mock sebuah guard | `module.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })` | Melewati guard di dalam test |
| Mock sebuah pipe | `module.overridePipe(ValidationPipe).useValue({ transform: (v) => v })` | Mengganti pipe dengan passthrough |
| Mock sebuah interceptor | `module.overrideInterceptor(LoggingInterceptor).useValue({ intercept: (ctx, next) => next.handle() })` | Menonaktifkan interceptor di dalam test |
| Mengambil instance provider | `module.get(UsersService)` | Mengambil provider dari modul yang sudah disusun |
| Menjalankan unit test | `npm test` | Menjalankan suite Jest satu kali |
| Menjalankan test watch mode | `npm run test -- --watch` | Menjalankan ulang test saat file berubah |
| Menjalankan e2e test | `npm run test:e2e` | Menjalankan end-to-end test di `test/` |
| Mengecek coverage | `npm run test:cov` | Membuat laporan coverage |
| Mengirim request HTTP | `request(app.getHttpServer())` | Menggerakkan aplikasi dengan Supertest pada e2e test |
| Menginisialisasi aplikasi | `app.init()` | Menginisialisasi aplikasi sebelum asersi e2e |

## Perintah Umum

### Menjalankan Suite Test

```bash
# Menjalankan semua unit test satu kali
npm test

# Menjalankan test dalam watch mode (default untuk `npm test` di proyek Nest)
npm run test -- --watch

# Menjalankan satu file test
npx jest src/users/users.service.spec.ts

# Menjalankan test yang cocok dengan pola path
npm test -- --testPathPattern="users"

# Berhenti pada test pertama yang gagal
npm test -- --bail

# Membuat laporan coverage (output HTML di coverage/)
npm run test:cov

# Menjalankan end-to-end test (memakai test/jest-e2e.json)
npm run test:e2e
```

### Konfigurasi Jest

```json
// package.json — konfigurasi Jest bawaan NestJS
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

### Konfigurasi Jest untuk E2E

```json
// test/jest-e2e.json — spec e2e berada di luar src/
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

### Flag CLI Jest yang Berguna

```bash
# Menjalankan hanya test yang namanya cocok
npx jest -t "membuat pengguna"

# Memperbarui snapshot
npx jest -u

# Menjalankan dengan output verbose
npx jest --verbose

# Mendeteksi open handles (mis. koneksi database yang tidak ditutup)
npx jest --detectOpenHandles

# Memaksa Jest keluar setelah suite selesai
npx jest --forceExit
```

## Potongan Kode

### Unit Test Service dengan Repository Mock

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

  it('harus membuat pengguna', async () => {
    const dto = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
    };
    await expect(service.create(dto)).resolves.toEqual(mockUser);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('harus melempar error saat pengguna tidak ditemukan', async () => {
    mockRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne(999)).rejects.toThrow('not found');
  });
});
```

### Unit Test Controller dengan Service Mock

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

  it('harus mengembalikan semua pengguna', async () => {
    await expect(controller.findAll()).resolves.toEqual([{ id: 1, name: 'Alice' }]);
  });

  it('harus membuat pengguna', async () => {
    const dto = { name: 'Bob', email: 'bob@example.com', password: 'secret123' };
    await expect(controller.create(dto)).resolves.toEqual({ id: 2, ...dto });
  });
});
```

### Menguji Custom Guard

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

  it('harus mengizinkan pengguna dengan role yang dibutuhkan', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockContext({ user: { roles: ['admin'] } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('harus menolak pengguna tanpa role yang dibutuhkan', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = mockContext({ user: { roles: ['user'] } });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
```

### Menguji Custom Pipe

```typescript
// src/common/pipes/parse-id.pipe.spec.ts
import { BadRequestException } from '@nestjs/common';
import { ParseIdPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('harus mengubah string numerik yang valid', () => {
    expect(pipe.transform('42')).toBe(42);
  });

  it('harus menolak string non-numerik', () => {
    expect(() => pipe.transform('abc')).toThrow(BadRequestException);
  });

  it('harus menolak nilai nol dan negatif', () => {
    expect(() => pipe.transform('0')).toThrow(BadRequestException);
    expect(() => pipe.transform('-3')).toThrow(BadRequestException);
  });
});
```

### Menguji Interceptor

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

  it('harus meneruskan respons apa adanya', async () => {
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

### E2E Test dengan Supertest

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

  it('GET /users mengembalikan array', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((res) => Array.isArray(res.body));
  });

  it('POST /users memvalidasi payload', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ name: '' })
      .expect(400);
  });
});
```

### Pengujian Database dengan SQLite In-Memory

```typescript
// test/users.e2e-spec.ts — TypeORM dengan database SQLite in-memory
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { UsersModule } from './../src/users/users.module';
import { User } from './../src/users/entities/user.entity';

describe('Users (e2e dengan SQLite)', () => {
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

  it('membuat pengguna dan menyimpannya', async () => {
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

### Custom Matcher Jest

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

// Tambahkan deklarasi tipe di file .d.ts (mis. test/types.d.ts):
// declare global {
//   namespace jest {
//     interface Matchers<R> {
//       toBeWithinRange(floor: number, ceiling: number): R;
//     }
//   }
// }

// Pemakaian di spec:
// expect(service.calculateDiscount(100)).toBeWithinRange(5, 15);
```

---
title: "Cheat Sheet NestJS"
description: "Panduan referensi cepat untuk NestJS mencakup perintah CLI, dekorator, modul, kontroler, penyedia, injeksi dependensi, pipe, guard, interceptor, middleware, integrasi TypeORM, pengujian, dan deployment."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet NestJS

## Tabel Referensi Cepat

| Aksi | Perintah / Pola | Deskripsi |
|------|----------------|-----------|
| Instal CLI | `npm i -g @nestjs/cli` | Instal NestJS CLI secara global |
| Buat proyek | `nest new nama-proyek` | Buat aplikasi NestJS baru |
| Generate modul | `nest g mo users` | Generate modul untuk fitur `users` |
| Generate kontroler | `nest g co users` | Generate kontroler untuk `users` |
| Generate service | `nest g s users` | Generate provider/service untuk `users` |
| Generate guard | `nest g gu auth` | Generate guard untuk autentikasi |
| Generate pipe | `nest g pi validasi` | Generate custom pipe untuk validasi |
| Generate interceptor | `nest g in logging` | Generate interceptor untuk logging |
| Generate filter | `nest g f http-error` | Generate exception filter |
| Generate middleware | `nest g mi logger` | Generate fungsi middleware |
| Generate resource | `nest g res produk` | Generate resource CRUD lengkap (REST) |
| Generate dekorator | `nest g d current-user` | Generate dekorator kustom |
| Jalankan dev server | `npm run start:dev` | Mulai dengan hot-reload (ts-node watch) |
| Build proyek | `npm run build` | Kompilasi TypeScript ke JavaScript |
| Jalankan tes | `npm test` | Jalankan suite tes Jest |
| Tes E2E | `npm run test:e2e` | Jalankan end-to-end test |
| Lint | `npm run lint` | Jalankan ESLint pada proyek |
| Format | `npm run format` | Jalankan Prettier formatter |

## Perintah Umum

### Setup Proyek dan Scaffolding

```bash
# Instal NestJS CLI
npm i -g @nestjs/cli

# Buat proyek baru dengan npm (atau yarn / pnpm)
nest new my-api --package-manager npm

# Buat proyek baru dengan strict TypeScript dan ESLint
nest new my-api --strict

# Tampilkan perintah dan opsi CLI yang tersedia
nest --help

# Tampilkan informasi versi
nest info
```

### Code Generation (Resource CRUD)

```bash
# Generate resource REST lengkap dengan module, controller, service, DTO, entities
nest g resource products
# ? What transport layer do you use? REST API
# ? Would you like to generate CRUD entry points? Yes

# File yang dihasilkan:
#   src/products/products.module.ts
#   src/products/products.controller.ts
#   src/products/products.service.ts
#   src/products/dto/create-product.dto.ts
#   src/products/dto/update-product.dto.ts
#   src/products/entities/product.entity.ts
#   src/products/products.module.ts (diperbarui)
```

### Menjalankan dan Build

```bash
# Mode development dengan file watching
npm run start:dev

# Mode debug dengan inspector
npm run start:debug

# Build produksi
npm run build

# Start produksi (setelah build)
node dist/main

# Jalankan dengan port kustom
PORT=3001 npm run start:dev
```

### Pengujian

```bash
# Jalankan unit test
npm run test

# Jalankan tes dengan coverage
npm run test:cov

# Jalankan tes dalam mode watch
npm run test -- --watch

# Jalankan end-to-end test
npm run test:e2e

# Jalankan file tes spesifik
npx jest src/users/users.service.spec.ts
```

## Potongan Kode

### Bootstrap Aplikasi

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefix global untuk semua route
  app.setGlobalPrefix('api/v1');

  // Global validation pipe dengan transform enabled
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Hapus properti yang tidak divalidasi
      forbidNonWhitelisted: true, // Lempar error jika ada properti tidak dikenal
      transform: true,          // Auto-transform payload ke instance DTO
    }),
  );

  // Aktifkan CORS
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Server berjalan di http://localhost:${port}`);
}
bootstrap();
```

### Struktur Modul

```typescript
// src/app.module.ts — Modul root
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
  ],
})
export class AppModule {}
```

```typescript
// src/users/users.module.ts — Modul fitur
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Tersedia untuk modul lain
})
export class UsersModule {}
```

### Pola Kontroler

```typescript
// src/users/users.controller.ts
import {
  Controller, Get, Post, Body, Param, Put, Delete,
  ParseIntPipe, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
```

### Pola Service (Provider)

```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(dto);
    const saved = await this.userRepository.save(user);
    this.logger.log(`User ID ${saved.id} berhasil dibuat`);
    return saved;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }
  }
}
```

### DTO dan Validasi

```typescript
// src/users/dto/create-user.dto.ts
import {
  IsString, IsEmail, IsOptional, IsInt, MinLength, MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsInt()
  age?: number;
}
```

```typescript
// src/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### Guard Autentikasi

```typescript
// src/auth/guards/jwt-auth.guard.ts
import {
  Injectable, ExecutionContext, UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any): any {
    if (err || !user) {
      throw err || new UnauthorizedException('Token tidak valid atau kedaluwarsa');
    }
    return user;
  }
}
```

```typescript
// src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

### Custom Pipe

```typescript
// src/common/pipes/parse-id.pipe.ts
import {
  PipeTransform, Injectable, BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = parseInt(value, 10);
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException(`ID tidak valid: "${value}". Harus berupa angka positif.`);
    }
    return id;
  }
}
```

### Interceptor (Logging / Timing)

```typescript
// src/common/interceptors/logging.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        this.logger.log(`${method} ${url} → ${statusCode} (${Date.now() - now}ms)`);
      }),
    );
  }
}
```

### Exception Filter

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();

    this.logger.warn(
      `${request.method} ${request.url} → ${status}: ${JSON.stringify(errorResponse)}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: errorResponse,
    });
  }
}
```

### Entity TypeORM

```typescript
// src/users/entities/user.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  age?: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Konfigurasi Modul Database

```typescript
// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'nestjs'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('DB_SYNC', false),
        logging: config.get<boolean>('DB_LOGGING', false),
      }),
    }),
  ],
})
export class DatabaseModule {}
```

### Middleware

```typescript
// src/common/middleware/logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      this.logger.log(`${method} ${originalUrl} → ${statusCode} (${duration}ms)`);
    });

    next();
  }
}
```

```typescript
// Terapkan middleware di modul
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({ /* ... */ })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // Terapkan ke semua route
  }
}
```

### Unit Test

```typescript
// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUser = {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed-password',
    isActive: true,
  };

  const mockRepository = {
    create: jest.fn().mockReturnValue(mockUser),
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
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('harus mengembalikan semua user', async () => {
    const users = await service.findAll();
    expect(users).toEqual([mockUser]);
    expect(repository.find).toHaveBeenCalled();
  });

  it('harus mencari user berdasarkan ID', async () => {
    const user = await service.findOne(1);
    expect(user).toEqual(mockUser);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('harus melempar error jika user tidak ditemukan', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('harus menghapus user', async () => {
    await service.remove(1);
    expect(repository.delete).toHaveBeenCalledWith(1);
  });

  it('harus melempar error jika menghapus user yang tidak ada', async () => {
    jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 0 });
    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });
});
```

### Konfigurasi Environment

```typescript
// .env (contoh)
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nestjs
JWT_SECRET=my-super-secret-key
JWT_EXPIRES_IN=15m
```

```typescript
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
});
```

### Setup Swagger / OpenAPI

```typescript
// src/main.ts (tambahkan sebelum app.listen)
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('API RESTful dibangun dengan NestJS')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### WebSocket Gateway

```typescript
// src/events/events.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    console.log(`Klien terhubung: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Klien terputus: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): void {
    this.server.emit('message', {
      clientId: client.id,
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }
}
```

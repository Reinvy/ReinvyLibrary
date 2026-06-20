---
title: "NestJS Cheatsheet"
description: "A quick reference guide for NestJS covering CLI commands, decorators, modules, controllers, providers, dependency injection, pipes, guards, interceptors, middleware, TypeORM integration, testing, and deployment."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# NestJS Cheatsheet

## Quick Reference Table

| Action | Command / Pattern | Description |
|--------|------------------|-------------|
| Install CLI | `npm i -g @nestjs/cli` | Install the NestJS CLI globally |
| Create project | `nest new project-name` | Scaffold a new NestJS application |
| Generate module | `nest g mo users` | Generate a module for the `users` feature |
| Generate controller | `nest g co users` | Generate a controller for `users` |
| Generate service | `nest g s users` | Generate a provider/service for `users` |
| Generate guard | `nest g gu auth` | Generate a guard for authentication |
| Generate pipe | `nest g pi validation` | Generate a custom pipe for validation |
| Generate interceptor | `nest g in logging` | Generate an interceptor for logging |
| Generate filter | `nest g f http-error` | Generate an exception filter |
| Generate middleware | `nest g mi logger` | Generate a middleware function |
| Generate resource | `nest g resource users` | Generate a full CRUD resource (REST) |
| Generate decorator | `nest g d current-user` | Generate a custom decorator |
| Run dev server | `npm run start:dev` | Start with hot-reload (ts-node watch) |
| Build project | `npm run build` | Compile TypeScript to JavaScript |
| Run tests | `npm test` | Run Jest test suite |
| E2E tests | `npm run test:e2e` | Run end-to-end tests |
| Lint | `npm run lint` | Run ESLint on the project |
| Format | `npm run format` | Run Prettier formatter |

## Common Commands

### Project Setup and Scaffolding

```bash
# Install the NestJS CLI
npm i -g @nestjs/cli

# Create a new project with npm (or yarn / pnpm)
nest new my-api --package-manager npm

# Create a new project with strict TypeScript and ESLint
nest new my-api --strict

# Display available NestJS CLI commands and options
nest --help

# Display version information
nest info
```

### Code Generation (CRUD Resource)

```bash
# Generate a full REST resource with module, controller, service, DTOs, entities
nest g resource products
# ? What transport layer do you use? REST API
# ? Would you like to generate CRUD entry points? Yes

# Generated files:
#   src/products/products.module.ts
#   src/products/products.controller.ts
#   src/products/products.service.ts
#   src/products/dto/create-product.dto.ts
#   src/products/dto/update-product.dto.ts
#   src/products/entities/product.entity.ts
#   src/products/products.module.ts (updated)
```

### Running and Building

```bash
# Development mode with file watching
npm run start:dev

# Debug mode with inspector
npm run start:debug

# Production build
npm run build

# Production start (after build)
node dist/main

# Run with custom port
PORT=3001 npm run start:dev
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test -- --watch

# Run end-to-end tests
npm run test:e2e

# Run specific test file
npx jest src/users/users.service.spec.ts
```

## Code Snippets

### Application Bootstrap

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Global validation pipe with transform enabled
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip unvalidated properties
      forbidNonWhitelisted: true, // Throw on unexpected properties
      transform: true,          // Auto-transform payloads to DTO instances
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}`);
}
bootstrap();
```

### Module Structure

```typescript
// src/app.module.ts — Root module
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
// src/users/users.module.ts — Feature module
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Make available to other modules
})
export class UsersModule {}
```

### Controller Patterns

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

### Service (Provider) Patterns

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
    this.logger.log(`Created user ID ${saved.id}`);
    return saved;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
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
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
```

### DTOs and Validation

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

### Authentication Guard

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
      throw err || new UnauthorizedException('Invalid or expired token');
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
      throw new BadRequestException(`Invalid ID: "${value}". Must be a positive integer.`);
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

### TypeORM Entity

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

### Database Module Configuration

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
// Apply middleware in the module
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({ /* ... */ })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // Apply to all routes
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

  it('should find all users', async () => {
    const users = await service.findAll();
    expect(users).toEqual([mockUser]);
    expect(repository.find).toHaveBeenCalled();
  });

  it('should find a user by ID', async () => {
    const user = await service.findOne(1);
    expect(user).toEqual(mockUser);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should throw when user not found', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('should remove a user', async () => {
    await service.remove(1);
    expect(repository.delete).toHaveBeenCalledWith(1);
  });

  it('should throw when removing nonexistent user', async () => {
    jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 0 });
    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });
});
```

### Environment Configuration

```typescript
// .env (example)
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

### Swagger / OpenAPI Setup

```typescript
// src/main.ts (add before app.listen)
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('RESTful API built with NestJS')
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
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
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

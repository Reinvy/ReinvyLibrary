---
title: "Cheatsheet Validasi dan Serialisasi NestJS"
description: "Referensi cepat untuk memvalidasi request dan membentuk response di NestJS, mencakup konfigurasi ValidationPipe, validator yang dapat dipakai ulang dan validator kustom, validator asinkron dengan dependency injection, payload bersarang, grup validasi, serta serialisasi class-transformer."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Validasi dan Serialisasi NestJS

## Tabel Referensi Cepat

| Aksi | Perintah / Pola | Deskripsi |
|------|-----------------|-----------|
| Pasang dependensi validasi | `npm install class-validator class-transformer` | Dua paket yang dibutuhkan setiap pipe dan serializer |
| Pasang mapped types | `npm install @nestjs/mapped-types` | Menyediakan `PartialType`, `PickType`, `OmitType`, dan `IntersectionType` |
| Aktifkan pipe global | `app.useGlobalPipes(new ValidationPipe({ whitelist: true }))` | Validasi setiap route dari `main.ts` |
| Pilih provider modular | Factory `APP_PIPE` di dalam module | Perilaku sama tetapi bisa diinjeksi dan mudah diuji |
| Buang properti tak dikenal | `whitelist: true` | Membuang properti yang tidak punya decorator |
| Tolak properti tak dikenal | `forbidNonWhitelisted: true` | Mengembalikan error, bukan membuang diam-diam |
| Ubah ke instance class | `transform: true` | Pipe mengembalikan instance DTO, bukan objek polos |
| Koersi payload string | `transformOptions: { enableImplicitConversion: true }` | Mengubah query string menjadi angka dan boolean |
| Ambil error pertama saja | `stopAtFirstError: true` | Berhenti pada error pertama per properti |
| Ubah bentuk body error | `exceptionFactory: (errors) => new BadRequestException(...)` | Mengganti array pesan bawaan |
| Validasi objek bersarang | `@ValidateNested()` plus `@Type(() => ChildDto)` | Kedua decorator wajib dipakai bersama |
| Validasi array objek | `@ValidateNested({ each: true })` | Memvalidasi setiap elemen array |
| Validasi bersyarat | `@ValidateIf((o) => o.type === 'card')` | Melewati aturan bila predikat tidak terpenuhi |
| Perbandingan antar field | Constraint kustom yang membaca `args.object` | Aturan antar field ada di validator, bukan di pipe |
| Aturan khusus grup | `@IsNotEmpty({ groups: ['create'] })` | Menandai aturan lalu mengatur `groups` pada pipe |
| Pakai ulang aturan create | `export class UpdateDto extends PartialType(CreateDto) {}` | Semua properti menjadi opsional |
| Buat validator kustom | `@ValidatorConstraint({ name, async })` | Constraint berbasis class dengan `validate()` dan `defaultMessage()` |
| Injeksi service ke validator | `useContainer(app.select(AppModule), { fallbackOnErrors: true })` | Memungkinkan constraint memakai repository |
| Serialisasi response | `@UseInterceptors(ClassSerializerInterceptor)` | Menjalankan `instanceToPlain` pada entity yang dikembalikan |
| Sembunyikan properti | `@Exclude()` | Dihilangkan dari hasil serialisasi |
| Sembunyikan hanya di response | `@Exclude({ toPlainOnly: true })` | Tetap ada saat dikonversi menjadi class |
| Batasi field terserialisasi | `@SerializeOptions({ excludeExtraneousValues: true })` | Hanya mengeluarkan properti bertanda `@Expose()` |
| Ubah nilai sebelum validasi | `@Transform(({ value }) => value.trim())` | Menormalkan input di dalam DTO |
| Serialisasi manual | `instanceToPlain(entity, { groups: ['public'] })` | Dipakai di dalam service atau interceptor kustom |

## Perintah Umum

### Memasang dan Membuat Kode Validasi

```bash
# Dependensi runtime validasi dan transformasi
npm install class-validator class-transformer

# Mapped types menjadi dasar PartialType, OmitType, PickType, dan IntersectionType
npm install @nestjs/mapped-types

# Membuat DTO dan pipe dengan CLI
nest g class users/dto/create-user.dto --flat --no-spec
nest g pipe common/pipes/trim-strings --flat
```

### Memeriksa dan Menguji Aturan Validasi

```bash
# Menjalankan hanya unit test untuk DTO
npm test -- dto

# Menjalankan satu file spec validasi
npx jest src/users/dto/create-user.dto.spec.ts

# Memeriksa tipe lapisan DTO tanpa menghasilkan output
npx tsc --noEmit
```

### Memeriksa Perilaku Runtime

```bash
# Kirim payload dengan properti tak dikenal dan pastikan pipe ketat menolaknya
curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"s3cret-value","isAdmin":true}'

# Kirim payload dengan nilai tidak valid untuk melihat bentuk error
curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"A","email":"not-an-email","password":"short"}'
```

## Potongan Kode

### ValidationPipe Global dari File Bootstrap

```typescript
// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true,
      validationError: { target: false, value: false },
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

### Mendaftarkan Pipe sebagai Provider yang Dapat Diinjeksi

```typescript
// src/app.module.ts
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
```

### Membentuk Ulang Error Validasi Menjadi Peta Field

```typescript
// src/common/pipes/validation.pipe.ts
import {
  BadRequestException,
  Injectable,
  ValidationPipe,
  ValidationError,
} from '@nestjs/common';

function flatten(
  errors: ValidationError[],
  parent = '',
): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((acc, error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});
    if (messages.length > 0) {
      acc[path] = messages;
    }
    if (error.children?.length) {
      Object.assign(acc, flatten(error.children, path));
    }
    return acc;
  }, {});
}

@Injectable()
export class ApiValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          type: 'https://example.com/problems/validation-error',
          title: 'Request validation failed',
          status: 400,
          errors: flatten(errors),
        }),
    });
  }
}
```

### Decorator Field yang Dapat Dipakai Ulang

```typescript
// src/common/decorators/validation.decorators.ts
import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export function TrimmedString(min: number, max: number) {
  return applyDecorators(
    IsString(),
    Length(min, max),
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
  );
}

export function EmailAddress() {
  return applyDecorators(
    IsEmail({ allow_display_name: false }),
    Transform(({ value }) =>
      typeof value === 'string' ? value.toLowerCase().trim() : value,
    ),
  );
}

export function StrongPassword() {
  return applyDecorators(
    IsString(),
    Length(12, 128),
    Matches(/[a-z]/, { message: 'password must contain a lowercase letter' }),
    Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' }),
    Matches(/[0-9]/, { message: 'password must contain a digit' }),
  );
}
```

### DTO yang Memakai Decorator Tersebut

```typescript
// src/users/dto/create-user.dto.ts
import { Exclude, Expose } from 'class-transformer';
import {
  EmailAddress,
  StrongPassword,
  TrimmedString,
} from '../../common/decorators/validation.decorators';
import { IsOptional, IsUrl } from 'class-validator';

@Exclude()
export class CreateUserDto {
  @Expose()
  @TrimmedString(2, 80)
  name: string;

  @Expose()
  @EmailAddress()
  email: string;

  @Expose()
  @StrongPassword()
  password: string;

  @Expose()
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;
}
```

### Constraint Sinkron Kustom

```typescript
// src/common/validators/is-safe-slug.validator.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const RESERVED = new Set(['admin', 'api', 'login', 'settings']);

@ValidatorConstraint({ name: 'isSafeSlug', async: false })
export class IsSafeSlugConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return false;
    return !RESERVED.has(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a lowercase slug and cannot use a reserved word`;
  }
}

export function IsSafeSlug(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsSafeSlugConstraint,
    });
  };
}
```

### Constraint Asinkron Berbasis Repository

```typescript
// src/users/validators/is-unique-email.validator.ts
import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { UsersRepository } from '../users.repository';

@Injectable()
@ValidatorConstraint({ name: 'isUniqueEmail', async: true })
export class IsUniqueEmailConstraint
  implements ValidatorConstraintInterface
{
  constructor(private readonly users: UsersRepository) {}

  async validate(value: string, args: ValidationArguments): Promise<boolean> {
    if (typeof value !== 'string') return false;
    const ignoreId = (args.object as { id?: string }).id;
    return !(await this.users.existsByEmail(value, ignoreId));
  }

  defaultMessage(): string {
    return 'email is already registered';
  }
}
```

### Menyambungkan Dependency Injection ke Validator

```typescript
// src/main.ts
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Memungkinkan class @ValidatorConstraint menginjeksi provider dari container Nest
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(3000);
}
bootstrap();
```

### Objek Bersarang dan Array Objek

```typescript
// src/orders/dto/create-order.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderLineDto {
  @IsString()
  sku: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  lines: OrderLineDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  addOns?: OrderLineDto[];
}
```

### Aturan Bersyarat dan Antar Field

```typescript
// src/payments/dto/create-payment.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

enum PaymentMethod {
  Card = 'card',
  BankTransfer = 'bank_transfer',
}

export class CreatePaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ValidateIf((o: CreatePaymentDto) => o.method === PaymentMethod.Card)
  @IsString()
  @Length(13, 19)
  cardNumber?: string;

  @ValidateIf((o: CreatePaymentDto) => o.method === PaymentMethod.Card)
  @IsString()
  @Length(3, 4)
  cardCvc?: string;

  @IsOptional()
  @ValidateIf((o: CreatePaymentDto) => o.method === PaymentMethod.BankTransfer)
  @IsString()
  @Length(8, 34)
  iban?: string;
}
```

### Kesamaan Antar Field dengan Constraint

```typescript
// src/users/dto/change-password.dto.ts
import {
  IsString,
  Length,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'matchesProperty', async: false })
export class MatchesPropertyConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    const [related] = args.constraints as [string];
    return value === (args.object as Record<string, unknown>)[related];
  }

  defaultMessage(args: ValidationArguments): string {
    const [related] = args.constraints as [string];
    return `${args.property} must match ${related}`;
  }
}

export function MatchesProperty(property: string) {
  return Validate(MatchesPropertyConstraint, [property]);
}

export class ChangePasswordDto {
  @IsString()
  @Length(12, 128)
  password: string;

  @IsString()
  @MatchesProperty('password')
  passwordConfirmation: string;
}
```

### DTO Update dari Mapped Types

```typescript
// src/users/dto/update-user.dto.ts
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Semua field opsional, tetapi email dan password tetap tidak berubah lewat DTO ini
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {}
```

### Grup Validasi untuk Create dan Update

```typescript
// src/articles/dto/save-article.dto.ts
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveArticleDto {
  @IsString()
  @MaxLength(160)
  @IsNotEmpty({ groups: ['create'] })
  title: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ groups: ['create', 'update'] })
  body?: string;
}
```

```typescript
// src/articles/articles.controller.ts
import { Body, Controller, Patch, Post } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { SaveArticleDto } from './dto/save-article.dto';

@Controller('articles')
export class ArticlesController {
  @Post()
  create(
    @Body(new ValidationPipe({ groups: ['create'], whitelist: true }))
    dto: SaveArticleDto,
  ) {
    return dto;
  }

  @Patch()
  update(
    @Body(new ValidationPipe({ groups: ['update'], whitelist: true }))
    dto: SaveArticleDto,
  ) {
    return dto;
  }
}
```

### Serialisasi Response dengan ClassSerializerInterceptor

```typescript
// src/users/entities/user.entity.ts
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class UserEntity {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  // Tidak pernah keluar dari proses, termasuk pada serialisasi bersarang
  @Exclude({ toPlainOnly: true })
  passwordHash: string;

  @Expose()
  @Transform(({ value }) => Boolean(value))
  isActive: boolean;

  @Expose({ groups: ['admin'] })
  internalNotes?: string;
}
```

```typescript
// src/users/users.controller.ts
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true, groups: ['public'] })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async findAll(): Promise<UserEntity[]> {
    return this.users.findAll();
  }
}
```

### Serialisasi Manual di Dalam Service

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  toPublicJson(entity: UserEntity): Record<string, unknown> {
    return instanceToPlain(entity, {
      excludeExtraneousValues: true,
      groups: ['public'],
    });
  }

  fromDatabaseRow(row: Record<string, unknown>): UserEntity {
    return plainToInstance(UserEntity, row, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }
}
```

### Memvalidasi Query Parameter

```typescript
// src/users/dto/list-users.query.ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListUsersQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cursor?: number;

  @IsOptional()
  @IsIn(['name', 'createdAt'])
  sort?: 'name' | 'createdAt' = 'createdAt';
}
```

### Menguji DTO Tanpa HTTP

```typescript
// src/users/dto/create-user.dto.spec.ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  const build = (payload: Record<string, unknown>) =>
    plainToInstance(CreateUserDto, payload);

  it('accepts a valid payload after transformations', async () => {
    const dto = build({
      name: '  Ada Lovelace  ',
      email: 'ADA@Example.COM',
      password: 'CorrectHorse1',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Ada Lovelace');
    expect(dto.email).toBe('ada@example.com');
  });

  it('rejects unknown properties when whitelist is strict', async () => {
    const dto = build({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'CorrectHorse1',
      role: 'admin',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((e) => e.property)).toContain('role');
  });
});
```

---
title: "NestJS Validation and Serialization Cheatsheet"
description: "A quick reference for validating requests and shaping responses in NestJS covering ValidationPipe configuration, reusable and custom validators, async validators with dependency injection, nested payloads, validation groups, and class-transformer serialization."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# NestJS Validation and Serialization Cheatsheet

## Quick Reference Table

| Action | Command / Pattern | Description |
|--------|-------------------|-------------|
| Install the validation stack | `npm install class-validator class-transformer` | The two packages every pipe and serializer depends on |
| Install mapped types | `npm install @nestjs/mapped-types` | Provides `PartialType`, `PickType`, `OmitType`, and `IntersectionType` |
| Enable a global pipe | `app.useGlobalPipes(new ValidationPipe({ whitelist: true }))` | Validate every route from `main.ts` |
| Prefer a scoped provider | `APP_PIPE` factory in a module | Same behavior but injectable and easier to test |
| Strip unknown keys | `whitelist: true` | Drop properties that have no decorator |
| Reject unknown keys | `forbidNonWhitelisted: true` | Return an error instead of silently stripping |
| Convert to class instances | `transform: true` | Pipe returns a DTO instance, not a plain object |
| Coerce string payloads | `transformOptions: { enableImplicitConversion: true }` | Turn query strings into numbers and booleans |
| Keep only the first error | `stopAtFirstError: true` | Fail fast per property |
| Reshape the error body | `exceptionFactory: (errors) => new BadRequestException(...)` | Replace the default message array |
| Validate nested objects | `@ValidateNested()` plus `@Type(() => ChildDto)` | Both decorators are required together |
| Validate arrays of objects | `@ValidateNested({ each: true })` | Validate every element of the array |
| Conditional validation | `@ValidateIf((o) => o.type === 'card')` | Skip a rule unless the predicate holds |
| Cross-field comparison | A custom constraint reading `args.object` | Field-to-field rules live in validators, not pipes |
| Group-specific rules | `@IsNotEmpty({ groups: ['create'] })` | Tag rules and set `groups` on the pipe |
| Reuse create rules for update | `export class UpdateDto extends PartialType(CreateDto) {}` | Every property becomes optional |
| Build a custom validator | `@ValidatorConstraint({ name, async })` | Class-based constraint with `validate()` and `defaultMessage()` |
| Inject services into validators | `useContainer(app.select(AppModule), { fallbackOnErrors: true })` | Lets a constraint use repositories |
| Serialize responses | `@UseInterceptors(ClassSerializerInterceptor)` | Runs `instanceToPlain` on returned entities |
| Hide a property | `@Exclude()` | Removed from serialized output |
| Hide only in responses | `@Exclude({ toPlainOnly: true })` | Stays present when converting to a class |
| Allowlist serialized fields | `@SerializeOptions({ excludeExtraneousValues: true })` | Emit only properties marked with `@Expose()` |
| Convert a value before validation | `@Transform(({ value }) => value.trim())` | Normalize input inside the DTO |
| Serialize manually | `instanceToPlain(entity, { groups: ['public'] })` | Use inside a service or a custom interceptor |

## Common Commands

### Installing and Generating Validation Code

```bash
# Validation and transformation runtime dependencies
npm install class-validator class-transformer

# Mapped types power PartialType, OmitType, PickType, and IntersectionType
npm install @nestjs/mapped-types

# Generate a DTO and a pipe with the CLI
nest g class users/dto/create-user.dto --flat --no-spec
nest g pipe common/pipes/trim-strings --flat
```

### Inspecting and Testing Validation Rules

```bash
# Run only the DTO validation unit tests
npm test -- dto

# Run a single validation spec file
npx jest src/users/dto/create-user.dto.spec.ts

# Type-check the DTO layer without emitting output
npx tsc --noEmit
```

### Checking Runtime Behavior

```bash
# Send a payload with an unknown property and confirm the strict pipe rejects it
curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"s3cret-value","isAdmin":true}'

# Send a payload with an invalid value to inspect the error shape
curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"A","email":"not-an-email","password":"short"}'
```

## Code Snippets

### Global ValidationPipe from the Bootstrap File

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

### Registering the Pipe as an Injectable Provider

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

### Reshaping Validation Errors into a Field Map

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

### Reusable Field Decorators

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

### A DTO That Uses the Reusable Decorators

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

### Custom Synchronous Constraint

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

### Async Constraint Backed by a Repository

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

### Wiring Dependency Injection into Validators

```typescript
// src/main.ts
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Lets @ValidatorConstraint classes inject providers from the Nest container
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(3000);
}
bootstrap();
```

### Nested Objects and Arrays of Objects

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

### Conditional and Cross-Field Rules

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

### Cross-Field Equality with a Constraint

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

### Update DTOs from Mapped Types

```typescript
// src/users/dto/update-user.dto.ts
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Every field optional, but email and password stay immutable through this DTO
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {}
```

### Validation Groups for Create and Update

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

### Response Serialization with ClassSerializerInterceptor

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

  // Never leaves the process, not even in a nested serialization pass
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

### Manual Serialization Inside a Service

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

### Validating Query Parameters

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

### Testing a DTO Without HTTP

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

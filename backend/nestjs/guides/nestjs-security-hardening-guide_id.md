---
title: "Panduan Penguatan Keamanan NestJS"
description: "Panduan komprehensif untuk memperkuat aplikasi NestJS terhadap kerentanan web — mencakup autentikasi, otorisasi, validasi input, rate limiting, Helmet, CORS, CSRF, pencegahan injeksi, konfigurasi aman, dan audit dependensi."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Penguatan Keamanan NestJS

## Pendahuluan

NestJS memberi Anda fondasi yang kokoh untuk membangun aplikasi server-side, namun default yang nyaman dari framework tersebut bukanlah batas keamanan. API produksi terpapar ke internet dan harus diperlakukan sebagai permukaan serangan: enumerasi endpoint, upaya brute-force login, injeksi melalui input pengguna, cross-site request forgery terhadap sesi terautentikasi, dan dependensi yang dikompromikan adalah ancaman yang realistis. Panduan ini menguraikan cara memperkuat aplikasi NestJS lapis demi lapis sehingga Anda dapat men-deploy dengan percaya diri.

Model keamanan yang dijelaskan di sini mengikuti prinsip defense-in-depth: model ini menggabungkan proteksi tingkat framework (guard, pipe, interceptor) dengan mitigasi HTTP dan OWASP yang mapan (header Helmet, kebijakan CORS, proteksi CSRF, rate limiting) serta kebersihan saat build (validasi konfigurasi, audit dependensi, pengelolaan secret). Tidak ada satu lapisan pun yang opsional dengan sendirinya — bersama-sama lapisan-lapisan ini menaikkan biaya serangan secara signifikan.

Ini adalah panduan tingkat lanjut. Panduan ini mengasumsikan Anda sudah memahami modul NestJS, dependency injection, guard, pipe, dan cara membangun aplikasi berbasis modul. Tujuannya bukan untuk mengajarkan NestJS dari nol, melainkan untuk menunjukkan cara mengunci aplikasi yang sudah ada.

## Praktik Terbaik

### 1. Manajemen Konfigurasi yang Aman

Jangan pernah meng-hardcode secret dalam kode sumber. Baca setiap secret dari environment dan validasi seluruh konfigurasi saat startup sehingga deployment yang salah konfigurasi gagal lebih cepat daripada mengirimkan kerentanan yang terbuka.

Gunakan `@nestjs/config` dengan skema validasi yang dibangun di atas `class-validator`, atau validator skema `Joi`, untuk menggagalkan startup ketika variabel yang diperlukan hilang atau salah format.

```typescript
// config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsString, IsInt, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```

Daftarkan fungsi validasi saat mengimpor `ConfigModule`:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
  ],
})
export class AppModule {}
```

Rotasi secret secara rutin, gunakan manajer secret khusus (AWS Secrets Manager, Vault, atau sejenisnya yang cloud-native) di produksi, dan jangan pernah meng-commit file `.env` — tambahkan ke `.gitignore`.

### 2. Validasi dan Sanitasi Input yang Ketat

Setiap nilai yang melintasi batas jaringan tidak dapat dipercaya. Validasi DTO dengan `class-validator` dan tegakkan secara global dengan `ValidationPipe` sehingga tidak ada handler yang dapat memproses payload yang salah format atau berbahaya.

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // buang properti yang tidak ada di DTO
      forbidNonWhitelisted: true, // tolak permintaan dengan properti yang tidak dikenal
      transform: true, // ubah payload menjadi instance DTO
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Atur `whitelist: true` sehingga properti yang tidak dideklarasikan dibuang — ini memblokir serangan mass-assignment di mana klien menyelundupkan bidang tambahan (misalnya `role: "admin"`) ke dalam permintaan create atau update. Gabungkan dengan `forbidNonWhitelisted: true` untuk menolak alih-alih membuang properti yang tidak dikenal secara diam-diam. Validasi objek dan array bertingkat secara eksplisit dengan `@ValidateNested()` dan `@Type()` dari `class-transformer`.

### 3. Autentikasi yang Benar

Gunakan library autentikasi yang teruji alih-alih membuat logika sesi atau token sendiri. Untuk API JWT yang stateless, gabungkan `@nestjs/jwt` dengan strategi `Passport` melalui `@nestjs/passport`.

Simpan hanya klaim terkecil yang berguna di dalam token. Jangan pernah menyimpan secret atau data pribadi yang sensitif di payload JWT — payload tersebut di-encode base64, bukan dienkripsi, dan dapat dibaca oleh siapa pun yang menangkapnya.

```typescript
// auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

Gunakan library `bcrypt` (bukan modul `crypto` mentah) untuk hashing kata sandi dengan cost factor minimal 10, dan terapkan perbandingan waktu-constant sehingga timing login tidak membocorkan apakah sebuah alamat email ada. Tambahkan refresh token berumur pendek yang disimpan dalam cookie HttpOnly untuk menjaga sesi jangka panjang tetap aman sekaligus memungkinkan rotasi.

### 4. Otorisasi dengan Guard dan Peran

Autentikasi membuktikan *siapa* Anda; otorisasi memutuskan *apa* yang boleh Anda lakukan. Tegakkan otorisasi dengan guard di level controller dan route, dan lapisi akses berbasis peran (RBAC) di atas guard autentikasi.

```typescript
// auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

Terapkan guard secara global dan aktifkan persyaratan peran per route dengan dekorator `@Roles(...)`. Terapkan juga otorisasi level objek: jangan pernah mempercayai klien untuk memberi tahu sumber daya mana yang boleh diakses — selalu verifikasi di dalam lapisan service bahwa pengguna yang meminta memiliki atau diizinkan menyentuh sumber daya yang diminta.

### 5. Rate Limiting dan Proteksi Brute-Force

Lindungi endpoint autentikasi dan route dengan beban tulis tinggi dari penyalahgunaan dengan rate limiting. Modul `@nestjs/throttler` menyediakan throttling per-route dan global di luar kotak.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

Terapkan batas yang lebih ketat pada endpoint login, dan tambahkan penguncian akun atau backoff eksponensial setelah kegagalan berulang. Pada deployment terdistribusi, dukung throttler dengan penyimpanan bersama seperti Redis sehingga batasnya bersifat global, bukan per-instance.

### 6. Header HTTP, CORS, dan CSRF

Perkuat lapisan HTTP dengan `helmet`, yang menetapkan serangkaian header keamanan yang masuk akal (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, dan lainnya).

```typescript
// main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  // ... sisa bootstrap
}
```

Konfigurasikan CORS secara eksplisit dengan daftar izin (allow-list) alih-alih default yang permisif. Hanya izinkan origin yang Anda kendalikan, dan jangan refleksikan origin sembarangan.

```typescript
app.enableCors({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
```

Jika API Anda mengandalkan autentikasi berbasis cookie, lindungi endpoint yang mengubah state terhadap Cross-Site Request Forgery (CSRF) menggunakan token double-submit cookie atau middleware `csurf`. Jika Anda menggunakan API bearer-token/header Authorization murni tanpa cookie, risiko CSRF sebagian besar tereliminasi — jangan campur autentikasi cookie dengan CORS yang permisif.

### 7. Keamanan Query dan Pencegahan Injeksi

Gunakan query terparameterisasi dan ORM atau query builder (TypeORM, Prisma, Sequelize) sehingga input pengguna selalu diikat sebagai data, tidak pernah digabungkan ke dalam string query SQL atau NoSQL. Hindari interpolasi string pada query mentah.

```typescript
// users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    // Terparameterisasi — email diikat sebagai data, tidak pernah digabungkan.
    return this.usersRepository.findOne({ where: { email } });
  }
}
```

Escape input pengguna yang direfleksikan dalam HTML atau log dinamis, hindari `eval()`, dan jangan pernah meneruskan data yang dikendalikan pengguna ke `child_process`. Lindungi dari injeksi NoSQL dengan memvalidasi bahwa kunci operator seperti `$where` atau `$gt` tidak ada dalam query objek.

### 8. Keamanan Dependensi dan Rantai Pasok

Aplikasi Anda hanya seaman pohon dependensinya. Audit dependensi di CI dan gagalkan build pada kerentanan yang diketahui.

```bash
npm audit --production
```

```bash
npm outdated
```

Jaga dependensi tetap mutakhir, pin versi eksak untuk paket penting, dan pertimbangkan alat software composition analysis (SCA) untuk visibilitas yang lebih dalam. Aktifkan Dependabot atau sejenisnya untuk mengotomatisasi peringatan kerentanan, dan tinjau diff `package-lock.json`/`pnpm-lock.yaml` di setiap PR untuk perubahan dependensi yang tidak terduga.

### 9. Logging Terstruktur Tanpa Secret

Catat cukup untuk debugging, tetapi jangan pernah mencatat kata sandi, token, nomor kartu kredit, atau data pribadi. Gunakan `pino` atau logger NestJS bawaan dengan redaksi.

```typescript
// main.ts
import { Logger } from '@nestjs/common';
import * as pino from 'pino';

const logger = pino({
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
    censor: '[REDACTED]',
  },
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useLogger(logger as any);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Redaksi header permintaan dan bidang body yang sensitif sehingga satu baris log yang salah tempat tidak dapat membocorkan kredensial. Korelasikan permintaan dengan ID permintaan sehingga Anda dapat menelusuri insiden tanpa mengekspos data.

## Langkah Implementasi

### Langkah 1: Perkuat Konfigurasi

Mulailah dengan memusatkan konfigurasi. Instal `@nestjs/config` dan `class-validator`, buat skema environment yang divalidasi, dan refaktor `ConfigModule.forRoot()` untuk memvalidasi saat boot. Hapus secret yang di-hardcode dari kode sumber dan pindahkan ke environment variable atau manajer secret. Tambahkan `.env` dan `.env.*` ke `.gitignore` dan pastikan tidak dilacak oleh git.

### Langkah 2: Tegakkan Validasi Global

Instal `class-validator` dan `class-transformer`, lalu daftarkan `ValidationPipe` yang ketat secara global di `main.ts` dengan `whitelist: true`, `forbidNonWhitelisted: true`, dan `transform: true`. Tambahkan `@ValidateNested()` dan `@Type()` ke DTO yang berisi objek dan array bertingkat. Audit setiap DTO untuk memastikan ia mendeklarasikan persis bidang yang diharapkan handler Anda.

### Langkah 3: Implementasikan Autentikasi dan Otorisasi

Tambahkan `@nestjs/jwt`, `@nestjs/passport`, dan `passport-jwt`. Buat strategi JWT, `AuthGuard('jwt')`, dan `RolesGuard` yang digerakkan oleh dekorator `@Roles()`. Daftarkan guard sehingga identitas terautentikasi dilampirkan ke permintaan dan peran level route ditegakkan. Hash kata sandi dengan `bcrypt` dengan cost factor minimal 10 dan gunakan perbandingan waktu-constant saat login. Tambahkan pemeriksaan kepemilikan level objek di service untuk sumber daya apa pun yang dapat dibaca atau diubah pengguna.

### Langkah 4: Tambahkan Rate Limiting

Instal `@nestjs/throttler`, daftarkan `ThrottlerGuard` global, dan konfigurasikan batas default yang masuk akal. Tambahkan batas per-route yang lebih ketat pada endpoint login dan reset kata sandi. Jika Anda menjalankan beberapa instance di belakang load balancer, dukung throttler dengan penyimpanan Redis bersama. Pertimbangkan penguncian akun setelah beberapa kali percobaan yang gagal.

### Langkah 5: Perkuat Lapisan HTTP

Tambahkan `helmet` sebagai middleware global. Konfigurasikan `enableCors` dengan allow-list origin yang eksplisit dan metode yang eksplisit. Jika Anda menggunakan sesi berbasis cookie, tambahkan proteksi CSRF (token double-submit atau `csurf`). Verifikasi header `Content-Security-Policy`, `Strict-Transport-Security`, dan header terkait pada respons produksi.

### Langkah 6: Audit Query dan Dependensi

Tinjau semua penggunaan query mentah dan ubah query yang menggunakan interpolasi string menjadi query terparameterisasi atau berbasis ORM. Tambahkan `npm audit --production` ke pipeline CI dan gagalkan pada temuan dengan tingkat keparahan tinggi. Perbarui paket yang sudah usang dan tinjau diff lockfile di setiap pull request.

### Langkah 7: Verifikasi dengan Pengujian Keamanan

Jalankan pemindaian OWASP ZAP atau pemindai otomatis serupa terhadap deployment staging, lalu lakukan tinjauan manual pada alur autentikasi dan otorisasi. Tambahkan pengujian integrasi yang mengonfirmasi bahwa permintaan tanpa autentikasi ditolak dan bahwa pengguna tidak dapat mengakses sumber daya yang bukan miliknya. Pastikan endpoint `/health` dan endpoint publik lainnya tidak mengekspos stack trace atau detail internal dalam respons error.

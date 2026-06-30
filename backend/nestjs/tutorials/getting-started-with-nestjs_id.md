---
title: "Memulai dengan NestJS"
description: "Tutorial komprehensif tentang membangun aplikasi server-side yang efisien dengan NestJS, mencakup modul, controller, provider, dependency injection, dan integrasi database."
category: "backend"
technology: "nestjs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Memulai dengan NestJS

## Ringkasan

NestJS adalah framework Node.js progresif untuk membangun aplikasi server-side yang efisien, andal, dan skalabel. Dibangun dengan TypeScript secara default, framework ini menggabungkan elemen Object-Oriented Programming (OOP), Functional Programming (FP), dan Functional Reactive Programming (FRP). Tutorial ini akan memandu Anda dalam menyiapkan proyek NestJS, memahami blok bangunan arsitektur intinya — modul, controller, dan provider — mengimplementasikan dependency injection, menambahkan validasi request dengan pipes, mengamankan endpoint dengan guards, dan mengintegrasikan database menggunakan TypeORM.

## Target Audiens

- Pengembang backend yang sudah familiar dengan Node.js dan TypeScript.
- Pengembang yang ingin membangun aplikasi server-side yang terstruktur dan mudah dipelihara.
- Tingkat keterampilan menengah hingga mahir.

## Prasyarat

- Node.js versi 18 atau lebih baru terinstal.
- Manajer paket npm atau yarn.
- Pemahaman dasar tentang TypeScript (interfaces, decorators, classes).
- Familiar dengan konsep REST API (metode HTTP, route, JSON).
- Editor kode (VS Code direkomendasikan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat proyek NestJS baru menggunakan CLI.
- Memahami peran modul, controller, dan provider di NestJS.
- Mengimplementasikan dependency injection untuk memisahkan logika aplikasi.
- Membuat endpoint API RESTful dengan operasi CRUD lengkap.
- Memvalidasi data request yang masuk menggunakan Pipes dengan class-validator.
- Melindungi route menggunakan Guards untuk autentikasi dan otorisasi.
- Mengintegrasikan database PostgreSQL menggunakan TypeORM.
- Menerapkan praktik terbaik NestJS untuk kode yang modular dan dapat diuji.

## Konteks dan Motivasi

Membangun server Node.js yang siap produksi membutuhkan lebih dari sekadar menghubungkan route Express. Seiring pertumbuhan aplikasi, kurangnya struktur menyebabkan kode yang kacau, pengujian yang sulit, dan refaktor yang mahal. NestJS menjawab tantangan ini dengan menerapkan arsitektur modular yang terinspirasi dari Angular. Framework ini menyediakan sistem dependency injection bawaan, routing berbasis dekorator, dan dukungan kelas satu untuk TypeScript, menjadikannya pilihan tepat bagi tim yang membangun API tingkat enterprise, microservices, atau backend GraphQL.

NestJS menggunakan Express di bawah kap (dengan Fastify sebagai alternatif opsional) tetapi menambahkan lapisan abstraksi kaya yang mendorong pemisahan concern. Baik Anda migrasi dari Express biasa atau memulai dari awal, NestJS membantu Anda mengirimkan kode yang mudah dipelihara sejak hari pertama.

## Konten Inti

### Menginstal CLI NestJS dan Membuat Proyek

CLI NestJS adalah cara tercepat untuk memulai proyek baru. Instal secara global dan buat aplikasi awal:

```bash
npm install -g @nestjs/cli
nest new nestjs-blog-api
cd nestjs-blog-api
```

Saat pembuatan proyek, pilih `npm` sebagai manajer paket. CLI akan menghasilkan proyek minimal dengan satu `app.module` dan `app.controller` root.

### Gambaran Struktur Proyek

Proyek NestJS yang tipikal mengikuti tata letak direktori berbasis modul:

```text
src/
├── app.module.ts          # Modul root
├── app.controller.ts      # Controller root
├── app.service.ts         # Service root
└── main.ts                # Entry point aplikasi
```

Setiap fitur sebaiknya berada dalam direktori modulnya sendiri. Untuk tutorial ini, kita akan membangun API blog dengan modul `posts` dan `users`.

### Modul

Modul adalah blok bangunan fundamental di NestJS. Setiap aplikasi memiliki setidaknya satu modul root. Gunakan `@Module()` untuk mengelompokkan fitur terkait:

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

Sebuah modul dapat mengimpor modul lain, mengekspor provider untuk digunakan bersama, dan mendeklarasikan controller yang menjadi bagiannya.

### Controller dan Routing

Controller menangani request HTTP yang masuk dan mengembalikan respons. Gunakan dekorator untuk mendefinisikan route:

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

### Provider dan Dependency Injection

Service, repository, dan helper didaftarkan sebagai provider. NestJS menggunakan dependency injection berbasis konstruktor:

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

Dekorator `@Injectable()` menandai `PostsService` sebagai provider. Kontainer DI NestJS akan menyelesaikan dependensi saat `PostsController` dibuat.

### DTO dan Validasi dengan Pipes

Data Transfer Objects (DTO) mendefinisikan bentuk dari body request yang masuk. Gabungkan dengan `class-validator` dan `ValidationPipe` untuk validasi otomatis:

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

Aktifkan `ValidationPipe` secara global di `main.ts`:

```typescript
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(3000);
}
```

Opsi `whitelist: true` akan menghapus properti apa pun yang tidak didefinisikan di DTO, mencegah kerentanan mass-assignment.

### Guards untuk Autentikasi

Guard menentukan apakah sebuah request boleh dilanjutkan berdasarkan kondisi tertentu (autentikasi, peran, dll.):

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

Terapkan guard ke controller atau handler individual:

```typescript
@Controller('posts')
@UseGuards(ApiKeyGuard)
export class PostsController {}
```

### Integrasi Database dengan TypeORM

TypeORM adalah ORM paling populer untuk NestJS. Instal paket yang diperlukan:

```bash
npm install @nestjs/typeorm typeorm pg
```

Konfigurasi TypeORM di modul root:

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
      synchronize: true, // nonaktifkan di produksi
    }),
    PostsModule,
  ],
})
export class AppModule {}
```

Definisikan entity:

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

Daftarkan entity di modul fitur:

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

Perbarui service untuk menggunakan pola repository:

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

## Contoh Kode

### Wiring Modul Lengkap

Gabungkan semuanya dengan mengimpor `PostsModule` ke `AppModule` root:

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

### Menjalankan Aplikasi

```bash
# Mode pengembangan dengan hot-reload
npm run start:dev

# Build produksi
npm run build
npm run start:prod
```

Uji API:

```bash
# Membuat postingan
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "x-api-key: kunci-rahasia-anda" \
  -d '{"title":"Halo NestJS","content":"Ini adalah postingan NestJS pertama saya dengan validasi dan guard!"}'

# Mendapatkan semua postingan
curl http://localhost:3000/posts

# Mendapatkan satu postingan
curl http://localhost:3000/posts/<uuid>
```

## Insight Penting

- **Arsitektur modular diterapkan secara default**: Modul NestJS bukanlah opsional. Mereka mencegah masalah "spaghetti code" yang sering melanda aplikasi Express besar dengan memberikan batasan yang jelas antar fitur.
- **Dependency injection menyederhanakan pengujian**: Karena provider di-inject daripada di-instantiasi, Anda dapat dengan mudah mengganti implementasi nyata dengan mock dalam pengujian unit menggunakan utility testing NestJS.
- **Validasi dan guard bersifat deklaratif**: Pipes dan Guards menggunakan dekorator, menjaga method controller tetap bersih dan fokus pada logika bisnis daripada boilerplate validasi atau pengecekan auth.
- **TypeORM synchronize hanya untuk pengembangan**: Di produksi, nonaktifkan `synchronize: true` dan gunakan migration TypeORM untuk menghindari kehilangan data atau perubahan skema yang tidak disengaja.
- **Dekorator mengurangi kerumitan tetapi menyembunyikan kompleksitas**: Meskipun `@Body()`, `@Param()`, dan `@Query()` sangat praktis, pahami parsing request yang mendasarinya untuk men-debug masalah secara efektif.

## Langkah Berikutnya

- Pelajari tentang middleware NestJS dan custom decorators untuk kebutuhan lintas fitur.
- Jelajahi integrasi GraphQL dengan `@nestjs/graphql` dan Apollo.
- Pelajari pola microservices menggunakan lapisan transport bawaan NestJS (TCP, Redis, RabbitMQ).
- Kunjungi dokumentasi resmi NestJS di https://docs.nestjs.com untuk topik lanjutan seperti interceptors, exception filters, dan lifecycle events.

## Kesimpulan

NestJS menyediakan framework yang kuat dan opinional untuk membangun aplikasi server-side dengan Node.js. Dengan menerapkan arsitektur modular, dependency injection, dan routing berbasis dekorator, framework ini membantu pengembang mempertahankan basis kode yang bersih, dapat diuji, dan skalabel. Tutorial ini telah memandu Anda melalui penyiapan proyek, blang bangunan inti (modul, controller, provider), validasi dengan pipes, otorisasi dengan guards, dan integrasi database dengan TypeORM. Dengan fondasi ini, Anda siap membangun API siap produksi yang mengikuti praktik terbaik industri.

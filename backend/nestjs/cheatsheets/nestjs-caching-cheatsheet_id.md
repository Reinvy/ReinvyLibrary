---
title: "Cheatsheet Caching NestJS"
description: "Referensi cepat untuk caching aplikasi NestJS yang mencakup setup CacheModule, store dalam memori dan Redis, CacheInterceptor dan dekorator cache, akses cache secara programatik, pola cache-aside, dan invalidasi cache."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Caching NestJS

## Tabel Referensi Cepat

| Aksi | Perintah / Pola | Deskripsi |
|------|-----------------|-----------|
| Memasang modul cache | `npm install @nestjs/cache-manager cache-manager` | Memasang integrasi cache (dipasangkan dengan cache-manager v5+) |
| Memasang Redis store (v5+) | `npm install cache-manager-redis-yet` | Adaptor Redis untuk cache-manager v5+, berbasis node-redis |
| Memasang Redis store (v4) | `npm install cache-manager-ioredis` | Adaptor lama untuk cache-manager v4 dengan TTL berbasis detik |
| Mendaftarkan modul secara global | `CacheModule.register({ isGlobal: true })` | Membuat caching tersedia di semua modul |
| Mengatur TTL bawaan (v5+, ms) | `ttl: 60000` | Kedaluwarsa entri setelah 60 detik secara bawaan |
| Membatasi entri dalam memori | `max: 100` | Mengeluarkan entri paling lama dipakai saat melewati batas ini |
| Meng-cache GET kontroller otomatis | `@UseInterceptors(CacheInterceptor)` | Meng-cache semua rute GET dalam sebuah kontroller |
| Mengganti kunci cache | `@CacheKey('users:list')` | Mengganti kunci otomatis untuk sebuah rute |
| Mengganti TTL sebuah rute | `@CacheTTL(120)` | Menetapkan TTL per rute (nilai dekorator dalam detik) |
| Menyuntikkan cache manager | `@Inject(CACHE_MANAGER) cacheManager: Cache` | Mengakses cache secara programatik di dalam provider |
| Membaca nilai cache | `await cacheManager.get('key')` | Mengembalikan nilai atau `undefined` saat miss |
| Menulis nilai cache | `await cacheManager.set('key', value, ttlMs)` | Menyimpan nilai dengan TTL opsional dalam ms (v5+) |
| Menghitung dan meng-cache atomik | `await cacheManager.wrap('key', fn, ttlMs)` | Mengembalikan nilai cache atau menjalankan `fn`, lalu menyimpannya |
| Invalidasi satu kunci | `await cacheManager.del('key')` | Menghapus satu entri |
| Membersihkan seluruh store | `await cacheManager.reset()` | Menghapus semua entri cache |

## Perintah Umum

### Memasang Modul Cache dan Redis Store

```bash
# Memasang integrasi cache NestJS dan cache-manager v5+
npm install @nestjs/cache-manager cache-manager

# Redis store untuk cache-manager v5+ (berbasis node-redis, TTL dalam ms)
npm install cache-manager-redis-yet

# Store lama untuk cache-manager v4 (berbasis ioredis, TTL dalam detik)
npm install cache-manager-ioredis
```

### Menjalankan Redis untuk Pengembangan Lokal

```bash
# Menjalankan instance Redis 7 yang mudah dibuang
docker run --name nest-redis -p 6379:6379 -d redis:7-alpine

# Menghentikan dan menghapusnya setelah selesai
docker rm -f nest-redis
```

### Memeriksa Kunci Cache

```bash
# Mendaftar semua kunci yang dibuat store
docker exec -it nest-redis redis-cli --scan --pattern '*'

# Menampilkan sisa TTL (detik) dari sebuah kunci
docker exec -it nest-redis redis-cli TTL cache:users:42

# Memantau lalu lintas cache secara langsung
docker exec -it nest-redis redis-cli MONITOR
```

## Potongan Kode

### Setup Cache Dalam Memori Global

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true, // tersedia di semua modul tanpa impor ulang
      ttl: 60_000,    // TTL bawaan dalam milidetik (cache-manager v5+)
      max: 100,       // simpan maksimal 100 entri dalam memori
    }),
  ],
})
export class AppModule {}
```

### Konfigurasi Cache Berbasis Redis

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT ?? 6379),
          },
          ttl: 60_000,
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

### Meng-Cache Respons Kontroller Secara Otomatis

```typescript
// src/users/users.controller.ts
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import {
  CacheInterceptor,
  CacheKey,
  CacheTTL,
} from '@nestjs/cache-manager';
import { UsersService } from './users.service';

@Controller('users')
@UseInterceptors(CacheInterceptor) // semua rute GET di kontroller ini di-cache
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CacheKey('users:list') // kunci stabil, bukan kunci otomatis berbasis URL
  @CacheTTL(120)          // penggantian TTL per rute (detik)
  findAll() {
    return this.usersService.findAll();
  }
}
```

### Kunci Cache Kustom dan Data Per-Pengguna

```typescript
// src/main.ts — membuat kunci interceptor sadar pengguna, bukan hanya URL
import { NestFactory } from '@nestjs/core';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { AppModule } from './app.module';

const app = await NestFactory.create(AppModule);
const cacheInterceptor = app.get(CacheInterceptor);
cacheInterceptor.trackBy = (context) => {
  const req = context.switchToHttp().getRequest();
  // Menyertakan id pengguna mencegah entri satu pengguna bocor ke pengguna lain
  return `${req.method}:${req.url}:${req.user?.id ?? 'anon'}`;
};
```

```typescript
// src/users/users.service.ts
async getProfile(userId: string): Promise<User> {
  // Id pengguna menjadi bagian dari kunci, jadi profil tidak pernah berbagi entri
  return this.cacheManager.wrap(`users:profile:${userId}`, () =>
    this.usersRepository.findById(userId),
  );
}
```

### Akses Cache Secara Programatik di Service

```typescript
// src/posts/posts.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class PostsService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getCached(id: string): Promise<Post | undefined> {
    return this.cacheManager.get(`posts:${id}`);
  }

  async putCached(post: Post): Promise<void> {
    // TTL adalah argumen ketiga (milidetik di cache-manager v5+)
    await this.cacheManager.set(`posts:${post.id}`, post, 60_000);
  }
}
```

### Menerapkan Pola Cache-Aside

```typescript
// src/products/products.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async findOne(id: string): Promise<Product> {
    const key = `products:${id}`;

    // 1. Layani dari cache saat tersedia
    const cached = await this.cacheManager.get<Product>(key);
    if (cached) {
      return cached;
    }

    // 2. Saat miss, ambil dari sumber kebenaran
    const product = await this.productsRepository.findById(id);

    // 3. Isi cache untuk permintaan berikutnya
    await this.cacheManager.set(key, product, 60_000);
    return product;
  }

  async findOneWrapped(id: string): Promise<Product> {
    // wrap() adalah alur read-through yang sama dalam satu panggilan
    return this.cacheManager.wrap(`products:${id}`, () =>
      this.productsRepository.findById(id),
    );
  }
}
```

### Invalidasi Cache Setelah Operasi Tulis

```typescript
// src/users/users.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class UsersService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.update(id, dto);

    // Invalidasi lebih baik daripada menimpa: pembacaan berikutnya mengambil
    // data segar alih-alih memakai ulang bentuk yang basi
    await this.cacheManager.del(`users:${id}`);
    await this.cacheManager.del('users:list');
    return user;
  }
}
```

### Operasi Redis Tingkat Rendah

```typescript
// src/reports/reports.service.ts
// Antarmuka store hanya membungkus CRUD — akses klien dasarnya untuk
// operasi lanjutan. Pengetikan longgar disengaja: setiap store mengekspos
// API klien yang berbeda, jadi cast di batas penggunaan.
@Injectable()
export class ReportsService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async expireReportSoon(id: string): Promise<void> {
    const client = (this.cacheManager.store as { client: any }).client;
    await client.expire(`reports:${id}`, 30);
    await client.publish('cache:invalidated', `reports:${id}`);
  }
}
```

### Menghindari Jebakan Cache Terdistribusi

```typescript
// src/app.module.ts
// Store dalam memori bersifat per-proses. Dengan beberapa replika di belakang
// load balancer, setiap instance melayani kumpulan entri yang berbeda, sehingga
// kunci yang sama bisa dingin di satu replika dan panas di replika lain.
// Gunakan Redis store setiap kali aplikasi diskalakan secara horizontal.
```

```text
Daftar periksa jebakan
- CacheInterceptor hanya meng-cache rute GET yang mengembalikan kode 2xx
- Data per-pengguna wajib menyertakan id pengguna di kunci agar payload
  satu pengguna tidak bocor ke pengguna lain
- Nilai cache diserialisasi dengan JSON: Date berubah menjadi string dan
  instance class kehilangan method-nya kecuali diserialisasi secara eksplisit
- Setelah mutasi, invalidasi kunci yang terdampak alih-alih membiarkan entri
  basi melayani sampai TTL habis
- TTL yang sangat panjang pada kunci panas mengundang stampede saat akhirnya
  kedaluwarsa: segarkan lebih awal atau pakai wrap() untuk mendeduplikasi refetch
```

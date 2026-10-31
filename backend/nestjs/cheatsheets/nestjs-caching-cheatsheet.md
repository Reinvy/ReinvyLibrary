---
title: "NestJS Caching Cheatsheet"
description: "A quick reference for caching NestJS applications covering CacheModule setup, in-memory and Redis stores, CacheInterceptor and cache decorators, programmatic cache access, the cache-aside pattern, and cache invalidation."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# NestJS Caching Cheatsheet

## Quick Reference Table

| Action | Command / Pattern | Description |
|--------|-------------------|-------------|
| Install the cache module | `npm install @nestjs/cache-manager cache-manager` | Install the cache integration (pairs with cache-manager v5+) |
| Install the Redis store (v5+) | `npm install cache-manager-redis-yet` | Redis adapter for cache-manager v5+, built on node-redis |
| Install the Redis store (v4) | `npm install cache-manager-ioredis` | Legacy adapter for cache-manager v4 with seconds-based TTL |
| Register the module globally | `CacheModule.register({ isGlobal: true })` | Make caching available in every module |
| Set a default TTL (v5+, ms) | `ttl: 60000` | Expire entries after 60 seconds by default |
| Cap in-memory entries | `max: 100` | Evict the least-recently-used item past this limit |
| Auto-cache controller GETs | `@UseInterceptors(CacheInterceptor)` | Cache every GET route in a controller |
| Override the cache key | `@CacheKey('users:list')` | Replace the auto-generated key for a route |
| Override a route TTL | `@CacheTTL(120)` | Set a per-route TTL (decorator value in seconds) |
| Inject the cache manager | `@Inject(CACHE_MANAGER) cacheManager: Cache` | Access the cache programmatically in a provider |
| Read a cached value | `await cacheManager.get('key')` | Return the value or `undefined` on a miss |
| Write a cached value | `await cacheManager.set('key', value, ttlMs)` | Store a value with an optional TTL in ms (v5+) |
| Compute and cache atomically | `await cacheManager.wrap('key', fn, ttlMs)` | Return the cached value or run `fn`, then store it |
| Invalidate one key | `await cacheManager.del('key')` | Remove a single entry |
| Flush the whole store | `await cacheManager.reset()` | Remove every cached entry |

## Common Commands

### Installing the Cache Module and a Redis Store

```bash
# Install the NestJS cache integration and cache-manager v5+
npm install @nestjs/cache-manager cache-manager

# Redis store for cache-manager v5+ (node-redis based, TTL in ms)
npm install cache-manager-redis-yet

# Legacy store for cache-manager v4 (ioredis based, TTL in seconds)
npm install cache-manager-ioredis
```

### Running Redis for Local Development

```bash
# Start a disposable Redis 7 instance
docker run --name nest-redis -p 6379:6379 -d redis:7-alpine

# Stop and remove it afterwards
docker rm -f nest-redis
```

### Inspecting Cached Keys

```bash
# List every key the store created
docker exec -it nest-redis redis-cli --scan --pattern '*'

# Show the remaining TTL (seconds) of one key
docker exec -it nest-redis redis-cli TTL cache:users:42

# Watch cache traffic arrive in real time
docker exec -it nest-redis redis-cli MONITOR
```

## Code Snippets

### Global In-Memory Cache Setup

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true, // available in every module without re-importing
      ttl: 60_000,    // default TTL in milliseconds (cache-manager v5+)
      max: 100,       // keep at most 100 entries in memory
    }),
  ],
})
export class AppModule {}
```

### Redis-Backed Cache Configuration

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

### Caching Controller Responses Automatically

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
@UseInterceptors(CacheInterceptor) // every GET route in this controller is cached
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CacheKey('users:list') // stable key instead of the generated URL-based one
  @CacheTTL(120)          // per-route TTL override (seconds)
  findAll() {
    return this.usersService.findAll();
  }
}
```

### Custom Cache Keys and Per-User Data

```typescript
// src/main.ts — make interceptor keys user-aware instead of URL-only
import { NestFactory } from '@nestjs/core';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { AppModule } from './app.module';

const app = await NestFactory.create(AppModule);
const cacheInterceptor = app.get(CacheInterceptor);
cacheInterceptor.trackBy = (context) => {
  const req = context.switchToHttp().getRequest();
  // Including the user id prevents one user's entry from leaking to another
  return `${req.method}:${req.url}:${req.user?.id ?? 'anon'}`;
};
```

```typescript
// src/users/users.service.ts
async getProfile(userId: string): Promise<User> {
  // The user id is part of the key, so profiles never share an entry
  return this.cacheManager.wrap(`users:profile:${userId}`, () =>
    this.usersRepository.findById(userId),
  );
}
```

### Programmatic Cache Access in a Service

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
    // TTL is the third argument (milliseconds in cache-manager v5+)
    await this.cacheManager.set(`posts:${post.id}`, post, 60_000);
  }
}
```

### Implementing the Cache-Aside Pattern

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

    // 1. Serve from cache when present
    const cached = await this.cacheManager.get<Product>(key);
    if (cached) {
      return cached;
    }

    // 2. On a miss, load from the source of truth
    const product = await this.productsRepository.findById(id);

    // 3. Populate the cache for the next request
    await this.cacheManager.set(key, product, 60_000);
    return product;
  }

  async findOneWrapped(id: string): Promise<Product> {
    // wrap() is the same read-through flow in a single call
    return this.cacheManager.wrap(`products:${id}`, () =>
      this.productsRepository.findById(id),
    );
  }
}
```

### Invalidating Cache After Writes

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

    // Invalidating is better than overwriting: the next read refetches
    // fresh data instead of reusing a stale shape
    await this.cacheManager.del(`users:${id}`);
    await this.cacheManager.del('users:list');
    return user;
  }
}
```

### Low-Level Redis Operations

```typescript
// src/reports/reports.service.ts
// The store interface only wraps CRUD — reach the underlying client for
// advanced operations. Loose typing is intentional: stores expose
// different client APIs, so cast at the boundary.
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

### Avoiding Distributed-Cache Pitfalls

```typescript
// src/app.module.ts
// The in-memory store is per-process. With several replicas behind a load
// balancer, each instance serves a different set of entries, so the same
// key can be cold on one replica and warm on another. Use the Redis store
// whenever the app scales horizontally.
```

```text
Pitfall checklist
- CacheInterceptor only caches GET routes that return 2xx status codes
- Per-user data must include the user id in the key to avoid leaking one
  user's payload to another
- Cached values are serialized with JSON: Dates become strings and class
  instances lose their methods unless you serialize explicitly
- After mutations, invalidate the affected keys instead of letting stale
  entries serve until the TTL expires
- A very long TTL on hot keys invites a stampede when it finally expires:
  refresh early or use wrap() to deduplicate the refetch
```

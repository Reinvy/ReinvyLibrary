---
title: "Membangun API SaaS Multi-Tenant dengan NestJS"
description: "Tutorial praktik membangun API SaaS multi-tenant siap produksi dengan NestJS, mencakup resolusi tenant, propagasi konteks request, persistensi yang sadar tenant, kuota per tenant, dan pengujian isolasi."
category: "backend"
technology: "nestjs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun API SaaS Multi-Tenant dengan NestJS

## Ringkasan

Tutorial ini membangun backend SaaS multi-tenant dengan NestJS dari awal: me-resolve tenant pada setiap request masuk, mempropagasikan konteks tenant ke seluruh service tanpa membuat seluruh graph dependency menjadi request-scoped, menegakkan isolasi tenant di lapisan persistensi, menerapkan namespace cache serta kuota per tenant, dan membuktikan isolasi tersebut benar-benar bekerja lewat pengujian otomatis. API yang dihasilkan melayani beberapa organisasi pelanggan dari satu deployment sekaligus menjamin tidak ada query yang dapat membaca atau menulis baris milik tenant lain.

## Target Audiens

- Backend engineer yang sudah nyaman dengan modul, controller, provider, dan guard di NestJS.
- Developer yang sudah merilis API single-tenant dan sekarang perlu mengubahnya menjadi produk SaaS.
- Platform engineer yang sedang mengevaluasi isolasi tingkat baris versus tingkat schema untuk deployment bersama.

## Prasyarat

- Pemahaman praktis NestJS (modul, dependency injection, guard, interceptor, pipe).
- Pengalaman TypeScript, termasuk generic dan decorator.
- Instance PostgreSQL (Docker cukup) dan Node.js versi 20 atau lebih baru.
- Familiar dengan SQL, TypeORM atau Prisma, serta dasar-dasar Redis.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membandingkan isolasi tenant tingkat baris, tingkat schema, dan tingkat database lalu memilihnya secara sadar.
- Me-resolve tenant dari subdomain, header, atau klaim JWT dengan middleware NestJS dan memvalidasi keanggotaannya.
- Mempropagasikan konteks tenant memakai `AsyncLocalStorage` milik Node alih-alih menjadikan setiap provider request-scoped.
- Membuat lapisan persistensi sadar tenant sehingga filter tenant yang lupa ditulis menjadi tidak mungkin, bukan sekadar tidak disarankan.
- Menegakkan namespace cache, rate limit, dan kuota penyimpanan per tenant.
- Menulis pengujian otomatis yang gagal ketika isolasi tenant mengalami regresi.

## Konteks dan Motivasi

Lompatan dari API single-tenant menjadi produk SaaS jarang sekali merupakan masalah scaling — itu masalah isolasi. Begitu dua pelanggan berbagi satu deployment, setiap query yang lupa klausa `WHERE tenant_id = ...` berubah menjadi kebocoran data, dan setiap entri cache di memori yang hanya di-key dengan ID resource menjadi kebocoran antar pelanggan. Sementara itu, perbaikan naif — menjadikan setiap provider request-scoped agar bisa menerima tenant ID — menghancurkan performa dependency injection NestJS karena request scope merambat ke seluruh graph provider.

Pola yang bertahan di produksi memisahkan tiga hal: **resolusi** (dari mana tenant berasal), **propagasi** (bagaimana kode di lapisan bawah melihatnya), dan **penegakan** (bagaimana database menolak menjawab tanpa tenant). Tutorial ini membangun ketiganya, dan memperlakukan penegakan sebagai lapisan penentu — karena reviewer bisa lupa, sedangkan database tidak.

## Konten Inti

### Apa yang Sebenarnya Dibutuhkan Multi-Tenancy

API multi-tenant punya tiga kewajiban yang tidak pernah dinyatakan eksplisit oleh API single-tenant:

1. **Resolusi tenant** — setiap request membawa tepat satu identitas tenant, yang berasal dari sumber tepercaya. Path param dan query string dikendalikan penyerang sehingga tidak boleh dipercaya begitu saja; header hanya tepercaya jika divalidasi terhadap keanggotaan pengguna pada bearer token.
2. **Propagasi tenant** — setiap lapisan antara controller dan database dapat membaca tenant aktif tanpa harus mengoper parameter melalui sepuluh signature fungsi.
3. **Penegakan tenant** — lapisan penyimpanan menolak operasi apa pun yang tidak memiliki scope tenant. Idealnya kegagalannya keras, bukan sekadar aturan lint.

Resolusi tanpa penegakan hanyalah teater: satu `find({ where: { id } })` yang terlupa dan pelanggan A dapat membaca invoice pelanggan B.

### Memilih Model Isolasi

Tiga model mendominasi praktik, dan pilihannya adalah keputusan produk sekaligus keputusan teknis.

| Model | Kekuatan isolasi | Biaya per tenant | Biaya migrasi | Paling cocok untuk |
| --- | --- | --- | --- | --- |
| Tabel bersama, kolom tenant (tingkat baris) | Logis saja, ditegakkan setiap query | Nyaris nol | Satu schema untuk semua | Mayoritas SaaS B2B, ribuan tenant kecil |
| Database bersama, schema per tenant | Logis kuat, namespace terpisah | Rendah, objek schema tambahan | Fan-out ke N schema | Tenant mid-market teregulasi, puluhan hingga ratusan |
| Database per tenant | Fisik | Tinggi, infrastruktur per tenant | Fan-out ke banyak koneksi | Kontrak enterprise, klausa hosting single-tenant |

Tutorial ini mengimplementasikan model tingkat baris, lalu menunjukkan cara menambahkan suspensi schema-per-tenant tanpa menulis ulang pipeline request. Tingkat baris adalah default yang tepat karena menjaga deployment tetap sederhana; ketika kontrak pelanggan menuntut isolasi lebih kuat, pelanggan itu dipromosikan ke database khusus tanpa mengubah jalur kode aplikasi.

Tambahan kritis untuk isolasi tingkat baris adalah Row-Level Security (RLS) PostgreSQL. Filter di level aplikasi hanyalah konvensi; RLS adalah batasan yang ditegakkan database bahkan ketika query-nya salah.

### Me-resolve Tenant pada Setiap Request

Resolusi menjawab satu pertanyaan per request: pemanggil ini sedang bertindak di dalam tenant mana?

Tiga sinyal yang umum dipakai:

- **Subdomain** — `acme.api.example.com`. UX baik dan natural untuk URL pelanggan, tetapi canggung untuk klien machine-to-machine.
- **Header** — `X-Tenant-Id: acme`. Mudah bagi klien apa pun, tetapi hanya aman jika divalidasi terhadap token.
- **Klaim JWT** — `{ "tid": "8f14e45f" }` di dalam token bertanda tangan. Paling kuat secara default karena tanda tangannya sudah membuktikan klaim tersebut.

Implementasi yang kokoh menerima header atau subdomain sebagai *kandidat*, lalu memverifikasi keanggotaan terhadap principal yang terautentikasi. Langkah verifikasi inilah yang mengubah string tak tepercaya menjadi tenant tepercaya. Cache hasil lookup keanggotaan selama masa berlaku token agar tidak masuk ke jalur panas.

Resolusi juga butuh kebijakan fallback untuk rute tanpa autentikasi: penerima webhook, health check, dan endpoint publik lainnya entah tidak memiliki tenant atau menurunkannya dari payload bertanda tangan. Jangan biarkan jalur tanpa autentikasi diam-diam mewarisi tenant default.

### Mempropagasikan Konteks Tenant Tanpa Menjadikan Semuanya Request-Scoped

Solusi NestJS yang menggoda adalah `Scope.REQUEST` pada service tenant. Ini bekerja, tetapi ada harganya: provider request-scoped dibuat ulang setiap request, dan setiap provider yang meng-inject-nya ikut menjadi request-scoped sampai ke bawah. Pada endpoint panas dengan graph provider yang dalam, biaya ini terukur, dan diam-diam merusak provider yang mengharapkan siklus hidup singleton (connection pool, cache, background worker).

`AsyncLocalStorage` dari modul `async_hooks` Node memberi ergonomi yang sama tanpa menyentuh scope DI. Satu middleware global menjalankan sisa request di dalam konteks penyimpanan; provider mana pun — singleton atau bukan — dapat membaca tenant dengan memanggil `getStore()`. Gaya pemanggilan tetap sinkron, dan tenant tidak pernah perlu menjadi parameter konstruktor.

Pagar pengamannya penting: `AsyncLocalStorage` hanya terpropagasi melalui kelanjutan async yang berasal dari dalam callback `run()`. Pekerjaan yang diserahkan ke `setImmediate`, timer mentah yang dibuat di luar konteks, atau worker antrean tidak akan melihat store tersebut. Karena itu background job harus membawa tenant ID secara eksplisit pada payload — antrean adalah konteks baru, bukan kelanjutan.

### Membuat Persistensi Sadar Tenant

Dua lapisan melindungi data:

1. **Base repository sadar tenant** yang menyuntikkan predikat tenant ke setiap query secara otomatis.
2. **Row-Level Security di database** yang menolak statement apa pun tanpa setting tenant.

Base repository membuat hal yang benar menjadi mudah. Ia mengekspos method di mana filter tenant bukan parameter — developer tidak bisa mengoper tenant yang salah karena mereka tidak pernah mengopernya. Jalan keluar (query admin lintas tenant) harus dinamai eksplisit, misalnya `findAcrossTenants()`, supaya menonjol saat code review.

Lapisan RLS membuat hal yang salah menjadi mustahil. Setiap request menetapkan `app.current_tenant` pada transaksi koneksinya, dan policy membandingkan `tenant_id` dengan `current_setting('app.current_tenant')`. Query yang lupa filter mengembalikan nol baris alih-alih data pelanggan lain. Perhatikan bahwa role database aplikasi tidak boleh menjadi pemilik tabel dan tidak boleh memegang `BYPASSRLS`, jika tidak policy akan diabaikan.

Ada satu detail yang perlu direncanakan: connection pooling. Karena setting bersifat per koneksi, setel di dalam transaksi (`SET LOCAL`) atau reset saat koneksi dilepas. Membocorkan setting tenant ke request berikutnya pada koneksi pooled adalah persis kelas bug yang hendak dicegah desain ini.

### Cache dan Kuota per Tenant

Setelah request membawa tenant, setiap key cache juga harus membawanya. Key Redis seperti `user:42` berubah menjadi `t:{tenantId}:user:42`. Ada dua manfaat: kebenaran, dan cara murah untuk menginvalidasi atau mengekspor seluruh cache satu tenant dengan pemindaian prefix tersebut. Sertakan tenant pada header cache HTTP juga, atau CDN akan dengan senang hati menyajikan respons satu tenant kepada tenant lain.

Kuota muncul dari konteks yang sama. Rate limit berlaku per tenant, bukan per IP — satu organisasi pelanggan berbagi satu anggaran. Tegakkan di guard yang didukung Redis agar limit konsisten di seluruh replika, dan pisahkan tier limit berdasarkan paket tenant yang tersimpan pada record tenant.

### Menjaga agar Tidak Terjadi Kebocoran Lintas Tenant

Isolasi gagal di tempat-tempat yang mudah diprediksi. Audit hal-hal berikut:

- Background job diantrekan hanya dengan ID resource, lalu dieksekusi tanpa konteks tenant.
- Cache dan materialized view di-key tanpa tenant.
- Path penyimpanan file dipakai bersama antar tenant (`uploads/<fileId>` alih-alih `uploads/<tenantId>/<fileId>`).
- Ekspor dan laporan ditulis sebagai SQL mentah yang melewati base repository.
- Tooling admin dan support yang melakukan query lintas tenant tanpa jejak audit.

Pertahanan praktisnya adalah suite pengujian yang menjalankan setiap endpoint ber-scope tenant sebagai tenant A terhadap ID resource milik tenant B dan memastikan respons 404 (bukan 403 — jangan mengonfirmasi keberadaan resource kepada tenant asing).

## Contoh Kode

### Struktur Proyek

```text
src/
  app.module.ts
  main.ts
  tenant/
    tenant.module.ts
    tenant.middleware.ts
    tenant-context.ts
    tenant.guard.ts
    tenant.service.ts
    tenant.decorator.ts
  database/
    tenant-aware.repository.ts
    tenant-transaction.ts
  billing/
    billing.module.ts
    billing.controller.ts
    billing.service.ts
    billing.entity.ts
  quotas/
    quota.guard.ts
  common/
    redis.provider.ts
test/
  tenant-isolation.e2e-spec.ts
```

### Konteks Tenant dengan AsyncLocalStorage

```typescript
// src/tenant/tenant-context.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  tenantId: string;
  plan: 'free' | 'pro' | 'enterprise';
  userId?: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  return storage.run(store, fn);
}

export function getTenant(): TenantStore {
  const store = storage.getStore();
  if (!store) {
    throw new Error('Tenant context missing: this code path did not run inside TenantMiddleware');
  }
  return store;
}

export function tryGetTenant(): TenantStore | undefined {
  return storage.getStore();
}
```

Accessor yang melempar error itu disengaja. Tenant yang hilang adalah bug, dan gagal dengan keras pada pembacaan pertama jauh lebih murah daripada menemukannya sebagai kebocoran data berbulan-bulan kemudian.

### Me-resolve dan Memverifikasi Tenant di Middleware

```typescript
// src/tenant/tenant.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantService } from './tenant.service';
import { runWithTenant } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenants: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const candidate =
      (req.headers['x-tenant-id'] as string | undefined) ??
      req.hostname.split('.')[0];

    const principal = (req as any).user; // set by the auth guard earlier in the chain
    if (!candidate) {
      return next();
    }

    const tenant = await this.tenants.resolveForPrincipal(candidate, principal?.sub);
    if (!tenant) {
      throw new UnauthorizedException('Unknown or inaccessible tenant');
    }

    res.setHeader('X-Tenant-Id', tenant.id);
    runWithTenant({ tenantId: tenant.id, plan: tenant.plan, userId: principal?.sub }, () =>
      next(),
    );
  }
}
```

`resolveForPrincipal` membaca cache Redis berumur pendek sebelum menyentuh PostgreSQL, karena ia berjalan pada setiap request:

```typescript
// src/tenant/tenant.service.ts (kutipan)
async resolveForPrincipal(slug: string, userId?: string) {
  const cacheKey = `t:resolve:${slug}`;
  const cached = await this.redis.get(cacheKey);
  const tenant = cached ? JSON.parse(cached) : await this.repo.findOneBy({ slug });

  if (!tenant || tenant.suspendedAt) return null;
  if (!userId) return tenant;
  if (tenant.ownerId === userId) return tenant;

  const member = await this.redis.get(`t:member:${tenant.id}:${userId}`);
  if (member) return tenant;

  const row = await this.membershipRepo.findOneBy({ tenantId: tenant.id, userId });
  if (!row) return null;

  await this.redis.set(`t:member:${tenant.id}:${userId}`, '1', 'EX', 300);
  return tenant;
}
```

### Base Repository Sadar Tenant

```typescript
// src/database/tenant-aware.repository.ts
import { Repository, SelectQueryBuilder } from 'typeorm';
import { getTenant } from '../tenant/tenant-context';

export abstract class TenantAwareRepository<T extends { tenantId: string }> {
  protected constructor(protected readonly repo: Repository<T>) {}

  protected scoped(): SelectQueryBuilder<T> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId: getTenant().tenantId });
  }

  findAll(): Promise<T[]> {
    return this.scoped().getMany();
  }

  findByResourceId(resourceId: string): Promise<T | null> {
    return this.scoped()
      .andWhere('e.resourceId = :resourceId', { resourceId })
      .getOne();
  }

  async createOne(data: Omit<T, 'tenantId'>): Promise<T> {
    const entity = this.repo.create({ ...data, tenantId: getTenant().tenantId } as T);
    return this.repo.save(entity);
  }

  // Jalan keluar: sengaja dibuat verbose agar jelas saat code review.
  findAcrossTenantsForAdmin(resourceId: string): Promise<T[]> {
    return this.repo.find({ where: { resourceId } as any });
  }
}
```

### Menetapkan Tenant pada Transaksi Database

Row-Level Security membutuhkan koneksi yang mengetahui tenant. Menyetelnya dengan `SET LOCAL` di dalam transaksi menjaga scope tetap aman terhadap pooling:

```typescript
// src/database/tenant-transaction.ts
import { DataSource, EntityManager } from 'typeorm';
import { getTenant } from '../tenant/tenant-context';

export async function withTenantTransaction<R>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<R>,
): Promise<R> {
  const { tenantId } = getTenant();

  return dataSource.transaction(async (manager) => {
    await manager.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
    return work(manager);
  });
}
```

Policy dan grant yang menyertainya:

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Role aplikasi tidak boleh melewati policy.
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO app_role;
REVOKE ALL ON invoices FROM PUBLIC;
```

`FORCE ROW LEVEL SECURITY` penting: tanpa itu, pemilik tabel diam-diam melewati setiap policy — dan pada banyak setup, role yang menjalankan migrasi adalah pemiliknya.

### Key Cache per Tenant dan Guard Kuota

```typescript
// src/quotas/quota.guard.ts
import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getTenant } from '../tenant/tenant-context';

const LIMITS: Record<string, number> = { free: 60, pro: 600, enterprise: 6000 };

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(private readonly redis: Redis) {}

  async canActivate(_ctx: ExecutionContext): Promise<boolean> {
    const { tenantId, plan } = getTenant();
    const window = Math.floor(Date.now() / 60_000);
    const key = `t:${tenantId}:quota:${window}`;

    const used = await this.redis.incr(key);
    if (used === 1) await this.redis.expire(key, 90);

    const limit = LIMITS[plan] ?? LIMITS.free;
    if (used > limit) {
      throw new HttpException(
        { error: 'quota_exceeded', limit, plan, retryAfter: 60 },
        429,
      );
    }
    return true;
  }
}
```

### Pengujian Isolasi yang Gagal Saat Regresi

```typescript
// test/tenant-isolation.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('tenant isolation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('returns 404 for another tenant resource, never 403', async () => {
    const tenantBInvoiceId = await seedInvoice({ tenantSlug: 'beta' });

    await request(app.getHttpServer())
      .get(`/invoices/${tenantBInvoiceId}`)
      .set('Authorization', `Bearer ${tokenForTenant('acme')}`)
      .set('X-Tenant-Id', 'acme')
      .expect(404);
  });

  it('cannot insert a row for a foreign tenant via RLS', async () => {
    await expect(
      insertInvoiceFor({ tenantSlug: 'beta', callerTenant: 'acme' }),
    ).rejects.toThrow(/row-level security/);
  });

  afterAll(() => app.close());
});
```

## Insight Penting

- Resolusi, propagasi, dan penegakan adalah tiga masalah berbeda. Melewati penegakan karena resolusi "terasa aman" adalah cara kebocoran lintas tenant sampai ke produksi.
- `AsyncLocalStorage` lebih baik daripada provider request-scoped untuk konteks tenant: tidak ada kaskade DI, tidak ada konstruksi provider per request, dan singleton tetap mempertahankan siklus hidupnya. Konsekuensinya, konteks tidak menyeberang batas antrean sehingga payload job harus membawa tenant ID.
- Gunakan `FORCE ROW LEVEL SECURITY` bersama role aplikasi non-pemilik. Tanpa keduanya, role pemilik diam-diam melewati setiap policy yang Anda tulis.
- Setel tenant dengan `SET LOCAL` di dalam transaksi. Setting tingkat sesi bocor ke request berikutnya pada koneksi pooled — kebocoran data yang menyamar sebagai detail konfigurasi.
- Kembalikan 404, bukan 403, untuk resource asing. 403 mengonfirmasi resource itu ada dan mengubah ruang ID Anda menjadi oracle enumerasi.
- Beri key tenant pada setiap cache, lock, penghitung rate limit, dan path penyimpanan sejak hari pertama. Menambahkan prefix setelah peluncuran berarti mengaudit setiap jalur baca di bawah tekanan produksi.

## Langkah Berikutnya

- Kembangkan model ini dengan promosi schema-per-tenant untuk pelanggan enterprise, tanpa mengubah middleware.
- Tambahkan audit logging terstruktur untuk akses admin lintas tenant, dan kirim metrik setiap kali policy menolak query.
- Pelajari panduan security hardening NestJS untuk autentikasi, header, dan manajemen secret di sekitar pipeline ini.
- Dalami silabus PostgreSQL multi-tenant SaaS untuk cakupan RLS, partitioning, dan strategi migrasi per tenant yang lebih dalam.

## Kesimpulan

Multi-tenancy di NestJS bukan fitur yang ditempelkan — ia adalah kontrak lintas lapisan antara pipeline request, graph provider, dan database. Resolve tenant dari sinyal tepercaya lalu verifikasi keanggotaannya; propagasikan lewat `AsyncLocalStorage` agar service tetap berscope singleton; tegakkan dengan base repository sadar tenant plus Row-Level Security agar filter yang terlupa gagal secara aman; kemudian beri namespace tenant pada setiap cache, kuota, dan path penyimpanan. Buktikan semuanya dengan pengujian isolasi yang menjalankan satu tenant terhadap ID resource milik tenant lain, karena satu-satunya isolasi yang berarti adalah isolasi yang bisa dibuktikan oleh pengujian.

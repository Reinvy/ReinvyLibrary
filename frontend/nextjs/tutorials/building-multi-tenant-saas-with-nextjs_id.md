---
title: "Membangun Aplikasi SaaS Multi-Tenant dengan Next.js"
description: "Bangun SaaS multi-tenant siap produksi dengan Next.js: routing subdomain, akses data ter-scope per tenant, tema per tenant, kontrol isolasi real-time, dan penegakan kuota."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi SaaS Multi-Tenant dengan Next.js

## Ringkasan

Tutorial ini membangun aplikasi SaaS multi-tenant yang berfungsi di atas Next.js App Router. Anda akan me-resolve tenant sebelum rendering, mempelajari bagaimana setiap model tenancy berperilaku di bawah beban nyata, men-scope setiap query database agar baris data tidak pernah bocor antar pelanggan, menggerakkan tema per tenant dari konfigurasi, dan menegakkan kuota paket di tepi siklus hidup request. Hasil akhirnya adalah produk workspace tim yang dapat di-deploy, di mana setiap pelanggan mendapat subdomain terisolasi, data terisolasi, dan branding terisolasi sambil berbagi satu deployment dan satu database.

Tutorial ini bersifat praktik langsung. Setiap konsep diperkenalkan bersama kegagalan yang dicegahnya, lalu diikuti kode yang mencegahnya. Di akhir, Anda akan memiliki middleware resolusi tenant, lapisan akses data ter-scope tenant, kebijakan row level security yang menjaga tabel bersama, cache yang sadar tenant, pipeline tema, dan penjaga kuota.

## Target Audiens

- Fullstack dan frontend engineer yang sudah mengirim aplikasi Next.js dan kini perlu melayani banyak pelanggan dari satu deployment.
- Backend engineer yang memigrasikan produk single-tenant ke arsitektur multi-tenant.
- Technical founder dan platform engineer yang bertanggung jawab atas isolasi, kontrol biaya, dan batas kepatuhan pada produk SaaS.
- Ekspektasi tingkat kemampuan pembaca: mahir. Anda sebaiknya sudah nyaman dengan App Router, server component, route handler, serta dasar-dasar database relasional dan query builder-nya.

## Prasyarat

- Pengetahuan kerja yang kuat tentang Next.js App Router: layout, server component, server action, middleware, dan route handler.
- Pengalaman TypeScript, termasuk generics dan module augmentation.
- Node.js 20 atau lebih baru serta database Postgres yang dapat dijangkau dari mesin Anda (instance terkelola maupun container lokal keduanya bisa).
- Keakraban dengan ORM: tutorial ini memakai Prisma, tetapi polanya langsung dapat dipindahkan ke Drizzle atau Kysely.
- Cara menguji subdomain secara lokal. Tutorial menunjukkan pengaturan berbasis `*.localtest.me` sehingga tidak perlu mengubah file host.
- Opsional namun berguna: pemahaman tentang sesi berbasis JWT dan biaya connection pool database di bawah konkurensi.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membandingkan model tenancy silo, bridge, dan pool lalu memilih salah satunya berdasarkan batasan isolasi, biaya, dan operasional, bukan berdasarkan kebiasaan.
- Me-resolve tenant dari hostname, prefix path, atau klaim sesi di dalam middleware Next.js, serta memetakan URL publik yang bersih ke pohon route internal.
- Membangun konteks tenant yang bersifat per-request sehingga server component, server action, dan route handler semuanya membaca dari satu sumber kebenaran.
- Menegakkan isolasi tenant di lapisan database dengan row level security agar klausa `WHERE` yang terlupa tidak dapat mengekspos baris data pelanggan lain.
- Merancang cache key dan tag revalidasi yang sadar tenant, serta menjelaskan bagaimana cache yang naif membocorkan data antar tenant.
- Menggerakkan konfigurasi per tenant, feature flag, dan tema dari record tenant yang tersimpan tanpa mencabang deployment.
- Mengukur pemakaian serta menegakkan kuota paket dan rate limit per tenant.
- Melengkapi request dengan identitas tenant sehingga log, trace, dan laporan error tetap terpisah antar pelanggan.

## Konteks dan Motivasi

Aplikasi single-tenant menanamkan identitas satu pelanggan ke dalam skema, konfigurasi, dan deployment-nya. Begitu pelanggan kedua mendaftar, asumsi itu menjadi mahal. Tim biasanya bereaksi dengan satu dari dua cara, dan keduanya jebakan.

Reaksi pertama adalah men-deploy aplikasi berulang untuk setiap pelanggan. Isolasinya sangat baik dan Anda tidak perlu mengubah kode — tetapi setiap deployment berarti satu database lagi, satu connection pool lagi, satu pipeline migrasi lagi, satu set secret lagi, dan satu tagihan lagi. Dukungan pelanggan berubah menjadi daftar endpoint alih-alih satu dashboard. Reaksi kedua adalah menambahkan kolom `tenantId` ke beberapa tabel, menambahkan `WHERE tenantId = ?` di controller yang kebetulan diingat tim, lalu berharap. Cara ini berjalan sampai query pertama yang lupa memfilter muncul, dan pada titik itu seorang pelanggan membaca data pelanggan lain. Itu bukan bug yang bisa ditambal diam-diam; itu sebuah insiden.

Multi-tenancy adalah disiplin untuk mendapatkan isolasi dari pendekatan pertama tanpa biaya operasional pendekatan pertama, dan tanpa bergantung pada kedisiplinan developer seperti pendekatan kedua. Rekayasa yang menarik bukanlah "bagaimana menambahkan kolom tenant", melainkan:

- Bagaimana sistem mengetahui tenant mana pemilik sebuah request, sebelum data apa pun disentuh?
- Apa batas yang membuat isolasi menjadi properti struktural alih-alih properti hasil code review?
- Bagaimana cache, background job, dan penyimpanan file menghormati batas tersebut?
- Bagaimana Anda mengukur pemakaian agar lonjakan trafik satu tenant tidak menurunkan kualitas tenant lain, atau diam-diam menggerus biaya Anda?

Next.js adalah tempat yang baik untuk menjawab pertanyaan-pertanyaan ini karena framework menyediakan satu tempat untuk me-resolve tenant (middleware), satu tempat untuk menyimpan state request (server component dan utilitas ber-scope request), serta model deployment di mana menambah pelanggan berarti menyisipkan satu baris, bukan menyediakan satu server.

## Konten Inti

### Model Tenancy Secara Singkat

Sebelum menulis kode, beri nama pada model yang Anda bangun. Tiga model standar berbeda pada letak batas isolasinya.

```text
| Model   | Batas                   | Isolasi | Biaya per tenant | Biaya migrasi   |
|---------|-------------------------|---------|------------------|-----------------|
| Silo    | Satu database per tenant| Terkuat | Tertinggi        | N migrasi       |
| Bridge  | Satu schema per tenant  | Kuat    | Sedang           | N schema        |
| Pool    | Tabel bersama, kolom tenant_id plus row level security | Baik, jika ditegakkan | Terendah | Satu migrasi |

| Model   | Paling cocok                                                          |
|---------|-----------------------------------------------------------------------|
| Silo    | Pelanggan teregulasi, residency data kontraktual, jaminan noisy-neighbour |
| Bridge  | SaaS mid-market dengan jumlah tenant menengah dan skema yang dapat diprediksi |
| Pool    | Produk self-serve di mana tenant dibuat setiap menit                   |
```

Model pool adalah pilihan default untuk SaaS Next.js modern, dan itulah yang dibangun tutorial ini. Model ini juga merupakan model yang paling menghukum kelalaian, dan justru karena itu layak dikerjakan dengan hati-hati: satu tabel bersama berarti satu filter yang terlupa dapat melewati batas antar pelanggan.

### Memilih Model Isolasi dari Batasan Anda

Isolasi bukan sumbu yang gratis; ia bertukar dengan biaya dan kemudahan operasional. Dua pertanyaan menentukan pilihannya.

1. Apakah ada kontrak pelanggan yang mensyaratkan pemisahan fisik data, atau jaminan residency data yang tidak dapat dipenuhi tabel bersama? Jika ya, Anda memerlukan silo untuk pelanggan tersebut.
2. Apakah volume tulis per tenant cukup tinggi sehingga beban kerja satu tenant dapat membuat tenant lain kelaparan melalui connection pool bersama atau lock contention pada tabel bersama? Jika ya, pertimbangkan bridge atau silo untuk tenant berat tersebut.

Sisanya masuk ke model pool. Arsitektur praktisnya bersifat hybrid: mulai dari pooled, dan simpan model tenancy di balik sebuah interface agar pelanggan besar dapat dipindahkan ke database khusus nantinya tanpa menulis ulang produk. Keputusan desain pentingnya adalah menjadikan identitas tenant sebagai argumen kelas satu pada lapisan data Anda sejak hari pertama, karena argumen itulah jahitan tempat Anda kelak memisahkan penyimpanan.

### Me-resolve Tenant Sebelum Rendering

Resolusi tenant terjadi sekali per request, di dalam middleware, sebelum route apa pun dirender. Tugasnya adalah mengubah request masuk menjadi satu keputusan: tenant mana ini, dan route internal mana yang harus melayaninya.

```text
Request masuk: https://acme.app.example.com/dashboard
        │
        ▼
  middleware.ts
        │  ekstrak host → "acme.app.example.com"
        │  buang base domain → slug "acme"
        │  resolve slug → record tenant (di-cache)
        │  rewrite path → /t/acme/dashboard
        ▼
  app/t/[tenant]/dashboard/page.tsx   (server component)
        │  baca tenant dari header/konteks
        ▼
  lapisan data (selalu menerima tenantId)
```

Rewrite adalah bagian yang elegan. Router Anda mempertahankan satu cabang sadar tenant di bawah `app/t/[tenant]/`, sementara URL publik tetap bersih: `acme.app.example.com/dashboard` secara internal menjadi `/t/acme/dashboard`. Halaman marketing hidup di luar cabang itu dan tidak pernah membutuhkan tenant.

Dua aturan membuat ini andal. Pertama, resolve berdasarkan slug, jangan pernah berdasarkan string hostname, agar custom domain dan subdomain berbagi satu jalur kode. Kedua, perlakukan kegagalan resolusi secara eksplisit: slug yang tidak dikenal harus mengembalikan 404, bukan jatuh ke tenant default. Tenant cadangan adalah cara data demo berakhir di akun pelanggan.

### Routing Tenant dengan Subdomain dan Prefix Path

Subdomain lebih enak dibaca dan memberi Anda cookie scoping per tenant secara gratis, tetapi memerlukan DNS wildcard dan sertifikat TLS wildcard. Prefix path lebih sederhana dioperasikan dan bekerja di mana saja, termasuk preview deployment, tetapi mengotori setiap URL dan menyulitkan cookie path. Produk yang matang biasanya mendukung keduanya, dengan custom domain sebagai opsi ketiga bagi pelanggan yang lebih besar.

```text
Subdomain:      https://acme.app.example.com/dashboard
Prefix path:    https://app.example.com/t/acme/dashboard
Custom domain:  https://app.acme.com/dashboard
```

Simpan ketiga identitas tersebut pada record tenant — `slug`, `customDomain`, dan `primaryHost` — lalu resolve dengan urutan ini: kecocokan custom domain persis, lalu subdomain dari base domain, lalu prefix path. Urutan itu berarti pelanggan yang memasang custom domain tetap berjalan ketika subdomain-nya dialihkan.

### Di Mana Konteks Tenant Hidup di App Router

Middleware dapat menulis ulang request, tetapi tidak dapat menyerahkan state sembarang ke server component melalui modul bersama, karena server component dan route handler berjalan di runtime yang sama. Cara bersih untuk meneruskan identitas tenant ke hilir adalah header request yang disuntikkan middleware, lalu dibaca oleh accessor ber-scope request.

```typescript
// lib/tenant-context.ts
import { headers } from 'next/headers';
import { cache } from 'react';

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  plan: 'free' | 'team' | 'business';
  status: 'active' | 'suspended';
  branding: { primary: string; radius: number; logoSrc: string | null };
};

export type TenantContext = {
  tenant: Tenant;
  userId: string | null;
  role: 'owner' | 'admin' | 'member' | null;
};

// cache() mendeduplikasi proses pencarian dalam satu request. Tanpa ini,
// setiap komponen yang membutuhkan tenant akan memicu resolusinya sendiri.
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const h = await headers();
  const payload = h.get('x-tenant-context');
  if (!payload) return null;
  return JSON.parse(payload) as TenantContext;
});
```

Middleware adalah satu-satunya tempat yang mengetahui hostname mentah, dan juga satu-satunya tempat yang sebaiknya memutuskan apakah sebuah request boleh masuk ke route tenant. Otorisasi di sana menjadi nilai tambah: tenant yang disuspend diblokir sebelum satu baris pun dibaca.

### Men-scope Akses Data Tanpa Membocorkan Baris

Model pool hanya punya satu musuh: query yang lupa filter tenant-nya. Dua pertahanan penting, dan Anda menginginkan keduanya.

Pertahanan pertama adalah lapisan akses data yang tidak dapat dipanggil tanpa tenant. Jangan menebar `prisma.project.findMany()` di seluruh halaman; sediakan factory yang menutup atas tenant id. Dengan begitu "lupa memfilter" menjadi type error, bukan insiden produksi.

Pertahanan kedua adalah database itu sendiri. Row level security memindahkan jaminan keluar dari kode aplikasi ke Postgres, di mana filter yang terlupa mengembalikan nol baris alih-alih baris milik orang lain. Scoping di tingkat aplikasi berguna untuk ketepatan maksud; row level security berguna untuk pengekangan.

### Isolasi di Tingkat Database dengan Row Level Security

Row level security bekerja dengan menempelkan policy pada tabel dan mensyaratkan setiap statement memenuhinya. Aplikasi Anda menetapkan variabel sesi per transaksi yang menamai tenant saat ini, dan policy membandingkannya dengan `tenant_id` setiap baris.

Bagian yang halus adalah scope transaksi. `SET LOCAL` hanya berlaku di dalam sebuah transaksi, dan itu memang yang Anda inginkan: variabelnya mati bersama transaksi, sehingga koneksi yang didaur ulang dari pool tidak dapat mewarisi tenant dari request sebelumnya. Menetapkan variabel sesi biasa sebagai gantinya adalah bug klasik yang hanya muncul di bawah konkurensi, ketika request dua tenant berbagi satu koneksi pooled.

```sql
-- Setiap request berjalan di dalam transaksi yang diawali dengan statement ini.
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
```

Detail kedua: role database aplikasi tidak boleh superuser dan tidak boleh menjadi pemilik tabel, karena Postgres mengecualikan pemilik tabel dan superuser dari row level security kecuali Anda memaksanya secara aktif. Gunakan role aplikasi khusus dan jalankan migrasi dengan role pemilik yang terpisah.

### Autentikasi dan Otorisasi yang Sadar Tenant

Autentikasi menjawab "siapa ini", otorisasi menjawab "apa yang boleh ia lakukan di sini". Pada produk multi-tenant, pertanyaan kedua selalu relatif terhadap sebuah tenant, dan orang yang sama dapat memegang peran berbeda di tenant berbeda.

Modelkan ini sebagai tabel membership yang berkey pasangan user dan tenant, dengan role pada membership alih-alih pada user. Satu keputusan skema itu menghapus satu kelas bug secara keseluruhan, karena tidak ada lagi "role milik user" yang bisa keliru diterapkan pada workspace yang salah.

Middleware me-resolve membership dan menaruh role ke dalam header konteks tenant. Server action kemudian memeriksa role sebelum mengubah apa pun. Jangan pernah memercayai role yang datang di body request atau store sisi klien: turunkan ulang dari tabel membership pada setiap request, karena akses dapat dicabut di antara dua pemuatan halaman.

### Konfigurasi dan Tema per Tenant

Branding per tenant seharusnya menjadi data, bukan kode. Simpan token brand pada record tenant, render sebagai custom property CSS di layout tenant, dan biarkan satu stylesheet mengonsumsi variabel tersebut. Tanpa bundle kondisional, tanpa fork design system per tenant.

```css
/* Satu stylesheet, banyak tenant. */
:root {
  --brand-primary: #2563eb;
  --brand-radius: 12px;
}
```

Feature flag mengikuti pola yang sama. Kolom JSON `features` per tenant plus helper kecil `hasFeature(tenant, key)` menyimpan gating paket di satu tempat, dan membuatnya mudah diaudit tenant mana yang sedang menyalakan flag eksperimental.

### Caching Tanpa Kebocoran Antar Tenant

Cache Next.js dipakai bersama semua tenant, sehingga cache key yang tidak menyertakan tenant id adalah kebocoran data dengan TTL. Setiap pembacaan yang di-cache harus berkey tenant, dan setiap mutasi harus merevalidasi hanya tag tenant tersebut.

Gunakan konvensi tag yang mengodekan tenancy, misalnya `tenant:${tenantId}:projects`, dan revalidasi tag ter-scope tenant setelah mutasi. Jika Anda memakai tag global seperti `projects`, pelanggan pertama yang menyimpan record akan membatalkan cache semua orang dan Anda mendapatkan thundering herd alih-alih kebocoran — bug performa yang akan menyembunyikan bug kebenaran.

Segment route juga menyimpan cache secara agresif. Halaman di bawah `app/t/[tenant]/` sebaiknya menolak full route caching kecuali datanya benar-benar independen dari tenant, karena route yang di-cache statis lalu dilayani ke dua tenant berbeda adalah cara tercepat menyajikan data yang salah.

### Background Job, Webhook, dan Pekerjaan Terjadwal

Pekerjaan yang berjalan di luar request tidak memiliki middleware untuk me-resolve tenant, sehingga tenant id harus ikut dalam payload job. Masukkan tenant id sebagai field wajib, dan buat worker menetapkan konteks tenant yang sama seperti untuk sebuah request. Worker yang memproses job tanpa konteks tenant akan gagal memenuhi policy row level security (hasil yang baik) atau, jika ia memakai owner role, diam-diam beroperasi lintas tenant (hasil yang buruk).

Webhook masuk membalik masalahnya: tenant belum diketahui sampai Anda memverifikasi signature. Verifikasi dengan secret tenant tersebut, dan baru setelah itu percayai isi payload lainnya. Scope pencarian berdasarkan endpoint id webhook dari URL, bukan berdasarkan tenant id yang disuplai di body.

### Kuota, Pengukuran, dan Isolasi Biaya

Deployment bersama berarti tenant berbagi batas Anda. Ukur sumber daya yang memakan biaya — panggilan API, byte penyimpanan, menit background job, token AI — dan tegakkan per paket.

```text
Request → penjaga kuota (paket tenant + pemakaian periode berjalan)
              │
              ├── di bawah batas → lanjut, tambah penghitung
              └── melewati batas → 429 dengan petunjuk upgrade paket
```

Tegakkan soft limit dengan rate limiting dan hard limit dengan validasi, serta buat pembaruan penghitung idempoten agar retry tidak menagih tenant dua kali. Sama pentingnya: simpan penghitung per tenant, bukan global, atau ledakan satu pelanggan akan membatasi semua orang dan Anda salah membaca grafik pemakaian sendiri.

### Observabilitas Lintas Batas Tenant

Ketika pelanggan melaporkan masalah, pertanyaan pertama adalah "tenant mana, request mana". Lampirkan tenant id ke setiap baris log, trace span, dan laporan error pada request tersebut. Pembungkus logger terstruktur sederhana yang membaca konteks tenant sudah cukup; biaya menambahkannya belakangan, ketika Anda sedang men-debug insiden lintas tenant, jauh lebih tinggi.

Tambahkan slug tenant ke kunci pengelompokan error agar masalah bentuk data satu tenant tidak terkubur oleh volume tenant lain. Dan catat metrik per tenant untuk empat sinyal yang penting di SaaS: latensi request, tingkat error, konsumsi kuota, dan lag background job.

## Contoh Kode

File-file di bawah ini dirangkai menjadi irisan aplikasi yang berfungsi: middleware yang me-resolve dan menulis ulang, accessor konteks yang dibaca kode hilir, lapisan data ter-scope tenant, policy database yang menopangnya, query sadar-tenant yang di-cache, serta pipeline tema.

### Middleware: Resolusi Tenant dan Rewrite

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { lookupTenantByHost, lookupTenantBySlug } from '@/lib/tenants';

const BASE_DOMAIN = process.env.BASE_DOMAIN ?? 'app.example.com';
const PUBLIC_PATHS = ['/', '/pricing', '/login', '/signup', '/api/auth'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get('host') ?? '').split(':')[0];

  // 1. Custom domain lebih dulu: kecocokan persis mengalahkan slug turunan.
  let tenant = await lookupTenantByHost(host);

  // 2. Subdomain dari base domain, misalnya acme.app.example.com.
  if (!tenant && host.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = host.slice(0, -(BASE_DOMAIN.length + 1));
    tenant = await lookupTenantBySlug(slug);
  }

  // 3. Fallback prefix path, misalnya app.example.com/t/acme/dashboard.
  if (!tenant && pathname.startsWith('/t/')) {
    const slug = pathname.split('/')[2];
    if (slug) tenant = await lookupTenantBySlug(slug);
  }

  if (isPublic(pathname)) return NextResponse.next();

  // Tidak ada tenant yang ter-resolve: JANGAN jatuh ke tenant default.
  if (!tenant) return NextResponse.redirect(new URL('/login', req.url));

  if (tenant.status !== 'active') {
    return NextResponse.rewrite(new URL('/suspended', req.url));
  }

  // Rewrite idempoten: /dashboard -> /t/acme/dashboard
  const url = req.nextUrl.clone();
  if (!url.pathname.startsWith('/t/')) {
    url.pathname = `/t/${tenant.slug}${url.pathname === '/' ? '' : url.pathname}`;
  }

  const res = NextResponse.rewrite(url);
  res.headers.set('x-tenant-id', tenant.id);
  res.headers.set('x-tenant-slug', tenant.slug);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp)$).*)'],
};
```

### Konteks Tenant dan Resolusi Membership

```typescript
// lib/tenant-context.ts
import { headers } from 'next/headers';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export type Role = 'owner' | 'admin' | 'member';

export type TenantContext = {
  tenantId: string;
  slug: string;
  plan: 'free' | 'team' | 'business';
  userId: string;
  role: Role;
};

// cache() men-scope hasilnya ke satu request, sehingga N komponen yang
// me-resolve membership hanya menghasilkan satu round trip.
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const h = await headers();
  const tenantId = h.get('x-tenant-id');
  if (!tenantId) return null;

  const session = await getSession();
  if (!session?.user) return null;

  const membership = await db.membership.findFirst({
    where: { tenantId, userId: session.user.id, status: 'active' },
    select: { role: true, tenant: { select: { slug: true, plan: true, status: true } } },
  });

  if (!membership || membership.tenant.status !== 'active') return null;

  return {
    tenantId,
    slug: membership.tenant.slug,
    plan: membership.tenant.plan,
    userId: session.user.id,
    role: membership.role,
  };
});

export async function requireTenant(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) throw new Error('Tidak ada konteks tenant untuk request ini');
  return ctx;
}

export function assertRole(ctx: TenantContext, allowed: Role[]) {
  if (!allowed.includes(ctx.role)) throw new Error('Role tidak mencukupi untuk aksi ini');
}
```

### Lapisan Akses Data Ter-scope Tenant

```typescript
// lib/db-scoped.ts
import { db } from '@/lib/db';
import type { TenantContext } from '@/lib/tenant-context';

/**
 * Lapisan data ter-scope tenant. Setiap method menutup atas tenant id,
 * sehingga pemanggil secara fisik tidak dapat menulis query tanpa scope
 * terhadap model-model ini.
 */
export function scopedDb(ctx: TenantContext) {
  const tenantId = ctx.tenantId;

  return {
    listProjects: () =>
      db.project.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),

    createProject: (input: { name: string }) =>
      db.$transaction(async (tx) => {
        // Meniru apa yang dilakukan row level security di lapisan database,
        // sehingga kode yang sama tetap bekerja pada database tanpa policy
        // (misalnya SQLite saat pengujian).
        await tx.$executeRaw`select set_config('app.current_tenant_id', ${tenantId}, true)`;
        return tx.project.create({ data: { ...input, tenantId, createdBy: ctx.userId } });
      }),

    archiveProject: (projectId: string) =>
      db.project.updateMany({
        // updateMany dengan tenant di dalam filter: id yang salah memperbarui
        // 0 baris alih-alih proyek milik tenant lain.
        where: { id: projectId, tenantId },
        data: { archivedAt: new Date() },
      }),
  };
}
```

### Policy Row Level Security

```sql
-- Jalankan sebagai pemilik database, sekali, di dalam migrasi.
alter table projects        enable row level security;
alter table memberships     enable row level security;
alter table audit_logs      enable row level security;

-- Paksa policy berlaku bahkan bagi pemilik tabel: menjaga kejujuran di lokal.
alter table projects force row level security;

-- Role aplikasi tidak boleh melewati policy.
-- create role app_user login password '...' noinherit;

grant select, insert, update, delete on projects to app_user;

create policy tenant_isolation_projects on projects
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

create policy tenant_isolation_memberships on memberships
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Verifikasi dari sesi psql yang terhubung sebagai app_user:
--   begin;
--   select set_config('app.current_tenant_id', '<uuid-tenant-a>', true);
--   select count(*) from projects;  -- tidak boleh menghitung baris tenant B
--   rollback;
```

### Membangun Sesi Database Ter-scope Tenant

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Jalankan callback dengan row level security diarahkan ke satu tenant.
 * set_config(..., true) bersifat lokal transaksi, sehingga nilainya tidak
 * dapat bocor ke request berikutnya yang memakai ulang koneksi pooled ini.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
```

### Query Ter-cache yang Sadar Tenant

```typescript
// lib/queries/projects.ts
import { unstable_cache, revalidateTag } from 'next/cache';
import { withTenant } from '@/lib/db';
import type { TenantContext } from '@/lib/tenant-context';

export function listProjectsCached(ctx: TenantContext) {
  // Cache key dan tag keduanya menyertakan tenant: kelalaian di sini adalah
  // kebocoran data dengan TTL, bukan sekadar bug data basi.
  return unstable_cache(
    async () => withTenant(ctx.tenantId, (tx) => tx.project.findMany({ where: { tenantId: ctx.tenantId } })),
    ['projects', ctx.tenantId],
    { tags: [`tenant:${ctx.tenantId}:projects`], revalidate: 60 }
  )();
}

export async function invalidateProjects(ctx: TenantContext) {
  // Hanya tag ter-scope tenant: tag global akan membuat penulisan satu tenant
  // membatalkan cache seluruh tenant lain.
  revalidateTag(`tenant:${ctx.tenantId}:projects`);
}
```

### Tema dan Feature Flag per Tenant

```typescript
// app/t/[tenant]/layout.tsx
import { requireTenant } from '@/lib/tenant-context';
import { getTenantBranding } from '@/lib/tenants';
import type { ReactNode } from 'react';

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const ctx = await requireTenant();
  const branding = await getTenantBranding(ctx.tenantId);

  const style = {
    '--brand-primary': branding.primary,
    '--brand-radius': `${branding.radius}px`,
  } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-[var(--brand-surface)]">
      {children}
    </div>
  );
}
```

```typescript
// lib/features.ts
import type { TenantContext } from '@/lib/tenant-context';

const PLAN_FEATURES = {
  free: ['projects:5', 'members:3'],
  team: ['projects:50', 'members:25', 'audit-log'],
  business: ['projects:500', 'members:500', 'audit-log', 'sso', 'custom-domain'],
} as const;

export function hasFeature(ctx: TenantContext, feature: string) {
  return (PLAN_FEATURES[ctx.plan] as readonly string[]).includes(feature);
}

export function memberLimit(ctx: TenantContext) {
  const limit = PLAN_FEATURES[ctx.plan].find((f) => f.startsWith('members:'));
  return Number(limit?.split(':')[1] ?? 1);
}
```

### Server Action dengan Penjaga Role dan Kuota

```typescript
// app/t/[tenant]/projects/actions.ts
'use server';

import { revalidateTag } from 'next/cache';
import { requireTenant, assertRole } from '@/lib/tenant-context';
import { scopedDb } from '@/lib/db-scoped';
import { assertWithinQuota } from '@/lib/quota';

export async function createProject(formData: FormData) {
  const ctx = await requireTenant();
  assertRole(ctx, ['owner', 'admin']);

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 3) return { error: 'Nama proyek minimal 3 karakter' };

  const quota = await assertWithinQuota(ctx, 'projects');
  if (!quota.ok) return { error: `Batas proyek tercapai pada paket ${ctx.plan}` };

  await scopedDb(ctx).createProject({ name });
  revalidateTag(`tenant:${ctx.tenantId}:projects`);
  return { ok: true };
}
```

## Insight Penting

- Resolve tenant sekali, di middleware, dan perlakukan hasil resolusi sebagai satu-satunya sumber kebenaran tenant bagi request tersebut. Injeksi header plus accessor ber-scope request membuat server component, server action, dan route handler membaca nilai yang sama.
- Jangan pernah jatuh ke tenant default ketika pencarian gagal. Fallback mengubah bug routing menjadi pengungkapan data: kembalikan 404 untuk slug yang tidak dikenal dan biarkan alur login menanganinya.
- Isolasi seharusnya struktural, bukan bergantung kedisiplinan. Lapisan data yang tidak dapat dipanggil tanpa tenant, ditopang policy row level security, membuat filter yang terlupa gagal secara aman alih-alih membocorkan data.
- `SET LOCAL` di dalam transaksi adalah satu-satunya cara aman mengomunikasikan identitas tenant ke Postgres melalui connection pool. Variabel ber-scope sesi dapat bertahan ke request tenant berikutnya di bawah konkurensi.
- Cache key dan tag revalidasi adalah bagian dari batas keamanan Anda. Cache key tanpa tenant adalah kebocoran lintas tenant dengan TTL, dan tag revalidasi global adalah bug pembatasan yang menunggu terjadi.
- Role melekat pada membership, bukan pada user. Orang yang sama bisa menjadi owner di satu workspace dan member di workspace lain, dan pemodelan itu memasangkan dua dimensi identitas pada tingkat skema.
- Branding, flag, dan kuota tenant semuanya sebaiknya menjadi data pada record tenant. Setiap percabangan di kode aplikasi adalah tempat di mana konfigurasi pelanggan di masa depan kehilangan satu kasus.
- Pengukuran per tenant adalah yang menjaga deployment bersama tetap sehat secara ekonomi: kuota melindungi margin Anda, dan penghitung per tenant mencegah lonjakan trafik satu pelanggan membatasi semua orang lain.

## Langkah Berikutnya

- Implementasikan jalur penyimpanan hybrid: pertahankan skema pooled sebagai default dan tambahkan kolom `tenant.storageMode` agar pelanggan enterprise dapat dipindahkan ke database khusus tanpa fork produk.
- Tambahkan penegakan di tingkat koneksi untuk role aplikasi, dan tambahkan uji integrasi yang menjalankan query sebagai tenant A sambil terautentikasi sebagai tenant B, lalu memastikan nol baris.
- Perluas row level security ke lapisan penyimpanan objek. Key objek sebaiknya berprefix tenant id, dan signed URL hanya dibuat setelah memeriksa membership.
- Tambahkan rate limiting sadar tenant di tepi agar penyalahgunaan dari satu workspace tidak mengonsumsi anggaran kapasitas bersama.
- Bangun permukaan admin untuk siklus hidup tenant: masa percobaan berakhir, suspend, perubahan paket, dan ekspor data satu tenant. Ini adalah operasi yang Anda butuhkan pada hari pertama memiliki basis pelanggan nyata.
- Tambahkan audit log yang ditulis dari transaksi ter-scope tenant yang sama dengan mutasinya, sehingga log dan perubahan tidak dapat berbeda.

## Kesimpulan

Multi-tenancy di Next.js sebagian besar adalah pertanyaan tentang di mana Anda meletakkan batas isolasi. Middleware me-resolve tenant dan menulis ulang URL ke satu pohon route sadar tenant; accessor ber-scope request membuat keputusan itu tersedia di mana saja tanpa pencarian berulang; lapisan data ter-scope membuat query tanpa scope tidak dapat diekspresikan; dan row level security menjamin pengekangan bahkan ketika kode aplikasi keliru.

Bagian sisanya mengikuti prinsip yang sama. Cache, job, kuota, dan log semuanya membutuhkan tenant id secara eksplisit, karena masing-masing adalah tempat di mana konteks mudah hilang dan di mana kehilangan itu menghasilkan kebocoran yang ingin Anda cegah. Bangun batas-batas tersebut dengan sengaja, simpan tenancy di balik sebuah interface agar penyimpanan dapat dipisah nanti, dan deployment yang sama dapat melayani sepuluh pelanggan atau sepuluh ribu tanpa penulisan ulang.

---
title: "Panduan Internasionalisasi (i18n) dan Lokalisasi SvelteKit"
description: "Panduan komprehensif untuk menerapkan dukungan multi-bahasa dalam aplikasi SvelteKit — mencakup routing berbasis lokal, manajemen terjemahan, SEO, dukungan RTL, dan deployment produksi."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Internasionalisasi (i18n) dan Lokalisasi SvelteKit

## Pendahuluan

Internasionalisasi (i18n) adalah proses merancang sebuah aplikasi agar dapat beradaptasi dengan berbagai bahasa, wilayah, dan konvensi budaya tanpa memerlukan perubahan kode. Untuk aplikasi SvelteKit yang melayani audiens global, strategi i18n yang dirancang dengan baik sangat penting untuk memberikan pengalaman yang natural bagi pengguna di berbagai lokal.

Sistem routing SvelteKit yang fleksibel, kemampuan server-side rendering, dan API `svelte:head` yang kaya menjadikannya platform yang sangat baik untuk membangun aplikasi multi-bahasa. Namun, implementasi i18n di SvelteKit melibatkan beberapa keputusan arsitektural — bagaimana menyusun rute berbasis lokal, mendeteksi preferensi bahasa pengguna, mengelola file terjemahan, dan mengoptimalkan mesin pencari untuk berbagai bahasa.

Panduan ini mencakup pola-pola tingkat produksi untuk menginternasionalisasi aplikasi SvelteKit. Anda akan mempelajari cara menyiapkan routing yang sadar lokal, mengelola terjemahan secara efisien, menangani bahasa kanan-ke-kiri (RTL), menerapkan praktik terbaik SEO untuk situs multi-bahasa, dan menguji implementasi i18n Anda. Pada akhirnya, Anda akan memiliki arsitektur i18n yang dapat digunakan kembali dan dapat diskalakan dari dua bahasa hingga puluhan bahasa.

## Praktik Terbaik

### 1. Gunakan Routing Berbasis URL untuk Lokal

Selalu encode lokal pengguna dalam jalur URL daripada hanya mengandalkan cookie, header `Accept-Language`, atau deteksi sisi klien saja. Routing berbasis URL memberikan beberapa keuntungan:

- **URL yang dapat dibagikan**: Tautan ke `/fr/produits` selalu menampilkan versi Prancis, terlepas dari pengaturan peramban penerima.
- **Kompatibilitas SEO**: Mesin pencari mengindeks setiap varian bahasa sebagai halaman terpisah dengan URL-nya sendiri, yang merupakan fondasi untuk anotasi `hreflang`.
- **Server-side rendering**: Lokal tersedia segera selama SSR tanpa memerlukan penguraian cookie atau inspeksi header pada setiap permintaan.

```text
https://example.com/id/produk
https://example.com/en/products
https://example.com/fr/produits
https://example.com/de/produkte
```

Gunakan grup rute SvelteKit dengan parameter `[locale]` untuk mengatur rute spesifik lokal:

```text
src/routes/
  [locale]/
    +layout.svelte       # Membungkus semua halaman lokal dengan penyedia i18n
    +layout.server.ts    # Memuat terjemahan untuk lokal saat ini
    +page.svelte         # Halaman beranda (spesifik lokal)
    about/
      +page.svelte       # Halaman tentang (spesifik lokal)
    products/
      [slug]/
        +page.svelte     # Detail produk (spesifik lokal)
```

### 2. Sentralisasikan Manajemen Terjemahan

Simpan terjemahan di direktori khusus menggunakan struktur JSON datar yang diatur berdasarkan lokal dan namespace. Hindari menyematkan string terjemahan langsung di komponen — ini membuat audit, pembaruan, dan penambahan bahasa menjadi rentan terhadap kesalahan.

```text
src/
  lib/
    i18n/
      locales/
        id/
          common.json      # String UI bersama (tombol, label, navigasi)
          home.json         # String khusus halaman beranda
          products.json     # String terkait produk
          errors.json       # Pesan kesalahan dan validasi
        en/
          common.json
          home.json
          products.json
          errors.json
        fr/
          common.json
          home.json
          products.json
          errors.json
      index.ts             # Setup dan inisialisasi i18n
      utils.ts             # Fungsi bantuan (deteksi lokal, pemformatan)
```

Setiap file namespace mengikuti struktur key-value datar:

```json
{
  "nav.home": "Beranda",
  "nav.products": "Produk",
  "nav.about": "Tentang Kami",
  "nav.contact": "Kontak",
  "cta.learnMore": "Pelajari Lebih Lanjut",
  "cta.getStarted": "Mulai",
  "footer.copyright": "© {year} Perusahaan Saya. Hak cipta dilindungi."
}
```

### 3. Muat Terjemahan Secara Lazy Per Rute

Jangan pernah menggabungkan semua terjemahan ke dalam muatan JavaScript awal. Muat hanya namespace terjemahan yang diperlukan untuk halaman saat ini. Fungsi `load` server SvelteKit adalah tempat yang ideal untuk mengambil terjemahan:

```typescript
// src/routes/[locale]/+layout.server.ts
import type { LayoutServerLoad } from './$types';

const namespaceMap: Record<string, string[]> = {
  '/': ['common', 'home'],
  '/about': ['common'],
  '/products': ['common', 'products'],
  '/contact': ['common'],
};

export const load: LayoutServerLoad = async ({ params, url }) => {
  const locale = params.locale;
  const path = url.pathname.replace(`/${locale}`, '') || '/';
  const namespaces = namespaceMap[path] ?? ['common'];

  const translations: Record<string, Record<string, string>> = {};
  for (const ns of namespaces) {
    translations[ns] = await import(`$lib/i18n/locales/${locale}/${ns}.json`);
  }

  return { locale, translations };
};
```

### 4. Gunakan Store atau Context Svelte untuk Akses Sisi Klien

Kirimkan terjemahan melalui data load SvelteKit sehingga tersedia di server dan klien. Gunakan store writable atau context untuk menyediakan terjemahan di seluruh pohon komponen:

```typescript
// src/lib/i18n/index.ts
import { writable, derived } from 'svelte/store';
import type { Writable } from 'svelte/store';

export type Locale = 'id' | 'en' | 'fr' | 'de' | 'ar';
export type Translations = Record<string, Record<string, string>>;

export const currentLocale: Writable<Locale> = writable('id');
export const translations: Writable<Translations> = writable({});

export const t = derived(
  [currentLocale, translations],
  ([$locale, $translations]) => {
    return (key: string, params?: Record<string, string | number>): string => {
      for (const ns of Object.values($translations)) {
        if (ns[key]) {
          let result = ns[key];
          if (params) {
            Object.entries(params).forEach(([k, v]) => {
              result = result.replace(`{${k}}`, String(v));
            });
          }
          return result;
        }
      }
      return key; // fallback: kembalikan key itu sendiri
    };
  }
);
```

### 5. Implementasikan Deteksi Lokal dengan Rantai Fallback

Deteksi lokal pilihan pengguna di server menggunakan header `Accept-Language`, kemudian fallback melalui rantai yang dapat dikonfigurasi. Simpan lokal yang terdeteksi dalam cookie untuk mempertahankan pilihan pengguna di seluruh sesi:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

const SUPPORTED_LOCALES = ['id', 'en', 'fr', 'de', 'ar'];
const DEFAULT_LOCALE = 'id';

function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const preferred = acceptLanguage
    .split(',')
    .map(lang => {
      const [locale, q = 'q=1'] = lang.trim().split(';');
      const quality = parseFloat(q.split('=')[1] || '1');
      return { locale: locale.split('-')[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of preferred) {
    if (SUPPORTED_LOCALES.includes(locale)) return locale;
  }
  return DEFAULT_LOCALE;
}

export const handle: Handle = async ({ event, resolve }) => {
  const { locale: pathLocale } = event.params;

  if (pathLocale && SUPPORTED_LOCALES.includes(pathLocale)) {
    event.locals.locale = pathLocale;
  } else if (!pathLocale) {
    // Redirect root ke lokal yang terdeteksi
    const detected = event.cookies.get('locale') ||
      detectLocale(event.request.headers.get('accept-language'));
    return new Response(null, {
      status: 302,
      headers: { location: `/${detected}${event.url.pathname}` },
    });
  }

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%lang%', event.locals.locale ?? DEFAULT_LOCALE),
  });
};
```

### 6. Siapkan Metadata SEO dengan hreflang dan URL Kanonikal

Mesin pencari membutuhkan sinyal eksplisit untuk memahami hubungan antara halaman dalam bahasa yang berbeda. Gunakan `svelte:head` untuk menyuntikkan anotasi `hreflang` dan URL kanonikal yang merujuk pada diri sendiri:

```svelte
<!-- src/routes/[locale]/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { SUPPORTED_LOCALES } from '$lib/i18n';

  let { data, children } = $props();
  $: baseUrl = 'https://example.com';
  $: currentPath = $page.url.pathname.replace(`/${data.locale}`, '') || '/';
  $: canonical = `${baseUrl}/${data.locale}${currentPath}`;
</script>

<svelte:head>
  <title>{data.seo?.title ?? 'Aplikasi Saya'}</title>
  <meta name="description" content={data.seo?.description ?? ''} />
  <link rel="canonical" href={canonical} />
  {#each SUPPORTED_LOCALES as locale}
    <link
      rel="alternate"
      hreflang={locale}
      href={`${baseUrl}/${locale}${currentPath}`}
    />
  {/each}
  <link rel="alternate" hreflang="x-default" href={`${baseUrl}/en${currentPath}`} />
</svelte:head>

{@render children()}
```

### 7. Gunakan String Terjemahan Berparameter untuk Konten Dinamis

Hindari penggabungan string untuk nilai dinamis seperti nama pengguna, jumlah, atau tanggal. Gunakan string berparameter dengan placeholder dan biarkan sistem terjemahan menangani urutan kata yang tepat untuk setiap bahasa:

```json
{
  "cart.itemCount": "Anda memiliki {count} item di keranjang",
  "greeting": "Halo, {name}!",
  "product.price": "Harga: {amount} {currency}"
}
```

Gunakan store derived `t` dari modul i18n:

```svelte
<script lang="ts">
  let { t } = $props();
</script>

<p>{$t('cart.itemCount', { count: items.length })}</p>
<p>{$t('greeting', { name: user.name })}</p>
```

### 8. Tangani Bahasa Kanan-ke-Kiri (RTL)

Saat mendukung bahasa RTL seperti Arab atau Ibrani, atur atribut `dir` pada elemen HTML dan muat CSS spesifik RTL. Simpan arah teks bersama dengan lokal:

```typescript
// src/lib/i18n/utils.ts
export const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

export function getDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}
```

Terapkan arah di layout root:

```svelte
<!-- src/routes/[locale]/+layout.svelte -->
<script lang="ts">
  import { getDirection } from '$lib/i18n/utils';
  let { data, children } = $props();
  $: dir = getDirection(data.locale);
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="app" dir={dir}>
  {@render children()}
</div>
```

Gunakan properti CSS logis (`margin-inline-start`, `padding-inline-end`) alih-alih properti fisik (`margin-left`, `padding-right`) sehingga tata letak secara otomatis terbalik untuk lokal RTL.

### 9. Format Tanggal, Angka, dan Mata Uang dengan API Intl

Gunakan API `Intl` JavaScript native untuk pemformatan yang sadar lokal alih-alih penguraian tanggal/angka manual. API `Intl` tersedia di semua peramban modern dan Node.js:

```typescript
// src/lib/i18n/utils.ts
export function formatDate(date: Date | string, locale: string, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(d);
}

export function formatCurrency(amount: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(number: number, locale: string, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(number);
}
```

### 10. Uji I18n Secara Menyeluruh

Uji bahwa setiap lokal merender dengan benar, terjemahan lengkap, dan logika deteksi serta perpindahan lokal berfungsi. Tulis pengujian otomatis di tiga tingkat:

**Pengujian unit untuk kelengkapan terjemahan:**

```typescript
// src/lib/i18n/locales/__tests__/translations.test.ts
import { describe, it, expect } from 'vitest';
import idCommon from '../id/common.json';
import enCommon from '../en/common.json';
import frCommon from '../fr/common.json';

const LOCALES = { id: idCommon, en: enCommon, fr: frCommon };

describe('kelengkapan terjemahan', () => {
  it('semua lokal memiliki key yang sama dengan bahasa Indonesia', () => {
    const idKeys = Object.keys(idCommon).sort();
    for (const [locale, translations] of Object.entries(LOCALES)) {
      if (locale === 'id') continue;
      const keys = Object.keys(translations).sort();
      expect(keys).toEqual(idKeys);
    }
  });

  it('tidak ada key terjemahan yang bernilai kosong', () => {
    for (const [locale, translations] of Object.entries(LOCALES)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(value, `${locale}.${key} kosong`).not.toBe('');
      }
    }
  });
});
```

**Pengujian E2E untuk perpindahan lokal:**

```typescript
// tests/i18n.spec.ts
import { test, expect } from '@playwright/test';

test.describe('internasionalisasi', () => {
  test('halaman beranda redirect ke lokal yang terdeteksi', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toMatch(/\/\w{2}\/?$/);
  });

  test('pemilih lokal mengganti bahasa', async ({ page }) => {
    await page.goto('/id');
    await page.click('[data-testid="locale-switcher-en"]');
    await expect(page).toHaveURL(/\/en/);
  });

  test('tautan hreflang ada di head', async ({ page }) => {
    await page.goto('/id/tentang');
    const alternates = await page.locator('link[rel="alternate"]').all();
    expect(alternates.length).toBeGreaterThanOrEqual(2);
  });
});
```

## Langkah Implementasi

### Langkah 1: Siapkan Struktur Proyek

Buat proyek SvelteKit baru atau gunakan yang sudah ada, lalu siapkan struktur direktori i18n:

```bash
npm create svelte@latest my-i18n-app
cd my-i18n-app
npm install
mkdir -p src/lib/i18n/locales/{id,en,fr,de,ar}
```

Buat file terjemahan awal untuk namespace `common`:

```json
// src/lib/i18n/locales/id/common.json
{
  "nav.home": "Beranda",
  "nav.about": "Tentang",
  "nav.contact": "Kontak",
  "cta.learnMore": "Pelajari Lebih Lanjut",
  "footer.copyright": "© {year} Perusahaan Saya. Hak cipta dilindungi."
}
```

```json
// src/lib/i18n/locales/en/common.json
{
  "nav.home": "Home",
  "nav.about": "About",
  "nav.contact": "Contact",
  "cta.learnMore": "Learn More",
  "footer.copyright": "© {year} MyCompany. All rights reserved."
}
```

### Langkah 2: Buat Modul I18n

Buat modul inisialisasi i18n inti yang menyediakan fungsi terjemahan dan status lokal:

```typescript
// src/lib/i18n/index.ts
import { writable, derived, get } from 'svelte/store';
import type { Readable, Writable } from 'svelte/store';

export const SUPPORTED_LOCALES = ['id', 'en', 'fr', 'de', 'ar'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationsMap = Record<string, Record<string, string>>;

export const currentLocale: Writable<Locale> = writable('id');
export const translations: Writable<TranslationsMap> = writable({});

export const t: Readable<(key: string, params?: Record<string, string | number>) => string> = derived(
  [currentLocale, translations],
  ([$locale, $translations]) => {
    return (key: string, params?: Record<string, string | number>): string => {
      for (const ns of Object.values($translations)) {
        if (key in ns) {
          let result = ns[key];
          if (params) {
            for (const [k, v] of Object.entries(params)) {
              result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            }
          }
          return result;
        }
      }
      console.warn(`Key terjemahan tidak ditemukan: ${key} untuk lokal: ${$locale}`);
      return key;
    };
  }
);

export function setLocale(locale: Locale): void {
  currentLocale.set(locale);
}
```

### Langkah 3: Buat Hook Deteksi Lokal

Siapkan hook server untuk mendeteksi bahasa pengguna dan mengarahkan ulang permintaan yang tidak dilokalkan:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { SUPPORTED_LOCALES } from '$lib/i18n';

const DEFAULT_LOCALE = 'id';

function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const parsed = acceptLanguage
    .split(',')
    .map(entry => {
      const [locale, qPart = 'q=1'] = entry.trim().split(';');
      const quality = parseFloat(qPart.split('=')[1]) || 1;
      return { locale: locale.split('-')[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of parsed) {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
}

export const handle: Handle = async ({ event, resolve }) => {
  const { locale: pathLocale } = event.params as { locale?: string };

  if (pathLocale && (SUPPORTED_LOCALES as readonly string[]).includes(pathLocale)) {
    event.locals.locale = pathLocale;
  } else {
    const detected = event.cookies.get('locale') || detectLocale(
      event.request.headers.get('accept-language')
    );
    const url = new URL(event.request.url);
    return Response.redirect(`${url.origin}/${detected}${url.pathname}${url.search}`, 302);
  }

  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%lang%', event.locals.locale),
  });

  return response;
};
```

Tambahkan tipe `locale` ke deklarasi tipe aplikasi Anda:

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      locale: string;
    }
  }
}
export {};
```

Perbarui `app.html` root untuk menggunakan placeholder lokal:

```html
<!DOCTYPE html>
<html lang="%lang%">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-prerender="true">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

### Langkah 4: Implementasikan Layout Lokal dengan Fungsi Load

Buat layout grup rute `[locale]` dengan server load untuk mengambil terjemahan:

```typescript
// src/routes/[locale]/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { SUPPORTED_LOCALES } from '$lib/i18n';

const DEFAULT_NAMESPACES = ['common'] as const;
const ROUTE_NAMESPACES: Record<string, readonly string[]> = {
  '/': ['common', 'home'],
  '/about': ['common'],
  '/products': ['common', 'products'],
};

export const load: LayoutServerLoad = async ({ params, url, locals }) => {
  const locale = params.locale;

  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    throw new Error(`Lokal tidak didukung: ${locale}`);
  }

  const path = url.pathname.replace(`/${locale}`, '') || '/';
  const namespaces = ROUTE_NAMESPACES[path] ?? DEFAULT_NAMESPACES;

  const translations: Record<string, Record<string, string>> = {};
  for (const ns of namespaces) {
    try {
      translations[ns] = await import(`$lib/i18n/locales/${locale}/${ns}.json`);
    } catch {
      // Fallback ke bahasa Inggris untuk file namespace yang tidak ada
      translations[ns] = await import(`$lib/i18n/locales/en/${ns}.json`);
    }
  }

  return {
    locale,
    translations,
    seo: {
      title: translations.common?.['seo.title'] ?? 'Aplikasi Saya',
      description: translations.common?.['seo.description'] ?? '',
    },
  };
};
```

```svelte
<!-- src/routes/[locale]/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { currentLocale, translations, SUPPORTED_LOCALES } from '$lib/i18n';
  import { getDirection } from '$lib/i18n/utils';
  import type { Locale } from '$lib/i18n';

  let { data, children } = $props();

  $: currentLocale.set(data.locale as Locale);
  $: translations.set(data.translations);
  $: dir = getDirection(data.locale);
  $: baseUrl = 'https://example.com';
  $: currentPath = $page.url.pathname.replace(`/${data.locale}`, '') || '/';

  function switchLocale(newLocale: string) {
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.href = `/${newLocale}${currentPath}`;
  }
</script>

<svelte:head>
  <title>{data.seo?.title}</title>
  <meta name="description" content={data.seo?.description ?? ''} />
  <link rel="canonical" href={`${baseUrl}/${data.locale}${currentPath}`} />
  {#each SUPPORTED_LOCALES as locale}
    <link
      rel="alternate"
      hreflang={locale}
      href={`${baseUrl}/${locale}${currentPath}`}
    />
  {/each}
  <link rel="alternate" hreflang="x-default" href={`${baseUrl}/en${currentPath}`} />
</svelte:head>

<div class="app" dir={dir}>
  <nav>
    <a href="/{data.locale}/">Beranda</a>
    <a href="/{data.locale}/about">Tentang</a>
    <div class="locale-switcher">
      {#each SUPPORTED_LOCALES as locale}
        <button
          data-testid="locale-switcher-{locale}"
          class:active={locale === data.locale}
          onclick={() => switchLocale(locale)}
        >
          {locale.toUpperCase()}
        </button>
      {/each}
    </div>
  </nav>

  <main>
    {@render children()}
  </main>
</div>

<style>
  .locale-switcher {
    display: flex;
    gap: 0.5rem;
  }
  .locale-switcher button.active {
    font-weight: bold;
    text-decoration: underline;
  }
</style>
```

### Langkah 5: Buat Halaman Spesifik Lokal

Setiap halaman di bawah grup rute `[locale]` secara otomatis mewarisi konteks lokal. Buat halaman beranda yang dilokalkan:

```typescript
// src/routes/[locale]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  return {
    heroTitle: 'hero.title',  // key terjemahan
    heroDescription: 'hero.description',
  };
};
```

```svelte
<!-- src/routes/[locale]/+page.svelte -->
<script lang="ts">
  import { t } from '$lib/i18n';

  let { data } = $props();
</script>

<h1>{$t(data.heroTitle)}</h1>
<p>{$t(data.heroDescription)}</p>

<button>{$t('cta.learnMore')}</button>
```

### Langkah 6: Konfigurasikan Pre-rendering Statis untuk Rute Lokal

Jika konten Anda statis (misalnya, situs pemasaran), pre-render semua kombinasi lokal untuk kinerja optimal. Konfigurasikan opsi prerender SvelteKit:

```typescript
// src/routes/[locale]/+layout.ts
export const prerender = 'auto';
```

Untuk situs statis penuh, tambahkan jalur lokal ke konfigurasi SvelteKit:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
    prerender: {
      entries: [
        '/id', '/en', '/fr', '/de', '/ar',
        '/id/about', '/en/about', '/fr/about',
      ],
    },
  },
};

export default config;
```

### Langkah 7: Uji Implementasi I18n

Tulis pengujian untuk memverifikasi kelengkapan terjemahan, deteksi lokal, dan perpindahan lokal:

```bash
npm run test:unit
npm run test:e2e
```

### Langkah 8: Tambahkan Skrip Manajemen Terjemahan

Buat skrip CLI untuk mengaudit terjemahan yang hilang di berbagai lokal. Ini mencegah string yang tidak diterjemahkan mencapai produksi:

```typescript
// scripts/audit-translations.ts
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(import.meta.dirname, '../src/lib/i18n/locales');
const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const idDir = join(LOCALES_DIR, 'id');
const idFiles = readdirSync(idDir).filter(f => f.endsWith('.json'));

let hasMissing = false;

for (const file of idFiles) {
  const idContent = JSON.parse(readFileSync(join(idDir, file), 'utf-8'));
  const idKeys = Object.keys(idContent).sort();

  for (const locale of locales) {
    if (locale === 'id') continue;
    const localeFile = join(LOCALES_DIR, locale, file);
    if (!existsSync(localeFile)) {
      console.error(`❌ ${locale}/${file} tidak ditemukan`);
      hasMissing = true;
      continue;
    }
    const localeContent = JSON.parse(readFileSync(localeFile, 'utf-8'));
    const localeKeys = Object.keys(localeContent).sort();
    const missing = idKeys.filter(k => !localeKeys.includes(k));
    const extra = localeKeys.filter(k => !idKeys.includes(k));
    if (missing.length) {
      console.error(`❌ ${locale}/${file} — key hilang: ${missing.join(', ')}`);
      hasMissing = true;
    }
    if (extra.length) {
      console.warn(`⚠️  ${locale}/${file} — key tambahan: ${extra.join(', ')}`);
    }
  }
}

if (hasMissing) {
  process.exit(1);
} else {
  console.log('✅ Semua terjemahan lengkap');
}
```

Tambahkan skrip audit ke `package.json`:

```json
{
  "scripts": {
    "i18n:audit": "tsx scripts/audit-translations.ts"
  }
}
```

Jalankan secara rutin di CI untuk menangkap terjemahan yang hilang:

```bash
npm run i18n:audit
```

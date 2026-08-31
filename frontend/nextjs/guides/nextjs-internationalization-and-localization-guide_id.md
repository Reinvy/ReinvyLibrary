---
title: "Panduan Internasionalisasi (i18n) dan Lokalisasi Next.js"
description: "Panduan praktik terbaik dan langkah implementasi untuk menambahkan internasionalisasi (i18n) dan lokalisasi pada aplikasi Next.js App Router: routing berbasis locale, deteksi middleware, kamus pesan, dan SEO yang dilokalkan."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Internasionalisasi (i18n) dan Lokalisasi Next.js

## Pendahuluan

Mengirimkan aplikasi Next.js ke audiens global berarti lebih dari sekadar menerjemahkan beberapa label. Internasionalisasi (i18n) menyentuh routing, rendering, metadata, format nomor dan tanggal, bahkan arah tata letak halaman. Dengan App Router, Next.js tidak lagi mendukung objek konfigurasi `i18n` lama dari era Pages Router — pendekatan yang direkomendasikan adalah routing berbasis URL yang dibangun di atas segmen dinamis `[locale]`, dikombinasikan dengan middleware untuk deteksi bahasa dan sistem pesan untuk konten terjemahan. Panduan ini membakukan arsitektur tersebut: cara menyusun rute yang sadar locale, cara mendeteksi dan menyimpan preferensi bahasa pengguna, cara mengelola kamus pesan secara efisien, dan cara menjaga metadata SEO tetap benar untuk setiap locale. Contoh-contoh menggunakan `next-intl`, library i18n yang paling banyak diadopsi untuk App Router, sekaligus menunjukkan bagian internalnya agar Anda memahami apa yang diabstraksi oleh library tersebut.

## Praktik Terbaik

### 1. Gunakan Segmen `[locale]` untuk Routing Berbasis URL

Tempatkan locale di URL sebagai segmen path pertama sehingga setiap rute berada di bawah `/en/...` atau `/id/...`. Direktori `[locale]` di akar `app/` memberi Anda layout, halaman, dan metadata per locale tanpa sihir framework:

```text
app/
  [locale]/
    layout.tsx
    page.tsx
    about/
      page.tsx
    products/
      [slug]/
        page.tsx
  sitemap.ts
  globals.css
```

Routing sub-path adalah opsi paling sederhana dan paling kokoh: mudah dirayapi mesin pencari, mudah dibagikan, dan bebas dari race condition cookie ataupun header. Ada alternatif — satu domain per locale (`example.com` vs `example.co.id`) atau routing berbasis query parameter — tetapi keduanya menambah beban infrastruktur dan kompleksitas SEO dengan manfaat yang kecil bagi kebanyakan aplikasi.

### 2. Pusatkan Deteksi Locale di Middleware

Pengguna seharusnya mendarat di bahasa yang tepat tanpa mengonfigurasi apa pun. Middleware berjalan sebelum setiap request yang cocok, sehingga tempat ini adalah lokasi alami untuk menentukan locale melalui rantai prioritas: cookie eksplisit (diatur oleh pengalih bahasa) lebih dulu, kemudian header `Accept-Language`, lalu default yang di-hard-code. Matcher harus mengecualikan route API, aset statis, dan semua yang berada di bawah `_next`; jika tidak, Anda akan mengarahkan ulang file yang seharusnya tidak pernah diarahkan ulang.

### 3. Simpan Semua String UI dalam Kamus Pesan Terstruktur

Jangan pernah menulis string yang terlihat pengguna secara hard-code di komponen. Semua salinan berada dalam satu kamus JSON per locale, diorganisir berdasarkan namespace sehingga komponen mengambil pesan yang benar-benar dibutuhkan:

```json
{
  "Navigation": {
    "home": "Home",
    "products": "Products",
    "about": "About"
  },
  "HomePage": {
    "heroTitle": "Fresh coffee, delivered worldwide",
    "cta": "Browse products"
  }
}
```

Kamus membuat terjemahan mudah ditinjau, mendukung perkakas otomatis (ekstraksi kunci, diffing, terjemahan mesin), dan menjaga teks UI tetap di luar logika bisnis. Konvensi penamaan kunci yang stabil — `NamaKomponen.namaPesan` — lebih berharga daripada fitur library mana pun.

### 4. Gunakan Library yang Dirancang Khusus untuk Aplikasi Kompleks

Membangun i18n sendiri memang menggoda untuk aplikasi dua locale, tetapi `next-intl` (atau padanannya seperti `react-i18next` + `i18next`) terbukti layak dipakai begitu Anda membutuhkan plural, rich text, tanggal per locale, atau paralelisme client-server. `next-intl` terintegrasi langsung dengan primitif App Router: `getTranslations` dan `getFormatter` di server, `useTranslations` di client, `NextIntlClientProvider` untuk bundle client, dan `createMiddleware` untuk deteksi. Jika Anda tetap lebih suka setup minimal, jaga internalnya tetap disiplin: satu loader pesan scoped-per-request, union tipe kunci, dan tidak ada pemanggilan terjemahan di luar React.

### 5. Utamakan Static Rendering untuk Rute Locale

Segmen `[locale]` hanyalah segmen dinamis — Anda dapat me-render statis setiap locale saat build dengan `generateStaticParams` yang mengembalikan daftar locale. Static rendering memberi Anda HTML per locale yang bisa di-cache CDN, first paint instan, dan tanpa biaya server per request. Pilih dynamic rendering untuk rute locale hanya jika rute tersebut benar-benar membutuhkan data waktu-request. Dengan `output: "export"`, pendekatan yang sama otomatis menghasilkan file statis per locale.

### 6. Lokalkan Metadata dan SEO dengan hreflang dan Canonical URL

Mesin pencari perlu tahu varian URL mana yang mewakili halaman yang sama dalam bahasa berbeda. Metadata API Next.js mendukung ini secara native: `alternates.languages` memetakan prefiks locale ke URL-nya, dan generator mengeluarkan tag `<link rel="alternate" hreflang="...">` plus URL canonical. Tambahkan `sitemap.ts` yang dilokalkan agar setiap varian locale dari setiap rute dapat ditemukan, dan atur `openGraph.locale` agar perender sosial menampilkan metadata dalam bahasa yang benar.

### 7. Format Tanggal, Angka, dan Mata Uang dengan API Intl

Bahasa tidak sepakat soal urutan tanggal, pemisah desimal, maupun posisi mata uang. API `Intl` ECMAScript — `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat` — mengodekan aturan-aturan locale ini dan tersedia di setiap runtime yang ditargetkan Next.js. Di server, `getFormatter` dari `next-intl` mengeksposnya dengan aman menggunakan locale aktif; di client data yang sama tersedia melalui `useFormatter`. Jangan pernah memformat mata uang dengan penggabungan string atau pola hard-code; selalu serahkan ke formatter yang sadar locale.

### 8. Tangani Locale Kanan-ke-Kiri (RTL)

Melokalkan ke bahasa Arab, Ibrani, atau Persia berarti membalik arah dokumen. Atur `dir` pada elemen `<html>` berdasarkan locale aktif, dan gunakan properti CSS logis (`margin-inline-start`, `padding-inline-end`, `inset-inline`) daripada properti fisik (`margin-left`, `right`) agar tata letak bercermin secara otomatis. Uji RTL sejak awal — layout yang rusak secara visual dalam mode RTL adalah bug lokalisasi meskipun semua string sudah diterjemahkan.

### 9. Lokalkan Segmen Dinamis dan Slug

`/en/products/aeropress` dan `/id/produk/aeropress` adalah URL yang berbeda untuk sumber daya yang sama. Simpan peta slug per locale di lapisan data Anda, render rute dari slug yang dilokalkan, dan pecahkan entitas kanoniknya sebelum melakukan rendering. `generateStaticParams` kemudian harus mengembalikan satu entri per locale agar setiap varian di-prerender (atau di-revalidasi) secara independen.

### 10. Gunakan String Terjemahan Berparameter dan Sadar Plural

String terjemahan membutuhkan parameter dan plural yang memahami tata bahasa. Gunakan parameter bergaya ICU daripada penggabungan string, dan biarkan sistem pesan menangani aturan plural yang sangat bervariasi antar bahasa (Inggris punya satu bentuk plural, Indonesia tidak punya, Rusia punya beberapa):

```json
{
  "CartPage": {
    "itemCount": "{count, plural, =0 {Your cart is empty} one {# item in your cart} other {# items in your cart}}"
  }
}
```

Rich text yang bercampur dengan markup sebaiknya melalui API rich-text library (misalnya `t.rich`), yang menjaga pesan tetap sebagai data sambil tetap merender tautan dan penekanan secara inline.

### 11. Muat Hanya Pesan dari Locale Aktif

Mengirim semua bahasa ke setiap client memboroskan byte dan memperlambat hidrasi. Karena kamus pesan hanyalah import JSON, `import()` dinamis per locale pada waktu request menjaga bundle setiap request tetap berisi satu kamus — pola yang didukung baik oleh `next-intl` maupun setup buatan sendiri. Jaga kamus tetap berbentuk namespace agar code splitting dapat melangkah lebih jauh jika suatu locale tumbuh besar.

### 12. Uji Internasionalisasi Secara Menyeluruh

Bug lokalisasi bersifat senyap: halaman tetap tampil, rute tetap berfungsi, tetapi bahasa yang salah — atau plural yang rusak — lolos tanpa ketahuan. Uji setiap rute terhadap setiap locale, pastikan atribut `<html lang>` dan `dir` benar, verifikasi pengalih bahasa berputar melalui URL, periksa perilaku fallback untuk locale yang tidak diketahui, dan tambahkan tes kunci-hilang yang menggagalkan build ketika namespace mana pun melenceng dari paritas antar kamus.

## Langkah Implementasi

Panduan berikut membangun toko daring yang terinternasionalisasi: halaman beranda, halaman tentang, rute detail produk yang dilokalkan dengan slug terjemahan, pengalih bahasa, metadata SEO yang dilokalkan, sitemap, dan skrip pemeriksa paritas. Kami menggunakan `next-intl` untuk pesan dan helper routing.

### Langkah 1: Siapkan Proyek dan Pasang Dependensi

Buat proyek App Router baru dengan TypeScript dan pasang `next-intl`:

```bash
npx create-next-app@latest i18n-storefront --typescript --app --eslint --src-dir
cd i18n-storefront
npm install next-intl
```

Sisa panduan ini mengasumsikan struktur direktori `src/`, yang menjaga `app/`, `i18n/`, dan `lib/` sebagai saudara sekelas.

### Langkah 2: Tentukan Konfigurasi Locale dan Kamus Pesan

Buat satu sumber kebenaran untuk locale yang didukung di `src/i18n/routing.ts`:

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "id"],
  defaultLocale: "en",
  localePrefix: "always"
});

export type Locale = (typeof routing.locales)[number];
```

`localePrefix: "always"` berarti setiap URL membawa locale-nya (`/en/...`, `/id/...`) — pilihan paling aman untuk keterayapan dan kebenaran cache. Berikutnya, buat kamus-kamusnya:

```json
{
  "Navigation": {
    "home": "Beranda",
    "products": "Produk",
    "about": "Tentang"
  },
  "HomePage": {
    "heroTitle": "Kopi segar, dikirim ke seluruh dunia",
    "cta": "Jelajahi produk"
  },
  "AboutPage": {
    "title": "Tentang kami",
    "body": "Kami menyangrai dan mengirim kopi spesialti dari 30 daerah asal."
  },
  "ProductPage": {
    "backToProducts": "Kembali ke produk",
    "price": "Harga",
    "addToCart": "Tambah ke keranjang"
  },
  "CartPage": {
    "itemCount": "{count, plural, =0 {Keranjang Anda kosong} other {# item di keranjang Anda}}"
  },
  "LocaleSwitcher": {
    "label": "Bahasa"
  }
}
```

```json
{
  "Navigation": {
    "home": "Home",
    "products": "Products",
    "about": "About"
  },
  "HomePage": {
    "heroTitle": "Fresh coffee, delivered worldwide",
    "cta": "Browse products"
  },
  "AboutPage": {
    "title": "About us",
    "body": "We roast and ship specialty coffee from 30 origins."
  },
  "ProductPage": {
    "backToProducts": "Back to products",
    "price": "Price",
    "addToCart": "Add to cart"
  },
  "CartPage": {
    "itemCount": "{count, plural, =0 {Your cart is empty} one {# item in your cart} other {# items in your cart}}"
  },
  "LocaleSwitcher": {
    "label": "Language"
  }
}
```

Simpan keduanya sebagai `messages/id.json` dan `messages/en.json`. Menjaga struktur kunci yang sama di semua locale sangat penting — pemeriksa paritas di Langkah 10 akan menegakkannya.

### Langkah 3: Hubungkan Loader Pesan Waktu-Request

`next-intl` membutuhkan cara untuk menyelesaikan pesan locale aktif untuk setiap request. Buat `src/i18n/request.ts`:

```typescript
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

`hasLocale` melindungi dari nilai locale palsu yang datang di URL, dengan jatuh ke default alih-alih membuat aplikasi crash. Import dinamis memastikan hanya kamus aktif yang dimuat per request.

### Langkah 4: Konfigurasi Middleware untuk Deteksi Locale

Buat `src/middleware.ts` untuk mendeteksi locale dan menulis ulang request ke cabang `[locale]` yang benar:

```typescript
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)"
};
```

Middleware `next-intl` mengimplementasikan rantai deteksi secara otomatis: pertama memeriksa cookie `NEXT_LOCALE`, lalu header `Accept-Language`, dan terakhir locale default, dengan mengarahkan ulang `/` ke `/en` atau `/id` sesuai hasilnya. Matcher mengecualikan route API, aset internal `_next`, dan URL apa pun yang mengandung titik (file). Di Next.js 16 file ini diubah namanya menjadi `proxy.ts` — matcher dan logika yang sama tetap berlaku.

### Langkah 5: Buat Helper Import dan Root Layout

Tambahkan helper navigasi yang sadar locale, sehingga `Link` dan `useRouter` selalu menghasilkan URL dengan prefiks yang benar. Buat `src/i18n/navigation.ts`:

```typescript
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

Sekarang layout locale, `src/app/[locale]/layout.tsx`:

```typescript
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/language-switcher";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <NextIntlClientProvider>
          <LanguageSwitcher />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`generateStaticParams` membuat setiap locale di-render statis saat build. `NextIntlClientProvider` menyediakan terjemahan dan pemformatan ke komponen client tanpa mengirim seluruh kumpulan kamus. Atribut `dir` diturunkan dari locale — perluas kondisinya ke bahasa RTL lain yang didukung aplikasi Anda.

### Langkah 6: Bangun Halaman yang Sadar Locale

Server Component membaca terjemahan dengan `getTranslations`. Buat `src/app/[locale]/page.tsx`:

```typescript
import { getTranslations } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";

export default async function HomePage() {
  const t = await getTranslations("HomePage");

  return (
    <main>
      <h1>{t("heroTitle")}</h1>
      <a href="#products">{t("cta")}</a>
      <ProductGrid />
    </main>
  );
}
```

Bahkan parameter tidak perlu dibaca di halaman — locale diselesaikan dari konteks request oleh provider yang disiapkan di Langkah 3. Komponen client menggunakan hook `useTranslations` yang sepadan:

```typescript
"use client";

import { useTranslations } from "next-intl";

export function AddToCartButton() {
  const t = useTranslations("ProductPage");

  return <button>{t("addToCart")}</button>;
}
```

### Langkah 7: Lokalkan Rute Dinamis dengan Slug Terjemahan

Model produk dengan slug per locale dan nama tampilan yang dilokalkan. Buat `src/lib/products.ts`:

```typescript
export type Product = {
  id: string;
  slugs: Record<string, string>;
  name: Record<string, string>;
  price: number;
};

export const products: Product[] = [
  {
    id: "aeropress",
    slugs: { en: "aeropress", id: "aeropress" },
    name: { en: "AeroPress Coffee Maker", id: "Pembuat Kopi AeroPress" },
    price: 39
  },
  {
    id: "grinder",
    slugs: { en: "hand-grinder", id: "penggiling-tangan" },
    name: { en: "Hand Coffee Grinder", id: "Penggiling Kopi Tangan" },
    price: 79
  }
];

export function findProductBySlug(slug: string, locale: string) {
  return products.find((product) => product.slugs[locale] === slug);
}
```

Lalu handler rute di `src/app/[locale]/products/[slug]/page.tsx`:

```typescript
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { products, findProductBySlug } from "@/lib/products";

export function generateStaticParams() {
  return products.flatMap((product) =>
    Object.entries(product.slugs).map(([locale, slug]) => ({ locale, slug }))
  );
}

export default async function ProductPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const product = findProductBySlug(slug, locale);
  if (!product) {
    notFound();
  }

  const t = await getTranslations("ProductPage");

  return (
    <main>
      <h1>{product.name[locale]}</h1>
      <p>{t("price")}: {product.price}</p>
    </main>
  );
}
```

Slug setiap locale merender halaman statisnya sendiri, dan slug yang salah untuk locale aktif mengembalikan alur 404 yang dilokalkan.

### Langkah 8: Tambahkan Pengalih Bahasa

Pengalih harus mempertahankan rute saat ini antar bahasa dan menyimpan pilihan di cookie `NEXT_LOCALE` agar middleware menghormatinya pada kunjungan berikutnya. Buat `src/components/language-switcher.tsx`:

```typescript
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useTransition } from "react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <label>
      <select
        defaultValue={locale}
        disabled={isPending}
        onChange={onSelectChange}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {loc === "en" ? "English" : "Bahasa Indonesia"}
          </option>
        ))}
      </select>
    </label>
  );
}
```

Karena `usePathname` dan `useRouter` berasal dari `createNavigation`, router tahu cara menulis ulang path saat ini ke locale baru dan cookie middleware diatur secara otomatis, sehingga pilihan tetap melekat antar request.

### Langkah 9: Konfigurasi Metadata, hreflang, dan Sitemap

Hasilkan metadata yang dilokalkan dari tingkat halaman. Untuk halaman tentang, `src/app/[locale]/about/page.tsx`:

```typescript
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("AboutPage");

  return {
    title: t("title"),
    description: t("body"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: {
        en: "/en/about",
        id: "/id/tentang"
      }
    },
    openGraph: {
      locale: locale === "id" ? "id_ID" : "en_US"
    }
  };
}
```

Peta `alternates.languages` inilah yang menghasilkan tag `<link rel="alternate" hreflang="en">` dan `hreflang="id"` untuk halaman tersebut. Berikutnya, sitemap yang sadar locale di `src/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) => [
    { url: `${BASE_URL}/${locale}`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/${locale}/about`, changeFrequency: "monthly", priority: 0.8 }
  ]);
}
```

Setiap varian locale diiklankan ke mesin pencari, dan setiap URL membawa prefiks yang benar karena `localePrefix: "always"` menjaga URL tanpa locale agar tidak pernah menjadi canonical.

### Langkah 10: Tambahkan Pemeriksa Paritas Terjemahan

Kunci yang hilang di satu locale gagal secara senyap saat runtime. Tambahkan skrip kecil yang menggagalkan build ketika kamus melenceng, `scripts/check-i18n-parity.mjs`:

```javascript
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const messagesDir = join(process.cwd(), "messages");
const files = readdirSync(messagesDir).filter((f) => f.endsWith(".json"));
const dicts = files.map((f) => JSON.parse(readFileSync(join(messagesDir, f), "utf8")));
const reference = dicts[0];

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

const referenceKeys = new Set(flatten(reference));
let failed = false;

for (let i = 1; i < dicts.length; i++) {
  const keys = new Set(flatten(dicts[i]));
  const missing = [...referenceKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !referenceKeys.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${files[i]} drift:`, { missing, extra });
  }
}

if (failed) process.exit(1);
console.log("i18n parity OK");
```

Kaitkan ke dalam skrip package agar setiap build dan run CI menegakkan paritas:

```json
{
  "scripts": {
    "i18n:check": "node scripts/check-i18n-parity.mjs",
    "build": "next build && npm run i18n:check"
  }
}
```

### Langkah 11: Uji Aplikasi yang Terinternasionalisasi

Tambahkan proyek Playwright per locale sehingga setiap rute diuji dalam setiap bahasa. `playwright.config.ts` minimal:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  projects: [
    { name: "en", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000/en" } },
    { name: "id", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000/id" } }
  ]
});
```

Uji perilaku kritisnya: setiap locale merender kontennya sendiri, pengalih mempertahankan rute saat berganti bahasa, locale dan slug yang tidak dikenal masuk ke alur 404, pengalihan berbasis `Accept-Language` bekerja dengan benar, dan atribut `<html lang>` cocok dengan locale. Jalankan pemeriksa paritas, tes, dan build produksi sebelum menggabungkan — aplikasi terinternasionalisasi hanya selesai ketika setiap locale terverifikasi, bukan hanya yang default.

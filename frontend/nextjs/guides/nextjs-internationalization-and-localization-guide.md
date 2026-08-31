---
title: "Next.js Internationalization (i18n) and Localization Guide"
description: "Best practices and step-by-step implementation guide for adding internationalization (i18n) and localization to Next.js App Router applications: locale routing, middleware detection, message dictionaries, and localized SEO."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Next.js Internationalization (i18n) and Localization Guide

## Introduction

Shipping a Next.js application to a global audience means more than translating a few labels. Internationalization (i18n) touches routing, rendering, metadata, formatting, and even layout direction. With the App Router, Next.js no longer supports the legacy `i18n` config object from the Pages Router era — instead, the recommended approach is URL-based locale routing built on a dynamic `[locale]` segment, combined with middleware for locale detection and a messages system for translated content. This guide codifies that architecture: how to structure locale-aware routes, how to detect and persist the user's language preference, how to manage message dictionaries efficiently, and how to keep SEO metadata correct for every locale. The examples use `next-intl`, the most widely adopted i18n library for the App Router, while also showing the minimal internals so you understand what the library abstracts away.

## Best Practices

### 1. Use a `[locale]` Segment for URL-Based Locale Routing

Put the locale in the URL as the first path segment so every route lives under `/en/...` or `/id/...`. A `[locale]` directory at the root of `app/` gives you per-locale layouts, pages, and metadata without framework magic:

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

Sub-path routing is the simplest and most robust option: it is crawlable, shareable, and free of cookie/header races. Alternatives exist — domain-per-locale routing (`example.com` vs `example.co.id`) or query-parameter routing — but they add infrastructure and SEO complexity for little benefit in most applications.

### 2. Centralize Locale Detection in Middleware

Users should land on the right language without configuring anything. Middleware runs before every matched request, so it is the natural place to decide the locale from a priority chain: an explicit cookie (set by the language switcher) first, then the `Accept-Language` header, then a hard-coded default. The matcher must exclude API routes, static assets, and anything under `_next`, otherwise you redirect files that should never be redirected.

### 3. Keep Every UI String in Structured Message Dictionaries

Never hard-code user-facing strings in components. All copy lives in one JSON dictionary per locale, organized by namespace so components pull exactly the messages they need:

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

Dictionaries make translations reviewable, enable tooling (extraction, diffing, machine translation), and keep the UI text out of business logic. A stable key naming convention — `ComponentName.messageName` — is more valuable than any library feature.

### 4. Use a Purpose-Built Library for Complex Applications

Rolling your own i18n is tempting for two-locale apps, but `next-intl` (or an equivalent like `react-i18next` + `i18next`) earns its place as soon as you need plurals, rich text, per-locale dates, or client-server parity. `next-intl` integrates directly with App Router primitives: `getTranslations` and `getFormatter` on the server, `useTranslations` on the client, `NextIntlClientProvider` for client bundles, and `createMiddleware` for detection. If you still prefer a minimal setup, keep the internals disciplined: one request-scoped messages loader, a typed key union, and no translation calls outside React.

### 5. Prefer Static Rendering for Locale Routes

A `[locale]` segment is just a dynamic segment — you can statically render every locale at build time with `generateStaticParams` returning the available locales. Static rendering gives you CDN-cacheable HTML per locale, instant first paint, and no server cost per request. Only opt into dynamic rendering for locale routes that genuinely need request-time data. With `output: "export"`, the same approach emits a static file per locale automatically.

### 6. Localize Metadata and SEO with hreflang and Canonical URLs

Search engines need to know which URL variants represent the same page in different languages. The Next.js Metadata API supports this natively: `alternates.languages` maps locale prefixes to their URLs, and the generator emits `<link rel="alternate" hreflang="...">` tags plus a canonical URL. Add a localized `sitemap.ts` so every locale variant of every route is discoverable, and set `openGraph.locale` so social scrapers render the correct language metadata.

### 7. Format Dates, Numbers, and Currencies with the Intl API

Languages disagree on date order, decimal separators, and currency placement. The ECMAScript `Intl` API — `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat` — encodes these locale rules and is built into every runtime Next.js targets. On the server, `getFormatter` from `next-intl` exposes these safely with the active locale; on the client the same data is available through `useFormatter`. Never format currency with string concatenation or a hard-coded pattern; always delegate to the locale-aware formatter.

### 8. Handle Right-to-Left (RTL) Locales

Localizing into Arabic, Hebrew, or Persian means flipping the document direction. Set `dir` on the `<html>` element from the active locale, and prefer CSS logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline`) over physical ones (`margin-left`, `right`) so layouts mirror automatically. Test RTL early — a layout that visually breaks in RTL is a localization bug even when every string is translated.

### 9. Localize Dynamic Segments and Slugs

`/en/products/aeropress` and `/id/produk/aeropress` are different URLs for the same resource. Keep a per-locale slug map in your data layer, render the route from the localized slug, and resolve the canonical entity before rendering. `generateStaticParams` must then return one entry per locale so every variant is prerendered (or revalidated) independently.

### 10. Use Parameterized and Plurals-Aware Translation Strings

Translation strings need placeholders and grammar-aware plurals. Use ICU-style parameters rather than string concatenation, and let the messages system handle plural rules, which differ wildly between languages (English has one plural form, Indonesian none, Russian several):

```json
{
  "CartPage": {
    "itemCount": "{count, plural, =0 {Your cart is empty} one {# item in your cart} other {# items in your cart}}"
  }
}
```

Rich-text mixed with markup should go through the library's rich-text API (e.g., `t.rich`), which keeps the message as data while still rendering links and emphasis inline.

### 11. Load Only the Active Locale's Messages

Shipping all languages to every client wastes bytes and slows hydration. Because message dictionaries are just JSON imports, dynamic `import()` per locale at request time keeps each request's bundle to a single dictionary — a pattern both `next-intl` and hand-rolled setups support. Keep dictionaries namespace-shaped so code splitting can go further if a locale ever grows large.

### 12. Test Internationalization Thoroughly

Localization bugs are silent: a page renders, a route works, but the wrong language — or a broken plural — slips through. Test every route against every locale, assert the `<html lang>` and `dir` attributes, verify the language switcher round-trips through the URL, check fallback behavior for unknown locales, and add a missing-key test that fails the build when any namespace drifts out of parity between dictionaries.

## Implementation Steps

The following walk-through builds an internationalized storefront: a home page, an about page, a localized product detail route with translated slugs, a language switcher, localized SEO metadata, a sitemap, and a parity check script. We use `next-intl` for messages and routing helpers.

### Step 1: Scaffold the Project and Install Dependencies

Create a new App Router project with TypeScript and install `next-intl`:

```bash
npx create-next-app@latest i18n-storefront --typescript --app --eslint --src-dir
cd i18n-storefront
npm install next-intl
```

The rest of this guide assumes the `src/` directory layout, which keeps `app/`, `i18n/`, and `lib/` siblings.

### Step 2: Define Locale Configuration and Message Dictionaries

Create a single source of truth for the supported locales in `src/i18n/routing.ts`:

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "id"],
  defaultLocale: "en",
  localePrefix: "always"
});

export type Locale = (typeof routing.locales)[number];
```

`localePrefix: "always"` means every URL carries its locale (`/en/...`, `/id/...`) — the safest choice for crawlability and cache correctness. Next, create the dictionaries:

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

Save these as `messages/en.json` and `messages/id.json`. Keeping the same key structure across locales is essential — the parity check in Step 10 enforces it.

### Step 3: Wire Up the Request-Time Messages Loader

`next-intl` needs a way to resolve the active locale's messages for every request. Create `src/i18n/request.ts`:

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

`hasLocale` guards against bogus locale values arriving in the URL, falling back to the default locale instead of crashing. The dynamic import ensures only the active dictionary is loaded per request.

### Step 4: Configure Middleware for Locale Detection

Create `src/middleware.ts` to detect the locale and rewrite the request into the right `[locale]` branch:

```typescript
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)"
};
```

`next-intl`'s middleware implements the detection chain automatically: it checks the `NEXT_LOCALE` cookie first, then the `Accept-Language` header, and finally the default locale, redirecting `/` to `/en` or `/id` as appropriate. The matcher excludes API routes, internal `_next` assets, and any URL containing a dot (files). In Next.js 16 the file is renamed to `proxy.ts` — the same matcher and logic apply.

### Step 5: Create the Import Helpers and Root Layout

Add navigation helpers that are locale-aware, so `Link` and `useRouter` always produce URLs with the correct prefix. Create `src/i18n/navigation.ts`:

```typescript
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

Now the locale layout, `src/app/[locale]/layout.tsx`:

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

`generateStaticParams` makes every locale statically rendered at build time. `NextIntlClientProvider` makes translations and formatting available to client components without sending the whole dictionary set. The `dir` attribute is derived from the locale — extend the condition to any RTL language your app supports.

### Step 6: Build Locale-Aware Pages

Server Components read translations with `getTranslations`. Create `src/app/[locale]/page.tsx`:

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

The parameters do not even need to be read on the page — the locale is resolved from the request context by the provider set up in Step 3. Client components use the matching `useTranslations` hook:

```typescript
"use client";

import { useTranslations } from "next-intl";

export function AddToCartButton() {
  const t = useTranslations("ProductPage");

  return <button>{t("addToCart")}</button>;
}
```

### Step 7: Localize Dynamic Routes with Translated Slugs

Model products with per-locale slugs and localized display names. Create `src/lib/products.ts`:

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

Then the route handler at `src/app/[locale]/products/[slug]/page.tsx`:

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

Each locale's slug renders its own static page, and a wrong slug for the active locale returns the localized 404 flow.

### Step 8: Add a Language Switcher

The switcher must preserve the current route across languages and persist the choice in the `NEXT_LOCALE` cookie so middleware honors it on the next visit. Create `src/components/language-switcher.tsx`:

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

Because `usePathname` and `useRouter` come from `createNavigation`, the router knows how to rewrite the current path under the new locale and the middleware cookie is set automatically, keeping the choice sticky across requests.

### Step 9: Configure Metadata, hreflang, and the Sitemap

Generate localized metadata from the page level. For the about page, `src/app/[locale]/about/page.tsx`:

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

The `alternates.languages` map is what produces the `<link rel="alternate" hreflang="en">` and `hreflang="id"` tags for the page. Next, a locale-aware sitemap at `src/app/sitemap.ts`:

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

Every locale variant is advertised to search engines, and each URL carries the correct prefix because `localePrefix: "always"` keeps locale-less URLs from ever being canonical.

### Step 10: Add a Translation Parity Check

A missing key in one locale fails silently at runtime. Add a small script that fails the build when the dictionaries drift, `scripts/check-i18n-parity.mjs`:

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

Hook it into the package scripts so every build and CI run enforces parity:

```json
{
  "scripts": {
    "i18n:check": "node scripts/check-i18n-parity.mjs",
    "build": "next build && npm run i18n:check"
  }
}
```

### Step 11: Test the Internationalized App

Add Playwright projects per locale so every route is exercised in every language. A minimal `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  projects: [
    { name: "en", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000/en" } },
    { name: "id", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000/id" } }
  ]
});
```

Test the critical behaviors: each locale renders its own copy, the switcher preserves the route when changing languages, unknown locales and slugs hit the 404 flow, `Accept-Language` routing redirects correctly, and the `<html lang>` attribute matches the locale. Run the parity check, the tests, and the production build before merging — an internationalized app is only done when every locale is verified, not just the default one.

---
title: "SvelteKit Internationalization (i18n) and Localization Guide"
description: "A comprehensive guide to implementing multi-language support in SvelteKit applications — covering locale routing, translation management, SEO, RTL support, and production deployment."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# SvelteKit Internationalization (i18n) and Localization Guide

## Introduction

Internationalization (i18n) is the process of designing an application so it can adapt to different languages, regions, and cultural conventions without requiring code changes. For SvelteKit applications serving a global audience, a well-architected i18n strategy is essential for providing a native experience to users across different locales.

SvelteKit's flexible routing system, server-side rendering capabilities, and rich `svelte:head` API make it an excellent platform for building multi-language applications. However, implementing i18n in SvelteKit involves several architectural decisions — how to structure locale-based routes, detect user language preferences, manage translation files, and optimize for search engines across languages.

This guide covers production-grade patterns for internationalizing SvelteKit applications. You will learn how to set up locale-aware routing, manage translations efficiently, handle right-to-left (RTL) languages, implement SEO best practices for multi-language sites, and test your i18n implementation. By the end, you will have a reusable i18n architecture that scales from two languages to dozens.

## Best Practices

### 1. Use URL-Based Locale Routing

Always encode the user's locale in the URL path rather than relying on cookies, `Accept-Language` headers, or client-side detection alone. URL-based locale routing provides several advantages:

- **Shareable URLs**: A link to `/fr/produits` always displays the French version, regardless of the recipient's browser settings.
- **SEO compatibility**: Search engines index each language variant as a separate page with its own URL, which is the foundation for `hreflang` annotations.
- **Server-side rendering**: The locale is available immediately during SSR without requiring cookie parsing or header inspection on every request.

```text
https://example.com/en/products
https://example.com/fr/produits
https://example.com/de/produkte
https://example.com/ja/products
```

Use SvelteKit's route groups with a `[locale]` parameter to organize locale-specific routes:

```text
src/routes/
  [locale]/
    +layout.svelte       # Wraps all locale pages with i18n provider
    +layout.server.ts    # Loads translations for the current locale
    +page.svelte         # Homepage (locale-specific)
    about/
      +page.svelte       # About page (locale-specific)
    products/
      [slug]/
        +page.svelte     # Product detail (locale-specific)
```

### 2. Centralize Translation Management

Store translations in a dedicated directory using a flat JSON structure organized by locale and namespace. Avoid embedding translation strings directly in components — this makes auditing, updating, and adding languages error-prone.

```text
src/
  lib/
    i18n/
      locales/
        en/
          common.json      # Shared UI strings (buttons, labels, nav)
          home.json        # Homepage-specific strings
          products.json    # Product-related strings
          errors.json      # Error messages and validation
        fr/
          common.json
          home.json
          products.json
          errors.json
        de/
          common.json
          home.json
          products.json
          errors.json
      index.ts             # i18n setup and initialization
      utils.ts             # Helper functions (locale detection, formatting)
```

Each namespace file follows a flat key-value structure:

```json
{
  "nav.home": "Home",
  "nav.products": "Products",
  "nav.about": "About Us",
  "nav.contact": "Contact",
  "cta.learnMore": "Learn More",
  "cta.getStarted": "Get Started",
  "footer.copyright": "© {year} MyCompany. All rights reserved."
}
```

### 3. Lazy-Load Translations Per Route

Never bundle all translations into the initial JavaScript payload. Load only the translation namespaces needed for the current page. SvelteKit's server `load` functions are the ideal place to fetch translations:

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

### 4. Use a Svelte Store or Context for Client-Side Access

Pass translations through SvelteKit's load data so they are available on both the server and client. Use a writable store or context to provide translations throughout the component tree:

```typescript
// src/lib/i18n/index.ts
import { writable, derived } from 'svelte/store';
import type { Writable } from 'svelte/store';

export type Locale = 'en' | 'fr' | 'de' | 'ja' | 'ar';
export type Translations = Record<string, Record<string, string>>;

export const currentLocale: Writable<Locale> = writable('en');
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
      return key; // fallback: return the key itself
    };
  }
);
```

### 5. Implement Locale Detection with Fallback Chain

Detect the user's preferred locale on the server using the `Accept-Language` header, then fall back through a configurable chain. Store the detected locale in a cookie to persist the user's choice across sessions:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'ja', 'ar'];
const DEFAULT_LOCALE = 'en';

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
    // Redirect root to detected locale
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

### 6. Set Up SEO Metadata with hreflang and Canonical URLs

Search engines need explicit signals to understand the relationship between pages in different languages. Use `svelte:head` to inject `hreflang` annotations and self-referencing canonical URLs:

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
  <title>{data.seo?.title ?? 'My App'}</title>
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

### 7. Use Parameterized Translation Strings for Dynamic Content

Avoid string concatenation for dynamic values like user names, counts, or dates. Use parameterized strings with placeholders and let the translation system handle proper word order for each language:

```json
{
  "cart.itemCount": "You have {count} item(s) in your cart",
  "greeting": "Hello, {name}!",
  "product.price": "Price: {amount} {currency}"
}
```

In French, the word order might differ:

```json
{
  "cart.itemCount": "Vous avez {count} articles dans votre panier",
  "greeting": "Bonjour, {name}!",
  "product.price": "Prix : {amount} {currency}"
}
```

Use the `t` derived store from the i18n module:

```svelte
<script lang="ts">
  let { t } = $props();
</script>

<p>{t('cart.itemCount', { count: items.length })}</p>
<p>{t('greeting', { name: user.name })}</p>
```

### 8. Handle Right-to-Left (RTL) Languages

When supporting RTL languages like Arabic or Hebrew, set the `dir` attribute on the HTML element and load RTL-specific CSS. Store the text direction alongside the locale:

```typescript
// src/lib/i18n/utils.ts
export const RTL_LOCALES = ['ar', 'he', 'fa', 'ur'];

export function getDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}
```

Apply the direction in the root layout:

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

Use logical CSS properties (`margin-inline-start`, `padding-inline-end`) instead of physical ones (`margin-left`, `padding-right`) so layouts automatically flip for RTL locales.

### 9. Format Dates, Numbers, and Currencies with Intl API

Use the native JavaScript `Intl` API for locale-aware formatting instead of manual date/number parsing. The `Intl` API is available in all modern browsers and Node.js:

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

### 10. Test I18n Thoroughly

Test that every locale renders correctly, translations are complete, and the locale detection and switching logic works. Write automated tests at three levels:

**Unit test for translation completeness:**

```typescript
// src/lib/i18n/locales/__tests__/translations.test.ts
import { describe, it, expect } from 'vitest';
import enCommon from '../en/common.json';
import frCommon from '../fr/common.json';
import deCommon from '../de/common.json';

const LOCALES = { en: enCommon, fr: frCommon, de: deCommon };

describe('translation completeness', () => {
  it('all locales have the same keys as English', () => {
    const enKeys = Object.keys(enCommon).sort();
    for (const [locale, translations] of Object.entries(LOCALES)) {
      if (locale === 'en') continue;
      const keys = Object.keys(translations).sort();
      expect(keys).toEqual(enKeys);
    }
  });

  it('no translation key has empty value', () => {
    for (const [locale, translations] of Object.entries(LOCALES)) {
      for (const [key, value] of Object.entries(translations)) {
        expect(value, `${locale}.${key} is empty`).not.toBe('');
      }
    }
  });
});
```

**E2E test for locale switching:**

```typescript
// tests/i18n.spec.ts
import { test, expect } from '@playwright/test';

test.describe('internationalization', () => {
  test('homepage redirects to detected locale', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toMatch(/\/\w{2}\/?$/);
  });

  test('locale switcher changes language', async ({ page }) => {
    await page.goto('/en');
    await page.click('[data-testid="locale-switcher-fr"]');
    await expect(page).toHaveURL(/\/fr/);
    await expect(page.locator('h1')).toContainText('Bienvenue');
  });

  test('hreflang links are present in head', async ({ page }) => {
    await page.goto('/en/about');
    const alternates = await page.locator('link[rel="alternate"]').all();
    expect(alternates.length).toBeGreaterThanOrEqual(2);
  });
});
```

## Implementation Steps

### Step 1: Set Up the Project Structure

Create a new SvelteKit project or use an existing one, then set up the i18n directory structure:

```bash
npm create svelte@latest my-i18n-app
cd my-i18n-app
npm install
mkdir -p src/lib/i18n/locales/{en,fr,de,ja,ar}
```

Create the initial translation files for the `common` namespace:

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

```json
// src/lib/i18n/locales/fr/common.json
{
  "nav.home": "Accueil",
  "nav.about": "À propos",
  "nav.contact": "Contact",
  "cta.learnMore": "En savoir plus",
  "footer.copyright": "© {year} MyCompany. Tous droits réservés."
}
```

### Step 2: Create the I18n Module

Create the core i18n initialization module that provides the translation function and locale state:

```typescript
// src/lib/i18n/index.ts
import { writable, derived, get } from 'svelte/store';
import type { Readable, Writable } from 'svelte/store';

export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'ja', 'ar'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationsMap = Record<string, Record<string, string>>;

export const currentLocale: Writable<Locale> = writable('en');
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
      console.warn(`Missing translation key: ${key} for locale: ${$locale}`);
      return key;
    };
  }
);

export function setLocale(locale: Locale): void {
  currentLocale.set(locale);
}
```

### Step 3: Create the Locale Detection Hook

Set up the server hook to detect the user's language and redirect unlocalized requests:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { SUPPORTED_LOCALES } from '$lib/i18n';

const DEFAULT_LOCALE = 'en';

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

Add the `locale` type to your app's type declarations:

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

Update the root `app.html` to use the locale placeholder:

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

### Step 4: Implement the Locale Layout with Load Functions

Create the `[locale]` route group layout with server load to fetch translations:

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
    throw new Error(`Unsupported locale: ${locale}`);
  }

  const path = url.pathname.replace(`/${locale}`, '') || '/';
  const namespaces = ROUTE_NAMESPACES[path] ?? DEFAULT_NAMESPACES;

  const translations: Record<string, Record<string, string>> = {};
  for (const ns of namespaces) {
    try {
      translations[ns] = await import(`$lib/i18n/locales/${locale}/${ns}.json`);
    } catch {
      // Fallback to English for missing namespace files
      translations[ns] = await import(`$lib/i18n/locales/en/${ns}.json`);
    }
  }

  return {
    locale,
    translations,
    seo: {
      title: translations.common?.['seo.title'] ?? 'My App',
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
    <a href="/{data.locale}/">Home</a>
    <a href="/{data.locale}/about">About</a>
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

### Step 5: Create Locale-Specific Pages

Each page under the `[locale]` route group automatically inherits the locale context. Create a localized homepage:

```typescript
// src/routes/[locale]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  return {
    heroTitle: 'hero.title',  // translation key
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

### Step 6: Add Locale-Specific Product Pages with Slug Translations

For content that needs translated slugs (e.g., `/en/products/phone` and `/fr/produits/telephone`), use a mapping from canonical slugs to locale-specific slugs:

```typescript
// src/lib/i18n/utils.ts
export const SLUG_MAP: Record<string, Record<string, string>> = {
  en: {
    'smartphone': 'smartphone',
    'laptop': 'laptop',
    'headphones': 'headphones',
  },
  fr: {
    'smartphone': 'smartphone',
    'laptop': 'ordinateur-portable',
    'headphones': 'casque-audio',
  },
  de: {
    'smartphone': 'smartphone',
    'laptop': 'laptop',
    'headphones': 'kopfhorer',
  },
};

export function getLocalizedSlug(canonicalSlug: string, locale: string): string {
  return SLUG_MAP[locale]?.[canonicalSlug] ?? canonicalSlug;
}

export function getCanonicalSlug(localizedSlug: string, locale: string): string {
  const reverseMap = Object.entries(SLUG_MAP[locale] ?? {}).reduce(
    (acc, [canonical, localized]) => {
      acc[localized] = canonical;
      return acc;
    },
    {} as Record<string, string>
  );
  return reverseMap[localizedSlug] ?? localizedSlug;
}
```

```typescript
// src/routes/[locale]/products/[slug]/+page.server.ts
import type { PageServerLoad } from './$types';
import { getCanonicalSlug } from '$lib/i18n/utils';

export const load: PageServerLoad = async ({ params }) => {
  const canonicalSlug = getCanonicalSlug(params.slug, params.locale);
  // Fetch product data using the canonical slug
  const product = await getProductBySlug(canonicalSlug);
  return { product };
};
```

```svelte
<!-- src/routes/[locale]/products/[slug]/+page.svelte -->
<script lang="ts">
  import { t } from '$lib/i18n';

  let { data } = $props();
</script>

<h1>{data.product.name}</h1>
<p>{$t('product.price', { amount: data.product.price, currency: data.product.currency })}</p>
```

### Step 7: Configure Static Prerendering for Locale Routes

If your content is static (e.g., a marketing site), prerender all locale combinations for optimal performance. Configure SvelteKit's prerender options:

```typescript
// src/routes/[locale]/+layout.ts
export const prerender = 'auto';
```

For fully static sites, add the locale paths to the SvelteKit config:

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
        '/en', '/fr', '/de', '/ja', '/ar',
        '/en/about', '/fr/about', '/de/about',
      ],
    },
  },
};

export default config;
```

### Step 8: Add a Sitemap with Locale-Specific URLs

Generate a sitemap that includes all language variants of each page. Create a sitemap endpoint:

```typescript
// src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from './$types';
import { SUPPORTED_LOCALES } from '$lib/i18n';

const BASE_URL = 'https://example.com';
const PAGES = ['', '/about', '/products', '/contact'];

export const GET: RequestHandler = async () => {
  const urls = PAGES.flatMap(page =>
    SUPPORTED_LOCALES.map(locale =>
      `  <url>\n    <loc>${BASE_URL}/${locale}${page}</loc>\n  </url>`
    )
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600',
    },
  });
};
```

### Step 9: Test the I18n Implementation

Write tests to verify translation completeness, locale detection, and locale switching:

```bash
npm run test:unit
npm run test:e2e
```

Create a locale test page utility for manual verification:

```svelte
<!-- src/routes/debug/locale/+page.svelte -->
<script lang="ts">
  import { currentLocale, translations, t } from '$lib/i18n';
  import { getDirection, formatDate, formatCurrency } from '$lib/i18n/utils';

  let { data } = $props();
</script>

<h1>Locale Debug</h1>
<p>Current locale: {$currentLocale}</p>
<p>Direction: {getDirection($currentLocale)}</p>
<p>Translation test: {$t('nav.home')}</p>
<p>Date: {formatDate(new Date(), $currentLocale)}</p>
<p>Currency: {formatCurrency(1234.56, $currentLocale, 'USD')}</p>
```

### Step 10: Add a Translation Management Script

Create a CLI script to audit missing translations across locales. This prevents untranslated strings from reaching production:

```typescript
// scripts/audit-translations.ts
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(import.meta.dirname, '../src/lib/i18n/locales');
const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const enDir = join(LOCALES_DIR, 'en');
const enFiles = readdirSync(enDir).filter(f => f.endsWith('.json'));

let hasMissing = false;

for (const file of enFiles) {
  const enContent = JSON.parse(readFileSync(join(enDir, file), 'utf-8'));
  const enKeys = Object.keys(enContent).sort();

  for (const locale of locales) {
    if (locale === 'en') continue;
    const localeFile = join(LOCALES_DIR, locale, file);
    if (!existsSync(localeFile)) {
      console.error(`❌ ${locale}/${file} is missing`);
      hasMissing = true;
      continue;
    }
    const localeContent = JSON.parse(readFileSync(localeFile, 'utf-8'));
    const localeKeys = Object.keys(localeContent).sort();
    const missing = enKeys.filter(k => !localeKeys.includes(k));
    const extra = localeKeys.filter(k => !enKeys.includes(k));
    if (missing.length) {
      console.error(`❌ ${locale}/${file} — missing keys: ${missing.join(', ')}`);
      hasMissing = true;
    }
    if (extra.length) {
      console.warn(`⚠️  ${locale}/${file} — extra keys: ${extra.join(', ')}`);
    }
  }
}

if (hasMissing) {
  process.exit(1);
} else {
  console.log('✅ All translations are complete');
}
```

Add the audit script to `package.json`:

```json
{
  "scripts": {
    "i18n:audit": "tsx scripts/audit-translations.ts"
  }
}
```

Run it regularly in CI to catch missing translations:

```bash
npm run i18n:audit
```

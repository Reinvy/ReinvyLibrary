---
title: "SvelteKit Performance Optimization Guide"
description: "A practical guide to making SvelteKit applications fast: prerendering, streaming SSR, code splitting, image optimization, cache headers, and bundle analysis."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# SvelteKit Performance Optimization Guide

## Introduction

SvelteKit is fast by default, but "default" means it optimizes for correctness, not for your specific traffic. A marketing page, a logged-in dashboard, and a product listing have completely different bottlenecks, and the same app often contains all three.

This guide covers the levers that actually move Core Web Vitals in a SvelteKit project: rendering strategy per route, streaming data that is slow but non-blocking, keeping client bundles small, serving modern image formats, caching at the edge, and measuring before and after. Each section states the rule, the reason, and the code that applies it.

The order below follows impact: rendering strategy changes usually beat micro-optimizations, and measurement prevents you from optimizing a route nobody visits.

## Best Practices

- **Choose a rendering mode per route, not per app.** Prerender what is static, SSR what is personalized, and reserve CSR for authenticated shells that cannot be indexed.
- **Stream slow data instead of awaiting it.** Returning a promise from `load` lets the shell render immediately while the slow fragment arrives later.
- **Keep the root layout dependency-free.** Anything imported in `+layout.svelte` ships to every route; a charting library there taxes the whole site.
- **Serve responsive images in modern formats.** Correct `width`/`height` attributes prevent layout shift, and AVIF/WebP cut bytes by 30-60% versus PNG.
- **Cache the public, never the private.** Static assets get long `max-age` with hashed filenames; HTML gets short TTLs with `stale-while-revalidate`.
- **Measure bundle growth on every PR.** A visualizer report catches the accidental `moment` import before users do.
- **Budgets beat opinions.** Set numeric targets (for example 170 KB JS on product pages) so regressions fail review instead of being debated.

## Implementation Steps

### Step 1: Prerender static routes

Mark routes that do not depend on the request as prerenderable. SvelteKit then renders them at build time and serves plain HTML from the CDN, which removes server latency and hydration cost from the critical path.

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter(),
        prerender: {
            entries: ['/', '/pricing', '/legal/*'],
            handleHttpError: ({ path, message }) => {
                console.warn(`Prerender warning for ${path}: ${message}`);
            }
        }
    }
};

export default config;
```

A single route can opt in locally with `export const prerender = true;` in its `+page.ts`, which is preferable to widening the global entry list.

### Step 2: Stream data that is slow but not blocking

Awaiting a slow API before sending HTML delays everything, including the parts the user came for. Return the promise and let the page render a fallback while it resolves.

```typescript
// src/routes/products/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    const reviews = fetch('/api/reviews/summary')
        .then((res) => (res.ok ? res.json() : { average: null, count: 0 }))
        .catch((err) => {
            console.error('Reviews summary failed', err);
            return { average: null, count: 0 };
        });

    const products = await fetch('/api/products').then((res) => res.json());
    return { products, reviews }; // reviews streams in after the shell
};
```

The page renders the shell, then unwraps the promise with `{#await}`:

```svelte
<script lang="ts">
    let { data } = $props();
</script>

<ul>
    {#each data.products as product (product.id)}
        <li>{product.name}</li>
    {/each}
</ul>

{#await data.reviews}
    <p>Loading reviews…</p>
{:then reviews}
    <p>{reviews.average ?? 'No'} rating from {reviews.count} reviews</p>
{:catch}
    <p>Reviews unavailable</p>
{/await}
```

### Step 3: Split bundles and audit them

Route-level code splitting is automatic, but shared imports are not. Move heavy widgets into components loaded on interaction with dynamic `import()`, and inspect the output with a visualizer.

```javascript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
    plugins: [
        sveltekit(),
        visualizer({ filename: 'stats/bundle.html', gzipSize: true, template: 'treemap' })
    ],
    build: { reportCompressedSize: true }
});
```

Import such widgets with `await import(...)` inside an event handler rather than at module top level, and wrap the call in `try/catch` so a failed chunk fetch shows an inline error instead of a blank panel.

### Step 4: Optimize images

Use `@sveltejs/enhanced-img` so the build emits responsive `srcset` entries in modern formats and enforces intrinsic dimensions.

```svelte
<script lang="ts">
    import heroImage from '$lib/assets/hero.jpg?enhanced';
</script>

<enhanced:img src={heroImage} alt="Storefront hero" sizes="(max-width: 768px) 100vw, 50vw" />
```

### Step 5: Set cache headers deliberately

Public HTML should be cached briefly and revalidated in the background; API responses for signed-in users should not be cached at all.

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);

    if (event.url.pathname.startsWith('/api/')) {
        response.headers.set('cache-control', 'private, no-store');
        return response;
    }

    if (response.status === 200 && !event.locals.user) {
        response.headers.set('cache-control', 'public, max-age=30, stale-while-revalidate=300');
    }
    return response;
};
```

### Step 6: Verify with real numbers

Run `npm run build`, then measure the built app rather than the dev server, since dev mode skips minification and code splitting. Compare Lighthouse mobile scores and the visualizer report before and after each change, and keep the numbers in the pull request description so regressions are visible. In practice, performance work in SvelteKit is mostly a routing decision: prerender what is static, stream what is slow, and keep the shared bundle thin.

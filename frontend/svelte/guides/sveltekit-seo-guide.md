---
title: "SvelteKit SEO and Social Sharing Guide"
description: "A production-ready guide to search engine optimization and social sharing in SvelteKit — SSR/SSG rendering, svelte:head meta tags, Open Graph, canonical URLs, JSON-LD, robots.txt, and sitemap.xml."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# SvelteKit SEO and Social Sharing Guide

## Introduction

Search engines and social platforms are bots: they fetch your HTML, read the meta tags, and decide what to show before a single line of JavaScript runs. A heavily client-rendered app therefore looks like an empty page to Google, Slack, WhatsApp, Twitter/X, and Facebook. SvelteKit solves this natively — every route can be server-rendered (SSR) or pre-rendered at build time (SSG), producing real HTML that bots parse.

This guide presents a complete SEO setup for SvelteKit: choosing between SSR and SSG, injecting per-page metadata with `svelte:head`, implementing Open Graph and Twitter Cards for rich social previews, enforcing canonical URLs, embedding JSON-LD structured data, and shipping `robots.txt` plus a dynamic `sitemap.xml`.

## Best Practices

- **Prerender static content, SSR dynamic content**: static pages (docs, blog, marketing) should be pre-rendered at build time via `adapter-static` or the `prerender` option into plain HTML that indexes perfectly; user-specific pages (dashboards, profiles) need SSR per request. Never ship `export const ssr = false` globally when SEO matters.
- **Keep every page's `svelte:head` complete and unique**: each route renders its own `title`, `description`, canonical, and Open Graph tags. Missing titles and duplicate canonicals are the most common causes of poor rankings and wrong social previews.
- **Always set an explicit canonical URL**: bots treat `https://example.com/post/1` and `https://example.com/post/1?ref=email` as different pages. Emit `<link rel="canonical">` referencing the absolute, trailingslash-normalized URL so ranking signals consolidate.
- **Implement Open Graph and Twitter Cards everywhere**: social platforms read only `og:` properties — provide `og:title`, `og:description`, `og:type`, `og:url`, and a large `og:image` (1200x630 px or larger) from a stable public URL, plus `twitter:card` for X/Twitter.
- **Use JSON-LD for structured data**: embed `application/ld+json` scripts for rich results (Article, BreadcrumbList, FAQPage, Organization) — Google's recommended format, easy to generate from load functions, and verifiable with the Rich Results Test.
- **Ship robots.txt and sitemap.xml as endpoints**: a static `robots.txt` controls crawling and points bots at your sitemap; generate `sitemap.xml` dynamically from your content sources so it never goes stale.

## Implementation Steps

### Step 1: Configure the Rendering Strategy

Set sensible defaults in the root layout — SSR on, prerender where appropriate — and opt pages into SSG explicitly.

```javascript
// src/routes/+layout.ts
export const ssr = true;         // server-render by default
export const prerender = false;  // static pages opt in individually

// src/routes/blog/[slug]/+page.ts — static blog post → SSG
export const prerender = true;
```

### Step 2: Build a Reusable SEO Component

Create a component that renders every meta tag from a single `Meta` object so pages stay consistent.

```svelte
<!-- src/lib/components/Seo.svelte -->
<script lang="ts">
  import { page } from '$app/stores';

  export let title: string;
  export let description: string;
  export let image = 'https://example.com/og-default.png';
  export let type: 'website' | 'article' = 'website';
  export let jsonLd: Record<string, unknown> | null = null;

  $: canonical = `https://example.com${$page.url.pathname}`;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta property="og:type" content={type} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={image} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
  {#if jsonLd}
    <script type="application/ld+json" data-sveltekit-prefetch>
      {JSON.stringify(jsonLd)}
    </script>
  {/if}
</svelte:head>
```

### Step 3: Use It in a Page with Load Data

```typescript
// src/routes/blog/[slug]/+page.ts
import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
  const res = await fetch(`/api/posts/${params.slug}`);
  if (!res.ok) throw error(404, 'Post not found');
  return { post: await res.json() };
}
```

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  import Seo from '$lib/components/Seo.svelte';
  export let data;
  const post = data.post;
</script>

<Seo
  title={post.title}
  description={post.excerpt}
  image={post.coverImage}
  type="article"
  jsonLd={{
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author }
  }}
/>

<article>
  <h1>{post.title}</h1>
  <p>{post.excerpt}</p>
  {@html post.html}
</article>
```

### Step 4: Add robots.txt

Serve `robots.txt` as a static asset (or as the dynamic endpoint `src/routes/robots.txt.ts` returning a `text/plain` Response):

```text
# static/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://example.com/sitemap.xml
```

### Step 5: Generate sitemap.xml Programmatically

```typescript
// src/routes/sitemap.xml.ts
export const prerender = true;

const BASE_URL = 'https://example.com';

async function getAllRoutes(): Promise<Array<{ path: string; updatedAt: string }>> {
  const res = await fetch(`${BASE_URL}/api/posts`);
  if (!res.ok) throw new Error('Failed to load routes');
  const posts = await res.json();
  return posts.map((p: { slug: string; updated_at: string }) => ({
    path: `/blog/${p.slug}`,
    updatedAt: p.updated_at
  }));
}

export async function GET() {
  const routes = await getAllRoutes();
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { path: '/', updatedAt: today },
    { path: '/about', updatedAt: today },
    ...routes
  ];
  const urls = entries
    .map(
      (entry) =>
        `<url><loc>${BASE_URL}${entry.path}</loc><lastmod>${entry.updatedAt}</lastmod></url>`
    )
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml' } });
}
```

### Step 6: Validate Before Deploying

- Run `npm run build`, then `curl -s http://localhost:4173/blog/my-post | head -40` — the `title`, canonical, and `og:` tags must appear in the raw HTML.
- Test the production URL in Google's Rich Results Test and the Facebook Sharing Debugger.
- Confirm `robots.txt` and `sitemap.xml` are reachable and match your shipped routes.
- Submit the sitemap in Google Search Console and monitor Index Coverage for crawl errors.

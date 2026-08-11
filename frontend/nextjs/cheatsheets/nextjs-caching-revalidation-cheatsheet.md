---
title: "Next.js Caching and Revalidation Cheatsheet"
description: "A quick reference for mastering Next.js caching — the four caching layers (Request Memoization, Data Cache, Full Route Cache, Router Cache), time-based and on-demand revalidation, ISR, unstable_cache, cache headers, and debugging cache behavior in production."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Next.js Caching and Revalidation Cheatsheet

## Quick Reference Table

| Action | Code / Config | Description |
|--------|---------------|-------------|
| Request Memoization | Default with `fetch` | React deduplicates identical fetches within a single render pass (per request) |
| Opt out of Data Cache | `fetch(url, { cache: 'no-store' })` | Bypasses the persistent HTTP cache for one fetch |
| Time-based revalidation | `fetch(url, { next: { revalidate: 3600 } })` | Cache the response and revalidate it at most once per hour |
| Tag-based revalidation | `fetch(url, { next: { tags: ['posts'] } })` | Tag cached data so it can be purged on demand |
| Segment-level ISR | `export const revalidate = 60` | Revalidate the whole route segment every 60 seconds |
| Force dynamic rendering | `export const dynamic = 'force-dynamic'` | Disables static optimization and the Full Route Cache for the segment |
| Revalidate a path | `revalidatePath('/blog')` | Purges the Data Cache and Full Route Cache for a specific path |
| Revalidate by tag | `revalidateTag('posts')` | Purges every cached entry tagged `posts` |
| Cache arbitrary data | `unstable_cache(fn, ['key'], { revalidate: 300 })` | Memoize database queries or expensive computations |
| Skip caching per request | `noStore()` | Opts the current request out of the Data Cache and Full Route Cache |
| Inspect cache status | `x-nextjs-cache: HIT` header | Verify `HIT` / `MISS` / `STALE` in production responses |
| Refresh Router Cache | `router.refresh()` | Re-fetches the current route's RSC payload client-side |

## Common Commands

### Build and Inspect

```bash
# Create a production build and inspect static/dynamic route output
npm run build

# Start the production server (caching only applies in production, not dev)
npm start

# Check the cache status header of a page route
curl -sI https://example.com/blog | grep -i x-nextjs-cache
# x-nextjs-cache: HIT | MISS | STALE

# Check the cache status header of a route handler endpoint
curl -sI https://example.com/api/posts | grep -i x-nextjs-cache
```

### Cache Headers Reference

```text
x-nextjs-cache: HIT      # Response served from the cache
x-nextjs-cache: MISS     # Response not in cache, rendered and stored
x-nextjs-cache: STALE    # Served stale while revalidating in the background
x-nextjs-cache: BYPASS   # Caching skipped (dynamic route, no-store, etc.)
```

### Environment Flags

```bash
# Disable the Data Cache at build time (all fetches behave as no-store)
NEXT_DISABLE_DATA_CACHE=1 npm run build

# Disable the Full Route Cache at build time (always dynamic rendering)
NEXT_DISABLE_FULL_ROUTE_CACHE=1 npm run build
```

## Code Snippets

### Time-Based Revalidation (ISR)

```typescript
// app/blog/page.tsx
// Revalidate this page at most once every 60 seconds
export const revalidate = 60;

async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 }, // per-fetch override: 1 hour
  });
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <ul>
      {posts.map((post: { id: string; title: string }) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Tag-Based Revalidation

```typescript
// app/products/page.tsx
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { tags: ['products'] },
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

// app/actions.ts
'use server';

import { revalidateTag } from 'next/cache';

export async function refreshProducts() {
  // Invalidate every fetch tagged with 'products'
  revalidateTag('products');
}
```

### Revalidate a Path from a Server Action

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  if (!title) {
    return { error: 'Title is required' };
  }

  const post = await db.post.create({ data: { title } });

  // Purge the blog index and the new post's dynamic route
  revalidatePath('/blog');
  revalidatePath(`/blog/${post.slug}`);
  redirect(`/blog/${post.slug}`);
}
```

### Cache a Database Query with unstable_cache

```typescript
// lib/dashboard.ts
import { unstable_cache } from 'next/cache';
import { db } from './db';

export const getDashboardStats = unstable_cache(
  async () => {
    const [users, orders] = await Promise.all([
      db.user.count(),
      db.order.aggregate({ _sum: { total: true } }),
    ]);
    return { users, revenue: orders._sum.total ?? 0 };
  },
  ['dashboard-stats'], // cache key (deps)
  { revalidate: 300, tags: ['dashboard'] } // 5 minutes, tag 'dashboard'
);
```

### Opt Out of Caching

```typescript
// app/live/page.tsx
import { noStore } from 'next/cache';

export default async function LivePage() {
  noStore(); // dynamic: force-dynamic, fetchCache: force-no-store
  const events = await getLiveEvents();
  return <pre>{JSON.stringify(events, null, 2)}</pre>;
}
```

### Route Handler with CDN Cache-Control

```typescript
// app/api/weather/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await getWeather();

  const response = NextResponse.json(data);
  // Cache at the CDN for 60 seconds, allow stale-while-revalidate for 300s
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300'
  );
  return response;
}
```

### Debug Cache Headers

```bash
# In production, confirm which cache layer served the response
curl -sI https://example.com/dashboard | grep -iE 'x-nextjs-cache|cache-control'
```

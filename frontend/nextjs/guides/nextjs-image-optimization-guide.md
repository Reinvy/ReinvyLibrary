---
title: "Next.js Image Optimization Guide"
description: "A practical guide to optimizing images in Next.js with next/image, covering modern formats (WebP/AVIF), responsive srcset generation, priority loading, caching headers, and remotePatterns configuration."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Next.js Image Optimization Guide

## Introduction

Images are typically the largest assets on a web page and the easiest place to lose performance. Next.js ships a built-in `next/image` component that wraps the browser `<img>` element with automatic optimization: it resizes and compresses on demand, serves modern formats (WebP/AVIF), generates responsive `srcset`, and lazy-loads by default — all at request time, with no manual build pipeline. This guide walks through the best practices for using that component effectively and the configuration that makes it fast in production.

## Best Practices

- **Always use `next/image` instead of raw `<img>`**: you get resizing, format negotiation, lazy loading, and content-visibility hints for free. The only exceptions are decorative images in CSS backgrounds and images served outside your app's origin that you explicitly choose not to proxy.
- **Let Next.js negotiate modern formats (`WebP`/`AVIF`)**: AVIF gives the best compression (roughly 50% smaller than JPEG at equal quality) but is heavier to encode; WebP is the safe fallback for older browsers. Use `images.formats: ["image/avif", "image/webp"]` in `next.config` so the optimizer returns AVIF when the browser's `Accept` header supports it.
- **Set `sizes` for every responsive image**: without `sizes`, Next.js serves a single image sized for the device pixel ratio and the `srcset` is near-useless. Declaring `sizes="(max-width: 768px) 100vw, 75vw"` tells the browser which candidate to download, which directly cuts bandwidth on mobile.
- **Use `priority` only for the LCP image**: `priority` disables lazy loading and adds `<link rel="preload">`, which is correct for the largest contentful paint element — and a performance bug if applied to every image on the page.
- **Restrict remote images with `remotePatterns`**: next/image refuses to optimize URLs that are not in `images.remotePatterns` by default. Always allowlist hostnames (and pathname patterns) explicitly instead of using a wildcard catch-all; the pattern is a suffix match, so `pathname: "/images/**"` only matches that path.
- **Cache optimized images aggressively**: the optimizer output is immutable and safe to cache for a year; make sure your proxy/CDN does not re-validate or re-optimize files that were already optimized.

## Implementation Steps

### Step 1: Enable the Component

`next/image` is part of the `next` package — no install step beyond having a Next.js app (App Router or Pages Router). Import it anywhere you would use `<img>`:

```tsx
import Image from "next/image";
import profilePic from "@/public/profile.jpg"; // static import for local images

export default function Profile() {
  return (
    <Image
      src={profilePic}
      alt="Profile photo"
      width={400}
      height={400}
      className="rounded-full"
    />
  );
}
```

For local images, importing the file gives Next.js the intrinsic `width` and `height` automatically, which prevents layout shift (CLS). For remote URLs you must provide them, as in Step 3.

### Step 2: Serve Modern Formats

Configure the optimizer's format list in `next.config.ts`. The default already produces WebP when the browser supports it; add AVIF for stronger compression:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    quality: 75,
  },
};

export default nextConfig;
```

Typical savings: JPEG → WebP ≈ 25–35% smaller, JPEG → AVIF ≈ 50% smaller at similar visual quality. Rebuild (`next build`) after changing formats so every cached image is regenerated.

### Step 3: Allow Remote Images with `remotePatterns`

To optimize images hosted elsewhere, allowlist the origin:

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.example.com", pathname: "/images/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
```

```tsx
import Image from "next/image";

export default function Poster({ src }: { src: string }) {
  // src comes from a trusted, allowlisted origin
  return (
    <Image
      src={src}
      alt="Movie poster"
      width={400}
      height={600}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    />
  );
}
```

`hostname` is required; `protocol`, `port`, and `pathname` are optional. The `placeholder="blur"` + `blurDataURL` pair gives a low-quality-image placeholder while the real image streams in.

### Step 4: Generate a Realistic `srcset` with `sizes`

The `sizes` prop is the single biggest bandwidth lever. It tells the browser the rendered width of the image at each viewport breakpoint, letting it pick the right file from the `srcset` Next.js generates from your configured device sizes:

```tsx
<Image
  src="https://cdn.example.com/images/banner.jpg"
  alt="Banner"
  width={1920}
  height={600}
  sizes="(max-width: 768px) 100vw, 75vw"
  priority
/>
```

Without `sizes`, a 1920px-wide image on a 375px phone downloads the full 1920px file. With the declaration above it picks a ~375px–750px candidate. Tune `images.deviceSizes` and `images.imageSizes` in `next.config` when the defaults (`[640, 750, 828, 1080, 1200, 1920, 2048, 3840]`) do not match your layout.

### Step 5: Prioritize the LCP Image Only

The hero image above the fold should get `priority` (preload + eager loading); everything else should stay lazy, which is the default:

```tsx
// Good: the LCP element is preloaded and eager
<Image src={hero} alt="Hero" width={1600} height={900} priority sizes="100vw" />

// Avoid: priority everywhere disables lazy loading and bloats preloads
// <Image src={card1} alt="Card" width={400} height={300} priority />
```

Measure with Lighthouse: the image marked as LCP should render without layout shift, and no non-LCP image should carry `priority`.

### Step 6: Configure Caching and Revalidation

Optimized images are served with `Cache-Control: public, max-age=31536000, immutable` by default because the URL is content-addressed (width, quality, and format are in the query string). Two things to check in production:

- **Set a sensible `expireTime`** if you re-upload images under the same URL — the optimizer caches its output and the cache must eventually notice the new source file:

```typescript
const nextConfig: NextConfig = {
  images: { expireTime: 86400 }, // seconds; re-optimize if older than 24h
};
```

- **Cache original assets at the edge** so the optimizer does not re-fetch them. If you serve originals through your own routes, add long-lived headers — but never override the immutable cache on already-optimized responses:

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/images/source/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=2592000" }],
      },
    ];
  },
};
```

Revalidation strategy: allow derivative sizes/formats to be cached forever, keep originals under `stale-while-revalidate`, and regenerate on demand whenever a source file changes.

## Summary

Follow this checklist for every image you ship: use `next/image`, keep `priority` on the LCP image only, declare `sizes` for responsive images, allowlist remote origins with `remotePatterns`, enable AVIF/WebP formats, and let the optimizer's immutable cache do its job. Each item is small, but together they cut image payload by half or more on typical pages.

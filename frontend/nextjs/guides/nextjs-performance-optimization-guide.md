---
title: "Next.js Performance Optimization Guide"
description: "A measurement-first guide to Next.js performance: bundle analysis, route-level code splitting, dynamic imports for heavy client code, font loading with next/font, ISR and Partial Prerendering, and field measurement of Core Web Vitals."
category: "frontend"
technology: "nextjs"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Next.js Performance Optimization Guide

## Introduction

Most "slow Next.js app" problems are not caused by Next.js. They come from shipping too much JavaScript to the client, blocking the main thread with third-party scripts, loading fonts late, or rendering every route dynamically when the content barely changes. This guide sets a working order: measure the real Core Web Vitals, attack the largest cost, then verify the change moved the metric. Optimizing in any other order produces confident-sounding edits with no user-visible effect.

The scope is an App Router application on Next.js 14/15. Everything here applies to the Pages Router except Partial Prerendering, which is App Router only.

## Best Practices

- **Measure before you touch code.** Split metrics by device class and route; a 98 Lighthouse score on a developer laptop says nothing about a mid-range Android phone on 4G. Field data (CrUX, Speed Insights, or your own beacon) is the source of truth, lab data is a debugging aid.
- **Budget the bundle per route.** Set an explicit ceiling — for example 170 kB of first-load JS for a content route — and fail CI when a pull request exceeds it. A budget turns "the bundle is big" into a reviewable number.
- **Keep the client boundary narrow.** `"use client"` marks a module and its entire import graph as client code. Push it down to leaf components that need state or events; fetch data and render structure in Server Components above them.
- **Replace static imports of heavy widgets with `next/dynamic`.** Editors, charts, maps, and players are usually below the fold and worth a separate chunk. Always provide a same-size skeleton so the swap does not cause layout shift.
- **Load fonts with `next/font`, never a `<link>` to Google Fonts.** `next/font` self-hosts at build time, injects `font-display: swap`, and generates a metric-matched fallback that kills the shift a remote font causes.
- **Prefer static and revalidated rendering.** Reading `cookies()`, `headers()`, or `searchParams` forces the whole route dynamic; isolate the dynamic part behind `<Suspense>` instead.
- **Cache deliberately, not accidentally.** `fetch` is uncached by default in Next.js 15; set `revalidate` or `cache: "force-cache"` where data tolerates it, and tag entries for `revalidateTag` invalidation.
- **Treat INP as a code problem.** Long tasks from large hydration trees and unthrottled handlers dominate Interaction to Next Paint. Split work, defer non-urgent updates with `startTransition`, and virtualize long lists.

## Implementation Steps

### Step 1: Establish the baseline

Add field measurement with the `useReportWebVitals` hook and push samples to your analytics endpoint with the route and device class attached, otherwise you cannot attribute a regression.

```typescript
// app/web-vitals.tsx
"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
    useReportWebVitals((metric) => {
        const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, path: location.pathname });
        // sendBeacon survives page unload; fall back to a keepalive fetch
        if (!navigator.sendBeacon("/api/vitals", body)) {
            void fetch("/api/vitals", { method: "POST", body, keepalive: true });
        }
    });
    return null;
}
```

Mount it once in the root layout and record a two-week baseline per route before changing anything.

### Step 2: Analyze the bundle

```bash
npm install --save-dev @next/bundle-analyzer
ANALYZE=true npm run build
```

```javascript
// next.config.mjs
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig = {
    experimental: { optimizePackageImports: ["lucide-react", "date-fns"] },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
```

Read the treemap sorted by parsed size, not raw size. A 200 kB dependency that tree-shakes to 8 kB is not a problem; a 40 kB icon barrel that pulls 900 modules is.

### Step 3: Cut the client boundary

```tsx
// app/products/page.tsx  (Server Component)
import { getProducts } from "@/lib/products";
import { AddToCartButton } from "./add-to-cart-button";

export default async function ProductsPage() {
    const products = await getProducts();
    return (
        <ul>
            {products.map((product) => (
                <li key={product.id}>
                    <h2>{product.name}</h2>
                    {/* only this leaf ships to the browser */}
                    <AddToCartButton productId={product.id} />
                </li>
            ))}
        </ul>
    );
}
```

### Step 4: Defer heavy widgets

```tsx
import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("@/components/revenue-chart"), {
    loading: () => <div className="h-80 w-full animate-pulse rounded bg-gray-100" />,
    ssr: false, // the chart library touches window on import
});
```

The skeleton must match the final dimensions exactly; a mismatched placeholder trades bundle size for CLS. For below-the-fold widgets, render only when an `IntersectionObserver` reports visibility.

### Step 5: Optimize fonts

```typescript
// app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <body className="font-sans">{children}</body>
        </html>
    );
}
```

Two families maximum, and only the weights you actually use — every extra weight is another file competing with your LCP image.

### Step 6: Push work to the cache

| Data behaviour | Setting | Effect |
| --- | --- | --- |
| Changes hourly | `export const revalidate = 3600` | ISR: static HTML, regenerated in the background |
| Changes on edit | `fetch(url, { next: { tags: ["posts"] } })` | Targeted `revalidateTag("posts")` after a write |
| User-specific | `<Suspense>` around the personalized child | Shell stays static, only the hole streams |

Partial Prerendering applies the same idea at route level: the static shell is served instantly and dynamic holes stream in. Enable it per route with `experimental.ppr` and keep the fallback layout stable so the holes do not shift.

### Step 7: Verify and guard

Re-run field measurement for the same routes and device class, and compare against the baseline. A change that does not move LCP, INP, or CLS measurably is noise — revert it. Then add the bundle budget to CI so the next pull request cannot quietly undo the work. Lab checks remain useful for local iteration:

```bash
npx lighthouse http://localhost:3000/checkout --preset=desktop --quiet \
    --chrome-flags="--headless" --output=json --output-path=./lh.json
```

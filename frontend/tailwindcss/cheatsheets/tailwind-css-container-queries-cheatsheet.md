---
title: "Tailwind CSS Container Queries and Responsive Components Cheatsheet"
description: "An advanced reference for styling with Tailwind CSS container queries: inline-size and size containers, named containers, min/max and range variants, container query length units, custom container sizes in the --container-* theme namespace, and production patterns for truly portable components."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Tailwind CSS Container Queries and Responsive Components Cheatsheet

Viewport breakpoints answer "how wide is the browser window?". Container queries answer "how wide is the space this component was given?" — which is the question a reusable card, sidebar widget, or data table actually needs answered. Tailwind CSS v4 ships container query support in core, so the `@tailwindcss/container-queries` plugin is no longer required.

## Quick Reference Table

| Utility or variant | Example | What it does |
|--------------------|---------|--------------|
| `@container` | `class="@container"` | Marks the element as an inline-size query container |
| `@container-size` | `class="@container-size"` | Marks the element as a size container (inline and block size) |
| `@container/{name}` | `class="@container/card"` | Named inline-size container that descendants can target explicitly |
| `@container-size/{name}` | `class="@container-size/panel"` | Named size container |
| `@3xs` … `@7xl` | `class="@md:flex-row"` | Container-width variant, mobile-first (applies at that size and up) |
| `@max-*` | `class="@max-md:flex-col"` | Applies below the named container size |
| Ranged variant | `class="@sm:@max-lg:hidden"` | Stacks a min and a max variant into one range |
| `@min-[475px]` | `class="@min-[475px]:grid-cols-2"` | Arbitrary minimum container width, no theme change |
| `@max-[960px]` | `class="@max-[960px]:hidden"` | Arbitrary maximum container width |
| `@min-[400px]:@max-[700px]` | `class="@min-[400px]:@max-[700px]:block"` | Arbitrary query range |
| `cqw` `cqi` | `class="w-[50cqw]"` | Container query units usable in arbitrary values |
| `cqh` `cqb` `cqmin` `cqmax` | `class="h-[30cqb]"` | Block-size and min/max container units (requires a size container) |
| `--container-*` | `@theme { --container-8xl: 96rem; }` | Defines extra container sizes, shared with `max-w-*` |

## Common Commands

### Install and Build with the v4 CLI

```bash
# Core install — no container query plugin needed
npm install tailwindcss @tailwindcss/postcss postcss

# One-off CLI build
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --minify

# Watch mode while iterating on component layouts
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch
```

### Remove the Legacy v3 Plugin

```bash
# v3 projects needed a plugin; v4 has the same API in core
npm install -D @tailwindcss/container-queries
git grep -n "container-queries" -- '*.js' '*.ts' '*.mjs'
```

```javascript
// tailwind.config.js — only needed on Tailwind v3
module.exports = {
  plugins: [require('@tailwindcss/container-queries')],
}
```

### Container Size Reference

```text
| Variant | Min width       | Variant | Min width        |
|---------|-----------------|---------|------------------|
| @3xs    | 16rem (256px)   | @2xl    | 42rem (672px)    |
| @2xs    | 18rem (288px)   | @3xl    | 48rem (768px)    |
| @xs     | 20rem (320px)   | @4xl    | 56rem (896px)    |
| @sm     | 24rem (384px)   | @5xl    | 64rem (1024px)   |
| @md     | 28rem (448px)   | @6xl    | 72rem (1152px)   |
| @lg     | 32rem (512px)   | @7xl    | 80rem (1280px)   |
| @xl     | 36rem (576px)   |         |                  |
```

Container sizes are deliberately smaller than viewport breakpoints (`sm` is 40rem, `@sm` is 24rem) because a component rarely owns the full viewport. Every size also has a `@max-*` counterpart: `@max-md` compiles to `@container (width < 28rem)`.

### Generated CSS Shapes

```text
@container       →  .\@container { container-type: inline-size }
@sm:flex-row     →  @container (width >= 24rem) { ... }
@max-md:flex-col →  @container (width < 28rem) { ... }
@sm:@max-lg:...  →  @container (24rem <= width < 32rem) { ... }
@container/card  →  container-type: inline-size; container-name: card
@md/card:grid    →  @container card (width >= 28rem) { ... }
```

### Formatting Class Lists

```bash
# prettier-plugin-tailwindcss sorts variant stacks deterministically
npm install -D prettier prettier-plugin-tailwindcss
npx prettier --write "src/**/*.{html,jsx,tsx,vue,svelte}"
```

## Code Snippets

### Viewport Query Versus Container Query

```html
<!-- Media query: both cards break at the same window width,
     so the sidebar card is already "large" inside a narrow column -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <aside class="col-span-1">
    <article class="flex items-center gap-4 sm:flex-col">
      <img src="/cover.webp" alt="" class="h-16 w-16 rounded-lg object-cover">
      <h3 class="text-lg">Sidebar card</h3>
    </article>
  </aside>
</div>

<!-- Container query: each card responds to the column it actually occupies -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <aside class="col-span-1">
    <article class="@container">
      <div class="flex items-center gap-4 @md:flex-col @md:items-start">
        <img src="/cover.webp" alt="" class="h-16 w-16 rounded-lg object-cover">
        <h3 class="text-base @md:text-lg">Sidebar card</h3>
      </div>
    </article>
  </aside>
</div>
```

### A Card That Reflows Through Three Layouts

```html
<article class="@container rounded-xl border border-slate-200 bg-white shadow-sm @container">
  <div class="flex flex-col gap-4 p-4 @md:flex-row @md:items-start @md:gap-6 @2xl:p-6">
    <img
      src="/product.webp"
      alt=""
      class="h-40 w-full rounded-lg object-cover @md:h-24 @md:w-24 @2xl:h-32 @2xl:w-32"
    >
    <div class="flex flex-col gap-2 @md:flex-1">
      <h2 class="text-lg font-semibold text-slate-900 @2xl:text-xl">Field Notebook</h2>
      <p class="text-sm text-slate-600 @max-md:line-clamp-2">
        Waxed canvas cover, 192 dot-grid pages, lay-flat binding.
      </p>
      <div class="flex items-center gap-3 @max-sm:flex-col @max-sm:items-stretch">
        <span class="text-base font-semibold text-slate-900">$28.00</span>
        <button class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white @max-sm:mt-2">
          Add to cart
        </button>
      </div>
    </div>
  </div>
</article>
```

### Nested Named Containers

```html
<!-- Two real containers in the tree: the page shell and the widget itself -->
<div class="@container/main min-h-screen">
  <main class="p-4 @lg/main:p-8">
    <section class="@container/widget rounded-lg bg-slate-50 p-4">
      <header class="flex flex-col gap-1 @sm/widget:flex-row @sm/widget:items-center @sm/widget:justify-between">
        <h2 class="text-base font-semibold @md/widget:text-lg">Weekly revenue</h2>
        <span class="text-xs text-slate-500 @max-md/widget:hidden">Updated 4 minutes ago</span>
      </header>
      <dl class="mt-4 grid grid-cols-1 gap-4 @md/widget:grid-cols-2 @2xl/widget:grid-cols-4">
        <div><dt class="text-xs uppercase text-slate-500">MRR</dt><dd class="text-xl font-semibold">$42.1k</dd></div>
        <div><dt class="text-xs uppercase text-slate-500">Churn</dt><dd class="text-xl font-semibold">1.8%</dd></div>
      </dl>
    </section>
  </main>
</div>
```

Named containers matter as soon as two containers nest: an unnamed `@md:` resolves against the nearest ancestor container, which is often the innermost widget when you meant the page shell.

### Range Variants for the Awkward Middle

```html
<!-- Sidebar visible only in the mid-width band, hidden when the shell is tiny or huge -->
<div class="@container">
  <div class="grid grid-cols-1 @lg:grid-cols-[16rem_1fr]">
    <nav class="hidden @lg:@max-4xl:block @lg:@max-4xl:border-r @lg:@max-4xl:pr-4">
      <a href="/docs" class="block py-1 text-sm text-slate-600">Docs</a>
      <a href="/api" class="block py-1 text-sm text-slate-600">API</a>
    </nav>
    <article class="prose max-w-none">...</article>
  </div>
</div>
```

### Container Query Units

```html
<!-- Inline-size container: cqw and cqi are valid, cqh and cqb are not -->
<section class="@container rounded-2xl bg-slate-900 p-6 text-white">
  <h1 class="text-[clamp(1.25rem,6cqw,3rem)] font-bold leading-tight">
    Typography scaled by the card, not the window
  </h1>
  <div class="mt-4 h-[40cqw] max-h-64 w-[60cqw] bg-slate-700"></div>
</section>

<!-- Size container: block units such as cqb resolve as well -->
<section class="@container-size flex h-96 items-end bg-slate-100 p-6">
  <div class="w-full bg-white p-4 shadow-sm" style="min-height: 30cqb">...</div>
</section>
```

`cqw` is a percentage of the container's width, `cqh` of its height, `cqi` and `cqb` of its inline and block size, and `cqmin`/`cqmax` the smaller and larger of the two. They only resolve against a real query container, so an element without an ancestor container falls back to the small viewport unit.

### Custom Container Sizes in the Theme

```css
@import "tailwindcss";

@theme {
  /* Adds @8xl:* variants and max-w-8xl — one namespace, two utility families */
  --container-8xl: 96rem;
  --container-card: 22rem;
}

/* Optional: a container that keeps its own intrinsic sizing */
@utility container-inline {
  container-type: inline-size;
}
```

```html
<div class="@container">
  <div class="grid grid-cols-1 @card:grid-cols-2 @8xl:grid-cols-4">...</div>
</div>
```

### Shell Layout Driven by the Content Column

```html
<div class="flex min-h-screen">
  <aside class="hidden w-64 shrink-0 border-r lg:block">...</aside>
  <main class="@container flex-1 min-w-0 p-6">
    <div class="grid grid-cols-1 gap-6 @xl:grid-cols-2 @5xl:grid-cols-3">
      <article class="rounded-lg border p-4">...</article>
      <article class="rounded-lg border p-4">...</article>
      <article class="rounded-lg border p-4">...</article>
    </div>
  </main>
</div>
```

`min-w-0` on the container is not optional in flex and grid layouts: without it the flex item refuses to shrink below its content's intrinsic width, and the container query never sees the narrow size you are trying to design for.

### A Data Table That Collapses Into Cards

```html
<div class="@container overflow-x-auto">
  <table class="hidden w-full text-sm @2xl:table">
    <thead class="border-b text-left text-xs uppercase text-slate-500">
      <tr><th class="py-2">Order</th><th class="py-2">Customer</th><th class="py-2">Total</th></tr>
    </thead>
    <tbody>
      <tr class="border-b"><td class="py-2">#1024</td><td class="py-2">Ada L.</td><td class="py-2">$120.00</td></tr>
    </tbody>
  </table>

  <ul class="grid gap-3 @2xl:hidden">
    <li class="rounded-lg border p-4">
      <p class="font-medium">#1024 · Ada L.</p>
      <p class="text-sm text-slate-600">$120.00</p>
    </li>
  </ul>
</div>
```

### Feature Detection Fallback

```css
/* Only opt into container queries when the browser supports them */
@supports (container-type: inline-size) {
  .card-shell {
    container-type: inline-size;
  }

  @container (width >= 28rem) {
    .card-shell .card-body {
      display: flex;
      gap: 1.5rem;
    }
  }
}

/* Plain-CSS fallback for everything else */
@supports not (container-type: inline-size) {
  @media (min-width: 40rem) {
    .card-shell .card-body {
      display: flex;
      gap: 1.5rem;
    }
  }
}
```

### Verifying Queries in Component Tests

```typescript
// Playwright: resize the container, not the viewport — resizing the window
// only satisfies media queries and will leave container variants untested.
import { test, expect } from '@playwright/test'

test('product card switches to horizontal layout inside a wide container', async ({ page }) => {
  await page.goto('/products/field-notebook')
  const shell = page.getByTestId('card-shell')
  const body = page.getByTestId('card-body')

  await shell.evaluate((el) => {
    (el as HTMLElement).style.width = '240px'
  })
  await expect(body).toHaveCSS('flex-direction', 'column')

  await shell.evaluate((el) => {
    (el as HTMLElement).style.width = '560px'
  })
  await expect(body).toHaveCSS('flex-direction', 'row')
})
```

Two practical rules for testing: assert on the container's own width rather than the viewport, and give the container an explicit width in the test — `container-type: inline-size` means the shell no longer grows to fit its content, so an unstyled test container can collapse and fire every `@max-*` variant at once.

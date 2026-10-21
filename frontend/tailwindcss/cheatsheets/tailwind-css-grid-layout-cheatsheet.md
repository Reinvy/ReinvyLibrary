---
title: "Tailwind CSS Grid Layout Cheatsheet"
description: "A practical reference for CSS Grid in Tailwind CSS: column and row templates, spans and placement, auto-fit and minmax patterns, gap control, responsive grids, and named areas built from arbitrary values."
category: "frontend"
technology: "tailwindcss"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Tailwind CSS Grid Layout Cheatsheet

## Quick Reference Table

| Goal | Class | Resulting CSS |
|------|-------|---------------|
| Enable grid | `grid` | `display: grid` |
| Equal columns | `grid-cols-3` | `grid-template-columns: repeat(3, minmax(0, 1fr))` |
| No template | `grid-cols-none` | `grid-template-columns: none` |
| Arbitrary columns | `grid-cols-[200px_1fr_80px]` | fixed plus flexible tracks |
| Equal rows | `grid-rows-2` | `grid-template-rows: repeat(2, minmax(0, 1fr))` |
| Subgrid | `grid-cols-subgrid` | `grid-template-columns: subgrid` |
| Span columns | `col-span-2` | `grid-column: span 2 / span 2` |
| Span all columns | `col-span-full` | `grid-column: 1 / -1` |
| Place by line | `col-start-2 col-end-4` | `grid-column: 2 / 4` |
| Auto placement | `col-auto` | `grid-column: auto` |
| Span rows | `row-span-2` | `grid-row: span 2 / span 2` |
| Flow direction | `grid-flow-col` | `grid-auto-flow: column` |
| Dense packing | `grid-flow-row-dense` | fills holes left by spans |
| Implicit track size | `auto-rows-[minmax(12rem,auto)]` | `grid-auto-rows: …` |
| Uniform gap | `gap-6` | `gap: 1.5rem` |
| Axis gap | `gap-x-8 gap-y-2` | `column-gap` / `row-gap` |
| Align items | `items-center` | `align-items: center` |
| Align one item | `justify-self-end` | `justify-self: end` |

## Common Commands

### Install and Build

```bash
# Tailwind CSS v4 with the standalone CLI
npm install -D tailwindcss @tailwindcss/cli

# Compile once and watch for changes
npx @tailwindcss/cli -i ./src/app.css -o ./public/build.css --watch
```

```bash
# Tailwind CSS v4 with Vite
npm install -D tailwindcss @tailwindcss/vite

# Production build (verifies your grid classes are generated)
npm run build
```

If a dynamic class such as `grid-cols-${n}` never appears verbatim in your source, it will not be generated. Add it to a safelist through `@source inline(...)` in v4, or build a static lookup map as shown below.

## Code Snippets

### Equal Columns with Spans

```html
<section class="grid grid-cols-1 gap-4 md:grid-cols-6">
  <div class="rounded-xl bg-white p-6 shadow-sm md:col-span-4">Main chart</div>
  <aside class="rounded-xl bg-white p-6 shadow-sm md:col-span-2">Summary</aside>
  <div class="rounded-xl bg-white p-6 shadow-sm md:col-span-full">Activity feed</div>
</section>
```

### Auto-Fit: Responsive Without Breakpoints

```html
<div class="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6">
  <article class="rounded-2xl border border-gray-200 p-6">Card one</article>
  <article class="rounded-2xl border border-gray-200 p-6">Card two</article>
  <article class="rounded-2xl border border-gray-200 p-6">Card three</article>
</div>
```

`auto-fit` collapses empty tracks so the remaining cards stretch to fill the row. Swap it for `auto-fill` to keep empty tracks reserved and stop cards from growing past their minimum.

### Sidebar Plus Fluid Content

```html
<div class="grid min-h-screen grid-cols-[16rem_minmax(0,1fr)]">
  <nav class="border-r border-gray-200 bg-gray-50 p-4">Navigation</nav>
  <main class="p-8">
    <div class="grid gap-6 xl:grid-cols-3">
      <section class="xl:col-span-2">Report</section>
      <aside>Filters</aside>
    </div>
  </main>
</div>
```

`minmax(0,1fr)` matters: a bare `1fr` track has an automatic minimum of `min-content`, which lets long table or code content blow out the layout.

### Bento Layout with Row and Column Spans

```html
<div class="grid auto-rows-[9rem] grid-cols-4 gap-4">
  <div class="col-span-2 row-span-2 rounded-2xl bg-indigo-600 p-6 text-white">Hero</div>
  <div class="rounded-2xl bg-white p-6 shadow-sm">Stat A</div>
  <div class="rounded-2xl bg-white p-6 shadow-sm">Stat B</div>
  <div class="col-span-2 rounded-2xl bg-white p-6 shadow-sm">Trend</div>
</div>
```

Rows sized with `auto-rows-[…]` give spans something predictable to double, which is what makes a bento grid stay tidy as content changes.

### Named Areas with Arbitrary Properties

```html
<div
  class="grid grid-cols-3 grid-rows-[auto_1fr_auto] gap-4
    [grid-template-areas:'header_header_header'_'sidebar_main_main'_'footer_footer_footer']"
>
  <header class="[grid-area:header] bg-gray-900 p-4 text-white">Header</header>
  <nav class="[grid-area:sidebar] bg-gray-100 p-4">Sidebar</nav>
  <main class="[grid-area:main] p-4">Content</main>
  <footer class="[grid-area:footer] bg-gray-100 p-4">Footer</footer>
</div>
```

Underscores become spaces inside arbitrary values; each quoted group is one row. Named areas let you reshape the whole page by editing a single class, and media queries can override it:

```html
<div class="grid gap-4 md:[grid-template-areas:'header_header'_'sidebar_main']">…</div>
```

### Subgrid for Aligned Cards

```html
<div class="grid grid-cols-3 gap-6">
  <article class="grid grid-rows-subgrid row-span-3 gap-2 rounded-xl border p-4">
    <h3 class="text-lg font-semibold">Title</h3>
    <p class="text-sm text-gray-600">Description text of varying length.</p>
    <button class="justify-self-start rounded bg-indigo-600 px-3 py-1.5 text-white">Open</button>
  </article>
</div>
```

Subgrid makes the heading, body, and footer rows line up across cards even when descriptions differ in length — the usual fix for ragged card footers.

### Dynamic Column Counts That Survive Purging

```typescript
const COLUMN_CLASS: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6'
};

export function gridColumns(count: number): string {
    const found = COLUMN_CLASS[count];
    if (!found) {
        console.warn(`Unsupported grid column count: ${count}, falling back to 1`);
        return COLUMN_CLASS[1];
    }
    return `${found} gap-6`;
}
```

Template literals like `grid-cols-${count}` compile to nothing because Tailwind scans source text, not runtime values. A static map keeps every class visible to the scanner and fails loudly instead of silently rendering a one-column grid.

---
title: "Building a Design System with Tailwind CSS"
description: "A hands-on tutorial on building a token-driven design system with Tailwind CSS v4 — defining theme tokens for colors, spacing, fonts and breakpoints, composing button, input and card components with @layer and @apply, and adding custom variants."
category: "frontend"
technology: "tailwindcss"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Design System with Tailwind CSS

## Summary

In this tutorial you will turn a pile of one-off utility classes into a reusable design system: theme tokens for colors, spacing, fonts, and breakpoints in Tailwind CSS v4's CSS-first `@theme` layer, CSS variables that switch themes at runtime, and Button, Input, and Card components composed with `@layer components` and `@apply`. The deliverable is a single `app.css` any page or framework in your project can consume.

## Target Audience

- Frontend developers who already write Tailwind utilities and want consistent, reusable components.
- Design-system maintainers standardizing tokens across multiple apps.
- Intermediate developers comfortable with HTML, CSS custom properties, and npm.

## Prerequisites

- Working knowledge of HTML and CSS, including CSS custom properties (`--token: value`).
- Familiarity with Tailwind utility classes (`px-4`, `text-sm`, `md:flex`).
- Node.js 20+ and npm installed, plus a terminal.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Define design tokens for colors, spacing, fonts, and breakpoints in the `@theme` layer.
- Map runtime-swappable CSS variables into Tailwind utilities with `@theme inline`.
- Compose Button, Input, and Card components using `@layer components` and `@apply`.
- Register custom variants with `@custom-variant` and validate tokens in CI.

## Context and Motivation

Utility classes scale beautifully for layout but poorly for brand consistency — without tokens, one engineer writes `bg-blue-600` and another writes `bg-indigo-600` on the same page. A token-driven design system solves this: tokens single-source the design decisions, and a thin component layer gives those decisions names the whole team can reuse.

## Core Content

### 1. Tokens First: The `@theme` Layer

Tailwind v4 is CSS-first; tokens live in CSS, not a JavaScript config. Each `@theme` namespace maps to a utility prefix:

| Token namespace | Example token | Generated utilities |
| --- | --- | --- |
| `--color-*` | `--color-brand-500` | `bg-brand-500`, `text-brand-500`, `ring-brand-500` |
| `--spacing-*` | `--spacing-lg` | `p-lg`, `m-lg`, `gap-lg` |
| `--font-*` | `--font-display` | `font-display` |
| `--breakpoint-*` | `--breakpoint-lg` | `lg:*` |

### 2. Runtime Theming with CSS Variable Tokens

Tokens baked into `@theme` are static at build time. For themes that switch in the browser, declare plain CSS variables on `:root` and `[data-theme="dark"]`, then republish them with `@theme inline` — the `inline` keyword makes utilities reference the variable directly, so a theme change applies without rebuilding CSS.

### 3. Component Classes with `@layer components` and `@apply`

`@layer components` registers classes that sit between base styles and utilities, so a utility on the element still wins. `@apply` lets those classes reuse token-backed utilities, keeping components readable and tokens authoritative. Keep the layer thin — only genuinely reused patterns belong here.

### 4. Custom Variants

`@custom-variant` names a selector combination you repeat often, such as a hover-and-focus pairing or a dark-theme scope. Unlike `@apply`, variants compose into utilities, so `.hocus:underline` and `md:hocus:ring-2` both work.

## Code Examples

### Step 1: Install the Tailwind CLI

```bash
npm install --save-dev tailwindcss @tailwindcss/cli
npx @tailwindcss/cli -i ./src/app.css -o ./dist/app.css --minify
```

### Step 2: Define Tokens and Components

```css
/* src/app.css — design tokens and components (Tailwind v4) */
@import "tailwindcss";

/* Static tokens: colors, spacing, fonts, breakpoints. */
@theme {
  --color-brand-500: oklch(0.62 0.19 250);
  --color-brand-600: oklch(0.55 0.19 250);
  --color-danger-500: oklch(0.58 0.22 27);
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --font-display: "Satoshi", "Inter", sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --radius-card: 0.75rem;
}

/* Runtime tokens: swapped by [data-theme] without a rebuild. */
:root {
  --surface: oklch(1 0 0);
  --surface-raised: oklch(0.97 0.005 250);
  --text-strong: oklch(0.22 0.02 250);
  --border-subtle: oklch(0.9 0.01 250);
}

[data-theme="dark"] {
  --surface: oklch(0.2 0.02 250);
  --surface-raised: oklch(0.26 0.02 250);
  --text-strong: oklch(0.96 0.005 250);
  --border-subtle: oklch(0.36 0.02 250);
}

/* `inline` keeps utilities pointing at the variable, not a frozen value. */
@theme inline {
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-text-strong: var(--text-strong);
  --color-border-subtle: var(--border-subtle);
}

/* Custom variants: interaction pair + dark-theme scope. */
@custom-variant hocus (&:hover, &:focus-visible);
@custom-variant theme-dark (&:where([data-theme="dark"] *));

@layer components {
  .btn {
    @apply inline-flex items-center justify-center gap-sm rounded-card px-lg py-sm font-body text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50;
  }
  .btn-primary { @apply bg-brand-500 text-white hover:bg-brand-600; }
  .btn-ghost { @apply bg-transparent text-text-strong hover:bg-surface-raised; }
  .input {
    @apply block w-full rounded-card border border-border-subtle bg-surface px-md py-sm font-body text-sm text-text-strong placeholder:text-text-strong/50 aria-invalid:border-danger-500 aria-invalid:ring-2 aria-invalid:ring-danger-500/30;
  }
  .card { @apply rounded-card border border-border-subtle bg-surface-raised p-lg; }
  .card-title { @apply font-display text-lg font-semibold text-text-strong; }
}
```

### Step 3: Consume the System

```html
<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="./dist/app.css" />
    <title>Design system preview</title>
  </head>
  <body class="bg-surface p-lg font-body text-text-strong">
    <form class="card mx-auto max-w-md space-y-md">
      <h1 class="card-title">Sign in</h1>
      <label class="block">
        <span class="mb-xs block text-sm font-medium">Email</span>
        <input class="input" type="email" name="email" required aria-invalid="false" />
      </label>
      <button class="btn btn-primary w-full" type="submit">Continue</button>
      <button class="btn btn-ghost hocus:underline w-full" type="button">Use SSO instead</button>
    </form>
  </body>
</html>
```

### Step 4: Guard the Tokens in CI

A component that references a deleted token silently loses its styling; this script fails the build instead:

```javascript
// scripts/check-tokens.mjs
import { readFile } from "node:fs/promises";

const REQUIRED_TOKENS = ["--color-brand-500", "--color-danger-500", "--font-display", "--spacing-lg", "--breakpoint-lg"];
const cssPath = process.argv[2] ?? "./src/app.css";

try {
  const css = await readFile(cssPath, "utf8");
  const missing = REQUIRED_TOKENS.filter((t) => !css.includes(`${t}:`));
  if (missing.length) throw new Error(`missing tokens: ${missing.join(", ")}`);
  console.log(`All ${REQUIRED_TOKENS.length} design tokens are present.`);
} catch (error) {
  console.error(`Design system check failed: ${error.message}`);
  process.exit(1);
}
```

Run it with `node scripts/check-tokens.mjs` before the Tailwind build step in CI.

## Key Insights

- **Tokens over classes**: If two components need the same value, it belongs in a token; if they need the same class *string*, it belongs in `@layer components`.
- **`@theme inline` is not optional for runtime themes**: Without `inline`, utilities capture the variable's build-time value and `data-theme` switching appears to do nothing.
- **`@apply` from another file needs a reference**: In Vue, Svelte, or CSS Modules blocks, add `@reference "../app.css";` before `@apply`.
- **Name by role, not by color**: `--color-danger-500` survives a rebrand; `--color-red-500` does not.

## Next Steps

- Add semantic variant tokens for success, warning, and info states.
- Wire a dark-mode toggle stored in `localStorage` to `data-theme`.

## Conclusion

You built a token-driven design system in Tailwind CSS v4: `@theme` tokens, `@theme inline` CSS variables for runtime theming, Button, Input, and Card components with `@layer components` and `@apply`, a `hocus` custom variant, and a CI guard keeping components and tokens in sync — all in one file.

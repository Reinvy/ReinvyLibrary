---
title: "Tailwind CSS v4 CSS-First Configuration Cheatsheet"
description: "A quick reference for Tailwind CSS v4's CSS-first configuration system: @theme design tokens, @utility custom utilities, @variant and @custom-variant, @plugin, automatic content detection, and the upgrade path from v3."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Tailwind CSS v4 CSS-First Configuration Cheatsheet

## Quick Reference Table

| Directive / Command | Syntax | Purpose |
|---------------------|--------|---------|
| Entry point | `@import "tailwindcss";` | Replaces the three legacy `@tailwind` directives |
| Design tokens | `@theme { --color-brand-500: oklch(...); }` | Define colors, fonts, spacing, and more as CSS variables |
| Custom utility | `@utility card { ... }` | Create a reusable utility with variant support |
| Custom variant | `@variant hocus (&:hover, &:focus);` | Add a custom variant selector |
| Shorthand variant | `@custom-variant dark (&:where(.dark, .dark *));` | Define a variant in one line |
| JS plugin | `@plugin "@tailwindcss/forms";` | Load a JavaScript plugin from CSS |
| Extra content source | `@source "../components/**/*.html";` | Add paths for automatic content detection |
| Legacy config bridge | `@config "../../tailwind.config.js";` | Load a v3-style JS config in v4 |
| Reference styles | `@reference "./main.css";` | Import styles for `@apply` without emitting them |
| Compose utilities | `@apply flex items-center;` | Build component classes from utilities |
| Upgrade tool | `npx @tailwindcss/upgrade` | Automatically migrate a v3 project to v4 |

## Common Commands

### Installation (v4)

```bash
# Install the v4 package and the Vite plugin
npm install tailwindcss @tailwindcss/vite
```

### Vite Plugin Setup

```javascript
// vite.config.js — register the Tailwind plugin
import tailwindcss from '@tailwindcss/vite'

export default {
  plugins: [tailwindcss()],
}
```

### PostCSS Setup

```bash
npm install tailwindcss @tailwindcss/postcss
```

```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### CLI Usage

```bash
# Install the standalone CLI
npm install -D @tailwindcss/cli

# Build once
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css

# Watch mode
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch

# Production build (minified)
NODE_ENV=production npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --minify
```

### Upgrade from v3

```bash
# Run the upgrade tool (rewrites config files and CSS in place)
npx @tailwindcss/upgrade
```

## Code Snippets

### Minimal v4 Entry Point

```css
/* src/input.css — this single import replaces
   @tailwind base; @tailwind components; @tailwind utilities; */
@import "tailwindcss";
```

### Defining Design Tokens with @theme

```css
@import "tailwindcss";

@theme {
  /* Colors become utilities: text-brand-500, bg-brand-500, border-brand-500, ... */
  --color-brand-50: oklch(0.97 0.02 240);
  --color-brand-500: oklch(0.62 0.19 240);
  --color-brand-900: oklch(0.32 0.12 240);

  /* Fonts become utilities: font-display */
  --font-display: "Inter", system-ui, sans-serif;

  /* Spacing scale additions: mt-18, p-18, gap-18, ... */
  --spacing-18: 4.5rem;

  /* Breakpoints become variants: @3xl:flex, ... */
  --breakpoint-3xl: 100rem;

  /* Shadows: shadow-glow */
  --shadow-glow: 0 0 24px rgb(59 130 246 / 0.5);
}
```

### Referencing Tokens in Custom CSS

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 240);
}

/* Tokens are plain CSS variables — use them anywhere */
.card-accent {
  background-color: var(--color-brand-500);
}

/* Utilities generated from tokens resolve to the same variables */
.card-accent {
  @apply bg-brand-500;
}
```

### Custom Utilities with @utility

```css
@import "tailwindcss";

@utility text-balance {
  text-wrap: balance;
}

@utility card {
  @apply rounded-2xl border border-gray-200 bg-white p-6 shadow-sm;
}
```

```html
<!-- Custom utilities support variants like built-in ones -->
<p class="text-balance">Balanced text wrapping</p>
<div class="card hover:shadow-lg">Hoverable card</div>
```

### Custom Variants with @variant and @custom-variant

```css
@import "tailwindcss";

/* Multi-selector variant */
@variant hocus (&:hover, &:focus);

/* Class-based dark mode (replaces darkMode: 'class' in the JS config) */
@custom-variant dark (&:where(.dark, .dark *));

/* Data-attribute variant */
@custom-variant required (&[data-required="true"]);
```

```html
<button class="bg-blue-500 hocus:bg-blue-700">Hover or focus</button>
<div class="bg-white dark:bg-gray-900">Dark mode aware</div>
<input class="border-gray-300 required:border-red-500" data-required="true" />
```

### Loading JavaScript Plugins

```css
@import "tailwindcss";
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
```

### Explicit Content Sources

```css
@import "tailwindcss";

/* Automatic detection usually suffices; add sources when files
   live outside the project root or use dynamic class names */
@source "../shared-components/**/*.html";
@source "../../node_modules/@acme/ui/dist/*.js";
```

### Dark Mode with the Default Media Strategy

```css
@import "tailwindcss";

/* v4 defaults to prefers-color-scheme — no config required */
```

```html
<div class="bg-white dark:bg-gray-900">Follows the system preference</div>
```

### Arbitrary Values and Properties

```html
<!-- Arbitrary values work in v4 exactly like v3 -->
<div class="w-[calc(100%-2rem)] bg-[oklch(0.62_0.19_240)]"></div>

<!-- Arbitrary properties -->
<div class="[mask-image:linear-gradient(black,transparent)]"></div>
```

### Applying Utilities Across Files with @reference

```css
/* components/button.css — reuse utilities from the main file
   without duplicating the generated CSS */
@reference "./main.css";

.btn {
  @apply inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white;
}
```

### Migrating a v3 Config with @config

```css
@import "tailwindcss";

/* Bridges an existing tailwind.config.js during a gradual migration */
@config "../../tailwind.config.js";
```

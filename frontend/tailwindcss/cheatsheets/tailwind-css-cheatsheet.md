---
title: "Tailwind CSS Cheat Sheet"
description: "A quick reference for Tailwind CSS utility classes, CLI commands, configuration, and common patterns."
category: "frontend"
technology: "tailwindcss"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Tailwind CSS Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Initialize project | `npm init -y && npm install -D tailwindcss` | Install Tailwind CSS as a dev dependency |
| Create config | `npx tailwindcss init` | Generate tailwind.config.js |
| Create config (all) | `npx tailwindcss init --full` | Generate full config with all defaults |
| Build CSS | `npx tailwindcss -i ./src/input.css -o ./dist/output.css` | Build CSS from input to output |
| Watch mode | `npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch` | Rebuild on file changes |
| Minify output | `npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify` | Optimize for production |
| PostCSS CLI | `npx tailwindcss build src/style.css -o dist/style.css` | Build via PostCSS plugin |
| Start CDN | `<script src="https://cdn.tailwindcss.com"></script>` | Use Tailwind via CDN (dev only) |

## Common Commands

### Installation & Setup

```bash
# Install via npm
npm install -D tailwindcss

# Create config file
npx tailwindcss init

# Install with PostCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Build Commands

```bash
# Development build (unminified with source maps)
npx tailwindcss -i ./src/input.css -o ./dist/output.css

# Watch mode for development
npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch

# Production build (minified)
NODE_ENV=production npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify
```

### Tailwind CLI Options

```bash
# Show all available options
npx tailwindcss --help

# Build with custom postcss config
npx tailwindcss -c ./tailwind.config.js -i ./src/input.css -o ./dist/output.css

# Specify content paths
npx tailwindcss --content "./src/**/*.{html,js}" -i ./src/input.css -o ./dist/output.css
```

## Code Snippets

### Input CSS Setup

```css
/* src/input.css — Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Optional: custom base styles */
@layer base {
  h1 {
    @apply text-2xl font-bold;
  }
  a {
    @apply text-blue-600 hover:underline;
  }
}
```

### Configuration (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      screens: {
        'xs': '375px',
        '3xl': '1920px',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

### Responsive Layout Patterns

```html
<!-- Responsive card grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold">Card Title</h3>
    <p class="text-gray-600 mt-2">Card content</p>
  </div>
</div>

<!-- Responsive sidebar layout -->
<div class="flex flex-col md:flex-row min-h-screen">
  <aside class="w-full md:w-64 bg-gray-100 p-4">
    <!-- Sidebar content -->
  </aside>
  <main class="flex-1 p-6">
    <!-- Main content -->
  </main>
</div>

<!-- Responsive typography -->
<p class="text-sm sm:text-base lg:text-lg">
  Text that scales at each breakpoint.
</p>
```

### Flexbox Utilities

```html
<!-- Centering content -->
<div class="flex items-center justify-center h-64">
  <span>Centered</span>
</div>

<!-- Space between items -->
<div class="flex justify-between items-center">
  <div>Left</div>
  <div>Right</div>
</div>

<!-- Flex column with gap -->
<div class="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- Responsive flex direction -->
<div class="flex flex-col md:flex-row gap-6">
  <div class="flex-1">Column on mobile, row on desktop</div>
  <div class="flex-1">Flexible equal-width items</div>
</div>
```

### Grid Utilities

```html
<!-- Basic grid -->
<div class="grid grid-cols-3 gap-4">
  <div class="bg-blue-100 p-4">1</div>
  <div class="bg-blue-100 p-4">2</div>
  <div class="bg-blue-100 p-4">3</div>
</div>

<!-- Auto-fit grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <!-- Cards auto-arrange -->
</div>

<!-- Spanning columns -->
<div class="grid grid-cols-4 gap-4">
  <div class="col-span-2">Spans 2 columns</div>
  <div class="col-span-1">Normal</div>
  <div class="col-span-1">Normal</div>
</div>
```

### Spacing & Sizing

```html
<!-- Margin (m, mx, my, mt, mr, mb, ml) -->
<div class="m-4 mx-auto mt-8 mb-4 p-6">
  Margin shorthand: m-0 to m-96; also negative: -m-4
</div>

<!-- Padding -->
<div class="p-4 px-6 py-2 pt-8 pb-4 pl-10 pr-10">
  Padding shorthand: p-0 to p-96
</div>

<!-- Width -->
<div class="w-full w-1/2 w-3/4 w-64 w-auto max-w-4xl min-w-0">
  Width classes
</div>

<!-- Height -->
<div class="h-full h-screen h-64 h-auto min-h-screen max-h-96">
  Height classes
</div>
```

### Typography Utilities

```html
<!-- Font sizes -->
<p class="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
  Responsive text sizes
</p>
<h1 class="text-4xl font-bold tracking-tight">Heading</h1>
<h2 class="text-3xl font-semibold">Subheading</h2>
<h3 class="text-2xl font-medium">Section Title</h3>

<!-- Font weight -->
<p class="font-thin font-light font-normal font-medium font-semibold font-bold font-black">
  Font weight variants
</p>

<!-- Line height -->
<p class="leading-none leading-tight leading-snug leading-normal leading-relaxed leading-loose">
  Leading (line-height) utilities
</p>

<!-- Text alignment & decoration -->
<p class="text-left text-center text-right text-justify">
  Alignment
</p>
<p class="underline line-through no-underline">Text decoration</p>
<p class="uppercase lowercase capitalize">Text transform</p>
<p class="truncate">Long text that will be truncated with an ellipsis if it exceeds the container width</p>
```

### Color & Background

```html
<!-- Text colors -->
<p class="text-gray-900 text-blue-600 text-red-500 text-green-600 text-white">
  Text color using shade scale (50-950)
</p>

<!-- Background colors -->
<div class="bg-gray-100 bg-blue-500 bg-gradient-to-r from-cyan-500 to-blue-500">
  Background with gradient
</div>

<!-- Opacity utilities -->
<div class="bg-black bg-opacity-50 text-white text-opacity-75">
  Opacity modifiers (0-100 in steps of 5 or 10)
</div>
```

### Border & Radius

```html
<!-- Border width -->
<div class="border border-2 border-4 border-0 border-b-2 border-l-4">
  Border width: 0, 2, 4, 8
</div>

<!-- Border color -->
<div class="border border-gray-200 border-blue-500 border-red-300">
  Border colors use the same palette as text
</div>

<!-- Border radius -->
<div class="rounded rounded-sm rounded-md rounded-lg rounded-xl rounded-2xl rounded-3xl rounded-full">
  Border radius variants
</div>
<div class="rounded-t-lg rounded-b-none rounded-l-full rounded-r-md">
  Individual corners
</div>
```

### Effects & Transforms

```html
<!-- Box shadow -->
<div class="shadow-sm shadow-md shadow-lg shadow-xl shadow-2xl shadow-inner shadow-none">
  Shadow elevations
</div>

<!-- Transforms -->
<div class="scale-75 scale-110 rotate-45 -rotate-12 translate-x-4 translate-y-2 skew-x-6">
  Transform utilities
</div>

<!-- Transitions -->
<button class="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg focus:ring-2">
  Hover me
</button>
```

### State Variants

```html
<!-- Hover, Focus, Active -->
<button class="bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 active:bg-blue-800 disabled:opacity-50">
  Interactive Button
</button>

<!-- Group hover -->
<div class="group hover:bg-gray-50 p-4 rounded-lg cursor-pointer">
  <h3 class="text-gray-900 group-hover:text-blue-600">Card Title</h3>
  <p class="text-gray-500 group-hover:text-gray-700">Card description appears on hover</p>
</div>

<!-- Peer modifier -->
<div>
  <input type="checkbox" class="peer" />
  <label class="peer-checked:text-blue-600">Checked state label</label>
  <p class="hidden peer-checked:block">This content shows when checkbox is checked</p>
</div>
```

### Dark Mode

```html
<!-- Toggle dark mode via class -->
<html class="dark">
<body class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <div class="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
    <h2 class="text-gray-900 dark:text-white">Dark Mode Card</h2>
    <p class="text-gray-600 dark:text-gray-300">This card adapts to dark mode</p>
  </div>
</body>
</html>
```

### Custom Components with @apply

```css
/* In your CSS file or component library */
@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center px-6 py-3 
           bg-blue-600 text-white font-medium rounded-lg 
           hover:bg-blue-700 focus:outline-none focus:ring-2 
           focus:ring-blue-500 focus:ring-offset-2 
           transition-colors duration-200 
           disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .card {
    @apply bg-white rounded-xl shadow-md overflow-hidden 
           hover:shadow-lg transition-shadow duration-300;
  }
}
```

### Framework Integration

```html
<!-- Next.js with Tailwind -->
<div className="container mx-auto px-4 py-8">
  <h1 className="text-4xl font-bold text-gray-900">Hello Next.js</h1>
</div>

<!-- Vue.js with Tailwind -->
<template>
  <div class="flex flex-col items-center min-h-screen bg-gray-50">
    <header class="w-full bg-white shadow-sm p-4">
      <h1 class="text-2xl font-semibold text-center">Vue + Tailwind</h1>
    </header>
  </div>
</template>

<!-- React with Tailwind -->
function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-gray-900">React + Tailwind</h1>
      </div>
    </div>
  );
}
```

### Plugin Usage

```javascript
// tailwind.config.js — adding plugins
module.exports = {
  plugins: [
    require('@tailwindcss/forms'),
    // Resets form elements for easier styling
    require('@tailwindcss/typography'),
    // Prose classes for rich text content
    require('@tailwindcss/aspect-ratio'),
    // Aspect ratio utilities (aspect-w-16 aspect-h-9)
    require('@tailwindcss/container-queries'),
    // Container query support (@sm, @md, @lg)
  ],
}
```

```html
<!-- Typography plugin -->
<article class="prose prose-lg prose-blue dark:prose-invert max-w-none">
  <h1>Rich Text Content</h1>
  <p>Styled automatically with the typography plugin.</p>
</article>

<!-- Aspect ratio plugin -->
<div class="aspect-w-16 aspect-h-9">
  <iframe src="https://www.youtube.com/embed/..." class="w-full h-full"></iframe>
</div>

<!-- Container queries plugin -->
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-4">
    <!-- Responsive to container, not viewport -->
  </div>
</div>
```

### Production Optimization

```javascript
// tailwind.config.js — production optimization
module.exports = {
  content: [
    // **Explicit** paths only — no broad globs that scan node_modules
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // PurgeCSS is automatic in production when content is configured
  safelist: [
    // Classes that are dynamically constructed in JS
    'bg-red-500',
    'bg-green-500',
    'bg-blue-500',
  ],
}
```

```bash
# Build for production with environment flag
NODE_ENV=production npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify

# Expected output size for a typical project:
# - Development: ~3-4 MB (all classes available)
# - Production: ~10-50 KB (only used classes)
```

### Animation

```html
<!-- Built-in animations -->
<div class="animate-spin">Loading</div>
<div class="animate-ping">Ping indicator</div>
<div class="animate-pulse">Pulse skeleton</div>
<div class="animate-bounce">Bounce</div>
<div class="animate-none">No animation</div>

<!-- Custom animation config -->
<div class="animate-fade-in">
  Custom animation defined in tailwind.config.js
</div>
```

```javascript
// Custom animation in tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
};
```

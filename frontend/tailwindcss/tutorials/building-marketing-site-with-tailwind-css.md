---
title: "Building a Marketing Site with Tailwind CSS"
description: "Design and ship a complete marketing landing page with Tailwind CSS v4: fluid hero, conversion-focused CTAs, feature grids, scroll reveals, and an accessible dark mode toggle."
category: "frontend"
technology: "tailwindcss"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Marketing Site with Tailwind CSS

## Summary

Build a production-ready marketing landing page from an empty folder with Tailwind CSS v4. You will assemble a fluid hero, a responsive type scale, accessible CTAs, a feature grid, scroll reveals, and a persisted dark mode toggle — without a component library.

## Target Audience

- Frontend developers who know HTML/CSS and want a repeatable process for marketing pages.
- Fullstack developers shipping product pages with consistent design tokens.

## Prerequisites

- Node.js 20+ and npm, plus a browser with DevTools.
- Working knowledge of CSS custom properties, flexbox, and grid.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold Vite + Tailwind v4 with a custom design token layer.
- Build a hero with fluid typography that needs no breakpoint overrides.
- Design CTAs with visible focus states and correct ARIA semantics.
- Add scroll reveals that respect `prefers-reduced-motion`.
- Implement a dark mode toggle that persists safely.

## Context and Motivation

Marketing pages are the highest-traffic surface most teams own, yet usually the least engineered. Marketers need sections weekly, designers need consistency, and every dependency raises the JavaScript budget for a page whose job is to load instantly. Tailwind fits because the design system lives in markup and tokens, not a runtime component tree.

The failure mode is accumulation: ad-hoc classes, one-off hex colors, and three button styles across five sections. Treat the page as a small design system with a narrow set of named tokens.

## Core Content

### Setting Up a Tailwind v4 Project

Tailwind v4 configures itself from CSS rather than `tailwind.config.js`, and the first-party Vite plugin handles content detection, so no `content` glob array is maintained by hand.

```bash
npm create vite@latest marketing-site -- --template vanilla
cd marketing-site && npm install
npm install tailwindcss @tailwindcss/vite
```

Register the plugin in `vite.config.js`. Your stylesheet then becomes the single source of truth for colors, fonts, and the fluid display scale.

### Hero, Type Scale, and CTA Anatomy

A hero has four jobs: state the value proposition, show proof, offer one primary action, and load fast. Use a semantic `<section>` with one `<h1>`, a paragraph of roughly 65 characters per line, and a button group. Left-aligned text with a right-hand visual scans faster and reflows predictably.

Instead of `text-4xl md:text-5xl lg:text-6xl` at every heading level, define fluid steps once with `clamp(min, preferred, max)`. The `vw`-based middle value grows type continuously rather than jumping, and the max keeps display size sane on ultrawide monitors.

A CTA is a button, not a styled `<div>`: use `<a>` for navigation and `<button>` for in-page actions. Label contrast must reach 4.5:1 and the focus ring must be visible against both button and page, which `focus-visible:ring-2` with an offset delivers. Keep one primary action per viewport; secondary actions go outline or ghost.

### Feature Grids with Consistent Rhythm

Use `grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]` so columns adapt with no breakpoints. Give every card identical internal structure (icon, title, one paragraph) and cap copy with `line-clamp-3`, so unequal text cannot break the baseline or card heights.

### Motion and Dark Mode

Motion should confirm causality, not decorate: a short translate-and-fade on entry via `IntersectionObserver` is enough, gated behind `motion-safe:`. The critical detail is the fallback — add animation classes with JavaScript rather than shipping `opacity-0` in HTML, so content stays visible if JS fails.

Tailwind v4 defaults to `prefers-color-scheme`. For a manual toggle, register a class-bound `dark` variant, apply the class on `<html>` before first paint to avoid a flash, and persist the choice in `localStorage`. A missing stored value means "follow the system" and falls back to the media query.

### Accessibility Guardrails

One `<h1>` with heading levels descending in order; decorative images use `alt=""` while meaningful ones describe content; icon-only links carry `aria-label` plus `sr-only` text; targets stay at least 44x44 CSS pixels.

## Code Examples

Token layer and dark variant registration in `src/style.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
    --color-brand-500: oklch(0.62 0.19 258);
    --color-brand-600: oklch(0.55 0.2 258);
    --text-display: clamp(2.5rem, 1.5rem + 4.5vw, 4.75rem);
    --text-display--line-height: 1.05;
}
```

Hero and feature grid in `index.html`:

```html
<main class="mx-auto max-w-6xl px-6">
    <section class="grid gap-12 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
            <h1 class="mt-4 text-display font-semibold text-slate-900 dark:text-white">Ship your API twice as fast</h1>
            <p class="mt-6 max-w-prose text-slate-600 dark:text-slate-300">Generate typed clients, tests, and docs from one schema file.</p>
            <div class="mt-8 flex flex-wrap items-center gap-4">
                <a href="/signup" class="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none">Start free</a>
                <a href="#features" class="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">See how it works</a>
            </div>
        </div>
        <img src="/hero-dashboard.png" width="960" height="720" loading="eager" alt="Dashboard showing generated client code and passing tests" class="w-full rounded-2xl border border-slate-200 shadow-2xl dark:border-slate-800" />
    </section>
    <section id="features" class="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-6 pb-24">
        <article class="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
            <h2 class="font-semibold text-slate-900 dark:text-white">Typed by default</h2>
            <p class="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">Every endpoint becomes a typed function with inferred request and response shapes.</p>
        </article>
    </section>
</main>
```

Theme toggle and reveal wiring in `src/main.js`:

```javascript
const root = document.documentElement;
const stored = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
if (stored === "dark" || (stored === null && prefersDark)) root.classList.add("dark");

document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    const isDark = root.classList.toggle("dark");
    try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (error) {
        console.warn("Theme preference could not be persisted", error);
    }
});

const targets = document.querySelectorAll("[data-reveal]");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("opacity-100"));
} else {
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.replace("opacity-0", "opacity-100");
            observer.unobserve(entry.target);
        }
    }, { threshold: 0.15 });
    targets.forEach((el) => {
        el.classList.add("opacity-0", "transition-opacity", "duration-500");
        observer.observe(el);
    });
}
```

## Key Insights

- Put the flash-of-wrong-theme guard in an inline `<script>` in `<head>`; a module script runs after paint and users see a white flash.
- Extend the theme with `@theme` instead of scattering `text-[#3b82f6]`; one token rename then updates the whole page.
- `focus-visible` fires only for keyboard users; `focus` also triggers on clicks and leaves distracting rings. Above-the-fold images need explicit `width`/`height`.

## Next Steps

- Read the Tailwind CSS performance optimization guide to trim the shipped stylesheet.
- Study the accessibility engineering syllabus for audit and screen reader workflows.

## Conclusion

You now have a marketing page built from a small, named token layer rather than a pile of one-off utilities. Fluid typography replaced the breakpoint ladder, CTAs and focus styles are accessible by construction, the feature grid adapts without media queries, and the toggle avoids both the flash and the storage crash. The same skeleton extends to pricing tables, testimonials, and FAQ sections with no new tokens.

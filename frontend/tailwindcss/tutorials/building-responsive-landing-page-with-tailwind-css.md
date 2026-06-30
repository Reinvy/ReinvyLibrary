---
title: "Building a Responsive Landing Page with Tailwind CSS"
description: "A project-based tutorial on building a complete, responsive marketing landing page using Tailwind CSS — covering layout, typography, dark mode, animations, and production optimization."
category: "frontend"
technology: "tailwindcss"
difficulty: "beginner"
type: "tutorial"
locale: "en"
---

# Building a Responsive Landing Page with Tailwind CSS

## Summary

In this project-based tutorial, you will build a complete marketing landing page from scratch using Tailwind CSS. Starting from project setup with the Tailwind CLI, you will construct real-world components — a navigation bar, hero section, features grid, pricing cards, testimonials, FAQ accordion, and a footer — while learning responsive design patterns, dark mode theming, hover and focus animations, and production build optimization. By the end, you will have a deployable landing page and a reusable workflow for building Tailwind projects.

## Target Audience

- Frontend developers and designers who know HTML and CSS basics and want to learn Tailwind CSS through a practical project.
- Beginners to Tailwind CSS who have completed a fundamentals tutorial and want to apply those skills.
- Anyone looking to build fast, responsive marketing pages without writing custom CSS.

## Prerequisites

- Basic knowledge of HTML (tags, attributes, class names).
- Familiarity with CSS concepts like flexbox and grid (conceptual understanding is enough).
- Node.js 16+ and npm installed on your machine.
- A code editor (VS Code recommended).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a Tailwind CSS project using the Tailwind CLI with a custom configuration.
- Build responsive layouts using Tailwind's utility classes and breakpoint prefixes (`sm`, `md`, `lg`, `xl`).
- Apply typography, spacing, color, and background utilities to create polished UI components.
- Implement dark mode using Tailwind's `class`-based strategy.
- Add hover, focus, and group-based animations and transitions without writing custom CSS.
- Optimize the final build for production using Tailwind's purging mechanism.

## Context and Motivation

A marketing landing page is one of the most common web development projects. Whether you are launching a SaaS product, a mobile app, or a personal portfolio, the landing page is the first impression visitors have of your work. Building one from scratch with raw CSS can be time-consuming — managing responsive breakpoints, consistent spacing, color schemes, and dark mode across dozens of components quickly becomes repetitive.

Tailwind CSS solves this by providing low-level utility classes that let you compose designs directly in your HTML. Instead of switching between an HTML file and a CSS file, you build everything in one place. The result is faster iteration, more consistent designs, and a smaller CSS bundle in production.

In this project, you will build a landing page for a fictional SaaS product called "FlowBoard" — a project management tool. The skills you learn here apply directly to any marketing site, portfolio, or product landing page.

## Core Content

### Project Scaffolding with Tailwind CLI

Start by creating a new project directory and initializing it with npm:

```bash
mkdir flowboard-landing
cd flowboard-landing
npm init -y
```

Install Tailwind CSS, PostCSS, and the Tailwind CLI as development dependencies:

```bash
npm install -D tailwindcss @tailwindcss/cli
```

Create the main input CSS file at `src/input.css`:

```css
@import "tailwindcss";
```

Create a `tailwind.config.js` file to enable dark mode via the `class` strategy:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./*.html', './src/**/*.html'],
};
```

Create an `index.html` file and wire up the build step in `package.json`:

```json
"scripts": {
  "dev": "tailwindcss -i src/input.css -o src/output.css --watch",
  "build": "tailwindcss -i src/input.css -o src/output.css --minify"
}
```

Run `npm run dev` to start the Tailwind CLI in watch mode. Every time you save your HTML file, the output CSS is regenerated with only the classes you used.

### HTML Document Structure

Create the basic HTML skeleton in `index.html`. The key decision is the `dark` class on the `<html>` element — you will toggle it programmatically later with JavaScript.

```html
<!DOCTYPE html>
<html lang="en" class="">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlowBoard — Project Management, Simplified</title>
  <link rel="stylesheet" href="src/output.css" />
</head>
<body class="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased transition-colors duration-300">

  <!-- All page content goes here -->

  <script src="src/main.js"></script>
</body>
</html>
```

The `transition-colors duration-300` on the `<body>` ensures a smooth color transition when toggling dark mode.

### Building the Navigation Bar

The navigation bar includes the logo, primary navigation links, a dark mode toggle button, and a call-to-action (CTA) button. On mobile, these collapse behind a hamburger menu.

```html
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <a href="#" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">F</span>
        </div>
        <span class="font-bold text-xl">FlowBoard</span>
      </a>

      <!-- Desktop Nav Links -->
      <div class="hidden md:flex items-center gap-8">
        <a href="#features" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a>
        <a href="#pricing" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</a>
        <a href="#testimonials" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Testimonials</a>
        <a href="#faq" class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">FAQ</a>
      </div>

      <!-- Right side: Dark mode toggle + CTA -->
      <div class="flex items-center gap-4">
        <button id="dark-toggle" class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle dark mode">
          <!-- Sun icon (shown in dark mode) -->
          <svg id="sun-icon" class="hidden dark:block w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <!-- Moon icon (shown in light mode) -->
          <svg id="moon-icon" class="block dark:hidden w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        </button>
        <a href="#" class="hidden sm:inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Get Started</a>
      </div>

      <!-- Mobile hamburger -->
      <button id="menu-toggle" class="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle menu">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
    </div>
  </div>

  <!-- Mobile Menu (hidden by default) -->
  <div id="mobile-menu" class="hidden md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
    <div class="px-4 py-4 space-y-3">
      <a href="#features" class="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600">Features</a>
      <a href="#pricing" class="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600">Pricing</a>
      <a href="#testimonials" class="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600">Testimonials</a>
      <a href="#faq" class="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600">FAQ</a>
      <a href="#" class="block text-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg">Get Started</a>
    </div>
  </div>
</nav>
```

Key Tailwind patterns used here:

- **`fixed top-0 left-0 right-0 z-50`** — pins the navbar to the top with a high z-index so it floats above other content.
- **`bg-white/80 backdrop-blur-md`** — a semi-transparent background with a blur effect, creating the modern "frosted glass" navbar.
- **`dark:bg-gray-950/80 dark:border-gray-800`** — dark mode variants for every background and border color.
- **`hidden md:flex`** — hides the desktop nav links on mobile, shows them from `md` breakpoint (768px) upward.
- **`hidden sm:inline-flex`** — hides the CTA button on extra-small screens.
- **`md:hidden`** — shows the hamburger only on mobile.
- **`hover:text-indigo-600`** and **`transition-colors`** — color changes on hover with a smooth transition.

### Hero Section with Gradient Background

The hero section is the first thing visitors see. It should clearly communicate the product value proposition with a headline, subtext, CTA buttons, and a visual element.

```html
<!-- Hero Section -->
<section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <div class="text-center max-w-4xl mx-auto">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full mb-6">
        <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
        New: AI-powered task suggestions
      </div>
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
        Project Management,
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Simplified.</span>
      </h1>
      <p class="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        FlowBoard brings your team's tasks, timelines, and communication into one beautiful dashboard. Stop juggling tools — start shipping.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="#" class="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all duration-200 text-center">
          Start Free Trial
        </a>
        <a href="#" class="w-full sm:w-auto px-8 py-3.5 border border-gray-300 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all duration-200 text-center">
          Watch Demo
        </a>
      </div>
    </div>

    <!-- Hero visual / dashboard preview -->
    <div class="mt-16 relative max-w-5xl mx-auto">
      <div class="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 via-transparent to-transparent z-10 pointer-events-none"></div>
      <div class="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl">
        <img src="https://placehold.co/1200x675/e2e8f0/475569?text=Dashboard+Preview" alt="FlowBoard dashboard preview" class="w-full" />
      </div>
    </div>
  </div>
</section>
```

Notable techniques:

- **`text-transparent bg-clip-text bg-gradient-to-r`** — creates a gradient text effect for the emphasized word.
- **`shadow-lg shadow-indigo-600/25`** — a colored shadow that matches the brand color with opacity.
- **`animate-pulse`** — Tailwind's built-in pulse animation for the "live" badge dot.
- **`bg-gradient-to-t from-white via-transparent to-transparent`** — a fade overlay on the dashboard image to create depth.
- **`tracking-tight`** — tighter letter-spacing for headings, a common design practice.

### Features Section with Icon Cards

The features section showcases the product's key selling points using a responsive card grid.

```html
<!-- Features Section -->
<section id="features" class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Everything you need to ship faster
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        FlowBoard combines task management, real-time collaboration, and reporting into one seamless experience.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Feature Card 1 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Task Management</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Create, assign, and prioritize tasks with drag-and-drop kanban boards. Set due dates and dependencies.</p>
      </div>

      <!-- Feature Card 2 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Team Collaboration</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Real-time comments, @mentions, and activity feeds keep everyone aligned without endless email threads.</p>
      </div>

      <!-- Feature Card 3 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analytics & Reports</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Track velocity, burndown, and cycle time with customizable dashboards. Export reports for stakeholders.</p>
      </div>

      <!-- Feature Card 4 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Timeline & Roadmaps</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Visual project timelines with Gantt-style views. Plan sprints and map dependencies across teams.</p>
      </div>

      <!-- Feature Card 5 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Enterprise Security</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">SOC 2 compliant, SSO integration, granular role-based access controls, and audit logging.</p>
      </div>

      <!-- Feature Card 6 -->
      <div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-600/5 transition-all duration-200">
        <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">File Sharing</h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Drag-and-drop file uploads with preview, version history, and integration with Google Drive and Dropbox.</p>
      </div>
    </div>
  </div>
</section>
```

Key patterns:

- **`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`** — responsive grid that goes from 1 column on mobile to 3 on desktop.
- **`group` and `group-hover:scale-110`** — the parent `group` class lets children respond to the parent's hover state, enabling the icon to scale up when the card is hovered.
- **`shadow-sm hover:shadow-lg hover:shadow-indigo-600/5`** — subtle shadow elevation on hover with a brand-colored tint.
- **`hover:border-indigo-600`** — border color change on card hover for a clear interactive state.

### Pricing Section with Tiered Cards

The pricing section lets visitors compare plans at a glance. Highlighting the "most popular" plan with a different visual treatment drives conversions.

```html
<!-- Pricing Section -->
<section id="pricing" class="py-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Simple, transparent pricing
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Start free, upgrade when you grow. No hidden fees.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      <!-- Starter Plan -->
      <div class="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Starter</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">For small teams getting started.</p>
        <div class="mt-6">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
          <span class="text-gray-500 dark:text-gray-400">/month</span>
        </div>
        <ul class="mt-6 space-y-3">
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Up to 5 team members
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            3 active projects
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Basic kanban boards
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Community support
          </li>
        </ul>
        <a href="#" class="mt-8 block text-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-colors">Get Started</a>
      </div>

      <!-- Pro Plan (Most Popular) -->
      <div class="relative p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 shadow-xl shadow-indigo-600/10 scale-105">
        <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full uppercase tracking-wider">Most Popular</div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pro</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">For growing teams and power users.</p>
        <div class="mt-6">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">$29</span>
          <span class="text-gray-500 dark:text-gray-400">/month</span>
        </div>
        <ul class="mt-6 space-y-3">
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Unlimited team members
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Unlimited projects
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Timeline & Gantt views
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Priority support
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            API access & webhooks
          </li>
        </ul>
        <a href="#" class="mt-8 block text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200">Start Free Trial</a>
      </div>

      <!-- Enterprise Plan -->
      <div class="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Enterprise</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">For organizations with advanced needs.</p>
        <div class="mt-6">
          <span class="text-4xl font-bold text-gray-900 dark:text-white">$99</span>
          <span class="text-gray-500 dark:text-gray-400">/month</span>
        </div>
        <ul class="mt-6 space-y-3">
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Everything in Pro
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            SSO & SAML
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Audit logs & compliance
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Dedicated account manager
          </li>
          <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Custom integrations
          </li>
        </ul>
        <a href="#" class="mt-8 block text-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-colors">Contact Sales</a>
      </div>
    </div>
  </div>
</section>
```

Design decisions:

- **`border-2 border-indigo-600 scale-105`** — the "most popular" card has a thicker brand-colored border and is slightly larger, naturally drawing the eye.
- **`absolute -top-3.5 left-1/2 -translate-x-1/2`** — the badge is positioned to overlap the card border, creating a polished visual anchor.
- **`uppercase tracking-wider`** — the badge text uses uppercase with increased letter-spacing for a premium feel.

### Testimonials Section

Social proof builds trust. This section uses a simple grid with avatar, quote, and attribution.

```html
<!-- Testimonials Section -->
<section id="testimonials" class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Loved by teams worldwide
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
        See what our customers say about FlowBoard.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <!-- 4 more stars -->
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </div>
        <p class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
          "FlowBoard transformed how our remote team collaborates. We went from scattered Slack messages and spreadsheets to a single source of truth. The kanban boards are incredibly intuitive."
        </p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">SK</div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Sarah Kim</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">CTO, Lighthouse Studio</p>
          </div>
        </div>
      </div>

      <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </div>
        <p class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
          "The timeline and Gantt views alone are worth the price. We manage a dozen concurrent projects and FlowBoard gives us clarity we never had with our old tools."
        </p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">MR</div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Marcus Rivera</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">PMO Director, BuildForge Inc.</p>
          </div>
        </div>
      </div>

      <div class="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        </div>
        <p class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
          "As a freelance designer, FlowBoard helps me keep client projects organized without the overhead of enterprise tools. The file sharing and version history are game-changers."
        </p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-semibold">AL</div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Aiko Lopez</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Independent Designer</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

The star rating uses a repeating SVG pattern. Notice that Tailwind's `fill="currentColor"` with `text-yellow-400` colors the stars without needing separate SVG fills. Each testimonial card is self-contained with a consistent avatar pattern using gradient backgrounds.

### FAQ Section with Interactive Accordion

The FAQ section presents common questions. The accordion interaction uses vanilla JavaScript.

```html
<!-- FAQ Section -->
<section id="faq" class="py-20 px-4 sm:px-6 lg:px-8">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
        Frequently asked questions
      </h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-300">
        Everything you need to know about FlowBoard.
      </p>
    </div>

    <div class="space-y-4">
      <!-- FAQ Item 1 -->
      <div class="faq-item border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button class="faq-question w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>Can I try FlowBoard for free?</span>
          <svg class="faq-chevron w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
          <div class="px-6 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Yes! FlowBoard offers a generous free tier for up to 5 team members and 3 active projects. No credit card required. Upgrade to Pro when your team outgrows the starter plan.
          </div>
        </div>
      </div>

      <!-- FAQ Item 2 -->
      <div class="faq-item border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button class="faq-question w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>What integrations do you support?</span>
          <svg class="faq-chevron w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
          <div class="px-6 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            FlowBoard integrates with Slack, GitHub, GitLab, Google Drive, Dropbox, Jira, and over 50 other tools. Our open API and webhooks let you build custom integrations as well.
          </div>
        </div>
      </div>

      <!-- FAQ Item 3 -->
      <div class="faq-item border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button class="faq-question w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>Is my data secure?</span>
          <svg class="faq-chevron w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
          <div class="px-6 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Absolutely. FlowBoard is SOC 2 Type II compliant, supports SAML/SSO, and encrypts data at rest and in transit. We host on AWS with redundant backups and 99.99% uptime SLA for enterprise plans.
          </div>
        </div>
      </div>

      <!-- FAQ Item 4 -->
      <div class="faq-item border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button class="faq-question w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>Can I export my data if I leave?</span>
          <svg class="faq-chevron w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <div class="faq-answer max-h-0 overflow-hidden transition-all duration-300">
          <div class="px-6 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Yes, you can export all your projects, tasks, and files as CSV or JSON at any time. We believe in data portability — there are no lock-in contracts.
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Footer Section

The footer wraps up the page with links, branding, and a copyright notice.

```html
<!-- Footer -->
<footer class="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      <div class="col-span-2 md:col-span-1">
        <a href="#" class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">F</span>
          </div>
          <span class="font-bold text-xl text-gray-900 dark:text-white">FlowBoard</span>
        </a>
        <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Project management for modern teams. Built with love.
        </p>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Integrations</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Changelog</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Blog</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Careers</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
        <ul class="space-y-2">
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Security</a></li>
          <li><a href="#" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Cookie Policy</a></li>
        </ul>
      </div>
    </div>
    <div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
      &copy; 2026 FlowBoard. All rights reserved.
    </div>
  </div>
</footer>
```

### JavaScript for Interactivity

The landing page needs two JavaScript behaviors: dark mode toggling with localStorage persistence and the FAQ accordion. Create `src/main.js`:

```javascript
// Dark Mode Toggle
const darkToggle = document.getElementById('dark-toggle');
const html = document.documentElement;

// Check localStorage for saved preference
if (localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  html.classList.add('dark');
}

darkToggle.addEventListener('click', () => {
  html.classList.toggle('dark');
  localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
});

// FAQ Accordion
document.querySelectorAll('.faq-question').forEach(button => {
  button.addEventListener('click', () => {
    const item = button.parentElement;
    const answer = item.querySelector('.faq-answer');
    const chevron = item.querySelector('.faq-chevron');
    const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';

    // Close all other open FAQ items
    document.querySelectorAll('.faq-answer').forEach(a => {
      a.style.maxHeight = '0px';
    });
    document.querySelectorAll('.faq-chevron').forEach(c => {
      c.classList.remove('rotate-180');
    });

    // Open this one if it was closed
    if (!isOpen) {
      answer.style.maxHeight = answer.scrollHeight + 'px';
      chevron.classList.add('rotate-180');
    }
  });
});

// Mobile Menu Toggle
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

menuToggle.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});
```

The dark mode implementation:
- Checks `localStorage` first for a saved preference.
- Falls back to the system preference via `prefers-color-scheme: dark`.
- The `html.classList.toggle('dark')` call triggers every `dark:` variant class throughout the page.

The accordion uses JavaScript to toggle `max-height` between `0` and `scrollHeight`, which produces a smooth CSS transition. Clicking a new item automatically closes the previously open one.

### Production Build

When you are ready to deploy, run the production build:

```bash
npm run build
```

This produces a minified CSS file at `src/output.css` that contains only the utility classes used in your HTML. The resulting bundle is typically under 10 KB, compared to the full Tailwind CSS library which is several megabytes.

Deploy the entire project folder to any static hosting provider — Netlify, Vercel, GitHub Pages, or a simple S3 bucket.

## Code Examples

### Complete Project Structure

```text
flowboard-landing/
├── index.html
├── package.json
├── tailwind.config.js
├── src/
│   ├── input.css        # @import "tailwindcss"
│   ├── output.css       # Generated (gitignore this)
│   └── main.js          # Dark mode, FAQ accordion, mobile menu
```

### Example: Using Tailwind's `group` Utility for Card Hover Effects

The `group` class lets multiple child elements respond to the parent's hover state. This pattern is used in the feature cards to scale the icon and elevate the shadow:

```html
<div class="group p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 hover:border-indigo-600 shadow-sm hover:shadow-lg transition-all duration-200">
  <!-- Icon scales up when the card is hovered -->
  <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
    <svg class="w-6 h-6 text-indigo-600">...</svg>
  </div>
  <h3 class="text-lg font-semibold">Task Management</h3>
  <p class="text-gray-600 text-sm">...</p>
</div>
```

### Example: Dark Mode with `class` Strategy

Every component includes `dark:` prefixed variants for background, text, border, and shadow colors:

```html
<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
```

The `transition-colors duration-300` on the `<body>` ensures smooth color transitions when the user toggles dark mode.

## Key Insights

- **Use `group` and `group-hover` for compound interactions** — this eliminates the need for JavaScript for simple card hover effects. Any child element can respond to the parent's hover state with `group-hover:`.
- **Dark mode with `class` strategy gives the user control** — by persisting the preference in `localStorage` and respecting `prefers-color-scheme`, you respect both explicit choices and system defaults.
- **Every `px-*` and `py-*` is relative to the base font size** — Tailwind's spacing scale uses `rem` units, which scale with the user's browser font size preference, ensuring accessibility.
- **Breakpoint prefixes compose with any utility** — `md:flex`, `lg:grid-cols-3`, `sm:text-xl` — you never write a `@media` query by hand.
- **Production Tailwind CSS is remarkably small** — the purging mechanism means your final CSS contains only the classes you used, typically 5–15 KB gzipped for a landing page.

## Next Steps

- Explore **Tailwind CSS animations** — the `animate-bounce`, `animate-spin`, and custom `@keyframes` for more advanced motion design.
- Learn about **Tailwind CSS plugins** — the official `@tailwindcss/typography` plugin for rich text content, `@tailwindcss/forms` for styled form elements, and `@tailwindcss/aspect-ratio`.
- Deepen your knowledge with the **Tailwind CSS Best Practices Guide** for design system architecture, component extraction strategies, and testing.
- Follow the **Tailwind CSS Syllabus** for a structured 12-week learning path covering everything from utility fundamentals to enterprise design systems.

## Conclusion

In this tutorial, you built a complete, responsive marketing landing page for a SaaS product using Tailwind CSS. You learned how to scaffold a project with the Tailwind CLI, construct real-world components using utility classes, implement responsive layouts with breakpoint prefixes, and add dark mode with the `class` strategy. The project-based approach means you can reuse these patterns for your own products, client projects, or portfolio sites. Tailwind CSS lets you iterate quickly, keep your CSS bundle tiny, and maintain consistent design — all from your HTML.

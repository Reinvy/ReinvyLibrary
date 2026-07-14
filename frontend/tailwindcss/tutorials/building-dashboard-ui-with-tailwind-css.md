---
title: "Building a Dashboard UI with Tailwind CSS"
description: "A project-based tutorial on building a responsive admin dashboard interface using Tailwind CSS — covering sidebar navigation, stats cards, data tables, charts integration, dark mode, and responsive layouts."
category: "frontend"
technology: "tailwindcss"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Dashboard UI with Tailwind CSS

## Summary

Dashboards are among the most common UI patterns in modern web applications — from analytics platforms and e-commerce admin panels to project management tools and SaaS backends. In this project-based tutorial, you will build a complete admin dashboard interface using Tailwind CSS without writing a single line of custom CSS. Starting from project scaffolding with the Tailwind CLI, you will construct a professional dashboard featuring a collapsible sidebar, stats overview cards, a data table with search and pagination, interactive chart placeholders, dark mode theming, and a fully responsive mobile layout. By the end, you will have a reusable dashboard template and a deep understanding of how to compose complex layouts with utility classes.

## Target Audience

- Frontend developers and UI designers who are comfortable with HTML and CSS basics.
- Developers who have completed a foundational Tailwind CSS tutorial and want to apply those skills to a real-world, complex layout project.
- Anyone who needs to build a dashboard or admin panel interface quickly without writing custom CSS.

## Prerequisites

- Basic knowledge of HTML (semantic elements, class attributes, data attributes).
- Familiarity with CSS concepts like flexbox and grid (conceptual understanding is enough to follow the Tailwind utility classes).
- Node.js 16+ and npm installed on your development machine.
- A code editor (VS Code recommended with the Tailwind CSS IntelliSense extension for autocomplete).
- Basic familiarity with Tailwind CSS utility classes (responsive prefixes, spacing, colors).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a Tailwind CSS project with the CLI and configure custom theme values for a dashboard design system.
- Build a responsive sidebar navigation with collapsible submenus and active-state highlighting.
- Design a dashboard header with search input, notification badges, and a user profile dropdown.
- Construct a stats card grid using Tailwind's responsive grid utilities.
- Create a data table with sortable column headers, search filtering, and pagination controls.
- Integrate Chart.js with Tailwind-styled wrapper components for data visualization.
- Implement dark mode with Tailwind's `class` strategy and a manual toggle.
- Build a mobile-responsive layout with a hamburger menu that toggles the sidebar.
- Compose complex, production-quality layouts entirely from utility classes.

## Context and Motivation

Every web application that manages data — whether it is an e-commerce platform, a project management tool, a content management system, or an analytics service — needs a dashboard. A dashboard is the command center where users monitor key metrics, manage resources, and take action. Yet building a dashboard from scratch often means wrestling with complex CSS layouts, responsive breakpoints, dark mode theming, and reusable component patterns.

Tailwind CSS excels at this kind of work. Its utility-first approach lets you compose complex layouts directly in your HTML, eliminating context-switching between HTML and CSS files. Responsive design becomes a matter of adding breakpoint prefixes (`sm:`, `md:`, `lg:`, `xl:`). Dark mode is a single class toggle. Custom design tokens — colors, spacing, fonts — are configured once in `tailwind.config.js` and used everywhere.

In this tutorial, you will build a real-world admin dashboard that could serve as the foundation for any data-driven web application. The techniques you learn — responsive sidebar navigation, data tables, stats cards, chart integration, dark mode — are directly transferable to any Tailwind CSS project.

## Core Content

### Project Setup and Configuration

Start by scaffolding a new Tailwind CSS project with the CLI. This gives you full control over the build process and configuration without tying you to a specific framework.

```bash
mkdir tailwind-dashboard
cd tailwind-dashboard
npm init -y
npm install -D tailwindcss @tailwindcss/cli
npx tailwindcss init
```

Configure the `content` paths in `tailwind.config.js` to scan your HTML files for class usage:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "#1e293b",
          hover: "#334155",
          active: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};
```

Enable dark mode via the `class` strategy — this lets you control dark mode manually with a JavaScript toggle rather than relying on the user's system preference.

Create your CSS entry file at `src/input.css`:

```css
@import "tailwindcss";
```

Add build and watch scripts to `package.json`:

```json
{
  "scripts": {
    "build": "npx @tailwindcss/cli -i src/input.css -o dist/output.css",
    "watch": "npx @tailwindcss/cli -i src/input.css -o dist/output.css --watch"
  }
}
```

Create an `index.html` file in the project root. This is where all your dashboard markup will live.

### Dashboard Layout Architecture

The dashboard layout follows a three-region structure:

- **Sidebar** — fixed left column containing the navigation menu, logo, and user info.
- **Main content area** — scrollable right column containing the header and page content.

```text
┌──────────┬──────────────────────────────────────┐
│          │  Header (search, notifications,      │
│ Sidebar  │  profile dropdown, dark mode toggle) │
│          ├──────────────────────────────────────┤
│  Logo    │                                      │
│  Nav     │  Page Content                        │
│  Links   │  ┌────┬────┬────┬────┐               │
│          │  │Card│Card│Card│Card│               │
│  User    │  ├────┴────┴────┴────┤               │
│  Footer  │  │  Chart Area       │               │
│          │  ├───────────────────┤               │
│          │  │  Data Table       │               │
│          │  └───────────────────┘               │
└──────────┴──────────────────────────────────────┘
```

### Building the Sidebar

The sidebar is a fixed-content column on the left. It contains the brand logo, navigation links with icons, and a user profile section at the bottom. On mobile, the sidebar is hidden by default and revealed when the user clicks the hamburger menu button.

```html
<!-- Sidebar Overlay (mobile only) -->
<div id="sidebarOverlay" class="fixed inset-0 bg-black/50 z-30 hidden lg:hidden"></div>

<!-- Sidebar -->
<aside id="sidebar" class="fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar text-slate-300 
  -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">

  <!-- Logo -->
  <div class="flex items-center gap-3 px-6 h-16 border-b border-slate-700">
    <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
      <span class="text-white font-bold text-sm">D</span>
    </div>
    <span class="text-white font-semibold text-lg">Dashboard</span>
  </div>

  <!-- Navigation -->
  <nav class="px-4 py-6 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
    <!-- Nav items -->
    <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
      bg-sidebar-active text-white transition-colors duration-150"
      data-active="true">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
      <span>Overview</span>
    </a>

    <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
      text-slate-300 hover:bg-sidebar-hover hover:text-white transition-colors duration-150">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
      <span>Analytics</span>
    </a>

    <!-- Collapsible submenu -->
    <div x-data="{ open: false }">
      <button @click="open = !open"
        class="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium
        text-slate-300 hover:bg-sidebar-hover hover:text-white transition-colors duration-150">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
          <span>Management</span>
        </div>
        <svg class="w-4 h-4 transition-transform duration-200" :class="open && 'rotate-180'"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div x-show="open" class="ml-10 mt-1 space-y-1">
        <a href="#" class="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-sidebar-hover
          hover:text-white transition-colors duration-150">Users</a>
        <a href="#" class="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-sidebar-hover
          hover:text-white transition-colors duration-150">Roles</a>
        <a href="#" class="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-sidebar-hover
          hover:text-white transition-colors duration-150">Permissions</a>
      </div>
    </div>
  </nav>

  <!-- User Profile Footer -->
  <div class="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-slate-700 bg-sidebar">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-indigo-400 flex items-center justify-center text-white text-sm font-medium">
        JD
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">Jane Doe</p>
        <p class="text-xs text-slate-400 truncate">jane@example.com</p>
      </div>
      <button class="p-1.5 rounded-lg hover:bg-sidebar-hover transition-colors">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  </div>
</aside>
```

**Key sidebar patterns:**
- Use `fixed top-0 left-0 z-40 h-screen` to pin the sidebar to the left edge of the viewport.
- The `-translate-x-full lg:translate-x-0` combination hides the sidebar off-screen on mobile (`< lg`) and shows it in position on desktop.
- The overlay (`fixed inset-0 bg-black/50 z-30`) sits behind the sidebar on mobile to dim the main content and capture click-to-close.
- Active nav items use `bg-sidebar-active text-white` while inactive items use muted slate colors that brighten on hover.
- Collapsible submenus use Alpine.js `x-data` and `x-show` for lightweight interactivity without a heavy JavaScript framework.

### Building the Header

The header sits at the top of the main content area. It contains a hamburger menu (visible only on mobile), a search bar, notification icons with badges, a dark mode toggle, and the user profile avatar.

```html
<!-- Header -->
<header class="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
  <div class="flex items-center justify-between h-16 px-4 sm:px-6">

    <!-- Left: Hamburger + Search -->
    <div class="flex items-center gap-4 flex-1">
      <!-- Hamburger (mobile only) -->
      <button id="menuBtn" class="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 
        dark:hover:bg-slate-800 transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Search -->
      <div class="hidden sm:flex items-center flex-1 max-w-md">
        <div class="relative w-full">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none"
            stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search..."
            class="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100
            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
            focus:border-transparent transition-colors duration-150" />
        </div>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2 sm:gap-3">

      <!-- Dark Mode Toggle -->
      <button id="darkToggle"
        class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800
        dark:text-slate-400 transition-colors duration-150">
        <!-- Sun icon (shown in dark mode) -->
        <svg id="sunIcon" class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <!-- Moon icon (shown in light mode) -->
        <svg id="moonIcon" class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>

      <!-- Notifications -->
      <button class="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100
        dark:hover:bg-slate-800 dark:text-slate-400 transition-colors duration-150">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>

      <!-- Avatar -->
      <div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
        JD
      </div>
    </div>
  </div>
</header>
```

**Key header patterns:**
- `sticky top-0 z-20` keeps the header pinned at the top when the content scrolls.
- The hamburger button uses `lg:hidden` — it only appears on screens smaller than the `lg` breakpoint.
- The search input is `hidden sm:flex` — it disappears on very small screens to save space.
- The dark mode toggle toggles between sun and moon SVG icons using `dark:block` and `dark:hidden`.
- Badge notifications use `absolute` positioning with `w-2 h-2` dot styling.

### Stats Cards Grid

Stats cards provide at-a-glance metrics. Use a responsive grid that displays 4 cards on large screens, 2 on medium screens, and 1 on small screens:

```html
<!-- Stats Cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
  <!-- Card: Revenue -->
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6
    hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">$45,231</p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          <span class="font-medium">+20.1%</span> from last month
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center
        text-indigo-600 dark:text-indigo-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Card: Subscribers -->
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6
    hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Subscribers</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">2,350</p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          <span class="font-medium">+180</span> this week
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center
        text-cyan-600 dark:text-cyan-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Card: Orders -->
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6
    hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Active Orders</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">147</p>
        <p class="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          <span class="font-medium">+24</span> since yesterday
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center
        text-amber-600 dark:text-amber-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Card: Conversion Rate -->
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6
    hover:shadow-md transition-shadow duration-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Conversion Rate</p>
        <p class="text-2xl font-bold text-slate-900 dark:text-white mt-1">3.24%</p>
        <p class="text-sm text-rose-600 dark:text-rose-400 mt-1">
          <span class="font-medium">-0.5%</span> from last week
        </p>
      </div>
      <div class="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center
        text-rose-600 dark:text-rose-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
    </div>
  </div>
</div>
```

**Key stats card patterns:**
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` creates a responsive card grid that adapts across breakpoints.
- Each card uses `rounded-xl shadow-sm border` for a clean, elevated appearance.
- Icon containers use colored backgrounds (e.g., `bg-indigo-50 text-indigo-600`) that adapt to dark mode with `dark:bg-indigo-900/30 dark:text-indigo-400`.
- Positive trends use `text-emerald-600`, negative trends use `text-rose-600` — both with dark mode variants.
- The `hover:shadow-md transition-shadow` adds subtle interactivity without overwhelming the design.

### Chart Area with Chart.js

For real data visualization, integrate Chart.js inside Tailwind-styled containers. First, include the library:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

Then create a card container with a canvas element:

```html
<!-- Chart Card -->
<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mt-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Revenue Overview</h3>
    <div class="flex items-center gap-2">
      <select class="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5
        bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none
        focus:ring-2 focus:ring-indigo-500">
        <option>Last 7 days</option>
        <option>Last 30 days</option>
        <option>Last 90 days</option>
      </select>
    </div>
  </div>
  <div class="relative h-72">
    <canvas id="revenueChart"></canvas>
  </div>
</div>

<script>
  const ctx = document.getElementById("revenueChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Revenue",
          data: [12400, 18200, 15800, 22100, 19400, 25700, 23100],
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#6366f1",
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "$" + value.toLocaleString(),
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
</script>
```

**Chart integration patterns:**
- Wrap Chart.js canvases in a `relative h-72` container to control chart dimensions without `maintainAspectRatio`.
- Use the period selector dropdown to demonstrate how filters would connect to chart data in a real application.
- Chart colors (`borderColor`, `pointBackgroundColor`) should match your Tailwind design system's primary color (`#6366f1` for indigo-500).
- For dark mode, you would re-render the chart with adjusted grid colors — one approach is to listen for the dark mode toggle and call `chart.destroy()` followed by a new `Chart()` with dark-aware options.

### Building the Data Table

The data table is a core dashboard component. This example includes sortable columns, a searchable row filter, status badges, and pagination controls:

```html
<!-- Data Table Section -->
<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mt-6">
  <!-- Table Header -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4
    border-b border-slate-200 dark:border-slate-700">
    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Recent Orders</h3>
    <div class="flex items-center gap-3 w-full sm:w-auto">
      <div class="relative flex-1 sm:flex-initial">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none"
          stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Filter orders..."
          class="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600
          bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100
          placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
          focus:border-transparent w-full sm:w-64" />
      </div>
      <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium
        rounded-lg transition-colors duration-150">
        + New Order
      </button>
    </div>
  </div>

  <!-- Table -->
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-700">
          <th class="text-left px-6 py-3 font-semibold text-slate-900 dark:text-white cursor-pointer
            hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <div class="flex items-center gap-1">
              Order
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
          </th>
          <th class="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Customer</th>
          <th class="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
          <th class="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Date</th>
          <th class="text-right px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50
          dark:hover:bg-slate-700/30 transition-colors duration-150">
          <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">#ORD-001</td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">Alice Johnson</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              Completed
            </span>
          </td>
          <td class="px-6 py-4 text-slate-500 dark:text-slate-400">2026-07-14</td>
          <td class="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">$342.00</td>
        </tr>
        <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50
          dark:hover:bg-slate-700/30 transition-colors duration-150">
          <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">#ORD-002</td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">Bob Martinez</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              Processing
            </span>
          </td>
          <td class="px-6 py-4 text-slate-500 dark:text-slate-400">2026-07-14</td>
          <td class="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">$1,280.50</td>
        </tr>
        <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50
          dark:hover:bg-slate-700/30 transition-colors duration-150">
          <td class="px-6 py-4 font-medium text-slate-900 dark:text-white">#ORD-003</td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">Carol Chen</td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Shipped
            </span>
          </td>
          <td class="px-6 py-4 text-slate-500 dark:text-slate-400">2026-07-13</td>
          <td class="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">$785.00</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
    <p class="text-sm text-slate-500 dark:text-slate-400">Showing 1-3 of 147</p>
    <div class="flex items-center gap-2">
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600
        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
        transition-colors duration-150 disabled:opacity-50" disabled>
        Previous
      </button>
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white">1</button>
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600
        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
        transition-colors duration-150">2</button>
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600
        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
        transition-colors duration-150">3</button>
      <button class="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600
        text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700
        transition-colors duration-150">Next</button>
    </div>
  </div>
</div>
```

**Key data table patterns:**
- The table is wrapped in `overflow-x-auto` to enable horizontal scrolling on narrow screens while keeping the table intact.
- Status badges use semantic colors — `emerald` for Completed, `amber` for Processing, `blue` for Shipped — all with dark mode variants.
- Table rows have `hover:bg-slate-50` for row-level interactivity and `transition-colors` for smooth hover effects.
- Sortable column headers include an SVG arrow icon and a `cursor-pointer hover:text-indigo-600` treatment.
- The pagination bar separates gracefully from the table body with a `border-t` separator and responsive spacing.

### Dark Mode Implementation

Dark mode uses Tailwind's `class` strategy. Toggling the `dark` class on the root `<html>` element switches all components to their dark variants:

```html
<script>
  // On page load, check localStorage for dark mode preference
  if (localStorage.getItem("darkMode") === "true") {
    document.documentElement.classList.add("dark");
  }

  // Toggle handler
  document.getElementById("darkToggle").addEventListener("click", function () {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("darkMode", isDark);
  });
</script>
```

**Dark mode patterns used throughout the dashboard:**
- `dark:bg-slate-800` for card backgrounds, `dark:bg-slate-900` for the main page background.
- `dark:border-slate-700` for borders that darken in dark mode.
- `dark:text-white` and `dark:text-slate-300` for text on dark backgrounds.
- `dark:bg-slate-700/30` for hover states on table rows and interactive elements.
- Colored elements (status badges, icon backgrounds) use semi-transparent dark variants: `dark:bg-emerald-900/30 dark:text-emerald-400`.

### Mobile Responsiveness

The dashboard adapts across three breakpoints:

- **Mobile (`< sm`)**: Single-column layout. Sidebar is hidden behind a hamburger toggle. Stats cards stack vertically. Table scrolls horizontally. Header shows only essential icons.
- **Tablet (`sm` to `lg`)**: Stats cards display in a 2-column grid. Search is visible. Some sidebar labels may be truncated.
- **Desktop (`lg+`)**: Full layout with fixed sidebar, 4-column stats grid, all UI elements visible.

The sidebar toggle JavaScript:

```html
<script>
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuBtn = document.getElementById("menuBtn");

  function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  menuBtn.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
</script>
```

## Code Examples

### Complete Page Structure

For reference, here is the full HTML structure of the dashboard page:

```html
<!DOCTYPE html>
<html lang="en" class="">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin Dashboard</title>
  <link href="dist/output.css" rel="stylesheet" />
  <script defer src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-slate-50 dark:bg-slate-950 antialiased">

  <!-- Sidebar Overlay -->
  <div id="sidebarOverlay" class="fixed inset-0 bg-black/50 z-30 hidden lg:hidden"></div>

  <!-- Sidebar -->
  <aside id="sidebar" class="fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar text-slate-300
    -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">
    <!-- Sidebar content from above -->
  </aside>

  <!-- Main Content -->
  <div class="lg:pl-64">
    <!-- Header -->
    <header>...</header>

    <!-- Page Content -->
    <main class="p-4 sm:p-6 lg:p-8">
      <!-- Page Title -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Welcome back, Jane! Here is what is happening today.
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <!-- ... -->
      </div>

      <!-- Chart -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200
        dark:border-slate-700 p-6 mt-6">
        <!-- ... -->
      </div>

      <!-- Data Table -->
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200
        dark:border-slate-700 mt-6">
        <!-- ... -->
      </div>
    </main>
  </div>

  <!-- JavaScript -->
  <script>
    // Dark mode toggle
    if (localStorage.getItem("darkMode") === "true") {
      document.documentElement.classList.add("dark");
    }
    document.getElementById("darkToggle").addEventListener("click", function () {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("darkMode", isDark);
    });

    // Sidebar toggle
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menuBtn = document.getElementById("menuBtn");

    menuBtn.addEventListener("click", () => {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    });
  </script>
</body>
</html>
```

### Dark Mode Chart Re-render

When the user toggles dark mode, charts need updated grid and text colors. Here is a pattern that handles this:

```javascript
const chartColors = {
  grid: { light: "rgba(0,0,0,0.05)", dark: "rgba(255,255,255,0.05)" },
  text: { light: "#64748b", dark: "#94a3b8" },
};

function createChart(canvasId) {
  const isDark = document.documentElement.classList.contains("dark");
  const ctx = document.getElementById(canvasId).getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: { /* ... */ },
    options: {
      scales: {
        y: {
          grid: { color: isDark ? chartColors.grid.dark : chartColors.grid.light },
          ticks: { color: isDark ? chartColors.text.dark : chartColors.text.light },
        },
        x: {
          grid: { display: false },
          ticks: { color: isDark ? chartColors.text.dark : chartColors.text.light },
        },
      },
    },
  });
}

let revenueChart = createChart("revenueChart");

document.getElementById("darkToggle").addEventListener("click", function () {
  if (revenueChart) revenueChart.destroy();
  setTimeout(() => { revenueChart = createChart("revenueChart"); }, 50);
});
```

### Sidebar Nav Item Generator (JavaScript)

For dashboards with dynamic navigation menus, generate sidebar items from a data array:

```javascript
const navItems = [
  { label: "Overview", icon: "home", href: "#", active: true },
  { label: "Analytics", icon: "chart", href: "#", active: false },
  { label: "Orders", icon: "cart", href: "#", active: false },
  { label: "Customers", icon: "users", href: "#", active: false },
  { label: "Settings", icon: "cog", href: "#", active: false },
];

function renderNav(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = items.map(item => `
    <a href="${item.href}"
      class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
      ${item.active
        ? "bg-sidebar-active text-white"
        : "text-slate-300 hover:bg-sidebar-hover hover:text-white"}
      transition-colors duration-150">
      ${getIcon(item.icon)}
      <span>${item.label}</span>
    </a>
  `).join("");
}
```

## Key Insights

- **Utility-first composition scales**: The dashboard is built entirely from single-purpose utility classes — no custom CSS was written. This makes the design consistent, maintainable, and easy to iterate on. Every component uses the same spacing scale (`p-4`, `p-6`, `gap-4`), the same border radius (`rounded-xl`, `rounded-lg`), and the same color palette.
- **Responsive prefixes are layout superpowers**: The `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` pattern lets you define the entire responsive behavior of a container in a single class string. No media queries, no breakpoint files, no CSS overrides.
- **Dark mode is a design system decision, not an afterthought**: By adding `dark:` variants to every class that defines a visual property (background, text, border, shadow, hover), dark mode emerges naturally. The `class` strategy gives users control over the theme preference, and `localStorage` persists it across sessions.
- **States are easier with Tailwind's built-in variants**: Hover (`hover:`), focus (`focus:`), disabled (`disabled:`), and group-hover (`group-hover:`) variants eliminate the need for separate CSS state definitions. Combined with `transition-colors duration-150`, even complex interactive components stay simple.
- **Integrate Chart.js with wrapper containers, not inline**: Place canvas elements inside a `relative` container with a fixed height to control chart sizing. This avoids the common pitfall of charts expanding beyond their intended boundaries.
- **Design tokens in config keep the system consistent**: Defining custom colors (like the `sidebar` color palette) in `tailwind.config.js` means you reference `bg-sidebar` everywhere instead of repeating hex values. This makes global theme changes a single-line edit.

## Next Steps

- Learn how to add authentication and route protection to your dashboard by reading the **Vue.js Form Handling and Validation Guide** or the **Next.js Authentication and Authorization Guide**.
- Explore **Tailwind CSS Best Practices Guide** for deeper patterns on design system architecture and component extraction strategies.
- Add real backend data by integrating your dashboard with a framework like **Express.js** or **NestJS** — see the various API tutorials for guidance.
- Consider adding **Svelte** or **Vue.js** reactivity to make the sidebar submenu and chart interactions fully dynamic without Alpine.js.

## Conclusion

In this tutorial, you built a complete admin dashboard interface using only Tailwind CSS utility classes — no custom CSS, no CSS-in-JS, no pre-built component libraries. You learned how to compose a responsive sidebar navigation system with collapsible submenus, stats cards that adapt across breakpoints, a data table with sortable columns and status badges, Chart.js integration for data visualization, and a dark mode system that persists user preference across sessions.

The patterns you have built here — responsive grid layouts, state-driven variant toggling, dark mode theming, and component composition from utilities — are the foundation of professional Tailwind CSS development. Every project you build from this point forward will benefit from the same mental model: design systems expressed as constraints in `tailwind.config.js`, layouts composed from responsive utilities, and visual variations driven by built-in state variants.

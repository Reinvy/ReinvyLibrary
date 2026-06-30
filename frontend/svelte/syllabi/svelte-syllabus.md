---
title: "Svelte and SvelteKit Development Syllabus"
description: "A comprehensive 12-week course covering Svelte fundamentals, SvelteKit routing, state management, forms, testing, authentication, performance optimization, and deployment — from basics to production-ready full-stack applications."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Svelte and SvelteKit Development Syllabus

## Overview

This 12-week curriculum provides a comprehensive learning path for modern web development with Svelte and SvelteKit. Starting with Svelte's reactive component model and progressive enhancement philosophy, the course builds toward production-ready full-stack applications using SvelteKit's file-based routing, server-side rendering, and adapter-based deployment system. Each module combines conceptual foundations with hands-on exercises, culminating in a capstone full-stack application project.

## Curriculum

### Module 1: Svelte Fundamentals and Project Setup
- **Svelte's Philosophy**: Compile-time reactivity, minimal boilerplate, progressive enhancement
- **Project Scaffolding**: Creating a Svelte project with `npm create svelte@latest`, Vite integration, directory structure overview
- **Component Architecture**: `.svelte` file structure (script, markup, style), single-file components, component composition
- **Template Syntax**: Dynamic expressions `{}`, HTML rendering with `{@html}`, comments
- **Reactive Declarations**: The `$:` label syntax, reactive statements vs assignments, dependency tracking
- **Props and Component Communication**: `export let` for props, `createEventDispatcher` for events, event forwarding
- **Scoped CSS**: Component-level style isolation, `:global()` modifier, CSS custom properties

### Module 2: Reactivity and State
- **Reactive Statements Deep Dive**: Chaining reactive declarations, reactive blocks, side effects
- **Stores**: `writable`, `readable`, `derived` stores, auto-subscriptions with `$` prefix, custom stores
- **Context API**: `setContext` and `getContext`, component tree communication without prop drilling
- **Component Lifecycle**: `onMount`, `onDestroy`, `beforeUpdate`, `afterUpdate`, `tick`
- **Binding Directives**: `bind:value`, `bind:this`, `bind:group`, `bind:checked`, component bindings
- **Reactive Arrays and Objects**: Immutable update patterns, spread operator, array methods

### Module 3: Control Flow and Template Logic
- **Conditional Rendering**: `{#if}` blocks, `{:else if}`, `{:else}`, `{#if}` with promises
- **Loop Rendering**: `{#each}` blocks, keyed each blocks `{#each items as item (key)}`, destructuring
- **Await Blocks**: `{#await}`, `{:then}`, `{:catch}` for promise handling
- **Event Handling**: `on:click`, `on:submit`, event modifiers (`preventDefault`, `stopPropagation`, `once`, `self`), component events
- **Transition Directives**: `transition:`, `in:`, `out:`, `animate:`, built-in transitions (fade, fly, slide, scale, blur, crossfade)
- **Action Directives**: Custom action functions, `use:action`, parameterized actions

### Module 4: SvelteKit Routing and Layouts
- **SvelteKit Project Structure**: `src/routes`, `src/lib`, static assets, environment variables
- **File-Based Routing**: `+page.svelte`, `+page.server.js`, dynamic parameters `[slug]`, rest parameters `[...path]`
- **Layout System**: `+layout.svelte`, nested layouts, `+layout.server.js`, layout groups `(group)`
- **Error and Loading Pages**: `+error.svelte`, `+layout.svelte` error boundaries, `+loading.svelte`
- **Endpoint Handlers**: `+server.js` for API routes, GET/POST/PUT/DELETE handlers, request and response helpers
- **Route Resolution**: `@/` alias imports, route matching, advanced routing patterns

### Module 5: Data Loading and Server Functions
- **Page Server Data**: `load` function in `+page.server.js`, `+layout.server.js` shared data
- **Universal Load Functions**: `+page.js` and `+layout.js` for client + server data, when to use each
- **Form Actions**: `+page.server.js` actions object, `use:enhance`, progressive enhancement, action results
- **Request Events**: `cookies`, `locals`, `url`, `params`, `request`, `fetch`, `platform`, `setHeaders`
- **Streaming Data**: Streaming promises in load functions, progressive rendering with `{#await}`
- **Caching Strategies**: `setHeaders`, `Cache-Control`, CDN caching, stale-while-revalidate

### Module 6: Forms and Progressive Enhancement
- **SvelteKit Form Actions Deep Dive**: Named actions, action result handling, redirect and invalidate
- **`use:enhance` Directive**: Automatic progressive enhancement, form submission lifecycle, custom callbacks
- **Client-Side Validation**: Zod schema validation, in-form error display, real-time validation
- **Server-Side Validation**: `fail()` helper, validation errors in form data, field-level errors
- **File Uploads**: `multipart/form-data`, file handling in actions, streaming uploads
- **Optimistic UI**: Updating UI before server confirmation, rollback on error, use:enhance callbacks

### Module 7: Testing
- **Unit Testing Setup**: Vitest configuration with Svelte, `@sveltejs/vite-plugin-svelte` for testing
- **Component Testing**: `@testing-library/svelte`, rendering components, querying elements, user events
- **Store Testing**: Testing reactive stores, derived stores, custom store logic
- **SvelteKit Route Testing**: Testing load functions with `@sveltejs/kit` test utilities, mocking `cookies` and `locals`
- **Form Action Testing**: Unit testing form actions, validation logic, redirect and invalidate behavior
- **E2E Testing with Playwright**: Setting up Playwright, page object pattern, testing navigation, forms, and auth flows
- **Test Coverage**: Vitest `--coverage`, CI integration, coverage thresholds

### Module 8: Authentication and Authorization
- **Session Management**: Cookie-based sessions with `cookies` API, signed cookies, session stores
- **OAuth Integration**: OAuth2 flow with SvelteKit, PKCE, social login (GitHub, Google)
- **JWT Authentication**: Token-based auth, access/refresh token patterns, httpOnly cookies
- **Protected Routes**: Load function guards, `+layout.server.js` auth checks, redirect on unauthenticated access
- **Role-Based Access Control**: Permission models, middleware pattern with hooks.server.js
- **CSRF Protection**: SvelteKit's built-in CSRF protection, custom token validation

### Module 9: Advanced SvelteKit Patterns
- **Hooks System**: `hooks.server.js` and `hooks.client.js`, `handle` and `handleError` functions
- **Server-Only Modules**: `$lib/server` directory, preventing client-side imports of server code
- **Module Loading**: `$app` modules, environment modules (`$env/static/private`, `$env/dynamic/private`, `$env/static/public`, `$env/dynamic/public`)
- **Service Workers**: `src/service-worker.js`, caching strategies, offline support, push notifications
- **WebSocket Integration**: Server-side WebSocket handling, real-time updates with stores
- **Internationalization**: `svelte-i18n` or `typesafe-i18n`, localized routes, dynamic locale switching

### Module 10: Performance Optimization
- **Code Splitting**: Dynamic imports, lazy-loaded components, `{#await}` for async components
- **Image Optimization**: `@sveltejs/enhanced-img`, `svelte-image`, responsive images, lazy loading
- **Bundle Analysis**: Vite bundle analysis, tree shaking, manual chunks, import cost awareness
- **Server-Side Rendering Strategies**: SSR mode, `ssr=false` for static pages, hybrid rendering
- **Static Site Generation**: `adapter-static`, prerendering, `prerender` option in page config
- **Edge Rendering**: `adapter-cloudflare` and `adapter-vercel` edge functions, cache strategies
- **Performance Budgets**: Lighthouse CI, Core Web Vitals tracking, bundle size monitoring

### Module 11: Accessibility and Internationalization
- **Semantic HTML in Svelte**: Accessible component patterns, ARIA attributes, role annotations
- **Keyboard Navigation**: Focus management with `bind:this`, focus trapping, skip links
- **Screen Reader Support**: Live regions, `aria-live` announcements, accessible forms
- **Color and Contrast**: Theme-aware design, WCAG compliance, dark mode considerations
- **Internationalization (i18n)**: Locale detection, translation files, date/number formatting, pluralization
- **Accessibility Testing**: axe-core integration, `@accesslint/audit`, Playwright aXe checks
- **RTL Support**: Right-to-left text handling, bidirectional layout support

### Module 12: Deployment and Capstone Project
- **Adapter System**: Node adapter (`adapter-node`), static adapter (`adapter-static`), platform adapters (Vercel, Netlify, Cloudflare, AWS Lambda)
- **Environment Configuration**: Public vs private environment variables, `.env` files, deployment-specific configs
- **Continuous Integration**: GitHub Actions for SvelteKit, lint, test, build pipeline
- **Docker Deployment**: Dockerfile for SvelteKit with Node adapter, multi-stage builds, health checks
- **Monitoring and Analytics**: Error tracking with Sentry, analytics integration, logging
- **Capstone Project**: Full-stack application combining all learned concepts — SvelteKit routing, authentication, database integration, form handling, testing, and deployment

## Final Project

Students will build a **full-stack web application** that demonstrates mastery of Svelte and SvelteKit. The capstone project must include:

- **User Authentication**: Registration, login, and session management with cookie-based or OAuth authentication
- **Data Layer**: Server-side data loading with load functions, form actions for mutations, database integration via a server adapter
- **Routing**: Multiple route segments, dynamic parameters, nested layouts, error boundaries
- **State Management**: Stores or Context API for client-side state, server state synchronization
- **Progressive Enhancement**: Form actions with `use:enhance`, graceful degradation, optimistic UI
- **Testing**: Unit tests for components and stores, Playwright E2E tests for critical user journeys
- **Accessibility**: WCAG-compliant markup, keyboard navigation, screen reader support
- **Deployment**: Containerized deployment with Docker or platform adapter (Vercel, Netlify, Cloudflare)

Example project ideas: a real-time collaborative task board, a social recipe sharing platform, a project management dashboard with team workspaces.

## Assessment Criteria

- **Module Assignments (40%)**: Weekly hands-on exercises following each module, submitted as pull requests
- **Midterm Project (20%)**: A multi-page SvelteKit application demonstrating routing, data loading, forms, and authentication, evaluated on correctness, code quality, and test coverage
- **Final Capstone Project (40%)**: Full-stack application evaluated on:
  - Functional completeness and user experience
  - Code organization and Svelte best practices
  - Test coverage (>70% for unit tests, critical E2E flows)
  - Accessibility compliance (WCAG 2.1 AA)
  - Performance metrics (Lighthouse scores >80)
  - Deployment and documentation quality

## References

- [Svelte Official Documentation](https://svelte.dev/docs)
- [SvelteKit Official Documentation](https://kit.svelte.dev/docs)
- [Svelte Tutorial (Interactive)](https://learn.svelte.dev/)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MDN Web Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Svelte Testing Library](https://testing-library.com/docs/svelte-testing-library/intro)
- [Svelte Society Recipes](https://sveltesociety.dev/recipes)

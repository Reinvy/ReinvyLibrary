---
title: "Svelte Best Practices Guide"
description: "A comprehensive guide covering project architecture, state management, testing strategies, and production deployment patterns for Svelte and SvelteKit applications."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "guide"
locale: "en"
---

# Svelte Best Practices Guide

## Introduction

Svelte is a compiler-based frontend framework that shifts much of the work from the browser to the build step, producing highly optimized vanilla JavaScript. Its companion framework, SvelteKit, provides a full-featured application framework with routing, server-side rendering, and adapter-based deployment. This guide consolidates best practices for building maintainable, performant, and production-ready Svelte and SvelteKit applications. You will learn project structure conventions, state management patterns, component design principles, testing strategies, accessibility considerations, and deployment workflows.

## Best Practices

- **Feature-based project structure**: Organize SvelteKit applications by feature domains rather than file types. Group related components, stores, and routes under a common feature directory to improve discoverability and reduce cross-module coupling.

- **Use reactive declarations deliberately**: The `$:` reactive statement is powerful, but overusing it can lead to cascading updates that are hard to debug. Prefer explicit function calls or event-driven state updates when the reactive chain exceeds three steps.

- **Leverage SvelteKit's file-based routing**: Adhere to SvelteKit's routing conventions (`+page.svelte`, `+layout.svelte`, `+server.ts`, `+page.server.ts`) instead of implementing custom routing. This ensures consistent behavior across adapters and simplifies deployment.

- **Keep stores focused and composable**: Write small, single-purpose stores that can be composed together. Use the `readable` and `derived` store types for computed values, and prefer the context API (`setContext`/`getContext`) over prop drilling in deeply nested component trees.

- **Embrace progressive enhancement**: Build core functionality that works without JavaScript, then layer on interactivity with Svelte's client-side features. SvelteKit's `use:enhance` and form actions make this pattern straightforward.

- **Write type-safe components**: Use TypeScript with Svelte's `$props()` rune or `export let` syntax to define typed component interfaces. Enable `strict: true` in `tsconfig.json` to catch type errors at compile time.

- **Optimize bundle size with code splitting**: SvelteKit automatically code-splits at route boundaries. Use dynamic imports with `lazy` for heavy third-party components and defer non-critical JavaScript with `onMount`.

- **Test at every level**: Combine unit tests (Vitest) for stores and utilities, component tests (Vitest + svelte-testing-library) for UI logic, and end-to-end tests (Playwright) for critical user flows. Aim for the testing trophy, not the pyramid — prioritize integration and E2E tests over isolated unit tests.

- **Prioritize accessibility from the start**: Use semantic HTML elements, manage focus with `use:enhance` and `trapFocus`, and test with axe-core or Lighthouse. Svelte's scoped CSS makes it easy to maintain accessible styles without cascading conflicts.

- **Adopt environment-aware configuration**: Use SvelteKit's `$env` modules (`$env/static/public`, `$env/dynamic/private`) for type-safe environment variable access. Never hardcode API endpoints or secrets in component files.

## Implementation Steps

### Step 1: Scaffold a Type-Safe SvelteKit Project

Create a new project with full TypeScript support and the preferred package manager:

```bash
npm create svelte@latest my-app
# Select: Skeleton project, TypeScript, ESLint, Prettier, Playwright, Vitest
cd my-app
npm install
```

Configure strict TypeScript in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

Verify the setup runs without errors:

```bash
npm run dev
```

### Step 2: Design a Feature-Based Directory Structure

Adopt a feature-first layout inside `src/`. Each feature domain gets its own directory with self-contained components, stores, and tests:

```text
src/
  routes/              # SvelteKit file-based routes
    (auth)/            # Auth route group (no layout nesting)
      login/
        +page.svelte
        +page.server.ts
      register/
        +page.svelte
    dashboard/
      +layout.svelte
      +page.svelte
      components/      # Dashboard-specific components
        ChartWidget.svelte
        DataTable.svelte
  lib/
    features/          # Feature domains
      auth/
        store.ts
        AuthGuard.svelte
        types.ts
      billing/
        store.ts
        InvoiceList.svelte
    components/        # Shared UI primitives
      Button.svelte
      Modal.svelte
      FormField.svelte
    utils/
      date.ts
      validation.ts
    api/
      client.ts
      endpoints.ts
  app.html
  app.d.ts
```

This structure keeps related code colocated, reduces import path complexity, and scales well as the application grows.

### Step 3: Implement a Composable State Management Layer

Define focused stores using Svelte's writable, readable, and derived helpers. Compose them in components with the context API to avoid prop drilling:

```typescript
// src/lib/features/auth/store.ts
import { writable, derived } from 'svelte/store';
import type { User, Session } from './types';

export const currentUser = writable<User | null>(null);
export const session = writable<Session | null>(null);

export const isAuthenticated = derived(
  currentUser,
  ($user) => $user !== null
);

export const displayName = derived(
  currentUser,
  ($user) => $user?.name ?? 'Guest'
);

// Provide stores via context in root layout
// src/routes/+layout.svelte
<script lang="ts">
  import { setContext } from 'svelte';
  import { currentUser, session } from '$lib/features/auth/store';

  setContext('auth', { currentUser, session });
</script>
```

Consume stores in child components with `getContext`:

```svelte
<!-- src/lib/features/auth/AuthGuard.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import type { Readable } from 'svelte/store';
  import type { User } from './types';

  const { currentUser } = getContext<{
    currentUser: Readable<User | null>;
  }>('auth');
</script>

{#if $currentUser}
  <slot />
{:else}
  <p>Please log in to access this content.</p>
{/if}
```

### Step 4: Build Accessible, Progressive-Enhanced Forms

Use SvelteKit form actions with progressive enhancement for forms that work without JavaScript and progressively enhance when JS is available:

```typescript
// src/routes/login/+page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const email = data.get('email')?.toString() ?? '';
    const password = data.get('password')?.toString() ?? '';

    if (!email || !password) {
      return fail(400, {
        error: 'Email and password are required.',
        fields: { email }
      });
    }

    try {
      const user = await locals.auth.login(email, password);
      return { success: true, user };
    } catch (err) {
      return fail(401, {
        error: 'Invalid credentials.',
        fields: { email }
      });
    }
  }
} satisfies Actions;
```

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let { form, data } = $props();
</script>

<form method="POST" use:enhance>
  <label for="email">Email</label>
  <input
    id="email"
    name="email"
    type="email"
    required
    aria-describedby={form?.error ? 'form-error' : undefined}
    value={form?.fields?.email ?? ''}
  />

  <label for="password">Password</label>
  <input
    id="password"
    name="password"
    type="password"
    required
    autocomplete="current-password"
  />

  {#if form?.error}
    <p id="form-error" role="alert" class="error">{form.error}</p>
  {/if}

  <button type="submit">Log In</button>
</form>
```

The `use:enhance` action progressively enhances the form — it works without JavaScript (full page reload) and provides smooth client-side submission when JS is available.

### Step 5: Write Tests at Every Layer

Set up a testing strategy that covers unit, component, and E2E tests:

**Unit test** for a store:

```typescript
// src/lib/features/auth/store.test.ts
import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { currentUser, isAuthenticated } from './store';

describe('auth store', () => {
  it('starts with no user', () => {
    expect(get(currentUser)).toBeNull();
    expect(get(isAuthenticated)).toBe(false);
  });

  it('tracks authentication state', () => {
    currentUser.set({ id: '1', name: 'Alice', email: 'alice@example.com' });
    expect(get(isAuthenticated)).toBe(true);
    expect(get(currentUser)?.name).toBe('Alice');
  });
});
```

**Component test** with `svelte-testing-library`:

```typescript
// src/lib/components/Button.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
  it('renders with label', () => {
    render(Button, { props: { label: 'Submit' } });
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('applies variant class', () => {
    const { container } = render(Button, {
      props: { label: 'Delete', variant: 'danger' }
    });
    expect(container.querySelector('button')?.className).toContain('danger');
  });
});
```

**E2E test** with Playwright:

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in with valid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'correct-password');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Dashboard')).toBeVisible();
});
```

Run all tests together:

```bash
npm run check    # SvelteKit type-check
npm run test:unit
npm run test:e2e
```

### Step 6: Configure Production Deployment with an Adapter

SvelteKit uses adapters to deploy to different platforms. Choose the one that matches your hosting environment:

```bash
# Node.js hosting (self-managed or Railway, Render, etc.)
npm install -D @sveltejs/adapter-node

# Static hosting (Netlify, Vercel, Cloudflare Pages)
npm install -D @sveltejs/adapter-static

# Serverless (Vercel, Netlify Functions)
npm install -D @sveltejs/adapter-vercel
# or
npm install -D @sveltejs/adapter-netlify
```

Configure in `svelte.config.js`:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: {
        files: ['html', 'js', 'css', 'svg'],
        brotli: true
      }
    })
  }
};

export default config;
```

Build and preview the production build:

```bash
npm run build
npm run preview
```

Set the `PORT` and `ORIGIN` environment variables on the production server:

```bash
PORT=3000 ORIGIN=https://myapp.example.com node build/index.js
```

### Step 7: Implement Accessibility Checks in CI

Add automated accessibility testing to your CI pipeline using Playwright's axe-core integration:

```typescript
// tests/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage should have no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

```yaml
# .github/workflows/ci.yml (example snippet)
- name: Run Playwright tests
  run: npx playwright test
- name: Run accessibility audit
  run: npx playwright test tests/a11y.spec.ts
```

### Step 8: Enforce Performance Budgets

Monitor and enforce bundle size budgets in CI. Add a `budget` check to your build configuration:

```javascript
// vite.config.ts (inside the sveltekit config or vite config)
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte', 'sveltekit']
        }
      }
    },
    chunkSizeWarningLimit: 100 // KB
  }
});
```

Use the `svelte:head` component to lazy-load non-critical resources:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let heavyChartComponent: any;

  onMount(async () => {
    heavyChartComponent = (await import('./HeavyChart.svelte')).default;
  });
</script>

<svelte:head>
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" crossorigin />
</svelte:head>
```

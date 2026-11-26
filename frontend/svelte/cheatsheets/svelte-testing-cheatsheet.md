---
title: "Svelte Testing Cheatsheet"
description: "A quick reference for testing Svelte and SvelteKit applications — Vitest configuration, component rendering with Testing Library, rune and store tests, load function and form action tests, module mocking, and Playwright end-to-end flows."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Svelte Testing Cheatsheet

## Quick Reference Table

| Goal | Code / Command | Description |
|------|----------------|-------------|
| Scaffold with tests enabled | `npx sv create my-app` | Select Vitest and Playwright in the CLI prompts |
| Install the unit test stack | `npm i -D vitest @testing-library/svelte @testing-library/jest-dom jsdom` | Vitest plus DOM queries and matchers |
| Run the suite once | `npx vitest run` | Single pass, the mode CI should use |
| Watch mode | `npx vitest` | Re-runs affected files on save |
| Run one file | `npx vitest run src/lib/Counter.test.ts` | Fast feedback while iterating |
| Run tests by name | `npx vitest run -t "increments the counter"` | Matches `it`/`test` descriptions |
| Coverage report | `npx vitest run --coverage` | Requires `@vitest/coverage-v8` |
| Render a component | `render(Counter, { props: { start: 3 } })` | Mounts into a detached container |
| Query accessibly | `screen.getByRole('button', { name: /increment/i })` | Preferred over `getByTestId` |
| Type like a user | `await userEvent.click(button)` | Triggers real event sequence |
| Flush reactive updates | `flushSync()` | Forces pending effects to run |
| Assert DOM text | `expect(el).toHaveTextContent('Count: 3')` | Matcher from `jest-dom` |
| Clean up between tests | `afterEach(() => cleanup())` | Unmount components and reset the DOM |
| Browser suite | `npx playwright test` | Runs files under `tests/` |

## Common Commands

### Scaffolding a Test-Ready Project

```bash
# Create a SvelteKit project and pick Vitest plus Playwright in the prompts
npx sv create my-app

# Add the unit testing stack to an existing project instead
npm install -D vitest @testing-library/svelte @testing-library/jest-dom jsdom @vitest/coverage-v8

# Add Playwright for browser-level tests
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

### Wiring the Test Scripts

```bash
# Register the scripts so CI and contributors run the same commands
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.test:coverage="vitest run --coverage"
npm pkg set scripts.test:e2e="playwright test"

# Verify the wiring
npm test -- --reporter=dot
```

### Running and Filtering Tests

```bash
# Run every unit test once
npx vitest run

# Re-run on changes during development
npx vitest --watch

# Target a single file
npx vitest run src/lib/components/Counter.test.ts

# Target tests whose name matches a pattern
npx vitest run -t "increments the counter"

# List the slowest tests to find drag on the suite
npx vitest run --reporter=verbose
```

### Coverage, Types, and CI

```bash
# Collect coverage with the v8 provider
npx vitest run --coverage

# Type-check components, tests, and generated route types together
npx svelte-check --tsconfig ./tsconfig.json

# Run browser tests headlessly against a production build
npx playwright test --reporter=github
```

## Code Snippets

### Vitest Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
});
```

### Global Test Setup

```typescript
// vitest-setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
```

### Rendering a Component with Props

```svelte
<!-- src/lib/Counter.svelte -->
<script lang="ts">
  let { start = 0 }: { start?: number } = $props();
  let count = $state(start);
</script>

<button onclick={() => count++}>Count: {count}</button>
```

```typescript
// src/lib/Counter.test.ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Counter from './Counter.svelte';

describe('Counter', () => {
  it('renders the initial value from props', () => {
    render(Counter, { props: { start: 3 } });
    expect(screen.getByRole('button')).toHaveTextContent('Count: 3');
  });

  it('increments on click', async () => {
    const user = userEvent.setup();
    render(Counter);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('Count: 1');
  });
});
```

### Simulating User Interaction

```svelte
<!-- src/lib/SearchBox.svelte -->
<script lang="ts">
  let { onsearch }: { onsearch?: (query: string) => void } = $props();
  let query = $state('');
</script>

<form
  onsubmit={(event) => {
    event.preventDefault();
    onsearch?.(query.trim());
  }}
>
  <input bind:value={query} aria-label="Search" />
  <button type="submit">Search</button>
</form>
```

```typescript
// src/lib/SearchBox.test.ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import SearchBox from './SearchBox.svelte';

it('passes the trimmed query to the callback prop', async () => {
  const user = userEvent.setup();
  const calls: string[] = [];

  render(SearchBox, { props: { onsearch: (query: string) => calls.push(query) } });

  await user.type(screen.getByLabelText('Search'), '  svelte  ');
  await user.click(screen.getByRole('button', { name: 'Search' }));

  expect(calls).toEqual(['svelte']);
});
```

### Testing Runes and Reactive State

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { expect, it } from 'vitest';
import FilteredList from './FilteredList.svelte';
import { createCounter } from './counter.svelte';

it('recomputes the derived list after state changes', async () => {
  const user = userEvent.setup();
  render(FilteredList, { props: { items: ['alpha', 'beta', 'gamma'] } });

  await user.type(screen.getByRole('searchbox'), 'alp');
  flushSync();

  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

it('tracks increments in a rune-based class', () => {
  const counter = createCounter(2);
  counter.increment();

  expect(counter.count).toBe(3);
  expect(counter.doubled).toBe(6);
});
```

```typescript
// src/lib/counter.svelte.ts — runes are allowed in .svelte.ts modules
export function createCounter(start = 0) {
  let count = $state(start);

  return {
    get count() {
      return count;
    },
    get doubled() {
      return count * 2;
    },
    increment() {
      count += 1;
    },
  };
}
```

### Testing Snippets and Slotted Content

```svelte
<!-- src/lib/CardHarness.svelte -->
<script lang="ts">
  import Card from './Card.svelte';
</script>

<Card title="Release notes">
  {#snippet children()}
    <p>Body text</p>
  {/snippet}
</Card>
```

```typescript
// src/lib/Card.test.ts
import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';
import CardHarness from './CardHarness.svelte';

it('renders snippet content supplied by a harness component', () => {
  render(CardHarness);

  expect(screen.getByRole('heading', { name: 'Release notes' })).toBeInTheDocument();
  expect(screen.getByText('Body text')).toBeInTheDocument();
});
```

### Testing Stores

```typescript
// src/lib/cart.test.ts
import { get } from 'svelte/store';
import { beforeEach, expect, it } from 'vitest';
import { addItem, cart, clearCart } from './cart';

beforeEach(() => clearCart());

it('derives the total from the items in the store', () => {
  addItem({ sku: 'tea', price: 4 });
  addItem({ sku: 'mug', price: 9 });

  expect(get(cart).total).toBe(13);
});
```

### Testing SvelteKit Load Functions

```typescript
// src/routes/posts/[slug]/page.server.test.ts
import { expect, it, vi } from 'vitest';
import { load } from './+page.server';
import type { PageServerLoadEvent } from './$types';

const createEvent = (slug: string) =>
  ({
    params: { slug },
    url: new URL(`http://localhost/posts/${slug}`),
    locals: { user: null },
    fetch: vi.fn(),
    cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  }) as unknown as PageServerLoadEvent;

it('returns the post for a known slug', async () => {
  const result = await load(createEvent('hello-world'));

  expect(result).toMatchObject({ post: { slug: 'hello-world' } });
});
```

### Testing Form Actions

```typescript
// src/routes/signup/page.server.test.ts
import { expect, it, vi } from 'vitest';
import { actions } from './+page.server';

it('rejects an empty email address', async () => {
  const form = new FormData();
  form.set('email', '');

  const result = await actions.default({
    request: new Request('http://localhost/signup', { method: 'POST', body: form }),
    url: new URL('http://localhost/signup'),
    params: {},
    locals: {},
    cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  } as never);

  expect(result).toEqual({ status: 400, data: { error: 'Email is required' } });
});
```

### Mocking Modules and Fetch

```typescript
import { beforeEach, expect, it, vi } from 'vitest';
import { load } from './+page.server';

vi.mock('$lib/server/mailer', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ id: 'msg_1' }),
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
});

it('calls the pricing service through the injected fetch', async () => {
  const result = await load({ fetch: globalThis.fetch } as never);

  expect(result).toMatchObject({ price: 42 });
});
```

### End-to-End with Playwright

```typescript
// tests/checkout.spec.ts
import { expect, test } from '@playwright/test';

test('completes the checkout flow', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('link', { name: 'Tea sampler' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.goto('/checkout');
  await expect(page).toHaveURL(/checkout/);
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();
});
```

### Accessibility Assertions

```bash
# Install the axe integration for Playwright
npm install -D @axe-core/playwright
```

```typescript
// tests/a11y.spec.ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('product page has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/products');

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
```

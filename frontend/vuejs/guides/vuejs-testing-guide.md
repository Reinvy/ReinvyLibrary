---
title: "Vue.js Testing Guide"
description: "A practical, advanced guide to testing Vue.js 3 applications: Vitest configuration, unit testing composables and utilities, component interaction tests with Vue Test Utils, Pinia store and Vue Router testing, mocking strategies with vi.mock and MSW, Playwright end-to-end tests, and CI coverage gates."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Vue.js Testing Guide

## Introduction

Tests are the safety net that lets a Vue.js team refactor aggressively, ship releases with confidence, and document expected behavior in executable form. Yet many Vue projects stop at a single smoke test or rely entirely on manual QA. This guide presents a complete, layered testing strategy for Vue.js 3 applications built with Vite, TypeScript, and Pinia: unit tests for utilities and composables, interaction-focused component tests with Vue Test Utils, store and router tests, boundary mocks with `vi.mock` and MSW, and browser-level end-to-end tests with Playwright. Each layer is explained with realistic, runnable examples and wired into a CI pipeline with coverage gates. The goal is a test suite that is fast, deterministic, and genuinely useful — one that fails for real reasons, not for brittle implementation details.

## Best Practices

### 1. Follow the Testing Pyramid, Not an Inverted One

A healthy Vue 3 codebase spends most of its budget on fast, isolated unit and component tests, and reserves a smaller number of slow browser tests for critical user journeys. A suite with dozens of Playwright scenarios and almost no unit tests is slow to run, flaky by nature, and expensive to maintain in CI. Aim for a large base of unit tests, a solid middle layer of component and store tests, and a small, curated top layer of E2E tests covering login, checkout, and data-heavy flows.

### 2. Test Behavior, Not Implementation Details

Assert on what the user observes or what the component communicates to the outside world: rendered text, emitted events, class changes, and DOM state. Avoid asserting on internal refs, private functions, or the exact sequence of method calls. A test that reads `wrapper.vm.internalState` breaks on every refactor even when the behavior is correct; a test that checks `wrapper.text()` survives restructuring. Query elements the way a user would — by role, label, or a stable `data-testid` — rather than by fragile CSS class chains.

### 3. Keep Unit Tests Free of Mounting

Anything that does not touch the DOM belongs in a plain unit test without Vue Test Utils. Pure functions, formatters, validators, date helpers, and store reducers run at full speed with zero setup, which keeps the suite fast and the failure messages trivial to read. Mounting a whole component just to test a function that takes an object and returns a string adds milliseconds of runtime and coupling for no benefit.

### 4. Test Composables Through a Host Component or Their Consumers

Composables expose refs and functions, so they can often be tested directly in a plain `describe`/`it` block by calling the factory and reading `.value`. When a composable depends on lifecycle hooks such as `onMounted` or template reactivity, mount a tiny fixture component that consumes it inside its `setup()` and assert through the rendered output. This keeps the test honest about how the composable is actually used.

### 5. Mock at the System Boundary

Mock HTTP calls, timers, and browser APIs — never mock the code under test itself. A component test that mocks its own child components wholesale can pass while the integration is broken. Prefer dependency injection: pass services through props, `provide`/`inject`, or Pinia stores, then replace the boundary with a fake. `vi.mock` is for modules that perform I/O (API clients, analytics, storage); MSW intercepts real `fetch` calls at the network layer and is the most realistic option for component and E2E tests.

### 6. Treat Component Tests as Interaction Tests

Mount a component, simulate the user action, and assert the consequence: a click emits an event, a keystroke updates a bound value, an error state renders a message. Use `await` after every interaction so Vue's microtask queue drains before you assert, and use `flushPromises()` when the component performs asynchronous work. Component tests that only render static markup add little value — the interesting assertions live in the interactions.

### 7. Keep Tests Deterministic

Real timers and real network calls make tests intermittently red. Use `vi.useFakeTimers()` for debounces and polling, always restore real timers in `afterEach`, and never let a test touch a live API. Fix the environment: `jsdom` provides `localStorage`, `navigator`, and `document`, but if a test needs `IntersectionObserver` or `ResizeObserver`, install a small mock in the setup file. A flaky test is worse than no test because it trains the team to ignore red builds.

### 8. Use Realistic Data and Edge Cases

Sample payloads should look like production data: nested objects, realistic strings, empty arrays, and error responses. Tests that only exercise the happy path hide the branches that actually break. For every API-consuming component, write at least three cases: success, empty state, and failure. For stores, cover idempotency — calling the same action twice must not double-count or duplicate state.

### 9. Reserve E2E Tests for High-Value Journeys

Playwright tests run a real browser and therefore a real server: they are slow and inherently more brittle. Keep the E2E suite small and focused on journeys that span multiple pages and systems — registration, checkout, search to detail — and leave everything else to the faster layers. Run E2E against the production build (`vite preview`) in CI rather than the dev server to catch build-time regressions as well.

### 10. Gate Merges on Coverage and Quality

Coverage thresholds turn testing from a nice-to-have into a contract: fail the build when line, branch, function, or statement coverage drops below the agreed number. Enforce a minimum, but do not chase 100% — diminishing returns set in quickly on templates and scaffold code. Pair the coverage gate with a `retries` policy for E2E and a clean-lint requirement so the gate measures real quality, not CI luck.

## Implementation Steps

### Step 1: Scaffold the Project with Testing Built In

Create a Vue 3 project with TypeScript, Router, Pinia, and Vitest preconfigured:

```bash
npm create vue@latest my-app -- --typescript --router --pinia --vitest
cd my-app
npm install
npm run test
```

The scaffold installs `vitest`, `@vue/test-utils`, `jsdom`, and `@vitest/coverage-v8`, and adds a sample component test under `src/components/__tests__/`. Verify the suite runs before adding anything else:

```bash
npm run test
```

### Step 2: Configure Vitest for Vue, jsdom, and Coverage

Adjust `vitest.config.ts` to register the Vue plugin, use the `jsdom` environment, point coverage at `src`, and enforce thresholds:

```typescript
// vitest.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.spec.ts'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/main.ts', 'src/router/index.ts', 'src/test/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
```

Add a setup file that cleans up after each test so mounted components never leak between cases:

```typescript
// src/test/setup.ts
import { afterEach } from 'vitest'
import { cleanup } from '@vue/test-utils'

afterEach(() => {
  cleanup()
})
```

Define convenient scripts in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

### Step 3: Unit Test Utilities and Composables

Start with the fastest layer. A simple counter composable:

```typescript
// src/composables/useCounter.ts
import { computed, ref } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const double = computed(() => count.value * 2)

  function increment(step = 1) {
    count.value += step
  }

  function decrement(step = 1) {
    count.value -= step
  }

  function reset() {
    count.value = initial
  }

  return { count, double, increment, decrement, reset }
}
```

Its test reads like a specification and mounts nothing:

```typescript
// src/composables/__tests__/useCounter.spec.ts
import { describe, expect, it } from 'vitest'
import { useCounter } from '../useCounter'

describe('useCounter', () => {
  it('starts at the provided initial value', () => {
    const { count, double } = useCounter(10)
    expect(count.value).toBe(10)
    expect(double.value).toBe(20)
  })

  it('increments and decrements by the given step', () => {
    const { count, increment, decrement } = useCounter(0)
    increment(3)
    expect(count.value).toBe(3)
    decrement()
    expect(count.value).toBe(2)
  })

  it('resets to the initial value', () => {
    const { count, increment, reset } = useCounter(5)
    increment(10)
    reset()
    expect(count.value).toBe(5)
  })
})
```

For timer-driven composables, fake the clock. A debounced value helper:

```typescript
// src/composables/useDebouncedValue.ts
import { ref, watch, type Ref } from 'vue'

export function useDebouncedValue<T>(source: () => T, delay = 300): Ref<T> {
  const debounced = ref(source()) as Ref<T>

  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  })

  return debounced
}
```

```typescript
// src/composables/__tests__/useDebouncedValue.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useDebouncedValue } from '../useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('only publishes the source value after the delay elapses', async () => {
    let value = 'first'
    const debounced = useDebouncedValue(() => value, 300)

    value = 'second'
    await nextTick()
    expect(debounced.value).toBe('first')

    vi.advanceTimersByTime(299)
    expect(debounced.value).toBe('first')

    vi.advanceTimersByTime(1)
    expect(debounced.value).toBe('second')
  })
})
```

### Step 4: Write Component Interaction Tests

Mount components, interact, and assert on outcomes. A button that emits an amount:

```vue
<!-- src/components/CounterButton.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{ step?: number }>(), { step: 1 })

const emit = defineEmits<{
  increment: [amount: number]
}>()

function handleClick() {
  emit('increment', props.step)
}
</script>

<template>
  <button class="counter-button" data-testid="increment" @click="handleClick">
    Increment
  </button>
</template>
```

```typescript
// src/components/__tests__/CounterButton.spec.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CounterButton from '../CounterButton.vue'

describe('CounterButton', () => {
  it('emits the configured step when clicked', async () => {
    const wrapper = mount(CounterButton, {
      props: { step: 2 },
    })

    await wrapper.get('[data-testid="increment"]').trigger('click')

    expect(wrapper.emitted('increment')).toHaveLength(1)
    expect(wrapper.emitted('increment')?.[0]).toEqual([2])
  })

  it('emits step 1 by default', async () => {
    const wrapper = mount(CounterButton)

    await wrapper.get('[data-testid="increment"]').trigger('click')

    expect(wrapper.emitted('increment')?.[0]).toEqual([1])
  })
})
```

A `v-model` component using `defineModel`:

```vue
<!-- src/components/NameInput.vue -->
<script setup lang="ts">
const model = defineModel<string>({ required: true })
</script>

<template>
  <input v-model="model" data-testid="name" />
</template>
```

```typescript
// src/components/__tests__/NameInput.spec.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NameInput from '../NameInput.vue'

describe('NameInput', () => {
  it('reflects the bound value', () => {
    const wrapper = mount(NameInput, { props: { modelValue: 'Adi' } })
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Adi')
  })

  it('emits update:modelValue when the user types', async () => {
    const wrapper = mount(NameInput, { props: { modelValue: '' } })
    await wrapper.get('input').setValue('Sari')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Sari'])
  })
})
```

Components that teleport to `body` need the teleport target stubbed so the content stays inside the wrapper:

```vue
<!-- src/components/Modal.vue -->
<script setup lang="ts">
const open = defineModel<boolean>({ default: false })
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal">
          <header><slot name="header">Modal</slot></header>
          <main><slot /></main>
          <footer><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

```typescript
// src/components/__tests__/Modal.spec.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Modal from '../Modal.vue'

const stubTeleport = { teleport: true }

describe('Modal', () => {
  it('renders nothing while closed', () => {
    const wrapper = mount(Modal, {
      props: { open: false },
      global: { stubs: stubTeleport },
    })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('renders slot content when open', () => {
    const wrapper = mount(Modal, {
      props: { open: true },
      slots: {
        default: '<p>Modal body</p>',
        header: '<h2>Confirm action</h2>',
      },
      global: { stubs: stubTeleport },
    })
    expect(wrapper.get('h2').text()).toBe('Confirm action')
    expect(wrapper.get('p').text()).toBe('Modal body')
  })
})
```

### Step 5: Test Pinia Stores in Isolation

Stores are plain logic plus refs, so `setActivePinia(createPinia())` in `beforeEach` gives every test a fresh store. A cart store:

```typescript
// src/stores/cart.ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const totalItems = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0),
  )
  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  function addItem(item: Omit<CartItem, 'quantity'>) {
    const existing = items.value.find((entry) => entry.id === item.id)
    if (existing) {
      existing.quantity += 1
    } else {
      items.value.push({ ...item, quantity: 1 })
    }
  }

  function removeItem(id: string) {
    items.value = items.value.filter((entry) => entry.id !== id)
  }

  function clear() {
    items.value = []
  }

  return { items, totalItems, totalPrice, addItem, removeItem, clear }
})
```

```typescript
// src/stores/__tests__/cart.spec.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCartStore } from '../cart'

describe('cart store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds a new item with quantity 1', () => {
    const store = useCartStore()
    store.addItem({ id: 'p1', name: 'Vue T-Shirt', price: 150000 })

    expect(store.items).toHaveLength(1)
    expect(store.totalItems).toBe(1)
    expect(store.totalPrice).toBe(150000)
  })

  it('merges duplicates and adjusts the totals', () => {
    const store = useCartStore()
    store.addItem({ id: 'p1', name: 'Vue T-Shirt', price: 150000 })
    store.addItem({ id: 'p1', name: 'Vue T-Shirt', price: 150000 })

    expect(store.items).toHaveLength(1)
    expect(store.items[0]?.quantity).toBe(2)
    expect(store.totalItems).toBe(2)
    expect(store.totalPrice).toBe(300000)
  })

  it('removes an item', () => {
    const store = useCartStore()
    store.addItem({ id: 'p1', name: 'Vue T-Shirt', price: 150000 })
    store.removeItem('p1')

    expect(store.items).toHaveLength(0)
    expect(store.totalItems).toBe(0)
  })
})
```

### Step 6: Test Router Navigation and Guards

Extract guards into plain functions so they are testable without a browser. A single-source guard utility:

```typescript
// src/router/guards.ts
import type { NavigationGuard } from 'vue-router'

export const requireAuth: NavigationGuard = (to) => {
  const token = localStorage.getItem('token')
  if (!token && to.meta.requiresAuth) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
}
```

Test it through a real router using memory history:

```typescript
// src/router/__tests__/guards.spec.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { requireAuth } from '../guards'

const routes = [
  { path: '/login', name: 'login', component: { template: '<div />' } },
  {
    path: '/dashboard',
    name: 'dashboard',
    meta: { requiresAuth: true },
    component: { template: '<div />' },
  },
]

describe('requireAuth guard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('redirects anonymous users to login with a redirect query', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
      beforeEach: [requireAuth],
    })

    await router.push('/dashboard')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('lets authenticated users through', async () => {
    localStorage.setItem('token', 'valid-token')

    const router = createRouter({
      history: createMemoryHistory(),
      routes,
      beforeEach: [requireAuth],
    })

    await router.push('/dashboard')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('dashboard')
  })
})
```

Note how `beforeEach` is passed as a router option in Vue Router 4.3+, keeping the guard registration explicit and the tests fully independent of the app's real router instance.

### Step 7: Mock API Calls with vi.mock and MSW

Components that fetch on mount need deterministic responses. First the service:

```typescript
// src/services/products.ts
export interface Product {
  id: string
  name: string
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}
```

```vue
<!-- src/components/ProductsList.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchProducts, type Product } from '@/services/products'

const products = ref<Product[]>([])
const error = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    products.value = await fetchProducts()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unknown error'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <p v-if="loading" data-testid="loading">Loading products…</p>
    <p v-else-if="error" data-testid="error">{{ error }}</p>
    <ul v-else>
      <li v-for="product in products" :key="product.id">{{ product.name }}</li>
    </ul>
  </div>
</template>
```

Mocking the module at the boundary with `vi.mock` (it is hoisted above the import):

```typescript
// src/components/__tests__/ProductsList.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ProductsList from '../ProductsList.vue'

vi.mock('@/services/products', () => ({
  fetchProducts: vi.fn(),
}))

import { fetchProducts } from '@/services/products'

describe('ProductsList', () => {
  it('renders products after a successful fetch', async () => {
    vi.mocked(fetchProducts).mockResolvedValue([
      { id: '1', name: 'Vue T-Shirt' },
      { id: '2', name: 'Pinia Mug' },
    ])

    const wrapper = mount(ProductsList)
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Vue T-Shirt')
  })

  it('renders an error message when the request fails', async () => {
    vi.mocked(fetchProducts).mockRejectedValue(new Error('Network error'))

    const wrapper = mount(ProductsList)
    await flushPromises()

    expect(wrapper.get('[data-testid="error"]').text()).toBe('Network error')
  })

  it('renders an empty list for an empty response', async () => {
    vi.mocked(fetchProducts).mockResolvedValue([])

    const wrapper = mount(ProductsList)
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(0)
  })
})
```

For tests that must exercise the real `fetch` pipeline, run MSW as a Node server in the Vitest setup:

```typescript
// src/test/msw.ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const handlers = [
  http.get('/api/products', () =>
    HttpResponse.json([
      { id: '1', name: 'Vue T-Shirt' },
      { id: '2', name: 'Pinia Mug' },
    ]),
  ),
]

export const server = setupServer(...handlers)
```

```typescript
// src/test/setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@vue/test-utils'
import { server } from './msw'

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
```

Prefer MSW when the component under test or its dependencies call `fetch` directly; prefer `vi.mock` when you want surgical control over a single service module.

### Step 8: Add Playwright End-to-End Tests

Install Playwright and its browsers, then configure it to run against the dev server:

```bash
npm init playwright@latest
npx playwright install --with-deps chromium firefox
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

A journey test that spans navigation and state:

```typescript
// e2e/checkout.spec.ts
import { expect, test } from '@playwright/test'

test('adds a product to the cart and reaches checkout', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Add to cart' }).first().click()

  const cartCount = page.locator('[data-testid="cart-count"]')
  await expect(cartCount).toHaveText('1')

  await page.getByRole('link', { name: 'Cart' }).click()
  await expect(page.getByRole('heading', { name: 'Cart' })).toBeVisible()

  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page).toHaveURL(/\/checkout/)
})
```

Assertions use Playwright's built-in auto-waiting (`toHaveText`, `toBeVisible`) instead of fixed `waitForTimeout` sleeps — the test proceeds as soon as the UI reaches the expected state, which keeps the suite fast and stable.

### Step 9: Wire Tests Into CI with Coverage Gates

A GitHub Actions workflow that runs the fast layers first and the browser suite second:

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, development]
  pull_request:

jobs:
  unit-and-component:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      # Fails the build when coverage drops below the configured thresholds
      - run: npm run test:coverage

  e2e:
    runs-on: ubuntu-latest
    needs: unit-and-component
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium firefox
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
```

Follow-up tips that keep the pipeline green:

- Upload `coverage/lcov.info` as an artifact so PRs can display the diff, or push it to a coverage service.
- Cache the Playwright browser with `actions/cache` keyed on the Playwright version to cut CI minutes.
- Run E2E in a `staging` environment job for long-running suites, keeping the main pipeline under ten minutes.
- Split the E2E project into `chromium` only on pull requests and the full browser matrix on merges to `development`.

## Next Steps

Testing is a habit as much as a technique. After the pipeline above is green, deepen the suite by writing property-based tests for reducers and formatters, adding visual regression checks for the design system components, and adopting mutation testing to find assertions that never fail. Practice testing real-world scenarios: a user who double-clicks a submit button, a slow API that times out, an offline-first app whose queue must retry. For teams, agree on a red-green-refactor rhythm and a coverage budget, and review flaky tests as first-class bugs rather than ignoring them.

## Conclusion

This guide walked through a complete Vue.js 3 testing ladder: fast unit tests for utilities and composables, interaction-focused component tests with Vue Test Utils, isolated Pinia store tests, guard-tested router navigation, boundary mocking with `vi.mock` and MSW, Playwright end-to-end journeys, and a CI pipeline with coverage gates. Each layer has a distinct job, and together they let a team refactor with confidence and ship features without regression anxiety. Apply the pyramid, mock at the boundaries, and keep every test deterministic — the suite will pay for itself in the first large refactor.

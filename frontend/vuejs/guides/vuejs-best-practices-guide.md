---
title: "Vue.js Best Practices Guide"
description: "A comprehensive guide covering folder structure, Composition API vs Options API, TypeScript integration, composables patterns, testing strategy, Pinia stores, performance optimization, accessibility, i18n, security, CI/CD, and Docker for Vue.js development."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Vue.js Best Practices Guide

## Introduction

This guide consolidates industry-proven best practices for building production-grade Vue.js 3 applications. It covers architectural decisions, project organization, coding conventions, testing strategies, performance optimization, accessibility, internationalization, security hardening, and deployment pipelines. Whether you are starting a new project or refactoring an existing one, following these guidelines will help you maintain a scalable, performant, and maintainable codebase. The recommendations are tailored to Vue.js 3 with the Composition API, TypeScript, Vite, Pinia, and Vue Router.

## Best Practices

### Folder Structure (Feature-Based)

Adopt a feature-based (domain-centric) folder structure inside `src/` rather than a flat file-type structure. This keeps related code co-located and makes it easier to navigate large projects.

```text
src/
├── assets/               # Static assets (images, fonts)
├── components/           # Shared, reusable components
│   ├── base/             # Primitive UI components (buttons, inputs)
│   └── shared/           # Domain-agnostic shared components
├── composables/          # Reusable Composition API functions
├── layouts/              # Layout components
├── modules/              # Feature modules (domain-driven)
│   ├── auth/             # Authentication feature
│   │   ├── components/   # Auth-specific components
│   │   ├── composables/  # Auth-specific logic
│   │   ├── stores/       # Auth Pinia store
│   │   └── views/        # Auth pages
│   └── products/         # Products feature
│       └── ...
├── router/               # Vue Router configuration
├── stores/               # Global Pinia stores
├── utils/                # Pure utility functions
├── types/                # TypeScript type definitions
└── views/                # Top-level route views
```

### Composition API vs Options API

**Recommendation**: Use the Composition API (with `<script setup>`) for all new components.

| Aspect | Composition API | Options API |
|--------|----------------|-------------|
| Logic reuse | Composables (functions) | Mixins (naming conflicts) |
| TypeScript | Excellent inference | Limited inference |
| Code organization | Group by feature | Group by option type |
| Tree-shaking | Better | Worse |
| Learning curve | Steeper initially | Gentle |

Use the Options API only for legacy codebases or very simple components where the overhead of the Composition API is not justified.

### TypeScript with Vue

Always enable TypeScript when scaffolding new Vue projects. It provides compile-time error catching, better IDE support, and self-documenting code.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface User {
  id: number
  name: string
  email: string
}

const users = ref<User[]>([])

const props = defineProps<{
  title: string
  count?: number
}>()

const emit = defineEmits<{
  update: [value: number]
  delete: [id: number]
}>()
</script>
```

### Reusable Composables Pattern

Extract reusable logic into composable functions. Composables are the Composition API equivalent of React hooks.

```javascript
// composables/useDebounce.js
import { ref, watch } from 'vue'

export function useDebounce(source, delay = 300) {
  const debouncedValue = ref(source.value)

  let timer
  watch(source, (val) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debouncedValue.value = val
    }, delay)
  })

  return { debouncedValue }
}

// composables/useApi.js
import { ref } from 'vue'
import axios from 'axios'

export function useApi(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      const { data: response } = await axios.get(url)
      data.value = response
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, fetch }
}
```

### Testing Strategy

Adopt a layered testing approach:

1. **Unit Tests (Vitest + Vue Test Utils)** — Test individual composables, stores, utility functions, and component behavior (props, emits, slots, reactivity). Mock external dependencies (API calls, router).
2. **Component Tests (Vitest + Vue Test Utils)** — Mount components with `mount()` and assert rendered output, interactions, and emitted events.
3. **Integration Tests (Vitest)** — Test feature workflows across multiple components and stores.
4. **End-to-End Tests (Playwright)** — Test critical user flows in a real browser: login, CRUD operations, navigation.

```javascript
// Example: store test
import { setActivePinia, createPinia } from 'pinia'
import { useCounterStore } from '@/stores/counter'

describe('Counter Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('increments count', () => {
    const store = useCounterStore()
    store.increment()
    expect(store.count).toBe(1)
  })
})
```

### Pinia Stores (Setup Stores)

Use setup stores (Composition API style) over options stores for better TypeScript support and flexibility.

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductStore = defineStore('products', () => {
  // State
  const products = ref([])
  const filter = ref('')

  // Getters
  const filteredProducts = computed(() =>
    products.value.filter(p => p.name.includes(filter.value))
  )

  // Actions
  async function fetchProducts() {
    const { data } = await axios.get('/api/products')
    products.value = data
  }

  function setFilter(value) {
    filter.value = value
  }

  return { products, filter, filteredProducts, fetchProducts, setFilter }
})
```

### Performance Optimization

- **Lazy loading**: Use `defineAsyncComponent` or dynamic imports in routes to code-split on component boundaries.
- **KeepAlive**: Wrap dynamic components or route views with `<KeepAlive>` to preserve state when switching away.
- **Suspense**: Use `<Suspense>` to handle async dependencies gracefully and show fallback content.
- **Memoization**: Use `computed` for expensive derivations and `v-memo` for large static lists.
- **Virtual scrolling**: Use `vue-virtual-scroller` for lists with thousands of items.
- **Event delegation**: Attach events to parent elements rather than individual children where possible.
- **v-once**: For static content that never changes, use `v-once` to skip re-rendering.

```vue
<!-- Lazy load a heavy component -->
<script setup>
import { defineAsyncComponent } from 'vue'
const HeavyChart = defineAsyncComponent(() => import('@/components/HeavyChart.vue'))
</script>

<!-- KeepAlive for tab views -->
<KeepAlive>
  <component :is="currentTab" />
</KeepAlive>
```

### Accessibility (A11y)

- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<header>`, `<footer>`).
- Add `aria-*` attributes for dynamic content (e.g., `aria-live="polite"` for loading states).
- Ensure all interactive elements are keyboard accessible (focus management with `tabindex` and `@keydown`).
- Use `vue-announcer` or provide screen reader announcements for route changes and async updates.
- Test with axe-core (`@axe-core/playwright`) in CI.
- Maintain a minimum color contrast ratio of 4.5:1 for text.

### Internationalization (i18n) with vue-i18n

```javascript
import { createI18n } from 'vue-i18n'

const messages = {
  en: { welcome: 'Welcome', greeting: 'Hello {name}!' },
  id: { welcome: 'Selamat Datang', greeting: 'Halo {name}!' }
}

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages
})

// In components
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()
// Template: {{ t('greeting', { name: 'Alice' }) }}
```

### Security (XSS Prevention, CSP)

- **Never use `v-html` with user-generated content**. If you must, sanitize with DOMPurify.
- **Set a Content Security Policy (CSP)** header to restrict script sources.
- **Avoid `innerHTML` and `document.write`** in favor of Vue's template system.
- **Validate all user inputs** on the client and server side.
- **Use HTTPS** for all API calls.
- **Store sensitive data (tokens)** in httpOnly cookies, not in Pinia or localStorage.
- **Sanitize URLs** when using dynamic `:href` bindings to prevent `javascript:` protocol injection.

```vue
<!-- Safe: Vue escapes interpolations -->
<p>{{ userInput }}</p>

<!-- Dangerous: Only with sanitized content -->
<div v-html="sanitizedHtml"></div>

<script>
import DOMPurify from 'dompurify'
const sanitizedHtml = DOMPurify.sanitize(userInput)
</script>
```

### CI/CD (GitHub Actions, Vercel/Netlify Deployment)

```yaml
# .github/workflows/deploy.yml
name: Deploy Vue App
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run build
      # Deploy to Netlify or Vercel
      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: './dist'
          production-branch: main
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Docker for Development

```dockerfile
# Dockerfile
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# docker-compose.yml
services:
  vue-app:
    build: .
    ports:
      - "8080:80"
    environment:
      - VITE_API_URL=https://api.example.com
```

## Implementation Steps

### Step 1: Project Initialization

```bash
npm create vue@latest my-app -- --typescript --router --pinia --vitest
cd my-app
npm install
npm install axios @vueuse/core vue-i18n
```

Enable TypeScript strict mode in `tsconfig.json` and set up ESLint with Vue 3 recommended rules.

### Step 2: Set Up Folder Structure

Create the feature-based directory structure. Define type interfaces in `src/types/`. Set up the Pinia store in `src/stores/` and route configuration in `src/router/`.

### Step 3: Implement Core Architecture

- Configure the router with lazy-loaded routes and navigation guards.
- Set up Pinia with plugin support (persist state if needed).
- Create base reusable components (BaseButton, BaseInput, BaseModal) in `src/components/base/`.
- Implement a theme/layout system using layouts and CSS custom properties.

### Step 4: Build Feature Modules

For each feature (auth, products, settings), create a module in `src/modules/` with its own components, composables, stores, and views. Use the `provide/inject` pattern for cross-cutting concerns.

### Step 5: Add i18n and A11y

Configure `vue-i18n` with lazy-loaded locale messages. Add `aria-*` attributes and keyboard navigation. Run an accessibility audit with axe.

### Step 6: Write Tests

Write unit tests for stores and composables first, then component tests for critical UI components, and finally E2E tests for key user journeys.

### Step 7: Performance Audit

Run Lighthouse audits, analyze bundle size with `vite-plugin-inspect`, implement lazy loading where needed, and add virtual scrolling for large lists.

### Step 8: Configure CI/CD

Set up GitHub Actions for linting, testing, and building. Configure deployment to Vercel or Netlify with environment variables. Add Docker support for local development consistency.

### Step 9: Security Hardening

Add CSP headers in production, sanitize any `v-html` usage with DOMPurify, validate inputs, and ensure all external URLs are validated.

### Step 10: Documentation and Monitoring

Add JSDoc comments to composables and stores. Set up error monitoring with Sentry or similar. Document the architecture decisions in the project README.

---
title: "Vue.js Performance Optimization Guide"
description: "A comprehensive guide to measuring and improving Vue.js 3 application performance: bundle size reduction, code splitting, reactivity optimizations, rendering efficiency, asset delivery, and runtime profiling."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Vue.js Performance Optimization Guide

## Introduction

Vue.js 3 ships with a highly efficient reactivity system and a virtual DOM compiler that is fast out of the box. For most applications, the default settings are enough. However, as an application grows — more routes, larger component trees, bigger datasets, richer third-party dependencies — performance bottlenecks begin to appear in predictable places: oversized bundles, unnecessary re-renders, expensive reactive objects, and heavy work running on the main thread.

This guide takes a measurement-first approach to Vue.js performance. It covers the two sides of application performance: **load performance** (bundle size, code splitting, asset delivery) and **runtime performance** (reactivity overhead, render efficiency, long tasks). Each best practice includes concrete code you can apply immediately, and the implementation steps walk through a complete optimization workflow from baseline to continuous monitoring. The recommendations target Vue.js 3 with the Composition API, Vite, Pinia, and Vue Router.

## Best Practices

### 1. Measure Before You Optimize

Optimizing without measurements is guesswork. Establish a baseline first so you can prove every change matters.

- Run Lighthouse against the production build, not the dev server — dev builds include extra overhead that does not reflect reality.
- Use the **Vue Devtools Performance tab** to record component render timings and identify which components re-render most often.
- Use the Chrome DevTools **Performance panel** to record runtime activity and look for long tasks, layout thrash, and excessive garbage collection.
- Analyze the production bundle with `vite-bundle-visualizer` or `rollup-plugin-visualizer` to see exactly which dependencies consume the most bytes.

### 2. Reduce Bundle Size at the Source

A smaller bundle downloads, parses, and executes faster. The cheapest performance wins come from removing what should never have been shipped.

- Prefer tree-shakeable ESM builds of libraries: import from `lodash-es` instead of `lodash`, and import only the functions you use.
- Replace heavy date libraries (`moment`) with lighter alternatives (`dayjs` or the native `Intl` API).
- Import icons individually (for example with `unplugin-icons` or `unplugin-vue-components`) instead of bundling entire icon sets.
- Keep an eye on transitive dependencies — a small utility can drag in a large dependency tree. `npm why <package>` reveals who pulls a package in.

```bash
# Visualize the production bundle to find size hotspots
npm install -D vite-bundle-visualizer
npx vite-bundle-visualizer

# Find which packages are pulling in a heavy dependency
npm why moment
```

### 3. Split Code at the Route Level

Route-level code splitting is the highest-impact load optimization for a multi-page application. Each route chunk loads only when the user visits that route.

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

export default router
```

The dynamic `import()` syntax tells Vite to emit a separate chunk per route. The initial bundle only contains the code needed for the first screen.

### 4. Lazy-Load Heavy Components with `defineAsyncComponent`

Not every component belongs in the initial bundle. Modals, editors, charts, and other below-the-fold components should load on demand. `defineAsyncComponent` gives you loading and error states for free.

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

// Loads only when the component is first rendered
const MarkdownEditor = defineAsyncComponent(() =>
  import('@/components/MarkdownEditor.vue')
)

// With explicit loading and error handling
const DataChart = defineAsyncComponent({
  loader: () => import('@/components/DataChart.vue'),
  loadingComponent: () => import('@/components/ChartSkeleton.vue'),
  delay: 200,          // Show the loading component only after 200ms
  timeout: 10_000      // Show the error component after 10s
})
</script>

<template>
  <MarkdownEditor v-if="editing" />
  <DataChart :data="series" />
</template>
```

Combine `defineAsyncComponent` with `v-if` (or a dynamic `component` tag) so the heavy component is only instantiated when actually needed.

### 5. Shrink the Reactivity Scope

Reactivity has a cost: every reactive object is wrapped in a proxy, and every read is tracked. For large, frequently accessed data structures, full reactivity can dominate the render budget.

- Use `shallowRef` and `shallowReactive` for large objects where only the top level needs to be reactive (for example, a configuration object or a large document that is replaced wholesale).
- Use `markRaw` for objects that should never be reactive: class instances, third-party library objects, and immutable data.
- Use `Object.freeze` (or `readonly`) for truly static data so Vue skips proxy wrapping entirely.

```typescript
import { shallowRef, markRaw, readonly } from 'vue'

// Large static lookup table — never needs deep reactivity
const countryList = readonly([
  { code: 'ID', name: 'Indonesia' },
  { code: 'US', name: 'United States' }
  // ...hundreds more entries
])

// A heavy class instance that Vue should never proxy
const engine = markRaw(new PdfEngine())

// Only the reference is reactive; the nested document is replaced wholesale
const currentDocument = shallowRef<DocumentModel | null>(null)

function openDocument(doc: DocumentModel) {
  currentDocument.value = doc
}
```

Rule of thumb: make things reactive only when a template or computed actually depends on them changing.

### 6. Memoize Expensive Derivations

`computed` values are cached based on their reactive dependencies — they only re-evaluate when a dependency changes. Use them instead of method calls in templates, which re-run on every render.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const items = ref<Array<{ price: number; quantity: number }>>([])
const taxRate = ref(0.11)

// Re-evaluates only when items or taxRate change
const cartTotal = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0) * (1 + taxRate.value)
)

// Never put side effects inside a computed
const formattedTotal = computed(() => cartTotal.value.toLocaleString('id-ID'))
</script>

<template>
  <p>Total: {{ formattedTotal }}</p>
</template>
```

Avoid calling functions in templates (`{{ formatDate(item.date) }}`) for expensive work — the function executes on every render of every row. Move the derivation into a computed, or memoize the function with a cache keyed by the argument.

### 7. Memoize Large Static Lists with `v-memo`

When a large list re-renders, `v-memo` lets Vue skip diffing list items whose dependencies have not changed. Use it sparingly — the memo itself must be compared, so it helps most with big lists where item updates are rare.

```vue
<script setup lang="ts">
import { ref } from 'vue'

const rows = ref(Array.from({ length: 10_000 }, (_, i) => ({ id: i, label: `Row ${i}` })))
const filter = ref('')
</script>

<template>
  <input v-model="filter" placeholder="Filter rows" />

  <!-- v-memo only re-renders rows whose label or filter actually changed -->
  <ul>
    <li v-for="row in rows" :key="row.id" v-memo="[row.label, filter]">
      {{ row.label }}
    </li>
  </ul>
</template>
```

Without `v-memo`, every keystroke in the filter input re-renders all 10,000 rows. With it, only the matching rows are patched.

### 8. Virtualize Long Lists

For lists with thousands of rows, rendering all of them at once — even with perfect keys and `v-memo` — still costs DOM nodes and layout time. Virtual scrolling renders only the visible window plus a small buffer.

```typescript
// @vueuse/core provides a lightweight virtual list composable
import { useVirtualList } from '@vueuse/core'

const items = Array.from({ length: 100_000 }, (_, i) => ({ id: i, text: `Item ${i}` }))

const { list, containerProps, wrapperProps } = useVirtualList(items, {
  itemHeight: 40,
  overscan: 10
})
```

```vue
<template>
  <div v-bind="containerProps" class="virtual-scroll">
    <div v-bind="wrapperProps">
      <div v-for="item in list" :key="item.index" class="row">
        {{ item.data.text }}
      </div>
    </div>
  </div>
</template>
```

Virtualization is the correct solution when rendering the full list causes jank; it reduces DOM nodes from tens of thousands to a few dozen.

### 9. Choose `v-show` vs `v-if` Deliberately

Both directives hide content, but they have opposite trade-offs.

- `v-if` removes the element from the DOM entirely and tears down its component state; toggling it repeatedly is expensive because the subtree is destroyed and recreated.
- `v-show` keeps the element in the DOM and simply toggles `display`; it is cheap to toggle but pays the initial render cost up front.

```vue
<template>
  <!-- Frequent toggles: v-show keeps the dropdown alive -->
  <div v-show="menuOpen" class="dropdown">...</div>

  <!-- Rarely shown, heavy subtree: v-if avoids paying the cost until needed -->
  <ExpensiveReport v-if="reportReady" :data="reportData" />
</template>
```

Use `v-once` for static content that never changes — Vue renders it once and skips it in future updates.

### 10. Prevent Unnecessary Re-renders

Re-renders are the most common runtime bottleneck in real applications. Most of them are avoidable.

- Always provide stable `:key` values for `v-for` — never use the array index when the list can be reordered or filtered.
- Pass primitive props or stable object references; creating a new object inline (`:data="{ id: row.id }"`) forces child updates on every parent render.
- Destructure props deliberately. In `<script setup>`, `defineProps` is reactive; destructuring is safe with `toRefs` when you need individual refs.
- Register and remove global event listeners in `onMounted` / `onBeforeUnmount` so listeners do not accumulate.

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, toRefs } from 'vue'

const props = defineProps<{ item: Item }>()
const { item } = toRefs(props)

function onResize() {
  // handle resize
}

onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>
```

### 11. Optimize Watchers

Watchers run arbitrary code on change, and a misconfigured watcher can fire far more often than intended.

- Avoid `deep: true` on large objects — deep traversal on every mutation is costly. Watch a computed that projects only the fields you need.
- Use `flush: 'post'` when the watcher only needs to run after the DOM updates, avoiding extra render cycles.
- Prefer `watchEffect` for simple derived side effects; it tracks its dependencies automatically and stops when the component unmounts.

```typescript
import { ref, watch, computed } from 'vue'

const user = ref<{ profile: { name: string; email: string } } | null>(null)

// Instead of deep-watching the whole user object:
const profileName = computed(() => user.value?.profile.name ?? '')

watch(profileName, (name) => {
  // Runs only when the name actually changes
  document.title = `${name} — Dashboard`
}, { flush: 'post' })
```

### 12. Use `KeepAlive` and `Suspense` Deliberately

- Wrap frequently visited route views or dynamic tabs in `<KeepAlive>` to preserve component state and skip re-mounting cost when the user navigates back and forth.
- Use `<Suspense>` for async setup components so the fallback renders immediately and the async work does not block first paint.
- Be careful with `KeepAlive` and large trees — cached components keep their DOM and state alive, so cap the cache with `include`/`max`.

```vue
<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive :include="['DashboardView', 'SearchView']" :max="5">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
```

### 13. Optimize Asset and Network Delivery

Bundle size is only part of load performance. Assets and network behavior matter just as much.

- Serve images in modern formats (WebP/AVIF) with explicit `width`/`height` to prevent layout shift, and lazy-load below-the-fold images with `loading="lazy"`.
- Load fonts with `font-display: swap` and subset them; avoid shipping multiple full font families.
- Set long-lived cache headers for hashed static assets so repeat visits are served from cache.
- Compress responses (gzip or brotli) and consider a CDN with edge caching for static assets and API responses.

```html
<img src="/images/hero.webp" width="1200" height="630" alt="Hero" loading="lazy" fetchpriority="high" />
```

### 14. Move Heavy Work Off the Main Thread

Long JavaScript tasks block rendering and input. Anything CPU-heavy — parsing, transformation, crypto, image processing — belongs in a Web Worker; non-urgent work belongs in idle callbacks.

```typescript
// heavy.worker.ts
self.onmessage = (event: MessageEvent<number[]>) => {
  const result = event.data.map((n) => expensiveTransform(n))
  self.postMessage(result)
}
```

```typescript
// In the component
import HeavyWorker from './heavy.worker?worker'

const worker = new HeavyWorker()
worker.onmessage = (event: MessageEvent<number[]>) => {
  results.value = event.data
  worker.terminate()
}

function processData(raw: number[]) {
  worker.postMessage(raw)
}
```

For non-urgent work that can happen whenever the browser is idle, schedule it with `requestIdleCallback`; for animations, use `requestAnimationFrame` so updates align with the display refresh rate.

## Implementation Steps

### Step 1: Establish a Performance Baseline

Before changing anything, capture the current state.

1. Build the app in production mode and deploy it to a preview environment (or serve it locally).
2. Run Lighthouse and record the Core Web Vitals: Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Interaction to Next Paint (INP).
3. Generate a bundle report and note the total bundle size and the largest chunks.
4. Record a Vue Devtools performance trace of the slowest user flow.

```bash
npm run build
npm run preview

# Generate the bundle report
npx vite-bundle-visualizer
```

Save these numbers — every optimization step should be validated against them.

### Step 2: Reduce and Split the Bundle

1. Inspect the bundle report and identify the largest dependencies.
2. Replace heavy libraries with lighter alternatives where possible (`moment` → `dayjs`, `lodash` → `lodash-es`).
3. Configure `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split vendor code into stable chunks that benefit from long-term caching.

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          charts: ['echarts'],
          editor: ['@codemirror/editor']
        }
      }
    }
  }
})
```

1. Re-run the bundle report and confirm the initial bundle shrank. The goal is a lean entry chunk with everything else split behind dynamic imports.

### Step 3: Implement Route-Level and Component-Level Code Splitting

1. Convert every route's `component` to a dynamic `import()` as shown in Best Practice 3.
2. Identify heavy components used in few places and wrap them with `defineAsyncComponent`.
3. Add loading skeletons so the async chunks have a pleasant placeholder.
4. Verify in the browser's Network tab that visiting a route loads only its own chunk.

### Step 4: Apply Reactivity Optimizations

1. Audit the state tree for large objects that do not need deep reactivity.
2. Convert them to `shallowRef`, `shallowReactive`, `markRaw`, or `readonly` where appropriate.
3. Move static lookup data out of reactive state entirely.
4. Re-run the Vue Devtools performance trace — render times for components that touch the converted state should drop noticeably.

### Step 5: Optimize Rendering Hot Paths

1. Add `v-memo` to large static lists and verify the improvement with a trace.
2. Replace fully rendered long lists with a virtual list (Best Practice 8).
3. Audit `v-for` keys, inline object props, and event listener cleanup (Best Practice 10).
4. Review watchers and computed values for the anti-patterns in Best Practice 11.

### Step 6: Optimize Asset and Network Delivery

1. Convert hero and content images to WebP/AVIF with explicit dimensions and lazy loading.
2. Configure font loading with `font-display: swap` and subsetting.
3. Set up compression and long-lived cache headers for hashed assets on the hosting platform or CDN.
4. Re-run Lighthouse and compare LCP and CLS against the Step 1 baseline.

### Step 7: Profile Runtime Behavior

1. Open the Chrome DevTools Performance panel and record the slowest user flow (for example, opening the largest table or dashboard).
2. Look for long tasks (over 50ms), forced reflow, and excessive memory churn.
3. If long tasks come from application code, move the work to a Web Worker or idle callback (Best Practice 14).
4. Use the Vue Devtools Performance tab to confirm no component is re-rendering more often than its dependencies require.

### Step 8: Set Up Continuous Performance Monitoring

Performance regressions are easiest to fix when they are caught automatically.

1. Add Lighthouse CI to the build pipeline and fail the build when Core Web Vitals or bundle size exceed budgets.
2. Add a bundle-size budget check so a dependency upgrade cannot silently double the bundle.
3. Track Web Vitals from real users with a RUM (Real User Monitoring) tool or a lightweight custom collector.
4. Schedule a monthly performance review: re-run the baseline, compare, and prioritize the next optimization.

```json
{
  "ci": {
    "collect": { "url": ["https://staging.example.com"], "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

With budgets in CI and real-user monitoring in production, the team catches regressions the week they happen instead of the month before a launch.

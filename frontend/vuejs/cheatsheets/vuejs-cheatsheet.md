---
title: "Vue.js Cheat Sheet"
description: "A quick reference guide for Vue.js 3 commands, Composition API functions, template directives, lifecycle hooks, Vue Router composables, Pinia stores, and Nuxt 3 structure."
category: "frontend"
technology: "vuejs"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Vue.js Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Create Vue project | `npm create vue@latest` | Scaffold a new Vue 3 project with Vite |
| Install dependencies | `npm install` | Install project dependencies |
| Run dev server | `npm run dev` | Start Vite development server |
| Build for production | `npm run build` | Optimized production build |
| Preview production build | `npm run preview` | Locally preview production build |
| Run unit tests | `npm run test:unit` | Run Vitest test suite |
| Lint and fix | `npm run lint` | Lint with ESLint and auto-fix |
| Create ref | `const count = ref(0)` | Reactive primitive value |
| Create reactive object | `const state = reactive({})` | Reactive object proxy |
| Computed value | `const total = computed(() => ...)` | Derived reactive value (cached) |
| Watch effect | `watch(source, callback)` | Observe reactive source |
| Auto-run effect | `watchEffect(() => ...)` | Automatically track dependencies |
| Router navigation | `router.push('/path')` | Programmatic navigation |
| Store definition | `defineStore('id', () => {...})` | Create a Pinia store |

## Common Commands

### Project Scaffolding

```bash
# Create new Vue 3 project with interactive prompts
npm create vue@latest my-project

# With specific options (non-interactive)
npm create vue@latest my-project -- --typescript --router --pinia --vitest

# Install and start
cd my-project
npm install
npm run dev
```

### Vite Commands

```bash
# Start dev server with host exposed
npx vite --host

# Build with specific mode
npx vite build --mode staging

# Optimize dependencies
npx vite optimize
```

### Package Installation

```bash
# Vue Router
npm install vue-router@4

# Pinia
npm install pinia

# Axios
npm install axios

# VeeValidate with Zod
npm install vee-validate zod @vee-validate/zod

# VueUse (composition utilities)
npm install @vueuse/core
```

## Code Snippets

### Composition API Basics

```javascript
// ref - for primitive values
import { ref } from 'vue'
const count = ref(0)
count.value++  // must use .value in JS

// reactive - for objects
import { reactive } from 'vue'
const user = reactive({ name: 'Alice', age: 30 })
user.age = 31  // no .value needed

// computed
import { computed } from 'vue'
const double = computed(() => count.value * 2)

// watch
import { watch } from 'vue'
watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`)
})

// watchEffect
import { watchEffect } from 'vue'
watchEffect(() => {
  console.log(`Count is: ${count.value}`)
})

// toRefs - preserve reactivity when destructuring
import { toRefs } from 'vue'
const { name, age } = toRefs(user)
```

### Template Directives

```vue
<!-- v-bind: bind attribute dynamically -->
<img :src="imageUrl" :alt="altText">

<!-- v-model: two-way binding -->
<input v-model="username">
<input v-model.trim="username">
<input v-model.number="age">

<!-- v-if / v-else-if / v-else -->
<div v-if="status === 'loading'">Loading...</div>
<div v-else-if="status === 'error'">Error!</div>
<div v-else>Content loaded</div>

<!-- v-show -->
<button v-show="isVisible">Toggle visibility</button>

<!-- v-for -->
<li v-for="(item, index) in items" :key="item.id">
  {{ index }}: {{ item.name }}
</li>

<!-- v-on (event handling) -->
<button @click="handleClick">Click</button>
<form @submit.prevent="onSubmit">...</form>
<input @keyup.enter="submit">
<button @click.once="doOnce">Once</button>

<!-- v-slot -->
<template #header>Header Content</template>
<template v-slot:footer>Footer Content</template>

<!-- v-html (sanitize XSS risks) -->
<div v-html="rawHtml"></div>

<!-- v-pre / v-once / v-memo -->
<span v-pre>{{ not compiled }}</span>
<span v-once>{{ willNotUpdate }}</span>
<div v-memo="[depA, depB]">Memoized</div>
```

### Lifecycle Hooks

```javascript
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onActivated,
  onDeactivated,
  onErrorCaptured
} from 'vue'

onMounted(() => {
  // DOM available, fetch data, set up event listeners
})

onUnmounted(() => {
  // Clean up timers, subscriptions, listeners
})
```

### Vue Router

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { useRouter, useRoute } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/users/:id', name: 'user', component: User, props: true },
    { path: '/about', name: 'about', component: () => import('@/views/About.vue') }
  ]
})

// In component
const router = useRouter()
const route = useRoute()

// Navigate
router.push({ name: 'user', params: { id: 123 } })
router.replace('/login')
router.back()

// Read params and query
route.params.id     // :id from path
route.query.page    // ?page=1 from query
```

### Pinia Store

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  // State
  const count = ref(0)

  // Getters
  const doubleCount = computed(() => count.value * 2)

  // Actions
  function increment() {
    count.value++
  }

  async function fetchAndSet() {
    const { data } = await axios.get('/api/count')
    count.value = data.value
  }

  return { count, doubleCount, increment, fetchAndSet }
})

// In component
import { useCounterStore } from '@/stores/counter'
const store = useCounterStore()
store.count       // access state
store.doubleCount // access getter
store.increment() // call action
```

### Component Options

```vue
<script setup>
// Props
const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 },
  items: Array
})

// Emits
const emit = defineEmits(['update', 'delete'])

// Provide/Inject
import { provide, inject } from 'vue'
provide('theme', 'dark')

// In child
const theme = inject('theme')  // 'dark'

// Expose parent properties
defineExpose({ reset })
</script>
```

### Nuxt 3 Directory Structure

```text
my-nuxt-app/
├── app.vue              # Root component
├── nuxt.config.ts       # Nuxt configuration
├── pages/               # File-based routing
│   ├── index.vue        # /
│   ├── about.vue        # /about
│   └── posts/
│       └── [id].vue     # /posts/:id
├── components/          # Auto-imported components
├── composables/         # Auto-imported composables
├── layouts/             # Layout components
├── middleware/           # Route middleware
├── stores/              # Pinia stores
├── server/              # Server engine
│   ├── api/             # API routes
│   └── routes/          # Custom server routes
├── public/              # Static assets
└── plugins/             # Vue plugins
```

### Vitest & Vue Test Utils

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true
  }
})

// Component test
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import Counter from '@/components/Counter.vue'

describe('Counter.vue', () => {
  it('renders initial count', () => {
    const wrapper = mount(Counter, { props: { initialCount: 5 } })
    expect(wrapper.text()).toContain('5')
  })

  it('increments on click', async () => {
    const wrapper = mount(Counter)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted().increment).toBeTruthy()
  })
})
```

### ESLint & Prettier Configuration

```javascript
// eslint.config.js (flat config)
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'error',
      'vue/no-v-html': 'warn'
    }
  }
)
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "arrowParens": "avoid"
}
```

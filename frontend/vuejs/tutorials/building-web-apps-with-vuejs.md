---
title: "Building Web Apps with Vue.js 3"
description: "A comprehensive tutorial covering Vue.js 3 setup with Vite, Composition API, SFC patterns, routing with Vue Router, state management with Pinia, form handling, and data fetching."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building Web Apps with Vue.js 3

## Summary

This tutorial provides a hands-on introduction to building modern web applications with Vue.js 3. You will learn how to set up a Vue project using Vite and create-vue, master the Composition API with ref, reactive, computed, and watch, build Single File Components (SFCs) with template/script/style sections, handle events and forms, implement client-side routing with Vue Router, manage application state with Pinia, and fetch data from APIs using fetch and Axios. By the end, you will have built a functional multi-page Vue application from scratch.

## Target Audience

- Frontend Developers, Fullstack Developers, and JavaScript enthusiasts looking to learn Vue.js 3.
- Expected developer level: Intermediate (familiarity with HTML, CSS, and modern JavaScript ES6+ is required).

## Prerequisites

- Solid understanding of JavaScript (ES6+: arrow functions, destructuring, modules, promises, async/await).
- Node.js v18+ and npm (or yarn/pnpm) installed on your machine.
- Basic knowledge of HTML and CSS.
- A code editor (VS Code recommended with Volar extension).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Scaffold a Vue.js 3 project using Vite and create-vue.
- Write reactive components using the Composition API (ref, reactive, computed, watch).
- Build Single File Components with separated template, script, and style sections.
- Render lists conditionally with v-if, v-show, and v-for directives.
- Handle user events with v-on and bind form inputs with v-model.
- Create reusable components with props, emits, and slots.
- Use lifecycle hooks like onMounted and onUnmounted effectively.
- Set up Vue Router with named routes, nested routes, and navigation guards.
- Manage global state with Pinia (stores, actions, getters).
- Fetch and display data from REST APIs using fetch and Axios.

## Context and Motivation

Vue.js has become one of the most popular frontend frameworks due to its gentle learning curve, flexible design, and excellent performance. Vue 3 introduced the Composition API, which provides a powerful and organized way to compose logic, making code more maintainable in larger applications. Combined with Vite's fast development server, Vue Router's declarative routing, and Pinia's intuitive state management, Vue.js 3 is an excellent choice for building everything from simple interactive widgets to complex single-page applications (SPAs). Understanding these core concepts will enable you to build production-ready web applications efficiently.

## Core Content

### Setting Up the Project with Vite

Vite is the recommended build tool for Vue 3. It provides instant server start, hot module replacement (HMR), and optimized production builds.

```bash
npm create vue@latest my-vue-app
cd my-vue-app
npm install
npm run dev
```

The `create-vue` scaffolding tool prompts you to opt in to features like TypeScript, Vue Router, Pinia, and Vitest. Select the features you need for your project.

### Understanding the Composition API

The Composition API lets you organize component logic by feature rather than by lifecycle hook. The key reactive primitives are:

- **ref**: Creates a reactive reference to a primitive value or object. Access the value via `.value` in JavaScript (auto-unwrapped in templates).
- **reactive**: Creates a deeply reactive proxy for an object. No `.value` needed.
- **computed**: Creates a derived reactive value that caches its result and only updates when dependencies change.
- **watch**: Observes reactive sources and executes a callback when they change.
- **watchEffect**: Automatically tracks dependencies and runs a side effect immediately.

### Single File Components (SFCs)

Vue SFCs encapsulate a component's template, logic, and styles in a single `.vue` file:

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>

<style scoped>
button { font-weight: bold; }
</style>
```

The `<script setup>` syntax is the recommended way to use the Composition API — it reduces boilerplate and improves runtime performance.

### Conditional Rendering with v-if and v-show

- **v-if**: Conditionally renders an element. The element is destroyed and recreated when the condition changes.
- **v-show**: Toggles the CSS `display` property. The element is always rendered.

```vue
<p v-if="isVisible">Shown when isVisible is truthy</p>
<p v-show="isActive">Always rendered, toggled via display</p>
```

Use `v-if` for rarely toggled elements; use `v-show` for frequently toggled elements.

### List Rendering with v-for

```vue
<ul>
  <li v-for="(item, index) in items" :key="item.id">
    {{ index }}: {{ item.name }}
  </li>
</ul>
```

Always provide a unique `:key` for each rendered item to help Vue efficiently track changes.

### Event Handling with v-on

```vue
<button @click="handleClick($event)">Click Me</button>
<button @click.once="handleOnce">Only Once</button>
<input @keyup.enter="submit" />
```

The `v-on` directive (shorthand `@`) listens to DOM events. Event modifiers like `.once`, `.prevent`, `.stop`, and key modifiers like `.enter` make common patterns concise.

### Form Binding with v-model

```vue
<input v-model="username" />
<textarea v-model="bio"></textarea>
<select v-model="selected">
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</select>
```

`v-model` creates two-way data bindings. For custom components, use `modelValue` prop and `update:modelValue` emit.

### Component Basics: Props, Emits, Slots

**Props** pass data from parent to child:

```vue
<!-- ChildComponent.vue -->
<script setup>
const props = defineProps({
  title: String,
  count: { type: Number, default: 0 }
})
</script>
```

**Emits** communicate events from child to parent:

```vue
<script setup>
const emit = defineEmits(['update'])
emit('update', newValue)
</script>
```

**Slots** allow parent components to inject content into child components:

```vue
<!-- Child -->
<slot name="header">Default header</slot>

<!-- Parent -->
<Child>
  <template #header>Custom Header</template>
</Child>
```

### Lifecycle Hooks

Vue 3 Composition API lifecycle hooks are prefixed with `on`:

```javascript
import { onMounted, onUnmounted, onUpdated, onBeforeUnmount } from 'vue'

onMounted(() => {
  // Component mounted, DOM available
})

onUnmounted(() => {
  // Cleanup timers, event listeners
})
```

### Setting Up Vue Router

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/about', name: 'about', component: () => import('@/views/AboutView.vue') },
  {
    path: '/users/:id',
    name: 'user-detail',
    component: () => import('@/views/UserDetail.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

Use `<router-link>` for navigation and `<router-view>` to render matched components. Lazy-load routes with dynamic imports for code splitting.

### State Management with Pinia

```javascript
// stores/counter.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)

  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
```

Access the store inside any component:

```vue
<script setup>
import { useCounterStore } from '@/stores/counter'
const counter = useCounterStore()
</script>

<template>
  <p>{{ counter.count }} doubled is {{ counter.doubleCount }}</p>
  <button @click="counter.increment()">+1</button>
</template>
```

### Fetching Data with Fetch and Axios

Using the native Fetch API:

```javascript
import { ref, onMounted } from 'vue'

const posts = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts')
    posts.value = await res.json()
  } catch (err) {
    console.error('Failed to fetch posts:', err)
  } finally {
    loading.value = false
  }
})
```

Using Axios (install with `npm install axios`):

```javascript
import axios from 'axios'

onMounted(async () => {
  const { data } = await axios.get('/api/posts')
  posts.value = data
})
```

## Code Examples

### Complete Todo App Component

```vue
<script setup>
import { ref, computed } from 'vue'

const newTodo = ref('')
const todos = ref([])

const activeTodos = computed(() => todos.value.filter(t => !t.done))

function addTodo() {
  if (newTodo.value.trim()) {
    todos.value.push({
      id: Date.now(),
      text: newTodo.value.trim(),
      done: false
    })
    newTodo.value = ''
  }
}

function toggleTodo(id) {
  const todo = todos.value.find(t => t.id === id)
  if (todo) todo.done = !todo.done
}

function removeTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id)
}
</script>

<template>
  <div class="todo-app">
    <h1>Vue 3 Todo</h1>
    <form @submit.prevent="addTodo">
      <input v-model="newTodo" placeholder="Add a task..." />
      <button type="submit">Add</button>
    </form>
    <p v-if="todos.length === 0">No todos yet. Add one above!</p>
    <ul v-else>
      <li v-for="todo in todos" :key="todo.id" :class="{ done: todo.done }">
        <input type="checkbox" :checked="todo.done" @change="toggleTodo(todo.id)" />
        <span>{{ todo.text }}</span>
        <button @click="removeTodo(todo.id)">✕</button>
      </li>
    </ul>
    <p>Active: {{ activeTodos.length }} / {{ todos.length }}</p>
  </div>
</template>

<style scoped>
.todo-app { max-width: 400px; margin: 2rem auto; font-family: sans-serif; }
.done span { text-decoration: line-through; opacity: 0.6; }
li { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; }
</style>
```

### Vue Router Setup with Navigation Guard

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/', component: () => import('@/views/Home.vue') },
  { path: '/login', component: () => import('@/views/Login.vue') },
  { 
    path: '/dashboard', 
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
```

### Pinia Store with API Integration

```javascript
// stores/products.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useProductStore = defineStore('products', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchProducts() {
    loading.value = true
    error.value = null
    try {
      const { data } = await axios.get('/api/products')
      items.value = data
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchProducts }
})
```

## Key Insights

- **Composition API over Options API**: For new projects, prefer `<script setup>` with the Composition API. It provides better TypeScript inference, easier logic reuse, and cleaner code organization.
- **Vite is the default**: Always use Vite (via `create-vue`) for new Vue 3 projects. It is significantly faster than Vue CLI (webpack-based) in both development and production builds.
- **Pinia over Vuex**: Pinia is the official state management library for Vue 3. It has a simpler API, full TypeScript support, and works seamlessly with the Composition API.
- **Lazy-load routes**: Use dynamic imports (`() => import(...)`) for route components to enable automatic code splitting and reduce the initial bundle size.
- **Scoped styles**: Use `<style scoped>` in SFCs to prevent style leakage. For global styles, use a separate CSS file or `:global()` selector.

## Next Steps

- Explore the official Vue.js documentation at [vuejs.org](https://vuejs.org/).
- Learn about advanced patterns like provide/inject, teleport, and Suspense.
- Dive into testing with Vitest and Vue Test Utils.
- Build a full-stack application by combining Vue.js with a backend framework like Express or Laravel.
- Study the Vue.js Best Practices Guide in this library for production-ready patterns.

## Conclusion

You have walked through the complete workflow of building a Vue.js 3 application: project scaffolding with Vite, reactive programming with the Composition API, component design with SFCs, routing with Vue Router, state management with Pinia, and API data fetching. These skills form the foundation for developing modern, maintainable, and performant frontend applications. Practice by building small projects, gradually incorporating more advanced features like TypeScript, testing, and server-side rendering with Nuxt.

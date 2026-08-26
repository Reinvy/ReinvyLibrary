---
title: "Building an E-Commerce Storefront with Vue 3 and Pinia"
description: "An advanced tutorial on building a production-ready e-commerce storefront with Vue 3 and Pinia — product catalog, cart state architecture, checkout flow, optimistic updates, and persistence."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building an E-Commerce Storefront with Vue 3 and Pinia

## Summary

This tutorial walks through building a complete e-commerce storefront with Vue 3 and Pinia. You will design a modular state architecture with dedicated stores for the product catalog, the shopping cart, and the checkout flow, then connect them to a set of Vue components backed by Vue Router. Along the way you will implement derived totals with getters, stock-aware quantity updates, optimistic cart operations with rollback, and a persistence plugin that keeps the cart alive across page reloads. The final outcome is a small but production-shaped storefront: a product listing with category filters, a product detail view, a slide-out cart drawer, and a multi-step checkout page.

## Target Audience

- Frontend developers who want to see how a real-world Vue application is structured around Pinia.
- Vue developers moving from single-page demos to multi-store applications with complex derived state.
- Expected developer level: advanced — comfortable with the Composition API, `<script setup>`, and Vue Router.

## Prerequisites

- Solid knowledge of Vue 3 fundamentals, including the Composition API, `ref`, `computed`, and single-file components.
- Basic familiarity with Pinia (creating a store, `storeToRefs`, getters, actions).
- Node.js 18+ and npm or pnpm installed, plus the Vue CLI or Vite scaffolding tools.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Design a multi-store Pinia architecture in which each store owns a single, well-defined slice of application state.
- Model derived data (cart totals, item counts, stock availability) with getters instead of duplicating values in state.
- Build a checkout flow that validates a shipping form, submits an order, and clears the cart only after success.
- Add persistence and rehydration with a custom Pinia plugin, including a version key to invalidate stale caches.
- Implement optimistic cart updates with safe rollback when a network operation fails.
- Structure routes and components around stores so that views stay thin and logic stays testable.

## Context and Motivation

E-commerce is one of the most common real-world Vue applications, and it is also one of the best teachers of state management. A storefront has several interacting slices of state — products, cart, checkout — that change at different rates and have different persistence requirements. Products are fetched once and mostly stay put; the cart is mutated constantly and must survive a page reload; the checkout form is ephemeral but depends on cart contents. Naively throwing all of this into component state leads to prop drilling, duplicated totals, and cart data that vanishes on refresh.

Pinia's store model maps naturally onto this problem: each store encapsulates one slice, getters compute derived values from a single source of truth, and plugins extend stores with cross-cutting concerns such as persistence. By the end of this tutorial you will have internalized a state architecture that scales from a small storefront to a large catalog with dozens of modules — the same mental model used by production Vue shops.

## Core Content

### Project Overview and Directory Structure

The storefront has four screens: a product listing with category filters, a product detail page, and a checkout page, plus a global cart drawer that overlays any screen. Data comes from a small mock API (`products.json`) served by Vite during development, so no backend is required.

```text
ecommerce-storefront/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js
    ├── App.vue
    ├── router/
    │   └── index.js
    ├── stores/
    │   ├── products.js
    │   ├── cart.js
    │   ├── checkout.js
    │   └── persist.js
    ├── components/
    │   ├── ProductCard.vue
    │   ├── ProductFilters.vue
    │   ├── CartDrawer.vue
    │   └── ToastList.vue
    ├── views/
    │   ├── CatalogView.vue
    │   ├── ProductDetailView.vue
    │   └── CheckoutView.vue
    └── api/
        └── products.json
```

The key architectural rule: **views fetch and display, stores own and mutate, components emit user intents**. `CatalogView` reads from the products store, `ProductCard` emits `add-to-cart`, and `CartDrawer` renders the cart store's getters.

### Designing the State Model

Three stores split the application state cleanly:

- `useProductsStore` — the catalog: product list, category filter, loading and error state. This store is fetched once and is intentionally read-mostly.
- `useCartStore` — the cart: a map of product ID to quantity, plus every derived number the UI needs (item count, subtotal, shipping, total). This is the most frequently mutated store and the one that needs persistence.
- `useCheckoutStore` — the checkout: shipping form fields, validation state, and the order submission status.

Use the setup-style `defineStore` so the store body reads like a Composition API component:

```javascript
// src/stores/products.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductsStore = defineStore('products', () => {
  const items = ref([])
  const activeCategory = ref('all')
  const loading = ref(false)
  const error = ref(null)

  const filteredProducts = computed(() => {
    if (activeCategory.value === 'all') return items.value
    return items.value.filter((p) => p.category === activeCategory.value)
  })

  const categories = computed(() => {
    return [...new Set(items.value.map((p) => p.category))]
  })

  async function fetchProducts() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/products.json')
      items.value = await res.json()
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return { items, activeCategory, loading, error, filteredProducts, categories, fetchProducts }
})
```

Notice that `filteredProducts` and `categories` are computed properties, not stored values. If a product is added or the filter changes, the getters recompute automatically and no part of the app can forget to sync them.

### The Product Catalog Module

The catalog is the entry point of the storefront. On mount, the app fetches the product list once; category filters are a client-side concern thanks to the `filteredProducts` getter. The pattern to copy for any server-backed list is: `loading` flag, `error` message, and a single `fetch` action that always clears `loading` in a `finally` block — this keeps the UI responsive and never leaves a spinner stuck.

### The Cart Module

The cart store is the heart of the application. It keeps a `Record<productId, quantity>` map, which is both compact and easy to persist:

```javascript
// src/stores/cart.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useProductsStore } from './products'

export const useCartStore = defineStore('cart', () => {
  const quantities = ref({})

  const items = computed(() => {
    const products = useProductsStore()
    return Object.entries(quantities.value)
      .map(([id, qty]) => ({ product: products.byId(id), qty }))
      .filter((entry) => entry.product)
  })

  const itemCount = computed(() => {
    return Object.values(quantities.value).reduce((sum, qty) => sum + qty, 0)
  })

  const subtotal = computed(() => {
    return items.value.reduce((sum, entry) => sum + entry.product.price * entry.qty, 0)
  })

  const shipping = computed(() => (subtotal.value === 0 || subtotal.value >= 100 ? 0 : 9.99))

  const total = computed(() => subtotal.value + shipping.value)

  function addToCart(productId, qty = 1) {
    const product = useProductsStore().byId(productId)
    const current = quantities.value[productId] ?? 0
    quantities.value[productId] = Math.min(current + qty, product.stock)
  }

  function removeFromCart(productId) {
    delete quantities.value[productId]
    quantities.value = { ...quantities.value }
  }

  function updateQuantity(productId, qty) {
    const product = useProductsStore().byId(productId)
    if (qty <= 0) return removeFromCart(productId)
    quantities.value[productId] = Math.min(qty, product.stock)
  }

  function clear() {
    quantities.value = {}
  }

  return { quantities, items, itemCount, subtotal, shipping, total, addToCart, removeFromCart, updateQuantity, clear }
})
```

Three details make this store production-ready. First, all totals are getters over the single `quantities` source of truth, so the UI can never display a subtotal that disagrees with the line items. Second, `addToCart` and `updateQuantity` clamp against `product.stock`, which prevents overselling from double-clicks or a stale UI. Third, `removeFromCart` reassigns the object so `ref` reactivity fires even though the operation is a property delete.

### Checkout Flow and Order Submission

The checkout store owns the form lifecycle. It keeps the shipping fields, a per-field error map, and a `status` that moves through `idle → submitting → success → error`. The order payload is assembled from the cart store at submission time, which keeps the two stores decoupled:

```javascript
// src/stores/checkout.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCartStore } from './cart'

export const useCheckoutStore = defineStore('checkout', () => {
  const form = ref({ name: '', email: '', address: '', city: '', zip: '' })
  const errors = ref({})
  const status = ref('idle')

  const isValid = computed(() => Object.keys(errors.value).length === 0)

  function validate() {
    const next = {}
    if (!form.value.name.trim()) next.name = 'Name is required'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.value.email)) next.email = 'A valid email is required'
    if (form.value.address.trim().length < 5) next.address = 'Address is too short'
    if (!form.value.city.trim()) next.city = 'City is required'
    if (!/^\d{4,6}$/.test(form.value.zip.trim())) next.zip = 'Zip code must be 4-6 digits'
    errors.value = next
    return Object.keys(next).length === 0
  }

  async function submitOrder() {
    if (!isValid.value) return { ok: false }
    status.value = 'submitting'
    const cart = useCartStore()
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: form.value, items: cart.items.value, total: cart.total.value }),
      })
      if (!res.ok) throw new Error(`Order failed with status ${res.status}`)
      cart.clear()
      status.value = 'success'
      return { ok: true }
    } catch (err) {
      status.value = 'error'
      return { ok: false, error: err.message }
    }
  }

  return { form, errors, status, isValid, validate, submitOrder }
})
```

The critical rule in `submitOrder`: the cart is cleared **only after** the network call succeeds. Clearing first would lose the user's order data if the request fails and the user has to retry.

### Persistence and Hydration with a Pinia Plugin

A storefront that loses the cart on refresh frustrates users. Pinia plugins can wrap every store and add behavior; the cleanest approach is a small plugin that subscribes to state changes and writes only the stores flagged for persistence:

```javascript
// src/stores/persist.js
const STORAGE_KEY = 'storefront:cart'
const VERSION = 1

export function persistCart({ store }) {
  if (store.$id !== 'cart') return

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.version === VERSION) store.$patch({ quantities: parsed.quantities })
    } catch {
      // corrupted storage — start with an empty cart
    }
  }

  store.$subscribe((_mutation, state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, quantities: state.quantities }))
  })
}
```

The version key is the part most tutorials omit. When you change the cart's schema in a future release — say, adding a currency field — old persisted payloads would be rehydrated into a store that no longer understands them. Bumping `VERSION` silently discards stale caches instead of crashing the app.

### Optimistic Updates and Error Handling

Adding an item to the cart is instant because it is a local mutation. Real storefronts often reserve stock or update a server-side cart, which is slower; the standard technique is the **optimistic update**: apply the local change immediately, then roll back if the request fails. The rollback must restore the exact previous value, so capture it before mutating:

```javascript
// src/stores/cart.js (addition)
let pending = false

async function syncQuantity(productId, previousQty) {
  try {
    const res = await fetch(`/api/cart/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: quantities.value[productId] ?? 0 }),
    })
    if (!res.ok) throw new Error(`Sync failed with status ${res.status}`)
  } catch {
    quantities.value[productId] = previousQty
    quantities.value = { ...quantities.value }
    pending = false
    throw new Error('Could not sync cart — reverted to the previous quantity')
  }
}
```

Throttle rapid double-clicks by tracking `pending` and skipping a new sync while one is in flight. Pair this with a `ToastList` component that shows a success message on `addToCart` and an error toast when a rollback happens — users should never wonder whether their action landed.

### Component Integration and Routing

With the stores in place, components stay thin. The router maps the three views, and `App.vue` hosts the global `CartDrawer` via `Teleport` so it can overlay any route:

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'catalog', component: () => import('../views/CatalogView.vue') },
    { path: '/product/:id', name: 'product', component: () => import('../views/ProductDetailView.vue') },
    { path: '/checkout', name: 'checkout', component: () => import('../views/CheckoutView.vue') },
  ],
})

export default router
```

```html
<!-- src/components/CartDrawer.vue (template excerpt) -->
<Teleport to="body">
  <Transition name="drawer">
    <aside v-if="open" class="cart-drawer">
      <header>
        <h2>Your Cart ({{ cart.itemCount }})</h2>
        <button @click="open = false" aria-label="Close cart">×</button>
      </header>
      <ul>
        <li v-for="entry in cart.items" :key="entry.product.id">
          <span>{{ entry.product.title }}</span>
          <input
            type="number"
            min="1"
            :max="entry.product.stock"
            :value="entry.qty"
            @change="cart.updateQuantity(entry.product.id, Number($event.target.value))"
          />
          <strong>${{ (entry.product.price * entry.qty).toFixed(2) }}</strong>
        </li>
      </ul>
      <footer>
        <p>Subtotal: <strong>${{ cart.subtotal.toFixed(2) }}</strong></p>
        <p>Shipping: {{ cart.shipping === 0 ? 'Free' : `$${cart.shipping.toFixed(2)}` }}</p>
        <p>Total: <strong>${{ cart.total.toFixed(2) }}</strong></p>
        <RouterLink to="/checkout" @click="open = false">Proceed to Checkout</RouterLink>
      </footer>
    </aside>
  </Transition>
</Teleport>
```

The drawer uses `storeToRefs` for reactive getters, `Transition` for the slide-in animation, and `RouterLink` for navigation. Every mutation the drawer performs comes from a cart store action — the component never touches `quantities` directly.

## Code Examples

### Full Product Store with Filters

```javascript
// src/stores/products.js — complete
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductsStore = defineStore('products', () => {
  const items = ref([])
  const activeCategory = ref('all')
  const loading = ref(false)
  const error = ref(null)

  const filteredProducts = computed(() => {
    if (activeCategory.value === 'all') return items.value
    return items.value.filter((p) => p.category === activeCategory.value)
  })

  const categories = computed(() => [...new Set(items.value.map((p) => p.category))])

  function byId(id) {
    return items.value.find((p) => p.id === id)
  }

  async function fetchProducts() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/products.json')
      items.value = await res.json()
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return { items, activeCategory, loading, error, filteredProducts, categories, byId, fetchProducts }
})
```

### Sample Product Payload

```json
[
  {
    "id": "p1",
    "title": "Mechanical Keyboard",
    "category": "peripherals",
    "price": 89.99,
    "stock": 12
  },
  {
    "id": "p2",
    "title": "USB-C Hub",
    "category": "peripherals",
    "price": 39.99,
    "stock": 40
  }
]
```

### Product Card Component

```html
<!-- src/components/ProductCard.vue -->
<script setup>
import { useCartStore } from '../stores/cart'

const props = defineProps({
  product: { type: Object, required: true },
})

const cart = useCartStore()
</script>

<template>
  <article class="product-card">
    <h3>{{ product.title }}</h3>
    <p>${{ product.price.toFixed(2) }} · {{ product.stock }} in stock</p>
    <button :disabled="product.stock === 0" @click="cart.addToCart(product.id)">
      {{ product.stock === 0 ? 'Out of stock' : 'Add to Cart' }}
    </button>
  </article>
</template>
```

### App Bootstrapping with the Persist Plugin

```javascript
// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { persistCart } from './stores/persist'

const pinia = createPinia()
pinia.use(persistCart)

createApp(App).use(pinia).use(router).mount('#app')
```

## Key Insights

- **One store, one slice of state**: products owns catalog data, cart owns quantities, checkout owns the form. Cross-store reads go through getters (the cart reads product prices from the products store) instead of duplicating data.
- **Derived values belong in getters**: item counts, subtotals, shipping, and totals are computed properties over the single source of truth. Duplicating them in state is the most common source of stale-UI bugs.
- **Clear state only after success**: in async flows, mutate local state optimistically but persist or clear remote state only after the network call confirms. A cart cleared before an order succeeds loses the customer's data on retry.
- **Version your persisted state**: a version key in the storage payload lets you invalidate old caches when the store schema changes. Without it, stale payloads crash or corrupt the rehydrated store.
- **Stock clamping beats trust**: clamp every quantity change against `product.stock` in the store, not in the component. UI guards are bypassed by double-clicks and stale renders; store guards cannot be.
- **Getters are cheap, but watch big lists**: for catalogs with thousands of products, consider `shallowRef` for the product array so deep reactivity is not created for data that is fetched once and replaced wholesale.

## Next Steps

- Add a real payment gateway: replace the mock order POST with Stripe Payment Intents or a server-side checkout session.
- Explore server-side rendering with Nuxt 3 so the catalog is SEO-friendly and hydrates from the server.
- Study the Vue.js Performance Optimization guide to profile and tune the storefront's rendering.
- Write tests for the stores with Vitest — the modular store design makes unit testing cart logic trivial.

## Conclusion

You have built a storefront whose complexity lives in three focused Pinia stores instead of scattered component state. The catalog store demonstrates a read-mostly fetch pattern with client-side filtering; the cart store shows how getters turn one quantity map into every number the UI needs; and the checkout store proves that async flows belong in actions, with state cleared only after success. The persistence plugin and optimistic rollback turn a demo into a production-shaped application. This architecture — thin views, expressive stores, derived getters, plugin-based cross-cutting concerns — is the same shape used by large Vue applications, and it will serve you well beyond e-commerce.

---
title: "Cheat Sheet Vue.js"
description: "Panduan referensi cepat untuk perintah Vue.js 3, fungsi Composition API, direktif template, lifecycle hooks, composables Vue Router, store Pinia, dan struktur Nuxt 3."
category: "frontend"
technology: "vuejs"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Vue.js

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Buat proyek Vue | `npm create vue@latest` | Buat proyek Vue 3 baru dengan Vite |
| Install dependensi | `npm install` | Install dependensi proyek |
| Jalankan dev server | `npm run dev` | Mulai server pengembangan Vite |
| Build untuk produksi | `npm run build` | Build produksi yang dioptimalkan |
| Pratinjau build | `npm run preview` | Pratinjau build produksi secara lokal |
| Jalankan unit test | `npm run test:unit` | Jalankan suite test Vitest |
| Lint dan perbaiki | `npm run lint` | Lint dengan ESLint dan auto-fix |
| Buat ref | `const count = ref(0)` | Nilai reaktif primitif |
| Buat objek reaktif | `const state = reactive({})` | Proxy objek reaktif |
| Nilai computed | `const total = computed(() => ...)` | Nilai turunan reaktif (cache) |
| Watch effect | `watch(sumber, callback)` | Amati sumber reaktif |
| Efek otomatis | `watchEffect(() => ...)` | Lacak dependensi secara otomatis |
| Navigasi router | `router.push('/path')` | Navigasi programatik |
| Definisi store | `defineStore('id', () => {...})` | Buat store Pinia |

## Perintah Umum

### Pembuatan Proyek

```bash
# Buat proyek Vue 3 baru dengan prompt interaktif
npm create vue@latest proyek-saya

# Dengan opsi spesifik (non-interaktif)
npm create vue@latest proyek-saya -- --typescript --router --pinia --vitest

# Install dan mulai
cd proyek-saya
npm install
npm run dev
```

### Perintah Vite

```bash
# Mulai dev server dengan host terbuka
npx vite --host

# Build dengan mode spesifik
npx vite build --mode staging

# Optimasi dependensi
npx vite optimize
```

### Instalasi Package

```bash
# Vue Router
npm install vue-router@4

# Pinia
npm install pinia

# Axios
npm install axios

# VeeValidate dengan Zod
npm install vee-validate zod @vee-validate/zod

# VueUse (utilitas composition)
npm install @vueuse/core
```

## Potongan Kode

### Dasar Composition API

```javascript
// ref - untuk nilai primitif
import { ref } from 'vue'
const count = ref(0)
count.value++  // harus menggunakan .value di JS

// reactive - untuk objek
import { reactive } from 'vue'
const user = reactive({ name: 'Alice', age: 30 })
user.age = 31  // tidak perlu .value

// computed
import { computed } from 'vue'
const double = computed(() => count.value * 2)

// watch
import { watch } from 'vue'
watch(count, (newVal, oldVal) => {
  console.log(`Count berubah dari ${oldVal} menjadi ${newVal}`)
})

// watchEffect
import { watchEffect } from 'vue'
watchEffect(() => {
  console.log(`Sekarang count: ${count.value}`)
})

// toRefs - pertahankan reaktivitas saat destructuring
import { toRefs } from 'vue'
const { name, age } = toRefs(user)
```

### Direktif Template

```vue
<!-- v-bind: ikat atribut secara dinamis -->
<img :src="imageUrl" :alt="altText">

<!-- v-model: binding dua arah -->
<input v-model="username">
<input v-model.trim="username">
<input v-model.number="age">

<!-- v-if / v-else-if / v-else -->
<div v-if="status === 'loading'">Memuat...</div>
<div v-else-if="status === 'error'">Error!</div>
<div v-else>Konten dimuat</div>

<!-- v-show -->
<button v-show="isVisible">Toggle visibilitas</button>

<!-- v-for -->
<li v-for="(item, index) in items" :key="item.id">
  {{ index }}: {{ item.name }}
</li>

<!-- v-on (penanganan event) -->
<button @click="handleClick">Klik</button>
<form @submit.prevent="onSubmit">...</form>
<input @keyup.enter="submit">
<button @click.once="doOnce">Sekali</button>

<!-- v-slot -->
<template #header>Konten Header</template>
<template v-slot:footer>Konten Footer</template>

<!-- v-html (waspada XSS) -->
<div v-html="rawHtml"></div>

<!-- v-pre / v-once / v-memo -->
<span v-pre>{{ tidak dikompilasi }}</span>
<span v-once>{{ tidakAkanUpdate }}</span>
<div v-memo="[depA, depB]">Dimemo</div>
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
  // DOM tersedia, ambil data, pasang event listener
})

onUnmounted(() => {
  // Bersihkan timer, subscription, listener
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

// Di komponen
const router = useRouter()
const route = useRoute()

// Navigasi
router.push({ name: 'user', params: { id: 123 } })
router.replace('/login')
router.back()

// Baca params dan query
route.params.id     // :id dari path
route.query.page    // ?page=1 dari query
```

### Store Pinia

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

// Di komponen
import { useCounterStore } from '@/stores/counter'
const store = useCounterStore()
store.count       // akses state
store.doubleCount // akses getter
store.increment() // panggil action
```

### Opsi Komponen

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

// Di komponen anak
const theme = inject('theme')  // 'dark'

// Expose properti induk
defineExpose({ reset })
</script>
```

### Struktur Direktori Nuxt 3

```text
my-nuxt-app/
├── app.vue              # Komponen root
├── nuxt.config.ts       # Konfigurasi Nuxt
├── pages/               # Routing berbasis file
│   ├── index.vue        # /
│   ├── about.vue        # /about
│   └── posts/
│       └── [id].vue     # /posts/:id
├── components/          # Komponen auto-import
├── composables/         # Composables auto-import
├── layouts/             # Komponen layout
├── middleware/           # Middleware rute
├── stores/              # Store Pinia
├── server/              # Mesin server
│   ├── api/             # Route API
│   └── routes/          # Route server kustom
├── public/              # Aset statis
└── plugins/             # Plugin Vue
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

// Test komponen
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import Counter from '@/components/Counter.vue'

describe('Counter.vue', () => {
  it('menampilkan count awal', () => {
    const wrapper = mount(Counter, { props: { initialCount: 5 } })
    expect(wrapper.text()).toContain('5')
  })

  it('increment saat diklik', async () => {
    const wrapper = mount(Counter)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted().increment).toBeTruthy()
  })
})
```

### Konfigurasi ESLint & Prettier

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

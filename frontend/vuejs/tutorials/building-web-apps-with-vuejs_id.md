---
title: "Membangun Aplikasi Web dengan Vue.js 3"
description: "Tutorial komprehensif tentang setup Vue.js 3 dengan Vite, Composition API, pola SFC, routing dengan Vue Router, state management dengan Pinia, penanganan form, dan pengambilan data."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Web dengan Vue.js 3

## Ringkasan

Tutorial ini memberikan pengenalan langsung tentang cara membangun aplikasi web modern dengan Vue.js 3. Anda akan mempelajari cara menyiapkan proyek Vue menggunakan Vite dan create-vue, menguasai Composition API dengan ref, reactive, computed, dan watch, membangun Single File Components (SFC) dengan bagian template/script/style, menangani event dan form, mengimplementasikan routing sisi klien dengan Vue Router, mengelola state aplikasi dengan Pinia, dan mengambil data dari API menggunakan fetch dan Axios. Pada akhirnya, Anda akan membangun aplikasi Vue multi-halaman yang fungsional dari awal.

## Target Audiens

- Pengembang Frontend, Pengembang Fullstack, dan penggemar JavaScript yang ingin mempelajari Vue.js 3.
- Ekspektasi tingkat kemampuan: Menengah (diperlukan pemahaman tentang HTML, CSS, dan JavaScript ES6+ modern).

## Prasyarat

- Pemahaman solid tentang JavaScript (ES6+: arrow functions, destructuring, modules, promises, async/await).
- Node.js v18+ dan npm (atau yarn/pnpm) terinstal di mesin Anda.
- Pengetahuan dasar HTML dan CSS.
- Editor kode (VS Code dengan ekstensi Volar direkomendasikan).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Membuat proyek Vue.js 3 menggunakan Vite dan create-vue.
- Menulis komponen reaktif menggunakan Composition API (ref, reactive, computed, watch).
- Membangun Single File Components dengan bagian template, script, dan style yang terpisah.
- Me-render daftar secara kondisional dengan direktif v-if, v-show, dan v-for.
- Menangani event pengguna dengan v-on dan mengikat input form dengan v-model.
- Membuat komponen yang dapat digunakan kembali dengan props, emits, dan slots.
- Menggunakan lifecycle hooks seperti onMounted dan onUnmounted secara efektif.
- Mengatur Vue Router dengan named routes, nested routes, dan navigation guards.
- Mengelola state global dengan Pinia (stores, actions, getters).
- Mengambil dan menampilkan data dari REST API menggunakan fetch dan Axios.

## Konteks dan Motivasi

Vue.js telah menjadi salah satu framework frontend paling populer berkat kurva pembelajaran yang landai, desain yang fleksibel, dan performa yang sangat baik. Vue 3 memperkenalkan Composition API yang menyediakan cara yang kuat dan terorganisir untuk menyusun logika, membuat kode lebih mudah dipelihara dalam aplikasi yang lebih besar. Dengan server pengembangan Vite yang cepat, routing deklaratif Vue Router, dan manajemen state intuitif Pinia, Vue.js 3 adalah pilihan yang sangat baik untuk membangun semuanya, mulai dari widget interaktif sederhana hingga aplikasi satu halaman (SPA) yang kompleks. Memahami konsep-konsep inti ini akan memungkinkan Anda membangun aplikasi web siap produksi secara efisien.

## Konten Inti

### Menyiapkan Proyek dengan Vite

Vite adalah alat build yang direkomendasikan untuk Vue 3. Vite menyediakan server start instan, hot module replacement (HMR), dan build produksi yang dioptimalkan.

```bash
npm create vue@latest my-vue-app
cd my-vue-app
npm install
npm run dev
```

Alat scaffolding `create-vue` akan menanyakan fitur-fitur yang ingin diaktifkan seperti TypeScript, Vue Router, Pinia, dan Vitest. Pilih fitur yang Anda butuhkan.

### Memahami Composition API

Composition API memungkinkan Anda mengatur logika komponen berdasarkan fitur, bukan berdasarkan lifecycle hook. Primitif reaktif utamanya adalah:

- **ref**: Membuat referensi reaktif untuk nilai primitif atau objek. Akses nilai melalui `.value` di JavaScript (terbuka otomatis di template).
- **reactive**: Membuat proxy reaktif mendalam untuk sebuah objek. Tidak perlu `.value`.
- **computed**: Membuat nilai turunan reaktif yang menyimpan cache hasilnya dan hanya memperbarui saat dependensi berubah.
- **watch**: Mengamati sumber reaktif dan menjalankan callback saat berubah.
- **watchEffect**: Secara otomatis melacak dependensi dan menjalankan efek samping segera.

### Single File Components (SFC)

SFC Vue mengenkapsulasi template, logika, dan gaya komponen dalam satu file `.vue`:

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

Sintaks `<script setup>` adalah cara yang direkomendasikan untuk menggunakan Composition API — mengurangi boilerplate dan meningkatkan performa runtime.

### Rendering Bersyarat dengan v-if dan v-show

- **v-if**: Me-render elemen secara kondisional. Elemen dihancurkan dan dibuat ulang saat kondisi berubah.
- **v-show**: Mengganti properti CSS `display`. Elemen selalu di-render.

```vue
<p v-if="isVisible">Ditampilkan saat isVisible truthy</p>
<p v-show="isActive">Selalu di-render, disembunyikan via display</p>
```

Gunakan `v-if` untuk elemen yang jarang di-toggle; gunakan `v-show` untuk elemen yang sering di-toggle.

### Rendering Daftar dengan v-for

```vue
<ul>
  <li v-for="(item, index) in items" :key="item.id">
    {{ index }}: {{ item.name }}
  </li>
</ul>
```

Selalu berikan `:key` yang unik untuk setiap item yang di-render agar Vue dapat melacak perubahan secara efisien.

### Penanganan Event dengan v-on

```vue
<button @click="handleClick($event)">Klik Saya</button>
<button @click.once="handleOnce">Sekali Saja</button>
<input @keyup.enter="submit" />
```

Direktif `v-on` (singkatan `@`) mendengarkan event DOM. Modifier event seperti `.once`, `.prevent`, `.stop`, dan modifier tombol seperti `.enter` membuat pola umum menjadi ringkas.

### Binding Form dengan v-model

```vue
<input v-model="username" />
<textarea v-model="bio"></textarea>
<select v-model="selected">
  <option value="a">Opsi A</option>
  <option value="b">Opsi B</option>
</select>
```

`v-model` membuat data binding dua arah. Untuk komponen kustom, gunakan prop `modelValue` dan emit `update:modelValue`.

### Dasar Komponen: Props, Emits, Slots

**Props** mengirim data dari induk ke anak:

```vue
<!-- ChildComponent.vue -->
<script setup>
const props = defineProps({
  title: String,
  count: { type: Number, default: 0 }
})
</script>
```

**Emits** mengomunikasikan event dari anak ke induk:

```vue
<script setup>
const emit = defineEmits(['update'])
emit('update', newValue)
</script>
```

**Slots** memungkinkan komponen induk menyuntikkan konten ke dalam komponen anak:

```vue
<!-- Anak -->
<slot name="header">Header default</slot>

<!-- Induk -->
<Child>
  <template #header>Header Kustom</template>
</Child>
```

### Lifecycle Hooks

Lifecycle hooks Vue 3 Composition API diawali dengan `on`:

```javascript
import { onMounted, onUnmounted, onUpdated, onBeforeUnmount } from 'vue'

onMounted(() => {
  // Komponen dimount, DOM tersedia
})

onUnmounted(() => {
  // Membersihkan timer, event listener
})
```

### Mengatur Vue Router

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

Gunakan `<router-link>` untuk navigasi dan `<router-view>` untuk me-render komponen yang cocok. Lazy-load rute dengan dynamic imports untuk code splitting.

### Manajemen State dengan Pinia

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

Akses store di dalam komponen mana pun:

```vue
<script setup>
import { useCounterStore } from '@/stores/counter'
const counter = useCounterStore()
</script>

<template>
  <p>{{ counter.count }} digandakan menjadi {{ counter.doubleCount }}</p>
  <button @click="counter.increment()">+1</button>
</template>
```

### Mengambil Data dengan Fetch dan Axios

Menggunakan Fetch API bawaan:

```javascript
import { ref, onMounted } from 'vue'

const posts = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts')
    posts.value = await res.json()
  } catch (err) {
    console.error('Gagal mengambil postingan:', err)
  } finally {
    loading.value = false
  }
})
```

Menggunakan Axios (install dengan `npm install axios`):

```javascript
import axios from 'axios'

onMounted(async () => {
  const { data } = await axios.get('/api/posts')
  posts.value = data
})
```

## Contoh Kode

### Komponen Aplikasi Todo Lengkap

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
    <h1>Todo Vue 3</h1>
    <form @submit.prevent="addTodo">
      <input v-model="newTodo" placeholder="Tambah tugas..." />
      <button type="submit">Tambah</button>
    </form>
    <p v-if="todos.length === 0">Belum ada tugas. Tambahkan satu di atas!</p>
    <ul v-else>
      <li v-for="todo in todos" :key="todo.id" :class="{ done: todo.done }">
        <input type="checkbox" :checked="todo.done" @change="toggleTodo(todo.id)" />
        <span>{{ todo.text }}</span>
        <button @click="removeTodo(todo.id)">✕</button>
      </li>
    </ul>
    <p>Aktif: {{ activeTodos.length }} / {{ todos.length }}</p>
  </div>
</template>

<style scoped>
.todo-app { max-width: 400px; margin: 2rem auto; font-family: sans-serif; }
.done span { text-decoration: line-through; opacity: 0.6; }
li { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; }
</style>
```

### Setup Vue Router dengan Navigation Guard

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

### Pinia Store dengan Integrasi API

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

## Insight Penting

- **Composition API daripada Options API**: Untuk proyek baru, pilih `<script setup>` dengan Composition API. Ini memberikan inferensi TypeScript yang lebih baik, penggunaan ulang logika yang lebih mudah, dan organisasi kode yang lebih bersih.
- **Vite adalah bawaan default**: Selalu gunakan Vite (via `create-vue`) untuk proyek Vue 3 baru. Ini secara signifikan lebih cepat daripada Vue CLI (berbasis webpack) baik dalam pengembangan maupun build produksi.
- **Pinia daripada Vuex**: Pinia adalah library manajemen state resmi untuk Vue 3. Memiliki API yang lebih sederhana, dukungan TypeScript penuh, dan bekerja mulus dengan Composition API.
- **Lazy-load rute**: Gunakan dynamic imports (`() => import(...)`) untuk komponen rute guna mengaktifkan code splitting otomatis dan mengurangi ukuran bundle awal.
- **Scoped styles**: Gunakan `<style scoped>` di SFC untuk mencegah kebocoran gaya. Untuk gaya global, gunakan file CSS terpisah atau selector `:global()`.

## Langkah Berikutnya

- Jelajahi dokumentasi resmi Vue.js di [vuejs.org](https://vuejs.org/).
- Pelajari pola tingkat lanjut seperti provide/inject, teleport, dan Suspense.
- Dalami pengujian dengan Vitest dan Vue Test Utils.
- Bangun aplikasi full-stack dengan menggabungkan Vue.js dengan framework backend seperti Express atau Laravel.
- Pelajari Panduan Praktik Terbaik Vue.js di perpustakaan ini untuk pola siap produksi.

## Kesimpulan

Anda telah melalui seluruh alur kerja membangun aplikasi Vue.js 3: pembuatan proyek dengan Vite, pemrograman reaktif dengan Composition API, desain komponen dengan SFC, routing dengan Vue Router, manajemen state dengan Pinia, dan pengambilan data API. Keterampilan ini membentuk fondasi untuk mengembangkan aplikasi frontend modern, mudah dipelihara, dan berperforma tinggi. Berlatihlah dengan membangun proyek-proyek kecil, secara bertahap menggabungkan fitur-fitur yang lebih canggih seperti TypeScript, pengujian, dan server-side rendering dengan Nuxt.

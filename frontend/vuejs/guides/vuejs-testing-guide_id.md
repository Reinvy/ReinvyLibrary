---
title: "Panduan Pengujian Vue.js"
description: "Panduan praktis tingkat lanjut untuk menguji aplikasi Vue.js 3: konfigurasi Vitest, pengujian unit komposable dan utilitas, pengujian interaksi komponen dengan Vue Test Utils, pengujian store Pinia dan Vue Router, strategi mocking dengan vi.mock dan MSW, pengujian end-to-end Playwright, serta ambang batas cakupan kode di CI."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Pengujian Vue.js

## Pendahuluan

Pengujian adalah jaring pengaman yang memungkinkan tim Vue.js melakukan refactoring secara agresif, merilis versi baru dengan percaya diri, dan mendokumentasikan perilaku yang diharapkan dalam bentuk kode yang dapat dieksekusi. Namun banyak proyek Vue berhenti pada satu tes asap atau mengandalkan QA manual sepenuhnya. Panduan ini menyajikan strategi pengujian berlapis yang lengkap untuk aplikasi Vue.js 3 yang dibangun dengan Vite, TypeScript, dan Pinia: pengujian unit untuk utilitas dan komposable, pengujian komponen yang berfokus pada interaksi dengan Vue Test Utils, pengujian store dan router, mock di batas sistem dengan `vi.mock` dan MSW, serta pengujian end-to-end tingkat peramban dengan Playwright. Setiap lapisan dijelaskan dengan contoh yang realistis dan dapat dijalankan, lalu dihubungkan ke pipeline CI dengan ambang batas cakupan kode. Tujuannya adalah rangkaian pengujian yang cepat, deterministik, dan benar-benar berguna — yang gagal karena alasan nyata, bukan karena detail implementasi yang rapuh.

## Praktik Terbaik

### 1. Ikuti Piramida Pengujian, Bukan Piramida Terbalik

Kode dasar Vue 3 yang sehat menghabiskan sebagian besar anggarannya untuk pengujian unit dan komponen yang cepat dan terisolasi, serta menyisakan sedikit pengujian peramban yang lambat untuk alur pengguna yang kritis. Rangkaian dengan puluhan skenario Playwright dan hampir tanpa pengujian unit akan lambat dijalankan, rawan flaky, dan mahal untuk dirawat di CI. Usahakan basis pengujian unit yang besar, lapisan tengah pengujian komponen dan store yang solid, serta lapisan atas E2E yang kecil dan terkurasi untuk alur login, checkout, dan alur yang sarat data.

### 2. Uji Perilaku, Bukan Detail Implementasi

Buat asersi pada apa yang diamati pengguna atau apa yang dikomunikasikan komponen ke dunia luar: teks yang dirender, event yang dipancarkan, perubahan kelas, dan keadaan DOM. Hindari membuat asersi pada ref internal, fungsi privat, atau urutan pemanggilan metode yang persis. Tes yang membaca `wrapper.vm.internalState` akan rusak pada setiap refactoring meskipun perilakunya benar; tes yang memeriksa `wrapper.text()` bertahan terhadap penataan ulang struktur. Cari elemen dengan cara pengguna mencarinya — berdasarkan peran, label, atau `data-testid` yang stabil — alih-alih rantai kelas CSS yang rapuh.

### 3. Jaga Pengujian Unit Bebas dari Mounting

Apa pun yang tidak menyentuh DOM termasuk dalam pengujian unit biasa tanpa Vue Test Utils. Fungsi murni, formatter, validator, pembantu tanggal, dan reducer store berjalan dengan kecepatan penuh tanpa pengaturan apa pun, sehingga rangkaian tetap cepat dan pesan kegagalan mudah dibaca. Memasang seluruh komponen hanya untuk menguji fungsi yang menerima objek dan mengembalikan string menambah milidetik runtime dan kopling tanpa manfaat apa pun.

### 4. Uji Komposable Melalui Komponen Host atau Konsumennya

Komposable mengekspos ref dan fungsi, sehingga sering kali dapat diuji secara langsung dalam blok `describe`/`it` biasa dengan memanggil pabriknya dan membaca `.value`. Jika komposable bergantung pada siklus hidup seperti `onMounted` atau reaktivitas template, pasang komponen fixture kecil yang mengonsumsinya di dalam `setup()` dan buat asersi melalui keluaran yang dirender. Ini menjaga tes tetap jujur terhadap cara komposable benar-benar digunakan.

### 5. Mock di Batas Sistem

Mock panggilan HTTP, timer, dan API peramban — jangan pernah mock kode yang sedang diuji. Tes komponen yang mem-mock komponen anaknya secara keseluruhan dapat lulus meskipun integrasinya rusak. Utamakan injeksi dependensi: kirim layanan melalui props, `provide`/`inject`, atau store Pinia, lalu ganti batas tersebut dengan fake. `vi.mock` untuk modul yang melakukan I/O (klien API, analitik, penyimpanan); MSW mencegat panggilan `fetch` asli di lapisan jaringan dan merupakan opsi paling realistis untuk pengujian komponen dan E2E.

### 6. Perlakukan Tes Komponen sebagai Tes Interaksi

Pasang komponen, simulasikan tindakan pengguna, lalu asersi akibatnya: klik memancarkan event, ketikan memperbarui nilai terikat, keadaan error merender pesan. Gunakan `await` setelah setiap interaksi agar antrean mikrotask Vue terkuras sebelum Anda membuat asersi, dan gunakan `flushPromises()` ketika komponen melakukan pekerjaan asinkron. Tes komponen yang hanya merender markup statis bernilai kecil — asersi yang menarik ada pada interaksinya.

### 7. Jaga Tes Tetap Deterministik

Timer asli dan panggilan jaringan asli membuat tes merah secara tidak menentu. Gunakan `vi.useFakeTimers()` untuk debounce dan polling, selalu pulihkan timer asli di `afterEach`, dan jangan pernah biarkan tes menyentuh API langsung. Tetapkan lingkungan: `jsdom` menyediakan `localStorage`, `navigator`, dan `document`, tetapi jika tes membutuhkan `IntersectionObserver` atau `ResizeObserver`, pasang mock kecil di file setup. Tes yang flaky lebih buruk daripada tidak ada tes karena melatih tim untuk mengabaikan build yang merah.

### 8. Gunakan Data dan Kasus Tepi yang Realistis

Payload contoh harus terlihat seperti data produksi: objek bersarang, string realistis, array kosong, dan respons error. Tes yang hanya menempuh jalur bahagia menyembunyikan cabang yang justru paling sering rusak. Untuk setiap komponen yang mengonsumsi API, tulis setidaknya tiga kasus: sukses, keadaan kosong, dan kegagalan. Untuk store, uji idempotensi — memanggil aksi yang sama dua kali tidak boleh menghitung ganda atau menggandakan state.

### 9. Cadangkan Tes E2E untuk Alur Bernilai Tinggi

Tes Playwright menjalankan peramban asli dan karena itu server asli: tes tersebut lambat dan secara alami lebih rapuh. Jaga rangkaian E2E tetap kecil dan fokus pada alur yang melintasi banyak halaman dan sistem — registrasi, checkout, pencarian hingga detail — dan serahkan sisanya ke lapisan yang lebih cepat. Jalankan E2E terhadap build produksi (`vite preview`) di CI, bukan server dev, untuk menangkap juga regresi waktu build.

### 10. Gerbang Merge dengan Cakupan dan Kualitas

Ambang batas cakupan mengubah pengujian dari sekadar pelengkap menjadi kontrak: gagalkan build ketika cakupan baris, cabang, fungsi, atau pernyataan turun di bawah angka yang disepakati. Terapkan minimum, tetapi jangan mengejar 100% — hasil yang semakin mengecil segera muncul pada template dan kode perancah. Padukan gerbang cakupan dengan kebijakan `retries` untuk E2E dan persyaratan lint yang bersih agar gerbang mengukur kualitas nyata, bukan keberuntungan CI.

## Langkah Implementasi

### Langkah 1: Buat Proyek dengan Pengujian yang Sudah Terpasang

Buat proyek Vue 3 dengan TypeScript, Router, Pinia, dan Vitest yang sudah terkonfigurasi:

```bash
npm create vue@latest my-app -- --typescript --router --pinia --vitest
cd my-app
npm install
npm run test
```

Perancah tersebut memasang `vitest`, `@vue/test-utils`, `jsdom`, dan `@vitest/coverage-v8`, serta menambahkan contoh tes komponen di bawah `src/components/__tests__/`. Verifikasi bahwa rangkaian berjalan sebelum menambahkan apa pun:

```bash
npm run test
```

### Langkah 2: Konfigurasi Vitest untuk Vue, jsdom, dan Cakupan

Sesuaikan `vitest.config.ts` untuk mendaftarkan plugin Vue, menggunakan lingkungan `jsdom`, mengarahkan cakupan ke `src`, dan menerapkan ambang batas:

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

Tambahkan file setup yang membersihkan setelah setiap tes agar komponen yang terpasang tidak pernah bocor antar kasus:

```typescript
// src/test/setup.ts
import { afterEach } from 'vitest'
import { cleanup } from '@vue/test-utils'

afterEach(() => {
  cleanup()
})
```

Definisikan skrip yang nyaman di `package.json`:

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

### Langkah 3: Uji Unit Utilitas dan Komposable

Mulai dari lapisan tercepat. Komposable penghitung sederhana:

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

Tesnya terbaca seperti spesifikasi dan tidak memasang apa pun:

```typescript
// src/composables/__tests__/useCounter.spec.ts
import { describe, expect, it } from 'vitest'
import { useCounter } from '../useCounter'

describe('useCounter', () => {
  it('dimulai dari nilai awal yang diberikan', () => {
    const { count, double } = useCounter(10)
    expect(count.value).toBe(10)
    expect(double.value).toBe(20)
  })

  it('menambah dan mengurangi sesuai langkah', () => {
    const { count, increment, decrement } = useCounter(0)
    increment(3)
    expect(count.value).toBe(3)
    decrement()
    expect(count.value).toBe(2)
  })

  it('kembali ke nilai awal', () => {
    const { count, increment, reset } = useCounter(5)
    increment(10)
    reset()
    expect(count.value).toBe(5)
  })
})
```

Untuk komposable yang digerakkan timer, gunakan jam tiruan. Pembantu nilai debounce:

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

  it('mempublikasikan nilai sumber hanya setelah penundaan berlalu', async () => {
    let value = 'pertama'
    const debounced = useDebouncedValue(() => value, 300)

    value = 'kedua'
    await nextTick()
    expect(debounced.value).toBe('pertama')

    vi.advanceTimersByTime(299)
    expect(debounced.value).toBe('pertama')

    vi.advanceTimersByTime(1)
    expect(debounced.value).toBe('kedua')
  })
})
```

### Langkah 4: Tulis Tes Interaksi Komponen

Pasang komponen, berinteraksi, dan buat asersi pada hasilnya. Tombol yang memancarkan jumlah:

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
    Tambah
  </button>
</template>
```

```typescript
// src/components/__tests__/CounterButton.spec.ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CounterButton from '../CounterButton.vue'

describe('CounterButton', () => {
  it('memancarkan step yang dikonfigurasi saat diklik', async () => {
    const wrapper = mount(CounterButton, {
      props: { step: 2 },
    })

    await wrapper.get('[data-testid="increment"]').trigger('click')

    expect(wrapper.emitted('increment')).toHaveLength(1)
    expect(wrapper.emitted('increment')?.[0]).toEqual([2])
  })

  it('memancarkan step 1 secara default', async () => {
    const wrapper = mount(CounterButton)

    await wrapper.get('[data-testid="increment"]').trigger('click')

    expect(wrapper.emitted('increment')?.[0]).toEqual([1])
  })
})
```

Komponen `v-model` yang menggunakan `defineModel`:

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
  it('mencerminkan nilai yang terikat', () => {
    const wrapper = mount(NameInput, { props: { modelValue: 'Adi' } })
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Adi')
  })

  it('memancarkan update:modelValue saat pengguna mengetik', async () => {
    const wrapper = mount(NameInput, { props: { modelValue: '' } })
    await wrapper.get('input').setValue('Sari')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Sari'])
  })
})
```

Komponen yang melakukan teleport ke `body` perlu target teleport-nya di-stub agar konten tetap berada di dalam wrapper:

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
  it('tidak merender apa pun saat tertutup', () => {
    const wrapper = mount(Modal, {
      props: { open: false },
      global: { stubs: stubTeleport },
    })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('merender konten slot saat terbuka', () => {
    const wrapper = mount(Modal, {
      props: { open: true },
      slots: {
        default: '<p>Isi modal</p>',
        header: '<h2>Konfirmasi tindakan</h2>',
      },
      global: { stubs: stubTeleport },
    })
    expect(wrapper.get('h2').text()).toBe('Konfirmasi tindakan')
    expect(wrapper.get('p').text()).toBe('Isi modal')
  })
})
```

### Langkah 5: Uji Store Pinia Secara Terisolasi

Store adalah logika biasa ditambah ref, jadi `setActivePinia(createPinia())` di `beforeEach` memberikan store baru kepada setiap tes. Store keranjang belanja:

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

describe('store keranjang', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('menambahkan item baru dengan kuantitas 1', () => {
    const store = useCartStore()
    store.addItem({ id: 'p1', name: 'Kaos Vue', price: 150000 })

    expect(store.items).toHaveLength(1)
    expect(store.totalItems).toBe(1)
    expect(store.totalPrice).toBe(150000)
  })

  it('menggabungkan duplikat dan menyesuaikan total', () => {
    const store = useCartStore()
    store.addItem({ id: 'p1', name: 'Kaos Vue', price: 150000 })
    store.addItem({ id: 'p1', name: 'Kaos Vue', price: 150000 })

    expect(store.items).toHaveLength(1)
    expect(store.items[0]?.quantity).toBe(2)
    expect(store.totalItems).toBe(2)
    expect(store.totalPrice).toBe(300000)
  })

  it('menghapus item', () => {
    const store = useCartStore()
    store.addItem({ id: 'p1', name: 'Kaos Vue', price: 150000 })
    store.removeItem('p1')

    expect(store.items).toHaveLength(0)
    expect(store.totalItems).toBe(0)
  })
})
```

### Langkah 6: Uji Navigasi dan Guard Router

Ekstrak guard menjadi fungsi biasa agar dapat diuji tanpa peramban. Utilitas guard sumber tunggal:

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

Uji melalui router asli menggunakan memori history:

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

describe('guard requireAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('mengarahkan pengguna anonim ke login dengan query redirect', async () => {
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

  it('mengizinkan pengguna yang sudah login lewat', async () => {
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

Perhatikan bahwa `beforeEach` diteruskan sebagai opsi router di Vue Router 4.3+, sehingga pendaftaran guard tetap eksplisit dan tes sepenuhnya independen dari instance router asli aplikasi.

### Langkah 7: Mock Panggilan API dengan vi.mock dan MSW

Komponen yang melakukan fetch saat mount membutuhkan respons yang deterministik. Pertama layanan:

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
    <p v-if="loading" data-testid="loading">Memuat produk…</p>
    <p v-else-if="error" data-testid="error">{{ error }}</p>
    <ul v-else>
      <li v-for="product in products" :key="product.id">{{ product.name }}</li>
    </ul>
  </div>
</template>
```

Mock modul di batas dengan `vi.mock` (dinaikkan ke atas import):

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
  it('merender produk setelah fetch berhasil', async () => {
    vi.mocked(fetchProducts).mockResolvedValue([
      { id: '1', name: 'Kaos Vue' },
      { id: '2', name: 'Mug Pinia' },
    ])

    const wrapper = mount(ProductsList)
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Kaos Vue')
  })

  it('merender pesan error saat permintaan gagal', async () => {
    vi.mocked(fetchProducts).mockRejectedValue(new Error('Network error'))

    const wrapper = mount(ProductsList)
    await flushPromises()

    expect(wrapper.get('[data-testid="error"]').text()).toBe('Network error')
  })

  it('merender daftar kosong untuk respons kosong', async () => {
    vi.mocked(fetchProducts).mockResolvedValue([])

    const wrapper = mount(ProductsList)
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(0)
  })
})
```

Untuk tes yang harus menjalankan pipeline `fetch` yang sebenarnya, jalankan MSW sebagai server Node di setup Vitest:

```typescript
// src/test/msw.ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const handlers = [
  http.get('/api/products', () =>
    HttpResponse.json([
      { id: '1', name: 'Kaos Vue' },
      { id: '2', name: 'Mug Pinia' },
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

Utamakan MSW ketika komponen yang diuji atau dependensinya memanggil `fetch` secara langsung; utamakan `vi.mock` ketika Anda menginginkan kendali bedah atas satu modul layanan.

### Langkah 8: Tambahkan Tes End-to-End Playwright

Pasang Playwright dan perambannya, lalu konfigurasikan agar berjalan melawan server dev:

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

Tes alur yang melintasi navigasi dan state:

```typescript
// e2e/checkout.spec.ts
import { expect, test } from '@playwright/test'

test('menambahkan produk ke keranjang dan mencapai checkout', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Tambah ke keranjang' }).first().click()

  const cartCount = page.locator('[data-testid="cart-count"]')
  await expect(cartCount).toHaveText('1')

  await page.getByRole('link', { name: 'Keranjang' }).click()
  await expect(page.getByRole('heading', { name: 'Keranjang' })).toBeVisible()

  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page).toHaveURL(/\/checkout/)
})
```

Asersi menggunakan fitur auto-wait bawaan Playwright (`toHaveText`, `toBeVisible`) alih-alih tidur `waitForTimeout` yang tetap — tes berlanjut segera setelah UI mencapai keadaan yang diharapkan, sehingga rangkaian tetap cepat dan stabil.

### Langkah 9: Hubungkan Tes ke CI dengan Gerbang Cakupan

Workflow GitHub Actions yang menjalankan lapisan cepat lebih dulu dan rangkaian peramban kedua:

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
      # Gagalkan build ketika cakupan turun di bawah ambang batas yang dikonfigurasi
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

Tips lanjutan untuk menjaga pipeline tetap hijau:

- Unggah `coverage/lcov.info` sebagai artefak agar PR dapat menampilkan perbedaan cakupan, atau dorong ke layanan cakupan.
- Cache peramban Playwright dengan `actions/cache` yang dikunci pada versi Playwright untuk menghemat menit CI.
- Jalankan E2E di job lingkungan `staging` untuk rangkaian yang lama, jaga pipeline utama di bawah sepuluh menit.
- Pecah proyek E2E menjadi `chromium` saja pada pull request dan matriks peramban penuh pada merge ke `development`.

## Langkah Berikutnya

Pengujian adalah kebiasaan sekaligus teknik. Setelah pipeline di atas hijau, perdalam rangkaian dengan menulis tes berbasis properti untuk reducer dan formatter, menambahkan pemeriksaan regresi visual untuk komponen design system, dan mengadopsi mutation testing untuk menemukan asersi yang tidak pernah gagal. Latih skenario dunia nyata: pengguna yang mengklik dua kali tombol submit, API lambat yang timeout, aplikasi offline-first yang antreannya harus mencoba ulang. Untuk tim, sepakati ritme red-green-refactor dan anggaran cakupan, serta perlakukan tes flaky sebagai bug kelas satu alih-alih mengabaikannya.

## Kesimpulan

Panduan ini menelusuri tangga pengujian Vue.js 3 yang lengkap: pengujian unit yang cepat untuk utilitas dan komposable, tes komponen yang berfokus pada interaksi dengan Vue Test Utils, tes store Pinia yang terisolasi, navigasi router dengan guard yang diuji, mocking di batas dengan `vi.mock` dan MSW, alur end-to-end Playwright, serta pipeline CI dengan gerbang cakupan. Setiap lapisan memiliki peran yang berbeda, dan bersama-sama mereka memungkinkan tim melakukan refactoring dengan percaya diri dan merilis fitur tanpa kecemasan regresi. Terapkan piramida, mock di batas, dan jaga setiap tes tetap deterministik — rangkaian akan membayar dirinya sendiri pada refactoring besar pertama.

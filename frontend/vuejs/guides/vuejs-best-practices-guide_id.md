---
title: "Panduan Praktik Terbaik Vue.js"
description: "Panduan komprehensif tentang struktur folder, Composition API vs Options API, integrasi TypeScript, pola composables, strategi pengujian, store Pinia, optimasi performa, aksesibilitas, i18n, keamanan, CI/CD, dan Docker untuk pengembangan Vue.js."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Praktik Terbaik Vue.js

## Pendahuluan

Panduan ini mengonsolidasikan praktik terbaik yang terbukti di industri untuk membangun aplikasi Vue.js 3 tingkat produksi. Ini mencakup keputusan arsitektur, organisasi proyek, konvensi penulisan kode, strategi pengujian, optimasi performa, aksesibilitas, internasionalisasi, pengamanan keamanan, dan pipeline deployment. Baik Anda memulai proyek baru atau merefaktor proyek yang sudah ada, mengikuti panduan ini akan membantu Anda mempertahankan basis kode yang skalabel, berperforma tinggi, dan mudah dipelihara. Rekomendasi disesuaikan untuk Vue.js 3 dengan Composition API, TypeScript, Vite, Pinia, dan Vue Router.

## Praktik Terbaik

### Struktur Folder (Berbasis Fitur)

Gunakan struktur folder berbasis fitur (domain-centric) di dalam `src/` daripada struktur datar berbasis tipe file. Ini membuat kode terkait tetap berada di satu tempat dan memudahkan navigasi proyek besar.

```text
src/
├── assets/               # Aset statis (gambar, font)
├── components/           # Komponen bersama yang dapat digunakan ulang
│   ├── base/             # Komponen UI primitif (tombol, input)
│   └── shared/           # Komponen bersama yang tidak terkait domain
├── composables/          # Fungsi Composition API yang dapat digunakan ulang
├── layouts/              # Komponen layout
├── modules/              # Modul fitur (domain-driven)
│   ├── auth/             # Fitur autentikasi
│   │   ├── components/   # Komponen spesifik auth
│   │   ├── composables/  # Logika spesifik auth
│   │   ├── stores/       # Store Pinia auth
│   │   └── views/        # Halaman auth
│   └── products/         # Fitur produk
│       └── ...
├── router/               # Konfigurasi Vue Router
├── stores/               # Store Pinia global
├── utils/                # Fungsi utilitas murni
├── types/                # Definisi tipe TypeScript
└── views/                # View rute tingkat atas
```

### Composition API vs Options API

**Rekomendasi**: Gunakan Composition API (dengan `<script setup>`) untuk semua komponen baru.

| Aspek | Composition API | Options API |
|-------|----------------|-------------|
| Penggunaan ulang logika | Composables (fungsi) | Mixins (konflik penamaan) |
| TypeScript | Inferensi sangat baik | Inferensi terbatas |
| Organisasi kode | Kelompokkan berdasarkan fitur | Kelompokkan berdasarkan tipe opsi |
| Tree-shaking | Lebih baik | Kurang baik |
| Kurva pembelajaran | Lebih curam di awal | Landai |

Gunakan Options API hanya untuk basis kode lama atau komponen yang sangat sederhana di mana overhead Composition API tidak diperlukan.

### TypeScript dengan Vue

Selalu aktifkan TypeScript saat membuat proyek Vue baru. Ini memberikan penangkapan error pada waktu kompilasi, dukungan IDE yang lebih baik, dan kode yang mendokumentasikan dirinya sendiri.

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

### Pola Composables yang Dapat Digunakan Ulang

Ekstrak logika yang dapat digunakan ulang ke dalam fungsi composable. Composables adalah padanan React hooks di Composition API.

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

### Strategi Pengujian

Gunakan pendekatan pengujian berlapis:

1. **Unit Test (Vitest + Vue Test Utils)** — Uji composables individual, store, fungsi utilitas, dan perilaku komponen (props, emits, slots, reaktivitas). Mock dependensi eksternal (panggilan API, router).
2. **Component Test (Vitest + Vue Test Utils)** — Mount komponen dengan `mount()` dan assert output yang dirender, interaksi, dan event yang dipancarkan.
3. **Integration Test (Vitest)** — Uji alur kerja fitur di beberapa komponen dan store.
4. **End-to-End Test (Playwright)** — Uji alur pengguna kritis di browser nyata: login, operasi CRUD, navigasi.

```javascript
// Contoh: test store
import { setActivePinia, createPinia } from 'pinia'
import { useCounterStore } from '@/stores/counter'

describe('Counter Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('menambah count', () => {
    const store = useCounterStore()
    store.increment()
    expect(store.count).toBe(1)
  })
})
```

### Store Pinia (Setup Stores)

Gunakan setup stores (gaya Composition API) daripada options stores untuk dukungan TypeScript dan fleksibilitas yang lebih baik.

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

### Optimasi Performa

- **Lazy loading**: Gunakan `defineAsyncComponent` atau dynamic imports di rute untuk code-split pada batas komponen.
- **KeepAlive**: Bungkus komponen dinamis atau view rute dengan `<KeepAlive>` untuk mempertahankan state saat berpindah.
- **Suspense**: Gunakan `<Suspense>` untuk menangani dependensi asinkron dengan baik dan menampilkan konten fallback.
- **Memoization**: Gunakan `computed` untuk derivasi mahal dan `v-memo` untuk daftar statis besar.
- **Virtual scrolling**: Gunakan `vue-virtual-scroller` untuk daftar dengan ribuan item.
- **Delegasi event**: Lampirkan event ke elemen induk daripada anak individual jika memungkinkan.
- **v-once**: Untuk konten statis yang tidak pernah berubah, gunakan `v-once` untuk melewati re-render.

```vue
<!-- Lazy load komponen berat -->
<script setup>
import { defineAsyncComponent } from 'vue'
const HeavyChart = defineAsyncComponent(() => import('@/components/HeavyChart.vue'))
</script>

<!-- KeepAlive untuk view tab -->
<KeepAlive>
  <component :is="currentTab" />
</KeepAlive>
```

### Aksesibilitas (A11y)

- Gunakan elemen HTML semantik (`<button>`, `<nav>`, `<main>`, `<header>`, `<footer>`).
- Tambahkan atribut `aria-*` untuk konten dinamis (misalnya, `aria-live="polite"` untuk state loading).
- Pastikan semua elemen interaktif dapat diakses dengan keyboard (manajemen fokus dengan `tabindex` dan `@keydown`).
- Gunakan `vue-announcer` atau berikan pengumuman screen reader untuk perubahan rute dan pembaruan asinkron.
- Uji dengan axe-core (`@axe-core/playwright`) di CI.
- Pertahankan rasio kontras warna minimum 4.5:1 untuk teks.

### Internasionalisasi (i18n) dengan vue-i18n

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

// Di komponen
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()
// Template: {{ t('greeting', { name: 'Alice' }) }}
```

### Keamanan (Pencegahan XSS, CSP)

- **Jangan gunakan `v-html` dengan konten buatan pengguna**. Jika harus, sanitasi dengan DOMPurify.
- **Setel header Content Security Policy (CSP)** untuk membatasi sumber script.
- **Hindari `innerHTML` dan `document.write`** dan gunakan sistem template Vue.
- **Validasi semua input pengguna** di sisi klien dan server.
- **Gunakan HTTPS** untuk semua panggilan API.
- **Simpan data sensitif (token)** di httpOnly cookies, bukan di Pinia atau localStorage.
- **Sanitasi URL** saat menggunakan binding `:href` dinamis untuk mencegah injeksi protokol `javascript:`.

```vue
<!-- Aman: Vue melakukan escape pada interpolasi -->
<p>{{ userInput }}</p>

<!-- Berbahaya: Hanya dengan konten yang sudah disanitasi -->
<div v-html="sanitizedHtml"></div>

<script>
import DOMPurify from 'dompurify'
const sanitizedHtml = DOMPurify.sanitize(userInput)
</script>
```

### CI/CD (GitHub Actions, Deployment Vercel/Netlify)

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
      # Deploy ke Netlify atau Vercel
      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: './dist'
          production-branch: main
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Docker untuk Pengembangan

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

## Langkah Implementasi

### Langkah 1: Inisialisasi Proyek

```bash
npm create vue@latest my-app -- --typescript --router --pinia --vitest
cd my-app
npm install
npm install axios @vueuse/core vue-i18n
```

Aktifkan mode strict TypeScript di `tsconfig.json` dan atur ESLint dengan aturan yang direkomendasikan Vue 3.

### Langkah 2: Buat Struktur Folder

Buat struktur direktori berbasis fitur. Definisikan antarmuka tipe di `src/types/`. Atur store Pinia di `src/stores/` dan konfigurasi rute di `src/router/`.

### Langkah 3: Implementasi Arsitektur Inti

- Konfigurasi router dengan rute lazy-loaded dan navigation guards.
- Atur Pinia dengan dukungan plugin (persist state jika perlu).
- Buat komponen dasar yang dapat digunakan ulang (BaseButton, BaseInput, BaseModal) di `src/components/base/`.
- Implementasi sistem tema/layout menggunakan layout dan properti CSS kustom.

### Langkah 4: Bangun Modul Fitur

Untuk setiap fitur (auth, products, settings), buat modul di `src/modules/` dengan komponen, composables, store, dan view sendiri. Gunakan pola `provide/inject` untuk masalah lintas sektor.

### Langkah 5: Tambahkan i18n dan A11y

Konfigurasi `vue-i18n` dengan pesan lokal yang di-lazy-load. Tambahkan atribut `aria-*` dan navigasi keyboard. Jalankan audit aksesibilitas dengan axe.

### Langkah 6: Tulis Pengujian

Tulis unit test untuk store dan composables terlebih dahulu, kemudian component test untuk komponen UI kritis, dan akhirnya E2E test untuk perjalanan pengguna utama.

### Langkah 7: Audit Performa

Jalankan audit Lighthouse, analisis ukuran bundle dengan `vite-plugin-inspect`, implementasikan lazy loading di tempat yang diperlukan, dan tambahkan virtual scrolling untuk daftar besar.

### Langkah 8: Konfigurasi CI/CD

Atur GitHub Actions untuk linting, pengujian, dan building. Konfigurasi deployment ke Vercel atau Netlify dengan environment variables. Tambahkan dukungan Docker untuk konsistensi pengembangan lokal.

### Langkah 9: Pengamanan Keamanan

Tambahkan header CSP di produksi, sanitasi penggunaan `v-html` dengan DOMPurify, validasi input, dan pastikan semua URL eksternal divalidasi.

### Langkah 10: Dokumentasi dan Monitoring

Tambahkan komentar JSDoc ke composables dan store. Atur pemantauan error dengan Sentry atau sejenisnya. Dokumentasikan keputusan arsitektur di README proyek.

---
title: "Membangun Toko E-Commerce dengan Vue 3 dan Pinia"
description: "Tutorial lanjutan untuk membangun toko e-commerce siap produksi dengan Vue 3 dan Pinia — katalog produk, arsitektur state keranjang, alur checkout, pembaruan optimistis, dan persistensi."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Toko E-Commerce dengan Vue 3 dan Pinia

## Ringkasan

Tutorial ini memandu Anda membangun toko e-commerce lengkap dengan Vue 3 dan Pinia. Anda akan merancang arsitektur state modular dengan store khusus untuk katalog produk, keranjang belanja, dan alur checkout, lalu menghubungkannya ke seperangkat komponen Vue yang didukung Vue Router. Di sepanjang proses, Anda akan menerapkan total turunan (derived totals) dengan getter, pembaruan jumlah yang sadar stok, operasi keranjang optimistis dengan rollback, serta plugin persistensi yang menjaga keranjang tetap hidup saat halaman dimuat ulang. Hasil akhirnya adalah storefront kecil namun berbentuk produksi: daftar produk dengan filter kategori, halaman detail produk, drawer keranjang yang muncul dari sisi layar, dan halaman checkout bertahap.

## Target Audiens

- Pengembang frontend yang ingin melihat bagaimana aplikasi Vue dunia nyata disusun di sekitar Pinia.
- Pengembang Vue yang beralih dari demo satu halaman ke aplikasi multi-store dengan state turunan yang kompleks.
- Ekspektasi tingkat kemampuan pembaca: mahir — nyaman dengan Composition API, `<script setup>`, dan Vue Router.

## Prasyarat

- Pengetahuan solid tentang dasar-dasar Vue 3, termasuk Composition API, `ref`, `computed`, dan single-file component.
- Familiar dengan dasar-dasar Pinia (membuat store, `storeToRefs`, getter, action).
- Node.js 18+ dan npm atau pnpm terinstal, plus alat scaffolding Vue CLI atau Vite.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Merancang arsitektur Pinia multi-store di mana setiap store memiliki satu slice state aplikasi yang terdefinisi dengan jelas.
- Memodelkan data turunan (total keranjang, jumlah item, ketersediaan stok) dengan getter, bukan menduplikasi nilai di dalam state.
- Membangun alur checkout yang memvalidasi formulir pengiriman, mengirim pesanan, dan mengosongkan keranjang hanya setelah sukses.
- Menambahkan persistensi dan rehidrasi dengan plugin Pinia kustom, termasuk version key untuk membatalkan cache usang.
- Menerapkan pembaruan keranjang optimistis dengan rollback yang aman ketika operasi jaringan gagal.
- Menyusun route dan komponen di sekitar store sehingga view tetap tipis dan logika tetap mudah diuji.

## Konteks dan Motivasi

E-commerce adalah salah satu aplikasi Vue paling umum di dunia nyata dan sekaligus guru terbaik untuk manajemen state. Storefront memiliki beberapa slice state yang saling berinteraksi — produk, keranjang, checkout — yang berubah pada kecepatan berbeda dan memiliki kebutuhan persistensi berbeda. Produk diambil sekali lalu umumnya tetap; keranjang terus-menerus dimutasi dan harus bertahan saat halaman dimuat ulang; formulir checkout bersifat sementara tetapi bergantung pada isi keranjang. Menaruh semuanya secara naif ke dalam state komponen akan memunculkan prop drilling, total yang terduplikasi, dan data keranjang yang hilang saat refresh.

Model store Pinia cocok secara natural dengan masalah ini: setiap store membungkus satu slice, getter menghitung nilai turunan dari satu sumber kebenaran, dan plugin memperluas store dengan perhatian lintas-potong seperti persistensi. Di akhir tutorial ini, Anda akan menginternalisasi arsitektur state yang berskala dari storefront kecil hingga katalog besar dengan puluhan modul — model mental yang sama dipakai toko-toko Vue produksi.

## Konten Inti

### Ringkasan Proyek dan Struktur Direktori

Storefront memiliki empat layar: daftar produk dengan filter kategori, halaman detail produk, halaman checkout, plus drawer keranjang global yang menimpa layar apa pun. Data berasal dari mock API kecil (`products.json`) yang disajikan Vite saat pengembangan, sehingga tidak diperlukan backend.

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

Aturan arsitektur utamanya: **view menampilkan dan mengambil data, store memiliki dan memutasi, komponen memancarkan niat pengguna**. `CatalogView` membaca dari store produk, `ProductCard` memancarkan `add-to-cart`, dan `CartDrawer` merender getter store keranjang.

### Merancang Model State

Tiga store membagi state aplikasi dengan rapi:

- `useProductsStore` — katalog: daftar produk, filter kategori, state loading dan error. Store ini diambil sekali dan sengaja bersifat read-mostly.
- `useCartStore` — keranjang: peta ID produk ke jumlah, plus setiap angka turunan yang dibutuhkan UI (jumlah item, subtotal, ongkir, total). Ini store yang paling sering dimutasi dan yang paling membutuhkan persistensi.
- `useCheckoutStore` — checkout: field formulir pengiriman, state validasi, dan status pengiriman pesanan.

Gunakan `defineStore` gaya setup agar body store terbaca seperti komponen Composition API:

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

Perhatikan bahwa `filteredProducts` dan `categories` adalah properti computed, bukan nilai tersimpan. Jika produk ditambahkan atau filter berubah, getter menghitung ulang secara otomatis dan tidak ada bagian aplikasi yang bisa lupa menyinkronkannya.

### Modul Katalog Produk

Katalog adalah pintu masuk storefront. Saat mount, aplikasi mengambil daftar produk sekali; filter kategori adalah urusan sisi klien berkat getter `filteredProducts`. Pola yang patut ditiru untuk daftar berbasis server: flag `loading`, pesan `error`, dan satu action `fetch` yang selalu membersihkan `loading` di blok `finally` — ini menjaga UI tetap responsif dan tidak pernah membuat spinner macet.

### Modul Keranjang

Store keranjang adalah jantung aplikasi. Store ini menyimpan peta `Record<productId, quantity>` yang ringkas sekaligus mudah dipersist:

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

Tiga detail membuat store ini siap produksi. Pertama, semua total adalah getter di atas satu sumber kebenaran `quantities`, sehingga UI tidak mungkin menampilkan subtotal yang berbeda dari baris item. Kedua, `addToCart` dan `updateQuantity` membatasi nilai ke `product.stock`, yang mencegah overselling akibat klik ganda atau UI yang basi. Ketiga, `removeFromCart` menetapkan ulang objek agar reaktivitas `ref` tetap terpicu walau operasinya adalah penghapusan properti.

### Alur Checkout dan Pengiriman Pesanan

Store checkout memiliki siklus hidup formulir. Store ini menyimpan field pengiriman, peta error per field, dan `status` yang bergerak melalui `idle → submitting → success → error`. Payload pesanan disusun dari store keranjang saat pengiriman, yang menjaga kedua store tetap terpisah:

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

Aturan kritis di `submitOrder`: keranjang dikosongkan **hanya setelah** panggilan jaringan sukses. Mengosongkan lebih dulu akan menghilangkan data pesanan pengguna jika permintaan gagal dan pengguna harus mencoba lagi.

### Persistensi dan Rehidrasi dengan Plugin Pinia

Storefront yang kehilangan keranjang saat refresh membuat pengguna frustrasi. Plugin Pinia dapat membungkus setiap store dan menambahkan perilaku; pendekatan terbersih adalah plugin kecil yang berlangganan perubahan state dan hanya menulis store yang ditandai untuk persistensi:

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
      // penyimpanan korup — mulai dengan keranjang kosong
    }
  }

  store.$subscribe((_mutation, state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, quantities: state.quantities }))
  })
}
```

Version key adalah bagian yang paling sering dihilangkan tutorial lain. Ketika Anda mengubah skema keranjang di rilis mendatang — misalnya menambahkan field mata uang — payload lama yang dipersist akan direhidrasi ke store yang tidak lagi memahaminya. Menaikkan `VERSION` dengan diam-diam membuang cache usang alih-alih membuat aplikasi crash.

### Pembaruan Optimistis dan Penanganan Error

Menambahkan item ke keranjang terasa instan karena merupakan mutasi lokal. Storefront sungguhan sering memesan stok atau memperbarui keranjang di sisi server, yang lebih lambat; teknik standarnya adalah **pembaruan optimistis**: terapkan perubahan lokal segera, lalu rollback jika permintaan gagal. Rollback harus memulihkan nilai sebelumnya yang persis, jadi tangkap nilainya sebelum memutasi:

```javascript
// src/stores/cart.js (tambahan)
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

Batasi klik ganda yang cepat dengan melacak `pending` dan melewati sinkronisasi baru selama masih ada yang berjalan. Padukan dengan komponen `ToastList` yang menampilkan pesan sukses saat `addToCart` dan toast error ketika rollback terjadi — pengguna tidak boleh ragu apakah aksinya berhasil.

### Integrasi Komponen dan Routing

Dengan store yang sudah ada, komponen tetap tipis. Router memetakan tiga view, dan `App.vue` menampung `CartDrawer` global melalui `Teleport` sehingga bisa menimpa route mana pun:

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
<!-- src/components/CartDrawer.vue (cuplikan template) -->
<Teleport to="body">
  <Transition name="drawer">
    <aside v-if="open" class="cart-drawer">
      <header>
        <h2>Keranjang Anda ({{ cart.itemCount }})</h2>
        <button @click="open = false" aria-label="Tutup keranjang">×</button>
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
        <p>Ongkir: {{ cart.shipping === 0 ? 'Gratis' : `$${cart.shipping.toFixed(2)}` }}</p>
        <p>Total: <strong>${{ cart.total.toFixed(2) }}</strong></p>
        <RouterLink to="/checkout" @click="open = false">Lanjut ke Checkout</RouterLink>
      </footer>
    </aside>
  </Transition>
</Teleport>
```

Drawer menggunakan `storeToRefs` untuk getter reaktif, `Transition` untuk animasi slide-in, dan `RouterLink` untuk navigasi. Setiap mutasi yang dilakukan drawer berasal dari action store keranjang — komponen tidak pernah menyentuh `quantities` secara langsung.

## Contoh Kode

### Store Produk Lengkap dengan Filter

```javascript
// src/stores/products.js — lengkap
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

### Contoh Payload Produk

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

### Komponen Kartu Produk

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
    <p>${{ product.price.toFixed(2) }} · {{ product.stock }} tersedia</p>
    <button :disabled="product.stock === 0" @click="cart.addToCart(product.id)">
      {{ product.stock === 0 ? 'Stok habis' : 'Tambahkan ke Keranjang' }}
    </button>
  </article>
</template>
```

### Bootstrap Aplikasi dengan Plugin Persistensi

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

## Insight Penting

- **Satu store, satu slice state**: produk memiliki data katalog, keranjang memiliki jumlah, checkout memiliki formulir. Pembacaan lintas-store melewati getter (keranjang membaca harga produk dari store produk) alih-alih menduplikasi data.
- **Nilai turunan milik getter**: jumlah item, subtotal, ongkir, dan total adalah properti computed di atas satu sumber kebenaran. Menduplikasinya di state adalah sumber bug UI basi yang paling umum.
- **Kosongkan state hanya setelah sukses**: dalam alur asinkron, mutasi state lokal secara optimistis tetapi persistenkan atau kosongkan state jarak jauh hanya setelah panggilan jaringan mengonfirmasi. Keranjang yang dikosongkan sebelum pesanan sukses akan kehilangan data pelanggan saat percobaan ulang.
- **Berikan versi pada state yang dipersist**: version key dalam payload penyimpanan memungkinkan Anda membatalkan cache lama ketika skema store berubah. Tanpa itu, payload basi membuat store hasil rehidrasi crash atau korup.
- **Clamping stok lebih baik daripada percaya**: batasi setiap perubahan jumlah terhadap `product.stock` di store, bukan di komponen. Guard UI bisa dilewati oleh klik ganda dan render basi; guard store tidak bisa.
- **Getter itu murah, tetapi perhatikan daftar besar**: untuk katalog dengan ribuan produk, pertimbangkan `shallowRef` untuk array produk agar reaktivitas dalam tidak dibuat untuk data yang diambil sekali dan diganti sekaligus.

## Langkah Berikutnya

- Tambahkan payment gateway sungguhan: ganti POST pesanan mock dengan Stripe Payment Intents atau sesi checkout sisi server.
- Jelajahi server-side rendering dengan Nuxt 3 agar katalog ramah SEO dan terhidrasi dari server.
- Pelajari panduan Optimasi Performa Vue.js untuk memprofil dan menyetel rendering storefront.
- Tulis tes untuk store dengan Vitest — desain store modular membuat pengujian logika keranjang menjadi trivial.

## Kesimpulan

Anda telah membangun storefront yang kompleksitasnya berada di tiga store Pinia yang fokus, bukan di state komponen yang tersebar. Store katalog menunjukkan pola fetch read-mostly dengan filter sisi klien; store keranjang menunjukkan bagaimana getter mengubah satu peta jumlah menjadi setiap angka yang dibutuhkan UI; dan store checkout membuktikan bahwa alur asinkron milik action, dengan state yang dikosongkan hanya setelah sukses. Plugin persistensi dan rollback optimistis mengubah demo menjadi aplikasi berbentuk produksi. Arsitektur ini — view tipis, store ekspresif, getter turunan, perhatian lintas-potong berbasis plugin — adalah bentuk yang sama dipakai aplikasi Vue besar, dan akan melayani Anda jauh melampaui e-commerce.

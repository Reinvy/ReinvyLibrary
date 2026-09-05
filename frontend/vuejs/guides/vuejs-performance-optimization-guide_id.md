---
title: "Panduan Optimasi Performa Vue.js"
description: "Panduan komprehensif untuk mengukur dan meningkatkan performa aplikasi Vue.js 3: pengurangan ukuran bundle, pemecahan kode, optimasi reaktivitas, efisiensi rendering, pengiriman aset, dan profiling runtime."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Optimasi Performa Vue.js

## Pendahuluan

Vue.js 3 hadir dengan sistem reaktivitas yang sangat efisien dan kompiler virtual DOM yang cepat sejak awal. Untuk sebagian besar aplikasi, pengaturan bawaan sudah cukup. Namun, seiring pertumbuhan aplikasi — semakin banyak rute, pohon komponen yang lebih besar, kumpulan data yang lebih besar, dependensi pihak ketiga yang lebih kaya — hambatan performa mulai muncul di tempat-tempat yang dapat diprediksi: bundle yang terlalu besar, render ulang yang tidak perlu, objek reaktif yang mahal, dan pekerjaan berat yang berjalan di thread utama.

Panduan ini menggunakan pendekatan berbasis pengukuran untuk performa Vue.js. Panduan ini mencakup dua sisi performa aplikasi: **performa pemuatan** (ukuran bundle, pemecahan kode, pengiriman aset) dan **performa runtime** (overhead reaktivitas, efisiensi render, task yang panjang). Setiap praktik terbaik disertai kode konkret yang dapat langsung Anda terapkan, dan langkah-langkah implementasi memandu Anda melalui alur kerja optimasi lengkap dari baseline hingga pemantauan berkelanjutan. Rekomendasi ini ditujukan untuk Vue.js 3 dengan Composition API, Vite, Pinia, dan Vue Router.

## Praktik Terbaik

### 1. Ukur Sebelum Mengoptimalkan

Optimasi tanpa pengukuran hanyalah tebakan. Tetapkan baseline terlebih dahulu agar setiap perubahan terbukti manfaatnya.

- Jalankan Lighthouse terhadap build produksi, bukan server dev — build dev menyertakan overhead tambahan yang tidak mencerminkan kondisi nyata.
- Gunakan tab **Performance pada Vue Devtools** untuk merekam waktu render komponen dan mengidentifikasi komponen yang paling sering di-render ulang.
- Gunakan panel **Performance pada Chrome DevTools** untuk merekam aktivitas runtime dan mencari long task, layout thrash, serta garbage collection yang berlebihan.
- Analisis bundle produksi dengan `vite-bundle-visualizer` atau `rollup-plugin-visualizer` untuk melihat secara pasti dependensi mana yang menyumbang byte terbanyak.

### 2. Kurangi Ukuran Bundle dari Sumbernya

Bundle yang lebih kecil lebih cepat diunduh, diurai, dan dieksekusi. Kemenangan performa termurah datang dari membuang hal-hal yang seharusnya tidak pernah dikirim.

- Utamakan build ESM yang dapat di-tree-shaking dari pustaka: impor dari `lodash-es` alih-alih `lodash`, dan impor hanya fungsi yang Anda gunakan.
- Ganti pustaka tanggal yang berat (`moment`) dengan alternatif yang lebih ringan (`dayjs` atau API `Intl` bawaan).
- Impor ikon satu per satu (misalnya dengan `unplugin-icons` atau `unplugin-vue-components`) alih-alih menggabungkan seluruh set ikon.
- Perhatikan dependensi transitif — utilitas kecil dapat menyeret pohon dependensi yang besar. `npm why <package>` mengungkap siapa yang menarik sebuah paket.

```bash
# Visualisasikan bundle produksi untuk menemukan titik terbesar
npm install -D vite-bundle-visualizer
npx vite-bundle-visualizer

# Cari tahu paket mana yang menarik dependensi berat
npm why moment
```

### 3. Pecah Kode di Tingkat Rute

Pemecahan kode di tingkat rute adalah optimasi pemuatan dengan dampak tertinggi untuk aplikasi multi-halaman. Setiap chunk rute hanya dimuat saat pengguna mengunjungi rute tersebut.

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

Sintaks `import()` dinamis memberi tahu Vite untuk menghasilkan chunk terpisah per rute. Bundle awal hanya berisi kode yang dibutuhkan untuk layar pertama.

### 4. Muat Malas Komponen Berat dengan `defineAsyncComponent`

Tidak semua komponen harus masuk ke bundle awal. Modal, editor, grafik, dan komponen lain di bawah lipatan sebaiknya dimuat sesuai permintaan. `defineAsyncComponent` memberi Anda state loading dan error secara gratis.

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

// Dimuat hanya saat komponen pertama kali dirender
const MarkdownEditor = defineAsyncComponent(() =>
  import('@/components/MarkdownEditor.vue')
)

// Dengan penanganan loading dan error yang eksplisit
const DataChart = defineAsyncComponent({
  loader: () => import('@/components/DataChart.vue'),
  loadingComponent: () => import('@/components/ChartSkeleton.vue'),
  delay: 200,          // Tampilkan komponen loading hanya setelah 200ms
  timeout: 10_000      // Tampilkan komponen error setelah 10 detik
})
</script>

<template>
  <MarkdownEditor v-if="editing" />
  <DataChart :data="series" />
</template>
```

Kombinasikan `defineAsyncComponent` dengan `v-if` (atau tag `component` dinamis) agar komponen berat hanya dibuat saat benar-benar dibutuhkan.

### 5. Persempit Cakupan Reaktivitas

Reaktivitas memiliki biaya: setiap objek reaktif dibungkus proxy, dan setiap pembacaan dilacak. Untuk struktur data besar yang sering diakses, reaktivitas penuh dapat mendominasi anggaran render.

- Gunakan `shallowRef` dan `shallowReactive` untuk objek besar yang hanya tingkat teratasnya perlu reaktif (misalnya, objek konfigurasi atau dokumen besar yang diganti secara keseluruhan).
- Gunakan `markRaw` untuk objek yang tidak boleh reaktif: instance kelas, objek pustaka pihak ketiga, dan data yang tidak berubah.
- Gunakan `Object.freeze` (atau `readonly`) untuk data statis murni agar Vue melewati pembungkusan proxy sepenuhnya.

```typescript
import { shallowRef, markRaw, readonly } from 'vue'

// Tabel pencarian statis yang besar — tidak pernah butuh reaktivitas dalam
const countryList = readonly([
  { code: 'ID', name: 'Indonesia' },
  { code: 'US', name: 'Amerika Serikat' }
  // ...ratusan entri lainnya
])

// Instance kelas berat yang tidak boleh di-proxy oleh Vue
const engine = markRaw(new PdfEngine())

// Hanya referensinya yang reaktif; dokumen bersarang diganti utuh
const currentDocument = shallowRef<DocumentModel | null>(null)

function openDocument(doc: DocumentModel) {
  currentDocument.value = doc
}
```

Aturan praktis: jadikan sesuatu reaktif hanya jika template atau computed benar-benar bergantung pada perubahannya.

### 6. Memoisasi Derivasi yang Mahal

Nilai `computed` di-cache berdasarkan dependensi reaktifnya — hanya dievaluasi ulang saat dependensi berubah. Gunakan computed alih-alih pemanggilan method di template, yang dijalankan ulang setiap render.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const items = ref<Array<{ price: number; quantity: number }>>([])
const taxRate = ref(0.11)

// Dievaluasi ulang hanya saat items atau taxRate berubah
const cartTotal = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0) * (1 + taxRate.value)
)

// Jangan pernah menaruh efek samping di dalam computed
const formattedTotal = computed(() => cartTotal.value.toLocaleString('id-ID'))
</script>

<template>
  <p>Total: {{ formattedTotal }}</p>
</template>
```

Hindari memanggil fungsi di template (`{{ formatDate(item.date) }}`) untuk pekerjaan mahal — fungsi tersebut dieksekusi setiap render setiap baris. Pindahkan derivasi ke computed, atau memoize fungsi dengan cache yang dikunci berdasarkan argumen.

### 7. Memoisasi Daftar Statis Besar dengan `v-memo`

Ketika daftar besar di-render ulang, `v-memo` memungkinkan Vue melewati diffing item daftar yang dependensinya tidak berubah. Gunakan secara bijaksana — memo itu sendiri harus dibandingkan, jadi paling membantu untuk daftar besar dengan pembaruan item yang jarang.

```vue
<script setup lang="ts">
import { ref } from 'vue'

const rows = ref(Array.from({ length: 10_000 }, (_, i) => ({ id: i, label: `Baris ${i}` })))
const filter = ref('')
</script>

<template>
  <input v-model="filter" placeholder="Filter baris" />

  <!-- v-memo hanya me-render ulang baris yang label atau filter-nya berubah -->
  <ul>
    <li v-for="row in rows" :key="row.id" v-memo="[row.label, filter]">
      {{ row.label }}
    </li>
  </ul>
</template>
```

Tanpa `v-memo`, setiap ketukan tombol di input filter me-render ulang seluruh 10.000 baris. Dengan `v-memo`, hanya baris yang cocok yang di-patch.

### 8. Virtualisasi Daftar Panjang

Untuk daftar dengan ribuan baris, merender semuanya sekaligus — bahkan dengan key yang sempurna dan `v-memo` — tetap memakan node DOM dan waktu layout. Virtual scrolling merender hanya jendela yang terlihat ditambah buffer kecil.

```typescript
// @vueuse/core menyediakan composable daftar virtual yang ringan
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

Virtualisasi adalah solusi yang tepat ketika merender seluruh daftar menyebabkan jank; virtualisasi mengurangi node DOM dari puluhan ribu menjadi beberapa lusin.

### 9. Pilih `v-show` vs `v-if` Secara Sadar

Kedua direktif menyembunyikan konten, tetapi memiliki trade-off yang berlawanan.

- `v-if` menghapus elemen dari DOM sepenuhnya dan meruntuhkan state komponennya; mengalihkannya berulang kali mahal karena subtree dihancurkan dan dibuat ulang.
- `v-show` mempertahankan elemen di DOM dan hanya mengalihkan `display`; murah untuk dialihkan tetapi membayar biaya render awal di muka.

```vue
<template>
  <!-- Sering dialihkan: v-show menjaga dropdown tetap hidup -->
  <div v-show="menuOpen" class="dropdown">...</div>

  <!-- Jarang ditampilkan, subtree berat: v-if menghindari biaya sampai dibutuhkan -->
  <ExpensiveReport v-if="reportReady" :data="reportData" />
</template>
```

Gunakan `v-once` untuk konten statis yang tidak pernah berubah — Vue merendernya sekali dan melewatkannya pada pembaruan berikutnya.

### 10. Cegah Render Ulang yang Tidak Perlu

Render ulang adalah hambatan runtime paling umum di aplikasi nyata. Sebagian besar dapat dihindari.

- Selalu berikan nilai `:key` yang stabil untuk `v-for` — jangan pernah menggunakan indeks array ketika daftar dapat diurutkan ulang atau difilter.
- Kirim prop primitif atau referensi objek yang stabil; membuat objek inline baru (`:data="{ id: row.id }"`) memaksa pembaruan anak pada setiap render induk.
- Destrukturisasi prop secara sadar. Dalam `<script setup>`, `defineProps` bersifat reaktif; destrukturisasi aman dengan `toRefs` ketika Anda membutuhkan ref individual.
- Daftarkan dan hapus pendengar event global di `onMounted` / `onBeforeUnmount` agar pendengar tidak menumpuk.

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, toRefs } from 'vue'

const props = defineProps<{ item: Item }>()
const { item } = toRefs(props)

function onResize() {
  // tangani resize
}

onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>
```

### 11. Optimalkan Watcher

Watcher menjalankan kode arbitrer saat terjadi perubahan, dan watcher yang salah konfigurasi dapat terpicu jauh lebih sering dari yang diinginkan.

- Hindari `deep: true` pada objek besar — penelusuran dalam pada setiap mutasi sangat mahal. Amati computed yang memproyeksikan hanya field yang Anda butuhkan.
- Gunakan `flush: 'post'` ketika watcher hanya perlu berjalan setelah DOM diperbarui, menghindari siklus render tambahan.
- Utamakan `watchEffect` untuk efek samping turunan sederhana; watchEffect melacak dependensinya secara otomatis dan berhenti saat komponen unmount.

```typescript
import { ref, watch, computed } from 'vue'

const user = ref<{ profile: { name: string; email: string } } | null>(null)

// Alih-alih mengamati dalam seluruh objek user:
const profileName = computed(() => user.value?.profile.name ?? '')

watch(profileName, (name) => {
  // Berjalan hanya saat nama benar-benar berubah
  document.title = `${name} — Dashboard`
}, { flush: 'post' })
```

### 12. Gunakan `KeepAlive` dan `Suspense` Secara Sadar

- Bungkus tampilan rute yang sering dikunjungi atau tab dinamis dengan `<KeepAlive>` untuk mempertahankan state komponen dan melewati biaya pemasangan ulang saat pengguna berpindah bolak-balik.
- Gunakan `<Suspense>` untuk komponen dengan setup async agar fallback langsung dirender dan pekerjaan async tidak memblokir first paint.
- Berhati-hatilah dengan `KeepAlive` dan pohon besar — komponen yang di-cache mempertahankan DOM dan state-nya, jadi batasi cache dengan `include`/`max`.

```vue
<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive :include="['DashboardView', 'SearchView']" :max="5">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
```

### 13. Optimalkan Pengiriman Aset dan Jaringan

Ukuran bundle hanyalah sebagian dari performa pemuatan. Aset dan perilaku jaringan sama pentingnya.

- Sajikan gambar dalam format modern (WebP/AVIF) dengan `width`/`height` eksplisit untuk mencegah layout shift, dan muat malas gambar di bawah lipatan dengan `loading="lazy"`.
- Muat font dengan `font-display: swap` dan subset; hindari mengirim beberapa keluarga font lengkap.
- Tetapkan header cache berumur panjang untuk aset statis ber-hash agar kunjungan berikutnya dilayani dari cache.
- Kompres respons (gzip atau brotli) dan pertimbangkan CDN dengan edge caching untuk aset statis dan respons API.

```html
<img src="/images/hero.webp" width="1200" height="630" alt="Hero" loading="lazy" fetchpriority="high" />
```

### 14. Pindahkan Pekerjaan Berat dari Thread Utama

Task JavaScript yang panjang memblokir rendering dan input. Apa pun yang berat CPU — parsing, transformasi, kriptografi, pemrosesan gambar — sebaiknya berada di Web Worker; pekerjaan yang tidak mendesak berada di idle callback.

```typescript
// heavy.worker.ts
self.onmessage = (event: MessageEvent<number[]>) => {
  const result = event.data.map((n) => expensiveTransform(n))
  self.postMessage(result)
}
```

```typescript
// Di dalam komponen
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

Untuk pekerjaan yang tidak mendesak yang dapat berjalan kapan pun browser sedang idle, jadwalkan dengan `requestIdleCallback`; untuk animasi, gunakan `requestAnimationFrame` agar pembaruan selaras dengan refresh rate layar.

## Langkah Implementasi

### Langkah 1: Tetapkan Baseline Performa

Sebelum mengubah apa pun, ambil kondisi saat ini.

1. Build aplikasi dalam mode produksi dan deploy ke lingkungan pratinjau (atau jalankan secara lokal).
2. Jalankan Lighthouse dan catat Core Web Vitals: Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), dan Interaction to Next Paint (INP).
3. Buat laporan bundle dan catat total ukuran bundle serta chunk terbesar.
4. Rekam trace performa Vue Devtools untuk alur pengguna yang paling lambat.

```bash
npm run build
npm run preview

# Buat laporan bundle
npx vite-bundle-visualizer
```

Simpan angka-angka ini — setiap langkah optimasi harus divalidasi terhadap angka tersebut.

### Langkah 2: Kurangi dan Pecah Bundle

1. Periksa laporan bundle dan identifikasi dependensi terbesar.
2. Ganti pustaka berat dengan alternatif yang lebih ringan jika memungkinkan (`moment` → `dayjs`, `lodash` → `lodash-es`).
3. Konfigurasikan `build.rollupOptions.output.manualChunks` di `vite.config.ts` untuk memecah kode vendor menjadi chunk stabil yang diuntungkan oleh caching jangka panjang.

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

1. Jalankan ulang laporan bundle dan pastikan bundle awal menyusut. Tujuannya adalah chunk entri yang ramping dengan sisanya dipecah di balik import dinamis.

### Langkah 3: Terapkan Pemecahan Kode di Tingkat Rute dan Komponen

1. Ubah `component` setiap rute menjadi `import()` dinamis seperti yang ditunjukkan pada Praktik Terbaik 3.
2. Identifikasi komponen berat yang digunakan di sedikit tempat dan bungkus dengan `defineAsyncComponent`.
3. Tambahkan loading skeleton agar chunk async memiliki placeholder yang menyenangkan.
4. Verifikasi di tab Network browser bahwa mengunjungi sebuah rute hanya memuat chunk miliknya sendiri.

### Langkah 4: Terapkan Optimasi Reaktivitas

1. Audit pohon state untuk objek besar yang tidak membutuhkan reaktivitas dalam.
2. Ubah objek tersebut menjadi `shallowRef`, `shallowReactive`, `markRaw`, atau `readonly` sesuai kebutuhan.
3. Pindahkan data pencarian statis keluar dari state reaktif sepenuhnya.
4. Jalankan ulang trace performa Vue Devtools — waktu render komponen yang menyentuh state yang diubah akan turun secara nyata.

### Langkah 5: Optimalkan Jalur Render yang Panas

1. Tambahkan `v-memo` ke daftar statis besar dan verifikasi perbaikannya dengan trace.
2. Ganti daftar panjang yang dirender penuh dengan daftar virtual (Praktik Terbaik 8).
3. Audit key `v-for`, prop objek inline, dan pembersihan pendengar event (Praktik Terbaik 10).
4. Tinjau watcher dan computed untuk anti-pola pada Praktik Terbaik 11.

### Langkah 6: Optimalkan Pengiriman Aset dan Jaringan

1. Ubah gambar hero dan konten menjadi WebP/AVIF dengan dimensi eksplisit dan lazy loading.
2. Konfigurasikan pemuatan font dengan `font-display: swap` dan subsetting.
3. Siapkan kompresi dan header cache berumur panjang untuk aset ber-hash di platform hosting atau CDN.
4. Jalankan ulang Lighthouse dan bandingkan LCP serta CLS dengan baseline Langkah 1.

### Langkah 7: Profiling Perilaku Runtime

1. Buka panel Performance Chrome DevTools dan rekam alur pengguna paling lambat (misalnya, membuka tabel atau dashboard terbesar).
2. Cari long task (di atas 50ms), forced reflow, dan konsumsi memori yang berlebihan.
3. Jika long task berasal dari kode aplikasi, pindahkan pekerjaan ke Web Worker atau idle callback (Praktik Terbaik 14).
4. Gunakan tab Performance pada Vue Devtools untuk memastikan tidak ada komponen yang di-render ulang lebih sering dari yang dibutuhkan dependensinya.

### Langkah 8: Siapkan Pemantauan Performa Berkelanjutan

Regresi performa paling mudah diperbaiki ketika terdeteksi secara otomatis.

1. Tambahkan Lighthouse CI ke pipeline build dan gagalkan build ketika Core Web Vitals atau ukuran bundle melampaui anggaran.
2. Tambahkan pemeriksaan anggaran ukuran bundle agar peningkatan dependensi tidak dapat menggandakan bundle secara diam-diam.
3. Lacak Web Vitals dari pengguna nyata dengan alat RUM (Real User Monitoring) atau kolektor khusus yang ringan.
4. Jadwalkan tinjauan performa bulanan: jalankan ulang baseline, bandingkan, dan prioritaskan optimasi berikutnya.

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

Dengan anggaran di CI dan pemantauan pengguna nyata di produksi, tim menangkap regresi pada minggu yang sama saat terjadi, bukan sebulan sebelum peluncuran.

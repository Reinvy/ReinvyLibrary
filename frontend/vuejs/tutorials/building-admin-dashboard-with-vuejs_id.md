---
title: "Membangun Dashboard Admin dengan Vue.js"
description: "Membangun dashboard admin Vue 3 dengan layout shell permanen, route guard, integrasi API bertipe, tabel data dengan sorting, chart lambat, UI berbasis peran, dan i18n."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Dashboard Admin dengan Vue.js

## Ringkasan

Tutorial ini membangun dashboard admin Vue 3 secara utuh: layout shell permanen, routing dengan guard autentikasi dan peran, lapisan API bertipe, tabel data yang bisa diurutkan, chart yang dimuat lambat, UI sadar izin, serta dukungan dua bahasa. Hasilnya adalah kerangka yang Anda perluas dengan modul domain, bukan membangun ulang plumbing yang sama pada setiap layar.

## Target Audiens

- Pengembang frontend yang nyaman dengan komponen Vue 3, `ref`, dan `computed`.
- Pengembang full-stack yang beralih dari aplikasi skala tutorial ke aplikasi multi-route dengan kontrol akses.

## Prasyarat

- Node.js 20+ dan npm terpasang, serta pemahaman Composition API dan Vue Router.
- Dasar TypeScript: interface, generic, dan type narrowing.
- Backend atau API tiruan yang menyediakan `GET /api/users` dan `POST /api/login`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan mampu:

- Menyusun dashboard dengan shell yang bertahan saat berpindah route.
- Melindungi route dengan autentikasi dan guard navigasi berbasis peran.
- Memusatkan akses API di balik klien bertipe dengan penanganan error yang konsisten.
- Membuat tabel yang dapat dipakai ulang serta memuat chart tanpa menahan paint pertama.
- Membatasi UI berdasarkan izin dan mengganti bahasa tanpa memuat ulang halaman.

## Konteks dan Motivasi

Dashboard admin terlihat sederhana di demo lalu sulit dirawat di produksi. Layout diduplikasi di setiap halaman, otorisasi diperiksa di tiga tempat, setiap layar menulis `fetch` sendiri, dan logika "sembunyikan tombol hapus" disalin ke belasan komponen. Setiap jalan pintas tidak terasa mahal di hari pertama dan menuntut satu minggu refactor di hari kesembilan puluh.

Solusinya bersifat arsitektural: satu shell, satu kontrak router, satu klien API, satu helper izin, satu lapisan terjemahan. Tutorial ini membangun kelima bagian tersebut agar layar domain berikutnya tetap kecil dan konsisten.

## Konten Inti

### Layout Shell

Pisahkan aplikasi menjadi route shell dan route anak. Shell memiliki sidebar, top bar, dan notifikasi; route anak hanya merender kontennya ke dalam `<RouterView>`. Karena shell tetap ter-mount, navigasi tidak membongkar state sidebar, posisi scroll, atau menu yang terbuka. Jaga shell bebas dari data bisnis — ia cukup tahu navigasi dan pengguna saat ini.

### Guard dan Lapisan API

Route guard tempatnya di router, bukan di `onMounted`. `beforeEach` global menjawab tiga pertanyaan berurutan: apakah ada sesi, apakah route ditandai `requiresAuth`, dan apakah sesi memegang salah satu peran di `route.meta.roles`. Alihkan ke login dengan query `redirect` agar pengguna kembali ke halaman yang dituju.

Setiap layar yang memanggil `fetch` langsung menjamin penanganan error yang tidak konsisten. Bungkus API dalam satu klien yang melampirkan kredensial, mem-parsing JSON, melempar error pada respons non-2xx, dan menormalkan error ke bentuk yang bisa ditampilkan. Suntikkan klien lewat `provide` agar pengujian dapat menggantinya dengan fake tanpa menyentuh jaringan.

### Tabel dan Chart

Dashboard sebagian besar berisi tabel. Ekstrak sorting, filter, dan paginasi ke dalam composable yang menerima baris data dan mengembalikan state turunan beserta handler, sehingga komponen tabel tetap presentasional: props masuk, event keluar. Untuk paginasi sisi server, kirim `total` dan pancarkan perubahan halaman alih-alih memotong array secara lokal.

Chart adalah dependensi terberat dalam bundel. Impor dengan `defineAsyncComponent` agar shell dan tabel tampil lebih dulu, lalu cadangkan tinggi lewat CSS untuk mencegah pergeseran layout saat pustaka diunduh.

### Izin dan Bahasa

Sediakan satu helper `can(action)` yang diturunkan dari peran sesi dan pakai di `v-if` serta direktif kecil `v-can`. Menyembunyikan tombol hanyalah kenyamanan, bukan keamanan — API wajib menegakkan aturan yang sama. Untuk i18n, simpan file JSON per locale, sediakan `t()` dan pengalih bahasa di shell, serta format tanggal dengan `Intl`, bukan string template.

## Contoh Kode

### Router dengan Route Anak Terlindungi

```typescript
// router/index.ts — shell memiliki layout, anak memiliki konten
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/',
      component: () => import('@/layouts/DashboardShell.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'overview', component: () => import('@/views/OverviewView.vue') },
        { path: 'users', name: 'users', component: () => import('@/views/UsersView.vue'), meta: { roles: ['admin'] } },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const needsAuth = to.matched.some((record) => record.meta.requiresAuth)
  if (needsAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles?.length && !roles.some((role) => auth.roles.includes(role))) {
    return { name: 'overview' }
  }
  return true
})
```

### Klien API Bertipe

```typescript
// api/client.ts — satu tempat menangani kredensial, parsing, dan error
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw Object.assign(new Error(body || `Permintaan gagal dengan ${res.status}`), { status: res.status })
  }
  return (res.status === 204 ? null : await res.json()) as T
}

export const api = {
  users: (page: number) => request<{ items: User[]; total: number }>(`/users?page=${page}`),
}
```

### Composable Tabel

```typescript
// composables/useTable.ts — sorting tidak masuk ke template
export function useTable<T extends Record<string, unknown>>(rows: Ref<T[]>) {
  const query = ref('')
  const sortKey = ref<keyof T | null>(null)
  const sortDir = ref<'asc' | 'desc'>('asc')

  const visible = computed(() => {
    const needle = query.value.trim().toLowerCase()
    const filtered = rows.value.filter((row) =>
      !needle || Object.values(row).some((v) => String(v).toLowerCase().includes(needle)),
    )
    if (!sortKey.value) return filtered
    const key = sortKey.value
    const factor = sortDir.value === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * factor)
  })

  function sortBy(key: keyof T) {
    sortDir.value = sortKey.value === key && sortDir.value === 'asc' ? 'desc' : 'asc'
    sortKey.value = key
  }
  return { query, sortKey, sortDir, visible, sortBy }
}
```

## Insight Penting

- Periksa `to.matched`, bukan `to.meta`: route anak hanya mewarisi metadata jika Anda menelusuri seluruh record yang cocok.
- Pemeriksaan peran di klien memperbaiki UX, bukan keamanan; API harus menolak penulisan tanpa izin secara mandiri.
- Muat chart dan view di atas ~50 KB secara lambat; paint pertama lebih penting daripada chart yang cepat siap.
- Jaga shell tetap tanpa data agar navigasi tidak mengambil ulang data pengguna atau tenant di setiap perubahan route.
- Normalkan error API di satu tempat; turunkan `<html lang>` dari locale aktif untuk format `Intl`.

## Langkah Berikutnya

- Tambahkan optimistic update dan retry pada klien API untuk jaringan seluler yang tidak stabil.
- Pindahkan state tabel ke query URL agar tampilan bisa dibagikan dan dijadikan bookmark.
- Ganti primitif tabel buatan sendiri dengan PrimeVue atau Naive UI, serta uji login dan redirect peran dengan Playwright.

## Kesimpulan

Anda kini memiliki dashboard dengan shell permanen, route terlindungi, klien bertipe, logika tabel yang dapat dipakai ulang, chart yang dimuat lambat, UI sadar izin, dan dukungan dua bahasa — bagian yang menentukan apakah sepuluh layar berikutnya murah atau mahal. Perluas modul demi modul: setiap layar baru seharusnya menambah view dan route, bukan salinan baru dari plumbing yang sama.

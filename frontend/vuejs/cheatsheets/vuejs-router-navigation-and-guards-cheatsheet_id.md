---
title: "Cheat Sheet Navigasi dan Route Guard Vue Router"
description: "Referensi cepat Vue Router 4: opsi route record, route bersarang dan alias, lazy loading, navigation guard global dan dalam komponen, params bertipe, perilaku scroll, dan penanganan kegagalan navigasi."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Navigasi dan Route Guard Vue Router

## Tabel Referensi Cepat

| Tugas | Kode | Catatan |
|-------|------|---------|
| Membuat router | `createRouter({ history, routes })` | Butuh factory history, bukan string |
| Mode history | `createWebHistory()`, `createWebHashHistory()`, `createMemoryHistory()` | Memory history yang dipakai saat unit test |
| Mendaftarkan plugin | `app.use(router)` | Saat SSR, mount setelah `router.isReady()` |
| Mendeklarasikan route | `{ path: '/users/:id', name: 'user', component: User }` | `name` wajib untuk navigasi bertipe |
| Child bersarang | `{ path: 'profile', component: Profile }` di dalam `children` | Path child relatif — tanpa garis miring di depan |
| Redirect | `{ path: '/old', redirect: '/new' }` | Bisa juga berupa fungsi atau named location |
| Alias | `{ path: '/', alias: '/home' }` | Dua URL, satu record, tanpa redirect |
| Lazy view | `component: () => import('./views/About.vue')` | Menghasilkan chunk terpisah per route |
| Props route | `props: true` atau `props: (route) => ({ id: route.params.id })` | Memisahkan view dari `useRoute()` |
| Guard global | `router.beforeEach((to, from) => {})` | Kembalikan `false` untuk batal, lokasi untuk redirect |
| Guard resolve | `router.beforeResolve(async (to) => {})` | Berjalan setelah semua guard komponen lolos |
| Hook pasca-navigasi | `router.afterEach((to, from, failure) => {})` | Tanpa nilai balik — cocok untuk analytics dan judul |
| Guard per route | `beforeEnter: (to, from) => {}` | Hanya jalan saat memasuki record tersebut |
| Guard keluar | `onBeforeRouteLeave((to, from) => {})` | Pengganti `beforeRouteLeave` di Composition API |
| Guard update | `onBeforeRouteUpdate((to, from) => {})` | Jalan saat record yang sama memakai params baru |
| Bernavigasi | `router.push({ name: 'user', params: { id: 7 } })` | Mengembalikan promise berisi failure atau `undefined` |
| Resolve tanpa navigasi | `router.resolve({ name: 'user', params: { id: 7 } })` | Memberi `href` untuk anchor biasa |
| Menambah route saat runtime | `router.addRoute('parent', route)` | Mengembalikan fungsi penghapus |
| Memeriksa kegagalan | `isNavigationFailure(failure, NavigationFailureType.aborted)` | Membedakan batal dari navigasi duplikat |

## Perintah Umum

### Menyiapkan Proyek dengan Router

```bash
# Scaffold resmi — jawab "yes" pada pertanyaan Router
npm create vue@latest my-app

# Atau tambahkan router ke proyek Vue 3 yang sudah ada
npm install vue-router@4
```

### Type-Check dan Pratinjau Perubahan Route

```bash
# File route adalah TypeScript biasa, jadi ikut diperiksa vue-tsc
npx vue-tsc --noEmit

# Build produksi — setiap lazy route menjadi chunk aset tersendiri
npm run build

# Menjalankan hasil build untuk memastikan fallback history mode bekerja
npm run preview
```

### Memeriksa Chunk Route Lazy

```bash
# Satu chunk per view lazy, dinamai sesuai file sumbernya
ls -1 dist/assets | grep -i view

# History mode butuh fallback SPA di server; preview sudah menanganinya
curl -I http://localhost:4173/some/deep/route
```

## Potongan Kode

### Instance Router dan Mode History

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  strict: false
})
```

Pilihan history menentukan dukungan yang harus disiapkan server. `createWebHistory` memerlukan rewrite fallback SPA supaya URL dalam mengembalikan `index.html`; `createWebHashHistory` menghindari itu dengan konsekuensi `#` pada URL; `createMemoryHistory` menyimpan navigasi sepenuhnya di memori dan paling tepat untuk test serta target non-browser.

### Route Record: Dinamis, Bersarang, dan Alias

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/projects/:projectId',
    component: () => import('@/layouts/ProjectLayout.vue'),
    props: true,
    children: [
      { path: '', name: 'project-overview', component: () => import('@/views/ProjectOverview.vue') },
      { path: 'settings', name: 'project-settings', component: () => import('@/views/ProjectSettings.vue') },
      { path: 'members/:memberId', name: 'project-member', component: () => import('@/views/MemberDetail.vue') }
    ]
  },
  { path: '/legacy/dashboard', alias: '/dashboard', redirect: { name: 'project-overview', params: { projectId: 'default' } } }
]
```

Child mewarisi segmen path induk, sehingga `path: 'settings'` menghasilkan `/projects/:projectId/settings`. Child dengan path kosong (`path: ''`) dirender di dalam layout induk pada URL induk persis — pola standar untuk view index yang berbagi shell.

### Lazy Loading View dan Props per Route

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/reports/:reportId',
    name: 'report',
    component: () => import('@/views/ReportView.vue'),
    props: (route) => ({
      reportId: String(route.params.reportId),
      tab: route.query.tab ?? 'summary'
    })
  }
]
```

```vue
<script setup lang="ts">
const props = defineProps<{ reportId: string; tab: string }>()
</script>

<template>
  <ReportBody :id="props.reportId" :tab="props.tab" />
</template>
```

`props: true` memetakan setiap param menjadi prop dengan nama sama. Bentuk fungsi dipakai begitu param perlu dikonversi atau nilai query butuh default — view lalu menerima props biasa dan mudah diuji tanpa memasang router.

### Navigation Guard Global

```typescript
router.beforeEach(async (to) => {
  const session = useSessionStore()

  if (to.meta.requiresAuth && !session.isAuthenticated) {
    return { name: 'sign-in', query: { redirect: to.fullPath } }
  }

  if (!session.isReady) {
    await session.hydrate()
  }
})

router.beforeResolve(async (to) => {
  if (to.meta.preloadData) {
    await preloadRouteData(to)
  }
})

router.afterEach((to, from, failure) => {
  if (!failure) {
    document.title = (to.meta.title as string) ?? 'App'
  }
})
```

Guard berjalan sesuai urutan pendaftaran dan diselesaikan dari atas ke bawah: `beforeEach` pada setiap navigasi, lalu `beforeEnter` pada record tujuan, lalu `beforeRouteUpdate` di komponen, lalu `beforeRouteLeave` di komponen, lalu `beforeResolve`, lalu navigasi dikonfirmasi, lalu `afterEach`. Mengembalikan lokasi dari sebuah guard membatalkan navigasi saat ini dan memulai navigasi baru — rantai guard dijalankan ulang, jadi guard redirect tidak boleh membuat loop.

### Area Terautentikasi dengan Guard Berbasis Meta

```typescript
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: Array<'admin' | 'editor' | 'viewer'>
    title?: string
    preloadData?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      { path: 'users', name: 'admin-users', component: () => import('@/views/AdminUsers.vue'), meta: { title: 'Users' } }
    ]
  }
]

router.beforeEach((to) => {
  if (!to.meta.roles?.length) return true
  const role = useSessionStore().role
  return to.meta.roles.includes(role) ? true : { name: 'forbidden' }
})
```

Meta digabung menurun mengikuti pohon record: child mewarisi `requiresAuth` dari induk tetapi menimpa `title` dengan miliknya sendiri. Augmentasi `RouteMeta` membuat `to.meta.roles` menjadi field bertipe, bukan `unknown` — inilah yang membuat guard berbasis meta aman saat direfaktor.

### Guard di Dalam Komponen dengan Composition API

```vue
<script setup lang="ts">
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { useDraftStore } from '@/stores/draft'

const draft = useDraftStore()

onBeforeRouteLeave(() => {
  if (!draft.isDirty) return true
  return window.confirm('Buang perubahan yang belum disimpan?')
})

onBeforeRouteUpdate(async (to, from) => {
  if (to.params.id !== from.params.id) {
    await draft.load(String(to.params.id))
  }
})
</script>
```

Guard Composition API hanya bekerja di dalam komponen yang dirender oleh `<RouterView>`. `onBeforeRouteLeave` membatalkan dengan `false` (atau melanjutkan dengan `true`), sedangkan `onBeforeRouteUpdate` jalan ketika record yang sama dipakai ulang dengan params berbeda — kasus yang tidak pernah terlihat oleh remount penuh.

### Param Bertipe dan Augmentasi Meta Route

```typescript
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => String(route.params.projectId))
const page = computed(() => {
  const raw: LocationQueryValue | LocationQueryValue[] = route.query.page
  return Number(Array.isArray(raw) ? raw[0] : raw ?? 1)
})

async function openSettings() {
  await router.push({ name: 'project-settings', params: { projectId: projectId.value } })
}
```

Param selalu datang sebagai string, dan key query yang berulang datang sebagai array — konversi di tepi komponen, bukan menyebar `Number()` ke seluruh template. `route.params` tidak reaktif seperti yang sering diduga; perubahan param pada record yang sama memperbarui `route.params` di tempat tanpa remount, jadi turunkan nilainya lewat `computed` dan jangan disalin sekali di awal.

### Perilaku Scroll dan Transisi Route

```typescript
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
})
```

```vue
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="fade" mode="out-in">
      <KeepAlive :include="['ProjectOverview']">
        <component :is="Component" :key="route.path" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>
```

`savedPosition` hanya terisi pada tombol back dan forward browser, itulah yang membuat pemulihan posisi scroll pada navigasi history bekerja. Memberi key pada komponen dengan `route.path` memaksa transisi saat param berubah; hilangkan key jika view seharusnya diperbarui di tempat.

### Navigasi Programatik dan Penanganan Kegagalan

```typescript
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

async function goToReport(id: string) {
  const failure = await router.push({ name: 'report', params: { reportId: id } })

  if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    return
  }

  if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
    console.info('Navigasi dibatalkan oleh guard')
  }
}
```

`router.push` menyelesaikan promise, bukan menolaknya: guard yang membatalkan menghasilkan objek failure, bukan error yang dilempar. Karena itu `try/catch` di sekitar `push` diam-diam melewatkan navigasi yang dibatalkan — periksa nilai yang di-resolve dengan `isNavigationFailure`.

### Bereaksi pada Perubahan Param Tanpa Remount

```typescript
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => route.params.reportId,
  async (next, previous) => {
    if (next === previous) return
    await loadReport(String(next))
  },
  { immediate: true }
)
```

Mengawasi param adalah alternatif dari remount view pada setiap navigasi. State lokal dan posisi scroll tetap hidup antar laporan bersaudara — biasanya inilah yang diinginkan pola drill-down list ke detail di tempat.

### Slot RouterLink untuk UI Navigasi Kustom

```vue
<template>
  <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" to="/reports" custom>
    <a
      :href="href"
      :class="{ 'nav-active': isActive, 'nav-precise': isExactActive }"
      @click="navigate"
    >
      Reports
    </a>
  </RouterLink>
</template>
```

Slot `custom` memberi `href` yang sudah di-resolve dan handler `navigate` sehingga komponen design system bisa merender markup sendiri sambil tetap mempertahankan semantik link yang sadar router — klik tengah, tombol modifier, dan pewarnaan `isActive` semuanya tetap bekerja.

### Menambah Route Saat Runtime

```typescript
const removePluginRoutes = router.addRoute({
  path: '/plugin/:slug',
  name: 'plugin-page',
  component: () => import('@/views/PluginPage.vue')
})

// Area dengan feature flag yang bersarang di bawah record yang sudah ada
router.addRoute('admin', {
  path: 'audit-log',
  name: 'admin-audit-log',
  component: () => import('@/views/AuditLog.vue')
})

// Nanti, saat dibongkar
removePluginRoutes()
```

`addRoute` mengembalikan fungsi penghapus, cara bersih untuk membongkar modul yang didaftarkan secara lazy. Menambah child record membutuhkan `name` induknya, dan route yang baru ditambahkan dapat dinavigasi setelah navigasi berikutnya — resolve secara eksplisit jika kode perlu membangun tautan saat itu juga.

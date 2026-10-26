---
title: "Cheat Sheet Composables Vue.js"
description: "Referensi cepat untuk composable Vue 3: pola Composition API, lifecycle di dalam composable, state bersama, pembersihan effectScope, dan pengujian unit."
category: "frontend"
technology: "vuejs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Composables Vue.js

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Mendeklarasikan composable | `export function useCounter() {}` | File di `composables/`, nama selalu diawali `use` |
| Mengembalikan state reaktif | `return { count, increment }` | Kembalikan ref apa adanya, bukan nilai mentah |
| Composable asinkron | `export async function useUser(id) {}` | Pemanggil wajib `await` sebelum memakai ref hasilnya |
| Menerima argumen ref | `toValue(source)` | Menormalkan `ref`, getter, atau nilai biasa |
| Memantau argumen ref | `watch(toValue(source), cb)` | Menjaga reaktivitas pada props yang dikirim sebagai getter |
| Pembersihan saat dispose | `onScopeDispose(() => {})` | Berfungsi di komponen maupun scope terpisah |
| State tunggal bersama | `const state = reactive({})` | Deklarasikan di level modul, di luar factory |
| State terisolasi per pemanggilan | `const state = ref(0)` di dalam factory | State baru untuk setiap komponen pemanggil |
| Mengelompokkan efek reaktif | `const scope = effectScope()` | Watcher dapat dihentikan bersamaan |
| Menghentikan scope | `scope.stop()` | Membuang semua efek yang dibuat di dalamnya |
| Menyuntikkan dependensi | `useX(inject(Key) as T)` | Kirim port lewat parameter, bukan impor singleton |

## Perintah Umum

### Scaffolding dan Perkakas Uji

```bash
# Membuat proyek, lalu file composable mandiri
npm create vue@latest my-app
mkdir -p src/composables && touch src/composables/useCounter.ts

# Harness untuk composable yang menyentuh lifecycle hook
npm install --save-dev vitest @vue/test-utils jsdom
```

### Pemeriksaan Tipe dan Menjalankan Uji

```bash
# Menangkap kesalahan reaktivitas: props terdestrukturisasi, .value hilang
npx vue-tsc --noEmit

# jsdom menyediakan DOM yang dibutuhkan mount()
npx vitest run --environment jsdom src/composables
```

## Potongan Kode

### Composable Dasar

```typescript
// composables/useCounter.ts — state dibuat ulang pada setiap pemanggilan
export function useCounter(initial = 0, step = 1) {
  if (!Number.isFinite(initial) || !Number.isFinite(step)) {
    throw new TypeError('useCounter membutuhkan angka yang valid')
  }
  const count = ref(initial)
  const isPositive = computed(() => count.value > 0)
  const increment = () => (count.value += step)
  return { count, isPositive, increment, reset: () => (count.value = initial) }
}
```

### Menerima Ref, Getter, atau Nilai Biasa

```typescript
// composables/useFullName.ts — toValue menjaga semua bentuk input tetap reaktif
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export function useFullName(first: MaybeRefOrGetter<string>, last: MaybeRefOrGetter<string>) {
  return computed(() => `${toValue(first)} ${toValue(last)}`.trim().replace(/\s+/g, ' '))
}
```

### Lifecycle di Dalam Composable

```typescript
// composables/useWindowWidth.ts — memeriksa apakah ada scope aktif
import { getCurrentScope, onScopeDispose, ref } from 'vue'

export function useWindowWidth() {
  const width = ref(window.innerWidth)
  const onResize = () => (width.value = window.innerWidth)
  window.addEventListener('resize', onResize, { passive: true })

  if (getCurrentScope()) {
    onScopeDispose(() => window.removeEventListener('resize', onResize))
  } else {
    console.warn('useWindowWidth dipanggil tanpa scope; listener akan bocor')
  }
  return width
}
```

### State Tunggal Bersama

```typescript
// composables/useAuth.ts — state level modul dibagi ke semua pemanggil
const session = ref<Session | null>(null)

export function useAuth() {
  const isAuthenticated = computed(() => session.value !== null)

  async function login(email: string, password: string) {
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error(`Login gagal dengan status ${res.status}`)
    session.value = (await res.json()) as Session
  }

  // readonly() mencegah komponen mengubah state bersama secara langsung
  return { session: readonly(session), isAuthenticated, login, logout: () => (session.value = null) }
}
```

### Mengisolasi Kerja Asinkron dengan effectScope

```typescript
// composables/useSearch.ts — seluruh watcher mati bersama scope
export function createSearchScope(fetcher: (q: string) => Promise<string[]>) {
  const scope = effectScope()
  const query = ref('')
  const results = ref<string[]>([])
  const error = ref<string | null>(null)

  scope.run(() => {
    watch(query, async (q) => {
      if (q.length < 2) return void (results.value = [])
      try {
        results.value = await fetcher(q)
        error.value = null
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      }
    })
  })
  return { query, results, error, stop: () => scope.stop() }
}
```

### Menguji Composable

```typescript
// useWindowWidth.spec.ts — mount komponen inang agar lifecycle hook tersedia
const Host = defineComponent({
  setup() {
    const width = useWindowWidth()
    return () => h('span', width.value)
  },
})

it('mengikuti event resize', () => {
  const wrapper = mount(Host)
  window.innerWidth = 1280
  window.dispatchEvent(new Event('resize'))
  expect(wrapper.text()).toBe('1280')
  wrapper.unmount()
})
```

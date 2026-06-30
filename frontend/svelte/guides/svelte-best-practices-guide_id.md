---
title: "Panduan Praktik Terbaik Svelte"
description: "Panduan komprehensif yang mencakup arsitektur proyek, manajemen state, strategi pengujian, dan pola deployment produksi untuk aplikasi Svelte dan SvelteKit."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Praktik Terbaik Svelte

## Pendahuluan

Svelte adalah framework frontend berbasis compiler yang memindahkan sebagian besar pekerjaan dari browser ke tahap build, menghasilkan vanilla JavaScript yang sangat teroptimasi. Framework pendampingnya, SvelteKit, menyediakan application framework lengkap dengan routing, server-side rendering, dan deployment berbasis adapter. Panduan ini mengonsolidasikan praktik terbaik untuk membangun aplikasi Svelte dan SvelteKit yang mudah dipelihara, berperforma tinggi, dan siap produksi. Anda akan mempelajari konvensi struktur proyek, pola manajemen state, prinsip desain komponen, strategi pengujian, pertimbangan aksesibilitas, dan alur kerja deployment.

## Praktik Terbaik

- **Struktur proyek berbasis fitur**: Organisasikan aplikasi SvelteKit berdasarkan domain fitur, bukan tipe file. Kelompokkan komponen, store, dan rute yang terkait dalam direktori fitur yang sama untuk meningkatkan discoverability dan mengurangi kopling antar-modul.

- **Gunakan deklarasi reaktif secara bijaksana**: Statement `$:` sangat powerful, tetapi penggunaan berlebihan dapat menyebabkan pembaruan berantai yang sulit di-debug. Utamakan panggilan fungsi eksplisit atau pembaruan state berbasis event ketika rantai reaktif melebihi tiga langkah.

- **Manfaatkan routing berbasis file SvelteKit**: Patuhi konvensi routing SvelteKit (`+page.svelte`, `+layout.svelte`, `+server.ts`, `+page.server.ts`) daripada mengimplementasikan routing kustom. Ini memastikan perilaku konsisten di seluruh adapter dan menyederhanakan deployment.

- **Jaga store tetap fokus dan komposabel**: Tulis store kecil dengan tujuan tunggal yang dapat digabungkan. Gunakan tipe store `readable` dan `derived` untuk nilai terkomputasi, dan utamakan Context API (`setContext`/`getContext`) daripada prop drilling di pohon komponen yang bersarang dalam.

- **Terapkan progressive enhancement**: Bangun fungsionalitas inti yang berfungsi tanpa JavaScript, lalu lapisi interaktivitas dengan fitur client-side Svelte. Form actions dan `use:enhance` dari SvelteKit membuat pola ini mudah diterapkan.

- **Tulis komponen type-safe**: Gunakan TypeScript dengan rune `$props()` atau sintaks `export let` Svelte untuk mendefinisikan antarmuka komponen yang memiliki tipe. Aktifkan `strict: true` di `tsconfig.json` untuk menangkap error tipe pada waktu kompilasi.

- **Optimalkan ukuran bundle dengan code splitting**: SvelteKit secara otomatis melakukan code splitting di batas rute. Gunakan import dinamis dengan `lazy` untuk komponen pihak ketiga yang berat dan tunda JavaScript non-kritis dengan `onMount`.

- **Uji di setiap level**: Kombinasikan unit test (Vitest) untuk store dan utilitas, component test (Vitest + svelte-testing-library) untuk logika UI, dan end-to-end test (Playwright) untuk alur pengguna kritis. Utamakan integration dan E2E test daripada unit test yang terisolasi.

- **Utamakan aksesibilitas sejak awal**: Gunakan elemen HTML semantik, kelola fokus dengan `use:enhance` dan `trapFocus`, serta uji dengan axe-core atau Lighthouse. CSS scoped Svelte memudahkan pemeliharaan gaya yang aksesibel tanpa konflik kaskade.

- **Gunakan konfigurasi berbasis environment**: Manfaatkan modul `$env` SvelteKit (`$env/static/public`, `$env/dynamic/private`) untuk akses variabel environment yang type-safe. Jangan pernah hardcode endpoint API atau rahasia di file komponen.

## Langkah Implementasi

### Langkah 1: Membuat Proyek SvelteKit Type-Safe

Buat proyek baru dengan dukungan TypeScript penuh dan package manager pilihan:

```bash
npm create svelte@latest my-app
# Pilih: Skeleton project, TypeScript, ESLint, Prettier, Playwright, Vitest
cd my-app
npm install
```

Konfigurasikan TypeScript strict di `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

Verifikasi bahwa setup berjalan tanpa error:

```bash
npm run dev
```

### Langkah 2: Mendesain Struktur Direktori Berbasis Fitur

Gunakan tata letak berbasis fitur di dalam `src/`. Setiap domain fitur mendapatkan direktori sendiri dengan komponen, store, dan pengujian yang mandiri:

```text
src/
  routes/              # Rute berbasis file SvelteKit
    (auth)/            # Route group auth (tanpa nesting layout)
      login/
        +page.svelte
        +page.server.ts
      register/
        +page.svelte
    dashboard/
      +layout.svelte
      +page.svelte
      components/      # Komponen spesifik dashboard
        ChartWidget.svelte
        DataTable.svelte
  lib/
    features/          # Domain fitur
      auth/
        store.ts
        AuthGuard.svelte
        types.ts
      billing/
        store.ts
        InvoiceList.svelte
    components/        # Primitif UI bersama
      Button.svelte
      Modal.svelte
      FormField.svelte
    utils/
      date.ts
      validation.ts
    api/
      client.ts
      endpoints.ts
  app.html
  app.d.ts
```

Struktur ini menjaga kode terkait tetap berdekatan, mengurangi kompleksitas jalur import, dan berskala baik seiring pertumbuhan aplikasi.

### Langkah 3: Mengimplementasikan Lapisan State yang Komposabel

Definisikan store yang fokus menggunakan helper writable, readable, dan derived Svelte. Komposisikan dalam komponen dengan Context API untuk menghindari prop drilling:

```typescript
// src/lib/features/auth/store.ts
import { writable, derived } from 'svelte/store';
import type { User, Session } from './types';

export const currentUser = writable<User | null>(null);
export const session = writable<Session | null>(null);

export const isAuthenticated = derived(
  currentUser,
  ($user) => $user !== null
);

export const displayName = derived(
  currentUser,
  ($user) => $user?.name ?? 'Guest'
);

// Sediakan store melalui context di root layout
// src/routes/+layout.svelte
<script lang="ts">
  import { setContext } from 'svelte';
  import { currentUser, session } from '$lib/features/auth/store';

  setContext('auth', { currentUser, session });
</script>
```

Konsumsi store di komponen anak dengan `getContext`:

```svelte
<!-- src/lib/features/auth/AuthGuard.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  import type { Readable } from 'svelte/store';
  import type { User } from './types';

  const { currentUser } = getContext<{
    currentUser: Readable<User | null>;
  }>('auth');
</script>

{#if $currentUser}
  <slot />
{:else}
  <p>Silakan masuk untuk mengakses konten ini.</p>
{/if}
```

### Langkah 4: Membangun Form dengan Progressive Enhancement dan Aksesibilitas

Gunakan form actions SvelteKit dengan progressive enhancement untuk formulir yang berfungsi tanpa JavaScript dan meningkat secara progresif saat JS tersedia:

```typescript
// src/routes/login/+page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const email = data.get('email')?.toString() ?? '';
    const password = data.get('password')?.toString() ?? '';

    if (!email || !password) {
      return fail(400, {
        error: 'Email dan password wajib diisi.',
        fields: { email }
      });
    }

    try {
      const user = await locals.auth.login(email, password);
      return { success: true, user };
    } catch (err) {
      return fail(401, {
        error: 'Kredensial tidak valid.',
        fields: { email }
      });
    }
  }
} satisfies Actions;
```

```svelte
<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let { form, data } = $props();
</script>

<form method="POST" use:enhance>
  <label for="email">Email</label>
  <input
    id="email"
    name="email"
    type="email"
    required
    aria-describedby={form?.error ? 'form-error' : undefined}
    value={form?.fields?.email ?? ''}
  />

  <label for="password">Password</label>
  <input
    id="password"
    name="password"
    type="password"
    required
    autocomplete="current-password"
  />

  {#if form?.error}
    <p id="form-error" role="alert" class="error">{form.error}</p>
  {/if}

  <button type="submit">Masuk</button>
</form>
```

Aksi `use:enhance` meningkatkan form secara progresif — ia berfungsi tanpa JavaScript (reload halaman penuh) dan menyediakan pengiriman client-side yang mulus saat JS tersedia.

### Langkah 5: Menulis Pengujian di Setiap Lapisan

Siapkan strategi pengujian yang mencakup unit test, component test, dan E2E test:

**Unit test** untuk store:

```typescript
// src/lib/features/auth/store.test.ts
import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { currentUser, isAuthenticated } from './store';

describe('auth store', () => {
  it('dimulai tanpa user', () => {
    expect(get(currentUser)).toBeNull();
    expect(get(isAuthenticated)).toBe(false);
  });

  it('melacak state autentikasi', () => {
    currentUser.set({ id: '1', name: 'Alice', email: 'alice@example.com' });
    expect(get(isAuthenticated)).toBe(true);
    expect(get(currentUser)?.name).toBe('Alice');
  });
});
```

**Component test** dengan `svelte-testing-library`:

```typescript
// src/lib/components/Button.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
  it('merender dengan label', () => {
    render(Button, { props: { label: 'Submit' } });
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('menerapkan kelas varian', () => {
    const { container } = render(Button, {
      props: { label: 'Hapus', variant: 'danger' }
    });
    expect(container.querySelector('button')?.className).toContain('danger');
  });
});
```

**E2E test** dengan Playwright:

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test('pengguna dapat masuk dengan kredensial valid', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'correct-password');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Dashboard')).toBeVisible();
});
```

Jalankan semua pengujian bersamaan:

```bash
npm run check    # Type-check SvelteKit
npm run test:unit
npm run test:e2e
```

### Langkah 6: Mengonfigurasi Deployment Produksi dengan Adapter

SvelteKit menggunakan adapter untuk men-deploy ke platform yang berbeda. Pilih yang sesuai dengan lingkungan hosting Anda:

```bash
# Hosting Node.js (self-managed atau Railway, Render, dll.)
npm install -D @sveltejs/adapter-node

# Hosting statis (Netlify, Vercel, Cloudflare Pages)
npm install -D @sveltejs/adapter-static

# Serverless (Vercel, Netlify Functions)
npm install -D @sveltejs/adapter-vercel
# atau
npm install -D @sveltejs/adapter-netlify
```

Konfigurasikan di `svelte.config.js`:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: {
        files: ['html', 'js', 'css', 'svg'],
        brotli: true
      }
    })
  }
};

export default config;
```

Build dan preview build produksi:

```bash
npm run build
npm run preview
```

Setel variabel environment `PORT` dan `ORIGIN` di server produksi:

```bash
PORT=3000 ORIGIN=https://myapp.example.com node build/index.js
```

### Langkah 7: Mengintegrasikan Pemeriksaan Aksesibilitas di CI

Tambahkan pengujian aksesibilitas otomatis ke pipeline CI Anda menggunakan integrasi axe-core Playwright:

```typescript
// tests/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('halaman utama tidak memiliki pelanggaran aksesibilitas', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

```yaml
# .github/workflows/ci.yml (cuplikan contoh)
- name: Run Playwright tests
  run: npx playwright test
- name: Run accessibility audit
  run: npx playwright test tests/a11y.spec.ts
```

### Langkah 8: Menerapkan Anggaran Performa

Pantau dan terapkan anggaran ukuran bundle di CI. Tambahkan pemeriksaan `budget` ke konfigurasi build Anda:

```javascript
// vite.config.ts (di dalam konfigurasi sveltekit atau vite config)
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte', 'sveltekit']
        }
      }
    },
    chunkSizeWarningLimit: 100 // KB
  }
});
```

Gunakan komponen `svelte:head` untuk lazy-load sumber daya non-kritis:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let heavyChartComponent: any;

  onMount(async () => {
    heavyChartComponent = (await import('./HeavyChart.svelte')).default;
  });
</script>

<svelte:head>
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" crossorigin />
</svelte:head>
```

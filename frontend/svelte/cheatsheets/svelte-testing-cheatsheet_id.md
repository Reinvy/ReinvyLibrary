---
title: "Cheat Sheet Pengujian Svelte"
description: "Referensi cepat untuk menguji aplikasi Svelte dan SvelteKit — konfigurasi Vitest, rendering komponen dengan Testing Library, pengujian rune dan store, pengujian load function serta form action, mocking modul, dan alur end-to-end dengan Playwright."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Pengujian Svelte

## Tabel Referensi Cepat

| Tujuan | Kode / Perintah | Deskripsi |
|--------|-----------------|-----------|
| Membuat proyek siap uji | `npx sv create my-app` | Pilih Vitest dan Playwright pada prompt CLI |
| Memasang paket unit test | `npm i -D vitest @testing-library/svelte @testing-library/jest-dom jsdom` | Vitest plus query DOM dan matcher |
| Menjalankan seluruh suite sekali | `npx vitest run` | Satu kali jalan, mode yang dipakai CI |
| Mode watch | `npx vitest` | Menjalankan ulang berkas yang berubah saat disimpan |
| Menjalankan satu berkas | `npx vitest run src/lib/Counter.test.ts` | Umpan balik cepat saat menulis kode |
| Menjalankan test berdasarkan nama | `npx vitest run -t "increments the counter"` | Mencocokkan deskripsi `it`/`test` |
| Laporan coverage | `npx vitest run --coverage` | Membutuhkan `@vitest/coverage-v8` |
| Merender komponen | `render(Counter, { props: { start: 3 } })` | Me-mount ke container terpisah |
| Query berbasis aksesibilitas | `screen.getByRole('button', { name: /increment/i })` | Lebih disukai daripada `getByTestId` |
| Mengetik seperti pengguna | `await userEvent.click(button)` | Memicu urutan event yang sebenarnya |
| Memaksa pembaruan reaktif | `flushSync()` | Menjalankan effect yang masih tertunda |
| Memeriksa teks DOM | `expect(el).toHaveTextContent('Count: 3')` | Matcher dari `jest-dom` |
| Membersihkan antar test | `afterEach(() => cleanup())` | Me-unmount komponen dan mereset DOM |
| Suite browser | `npx playwright test` | Menjalankan berkas di dalam `tests/` |

## Perintah Umum

### Menyiapkan Proyek yang Siap Diuji

```bash
# Membuat proyek SvelteKit lalu pilih Vitest dan Playwright pada prompt
npx sv create my-app

# Alternatif: menambahkan paket unit test ke proyek yang sudah ada
npm install -D vitest @testing-library/svelte @testing-library/jest-dom jsdom @vitest/coverage-v8

# Menambahkan Playwright untuk pengujian tingkat browser
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

### Merangkai Skrip Pengujian

```bash
# Daftarkan skrip agar CI dan kontributor memakai perintah yang sama
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.test:coverage="vitest run --coverage"
npm pkg set scripts.test:e2e="playwright test"

# Verifikasi rangkaian skrip
npm test -- --reporter=dot
```

### Menjalankan dan Menyaring Test

```bash
# Menjalankan semua unit test sekali
npx vitest run

# Menjalankan ulang saat berkas berubah selama pengembangan
npx vitest --watch

# Menargetkan satu berkas saja
npx vitest run src/lib/components/Counter.test.ts

# Menargetkan test yang namanya cocok dengan pola
npx vitest run -t "increments the counter"

# Melihat test paling lambat untuk menemukan beban pada suite
npx vitest run --reporter=verbose
```

### Coverage, Tipe, dan CI

```bash
# Mengumpulkan coverage dengan provider v8
npx vitest run --coverage

# Memeriksa tipe komponen, test, dan route types hasil generate sekaligus
npx svelte-check --tsconfig ./tsconfig.json

# Menjalankan test browser secara headless terhadap build produksi
npx playwright test --reporter=github
```

## Potongan Kode

### Konfigurasi Vitest

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
});
```

### Setup Test Global

```typescript
// vitest-setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
```

### Merender Komponen dengan Props

```svelte
<!-- src/lib/Counter.svelte -->
<script lang="ts">
  let { start = 0 }: { start?: number } = $props();
  let count = $state(start);
</script>

<button onclick={() => count++}>Count: {count}</button>
```

```typescript
// src/lib/Counter.test.ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Counter from './Counter.svelte';

describe('Counter', () => {
  it('merender nilai awal dari props', () => {
    render(Counter, { props: { start: 3 } });
    expect(screen.getByRole('button')).toHaveTextContent('Count: 3');
  });

  it('menambah nilai saat diklik', async () => {
    const user = userEvent.setup();
    render(Counter);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveTextContent('Count: 1');
  });
});
```

### Mensimulasikan Interaksi Pengguna

```svelte
<!-- src/lib/SearchBox.svelte -->
<script lang="ts">
  let { onsearch }: { onsearch?: (query: string) => void } = $props();
  let query = $state('');
</script>

<form
  onsubmit={(event) => {
    event.preventDefault();
    onsearch?.(query.trim());
  }}
>
  <input bind:value={query} aria-label="Search" />
  <button type="submit">Search</button>
</form>
```

```typescript
// src/lib/SearchBox.test.ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import SearchBox from './SearchBox.svelte';

it('mengirim query yang sudah di-trim ke props callback', async () => {
  const user = userEvent.setup();
  const calls: string[] = [];

  render(SearchBox, { props: { onsearch: (query: string) => calls.push(query) } });

  await user.type(screen.getByLabelText('Search'), '  svelte  ');
  await user.click(screen.getByRole('button', { name: 'Search' }));

  expect(calls).toEqual(['svelte']);
});
```

### Menguji Rune dan State Reaktif

```typescript
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { expect, it } from 'vitest';
import FilteredList from './FilteredList.svelte';
import { createCounter } from './counter.svelte';

it('menghitung ulang daftar turunan setelah state berubah', async () => {
  const user = userEvent.setup();
  render(FilteredList, { props: { items: ['alpha', 'beta', 'gamma'] } });

  await user.type(screen.getByRole('searchbox'), 'alp');
  flushSync();

  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

it('melacak penambahan nilai pada class berbasis rune', () => {
  const counter = createCounter(2);
  counter.increment();

  expect(counter.count).toBe(3);
  expect(counter.doubled).toBe(6);
});
```

```typescript
// src/lib/counter.svelte.ts — rune diperbolehkan di modul .svelte.ts
export function createCounter(start = 0) {
  let count = $state(start);

  return {
    get count() {
      return count;
    },
    get doubled() {
      return count * 2;
    },
    increment() {
      count += 1;
    },
  };
}
```

### Menguji Snippet dan Konten Slot

```svelte
<!-- src/lib/CardHarness.svelte -->
<script lang="ts">
  import Card from './Card.svelte';
</script>

<Card title="Release notes">
  {#snippet children()}
    <p>Body text</p>
  {/snippet}
</Card>
```

```typescript
// src/lib/Card.test.ts
import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';
import CardHarness from './CardHarness.svelte';

it('merender konten snippet yang disediakan komponen harness', () => {
  render(CardHarness);

  expect(screen.getByRole('heading', { name: 'Release notes' })).toBeInTheDocument();
  expect(screen.getByText('Body text')).toBeInTheDocument();
});
```

### Menguji Store

```typescript
// src/lib/cart.test.ts
import { get } from 'svelte/store';
import { beforeEach, expect, it } from 'vitest';
import { addItem, cart, clearCart } from './cart';

beforeEach(() => clearCart());

it('menghitung total dari item di dalam store', () => {
  addItem({ sku: 'tea', price: 4 });
  addItem({ sku: 'mug', price: 9 });

  expect(get(cart).total).toBe(13);
});
```

### Menguji Load Function SvelteKit

```typescript
// src/routes/posts/[slug]/page.server.test.ts
import { expect, it, vi } from 'vitest';
import { load } from './+page.server';
import type { PageServerLoadEvent } from './$types';

const createEvent = (slug: string) =>
  ({
    params: { slug },
    url: new URL(`http://localhost/posts/${slug}`),
    locals: { user: null },
    fetch: vi.fn(),
    cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  }) as unknown as PageServerLoadEvent;

it('mengembalikan post untuk slug yang dikenal', async () => {
  const result = await load(createEvent('hello-world'));

  expect(result).toMatchObject({ post: { slug: 'hello-world' } });
});
```

### Menguji Form Action

```typescript
// src/routes/signup/page.server.test.ts
import { expect, it, vi } from 'vitest';
import { actions } from './+page.server';

it('menolak alamat email kosong', async () => {
  const form = new FormData();
  form.set('email', '');

  const result = await actions.default({
    request: new Request('http://localhost/signup', { method: 'POST', body: form }),
    url: new URL('http://localhost/signup'),
    params: {},
    locals: {},
    cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  } as never);

  expect(result).toEqual({ status: 400, data: { error: 'Email wajib diisi' } });
});
```

### Mocking Modul dan Fetch

```typescript
import { beforeEach, expect, it, vi } from 'vitest';
import { load } from './+page.server';

vi.mock('$lib/server/mailer', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ id: 'msg_1' }),
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
});

it('memanggil layanan harga melalui fetch yang diinjeksi', async () => {
  const result = await load({ fetch: globalThis.fetch } as never);

  expect(result).toMatchObject({ price: 42 });
});
```

### End-to-End dengan Playwright

```typescript
// tests/checkout.spec.ts
import { expect, test } from '@playwright/test';

test('menyelesaikan alur checkout', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('link', { name: 'Tea sampler' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.goto('/checkout');
  await expect(page).toHaveURL(/checkout/);
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();
});
```

### Asersi Aksesibilitas

```bash
# Memasang integrasi axe untuk Playwright
npm install -D @axe-core/playwright
```

```typescript
// tests/a11y.spec.ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('halaman produk tidak memiliki pelanggaran aksesibilitas terdeteksi', async ({ page }) => {
  await page.goto('/products');

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
```

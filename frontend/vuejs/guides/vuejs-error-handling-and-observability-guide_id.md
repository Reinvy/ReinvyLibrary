---
title: "Panduan Penanganan Error dan Observabilitas Vue.js"
description: "Panduan lanjutan untuk membuat aplikasi Vue.js 3 gagal secara terlihat dan teramati: global error handler, batas onErrorCaptured, permukaan error asinkron dan router, correlation ID, klien HTTP dengan retry, transport telemetri terstruktur, integrasi Sentry dan OpenTelemetry, Web Vitals, serta alert berbasis gejala."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Penanganan Error dan Observabilitas Vue.js

## Pendahuluan

Aplikasi single-page Vue.js 3 adalah runtime yang hidup di browser milik orang lain. Ketika sebuah komponen melempar error saat render, sebuah watcher mengalami rejection, atau sebuah action store gagal setelah pengguna menekan "Bayar", halaman biasanya tidak benar-benar crash — ia diam-diam merender panel kosong, mencetak satu baris merah di console yang tidak dibaca siapa pun, lalu terus menerima klik. Pengguna melihat produk yang rusak; tim tidak melihat apa pun sampai tiket dukungan datang tiga hari kemudian.

Menangani error dan mengamati frontend adalah dua sisi dari satu disiplin yang sama. Penanganan error memutuskan apa yang *dilakukan* aplikasi saat terjadi kegagalan: permukaan mana yang menangkapnya, apakah pengguna mendapat tombol coba lagi atau fallback, dan apakah kegagalan itu dibiarkan merusak state aplikasi. Observabilitas memutuskan apa yang *diberitahukan* aplikasi kepada Anda: event terstruktur, correlation ID yang menghubungkan browser ke request API, span trace, dan metrik yang menunjukkan tingkat kegagalan naik pada satu versi browser tetapi tidak pada versi lain.

Panduan ini membahas kedua sisi dengan pola konkret dan dapat dijalankan untuk aplikasi Vue 3 yang dibangun dengan Vite, TypeScript, Pinia, dan Vue Router. Isinya melampaui sekadar "tambahkan global error handler": Anda akan membangun taksonomi error, batas penahan kegagalan, correlation ID yang bertahan melewati lompatan klien-ke-server, transport telemetri berkelompok yang menghormati privasi pengguna, integrasi Sentry dan OpenTelemetry, instrumentasi Web Vitals, serta alert yang menyala berdasarkan gejala yang terlihat pengguna, bukan jumlah error mentah.

## Praktik Terbaik

### 1. Pasang Global Handler sebagai Lapisan Terakhir, Bukan yang Pertama

`app.config.errorHandler` menangkap error yang dilempar selama render, lifecycle hook, watcher, dan event handler yang dimiliki Vue. Handler ini wajib ada — tetapi ia adalah jaring pengaman terakhir, bukan strateginya. Handler yang menerima semua error tanpa konteks lokal akan menghasilkan laporan seperti "Cannot read properties of undefined" tanpa tahu layar mana yang sedang dibuka pengguna. Pasang sejak hari pertama, lalu perlakukan setiap error yang sampai ke sana sebagai cacat pada desain penanganan error Anda: ada sesuatu yang gagal di tempat yang seharusnya ditangkap batas komponen dengan konteks lebih baik.

### 2. Ketahui Permukaan Mana yang Menangani Kegagalan Mana

Vue menyediakan beberapa permukaan kegagalan yang berbeda, dan masing-masing butuh hook berbeda. Salah menebak adalah alasan paling umum sebuah error tidak pernah terlaporkan.

```text
Permukaan                      Hook yang menangkapnya
-----------------------------  ----------------------------------------------
Render / setup komponen        app.config.errorHandler, onErrorCaptured
Lifecycle hook, watcher        app.config.errorHandler, onErrorCaptured
Event handler di template      app.config.errorHandler, onErrorCaptured
Async setup (Suspense)         onErrorCaptured pada batas yang membungkusnya
await di dalam composable      try/catch milik pemanggil (Vue tidak memilikinya)
Rejection promise menggantung  window 'unhandledrejection'
Route guard / pemuatan chunk   router.onError, router.isReady().catch()
Status fetch / XHR gagal       lapisan klien HTTP Anda
Peringatan Vue (hanya dev)     app.config.warnHandler
```

Baris keempat pada tabel itu adalah kuncinya: Vue hanya menangkap error pada call stack sinkron yang ia panggil sendiri. Begitu kode melakukan await, kendali keluar dari kepemilikan Vue dan sebuah rejection tidak akan mencapai handler global kecuali ia berubah menjadi unhandled rejection di tingkat browser.

### 3. Letakkan Batas di Tingkat View, Bukan di Setiap Komponen

Bungkus setiap view yang dirutekan (dan widget yang dideploy terpisah seperti panel checkout atau tile dashboard real-time) dengan komponen batas. Batas per `<div>` melipatgandakan boilerplate dan menyembunyikan error satu level terlalu dalam; satu batas di akar aplikasi berarti satu kegagalan mengosongkan seluruh shell, termasuk navigasi yang dibutuhkan pengguna untuk pulih.

### 4. Jangan Pernah Meninggalkan Promise Tanpa Await

Promise menggantung adalah error yang menghilang. Aktifkan `@typescript-eslint/no-floating-promises` dan perlakukan hasilnya sebagai kegagalan build, bukan peringatan. Setiap pemanggilan action store, metode klien API, atau chunk yang diimpor dinamis harus di-await, ditangkap, atau ditandai `void` secara eksplisit dengan jalur error yang jelas.

### 5. Klasifikasikan Sebelum Melaporkan

Tidak semua kegagalan adalah insiden. Pisahkan error menjadi tiga kelas dan arahkan masing-masing secara berbeda: kegagalan *terduga* (validasi, 401 setelah token kedaluwarsa, 404, offline), kegagalan *dapat dipulihkan* (timeout, 5xx pada operasi baca, kehilangan jaringan sesaat), dan *cacat* (crash render, akses undefined, ketidakcocokan skema, unhandled rejection). Kegagalan terduga masuk ke analitik produk, kegagalan yang dapat dipulihkan masuk ke jalur retry disertai metrik, dan cacat masuk ke pelacak error dengan konteks penuh. Mencampur ketiganya dalam satu aliran adalah alasan tim membisukan kanal alert mereka.

### 6. Kirim Konteks, Bukan Hanya Pesan

Laporan error tanpa rute, nama komponen, SHA build, dan beberapa aksi terakhir pengguna hampir tidak berguna. Lampirkan payload ternormalisasi: kelas error, pesan, stack, nama dan parameter rute (yang sudah disensor), nama komponen, versi aplikasi dan SHA git, browser serta locale, ditambah ring buffer breadcrumb terbatas berisi dua puluh aksi pengguna dan panggilan API terakhir.

### 7. Beri Correlation ID pada Setiap Request

Buat ID di sisi klien per aksi pengguna (bukan per request HTTP) dan kirim sebagai `X-Correlation-Id`. Catat ID itu di payload telemetri browser dan minta backend menggemakannya ke log mereka. Ketika pengguna melaporkan "gagal saat checkout", satu ID tersebut menghubungkan klik, error browser, request API, stack trace server, dan query database.

### 8. Degradasi dengan Anggun, dan Retry Hanya yang Aman

Kegagalan yang baik menjaga aplikasi tetap bisa dipakai: tampilkan panel fallback dengan tombol coba lagi, biarkan navigasi di sekitarnya hidup, dan pertahankan input yang belum tersimpan. Retry operasi baca dan penulisan idempoten dengan exponential backoff plus jitter; jangan pernah secara buta me-retry endpoint `POST` yang menghasilkan efek samping bernilai uang kecuali endpoint tersebut menerima idempotency key. Batasi jumlah retry, lalu tampilkan pesan yang jelas alih-alih berputar tanpa akhir.

### 9. Perlakukan Telemetri sebagai Data Pribadi

Payload error rutin membocorkan email di dalam pesan, token di URL, dan potongan nomor kartu di body request. Sensor sebelum mengirim: buang query string pada rute sensitif, redaksi nama field yang diketahui, potong body, dan jangan pernah mengirim `localStorage` atau nilai formulir secara utuh. Hormati status persetujuan pengguna, dan simpan daftar putih (allowlist) yang terdokumentasi tentang apa saja yang boleh ada di payload.

### 10. Sampling dan Batching Pipeline Klien

Telemetri tidak boleh menjadi alasan aplikasi lambat. Buffer event di memori, kirim saat timer habis atau saat buffer penuh, dan gunakan `navigator.sendBeacon` selama `pagehide` agar event terakhir selamat dari navigasi. Lakukan sampling agresif pada event verbose (perubahan rute, request sukses) tetapi pertahankan cacat pada laju penuh — lonjakan volume saat insiden justru saat paling membutuhkan data cacat yang lengkap.

### 11. Instrumentasi Perjalanan Pengguna, Bukan Hanya Crash

Error tanpa konteks di sekitarnya tidak bisa diprioritaskan. Catat perjalanan pengguna — page view, event bisnis penting, latensi API, dan Web Vitals seperti LCP dan INP — sehingga laporan cacat menunjukkan apa yang sedang dicoba pengguna dan apakah halaman sudah lambat sebelumnya. Kegagalan checkout pada halaman dengan LCP 4 detik adalah masalah berbeda dari kegagalan yang sama pada halaman cepat.

### 12. Alert pada Gejala, Tutup Lingkaran dengan Tes

Alert pada hasil yang terlihat pengguna — rasio error per sesi, tingkat keberhasilan checkout, rasio kegagalan per rute — bukan jumlah mentah yang ikut naik seiring trafik dan jam sibuk. Lalu tutup lingkarannya: setiap cacat yang sampai ke produksi mendapat tes regresi, batas komponen yang seharusnya menangkapnya lebih awal, atau entri known-issue terdokumentasi dengan pemilik yang jelas.

## Langkah Implementasi

### Langkah 1: Definisikan Taksonomi Error dan Kontrak Telemetri

Mulai dari tipe, karena semua langkah berikutnya bergantung padanya. Taksonomi adalah discriminated union: field `kind` menentukan apakah sebuah error di-retry, ditampilkan ke pengguna, atau dilaporkan sebagai cacat.

```typescript
// src/telemetry/types.ts
export type ErrorKind = 'expected' | 'recoverable' | 'defect';

export interface TelemetryContext {
  correlationId: string;
  routeName: string;
  routeParams: Record<string, string>;
  component?: string;
  appVersion: string;
  gitSha: string;
  sessionId: string;
}

export interface TelemetryEvent {
  type: 'error' | 'event' | 'metric';
  name: string;
  kind?: ErrorKind;
  message?: string;
  stack?: string;
  durationMs?: number;
  value?: number;
  breadcrumbs?: Array<{ at: number; action: string; detail?: string }>;
  context: TelemetryContext;
  timestamp: number;
}
```

Selanjutnya buat helper tingkat aplikasi yang menandai setiap event secara konsisten. Membaca nilai dari `import.meta.env` milik Vite menjaga versi dan SHA di satu tempat.

```typescript
// src/telemetry/trace.ts
let counter = 0;

export function newCorrelationId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${(counter++).toString(36)}-${random}`;
}

export function newSessionId(): string {
  const key = 'telemetry.session';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const created = newCorrelationId();
  sessionStorage.setItem(key, created);
  return created;
}
```

Jaga buffer breadcrumb tetap kecil dan terbatas; log tanpa batas adalah kebocoran memori yang mereproduksi dirinya sendiri di setiap laporan.

```typescript
// src/telemetry/breadcrumbs.ts
export interface Breadcrumb {
  at: number;
  action: string;
  detail?: string;
}

const MAX = 20;
const buffer: Breadcrumb[] = [];

export function addBreadcrumb(action: string, detail?: string): void {
  buffer.push({ at: Date.now(), action, detail });
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...buffer];
}
```

### Langkah 2: Normalisasi Error ke Bentuk yang Seragam

Browser menghasilkan error dalam sedikitnya empat bentuk: `Error`, `DOMException`, string yang di-reject, dan pembungkus axios/fetch. Normalisasi sekali di batas, agar kode di hilir tidak pernah bercabang berdasarkan bentuknya.

```typescript
// src/telemetry/normalize.ts
export interface NormalizedError {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

export function normalizeError(value: unknown): NormalizedError {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack, cause: value.cause };
  }
  if (typeof value === 'string') {
    return { name: 'StringRejection', message: value };
  }
  if (value && typeof value === 'object') {
    const candidate = value as { message?: unknown; name?: unknown };
    return {
      name: typeof candidate.name === 'string' ? candidate.name : 'UnknownObject',
      message: typeof candidate.message === 'string' ? candidate.message : JSON.stringify(value).slice(0, 500),
    };
  }
  return { name: 'Unknown', message: String(value) };
}
```

Klasifikasi diletakkan tepat di samping normalisasi, mengacu pada status HTTP dan sekumpulan kecil kode aplikasi.

```typescript
// src/telemetry/classify.ts
import type { ErrorKind } from './types';

export function classifyHttpStatus(status: number): ErrorKind {
  if (status === 401 || status === 403) return 'expected';
  if (status === 404 || status === 422 || status === 429) return 'expected';
  if (status >= 500) return 'recoverable';
  return 'defect';
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
```

### Langkah 3: Pasang Global Handler dan Warning Handler

Global handler sengaja dibuat sederhana: normalisasi, lampirkan konteks, teruskan ke transport, dan jangan pernah melempar ulang (melempar di dalam handler menghasilkan loop tak berujung pada sebagian browser).

```typescript
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { reportError } from './telemetry/report';
import { normalizeError } from './telemetry/normalize';

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  const normalized = normalizeError(err);
  reportError({
    ...normalized,
    kind: 'defect',
    component: instance?.$options.name ?? 'anonymous',
    detail: info,
  });
};

app.config.warnHandler = (msg, instance, trace) => {
  if (import.meta.env.PROD) {
    reportError({ name: 'VueWarning', message: msg, kind: 'defect', detail: trace });
    return;
  }
  console.warn(msg, trace);
};

app.use(router);
app.mount('#app');
```

Perhatikan pemisahan berdasarkan environment pada warning handler: peringatan adalah kebisingan saat pengembangan dan merupakan cacat saat produksi, karena build produksi seharusnya tidak pernah memunculkannya.

### Langkah 4: Bangun Komponen Batas dengan Fallback yang Nyata

`onErrorCaptured` memungkinkan sebuah subtree menyerap kegagalan, melaporkannya dengan konteks komponen, dan merender fallback alih-alih layar kosong. Mengembalikan `false` menghentikan propagasi ke handler global — lakukan itu hanya jika batas benar-benar berhasil memulihkan keadaan.

```vue
<!-- src/components/ErrorBoundary.vue -->
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import { reportError } from '@/telemetry/report';
import { normalizeError } from '@/telemetry/normalize';

const props = defineProps<{ name: string; title?: string }>();
const failed = ref(false);
const lastMessage = ref('');

onErrorCaptured((err, instance, info) => {
  const normalized = normalizeError(err);
  lastMessage.value = normalized.message;
  failed.value = true;
  reportError({
    ...normalized,
    kind: 'defect',
    component: props.name,
    detail: info,
  });
  return false;
});

function reset() {
  failed.value = false;
  lastMessage.value = '';
}
</script>

<template>
  <div v-if="failed" class="boundary-fallback" role="alert">
    <h2>{{ title ?? 'Bagian ini gagal dimuat' }}</h2>
    <p class="boundary-detail">{{ lastMessage }}</p>
    <button type="button" @click="reset">Coba lagi</button>
    <a href="/support">Hubungi dukungan</a>
  </div>
  <slot v-else />
</template>
```

`role="alert"` membuat fallback diumumkan ke pembaca layar, dan tombol coba lagi memberi pengguna jalan keluar tanpa memuat ulang seluruh aplikasi.

### Langkah 5: Tangani Permukaan Asinkron yang Tidak Dimiliki Vue

Ada tiga permukaan asinkron yang lolos dari batas komponen: route guard dan pemuatan chunk lambat, rejection promise menggantung, serta error yang dilempar setelah `await` di dalam composable. Tangani masing-masing secara eksplisit.

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { reportError } from '@/telemetry/report';
import { normalizeError } from '@/telemetry/normalize';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/views/CheckoutView.vue'),
    },
  ],
});

router.onError((err, to) => {
  const normalized = normalizeError(err);
  const isChunkError = /dynamically imported module|Loading chunk/i.test(normalized.message);
  reportError({
    ...normalized,
    kind: isChunkError ? 'recoverable' : 'defect',
    component: 'router',
    detail: `navigasi ke ${to.fullPath}`,
  });
});
```

Chunk yang gagal dimuat setelah deploy adalah bug klasik "layar putih pada tab lama". Perlakukan sebagai kegagalan yang dapat dipulihkan dan paksa satu kali reload dengan penjaga cache-busting, alih-alih melaporkannya sebagai cacat setiap kali.

```typescript
// src/telemetry/global-listeners.ts
import { addBreadcrumb } from './breadcrumbs';
import { reportError } from './report';
import { normalizeError } from './normalize';

const RELOAD_KEY = 'chunk.reloadAt';

export function installGlobalListeners(): void {
  window.addEventListener('unhandledrejection', (event) => {
    const normalized = normalizeError(event.reason);
    const chunkFailure = /dynamically imported module|Loading chunk/i.test(normalized.message);

    if (chunkFailure) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
        return;
      }
    }

    reportError({ ...normalized, kind: 'defect', component: 'window' });
  });

  window.addEventListener('error', (event) => {
    const normalized = normalizeError(event.error ?? event.message);
    reportError({ ...normalized, kind: 'defect', component: 'window' });
  });

  addBreadcrumb('app:listeners-installed');
}
```

Composable yang melakukan await butuh penjaga sendiri, karena rejection-nya tidak pernah mencapai Vue. Wrapper kecil menjaga setiap titik pemanggilan tetap benar.

```typescript
// src/utils/guard.ts
import { reportError } from '@/telemetry/report';
import { normalizeError } from '@/telemetry/normalize';

export async function guard<T>(
  label: string,
  task: () => Promise<T>,
  fallback?: T,
): Promise<T | undefined> {
  try {
    return await task();
  } catch (err) {
    const normalized = normalizeError(err);
    reportError({ ...normalized, kind: 'recoverable', component: label });
    return fallback;
  }
}
```

### Langkah 6: Bungkus Klien HTTP dengan Correlation ID dan Retry yang Aman

Di sinilah sebagian besar kegagalan nyata berasal, dan di sinilah correlation ID dibuat. Retry hanya metode idempoten, gunakan backoff dengan jitter, dan berhenti dengan error bertipe yang bisa dirender UI.

```typescript
// src/api/client.ts
import { newCorrelationId } from '@/telemetry/trace';
import { addBreadcrumb } from '@/telemetry/breadcrumbs';
import { classifyHttpStatus } from '@/telemetry/classify';
import { reportError } from '@/telemetry/report';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly correlationId: string,
    readonly kind: ReturnType<typeof classifyHttpStatus>,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const RETRYABLE = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

function backoff(attempt: number): number {
  const base = Math.min(2000, 200 * 2 ** attempt);
  return base + Math.random() * 200;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  maxRetries = 2,
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const correlationId = init.headers instanceof Headers
    ? init.headers.get('X-Correlation-Id') ?? newCorrelationId()
    : newCorrelationId();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const started = performance.now();
    try {
      const response = await fetch(path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers as Record<string, string> | undefined),
          'X-Correlation-Id': correlationId,
        },
      });

      addBreadcrumb('http', `${method} ${path} -> ${response.status}`);

      if (response.ok) {
        return (await response.json()) as T;
      }

      const kind = classifyHttpStatus(response.status);
      const body = await response.text();

      if (kind === 'recoverable' && RETRYABLE.has(method) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoff(attempt)));
        continue;
      }

      const error = new HttpError(response.status, correlationId, kind, body.slice(0, 300));
      if (kind === 'defect') {
        reportError({
          name: error.name,
          message: error.message,
          kind: 'defect',
          component: 'api',
          durationMs: performance.now() - started,
        });
      }
      throw error;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      if (err instanceof HttpError) throw err;
      if (isLastAttempt) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        reportError({
          ...normalized,
          kind: 'recoverable',
          component: 'api',
          detail: `${method} ${path} setelah ${attempt + 1} percobaan`,
          durationMs: performance.now() - started,
        });
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, backoff(attempt)));
    }
  }

  throw new Error(`tidak tercapai: retry habis untuk ${method} ${path}`);
}
```

Action store kemudian memanggil `request` dan membiarkan kegagalan terduga mengalir ke state UI, bukan ke pelacak error.

```typescript
// src/stores/checkout.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { request, HttpError } from '@/api/client';
import { reportError } from '@/telemetry/report';

export const useCheckoutStore = defineStore('checkout', () => {
  const submitting = ref(false);
  const errorMessage = ref<string | null>(null);

  async function submit(payload: { cartId: string; paymentToken: string }) {
    submitting.value = true;
    errorMessage.value = null;
    try {
      await request('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ ...payload, idempotencyKey: crypto.randomUUID() }),
      });
      return true;
    } catch (err) {
      if (err instanceof HttpError && err.kind === 'expected') {
        errorMessage.value = 'Metode pembayaran itu tidak dapat diproses. Silakan periksa data Anda.';
        return false;
      }
      reportError({
        name: 'CheckoutSubmitFailed',
        message: err instanceof Error ? err.message : String(err),
        kind: 'recoverable',
        component: 'checkout-store',
      });
      errorMessage.value = 'Terjadi kesalahan saat membuat pesanan. Silakan coba lagi.';
      return false;
    } finally {
      submitting.value = false;
    }
  }

  return { submitting, errorMessage, submit };
});
```

### Langkah 7: Kirim Event Melalui Transport yang Di-batch dan Disensor

Transport memegang tiga tanggung jawab: penyensoran, batching, dan pengiriman. Jaga agar ia tidak bergantung pada SDK vendor mana pun sehingga Anda bisa menambahkan Sentry atau OpenTelemetry nanti tanpa menyentuh titik pemanggilan.

```typescript
// src/telemetry/transport.ts
import type { TelemetryEvent } from './types';

const ENDPOINT = '/api/telemetry';
const FLUSH_MS = 5000;
const MAX_BATCH = 25;

let queue: TelemetryEvent[] = [];
let timer: number | undefined;

const REDACT_KEYS = ['password', 'token', 'authorization', 'card', 'cvv', 'email'];

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      REDACT_KEYS.some((needle) => key.toLowerCase().includes(needle)) ? '[redacted]' : scrub(entry, depth + 1),
    ]),
  );
}

function deliver(events: TelemetryEvent[]) {
  const body = JSON.stringify({ events: scrub(events) });
  if (navigator.sendBeacon && document.visibilityState === 'hidden') {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Kegagalan telemetri tidak boleh muncul ke pengguna.
  });
}

export function enqueue(event: TelemetryEvent): void {
  queue.push(event);
  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }
  if (timer === undefined) {
    timer = window.setTimeout(flush, FLUSH_MS);
  }
}

export function flush(): void {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  deliver(batch);
}

export function installFlushOnHide(): void {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
```

Sampling berada di atas transport agar satu kelas event yang bising tidak membanjiri antrean. Cacat selalu lolos pada laju penuh.

```typescript
// src/telemetry/report.ts
import type { ErrorKind, TelemetryEvent } from './types';
import { enqueue } from './transport';
import { getBreadcrumbs } from './breadcrumbs';
import { getContext } from './context';

interface ErrorInput {
  name: string;
  message: string;
  stack?: string;
  kind: ErrorKind;
  component?: string;
  detail?: string;
  durationMs?: number;
}

const SAMPLE_RATE: Record<ErrorKind, number> = {
  defect: 1,
  recoverable: 0.5,
  expected: 0.05,
};

export function reportError(input: ErrorInput): void {
  const rate = SAMPLE_RATE[input.kind];
  if (Math.random() > rate) return;

  const event: TelemetryEvent = {
    type: 'error',
    name: input.name,
    kind: input.kind,
    message: input.message.slice(0, 1000),
    stack: input.stack?.slice(0, 4000),
    durationMs: input.durationMs,
    breadcrumbs: getBreadcrumbs(),
    context: getContext(input.component, input.detail),
    timestamp: Date.now(),
  };

  enqueue(event);
  if (input.kind === 'defect') console.error('[telemetry]', input.name, input.message);
}
```

### Langkah 8: Sambungkan Pelacak Error dan Tracing Terdistribusi

Dengan transport yang sudah ada, Sentry menjadi adaptor tipis, bukan arsitektur kedua. Inisialisasi sebelum `mount`, matikan integrasi bawaan yang sudah Anda tangani sendiri, dan lampirkan correlation ID sebagai tag agar laporan browser dan server bergabung pada kunci yang sama.

```typescript
// src/telemetry/sentry.ts
import * as Sentry from '@sentry/vue';
import type { App } from 'vue';
import type { Router } from 'vue-router';

export function initSentry(app: App, router: Router): void {
  if (!import.meta.env.PROD) return;

  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `${import.meta.env.VITE_APP_VERSION}+${import.meta.env.VITE_GIT_SHA}`,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0.2,
    beforeSend(event) {
      if (event.request?.url) event.request.url = event.request.url.split('?')[0];
      return event;
    },
  });
}
```

Untuk tim yang menstandarkan OpenTelemetry, correlation ID yang sama menjadi atribut span, dan awal pemanggilan API menjadi child span sehingga trace menyeberang ke kolektor backend.

```typescript
// src/telemetry/otel.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('vue-app', import.meta.env.VITE_APP_VERSION);

export async function withSpan<T>(
  name: string,
  correlationId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttribute('correlation.id', correlationId);
    span.setAttribute('app.version', import.meta.env.VITE_APP_VERSION);
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err instanceof Error ? err : String(err));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Langkah 9: Instrumentasi Perjalanan Pengguna dan Performa yang Dirasakan

Error menjelaskan apa yang rusak; metrik menjelaskan seberapa luas dampaknya. Laporkan perubahan rute dan Web Vitals agar sebuah cacat bisa diiris berdasarkan halaman, perangkat, dan kualitas koneksi.

```typescript
// src/telemetry/vitals.ts
import { onCLS, onINP, onLCP, onTTFB } from 'web-vitals';
import type { TelemetryEvent } from './types';
import { enqueue } from './transport';
import { getContext } from './context';

const reported = new Set<string>();

function sendMetric(name: string, value: number, rating: string): void {
  const key = `${name}:${Math.round(value)}`;
  if (reported.has(key)) return;
  reported.add(key);

  const event: TelemetryEvent = {
    type: 'metric',
    name,
    value,
    kind: 'expected',
    context: { ...getContext('web-vitals'), routeParams: { rating } },
    timestamp: Date.now(),
  };
  enqueue(event);
}

export function installVitals(): void {
  onLCP((metric) => sendMetric('lcp', metric.value, metric.rating));
  onINP((metric) => sendMetric('inp', metric.value, metric.rating));
  onCLS((metric) => sendMetric('cls', metric.value, metric.rating));
  onTTFB((metric) => sendMetric('ttfb', metric.value, metric.rating));
}
```

Pengukuran waktu per rute datang gratis dari router, dan itulah metrik yang paling sering menjelaskan laporan "aplikasi terasa rusak" tanpa error yang terlampir.

```typescript
// src/router/timing.ts
import type { Router } from 'vue-router';
import { addBreadcrumb } from '@/telemetry/breadcrumbs';
import { enqueue } from '@/telemetry/transport';
import { getContext } from '@/telemetry/context';

export function installRouteTiming(router: Router): void {
  let started = performance.now();

  router.beforeEach((to) => {
    started = performance.now();
    addBreadcrumb('route:start', String(to.name ?? to.path));
    return true;
  });

  router.afterEach((to) => {
    const durationMs = performance.now() - started;
    addBreadcrumb('route:end', `${String(to.name)} ${Math.round(durationMs)}ms`);
    enqueue({
      type: 'metric',
      name: 'route.transition',
      value: durationMs,
      kind: 'expected',
      context: getContext('router'),
      timestamp: Date.now(),
    });
  });
}
```

### Langkah 10: Alert pada Gejala dan Buktikan Pipeline Bekerja

Langkah terakhir bersifat operasional: tetapkan apa yang membangunkan on-call, dan verifikasi pipeline dari ujung ke ujung sebelum mempercayainya. Alert pada rasio, bukan jumlah — "kegagalan checkout di atas 3 persen sesi selama 5 menit" menangkap insiden nyata, sedangkan "500 error hari ini" menyala setiap hari kerja pukul dua belas siang.

```text
Sinyal                                    Kondisi                          Tindakan
----------------------------------------  -------------------------------  ------------------
Rasio cacat per rute                      > 2% sesi, 5 menit               Bangunkan on-call
Kegagalan submit checkout                 > 3% percobaan, 5 menit          Bangunkan on-call
Kegagalan pemuatan chunk                  > 1% navigasi, 15 menit          Ceklis deploy
Unhandled rejection                       tanda tangan baru, volume apa pun  Tiket
LCP p75 (mobile)                          > 2500 ms, 30 menit              Tiket
INP p75                                   > 200 ms, 30 menit               Tiket
Jeda ingestion telemetri                  nol event, 10 menit              Bangunkan platform
```

Lalu jalankan latihan kegagalan yang disengaja: lempar error dari rute debug tersembunyi, pastikan batas merender fallback, pastikan event tiba dengan correlation ID, breadcrumb, dan tag release, serta pastikan alert menyala di staging. Pipeline telemetri yang belum pernah dipicu hanyalah hipotesis, bukan sistem pemantauan.

```typescript
// src/telemetry/self-check.ts
import { reportError } from './report';
import { flush } from './transport';

export async function telemetrySelfCheck(): Promise<void> {
  reportError({
    name: 'TelemetrySelfCheck',
    message: 'Event latihan sintetis — aman untuk diabaikan',
    kind: 'defect',
    component: 'self-check',
  });
  flush();
  await new Promise((resolve) => setTimeout(resolve, 500));
}
```

Jalankan latihan itu di staging pada setiap rilis, dan sekali lagi setelah ada perubahan pada transport, penyensor, atau adaptor vendor.

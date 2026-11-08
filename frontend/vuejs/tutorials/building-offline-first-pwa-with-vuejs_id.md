---
title: "Membangun PWA Offline-First dengan Vue.js 3"
description: "Tutorial praktis mengubah aplikasi Vue 3 menjadi progressive web app offline-first dengan caching Workbox, persistensi IndexedDB, antrean outbox untuk sinkronisasi latar belakang, dan alur pembaruan service worker yang aman."
category: "frontend"
technology: "vuejs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun PWA Offline-First dengan Vue.js 3

## Ringkasan

Tutorial ini mengubah aplikasi single-page Vue.js 3 menjadi progressive web app yang tetap berfungsi ketika jaringan tidak tersedia. Anda akan memasang perkakas yang menghasilkan service worker, memilih strategi caching untuk setiap jenis request, menyimpan data domain di IndexedDB, mengantrekan mutasi yang dilakukan saat offline, memutarnya kembali melalui Background Sync API dengan kebijakan retry yang deterministik, menyelesaikan konflik penulisan, serta merilis versi service worker baru tanpa membuat pengguna tertahan di bundle lama. Hasil akhirnya adalah aplikasi yang dapat dipasang, memuat seketika dari cache, menerima perubahan tanpa koneksi, dan kembali selaras dengan keadaan server begitu koneksi pulih.

## Target Audiens

- Frontend developer yang sudah membangun aplikasi Vue 3 dengan Composition API dan terbiasa memakai Pinia.
- Engineer yang bertanggung jawab atas keandalan aplikasi lapangan: terminal point-of-sale, pemindai logistik, aplikasi teknisi lapangan, dashboard offline-first.
- Tingkat mahir — tutorial mengasumsikan kefasihan dengan Vite, TypeScript, dan pengelolaan state asinkron. Service worker dijelaskan dari awal, tidak diasumsikan.

## Prasyarat

- Node.js 20 atau lebih baru beserta npm.
- Pemahaman Vue 3 (`setup` script, `ref`, `computed`, `watch`), Pinia, dan TypeScript.
- REST API untuk data domain Anda. Endpoint apa pun yang mendukung `GET` dan `PUT` bisa dipakai; contoh menggunakan `/api/orders`.
- Chrome atau Edge untuk menguji Background Sync. Firefox dan Safari dibahas melalui jalur fallback, tetapi dukungannya terhadap Background Sync API terbatas atau tidak ada.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menghasilkan dan mendaftarkan service worker dengan `vite-plugin-pwa` serta menjelaskan apa saja yang masuk ke precache manifest.
- Memetakan strategi caching ke kelas request: app shell, aset statis, pembacaan API, dan navigasi.
- Memodelkan basis data lokal di IndexedDB dengan Dexie dan menjaganya tetap sinkron dengan store Pinia.
- Menerapkan pola outbox agar mutasi bertahan setelah reload halaman saat offline.
- Memutar ulang mutasi yang diantrekan dengan Background Sync API beserta fallback yang bekerja di semua browser.
- Menyelesaikan konflik penulisan secara deterministik alih-alih menimpa state server secara diam-diam.
- Merilis versi service worker baru tanpa meninggalkan pengguna pada bundle yang usang.

## Konteks dan Motivasi

Pengguna tidak merasakan aplikasi Anda sebagai "online dengan kegagalan sesekali". Mereka merasakannya sebagai rusak begitu kereta masuk terowongan, gudang kehilangan Wi-Fi, atau ponsel beralih ke captive portal. Tombol coba lagi dan spinner adalah pengakuan bahwa aplikasi bergantung pada sumber daya yang tidak Anda kendalikan.

Aplikasi offline-first membalik ketergantungan itu. Cache lokal dan basis data lokal menjadi sumber kebenaran untuk rendering, sedangkan jaringan menjadi kanal sinkronisasi yang boleh lambat, terputus-putus, atau tidak ada. Pembacaan selesai dari IndexedDB dalam hitungan milidetik. Penulisan diterima seketika, disimpan lokal, lalu diteruskan saat memungkinkan. Antarmuka tetap responsif karena tidak pernah menunggu paket data kembali.

Vue 3 cocok untuk model ini. Sistem reaktivitasnya memungkinkan Anda merender langsung dari store yang berbasis IndexedDB, dan composable-nya membuat status konektivitas serta sinkronisasi dapat dipakai ulang di banyak view. Bagian yang sulit bukan di framework-nya — melainkan pada siklus hidup service worker, invalidasi cache, dan resolusi konflik, dan itulah yang dibahas tutorial ini.

## Konten Inti

### Arti Sebenarnya Offline-First

Offline-first adalah keputusan alur data, bukan centang pada laporan Lighthouse. Tiga sifat mendefinisikannya:

- **Pembacaan tidak pernah menunggu jaringan.** Paint pertama setiap route berasal dari cache atau basis data lokal. Respons jaringan hanya menyegarkan apa yang sudah tampil.
- **Penulisan diterima tanpa syarat.** Pengguna dapat membuat, mengubah, dan menghapus record tanpa koneksi. Aplikasi mencatat niat tersebut dan bertanggung jawab mengirimkannya kemudian.
- **Sinkronisasi adalah urusan latar belakang.** Pengosongan antrean, retry, dan resolusi konflik terjadi di luar interaksi yang sedang dilakukan pengguna.

Cara praktis memisahkan dua lapisan penyimpanan:

| Lapisan | Teknologi | Isi | Masa hidup |
|---------|-----------|-----|------------|
| Cache aset | Cache Storage milik service worker | HTML shell, JS, CSS, font, gambar | Sampai versi service worker baru aktif |
| Data domain | IndexedDB | Record, mutasi yang diantrekan, metadata sinkronisasi | Sampai pengguna menghapus data situs |

Cache aset menjawab "apakah aplikasi bisa boot?". Basis data lokal menjawab "apakah aplikasi punya data untuk ditampilkan?". Keduanya diperlukan; tidak ada yang bisa menggantikan yang lain.

### Menyiapkan Perkakas PWA

Perkakas build melakukan dua pekerjaan: menghasilkan web app manifest dan membangun service worker dari konfigurasi Workbox. `vite-plugin-pwa` membungkus keduanya dan terintegrasi dengan pipeline build Vite.

```bash
npm install -D vite-plugin-pwa workbox-window
npm install dexie
```

Dua pengaturan perlu diperhatikan sebelum hal lain:

- `registerType: 'prompt'` menahan service worker baru dalam keadaan menunggu sampai Anda memerintahkan aktivasi. Inilah yang memungkinkan Anda menampilkan banner "pembaruan tersedia" alih-alih menukar aplikasi yang sedang berjalan di bawah tangan pengguna. `autoUpdate` nyaman untuk situs marketing dan berbahaya untuk aplikasi yang memiliki state lokal belum tersinkron.
- `injectRegister: 'auto'` menulis pemanggilan registrasi ke HTML entri, sehingga Anda tidak perlu menulis skrip registrasi sendiri.

### App Shell dan Precache Manifest

Workbox mem-precache daftar berkas tetap saat instalasi. Semua yang ada di daftar itu tersedia offline pada kunjungan pertama setelah instalasi, karena itu HTML entri, bundle JS, dan bundle CSS harus ada di dalamnya.

Vite menghasilkan nama berkas ber-hash seperti `index-C3f9a1.js`. Plugin membaca output build dan menyuntikkan nama sebenarnya ke precache manifest, sehingga Anda tidak pernah memelihara daftar itu secara manual. `globPatterns` bawaan mencakup kasus umum:

```text
**/*.{js,css,html,ico,png,svg,woff2}
```

Yang sengaja dikecualikan dari precache: respons API, media berukuran besar, dan apa pun yang spesifik per pengguna. Precache dipakai bersama oleh semua pengguna deployment dan diverifikasi per versi build, jadi itu tempat yang salah untuk data.

Manifest-nya sendiri kecil. Yang penting adalah `start_url` cocok dengan route yang bisa dilayani service worker secara offline, dan ikon tersedia pada dua ukuran yang benar-benar disyaratkan browser agar dapat dipasang.

### Memilih Strategi Caching per Jenis Request

Satu aturan caching untuk semua request adalah penyebab paling umum bug data usang pada PWA. Cocokkan strategi dengan semantik sumber dayanya.

| Sumber daya | Strategi | Alasan |
|-------------|----------|--------|
| Request navigasi (HTML) | NetworkFirst dengan timeout 3 detik, fallback ke shell di precache | Kesegaran konten penting, tetapi jaringan lambat tidak boleh menghambat boot |
| JS dan CSS ber-hash | CacheFirst | Nama berkas berubah setiap build, sehingga cache hit selalu benar |
| Pembacaan API (daftar dan detail) | NetworkFirst dengan masa simpan pendek | Segar bila memungkinkan, tetap terpakai bila tidak |
| Data referensi (kurs, tabel pajak, kategori) | StaleWhileRevalidate | Respons instan, disegarkan di latar belakang |
| Penulisan API | NetworkOnly plus antrean background sync | Penulisan tidak boleh pernah dilayani dari cache |
| Gambar dan font | CacheFirst dengan batas kedaluwarsa | Muatan immutable, penggunaan disk terbatas |

Timeout pada NetworkFirst adalah detail yang membedakan aplikasi offline yang bisa dipakai dari layar putih. Tanpa timeout, captive portal yang menerima koneksi TCP tetapi tidak pernah merespons membuat pengguna menatap spinner selama satu menit atau lebih.

### Menyimpan Data Domain di IndexedDB

IndexedDB adalah satu-satunya penyimpanan browser dengan kapasitas dan struktur yang cukup untuk menampung kumpulan data kerja: ratusan megabita di desktop, puluhan di mobile, lengkap dengan indeks dan transaksi. API mentahnya berbasis callback dan verbose, jadi gunakan Dexie sebagai pembungkus bertipe yang tipis.

Dua keputusan skema menentukan semua hal di hilir:

- **Simpan record persis seperti yang dikembalikan server**, ditambah dua field lokal: `_dirty` (record punya perubahan lokal yang belum dipublikasikan) dan `_deleted` (tombstone, agar penghapusan bertahan setelah reload).
- **Pisahkan outbox dari record.** Mutasi yang diantrekan berada di tabelnya sendiri dengan urutannya sendiri, karena ia adalah log niat, bukan salinan state.

Indeks harus sesuai query yang benar-benar Anda jalankan saat offline: daftar berdasarkan status, urut berdasarkan `updatedAt`, pencarian berdasarkan id server. Jangan mengindeks semuanya; setiap indeks menambah biaya tulis pada setiap mutasi.

### Penulisan Optimistis dan Pola Outbox

Saat pengguna menyimpan sebuah order, tiga hal harus terjadi dalam satu urutan atomik:

1. Tulis record ke IndexedDB dengan `_dirty: true`.
2. Tambahkan operasi ke outbox yang mendeskripsikan niatnya (`create`, `update`, atau `delete`, plus payload dan id yang dibuat klien).
3. Perbarui store Pinia agar UI langsung dirender ulang.

Urutannya penting. Menulis ke store lebih dulu lalu ke basis data berarti reload di antara keduanya menghilangkan mutasi padahal pengguna merasa sudah tersimpan. Menempatkan kedua penulisan di dalam satu transaksi Dexie menjaga konsistensinya.

Id yang dibuat klien sangat penting. Jika perangkat membuat record saat offline, UI membutuhkan identitas stabil sebelum server memberikan satu. Gunakan `crypto.randomUUID()` dan kirim sebagai header `Idempotency-Key` agar request yang diulang tidak menciptakan dua order.

### Background Sync dengan Workbox

Background Sync API memungkinkan browser mengulang request yang gagal bahkan setelah tab ditutup atau perangkat tidur. Workbox mengeksposnya sebagai `BackgroundSyncPlugin` yang dikonfigurasi pada route penanganan penulisan.

Dua batasan penting dalam praktik:

- **Hanya Chrome dan Edge.** Safari dan Firefox tidak mengimplementasikan API ini. Outbox di IndexedDB adalah lapisan portabelnya: jalur service worker hanyalah optimasi, bukan kontrak.
- **Browser yang mengatur jadwal retry.** Anda tidak bisa mengendalikan jedanya, dan sync yang gagal tidak melempar error ke kode Anda. Laporkan jumlah antrean ke pengguna alih-alih menjanjikan waktu pengiriman.

Untuk jalur portabel, kosongkan outbox dari halaman setiap kali konektivitas kembali dan setiap kali aplikasi kembali fokus, dengan backoff eksponensial dan batas jumlah percobaan per operasi.

### Mendeteksi Konektivitas Sebenarnya

`navigator.onLine` melaporkan apakah perangkat memiliki antarmuka jaringan. Nilainya `true` pada captive portal, pada Wi-Fi tanpa rute ke luar, dan pada koneksi LTE yang kuota datanya habis. Perlakukan sebagai petunjuk, bukan fakta.

Sinyal yang andal adalah request berhasil ke endpoint health, di-cache beberapa detik agar tidak menyelidik di setiap render. Pola yang bekerja:

- Berlangganan event `online` dan `offline` untuk umpan balik instan.
- Selidiki `/api/health` dengan timeout dua detik dan kebijakan cache `no-store`.
- Cache hasil penyelidikan terakhir untuk interval singkat dan sediakan fungsi `recheck()` untuk percobaan ulang yang dipicu pengguna.

Saat offline, alihkan query ke basis data lokal. Saat online kembali, kosongkan outbox lebih dulu lalu segarkan pembacaan, dalam urutan itu — jika tidak, penyegaran dapat menimpa state lokal optimistis dengan baris server yang usang.

### Menyelesaikan Konflik Secara Deterministik

Dua perangkat menyunting record yang sama bukan kasus tepi pada aplikasi offline; itu keadaan normal. Pilih aturan penyelesaian per entitas dan tuliskan.

- **Last write wins dengan timestamp server.** Paling sederhana dan memadai untuk field yang independen. Kirim `updatedAt` pada setiap penulisan; server menolak atau menimpa penulisan yang lebih lama.
- **Merge per field.** Kirim hanya field yang berubah sehingga suntingan bersamaan pada field berbeda tetap bertahan. Perlu pelacakan diff per field di outbox.
- **Concurrency optimistis dengan token versi.** Server mengembalikan `version` atau `ETag`; penulisan membawa versi yang dibaca. Ketidakcocokan menghasilkan `409` dan klien melakukan rebase atau menanyakan pengguna.

Untuk uang, jumlah inventaris, dan apa pun yang nilainya rusak karena penimpaan diam-diam, gunakan token versi dan tampilkan konfliknya. Untuk flag preferensi dan field profil, last-write-wins cukup. Mode kegagalan yang harus dihindari adalah menimpa secara buta di semua tempat karena paling mudah diimplementasikan.

### Merilis Pembaruan Service Worker dengan Aman

Service worker tidak pernah memperbarui dirinya di tempat. Versi baru terpasang, menunggu, lalu aktif kemudian — dan jika ia aktif saat halaman lama masih berjalan, dua versi kode aplikasi Anda dapat berbicara dengan skema IndexedDB yang sama.

Urutan yang menghindari hal itu:

- Deteksi `onNeedRefresh` dari `virtual:pwa-register`, tampilkan banner persisten yang menawarkan reload.
- Jalankan migrasi skema pada langkah `install` service worker baru, atau pagari migrasi di halaman dengan pemeriksaan bahwa tidak ada tab versi lama yang terbuka.
- Panggil `updateServiceWorker(true)` hanya setelah pengguna menyetujui, lalu reload.
- Jangan pernah memakai `skipWaiting: true` pada aplikasi dengan mutasi yang diantrekan. Itu dapat mengaktifkan worker baru di tengah background sync.

### Menguji Perilaku Offline

Pengujian offline terutama tentang menyimulasikan tiga keadaan yang merusak implementasi naif: tidak ada jaringan sama sekali, jaringan yang menerima koneksi tetapi tidak pernah menjawab, dan jaringan yang mengabaikan penulisan sambil tetap melayani pembacaan.

- Gunakan DevTools → Network → Offline untuk kasus offline penuh. Reload dua kali: pemuatan pertama memasang worker, pemuatan kedua membuktikan precache bekerja.
- Throttle ke "Slow 3G" dan pastikan timeout navigasi jatuh ke shell di cache alih-alih menggantung.
- Gunakan panel Application untuk memeriksa isi Cache Storage dan baris IndexedDB setelah setiap interaksi. Mutasi yang tidak ada di outbox berarti tidak pernah terjadi.
- Uji dengan tab tertutup: antrekan dua penulisan saat offline, tutup tab, sambungkan kembali, lalu pastikan keduanya akhirnya tiba di server tepat satu kali.

## Contoh Kode

Contoh membangun potongan kecil manajemen order. Semuanya berjalan dengan `npm run dev` untuk pengembangan dan `npm run build && npm run preview` untuk perilaku service worker, karena service worker hanya bekerja melalui HTTPS atau di `localhost`.

### Struktur Proyek

```text
src/
  components/
    OfflineBanner.vue
    UpdatePrompt.vue
  composables/
    useConnectivity.ts
  db/
    schema.ts
    outbox.ts
  stores/
    orders.ts
  App.vue
  main.ts
  sw.ts
vite.config.ts
```

### Konfigurasi Vite dan Workbox

Konfigurasi berikut mem-precache app shell, menerapkan kebijakan NetworkFirst dengan timeout pada pembacaan API, dan mengarahkan penulisan ke antrean background sync.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: {
        name: 'Field Orders',
        short_name: 'Orders',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f6feb',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith('/api/') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-reads',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/orders(\?.*)?$/,
            method: 'POST',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'orders-write-queue',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
```

`maxAgeSeconds` satu jam pada pembacaan API adalah kompromi yang disengaja. Retensi lebih panjang berarti start offline lebih cepat tetapi data lebih usang setelah penyambungan ulang, dan setiap respons jaringan yang berhasil menyegarkan entri tersebut.

### Skema IndexedDB dengan Dexie

```typescript
// src/db/schema.ts
import Dexie, { type Table } from 'dexie';

export interface Order {
  id: string;
  serverId?: string;
  customerName: string;
  status: 'draft' | 'confirmed' | 'shipped';
  total: number;
  updatedAt: string;
  version: number;
  _dirty: 0 | 1;
  _deleted: 0 | 1;
}

export interface OutboxOp {
  seq?: number;
  opId: string;
  entity: 'order';
  kind: 'create' | 'update' | 'delete';
  entityId: string;
  payload: Partial<Order>;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

class OrdersDatabase extends Dexie {
  orders!: Table<Order, string>;
  outbox!: Table<OutboxOp, number>;

  constructor() {
    super('field-orders');
    this.version(1).stores({
      orders: 'id, serverId, status, updatedAt, _dirty',
      outbox: '++seq, opId, entityId, createdAt',
    });
  }
}

export const db = new OrdersDatabase();

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
```

`_dirty` dan `_deleted` bertipe angka karena konvensi, sebab sebagian browser secara historis gagal mengindeks boolean. `requestPersistentStorage()` meminta browser mengecualikan origin dari eviction otomatis — layak dipanggil sekali, setelah pemuatan pertama yang berhasil, pada aplikasi yang menyimpan pekerjaan belum tersinkron.

### Composable Konektivitas

```typescript
// src/composables/useConnectivity.ts
import { onMounted, onUnmounted, readonly, ref } from 'vue';

const isReachable = ref(navigator.onLine);
const lastCheck = ref(0);
const CHECK_INTERVAL_MS = 5000;

async function probe(): Promise<boolean> {
  if (Date.now() - lastCheck.value < CHECK_INTERVAL_MS) return isReachable.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    isReachable.value = res.ok;
  } catch {
    isReachable.value = false;
  } finally {
    clearTimeout(timer);
    lastCheck.value = Date.now();
  }

  return isReachable.value;
}

export function useConnectivity() {
  const handleOnline = () => probe();
  const handleOffline = () => {
    isReachable.value = false;
  };

  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    probe();
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });

  return { isReachable: readonly(isReachable), recheck: probe };
}
```

Ref di level modul menjadikan konektivitas sebuah singleton: sepuluh komponen boleh memanggil `useConnectivity()` dan semuanya mengamati satu loop penyelidikan, bukan sepuluh timer yang bersaing.

### Implementasi Antrean Outbox

```typescript
// src/db/outbox.ts
import { db, type OutboxOp, type Order } from './schema';

export async function enqueue(op: Omit<OutboxOp, 'seq' | 'attempts' | 'createdAt'>) {
  await db.outbox.add({
    ...op,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
}

export async function pendingCount(): Promise<number> {
  return db.outbox.count();
}

async function send(op: OutboxOp): Promise<void> {
  const res = await fetch(`/api/orders/${op.entityId}`, {
    method: op.kind === 'create' ? 'POST' : op.kind === 'delete' ? 'DELETE' : 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': op.opId,
    },
    body: op.kind === 'delete' ? undefined : JSON.stringify(op.payload),
  });

  if (!res.ok && res.status !== 409) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function drainOutbox(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const ops = await db.outbox.orderBy('seq').toArray();

  for (const op of ops) {
    try {
      await send(op);
      await db.outbox.delete(op.seq!);
      await db.orders.update(op.entityId, { _dirty: 0 });
      sent += 1;
    } catch (error) {
      failed += 1;
      const attempts = op.attempts + 1;
      await db.outbox.update(op.seq!, {
        attempts,
        lastError: (error as Error).message,
      });
      if (attempts >= 5) break;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempts * 250));
    }
  }

  return { sent, failed };
}

export async function applyServerRecord(record: Order): Promise<void> {
  const local = await db.orders.get(record.id);
  if (local?._dirty) return;
  await db.orders.put({ ...record, _dirty: 0, _deleted: 0 });
}
```

Dua perilaku di sini disengaja. Operasi dikosongkan dalam urutan `seq` sehingga create selalu mendahului update-nya, dan respons `409` dihitung sebagai terkirim karena konflik berarti server sudah memiliki versi lebih baru — mengulanginya akan berputar tanpa akhir. Loop berhenti setelah lima percobaan gagal pada satu operasi alih-alih melompat ke operasi berikutnya, karena itu akan mengacaukan urutan penulisan yang saling bergantung.

### Store Pinia dengan Mutasi Optimistis

```typescript
// src/stores/orders.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, type Order } from '../db/schema';
import { drainOutbox, enqueue } from '../db/outbox';

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([]);
  const pending = ref(0);

  async function load() {
    orders.value = await db.orders
      .filter((o) => o._deleted === 0)
      .reverse()
      .sortBy('updatedAt')
      .then((rows) => rows.reverse());
  }

  async function saveOrder(input: Omit<Order, 'updatedAt' | 'version' | '_dirty' | '_deleted'>) {
    const now = new Date().toISOString();
    const existing = await db.orders.get(input.id);

    const record: Order = {
      ...existing,
      ...input,
      updatedAt: now,
      version: existing?.version ?? 0,
      _dirty: 1,
      _deleted: 0,
    };

    await db.transaction('rw', db.orders, db.outbox, async () => {
      await db.orders.put(record);
      await enqueue({
        opId: crypto.randomUUID(),
        entity: 'order',
        kind: existing?.serverId ? 'update' : 'create',
        entityId: record.id,
        payload: record,
      });
    });

    await load();
    pending.value = await db.outbox.count();
  }

  async function sync() {
    await drainOutbox();
    pending.value = await db.outbox.count();
    await load();
  }

  return { orders, pending, load, saveOrder, sync };
});
```

Membungkus penulisan record dan penambahan outbox dalam satu `db.transaction` adalah baris yang membuat seluruh desain andal. Tanpanya, crash di antara dua penulisan meninggalkan record bertanda dirty tanpa operasi untuk mempublikasikannya — hantu permanen yang tidak pernah rekonsiliasi.

### Komponen Banner Offline

```vue
<!-- src/components/OfflineBanner.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useConnectivity } from '../composables/useConnectivity';

const props = defineProps<{ pending: number }>();
const { isReachable, recheck } = useConnectivity();

const label = computed(() => {
  if (!isReachable.value) {
    return props.pending > 0
      ? `Offline — ${props.pending} perubahan tersimpan di perangkat ini`
      : 'Offline — menampilkan data tersimpan';
  }
  return props.pending > 0 ? `Menyinkronkan ${props.pending} perubahan` : '';
});
</script>

<template>
  <div v-if="label" class="banner" role="status" aria-live="polite">
    <span>{{ label }}</span>
    <button v-if="!isReachable" type="button" @click="recheck">Coba lagi</button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #fff4d6;
  color: #5c4400;
  font-size: 0.875rem;
}
</style>
```

Banner ini bukan sekadar hiasan. Pengguna yang tidak bisa melihat bahwa pekerjaannya sedang diantrekan akan mengulangi aksi yang sama dan menciptakan duplikat. `role="status"` dengan `aria-live="polite"` mengumumkan perubahan status ke pembaca layar tanpa merebut fokus.

### Komponen Prompt Pembaruan

```vue
<!-- src/components/UpdatePrompt.vue -->
<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    setInterval(() => registration.update(), 60 * 60 * 1000);
  },
});

async function applyUpdate() {
  await updateServiceWorker(true);
}
</script>

<template>
  <div v-if="needRefresh" class="update" role="alert">
    <span>Versi baru tersedia.</span>
    <button type="button" @click="applyUpdate">Muat ulang</button>
  </div>
</template>
```

Melakukan polling pembaruan setiap jam adalah jalan tengah pragmatis: tab menemukan deployment baru dalam satu jam tanpa membebani server pada setiap navigasi. Pasangkan reload dengan pemeriksaan `pending` di store dan tolak reload selama masih ada operasi belum tersinkron.

### Memverifikasi Build

```bash
npm run build
npm run preview
```

Lalu, di DevTools:

```text
Application → Service Workers   → status "activated and is running"
Application → Cache Storage     → precache-and-update plus api-reads dan images
Application → IndexedDB         → field-orders dengan tabel orders dan outbox
Network → Offline               → reload dua kali, aplikasi tetap boot
```

Penjaga otomatis singkat terhadap regresi di lapisan data:

```typescript
// tests/outbox.spec.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { db } from '../src/db/schema';
import { drainOutbox, enqueue } from '../src/db/outbox';

describe('outbox', () => {
  beforeEach(async () => {
    await db.outbox.clear();
    await db.orders.clear();
  });

  it('mempertahankan operasi ketika request gagal', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as typeof fetch;

    await db.orders.put({
      id: 'local-1', customerName: 'Ada', status: 'draft', total: 42,
      updatedAt: new Date().toISOString(), version: 0, _dirty: 1, _deleted: 0,
    });
    await enqueue({
      opId: 'op-1', entity: 'order', kind: 'create',
      entityId: 'local-1', payload: { customerName: 'Ada' },
    });

    const result = await drainOutbox();

    expect(result.failed).toBe(1);
    expect(await db.outbox.count()).toBe(1);
    expect((await db.orders.get('local-1'))?._dirty).toBe(1);
  });
});
```

## Insight Penting

- **Penulisan lokal dan penambahan antrean harus satu transaksi.** Celah di antara keduanya menghasilkan record yang tampak tersimpan bagi pengguna dan tidak akan pernah bisa dipublikasikan.
- **Id buatan klien plus idempotency key membuat retry aman.** Tanpa keduanya, timeout setelah request berhasil menciptakan record duplikat yang tidak bisa dibatalkan dengan retry apa pun.
- **Pasang network timeout pada navigasi dan pembacaan API.** Captive portal lebih buruk daripada tanpa jaringan, karena ia menerima koneksi lalu tidak pernah merespons.
- **`navigator.onLine` bukan pemeriksaan konektivitas.** Selidiki endpoint health dengan timeout pendek dan cache hasilnya; perlakukan event sebagai pemicu penyelidikan.
- **Jangan pernah mengaktifkan `skipWaiting` pada aplikasi dengan antrean lokal.** Itu dapat mengaktifkan worker baru di tengah sinkronisasi, mencampur dua versi kode Anda terhadap satu basis data.
- **Resolusi konflik adalah keputusan produk.** Pilih last-write-wins, merge per field, atau token versi per entitas dan dokumentasikan; penimpaan diam-diam hanya layak untuk data yang murah.
- **Batasi antrean.** Beri batas percobaan, tampilkan jumlah tertunda di UI, dan sediakan retry manual agar operasi yang ditolak permanen tidak memblokir antrean selamanya.
- **Precache bersifat bersama dan berversi; data pengguna tidak.** Jauhkan respons API dari precache manifest dan biarkan runtime caching atau IndexedDB yang menyimpannya.

## Langkah Berikutnya

- Tambahkan halaman fallback offline yang dilayani service worker untuk navigasi yang tidak ada di app shell.
- Ganti loop pengosongan manual dengan Background Sync API di Chromium dan pertahankan pengosongan dari halaman sebagai fallback, lalu ukur jalur mana yang mengirim paling banyak operasi.
- Perluas penanganan konflik ke merge per field dengan menyimpan diff per field di payload outbox.
- Pelajari panduan Vue.js Performance Optimization untuk teknik ukuran bundle dan rendering yang melengkapi boot offline instan.
- Baca Vue.js Testing Guide untuk pengujian tingkat komponen pada keadaan offline dan jalur error.

## Kesimpulan

Aplikasi Vue 3 offline-first dibangun dari empat bagian yang bekerja sama: service worker yang melayani shell dan menerapkan strategi caching per route, skema IndexedDB yang menyimpan record dan niat yang diantrekan, lapisan Pinia yang merender dari state lokal dan menulis secara optimistis, serta rutinitas sinkronisasi yang mengosongkan antrean dengan retry yang aman. Framework menyumbang reaktivitas dan composable; keandalannya datang dari urutan penulisan, idempotensi request, dan aturan konflik yang dipilih dengan sengaja.

Bangun keempatnya dalam urutan itu. Benahi caching shell dan verifikasi dengan jaringan di-throttle, lalu persistensi pembacaan, lalu penerimaan penulisan, lalu sinkronisasi. Setiap langkah dapat diuji secara terpisah, dan setiap langkah membuat aplikasi tetap terpakai meskipun langkah berikutnya belum selesai.

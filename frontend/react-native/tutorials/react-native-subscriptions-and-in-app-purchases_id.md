---
title: "Membangun Paywall Langganan dan In-App Purchase dengan React Native"
description: "Bangun lapisan monetisasi siap produksi di React Native: pengambilan produk dari store, mesin status pembelian, validasi struk di sisi server dengan StoreKit 2 dan Play Billing, pembatasan akses berbasis entitlement, serta event daur hidup langganan seperti grace period, billing retry, dan refund."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Paywall Langganan dan In-App Purchase dengan React Native

## Ringkasan

Tutorial ini membangun lapisan langganan lengkap untuk aplikasi React Native: katalog produk yang diambil dari store, paywall yang meminta pembelian lewat `react-native-iap`, server yang memvalidasi setiap transaksi ke Apple dan Google sebelum memberikan akses apa pun, dan provider entitlement yang membatasi sisa UI. Di akhir Anda memiliki alur yang bertahan pada kasus-kasus yang menjatuhkan implementasi naif — pembelian yang selesai setelah jaringan putus, perpanjangan yang datang saat aplikasi tertutup, refund yang harus mencabut akses, dan pengguna yang memasang ulang di ponsel baru lalu berharap langganannya kembali.

## Target Audiens

- Pengembang React Native dan Expo yang merilis aplikasi berbayar untuk konten digital, fitur, atau kuota.
- Pengembang tingkat menengah hingga mahir yang nyaman dengan TypeScript, API terautentikasi, dan basis data relasional.
- Engineer backend yang bertanggung jawab atas API yang dipanggil klien mobile setelah pembelian.

## Prasyarat

- Proyek React Native 0.74+ atau Expo SDK 51+ dengan TypeScript dan alur autentikasi yang sudah memberi setiap pengguna ID server yang stabil.
- Backend yang Anda kendalikan (Node, Go, PHP, apa pun) dengan basis data dan kemampuan menyimpan secret.
- `react-native-iap` (bare/prebuild) atau `expo-iap` (Expo development build — kedua library ini tidak berjalan di dalam Expo Go).
- Akun sandbox: App Store Connect sandbox tester dan akun license testing Google Play.
- Produk yang sudah dibuat di App Store Connect dan Google Play Console. Konfigurasi store bukan kode, dan tidak ada pekerjaan klien yang bisa menutupi produk yang belum ada.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:
- Memisahkan produk, offering, dan entitlement sehingga perubahan harga tidak perlu rilis aplikasi.
- Menerapkan mesin status pembelian: minta, validasi di server, beri akses, lalu selesaikan transaksi.
- Memvalidasi transaksi bertanda tangan StoreKit 2 dan pembelian Play Billing di sisi server alih-alih mempercayai klien.
- Menangani perpanjangan, grace period, akun tertahan, refund, dan pencabutan lewat notifikasi store.
- Membangun paywall yang menampilkan harga terlokalisasi dari store, memulihkan pembelian, dan tidak pernah membuat pengguna berbayar terkunci.

## Konteks dan Motivasi

Monetisasi adalah satu-satunya bagian aplikasi mobile yang bugnya diukur dengan refund, chargeback, dan ulasan bintang satu, bukan bounce rate. Mode kegagalannya spesifik dan tidak memberi ampun. Pembelian yang berhasil di store tetapi tidak pernah sampai ke server Anda berubah menjadi tiket dukungan. Transaksi yang tidak pernah diselesaikan di Android otomatis dikembalikan dananya setelah tiga hari. Langganan yang diperpanjang saat aplikasi tertutup harus memperpanjang akses tanpa pengguna membuka apa pun. Refund harus langsung mencabut akses, meski klien mengira sudah membayar lunas.

Hampir semua kasus itu berasal dari satu kesalahan arsitektur yang sama: memperlakukan hasil pembelian di perangkat sebagai sumber kebenaran. Perangkat adalah klien. Apple dan Google adalah pemroses pembayaran, dan server Anda adalah buku besar. Begitu pembagian itu jelas, implementasinya berhenti menjadi tumpukan kasus khusus per platform dan berubah menjadi mesin status kecil dengan satu webhook menempel.

Ada juga dimensi kebijakan. Pedoman Review App Store mewajibkan in-app purchase untuk barang digital yang dikonsumsi di dalam aplikasi, dan paywall yang menyembunyikan opsi restore atau salah menyajikan harga akan ditolak. Google menegakkan aturan yang sama lewat Play Billing. Membaca harga dari store alih-alih menuliskannya di kode adalah syarat kebenaran sekaligus syarat lolos review.

## Konten Inti

### Store Memegang Uangnya, Server Anda Memegang Kebenarannya

Ada dua otoritas dan keduanya tidak boleh tertukar. Store tahu apakah pembayaran berhasil. Server Anda yang memutuskan apakah pengguna punya akses. Tugas klien adalah membawa struk dari satu pihak ke pihak lain, lalu menampilkan apa pun yang dikatakan server.

Artinya klien tidak boleh menulis "premium = true" ke penyimpanan lokal setelah callback pembelian menyala. Ia mengirim struk ke API Anda, API memverifikasinya ke Apple atau Google, mencatat langganan, dan mengembalikan entitlement terkini. Klien menyimpan respons itu dengan TTL singkat dan memakainya untuk membatasi layar. Pengguna yang membersihkan cache akan mendapat kebenaran lagi pada peluncuran berikutnya; pengguna yang mengutak-atik penyimpanan lokal tidak mendapat apa pun, karena server tidak pernah setuju.

Konsekuensi praktisnya: aplikasi harus tetap benar saat verifikasi lambat atau gagal. Rancang tiga status klien — verifying, entitled, not entitled — bukan satu boolean. Pembelian yang masih diverifikasi bukan pembelian yang boleh Anda tolak; ia pembelian yang perlu ditampilkan spinner-nya, lalu dicoba ulang.

### Produk, Offering, dan Entitlement Adalah Tiga Hal Berbeda

Sebagian besar implementasi awal menciutkan ketiganya menjadi satu pengenal, lalu setiap eksperimen harga berubah menjadi rilis.

- **Produk** adalah apa yang dijual store: `com.acme.pro.monthly`, `com.acme.pro.yearly`, `com.acme.credits.100`. Harga, mata uang, trial, dan lokalisasinya hidup di App Store Connect dan Play Console, bukan di kode Anda.
- **Offering** adalah apa yang ditampilkan paywall saat ini: "layar upgrade dua paket" atau "layar Black Friday". Offering memetakan slot (monthly, yearly) ke ID produk konkret. Menyimpan pemetaan itu di server memungkinkan Anda menukar produk yearly dengan produk promosi tanpa mengirim build.
- **Entitlement** adalah apa yang boleh dilakukan pengguna: `pro`, `team_seats: 5`, `export_credits: 100`. Hanya ini yang boleh diperiksa oleh kode aplikasi.

Tabel pemetaannya kecil dan layak ditulis eksplisit, karena di situlah eksperimen harga terjadi.

```text
Offering: "default"
  monthly  -> com.acme.pro.monthly   (tipe produk: subs, grup: pro)
  yearly   -> com.acme.pro.yearly    (tipe produk: subs, grup: pro)
  credits  -> com.acme.credits.100   (tipe produk: in-app, consumable)

Resolusi offering (klien mengusulkan, server memutuskan):
  user.segment == "trial_eligible"  -> offering "default"
  user.segment == "winback"         -> offering "winback_40"
  user.region  == "id"              -> offering "id_local_pricing"
```

Perhatikan arah otoritasnya: klien menanyakan offering mana yang ditampilkan, server menjawab, dan klien mengambil produk yang disebut dalam jawaban itu. Klien yang memutuskan sendiri produk mana yang dijual akan menyimpang dari store begitu satu produk dihapus.

### Mesin Status Pembelian

Setiap platform mengikuti urutan lima langkah yang sama, dan melewatkan satu langkah menghasilkan bug yang spesifik dan mudah dikenali.

```text
1. ambil produk        -> store mengembalikan harga terlokalisasi, judul, info trial
2. minta pembelian     -> store menagih pengguna, mengembalikan struk bertanda tangan
3. verifikasi di server -> server bertanya ke Apple/Google "apakah ini asli dan terkini?"
4. beri entitlement    -> server melakukan upsert baris langganan
5. selesaikan transaksi -> klien mengakui; jika tidak, Android mengembalikan dana otomatis
```

Langkah 3 sebelum langkah 5 tidak bisa ditawar. `finishTransaction` adalah pengakuan bahwa "struk ini sudah diproses oleh logika bisnis saya". Di Android, pembelian yang tidak diakui akan dikembalikan dananya setelah tiga hari. Di iOS transaksi tetap mengantre dan `onPurchaseSuccess` bisa menyala lagi untuk transaksi yang sama pada peluncuran berikutnya, sehingga handler yang memberi akses tanpa kunci idempotensi akan memberi dua kali.

Urutan sebaliknya — selesaikan dulu, validasi belakangan — terasa lebih cepat dan merupakan sumber paling umum dari laporan "pengguna sudah bayar tapi tidak dapat apa-apa". Jika validasi gagal setelah transaksi diselesaikan, uangnya sudah hilang dan satu-satunya pemulihan adalah refund manual.

Aturan yang lebih halus: callback pembelian bukanlah request handler. Ia bisa menyala saat aplikasi di latar belakang, saat cold start, atau dua kali untuk transaksi yang sama. Perlakukan ia sebagai event yang wajib idempoten, dan itulah yang diberikan oleh unique constraint di server pada original transaction ID.

### Validasi: JWS StoreKit 2 dan Play purchasesv2

Format struk berbeda per platform, tetapi jawaban server selalu tiga hal yang sama: apakah valid, apa yang dibuka, dan kapan kedaluwarsa.

Di iOS dengan StoreKit 2, klien menerima transaksi bertanda tangan JWS. Server Anda memverifikasi rantai tanda tangan terhadap sertifikat akar Apple, lalu membaca `originalTransactionId`, `productId`, `expiresDate`, `type`, dan `environment`. Untuk "bagaimana statusnya sekarang", panggilan otoritatif adalah endpoint status langganan App Store Server API, yang mengembalikan status perpanjangan alih-alih satu transaksi. Endpoint `verifyReceipt` yang lama sudah deprecated; integrasi baru tidak seharusnya memakainya.

Di Android, Play Developer API adalah otoritasnya. `purchases.subscriptionsv2.get` mengembalikan `subscriptionState` — `SUBSCRIPTION_STATE_ACTIVE`, `IN_GRACE_PERIOD`, `ON_HOLD`, `PAUSED`, `CANCELED`, `EXPIRED` — plus line item dan waktu kedaluwarsanya. Satu field itu yang Anda simpan, karena ia sudah mengodekan perbedaan antara "masih membayar" dan "sedang billing retry".

Beberapa aturan berlaku untuk keduanya:

- **Jangan pernah mempercayai tanggal kedaluwarsa dari klien.** Klien bisa offline sebulan dengan `expiresDate` basi. Tanyakan ke store, atau hitung dari catatan terverifikasi terakhir ditambah notifikasi yang sudah Anda terima.
- **Simpan original transaction ID, bukan yang terbaru.** Perpanjangan menghasilkan transaction ID baru yang menunjuk langganan yang sama; ID original adalah identitas stabil langganan pengguna lintas perpanjangan dan pergantian perangkat.
- **Hash dan simpan purchase token.** Ia adalah kredensial bearer untuk API store. Log hanya boleh memuat prefiksnya, jangan token utuh.
- **Catat environment-nya.** Struk sandbox tidak boleh memberi akses produksi. Ini bug yang memungkinkan tester dengan TestFlight di ponselnya membuka produk asli secara gratis.

### Event Daur Hidup yang Wajib Ditangani

Langganan adalah hubungan yang berubah tanpa aplikasi berjalan. Klien tidak bisa melakukan polling sampai benar; notifikasi store adalah mekanismenya.

Apple mengirim App Store Server Notifications V2 ke endpoint HTTPS yang Anda daftarkan: `SUBSCRIBED`, `DID_RENEW`, `DID_CHANGE_RENEWAL_STATUS`, `EXPIRED`, `DID_FAIL_TO_RENEW`, `GRACE_PERIOD_EXPIRED`, `REFUND`, `REVOKE`. Google mengirim real-time developer notification lewat Pub/Sub, dengan tipe seperti `SUBSCRIPTION_PURCHASED`, `SUBSCRIPTION_RENEWED`, `SUBSCRIPTION_IN_GRACE_PERIOD`, `SUBSCRIPTION_ON_HOLD`, `SUBSCRIPTION_CANCELED`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_REVOKED`, dan `VOIDED_PURCHASE`.

Status yang penting untuk kontrol akses lebih sedikit daripada tipe event-nya:

- **Active / renewing** — beri akses sampai `expires_at`.
- **Grace period** — pembayaran gagal tetapi store masih mencoba. Pertahankan akses. Ini fitur retensi yang disengaja; mencabut di sini akan menghilangkan pengguna yang kartunya hanya kedaluwarsa.
- **On hold** — grace berakhir. Cabut. Play berhenti mencoba sampai pengguna memperbaiki pembayaran.
- **Canceled tetapi belum kedaluwarsa** — pengguna mematikan perpanjangan otomatis. Jangan cabut; mereka sudah membayar sampai akhir periode, dan mencabut lebih awal adalah permintaan refund yang menunggu terjadi.
- **Refunded / revoked** — cabut segera. `REFUND` dari Apple dan `VOIDED_PURCHASE` dari Google berarti uangnya sudah kembali.
- **Billing retry** (Apple) — secara semangat setara grace period plus percobaan ulang; pertahankan akses selama store mencoba, lalu kedaluwarsakan.

Dua catatan implementasi yang menghemat berminggu-minggu. Pertama, notifikasi dikirim minimal sekali dengan kemungkinan urutan acak, jadi setiap handler harus idempoten dan membandingkan timestamp event alih-alih mengasumsikan urutan. Kedua, notifikasi adalah sinyal, bukan datanya: payload memberi tahu bahwa ada perubahan, lalu Anda mengambil status terkini dari API store dan merekonsiliasi. Mempercayai payload saja berarti satu field yang hilang atau satu event yang diputar ulang akan merusak buku besar Anda tanpa suara.

### Restore, Lintas Perangkat, dan Jalur Pemulihan "Saya Sudah Bayar tapi Terkunci"

Restore bukan kasus pinggiran; ia jalur normal bagi siapa pun yang berganti ponsel, memasang ulang, atau memulihkan dari backup. `getAvailablePurchases()` mengembalikan pembelian non-consumable dan langganan yang terikat pada akun store, dan penanganan yang benar adalah mengirim masing-masing melalui endpoint verifikasi yang sama dengan callback pembelian. Satu jalur kode, dua titik masuk.

Varian yang lebih rumit adalah pengguna yang punya hak di store tetapi terblokir di aplikasi Anda karena sesinya milik akun berbeda. Putuskan kebijakannya secara eksplisit, karena kedua jawaban bisa dibela dan tidak ada yang menjadi default:

- **Akun store menang** — pembelian menempel pada pengguna aplikasi mana pun yang sedang masuk saat verifikasi berjalan. Sederhana, tetapi memungkinkan satu langganan dibagi antar akun.
- **Akun aplikasi menang** — langganan terikat pada pengguna pertama yang memverifikasinya, dan pengguna kedua yang melakukan restore di perangkat yang sama mendapat galat. Tepat untuk tim, menjengkelkan untuk keluarga.

Untuk sebagian besar aplikasi konsumen yang pertama adalah pilihan tepat, dengan aturan server bahwa satu original transaction ID hanya boleh memetakan ke satu pengguna aplikasi aktif pada satu waktu. Itu memberi kasus perangkat bersama hasil yang deterministik — verifikasi terbaru menang, ikatan sebelumnya dicatat — alih-alih keadaan ambigu di mana keduanya punya hak.

UX pemulihannya lebih penting daripada kebijakannya. Layar yang menawarkan "Restore purchases" harus ada, harus benar-benar memanggil store, dan harus melaporkan salah satu dari tiga hasil: berhasil dipulihkan, tidak ada yang bisa dipulihkan, atau verifikasi gagal dengan opsi coba lagi. Paywall tanpa opsi restore adalah beban dukungan sekaligus risiko review.

### Aturan UX Paywall yang Memengaruhi Pendapatan dan Hasil Review

Paywall adalah tempat engineering bertemu kebijakan, dan beberapa aturan layak dikodekan sejak hari pertama.

- **Tampilkan harga terlokalisasi dari store.** `product.displayPrice` sudah diformat untuk storefront pengguna, termasuk mata uang dan konvensi pajak. "$4.99" yang ditulis di kode salah di setiap storefront non-AS dan menjadi alasan penolakan ketika berbeda dengan lembar pembelian.
- **Jangan pernah menyembunyikan opsi restore.** Apple mewajibkan cara memulihkan pembelian non-consumable, dan tombol restore yang tersembunyi terbaca sebagai dark pattern.
- **Jawab pertanyaan trial dari store.** `isEligibleForIntroOfferIOS` memberi tahu apakah Apple ID ini masih bisa mengambil penawaran intro. Menampilkan "gratis 7 hari" kepada orang yang sudah memakainya menghasilkan tiket dukungan tepat pada saat penagihan.
- **Nyatakan syarat perpanjangan secara jelas.** Harga, periode, dan cara pembatalan, di paywall, dalam bahasa yang dibaca pengguna. Mengungkapkannya di halaman tertaut tidak cukup.
- **Tangani setiap galat yang bisa dikembalikan store.** `ErrorCode.UserCancelled` bukan galat dan harus senyap. `PaymentPending` (Ask to Buy, SCA) harus menghasilkan status "menunggu persetujuan", bukan toast kegagalan. `AlreadyOwned` seharusnya memicu restore, bukan percobaan tagih kedua.
- **Jangan mencoba ulang pembelian yang gagal secara otomatis.** Kartu yang ditolak dan diulang terus-menerus akan kena rate limit, dan paling buruk ditandai sebagai fraud.

## Contoh Kode

Katalog menaruh pengenal store di satu tempat dan menjaga pemetaan offering di balik API. Tidak ada bagian lain aplikasi yang boleh memuat string ID produk.

```typescript
// src/iap/catalog.ts
export type ProductType = 'subs' | 'inapp';

export interface CatalogProduct {
  id: string;
  type: ProductType;
  entitlement: string;
  consumable: boolean;
}

export const CATALOG: Record<string, CatalogProduct> = {
  'com.acme.pro.monthly': {
    id: 'com.acme.pro.monthly',
    type: 'subs',
    entitlement: 'pro',
    consumable: false,
  },
  'com.acme.pro.yearly': {
    id: 'com.acme.pro.yearly',
    type: 'subs',
    entitlement: 'pro',
    consumable: false,
  },
  'com.acme.credits.100': {
    id: 'com.acme.credits.100',
    type: 'inapp',
    entitlement: 'export_credits',
    consumable: true,
  },
};

export function subscriptionIds(): string[] {
  return Object.values(CATALOG)
    .filter((product) => product.type === 'subs')
    .map((product) => product.id);
}

export function productFor(id: string): CatalogProduct | undefined {
  return CATALOG[id];
}
```

Provider entitlement adalah satu-satunya tempat yang tahu cara mengubah respons server menjadi status UI. Pembelian yang masih diverifikasi menghasilkan `pending`, yang ditampilkan paywall sebagai spinner alih-alih penolakan.

```tsx
// src/iap/EntitlementsProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client';

type Status = 'loading' | 'pending' | 'ready' | 'error';

interface Entitlements {
  pro: boolean;
  exportCredits: number;
  expiresAt: string | null;
}

interface EntitlementsContextValue {
  status: Status;
  entitlements: Entitlements;
  has: (key: keyof Entitlements) => boolean;
  refresh: () => Promise<void>;
}

const EMPTY: Entitlements = { pro: false, exportCredits: 0, expiresAt: null };

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [entitlements, setEntitlements] = useState<Entitlements>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      // Server adalah sumber kebenaran; jangan menurunkan akses secara lokal.
      const response = await api.get<Entitlements>('/me/entitlements');
      setEntitlements(response);
      setStatus('ready');
    } catch (error) {
      console.warn('Penyegaran entitlement gagal', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      status,
      entitlements,
      has: (key) =>
        key === 'expiresAt' ? entitlements.expiresAt !== null : Boolean(entitlements[key]),
      refresh,
    }),
    [status, entitlements, refresh],
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements(): EntitlementsContextValue {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements harus dipakai di dalam EntitlementsProvider');
  }
  return context;
}
```

Paywall tidak memanggil store lalu memutuskan sendiri. Ia meminta pembelian dan menyerahkan struk ke server, yang mengembalikan entitlement untuk disimpan.

```tsx
// src/screens/PaywallScreen.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { ErrorCode, useIAP, type Purchase } from 'react-native-iap';
import { CATALOG, subscriptionIds } from '../iap/catalog';
import { api } from '../api/client';
import { useEntitlements } from '../iap/EntitlementsProvider';

export function PaywallScreen() {
  const { refresh } = useEntitlements();
  const [verifying, setVerifying] = useState(false);

  const { connected, subscriptions, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      // Handler yang sama berjalan saat cold start dan saat pengiriman ganda,
      // jadi panggilan server harus idempoten berdasarkan purchase token.
      setVerifying(true);
      try {
        await api.post('/iap/verify', {
          platform: purchase.platform,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
        });
        await refresh();
        // Selesaikan hanya setelah server menerima struk.
        await finishTransaction({ purchase, isConsumable: false });
      } catch (error) {
        Alert.alert(
          'Pembelian belum bisa dikonfirmasi',
          'Pembayaran Anda berhasil tetapi belum bisa kami aktifkan. Coba tombol restore sebentar lagi.',
        );
        console.warn('Verifikasi gagal', error);
      } finally {
        setVerifying(false);
      }
    },
    onPurchaseError: (error) => {
      if (error.code === ErrorCode.UserCancelled) return;
      if (error.code === ErrorCode.PaymentPending) {
        Alert.alert('Menunggu persetujuan', 'Pembelian ini butuh persetujuan sebelum selesai.');
        return;
      }
      Alert.alert('Pembelian gagal', error.message);
    },
  });

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: subscriptionIds(), type: 'subs' }).catch((error) =>
      console.warn('Pengambilan produk gagal', error),
    );
  }, [connected, fetchProducts]);

  const buy = async (productId: string) => {
    const product = CATALOG[productId];
    if (!product) return;
    await requestPurchase({
      request: {
        // iOS menjual satu SKU per panggilan, Android menerima array.
        apple: { sku: productId },
        google: { skus: [productId] },
      },
      type: product.type === 'subs' ? 'subs' : 'in-app',
    });
  };

  if (verifying) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <ActivityIndicator />
        <Text>Mengaktifkan langganan Anda…</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 24, gap: 16 }}>
      {subscriptions.map((product) => (
        <TouchableOpacity key={product.id} onPress={() => void buy(product.id)}>
          <Text style={{ fontSize: 18 }}>{product.title}</Text>
          <Text>{product.displayPrice} per periode</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        onPress={() => {
          void api.post('/iap/restore').then(refresh);
        }}
      >
        <Text>Pulihkan pembelian</Text>
      </TouchableOpacity>
    </View>
  );
}
```

Endpoint restore dan verify memakai satu fungsi server yang sama. Itulah intinya: dua titik masuk, satu jalur validasi.

```typescript
// server/iap/service.ts
import { createHash } from 'node:crypto';

export interface VerifyInput {
  platform: 'ios' | 'android';
  productId: string;
  purchaseToken: string;
  userId: string;
}

export interface VerifiedSubscription {
  originalTransactionId: string;
  productId: string;
  status: 'active' | 'grace' | 'hold' | 'expired' | 'revoked';
  expiresAt: Date;
  environment: 'sandbox' | 'production';
}

export async function verifyAndGrant(input: VerifyInput) {
  if (!input.purchaseToken) {
    throw new Error('Purchase token tidak ada');
  }

  const verified =
    input.platform === 'ios'
      ? await verifyAppleJws(input.purchaseToken)
      : await verifyGooglePurchase(input.productId, input.purchaseToken);

  // Struk sandbox tidak boleh membuka akses produksi.
  if (verified.environment === 'sandbox' && process.env.NODE_ENV === 'production') {
    throw new Error('Struk sandbox ditolak di produksi');
  }

  const tokenHash = createHash('sha256').update(input.purchaseToken).digest('hex');
  const active = verified.status === 'active' || verified.status === 'grace';

  // Upsert berkunci ORIGINAL transaction id: perpanjangan menghasilkan
  // transaction id baru untuk langganan yang sama, jadi kunci ini stabil.
  await db.query(
    `insert into subscriptions
       (original_transaction_id, user_id, platform, product_id, status,
        expires_at, environment, token_hash, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict (original_transaction_id) do update set
       user_id = excluded.user_id,
       status = excluded.status,
       expires_at = greatest(subscriptions.expires_at, excluded.expires_at),
       token_hash = excluded.token_hash,
       updated_at = now()`,
    [
      verified.originalTransactionId,
      input.userId,
      input.platform,
      verified.productId,
      verified.status,
      verified.expiresAt,
      verified.environment,
      tokenHash,
    ],
  );

  return { active, expiresAt: verified.expiresAt, productId: verified.productId };
}
```

Notifikasi store datang minimal sekali dan bisa tak berurutan, jadi handler merekonsiliasi dari store alih-alih mempercayai isi payload.

```typescript
// server/iap/notifications.ts
import type { Request, Response } from 'express';
import { verifyAndGrant } from './service';

export async function handleAppleNotification(req: Request, res: Response) {
  const signedPayload = req.body?.signedPayload;
  if (!signedPayload) return res.status(400).json({ error: 'signedPayload tidak ada' });

  // Verifikasi rantai JWS lalu ekstrak tipe notifikasi dan transaksinya.
  const event = await decodeAppleNotification(signedPayload);

  try {
    // Payload hanyalah sinyal: ambil status terkini dari Apple, lalu terapkan.
    if (event.type !== 'REFUND' && event.type !== 'REVOKE') {
      await verifyAndGrant({
        platform: 'ios',
        productId: event.productId,
        purchaseToken: event.signedTransaction,
        userId: await userIdFor(event.originalTransactionId),
      });
    } else {
      await db.query(
        `update subscriptions set status = 'revoked', updated_at = now()
          where original_transaction_id = $1`,
        [event.originalTransactionId],
      );
    }
  } catch (error) {
    // Mengembalikan 5xx membuat Apple mencoba lagi; 200 membuang event selamanya.
    console.error('Penanganan notifikasi gagal', error);
    return res.status(500).json({ error: 'retry' });
  }

  return res.status(200).json({ received: true });
}

export async function handleGoogleRtdn(req: Request, res: Response) {
  const message = req.body?.message;
  if (!message?.data) return res.status(400).json({ error: 'message tidak ada' });
  const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf8'));

  try {
    // subscriptionNotification.notificationType memberi tahu apa yang berubah;
    // purchases.subscriptionsv2.get memberi tahu keadaannya sekarang.
    await reconcileGoogleSubscription(decoded.subscriptionNotification.purchaseToken);
  } catch (error) {
    console.error('Penanganan RTDN gagal', error);
    return res.status(500).json({ error: 'retry' });
  }

  return res.status(200).json({ received: true });
}
```

Skema menegakkan invarian yang tidak boleh dipercayakan pada klien.

```sql
-- Satu baris per langganan, dikunci oleh identitas stabil dari store.
create table subscriptions (
  original_transaction_id text primary key,
  user_id                 uuid not null references users (id),
  platform                text not null check (platform in ('ios', 'android')),
  product_id              text not null,
  status                  text not null
                          check (status in ('active', 'grace', 'hold', 'expired', 'revoked')),
  expires_at              timestamptz not null,
  environment             text not null check (environment in ('sandbox', 'production')),
  token_hash              text not null,
  updated_at              timestamptz not null default now()
);

create index subscriptions_user_active_idx
  on subscriptions (user_id, expires_at desc)
  where status in ('active', 'grace');

-- Jalur baca entitlement: satu query, tanpa mempercayai klien.
select
  (s.expires_at > now()
   and s.status in ('active', 'grace')
   and s.environment = 'production') as pro,
  s.expires_at
from subscriptions s
where s.user_id = $1
order by s.expires_at desc
limit 1;
```

## Insight Penting

- **Selesaikan transaksi paling akhir.** `finishTransaction` adalah pengakuan atas logika bisnis, bukan atas pembayaran. Memanggilnya sebelum validasi membuat kegagalan verifikasi tak bisa dipulihkan, dan di Android pembelian yang belum diselesaikan otomatis dikembalikan dananya setelah tiga hari, yang diam-diam membatalkan langganan pengguna yang membayar.
- **Idempotensi itu wajib, bukan defensif.** Callback pembelian menyala saat cold start, dan notifikasi store dikirim minimal sekali tanpa jaminan urutan. Unique constraint pada `original_transaction_id` ditambah `greatest(existing_expires_at, new_expires_at)` mengubah setiap duplikat menjadi no-op alih-alih pemberian ganda.
- **Grace period adalah keputusan produk yang dikodekan.** Mencabut akses begitu kartu gagal akan menghilangkan pelanggan yang pembayarannya hanya lewat. Pertahankan akses selama grace, cabut saat on hold, dan selalu biarkan langganan yang dibatalkan tetapi belum kedaluwarsa berjalan sampai `expires_at`.
- **Kebocoran sandbox adalah bug termahal di domain ini.** Satu `if` yang melewatkan pemeriksaan environment memungkinkan siapa pun dengan build TestFlight membuka produk produksi secara gratis. Tegakkan pemeriksaan di server, tempat klien tidak bisa menambalnya.
- **Harga terlokalisasi datang dari store, bukan dari salinan Anda.** `product.displayPrice` dan `product.title` sudah benar untuk storefront; string yang ditulis di kode menyimpang begitu Anda menambah mata uang atau mengubah harga, dan ketidakcocokan dengan lembar pembelian adalah alasan penolakan review.
- **Jalur baca entitlement harus satu query murah.** Membatasi layar tidak boleh memicu panggilan API store. Simpan jawaban server di klien dengan TTL singkat, segarkan saat aplikasi kembali ke depan, dan perlakukan "verifying" sebagai status tersendiri alih-alih penolakan.
- **Uji dengan akun sandbox asli di perangkat asli.** File konfigurasi StoreKit dan license tester Play mencakup sebagian besar alur, tetapi Ask to Buy, grace period, dan refund hanya bisa direproduksi lewat tooling sandbox store — dan di situlah bug-nya berada.

## Langkah Berikutnya

- Baca panduan pendamping tentang pengerasan keamanan React Native untuk sisi penyimpanan dan transport dari masalah yang sama: di mana menyimpan token auth yang mengotorisasi `/iap/verify`, dan bagaimana mengikatnya ke perangkat.
- Bangun jalur offline dari tutorial sinkronisasi offline ke dalam paywall, sehingga pembelian yang selesai di jaringan mati mencoba ulang verifikasi dari outbox alih-alih bergantung pada pengguna menekan restore.
- Tambahkan analitik sisi server pada funnel antara impresi paywall dan entitlement terverifikasi untuk melihat di mana kegagalan verifikasi sebenarnya mengumpul.
- Pelajari skema notifikasi store secara langsung — App Store Server Notifications V2 dan real-time developer notifications Google — dan tulis contract test terhadap payload terekam sebelum rilis.

## Kesimpulan

Anda sudah membangun lapisan monetisasi di mana klien tidak pernah memutuskan apa pun yang tidak bisa dibuktikannya. Produk diambil dari store beserta harga terlokalisasinya, offering diselesaikan di server sehingga eksperimen harga tidak perlu rilis, pembelian diverifikasi ke StoreKit 2 dan Play Billing sebelum akses diberikan, dan transaksi diselesaikan hanya setelah server mencatatnya. Entitlement dibaca dari satu query berindeks dan di-cache dengan TTL, sehingga membatasi layar menjadi murah dan tahan manipulasi.

Bagian yang paling menghemat tiket dukungan justru yang paling tidak menarik: unique constraint yang membuat callback ganda tak berbahaya, pemeriksaan environment yang menahan struk sandbox dari produksi, dan penanganan status untuk grace period, on hold, dan refund. Ketiga keputusan itulah pembeda antara paywall yang bekerja dan paywall yang diam-diam menagih orang tanpa memberi apa pun.

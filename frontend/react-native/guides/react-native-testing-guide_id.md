---
title: "Panduan Pengujian React Native"
description: "Panduan komprehensif untuk menguji aplikasi React Native — mulai dari unit test Jest dan component test dengan React Native Testing Library hingga end-to-end suite dengan Detox, lengkap dengan integrasi CI dan batas cakupan kode."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Pengujian React Native

## Pendahuluan

Aplikasi React Native lebih sulit diuji daripada aplikasi React web biasa karena tiga alasan konkret: kode JavaScript berjalan di thread terpisah dari UI native, sebagian besar fungsionalitas hidup di dalam modul native yang tidak ada di lingkungan pengujian Node.js, dan aplikasi menargetkan beberapa platform dengan perilaku runtime yang sedikit berbeda. Suite pengujian yang ditulis tanpa memperhitungkan batasan ini akan menguji hal yang tidak bermakna (semuanya di-mock) atau runtuh karena beban perawatan (setiap interaksi UI mengasertikan detail implementasi).

Panduan ini membangun strategi pengujian yang bekerja di setiap lapisan aplikasi React Native Anda: unit test yang cepat untuk logika bisnis, component dan integration test dengan React Native Testing Library yang mensimulasikan interaksi pengguna yang nyata, serta end-to-end suite yang sengaja dibuat kecil dengan Detox atau Maestro untuk memvalidasi perjalanan kritis di simulator atau emulator sungguhan. Anda akan mempelajari cara mengonfigurasi Jest dengan benar untuk proyek native, cara mem-*mock* modul native pada batas yang tepat, cara menjaga pengujian asinkron tetap deterministik, dan cara menghubungkan seluruh pipeline ke CI dengan ambang cakupan kode yang berfungsi sebagai pengaman, bukan sekadar angka.

## Praktik Terbaik

### Uji pada Tingkat Piramida yang Sesuai Risiko

Piramida pengujian berhubungan langsung dengan ekonomi React Native. Unit test memakan waktu milidetik dan bisa dijalankan ribuan kali di dalam Jest; test Detox harus mem-boot simulator, menginstal aplikasi, dan bisa memakan waktu menit per skenario — dan biayanya ditanggung pipeline CI pada setiap eksekusi. Dorong sebagian besar usaha pengujian ke lapisan cepat: logika murni (validator, utilitas tanggal, reducer, pemeta API), hook, dan perilaku komponen. Sisakan end-to-end test untuk segelintir perjalanan di mana integrasi banyak bagian yang bergerak justru menjadi risikonya: onboarding, autentikasi, checkout, dan titik masuk deep link.

```text
        /\
       /  \      End-to-end (Detox / Maestro): 5-15 perjalanan kritis
      /    \
     /------\    Integration (RNTL + mock): alur tingkat layar
    /        \
   /----------\  Unit (Jest): logika bisnis, hook, utilitas
  /____________\
```

### Query Seperti Pengguna, Bukan Seperti Implementasi

React Native Testing Library (RNTL) menyediakan query yang mencerminkan cara pengguna mengalami aplikasi. Utamakan `getByRole`, `getByText`, dan `getByPlaceholderText` sebelum menggunakan `getByTestId` — query tersebut menjaga test tetap terikat pada perilaku yang terlihat. Cadangkan `testID` untuk kasus yang tidak bisa diekspresikan query aksesibel: tombol ikon yang bisa ditekan tanpa teks, atau item daftar yang labelnya duplikat di layar. Jadikan `testID` bagian kelas satu dari API komponen (identifier yang sama berfungsi ganda sebagai pegangan Detox), dan jangan pernah mengasertikan variabel state internal atau nilai prop yang tidak terlihat pengguna — itu berarti menguji implementasi, yang sah-sah saja berubah.

```tsx
// ❌ Menguji implementasi, rusak saat styling atau layout di-refactor
expect(screen.getByTestId('tombol-kirim')).toHaveStyle({ backgroundColor: '#6200EE' });

// ✅ Menguji perilaku yang bisa diamati
await userEvent.press(screen.getByRole('button', { name: 'Buat Akun' }));
expect(await screen.findByText('Selamat datang kembali!')).toBeOnTheScreen();
```

### Mock Modul Native di Batas, Bukan di Setiap Test

Modul native — AsyncStorage, `expo-location`, `react-native-maps`, InAppPurchases — tidak bisa berjalan di Node. Godaannya adalah mem-*mock* modul tersebut satu per satu di dalam setiap test; hasilnya adalah suite tempat mock menyimpang dari API aslinya. Sebagai gantinya, definisikan satu `jest.setup.js` yang mem-*mock* semua modul native yang disentuh aplikasi, jadikan mock tersebut sebagai sumber kebenaran bersama, dan biarkan test individual meng-*override* hanya bagian yang mereka pedulikan. Jaga permukaan mock sekecil antarmuka TypeScript modul tersebut — modul yang di-mock sampai bentuk implementasi penuhnya akan rusak begitu sisi native berubah.

```tsx
// jest.setup.js — satu tempat yang tahu bagaimana batasan native berperilaku
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
}));
```

### Jaga Test Asinkron Tetap Deterministik

Komponen React Native sering menggabungkan pembaruan UI dengan promise, timer, dan frame animasi. Tiga disiplin mencegah test yang flaky: gunakan `findBy*` atau `waitFor` setiap kali state terselesaikan secara asinkron alih-alih menebak dengan `setTimeout`; bungkus pembaruan state dalam `act()` (atau andalkan `userEvent` milik RNTL yang melakukannya untuk Anda) sehingga peringatan React memunculkan bug nyata alih-alih ditekan; dan ketika komponen bergantung pada timer atau tanggal, gunakan fake timer Jest di test yang memiliki perilaku tersebut dan timer asli di tempat lain.

```tsx
test('menampilkan state kosong setelah permintaan feed gagal', async () => {
  (api.fetchFeed as jest.Mock).mockRejectedValueOnce(new Error('offline'));

  render(<HomeScreen />);
  expect(await screen.findByText('Tidak dapat memuat feed Anda')).toBeOnTheScreen();
  expect(api.fetchFeed).toHaveBeenCalledTimes(1);
});
```

### Uji Perilaku, Bukan Detail Implementasi

Test yang lulus hari ini dan gagal setelah refactor yang tidak mengubah perilaku yang terlihat pengguna adalah liabilitas, bukan aset. Asertikan apa yang pengguna lihat dan efek samping yang dihasilkan layar: teks yang dirender, event navigasi yang dipancarkan, panggilan API dengan payload yang benar, penulisan storage yang dilakukan. Jika sebuah test perlu menyentuh internal komponen, itu adalah sinyal bahwa perilaku tidak diekspresikan lewat antarmuka yang bisa diamati secara bersih — restrukturisasi komponen, bukan melonggarkan test.

```tsx
// ❌ Rapuh — mengasertikan state internal
expect(wrapper.instance().state.count).toBe(1);

// ✅ Stabil — mengasertikan konsekuensi interaksi
await userEvent.press(screen.getByLabelText('Tambah'));
expect(screen.getByText('1 item di keranjang')).toBeOnTheScreen();
```

### Tambahkan testID Sejak Awal API Komponen

`testID` adalah permukaan kontraktual antara UI dan test Anda, di semua tingkat: RNTL untuk integration test, Detox dan Maestro untuk E2E. Tentukan identifier saat komponen ditulis — nama yang stabil dan deskriptif dengan lingkup layar (`checkout.tombol-bayar`, `feed.item-3`) — dan perlakukan ketidakhadirannya di PR yang di-merge sebagai masalah review. Awalan berlingkup layar menjaga identifier tetap unik di aplikasi yang terus tumbuh, yang merupakan syarat mutlak untuk selector E2E yang memindai seluruh pohon yang dirender.

### Jaga Cakupan End-to-End Tetap Kecil dan Bernilai Tinggi

Biaya per test adalah faktor penentu. Setiap skenario E2E berlipat ganda melintasi konfigurasi iOS dan Android, menambah menit di CI, dan rusak karena variasi perangkat fisik. Terapkan aturan untuk apa yang layak masuk suite E2E: perjalanan itu harus melintasi setidaknya dua batas berikut — modul native, jaringan, navigasi, deep link, atau SDK pihak ketiga. Checkout dengan mock pembayaran sungguhan, login dengan fallback biometrik, dan deep link notifikasi push adalah contoh kanonik; form dengan dua input teks bukan.

### Jadikan Cakupan Kode Pengaman, Bukan Target

`coverageThreshold` adalah kontrak, bukan motivator. Tetapkan ambang yang nyaman dilampaui jalur kode kritis dan menangkap regresi: memaksakan 80% di `utils/`, `hooks/`, dan `store/` sambil menjaga ambang baris global lebih rendah mengakui bahwa layar dengan empat puluh cabang kondisional bukan tempat nilai asuransi berada. Angka cakupan saja tidak mengatakan apa pun tentang apakah perilaku penting sudah diuji — pasangkan ambang tersebut dengan checklist review singkat (state loading, error, dan kosong sudah diuji? efek navigasi sudah diasertikan? batas native di-mock dengan benar?) yang dijalankan saat code review.

## Langkah Implementasi

### Langkah 1: Siapkan Stack Pengujian

Instal dependensi pengujian. Untuk proyek Expo, `jest-expo` menyediakan preset yang sadar platform; untuk proyek React Native bare, preset `react-native` adalah baseline-nya. React Native Testing Library versi 12.4 ke atas sudah menyertakan matcher Jest miliknya sendiri (`toBeOnTheScreen`, `toHaveTextContent`, `toBeDisabled`), jadi paket `@testing-library/jest-native` yang sudah tidak direkomendasikan tidak diperlukan.

```bash
# Proyek Expo
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest

# Proyek React Native bare
npm install --save-dev jest @testing-library/react-native @types/jest
```

### Langkah 2: Konfigurasi Jest

Untuk aplikasi Expo, tambahkan preset dan pola ignore transform yang memungkinkan Jest mengompilasi paket khusus ESM di `node_modules` (Expo, React Navigation, dan sejenisnya mengirim kode yang belum di-transpile). Untuk aplikasi bare, `preset: 'react-native'` ditambah `transformIgnorePatterns` yang sama menangani paket yang menerbitkan JavaScript belum ditranspile.

```json
{
  "preset": "jest-expo",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))"
  ],
  "collectCoverageFrom": [
    "src/utils/**/*.{ts,tsx}",
    "src/hooks/**/*.{ts,tsx}",
    "src/store/**/*.{ts,tsx}",
    "!src/**/*.types.ts"
  ]
}
```

Tambahkan skrip npm yang akan dipanggil pipeline CI dan developer:

```json
{
  "scripts": {
    "test": "jest",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:update": "jest -u"
  }
}
```

### Langkah 3: Tulis Component Test dengan React Native Testing Library

Component test merender sebuah komponen secara terisolasi, berinteraksi dengannya seperti pengguna, dan mengasertikan hasil yang terlihat. Gunakan `userEvent` untuk interaksi — ia membungkus `fireEvent` dengan timing yang realistis dan penanganan `act()` otomatis.

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { LoginForm } from '../LoginForm';

test('menolak pengiriman dengan email tidak valid', async () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  await userEvent.type(screen.getByPlaceholderText('Email'), 'bukan-email');
  await userEvent.press(screen.getByRole('button', { name: 'Masuk' }));

  expect(await screen.findByText('Masukkan alamat email yang valid')).toBeOnTheScreen();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('mengirim kredensial yang valid', async () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  await userEvent.type(screen.getByPlaceholderText('Email'), 'user@example.com');
  await userEvent.type(screen.getByPlaceholderText('Kata Sandi'), 'rahasia!');
  await userEvent.press(screen.getByRole('button', { name: 'Masuk' }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'rahasia!',
  });
});
```

### Langkah 4: Uji Hook dan Logika Bisnis

Hook adalah target unit dengan ROI tertinggi di aplikasi React Native: mereka mengisolasi logika yang diandalkan layar, dan bisa diuji tanpa merender satu komponen pun. `renderHook` milik RNTL memberi mereka lingkungan React yang jujur, termasuk `act()` untuk pembaruan state.

```tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProducts } from '../useProducts';

test('memuat produk dan mengekspos state loading dan error', async () => {
  (api.fetchProducts as jest.Mock).mockResolvedValueOnce([{ id: 1, name: 'Kursi' }]);

  const { result } = renderHook(() => useProducts('furnitur'));

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.products).toEqual([{ id: 1, name: 'Kursi' }]);
});

test('mengosongkan keranjang saat sesi berakhir', () => {
  const { result } = renderHook(() => useCartStore());

  act(() => result.current.addItem({ id: 1, price: 99 }));
  act(() => result.current.expireSession());

  expect(result.current.items).toHaveLength(0);
});
```

Fungsi murni — validator, pemformat mata uang, aritmetika tanggal, kasus reducer — tidak perlu rendering sama sekali. Jaga mereka bebas dependensi sehingga test Jest biasa tetap sangat cepat.

```tsx
import { groupByCategory } from '../utils/katalog';

test('mengelompokkan produk per kategori dengan urutan penyisipan terjaga', () => {
  const products = [
    { id: 1, category: 'kursi' },
    { id: 2, category: 'meja' },
    { id: 3, category: 'kursi' },
  ];

  expect(groupByCategory(products)).toEqual({
    kursi: [products[0], products[2]],
    meja: [products[1]],
  });
});
```

### Langkah 5: Mock Modul Native di Batas

Pusatkan mock modul native di `jest.setup.js` sehingga setiap file test berbagi kontrak yang sama, lalu override per test ketika perilaku tertentu yang dibutuhkan.

```tsx
// jest.setup.js — mock batas native bersama
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Marker: View };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: -6.2, longitude: 106.8 },
  })),
}));
```

Ketika satu test membutuhkan perilaku berbeda, override lewat API mock itu sendiri — jangan pernah memanggil `jest.mock` untuk kedua kalinya di dalam body file test.

```tsx
test('menampilkan prompt izin saat lokasi ditolak', async () => {
  (expoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'denied',
  });

  render(<NearbyPlacesScreen />);
  expect(await screen.findByText('Izin lokasi diperlukan')).toBeOnTheScreen();
});
```

Untuk SDK pihak ketiga dengan permukaan native yang berat (maps, analytics, pembayaran), utamakan mock yang diterbitkan resmi oleh pustakanya jika ada — `async-storage` dan `react-native-keychain` mengirim mock teruji yang mengikuti API asli lebih setia daripada stub buatan tangan.

### Langkah 6: Tambahkan End-to-End Test dengan Detox

Detox mengemudikan simulator atau emulator sungguhan dan harus tersinkronisasi dengan event loop aplikasi. Konfigurasikan di `.detoxrc.js`, dengan menyebut identifier `testID` yang sama yang sudah dipakai component test Anda — kontraknya terbawa antara dua tingkat.

```javascript
// .detoxrc.js
module.exports = {
  testRunner: { args: { $0: 'jest', config: 'e2e/jest.config.js' } },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/YourApp.app',
      build: "xcodebuild -workspace ios/YourApp.xcworkspace -scheme YourApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
  },
  devices: {
    simulator: { type: 'ios.simulator', device: { type: 'iPhone 15' } },
  },
  configurations: {
    'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
  },
};
```

Skenario E2E dibaca sebagai perjalanan pengguna: luncurkan, berinteraksi lewat UI dengan `testID` atau teks, asertikan state layar yang dihasilkan.

```typescript
// e2e/checkout.e2e.ts
describe('Alur checkout', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('menyelesaikan pembelian dari awal hingga akhir', async () => {
    await element(by.id('checkout.tombol-bayar')).tap();
    await expect(element(by.id('checkout.proses'))).toBeVisible();
    await expect(element(by.id('checkout.sukses'))).toBeVisible();
  });
});
```

Jika pipeline build native Detox terasa berat untuk tim kecil, Maestro adalah alternatif yang lebih ringan: ia mengemudikan aplikasi lewat pohon aksesibilitas dengan alur YAML, tidak memerlukan integrasi build native, dan terintegrasi mulus ke CI.

```yaml
# flow.yaml — versi Maestro dari perjalanan yang sama
appId: com.example.yourapp
---
- launchApp
- tapOn:
    id: "checkout.tombol-bayar"
- assertVisible:
    id: "checkout.sukses"
```

### Langkah 7: Jalankan Test di CI

Hubungkan lapisan unit, integration, dan E2E ke pipeline GitHub Actions. Lapisan cepat berjalan di setiap push; suite E2E yang mahal berjalan di branch utama dan pada pull request yang menyentuh kode aplikasi, sehingga suite terbayar pada saat merge.

```yaml
name: test
on:
  push:
    branches: [main, development]
  pull_request:

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:ci

  e2e-ios:
    runs-on: macos-14
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx detox build --configuration ios.sim.debug
      - run: npx detox test --configuration ios.sim.debug
```

Untuk proyek Expo, EAS Build menyediakan CI terkelola tanpa perlu memelihara runner macOS: `eas build` dengan profil `test` menjalankan suite Jest, dan metadata EAS Update bisa menjadi gerbang promosi berdasarkan hasil test.

### Langkah 8: Tetapkan Ambang Cakupan dan Gerbang Kualitas

Buat gerbang kualitas dapat ditegakkan, bukan sekadar aspirasi. Ambang yang menggagalkan build ketika logika inti mengalami regresi lebih berharga daripada dashboard yang tidak dibaca siapa pun.

```json
{
  "jest": {
    "coverageThreshold": {
      "global": { "lines": 70, "statements": 70, "branches": 60 },
      "./src/utils/": { "lines": 90, "statements": 90, "branches": 80 },
      "./src/hooks/": { "lines": 85, "statements": 85 },
      "./src/store/": { "lines": 85, "statements": 85 }
    }
  }
}
```

Tambahkan gerbang manusiawi kedua di template pull request dengan tiga pertanyaan: apakah state loading, error, dan kosong sudah diuji untuk setiap layar baru; apakah batas native di-mock di `jest.setup.js` alih-alih inline; dan apakah perubahan menambah atau memakai ulang `testID` untuk setiap elemen interaktif. Kombinasi ambang otomatis dan checklist singkat menjaga suite tetap jujur seiring aplikasi bertumbuh.

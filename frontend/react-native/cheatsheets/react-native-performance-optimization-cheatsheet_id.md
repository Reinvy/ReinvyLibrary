---
title: "Cheatsheet Optimasi Performa React Native"
description: "Referensi cepat untuk profiling dan mempercepat aplikasi React Native: Hermes dan New Architecture, pengurangan ukuran bundle, optimasi render, virtualisasi daftar, performa gambar dan startup, serta manajemen memori."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheatsheet Optimasi Performa React Native

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Aktifkan Hermes di Android | `hermesEnabled true` di `android/gradle.properties` | Default sejak RN 0.70 — mengompilasi JS menjadi bytecode lebih awal |
| Aktifkan Hermes di iOS | Aktifkan pod `hermes` dan setel flag di Podfile | Startup lebih cepat, memori lebih rendah, ukuran aplikasi lebih kecil |
| Aktifkan New Architecture | `newArchEnabled=true` di `gradle.properties` | Fabric renderer, TurboModules, dan codegen — default sejak RN 0.76+ |
| Analisis ukuran bundle | `npx react-native bundle --platform android --dev false --profile` | Menghasilkan file `.map` untuk analisis bundle |
| Analisis dengan source map | `npx source-map-explorer android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle.map` | Memvisualisasikan kontribusi tiap modul terhadap bundle |
| Profil JS dengan React DevTools | `npx react-devtools` | Profil CPU dan pohon komponen, menyoroti re-render yang boros |
| Profil dengan alat native | Android Studio Profiler / Xcode Instruments | Frame rate (FPS), CPU, memori, dan aktivitas thread native |
| Aktifkan Fast Refresh | Default Metro saat development | Mempertahankan state komponen saat modul yang diedit di-hot-reload |
| Deteksi render loop | Library `why-did-you-render` | Mencatat setiap re-render tak terduga beserta diff props/state |
| Placeholder daftar kosong | `ListEmptyComponent` pada FlatList | Menghindari cabang `render` kondisional yang membuat elemen ulang |
| Bekukan baris di luar layar | `react-native-freeze` | Menunda render baris tersembunyi untuk memangkas biaya render yang tidak aktif |
| Cache gambar remote | `react-native-fast-image` | Cache disk dan memori dengan dukungan prioritas dan resize |
| Muat konfigurasi paralel | File `.env` dibundel saat build | Menghindari startup yang terblokir oleh fetch konfigurasi remote |

## Perintah Umum

### Hermes dan Flag Build

```bash
# Android: pertahankan Hermes dan New Architecture tetap aktif
echo "hermesEnabled=true" >> android/gradle.properties
echo "newArchEnabled=true" >> android/gradle.properties

# iOS: aktifkan Hermes di Podfile (RN 0.70+)
cd ios && bundle install && bundle exec pod install

# Buat release bundle untuk profiling
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output android/app/build/main.jsbundle --profile

# Build rilis Android
cd android && ./gradlew assembleRelease

# Build rilis iOS
cd ios && npx react-native run-ios --configuration Release
```

### Analisis Bundle dan Performa

```bash
# Pasang visualizer bundle
npm install --save-dev source-map-explorer

# Buat bundle, lalu eksplorasi hasilnya
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output /tmp/index.bundle \
  --sourcemap-output /tmp/index.bundle.map
npx source-map-explorer /tmp/index.bundle.map

# Jalankan React DevTools untuk profiler komponen
npx react-devtools

# Reset cache transform Metro bila pengukuran terlihat basi
npx react-native start --reset-cache
```

### Verifikasi Khusus Rilis

```bash
# Android: pastikan bytecode Hermes dihasilkan (build rilis)
find android/app/build -name "*.hbc" | head

# iOS: ukur startup dengan template App Launch di Instruments
# Android: gunakan "Startup Profiling" di Android Studio Profiler

# Catat timing render JS (Android, varian rilis)
adb logcat -s ReactNativeJS:V ReactNative:V
```

## Potongan Kode

### Memoisasi Komponen dan Callback

```javascript
import React, { memo, useCallback, useMemo } from 'react';

// Lewati re-render saat props setara secara referensial
const ProductCard = memo(function ProductCard({ product, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
    </Pressable>
  );
});

export default function ProductList({ products }) {
  // Callback stabil: identitas fungsi baru akan membatalkan memoisasi
  const handlePress = useCallback((id) => {
    navigate(`/product/${id}`);
  }, [navigate]);

  // Data turunan yang mahal dihitung sekali per perubahan products
  const sorted = useMemo(
    () => [...products].sort((a, b) => a.price - b.price),
    [products],
  );

  return sorted.map((product) => (
    <ProductCard key={product.id} product={product} onPress={() => handlePress(product.id)} />
  ));
}
```

### FlatList Tervirtualisasi

```javascript
import React, { useCallback } from 'react';
import { FlatList, Image, Text, View } from 'react-native';

// Satu komponen baris, dimemoisasi, hindari membuat elemen saat render
const Row = React.memo(({ item, onPress }) => (
  <View style={{ flexDirection: 'row' }}>
    <Image source={{ uri: item.thumbnail }} style={{ width: 48, height: 48 }} />
    <Text>{item.title}</Text>
  </View>
));

export default function Feed({ items, onPressItem }) {
  const renderItem = useCallback(
    ({ item }) => <Row item={item} onPress={() => onPressItem(item.id)} />,
    [onPressItem],
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      removeClippedSubviews
      getItemLayout={(_, index) => ({
        length: 56,
        offset: 56 * index,
        index,
      })}
      ListEmptyComponent={<Text>Belum ada item</Text>}
    />
  );
}
```

### Cache Gambar dan Siklus Hidup

```javascript
import FastImage from 'react-native-fast-image';

// Cache ke disk, prioritaskan gambar di atas lipatan layar
<FastImage
  style={{ width: 200, height: 200 }}
  source={{
    uri: 'https://cdn.example.com/large.jpg',
    priority: FastImage.priority.high,
  }}
  resizeMode={FastImage.resizeMode.contain}
/>

// Android saja: lepaskan memori gambar saat layar disembunyikan
import { Image } from 'react-native';
// Saat unmount: Image.queryCache dan Image prefetch menjaga cache tetap terkendali
FastImage.preload([
  { uri: 'https://cdn.example.com/next.jpg' },
  { uri: 'https://cdn.example.com/next2.jpg' },
]);
```

### Manajemen Interaksi dan Thread

```javascript
import { InteractionManager, TurboModuleRegistry } from 'react-native';

// Tunda pekerjaan berat hingga transisi navigasi selesai
InteractionManager.runAfterInteractions(() => {
  hydrateExpensiveState();
});

// Pindahkan kerja JS murni dari thread JS dengan TurboModule native
// (codegen New Architecture mengekspos metode native secara sinkron)
const NativeHeavy = TurboModuleRegistry.getEnforcing('NativeHeavy');
const result = NativeHeavy.computeInBackground(input);
```

### Mengukur Biaya Startup

```javascript
// Lacak durasi bootstrap JS untuk mendeteksi regresi startup
const START = Date.now();

if (global.performance && global.performance.mark) {
  global.performance.mark('app:start');
}

// Setelah layar pertama interaktif:
InteractionManager.runAfterInteractions(() => {
  console.log('Waktu hingga interaktif (ms):', Date.now() - START);
});
```

### Menghindari Kesalahan Umum

```javascript
import React from 'react';

// ❌ Props objek/fungsi inline memecah memoisasi pada setiap render
<View style={{ marginTop: 8 }} />
<Row onPress={() => doSomething(id)} />

// ✅ Angkat konstanta dan gunakan callback stabil
const STYLE = { marginTop: 8 };
const handlePress = React.useCallback(() => doSomething(id), [id]);
<View style={STYLE} />
<Row onPress={handlePress} />

// ❌ console.log di jalur render ikut masuk ke bundle produksi
// ✅ Hapus atau bungkus dengan __DEV__
if (__DEV__) console.log('render', id);

// ❌ Import dari library besar menarik seluruh pohon dependensi
// ✅ Gunakan import per-modul (mis. lodash/groupBy) atau ESM yang tree-shakeable
```

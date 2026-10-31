---
title: "Cheat Sheet Animasi React Native"
description: "Referensi cepat untuk Animated API, shared value Reanimated 3, transisi berbasis gesture, layout animation, dan penyetelan performa animasi."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Animasi React Native

## Tabel Referensi Cepat

| Aksi | API / Kode | Catatan |
|------|-----------|---------|
| Animasi timing imperatif | `Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true })` | Wajib memanggil `.start()`; native driver hanya untuk transform dan opacity |
| Animasi spring | `Animated.spring(v, { toValue: 1, friction: 6, tension: 60 })` | `duration` diabaikan; di Reanimated gunakan `damping`/`stiffness` |
| Decay / fling | `Animated.decay(v, { velocity: 2, deceleration: 0.997 })` | Memberi momentum setelah jari dilepas |
| Jalankan berurutan | `Animated.sequence([a, b])` | Animasi kedua mulai setelah yang pertama selesai |
| Jalankan paralel | `Animated.parallel([a, b], { stopTogether: false })` | Set `stopTogether: false` agar animasi lain tetap jalan |
| Selang-seling anak | `Animated.stagger(80, items)` | Umum dipakai untuk animasi masuk daftar |
| Loop terus-menerus | `Animated.loop(anim, { iterations: -1 })` | Hentikan saat unmount agar JS thread tidak sibuk |
| Interpolasi nilai | `v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] })` | Satu nilai menjadi banyak gaya keluaran |
| Shared value | `const x = useSharedValue(0)` | Reanimated 3; bisa ditulis dari UI thread |
| Animasi di UI thread | `x.value = withTiming(1, { duration: 250 })` | Tanpa lalu lintas bridge per frame |
| Animated style | `useAnimatedStyle(() => ({ opacity: x.value }))` | Baca `.value` di dalam worklet |
| Layout animation | `entering={FadeInDown.duration(300)}` | Preset bawaan Reanimated 3 |
| Gesture handler | `const pan = Gesture.Pan().onUpdate(e => { tx.value = e.translationX })` | Bungkus dengan `GestureDetector` |
| Nilai terikat scroll | `useAnimatedScrollHandler({ onScroll: e => { y.value = e.contentOffset.y } })` | Pasang pada `Animated.ScrollView` |
| Kurangi gerak | `useReducedMotion()` | Lewati animasi yang tidak esensial untuk aksesibilitas |

## Perintah Umum

### Pasang dan konfigurasi toolchain

```bash
# Reanimated 3 + gesture handler (Expo)
npx expo install react-native-reanimated react-native-gesture-handler

# React Native bare
npm install react-native-reanimated react-native-gesture-handler

# Pod iOS setelah instalasi
cd ios && pod install && cd ..

# Bersihkan cache Metro setiap kali konfigurasi Babel berubah
npx expo start --clear

# Overlay frame rate pada perangkat yang terhubung
adb shell dumpsys gfxinfo com.example.app
```

```javascript
// babel.config.js — plugin Reanimated wajib berada di urutan terakhir
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: ['react-native-reanimated/plugin'],
    };
};
```

### Pastikan native driver benar-benar dipakai

```bash
# Animasi harus tetap berjalan saat proses ini memblokir JS thread
# selama dua detik. Jika animasi membeku, animasi masih di JS thread.
node -e "console.log('gunakan menu dev di aplikasi: Perf Monitor')"
```

## Potongan Kode

### Animated API dengan native driver

```typescript
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';

export function KartuFadeIn({ children }: { children: React.ReactNode }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        const anim = Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }),
        ]);

        anim.start(({ finished }) => {
            if (!finished) {
                console.warn('Animasi masuk kartu terhenti sebelum selesai');
            }
        });

        return () => anim.stop();
    }, [opacity, translateY]);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <Pressable accessibilityRole="button">{children}</Pressable>
        </Animated.View>
    );
}
```

### Reanimated 3: baris swipe berbasis gesture dengan pembatasan nilai

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const BATAS_GESER = -96;

export function BarisSwipe({ children }: { children: React.ReactNode }) {
    const tx = useSharedValue(0);
    const awal = useSharedValue(0);

    const pan = Gesture.Pan()
        .onBegin(() => {
            awal.value = tx.value;
        })
        .onUpdate((event) => {
            const berikut = awal.value + event.translationX;
            tx.value = Math.min(0, Math.max(BATAS_GESER, berikut));
        })
        .onEnd((event) => {
            const harusTerbuka = event.translationX < BATAS_GESER / 2;
            tx.value = withSpring(harusTerbuka ? BATAS_GESER : 0, { damping: 18 });
        });

    const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={style}>{children}</Animated.View>
        </GestureDetector>
    );
}
```

### Aturan praktis performa

```text
1. Utamakan transform dan opacity — keduanya berjalan di native driver.
2. Jangan pernah menganimasikan width, height, top, atau margin untuk elemen yang dilihat pengguna.
3. Set useNativeDriver: true di semua tempat yang sah, atau animasi tersendat saat beban tinggi.
4. Jaga worklet tetap kecil; setiap alokasi di dalamnya dieksekusi tiap frame.
5. Selalu hentikan loop dan timer saat unmount agar tidak bocor memori dan menguras baterai.
6. Gunakan LayoutAnimation hanya untuk perubahan sekali jalan dan berfrekuensi rendah.
7. Uji pada perangkat Android terendah yang didukung, bukan pada emulator.
```

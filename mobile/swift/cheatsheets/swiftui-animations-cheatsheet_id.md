---
title: "Cheat Sheet Animasi SwiftUI"
description: "Referensi cepat API animasi SwiftUI: withAnimation, modifier animation, transition, matchedGeometryEffect, phase dan keyframe animator, serta aturan performa."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Animasi SwiftUI

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Animasi perubahan state | `withAnimation(.spring) { isOn.toggle() }` | Animasi eksplisit untuk view terdampak |
| Animasi satu nilai | `.animation(.easeInOut(duration: 0.3), value: isOn)` | Implisit, terbatas pada satu nilai |
| Spring dengan bounce | `.spring(duration: 0.5, bounce: 0.3)` | Spring iOS 17; bounce 0 = halus |
| Preset snappy | `.snappy(duration: 0.35, extraBounce: 0.1)` | Rasa default yang direkomendasikan Apple |
| Transition asimetris | `.transition(.asymmetric(insertion: .scale, removal: .opacity))` | Masuk dan keluar berbeda |
| Elemen bersama | `.matchedGeometryEffect(id: "card", in: ns)` | Morph hero antar state |
| Timeline keyframe | `keyframeAnimator(initialValue:trigger:)` | Keyframe multi-properti |
| Kurangi gerak | `@Environment(\.accessibilityReduceMotion)` | Lewati atau lunakkan animasi |

## Perintah Umum

### Pemeriksaan simulator untuk pekerjaan animasi

```bash
# Mode gelap: layer transparan berperilaku beda dibanding mode terang
xcrun simctl ui booted appearance dark

# Ukuran Dynamic Type terbesar, tempat animasi teks merusak layout
xcrun simctl ui booted content_size accessibility-extra-extra-extra-large

# Pastikan jalur degradasi Reduce Motion tetap benar
xcrun simctl ui booted increase_contrast enabled
```

### Build dan pengujian

```bash
# Jalankan hanya suite snapshot animasi
xcodebuild test -scheme MyApp \
    -destination 'platform=iOS Simulator,name=iPhone 15' \
    -only-testing:MyAppTests/AnimationTests
```

## Potongan Kode

### Animasi eksplisit versus implisit

```swift
struct ToggleDot: View {
    @State private var isOn = false
    var body: some View {
        Circle()
            .fill(isOn ? .green : .gray)
            .frame(width: 60, height: 60)
            .onTapGesture {
                // Eksplisit: hanya perubahan ini yang dianimasikan
                withAnimation(.spring(duration: 0.45, bounce: 0.35)) { isOn.toggle() }
            }
            // Implisit: setiap perubahan isOn dianimasikan
            .animation(.snappy, value: isOn)
    }
}
```

### Elemen bersama dengan matchedGeometryEffect

```swift
struct ExpandableCard: View {
    @Namespace private var ns
    @State private var expanded = false
    var body: some View {
        RoundedRectangle(cornerRadius: expanded ? 20 : 12)
            .fill(.blue.gradient)
            .matchedGeometryEffect(id: "card", in: ns)
            .frame(height: expanded ? 260 : 90)
            .padding()
            .onTapGesture {
                withAnimation(.spring(duration: 0.5)) { expanded.toggle() }
            }
    }
}
```

### Phase dan keyframe animator

```swift
// Fase berurutan, masing-masing dengan kurvanya sendiri
struct HeartBeat: View {
    @State private var beat = false
    var body: some View {
        PhaseAnimator([1.0, 1.25, 0.95, 1.0], trigger: beat) { scale in
            Image(systemName: "heart.fill")
                .font(.system(size: 64))
                .foregroundStyle(.red)
                .scaleEffect(scale)
        } animation: { _ in .easeInOut(duration: 0.22) }
            .onTapGesture { beat.toggle() }
    }
}
// Keyframe: track terpisah untuk skala dan rotasi
struct KeyframeBadge: View {
    @State private var trigger = false
    struct Values { var scale: Double = 1; var rotation: Double = 0 }
    var body: some View {
        Image(systemName: "star.fill")
            .keyframeAnimator(initialValue: Values(), trigger: trigger) { content, value in
                content.scaleEffect(value.scale).rotationEffect(.degrees(value.rotation))
            } keyframes: { _ in
                KeyframeTrack(\.scale) {
                    SpringKeyframe(1.4, duration: 0.25)
                    SpringKeyframe(1.0, duration: 0.30)
                }
            }
            .onTapGesture { trigger.toggle() }
    }
}
```

### Penjaga performa dan aksesibilitas

```swift
struct PulseGlow: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulsing = false
    var body: some View {
        Circle()
            .fill(.blue.opacity(0.7))
            .frame(width: 120, height: 120)
            .scaleEffect(pulsing ? 1.08 : 1.0)
            .drawingGroup()   // merasterisasi layer, lebih murah per frame
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                    pulsing = true
                }
            }
    }
}
```

### Transition yang terikat scroll

```swift
ScrollView {
    LazyVStack(spacing: 16) {
        ForEach(items) { item in
            CardView(item: item)
                .scrollTransition(.animated(.snappy)) { content, phase in
                    content.opacity(phase.isIdentity ? 1 : 0.4)
                        .scaleEffect(phase.isIdentity ? 1 : 0.92)
                }
        }
    }
}
```

### Aturan praktis

- Animasikan properti yang ramah transformasi (`scaleEffect`, `opacity`, `offset`) alih-alih `frame` atau `padding`; transform berjalan di render server, sedangkan layout menghitung ulang setiap frame.
- Selalu isi `value:` pada `.animation`; overload tanpa nilai sudah deprecated dan menganimasikan perubahan yang tidak terkait.
- Jaga satu sumber dan satu tujuan untuk setiap id `matchedGeometryEffect`; duplikat membuat frame tersendat.
- Uji dengan Reduce Motion dan Slow Animations sebelum merilis animasi yang berulang.

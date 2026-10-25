---
title: "Panduan Aksesibilitas Flutter"
description: "Panduan praktis membangun aplikasi Flutter yang aksesibel: widget semantics, dukungan pembaca layar, kontras warna, ukuran target sentuh, pembesaran teks, dan pengujian otomatis."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "guide"
locale: "id"
---

# Panduan Aksesibilitas Flutter

## Pendahuluan

Aksesibilitas bukan fitur yang ditempel sebelum rilis; ia adalah properti dari setiap widget yang Anda bangun. Sekitar satu dari enam orang hidup dengan disabilitas, dan banyak lagi bergantung pada fitur aksesibilitas secara sementara — tangan patah, cahaya matahari yang menyilaukan, kereta yang bising. Ketika aplikasi Flutter mengabaikan semantics, kontras, atau pembesaran teks, pengguna tersebut tidak dapat menyelesaikan tugas yang orang lain selesaikan dalam dua ketukan.

Flutter memberi fondasi yang kuat: hampir semua widget Material dan Cupertino sudah membawa semantics yang wajar, dan framework menyediakan `Semantics`, `MergeSemantics`, serta `ExcludeSemantics` untuk apa pun yang kustom. Masalahnya jarang pada framework — biasanya UI kustom dirangkai secara ad hoc, dengan `GestureDetector` telanjang, teks abu-abu di atas abu-abu, dan baris bertinggi tetap.

Panduan ini membahas enam area yang menyebabkan hampir semua kegagalan aksesibilitas nyata di Flutter: anotasi semantics, perilaku pembaca layar, kontras, target sentuh, pembesaran font, dan pengujian. Setiap praktik dipasangkan dengan API spesifik yang menegakkannya.

## Praktik Terbaik

- **Beri label setiap elemen interaktif dengan aksinya, bukan tampilannya.** Pembaca layar mengumumkan "Putar Aurora", bukan "tombol ikon". Utamakan `Semantics(label:, button: true)` atau `tooltip` pada `IconButton`; tombol ikon tanpa label tidak terlihat oleh TalkBack.
- **Gabungkan bagian-bagian dari baris komposit.** Satu list tile yang terdiri dari ikon, judul, dan tombol tambahan menghasilkan tiga perhentian fokus dan dua pengumuman berulang. Bungkus dengan `MergeSemantics` dan biarkan hanya anak yang dapat ditindak di luar penggabungan.
- **Kecualikan konten yang murni dekoratif.** Ikon dan gambar yang tidak menambah informasi harus dibungkus `ExcludeSemantics` atau memakai `excludeFromSemantics: true`, agar tidak menambah kebisingan di antara item nyata.
- **Hormati skala teks pengguna, jangan melawannya.** Layout harus tumbuh mengikuti `MediaQuery.textScalerOf(context)`. Hindari tinggi tetap dan `Text` satu baris di dalam kontainer; batasi hanya sebagai upaya terakhir dengan `MediaQuery.withClampedTextScaling`.
- **Penuhi kontras WCAG AA di kedua tema.** Teks isi membutuhkan rasio 4,5:1 terhadap latar, teks besar 3:1. Ambil warna dari `ColorScheme` (`onSurface`, `onPrimary`) alih-alih abu-abu hard-code, dan jangan pernah menyampaikan makna hanya lewat warna.
- **Jaga target sentuh minimal 48×48 dp.** Pedoman Android 48 dp, iOS 44 pt. Ikon kecil diberi padding, bukan area ketuk yang lebih kecil — gunakan default `IconButton` atau `ConstrainedBox(minWidth: 48, minHeight: 48)`.
- **Jangan bergantung pada gestur saja.** Aksi geser untuk menghapus dan tekan-lama membutuhkan kontrol eksplisit yang setara; jika tidak, pengguna switch-access atau pembaca layar tidak dapat menemukannya.
- **Perlakukan tes aksesibilitas sebagai gerbang build.** `meetsGuideline` menangkap regresi target sentuh, label, dan kontras pada setiap widget yang Anda pump, secara gratis.

## Langkah Implementasi

### Langkah 1: Audit Sebelum Mengubah Apa Pun

Jalankan aplikasi di perangkat dengan TalkBack (Android) atau VoiceOver (iOS) aktif, pejamkan mata, lalu coba selesaikan tugas utama aplikasi. Setelah itu pasang Accessibility Scanner dari Android atau gunakan Accessibility Inspector di Xcode untuk mendaftar pelanggaran kontras dan target sentuh. Catat yang gagal; daftar itu menjadi backlog Anda.

### Langkah 2: Anotasi Widget Kustom dengan Semantics

`GestureDetector` tidak menghasilkan semantics sama sekali. Bungkus secara eksplisit dan jelaskan aksinya dalam bahasa pengguna:

```dart
class TrackTile extends StatelessWidget {
  const TrackTile({super.key, required this.title, required this.onPlay});

  final String title;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return MergeSemantics(
      child: Semantics(
        button: true,
        label: 'Putar $title',
        child: InkWell(
          onTap: onPlay,
          child: Row(
            children: [
              const Icon(Icons.play_arrow, size: 20),
              const SizedBox(width: 12),
              Expanded(child: Text(title, overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
      ),
    );
  }
}
```

Ikon kini menjadi bagian dari node yang sama dengan judul, sehingga satu sapuan membaca satu item yang utuh. Untuk umpan balik sementara, umumkan secara eksplisit alih-alih mengandalkan snackbar visual:

```dart
SemanticsService.announce('$title ditambahkan ke antrean', Directionality.of(context));
```

Gunakan `Semantics(sortKey: OrdinalSortKey(2))` ketika urutan visual berbeda dari urutan baca logis, misalnya kartu yang badge-nya digambar lebih dulu tetapi harus dibaca terakhir.

### Langkah 3: Perbaiki Kontras dan Target Sentuh di Tingkat Tema

Bug kontras biasanya berasal dari warna ad hoc. Pindahkan ke tema agar semua layar mewarisi perbaikannya:

```dart
final theme = ThemeData(
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFF3F51B5),
    brightness: Brightness.light,
  ),
);

Text(
  'Sedang diputar',
  style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
);
```

Lalu tegakkan area ketuk untuk kontrol kustom:

```dart
SizedBox(
  width: 48,
  height: 48,
  child: IconButton(
    tooltip: 'Lewati ke trek berikutnya',
    icon: const Icon(Icons.skip_next),
    onPressed: onSkip,
  ),
);
```

`IconButton` sudah menjamin target ketuk minimum; `SizedBox` eksplisit penting untuk ikon berbasis `InkWell` buatan sendiri.

### Langkah 4: Pastikan Layout Bertahan terhadap Pembesaran Teks

Uji pada ukuran font sistem 200%. Ganti tinggi baris tetap dengan tinggi minimum dan biarkan `Text` membungkus:

```dart
Container(
  constraints: const BoxConstraints(minHeight: 56),
  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  child: Text(
    track.title,
    maxLines: 3,
    softWrap: true,
    overflow: TextOverflow.ellipsis,
  ),
);
```

Ketika desain benar-benar tidak dapat diskalakan — misalnya header tabel yang padat — batasi secara sadar dan dokumentasikan:

```dart
MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3, child: const HeaderRow());
```

### Langkah 5: Cegah Regresi dengan Widget Test

Pedoman aksesibilitas Flutter dapat diuji lewat matcher. Tambahkan di samping widget test biasa Anda:

```dart
void _noop() {}

testWidgets('track tile berlabel dan memenuhi pedoman target ketuk', (tester) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(body: TrackTile(title: 'Aurora', onPlay: _noop)),
  ));

  expect(
    tester.getSemantics(find.byType(TrackTile)),
    matchesSemantics(label: 'Putar Aurora', isButton: true, hasTapAction: true, isEnabled: true),
  );
  expect(tester, meetsGuideline(androidTapTargetGuideline));
  expect(tester, meetsGuideline(labeledTapTargetGuideline));
  expect(tester, meetsGuideline(textContrastGuideline));
});
```

Tiga matcher pedoman tersebut menutup regresi paling umum: target di bawah 48 dp, widget yang dapat diketuk tanpa label, dan teks yang gagal WCAG AA. Jalankan di CI agar layar baru tidak dapat di-merge tanpa lolos.

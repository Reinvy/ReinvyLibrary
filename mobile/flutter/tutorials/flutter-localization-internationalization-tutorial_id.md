---
title: "Lokalisasi dan Internasionalisasi Flutter"
description: "Tutorial langkah demi langkah untuk melokalisasi aplikasi Flutter dengan paket intl dan gen-l10n: file ARB, l10n.yaml, AppLocalizations, koneksi lokale, plural, serta pemformatan tanggal dan angka sesuai lokale."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Lokalisasi dan Internasionalisasi Flutter

## Ringkasan

Tutorial ini menunjukkan cara membuat aplikasi Flutter berbicara lebih dari satu bahasa. Anda akan menyiapkan paket `intl` dan alat bawaan `gen-l10n` dari Flutter, menulis string terjemahan dalam file ARB, mengonfigurasi `l10n.yaml`, serta menghasilkan kelas `AppLocalizations` yang bertipe kuat. Setelah itu, Anda akan menghubungkan aplikasi agar mengikuti lokale perangkat, menangani bentuk plural dengan benar, dan memformat tanggal serta mata uang sesuai kebiasaan tiap region. Pada akhirnya Anda akan memiliki satu layar checkout lengkap yang tampil dalam bahasa Inggris dan Indonesia dari satu basis kode.

## Target Audiens

- Pengembang aplikasi Flutter yang membangun aplikasi untuk menjangkau pengguna di berbagai negara.
- Ekspektasi tingkat kemampuan: **Menengah** (nyaman dengan widget Flutter, `MaterialApp`, dan Dart dasar).

## Prasyarat

- Flutter SDK 3.x (pembangkit kode sudah termasuk, tidak perlu instalasi tambahan).
- Pengetahuan Dart dasar: kelas, `async`/`await`, dan metode build widget.
- Proyek Flutter yang berfungsi dan `flutter pub get` selesai tanpa error.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menambahkan `flutter_localizations` dan `intl` ke sebuah proyek.
- Menulis file ARB template dan terjemahan dengan metadata placeholder dan plural.
- Mengonfigurasi `l10n.yaml` dan menghasilkan `AppLocalizations` bertipe kuat dengan `flutter gen-l10n`.
- Menghubungkan `localizationsDelegates`, `supportedLocales`, dan `locale` di `MaterialApp`.
- Menerapkan pesan plural untuk jumlah nol, satu, dan banyak.
- Memformat tanggal dan mata uang sesuai lokale dengan `intl`.

## Konteks dan Motivasi

Mengirimkan aplikasi hanya dalam satu bahasa diam-diam memangkas sebagian besar calon pengguna. Orang berharap aplikasi tersedia dalam bahasa mereka sendiri, dengan harga dan tanggal dalam format yang familier: pembeli Indonesia berharap melihat `Rp 12.500,00`, pembeli Amerika `$12,500.00`. Menulis string dan format secara hard-code memaksa Anda memecah basis kode per pasar, yang mahal dan cepat tidak sinkron.

Flutter menyelesaikan masalah ini dengan pipeline bawaan: file ARB menjadi sumber kebenaran tunggal untuk terjemahan, `gen-l10n` menghasilkan kelas Dart bertipe kuat saat build, dan `intl` menyediakan data pola untuk plural, tanggal, dan angka. Karena string yang dihasilkan bertipe kuat, compiler menangkap terjemahan yang hilang dan penggunaan placeholder yang salah sebelum aplikasi dirilis.

## Konten Inti

### Menyiapkan Dependensi

Tambahkan dua dependensi ke `pubspec.yaml`. `flutter_localizations` (dari SDK) menyediakan widget sadar-lokale dan kelas delegate; `intl` menyediakan pemformatan tanggal, angka, dan plural:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  intl: ^0.19.0
```

Jaga versi `intl` tetap selaras dengan versi yang dikunci `flutter_localizations`; `flutter pub get` akan memberi peringatan jika keduanya berbeda.

### Membuat File ARB

ARB (Application Resource Bundle) adalah file JSON berisi satu entri per pesan. File template `app_en.arb` mendefinisikan semua kunci, termasuk placeholder dan aturan plural:

```json
{
  "@@locale": "en",
  "appTitle": "ShopApp",
  "cartEmpty": "Your cart is empty",
  "itemCount": "{count, plural, =0{No items} one{1 item} other{{count} items}}",
  "@itemCount": {
    "placeholders": {
      "count": { "type": "int" }
    }
  },
  "checkoutTotal": "Total: {total}"
}
```

Setiap placeholder yang dipakai dalam pesan membutuhkan entri `@message` yang mendeklarasikan tipe datanya. File Indonesia `app_id.arb` menyediakan kunci yang sama dengan nilai terjemahan dan metadata placeholder yang sama:

```json
{
  "@@locale": "id",
  "appTitle": "ShopApp",
  "cartEmpty": "Keranjang Anda kosong",
  "itemCount": "{count, plural, =0{Tidak ada item} one{1 item} other{{count} item}}",
  "checkoutTotal": "Total: {total}"
}
```

### Mengonfigurasi l10n.yaml

`l10n.yaml` kecil di akar proyek memberi tahu pembangkit kode lokasi file ARB dan tujuan kode yang dihasilkan:

```yaml
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
output-dir: lib/l10n/generated
```

### Menghasilkan dan Menggunakan AppLocalizations

Jalankan `flutter gen-l10n` dari akar proyek (secara otomatis juga berjalan saat `flutter pub get` dan setiap build). Perintah ini menghasilkan `AppLocalizations` beserta satu subkelas per lokale di `lib/l10n/generated/`. Di dalam widget, baca pesan seperti `AppLocalizations.of(context)!.itemCount(3)`; lokale yang tidak dikenal akan kembali ke bahasa template.

### Menghubungkan Aplikasi ke Banyak Lokale

`MaterialApp` harus mengetahui lokale yang Anda dukung dan delegate mana yang memecahkan string:

```dart
// lib/main.dart (cuplikan)
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/generated/app_localizations.dart';

void main() => runApp(const ShopApp());

class ShopApp extends StatelessWidget {
  const ShopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ShopApp',
      supportedLocales: const [Locale('en'), Locale('id')],
      localizationsDelegates: const [
        AppLocalizations.delegate,             // pesan ARB Anda
        GlobalMaterialLocalizations.delegate,  // widget bawaan Flutter
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      localeResolutionCallback: (deviceLocale, supported) {
        // Lokale perangkat apa pun yang tidak didukung kembali ke Inggris.
        return supported!.contains(deviceLocale)
            ? deviceLocale
            : const Locale('en');
      },
      home: const CheckoutPage(),
    );
  }
}
```

`AppLocalizations.delegate` memecahkan string Anda sendiri; delegate `Global*` menerjemahkan widget bawaan Flutter (dialog, date picker, tooltip).

### Plural dan Pemformatan Sesuai Lokale

Pesan plural menggunakan sintaks ICU `plural` dari file ARB dan dihasilkan sebagai metode yang menerima jumlah. Tanggal dan angka menggunakan `DateFormat` dan `NumberFormat` dari `intl`, yang membaca lokale berjalan secara otomatis dalam widget Flutter.

## Contoh Kode

Halaman checkout lengkap yang memakai plural, mata uang, dan tanggal:

```dart
// lib/checkout_page.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'l10n/generated/app_localizations.dart';

class CheckoutPage extends StatelessWidget {
  const CheckoutPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final localeName = Localizations.localeOf(context).toString();

    const itemCount = 3;
    const total = 12500.5; // Rp 12.500,50 di id, Rp 12,500.50 di en
    final shipDate = DateTime.now().add(const Duration(days: 5));

    final currency = NumberFormat.currency(locale: localeName, symbol: 'Rp');
    final dateFormat = DateFormat.yMMMMd(localeName);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.appTitle)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.itemCount(itemCount)),
            const SizedBox(height: 8),
            Text(l10n.checkoutTotal(currency.format(total))),
            const SizedBox(height: 8),
            Text('Perkiraan pengiriman: ${dateFormat.format(shipDate)}'),
          ],
        ),
      ),
    );
  }
}
```

Dengan lokale perangkat `id`, tampilan menjadi "3 item", "Total: Rp 12.500,50", dan "5 September 2026"; dengan `en` menjadi "3 items", "Total: Rp 12,500.50", dan "September 10, 2026". Kegagalan pemformatan (misalnya lokale yang datanya belum diinisialisasi) tidak boleh membuat aplikasi crash, jadi bungkus pemanggilan format secara defensif:

```dart
String formatTotal(String localeName, double value) {
  try {
    return NumberFormat.currency(locale: localeName, symbol: 'Rp').format(value);
  } on FormatException catch (e) {
    // Delegate Flutter memuat data intl untuk lokale yang didukung, tetapi
    // lokale bentukan manual mungkin belum siap.
    debugPrint('Pemformatan mata uang gagal untuk $localeName: $e');
    return NumberFormat.currency(symbol: 'Rp').format(value);
  } on Error catch (e) {
    debugPrint('Error pemformatan tak terduga: $e');
    return value.toStringAsFixed(2);
  }
}
```

## Insight Penting

- Jaga `intl` pada versi yang dikunci `flutter_localizations`; versi yang tidak cocok dapat menyebabkan error codegen atau runtime yang membingungkan.
- `nullable-getter: true` (default) membuat `AppLocalizations.of(context)` nullable — atur `nullable-getter: false` di `l10n.yaml` jika Anda ingin akses non-null.
- Kunci yang belum diterjemahkan dalam file lokale otomatis kembali ke bahasa template, sehingga terjemahan yang hilang tidak pernah melempar error — tetapi kunci tersebut tetap harus ada di ARB template atau akan dibuang.
- Lokale perangkat sering membawa kode script/negara (`en-US`); mendeklarasikan `Locale('en')` tanpa negara memungkinkan pencocokan varian apa pun.
- Simpan `DateFormat`/`NumberFormat` di field daripada membuatnya di dalam `build`; pemformatan memang murah tetapi tidak gratis, dan pembuatan berulang mengalokasikan memori di setiap rebuild.

## Langkah Berikutnya

- Baca dokumentasi resmi Flutter tentang internasionalisasi untuk topik lanjutan seperti locale override dan aset per lokale.
- Gabungkan lokalisasi dengan struktur aplikasi pada [silabus Flutter](../syllabi/flutter-syllabus.md) dan [silabus produksi Flutter](../syllabi/flutter-production-engineering-syllabus.md).
- Berlatih dengan melokalisasi aplikasi yang ada ke tiga bahasa dengan aturan plural berbeda (misalnya tambahkan bahasa Polandia atau Arab).

## Kesimpulan

Anda kini memiliki pipeline lokalisasi Flutter yang lengkap: file ARB sebagai sumber kebenaran terjemahan, `l10n.yaml` yang menggerakkan pembangkitan kode, aksesor `AppLocalizations` bertipe kuat, resolusi lokale yang benar di `MaterialApp`, plural ICU, serta pemformatan tanggal dan mata uang yang sadar lokale. Aplikasi Anda tampil natural untuk tiap pasar dari satu basis kode — dan compiler menjaga terjemahan tetap jujur. Berikutnya, perluas pola yang sama ke string aksesibilitas atau beralih ke layanan pengelolaan terjemahan yang memakai format ARB yang sama.

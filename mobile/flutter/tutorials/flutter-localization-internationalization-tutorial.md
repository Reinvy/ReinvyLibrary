---
title: "Flutter Localization and Internationalization"
description: "A step-by-step tutorial on localizing Flutter apps with the intl package and gen-l10n: ARB files, l10n.yaml, AppLocalizations, locale wiring, plurals, and locale-aware date and number formatting."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Flutter Localization and Internationalization

## Summary

This tutorial shows you how to make a Flutter app speak more than one language. You will set up the `intl` package and Flutter's built-in `gen-l10n` tool, write translation strings in ARB files, configure `l10n.yaml`, and generate strongly typed `AppLocalizations` classes. You will then wire the app to follow the device locale, handle plural forms correctly, and format dates and currencies the way each region expects. By the end you will have a complete checkout screen that renders in English and Indonesian from a single codebase.

## Target Audience

- Flutter mobile developers building apps that must reach users in multiple countries.
- Expected developer level: **Intermediate** (comfortable with Flutter widgets, `MaterialApp`, and basic Dart).

## Prerequisites

- Flutter SDK 3.x (the code generator is bundled, no extra install needed).
- Basic Dart knowledge: classes, `async`/`await`, and widget build methods.
- A working Flutter project and `flutter pub get` completing without errors.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Add `flutter_localizations` and `intl` to a project.
- Write template and translated ARB files with placeholder and plural metadata.
- Configure `l10n.yaml` and generate typed `AppLocalizations` with `flutter gen-l10n`.
- Wire `localizationsDelegates`, `supportedLocales`, and `locale` in `MaterialApp`.
- Implement pluralized messages for zero, one, and many quantities.
- Format dates and currencies per locale with `intl`.

## Context and Motivation

Shipping one language quietly cuts off most of your potential users. People expect apps in their own language, with prices and dates in familiar formats: an Indonesian shopper expects `Rp 12.500,00`, an American expects `$12,500.00`. Hard-coding strings and formats forces you to fork the codebase per market, which is expensive and quickly drifts out of sync.

Flutter solves this with a built-in pipeline: ARB files are the single source of truth for translations, `gen-l10n` generates typed Dart classes at build time, and `intl` supplies the pattern data for plurals, dates, and numbers. Because the generated strings are typed, the compiler catches missing translations and invalid placeholder usage before your app ships.

## Core Content

### Setting Up the Dependencies

Add two dependencies to `pubspec.yaml`. `flutter_localizations` (from the SDK) provides locale-aware widgets and delegate classes; `intl` provides date, number, and plural formatting:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  intl: ^0.19.0
```

Keep the `intl` version aligned with what `flutter_localizations` pins; `flutter pub get` warns if they disagree.

### Writing ARB Files

ARB (Application Resource Bundle) is a JSON file containing one entry per message. The template file `app_en.arb` defines every key, including placeholders and plural rules:

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

Every placeholder used in a message needs a matching `@message` entry declaring its type. The Indonesian file `app_id.arb` provides the same keys with translated values and the same placeholder metadata:

```json
{
  "@@locale": "id",
  "appTitle": "ShopApp",
  "cartEmpty": "Keranjang Anda kosong",
  "itemCount": "{count, plural, =0{Tidak ada item} one{1 item} other{{count} item}}",
  "checkoutTotal": "Total: {total}"
}
```

### Configuring l10n.yaml

A small `l10n.yaml` in the project root tells the generator where the ARB files live and where to write generated code:

```yaml
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
output-dir: lib/l10n/generated
```

### Generating and Using AppLocalizations

Run `flutter gen-l10n` from the project root (it also runs automatically on `flutter pub get` and every build). This creates `AppLocalizations` plus one subclass per locale under `lib/l10n/generated/`. Inside widgets you read a message like `AppLocalizations.of(context)!.itemCount(3)`; an unknown locale falls back to the template language.

### Wiring the App for Multiple Locales

`MaterialApp` must know which locales you support and which delegates resolve the strings:

```dart
// lib/main.dart (excerpt)
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
        AppLocalizations.delegate,            // your ARB messages
        GlobalMaterialLocalizations.delegate, // Flutter's built-in widgets
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      localeResolutionCallback: (deviceLocale, supported) {
        // Any unsupported device locale falls back to English.
        return supported!.contains(deviceLocale)
            ? deviceLocale
            : const Locale('en');
      },
      home: const CheckoutPage(),
    );
  }
}
```

`AppLocalizations.delegate` resolves your own strings; the `Global*` delegates translate Flutter's built-in widgets (dialogs, date pickers, tooltips).

### Plurals and Locale-Aware Formatting

Plural messages use the ICU `plural` syntax from the ARB file and are generated as methods that take the count. Dates and numbers use `DateFormat` and `NumberFormat` from `intl`, which read the current locale automatically in a Flutter widget.

## Code Examples

A complete checkout page exercising plurals, currency, and dates:

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
    const total = 12500.5; // Rp 12.500,50 in id, Rp 12,500.50 in en
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
            Text('Estimated delivery: ${dateFormat.format(shipDate)}'),
          ],
        ),
      ),
    );
  }
}
```

With the `id` device locale this renders "3 item", "Total: Rp 12.500,50", and "5 September 2026"; with `en` it renders "3 items", "Total: Rp 12,500.50", and "September 10, 2026". Formatting failures (for example, a locale whose data was never initialized) should never crash the app, so wrap format calls defensively:

```dart
String formatTotal(String localeName, double value) {
  try {
    return NumberFormat.currency(locale: localeName, symbol: 'Rp').format(value);
  } on FormatException catch (e) {
    // Flutter's delegates load intl data for supported locales, but a
    // manually constructed locale may not be ready yet.
    debugPrint('Currency formatting failed for $localeName: $e');
    return NumberFormat.currency(symbol: 'Rp').format(value);
  } on Error catch (e) {
    debugPrint('Unexpected formatting error: $e');
    return value.toStringAsFixed(2);
  }
}
```

## Key Insights

- Keep `intl` at the version pinned by `flutter_localizations`; mismatched versions produce confusing codegen or runtime failures.
- The default `nullable-getter: true` makes `AppLocalizations.of(context)` nullable — set `nullable-getter: false` in `l10n.yaml` if you prefer non-null access.
- Untranslated keys in a locale file automatically fall back to the template language, so a missing translation never throws — but add the key to the template ARB or it will be dropped.
- Device locales often carry script/country codes (`en-US`); declaring `Locale('en')` without a country lets the resolution match any variant.
- Cache `DateFormat`/`NumberFormat` instances in fields instead of constructing them inside `build`; formatting is cheap but not free, and repeated construction allocates on every rebuild.

## Next Steps

- Read the official Flutter documentation on internationalization for advanced topics like locale overrides and per-locale assets.
- Combine localization with the app structure taught in the [Flutter syllabus](../syllabi/flutter-syllabus.md) and the [Flutter production engineering syllabus](../syllabi/flutter-production-engineering-syllabus.md).
- Practice by localizing an existing app into three languages with different plural rules (for example, add Polish or Arabic).

## Conclusion

You now have a complete Flutter localization pipeline: ARB files as the translation source of truth, `l10n.yaml` driving code generation, typed `AppLocalizations` accessors, correct locale resolution in `MaterialApp`, ICU plurals, and locale-aware date and currency formatting. Your app renders naturally for each market from one codebase — and the compiler keeps translations honest. Next, extend the same pattern to accessibility strings or switch to a translation-management service backed by the same ARB format.

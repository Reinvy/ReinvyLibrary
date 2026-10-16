---
title: "Swift Localization and Internationalization Guide"
description: "A practical guide to shipping Swift and SwiftUI apps in dozens of languages: String Catalogs, plural and device variations, locale-aware formatting, layout mirroring for right-to-left scripts, asset localization, pseudolocale testing, and CI automation for string extraction."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Swift Localization and Internationalization Guide

## Introduction

Internationalization (i18n) is the engineering work that makes an app *translatable*: no hardcoded user-facing strings, layout that survives text expansion, locale-aware dates and numbers, and a layout engine that mirrors correctly for right-to-left scripts. Localization (l10n) is the translation work that follows. Teams usually get them backwards — they try to bolt translations onto an English-shaped codebase and then spend months fighting truncated buttons, broken plural rules, and a settings screen that simply does not exist in Arabic.

This guide covers the engineering side. It assumes an existing Swift or SwiftUI app and walks through the full path: auditing hardcoded strings, migrating to String Catalogs, adding plural and grammatical variants, replacing manual formatting with `FormatStyle` APIs, handling right-to-left layout, localizing assets and metadata, and automating extraction and validation so translations never drift from the code.

The central idea is that a localized app has exactly two kinds of strings: **display strings**, which always go through the localization system, and **identifiers**, which never do. Most localization bugs come from confusing the two — passing a translated string into an API key, a URL path, or a comparison.

## Best Practices

### 1. Externalize Every User-Facing String from Day One

Retrofitting localization is dramatically more expensive than starting with it. Every string that reaches the screen — labels, buttons, alerts, empty states, accessibility labels, notifications, error messages, and even debug-only developer menus — should resolve through the localization system.

The practical rule: if a user can read it, it must come from a catalog. A `Text("Save")` literal is fine because SwiftUI treats it as a localization key, but a `"Save"` passed to a non-`LocalizedStringKey` API is not. Audit for raw literals flowing into `.accessibilityLabel`, `UIAlertController` titles, `String` properties on view models, and analytics event names that get displayed.

### 2. Adopt String Catalogs as the Single Source of Truth

String Catalogs (`.xcstrings`, Xcode 15 and later) replace the legacy `.strings` and `.stringsdict` pair with one JSON file that holds keys, translations, plural variations, device variations, comments, and translation state. They are diffable, merge cleanly in pull requests, and let Xcode extract strings automatically from your source during a build.

Keep exactly one catalog per target rather than scattering tables. A single catalog makes staleness obvious: anything marked *Needs Review* or *New* is an untranslated string, and the catalog's built-in state tracking replaces the homegrown scripts teams used to write against `.strings` files.

### 3. Design Layouts for Text Expansion

English is one of the most compact languages in the world. German compounds routinely run 30-40% longer than their English equivalents, and Finnish and Hungarian can double a short label. A button sized to fit "Save" will clip "Speichern" and destroy "Tallenna muutokset".

Design with expansion in mind: prefer flexible widths with `Spacer` over fixed frames, let labels wrap to two lines before truncating, avoid multi-column layouts whose columns are sized by the English string, and reserve roughly 40% headroom for any single-line fixed-width control. The Double-Length Pseudolanguage in Xcode previews is the fastest way to see the damage before a translator does.

### 4. Never Hand-Format Dates, Numbers, or Currency

`String(format: "%d items")` produces `1234 items` — no grouping separator, no locale-specific digits, and no correct order of magnitude for languages that group by ten-thousands. Manual string assembly for dates ("\(day)/\(month)/\(year)") is worse: it silently reorders meaning for US readers.

Always use the format styles Swift provides:

- `Date.now.formatted(date: .long, time: .shortened)` for user-facing dates
- `1234.5.formatted(.number.precision(.fractionLength(2)))` for numbers
- `price.formatted(.currency(code: "EUR"))` for money
- `Measurement<UnitLength>` with `.formatted()` for units
- `ByteCountFormatStyle` for file and transfer sizes

These APIs consult the current locale for separators, digit shapes, ordering, and currency placement, and they are covered by Apple's localization quality tests.

### 5. Model Pluralization and Grammatical Agreement Explicitly

A single "item(s)" string fails in most languages. Polish has four plural categories, Arabic has six, and Russian distinguishes "1", "2-4", and "5+". Do not implement this with an `if count == 1` branch — the rules are not in your code, they are in CLDR.

String Catalogs support plural variations per language, so the catalog holds the correct categories for each locale while your code passes just the count. Similarly, languages with grammatical gender (Spanish, French, German, Hindi) need agreement between adjectives, articles, and nouns — model these as separate keys or use a format specifier that carries the noun as a parameter, rather than concatenating fragments.

### 6. Keep Right-to-Left Support in the Layout Layer

Do not special-case Arabic or Hebrew in view code. Use semantic layout in both SwiftUI and UIKit and let the text direction drive the result:

- Prefer `leading` and `trailing` over `left` and `right` in SwiftUI padding and alignment
- Use `leadingAnchor` and `trailingAnchor` in Auto Layout, never `leftAnchor`
- Use `.imageScale`, `.flipsForRightToLeftLayoutDirection(true)` for directional icons
- Set `semanticContentAttribute` on custom views that embed directional artwork

Then verify by running the whole app with `-AppleLanguages "(ar)"` or by setting `.environment(\.layoutDirection, .rightToLeft)` in previews. Text content must never be manually reordered — the rendering engine handles bidirectional text; hand-reordering breaks mixed Latin/Arabic strings.

### 7. Separate Display Strings from Identifiers

The most damaging localization bug class is treating a translated string as an identifier. Examples that show up in production:

- Localized tab titles used as `TabView` selection tags
- Translated enum display names used as dictionary keys or API query values
- Localized sort strings compared for equality to decide behavior
- URLs or file paths built from localized segments

Give every domain value a stable, non-localized identifier and a separate display string resolved through the catalog. This also keeps analytics stable across languages: an event named `checkout_started` should never become `paiement_commence`.

### 8. Localize Assets, Metadata, and Notifications

Strings are only part of the surface. Also localize:

- **Asset catalogs**: images containing text, illustrations with embedded copy, and currency or flag symbols
- **Info.plist strings**: via `InfoPlist.xcstrings`, which covers permission prompts and the app display name
- **App Store metadata**: the store listing itself, maintained separately in App Store Connect
- **Notifications**: push payload keys and scheduled local notification copy, including the category action titles registered at launch

Permission prompts deserve special attention: a camera permission string that reads awkwardly in the user's language is a measurable drop-off point, and it is one of the last strings teams remember to translate.

### 9. Pseudolocalize and Test Every Locale in CI

Learn about layout and encoding failures before real translations exist. Pseudolocales substitute accented characters and inflated lengths so untranslated strings, clipping, and hardcoded formatting become visible:

- **Accented pseudolanguage** (`en-XA`): accents reveal strings that never passed through the localization system
- **Double-length pseudolanguage**: reveals truncation and fixed-width assumptions
- **Right-to-left pseudolanguage**: reveals layout mirroring gaps

Run at least the accented and RTL pseudolocales in your UI test suite, and add one real long-string locale (German) and one real RTL locale (Arabic) to the smoke test matrix.

### 10. Automate String Extraction and Staleness Checks

Translations go stale the moment a developer edits English copy. Automation keeps this honest:

- Extract strings on every merge so new keys appear in the catalog
- Fail the build when the catalog contains untranslated keys for a shipped locale
- Export localization files for translators on a schedule (`xcodebuild -exportLocalizations`)
- Re-import translations and verify the app still compiles

Treat the catalog as generated output reviewed in pull requests, not as a file edited by hand in a GUI only one person knows how to drive.

## Implementation Steps

### Step 1: Audit Hardcoded Strings and Enable String Catalogs

Start by measuring the size of the problem. Search source files for string literals passed to user-facing APIs, then enable a String Catalog for each target.

```bash
# Find literal strings flowing into common UI APIs
grep -RIn --include="*.swift" -E '\.(text|title|accessibilityLabel|placeholder)\s*=\s*"' Sources/ \
  | grep -v "LocalizedStringResource"
```

A quick scan of `String` literals that are assigned to labels gives a useful first count. Anything the scan finds is either a display string that needs a key or an identifier that needs a comment marking it as intentionally not localized.

Enable the catalog from Xcode's File menu (New File, String Catalog) or by adding the file directly to the target's resources:

```text
Sources/
├── Resources/
│   └── Localizable.xcstrings     # single catalog per target
├── Features/
│   └── Checkout/
└── App/
    └── MyApp.swift
```

After the first build, Apple's extractor populates the catalog with every localizable string it can resolve statically. Strings it cannot extract — dynamic keys built at runtime, or strings in non-Swift resources — must be added manually.

### Step 2: Migrate SwiftUI and UIKit Call Sites

SwiftUI resolves string literals in `Text`, `Label`, `Button`, and `.navigationTitle` as `LocalizedStringKey` automatically, so most of the migration is deleting workarounds rather than adding calls.

```swift
import SwiftUI

struct CheckoutSummaryView: View {
    let itemCount: Int
    let total: Decimal

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // LocalizedStringKey: resolved from the catalog at render time
            Text("Order summary", comment: "Section header on the checkout screen")

            // Never interpolate a number into a key; use a format specifier
            Text("^[\(itemCount) item](inflect: true)")

            // Locale-aware currency, no manual formatting
            Text(total.formatted(.currency(code: "USD")))
        }
    }
}
```

The `Text("^[\(itemCount) item](inflect: true)")` form lets the system apply inflection rules stored in the catalog's plural variations without branching in code. For non-`Text` contexts — view models, view controller titles, alert bodies — use `String(localized:)` explicitly:

```swift
// View model returning a display string (not an identifier)
var statusDescription: String {
    String(
        localized: "order.status.pending",
        defaultValue: "Awaiting payment",
        comment: "Order status shown in the order list"
    )
}

// UIKit
titleLabel.text = String(localized: "profile.title", defaultValue: "Profile")
navigationItem.title = String(localized: "profile.navigation.title", defaultValue: "Profile")
```

Note the difference in intent: keys with a stable prefix (`order.status.pending`) are easier to review in bulk, while using the English sentence as the key is easier for small apps and Xcode's extractor. Pick one convention per project and enforce it in review — mixed conventions make translation diffs unreadable.

### Step 3: Add Plural Variations and Format Specifiers

Plural rules belong in the catalog, not in Swift. Select the key in Xcode, enable "Vary by Plural", and the editor presents the correct CLDR categories for each language.

```text
Key: order.items.count
  %lld items selected

English (one):      %lld item selected
English (other):    %lld items selected
Polish (one):       %lld element wybrany
Polish (few):       %lld elementy wybrane
Polish (many):      %lld elementów wybranych
Arabic (zero):      لا توجد عناصر
Arabic (one):       عنصر واحد
Arabic (two):       عنصران
Arabic (few):       %lld عناصر
Arabic (many):      %lld عنصرًا
Arabic (other):     %lld عنصر
```

The matching call site passes the raw number; the catalog supplies the category selection:

```swift
Text("order.items.count \(selection.count)")
```

Several rules keep plural keys healthy over time:

- Never concatenate a plural fragment with another string — the noun's inflection depends on the whole phrase
- Use `%lld` for counts rather than `%@` with a pre-formatted number, so the catalog controls digit grouping
- Add the `zero` category explicitly for languages where it is meaningful; do not let `other` absorb it silently
- Keep a comment on the key describing the context, because "items" in a cart differs from "items" in a shipment

String Catalogs also support "Vary by Device", which is useful for strings that must differ between iPhone and iPad layouts — a navigation title that must be terse in a compact width.

### Step 4: Replace Manual Formatting with FormatStyle APIs

Every manual `String(format:)` for a date, number, or measurement is a latent localization bug. Replace them with typed format styles.

```swift
import Foundation

struct OrderPresenter {
    let locale: Locale

    func formattedTotal(_ amount: Decimal, currencyCode: String) -> String {
        amount.formatted(
            .currency(code: currencyCode)
                .locale(locale)
                .presentation(.narrow)
        )
    }

    func formattedShipDate(_ date: Date) -> String {
        date.formatted(
            .dateTime.weekday(.wide).month(.wide).day().locale(locale)
        )
    }

    func formattedFileSize(_ bytes: Int64) -> String {
        bytes.formatted(.byteCount(style: .file).locale(locale))
    }

    func formattedDistance(_ meters: Double) -> String {
        Measurement(value: meters, unit: UnitLength.meters)
            .formatted(.measurement(width: .abbreviated, usage: .road).locale(locale))
    }
}
```

Two additional helpers matter for correctness:

- **Relative dates**: use `RelativeDateTimeFormatter` or `.relative(presentation:)` for "3 days ago", which pluralizes and orders the phrase for the locale automatically.
- **Names and addresses**: use `PersonNameComponentsFormatter` and `CNPostalAddressFormatter` rather than assembling "Last, First" — name order and address layout are locale properties, not formatting preferences.

When a fixed machine-readable format is genuinely required (an API payload, a log line, a cache key), pin the locale explicitly instead of relying on the user's settings:

```swift
let apiFormatter = DateFormatter()
apiFormatter.locale = Locale(identifier: "en_US_POSIX")
apiFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
```

`en_US_POSIX` is the canonical fixed locale for wire formats. Using `Locale.current` there is a classic bug: a user with a Buddhist or Japanese calendar setting will serialize a different year than your backend expects.

### Step 5: Localize Sort, Search, and Comparison Behavior

Comparison and sorting are invisible until a user scrolls a list and finds "Ångström" filed under A in one locale and after Z in another.

```swift
// Sorting display names the way the user's locale expects
let sorted = contacts.sorted {
    $0.displayName.localizedStandardCompare($1.displayName) == .orderedAscending
}

// Case- and diacritic-insensitive search that respects the locale
let matches = contacts.filter {
    $0.displayName.range(of: query, options: [.caseInsensitive, .diacriticInsensitive],
                         range: nil, locale: .current) != nil
}
```

Avoid `lowercased()` for user-facing comparison: Turkish dotless ı means `"I".lowercased()` is not `"i"` in a Turkish locale, and `.lowercased()` without a locale produces inconsistent results for both search and sort. Keep `localizedCaseInsensitiveContains` in the UI layer and reserve exact string comparison for identifiers.

### Step 6: Build Right-to-Left Correct Layouts

Semantic layout, plus explicit checks for directional artwork and animation.

```swift
struct DirectionalChevron: View {
    var body: some View {
        Image(systemName: "chevron.forward")
            // SF Symbols that encode direction mirror automatically;
            // this makes the intent explicit for custom assets.
            .flipsForRightToLeftLayoutDirection(true)
    }
}

#Preview("Arabic, RTL") {
    CheckoutSummaryView(itemCount: 3, total: 42)
        .environment(\.locale, Locale(identifier: "ar_SA"))
        .environment(\.layoutDirection, .rightToLeft)
}
```

Three details that are easy to miss:

- Progress bars, sliders, and charts read right-to-left; verify that custom drawing code uses the environment's layout direction rather than hardcoded left-to-right math.
- Gestures that imply direction (swipe to delete, swipe to go back) must follow the mirrored visual direction, which UIKit handles for standard controls but not for custom gesture recognizers.
- Bidi text mixing Latin brand names with Arabic sentences is handled by the text engine — never insert directional control characters to "fix" rendering, and never manually reverse a string.

### Step 7: Localize Assets, Info.plist, and Launch Experience

Asset-level localization uses localized variants of an asset inside the catalog rather than `.lproj` copies of the whole bundle.

```text
Assets.xcassets/
└── HeroImage.imageset/
    ├── Contents.json                 # references localized variants
    ├── HeroImage.png                 # default (base) variant
    └── HeroImage.ar.png              # localized variant for Arabic
```

Then cover the strings that never pass through Swift source:

```text
Resources/
├── InfoPlist.xcstrings    # permission prompts, app display name
└── Localizable.xcstrings  # the main catalog
```

Keep the localized app display name short — it appears under the icon where space is tight for languages with long words. And register notification categories with localized action titles at launch, before any notification can arrive, so the titles are available when the system needs them.

### Step 8: Preview and Test with Pseudolocales

Add pseudolocale runs to both previews and the test suite so layout regressions are caught by automation rather than by a translator.

```bash
# Run the UI test suite forcing a pseudolocale and an RTL locale
xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -testLanguage en-XA

xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -testLanguage ar
```

Back this with a small pixel-level clipping test where it matters — tab bars, toolbars, and any control with fixed width:

```swift
func testToolbarLabelsAreNotTruncatedInGerman() {
    let app = XCUIApplication()
    app.launchArguments += ["-AppleLanguages", "(de)", "-AppleLocale", "de_DE"]
    app.launch()

    let saveButton = app.buttons["common.action.save"]
    XCTAssertTrue(saveButton.waitForExistence(timeout: 5))
    XCTAssertFalse(saveButton.label.hasSuffix("…"),
                   "Save button label is truncated in German")
}
```

Asserting that a label does not end in an ellipsis is a cheap, high-signal check. Extend it to the three or four controls that historically break first.

### Step 9: Automate Extraction and Validation in CI

Make the catalog a build artifact that is verified, exported, and re-imported on a schedule.

```bash
#!/bin/bash
set -euo pipefail

# 1. Extract strings and update the catalog in place
xcodebuild -exportLocalizations \
  -project MyApp.xcodeproj \
  -scheme MyApp \
  -localizationPath ./build/localizations \
  -exportLanguage en

# 2. Fail the build if a shipped locale has untranslated keys
python3 scripts/check_localization_coverage.py \
  --catalog Sources/Resources/Localizable.xcstrings \
  --required-locales en,de,ar,ja \
  --min-coverage 1.0

# 3. Import translator output and rebuild
xcodebuild -importLocalizations \
  -project MyApp.xcodeproj \
  -localizationPath ./translations/incoming
```

The coverage checker is a small script over the catalog's JSON: each key carries a `localizations` dictionary and per-unit `state` values such as `translated`, `needs_review`, and `new`. Failing on any `new` key in a shipped locale catches the exact regression that otherwise ships as an English string in a Japanese build.

### Step 10: Roll Out Locales Incrementally

Ship a locale only when its strings, formatting, and layout have all been verified. A partially localized locale looks worse than no locale at all: users see their language in the navigation titles and English in the error messages.

A workable order per locale:

1. Enable the locale and let the catalog show the real coverage gap
2. Translate the top-level navigation and onboarding strings first
3. Verify the three highest-traffic flows end to end in that locale
4. Confirm dates, currency, and measurement rendering with real data
5. Add the locale to the smoke test matrix before enabling it in the store listing

Keep the shipped locale list in the app manifest rather than gating by user preference only; the list is a promise about quality, and it should shrink before it silently degrades.

## Conclusion

Localization is a property of the codebase, not a layer applied at the end. The three habits that make everything else work are: every user-facing string resolves through a catalog, every date, number, and unit goes through a `FormatStyle`, and every layout uses semantic direction. Round those out with plural variations stored in the catalog, pseudolocale runs in CI, and an automated coverage check that fails the build when a shipped locale has untranslated keys, and adding a new language becomes a translation task rather than an engineering project.

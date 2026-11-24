---
title: "Flutter Build Flavors and Multi-Environment Configuration Guide"
description: "A practical guide to structuring Flutter apps with build flavors, compile-time configuration, per-environment native settings, and automated flavor builds for development, staging, and production."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Flutter Build Flavors and Multi-Environment Configuration Guide

## Introduction

Almost every Flutter application that reaches real users eventually needs more than one deployment target. A development build talks to a local or sandbox API, a staging build points at a pre-production backend, and a production build ships to the store with analytics enabled and debugging disabled. Some products go further: a single codebase compiled into several branded apps for different clients, each with its own application ID, icon, and endpoint.

Build flavors are Flutter's answer to this problem. A flavor is a named build variant that you select at build time (`flutter build apk --flavor staging`). Combined with compile-time configuration, flavors let one codebase produce multiple distinct applications without branching the source tree, without conditional imports, and without maintaining parallel projects that drift apart.

The tricky part is that flavors are not a single switch. They span four layers that must agree with each other:

| Layer | What it controls | Where it is defined |
|-------|------------------|---------------------|
| Dart configuration | API endpoints, feature flags, logging level | `--dart-define` / `--dart-define-from-file` |
| Android | `applicationId`, app label, signing config, resources | `android/app/build.gradle` product flavors |
| iOS | Bundle identifier, display name, entitlements, provisioning | Xcode schemes plus `.xcconfig` files |
| Build entry point | Which `main_*.dart` runs, which flavor name is passed | `flutter run` / `flutter build` invocations |

This guide walks through designing that structure once, implementing it on both platforms, and wiring it into CI so every flavor is a first-class build target. It assumes you already have a Flutter app that compiles and runs on Android and iOS.

## Best Practices

### 1. Design the Environment Matrix Before Touching Gradle

Write down every environment, the API host it uses, whether logging and analytics are on, and the identifier it needs on each store. A one-page matrix forces decisions that are expensive to reverse later — bundle identifiers in particular cannot be changed after the first production release without creating a new store listing.

A typical matrix for a three-environment app:

| Setting | development | staging | production |
|---------|-------------|---------|------------|
| API base URL | `http://10.0.2.2:8080` | `https://api-staging.example.com` | `https://api.example.com` |
| Verbose logging | on | on | off |
| Crash reporting | off | on (separate project) | on |
| Application ID suffix | `.dev` | `.staging` | none |
| Display name | `Notes Dev` | `Notes Staging` | `Notes` |

Deciding this up front prevents the classic failure mode where a developer adds a fourth environment ad hoc and the native configuration silently falls back to production values.

### 2. Keep One Codebase and Vary Configuration Only

Flavors exist so that behavior, not source, changes per environment. Resist the temptation to fork large parts of `lib/` behind `if (flavor == 'dev')` checks scattered through widgets. Instead, resolve configuration once at startup into an immutable object and inject it. Code that reads `AppConfig.baseUrl` never needs to know which flavor produced that value, which keeps the app testable with an injected fake config.

### 3. Compile-Time Constants Beat Runtime Lookups

`--dart-define` values are baked into the compiled binary and exposed through `String.fromEnvironment`. This has three advantages over reading a bundled JSON asset at runtime: the value cannot be tampered with by editing an asset inside the APK, missing values surface as empty strings during development rather than as runtime exceptions on a slow network path, and the compiler can tree-shake code paths that reference an empty constant.

Use `--dart-define-from-file` for larger configuration blobs, and keep one JSON file per environment in version control (with no secrets inside).

### 4. Never Commit Secrets

Compile-time constants are extractable from the binary. Anything published to a store — an API key, a signing password, a third-party token — is compromised the moment the app ships. Treat flavors as a way to select which *non-secret* configuration is active, and inject real secrets through CI environment variables or a secret manager at build time. For client-side keys that must exist in the binary (map SDK keys, analytics write keys), restrict them server-side by bundle ID and rotate them if leaked.

### 5. Keep Platform Identifiers Parallel

Android `applicationId` suffixes and iOS bundle identifier suffixes must describe the same environment. If Android builds staging as `com.example.notes.staging` while iOS uses `com.example.notes.Staging` (capitalized) or `com.example.staging.notes`, store dashboards, push notification certificates, and deep link association files all break in environment-specific ways that are painful to diagnose.

Adopt the same lowercase suffix on both platforms and validate it in CI by comparing the built artifacts' identifiers.

### 6. Give Every Flavor a Distinct Identity

Non-production builds should be instantly recognizable on a device. Change the display name (`Notes Dev`) and, ideally, the launcher icon badge or a colored banner across the top of the screen. This single practice eliminates the most common and most costly flavor bug: shipping a staging build to production, or filing a bug report against the wrong environment.

A debug-only banner implemented in one place, driven by the compile-time flavor constant, costs very little and prevents real incidents.

### 7. Fail Fast When Configuration Is Missing

An empty `String.fromEnvironment` value is a silent failure. A build that cannot resolve its API host should crash on the first frame in debug mode with a clear message, not make requests to `https://` with an empty host and surface as a mysterious timeout. Add an assertion in the configuration factory so the mistake is caught during development rather than in a bug report.

### 8. Treat Every Flavor as a First-Class CI Target

If only production is built in CI, the staging flavor will rot: a Gradle or Xcode change will break it weeks before anyone notices, usually the day before a release. Build all flavors on every pull request, at minimum as an unsigned assemble step, and archive signed builds only on release branches. Flavor regressions are cheap to fix on the day they land and expensive to fix during a release window.

### 9. Keep Entry Points Thin

Flavor-specific `main_*.dart` files should be two lines: bootstrap the configuration and call the shared `runApp`. Business logic, dependency injection, and routing belong in the shared entry point. Thin entry points mean a new flavor costs one small file, and a change to app startup never has to be repeated in three places.

## Implementation Steps

### Step 1: Write the Environment Matrix

Create a machine-readable matrix at the repo root so code, native config, and CI all read from the same source of truth:

```text
config/
├── env.development.json
├── env.staging.json
└── env.production.json
```

Each file carries only non-secret values:

```json
{
  "APP_ENV": "staging",
  "API_BASE_URL": "https://api-staging.example.com",
  "ENABLE_VERBOSE_LOGGING": true,
  "ENABLE_CRASH_REPORTING": true,
  "SENTRY_DSN": ""
}
```

Commit these files. They document the contract between the app and each backend, and they make flavor differences reviewable in pull requests instead of hidden in build scripts.

### Step 2: Build the Dart Configuration Layer

Define a single immutable configuration object with one factory per environment and one compile-time factory for release builds:

```dart
// lib/core/config/app_config.dart
class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.enableVerboseLogging,
    required this.enableCrashReporting,
  });

  final String environment;
  final String apiBaseUrl;
  final bool enableVerboseLogging;
  final bool enableCrashReporting;

  static const _env = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );

  static const _apiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const _verbose = bool.fromEnvironment('ENABLE_VERBOSE_LOGGING');

  /// Resolved once at startup and injected through the widget tree.
  static Future<AppConfig> load() async {
    if (_apiBaseUrl.isNotEmpty) {
      return AppConfig(
        environment: _env,
        apiBaseUrl: _apiBaseUrl,
        enableVerboseLogging: _verbose,
        enableCrashReporting:
            bool.fromEnvironment('ENABLE_CRASH_REPORTING'),
      );
    }
    throw StateError(
      'API_BASE_URL was not provided. Build with '
      '--dart-define-from-file=config/env.$_env.json',
    );
  }
}
```

Note the deliberate asymmetry: development can fall back to local defaults, but any build that reaches a device with real users must fail loudly if its configuration is missing.

### Step 3: Add a Startup Guard and a Flavor Banner

Resolve configuration before `runApp`, and render a visible marker in non-production builds:

```dart
// lib/main.dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = await AppConfig.load();
  runApp(NotesApp(config: config));
}

class EnvironmentBanner extends StatelessWidget {
  const EnvironmentBanner({super.key, required this.child, required this.config});

  final Widget child;
  final AppConfig config;

  @override
  Widget build(BuildContext context) {
    if (config.environment == 'production') return child;
    return Column(
      children: [
        Material(
          color: config.environment == 'staging'
              ? Colors.orange.shade700
              : Colors.blueGrey.shade700,
          child: SafeArea(
            bottom: false,
            child: SizedBox(
              width: double.infinity,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  config.environment.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 11),
                ),
              ),
            ),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}
```

### Step 4: Configure Android Product Flavors

Declare flavors in `android/app/build.gradle` (Groovy DSL; the Kotlin DSL equivalent uses `create("staging")` blocks):

```groovy
android {
    flavorDimensions "environment"

    productFlavors {
        development {
            dimension "environment"
            applicationIdSuffix ".dev"
            versionNameSuffix "-dev"
            resValue "string", "app_name", "Notes Dev"
        }
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
            resValue "string", "app_name", "Notes Staging"
        }
        production {
            dimension "environment"
            resValue "string", "app_name", "Notes"
        }
    }
}
```

Then reference the generated resource in `android/app/src/main/AndroidManifest.xml` instead of a hardcoded label:

```text
android:label="@string/app_name"
```

Remove any older `android:label="Notes"` literal, since a hardcoded label overrides the flavor-specific one and produces identically named apps on the launcher.

### Step 5: Configure iOS Schemes and xcconfig Files

iOS has no product flavor concept; the equivalent is one Xcode scheme per environment, each pointing at its own `.xcconfig`.

First create the configuration files under `ios/Flutter/`:

```text
ios/Flutter/
├── Debug.xcconfig
├── Release.xcconfig
├── Debug-staging.xcconfig
├── Release-staging.xcconfig
├── Debug-production.xcconfig
└── Release-production.xcconfig
```

Each flavor file includes the base configuration and overrides only what differs:

```text
#include "Debug.xcconfig"
APP_DISPLAY_NAME = Notes Staging
BUNDLE_ID_SUFFIX = .staging
```

Expose the bundle identifier through a user-defined build setting in the Runner target, and reference the variable in `Info.plist`:

```text
PRODUCT_BUNDLE_IDENTIFIER = com.example.notes$(BUNDLE_ID_SUFFIX)
CFBundleDisplayName = $(APP_DISPLAY_NAME)
```

Repeat the pattern for `Release-*.xcconfig`, then create one scheme per environment in Xcode (Product → Scheme → Manage Schemes) and point each scheme's Run/Archive actions at the matching configuration pair. Verify with:

```bash
flutter build ios --flavor staging --config-only
```

### Step 6: Handle Per-Flavor Assets and Native Placeholders

When flavors need different icons or Firebase configuration, use platform resource folders rather than runtime logic:

```text
android/app/src/
├── development/res/values/strings.xml
├── staging/res/values/strings.xml
├── production/res/values/strings.xml
└── main/res/mipmap-*/ic_launcher.png
```

For Android manifest placeholders (deep link hosts, map keys), define them per flavor:

```groovy
productFlavors {
    staging {
        manifestPlaceholders = [deepLinkHost: "staging.example.com"]
    }
    production {
        manifestPlaceholders = [deepLinkHost: "example.com"]
    }
}
```

On iOS, put `GoogleService-Info.plist` in a flavor-specific folder and add a build phase that copies the right file, or use separate Firebase projects bound through the scheme's `-configuration` argument. Keeping per-flavor files out of `main` prevents one environment's credentials from leaking into another build.

### Step 7: Make Flavors Easy to Run Locally

Document the exact commands in the README so no one improvises. A consistent pair of commands per environment keeps local builds aligned with CI:

```bash
flutter run --flavor development \
  --dart-define-from-file=config/env.development.json

flutter build appbundle --flavor production --release \
  --dart-define-from-file=config/env.production.json
```

Add VS Code launch configurations so the IDE passes the same arguments, and keep the flavor names lowercase and hyphen-free — they become Gradle task names and Xcode configuration names, where spaces and capitals cause avoidable friction.

### Step 8: Automate the Build Matrix in CI

Build every flavor on every pull request. A GitHub Actions job matrix keeps the cost visible and the coverage complete:

```yaml
name: build-flavors
on: [pull_request]

jobs:
  android:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        flavor: [development, staging, production]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
      - run: flutter pub get
      - run: |
          flutter build apk --flavor ${{ matrix.flavor }} \
            --dart-define-from-file=config/env.${{ matrix.flavor }}.json
```

Secrets — signing keys, store credentials — are injected as job-level environment variables only in the release workflow, never into the flavor JSON files. Add a step that asserts the resolved configuration matches the expected environment, for example by grepping the built `AndroidManifest.xml` for the expected application ID suffix.

### Step 9: Verify the Matrix Before Every Release

Treat verification as a numbered checklist that runs identically on a laptop and in CI:

1. Build all three flavors for Android and iOS without warnings about missing configuration.
2. Confirm each artifact's application ID and display name match the matrix.
3. Launch each non-production build and confirm the environment banner appears.
4. Confirm the production build shows no banner, no verbose logging, and the production API host.
5. Confirm no secrets are present in any committed configuration file.

A release that passes these five checks cannot accidentally ship staging configuration to users — which is the entire point of the structure.

## Conclusion

Build flavors are a contract between three layers that Flutter does not unify for you: compile-time Dart configuration, Android product flavors, and iOS schemes with xcconfig files. Designing the environment matrix first, resolving configuration once at startup into an injected object, keeping platform identifiers parallel, and building every flavor in CI turns a fragile manual process into a predictable one.

Start by writing the matrix and moving a single hardcoded URL into a `--dart-define-from-file`. Then add the Android flavors, then the iOS schemes, and finally the CI matrix. Each step is independently useful, and the final state — one codebase, several clearly identifiable applications, no secrets in the repository — is what lets a team ship to staging as casually as it ships to production.

---
title: "Flutter Mobile Engineering Syllabus"
description: "An 8-module curriculum that takes developers from Dart fundamentals to shipping a production Flutter app, covering widgets, state management, networking, testing, performance, release engineering, and app architecture."
category: "mobile"
technology: "flutter"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Flutter Mobile Engineering Syllabus

## Overview

This eight-module syllabus is designed for developers who already write code in at least one language and want to become productive Flutter engineers. It is ordered the way production work actually flows: language fundamentals first, then the widget model, then state, then the network boundary, then the quality gates (testing and performance), and finally release engineering and architecture. Each module produces a working increment of the same application, so learners never study a feature in isolation. The course is deliberately framework-first but not framework-only — every module explains what Flutter does for you and what it deliberately leaves to you, because that boundary is where most production bugs live.

No module assumes an existing Flutter project. Each one starts from a runnable baseline, adds a single capability, and closes with a review checklist so learners can judge their own work before submitting. The difficulty curve is deliberate: modules 1 to 4 are guided, while modules 5 to 8 hand over incrementally more design decisions.

## Curriculum

### Module 1: Dart for App Developers
- **Language core**: sound null safety, `final` versus `const`, late initialization, type inference pitfalls
- **Collections and records**: `List`/`Map`/`Set` performance characteristics, records and pattern destructuring
- **Classes and data modelling**: constructors, factory constructors, `copyWith` patterns, equality and `hashCode` contracts
- **Asynchrony primitives**: `Future`, `async`/`await`, `Stream`, `StreamController`, error propagation across awaits
- **Isolates**: when the event loop is not enough, `Isolate.run`, message passing, avoiding shared mutable state
- **Error handling**: exceptions versus sealed result types, `try`/`catch` across awaits, `Error` versus `Exception`
- **Practice**: build a typed domain model and an isolate-backed JSON parser benchmarked against the main isolate

### Module 2: The Widget Model and Layout
- **Everything is a widget**: `StatelessWidget` versus `StatefulWidget`, `build` purity, element and render trees
- **Layout algorithm**: constraints flow down and sizes flow up, `Expanded`, `Flexible`, `IntrinsicHeight` costs
- **Composition over inheritance**: extracting widgets instead of methods, when a builder function hurts rebuilds
- **Scrolling**: `ListView.builder`, `SliverList`, `CustomScrollView`, lazy loading and viewport caching
- **Styling**: `ThemeData`, `ColorScheme.fromSeed`, text scaling, dark mode, responsive breakpoints
- **Accessibility in layout**: semantics labels, focus order, overflow behaviour at 200% text scale
- **Practice**: build a responsive dashboard screen that renders correctly from 320dp phones to tablets

### Module 3: State Management
- **Local state**: `setState`, lifting state up, controller objects and their disposal
- **InheritedWidget and Provider**: dependency injection through the tree, `context.watch` versus `context.read`
- **Riverpod**: providers, `ref.watch`/`ref.listen`, `AsyncValue` for loading and error states, family providers
- **BLoC**: events, states, streams, when a state machine beats a provider
- **Choosing a tool**: team size, testability, rebuild scope, migration cost — and why "the best" is contextual
- **Testing state**: `ProviderContainer` overrides, fake repositories, asserting emitted states in order
- **Practice**: refactor the dashboard to Riverpod with explicit loading, empty, and error states

### Module 4: Networking and Data Persistence
- **HTTP clients**: `package:http` versus `dio`, interceptors, retries, request cancellation
- **Serialization**: `json_serializable`, `freezed` unions, handling nullable and unknown fields defensively
- **Repository layer**: mapping transport errors to domain failures, avoiding leaked status codes in the UI
- **Caching**: in-memory TTL caches, `shared_preferences`, `sqflite` and Drift for relational data
- **Offline-first**: local source of truth, sync queues, conflict resolution strategies
- **Security basics**: certificate pinning, `flutter_secure_storage` for tokens, refresh-token rotation
- **Practice**: implement an offline-capable product list backed by Drift with a background refresh

### Module 5: Testing and Quality Gates
- **Unit tests**: pure Dart tests, fakes over mocks, testing error paths as carefully as happy paths
- **Widget tests**: `WidgetTester`, `pumpWidget`, `pumpAndSettle`, finding by key versus by text
- **Golden tests**: rendering regression detection, font loading, CI stability of golden files
- **Integration tests**: `integration_test` on device, driving real navigation and network fakes
- **Static analysis**: `analysis_options.yaml`, `flutter_lints`, custom lint rules, CI enforcement
- **CI wiring**: caching of `pub` and Gradle, test sharding, golden artifact retention for diff review
- **Practice**: reach a tested repository and widget layer with a pipeline that fails on coverage regression

### Module 6: Performance Engineering
- **Frame budget**: 16.6ms at 60fps, 8.3ms at 120fps, jank versus shader compilation jank
- **Rebuild control**: `const` constructors, `RepaintBoundary`, `ValueListenableBuilder`, splitting providers
- **DevTools**: the performance overlay, timeline traces, raster versus UI thread attribution
- **Lists and images**: `itemExtent`, `cacheWidth`/`cacheHeight`, `precacheImage`, memory ceilings
- **Startup**: deferred components, eager initialization audits, `--trace-startup`
- **Memory**: image cache eviction, `leak_tracker` in tests, DevTools memory snapshots under load
- **Practice**: profile a janky feed, identify the dominant cost, and demonstrate a measured improvement

### Module 7: Release Engineering
- **Build modes**: debug, profile, release; tree shaking of icons; `--obfuscate` and symbol files
- **Android**: signing configs, Play App Signing, `minSdk`/`targetSdk` policy, App Bundles
- **iOS**: certificates and provisioning profiles, TestFlight, App Store review pitfalls
- **CI/CD**: Codemagic or GitHub Actions, cached `pub` and Gradle, versioning from `pubspec.yaml`
- **Observability**: Crashlytics/Sentry, structured logging, feature flags for staged rollout
- **Store compliance**: privacy manifests, data safety declarations, staged rollout percentages
- **Practice**: ship a signed build to an internal track and a TestFlight build from CI

### Module 8: Architecture at Scale
- **Layering**: presentation, domain, and data layers; dependency direction and boundary contracts
- **Feature-first structure**: folder layout that survives team growth, avoiding the `utils` dumping ground
- **Navigation**: `Navigator 2.0`, `go_router`, deep links, guards, state restoration
- **Dependency injection**: constructor injection first, service locators when and why they hurt testability
- **Localization and accessibility**: `flutter_localizations`, ARB files, semantics, minimum tap targets
- **Safe refactoring**: seam extraction, parallel-run migrations, a written deprecation policy
- **Practice**: restructure the capstone into feature modules with documented boundaries and a router

## Final Project

Learners build **Fieldnotes**, an offline-first field data collection app. Required scope: a typed domain model with repository abstractions; a dashboard and detail flow rendered responsively; Riverpod or BLoC state with explicit error and empty states; local persistence in Drift synchronized with a REST backend, including a retry queue for failed writes; unit, widget, and golden tests running in CI; a profiled list screen with no jank at 60fps; a signed release build distributed through an internal track; and a short architecture document explaining layer boundaries, navigation, and the offline conflict policy. The deliverable is graded on how well the layers stay separated under review, not on feature count.

## Assessment Criteria

- **Module assignments**: eight small increments, each graded on correctness, idiomatic Flutter, and test coverage of failure paths — 40% of the final grade.
- **Quizzes**: three short quizzes on widget lifecycle, state management trade-offs, and frame budgeting — 15%.
- **Code reviews**: two peer reviews (modules 4 and 7) graded on the quality and specificity of feedback — 10%.
- **Final Project**: weighted across architecture (25%), testing and CI (20%), performance evidence (20%), and release readiness (20%) — 35%.
- **Passing bar**: all quality gates green in CI, no unhandled asynchronous errors in the profiled build, and a working offline path demonstrated with the network disabled.

## References

- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Language Tour](https://dart.dev/language)
- [Flutter Widget Catalog](https://docs.flutter.dev/ui/widgets)
- [Riverpod Documentation](https://riverpod.dev/docs/introduction/getting_started)
- [BLoC Library Documentation](https://bloclibrary.dev/)
- [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices)
- [Flutter Testing Overview](https://docs.flutter.dev/testing/overview)
- [DevTools — Performance View](https://docs.flutter.dev/tools/devtools/performance)
- [Flutter Deployment — Android](https://docs.flutter.dev/deployment/android)
- [Flutter Deployment — iOS](https://docs.flutter.dev/deployment/ios)
- [Effective Dart](https://dart.dev/effective-dart)

---
title: "Flutter Web and Desktop Development Syllabus"
description: "A project-based curriculum for shipping Flutter applications beyond mobile — responsive web apps, desktop apps for Windows, macOS, and Linux, and the rendering, tooling, and deployment knowledge that makes multi-platform delivery reliable."
category: "mobile"
technology: "flutter"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Flutter Web and Desktop Development Syllabus

## Overview

This syllabus guides learners who already know mobile Flutter into the web and desktop frontier. It covers how the same widget tree renders on every platform, responsive layout strategies, platform integration (browser APIs, file system, window management), and modern deployment pipelines for web and the three desktop operating systems. Each module pairs concepts with a hands-on build, and the course ends with a production-grade web + desktop application delivered for at least two platforms.

## Curriculum

### Module 1: The Flutter Multi-Platform Model
- **How Flutter renders everywhere**: Skia/Impeller rendering, the widget → element → render object pipeline, and why UI code is portable while platform channels are not.
- **Supported targets**: Android, iOS, web (HTML renderer vs CanvasKit vs skwasm), Windows, macOS, Linux, and embedded.
- **Project anatomy**: `flutter create` platform scaffolding, the `web/` and platform runner folders, and conditional imports with `dart:io` vs `dart:html` vs abstractions like `universal_io`.

### Module 2: Responsive Layout Architecture
- **Breakpoints and sizing**: `MediaQuery`, `LayoutBuilder`, `OrientationBuilder`, and the `BoxConstraints` model.
- **Adaptive widgets**: patterns for master-detail, navigation rail vs bottom navigation, and responsive data tables.
- **Grids and typography**: sliver-based responsive lists, `SliverGridDelegateWithMaxCrossAxisExtent`, and type scales that reflow across widths.

### Module 3: Flutter Web Essentials
- **Web rendering engines**: choosing between HTML renderer and CanvasKit, performance trade-offs, and web font loading.
- **Routing and deep links**: `go_router` web integration, URL strategies (hash vs path), and browser history/back-button behavior.
- **SEO and crawler support**: semantic HTML, the `flutter_html` vs custom `Semantics`, meta tags, `og:` tags, and prerendering options.
- **Web-specific APIs**: `package:web` interop, browser storage (localStorage, IndexedDB via `idb_shim`), and event listeners.

### Module 4: Desktop Windows and Lifecycle
- **Window management**: `window_manager` APIs — size, position, maximize/minimize, fullscreen, and custom title bars.
- **Application lifecycle**: desktop-specific lifecycle events, app shutdown vs minimisation, and single-instance enforcement.
- **Multiple windows**: multi-window architectures with `desktop_multi_window` and when they make sense.

### Module 5: Local Integration — Files, Menus, and Shortcuts
- **File access**: `file_picker`, `path_provider`, and safe file dialog patterns.
- **Menus and tray**: native menu bars with `menu_bar`, system tray icons, and context menus.
- **Keyboard and mouse**: `Shortcuts`/`Actions`/`Focus` system, keyboard shortcuts, hover states, and mouse cursor customization.

### Module 6: Platform Channels and Interop
- **Method channels and Pigeon**: type-safe code generation with Pigeon and end-to-end channel debugging.
- **FFI and JS interop**: calling native C libraries and browser JavaScript with `dart:ffi` and `package:web`.
- **Cross-platform abstractions**: hiding platform differences behind interfaces and dependency injection.

### Module 7: State and Persistence Across Platforms
- **State management review**: Riverpod and Bloc patterns that are platform-agnostic.
- **Persistence strategies**: shared_preferences, Drift/SQLite, and Hive across web/desktop storage engines.
- **Offline and caching**: service workers on web, local caching layers, and background synchronization.

### Module 8: Desktop Power Features
- **System integration**: opening external URLs and files with `url_launcher`, shelling out to system commands, and environment variables.
- **Notifications**: local notifications across platforms (`flutter_local_notifications`).
- **High-DPI and accessibility**: pixel-ratio handling, text scaling, and platform accessibility trees.

### Module 9: Performance Engineering for Web and Desktop
- **Startup performance**: tree shaking, deferred loading (`deferred as`), code splitting on web, and AOT implications.
- **Frame budget**: avoiding layout jank, `RepaintBoundary` placement, and shader compilation jank on desktop.
- **Profiling tools**: DevTools frame chart, performance overlay, and memory profiling per platform.

### Module 10: Testing Across Platforms
- **Unit and widget tests**: keeping logic platform-neutral for single test suites.
- **Integration and golden tests**: pixel-accurate golden tests per platform, and `flutter drive` on desktop.
- **Web and desktop test runners**: running tests headless on Chrome, Edge, and desktop shells; CI matrix configuration.

### Module 11: Build, Sign, and Deploy
- **Web deployment**: releasing to static hosting (Firebase Hosting, Netlify, Vercel), CDN caching, and continuous delivery pipelines.
- **Desktop packaging**: `msix` for Windows, `dmg`/`pkg` for macOS, and AppImage/deb/snap for Linux.
- **Signing and notarization**: code signing, Windows Authenticode, macOS notarization with `xcrun notarytool`, and update mechanisms.

### Module 12: Capstone — Shipping a Multi-Platform Product
- **Product definition**: pick a productivity or data-heavy tool (e.g., a local-first notes app, a dashboard, or an internal admin console).
- **Build plan**: responsive UI, web + one desktop target, platform channels where needed, and tests.
- **Release checklist**: performance budgets, accessibility pass, signing/notarization, and staged rollout.

## Final Project

Students build and ship a complete web + desktop application. The deliverable must include:

- A responsive layout that works from phone width to desktop width.
- A working web build deployed to a public URL (static hosting) with proper routing and SEO meta tags.
- A desktop build for **two** of Windows, macOS, or Linux, with packaging and signing.
- At least one deep platform integration (file access, native window features, tray menu, or a Pigeon-defined native channel).
- A passing automated test suite and a documented performance budget.

## Assessment Criteria

- **Assignments**: 30% — responsive layout exercises, web deployment drills, and desktop window/persistence tasks.
- **Quizzes**: 10% — rendering architecture, platform channel mechanics, and packaging rules.
- **Final Project & Presentation**: 60% — multi-platform correctness, quality of platform integration, performance within budget, code cleanliness, and a live demo presented to the class.

## References

- **Official Documentation**: [flutter.dev/multi-platform](https://flutter.dev/multi-platform), [Flutter web renderers](https://docs.flutter.dev/platform-integration/web/renderers), [Desktop support](https://docs.flutter.dev/platform-integration/desktop)
- **API References**: [package:web](https://pub.dev/documentation/web), [window_manager](https://pub.dev/packages/window_manager), [Pigeon](https://pub.dev/packages/pigeon), [go_router](https://pub.dev/packages/go_router)
- **Books**: "Flutter in Action" by Eric Windmill; "Pragmatic Flutter" by Priyanka Tyagi
- **Talks**: Flutter Forward and Flutter Engage multi-platform sessions on the official Flutter YouTube channel

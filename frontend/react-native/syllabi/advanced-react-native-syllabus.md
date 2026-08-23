---
title: "Advanced React Native Architecture and Platform Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for experienced React Native developers covering the New Architecture internals (Fabric, Turbo Modules, JSI, Codegen, Bridgeless), C++ and native module engineering, Hermes and JavaScript engine internals, advanced performance engineering, large-scale application architecture, offline-first data architecture, security hardening, advanced animations, testing at scale, observability, and release engineering."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced React Native Architecture and Platform Engineering Syllabus

## Overview

This 12-week advanced syllabus is designed for developers who already ship React Native applications to production and want to master the framework at platform scale. While the introductory React Native curriculum focuses on components, navigation, state management, device APIs, testing, and getting an app published, this course goes several layers deeper: the internals of the New Architecture — Fabric renderer, Turbo Modules, JSI, Codegen, and Bridgeless mode — the C++ core that powers synchronous native calls, production-grade native module design on Android and iOS, Hermes bytecode and garbage collection, advanced performance engineering with frame budgets and startup optimization, large-scale codebase organization with modular monoliths and monorepos, local-first offline data architecture with sync engines and CRDTs, security hardening against reverse engineering and MITM attacks, advanced animation and gesture engineering on the UI thread, testing at scale with component-driven and contract testing, observability, and release engineering with staged rollouts.

Each module pairs deep conceptual foundations with hands-on labs that require reading compiled code, profiling real apps, inspecting native logs, and designing architecture diagrams. The course culminates in a capstone project where learners design and build a large-scale, local-first React Native platform with the New Architecture enabled, custom Turbo Modules and Fabric components, offline synchronization, security hardening, a measurable performance budget, and a staged release pipeline.

By the end of this course, learners will be able to explain how Fabric commits UI to the native side, write a Turbo Module in Kotlin, Swift, and C++, move work off the JavaScript thread with JSI, diagnose and fix startup and frame-budget regressions, choose the right data synchronization strategy for offline-first apps, harden applications against tampering and data theft, structure multi-team codebases without coupling releases, and operate React Native apps with observability and controlled rollouts.

## Curriculum

### Module 1: The New Architecture Foundation (Week 1)

- **Fabric renderer in depth**
  - The component tree, shadow tree, and the commit pipeline from React elements to native views
  - How state and props flow through the Fabric mount system
  - View flattening and how the renderer reduces the number of native views
- **Turbo Modules**
  - Lazy module loading and why the bridge serialization bottleneck disappears
  - Direct native method invocation with JavaScript Interface (JSI) bindings
  - Synchronous vs. asynchronous calls and their threading implications
- **Bridgeless mode and the Interop Layer**
  - What "bridgeless" means: no legacy bridge, no bridge module registry
  - The Interop Layer that keeps legacy native modules calling through the old API
  - Migration paths: opt-in flags, hybrid apps, and rollout order
- **Codegen**
  - Spec-driven contracts: TypeScript specs generating native interface code
  - Generated types on both sides of the boundary and versioning the spec
- **Hands-on Lab**: Enable the New Architecture in a small app, capture a native thread profile during a screen transition, and identify Fabric commit work versus JavaScript work

### Module 2: JSI and the C++ Layer (Week 2)

- **The JavaScript Interface**
  - `jsi::Runtime`, `jsi::Value`, `jsi::Object`, `jsi::Function`, and `jsi::String` semantics
  - Host objects and hybrid objects: bridging C++ classes into JavaScript
  - Creating and installing a JSI module into the runtime
- **Threading and concurrency**
  - The JavaScript thread versus native threads: where JSI calls run
  - Executing work synchronously on the JS thread from native code and its hazards
  - Callbacks, promises, and error propagation across the boundary
- **Memory ownership**
  - JavaScript ownership versus C++ ownership (`std::shared_ptr`, `jsi::HostObject` lifetime)
  - Weak references and avoiding cycles between JS and native objects
  - Memory leaks in JSI: event listeners, decorators, and global installation
- **Performance characteristics**
  - When synchronous JSI calls are worth it and when they stall the UI
  - Avoiding JSI overuse: batching, caching native results, and minimal marshaling
- **Hands-on Lab**: Write a small C++ host object, expose it to JavaScript, and measure call overhead against a legacy bridge call

### Module 3: Production-Grade Native Modules (Week 3)

- **Native module design on Android (Kotlin)**
  - Module lifecycle, the NativeModule registry, and thread affinity rules
  - Coroutines and suspend functions exposed to JavaScript
  - Avoiding main-thread work and ANRs (Application Not Responding)
- **Native module design on iOS (Swift)**
  - Swift module structure, `@objc` interop, and the module queue
  - Grand Central Dispatch (GCD) usage and main-queue modules
- **The spec contract**
  - Writing TypeScript specs and regenerating code with Codegen
  - Keeping the contract stable across app and library versions
- **Events and listeners**
  - Native-to-JavaScript events: emit lifecycle, listener management, and retained-listener leaks
  - Backpressure: throttling native events when the JS thread is saturated
- **Error handling and testing**
  - Crossing the boundary with structured errors and error codes
  - Unit-testing native modules with JUnit and XCTest, plus JavaScript-side mocks
- **Hands-on Lab**: Build a Turbo Module that streams device sensor data and verify the listener cleanup during rapid screen changes

### Module 4: Fabric Renderer and Custom Components (Week 4)

- **Shadow tree and layout**
  - The Yoga layout engine: flexbox layout passes, dirty propagation, and measure functions
  - When layout runs on the UI thread and its cost during scrolling
- **Custom Fabric components**
  - Mounting, props diffing, state updates, and commands
  - `measure`, `onLayout`, and imperative native methods
- **View flattening and recycling**
  - How nested views are flattened into a single native view
  - View recycling in lists and avoiding per-frame allocations
- **Interop with legacy components**
  - When a component cannot be migrated to Fabric and how interop keeps it alive
  - Performance cliff of interop views and how to phase them out
- **Hands-on Lab**: Implement a custom Fabric view (for example, a native video surface) and profile its mount and layout cost in a scrolling list

### Module 5: Advanced Performance Engineering (Week 5)

- **Startup sequence and Time to Interactive**
  - The cold-start path: native launch, Metro/Hermes bytecode load, JavaScript evaluation, first paint
  - Profiling startup phases and cutting time in each one
  - Deferred rendering, skeleton screens, and lazy native initialization
- **Frame budget and jank**
  - The 16.6 ms frame budget and where time is spent: JS thread, UI thread, native I/O
  - Moving work off the JS thread: worklets, native modules, and precomputed data
  - Diagnosing jank with Perfetto, Instruments, and React DevTools flamegraphs
- **Render pipeline optimization**
  - Avoiding unnecessary re-renders with `React.memo`, `useMemo`, and `useCallback` at scale
  - FlatList internals: `getItemLayout`, `windowSize`, `maxToRenderPerBatch`, and cell recycling
  - InteractionManager and delayed task scheduling without blocking gestures
- **Memory and images**
  - Image decoding pipelines, downsampling, and caching (and when to use native image libs)
  - Detecting native memory growth and leaks with heap snapshots
- **Hands-on Lab**: Instrument an app's cold start, identify the dominant phase, apply two optimizations, and measure the improvement

### Module 6: Hermes and JavaScript Engine Internals (Week 6)

- **Hermes architecture**
  - The Hermes runtime and its ahead-of-time bytecode compilation model
  - Why AOT bytecode beats JIT parsing for mobile: startup and memory trade-offs
  - Hermes flags in the Metro config: `hermesc`, bytecode transforms, and compilation options
- **Startup and snapshotting**
  - Precompiled bytecode bundles and how they shrink startup time
  - Global snapshotting: sharing immutable runtime state across launches
  - Trade-offs: snapshot generation and code that cannot be snapshotted
- **Garbage collection and memory**
  - The Hades concurrent GC, heap sizing, and GC pauses
  - Heap snapshots, object lifespan analysis, and leak hunting in Hermes
  - Controlling allocation pressure in hot paths
- **Engine comparison**
  - JavaScriptCore versus Hermes on iOS and Android: when JSC still makes sense
  - Engine configuration, `Intl` support, and polyfill implications
- **Hands-on Lab**: Switch a build to Hermes bytecode, inspect the compiled bundle, and use heap snapshots to find and fix a memory leak

### Module 7: Large-Scale Application Architecture (Week 7)

- **Modular monoliths**
  - Feature modules, module boundaries, and dependency rules enforced with dependency-cruiser
  - The feature-slice pattern: UI, state, API, and native wrappers per feature
  - Avoiding circular dependencies and centralized god modules
- **Micro-frontends on mobile**
  - Module federation with Repack and independently deployed federated modules
  - Versioning federated modules and the runtime contract
  - When micro-frontends help versus when a modular monolith is simpler
- **Monorepos**
  - Organizing apps, packages, and libraries with Nx or Turborepo
  - Shared TypeScript configs, dependency version catalogs, and codegen pipelines
  - Enforcing change scoping and cacheable builds in CI
- **Feature flags and experimentation**
  - Flag infrastructure, remote configuration, and A/B testing at the module level
  - Kill switches and progressive rollouts coupled to feature boundaries
- **Hands-on Lab**: Split a sample app into feature modules, add a dependency rule, and run a monorepo-style cacheable build

### Module 8: Advanced Offline and Data Architecture (Week 8)

- **Local-first architecture**
  - Designing the device database as the source of truth: WatermelonDB, RxDB, and SQLite
  - Schema migrations on-device and the sync contract with the server
- **Synchronization engines**
  - Pull/push sync, delta tokens, and paginated change feeds
  - Queue-based writes with idempotency keys and retry with backoff
- **Conflict resolution and CRDTs**
  - Last-write-wins versus field-level merge and vector clocks
  - CRDTs for collaborative data: conflict-free merging without a central resolver
  - Optimistic updates and rolling back failed mutations
- **Background synchronization**
  - WorkManager on Android and BGTaskScheduler on iOS for deferred sync
  - Battery and network constraints, reachability handling, and sync observability
- **Cache invalidation**
  - Staleness policies, cache eviction, and selective invalidation by mutation
  - Serving stale data during network failures with a clear indicator
- **Hands-on Lab**: Build a local-first notes app with offline writes, queue-based sync, and conflict resolution, then verify behavior with the network disabled

### Module 9: Security Architecture in Depth (Week 9)

- **Threat modeling for mobile**
  - Reverse engineering, repackaging, MITM attacks, and data-at-rest threats
  - Identifying the assets worth protecting and the attacker models per asset
- **Secure storage**
  - iOS Keychain and Android Keystore-backed storage with react-native-keychain
  - EncryptedSharedPreferences, biometric unlock, and key rotation
  - What should never be stored on-device: tokens, keys, and PII rules
- **Network security**
  - Certificate pinning and its maintenance: backup pins and server key pinning
  - Android Network Security Config and iOS ATS (App Transport Security) exceptions
  - Detecting and logging TLS failures without breaking production traffic
- **Integrity and tamper resistance**
  - Jailbreak and root detection, runtime integrity checks, and anti-debugging
  - Play Integrity API and App Attest for server-side trust decisions
  - Code obfuscation and minimizing high-value logic in JavaScript
- **Supply chain and dependency security**
  - Auditing dependencies, lockfiles, and automated vulnerability scanning
  - Code signing, CI secrets hygiene, and preventing malicious package substitution
- **Hands-on Lab**: Harden a sample app with pinning, secure storage, and integrity checks, then attempt to decrypt its storage and document what stops the attack

### Module 10: Advanced Animations and Gesture Engineering (Week 10)

- **Reanimated 4 and the UI thread**
  - Worklets and how they run on the UI thread with zero bridge round-trips
  - Shared values, animated props, and the render-tree synchronization
  - Layout animations and the `entering`/`exiting` transition API
- **Shared element transitions**
  - Shared transition tags across screens and the native driver under the hood
  - Coordinating shared elements with navigation libraries
- **Gesture composition**
  - Gesture Handler: pan, pinch, rotation, fling, and long-press in combination
  - Simultaneous, exclusive, and failed gesture relationships
  - Gesture-driven animations: dragging, snapping, and momentum physics
- **Custom rendering with Skia**
  - react-native-skia: canvas rendering, shaders, and GPU-accelerated effects
  - When to render with Skia versus the native view tree
- **Performance budgets for animation**
  - Keeping animation work off the JS thread and measuring UI-thread cost
  - Reducing overdraw and avoiding layout thrash during animations
- **Hands-on Lab**: Build a gesture-driven card stack with shared element transitions and verify the entire animation runs without JS-thread involvement

### Module 11: Testing, Observability, and Release Engineering at Scale (Week 11)

- **Testing at scale**
  - Component-driven development with Storybook for React Native
  - Visual regression testing with Chromatic and snapshot baselines
  - Contract testing between app and API with Pact
  - Property-based testing for reducers, sync logic, and parsers
- **Performance regression gates in CI**
  - Bundle size budgets, bytecode size checks, and dependency weight monitoring
  - Startup and frame-budget regression detectors on CI devices
  - Flamegraph analysis with automated failure thresholds
- **Observability**
  - Crash reporting with Crashlytics and Sentry: grouping, breadcrumbs, and symbolication
  - Real User Monitoring (RUM): screen transitions, API latency, and app health scores
  - Structured logging, trace propagation, and correlating JS and native logs
- **Release engineering**
  - Staged rollouts, crash-free rate gates, and automatic rollback rules
  - Android App Bundle (AAB) and iOS archive management
  - Over-the-air updates with expo-updates or CodePush and their safety limits
- **Hands-on Lab**: Add Storybook and visual regression to a feature, wire up RUM, and rehearse a staged rollout with a crash gate

### Module 12: Capstone Project (Week 12)

- **Project planning and architecture design**
  - Multi-module architecture with the New Architecture enabled
  - Data model, sync contract, and security design documents
  - Performance budget definition and observability plan
- **Implementation**
  - Custom Turbo Modules and at least one custom Fabric component
  - Offline-first data layer with conflict resolution
  - Security hardening and UI-thread animations
- **Quality assurance**
  - Component-driven tests, visual regression, and contract tests in CI
  - Performance regression gates and manual QA on physical devices
  - Security review pass and threat-model walkthrough
- **Deployment**
  - Staged rollout to at least one app store track with a crash gate
  - Post-launch monitoring and a documented rollback runbook

## Final Project

Learners will build **"FieldNote"** — a local-first field data collection and team collaboration platform where mobile teams record observations, photos, and geodata in the field and sync them to a central workspace. The app must include the following features:

- **New Architecture**: Fabric and Turbo Modules enabled, with at least one custom Turbo Module (for example, a native media compressor) and one custom Fabric component (for example, a native map annotation surface)
- **Offline-first data layer**: All records created offline, queued writes with idempotency, delta-based sync, and field-level conflict resolution
- **Authentication and security**: Biometric unlock, Keychain/Keystore-backed token storage, certificate pinning, integrity attestation, and a documented threat model
- **Collaboration**: Shared collections with CRDT-based field merging and optimistic updates
- **Advanced UI**: Gesture-driven map interactions and shared element transitions, with animations fully off the JS thread
- **Performance budget**: Cold start under a defined threshold and a scrolling frame rate above a defined threshold, verified by CI gates
- **Observability**: Crash-free rate monitoring, RUM dashboards, and structured logging end to end
- **Release**: Staged rollout to TestFlight or Google Play internal testing with a crash gate and a documented rollback runbook

## Assessment Criteria

- **Assignments (30%)**: Weekly labs and comprehension checks
  - Module 1-4: New Architecture labs and native module implementations
  - Module 5-6: Performance and engine analysis reports
  - Module 7-8: Architecture and offline-sync design submissions
  - Module 9-10: Security and animation engineering tasks
  - Module 11: Testing, observability, and release rehearsal checklists

- **Midterm Project (20%)**: A standalone advanced React Native app
  - Must use the New Architecture, at least one Turbo Module, and an offline data layer
  - Evaluated on architecture decisions, native code quality, and performance evidence

- **Final Capstone Project (50%)**
  - Architecture and New Architecture adoption (20%)
  - Offline sync and data integrity (20%)
  - Security hardening and threat-model compliance (15%)
  - Performance budget attainment (15%)
  - Test coverage and CI gates (15%)
  - Release quality and observability evidence (15%)

## References

- [React Native New Architecture Documentation](https://reactnative.dev/docs/architecture-landing-page)
- [Fabric Renderer and Turbo Modules Documentation](https://reactnative.dev/docs/next/architecture/fabric-renderer)
- [JSI (JavaScript Interface) Documentation](https://reactnative.dev/docs/next/architecture/jsi)
- [Codegen Documentation](https://reactnative.dev/docs/next/architecture/codegen)
- [Hermes JavaScript Engine Documentation](https://hermesengine.dev/docs/)
- [React Native Performance Documentation](https://reactnative.dev/docs/performance)
- [Reanimated 4 Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [react-native-skia](https://shopify.github.io/react-native-skia/)
- [WatermelonDB](https://watermelondb.dev/)
- [RxDB Offline-First Database](https://rxdb.info/)
- [Repack Module Federation for React Native](https://repack.pro/)
- [react-native-keychain](https://github.com/oblador/react-native-keychain)
- [Sentry React Native Documentation](https://docs.sentry.io/platforms/react-native/)
- [Firebase Crashlytics for React Native](https://rnfirebase.io/crashlytics/usage)
- [Storybook for React Native](https://storybook.js.org/docs/react-native)
- [Detox E2E Testing](https://wix.github.io/Detox/)
- [The React Native Blog — New Architecture Updates](https://reactnative.dev/blog/)
- "React Native in Action" by Nader Dabit (Manning Publications)
- "Professional React Native" by Alexander Benedikt Kuttig (Packt Publishing)

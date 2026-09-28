---
title: "Kotlin Android Performance Engineering Syllabus"
description: "A 12-week advanced curriculum for engineering fast, smooth, and efficient Android apps with Kotlin — startup optimization, rendering and frame budgets, Compose performance, memory and energy profiling, APK size reduction, and performance testing in CI."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Kotlin Android Performance Engineering Syllabus

## Overview

This 12-week syllabus trains developers to treat performance as a measured, engineered property of Android applications rather than an afterthought. Where the Android Development Syllabus introduces performance as a single final week and the Advanced Kotlin Syllabus profiles the language and JVM layer, this curriculum goes platform-deep: how app startup is actually driven by `Application` initialization and baseline profiles, how a frame survives the choreographer pipeline, how Compose decides what to recompose, how memory leaks and bitmaps behave under Android's memory pressure, how battery drain and network payloads degrade the experience, and how R8 and App Bundles shrink what ships to the Play Store. Every week pairs conceptual grounding with a measurable exercise using Perfetto, JankStats, Macrobenchmark, LeakCanary, Battery Historian, or the Android Vitals dashboard. Learners should already build Android apps with Kotlin and Compose fluently; the course culminates in a capstone that audits a real application end to end, quantifies its bottlenecks, fixes them, and proves the improvement with before-and-after measurements.

## Curriculum

### Week 1: Performance Mindset and Measurement Foundations
- **Why performance is a feature**: user retention research, Android Vitals thresholds, business impact of startup latency and jank
- **Metrics that matter**: cold/warm/hot start time, time-to-first-frame, dropped frames and jank percentage, ANR rate, crash-free sessions, excessive wakeups, frozen frames
- **Measurement tooling**: Perfetto traces, Systrace, `adb shell dumpsys`, `screenrecord`, JankStats library basics
- **Performance budgets**: defining budgets per path (startup < 2 s on low-end devices, 16 ms frame budget, < 10 ms main-thread tasks)
- **Baseline device strategy**: testing on low-mid-end hardware, CPU throttling and thermal effects, emulator versus physical device deltas
- **Practice**: Capture a Perfetto trace of an app's cold start, identify the top five long-running segments, and write a one-page performance budget document

### Week 2: App Startup Optimization
- **Startup types**: cold, warm, and hot start definitions and how the system phases them (process spawn, `Application.onCreate`, first frame)
- **`Application` class audit**: deferring work — `enableStrictMode`, `contentProvider` initialization cost, `androidx.startup` initializers, lazy singletons
- **Main-thread diet**: moving disk, network, and reflection off the critical path, `StrictMode` penalties, thread pools and coroutine dispatchers
- **Splash screen and first frame**: `SplashScreen` API, themed launch screens, avoiding layout thrash before first draw
- **Baseline Profiles**: how Cloud Profiles and baseline profiles work, generating them with Macrobenchmark, profile install and compile-time trade-offs
- **Practice**: Reduce cold start by 30% on a low-end device, verify with `adb shell am start -W` and Perfetto before/after traces

### Week 3: Rendering and the 16 ms Frame Budget
- **The graphics pipeline**: Choreographer, vsync, `SurfaceFlinger`, triple buffering, and where jank is born
- **Frame timing analysis**: Perfetto frame timeline, `gfx-info` dumpsys, identifying binder, layout, draw, and rasterization phases
- **JankStats in production**: the JankStats library, frame duration listeners, jank heuristics and bucketing, reporting to analytics
- **Overdraw and invalidations**: GPU overdraw (`adb shell dumpsys gfxinfo` overdraw debug), avoiding redundant redraws in views and Compose
- **Layers and effects**: alpha, elevation, blur and shadow costs, avoiding layer leaks, `clipToOutline` and hardware layers
- **Practice**: Instrument an app with JankStats, reproduce a janky scroll on a low-end device, and fix the frame pipeline issue with measurable improvement

### Week 4: Jetpack Compose Performance Deep Dive
- **Recomposition model**: how Compose tracks reads, skip counts, and why "recomposition runs" do not equal "recomposition was needed"
- **Stability and skippability**: `@Stable`/`@Immutable` annotations, unstable parameters, lint rules for stability, `strong skipping` mode
- **State scope**: `derivedStateOf`, `remember`, `rememberUpdatedState`, hoisting state, minimizing read scope
- **Lists and lazy layouts**: `LazyColumn` item keys, `contentType`, large item counts, avoiding `items` recomposition traps
- **Infinite animations and graphics**: `Animatable`, `rememberInfiniteTransition` cost, `graphicsLayer` for transforms, avoiding `Modifier.*` allocations
- **Practice**: Use compose compiler reports to stabilize a screen, cut recomposition scope misses by half, and verify frame times with Macrobenchmark

### Week 5: Memory Management and Profiling
- **Android memory model**: per-app heap limits, `lowmemorykiller`, `lmkd`, process death and recreation, `onTrimMemory`
- **Leak detection**: LeakCanary heap dumps, Android Studio Memory Profiler, retained size analysis, common leak patterns (contexts, listeners, coroutines)
- **Bitmap memory**: `ARGB_8888` versus `RGB_565`, downsampling with `inSampleSize`, Coil/Glide memory cache, hardware bitmaps
- **Garbage collection**: GC pauses on ART, allocation pressure, object churn in hot paths, avoiding allocations in `draw`/composition
- **Memory-mapped and large data**: `ByteBuffer`, large JSON sets, paging large collections, `LruCache` sizing and eviction
- **Practice**: Reproduce a leak, capture and analyze a heap dump, eliminate the leak, and confirm stable memory on a 100-scroll session

### Week 6: Energy and Battery Optimization
- **Battery anatomy**: Battery Historian and Battery Stats, `dumpsys batterystats`, discharge breakdown by package, Doze and App Standby buckets
- **Wake locks and alarms**: `PowerManager` wake locks, `AlarmManager` and exact alarms, `setExactAndAllowWhileIdle` restrictions
- **WorkManager scheduling**: deferrable work, `uniqueWork`, constraints, backoff policy, batching network jobs
- **Sensors and location**: sensor batching, `SENSOR_DELAY_UI` versus game, location request throttling, foreground service limits
- **Network and wake-ups**: batching uploads, push message coalescing, avoiding per-message wakeups, `JobScheduler`
- **Practice**: Measure the app's battery drain over a 12-hour idle-plus-use window, eliminate the top three wake-up offenders, and re-measure the delta

### Week 7: APK Size and Build Optimization
- **Size budget and why it matters**: install-conversion impact, Play Console size insights, per-ABI and per-density splits
- **R8 and ProGuard**: shrinking, obfuscation, optimization, keep rules, `-printusage` and missing-class reports, debug-only code elimination
- **Resource shrinking**: `shrinkResources`, unused resource removal, `resConfigs`, locale and density constraints
- **App Bundles and Dynamic Delivery**: AAB publishing, per-device APKs, on-demand and asset packs for large features
- **Build performance**: Gradle configuration cache, build cache, Kotlin incremental compilation, preventing dependency bloat with dependency analysis
- **Practice**: Cut APK size by 25% with R8 rules, resource shrinking, and dependency cleanup, then verify the AAB's per-device APK sizes

### Week 8: Network and Image Loading Performance
- **HTTP foundations**: connection pooling, TLS session reuse, OkHttp interception timing, `cacheControl`
- **Response payloads**: JSON size and parsing cost, kotlinx.serialization performance, protobuf and gzip trade-offs, pagination and cursor design
- **Image pipeline**: Coil/Glide request lifecycle, memory and disk cache sizing, `size` and `crossfade` cost, preloading and placeholder strategy
- **Offline and retry**: offline-first caching, stale-while-revalidate, exponential backoff, network security config
- **Network observability**: Network Inspector, OkHttp logging, timeline tracing with Perfetto, Firebase Performance monitoring
- **Practice**: Profile a slow image-heavy feed, apply cache-first loading and payload compression, and document the median-latency improvement

### Week 9: Storage, Database, and IO Performance
- **SQLite and Room**: query planning, `EXPLAIN QUERY PLAN`, indexes, `@Index` guidance, avoiding N+1 with relations and `Flow`
- **Transaction discipline**: `withTransaction`, batch inserts, `TRUNCATE` versus `DELETE`, avoiding per-row transactions
- **DataStore, files, and serialization**: Preferences DataStore versus Proto DataStore, file IO on background dispatchers, `Okio` buffering
- **IO on the right thread**: main-thread disk access detection, `StrictMode` disk-read penalties, `Dispatchers.IO` limits
- **Large data handling**: paging large result sets, streaming with `Flow`, memory trade-offs of loading whole tables
- **Practice**: Optimize a Room-backed feed query from 800 ms to under 100 ms on a low-end device using indexes and transaction batching

### Week 10: Stability — ANRs, Crashes, and StrictMode
- **ANR anatomy**: input dispatch, broadcast, and service ANR types, the ANR dialog lifecycle, `adb shell am hang` testing
- **Main-thread violations**: finding ANR causes with traces (`/data/anr/`), blocked locks, binder calls, `Choreographer` timeouts
- **Crash health**: crash-free user rate, Android Vitals crash clustering, `Thread.UncaughtExceptionHandler` best practice, native crash symbols
- **StrictMode as a guardrail**: enabling in debug, `detectAll`, penalty logging versus death, deployment in staged rollouts
- **Recovery and resilience**: crash recovery flows, state restoration, startup after crash, avoiding crash loops
- **Practice**: Artificially trigger an ANR, capture and read the ANR trace, fix the blocking call, and add StrictMode guards to prevent regressions

### Week 11: Performance Testing and CI Gates
- **Macrobenchmark fundamentals**: `MacrobenchmarkRule`, startup and scroll benchmarks, `startupMode`, compilation modes
- **Baseline Profile generation**: `BaselineProfileRule`, profile consumers, shipping profiles in the AAB, measuring installed-app gains
- **Microbenchmark and unit-level perf**: `MicrobenchmarkRule`, measuring method costs, avoiding test-device variance
- **CI integration**: Gradle Managed Devices, Firebase Test Lab, benchmark graphs and threshold gates, failing builds on regressions
- **Continuous measurement**: storing benchmark artifacts, nightly runs, alerting on jank and startup drift, Android Vitals post-release monitoring
- **Practice**: Add a startup Macrobenchmark with a baseline profile to the project, wire it into CI with a regression threshold, and prove a merged baseline profile speeds cold start

### Week 12: Capstone — End-to-End Performance Audit and Optimization
- **Audit plan**: pick a real app, define success metrics and budgets, inventory known pain points, baseline every target with traces
- **Systematic optimization**: apply startup, rendering, Compose, memory, battery, size, network, and IO techniques in priority order
- **Measurement discipline**: before/after traces for every change, single-variable experiments, documenting every fix with numbers
- **CI and regression protection**: add automated benchmarks and thresholds, update baseline profiles, ship a performance regression suite
- **Reporting**: write a performance audit report with quantified results, cost-benefit of each change, and recommended follow-ups
- **Presentation**: demo the before/after experience on a low-end device, defend the measurements, and hand over a reproducible audit checklist

## Final Project

Learners select a real Android application (their own app, an open-source project, or a provided reference app) and complete a full performance engineering cycle: define measurable budgets, capture baseline Perfetto/Macrobenchmark traces, identify the top bottlenecks across startup, rendering, Compose recomposition, memory, battery, size, network, and storage, implement fixes in priority order, and prove each improvement with paired before/after measurements. Deliverables include the performance budget document, the audit checklist used, the automated benchmark suite with CI thresholds, and a final report that quantifies the end-to-end gains — for example, cold-start time reduced by a target percentage, jank percentage halved, or crash-free rate moved above the Android Vitals good threshold. The project is evaluated on the rigor of the measurement methodology, the real-world impact of the fixes, and the reproducibility of the results on the documented low-end test device.

## Assessment Criteria

- **Assignments**: Weekly measurement exercises (Perfetto traces, JankStats integration, heap-dump analysis, battery historian reports) graded on completeness of the measurement methodology, correctness of the diagnosis, and the quality of the before/after evidence. Quizzes cover trace interpretation, frame pipeline mechanics, Compose stability rules, and Android Vitals thresholds.
- **Final Project**: The capstone is validated against the stated performance budgets — each claimed improvement must be backed by a reproducible trace or benchmark run on the declared test device and compilation mode. Credit is awarded for fixes whose numbers hold across multiple runs, for effective CI regression gates, and for honest reporting of fixes that did not move the metrics.

## References

- [Android performance documentation](https://developer.android.com/topic/performance)
- [Perfetto tracing documentation](https://perfetto.dev/docs/)
- [Android Vitals dashboard](https://developer.android.com/topic/performance/vitals)
- [App startup performance guide](https://developer.android.com/topic/performance/app-startup)
- [Baseline Profiles guide](https://developer.android.com/studio/profile/baselineprofiles)
- [Macrobenchmark documentation](https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview)
- [Jetpack Compose performance documentation](https://developer.android.com/jetpack/compose/performance)
- [LeakCanary documentation](https://square.github.io/leakcanary/)
- [Battery Historian](https://github.com/google/battery-historian)
- [Reduce APK size guide](https://developer.android.com/topic/performance/reduce-apk-size)
- [JankStats library](https://developer.android.com/jetpack/androidx/releases/jankstats)

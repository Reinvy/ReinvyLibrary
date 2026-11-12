---
title: "Kotlin Gradle Build Engineering Syllabus"
description: "A 12-week advanced curriculum on treating the Gradle build as production software: convention plugins, version catalogs, KSP, variant configuration, build caching, test infrastructure, and CI build engineering for Kotlin and Android projects."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Kotlin Gradle Build Engineering Syllabus

## Overview

This 12-week syllabus treats the Gradle build as production software that deserves the same rigor as application code. Where the Android Development Syllabus covers how to write apps and the Advanced Kotlin Syllabus covers language and compiler internals, this curriculum goes after the layer most teams never design deliberately: the build itself. It covers how a multi-module Kotlin project actually resolves dependencies, why build scripts rot into copy-paste, and how to replace that decay with version catalogs and precompiled convention plugins. It then moves through the Kotlin compiler toolchain, KSP processor pipelines, the Android variant API, configuration cache and build cache mechanics, test infrastructure, shrinking configuration, module publishing, and CI build engineering including remote caches and reproducible builds. Every module pairs mechanism with measurement: a change is only considered correct when a build scan proves it faster or a CI run proves it stable. The course culminates in a capstone that modernizes a realistic multi-module project end to end. Learners should already be comfortable building and running Kotlin or Android projects and reading Groovy or Kotlin DSL build scripts, but no prior build-engineering experience is assumed.

## Curriculum

### Week 1: The Gradle Execution Model
- **Build lifecycle**: initialization, configuration, and execution phases, and why the boundaries matter for performance
- **Settings and project structure**: `settings.gradle.kts`, included builds, project path versus directory layout
- **Task graph mechanics**: task registration versus configuration, dependencies, `dependsOn` versus `mustRunAfter`
- **Kotlin DSL internals**: type-safe accessors, generated accessors, delegation with `by`, extension functions on `Project`
- **Lazy APIs**: `Provider`, `Property`, `map`, `flatMap`, and why eager `afterEvaluate` blocks break caching
- **Practice**: Trace a real task graph with `gradle :app:assembleDebug --dry-run` and explain every task in the chain

### Week 2: Dependency Management and Version Catalogs
- **Declaring dependencies**: implementation versus api, compileOnly, runtimeOnly, and leak risks from `api`
- **Version catalogs**: `libs.versions.toml` structure, aliases, bundles, and catalog sharing across builds
- **BOM and platform alignment**: `platform()` imports, enforced platforms, Kotlin BOM versus Compose BOM
- **Conflict resolution**: `resolutionStrategy`, forced versions, `dependencyInsight` and `dependencyUpdates`
- **Constraints and capabilities**: `constraints` blocks, virtual platforms, mutually exclusive capabilities
- **Practice**: Consolidate scattered dependency strings into a single version catalog and document the resulting conflict resolutions

### Week 3: Convention Plugins and Build Logic
- **The copy-paste problem**: how module count multiplies duplicated build script blocks
- **buildSrc versus build-logic**: included builds, build time cost, where each belongs
- **Precompiled script plugins**: `kotlin-dsl` plugin, `*.gradle.kts` convention files, applying them by id
- **Binary plugins**: typed extension classes, `Plugin<Project>` implementations, plugin configuration validation
- **Composable conventions**: layered plugins (base, library, feature, compose) that stack cleanly
- **Practice**: Extract a four-module project's shared configuration into a build-logic build with composable convention plugins

### Week 4: The Kotlin Compiler Toolchain
- **Toolchain management**: `jvmToolchain`, auto-provisioning, foojay resolver, toolchain mismatch failures in CI
- **Compiler options DSL**: `compilerOptions` block, opt-in flags, `freeCompilerArgs`, progressive mode
- **Language and API versions**: pinning `languageVersion` and `apiVersion`, K2 migration sequencing
- **Strictness settings**: `allWarningsAsErrors`, explicit API mode for libraries, opt-in annotations
- **Incremental compilation**: what invalidates the Kotlin incremental cache and how to diagnose full rebuilds
- **Practice**: Configure a library module with explicit API mode and warning-as-error enforcement, then fix every surfaced violation

### Week 5: Annotation Processing with KSP
- **kapt versus KSP**: why kapt stubs are expensive, the migration decision tree
- **KSP mechanics**: symbol processing rounds, generated sources, `ksp` configuration and arguments
- **Processor configuration**: Room schema export, Hilt compiler options, argument passing per variant
- **Multi-round and multi-module processing**: generated code visibility, `kspTest`, avoiding circular generation
- **Incremental processing**: processor-side incremental support, cache invalidation debugging
- **Practice**: Migrate a kapt-based Room and Hilt module to KSP, then compare clean and incremental build times with build scans

### Week 6: Variant Configuration and the Android Build
- **The variant API**: `androidComponents.onVariants`, `beforeVariants`, and the deprecated legacy variant API
- **Build types and flavors**: flavor dimensions, dimension order, variant filters for local development
- **Source sets and manifest merging**: per-variant resources, manifest placeholders, merge conflict resolution
- **BuildConfig and generated constants**: `buildConfigField`, `resValue`, per-variant endpoints and feature flags
- **Manipulating outputs**: customizing application ID suffixes, version codes, and artifact names per variant
- **Practice**: Configure three flavors with distinct endpoints and suffixes, then restrict local builds to a single variant

### Week 7: Build Performance and Caching
- **Configuration cache**: supported plugin patterns, `notCompatibleWithConfigurationCache`, migration strategy
- **Build cache mechanics**: task inputs and outputs, cacheable tasks, local versus remote cache keys
- **Parallel and on-demand execution**: `org.gradle.parallel`, worker API usage, avoiding shared mutable state
- **Profiling tools**: `--profile`, build scans timeline, configuration versus execution time breakdown
- **Measuring honestly**: clean-build benchmarks, warm versus cold cache, avoiding misleading local timings
- **Practice**: Take a baseline build scan, remove every configuration cache violation, and document the measured speedup

### Week 8: Test Infrastructure as a Build Concern
- **Test suites**: JVM test suites, `useJUnitPlatform`, per-suite dependencies and system properties
- **Test fixtures**: the `java-test-fixtures` and Android test fixtures plugins, sharing fakes across modules
- **Instrumented versus unit tests**: source set wiring, `testOptions`, managed devices, emulator matrices
- **Parallelism and sharding**: `maxParallelForks`, test distribution across CI shards, flaky-test isolation
- **Filtering and reporting**: test filters for affected-module selection, aggregated reports, failure retention
- **Practice**: Split one monolithic test task into unit, fixture-based, and instrumented suites with CI-ready filtering

### Week 9: Shrinking, Resources, and Startup Configuration
- **R8 configuration in the build**: `proguardFiles`, consumer rules from library modules, rule packaging
- **Diagnosing shrinker output**: `-whyareyoukeeping`, missing class reports, mapping file retention
- **Resource shrinking**: `shrinkResources`, `keep.xml`, redundant resource detection, dynamic resource references
- **Baseline profiles**: generating and packaging baseline profiles, startup measurement in CI
- **Artifact inspection**: `apkanalyzer`, AAB content inspection, dex and resource size attribution
- **Practice**: Add consumer ProGuard rules to a library module, fix shrinker-broken behavior, and measure startup improvement with a baseline profile

### Week 10: Publishing and Module Distribution
- **maven-publish fundamentals**: publications, repositories, POM customization, Gradle module metadata
- **Publishing conventions**: reusable publishing plugin, consistent coordinates, version derivation from git tags
- **Signing and staging**: GPG signing configuration, Sonatype or Nexus staging, release automation hooks
- **Kotlin Multiplatform publishing**: per-target publications, common metadata, source jar generation
- **Documentation artifacts**: Dokka integration, javadoc jar equivalence, doc publishing in CI
- **Practice**: Publish a real library module to a local Maven repository with signed artifacts, sources, and Dokka docs

### Week 11: CI Build Engineering
- **Remote build cache**: cache node setup, read-only versus read-write access for untrusted branches
- **Dependency verification and locking**: `verification-metadata.xml`, lockfiles, checksum management at scale
- **Reproducible builds**: timestamp normalization, archive ordering, deterministic output verification
- **CI pipeline design**: affected-module detection, matrix strategies, artifact reuse across jobs
- **Build observability**: build scan publication, failure analytics, tracking build time as a tracked metric
- **Practice**: Wire a CI pipeline with a remote cache, dependency verification, and a build-time regression gate

### Week 12: Capstone Project
- **Scoping**: select a multi-module Kotlin or Android project with real duplication, slow builds, and mixed processor usage
- **Modernization plan**: version catalog, build-logic convention plugins, toolchain pinning, KSP migration
- **Performance work**: configuration cache compatibility, remote build cache, measured before-and-after build scans
- **CI hardening**: affected-module test selection, dependency verification, reproducible release artifacts
- **Presentation**: deliver a build engineering review covering architecture of the build, measurements, and rollback risk

## Final Project

Learners deliver a **Modernized Kotlin Build Platform**: a realistic multi-module project converted from duplicated per-module build scripts into a layered `build-logic` build with composable convention plugins and a single version catalog. A strong submission demonstrates: every module applying conventions by plugin id with no copy-pasted configuration blocks; the Kotlin toolchain pinned with explicit API mode and warning enforcement in library modules; annotation processing migrated from kapt to KSP with measured incremental build improvements; the Android build configured through the variant API with flavors and per-variant constants; configuration cache enabled with zero violations; a remote build cache wired into CI with read-only access for pull requests; test suites split into unit, fixture, and instrumented layers with affected-module filtering; consumer ProGuard rules and baseline profiles shipped from the correct modules; and a published library artifact with sources and documentation. The deliverable includes the repository, before-and-after build scans, a short written build architecture document, and a CI pipeline that fails on build-time regressions.

## Assessment Criteria

- **Assignments**: Weekly hands-on exercises (task graph trace, catalog consolidation, convention plugin extraction, toolchain hardening, KSP migration, variant setup, cache migration, test suite split, shrinking fixes, publishing) graded on correctness, reusability of the build logic, and the quality of the measurements provided.
- **Quizzes**: Two short quizzes covering Gradle lifecycle phases, task input/output declarations and cacheability, configuration cache constraints, variant API semantics, and dependency resolution and verification.
- **Final Project**: Evaluated on build architecture quality (convention plugin layering, catalog hygiene), performance outcomes (verified build time and cache hit improvements), correctness and safety (dependency verification, reproducible artifacts, rollback plan), and the clarity of the written build review.
- **Participation**: Peer reviews of build logic in weeks 5 and 9, assessed on the quality of feedback about API design and cache-correctness.

## References

- [Gradle User Manual — Authoring Builds](https://docs.gradle.org/current/userguide/userguide.html)
- [Gradle Kotlin DSL Primer](https://docs.gradle.org/current/userguide/kotlin_dsl.html)
- [Gradle Version Catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html)
- [Gradle Configuration Cache](https://docs.gradle.org/current/userguide/configuration_cache.html)
- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Kotlin Gradle Plugin Documentation](https://kotlinlang.org/docs/gradle-configure-project.html)
- [Kotlin Compiler Options Reference](https://kotlinlang.org/docs/gradle-compiler-options.html)
- [KSP Quickstart and Migration from kapt](https://kotlinlang.org/docs/ksp-migrate-from-kapt.html)
- [Android Gradle Plugin — Configure Build Variants](https://developer.android.com/build/build-variants)
- [Android — Shrink, Obfuscate, and Optimize Your App](https://developer.android.com/build/shrink-code)
- [Baseline Profiles Overview](https://developer.android.com/topic/performance/baselineprofiles/overview)
- [Gradle Maven Publish Plugin](https://docs.gradle.org/current/userguide/publishing_maven.html)
- [Dependency Verification](https://docs.gradle.org/current/userguide/dependency_verification.html)

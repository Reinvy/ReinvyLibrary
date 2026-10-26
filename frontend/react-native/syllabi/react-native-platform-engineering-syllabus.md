---
title: "React Native Platform Engineering Syllabus"
description: "A six-module advanced curriculum that turns senior React Native developers into platform engineers responsible for app architecture, native modules, performance budgets, release pipelines, observability, and mobile security."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# React Native Platform Engineering Syllabus

## Overview

Most React Native material teaches application developers how to build screens. This syllabus teaches the other role: the platform engineer who owns the shared foundation that product teams build on top of. That means the rendering architecture and the New Architecture migration, the native module layer that bridges JavaScript to Kotlin and Swift, the performance and memory budgets that keep a large app smooth on mid-range Android hardware, the release and over-the-air pipeline that ships hundreds of builds a year, the observability stack that answers "why did this crash on a Samsung A14?", and the security posture that protects credentials and user data on a device you do not control.

The six modules are ordered the way a platform team actually matures: first understand the runtime, then extend it natively, then measure it, then ship it safely, then observe it in production, then harden it. Each module is one to two weeks of part-time study with a hands-on lab that produces an artifact the final project can reuse — a design document, a working native module, a benchmark harness, a release script, a dashboard, or a threat model.

Every lab is evaluated against production constraints rather than toy examples: cold start on a low-end device, bundle size deltas, crash-free session rate, p95 frame impact, and rollback time. Learners finish with a platform handbook for a real multi-team React Native app.

## Curriculum

### Module 1: Runtime and Architecture (Weeks 1–2)

- **How React Native renders**
  - The three threads: JavaScript, native/UI, and the shadow tree
  - Fabric renderer, the render pipeline, and synchronous layout effects
  - TurboModules and the JSI — why the old bridge was the bottleneck
- **Migration planning**
  - The interop layer and incremental adoption instead of a big-bang rewrite
  - Auditing libraries for New Architecture compatibility
  - Feature flags to run both renderers during a rollout
- **Repository architecture at scale**
  - Monorepo layout: app shell, shared packages, design system, platform package
  - Dependency boundaries and what a shared package may never import
  - Code ownership and CODEOWNERS rules that prevent accidental coupling
- **Lab**: Produce an architecture decision record that maps every third-party dependency to its New Architecture status and proposes a migration order with risk ratings

### Module 2: Native Modules and the Platform Layer (Weeks 3–4)

- **Writing TurboModules**
  - Spec files in TypeScript, codegen output, and what the generated code guarantees
  - Kotlin implementation with `ReactContext` lifecycle and main-thread dispatch
  - Swift/Objective-C implementation and module registration
- **Fabric components**
  - When a native view is justified versus a JS-only composition
  - Props, events, state updates, and measuring layout from the native side
- **JSI and shared C++ state**
  - Synchronous calls and when they are safe
  - Host objects, memory ownership, and avoiding leaks across the boundary
- **Lab**: Ship a TurboModule that performs a real device capability (secure key generation or battery telemetry) with full type definitions, unit tests on both platforms, and a documented fallback for unsupported devices

### Module 3: Performance Engineering (Weeks 5–6)

- **Measuring before optimizing**
  - Startup traces: TTI, cold start, and the cost of bundle evaluation
  - Frame timing with the performance monitor and Systrace/Perfetto
  - Hermes bytecode: what it changes and how to profile it
- **Rendering budgets**
  - FlatList versus FlashList, windowing, and `getItemLayout`
  - Memoization discipline and avoiding re-render cascades
  - Image decoding, caching, and memory pressure on Android
- **Bundle and memory**
  - Bundle analysis, tree shaking, and lazy route loading
  - Native binary size: Hermes, ABIs, and ProGuard/R8 rules
  - Detecting leaks with heap snapshots and Android Studio Memory Profiler
- **Lab**: Build a repeatable benchmark harness that records cold start, p95 frame time, and peak memory per commit, then cut startup time by at least 30 percent

### Module 4: Release Engineering (Weeks 7–8)

- **Build pipelines**
  - CI design: caching, parallel jobs, and reproducible dependency installs
  - Signing, keystores, and secrets management in CI
  - Versioning strategy and changelog automation
- **Over-the-air updates**
  - How CodePush-style OTA works and its store-policy limits
  - Staged rollouts, cohort targeting, and automatic rollback triggers
  - Compatibility between OTA JS bundles and native binary versions
- **Store delivery**
  - Android App Bundles, Play staged rollouts, and iOS phased release
  - Handling review rejections and hotfix paths
- **Lab**: Build a release pipeline that produces signed artifacts, publishes an OTA update to an internal cohort, and rolls back automatically when crash-free sessions drop below a threshold

### Module 5: Observability in Production (Weeks 9–10)

- **Crash and error reporting**
  - Native crash symbolication, JS error boundaries, and Hermes stack traces
  - Grouping, deduplication, and triage ownership
- **Product and performance telemetry**
  - Structured event schemas and versioned analytics contracts
  - Screen load timing, network latency, and interaction traces
  - Privacy-safe instrumentation and consent handling
- **Alerting and diagnosis**
  - SLOs for mobile: crash-free sessions and ANR rate
  - Runbooks that connect an alert to a dashboard, a release, and an owner
- **Lab**: Instrument a sample app end to end, build a dashboard for crash-free sessions and startup time by app version and device tier, and write a runbook for a startup regression alert

### Module 6: Mobile Security and Hardening (Weeks 11–12)

- **Threat model for a public app**
  - The device is hostile: jailbreak/root, instrumentation, and repackaging
  - What client-side code can and cannot protect
- **Secrets and storage**
  - Keychain and Keystore, biometric-gated keys, and encrypted local databases
  - Why shipping API keys in the bundle is always a finding
- **Network and transport**
  - Certificate pinning trade-offs and rotation plans
  - Jailbreak detection as a signal, not a gate
- **Supply chain**
  - Dependency review, lockfile integrity, and postinstall script risk
  - SBOM generation for mobile builds
- **Lab**: Perform a security review of the sample app, produce a prioritised threat model with mitigations, and implement certificate pinning plus secure credential storage with a documented rotation procedure

## Final Project

Learners produce a **platform handbook and reference implementation** for a fictional but realistic multi-team React Native app: four product squads shipping into one binary. The deliverable contains a working monorepo with a shared platform package, at least one custom TurboModule and one Fabric component, a benchmark harness wired into CI, a release pipeline with signed builds and a staged OTA rollout with automatic rollback, an observability dashboard covering crash-free sessions and startup time by version and device tier, and a security section with a threat model, pinning strategy, and SBOM output. Each artifact must be backed by measurements or configuration committed to the repository, not prose alone.

## Assessment Criteria

- **Module labs (50 percent)**: Each lab is graded on whether the artifact runs, whether the measurements are reproducible, and whether the trade-offs are documented with evidence rather than opinion.
- **Final project (35 percent)**: Evaluated on architectural coherence across the six areas, correctness of the release and rollback flow, usefulness of the observability dashboard, and the credibility of the threat model and mitigations.
- **Design reviews (15 percent)**: Two recorded walkthroughs where the learner defends a decision — for example, choosing a native view over a JS composition, or accepting a startup regression for a feature — and answers reviewer objections.

## References

- React Native documentation: New Architecture, TurboModules, Fabric, and JSI guides
- React Native community: release notes, upgrade helper, and breaking-change discussions
- Android developer documentation: App Bundles, ProGuard/R8, Perfetto, and Play staged rollouts
- Apple developer documentation: code signing, Keychain Services, and phased release
- Hermes engine repository and bytecode documentation
- "The Pragmatic Programmer" for decision records and trade-off reasoning
- Google SRE Workbook, chapters on SLOs and runbooks, adapted to mobile
- OWASP Mobile Application Security Verification Standard (MASVS)

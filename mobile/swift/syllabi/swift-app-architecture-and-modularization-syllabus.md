---
title: "Swift App Architecture and Modularization Syllabus"
description: "A 10-week advanced curriculum on architecting and modularizing large Swift codebases — layered design, Swift Package Manager module graphs, dependency injection, feature boundaries, scalable navigation and state, design systems, build-time optimization, and incremental monolith migration."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Swift App Architecture and Modularization Syllabus

## Overview

This 10-week advanced syllabus targets iOS engineers working on codebases that have outgrown a single app target: hundreds of screens, a dozen contributors, and build times measured in minutes. Most Swift curricula teach features — SwiftUI views, networking, persistence. This one teaches the structure those features live inside, and the decisions that determine whether a codebase stays fast to change after year three.

The curriculum moves from architecture fundamentals to a full modular migration. Learners start by diagnosing an unmodularized app: measuring coupling, mapping dependency tangles, and separating domain logic from framework code. They then design layered architectures, split the codebase into Swift Package Manager modules with explicit dependency direction, wire dependencies through a composition root instead of global singletons, and push navigation and shared state across module boundaries without leaking implementation details. Later modules cover design systems as versioned modules, build-graph and incremental-compilation performance, binary framework distribution, and the governance rules that keep a module graph from decaying back into a monolith.

Every module pairs design theory with a refactor on a realistic sample app that ships in the course repository. The capstone is a full architectural migration delivered as a stack of reviewable pull requests rather than a rewrite — because that is how the work actually happens on a production team.

Prerequisites: strong Swift and SwiftUI experience (equivalent to the iOS Development and Advanced SwiftUI syllabi), comfort with Xcode project and scheme configuration, and at least one shipped app or a team codebase of roughly 20k lines to use as a working case study.

## Curriculum

### Module 1: Architecture Foundations and Diagnosing Coupling (Week 1)

- **What architecture actually buys you**
  - Change cost as the real metric: compile time, blast radius, review surface, onboarding time
  - The difference between modularity, layering, and abstraction — and which one fixes which problem
  - Why "MVVM with folders" stops scaling once a target passes a few hundred files
- **Measuring the starting point**
  - Mapping the current dependency graph by hand and with tooling (import analysis, `swift package` diagnostics)
  - Identifying god types, circular references, and shared mutable singletons
  - Capturing baselines: clean build time, incremental build time, test suite duration, file count per feature
- **Failure modes to design against**
  - The shared "Utils" module that becomes a second monolith
  - Framework coupling inside domain logic (UIKit and SwiftUI imports leaking into business rules)
  - Premature abstraction: modules created before their boundaries are understood
- **Hands-on Lab**: Audit the course sample app, produce a dependency map and a baseline metrics sheet, and write a one-page proposal naming the three worst coupling hotspots

### Module 2: Layered Architecture and Domain Modeling (Week 2)

- **Choosing a structural spine**
  - Feature-first versus layer-first organization and when each one wins
  - Clean Architecture, hexagonal architecture, and MVC/MVVM without the ceremony
  - Pragmatic layering: presentation, domain, and data as the irreducible minimum
- **Domain modeling in Swift**
  - Value types, `enum` state machines, and making illegal states unrepresentable
  - Protocol-defined boundaries (`Repository`, `Service`, `UseCase`) and naming that survives refactors
  - Modeling errors as typed results instead of stringly-typed `NSError`
- **Keeping frameworks at the edges**
  - Domain targets with zero `import UIKit` or `import SwiftUI`
  - Adapters that translate between framework types and domain types
  - Testing domain rules without a simulator
- **Hands-on Lab**: Extract one feature's business rules from its view models into a framework-free domain layer, then add unit tests that run in under a second with no simulator boot

### Module 3: Modularization with Swift Package Manager (Week 3)

- **Module design fundamentals**
  - What deserves to be a module: cohesion, ownership, and release cadence as the deciding factors
  - Granularity trade-offs — too few modules versus one module per type
  - Naming and namespace conventions for internal packages
- **Package structure and manifests**
  - `Package.swift` anatomy: targets, products, dependencies, and platform requirements
  - Local packages inside a workspace versus repositories per package
  - `@_exported` imports, explicit module visibility, and avoiding accidental API surface
- **Dependency direction**
  - Acyclic graphs and why domain must never depend on presentation
  - Umbrella/interface modules that let features talk through contracts
  - Detecting and breaking cycles before they calcify
- **Hands-on Lab**: Split the sample app into a domain package, a networking package, and two feature packages, then verify the graph is acyclic with `swift package show-dependencies`

### Module 4: Dependency Injection and the Composition Root (Week 4)

- **Why singletons block modularization**
  - Hidden coupling through `.shared` and global state; the testing and parallelism costs
  - Distinguishing app-wide services from per-feature dependencies
- **Injection strategies**
  - Constructor injection as the default; property injection for framework-mandated types
  - Environment-based injection in SwiftUI and its limits at module boundaries
  - Lightweight containers without a third-party framework: registries, factories, and `Sendable` closures
- **The composition root**
  - A single assembly point in the app target that constructs the object graph
  - Keeping the root thin: factories per feature, not a thousand-line wiring file
  - Scoping: app-lifetime, session-lifetime, and screen-lifetime dependencies
- **Hands-on Lab**: Remove every singleton from the sample app, wire the graph from a composition root, and demonstrate one feature tested with injected fakes only

### Module 5: Feature Modules, Boundaries, and Contracts (Week 5)

- **Defining a feature's public API**
  - Minimal public surface: entry views, route types, and a single feature interface
  - `internal` by default and the review habit that keeps it that way
  - Versioning an internal contract as features evolve independently
- **Cross-feature communication without coupling**
  - Events and observers, delegate protocols, and async streams as the three workable patterns
  - Deep linking and shared route registries
  - Avoiding the "shared model" module that every feature edits
- **Boundary enforcement**
  - Import rules and lint configuration that fail the build on illegal imports
  - Test targets per module so a boundary break surfaces as a compile error, not a crash
  - Code review checklist for cross-module changes
- **Hands-on Lab**: Introduce a second feature module that consumes the first only through its interface, then add an import rule that blocks the reverse direction

### Module 6: Navigation and Routing at Scale (Week 6)

- **Navigation as a modeled problem**
  - Route enums, typed destinations, and path state owned outside the view
  - `NavigationStack` and `NavigationPath` across module boundaries
  - Coordinators and routers: what they cost and when they pay off
- **Decoupling screens from each other**
  - Destination factories registered per feature module
  - Passing identifiers and value types instead of live objects between modules
  - Handling deep links through the same route model as in-app navigation
- **Multi-platform and multi-scene navigation**
  - iPad split views, macOS windows, and visionOS ornaments from one route model
  - State restoration across launches
- **Hands-on Lab**: Replace ad-hoc `NavigationLink` chains with a routing layer that resolves destinations from feature-registered factories, including a deep link into a nested screen

### Module 7: State Management Across Module Boundaries (Week 7)

- **Where state belongs**
  - Local view state, feature state, and app state — and the rules for promoting between them
  - The Observation framework across modules: `@Observable` models owned by features
  - Avoiding a global app-state object that recreates the monolith in one file
- **Sharing state without sharing implementations**
  - Read-only projections published through protocols
  - Async streams and `AsyncSequence` for cross-feature signals
  - Persistence as a service boundary rather than a shared database handle
- **Concurrency in a modular app**
  - Actor isolation per module and `Sendable` boundaries between them
  - Swift 6 strict concurrency as an architectural forcing function
  - Avoiding data races at the seams where modules meet
- **Hands-on Lab**: Introduce a cross-feature notification flow using an async stream contract, keeping both feature modules free of imports from each other

### Module 8: Design Systems and Shared UI Modules (Week 8)

- **A design system that does not become the new monolith**
  - Tokens (color, spacing, typography, motion) as data, not hardcoded constants
  - Component modules versus a single "UI" grab bag
  - Owning typography and dynamic type behavior centrally
- **Distribution and versioning**
  - Semantic versioning for internal UI packages and the deprecation policy
  - Preview-driven development across module boundaries
  - Theming and brand variants without forking components
- **Accessibility as a module contract**
  - Default accessibility traits baked into shared components
  - Auditing components once instead of per screen
  - Localization keys living with the component that uses them
- **Hands-on Lab**: Extract three repeated views into a versioned design-system package with token-based styling, dynamic type support, and a preview catalog

### Module 9: Build Performance, CI, and Binary Distribution (Week 9)

- **Making modular builds faster, not slower**
  - Why over-modularization can increase total build time and how to measure it
  - Whole-module optimization, incremental compilation, and target-level caching
  - Build timelines and `-debug-time-function-bodies` for hot spots
- **CI for a module graph**
  - Affected-target detection so a one-line change does not build everything
  - Parallel test execution per module and shared result bundles
  - Cache strategies for dependencies and derived data
- **Binary and prebuilt modules**
  - XCFrameworks and static versus dynamic linkage in a modular app
  - When to distribute binary modules to third-party consumers versus source packages
  - Symbol visibility and API stability for binary artifacts
- **Hands-on Lab**: Add affected-target detection to CI, then measure and document the before/after build times for a representative change

### Module 10: Migration, Governance, and Architectural Leadership (Week 10)

- **Migrating incrementally**
  - Strangler-fig migration: carving modules out of a live app without a feature freeze
  - Sequencing the work so each pull request is independently reviewable and shippable
  - Feature flags and dual paths during transition, and the discipline to delete the old path
- **Keeping the graph healthy over time**
  - Architecture decision records (ADRs) and why small teams still need them
  - Dependency-graph CI checks, module ownership, and CODEOWNERS
  - Metrics that reveal decay: cycle count, module growth, review latency
- **Leading the change**
  - Writing the proposal, defending the trade-offs, and negotiating scope with product
  - Onboarding new engineers into a modular codebase
  - Knowing when architectural purity costs more than it returns
- **Hands-on Lab**: Produce the migration plan for the capstone, with a sequenced PR breakdown and rollback strategy per step

## Final Project

Learners take an unmodularized sample app (roughly 15k lines, five features, three shared singletons) and deliver a complete architectural migration in a sequence of reviewable pull requests. Required outcomes:

- A domain layer with zero framework imports, covered by fast unit tests that run without a simulator
- At least five Swift Package Manager modules with an explicitly documented and acyclic dependency graph
- A composition root in the app target that constructs the object graph, with no remaining global singletons in feature code
- A routing layer that resolves every destination through feature-registered factories, including at least one deep link
- A versioned design-system package with token-based styling used by at least three screens
- CI configured with affected-target detection and per-module test execution, with measured before/after build times
- A written architecture decision record per major boundary, plus a README that explains the module graph to a new contributor

The submission includes the PR sequence itself — the migration plan and the staged commits are graded alongside the final state, because incremental delivery is the skill being taught.

## Assessment Criteria

- **Assignments (40%)**: one quiz per module plus weekly labs graded on whether the refactor is correct, minimal, and explained. Labs are individual; each is submitted as a branch with a short design note covering the trade-offs considered.
- **Final Project (45%)**: assessed on architectural soundness (dependency direction, boundary clarity, no leaks), incremental delivery (PR size, reviewability, safe ordering), measured outcomes (build time, test duration, cycle count before and after), and documentation (ADRs, module README, onboarding notes).
- **Code Review Participation (10%)**: each learner reviews two peers' migration pull requests using the course rubric, checking boundary violations, public API surface, and test coverage at the seams.
- **Peer Review (5%)**: a short retrospective on a classmate's architecture, identifying one structural risk and proposing a concrete mitigation.

## References

- Apple Developer Documentation — Swift Packages: https://developer.apple.com/documentation/xcode/swift-packages
- Swift Package Manager repository and docs: https://github.com/swiftlang/swift-package-manager
- The Swift Programming Language — Access Control: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/
- Apple Developer Documentation — Observation framework: https://developer.apple.com/documentation/observation
- Apple Developer Documentation — SwiftUI navigation: https://developer.apple.com/documentation/swiftui/navigation
- Apple Developer Documentation — XCFramework: https://developer.apple.com/documentation/xcode/creating-a-multi-platform-binary-framework-bundle
- WWDC sessions — "Creating a Great Modular Architecture", "Meet Swift Package Manager", and Swift concurrency migration talks
- Martin Fowler — Strangler Fig Application: https://martinfowler.com/bliki/StranglerFigApplication.html
- "A Philosophy of Software Design" — John Ousterhout (module depth and interface complexity)
- "Clean Architecture" — Robert C. Martin (dependency rule and boundary design)

---
title: "Advanced SwiftUI Syllabus"
description: "A 10-week advanced curriculum for mastering modern SwiftUI — observable state management, SwiftData, navigation architecture, custom layouts, animations, performance optimization, and multi-platform app development."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Advanced SwiftUI Syllabus

## Overview

This 10-week syllabus is designed for developers who already know SwiftUI basics and want to reach an advanced level. It focuses on the modern SwiftUI stack: the `@Observable` macro and observation framework, SwiftData persistence, `NavigationStack` and `NavigationSplitView` architecture, the `Layout` protocol for custom layouts, production-grade animation techniques, performance profiling with Instruments, multi-platform app development, and accessibility. Each week pairs conceptual depth with hands-on exercises, and the course culminates in a multi-platform capstone project that combines every topic covered.

**Duration**: 10 weeks (recommended: 10–15 hours per week)
**Prerequisites**: Solid Swift fundamentals, working knowledge of SwiftUI basics (views, modifiers, `@State`/`@Binding`), and experience building at least one complete SwiftUI app
**Delivery**: Self-paced with project-based assessments

## Curriculum

### Week 1: Observation Framework and Modern State Management

- **The `@Observable` macro**
  - How the observation framework tracks property access
  - Migrating from `@StateObject`/`@ObservedObject`/`@EnvironmentObject` to `@Observable`
  - `@Bindable` for two-way bindings to observable properties
- **Ownership and lifecycle**
  - `@State` with observable models, `@Environment` injection
  - App-scoped vs. scene-scoped vs. view-scoped state
- **Avoiding over-rendering**
  - Fine-grained view invalidation and the `body` re-evaluation model
  - `@ObservationIgnored` for non-observed properties
- **Practical patterns**
  - View models, stores, and service objects with `@Observable`
  - Testing observable models with `withObservationTracking`
- **Exercise**: Refactor a legacy `ObservableObject` app to the observation framework and measure the render count reduction

### Week 2: SwiftData Deep Dive

- **SwiftData model layer**
  - `@Model`, relationships, and unique constraints
  - Migration strategies: lightweight, staged, and custom migrations
- **ModelContext lifecycle**
  - Main actor context vs. background contexts
  - `ModelContainer` configuration, in-memory stores for previews and tests
- **Querying and sorting**
  - `@Query` with predicates, sort descriptors, and fetch limits
  - Dynamic queries with `#Predicate` macros
- **SwiftData and SwiftUI integration**
  - Observable models and undo management
  - CloudKit sync with `ModelConfiguration`
- **Exercise**: Build a library app with a one-to-many relationship, search, and CloudKit sync enabled

### Week 3: Navigation Architecture

- **NavigationStack fundamentals**
  - Value-based navigation with `NavigationLink(value:)` and `navigationDestination`
  - Typed route enums for compile-time-safe navigation
  - Managing `NavigationPath` programmatically (push, pop, pop-to-root)
- **NavigationSplitView**
  - Three-column layouts for iPad and macOS
  - Column visibility control and detail selection
- **Advanced navigation patterns**
  - Deep linking with `onOpenURL` and scene phases
  - Tab-based navigation combined with stacks
  - Sheet and full-screen-cover presentation coordination
- **State restoration**
  - Saving and restoring `NavigationPath` across launches
- **Exercise**: Build a master-detail app with typed routes, deep links, and state restoration

### Week 4: Custom Layouts and View Composition

- **The `Layout` protocol**
  - `sizeThatFits` and `placeSubviews` implementation
  - Custom layout containers (flow layout, radial layout, masonry grid)
  - `LayoutValueKey` for per-subview layout attributes
- **PreferenceKey and custom view modifiers**
  - Propagating child information up the view tree
  - Building reusable modifiers and view extensions
- **Advanced composition**
  - `ViewThatFits`, `AnyLayout` for adaptive layouts
  - Custom container views with `@ViewBuilder` and result builders
- **Exercise**: Implement a flow layout container and a tag-cloud view using the `Layout` protocol

### Week 5: Advanced Animations and Transitions

- **Animation physics**
  - Spring parameters (response, dampingFraction, blendDuration)
  - Interactive animations with `Animation.spring` and `animatable` modifiers
- **Matched geometry effects**
  - `matchedGeometryEffect` for shared-element transitions
  - Hero animations between list and detail screens
- **Phase and keyframe animations**
  - `PhaseAnimator` and `KeyframeAnimator` for multi-step animations
- **Scroll-driven effects**
  - `scrollTargetLayout`, `scrollPosition`, and parallax effects
- **Performance-aware animation**
  - `drawingGroup` and `compositingGroup` usage, animating transforms vs. layout
- **Exercise**: Build a card-flip animation, an onboarding flow with shared elements, and a scroll-driven header collapse

### Week 6: Performance Optimization and Profiling

- **Rendering pipeline fundamentals**
  - How SwiftUI renders: diffing, invalidation, and the drawing pass
  - Avoiding unnecessary body evaluations with `Equatable` views
- **List and grid performance**
  - Stable identities with `id(_:)`, `ForEach` best practices
  - Lazy containers, prefetching, and cell reuse pitfalls
- **Instruments workflow**
  - Time Profiler, Core Animation, and SwiftUI instruments
  - Detecting hidden cost: blur, shadows, and off-screen rendering
- **Memory management**
  - Capture lists, avoiding retain cycles in closures
  - `@State` vs. reference-type model pitfalls
- **Exercise**: Profile a list-heavy app, identify the top three rendering bottlenecks, and fix them with measurable improvement

### Week 7: Advanced Data Flow and Integration

- **Bindings and focus**
  - Custom `Binding` projections, `FocusState` for forms
  - `onChange` variants and debouncing user input
- **Custom environment values**
  - Injecting services, theme, and app configuration via `EnvironmentValues`
- **Interoperability with UIKit**
  - `UIViewRepresentable` and `UIViewControllerRepresentable`
  - Wrapping complex UIKit components (maps, video players, custom editors)
- **Networking and caching**
  - Async/await networking layers with observable state
  - Disk and memory caching strategies, background refresh
- **Exercise**: Build a settings screen with focus-driven forms and a custom environment-injected theme service

### Week 8: Multi-Platform SwiftUI

- **Adaptive design**
  - Size classes, `horizontalSizeClass`, and adaptive layouts
  - `#if os(...)` compilation conditions and shared code organization
- **Platform-specific features**
  - iOS: widgets, Live Activities, Spotlight search
  - macOS: menu bar commands, keyboard shortcuts, window management
  - watchOS: complications and watch-specific navigation
  - visionOS: volumetric scenes, spatial design considerations
- **Sharing code across platforms**
  - Framework targets and Swift Package organization
  - Cross-platform app architecture patterns
- **Exercise**: Extend an existing iOS app to macOS and watchOS, sharing the core model and business logic

### Week 9: Accessibility, Localization, and Production Readiness

- **Accessibility**
  - VoiceOver, dynamic type, and accessibility modifiers
  - Accessibility trees and custom actions
  - Testing with Xcode's Accessibility Inspector
- **Localization**
  - String catalogs, plurals, and right-to-left layouts
  - Formatting dates, numbers, and measurements with `FormatStyle`
- **Testing and CI**
  - Unit testing observable models and SwiftData stores
  - UI testing with XCUITest, snapshot testing
  - Xcode Cloud or GitHub Actions pipelines
- **App Store readiness**
  - Debug vs. release configuration, app thinning, and asset management
- **Exercise**: Audit an existing app for accessibility and localization issues, then add a CI pipeline with unit and UI tests

### Week 10: Capstone Project

- **Project planning**
  - Requirements gathering, information architecture, and data model design
  - Choosing the navigation architecture and platform targets
- **Full application build**
  - SwiftData persistence, advanced navigation, custom layouts
  - Production animations and performance profiling
  - Accessibility and localization passes
- **Quality assurance**
  - Unit, UI, and snapshot test suites
  - Instruments performance validation
- **Final presentation and code review**

## Final Project

The capstone is a production-quality multi-platform SwiftUI application that demonstrates mastery of the advanced concepts covered in the course. Students choose one of the following options or propose their own:

1. **Media Library Manager** — A movie and TV show tracker with SwiftData, custom flow-layout shelves, matched-geometry detail transitions, widgets, and CloudKit sync.
2. **Personal Finance Dashboard** — An expense tracker with charts, custom tab navigation, deep links to specific reports, and macOS menu bar extras.
3. **Health and Fitness Companion** — A workout planner with HealthKit integration, scroll-driven animations, accessibility-first design, and a watchOS companion app.
4. **Collaborative Project Manager** — A task board with drag-and-drop custom layout, real-time updates, keyboard shortcuts on macOS, and offline-first caching.

**Requirements**:
- At least two platform targets (for example, iOS + macOS or iOS + watchOS) sharing a common core
- SwiftData persistence with at least one relationship and a migration strategy
- Typed navigation architecture with deep link support
- At least one custom `Layout` implementation
- Matched geometry or keyframe animations in the main user flow
- Performance profiling evidence showing a fix based on Instruments data
- Full accessibility pass (VoiceOver, dynamic type) and localization for at least two languages
- Minimum 15 unit tests and 8 UI tests

## Assessment Criteria

- **Assignments (40%)**
  - Weekly exercises (9 exercises × 4% each = 36%)
  - Code review participation (4%)
- **Final Project (50%)**
  - Architecture and state management (15%)
  - Feature completeness and technical depth (15%)
  - Performance and code quality (10%)
  - Accessibility, localization, and testing (10%)
- **Participation (10%)**
  - Discussion forum contributions
  - Peer code reviews and documentation quality

## References

- [Apple: SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Apple: Observation Framework](https://developer.apple.com/documentation/observation)
- [Apple: SwiftData Documentation](https://developer.apple.com/documentation/swiftdata)
- [Apple: WWDC Sessions on SwiftUI and SwiftData](https://developer.apple.com/videos/)
- [Hacking with Swift: Advanced SwiftUI](https://www.hackingwithswift.com/quick-start/swiftui)
- [Swift by Sundell](https://www.swiftbysundell.com)
- [Point-Free: SwiftUI and Architecture](https://www.pointfree.co)
- [Kodeco: Advanced SwiftUI Tutorials](https://www.kodeco.com/ios)

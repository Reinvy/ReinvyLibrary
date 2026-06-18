---
title: "Android Development Syllabus"
description: "A structured 12-week curriculum for learning Android app development with Kotlin, from fundamentals to a capstone project."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# Android Development Syllabus

## Overview

This 12-week syllabus provides a comprehensive, project-based curriculum for mastering Android development with Kotlin. It covers the entire modern Android stack: Kotlin language fundamentals, Android Studio tooling, Jetpack Compose UI, data persistence, networking, dependency injection, testing, Firebase integration, performance optimization, and culminates in a capstone project. The curriculum is designed for developers with basic programming experience who want to build production-ready Android applications using current best practices.

## Curriculum

### Week 1: Kotlin Fundamentals
- **Kotlin basics**: val/var, type inference, strings, and basic types
- **Control flow**: if, when, for, while
- **Functions**: named arguments, default parameters, extension functions
- **Object-oriented Kotlin**: classes, inheritance, interfaces, data classes, sealed classes
- **Null safety**: nullable types, safe calls, Elvis operator, non-null assertions
- **Practice**: Build a simple CLI Kotlin application

### Week 2: Android Studio and Gradle
- **Android Studio setup**: SDK manager, AVD manager, emulator configuration
- **Project structure**: manifests, resources, Gradle build files
- **Gradle Kotlin DSL**: plugins, dependencies, product flavors, build types
- **AGP (Android Gradle Plugin)**: configuration, version catalogs
- **Practice**: Create a Hello World app with multiple build variants

### Week 3: Jetpack Compose Fundamentals
- **Compose philosophy**: declarative UI, composable functions, recomposition
- **Basic composables**: Text, Button, Image, TextField, Icon
- **Layout composables**: Column, Row, Box, Scaffold
- **Modifiers**: sizing, padding, alignment, clickable, background, border
- **State in Compose**: remember, mutableStateOf, rememberSaveable
- **Practice**: Build a counter app and a profile card component

### Week 4: Material Design 3 and Theming
- **Material Design 3**: Material You, dynamic colors, typography, shapes
- **Theming**: light/dark color schemes, custom themes
- **Material components**: TopAppBar, NavigationBar, Card, FloatingActionButton, BottomSheet
- **Lists and grids**: LazyColumn, LazyRow, LazyVerticalGrid
- **Practice**: Build a todo list app with Material Design 3 theming

### Week 5: Navigation
- **Navigation Component**: NavHost, NavController, routes
- **Passing arguments**: NavArgs, serializable/parcelable arguments
- **BottomNavigation and NavigationBar**: multi-tab navigation
- **Nested navigation graphs**: modular navigation
- **Deep linking**: intent-based navigation
- **Practice**: Build a multi-screen app with bottom navigation

### Week 6: Data Persistence — Room and DataStore
- **Room database**: Entity, DAO, Database, TypeConverters
- **Room relationships**: one-to-one, one-to-many, many-to-many
- **Migrations**: schema versioning and data migration
- **DataStore Preferences**: key-value storage for settings
- **DataStore Proto**: typed data storage with Protocol Buffers
- **Practice**: Build a note-taking app with Room persistence

### Week 7: Networking and Background Work
- **Retrofit**: setup, interceptors, converters, error handling
- **Kotlin serialization**: kotlinx.serialization with JSON
- **WorkManager**: background tasks, constraints, chaining workers
- **OkHttp**: interceptors, caching, timeouts
- **Chucker**: HTTP inspector for debugging
- **Practice**: Build a weather app fetching data from a public API

### Week 8: Dependency Injection with Hilt
- **DI concepts**: manual DI vs Dagger vs Hilt
- **Hilt setup**: @HiltAndroidApp, @AndroidEntryPoint, @HiltViewModel
- **Modules and providers**: @Module, @Provides, @Binds, @Singleton
- **Qualifiers**: @Named, custom qualifiers
- **ViewModel injection**: @HiltViewModel with SavedStateHandle
- **Practice**: Refactor the weather app to use Hilt DI

### Week 9: Testing
- **Unit testing**: JUnit 5, Mockito, Turbine for Flow testing
- **ViewModel testing**: TestDispatcher, runTest, StateFlow assertion
- **Repository testing**: faking APIs, in-memory Room databases
- **Compose UI testing**: createComposeRule, SemanticsMatchers, onNodeWithText
- **End-to-end testing**: Espresso, Compose Test with Navigation
- **Practice**: Write unit and UI tests for the note-taking app

### Week 10: Firebase Integration
- **Firebase setup**: project configuration, google-services.json
- **Authentication**: email/password, Google Sign-In, anonymous auth
- **Cloud Firestore**: collections, documents, real-time listeners, offline persistence
- **Firebase Cloud Messaging**: push notifications, notification channels
- **Firebase Analytics**: event tracking, user properties
- **Practice**: Add authentication and real-time sync to the todo app

### Week 11: Performance and Optimization
- **Android Profiler**: CPU, memory, network, energy profiling
- **Memory management**: LeakCanary, memory leaks, garbage collection
- **Image loading**: Coil vs Glide, disk caching, placeholder strategies
- **Baseline Profiles**: generating and integrating startup profiles
- **Lazy list optimization**: key, content type, item animations
- **ProGuard/R8**: shrinking, obfuscation, optimization rules
- **Practice**: Profile and optimize the weather app's startup time

### Week 12: Capstone Project
- **Project planning**: requirements, wireframes, architecture design
- **Implementation**: full MVVM + Clean Architecture with Hilt
- **Feature completion**: navigation, data persistence, networking
- **Testing**: unit tests, UI tests, manual QA
- **Play Store deployment**: signed AAB, store listing, staged rollout
- **Presentation**: demo, code review, documentation

## Final Project

Students will build a complete Android application of their choice (e.g., a fitness tracker, expense manager, or recipe book) that demonstrates mastery of the following:

- Jetpack Compose UI with Material Design 3 theming
- Multi-screen navigation with BottomNavigation
- Room database with at least two related entities
- Retrofit networking with a real REST API
- Hilt dependency injection throughout the app
- ViewModel + StateFlow for state management
- Unit tests and Compose UI tests
- Firebase Authentication and Firestore (or equivalent)
- Release build with ProGuard/R8 optimization
- Published as a closed-track alpha on Google Play Console

## Assessment Criteria

- **Assignments (40%)**: 10 weekly coding exercises graded on correctness, code quality, and adherence to best practices (4% each).
- **Quizzes (10%)**: Two online quizzes covering Kotlin syntax, Android architecture, and conceptual knowledge.
- **Final Project (50%)**: Evaluated on:
  - Functionality and completeness (20%)
  - Architecture and code organization (15%)
  - UI/UX design quality (10%)
  - Testing coverage (5%)

## References

- [Android Developers Official Documentation](https://developer.android.com/docs)
- [Kotlin Language Documentation](https://kotlinlang.org/docs/home.html)
- [Jetpack Compose Docs](https://developer.android.com/jetpack/compose)
- [Material Design 3 Guidelines](https://m3.material.io/)
- [Google Codelabs for Android](https://codelabs.developers.google.com/?cat=android)
- [Android Architecture Guide](https://developer.android.com/topic/architecture)

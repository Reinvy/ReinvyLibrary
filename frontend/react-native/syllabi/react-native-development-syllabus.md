---
title: "React Native Development Syllabus"
description: "A comprehensive 12-week curriculum covering React Native from fundamentals to production deployment, including state management, navigation, native modules, and app store publication."
category: "frontend"
technology: "react-native"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# React Native Development Syllabus

## Overview

This 12-week syllabus is designed for developers who want to master React Native for cross-platform mobile application development. Starting from environment setup and core concepts, the curriculum progresses through navigation, state management, native device APIs, performance optimization, testing, and concludes with a capstone project published to app stores. Each module combines theoretical foundations with hands-on coding exercises and real-world project work.

By the end of this course, learners will be able to build, test, debug, and deploy production-quality iOS and Android applications using React Native.

## Curriculum

### Module 1: Environment Setup and Core Concepts (Week 1)
- **React Native overview and ecosystem**
  - Comparison with Flutter, SwiftUI, Jetpack Compose
  - When to choose React Native vs. other frameworks
- **Development environment setup**
  - Node.js, Watchman, Ruby (for CocoaPods)
  - React Native CLI vs. Expo managed workflow
  - Android Studio (AVD) and Xcode configuration
- **Project scaffolding**
  - `npx react-native init` vs. `npx create-expo-app`
  - Understanding the project structure
  - Metro bundler fundamentals
- **First app: Hello World on device and simulator**
  - Running on iOS Simulator and Android Emulator
  - Using Expo Go for rapid prototyping

### Module 2: React Native Fundamentals (Week 2)
- **Core components deep dive**
  - View, Text, ScrollView, FlatList, SectionList
  - TextInput, TouchableOpacity, Pressable
  - Image, ActivityIndicator, Modal
- **Styling in React Native**
  - Flexbox layout system
  - StyleSheet API and inline styles
  - Responsive design with Dimensions and useWindowDimensions
- **Platform-specific code**
  - Platform module (iOS vs. Android)
  - `.ios.js` and `.android.js` file extensions
- **Debugging fundamentals**
  - React Native DevTools (Flipper, React DevTools)
  - Console logging and Chrome Debugger

### Module 3: Navigation and Routing (Week 3)
- **React Navigation library**
  - Stack Navigator (native stack vs. JS stack)
  - Tab Navigator (bottom tabs, material tabs)
  - Drawer Navigator
- **Navigation patterns**
  - Passing parameters between screens
  - Deep linking configuration
  - Authentication flow (conditional navigation)
- **Header customization**
  - Screen-specific headers
  - Custom header buttons and styling

### Module 4: State Management (Week 4)
- **Local state with useState and useReducer**
- **Context API for global state**
  - Creating and consuming contexts
  - Context with useReducer pattern
- **Third-party state management**
  - Zustand for lightweight state
  - Redux Toolkit for complex applications
  - MobX State Tree overview
- **Persisting state**
  - AsyncStorage and MMKV
  - Secure storage with react-native-keychain

### Module 5: Networking and Data (Week 5)
- **HTTP requests with fetch and Axios**
  - REST API integration patterns
  - Error handling and loading states
- **GraphQL with Apollo Client**
  - Queries, mutations, subscriptions
- **Real-time data**
  - WebSocket integration
  - Firebase Realtime Database and Firestore
- **Offline-first architecture**
  - NetInfo for connectivity detection
  - Local caching strategies with React Query

### Module 6: Native Device APIs (Week 6)
- **Camera and image handling**
  - react-native-image-picker and react-native-camera
  - Image manipulation and compression
- **Location and maps**
  - react-native-maps (Google Maps, Apple Maps)
  - Geolocation API and background location
- **Device sensors**
  - Accelerometer, gyroscope, magnetometer (expo-sensors)
- **Notifications**
  - Push notifications (Firebase Cloud Messaging, APNs)
  - Local notifications with notifee

### Module 7: Native Modules and Bridging (Week 7)
- **Understanding the bridge architecture**
  - JavaScript thread vs. native thread
  - The JSON serialization bottleneck
- **Writing custom native modules (Android)**
  - Creating a native Toast module
  - Exposing methods to JavaScript
- **Writing custom native modules (iOS)**
  - Objective-C and Swift bridging
  - RCT_EXPORT_MODULE and RCT_EXPORT_METHOD
- **Turbo Modules (New Architecture)**
  - JSI (JavaScript Interface) introduction
  - Fabric renderer and synchronous native calls

### Module 8: Performance Optimization (Week 8)
- **Rendering performance**
  - FlatList optimization (getItemLayout, windowSize, removeClippedSubviews)
  - Avoiding unnecessary re-renders (React.memo, useMemo, useCallback)
  - InteractionManager and runAfterInteractions
- **Image optimization**
  - react-native-fast-image for cached images
  - Responsive image loading strategies
- **Memory management**
  - Profiling with Flipper and Instruments
  - Detecting and fixing memory leaks
- **Bundle size optimization**
  - Metro bundler configuration
  - Code splitting and lazy loading
  - Hermes engine (JavaScript engine for Android)

### Module 9: Testing (Week 9)
- **Unit testing**
  - Jest setup and configuration
  - Testing components with React Native Testing Library
  - Mocking native modules
- **Integration testing**
  - Testing navigation flows
  - State management integration tests
- **End-to-end testing**
  - Detox setup (iOS and Android)
  - Writing E2E test scenarios
- **Continuous Integration**
  - GitHub Actions for React Native
  - Running tests on CI (with Android emulator and iOS simulator)

### Module 10: Animations (Week 10)
- **Animated API**
  - Animated.timing, Animated.spring, Animated.decay
  - Interpolation and transformations
  - Animated.event for gesture-driven animations
- **Reanimated 2/3**
  - Worklets and the UI thread
  - Shared values, animations, and transitions
  - Layout animations
- **Gesture handling**
  - React Native Gesture Handler library
  - Pan, pinch, rotation, and Fling gestures
  - Composing gestures

### Module 11: Production Readiness and Deployment (Week 11)
- **App icon and splash screen**
  - Generating icons for all resolutions
  - Animated splash screens
- **Code signing and certificates**
  - iOS: Apple Developer Program, provisioning profiles
  - Android: Keystore generation and Google Play signing
- **App Store distribution**
  - Apple App Store Connect submission
  - Google Play Console publishing
  - TestFlight and internal testing tracks
- **Over-the-air updates**
  - CodePush (Microsoft App Center)
  - Expo Updates (EAS Update)
- **Analytics and crash reporting**
  - Firebase Crashlytics
  - Sentry integration

### Module 12: Capstone Project (Week 12)
- **Project planning and architecture design**
  - Component tree and navigation structure
  - State management architecture
  - API design and database schema
- **Implementation**
  - All hands-on development
  - Pair programming and code review sessions
- **Testing and quality assurance**
  - Comprehensive test coverage
  - Manual QA on physical devices
  - Performance profiling
- **Deployment**
  - App store submission (iOS App Store and/or Google Play)
  - Post-launch monitoring

## Final Project

Learners will build a **full-stack social recipe sharing app** called "RecipeShare" — a complete mobile application where users can create, share, discover, and save recipes. The project must include the following features:

- **User authentication**: Email and social login (Google, Apple)
- **Profile management**: User profiles with avatars, bio, and recipe collections
- **Recipe CRUD**: Create, edit, delete recipes with photos, ingredient lists, and step-by-step instructions
- **Social features**: Like, comment, follow, and share functionality
- **Search and discovery**: Full-text recipe search with filters (cuisine, dietary restrictions, cooking time)
- **Offline support**: Read cached recipes and save favorites offline
- **Push notifications**: Recipe suggestions and social interaction alerts
- **Animations**: Smooth transitions and micro-interactions throughout the app
- **Publication**: The app must be successfully published on at least one app store (TestFlight accepted)

## Assessment Criteria

- **Assignments (40%)**: Weekly coding exercises and quizzes
  - Module 1-4: Quick-start projects and comprehension quizzes
  - Module 5-7: API integration and native module assignments
  - Module 8-10: Performance optimization and animation tasks
  - Module 11: App store submission checklist completion

- **Midterm Project (20%)**: A smaller standalone React Native app
  - Must use navigation, state management, and at least two device APIs
  - Submission with source code and documentation
  - Evaluated on code quality, architecture, and functionality

- **Final Capstone Project (40%)**
  - Functionality and feature completeness (30%)
  - Code quality, architecture, and testing coverage (25%)
  - UI/UX design and animations (20%)
  - Performance optimization (10%)
  - App store publication proof (15%)

## References

- [React Native Official Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Reanimated 3 Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [Firebase for React Native](https://rnfirebase.io/)
- [Detox E2E Testing](https://wix.github.io/Detox/)
- [The React Native Blog](https://reactnative.dev/blog/)
- "React Native in Action" by Nader Dabit (Manning Publications)
- "Fullstack React Native" by Devin Abbott and Houssein Djirdeh

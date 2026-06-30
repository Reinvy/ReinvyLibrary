---
title: "iOS Development Syllabus"
description: "A comprehensive 12-week curriculum for learning iOS native development with Swift, covering fundamentals through to capstone project."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "syllabus"
locale: "en"
---

# iOS Development Syllabus

## Overview

This 12-week syllabus provides a structured pathway for learning iOS native development with Swift. It is designed for learners with basic programming experience who want to become proficient iOS developers. The curriculum progresses from Swift fundamentals and Xcode IDE mastery through UIKit and SwiftUI, networking, data persistence, concurrency, and culminates in a capstone project that demonstrates all acquired skills.

**Duration**: 12 weeks (recommended: 10–15 hours per week)
**Prerequisites**: Basic programming knowledge (variables, loops, functions)
**Delivery**: Self-paced with project-based assessments

## Curriculum

### Week 1: Swift Fundamentals

- **Swift syntax basics**
  - Variables, constants, and data types
  - Type inference and type safety
  - String interpolation
- **Control flow**
  - if/else, switch statements
  - for-in, while loops
- **Collections**
  - Arrays, dictionaries, sets
- **Functions**
  - Function parameters and return values
  - Argument labels and default values
- **Mini-project**: Command-line calculator

### Week 2: Xcode IDE and Project Setup

- **Xcode interface overview**
  - Navigator, editor, utility areas
  - Scheme and build configuration
- **Project templates**
  - Single view, SwiftUI, game templates
- **Interface Builder basics**
  - Storyboards and XIB files
  - Outlets and actions
- **Simulator and device management**
- **Git integration in Xcode**
- **Mini-project**: Hello World app with a storyboard

### Week 3: UIKit Basics

- **UIView and UIViewController lifecycle**
  - viewDidLoad, viewWillAppear, viewDidAppear
- **Common UI components**
  - UILabel, UIButton, UITextField, UIImageView
- **Target-action pattern**
- **MVC architecture in iOS**
- **Debugging in Xcode**
  - Breakpoints, LLDB console
- **Mini-project**: Login screen with storyboard

### Week 4: Auto Layout and Responsive Design

- **Auto Layout fundamentals**
  - Constraints and intrinsic content size
  - Safe area guides and layout margins
- **NSLayoutConstraint programmatically**
- **UIStackView**
  - Horizontal and vertical stacks
  - Distribution and alignment
- **Size classes and trait collections**
- **Adaptive layout for different screen sizes**
- **Mini-project**: Responsive profile card

### Week 5: Navigation and Tab Bars

- **UINavigationController**
  - Push and pop view controllers
  - Navigation bar customization
- **UITabBarController**
  - Tab bar with multiple view controllers
- **Segues and storyboard references**
- **Modal presentation**
- **Container view controllers**
- **Mini-project**: Multi-screen settings app

### Week 6: TableView and CollectionView

- **UITableView fundamentals**
  - DataSource and Delegate pattern
  - Cell reuse and dequeuing
- **Custom UITableViewCell**
- **UICollectionView**
  - Flow layout and compositional layout
- **Diffable data sources**
- **Pull-to-refresh and infinite scrolling**
- **Mini-project**: News feed app with articles

### Week 7: Networking and APIs

- **URLSession basics**
  - Data tasks, download tasks
- **JSON parsing with Codable**
- **REST API consumption**
  - GET, POST, PUT, DELETE
- **Error handling in networking**
- **Async/await for network calls**
- **Mini-project**: Weather app with live API

### Week 8: CoreData and Data Persistence

- **CoreData stack setup**
  - NSPersistentContainer, managed context
- **CRUD operations**
  - Create, read, update, delete
- **NSFetchRequest and predicates**
- **CoreData with UITableView**
- **UserDefaults for simple preferences**
- **FileManager for document storage**
- **Mini-project**: To-do list app with persistence

### Week 9: SwiftUI Basics

- **Declarative syntax overview**
  - View protocol, @State, @Binding
- **Common SwiftUI views**
  - Text, Image, Button, List, Form
- **Layout containers**
  - VStack, HStack, ZStack
- **Modifiers and view composition**
- **SwiftUI previews**
- **Mini-project**: Profile screen with SwiftUI

### Week 10: Concurrency (async/await)

- **Swift concurrency model**
  - Async functions and await
- **Task and TaskGroup**
- **Actors for data isolation**
- **MainActor for UI updates**
- **Bridging completion handlers to async/await**
- **Mini-project**: Parallel image downloader

### Week 11: App Lifecycle and Advanced Topics

- **App lifecycle states**
  - Not running, foreground, background, suspended
- **SceneDelegate and AppDelegate**
- **Push notifications (basic setup)**
- **App extensions overview**
  - Widgets, share extensions
- **Accessibility in iOS**
- **Internationalization and localization**
- **Mini-project**: Widget extension for the to-do app

### Week 12: Capstone Project

- **Project planning and design**
  - User stories, wireframes, data model
- **Full-stack iOS app development**
  - Frontend: SwiftUI or UIKit
  - Backend: REST API integration
  - Data: CoreData/SwiftData caching
- **Testing basics**
  - Unit tests with XCTest
  - UI tests with XCUITest
- **App Store preparation**
  - App icons, screenshots, metadata
- **Final presentation and code review**

## Final Project

The capstone project is a full-featured iOS application that demonstrates mastery of all concepts covered in the course. Students choose from the following options or propose their own:

1. **Social Media Feed App** — Posts, likes, comments with CoreData caching and push notifications.
2. **E-Commerce Product Browser** — Product listings, cart, checkout flow with REST API integration.
3. **Fitness Tracker** — Workout logging, goal tracking, HealthKit integration, and data visualization.
4. **Recipe Manager** — Create, edit, search recipes with image support and cloud sync.

**Requirements**:
- Minimum 4 screens with navigation.
- Network integration with at least one REST API.
- Local data persistence (CoreData or SwiftData).
- At least 10 unit tests and 5 UI tests.
- Proper error handling and loading states.
- Accessibility support (dynamic type, VoiceOver).

## Assessment Criteria

- **Assignments (40%)**
  - Weekly mini-projects (10 projects × 3% each = 30%)
  - Code review participation (10%)
- **Final Project (50%)**
  - Functionality and completeness (15%)
  - Code quality and architecture (15%)
  - Testing coverage and quality (10%)
  - UI/UX design and polish (10%)
- **Participation (10%)**
  - Discussion forum contributions
  - Peer code reviews
  - Documentation and README quality

## References

- [Apple Official Swift Documentation](https://docs.swift.org/swift-book/)
- [Apple Developer Documentation: UIKit](https://developer.apple.com/documentation/uikit)
- [Apple Developer Documentation: SwiftUI](https://developer.apple.com/documentation/swiftui)
- [Hacking with Swift](https://www.hackingwithswift.com)
- [Ray Wenderlich (Kodeco) iOS Tutorials](https://www.kodeco.com/ios)
- [Swift by Sundell](https://www.swiftbysundell.com)
- [CS193p Stanford Course (YouTube)](https://www.youtube.com/playlist?list=PLpGHT1n4-mAsxuRxVPv7kj4-dQYoC3VVu)

---
title: "Building a Habit Tracker App with SwiftUI"
description: "Build a habit tracker in SwiftUI: SwiftData models, idempotent check-ins, testable streak logic, local reminders, Swift Charts progress, and CloudKit sync."
category: "mobile"
technology: "swift"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Habit Tracker App with SwiftUI

## Summary

This tutorial builds a habit tracker for iOS with SwiftUI and SwiftData: two models, an idempotent check-in path, pure streak math, per-habit reminders, and a Swift Charts summary that stays in sync with the data.

## Target Audience

- iOS developers who know SwiftUI basics and want a persistence-backed app rather than another to-do list.
- Intermediate level: comfortable with property wrappers, `async/await`, and Xcode previews.

## Prerequisites

- Xcode 15 or later, targeting iOS 17+ (SwiftData requires the iOS 17 SDK).
- Working knowledge of Swift structs, closures, and `@State` / `@Environment`.

## Learning Objectives

- Define SwiftData models with a cascade relationship that survives a CloudKit schema.
- Keep streak logic in a pure struct so it is testable without a database.
- Toggle day completions idempotently and persist them safely.
- Schedule one repeating reminder per habit and chart the last seven days.

## Context and Motivation

Habit trackers look trivial until three requirements appear: a completion must be idempotent per calendar day, a streak must survive midnight and timezone changes, and progress must be legible without opening each habit. Each is a data-modelling decision, not a drawing one. SwiftData supplies the relationship, Swift Charts supplies the glance, and a pure `StreakCalculator` supplies the testability.

## Core Content

### Modelling habits and completions

A `Habit` owns a cascade list of `Completion` rows, and each row stores a day already normalized with `startOfDay`, so comparisons never depend on the time of day the user tapped.

### Computing streaks

The streak is the run of consecutive completed days ending today, or ending yesterday so the number does not reset at midnight before a morning check-in. Keep it pure: a `Set<Date>`, an injected `Calendar`, and an explicit `asOf` date.

### Scheduling reminders

A repeating `UNCalendarNotificationTrigger` with one stable identifier per habit means editing a reminder replaces the pending request instead of stacking duplicates.

### Visualizing progress

Build the chart input from the completions themselves; a stored counter is duplicate state and drifts the first time a cascade delete runs.

### Syncing with iCloud

CloudKit needs a `ModelConfiguration` flag plus an entitlement, and it forbids unique constraints: every stored property needs a default and relationships must be optional.

## Code Examples

Models, streak math, and the single write path:

```swift
import SwiftData

@Model
final class Habit {
    var title: String = ""
    @Relationship(deleteRule: .cascade, inverse: \Completion.habit)
    var completions: [Completion] = []
}

@Model
final class Completion {
    var day: Date = Date()
    var habit: Habit?
}

struct StreakCalculator {
    var calendar: Calendar = .current

    func currentStreak(days: Set<Date>, asOf today: Date = .now) -> Int {
        var streak = 0
        var cursor = calendar.startOfDay(for: today)
        if !days.contains(cursor), let yesterday = calendar.date(byAdding: .day, value: -1, to: cursor) {
            cursor = yesterday
        }
        while days.contains(cursor) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = calendar.startOfDay(for: previous)
        }
        return streak
    }
}

extension Habit {
    func toggle(on date: Date = Date(), in context: ModelContext) throws {
        let day = Calendar.current.startOfDay(for: date)
        if let existing = completions.first(where: { $0.day == day }) {
            context.delete(existing)
        } else {
            let entry = Completion()
            entry.day = day
            entry.habit = self
            context.insert(entry)
        }
        do { try context.save() } catch { context.rollback(); throw error }
    }
}
```

```swift
import UserNotifications

func scheduleReminder(habitID: UUID, title: String, hour: Int) async throws {
    let id = "habit-\(habitID.uuidString)"
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [id])
    let content = UNMutableNotificationContent()
    content.title = "Time for \(title)"
    let trigger = UNCalendarNotificationTrigger(
        dateMatching: DateComponents(hour: hour), repeats: true)
    try await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
}
```

```swift
import SwiftUI
import Charts

struct DayStat: Identifiable {
    let id: Date
    let count: Int
}

struct WeeklyProgressChart: View {
    let stats: [DayStat]

    var body: some View {
        Chart(stats) { stat in
            BarMark(x: .value("Day", stat.id, unit: .day), y: .value("Done", stat.count))
        }
    }
}
```

```swift
func testStreakEndingYesterday() {
    let today = Date(timeIntervalSince1970: 1_772_000_000)
    let days = Set([-1, -2, -3].map { today.addingTimeInterval(86_400 * Double($0)) })
    XCTAssertEqual(StreakCalculator().currentStreak(days: days, asOf: today), 3)
}
```

## Key Insights

- Normalize completions to `startOfDay` at write time; comparing raw timestamps makes "same day" checks timezone-dependent.
- Keep `Date()` and `Calendar.current` out of the streak function and inject them, or tests break across DST boundaries.
- CloudKit forbids unique constraints, so deduplicate in code as the toggle does rather than adding `@Attribute(.unique)`.

## Next Steps

- Add a heat-map calendar built from the same `DayStat` pipeline.
- Expose today's streak through WidgetKit and an App Intent.

## Conclusion

You now have a habit tracker with a real data layer: two SwiftData models with a cascade relationship, an idempotent toggle, a pure and tested streak function, one repeating reminder per habit, and a CloudKit-ready schema. The structural lesson matters more than the screens — logic outside the views can be tested, reused in a widget, and migrated to sync without a rewrite.

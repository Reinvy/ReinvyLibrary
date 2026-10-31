---
title: "Swift Background Tasks: BGTaskScheduler, Background URLSession, and Smart Execution"
description: "An advanced tutorial on building reliable background execution for iOS apps with BGTaskScheduler, background URLSession, app lifecycle state management, and battery-aware scheduling."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Swift Background Tasks: BGTaskScheduler, Background URLSession, and Smart Execution

## Summary

This tutorial teaches you how to run work reliably when your iOS app is not in the foreground. You will learn the iOS app lifecycle, the two BGTaskScheduler task classes, background URLSession for large transfers, and the practical patterns — deadline handling, power-aware scheduling, and testing with the debugger — that keep background work correct and battery-friendly. The final project ties everything together in a complete cache-refresh + upload pipeline.

## Target Audience

- iOS developers who have already shipped or are building apps that need periodic data refresh, uploads, or media downloads.
- Expected developer level: Advanced — you should be comfortable with Swift concurrency (`async/await`), `URLSession`, and the `UIKit`/`SwiftUI` app lifecycle.

## Prerequisites

- Xcode 15 or newer with a physical iPhone for testing (background modes do not run reliably in the Simulator).
- A paid Apple Developer account to enable the Background Modes capability and test the real scheduling behavior.
- Working knowledge of Swift concurrency, `async/await`, `Task`, and `URLSession`.
- An understanding of the `UIApplicationDelegate` / `@UIApplicationDelegateAdaptor` lifecycle callbacks.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain the iOS application states and which execution modes iOS grants to background work.
- Register, configure, and implement `BGAppRefreshTask` and `BGProcessingTask` handlers correctly.
- Run large downloads through a background `URLSession` that survives app suspension.
- Handle task deadlines, expiration handlers, and cancellation without corrupting state.
- Schedule power-aware background work and test it with the `BGTaskScheduler` debugger commands.
- Diagnose common failures: unregistered identifiers, missing Info.plist permissions, and tasks that never fire.

## Context and Motivation

Users expect apps to feel instant, but the data they need often changes while the app is closed — news feeds, offline maps, queued photo uploads, or a video download that should finish overnight. Running that work in the foreground drains battery and harms the user experience; running it naively in the background gets your app killed.

iOS solves this with a strict background execution contract. The system decides *when* your app may run, based on device conditions, battery level, and the user's usage patterns. Apps that respect the contract get scheduled reliably; apps that try to keep themselves alive with silent tricks get suspended, terminated, or rejected in review. This tutorial teaches you to work *with* the contract — the difference between a scheduler that fires at 02:00 and one that never fires at all is almost always a small configuration or API mistake.

## Core Content

### The iOS App Lifecycle and Background State

An iOS app moves through five states: `Not Running`, `Inactive`, `Active`, `Background`, and `Suspended`. The `Background` state is a short window — usually seconds — granted when the user leaves the app or an event wakes it. In this state you get time to:

- Finish in-flight work and save state.
- Respond to a launched background task (via `BGTaskScheduler`).
- Continue an in-progress background `URLSession` transfer.
- React to push notifications, location events, or background audio (when the matching background mode is enabled).

When your time expires, UIKit calls `applicationDidEnterBackground`, and shortly after, the app is suspended: code stops executing, timers stop, and the process is frozen. The only ways to run code later are the ones this tutorial covers — you cannot use `Timer` or `DispatchQueue.asyncAfter` to "wake yourself up".

### BGTaskScheduler: The Two Task Classes

`BGTaskScheduler` (introduced in iOS 13) manages two kinds of work:

| Task class | Best for | Frequency | Conditions |
|------------|----------|-----------|------------|
| `BGAppRefreshTask` | Small, quick refreshes (fetch new data, badge updates) | The system decides, roughly a handful of times per day | Opportunistic; runs when the device is in use or on Wi-Fi, often bundled with app launches |
| `BGProcessingTask` | Heavy work (uploads, media processing, database maintenance, large downloads) | Much less frequent — often once a day or less | Typically requires the device on power and on Wi-Fi; can take minutes |

Both are scheduled *in advance* by calling `submit(_:)`. When the system decides the moment is right, it launches your app in the background and invokes the handler you registered for that identifier. A handler must:

1. Take the task and immediately extract its expiration handler (an `AsyncTask`/`BGTask` exposes `expirationHandler`).
2. Perform the work, or spawn a `Task` for it with the handler waiting.
3. Call `task.setTaskCompleted(success:)` when finished — or let the expiration handler run if time runs out.

A task that never calls `setTaskCompleted` burns the budget, and the system may classify the app as misbehaving.

### Setting Up the Background Modes Capability

Background task identifiers live in `Info.plist` under `BGTaskSchedulerPermittedIdentifiers`, and the capability itself must be enabled in the target's Signing & Capabilities tab:

```text
Capability: Background Modes
  ✓ Background fetch (enables BGAppRefreshTask scheduling)
  ✓ Background processing (enables BGProcessingTask scheduling)
```

The plist entries must match the identifiers exactly:

```xml
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.example.myapp.refresh</string>
    <string>com.example.myapp.upload</string>
</array>
```

A mismatch between the registered identifier and the plist entry is the single most common reason a task "never fires". The system silently ignores identifiers it does not recognize.

### Launch-Time Registration

Register handlers early — in `application(_:didFinishLaunchingWithOptions:)` — so a background launch has its handlers ready before the system delivers the task:

```swift
import UIKit
import BackgroundTasks

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.example.myapp.refresh",
            using: nil
        ) { task in
            self.handleAppRefresh(task: task as! BGAppRefreshTask)
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.example.myapp.upload",
            using: nil
        ) { task in
            self.handleProcessing(task: task as! BGProcessingTask)
        }

        return true
    }
}
```

### Implementing an App Refresh Task

A refresh task is short — treat it as a tighter, more constrained cousin of `application(_:performFetchWithCompletionHandler:)`. Schedule the *next* refresh before the work finishes, so there is always a pending request in the scheduler:

```swift
func handleAppRefresh(task: BGAppRefreshTask) {
    // 1. Capture the expiration handler up front.
    let expiration = task.expirationHandler
    // 2. Schedule the next refresh immediately (early submission, see below).
    scheduleAppRefresh()

    let operation = Task { @MainActor in
        do {
            try await FeedStore.shared.refresh()
            task.setTaskCompleted(success: true)
        } catch {
            task.setTaskCompleted(success: false)
        }
    }

    // 3. If the system reclaims time, cancel the in-flight work.
    task.expirationHandler = {
        operation.cancel()
        expiration?()
    }
}
```

Key points:

- `scheduleAppRefresh()` is called *inside* the handler, not after it completes. If a handler finishes without submitting a new request, the app loses its slot in the scheduler's queue.
- The expiration handler must cancel the ongoing `Task` — otherwise the app keeps working past its budget and is terminated mid-write, risking corrupted state.
- Any state written during the task must be written atomically or be idempotent, because an expiration can cut the work at any byte.

### Implementing a Processing Task

Processing tasks can run for minutes on power + Wi-Fi, but the same discipline applies — and the stakes are higher because the system's patience is not unlimited:

```swift
func handleProcessing(task: BGProcessingTask) {
    let expiration = task.expirationHandler

    // Re-schedule for another night before doing the heavy work.
    scheduleProcessingTask()

    let operation = Task {
        do {
            try await MediaUploader.shared.drainQueue()
            try await VideoDownloader.shared.resumePending()
            task.setTaskCompleted(success: true)
        } catch {
            task.setTaskCompleted(success: false)
        }
    }

    task.expirationHandler = {
        operation.cancel()
        expiration?()
    }
}
```

Real-world guardrails you should add:

- Check `ProcessInfo.processInfo.isLowPowerModeEnabled` and skip heavy work entirely when it is on — the user opted into battery savings, and the task will simply be re-scheduled for a later window.
- Split long work into checkpoints. If your upload queue has 400 items, persist a cursor after every batch of 25, so an expired run resumes where it stopped instead of restarting.
- Use `NSProgress` or a progress callback to observe progress; the system can use it to make smarter scheduling decisions on newer OS versions.

### Background URLSession: Downloads That Survive Suspension

A `BGAppRefreshTask` is for quick work, but a 2 GB media download cannot fit in any single task window. For that, iOS provides background *transfers*: a `URLSession` configured with a background identifier that the system continues even when your app is suspended or terminated.

```swift
import Foundation

final class DownloadManager: NSObject, URLSessionDownloadDelegate {

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.background(withIdentifier: "com.example.myapp.downloads")
        config.sessionSendsLaunchEvents = true
        config.isDiscretionary = true           // let the system wait for power + Wi-Fi
        config.waitsForConnectivity = true      // queue instead of failing on flaky networks
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()

    func enqueue(_ url: URL) {
        let request = URLRequest(url: url)
        let task = session.downloadTask(with: request)
        task.resume()
    }

    func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didFinishDownloadingTo location: URL
    ) {
        // Move the file out of the temporary location IMMEDIATELY — it will be
        // deleted when the callback returns.
        let destination = FileManager.default
            .temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".mp4")
        try? FileManager.default.moveItem(at: location, to: destination)
        // Then hand off to your storage layer and persist metadata.
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        if let error = error {
            handle(error) // network failure, insufficient storage, etc.
        }
    }
}
```

Important rules for background transfers:

- When the transfer finishes (or fails), the system relaunches your app *in the background* and calls `application(_:handleEventsForBackgroundURLSession:completionHandler:)` on the app delegate. You must retain the completion handler until the session's delegate finishes all callbacks:

```swift
func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
) {
    // Recreate the SAME session configuration (same identifier) so the
    // system reconnects the app to the in-flight transfer.
    backgroundSessionCompletionHandler = completionHandler
    _ = DownloadManager.shared.session
}
```

- Call the stored completion handler in `urlSessionDidFinishEvents(forBackgroundURLSession:)`; the app is terminated if it is not called in time.

### Scheduling and Submitting Work

Submission always goes through the shared `BGTaskScheduler`:

```swift
func scheduleAppRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "com.example.myapp.refresh")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // no sooner than 15 min
    do {
        try BGTaskScheduler.shared.submit(request)
    } catch {
        // BGError: .tooManyPendingTaskRequests, .notPermitted, .unavailable, ...
        print("Submit failed: \(error)")
    }
}

func scheduleProcessingTask() {
    let request = BGProcessingTaskRequest(identifier: "com.example.myapp.upload")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60)
    request.requiresNetworkConnectivity = true
    request.requiresExternalPower = true
    do {
        try BGTaskScheduler.shared.submit(request)
    } catch {
        print("Submit failed: \(error)")
    }
}
```

`earliestBeginDate` is a *hint* — the system is never obligated to run your task early, only to not run it before then. Treat it as "don't run before X", never as "run at X". The more discretionary flags you set, the more scheduling freedom the system has, and the more reliably your task eventually runs.

### Testing Background Tasks in Development

Real scheduling times are impossible to wait for in a development loop. Xcode ships a debugger hook that triggers tasks immediately:

```bash
# Launch the app with the background task debugger enabled:
e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.example.myapp.refresh"]

# And to simulate an immediate expiration:
e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateExpirationForTaskWithIdentifier:@"com.example.myapp.refresh"]
```

Run these in LLDB while the app is suspended. Notes:

- These private APIs work in debug builds only; remove them from release code.
- Test on a physical device — in the Simulator, the scheduler does not perform launches the way it does on hardware.
- Watch for the `_simulateLaunchForTaskWithIdentifier:` call to trigger your registered handler, then confirm `setTaskCompleted` is invoked by checking the console.

### Common Pitfalls

- **Identifier mismatch**: `register(forTaskWithIdentifier:)`, `BGTaskSchedulerPermittedIdentifiers`, and the `BGTaskSchedulerRequest` must all use identical strings. Copy-paste them from one constant.
- **Forgetting to reschedule**: a handler that never submits the next request causes the app to drop out of the schedule entirely.
- **Leaking the expiration handler**: capture it first, then overwrite `task.expirationHandler` with your own wrapper. If you never overwrite it, the default expiration cancels the task silently and your cleanup code never runs.
- **Expensive work in `sceneDidEnterBackground`**: this callback runs *before* suspension but does not buy you much time; background tasks belong in dedicated handlers, not lifecycle callbacks.
- **Calling completion handlers twice**: for background sessions, the `handleEventsForBackgroundURLSession` completion must be called exactly once, after the last delegate callback.
- **Battery-hostile behavior**: discarding `isDiscretionary` and `requiresExternalPower` makes transfers run in unfavorable conditions, which the system punishes with increasingly rare scheduling slots.

## Code Examples

### A Complete Cache-Refresh + Upload Pipeline

The following app ties together both task classes and a background session in one realistic pipeline. It refreshes a JSON feed every refresh window and drains a photo-upload queue during processing windows.

```swift
import UIKit
import BackgroundTasks

struct AppConfiguration {
    static let refreshID = "com.example.myapp.refresh"
    static let uploadID = "com.example.myapp.upload"
    static let sessionID = "com.example.myapp.uploads"
}

final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: AppConfiguration.refreshID,
            using: nil
        ) { task in
            self.handleRefresh(task: task as! BGAppRefreshTask)
        }

        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: AppConfiguration.uploadID,
            using: nil
        ) { task in
            self.handleUpload(task: task as! BGProcessingTask)
        }

        return true
    }

    private func handleRefresh(task: BGAppRefreshTask) {
        let originalExpiration = task.expirationHandler
        Self.scheduleRefresh()

        let work = Task {
            do {
                try await FeedStore.shared.refresh()
                task.setTaskCompleted(success: true)
            } catch {
                task.setTaskCompleted(success: false)
            }
        }

        task.expirationHandler = {
            work.cancel()
            originalExpiration?()
        }
    }

    private func handleUpload(task: BGProcessingTask) {
        let originalExpiration = task.expirationHandler
        Self.scheduleUpload()

        let work = Task {
            // Checkpointed drain: the queue persists a cursor every batch.
            do {
                try await UploadQueue.shared.drainBatchIfNeeded()
                task.setTaskCompleted(success: true)
            } catch {
                task.setTaskCompleted(success: false)
            }
        }

        task.expirationHandler = {
            work.cancel()
            originalExpiration?()
        }
    }

    static func scheduleRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: AppConfiguration.refreshID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    static func scheduleUpload() {
        let request = BGProcessingTaskRequest(identifier: AppConfiguration.uploadID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = true
        try? BGTaskScheduler.shared.submit(request)
    }
}
```

### A Background Session Backed by an Actor

A common bug is sharing a `URLSession` across threads. An actor that owns the session serializes access and keeps delegate callbacks race-free:

```swift
actor DownloadCoordinator: URLSessionDownloadDelegate {

    nonisolated private lazy var session: URLSession = {
        let config = URLSessionConfiguration.background(withIdentifier: "com.example.myapp.downloads")
        config.isDiscretionary = true
        config.waitsForConnectivity = true
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()

    var pendingCompletion: (() -> Void)?

    func enqueue(url: URL) {
        session.downloadTask(with: URLRequest(url: url)).resume()
    }

    nonisolated func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didFinishDownloadingTo location: URL
    ) {
        // Nonisolated delegate callback — hand the file path to the actor.
        let destination = Self.persist(location: location)
        Task { await self.record(destination: destination, task: downloadTask) }
    }

    nonisolated func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        Task { await self.issueCompletion() }
    }

    private func record(destination: URL, task: URLSessionDownloadTask) {
        // Update the app's library metadata.
    }

    private func issueCompletion() {
        pendingCompletion?()
        pendingCompletion = nil
    }

    private static func persist(location: URL) -> URL {
        let dest = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
        try? FileManager.default.moveItem(at: location, to: dest)
        return dest
    }
}
```

### Verifying the Schedule at Runtime

Add a small debug screen that prints what the scheduler has pending, so you can confirm your resubmission logic actually registered a new request:

```swift
func pendingTaskStatus() async {
    let pending = await BGTaskScheduler.shared.pendingTaskRequests()
    for request in pending {
        print("Pending: \(request.identifier)")
    }
}
```

## Key Insights

- **Schedule early, schedule always**: submit the *next* request at the start of each handler. The scheduler holds no memory of your app between launches, and a handler that does not resubmit silently removes the app from future windows.
- **The expiration handler is your only safety net**: capture the original, wrap it, and cancel your in-flight `Task` inside it. Skipping this means work continues past the budget and the app is killed mid-write.
- **Background sessions are for transfers, tasks are for work**: `BGAppRefreshTask`/`BGProcessingTask` run *code*; background `URLSession` moves *data*. Combine them: use a processing task to resume pending downloads, and let the session carry the transfer.
- **`earliestBeginDate` is a floor, not an alarm**: it never makes work run sooner; it only forbids earlier execution. Set discretionary conditions and let the system pick the best moment.
- **Gotcha — identifier consistency**: one string shared across `BGTaskSchedulerPermittedIdentifiers`, the `register` call, and the request. A single typo produces a silently ignored task.
- **Performance consideration**: every second of background execution costs battery. Prefer `requiresExternalPower` + `requiresNetworkConnectivity` for heavy work, respect Low Power Mode, and design work to be resumable so an expired run wastes nothing.

## Next Steps

- Study the Swift Performance Optimization guide for deeper battery- and launch-time engineering (`guides/swift-performance-optimization-guide.md`).
- Explore the iOS Security and Data Protection guide to protect files written by background work with the correct Keychain access levels (`guides/swift-ios-security-data-protection-guide.md`).
- Pair this tutorial with the Swift concurrency guide (`guides/swift-concurrency-async-await-actors-guide.md`) to model long-running work with actors and task groups.

## Conclusion

You now understand the complete contract for background execution on iOS: the app lifecycle, the two `BGTaskScheduler` task classes, background `URLSession` transfers, and the scheduling discipline that keeps background work reliable and battery-friendly. You can register identifiers, submit requests with the right conditions, handle expirations without corrupting state, and test real scheduling behavior with the LLDB simulation hooks. Most importantly, you know the failure modes — identifier mismatches, missing resubmissions, and forgotten completion handlers — that separate a scheduler that runs at 02:00 from one that never fires at all.

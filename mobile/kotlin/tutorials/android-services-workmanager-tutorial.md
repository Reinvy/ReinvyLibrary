---
title: "Android Background Services with WorkManager"
description: "An advanced tutorial on Android background work with WorkManager — comparing it with Services and AlarmManager, then building OneTimeWorkRequest, PeriodicWorkRequest, constraints, chaining, retry policies, unique work, and a CoroutineWorker example."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Android Background Services with WorkManager

## Summary

This tutorial explores Android background execution with WorkManager, the modern Jetpack solution for deferrable and guaranteed work. You will build a complete photo-upload sync worker that survives app restarts, respects battery constraints, retries with exponential backoff, and chains dependent tasks — using Kotlin coroutines from start to finish.

## Target Audience

- Android developers who have built basic apps and now need reliable background processing.
- Advanced level. Familiarity with Kotlin coroutines, ViewModel, and Jetpack libraries is expected.

## Prerequisites

- Android Studio with API level 21+ (WorkManager requires 14+, but 21+ unlocks more features).
- Kotlin 1.9+, kotlinx-coroutines, and `androidx.work:work-runtime-ktx` (2.9+) added to the module.
- Basic knowledge of coroutines and dependency injection (Hilt or manual DI).
- A device or emulator to test background behavior (Doze mode testing is a plus).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Decide when to use WorkManager instead of a Service or AlarmManager.
- Configure OneTimeWorkRequest and PeriodicWorkRequest correctly.
- Attach constraints (network, charging, battery-not-low) to work requests.
- Chain dependent work with `beginWith` and `Then`.
- Set retry policies with `BackoffPolicy.EXPONENTIAL` and `BackoffPolicy.LINEAR`.
- Enqueue unique work so a job never runs twice simultaneously.
- Implement a `CoroutineWorker` with suspend-friendly code.

## Context and Motivation

Android has three legacy ways to run background work — `Service`, `JobScheduler`, and `AlarmManager` — and each has serious flaws. A plain `Service` keeps the process alive until it is killed, draining battery and facing strict limits on modern Android (foreground services now require visible notifications). `AlarmManager` is meant for exact alarms like calendar reminders; firing network calls from it every few minutes gets your app throttled or blocked on Doze. `JobScheduler` is powerful but verbose and only available on API 21+.

WorkManager solves the real problem: *guaranteed, deferrable execution*. If your upload worker dies mid-run because the phone entered Doze, WorkManager reschedules it automatically. It respects system constraints, survives process death, and persists pending work in its own database — which is why Google shut down GCMNetworkManager and recommends migrating away from Firebase JobDispatcher toward WorkManager.

## Core Content

### WorkManager vs Services vs AlarmManager

| Tool | Best for | Guarantee | Wake device? | API level |
|------|----------|-----------|--------------|-----------|
| `Service` (foreground) | Long-running, user-visible tasks (music, navigation) | Process can be killed | Requires notification | 1+ |
| `AlarmManager` | Exact alarms and time-critical events (reminders) | Fires even in Doze when set with `setExactAndAllowWhileIdle` | Yes (battery-heavy) | 1+ |
| `JobScheduler` | System-aware batch jobs | Persisted across reboots | Batched, respects Doze | 21+ |
| WorkManager | Deferrable, guaranteed work (sync, upload, export) | Persisted in its own DB, auto-rescheduled | Respected by Doze | 14+ (14-22 via Firebase) |

### OneTimeWorkRequest vs PeriodicWorkRequest

A `OneTimeWorkRequest` runs exactly one time (possibly retried). A `PeriodicWorkRequest` runs repeatedly on a minimum interval of 15 minutes — the interval is a *minimum*; the system may delay execution to conserve battery. Periodic work cannot be chained, and its retry behavior is constrained, so long-running recurring tasks are better expressed as a one-time worker that re-enqueues itself.

### Constraints

Constraints gate execution on device state: `NetworkType.CONNECTED`, `BatteryNotLow`, `Charging`, `StorageNotLow`, and `RequiresDeviceIdle`. Applying `NetworkType.CONNECTED` to an upload worker means it waits — forever, if needed — until a network is available instead of failing immediately.

### Chaining, Unique Work, and Backoff

Chaining creates a directed graph: `beginWith(workA).then(workB)` runs B only if A succeeds. Unique work (`enqueueUniqueWork`) guarantees only one instance of a named chain exists — critical for jobs like "sync all orders" that must never run concurrently. On failure, backoff decides when a retry happens; `BackoffPolicy.EXPONENTIAL` with `setBackoffCriteria` doubles the delay each attempt.

## Code Examples

Define a `CoroutineWorker` that uploads a photo:

```kotlin
package com.example.syncapp.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.io.File

class PhotoUploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val photoPath = inputData.getString(KEY_PHOTO_PATH)
            ?: return Result.failure() // no data — fail fast
        return try {
            setProgress(workDataOf("remote_id" to uploadPhoto(File(photoPath))))
            Result.success()
        } catch (e: NetworkTimeoutException) {
            Result.retry() // transient — retried via backoff policy
        } catch (e: IOException) {
            if (runAttemptCount < MAX_ATTEMPTS) Result.retry() else Result.failure()
        } catch (e: Exception) {
            Result.failure()
        }
    }

    private suspend fun uploadPhoto(file: File): String {
        // Real API call here (Retrofit/Ktor); simulated so this runs standalone
        delay(2_000)
        if (file.length() > 25_000_000) throw IOException("File too large")
        return "img_${System.currentTimeMillis()}"
    }

    companion object {
        const val KEY_PHOTO_PATH = "photo_path"
        private const val MAX_ATTEMPTS = 3
    }
}
```

Enqueue one-time work with constraints and backoff:

```kotlin
class PhotoSyncViewModel : ViewModel() {
    private val workManager = WorkManager.getInstance(application)

    fun uploadPhoto(photo: File) {
        val request = OneTimeWorkRequestBuilder<PhotoUploadWorker>()
            .setInputData(workDataOf(PhotoUploadWorker.KEY_PHOTO_PATH to photo.absolutePath))
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .setRequiresBatteryNotLow(true)
                    .build()
            )
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                OneTimeWorkRequest.MIN_BACKOFF_MILLIS
            )
            .build()
        workManager.enqueueUniqueWork(
            "upload_${photo.name}",
            ExistingWorkPolicy.REPLACE,
            request
        )
    }
}
```

Periodic work with a 15-minute minimum interval:

```kotlin
val periodic = PeriodicWorkRequestBuilder<PhotoUploadWorker>(15, TimeUnit.MINUTES)
    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .build()

workManager.enqueueUniquePeriodicWork("nightly_sync", ExistingPeriodicWorkPolicy.UPDATE, periodic)
```

Chain three dependent steps:

```kotlin
workManager
    .beginWith(OneTimeWorkRequestBuilder<DownloadAssetWorker>().build())
    .then(OneTimeWorkRequestBuilder<ProcessAssetWorker>().build())
    .then(OneTimeWorkRequestBuilder<UploadAssetWorker>().build())
    .enqueue()
```

## Key Insights

- Prefer WorkManager unless the task is user-visible (foreground `Service`) or needs exact-time firing (`AlarmManager`). WorkManager never guarantees *when* work runs — it guarantees *that* it runs.
- `PeriodicWorkRequest` has a hard 15-minute minimum, and even that is a hint, not a contract. For precise cadence, re-enqueue a one-time worker from within the previous run.
- `Result.retry()` is correct for transient failures; `Result.failure()` permanently drops the job. Returning `Result.success()` with partial data silently loses work.
- Use `ExistingWorkPolicy.APPEND_OR_REPLACE` or `REPLACE` with `enqueueUniqueWork` to prevent duplicate concurrent runs of the same logical job.
- Always pass inputs via `inputData` and read them in `doWork()` — never hold `Context` or Activity references inside a worker; the process can be killed and recreated around it.

## Next Steps

- Learn about `ListenableWorker` for async non-coroutine code and `WorkerFactory` for Hilt injection.
- Study foreground service migration when a task becomes user-visible (e.g., download progress notifications).

## Conclusion

You now know how to choose between WorkManager, Services, and AlarmManager, and how to assemble one-time and periodic work with constraints, chaining, retries, and uniqueness guarantees. The `CoroutineWorker` example gives you a production-shaped starting point — replace the stub upload with your real API call and the sync pipeline becomes genuinely reliable across process deaths, reboots, and battery constraints.

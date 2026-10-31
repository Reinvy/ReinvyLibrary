---
title: "Kotlin Flow and Coroutines Cheat Sheet"
description: "A compact reference for Kotlin coroutines and Flow: builders, dispatchers, suspend functions, flow operators, StateFlow versus SharedFlow, cancellation, and exception handling."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Kotlin Flow and Coroutines Cheat Sheet

## Quick Reference Table

### Builders and Suspend Functions

| Action | Code | Description |
|--------|------|-------------|
| Suspend function | `suspend fun load(): User` | Can call other suspend functions and be cancelled |
| Fire and forget | `launch { }` | Starts a coroutine with no result, returns `Job` |
| Await a value | `async { }` | Returns `Deferred<T>`, read it with `.await()` |
| Blocking bridge | `runBlocking { }` | Bridges blocking code; tests and `main` only |
| Scoped bridge | `coroutineScope { }` | Inherits context, fails fast, waits for all children |
| Supervised scope | `supervisorScope { }` | A child failure does not cancel its siblings |
| With timeout | `withTimeout(1_000) { }` | Throws `TimeoutCancellationException` |

### Dispatchers

| Dispatcher | Use Case | Notes |
|------------|----------|-------|
| `Dispatchers.Main` | UI updates, Compose state | Never block it |
| `Dispatchers.Default` | CPU-bound work | Pool sized to CPU cores |
| `Dispatchers.IO` | Disk and network I/O | Elastic pool for blocking calls |
| `withContext(...)` | Switching inside a coroutine | Returns to the caller dispatcher after |

### Flow Creation and Operators

| Action | Code | Description |
|--------|------|-------------|
| Create a flow | `flow { emit(1) }` | Cold stream built with a suspend block |
| From collection | `listOf(1, 2).asFlow()` | Adapts an iterable into a flow |
| Transform | `map { it * 2 }` | Synchronous one-to-one mapping |
| Expand sequentially | `flatMapConcat { api(it) }` | Runs inner flows one after another |
| Latest wins | `flatMapLatest { search(it) }` | Cancels the previous inner flow |
| Filter | `filter { it.isActive }` | Drops values failing the predicate |
| Drop repeats | `distinctUntilChanged()` | Skips consecutive duplicates |
| Rate limit | `debounce(300)` | Emits after a quiet period |
| Sample | `sample(1_000)` | Emits the latest value per interval |
| Buffer | `buffer(64)` | Decouples producer from collector |
| Conflate | `conflate()` | Keeps only the newest value |
| Collect | `collect { value -> }` | Terminal operator that starts the flow |
| Collect latest | `collectLatest { }` | Cancels the previous collector body |

### StateFlow versus SharedFlow

| Feature | `StateFlow` | `SharedFlow` |
|---------|-------------|--------------|
| Initial value | Required | Optional via `replay` |
| Duplicate suppression | Yes, built in | No |
| Current value | Readable via `.value` | Not exposed |
| Update | `MutableStateFlow.update { }` | `MutableSharedFlow.emit` / `tryEmit` |
| Typical use | UI state | One-off events, broadcast |

### Cancellation and Exception Handling

| Action | Code | Description |
|--------|------|-------------|
| Cooperative cancel | `ensureActive()` / `isActive` | Long loops must check for cancellation |
| Cleanup | `try { } finally { }` | Runs on cancellation; release resources here |
| Non-cancellable cleanup | `withContext(NonCancellable) { }` | Suspends inside `finally` while cancelled |
| Cancel a job | `job.cancelAndJoin()` | Cancellation is async unless you join |
| Catch in coroutine | `try/catch (e: Exception)` | Never swallow `CancellationException` |
| Catch in flow | `flow.catch { emit(fallback) }` | Handles upstream errors without breaking the chain |
| Retry | `flow.retry(3) { delay(1_000); true }` | Retries the upstream flow on failure |
| Retry with backoff | `retryWhen { cause, attempt -> }` | Full control over delay and stop condition |
| Global handler | `CoroutineExceptionHandler` | For `launch` roots only, not `async` |

## Common Commands

### Dependencies and Test Runs

```bash
# Coroutines core for JVM or Android modules
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

# Test helpers: runTest, TestDispatcher, Turbine for flow assertions
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
testImplementation("app.cash.turbine:turbine:1.1.0")

# Run only coroutine-related tests
./gradlew test --tests "com.example.flow.*"

# Print coroutine debug output when diagnosing a hang
./gradlew test -Dkotlinx.coroutines.debug=on
```

## Code Snippets

### Suspend Function with Error Mapping

```kotlin
sealed interface Outcome<out T> {
    data class Ok<T>(val value: T) : Outcome<T>
    data class Failure(val cause: Throwable) : Outcome<Nothing>
}

suspend fun loadUser(id: String): Outcome<User> = try {
    Outcome.Ok(api.fetchUser(id))
} catch (e: CancellationException) {
    throw e // never swallow cancellation
} catch (e: IOException) {
    Outcome.Failure(e)
}
```

### Cold Flow with Retry and Backpressure

```kotlin
fun priceTicker(symbol: String): Flow<Price> = flow {
    while (true) {
        emit(api.price(symbol))
        delay(2_000)
    }
}.retryWhen { cause, attempt ->
    if (attempt >= 5) throw cause
    delay(1_000L * (attempt + 1))
    true
}.conflate()
```

### StateFlow in a ViewModel

```kotlin
class FeedViewModel(private val repo: FeedRepository) : ViewModel() {
    private val _state = MutableStateFlow<FeedState>(FeedState.Loading)
    val state: StateFlow<FeedState> = _state.asStateFlow()

    fun refresh() = viewModelScope.launch {
        _state.value = FeedState.Loading
        _state.value = try {
            FeedState.Ready(repo.items())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            FeedState.Error(e.message ?: "Unknown error")
        }
    }
}
```

### Cancellation with Cleanup

```kotlin
suspend fun pollUntilClosed(socket: Socket) = try {
    while (currentCoroutineContext().isActive) {
        socket.sendHeartbeat()
        delay(5_000)
    }
} finally {
    withContext(NonCancellable) { socket.close() }
}
```

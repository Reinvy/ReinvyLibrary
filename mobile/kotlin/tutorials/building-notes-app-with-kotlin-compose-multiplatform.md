---
title: "Building a Notes App with Kotlin Compose Multiplatform"
description: "Build a shared-UI notes app with Compose Multiplatform that runs on Android and Desktop, using expect/actual storage, typed navigation, and StateFlow-driven state."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Notes App with Kotlin Compose Multiplatform

## Summary

This tutorial builds a notes app whose screens, navigation, state, and tests all live in `commonMain` while shipping to Android and Desktop JVM. You will model state with `StateFlow`, wrap routes in a sealed interface, and hide file storage behind an `expect class` with two real implementations.

## Target Audience

- Android developers who write Jetpack Compose today and want a desktop target without a rewrite.
- Kotlin developers comfortable with Gradle, coroutines, and composables; intermediate level.

## Prerequisites

- JDK 17, Android Studio or IntelliJ with the Android plugin, Gradle 8.x, Kotlin 2.1.
- Compose basics (composables, state hoisting) and coroutines with `StateFlow`.
- Dependencies: `compose.material3`, multiplatform `navigation-compose`, `kotlinx-serialization-json`.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Structure a Compose Multiplatform module with `commonMain`, `androidMain`, and `desktopMain`.
- Keep navigation and view models shared, exposing one immutable UI state.
- Implement `expect`/`actual` storage for Android and Desktop, then test it with a fake.

## Context and Motivation

Duplicated screens across Android and iOS double review effort and let behaviour drift. Compose Multiplatform removes that duplication while leaving platform APIs reachable through `expect`/`actual`. A notes app exercises the shape of a real product: list and detail screens, navigation, writable storage, and enough state to expose architectural mistakes early.

## Core Content

### Module layout and state

Use one Gradle module, `composeApp`, with three source sets; `commonMain` must compile for every target, so `java.io` types stay in the platform source sets. The view model emits a single immutable `NotesUiState` rather than several flows, so there are no frames where the list and the selection disagree. Navigation Compose still routes by string; wrapping routes in a `sealed interface` with `path` keeps call sites type-safe.

### Storage behind expect/actual

`commonMain` declares `expect class NoteStore(dirName: String)` with `load()` and `save()`. Android backs it with `filesDir`, Desktop with `user.home`; the repository accepts a `NoteStore`, so tests inject a fake.

## Code Examples

### 1. Model, storage contract, repository

```kotlin
// commonMain/kotlin/com/example/notes/NoteStore.kt
@Serializable
data class Note(val id: String, val title: String, val body: String, val updatedAt: Long)
expect class NoteStore(dirName: String) {
    fun load(): List<Note>
    fun save(notes: List<Note>)
}
class NoteRepository(private val store: NoteStore) {
    fun readAll(): Result<List<Note>> = runCatching { store.load() }
    fun writeAll(notes: List<Note>): Result<Unit> =
        runCatching { store.save(notes) }
            .onFailure { println("Failed to persist notes: ${it.message}") }
}
```

### 2. View model with StateFlow

```kotlin
data class NotesUiState(val notes: List<Note> = emptyList(), val error: String? = null)

class NotesViewModel(private val repository: NoteRepository) {
    private val _uiState = MutableStateFlow(NotesUiState())
    val uiState: StateFlow<NotesUiState> = _uiState.asStateFlow()
    fun refresh() {
        repository.readAll().fold(
            onSuccess = { notes -> _uiState.value = NotesUiState(notes.sortedByDescending(Note::updatedAt)) },
            onFailure = { error -> _uiState.value = NotesUiState(error = error.message ?: "Unknown error") }
        )
    }
    fun upsert(note: Note) {
        val next = _uiState.value.notes.filterNot { it.id == note.id } + note
        repository.writeAll(next).onSuccess { _uiState.value = NotesUiState(next.sortedByDescending(Note::updatedAt)) }
            .onFailure { _uiState.value = _uiState.value.copy(error = it.message) }
    }
}
```

### 3. Shared screens and navigation

```kotlin
sealed interface Route {
    val path: String
    data object List : Route { override val path = "list" }
    data class Detail(val id: String) : Route { override val path = "detail/$id" }
}
@Composable
fun App(viewModel: NotesViewModel) {
    val state by viewModel.uiState.collectAsState()
    val nav = rememberNavController()
    NavHost(nav, startDestination = Route.List.path) {
        composable(Route.List.path) {
            NotesListScreen(state.notes) { id -> nav.navigate(Route.Detail(id).path) }
        }
        composable("detail/{id}") { entry ->
            val note = state.notes.firstOrNull { it.id == entry.arguments?.getString("id") }
            if (note == null) Text("Note not found") else NoteDetailScreen(note, viewModel::upsert)
        }
    }
}
```

### 4. Android storage, desktop mirror

```kotlin
// androidMain: filesDir needs a Context, so initialise once from Application.onCreate
private lateinit var appFilesDir: File

fun initAndroidStorage(context: Context) {
    appFilesDir = context.applicationContext.filesDir
}
actual class NoteStore actual constructor(private val dirName: String) {
    // desktopMain only changes the path: File(System.getProperty("user.home"), ".notes/$dirName.json")
    private val file = File(appFilesDir, "$dirName.json")
    actual fun load(): List<Note> = if (file.exists()) Json.decodeFromString(file.readText()) else emptyList()
    actual fun save(notes: List<Note>) {
        file.parentFile?.mkdirs()
        file.writeText(Json.encodeToString(notes))
    }
}
```

### 5. Shared test with a fake store

```kotlin
class FakeStore : NoteStore {
    var saved: List<Note> = emptyList()
    override fun load() = saved
    override fun save(notes: List<Note>) { saved = notes }
}
@Test
fun roundTripPersistsNotes() {
    val repository = NoteRepository(FakeStore())
    val note = Note("1", "Groceries", "Milk", 1_700_000_000_000L)
    repository.writeAll(listOf(note)).getOrThrow()
    assertEquals(listOf(note), repository.readAll().getOrThrow())
}
```

## Key Insights

- Keep `java.*` imports out of `commonMain`; Desktop compiles them while Android fails late.
- Prefer one immutable UI state per screen over several flows that drift out of sync.
- Call `initAndroidStorage` from `Application.onCreate`, never a composable, so process death cannot leave the store uninitialised.
- Move serialisation to `Dispatchers.IO` as the list grows; `File.writeText` blocks the caller.
- Multiplatform Navigation Compose trails Jetpack's version, so pin the artifact before upgrading.

## Next Steps

- Add search backed by `derivedStateOf` over the note list.
- Replace JSON files with SQLDelight for queryable shared storage.
- Add an iOS target with `iosMain` and a `UIViewController` wrapper.

## Conclusion

You now have a notes app whose screens, navigation, state, and tests are shared, with only the storage directory differing per platform. Grow `commonMain`, keep each `expect` surface narrow, and the second platform stays nearly free.

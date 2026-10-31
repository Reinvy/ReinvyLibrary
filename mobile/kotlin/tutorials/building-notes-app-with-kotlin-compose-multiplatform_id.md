---
title: "Membangun Aplikasi Catatan dengan Compose Multiplatform Kotlin"
description: "Bangun aplikasi catatan dengan UI bersama berbasis Compose Multiplatform yang berjalan di Android dan Desktop, memakai penyimpanan expect/actual, navigasi bertipe, dan state dari StateFlow."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Catatan dengan Compose Multiplatform Kotlin

## Ringkasan

Tutorial ini membangun aplikasi catatan yang seluruh layar, navigasi, state, dan pengujiannya berada di `commonMain`, namun tetap berjalan di Android dan Desktop JVM. Anda akan memodelkan state dengan `StateFlow`, membungkus rute dalam sealed interface, dan menyembunyikan penyimpanan berkas di balik `expect class` dengan dua implementasi nyata.

## Target Audiens

- Pengembang Android yang sudah memakai Jetpack Compose dan ingin menambah target desktop tanpa menulis ulang UI.
- Pengembang Kotlin yang nyaman dengan Gradle, coroutine, dan composable; level menengah.

## Prasyarat

- JDK 17, Android Studio atau IntelliJ dengan plugin Android, Gradle 8.x, Kotlin 2.1.
- Dasar Compose (composable, state hoisting) dan coroutine dengan `StateFlow`.
- Dependensi: `compose.material3`, `navigation-compose` multiplatform, `kotlinx-serialization-json`.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan mampu:

- Menyusun modul Compose Multiplatform dengan `commonMain`, `androidMain`, dan `desktopMain`.
- Menjaga navigasi dan view model tetap bersama, dengan satu state UI yang immutable.
- Menerapkan penyimpanan `expect`/`actual` untuk Android dan Desktop, lalu mengujinya dengan fake.

## Konteks dan Motivasi

Layar yang diduplikasi di Android dan iOS menggandakan beban review dan membuat perilaku mudah menyimpang. Compose Multiplatform menghapus duplikasi itu sementara API platform tetap dapat diakses lewat `expect`/`actual`. Aplikasi catatan mewakili bentuk produk nyata: layar daftar dan detail, navigasi, penyimpanan yang bisa ditulis, serta cukup state untuk memunculkan kesalahan arsitektur sejak awal.

## Konten Inti

### Struktur modul dan state

Gunakan satu modul Gradle, `composeApp`, dengan tiga source set; `commonMain` harus dapat dikompilasi untuk semua target, sehingga tipe `java.io` diletakkan di source set platform. View model memancarkan satu `NotesUiState` immutable, bukan beberapa flow, sehingga tidak ada frame di mana daftar dan pilihan tidak sinkron. Navigation Compose masih memakai rute string; membungkusnya dalam `sealed interface` dengan `path` menjaga pemanggilan tetap type-safe.

### Penyimpanan di balik expect/actual

`commonMain` mendeklarasikan `expect class NoteStore(dirName: String)` dengan `load()` dan `save()`. Android memakai `filesDir`, Desktop memakai `user.home`; repository menerima `NoteStore`, sehingga pengujian dapat menyuntikkan fake.

## Contoh Kode

### 1. Model, kontrak penyimpanan, repository

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
            .onFailure { println("Gagal menyimpan catatan: ${it.message}") }
}
```

### 2. View model dengan StateFlow

```kotlin
data class NotesUiState(val notes: List<Note> = emptyList(), val error: String? = null)

class NotesViewModel(private val repository: NoteRepository) {
    private val _uiState = MutableStateFlow(NotesUiState())
    val uiState: StateFlow<NotesUiState> = _uiState.asStateFlow()
    fun refresh() {
        repository.readAll().fold(
            onSuccess = { notes -> _uiState.value = NotesUiState(notes.sortedByDescending(Note::updatedAt)) },
            onFailure = { error -> _uiState.value = NotesUiState(error = error.message ?: "Kesalahan tidak diketahui") }
        )
    }
    fun upsert(note: Note) {
        val next = _uiState.value.notes.filterNot { it.id == note.id } + note
        repository.writeAll(next).onSuccess { _uiState.value = NotesUiState(next.sortedByDescending(Note::updatedAt)) }
            .onFailure { _uiState.value = _uiState.value.copy(error = it.message) }
    }
}
```

### 3. Layar bersama dan navigasi

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
            if (note == null) Text("Catatan tidak ditemukan") else NoteDetailScreen(note, viewModel::upsert)
        }
    }
}
```

### 4. Penyimpanan Android dan padanan desktop

```kotlin
// androidMain: filesDir butuh Context, jadi inisialisasi sekali dari Application.onCreate
private lateinit var appFilesDir: File

fun initAndroidStorage(context: Context) {
    appFilesDir = context.applicationContext.filesDir
}
actual class NoteStore actual constructor(private val dirName: String) {
    // desktopMain hanya mengganti path: File(System.getProperty("user.home"), ".notes/$dirName.json")
    private val file = File(appFilesDir, "$dirName.json")
    actual fun load(): List<Note> = if (file.exists()) Json.decodeFromString(file.readText()) else emptyList()
    actual fun save(notes: List<Note>) {
        file.parentFile?.mkdirs()
        file.writeText(Json.encodeToString(notes))
    }
}
```

### 5. Pengujian bersama dengan fake store

```kotlin
class FakeStore : NoteStore {
    var saved: List<Note> = emptyList()
    override fun load() = saved
    override fun save(notes: List<Note>) { saved = notes }
}
@Test
fun penyimpananDapatDibacaKembali() {
    val repository = NoteRepository(FakeStore())
    val note = Note("1", "Belanja", "Susu", 1_700_000_000_000L)
    repository.writeAll(listOf(note)).getOrThrow()
    assertEquals(listOf(note), repository.readAll().getOrThrow())
}
```

## Insight Penting

- Jauhkan impor `java.*` dari `commonMain`; Desktop berhasil mengompilasinya sementara Android gagal terlambat.
- Utamakan satu state UI immutable per layar dibanding beberapa flow yang bisa tidak sinkron.
- Panggil `initAndroidStorage` dari `Application.onCreate`, bukan dari composable, agar process death tidak meninggalkan store tanpa inisialisasi.
- Pindahkan serialisasi ke `Dispatchers.IO` saat daftar membesar; `File.writeText` memblokir thread pemanggil.
- Navigation Compose multiplatform selalu tertinggal dari versi Jetpack, jadi pin artefaknya sebelum melakukan upgrade.

## Langkah Berikutnya

- Tambahkan pencarian dengan `derivedStateOf` di atas daftar catatan.
- Ganti berkas JSON dengan SQLDelight untuk penyimpanan bersama yang bisa di-query.
- Tambahkan target iOS lewat `iosMain` dan pembungkus `UIViewController`.

## Kesimpulan

Anda kini memiliki aplikasi catatan yang layar, navigasi, state, dan pengujiannya dipakai bersama, dengan hanya direktori penyimpanan yang berbeda per platform. Kembangkan `commonMain`, jaga setiap permukaan `expect` tetap sempit, dan platform kedua nyaris gratis.

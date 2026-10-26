---
title: "Cheat Sheet Flow dan Coroutines Kotlin"
description: "Referensi ringkas untuk coroutines dan Flow di Kotlin: builder, dispatcher, fungsi suspend, operator flow, StateFlow versus SharedFlow, pembatalan, dan penanganan exception."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Flow dan Coroutines Kotlin

## Tabel Referensi Cepat

### Builder dan Fungsi Suspend

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Fungsi suspend | `suspend fun load(): User` | Dapat memanggil fungsi suspend lain dan bisa dibatalkan |
| Jalankan tanpa hasil | `launch { }` | Menjalankan coroutine tanpa hasil, mengembalikan `Job` |
| Tunggu sebuah nilai | `async { }` | Mengembalikan `Deferred<T>`, baca dengan `.await()` |
| Jembatan blocking | `runBlocking { }` | Menghubungkan kode blocking; hanya test dan `main` |
| Scope terikat | `coroutineScope { }` | Mewarisi context, gagal cepat, menunggu semua anak |
| Scope tersupervisi | `supervisorScope { }` | Kegagalan anak tidak membatalkan saudaranya |
| Dengan batas waktu | `withTimeout(1_000) { }` | Melempar `TimeoutCancellationException` |

### Dispatcher

| Dispatcher | Penggunaan | Catatan |
|------------|------------|---------|
| `Dispatchers.Main` | Pembaruan UI, state Compose | Jangan pernah memblokirnya |
| `Dispatchers.Default` | Kerja berat CPU | Ukuran pool mengikuti jumlah core CPU |
| `Dispatchers.IO` | I/O disk dan jaringan | Pool elastis untuk panggilan blocking |
| `withContext(...)` | Berpindah dispatcher di dalam coroutine | Kembali ke dispatcher pemanggil setelahnya |

### Pembuatan Flow dan Operator

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Membuat flow | `flow { emit(1) }` | Stream cold yang dibangun dengan blok suspend |
| Dari koleksi | `listOf(1, 2).asFlow()` | Mengubah iterable menjadi flow |
| Transformasi | `map { it * 2 }` | Pemetaan satu-ke-satu yang sinkron |
| Uraikan berurutan | `flatMapConcat { api(it) }` | Menjalankan flow dalam satu per satu |
| Ambil yang terbaru | `flatMapLatest { search(it) }` | Membatalkan flow dalam sebelumnya |
| Filter | `filter { it.isActive }` | Membuang nilai yang tidak lolos predikat |
| Buang duplikat | `distinctUntilChanged()` | Melewati duplikat berurutan |
| Batasi laju | `debounce(300)` | Memancarkan setelah periode tenang |
| Sampling | `sample(1_000)` | Memancarkan nilai terbaru per interval |
| Buffer | `buffer(64)` | Memisahkan produsen dari kolektor |
| Konflasi | `conflate()` | Menyimpan hanya nilai terbaru |
| Koleksi | `collect { value -> }` | Operator terminal yang memulai flow |
| Koleksi terbaru | `collectLatest { }` | Membatalkan badan kolektor sebelumnya |

### StateFlow versus SharedFlow

| Fitur | `StateFlow` | `SharedFlow` |
|-------|-------------|--------------|
| Nilai awal | Wajib | Opsional lewat `replay` |
| Penekanan duplikat | Ya, sudah bawaan | Tidak |
| Nilai saat ini | Dapat dibaca lewat `.value` | Tidak tersedia |
| Pembaruan | `MutableStateFlow.update { }` | `MutableSharedFlow.emit` / `tryEmit` |
| Penggunaan umum | State UI | Event sekali jalan, broadcast |

### Pembatalan dan Penanganan Exception

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Pembatalan kooperatif | `ensureActive()` / `isActive` | Loop panjang wajib memeriksa pembatalan |
| Pembersihan | `try { } finally { }` | Berjalan saat dibatalkan; lepas resource di sini |
| Pembersihan tak terbatal | `withContext(NonCancellable) { }` | Tetap suspend di dalam `finally` meski dibatalkan |
| Batalkan job | `job.cancelAndJoin()` | Pembatalan asinkron kecuali Anda melakukan join |
| Tangkap di coroutine | `try/catch (e: Exception)` | Jangan pernah menelan `CancellationException` |
| Tangkap di flow | `flow.catch { emit(fallback) }` | Menangani error hulu tanpa memutus rantai |
| Retry | `flow.retry(3) { delay(1_000); true }` | Mengulang flow hulu saat gagal |
| Retry dengan backoff | `retryWhen { cause, attempt -> }` | Kendali penuh atas jeda dan kondisi berhenti |
| Handler global | `CoroutineExceptionHandler` | Hanya untuk akar `launch`, bukan `async` |

## Perintah Umum

### Dependensi dan Menjalankan Test

```bash
# Coroutines core untuk modul JVM atau Android
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

# Helper test: runTest, TestDispatcher, Turbine untuk asersi flow
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
testImplementation("app.cash.turbine:turbine:1.1.0")

# Menjalankan hanya test terkait coroutine
./gradlew test --tests "com.example.flow.*"

# Menampilkan output debug coroutine saat test menggantung
./gradlew test -Dkotlinx.coroutines.debug=on
```

## Potongan Kode

### Fungsi Suspend dengan Pemetaan Error

```kotlin
sealed interface Outcome<out T> {
    data class Ok<T>(val value: T) : Outcome<T>
    data class Failure(val cause: Throwable) : Outcome<Nothing>
}

suspend fun loadUser(id: String): Outcome<User> = try {
    Outcome.Ok(api.fetchUser(id))
} catch (e: CancellationException) {
    throw e // pembatalan tidak boleh ditelan
} catch (e: IOException) {
    Outcome.Failure(e)
}
```

### Flow Cold dengan Retry dan Backpressure

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

### StateFlow di Dalam ViewModel

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
            FeedState.Error(e.message ?: "Terjadi kesalahan tak dikenal")
        }
    }
}
```

### Pembatalan dengan Pembersihan

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

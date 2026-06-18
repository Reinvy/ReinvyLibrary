---
title: "Cheat Sheet Kotlin"
description: "Panduan referensi cepat untuk sintaks, perintah, dan potongan kode pengembangan Android Kotlin."
category: "mobile"
technology: "kotlin"
difficulty: "beginner"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Kotlin

## Tabel Referensi Cepat

| Aksi | Perintah / Kode | Deskripsi |
|------|-----------------|-----------|
| Deklarasi variabel read-only | `val nama: String = "Kotlin"` | Referensi immutable |
| Deklarasi variabel mutable | `var hitung = 0` | Referensi mutable dengan inferensi tipe |
| Tipe nullable | `var nama: String? = null` | Variabel dapat menyimpan null |
| Operator Elvis | `val len = nama?.length ?: 0` | Nilai default jika null |
| Safe call | `nama?.toUpperCase()` | Panggil hanya jika tidak null |
| Deklarasi fungsi | `fun jumlah(a: Int, b: Int): Int = a + b` | Fungsi ekspresi tunggal |
| Ekspresi lambda | `val list = listOf(1,2,3).filter { it > 1 }` | Lambda dengan parameter implisit `it` |
| Data class | `data class User(val id: Int, val nama: String)` | Otomatis generate equals/hashCode/toString |
| Sealed class | `sealed class Hasil { data class Sukses(val data: T) : Hasil() }` | Hierarki kelas terbatas |
| Object declaration | `object Singleton { val nama = "Singleton" }` | Singleton thread-safe |
| Companion object | `class KelasSaya { companion object { const val TAG = "KelasSaya" } }` | Anggota statis |
| Fungsi ekstensi | `fun String.isEmail(): Boolean = contains("@")` | Tambahkan method ke kelas yang ada |
| Scope function (let) | `nama?.let { println(it) }` | Eksekusi blok hanya jika tidak null |
| Scope function (apply) | `User().apply { nama = "Budi"; id = 1 }` | Konfigurasi properti objek |
| Scope function (run) | `val hasil = run { hitung() }` | Eksekusi blok mengembalikan hasil |
| Scope function (with) | `with(user) { println(nama) }` | Panggil method pada objek konteks |
| Scope function (also) | `user.also { catat(it) }` | Lakukan aksi tambahan |

### Modifier Compose

| Modifier | Deskripsi |
|----------|-----------|
| `Modifier.fillMaxSize()` | Isi ukuran maksimum yang tersedia |
| `Modifier.fillMaxWidth()` | Isi lebar maksimum yang tersedia |
| `Modifier.padding(16.dp)` | Tambahkan padding di semua sisi |
| `Modifier.size(48.dp)` | Atur lebar dan tinggi tetap |
| `Modifier.width(100.dp)` | Atur lebar tetap |
| `Modifier.height(50.dp)` | Atur tinggi tetap |
| `Modifier.background(Color.Blue)` | Atur warna latar belakang |
| `Modifier.clickable { onClick() }` | Buat elemen dapat diklik |
| `Modifier.offset(x = 10.dp, y = 20.dp)` | Geser posisi |
| `Modifier.border(2.dp, Color.Black)` | Tambahkan batas |
| `Modifier.clip(CircleShape)` | Potong ke bentuk lingkaran |
| `Modifier.weight(1f)` | Ambil ruang proporsional di Row/Column |
| `Modifier.align(Alignment.CenterHorizontally)` | Ratakan dalam induk |
| `Modifier.alpha(0.5f)` | Atur transparansi |

### Anotasi Room

| Anotasi | Deskripsi |
|---------|-----------|
| `@Entity(tableName = "users")` | Menandai kelas sebagai entitas Room |
| `@PrimaryKey(autoGenerate = true)` | Mendefinisikan primary key |
| `@ColumnInfo(name = "nama_lengkap")` | Nama kolom kustom |
| `@Ignore` | Mengecualikan field dari persistensi |
| `@Embedded` | Menyematkan entitas lain di dalamnya |
| `@Dao` | Menandai interface Data Access Object |
| `@Query("SELECT * FROM users")` | Operasi query SQL |
| `@Insert(onConflict = OnConflictStrategy.REPLACE)` | Operasi insert |
| `@Update` | Operasi update |
| `@Delete` | Operasi delete |
| `@Database(entities = [User::class], version = 1)` | Anotasi kelas database |
| `@TypeConverters(Converters::class)` | Konverter tipe kustom |

### Pengaturan Retrofit

| Anotasi | Deskripsi |
|---------|-----------|
| `@GET("users")` | Permintaan HTTP GET |
| `@POST("users")` | Permintaan HTTP POST |
| `@PUT("users/{id}")` | Permintaan HTTP PUT |
| `@DELETE("users/{id}")` | Permintaan HTTP DELETE |
| `@Path("id")` | Parameter jalur dinamis |
| `@Query("page")` | Parameter query |
| `@Body` | Body permintaan |
| `@Header("Authorization")` | Parameter header |
| `@FormUrlEncoded` | Permintaan form-encoded |
| `@Field("email")` | Field formulir |
| `@Multipart` | Permintaan multipart |
| `@Part("image")` | Bagian multipart |

### Anotasi Hilt

| Anotasi | Target | Deskripsi |
|---------|--------|-----------|
| `@HiltAndroidApp` | Kelas Application | Mengaktifkan Hilt DI |
| `@AndroidEntryPoint` | Activity/Fragment/View/Service | Mengaktifkan injeksi di komponen Android |
| `@HiltViewModel` | Kelas ViewModel | Mengaktifkan injeksi ViewModel |
| `@Module` | Object/Kelas | Menandai modul Hilt |
| `@InstallIn(SingletonComponent::class)` | Modul | Menentukan lingkup komponen |
| `@Provides` | Fungsi modul | Memberi tahu Hilt cara menyediakan dependensi |
| `@Binds` | Fungsi modul | Mengikat interface ke implementasi |
| `@Singleton` | Provider | Lingkup singleton |
| `@ViewModelScoped` | Provider | Lingkup siklus hidup ViewModel |
| `@ActivityScoped` | Provider | Lingkup siklus hidup Activity |
| `@FragmentScoped` | Provider | Lingkup siklus hidup Fragment |
| `@Named("nama")` | Parameter | Qualifier untuk membedakan tipe yang sama |
| `@Inject` | Konstruktor/Field | Meminta injeksi dependensi |

## Perintah Umum

### ADB (Android Debug Bridge)

```bash
# Daftar perangkat terhubung
adb devices

# Instal APK
adb install app-release.apk

# Instal APK di perangkat tertentu
adb -s emulator-5554 install app.apk

# Hapus instalasi aplikasi
adb uninstall com.example.app

# Hapus data aplikasi
adb shell pm clear com.example.app

# Mulai activity
adb shell am start -n com.example.app/.MainActivity

# Kirim broadcast
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED

# Ambil screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Rekam layar
adb shell screenrecord /sdcard/demo.mp4

# Lihat logcat
adb logcat -v time

# Filter logcat berdasarkan tag
adb logcat -s MainActivity:V

# Bersihkan buffer logcat
adb logcat -c

# Tarik file dari perangkat
adb pull /sdcard/file.txt

# Dorong file ke perangkat
adb push local.txt /sdcard/
```

### Perintah Gradle

```bash
# Bersihkan proyek
./gradlew clean

# Build APK debug
./gradlew assembleDebug

# Build AAB rilis
./gradlew bundleRelease

# Jalankan test
./gradlew test

# Jalankan kelas test tertentu
./gradlew testDebugUnitTest --tests "com.example.LoginViewModelTest"

# Jalankan lint
./gradlew lint

# Analisis dependensi
./gradlew :app:dependencies

# Build dengan cache build
./gradlew assembleDebug --build-cache

# Eksekusi paralel
./gradlew assembleDebug --parallel

# Periksa pembaruan dependensi
./gradlew dependencyUpdates

# Generate baseline profile
./gradlew :app:generateBaselineProfile
```

### Pintasan Android Studio

| Pintasan (Windows/Linux) | Pintasan (macOS) | Deskripsi |
|--------------------------|------------------|-----------|
| `Ctrl+Shift+F` | `Cmd+Shift+F` | Cari di file |
| `Ctrl+Shift+R` | `Cmd+Shift+R` | Ganti di file |
| `Ctrl+N` | `Cmd+O` | Cari kelas |
| `Ctrl+Shift+N` | `Cmd+Shift+O` | Cari file |
| `Alt+Enter` | `Option+Enter` | Tampilkan niat / perbaikan cepat |
| `Ctrl+Alt+L` | `Cmd+Option+L` | Format kode |
| `Ctrl+Alt+O` | `Ctrl+Option+O` | Optimasi impor |
| `Ctrl+Shift+Enter` | `Cmd+Shift+Enter` | Lengkapi pernyataan |
| `Ctrl+Shift+Space` | `Ctrl+Shift+Space` | Penyelesaian cerdas |
| `Ctrl+J` | `Cmd+J` | Sisipkan template langsung |
| `Ctrl+E` | `Cmd+E` | File terbaru |
| `F12` | `F12` | Pergi ke definisi |
| `Ctrl+Alt+M` | `Cmd+Option+M` | Ekstrak method |
| `Ctrl+Alt+V` | `Cmd+Option+V` | Ekstrak variabel |
| `Alt+Insert` | `Cmd+N` | Generate kode (getter, setter, konstruktor) |
| `Shift+F6` | `Shift+F6` | Ganti nama |
| `Ctrl+Shift+F6` | `Cmd+Shift+F6` | Ubah signature |

## Potongan Kode

### Coroutine Builders

```kotlin
// Meluncurkan coroutine
viewModelScope.launch {
    val hasil = fetchData()
    updateUI(hasil)
}

// Async/await untuk tugas paralel
val deferred1 = async { fetchUser() }
val deferred2 = async { fetchPosts() }
val user = deferred1.await()
val posts = deferred2.await()

// withContext untuk mengganti dispatcher
withContext(Dispatchers.IO) {
    val data = database.getData()
}

// Lingkup coroutine kustom
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
scope.launch {
    // kode coroutine
}
scope.cancel() // batalkan jika selesai
```

### Flow Collectors

```kotlin
// Mengumpulkan StateFlow di Compose
val uiState by viewModel.uiState.collectAsState()

// Mengumpulkan Flow di ViewModel
viewModelScope.launch {
    repository.getUsers()
        .flowOn(Dispatchers.IO)
        .catch { e -> emit(emptyList()) }
        .collect { users ->
            _uiState.value = UiState.Sukses(users)
        }
}

// Transformasi Flow
val filteredFlow = repository.getAllItems()
    .map { it.filter { item -> item.isActive } }
    .debounce(300)
    .distinctUntilChanged()

// StateFlow dari MutableStateFlow
private val _searchQuery = MutableStateFlow("")
val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()
```

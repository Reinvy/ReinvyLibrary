---
title: "Panduan Dependency Injection Kotlin dengan Hilt"
description: "Panduan komprehensif dependency injection di Android dengan Hilt: cakupan komponen, qualifier, modul, injeksi ViewModel dan WorkManager, serta membangun object graph yang mudah diuji."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Dependency Injection Kotlin dengan Hilt

## Pendahuluan

Dependency injection (DI) adalah praktik menyuplai dependensi sebuah objek dari luar, bukan membiarkan objek tersebut membangunnya sendiri. Di Android praktik ini lebih penting daripada di kebanyakan lingkungan lain: framework yang meng-instansiasi activity, fragment, service, dan worker Anda, sehingga konstruktor tidak selalu berada dalam kendali Anda. Object graph yang tidak dikelola dengan baik pun cepat berubah menjadi jalinan service locator, singleton statis, dan god-object yang mustahil diuji.

Hilt adalah pustaka DI ber-opini dari Google untuk Android, dibangun di atas Dagger. Hilt menstandarkan cara komponen Dagger dibuat dan dihubungkan dengan siklus hidup framework Android, sehingga Anda mendapatkan object graph yang terverifikasi saat kompilasi dan bebas refleksi dengan boilerplate jauh lebih sedikit dibanding Dagger mentah. Hilt membangkitkan komponen dan binding saat kompilasi, artinya sebagian besar kesalahan perangkaian tertangkap oleh compiler, bukan saat runtime — properti yang sama bernilainya dengan null safety di ekosistem Kotlin.

Panduan ini mengasumsikan Anda sudah memahami dasar Kotlin dan pengembangan Android dengan Jetpack Compose atau View klasik. Fokusnya adalah keputusan arsitektural yang memisahkan pengaturan Hilt yang terpelihara dari yang rapuh: memilih cakupan komponen yang tepat, menjaga graph tetap asiklik, mengekspresikan kontrak dengan qualifier dan `@Binds`, menginjeksi kelas milik framework seperti `ViewModel`, `WorkManager`, dan service, serta menyusun modul agar graph cepat dibangun dan mudah diuji.

Di akhir panduan Anda akan tahu cara merancang object graph Hilt yang eksplisit, dapat diuji, dan tahan terhadap perubahan — serta kesalahan umum yang diam-diam mengubah pengaturan DI yang bagus menjadi utang teknis.

## Praktik Terbaik

### 1. Kakup Setiap Binding ke Komponen yang Sesuai dengan Umur Objeknya

Hilt menyediakan hierarki komponen tetap: `SingletonComponent`, `ActivityRetainedComponent`, `ViewModelComponent`, `ActivityComponent`, `FragmentComponent`, `ServiceComponent`, `ViewComponent`, dan `WorkerComponent`. Scoping adalah janji tentang umur objek — ia memberi tahu Hilt untuk menjaga satu instance tetap hidup selama komponen hidup. Aturan utamanya adalah mencocokkan scope dengan umur alami dependensi:

- `@Singleton` untuk objek lingkup aplikasi seperti `Retrofit`, `OkHttpClient`, `RoomDatabase`, dan repository yang menyimpan cache data lintas layar.
- `@ViewModelScoped` untuk dependensi yang harus bertahan dari perubahan konfigurasi tetapi dibuang setelah `ViewModel` dibersihkan (repository yang menampung state UI, paging source).
- `@ActivityRetainedScoped` untuk objek yang lebih panjang daripada proses pembuatan ulang activity tetapi ikut hilang bersama state retained activity (jarang dibutuhkan jika Anda sudah memakai `@ViewModelScoped`).
- `@ActivityScoped` / `@FragmentScoped` hanya untuk objek yang benar-benar milik satu layar, misalnya coordinator yang mengelola alur UI yang kompleks.

Kesalahan paling umum adalah scoping berlebihan: menjadikan semua hal `@Singleton` "agar aman". `Retrofit` singleton itu benar, tetapi `CartRepository` singleton yang menyimpan state UI mutable akan membocorkan state dan perilaku antarlayar. Jika ragu, pilih scope tersempit yang memenuhi umur dependensi tersebut.

### 2. Utamakan Injeksi Konstruktor Dibanding Injeksi Field

Injeksi konstruktor adalah cara bawaan dan harus menjadi pilihan pertama untuk setiap kelas milik Anda. Ia membuat dependensi terlihat pada tanda tangan konstruktor, memungkinkan kelas dikonstruksi dalam unit test tanpa framework DI apa pun, dan menjaga kelas tetap jujur — kelas dengan lima parameter konstruktor adalah bau kode yang tidak akan disembunyikan oleh keajaiban binding apa pun.

Injeksi field hanya untuk kelas yang di-instansiasi oleh framework Android: activity, fragment, service, broadcast receiver, dan worker. Kelas-kelas ini tidak bisa menerima injeksi konstruktor karena framework menuntut konstruktor tanpa argumen dan memanggilnya sendiri. Untuk kelas tersebut, beri anotasi `@AndroidEntryPoint` (atau `@HiltWorker`) dan tandai field dengan `@Inject`:

```kotlin
@AndroidEntryPoint
class CheckoutActivity : AppCompatActivity() {

  @Inject
  lateinit var checkoutRepository: CheckoutRepository
}
```

Jaga permukaan injeksi field tetap tipis: activity atau fragment sebaiknya hanya meneruskan ke `ViewModel`. Jika Anda menginjeksi lima field atau lebih ke satu layar, ekstrak `@HiltViewModel` dan pindahkan perangkaiannya ke sana.

### 3. Gunakan Qualifier untuk Membedakan Kontrak Bertipe Sama

Ketika dua binding berbagi tipe yang sama, Hilt tidak bisa memilih di antara keduanya. Contoh klasiknya adalah dua instance `Retrofit` — satu untuk API publik dan satu untuk service internal terautentikasi — atau beberapa instance `CoroutineDispatcher` untuk dispatcher yang berbeda. Jangan pernah mengakalinya dengan membuat tipe yang berbeda (misalnya kelas pembungkus `PublicApiRetrofit`); ekspresikan maksudnya dengan anotasi qualifier:

```kotlin
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class PublicApi

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class InternalApi
```

Qualifier ikut terbawa pada binding dan titik injeksi, sehingga modul dan pemakainya tetap mudah dibaca, dan compiler memverifikasi bahwa qualifier-nya cocok.

### 4. Petakan Antarmuka dengan `@Binds`, Dependensi Pihak Ketiga dengan `@Provides`

Ada dua gaya modul di Hilt, dan memilih gaya yang tepat membuat modul tetap kecil dan jelas:

- `@Binds` — metode modul abstrak yang memberi tahu Hilt implementasi *mana* yang dipakai untuk sebuah antarmuka. Ini cara idiomatis untuk mengikat abstraksi milik Anda sendiri:
```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

  @Binds
  @Singleton
  abstract fun bindCartDataSource(impl: CartRepository): CartDataSource
}
```

- `@Provides` — metode konkret yang mengonstruksi dependensi yang tidak diketahui cara pembuatannya oleh Hilt: kelas pihak ketiga (`Retrofit`, `OkHttpClient`, `RoomDatabase`) dan nilai yang membutuhkan konteks runtime (`CoroutineDispatcher`, `Gson`).

Daftar parameter metode `@Provides` itu sendiri adalah bagian dari graph — Anda bisa meminta `OkHttpClient` di metode `provideRetrofit` dan Hilt menyelesaikannya dari binding lain. Jaga setiap modul tetap kohesif: satu modul per tanggung jawab (networking, persistensi, dispatcher), bukan satu `AppModule` raksasa dengan tiga puluh metode.

### 5. Jaga Graph Tetap Asiklik dan Eksplisit

Graph Dagger/Hilt adalah graph terarah dari dependensi, dan ia harus asiklik — siklus seperti `A → B → A` adalah galat kompilasi. Konsekuensi praktisnya layak diinternalisasi:

- Hindari metode `@Provides` yang mengonstruksi objek secara manual padahal Hilt bisa merakitnya sendiri. Merangkai satu objek dengan tangan tidak apa-apa; merangkai rantai lima objek adalah tanda Anda meniru graph dengan tangan dan perlahan akan menyimpang darinya.
- Hindari jalan keluar service locator. Kelas yang meraih dependensinya dari registry global (objek `ServiceLocator.instance`, `CompositionLocal`, atau singleton statis) adalah kelas yang tidak bisa diuji terpisah, karena dependensinya datang melalui saluran tersembunyi.
- Jangan menginjeksi `ViewModelStoreOwner`, `FragmentManager`, atau objek framework berumur pendek lainnya ke singleton berumur panjang. Menangkap fragment di dalam `@Singleton` adalah kebocoran memori secara konstruksi.

Graph seharusnya terbaca seperti peta arsitektur Anda. Jika tidak, arsitektur — bukan framework DI — yang perlu diubah.

### 6. Injeksi Argumen Runtime dengan Assisted Injection

Beberapa dependensi tidak bisa dihasilkan oleh graph sendirian karena membutuhkan argumen yang hanya ada saat runtime: `Worker` menerima `WorkerParameters`, `PagingSource` menerima ukuran halaman, layar detail menerima ID item. Untuk kasus ini, gunakan assisted injection:

```kotlin
class ProductPagingSource @AssistedInject constructor(
  private val productApi: ProductApi,
  @Assisted private val categoryId: String,
  @Assisted private val pageSize: Int,
) : PagingSource<Int, Product>()
```

Bagian statis dari dependensi datang dari graph; bagian runtime diteruskan di titik pemanggilan melalui factory yang dibangkitkan. Ini menjaga objek tetap berada di dalam graph (dan karenanya dapat diuji dengan fake yang sama) alih-alih memaksa Anda mengonstruksinya secara manual di luar graph.

### 7. Buat Graph Dapat Diuji dengan `@UninstallModules` dan `@TestInstallIn`

Pembayaran dari DI adalah keterujian, dan API pengujian Hilt yang mengantarkannya. Dalam tes instrumentasi, `@UninstallModules` menghapus modul asli dari komponen dan `@TestInstallIn` menggantinya dengan modul fake, sehingga tes menjalankan kode produksi asli dengan data source palsu tanpa menyentuh satu baris pun kode produksi:

```kotlin
@UninstallModules(RepositoryModule::class)
@TestInstallIn(
  components = [SingletonComponent::class],
  replaces = RepositoryModule::class,
)
@Module
object FakeRepositoryModule {

  @Provides
  @Singleton
  fun provideCartDataSource(): CartDataSource = FakeCartDataSource()
}
```

Rancang modul dan antarmuka khusus agar pertukaran ini cukup satu baris: injeksi antarmuka, bukan kelas konkret, pada batas yang menyentuh jaringan atau disk.

### 8. Utamakan KSP, Kunci Versi, dan Jaga Modul Tetap Kecil

Hilt secara historis membutuhkan KAPT, tetapi versi Hilt terbaru mendukung KSP yang jauh lebih cepat. Gunakan KSP jika versi Hilt Anda mengizinkannya:

```kotlin
plugins {
  alias(libs.plugins.hilt)
  id("com.google.devtools.ksp")
}

dependencies {
  implementation(libs.hilt.android)
  ksp(libs.hilt.compiler)
}
```

Karena Hilt membangkitkan kode saat kompilasi, waktu build ikut tumbuh seiring ukuran graph. Modul besar yang tidak teratur memperlambat setiap build dan membuat galat kompilasi sulit dibaca. Kunci versi Hilt, KSP, dan Android Gradle Plugin di version catalog, lalu tingkatkan sebagai satu kesatuan — versi yang tidak cocok adalah sumber galat "unexpected element" yang sering tidak jelas. Jaga modul cukup kecil sehingga stack trace galat kompilasi menunjuk ke satu tanggung jawab.

## Langkah Implementasi

### Langkah 1: Tambahkan Plugin dan Dependensi Hilt

Tambahkan plugin Gradle Hilt dan plugin KSP. Pengaturan terbersih menggunakan version catalog:

```toml
# gradle/libs.versions.toml
[versions]
hilt = "2.51.1"
ksp = "2.0.21-1.0.27"

[libraries]
hilt-android = { module = "com.google.dagger:hilt-android", version.ref = "hilt" }
hilt-compiler = { module = "com.google.dagger:hilt-compiler", version.ref = "hilt" }
hilt-testing = { module = "com.google.dagger:hilt-android-testing", version.ref = "hilt" }

[plugins]
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

```kotlin
// settings.gradle.kts
plugins {
  id("com.google.dagger.hilt.android") version "2.51.1" apply false
}
```

```kotlin
// app/build.gradle.kts
plugins {
  alias(libs.plugins.hilt)
  id("com.google.devtools.ksp")
}

android {
  // compileSdk, minSdk, dan targetSdk tetap seperti konfigurasi Anda
}

dependencies {
  implementation(libs.hilt.android)
  ksp(libs.hilt.compiler)

  // Tes instrumentasi yang memakai @HiltAndroidTest
  androidTestImplementation(libs.hilt.testing)
  kspAndroidTest(libs.hilt.compiler)
}
```

Sinkronkan proyek dan pastikan kedua plugin terpasang sebelum melanjutkan — plugin yang hilang muncul sebagai `unresolved reference: HiltAndroidApp` pada import pertama.

### Langkah 2: Buat Kelas Application dan Aktifkan Hilt

Hilt membutuhkan komponen tingkat aplikasi. Buat subclass `Application` dengan anotasi `@HiltAndroidApp` dan daftarkan di manifest:

```kotlin
// ShopApp.kt
@HiltAndroidApp
class ShopApp : Application()
```

```xml
<!-- AndroidManifest.xml -->
<application
    android:name=".ShopApp"
    android:label="@string/app_name"
    android:theme="@style/Theme.Shop">
  <!-- activity dan service -->
</application>
```

`@HiltAndroidApp` memicu pembangkitan kode Hilt: ia menciptakan `SingletonComponent` akar beserta kelas application induknya. Setiap komponen lain di aplikasi menurun dari komponen ini.

### Langkah 3: Injeksi Kelas Milik Anda dengan Injeksi Konstruktor

Untuk kelas milik Anda, tambahkan `@Inject` ke konstruktor dan biarkan Hilt merakit sisanya. Lapisan repository adalah target pertama yang wajar:

```kotlin
class CartRepository @Inject constructor(
  private val remoteDataSource: CartRemoteDataSource,
  private val localDataSource: CartLocalDataSource,
  @IoDispatcher private val ioDispatcher: CoroutineDispatcher,
) {

  suspend fun loadCart(): List<CartItem> {
    val cached = localDataSource.load()
    return if (cached.isNotEmpty()) {
      cached
    } else {
      remoteDataSource.load().also { localDataSource.save(it) }
    }
  }
}
```

Hilt menelusuri daftar parameter konstruktor dan menyelesaikan setiap parameter dari graph. Jika sebuah parameter tidak bisa disediakan, build langsung gagal dengan galat `Dagger/MissingBinding` yang menyebutkan tipe yang hilang — perbaiki galatnya saat kompilasi, jangan pernah dengan memanggil `get()` manual.

### Langkah 4: Definisikan Modul untuk Dependensi Pihak Ketiga

Kelas pihak ketiga dan nilai yang membutuhkan konteks runtime tidak bisa memakai injeksi konstruktor, sehingga mereka berada dalam metode `@Provides` di dalam kelas `@Module` dengan target `@InstallIn`:

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

  @Provides
  @Singleton
  fun provideOkHttpClient(
    @ApplicationContext context: Context,
  ): OkHttpClient = OkHttpClient.Builder()
    .connectTimeout(15, TimeUnit.SECONDS)
    .build()

  @Provides
  @Singleton
  fun provideRetrofit(client: OkHttpClient): Retrofit =
    Retrofit.Builder()
      .baseUrl("https://api.example.com/")
      .client(client)
      .addConverterFactory(MoshiConverterFactory.create())
      .build()
}
```

Perhatikan dua detail. Pertama, `@ApplicationContext` adalah qualifier bawaan yang menyediakan `Context` aplikasi — jangan pernah meneruskan context activity ke dependensi singleton. Kedua, `provideRetrofit` meminta `OkHttpClient` sebagai parameter; Hilt menyelesaikannya dari `provideOkHttpClient`, yang memperlihatkan bagaimana modul-modul tersusun menjadi satu graph.

Dispatcher adalah binding bertipe nilai yang umum dan tempat paling tepat untuk berlatih qualifier:

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object DispatcherModule {

  @Provides
  @IoDispatcher
  fun provideIoDispatcher(): CoroutineDispatcher = Dispatchers.IO

  @Provides
  @DefaultDispatcher
  fun provideDefaultDispatcher(): CoroutineDispatcher = Dispatchers.Default
}
```

### Langkah 5: Rangkai ViewModel dan Layar Compose

ViewModel adalah titik integrasi utama antara graph dan lapisan UI. Beri anotasi `@HiltViewModel` pada ViewModel dan pindahkan semua dependensi layar ke konstruktornya:

```kotlin
@HiltViewModel
class CartViewModel @Inject constructor(
  private val cartRepository: CartRepository,
) : ViewModel() {

  val cartUiState: StateFlow<CartUiState> = cartRepository.cart
    .map { CartUiState.Loaded(it) }
    .stateIn(
      scope = viewModelScope,
      started = SharingStarted.WhileSubscribed(5_000),
      initialValue = CartUiState.Loading,
    )
}
```

Konsumsi dari Compose dengan `hiltViewModel()` dan dari activity klasik dengan `by viewModels()`:

```kotlin
@Composable
fun CartRoute(
  viewModel: CartViewModel = hiltViewModel(),
) {
  val state by viewModel.cartUiState.collectAsStateWithLifecycle()
  when (state) {
    is CartUiState.Loading -> LoadingIndicator()
    is CartUiState.Loaded -> CartScreen((state as CartUiState.Loaded).items)
  }
}
```

```kotlin
@AndroidEntryPoint
class CartActivity : ComponentActivity() {

  private val viewModel: CartViewModel by viewModels()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      CartRoute()
    }
  }
}
```

`@AndroidEntryPoint` wajib ada di setiap activity dan fragment yang berpartisipasi dalam injeksi — melupakannya menghasilkan galat bergaya "cannot be provided without an @Provides-annotated method" yang menunjuk ke dependensi padahal sumber masalahnya adalah entry point yang hilang.

### Langkah 6: Injeksi ke Kelas Milik Framework

Worker, service, dan content provider di-instansiasi oleh framework, sehingga mereka membutuhkan anotasi khusus Hilt.

Untuk `WorkManager`, gunakan `@HiltWorker` dengan konstruktor `@AssistedInject`. Parameter worker bersifat assisted (disediakan saat runtime) sementara dependensi domain datang dari graph:

```kotlin
@HiltWorker
class SyncCartWorker @AssistedInject constructor(
  @Assisted appContext: Context,
  @Assisted workerParams: WorkerParameters,
  private val cartRepository: CartRepository,
) : CoroutineWorker(appContext, workerParams) {

  override suspend fun doWork(): Result {
    return try {
      cartRepository.sync()
      Result.success()
    } catch (error: IOException) {
      Result.retry()
    }
  }
}
```

Jangan lupa mengaktifkan `HiltWorkerFactory` di kelas Application Anda:

```kotlin
@HiltAndroidApp
class ShopApp : Application(), Configuration.Provider {

  @Inject
  lateinit var workerFactory: HiltWorkerFactory

  override val workManagerConfiguration: Configuration
    get() = Configuration.Builder()
      .setWorkerFactory(workerFactory)
      .build()
}
```

Untuk `Service` latar depan, beri anotasi `@AndroidEntryPoint` dan gunakan injeksi field. `ContentProvider` adalah satu-satunya kelas framework yang tidak bisa dianotasi langsung — jaga provider tetap tipis dan alihkan pekerjaan sesungguhnya ke komponen yang diinjeksi atau holder tingkat aplikasi.

### Langkah 7: Bangun Graph yang Dapat Diuji

Ganti modul asli dengan fake di tes instrumentasi sehingga kode produksi dijalankan tanpa perubahan. Pertama atur test runner di build script:

```kotlin
android {
  defaultConfig {
    testInstrumentationRunner = "com.google.android.testing.hilt.HiltTestRunner"
  }
}
```

Lalu tulis modul fake dan tesnya:

```kotlin
@UninstallModules(RepositoryModule::class)
@TestInstallIn(
  components = [SingletonComponent::class],
  replaces = RepositoryModule::class,
)
@Module
object FakeRepositoryModule {

  @Provides
  @Singleton
  fun provideCartDataSource(): CartDataSource = FakeCartDataSource()
}
```

```kotlin
@HiltAndroidTest
class CartRepositoryTest {

  @get:Rule
  val hiltRule = HiltAndroidRule(this)

  @Inject
  lateinit var cartRepository: CartRepository

  @Before
  fun setUp() {
    hiltRule.inject()
  }

  @Test
  fun cartLoadsFromFakeDataSource() = runTest {
    val cart = cartRepository.loadCart()

    assertEquals(FAKE_CART_ITEMS, cart)
  }
}
```

Tes menginjeksi `CartRepository` asli — hanya data source yang diganti. Itulah properti yang harus dioptimalkan: celah antarmodul adalah tempat fake dipasang.

### Langkah 8: Verifikasi Graph dan Debug Galat Umum

Jalankan pipeline verifikasi penuh — graph diperiksa tipenya saat kompilasi, sehingga build yang bersih bermakna:

```bash
./gradlew assembleDebug kspDebugKotlin lintDebug
```

Saat build gagal, petakan pesannya ke penyebabnya:

- `Dagger/MissingBinding: cannot be provided without an @Provides-annotated method` — tipe tidak punya binding. Tambahkan metode `@Provides` atau konstruktor `@Inject`, atau periksa apakah nama kelas di galat sesuai tipe aslinya (salah ketik pada parameter modul menghasilkan galat persis seperti ini).
- `Dagger/Injection: @Inject field ... suggests a @Inject constructor...` — kelas mencampur injeksi konstruktor dan field, atau field diinjeksi ke kelas tanpa `@AndroidEntryPoint`.
- `[Dagger/DependencyCycle]` — graph mengandung siklus; pecahkan dengan menghapus salah satu dependensi timbal balik, biasanya dengan menginjeksi abstraksi alih-alih pasangan konkretnya.
- Galat ketidakcocokan scope — dependensi yang di-scope ke `SingletonComponent` tidak bisa diinjeksi ke `FragmentComponent`; galatnya menyebutkan scope dan komponennya sekaligus, dan perbaikannya biasanya menurunkan scope ke komponen leluhur.

Verifikasi komposisi dengan pembacaan yang disengaja: mintalah graph dalam lingkup tes kecil atau andalkan kelas members-injector yang dibangkitkan di `build/generated/ksp` — membaca kelas `Hilt_*` yang dibangkitkan adalah cara tercepat untuk memastikan binding mana yang benar-benar diselesaikan Hilt. Build yang bersih plus rangkaian tes yang lulus adalah kondisi akhir: graph berhasil dikompilasi, fake bertukar dengan mulus, dan kode produksi tidak pernah mengonstruksi dependensi dengan tangan.

---
title: "Cheat Sheet Pengujian dan Mocking Kotlin"
description: "Panduan referensi cepat untuk menguji kode Kotlin — JUnit 5, Kotest, MockK, test dispatcher coroutine, Turbine untuk asersi Flow, uji UI Compose, dan cakupan Kover."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Pengujian dan Mocking Kotlin

## Tabel Referensi Cepat

| Aksi | Kode | Deskripsi |
|------|------|-----------|
| Mendeklarasikan unit test | `@Test fun` | Anotasi JUnit 5 yang menandai sebuah fungsi sebagai kasus uji |
| Mengelompokkan test terkait | `@Nested inner class` | Menyusun kelas uji di dalam kelas induk agar setup bersama dan penamaan tetap rapi |
| Melewati test untuk sementara | `@Disabled("alasan")` | Pengganti anotasi `@Ignore` JUnit 4 pada JUnit 5 |
| Menjalankan test dengan banyak input | `@ParameterizedTest` + `@MethodSource` | Memasok aliran argumen ke satu isi test |
| Menjalankan test suspend | `runTest { }` | Builder `kotlinx-coroutines-test` yang melewati delay nyata memakai jam virtual |
| Mengganti dispatcher utama | `Dispatchers.setMain(StandardTestDispatcher())` | Menukar `Dispatchers.Main` agar test ViewModel berjalan di JVM |
| Memulihkan dispatcher utama | `Dispatchers.resetMain()` | Membersihkan dispatcher test di `@AfterEach` |
| Memajukan waktu virtual | `advanceTimeBy(1_000)` | Menggeser jam scheduler tanpa benar-benar tidur |
| Membuat mock ketat | `mockk<Repository>()` | Mock MockK yang gagal ketika ada pemanggilan tanpa stub |
| Membuat mock longgar | `mockk<Repository>(relaxed = true)` | Mock yang mengembalikan nilai default untuk pemanggilan tanpa stub |
| Membungkus objek asli | `spyk(realService)` | Mock parsial yang mendelegasikan ke implementasi asli kecuali sudah di-stub |
| Menyiapkan stub | `every { repo.load() } returns data` | Menetapkan nilai balik untuk pemanggilan yang cocok |
| Menyiapkan stub fungsi suspend | `coEvery { repo.load() } returns data` | Varian MockK untuk fungsi suspending |
| Stub dengan lambda | `every { repo.load() } answers { data }` | Menghitung nilai balik secara lazy pada setiap pemanggilan |
| Melempar dari stub | `every { repo.load() } throws IOException()` | Mensimulasikan dependensi yang gagal |
| Memverifikasi pemanggilan | `verify(exactly = 1) { repo.load() }` | Memastikan berapa kali sebuah pemanggilan terjadi |
| Memverifikasi urutan | `verifyOrder { first(); second() }` | Memastikan pemanggilan terjadi dalam urutan tertentu |
| Menangkap argumen | `val slot = slot<String>()` + `capture(slot)` | Merekam argumen yang dikirim ke stub untuk diperiksa kemudian |
| Menguji Flow | `flow.test { awaitItem() }` | Ekstensi Turbine yang mengumpulkan emisi ke dalam scope test |
| Memastikan penyelesaian | `flow.test { awaitComplete() }` | Matcher Turbine untuk flow yang berakhir normal |
| Memastikan kegagalan | `flow.test { awaitError() }` | Matcher Turbine untuk flow yang melempar error |
| Menguji UI Compose | `composeTestRule.setContent { }` | Merender composable di dalam host test instrumented atau Robolectric |
| Mencari node Compose | `onNodeWithText("Simpan")` | Selektor berbasis semantics dari library pengujian Compose |
| Memeriksa status node | `assertIsEnabled()` | Helper asersi Compose yang membaca pohon semantics |
| Memakai jam test | `mainClock.advanceTimeBy(500)` | Menjalankan animasi dan delay pada test Compose |
| Menguji DAO Room | `Room.inMemoryDatabaseBuilder(...)` | Membuat database sekali pakai yang tidak menyentuh disk |
| Memastikan exception | `assertFailsWith<IllegalStateException> { }` | Asersi Kotest yang mengembalikan exception yang tertangkap |
| Mengukur cakupan | `./gradlew koverHtmlReport` | Menghasilkan laporan cakupan HTML dengan plugin Kover |
| Menjalankan unit test JVM | `./gradlew testDebugUnitTest` | Menjalankan source set `src/test` untuk varian debug |
| Menjalankan test instrumented | `./gradlew connectedDebugAndroidTest` | Menjalankan source set `src/androidTest` di perangkat atau emulator |

## Perintah Umum

### Menambahkan Dependensi Pengujian

```kotlin
// app/build.gradle.kts
dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    testImplementation("io.kotest:kotest-assertions-core:5.9.0")
    testImplementation("io.mockk:mockk:1.13.11")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    testImplementation("app.cash.turbine:turbine:1.1.0")

    // Helper khusus Android
    testImplementation("androidx.arch.core:core-testing:2.2.0")
    testImplementation("org.robolectric:robolectric:4.12.2")

    // Uji UI Compose
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.6.8")
    debugImplementation("androidx.compose.ui:ui-test-manifest:1.6.8")

    // Runner test AndroidX yang instrumented
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
```

```kotlin
// app/build.gradle.kts — mengaktifkan platform JUnit 5 di Android
android {
    testOptions {
        unitTests.all {
            it.useJUnitPlatform()
        }
    }
}
```

### Menjalankan Unit Test

```bash
# Menjalankan semua unit test JVM untuk varian debug
./gradlew testDebugUnitTest

# Menjalankan satu kelas test
./gradlew testDebugUnitTest --tests "com.example.CartViewModelTest"

# Menjalankan satu metode test
./gradlew testDebugUnitTest --tests "com.example.CartViewModelTest.addsItemToCart"

# Menjalankan semua test yang namanya cocok dengan pola
./gradlew testDebugUnitTest --tests "*RepositoryTest"

# Mengulang hanya test yang gagal pada eksekusi terakhir
./gradlew testDebugUnitTest --rerun-tasks
```

### Menjalankan Test Instrumented dan Compose

```bash
# Menjalankan test instrumented di perangkat atau emulator yang terhubung
./gradlew connectedDebugAndroidTest

# Menjalankan satu kelas test instrumented
./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.example.CheckoutFlowTest

# Menjalankan uji UI Compose di JVM melalui Robolectric
./gradlew testDebugUnitTest --tests "*ComposeUiTest"
```

### Menghasilkan Laporan Cakupan dengan Kover

```kotlin
// app/build.gradle.kts
plugins {
    id("org.jetbrains.kotlinx.kover") version "0.8.0"
}

koverReport {
    defaults {
        verify {
            rule {
                minBound(80)
            }
        }
    }
}
```

```bash
# Membuat laporan cakupan HTML
./gradlew koverHtmlReport

# Membuat laporan XML untuk diolah CI
./gradlew koverXmlReport

# Menggagalkan build ketika cakupan turun di bawah ambang yang dikonfigurasi
./gradlew koverVerify

# Lokasi laporan setelah eksekusi berhasil
# app/build/reports/kover/html/index.html
```

### Memfilter, Mendebug, dan Menjaga Kebersihan Test

```bash
# Menampilkan detail kegagalan dan stack trace
./gradlew testDebugUnitTest --info

# Memaksa ulang eksekusi seluruh test dari kondisi bersih
./gradlew clean testDebugUnitTest

# Memindai source test untuk sisa pernyataan debug sebelum review
grep -RIn -e "println(" -e "TODO(" app/src/test app/src/androidTest
```

```kotlin
// Menampilkan standard output test di konsol Gradle
tasks.withType<Test> {
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = true
    }
}
```

## Potongan Kode

### Test JUnit 5 Dasar

```kotlin
class MoneyTest {

    @Test
    fun `menjumlahkan dua nominal dengan mata uang sama`() {
        val total = Money.of(1_000, "IDR") + Money.of(2_500, "IDR")

        assertEquals(Money.of(3_500, "IDR"), total)
    }

    @BeforeEach
    fun setUp() {
        // Berjalan sebelum setiap test di kelas ini
    }

    @AfterEach
    fun tearDown() {
        // Berjalan setelah setiap test, bahkan ketika test gagal
    }
}
```

### Test Berparameter

```kotlin
class DiscountTest {

    @ParameterizedTest(name = "keranjang berisi {0} item mendapat diskon {1}%")
    @CsvSource("1, 0", "5, 5", "10, 12")
    fun `menerapkan diskon bertingkat`(items: Int, expectedPercent: Int) {
        val discount = DiscountPolicy.forItemCount(items)

        assertEquals(expectedPercent, discount.percent)
    }

    @ParameterizedTest
    @MethodSource("invalidAmounts")
    fun `menolak nominal nol atau negatif`(amount: Long) {
        assertThrows<IllegalArgumentException> { Money.of(amount, "IDR") }
    }

    companion object {
        @JvmStatic
        fun invalidAmounts() = Stream.of(0L, -1L, -99L)
    }
}
```

### Gaya Spec Kotest

```kotlin
// StringSpec — gaya paling ringkas untuk perilaku kecil
class ValidatorSpec : StringSpec({
    "menerima kata sandi yang kuat" {
        PasswordValidator.isValid("Tr0ub4dor&3") shouldBe true
    }

    "menolak kata sandi yang terlalu pendek" {
        PasswordValidator.isValid("abc") shouldBe false
    }
})

// BehaviorSpec — penamaan given / when / then untuk test bergaya use case
class CheckoutSpec : BehaviorSpec({
    given("keranjang kosong") {
        `when`("pengguna melakukan checkout") {
            then("pesanan ditolak") {
                shouldThrow<IllegalStateException> { CheckoutService.checkout(emptyCart) }
            }
        }
    }
})

// FunSpec dengan beforeEach untuk setup bersama
class CartSpec : FunSpec({
    lateinit var cart: Cart

    beforeEach { cart = Cart() }

    test("dimulai dalam keadaan kosong") {
        cart.items shouldBe emptyList()
    }
})
```

### Asersi dan Matcher

```kotlin
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldStartWith

val receipt = buildReceipt(order)

receipt.total shouldBe 42_000
receipt.id shouldStartWith "ORD-"
receipt.lines shouldContainExactly listOf("espresso", "croissant")
```

```kotlin
// Soft assertion mengumpulkan semua kegagalan alih-alih berhenti di yang pertama
assertSoftly {
    receipt.total shouldBe 42_000
    receipt.currency shouldBe "IDR"
    receipt.lines.size shouldBe 2
}

// Memastikan exception lalu memeriksa isinya
val error = shouldThrow<ValidationException> { parse("") }
error.field shouldBe "payload"
```

### Mocking dengan MockK

```kotlin
class OrderViewModelTest {

    private val repository = mockk<OrderRepository>()
    private val analytics = mockk<Analytics>(relaxed = true)

    @Test
    fun `menampilkan pesanan dari repositori`() = runTest {
        every { repository.orders() } returns flowOf(Order("ORD-1"), Order("ORD-2"))

        val viewModel = OrderViewModel(repository, analytics)

        viewModel.state.value.orders shouldHaveSize 2
    }

    @Test
    fun `menampilkan kegagalan pemuatan`() = runTest {
        coEvery { repository.refresh() } throws IOException("jaringan mati")

        val viewModel = OrderViewModel(repository, analytics)
        viewModel.refresh()

        viewModel.state.value.error shouldBe "jaringan mati"
    }
}
```

### Memverifikasi Pemanggilan dan Menangkap Argumen

```kotlin
@Test
fun `mencatat produk yang diketuk tepat satu kali`() {
    val slot = slot<Product>()
    every { analytics.trackProductView(capture(slot)) } just Runs

    viewModel.onProductTapped(product)

    verify(exactly = 1) { analytics.trackProductView(any()) }
    slot.captured.id shouldBe product.id
    confirmVerified(analytics)
}
```

```kotlin
@Test
fun `memanggil koordinator sesuai urutan`() {
    verifyOrder {
        cache.put(any(), any())
        remote.upload(any())
    }

    verify(atLeast = 1) { cache.put(any(), any()) }
    verify(atMost = 2) { remote.upload(any()) }
    verify { cache.put(any(), any()); remote.upload(any()) }
}
```

### Mock Longgar, Parsial, dan Konstruktor

```kotlin
// Mock longgar mengembalikan default; tambahkan stub ketika hanya satu pemanggilan yang penting
val logger = mockk<Logger>(relaxed = true)
val clock = mockk<Clock> { every { now() } returns Instant.parse("2026-01-01T00:00:00Z") }

// Mock parsial — implementasi asli berjalan kecuali pemanggilan yang di-stub
val cache = spyk(InMemoryCache())
every { cache.hitRate() } returns 0.75

// Mocking konstruktor menghindari kebutuhan akan konstruktor tanpa argumen
val client = mockkConstructor(HttpClient::class)
every { anyConstructed<HttpClient>().get(any()) } returns "{}"

// Reset stub di antara kasus uji ketika fixture dipakai bersama
@AfterEach
fun tearDown() {
    clearAllMocks()
}
```

### Menguji Fungsi Suspend dan Coroutine

```kotlin
class PricingEngineTest {

    @Test
    fun `menghitung total untuk pesanan besar`() = runTest {
        val engine = PricingEngine(surchargeApi = mockk(relaxed = true))

        val total = engine.total(items = 120)

        total shouldBe 1_450_000
    }

    @Test
    fun `membatalkan permintaan ketika pemanggil timeout`() = runTest {
        val repo = mockk<SlowRepository>()
        coEvery { repo.fetch(any()) } coAnswers {
            delay(10_000)
            emptyList()
        }

        val fast = withTimeoutOrNull(1_000) { repo.fetch("all") }

        fast shouldBe null
    }
}
```

### Dispatcher di Dalam Test

```kotlin
@Test
fun `memuat profil saat dimulai`() = runTest {
    Dispatchers.setMain(StandardTestDispatcher(testScheduler))

    val viewModel = ProfileViewModel(repository = mockk(relaxed = true))
    viewModel.start()

    advanceUntilIdle()

    viewModel.state.value.isLoading shouldBe false

    Dispatchers.resetMain()
}
```

```kotlin
// Extension JUnit 5 menjaga penukaran dispatcher tetap di luar isi test
class MainDispatcherExtension : BeforeEachCallback, AfterEachCallback {

    override fun beforeEach(context: ExtensionContext) {
        Dispatchers.setMain(StandardTestDispatcher())
    }

    override fun afterEach(context: ExtensionContext) {
        Dispatchers.resetMain()
    }
}

@ExtendWith(MainDispatcherExtension::class)
class ProfileViewModelTest {
    // Test di sini tidak pernah menyentuh Dispatchers.Main secara manual
}
```

```kotlin
// Suntikkan dispatcher alih-alih menulis Dispatchers.IO secara langsung
class ProfileRepository(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    suspend fun load(id: String): Profile = withContext(ioDispatcher) { api.profile(id) }
}
```

### Menguji Flow dengan Turbine

```kotlin
@Test
fun `memancarkan loading lalu hasil`() = runTest {
    val repository = mockk<ProfileRepository>()
    coEvery { repository.profile("42") } returns profile

    repository.profileFlow("42").test {
        awaitItem() shouldBe ProfileState.Loading
        awaitItem() shouldBe ProfileState.Success(profile)
        awaitComplete()
    }
}
```

```kotlin
@Test
fun `state flow memperlihatkan pengguna saat ini setelah login`() = runTest {
    val store = SessionStore()

    store.state.test {
        awaitItem() shouldBe SessionState.SignedOut

        store.login(user)
        awaitItem() shouldBe SessionState.SignedIn(user)

        cancelAndIgnoreRemainingEvents()
    }
}

@Test
fun `aliran yang gagal melaporkan error`() = runTest {
    val repo = mockk<ProfileRepository>()
    coEvery { repo.profile(any()) } throws IOException("offline")

    repo.profileFlow("42").test {
        awaitItem() shouldBe ProfileState.Loading
        awaitError().message shouldBe "offline"
    }
}
```

### Fake sebagai Pengganti Mock di Batas Repositori

```kotlin
class FakeOrderRepository(
    private val seed: MutableList<Order> = mutableListOf()
) : OrderRepository {

    var shouldFail = false

    override suspend fun orders(): List<Order> {
        if (shouldFail) throw IOException("offline")
        return seed.toList()
    }

    override suspend fun save(order: Order) {
        seed += order
    }
}

@Test
fun `menyimpan pesanan lalu memuatnya kembali`() = runTest {
    val repository = FakeOrderRepository()

    repository.save(Order("ORD-9"))
    repository.orders() shouldHaveSize 1
}
```

### Menguji ViewModel Secara Menyeluruh

```kotlin
class CartViewModelTest {

    private val repository = FakeOrderRepository()

    @Test
    fun `menambahkan item dan memperbarui total`() = runTest(StandardTestDispatcher()) {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CartViewModel(repository)

        viewModel.addItem(Product("espresso", 18_000))
        advanceUntilIdle()

        viewModel.state.value.items shouldHaveSize 1
        viewModel.state.value.total shouldBe 18_000

        Dispatchers.resetMain()
    }
}
```

### Uji UI Compose

```kotlin
class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `mengirim kredensial yang diketik pengguna`() {
        var submitted: Credentials? = null

        composeTestRule.setContent {
            LoginScreen(onSubmit = { submitted = it })
        }

        composeTestRule.onNodeWithText("Email").performTextInput("bahrul@example.com")
        composeTestRule.onNodeWithText("Password").performTextInput("hunter2")
        composeTestRule.onNodeWithText("Masuk").performClick()

        composeTestRule.runOnIdle {
            submitted shouldBe Credentials("bahrul@example.com", "hunter2")
        }
    }
}
```

```kotlin
@Test
fun `indikator progres tersembunyi setelah pemuatan selesai`() {
    composeTestRule.setContent { OrderListScreen(state = OrderListUiState.Empty) }

    composeTestRule.onNodeWithTag("loading").assertDoesNotExist()
    composeTestRule.onNodeWithText("Belum ada pesanan").assertIsDisplayed()
}

@Test
fun `tombol nonaktif sampai formulir valid`() {
    composeTestRule.setContent { CheckoutScreen() }

    composeTestRule.onNodeWithText("Bayar").assertIsNotEnabled()
    composeTestRule.onNodeWithText("Nomor kartu").performTextInput("4242424242424242")
    composeTestRule.onNodeWithText("Bayar").assertIsEnabled()
}
```

```kotlin
@Test
fun `snackbar memajukan jam animasinya`() {
    composeTestRule.mainClock.autoAdvance = false
    composeTestRule.setContent { SnackbarHost(show = true) }

    composeTestRule.mainClock.advanceTimeBy(600)

    composeTestRule.onNodeWithText("Tersimpan").assertIsDisplayed()
}
```

### Menguji DAO Room

```kotlin
@RunWith(AndroidJUnit4::class)
class OrderDaoTest {

    private lateinit var database: AppDatabase
    private lateinit var dao: OrderDao

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).allowMainThreadQueries().build()

        dao = database.orderDao()
    }

    @After
    fun tearDown() = database.close()

    @Test
    fun `mengembalikan pesanan terurut berdasarkan waktu pembuatan`() = runTest {
        dao.insert(Order("ORD-2", createdAt = 2))
        dao.insert(Order("ORD-1", createdAt = 1))

        dao.observeAll().first().map { it.id } shouldContainExactly listOf("ORD-1", "ORD-2")
    }
}
```

### Builder Data Test

```kotlin
// Nilai default membuat test tetap singkat, argumen bernama memperjelas maksudnya
fun buildOrder(
    id: String = "ORD-1",
    total: Long = 42_000,
    status: OrderStatus = OrderStatus.Pending
) = Order(id = id, total = total, status = status)

@Test
fun `hanya pesanan pending yang bisa dibatalkan`() {
    buildOrder(status = OrderStatus.Pending).canCancel() shouldBe true
    buildOrder(status = OrderStatus.Shipped).canCancel() shouldBe false
}
```

### Menguji Komponen Android dengan Robolectric

```kotlin
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SettingsActivityTest {

    @Test
    fun `menampilkan tema tersimpan saat dibuka`() {
        val activity = Robolectric.buildActivity(SettingsActivity::class.java).setup().get()

        val label = activity.findViewById<TextView>(R.id.themeLabel)

        label.text.toString() shouldBe "Ikuti sistem"
    }
}
```

```kotlin
// Waktu coroutine di dalam Robolectric dapat dipatok ke main looper
@Test
fun `menunda input pencarian`() = runTest {
    val scheduler = TestCoroutineScheduler()
    val dispatcher = StandardTestDispatcher(scheduler)
    val search = SearchController(dispatcher)

    search.query("esp")
    scheduler.advanceTimeBy(299)
    search.results.value shouldBe emptyList()

    search.query("espr")
    scheduler.advanceTimeBy(301)
    search.results.value shouldNotBe emptyList()
}
```

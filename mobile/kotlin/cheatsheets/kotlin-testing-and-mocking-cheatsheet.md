---
title: "Kotlin Testing and Mocking Cheatsheet"
description: "A quick reference for testing Kotlin code — JUnit 5, Kotest, MockK, coroutine test dispatchers, Turbine for Flow assertions, Compose UI tests, and Kover coverage."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Kotlin Testing and Mocking Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Declare a unit test | `@Test fun` | JUnit 5 annotation that marks a function as a test case |
| Group related tests | `@Nested inner class` | Nests test classes inside a parent so shared setup and naming stay organised |
| Skip a test temporarily | `@Disabled("reason")` | JUnit 5 replacement for the JUnit 4 `@Ignore` annotation |
| Run a test with several inputs | `@ParameterizedTest` + `@MethodSource` | Feeds a stream of arguments into one test body |
| Run a suspend test | `runTest { }` | `kotlinx-coroutines-test` builder that skips real delays on a virtual clock |
| Replace the main dispatcher | `Dispatchers.setMain(StandardTestDispatcher())` | Swaps `Dispatchers.Main` so ViewModel tests run on the JVM |
| Restore the main dispatcher | `Dispatchers.resetMain()` | Tears down the test dispatcher in `@AfterEach` |
| Advance virtual time | `advanceTimeBy(1_000)` | Moves the scheduler clock forward without sleeping |
| Create a strict mock | `mockk<Repository>()` | MockK mock that fails on unstubbed calls |
| Create a relaxed mock | `mockk<Repository>(relaxed = true)` | Mock that returns sensible defaults for unstubbed calls |
| Wrap a real object | `spyk(realService)` | Partial mock that delegates to the real implementation unless stubbed |
| Stub a call | `every { repo.load() } returns data` | Defines the return value for a matching invocation |
| Stub a suspend call | `coEvery { repo.load() } returns data` | MockK variant for suspending functions |
| Stub with a lambda | `every { repo.load() } answers { data }` | Computes the return value lazily per invocation |
| Throw from a stub | `every { repo.load() } throws IOException()` | Simulates a failing dependency |
| Verify an invocation | `verify(exactly = 1) { repo.load() }` | Asserts how many times a call happened |
| Verify ordering | `verifyOrder { first(); second() }` | Asserts that calls happened in a specific sequence |
| Capture arguments | `val slot = slot<String>()` + `capture(slot)` | Records the argument passed to a stub for later assertions |
| Assert on a Flow | `flow.test { awaitItem() }` | Turbine extension that collects emissions into a test scope |
| Assert completion | `flow.test { awaitComplete() }` | Turbine matcher for a flow that finishes normally |
| Assert failure | `flow.test { awaitError() }` | Turbine matcher for a flow that throws |
| Test Compose UI | `composeTestRule.setContent { }` | Renders a composable inside the instrumented or Robolectric test host |
| Find a Compose node | `onNodeWithText("Save")` | Semantics-based selector from the Compose testing library |
| Assert a node state | `assertIsEnabled()` | Compose assertion helper that reads the semantics tree |
| Use a test clock | `mainClock.advanceTimeBy(500)` | Drives animations and delays in Compose tests |
| Test a Room DAO | `Room.inMemoryDatabaseBuilder(...)` | Builds a throwaway database that never touches disk |
| Assert a thrown exception | `assertFailsWith<IllegalStateException> { }` | Kotest assertion that returns the caught exception |
| Measure coverage | `./gradlew koverHtmlReport` | Generates an HTML coverage report with the Kover plugin |
| Run JVM unit tests | `./gradlew testDebugUnitTest` | Executes the `src/test` source set for the debug variant |
| Run instrumented tests | `./gradlew connectedDebugAndroidTest` | Executes the `src/androidTest` source set on a device or emulator |

## Common Commands

### Adding Test Dependencies

```kotlin
// app/build.gradle.kts
dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    testImplementation("io.kotest:kotest-assertions-core:5.9.0")
    testImplementation("io.mockk:mockk:1.13.11")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    testImplementation("app.cash.turbine:turbine:1.1.0")

    // Android-specific helpers
    testImplementation("androidx.arch.core:core-testing:2.2.0")
    testImplementation("org.robolectric:robolectric:4.12.2")

    // Compose UI tests
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.6.8")
    debugImplementation("androidx.compose.ui:ui-test-manifest:1.6.8")

    // Instrumented AndroidX test runners
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
```

```kotlin
// app/build.gradle.kts — enable the JUnit 5 platform on Android
android {
    testOptions {
        unitTests.all {
            it.useJUnitPlatform()
        }
    }
}
```

### Running Unit Tests

```bash
# Run every JVM unit test for the debug variant
./gradlew testDebugUnitTest

# Run one test class
./gradlew testDebugUnitTest --tests "com.example.CartViewModelTest"

# Run one test method
./gradlew testDebugUnitTest --tests "com.example.CartViewModelTest.addsItemToCart"

# Run every test whose class name matches a pattern
./gradlew testDebugUnitTest --tests "*RepositoryTest"

# Re-run only the tests that failed last time
./gradlew testDebugUnitTest --rerun-tasks
```

### Running Instrumented and Compose Tests

```bash
# Run instrumented tests on a connected device or emulator
./gradlew connectedDebugAndroidTest

# Run a single instrumented test class
./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.example.CheckoutFlowTest

# Run Compose UI tests on the JVM through Robolectric
./gradlew testDebugUnitTest --tests "*ComposeUiTest"
```

### Generating Coverage Reports with Kover

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
# Build an HTML coverage report
./gradlew koverHtmlReport

# Build an XML report for CI ingestion
./gradlew koverXmlReport

# Fail the build when coverage drops below the configured threshold
./gradlew koverVerify

# Report location after a successful run
# app/build/reports/kover/html/index.html
```

### Filtering, Debugging, and Test Hygiene

```bash
# Print detailed failures and stack traces
./gradlew testDebugUnitTest --info

# Force a clean re-run of every test
./gradlew clean testDebugUnitTest

# Scan the test sources for leftover debug statements before review
grep -RIn -e "println(" -e "TODO(" app/src/test app/src/androidTest
```

```kotlin
// Show the standard output of tests in the Gradle console
tasks.withType<Test> {
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = true
    }
}
```

## Code Snippets

### Basic JUnit 5 Test

```kotlin
class MoneyTest {

    @Test
    fun `adds two amounts of the same currency`() {
        val total = Money.of(1_000, "IDR") + Money.of(2_500, "IDR")

        assertEquals(Money.of(3_500, "IDR"), total)
    }

    @BeforeEach
    fun setUp() {
        // Runs before every test in this class
    }

    @AfterEach
    fun tearDown() {
        // Runs after every test, even when a test fails
    }
}
```

### Parameterized Tests

```kotlin
class DiscountTest {

    @ParameterizedTest(name = "cart of {0} items earns {1}% off")
    @CsvSource("1, 0", "5, 5", "10, 12")
    fun `applies tiered discounts`(items: Int, expectedPercent: Int) {
        val discount = DiscountPolicy.forItemCount(items)

        assertEquals(expectedPercent, discount.percent)
    }

    @ParameterizedTest
    @MethodSource("invalidAmounts")
    fun `rejects non positive amounts`(amount: Long) {
        assertThrows<IllegalArgumentException> { Money.of(amount, "IDR") }
    }

    companion object {
        @JvmStatic
        fun invalidAmounts() = Stream.of(0L, -1L, -99L)
    }
}
```

### Kotest Spec Styles

```kotlin
// StringSpec — the most compact style for small units of behaviour
class ValidatorSpec : StringSpec({
    "accepts a strong password" {
        PasswordValidator.isValid("Tr0ub4dor&3") shouldBe true
    }

    "rejects a short password" {
        PasswordValidator.isValid("abc") shouldBe false
    }
})

// BehaviorSpec — given / when / then naming for use-case style tests
class CheckoutSpec : BehaviorSpec({
    given("an empty cart") {
        `when`("the user checks out") {
            then("the order is rejected") {
                shouldThrow<IllegalStateException> { CheckoutService.checkout(emptyCart) }
            }
        }
    }
})

// FunSpec with beforeEach for shared setup
class CartSpec : FunSpec({
    lateinit var cart: Cart

    beforeEach { cart = Cart() }

    test("starts empty") {
        cart.items shouldBe emptyList()
    }
})
```

### Assertions and Matchers

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
// Soft assertions collect every failure instead of stopping at the first one
assertSoftly {
    receipt.total shouldBe 42_000
    receipt.currency shouldBe "IDR"
    receipt.lines.size shouldBe 2
}

// Assert an exception and inspect its payload
val error = shouldThrow<ValidationException> { parse("") }
error.field shouldBe "payload"
```

### Mocking with MockK

```kotlin
class OrderViewModelTest {

    private val repository = mockk<OrderRepository>()
    private val analytics = mockk<Analytics>(relaxed = true)

    @Test
    fun `renders orders from the repository`() = runTest {
        every { repository.orders() } returns flowOf(Order("ORD-1"), Order("ORD-2"))

        val viewModel = OrderViewModel(repository, analytics)

        viewModel.state.value.orders shouldHaveSize 2
    }

    @Test
    fun `surfaces load failures`() = runTest {
        coEvery { repository.refresh() } throws IOException("network down")

        val viewModel = OrderViewModel(repository, analytics)
        viewModel.refresh()

        viewModel.state.value.error shouldBe "network down"
    }
}
```

### Verifying Calls and Capturing Arguments

```kotlin
@Test
fun `tracks the tapped product exactly once`() {
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
fun `calls the coordinator in order`() {
    verifyOrder {
        cache.put(any(), any())
        remote.upload(any())
    }

    verify(atLeast = 1) { cache.put(any(), any()) }
    verify(atMost = 2) { remote.upload(any()) }
    verify { cache.put(any(), any()); remote.upload(any()) }
}
```

### Relaxed, Partial, and Constructor Mocks

```kotlin
// Relaxed mocks return defaults; combine with a stub when only one call matters
val logger = mockk<Logger>(relaxed = true)
val clock = mockk<Clock> { every { now() } returns Instant.parse("2026-01-01T00:00:00Z") }

// Partial mock — the real implementation runs unless a call is stubbed
val cache = spyk(InMemoryCache())
every { cache.hitRate() } returns 0.75

// Constructor mocking avoids needing a no-arg constructor
val client = mockkConstructor(HttpClient::class)
every { anyConstructed<HttpClient>().get(any()) } returns "{}"

// Reset stubs between test cases when a fixture is shared
@AfterEach
fun tearDown() {
    clearAllMocks()
}
```

### Testing Suspend Functions and Coroutines

```kotlin
class PricingEngineTest {

    @Test
    fun `computes the total for a large order`() = runTest {
        val engine = PricingEngine(surchargeApi = mockk(relaxed = true))

        val total = engine.total(items = 120)

        total shouldBe 1_450_000
    }

    @Test
    fun `cancels the request when the caller times out`() = runTest {
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

### Dispatchers in Tests

```kotlin
@Test
fun `loads the profile on start`() = runTest {
    Dispatchers.setMain(StandardTestDispatcher(testScheduler))

    val viewModel = ProfileViewModel(repository = mockk(relaxed = true))
    viewModel.start()

    advanceUntilIdle()

    viewModel.state.value.isLoading shouldBe false

    Dispatchers.resetMain()
}
```

```kotlin
// A JUnit 5 rule keeps the dispatcher swap out of every test body
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
    // Tests here never touch Dispatchers.Main by hand
}
```

```kotlin
// Inject the dispatcher instead of hard coding Dispatchers.IO
class ProfileRepository(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    suspend fun load(id: String): Profile = withContext(ioDispatcher) { api.profile(id) }
}
```

### Testing Flow with Turbine

```kotlin
@Test
fun `emits loading then results`() = runTest {
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
fun `state flow exposes the current user after login`() = runTest {
    val store = SessionStore()

    store.state.test {
        awaitItem() shouldBe SessionState.SignedOut

        store.login(user)
        awaitItem() shouldBe SessionState.SignedIn(user)

        cancelAndIgnoreRemainingEvents()
    }
}

@Test
fun `a failing stream reports the error`() = runTest {
    val repo = mockk<ProfileRepository>()
    coEvery { repo.profile(any()) } throws IOException("offline")

    repo.profileFlow("42").test {
        awaitItem() shouldBe ProfileState.Loading
        awaitError().message shouldBe "offline"
    }
}
```

### Fakes over Mocks for Repository Boundaries

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
fun `saves an order and reloads it`() = runTest {
    val repository = FakeOrderRepository()

    repository.save(Order("ORD-9"))
    repository.orders() shouldHaveSize 1
}
```

### Testing a ViewModel End to End

```kotlin
class CartViewModelTest {

    private val repository = FakeOrderRepository()

    @Test
    fun `adds an item and updates the total`() = runTest(StandardTestDispatcher()) {
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

### Compose UI Tests

```kotlin
class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `submits the credentials the user typed`() {
        var submitted: Credentials? = null

        composeTestRule.setContent {
            LoginScreen(onSubmit = { submitted = it })
        }

        composeTestRule.onNodeWithText("Email").performTextInput("bahrul@example.com")
        composeTestRule.onNodeWithText("Password").performTextInput("hunter2")
        composeTestRule.onNodeWithText("Sign in").performClick()

        composeTestRule.runOnIdle {
            submitted shouldBe Credentials("bahrul@example.com", "hunter2")
        }
    }
}
```

```kotlin
@Test
fun `the progress indicator is hidden once loading finishes`() {
    composeTestRule.setContent { OrderListScreen(state = OrderListUiState.Empty) }

    composeTestRule.onNodeWithTag("loading").assertDoesNotExist()
    composeTestRule.onNodeWithText("No orders yet").assertIsDisplayed()
}

@Test
fun `the button is disabled until the form is valid`() {
    composeTestRule.setContent { CheckoutScreen() }

    composeTestRule.onNodeWithText("Pay").assertIsNotEnabled()
    composeTestRule.onNodeWithText("Card number").performTextInput("4242424242424242")
    composeTestRule.onNodeWithText("Pay").assertIsEnabled()
}
```

```kotlin
@Test
fun `the snackbar advances its animation clock`() {
    composeTestRule.mainClock.autoAdvance = false
    composeTestRule.setContent { SnackbarHost(show = true) }

    composeTestRule.mainClock.advanceTimeBy(600)

    composeTestRule.onNodeWithText("Saved").assertIsDisplayed()
}
```

### Testing Room DAOs

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
    fun `returns orders ordered by creation time`() = runTest {
        dao.insert(Order("ORD-2", createdAt = 2))
        dao.insert(Order("ORD-1", createdAt = 1))

        dao.observeAll().first().map { it.id } shouldContainExactly listOf("ORD-1", "ORD-2")
    }
}
```

### Test Data Builders

```kotlin
// Defaults keep tests short, named arguments make the intent obvious
fun buildOrder(
    id: String = "ORD-1",
    total: Long = 42_000,
    status: OrderStatus = OrderStatus.Pending
) = Order(id = id, total = total, status = status)

@Test
fun `only pending orders can be cancelled`() {
    buildOrder(status = OrderStatus.Pending).canCancel() shouldBe true
    buildOrder(status = OrderStatus.Shipped).canCancel() shouldBe false
}
```

### Testing an Android Component with Robolectric

```kotlin
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SettingsActivityTest {

    @Test
    fun `shows the saved theme on launch`() {
        val activity = Robolectric.buildActivity(SettingsActivity::class.java).setup().get()

        val label = activity.findViewById<TextView>(R.id.themeLabel)

        label.text.toString() shouldBe "System default"
    }
}
```

```kotlin
// Coroutine timing inside Robolectric can be pinned to the main looper
@Test
fun `debounces search input`() = runTest {
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

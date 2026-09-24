---
title: "Kotlin Dependency Injection with Hilt Guide"
description: "A comprehensive guide to dependency injection in Android with Hilt: component scopes, qualifiers, modules, ViewModel and WorkManager injection, and building testable object graphs."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kotlin Dependency Injection with Hilt Guide

## Introduction

Dependency injection (DI) is the practice of supplying an object with its dependencies from the outside instead of letting it construct them itself. On Android this matters more than in most other environments: the framework instantiates your activities, fragments, services, and workers, so constructors are not always under your control, and a poorly managed object graph quickly becomes a tangle of service locators, static singletons, and god-objects that are impossible to test.

Hilt is Google's opinionated DI library for Android, built on top of Dagger. It standardizes the way Dagger components are created and wired into the Android framework lifecycle, so you get compile-time verified, reflection-free dependency graphs with a fraction of the boilerplate that raw Dagger requires. Hilt generates the components and bindings at compile time, which means most wiring mistakes are caught by the compiler instead of at runtime — a property that the Kotlin ecosystem values as much as null safety.

This guide assumes you already understand the basics of Kotlin and Android development with Jetpack Compose or classic Views. It focuses on the architectural decisions that separate a maintainable Hilt setup from a fragile one: choosing the right component scope, keeping the graph acyclic, expressing contracts with qualifiers and `@Binds`, injecting into framework-owned classes such as `ViewModel`, `WorkManager`, and services, and structuring modules so the graph stays fast to build and easy to test.

By the end you will know how to design a Hilt object graph that is explicit, testable, and resilient to change — and the common mistakes that silently turn a good DI setup into technical debt.

## Best Practices

### 1. Scope Each Binding to the Component That Matches Its Lifetime

Hilt provides a fixed hierarchy of components: `SingletonComponent`, `ActivityRetainedComponent`, `ViewModelComponent`, `ActivityComponent`, `FragmentComponent`, `ServiceComponent`, `ViewComponent`, and `WorkerComponent`. Scoping is a promise about lifetime — it tells Hilt to keep one instance alive as long as the component lives. The cardinal rule is to match the scope to the natural lifetime of the dependency:

- `@Singleton` for application-wide objects such as `Retrofit`, `OkHttpClient`, `RoomDatabase`, and repositories that cache data across screens.
- `@ViewModelScoped` for dependencies that must survive configuration changes but be discarded once the `ViewModel` clears (a repository that holds UI state, a paging source).
- `@ActivityRetainedScoped` for objects that outlive activity recreation but die with the activity's retained state (rarely needed when you already have `@ViewModelScoped`).
- `@ActivityScoped` / `@FragmentScoped` only for objects that genuinely belong to a single screen, such as a coordinator that owns a complex UI flow.

The most common mistake is over-scoping: making everything a `@Singleton` "just to be safe". A singleton `Retrofit` is correct, but a singleton `CartRepository` that holds mutable UI state will leak state and behavior across sessions. When in doubt, prefer the narrowest scope that satisfies the dependency's lifetime.

### 2. Prefer Constructor Injection Over Field Injection

Constructor injection is the default and should be your first choice for every class you own. It makes dependencies visible in the constructor signature, allows the class to be constructed in unit tests without any DI framework, and keeps the class honest — a class with five constructor parameters is a smell that no amount of binding magic should hide.

Field injection is only for classes that the Android framework instantiates: activities, fragments, services, broadcast receivers, and workers. These classes cannot receive constructor injection because the framework requires a no-argument constructor and calls it itself. For those, annotate the class with `@AndroidEntryPoint` (or `@HiltWorker`) and mark fields with `@Inject`:

```kotlin
@AndroidEntryPoint
class CheckoutActivity : AppCompatActivity() {

  @Inject
  lateinit var checkoutRepository: CheckoutRepository
}
```

Keep field-injected surfaces thin: the activity or fragment should do little more than forward to a `ViewModel`. If you find yourself injecting five or more fields into a screen, extract a `@HiltViewModel` and move the wiring there.

### 3. Use Qualifiers to Disambiguate Same-Type Contracts

When two bindings share the same type, Hilt cannot choose between them. The standard example is two `Retrofit` instances — one for the public API and one for an authenticated internal service — or multiple `CoroutineDispatcher` instances for different dispatchers. Never work around this by making the type distinct (a `PublicApiRetrofit` wrapper class); instead express the intent with qualifier annotations:

```kotlin
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class PublicApi

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class InternalApi
```

The qualifier travels with the binding and the injection site, so both the module and the consumer stay readable, and the compiler verifies that the qualifier matches.

### 4. Model Interfaces With `@Binds`, Third-Party Dependencies With `@Provides`

Two module styles exist in Hilt, and choosing the right one keeps modules small and obvious:

- `@Binds` — an abstract module method that tells Hilt *which implementation* to use for an interface. This is the idiomatic way to bind your own abstractions:
```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

  @Binds
  @Singleton
  abstract fun bindCartDataSource(impl: CartRepository): CartDataSource
}
```

- `@Provides` — a concrete method that constructs a dependency Hilt does not know how to create: third-party classes (`Retrofit`, `OkHttpClient`, `RoomDatabase`) and values that require runtime context (`CoroutineDispatcher`, `Gson`).

The `@Provides` method's parameter list is itself part of the graph — you can request `OkHttpClient` in the `provideRetrofit` method and Hilt resolves it from another binding. Keep each module cohesive: one module per responsibility (networking, persistence, dispatchers), not one giant `AppModule` with thirty methods.

### 5. Keep the Graph Acyclic and Explicit

A Dagger/Hilt graph is a directed graph of dependencies, and it must be acyclic — a cycle such as `A → B → A` is a compile error. The practical consequences are worth internalizing:

- Avoid `@Provides` methods that manually construct objects which Hilt could assemble itself. Hand-wiring one object is fine; hand-wiring a chain of five is a sign you are replicating the graph by hand and will drift from it.
- Avoid the service-locator escape hatch. A class that reaches into a global registry (a `ServiceLocator.instance` object, a `CompositionLocal`, or a static singleton) to obtain a dependency is a class you cannot unit-test in isolation, because its dependency arrives through a hidden channel.
- Do not inject `ViewModelStoreOwner`, `FragmentManager`, or other short-lived framework objects into long-lived singletons. Capturing a fragment inside a `@Singleton` is a memory leak by construction.

The graph should read like a map of your architecture. If it does not, the architecture — not the DI framework — is what needs to change.

### 6. Inject Runtime Arguments With Assisted Injection

Some dependencies cannot be produced by the graph alone because they need arguments that only exist at runtime: a `Worker` receives its `WorkerParameters`, a `PagingSource` receives a page size, a detail screen receives an item ID. For these, use assisted injection:

```kotlin
class ProductPagingSource @AssistedInject constructor(
  private val productApi: ProductApi,
  @Assisted private val categoryId: String,
  @Assisted private val pageSize: Int,
) : PagingSource<Int, Product>()
```

The static parts of the dependency come from the graph; the runtime parts are passed at the call site through a generated factory. This keeps the object inside the graph (and therefore testable with the same fakes) instead of forcing you to construct it manually outside it.

### 7. Make the Graph Testable With `@UninstallModules` and `@TestInstallIn`

The payoff of DI is testability, and Hilt's testing API is what delivers it. In instrumented tests, `@UninstallModules` removes real modules from the component and `@TestInstallIn` swaps in fake modules, so tests exercise the real production code against a fake data source without touching a single production line:

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

Design modules and interfaces specifically so this swap is a one-line change: inject interfaces, not concrete classes, at the boundaries that touch the network or the disk.

### 8. Prefer KSP, Pin Versions, and Keep Modules Small

Hilt historically required KAPT, but recent Hilt versions support KSP, which is significantly faster. Use KSP when your Hilt version allows it:

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

Because Hilt generates code at compile time, build time scales with the size of the graph. Large, disorganized modules slow every build and make compile errors harder to read. Pin Hilt, KSP, and the Android Gradle Plugin versions together in the version catalog, and upgrade them as a unit — mismatched versions are a frequent source of opaque "unexpected element" errors. Keep modules small enough that a compile error's stack trace points at one responsibility.

## Implementation Steps

### Step 1: Add the Hilt Plugin and Dependencies

Add the Hilt Gradle plugin and the KSP plugin. The cleanest setup uses the version catalog:

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
  // compileSdk, minSdk, and targetSdk stay as configured
}

dependencies {
  implementation(libs.hilt.android)
  ksp(libs.hilt.compiler)

  // Instrumented tests that use @HiltAndroidTest
  androidTestImplementation(libs.hilt.testing)
  kspAndroidTest(libs.hilt.compiler)
}
```

Sync the project and confirm both plugins applied before continuing — a missing plugin manifests as `unresolved reference: HiltAndroidApp` on the very first import.

### Step 2: Create the Application Class and Enable Hilt

Hilt needs an application-level component. Create an `Application` subclass annotated with `@HiltAndroidApp` and register it in the manifest:

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
  <!-- activities and services -->
</application>
```

`@HiltAndroidApp` triggers Hilt's code generation: it creates the root `SingletonComponent` and its parent application class. Every other component in the app descends from this one.

### Step 3: Inject Your Own Classes With Constructor Injection

For classes you own, add `@Inject` to the constructor and let Hilt assemble the rest. The repositories layer is the natural first target:

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

Hilt walks the constructor parameter list and resolves each parameter from the graph. If a parameter cannot be provided, the build fails immediately with a `Dagger/MissingBinding` error naming the missing type — fix the error at compile time, never by reaching for a manual `get()`.

### Step 4: Define Modules for Third-Party Dependencies

Third-party classes and values that need runtime context cannot use constructor injection, so they belong in `@Provides` methods inside `@Module` classes with a `@InstallIn` target:

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

Note two details. First, `@ApplicationContext` is a built-in qualifier that provides the application `Context` — never pass an activity context into a singleton dependency. Second, `provideRetrofit` requests `OkHttpClient` as a parameter; Hilt resolves it from `provideOkHttpClient`, which demonstrates how modules compose into one graph.

Dispatchers are a common value-type binding and the canonical place to practice qualifiers:

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

### Step 5: Wire ViewModels and Compose Screens

ViewModels are the main integration point between the graph and the UI layer. Annotate the ViewModel with `@HiltViewModel` and move all screen dependencies into its constructor:

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

Consume it from Compose with `hiltViewModel()` and from a classic activity with `by viewModels()`:

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

`@AndroidEntryPoint` is required on every activity and fragment that participates in injection — forgetting it produces "cannot be provided without an @Provides-annotated method" style errors that point at the dependency but actually stem from the missing entry point.

### Step 6: Inject Into Framework-Owned Classes

Workers, services, and content providers are instantiated by the framework, so they need Hilt's specialized annotations.

For `WorkManager`, use `@HiltWorker` with an `@AssistedInject` constructor. The worker parameters are assisted (runtime-provided) while domain dependencies come from the graph:

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

Remember to enable the `HiltWorkerFactory` in your Application class:

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

For a foreground `Service`, annotate the class with `@AndroidEntryPoint` and use field injection. A `ContentProvider` is the one framework class that cannot be annotated directly — keep providers thin and route the real work through an injected component or application-level holder.

### Step 7: Build a Testable Graph

Replace real modules with fakes in instrumented tests so the production code is exercised unchanged. First configure the test runner in the build script:

```kotlin
android {
  defaultConfig {
    testInstrumentationRunner = "com.google.android.testing.hilt.HiltTestRunner"
  }
}
```

Then write the fake module and the test:

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

The test injects the real `CartRepository` — only the data source is swapped. That is the property to optimize for: the seam between modules is exactly where fakes plug in.

### Step 8: Verify the Graph and Debug Common Errors

Run the full verification pipeline — the graph is type-checked at compile time, so a clean build is meaningful:

```bash
./gradlew assembleDebug kspDebugKotlin lintDebug
```

When the build fails, map the message to its cause:

- `Dagger/MissingBinding: cannot be provided without an @Provides-annotated method` — the type has no binding. Add the `@Provides` method or the `@Inject` constructor, or check that the class name in the error matches the actual type (a typo in a module parameter produces this exact error).
- `Dagger/Injection: @Inject field ... suggests a @Inject constructor...` — the class mixes constructor and field injection, or the field is injected into a class without `@AndroidEntryPoint`.
- `[Dagger/DependencyCycle]` — the graph contains a cycle; break it by removing one of the mutual dependencies, typically by injecting an abstraction instead of the concrete pair.
- Scope mismatch errors — a dependency scoped to `SingletonComponent` cannot be injected into `FragmentComponent`; the error names both the scope and the component, and the fix is usually to re-scope to the ancestor component.

Verify composition with intentional reads: request the graph in a small test scope or rely on the generated members-injector classes in `build/generated/ksp` — reading the generated `Hilt_*` classes is the fastest way to confirm which bindings Hilt actually resolved. A clean build plus a passing test suite is the end state: the graph compiles, the fakes swap cleanly, and the production code never constructs a dependency by hand.

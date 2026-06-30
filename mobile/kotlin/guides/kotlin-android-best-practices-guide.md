---
title: "Kotlin Android Best Practices Guide"
description: "A comprehensive guide to best practices for building production-quality Android applications with Kotlin, covering architecture, patterns, and tooling."
category: "mobile"
technology: "kotlin"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Kotlin Android Best Practices Guide

## Introduction

Building a production-grade Android application requires more than just knowing the Kotlin language or Jetpack Compose APIs. It demands a solid architectural foundation, consistent patterns, and disciplined engineering practices. This guide presents the industry-proven best practices for modern Android development with Kotlin — covering clean architecture, state management, dependency injection, error handling, testing, performance, security, and CI/CD. By following these guidelines, you will build apps that are scalable, testable, maintainable, and performant.

## Best Practices

### 1. Clean Architecture (Data / Domain / Presentation Layers)

Organize your code into three distinct layers. The **data layer** handles external data sources (APIs, databases, preferences). The **domain layer** contains business logic and use cases — it depends only on Kotlin, not on Android framework. The **presentation layer** consists of Composables, ViewModels, and UI state holders. Dependencies point inward: presentation depends on domain, domain depends on data interfaces.

```kotlin
// Domain layer — pure Kotlin, no Android dependencies
class GetUserUseCase(private val userRepository: UserRepository) {
    suspend operator fun invoke(id: String): Result<User> {
        return userRepository.getUser(id)
    }
}

// Data layer — implements domain interfaces
class UserRepositoryImpl(
    private val api: UserApi,
    private val dao: UserDao
) : UserRepository {
    override suspend fun getUser(id: String): Result<User> = runCatching {
        val response = api.getUser(id)
        User(id = response.id, name = response.name, email = response.email)
    }
}
```

### 2. MVVM + MVI Patterns

Adopt MVVM (Model-View-ViewModel) as the base pattern. For complex screens with multiple states, enhance it with MVI (Model-View-Intent), where UI state is modeled as a sealed class and user intents are explicit action objects. This creates a unidirectional data flow that is predictable and testable.

```kotlin
// MVI state
data class ProfileState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val error: String? = null
)

// MVI intent / event
sealed interface ProfileEvent {
    data object LoadProfile : ProfileEvent
    data class UpdateName(val name: String) : ProfileEvent
}

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val getUserUseCase: GetUserUseCase
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    fun onEvent(event: ProfileEvent) {
        when (event) {
            ProfileEvent.LoadProfile -> loadProfile()
            is ProfileEvent.UpdateName -> updateName(event.name)
        }
    }

    private fun loadProfile() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            getUserUseCase("current").onSuccess { user ->
                _state.update { it.copy(isLoading = false, user = user) }
            }.onFailure { error ->
                _state.update { it.copy(isLoading = false, error = error.message) }
            }
        }
    }
}
```

### 3. Reactive UI with StateFlow

Use `StateFlow` (not LiveData) for UI state. StateFlow is Kotlin-native, works seamlessly with coroutines and Compose, and has deterministic behavior. Collect flows lifecycle-aware in Compose using `collectAsStateWithLifecycle()` from `lifecycle-runtime-compose`.

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    when {
        state.isLoading -> CircularProgressIndicator()
        state.user != null -> UserProfileCard(user = state.user!!)
        state.error != null -> ErrorView(message = state.error!!)
    }
}
```

### 4. Dependency Injection with Hilt

Use Hilt for all dependency injection. Prefer constructor injection over field injection. Use `@HiltViewModel` for ViewModels and `@Inject` annotations. Create dedicated modules for networking, database, and repository bindings. Use `@Singleton` sparingly — prefer `@ViewModelScoped` or `@ActivityScoped` where appropriate.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
```

### 5. Error Handling with Sealed Class Results

Never use bare exceptions for flow control. Model all operation results as sealed result types. Use `kotlin.Result` for simple cases or a custom sealed hierarchy for richer error information.

```kotlin
sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val code: Int, val message: String) : NetworkResult<Nothing>()
    data object NetworkError : NetworkResult<Nothing>()
    data object Timeout : NetworkResult<Nothing>()
}

suspend fun <T> safeApiCall(call: suspend () -> T): NetworkResult<T> {
    return try {
        NetworkResult.Success(call.invoke())
    } catch (e: HttpException) {
        NetworkResult.Error(e.code(), e.message())
    } catch (e: IOException) {
        NetworkResult.NetworkError
    } catch (e: SocketTimeoutException) {
        NetworkResult.Timeout
    }
}
```

### 6. Testing Pyramid (Unit / Integration / UI)

Follow the testing pyramid: write many fast unit tests, fewer integration tests, and a few slow UI tests. Use `Turbine` for testing Flows, `MockK` or `Mockito` for mocking, and `compose-test` for UI tests. Run tests on every CI build.

```kotlin
class ProfileViewModelTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    private val getUserUseCase = mockk<GetUserUseCase>()
    private lateinit var viewModel: ProfileViewModel

    @Before
    fun setup() {
        viewModel = ProfileViewModel(getUserUseCase)
    }

    @Test
    fun `load profile success`() = runTest {
        coEvery { getUserUseCase("current") } returns Result.success(MockData.user)
        viewModel.onEvent(ProfileEvent.LoadProfile)
        val state = viewModel.state.first { !it.isLoading }
        assertEquals(MockData.user, state.user)
    }
}
```

### 7. Modularization with Dynamic Features

Split your app into feature modules and the core module. Use dynamic feature delivery for on-demand downloads. This reduces initial install size and enables faster build times.

```text
Project/
├── :app                    (application shell)
├── :core                   (shared: network, database, di, ui)
├── :feature:home           (home feature module)
├── :feature:profile        (profile feature module)
├── :feature:settings       (settings feature module, dynamic)
└── :feature:payment        (payment feature module, dynamic)
```

### 8. ProGuard / R8 Optimization

Enable minification, shrinking, and obfuscation in release builds. Keep rules for reflection (Gson, Retrofit, Room). Generate and ship Baseline Profiles for faster startup.

```pro
# ProGuard rules
-keepattributes Signature
-keepattributes *Annotation*

# Gson
-keepclassmembers class com.example.model.** { *; }

# Retrofit
-keepattributes Exceptions
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**
```

### 9. Performance (Lazy Lists, Image Loading, Baseline Profiles)

Use `LazyColumn` with stable keys to minimize recomposition. Use Coil for image loading (Kotlin-first, coroutine-based, Compose-native). Generate Baseline Profiles with the Macrobenchmark library to improve cold-start performance by 15–30%.

```kotlin
@Composable
fun UserList(users: List<User>) {
    LazyColumn {
        items(users, key = { it.id }) { user ->
            UserRow(
                user = user,
                modifier = Modifier.animateItem()
            )
        }
    }
}
```

### 10. Security (EncryptedSharedPreferences, SSL Pinning)

Store sensitive tokens in `EncryptedSharedPreferences` backed by the Android Keystore. Implement SSL pinning via OkHttp's `CertificatePinner`. Never hardcode secrets — use BuildConfig fields from `local.properties` or environment variables.

```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val sharedPreferences = EncryptedSharedPreferences.create(
    context,
    "secure_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

// SSL Pinning
val certificatePinner = CertificatePinner.Builder()
    .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .build()
```

### 11. CI/CD (GitHub Actions, Firebase Test Lab)

Automate builds, linting, testing, and deployment with GitHub Actions. Use Firebase Test Lab for device-farm testing on real devices. Automate Play Store deployment with Gradle Play Publisher or fastlane.

```yaml
# .github/workflows/android-ci.yml
name: Android CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Grant execute permission for gradlew
        run: chmod +x gradlew
      - name: Run lint
        run: ./gradlew lint
      - name: Run unit tests
        run: ./gradlew test
      - name: Build release
        run: ./gradlew assembleRelease
```

## Implementation Steps

### Step 1: Project Scaffolding and Architecture Setup

Create a new Android project with Kotlin DSL in Gradle. Set up the three-layer package structure: `data/`, `domain/`, `presentation/`. Add Hilt with `@HiltAndroidApp`. Configure version catalogs in `libs.versions.toml`. Add baseline Compose dependencies and enable build caching.

```bash
# Create package structure
mkdir -p app/src/main/java/com/example/app/{data/{api,local,repository},domain/{model,usecase,repository},presentation/{ui/{screen},viewmodel}}
```

### Step 2: Dependency Injection Configuration

Add Hilt, Retrofit, Room, and Coil dependencies to `libs.versions.toml`. Create a `NetworkModule`, `DatabaseModule`, and `RepositoryModule`. Verify DI compiles by injecting a simple ViewModel into a composable.

### Step 3: State Management Pattern

Define a `UiState` sealed interface for each screen. Create `ViewModel` classes that expose a single `StateFlow<UiState>`. Use `collectAsStateWithLifecycle()` in Composables. Implement MVI event handling for user interactions.

### Step 4: Error Handling and Resilience

Wrap all API and database calls in `runCatching`. Map exceptions to domain-specific sealed result types. Show user-friendly error messages in the UI with retry actions. Use `WorkManager` with exponential backoff for background operations.

### Step 5: Testing Infrastructure

Set up `test/` and `androidTest/` directories. Add dependencies: JUnit 5, MockK, Turbine, Compose Test, and Robolectric. Write a ViewModel test as a smoke test. Configure Firebase Test Lab for integration tests on real devices.

### Step 6: Performance Optimization Pipeline

Integrate Baseline Profile generation with a Macrobenchmark module. Run the benchmark on CI to catch regressions. Add LeakCanary for leak detection in debug builds. Profile with Android Studio Profiler monthly.

### Step 7: Security Hardening

Review all stored credentials — move secrets to BuildConfig or a secret management service. Implement EncryptedSharedPreferences for auth tokens. Add SSL pinning for all API endpoints. Run a security audit with MobSF or similar tools.

### Step 8: CI/CD Pipeline

Create a GitHub Actions workflow that runs lint, unit tests, and instrumentation tests on every push. Add a release workflow that builds a signed AAB, uploads to Play Console (closed track), and posts release notes. Use Gradle Play Publisher or fastlane for automated Play Store publishing.

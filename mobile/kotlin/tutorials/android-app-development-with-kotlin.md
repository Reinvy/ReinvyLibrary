---
title: "Android App Development with Kotlin"
description: "A comprehensive step-by-step tutorial covering Android app development using Kotlin, from Android Studio setup to Play Store deployment."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Android App Development with Kotlin

## Summary

This tutorial provides a complete walkthrough for building Android native applications using Kotlin. You will learn the full development lifecycle: setting up Android Studio, mastering Kotlin language fundamentals, building UI with Jetpack Compose, implementing data persistence with Room, handling networking with Retrofit, managing state with ViewModel and StateFlow, performing dependency injection with Hilt, integrating Firebase services, and finally deploying your app to the Play Store.

## Target Audience

- Mobile developers transitioning to native Android development.
- Beginner to intermediate Android developers who want to learn modern Kotlin-based Android development.
- Developers familiar with Java or other JVM languages looking to adopt Kotlin.

## Prerequisites

- Basic understanding of programming concepts (variables, functions, control flow).
- Familiarity with object-oriented programming and basic design patterns.
- A computer running Windows, macOS, or Linux with at least 8 GB of RAM.
- Basic knowledge of SQL is helpful for the Room database section.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up Android Studio and configure a Kotlin-based Android project.
- Write idiomatic Kotlin using null safety, coroutines, flows, and sealed classes.
- Build reactive UIs with Jetpack Compose, layouts, and Material Design 3 theming.
- Implement navigation using NavHost and BottomNavigation.
- Persist data locally with Room database and DataStore.
- Perform network operations using Retrofit and parse JSON responses.
- Manage UI state with ViewModel and StateFlow.
- Implement dependency injection using Hilt.
- Integrate Firebase Authentication, Firestore, and Cloud Messaging.
- Prepare and deploy your app to the Google Play Store.

## Context and Motivation

The Android ecosystem has undergone a major transformation. Google officially declared Kotlin as the preferred language for Android development in 2019, and modern Android development now revolves around Jetpack Compose for UI, coroutines for async work, and a unidirectional data flow architecture. Traditional Java-based approaches and old patterns like AsyncTask are obsolete. This tutorial equips you with the current best practices and tools that the industry expects, ensuring you build maintainable, scalable, and performant Android applications.

## Core Content

### Android Studio Setup and Project Configuration

Download and install Android Studio (current stable version). During installation, ensure the Android SDK, Android Emulator, and Kotlin plugin are included. Create a new project with the "Empty Compose Activity" template. Configure Gradle with Kotlin DSL and set the minimum SDK to API 26 (Android 8.0).

```groovy
// settings.gradle.kts
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
```

### Kotlin Basics: Null Safety, Coroutines, Flows, and Sealed Classes

Kotlin's type system eliminates null pointer exceptions at compile time. The `?` operator marks nullable types, and the `?:` elvis operator provides defaults. Coroutines enable structured concurrency with `launch` and `async`. Flows are cold asynchronous streams that emit values over time. Sealed classes represent restricted class hierarchies, perfect for modeling UI states.

```kotlin
// Null safety example
var name: String? = null
val length = name?.length ?: 0

// Coroutine with Flow
class UserRepository {
    fun getUsers(): Flow<List<User>> = flow {
        val users = api.fetchUsers()
        emit(users)
    }.flowOn(Dispatchers.IO)
}

// Sealed class for UI state
sealed class UiState<out T> {
    data object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}
```

### Jetpack Compose Basics

Jetpack Compose is a declarative UI toolkit. You describe what the UI should look like given the current state, and Compose handles the rendering. Key composables include `Text`, `Button`, `Image`, `Column`, `Row`, and `Box`. Composables accept modifiers for styling and layout.

```kotlin
@Composable
fun Greeting(name: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(text = "Hello, $name!", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(8.dp))
        Button(onClick = { /* handle click */ }) {
            Text("Click Me")
        }
    }
}
```

### Layouts and Theming with Material Design 3

Material Design 3 (Material You) provides dynamic theming. Define a `MaterialTheme` with custom color schemes and typography. Compose layouts use `Column`, `Row`, `Box`, `LazyColumn`, and `LazyRow` for scrollable content.

```kotlin
private val LightColorScheme = lightColorScheme(
    primary = Purple40,
    secondary = PurpleGrey40,
    tertiary = Pink40
)

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
```

### Navigation with NavHost and BottomNavigation

Jetpack Navigation Compose manages screen transitions. Define a `NavHost` with a route graph and use `BottomNavigation` for tab-based navigation.

```kotlin
sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Profile : Screen("profile")
    data object Settings : Screen("settings")
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    Scaffold(
        bottomBar = {
            BottomNavigationBar(navController = navController)
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) { HomeScreen() }
            composable(Screen.Profile.route) { ProfileScreen() }
            composable(Screen.Settings.route) { SettingsScreen() }
        }
    }
}
```

### Room Database

Room is an abstraction layer over SQLite. Define entities with `@Entity`, DAOs with `@Dao`, and the database class with `@Database`.

```kotlin
@Entity(tableName = "users")
data class User(
    @PrimaryKey val id: Int,
    val name: String,
    val email: String
)

@Dao
interface UserDao {
    @Query("SELECT * FROM users")
    fun getAllUsers(): Flow<List<User>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: User)
}

@Database(entities = [User::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
}
```

### Retrofit Networking

Retrofit turns HTTP APIs into Kotlin interfaces. Combine with Gson or Moshi for JSON serialization and coroutines for async calls.

```kotlin
interface ApiService {
    @GET("users")
    suspend fun getUsers(): List<User>

    @POST("users")
    suspend fun createUser(@Body user: User): User
}

object RetrofitClient {
    private val retrofit = Retrofit.Builder()
        .baseUrl("https://api.example.com/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
```

### ViewModel and StateFlow

ViewModel survives configuration changes and exposes UI state via StateFlow. Collect flows lifecycle-aware in composables.

```kotlin
class UserViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<List<User>>>(UiState.Loading)
    val uiState: StateFlow<UiState<List<User>>> = _uiState.asStateFlow()

    init {
        loadUsers()
    }

    fun loadUsers() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            try {
                val users = repository.getUsers()
                _uiState.value = UiState.Success(users)
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}
```

### Hilt Dependency Injection

Hilt provides a standard way to use DI in Android applications. Annotate application class with `@HiltAndroidApp`, activities with `@AndroidEntryPoint`, and provide dependencies with `@Module` and `@Provides` or `@Binds`.

```kotlin
@HiltAndroidApp
class MyApplication : Application()

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var userViewModel: UserViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                Greeting("Android")
            }
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideApiService(): ApiService = RetrofitClient.apiService
}
```

### Firebase Integration

Firebase provides Authentication, Firestore database, Cloud Messaging, and Analytics. Add Firebase via the Firebase Assistant in Android Studio or manually via the `google-services.json` configuration file.

```kotlin
// Firebase Authentication
val auth = FirebaseAuth.getInstance()
auth.signInWithEmailAndPassword(email, password)
    .addOnCompleteListener { task ->
        if (task.isSuccessful) {
            // Sign-in success
        }
    }

// Firestore
val db = FirebaseFirestore.getInstance()
db.collection("users")
    .get()
    .addOnSuccessListener { documents ->
        for (document in documents) {
            Log.d(TAG, "${document.id} => ${document.data}")
        }
    }
```

### Play Store Deployment

Prepare your app for release: generate a signed bundle (AAB) using Android Studio's Build > Generate Signed Bundle/APK, configure versioning in `build.gradle.kts`, test the release build, and upload to the Google Play Console.

```kotlin
// build.gradle.kts versioning
android {
    defaultConfig {
        versionCode = 1
        versionName = "1.0.0"
    }
    signingConfigs {
        create("release") {
            storeFile = file("keystore.jks")
            storePassword = System.getenv("STORE_PASSWORD")
            keyAlias = System.getenv("KEY_ALIAS")
            keyPassword = System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

## Code Examples

### Complete Login Screen with ViewModel

```kotlin
// LoginViewModel.kt
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _email = MutableStateFlow("")
    val email: StateFlow<String> = _email.asStateFlow()

    private val _password = MutableStateFlow("")
    val password: StateFlow<String> = _password.asStateFlow()

    private val _loginState = MutableStateFlow<UiState<Unit>>(UiState.Loading)
    val loginState: StateFlow<UiState<Unit>> = _loginState.asStateFlow()

    fun onEmailChanged(email: String) { _email.value = email }
    fun onPasswordChanged(password: String) { _password.value = password }

    fun login() {
        viewModelScope.launch {
            _loginState.value = UiState.Loading
            try {
                authRepository.login(_email.value, _password.value)
                _loginState.value = UiState.Success(Unit)
            } catch (e: Exception) {
                _loginState.value = UiState.Error(e.message ?: "Login failed")
            }
        }
    }
}

// LoginScreen.kt
@Composable
fun LoginScreen(viewModel: LoginViewModel = hiltViewModel()) {
    val email by viewModel.email.collectAsState()
    val password by viewModel.password.collectAsState()
    val loginState by viewModel.loginState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Welcome Back",
            style = MaterialTheme.typography.headlineLarge
        )
        Spacer(modifier = Modifier.height(24.dp))
        OutlinedTextField(
            value = email,
            onValueChange = viewModel::onEmailChanged,
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = viewModel::onPasswordChanged,
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = viewModel::login,
            modifier = Modifier.fillMaxWidth(),
            enabled = email.isNotBlank() && password.isNotBlank()
        ) {
            Text("Sign In")
        }
        when (val state = loginState) {
            is UiState.Loading -> CircularProgressIndicator()
            is UiState.Success -> Text("Login successful!", color = MaterialTheme.colorScheme.primary)
            is UiState.Error -> Text(state.message, color = MaterialTheme.colorScheme.error)
        }
    }
}
```

## Key Insights

- **State management**: Always use StateFlow or MutableStateFlow for UI state in ViewModels. Never expose mutable state directly to the UI.
- **Coroutine scopes**: Use `viewModelScope` in ViewModels and `lifecycleScope` in composables or activities. Avoid GlobalScope.
- **Dependency injection**: Hilt simplifies DI significantly compared to manual Dagger. Use `@HiltViewModel` for ViewModels and `@Inject` for constructor injection.
- **Error handling**: Model errors explicitly with sealed class hierarchies (Success, Error, Loading). Never swallow exceptions in coroutines.
- **Performance**: Use `LazyColumn` for lists, `remember` and `derivedStateOf` to avoid recompositions, and `LaunchedEffect` for side effects.
- **Testing**: Write unit tests for ViewModels using Turbine for Flow testing, and Compose UI tests with `createComposeRule()`.

## Next Steps

- Explore the [Kotlin Android Syllabus](/mobile/kotlin/syllabi/android-development-syllabus.md) for a structured 12-week learning path.
- Study the [Kotlin Cheat Sheet](/mobile/kotlin/cheatsheets/kotlin-cheatsheet.md) for quick syntax references.
- Deepen your knowledge with the [Kotlin Android Best Practices Guide](/mobile/kotlin/guides/kotlin-android-best-practices-guide.md).
- Learn about dynamic feature modules, Baseline Profiles, and advanced performance optimization.

## Conclusion

You have completed a comprehensive tour of modern Android development with Kotlin. You can now set up a project, write idiomatic Kotlin code, build UI with Jetpack Compose, manage navigation, persist data with Room, perform networking with Retrofit, manage state with ViewModel and StateFlow, inject dependencies with Hilt, integrate Firebase services, and deploy to the Play Store. Continue practicing by building your own apps and exploring the advanced topics in the accompanying syllabus and guide.

---
title: "Kotlin Cheat Sheet"
description: "A quick reference guide for Kotlin Android development syntax, commands, and code snippets."
category: "mobile"
technology: "kotlin"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# Kotlin Cheat Sheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Declare read-only variable | `val name: String = "Kotlin"` | Immutable reference |
| Declare mutable variable | `var count = 0` | Mutable reference with type inference |
| Nullable type | `var name: String? = null` | Variable can hold null |
| Elvis operator | `val len = name?.length ?: 0` | Default value if null |
| Safe call | `name?.toUpperCase()` | Call only if non-null |
| Function declaration | `fun sum(a: Int, b: Int): Int = a + b` | Single-expression function |
| Lambda expression | `val list = listOf(1,2,3).filter { it > 1 }` | Lambda with implicit `it` parameter |
| Data class | `data class User(val id: Int, val name: String)` | Auto-generates equals/hashCode/toString |
| Sealed class | `sealed class Result { data class Success(val data: T) : Result() }` | Restricted class hierarchy |
| Object declaration | `object Singleton { val name = "Singleton" }` | Thread-safe singleton |
| Companion object | `class MyClass { companion object { const val TAG = "MyClass" } }` | Static members |
| Extension function | `fun String.isEmail(): Boolean = contains("@")` | Add methods to existing classes |
| Scope function (let) | `name?.let { println(it) }` | Execute block only if non-null |
| Scope function (apply) | `User().apply { name = "John"; id = 1 }` | Configure object properties |
| Scope function (run) | `val result = run { calculate() }` | Execute block returning result |
| Scope function (with) | `with(user) { println(name) }` | Call methods on context object |
| Scope function (also) | `user.also { log(it) }` | Perform additional actions |

### Compose Modifiers

| Modifier | Description |
|----------|-------------|
| `Modifier.fillMaxSize()` | Fill maximum available size |
| `Modifier.fillMaxWidth()` | Fill maximum available width |
| `Modifier.padding(16.dp)` | Add padding on all sides |
| `Modifier.size(48.dp)` | Set fixed width and height |
| `Modifier.width(100.dp)` | Set fixed width |
| `Modifier.height(50.dp)` | Set fixed height |
| `Modifier.background(Color.Blue)` | Set background color |
| `Modifier.clickable { onClick() }` | Make element clickable |
| `Modifier.offset(x = 10.dp, y = 20.dp)` | Offset position |
| `Modifier.border(2.dp, Color.Black)` | Add border |
| `Modifier.clip(CircleShape)` | Clip to circular shape |
| `Modifier.weight(1f)` | Take proportional space in Row/Column |
| `Modifier.align(Alignment.CenterHorizontally)` | Align within parent |
| `Modifier.alpha(0.5f)` | Set transparency |

### Room Annotations

| Annotation | Description |
|------------|-------------|
| `@Entity(tableName = "users")` | Marks a class as a Room entity |
| `@PrimaryKey(autoGenerate = true)` | Defines the primary key |
| `@ColumnInfo(name = "full_name")` | Custom column name |
| `@Ignore` | Exclude field from persistence |
| `@Embedded` | Nest another entity inside |
| `@Dao` | Marks a Data Access Object interface |
| `@Query("SELECT * FROM users")` | SQL query operation |
| `@Insert(onConflict = OnConflictStrategy.REPLACE)` | Insert operation |
| `@Update` | Update operation |
| `@Delete` | Delete operation |
| `@Database(entities = [User::class], version = 1)` | Database class annotation |
| `@TypeConverters(Converters::class)` | Custom type converters |

### Retrofit Setup

| Annotation | Description |
|------------|-------------|
| `@GET("users")` | HTTP GET request |
| `@POST("users")` | HTTP POST request |
| `@PUT("users/{id}")` | HTTP PUT request |
| `@DELETE("users/{id}")` | HTTP DELETE request |
| `@Path("id")` | Dynamic path parameter |
| `@Query("page")` | Query parameter |
| `@Body` | Request body |
| `@Header("Authorization")` | Header parameter |
| `@FormUrlEncoded` | Form-encoded request |
| `@Field("email")` | Form field |
| `@Multipart` | Multipart request |
| `@Part("image")` | Multipart part |

### Hilt Annotations

| Annotation | Target | Description |
|------------|--------|-------------|
| `@HiltAndroidApp` | Application class | Enables Hilt DI |
| `@AndroidEntryPoint` | Activity/Fragment/View/Service | Enables injection in Android components |
| `@HiltViewModel` | ViewModel class | Enables ViewModel injection |
| `@Module` | Object/Class | Marks a Hilt module |
| `@InstallIn(SingletonComponent::class)` | Module | Specifies component scope |
| `@Provides` | Module function | Tells Hilt how to provide the dependency |
| `@Binds` | Module function | Binds an interface to implementation |
| `@Singleton` | Provider | Singleton scope |
| `@ViewModelScoped` | Provider | Scoped to ViewModel lifecycle |
| `@ActivityScoped` | Provider | Scoped to Activity lifecycle |
| `@FragmentScoped` | Provider | Scoped to Fragment lifecycle |
| `@Named("name")` | Parameter | Qualifier to differentiate same types |
| `@Inject` | Constructor/Field | Requests dependency injection |

## Common Commands

### ADB (Android Debug Bridge)

```bash
# List connected devices
adb devices

# Install APK
adb install app-release.apk

# Install APK on specific device
adb -s emulator-5554 install app.apk

# Uninstall app
adb uninstall com.example.app

# Clear app data
adb shell pm clear com.example.app

# Start activity
adb shell am start -n com.example.app/.MainActivity

# Send broadcast
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED

# Take screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Record screen
adb shell screenrecord /sdcard/demo.mp4

# View logcat
adb logcat -v time

# Filter logcat by tag
adb logcat -s MainActivity:V

# Clear logcat buffer
adb logcat -c

# Pull file from device
adb pull /sdcard/file.txt

# Push file to device
adb push local.txt /sdcard/
```

### Gradle Commands

```bash
# Clean project
./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Build release AAB
./gradlew bundleRelease

# Run tests
./gradlew test

# Run specific test class
./gradlew testDebugUnitTest --tests "com.example.LoginViewModelTest"

# Run lint
./gradlew lint

# Analyze dependencies
./gradlew :app:dependencies

# Build with build cache
./gradlew assembleDebug --build-cache

# Parallel execution
./gradlew assembleDebug --parallel

# Check dependency updates
./gradlew dependencyUpdates

# Generate baseline profile
./gradlew :app:generateBaselineProfile
```

### Android Studio Shortcuts

| Shortcut (Windows/Linux) | Shortcut (macOS) | Description |
|--------------------------|------------------|-------------|
| `Ctrl+Shift+F` | `Cmd+Shift+F` | Find in files |
| `Ctrl+Shift+R` | `Cmd+Shift+R` | Replace in files |
| `Ctrl+N` | `Cmd+O` | Find class |
| `Ctrl+Shift+N` | `Cmd+Shift+O` | Find file |
| `Alt+Enter` | `Option+Enter` | Show intentions / quick fix |
| `Ctrl+Alt+L` | `Cmd+Option+L` | Format code |
| `Ctrl+Alt+O` | `Ctrl+Option+O` | Optimize imports |
| `Ctrl+Shift+Enter` | `Cmd+Shift+Enter` | Complete statement |
| `Ctrl+Shift+Space` | `Ctrl+Shift+Space` | Smart completion |
| `Ctrl+J` | `Cmd+J` | Insert live template |
| `Ctrl+E` | `Cmd+E` | Recent files |
| `F12` | `F12` | Go to definition |
| `Ctrl+Alt+M` | `Cmd+Option+M` | Extract method |
| `Ctrl+Alt+V` | `Cmd+Option+V` | Extract variable |
| `Alt+Insert` | `Cmd+N` | Generate code (getter, setter, constructor) |
| `Shift+F6` | `Shift+F6` | Rename |
| `Ctrl+Shift+F6` | `Cmd+Shift+F6` | Change signature |

## Code Snippets

### Coroutine Builders

```kotlin
// Launch a coroutine
viewModelScope.launch {
    val result = fetchData()
    updateUI(result)
}

// Async/await for parallel tasks
val deferred1 = async { fetchUser() }
val deferred2 = async { fetchPosts() }
val user = deferred1.await()
val posts = deferred2.await()

// withContext for switching dispatchers
withContext(Dispatchers.IO) {
    val data = database.getData()
}

// Custom coroutine scope
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
scope.launch {
    // coroutine code
}
scope.cancel() // cancel when done
```

### Flow Collectors

```kotlin
// Collecting a StateFlow in Compose
val uiState by viewModel.uiState.collectAsState()

// Collecting a Flow in ViewModel
viewModelScope.launch {
    repository.getUsers()
        .flowOn(Dispatchers.IO)
        .catch { e -> emit(emptyList()) }
        .collect { users ->
            _uiState.value = UiState.Success(users)
        }
}

// Flow transformations
val filteredFlow = repository.getAllItems()
    .map { it.filter { item -> item.isActive } }
    .debounce(300)
    .distinctUntilChanged()

// StateFlow from MutableStateFlow
private val _searchQuery = MutableStateFlow("")
val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()
```

---
title: "Kotlin Jetpack Compose Cheat Sheet"
description: "A quick reference guide for Jetpack Compose UI toolkit — composables, layouts, state, modifiers, navigation, theming, and animations."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Kotlin Jetpack Compose Cheat Sheet

## Quick Reference Table

### Core Composables

| Component | Composable / Modifier | Description |
|-----------|-----------------------|-------------|
| Display text | `Text("Hello")` | Renders a text string |
| Styled text | `Text("Hello", fontSize = 24.sp, fontWeight = Bold)` | Text with typography customization |
| Text input | `TextField(value, onValueChange = { ... })` | Outlined text input field |
| Basic text input | `BasicTextField(value, onValueChange)` | Plain text input without decoration |
| Button | `Button(onClick = { ... }) { Text("OK") }` | Material Design button |
| Outlined button | `OutlinedButton(onClick = { ... }) { Text("OK") }` | Button with outline style |
| Text button | `TextButton(onClick = { ... }) { Text("OK") }` | Flat text-only button |
| Icon button | `IconButton(onClick = { ... }) { Icon(...) }` | Circular icon button |
| Floating action | `FloatingActionButton(onClick = { ... })` | FAB for primary actions |
| Image | `Image(painter, contentDescription = "desc")` | Displays a drawable/image |
| Icon | `Icon(Icons.Default.Home, contentDescription = "Home")` | Material Design icon |
| Checkbox | `Checkbox(checked, onCheckedChange = { ... })` | Boolean toggle checkbox |
| Switch | `Switch(checked, onCheckedChange = { ... })` | On/off toggle switch |
| Slider | `Slider(value, onValueChange = { ... })` | Range slider |
| Progress bar | `LinearProgressIndicator(progress = 0.5f)` | Horizontal progress bar |
| Circular progress | `CircularProgressIndicator()` | Indeterminate circular spinner |
| Card | `Card { Text("Content") }` | Material Design card container |
| Surface | `Surface { ... }` | Background surface with elevation |

### Layout Composables

| Component | Composable | Description |
|-----------|------------|-------------|
| Row | `Row { ... }` | Horizontal arrangement of children |
| Column | `Column { ... }` | Vertical arrangement of children |
| Box | `Box { ... }` | Stack children on top of each other |
| Lazy column | `LazyColumn { items(list) { ... } }` | Scrollable vertical list (lazy) |
| Lazy row | `LazyRow { items(list) { ... } }` | Scrollable horizontal list (lazy) |
| Lazy vertical grid | `LazyVerticalGrid(columns = GridCells.Fixed(2))` | Grid layout |
| Flow row | `FlowRow { ... }` | Wrapping horizontal layout |
| Flow column | `FlowColumn { ... }` | Wrapping vertical layout |
| Scaffold | `Scaffold(topBar, bottomBar, content)` | Material Design screen structure |
| BoxWithConstraints | `BoxWithConstraints { ... }` | Responsive layout with size info |

### State Management

| Concept | Composable / API | Description |
|---------|-----------------|-------------|
| Mutable state | `var text by remember { mutableStateOf("") }` | In-memory state holder |
| State hoisting | `Column { val state = remember { ... }; Child(state, onEvent) }` | Lift state to parent |
| Derived state | `val isEnabled by remember { derivedStateOf { count > 0 } }` | Computed from other state |
| List state | `val items = remember { mutableStateListOf<Item>() }` | Observable mutable list |
| Saved state | `var text by rememberSaveable { mutableStateOf("") }` | State survives config changes |
| ViewModel state | `val uiState by viewModel.uiState.collectAsState()` | Observe ViewModel StateFlow |
| Snapshot flow | `snapshotFlow { counter.value }` | Convert compose state to Flow |

### Key Modifiers

| Modifier | Description |
|----------|-------------|
| `Modifier.fillMaxSize()` | Fill available space entirely |
| `Modifier.fillMaxWidth(fraction = 0.5f)` | Fill fraction of width |
| `Modifier.padding(16.dp)` | Outer spacing on all sides |
| `Modifier.padding(top = 8.dp, bottom = 8.dp)` | Directional padding |
| `Modifier.size(48.dp)` | Fixed width and height |
| `Modifier.width(200.dp)` | Fixed width |
| `Modifier.heightIn(min = 100.dp)` | Constrained height range |
| `Modifier.background(Color.Blue, shape = RoundedCornerShape(8.dp))` | Background color + shape |
| `Modifier.border(2.dp, Color.Gray, CircleShape)` | Border with rounded shape |
| `Modifier.clickable { onClick() }` | Make element clickable |
| `Modifier.weight(1f)` | Proportional space in Row/Column (flex) |
| `Modifier.offset(x = 10.dp, y = 20.dp)` | Positional offset |
| `Modifier.clip(RoundedCornerShape(12.dp))` | Clip to shape bounds |
| `Modifier.alpha(0.5f)` | Opacity |
| `Modifier.rotate(45f)` | Rotation in degrees |
| `Modifier.scale(1.5f)` | Scale transform |
| `Modifier.shadow(4.dp)` | Drop shadow elevation |
| `Modifier.zIndex(10f)` | Draw order in a Box |
| `Modifier.align(Alignment.Center)` | Align within parent (Row/Column/Box) |
| `Modifier.verticalScroll(rememberScrollState())` | Enable vertical scrolling |
| `Modifier.horizontalScroll(rememberScrollState())` | Enable horizontal scrolling |
| `Modifier.pointerInput(Unit) { detectTapGestures { ... } }` | Custom gesture detection |

### Theming

| API | Composable / Class | Description |
|-----|-------------------|-------------|
| Material theme | `MaterialTheme(colorScheme, typography, shapes)` | Root theme container |
| Color scheme | `lightColorScheme(primary = Color(0xFF...))` | Light theme colors |
| Dark color scheme | `darkColorScheme(primary = Color(0xFF...))` | Dark theme colors |
| Typography | `Typography(bodyLarge = TextStyle(...))` | Font sizes, weights, families |
| Shapes | `Shapes(small = RoundedCornerShape(8.dp))` | Shape definitions for components |
| Dynamic colors | `dynamicLightColorScheme(context)` | Material You dynamic colors (Android 12+) |

### Navigation

| API | Composable / Function | Description |
|-----|----------------------|-------------|
| NavHost | `NavHost(navController, startDestination)` | Navigation host container |
| Composable route | `composable("profile/{id}") { backStackEntry -> ... }` | Define a screen route |
| Navigate | `navController.navigate("profile/$id")` | Navigate to a route |
| Pop back | `navController.popBackStack()` | Go back to previous screen |
| Pop up to | `navController.navigate("home") { popUpTo("login") { inclusive = true } }` | Navigate and clear back stack |
| Arguments | `composable("profile/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType }))` | Typed route arguments |

### Animations

| API | Composable / Function | Description |
|-----|----------------------|-------------|
| Value animation | `val offset by animateDpAsState(targetValue = 100.dp)` | Animates a value toward target |
| Color animation | `val bg by animateColorAsState(targetValue = Color.Red)` | Color transitions |
| Float animation | `val alpha by animateFloatAsState(targetValue = 0.5f)` | Float value transitions |
| Size animation | `val size by animateIntSizeAsTarget(targetValue = IntSize(w, h))` | Size transitions |
| Visibility | `AnimatedVisibility(visible) { Text("Hello") }` | Animate enter/exit |
| Content change | `AnimatedContent(targetState = page) { ... }` | Animate content swaps |
| Crossfade | `Crossfade(targetState = screen) { screen -> ... }` | Crossfade between composables |
| Infinite repeat | `val infiniteTransition = rememberInfiniteTransition(label)` | Repeating animations |
| Spring effect | `val offset by animateDpAsState(spring(dampingRatio = 0.5f))` | Spring physics animation |
| Keyframe | `val alpha by animateFloatAsState(animationSpec = tween(300))` | Time-based easing |
| GraphicsLayer | `Modifier.graphicsLayer { rotationX = 45f; alpha = 0.8f }` | Hardware-accelerated layer properties |

## Common Commands

### Compose Compiler and BOM Setup

```kotlin
// build.gradle.kts (Module: app)
@Composable
fun setupCompose() {
    // This is a reference block, not runnable
}

// In build.gradle.kts — Compose BOM
// implementation(platform("androidx.compose:compose-bom:2024.06.00"))
// implementation("androidx.compose.ui:ui")
// implementation("androidx.compose.material3:material3")
// implementation("androidx.compose.ui:ui-tooling-preview")
// debugImplementation("androidx.compose.ui:ui-tooling")
```

### Generate Compose Preview

```bash
# In Android Studio, click the split (Design/Code) icon
# Or use @Preview annotation in code

# Run previews via Gradle (useful for CI)
./gradlew :app:compileDebugAndroidTestKotlin
```

### Enable Compose Metrics

```kotlin
// build.gradle.kts — compose compiler metrics (diagnose recomposition)
// kotlinOptions {
//     freeCompilerArgs = freeCompilerArgs + listOf(
//         "-P",
//         "plugin:androidx.compose.compiler.plugins.kotlin:metricsDestination=" +
//             project.buildDir.absolutePath + "/compose-metrics"
//     )
// }
```

### Compose Multiplatform (KMP) Setup

```kotlin
// build.gradle.kts — shared module (Compose Multiplatform)
// kotlin {
//     sourceSets {
//         commonMain.dependencies {
//             implementation(compose.runtime)
//             implementation(compose.foundation)
//             implementation(compose.material3)
//             implementation(compose.ui)
//         }
//     }
// }
```

## Code Snippets

### Basic Composable Function

```kotlin
@Composable
fun GreetingCard(name: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Hello, $name!",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "Welcome to Jetpack Compose",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun GreetingCardPreview() {
    MaterialTheme {
        GreetingCard(name = "Developers")
    }
}
```

### State Management Patterns

```kotlin
@Composable
fun CounterApp() {
    var count by remember { mutableStateOf(0) }
    val isEven by remember { derivedStateOf { count % 2 == 0 } }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Count: $count",
            style = MaterialTheme.typography.headlineLarge
        )
        Text(
            text = if (isEven) "Even" else "Odd",
            style = MaterialTheme.typography.titleMedium,
            color = if (isEven) Color.Green else Color.Red
        )
        Spacer(modifier = Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { count-- }) { Text("Decrement") }
            Button(onClick = { count++ }) { Text("Increment") }
        }
    }
}
```

### Navigation Setup

```kotlin
// Define routes
object Routes {
    const val HOME = "home"
    const val PROFILE = "profile/{userId}"

    fun profile(userId: String) = "profile/$userId"
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Routes.HOME) {
        composable(Routes.HOME) {
            HomeScreen(
                onNavigateToProfile = { userId ->
                    navController.navigate(Routes.profile(userId))
                }
            )
        }
        composable(
            route = Routes.PROFILE,
            arguments = listOf(navArgument("userId") { type = NavType.StringType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            ProfileScreen(
                userId = userId,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
```

### Theming Setup

```kotlin
private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF1976D2),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFBBDEFB),
    secondary = Color(0xFF03DAC6),
    onSecondary = Color.Black,
    background = Color(0xFFFAFAFA),
    surface = Color.White,
    error = Color(0xFFB00020)
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF90CAF9),
    onPrimary = Color(0xFF0D47A1),
    primaryContainer = Color(0xFF1565C0),
    secondary = Color(0xFF03DAC6),
    onSecondary = Color.Black,
    background = Color(0xFF121212),
    surface = Color(0xFF1E1E1E),
    error = Color(0xFFCF6679)
)

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(
            headlineLarge = TextStyle(
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 40.sp
            ),
            bodyLarge = TextStyle(
                fontSize = 16.sp,
                fontWeight = FontWeight.Normal,
                lineHeight = 24.sp
            )
        ),
        shapes = Shapes(
            small = RoundedCornerShape(4.dp),
            medium = RoundedCornerShape(8.dp),
            large = RoundedCornerShape(16.dp)
        ),
        content = content
    )
}
```

### LazyColumn with Items

```kotlin
data class Message(val id: Int, val author: String, val body: String)

@Composable
fun MessageList(messages: List<Message>, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(
            items = messages,
            key = { message -> message.id }
        ) { message ->
            MessageCard(message = message)
        }

        if (messages.isEmpty()) {
            item {
                Text(
                    text = "No messages yet",
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun MessageCard(message: Message) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = message.author,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = message.body,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
```

### Animation Examples

```kotlin
@Composable
fun AnimatedButton(onClick: () -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val size by animateDpAsState(
        targetValue = if (expanded) 200.dp else 80.dp,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "size"
    )

    Box(
        modifier = Modifier
            .size(size)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF1976D2))
            .clickable {
                expanded = !expanded
                onClick()
            },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = if (expanded) "Expanded!" else "Tap Me",
            color = Color.White
        )
    }
}

@Composable
fun FadeInList(items: List<String>) {
    Column {
        items.forEachIndexed { index, item ->
            var visible by remember { mutableStateOf(false) }
            LaunchedEffect(Unit) {
                delay(index * 100L) // stagger animation
                visible = true
            }
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn() + slideInVertically()
            ) {
                Text(
                    text = item,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp)
                )
            }
        }
    }
}
```

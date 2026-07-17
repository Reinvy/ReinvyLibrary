---
title: "Cheat Sheet Kotlin Jetpack Compose"
description: "Panduan referensi cepat untuk toolkit UI Jetpack Compose — composable, tata letak, state, modifier, navigasi, tema, dan animasi."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "cheatsheet"
locale: "id"
---

# Cheat Sheet Kotlin Jetpack Compose

## Tabel Referensi Cepat

### Composable Inti

| Komponen | Composable / Modifier | Deskripsi |
|----------|----------------------|-----------|
| Menampilkan teks | `Text("Halo")` | Merender string teks |
| Teks bergaya | `Text("Halo", fontSize = 24.sp, fontWeight = Bold)` | Teks dengan kustomisasi tipografi |
| Input teks | `TextField(value, onValueChange = { ... })` | Kolom input teks dengan outline |
| Input teks dasar | `BasicTextField(value, onValueChange)` | Input teks polos tanpa dekorasi |
| Tombol | `Button(onClick = { ... }) { Text("OK") }` | Tombol Material Design |
| Tombol outline | `OutlinedButton(onClick = { ... }) { Text("OK") }` | Tombol dengan gaya outline |
| Tombol teks | `TextButton(onClick = { ... }) { Text("OK") }` | Tombol datar berbasis teks |
| Tombol ikon | `IconButton(onClick = { ... }) { Icon(...) }` | Tombol ikon melingkar |
| Floating action | `FloatingActionButton(onClick = { ... })` | FAB untuk aksi utama |
| Gambar | `Image(painter, contentDescription = "deskripsi")` | Menampilkan drawable/gambar |
| Ikon | `Icon(Icons.Default.Home, contentDescription = "Beranda")` | Ikon Material Design |
| Kotak centang | `Checkbox(checked, onCheckedChange = { ... })` | Toggle boolean kotak centang |
| Switch | `Switch(checked, onCheckedChange = { ... })` | Toggle on/off |
| Slider | `Slider(value, onValueChange = { ... })` | Slider rentang |
| Bilah progres | `LinearProgressIndicator(progress = 0.5f)` | Bilah progres horizontal |
| Progres melingkar | `CircularProgressIndicator()` | Spinner melingkar tak tentu |
| Kartu | `Card { Text("Konten") }` | Kontainer kartu Material Design |
| Surface | `Surface { ... }` | Surface latar dengan elevasi |

### Composable Tata Letak

| Komponen | Composable | Deskripsi |
|----------|------------|-----------|
| Row | `Row { ... }` | Susunan horizontal anak |
| Column | `Column { ... }` | Susunan vertikal anak |
| Box | `Box { ... }` | Tumpuk anak di atas satu sama lain |
| Lazy column | `LazyColumn { items(list) { ... } }` | Daftar vertikal scroll (lazy) |
| Lazy row | `LazyRow { items(list) { ... } }` | Daftar horizontal scroll (lazy) |
| Lazy vertical grid | `LazyVerticalGrid(columns = GridCells.Fixed(2))` | Tata letak grid |
| Flow row | `FlowRow { ... }` | Tata letak horizontal wrapping |
| Flow column | `FlowColumn { ... }` | Tata letak vertikal wrapping |
| Scaffold | `Scaffold(topBar, bottomBar, content)` | Struktur layar Material Design |
| BoxWithConstraints | `BoxWithConstraints { ... }` | Tata letak responsif dengan info ukuran |

### Manajemen State

| Konsep | Composable / API | Deskripsi |
|--------|-----------------|-----------|
| Mutable state | `var text by remember { mutableStateOf("") }` | Penyimpan state di memori |
| State hoisting | `Column { val state = remember { ... }; Child(state, onEvent) }` | Angkat state ke induk |
| Derived state | `val isEnabled by remember { derivedStateOf { count > 0 } }` | Dihitung dari state lain |
| List state | `val items = remember { mutableStateListOf<Item>() }` | Mutable list observable |
| Saved state | `var text by rememberSaveable { mutableStateOf("") }` | State bertahan dari config changes |
| ViewModel state | `val uiState by viewModel.uiState.collectAsState()` | Observasi StateFlow ViewModel |
| Snapshot flow | `snapshotFlow { counter.value }` | Konversi state compose ke Flow |

### Modifier Utama

| Modifier | Deskripsi |
|----------|-----------|
| `Modifier.fillMaxSize()` | Isi seluruh ruang tersedia |
| `Modifier.fillMaxWidth(fraction = 0.5f)` | Isi sebagian lebar |
| `Modifier.padding(16.dp)` | Jarak luar di semua sisi |
| `Modifier.padding(top = 8.dp, bottom = 8.dp)` | Padding directional |
| `Modifier.size(48.dp)` | Lebar dan tinggi tetap |
| `Modifier.width(200.dp)` | Lebar tetap |
| `Modifier.heightIn(min = 100.dp)` | Rentang tinggi terbatas |
| `Modifier.background(Color.Blue, shape = RoundedCornerShape(8.dp))` | Warna latar + bentuk |
| `Modifier.border(2.dp, Color.Gray, CircleShape)` | Batas dengan bentuk bulat |
| `Modifier.clickable { onClick() }` | Buat elemen dapat diklik |
| `Modifier.weight(1f)` | Ruang proporsional di Row/Column (flex) |
| `Modifier.offset(x = 10.dp, y = 20.dp)` | Offset posisi |
| `Modifier.clip(RoundedCornerShape(12.dp))` | Potong ke batas bentuk |
| `Modifier.alpha(0.5f)` | Opasitas |
| `Modifier.rotate(45f)` | Rotasi dalam derajat |
| `Modifier.scale(1.5f)` | Transformasi skala |
| `Modifier.shadow(4.dp)` | Drop shadow elevasi |
| `Modifier.zIndex(10f)` | Urutan gambar di dalam Box |
| `Modifier.align(Alignment.Center)` | Ratakan dalam induk (Row/Column/Box) |
| `Modifier.verticalScroll(rememberScrollState())` | Aktifkan scroll vertikal |
| `Modifier.horizontalScroll(rememberScrollState())` | Aktifkan scroll horizontal |
| `Modifier.pointerInput(Unit) { detectTapGestures { ... } }` | Deteksi gesture kustom |

### Tema

| API | Composable / Class | Deskripsi |
|-----|-------------------|-----------|
| Material theme | `MaterialTheme(colorScheme, typography, shapes)` | Kontainer tema root |
| Color scheme | `lightColorScheme(primary = Color(0xFF...))` | Warna tema terang |
| Dark color scheme | `darkColorScheme(primary = Color(0xFF...))` | Warna tema gelap |
| Typography | `Typography(bodyLarge = TextStyle(...))` | Ukuran font, berat, keluarga |
| Shapes | `Shapes(small = RoundedCornerShape(8.dp))` | Definisi bentuk untuk komponen |
| Dynamic colors | `dynamicLightColorScheme(context)` | Warna dinamis Material You (Android 12+) |

### Navigasi

| API | Composable / Function | Deskripsi |
|-----|----------------------|-----------|
| NavHost | `NavHost(navController, startDestination)` | Kontainer host navigasi |
| Composable route | `composable("profile/{id}") { backStackEntry -> ... }` | Definisi rute layar |
| Navigate | `navController.navigate("profile/$id")` | Navigasi ke rute |
| Pop back | `navController.popBackStack()` | Kembali ke layar sebelumnya |
| Pop up to | `navController.navigate("home") { popUpTo("login") { inclusive = true } }` | Navigasi dan hapus back stack |
| Arguments | `composable("profile/{id}", arguments = listOf(navArgument("id") { type = NavType.IntType }))` | Argumen rute bertipe |

### Animasi

| API | Composable / Function | Deskripsi |
|-----|----------------------|-----------|
| Animasi nilai | `val offset by animateDpAsState(targetValue = 100.dp)` | Menganimasi nilai menuju target |
| Animasi warna | `val bg by animateColorAsState(targetValue = Color.Red)` | Transisi warna |
| Animasi float | `val alpha by animateFloatAsState(targetValue = 0.5f)` | Transisi nilai float |
| Animasi ukuran | `val size by animateIntSizeAsTarget(targetValue = IntSize(w, h))` | Transisi ukuran |
| Visibilitas | `AnimatedVisibility(visible) { Text("Halo") }` | Animasi masuk/keluar |
| Perubahan konten | `AnimatedContent(targetState = page) { ... }` | Animasi pertukaran konten |
| Crossfade | `Crossfade(targetState = screen) { screen -> ... }` | Crossfade antar composable |
| Infinite repeat | `val infiniteTransition = rememberInfiniteTransition(label)` | Animasi berulang |
| Efek spring | `val offset by animateDpAsState(spring(dampingRatio = 0.5f))` | Animasi fisika spring |
| Keyframe | `val alpha by animateFloatAsState(animationSpec = tween(300))` | Easing berbasis waktu |
| GraphicsLayer | `Modifier.graphicsLayer { rotationX = 45f; alpha = 0.8f }` | Properti layer hardware-accelerated |

## Perintah Umum

### Setup Compiler Compose dan BOM

```kotlin
// build.gradle.kts (Module: app)
@Composable
fun setupCompose() {
    // Blok referensi, tidak dapat dijalankan
}

// Di build.gradle.kts — Compose BOM
// implementation(platform("androidx.compose:compose-bom:2024.06.00"))
// implementation("androidx.compose.ui:ui")
// implementation("androidx.compose.material3:material3")
// implementation("androidx.compose.ui:ui-tooling-preview")
// debugImplementation("androidx.compose.ui:ui-tooling")
```

### Generate Preview Compose

```bash
# Di Android Studio, klik ikon split (Design/Code)
# Atau gunakan anotasi @Preview di kode

# Jalankan preview via Gradle (berguna untuk CI)
./gradlew :app:compileDebugAndroidTestKotlin
```

### Aktifkan Metrik Compose

```kotlin
// build.gradle.kts — metrik compiler compose (diagnosis recomposition)
// kotlinOptions {
//     freeCompilerArgs = freeCompilerArgs + listOf(
//         "-P",
//         "plugin:androidx.compose.compiler.plugins.kotlin:metricsDestination=" +
//             project.buildDir.absolutePath + "/compose-metrics"
//     )
// }
```

### Setup Compose Multiplatform (KMP)

```kotlin
// build.gradle.kts — modul shared (Compose Multiplatform)
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

## Potongan Kode

### Fungsi Composable Dasar

```kotlin
@Composable
fun KartuSalam(nama: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Halo, $nama!",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "Selamat datang di Jetpack Compose",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun KartuSalamPreview() {
    MaterialTheme {
        KartuSalam(nama = "Developer")
    }
}
```

### Pola Manajemen State

```kotlin
@Composable
fun AplikasiKalkulator() {
    var hitung by remember { mutableStateOf(0) }
    val genap by remember { derivedStateOf { hitung % 2 == 0 } }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Hitungan: $hitung",
            style = MaterialTheme.typography.headlineLarge
        )
        Text(
            text = if (genap) "Genap" else "Ganjil",
            style = MaterialTheme.typography.titleMedium,
            color = if (genap) Color.Green else Color.Red
        )
        Spacer(modifier = Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { hitung-- }) { Text("Kurangi") }
            Button(onClick = { hitung++ }) { Text("Tambah") }
        }
    }
}
```

### Setup Navigasi

```kotlin
// Definisikan rute
object Rute {
    const val BERANDA = "beranda"
    const val PROFIL = "profil/{userId}"

    fun profil(userId: String) = "profil/$userId"
}

@Composable
fun NavigasiAplikasi() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Rute.BERANDA) {
        composable(Rute.BERANDA) {
            LayarBeranda(
                onNavigateToProfil = { userId ->
                    navController.navigate(Rute.profil(userId))
                }
            )
        }
        composable(
            route = Rute.PROFIL,
            arguments = listOf(navArgument("userId") { type = NavType.StringType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            LayarProfil(
                userId = userId,
                onKembali = { navController.popBackStack() }
            )
        }
    }
}
```

### Setup Tema

```kotlin
private val SkemaWarnaTerang = lightColorScheme(
    primary = Color(0xFF1976D2),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFBBDEFB),
    secondary = Color(0xFF03DAC6),
    onSecondary = Color.Black,
    background = Color(0xFFFAFAFA),
    surface = Color.White,
    error = Color(0xFFB00020)
)

private val SkemaWarnaGelap = darkColorScheme(
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
fun TemaAplikasi(
    temaGelap: Boolean = isSystemInDarkTheme(),
    konten: @Composable () -> Unit
) {
    val skemaWarna = if (temaGelap) SkemaWarnaGelap else SkemaWarnaTerang

    MaterialTheme(
        colorScheme = skemaWarna,
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
        content = konten
    )
}
```

### LazyColumn dengan Item

```kotlin
data class Pesan(val id: Int, val pengirim: String, val isi: String)

@Composable
fun DaftarPesan(pesanList: List<Pesan>, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(
            items = pesanList,
            key = { pesan -> pesan.id }
        ) { pesan ->
            KartuPesan(pesan = pesan)
        }

        if (pesanList.isEmpty()) {
            item {
                Text(
                    text = "Belum ada pesan",
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
fun KartuPesan(pesan: Pesan) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = pesan.pengirim,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = pesan.isi,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
```

### Contoh Animasi

```kotlin
@Composable
fun TombolAnimasi(onClick: () -> Unit) {
    var diperluas by remember { mutableStateOf(false) }
    val ukuran by animateDpAsState(
        targetValue = if (diperluas) 200.dp else 80.dp,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "ukuran"
    )

    Box(
        modifier = Modifier
            .size(ukuran)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF1976D2))
            .clickable {
                diperluas = !diperluas
                onClick()
            },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = if (diperluas) "Diperluas!" else "Tekan Saya",
            color = Color.White
        )
    }
}

@Composable
fun DaftarFadeMasuk(itemList: List<String>) {
    Column {
        itemList.forEachIndexed { index, item ->
            var terlihat by remember { mutableStateOf(false) }
            LaunchedEffect(Unit) {
                delay(index * 100L) // animasi bergiliran
                terlihat = true
            }
            AnimatedVisibility(
                visible = terlihat,
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

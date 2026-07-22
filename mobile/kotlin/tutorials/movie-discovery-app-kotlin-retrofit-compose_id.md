---
title: "Membangun Aplikasi Discovery Film dengan Kotlin, Retrofit, dan Jetpack Compose"
description: "Tutorial berbasis proyek untuk membangun aplikasi discovery film Android modern menggunakan Kotlin, Retrofit untuk jaringan, Jetpack Compose untuk UI, dan API TMDB gratis."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Discovery Film dengan Kotlin, Retrofit, dan Jetpack Compose

## Ringkasan

Tutorial berbasis proyek ini memandu Anda dalam membangun aplikasi discovery film yang lengkap untuk Android menggunakan Kotlin. Anda akan mengintegrasikan API gratis TMDB (The Movie Database) dengan Retrofit dan OkHttp, membangun UI reaktif dengan Jetpack Compose dan Material 3, mengimplementasikan navigasi multi-layar dengan Navigation Compose, mengelola state dengan ViewModel dan StateFlow, menangani pemuatan gambar dengan Coil, serta mengimplementasikan pencarian dengan debouncing dan paginasi infinite scroll. Pada akhirnya, Anda akan memiliki aplikasi berkualitas produksi yang menampilkan film trending, memungkinkan pencarian, dan menampilkan informasi detail film.

## Target Audiens

- Pengembang Android yang mengetahui dasar-dasar Kotlin dan ingin membangun aplikasi multi-fitur dunia nyata.
- Pengembang yang terbiasa dengan dasar-dasar Jetpack Compose dan ingin mempelajari pola networking dan manajemen state.
- Pengembang mobile tingkat menengah yang beralih dari platform lain ke pengembangan Android native.

## Prasyarat

- Pengetahuan menengah tentang Kotlin (class, coroutine, lambda, sealed class).
- Keakraban dasar dengan Jetpack Compose (fungsi composable, modifier, tata letak dasar).
- Android Studio Hedgehog (2023.1.1) atau yang lebih baru telah terinstal.
- Perangkat atau emulator yang menjalankan Android API 26+.
- Kunci API gratis dari [TMDB](https://www.themoviedb.org/settings/api).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyiapkan proyek Android modern dengan Jetpack Compose dan Material 3.
- Mengintegrasikan dan mengonfigurasi Retrofit dengan OkHttp untuk networking HTTP yang type-safe.
- Mengimplementasikan pola Repository untuk mengabstraksi sumber data.
- Mengelola state UI secara reaktif dengan Kotlin StateFlow dan ViewModel.
- Membangun alur navigasi multi-layar dengan Navigation Compose.
- Mengimplementasikan pencarian dengan debouncing menggunakan operator Kotlin Flow.
- Menambahkan paginasi infinite scroll dengan listener scroll manual.
- Menangani state loading, error, dan kosong dengan baik di UI Compose.
- Memuat dan menyimpan cache gambar jaringan dengan pustaka Coil.

## Konteks dan Motivasi

Aplikasi mobile yang mengonsumsi REST API adalah tulang punggung pengembangan Android modern. Membangun aplikasi discovery film adalah proyek yang sangat baik karena melatih hampir setiap pola arsitektur Android inti dalam satu basis kode yang kohesif: networking dengan Retrofit, manajemen state dengan ViewModel dan Flow, navigasi antar layar, pemuatan gambar, paginasi, dan pencarian.

API TMDB gratis, terdokumentasi dengan baik, dan menyediakan data yang kaya sehingga aplikasi menjadi menarik untuk dibangun dan digunakan. Dengan membangun aplikasi ini langkah demi langkah, Anda akan menginternalisasi pola-pola yang dapat ditransfer langsung ke aplikasi Android berbasis data apa pun — dari feed media sosial hingga katalog e-commerce.

## Konten Inti

### Persiapan Proyek dan Dependensi

Buat proyek Android baru di Android Studio dengan template **Empty Compose Activity**. Gunakan nama paket berikut: `com.example.moviediscovery`.

Tambahkan dependensi berikut ke `app/build.gradle.kts`:

```kotlin
// Retrofit untuk networking
implementation("com.squareup.retrofit2:retrofit:2.9.0")
implementation("com.squareup.retrofit2:converter-gson:2.9.0")
implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

// Jetpack Compose
implementation(platform("androidx.compose:compose-bom:2024.02.00"))
implementation("androidx.compose.material3:material3")
implementation("androidx.compose.ui:ui")
implementation("androidx.compose.ui:ui-tooling-preview")
implementation("androidx.activity:activity-compose:1.8.2")

// Navigation
implementation("androidx.navigation:navigation-compose:2.7.7")

// ViewModel + Lifecycle
implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")

// Coil untuk pemuatan gambar
implementation("io.coil-kt:coil-compose:2.6.0")

// Coroutines
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
```

Aktifkan Compose di blok `buildFeatures`:

```kotlin
android {
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.11"
    }
}
```

### Lapisan API dengan Retrofit

Definisikan model data dan antarmuka API. Buat paket `data/` dengan struktur berikut:

```text
data/
  model/
    Movie.kt
    MovieDetail.kt
    MovieResponse.kt
  remote/
    TmdbApi.kt
    RetrofitClient.kt
  repository/
    MovieRepository.kt
```

Mulai dengan model respons API. Respons paginasi TMDB membungkus hasil dalam envelope umum:

```kotlin
// data/model/MovieResponse.kt
data class MovieResponse(
    val page: Int,
    val results: List<Movie>,
    val totalPages: Int,
    val totalResults: Int
)

// data/model/Movie.kt
@Parcelize
data class Movie(
    val id: Int,
    val title: String,
    @SerializedName("poster_path")
    val posterPath: String?,
    @SerializedName("release_date")
    val releaseDate: String?,
    @SerializedName("vote_average")
    val voteAverage: Double,
    val overview: String,
    @SerializedName("genre_ids")
    val genreIds: List<Int>
) : Parcelable

// data/model/MovieDetail.kt
data class MovieDetail(
    val id: Int,
    val title: String,
    val overview: String,
    @SerializedName("poster_path")
    val posterPath: String?,
    @SerializedName("backdrop_path")
    val backdropPath: String?,
    @SerializedName("release_date")
    val releaseDate: String,
    @SerializedName("vote_average")
    val voteAverage: Double,
    val runtime: Int?,
    val genres: List<Genre>,
    val tagline: String?
)

data class Genre(val id: Int, val name: String)
```

Definisikan antarmuka API dengan anotasi Retrofit:

```kotlin
// data/remote/TmdbApi.kt
interface TmdbApi {

    @GET("3/movie/popular")
    suspend fun getPopularMovies(
        @Query("page") page: Int = 1
    ): MovieResponse

    @GET("3/movie/{id}")
    suspend fun getMovieDetail(
        @Path("id") movieId: Int
    ): MovieDetail

    @GET("3/search/movie")
    suspend fun searchMovies(
        @Query("query") query: String,
        @Query("page") page: Int = 1
    ): MovieResponse

    @GET("3/movie/now_playing")
    suspend fun getNowPlaying(
        @Query("page") page: Int = 1
    ): MovieResponse
}
```

Buat singleton Retrofit client dengan interceptor untuk kunci API:

```kotlin
// data/remote/RetrofitClient.kt
object RetrofitClient {

    private const val BASE_URL = "https://api.themoviedb.org/"
    private const val API_KEY = "YOUR_TMDB_API_KEY"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG)
            HttpLoggingInterceptor.Level.BODY
        else
            HttpLoggingInterceptor.Level.NONE
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val url = original.url.newBuilder()
            .addQueryParameter("api_key", API_KEY)
            .addQueryParameter("language", "en-US")
            .build()
        chain.proceed(original.newBuilder().url(url).build())
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val api: TmdbApi = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}
```

### Pola Repository

Buat repository yang membungkus panggilan API dan menyediakan antarmuka data yang bersih untuk ViewModel:

```kotlin
// data/repository/MovieRepository.kt
class MovieRepository(private val api: TmdbApi = RetrofitClient.api) {

    suspend fun getPopularMovies(page: Int): Result<MovieResponse> = runCatching {
        api.getPopularMovies(page)
    }

    suspend fun getMovieDetail(movieId: Int): Result<MovieDetail> = runCatching {
        api.getMovieDetail(movieId)
    }

    suspend fun searchMovies(query: String, page: Int): Result<MovieResponse> = runCatching {
        api.searchMovies(query, page)
    }

    suspend fun getNowPlaying(page: Int): Result<MovieResponse> = runCatching {
        api.getNowPlaying(page)
    }
}
```

Pembungkus `Result` dari pustaka standar Kotlin menyediakan cara yang bersih untuk menyebarkan sukses-atau-gagal tanpa melempar exception melintasi lapisan arsitektur.

### ViewModel dan StateFlow

Definisikan hierarki sealed untuk state UI:

```kotlin
// ui/home/HomeUiState.kt
sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Success(
        val movies: List<Movie>,
        val isLoadingMore: Boolean = false
    ) : HomeUiState
    data class Error(val message: String) : HomeUiState
}
```

Bangun ViewModel dengan StateFlow untuk state reaktif:

```kotlin
// ui/home/HomeViewModel.kt
class HomeViewModel(
    private val repository: MovieRepository = MovieRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private var currentPage = 1
    private var hasMorePages = true

    init {
        loadPopularMovies()
        observeSearch()
    }

    fun loadPopularMovies() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            repository.getPopularMovies(page = 1).fold(
                onSuccess = { response ->
                    currentPage = 1
                    hasMorePages = currentPage < response.totalPages
                    _uiState.value = HomeUiState.Success(
                        movies = response.results
                    )
                },
                onFailure = { error ->
                    _uiState.value = HomeUiState.Error(
                        error.localizedMessage ?: "Terjadi kesalahan"
                    )
                }
            )
        }
    }

    fun loadMore() {
        val currentState = _uiState.value
        if (currentState !is HomeUiState.Success) return
        if (!hasMorePages || currentState.isLoadingMore) return

        viewModelScope.launch {
            _uiState.value = currentState.copy(isLoadingMore = true)
            val nextPage = currentPage + 1

            val source = if (_searchQuery.value.isBlank())
                repository.getPopularMovies(nextPage)
            else
                repository.searchMovies(_searchQuery.value, nextPage)

            source.fold(
                onSuccess = { response ->
                    currentPage = nextPage
                    hasMorePages = nextPage < response.totalPages
                    _uiState.value = currentState.copy(
                        movies = currentState.movies + response.results,
                        isLoadingMore = false
                    )
                },
                onFailure = {
                    _uiState.value = currentState.copy(isLoadingMore = false)
                }
            )
        }
    }

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    private fun observeSearch() {
        viewModelScope.launch {
            _searchQuery
                .debounce(400)
                .filter { it.isNotBlank() }
                .distinctUntilChanged()
                .collectLatest { query ->
                    _uiState.value = HomeUiState.Loading
                    repository.searchMovies(query, 1).fold(
                        onSuccess = { response ->
                            currentPage = 1
                            hasMorePages = currentPage < response.totalPages
                            _uiState.value = HomeUiState.Success(
                                movies = response.results
                            )
                        },
                        onFailure = { error ->
                            _uiState.value = HomeUiState.Error(
                                error.localizedMessage ?: "Pencarian gagal"
                            )
                        }
                    )
                }
        }
    }
}
```

Pola-pola kunci dalam ViewModel ini:

- **`debounce(400)`**: menunggu 400ms setelah pengguna berhenti mengetik sebelum mengirim permintaan pencarian — mencegah panggilan API yang berlebihan.
- **`distinctUntilChanged()`**: melewatkan kueri duplikat (misalnya, pengguna menghapus lalu mengetik ulang karakter yang sama).
- **`collectLatest`**: membatalkan coroutine pencarian sebelumnya jika kueri baru tiba sebelum yang sebelumnya selesai — penting untuk pencarian yang responsif.
- **`isLoadingMore` flag**: mencegah permintaan paginasi duplikat saat pemuatan sedang berlangsung.

### UI Compose: Layar Daftar Film

Bangun layar utama yang menampilkan grid film dengan bilah pencarian:

```kotlin
// ui/home/HomeScreen.kt
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = viewModel(),
    onMovieClick: (Int) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Discovery Film") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Bilah pencarian
            OutlinedTextField(
                value = searchQuery,
                onValueChange = viewModel::updateSearchQuery,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Cari film...") },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = "Cari")
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Konten
            when (val state = uiState) {
                is HomeUiState.Loading -> LoadingIndicator()
                is HomeUiState.Error -> ErrorMessage(
                    message = state.message,
                    onRetry = { viewModel.loadPopularMovies() }
                )
                is HomeUiState.Success -> MovieGrid(
                    movies = state.movies,
                    isLoadingMore = state.isLoadingMore,
                    onMovieClick = onMovieClick,
                    onLoadMore = viewModel::loadMore
                )
            }
        }
    }
}

@Composable
fun MovieGrid(
    movies: List<Movie>,
    isLoadingMore: Boolean,
    onMovieClick: (Int) -> Unit,
    onLoadMore: () -> Unit
) {
    val listState = rememberLazyListState()

    // Deteksi ketika pengguna scroll mendekati akhir
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()
                ?: return@derivedStateOf false
            lastVisibleItem.index >= listState.layoutInfo.totalItemsCount - 3
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore && !isLoadingMore) {
            onLoadMore()
        }
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        state = listState,
        contentPadding = PaddingValues(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(movies, key = { it.id }) { movie ->
            MovieCard(movie = movie, onClick = { onMovieClick(movie.id) })
        }
        if (isLoadingMore) {
            item(span = { GridItemSpan(2) }) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}
```

Pola `derivedStateOf` + `LaunchedEffect` mendeteksi ketika pengguna scroll dalam jarak 3 item dari akhir dan memicu `onLoadMore()`. Ini adalah mekanisme infinite scroll.

### Kartu Film Composable

Setiap film muncul sebagai kartu dengan gambar poster, judul, rating, dan tahun rilis:

```kotlin
@Composable
fun MovieCard(movie: Movie, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            // Gambar poster
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data("https://image.tmdb.org/t/p/w500${movie.posterPath}")
                    .crossfade(true)
                    .build(),
                contentDescription = movie.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f),
                contentScale = ContentScale.Crop,
                placeholder = painterResource(R.drawable.placeholder_poster),
                error = painterResource(R.drawable.placeholder_poster)
            )

            // Bagian informasi
            Column(modifier = Modifier.padding(8.dp)) {
                Text(
                    text = movie.title,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    RatingBadge(rating = movie.voteAverage)
                    Text(
                        text = movie.releaseDate?.take(4) ?: "N/A",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun RatingBadge(rating: Double) {
    val color = when {
        rating >= 7.0 -> Color(0xFF4CAF50)
        rating >= 5.0 -> Color(0xFFFFC107)
        else -> Color(0xFFF44336)
    }
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = color.copy(alpha = 0.15f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(14.dp)
            )
            Spacer(Modifier.width(2.dp))
            Text(
                text = String.format("%.1f", rating),
                style = MaterialTheme.typography.labelSmall,
                color = color
            )
        }
    }
}
```

### Layar Detail

Buat layar detail yang menampilkan informasi film lengkap:

```kotlin
// ui/detail/DetailViewModel.kt
class DetailViewModel(
    private val movieId: Int,
    private val repository: MovieRepository = MovieRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow<DetailUiState>(DetailUiState.Loading)
    val uiState: StateFlow<DetailUiState> = _uiState.asStateFlow()

    init {
        loadMovieDetail()
    }

    private fun loadMovieDetail() {
        viewModelScope.launch {
            _uiState.value = DetailUiState.Loading
            repository.getMovieDetail(movieId).fold(
                onSuccess = { detail ->
                    _uiState.value = DetailUiState.Success(detail)
                },
                onFailure = { error ->
                    _uiState.value = DetailUiState.Error(
                        error.localizedMessage ?: "Gagal memuat detail"
                    )
                }
            )
        }
    }
}

sealed interface DetailUiState {
    data object Loading : DetailUiState
    data class Success(val movie: MovieDetail) : DetailUiState
    data class Error(val message: String) : DetailUiState
}
```

Composable layar detail:

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailScreen(
    movieId: Int,
    onBack: () -> Unit,
    viewModel: DetailViewModel = viewModel(
        key = "detail_$movieId",
        factory = DetailViewModelFactory(movieId)
    )
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detail") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Kembali")
                    }
                }
            )
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is DetailUiState.Loading -> LoadingIndicator()
            is DetailUiState.Error -> ErrorMessage(
                message = state.message,
                onRetry = { /* muat ulang */ }
            )
            is DetailUiState.Success -> MovieDetailContent(
                movie = state.movie,
                modifier = Modifier.padding(paddingValues)
            )
        }
    }
}

@Composable
fun MovieDetailContent(movie: MovieDetail, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        // Gambar latar
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data("https://image.tmdb.org/t/p/w780${movie.backdropPath}")
                .crossfade(true)
                .build(),
            contentDescription = null,
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp),
            contentScale = ContentScale.Crop
        )

        Column(modifier = Modifier.padding(16.dp)) {
            // Judul dan tagline
            Text(
                text = movie.title,
                style = MaterialTheme.typography.headlineMedium
            )
            if (!movie.tagline.isNullOrBlank()) {
                Text(
                    text = movie.tagline,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(Modifier.height(12.dp))

            // Baris metadata
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                RatingBadge(rating = movie.voteAverage)
                movie.runtime?.let {
                    Text("${it} menit", style = MaterialTheme.typography.bodyMedium)
                }
                Text(
                    text = movie.releaseDate.take(4),
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            // Genre
            if (movie.genres.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    movie.genres.forEach { genre ->
                        SuggestionChip(
                            onClick = {},
                            label = { Text(genre.name) }
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Gambaran umum
            Text(
                text = "Gambaran Umum",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = movie.overview,
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}
```

### Pengaturan Navigasi

Hubungkan layar-layar tersebut dengan Navigation Compose:

```kotlin
// ui/navigation/NavGraph.kt
sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Detail : Screen("detail/{movieId}") {
        fun createRoute(movieId: Int) = "detail/$movieId"
    }
}

@Composable
fun MovieDiscoveryNavGraph() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(onMovieClick = { movieId ->
                navController.navigate(Screen.Detail.createRoute(movieId))
            })
        }
        composable(
            route = Screen.Detail.route,
            arguments = listOf(navArgument("movieId") { type = NavType.IntType })
        ) { backStackEntry ->
            val movieId = backStackEntry.arguments?.getInt("movieId") ?: return@composable
            DetailScreen(
                movieId = movieId,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
```

Perbarui `MainActivity.kt` untuk menggunakan grafik navigasi:

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MovieDiscoveryTheme {
                MovieDiscoveryNavGraph()
            }
        }
    }
}
```

### Penanganan Error dan State Loading

Komponen error dan loading yang konsisten meningkatkan pengalaman pengguna:

```kotlin
@Composable
fun LoadingIndicator() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorMessage(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.Warning,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.error
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("Coba Lagi")
        }
    }
}
```

### Menjalankan Aplikasi

1. Dapatkan kunci API gratis dari [TMDB](https://www.themoviedb.org/settings/api).
2. Ganti `YOUR_TMDB_API_KEY` di `RetrofitClient.kt` dengan kunci Anda yang sebenarnya.
3. Bangun dan jalankan aplikasi pada emulator atau perangkat fisik.
4. Layar utama menampilkan film populer trending dalam grid.
5. Gunakan bilah pencarian untuk mencari film berdasarkan judul — hasil muncul setelah debounce 400ms.
6. Ketuk kartu film mana pun untuk melihat layar detail lengkap dengan gambar latar, rating, genre, dan gambaran umum.
7. Scroll ke bagian bawah grid film untuk memicu pemuatan paginasi otomatis.

## Contoh Kode

Struktur proyek lengkap mengikuti tata letak ini:

```text
app/src/main/java/com/example/moviediscovery/
├── MainActivity.kt
├── MovieDiscoveryApplication.kt
├── data/
│   ├── model/
│   │   ├── Movie.kt
│   │   ├── MovieDetail.kt
│   │   └── MovieResponse.kt
│   ├── remote/
│   │   ├── RetrofitClient.kt
│   │   └── TmdbApi.kt
│   └── repository/
│       └── MovieRepository.kt
├── ui/
│   ├── home/
│   │   ├── HomeScreen.kt
│   │   ├── HomeViewModel.kt
│   │   └── HomeUiState.kt
│   ├── detail/
│   │   ├── DetailScreen.kt
│   │   └── DetailViewModel.kt
│   ├── components/
│   │   ├── MovieCard.kt
│   │   ├── RatingBadge.kt
│   │   ├── LoadingIndicator.kt
│   │   └── ErrorMessage.kt
│   ├── navigation/
│   │   └── NavGraph.kt
│   └── theme/
│       ├── Theme.kt
│       ├── Color.kt
│       └── Type.kt
```

Semua potongan kode di atas dirancang untuk disalin langsung ke file yang sesuai. Retrofit client, ViewModel, dan layar Compose membentuk arsitektur berlapis yang bersih — lapisan data tidak pernah merujuk tipe UI, dan lapisan UI tidak pernah menyentuh HTTP secara langsung.

## Insight Penting

- **debounce + collectLatest**: Fitur pencarian menggunakan `debounce(400)` untuk menunggu pengguna berhenti mengetik, `distinctUntilChanged()` untuk melewatkan kueri duplikat, dan `collectLatest` untuk membatalkan permintaan pencarian yang basi. Trio operator Flow ini adalah pola standar untuk pencarian reaktif di seluruh klien Android, Web, dan iOS.
- **Sealed interface untuk state UI**: Menggunakan `sealed interface` untuk `HomeUiState` memaksa penanganan `when` yang ekshaustif pada waktu kompilasi — compiler akan memperingatkan Anda jika menambahkan state baru tetapi lupa menanganinya di Composable. Ini menghilangkan seluruh kelas bug runtime.
- **Paginasi dengan derivedStateOf**: Infinite scroll menggunakan `derivedStateOf` untuk menghitung `shouldLoadMore` dari posisi scroll saat ini tanpa overhead recomposition. Ini lebih efisien daripada mendengarkan callback scroll karena hanya menghitung ulang ketika tata letak list yang sebenarnya berubah.
- **Pemuatan gambar dengan Coil**: Coil adalah yang pertama untuk Kotlin dan native coroutine, menjadikannya pilihan alami untuk aplikasi Compose. Lapisan cache memori dan disknya bersifat otomatis — Anda mendapatkan scrolling yang efisien tanpa konfigurasi tambahan.
- **ViewModelFactory untuk ViewModel dengan parameter**: `DetailViewModel` menerima `movieId` sebagai parameter konstruktor. Buat `ViewModelProvider.Factory` (atau gunakan API `CreationExtras` di Compose yang lebih baru) untuk menyuntikkan parameter ke konstruktor ViewModel.

## Langkah Berikutnya

- Tambahkan caching lokal dengan Room untuk mendukung penjelajahan offline dari film yang telah dimuat sebelumnya.
- Implementasikan fitur "Favorit" menggunakan Room dan layar favorit khusus.
- Jelajahi pustaka Paging 3 untuk solusi paginasi tingkat produksi dengan `RemoteMediator` bawaan.
- Tambahkan persistensi state UI melintasi perubahan konfigurasi menggunakan `SavedStateHandle` di ViewModel.
- Tulis tes UI dengan Compose Test dan tes unit untuk lapisan ViewModel dan Repository.
- Lihat [Silabus Pengembangan Android](../syllabi/android-development-syllabus.md) untuk jalur pembelajaran terstruktur.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun aplikasi discovery film Android yang lengkap menggunakan Kotlin, Retrofit, Jetpack Compose, dan API TMDB. Anda mengimplementasikan networking dengan Retrofit dan OkHttp, state UI reaktif dengan ViewModel dan StateFlow, pencarian dengan debouncing menggunakan operator Kotlin Flow, paginasi infinite scroll, navigasi multi-layar dengan Navigation Compose, dan pemuatan gambar dengan Coil. Pola-pola ini membentuk tulang punggung arsitektur aplikasi Android modern dan dapat ditransfer langsung ke aplikasi berbasis data apa pun yang Anda bangun di masa depan.

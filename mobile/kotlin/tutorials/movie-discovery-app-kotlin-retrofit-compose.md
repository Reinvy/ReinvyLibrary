---
title: "Building a Movie Discovery App with Kotlin, Retrofit, and Jetpack Compose"
description: "A project-based tutorial for building a modern Android movie discovery app using Kotlin, Retrofit for networking, Jetpack Compose for UI, and the free TMDB API."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a Movie Discovery App with Kotlin, Retrofit, and Jetpack Compose

## Summary

This project-based tutorial walks you through building a complete movie discovery application for Android using Kotlin. You will integrate the free TMDB (The Movie Database) API with Retrofit and OkHttp, build a reactive UI with Jetpack Compose and Material 3, implement multi-screen navigation with Navigation Compose, manage state with ViewModel and StateFlow, handle image loading with Coil, and implement search with debouncing and infinite scroll pagination. By the end, you will have a production-quality app that displays trending movies, allows searching, and shows detailed movie information.

## Target Audience

- Android developers who know Kotlin basics and want to build a real-world, multi-feature app.
- Developers familiar with Jetpack Compose fundamentals who want to learn networking and state management patterns.
- Intermediate mobile developers transitioning from other platforms to native Android development.

## Prerequisites

- Intermediate knowledge of Kotlin (classes, coroutines, lambdas, sealed classes).
- Basic familiarity with Jetpack Compose (composable functions, modifiers, basic layouts).
- Android Studio Hedgehog (2023.1.1) or newer installed.
- A device or emulator running Android API 26+.
- A free API key from [TMDB](https://www.themoviedb.org/settings/api).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up a modern Android project with Jetpack Compose and Material 3.
- Integrate and configure Retrofit with OkHttp for type-safe HTTP networking.
- Implement the Repository pattern to abstract data sources.
- Manage UI state reactively with Kotlin StateFlow and ViewModel.
- Build multi-screen navigation flows with Navigation Compose.
- Implement debounced search using Kotlin Flow operators.
- Add infinite scroll pagination with Paging 3 or manual scroll listeners.
- Handle loading, error, and empty states gracefully in a Compose UI.
- Load and cache network images with the Coil library.

## Context and Motivation

Mobile applications that consume REST APIs are the backbone of modern Android development. Building a movie discovery app is an excellent project because it exercises nearly every core Android architectural pattern in a single, cohesive codebase: networking with Retrofit, state management with ViewModel and Flow, navigation between screens, image loading, pagination, and search.

The TMDB API is free, well-documented, and provides rich data that makes the app engaging to build and use. By constructing this app step by step, you will internalize patterns that transfer directly to any data-driven Android application — from social media feeds to e-commerce catalogs.

## Core Content

### Project Setup and Dependencies

Create a new Android project in Android Studio with an **Empty Compose Activity** template. Use the following package name: `com.example.moviediscovery`.

Add these dependencies to your `app/build.gradle.kts`:

```kotlin
// Retrofit for networking
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

// Coil for image loading
implementation("io.coil-kt:coil-compose:2.6.0")

// Coroutines
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
```

Enable Compose in the `buildFeatures` block:

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

### API Layer with Retrofit

Define the data models and API interface. Create a `data/` package with the following structure:

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

Start with the API response models. TMDB paginated responses wrap results in a common envelope:

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

Define the API interface with Retrofit annotations:

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

Create the Retrofit client singleton with an interceptor for the API key:

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

### Repository Pattern

Create a repository that wraps the API calls and provides a clean data interface for the ViewModel:

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

The `Result` wrapper from `kotlin` standard library provides a clean way to propagate success-or-failure without throwing exceptions across architecture layers.

### ViewModel and StateFlow

Define a sealed hierarchy for the UI state:

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

Build the ViewModel with StateFlow for reactive state:

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
                        error.localizedMessage ?: "Unknown error"
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
                                error.localizedMessage ?: "Search failed"
                            )
                        }
                    )
                }
        }
    }
}
```

Key patterns in this ViewModel:

- **`debounce(400)`**: waits 400ms after the user stops typing before firing a search request — this prevents excessive API calls.
- **`distinctUntilChanged()`**: skips duplicate queries (e.g., user backspaces then retypes the same character).
- **`collectLatest`**: cancels the previous search coroutine if a new query arrives before the previous one completes — critical for responsive search.
- **`isLoadingMore` flag**: prevents duplicate pagination requests while a load is in progress.

### Compose UI: Movie List Screen

Build the main screen that shows a grid of movies with a search bar:

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
                title = { Text("Movie Discovery") },
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
            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = viewModel::updateSearchQuery,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search movies...") },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = "Search")
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Content
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

    // Detect when user scrolls near the end
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

The `derivedStateOf` + `LaunchedEffect` pattern detects when the user scrolls within 3 items of the end and triggers `onLoadMore()`. This is the infinite scroll mechanism.

### Movie Card Composable

Each movie appears as a card with a poster image, title, rating, and release year:

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
            // Poster image
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

            // Info section
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

### Detail Screen

Create a detail screen that shows full movie information:

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
                        error.localizedMessage ?: "Failed to load details"
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

The detail screen Composable:

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
                title = { Text("Details") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is DetailUiState.Loading -> LoadingIndicator()
            is DetailUiState.Error -> ErrorMessage(
                message = state.message,
                onRetry = { /* reload */ }
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
        // Backdrop image
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
            // Title and tagline
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

            // Metadata row
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                RatingBadge(rating = movie.voteAverage)
                movie.runtime?.let {
                    Text("${it} min", style = MaterialTheme.typography.bodyMedium)
                }
                Text(
                    text = movie.releaseDate.take(4),
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            // Genres
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

            // Overview
            Text(
                text = "Overview",
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

### Navigation Setup

Wire the screens together with Navigation Compose:

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

Update `MainActivity.kt` to use the navigation graph:

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

### Error Handling and Loading States

Consistent error and loading components improve the user experience:

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
            Text("Retry")
        }
    }
}
```

### Running the App

1. Obtain a free API key from [TMDB](https://www.themoviedb.org/settings/api).
2. Replace `YOUR_TMDB_API_KEY` in `RetrofitClient.kt` with your actual key.
3. Build and run the app on an emulator or physical device.
4. The home screen displays trending popular movies in a grid.
5. Use the search bar to find movies by title — results appear after a 400ms debounce.
6. Tap any movie card to see its full detail screen with backdrop, rating, genres, and overview.
7. Scroll to the bottom of the movie grid to trigger automatic pagination loading.

## Code Examples

The complete project structure follows this layout:

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

All code snippets above are designed to be copied directly into the corresponding files. The Retrofit client, ViewModel, and Compose screens form a clean layered architecture — the data layer never references UI types, and the UI layer never touches HTTP directly.

## Key Insights

- **debounce + collectLatest**: The search feature uses `debounce(400)` to wait for the user to stop typing, `distinctUntilChanged()` to skip duplicate queries, and `collectLatest` to cancel stale search requests. This triad of Flow operators is the standard pattern for reactive search across Android, Web, and iOS clients.
- **Sealed interfaces for UI state**: Using `sealed interface` for `HomeUiState` forces exhaustive `when` handling at compile time — the compiler warns you if you add a new state but forget to handle it in a Composable. This eliminates a whole class of runtime bugs.
- **Pagination with derivedStateOf**: The infinite scroll uses `derivedStateOf` to compute `shouldLoadMore` from the current scroll position without recomposition overhead. This is more efficient than listening to scroll callbacks because it only recalculates when the actual list layout changes.
- **Image loading with Coil**: Coil is Kotlin-first and coroutine-native, making it the natural choice for Compose apps. Its memory and disk caching layers are automatic — you get efficient scrolling without additional configuration.
- **ViewModelFactory for parameterized ViewModels**: The `DetailViewModel` receives `movieId` as a constructor parameter. Create a `ViewModelProvider.Factory` (or use the `CreationExtras` API in newer Compose) to inject parameters into the ViewModel constructor.

## Next Steps

- Add local caching with Room to support offline browsing of previously loaded movies.
- Implement a "Favorites" feature using Room and a dedicated favorites screen.
- Explore Paging 3 library for a production-grade pagination solution with built-in `RemoteMediator`.
- Add UI state persistence across configuration changes using `SavedStateHandle` in the ViewModel.
- Write UI tests with Compose Test and unit tests for the ViewModel and Repository layers.
- Check the [Android Development Syllabus](../syllabi/android-development-syllabus.md) for a structured learning path.

## Conclusion

In this tutorial, you built a complete movie discovery Android application using Kotlin, Retrofit, Jetpack Compose, and the TMDB API. You implemented networking with Retrofit and OkHttp, reactive UI state with ViewModel and StateFlow, debounced search with Kotlin Flow operators, infinite scroll pagination, multi-screen navigation with Navigation Compose, and image loading with Coil. These patterns form the architectural backbone of modern Android applications and transfer directly to any data-driven app you build in the future.

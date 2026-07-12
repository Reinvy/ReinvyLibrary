---
title: "Building an Expense Tracker App with Kotlin, Room and Jetpack Compose"
description: "A comprehensive project-based tutorial for building a complete offline-first expense tracking Android application using Kotlin, Room database, Jetpack Compose with Material 3, and MVVM architecture."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building an Expense Tracker App with Kotlin, Room and Jetpack Compose

## Summary

This project-based tutorial guides you through building a complete, offline-first expense tracking Android application using Kotlin. You will learn how to design a Room database with multiple related entities, implement the MVVM architecture with ViewModel and StateFlow, build a reactive user interface with Jetpack Compose and Material 3, and add practical features like search, filtering, data visualization, and CSV export. By the end, you will have a production-quality app that persists data locally and works entirely offline.

## Target Audience

- Android developers with basic Kotlin knowledge who want to learn Room database and modern persistence patterns.
- Developers familiar with Jetpack Compose fundamentals who want to build a complete, data-driven application.
- Intermediate mobile developers looking to master the MVVM architecture with Room, ViewModel, and Flow.

## Prerequisites

- Intermediate knowledge of Kotlin (classes, coroutines, lambdas, sealed classes, extension functions).
- Basic familiarity with Jetpack Compose (composable functions, modifiers, basic layouts, state hoisting).
- Android Studio Ladybug (2024.2.1) or newer installed.
- A device or emulator running Android API 26+.
- Basic understanding of SQL and relational database concepts.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Design and implement a Room database with multiple related entities, TypeConverters, and DAOs.
- Implement the Repository pattern to abstract data sources behind a clean interface.
- Use ViewModel with StateFlow to manage UI state reactively.
- Build a complete Jetpack Compose UI with Material 3 components, navigation, and forms.
- Implement search, filtering, and data export features on top of Room queries.
- Write unit tests for Room DAOs and ViewModels using the AndroidX testing libraries.

## Context and Motivation

Expense tracking is one of the most common personal finance use cases for mobile apps. Users need a fast, reliable way to log transactions, categorize spending, and review their financial habits — all without requiring a network connection. Building an expense tracker locally-first (using Room for on-device persistence) gives you complete control over data privacy, offline availability, and response times.

This tutorial uses a tech stack that reflects real-world Android development: **Room** for local persistence (Google's recommended local database abstraction over SQLite), **ViewModel + StateFlow** for reactive state management, and **Jetpack Compose with Material 3** for modern declarative UI. You will also learn practical patterns like the Repository abstraction, dependency injection with Hilt, and navigation with the Compose Navigation library.

## Core Content

### Project Setup and Dependencies

Create a new Android project in Android Studio using the **Empty Compose Activity** template with the following configuration:

- Package name: `com.example.expensetracker`
- Minimum SDK: API 26 (Android 8.0)
- Language: Kotlin
- Build configuration: Kotlin DSL (build.gradle.kts)

Add the following dependencies to your `app/build.gradle.kts`:

```kotlin
// Room
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")
ksp("androidx.room:room-compiler:2.6.1")

// Lifecycle + ViewModel
implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.4")

// Navigation Compose
implementation("androidx.navigation:navigation-compose:2.7.7")

// Hilt DI
implementation("com.google.dagger:hilt-android:2.51.1")
kapt("com.google.dagger:hilt-android-compiler:2.51.1")
implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

// Material 3
implementation("androidx.compose.material3:material3:1.2.1")

// Charts (Vico)
implementation("com.patrykandpatrick.vico:compose-m3:1.13.1")
```

### Data Layer — Room Database

Design the database schema around three core entities: **Category**, **Transaction**, and **Budget**. Each expense transaction belongs to a category, and budgets are defined per category per month.

#### Category Entity

```kotlin
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class Category(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val icon: String = "receipt",   // Material icon name
    val colorHex: String = "#6200EE" // Display color
)
```

#### Transaction Entity

```kotlin
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "transactions",
    foreignKeys = [
        ForeignKey(
            entity = Category::class,
            parentColumns = ["id"],
            childColumns = ["categoryId"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [Index("categoryId")]
)
data class Transaction(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val amount: Double,
    val description: String,
    val date: Long, // epoch millis
    val type: TransactionType,
    val categoryId: Long? = null
)

enum class TransactionType {
    EXPENSE, INCOME
}
```

#### Budget Entity

```kotlin
@Entity(
    tableName = "budgets",
    foreignKeys = [
        ForeignKey(
            entity = Category::class,
            parentColumns = ["id"],
            childColumns = ["categoryId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("categoryId", "month", unique = true)]
)
data class Budget(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val categoryId: Long,
    val month: String, // "2026-07" format
    val limitAmount: Double
)
```

#### TypeConverters

Room cannot store enums directly in SQLite. Create a TypeConverter to serialize `TransactionType` to a string:

```kotlin
import androidx.room.TypeConverter

class Converters {
    @TypeConverter
    fun fromTransactionType(value: TransactionType): String = value.name

    @TypeConverter
    fun toTransactionType(value: String): TransactionType =
        TransactionType.valueOf(value)
}
```

#### DAOs — Data Access Objects

Define queries for each entity. The TransactionDao includes filtered, sorted, and aggregated queries for the expense tracker's features:

```kotlin
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {
    @Query("""
        SELECT * FROM transactions
        ORDER BY date DESC
    """)
    fun getAllTransactions(): Flow<List<Transaction>>

    @Query("""
        SELECT * FROM transactions
        WHERE (:categoryId IS NULL OR categoryId = :categoryId)
        AND (:type IS NULL OR type = :type)
        AND date BETWEEN :startDate AND :endDate
        ORDER BY date DESC
    """)
    fun getFilteredTransactions(
        categoryId: Long? = null,
        type: String? = null,
        startDate: Long = 0,
        endDate: Long = Long.MAX_VALUE
    ): Flow<List<Transaction>>

    @Query("""
        SELECT SUM(amount) FROM transactions
        WHERE type = :type
        AND date BETWEEN :startDate AND :endDate
    """)
    fun getTotalByType(type: String, startDate: Long, endDate: Long): Flow<Double?>

    @Query("""
        SELECT c.name, c.colorHex, SUM(t.amount) as total
        FROM transactions t
        INNER JOIN categories c ON t.categoryId = c.id
        WHERE t.type = 'EXPENSE'
        AND t.date BETWEEN :startDate AND :endDate
        GROUP BY c.id
        ORDER BY total DESC
    """)
    fun getSpendingByCategory(startDate: Long, endDate: Long): Flow<List<CategorySpending>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(transaction: Transaction): Long

    @Update
    suspend fun update(transaction: Transaction)

    @Delete
    suspend fun delete(transaction: Transaction)

    @Query("SELECT * FROM transactions WHERE description LIKE '%' || :query || '%' ORDER BY date DESC")
    fun searchTransactions(query: String): Flow<List<Transaction>>
}

data class CategorySpending(
    val name: String,
    val colorHex: String,
    val total: Double
)
```

Similarly, create `CategoryDao` and `BudgetDao` with standard CRUD operations.

#### Room Database Class

```kotlin
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [Transaction::class, Category::class, Budget::class],
    version = 1,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao
    abstract fun categoryDao(): CategoryDao
    abstract fun budgetDao(): BudgetDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "expense_tracker_db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
```

### Repository Pattern

The Repository layer sits between the ViewModel and the DAOs, providing a clean data-access API:

```kotlin
class TransactionRepository(private val transactionDao: TransactionDao) {

    fun getAllTransactions(): Flow<List<Transaction>> =
        transactionDao.getAllTransactions()

    fun getFilteredTransactions(
        categoryId: Long?,
        type: String?,
        startDate: Long,
        endDate: Long
    ): Flow<List<Transaction>> =
        transactionDao.getFilteredTransactions(categoryId, type, startDate, endDate)

    fun getTotalByType(type: TransactionType, startDate: Long, endDate: Long): Flow<Double?> =
        transactionDao.getTotalByType(type.name, startDate, endDate)

    fun getSpendingByCategory(startDate: Long, endDate: Long): Flow<List<CategorySpending>> =
        transactionDao.getSpendingByCategory(startDate, endDate)

    fun searchTransactions(query: String): Flow<List<Transaction>> =
        transactionDao.searchTransactions(query)

    suspend fun insert(transaction: Transaction) = transactionDao.insert(transaction)

    suspend fun update(transaction: Transaction) = transactionDao.update(transaction)

    suspend fun delete(transaction: Transaction) = transactionDao.delete(transaction)
}
```

### Dependency Injection with Hilt

Set up Hilt to provide the database and repository instances:

```kotlin
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        AppDatabase.getDatabase(context)

    @Provides
    fun provideTransactionDao(database: AppDatabase): TransactionDao =
        database.transactionDao()

    @Provides
    @Singleton
    fun provideTransactionRepository(dao: TransactionDao): TransactionRepository =
        TransactionRepository(dao)
}
```

### ViewModel — Managing UI State with StateFlow

The `ExpenseViewModel` holds all UI state as `StateFlow` objects, providing a single source of truth for each screen:

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.Calendar
import javax.inject.Inject

data class HomeUiState(
    val totalBalance: Double = 0.0,
    val monthlyIncome: Double = 0.0,
    val monthlyExpenses: Double = 0.0,
    val recentTransactions: List<Transaction> = emptyList(),
    val spendingByCategory: List<CategorySpending> = emptyList(),
    val isLoading: Boolean = true
)

data class TransactionFormState(
    val amount: String = "",
    val description: String = "",
    val categoryId: Long? = null,
    val type: TransactionType = TransactionType.EXPENSE,
    val date: Long = System.currentTimeMillis(),
    val isEditing: Boolean = false,
    val editingTransactionId: Long? = null
)

@HiltViewModel
class ExpenseViewModel @Inject constructor(
    private val transactionRepository: TransactionRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _homeUiState = MutableStateFlow(HomeUiState())
    val homeUiState: StateFlow<HomeUiState> = _homeUiState.asStateFlow()

    private val _transactions = MutableStateFlow<List<Transaction>>(emptyList())
    val transactions: StateFlow<List<Transaction>> = _transactions.asStateFlow()

    init {
        loadHomeData()
        observeTransactions()
    }

    private fun loadHomeData() {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val monthStart = calendar.timeInMillis
        calendar.set(Calendar.DAY_OF_MONTH, calendar.getActualMaximum(Calendar.DAY_OF_MONTH))
        calendar.set(Calendar.HOUR_OF_DAY, 23)
        calendar.set(Calendar.MINUTE, 59)
        calendar.set(Calendar.SECOND, 59)
        val monthEnd = calendar.timeInMillis

        viewModelScope.launch {
            combine(
                transactionRepository.getTotalByType(TransactionType.INCOME, monthStart, monthEnd),
                transactionRepository.getTotalByType(TransactionType.EXPENSE, monthStart, monthEnd),
                transactionRepository.getSpendingByCategory(monthStart, monthEnd)
            ) { income, expenses, spendingByCategory ->
                val totalBalance = (income ?: 0.0) - (expenses ?: 0.0)
                _homeUiState.update {
                    it.copy(
                        totalBalance = totalBalance,
                        monthlyIncome = income ?: 0.0,
                        monthlyExpenses = expenses ?: 0.0,
                        spendingByCategory = spendingByCategory,
                        isLoading = false
                    )
                }
            }.launchIn(viewModelScope)
        }
    }

    private fun observeTransactions() {
        viewModelScope.launch {
            _searchQuery
                .debounce(300)
                .flatMapLatest { query ->
                    if (query.isBlank()) {
                        transactionRepository.getAllTransactions()
                    } else {
                        transactionRepository.searchTransactions(query)
                    }
                }
                .collect { _transactions.value = it }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _searchQuery.value = query
    }

    fun saveTransaction(formState: TransactionFormState) {
        viewModelScope.launch {
            val transaction = Transaction(
                id = formState.editingTransactionId ?: 0,
                amount = formState.amount.toDoubleOrNull() ?: return@launch,
                description = formState.description,
                date = formState.date,
                type = formState.type,
                categoryId = formState.categoryId
            )
            if (formState.isEditing) {
                transactionRepository.update(transaction)
            } else {
                transactionRepository.insert(transaction)
            }
        }
    }

    fun deleteTransaction(transaction: Transaction) {
        viewModelScope.launch {
            transactionRepository.delete(transaction)
        }
    }
}
```

### Jetpack Compose UI Layer

Build the UI with three main screens: **Home**, **Add Transaction**, and **Transaction List**.

#### Home Screen — Monthly Overview

```kotlin
@Composable
fun HomeScreen(
    viewModel: ExpenseViewModel = hiltViewModel()
) {
    val uiState by viewModel.homeUiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Expense Tracker") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* navigate to add */ }) {
                Icon(Icons.Default.Add, contentDescription = "Add Transaction")
            }
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
            ) {
                // Balance Card
                item {
                    BalanceCard(
                        totalBalance = uiState.totalBalance,
                        monthlyIncome = uiState.monthlyIncome,
                        monthlyExpenses = uiState.monthlyExpenses
                    )
                }

                // Category Spending Chart
                item {
                    Text(
                        "Spending by Category",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                    )
                    SpendingCategoryChart(uiState.spendingByCategory)
                }

                // Recent Transactions
                item {
                    Text(
                        "Recent Transactions",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                    )
                }

                items(uiState.recentTransactions.take(5)) { transaction ->
                    TransactionRow(transaction)
                }
            }
        }
    }
}

@Composable
fun BalanceCard(totalBalance: Double, monthlyIncome: Double, monthlyExpenses: Double) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text("Total Balance", style = MaterialTheme.typography.labelLarge)
            Text(
                text = formatCurrency(totalBalance),
                style = MaterialTheme.typography.headlineLarge,
                color = if (totalBalance >= 0)
                    MaterialTheme.colorScheme.onPrimaryContainer
                else
                    MaterialTheme.colorScheme.error
            )
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth()) {
                Column {
                    Text("Income", style = MaterialTheme.typography.labelSmall)
                    Text(
                        formatCurrency(monthlyIncome),
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color(0xFF4CAF50)
                    )
                }
                Spacer(Modifier.width(24.dp))
                Column {
                    Text("Expenses", style = MaterialTheme.typography.labelSmall)
                    Text(
                        formatCurrency(monthlyExpenses),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
fun SpendingCategoryChart(spending: List<CategorySpending>) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            spending.forEach { item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .background(
                                    item.colorHex.parseToColor(),
                                    shape = CircleShape
                                )
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(item.name, style = MaterialTheme.typography.bodyMedium)
                    }
                    Text(
                        formatCurrency(item.total),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}
```

#### Add Transaction Screen

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionScreen(
    onNavigateBack: () -> Unit,
    viewModel: ExpenseViewModel = hiltViewModel()
) {
    var amount by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<Category?>(null) }
    var transactionType by remember { mutableStateOf(TransactionType.EXPENSE) }
    val categories by viewModel.categories.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Transaction") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Type Toggle
            Row(Modifier.fillMaxWidth()) {
                FilterChip(
                    selected = transactionType == TransactionType.EXPENSE,
                    onClick = { transactionType = TransactionType.EXPENSE },
                    label = { Text("Expense") }
                )
                Spacer(Modifier.width(8.dp))
                FilterChip(
                    selected = transactionType == TransactionType.INCOME,
                    onClick = { transactionType = TransactionType.INCOME },
                    label = { Text("Income") }
                )
            }

            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Amount") },
                prefix = { Text("$") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            // Category Dropdown
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = it }
            ) {
                OutlinedTextField(
                    value = selectedCategory?.name ?: "Select Category",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Category") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    categories.forEach { category ->
                        DropdownMenuItem(
                            text = { Text(category.name) },
                            onClick = {
                                selectedCategory = category
                                expanded = false
                            }
                        )
                    }
                }
            }

            Spacer(Modifier.weight(1f))

            Button(
                onClick = {
                    viewModel.saveTransaction(formState)
                    onNavigateBack()
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = amount.isNotBlank() && description.isNotBlank()
            ) {
                Text("Save Transaction")
            }
        }
    }
}
```

### Navigation Setup

Wire the screens together using Navigation Compose:

```kotlin
@Composable
fun ExpenseTrackerApp() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onNavigateToAdd = { navController.navigate("add_transaction") },
                onNavigateToTransactions = { navController.navigate("transactions") }
            )
        }
        composable("add_transaction") {
            AddTransactionScreen(onNavigateBack = { navController.popBackStack() })
        }
        composable("transactions") {
            TransactionListScreen(onNavigateBack = { navController.popBackStack() })
        }
    }
}
```

### CSV Export Feature

Allow users to export their transactions as a CSV file for external analysis:

```kotlin
fun exportToCsv(context: Context, transactions: List<Transaction>, categories: Map<Long, String>) {
    val csvContent = buildString {
        appendLine("Date,Amount,Type,Category,Description")
        transactions.forEach { t ->
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(t.date))
            val categoryName = t.categoryId?.let { categories[it] } ?: "Uncategorized"
            appendLine("$date,${t.amount},${t.type.name},$categoryName,${t.description}")
        }
    }

    val file = File(context.getExternalFilesDir(null), "expenses_export.csv")
    file.writeText(csvContent)

    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/csv"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(shareIntent, "Export Expenses"))
}
```

## Code Examples

The complete project structure after following this tutorial:

```text
app/src/main/java/com/example/expensetracker/
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt
│   │   ├── Converters.kt
│   │   ├── dao/
│   │   │   ├── TransactionDao.kt
│   │   │   ├── CategoryDao.kt
│   │   │   └── BudgetDao.kt
│   │   ├── entity/
│   │   │   ├── Transaction.kt
│   │   │   ├── Category.kt
│   │   │   └── Budget.kt
│   ├── repository/
│   │   └── TransactionRepository.kt
├── di/
│   └── DatabaseModule.kt
├── ui/
│   ├── home/
│   │   ├── HomeScreen.kt
│   │   ├── BalanceCard.kt
│   │   └── SpendingCategoryChart.kt
│   ├── addtransaction/
│   │   └── AddTransactionScreen.kt
│   ├── transactions/
│   │   └── TransactionListScreen.kt
│   ├── navigation/
│   │   └── NavGraph.kt
│   └── theme/
│       ├── Theme.kt
│       ├── Color.kt
│       └── Type.kt
├── util/
│   ├── CurrencyFormatter.kt
│   └── CsvExporter.kt
├── viewmodel/
│   └── ExpenseViewModel.kt
└── ExpenseTrackerApp.kt
```

### Room DAO Unit Test

```kotlin
@RunWith(AndroidJUnit4::class)
class TransactionDaoTest {
    private lateinit var database: AppDatabase
    private lateinit var transactionDao: TransactionDao

    @Before
    fun setup() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).build()
        transactionDao = database.transactionDao()
    }

    @After
    fun teardown() {
        database.close()
    }

    @Test
    fun insertAndRetrieveTransaction() = runTest {
        val transaction = Transaction(
            amount = 25.50,
            description = "Lunch",
            date = System.currentTimeMillis(),
            type = TransactionType.EXPENSE
        )
        val id = transactionDao.insert(transaction)
        val retrieved = transactionDao.getTransactionById(id)
        assertThat(retrieved.amount).isEqualTo(25.50)
        assertThat(retrieved.description).isEqualTo("Lunch")
    }

    @Test
    fun searchByDescription() = runTest {
        transactionDao.insert(Transaction(amount = 10.0, description = "Coffee", date = 1, type = TransactionType.EXPENSE))
        transactionDao.insert(Transaction(amount = 15.0, description = "Sandwich", date = 2, type = TransactionType.EXPENSE))

        val results = transactionDao.searchTransactions("Coffee").first()
        assertThat(results).hasSize(1)
        assertThat(results[0].description).isEqualTo("Coffee")
    }
}
```

## Key Insights

- **Room enforces compile-time SQL verification**: Unlike raw SQLite queries, Room validates your SQL at compile time. Any syntax error or column name mismatch causes a build failure instead of a runtime crash. Use `@Query` annotations with caution — Room's query verification is a safety net, not a substitute for testing complex queries.
- **Single Source of Truth with StateFlow**: Every screen observes a dedicated `StateFlow` that represents its complete state at any moment. Avoid exposing multiple separate flows from the ViewModel that the UI must combine manually — aggregate state in the ViewModel using `combine()` or `flatMapLatest()`.
- **Debounced search with Flow**: Implement reactive search by debouncing the query `StateFlow` and using `flatMapLatest` to switch between the full list and search results. This prevents unnecessary database queries on every keystroke and automatically cancels previous searches when the query changes.
- **Repository as the single data-access API**: Even though this app uses only Room, the Repository abstraction makes it trivial to add a remote data source later (Retrofit, Firebase) without changing the ViewModel or UI layer. Define repository interfaces or abstract classes for maximum flexibility.
- **CSV export via FileProvider**: Writing exported data to `getExternalFilesDir` and sharing via `FileProvider` respects Android's scoped storage model and works on Android 10+ without `WRITE_EXTERNAL_STORAGE` permissions.

## Next Steps

- Explore integrating a remote API (such as a Node.js backend) to sync expenses across devices, using the Repository pattern introduced here.
- Add push notification reminders for recurring bills using WorkManager periodic tasks.
- Implement Material 3 dynamic theming with `dynamicColor = true` for personalized app appearance.
- Study the [Android Development Syllabus](../syllabi/android-development-syllabus.md) for a structured learning path covering these patterns at scale.

## Conclusion

In this tutorial, you built a fully functional offline-first expense tracker Android application using Kotlin, Room, Jetpack Compose, and the MVVM architecture. You learned how to design a Room database with multiple entities and foreign keys, implement reactive data access with Flow and StateFlow, build a Material 3 UI with Compose, and add practical features like search filtering and CSV export. These patterns — Room persistence, ViewModel state management, and the Repository abstraction — are transferable to almost any data-driven Android application you will build in production.

---
title: "Membangun Aplikasi Pencatat Pengeluaran dengan Kotlin, Room, dan Jetpack Compose"
description: "Tutorial berbasis proyek komprehensif untuk membangun aplikasi pencatat pengeluaran Android offline-first menggunakan Kotlin, database Room, Jetpack Compose dengan Material 3, dan arsitektur MVVM."
category: "mobile"
technology: "kotlin"
difficulty: "intermediate"
type: "tutorial"
locale: "id"
---

# Membangun Aplikasi Pencatat Pengeluaran dengan Kotlin, Room, dan Jetpack Compose

## Ringkasan

Tutorial berbasis proyek ini memandu Anda dalam membangun aplikasi pencatat pengeluaran Android yang lengkap dan berfungsi secara offline-first. Anda akan mempelajari cara merancang database Room dengan beberapa entitas terkait, mengimplementasikan arsitektur MVVM dengan ViewModel dan StateFlow, membangun antarmuka pengguna reaktif dengan Jetpack Compose dan Material 3, serta menambahkan fitur praktis seperti pencarian, pemfilteran, visualisasi data, dan ekspor CSV. Pada akhirnya, Anda akan memiliki aplikasi berkualitas produksi yang menyimpan data secara lokal dan berfungsi sepenuhnya secara offline.

## Target Audiens

- Pengembang Android dengan pengetahuan dasar Kotlin yang ingin mempelajari database Room dan pola persistensi modern.
- Pengembang yang familier dengan dasar-dasar Jetpack Compose yang ingin membangun aplikasi berbasis data yang lengkap.
- Pengembang mobile tingkat menengah yang ingin menguasai arsitektur MVVM dengan Room, ViewModel, dan Flow.

## Prasyarat

- Pengetahuan menengah tentang Kotlin (kelas, coroutine, lambda, sealed class, extension function).
- Familiaritas dasar dengan Jetpack Compose (fungsi composable, modifier, tata letak dasar, state hoisting).
- Android Studio Ladybug (2024.2.1) atau yang lebih baru terinstal.
- Perangkat atau emulator yang menjalankan Android API 26+.
- Pemahaman dasar tentang SQL dan konsep basis data relasional.

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Merancang dan mengimplementasikan database Room dengan beberapa entitas terkait, TypeConverter, dan DAO.
- Mengimplementasikan pola Repository untuk mengabstraksi sumber data di balik antarmuka yang bersih.
- Menggunakan ViewModel dengan StateFlow untuk mengelola status UI secara reaktif.
- Membangun UI Jetpack Compose lengkap dengan komponen Material 3, navigasi, dan formulir.
- Mengimplementasikan fitur pencarian, pemfilteran, dan ekspor data di atas kueri Room.
- Menulis pengujian unit untuk DAO Room dan ViewModel menggunakan pustaka pengujian AndroidX.

## Konteks dan Motivasi

Pencatatan pengeluaran adalah salah satu kasus penggunaan aplikasi mobile yang paling umum dalam keuangan pribadi. Pengguna membutuhkan cara yang cepat dan andal untuk mencatat transaksi, mengkategorikan pengeluaran, dan meninjau kebiasaan keuangan mereka — semuanya tanpa memerlukan koneksi jaringan. Membangun pencatat pengeluaran secara lokal-first (menggunakan Room untuk persistensi perangkat) memberi Anda kendali penuh atas privasi data, ketersediaan offline, dan waktu respons.

Tutorial ini menggunakan tumpukan teknologi yang mencerminkan pengembangan Android di dunia nyata: **Room** untuk persistensi lokal (abstraksi basis data lokal yang direkomendasikan Google di atas SQLite), **ViewModel + StateFlow** untuk manajemen status reaktif, dan **Jetpack Compose dengan Material 3** untuk UI deklaratif modern. Anda juga akan mempelajari pola praktis seperti abstraksi Repository, injeksi ketergantungan dengan Hilt, dan navigasi dengan pustaka Navigation Compose.

## Konten Inti

### Persiapan Proyek dan Dependensi

Buat proyek Android baru di Android Studio menggunakan templat **Empty Compose Activity** dengan konfigurasi berikut:

- Nama paket: `com.example.expensetracker`
- Minimum SDK: API 26 (Android 8.0)
- Bahasa: Kotlin
- Konfigurasi build: Kotlin DSL (build.gradle.kts)

Tambahkan dependensi berikut ke `app/build.gradle.kts`:

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

### Lapisan Data — Database Room

Rancang skema database di sekitar tiga entitas inti: **Category**, **Transaction**, dan **Budget**. Setiap transaksi pengeluaran termasuk dalam sebuah kategori, dan anggaran ditentukan per kategori per bulan.

#### Entity Category

```kotlin
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class Category(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val icon: String = "receipt",
    val colorHex: String = "#6200EE"
)
```

#### Entity Transaction

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
    val date: Long,
    val type: TransactionType,
    val categoryId: Long? = null
)

enum class TransactionType {
    EXPENSE, INCOME
}
```

#### Entity Budget

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
    val month: String,
    val limitAmount: Double
)
```

#### TypeConverter

Room tidak dapat menyimpan enum secara langsung di SQLite. Buat TypeConverter untuk menyeriali sasi `TransactionType` menjadi string:

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

#### DAO — Data Access Object

Tentukan kueri untuk setiap entitas. TransactionDao mencakup kueri yang difilter, diurutkan, dan diagregasi untuk fitur pencatat pengeluaran:

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

Buat `CategoryDao` dan `BudgetDao` dengan operasi CRUD standar dengan cara yang sama.

#### Kelas Database Room

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

### Pola Repository

Lapisan Repository berada di antara ViewModel dan DAO, menyediakan API akses data yang bersih:

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

### Injeksi Ketergantungan dengan Hilt

Siapkan Hilt untuk menyediakan instance database dan repository:

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

### ViewModel — Mengelola Status UI dengan StateFlow

`ExpenseViewModel` menyimpan semua status UI sebagai objek `StateFlow`, menyediakan sumber kebenaran tunggal untuk setiap layar:

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

### Lapisan UI Jetpack Compose

Bangun UI dengan tiga layar utama: **Beranda**, **Tambah Transaksi**, dan **Daftar Transaksi**.

#### Layar Beranda — Ringkasan Bulanan

```kotlin
@Composable
fun HomeScreen(
    viewModel: ExpenseViewModel = hiltViewModel()
) {
    val uiState by viewModel.homeUiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Pencatat Pengeluaran") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* navigasi ke tambah */ }) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Transaksi")
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
                // Kartu Saldo
                item {
                    BalanceCard(
                        totalBalance = uiState.totalBalance,
                        monthlyIncome = uiState.monthlyIncome,
                        monthlyExpenses = uiState.monthlyExpenses
                    )
                }

                // Grafik Pengeluaran per Kategori
                item {
                    Text(
                        "Pengeluaran per Kategori",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                    )
                    SpendingCategoryChart(uiState.spendingByCategory)
                }

                // Transaksi Terbaru
                item {
                    Text(
                        "Transaksi Terbaru",
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
            Text("Total Saldo", style = MaterialTheme.typography.labelLarge)
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
                    Text("Pemasukan", style = MaterialTheme.typography.labelSmall)
                    Text(
                        formatCurrency(monthlyIncome),
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color(0xFF4CAF50)
                    )
                }
                Spacer(Modifier.width(24.dp))
                Column {
                    Text("Pengeluaran", style = MaterialTheme.typography.labelSmall)
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

#### Layar Tambah Transaksi

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
                title = { Text("Tambah Transaksi") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Kembali")
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
            // Toggle Tipe
            Row(Modifier.fillMaxWidth()) {
                FilterChip(
                    selected = transactionType == TransactionType.EXPENSE,
                    onClick = { transactionType = TransactionType.EXPENSE },
                    label = { Text("Pengeluaran") }
                )
                Spacer(Modifier.width(8.dp))
                FilterChip(
                    selected = transactionType == TransactionType.INCOME,
                    onClick = { transactionType = TransactionType.INCOME },
                    label = { Text("Pemasukan") }
                )
            }

            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Jumlah") },
                prefix = { Text("Rp") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Deskripsi") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            // Dropdown Kategori
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = it }
            ) {
                OutlinedTextField(
                    value = selectedCategory?.name ?: "Pilih Kategori",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Kategori") },
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
                Text("Simpan Transaksi")
            }
        }
    }
}
```

### Pengaturan Navigasi

Hubungkan layar-layar tersebut menggunakan Navigation Compose:

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

### Fitur Ekspor CSV

Izinkan pengguna mengekspor transaksi mereka sebagai file CSV untuk analisis eksternal:

```kotlin
fun exportToCsv(context: Context, transactions: List<Transaction>, categories: Map<Long, String>) {
    val csvContent = buildString {
        appendLine("Tanggal,Jumlah,Tipe,Kategori,Deskripsi")
        transactions.forEach { t ->
            val date = SimpleDateFormat("yyyy-MM-dd", Locale("id", "ID")).format(Date(t.date))
            val categoryName = t.categoryId?.let { categories[it] } ?: "Tidak Dikategorikan"
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
    context.startActivity(Intent.createChooser(shareIntent, "Ekspor Pengeluaran"))
}
```

## Contoh Kode

Struktur proyek lengkap setelah mengikuti tutorial ini:

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

### Pengujian Unit DAO Room

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
            description = "Makan Siang",
            date = System.currentTimeMillis(),
            type = TransactionType.EXPENSE
        )
        val id = transactionDao.insert(transaction)
        val retrieved = transactionDao.getTransactionById(id)
        assertThat(retrieved.amount).isEqualTo(25.50)
        assertThat(retrieved.description).isEqualTo("Makan Siang")
    }

    @Test
    fun searchByDescription() = runTest {
        transactionDao.insert(Transaction(amount = 10.0, description = "Kopi", date = 1, type = TransactionType.EXPENSE))
        transactionDao.insert(Transaction(amount = 15.0, description = "Roti", date = 2, type = TransactionType.EXPENSE))

        val results = transactionDao.searchTransactions("Kopi").first()
        assertThat(results).hasSize(1)
        assertThat(results[0].description).isEqualTo("Kopi")
    }
}
```

## Insight Penting

- **Room menegakkan verifikasi SQL pada waktu kompilasi**: Tidak seperti kueri SQLite mentah, Room memvalidasi SQL Anda pada waktu kompilasi. Kesalahan sintaks atau ketidakcocokan nama kolom menyebabkan kegagalan build, bukan crash saat runtime. Gunakan anotasi `@Query` dengan hati-hati — verifikasi kueri Room adalah jaring pengaman, bukan pengganti untuk menguji kueri yang kompleks.
- **Sumber Kebenaran Tunggal dengan StateFlow**: Setiap layar mengamati `StateFlow` khusus yang mewakili status lengkapnya pada setiap saat. Hindari mengekspos beberapa flow terpisah dari ViewModel yang harus digabungkan secara manual oleh UI — agregat status di ViewModel menggunakan `combine()` atau `flatMapLatest()`.
- **Pencarian dengan debounce menggunakan Flow**: Implementasikan pencarian reaktif dengan melakukan debounce pada `StateFlow` kueri dan menggunakan `flatMapLatest` untuk beralih antara daftar lengkap dan hasil pencarian. Ini mencegah kueri database yang tidak perlu pada setiap penekanan tombol dan secara otomatis membatalkan pencarian sebelumnya saat kueri berubah.
- **Repository sebagai API akses data tunggal**: Meskipun aplikasi ini hanya menggunakan Room, abstraksi Repository memudahkan penambahan sumber data jarak jauh nanti (Retrofit, Firebase) tanpa mengubah ViewModel atau lapisan UI. Definisikan antarmuka atau kelas abstrak Repository untuk fleksibilitas maksimum.
- **Ekspor CSV melalui FileProvider**: Menulis data yang diekspor ke `getExternalFilesDir` dan membaginya melalui `FileProvider` menghormati model penyimpanan scoped storage Android dan berfungsi pada Android 10+ tanpa izin `WRITE_EXTERNAL_STORAGE`.

## Langkah Berikutnya

- Jelajahi integrasi API jarak jauh (seperti backend Node.js) untuk menyinkronkan pengeluaran antar perangkat, menggunakan pola Repository yang diperkenalkan di sini.
- Tambahkan pengingat notifikasi untuk tagihan berulang menggunakan tugas periodik WorkManager.
- Implementasikan tema dinamis Material 3 dengan `dynamicColor = true` untuk tampilan aplikasi yang dipersonalisasi.
- Pelajari [Silabus Pengembangan Android](../syllabi/android-development-syllabus.md) untuk jalur pembelajaran terstruktur yang mencakup pola-pola ini secara lebih mendalam.

## Kesimpulan

Dalam tutorial ini, Anda telah membangun aplikasi pencatat pengeluaran Android yang berfungsi penuh dan offline-first menggunakan Kotlin, Room, Jetpack Compose, dan arsitektur MVVM. Anda mempelajari cara merancang database Room dengan beberapa entitas dan foreign key, mengimplementasikan akses data reaktif dengan Flow dan StateFlow, membangun UI Material 3 dengan Compose, dan menambahkan fitur praktis seperti pemfilteran pencarian dan ekspor CSV. Pola-pola ini — persistensi Room, manajemen status ViewModel, dan abstraksi Repository — dapat ditransfer ke hampir semua aplikasi Android berbasis data yang akan Anda bangun di produksi.

---
name: android-patterns
description: "Android/Jetpack Compose patterns — state hoisting, UDF with ViewModel/UiState, side effects (LaunchedEffect/rememberUpdatedState), Material Design 3 components, type-safe Navigation, Hilt DI, Room database, and Compose performance (derivedStateOf, key)."
---
# Android Patterns (Jetpack Compose)

## When to Activate

- Designing architecture for a new Android feature or app
- Choosing between Compose patterns (state hoisting, side effects)
- Setting up Hilt dependency injection and scoping
- Designing Room database schema with migrations
- Implementing ViewModel with StateFlow and UiState
- Reviewing Android code for best practices and Google guidelines
- Modularizing a growing Android codebase

---

## Jetpack Compose Basics

Composables are pure functions — they receive data and emit UI. Never hold mutable state inside a Composable directly; hoist it up.

```kotlin
// Stateless Composable — accepts value + callback (testable, reusable)
@Composable
fun CounterButton(
    count: Int,
    onIncrement: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(onClick = onIncrement, modifier = modifier) {
        Text("Count: $count")
    }
}

// Stateful wrapper — owns state, passes it down
@Composable
fun CounterScreen() {
    var count by rememberSaveable { mutableIntStateOf(0) }
    CounterButton(count = count, onIncrement = { count++ })
}
```

**State rules:**
- `remember { }` — survives recomposition, lost on configuration change
- `rememberSaveable { }` — survives recomposition AND configuration changes (and process death for primitives)
- `rememberSaveable(saver = ...)` — custom Saver for complex types

---

## State Hoisting

State hoisting = lifting state up so a Composable becomes stateless. Classic pattern:

```kotlin
// WRONG: state trapped inside — untestable, not reusable
@Composable
fun SearchBox() {
    var query by remember { mutableStateOf("") }
    TextField(value = query, onValueChange = { query = it })
}

// CORRECT: hoisted — caller controls state
@Composable
fun SearchBox(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    TextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier,
        placeholder = { Text("Search…") },
    )
}

// Usage: state lives in ViewModel or parent Composable
@Composable
fun SearchScreen(viewModel: SearchViewModel = hiltViewModel()) {
    val query by viewModel.query.collectAsStateWithLifecycle()
    SearchBox(query = query, onQueryChange = viewModel::onQueryChange)
}
```

---

## Side Effects

| Effect | When to Use |
|--------|-------------|
| `LaunchedEffect(key)` | Launch a coroutine tied to Composable lifecycle. Re-launches when key changes. |
| `DisposableEffect(key)` | Register/unregister listeners (e.g. lifecycle observers). Cleanup via `onDispose`. |
| `SideEffect` | Sync Compose state to non-Compose objects (e.g. analytics). Runs every recomposition. |
| `rememberCoroutineScope()` | Get scope for event-driven coroutines (button clicks). |
| `produceState` | Convert callback-based APIs to Compose State. |

```kotlin
// LaunchedEffect: load data on screen entry
@Composable
fun ProductDetailScreen(productId: String, viewModel: ProductViewModel = hiltViewModel()) {
    LaunchedEffect(productId) {
        viewModel.loadProduct(productId) // Reloads if productId changes
    }
    // ...
}

// DisposableEffect: register a lifecycle observer
@Composable
fun LifecycleLogger(tag: String) {
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            Log.d(tag, "Lifecycle: $event")
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
}
```

---

## Material Design 3

```kotlin
// Theme setup (generated via Material Theme Builder)
@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true, // Android 12+ wallpaper colors
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    MaterialTheme(colorScheme = colorScheme, typography = AppTypography, content = content)
}

// Common M3 components
@Composable
fun ProductScreen(product: Product, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product.name) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { /* add to cart */ },
                icon = { Icon(Icons.Filled.ShoppingCart, "Add to cart") },
                text = { Text("Add to Cart") },
            )
        },
    ) { padding ->
        ProductDetail(product = product, modifier = Modifier.padding(padding))
    }
}
```

---

## Navigation Component (Type-Safe)

```kotlin
// Define routes with Kotlin Serialization (Navigation 2.8+)
@Serializable object HomeRoute
@Serializable data class ProductDetailRoute(val productId: String)
@Serializable data class OrderConfirmationRoute(val orderId: String)

// NavHost
@Composable
fun AppNavHost(navController: NavHostController) {
    NavHost(navController = navController, startDestination = HomeRoute) {
        composable<HomeRoute> {
            HomeScreen(onProductClick = { id ->
                navController.navigate(ProductDetailRoute(id))
            })
        }
        composable<ProductDetailRoute> { backStackEntry ->
            val route = backStackEntry.toRoute<ProductDetailRoute>()
            ProductDetailScreen(
                productId = route.productId,
                onOrderPlaced = { orderId ->
                    navController.navigate(OrderConfirmationRoute(orderId)) {
                        popUpTo<HomeRoute>() // Clear detail from back stack
                    }
                },
            )
        }
        composable<OrderConfirmationRoute> { backStackEntry ->
            val route = backStackEntry.toRoute<OrderConfirmationRoute>()
            OrderConfirmationScreen(orderId = route.orderId)
        }
    }
}
```

**Key navigation options:**
```kotlin
navController.navigate(SomeRoute) {
    popUpTo<HomeRoute> { inclusive = false } // clear back stack up to Home
    launchSingleTop = true                   // avoid duplicate destinations
    restoreState = true                      // restore saved state on re-select
}
```

---

## ViewModel + UiState (Unidirectional Data Flow)

```kotlin
// 1. Define sealed UiState
sealed interface ProductUiState {
    data object Loading : ProductUiState
    data class Success(val product: Product, val isInCart: Boolean) : ProductUiState
    data class Error(val message: String) : ProductUiState
}

// 2. UiEvent (one-time effects via SharedFlow)
sealed interface ProductUiEvent {
    data class NavigateToCart(val cartId: String) : ProductUiEvent
    data class ShowSnackbar(val message: String) : ProductUiEvent
}

// 3. ViewModel
@HiltViewModel
class ProductViewModel @Inject constructor(
    private val getProduct: GetProductUseCase,
    private val addToCart: AddToCartUseCase,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val productId: String = checkNotNull(savedStateHandle["productId"])

    private val _uiState = MutableStateFlow<ProductUiState>(ProductUiState.Loading)
    val uiState: StateFlow<ProductUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<ProductUiEvent>()
    val uiEvents: SharedFlow<ProductUiEvent> = _uiEvents.asSharedFlow()

    init {
        loadProduct()
    }

    private fun loadProduct() {
        viewModelScope.launch {
            _uiState.value = ProductUiState.Loading
            getProduct(productId)
                .onSuccess { product ->
                    _uiState.value = ProductUiState.Success(product, isInCart = false)
                }
                .onFailure { error ->
                    _uiState.value = ProductUiState.Error(error.message ?: "Unknown error")
                }
        }
    }

    fun onAddToCart() {
        val currentState = _uiState.value as? ProductUiState.Success ?: return
        viewModelScope.launch {
            addToCart(currentState.product.id)
                .onSuccess { cartId ->
                    _uiEvents.emit(ProductUiEvent.NavigateToCart(cartId))
                }
                .onFailure {
                    _uiEvents.emit(ProductUiEvent.ShowSnackbar("Failed to add to cart"))
                }
        }
    }
}

// 4. Composable
@Composable
fun ProductDetailScreen(viewModel: ProductViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    // Collect one-time events
    LaunchedEffect(Unit) {
        viewModel.uiEvents.collect { event ->
            when (event) {
                is ProductUiEvent.ShowSnackbar -> snackbarHostState.showSnackbar(event.message)
                is ProductUiEvent.NavigateToCart -> { /* navigate */ }
            }
        }
    }

    when (val state = uiState) {
        is ProductUiState.Loading -> CircularProgressIndicator()
        is ProductUiState.Error -> ErrorScreen(message = state.message)
        is ProductUiState.Success -> ProductContent(
            product = state.product,
            onAddToCart = viewModel::onAddToCart,
        )
    }
}
```

**Critical:** Use `collectAsStateWithLifecycle()` (from `lifecycle-runtime-compose`), NOT `collectAsState()`. The lifecycle-aware version pauses collection when the app is in the background, saving resources.

---

## Hilt Dependency Injection

```kotlin
// Application class
@HiltAndroidApp
class MyApp : Application()

// Activity (entry point)
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MyAppTheme { AppNavHost(rememberNavController()) } }
    }
}

// Module: provide network dependencies as Singletons
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply { level = BODY })
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(okHttp: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttp)
        .addConverterFactory(MoshiConverterFactory.create())
        .build()

    @Provides
    @Singleton
    fun provideProductApi(retrofit: Retrofit): ProductApi =
        retrofit.create(ProductApi::class.java)
}

// Module: provide Repository (Singleton scope)
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindProductRepository(impl: ProductRepositoryImpl): ProductRepository
}

// Hilt scopes guide:
// @Singleton       — app lifetime (one instance across entire app)
// @ActivityRetained — survives configuration changes, per Activity
// @ViewModelScoped  — same as Activity/Fragment's ViewModel scope
// @ActivityScoped  — per Activity instance (destroyed on finish)
// @FragmentScoped  — per Fragment instance
```

---

## Room Persistence

```kotlin
// Entity
@Entity(
    tableName = "products",
    indices = [Index(value = ["category_id"]), Index(value = ["sku"], unique = true)],
)
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val price: Double,
    @ColumnInfo(name = "category_id") val categoryId: String,
    val sku: String,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
)

// DAO
@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getById(id: String): ProductEntity?

    @Query("SELECT * FROM products WHERE category_id = :categoryId ORDER BY name ASC")
    fun getByCategory(categoryId: String): Flow<List<ProductEntity>> // Flow for reactive updates

    @Upsert
    suspend fun upsert(product: ProductEntity)

    @Delete
    suspend fun delete(product: ProductEntity)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteById(id: String)
}

// Relation: one-to-many
data class CategoryWithProducts(
    @Embedded val category: CategoryEntity,
    @Relation(parentColumn = "id", entityColumn = "category_id")
    val products: List<ProductEntity>,
)

// Database
@Database(
    entities = [ProductEntity::class, CategoryEntity::class],
    version = 2,
    exportSchema = true, // ALWAYS true — export to schemas/ directory for migration testing
)
@TypeConverters(DateConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
}

// Migration: NEVER increase version without migration
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE products ADD COLUMN sku TEXT NOT NULL DEFAULT ''")
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_products_sku ON products(sku)")
    }
}

// Provide database via Hilt
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
            .addMigrations(MIGRATION_1_2)
            .build()

    @Provides
    fun provideProductDao(db: AppDatabase): ProductDao = db.productDao()
}
```

---

## Kotlin Coroutines in Android

```kotlin
// Repository: bridge between data sources
class ProductRepositoryImpl @Inject constructor(
    private val api: ProductApi,
    private val dao: ProductDao,
    private val dispatchers: CoroutineDispatchers,
) : ProductRepository {

    override fun getProduct(id: String): Flow<Result<Product>> = flow {
        // Emit cached data first (offline-first)
        dao.getById(id)?.let { emit(Result.success(it.toDomain())) }

        // Fetch fresh data
        val result = runCatching { api.getProduct(id) }
        result.onSuccess { dto ->
            dao.upsert(dto.toEntity())
            emit(Result.success(dto.toDomain()))
        }.onFailure { error ->
            emit(Result.failure(error))
        }
    }.flowOn(dispatchers.io)
}

// Dispatcher injection (testable)
interface CoroutineDispatchers {
    val main: CoroutineDispatcher
    val io: CoroutineDispatcher
    val default: CoroutineDispatcher
}

class DefaultDispatchers @Inject constructor() : CoroutineDispatchers {
    override val main = Dispatchers.Main
    override val io = Dispatchers.IO
    override val default = Dispatchers.Default
}

// In tests: inject TestDispatchers
class TestDispatchers(testDispatcher: TestCoroutineDispatcher) : CoroutineDispatchers {
    override val main = testDispatcher
    override val io = testDispatcher
    override val default = testDispatcher
}
```

---

## App Modularization

Recommended module structure for apps with 3+ features:

```
:app                          — Application entry point, DI graph assembly
:feature:home                 — Home screen feature module
:feature:product-detail       — Product detail feature module
:feature:cart                 — Cart feature module
:core:network                 — Retrofit, OkHttp, API definitions
:core:database                — Room database, DAOs
:core:ui                      — Shared Composables, theme, design system
:core:domain                  — Domain models, use case interfaces
:core:data                    — Repository implementations (depends on :core:network, :core:database)
:core:testing                 — Shared test utilities, fakes, test rules
```

```kotlin
// build.gradle.kts — feature module
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.myapp.feature.home"
}

dependencies {
    implementation(projects.core.ui)
    implementation(projects.core.domain)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    testImplementation(projects.core.testing)
}
```

---

For Compose performance optimization (derivedStateOf, stable types, lambda captures) and reference rules, see skill `android-patterns-advanced`.

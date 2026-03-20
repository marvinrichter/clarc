---
paths:
  - "**/*.kt"
  - "**/*.kts"
globs:
  - "**/*.{kt,kts}"
  - "**/AndroidManifest.xml"
  - "**/build.gradle.kts"
alwaysApply: false
---
# Android Architecture Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Android specific content.

## Unidirectional Data Flow (UDF) — Always

Every feature must follow UDF: Events flow up, State flows down.

```
User Action → ViewModel.onEvent() → StateFlow<UiState> → Composable renders
```

No bi-directional data binding. No reactive callbacks from ViewModel to UI (use `SharedFlow` for one-time events like navigation).

```kotlin
// CORRECT: one-way UiState binding
val uiState by viewModel.uiState.collectAsStateWithLifecycle()

// WRONG: ViewModel callback into Composable
viewModel.onProductLoaded = { product -> /* update local state */ }
```

## Repository Pattern — All Data Sources

All data access goes through a Repository interface. Composables and ViewModels never access DAOs, APIs, or SharedPreferences directly.

```kotlin
// CORRECT: ViewModel depends on Repository interface
class HomeViewModel @Inject constructor(
    private val productRepository: ProductRepository, // interface
) : ViewModel()

// WRONG: ViewModel accesses DAO directly
class HomeViewModel @Inject constructor(
    private val productDao: ProductDao, // implementation detail
) : ViewModel()
```

## Feature Modularization Threshold

Modularize when the project has 3 or more distinct features. Do not modularize a single-screen app — premature modularization adds overhead without benefit.

**Module boundaries:**
- Features depend on `:core:*` modules, never on each other
- `:core:domain` has zero Android dependencies (pure Kotlin)
- `:core:data` depends on `:core:network` and `:core:database` but not on feature modules
- `:app` wires everything together — single activity, NavHost, Hilt graph root

## Hilt for All Dependency Injection

Never manually construct dependencies or pass them through the call stack. All injection via Hilt:

- Constructor injection for all non-Android classes (UseCases, Repositories, etc.)
- `@Inject constructor(...)` for everything Hilt can construct
- `@HiltViewModel` for all ViewModels
- `@Module @InstallIn(...)` for infrastructure (network, database, analytics)

**Manual DI is only acceptable** in unit tests via constructor parameters (no Hilt needed there).

## UiState Sealed Interface Pattern

Every screen has a single `StateFlow<ScreenUiState>` with at minimum Loading/Success/Error variants:

```kotlin
sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Success(
        val featuredProducts: List<ProductUiModel>,
        val categories: List<CategoryUiModel>,
    ) : HomeUiState
    data class Error(val message: String) : HomeUiState
}
```

Never use nullable fields to represent "not loaded yet" state — use `Loading`.
Never combine success data and error in the same state — use separate sealed classes.

## One-Time Events via SharedFlow

Use `SharedFlow` (not `StateFlow`) for events that should be consumed once (navigation, snackbars, toasts):

```kotlin
// In ViewModel
private val _events = MutableSharedFlow<HomeUiEvent>()
val events: SharedFlow<HomeUiEvent> = _events.asSharedFlow()

// In Composable — collect in LaunchedEffect
LaunchedEffect(Unit) {
    viewModel.events.collect { event ->
        when (event) {
            is HomeUiEvent.NavigateToDetail -> navController.navigate(DetailRoute(event.id))
            is HomeUiEvent.ShowError -> snackbarHostState.showSnackbar(event.message)
        }
    }
}
```

## Offline-First by Default

Use Room as the single source of truth. Network responses are written to Room; UI observes Room Flow.

```kotlin
// Repository: network-to-cache-to-UI pattern
override fun getProducts(): Flow<List<Product>> = productDao.getAll()
    .onStart { refreshFromNetwork() }
    .map { entities -> entities.map { it.toDomain() } }

private suspend fun refreshFromNetwork() = runCatching { api.getProducts() }
    .onSuccess { dtos -> productDao.upsertAll(dtos.map { it.toEntity() }) }
```

## Material 3 Only

No new screens use Material 2 (`androidx.compose.material`). All UI uses Material 3 (`androidx.compose.material3`). Mixed M2/M3 projects must plan migration.

## ProGuard / R8 Rules

Libraries using reflection require ProGuard rules to survive minification:

```proguard
# Hilt / Dagger
-keepclasseswithmembers class * {
    @dagger.hilt.* <methods>;
}

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *

# Retrofit + Moshi
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.squareup.moshi.** { *; }
```

Always test release builds (`./gradlew assembleRelease`) before shipping — minification bugs are runtime errors, not build errors.

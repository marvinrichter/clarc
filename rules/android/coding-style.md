---
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "**/AndroidManifest.xml"
---
# Android Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Android/Kotlin specific content.

## Formatting

- **ktlint** for auto-formatting (enforced in CI via `./gradlew ktlintCheck`)
- **detekt** for static analysis and code smell detection
- Line length: 120 characters max
- `./gradlew ktlintFormat` to auto-fix before committing

## Composable File Organization

One top-level Composable screen per file. Supporting composables used only by that screen live in the same file or a `components/` subdirectory within the feature module:

```
feature/home/
├── HomeScreen.kt          — @Composable HomeScreen (top-level screen)
├── HomeViewModel.kt       — ViewModel for HomeScreen
├── HomeUiState.kt         — sealed interface HomeUiState
├── components/
│   ├── FeaturedBanner.kt  — sub-composable used only in Home
│   └── QuickActionRow.kt  — sub-composable used only in Home
```

## StateFlow Over LiveData

All new code uses `StateFlow` + `collectAsStateWithLifecycle()`. `LiveData` is only acceptable in legacy code pending migration:

```kotlin
// CORRECT
val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

// WRONG — new code must not introduce LiveData
val uiState: LiveData<HomeUiState> = MutableLiveData()
```

## No Android Imports in ViewModels

ViewModels must import only from:
- `androidx.lifecycle.*` (ViewModel, viewModelScope, SavedStateHandle)
- Your domain/data layer modules
- Kotlin stdlib and coroutines

Never import:
- `android.content.Context` (except via `@ApplicationContext` in Hilt if absolutely required — document why)
- `android.app.Activity` or `android.app.Fragment`
- Any `android.view.*` or `androidx.compose.*` package

## Coroutine Scopes

| Location | Correct Scope |
|----------|---------------|
| ViewModel | `viewModelScope.launch { }` |
| Activity / Fragment | `lifecycleScope.launch { }` |
| Composable event handler | `rememberCoroutineScope()` |
| Application / Service | Injected `@ApplicationScope CoroutineScope` via Hilt |
| Test | `runTest { }` from `kotlinx-coroutines-test` |

## Immutability

- Room entities: use `val` for all fields; use `copy()` for updates
- UiState: sealed interfaces with `data object` / `data class` — all fields `val`
- Domain models: `data class` with all `val` — never `var`

```kotlin
// CORRECT
data class Product(val id: String, val name: String, val price: Double)

// WRONG
data class Product(var id: String, var name: String, var price: Double)
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Composable function | PascalCase | `ProductCard`, `HomeScreen` |
| ViewModel | `<Feature>ViewModel` | `ProductViewModel` |
| UiState | `<Feature>UiState` | `ProductUiState` |
| UiEvent (SharedFlow) | `<Feature>UiEvent` | `ProductUiEvent` |
| Use Case | `<Verb><Noun>UseCase` | `GetProductUseCase` |
| Repository interface | `<Noun>Repository` | `ProductRepository` |
| Repository impl | `<Noun>RepositoryImpl` | `ProductRepositoryImpl` |
| Room Entity | `<Noun>Entity` | `ProductEntity` |
| Room DAO | `<Noun>Dao` | `ProductDao` |
| Hilt Module | `<Domain>Module` | `NetworkModule`, `DatabaseModule` |
| Test file | `<TestedClass>Test` | `ProductViewModelTest` |

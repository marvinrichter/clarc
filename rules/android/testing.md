---
paths:
  - "**/*.kt"
  - "**/*Test.kt"
  - "**/*Test.java"
globs:
  - "**/*.{kt,kts}"
  - "**/AndroidManifest.xml"
  - "**/build.gradle.kts"
alwaysApply: false
---
# Android Testing Requirements

> This file extends [common/testing.md](../common/testing.md) with Android specific content.

## Mandatory: testTag on All Interactive Elements

Every interactive Composable (Button, TextField, Checkbox, Switch, NavigationItem) MUST have a `testTag`:

```kotlin
// CORRECT
Button(
    onClick = onSubmit,
    modifier = Modifier.testTag("checkout_submit_button"),
) { Text("Place Order") }

// WRONG — no stable selector for tests
Button(onClick = onSubmit) { Text("Place Order") }
```

Use snake_case for testTags: `"product_card_add_to_cart_button"`.

## ViewModel Tests: Turbine + MockK

All ViewModel tests use [Turbine](https://github.com/cashapp/turbine) for Flow testing and MockK for Kotlin mocking:

```kotlin
@Test
fun `adds item to cart emits CartUpdated event`() = runTest {
    viewModel.uiEvents.test {
        viewModel.onAddToCart(productId = "42")
        testDispatcher.scheduler.advanceUntilIdle()
        assertThat(awaitItem()).isInstanceOf(CartUiEvent.CartUpdated::class.java)
        cancelAndIgnoreRemainingEvents()
    }
}
```

Never use Mockito for Kotlin classes — use MockK. Never use `Thread.sleep()` in tests — use `advanceUntilIdle()` or `advanceTimeBy()`.

## Room Tests: In-Memory Database

All DAO tests use `Room.inMemoryDatabaseBuilder()`. Never run DAO tests against the real device database:

```kotlin
@Before
fun setup() {
    database = Room.inMemoryDatabaseBuilder(
        ApplicationProvider.getApplicationContext(),
        AppDatabase::class.java,
    ).allowMainThreadQueries().build()
}
```

## Screenshot Tests: Paparazzi for All Screens

Every screen Composable must have at least one Paparazzi screenshot test covering:
1. Default / happy path state
2. Loading state (skeleton / progress)
3. Error state
4. Empty state (if applicable)
5. Dark mode variant

```kotlin
@Test
fun homeScreen_loadingState() {
    paparazzi.snapshot("loading") {
        MyAppTheme { HomeScreen(uiState = HomeUiState.Loading) }
    }
}
```

## Test Layers and Ownership

| Layer | Framework | Location | Required |
|-------|-----------|----------|----------|
| ViewModel unit tests | JUnit 5 + MockK + Turbine | `src/test/` | ALL ViewModels |
| UseCase unit tests | JUnit 5 + MockK | `src/test/` | ALL UseCases |
| Room DAO tests | JUnit 4 + Room in-memory | `src/androidTest/` | ALL DAOs |
| Compose component tests | ComposeTestRule | `src/androidTest/` | ALL interactive Composables |
| Screenshot tests | Paparazzi | `src/test/` | ALL screen Composables |
| E2E critical flows | UI Automator / Compose E2E | `src/androidTest/` | Critical user journeys |

## Emulator Tests: Only for E2E

Never write DAO, ViewModel, or Compose component tests that require an emulator if they can run on the JVM. Emulator tests are expensive — reserve them for E2E flows involving:
- Real system dialogs (camera, permission, notification)
- Cross-app interactions
- Firebase Test Lab device matrix

## Coverage Requirement

80% line coverage on:
- All ViewModel classes
- All UseCase classes
- All Repository implementations
- All DAO queries (via in-memory Room tests)

Coverage is measured by `./gradlew jacocoTestReport` and enforced in CI.

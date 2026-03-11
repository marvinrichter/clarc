---
name: android-testing
description: "Android testing — Compose UI tests with semantic selectors, Hilt dependency injection in tests, Room in-memory database tests, Espresso, MockK, Coroutine test dispatcher, and screenshot testing."
---
# Android Testing

## When to Activate

- Writing Compose UI tests with semantic selectors
- Testing ViewModels with StateFlow and coroutines
- Mocking Kotlin classes with MockK
- Setting up Room in-memory databases for tests
- Configuring Paparazzi or roborazzi for screenshot regression tests
- Running tests on real devices via Firebase Test Lab
- Setting up Espresso or UI Automator for E2E flows

---

## Test Pyramid for Android

| Layer | Framework | Speed | When to Write |
|-------|-----------|-------|---------------|
| Unit — ViewModel, Use Cases, Domain | JUnit 5 + MockK + Turbine | Fast (~ms) | All business logic |
| Unit — Room DAO | JUnit 4 + Room in-memory | Medium (~100ms) | All DAO queries |
| UI Component — Composable | Compose Test Rule | Medium (~500ms) | All interactive UI |
| Screenshot | Paparazzi / roborazzi | Medium (~1s) | All screens + states |
| E2E — Full flows | ComposeTestRule in activity | Slow (~5s) | Critical user journeys |
| Device — Cross-app, dialogs | UI Automator + Firebase Test Lab | Slowest | System dialogs, push |

---

## Compose UI Testing

### Semantic Tags (Stable Selectors)

Always add `testTag` to interactive elements. Never rely on text strings as selectors in tests — they break with i18n.

```kotlin
// In Composable: add semantic tags to interactive elements
@Composable
fun LoginForm(
    email: String,
    password: String,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onLoginClick: () -> Unit,
    isLoading: Boolean,
) {
    Column {
        TextField(
            value = email,
            onValueChange = onEmailChange,
            modifier = Modifier.semantics { testTag = "login_email_field" },
        )
        TextField(
            value = password,
            onValueChange = onPasswordChange,
            modifier = Modifier
                .semantics { testTag = "login_password_field" }
                .testTag("login_password_field"), // shorthand
        )
        Button(
            onClick = onLoginClick,
            enabled = !isLoading,
            modifier = Modifier.testTag("login_submit_button"),
        ) {
            if (isLoading) CircularProgressIndicator(modifier = Modifier.size(16.dp))
            else Text("Log In")
        }
    }
}
```

### Compose Test Rule

```kotlin
@RunWith(AndroidJUnit4::class)
class LoginFormTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun loginForm_fillAndSubmit_showsLoadingState() {
        var submittedEmail = ""
        var submittedPassword = ""
        var loginClicked = false

        composeTestRule.setContent {
            LoginForm(
                email = "test@example.com",
                password = "secret",
                onEmailChange = { submittedEmail = it },
                onPasswordChange = { submittedPassword = it },
                onLoginClick = { loginClicked = true },
                isLoading = false,
            )
        }

        // Find by test tag — stable, locale-independent
        composeTestRule.onNodeWithTag("login_email_field")
            .assertIsDisplayed()
            .performTextInput("test@example.com")

        composeTestRule.onNodeWithTag("login_password_field")
            .performTextInput("secret")

        composeTestRule.onNodeWithTag("login_submit_button")
            .assertIsEnabled()
            .performClick()

        assertThat(loginClicked).isTrue()
    }

    @Test
    fun loginForm_whileLoading_buttonIsDisabled() {
        composeTestRule.setContent {
            LoginForm(
                email = "", password = "", onEmailChange = {}, onPasswordChange = {},
                onLoginClick = {}, isLoading = true,
            )
        }

        composeTestRule.onNodeWithTag("login_submit_button")
            .assertIsNotEnabled()
    }
}
```

### Finders and Assertions

```kotlin
// Finders
composeTestRule.onNodeWithTag("my_button")       // by testTag (preferred)
composeTestRule.onNodeWithText("Submit")         // by text content
composeTestRule.onNodeWithContentDescription("Close dialog")
composeTestRule.onAllNodesWithTag("list_item")   // multiple nodes

// Assertions
.assertIsDisplayed()
.assertIsNotDisplayed()
.assertIsEnabled()
.assertIsNotEnabled()
.assertIsSelected()
.assertTextEquals("Expected text")
.assertContentDescriptionEquals("Description")
.assertHasClickAction()

// Actions
.performClick()
.performTextInput("Hello")
.performTextClearance()
.performScrollTo()
.performTouchInput { swipeUp() }
.performImeAction()  // Submit / Search keyboard action

// Waiting for async state
composeTestRule.waitUntil(timeoutMillis = 5_000) {
    composeTestRule.onAllNodesWithTag("product_list_item").fetchSemanticsNodes().isNotEmpty()
}
```

---

## Hilt in Compose Tests

When your Composable depends on ViewModels wired via Hilt:

```kotlin
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class ProductScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    // Replace real repository with fake
    @BindValue
    @JvmField
    val productRepository: ProductRepository = FakeProductRepository()

    @Test
    fun productScreen_loadSuccess_displaysProductName() {
        (productRepository as FakeProductRepository).setProduct(
            Product(id = "1", name = "Test Widget", price = 9.99)
        )

        composeTestRule.onNodeWithTag("product_name")
            .assertTextEquals("Test Widget")
    }
}
```

---

## ViewModel Testing with Turbine

[Turbine](https://github.com/cashapp/turbine) provides a clean API for testing Flows without manual coroutine juggling.

```kotlin
class ProductViewModelTest {

    // Replace real Dispatchers with TestDispatcher for deterministic tests
    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private val fakeRepository = FakeProductRepository()
    private val viewModel by lazy { ProductViewModel(GetProductUseCase(fakeRepository)) }

    @Test
    fun `loadProduct success emits Loading then Success`() = runTest {
        fakeRepository.setProduct(Product(id = "42", name = "Cool Gadget", price = 99.0))

        viewModel.uiState.test {
            assertThat(awaitItem()).isInstanceOf(ProductUiState.Loading::class.java)

            viewModel.loadProduct("42")
            testDispatcher.scheduler.advanceUntilIdle()

            val success = awaitItem() as ProductUiState.Success
            assertThat(success.product.name).isEqualTo("Cool Gadget")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `loadProduct failure emits Error state`() = runTest {
        fakeRepository.setError(IOException("Network failure"))

        viewModel.uiState.test {
            awaitItem() // Loading
            viewModel.loadProduct("42")
            testDispatcher.scheduler.advanceUntilIdle()

            val error = awaitItem() as ProductUiState.Error
            assertThat(error.message).contains("Network failure")
            cancelAndIgnoreRemainingEvents()
        }
    }
}
```

---

## MockK (Kotlin-Idiomatic Mocking)

Prefer MockK over Mockito for Kotlin — it understands Kotlin idioms (data classes, objects, top-level functions, coroutines).

```kotlin
// Basic mock
val mockRepository = mockk<ProductRepository>()

// Stubbing
coEvery { mockRepository.getProduct("123") } returns Product(id = "123", name = "Widget")
coEvery { mockRepository.getProduct("999") } throws NotFoundException("999")

// Relaxed mock: no stubbing needed, returns defaults for all calls
val relaxedMock = mockk<AnalyticsService>(relaxed = true)

// Verify calls
coVerify(exactly = 1) { mockRepository.getProduct("123") }
verify { relaxedMock.trackEvent(any()) }

// Capturing arguments
val slot = slot<String>()
coEvery { mockRepository.getProduct(capture(slot)) } returns mockProduct
viewModel.load("test-id")
assertThat(slot.captured).isEqualTo("test-id")

// Spy on real objects
val realUseCase = GetProductUseCase(mockRepository)
val spy = spyk(realUseCase)
coEvery { spy.invoke("special") } returns specialProduct

// Mock companion objects and top-level functions
mockkObject(MyObject)
every { MyObject.staticMethod() } returns "mocked"

// Mock Android final classes (add MockKExtension)
@ExtendWith(MockKExtension::class)
class MyTest {
    val context = mockk<Context>()
}
```

---

## Room In-Memory Database Testing

```kotlin
class ProductDaoTest {

    private lateinit var database: AppDatabase
    private lateinit var productDao: ProductDao

    @Before
    fun createDb() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        )
            .allowMainThreadQueries() // Only for tests
            .build()
        productDao = database.productDao()
    }

    @After
    fun closeDb() {
        database.close()
    }

    @Test
    fun insertAndRetrieveProduct() = runTest {
        val product = ProductEntity(id = "1", name = "Gadget", price = 29.99, categoryId = "cat1", sku = "G001")
        productDao.upsert(product)

        val retrieved = productDao.getById("1")
        assertThat(retrieved).isEqualTo(product)
    }

    @Test
    fun getByCategory_returnsOnlyMatchingCategory() = runTest {
        productDao.upsert(ProductEntity("1", "Gadget A", 10.0, "electronics", "A001"))
        productDao.upsert(ProductEntity("2", "Gadget B", 20.0, "electronics", "B001"))
        productDao.upsert(ProductEntity("3", "Book C", 5.0, "books", "C001"))

        productDao.getByCategory("electronics").test {
            val items = awaitItem()
            assertThat(items).hasSize(2)
            assertThat(items.map { it.sku }).containsExactlyInAnyOrder("A001", "B001")
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun migration_1_to_2_addsSkuColumn() {
        // Use MigrationTestHelper for migration verification
        val helper = MigrationTestHelper(
            InstrumentationRegistry.getInstrumentation(),
            AppDatabase::class.java,
        )

        helper.createDatabase("test-migration", 1).apply {
            execSQL("INSERT INTO products (id, name, price, category_id) VALUES ('1', 'Old', 5.0, 'cat')")
            close()
        }

        val db = helper.runMigrationsAndValidate("test-migration", 2, true, MIGRATION_1_2)
        val cursor = db.query("SELECT sku FROM products WHERE id = '1'")
        cursor.moveToFirst()
        assertThat(cursor.getString(0)).isEmpty() // default value
    }
}
```

---

## Screenshot Testing with Paparazzi

[Paparazzi](https://github.com/cashapp/paparazzi) renders Composables to screenshots on the JVM — no emulator needed, very fast CI.

```kotlin
// build.gradle.kts
plugins {
    alias(libs.plugins.paparazzi)
}

// Test
class ProductCardScreenshotTest {

    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6,
        theme = "Theme.MyApp",
    )

    @Test
    fun productCard_defaultState() {
        paparazzi.snapshot {
            MyAppTheme {
                ProductCard(
                    product = Product("1", "Test Widget", 29.99),
                    onAddToCart = {},
                )
            }
        }
    }

    @Test
    fun productCard_outOfStock() {
        paparazzi.snapshot("out_of_stock") {
            MyAppTheme {
                ProductCard(
                    product = Product("1", "Sold Out Item", 0.0, inStock = false),
                    onAddToCart = {},
                )
            }
        }
    }

    // Test dark mode
    @Test
    fun productCard_darkMode() {
        paparazzi.snapshot("dark") {
            MyAppTheme(darkTheme = true) {
                ProductCard(product = sampleProduct, onAddToCart = {})
            }
        }
    }
}
```

**CI workflow:**
```yaml
# .github/workflows/screenshot-tests.yml
- name: Run Paparazzi tests
  run: ./gradlew :feature:home:verifyPaparazziRelease

- name: Upload screenshot diffs on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: paparazzi-diffs
    path: "**/out/failures/"
```

---

## Firebase Test Lab

For E2E tests on real physical devices:

```bash
# Build test APKs
./gradlew assembleDebug assembleDebugAndroidTest

# Run on Firebase Test Lab (requires gcloud CLI)
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --device model=shiba,version=34,locale=en,orientation=portrait \
  --device model=bluejay,version=32,locale=de,orientation=portrait \
  --results-bucket gs://my-firebase-bucket \
  --results-dir test-results-$(date +%Y%m%d-%H%M%S)
```

**GitHub Actions integration:**
```yaml
- name: Run E2E on Firebase Test Lab
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}

- name: Execute Firebase Test Lab
  run: |
    gcloud firebase test android run \
      --type instrumentation \
      --app app-debug.apk \
      --test app-debug-androidTest.apk \
      --device model=shiba,version=34
```

---

## Espresso (Classic View-Based UI Tests)

Still relevant for non-Compose screens or E2E flows mixing View + Compose:

```kotlin
@RunWith(AndroidJUnit4::class)
class LoginActivityTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(LoginActivity::class.java)

    @Test
    fun login_withValidCredentials_navigatesToHome() {
        onView(withId(R.id.email_input)).perform(typeText("user@example.com"), closeSoftKeyboard())
        onView(withId(R.id.password_input)).perform(typeText("password123"), closeSoftKeyboard())
        onView(withId(R.id.login_button)).perform(click())

        // Verify navigation to home
        onView(withId(R.id.home_toolbar)).check(matches(isDisplayed()))
    }
}
```

---

## Reference

- `rules/android/testing.md` — mandatory testTag, Turbine, no emulator for unit tests
- Skill: `android-patterns` — Compose architecture, ViewModel, Hilt, Room
- Skill: `tdd-workflow` — Red-Green-Refactor process

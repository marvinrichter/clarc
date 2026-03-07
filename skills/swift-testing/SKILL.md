---
name: swift-testing
description: "Swift testing patterns: Swift Testing framework (Swift 6+), XCTest for UI tests, async/await test cases, actor testing, Combine testing, and XCUITest for UI automation. TDD for Swift/SwiftUI."
version: 1.0.0
---

# Swift Testing

Core testing patterns for Swift using the Swift Testing framework, XCTest, and XCUITest.

## When to Activate

- Writing tests for Swift or SwiftUI code
- Setting up a test target in Xcode
- Testing async/actor code
- Writing UI automation tests
- Achieving 80%+ code coverage in Swift projects

## Framework Selection

| Use Case | Framework | Notes |
|---|---|---|
| Unit + Integration | **Swift Testing** | Swift 6+, preferred. `@Test`, `#expect`, `@Suite` |
| Unit + Integration (legacy) | **XCTest** | Compatible with all Swift versions |
| UI Automation | **XCUITest** | Xcode Instruments + accessibility identifiers |
| Protocol-based mocking | See `swift-protocol-di-testing` | Companion skill for DI patterns |

## Swift Testing Framework (Swift 6+)

```swift
import Testing

// Basic test
@Test func formatPrice() {
    #expect(PriceFormatter.format(cents: 1000, currency: "USD") == "$10.00")
}

// Grouped suite
@Suite("PriceFormatter")
struct PriceFormatterTests {
    @Test func formatsZero() {
        #expect(PriceFormatter.format(cents: 0, currency: "USD") == "$0.00")
    }

    @Test func throwsOnNegative() throws {
        #expect(throws: PriceError.negativeAmount) {
            try PriceFormatter.format(cents: -1, currency: "USD")
        }
    }
}

// Parameterized tests
@Test("Formats various currencies", arguments: [
    (100, "USD", "$1.00"),
    (100, "EUR", "€1.00"),
    (100, "GBP", "£1.00"),
])
func formatsMultipleCurrencies(cents: Int, currency: String, expected: String) {
    #expect(PriceFormatter.format(cents: cents, currency: currency) == expected)
}
```

## Async Testing

```swift
import Testing

@Test func fetchesUser() async throws {
    let service = UserService(client: MockHTTPClient())
    let user = try await service.fetchUser(id: "123")
    #expect(user.id == "123")
    #expect(user.name == "Test User")
}

// Timeout-bounded async tests
@Test(.timeLimit(.seconds(5)))
func completesWithinTimeout() async throws {
    let result = try await slowOperation()
    #expect(result != nil)
}
```

## Actor Testing

```swift
actor Counter {
    private(set) var count = 0
    func increment() { count += 1 }
}

@Test func actorIncrements() async {
    let counter = Counter()
    await counter.increment()
    let count = await counter.count
    #expect(count == 1)
}
```

## XCTest (Legacy / UI Tests)

```swift
import XCTest

class UserServiceTests: XCTestCase {
    var sut: UserService!
    var mockClient: MockHTTPClient!

    override func setUp() {
        super.setUp()
        mockClient = MockHTTPClient()
        sut = UserService(client: mockClient)
    }

    override func tearDown() {
        sut = nil
        mockClient = nil
        super.tearDown()
    }

    func testFetchUser_returnsUser() async throws {
        mockClient.stubbedResponse = .success(UserFixtures.testUser)
        let user = try await sut.fetchUser(id: "123")
        XCTAssertEqual(user.id, "123")
    }

    func testFetchUser_throwsOnNetworkError() async {
        mockClient.stubbedResponse = .failure(URLError(.notConnectedToInternet))
        do {
            _ = try await sut.fetchUser(id: "123")
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertTrue(error is URLError)
        }
    }
}
```

## Combine Testing

```swift
import XCTest
import Combine

class ViewModelTests: XCTestCase {
    var cancellables = Set<AnyCancellable>()

    func testPublishesUpdatedValue() {
        let vm = CounterViewModel()
        var received: [Int] = []
        let expectation = expectation(description: "receives values")
        expectation.expectedFulfillmentCount = 3

        vm.$count.sink { value in
            received.append(value)
            expectation.fulfill()
        }.store(in: &cancellables)

        vm.increment()
        vm.increment()

        waitForExpectations(timeout: 1)
        XCTAssertEqual(received, [0, 1, 2])
    }
}
```

## UI Testing with XCUITest

```swift
import XCTest

class LoginUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["--uitesting", "--reset-state"]
        app.launch()
    }

    func testLoginFlow() throws {
        // Use accessibilityIdentifier set in SwiftUI with .accessibilityIdentifier()
        let emailField = app.textFields["login.email"]
        let passwordField = app.secureTextFields["login.password"]
        let loginButton = app.buttons["login.submit"]

        emailField.tap()
        emailField.typeText("user@example.com")
        passwordField.tap()
        passwordField.typeText("password123")
        loginButton.tap()

        XCTAssertTrue(app.staticTexts["dashboard.title"].waitForExistence(timeout: 3))
    }
}
```

## Coverage in Xcode

```bash
# Enable code coverage in scheme settings:
# Product → Scheme → Edit Scheme → Test → Code Coverage → ✓ Gather coverage

# Run with coverage from CLI
xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -enableCodeCoverage YES | xcpretty
```

Target: **80%+ line coverage** — enforce in CI via `xccov` or `slather`.

## TDD Cycle for Swift

1. **RED**: Write `@Test func behaviour() { #expect(...) }` — it fails to compile or returns wrong value
2. **GREEN**: Write minimum Swift code to make `#expect` pass
3. **REFACTOR**: Extract protocols, use value types, clean up — all tests stay green
4. **VERIFY**: Run `swift test --enable-code-coverage`, check report

## Common Pitfalls

- **Avoid `@MainActor` in test bodies**: Marks the entire test synchronous — use `await` instead
- **Always set `continueAfterFailure = false`** in UI tests to stop on first failure
- **Use `accessibilityIdentifier` not label text** for stable UI test element queries
- **Prefer `#expect` over `XCTAssert*`** in Swift Testing — better error messages and parameterization

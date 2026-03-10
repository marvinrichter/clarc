---
name: swift-patterns
description: Core Swift patterns — value vs reference types, protocols, generics, optionals, Result, error handling, Codable, and module organization. Foundation for all Swift development.
---

# Swift Patterns

Core language patterns for production Swift (5.9+).

## When to Activate

- Writing Swift types and business logic
- Designing protocols and generics
- Handling errors and optionals safely
- Serializing/deserializing data with Codable
- Reviewing Swift code for force unwraps, bare `catch` blocks, or public mutable state that should be private
- Choosing between `struct` and `class` for a new model or service type
- Deciding between existentials (`any Protocol`) and generics (`<T: Protocol>`) for a function signature

## Value Types vs Reference Types

Swift's type system distinguishes between value types (copied) and reference types (shared):

```swift
// Value type: struct — prefer for data, no shared mutable state
struct Point {
    var x: Double
    var y: Double

    func distance(to other: Point) -> Double {
        sqrt(pow(x - other.x, 2) + pow(y - other.y, 2))
    }
}

// Value type: enum — use for modeling states or choices
enum Direction {
    case north, south, east, west

    var opposite: Direction {
        switch self {
        case .north: return .south
        case .south: return .north
        case .east:  return .west
        case .west:  return .east
        }
    }
}

// Reference type: class — use for shared mutable state, identity, ObjC interop
final class UserSession {
    private(set) var currentUser: User?
    private(set) var isAuthenticated = false

    func login(user: User) {
        currentUser = user
        isAuthenticated = true
    }
}

// Rule of thumb:
// Struct: data, models, DTOs, view models (no identity)
// Class:  services, managers, delegates, ObjC types (identity matters)
```

## Protocols

### Defining and Conforming

```swift
// Define behavior contracts
protocol Repository {
    associatedtype Entity
    associatedtype ID

    func findById(_ id: ID) async throws -> Entity?
    func save(_ entity: Entity) async throws -> Entity
    func delete(id: ID) async throws
}

// Protocol with default implementation
protocol Loggable {
    var logDescription: String { get }
}

extension Loggable {
    func log() {
        print("[\(type(of: self))] \(logDescription)")
    }
}

// Conformance
struct User: Loggable {
    let id: UUID
    var name: String
    var email: String

    var logDescription: String {
        "User(id: \(id), name: \(name))"
    }
}
```

### Protocol Composition

```swift
// Compose multiple protocols with &
typealias Identifiable = Hashable & CustomStringConvertible

protocol Persistable: Codable, Identifiable {}

// Protocol as parameter type
func logAll(_ items: [any Loggable]) {
    items.forEach { $0.log() }
}
```

### Existentials vs Generics

```swift
// Generic (preferred — static dispatch, better performance)
func processAll<T: Persistable>(_ items: [T]) {
    for item in items { save(item) }
}

// Existential (any) — use when type varies at runtime
func processHeterogeneous(_ items: [any Persistable]) {
    for item in items { save(item) }
}

// some — opaque return type (hides concrete type, keeps static dispatch)
func makeValidator() -> some Validator {
    EmailValidator()  // Caller knows it's Validator, not EmailValidator
}
```

## Generics

```swift
// Generic function
func first<T>(_ array: [T], where predicate: (T) -> Bool) -> T? {
    array.first(where: predicate)
}

// Generic type with constraint
struct Stack<Element> {
    private var storage: [Element] = []

    mutating func push(_ element: Element) {
        storage.append(element)
    }

    mutating func pop() -> Element? {
        storage.popLast()
    }

    var top: Element? { storage.last }
    var isEmpty: Bool { storage.isEmpty }
}

// Where clauses
extension Stack where Element: Equatable {
    func contains(_ element: Element) -> Bool {
        storage.contains(element)
    }
}

// Generic with multiple constraints
func merge<T: Hashable & Comparable>(_ a: Set<T>, _ b: Set<T>) -> [T] {
    a.union(b).sorted()
}
```

## Optionals

```swift
// NEVER use force unwrap (!) in production code
// Use these safe alternatives instead:

// 1. Optional binding
if let user = findUser(id: userId) {
    greet(user)
}

// 2. Guard — early exit pattern
func processOrder(userId: String) throws {
    guard let user = findUser(id: userId) else {
        throw AppError.userNotFound(userId)
    }
    guard user.isActive else {
        throw AppError.accountInactive
    }
    // user is non-optional here
}

// 3. nil coalescing — provide default
let displayName = user.nickname ?? user.name

// 4. Optional chaining — propagate nil
let city = user.address?.city?.uppercased()

// 5. compactMap — filter and unwrap in collections
let validEmails = users.compactMap { $0.email }

// 6. map on Optional — transform if present
let uppercased: String? = optionalString.map { $0.uppercased() }
```

## Error Handling

```swift
// Typed errors with enum
enum NetworkError: Error {
    case noConnection
    case timeout(after: TimeInterval)
    case httpError(statusCode: Int, body: Data?)
    case decodingFailed(reason: String)
}

// Throwing function
func fetchUser(id: UUID) async throws -> User {
    let url = URL(string: "/api/users/\(id)")!
    let (data, response) = try await URLSession.shared.data(from: url)

    guard let http = response as? HTTPURLResponse else {
        throw NetworkError.noConnection
    }
    guard http.statusCode == 200 else {
        throw NetworkError.httpError(statusCode: http.statusCode, body: data)
    }

    do {
        return try JSONDecoder().decode(User.self, from: data)
    } catch {
        throw NetworkError.decodingFailed(reason: error.localizedDescription)
    }
}

// Consuming errors
func loadUser(id: UUID) async {
    do {
        let user = try await fetchUser(id: id)
        display(user)
    } catch NetworkError.noConnection {
        showOfflineMessage()
    } catch NetworkError.httpError(let code, _) where code == 404 {
        showNotFound()
    } catch {
        showGenericError(error)
    }
}
```

## Result Type

Use `Result<Success, Failure>` for synchronous operations where error is expected:

```swift
// Return Result instead of throwing for non-async code
func parseEmail(_ raw: String) -> Result<Email, ValidationError> {
    guard raw.contains("@") else {
        return .failure(.invalidFormat("Missing @ symbol"))
    }
    guard !raw.hasPrefix("@") else {
        return .failure(.invalidFormat("Missing local part"))
    }
    return .success(Email(raw: raw))
}

// Use Result combinators
let result = parseEmail(input)
    .map { email in email.normalized }          // transform success
    .mapError { err in UserFacingError(err) }  // transform failure

// Pattern match
switch result {
case .success(let email): sendWelcome(to: email)
case .failure(let error): showError(error)
}

// get() throws on failure
let email = try parseEmail(input).get()
```

## Codable

```swift
// Automatic synthesis — property names match JSON keys
struct Product: Codable {
    let id: UUID
    let name: String
    let price: Decimal
    let isAvailable: Bool
}

// Custom keys with CodingKeys
struct APIUser: Codable {
    let id: Int
    let fullName: String
    let emailAddress: String

    enum CodingKeys: String, CodingKey {
        case id
        case fullName    = "full_name"
        case emailAddress = "email"
    }
}

// Custom date decoding
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .iso8601
decoder.keyDecodingStrategy  = .convertFromSnakeCase  // snake_case → camelCase

let encoder = JSONEncoder()
encoder.dateEncodingStrategy = .iso8601
encoder.keyEncodingStrategy  = .convertToSnakeCase

// Decode
let user = try decoder.decode(APIUser.self, from: data)

// Encode
let json = try encoder.encode(user)
```

## Module Organization

```
Sources/
  MyApp/
    Domain/          # Pure types, no frameworks
      User.swift
      Order.swift
      Errors.swift
    Application/     # Use cases — depends only on Domain
      UserService.swift
      OrderService.swift
    Infrastructure/  # Adapters (URLSession, CoreData, etc.)
      NetworkClient.swift
      UserRepository.swift
    Presentation/    # ViewModels, UI adapters
      UserViewModel.swift

Tests/
  MyAppTests/
    Domain/
      UserTests.swift
    Application/
      UserServiceTests.swift
```

## Access Control

```swift
// Minimal visibility — expose only what callers need
public struct UserService {
    private let repository: any UserRepository  // hidden
    private let mailer: any Mailer

    // Public initializer
    public init(repository: any UserRepository, mailer: any Mailer) {
        self.repository = repository
        self.mailer = mailer
    }

    // Public methods
    public func register(name: String, email: String) async throws -> User { ... }

    // Internal helper
    func validateEmail(_ email: String) throws { ... }
}

// private(set) — readable externally, writable internally
public struct Order {
    public private(set) var status: OrderStatus = .pending

    public mutating func confirm() throws {
        guard status == .pending else { throw OrderError.invalidTransition }
        status = .confirmed
    }
}
```

## Quick Reference

| Feature | Use case |
|---------|----------|
| `struct` | Data, models, DTOs — value semantics |
| `class` | Shared state, identity, ObjC interop |
| `final class` | Class that won't be subclassed (preferred) |
| `protocol` | Define behavior contracts |
| `some Protocol` | Opaque return type (hides concrete type) |
| `any Protocol` | Existential (heterogeneous collections) |
| `guard let` | Early exit on nil/error |
| `??` | Nil coalescing default |
| `Result<T, E>` | Sync operations with expected errors |
| `throws` | Propagate unexpected errors |
| `Codable` | JSON encode/decode |
| `private(set)` | Read-only outside, writable inside |

## Anti-Patterns

### Force Unwrapping Optionals in Production Code

**Wrong:**
```swift
func displayUser(id: String) {
    let user = findUser(id: id)!  // crashes at runtime if nil
    label.text = user.name
}
```

**Correct:**
```swift
func displayUser(id: String) {
    guard let user = findUser(id: id) else {
        showError("User not found")
        return
    }
    label.text = user.name
}
```

**Why:** Force unwrapping silently propagates assumptions; `guard let` makes the nil case explicit and recoverable.

### Using Class When Struct Suffices

**Wrong:**
```swift
class Point {          // heap allocation, reference semantics, thread-unsafe by default
    var x: Double
    var y: Double
    init(x: Double, y: Double) { self.x = x; self.y = y }
}
```

**Correct:**
```swift
struct Point {         // stack allocation, value semantics, naturally thread-safe
    var x: Double
    var y: Double
}
```

**Why:** Classes carry reference semantics and shared-mutability risks; use structs for data without identity.

### Catching All Errors with a Bare `catch`

**Wrong:**
```swift
func loadProfile() async {
    do {
        let profile = try await fetchProfile()
        display(profile)
    } catch {
        // swallows everything — NetworkError, DecodingError, CancellationError all look the same
        showGenericError()
    }
}
```

**Correct:**
```swift
func loadProfile() async {
    do {
        let profile = try await fetchProfile()
        display(profile)
    } catch NetworkError.noConnection {
        showOfflineBanner()
    } catch NetworkError.httpError(let code, _) where code == 401 {
        redirectToLogin()
    } catch {
        showGenericError(error)
    }
}
```

**Why:** A bare `catch` collapses typed error information and makes distinct failure modes indistinguishable to callers.

### Existential `any Protocol` Where Generic `<T: Protocol>` Is Better

**Wrong:**
```swift
func processItems(_ items: [any Persistable]) {
    // dynamic dispatch on every call, box allocation per element
    for item in items { save(item) }
}
```

**Correct:**
```swift
func processItems<T: Persistable>(_ items: [T]) {
    // static dispatch, no boxing, inlineable
    for item in items { save(item) }
}
```

**Why:** Existentials (`any`) incur heap allocation and dynamic dispatch; prefer generics when the concrete type is uniform at the call site.

### Exposing Mutable State Publicly

**Wrong:**
```swift
public struct Order {
    public var status: OrderStatus = .pending  // callers can set any status directly
}
```

**Correct:**
```swift
public struct Order {
    public private(set) var status: OrderStatus = .pending

    public mutating func confirm() throws {
        guard status == .pending else { throw OrderError.invalidTransition }
        status = .confirmed
    }
}
```

**Why:** Public mutable properties let callers bypass business rules; `private(set)` with mutating methods enforces invariants at compile time.

> For advanced Swift — property wrappers, result builders, Combine, opaque/existential types, advanced protocol patterns, and performance optimization — see skill: `swift-patterns-advanced`.

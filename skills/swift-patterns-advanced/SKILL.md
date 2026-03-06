---
name: swift-patterns-advanced
description: Advanced Swift patterns — property wrappers, result builders, Combine basics, opaque & existential types, macro system, advanced generics, and performance optimization. Extends swift-patterns.
origin: ECC
---

# Swift Patterns — Advanced

> This skill extends [swift-patterns](../swift-patterns/SKILL.md) with property wrappers, result builders, Combine, macros, and advanced type system features.

## When to Activate

- Building custom property wrappers for reusable cross-cutting concerns
- Using result builders for DSLs (like SwiftUI's ViewBuilder)
- Setting up Combine pipelines for reactive data flow
- Optimizing performance with inlining and value type semantics

## Property Wrappers

Encapsulate storage and access patterns for properties:

```swift
// Clamped value — enforce min/max bounds
@propertyWrapper
struct Clamped<Value: Comparable> {
    var wrappedValue: Value {
        didSet { wrappedValue = min(max(wrappedValue, minimum), maximum) }
    }
    let minimum: Value
    let maximum: Value

    init(wrappedValue: Value, _ range: ClosedRange<Value>) {
        self.minimum = range.lowerBound
        self.maximum = range.upperBound
        self.wrappedValue = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }
}

struct Player {
    @Clamped(0...100) var health: Int = 100
    @Clamped(0...10)  var level: Int = 1
}

var player = Player()
player.health = 150  // Clamped to 100
player.health = -5   // Clamped to 0

// UserDefaults wrapper
@propertyWrapper
struct UserDefault<T> {
    let key: String
    let defaultValue: T

    var wrappedValue: T {
        get { UserDefaults.standard.object(forKey: key) as? T ?? defaultValue }
        set { UserDefaults.standard.set(newValue, forKey: key) }
    }
}

struct Settings {
    @UserDefault(key: "theme", defaultValue: "system")
    var theme: String

    @UserDefault(key: "notifications_enabled", defaultValue: true)
    var notificationsEnabled: Bool
}
```

### projectedValue (the `$` syntax)

```swift
@propertyWrapper
struct Validated<T> {
    private(set) var projectedValue: Bool = false  // $name → isValid
    var wrappedValue: T {
        didSet { validate() }
    }
    private let validator: (T) -> Bool

    init(wrappedValue: T, _ validator: @escaping (T) -> Bool) {
        self.wrappedValue = wrappedValue
        self.validator = validator
        validate()
    }

    private mutating func validate() {
        projectedValue = validator(wrappedValue)
    }
}

struct Form {
    @Validated({ !$0.isEmpty && $0.contains("@") })
    var email: String = ""
}

var form = Form()
form.email = "alice@example.com"
print(form.$email)  // true — accesses projectedValue
```

## Result Builders

Build DSLs with Swift's `@resultBuilder`:

```swift
@resultBuilder
struct HTMLBuilder {
    static func buildBlock(_ components: String...) -> String {
        components.joined(separator: "\n")
    }

    static func buildOptional(_ component: String?) -> String {
        component ?? ""
    }

    static func buildEither(first component: String) -> String { component }
    static func buildEither(second component: String) -> String { component }

    static func buildArray(_ components: [String]) -> String {
        components.joined(separator: "\n")
    }
}

func div(@HTMLBuilder content: () -> String) -> String {
    "<div>\n\(content())\n</div>"
}

func p(_ text: String) -> String { "<p>\(text)</p>" }

// DSL usage
let html = div {
    p("Hello, world!")
    p("Swift result builders are powerful")
    if showFooter {
        p("Footer text")
    }
}
```

## Combine Basics

Combine is Apple's reactive framework for processing asynchronous events over time:

```swift
import Combine

// Publisher chain
let cancellable = URLSession.shared
    .dataTaskPublisher(for: url)
    .map(\.data)
    .decode(type: [User].self, decoder: JSONDecoder())
    .receive(on: DispatchQueue.main)
    .sink(
        receiveCompletion: { completion in
            if case .failure(let error) = completion {
                print("Error: \(error)")
            }
        },
        receiveValue: { users in
            self.users = users
        }
    )

// Subject — programmatically send values
let subject = PassthroughSubject<String, Never>()
subject.send("hello")
subject.send(completion: .finished)

// CurrentValueSubject — holds current value
let currentValue = CurrentValueSubject<Int, Never>(0)
currentValue.value = 42

// Common operators
let processed = publisher
    .filter { $0 > 0 }
    .map { $0 * 2 }
    .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
    .removeDuplicates()
    .eraseToAnyPublisher()

// Combine multiple publishers
let combined = Publishers.CombineLatest(namePublisher, emailPublisher)
    .map { name, email in "\(name) <\(email)>" }
```

## Opaque Types vs Existentials

Swift 5.7+ has clear semantics for `some` and `any`:

```swift
protocol Shape {
    func area() -> Double
}

// some: opaque return — callers get static dispatch, compiler knows concrete type
func makeCircle(radius: Double) -> some Shape {
    Circle(radius: radius)
}

// any: existential — runtime type erasure, heterogeneous collections
func largestShape(from shapes: [any Shape]) -> (any Shape)? {
    shapes.max(by: { $0.area() < $1.area() })
}

// Primary associated types (Swift 5.7+)
protocol Collection<Element> {
    associatedtype Element
}

// Use primary associated type constraints
func printAll(_ collection: some Collection<String>) { ... }
func findFirst(_ collection: any Collection<String>, where pred: (String) -> Bool) -> String? { ... }
```

## Advanced Generics

```swift
// Conditional conformance
extension Array: Equatable where Element: Equatable {
    static func == (lhs: Array, rhs: Array) -> Bool {
        guard lhs.count == rhs.count else { return false }
        return zip(lhs, rhs).allSatisfy(==)
    }
}

// Generic subscript
extension Dictionary {
    subscript<T>(key: Key, as type: T.Type) -> T? {
        self[key] as? T
    }
}

// Type erasure pattern (manual, before Swift 5.7 existentials)
struct AnyRepository<Entity, ID>: Repository {
    private let _findById: (ID) async throws -> Entity?
    private let _save: (Entity) async throws -> Entity

    init<R: Repository>(_ repo: R) where R.Entity == Entity, R.ID == ID {
        _findById = repo.findById
        _save = repo.save
    }

    func findById(_ id: ID) async throws -> Entity? { try await _findById(id) }
    func save(_ entity: Entity) async throws -> Entity { try await _save(entity) }
}
```

## Swift Macros (Swift 5.9+)

```swift
// Attached macros — add functionality to declarations
@Model  // SwiftData macro generates persistence code
class User {
    var name: String
    var email: String
    var createdAt: Date
}

// Freestanding expression macros
let id = #UUID()  // Generates UUID at compile time

// Common built-in macros
#warning("Fix this before shipping")
#error("This platform is not supported")
let file = #fileID
let line = #line

// Using Observable macro (replaces ObservableObject)
@Observable
class ViewModel {
    var users: [User] = []  // Automatically observed
    var isLoading = false
}
```

## Performance Optimization

### Avoid Unnecessary Heap Allocations

```swift
// Prefer structs over classes for value types (stack allocated)
struct Point { var x, y: Double }  // Stack — zero heap overhead
class PointRef { var x, y: Double = 0 }  // Heap allocation

// Copy-on-write for value types with large storage
struct LargeData {
    private class Storage {
        var data: [UInt8]
        init(_ data: [UInt8]) { self.data = data }
    }

    private var storage: Storage

    mutating func append(_ byte: UInt8) {
        if !isKnownUniquelyReferenced(&storage) {
            storage = Storage(storage.data)  // Copy only when needed
        }
        storage.data.append(byte)
    }
}
```

### @inline and @inlinable

```swift
// @inlinable: expose implementation for cross-module inlining
@inlinable
public func clamp<T: Comparable>(_ value: T, to range: ClosedRange<T>) -> T {
    min(max(value, range.lowerBound), range.upperBound)
}

// @inline(__always): force inline even when compiler wouldn't
@inline(__always)
func fastAdd(_ a: Int, _ b: Int) -> Int { a + b }
```

### Reduce Existential Overhead

```swift
// SLOW: any Protocol — boxes value, adds indirection
func slow(items: [any Drawable]) {
    items.forEach { $0.draw() }  // Dynamic dispatch per call
}

// FAST: generic — static dispatch, inlinable
func fast<D: Drawable>(items: [D]) {
    items.forEach { $0.draw() }  // Direct dispatch, no boxing
}
```

## Concurrency Integration

See [swift-concurrency-6-2](../swift-concurrency-6-2/SKILL.md) for full async/await and Actor patterns.

```swift
// Structured concurrency with task groups
func fetchAll(ids: [UUID]) async throws -> [User] {
    try await withThrowingTaskGroup(of: User.self) { group in
        for id in ids {
            group.addTask { try await fetchUser(id: id) }
        }
        return try await group.reduce(into: []) { $0.append($1) }
    }
}

// Sendable for type-safe concurrency
struct UserDTO: Sendable {  // Safe to send across actors
    let id: UUID
    let name: String
}
```

## Quick Reference

| Feature | Usage |
|---------|-------|
| `@propertyWrapper` | Reusable storage logic (clamping, persistence, validation) |
| `projectedValue` | The `$property` accessor on property wrappers |
| `@resultBuilder` | DSL syntax (ViewBuilder, custom builders) |
| `some T` | Opaque type — static dispatch, hides concrete type |
| `any T` | Existential — runtime type erasure, heterogeneous |
| `@Observable` | SwiftUI observation (replaces `@Published`/`ObservableObject`) |
| `#UUID()` | Freestanding expression macro |
| `@inlinable` | Cross-module inlining for performance-critical code |
| `isKnownUniquelyReferenced` | Implement copy-on-write in value types |
| `withThrowingTaskGroup` | Structured concurrency for parallel async work |

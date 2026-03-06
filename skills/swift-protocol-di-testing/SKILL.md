---
name: swift-protocol-di-testing
description: Protocol-based dependency injection for testable Swift code — mock file system, network, and external APIs using focused protocols and Swift Testing.
---

# Swift Protocol-Based Dependency Injection for Testing

Patterns for making Swift code testable by abstracting external dependencies (file system, network, iCloud) behind small, focused protocols. Enables deterministic tests without I/O.

## When to Activate

- Writing Swift code that accesses file system, network, or external APIs
- Need to test error handling paths without triggering real failures
- Building modules that work across environments (app, test, SwiftUI preview)
- Designing testable architecture with Swift concurrency (actors, Sendable)

## Core Pattern

### 1. Define Small, Focused Protocols

Each protocol handles exactly one external concern.

```swift
// File system access
public protocol FileSystemProviding: Sendable {
    func containerURL(for purpose: Purpose) -> URL?
}

// File read/write operations
public protocol FileAccessorProviding: Sendable {
    func read(from url: URL) throws -> Data
    func write(_ data: Data, to url: URL) throws
    func fileExists(at url: URL) -> Bool
}

// Bookmark storage (e.g., for sandboxed apps)
public protocol BookmarkStorageProviding: Sendable {
    func saveBookmark(_ data: Data, for key: String) throws
    func loadBookmark(for key: String) throws -> Data?
}
```

### 2. Create Default (Production) Implementations

```swift
public struct DefaultFileSystemProvider: FileSystemProviding {
    public init() {}

    public func containerURL(for purpose: Purpose) -> URL? {
        FileManager.default.url(forUbiquityContainerIdentifier: nil)
    }
}

public struct DefaultFileAccessor: FileAccessorProviding {
    public init() {}

    public func read(from url: URL) throws -> Data {
        try Data(contentsOf: url)
    }

    public func write(_ data: Data, to url: URL) throws {
        try data.write(to: url, options: .atomic)
    }

    public func fileExists(at url: URL) -> Bool {
        FileManager.default.fileExists(atPath: url.path)
    }
}
```

### 3. Create Mock Implementations for Testing

```swift
public final class MockFileAccessor: FileAccessorProviding, @unchecked Sendable {
    public var files: [URL: Data] = [:]
    public var readError: Error?
    public var writeError: Error?

    public init() {}

    public func read(from url: URL) throws -> Data {
        if let error = readError { throw error }
        guard let data = files[url] else {
            throw CocoaError(.fileReadNoSuchFile)
        }
        return data
    }

    public func write(_ data: Data, to url: URL) throws {
        if let error = writeError { throw error }
        files[url] = data
    }

    public func fileExists(at url: URL) -> Bool {
        files[url] != nil
    }
}
```

### 4. Inject Dependencies with Default Parameters

Production code uses defaults; tests inject mocks.

```swift
public actor SyncManager {
    private let fileSystem: FileSystemProviding
    private let fileAccessor: FileAccessorProviding

    public init(
        fileSystem: FileSystemProviding = DefaultFileSystemProvider(),
        fileAccessor: FileAccessorProviding = DefaultFileAccessor()
    ) {
        self.fileSystem = fileSystem
        self.fileAccessor = fileAccessor
    }

    public func sync() async throws {
        guard let containerURL = fileSystem.containerURL(for: .sync) else {
            throw SyncError.containerNotAvailable
        }
        let data = try fileAccessor.read(
            from: containerURL.appendingPathComponent("data.json")
        )
        // Process data...
    }
}
```

### 5. Write Tests with Swift Testing

```swift
import Testing

@Test("Sync manager handles missing container")
func testMissingContainer() async {
    let mockFileSystem = MockFileSystemProvider(containerURL: nil)
    let manager = SyncManager(fileSystem: mockFileSystem)

    await #expect(throws: SyncError.containerNotAvailable) {
        try await manager.sync()
    }
}

@Test("Sync manager reads data correctly")
func testReadData() async throws {
    let mockFileAccessor = MockFileAccessor()
    mockFileAccessor.files[testURL] = testData

    let manager = SyncManager(fileAccessor: mockFileAccessor)
    let result = try await manager.loadData()

    #expect(result == expectedData)
}

@Test("Sync manager handles read errors gracefully")
func testReadError() async {
    let mockFileAccessor = MockFileAccessor()
    mockFileAccessor.readError = CocoaError(.fileReadCorruptFile)

    let manager = SyncManager(fileAccessor: mockFileAccessor)

    await #expect(throws: SyncError.self) {
        try await manager.sync()
    }
}
```

## Best Practices

- **Single Responsibility**: Each protocol should handle one concern — don't create "god protocols" with many methods
- **Sendable conformance**: Required when protocols are used across actor boundaries
- **Default parameters**: Let production code use real implementations by default; only tests need to specify mocks
- **Error simulation**: Design mocks with configurable error properties for testing failure paths
- **Only mock boundaries**: Mock external dependencies (file system, network, APIs), not internal types

## Anti-Patterns to Avoid

- Creating a single large protocol that covers all external access
- Mocking internal types that have no external dependencies
- Using `#if DEBUG` conditionals instead of proper dependency injection
- Forgetting `Sendable` conformance when used with actors
- Over-engineering: if a type has no external dependencies, it doesn't need a protocol

## When to Use

- Any Swift code that touches file system, network, or external APIs
- Testing error handling paths that are hard to trigger in real environments
- Building modules that need to work in app, test, and SwiftUI preview contexts
- Apps using Swift concurrency (actors, structured concurrency) that need testable architecture

## This IS Hexagonal Architecture

The patterns in this skill are hexagonal (ports & adapters) and DDD — just in Swift idioms:

| Swift Pattern | Hexagonal / DDD Concept |
|---|---|
| Small, focused `protocol` (e.g., `FileAccessorProviding`) | Output Port — defines what the domain needs |
| `DefaultFileAccessor` (real implementation) | Outbound Adapter — production implementation |
| `MockFileAccessor` (test implementation) | Test Adapter — injected in tests |
| `actor SyncManager` (injects protocols) | Use Case / Application Service — orchestrates domain + ports |
| Domain `struct` with `let` properties | Value Object — immutable, no framework imports |
| Domain function `throws` domain errors | Domain behavior enforcing invariants |

### Full Hexagonal Example — Domain + Use Case + Adapters

```swift
// MARK: — Domain (no imports from UIKit, Foundation networking, SwiftData)

struct Market: Identifiable, Sendable {
    let id: UUID
    let name: String
    let slug: String
    let status: MarketStatus
}

enum MarketStatus: String, Sendable { case draft, active }

enum MarketError: Error {
    case invalidName, alreadyPublished(String)
}

func createMarket(name: String, slug: String) throws -> Market {
    guard !name.trimmingCharacters(in: .whitespaces).isEmpty else {
        throw MarketError.invalidName
    }
    return Market(id: UUID(), name: name, slug: slug, status: .draft)
}

func publishMarket(_ market: Market) throws -> Market {
    guard market.status == .draft else { throw MarketError.alreadyPublished(market.slug) }
    return Market(id: market.id, name: market.name, slug: market.slug, status: .active)
}

// MARK: — Output Port (defined in domain)

protocol MarketRepository: Sendable {
    func save(_ market: Market) async throws -> Market
    func findBySlug(_ slug: String) async throws -> Market?
}

// MARK: — Use Case (depends only on port interface)

actor CreateMarketUseCase {
    private let repository: any MarketRepository

    init(repository: any MarketRepository) {  // inject output port
        self.repository = repository
    }

    func execute(name: String, slug: String) async throws -> Market {
        let market = try createMarket(name: name, slug: slug)  // domain logic
        return try await repository.save(market)               // via port
    }
}

// MARK: — Outbound Adapter (production implementation)

actor CoreDataMarketRepository: MarketRepository {
    // ... CoreData implementation, satisfies MarketRepository implicitly
}

// MARK: — Test Adapter (injected in tests)

final class MockMarketRepository: MarketRepository, @unchecked Sendable {
    var saved: [Market] = []
    func save(_ market: Market) async throws -> Market {
        saved.append(market)
        return market
    }
    func findBySlug(_ slug: String) async throws -> Market? { nil }
}

// MARK: — Test

@Test("CreateMarketUseCase saves a valid market")
func testCreateMarket() async throws {
    let repo = MockMarketRepository()
    let useCase = CreateMarketUseCase(repository: repo)

    let market = try await useCase.execute(name: "Test", slug: "test")

    #expect(market.name == "Test")
    #expect(repo.saved.count == 1)
}

@Test("CreateMarketUseCase rejects blank name")
func testBlankName() async {
    let useCase = CreateMarketUseCase(repository: MockMarketRepository())
    await #expect(throws: MarketError.self) {
        try await useCase.execute(name: "", slug: "slug")
    }
}
```

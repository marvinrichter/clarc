---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Swift specific content.

## Hexagonal Architecture in Swift — Mapping

Swift's core language features ARE hexagonal (ports & adapters) and DDD patterns:

| Swift Feature | Hexagonal / DDD Concept |
|---|---|
| `protocol` | Port (input or output) — both inbound and outbound |
| `struct` (let properties) | Value Object — immutable, equality by value |
| `actor` | Aggregate Root — serialized access enforces invariants at compile time |
| Protocol-based DI with default params | Adapter injection — production adapter is default, test adapter is injected |
| `enum` with associated values | Domain state modeling (e.g., `MarketStatus.suspended(reason:)`) |

## Domain Model — Structs with Behavior

Domain types are structs with `let` properties. Behavior functions return new values — no mutation:

```swift
// Domain/Market.swift — zero UIKit/SwiftUI/Foundation networking imports
struct Market: Identifiable, Sendable {
    let id: UUID
    let name: String
    let slug: String
    let status: MarketStatus
}

enum MarketStatus: String, Sendable {
    case draft, active, suspended
}

enum MarketError: Error {
    case invalidName
    case alreadyPublished(slug: String)
}

func createMarket(name: String, slug: String) throws -> Market {
    guard !name.trimmingCharacters(in: .whitespaces).isEmpty else {
        throw MarketError.invalidName
    }
    return Market(id: UUID(), name: name, slug: slug, status: .draft)
}

func publishMarket(_ market: Market) throws -> Market {
    guard market.status == .draft else {
        throw MarketError.alreadyPublished(slug: market.slug)
    }
    return Market(id: market.id, name: market.name, slug: market.slug, status: .active)
}
```

## Protocol-Oriented Design (Output Ports)

Define small, focused protocols. Use protocol extensions for shared defaults:

```swift
// Domain/Ports/MarketRepository.swift — output port
protocol MarketRepository: Sendable {
    func save(_ market: Market) async throws -> Market
    func findBySlug(_ slug: String) async throws -> Market?
    func findAll(status: MarketStatus?) async throws -> [Market]
}
```

## Actor as Aggregate Root (Output Port Adapter)

Use actors for shared mutable state — the actor boundary IS the aggregate boundary:

```swift
// Adapters/Persistence/InMemoryMarketRepository.swift
actor InMemoryMarketRepository: MarketRepository {
    private var storage: [String: Market] = [:]

    func save(_ market: Market) async throws -> Market {
        storage[market.slug] = market
        return market
    }

    func findBySlug(_ slug: String) async throws -> Market? {
        storage[slug]
    }

    func findAll(status: MarketStatus?) async throws -> [Market] {
        let all = Array(storage.values)
        guard let status else { return all }
        return all.filter { $0.status == status }
    }
}
```

## Value Types for Typed IDs

```swift
struct MarketID: Hashable, Sendable {
    let rawValue: UUID
    init() { rawValue = UUID() }
    init(_ value: UUID) { rawValue = value }
}
```

## Dependency Injection (Adapter Injection)

Inject protocols with default parameters — production uses defaults, tests inject mocks:

```swift
// Application/CreateMarketUseCase.swift
struct CreateMarketUseCase {
    private let repository: any MarketRepository  // output port

    init(repository: any MarketRepository = CoreDataMarketRepository()) {
        self.repository = repository
    }

    func execute(name: String, slug: String) async throws -> Market {
        let market = try createMarket(name: name, slug: slug)  // domain function
        return try await repository.save(market)
    }
}
```

## References

See skill: `swift-actor-persistence` for actor-based persistence patterns.
See skill: `swift-protocol-di-testing` for protocol-based DI and testing (this IS hexagonal in Swift).

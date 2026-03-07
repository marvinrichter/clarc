---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Patterns

> This file extends [common/patterns.md](../common/patterns.md) with TypeScript/JavaScript specific content.

## API Response Format

Follow the standard defined in [common/patterns.md](../common/patterns.md):

- **Success**: `{ "data": <payload>, "meta": { "total": N, "page": N, "limit": N } }` envelope pattern
- **Errors**: RFC 7807 `application/problem+json` — use `{ type, title, status, detail, instance }`

Never use `{ success: boolean, error: string }` — this pattern is explicitly prohibited by the common standard.

For TypeScript implementation examples, see skill: `nodejs-backend-patterns`.

## Custom Hooks Pattern

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

## Hexagonal Architecture (Ports & Adapters)

For backend services, use hexagonal structure. Dependency arrows point inward toward domain:

```
src/
  domain/
    model/      # Pure TypeScript types + behavior functions (no imports from node_modules)
    port/
      in/       # Use case interfaces (e.g., CreateMarketUseCase.ts)
      out/      # Repository/service interfaces (e.g., MarketRepository.ts)
    event/      # Domain event types
  application/
    usecase/    # Use case implementations (depend on port interfaces only)
  adapter/
    in/http/    # HTTP handlers + Zod validation (depend on input port interfaces)
    out/        # Persistence/client adapters (implement output port interfaces)
  config/       # DI wiring only — no business logic
```

Key rules:
- `domain/` has zero imports from `node_modules` (except type-only utility imports)
- Use cases import from `domain/port/out/` interfaces, never from `adapter/`
- HTTP handlers call input port interfaces, never use case classes directly
- Validation (Zod) lives in `adapter/in/`, never in `domain/`

See skill: `hexagonal-typescript` for full reference.

## Output Port Pattern (Repository)

```typescript
// domain/port/out/MarketRepository.ts — output port interface
interface MarketRepository {
  save(market: Market): Promise<Market>
  findBySlug(slug: string): Promise<Market | null>
  findAll(status?: MarketStatus, limit?: number, offset?: number): Promise<Market[]>
}

// adapter/out/persistence/PrismaMarketRepository.ts — outbound adapter
class PrismaMarketRepository implements MarketRepository {
  constructor(private readonly prisma: PrismaClient) {}
  // ... maps Prisma rows ↔ domain types
}
```

## Use Case Pattern

```typescript
// domain/port/in/CreateMarketUseCase.ts — input port
interface CreateMarketUseCase {
  execute(command: { name: string; slug: string }): Promise<Market>
}

// application/usecase/CreateMarketService.ts — use case implementation
class CreateMarketService implements CreateMarketUseCase {
  constructor(
    private readonly marketRepository: MarketRepository,  // output port
  ) {}

  async execute(command: { name: string; slug: string }): Promise<Market> {
    const market = createMarket(command.name, command.slug)  // domain function
    return this.marketRepository.save(market)
  }
}
```

---
name: hexagonal-typescript-advanced
description: Advanced Hexagonal Architecture anti-patterns for TypeScript — domain importing framework dependencies, use cases depending on concrete adapters, HTTP handlers bypassing use cases, Zod validation inside the domain model. Each anti-pattern includes wrong/correct comparison with explanation.
---

# Hexagonal TypeScript — Anti-Patterns

This skill extends `hexagonal-typescript` with common violations and how to fix them. Load `hexagonal-typescript` first.

## When to Activate

- Reviewing code where domain classes import `typeorm`, `@nestjs/common`, or other framework packages
- Use case constructors receive concrete adapter classes instead of port interfaces
- HTTP handlers call repositories directly, skipping the use case layer
- Domain models contain Zod schemas or other validation library dependencies
- Auditing a codebase for dependency direction violations

---

## Anti-Patterns

### Domain Model Importing Framework Dependencies

**Wrong:**

```typescript
// domain/model/market.ts
import { Entity, Column } from 'typeorm'  // ORM leaks into domain
import { Injectable } from '@nestjs/common'

@Entity()
@Injectable()
export class Market {
  @Column() name: string
}
```

**Correct:**

```typescript
// domain/model/market.ts
// No framework imports — pure TypeScript only
export interface Market {
  readonly id: MarketId | null
  readonly name: string
  readonly status: MarketStatus
}
```

**Why:** Framework annotations in the domain couple your business logic to infrastructure, making it impossible to test without starting the full framework.

---

### Use Case Depending on the Concrete Adapter

**Wrong:**

```typescript
// application/usecase/CreateMarketService.ts
import { PrismaMarketRepository } from '../../adapter/out/persistence/PrismaMarketRepository'

export class CreateMarketService {
  constructor(private readonly repo: PrismaMarketRepository) {}  // concrete class
}
```

**Correct:**

```typescript
// application/usecase/CreateMarketService.ts
import type { MarketRepository } from '../../domain/port/out/MarketRepository'

export class CreateMarketService {
  constructor(private readonly repo: MarketRepository) {}  // port interface
}
```

**Why:** Depending on the concrete adapter prevents swapping implementations and forces integration tests even for pure business logic.

---

### HTTP Handler Calling the Repository Directly

**Wrong:**

```typescript
// adapter/in/http/createMarketHandler.ts
import { PrismaMarketRepository } from '../../out/persistence/PrismaMarketRepository'

export function createMarketHandler(repo: PrismaMarketRepository) {
  return async (req, res) => {
    const market = await repo.save({ name: req.body.name })  // skips use case
    res.status(201).json(market)
  }
}
```

**Correct:**

```typescript
// adapter/in/http/createMarketHandler.ts
import type { CreateMarketUseCase } from '../../../domain/port/in/CreateMarketUseCase'

export function createMarketHandler(createMarket: CreateMarketUseCase) {
  return async (req, res, next) => {
    const market = await createMarket.execute(req.body)
    res.status(201).json(market)
  }
}
```

**Why:** Bypassing the use case skips business rule enforcement and breaks the inward dependency rule — adapters may only call ports, never each other.

---

### Zod Validation Inside the Domain Model

**Wrong:**

```typescript
// domain/model/market.ts
import { z } from 'zod'  // framework dependency inside domain

export const marketSchema = z.object({ name: z.string().min(1) })
export type Market = z.infer<typeof marketSchema>
```

**Correct:**

```typescript
// adapter/in/http/marketSchemas.ts  ← validation belongs in the inbound adapter
import { z } from 'zod'
export const createMarketSchema = z.object({ name: z.string().min(1).max(200) })

// domain/model/market.ts  ← domain enforces invariants through pure logic
export function createMarket(name: string): Market {
  if (!name || name.trim() === '') throw new InvalidMarketError('name is required')
  return { id: null, name: name.trim(), status: 'DRAFT' }
}
```

**Why:** Schema validation libraries belong in the inbound adapter layer; the domain owns business invariants through pure guard clauses, not library-specific schemas.

---

## Reference

- `hexagonal-typescript` — package structure, port definitions, use cases, adapter patterns, DI wiring, testing strategy
- `ddd-typescript` — Value Objects, Entities, Aggregates, Domain Events
- `typescript-patterns` — TypeScript idioms and advanced type patterns

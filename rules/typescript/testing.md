---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Testing

> This file extends [common/testing.md](../common/testing.md) with TypeScript/JavaScript specific content.

## Use Case Unit Tests

Test use cases by mocking output port interfaces — no DB, no HTTP:

```typescript
// application/usecase/CreateMarketService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { CreateMarketService } from './CreateMarketService'
import type { MarketRepository } from '../../domain/port/out/MarketRepository'

// Mock the output port interface (not the Prisma adapter)
const mockRepository: MarketRepository = {
  save: vi.fn().mockImplementation(async (m) => ({ ...m, id: 'market-1' })),
  findBySlug: vi.fn(),
  findAll: vi.fn(),
}

const service = new CreateMarketService(mockRepository)

describe('CreateMarketService', () => {
  it('saves market and returns it', async () => {
    const result = await service.execute({ name: 'Test', slug: 'test' })
    expect(result.name).toBe('Test')
    expect(mockRepository.save).toHaveBeenCalledOnce()
  })

  it('throws on blank name', async () => {
    await expect(service.execute({ name: '', slug: 'x' })).rejects.toThrow()
  })
})
```

## HTTP Adapter Tests

Test HTTP handlers by mocking the input port interface:

```typescript
// adapter/in/http/createMarketHandler.test.ts
import request from 'supertest'
import express from 'express'
import { vi } from 'vitest'
import { createMarketRouter } from './marketRouter'
import type { CreateMarketUseCase } from '../../../domain/port/in/CreateMarketUseCase'

const mockUseCase: CreateMarketUseCase = {
  execute: vi.fn().mockResolvedValue({ id: '1', name: 'Test', slug: 'test', status: 'DRAFT' }),
}

const app = express()
app.use(express.json())
app.use('/markets', createMarketRouter(mockUseCase))

it('returns 201 with valid input', async () => {
  const res = await request(app).post('/markets').send({ name: 'Test', slug: 'test' })
  expect(res.status).toBe(201)
})

it('returns 400 with invalid slug', async () => {
  const res = await request(app).post('/markets').send({ name: 'Test', slug: 'INVALID!' })
  expect(res.status).toBe(400)
})
```

## E2E Testing

Use **Playwright** as the E2E testing framework for critical user flows.

## Agent Support

- **e2e-runner** - Playwright E2E testing specialist
- **typescript-reviewer** - TypeScript backend code review with hexagonal/DDD checks

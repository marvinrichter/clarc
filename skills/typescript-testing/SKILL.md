---
name: typescript-testing
description: "TypeScript testing patterns: Vitest for unit/integration, Playwright for E2E, MSW for API mocking, Testing Library for React components. Core TDD methodology for TypeScript/JavaScript projects."
version: 1.0.0
---

# TypeScript Testing

Core testing patterns for TypeScript and JavaScript projects using Vitest, Testing Library, MSW, and Playwright.

## When to Activate

- Setting up a test suite for a TypeScript/JavaScript project
- Writing unit, integration, or component tests
- Configuring Vitest, Jest, or Playwright
- Mocking APIs with MSW
- Achieving 80%+ code coverage

## Framework Selection

| Use Case | Tool | Why |
|---|---|---|
| Unit + Integration | **Vitest** | Native ESM, fast, compatible with Vite projects |
| Unit + Integration (legacy) | **Jest** | Mature ecosystem, CJS/CommonJS projects |
| React component tests | **Testing Library** + Vitest | User-centric assertions |
| API mocking | **MSW** (Mock Service Worker) | Intercepts at network level, works in browser + Node |
| E2E | **Playwright** | See `e2e-testing` skill |

## Vitest Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node', // or 'jsdom' for browser APIs
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
      exclude: ['node_modules', 'dist', '**/*.d.ts', '**/*.config.*'],
    },
  },
})
```

## Unit Test Patterns

```typescript
// src/lib/format-price.test.ts
import { describe, it, expect } from 'vitest'
import { formatPrice } from './format-price'

describe('formatPrice', () => {
  it('formats USD correctly', () => {
    expect(formatPrice(1000, 'USD')).toBe('$10.00')
  })

  it('handles zero', () => {
    expect(formatPrice(0, 'USD')).toBe('$0.00')
  })

  it('throws on negative amount', () => {
    expect(() => formatPrice(-1, 'USD')).toThrow('Amount must be non-negative')
  })
})
```

## Mocking with vi.mock()

```typescript
// Mock a module
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { sendEmail } from './email-service'

vi.mock('./email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'test-123' }),
}))

describe('notifyUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls sendEmail with correct args', async () => {
    await notifyUser('user@example.com', 'Welcome!')
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome!',
    })
  })
})
```

## React Component Testing (Testing Library)

```typescript
// src/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)

    await user.click(screen.getByRole('button', { name: /click me/i }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

**Testing Library Principles:**
- Query by role (`getByRole`) over test IDs
- Query by label text for form inputs (`getByLabelText`)
- Use `userEvent` over `fireEvent` for realistic interactions
- Never query by CSS class or internal implementation details

## API Mocking with MSW

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Test User' })
  }),
  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 'new-123', ...body }, { status: 201 })
  }),
]

// src/mocks/server.ts (Node.js / Vitest)
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)

// vitest.setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './src/mocks/server'
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Integration Tests (API Endpoints)

```typescript
// Using Supertest with Express/Fastify
import request from 'supertest'
import { app } from '../src/app'

describe('GET /api/users/:id', () => {
  it('returns user when found', async () => {
    const res = await request(app).get('/api/users/1').expect(200)
    expect(res.body).toMatchObject({ id: '1', name: expect.any(String) })
  })

  it('returns 404 when not found', async () => {
    await request(app).get('/api/users/999').expect(404)
  })
})
```

## Coverage

```bash
# Run with coverage
vitest run --coverage

# Coverage thresholds in vitest.config.ts enforce 80%+ on CI
# Check specific file
vitest run --coverage --reporter=verbose src/lib/
```

## TDD Cycle

1. **RED**: Write failing test that describes the desired behaviour
2. **GREEN**: Write minimal implementation to make test pass — no more
3. **REFACTOR**: Clean up implementation without breaking tests
4. **VERIFY**: `vitest run --coverage` — confirm 80%+ coverage

## Common Pitfalls

- **Don't test implementation details**: Test observable behaviour, not internal state
- **Avoid `act()` warnings**: Use `userEvent` from `@testing-library/user-event`, not `@testing-library/react`
- **Isolate tests**: Each test must be independent — use `beforeEach`/`afterEach` to reset state
- **Mock at the boundary**: Mock network/DB/external services, not internal functions

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
- Migrating from Jest to Vitest on an ESM or Vite-based project
- Debugging tests that share mock state across runs and fail non-deterministically
- Setting up React Testing Library with `userEvent` for realistic component interaction testing

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

## Anti-Patterns

### Testing Implementation Details Instead of Behaviour

**Wrong:**
```typescript
it('sets internal loading state', () => {
  const service = new UserService()
  service.fetchUser('1')
  expect(service['_isLoading']).toBe(true) // private field access
})
```

**Correct:**
```typescript
it('shows loading indicator while fetching', async () => {
  render(<UserProfile id="1" />)
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
  await screen.findByText('John Doe')
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})
```

**Why:** Tests tied to internal state break on refactors even when behaviour is unchanged; only test what the user or caller observes.

### Using `fireEvent` Instead of `userEvent` for Interactions

**Wrong:**
```typescript
fireEvent.click(screen.getByRole('button', { name: /submit/i }))
fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } })
```

**Correct:**
```typescript
const user = userEvent.setup()
await user.type(screen.getByLabelText('Email'), 'a@b.com')
await user.click(screen.getByRole('button', { name: /submit/i }))
```

**Why:** `fireEvent` dispatches synthetic events that skip browser input processing (blur, focus, input validation), causing false positives that miss real-world bugs.

### Mocking Internal Module Functions Instead of Boundaries

**Wrong:**
```typescript
vi.mock('./user-service', () => ({ getUser: vi.fn().mockResolvedValue(mockUser) }))
vi.mock('./format-date', () => ({ formatDate: vi.fn().mockReturnValue('Jan 1') }))
```

**Correct:**
```typescript
// Mock at the network boundary with MSW
server.use(
  http.get('/api/users/:id', () => HttpResponse.json(mockUser))
)
```

**Why:** Mocking internal helpers couples tests to the call graph; mocking at the network/DB boundary keeps tests robust to internal refactors.

### Skipping `beforeEach` Cleanup Leading to Shared State

**Wrong:**
```typescript
const mockFn = vi.fn()
vi.mock('./logger', () => ({ log: mockFn }))

it('logs on success', async () => { await doWork(); expect(mockFn).toHaveBeenCalledOnce() })
it('logs on error', async () => { await doWork(); expect(mockFn).toHaveBeenCalledOnce() }) // fails: called twice
```

**Correct:**
```typescript
beforeEach(() => vi.clearAllMocks())

it('logs on success', async () => { await doWork(); expect(mockFn).toHaveBeenCalledOnce() })
it('logs on error', async () => { await doWork(); expect(mockFn).toHaveBeenCalledOnce() })
```

**Why:** Without clearing mocks between tests, call counts accumulate across the suite, causing order-dependent failures.

### Asserting on Snapshot Blobs for Business Logic

**Wrong:**
```typescript
it('formats user response', () => {
  expect(formatUser(raw)).toMatchSnapshot() // brittle mega-snapshot
})
```

**Correct:**
```typescript
it('formats user response', () => {
  const result = formatUser(raw)
  expect(result.name).toBe('John Doe')
  expect(result.email).toBe('john@example.com')
  expect(result).not.toHaveProperty('password')
})
```

**Why:** Snapshot tests on complex objects silently accept wrong output after regeneration; explicit assertions document exactly what matters.

## Common Pitfalls

- **Don't test implementation details**: Test observable behaviour, not internal state
- **Avoid `act()` warnings**: Use `userEvent` from `@testing-library/user-event`, not `@testing-library/react`
- **Isolate tests**: Each test must be independent — use `beforeEach`/`afterEach` to reset state
- **Mock at the boundary**: Mock network/DB/external services, not internal functions

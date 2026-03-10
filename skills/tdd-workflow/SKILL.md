---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
---

# Test-Driven Development Workflow

This skill ensures all code development follows TDD principles with comprehensive test coverage.

> **Agent counterpart:** Use the `tdd-guide` agent for interactive, step-by-step TDD guidance during feature development. This skill provides the reference patterns and examples; the agent enforces the workflow.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding API endpoints
- Creating new components
- Setting up coverage thresholds in CI to enforce the 80%+ minimum
- Reviewing a PR where tests were written after the implementation (anti-pattern)
- Onboarding a developer who is unfamiliar with the Red-Green-Refactor cycle

## Core Principles

### 1. Tests BEFORE Code
ALWAYS write tests first, then implement code to make tests pass.

### 2. Coverage Requirements
- Minimum 80% coverage (unit + integration + E2E)
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

### 3. Test Types

#### Unit Tests
- Individual functions and utilities
- Component logic
- Pure functions
- Helpers and utilities

#### Integration Tests
- API endpoints
- Database operations
- Service interactions
- External API calls

#### E2E Tests (Playwright)
- Critical user flows
- Complete workflows
- Browser automation
- UI interactions

## TDD Workflow Steps

### Step 1: Write User Journeys
```
As a [role], I want to [action], so that [benefit]

Example:
As a user, I want to search for markets semantically,
so that I can find relevant markets even without exact keywords.
```

### Step 2: Generate Test Cases
For each user journey, create comprehensive test cases:

```typescript
describe('Semantic Search', () => {
  it('returns relevant markets for query', async () => {
    // Test implementation
  })

  it('handles empty query gracefully', async () => {
    // Test edge case
  })

  it('falls back to substring search when Redis unavailable', async () => {
    // Test fallback behavior
  })

  it('sorts results by similarity score', async () => {
    // Test sorting logic
  })
})
```

### Step 3: Run Tests (They Should Fail)
```bash
npm test
# Tests should fail - we haven't implemented yet
```

### Step 4: Implement Code
Write minimal code to make tests pass:

```typescript
// Implementation guided by tests
export async function searchMarkets(query: string) {
  // Implementation here
}
```

### Step 5: Run Tests Again
```bash
npm test
# Tests should now pass
```

### Step 6: Refactor
Improve code quality while keeping tests green:
- Remove duplication
- Improve naming
- Optimize performance
- Enhance readability

### Step 7: Verify Coverage
```bash
npm run test:coverage
# Verify 80%+ coverage achieved
```

## Testing Patterns

### Unit Test Pattern (Jest/Vitest)
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### API Integration Test Pattern
```typescript
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/markets', () => {
  it('returns markets successfully', async () => {
    const request = new NextRequest('http://localhost/api/markets')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('validates query parameters', async () => {
    const request = new NextRequest('http://localhost/api/markets?limit=invalid')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('handles database errors gracefully', async () => {
    // Mock database failure
    const request = new NextRequest('http://localhost/api/markets')
    // Test error handling
  })
})
```

### E2E Test Pattern (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test('user can search and filter markets', async ({ page }) => {
  // Navigate to markets page
  await page.goto('/')
  await page.click('a[href="/markets"]')

  // Verify page loaded
  await expect(page.locator('h1')).toContainText('Markets')

  // Search for markets
  await page.fill('input[placeholder="Search markets"]', 'election')

  // Wait for debounce and results
  await page.waitForTimeout(600)

  // Verify search results displayed
  const results = page.locator('[data-testid="market-card"]')
  await expect(results).toHaveCount(5, { timeout: 5000 })

  // Verify results contain search term
  const firstResult = results.first()
  await expect(firstResult).toContainText('election', { ignoreCase: true })

  // Filter by status
  await page.click('button:has-text("Active")')

  // Verify filtered results
  await expect(results).toHaveCount(3)
})

test('user can create a new market', async ({ page }) => {
  // Login first
  await page.goto('/creator-dashboard')

  // Fill market creation form
  await page.fill('input[name="name"]', 'Test Market')
  await page.fill('textarea[name="description"]', 'Test description')
  await page.fill('input[name="endDate"]', '2025-12-31')

  // Submit form
  await page.click('button[type="submit"]')

  // Verify success message
  await expect(page.locator('text=Market created successfully')).toBeVisible()

  // Verify redirect to market page
  await expect(page).toHaveURL(/\/markets\/test-market/)
})
```

## Test File Organization

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx          # Unit tests
│   │   └── Button.stories.tsx       # Storybook
│   └── MarketCard/
│       ├── MarketCard.tsx
│       └── MarketCard.test.tsx
├── app/
│   └── api/
│       └── markets/
│           ├── route.ts
│           └── route.test.ts         # Integration tests
└── e2e/
    ├── markets.spec.ts               # E2E tests
    ├── trading.spec.ts
    └── auth.spec.ts
```

## Mocking External Services

### Supabase Mock
```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: [{ id: 1, name: 'Test Market' }],
          error: null
        }))
      }))
    }))
  }
}))
```

### Redis Mock
```typescript
jest.mock('@/lib/redis', () => ({
  searchMarketsByVector: jest.fn(() => Promise.resolve([
    { slug: 'test-market', similarity_score: 0.95 }
  ])),
  checkRedisHealth: jest.fn(() => Promise.resolve({ connected: true }))
}))
```

### OpenAI Mock
```typescript
jest.mock('@/lib/openai', () => ({
  generateEmbedding: jest.fn(() => Promise.resolve(
    new Array(1536).fill(0.1) // Mock 1536-dim embedding
  ))
}))
```

## Test Coverage Verification

### Run Coverage Report
```bash
npm run test:coverage
```

### Coverage Thresholds
```json
{
  "jest": {
    "coverageThresholds": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Common Testing Mistakes to Avoid

### ❌ WRONG: Testing Implementation Details
```typescript
// Don't test internal state
expect(component.state.count).toBe(5)
```

### ✅ CORRECT: Test User-Visible Behavior
```typescript
// Test what users see
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

### ❌ WRONG: Brittle Selectors
```typescript
// Breaks easily
await page.click('.css-class-xyz')
```

### ✅ CORRECT: Semantic Selectors
```typescript
// Resilient to changes
await page.click('button:has-text("Submit")')
await page.click('[data-testid="submit-button"]')
```

### ❌ WRONG: No Test Isolation
```typescript
// Tests depend on each other
test('creates user', () => { /* ... */ })
test('updates same user', () => { /* depends on previous test */ })
```

### ✅ CORRECT: Independent Tests
```typescript
// Each test sets up its own data
test('creates user', () => {
  const user = createTestUser()
  // Test logic
})

test('updates user', () => {
  const user = createTestUser()
  // Update logic
})
```

## Continuous Testing

### Watch Mode During Development
```bash
npm test -- --watch
# Tests run automatically on file changes
```

### Pre-Commit Hook
```bash
# Runs before every commit
npm test && npm run lint
```

### CI/CD Integration
```yaml
# GitHub Actions
- name: Run Tests
  run: npm test -- --coverage
- name: Upload Coverage
  uses: codecov/codecov-action@v4
```

## Best Practices

1. **Write Tests First** - Always TDD
2. **One Assert Per Test** - Focus on single behavior
3. **Descriptive Test Names** - Explain what's tested
4. **Arrange-Act-Assert** - Clear test structure
5. **Mock External Dependencies** - Isolate unit tests
6. **Test Edge Cases** - Null, undefined, empty, large
7. **Test Error Paths** - Not just happy paths
8. **Keep Tests Fast** - Unit tests < 50ms each
9. **Clean Up After Tests** - No side effects
10. **Review Coverage Reports** - Identify gaps

## Anti-Patterns

### Writing Code Before Tests

**Wrong:**
```typescript
// implement first, then try to write tests around it
export function calculateDiscount(price: number, tier: string): number {
    if (tier === 'gold') return price * 0.8
    if (tier === 'silver') return price * 0.9
    return price
}

// tests written after — they describe what the code happens to do, not what it should do
test('gold tier returns 80%', () => {
    expect(calculateDiscount(100, 'gold')).toBe(80)
})
```

**Correct:**
```typescript
// write failing test first
test('gold tier gets 20% discount', () => {
    expect(calculateDiscount(100, 'gold')).toBe(80)  // RED: function does not exist yet
})

// then implement the minimum to make it pass
export function calculateDiscount(price: number, tier: string): number {
    if (tier === 'gold') return price * 0.8
    return price
}
```

**Why:** Code written before tests tends to be untestable by design; tests written after only verify what was already built, not what was required.

### Testing Implementation Details Instead of Behavior

**Wrong:**
```typescript
test('calls internal _normalize before saving', () => {
    const spy = jest.spyOn(service as any, '_normalize')
    service.save(user)
    expect(spy).toHaveBeenCalled()  // tightly coupled to private method name
})
```

**Correct:**
```typescript
test('saves user with normalized email', async () => {
    await service.save({ ...user, email: '  User@EXAMPLE.COM  ' })
    const saved = await repo.findById(user.id)
    expect(saved.email).toBe('user@example.com')  // tests observable outcome
})
```

**Why:** Spying on private internals makes tests brittle to safe refactors; test observable inputs and outputs instead.

### Using `setTimeout` / `waitForTimeout` as a Synchronization Strategy

**Wrong:**
```typescript
test('search results appear after typing', async ({ page }) => {
    await page.fill('input[name="search"]', 'election')
    await page.waitForTimeout(600)  // arbitrary debounce guess
    await expect(page.locator('[data-testid="result"]')).toBeVisible()
})
```

**Correct:**
```typescript
test('search results appear after typing', async ({ page }) => {
    await page.fill('input[name="search"]', 'election')
    await expect(page.locator('[data-testid="result"]')).toBeVisible({ timeout: 5000 })
    // Playwright retries the assertion until it passes or times out
})
```

**Why:** Fixed timeouts are both slow and fragile; use framework retries or explicit state-change assertions instead.

### Chaining Tests That Share State

**Wrong:**
```typescript
// test A creates the user
test('creates user', async () => {
    await api.post('/users', { name: 'Alice' })
})

// test B depends on test A having run first
test('updates user', async () => {
    await api.put('/users/alice', { name: 'Alice B.' })
    const user = await api.get('/users/alice')
    expect(user.name).toBe('Alice B.')
})
```

**Correct:**
```typescript
test('updates user', async () => {
    // arrange: own setup, independent of other tests
    await api.post('/users', { name: 'Alice' })
    await api.put('/users/alice', { name: 'Alice B.' })
    const user = await api.get('/users/alice')
    expect(user.name).toBe('Alice B.')
})
```

**Why:** Tests that share state fail non-deterministically when run in isolation or in a different order.

### Mocking the System Under Test

**Wrong:**
```typescript
jest.mock('./userService')  // mocks the thing we're actually testing
const { registerUser } = require('./userService')
registerUser.mockResolvedValue({ id: '1', name: 'Alice' })

test('registerUser returns a user', async () => {
    const result = await registerUser('Alice', 'alice@example.com')
    expect(result.name).toBe('Alice')  // only tests the mock, not the real code
})
```

**Correct:**
```typescript
jest.mock('./userRepository')  // mock the dependency, not the SUT
import { registerUser } from './userService'
import { userRepository } from './userRepository'
;(userRepository.save as jest.Mock).mockResolvedValue({ id: '1', name: 'Alice' })

test('registerUser persists and returns the new user', async () => {
    const result = await registerUser('Alice', 'alice@example.com')
    expect(result.name).toBe('Alice')
    expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice' }))
})
```

**Why:** Mocking the system under test bypasses all real logic; mock dependencies at the boundary, not the subject.

## Success Metrics

- 80%+ code coverage achieved
- All tests passing (green)
- No skipped or disabled tests
- Fast test execution (< 30s for unit tests)
- E2E tests cover critical user flows
- Tests catch bugs before production

---

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.

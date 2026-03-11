---
name: tdd-workflow-advanced
description: TDD anti-patterns — writing code before tests, testing implementation details instead of behavior, using waitForTimeout as a sync strategy, chaining tests that share state, mocking the system under test instead of its dependencies.
---

# TDD Workflow — Anti-Patterns

This skill extends `tdd-workflow` with common testing mistakes and how to fix them. Load `tdd-workflow` first.

## When to Activate

- Tests were written after the implementation, not before
- Tests spy on private methods or internal state
- Tests use `waitForTimeout` / `sleep` as a synchronization mechanism
- Test B relies on test A having run first (shared state)
- The system under test itself is being mocked

---

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

---

## Success Metrics

- 80%+ code coverage achieved
- All tests passing (green)
- No skipped or disabled tests
- Fast test execution (< 30s for unit tests)
- E2E tests cover critical user flows
- Tests catch bugs before production

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.

## Reference

- `tdd-workflow` — Red-Green-Refactor cycle, test types, coverage targets, testing best practices
- `typescript-testing` — TypeScript-specific testing patterns and Jest/Vitest setup
- `e2e-testing` — Playwright E2E testing patterns

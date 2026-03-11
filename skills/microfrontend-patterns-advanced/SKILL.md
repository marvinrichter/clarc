---
name: microfrontend-patterns-advanced
description: Advanced Micro-Frontend patterns — testing strategy (unit per-remote, integration with mocked remotes, E2E full composition via Playwright), CI/CD independent deployments per remote, ErrorBoundary resilience, and monolith-to-MFE strangler-fig migration.
---

# Micro-Frontend Patterns — Advanced

This skill extends `microfrontend-patterns` with testing, CI/CD, resilience, and migration. Load `microfrontend-patterns` first.

## When to Activate

- Writing tests for Module Federation remotes or the shell
- Setting up independent CI/CD pipelines per remote
- Adding ErrorBoundary resilience so one failing remote doesn't crash the shell
- Planning a strangler-fig migration from a React/Vue/Angular monolith to MFE

---

## Testing Strategy

### Unit Tests: Per-Remote (No Shell Required)

```typescript
// Test remotes in isolation — mock federation context
// checkout/src/__tests__/CartView.test.tsx
import { render, screen } from "@testing-library/react";
import CartView from "../CartView";

test("displays empty cart message", () => {
  render(<CartView items={[]} />);
  expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
});
```

### Integration Tests: Shell + Mock Remotes

```typescript
// test/integration/shell.test.tsx
// Mock the federation remotes
jest.mock("checkout/CheckoutApp", () => ({
  default: () => <div data-testid="checkout-mock">Checkout</div>,
}));

test("shell renders checkout route", async () => {
  render(<App />, { route: "/checkout" });
  await screen.findByTestId("checkout-mock");
});
```

### E2E Tests: Full Composition

```typescript
// playwright.config.ts — start all remotes before tests
import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: [
    { command: "npm run start --prefix shell", port: 3000 },
    { command: "npm run start --prefix checkout", port: 3001 },
    { command: "npm run start --prefix catalog", port: 3002 },
  ],
  use: { baseURL: "http://localhost:3000" },
});
```

---

## CI/CD: Independent Deployments

Each Remote has its own pipeline. The Shell only re-deploys when the shell code itself changes.

```yaml
# .github/workflows/checkout.yml
name: Checkout Remote
on:
  push:
    paths:
      - "remotes/checkout/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build      # produces remoteEntry.js
      - run: npm run test
      # Deploy remoteEntry.js to CDN
      - uses: aws-actions/s3-deploy@v1
        with:
          source: dist/
          bucket: checkout-remote-prod
          # Shell fetches this URL — no shell redeployment needed
```

---

## Error Handling & Resilience

```typescript
// ErrorBoundary for each Remote — one Remote failing doesn't crash the shell
class RemoteErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Log to monitoring — Remote loading failure is a high-priority alert
    reportError(error, { context: "remote-load-failure" });
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

---

## Migration: Monolith → MFE

1. **Identify boundaries** — map UI areas to team ownership
2. **Extract Design System first** — shared components must be stable before splitting apps
3. **Add Module Federation to the monolith** — expose new modules without breaking existing code
4. **Strangler-fig migration** — route new paths to Remote, old paths stay in monolith
5. **Extract one domain at a time** — validate in production before extracting the next

```
Phase 1: /checkout → extracted as Remote
Phase 2: /catalog → extracted as Remote
Phase 3: remaining monolith shell (homepage, navigation)
```

## Reference

- `microfrontend-patterns` — Module Federation setup, shared state, design system, CSS isolation
- `typescript-monorepo-patterns` — managing multi-package repos
- `e2e-testing` — Playwright E2E for full MFE composition testing
- `legacy-modernization` — Strangler Fig and Branch-by-Abstraction migration patterns

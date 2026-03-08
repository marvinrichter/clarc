---
name: microfrontend-patterns
description: Skill: Micro-Frontend Patterns
---
# Skill: Micro-Frontend Patterns

## When to Activate

- More than 3 teams working on a single frontend application
- Teams need to deploy UI changes independently without coordinating releases
- Migrating a frontend monolith to a multi-team architecture
- Selecting an integration strategy (Module Federation vs Web Components vs iFrame)
- Designing shell application and remote app structure
- Handling shared state, routing, and design systems across teams

---

## When to Use Micro-Frontends (and When Not To)

### Use MFE When

- 3+ teams own distinct, bounded areas of the UI
- Teams deploy at different cadences and coupling causes coordination overhead
- Different UI regions have distinct technology requirements (e.g., React team + Vue team)
- Independent scalability per feature area is required

### Do NOT Use MFE When

- Single team or 2 teams — coordination cost is negligible, complexity is not worth it
- Strong UI cohesion needed (animated transitions that cross team boundaries are painful)
- Early-stage product — MFE boundaries harden quickly and wrong splits are expensive to undo
- Performance is critical — additional network round-trips for remote entry files add latency

---

## Decomposition Patterns

### Vertical Decomposition (Recommended)

Each team owns a complete vertical slice: frontend UI + backend API + database.

```
Shell App (navigation, layout)
├── /checkout   → Checkout Team (React app)
├── /catalog    → Catalog Team (Vue app)
├── /account    → Account Team (React app)
└── /support    → Support Team (Angular app)
```

### Horizontal Decomposition (Avoid Unless Necessary)

Teams own horizontal UI layers (header, footer, sidebar). Leads to tight coupling.

---

## Module Federation (Webpack 5)

The standard for runtime integration. Shell loads Remote apps as JavaScript modules at runtime — no rebuild needed when a Remote deploys.

### Shell Application (`webpack.config.ts`)

```typescript
// shell/webpack.config.ts
import { ModuleFederationPlugin } from "@module-federation/enhanced";

export default {
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        // URL loaded from config/feature flag at runtime — never hardcode
        checkout: `promise new Promise((resolve) => {
          const url = window.__REMOTES__?.checkout ?? 'https://checkout.example.com/remoteEntry.js';
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => resolve(window.checkout);
          document.head.appendChild(script);
        })`,
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
        "react-router-dom": { singleton: true, requiredVersion: "^6.0.0" },
      },
    }),
  ],
};
```

### Remote Application (`webpack.config.ts`)

```typescript
// checkout/webpack.config.ts
import { ModuleFederationPlugin } from "@module-federation/enhanced";

export default {
  output: {
    publicPath: "auto",   // critical: must be set so assets load from correct URL
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "checkout",
      filename: "remoteEntry.js",  // the federation manifest
      exposes: {
        "./CheckoutApp": "./src/CheckoutApp",       // main entrypoint
        "./CheckoutButton": "./src/CheckoutButton", // reusable component
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
      },
    }),
  ],
};
```

### Loading a Remote in the Shell

```typescript
// shell/src/App.tsx
import React, { Suspense, lazy } from "react";
import ErrorBoundary from "./ErrorBoundary";

// Lazy load the remote module — fails gracefully if remote is down
const CheckoutApp = lazy(() =>
  import("checkout/CheckoutApp").catch(() => ({
    default: () => <div>Checkout temporarily unavailable</div>,
  }))
);

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/checkout/*"
          element={
            <ErrorBoundary fallback={<CheckoutFallback />}>
              <Suspense fallback={<LoadingSkeleton />}>
                <CheckoutApp />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Routes>
    </Router>
  );
}
```

### TypeScript Support for Federation

```typescript
// Use @module-federation/typescript for shared type definitions
// Install: npm install @module-federation/typescript

// checkout/webpack.config.ts — generate type declarations
new ModuleFederationPlugin({
  // ... existing config ...
  dts: {
    generateTypes: {
      compilerOptions: {
        outDir: "dist/@mf-types",
      },
    },
  },
})

// shell/webpack.config.ts — consume type declarations
new ModuleFederationPlugin({
  // ... existing config ...
  dts: {
    consumeTypes: {
      remoteTypesFolder: "@mf-types",
    },
  },
})
```

---

## Module Federation with Vite

For Vite-based projects, use `@originjs/vite-plugin-federation`. Note: build-time federation rather than runtime — slightly less flexibility, better build performance.

```typescript
// vite.config.ts (Remote)
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "checkout",
      filename: "remoteEntry.js",
      exposes: {
        "./CheckoutApp": "./src/CheckoutApp",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: {
    target: "esnext",  // required for federation
    minify: false,
  },
});
```

```typescript
// vite.config.ts (Shell)
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "shell",
      remotes: {
        checkout: "http://localhost:3001/assets/remoteEntry.js",
      },
      shared: ["react", "react-dom"],
    }),
  ],
});
```

---

## Alternative Integration Strategies

| Strategy | Isolation | DX | Performance | When to Use |
|----------|-----------|-----|-------------|-------------|
| Module Federation | Medium | Best | Best | Default — runtime integration |
| Build-time NPM packages | Low | Good | Best | Teams using same tech, frequent shared updates |
| iFrame | Maximum | Poor | Poor | Legacy apps, maximum security isolation |
| Web Components | High | Medium | Good | Framework-agnostic teams |
| Server-Side Composition | Medium | Medium | Best | SSR-heavy, CDN edge assembly |

### iFrame Integration

```typescript
// Only use for maximum isolation needs (e.g., embedding payment forms)
function CheckoutIframe() {
  return (
    <iframe
      src="https://checkout.example.com"
      sandbox="allow-scripts allow-same-origin allow-forms"
      allow="payment"
      style={{ width: "100%", border: "none" }}
    />
  );
}
```

### Web Components

```typescript
// checkout team publishes a Web Component
class CheckoutWidget extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: "open" });
    const app = document.createElement("div");
    root.appendChild(app);
    // Mount any framework here
    ReactDOM.createRoot(app).render(<CheckoutApp />);
  }

  disconnectedCallback() {
    // Clean up — unmount React
  }
}

customElements.define("checkout-widget", CheckoutWidget);
```

```html
<!-- Shell uses it as a standard HTML element -->
<checkout-widget data-user-id="123"></checkout-widget>
```

---

## Routing Architecture

The shell owns the top-level router. Remotes own sub-routes within their segment.

```typescript
// shell/src/App.tsx — Shell owns top-level routes
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/catalog/*" element={<CatalogApp />} />   {/* Catalog owns /catalog/* */}
  <Route path="/checkout/*" element={<CheckoutApp />} /> {/* Checkout owns /checkout/* */}
  <Route path="/account/*" element={<AccountApp />} />   {/* Account owns /account/* */}
</Routes>

// checkout/src/CheckoutApp.tsx — Remote owns its sub-routes
<Routes>
  <Route path="/" element={<CartView />} />
  <Route path="/payment" element={<PaymentView />} />
  <Route path="/confirmation" element={<ConfirmationView />} />
</Routes>
```

### Deep-Link Rule

Every route in every Remote must be directly navigable. Test: can a user bookmark `/checkout/payment` and return to it? If not, the routing is broken.

```typescript
// Shell must pass basename to Remotes
function CheckoutApp() {
  return (
    <BrowserRouter basename="/checkout">
      {/* ... */}
    </BrowserRouter>
  );
}
```

---

## Shared State & Communication

### Guiding Principle: Minimize Shared State

If all teams share state, they're not truly independent. Ask: does this data *really* need to be shared?

```
Acceptable shared state:
- Auth session (user ID, auth token)
- UI theme / dark mode preference
- Feature flags (read-only)

NOT acceptable as shared state:
- Cart contents (checkout team owns this — other teams call the API)
- User profile details (account team owns this API)
- Product inventory (catalog team owns this)
```

### Pattern 1: Custom Events (Loose Coupling)

```typescript
// Checkout dispatches a domain event
window.dispatchEvent(
  new CustomEvent("checkout:item-added", {
    detail: { productId: "prod-123", quantity: 2 },
    bubbles: true,
  })
);

// Shell or other Remote listens
window.addEventListener("checkout:item-added", (e: CustomEvent) => {
  updateCartBadge(e.detail.quantity);
});
```

### Pattern 2: Shared Auth Store (Only for Global Session)

```typescript
// shared-auth/index.ts — published as npm package
import { create } from "zustand";

interface AuthState {
  userId: string | null;
  token: string | null;
  setAuth: (userId: string, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  token: null,
  setAuth: (userId, token) => set({ userId, token }),
  clearAuth: () => set({ userId: null, token: null }),
}));
```

### Pattern 3: URL as State (Deep-Links, Shareable)

```typescript
// Pass context via query params — survives page refresh, shareable
// /catalog/product/123?ref=checkout&sessionId=abc
const params = new URLSearchParams(location.search);
const referralSource = params.get("ref");
```

---

## Design System in MFE

### Recommended: Shared Component Library as Remote

```typescript
// design-system/webpack.config.ts
new ModuleFederationPlugin({
  name: "designSystem",
  filename: "remoteEntry.js",
  exposes: {
    "./Button": "./src/components/Button",
    "./Modal": "./src/components/Modal",
    "./Theme": "./src/theme",
  },
  shared: { react: { singleton: true } },
});
```

### CSS Isolation

```typescript
// Each Remote uses CSS Modules — no class name collisions
// checkout/src/CartView.module.css
.container { padding: 16px; }   // compiled to: checkout__container__x3abc

// Or CSS-in-JS with scoped styles (styled-components, Emotion)
const CartContainer = styled.div`
  padding: 16px;
  background: var(--color-surface);  // CSS custom properties for theming
`;
```

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

---

## Related Skills

- `typescript-monorepo-patterns` — managing multi-package repos (tooling complement to MFE)
- `frontend-patterns` — component patterns for individual team apps
- `design-system` — design system architecture (complements MFE design system strategy)
- `e2e-testing` — Playwright E2E for full MFE composition testing

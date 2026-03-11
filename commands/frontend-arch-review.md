---
description: Micro-Frontend architecture review — team boundaries, Module Federation config, shared dependencies, routing, state sharing, fallbacks, design system consistency, and CI/CD independence.
---

# Frontend Architecture Review

Performs a comprehensive architecture review of a Micro-Frontend application — from Module Federation configuration to team ownership boundaries and CI/CD independence.

## What This Command Does

1. **Team Boundaries** — verify MFE boundaries align with team/domain ownership
2. **Module Federation Config** — validate Shell and Remote configurations
3. **Shared Dependencies** — detect duplicate bundles and version conflicts
4. **Routing** — confirm Shell routing, sub-routing in Remotes, deep-links
5. **State Sharing** — identify over-shared state that violates MFE independence
6. **Fallbacks** — verify Remote failure handling (ErrorBoundary, Suspense)
7. **Design System** — validate CSS isolation, consistent theming
8. **CI/CD Independence** — confirm each Remote can deploy without the Shell

## When to Use

Use `/frontend-arch-review` when:
- Setting up a new Micro-Frontend architecture
- Adding a new Remote app to an existing Shell
- Diagnosing performance issues (bundle size, duplicate dependencies)
- Reviewing MFE boundaries before a team structure change
- Pre-production architecture gate for MFE systems
- Debugging federation runtime errors (`Shared module is not available`)

## Review Process

### Step 1 — Team Boundary Analysis

```bash
# Verify each Route maps to exactly one team's Remote
grep -r "remotes\|exposes" webpack.config.* vite.config.*

# Check: does the Remote boundary match the team's domain?
# Red flag: multiple teams modifying the same Remote
git log --all --oneline -- remotes/checkout/ | awk '{print $2}' | sort | uniq -c
# If many authors from different teams → boundary is wrong

# Verify team owns backend for their MFE (vertical slice check)
ls remotes/checkout/src/api/   # Should have its own API calls, not a shared API layer
```

### Step 2 — Module Federation Configuration

```bash
# Extract all Module Federation configs
find . -name "webpack.config.*" -o -name "vite.config.*" | xargs grep -l "federation\|ModuleFederation"

# Check Shell: are remote URLs dynamic (not hardcoded)?
grep -r "remoteEntry.js" webpack.config.* vite.config.*
# FAIL: 'https://checkout.example.com/remoteEntry.js' hardcoded in config
# PASS: URL loaded from env variable or runtime config

# Check Remote: is publicPath set to 'auto'?
grep -r "publicPath" webpack.config.*
# FAIL: publicPath missing or set to '/' (assets will 404 when loaded from Shell)
# PASS: publicPath: 'auto'

# Verify exposes: only intended components are exposed
grep -A 10 "exposes:" webpack.config.*
```

**Common Configuration Issues:**

| Issue | Symptom | Fix |
|-------|---------|-----|
| `publicPath` not set | Assets (CSS, images) 404 when Remote loads | Set `publicPath: 'auto'` in Remote |
| Hardcoded Remote URL | Deploy breaks if URL changes | Load URL from env/config/feature flag |
| Missing `singleton: true` on React | Two React instances = hooks crash | Add `singleton: true` to shared React |
| Version mismatch | `Unsatisfied version` runtime error | Align `requiredVersion` across Shell and Remotes |

### Step 3 — Shared Dependencies Audit

```bash
# Analyze bundle to find duplicates
npx webpack-bundle-analyzer dist/stats.json

# Check shared config — are all critical packages marked singleton?
grep -A 20 '"shared"' webpack.config.* | grep -E "react|react-dom|react-router"
# Must have: singleton: true, requiredVersion: '^X.Y.Z'

# Check for mismatched versions across remotes
for dir in remotes/*/; do
  echo "=== $dir ===";
  cat "$dir/package.json" | jq '.dependencies.react,.dependencies["react-dom"]';
done

# Run bundle size check (alert if remote > 250KB gzipped)
npx bundlesize --config .bundlesizerc.json
```

### Step 4 — Routing Validation

```bash
# Shell routing: verify catch-all for each Remote's path prefix
grep -A 3 "<Route" shell/src/App.tsx | grep -E "path|element"
# Every Remote must have: path="/DOMAIN/*" with /* wildcard

# Test deep-links: each sub-route must be directly navigable
# For Playwright:
npx playwright test --grep "direct navigation"

# Check: Remote uses basename to honor shell path prefix
grep "basename\|BrowserRouter\|MemoryRouter" remotes/*/src/index.tsx
# Remote should use BrowserRouter with basename="/checkout" or MemoryRouter

# Verify no history conflicts (two BrowserRouters fighting)
grep -r "createBrowserHistory\|BrowserRouter" remotes/ --include="*.tsx"
# Should be 0 — Remotes must use MemoryRouter or receive history from Shell
```

### Step 5 — State Sharing Analysis

```bash
# Find all cross-remote state sharing — flag if non-auth state is shared
grep -r "import.*from.*shell\|import.*from.*shared-store" remotes/

# Check event bus usage
grep -r "window.dispatchEvent\|window.addEventListener" remotes/ --include="*.ts" --include="*.tsx"

# Flag: Remote reads from shared store for domain-specific data
grep -r "useCartStore\|useProductStore\|useOrderStore" shell/ remotes/
# FAIL: cart state in shell (checkout team should own this)

# Verify auth is the ONLY global shared state
grep -r "useAuthStore\|useSessionStore" remotes/ --include="*.ts" --include="*.tsx"
# PASS if only auth-related stores are shared
```

### Step 6 — Fallback & Resilience

```typescript
// Check ErrorBoundary wraps every Remote
grep -r "ErrorBoundary" shell/src/App.tsx
// FAIL: RemoteApp without ErrorBoundary = one Remote crash = shell crash

// Verify Suspense fallback is a real skeleton, not just null
grep -A 3 "Suspense" shell/src/App.tsx
// FAIL: fallback={null} gives blank screen during load
// PASS: fallback={<SkeletonLoader />}

// Check catch in dynamic import for graceful degradation
grep -r "import('.*').catch" shell/src/
// PASS: import('checkout/CheckoutApp').catch(() => ({ default: FallbackComponent }))
```

### Step 7 — Design System Consistency

```bash
# Find hardcoded colors/spacing (should use CSS custom properties)
grep -r "color: #\|background: #\|padding: [0-9]" remotes/*/src/ --include="*.css" --include="*.scss"

# Verify CSS Modules or CSS-in-JS scoping (no global classes)
grep -r "className=\"[a-z]" remotes/ --include="*.tsx" | grep -v "styles\.\|module\."
# FAIL: className="button" (global, will collide)
# PASS: className={styles.button} or className={css`...`}

# Check design system version consistency
for dir in remotes/*/; do
  echo "$dir: $(cat $dir/package.json | jq -r '.dependencies["@company/design-system"]')";
done
# FAIL: different versions across remotes
```

### Step 8 — CI/CD Independence

```bash
# Verify each Remote has its own CI pipeline
ls .github/workflows/ | grep -E "checkout|catalog|account"
# FAIL: single workflow deploys all remotes (not independent)

# Check: Shell pipeline does NOT trigger on Remote changes
cat .github/workflows/shell.yml | grep "paths:"
# PASS: paths: ['shell/**'] — not '**'

# Verify Remote deploys to separate CDN path (not shell's origin)
grep -r "S3_BUCKET\|CDN_URL\|DEPLOY_TARGET" .github/workflows/checkout.yml
# Should point to checkout-specific CDN path

# Test remote URL is version-agnostic (newest deploy is always at same URL)
# FAIL: remoteEntry.js?v=1.2.3 — Shell needs a redeploy for each remote version
# PASS: remoteEntry.js — always latest; use cache-busting headers, not URL versioning
```

## Review Categories

### CRITICAL (Block Deployment)

- `publicPath` not set on Remote → assets (CSS, images) 404 in Shell context
- React not configured as singleton → duplicate React instance → hooks crash
- No ErrorBoundary around Remotes → single Remote failure crashes entire shell
- Hardcoded Remote URL → deploys fail silently in different environments

### HIGH (Fix Before Merge)

- Dependency version mismatch between Shell and Remote shared libraries
- Deep-links not working (Remote sub-routes require Shell context to navigate)
- Non-auth domain state shared globally → teams are not independent
- Remote and Shell deploy in the same pipeline → not independently deployable

### MEDIUM (Address Next Sprint)

- Missing fallback skeletons (Suspense fallback={null})
- CSS class name collisions possible (no scoping mechanism)
- Design system version drift across Remotes
- Bundle size above 250KB gzipped per Remote

## Approval Criteria

| Status | Condition |
|--------|-----------|
| Approve | No CRITICAL or HIGH issues — Remotes independently deployable, singleton React, ErrorBoundaries, dynamic URLs |
| Warn | Only MEDIUM issues — acceptable with remediation plan |
| Block | Any CRITICAL issue |

## Related

- Skill: `skills/microfrontend-patterns/` — full reference for Module Federation, routing, shared state
- Agent: `agents/frontend-architect.md` — design new MFE architecture from scratch
- Skill: `skills/typescript-monorepo-patterns/` — monorepo tooling for MFE projects
- Skill: `skills/e2e-testing/` — Playwright E2E for MFE full-composition testing

## After This

- `/arch-design` — design improved architecture based on review findings
- `/tdd` — add tests for identified gaps
- `/code-review` — review implementation after architectural changes

# Skill: API Documentation Patterns

Engineering great API documentation — from OpenAPI descriptions to interactive playgrounds, changelog automation, and prose quality checks. API documentation is a product, not an afterthought.

## When to Activate

- Building or overhauling API documentation for any team or public audience
- Choosing a documentation platform (Mintlify, Docusaurus, Redoc, Scalar)
- Implementing changelog automation with semantic-release or release-please
- Adding interactive API playground or code examples to existing docs
- Setting up Vale prose linting or broken-link checks in CI
- Auditing OpenAPI spec descriptions, examples, and x-extensions
- Structuring documentation according to Divio (Tutorial / How-to / Reference / Explanation)

> For API design conventions (resource naming, status codes, versioning): see skill `api-design`.
> For contract-first workflow (spec linting, code generation, breaking-change CI): see skill `api-contract`.

---

## Docs-as-Code Philosophy

Treat documentation exactly like code: version-controlled in Git, reviewed via pull requests, built and deployed in CI.

```
Repository layout — docs next to code
├── api/
│   └── v1/
│       └── openapi.yaml        ← spec is the source of truth
├── docs/
│   ├── guides/                 ← tutorials and how-tos
│   ├── reference/              ← auto-generated from OpenAPI
│   └── changelog/              ← CHANGELOG.md or generated
├── mint.json                   ← Mintlify config (if using Mintlify)
└── .github/
    └── workflows/
        └── docs.yml            ← build + lint + deploy
```

**CI pipeline for docs (every PR):**

```yaml
# .github/workflows/docs.yml
name: Docs CI
on: [push, pull_request]
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint OpenAPI spec
        run: npx @stoplight/spectral-cli lint api/v1/openapi.yaml
      - name: Check prose (Vale)
        run: vale docs/
      - name: Check broken links
        run: npx lychee --offline docs/**/*.md
      - name: Build docs
        run: npm run docs:build
      - name: Deploy preview (PR only)
        if: github.event_name == 'pull_request'
        run: mintlify deploy --preview
```

**Anti-patterns to avoid:**
- Word documents or Confluence pages for API docs — they version poorly, go stale within weeks
- Generating the OpenAPI spec from code annotations — annotations drift from behavior
- Updating docs manually after code changes — automate staleness detection

---

## OpenAPI Documentation Best Practices

A well-documented OpenAPI spec is the foundation of every other documentation artifact. Renderers (Redoc, Scalar, Mintlify) consume your spec directly.

### Descriptions — never leave them empty

```yaml
# openapi.yaml

paths:
  /users/{id}/orders:
    get:
      summary: List orders for a user
      description: |
        Returns a paginated list of orders for the specified user.
        Orders are sorted by `created_at` descending by default.

        **Scopes required:** `orders:read`

        **Rate limit:** 100 requests/minute per API key
      operationId: listUserOrders
      tags: [Orders]
      parameters:
        - name: id
          in: path
          required: true
          description: The unique user identifier (UUID v4).
          schema:
            type: string
            format: uuid
            example: "550e8400-e29b-41d4-a716-446655440000"
        - name: status
          in: query
          description: |
            Filter by order status. Comma-separated list of values:
            `pending`, `processing`, `shipped`, `delivered`, `cancelled`.
          schema:
            type: string
            example: "pending,processing"
```

### Examples — one per schema variant

```yaml
components:
  schemas:
    Order:
      type: object
      description: Represents a customer order.
      properties:
        id:
          type: string
          format: uuid
          description: Unique order identifier.
          example: "ord_2xNm0kqHrTwV"
        status:
          type: string
          enum: [pending, processing, shipped, delivered, cancelled]
          description: Current fulfillment status.
          example: "shipped"
        total_cents:
          type: integer
          description: Order total in the smallest currency unit (e.g., cents for USD).
          example: 4999
      examples:
        pending_order:
          summary: Newly created order
          value:
            id: "ord_2xNm0kqHrTwV"
            status: "pending"
            total_cents: 4999
        shipped_order:
          summary: Order that has been shipped
          value:
            id: "ord_9pLq7rJsKwXm"
            status: "shipped"
            total_cents: 12750
```

### Tags — group endpoints into logical categories

```yaml
tags:
  - name: Users
    description: User accounts, profiles, and authentication.
  - name: Orders
    description: Order creation, management, and history.
  - name: Billing
    description: Subscriptions, invoices, and payment methods.
    externalDocs:
      description: Billing integration guide
      url: https://docs.example.com/guides/billing
```

### x-Extensions — attach custom metadata

```yaml
# Per-operation stability and rate-limit metadata
paths:
  /users:
    post:
      x-stability: stable           # stable | beta | experimental
      x-rateLimit:
        requests: 100
        window: "1m"
        scope: "per-api-key"
      x-codeSamples:
        - lang: TypeScript
          label: SDK
          source: |
            const user = await client.users.create({ email, name });
        - lang: Python
          label: SDK
          source: |
            user = client.users.create(email=email, name=name)
        - lang: Go
          label: SDK
          source: |
            user, err := client.Users.Create(ctx, &CreateUserRequest{Email: email, Name: name})
        - lang: Shell
          label: curl
          source: |
            curl -X POST https://api.example.com/v1/users \
              -H "Authorization: Bearer $API_KEY" \
              -H "Content-Type: application/json" \
              -d '{"email":"alice@example.com","name":"Alice"}'

# Webhook definitions (OpenAPI 3.1)
webhooks:
  order.shipped:
    post:
      summary: Order shipped event
      description: |
        Fired when an order transitions to `shipped` status.
        Retry policy: 3 attempts with exponential backoff (1s, 4s, 16s).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderShippedEvent'
```

---

## Documentation Platforms

### Mintlify — best for developer-focused SaaS APIs

```json
// mint.json
{
  "name": "Example API",
  "logo": { "light": "/logo/light.svg", "dark": "/logo/dark.svg" },
  "favicon": "/favicon.svg",
  "colors": { "primary": "#0D9373", "light": "#07C983" },
  "topbarLinks": [
    { "name": "Dashboard", "url": "https://app.example.com" }
  ],
  "navigation": [
    {
      "group": "Get Started",
      "pages": ["introduction", "quickstart", "authentication"]
    },
    {
      "group": "Guides",
      "pages": ["guides/webhooks", "guides/pagination", "guides/errors"]
    },
    {
      "group": "API Reference",
      "pages": ["api-reference/users", "api-reference/orders"]
    }
  ],
  "api": {
    "baseUrl": "https://api.example.com",
    "auth": { "method": "bearer" }
  },
  "openapi": "api/v1/openapi.yaml"
}
```

**Mintlify MDX components:**

```mdx
---
title: 'Create an Order'
description: 'Place a new order for a customer'
---

<Steps>
  <Step title="Authenticate">
    Obtain an API key from the [Dashboard](https://app.example.com/settings/api-keys).
  </Step>
  <Step title="Create the order">
    <CodeGroup>
    ```typescript TypeScript
    const order = await client.orders.create({
      customerId: "cust_abc123",
      items: [{ productId: "prod_xyz", quantity: 2 }],
    });
    ```
    ```python Python
    order = client.orders.create(
        customer_id="cust_abc123",
        items=[{"product_id": "prod_xyz", "quantity": 2}],
    )
    ```
    ```go Go
    order, err := client.Orders.Create(ctx, &orders.CreateRequest{
        CustomerID: "cust_abc123",
        Items: []orders.LineItem{{ProductID: "prod_xyz", Quantity: 2}},
    })
    ```
    ```bash curl
    curl -X POST https://api.example.com/v1/orders \
      -H "Authorization: Bearer $API_KEY" \
      -d '{"customer_id":"cust_abc123","items":[{"product_id":"prod_xyz","quantity":2}]}'
    ```
    </CodeGroup>
  </Step>
  <Step title="Handle the response">
    Store the returned `order.id` — you will need it to track fulfillment.
  </Step>
</Steps>

<Callout type="warning">
  Orders cannot be modified after they reach `processing` status. Cancel and recreate instead.
</Callout>
```

**When to choose Mintlify:**
- SaaS product with external developers as primary audience
- Want GitHub-native PR previews with zero infra
- Need a polished, branded look out of the box
- Team is small and wants minimal config

### Docusaurus — best for open-source or complex docs sites

```js
// docusaurus.config.js
module.exports = {
  title: 'Example API Docs',
  tagline: 'Build powerful integrations',
  url: 'https://docs.example.com',
  themeConfig: {
    navbar: {
      items: [
        { to: '/docs/guides', label: 'Guides', position: 'left' },
        { to: '/docs/api', label: 'API Reference', position: 'left' },
        { to: '/blog', label: 'Changelog', position: 'left' },
      ],
    },
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'example-api',
    },
  },
  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          example: {
            specPath: 'api/v1/openapi.yaml',
            outputDir: 'docs/api',
            sidebarOptions: { groupPathsBy: 'tag' },
          },
        },
      },
    ],
  ],
};
```

**When to choose Docusaurus:**
- Open-source project (Algolia DocSearch is free)
- Need blog/changelog as first-class citizen
- Complex sidebar with many nested sections
- React-based customization required

### Redoc — best for pure API reference

```bash
# Static build
npx @redocly/cli build-docs api/v1/openapi.yaml -o docs/index.html

# Lint before build
npx @redocly/cli lint api/v1/openapi.yaml

# Bundle multiple spec files
npx @redocly/cli bundle api/v1/openapi.yaml -o api/v1/bundled.yaml

# Join multiple partial specs
npx @redocly/cli join api/v1/users.yaml api/v1/orders.yaml -o api/v1/openapi.yaml
```

**Redocly config (`redocly.yaml`):**

```yaml
apis:
  main:
    root: api/v1/openapi.yaml
rules:
  no-unused-components: error
  operation-description: warn
  tag-description: warn
  info-contact: warn
theme:
  openapi:
    theme:
      colors:
        primary:
          main: '#0D9373'
      typography:
        fontSize: '16px'
        fontFamily: 'Inter, sans-serif'
```

**When to choose Redoc:**
- The API reference is the only documentation needed
- Want the classic 3-panel layout (nav / content / code examples)
- Embedding API docs inside a larger product documentation site
- Minimal JavaScript budget (Redoc renders fast)

### Scalar — modern interactive playground

```html
<!-- Embed in any HTML page -->
<script
  id="api-reference"
  data-url="https://api.example.com/openapi.yaml"
  data-configuration='{"theme":"purple","layout":"modern"}'
></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
```

```ts
// Or in a Node.js/Express server
import { apiReference } from '@scalar/express-api-reference'

app.use('/docs', apiReference({
  spec: { url: '/openapi.yaml' },
  theme: 'purple',
  authentication: {
    preferredSecurityScheme: 'bearerAuth',
  },
}))
```

**Scalar vs Swagger UI:**
| Feature | Scalar | Swagger UI |
|---------|--------|------------|
| Design quality | Modern, polished | Dated |
| OAuth PKCE in browser | Yes | Partial |
| Dark mode | Built-in | Manual |
| Bundle size | ~200 kB | ~400 kB |
| Customisation | Theme tokens | CSS overrides |

---

## Interactive API Playground

A playground lets developers try API calls without leaving the docs browser.

**Requirements for a production-quality playground:**

1. **Authentication flow** — support Bearer token input and OAuth PKCE directly in the UI
2. **Environment switching** — Sandbox vs Production base URL selector
3. **Persisted credentials** — store API key in `localStorage` so users don't re-enter
4. **Real responses shown** — actual response body, headers, and status code displayed
5. **Code generation** — "Copy as curl / TypeScript / Python" for every request made

```yaml
# OpenAPI server block — enables environment switching
servers:
  - url: https://api.example.com
    description: Production
  - url: https://sandbox.api.example.com
    description: Sandbox — safe to experiment, no real charges
```

---

## Code Examples

Every API operation needs working code examples in at least four languages.

### Minimum required languages

| Language | Use case |
|----------|----------|
| `curl` | Universal — any developer can run this |
| `TypeScript` | Web/Node.js developers (largest audience) |
| `Python` | Data scientists and backend developers |
| `Go` | Systems and infrastructure developers |

### Testing code examples in CI

Code examples must not drift from the actual API — test them against staging:

```yaml
# .github/workflows/smoke-test-examples.yml
name: Smoke test code examples
on:
  schedule:
    - cron: '0 6 * * 1'   # Every Monday at 06:00 UTC
  workflow_dispatch:

jobs:
  test-examples:
    runs-on: ubuntu-latest
    env:
      API_BASE_URL: https://sandbox.api.example.com
      API_KEY: ${{ secrets.SANDBOX_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - name: Test TypeScript examples
        run: |
          cd docs/examples/typescript
          npm ci
          npx ts-node run-all.ts
      - name: Test Python examples
        run: |
          cd docs/examples/python
          pip install -r requirements.txt
          python run_all.py
      - name: Test curl examples
        run: bash docs/examples/curl/run_all.sh
```

---

## Changelog Automation

### Keep a Changelog format

```markdown
# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [2.4.0] — 2025-11-01

### Added
- `GET /v1/orders/{id}/timeline` — returns fulfillment event history

### Changed
- `POST /v1/orders` now accepts optional `metadata` map (max 10 keys, 256 chars each)

### Deprecated
- `GET /v1/orders?format=legacy` — will be removed in v3.0. Use `format=standard`.

## [2.3.0] — 2025-09-15

### Security
- Webhook signatures now use HMAC-SHA256; HMAC-SHA1 support ends 2026-03-01

[Unreleased]: https://github.com/example/api/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/example/api/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/example/api/compare/v2.2.0...v2.3.0
```

### release-please (Google) — recommended for most teams

```yaml
# .github/workflows/release-please.yml
name: Release Please
on:
  push:
    branches: [main]

jobs:
  release-please:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          release-type: node
          changelog-types: |
            [
              {"type":"feat","section":"Features","hidden":false},
              {"type":"fix","section":"Bug Fixes","hidden":false},
              {"type":"perf","section":"Performance","hidden":false},
              {"type":"security","section":"Security","hidden":false},
              {"type":"chore","section":"Miscellaneous","hidden":true}
            ]
```

`release-please` opens a "Release PR" that accumulates `CHANGELOG.md` entries from Conventional Commits. Merge the PR → creates a GitHub release automatically.

### semantic-release — maximum automation

```json
// .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    "@semantic-release/npm",
    "@semantic-release/github",
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]"
    }]
  ]
}
```

**release-please vs semantic-release:**
| Aspect | release-please | semantic-release |
|--------|---------------|-----------------|
| Release trigger | PR merge (human in the loop) | Push to main (fully automatic) |
| Changelog accumulation | Yes — batches multiple PRs | Per-push |
| Rollback | Revert PR before merge | Harder |
| Config complexity | Low | Medium |
| Best for | Teams with release cadence | Continuous delivery |

### API-specific changelog entries

For breaking changes, always include a **migration guide**:

```markdown
## [3.0.0] — 2026-01-15

### Breaking Changes

#### `GET /v1/users` — pagination now required

Previously this endpoint returned all users when no pagination params were provided.
Starting in v3, you must pass `limit` (max 100) and optionally `cursor`.

**Before (v2):**
```http
GET /v1/users
```

**After (v3):**
```http
GET /v1/users?limit=50
```

**Migration:** Add `?limit=100` to your existing calls. If you need more than 100 users,
implement cursor-based pagination using the `meta.next_cursor` field.
```

---

## Documentation Quality

### Divio Documentation Framework

Structure every docs site into four distinct quadrants:

| Type | Orientation | Analogy | Key question answered |
|------|-------------|---------|----------------------|
| **Tutorial** | Learning | Teaching a child to cook | "How do I get started?" |
| **How-to guide** | Problem | A recipe | "How do I achieve X?" |
| **Reference** | Information | Encyclopedia | "What is the signature of X?" |
| **Explanation** | Understanding | Article | "Why does X work this way?" |

**Mapping to API docs:**

```
docs/
├── tutorials/
│   └── quickstart.md            ← Tutorial: "Send your first request in 5 minutes"
├── guides/
│   ├── webhooks.md              ← How-to: "How to receive order events"
│   ├── pagination.md            ← How-to: "How to page through large result sets"
│   └── error-handling.md        ← How-to: "How to handle errors gracefully"
├── reference/                   ← Reference: Auto-generated from OpenAPI
│   ├── users.md
│   └── orders.md
└── explanation/
    ├── authentication.md        ← Explanation: "Why we use API keys, not OAuth for M2M"
    └── rate-limiting.md         ← Explanation: "How the sliding-window rate limiter works"
```

### Vale — prose linter

```yaml
# .vale.ini
StylesPath = .vale/styles
MinAlertLevel = warning

[*.md]
BasedOnStyles = Vale, Google, write-good

# Project-specific vocabulary
[*.md]
Vale.Avoid = [utilize, leverage, synergize, paradigm]
Vale.Prefer = [use, improve, combine, pattern]
```

```bash
# Install Vale
brew install vale

# Download style packages
vale sync

# Run on all docs
vale docs/

# Run in CI
vale --output=line docs/ || exit 1
```

**Custom rules for API docs:**

```yaml
# .vale/styles/APIDoc/avoid-passive.yml
extends: existence
message: "Prefer active voice: '%s'"
level: warning
tokens:
  - 'is returned by'
  - 'will be sent to'
  - 'can be used to'
```

### Broken link detection

```bash
# lychee — fast Rust-based link checker
brew install lychee

# Check local docs
lychee --offline docs/**/*.md

# Check live links weekly in CI
lychee --accept 200,429 docs/**/*.md https://docs.example.com/sitemap.xml
```

```yaml
# .github/workflows/link-check.yml
name: Link Check
on:
  schedule:
    - cron: '0 4 * * 1'   # Weekly Monday 04:00 UTC
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Link Checker
        uses: lycheeverse/lychee-action@v1
        with:
          args: --offline docs/**/*.md
          fail: true
```

### Staleness detection

Detect when source code changes but documentation has not been updated:

```bash
#!/bin/bash
# scripts/check-docs-staleness.sh
# Find docs files not updated in the last 90 days whose linked source files changed recently

git log --since="90 days ago" --name-only --pretty=format: src/ \
  | sort -u \
  | while read -r source_file; do
      doc_file="docs/reference/$(basename "${source_file%.*}").md"
      if [ -f "$doc_file" ]; then
        last_doc=$(git log -1 --format="%ct" -- "$doc_file")
        last_src=$(git log -1 --format="%ct" -- "$source_file")
        if [ "$last_src" -gt "$last_doc" ]; then
          echo "STALE: $doc_file (source: $source_file changed more recently)"
        fi
      fi
    done
```

---

## Documentation Checklist

Before publishing or shipping API documentation:

- [ ] Every endpoint has a non-empty `description` (not just a `summary`)
- [ ] Every path/query parameter has a `description` and `example`
- [ ] Every schema property has a `description` and at least one `example`
- [ ] Multiple response codes documented (200/201, 400, 401, 403, 404, 429, 500 minimum)
- [ ] `x-stability` set on all operations (stable / beta / experimental)
- [ ] `x-codeSamples` present for all operations (curl + TypeScript + Python + Go)
- [ ] Interactive playground configured and authenticated flow works
- [ ] Getting Started tutorial completable in under 5 minutes
- [ ] Divio structure: Tutorial / How-to / Reference / Explanation sections exist
- [ ] Vale prose lint passes with zero errors
- [ ] Broken link check passes
- [ ] CHANGELOG.md follows Keep a Changelog format
- [ ] Breaking changes include migration guide
- [ ] CI pipeline: spec lint + prose lint + link check + docs build
- [ ] Code examples tested against staging environment

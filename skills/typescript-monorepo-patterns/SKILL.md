---
name: typescript-monorepo-patterns
description: "TypeScript monorepo patterns with Turborepo + pnpm workspaces. Covers package structure, shared configs, task pipeline caching, build orchestration, and publishing strategy."
---

# Monorepo Patterns

Modern TypeScript monorepos with Turborepo + pnpm workspaces. The package is the unit of caching — never the file.

## When to Activate

- Setting up a new monorepo from scratch
- Adding a package to an existing monorepo
- Debugging slow builds or cache misses
- Configuring shared ESLint, TypeScript, or Tailwind configs
- Setting up CI for a monorepo (affected-only runs)
- Deciding between monorepo and polyrepo

---

## Monorepo vs Polyrepo

Use a monorepo when:
- Packages share code (types, utilities, UI components)
- Teams deploy together more often than independently
- You want atomic cross-package refactors with a single PR

Use a polyrepo when:
- Teams have completely independent release cycles
- Services are in different languages with no shared code
- Security/compliance requires strict boundary enforcement

---

## Standard Structure

```
my-monorepo/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # Express/Fastify backend
│   └── mobile/           # Expo React Native
├── packages/
│   ├── ui/               # Shared React component library
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utility functions
│   ├── config-eslint/    # Shared ESLint config
│   ├── config-typescript/# Shared tsconfig bases
│   └── config-tailwind/  # Shared Tailwind preset
├── turbo.json
├── package.json          # Root: workspaces, scripts only
└── pnpm-workspace.yaml
```

**Rule**: `apps/` contains deployable units. `packages/` contains shared, publishable (or internal) libraries. Never put business logic in `packages/utils` that belongs in an app.

---

## Setup

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.0.0"
  },
  "engines": {
    "node": ">=24",
    "pnpm": ">=10"
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "vitest.config.*"],
      "outputs": ["coverage/**"]
    }
  }
}
```

**Key rules:**
- `"dependsOn": ["^build"]` — build dependencies first (topological)
- `"dependsOn": ["^lint"]` — wait for dependency lint before own lint
- `"cache": false` + `"persistent": true` — dev servers never cache, always run
- `outputs` — what to cache to disk (`.next/**`, `dist/**`)

---

## Shared Package Patterns

### Shared TypeScript Config — packages/config-typescript/

```
packages/config-typescript/
├── package.json
├── base.json
├── nextjs.json
└── node.json
```

```json
// package.json
{
  "name": "@repo/config-typescript",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./base.json": "./base.json",
    "./nextjs.json": "./nextjs.json",
    "./node.json": "./node.json"
  }
}
```

```json
// base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

```json
// nextjs.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }]
  }
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/config-typescript/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", ".next/types/**/*.d.ts"],
  "exclude": ["node_modules"]
}
```

### Shared ESLint Config — packages/config-eslint/

```json
// package.json
{
  "name": "@repo/config-eslint",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "peerDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "eslint": "^9.0.0"
  }
}
```

```js
// index.js (flat config)
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/** @param {string[]} tsconfigPaths */
export function createConfig(tsconfigPaths) {
  return [
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: { parser: tsParser, parserOptions: { project: tsconfigPaths } },
      plugins: { '@typescript-eslint': tsPlugin },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/consistent-type-imports': 'error',
      }
    }
  ];
}
```

```js
// apps/web/eslint.config.js
import { createConfig } from '@repo/config-eslint';
export default createConfig(['./tsconfig.json']);
```

### Internal UI Package — packages/ui/

```json
// package.json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./button": {
      "import": "./src/button.tsx",
      "types": "./src/button.tsx"
    },
    "./card": {
      "import": "./src/card.tsx",
      "types": "./src/card.tsx"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/config-typescript": "workspace:*",
    "typescript": "^5.9.0"
  },
  "peerDependencies": {
    "react": "^18 || ^19"
  }
}
```

**Pattern**: Use `"exports"` with direct source imports in internal packages — no build step needed. Apps' bundlers (Next.js, Vite) transpile the source directly.

Consuming package:
```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

```tsx
// apps/web/src/app/page.tsx
import { Button } from '@repo/ui/button';
```

---

## Dependency Management

### Add a package to a specific workspace

```bash
# Add to a specific app
pnpm add zod --filter @repo/web

# Add a shared package to all apps
pnpm add @repo/ui --filter "./apps/*"

# Add dev dependency to root
pnpm add -D turbo -w
```

### Add shared types between packages

```bash
pnpm add @repo/types --filter @repo/api --filter @repo/web
```

### Check for dependency issues

```bash
# Find why a package is installed
pnpm why react --filter @repo/web

# Check for missing peer dependencies
pnpm install --strict-peer-dependencies
```

---

## Turborepo Caching

### Local cache (default)

Turbo caches task outputs in `.turbo/` by default. Tasks with identical inputs return cached outputs instantly.

```bash
# First run: builds everything
turbo build  # 45s

# Second run (no changes): full cache hit
turbo build  # 0.5s — cache hit

# Force rebuild ignoring cache
turbo build --force
```

### Remote cache (Vercel / self-hosted)

```bash
# Login to Vercel remote cache
npx turbo login

# Link project
npx turbo link
```

```json
// turbo.json — enable remote caching
{
  "remoteCache": { "enabled": true }
}
```

**When inputs are wrong (cache misses):** Check `"inputs"` in turbo.json. By default `$TURBO_DEFAULT$` = all tracked files. Add `.env*` for env-sensitive tasks.

---

## CI — Affected-Only Runs

Only test/build packages affected by a PR:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # full history for affected detection

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build affected packages
        run: pnpm turbo build --filter="...[origin/main]"

      - name: Test affected packages
        run: pnpm turbo test --filter="...[origin/main]"
```

`--filter="...[origin/main]"` — run tasks for all packages changed vs main, plus their dependents (the `...` prefix = include dependents).

---

## Common Turbo Filter Patterns

```bash
# Only a specific app
turbo build --filter=@repo/web

# App and all its dependencies
turbo build --filter=@repo/web...

# All packages changed vs main (CI)
turbo build --filter="...[origin/main]"

# All packages in apps/
turbo build --filter="./apps/*"

# Exclude a package
turbo build --filter=!@repo/mobile
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Importing across apps directly | Creates hidden coupling | Use a shared `packages/` package |
| `"*"` version for workspace deps | Doesn't pin exact version | Use `"workspace:*"` (pnpm protocol) |
| Business logic in `packages/utils` | Shared package becomes a dumping ground | Keep domain logic in the app that owns it |
| Missing `"dependsOn": ["^build"]` | Race condition: app builds before dependency | Always add `^build` for any task that consumes built output |
| Committing `.turbo/` cache | Bloats git | Add `.turbo/` to `.gitignore` |
| Running `turbo dev` for a single app | Starts all dev servers | Use `turbo dev --filter=@repo/web` |
| Single root tsconfig | Type errors in one package affect others | Each package has its own `tsconfig.json` extending the shared base |

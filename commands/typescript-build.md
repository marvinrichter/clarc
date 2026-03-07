---
description: Type-check and lint TypeScript/JavaScript code. Runs tsc --noEmit and ESLint/Biome to catch type errors and style violations without building.
---

# TypeScript Build Check

Run TypeScript type-checking and linting to surface errors before committing.

## What This Command Does

1. **Type Check**: Run `tsc --noEmit` to find type errors without emitting files
2. **Lint**: Run `eslint .` or `biome check .` if available
3. **Report**: Show all errors grouped by file with severity

## Diagnostic Commands

```bash
# Type checking
tsc --noEmit

# Linting (pick one based on project config)
eslint . --ext .ts,.tsx,.js,.jsx
biome check .

# Format check
prettier --check "src/**/*.{ts,tsx,js,jsx}" 2>/dev/null || true
```

## When to Use

- Before committing TypeScript changes
- After pulling changes that may introduce type errors
- When `tsc` or `eslint` is failing in CI
- To verify type safety after refactoring

## Common Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Type 'X' is not assignable to type 'Y'` | Type mismatch | Align types or add type guard |
| `Property 'X' does not exist on type 'Y'` | Missing property | Update interface or use optional chaining |
| `Cannot find module 'X'` | Missing import or wrong path | Fix import path or install dependency |
| `Object is possibly 'null'` | Missing null check | Add null guard or non-null assertion |
| `Argument of type 'X' is not assignable` | Wrong argument type | Fix caller or update function signature |

## Approval Criteria

- **Approve**: No type errors, no lint errors
- **Warning**: Lint warnings only
- **Block**: Type errors or lint errors found

## Related

- Agent: `agents/typescript-reviewer.md`
- Skills: `skills/typescript-patterns/`, `skills/nodejs-backend-patterns/`
- Use `/typescript-review` for a full code quality review

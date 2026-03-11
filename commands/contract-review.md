---
description: API contract break detection — classifies REST, GraphQL, and event schema changes as BREAKING / NON-BREAKING / ADDITIVE and produces a migration plan. Invokes the contract-reviewer agent.
---

# Contract Review

Detect whether API changes break existing consumers before they reach production.

## Usage

```
/contract-review                    — review all changed API definition files
/contract-review openapi            — OpenAPI / REST changes only
/contract-review events             — AsyncAPI / event schema changes only
/contract-review graphql            — GraphQL schema changes only
```

Pass `$ARGUMENTS` as the API type to narrow scope. Without arguments, all changed API definitions are reviewed.

## What This Command Does

1. **Detect changed API files** — OpenAPI YAML, AsyncAPI, GraphQL schema, Protobuf
2. **Classify each change** — BREAKING, NON-BREAKING, or ADDITIVE
3. **Identify consumer impact** — which consumers are affected and how
4. **Produce migration plan** — versioning strategy, deprecation notices, changelogs

## When to Use

- Before merging any PR that touches `.yaml`, `.yml`, `.graphql`, `.proto`, or `asyncapi.*` files
- When removing or renaming fields, endpoints, or event types
- Before bumping a major API version
- During API design review

## Breaking vs Non-Breaking

| Change | Classification |
|--------|---------------|
| Remove field / endpoint | BREAKING |
| Rename field | BREAKING |
| Change field type | BREAKING |
| Add required field | BREAKING |
| Add optional field | ADDITIVE |
| Add new endpoint | ADDITIVE |
| Add new event type | ADDITIVE |
| Add enum value | NON-BREAKING (usually) |
| Change description only | NON-BREAKING |

## Scope vs Related Commands

| Need | Command |
|------|---------|
| API design from scratch | `/api-design` |
| Contract-first spec + codegen | `/api-contract` |
| This command: break detection on existing API | `/contract-review` |
| Full security scan of API | `/security-review` |

## After This

- `/api-contract` — enforce contract-first spec + run oasdiff in CI to prevent future breaks
- `/security-review` — if endpoint changes touch auth or input handling
- `/dep-audit` — if schema change requires consumer updates in dependencies

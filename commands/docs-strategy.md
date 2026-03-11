---
description: Documentation strategy and platform design — audience analysis, platform recommendation (Mintlify/Docusaurus/Redoc/Scalar), Divio framework structure, OpenAPI extension config, changelog automation, and CI pipeline. Invokes the docs-architect agent.
---

# Docs Strategy

Design a complete, maintainable documentation strategy for your API or product — platform selection, structure, CI pipeline, and changelog automation.

## Usage

```
/docs-strategy                      — full documentation strategy review
/docs-strategy platform             — platform recommendation only (Mintlify vs Docusaurus vs Redoc)
/docs-strategy structure            — Divio framework content structure only
/docs-strategy openapi              — OpenAPI extension and rendering config only
/docs-strategy ci                   — changelog automation and CI pipeline only
```

Pass `$ARGUMENTS` as the focus area. Without arguments, a full strategy is produced.

## What This Command Does

1. **Audience Analysis** — Who reads the docs? (API consumers, internal devs, end users, operators)
2. **Platform Recommendation** — Mintlify, Docusaurus, Redoc, Scalar, or custom — with trade-off analysis
3. **Content Structure** — Divio framework: Tutorials, How-to guides, Reference, Explanation — what goes where
4. **OpenAPI Configuration** — Extensions, rendering strategy, versioning approach
5. **Changelog Automation** — Conventional commits → changelog pipeline (release-please, semantic-release, or custom)
6. **CI Pipeline** — Lint, validate, deploy docs on every PR merge

## When to Use

- Before launching a new public API
- When documentation is out of date and users are filing support tickets because they can't find answers
- When the team is debating documentation platforms
- Before a developer experience (DX) audit
- When setting up a new API documentation site from scratch

## Scope vs Related Commands

| Need | Command |
|------|---------|
| Update existing docs to match code | `/update-docs` |
| Review existing API documentation quality | `/docs-review` |
| Generate arc42 architecture documentation | `/arc42` |
| This command: design the overall docs strategy | `/docs-strategy` |

## After This

- `/update-docs` — populate the new documentation structure with content from code
- `/api-contract` — generate OpenAPI spec to feed into the new docs platform
- `/setup-ci` — configure the CI pipeline recommended by this strategy

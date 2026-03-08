---
description: Review API documentation for completeness, quality, playground, code examples, changelog, navigation, and CI — produces a structured audit report with prioritised fixes.
---

# Docs Review

Audit the API documentation of the current project and produce a structured report covering seven dimensions: completeness, quality, playground, code examples, changelog, navigation, and CI integration.

## Instructions

Parse `$ARGUMENTS`:
- (empty) → full review across all seven dimensions
- `completeness` → only dimension 1
- `quality` → only dimension 2
- `playground` → only dimension 3
- `examples` → only dimension 4
- `changelog` → only dimension 5
- `navigation` → only dimension 6
- `ci` → only dimension 7

### 0. Discover Documentation Sources

Before reviewing, locate the relevant files:

```
Files to find:
  - api/v1/openapi.yaml (or openapi.json, swagger.yaml)
  - docs/ directory structure
  - mint.json / docusaurus.config.js / redocly.yaml
  - CHANGELOG.md / CHANGELOG/
  - .vale.ini
  - .github/workflows/*.yml — look for docs-related jobs
  - README.md — does it link to docs?
  - CONTRIBUTING.md
```

Use `Glob` and `Read` to locate these files. If no OpenAPI spec is found, report it as a CRITICAL finding and continue with what is available.

---

### 1. Completeness

Check that every API endpoint is documented.

**Steps:**
1. Parse the OpenAPI spec — list all `paths` × `methods` = total operations
2. For each operation check:
   - `summary` present and non-empty
   - `description` present and non-empty (not just the summary repeated)
   - At least one `tags` entry assigned
   - `operationId` present and unique
   - All response codes documented (minimum: 200/201, 400, 401, 403, 404, 500)
   - All path and query parameters have `description` + `example`
3. Check schemas: every property in `components/schemas` has `description`
4. Check webhooks (if `webhooks` key exists): all events described

**Scoring:**

```
COMPLETENESS SCORE
══════════════════
Operations with full description:    X / N
Parameters with description+example: X / N
Schemas with property descriptions:  X / N
Response codes documented (≥5/op):   X / N

Score: XX%  [PASS ≥ 80% | WARN 60-79% | FAIL < 60%]
```

---

### 2. Quality

Assess prose quality of descriptions and examples.

**Steps:**
1. Sample 10 random operation descriptions — check for:
   - Active voice (not "is returned by", "will be sent")
   - Complete sentences (not "Returns user" → should be "Returns the user profile for the given ID")
   - No jargon without explanation
   - No placeholder text ("TODO", "TBD", "coming soon")
2. Check examples for realism:
   - UUIDs look like real UUIDs (not "123" or "test")
   - Email addresses look real (not "email@email.com")
   - Timestamps are ISO 8601 (not "2023-1-1")
   - Amounts are plausible (not 0 or 999999)
3. Check `info.description` — is there a meaningful API overview?
4. Check `info.contact` and `info.license` — required for external APIs

**Output:** List of LOW/MEDIUM/HIGH quality findings with file references and suggested rewrites.

---

### 3. Playground

Verify the interactive API exploration experience.

**Steps:**
1. Identify playground platform: Scalar, Swagger UI, Mintlify Try-It, Redoc
2. Check configuration:
   - `servers` block has Sandbox + Production entries
   - Authentication scheme documented in `securitySchemes`
   - `security` applied at operation or global level
3. Look for OAuth PKCE flow in playground config (if OAuth used)
4. Check if `x-stability` or `x-beta` extensions mark experimental operations
5. Look for environment-switching UI (dropdown to switch base URL)
6. Check if playground is accessible without login (or has clear "get API key" CTA)

**Report:** WORKING / PARTIAL / MISSING with specific gaps.

---

### 4. Code Examples

Audit coverage and testability of code samples.

**Steps:**
1. Check `x-codeSamples` on each operation:
   - Present on ≥ 80% of operations?
   - Languages covered: `curl`, `typescript`/`javascript`, `python`, `go`
   - SDKs used in examples (not raw fetch/requests)?
2. Scan docs MDX/MD files for code blocks:
   - Are they syntax-highlighted?
   - Do they have copy-to-clipboard?
   - Are they in a `<CodeGroup>` or `<Tabs>` component (multi-language)?
3. Check for smoke test CI job that runs examples against staging:
   - `.github/workflows/` — look for `examples`, `smoke`, `e2e-docs` jobs
4. Check Getting Started guide — does it include a working first call?

**Output:**

```
CODE EXAMPLE COVERAGE
═════════════════════
Operations with x-codeSamples:  X / N  (XX%)
Languages present: curl ✓ | TypeScript ✓ | Python ✗ | Go ✗
Smoke tests in CI: NO — RECOMMENDED
Getting Started includes runnable example: YES
```

---

### 5. Changelog

Review changelog completeness and automation.

**Steps:**
1. Locate `CHANGELOG.md` — check format (Keep a Changelog standard):
   - Sections: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
   - Each version has a date
   - Comparison links at bottom (`[2.0.0]: https://...`)
2. Check for breaking-change migration guides:
   - Any major version bump should have a "Breaking Changes" section with before/after examples
3. Check automation:
   - `.releaserc.json` (semantic-release) or `release-please-config.json` present?
   - Release workflow in `.github/workflows/`?
4. Check `Sunset` or `Deprecation-Notice` headers on deprecated endpoints:
   ```yaml
   deprecated: true
   x-deprecatedAt: "2025-06-01"
   x-sunsetAt: "2026-06-01"
   x-migrationGuide: "https://docs.example.com/migration/v3"
   ```
5. Verify changelog is linked from README and from the docs site navigation

**Output:** AUTOMATED / MANUAL / MISSING + specific gaps.

---

### 6. Navigation

Audit the documentation structure and discoverability.

**Steps:**
1. Check Divio structure — are all four types present?
   - Tutorial (learning-oriented, step-by-step, < 5 min to first result)
   - How-to guides (problem-oriented, concrete tasks)
   - Reference (information-oriented, auto-generated from OpenAPI is fine)
   - Explanation (understanding-oriented, "why" articles)
2. Check Getting Started:
   - Is there a Getting Started page?
   - Can a developer make their first successful API call in < 5 minutes following it?
   - Are prerequisites clearly stated?
3. Check sidebar structure (if Mintlify or Docusaurus):
   - Is the sidebar depth ≤ 3 levels?
   - Are endpoint groups sorted logically (not alphabetically by accident)?
4. Check search — is there a search box?
5. Check mobile responsiveness (note whether platform handles it)
6. Check 404 page — is there a helpful one?

**Output:** Score (1-5) per Divio quadrant + PASS/FAIL for Getting Started.

---

### 7. CI Integration

Verify documentation is part of the CI pipeline.

**Steps:**
Check `.github/workflows/` (or equivalent CI config) for:

| Check | Required | Found |
|-------|----------|-------|
| OpenAPI spec lint (`spectral` or `redocly lint`) | YES | ? |
| Prose lint (`vale`) | RECOMMENDED | ? |
| Broken link check (`lychee` or similar) | RECOMMENDED | ? |
| Docs build on every PR | YES | ? |
| PR preview deployment | RECOMMENDED | ? |
| Code examples smoke test | RECOMMENDED | ? |
| Breaking change detection (`oasdiff`) | YES (for public APIs) | ? |

Report which checks are missing and provide the CI snippet to add them:

```yaml
# Suggested addition to docs CI job:
- name: Lint OpenAPI spec
  run: npx @stoplight/spectral-cli lint api/v1/openapi.yaml

- name: Check prose (Vale)
  run: vale docs/

- name: Check broken links
  run: npx lychee --offline docs/**/*.md
```

---

### 8. Final Report

```
API DOCUMENTATION REVIEW
═════════════════════════
Project: <name>
Spec:    api/v1/openapi.yaml  (<N> operations, <N> schemas)
Platform: <Mintlify | Docusaurus | Redoc | Unknown>

DIMENSION SCORES
────────────────
1. Completeness  [PASS/WARN/FAIL]  XX%
2. Quality       [PASS/WARN/FAIL]  X/5
3. Playground    [WORKING/PARTIAL/MISSING]
4. Code Examples [PASS/WARN/FAIL]  XX% coverage, languages: curl ✓ TS ✓ Py ✗ Go ✗
5. Changelog     [AUTOMATED/MANUAL/MISSING]
6. Navigation    [PASS/WARN/FAIL]  Divio: Tutorial ✓ How-to ✓ Ref ✓ Explanation ✗
7. CI            [PASS/WARN/FAIL]  X/7 checks present

CRITICAL ISSUES (fix before next release)
──────────────────────────────────────────
[list issues with file:line references]

HIGH PRIORITY (fix this sprint)
─────────────────────────────────
[list issues]

MEDIUM PRIORITY (backlog)
──────────────────────────
[list issues]

QUICK WINS (< 30 minutes each)
────────────────────────────────
[list small, high-impact improvements]

NEXT STEPS
──────────
1. [Most impactful action]
2. [Second action]
3. [Third action]
```

## Related Skills

- `api-docs-patterns` — full documentation patterns reference (Mintlify, Redoc, Scalar, Vale, changelog automation)
- `api-design` — API design conventions that affect documentation quality
- `api-contract` — spec linting, code generation, breaking-change CI

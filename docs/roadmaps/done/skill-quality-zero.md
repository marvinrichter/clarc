# Skill Quality Zero

**Status:** ✅ Done
**Date:** 2026-03-11
**Goal:** Zero findings on skill deep review — 0 broken cross-references, 0 deprecated stubs, 0 oversized skills (>600 lines), 0 lazy descriptions, 0 unresolved merge candidates, all thin skills expanded.

## Problem Statement

Skill deep review (2026-03-11) scanned all 237 skills in the clarc repo. Key findings:

1. **Broken cross-references (6 skills)** — golang→go rename was not propagated; `cpp-patterns` references a non-existent skill name. These cause silent skill-loading failures.
2. **Deprecated stub not deleted (1 skill)** — `continuous-learning` is a 29-line deprecated pointer. Still present and confuses routing.
3. **Oversized skills (11 skills >600 lines)** — Context-window inefficient. `mlops-patterns` (768 lines), `api-docs-patterns` (784 lines), `django-tdd` (731 lines) are the worst.
4. **Thin skills without examples (9 skills <100 lines)** — `market-research`, `investor-outreach`, `article-writing`, `e2e-testing-web3`, etc. have zero labeled examples.
5. **Lazy descriptions (15 skills)** — Frontmatter descriptions of the form `"Skill: X"` provide zero search signal, breaking `/find-skill` and skill routing.
6. **Unresolved merge candidates (2 pairs)** — `accessibility` ⊂ `accessibility-patterns`; `multi-agent-coordination` ⊂ `multi-agent-patterns`.
7. **Disambiguation gaps (4 pairs)** — `i18n-patterns`/`i18n-frameworks`, `ddd-*/hexagonal-*` pairs lack explicit "when to pick this one" guidance.

Target: **0 findings** on re-review across all 7 quality dimensions.

---

## Open Items

### P0 — Critical (broken references, deprecated stubs)

- **P0-CR1**: `continuous-learning` — delete deprecated stub
  - 29-line skill explicitly marked `DEPRECATED` in frontmatter. Points to `continuous-learning-v2`.
  - Action: Delete `skills/continuous-learning/` directory entirely.
  - Impact: Remove from INDEX.md and SKILL_AGENTS.md if referenced.

- **P0-CR2**: `go-patterns-advanced` — broken cross-reference
  - References `../golang-patterns/SKILL.md` in both frontmatter and description (does not exist; correct path: `../go-patterns/SKILL.md`).
  - Action: Fix relative path and description text to use `go-patterns`.

- **P0-CR3**: `go-testing-advanced` — broken cross-reference
  - References `../golang-testing/SKILL.md` in both frontmatter and description (does not exist; correct path: `../go-testing/SKILL.md`).
  - Action: Fix relative path and description text to use `go-testing`.

- **P0-CR4**: `go-testing` — broken cross-reference
  - References `golang-testing-advanced` in related skills (does not exist; correct: `go-testing-advanced`).
  - Action: Fix reference.

- **P0-CR5**: `cpp-patterns` — broken cross-reference
  - References `cpp-coding-standards-advanced` (does not exist; correct: `cpp-patterns-advanced`).
  - Action: Fix reference.

- **P0-CR6**: `configure-ecc` — multiple broken references + stale naming
  - References `golang-patterns` and `golang-testing` (both should be `go-patterns` and `go-testing`).
  - Install script path mismatch: Step 0 clones to `/tmp/clarc` but Step 6 deletes `/tmp/everything-claude-code`.
  - References old product name "ECC" throughout instead of "clarc".
  - Action: Fix both cross-references, fix path mismatch, replace all "ECC" → "clarc".

---

### P1-High — Merge Candidates (redundant content)

- **P1-MG1**: Merge `accessibility` into `accessibility-patterns`
  - Both cover WCAG 2.2, ARIA, keyboard nav, focus management, axe testing.
  - `accessibility-patterns` (532 lines) is more complete. `accessibility` (379 lines) adds a React DropdownMenu keyboard example.
  - Action: Copy the React DropdownMenu example into `accessibility-patterns`. Delete `skills/accessibility/` directory.

- **P1-MG2**: Merge `multi-agent-coordination` into `multi-agent-patterns`
  - `multi-agent-coordination` (168 lines) is a strict subset of `multi-agent-patterns` (580 lines).
  - Both cover fan-out, split-role, orchestration.
  - Action: Review `multi-agent-coordination` for any unique sentences/examples → absorb into `multi-agent-patterns`. Delete `skills/multi-agent-coordination/` directory.

---

### P1-High — Oversized Skills (>600 lines, trim to ≤500)

- **P1-SZ1**: `mlops-patterns` — 768 lines, lazy description
  - Split serving patterns and monitoring into separate skills or trim to ≤500 lines. Fix lazy description.

- **P1-SZ2**: `api-docs-patterns` — 784 lines (longest skill)
  - Platform comparison section duplicates `docs-strategy` command content. Trim to ≤500 lines.

- **P1-SZ3**: `django-tdd` — 731 lines
  - Extract framework setup/config sections. Trim repetitive test fixtures. Target ≤500 lines.

- **P1-SZ4**: `iac-modern-patterns` — 713 lines, covers Pulumi/CDK/Bicep/cdktf
  - Too broad. Trim to comparison/decision guide (~200 lines) or split `pulumi-patterns` + `aws-cdk-patterns`.

- **P1-SZ5**: `sdk-design-patterns` — 684 lines, lazy description
  - Trim to ≤500 lines. Fix lazy description.

- **P1-SZ6**: `devsecops-patterns` — 651 lines, lazy description, only 1 example
  - Trim to ≤500 lines. Fix lazy description.

- **P1-SZ7**: `autonomous-loops` — 636 lines, zero labeled examples
  - Trim dense reference material. Add at least 2 labeled use-case examples. Target ≤500 lines.

- **P1-SZ8**: `data-mesh-patterns` — 634 lines, lazy description, zero examples
  - Trim. Fix lazy description. Add ≥1 concrete example.

- **P1-SZ9**: `frontend-patterns` — 641 lines, zero examples
  - Trim. Split React/Next.js-specific patterns from generic frontend patterns.

- **P1-SZ10**: `nodejs-backend-patterns` — 620 lines
  - Trim to ≤500 lines.

- **P1-SZ11**: `privacy-engineering` — 576 lines, lazy description
  - Just under threshold. Fix lazy description. Trim to ≤500 lines.

---

### P1-High — Thin Skills (<120 lines, zero labeled examples)

- **P1-TH1**: `e2e-testing-web3` — 75 lines, 2 code blocks
  - Add wallet rejection flow, network switching example, gas estimation failure test. Target 150+ lines.

- **P1-TH2**: `market-research` — 76 lines, zero code
  - Add ≥1 concrete research output example (TAM table or competitor matrix).

- **P1-TH3**: `investor-outreach` — 78 lines, zero code
  - Add ≥2 concrete cold email and follow-up templates.

- **P1-TH4**: `article-writing` — 87 lines, zero code
  - Add a concrete "bad opening vs good opening" before/after example.

- **P1-TH5**: `investor-materials` — 98 lines, zero code
  - Add a concrete one-pager or pitch deck outline with example content.

- **P1-TH6**: `security-review-web3` — 89 lines, mentions reentrancy but no example
  - Add concrete reentrancy vulnerability + fix code example. Target 150+ lines.

- **P1-TH7**: `progressive-delivery` — 121 lines, all YAML, zero explanatory text
  - Add rollback scenario, manual promotion example, and explanatory text. Target 200+ lines.

- **P1-TH8**: `html-slides` — 183 lines, zero code blocks
  - Add ≥1 complete single-slide HTML example demonstrating viewport-safe CSS. Contradictory for a "how to build HTML slides" skill.

- **P1-TH9**: `content-engine` — 90 lines, zero code
  - Add ≥1 concrete X thread example and ≥1 LinkedIn post derived from a source asset.

---

### P1-High — Reference Fixes

- **P1-RF1**: `strategic-compact` — stale reference to deprecated `continuous-learning`
  - Line 101 references `continuous-learning` instead of `continuous-learning-v2`.
  - Action: Update reference.

- **P1-RF2**: `clarc-onboarding` — unverified command reference + thin example
  - References `/arc42` command — verify it exists in `commands/` or remove reference.
  - Only 1 code block (quick-reference card, not real code). Add ≥1 concrete onboarding session transcript.

---

### P2-Medium — Lazy Descriptions (fix frontmatter description text)

All 15 of these have descriptions like `"Skill: X"` which defeat skill search and routing:

- **P2-LD1**: `android-patterns` — fix description
- **P2-LD2**: `android-testing` — fix description
- **P2-LD3**: `mlops-patterns` — fix description (already in P1-SZ1, combine)
- **P2-LD4**: `sdk-design-patterns` — fix description (already in P1-SZ5, combine)
- **P2-LD5**: `devsecops-patterns` — fix description (already in P1-SZ6, combine)
- **P2-LD6**: `data-mesh-patterns` — fix description (already in P1-SZ8, combine)
- **P2-LD7**: `finops-patterns` — fix description
- **P2-LD8**: `gitops-patterns` — fix description
- **P2-LD9**: `microfrontend-patterns` — fix description
- **P2-LD10**: `mobile-cicd-patterns` — fix description
- **P2-LD11**: `privacy-engineering` — fix description (already in P1-SZ11, combine)
- **P2-LD12**: `webrtc-patterns` — fix description
- **P2-LD13**: `zero-trust-patterns` — fix description
- **P2-LD14**: `frontend-patterns` — fix description (already in P1-SZ9, combine)
- **P2-LD15**: `nodejs-backend-patterns` — fix description (already in P1-SZ10, combine)

---

### P2-Medium — Disambiguation Gaps (add "when to pick this one" note)

- **P2-DM1**: `i18n-patterns` + `i18n-frameworks` — trigger overlap
  - Add a disambiguation note at the top of each: i18n-patterns = architecture/decisions, i18n-frameworks = per-framework setup code.

- **P2-DM2**: `ddd-typescript` + `hexagonal-typescript` — overlapping concerns
  - Add explicit note: DDD = domain modeling, Hexagonal = package structure + dependency direction. Cross-link clearly.

- **P2-DM3**: `ddd-java` + `hexagonal-java` — same issue as TS pair
  - Same fix as P2-DM2.

- **P2-DM4**: `security-review` + `security-scan` — names are confusable
  - `security-review` = code patterns audit; `security-scan` = automated dependency/config scan. Add disambiguation note to both.

---

### P2-Medium — Minor Reference + Content Fixes

- **P2-RF1**: `cost-management` — references `/compact` (reserved Claude Code built-in command)
  - Clarify `/compact` is a built-in Claude command, not a clarc command. Also verify model pricing references.

- **P2-RF2**: `team-foundation` — references `skills/acme` placeholder
  - Replace placeholder with a real skill name or note it explicitly as an example path.

- **P2-RF3**: `search-first` — references `/search-first` command
  - Verify command exists in `commands/` or remove the self-reference.

- **P2-RF4**: `plankton-code-quality` — third-party integration risk
  - Add a "last verified" date and Plankton release version pin.

- **P2-UP1**: `debugging-workflow` — stale Node.js references
  - Update Node.js debugging flags to match current LTS (Node 22+).

- **P2-UP2**: `ci-cd-patterns` — stale version references
  - Fix `postgres:18-alpine` → `postgres:17-alpine` (v18 doesn't exist). Fix `java-version: 25` → `21` (LTS).

- **P2-TH1**: `api-pagination-filtering` — thin on server-side implementation
  - Add a ~20-line Express/Fastify handler showing cursor pagination.

- **P2-TH2**: `context-management` — 165 lines, zero examples
  - Add before/after showing token-efficient vs token-heavy tool usage pattern.

---

## Issue Tracker

| ID | Skill | Category | Status |
|----|-------|----------|--------|
| P0-CR1 | `continuous-learning` | Delete deprecated stub | ✅ |
| P0-CR2 | `go-patterns-advanced` | Fix broken ref `golang-patterns` → `go-patterns` | ✅ |
| P0-CR3 | `go-testing-advanced` | Fix broken ref `golang-testing` → `go-testing` | ✅ |
| P0-CR4 | `go-testing` | Fix broken ref `golang-testing-advanced` → `go-testing-advanced` | ✅ |
| P0-CR5 | `cpp-patterns` | Fix broken ref `cpp-coding-standards-advanced` → `cpp-patterns-advanced` | ✅ |
| P0-CR6 | `configure-ecc` | Fix broken refs + path mismatch + ECC→clarc rename | ✅ |
| P1-MG1 | `accessibility` | Merge into `accessibility-patterns` + delete | ✅ |
| P1-MG2 | `multi-agent-coordination` | Merge into `multi-agent-patterns` + delete | ✅ |
| P1-SZ1 | `mlops-patterns` | Trim to ≤500 lines + fix lazy desc | ✅ |
| P1-SZ2 | `api-docs-patterns` | Trim to ≤500 lines | ✅ |
| P1-SZ3 | `django-tdd` | Trim to ≤500 lines | ✅ |
| P1-SZ4 | `iac-modern-patterns` | Trim/split to ≤500 lines | ✅ |
| P1-SZ5 | `sdk-design-patterns` | Trim to ≤500 lines + fix lazy desc | ✅ |
| P1-SZ6 | `devsecops-patterns` | Trim to ≤500 lines + fix lazy desc | ✅ |
| P1-SZ7 | `autonomous-loops` | Trim + add examples | ✅ |
| P1-SZ8 | `data-mesh-patterns` | Trim + fix lazy desc + add example | ✅ |
| P1-SZ9 | `frontend-patterns` | Trim + fix lazy desc | ✅ |
| P1-SZ10 | `nodejs-backend-patterns` | Trim to ≤500 lines | ✅ |
| P1-SZ11 | `privacy-engineering` | Trim to ≤500 lines + fix lazy desc | ✅ |
| P1-TH1 | `e2e-testing-web3` | Expand to 150+ lines with examples | ✅ |
| P1-TH2 | `market-research` | Add ≥1 research output example | ✅ |
| P1-TH3 | `investor-outreach` | Add email templates | ✅ |
| P1-TH4 | `article-writing` | Add before/after opening example | ✅ |
| P1-TH5 | `investor-materials` | Add one-pager outline + example | ✅ |
| P1-TH6 | `security-review-web3` | Add reentrancy code example | ✅ |
| P1-TH7 | `progressive-delivery` | Expand rollback + explanatory text | ✅ |
| P1-TH8 | `html-slides` | Add complete slide HTML/CSS example | ✅ |
| P1-TH9 | `content-engine` | Add X thread + LinkedIn post examples | ✅ |
| P1-RF1 | `strategic-compact` | Fix ref `continuous-learning` → `v2` | ✅ |
| P1-RF2 | `clarc-onboarding` | Verify `/arc42` ref + add example | ✅ |
| P2-LD1 | `android-patterns` | Fix lazy description | ✅ |
| P2-LD2 | `android-testing` | Fix lazy description | ✅ |
| P2-LD7 | `finops-patterns` | Fix lazy description | ✅ |
| P2-LD8 | `gitops-patterns` | Fix lazy description | ✅ |
| P2-LD9 | `microfrontend-patterns` | Fix lazy description | ✅ |
| P2-LD10 | `mobile-cicd-patterns` | Fix lazy description | ✅ |
| P2-LD12 | `webrtc-patterns` | Fix lazy description | ✅ |
| P2-LD13 | `zero-trust-patterns` | Fix lazy description | ✅ |
| P2-DM1 | `i18n-patterns` + `i18n-frameworks` | Add disambiguation notes | ✅ |
| P2-DM2 | `ddd-typescript` + `hexagonal-typescript` | Add disambiguation notes | ✅ |
| P2-DM3 | `ddd-java` + `hexagonal-java` | Add disambiguation notes | ✅ |
| P2-DM4 | `security-review` + `security-scan` | Add disambiguation notes | ✅ |
| P2-RF1 | `cost-management` | Fix `/compact` reference + verify pricing | ✅ |
| P2-RF2 | `team-foundation` | Fix `skills/acme` placeholder | ✅ |
| P2-RF3 | `search-first` | Verify `/search-first` command ref | ✅ |
| P2-RF4 | `plankton-code-quality` | Add last-verified date + version pin | ✅ |
| P2-UP1 | `debugging-workflow` | Update Node.js LTS references | ✅ |
| P2-UP2 | `ci-cd-patterns` | Verify version refs (postgres:18-alpine, java-version: 25 confirmed current) | ✅ |
| P2-TH1 | `api-pagination-filtering` | Add cursor pagination server example | ✅ |
| P2-TH2 | `context-management` | Add before/after token efficiency example | ✅ |

# clarc Skills Quality Analysis — 2026-03-10

**Corpus:** 228 skills total
**Sample:** 25 skills across 6 categories (core methodology, language patterns, architecture, testing, infrastructure, newer/recent)
**Scoring:** 7 dimensions × weight → overall 0–10

---

## Scoring Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Actionability Ratio | 25% | % of lines that are code/commands vs. prose |
| Trigger Precision | 20% | Specificity of "When to Activate" section |
| Example Completeness | 20% | Completeness and runnability of examples |
| Internal Consistency | 15% | Absence of contradictions, consistent terminology |
| Length Calibration | 10% | 100–300 lines ideal; penalties for <50 or >400 |
| Cross-Reference Validity | 5% | All referenced skills/agents/commands exist |
| Freshness | 5% | Current library versions, API names, patterns |

---

## Overall Corpus Health: 8.1 / 10

22 of 25 skills score above 7.5. No critical failures. The dominant issues are length creep in infrastructure skills, overly broad triggers in language-pattern skills, and isolated domain-specific content leaking into general-purpose skills.

---

## Scores by Skill

| Skill | Lines | Code% | Overall | Weakest Dimension |
|-------|-------|--------|---------|-------------------|
| hexagonal-typescript | 474 | 58% | **8.7** | length (474 lines) |
| ddd-typescript | 374 | 52% | **8.6** | trigger (minor) |
| kubernetes-patterns | 329 | 55% | **8.5** | freshness (minor) |
| agent-evolution-patterns | 203 | 46% | **8.4** | — |
| observability | 416 | 49% | **8.3** | description mismatch (no Java examples despite claim) |
| continuous-learning-v2 | 389 | 41% | **8.3** | length (389 lines) |
| multi-agent-patterns | 504 | 52% | **8.3** | length (504 lines) |
| instinct-lifecycle | 173 | 44% | **8.3** | — |
| swift-patterns | 396 | 50% | **8.3** | length (396 lines) |
| docker-patterns | 363 | 52% | **8.3** | pre-release image tags (fixed this session) |
| typescript-testing | 195 | 46% | **8.0** | — |
| e2e-testing | 334 | 48% | **8.0** | domain-specific leakage (Solana/Web3) |
| clarc-way | 203 | 35% | **8.0** | actionability (35%) |
| terraform-patterns | 550 | 53% | **8.1** | length (550 lines) |
| go-testing | 330 | 52% | **8.1** | — |
| skill-stocktake | 176 | 38% | **8.1** | actionability (38%) |
| typescript-patterns | 368 | 46% | **7.9** | trigger (too broad) |
| strategic-ddd | 459 | 44% | **7.8** | length (459 lines) |
| rust-patterns | 670 | 51% | **7.8** | length (670 lines) — needs split |
| api-design | 613 | 49% | **7.8** | length (613 lines) — needs split |
| gitops-patterns | 616 | 52% | **7.9** | length (616 lines) — needs split |
| go-patterns | 428 | 49% | **7.5** | trigger (too broad) |
| python-patterns | 439 | 47% | **7.5** | trigger (too broad) |
| tdd-workflow | 411 | 43% | **7.4** | freshness (GH Actions v3 → should be v4) |
| security-review | 494 | 38% | **7.0** | domain leakage, trigger, actionability |

---

## Top 5 Strongest Skills

### 1. hexagonal-typescript — 8.7
Every concept backed by a runnable code snippet. WRONG/CORRECT anti-pattern pairs make trade-offs immediately actionable.
**Pattern:** Lead with architecture diagram → file structure → complete port interface → adapter implementation → anti-patterns.

### 2. ddd-typescript — 8.6
Tactical DDD patterns each get a concrete TypeScript class — not pseudo-code. WRONG/CORRECT pairs for every pattern.

### 3. kubernetes-patterns — 8.5
Stays at 329 lines by covering only the most common patterns. Every YAML block is complete and directly deployable.
**Pattern:** For infrastructure skills, stay strictly within one platform and omit patterns that belong in a different skill.

### 4. agent-evolution-patterns — 8.4
Step-by-step promotion workflow shown with actual terminal output including interactive prompt options ([A]pply / [S]kip / [E]dit). Rollback protocol explicit and tied to real commands.

### 5. observability — 8.3
Covers all four observability pillars with multi-language examples (Node.js pino, Python structlog, Go slog, Prometheus).
**Known issue:** Description claims Java examples that don't appear — fix the frontmatter description.

---

## Top 5 Weakest Skills

### 1. security-review — 7.0
- Trigger is too broad: "any code with security implications" — activates on almost every task
- Actionability at 38%: 10-section checklist is mostly prose bullets rather than code
- Contains a Solana/Web3 section that doesn't belong in a general-purpose security skill
- WRONG/CORRECT pairs appear only in 3 of 10 sections

**Fix:** Narrow trigger to auth/authorization/input handling/API endpoints/secrets. Add WRONG/CORRECT pairs. Extract Solana content.

### 2. tdd-workflow — 7.4
- GitHub Actions references `actions/checkout@v3` and `actions/setup-node@v3` — both superseded by v4
- At 411 lines, slightly above ideal range

**Fix:** Update @v3 → @v4. Consider extracting CI section into `tdd-ci-patterns`.

### 3. go-patterns / python-patterns — 7.5 each
- Trigger: "Use when writing Go/Python code" — activates on every Go/Python task
- Both slightly above 400 lines
- Don't cross-reference companion testing skills

**Fix:** Narrow triggers. Add `See also: go-testing`/`See also: python-testing` cross-references.

---

## Systemic Patterns

### Pattern 1: Overly Broad Triggers (~20% of skills)
**Fix template:**
```
BEFORE: Use when writing Go code.
AFTER:  Use when designing Go packages, selecting error handling strategies (sentinel errors,
        error wrapping, custom types), or structuring a service with hexagonal architecture in Go.
```
**Affected:** go-patterns, python-patterns, security-review, typescript-patterns (partial), strategic-ddd (partial)

### Pattern 2: Length Creep in Infrastructure/Architecture Skills
Six skills exceed 400 lines:

| Skill | Current Lines | Proposed Split |
|-------|--------------|----------------|
| rust-patterns | 670 | rust-patterns (~300) + rust-web-patterns (~300) |
| gitops-patterns | 616 | gitops-patterns (~300) + progressive-delivery (~280) |
| api-design | 613 | api-design (~320) + api-pagination-filtering (~260) |
| terraform-patterns | 550 | terraform-patterns (~300) + terraform-ci (~220) |

**Recommendation:** Add CI lint rule at 500 lines (warn) and 600 lines (block) in `scripts/ci/validate-skill-quality.js`.

### Pattern 3: Domain-Specific Content Leaking into General Skills
- `security-review`: Solana/Web3 security patterns
- `e2e-testing`: Solana wallet interaction, Web3-specific Playwright setup
- `observability`: claims Java examples that are absent

**Fix:** Extract domain-specific sections into new skills: `security-review-web3`, `e2e-testing-web3`.

### Pattern 4: Missing Cross-References Between Complementary Skills
- `go-patterns` → missing `go-testing`
- `typescript-patterns` → missing `typescript-testing`
- `rust-patterns` → missing `async-patterns`
- `security-review` → missing `auth-patterns`

**Fix:** Add `See also:` section (3–5 entries) to every skill with a natural companion.

### Pattern 5: Pre-Release Image Tags (Fixed This Session)
`docker-patterns` used `postgres:18-alpine` and `redis:8-alpine`. Fixed to `postgres:17-alpine`, `redis:7.4-alpine`.

---

## Prioritized Action Items

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| HIGH | Narrow triggers in go-patterns, python-patterns, security-review | Low | High |
| HIGH | Update GitHub Actions v3 → v4 in tdd-workflow | Very Low | Medium |
| HIGH | Remove Solana/Web3 sections from security-review and e2e-testing | Low | Medium |
| MEDIUM | Split rust-patterns into rust-patterns + rust-web-patterns | Medium | Medium |
| MEDIUM | Split gitops-patterns into gitops-patterns + progressive-delivery | Medium | Medium |
| MEDIUM | Split api-design into api-design + api-pagination-filtering | Medium | Medium |
| MEDIUM | Add See also cross-references to go-patterns, typescript-patterns, security-review | Low | Medium |
| MEDIUM | Fix observability description (remove Java claim) | Very Low | Low |
| LOW | Add CI lint rule: warn at 500 lines, block at 600 lines | Low | High (preventive) |
| LOW | Increase actionability in clarc-way and skill-stocktake | Medium | Medium |

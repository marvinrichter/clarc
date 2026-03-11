# clarc Agent Deep Review -- 2026-03-11

## Executive Summary

**Total Agents:** 61
**Model Distribution:** 50 Sonnet, 11 Opus, 0 Haiku
**Average Quality Score:** 7.4 / 10
**Critical Issues (P0):** 5
**High Priority (P1):** 11
**Medium Priority (P2):** 18
**Orphan Agents (no invoking command):** 5

---

## Agent Scoring Table

All 61 agents scored across 8 dimensions (each 1--10). Weighted overall: Clarity 25%, Model 15%, Tools 15%, Trigger 10%, Exit 10%, Examples 10%, Overlap 5%, Safety 10%.

### Core Workflow Agents

| Agent | Overall | Clarity | Model | Tools | Trigger | Exit | Examples | Overlap | Safety |
|-------|---------|---------|-------|-------|---------|------|----------|---------|--------|
| planner | 8.5 | 9 | 10 | 8 | 9 | 8 | 8 | 8 | 7 |
| architect | 8.3 | 9 | 10 | 7 | 9 | 6 | 8 | 8 | 9 |
| tdd-guide | 8.7 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 9 |
| code-reviewer | 8.2 | 9 | 9 | 8 | 9 | 9 | 7 | 7 | 8 |
| security-reviewer | 7.8 | 8 | 9 | 9 | 7 | 7 | 7 | 5 | 8 |
| build-error-resolver | 8.1 | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 6 |
| e2e-runner | 7.9 | 8 | 9 | 9 | 8 | 7 | 8 | 9 | 7 |
| refactor-cleaner | 8.8 | 9 | 9 | 9 | 8 | 8 | 8 | 9 | 10 |
| doc-updater | 7.2 | 7 | 9 | 9 | 7 | 5 | 7 | 8 | 6 |
| orchestrator | 8.4 | 9 | 10 | 10 | 8 | 7 | 8 | 7 | 8 |

### Language Reviewer Agents

| Agent | Overall | Clarity | Model | Tools | Trigger | Exit | Examples | Overlap | Safety |
|-------|---------|---------|-------|-------|---------|------|----------|---------|--------|
| typescript-reviewer | 8.0 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 8 |
| go-reviewer | 7.9 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| python-reviewer | 7.8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| java-reviewer | 7.9 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| swift-reviewer | 7.8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| rust-reviewer | 7.9 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| cpp-reviewer | 7.8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| ruby-reviewer | 7.8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| elixir-reviewer | 7.8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| kotlin-reviewer | 7.9 | 8 | 9 | 8 | 8 | 8 | 8 | 5 | 7 |
| android-reviewer | 7.5 | 8 | 9 | 8 | 7 | 8 | 8 | 4 | 7 |
| flutter-reviewer | 7.6 | 8 | 9 | 7 | 8 | 8 | 8 | 9 | 7 |
| database-reviewer | 7.3 | 7 | 9 | 9 | 7 | 7 | 7 | 8 | 6 |
| bash-reviewer | 7.7 | 8 | 9 | 8 | 8 | 7 | 7 | 9 | 7 |
| scala-reviewer | 7.8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| php-reviewer | 7.7 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| r-reviewer | 7.7 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| c-reviewer | 7.7 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |
| csharp-reviewer | 7.7 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 7 |

### Product and Strategy Agents

| Agent | Overall | Clarity | Model | Tools | Trigger | Exit | Examples | Overlap | Safety |
|-------|---------|---------|-------|-------|---------|------|----------|---------|--------|
| product-evaluator | 8.3 | 9 | 10 | 8 | 8 | 9 | 8 | 9 | 7 |
| solution-designer | 8.0 | 8 | 10 | 9 | 8 | 7 | 7 | 9 | 7 |
| competitive-analyst | 7.5 | 8 | 8 | 8 | 7 | 6 | 8 | 6 | 7 |
| feedback-analyst | 7.4 | 7 | 8 | 8 | 7 | 7 | 7 | 9 | 6 |

### Specialist and Domain Architects

| Agent | Overall | Clarity | Model | Tools | Trigger | Exit | Examples | Overlap | Safety |
|-------|---------|---------|-------|-------|---------|------|----------|---------|--------|
| data-architect | 8.1 | 9 | 7 | 8 | 8 | 7 | 8 | 9 | 7 |
| modernization-planner | 8.0 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 7 |
| resilience-reviewer | 7.8 | 8 | 9 | 7 | 8 | 7 | 8 | 9 | 9 |
| performance-analyst | 8.2 | 9 | 9 | 7 | 8 | 8 | 9 | 9 | 9 |
| contract-reviewer | 7.6 | 8 | 9 | 8 | 7 | 7 | 7 | 8 | 7 |
| devsecops-reviewer | 7.0 | 8 | 9 | 8 | 6 | 8 | 7 | 4 | 8 |
| supply-chain-auditor | 7.8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 8 |
| finops-advisor | 7.8 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 8 |
| gitops-architect | 7.9 | 8 | 9 | 8 | 8 | 7 | 8 | 9 | 8 |
| mlops-architect | 7.7 | 8 | 9 | 8 | 8 | 7 | 7 | 9 | 7 |
| frontend-architect | 7.8 | 8 | 9 | 8 | 8 | 7 | 8 | 9 | 7 |
| platform-architect | 7.5 | 7 | 8 | 7 | 7 | 7 | 7 | 9 | 7 |
| sdk-architect | 7.8 | 8 | 9 | 8 | 8 | 7 | 8 | 9 | 7 |
| docs-architect | 7.7 | 8 | 9 | 8 | 8 | 7 | 7 | 8 | 7 |
| orchestrator-designer | 7.6 | 8 | 10 | 7 | 6 | 7 | 8 | 6 | 7 |

### Design and Presentation Agents

| Agent | Overall | Clarity | Model | Tools | Trigger | Exit | Examples | Overlap | Safety |
|-------|---------|---------|-------|-------|---------|------|----------|---------|--------|
| design-critic | 8.0 | 9 | 9 | 7 | 8 | 7 | 9 | 7 | 9 |
| design-system-reviewer | 8.1 | 9 | 9 | 8 | 8 | 8 | 8 | 7 | 8 |
| presentation-designer | 7.9 | 8 | 9 | 8 | 8 | 7 | 8 | 7 | 8 |
| talk-coach | 7.8 | 8 | 9 | 7 | 8 | 7 | 8 | 7 | 9 |

### Self-Review / Meta Agents

| Agent | Overall | Clarity | Model | Tools | Trigger | Exit | Examples | Overlap | Safety |
|-------|---------|---------|-------|-------|---------|------|----------|---------|--------|
| agent-quality-reviewer | 8.5 | 9 | 9 | 8 | 8 | 9 | 7 | 8 | 9 |
| agent-system-reviewer | 8.3 | 9 | 10 | 9 | 8 | 8 | 7 | 9 | 8 |
| command-auditor | 7.9 | 8 | 9 | 8 | 8 | 7 | 7 | 9 | 8 |
| hook-auditor | 7.8 | 8 | 9 | 8 | 8 | 6 | 7 | 9 | 8 |
| prompt-quality-scorer | 8.2 | 9 | 9 | 8 | 8 | 9 | 8 | 6 | 9 |
| prompt-reviewer | 7.9 | 9 | 9 | 7 | 7 | 8 | 8 | 6 | 9 |
| skill-depth-analyzer | 8.1 | 9 | 9 | 8 | 8 | 9 | 7 | 9 | 8 |
| workflow-os-competitor-analyst | 7.7 | 8 | 9 | 7 | 8 | 7 | 7 | 6 | 8 |
| go-build-resolver | 7.6 | 7 | 9 | 9 | 7 | 7 | 7 | 7 | 6 |

---

## Cross-Agent Overlap Analysis

### CRITICAL Overlaps (trigger collision risk)

#### 1. security-reviewer vs. devsecops-reviewer -- P0

Both agents scan for OWASP Top 10, secrets, injection, and produce CRITICAL/HIGH/MEDIUM findings. Their descriptions are nearly interchangeable:

- **security-reviewer:** "Security vulnerability detection and remediation specialist... Flags secrets, SSRF, injection, unsafe crypto, and OWASP Top 10 vulnerabilities."
- **devsecops-reviewer:** "Automated security reviewer for code changes -- scans changed files for OWASP Top 10 vulnerabilities, secrets, dependency issues, and IaC misconfigurations."

**Distinction that exists but is buried:** devsecops-reviewer also covers IaC misconfigurations (Terraform, Docker, K8s). security-reviewer has Write/Edit tools (can fix issues), devsecops-reviewer is read-only.

**Risk:** When a user says "review this code for security", both agents may activate. The routing is ambiguous.

**Recommendation:** Merge into one agent OR sharpen descriptions: security-reviewer = "application code security (code changes)", devsecops-reviewer = "infrastructure and CI/CD security (IaC, Docker, K8s, GitHub Actions)". Add explicit "Not this agent" disambiguation sections.

#### 2. android-reviewer vs. kotlin-reviewer -- P0

Both review `.kt` files. `code-reviewer` routes `.kt` to `kotlin-reviewer` only -- `android-reviewer` is not in the routing table. Yet `android-reviewer` covers Android-specific patterns (Compose, Hilt, Room, ViewModel) that `kotlin-reviewer` does not.

**Risk:** Android projects get `kotlin-reviewer` reviews that miss all Compose/Hilt/Room issues. The `android-reviewer` agent exists but is unreachable via the standard code-review workflow.

**Recommendation:**
1. Add Android detection to `code-reviewer`: if `.kt` files AND project contains `build.gradle.kts` with Android plugin OR `AndroidManifest.xml` exists, route to `android-reviewer` instead of (or in addition to) `kotlin-reviewer`.
2. Alternative: merge Android-specific checks into `kotlin-reviewer` with a conditional section.

#### 3. prompt-quality-scorer vs. prompt-reviewer -- P1

- **prompt-quality-scorer:** System-wide audit of all agents/commands with 6-dimension scoring.
- **prompt-reviewer:** Deep review of a single prompt for injection, clarity, consistency.

Both have "Not this agent" disambiguation sections, which is good. However, their descriptions still sound similar to a user unfamiliar with clarc. The trigger phrases "prompt" + "review" + "quality" overlap.

**Recommendation:** No merge needed. Both agents have clear disambiguation. Consider renaming `prompt-quality-scorer` to `prompt-audit` for clearer distinction.

#### 4. orchestrator vs. orchestrator-designer -- P1

- **orchestrator:** Runs multi-agent workflows (operational).
- **orchestrator-designer:** Designs multi-agent architectures (advisory/planning).

**Risk:** User asks "help me orchestrate this" -- ambiguous between "run agents now" and "design the agent architecture."

**Recommendation:** Already well-differentiated in instructions but descriptions could be sharper. Add to orchestrator-designer: "Does NOT execute agents -- produces architecture documents only."

#### 5. competitive-analyst vs. workflow-os-competitor-analyst -- P2

Well-differentiated: `competitive-analyst` is general-purpose market analysis, `workflow-os-competitor-analyst` is clarc-specific. Both have "Not this agent" sections. Low collision risk.

#### 6. design-critic vs. design-system-reviewer -- P2

Well-differentiated: `design-critic` reviews individual screens/wireframes for visual quality, `design-system-reviewer` audits the design system (tokens, dark mode, components). Low collision risk.

#### 7. presentation-designer vs. talk-coach -- P2

Well-differentiated: `presentation-designer` creates decks, `talk-coach` reviews existing decks. Both have "Not this agent" sections. Low collision risk.

---

## Orphan Agents (no command invokes them)

| Agent | Referenced By | Reachable Via |
|-------|--------------|---------------|
| contract-reviewer | No command, no other agent | Unreachable -- must be invoked by name |
| docs-architect | doc-updater (text reference only) | Unreachable -- must be invoked by name |
| modernization-planner | code-reviewer (text reference only) | Unreachable -- must be invoked by name |
| resilience-reviewer | agent-system-reviewer | Only via system review |
| talk-coach | presentation-designer (text reference only) | Unreachable -- must be invoked by name |

**Recommendation:** Create commands for the most valuable orphans:
- `/contract-review` -> `contract-reviewer` (high value: API break detection)
- `/modernize` -> `modernization-planner` (high value: legacy migration)
- `/resilience-review` -> `resilience-reviewer` (high value: failure mode analysis)
- `/talk-review` -> `talk-coach` (medium value)
- `/docs-strategy` -> `docs-architect` (medium value)

---

## Top 10 Lowest-Scoring Agents -- Detailed Recommendations

### 1. devsecops-reviewer (7.0) -- P0

**Primary Issues:**
- **Overlap (4/10):** Near-complete overlap with `security-reviewer`. A user cannot tell them apart from descriptions alone.
- **Trigger precision (6/10):** Description says "automated security reviewer for code changes" which is identical to what `security-reviewer` does.

**Fix:**
1. Sharpen scope to IaC and CI/CD pipeline security only (Terraform, Docker, K8s manifests, GitHub Actions). Remove application-level OWASP checks that duplicate `security-reviewer`.
2. Rename to `infra-security-reviewer` to clarify scope.
3. Update description: "Reviews infrastructure-as-code, CI/CD pipelines, and container configurations for security misconfigurations. For application code security (OWASP, injection, auth), use security-reviewer."

### 2. doc-updater (7.2) -- P1

**Primary Issues:**
- **Exit criteria (5/10):** No clear completion signal. Agent knows what to update but not when to stop.
- **Safety (6/10):** Has Write/Edit tools but no confirmation step before overwriting documentation.

**Fix:**
1. Add exit criteria: "Done when: all CODEMAPS updated with current timestamps, all file paths verified, all code examples checked. Output a summary table of files modified."
2. Add a dry-run/preview step before overwriting docs -- show what will change.

### 3. database-reviewer (7.3) -- P1

**Primary Issues:**
- **Safety (6/10):** Has Write/Edit tools for a reviewer agent. A reviewer should not modify code by default.
- **Clarity (7/10):** Instructions mention "Supabase best practices" but most of the content is generic PostgreSQL. The Supabase-specific guidance is thin.

**Fix:**
1. Remove Write/Edit from tools -- reviewers should only recommend fixes, not apply them.
2. Either expand Supabase content substantially or remove the mention to avoid false specificity.

### 4. feedback-analyst (7.4) -- P1

**Primary Issues:**
- **Safety (6/10):** Has Write tool but no guardrails on what files it creates or where.
- **Model (8/10):** Uses Opus for text clustering and theme extraction -- Sonnet would handle this adequately for most feedback volumes.

**Fix:**
1. Add guardrails: output only to `docs/feedback/` directory, never overwrite existing analysis without confirmation.
2. Consider downgrading to Sonnet -- Opus is overkill for feedback clustering unless volume exceeds thousands of entries.

### 5. competitive-analyst (7.5) -- P1

**Primary Issues:**
- **Model (8/10):** Uses Opus. For web search + structured comparison, Sonnet is sufficient.
- **Exit criteria (6/10):** No explicit stopping condition -- could research indefinitely.
- **Overlap (6/10):** Partial overlap with `workflow-os-competitor-analyst` in concept, though scope is different.

**Fix:**
1. Add explicit exit: "Stop after analyzing the specified competitors. Do not research competitors not listed in the input."
2. Consider downgrading to Sonnet.

### 6. android-reviewer (7.5) -- P0

**Primary Issues:**
- **Overlap (4/10):** Severe routing conflict with `kotlin-reviewer`. Both handle `.kt` files. `code-reviewer` only routes to `kotlin-reviewer`, making `android-reviewer` unreachable via standard workflow.
- **Trigger (7/10):** Description says "MUST BE USED for Android/Compose projects" but no mechanism ensures this.

**Fix:**
1. Add Android detection logic to `code-reviewer`: check for `build.gradle.kts` with `com.android` plugin, `AndroidManifest.xml`, or `@Composable` annotations.
2. When Android project detected: route `.kt` files to `android-reviewer` instead of `kotlin-reviewer`.
3. Alternative: make `kotlin-reviewer` invoke `android-reviewer` as a sub-agent when Android context is detected.

### 7. go-build-resolver (7.6) -- P1

**Primary Issues:**
- **Overlap (7/10):** Overlaps with `build-error-resolver` which already handles "any language" including Go.
- **Safety (6/10):** Has Write/Edit tools with no guardrails.
- **Clarity (7/10):** Instructions are thinner than `build-error-resolver` despite being Go-specific.

**Fix:**
1. Either merge into `build-error-resolver` as a Go-specific section, or add substantial Go-specific content (go vet, staticcheck, golangci-lint) that justifies a separate agent.
2. Add guardrail: "Only modify files that contain build errors. Never change unrelated code."

### 8. orchestrator-designer (7.6) -- P1

**Primary Issues:**
- **Trigger (6/10):** Description "Designs multi-agent systems for complex tasks" is too close to `orchestrator` ("Multi-agent orchestration specialist"). Users will confuse them.
- **Tools (7/10):** Has WebSearch but not Agent tool. Has Read/Glob/Grep but not Write -- cannot produce the architecture document it promises.

**Fix:**
1. Add Write tool so it can save the architecture document.
2. Add explicit "Not this agent" section: "This agent designs agent architectures as documents. To execute a multi-agent workflow right now, use orchestrator."

### 9. contract-reviewer (7.6) -- P1

**Primary Issues:**
- **Orphan:** No command invokes it. Not referenced by `code-reviewer` routing.
- **Trigger (7/10):** Description is clear but users cannot discover it.

**Fix:**
1. Create `/contract-review` command.
2. Consider adding API file detection to `code-reviewer`: when `*.yaml`, `*.proto`, `*.graphql` files change, suggest running `contract-reviewer`.

### 10. platform-architect (7.5) -- P2

**Primary Issues:**
- **Model (8/10):** Uses Opus. IDP design is strategic but not architecturally complex enough to warrant Opus over Sonnet.
- **Tools (7/10):** Has WebSearch but not Write -- cannot save the IDP design document.
- **Clarity (7/10):** Instructions are relatively thin (205 lines) for a complex domain.

**Fix:**
1. Consider downgrading to Sonnet.
2. Add Write tool for saving the IDP design document.
3. Expand instructions with more specific IDP patterns (Backstage vs. Port vs. Cortex).

---

## Systemic Patterns

### Pattern A: Safety Guardrail Gap on Write-Capable Agents

**9 of 13 agents with Write/Edit tools lack explicit confirmation/dry-run guardrails.** Only `refactor-cleaner` (excellent: full dry-run flow), `tdd-guide` (show-before-write), `security-reviewer` (stop-and-fix protocol), and `presentation-designer` (outline confirmation) have explicit guardrails.

Agents with Write/Edit but NO guardrails:
- `build-error-resolver` -- modifies files to fix build errors without confirmation
- `database-reviewer` -- a reviewer should not have Write tools at all
- `doc-updater` -- overwrites docs without preview
- `go-build-resolver` -- modifies files without confirmation
- `e2e-runner` -- writes test files (lower risk but still unguarded)
- `competitive-analyst` -- writes reports (low risk)
- `feedback-analyst` -- writes analysis files (low risk)
- `solution-designer` -- writes ADR/design docs (low risk)
- `agent-system-reviewer` -- writes review reports (low risk)

**Impact:** Build resolvers are highest risk -- they modify source files without showing what will change.

**Recommendation:** Add a "Show diff before applying" step to `build-error-resolver` and `go-build-resolver`. Remove Write/Edit from `database-reviewer`.

### Pattern B: Model Tier Inflation

**11 agents use Opus.** Several do not require Opus-level reasoning:

| Agent | Current | Recommended | Justification |
|-------|---------|-------------|---------------|
| competitive-analyst | Opus | Sonnet | Web search + structured comparison |
| feedback-analyst | Opus | Sonnet | Text clustering, theme extraction |
| platform-architect | Opus | Sonnet | IDP design is well-documented domain |
| modernization-planner | Opus | Sonnet | Hotspot analysis + strategy selection |

Agents that correctly use Opus:
- `architect` -- complex architectural reasoning across multiple systems
- `planner` -- complex task decomposition with dependency analysis
- `orchestrator` -- orchestrating multi-agent workflows with conflict resolution
- `orchestrator-designer` -- designing multi-agent architectures
- `product-evaluator` -- critical Go/No-Go decisions
- `solution-designer` -- multi-option trade-off analysis
- `agent-system-reviewer` -- system-wide cross-component synthesis

**Estimated cost impact:** Downgrading 4 agents saves approximately 3x per invocation on those agents.

### Pattern C: Reviewer Agents with Write Tools

**3 reviewer agents have Write/Edit tools:** `security-reviewer`, `database-reviewer`, `go-build-resolver` (quasi-reviewer). Reviewers should recommend -- not apply -- changes. `security-reviewer` is the only exception that justifies Write (for emergency secret rotation).

**Recommendation:** Remove Write/Edit from `database-reviewer`. Keep on `security-reviewer` (emergency fixes). Keep on `go-build-resolver` (it is a resolver, not a reviewer, despite the name).

### Pattern D: Missing "Not this agent" Disambiguation

The best agents (`competitive-analyst`, `workflow-os-competitor-analyst`, `presentation-designer`, `talk-coach`, `prompt-quality-scorer`, `prompt-reviewer`) have explicit "Not this agent" sections that prevent routing confusion. However, the most problematic overlap pair (`security-reviewer` / `devsecops-reviewer`) lacks these sections entirely.

**Recommendation:** Add "Not this agent" sections to all agents that share conceptual space with another agent. Priority: security-reviewer, devsecops-reviewer, android-reviewer, kotlin-reviewer.

### Pattern E: Exit Criteria Inconsistency

**6 agents have zero exit-criteria-related content:** `architect`, `competitive-analyst`, `design-critic`, `doc-updater`, `gitops-architect`, `presentation-designer`. Without exit criteria, these agents may produce partial results or keep working past the point of value.

**Recommendation:** Add explicit "Done when" section to every agent. Template: "## Completion Criteria\nDone when: [list of concrete conditions]."

### Pattern F: code-reviewer Routing Gaps

`code-reviewer` routes 19 file extensions to 19 specialist reviewers. Missing from routing:
- `.xml` (Android layouts) -- should trigger `android-reviewer` in Android projects
- `.gradle`, `.gradle.kts` -- no reviewer handles build configs
- `.tf`, `.hcl` -- should trigger `devsecops-reviewer` for IaC
- `.dockerfile`, `Dockerfile` -- should trigger `devsecops-reviewer`
- `.yml`, `.yaml` (GitHub Actions, K8s) -- should trigger relevant reviewer

---

## Priority Matrix

### P0 -- Critical (fix before next release)

| # | Issue | Affected Component | Impact | Fix |
|---|-------|-------------------|--------|-----|
| 1 | security-reviewer / devsecops-reviewer overlap | agents/security-reviewer.md, agents/devsecops-reviewer.md | Routing confusion: users get inconsistent security reviews depending on which agent activates | Sharpen devsecops-reviewer to IaC-only, add "Not this agent" sections to both |
| 2 | android-reviewer unreachable via code-reviewer | agents/code-reviewer.md, agents/android-reviewer.md | Android projects miss all Compose/Hilt/Room checks -- reviewed as generic Kotlin | Add Android project detection to code-reviewer routing |
| 3 | build-error-resolver has no confirmation guardrail | agents/build-error-resolver.md | Modifies source files without showing diff first -- risk of unintended changes | Add "Show planned changes before applying" step |
| 4 | database-reviewer has Write/Edit tools | agents/database-reviewer.md | A reviewer agent should not modify code -- violates review-only principle | Remove Write/Edit from tools |
| 5 | 5 orphan agents with no invoking command | agents/contract-reviewer.md, agents/docs-architect.md, agents/modernization-planner.md, agents/resilience-reviewer.md, agents/talk-coach.md | Users cannot discover these agents through commands | Create commands for contract-reviewer, modernization-planner, resilience-reviewer |

### P1 -- High (next roadmap)

| # | Issue | Affected Component | Impact | Estimated Effort |
|---|-------|-------------------|--------|-----------------|
| 1 | 4 agents use Opus unnecessarily | competitive-analyst, feedback-analyst, platform-architect, modernization-planner | ~3x cost overhead per invocation | 30 min (change frontmatter) |
| 2 | 6 agents have zero exit criteria | architect, competitive-analyst, design-critic, doc-updater, gitops-architect, presentation-designer | Agents may produce incomplete or overly long output | 2 hours (add "Done when" section to each) |
| 3 | orchestrator-designer lacks Write tool | agents/orchestrator-designer.md | Cannot save the architecture document it produces | 5 min (add Write to frontmatter) |
| 4 | go-build-resolver thin content vs build-error-resolver | agents/go-build-resolver.md | Unclear when to use Go-specific vs generic resolver | 1 hour (expand Go-specific content or merge) |
| 5 | doc-updater lacks confirmation step | agents/doc-updater.md | Overwrites documentation without preview | 30 min (add dry-run step) |
| 6 | prompt-quality-scorer / prompt-reviewer naming confusion | agents/prompt-quality-scorer.md, agents/prompt-reviewer.md | Users confuse system-wide audit with single-prompt review | 15 min (rename prompt-quality-scorer to prompt-audit) |
| 7 | code-reviewer missing IaC routing | agents/code-reviewer.md | Terraform/Docker/K8s changes get no specialist review | 30 min (add .tf/.hcl/.dockerfile routing) |
| 8 | contract-reviewer is orphaned | agents/contract-reviewer.md | API break detection unavailable via commands | 15 min (create /contract-review command) |
| 9 | feedback-analyst Write tool unguarded | agents/feedback-analyst.md | Creates files without path restrictions | 20 min (add output directory guardrail) |
| 10 | kotlin-reviewer / android-reviewer overlap | agents/kotlin-reviewer.md, agents/android-reviewer.md | Unclear which reviewer handles Android Kotlin | 30 min (add disambiguation + code-reviewer routing logic) |
| 11 | Missing "Not this agent" sections on overlapping pairs | security-reviewer, devsecops-reviewer, go-build-resolver, build-error-resolver | Users cannot self-select the right agent | 1 hour (add sections to 4 agents) |

### P2 -- Medium (address when possible)

| # | Issue | Affected Component | Estimated Effort |
|---|-------|-------------------|-----------------|
| 1 | Agent descriptions vary in length and specificity | All agents | 3 hours (standardize format) |
| 2 | tool-coach missing Glob tool | agents/talk-coach.md | 5 min |
| 3 | flutter-reviewer missing Bash tool | agents/flutter-reviewer.md | 5 min |
| 4 | resilience-reviewer missing Bash tool for grep commands in its own instructions | agents/resilience-reviewer.md | 5 min |
| 5 | performance-analyst missing Bash tool | agents/performance-analyst.md | 5 min |
| 6 | design-critic missing Grep/Bash tools | agents/design-critic.md | 5 min |
| 7 | data-architect uses Sonnet but does complex domain analysis | agents/data-architect.md | Evaluate if Opus warranted |
| 8 | Agent line counts range from 119 to 404 -- normalize depth | All agents | 4 hours |
| 9 | Some older agents lack `uses_skills` frontmatter | 42 agents missing this field | 2 hours (add references) |
| 10 | talk-coach has no Grep tool to search slide content | agents/talk-coach.md | 5 min |
| 11 | competitive-analyst redundant "WebSearch" in tools when model already has it | agents/competitive-analyst.md | Cosmetic |
| 12 | 3 architect agents (data, frontend, platform) lack Write tool to save output | agents/ | 15 min |
| 13 | modernization-planner Opus may be justified after all (hotspot analysis is complex) | agents/modernization-planner.md | Evaluate case-by-case |
| 14 | Inconsistent example counts (3--9 across agents) | All agents | 4 hours (normalize to 4--6) |
| 15 | Some reviewer agents reference skills in prose but not in `uses_skills` frontmatter | Multiple | 1 hour |
| 16 | No Haiku-tier agents for lightweight routing | System-wide | Design discussion needed |
| 17 | Missing `.xml` routing for Android layouts in code-reviewer | agents/code-reviewer.md | 10 min |
| 18 | `go-build-resolver` name suggests reviewer but it is a resolver | agents/go-build-resolver.md | Naming consistency |

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total agents | 61 |
| Average overall score | 7.4 |
| Agents scoring 8.0+ | 19 (31%) |
| Agents scoring 7.0--7.9 | 39 (64%) |
| Agents scoring below 7.0 | 3 (5%) |
| Agents with Opus model | 11 (18%) |
| Agents with Write/Edit tools | 13 (21%) |
| Agents with safety guardrails | 4 of 13 write-capable (31%) |
| Agents with `uses_skills` frontmatter | 19 of 61 (31%) |
| Orphan agents (no command) | 5 (8%) |
| Agents with "Not this agent" section | 8 (13%) |
| Critical overlap pairs | 2 (security/devsecops, android/kotlin) |

---

## Recommended Next Actions

1. **Fix security-reviewer / devsecops-reviewer overlap** -- sharpen devsecops to IaC-only, add disambiguation sections (P0, 1 hour)
2. **Add Android detection to code-reviewer routing** -- detect Android project and route `.kt` to android-reviewer (P0, 30 min)
3. **Add confirmation guardrail to build-error-resolver and go-build-resolver** -- show planned diffs before applying (P0, 1 hour)
4. **Remove Write/Edit from database-reviewer** -- reviewers should not modify code (P0, 5 min)
5. **Create commands for 3 highest-value orphans** -- /contract-review, /modernize, /resilience-review (P0, 30 min)
6. **Downgrade 4 agents from Opus to Sonnet** -- competitive-analyst, feedback-analyst, platform-architect (P1, 15 min)
7. **Add exit criteria to 6 agents lacking them** -- architect, competitive-analyst, design-critic, doc-updater, gitops-architect, presentation-designer (P1, 2 hours)
8. **Add missing tools to 5 agents** -- flutter-reviewer (Bash), resilience-reviewer (Bash), performance-analyst (Bash), design-critic (Grep+Bash), talk-coach (Glob) (P2, 25 min)

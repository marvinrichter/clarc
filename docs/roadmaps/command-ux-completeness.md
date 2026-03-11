# Command UX Completeness

**Status:** 📋 Planned
**Date:** 2026-03-11
**Goal:** Zero open findings in the command system audit — every command has an "After This" section, overlaps are disambiguated, step counts are navigable, and all missing commands exist.

## Problem Statement

Command system audit (2026-03-11) scored 7.6/10. Three categories of findings remain:
1. **Feedback loop** — 149/166 commands (90%) have no `## After This` section; users land in a dead-end after every command
2. **Structural bloat** — guide.md (88 steps), multi-execute.md (40), tdd (15 duplicate), system-review (25) are unnavigable
3. **Overlap + gaps** — dep-audit/dep-update/sbom/security-review overlap on vulnerability scanning; design-system-reviewer and supply-chain-auditor agents have no dedicated commands

Target score: **≥ 9.0 / 10** with zero HIGH/MEDIUM findings on the next audit.

## Open Items

### P0 — Structural fixes (HIGH severity)

- **P0-G**: `guide.md` — 88 numbered steps; restructure as dispatch table: detect task type from `$ARGUMENTS`, output focused 3–5 step workflow per type
- **P0-ME**: `multi-execute.md` — 40 flat numbered steps; group into 4–5 Phase sections (each 3–6 sub-steps)

### P1 — New commands (MEDIUM missing-agent)

- **P1-N1**: Add `commands/design-system-review.md` — invokes `design-system-reviewer` agent; full scope (CSS tokens, dark mode, icons, a11y, design-code consistency); cross-ref `storybook-audit` as sub-scope
- **P1-N2**: Add `commands/supply-chain-audit.md` — invokes `supply-chain-auditor` agent; scope: CI/CD pipeline security, GitHub Actions pinning, unsigned artifacts, SLSA; cross-ref `sbom` for SBOM-only workflow

### P1 — Overlap disambiguation (HIGH/MEDIUM overlap)

- **P1-O1**: `dep-audit.md` + `dep-update.md` — add scope ladder comment block to each: dep-audit = "audit-only, no upgrades"; dep-update = "interactive upgrade workflow — run dep-audit first"; cross-reference each other
- **P1-O2**: `security-review.md` + `sbom.md` + `dep-audit.md` — add escalation ladder to each description: dev-time check → dep-audit; release gate + attestation → sbom; full DevSecOps pipeline → security-review; add `## See Also` cross-references in each
- **P1-O3**: `code-review.md` — add routing guidance: "use /code-review for mixed-language repos; use /typescript-review directly for focused TypeScript-only sessions" (and mirror in each language *-review command)
- **P1-O4**: `storybook-audit.md` — add cross-ref: "For a full design system audit (tokens, dark mode, icons, a11y), use /design-system-review instead"

### P1 — Step count restructuring (MEDIUM step_count)

- **P1-S1**: `tdd.md` — consolidate duplicate Red-Green-Refactor enumeration (15 → ~6 steps); keep one definitive workflow section, remove the repeat
- **P1-S2**: `system-review.md` — reduce internal orchestration detail; expose only 3–5 user-facing steps; move orchestration detail to comment block
- **P1-S3**: `multi-plan.md` — group 23 flat steps into 3–4 labelled phases
- **P1-S4**: `docs-review.md` — replace 39 numbered steps with 7 H2 dimension sections each containing a bullet checklist
- **P1-S5**: `checkpoint.md` — group 14 steps into Create / Verify / Restore phases

### P1 — Agent invocation fixes (LOW agent_invocation)

- **P1-A1**: `swift-build.md` — replace `architect` reference in error escalation with `build-error-resolver`
- **P1-A2**: `sbom.md` — add cross-reference to `/supply-chain-audit` for pre-flight supply chain checks

### P1 — Naming clarity (LOW naming)

- **P1-NC1**: `claw.md` — update description to lead with action: "Start an interactive Claude REPL session (NanoClaw)"
- **P1-NC2**: `webrtc-review.md` — add explicit `## Usage` section documenting `$ARGUMENTS` (focus area or empty for full review)

### P2 — After This: *-review language commands (16)

All share the same fix pattern: add `## After This` with `/tdd` (if test gaps flagged), `/code-review` (for mixed-language follow-up), and one language-specific next step.

- **AT-R1**: `bash-review.md` → After: `/tdd`, `/build-fix` for shell errors, `/security-review`
- **AT-R2**: `go-review.md` → After: `/tdd`, `/go-build` for compilation errors, `/security-review`
- **AT-R3**: `java-review.md` → After: `/tdd`, `/build-fix`, `/security-review`
- **AT-R4**: `python-review.md` → After: `/tdd`, `/python-test`, `/security-review`
- **AT-R5**: `r-review.md` → After: `/tdd`, `/build-fix`
- **AT-R6**: `kotlin-review.md` → After: `/tdd`, `/build-fix`, `/android-review` (if Android project)
- **AT-R7**: `csharp-review.md` → After: `/tdd`, `/build-fix`, `/security-review`
- **AT-R8**: `cpp-review.md` → After: `/tdd`, `/cpp-build`, `/security-review`
- **AT-R9**: `scala-review.md` → After: `/tdd`, `/build-fix`
- **AT-R10**: `php-review.md` → After: `/tdd`, `/security-review`
- **AT-R11**: `ruby-review.md` → After: `/tdd`, `/security-review`
- **AT-R12**: `elixir-review.md` → After: `/tdd`, `/build-fix`
- **AT-R13**: `flutter-review.md` → After: `/tdd`, `/mobile-release`
- **AT-R14**: `swift-review.md` → After: `/tdd`, `/swift-build`, `/mobile-release`
- **AT-R15**: `java-review.md` → After: `/tdd`, `/build-fix`, `/security-review`
- **AT-R16**: `frontend-arch-review.md` → After: `/arch-design`, `/tdd`, `/code-review`

### P2 — After This: *-audit commands (13)

- **AT-A1**: `a11y-audit.md` → After: `/tdd` for a11y unit tests, `/code-review`
- **AT-A2**: `command-audit.md` → After: `/system-review components`, `/prompt-audit`
- **AT-A3**: `dark-mode-audit.md` → After: `/code-review`, `/design-system-review`
- **AT-A4**: `dep-audit.md` → After: `/dep-update` for upgrades, `/security-review` for full scan
- **AT-A5**: `eda-review.md` → After: `/code-review`, `/tdd` for idempotency and DLQ tests
- **AT-A6**: `gitops-review.md` → After: `/iac-review`, `/security-review`, `/zero-trust-review`
- **AT-A7**: `hook-audit.md` → After: `/system-review components`
- **AT-A8**: `i18n-audit.md` → After: `/tdd`, `/code-review`
- **AT-A9**: `iac-review.md` → After: `/gitops-review`, `/tdd`, `/security-review`
- **AT-A10**: `resilience-audit.md` → After: `/tdd` for chaos tests, `/chaos-experiment`
- **AT-A11**: `storybook-audit.md` → After: `/design-system-review` for full audit, `/code-review`
- **AT-A12**: `web-perf.md` → After: `/tdd`, `/code-review`
- **AT-A13**: `webrtc-review.md` → After: `/security-review`, `/slo` for WebRTC SLO definition

### P2 — After This: *-build commands (7)

- **AT-B1**: `build-fix.md` → After: `/tdd`, `/verify`
- **AT-B2**: `cpp-build.md` → After: `/cpp-review`, `/tdd`
- **AT-B3**: `go-build.md` → After: `/go-review`, `/tdd`
- **AT-B4**: `rust-build.md` → After: `/rust-review`, `/tdd`
- **AT-B5**: `swift-build.md` → After: `/swift-review`, `/mobile-release`
- **AT-B6**: `typescript-build.md` → After: `/typescript-review`, `/tdd`
- **AT-B7**: `wasm-build.md` → After: `/wasm-review`, `/security-review` for unsafe blocks

### P2 — After This: test commands (4)

- **AT-T1**: `go-test.md` → After: `/go-review`, `/verify`
- **AT-T2**: `python-test.md` → After: `/python-review`, `/verify`
- **AT-T3**: `rust-test.md` → After: `/rust-review`, `/verify`
- **AT-T4**: `test-coverage.md` → After: `/tdd` for coverage gaps, `/code-review`

### P2 — After This: design and architecture commands (9)

- **AT-D1**: `agent-design.md` → After: `/tdd`, `/orchestrate` for implementation
- **AT-D2**: `arc42.md` → After: `/plan`, `/arch-design`
- **AT-D3**: `data-mesh-review.md` → After: `/arch-design`, `/tdd`
- **AT-D4**: `idp-design.md` → After: `/plan`, `/golden-path`
- **AT-D5**: `orchestrator-design.md` → After: `/orchestrate`, `/tdd`
- **AT-D6**: `sdk-design.md` → After: `/plan`, `/tdd`, `/sdk-review`
- **AT-D7**: `sdk-review.md` → After: `/tdd`, `/code-review`
- **AT-D8**: `wireframe.md` → After: `/design-critique`, `/slide-deck`
- **AT-D9**: `chart-review.md` → After: `/code-review`, `/tdd`

### P2 — After This: workflow commands (12)

- **AT-W1**: `breakdown.md` → After: `/tdd`, `/plan`
- **AT-W2**: `experiment.md` → After: `/tdd`, `/instrument`
- **AT-W3**: `explore.md` → After: `/prd`, `/plan`
- **AT-W4**: `finops-audit.md` → After: `/plan` for cost reduction tasks, `/iac-review`
- **AT-W5**: `modernize.md` → After: `/tdd`, `/plan`, `/code-review`
- **AT-W6**: `onboard.md` → After: `/tdd`, `/setup-dev`
- **AT-W7**: `orchestrate.md` → After: `/tdd`, `/code-review`
- **AT-W8**: `plan.md` → After: `/tdd`, `/breakdown`
- **AT-W9**: `prd.md` → After: `/plan`, `/tdd`
- **AT-W10**: `refactor.md` → After: `/tdd`, `/code-review`, `/verify`
- **AT-W11**: `triage.md` → After: `/plan`, `/breakdown`
- **AT-W12**: `verify.md` → After: `/tdd` for failures, `/build-fix`

### P2 — After This: learning commands (8)

- **AT-L1**: `evolve.md` → After: `/learn-eval`, `/instinct-status`
- **AT-L2**: `instinct-export.md` → After: `/instinct-import` on target project
- **AT-L3**: `instinct-import.md` → After: `/instinct-status`
- **AT-L4**: `instinct-outcome.md` → After: `/evolve` when enough outcomes collected
- **AT-L5**: `instinct-projects.md` → After: `/instinct-status`
- **AT-L6**: `instinct-promote.md` → After: `/skill-create`
- **AT-L7**: `learn-eval.md` → After: `/evolve`, `/instinct-status`
- **AT-L8**: `learning-audit.md` → After: `/evolve`, `/system-review components`

### P2 — After This: setup commands (8)

- **AT-S1**: `backstage-setup.md` → After: `/golden-path`, `/tdd`
- **AT-S2**: `cursor-setup.md` → After: `/doctor`, `/quickstart`
- **AT-S3**: `mcp-setup.md` → After: `/doctor`
- **AT-S4**: `oss-setup.md` → After: `/setup-ci`, `/tdd`
- **AT-S5**: `project-init.md` → After: `/tdd`, `/setup-ci`
- **AT-S6**: `setup-ci.md` → After: `/tdd`, `/doctor`
- **AT-S7**: `setup-dev.md` → After: `/doctor`, `/tdd`
- **AT-S8**: `setup-pm.md` → After: `/doctor`

### P2 — After This: remaining commands (35)

- **AT-M1**: `add-observability.md` → After: `/tdd`, `/slo`
- **AT-M2**: `analyze-feedback.md` → After: `/brainstorm`, `/idea`
- **AT-M3**: `brainstorm.md` → After: `/idea`, `/evaluate`
- **AT-M4**: `cfp.md` → After: `/slide-deck`, `/talk-outline`
- **AT-M5**: `chaos-experiment.md` → After: `/resilience-audit`, `/slo`
- **AT-M6**: `cli-review.md` → After: `/tdd`, `/code-review`
- **AT-M7**: `competitive-review.md` → After: `/discover`, `/brainstorm`
- **AT-M8**: `contract-test.md` → After: `/tdd`, `/code-review`
- **AT-M9**: `context.md` → After: `/plan`, `/breakdown`
- **AT-M10**: `database-review.md` → After: `/tdd`, `/security-review`
- **AT-M11**: `debt-audit.md` → After: `/refactor`, `/modernize`
- **AT-M12**: `dep-update.md` → After: `/dep-audit`, `/verify`
- **AT-M13**: `design-critique.md` → After: `/wireframe`, `/brand-identity`
- **AT-M14**: `devex-survey.md` → After: `/golden-path`, `/setup-dev`
- **AT-M15**: `dora-baseline.md` → After: `/slo`, `/engineering-review`
- **AT-M16**: `edge-review.md` → After: `/build-fix`, `/security-review`
- **AT-M17**: `engineering-review.md` → After: `/dora-baseline`, `/plan`
- **AT-M18**: `event-storming.md` → After: `/plan`, `/breakdown`
- **AT-M19**: `icon-system.md` → After: `/design-system-review`, `/code-review`
- **AT-M20**: `idea.md` → After: `/evaluate`
- **AT-M21**: `incident.md` → After: `/tdd` for regression tests, `/slo`
- **AT-M22**: `instrument.md` → After: `/slo`, `/tdd`
- **AT-M23**: `llm-eval.md` → After: `/tdd`, `/prompt-review`
- **AT-M24**: `migrate.md` → After: `/tdd`, `/database-review`
- **AT-M25**: `mlops-review.md` → After: `/tdd`, `/slo`
- **AT-M26**: `mobile-release.md` → After: `/tdd`, `/release`
- **AT-M27**: `multi-backend.md` → After: `/tdd`, `/code-review`
- **AT-M28**: `multi-frontend.md` → After: `/tdd`, `/code-review`
- **AT-M29**: `multi-workflow.md` → After: `/tdd`, `/code-review`
- **AT-M30**: `overnight.md` → After: `/learn-eval`, `/evolve`
- **AT-M31**: `privacy-audit.md` → After: `/security-review`, `/tdd`
- **AT-M32**: `promote-skill.md` → After: `/skill-depth`, `/system-review components`
- **AT-M33**: `prompt-review.md` → After: `/prompt-audit`, `/tdd`
- **AT-M34**: `release.md` → After: `/tdd`, `/mobile-release` (if mobile)
- **AT-M35**: `slide-deck.md` → After: `/talk-outline`, `/design-critique`
- **AT-M36**: `slo.md` → After: `/instrument`, `/engineering-review`
- **AT-M37**: `skill-create.md` → After: `/skill-depth`, `/promote-skill`
- **AT-M38**: `skill-depth.md` → After: `/promote-skill`, `/system-review components`
- **AT-M39**: `skill-impact.md` → After: `/system-review components`
- **AT-M40**: `team-sync.md` → After: `/doctor`, `/update-rules`
- **AT-M41**: `update-codemaps.md` → After: `/update-docs`, `/doc-updater`
- **AT-M42**: `update-docs.md` → After: `/code-review`, `/release`
- **AT-M43**: `update-rules.md` → After: `/doctor`, `/system-review quick`
- **AT-M44**: `visual-test.md` → After: `/code-review`, `/tdd`
- **AT-M45**: `wasm-review.md` → After: `/wasm-build`, `/security-review`
- **AT-M46**: `workflow-check.md` → After: `/system-review full`, `/competitive-review`
- **AT-M47**: `zero-trust-review.md` → After: `/security-review`, `/tdd`
- **AT-M48**: `instinct-report.md` → After: `/evolve`, `/instinct-promote`
- **AT-M49**: `instinct-status.md` → After: `/evolve`
- **AT-M50**: `brand-identity.md` → After: `/design-critique`, `/visual-test`
- **AT-M51**: `golden-path.md` → After: `/tdd`, `/setup-dev`
- **AT-M52**: `quickstart.md` → After: `/clarc-way`, `/tdd`
- **AT-M53**: `data-mesh-review.md` → After: `/arch-design`, `/tdd`
- **AT-M54**: `mlops-review.md` → After: `/tdd`, `/slo`
- **AT-M55**: `wasm-build.md` → After: `/wasm-review`, `/security-review`
- **AT-M56**: `sbom.md` → After: `/supply-chain-audit`, `/security-review`
- **AT-M57**: `evaluate.md` → After: `/explore`, `/prd`
- **AT-M58**: `discover.md` → After: `/brainstorm`, `/idea`
- **AT-M59**: `profile.md` → After: `/slo`, `/tdd`
- **AT-M60**: `security-review.md` → After: `/tdd`, `/dep-update`

## Issue Tracker

| ID | Item | Status |
|----|------|--------|
| P0-G | guide.md: dispatch table (88→≤15 steps) | 📋 |
| P0-ME | multi-execute.md: Phase grouping (40→phases) | 📋 |
| P1-N1 | Add commands/design-system-review.md | 📋 |
| P1-N2 | Add commands/supply-chain-audit.md | 📋 |
| P1-O1 | dep-audit + dep-update scope boundary | 📋 |
| P1-O2 | security-review + sbom + dep-audit escalation ladder | 📋 |
| P1-O3 | code-review routing guidance vs *-review | 📋 |
| P1-O4 | storybook-audit cross-ref to design-system-review | 📋 |
| P1-S1 | tdd: consolidate duplicate Red-Green-Refactor | 📋 |
| P1-S2 | system-review: 25→5 user-facing steps | 📋 |
| P1-S3 | multi-plan: group into phases | 📋 |
| P1-S4 | docs-review: 39 steps → 7 H2 sections | 📋 |
| P1-S5 | checkpoint: group into Create/Verify/Restore | 📋 |
| P1-A1 | swift-build: architect → build-error-resolver | 📋 |
| P1-A2 | sbom: add supply-chain-audit cross-ref | 📋 |
| P1-NC1 | claw: update description for discoverability | 📋 |
| P1-NC2 | webrtc-review: add Usage section for $ARGUMENTS | 📋 |
| AT-R1–R16 | 16× language *-review: After This | 📋 |
| AT-A1–A13 | 13× *-audit: After This | 📋 |
| AT-B1–B7 | 7× *-build: After This | 📋 |
| AT-T1–T4 | 4× test commands: After This | 📋 |
| AT-D1–D9 | 9× design/arch: After This | 📋 |
| AT-W1–W12 | 12× workflow: After This | 📋 |
| AT-L1–L8 | 8× learning: After This | 📋 |
| AT-S1–S8 | 8× setup: After This | 📋 |
| AT-M1–M60 | 60× remaining: After This | 📋 |

# Roadmap: System Review Fixes — 2026-03-12

**Branch:** `roadmap/system-review-fixes-2026-03-12`
**Status:** Planned
**Source:** `/system-review components` — 2026-03-12
**Scope:** 62 Agents, 30/247 Skills (sampled), 172 Commands, 21 Hooks

---

## Übersicht

| Severity | Count | Komponenten |
|---|---|---|
| Critical | 0 | — |
| High | 7 | Commands (3), Hooks (1), Skills (1), Agents (2) |
| Medium | 36 | Agents (12), Skills (12), Commands (8), Hooks (4) |
| Low | 48 | Agents (25), Skills (14), Commands (5), Hooks (4) |

---

## Tasks

### Critical — nichts gefunden ✅

---

### High — sofort fixen

| # | Task | Datei | Komponente | Status |
|---|---|---|---|---|
| H1 | `/security` → `/security-review` ersetzen | `commands/quickstart.md` | Commands | ⬜ |
| H2 | `/guide` Referenz entfernen oder `commands/guide.md` erstellen | `commands/clarc-way.md` | Commands | ⬜ |
| H3 | `commands/cfp.md` erstellen (cfp-coach Agent ist bereit) oder `/cfp` Referenz entfernen | `commands/talk-outline.md` + `commands/cfp.md` | Commands | ⬜ |
| H4 | Hook-Dispatcher Startup-Validierung: EXT_MAP prüfen ob alle 18 Formatter-Scripts existieren, bei Fehler stderr-Warning | `scripts/hooks/post-edit-format-dispatch.js` | Hooks | ⬜ |
| H5 | `autonomous-loops`: Runnable Quick-Start Blöcke für alle 6 Patterns hinzufügen (je 10–20 Zeilen) | `skills/autonomous-loops/SKILL.md` | Skills | ⬜ |
| H6 | `autonomous-loops`: `Codex` durch `claude-sonnet-latest` ersetzen (falscher OpenAI-Modellname) | `skills/autonomous-loops/SKILL.md` | Skills | ⬜ |
| H7 | `summarizer-haiku`: Prompt-Stubs durch 2 vollständige I/O-Beispiele ersetzen | `agents/summarizer-haiku.md` | Agents | ⬜ |
| H8 | `workflow-os-competitor-analyst`: 2. vollständiges Beispiel hinzufügen (Input → vollständiger Report) | `agents/workflow-os-competitor-analyst.md` | Agents | ⬜ |

---

### Medium

#### Agents — Write-Without-Confirm (5 Agents)

Pattern: `data-architect.md` und `refactor-cleaner.md` als Referenz — Guardrail: *"Before writing, announce target path and ask: Write this file? [yes/no]"*

| # | Task | Datei | Status |
|---|---|---|---|
| M1 | Confirm-before-write Guardrail hinzufügen | `agents/frontend-architect.md` | ⬜ |
| M2 | Confirm-before-write Guardrail hinzufügen | `agents/platform-architect.md` | ⬜ |
| M3 | Confirm-before-write Guardrail hinzufügen | `agents/presentation-designer.md` | ⬜ |
| M4 | Confirm-before-write Guardrail hinzufügen | `agents/product-evaluator.md` | ⬜ |
| M5 | Confirm-before-write Guardrail hinzufügen | `agents/solution-designer.md` | ⬜ |
| M6 | Confirm-before-write Guardrail hinzufügen | `agents/competitive-analyst.md` | ⬜ |
| M7 | Confirm-before-write Guardrail hinzufügen | `agents/orchestrator-designer.md` | ⬜ |

#### Agents — Sonstige

| # | Task | Datei | Status |
|---|---|---|---|
| M8 | `agent-quality-reviewer`: Frontmatter `sonnet` → `opus` (Agent empfiehlt selbst Opus für --all Mode) | `agents/agent-quality-reviewer.md` | ⬜ |
| M9 | `agent-quality-reviewer`: 2. vollständiges Beispiel für --all Mode hinzufügen | `agents/agent-quality-reviewer.md` | ⬜ |
| M10 | `agent-system-reviewer`: Vollständiges Priority-Matrix Beispiel hinzufügen | `agents/agent-system-reviewer.md` | ⬜ |
| M11 | `kotlin-reviewer`: Boundary zu `android-reviewer` dokumentieren | `agents/kotlin-reviewer.md` | ⬜ |
| M12 | `skill-depth-analyzer`: --all Mode Beispiel hinzufügen + Bash aus Tools entfernen | `agents/skill-depth-analyzer.md` | ⬜ |
| M13 | `design-critic`: Bash aus Tools-Liste entfernen (nur Read + Glob benötigt) | `agents/design-critic.md` | ⬜ |

#### Agents — Security-Boundary in 18 Language-Reviewern undokumentiert

Standard-Note für jeden: *"For comprehensive OWASP Top 10 → also invoke `security-reviewer` in parallel."*

| # | Task | Datei | Status |
|---|---|---|---|
| M14 | Security-Boundary Note hinzufügen | `agents/typescript-reviewer.md` | ⬜ |
| M15 | Security-Boundary Note hinzufügen | `agents/python-reviewer.md` | ⬜ |
| M16 | Security-Boundary Note hinzufügen | `agents/go-reviewer.md` | ⬜ |
| M17 | Security-Boundary Note hinzufügen | `agents/ruby-reviewer.md` | ⬜ |
| M18 | Security-Boundary Note hinzufügen | `agents/php-reviewer.md` | ⬜ |
| M19 | Security-Boundary Note hinzufügen | `agents/rust-reviewer.md` | ⬜ |
| M20 | Security-Boundary Note hinzufügen | `agents/swift-reviewer.md` | ⬜ |
| M21 | Security-Boundary Note hinzufügen | `agents/elixir-reviewer.md` | ⬜ |
| M22 | Security-Boundary Note hinzufügen | `agents/java-reviewer.md` | ⬜ |
| M23 | Security-Boundary Note hinzufügen | `agents/kotlin-reviewer.md` | ⬜ |
| M24 | Security-Boundary Note hinzufügen | `agents/scala-reviewer.md` | ⬜ |
| M25 | Security-Boundary Note hinzufügen | `agents/flutter-reviewer.md` | ⬜ |
| M26 | Security-Boundary Note hinzufügen | `agents/android-reviewer.md` | ⬜ |
| M27 | Security-Boundary Note hinzufügen | `agents/csharp-reviewer.md` | ⬜ |
| M28 | Security-Boundary Note hinzufügen | `agents/cpp-reviewer.md` | ⬜ |
| M29 | Security-Boundary Note hinzufügen | `agents/bash-reviewer.md` | ⬜ |
| M30 | Security-Boundary Note hinzufügen | `agents/c-reviewer.md` | ⬜ |
| M31 | Security-Boundary Note hinzufügen | `agents/r-reviewer.md` | ⬜ |

#### Skills

| # | Task | Datei | Status |
|---|---|---|---|
| M32 | `continuous-learning-v2`: Version-Comparison-Tabellen in 1 Bullet-Liste kürzen + Duplicate Quick Start mergen | `skills/continuous-learning-v2/SKILL.md` | ⬜ |
| M33 | `clarc-mcp-integration`: Vollständiges Node.js Beispiel für `get_health_status` CI-Use-Case hinzufügen | `skills/clarc-mcp-integration/SKILL.md` | ⬜ |
| M34 | `clarc-way`: 25-Zeilen "Bug Fix Walkthrough" Beispiel hinzufügen (exakte Command-Sequenz) | `skills/clarc-way/SKILL.md` | ⬜ |
| M35 | `cost-management`: Pseudocode durch echte Claude Code Tool-Call-Syntax ersetzen | `skills/cost-management/SKILL.md` | ⬜ |
| M36 | `clarc-onboarding`: Unverified Command-Referenzen prüfen (`/a11y-audit`, `/web-perf`, `/iac-review`, `/finops-audit`, `/agent-stats`) | `skills/clarc-onboarding/SKILL.md` | ⬜ |
| M37 | `agent-conflict-resolution`: Copy-Paste Conflict Signal Template in Markdown hinzufügen | `skills/agent-conflict-resolution/SKILL.md` | ⬜ |
| M38 | `go-patterns`: Interface Design + Package Organization → `go-patterns-advanced` verschieben (549 → ~350 Zeilen) | `skills/go-patterns/SKILL.md` | ⬜ |
| M39 | `arc42-c4`: Template (310 Zeilen) → `docs/templates/arc42-template.md` auslagern + Negative-Trigger hinzufügen | `skills/arc42-c4/SKILL.md` | ⬜ |
| M40 | `python-patterns`: Decorators + NamedTuples → `python-patterns-advanced` verschieben (554 → ~350 Zeilen) | `skills/python-patterns/SKILL.md` | ⬜ |
| M41 | `typescript-patterns`: Module Organization Sektion kürzen (484 → ~350 Zeilen) | `skills/typescript-patterns/SKILL.md` | ⬜ |

#### Commands

| # | Task | Datei | Status |
|---|---|---|---|
| M42 | Usage-Beispiel von `/projects` → `/instinct-projects` korrigieren | `commands/instinct-projects.md` | ⬜ |
| M43 | Usage-Beispiel von `/promote` → `/instinct-promote` korrigieren | `commands/instinct-promote.md` | ⬜ |
| M44 | Usage-Beispiel von `/backend` → `/multi-backend` korrigieren | `commands/multi-backend.md` | ⬜ |
| M45 | Usage-Beispiel von `/frontend` → `/multi-frontend` korrigieren | `commands/multi-frontend.md` | ⬜ |
| M46 | `wasm-build`: Steps auf ≤8 reduzieren (2 verwandte Steps mergen) | `commands/wasm-build.md` | ⬜ |
| M47 | `arc42`: Steps auf ≤8 reduzieren | `commands/arc42.md` | ⬜ |
| M48 | `release`: Steps auf ≤8 reduzieren | `commands/release.md` | ⬜ |
| M49 | `onboard`: Steps auf ≤8 reduzieren | `commands/onboard.md` | ⬜ |
| M50 | `backstage-setup`: Steps auf ≤8 reduzieren + Arguments-Sektion hinzufügen | `commands/backstage-setup.md` | ⬜ |
| M51 | `data-mesh-review`: Step 0 Delegation zu `data-architect` Agent hinzufügen | `commands/data-mesh-review.md` | ⬜ |
| M52 | `frontend-arch-review`: Step 0 Delegation zu `frontend-architect` Agent hinzufügen | `commands/frontend-arch-review.md` | ⬜ |
| M53 | `mlops-review`: Delegation aus Description in Body-Steps verschieben | `commands/mlops-review.md` | ⬜ |
| M54 | `resilience-review`: Delegation aus Description in Body-Steps verschieben | `commands/resilience-review.md` | ⬜ |

#### Hooks

| # | Task | Datei | Status |
|---|---|---|---|
| M55 | `auto-checkpoint`: Synchrone `spawnSync` Git-Calls → async `spawn` mit Promise migrieren | `scripts/hooks/auto-checkpoint.js` | ⬜ |
| M56 | `response-dashboard`: File-Size-Guard hinzufügen (>5MB → nur letzten 50k Bytes lesen) | `scripts/hooks/response-dashboard.js` | ⬜ |
| M57 | `post-edit-workflow-nudge`: `tdd-sequence-guard` für `infra/`, `migrations/`, `scripts/`, `generated/` überspringen | `scripts/hooks/post-edit-workflow-nudge.js` | ⬜ |
| M58 | TypeScript-Typecheck auch auf `Write` (nicht nur `Edit`) matchen | `hooks/hooks.json` + `scripts/hooks/post-edit-typecheck.js` | ⬜ |

---

### Low

#### Agents

| # | Task | Datei | Status |
|---|---|---|---|
| L1 | `agent-system-reviewer`: --recompute Overwrite-Confirmation hinzufügen | `agents/agent-system-reviewer.md` | ⬜ |
| L2 | `agent-system-reviewer`: Partial-Scope Exit-Criteria dokumentieren | `agents/agent-system-reviewer.md` | ⬜ |
| L3 | `agent-system-reviewer`: Reverse-Boundary zu `agent-quality-reviewer` dokumentieren | `agents/agent-system-reviewer.md` | ⬜ |
| L4 | `agent-quality-reviewer`: Scoring-Scale vereinheitlichen (1-5 vs 1-10 Inkonsistenz) | `agents/agent-quality-reviewer.md` | ⬜ |
| L5 | `agent-quality-reviewer`: Boundary zu `agent-system-reviewer` dokumentieren | `agents/agent-quality-reviewer.md` | ⬜ |
| L6 | `architect`: Vage Verben in Steps 1-2 durch konkrete Aktionen ersetzen | `agents/architect.md` | ⬜ |
| L7 | `architect`: Boundary zu `solution-designer` (ADR-Generierung) dokumentieren | `agents/architect.md` | ⬜ |
| L8 | `scala-reviewer`: Block-Threshold auf CRITICAL + HIGH setzen (aktuell nur CRITICAL) | `agents/scala-reviewer.md` | ⬜ |
| L9 | `scala-reviewer`: Mixed Cats Effect / ZIO Handling dokumentieren | `agents/scala-reviewer.md` | ⬜ |
| L10 | `build-error-resolver`: `yes/no` Confirmation vor Edit/Write hinzufügen | `agents/build-error-resolver.md` | ⬜ |
| L11 | `command-auditor`: Output-Format für Single-Command Mode spezifizieren | `agents/command-auditor.md` | ⬜ |
| L12 | `cpp-reviewer`: Boundary zu `c-reviewer` dokumentieren | `agents/cpp-reviewer.md` | ⬜ |
| L13 | `csharp-reviewer`: Boundary zu `kotlin-reviewer` für .kt Files dokumentieren | `agents/csharp-reviewer.md` | ⬜ |
| L14 | `doc-updater`: Diff-Threshold für CODEMAPS (>30% → confirm before overwrite) | `agents/doc-updater.md` | ⬜ |
| L15 | `e2e-runner`: Artifact-Output-Verzeichnis vor erstem Run bestätigen | `agents/e2e-runner.md` | ⬜ |
| L16 | `elixir-reviewer`: Sobelow / security-reviewer Boundary dokumentieren | `agents/elixir-reviewer.md` | ⬜ |
| L17 | `feedback-analyst`: Filename Confirmation vor Write hinzufügen | `agents/feedback-analyst.md` | ⬜ |
| L18 | `flutter-reviewer`: Boundary zu `android-reviewer` dokumentieren | `agents/flutter-reviewer.md` | ⬜ |
| L19 | `go-reviewer`: Boundary zu `go-build-resolver` dokumentieren | `agents/go-reviewer.md` | ⬜ |
| L20 | `java-reviewer`: Boundary zu `kotlin-reviewer` für Spring Boot dokumentieren | `agents/java-reviewer.md` | ⬜ |
| L21 | `orchestrator`: Pre-Delegation Checklist für destructive-command Guardrail | `agents/orchestrator.md` | ⬜ |
| L22 | `performance-analyst`: Boundary zu `database-reviewer` (N+1) dokumentieren | `agents/performance-analyst.md` | ⬜ |
| L23 | `php-reviewer`: OWASP Scope → security-reviewer Boundary dokumentieren | `agents/php-reviewer.md` | ⬜ |
| L24 | `planner`: ADR-Eskalation zu `architect` stärken | `agents/planner.md` | ⬜ |
| L25 | `prompt-quality-scorer`: Reverse-Boundary zu `prompt-reviewer` dokumentieren | `agents/prompt-quality-scorer.md` | ⬜ |
| L26 | `ruby-reviewer`: Brakeman / security-reviewer Boundary dokumentieren | `agents/ruby-reviewer.md` | ⬜ |
| L27 | `rust-reviewer`: Unsafe / OWASP Boundary zu security-reviewer dokumentieren | `agents/rust-reviewer.md` | ⬜ |
| L28 | `supply-chain-auditor`: Boundary zu `devsecops-reviewer` (GitHub Actions) dokumentieren | `agents/supply-chain-auditor.md` | ⬜ |
| L29 | `swift-reviewer`: Server-side Swift OWASP → security-reviewer Boundary dokumentieren | `agents/swift-reviewer.md` | ⬜ |
| L30 | `tdd-guide`: Boundary zu `e2e-runner` dokumentieren | `agents/tdd-guide.md` | ⬜ |
| L31 | `typescript-reviewer`: OWASP Boundary zu security-reviewer dokumentieren | `agents/typescript-reviewer.md` | ⬜ |
| L32 | `kotlin-reviewer`: Output-Format auf Severity-Sections vereinheitlichen | `agents/kotlin-reviewer.md` | ⬜ |
| L33 | `orchestrator-designer`: Reverse-Boundary zu `orchestrator` dokumentieren | `agents/orchestrator-designer.md` | ⬜ |

#### Skills

| # | Task | Datei | Status |
|---|---|---|---|
| L34 | `verification-loop`: Build-Failure Recovery Beispiel hinzufügen | `skills/verification-loop/SKILL.md` | ⬜ |
| L35 | `context-management`: Hardcoded `128k` durch modellabhängige Formulierung ersetzen | `skills/context-management/SKILL.md` | ⬜ |
| L36 | `tdd-workflow`: Mock-Patterns Sektion → `-advanced` Variant verschieben (403 → ~300 Zeilen) | `skills/tdd-workflow/SKILL.md` | ⬜ |
| L37 | `api-design`: Duplicate Versioning-Sektion aus -advanced entfernen | `skills/api-design/SKILL.md` | ⬜ |
| L38 | `multi-agent-patterns`: SDK-Loop-Sektion kürzen (440 → ~350 Zeilen) | `skills/multi-agent-patterns/SKILL.md` | ⬜ |
| L39 | `docker-patterns`: Postgres-Version mit `ci-cd-patterns` angleichen | `skills/docker-patterns/SKILL.md` | ⬜ |
| L40 | `prompt-engineering`: Duplicate Versioning-Sektion entfernen | `skills/prompt-engineering/SKILL.md` | ⬜ |
| L41 | `observability`: Alertmanager-Sektion in eigenes Skill auslagern (optional) | `skills/observability/SKILL.md` | ⬜ |
| L42 | `agent-reliability`: Rate-Limiting → `-advanced` verschieben (434 → ~350 Zeilen) | `skills/agent-reliability/SKILL.md` | ⬜ |
| L43 | `debugging-workflow`: OTel-Sektion Overlap mit `observability` kennzeichnen | `skills/debugging-workflow/SKILL.md` | ⬜ |
| L44 | `auth-patterns`: RBAC-Sektion → eigenes Skill verschieben (471 → ~350 Zeilen) | `skills/auth-patterns/SKILL.md` | ⬜ |
| L45 | `python-patterns`: EAFP vs LBYL Inkonsistenz klären (1 Satz Klarstellung) | `skills/python-patterns/SKILL.md` | ⬜ |
| L46 | `clarc-onboarding`: Kurzzeilen-Transcript für jede Rollen-Path hinzufügen | `skills/clarc-onboarding/SKILL.md` | ⬜ |
| L47 | `arc42-c4`: Negative-Trigger hinzufügen ("nicht für Projekte <10 Dateien") | `skills/arc42-c4/SKILL.md` | ⬜ |

#### Commands

| # | Task | Datei | Status |
|---|---|---|---|
| L48 | `multi-backend`: Arguments-Sektion hinzufügen | `commands/multi-backend.md` | ⬜ |
| L49 | `multi-frontend`: Arguments-Sektion hinzufügen | `commands/multi-frontend.md` | ⬜ |
| L50 | `brand-identity`: After-This Sektion hinzufügen | `commands/brand-identity.md` | ⬜ |
| L51 | `agent-instincts`: After-This Sektion hinzufügen | `commands/agent-instincts.md` | ⬜ |
| L52 | `instinct-outcome`: After-This Sektion hinzufügen | `commands/instinct-outcome.md` | ⬜ |

#### Hooks

| # | Task | Datei | Status |
|---|---|---|---|
| L53 | `doc-file-warning`: Allowlist erweitern oder nur auf definierte Pfade matchen | `scripts/hooks/doc-file-warning.js` | ⬜ |
| L54 | `build-failure-router`: Pattern präzisieren (nicht jeder non-zero Exit ist ein Build-Fehler) | `scripts/hooks/build-failure-router.js` | ⬜ |
| L55 | `doc-file-warning`: Explizites `process.exit(0)` am Ende hinzufügen | `scripts/hooks/doc-file-warning.js` | ⬜ |
| L56 | `notification-handler`: `process.env.HOME` → `os.homedir()` ersetzen | `scripts/hooks/notification-handler.js` | ⬜ |

---

## Notizen

- Security-Boundary-Notes (M14–M31): alle 18 identisch → per Batch erledigen
- Write-Without-Confirm (M1–M7): Pattern von `refactor-cleaner.md` kopieren und anpassen
- Skill-Length-Inflation (M38–M41, L36, L38, L42, L44): erst Inhalte verschieben, dann Länge prüfen
- H3 (`cfp.md`): `cfp-coach` Agent ist fertig — nur Command-Wrapper nötig

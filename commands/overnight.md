---
description: Set up an autonomous overnight development pipeline. Analyzes the feature, selects the right pipeline pattern (Sequential, Continuous Claude, Ralphinho, or Infinite Loop), then generates all required files. WAITS for user confirmation before creating files.
---

# Overnight Pipeline

Given a feature idea in `$ARGUMENTS`, analyze it, select the right pipeline pattern, explain the decision, and — after user confirmation — generate everything needed to run autonomously.

---

## Phase 0: Analyze and Select Pattern

**Do this before creating any files.**

### 0a. Understand the Feature

Parse `$ARGUMENTS`. If empty, ask: "What should the overnight pipeline build or fix?"

Extract:
- **Feature name** (short kebab-case, e.g. `oauth2-login`)
- **Rough scope** — single file? single module? cross-cutting? multiple services?
- **Nature** — new feature, bug fix, refactor, content generation, iteration/improvement
- **Clarity** — is the goal concrete and testable, or still exploratory?
- **API changes** — new/modified endpoints mentioned?

### 0b. Examine the Codebase

Quickly read the project to estimate size and complexity:
- Check `package.json` / `go.mod` / `pyproject.toml` for project type
- Count top-level source directories (rough indicator of size)
- Check if a spec or RFC already exists for this feature
- Check if `ralph-loop` is available: `which ralph` or check `~/.claude/plugins/`
- Check if `continuous-claude` is available: `which continuous-claude`

### 0c. Apply the Decision Matrix

Evaluate these signals in order:

**Signal 1 — Exploratory / Unclear**
- Keywords: "not sure", "explore", "investigate", "experiment", "try out", "see what happens"
- Spec is vague (no concrete acceptance criteria possible)
- → **NanoClaw** (interactive session to define the spec first)

**Signal 2 — Simple / Well-Defined**
- Single module or file area
- Clear acceptance criteria
- Estimated scope: < 10 files changed
- Nature: new feature, bug fix, targeted refactor
- → **Sequential Pipeline** (`overnight.sh`)

**Signal 3 — Iterative / Open-Ended**
- Keywords: "fix all", "improve coverage", "keep working until", "iterate", "clean up everything"
- Success depends on CI passing (not just local tests)
- Estimated runs needed: 3+
- No fixed endpoint — done when a quality bar is met
- → **Continuous Claude** (`continuous-claude --max-duration`)

**Signal 4 — Large / Parallel**
- Keywords: "entire", "across the codebase", "multiple services", "redesign", "migrate", "system"
- Multiple independent work units that could run in parallel
- Estimated scope: 15+ files, multiple modules with separate concerns
- Dependencies between units (unit A must land before unit B can start)
- → **Ralphinho** (RFC-driven DAG) — only if `ralph` or ralph-loop is available
- → **Sequential Pipeline with phases** (if ralph is not available)

**Signal 5 — Generative / Many Variations**
- Keywords: "generate N", "create variations", "multiple versions", "batch"
- Same spec applied many times with different creative directions
- → **Infinite Agentic Loop**

**Signal 6 — Compound** (multiple signals present)
- Iterative + Large → Ralphinho (handles parallel + loops natively)
- Simple + CI gates needed → Continuous Claude (even for simple tasks)
- Exploratory + Time-boxed → NanoClaw first, then Sequential Pipeline for implementation

### 0d. Estimate Complexity Tier

For features going to Sequential Pipeline or Ralphinho, assign a tier:

| Tier | Signals | Pipeline Depth |
|------|---------|----------------|
| trivial | 1-2 files, single function | implement → verify → commit |
| small | 2-5 files, single module | plan → implement → verify → commit |
| medium | 5-15 files, multiple modules | plan → api-contract? → implement → de-sloppify → verify → commit |
| large | 15+ files, cross-cutting | plan → api-contract? → implement → de-sloppify → verify → commit (+ Ralphinho if parallel) |

### 0e. Present the Decision — WAIT FOR CONFIRMATION

Output the analysis in this exact format before creating any files:

```
OVERNIGHT PIPELINE — PATTERN SELECTION
═══════════════════════════════════════

Feature:    <feature name>
Complexity: <trivial | small | medium | large>

SELECTED PATTERN: <Pattern Name>

Why:
  - <signal 1 that drove this decision>
  - <signal 2 if applicable>
  - <tradeoff acknowledged, e.g. "Ralphinho would be more powerful but is
    not installed — using Sequential with phases instead">

What will be generated:
  <list of files that will be created>

What will run:
  <description of the pipeline steps>

Estimated runtime: <rough estimate, e.g. "2-4 hours">
Estimated cost:    <rough estimate, e.g. "~$0.50-$1.00">

──────────────────────────────────────────
Confirm? (yes / modify: <changes> / no)
```

**Do not create any files until the user confirms.**

If the user says "modify: use continuous-claude instead" or similar, switch patterns and re-present the decision.

---

## Phase 1: Detect Project Configuration

After confirmation, detect the right commands:

**Package manager** (check lock files):
- `bun.lockb` → `bun`
- `pnpm-lock.yaml` → `pnpm`
- `yarn.lock` → `yarn`
- `package-lock.json` → `npm`
- `pyproject.toml` or `requirements.txt` → `uv run` / `python`
- `go.mod` → `go`
- `pom.xml` → `mvn`
- `build.gradle` → `./gradlew`

**Commands** (read package.json scripts, Makefile, etc.):
- Build, Test, Lint, Type check, Format

**Spec tooling** (only if API changes detected):
- Spectral, openapi-typescript, oapi-codegen, datamodel-codegen, etc.

---

## Phase 2: Create Spec File

Always create `docs/specs/overnight-YYYY-MM-DD-<feature-name>.md`:

```markdown
# Overnight Spec: <Feature Name>

**Date:** YYYY-MM-DD
**Feature:** <kebab-case-name>
**Pattern:** <selected pattern>

## Goal

<what should be true when the pipeline finishes>

## Scope

### In Scope
- <inferred from description>

### Out of Scope
- <what NOT to touch — be explicit>

## Acceptance Criteria

- [ ] <concrete, testable criterion>
- [ ] Tests pass (80%+ coverage on new code)
- [ ] Build succeeds, lint clean

## API Changes

<"None" or list of endpoints>

## Notes for Claude

- Read this file FIRST before doing anything
- Update SHARED_TASK_NOTES.md after each major step
- Do not create documentation files unless part of this feature
- Read 2-3 nearby files before writing any new code to match conventions
```

---

## Phase 3: Initialize SHARED_TASK_NOTES.md

Always create or overwrite `SHARED_TASK_NOTES.md`:

```markdown
# Overnight Pipeline — <Feature Name>

**Pattern:** <selected pattern>
**Started:** <timestamp>
**Spec:** docs/specs/overnight-YYYY-MM-DD-<feature-name>.md

## Status

(Claude will fill this with pattern-appropriate steps)

## Implementation Plan

(Claude will write this in the first step)

## Decisions Made

(Claude logs architectural decisions here)

## Issues Encountered

(Claude logs problems and resolutions here)

## What Was Done

(Claude summarizes after each step)

## What Remains

(Claude updates after each step)
```

---

## Phase 4: Generate Pattern-Specific Setup

### Pattern A: Sequential Pipeline

Generate `scripts/overnight.sh` using the template below. Substitute all `<PLACEHOLDER>` values with detected project commands.

Steps depend on complexity tier:

**trivial:** implement → verify → commit
**small:** plan → implement → verify → commit
**medium/large:** plan → [api-contract] → implement → de-sloppify → verify → commit

```bash
#!/usr/bin/env bash
# overnight.sh — Autonomous pipeline for: <FEATURE_NAME>
# Generated: <DATE>
# Pattern:   Sequential Pipeline (<COMPLEXITY_TIER>)
# Spec:      docs/specs/overnight-<DATE>-<FEATURE_NAME>.md

set -euo pipefail

SPEC="docs/specs/overnight-<DATE>-<FEATURE_NAME>.md"
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/overnight-<DATE>-<FEATURE_NAME>.log"
NOTES="SHARED_TASK_NOTES.md"

mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
step() {
  echo "" | tee -a "$LOG_FILE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
  log "STEP $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
}
on_error() {
  log "ERROR: Pipeline failed at line $1"
  log "Partial progress saved in $NOTES"
  exit 1
}
trap 'on_error $LINENO' ERR

log "=== Overnight Pipeline: <FEATURE_NAME> ==="
log "Pattern:  Sequential (<COMPLEXITY_TIER>)"
log "Started:  $(date)"

[[ ! -f "$SPEC" ]] && { log "ERROR: Spec not found: $SPEC"; exit 1; }

# ─── Step 0: Plan (omit for trivial) ─────────────────────────────────────────
step "0: PLAN"
claude -p --model claude-opus-latest "
Read the spec at $SPEC. Explore the codebase: README, folder structure, 3-5 key source files.
Write a detailed implementation plan to $NOTES under '## Implementation Plan':
  - Files to create/modify and why
  - Key design decisions
  - Test strategy
  - Implementation order
  - Risks and edge cases
Update Status section — mark Step 0 done.
Do NOT write any production code yet.
" 2>&1 | tee -a "$LOG_FILE"

# ─── Step 1: API Contract (if API changes) ────────────────────────────────────
# <INCLUDE_IF_API_CHANGES>
step "1: API CONTRACT"
claude -p "
Read $SPEC and $NOTES.
Write OpenAPI 3.1 spec to api/v1/openapi.yaml (create or extend).
Ensure all new endpoints have request/response schemas with RFC 7807 error responses.
Run: spectral lint api/v1/openapi.yaml — fix all errors.
Generate types using the appropriate tool for this project.
Update $NOTES Status — mark Step 1 done.
" 2>&1 | tee -a "$LOG_FILE"
# </INCLUDE_IF_API_CHANGES>

# ─── Step 2: Implement (TDD) ──────────────────────────────────────────────────
step "2: IMPLEMENT (TDD)"
claude -p "
Read $SPEC and $NOTES (implementation plan). Follow the plan exactly.
TDD: RED → GREEN → REFACTOR for each unit. Run tests after each unit: <TEST_COMMAND>
Read 2-3 existing source files first to match conventions.
No new features beyond spec. No documentation files.
Update $NOTES: mark Step 2 done, write what was built and what remains.
" 2>&1 | tee -a "$LOG_FILE"

# ─── Step 3: De-Sloppify (omit for trivial/small) ────────────────────────────
step "3: DE-SLOPPIFY"
claude -p "
Review all working tree changes (git diff HEAD).
Remove: tests for language/framework behavior (not business logic), redundant type checks,
over-defensive error handling for impossible states, console.log/debug statements, commented-out code.
Keep: all business logic tests, real edge case tests.
Run <TEST_COMMAND> after each removal. All tests must pass.
Update $NOTES Status — mark Step 3 done.
" 2>&1 | tee -a "$LOG_FILE"

# ─── Step 4: Verify ───────────────────────────────────────────────────────────
step "4: VERIFY"
claude -p "
Run in order, fix any failures:
  1. Build:      <BUILD_COMMAND>
  2. Type check: <TYPECHECK_COMMAND>
  3. Lint:       <LINT_COMMAND>
  4. Tests:      <TEST_COMMAND>
Fix root causes — no eslint-disable, no type assertions to silence errors.
If a check still fails after 2 attempts, document in $NOTES '## Issues Encountered' and continue.
Update $NOTES Status — mark Step 4 done. Report final results.
" 2>&1 | tee -a "$LOG_FILE"

# ─── Step 5: Commit ───────────────────────────────────────────────────────────
step "5: COMMIT"
claude -p "
Read $NOTES for context on what was built.
Create a conventional commit (feat/fix/refactor, scope, imperative subject, body with why).
Stage all changed files. Commit. Do NOT push.
Update $NOTES Status — mark Step 5 done.
" 2>&1 | tee -a "$LOG_FILE"

echo ""
echo "╔══════════════════════════════════════════════════╗" | tee -a "$LOG_FILE"
echo "║          OVERNIGHT PIPELINE COMPLETE             ║" | tee -a "$LOG_FILE"
echo "╚══════════════════════════════════════════════════╝" | tee -a "$LOG_FILE"
log "Finished: $(date)"
log "Review:   git log --oneline -5 && cat $NOTES"
log "Ship:     git push origin <branch> && gh pr create"
```

Make executable: `chmod +x scripts/overnight.sh && mkdir -p logs`

---

### Pattern B: Continuous Claude

Generate `scripts/overnight.sh`:

```bash
#!/usr/bin/env bash
# overnight.sh — Autonomous pipeline for: <FEATURE_NAME>
# Generated: <DATE>
# Pattern:   Continuous Claude

set -euo pipefail

SPEC="docs/specs/overnight-<DATE>-<FEATURE_NAME>.md"
LOG_FILE="logs/overnight-<DATE>-<FEATURE_NAME>.log"
mkdir -p logs

echo "Starting Continuous Claude pipeline: <FEATURE_NAME>" | tee "$LOG_FILE"
echo "Spec: $SPEC" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"

continuous-claude \
  --prompt "$(cat << 'PROMPT'
Read docs/specs/overnight-<DATE>-<FEATURE_NAME>.md and SHARED_TASK_NOTES.md for context.
Implement the next uncompleted item from the spec. Use TDD.
After implementation, update SHARED_TASK_NOTES.md with what was done and what remains.
If everything in the spec is done and all tests pass, output exactly: OVERNIGHT_PIPELINE_COMPLETE
PROMPT
)" \
  --review-prompt "<TEST_COMMAND> && <LINT_COMMAND>" \
  --max-duration <DURATION> \
  --max-cost <COST_LIMIT> \
  --completion-signal "OVERNIGHT_PIPELINE_COMPLETE" \
  --completion-threshold 2 \
  2>&1 | tee -a "$LOG_FILE"

echo "Pipeline finished: $(date)" | tee -a "$LOG_FILE"
echo "Review: git log --oneline -5 && cat SHARED_TASK_NOTES.md" | tee -a "$LOG_FILE"
```

Substitute reasonable defaults:
- `--max-duration`: `6h` (default), or estimate from complexity
- `--max-cost`: `5.00` (default)

Make executable: `chmod +x scripts/overnight.sh`

---

### Pattern C: Ralphinho (RFC-Driven DAG)

Generate the RFC document `docs/rfc-<feature-name>.md`:

```markdown
# RFC: <Feature Name>

**Date:** YYYY-MM-DD
**Status:** DRAFT

## Summary

<1-paragraph description of the feature>

## Motivation

<why this is needed>

## Detailed Design

<breakdown of what needs to be built — this is what the AI decomposes into work units>

### Component A: <Name>
<description>

### Component B: <Name>
<description>

## Acceptance Criteria

- [ ] <criterion>

## Out of Scope

- <what NOT to include>
```

Then output instructions (ralph-loop handles the DAG decomposition itself):

```
RFC generated: docs/rfc-<feature-name>.md

To start Ralphinho:
  1. Review the RFC and adjust if needed
  2. Start the Ralph Loop in Claude Code: /ralph-loop
     Then say: "Run the overnight pipeline for docs/rfc-<feature-name>.md"

Or via CLI:
  CLAUDE_RALPH_RFC=docs/rfc-<feature-name>.md ralph
```

---

### Pattern D: Infinite Agentic Loop

Generate the spec file and a Claude Code command:

```markdown
# .claude/commands/overnight-loop.md

Parse $ARGUMENTS:
  spec_file = docs/specs/overnight-<DATE>-<FEATURE_NAME>.md
  output_dir = <detected output dir>
  count = <N or "infinite">

PHASE 1: Read the spec deeply.
PHASE 2: Scan output_dir for existing iterations. Start at N+1.
PHASE 3: Plan N creative directions — each agent gets a DIFFERENT approach.
PHASE 4: Deploy sub-agents in parallel (Task tool). Each receives:
  - Full spec
  - Directory snapshot
  - Assigned iteration number
  - Unique creative direction
PHASE 5 (infinite): Loop in waves of 3-5 until context is low.
```

Then output:
```
Loop command installed: .claude/commands/overnight-loop.md

To start:
  /project:overnight-loop 5
  /project:overnight-loop infinite
```

---

## Phase 5: Final Output

After generating all files, always output:

```
OVERNIGHT PIPELINE READY
════════════════════════════════════════════════

Feature:    <feature name>
Pattern:    <selected pattern> (<complexity tier if applicable>)
Spec:       docs/specs/overnight-<date>-<name>.md

<pattern-specific file list>

<pattern-specific start instructions>

To monitor:
  tail -f logs/overnight-<date>-<name>.log   (Sequential / Continuous)
  cat SHARED_TASK_NOTES.md                   (status between steps)

Tomorrow morning:
  git log --oneline -5
  cat SHARED_TASK_NOTES.md
  git diff HEAD~1
```

---

## Arguments

`$ARGUMENTS` is the feature description. If absent, ask before proceeding.

Examples:
- `implement OAuth2 login with GitHub` → Sequential Pipeline (medium)
- `fix all failing tests and improve coverage to 80%` → Continuous Claude
- `refactor the entire auth system to a strategy pattern across 3 services` → Ralphinho
- `generate 10 variations of the dashboard component from the spec` → Infinite Loop
- `I want to try a new caching approach, not sure if Redis or in-memory` → NanoClaw first

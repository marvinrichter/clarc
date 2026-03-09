# Hook System Expansion Roadmap

**Status:** ✅ Completed
**Date:** 2026-03-09
**Motivation:** clarc has only 7 hooks for a self-described "Workflow OS". The rules and agents documentation says to use `code-reviewer` proactively, run `security-reviewer` after touching auth, auto-format after edits — but none of this is enforced mechanically. Compliance depends entirely on human memory.

---

## Problem Statement

Current hooks:
1. `session-start` — package manager detection, context loading
2. `auto-checkpoint` — git checkpoint after Edit/Write
3. `session-end` — state save, weekly evolve
4. `post-edit-format-dispatch` — auto-format after Edit
5-7. (minor utility hooks)

Missing automatic enforcement of the most critical workflow rules:
- No hook triggers `code-reviewer` after writing code
- No hook triggers `security-reviewer` after touching auth/API files
- No hook detects build failures and routes to `build-error-resolver`
- No hook enforces TDD (red-green-refactor) sequence
- No hook validates secrets before commit

### Symptoms

- Rules say "use code-reviewer proactively" but it's rarely invoked without explicit user prompt
- Security vulnerabilities in auth-adjacent code go unreviewed
- Build errors require manual invocation of `/build-fix`
- Secrets occasionally slip through without scan

---

## Gap Analysis

| Workflow Rule | Documented In | Hook Enforcing It |
|--------------|--------------|-------------------|
| Run code-reviewer after code changes | rules/common/agents.md | ❌ None |
| Run security-reviewer after auth/API changes | rules/common/security.md | ❌ None |
| Route build failures to build-error-resolver | rules/common/agents.md | ❌ None |
| Scan for secrets before commit | rules/common/security.md | ❌ None |
| Update docs after structural changes | rules/common/agents.md | ❌ None |
| Run tests after implementation (TDD GREEN step) | rules/common/testing.md | ❌ None |

---

## Proposed Deliverables

### New Hooks (6)

| Hook | Event | Trigger Condition | Action |
|------|-------|-------------------|--------|
| `code-review-nudge` | PostToolUse (Write/Edit) | File is `.ts/.go/.py/.java` etc, not test file | Suggests `code-reviewer` agent; suppressible |
| `security-scan-nudge` | PostToolUse (Write/Edit) | File path contains `auth`, `token`, `secret`, `password`, `api` | Suggests `security-reviewer`; marks as CRITICAL |
| `build-failure-router` | PostToolUse (Bash) | Exit code ≠ 0 AND output contains compile/type error patterns | Suggests `build-error-resolver` with error context |
| `secret-guard` | PreToolUse (Bash with git commit) | Scans staged diff for secret patterns (API key regex, PEM headers) | Blocks commit, prints warning |
| `doc-update-nudge` | PostToolUse (Write) | New file in `agents/`, `skills/`, `commands/` | Suggests `/update-docs` and `/update-codemaps` |
| `tdd-sequence-guard` | PostToolUse (Write) | Implementation file written WITHOUT corresponding test change in same session | Warns "No test change detected — TDD workflow?" |

### Scripts (6)

Corresponding `scripts/hooks/` implementations for each hook above.

### Skill (1)

| Skill | Description |
|-------|-------------|
| `clarc-hooks-authoring` | How to write, test, and configure clarc hooks — event types, matcher conditions, suppression patterns, performance constraints |

### Command (1)

| Command | Description |
|---------|-------------|
| `/hooks-config` | Interactive hook configuration — enable/disable individual hooks, set per-project overrides via `.clarc/hooks-config.json` |

---

## Implementation Phases

### Phase 1 — Secret Guard (highest risk, no suppression needed)
- Implement `scripts/hooks/secret-guard.js`
- Regex patterns: AWS keys, GH tokens, PEM headers, generic API key patterns
- Add to `hooks/hooks.json` as PreToolUse on Bash (git commit)
- Zero false-positive tolerance — only flag on high-confidence patterns

### Phase 2 — Build Failure Router
- Implement `scripts/hooks/build-failure-router.js`
- Parse exit code + stderr for compile/type error signals
- Route to `build-error-resolver` with structured error context
- Language-aware: Go, TypeScript, Python, Java error patterns

### Phase 3 — Code Review Nudge
- Implement `scripts/hooks/code-review-nudge.js`
- File extension allowlist for source files
- Cooldown: max once per 5-minute window per file (avoid spam)
- Suppressible via `.clarc/hooks-config.json`

### Phase 4 — Security Scan Nudge
- Implement `scripts/hooks/security-scan-nudge.js`
- Path-based trigger with configurable patterns
- Mark as CRITICAL (uppercase) to distinguish from regular nudges

### Phase 5 — Doc Update Nudge + TDD Guard
- Implement remaining two hooks
- Both are advisory only (no blocking)

### Phase 6 — Skill + Command
- Write `skills/clarc-hooks-authoring/SKILL.md`
- Implement `/hooks-config` command

---

## Hook Design Constraints

- Hooks must complete in < 500ms (non-blocking advisory hooks acceptable up to 2s)
- All advisory hooks (nudges) are suppressible via `.clarc/hooks-config.json`
- Secret guard and build failure router are non-suppressible by default
- No network calls in hooks (offline-first)
- All hooks must be idempotent

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Auto-running agents from hooks | Too invasive; hooks suggest, users decide |
| Blocking hooks for code review | Would frustrate iterative development |
| Hook telemetry / analytics | Privacy — no telemetry in clarc |

---

## Success Criteria

- [ ] `secret-guard` blocks commits with high-confidence secret patterns
- [ ] `build-failure-router` triggers on failed `npm run build`, `go build`, `tsc`
- [ ] `code-review-nudge` fires after source file changes without spamming
- [ ] All advisory hooks are suppressible
- [ ] Hook count grows from 7 → 13

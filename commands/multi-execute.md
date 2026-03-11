---
description: "[Requires codeagent-wrapper] Multi-model collaborative execution — prototype from plan → Claude refactors and implements → multi-model audit and delivery."
---

# Execute - Multi-Model Collaborative Execution

## Prerequisites

Requires `codeagent-wrapper` binary. Verify:
```
ls ~/.claude/bin/codeagent-wrapper 2>/dev/null && echo "OK" || echo "MISSING"
```
If `codeagent-wrapper` is **MISSING**: stop immediately — use `/plan` + `/tdd` instead.
See [codeagent installation](https://github.com/marvinrichter/codeagent) to install.

## When to Use This vs /tdd

| Use `/multi-execute` when | Use `/tdd` instead when |
|---------------------------|--------------------------|
| `codeagent-wrapper` is installed and configured | You don't have `codeagent-wrapper` |
| You have a `/multi-plan` output with SESSION_IDs | You're starting fresh without a prior plan |
| You want Codex/Gemini prototypes refactored by Claude | Native TDD is sufficient for the task |
| Multi-model audit (Codex + Gemini review) is desired | Single reviewer or speed matters more |

Multi-model collaborative execution — get prototype from plan → Claude refactors and implements → multi-model audit and delivery.

$ARGUMENTS

---

## Phases at a Glance

| Phase | Name | What Happens |
|-------|------|-------------|
| 0 | Read Plan | Parse plan file, confirm `SESSION_ID`, route by task type |
| 1 | Context Retrieval | MCP tool fetches relevant code context |
| 3 | Prototype Acquisition | Codex (backend) / Gemini (frontend) returns Unified Diff Patch |
| 4 | Code Implementation | Claude refactors dirty prototype → production-grade code |
| 5 | Audit & Delivery | Parallel Codex+Gemini review → integrate fixes → delivery report |

> Phase 2 is intentionally reserved. See [Reference](#reference) for call syntax and model parameters.

---

## Execution Workflow

### Phase 0: Read Plan

Parse the plan file (or direct task description), extract `SESSION_ID` and key files, and route to the correct model based on task type: Frontend → Gemini, Backend → Codex, Fullstack → both in parallel.

### Phase 1: Context Retrieval

Call `mcp__ace-tool__search_context` with a semantic query built from the plan's key files — never explore the filesystem manually with find/ls.

### Phase 3: Prototype Acquisition

Invoke Codex (backend) or Gemini (frontend) via `codeagent-wrapper`, reusing `SESSION_ID` from the plan where available; each model returns a **Unified Diff Patch only** — no direct file writes.

### Phase 4: Code Implementation

Claude applies the diff as code sovereign: simulate in a mental sandbox, refactor the dirty prototype to production-grade code, apply changes with Edit/Write tools, then run lint/typecheck/tests to catch regressions before proceeding.

### Phase 5: Audit and Delivery

Parallel Codex + Gemini code review (`run_in_background: true`); synthesize feedback weighted by domain trust (Codex for backend, Gemini for frontend); apply fixes; repeat until risk is acceptable; report a change summary + audit results to the user.

---

## Core Protocols

- **Language Protocol**: Use **English** when interacting with tools/models, communicate with user in their language
- **Code Sovereignty**: External models have **zero filesystem write access**, all modifications by Claude
- **Dirty Prototype Refactoring**: Treat Codex/Gemini Unified Diff as "dirty prototype", must refactor to production-grade code
- **Stop-Loss Mechanism**: Do not proceed to next phase until current phase output is validated
- **Prerequisite**: Only execute after user explicitly replies "Y" to `/ccg:plan` output (if missing, must confirm first)

---

## Key Rules

1. **Code Sovereignty** – All file modifications by Claude, external models have zero write access
2. **Dirty Prototype Refactoring** – Codex/Gemini output treated as draft, must refactor
3. **Trust Rules** – Backend follows Codex, Frontend follows Gemini
4. **Minimal Changes** – Only modify necessary code, no side effects
5. **Mandatory Audit** – Must perform multi-model Code Review after changes

---

## Usage

```bash
# Execute plan file
/ccg:execute .claude/plan/feature-name.md

# Execute task directly (for plans already discussed in context)
/ccg:execute implement user authentication based on previous plan
```

---

## Relationship with /ccg:plan

1. `/ccg:plan` generates plan + SESSION_ID
2. User confirms with "Y"
3. `/ccg:execute` reads plan, reuses SESSION_ID, executes implementation

## After This

- `/code-review` — verify the refactored implementation quality
- `/tdd` — add missing test coverage for the delivered changes
- `/verify` — run full build + type-check + tests to confirm clean delivery

---

## Reference

> Technical call syntax — consult when debugging or customising model invocations.

### Multi-Model Call Syntax

**Implementation prototype** (`run_in_background: true`):

```
Bash({
  command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}resume <SESSION_ID> - \"$PWD\" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <description>
Context: <plan + key files>
</TASK>
OUTPUT: Unified Diff Patch ONLY. Strictly prohibit any actual modifications.
EOF",
  run_in_background: true, timeout: 3600000
})
```

**Audit call** (same shape, different ROLE_FILE + Scope in TASK body).

**Model flags**: `{{GEMINI_MODEL_FLAG}}` = `--gemini-model gemini-3-pro-preview` (trailing space) for Gemini; empty for Codex.

**Wait for result**: `TaskOutput({ task_id: "<id>", block: true, timeout: 600000 })` — never kill; poll if needed.

**Role prompts**:

| Phase | Codex | Gemini |
|-------|-------|--------|
| Implementation | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/frontend.md` |
| Review | `~/.claude/.ccg/prompts/codex/reviewer.md` | `~/.claude/.ccg/prompts/gemini/reviewer.md` |

### Delivery Report Template

```markdown
## Execution Complete

### Change Summary
| File | Operation | Description |
|------|-----------|-------------|
| path/to/file.ts | Modified | Description |

### Audit Results
- Codex: <Passed/Found N issues>
- Gemini: <Passed/Found N issues>

### Recommendations
1. [ ] <Suggested test steps>
2. [ ] <Suggested verification steps>
```

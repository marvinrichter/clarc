---
description: "[Requires codeagent-wrapper] Multi-model collaborative planning — Context retrieval + Codex/Gemini dual-model analysis → step-by-step implementation plan."
---

# Plan - Multi-Model Collaborative Planning

## Prerequisites

Requires `codeagent-wrapper` binary. Verify:
```
ls ~/.claude/bin/codeagent-wrapper 2>/dev/null && echo "OK" || echo "MISSING"
```
If `codeagent-wrapper` is **MISSING**: stop immediately — use `/plan` + `/overnight` instead.
See [codeagent installation](https://github.com/marvinrichter/codeagent) to install.

**Fallback without codeagent-wrapper**: use `/plan` for sequential planning, then `/overnight` for autonomous execution.

## When to Use This vs /plan

| Use `/multi-plan` when | Use `/plan` instead when |
|------------------------|--------------------------|
| `codeagent-wrapper` is installed and configured | You don't have `codeagent-wrapper` |
| You want multi-model analysis (Codex + Gemini) | Native Claude planning is sufficient |
| Fullstack tasks need parallel frontend/backend plans | Single-domain or focused features |
| You want Codex session IDs for later `/multi-execute` reuse | You'll implement with `/tdd` directly |

Multi-model collaborative planning — context retrieval + dual-model analysis → generate step-by-step implementation plan.

$ARGUMENTS

---

## Phases at a Glance

| Phase | Name | What Happens |
|-------|------|-------------|
| 1 | Context Retrieval | Enhance prompt via MCP, retrieve relevant code context |
| 2 | Multi-Model Analysis | Parallel Codex (backend) + Gemini (frontend) analysis |
| 2.3 | Plan Draft | Optional dual-model plan drafts for completeness |
| 2.4 | Synthesize | Claude generates final plan, saves to `.claude/plan/` |

> Plan delivery ends here — execution is `/multi-execute`'s responsibility. See [Reference](#reference) for call syntax.

---

## Execution Workflow

### Step 1: Enhance the Prompt

Call `mcp__ace-tool__enhance_prompt` with `$ARGUMENTS` and recent conversation history; replace the original prompt with the enhanced result for all subsequent steps.

### Step 2: Retrieve Code Context

Call `mcp__ace-tool__search_context` with a semantic query derived from the enhanced prompt; if MCP is unavailable fall back to Glob + Grep for file discovery.

### Step 3: Clarify Requirements

If context is incomplete or requirements are ambiguous, ask guiding questions before proceeding — never plan against assumptions.

### Step 4: Parallel Multi-Model Analysis

Launch Codex (backend focus: architecture, performance, risks) and Gemini (frontend focus: UI/UX, accessibility) in parallel via `codeagent-wrapper` (`run_in_background: true`); save the returned `CODEX_SESSION` and `GEMINI_SESSION` IDs.

### Step 5: Cross-Validate Results

Identify consensus and divergence between the two analyses; resolve conflicts using domain trust rules — backend logic follows Codex, frontend design follows Gemini.

### Step 6: (Optional) Dual-Model Plan Drafts

For complex or fullstack tasks, request step-by-step plan drafts from both models (still read-only — no file writes); use these to catch omissions before Claude's final synthesis.

### Step 7: Synthesize and Save Plan

Generate the final implementation plan (task type, technical solution, step list, key files, risks, SESSION_IDs), save to `.claude/plan/<feature-name>.md`, and present it to the user.

### Step 8: Deliver and Stop

Display the plan with the saved file path and the `/ccg:execute` command to run it; terminate immediately — do not ask Y/N or trigger any execution automatically.

---

## Core Protocols

- **Language Protocol**: Use **English** when interacting with tools/models, communicate with user in their language
- **Mandatory Parallel**: Codex/Gemini calls MUST use `run_in_background: true` (including single model calls, to avoid blocking main thread)
- **Code Sovereignty**: External models have **zero filesystem write access**, all modifications by Claude
- **Stop-Loss Mechanism**: Do not proceed to next phase until current phase output is validated
- **Planning Only**: This command allows reading context and writing to `.claude/plan/*` plan files, but **NEVER modify production code**

---

## Key Rules

1. **Plan only, no implementation** – This command does not execute any code changes
2. **No Y/N prompts** – Only present plan, let user decide next steps
3. **Trust Rules** – Backend follows Codex, Frontend follows Gemini
4. External models have **zero filesystem write access**
5. **SESSION_ID Handoff** – Plan must include `CODEX_SESSION` / `GEMINI_SESSION` at end (for `/multi-execute resume <SESSION_ID>` use)

---

## Plan Saving

- **First planning**: `.claude/plan/<feature-name>.md`
- **Iterations**: `.claude/plan/<feature-name>-v2.md`, `-v3.md`, …

Save the file before presenting the plan to the user. If the user requests modifications, update the file and re-present.

---

## After This

- `/multi-execute <plan-file>` — execute the saved plan with multi-model collaboration
- `/tdd` — if implementing with native Claude instead of multi-execute
- `/breakdown` — decompose the plan into atomic tasks if the plan is large

---

## Reference

> Technical call syntax — consult when debugging or customising model invocations.

**Planning call** (`run_in_background: true`):

```
Bash({
  command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}- \"$PWD\" <<'EOF'
ROLE_FILE: <role prompt path>
<TASK>
Requirement: <enhanced requirement>
Context: <retrieved context>
</TASK>
OUTPUT: Step-by-step implementation plan with pseudo-code. DO NOT modify any files.
EOF",
  run_in_background: true, timeout: 3600000
})
```

**Model flags**: `{{GEMINI_MODEL_FLAG}}` = `--gemini-model gemini-3-pro-preview` (trailing space) for Gemini; empty for Codex.

**Wait**: `TaskOutput({ task_id: "<id>", block: true, timeout: 600000 })` — never kill; poll if timeout.

**Role prompts**:

| Phase | Codex | Gemini |
|-------|-------|--------|
| Analysis | `~/.claude/.ccg/prompts/codex/analyzer.md` | `~/.claude/.ccg/prompts/gemini/analyzer.md` |
| Planning | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/architect.md` |

### Plan File Template

```markdown
## Implementation Plan: <Task Name>

### Task Type
- [ ] Frontend (→ Gemini)
- [ ] Backend (→ Codex)
- [ ] Fullstack (→ Parallel)

### Technical Solution
<Optimal solution synthesized from Codex + Gemini analysis>

### Implementation Steps
1. <Step 1> - Expected deliverable
2. <Step 2> - Expected deliverable

### Key Files
| File | Operation | Description |
|------|-----------|-------------|
| path/to/file.ts:L10-L50 | Modify | Description |

### Risks and Mitigation
| Risk | Mitigation |
|------|------------|

### SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: <session_id>
- GEMINI_SESSION: <session_id>
```

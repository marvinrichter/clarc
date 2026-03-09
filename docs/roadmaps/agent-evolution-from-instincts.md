# Agent Evolution from Instincts Roadmap

**Status:** 📋 Planned
**Date:** 2026-03-09
**Motivation:** `continuous-learning-v2` accumulates validated instincts across sessions, but agent instructions are entirely static markdown files. Accumulated instincts never flow back into agents. The learning system and the agent system are completely disconnected.

---

## Problem Statement

Current state:
```
Sessions → /learn-eval → instincts/*.md → /evolve (clustering) → instincts sit there
                                                                        ↓
                                                              (no connection to agents)
```

Desired state:
```
Sessions → /learn-eval → instincts/*.md → /evolve → agent-evolution → agents get smarter
```

### What This Means Concretely

- User repeatedly corrects `typescript-reviewer` to flag a specific pattern
- Instinct is captured: "Always flag direct DOM manipulation in React code"
- `typescript-reviewer` agent never learns this — next session starts from the same static instructions
- The user corrects the agent again

### Symptoms

- Same mistakes recur from agents across sessions despite `/learn-eval` capturing the correction
- High-confidence instincts sit unused in `instincts/` directory
- No pathway from "I learned X" to "agent now does X"
- The `continuous-learning-v2` flywheel is incomplete — it captures but never applies

---

## Gap Analysis

| Flywheel Stage | Current State | Desired State |
|---------------|--------------|---------------|
| Capture | `/learn-eval` → instincts | Same |
| Apply to sessions | Via system-reminder MEMORY.md | Same |
| Apply to agents | ❌ Not possible | Agent-specific instinct overlays |
| Evolution tracking | None | Per-agent instinct changelog |
| Promotion threshold | None | Confidence ≥ 0.80, used ≥ 5 times → agent suggestion |

---

## Proposed Deliverables

### Agent-Instinct Overlay System (1)

Each agent can have an instinct overlay file that extends its base instructions:

```
~/.clarc/agent-instincts/
  typescript-reviewer.md      ← instincts specific to typescript-reviewer
  tdd-guide.md
  code-reviewer.md
```

These files are loaded by `session-start.js` and injected into the agent's system prompt via a special section at the end of the agent's instructions.

Format:
```markdown
## Learned Instincts (auto-generated — do not edit manually)
<!-- Last updated: 2026-03-09 by /agent-evolution -->

- Always flag direct DOM manipulation in React code (confidence: 0.85, learned: 2026-02-15)
- Check for missing `useCallback` on event handlers passed to memoized children (confidence: 0.72)
```

### Commands (2)

| Command | Description |
|---------|-------------|
| `/agent-evolution` | Reviews high-confidence instincts and proposes which agents they should be applied to. User approves, then instinct is written to agent-instinct overlay. |
| `/agent-instincts <agent-name>` | Shows the learned instinct overlay for a specific agent — what has been added, when, confidence scores |

### `session-start.js` Enhancement (1)

- Load `~/.clarc/agent-instincts/<agent-name>.md` if it exists
- Append to agent instructions under "Learned Instincts" section
- Only inject for the current session's active agents (detected from project context)

### Script (1)

| Script | Description |
|--------|-------------|
| `scripts/agent-evolution.js` | Core logic: reads instincts with confidence ≥ threshold, maps instinct domains to relevant agents, generates proposed overlay additions, requires user approval |

### Skill (1)

| Skill | Description |
|-------|-------------|
| `agent-evolution-patterns` | How the agent evolution system works — instinct-to-agent mapping, overlay format, approval workflow, rollback process |

---

## Instinct-to-Agent Mapping

Domain-based routing:

| Instinct Domain | Target Agents |
|-----------------|--------------|
| `typescript` | typescript-reviewer, code-reviewer |
| `python` | python-reviewer, code-reviewer |
| `testing` | tdd-guide, e2e-runner, all *-reviewer agents |
| `security` | security-reviewer, devsecops-reviewer |
| `architecture` | architect, planner |
| `documentation` | doc-updater |
| `git` | (applied globally via MEMORY.md) |
| `performance` | performance-analyst, all *-reviewer agents |

Instincts without a clear domain → proposed to `code-reviewer` as the catch-all.

---

## Approval Workflow

`/agent-evolution` output format:

```
Found 3 instincts ready for agent promotion:

1. "Always flag direct DOM manipulation in React code"
   Confidence: 0.85 | Used: 8 times | Domain: typescript
   → Proposed for: typescript-reviewer, code-reviewer
   [A]pply / [S]kip / [E]dit before applying

2. "Check useCallback on event handlers passed to memo children"
   Confidence: 0.78 | Used: 6 times | Domain: typescript
   → Proposed for: typescript-reviewer
   [A]pply / [S]kip / [E]dit before applying

3. "Require error boundaries in React component trees"
   Confidence: 0.81 | Used: 5 times | Domain: typescript
   → Proposed for: typescript-reviewer, code-reviewer
   [A]pply / [S]kip / [E]dit before applying
```

User selects A/S/E interactively or via `--all` flag.

---

## Implementation Phases

### Phase 1 — Overlay File Format
- Define overlay file format (`~/.clarc/agent-instincts/<name>.md`)
- Create initial empty overlays for top 10 agents
- Document format in `docs/contributing/agent-format.md`

### Phase 2 — Session-Start Injection
- Update `scripts/hooks/session-start.js` to read overlays
- Append to agent instructions under clearly marked section
- Skip if no overlay exists (backward compatible)
- Log: "Injected 3 learned instincts into typescript-reviewer"

### Phase 3 — Agent-Evolution Script
- Implement `scripts/agent-evolution.js`
- Read instincts above confidence threshold (default: 0.75)
- Apply domain→agent mapping
- Generate proposed overlay text
- Require explicit user approval before writing

### Phase 4 — Commands
- Implement `/agent-evolution` command (wraps script + interactive approval)
- Implement `/agent-instincts <name>` command (read and display overlay)

### Phase 5 — Skill + Documentation
- Write `skills/agent-evolution-patterns/SKILL.md`
- Update `skills/continuous-learning-v2/` to document the full pipeline including agent evolution

---

## Rollback Protocol

If an injected instinct causes worse agent behavior:

```
/instinct-outcome <id> bad --reason "Made typescript-reviewer too aggressive"
→ Confidence drops below promotion threshold
→ /agent-evolution suggests removal from overlay
→ User confirms
→ Instinct removed from overlay file
```

No automatic rollback — always user-confirmed.

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Fully automated agent evolution (no approval) | Too risky; always require user confirmation |
| Fine-tuning agent base instructions | Static base instructions are versioned in git; only overlays are dynamic |
| Cross-user instinct sharing | Privacy; instincts may contain proprietary patterns |

---

## Success Criteria

- [ ] `~/.clarc/agent-instincts/` directory and format defined
- [ ] `session-start.js` injects overlays for active agents
- [ ] `/agent-evolution` proposes instincts above confidence threshold
- [ ] User can approve/skip/edit each proposed instinct
- [ ] `/agent-instincts <name>` shows current overlay content
- [ ] Rollback via `/instinct-outcome` correctly reduces confidence below promotion threshold

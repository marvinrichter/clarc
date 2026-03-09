---
name: agent-evolution-patterns
description: How the agent evolution system works — capturing instincts, promoting them to agent overlays, approval workflow, rollback, and the full continuous-learning flywheel pipeline
skill_family: clarc-workflow
related_agents: []
tags: [clarc, agents, instincts, continuous-learning, evolution]
version: 1.0.0
---

# Agent Evolution Patterns

Agent evolution closes the continuous-learning feedback loop: validated instincts flow
from sessions into agent instructions, making agents smarter over time without touching
the versioned agent files in the repo.

## When to Activate

Use this skill when:
- Understanding why an agent keeps making the same mistake across sessions
- Promoting a high-confidence instinct to a specific agent
- Auditing what a reviewer agent has learned (checking its overlay)
- Rolling back a bad instinct that changed agent behaviour for the worse
- Designing a new agent that should benefit from accumulated instincts

## The Problem This Solves

```
Without agent evolution:
  Session → /learn-eval → instinct captured → instinct sits unused
  Next session: same agent makes the same mistake again

With agent evolution:
  Session → /learn-eval → instinct captured → /agent-evolution → overlay written
  Next session: agent applies the instinct automatically
```

## System Overview

```
continuous-learning-v2
  └── instincts/*.md  (confidence scored, domain tagged)
         |
         | /agent-evolution (user-approved promotion)
         v
~/.clarc/agent-instincts/
  typescript-reviewer.md   ← overlay with learned bullets
  tdd-guide.md
  code-reviewer.md
         |
         | session-start.js (automatic injection)
         v
Claude session context
  └── "When invoking typescript-reviewer, apply these instincts: ..."
```

## Overlay File Format

```markdown
## Learned Instincts (auto-generated — do not edit manually)
<!-- Last updated: 2026-03-10 by /agent-evolution -->

- Always flag direct DOM manipulation in React code (confidence: 0.85, learned: 2026-02-15)
- Check for missing useCallback on event handlers passed to memoized children (confidence: 0.78, learned: 2026-02-20)
```

**Rules:**
- One bullet = one atomic instinct (one trigger, one action)
- Never edit overlay files manually — use `/agent-evolution` to add, `/instinct-outcome` to remove
- Overlay files live in `~/.clarc/agent-instincts/` (user-local, not in the repo)

## Instinct-to-Agent Domain Mapping

| Domain | Target Agents |
|--------|--------------|
| `typescript` | typescript-reviewer, code-reviewer |
| `python` | python-reviewer, code-reviewer |
| `golang` | go-reviewer, code-reviewer |
| `rust` | rust-reviewer, code-reviewer |
| `java` | java-reviewer, code-reviewer |
| `ruby` | ruby-reviewer, code-reviewer |
| `swift` | swift-reviewer, code-reviewer |
| `testing` | tdd-guide, e2e-runner |
| `security` | security-reviewer, devsecops-reviewer |
| `architecture` | architect, planner |
| `documentation` | doc-updater |
| `performance` | performance-analyst |
| `git` | (applied globally via MEMORY.md, not per-agent) |
| _(unknown)_ | code-reviewer (catch-all) |

## Promotion Workflow

### Step 1: Review candidates

```
/agent-evolution
```

Output:
```
Found 3 instincts ready for agent promotion (threshold: 0.75):

1. "Always flag direct DOM manipulation in React code"
   Confidence: 0.85 | Domain: typescript | Learned: 2026-02-15
   → Proposed for: typescript-reviewer, code-reviewer
   [A]pply / [S]kip / [E]dit before applying

2. "Check useCallback on event handlers passed to memo children"
   Confidence: 0.78 | Domain: typescript | Learned: 2026-02-20
   → Proposed for: typescript-reviewer
   [A]pply / [S]kip / [E]dit before applying
```

### Step 2: Approve each instinct

- **A** — Apply as-is to all proposed agents
- **S** — Skip; instinct stays in the store for next review
- **E** — Edit the instinct text, then apply the edited version

### Step 3: Verify

```
/agent-instincts typescript-reviewer
```

Output:
```
Overlay for typescript-reviewer:

- Always flag direct DOM manipulation in React code (confidence: 0.85, learned: 2026-02-15)
- Check for missing useCallback on event handlers passed to memoized children (confidence: 0.78, learned: 2026-02-20)
```

## Session Injection

At session start, `session-start.js` reads all overlay files and outputs them to Claude:

```
--- Agent Learned Instincts ---
When invoking these agents, apply the following learned instincts:

### typescript-reviewer
## Learned Instincts (auto-generated — do not edit manually)
<!-- Last updated: 2026-03-10 by /agent-evolution -->

- Always flag direct DOM manipulation in React code (confidence: 0.85, learned: 2026-02-15)
---
```

Log: `[SessionStart] Agent instinct overlays loaded: typescript-reviewer (2 instincts), tdd-guide (1 instinct)`

## Rollback Protocol

If an instinct makes an agent worse:

```
1. /instinct-outcome <id> bad --reason "Made typescript-reviewer too aggressive"
   → Confidence drops below 0.75 promotion threshold

2. /agent-evolution
   → Low-confidence instinct appears as removal candidate

3. User confirms removal
   → Instinct removed from overlay file
```

Or remove directly without going through the promotion flow:

```bash
node scripts/agent-evolution.js remove typescript-reviewer "Always flag direct DOM"
```

## Threshold Tuning

| Threshold | Effect |
|-----------|--------|
| 0.9 | Only near-certain patterns (very conservative) |
| 0.75 | Default — good balance |
| 0.6 | More candidates, higher noise risk |
| 0.5 | Exploratory — review carefully before applying |

## Anti-Patterns

- **Editing overlay files manually** — use `/agent-evolution` so metadata is tracked
- **Promoting instincts without reviewing them** — always read what you apply (`/agent-instincts`)
- **Applying a `git` domain instinct to agents** — `git` instincts apply globally via MEMORY.md
- **Forgetting to roll back** — if an agent behaves unexpectedly, check its overlay first

## Underlying Script

```bash
node scripts/agent-evolution.js list [--threshold 0.75]
node scripts/agent-evolution.js apply <agent> "<text>" --confidence 0.80 --learned YYYY-MM-DD
node scripts/agent-evolution.js show [<agent>]
node scripts/agent-evolution.js remove <agent> "<prefix>"
```

## Related Commands

- `/agent-evolution` — interactive promotion workflow
- `/agent-instincts <name>` — show current overlay content
- `/instinct-outcome <id> bad` — roll back a promoted instinct
- `/evolve` — cluster instincts into new skills/commands/agents (different from agent overlays)
- `/instinct-status` — view all captured instincts with confidence scores

# Agent Format Contract

Agents are specialized subagents delegated work by Claude Code.
They live in `agents/<name>.md` and are invoked via the `Agent` tool.

---

## Frontmatter (Required)

```yaml
---
name: my-agent
description: One-line description shown in agent picker and rules/common/agents.md
model: sonnet
tools: ["Read", "Grep", "Glob", "Bash"]
uses_skills:
  - tdd-workflow
  - python-testing
---
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Lowercase with hyphens. Must match filename (e.g. `tdd-guide` → `tdd-guide.md`) |
| `description` | string | One sentence. Used in agent picker, `rules/common/agents.md`, and hub |
| `model` | string | One of: `haiku`, `sonnet`, `opus` |
| `tools` | array | JSON array of tool names the agent is allowed to use |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `uses_skills` | array | Skill names this agent depends on. Must match `skills/<name>/SKILL.md` |

---

## `uses_skills` Field

`uses_skills` declares the skills an agent references in its instructions.
This powers the reverse index (`skills/SKILL_AGENTS.md`) and the `/skill-impact` command.

**Rules:**
- Each entry must be a valid skill name matching `skills/<entry>/SKILL.md`
- List only skills the agent actively uses or references — not every related skill
- Conditional dependencies (e.g. language-specific skills) are still listed — add a comment if helpful
- Validated in CI by `scripts/ci/validate-agent-skill-refs.js`

**Example:**

```yaml
uses_skills:
  - tdd-workflow          # core TDD cycle
  - python-testing        # when Python project detected
  - typescript-testing    # when TS project detected
  - test-data
```

---

## Required Body Sections

Every agent MUST contain:

1. **Role statement** — One paragraph: "You are a ... specialist."
2. **When to invoke** — Triggers, explicit examples of when the user or system should call this agent
3. **Step-by-step instructions** — Numbered list or ordered sections describing how the agent does its work
4. **Output format** — What the agent returns (findings list, code diff, report, etc.)

---

## File Naming

- Lowercase with hyphens: `python-reviewer.md`, `tdd-guide.md`
- Name must match `name` field in frontmatter
- Location: `agents/<name>.md` (flat, no subdirectories)

---

## Checklist

Before adding or modifying an agent file:

- [ ] Frontmatter present with `name`, `description`, `model`, `tools`
- [ ] `model` is one of `haiku`, `sonnet`, `opus`
- [ ] `uses_skills` lists all skills explicitly referenced in instructions
- [ ] All `uses_skills` entries resolve to existing `skills/<name>/SKILL.md`
- [ ] Agent is listed in `rules/common/agents.md`
- [ ] Description is one sentence, action-oriented, starting with the agent's role

---

## Agent-Instinct Overlays

Each agent can have a learned-instinct overlay file that extends its base instructions
with patterns accumulated via the continuous-learning-v2 system.

### Location

```
~/.clarc/agent-instincts/
  typescript-reviewer.md
  tdd-guide.md
  code-reviewer.md
```

### Overlay File Format

```markdown
## Learned Instincts (auto-generated — do not edit manually)
<!-- Last updated: YYYY-MM-DD by /agent-evolution -->

- <instinct text> (confidence: 0.85, learned: YYYY-MM-DD)
- <instinct text> (confidence: 0.78, learned: YYYY-MM-DD)
```

**Rules:**
- Each bullet is one atomic instinct (one trigger, one action)
- `confidence` is the score from continuous-learning-v2 at promotion time (0.0–1.0)
- `learned` is the ISO date the instinct was first captured
- Do **not** edit overlay files manually — use `/agent-evolution` to add, `/instinct-outcome` to remove

### How Overlays Are Applied

`session-start.js` reads all overlay files at session start and outputs them into Claude's
context. Claude applies the instincts when invoking the corresponding agents. Overlays
are transparent — no changes to agent `.md` files in the repo.

### Instinct-to-Agent Domain Mapping

| Domain | Target Agents |
|--------|--------------|
| `typescript` | typescript-reviewer, code-reviewer |
| `python` | python-reviewer, code-reviewer |
| `testing` | tdd-guide, e2e-runner |
| `security` | security-reviewer, devsecops-reviewer |
| `architecture` | architect, planner |
| `documentation` | doc-updater |
| `performance` | performance-analyst |
| _(unknown)_ | code-reviewer (catch-all) |

---

> See `rules/common/agents.md` for the full catalog and invocation guidance.
> See `docs/contributing/skills-format.md` for the corresponding skill format.
> See `skills/agent-evolution-patterns/SKILL.md` for the full evolution workflow.

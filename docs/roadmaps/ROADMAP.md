# clarc Roadmap

## Active

_No active roadmaps. Start a new one when a system review or major initiative identifies work._

---

## How to Use

- **Active roadmap** — one file at the root of this directory (e.g., `my-initiative.md`)
- **Done** — move to `done/` with a semantic name after the last PR merges
- **Naming** — `<what-it-achieves>.md`, not `<what-we-did>.md` (outcome > mechanism)

New roadmap template:
```markdown
# <Title>

**Status:** 📋 Planned | 🔄 In Progress | ✅ Done
**Date:** YYYY-MM-DD
**Goal:** One sentence.

## Problem Statement
## Open Items
## Issue Tracker
```

---

## Done (14)

| Roadmap | What it delivered | PRs |
|---------|------------------|-----|
| [pre-launch-quality-sprints](done/pre-launch-quality-sprints.md) | 5 quality sprints (H1-H3, A1-A7, S1-S9, C1-C7, G1+G3) — system health 8.4→9.0 | #17–#23 |
| [agent-skill-dependency-graph](done/agent-skill-dependency-graph.md) | `uses_skills` frontmatter, CI validator, reverse index `SKILL_AGENTS.md` | #5 |
| [learning-flywheel](done/learning-flywheel.md) | Instinct lifecycle: observe→evolve→promote→export | #4 |
| [rules-skills-contract](done/rules-skills-contract.md) | Format contracts, rule trimming, CI linter for rules/skills boundary | #6 |
| [skill-discoverability](done/skill-discoverability.md) | `/find-skill`, MCP skill search, session-start SKILL_MAP enrichment | #8 |
| [hook-coverage](done/hook-coverage.md) | Secret guard, typecheck hooks, format dispatch, build-failure router | #7 |
| [per-project-skills](done/per-project-skills.md) | `.clarc/skills/` scanning, local skill override, team-sync command | #12 |
| [instinct-driven-agents](done/instinct-driven-agents.md) | Agent instinct overlays injected at session start from `~/.clarc/agent-instincts/` | #13 |
| [rules-versioning](done/rules-versioning.md) | `RULES_VERSION` file, staleness banner, `/update-rules` command | #11 |
| [mcp-cli-boundary](done/mcp-cli-boundary.md) | Deduplicated MCP tools vs CLI commands, `docs/mcp-guide.md` | #9 |
| [ci-artifact-tests](done/ci-artifact-tests.md) | Test suite for hooks, utils, package-manager detection | #10 |
| [install-lifecycle](done/install-lifecycle.md) | `--uninstall` flag, `npx clarc doctor`, orphan cleanup | #3 |
| [agent-conflict-resolution](done/agent-conflict-resolution.md) | Priority hierarchy doc, conflict decision tree, `agent-conflict-resolution` skill | #15 |
| [design-skills](done/design-skills.md) | 8 new design skills: color, typography, layout, iconography, motion, brand, creative direction, visual identity | #16 |

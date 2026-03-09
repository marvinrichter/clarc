# Agent ↔ Skill Coupling Roadmap

**Status:** ✅ Done
**Date:** 2026-03-09
**Motivation:** Agents reference skills informally in their instructions ("see skill `X`"). Skills are unaware of which agents use them. When a skill is updated, agents expecting the old patterns have no notification mechanism. There is no formal dependency graph between the 61 agents and 222 skills.

---

## Problem Statement

Current state:
- An agent like `tdd-guide` references TDD patterns implicitly in its instructions
- There are 5+ TDD-related skills across languages with overlapping content
- If `python-testing` skill is updated, `tdd-guide` may still reference outdated patterns
- No way to answer "which agents depend on this skill?" or "which skills does this agent use?"

### Symptoms

- Updating a skill does not propagate to dependent agents
- Agents and skills can drift out of sync over time
- When testing a skill change, no automated check verifies agent behavior
- Duplicate/contradictory pattern guidance across related skills goes undetected

---

## Gap Analysis

| Need | Current State | Desired State |
|------|--------------|---------------|
| Agent→Skill dependencies | Implicit text references | Explicit `uses_skills` frontmatter field |
| Skill→Agent reverse index | None | Generated `SKILL_AGENTS.md` index |
| Change notification | None | CI check: validate agent instructions still align when skill changes |
| Overlap detection | Manual (`agent-system-reviewer`) | Automated CI script |
| Cross-skill consistency | None | Skill family grouping with consistency checks |

---

## Proposed Deliverables

### Schema Change — Agent Frontmatter (1)

Add `uses_skills` array to agent YAML frontmatter:

```yaml
---
name: tdd-guide
description: Test-Driven Development specialist...
model: claude-sonnet
tools: [Read, Write, Edit, Bash, Grep]
uses_skills:
  - tdd-workflow
  - python-testing      # if Python project detected
  - typescript-testing  # if TS project detected
  - test-data
---
```

### Schema Change — Skill Frontmatter (1)

Add `related_agents` and `skill_family` to skill frontmatter:

```yaml
---
title: Python Testing
tags: [python, testing, pytest]
skill_family: testing
related_agents: [tdd-guide, python-reviewer, e2e-runner]
---
```

### Scripts (2)

| Script | Description |
|--------|-------------|
| `scripts/ci/validate-agent-skill-refs.js` | Validates that all `uses_skills` entries in agent frontmatter point to existing skill directories. Fails CI if broken. |
| `scripts/ci/generate-skill-agents-index.js` | Generates `skills/SKILL_AGENTS.md` — reverse index: for each skill, which agents use it |

### Generated Artifact (1)

| File | Description |
|------|-------------|
| `skills/SKILL_AGENTS.md` | Machine-readable reverse index. Generated in CI, committed to repo. |

### Command (1)

| Command | Description |
|---------|-------------|
| `/skill-impact <skill-name>` | Shows which agents use a given skill, which commands reference it, and what would be affected by changing it |

---

## Implementation Phases

### Phase 1 — Schema Definition
- Define `uses_skills` format for agent frontmatter
- Define `skill_family` + `related_agents` for skill frontmatter
- Document in `docs/contributing/agent-format.md` and `docs/contributing/skills-format.md`

### Phase 2 — Backfill Agent Frontmatter
- Add `uses_skills` to the 20 most-used agents (reviewer agents, planner, tdd-guide, code-reviewer, etc.)
- Prioritize agents with implicit skill references in their instruction text

### Phase 3 — CI Validation Script
- Implement `scripts/ci/validate-agent-skill-refs.js`
- Validate reference integrity: all listed skills exist
- Add to CI pipeline

### Phase 4 — Reverse Index Generator
- Implement `scripts/ci/generate-skill-agents-index.js`
- Add to CI pipeline (generates + commits `skills/SKILL_AGENTS.md`)
- Format: grouped by skill family, sorted by agent count

### Phase 5 — `/skill-impact` Command
- Query `SKILL_AGENTS.md` for reverse lookup
- Add command to `/find-skill` output footer: "Use `/skill-impact <name>` to see dependents"

---

## Skill Families

| Family | Skills |
|--------|--------|
| `testing` | tdd-workflow, python-testing, typescript-testing, go-testing, etc. |
| `architecture` | hexagonal-typescript, hexagonal-java, ddd-typescript, arc42-c4, etc. |
| `security` | auth-patterns, supply-chain-security, gdpr-privacy, zero-trust-review, etc. |
| `devops` | docker-patterns, kubernetes-patterns, gitops-patterns, terraform-patterns, etc. |
| `review` | (all reviewer skills) |
| `ai-patterns` | llm-app-patterns, rag-patterns, agent-reliability, multi-agent-patterns, etc. |

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Runtime skill injection into agents | Claude Code doesn't support dynamic agent instruction modification |
| LLM-based consistency checking | Overkill for format validation; schema checks are sufficient |
| Auto-updating agent instructions on skill change | Too risky; flag for manual review instead |

---

## Success Criteria

- [x] 20 key agents have `uses_skills` frontmatter (18 agents, 57 refs)
- [x] All agent skill references are validated in CI (`scripts/ci/validate-agent-skill-refs.js`)
- [x] `skills/SKILL_AGENTS.md` is generated and up to date
- [x] `/skill-impact` correctly identifies at least 3 dependents for a core skill like `tdd-workflow` (4 agents)

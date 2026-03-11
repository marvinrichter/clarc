# Agent ↔ Skill Dependency Graph

**Status:** ✅ Done | **Date:** 2026-03-09 | **PR:** #5

**Goal:** Formal dependency graph between 61 agents and 222 skills.

## Key Outcomes
- `uses_skills` frontmatter field added to all agents
- `scripts/ci/validate-agent-skill-refs.js` — CI validator for skill references
- `skills/SKILL_AGENTS.md` — auto-generated reverse index (35 skills, 57 links)
- `scripts/ci/generate-skill-agents-index.js` — generator script

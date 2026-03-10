# Skill Content Depth

**Status:** ✅ Done
**Date:** 2026-03-10
**Goal:** Add Anti-Patterns sections and expand When-to-Activate triggers across the skill corpus — the two largest quality gaps identified in the post-Sprint-5 system review.

## Problem Statement

System review (2026-03-10) found:
- **190 of 235 skills (81%)** have no `## Anti-Patterns` section. Anti-pattern WRONG/CORRECT pairs are the #1 differentiator between 7.5 and 8.5+ skill scores (hexagonal-typescript: 8.7, ddd-typescript: 8.6 — both lead with WRONG/CORRECT pairs for every pattern).
- **127 of 235 skills (54%)** have a When-to-Activate section under 50 words. Short triggers reduce routing precision — Claude can't reliably decide when to load the skill.

The CI validator (`validate-skill-quality.js`) already flags both as WARNs. This roadmap closes the content gap.

## Open Items

### S1 — Anti-Patterns for top-50 traffic skills

Priority order: highest-traffic skills first (from `skills/SKILL_AGENTS.md` — skills referenced by most agents).

Each Anti-Patterns section follows the established pattern:
```markdown
## Anti-Patterns

### Pattern Name

**Wrong:**
\```lang
// bad code
\```

**Correct:**
\```lang
// good code
\```

**Why:** One sentence explanation.
```

Target: top 50 skills (≈ 40% of corpus, highest user impact).

### S2 — Expand When-to-Activate sections (127 skills)

Each When-to section must reach ≥ 50 words with 3-4 concrete bullets:
```markdown
## When to Activate

Use this skill when:
- Writing a new X for the first time
- Reviewing existing X for Y issues
- Migrating from old-X to new-X pattern
- Debugging X-related failures in production
```

Target: all 127 skills currently under threshold.

### A1 — Agent overlap disambiguation

Clarify boundaries for 4 pairs flagged in agents.json:

| Pair | Clarification |
|------|--------------|
| `talk-coach` / `presentation-designer` | talk-coach = content/narrative/rehearsal; presentation-designer = visual design/layout/generation |
| `competitive-analyst` / `workflow-os-competitor-analyst` | competitive-analyst = general market; workflow-os-competitor-analyst = clarc-vs-tools only |
| `security-reviewer` / `devsecops-reviewer` | security-reviewer = code-level (OWASP, SSRF, injection); devsecops-reviewer = pipeline/infra/supply-chain |
| `prompt-reviewer` / `prompt-quality-scorer` | prompt-reviewer = single prompt quality; prompt-quality-scorer = system-wide audit across all agents |

Add one-line `## Not this agent — use X instead` note to each.

## Issue Tracker

| ID | Item | Status |
|----|------|--------|
| S1 | Anti-Patterns: top 27 high-traffic skills | ✅ PR #24 |
| S2 | When-to expansion: 127 skills | ✅ PR #25 |
| A1 | Agent disambiguation: 4 pairs | ✅ PR #25 |

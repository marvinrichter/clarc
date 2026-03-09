# Rules vs. Skills Boundary Roadmap

**Status:** 📋 Planned
**Date:** 2026-03-09
**Motivation:** Rules are supposed to be "always follow" governance. Skills are "on-demand" deep reference. In practice the line is blurry — some rules contain full YAML/code examples (GitOps rule has complete Kubernetes manifests), while some skills are shorter than the rules referencing them. Users don't know where to look.

---

## Problem Statement

Intended separation:
- **Rules** = constraints, checklists, "thou shalt" governance (< 1 page)
- **Skills** = actionable reference, patterns, examples, how-to (full depth)

Actual state:
- `rules/common/gitops.md` — 200+ lines with complete YAML examples
- `rules/common/security.md` — contains detailed Privacy Engineering + Zero-Trust sections that belong in skills
- Some skills (`clarc-way`, `quickstart`) are closer to rules in that they define fixed workflows
- No enforced format contract distinguishes them at the file level

### Symptoms

- Users read rules looking for examples, find them, but can't find more depth
- Users read skills looking for constraints, find none, and don't check the rules
- Adding new content requires a judgment call on where it belongs — different authors decide differently
- `rules/common/` has grown to 8 files; some are more like mini-skills

---

## Gap Analysis

| File | Current Location | Correct Location |
|------|-----------------|-----------------|
| GitOps YAML examples | `rules/common/gitops.md` | `skills/gitops-patterns/SKILL.md` (already exists) |
| Privacy Engineering patterns | `rules/common/security.md` | `skills/gdpr-privacy/SKILL.md` (already exists) |
| Zero-Trust checklist + patterns | `rules/common/security.md` | `skills/zero-trust-review/SKILL.md` (or new skill) |
| `clarc-way` command | `commands/clarc-way.md` | Should be a rule-backed command, not a skill |
| Agent orchestration examples | `rules/common/agents.md` | `skills/multi-agent-patterns/SKILL.md` |

---

## Proposed Deliverables

### Format Contracts (2 documents)

| Document | Description |
|----------|-------------|
| `docs/contributing/rules-format.md` | Rules contract: max 1 page, no code examples longer than 5 lines, checklist format required, "see skill X for examples" pattern |
| `docs/contributing/skills-format.md` | Skills contract: required sections (When to Use, Patterns, Examples, Anti-patterns), frontmatter schema, min/max line counts |

### Rule Refactors (3 files trimmed)

| File | Change |
|------|--------|
| `rules/common/gitops.md` | Remove YAML examples → replace with "see `skills/gitops-patterns`" references |
| `rules/common/security.md` | Extract Privacy Engineering → `skills/gdpr-privacy`, Zero-Trust → `skills/zero-trust-review`. Keep only the checklist items. |
| `rules/common/agents.md` | Extract orchestration pattern examples → `skills/multi-agent-patterns`. Keep table + rules. |

### Linter (1 script)

| Script | Description |
|--------|-------------|
| `scripts/ci/validate-rule-format.js` | CI linter: rules files may not exceed 80 lines, may not contain code blocks > 5 lines, must contain a checklist (- [ ] items). Fails CI if violated. |

### Command (1)

| Command | Description |
|---------|-------------|
| `/whats-the-rule <topic>` | Given a topic, returns the rule constraint AND the linked skill for deeper reference. Makes the two-layer system navigable. |

---

## Implementation Phases

### Phase 1 — Document the Contracts
- Write `docs/contributing/rules-format.md`
- Write `docs/contributing/skills-format.md`
- Establish the reference pattern: rules cite skills with `> See skill \`X\` for implementation examples.`

### Phase 2 — Trim Overstuffed Rules
- Refactor `rules/common/gitops.md` — move examples to skill references
- Refactor `rules/common/security.md` — extract Privacy + Zero-Trust detail
- Refactor `rules/common/agents.md` — extract orchestration examples
- Verify existing skills cover the extracted content (add if gaps found)

### Phase 3 — CI Linter
- Implement `scripts/ci/validate-rule-format.js`
- Add to CI pipeline (`.github/workflows/`)
- Run against all existing rules — fix violations

### Phase 4 — `/whats-the-rule` Command
- Implement command that maps topic → rule file + linked skills
- Build topic→file mapping from rule frontmatter or a manifest

---

## Format Contract Summary

**Rules must:**
- Be ≤ 80 lines
- Contain a checklist (at least 3 `- [ ]` items)
- Have code examples ≤ 5 lines (illustrative only)
- End with `> See skill \`X\` for implementation examples.`
- Have a `# Topic` H1 and sections using H2

**Skills must:**
- Have frontmatter with `title`, `when_to_use`, `tags`
- Contain sections: When to Use, Patterns (with examples), Anti-patterns
- Have code examples showing BOTH wrong and correct approaches
- Be ≥ 50 lines (if shorter, it's a rule, not a skill)

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Merging rules and skills into one system | The two-layer model is correct conceptually; the implementation just needs enforcement |
| Auto-migrating content between rules and skills | Too risky to automate; manual review required |

---

## Success Criteria

- [ ] All rule files pass the CI linter (≤ 80 lines, no large code blocks)
- [ ] GitOps, Security, and Agents rules reference skills instead of embedding examples
- [ ] `docs/contributing/` has both format contracts
- [ ] `/whats-the-rule` resolves the 10 most common topics correctly

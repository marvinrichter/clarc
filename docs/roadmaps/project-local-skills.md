# Project-Local Skills Layer Roadmap

**Status:** 📋 Planned
**Date:** 2026-03-09
**Motivation:** Users can learn global instincts via `continuous-learning-v2`, but there is no formal mechanism for project-specific skills. A team working on a specific codebase cannot easily create, share, and version project-local skills without directly editing global `~/.clarc/` files.

---

## Problem Statement

Current state:
- All skills are global (`~/.clarc/skills/` → `~/.claude/commands/`)
- `.clarc/` directory exists as a memory bank but is not scanned for skills
- Teams with project-specific patterns (company API conventions, internal library usage, custom architecture decisions) have no skill-shaped container for them
- Instincts are learned but are plain text, not structured skills with examples and anti-patterns

### Use Cases Not Served Today

1. **Team onboarding skill**: "How we use our internal auth library" — project-specific, shouldn't be in global clarc
2. **Codebase conventions**: "How we name files in this monorepo" — changes per project
3. **Approved patterns**: "The only approved way to call our payment API" — project-critical, must be enforced
4. **Migration guide**: "We're moving from REST to gRPC — here's the pattern" — temporary, project-scoped

---

## Gap Analysis

| Need | Current State | Desired State |
|------|--------------|---------------|
| Project-local skill creation | Manual file creation | `/skill-create --local` scaffolds into `.clarc/skills/` |
| Project-local skill loading | Not scanned | `session-start.js` scans `.clarc/skills/` and adds to SKILL_MAP |
| Team skill sharing | Via global clarc fork/PR | Via `.clarc/skills/` committed to project repo |
| Local vs global precedence | N/A | Local overrides global for same skill name |
| Skill export to global | Not possible | `/promote-skill <name>` proposes to global clarc |

---

## Proposed Deliverables

### Directory Convention (1)

```
<project-root>/
  .clarc/
    skills/
      our-auth-pattern/
        SKILL.md          ← project-local skill
      internal-api-guide/
        SKILL.md
    instincts.md
    context.md
    progress.md
```

`.clarc/skills/` is gitignored by default in global clarc, but project teams can choose to commit it.

### `session-start.js` Enhancement (1)

- Scan `.clarc/skills/` at session start
- Add found skills to `SKILL_MAP` with `[local]` prefix
- Local skills override global if same directory name
- Print: "Loaded 3 project-local skills: our-auth-pattern, internal-api-guide, payment-flow"

### Commands (3)

| Command | Description |
|---------|-------------|
| `/skill-create --local <name>` | Scaffold a new project-local skill in `.clarc/skills/<name>/SKILL.md` with required sections and frontmatter |
| `/skills-local` | List all project-local skills, show which ones override global skills |
| `/promote-skill <name>` | Export a project-local skill to the global clarc repository — opens a PR or copies to `~/.clarc/skills/` |

### `.clarc/skills/` Scaffold Template (1)

```markdown
---
title: <Name>
scope: project-local
tags: []
created: <date>
team: <optional team name>
---

## When to Use

<describe the situation that calls for this skill>

## Pattern

<the approved approach, with code examples>

## Anti-patterns

<what NOT to do, with examples>

## References

<internal docs, tickets, ADRs>
```

### Skill (1)

| Skill | Description |
|-------|-------------|
| `project-local-skills` | How to create, manage, and share project-local skills — `.clarc/skills/` structure, scope hierarchy, team workflow, promotion to global |

---

## Implementation Phases

### Phase 1 — Directory Convention + Session-Start Scanning
- Update `scripts/hooks/session-start.js` to scan `.clarc/skills/`
- Parse frontmatter and add to SKILL_MAP
- Handle name conflicts (local wins, log a notice)
- Test with a synthetic `.clarc/skills/test-skill/SKILL.md`

### Phase 2 — `/skill-create --local` Command
- Add `--local` flag to existing `/skill-create` command
- Target: `.clarc/skills/<name>/SKILL.md`
- Use project-local scaffold template (not global clarc skill template)
- Pre-fill: date, detected project language in tags

### Phase 3 — `/skills-local` Command
- List `.clarc/skills/` directory contents
- Show: name, one-line description, whether it overrides a global skill
- Show total count vs global skills

### Phase 4 — Promote Command
- Implement `/promote-skill <name>`
- Copy `.clarc/skills/<name>/` to `~/.clarc/skills/<name>/`
- If `gh` is available: offer to open a PR to upstream clarc repo
- Add to `skills/INDEX.md`
- Warn: "Promoted skills become globally visible — remove project-specific content first"

### Phase 5 — Documentation + Skill
- Write `skills/project-local-skills/SKILL.md`
- Update README with project-local skills section
- Add `.clarc/skills/` to `.gitignore` template (opt-in to commit)

---

## Scope Hierarchy

```
Skill resolution order (highest precedence first):
1. .clarc/skills/<name>/  (project-local)
2. ~/.clarc/skills/<name>/ (global clarc)
3. Built-in system-reminder skills (Claude Code native)
```

When a project-local skill overrides a global one:
- Session-start logs: "Local skill 'typescript-patterns' overrides global version"
- `/skills-local` marks it with `[overrides global]`

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Encrypted/private skills | Out of scope; use `.gitignore` for sensitive content |
| Skill access control (team vs personal) | Filesystem permissions are sufficient |
| Skill inheritance (extend global skill) | Adds complexity; override-or-new is sufficient |

---

## Success Criteria

- [ ] `.clarc/skills/` is scanned at session start
- [ ] Project-local skills appear in SKILL_MAP with `[local]` prefix
- [ ] `/skill-create --local` creates valid skill scaffold
- [ ] Local skills override global skills for same name
- [ ] `/skills-local` shows accurate listing
- [ ] `/promote-skill` successfully copies to global scope

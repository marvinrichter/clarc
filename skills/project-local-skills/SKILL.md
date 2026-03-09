---
name: project-local-skills
description: How to create, manage, and share project-local skills — .clarc/skills/ structure, scope hierarchy, team workflow, and promotion to global clarc
skill_family: clarc-workflow
related_agents: []
tags: [clarc, skills, project-local, team]
version: 1.0.0
---

# Project-Local Skills

Project-local skills live in `.clarc/skills/` inside a project repository.
They are automatically loaded at session start and override global clarc skills of the same name.

## When to Activate

Use project-local skills when:
- A team has project-specific conventions (internal API patterns, company auth library)
- Conventions differ from clarc's global rules for this codebase
- A migration is underway and the pattern is temporary
- The skill should be versioned alongside the code it describes

## Directory Structure

```
<project-root>/
  .clarc/
    skills/
      our-auth-pattern/
        SKILL.md        ← project-local skill
      internal-api/
        SKILL.md
    instincts.md        ← personal learned patterns (gitignore this)
    context.md          ← last session context
    progress.md         ← current progress
```

## Scope Hierarchy

Skills are resolved in this order (highest precedence first):

```
1. .clarc/skills/<name>/     → project-local (this project only)
2. ~/.clarc/skills/<name>/   → global clarc (all projects)
3. Claude Code native skills → built-in system-reminder skills
```

When a local skill overrides a global one, session-start logs:
`Local skill 'typescript-patterns' overrides global version`

## Creating a Project-Local Skill

```bash
/skill-create --local <name>
```

Scaffolds `.clarc/skills/<name>/SKILL.md`:

```markdown
---
title: <Name>
scope: project-local
tags: []
created: <date>
team:
---

## When to Use

<situation that calls for this skill>

## Pattern

<the approved approach, with code examples>

## Anti-patterns

<what NOT to do>

## References

<internal docs, ADRs, tickets>
```

Fill in the sections, then commit `.clarc/skills/` to the repo.

## Team Workflow

```
1. Developer creates skill:   /skill-create --local our-auth-pattern
2. Fills in pattern content
3. Commits .clarc/skills/ to the project repo
4. Team pulls → all members get the skill at next session start
5. When ready for global use: /promote-skill our-auth-pattern
```

## Listing Local Skills

```bash
/skills-local
```

Output:

```
Project-local skills — .clarc/skills/ (2 skills)

  our-auth-pattern    How we use the internal auth library
  payment-flow        Approved payment integration pattern

Total: 2 local  ·  0 override global
```

## Promoting to Global

When a project-local skill is useful across multiple projects:

```bash
/promote-skill our-auth-pattern        # Copy to ~/.clarc/skills/
/promote-skill our-auth-pattern --pr   # Also open upstream PR
```

Safety checklist before promoting:
- [ ] Remove internal URLs and company-specific names
- [ ] Replace hardcoded paths with generic examples
- [ ] Ensure examples work without internal dependencies

## What to Gitignore

```gitignore
# Keep skills committed (shared with team)
# .clarc/skills/   ← do NOT ignore

# Keep instincts private (personal learning)
.clarc/instincts.md
.clarc/context.md
.clarc/progress.md
```

Or commit everything if the full memory bank should be shared.

## Anti-patterns

- Creating a local skill for something already covered by a global clarc skill (use `/find-skill` first)
- Promoting a skill that still contains internal URLs or company names
- Putting project-local skills in `~/.clarc/skills/` — those become global for all projects
- Forgetting to commit `.clarc/skills/` — other team members won't see the skill

## Related Commands

- `/skill-create --local <name>` — scaffold a new project-local skill
- `/skills-local` — list all local skills and override status
- `/promote-skill <name>` — promote a local skill to global scope
- `/find-skill <topic>` — search global clarc skills before creating a new one

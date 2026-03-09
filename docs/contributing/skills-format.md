# Skills Format Contract

Skills provide **actionable reference and deep patterns** for specific domains.
They are loaded on demand — not on every session — so depth is expected.

---

## Frontmatter (Required)

```yaml
---
name: my-skill-name
description: One-line description of when to use this skill
triggers:
  - when doing X
  - when Y is needed
---
```

---

## Required Sections

Every skill MUST contain these sections (in order):

1. **Overview** — what the skill covers and when to activate it
2. **Patterns** — concrete implementation patterns with code examples
3. **Anti-patterns** — what NOT to do and why
4. **Checklist** — at least 3 `- [ ]` items summarizing the key checks

---

## Code Example Standard

Skills MUST show BOTH wrong and correct approaches:

```
# WRONG: reason why
bad_example()

# CORRECT: reason why
good_example()
```

---

## Length and Depth

- Minimum: **50 lines** (if shorter, it's a rule, not a skill)
- No maximum — depth is a virtue
- Each pattern should have at least one code example

---

## Checklist

Before adding or modifying a skill file:

- [ ] Frontmatter present with `name`, `description`, `triggers`
- [ ] All 4 required sections present (Overview, Patterns, Anti-patterns, Checklist)
- [ ] Code examples show WRONG and CORRECT approaches
- [ ] File is ≥ 50 lines
- [ ] Located in `skills/<name>/SKILL.md`

---

> See skill `clarc-way` for the full clarc workflow and the relationship between rules, skills, commands, and agents.

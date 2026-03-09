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
skill_family: testing
related_agents:
  - tdd-guide
  - python-reviewer
---
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Lowercase with hyphens. Must match directory name |
| `description` | string | One sentence. Used in skill picker and `skills/INDEX.md` |
| `triggers` | array | Conditions that activate this skill |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `skill_family` | string | Logical grouping. See **Skill Families** below |
| `related_agents` | array | Agents that use this skill. Used to build `skills/SKILL_AGENTS.md` |

#### Skill Families

| Family | Example Skills |
|--------|---------------|
| `testing` | tdd-workflow, python-testing, typescript-testing, go-testing |
| `architecture` | hexagonal-typescript, ddd-typescript, arc42-c4 |
| `security` | auth-patterns, supply-chain-security, gdpr-privacy |
| `devops` | docker-patterns, kubernetes-patterns, terraform-patterns |
| `review` | (language reviewer patterns) |
| `ai-patterns` | llm-app-patterns, rag-patterns, agent-reliability |

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
- [ ] `skill_family` set to one of the standard families
- [ ] All 4 required sections present (Overview, Patterns, Anti-patterns, Checklist)
- [ ] Code examples show WRONG and CORRECT approaches
- [ ] File is ≥ 50 lines
- [ ] Located in `skills/<name>/SKILL.md`

---

> See skill `clarc-way` for the full clarc workflow and the relationship between rules, skills, commands, and agents.

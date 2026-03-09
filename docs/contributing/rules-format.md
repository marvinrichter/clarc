# Rules Format Contract

Rules define **constraints and governance** that always apply — not how-to guides.
They are loaded into every session and kept short so they are always read.

---

## Structure Requirements

A rule file MUST:

- Have a single `# Topic` H1 heading
- Use `## Section` H2 for each concern
- Contain at least one checklist (`- [ ]` items)
- End with a skill reference: `> See skill \`<name>\` for implementation examples.`

A rule file MUST NOT:

- Exceed **80 lines**
- Contain code examples longer than **5 lines**
- Duplicate content already covered in a skill
- Serve as a how-to guide or tutorial

---

## The Two-Layer Model

```
Rules  → constraints, checklists, "thou shalt" governance  (≤ 80 lines)
Skills → patterns, examples, implementation detail          (≥ 50 lines)
```

When adding new content, ask:
- **Is this a constraint?** → rule
- **Is this an example or pattern?** → skill

---

## Checklist

Before adding or modifying a rule file:

- [ ] File is ≤ 80 lines
- [ ] At least one `- [ ]` checklist present
- [ ] No code block exceeds 5 lines
- [ ] Ends with `> See skill \`X\` for implementation examples.`
- [ ] No duplication of skill content

---

> See skill `clarc-way` for the full clarc workflow and the relationship between rules, skills, commands, and agents.

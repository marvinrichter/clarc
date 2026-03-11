# Command Format Contract

Commands are slash commands invoked by users directly in Claude Code.
They live in `commands/<name>.md` and are triggered via `/name` syntax.

---

## Frontmatter (Required)

```yaml
---
description: One-line description shown in command picker
---
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | One sentence. Used in command picker and hub listing |

---

## Sections

### Usage (optional)

Include a `## Usage` section when the command accepts arguments or supports multiple modes:

```
/my-command                  — default behavior
/my-command <focus-area>     — targeted run
```

### Steps Claude Should Follow (required)

The main body of the command. Use numbered steps (`## Step N — Title`) for sequential review or workflow commands. Each step should include:
- What to check or do
- Bash commands to gather information (where applicable)
- Checklists (`- [ ]`) for verification items
- Classification tables for findings

### Output Format (recommended for review commands)

Define the expected report structure explicitly. Use a fenced code block with `markdown` or `text` syntax to show the template.

### After This (mandatory for review and audit commands)

Commands that produce findings or modify code MUST include an `## After This` section near the end of the file (before any reference/footer sections). It lists the natural next steps a user should take after running this command.

**Rules:**
- 2–3 bullet points maximum
- Each bullet: `/command-name` — one-sentence description of when to use it
- Focus on commands that directly address findings from this command
- Required for all `*-review`, `*-audit`, and `*-check` commands

**Example:**

```markdown
## After This

- `/security-review` — scan for vulnerabilities exposed by the changes reviewed
- `/tdd` — add tests for any logic gaps found during review
```

### Reference Skills (optional)

List the skills this command draws on, using the format:

```markdown
## Reference Skills

- `skill-name` — one-line description of what it contributes
```

---

## File Naming

Lowercase with hyphens. Examples: `eda-review.md`, `gitops-review.md`, `web-perf.md`.

---

## Checklist

Before adding a new command:

- [ ] `description` frontmatter is present and one sentence
- [ ] Steps are numbered and include actionable bash commands or checklists
- [ ] Output format is defined for review/audit commands
- [ ] `## After This` section present (mandatory for `*-review`, `*-audit`, `*-check`)
- [ ] File is under 400 lines

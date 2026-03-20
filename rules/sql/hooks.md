---
paths:
  - "**/*.sql"
  - "**/migrations/**"
globs:
  - "**/*.sql"
  - "**/*.prisma"
  - "**/migrations/**"
alwaysApply: false
---

# SQL Hooks

> This file extends [common/hooks.md](../common/hooks.md) with SQL specific content.

## PostToolUse: Auto-Format with sqlfluff

After every SQL file edit, `sqlfluff` runs automatically via the PostToolUse hook.

### Formatter: sqlfluff

```bash
sqlfluff fix --dialect postgres "$FILE"
```

### Installation

```bash
# pip (recommended)
pip install sqlfluff

# Verify
sqlfluff --version
```

### Configuration

Create `.sqlfluff` in project root:

```ini
[sqlfluff]
dialect = postgres
templater = raw
max_line_length = 120

[sqlfluff:rules:layout.indent]
indent_unit = space
tab_space_size = 2

[sqlfluff:rules:capitalisation.keywords]
capitalisation_policy = upper

[sqlfluff:rules:capitalisation.identifiers]
capitalisation_policy = lower
```

### Linting only (CI)

```bash
sqlfluff lint --dialect postgres migrations/
```

### GitHub Actions

```yaml
- name: Lint SQL
  run: |
    pip install sqlfluff
    sqlfluff lint --dialect postgres migrations/
```

### Alternative: pg_format

```bash
# Install
brew install pgformatter

# Format
pg_format --inplace "$FILE"
```

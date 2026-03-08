---
paths:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.zsh"
---

# Bash Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Bash specific content.

## PostToolUse: Auto-Format with shfmt

After every Bash file edit, `shfmt` runs automatically via the PostToolUse hook.

### Formatter: shfmt

```bash
shfmt -i 2 -ci "$FILE"
```

- `-i 2` — 2-space indentation
- `-ci` — indent `case` statement bodies

### Installation

```bash
# macOS
brew install shfmt

# Go
go install mvdan.cc/sh/v3/cmd/shfmt@latest

# npm (via package.json devDependencies)
npm install --save-dev shfmt
```

### CI Integration

Add to your CI pipeline:

```yaml
- name: Check shell formatting
  run: shfmt -d -i 2 -ci scripts/
```

### Linting with shellcheck

Pair `shfmt` with `shellcheck` for static analysis:

```bash
shellcheck scripts/*.sh
```

In CI:

```yaml
- name: Lint shell scripts
  run: shellcheck $(find scripts -name '*.sh')
```

### Editor config for shfmt

Add to `.editorconfig`:

```ini
[*.sh]
indent_style = space
indent_size = 2
```

---
paths:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.zsh"
  - "**/Makefile"
---

# Bash Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Bash specific content.

## Shebang and Safety Options (CRITICAL)

Every script MUST start with:

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- `set -e` — exit immediately on error
- `set -u` — treat unset variables as errors
- `set -o pipefail` — pipe failures propagate

## Quoting

Always quote variables to prevent word splitting and glob expansion:

```bash
# WRONG
cp $file $destination

# CORRECT
cp "$file" "$destination"
```

Use `"${var}"` for clarity in complex expressions:

```bash
echo "${prefix}_${suffix}"
```

## Functions

- Declare local variables with `local`
- Use `snake_case` for function names

```bash
my_function() {
  local input="$1"
  local result
  result=$(process "$input")
  echo "$result"
}
```

## Variable Naming

- `UPPER_CASE` for environment variables and constants
- `lower_case` for local variables
- Prefix script-scoped globals with `_` to distinguish from env vars

## Command Substitution

Use `$(...)` — never backticks:

```bash
# WRONG
output=`date`

# CORRECT
output=$(date)
```

## Conditionals

Use `[[ ... ]]` — not `[ ... ]` or `test`:

```bash
if [[ -f "$file" ]]; then
  echo "exists"
fi

# String comparison
if [[ "$var" == "value" ]]; then
  ...
fi
```

## File Organization

- One script per logical task
- Extract reusable functions into `lib/` or `scripts/lib/`
- Keep scripts under 200 lines — extract to functions or sub-scripts if longer

## Formatting

- 2-space indentation (enforced by `shfmt -i 2 -ci`)
- No trailing whitespace
- Blank line between functions

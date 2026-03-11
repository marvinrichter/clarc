---
description: Bash/shell script review for safety, correctness, shellcheck compliance, and idiomatic style. Invokes the bash-reviewer agent.
---

# Bash Script Review

This command invokes the **bash-reviewer** agent for Bash/shell script review.

## What This Command Does

1. **Identify Shell Changes**: Find modified `.sh`, `.bash`, `.zsh` files via `git diff`
2. **Safety Checks**: `set -euo pipefail` presence, quoting, `eval` usage
3. **ShellCheck Compliance**: Static analysis via shellcheck
4. **Security Review**: Path injection, command injection, mktemp usage
5. **Portability Check**: POSIX compliance, cross-platform compatibility
6. **Generate Report**: Categorize issues by severity

## When to Use

- After writing or modifying shell scripts
- Before committing CI/CD scripts or setup scripts
- Reviewing scripts that run in production or CI environments

## Review Categories

### CRITICAL (Must Fix)
- Missing `set -euo pipefail` (silent failures)
- Unquoted variables (word splitting, globbing)
- `eval` with user-controlled input (command injection)
- No `mktemp` for temp files (race conditions, predictable paths)

### HIGH (Should Fix)
- ShellCheck warnings (SC2xxx)
- Missing error messages on failure
- Hardcoded paths instead of variables
- `rm -rf` without confirmation or guard

### MEDIUM (Consider)
- Non-POSIX syntax in scripts claiming `#!/bin/sh`
- Missing BATS tests for complex scripts
- Functions not documented with comments

## Automated Checks

```bash
shellcheck script.sh
shfmt -d script.sh  # formatting diff
```

## Related

- Agent: `agents/bash-reviewer.md`
- Skills: `skills/bash-patterns/`, `skills/bash-testing/`

## After This

- `/tdd` — add tests for scripts that failed review
- `/build-fix` — fix shell errors flagged by shellcheck
- `/security-review` — full DevSecOps scan if security issues found

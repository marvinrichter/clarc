---
paths:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.zsh"
globs:
  - "**/*.{sh,bash,zsh}"
  - "**/Makefile"
alwaysApply: false
---

# Bash Security Guidelines

> This file extends [common/security.md](../common/security.md) with Bash specific content.

## Never Use eval with User Input

`eval` executes arbitrary code — never pass user-controlled data to it:

```bash
# WRONG — command injection risk
eval "ls $user_input"

# CORRECT — use arrays and direct commands
ls -- "$user_input"
```

## Quote All File Paths

Unquoted paths allow word splitting and glob expansion:

```bash
# WRONG
rm -rf $dir

# CORRECT
rm -rf "$dir"
```

## Use mktemp for Temporary Files

Predictable temp file names are exploitable via symlink attacks:

```bash
# WRONG — predictable, exploitable
TMPFILE="/tmp/myapp.$$"

# CORRECT
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
```

## Validate All External Input

```bash
validate_path() {
  local path="$1"
  # Reject paths with .. traversal
  if [[ "$path" == *..* ]]; then
    log_error "Invalid path: $path"
    exit 1
  fi
  # Reject absolute paths if only relative expected
  if [[ "$path" == /* ]]; then
    log_error "Absolute paths not allowed"
    exit 1
  fi
}
```

## Restrict File Permissions

Set restrictive umask at the start of scripts that create files:

```bash
umask 077   # owner-only read/write
```

Fix permissions on sensitive files explicitly:

```bash
chmod 600 "$HOME/.config/myapp/credentials"
```

## Avoid Storing Secrets in Variables Printed by `set -x`

`set -x` traces all variable expansions — secrets will appear in logs:

```bash
# If debug tracing is enabled, never put secrets in traced code
{ set +x; SECRET=$(cat "$SECRETS_FILE"); set -x; } 2>/dev/null
```

## Sanitize Environment Variables

Never trust inherited environment:

```bash
# At the top of privileged scripts
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export PATH
unset IFS   # reset field separator to default
```

## shellcheck

Run `shellcheck` on all scripts — it catches common security issues:

```bash
shellcheck --severity=warning scripts/*.sh
```

Enable in CI as a required check.

---
paths:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.zsh"
---

# Bash Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Bash specific content.

## Script Entry Point Pattern

Always guard the main logic to allow sourcing for tests:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Functions defined here are sourceable

main() {
  local arg="${1:-}"
  if [[ -z "$arg" ]]; then
    echo "Usage: $(basename "$0") <arg>" >&2
    exit 1
  fi
  process "$arg"
}

# Only run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
```

## Logging Pattern

```bash
log_info()  { echo "[INFO]  $*" >&2; }
log_warn()  { echo "[WARN]  $*" >&2; }
log_error() { echo "[ERROR] $*" >&2; }

log_info "Starting process..."
log_error "Something went wrong"
```

## Temporary Files

Always use `mktemp` and clean up:

```bash
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

# Use $TMP safely
echo "data" > "$TMP"
```

## Argument Parsing

Use `getopts` for short flags:

```bash
usage() { echo "Usage: $0 [-v] [-o output] <input>" >&2; }

verbose=0
output=""

while getopts ":vo:" opt; do
  case "$opt" in
    v) verbose=1 ;;
    o) output="$OPTARG" ;;
    :) log_error "Option -$OPTARG requires argument"; exit 1 ;;
    ?) log_error "Unknown option: -$OPTARG"; exit 1 ;;
  esac
done
shift $((OPTIND - 1))
```

## Error Handling

```bash
# Trap for cleanup and debugging
trap 'log_error "Failed at line $LINENO"' ERR

# Check command availability
require_command() {
  local cmd="$1"
  if ! command -v "$cmd" &>/dev/null; then
    log_error "Required command not found: $cmd"
    exit 1
  fi
}
require_command jq
require_command curl
```

## Default Values

```bash
# Default with :- (works even when var is empty)
name="${1:-default}"

# Default only if unset (not empty)
name="${1-default}"

# Assign default to var if unset
: "${CONFIG_DIR:=${HOME}/.config/myapp}"
```

## Parallel Execution

```bash
# Run jobs in parallel, collect pids
pids=()
for item in "${items[@]}"; do
  process "$item" &
  pids+=($!)
done

# Wait for all and check exit codes
for pid in "${pids[@]}"; do
  wait "$pid"
done
```

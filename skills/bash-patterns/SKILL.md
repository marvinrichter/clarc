---
name: bash-patterns
description: "Idiomatic Bash scripting patterns: script structure, argument parsing, error handling, logging, temp files, parallel execution, and portability. Use when writing or reviewing shell scripts."
---

# Bash Patterns Skill

## When to Activate

- Writing a new shell script from scratch
- Reviewing an existing script for correctness or safety
- Debugging unexpected script behavior
- Converting ad-hoc commands into a reusable script
- Deciding whether Bash or another language is appropriate
- Creating CI/CD helper scripts that need robust error handling, argument parsing, and cross-platform portability
- Adding retry logic with exponential backoff to a deployment or health-check script that calls an external API
- Hardening an existing script that has no `set -euo pipefail`, unquoted variables, or missing cleanup traps

---

## Script Anatomy

Every non-trivial script follows this structure:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"

# ── Logging ──────────────────────────────────────────────────────────────────
log_info()  { echo "[INFO]  $*" >&2; }
log_warn()  { echo "[WARN]  $*" >&2; }
log_error() { echo "[ERROR] $*" >&2; }

# ── Cleanup ──────────────────────────────────────────────────────────────────
cleanup() {
  # Called on EXIT — remove temp files, kill background jobs
  :
}
trap cleanup EXIT

# ── Functions ────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $SCRIPT_NAME [options] <input>

Options:
  -h    Show this help
  -v    Verbose mode
  -o    Output file (default: stdout)
EOF
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  local verbose=0
  local output=""

  while getopts ":hvo:" opt; do
    case "$opt" in
      h) usage; exit 0 ;;
      v) verbose=1 ;;
      o) output="$OPTARG" ;;
      :) log_error "Option -$OPTARG requires argument"; exit 1 ;;
      ?) log_error "Unknown option: -$OPTARG"; exit 1 ;;
    esac
  done
  shift $((OPTIND - 1))

  [[ $# -eq 0 ]] && { usage; exit 1; }
  local input="$1"

  # ... implementation
}

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && main "$@"
```

---

## Argument Patterns

### Positional arguments with validation

```bash
main() {
  local src="${1:-}"
  local dst="${2:-}"

  if [[ -z "$src" || -z "$dst" ]]; then
    log_error "Usage: $SCRIPT_NAME <src> <dst>"
    exit 1
  fi

  if [[ ! -f "$src" ]]; then
    log_error "Source not found: $src"
    exit 1
  fi
}
```

### Long options (manual parsing)

```bash
while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose|-v) verbose=1; shift ;;
    --output=*)   output="${1#*=}"; shift ;;
    --output|-o)  output="$2"; shift 2 ;;
    --help|-h)    usage; exit 0 ;;
    --)           shift; break ;;
    -*)           log_error "Unknown option: $1"; exit 1 ;;
    *)            break ;;
  esac
done
```

---

## Error Handling

### Trap on ERR

```bash
trap 'log_error "Failed at line $LINENO (exit $?)"' ERR
```

### Require external commands

```bash
require_command() {
  local cmd="$1"
  if ! command -v "$cmd" &>/dev/null; then
    log_error "Required command not found: $cmd"
    log_error "Install with: $2"
    exit 1
  fi
}

require_command jq  "brew install jq"
require_command yq  "brew install yq"
```

### Retry with backoff

```bash
retry() {
  local attempts=3
  local delay=1
  local cmd=("$@")
  for ((i=1; i<=attempts; i++)); do
    "${cmd[@]}" && return 0
    log_warn "Attempt $i/$attempts failed, retrying in ${delay}s..."
    sleep "$delay"
    delay=$((delay * 2))
  done
  log_error "Command failed after $attempts attempts"
  return 1
}

retry curl -fsS "https://example.com/api"
```

---

## File and Directory Operations

### Safe temp files

```bash
TMP_FILE=$(mktemp)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_FILE" "$TMP_DIR"' EXIT
```

### Portable directory creation

```bash
mkdir -p "$dir"   # -p: no error if exists, creates parents
```

### Read file line by line

```bash
while IFS= read -r line; do
  echo "Processing: $line"
done < "$input_file"
```

### Process substitution (avoid temp files)

```bash
# Compare two command outputs without temp files
diff <(sort file1.txt) <(sort file2.txt)
```

---

## Parallel Execution

```bash
run_parallel() {
  local -a pids=()
  for item in "$@"; do
    process_item "$item" &
    pids+=($!)
  done

  local failed=0
  for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
      log_error "Job $pid failed"
      failed=1
    fi
  done
  return $failed
}
```

---

## String Operations

```bash
# Substring extraction
str="hello_world"
echo "${str:0:5}"       # hello
echo "${str#*_}"        # world (remove prefix up to _)
echo "${str%_*}"        # hello (remove suffix from _)

# String replacement
echo "${str/world/bash}"   # hello_bash (first match)
echo "${str//l/L}"         # heLLo_worLd (all matches)

# Case conversion (Bash 4+)
echo "${str^^}"   # HELLO_WORLD
echo "${str,,}"   # hello_world
```

---

## Arrays

```bash
# Declaration
declare -a items=("one" "two" "three")

# Append
items+=("four")

# Iterate
for item in "${items[@]}"; do
  echo "$item"
done

# Length
echo "${#items[@]}"

# Slice
echo "${items[@]:1:2}"   # two three
```

---

## When NOT to Use Bash

Switch to Python, Node.js, or Go when the script:

- Parses complex JSON/YAML beyond `jq` capabilities
- Needs HTTP clients beyond `curl` one-liners
- Manages complex data structures (maps of maps, nested arrays)
- Exceeds ~200 lines of logic
- Needs to be tested comprehensively with mocks
- Will be maintained by developers unfamiliar with shell

---

## Checklist

- [ ] `#!/usr/bin/env bash` shebang
- [ ] `set -euo pipefail` on line 2
- [ ] All variables quoted: `"$var"`, `"${arr[@]}"`
- [ ] `[[ ]]` used for conditionals (not `[ ]`)
- [ ] `$(...)` used for command substitution (not backticks)
- [ ] `local` used for all function-scoped variables
- [ ] Temp files via `mktemp` with `trap cleanup EXIT`
- [ ] External commands checked with `command -v`
- [ ] `BASH_SOURCE[0]` guard for sourceable scripts
- [ ] `shellcheck` passes with no warnings

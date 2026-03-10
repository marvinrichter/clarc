---
name: bash-testing
description: "Bash script testing with BATS (Bash Automated Testing System): test structure, assertions, setup/teardown, mocking external commands, CI integration, and coverage strategies."
---

# Bash Testing Skill

## When to Activate

- Writing tests for a new shell script
- Adding tests to an untested script
- Setting up BATS in a project
- Debugging why a BATS test is failing
- Mocking external commands in tests
- Adding BATS to a CI pipeline so shell scripts are tested alongside application code on every pull request
- Isolating a flaky integration test that depends on a real external command like `git`, `curl`, or `docker`
- Verifying every exit code path in a complex script that branches on multiple error conditions
- Writing unit tests for individual Bash functions by sourcing the script under test rather than executing it whole

---

## BATS Setup

### Installation

```bash
# npm (recommended for project-local install)
npm install --save-dev bats bats-support bats-assert

# Homebrew (macOS)
brew install bats-core

# Verify
bats --version
```

### Project structure

```
tests/
  unit/                  # function-level tests (source the script)
  integration/           # full script execution tests
  fixtures/              # static test data files
  test_helper/
    bats-support/        # helper library
    bats-assert/         # assertion library
bats.config              # optional BATS configuration
```

### package.json integration

```json
{
  "scripts": {
    "test:shell": "bats tests/ --recursive",
    "test:shell:tap": "bats tests/ --recursive --tap"
  }
}
```

---

## Test File Structure

```bash
#!/usr/bin/env bats

# Load helpers (adjust path to your project structure)
load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'

# ── Setup / Teardown ──────────────────────────────────────────────────────────

setup() {
  # Runs before EACH @test
  TEST_TMP=$(mktemp -d)
  # Point scripts to test fixtures
  export CONFIG_DIR="$TEST_TMP"
}

teardown() {
  # Runs after EACH @test — always runs even if test fails
  rm -rf "$TEST_TMP"
}

setup_file() {
  # Runs once before all tests in file
  export TEST_SERVER_PID=$(start_test_server &)
}

teardown_file() {
  # Runs once after all tests in file
  kill "$TEST_SERVER_PID" 2>/dev/null || true
}

# ── Tests ─────────────────────────────────────────────────────────────────────

@test "exits 0 on valid input" {
  run ./scripts/process.sh valid-input
  assert_success
}

@test "exits 1 with missing argument" {
  run ./scripts/process.sh
  assert_failure
  assert_output --partial "Usage:"
}

@test "outputs expected content" {
  run ./scripts/generate.sh
  assert_output "expected output"
}

@test "creates output file" {
  run ./scripts/generate.sh "$TEST_TMP/result.txt"
  assert_success
  assert [ -f "$TEST_TMP/result.txt" ]
}
```

---

## Assertions (bats-assert)

```bash
assert_success              # exit code 0
assert_failure              # exit code != 0
assert_output "exact"       # stdout equals exactly
assert_output --partial "part"  # stdout contains substring
assert_output --regexp "^prefix"  # stdout matches regex
refute_output               # stdout is empty
assert_line "line content"  # any line equals
assert_line --index 0 "first"  # specific line equals
assert_line --partial "part"   # any line contains
```

---

## Mocking External Commands

### PATH-based mocking (recommended)

Create a `test_helper/mock_bin/` directory with fake commands:

```bash
# tests/test_helper/mock_bin/curl
#!/usr/bin/env bash
echo '{"status":"ok"}'
exit 0
```

In your test:

```bash
setup() {
  # Prepend mock bin to PATH
  export PATH="$BATS_TEST_DIRNAME/test_helper/mock_bin:$PATH"
}
```

### Inline function override

```bash
@test "calls curl with correct URL" {
  # Override curl for this test only
  curl() {
    echo "MOCK_CURL_CALLED: $*" >> "$TEST_TMP/calls.log"
    echo '{"result":"mocked"}'
  }
  export -f curl

  source ./scripts/fetch-data.sh
  fetch_data "https://api.example.com/data"

  assert [ -f "$TEST_TMP/calls.log" ]
  run cat "$TEST_TMP/calls.log"
  assert_output --partial "https://api.example.com/data"
}
```

### Mock with call recording

```bash
# tests/test_helper/mock_bin/git
#!/usr/bin/env bash
echo "$0 $*" >> "${MOCK_CALLS_LOG:-/tmp/mock_calls.log}"
case "$1" in
  status)  echo "nothing to commit" ;;
  push)    echo "Everything up-to-date" ;;
  *)       echo "mock git: $*" ;;
esac
```

---

## Unit Testing Functions (source mode)

Source the script to test individual functions without running `main`:

```bash
#!/usr/bin/env bats

load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'

# Source the script — the BASH_SOURCE guard prevents main() from running
setup() {
  source "$BATS_TEST_DIRNAME/../scripts/utils.sh"
}

@test "validate_path accepts relative paths" {
  run validate_path "subdir/file.txt"
  assert_success
}

@test "validate_path rejects .. traversal" {
  run validate_path "../../../etc/passwd"
  assert_failure
  assert_output --partial "Invalid path"
}

@test "log_info writes to stderr" {
  run log_info "test message"
  assert_output --partial "[INFO]"
  assert_output --partial "test message"
}
```

---

## Testing Exit Codes

```bash
@test "returns 0 on success" {
  run ./scripts/process.sh good-input
  assert_equal "$status" 0
}

@test "returns 2 on invalid argument" {
  run ./scripts/process.sh --invalid-flag
  assert_equal "$status" 2
}
```

---

## CI Integration

### GitHub Actions

```yaml
name: Shell Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install BATS
        run: npm ci
      - name: Run shell tests
        run: npm run test:shell
      - name: Lint scripts
        run: |
          sudo apt-get install -y shellcheck
          shellcheck scripts/*.sh
```

---

## Checklist

- [ ] BATS and helpers installed (`bats-support`, `bats-assert`)
- [ ] Every function has at least one unit test (source mode)
- [ ] Every exit code path tested
- [ ] External commands mocked via PATH or function override
- [ ] `setup()` creates isolated temp dir, `teardown()` removes it
- [ ] Tests pass with `set -euo pipefail` active
- [ ] CI runs both BATS and shellcheck

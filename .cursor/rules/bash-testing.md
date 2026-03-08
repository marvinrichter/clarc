---
paths:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.zsh"
---

# Bash Testing Requirements

> This file extends [common/testing.md](../common/testing.md) with Bash specific content.

## Test Framework: BATS

Use [BATS (Bash Automated Testing System)](https://github.com/bats-core/bats-core) for all shell script tests.

### Installation

```bash
# Via npm
npm install --save-dev bats

# Via homebrew
brew install bats-core
```

### Test file structure

```bash
#!/usr/bin/env bats

setup() {
  # Runs before each test
  TEST_TMP=$(mktemp -d)
}

teardown() {
  # Runs after each test
  rm -rf "$TEST_TMP"
}

@test "script exits 0 on success" {
  run ./scripts/my-script.sh valid-arg
  assert_success
}

@test "script fails with missing argument" {
  run ./scripts/my-script.sh
  assert_failure
  assert_output --partial "Usage:"
}

@test "creates output file" {
  run ./scripts/generate.sh "$TEST_TMP/output.txt"
  assert_success
  [[ -f "$TEST_TMP/output.txt" ]]
}
```

### BATS helpers

Install `bats-support` and `bats-assert` for better assertions:

```bash
load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'
```

### Running tests

```bash
bats tests/          # all tests in directory
bats tests/my.bats   # single file
bats --tap tests/    # TAP output for CI
```

## Test Organization

```
tests/
  unit/          # individual function tests (source the script, call functions)
  integration/   # full script invocation tests
  fixtures/      # test data files
```

## Coverage Requirements

- Every public function must have at least one test
- Every exit code path must be tested
- Test both success and failure cases

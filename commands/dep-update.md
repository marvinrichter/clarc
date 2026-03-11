---
description: Dependency audit and upgrade workflow — check for outdated packages, security vulnerabilities, and safely upgrade dependencies with verification. Supports npm, pnpm, yarn, bun, pip, poetry, go mod, and cargo.
---

# dep-update

<!-- SCOPE: interactive upgrade workflow — always run /dep-audit first to identify what needs upgrading.
     ESCALATION LADDER:
       dev-time check → /dep-audit (run first)
       interactive upgrade → /dep-update (this command)
       release gate + attestation → /sbom
       full DevSecOps pipeline scan → /security-review
     See also: /dep-audit for audit-only, /sbom for SBOM generation.
-->

Audit and upgrade project dependencies safely. Check outdated → check security → upgrade with verification.

## Instructions

### 1. Detect Package Manager and Language

Check in order:
- `pnpm-lock.yaml` → **pnpm**
- `bun.lockb` → **bun**
- `yarn.lock` → **yarn**
- `package-lock.json` → **npm**
- `poetry.lock` → **poetry**
- `requirements.txt` → **pip**
- `go.mod` → **go mod**
- `Cargo.toml` → **cargo**
- Multiple present → ask which scope to audit

### 2. Parse Arguments

`$ARGUMENTS`:
- (empty) → full audit: outdated + security check
- `outdated` → list outdated packages only
- `security` → security audit only (no upgrades)
- `upgrade` → interactive upgrade (patch + minor only, skip major)
- `upgrade --major` → include major version upgrades
- `upgrade <package>` → upgrade one specific package
- `check` → quick security check only (CI-friendly, non-interactive)

### 3. Check Outdated Packages

**npm / pnpm / yarn / bun:**
```bash
# pnpm
pnpm outdated

# npm
npm outdated

# yarn
yarn outdated  # yarn v1: yarn outdated
               # yarn v3+: yarn upgrade-interactive
```

Output: table of current vs wanted (next semver-compatible) vs latest (absolute latest).

**pip / poetry:**
```bash
# poetry
poetry show --outdated

# pip
pip list --outdated
```

**go mod:**
```bash
go list -u -m all 2>/dev/null | grep '\[v'
```

**cargo:**
```bash
cargo outdated  # requires: cargo install cargo-outdated
```

### 4. Security Audit

**npm / pnpm / yarn:**
```bash
# pnpm / npm
pnpm audit --json   # or npm audit --json

# Parse output: show CRITICAL and HIGH vulnerabilities only
# Format:
# [CRITICAL] lodash < 4.17.21 — Prototype Pollution
#   Path: my-app → express → lodash
#   Fix: pnpm add lodash@^4.17.21
```

**Python:**
```bash
pip install safety
safety check --json

# or with pip-audit
pip install pip-audit
pip-audit
```

**Go:**
```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

**Rust:**
```bash
cargo install cargo-audit
cargo audit
```

### 5. Present Findings

Show a consolidated report before making any changes:

```
Dependency Audit — my-project
══════════════════════════════

Outdated Packages (showing semver-compatible upgrades):
  patch:  12 packages (safe — apply automatically)
  minor:  4 packages (review recommended)
  major:  2 packages (breaking changes — review required)

Security Vulnerabilities:
  [CRITICAL] 0
  [HIGH]      1  — follow-up required
  [MODERATE]  3  — note

HIGH: lodash 4.17.4 → 4.17.21
  Prototype Pollution (CVE-2021-23337)
  Fix: pnpm add lodash@^4.17.21

Plan:
  1. Apply patch upgrades (12 packages)
  2. Fix HIGH security issue (lodash)
  3. Review 4 minor upgrades individually
  4. Review 2 major upgrades separately (manual)

Proceed? (yes/no/security-only)
```

For `check` (CI mode): output machine-readable JSON, exit 1 if CRITICAL or HIGH vulnerabilities found.

### 6. Apply Upgrades

**Patch only (safe, apply automatically):**
```bash
# pnpm
pnpm update              # updates within semver range in package.json

# npm
npm update

# poetry
poetry update

# go mod
go get -u=patch ./...
go mod tidy
```

**Security fix (specific package):**
```bash
# pnpm
pnpm add lodash@latest

# npm
npm install lodash@latest

# go
go get golang.org/x/net@latest
go mod tidy
```

**Minor upgrades (one by one, interactive):**
For each minor upgrade: show the changelog URL, ask to proceed, apply, run tests.

```bash
# Use interactive mode
pnpm update --interactive
# or
npx npm-check-updates --interactive
```

**Major upgrades — always manual:**
- Show migration guide URL
- Do NOT auto-apply
- Instruct: "Review migration guide, then: pnpm add <package>@latest"

### 7. Verify After Each Upgrade

After applying any upgrade:

```bash
# Run type check
npx tsc --noEmit  # TypeScript

# Run tests
pnpm test  # or npm test / pytest / go test ./... / cargo test

# If tests pass: continue
# If tests fail: identify which upgrade broke it, revert that package
pnpm add <package>@<previous-version>
```

**Rollback a specific package:**
```bash
# Check git for previous version
git show HEAD:package.json | grep '"lodash"'
pnpm add lodash@4.17.4
```

### 8. Report

```
Dependency Update Complete
═══════════════════════════

Applied:
  ✓ 12 patch upgrades
  ✓ 1 security fix (lodash 4.17.4 → 4.17.21)
  ✓ 2 minor upgrades (after review)

Skipped (manual review needed):
  ⚠ react: 18 → 19 (major) — https://react.dev/blog/2024/04/25/react-19
  ⚠ typescript: 5 → 6 (major) — review migration guide

Verification:
  ✓ Type check: passed
  ✓ Tests: 247 passed, 0 failed

Remaining security issues: 0 CRITICAL, 0 HIGH

Commit: git add package.json pnpm-lock.yaml && git commit -m "chore: update dependencies"
```

## Arguments

`$ARGUMENTS` examples:
- (empty) → full interactive audit
- `security` → security check only, no upgrades
- `check` → CI security check (exits 1 on CRITICAL/HIGH)
- `upgrade` → apply patch + minor upgrades interactively
- `upgrade react` → upgrade only `react` and verify
- `outdated` → list what's outdated without changing anything

> Not covered here: license compliance, supply chain risk, and SBOM generation — use `/dep-audit` for those.

## After This

- \`/dep-audit\` — audit-only check after upgrading to confirm no new vulnerabilities
- \`/verify\` — run full build + tests after upgrades to confirm nothing broke

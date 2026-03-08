---
name: dependency-audit
description: "Dependency security and compliance: per-language vulnerability scanning (npm audit, cargo audit, pip-audit, govulncheck, OWASP Dependency-Check), license compliance (FOSSA, license-checker), transitive dependency risk, dependency confusion attacks, and Renovate/Dependabot setup."
---

# Dependency Audit Skill

Your dependencies are your attack surface. Log4Shell, colors.js, event-stream — high-severity supply chain incidents keep happening. This skill covers systematic dependency security and license compliance.

## When to Activate

- Running a security audit before a release
- Responding to a reported CVE in a dependency
- Setting up automated dependency updates (Renovate/Dependabot)
- License compliance review before open-sourcing or commercial distribution
- Investigating a suspicious transitive dependency

---

## Vulnerability Scanning by Language

### Node.js / npm

```bash
# Built-in audit
npm audit
npm audit --audit-level=high   # Only show high+ severity
npm audit fix                  # Auto-fix non-breaking updates
npm audit fix --force          # Fix including breaking version bumps (test first!)

# JSON output for automation
npm audit --json | jq '.vulnerabilities | to_entries[] | select(.value.severity == "critical")'

# Snyk (more accurate, checks for fix availability)
npx snyk test
npx snyk monitor   # Continuous monitoring

# Better npm audit (prettier output)
npx better-npm-audit audit
```

### Rust / Cargo

```bash
# cargo-audit — uses RustSec Advisory DB
cargo install cargo-audit
cargo audit

# With output format
cargo audit --json

# Deny specific advisories (audit.toml)
# [advisories]
# ignore = ["RUSTSEC-2021-0001"]  # With justification comment
```

### Python

```bash
# pip-audit (recommended — uses OSV database)
pip install pip-audit
pip-audit
pip-audit -r requirements.txt
pip-audit --format json

# safety (uses Safety DB)
pip install safety
safety check
safety check -r requirements.txt

# Audit with fix suggestions
pip-audit --fix   # Updates requirements.txt
```

### Go

```bash
# govulncheck — official Google tool, uses Go vulnerability DB
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...

# Only reports vulnerabilities that are actually called (not just imported!)
# This is govulncheck's key advantage over other tools.

# With JSON output
govulncheck -json ./...
```

### Java / Maven / Gradle

```bash
# OWASP Dependency-Check (Maven plugin)
mvn org.owasp:dependency-check-maven:check

# Maven wrapper
./mvnw dependency-check:check

# Gradle plugin (build.gradle)
# plugins { id 'org.owasp.dependencycheck' version '9.0.7' }
# ./gradlew dependencyCheckAnalyze

# Snyk for Java
snyk test --all-projects
```

---

## License Compliance

### Why It Matters

| License | Risk Level | Can Use In Proprietary? | Notes |
|---------|-----------|------------------------|-------|
| MIT, ISC, BSD-2/3 | ✅ Low | Yes | Attribution required |
| Apache 2.0 | ✅ Low | Yes | Attribution + NOTICE file |
| LGPL | ⚠️ Medium | Yes (with conditions) | Dynamic linking required |
| GPL v2/v3 | ❌ High | No | Must open-source your code |
| AGPL | ❌ High | No | Even SaaS must open-source |
| SSPL | ❌ High | No | MongoDB's controversial license |
| CC BY-ND | ❌ High | No for modifications | No derivatives |

### npm — license-checker

```bash
npx license-checker --summary       # Overview by license type
npx license-checker --json          # Full JSON output
npx license-checker --csv           # CSV for spreadsheet import
npx license-checker --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause"
npx license-checker --failOn "GPL;AGPL"   # Fail build on incompatible licenses
```

### Python — pip-licenses

```bash
pip install pip-licenses
pip-licenses
pip-licenses --format=json
pip-licenses --allow-only="MIT;Apache Software License;BSD License"
pip-licenses --fail-on="GNU General Public License"
```

### Go

```bash
go install github.com/google/go-licenses@latest
go-licenses check ./... --allowed_licenses=MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC
go-licenses report ./...
go-licenses save ./... --save_path=third_party/
```

### FOSSA (Commercial — recommended for enterprises)

- Automatically scans all dependency types
- Tracks licenses across dependency updates
- Generates attribution documents
- Integrates with GitHub PRs

---

## Automated Updates — Renovate vs Dependabot

### Renovate (recommended — more configurable)

```json
// renovate.json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch", "minor"],
      "matchCurrentVersion": "!/^0/",
      "automerge": true
    },
    {
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["major"],
      "labels": ["dependencies", "major-update"],
      "reviewers": ["team:backend"]
    }
  ],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "assignees": ["security-team"]
  },
  "schedule": ["every weekend"]
}
```

### Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      dev-dependencies:
        patterns: ["@types/*", "eslint*", "jest*"]
    ignore:
      - dependency-name: "lodash"
        versions: ["4.x"]  # Waiting for ESM migration

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## Transitive Dependency Analysis

The most dangerous vulnerabilities are often in dependencies of dependencies.

```bash
# npm — show full dependency tree
npm ls --all
npm ls lodash   # Find who imports lodash

# Why is this package installed?
npm why lodash

# Find packages you don't directly depend on
npx depcheck    # Finds unused dependencies too

# Cargo
cargo tree
cargo tree -i openssl   # Who depends on openssl?

# Go
go mod graph | grep vulnerable-pkg

# Python
pipdeptree
pipdeptree --reverse --packages urllib3  # Who needs urllib3?
```

---

## Dependency Confusion Attacks

**Attack:** Attacker publishes a public package with the same name as your private package. Package managers prefer the higher version, which may be the malicious public one.

### Detection

```bash
# Check if your private package names exist on public registries
npm view @mycompany/internal-auth   # If this succeeds, there's a namespace conflict risk
```

### Mitigations

1. **Use scoped packages** (`@mycompany/...`) — and register the scope on npm
2. **Always-auth for scoped packages in .npmrc:**
   ```
   @mycompany:registry=https://registry.mycompany.com
   //registry.mycompany.com/:always-auth=true
   ```
3. **Private npm registry with allowlist** (Artifactory, Verdaccio, GitHub Packages)
4. **Yarn PnP or npm `--ignore-scripts`** — prevent install script execution

---

## CI Integration

```yaml
# .github/workflows/dependency-audit.yml
name: Dependency Audit
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 8 * * 1'  # Weekly Monday morning

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11

      - name: npm audit
        run: npm audit --audit-level=high

      - name: License check
        run: |
          npx license-checker \
            --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause" \
            --excludePrivatePackages

      - name: SBOM scan
        uses: anchore/scan-action@v3
        with:
          path: "."
          fail-build: true
          severity-cutoff: high
```

---

## Reference Commands

- `/dep-audit` — run full dependency audit workflow
- `/sbom` — generate SBOM and attach to release
- `supply-chain-security` skill — SLSA, cosign, reproducible builds

---
description: Full dependency audit — vulnerability scanning, license compliance, supply chain risk, and prioritized remediation report
---

# Dependency Audit Command

Run a full dependency audit: $ARGUMENTS

## Your Task

Perform a comprehensive three-phase dependency audit covering vulnerabilities, license compliance, and supply chain risks. Produce a prioritized remediation report.

## Phase 1 — Vulnerability Scan

Detect the package manager and run the appropriate scanner:

### Detect project type
```bash
# Check what exists in the project root
ls package.json requirements*.txt Cargo.toml go.mod pom.xml build.gradle 2>/dev/null
```

### npm / Node.js
```bash
# Audit (built-in)
npm audit --json > audit-result.json
npm audit  # Human-readable summary

# Parse critical and high
npm audit --json | jq '
  .vulnerabilities |
  to_entries[] |
  select(.value.severity == "critical" or .value.severity == "high") |
  {name: .key, severity: .value.severity, fixAvailable: .value.fixAvailable}
'

# Fix automatically (non-breaking)
npm audit fix

# Check if fix is available
npm audit --json | jq '[.vulnerabilities | to_entries[] | {
  name: .key,
  severity: .value.severity,
  fixAvailable: .value.fixAvailable,
  via: [.value.via[] | if type == "object" then .source else . end]
}]'
```

### Python
```bash
pip install pip-audit
pip-audit -r requirements.txt
pip-audit -r requirements.txt --format json > audit-result.json

# Or with safety
pip install safety
safety check -r requirements.txt
```

### Rust
```bash
cargo audit
cargo audit --json > audit-result.json
```

### Go
```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
govulncheck -json ./...
```

### Java (Maven)
```bash
mvn org.owasp:dependency-check-maven:check -Dformat=JSON
# Report at: target/dependency-check-report.json
```

**Severity sorting:**
1. CRITICAL — provide fix immediately (within 24h for production services)
2. HIGH — fix this sprint
3. MEDIUM — fix next sprint
4. LOW — schedule when convenient
5. NEGLIGIBLE — informational only

## Phase 2 — License Compliance

### npm
```bash
npx license-checker --summary

# Detailed with fix guidance
npx license-checker --json > licenses.json

# Fail on incompatible licenses
npx license-checker \
  --onlyAllow "MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause;Python-2.0;CC0-1.0;Unlicense;0BSD;CC-BY-3.0;CC-BY-4.0" \
  --excludePrivatePackages
```

### Python
```bash
pip install pip-licenses
pip-licenses --format=json > licenses.json
pip-licenses --fail-on="GNU General Public License;GNU Affero General Public License"
```

### Go
```bash
go-licenses check ./... \
  --allowed_licenses=MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,MPL-2.0
go-licenses report ./...
```

**License risk assessment:**

| Finding | Risk | Action |
|---------|------|--------|
| GPL/AGPL in commercial project | CRITICAL | Replace package immediately |
| LGPL in commercial project | HIGH | Verify dynamic linking only |
| Unknown license | HIGH | Manual review required |
| CC-BY-ND in any project | HIGH | No modification allowed |
| All permissive (MIT/Apache/BSD) | ✅ OK | Document for attribution |

## Phase 3 — Supply Chain Risk

Check for unpinned dependencies and other supply chain risks:

### Pinning Check
```bash
# npm: is lock file committed?
git ls-files package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null

# npm: check for floating versions
node -e "
const pkg = JSON.parse(require('fs').readFileSync('package.json'));
const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
Object.entries(deps).forEach(([k,v]) => {
  if (v.startsWith('*') || v.startsWith('^') || v.startsWith('~') || v === 'latest') {
    console.log('UNPINNED:', k, v);
  }
});
"

# Python: check for unpinned
grep -n "^[a-zA-Z]" requirements.txt | grep -v "==" | grep -v "^#" || echo "All pinned"

# Docker: check for mutable tags
grep -n "^FROM" Dockerfile | grep -v "@sha256:" || echo "All pinned by hash"

# GitHub Actions: check for non-SHA pins
grep -rn "uses:" .github/workflows/ | grep -v "@[a-f0-9]\{40\}" | grep -v "^#"
```

### Transitive Dependency Tree
```bash
# npm: show full tree
npm ls --all 2>/dev/null | head -50

# Find who needs a specific package
npm why [package-name]

# Find deep transitive deps (packages you don't directly depend on)
npx depcheck 2>/dev/null

# Python
pipdeptree 2>/dev/null || pip install pipdeptree && pipdeptree
```

## Output — Prioritized Audit Report

```markdown
# Dependency Audit Report

**Date:** [YYYY-MM-DD]
**Project:** [name]
**Package Manager:** [npm/pip/cargo/go]
**Total Dependencies:** [N direct, M transitive]

---

## Phase 1: Vulnerabilities

### CRITICAL (fix within 24h)
| Package | CVE | Severity | Fixed In | Description |
|---------|-----|----------|----------|-------------|
| [name] | CVE-XXXX | CRITICAL | [version] | [brief] |

### HIGH (fix this sprint)
| Package | CVE | Severity | Fixed In |
|---------|-----|----------|----------|

### Summary
- Critical: [N]
- High: [N]
- Medium: [N]
- Low: [N]
- Fix commands:
  ```bash
  [exact commands to fix]
  ```

---

## Phase 2: License Compliance

### Issues Found

| Package | License | Risk | Action |
|---------|---------|------|--------|
| [name] | GPL-3.0 | CRITICAL | Replace with [alternative] |

### License Distribution

| License | Count |
|---------|-------|
| MIT | [N] |
| Apache-2.0 | [N] |
| [other] | [N] |

---

## Phase 3: Supply Chain Risk

### Pinning Issues

| Location | Issue | Fix |
|----------|-------|-----|
| `package.json` | `^4.18.2` range | Pin to exact version |
| `Dockerfile:1` | `FROM node:18` | Use `node@sha256:...` |
| `.github/workflows/ci.yml:12` | `actions/checkout@v4` | Pin to SHA |

### Other Risks
- [ ] Lock file: [present/missing]
- [ ] CI uses `npm ci`: [yes/no]
- [ ] SBOM present: [yes/no]
- [ ] Artifact signing: [yes/no]

---

## Action Plan

### Immediate (today)
1. `npm audit fix` — [N] auto-fixable vulnerabilities
2. Manually update [package] to [version] for CVE-XXXX

### This Sprint
1. Replace [package with GPL license]
2. Pin GitHub Actions to SHAs
3. Set up Renovate/Dependabot

### Next Sprint
1. Generate and attach SBOM to releases
2. Enable hash pinning for all pip requirements
3. Pin Dockerfile base images to digest
```

## Reference Skills

- `dependency-audit` — detailed per-language scanning commands
- `supply-chain-security` — SBOM, SLSA, cosign
- `/sbom` — generate and attach SBOM

> Not covered here: outdated package upgrades and interactive version bumps — use `/dep-update` for those.

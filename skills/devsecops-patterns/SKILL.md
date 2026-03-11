---
name: devsecops-patterns
description: "DevSecOps patterns — shift-left security, SAST (semgrep/CodeQL), secrets detection (gitleaks/trufflehog), dependency scanning (trivy/grype), DAST, OPA/Falco policy-as-code, container security, and security gates per CI stage."
---
# Skill: DevSecOps & Security Automation

DevSecOps integrates security into every phase of the SDLC — shifting left from post-release penetration tests to pre-commit hooks and PR gates. Security is continuous, automated, developer-friendly, and not a final checkpoint.

## When to Activate

- Setting up SAST (Semgrep, CodeQL) in CI pipelines
- Configuring secrets detection (Gitleaks) as pre-commit hooks
- Implementing dependency vulnerability scanning (Trivy, Snyk)
- Adding container security scanning to image build pipelines
- Setting up OWASP ZAP for DAST in test environments
- Implementing Policy-as-Code with OPA/Gatekeeper or Kyverno
- Establishing a Security Champions program
- Designing a Security Gate strategy (pre-commit → PR → pre-release)

---

## Shift-Left Security

### Security Feedback Loop Speeds

```
Pre-commit hook    → < 5 seconds   (Gitleaks, fast Semgrep rules)
PR Gate            → < 5 minutes   (Trivy, full Semgrep, ZAP Baseline)
Pre-Release Gate   → < 30 minutes  (Full DAST, license scan, SBOM)
```

### Security Champions Program

One engineer per product team acts as the Security Champion:
- Attends monthly security guild meeting
- Reviews security findings in their team's applications
- Escalates critical findings to the security team
- Trains teammates on secure coding patterns

---

## SAST — Static Analysis Security Testing

### Semgrep (Primary SAST Tool)

```bash
# Run with auto-selected rules (best for most projects)
semgrep --config=auto .

# Run only on changed files (fast for pre-commit)
git diff --name-only HEAD | xargs semgrep --config=auto
```

### Semgrep Custom Rule

```yaml
# .semgrep/rules/no-hardcoded-secrets.yaml
rules:
  - id: no-hardcoded-api-key
    patterns:
      - pattern: |
          $KEY = "..."
      - metavariable-regex:
          metavariable: $KEY
          regex: '(?i)(api_key|apikey|secret|password|token|auth)'
      - metavariable-regex:
          metavariable: $VALUE
          regex: '[A-Za-z0-9+/]{20,}'
    message: "Potential hardcoded secret in variable $KEY"
    severity: ERROR
    languages: [python, javascript, typescript, go, java]
    metadata:
      category: security
      cwe: "CWE-798"
      owasp: "A02:2021"
```

### GitHub Actions — SAST Gate

```yaml
# .github/workflows/sast.yml
jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
      - run: |
          semgrep ci --config=auto --severity ERROR --error \
            --sarif-output=semgrep-results.sarif
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep-results.sarif

  codeql:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript, python
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

### Language-Specific SAST Tools

| Language | Tool | Command |
|----------|------|---------|
| Python | Bandit | `bandit -r src/ -ll` |
| Go | gosec | `gosec ./...` |
| Ruby | Brakeman | `brakeman -q -w2 .` |
| JavaScript | ESLint security | `eslint --plugin security src/` |
| Java | SpotBugs + FindSecBugs | `mvn spotbugs:check` |

---

## Secrets Detection

### Gitleaks — Pre-Commit + CI

```bash
# Scan only staged files (fast pre-commit check)
gitleaks protect --staged

# Scan git history (finds secrets committed in the past)
gitleaks detect --source=. --log-opts="--all" --verbose
```

### Pre-Commit Hook Configuration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
        entry: gitleaks protect --staged -v
        pass_filenames: false
```

### Gitleaks Configuration

```toml
# .gitleaks.toml
[extend]
useDefault = true

[[rules]]
description = "Internal API Key"
id = "internal-api-key"
regex = '''MYAPP_[A-Z0-9]{32}'''

[allowlist]
regexes = ["test-api-key-12345"]
paths = [".git", "tests/fixtures/", "*.test.ts"]
```

### TruffleHog — Deep History Scan

```bash
# Scan entire git history
trufflehog git file://. --since-commit HEAD~100 --only-verified

# Scan a GitHub org's repos
trufflehog github --org=myorg --token=$GITHUB_TOKEN
```

### Secret Rotation Runbook

When a secret is discovered in Git:

1. **Immediately revoke** at the provider (AWS IAM, GitHub PAT, Stripe)
2. **Generate a new secret** and store in the secret manager
3. **Remove from Git history** with BFG Repo Cleaner, then `git push --force-with-lease`
4. **Notify** affected parties (if the secret had production access)
5. **Audit** the secret's usage in access logs for the past 30 days

---

## Dependency Vulnerability Scanning

### Trivy — All-in-One Scanner

```bash
# Scan filesystem (dependencies + IaC misconfigurations)
trivy fs . --severity HIGH,CRITICAL

# Scan container image, fail on CRITICAL (for CI gate)
trivy image myorg/my-app:latest --severity CRITICAL --exit-code 1

# Generate SBOM
trivy fs . --format spdx-json --output sbom.json
```

### GitHub Actions — Trivy Container Scan

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    image-ref: myorg/my-app:${{ github.sha }}
    format: sarif
    output: trivy-results.sarif
    severity: HIGH,CRITICAL
    exit-code: '1'
- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: trivy-results.sarif
```

### Language-Native Scanners

```bash
npm audit --audit-level=high    # Node.js
pip-audit -r requirements.txt   # Python
govulncheck ./...                # Go
cargo audit                      # Rust
bundle exec bundle-audit check   # Ruby
```

---

## DAST — Dynamic Analysis Security Testing

### OWASP ZAP Baseline Scan (PR Gate — Safe)

The Baseline Scan only performs **passive** scanning — it does not modify data. Safe to run against any environment.

```bash
docker run --rm \
  -v $(pwd):/zap/wrk \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t http://my-app:8080 \
  -r zap-report.html \
  -J zap-report.json \
  -I   # Don't fail on warnings, only errors
```

### ZAP Baseline in GitHub Actions

```yaml
- name: Start app
  run: docker compose up -d

- name: Wait for app to be ready
  run: timeout 60 bash -c 'until curl -sf http://localhost:8080/health; do sleep 2; done'

- name: OWASP ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: 'http://localhost:8080'
    rules_file_name: '.zap/rules.tsv'
    cmd_options: '-I'
    fail_action: false

- uses: actions/upload-artifact@v4
  with:
    name: zap-report
    path: report_html.html
```

### ZAP Full Scan (Pre-Release — Test Environments Only)

```bash
# Active scan — CAN modify data, only run in dedicated test environment
docker run --rm \
  -v $(pwd):/zap/wrk \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py \
  -t http://test-app:8080 \
  -r full-scan-report.html \
  -z "-config scanner.attackStrength=HIGH"
```

---

## Policy-as-Code

### OPA + Gatekeeper (Kubernetes Admission Controller)

```yaml
# ConstraintTemplate — define the policy
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requirelabels
spec:
  crd:
    spec:
      names:
        kind: RequireLabels
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requirelabels
        violation[{"msg": msg}] {
          required := {label | label := input.parameters.labels[_]}
          provided := {label | input.review.object.metadata.labels[label]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
---
# Constraint — apply the policy
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireLabels
metadata:
  name: require-pod-labels
spec:
  match:
    kinds: [{apiGroups: [""], kinds: ["Pod"]}]
    namespaces: ["production", "staging"]
  parameters:
    labels: ["app", "team", "version"]
```

### Conftest — Test Policies Locally

```bash
# Write a Rego policy
cat > policy/no-root.rego << 'EOF'
package main
deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.securityContext.runAsNonRoot
  msg := sprintf("Container '%s' must set runAsNonRoot: true", [container.name])
}
EOF

conftest test k8s/ --policy policy/
```

### Falco — Runtime Threat Detection

```yaml
# /etc/falco/rules.d/custom-rules.yaml
- rule: Suspicious shell in container
  desc: Detect shell spawned in a container
  condition: >
    spawned_process and container
    and proc.name in (shell_binaries)
    and not proc.pname in (known_shell_spawn_binaries)
  output: >
    Shell spawned in container (user=%user.name container=%container.name
    image=%container.image.repository proc=%proc.name parent=%proc.pname)
  priority: WARNING
  tags: [container, shell, T1059]

- rule: Write to sensitive directory
  desc: Detect writes to /etc or /usr in containers
  condition: >
    open_write and container
    and (fd.directory startswith /etc or fd.directory startswith /usr/bin)
  output: >
    Sensitive file write (user=%user.name file=%fd.name
    container=%container.name image=%container.image.repository)
  priority: ERROR
  tags: [container, filesystem, T1222]
```

---

## Container Security

### Secure Dockerfile Patterns

```dockerfile
# Multi-stage build — don't ship build tools
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production

# Use distroless for minimal attack surface
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# No shell, no package manager
USER nonroot:nonroot
# Read-only root filesystem set via securityContext in Kubernetes
```

### Image Signing with Sigstore/cosign

```bash
# Sign image after push (in CI)
cosign sign --key cosign.key myorg/my-app:${{ github.sha }}

# Verify image signature before deployment
cosign verify --key cosign.pub myorg/my-app:latest
```

```yaml
# Kyverno policy — enforce image signatures
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: enforce
  rules:
    - name: verify-signature
      match:
        resources:
          kinds: [Pod]
      verifyImages:
        - imageReferences: ["myorg/*"]
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      <your-cosign-public-key>
                      -----END PUBLIC KEY-----
```

---

## Security Gates by Stage

```
┌─────────────────────────────────────────────────────────────────────┐
│  IDE / Local                                                         │
│  • Semgrep IDE plugin (VSCode, IntelliJ)                            │
│  • gitleaks protect --staged  (pre-commit hook)                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ git push
┌──────────────────────────────▼──────────────────────────────────────┐
│  PR Gate (< 5 min, blocks merge on CRITICAL)                         │
│  • Semgrep --config=auto                                             │
│  • Gitleaks detect                                                   │
│  • Trivy fs . --severity CRITICAL                                    │
│  • ZAP Baseline Scan (passive, non-destructive)                      │
│  • Conftest / OPA against changed manifests                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ merge to main
┌──────────────────────────────▼──────────────────────────────────────┐
│  Image Build Gate (< 10 min, blocks push on CRITICAL)                │
│  • Trivy image scan                                                  │
│  • cosign sign                                                       │
│  • SBOM generation (trivy --format spdx-json)                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ pre-release
┌──────────────────────────────▼──────────────────────────────────────┐
│  Pre-Release Gate (< 30 min, manual approval gate)                   │
│  • ZAP Full Scan (test environment)                                  │
│  • Nuclei CVE scan                                                   │
│  • Dependency license compliance check                               │
│  • DefectDojo / Security Hub findings review                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Security Findings Dashboard

Centralize all findings in DefectDojo or AWS Security Hub:

```bash
# Import Trivy SARIF to DefectDojo
curl -X POST https://defectdojo.myorg.com/api/v2/import-scan/ \
  -H "Authorization: Token $DEFECTDOJO_TOKEN" \
  -F "scan_type=SARIF" \
  -F "file=@trivy-results.sarif" \
  -F "engagement=1" \
  -F "product=my-app" \
  -F "minimum_severity=High"
```

---

## DevSecOps Maturity

| Level | What's Automated |
|-------|----------------|
| **Level 0** | No security automation |
| **Level 1** | Gitleaks pre-commit + npm audit in CI |
| **Level 2** | Semgrep + Trivy in PR gate, blocks on CRITICAL |
| **Level 3** | ZAP DAST + Policy-as-Code (OPA/Kyverno) + Falco runtime |
| **Level 4** | Full pipeline with signing, SBOM, centralized findings dashboard |

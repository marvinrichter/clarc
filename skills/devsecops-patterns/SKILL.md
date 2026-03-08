---
name: devsecops-patterns
description: Skill: DevSecOps & Security Automation
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
# Install
brew install semgrep
pip install semgrep

# Run with auto-selected rules (best for most projects)
semgrep --config=auto .

# Run with specific ruleset
semgrep --config=p/owasp-top-ten .
semgrep --config=p/secrets .
semgrep --config=p/javascript .

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
name: SAST

on:
  pull_request:
  push:
    branches: [main]

jobs:
  semgrep:
    name: Semgrep SAST
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
      - name: Run Semgrep
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
        run: |
          semgrep ci \
            --config=auto \
            --severity ERROR \
            --error \
            --sarif-output=semgrep-results.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep-results.sarif

  codeql:
    name: CodeQL
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript, python   # Adjust to your languages
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
| PHP | PHPCS + PHPStan | `phpstan analyse --level=8 src/` |

---

## Secrets Detection

### Gitleaks — Pre-Commit + CI

```bash
# Install
brew install gitleaks

# Scan current directory (including history)
gitleaks detect --source=. --verbose

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
        name: Detect secrets (gitleaks)
        description: Detect hardcoded secrets before commit
        language: golang
        entry: gitleaks protect --staged -v
        pass_filenames: false
```

```bash
# Install pre-commit and activate hooks
pip install pre-commit
pre-commit install
pre-commit run --all-files   # Run once on all files
```

### Gitleaks Configuration

```toml
# .gitleaks.toml
title = "Gitleaks config"

[extend]
useDefault = true   # Extend the default ruleset

[[rules]]
description = "Internal API Key"
id = "internal-api-key"
regex = '''MYAPP_[A-Z0-9]{32}'''
tags = ["key", "internal"]

[allowlist]
description = "Allowlist for known false positives"
regexTarget = "match"
regexes = [
  # Test fixtures with fake credentials
  "test-api-key-12345",
  "example.com/fake-token",
]
paths = [
  ".git",
  "tests/fixtures/",
  "*.test.ts",
]
```

### TruffleHog — Deep History Scan

```bash
# Install
pip install trufflehog3

# Scan entire git history
trufflehog git file://. --since-commit HEAD~100 --only-verified

# Scan a GitHub org's repos
trufflehog github --org=myorg --token=$GITHUB_TOKEN
```

### Secret Rotation Runbook

When a secret is discovered in Git:

1. **Immediately revoke** the secret at the provider (AWS IAM, GitHub PAT, Stripe dashboard)
2. **Generate a new secret** and store it in the secret manager (not in code)
3. **Remove from Git history:**
   ```bash
   # BFG Repo Cleaner (faster than git filter-branch)
   java -jar bfg.jar --replace-text secrets-to-remove.txt
   git push --force-with-lease
   ```
4. **Notify** affected parties (if the secret had production access)
5. **Audit** the secret's usage in access logs for the past 30 days

---

## Dependency Vulnerability Scanning

### Trivy — All-in-One Scanner

```bash
# Install
brew install trivy

# Scan filesystem (dependencies + IaC misconfigurations)
trivy fs . --severity HIGH,CRITICAL

# Scan container image
trivy image myorg/my-app:latest --severity HIGH,CRITICAL

# Scan Kubernetes cluster (live)
trivy k8s --report summary cluster

# Generate SBOM
trivy fs . --format spdx-json --output sbom.json

# Exit 1 if CRITICAL vulnerabilities found (for CI gate)
trivy image myorg/my-app:latest \
  --severity CRITICAL \
  --exit-code 1 \
  --no-progress
```

### GitHub Actions — Trivy Container Scan

```yaml
- name: Build Docker image
  run: docker build -t myorg/my-app:${{ github.sha }} .

- name: Scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myorg/my-app:${{ github.sha }}
    format: sarif
    output: trivy-results.sarif
    severity: HIGH,CRITICAL
    exit-code: '1'     # Fail the build on CRITICAL

- name: Upload Trivy SARIF
  uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: trivy-results.sarif
```

### Language-Native Scanners

```bash
# npm / Node.js
npm audit --audit-level=high

# Python
pip-audit --requirement requirements.txt

# Go
govulncheck ./...

# Rust
cargo audit

# Ruby
bundle exec bundle-audit check --update

# Java (Maven)
mvn org.owasp:dependency-check-maven:check
```

---

## DAST — Dynamic Analysis Security Testing

### OWASP ZAP Baseline Scan (PR Gate — Safe)

The Baseline Scan only performs **passive** scanning — it does not modify data. Safe to run against any environment.

```bash
# Run ZAP baseline scan against a running app
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
  run: |
    timeout 60 bash -c 'until curl -sf http://localhost:8080/health; do sleep 2; done'

- name: OWASP ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: 'http://localhost:8080'
    rules_file_name: '.zap/rules.tsv'   # Optional: tune alert levels
    cmd_options: '-I'   # Ignore warnings (don't fail on them)
    fail_action: false   # Don't fail CI — report only

- name: Upload ZAP Report
  uses: actions/upload-artifact@v4
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

```bash
# Install Gatekeeper
kubectl apply -f \
  https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
```

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
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
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
# Constraint — apply the policy to namespaces
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireLabels
metadata:
  name: require-pod-labels
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["production", "staging"]
  parameters:
    labels: ["app", "team", "version"]
```

### Conftest — Test Policies Locally

```bash
# Install
brew install conftest

# Write a Rego policy
cat > policy/no-root.rego << 'EOF'
package main

deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.securityContext.runAsNonRoot
  msg := sprintf("Container '%s' must set runAsNonRoot: true", [container.name])
}

deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  container.securityContext.privileged
  msg := sprintf("Container '%s' must not run as privileged", [container.name])
}
EOF

# Test against Kubernetes manifests
conftest test k8s/ --policy policy/
```

### Kyverno (Simpler Kubernetes Policies)

```yaml
# ClusterPolicy — require non-root containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root
spec:
  validationFailureAction: enforce   # Blocks deployment if violated
  rules:
    - name: check-non-root
      match:
        resources:
          kinds: [Pod]
          namespaces: [production, staging]
      validate:
        message: "Containers must run as non-root user"
        pattern:
          spec:
            containers:
              - securityContext:
                  runAsNonRoot: true
                  allowPrivilegeEscalation: false

---
# ClusterPolicy — auto-generate NetworkPolicy for new namespaces
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-networkpolicy
spec:
  rules:
    - name: generate-default-deny
      match:
        resources:
          kinds: [Namespace]
      generate:
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny-all
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            podSelector: {}
            policyTypes: [Ingress, Egress]
```

---

## Container Security

### Secure Dockerfile Patterns

```dockerfile
# Use distroless or minimal base image
FROM gcr.io/distroless/java21-debian12:nonroot
# or
FROM node:22-alpine AS base

# Multi-stage build — don't ship build tools
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# No shell, no package manager — minimal attack surface

# Run as non-root user (required by Kyverno policy above)
USER nonroot:nonroot

# Read-only root filesystem
# (set via securityContext in Kubernetes, not Dockerfile)
```

### Image Signing with Sigstore/cosign

```bash
# Install cosign
brew install cosign

# Sign image after push (in CI)
cosign sign \
  --key cosign.key \
  myorg/my-app:${{ github.sha }}

# Verify image signature before deployment (in admission webhook)
cosign verify \
  --key cosign.pub \
  myorg/my-app:latest
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
| **Level 3** | ZAP DAST + Policy-as-Code (OPA/Kyverno) |
| **Level 4** | Full pipeline with signing, SBOM, centralized findings dashboard |

---
description: Run comprehensive DevSecOps security scan — SAST (Semgrep), secrets (Gitleaks), dependencies (Trivy), container images, DAST (ZAP), and Policy-as-Code (OPA/Kyverno). Produces prioritized CRITICAL/HIGH report with fix plan.
---

# DevSecOps Security Scan

Run a full security scan for the project at: $ARGUMENTS

## Your Task

Execute a layered DevSecOps security scan covering static analysis, secrets detection, dependency vulnerabilities, container security, and (optionally) dynamic testing. Produce a prioritized report with fix plans for all CRITICAL and HIGH findings. Reference the `devsecops-patterns` skill for detailed tool patterns.

---

## Step 1: SAST — Static Application Security Testing

### Semgrep (All Languages)

```bash
# Full SAST scan with auto-selected rules
semgrep --config=auto . \
  --severity ERROR \
  --json \
  --output semgrep-results.json 2>/dev/null || \
semgrep --config=p/owasp-top-ten --config=p/secrets .

# Summary of findings by severity
cat semgrep-results.json | \
  jq '.results | group_by(.extra.severity) | .[] | {severity: .[0].extra.severity, count: length}'
```

### Language-Specific Scanners

```bash
# Python
if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
  bandit -r src/ -ll -f json -o bandit-results.json 2>/dev/null
  echo "Bandit SAST: $(jq '.results | length' bandit-results.json) findings"
fi

# Go
if [ -f "go.mod" ]; then
  gosec ./... 2>&1 | tail -20
fi

# Ruby
if [ -f "Gemfile" ]; then
  brakeman -q -w2 --format json . 2>/dev/null | \
    jq '{warnings: .warnings | length, ignored: .ignored_warnings | length}'
fi

# Node.js / TypeScript
if [ -f "package.json" ]; then
  npx eslint --plugin security --rule '{"security/detect-object-injection": "warn"}' \
    src/ --format json 2>/dev/null | \
    jq 'map(.messages) | flatten | length'
fi

# Java
if [ -f "pom.xml" ] || [ -f "build.gradle" ]; then
  echo "Run: mvn spotbugs:check -Dspotbugs.effort=Max"
fi
```

---

## Step 2: Secrets Detection

### Gitleaks — Current Commit + History

```bash
# Scan current state (staged + unstaged)
gitleaks detect --source=. --verbose --no-git 2>/dev/null || \
gitleaks detect --source=. --verbose

# Scan recent git history (last 50 commits)
gitleaks detect --source=. --log-opts="HEAD~50..HEAD" --verbose 2>/dev/null

# Report summary
echo "=== Secrets Scan ==="
gitleaks detect --source=. --no-git --format json 2>/dev/null | \
  jq '{total_findings: length, by_rule: [.[]] | group_by(.RuleID) | .[] | {rule: .[0].RuleID, count: length}}'
```

### Additional Pattern Check

```bash
# Direct grep for common secret patterns (fallback if gitleaks not installed)
echo "=== Manual Secret Patterns ==="
grep -rn \
  -E '(password|passwd|secret|api_key|apikey|token|auth_token|access_token|private_key)\s*=\s*["\x27][^"\x27]{8,}' \
  --include="*.{py,js,ts,go,rb,java,php,yaml,yml,json,env}" \
  --exclude-dir="{.git,node_modules,vendor,__pycache__}" \
  . 2>/dev/null | \
  grep -v -E '(test|fake|example|placeholder|xxx|your_|<|>|\$\{)' | \
  head -20
```

---

## Step 3: Dependency Vulnerability Scanning

### Trivy — Filesystem + Dependencies

```bash
# Full filesystem scan (dependencies + IaC misconfigurations)
trivy fs . \
  --severity HIGH,CRITICAL \
  --exit-code 0 \
  --format json \
  --output trivy-fs-results.json 2>/dev/null

# Summary
if [ -f trivy-fs-results.json ]; then
  jq '
    .Results[] |
    select(.Vulnerabilities != null) |
    {
      target: .Target,
      critical: [.Vulnerabilities[] | select(.Severity == "CRITICAL")] | length,
      high: [.Vulnerabilities[] | select(.Severity == "HIGH")] | length
    }
  ' trivy-fs-results.json
fi
```

### Language-Native Dependency Scanners

```bash
# Node.js
if [ -f "package-lock.json" ] || [ -f "yarn.lock" ]; then
  npm audit --audit-level=high --json 2>/dev/null | \
    jq '{critical: .metadata.vulnerabilities.critical, high: .metadata.vulnerabilities.high}'
fi

# Python
if [ -f "requirements.txt" ]; then
  pip-audit -r requirements.txt --format json 2>/dev/null | \
    jq 'length' | xargs echo "pip-audit vulnerabilities:"
fi

# Go
if [ -f "go.mod" ]; then
  govulncheck ./... 2>&1 | grep -E "^Vulnerability|Found"
fi

# Ruby
if [ -f "Gemfile.lock" ]; then
  bundle exec bundle-audit check --update 2>&1 | grep -E "^Name|^Criticality|^CVE"
fi

# Rust
if [ -f "Cargo.lock" ]; then
  cargo audit 2>&1 | grep -E "^error|^warning" | head -20
fi
```

---

## Step 4: Container Security (if Dockerfile present)

```bash
if [ -f "Dockerfile" ] || find . -name "Dockerfile*" -maxdepth 3 | grep -q .; then
  echo "=== Container Security Scan ==="

  # Build image if not already built
  IMAGE_TAG="${DOCKER_IMAGE:-$(basename $(pwd)):security-scan}"

  # Scan Dockerfile for misconfigurations
  trivy config Dockerfile \
    --severity HIGH,CRITICAL \
    --exit-code 0 2>/dev/null | head -40

  # Check for common Dockerfile issues manually
  echo "--- Dockerfile Checks ---"
  DOCKERFILE=$(find . -name "Dockerfile" | head -1)
  grep -n "^USER root\|^RUN.*sudo\|^RUN.*chmod 777" "$DOCKERFILE" && \
    echo "WARNING: Root execution or broad permissions detected" || echo "OK: No root user issues"
  grep -qn "^USER " "$DOCKERFILE" && echo "OK: Non-root USER defined" || \
    echo "WARNING: No USER instruction — container runs as root"
  grep -qn "COPY \.\." "$DOCKERFILE" && echo "WARNING: Copying entire context" || true

  # Scan built image (if available)
  if docker image inspect "$IMAGE_TAG" &>/dev/null; then
    trivy image "$IMAGE_TAG" \
      --severity HIGH,CRITICAL \
      --exit-code 0 \
      --format json \
      --output trivy-image-results.json

    jq '
      .Results[] |
      select(.Vulnerabilities != null) |
      {
        target: .Target,
        critical_cves: [.Vulnerabilities[] | select(.Severity == "CRITICAL") | .VulnerabilityID],
        high_count: [.Vulnerabilities[] | select(.Severity == "HIGH")] | length
      }
    ' trivy-image-results.json
  fi
fi
```

---

## Step 5: DAST — Dynamic Analysis (Optional)

Only run if a local app URL is provided or a docker-compose environment is available.

```bash
# Check if app URL was provided
if [ -n "$APP_URL" ] || [ -f "docker-compose.yml" ]; then
  echo "=== OWASP ZAP Baseline Scan ==="

  # Start app if compose file present
  if [ -f "docker-compose.yml" ] && [ -z "$APP_URL" ]; then
    docker compose up -d
    sleep 10
    APP_URL="http://localhost:8080"
  fi

  # Run ZAP Baseline (passive only — safe for any environment)
  docker run --rm \
    --network host \
    -v $(pwd):/zap/wrk:rw \
    ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py \
    -t "$APP_URL" \
    -J zap-report.json \
    -r zap-report.html \
    -I 2>/dev/null

  # Summary
  if [ -f zap-report.json ]; then
    jq '
      {
        total_alerts: (.site[0].alerts | length),
        high: [.site[0].alerts[] | select(.riskcode == "3")] | length,
        medium: [.site[0].alerts[] | select(.riskcode == "2")] | length,
        low: [.site[0].alerts[] | select(.riskcode == "1")] | length
      }
    ' zap-report.json
  fi
else
  echo "DAST: Skipped (set APP_URL env var or provide docker-compose.yml to enable)"
fi
```

---

## Step 6: Policy-as-Code (Kubernetes Manifests)

```bash
# Check for Kubernetes manifests
K8S_FILES=$(find . -name "*.yaml" -path "*/k8s/*" -o -name "*.yaml" -path "*/overlays/*" 2>/dev/null | head -5)

if [ -n "$K8S_FILES" ]; then
  echo "=== Policy-as-Code Scan ==="

  # Conftest (if installed)
  if command -v conftest &>/dev/null && [ -d "policy/" ]; then
    conftest test k8s/ --policy policy/ --format json 2>/dev/null | \
      jq '{failures: [.[].failures | .[]?], warnings: [.[].warnings | .[]?]} | {failure_count: (.failures | length), warning_count: (.warnings | length)}'
  fi

  # Manual manifest checks
  echo "--- Kubernetes Security Checks ---"

  # Containers running as root
  grep -rn "runAsRoot: true\|runAsUser: 0" \
    --include="*.yaml" k8s/ overlays/ 2>/dev/null && \
    echo "WARNING: Root containers detected" || echo "OK: No explicit root users"

  # Privileged containers
  grep -rn "privileged: true" --include="*.yaml" . 2>/dev/null && \
    echo "CRITICAL: Privileged containers detected" || echo "OK: No privileged containers"

  # No resource limits
  find . -name "*.yaml" -path "*/k8s/*" 2>/dev/null | while read f; do
    if grep -q "containers:" "$f" && ! grep -q "limits:" "$f"; then
      echo "WARNING: No resource limits in $f"
    fi
  done

  # Host network / hostPID
  grep -rn "hostNetwork: true\|hostPID: true" \
    --include="*.yaml" . 2>/dev/null && \
    echo "HIGH: hostNetwork or hostPID detected" || true
fi
```

---

## Report Format

Generate a consolidated security report:

```markdown
# Security Scan Report — [Project]
Date: [YYYY-MM-DD]
Scan Duration: [X minutes]

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| SAST (Semgrep) | X | X | X | X |
| Secrets (Gitleaks) | X | - | - | - |
| Dependencies (Trivy) | X | X | X | X |
| Container | X | X | X | - |
| DAST (ZAP) | - | X | X | X |
| Policy (OPA) | X | X | - | - |

## CRITICAL — Fix Immediately (Blocks Deployment)

### Finding 1: [CVE/Rule ID] — [Short Description]
- **File/Location:** `path/to/file.py:42`
- **Severity:** CRITICAL
- **OWASP Category:** [A01:2021 Broken Access Control, etc.]
- **Description:** [What the vulnerability is]
- **Fix:**
  ```python
  # Before (vulnerable)
  query = f"SELECT * FROM users WHERE id = {user_id}"
  # After (safe)
  query = "SELECT * FROM users WHERE id = %s"
  cursor.execute(query, (user_id,))
  ```
- **References:** [CVE link / OWASP page]

## HIGH — Fix Before Next Release

[Same format for HIGH findings]

## MEDIUM — Fix Within Sprint

[Same format]

## Recommended CI Gates

Based on findings, add these gates to your pipeline:
- [ ] Semgrep --config=auto (block on ERROR)
- [ ] Gitleaks detect (block on any finding)
- [ ] Trivy --severity CRITICAL (block on CRITICAL)
- [ ] ZAP Baseline (report HIGH, don't block)

**IMPORTANT:** CRITICAL findings block deployment. Fix before proceeding.
```

---

**Reference:** See `devsecops-patterns` skill for tool installation and full CI integration patterns.
**Agent:** Use `devsecops-reviewer` for automated review of specific changed files.

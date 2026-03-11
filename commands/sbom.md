---
description: Generate SBOM (Software Bill of Materials), run vulnerability scan, and set up attestation with cosign — full workflow from generation to CI integration
---

# SBOM Command

<!-- SCOPE: SBOM generation + attestation only.
     ESCALATION LADDER:
       dev-time dependency check → /dep-audit
       SBOM generation + release attestation → /sbom (this command)
       full supply chain security (CI pinning, SLSA, provenance) → /supply-chain-audit
       full DevSecOps pipeline scan → /security-review
     See also: /dep-audit, /supply-chain-audit, /security-review
-->

Generate and integrate a Software Bill of Materials: $ARGUMENTS

## Scope

| In scope | Out of scope |
|----------|-------------|
| SBOM generation (SPDX/CycloneDX) | License compliance analysis (→ `/dep-audit`) |
| CVE scanning via SBOM attestation | Code-level security issues (→ `/security-review`) |
| Supply chain integrity verification | Dependency version updates (→ `/dep-update`) |

## Your Task

Walk the user through the complete SBOM workflow: generate an SBOM, scan it for vulnerabilities, attach it to releases, and optionally sign with cosign attestation.

## Step 1 — Install Tools

```bash
# syft — SBOM generator
brew install syft        # macOS
# Linux:
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# grype — vulnerability scanner (uses SBOM)
brew install grype       # macOS
# Linux:
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin

# cosign — artifact signing (optional)
brew install cosign      # macOS
```

## Step 2 — Generate SBOM

Determine the target (source directory, container image, or binary):

```bash
# Source code directory (recommended for most projects)
syft . -o cyclonedx-json > sbom.json

# Container image
syft myimage:latest -o cyclonedx-json > sbom.json
syft ghcr.io/myorg/myimage:v1.2.3 -o cyclonedx-json > sbom.json

# With SPDX format (for NTIA compliance)
syft . -o spdx-json > sbom.spdx.json

# Multiple formats simultaneously
syft . \
  -o cyclonedx-json=sbom.cyclonedx.json \
  -o spdx-json=sbom.spdx.json \
  -o table    # also print summary to terminal
```

## Step 3 — Vulnerability Scan

```bash
# Scan the generated SBOM
grype sbom:sbom.json

# Full output with fixes
grype sbom:sbom.json --output table

# Fail if HIGH or CRITICAL found (for CI gates)
grype sbom:sbom.json --fail-on high

# JSON output for parsing
grype sbom:sbom.json --output json > vulnerabilities.json

# SARIF format for GitHub Code Scanning
grype sbom:sbom.json --output sarif > grype-results.sarif
```

Interpret results:
- **CRITICAL** — patch immediately, block release
- **HIGH** — patch before next release, investigate exploitability
- **MEDIUM** — schedule for next sprint
- **LOW/NEGLIGIBLE** — track, low urgency

For CVEs that don't apply to your usage, create a VEX document to suppress them:
```json
// vex.json
{
  "@context": "https://openvex.dev/ns/v0.2.0",
  "@id": "https://myorg.com/vex/[date]",
  "author": "security@myorg.com",
  "statements": [{
    "vulnerability": {"name": "CVE-XXXX-XXXXX"},
    "products": [{"@id": "pkg:generic/myapp@1.0.0"}],
    "status": "not_affected",
    "justification": "vulnerable_code_not_in_execute_path",
    "impact_statement": "[Explain why this CVE doesn't affect your usage]"
  }]
}

// Scan with VEX suppression
grype sbom:sbom.json --vex vex.json
```

## Step 4 — Attach to GitHub Release

```bash
# Manual release attachment
gh release upload v1.2.3 sbom.json --clobber
gh release upload v1.2.3 sbom.spdx.json --clobber
```

## Step 5 — GitHub Actions CI Workflow

Generate and write `.github/workflows/sbom.yml`:

```yaml
name: SBOM Generation

on:
  push:
    branches: [main]
  release:
    types: [published]

permissions:
  contents: write
  id-token: write  # Required for keyless cosign signing

jobs:
  sbom:
    name: Generate & Scan SBOM
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: cyclonedx-json
          output-file: sbom.cyclonedx.json
          artifact-name: sbom.cyclonedx.json

      - name: Vulnerability Scan
        id: scan
        uses: anchore/scan-action@v3
        with:
          sbom: sbom.cyclonedx.json
          fail-build: true
          severity-cutoff: high
          output-format: sarif

      - name: Upload SARIF to Code Scanning
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: ${{ steps.scan.outputs.sarif }}

      - name: Attach SBOM to Release
        if: github.event_name == 'release'
        run: |
          gh release upload ${{ github.event.release.tag_name }} \
            sbom.cyclonedx.json \
            --clobber
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Step 6 — cosign Attestation (Optional — for container images)

For maximum supply chain integrity, attach the SBOM as a signed attestation:

```bash
# After pushing container image to registry:
IMAGE="ghcr.io/myorg/myimage:v1.2.3"

# Generate SBOM for the image
syft ${IMAGE} -o cyclonedx-json > sbom.json

# Attach as keyless attestation (in GitHub Actions with id-token permission)
cosign attest --yes \
  --predicate sbom.json \
  --type cyclonedx \
  ${IMAGE}

# Verify later
cosign verify-attestation \
  --type cyclonedx \
  --certificate-identity "https://github.com/myorg/myrepo/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ${IMAGE}
```

## Step 7 — .gitignore Update

```bash
# Add to .gitignore (generated files, keep in CI artifacts)
echo "sbom.json" >> .gitignore
echo "sbom.*.json" >> .gitignore
echo "vulnerabilities.json" >> .gitignore
```

## Summary Checklist

- [ ] syft and grype installed
- [ ] SBOM generated (`sbom.cyclonedx.json`)
- [ ] Vulnerability scan passed (no HIGH/CRITICAL)
- [ ] VEX documents created for non-applicable CVEs
- [ ] GitHub Actions workflow created (`.github/workflows/sbom.yml`)
- [ ] SBOM attached to release
- [ ] (Optional) cosign attestation attached to container image

## Reference Skills

- `supply-chain-security` — SLSA, cosign, SBOM formats, VEX
- `dependency-audit` — per-language dependency vulnerability scanning

## After This

- `/supply-chain-audit` — run before SBOM generation to check GitHub Actions pinning, SLSA, and provenance
- `/security-review` — full DevSecOps scan if HIGH/CRITICAL vulnerabilities are found in the SBOM

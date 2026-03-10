---
name: supply-chain-security
description: "Software supply chain security: SBOM generation (CycloneDX/SPDX with syft/grype), SLSA framework levels, Sigstore/cosign artifact signing, dependency hash pinning, reproducible builds, VEX documents, and SSDF compliance."
---

# Supply Chain Security Skill

SolarWinds, Log4Shell, XZ-Utils — modern attacks compromise the build pipeline and dependencies, not just the running service. This skill covers protecting the full software supply chain from source code to deployment.

## When to Activate

- Generating or updating an SBOM (Software Bill of Materials)
- Setting up artifact signing for container images or releases
- Auditing dependency pinning practices
- Achieving SLSA compliance for a project
- Responding to a CVE in a dependency
- Configuring CI/CD for supply chain security

---

## SBOM — Software Bill of Materials

An SBOM is a machine-readable inventory of every component in your software. Think of it as a manifest for your software's ingredients.

### Formats

| Format | Owner | Best For |
|--------|-------|----------|
| **CycloneDX** | OWASP | Security-focused tooling, grype, Dependency-Track |
| **SPDX** | Linux Foundation | License compliance, NTIA requirements |

### Generate with syft

```bash
# Install
brew install syft  # macOS
# or: curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh

# Scan a directory (source code)
syft . -o cyclonedx-json > sbom.json

# Scan a container image
syft nginx:latest -o cyclonedx-json > sbom.json

# SPDX format
syft . -o spdx-json > sbom.spdx.json

# Multiple formats at once
syft . -o cyclonedx-json=sbom.cyclonedx.json -o spdx-json=sbom.spdx.json
```

### Scan for Vulnerabilities with grype

```bash
# Install
brew install grype

# Scan SBOM
grype sbom:sbom.json

# Scan directory directly (generates SBOM internally)
grype .

# Only show HIGH and CRITICAL
grype . --fail-on high

# Output as table (default), JSON, or SARIF (for GitHub Code Scanning)
grype . -o json > vulnerabilities.json
grype . -o sarif > results.sarif
```

### Integrate in GitHub Actions

```yaml
# .github/workflows/sbom.yml
name: SBOM
on: [push, release]

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: cyclonedx-json
          output-file: sbom.json

      - name: Vulnerability Scan
        uses: anchore/scan-action@v3
        with:
          sbom: sbom.json
          fail-build: true
          severity-cutoff: high

      - name: Attach SBOM to Release
        if: github.event_name == 'release'
        uses: actions/upload-release-asset@v1
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: sbom.json
          asset_name: sbom.cyclonedx.json
          asset_content_type: application/json
```

---

## SLSA Framework

SLSA (Supply chain Levels for Software Artifacts) is a graduated framework for improving build integrity.

| Level | Requirements | What it prevents |
|-------|-------------|-----------------|
| **L0** | Nothing | Baseline (no guarantee) |
| **L1** | Build process documented, provenance generated | Accidental errors |
| **L2** | Hosted build, signed provenance | Some tampering |
| **L3** | Hardened build (isolated, no network, reproducible) | Sophisticated tampering |
| **L4** | Two-party review, hermetic builds | Insider threats |

### SLSA L1: Generate Provenance (GitHub Actions)

```yaml
# GitHub Actions SLSA provenance (slsa-github-generator)
jobs:
  build:
    outputs:
      hashes: ${{ steps.hash.outputs.hashes }}
    steps:
      - name: Build
        run: |
          make build
          sha256sum ./dist/* > checksums.txt

      - id: hash
        run: echo "hashes=$(cat checksums.txt | base64 -w0)" >> $GITHUB_OUTPUT

  provenance:
    needs: [build]
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0
    with:
      base64-subjects: ${{ needs.build.outputs.hashes }}
```

---

## Sigstore / cosign — Artifact Signing

Sigstore enables keyless signing using ephemeral keys tied to OIDC identity (GitHub Actions, Google, etc.). No key management required.

### Sign a Container Image

```bash
# Install cosign
brew install cosign  # macOS

# Keyless signing (in GitHub Actions — uses OIDC token)
cosign sign --yes ghcr.io/myorg/myimage:latest

# Sign with custom key (if keyless not available)
cosign generate-key-pair
cosign sign --key cosign.key ghcr.io/myorg/myimage:latest
```

### Verify a Signed Image

```bash
# Keyless (verify identity and issuer)
cosign verify \
  --certificate-identity "https://github.com/myorg/myrepo/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/myorg/myimage:latest

# With explicit key
cosign verify --key cosign.pub ghcr.io/myorg/myimage:latest
```

### Attach SBOM Attestation

```bash
# Attach SBOM as attestation
cosign attest --yes \
  --predicate sbom.json \
  --type cyclonedx \
  ghcr.io/myorg/myimage:latest

# Verify attestation
cosign verify-attestation \
  --type cyclonedx \
  --certificate-identity "..." \
  ghcr.io/myorg/myimage:latest
```

---

## Dependency Pinning

### The Problem

```json
// DANGEROUS — any breaking change or compromise installs automatically
"dependencies": {
  "express": "^4.0.0",
  "lodash": "*"
}
```

### Hash Pinning (npm)

```bash
# Lock file pins exact versions + integrity hashes
npm ci  # Always use in CI — installs exactly what's in package-lock.json
# NOT npm install — that can update the lock file
```

```json
// package-lock.json (generated)
{
  "express": {
    "version": "4.18.2",
    "integrity": "sha512-ab0MkHh..."  // SHA-512 hash — tampered package won't match
  }
}
```

### Python — pip with hashes

```bash
# Generate locked requirements with hashes
pip-compile --generate-hashes requirements.in -o requirements.txt

# requirements.txt (generated)
# flask==2.3.3 \
#     --hash=sha256:f69fcd...
```

### Docker — pin by digest

```dockerfile
# INSECURE
FROM ubuntu:22.04

# SECURE — pinned to immutable content hash
FROM ubuntu@sha256:67211c14fa74f070d27cc59d69a7fa9aeff8e28ea118ef3babc295a0428a6d21
```

### GitHub Actions — pin by SHA

```yaml
# INSECURE — tag can be force-pushed
- uses: actions/checkout@v4

# SECURE — pinned to immutable commit SHA
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
```

---

## VEX — Vulnerability Exploitability eXchange

When grype or other scanners find a CVE that doesn't actually affect your use case, document it with a VEX statement:

```json
{
  "@context": "https://openvex.dev/ns/v0.2.0",
  "@id": "https://myorg.com/vex/2024-001",
  "author": "security@myorg.com",
  "timestamp": "2024-01-15T00:00:00Z",
  "version": 1,
  "statements": [{
    "vulnerability": {"name": "CVE-2021-44228"},
    "products": [{"@id": "pkg:oci/myimage@sha256:..."}],
    "status": "not_affected",
    "justification": "vulnerable_code_not_in_execute_path",
    "impact_statement": "We use log4j but never use JNDI lookup features"
  }]
}
```

Scan with VEX suppression:
```bash
grype . --vex vex.json
```

---

## Reproducible Builds

Ensure the same source always produces the same binary:

```dockerfile
# BuildKit with --no-cache for reproducible CI builds
DOCKER_BUILDKIT=1 docker build --no-cache -t myimage:latest .
```

```makefile
# Hermetic Go build
build:
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" \
    -o dist/myapp ./cmd/myapp
```

---

## SSDF Quick Reference

The NIST Secure Software Development Framework (SSDF) SP 800-218 maps to common practices:

| SSDF Practice | Concrete Action |
|---------------|----------------|
| PW.1 — Security requirements | Define security requirements before coding |
| PW.4 — Reuse secure software | Use vetted dependencies, SBOM tracking |
| PW.7 — Review code | Security review before merge |
| PW.9 — Test security | SAST, SCA, pen testing |
| RV.1 — ID vulnerabilities | SCA scanning, CVE monitoring |
| RV.2 — Assess vulnerabilities | VEX documents, severity triage |
| RV.3 — Respond | Patch SLAs, coordinated disclosure |

---

## Anti-Patterns

### Pinning Docker Images by Tag Instead of Digest

**Wrong:**
```dockerfile
# Tag can be silently overwritten by the publisher — you get a different image next build
FROM node:20-alpine
FROM ubuntu:22.04
```

**Correct:**
```dockerfile
# Digest is immutable — points to exactly one content-addressed layer
FROM node@sha256:a9c7d3eb7b20b59c6c89aaa93e05e0d8c7a3f5b6e2d1f4a8c9b0e7d6f5a4b3c2
```

**Why:** Tags are mutable references; a compromised registry or malicious publisher can replace the image a tag points to without your knowledge.

---

### Using Floating Version Ranges for Dependencies

**Wrong:**
```json
{
  "dependencies": {
    "express": "^4.0.0",
    "axios": "*",
    "lodash": ">=4"
  }
}
```

**Correct:**
```bash
# Commit the lock file and use `npm ci` in CI to install exact pinned versions
npm ci
```

```json
{
  "dependencies": {
    "express": "4.18.2",
    "axios": "1.6.0",
    "lodash": "4.17.21"
  }
}
```

**Why:** Floating ranges allow a compromised or updated package to be silently pulled in on the next install without any code review.

---

### Pinning GitHub Actions by Tag

**Wrong:**
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v3
```

**Correct:**
```yaml
steps:
  # Pinned to immutable commit SHAs — tags can be force-pushed
  - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
  - uses: actions/setup-node@1a4442cacd436585916779262731d1f68a7eb5f0  # v3.8.0
```

**Why:** Git tags are mutable — a compromised action maintainer can replace the tag to point to malicious code and affect every pipeline using that tag.

---

### Ignoring `npm audit` Findings in CI

**Wrong:**
```yaml
# Vulnerabilities are found but the pipeline succeeds anyway
- run: npm audit || true
```

**Correct:**
```yaml
# Fail the build on HIGH or CRITICAL vulnerabilities
- run: npm audit --audit-level=high
```

**Why:** Allowing audit failures trains teams to ignore known vulnerabilities; CI must enforce a minimum security bar to prevent regressions.

---

### Distributing Artifacts Without Signatures or Provenance

**Wrong:**
```bash
# Push the image — no signature, no attestation, no SBOM
docker push ghcr.io/myorg/myimage:latest
```

**Correct:**
```bash
# Sign the image with keyless Sigstore after pushing
docker push ghcr.io/myorg/myimage:latest
cosign sign --yes ghcr.io/myorg/myimage:latest
# Attach SBOM attestation so consumers can verify contents
cosign attest --yes --predicate sbom.json --type cyclonedx ghcr.io/myorg/myimage:latest
```

**Why:** Unsigned artifacts give no guarantee that what a consumer pulls is what you built — a registry compromise or MITM attack can substitute a malicious image silently.

---

## Reference Commands

- `/sbom` — SBOM generation and attestation workflow
- `/dep-audit` — Full dependency vulnerability and license audit
- `/security` — Broader application security review

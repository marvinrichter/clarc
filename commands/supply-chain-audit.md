---
description: Supply chain security audit — CI/CD pipeline security, GitHub Actions pinning, unsigned artifacts, SLSA compliance, and SBOM generation. Invokes the supply-chain-auditor agent.
---

# Supply Chain Audit

This command invokes the **supply-chain-auditor** agent to audit your software supply chain.

## What This Command Does

1. **GitHub Actions Pinning** — Flag actions not pinned to full commit SHA (e.g., `actions/checkout@v4` → must be `@<sha>`)
2. **Unsigned Artifacts** — Verify releases include provenance attestations (Sigstore/cosign)
3. **Suspicious Install Scripts** — Scan `postinstall`, `preinstall`, and lifecycle hooks for risky commands
4. **Unverified Sources** — Detect dependencies pulled from non-registry sources (git URLs, tarballs)
5. **SLSA Compliance** — Check build provenance against SLSA Level 2/3 requirements
6. **SBOM Presence** — Verify Software Bill of Materials exists and is up to date

## When to Use

- Before every production release as a release gate
- After adding a new CI/CD tool, GitHub Action, or third-party dependency
- During a security audit or compliance review (SOC 2, FedRAMP)
- When a dependency is flagged by security advisories

## Scope vs Related Commands

| Need | Command |
|------|---------|
| SBOM generation only | `/sbom` |
| Dependency vulnerability scan | `/dep-audit` |
| Full DevSecOps pipeline scan | `/security-review` |
| This command: CI/CD + provenance + SLSA | `/supply-chain-audit` |

## Usage

```
/supply-chain-audit                    — full audit
/supply-chain-audit github-actions     — Actions pinning only
/supply-chain-audit sbom               — SBOM gap analysis only
/supply-chain-audit slsa               — SLSA level assessment only
```

## Severity Levels

### CRITICAL
- Unpinned third-party GitHub Actions in production workflows
- Release artifacts with no provenance attestation
- `postinstall` scripts fetching from the internet

### HIGH
- No SBOM in the last 30 days
- SLSA Level 0 (no provenance at all)
- Git URL dependencies in package.json / pyproject.toml

### MEDIUM
- First-party actions not pinned to SHA
- SBOM missing transitive dependencies

## Related

- Agent: `agents/supply-chain-auditor.md`
- SBOM only: `/sbom`
- Dependency vulnerabilities: `/dep-audit`
- Full security: `/security-review`

## After This

- `/sbom` — generate or refresh the SBOM after resolving audit findings
- `/security-review` — full DevSecOps pipeline scan if CRITICAL issues found
- `/dep-audit` — scan vulnerability advisories for flagged dependencies
- `/setup-ci` — update CI pipeline to enforce provenance requirements

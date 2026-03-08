# Security Guidelines

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables or a secret manager
- Validate that required secrets are present at startup
- Rotate any secrets that may have been exposed

## Privacy Engineering Obligations

Personal data (PII) requires additional protections beyond general security controls:

- **NO PII in logs** — never log name, email, IP address, phone, or any identifier in log statements. Use pseudonymized tokens or user IDs instead.
- **NO real PII in test fixtures** — use Faker-generated data for all tests and seeds. Never copy production data into development.
- **Retention policy for every PII table** — every new database table containing personal data must include a documented retention period and an enforcement mechanism (cron job, partition drop, or soft-delete + purge).
- **Presidio scan for PII-processing services** — run `presidio-analyzer` as a pre-commit hook on services that handle user data to catch hardcoded PII before it reaches the repository.
- **RTBF coverage** — any feature storing new PII must be included in the Right to Erasure flow. Verify the erasure endpoint covers the new storage location.
- **Third-party DPA required** — before sending PII to any new external service (analytics, email, support tools), confirm a Data Processing Agreement (DPA) is in place and the service is listed in the privacy policy.

### Privacy Checklist (add to pre-commit review)

Before ANY commit touching user data:
- [ ] No PII in log statements (no email, name, IP in `logger.info/warn/error`)
- [ ] Test fixtures use Faker — not real emails, phone numbers, or names
- [ ] New PII database columns have retention days documented in a comment
- [ ] New PII storage is included in the RTBF erasure function
- [ ] No new third-party service receiving PII without a signed DPA

## Zero-Trust Obligations (Kubernetes / Microservices)

When operating services in Kubernetes or any multi-service environment, Zero-Trust is mandatory:

- **Service-to-service communication MUST use mTLS** — plain HTTP between services is never acceptable in production. Use Istio (`PeerAuthentication: STRICT`) or Linkerd.
- **Default-Deny NetworkPolicies required** — every namespace must have a `default-deny-all` NetworkPolicy. Add explicit allowlist rules per-service. No namespace may rely on implicit allow-all.
- **Secrets MUST NOT be stored in environment variables** — not even via `secretKeyRef`. Use Vault Agent Sidecar, External Secrets Operator (ESO), or equivalent. Secrets in env vars are exposed via `ps aux`, logging, and pod-spec leaks.
- **Service identity via SPIFFE/SPIRE or Kubernetes Service Accounts** — workloads must have cryptographic identity. Authorization policies must reference principals (SPIFFE SVIDs), not just pod labels.
- **Authorization Policies: default deny, explicit allow** — Istio `AuthorizationPolicy` with empty spec (deny-all) must exist in every namespace. Each allowed route must be listed explicitly.
- **No long-lived tokens** — use projected Service Account Tokens with audience binding and short expiry (`expirationSeconds: 3600`). Never mount default service account tokens unnecessarily.

### Zero-Trust Checklist (add to pre-deployment review)

Before ANY service deployment to a production cluster:
- [ ] `PeerAuthentication` exists and mode is `STRICT` (not `PERMISSIVE`)
- [ ] `AuthorizationPolicy` deny-all baseline exists in namespace
- [ ] `NetworkPolicy` default-deny-all exists in namespace
- [ ] No secrets mounted as environment variables (`env.valueFrom.secretKeyRef`)
- [ ] Service Account Token uses projected volume with audience + short expiry
- [ ] Egress NetworkPolicy restricts outbound connections to required endpoints only

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues

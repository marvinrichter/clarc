---
alwaysApply: true
---
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

## Privacy Engineering

Before ANY commit touching user data:
- [ ] No PII in log statements (no email, name, IP in logger calls)
- [ ] Test fixtures use Faker — not real emails, phone numbers, or names
- [ ] New PII database columns have retention days documented
- [ ] New PII storage is included in the RTBF erasure function
- [ ] No new third-party service receiving PII without a signed DPA

> See skill `gdpr-privacy` for PII classification, retention patterns, and RTBF implementation.

## Zero-Trust (Kubernetes / Microservices)

Before ANY service deployment to a production cluster:
- [ ] `PeerAuthentication` exists and mode is `STRICT` (not `PERMISSIVE`)
- [ ] `AuthorizationPolicy` deny-all baseline exists in namespace
- [ ] `NetworkPolicy` default-deny-all exists in namespace
- [ ] No secrets mounted as environment variables
- [ ] Service Account Token uses projected volume with short expiry
- [ ] Egress NetworkPolicy restricts outbound to required endpoints only

> See skill `zero-trust-review` for Istio, SPIFFE, NetworkPolicy, and ESO patterns.

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues

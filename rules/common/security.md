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

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues

---
name: compliance-audit
description: "Compliance and audit-log workflow: immutable audit trail design, SOC 2 / ISO 27001 / HIPAA / PCI-DSS control mapping, access control reviews, data lineage, and compliance automation in CI/CD. Complements gdpr-privacy and security-review."
origin: ECC
---

# Compliance & Audit Log

> **Scope**: Audit trails, compliance control implementation, and automated compliance checks.
> For GDPR-specific data subject rights and consent management, see [gdpr-privacy](../gdpr-privacy/SKILL.md).
> For access control and authentication patterns, see [auth-patterns](../auth-patterns/SKILL.md) and [security-review](../security-review/SKILL.md).

## When to Activate

- Designing an audit log for a sensitive feature (admin actions, PII access, financial transactions)
- Preparing for SOC 2 Type II audit
- Implementing HIPAA, PCI-DSS, or ISO 27001 controls
- Adding access control review / privileged action logging
- Setting up compliance checks in CI/CD
- Responding to a compliance audit request (evidence gathering)

---

## Audit Log Design

### What to log

An audit event answers: **Who** did **what** to **which resource** at **when**, and **from where**.

```typescript
interface AuditEvent {
  // Identity
  actor_id:       string;      // authenticated user ID
  actor_email:    string;      // human-readable, for readability in reports
  actor_ip:       string;      // IP address
  actor_role:     string;      // role at time of action

  // Action
  action:         string;      // e.g. "user.password_changed", "record.deleted"
  outcome:        'success' | 'failure';
  failure_reason?: string;

  // Resource
  resource_type:  string;      // e.g. "user", "invoice", "patient_record"
  resource_id:    string;

  // Context
  timestamp:      string;      // ISO 8601, always UTC
  request_id:     string;      // correlation ID for tracing
  session_id:     string;
  service:        string;      // which service/microservice logged this
}
```

### Action naming convention

```
<resource>.<verb>

user.created
user.deleted
user.password_changed
user.mfa_disabled
payment.refunded
record.exported          # data export is high-value for compliance
admin.permission_granted
admin.permission_revoked
api_key.rotated
```

### What NOT to include

- Passwords, secrets, tokens (even hashed)
- Full PII beyond what's required for audit (no SSNs in audit logs)
- Health records content (HIPAA: log access, not content)
- Payment card data (PCI: log the transaction ID, not the card number)

---

## Immutable Audit Log Implementation

### Storage requirements

| Property | Requirement |
|----------|-------------|
| Immutability | Append-only; no UPDATE or DELETE on audit records |
| Retention | Minimum 1 year accessible, 7 years archived (SOC 2 / PCI) |
| Integrity | Hash chaining or WORM storage to detect tampering |
| Encryption | At rest (AES-256) and in transit (TLS 1.2+) |
| Searchability | Index by actor_id, resource_id, timestamp, action |

### PostgreSQL append-only table

```sql
-- Revoke UPDATE/DELETE from application user
CREATE TABLE audit_events (
  id            BIGSERIAL PRIMARY KEY,
  actor_id      TEXT        NOT NULL,
  actor_email   TEXT        NOT NULL,
  actor_ip      INET        NOT NULL,
  actor_role    TEXT        NOT NULL,
  action        TEXT        NOT NULL,
  outcome       TEXT        NOT NULL CHECK (outcome IN ('success', 'failure')),
  failure_reason TEXT,
  resource_type TEXT        NOT NULL,
  resource_id   TEXT        NOT NULL,
  request_id    TEXT        NOT NULL,
  session_id    TEXT        NOT NULL,
  service       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Payload for additional context (never PII/secrets)
  metadata      JSONB
);

-- Indexes for common queries
CREATE INDEX idx_audit_actor    ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_events(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_action   ON audit_events(action, created_at DESC);

-- Prevent modifications (run as superuser)
REVOKE UPDATE, DELETE ON audit_events FROM app_user;
```

### Hash chaining (tamper detection)

```typescript
import crypto from 'crypto';

interface AuditEventWithHash extends AuditEvent {
  prev_hash: string;
  hash:      string;
}

function hashEvent(event: AuditEvent, prevHash: string): string {
  const payload = JSON.stringify({ ...event, prev_hash: prevHash });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Verify chain integrity
async function verifyChain(events: AuditEventWithHash[]): Promise<boolean> {
  for (let i = 1; i < events.length; i++) {
    const expected = hashEvent(events[i], events[i - 1].hash);
    if (expected !== events[i].hash) {
      console.error(`Chain broken at event ${events[i].id}`);
      return false;
    }
  }
  return true;
}
```

---

## Framework Control Mapping

### SOC 2 Type II — Trust Services Criteria

| Control | What to log | Evidence |
|---------|------------|---------|
| CC6.1 — Logical access | Login success/failure, MFA events | `user.signed_in`, `user.mfa_failed` |
| CC6.2 — Access provisioning | Permission changes | `admin.permission_granted/revoked` |
| CC6.3 — Access termination | Account deletion/suspension | `user.suspended`, `user.deleted` |
| CC7.2 — System monitoring | Security events, anomalies | Alert logs, SIEM integration |
| CC9.2 — Change management | Deploys, config changes | CI/CD deploy events |
| A1.1 — Availability | Uptime, SLO data | Error budget reports |

### HIPAA (Healthcare)

Must log: access to Protected Health Information (PHI)

```typescript
// Every PHI access must be logged
async function getPatientRecord(actorId: string, patientId: string) {
  const record = await db.patients.findById(patientId);

  await auditLog({
    actor_id: actorId,
    action: 'patient_record.viewed',
    resource_type: 'patient_record',
    resource_id: patientId,
    outcome: 'success',
    metadata: {
      record_type: 'clinical_notes',
      // Do NOT include PHI content in audit log
    }
  });

  return record;
}
```

### PCI-DSS (Payment card)

| Requirement | Log event |
|------------|-----------|
| 10.2.1 — Access to cardholder data | `payment.card_data_accessed` |
| 10.2.2 — Admin actions | `admin.*` |
| 10.2.4 — Invalid access attempts | `user.signed_in` with outcome=failure |
| 10.2.7 — Audit log initialization | Log system startup/shutdown |

---

## Privileged Action Review

High-risk actions requiring additional controls:

```typescript
const PRIVILEGED_ACTIONS = new Set([
  'admin.permission_granted',
  'admin.role_changed',
  'user.deleted',
  'user.impersonated',
  'api_key.created',
  'data.bulk_exported',
  'config.changed',
]);

async function requirePrivilegedActionApproval(action: string, actorId: string) {
  if (!PRIVILEGED_ACTIONS.has(action)) return; // not privileged

  // Require MFA re-confirmation for privileged actions
  const session = await getSession(actorId);
  if (!session.mfa_verified_at || Date.now() - session.mfa_verified_at > 15 * 60 * 1000) {
    throw new Error('MFA re-confirmation required for privileged action');
  }

  // Require second approver for the most critical actions
  const DUAL_APPROVAL_REQUIRED = new Set(['user.deleted', 'data.bulk_exported']);
  if (DUAL_APPROVAL_REQUIRED.has(action)) {
    await requireSecondApprover(actorId, action);
  }
}
```

---

## Compliance Automation in CI/CD

### Secret scanning

```yaml
# .github/workflows/compliance.yml
jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

  dependency-audit:
    steps:
      - run: npm audit --audit-level=high
      - run: pip-audit --requirement requirements.txt
```

### License compliance

```yaml
  license-check:
    steps:
      - run: npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC"
```

### SAST (Static Application Security Testing)

```yaml
  sast:
    steps:
      - uses: github/codeql-action/analyze@v3
        with:
          languages: javascript, python
```

---

## Compliance Evidence Package

For an audit, collect:

```bash
# Generate audit evidence report
scripts/compliance-report.sh \
  --from 2024-01-01 \
  --to 2024-12-31 \
  --controls soc2-cc6,soc2-cc7 \
  --output audit-evidence-2024.zip
```

Evidence package includes:
1. User access list (current) with roles
2. Access change log (who was granted/revoked what, when)
3. Failed login report (with source IPs)
4. Privileged action log (admin actions with approvals)
5. Deploy log (what was deployed, when, by whom)
6. Vulnerability scan reports
7. Penetration test results (if applicable)

---

## Related

- [gdpr-privacy](../gdpr-privacy/SKILL.md) — data subject rights, consent, right to erasure
- [security-review](../security-review/SKILL.md) — access control patterns and security review checklist
- [auth-patterns](../auth-patterns/SKILL.md) — authentication, MFA, session management
- [observability](../observability/SKILL.md) — log aggregation and alerting infrastructure

---
name: gdpr-privacy
description: "GDPR and data privacy implementation patterns: Right to Erasure, data retention policies, PII detection and anonymization, consent management, Data Subject Access Requests (DSAR), audit logs, and data minimization. Required for any EU-facing product."
---

# GDPR & Data Privacy Skill

## When to Activate

- Building any product that processes EU personal data
- Implementing "Delete my account" or "Export my data" features
- Setting up data retention policies
- Adding analytics or tracking (consent required)
- Handling PII in logs, databases, or third-party services
- Building a DSAR (Data Subject Access Request) workflow

---

## Core Concepts

| Term | Meaning |
|------|---------|
| Personal Data | Any data that can identify a person (name, email, IP, cookie ID, etc.) |
| Data Subject | The individual whose data you process |
| Controller | Your company — decides purposes and means of processing |
| Processor | Third parties processing data on your behalf (AWS, Stripe, etc.) |
| Lawful Basis | Why you're allowed to process: Consent, Contract, Legitimate Interest, Legal Obligation |
| Data Minimization | Only collect what you actually need |
| Purpose Limitation | Only use data for the purpose it was collected |

---

## Right to Erasure (Right to be Forgotten)

The most complex GDPR requirement technically. Plan it before you build the data model.

```typescript
// erasure-service.ts

interface ErasureResult {
  userId: string;
  deletedAt: Date;
  steps: ErasureStep[];
}

interface ErasureStep {
  resource: string;
  action: 'deleted' | 'anonymized' | 'retained' | 'failed';
  reason?: string;
}

async function eraseUser(userId: string): Promise<ErasureResult> {
  const steps: ErasureStep[] = [];

  // 1. Check for legal holds (data you MUST retain by law)
  const hasOpenInvoices = await db.query.invoices.findFirst({
    where: and(eq(invoices.userId, userId), eq(invoices.status, 'open')),
  });

  // 2. Hard delete what can be deleted
  await db.delete(sessions).where(eq(sessions.userId, userId));
  steps.push({ resource: 'sessions', action: 'deleted' });

  await db.delete(notifications).where(eq(notifications.userId, userId));
  steps.push({ resource: 'notifications', action: 'deleted' });

  // 3. Anonymize what must be retained (financial records, audit logs)
  if (hasOpenInvoices) {
    steps.push({ resource: 'invoices', action: 'retained', reason: 'Open invoice — legal obligation' });
  } else {
    await db
      .update(invoices)
      .set({
        userEmail: null,
        userName: 'Deleted User',
        userId: null,  // break the FK link
        anonymizedAt: new Date(),
      })
      .where(eq(invoices.userId, userId));
    steps.push({ resource: 'invoices', action: 'anonymized' });
  }

  // 4. Delete PII from audit logs (keep the event, remove identifying info)
  await db
    .update(auditLogs)
    .set({ actorEmail: null, actorName: null, ipAddress: null })
    .where(eq(auditLogs.actorId, userId));
  steps.push({ resource: 'audit_logs', action: 'anonymized' });

  // 5. Delete user account last
  await db.delete(users).where(eq(users.id, userId));
  steps.push({ resource: 'user', action: 'deleted' });

  // 6. Notify processors (third-party services)
  await Promise.allSettled([
    stripe.customers.del(user.stripeCustomerId),         // Payment processor
    intercom.delete('/contacts', { email: user.email }), // Support tool
    // sendgrid suppress email
  ]);
  steps.push({ resource: 'third_party_processors', action: 'deleted' });

  // 7. Log the erasure itself (required for compliance — keep minimal info)
  await db.insert(erasureLog).values({
    userId,            // Keep only the ID, not PII
    requestedAt: user.erasureRequestedAt,
    completedAt: new Date(),
    steps: JSON.stringify(steps),
  });

  return { userId, deletedAt: new Date(), steps };
}
```

---

## Data Retention Policies

```typescript
// retention-job.ts — runs nightly via cron
async function enforceRetention() {
  const policies: RetentionPolicy[] = [
    // Logs: 90 days
    {
      table: 'request_logs',
      column: 'created_at',
      retainDays: 90,
      action: 'delete',
    },
    // Audit logs: 7 years (legal requirement in many jurisdictions)
    {
      table: 'audit_logs',
      column: 'created_at',
      retainDays: 365 * 7,
      action: 'archive',  // Move to cold storage, don't delete
    },
    // Soft-deleted users: 30 days to allow recovery, then hard-delete
    {
      table: 'users',
      column: 'deleted_at',
      retainDays: 30,
      action: 'hard_delete',
      condition: sql`deleted_at IS NOT NULL`,
    },
    // Analytics events: 2 years, then anonymize
    {
      table: 'events',
      column: 'created_at',
      retainDays: 730,
      action: 'anonymize',
      anonymizeColumns: ['user_id', 'ip_address', 'session_id'],
    },
  ];

  for (const policy of policies) {
    await enforcePolicy(policy);
  }
}
```

---

## PII in Logs — Prevention

```typescript
// pii-filter.ts — scrub PII before logging
const PII_PATTERNS = [
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replace: '[EMAIL]' },
  { name: 'phone', regex: /\+?[\d\s\-().]{10,}/g, replace: '[PHONE]' },
  { name: 'credit_card', regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replace: '[CARD]' },
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replace: '[SSN]' },
];

function scrubPII(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return PII_PATTERNS.reduce(
      (str, p) => str.replace(p.regex, p.replace),
      obj
    );
  }
  if (Array.isArray(obj)) return obj.map(scrubPII);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, scrubPII(v)])
    );
  }
  return obj;
}

// Fields to always redact by key name
const SENSITIVE_KEYS = new Set([
  'password', 'token', 'secret', 'authorization',
  'creditCard', 'ssn', 'passportNumber',
]);

function redactSensitiveKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v,
    ])
  );
}
```

---

## Consent Management

```typescript
// consent-service.ts
type ConsentPurpose = 'analytics' | 'marketing' | 'personalization' | 'functional';

interface ConsentRecord {
  userId: string;
  purposes: Record<ConsentPurpose, boolean>;
  grantedAt: Date;
  ipAddress: string;   // Proof of consent
  userAgent: string;
  consentVersion: string;  // Bump when your consent text changes
}

async function recordConsent(
  userId: string,
  purposes: Record<ConsentPurpose, boolean>,
  req: Request
): Promise<void> {
  await db.insert(consentRecords).values({
    userId,
    purposes,
    grantedAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    consentVersion: CURRENT_CONSENT_VERSION,  // '2024-01-15'
  });
}

async function hasConsent(userId: string, purpose: ConsentPurpose): Promise<boolean> {
  const latest = await db.query.consentRecords.findFirst({
    where: eq(consentRecords.userId, userId),
    orderBy: desc(consentRecords.grantedAt),
  });
  return latest?.purposes[purpose] === true;
}

// Usage: gate all tracking behind consent
async function trackEvent(userId: string, event: AnalyticsEvent) {
  if (!await hasConsent(userId, 'analytics')) return;
  await analytics.track(event);
}
```

---

## Data Subject Access Request (DSAR)

```typescript
// dsar-service.ts — export all data for a user (GDPR Art. 15)
async function generateDSAR(userId: string): Promise<DSARPackage> {
  const [user, orders, events, sessions, consentHistory] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.orders.findMany({ where: eq(orders.userId, userId) }),
    db.query.events.findMany({
      where: and(eq(events.userId, userId), gt(events.createdAt, subDays(new Date(), 730))),
    }),
    db.query.sessions.findMany({ where: eq(sessions.userId, userId) }),
    db.query.consentRecords.findMany({ where: eq(consentRecords.userId, userId) }),
  ]);

  return {
    exportedAt: new Date(),
    user: {
      profile: user,
      consentHistory,
    },
    transactions: orders,
    activityLog: events,
    // Do NOT include derived/inferred data you don't want to reveal
    // Do NOT include other users' data even if linked
  };
}

// Deliver as password-protected ZIP, not plain JSON
// Log the DSAR request and response date (required)
```

---

## Data Minimization Checklist

- [ ] Every database column has a documented purpose (why do we store this?)
- [ ] IP addresses stored only if needed — hash if only for abuse detection
- [ ] Full names not collected if first name suffices
- [ ] Email not used as primary key (email can change, creates erasure complexity)
- [ ] Analytics events use pseudonymous IDs, not email
- [ ] Third-party services configured with data minimization (e.g., Sentry: `sendDefaultPii: false`)

---

## Anti-Patterns

### Logging PII Directly

**Wrong:**
```typescript
// Email, IP, and full name land in log aggregators (Datadog, Splunk) — often retained for years
logger.info('User logged in', { email: user.email, ip: req.ip, name: user.fullName });
```

**Correct:**
```typescript
// Log the opaque internal ID — correlate to PII only via the DB when needed
logger.info('User logged in', { userId: user.id, country: req.geoCountry });
```

**Why:** Log aggregators typically retain data far longer than your GDPR retention policy allows, and PII in logs is nearly impossible to erasure-comply with.

---

### Using Email as Primary Key

**Wrong:**
```sql
CREATE TABLE users (
  email TEXT PRIMARY KEY,
  name  TEXT NOT NULL
);
```

**Correct:**
```sql
CREATE TABLE users (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name  TEXT NOT NULL
);
```

**Why:** Email is PII that must be erasable; if it's a primary key, every FK reference across the schema must also be updated or nulled during erasure, making Right to Erasure exponentially harder to implement correctly.

---

### Collecting Consent Once and Never Re-Collecting After Policy Changes

**Wrong:**
```typescript
// Checks if *any* consent record exists — ignores whether the user consented to the current policy
const consented = await db.consentRecords.findFirst({ where: { userId } });
if (!consented) return false;
```

**Correct:**
```typescript
// Consent is only valid for the version the user explicitly agreed to
const CURRENT_CONSENT_VERSION = '2024-06-01';
const consented = await db.consentRecords.findFirst({
  where: { userId, consentVersion: CURRENT_CONSENT_VERSION, purposes: { analytics: true } },
  orderBy: { grantedAt: 'desc' },
});
return !!consented;
```

**Why:** GDPR requires fresh consent whenever the purpose or scope of data processing materially changes — old consent does not cover new processing purposes.

---

### Deleting the User Row Without Cascading to Processors

**Wrong:**
```typescript
// Hard-deletes the local row but leaves the user's data in Stripe, Intercom, SendGrid, etc.
await db.delete(users).where(eq(users.id, userId));
```

**Correct:**
```typescript
// Erase from every processor before or alongside the local deletion
await Promise.allSettled([
  stripe.customers.del(user.stripeCustomerId),
  intercom.delete('/contacts', { email: user.email }),
  sendgridSuppressions.add(user.email),
]);
await db.delete(users).where(eq(users.id, userId));
await db.insert(erasureLog).values({ userId, completedAt: new Date() });
```

**Why:** GDPR Art. 17(2) requires you to instruct all processors who received the data to erase it — deleting only your own copy is non-compliant.

---

### Tracking Analytics Without Explicit Consent

**Wrong:**
```typescript
// Fires analytics events for every user regardless of consent choice
export function trackPageView(userId: string, page: string) {
  analytics.track({ userId, event: 'page_view', page });
}
```

**Correct:**
```typescript
export async function trackPageView(userId: string, page: string) {
  if (!await hasConsent(userId, 'analytics')) return;  // Silent no-op if no consent
  analytics.track({ userId, event: 'page_view', page });
}
```

**Why:** Processing personal data for analytics without a lawful basis (typically consent for non-essential tracking) is a core GDPR violation and the basis for most DPA fines.

---

## GDPR Compliance Checklist

- [ ] Privacy policy exists and is accurate (reflects actual data flows)
- [ ] Consent collected before any non-essential cookies or tracking
- [ ] Consent version tracked (proof of consent)
- [ ] Right to erasure endpoint implemented and tested
- [ ] Erasure cascades to all third-party processors
- [ ] Data retention policy documented and automated
- [ ] PII scrubbed from application logs
- [ ] DSAR workflow exists (export all data on request, within 30 days)
- [ ] Data Processing Agreements (DPAs) signed with all processors
- [ ] Breach notification process defined (72-hour reporting window to DPA)

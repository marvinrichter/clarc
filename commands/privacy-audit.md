---
description: Privacy Engineering audit — PII scan (Presidio), retention-policy check, data minimization, test-fixture scan, RTBF flow validation, consent-basis review, third-party data sharing.
---

# Privacy Audit

This command performs a comprehensive Privacy Engineering audit across the codebase, database schema, and infrastructure configuration.

## What This Command Does

1. **PII Scan** — detect hardcoded PII in source code, config files, and test fixtures (Presidio)
2. **Retention Check** — verify deletion policies exist for every table holding personal data
3. **Data Minimization** — identify fields that can be removed or anonymized
4. **Test Data** — confirm test fixtures contain no real production PII
5. **RTBF Flow** — validate a functional Right to Erasure implementation
6. **Consent Trail** — check legal basis documentation for each PII category
7. **Third-Party Sharing** — enumerate which external services receive personal data

## When to Use

Use `/privacy-audit` when:
- Adding any new feature that collects personal data
- Onboarding a new third-party service that receives user data
- Preparing for GDPR, CCPA, or HIPAA compliance review
- After a data breach or near-miss event
- During security or engineering health checks
- Before launching in a new geographic market with privacy regulation

## Audit Checklist

### 1. PII Scan — Hardcoded Personal Data

```bash
# Install presidio CLI
pip install presidio-analyzer presidio-anonymizer

# Scan source code for PII patterns
python - <<'EOF'
from presidio_analyzer import AnalyzerEngine
from pathlib import Path
import json

analyzer = AnalyzerEngine()
findings = []

SCAN_EXTENSIONS = {".py", ".ts", ".js", ".json", ".yaml", ".yml", ".sql", ".csv", ".env.example"}
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "dist", "build", ".venv"}

for path in Path(".").rglob("*"):
    if path.suffix not in SCAN_EXTENSIONS:
        continue
    if any(skip in path.parts for skip in SKIP_DIRS):
        continue
    try:
        text = path.read_text(errors="ignore")
        results = analyzer.analyze(text=text, language="en", score_threshold=0.8)
        for r in results:
            findings.append({
                "file": str(path),
                "type": r.entity_type,
                "value": text[r.start:r.end],
                "line": text[:r.start].count("\n") + 1,
                "confidence": round(r.score, 2),
            })
    except Exception:
        pass

print(json.dumps(findings, indent=2))
print(f"\nTotal findings: {len(findings)}")
EOF
```

**Expected result:** Zero findings. Any email, SSN, credit card, or phone number in source code is a CRITICAL finding.

**Common false positives to review manually:**
- Example emails in documentation (should use `user@example.com`)
- Test fixtures (must use Faker-generated data, not real PII)
- Environment variable names (not values — values must be in secrets manager)

### 2. Retention Check — Database Schema

```bash
# List all tables with potential PII columns
psql $DATABASE_URL -c "
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name ILIKE '%email%'
    OR column_name ILIKE '%phone%'
    OR column_name ILIKE '%name%'
    OR column_name ILIKE '%address%'
    OR column_name ILIKE '%ip%'
    OR column_name ILIKE '%ssn%'
    OR column_name ILIKE '%dob%'
    OR column_name ILIKE '%birth%'
  )
ORDER BY table_name, column_name;
"
```

For each table with PII columns, verify:
- [ ] `deleted_at` column exists OR the row is hard-deleted on erasure
- [ ] A retention policy document or code comment specifies the retention duration
- [ ] A cron job or migration script enforces the retention (no manual-only process)
- [ ] Partition tables use time-based partitions for efficient bulk deletion

```python
# Check if retention enforcement scripts exist
import subprocess, sys

retention_patterns = ["retention", "delete_old", "purge", "expire", "cleanup"]
result = subprocess.run(
    ["grep", "-r", "--include=*.py", "--include=*.sql", "-l"] + retention_patterns + ["."],
    capture_output=True, text=True
)
if result.stdout:
    print("Retention scripts found:")
    print(result.stdout)
else:
    print("WARNING: No retention enforcement scripts found")
    sys.exit(1)
```

### 3. Data Minimization Review

For each PII field, answer:

| Question | If No → Action |
|----------|---------------|
| Is this field actively used in the last 6 months? | Delete the field |
| Is there a documented purpose for this field? | Add purpose comment or delete |
| Can this be derived on demand instead of stored? | Remove and compute at request time |
| Can a hash replace the raw value for lookup purposes? | Replace with HMAC hash |
| Is the full value needed or just a masked version? | Store masked version (last 4 digits, etc.) |

```python
# Find database columns that are collected but never queried (in recent migrations/code)
import subprocess

def find_unused_columns(table: str, column: str) -> bool:
    """Check if a column appears in any SELECT or WHERE clause."""
    result = subprocess.run(
        ["grep", "-r", f"{table}.{column}\|SELECT.*{column}\|WHERE.*{column}", "--include=*.py", "--include=*.sql", "."],
        capture_output=True, text=True
    )
    return len(result.stdout.strip()) == 0

# Example usage — audit columns found in step 2
suspicious_columns = [
    ("users", "middle_name"),
    ("users", "date_of_birth"),
    ("orders", "delivery_notes"),
]
for table, col in suspicious_columns:
    if find_unused_columns(table, col):
        print(f"CANDIDATE FOR REMOVAL: {table}.{col} — not referenced in codebase")
```

### 4. Test Fixture PII Scan

```bash
# Scan test directories for realistic PII patterns
python - <<'EOF'
import re
from pathlib import Path

# Patterns that strongly suggest real PII (not obviously fake)
REAL_PII_PATTERNS = {
    "real_email": re.compile(r'\b[a-z]+\.[a-z]+@(?!example|test|fake|sample)[a-z]+\.(com|org|net|de|fr|uk)\b', re.I),
    "us_phone": re.compile(r'\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),
    "ssn": re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
    "credit_card": re.compile(r'\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),  # Visa pattern
}

TEST_DIRS = ["tests/", "test/", "spec/", "fixtures/", "seeds/", "factories/"]

for test_dir in TEST_DIRS:
    for path in Path(test_dir).rglob("*") if Path(test_dir).exists() else []:
        if path.is_file() and path.suffix in {".py", ".ts", ".json", ".yml", ".yaml", ".sql"}:
            text = path.read_text(errors="ignore")
            for pii_type, pattern in REAL_PII_PATTERNS.items():
                for match in pattern.finditer(text):
                    line = text[:match.start()].count("\n") + 1
                    print(f"CRITICAL {pii_type} in {path}:{line} — '{match.group()}'")
EOF
```

**Action:** Replace any real PII found with Faker-generated data. Never use production data exports as test fixtures.

### 5. RTBF (Right to Erasure) Validation

```bash
# Verify an erasure endpoint or function exists
grep -r "erase_user\|delete_user\|right_to_erasure\|rtbf\|erasure" \
  --include="*.py" --include="*.ts" --include="*.js" -l .

# Check that it covers all storage systems
grep -r "erase_user\|delete_user" --include="*.py" -A 30 . | grep -E "s3|storage|redis|elasticsearch|email|analytics"
```

RTBF implementation checklist:
- [ ] All database tables with PII are cleared or anonymized
- [ ] Object storage (S3/GCS) user files are deleted
- [ ] Email service contact is deleted or unsubscribed
- [ ] Search index entries are removed
- [ ] Analytics pseudonymized tokens become orphaned (acceptable)
- [ ] Audit log PII fields are anonymized (keep record of action, not identity)
- [ ] Erasure certificate is issued and stored
- [ ] Response time < 30 days (GDPR requirement)

```python
# Test the erasure flow in a staging environment
async def test_erasure_completeness(test_user_id: str):
    # Create a test user with data in all systems
    await create_test_user_with_full_data(test_user_id)

    # Trigger erasure
    result = await erase_user_data(test_user_id)

    # Verify nothing remains
    assert await db.fetchone("SELECT id FROM users WHERE id = $1", test_user_id) is None
    assert await s3.list_objects(prefix=f"users/{test_user_id}/") == []
    assert await search.count(query={"term": {"user_id": test_user_id}}) == 0
    assert result["status"] == "complete"
```

### 6. Consent Basis Review

```python
# Check that a CONSENT_BASIS registry exists and covers all PII fields
from pathlib import Path
import ast

# Find the consent basis definitions
consent_files = list(Path(".").rglob("consent*.py")) + list(Path(".").rglob("*privacy*.py"))
if not consent_files:
    print("MISSING: No consent basis registry found")
    print("Action: Create a CONSENT_BASIS dict mapping each PII field to legal basis + purpose + retention")
else:
    print(f"Found consent registry: {consent_files}")
```

Each PII category must document:
| Field | Required | Example |
|-------|----------|---------|
| `legal_basis` | Yes | `"contract"`, `"consent"`, `"legitimate_interest"` |
| `purpose` | Yes | `"account authentication"` |
| `retention_days` | Yes | `730` |
| `third_party_sharing` | Yes | `["stripe", "sendgrid"]` or `[]` |

### 7. Third-Party Data Sharing Inventory

```bash
# Find all external API calls that might send user data
grep -r "requests.post\|axios.post\|fetch.*POST\|httpx.post" \
  --include="*.py" --include="*.ts" --include="*.js" -B2 -A5 . \
  | grep -i "email\|user\|name\|phone\|address"

# Check for analytics SDKs
grep -r "amplitude\|segment\|mixpanel\|posthog\|intercom\|hubspot\|salesforce" \
  --include="*.py" --include="*.ts" --include="*.js" -l .
```

For each third-party service receiving PII:
- [ ] DPA (Data Processing Agreement) signed
- [ ] Listed in privacy policy
- [ ] Minimum necessary data shared (not full user object)
- [ ] User can opt out of non-essential sharing

## Severity Classification

| Severity | Finding | SLA |
|----------|---------|-----|
| CRITICAL | Real PII in source code or test fixtures | Fix before next deploy |
| CRITICAL | No RTBF implementation exists | Fix within 72 hours |
| HIGH | PII field with no retention policy | Fix within sprint |
| HIGH | PII logged in application logs | Fix within sprint |
| HIGH | DPA missing for third-party service receiving PII | Obtain DPA immediately |
| MEDIUM | Data minimization opportunities | Next planning cycle |
| MEDIUM | Consent basis undocumented | Within 2 sprints |
| LOW | Incomplete audit trail | Backlog |

## Output Report Format

```
Privacy Audit Report
====================
Date: 2026-03-08
Codebase: my-app

CRITICAL (0)
HIGH (1)
  [RETENTION] users.ip_address — no retention policy defined (retention default: forever)

MEDIUM (2)
  [MINIMIZATION] users.middle_name — not referenced in any query (last 90 days)
  [CONSENT] purchase_history.shipping_address — no third_party_sharing field in consent registry

LOW (0)

RTBF: IMPLEMENTED (covers 6/7 systems — search index missing)
Third-party inventory: 3 services (stripe ✓ DPA, sendgrid ✓ DPA, mixpanel ✗ DPA MISSING)

Privacy Maturity: 4/7
```

## Related

- Skill: `skills/privacy-engineering/` — implementation patterns for all techniques above
- Skill: `skills/gdpr-privacy/` — GDPR compliance checklist and policy templates
- Command: `/security` — security vulnerabilities alongside privacy issues
- Rule: `rules/common/security.md` — privacy obligations in the security checklist

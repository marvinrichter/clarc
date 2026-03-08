# Skill: Privacy Engineering

## When to Activate

- Building features that collect or process user data (name, email, location, health, etc.)
- Implementing GDPR / CCPA / HIPAA compliance requirements
- Designing database schemas with personal data fields
- Setting up data pipelines or analytics systems
- Reviewing code that logs user data
- Implementing Right to Erasure (RTBF) or data export features
- Creating test fixtures or seeding databases with realistic data

---

## Privacy-by-Design Principles (Ann Cavoukian)

1. **Proactive, not reactive** — embed privacy before data collection, not after a breach
2. **Privacy as default** — maximum privacy without requiring user action
3. **Privacy embedded into design** — not bolted on as an add-on
4. **Full functionality** — privacy AND security, not one at the expense of the other
5. **End-to-end security** — protection over the entire data lifecycle
6. **Visibility and transparency** — open about what data is collected and why
7. **Respect for user privacy** — user-centric by default

**Practical implication:** Before adding any new database column, ask:
- Do we need this field? (Data minimization)
- How long do we keep it? (Retention policy)
- Who can access it? (Access control)
- What happens when the user deletes their account? (RTBF)

---

## PII Classification

Understanding what counts as PII — and how sensitive it is — determines which protections to apply.

| Class | Examples | Risk | Protection Level |
|-------|----------|------|-----------------|
| **Direct identifier** | Name, email, SSN, passport, IP address | HIGH | Encrypt + access control |
| **Quasi-identifier** | Age + ZIP + gender (combo re-identifies) | MEDIUM–HIGH | Anonymize before analytics |
| **Sensitive** | Health, religion, biometrics, sexual orientation | VERY HIGH | Separate storage, strict access |
| **Indirect** | Device ID, cookie, behavioral fingerprint | MEDIUM | Pseudonymize |

**The Quasi-identifier risk:** Any single quasi-identifier (ZIP code) is benign. But age + ZIP + gender can uniquely identify 87% of Americans (Latanya Sweeney, 2002). Always evaluate combinations.

---

## PII Detection with Microsoft Presidio

Presidio is an open-source PII detection framework from Microsoft — best-in-class for text and images.

### Basic Setup

```python
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

# Detect PII entities
text = "Hi, I'm Jane Smith, my email is jane@example.com and my phone is 555-867-5309"

results = analyzer.analyze(
    text=text,
    language="en",
    entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "IP_ADDRESS", "CREDIT_CARD"],
)

for entity in results:
    print(f"{entity.entity_type}: '{text[entity.start:entity.end]}' (confidence: {entity.score:.2f})")
# PERSON: 'Jane Smith' (confidence: 0.85)
# EMAIL_ADDRESS: 'jane@example.com' (confidence: 1.00)
# PHONE_NUMBER: '555-867-5309' (confidence: 0.75)
```

### Anonymization Operators

```python
# Replace with placeholder
anonymized = anonymizer.anonymize(
    text=text,
    analyzer_results=results,
    operators={
        "PERSON": OperatorConfig("replace", {"new_value": "<PERSON>"}),
        "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "<EMAIL>"}),
        "PHONE_NUMBER": OperatorConfig("mask", {"masking_char": "*", "chars_to_mask": 7, "from_end": False}),
    }
)
# "Hi, I'm <PERSON>, my email is <EMAIL> and my phone is ***-867-5309"
```

### Custom Entity Recognizer

```python
from presidio_analyzer import PatternRecognizer, Pattern

# German Personalausweis (ID card number)
personalausweis_recognizer = PatternRecognizer(
    supported_entity="DE_PERSONALAUSWEIS",
    patterns=[
        Pattern(
            name="Personalausweis-Pattern",
            regex=r"\b[A-Z]{1,3}[0-9]{7}[A-Z0-9]{1}\b",
            score=0.7,
        )
    ],
    context=["ausweis", "personalausweis", "id", "dokument"],
)

analyzer.registry.add_recognizer(personalausweis_recognizer)
```

### Scan Codebase for Hardcoded PII

```python
import re
from pathlib import Path

PII_PATTERNS = {
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:\d{4}[\s-]?){3}\d{4}\b"),
    "ipv4": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
}

def scan_for_pii(directory: str) -> list[dict]:
    findings = []
    for path in Path(directory).rglob("*"):
        if path.suffix in {".json", ".yaml", ".yml", ".csv", ".sql", ".py", ".ts", ".js"}:
            text = path.read_text(errors="ignore")
            for pii_type, pattern in PII_PATTERNS.items():
                for match in pattern.finditer(text):
                    findings.append({
                        "file": str(path),
                        "type": pii_type,
                        "value": match.group(),
                        "line": text[:match.start()].count("\n") + 1,
                    })
    return findings
```

---

## Anonymization Techniques

### k-Anonymity

Every record is indistinguishable from at least k-1 other records on quasi-identifiers.

```python
import pandas as pd

def generalize_age(age: int, bucket_size: int = 10) -> str:
    """Generalize age into brackets for k-anonymity."""
    low = (age // bucket_size) * bucket_size
    return f"{low}–{low + bucket_size - 1}"

def truncate_zip(zip_code: str, digits: int = 3) -> str:
    """Reduce ZIP precision to achieve k-anonymity."""
    return zip_code[:digits] + "**"

def achieve_k_anonymity(df: pd.DataFrame, quasi_ids: list[str], k: int = 5) -> pd.DataFrame:
    """Suppress records in groups smaller than k."""
    groups = df.groupby(quasi_ids)
    return df[df.groupby(quasi_ids)[quasi_ids[0]].transform("count") >= k].copy()

# Example
df["age_group"] = df["age"].apply(lambda a: generalize_age(a, 10))
df["zip_prefix"] = df["zip_code"].apply(lambda z: truncate_zip(z, 3))
df_anon = achieve_k_anonymity(df, quasi_ids=["age_group", "zip_prefix", "gender"], k=5)
```

### Synthetic Data Generation

When real data is needed for development/testing, generate synthetic data that preserves statistical properties.

```python
# Using SDV (Synthetic Data Vault)
from sdv.single_table import GaussianCopulaSynthesizer
from sdv.metadata import SingleTableMetadata

# Fit to real data (never expose real data to devs directly)
metadata = SingleTableMetadata()
metadata.detect_from_dataframe(real_df)
metadata.update_column("email", sdtype="email")
metadata.update_column("name", sdtype="name")

synthesizer = GaussianCopulaSynthesizer(metadata)
synthesizer.fit(real_df)

# Generate safe synthetic data
synthetic_df = synthesizer.sample(num_rows=10_000)
# synthetic_df has same distribution as real_df but no real PII
```

---

## Pseudonymization

Unlike anonymization, pseudonymization is reversible — the mapping key is the secret.

### Format-Preserving Encryption (Tokenization)

```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import secrets
import base64

class PseudonymizationVault:
    """Reversible pseudonymization with format-preserving tokens."""

    def __init__(self, key: bytes):
        """key must be 32 bytes, stored in a secrets manager (not in code)."""
        self.key = key
        self._token_map: dict[str, str] = {}  # In production: use database

    def pseudonymize(self, value: str) -> str:
        """Replace PII value with a stable, reversible token."""
        if value in self._token_map:
            return self._token_map[value]
        token = f"tok_{secrets.token_urlsafe(16)}"
        self._token_map[value] = token
        # In production: encrypt and store (value → token) mapping in separate system
        return token

    def de_pseudonymize(self, token: str) -> str | None:
        """Reverse the token back to the original value (requires key access)."""
        reverse_map = {v: k for k, v in self._token_map.items()}
        return reverse_map.get(token)

# Usage in analytics pipeline
vault = PseudonymizationVault(key=get_secret("pseudonymization_key"))

# In the analytics database — no real PII
user_events = [
    {"user_id": vault.pseudonymize("user@example.com"), "event": "purchase", "amount": 99.99}
]
```

### Hashing with Salt (Non-Reversible Lookup)

```python
import hashlib
import hmac
import os

def hash_pii(value: str, salt: bytes) -> str:
    """
    Deterministic, non-reversible hash for lookups (e.g., deduplication).
    Salt must be consistent and stored securely — without it, the hash is useless.
    """
    return hmac.new(salt, value.encode("utf-8"), hashlib.sha256).hexdigest()

# Different salts per field type — a compromised email salt doesn't expose SSNs
EMAIL_SALT = bytes.fromhex(os.environ["HASH_SALT_EMAIL"])
PHONE_SALT = bytes.fromhex(os.environ["HASH_SALT_PHONE"])

hashed_email = hash_pii("user@example.com", EMAIL_SALT)
# "a3f8c2..." — same input always produces same hash, but irreversible
```

---

## Differential Privacy

Mathematical guarantee that individual records cannot be identified from aggregate outputs.

**Core concept:** Adding calibrated noise to query results so that including or excluding any single record changes the output by at most ε (epsilon — the privacy budget).

### Laplace Mechanism for Numeric Queries

```python
import numpy as np

def dp_count(true_count: int, epsilon: float) -> float:
    """
    Return a differentially private count.
    Sensitivity of COUNT = 1 (adding/removing one record changes count by 1).
    """
    noise = np.random.laplace(loc=0, scale=1.0 / epsilon)
    return max(0, true_count + noise)

def dp_mean(values: list[float], epsilon: float, sensitivity: float) -> float:
    """
    Return a differentially private mean.
    sensitivity = (max_value - min_value) / n
    """
    true_mean = np.mean(values)
    noise = np.random.laplace(loc=0, scale=sensitivity / epsilon)
    return true_mean + noise

# Example: publish user count with ε=1.0 (moderate privacy)
true_active_users = 15_423
private_count = dp_count(true_active_users, epsilon=1.0)
# Returns something like 15_421.3 — close to true but not exact
```

### Epsilon Budget Management

```python
class PrivacyBudget:
    """
    Track epsilon consumption across queries.
    Once budget is exhausted, no more queries are allowed.
    """

    def __init__(self, total_epsilon: float = 10.0):
        self.total = total_epsilon
        self.used = 0.0
        self.log: list[dict] = []

    def consume(self, epsilon: float, query_name: str) -> bool:
        if self.used + epsilon > self.total:
            raise PrivacyBudgetExhausted(
                f"Cannot run '{query_name}': would use ε={self.used + epsilon:.2f} of {self.total:.2f}"
            )
        self.used += epsilon
        self.log.append({"query": query_name, "epsilon": epsilon, "cumulative": self.used})
        return True

budget = PrivacyBudget(total_epsilon=10.0)
budget.consume(0.5, "weekly_active_users_count")
budget.consume(1.0, "revenue_by_region")
# Remaining: 8.5 ε
```

### DP in ML Training (DP-SGD)

```python
from opacus import PrivacyEngine
from torch.utils.data import DataLoader

# Wrap optimizer with differential privacy
model = MyModel()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
data_loader = DataLoader(dataset, batch_size=64)

privacy_engine = PrivacyEngine()
model, optimizer, data_loader = privacy_engine.make_private_with_epsilon(
    module=model,
    optimizer=optimizer,
    data_loader=data_loader,
    epochs=10,
    target_epsilon=8.0,    # total privacy budget for training
    target_delta=1e-5,     # probability of privacy failure
    max_grad_norm=1.0,     # gradient clipping for sensitivity bound
)

# Training loop is unchanged — DP is handled transparently
for batch in data_loader:
    loss = model(batch)
    loss.backward()
    optimizer.step()

epsilon_used = privacy_engine.get_epsilon(delta=1e-5)
print(f"Training used ε={epsilon_used:.2f}")
```

---

## Data Minimization

### Retention Policies in Code

```python
# Django: auto-delete old PII with a management command
from django.db import models
from django.utils import timezone
from datetime import timedelta

class UserProfile(models.Model):
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        # Documented retention: 2 years after last activity
        # Enforced by: cron job running retain_user_data management command
        pass

def delete_inactive_users(days_inactive: int = 730):
    """GDPR Art. 5(1)(e): Data must not be kept longer than necessary."""
    cutoff = timezone.now() - timedelta(days=days_inactive)
    inactive = UserProfile.objects.filter(last_active__lt=cutoff)
    count = inactive.count()
    inactive.delete()
    return count
```

```sql
-- PostgreSQL: partition + automatic retention for event logs
CREATE TABLE user_events (
    id          BIGSERIAL,
    user_id     UUID NOT NULL,
    event_type  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions — drop partitions older than 90 days
CREATE TABLE user_events_2026_03 PARTITION OF user_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Retention: just DROP the old partition (instant, no row-by-row delete)
-- DROP TABLE user_events_2025_11;  -- run monthly via pg_cron
```

### Right to Erasure (RTBF)

```python
async def erase_user_data(user_id: str) -> dict:
    """
    GDPR Art. 17 — Right to Erasure.
    Cascade deletion across all systems that hold user data.
    """
    results = {}

    # 1. Primary database — hard delete or anonymize
    results["db"] = await db.execute(
        "DELETE FROM users WHERE id = $1", user_id
    )

    # 2. Analytics — pseudonymized tokens become orphaned (acceptable)
    results["analytics"] = await analytics_db.execute(
        "DELETE FROM user_events WHERE user_token = $1",
        vault.pseudonymize(user_id)
    )

    # 3. Object storage (profile pictures, documents)
    results["storage"] = await s3.delete_all_user_objects(prefix=f"users/{user_id}/")

    # 4. Search index
    results["search"] = await elasticsearch.delete_by_query(
        index="users", query={"term": {"id": user_id}}
    )

    # 5. Email service unsubscribe
    results["email"] = await email_provider.delete_contact(user_id)

    # 6. Audit log (keep — required for compliance, but anonymize PII fields)
    await audit_db.execute(
        "UPDATE audit_log SET user_email = '[deleted]' WHERE user_id = $1",
        user_id
    )

    # 7. Issue erasure certificate
    certificate = {
        "user_id": user_id,
        "erased_at": datetime.utcnow().isoformat(),
        "systems_erased": list(results.keys()),
        "status": "complete",
    }
    await audit_log.record("user_erasure", certificate)
    return certificate
```

---

## Privacy Testing

### Never Use Real PII in Tests

```python
# BAD — real production data in test fixtures
FIXTURES = [
    {"email": "john.doe@company.com", "name": "John Doe"},  # NEVER
]

# GOOD — use Faker for realistic but fake data
from faker import Faker
fake = Faker()

def generate_test_user():
    return {
        "email": fake.email(),
        "name": fake.name(),
        "phone": fake.phone_number(),
        "address": fake.address(),
        "ip": fake.ipv4_private(),  # private range — won't match real users
    }
```

### PII Assertion in Unit Tests

```python
import pytest
from presidio_analyzer import AnalyzerEngine

analyzer = AnalyzerEngine()

def assert_no_pii(text: str, context: str = ""):
    """Fail the test if PII is found in any output or log."""
    results = analyzer.analyze(text=text, language="en")
    high_confidence = [r for r in results if r.score >= 0.7]
    if high_confidence:
        entities = [(r.entity_type, text[r.start:r.end]) for r in high_confidence]
        pytest.fail(f"PII detected in {context}: {entities}")

def test_error_response_has_no_pii():
    response = api_client.post("/users", json={"email": "bad-email"})
    assert response.status_code == 422
    # Ensure the error message doesn't echo back the user's email
    assert_no_pii(response.text, context="error response body")

def test_log_output_has_no_pii(caplog):
    with caplog.at_level(logging.INFO):
        api_client.post("/users", json={"email": "user@example.com", "name": "Jane"})
    assert_no_pii(caplog.text, context="application logs")
```

### Re-Identification Risk Assessment

```python
def compute_k_anonymity(df: pd.DataFrame, quasi_ids: list[str]) -> int:
    """Compute the minimum group size — the k in k-anonymity."""
    group_sizes = df.groupby(quasi_ids).size()
    return group_sizes.min()

def re_identification_risk(df: pd.DataFrame, quasi_ids: list[str]) -> dict:
    k = compute_k_anonymity(df, quasi_ids)
    unique_records = (df.groupby(quasi_ids).size() == 1).sum()
    return {
        "k_anonymity": int(k),
        "unique_records": int(unique_records),
        "unique_fraction": unique_records / len(df),
        "risk_level": "HIGH" if k < 5 else "MEDIUM" if k < 10 else "LOW",
    }

report = re_identification_risk(df, quasi_ids=["age_group", "zip_prefix", "gender"])
# {"k_anonymity": 3, "unique_records": 42, "unique_fraction": 0.004, "risk_level": "HIGH"}
```

---

## Consent and Data Catalog

### Consent Basis Documentation

```python
# Structured consent basis — one entry per PII field
CONSENT_BASIS = {
    "email": {
        "legal_basis": "contract",   # GDPR Art. 6(1)(b)
        "purpose": "account authentication and transactional emails",
        "retention_days": 730,
        "third_party_sharing": ["sendgrid"],
    },
    "ip_address": {
        "legal_basis": "legitimate_interest",  # GDPR Art. 6(1)(f)
        "purpose": "security and fraud prevention",
        "retention_days": 90,
        "third_party_sharing": [],
    },
    "purchase_history": {
        "legal_basis": "contract",
        "purpose": "order fulfillment and warranty",
        "retention_days": 2555,   # 7 years — tax law requirement
        "third_party_sharing": ["stripe", "tax-reporting-service"],
    },
}
```

---

## Related Skills

- `gdpr-privacy` — GDPR compliance checklist and policy templates
- `security-review` — security vulnerabilities alongside privacy issues
- `auth-patterns` — authentication patterns with minimal data collection
- `database-migrations` — schema changes with retention fields
- `observability` — logging patterns that avoid PII in log lines

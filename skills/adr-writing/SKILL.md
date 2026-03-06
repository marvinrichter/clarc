---
name: adr-writing
description: "Architecture Decision Records (ADRs): when to write one, the standard template, how to document rejected alternatives with real reasoning, how to supersede outdated ADRs, and how to maintain a living ADR index. The reference for technical documentation that actually gets read."
---

# ADR Writing Skill

## When to Activate

- Making a significant architectural choice (database, framework, pattern)
- Choosing between multiple reasonable technical options
- Adding a new third-party dependency that's hard to replace later
- Establishing a new pattern that others will follow
- Reversing or superseding a previous decision
- Starting a new project or major feature

---

## When to Write an ADR

Write an ADR when the decision:
- Is **hard to reverse** (database choice, API design, auth architecture)
- Has **multiple reasonable options** (not one obvious answer)
- Will **affect others** (other engineers, teams, future hires)
- Involves a **significant trade-off** (speed vs. consistency, cost vs. reliability)

Do NOT write an ADR for:
- Implementation details (which function to call, variable names)
- Decisions that are trivially reversible
- Personal preference with no trade-off
- Anything covered by existing team standards

---

## The ADR Template

```markdown
# ADR-XXX: <Decision Title>

**Date:** YYYY-MM-DD
**Status:** Draft | Proposed | Accepted | Deprecated | Superseded by ADR-YYY
**Deciders:** @alice, @bob (names of people who made this decision)
**Consulted:** @charlie (people whose input was sought)
**Informed:** engineering team (people notified after decision)

---

## Context

What is the situation or problem forcing this decision?
What constraints exist (technical, business, time, team)?
What are the forces at play?

Write 2-4 paragraphs. Be specific. Include:
- Current state of the system
- What triggered the need for this decision
- Non-negotiable constraints (e.g., must work in EU, must not require > 1 week)

---

## Decision

**We will [chosen option].**

One clear sentence stating what was decided. Then 1-2 paragraphs explaining the key reasoning — not a repetition of the options, but the core insight that made this option win.

---

## Consequences

### Positive
- What becomes easier or better?
- What problems does this solve?

### Negative
- What becomes harder?
- What technical debt are we accepting?
- What is now locked in?

### Risks
- What could go wrong?
- What assumptions must hold for this to work?

---

## Alternatives Considered

### Option A: [Name of rejected option]

**Description:** What this option would look like.

**Why rejected:**
The specific, honest reason this lost. Not "it was worse" but "it would require X which we can't afford because Y" or "it solves the problem but introduces Z risk which outweighs the benefit."

**What it would have been good for:**
Be honest about the cases where this would have been the right choice. This helps future readers know when to revisit.

### Option B: [Name of rejected option]

[Same structure]

---

## Links

- [Related ADR-XXX: Authentication architecture](./ADR-012-auth-architecture.md)
- [RFC that informed this: Performance requirements](../rfcs/perf-requirements.md)
- [Issue that triggered this](https://github.com/org/repo/issues/123)
```

---

## Example ADR (Real, Filled-In)

```markdown
# ADR-017: Use Postgres with pgvector for Embedding Storage

**Date:** 2025-01-15
**Status:** Accepted
**Deciders:** @marvin, @alice
**Consulted:** @bob (infra)

---

## Context

We are building a semantic search feature that requires storing and querying 1536-dimension
embeddings for ~500k product descriptions. We need to choose where to store these embeddings
and how to perform approximate nearest-neighbor (ANN) queries.

Our constraints:
- Team has strong Postgres expertise, minimal Pinecone/Weaviate experience
- Current infrastructure is Postgres (RDS) + Redis only — no vector-specific infra
- Estimated data: 500k vectors at launch, ~5M at 12 months
- P99 search latency target: < 200ms
- Budget: we cannot add a new managed service (cost and complexity)

---

## Decision

**We will use Postgres with the pgvector extension and an HNSW index.**

pgvector on Postgres eliminates a separate vector database service while meeting our latency
requirements. At 500k-5M vectors, HNSW provides recall > 95% and P99 < 100ms on our current
RDS instance size. Keeping vectors in Postgres also means transactional consistency — a vector
and its source record are always in sync without any sync pipeline.

---

## Consequences

### Positive
- No new infrastructure to operate, monitor, or pay for
- Embeddings and product data are always consistent (same transaction)
- Team can use existing Postgres expertise and tooling (Drizzle, migrations)

### Negative
- Postgres is not purpose-built for ANN search — at >10M vectors we may need to migrate
- HNSW index build is slow on initial load (run as migration off peak hours)
- CPU load increases during index build — schedule carefully

### Risks
- If vector count exceeds 10M within 12 months, a migration to Pinecone or Weaviate will be needed
- HNSW parameters (m, ef_construction) need tuning for our data distribution

---

## Alternatives Considered

### Option A: Pinecone (managed vector database)

**Description:** Use Pinecone's managed cloud service for vector storage and ANN search.

**Why rejected:**
Pinecone adds a new managed service dependency ($70-700/month), requires keeping Postgres
and Pinecone in sync (a failure mode), and our team has no Pinecone experience. The
performance advantage over pgvector+HNSW only materializes at >50M vectors — 10x our
12-month projection. Complexity cost outweighs benefit at this scale.

**What it would have been good for:**
Teams with >20M vectors, needing metadata filtering at scale, or with existing vector
infrastructure. Also appropriate if Postgres expertise is limited.

### Option B: Weaviate (self-hosted)

**Description:** Self-host Weaviate for full vector database capabilities.

**Why rejected:**
Self-hosting adds operational overhead (updates, backups, monitoring) that we'd rather avoid.
Weaviate's multi-tenancy model is also more complex to integrate with our existing tenant
isolation (Postgres RLS). No cost advantage over pgvector once infra cost is factored in.

---

## Links

- [pgvector documentation](https://github.com/pgvector/pgvector)
- [HNSW vs IVFFlat benchmark](https://ann-benchmarks.com)
- [ADR-012: Multi-tenancy with Postgres RLS](./ADR-012-multi-tenancy.md)
```

---

## ADR Lifecycle

```
Draft → Proposed → Accepted → (Deprecated | Superseded)

Draft:     Being written, not ready for review
Proposed:  Ready for team review and discussion
Accepted:  Decision made, being implemented
Deprecated: Decision no longer applies (system no longer has this component)
Superseded: A newer ADR (ADR-XXX) has replaced this one
```

### Superseding an ADR

```markdown
# ADR-031: Switch from Redis Sessions to JWT

**Status:** Accepted — **Supersedes ADR-008**

## Context

ADR-008 established Redis-backed sessions for auth. Since then, we have
added mobile clients and third-party API consumers that cannot use cookies.
JWT allows stateless auth across all clients.

[...]
```

And update the old ADR:
```markdown
# ADR-008: Redis-Backed Sessions

**Status:** Superseded by [ADR-031: JWT Auth](./ADR-031-jwt-auth.md)
```

---

## ADR Index (docs/decisions/README.md)

```markdown
# Architecture Decision Records

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./ADR-001-monorepo.md) | Monorepo with Turborepo | Accepted | 2024-03-01 |
| [ADR-012](./ADR-012-multi-tenancy.md) | Multi-tenancy with Postgres RLS | Accepted | 2024-06-15 |
| [ADR-017](./ADR-017-pgvector.md) | pgvector for embedding storage | Accepted | 2025-01-15 |
| [ADR-031](./ADR-031-jwt-auth.md) | JWT auth (supersedes ADR-008) | Accepted | 2025-02-01 |

Numbers are sequential and never reused. Deprecated ADRs stay in the index.
```

---

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| "We chose X because it's better" | No reasoning — future readers can't evaluate | State *why* it's better for *this context* |
| No alternatives documented | Looks like no other options were considered | Always document at least 2 rejected options |
| ADR written after decision | Just rubber-stamps what already happened | Write ADR *during* decision, before implementation |
| ADR never updated | Accepted ADRs describe outdated systems | Supersede rather than edit; keep history |
| Every tiny decision gets an ADR | ADR fatigue — people stop reading | Reserve for decisions that are hard to reverse |

---

## Checklist

- [ ] Decision stated clearly in one sentence at the top
- [ ] Context explains constraints, not just background
- [ ] At least 2 alternatives documented with honest rejection reasoning
- [ ] Consequences include both positive AND negative outcomes
- [ ] Risks explicitly listed (what must be true for this to work)
- [ ] Status is set (Draft / Proposed / Accepted)
- [ ] Links to related ADRs and triggering issues/RFCs
- [ ] Added to docs/decisions/README.md index
- [ ] If superseding: old ADR updated with "Superseded by ADR-XXX"

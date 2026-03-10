---
name: platform-engineering
description: "Platform Engineering: Internal Developer Platforms (IDP), CNCF Platform definition, Team Topologies, IDP components (Service Catalog, Self-Service Infra, Golden Paths, Developer Portal), platform maturity model, make-vs-buy (Backstage vs Port vs Cortex), adoption strategy, DORA correlation."
---

# Platform Engineering

Reference for building Internal Developer Platforms (IDPs) — from strategy to implementation.

## When to Activate

- Defining an IDP strategy for an engineering organization
- Deciding between Backstage and SaaS alternatives
- Designing a Golden Path for a standard service type
- Measuring platform adoption and impact on DORA metrics
- Planning platform team structure and operating model
- Assessing the current platform maturity level and identifying gaps
- Reducing developer toil by introducing self-service infrastructure provisioning
- Building or auditing a service catalog to track ownership and dependencies across teams

---

## What Is Platform Engineering?

> "Platform engineering is the discipline of designing and building toolchains and workflows that enable self-service capabilities for software engineering organizations."
> — CNCF Platform Engineering Working Group

**Platform as a Product:**
- Internal teams (stream-aligned teams) are the customers
- Platform team has a roadmap, measures NPS, responds to feedback
- Voluntary adoption wins over mandated adoption
- Success metric: developer satisfaction + DORA improvement

**Platform Engineering vs. DevOps:**

| Aspect | DevOps | Platform Engineering |
|--------|--------|---------------------|
| Focus | Culture + collaboration | Tooling + self-service |
| Scope | Team practices | Cross-team infrastructure |
| Measurement | Process metrics | Developer Experience (DevEx) |
| Output | Cultural shift | Paved roads (Golden Paths) |

---

## Team Topologies

From Skelton & Pais — four team types:

```
┌──────────────────────────────────────────────────────────┐
│  Stream-Aligned Teams                                     │
│  (Product teams — build and run features)                 │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│    │ Team A   │  │ Team B   │  │ Team C   │             │
│    └──────────┘  └──────────┘  └──────────┘             │
├──────────────────────────────────────────────────────────┤
│  Platform Team                                            │
│  (Reduce cognitive load via self-service + Golden Paths)  │
│    ┌──────────────────────────────────────────────┐      │
│    │ Developer Portal (Backstage) + Infra + CI/CD  │      │
│    └──────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────┤
│  Enabling Team             │  Complicated-Subsystem Team  │
│  (Coaching, upskilling)    │  (ML platform, data mesh)    │
└──────────────────────────────────────────────────────────┘
```

**Key principle:** Platform team exists to reduce cognitive load of stream-aligned teams. If teams must deeply understand the platform to use it, it's not a platform — it's a dependency.

---

## IDP Components (CNCF Platforms Whitepaper)

### 1. Service Catalog

Central inventory of all services, APIs, libraries, and teams.

**Backstage catalog-info.yaml:**
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: order-service
  description: Handles order creation, payment, and fulfillment
  annotations:
    github.com/project-slug: myorg/order-service
    pagerduty.com/integration-key: abc123
    sonarqube.org/project-key: order-service
  tags:
    - java
    - kafka
    - postgres
spec:
  type: service
  lifecycle: production
  owner: group:order-team
  system: ecommerce
  dependsOn:
    - resource:orders-db
    - resource:payments-queue
  providesApis:
    - order-api
  consumesApis:
    - payment-api
    - inventory-api
```

**What the catalog enables:**
- Dependency graph (who breaks if this changes?)
- Ownership matrix (who owns this? who's on-call?)
- Tech radar (what versions/libs are in use across org?)
- Runbook links, alerts, documentation — all in one place

### 2. Self-Service Infrastructure

Developers create infrastructure via templates — no Ops ticket required.

```yaml
# Backstage Scaffolder template — provision a new database
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: provision-postgres
  title: Provision PostgreSQL Database
spec:
  parameters:
    - title: Database Configuration
      properties:
        name:
          type: string
          description: Database name (will create myorg-{name}-db)
        environment:
          type: string
          enum: [dev, staging, production]
        size:
          type: string
          enum: [small, medium, large]
          description: "small: 10GB, medium: 100GB, large: 1TB"
  steps:
    - id: trigger-terraform
      name: Trigger Terraform
      action: github:actions:dispatch
      input:
        repoUrl: github.com?repo=infra&owner=myorg
        workflowId: provision-database.yml
        branchOrTagName: main
        workflowInputs:
          db_name: ${{ parameters.name }}
          env: ${{ parameters.environment }}
```

### 3. Golden Paths (Paved Roads)

Pre-built, opinionated templates for the most common service types:

```
Golden Path: NodeJS REST API
  ├── Repository template (Backstage Scaffolder)
  ├── Dockerfile (optimized, multi-stage)
  ├── GitHub Actions CI/CD (test → build → deploy)
  ├── Kubernetes manifests (Deployment, Service, HPA)
  ├── Observability (OpenTelemetry pre-wired)
  ├── catalog-info.yaml (pre-filled)
  └── README with onboarding guide

Time from idea → running service: 10 minutes (vs. 2 weeks without)
```

### 4. Developer Portal

Single entry point for all developer tools and documentation:

| Section | What's there |
|---------|-------------|
| Service Catalog | All services, APIs, teams |
| Templates | Golden Paths, database provisioning |
| Docs | TechDocs, architecture decisions |
| CI/CD | GitHub Actions status per service |
| Incidents | PagerDuty active incidents |
| Cost | AWS cost per team/service |

### 5. Observability Platform

Standardized logs/metrics/traces:
- All services use the same logging library (Powertools, OpenTelemetry)
- Single Grafana instance — teams get dashboards from their catalog entry
- Alerts owned by teams, not Ops

---

## Platform Maturity Model

| Level | Description | Indicators |
|-------|-------------|------------|
| **1 — Reactive** | No platform team, Ops does everything manually | Tickets for every deployment, weeks to provision DB |
| **2 — Managed** | Shared infra, but still manual processes | Same tools, some automation, but requires Ops help |
| **3 — Self-Service** | Teams deploy without Ops tickets | Golden Paths exist, 80%+ self-service |
| **4 — Ecosystem** | Platform itself is extensible by teams | Teams contribute plugins, templates, feedback loop |

**Quick assessment:**
```
Q1: How long to create a new database in production? (hours → days = Level 1-2)
Q2: How long to onboard a new engineer to their first commit? (days → weeks = Level 1)
Q3: Can teams deploy without opening an Ops ticket? (no = Level 1-2)
Q4: Do teams know who owns a service that's causing issues? (no = Level 1-2)
```

---

## Make vs. Buy

| Tool | Type | Strengths | Weaknesses | Cost |
|------|------|-----------|------------|------|
| **Backstage** | OSS (self-hosted) | Fully customizable, huge ecosystem, CNCF project | High maintenance, requires dedicated team | Infrastructure + team time |
| **Port** | SaaS | Fast setup, good UX, flexible data model | Cost at scale, vendor lock-in | ~$10-20/dev/mo |
| **Cortex** | SaaS | Strong scorecards/standards enforcement | Less flexible catalog | ~$15-25/dev/mo |
| **OpsLevel** | SaaS | Good maturity tracking | Smaller ecosystem | ~$15/dev/mo |
| **Roadie** | Hosted Backstage | Backstage UX without maintenance burden | Still expensive | ~$25/dev/mo |

**Decision framework:**

```
< 20 engineers + fast time-to-value needed → Port or Cortex (SaaS)
20-100 engineers + Kubernetes-heavy + custom needs → Backstage (self-hosted)
> 100 engineers + large existing k8s infra → Backstage or Roadie
Compliance-heavy (HIPAA, SOC2) → Self-hosted Backstage
```

---

## DORA Correlation

Platform Engineering directly improves DORA metrics:

| DORA Metric | Platform Improvement |
|-------------|---------------------|
| **Deployment Frequency** | Self-service CI/CD templates → teams deploy more often |
| **Lead Time** | Golden Paths remove setup friction → faster first deploy |
| **Change Failure Rate** | Standardized configs/tests → fewer config mistakes |
| **MTTR** | Unified observability + ownership in catalog → faster diagnosis |

> "Teams using IDPs deploy 2.1× more frequently and have 40% shorter lead times."
> — Puppet State of DevOps 2023

---

## Adoption Strategy

The #1 platform failure mode: build it, mandate it, watch teams route around it.

**What works:**
1. **Start with pain** — find the top 3 complaints from stream-aligned teams
2. **Solve one thing extremely well** — service catalog beats trying to boil the ocean
3. **Make it easier than the alternative** — self-service must genuinely save time
4. **Voluntary adoption first** — mandate only after proving value
5. **Measure NPS quarterly** — platform team is a product team
6. **Embedded advocates** — one champion per stream-aligned team
7. **Contribute path** — teams can contribute templates/plugins
8. **Transparent roadmap** — teams see what's coming and can influence it

**Anti-patterns:**
- Mandating adoption before proving value
- Building golden paths without consulting stream-aligned teams
- Platform team as approval bottleneck (vs. enabler)
- Ignoring feedback ("we know better")

## Reference

- `backstage-patterns` — catalog YAML, Scaffolder templates, plugins, TechDocs
- `engineering-metrics` — DORA metrics for measuring platform impact
- `dora-implementation` — technical setup for DORA tracking

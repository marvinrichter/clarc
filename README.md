# clarc

**A workflow OS for Claude Code.**
61 agents · 228 skills · 152 commands · 20 language rule sets · continuous learning flywheel.

---

clarc turns Claude Code from a coding assistant into a structured engineering system. It brings together agents that delegate work, skills that encode domain knowledge, commands that run repeatable workflows, hooks that automate the background, and a learning loop that improves itself over time.

---

## The clarc Way

clarc ships a complete, opinionated development methodology — from raw idea to shipped code.

```
Phase 0: Discovery        /idea → /evaluate → /explore → /prd
Phase 1: Planning         /plan
Phase 2: Implementation   /tdd  (RED → GREEN → IMPROVE)
Phase 3: Quality          /code-review  +  /security
Phase 4: Ship             /commit-push-pr
```

**Skip what you don't need:**

| Task | Start here |
|------|-----------|
| New idea (unsure if worth building) | `/idea` |
| Feature with clear spec | `/plan` |
| Bug fix | `/tdd` (write the failing test first) |
| Refactor | `/plan` → `/tdd` |
| Docs / chore | `/commit` |

Run `/clarc-way` to get a tailored recommendation for your current task.
Run `/quickstart` if you're new to clarc.

---

## Getting Started in 5 Minutes

```bash
# 1. Install (pick your language)
npx github:marvinrichter/clarc typescript
npx github:marvinrichter/clarc python
npx github:marvinrichter/clarc go

# 2. Verify the installation
npx github:marvinrichter/clarc doctor

# 3. Open Claude Code and run your first command
# /quickstart    → guided tour of the most important workflows
# /clarc-way     → what to do for your current task
```

---

## Install

```bash
# Recommended — interactive wizard (auto-detects your languages)
npx github:marvinrichter/clarc

# Or with explicit language(s) — skips the wizard
npx github:marvinrichter/clarc typescript
npx github:marvinrichter/clarc typescript python go

# Other editors
npx github:marvinrichter/clarc --target cursor typescript
npx github:marvinrichter/clarc --target opencode typescript
npx github:marvinrichter/clarc --target codex

# Check if your installed rules are up to date
npx github:marvinrichter/clarc --check
```

The wizard clones clarc to `~/.clarc/` on first run, then **symlinks** agents, commands, and rules into `~/.claude/`. A single `git pull` in `~/.clarc/` keeps everything current — no re-install needed.

```
~/.claude/agents/tdd-guide.md  →  ~/.clarc/agents/tdd-guide.md   (symlink)
~/.claude/commands/plan.md     →  ~/.clarc/commands/plan.md       (symlink)
~/.claude/rules/common/*.md    →  ~/.clarc/rules/common/*.md      (symlinks)
```

Your own agents or rules placed in `~/.claude/agents/` or `~/.claude/rules/` are never touched — symlinks only fill in files that don't already exist there.

```bash
# Update clarc
cd ~/.clarc && git pull

# Force copy instead of symlinks (CI, containers, cross-filesystem)
npx github:marvinrichter/clarc --copy typescript
```

<details>
<summary>Clone and run locally</summary>

```bash
git clone git@github.com:marvinrichter/clarc.git ~/.clarc
~/.clarc/install.sh typescript
~/.clarc/install.sh --enable-learning typescript
~/.clarc/install.sh --check
```
</details>

---

## What's inside

| Component | Count | Purpose |
|-----------|------:|---------|
| **Agents** | 61 | Specialized subagents — delegate planning, review, testing, debugging |
| **Skills** | 228 | Domain knowledge — patterns, conventions, examples for specific tasks |
| **Commands** | 152 | Slash commands — repeatable workflows triggered by `/command` |
| **Rules** | 20 | Language rule sets — always-on coding standards and checklists |
| **Hooks** | — | Background automations — format, lint, persist state, weekly digests |

---

## Agents

Agents are delegated automatically based on what you're doing. You can also invoke them explicitly.

| Agent | When it activates |
|-------|------------------|
| `planner` | Complex features, refactoring, anything requiring a plan first |
| `tdd-guide` | New features and bug fixes — enforces write-tests-first |
| `code-reviewer` | Immediately after writing or modifying code |
| `security-reviewer` | Before commits touching auth, input handling, secrets |
| `architect` | Architectural decisions, ADR creation |
| `build-error-resolver` | When the build fails |
| `typescript-reviewer` | TypeScript-specific patterns and type safety |
| `python-reviewer` | Python idioms, PEP 8, async patterns |
| `go-reviewer` | Idiomatic Go, error handling, goroutine patterns |
| `java-reviewer` | Spring Boot, JPA, hexagonal architecture |
| `swift-reviewer` | SwiftUI, Combine, concurrency |
| `ruby-reviewer` | Idiomatic Ruby, Rails best practices, RuboCop |
| `elixir-reviewer` | OTP patterns, Ecto, Phoenix context violations |
| `product-evaluator` | Go/No-Go evaluation of new feature ideas |
| `solution-designer` | Generates 2–4 solution options with trade-off analysis |
| `refactor-cleaner` | Identifies and removes dead code safely |
| `doc-updater` | Keeps documentation in sync with code changes |
| `android-reviewer` | Jetpack Compose, Hilt scopes, Room migrations, Coroutines |
| `gitops-architect` | Designs GitOps setup — ArgoCD/Flux, env strategy, progressive delivery |
| `finops-advisor` | Cloud cost analysis, rightsizing, ROI-prioritized recommendations |
| `devsecops-reviewer` | SAST, secrets detection, IaC misconfigurations, OWASP Top 10 |
| `mlops-architect` | ML serving stack, monitoring, drift detection, A/B testing plans |
| `sdk-architect` | SDK architecture, multi-language generation, release process |
| `frontend-architect` | Micro-frontend architecture, Module Federation, team topology |
| `data-architect` | Data Mesh design, domain products, migration from monolith |
| `docs-architect` | API documentation strategy, Mintlify/Docusaurus, Divio structure |

---

## Key commands

### Daily workflow

```
/clarc-way     Interactive guide — recommends the right workflow for your task
/quickstart    First-time onboarding — understand clarc in 5 minutes
/plan          Plan implementation before writing code
/tdd           Enforce test-first development
/code-review   Security and quality review
/verify        Full build, type check, lint, test cycle
/build-fix     Incrementally fix build and type errors
```

### Product & architecture

```
/idea          Capture and structure a raw product idea
/evaluate      Go/No-Go evaluation before building
/prd           Write a Product Requirements Document
/explore       Generate and compare solution options
/breakdown     Break a feature into sprint-ready user stories
/adr           Record an Architecture Decision
/arc42         Generate or update arc42 architecture documentation
```

### Engineering operations

```
/slo               Define SLIs, SLOs, and error budget alerts
/instrument        Add analytics event tracking to code
/experiment        Design a statistically valid A/B test
/incident          Open and manage a production incident
/deps              Dependency audit and upgrade planner
/setup-ci          Generate GitHub Actions CI/CD pipeline
/security          Full DevSecOps scan — SAST, secrets, deps, DAST, OPA
/gitops-review     Review GitOps config — sync, secrets, drift, progressive delivery
/finops-audit      Cloud cost audit — tagging, rightsizing, anomalies, Infracost
/zero-trust-review Service mesh & mTLS review — identity, NetworkPolicies, east-west
/iac-review        IaC code review — Pulumi/CDK/Terraform abstractions, compliance
/mlops-review      MLOps audit — experiment tracking, serving, drift detection
/privacy-audit     Privacy engineering audit — PII scan, retention, RTBF, consent
/android-review    Android/Compose review — UDF, Hilt, Room, Coroutines
/mobile-release    Mobile release workflow — signing, beta, store submission
/webrtc-review     WebRTC architecture review — TURN, signaling, simulcast, security
/frontend-arch-review  Micro-frontend architecture review — federation, routing, DX
/data-mesh-review  Data Mesh review — domain boundaries, contracts, quality, lineage
/sdk-review        SDK design review — ergonomics, backward compat, error design
/docs-review       API documentation audit — completeness, playground, changelog
/onboard           Generate onboarding materials — CONTRIBUTING.md, architecture tour
```

### Learning & evolution

```
/learn-eval    Extract reusable patterns with quality gate + save-location decision
/evolve        Promote instincts into permanent skills
/instinct-status   Show what the system has learned
/sessions      Browse session history and snapshots
```

---

## Skills

Skills are loaded on-demand when Claude detects they're relevant. They encode domain knowledge in a structured format: when to use, patterns, examples, anti-patterns.

**Language patterns:** TypeScript · Python · Go · Java · Rust · Swift · C++ · Ruby · Elixir · Django · Spring Boot · React Native · SwiftUI · Android/Jetpack Compose · Flutter · WebAssembly · Kotlin · Scala · PHP · R · C# · Bash

**Architecture:** Hexagonal · DDD · Strategic DDD · API design · gRPC · GraphQL · WebSockets · Micro-Frontends/Module Federation · Zero-Trust/Service Mesh · Data Mesh · CQRS/Event Sourcing · Multi-Agent Systems

**Data:** PostgreSQL · DuckDB · NoSQL · Redis/caching · database migrations · Data Mesh (Great Expectations, Soda, Delta Lake, Iceberg)

**Infrastructure:** Terraform · Pulumi · AWS/Azure CDK · Kubernetes · Docker · GitOps (ArgoCD, Flux) · FinOps (Infracost, OpenCost) · CI/CD · deployment patterns · Edge/Serverless

**Testing:** TDD workflow · E2E (Playwright) · contract testing (Pact) · visual regression · load testing · eval harness · chaos engineering · MLOps (A/B model testing, drift detection)

**Security:** DevSecOps (SAST/DAST, OPA/Kyverno) · supply chain (SBOM/SLSA) · privacy engineering (PII, Presidio) · GDPR · auth patterns · Zero-Trust

**AI/ML:** LLM app patterns · RAG · eval harness · MLOps · cost-aware pipelines · foundation models · prompt engineering · SDK design

**Ops:** Observability · SLO workflow · incident response · performance profiling · platform engineering · developer onboarding

**Product engineering:** Analytics workflow · experiment design · feature flags · A/B testing · compliance & audit logs · API documentation engineering

**Team process:** OKRs · sprint planning · DORA metrics · roadmapping · working agreements

---

## Continuous learning flywheel

clarc gets better the more you use it. There are two learning mechanisms:

**Session learning** (`/learn-eval`)
At the end of a session, extracts recurring patterns, friction points, and solved problems into instinct files — with a quality gate and save-location decision (global vs. project-scoped) before writing. These become part of your personal context in future sessions.

**Instinct evolution** (`/evolve`)
Analyzes accumulated instincts and promotes stable, high-signal ones into permanent skills. Closes the loop from observation → codified knowledge.

**Weekly evolve batch**
Every Monday, clarc automatically analyzes accumulated instincts and generates a digest with promotion suggestions — without waiting for a manual `/evolve` call.

**Conflict detection**
When contradictory instincts exist in the same domain (e.g. "prefer functional" vs "use classes"), they are flagged in `conflicts.json` and surfaced in `/instinct-status` for resolution.

**Pre-compact snapshots**
Before context compaction, clarc reads the session transcript and persists a structured snapshot: open tasks, touched files, recent exchanges. Nothing is lost between context resets.

---

## Language rules

Rules are always-on guidelines loaded into every session. They complement skills: rules define *what* to do, skills show *how*.

```
rules/
├── common/          # Universal — immutability, error handling, security, GitOps, onboarding
├── typescript/      # TS/JS — strict typing, ESM, React patterns
├── python/          # PEP 8, type hints, async idioms
├── go/              # Idiomatic Go, error wrapping, goroutines
├── swift/           # Swift 6, actors, value types
├── java/            # Spring Boot, JPA, hexagonal architecture
├── rust/            # Ownership, Result/Option, unsafe rules
├── cpp/             # C++17/20, RAII, smart pointers
├── ruby/            # RuboCop, Rails conventions, RSpec, Brakeman
├── elixir/          # mix format, Credo, OTP patterns, Sobelow
├── kotlin/          # Coroutines, null safety, sealed classes
├── bash/            # set -euo pipefail, quoting, shellcheck
├── scala/           # Functional idioms, ADTs, effect systems
├── c/               # C11/C17, memory safety, opaque pointers
├── php/             # PHP 8.4+, strict types, PSR-12
├── r/               # tidyverse, native pipe, renv
├── csharp/          # C# 12/.NET 8, nullable, records
├── sql/             # Query optimization, indexing, migrations
├── flutter/         # Widget lifecycle, state management, null safety
└── android/         # Compose UDF, Hilt scopes, Room, Coroutines
```

---

## Multi-editor support

clarc ships configurations for multiple editors alongside the primary Claude Code integration:

- **Claude Code** — agents, skills, commands, hooks, rules (full support)
- **Cursor** — 50+ language rules in `.cursor/rules/` + `.cursorrules` global config (`--target cursor`)
- **OpenCode** — full command parity (57 commands) + agent prompts under `.opencode/` (`--target opencode`)
- **Codex CLI** — instructions + 14 commands under `codex/` (`--target codex`)

### clarc as MCP server

clarc can expose its own state as an MCP server, letting subagents and external tools query it directly:

```json
{ "mcpServers": { "clarc": { "command": "node", "args": ["<path>/mcp-server/index.js"] } } }
```

Available tools: `get_instinct_status` · `get_session_context` · `get_project_context` · `skill_search` · `agent_describe` · `rule_check` · `get_component_graph` · `get_health_status`

---

## Structure

```
clarc/
├── agents/          # Subagent definitions (frontmatter + instructions)
├── skills/          # Domain knowledge skills (SKILL.md per topic)
├── skills/INDEX.md  # Machine-readable skill catalog by domain
├── commands/        # Slash commands (/tdd, /plan, /breakdown, ...)
├── hooks/           # Hook configurations (JSON)
├── scripts/hooks/   # Hook implementations (Node.js)
├── rules/           # Language rule sets (20 languages)
├── mcp-configs/     # MCP server configurations
├── mcp-server/      # clarc as an MCP server (8 tools)
├── .opencode/       # OpenCode commands and agent prompts
├── .cursor/         # Cursor rules (50+ language rule files)
├── codex/           # Codex CLI instructions and commands
├── tests/           # Structural evals, behavior evals, unit tests
└── install.sh       # Installer: --check, --target cursor/opencode/codex, --enable-learning
```

---

## Based on

clarc is a heavily extended fork of [everything-claude-code](https://github.com/affaan-m/everything-claude-code) by Affaan Mustafa, released under the MIT License.

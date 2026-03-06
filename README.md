# clarc

**A workflow OS for Claude Code.**
20 agents · 122 skills · 57 commands · 8 language rule sets · continuous learning flywheel.

---

clarc turns Claude Code from a coding assistant into a structured engineering system. It brings together agents that delegate work, skills that encode domain knowledge, commands that run repeatable workflows, hooks that automate the background, and a learning loop that improves itself over time.

---

## Install

```bash
git clone git@github.com:marvinrichter/clarc.git ~/.clarc
cd ~/.clarc

# Install common rules + your language(s)
./install.sh typescript
./install.sh typescript python golang

# Check if your installed rules are up to date
./install.sh --check
```

The installer copies rules into `~/.claude/rules/` while preserving the `common/` and language-specific directory structure so relative references stay valid.

---

## What's inside

| Component | Count | Purpose |
|-----------|------:|---------|
| **Agents** | 20 | Specialized subagents — delegate planning, review, testing, debugging |
| **Skills** | 122 | Domain knowledge — patterns, conventions, examples for specific tasks |
| **Commands** | 57 | Slash commands — repeatable workflows triggered by `/command` |
| **Rules** | 8 | Language rule sets — always-on coding standards and checklists |
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
| `product-evaluator` | Go/No-Go evaluation of new feature ideas |
| `solution-designer` | Generates 2–4 solution options with trade-off analysis |
| `refactor-cleaner` | Identifies and removes dead code safely |
| `doc-updater` | Keeps documentation in sync with code changes |

---

## Key commands

### Daily workflow

```
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
/slo           Define SLIs, SLOs, and error budget alerts
/instrument    Add analytics event tracking to code
/experiment    Design a statistically valid A/B test
/incident      Open and manage a production incident
/deps          Dependency audit and upgrade planner
/setup-ci      Generate GitHub Actions CI/CD pipeline
```

### Learning & evolution

```
/learn         Extract reusable patterns from the current session
/evolve        Promote instincts into permanent skills
/instinct-status   Show what the system has learned
/sessions      Browse session history and snapshots
```

---

## Skills

Skills are loaded on-demand when Claude detects they're relevant. They encode domain knowledge in a structured format: when to use, patterns, examples, anti-patterns.

**Language patterns:** TypeScript · Python · Go · Java · Rust · Swift · C++ · Django · Spring Boot · React Native · SwiftUI

**Architecture:** Hexagonal · DDD · Strategic DDD · API design · gRPC · GraphQL · WebSockets

**Data:** PostgreSQL · DuckDB · NoSQL · Redis/caching · dbt + Dagster · database migrations

**Testing:** TDD workflow · E2E (Playwright) · load testing · eval harness

**Ops:** Observability · Kubernetes · Terraform · CI/CD · Docker · deployment patterns · SLO workflow

**Product engineering:** Analytics workflow · experiment design · feature flags · A/B testing · compliance & audit logs · GDPR

**Team process:** OKRs · sprint planning · DORA metrics · roadmapping · working agreements

---

## Continuous learning flywheel

clarc gets better the more you use it. There are two learning mechanisms:

**Session learning** (`/learn`)
At the end of a session, extracts recurring patterns, friction points, and solved problems into instinct files. These become part of your personal context in future sessions.

**Instinct evolution** (`/evolve`)
Analyzes accumulated instincts and promotes stable, high-signal ones into permanent skills. Closes the loop from observation → codified knowledge.

**Weekly digest**
Every Monday, the notification hook summarizes what you learned in the past week — new instincts, promoted skills, recurring patterns.

**Pre-compact snapshots**
Before context compaction, clarc reads the session transcript and persists a structured snapshot: open tasks, touched files, recent exchanges. Nothing is lost between context resets.

---

## Language rules

Rules are always-on guidelines loaded into every session. They complement skills: rules define *what* to do, skills show *how*.

```
rules/
├── common/          # Universal — immutability, error handling, security checklist
├── typescript/      # TS/JS — strict typing, ESM, React patterns
├── python/          # PEP 8, type hints, async idioms
├── golang/          # Idiomatic Go, error wrapping, goroutines
├── swift/           # Swift 6, actors, value types
├── java/            # Spring Boot, JPA, hexagonal architecture
├── rust/            # Ownership, Result/Option, unsafe rules
└── cpp/             # C++17/20, RAII, smart pointers
```

---

## Multi-editor support

clarc ships configurations for multiple editors alongside the primary Claude Code integration:

- **Claude Code** — agents, skills, commands, hooks, rules (full support)
- **Cursor** — rules, agents, skills under `.cursor/`
- **OpenCode** — instructions and commands under `.opencode/`
- **Codex** — agent configuration under `.codex/`

---

## Structure

```
clarc/
├── agents/          # Subagent definitions (frontmatter + instructions)
├── skills/          # Domain knowledge skills (SKILL.md per topic)
├── commands/        # Slash commands (/tdd, /plan, /breakdown, ...)
├── hooks/           # Hook configurations (JSON)
├── scripts/hooks/   # Hook implementations (Node.js)
├── rules/           # Language rule sets
├── mcp-configs/     # MCP server configurations
├── tests/           # Structural evals and unit tests
└── install.sh       # Rule installer with --check support
```

---

## Based on

clarc is a heavily extended fork of [everything-claude-code](https://github.com/affaan-m/everything-claude-code) by Affaan Mustafa, released under the MIT License.

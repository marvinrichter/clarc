# Commands Reference

All clarc slash commands, organized by category. Run them in Claude Code by typing `/command-name`.

## Getting Started

| Command | What it does |
|---------|-------------|
| `/quickstart` | Guided tour for new users — recommends workflows for your task |
| `/clarc-way` | Interactive methodology guide — what to do for any task |
| `/doctor` | Health-check your clarc installation |
| `/find-skill` | Search all 228 skills by topic |

## The clarc Way Pipeline

| Command | Phase | What it does |
|---------|-------|-------------|
| `/idea` | 0 | Capture and structure a raw product idea |
| `/evaluate` | 0 | Go/No-Go evaluation before building |
| `/explore` | 0 | Generate 2–4 solution options with ADR |
| `/prd` | 0 | Write a Product Requirements Document |
| `/plan` | 1 | Implementation plan, waits for confirmation |
| `/tdd` | 2 | Enforce test-first development |
| `/code-review` | 3 | Language-specific quality review |
| `/security-review` | 3 | DevSecOps scan (OWASP, secrets, injection) |
| `/commit` | 4 | Conventional commit message |
| `/commit-push-pr` | 4 | Commit + push + open PR in one step |

## Daily Workflow

| Command | What it does |
|---------|-------------|
| `/verify` | Full quality loop — build + type-check + lint + test |
| `/build-fix` | Incrementally fix build and type errors |
| `/breakdown` | Break a feature into sprint-ready user stories |
| `/checkpoint` | Snapshot current session state |
| `/sessions` | Browse session history |

## Architecture & Engineering

| Command | What it does |
|---------|-------------|
| `/arc42` | Generate or update arc42 architecture documentation |
| `/onboard` | Generate CONTRIBUTING.md + architecture tour |
| `/setup-ci` | Generate GitHub Actions CI/CD pipeline |
| `/deps` | Dependency audit and upgrade planner |
| `/migrate` | Database migration workflow |
| `/slo` | Define SLIs, SLOs, and error budget alerts |
| `/resilience-review` | Failure mode analysis — circuit breakers, retries, timeouts, bulkheads |
| `/docs-strategy` | Documentation platform selection, Divio framework, CI pipeline design |
| `/contract-review` | API break detection — BREAKING/NON-BREAKING/ADDITIVE classification |

## Engineering Operations

| Command | What it does |
|---------|-------------|
| `/incident` | Open and manage a production incident |
| `/instrument` | Add analytics event tracking |
| `/experiment` | Design a statistically valid A/B test |
| `/dora-baseline` | Measure DORA Four Keys baseline |
| `/devex-survey` | Design a Developer Experience survey |

## Security & Compliance

| Command | What it does |
|---------|-------------|
| `/security-review` | Full DevSecOps scan |
| `/privacy-audit` | PII scan, retention, RTBF, consent |
| `/sbom` | Generate Software Bill of Materials + attestation |
| `/supply-chain-audit` | CI/CD pinning, unsigned artifacts, SLSA compliance |
| `/zero-trust-review` | Service mesh + mTLS review |
| `/gitops-review` | GitOps config — sync, secrets, drift |
| `/finops-audit` | Cloud cost audit |

## Visual Design

| Command | What it does |
|---------|-------------|
| `/brand-identity` | Develop a brand identity — color palette, typeface, voice, mood board |
| `/icon-system` | Icon library recommendation, tokens, component template, accessibility |
| `/wireframe` | ASCII wireframes, user flow diagrams, IA maps, structural audits |
| `/dark-mode-audit` | Audit dark mode — color strategy, elevation, contrast, common mistakes |
| `/design-critique` | Structured visual critique — hierarchy, color, typography, accessibility |
| `/a11y-audit` | Full accessibility audit — axe scan, keyboard, color contrast, ARIA |
| `/chart-review` | Review data visualizations — chart type, WCAG, responsive |
| `/visual-test` | Set up visual regression testing (Chromatic/Playwright/Percy) |
| `/storybook-audit` | Audit Storybook — coverage, CSF, accessibility, Chromatic integration |
| `/design-system-review` | Full design system audit — tokens, dark mode, icons, a11y, design-code consistency |
| `/slide-deck` | Generate slide deck structure (Reveal.js or Marp) |
| `/talk-outline` | Structured talk outline with time allocation and speaker notes |
| `/talk-review` | Presentation feedback — structure, timing, audience fit, narrative flow |

## Review Commands

| Command | What it does |
|---------|-------------|
| `/code-review` | Universal (routes to language specialist) |
| `/typescript-review` | TypeScript / JavaScript |
| `/go-review` | Go |
| `/python-review` | Python |
| `/java-review` | Java / Spring Boot |
| `/swift-review` | Swift / SwiftUI |
| `/rust-review` | Rust |
| `/ruby-review` | Ruby / Rails |
| `/elixir-review` | Elixir / Phoenix |
| `/database-review` | PostgreSQL schema + queries |

## Learning & Evolution

| Command | What it does |
|---------|-------------|
| `/learn-eval` | Extract patterns from the session (quality gate) |
| `/evolve` | Promote instincts into permanent skills |
| `/instinct-status` | Show what clarc has learned |
| `/skill-create` | Generate a skill from git history |
| `/sessions` | Browse session history and snapshots |

## Full List

Run `/find-skill` in Claude Code to search all commands by topic.
View all 176 commands in the `commands/` directory of the clarc repository.

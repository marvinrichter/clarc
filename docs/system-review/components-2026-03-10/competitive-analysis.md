# clarc Competitive Analysis — 2026-03-10

**Research date:** 2026-03-10
**Analyzed against:** Cursor, GitHub Copilot, Windsurf/Codeium, Aider, Devin, Continue.dev

---

## clarc Component Summary

| Component | Count | Details |
|---|---|---|
| Agents | 61 | Specialist delegation agents, orchestration, review pipeline |
| Skills | 228 | On-demand knowledge library, 20+ domains |
| Commands | 160 | User-invocable slash commands with agent delegation |
| Rules | 20 language sets | Common inheritance + language-specific overrides |
| Hook Scripts | 15+ | auto-format (7 langs), auto-checkpoint, TDD guard, security nudge, build failure router, learning observer, secret guard |
| Hook Event Types | 7 | SessionStart, PreToolUse, PostToolUse (4 matchers), PreCompact, Stop, SessionEnd, Notification |
| CI Scripts | 5 | clarc-review.js, clarc-security.js, validate-rule-format.js, validate-skill-quality.js, validate-agent-skill-refs.js |
| MCP Tools | 8 | get_instinct_status, get_session_context, get_project_context, skill_search, agent_describe, rule_check, get_component_graph, get_health_status |

---

## Competitor Profiles (March 2026)

### Cursor
- Rule system: `.cursor/rules/` MDC files with YAML frontmatter, file-pattern auto-activation
- Agents: Composer + Background Agents (up to 8 parallel, remote git worktrees, async PR generation)
- MCP: Full support; Team Marketplace launched March 3 2026
- Multi-IDE: VS Code-based + JetBrains via ACP

### GitHub Copilot
- Instructions: `.github/copilot-instructions.md` (repo-wide), path-scoped `.instructions.md` files, `AGENTS.md` (August 2025)
- Modes: Agent Mode (multi-file editing, test execution), Coding Agent (autonomous PR creation)
- Extensions: Rich extension ecosystem

### Windsurf (acquired by Cognition AI late 2025)
- Agent: Cascade (Code + Chat modes, up to 25 tool calls/prompt, tracks edits/terminal/clipboard/browser)
- Instructions: Persistent Rules files, auto-generated Memories, Reusable Workflows
- MCP: Full support with one-click curated server setup

### Aider
- Configuration: `.aider.conf` + conventions files (community-contributed)
- Context: RepoMap — tree-sitter parsing + PageRank + token budgeting
- Modes: /architect, /code, /ask
- Models: Any provider (OpenAI, Anthropic, Ollama, etc.)
- Open source: Yes (MIT)

### Devin (Cognition AI)
- Knowledge: Playbooks (team-shared markdown, Slack !macro), Knowledge Graph (enterprise)
- Integrations: Slack, Linear, Jira, GitHub
- Autonomy: Full browser + terminal, opens PRs for review
- Pricing: ~$500/month per seat

### Continue.dev
- Configuration: `config.yaml`
- Context: Context Providers (@codebase, @docs, @web, @terminal, @files, @git)
- MCP: Full support — any MCP server contributes tools, slash commands, context items
- IDEs: VS Code + JetBrains
- Open source: Yes (Apache 2.0)

---

## Feature Matrix

| Feature | clarc | Cursor | Copilot | Windsurf | Aider | Devin | Continue |
|---------|-------|--------|---------|----------|-------|-------|---------:|
| Language-specific rules | **Full** — 20 lang sets, common inheritance | Full — MDC with path patterns | Partial — single file + path-scoped | Partial — global Rules + Memories | Partial — community conventions | Partial — flat knowledge docs | None |
| Agent delegation | **Full** — 61 agents, auto-activation, orchestrator pattern | Partial — Composer + Background Agents | Partial — Agent Mode, Coding Agent | Partial — Cascade single agent | None | Full — autonomous agent | None |
| Skill/knowledge library | **Full** — 228 on-demand skills | None | None | Partial — auto-generated Memories + Workflows | None | Partial — Knowledge Graph (enterprise) | Partial — Context Providers |
| Learning loop | **Full** — observe→instinct→promote→evolve→decay | None | None | Partial — auto-generated Memories (opaque) | None | None | None |
| Hook system | **Full** — 7 event types, 15+ scripts | None | None | None | None | None | None |
| Slash commands | **Full** — 160 rich commands with agent delegation | Partial — basic slash commands | Partial | Partial — Workflow invocation | Partial — mode switches | None | Partial — prompt files |
| MCP integration | **Full** — outbound client + inbound MCP server (exposes clarc state) | Full — MCP client, Team Marketplace | Partial — Extensions | Full — one-click setup | None | None | Full — MCP client |
| Multi-IDE support | Partial — Claude Code primary; Cursor bridge via /cursor-setup | Partial — VS Code + JetBrains | Full — VS Code, JetBrains, Vim, GitHub.com | Partial — Windsurf IDE only | Full — any terminal | None — web/Slack only | Full — VS Code + JetBrains |
| Team sync | Partial — git-based instinct sync | Full — Team Marketplace | Full — .github/ in repo | None — user-local | None | Full — Playbooks via Slack | Partial — config.yaml in repo |
| Self-review | **Full** — /system-review, /agent-review, /skill-depth, /command-audit, /hook-audit | None | None | None | None | None | None |
| CI integration | **Full** — headless PR review + security scan | None | Partial — Copilot Code Review in PR UI | None | None | None | None |
| Product lifecycle | **Full** — /idea→/evaluate→/explore→/prd→/plan→/tdd→commit | None | None | None | None | None | None |
| Open source | **Full** — MIT, npx install, symlink-based | None (proprietary) | None | None (Cognition-owned) | Full — MIT | None (SaaS) | Full — Apache 2.0 |
| TDD enforcement | **Full** — tdd-guide agent (proactive), tdd-sequence-guard hook, 80% coverage rule | None | None | None | None | None | None |
| Secret guard | **Full** — pre-bash secret guard (exit 2 on git commit with secrets) | None | None | None | None | None | None |
| Autonomous/overnight | Partial — local worktrees, 4 patterns | Full — remote cloud, async, parallel | Partial — issue-to-PR async | Partial — multi-step synchronous | None | Full — truly autonomous (browser, 24/7) | None |

---

## clarc-Unique Capabilities

Seven capabilities no competitor offers in comparable form:

### 1. Self-Improving Learning Flywheel
Captures tool use via observe.sh (PostToolUse hook), creates atomic instincts with confidence scores, promotes them via /promote, clusters into evolved skills/commands/agents via /evolve, decays stale instincts weekly, syncs across team via YAML git-diff-friendly format. Fully user-controllable, open, and composable.

### 2. System Self-Review
/system-review full orchestrates five specialized analysis agents to produce a priority matrix of clarc's own quality gaps. No competitor can audit its own component quality.

### 3. Structured Product Discovery Methodology
8-stage pipeline: /idea → /evaluate (Go/No-Go) → /explore (options + ADR) → /prd → /plan → /tdd → /code-review → commit. Only tool embedding a full product management workflow as AI-native methodology.

### 4. TDD Enforcement at the Hook Level
post-edit-workflow-nudge.js detects source file modification without a test counterpart. tdd-guide agent is PROACTIVELY invoked. common/testing.md mandates 80% coverage. No competitor enforces test-first development.

### 5. Dual MCP Role (Client + Server)
Operates as MCP client (connects to external servers) AND as MCP server (exposes 8 clarc-state tools). Other agents in other tools can query clarc's state via MCP. No competitor exposes its internals as an MCP server.

### 6. Cross-Tool Rules Bridge
/cursor-setup installs clarc's 20-language rule library into Cursor's .cursor/rules/ MDC format. clarc treats Cursor as a deployment target for its rules.

### 7. Production-Grade CI Validators
Ships GitHub Actions-compatible CI scripts: headless PR code review, security scan, rule format validator, skill quality validator, agent-skill ref validator. No competitor ships AI-powered CI scripts as part of the workflow OS.

---

## Competitive Gaps (Prioritized)

| Gap | Best Competitor | Priority | Build Effort |
|-----|----------------|---------|--------------|
| Repomap / automatic code graph | Aider (tree-sitter + PageRank) | **P1** | MEDIUM |
| Slack/Linear/Jira integration | Devin | **P1** | MEDIUM |
| Remote/cloud background agents | Cursor (8 parallel, remote worktrees) | P2 | HIGH |
| Hosted team knowledge marketplace | Cursor Team Marketplace, Devin | P2 | HIGH |
| /mcp-setup with curated registry | Windsurf one-click setup | P2 | LOW |
| @-mention shorthands for skills | Continue.dev @-mentions | P2 | LOW |
| Multi-model flexibility | Aider (any provider) | P3 | LOW |
| Auto-promote high-confidence instincts | — | P3 | LOW |

---

## Market Positioning Opportunities

### "The Methodology Layer" (vs. Cursor/Copilot/Windsurf)
Cursor, Copilot, and Windsurf make AI coding faster. clarc makes AI coding disciplined. The clarc-way — idea validation, TDD enforcement, code review gates, security nudges, product lifecycle — appeals to teams that care about process quality, not just velocity. **"Not just AI coding. AI engineering."**

### "The Open Alternative" (vs. Devin)
Devin charges $500+/month. clarc is free (Claude API costs only), open source, user-controlled. clarc's overnight pipeline + agent orchestrator + product lifecycle covers 70% of Devin's use cases at zero tool cost.

### "The Rules OS" (vs. everyone)
The only tool shipping production-grade, per-language, layered coding standards as an installable library. 20 language rule sets with common inheritance, formatter integration, security checklists, and CI validators. Can power Cursor via /cursor-setup.

### "The Learning Company" (vs. everyone)
The only AI coding tool that gets better over time based on your team's actual work. Instincts from sessions become skills, then agent overlays, then shared team knowledge. **"The AI coding workflow that learns from you."**

---

## Recommended Backlog Items

1. **Repomap skill + session-start enrichment** — P1. Build a `repomap` skill that runs tree-sitter analysis at session start and injects a compact code graph into context. Effort: MEDIUM (~2 weeks).
2. **Slack/Linear webhook command** — P1. Build `/slack-notify` and `/linear-create` commands backed by MCP servers. Effort: MEDIUM (~1 week each).
3. **/mcp-setup command with curated registry** — P2. Curated list of useful MCP servers with one-command install. Effort: LOW (~3 days).
4. **Auto-promote high-confidence instincts** — P3. Weekly cron auto-promotes instincts above 90% confidence. Reduces flywheel friction. Effort: LOW (~2 days).
5. **@-mention shorthands for skills** — P2. Session-start hook registers @skill-name aliases. As ergonomic as Continue.dev's @-mentions. Effort: LOW (~2 days).

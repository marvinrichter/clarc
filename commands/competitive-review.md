---
description: Compare clarc against competing AI engineering workflow systems (Cursor, Copilot, Windsurf, Aider, Devin, Continue.dev) — feature matrix, clarc-unique capabilities, and prioritized competitive gaps. Produces a strategic analysis report.
---

# Competitive Review

Invoke the **workflow-os-competitor-analyst** agent to benchmark clarc against the competitive landscape.

## Usage

```
/competitive-review              — full analysis vs. all 6 competitors
/competitive-review cursor       — focus on Cursor comparison
/competitive-review copilot      — focus on GitHub Copilot
/competitive-review windsurf     — focus on Windsurf
/competitive-review aider        — focus on Aider
/competitive-review devin        — focus on Devin
/competitive-review continue     — focus on Continue.dev
```

## Competitors Analyzed

| Tool | What it is |
|------|-----------|
| **Cursor** | AI-first IDE with `.cursor/rules/`, Composer, Background Agents |
| **GitHub Copilot** | GitHub-integrated coding assistant with `copilot-instructions.md` |
| **Windsurf** | AI IDE with Cascade multi-step agents, Knowledge Docs |
| **Aider** | CLI coding assistant with conventions files and git integration |
| **Devin** | Autonomous software engineer with Playbooks and Knowledge Docs |
| **Continue.dev** | Open-source VS Code extension with Context Providers and custom commands |

## Feature Matrix (Sample)

| Feature | clarc | Cursor | Copilot | Windsurf | Aider | Devin | Continue |
|---------|-------|--------|---------|---------|-------|-------|---------|
| Language-specific rules | ✅ | ✅ | ❌ | ❌ | 🟡 | ❌ | ❌ |
| Agent delegation | ✅ | 🟡 | 🟡 | ❌ | ❌ | ✅ | ❌ |
| Learning loop | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Hook automation | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Self-review system | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

(Agent researches current state — matrix in report will be up-to-date)

## Output

Results saved to `docs/system-review/competitive-analysis-YYYY-MM-DD.md`.

Structure:
1. Executive Summary (top 3 clarc strengths, top 3 gaps)
2. Feature Matrix (full, with current research)
3. clarc-Unique Capabilities (what no competitor has)
4. Prioritized Gaps (user pain × build effort)
5. Recommended Backlog Items

## Steps Claude Should Follow

1. **Read clarc inventory**: Count agents, commands, skills, rules, hooks for context
2. **Launch workflow-os-competitor-analyst**: With `--all` or the specified competitor
3. **Display executive summary**: Top strengths and gaps inline
4. **Save full report**: To `docs/system-review/competitive-analysis-YYYY-MM-DD.md`
5. **Suggest roadmap items**: Add top P0 gaps to memory for next roadmap planning

## After This

- `/discover` — discover product opportunities from competitive gaps
- `/brainstorm` — brainstorm features to address identified gaps

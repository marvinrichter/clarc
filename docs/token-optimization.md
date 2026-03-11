# Token Optimization Guide

Practical settings and habits to reduce token consumption, extend session quality, and get more work done within daily limits.

> See also: `rules/common/performance.md` for model selection strategy, `skills/strategic-compact/` for automated compaction suggestions.

---

## Recommended Settings

These are recommended defaults for most users. Power users can tune values further based on their workload — for example, setting `MAX_THINKING_TOKENS` lower for simple tasks or higher for complex architectural work.

Add to your `~/.claude/settings.json`:

```json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50",
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku"
  }
}
```

### What each setting does

| Setting | Default | Recommended | Effect |
|---------|---------|-------------|--------|
| `model` | opus | **sonnet** | Sonnet handles ~80% of coding tasks well. Switch to Opus with `/model opus` for complex reasoning. ~60% cost reduction. |
| `MAX_THINKING_TOKENS` | 31,999 | **10,000** | Extended thinking reserves up to 31,999 output tokens per request for internal reasoning. Reducing this cuts hidden cost by ~70%. Set to `0` to disable for trivial tasks. |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 95 | **50** | Auto-compaction triggers when context reaches this % of capacity. Default 95% is too late — quality degrades before that. Compacting at 50% keeps sessions healthier. |
| `CLAUDE_CODE_SUBAGENT_MODEL` | _(inherits main)_ | **haiku** | Subagents (Task tool) run on this model. Haiku is ~80% cheaper and sufficient for exploration, file reading, and test running. |

### Toggling extended thinking

- **Alt+T** (Windows/Linux) or **Option+T** (macOS) — toggle on/off
- **Ctrl+O** — see thinking output (verbose mode)

---

## Model Selection

Use the right model for the task:

| Model | Best for | Cost |
|-------|----------|------|
| **Haiku** | Subagent exploration, file reading, simple lookups | Lowest |
| **Sonnet** | Day-to-day coding, reviews, test writing, implementation | Medium |
| **Opus** | Complex architecture, multi-step reasoning, debugging subtle issues | Highest |

Switch models mid-session:

```
/model sonnet     # default for most work
/model opus       # complex reasoning
/model haiku      # quick lookups
```

---

## Context Management

### Commands

| Command | When to use |
|---------|-------------|
| `/clear` | Between unrelated tasks. Stale context wastes tokens on every subsequent message. |
| `/compact` | At logical task breakpoints (after planning, after debugging, before switching focus). |
| `/cost` | Check token spending for the current session. |

### Strategic compaction

The `strategic-compact` skill (in `skills/strategic-compact/`) suggests `/compact` at logical intervals rather than relying on auto-compaction, which can trigger mid-task. See the skill's README for hook setup instructions.

**When to compact:**
- After exploration, before implementation
- After completing a milestone
- After debugging, before continuing with new work
- Before a major context shift

**When NOT to compact:**
- Mid-implementation of related changes
- While debugging an active issue
- During multi-file refactoring

### Subagents protect your context

Use subagents (Task tool) for exploration instead of reading many files in your main session. The subagent reads 20 files but only returns a summary — your main context stays clean.

---

## MCP Server Management

Each enabled MCP server adds tool definitions to your context window. The README warns: **keep under 10 enabled per project**.

Tips:
- Run `/mcp` to see active servers and their context cost
- Prefer CLI tools when available (`gh` instead of GitHub MCP, `aws` instead of AWS MCP)
- Use `disabledMcpServers` in project config to disable servers per-project
- The `memory` MCP server is configured by default but not used by any skill, agent, or hook — consider disabling it

---

## Budget Controls

clarc includes an active budget-guard system to prevent surprise bills.

### Environment variables

```bash
export CLAUDE_COST_WARN=5        # warn (stderr) before Agent calls if daily spend > $5
export CLAUDE_BUDGET_LIMIT=20    # block Agent calls if daily spend > $20 (0 = disabled)
```

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`) or `~/.claude/settings.json` under `"env"`.

### How it works

The `budget-guard` PreToolUse hook fires before every Agent tool call. It reads today's accumulated cost from `~/.clarc/cost-log.jsonl` and warns or blocks based on the thresholds above. Estimates are heuristic (±50–100%). Ground-truth: `console.anthropic.com`.

### Per-response cost footer

The `response-dashboard` Stop hook shows a summary after each response:

```
────────────────────────────────────────────────────────
 tools: Read×5  Edit×3  Bash×2  Agent×1
 agents: typescript-reviewer [sonnet]
 cost:  ~$0.08  ·  ~9.5k tokens (est.)
────────────────────────────────────────────────────────
```

Disable: `CLARC_RESPONSE_DASHBOARD=false` or in `.clarc/hooks-config.json`:
```json
{ "response_dashboard": false }
```

---

## Per-Tool Cost Awareness

Not all tools cost the same. Agent calls are 20–40× more expensive than a Grep:

| Tool | Est. input tokens | Notes |
|---|---|---|
| Grep / Glob | 200–300 | Search results are small |
| Bash | 400 | Short command output |
| Read | 1,500 | Full file content into context |
| Edit / Write | 500–600 | Diff + confirmation |
| WebFetch | 2,000 | Web page content |
| **Agent** | **8,000** | Full sub-context initialization |

**Rule:** Before spawning an Agent, ask: can Grep + Read answer this instead?

### Haiku for cheap subtasks

The `summarizer-haiku` agent (10–15× cheaper than Sonnet) handles summarization, classification, boilerplate generation, and text extraction. Use it for any task that doesn't require reasoning — just text transformation.

---

## Agent Teams Cost Warning

[Agent Teams](https://code.claude.com/docs/en/agent-teams) (experimental) spawns multiple independent context windows. Each teammate consumes tokens separately.

- Only use for tasks where parallelism adds clear value (multi-module work, parallel reviews)
- For simple sequential tasks, subagents (Task tool) are more token-efficient
- Enable with: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings

---

## Quick Reference

```bash
# Daily workflow
/model sonnet              # Start here
/model opus                # Only for complex reasoning
/clear                     # Between unrelated tasks
/compact                   # At logical breakpoints
/cost                      # Claude Code native cost check
/session-cost              # clarc accumulated cost estimate (per-tool breakdown)

# Budget controls (add to shell profile or ~/.claude/settings.json env block)
CLAUDE_COST_WARN=5
CLAUDE_BUDGET_LIMIT=20
CLARC_RESPONSE_DASHBOARD=false   # disable per-response cost footer

# Token optimization settings
MAX_THINKING_TOKENS=10000
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50
CLAUDE_CODE_SUBAGENT_MODEL=haiku
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

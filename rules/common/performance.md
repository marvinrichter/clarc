# Performance Optimization

## Model Selection Strategy

**Claude Haiku** (fast/lightweight tier — ~3x cost savings vs Sonnet):
- Lightweight agents with frequent invocation
- Pair programming and code generation
- Worker agents in multi-agent systems

**Claude Sonnet** (balanced tier — default for coding):
- Main development work
- Orchestrating multi-agent workflows
- Complex coding tasks

**Claude Opus** (most capable tier — deepest reasoning):
- Complex architectural decisions
- Maximum reasoning requirements
- Research and analysis tasks

> Do not hardcode model version numbers (e.g. `claude-sonnet-4-6`) in rules, agents, or skills.
> Use tier names here; check [Anthropic API docs](https://docs.anthropic.com/api) for current model IDs.

## Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:
- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## Extended Thinking + Plan Mode

Extended thinking is enabled by default, reserving up to 31,999 tokens for internal reasoning.

Control extended thinking via:
- **Toggle**: Option+T (macOS) / Alt+T (Windows/Linux)
- **Config**: Set `alwaysThinkingEnabled` in `~/.claude/settings.json`
- **Budget cap**: `export MAX_THINKING_TOKENS=10000`
- **Verbose mode**: Ctrl+O to see thinking output

For complex tasks requiring deep reasoning:
1. Ensure extended thinking is enabled (on by default)
2. Enable **Plan Mode** for structured approach
3. Use multiple critique rounds for thorough analysis
4. Use split role sub-agents for diverse perspectives

## Budget Controls

Set these environment variables to prevent surprise bills:

```bash
export CLAUDE_COST_WARN=5       # Warn before Agent calls if daily spend > $5
export CLAUDE_BUDGET_LIMIT=20   # Block Agent calls if daily spend > $20 (0 = disabled)
```

The `budget-guard` hook enforces these limits automatically on every Agent tool call.
Check accumulated spend: `/session-cost`
Exact costs: console.anthropic.com

## Agent Overhead Awareness

Agent tool calls are the most expensive operation (8–10× more than a Grep call):

| Tool | Relative cost |
|---|---|
| Grep / Glob | 1× baseline |
| Read (typical file) | 3× |
| Bash | 1.5× |
| Edit / Write | 2× |
| **Agent** | **20–40×** |

Before spawning an Agent ask: can I accomplish this with Grep + Read instead?
For summarization, classification, or boilerplate → use `summarizer-haiku` (10–15× cheaper than Sonnet).

## Prompt Caching (for LLM app builders)

If building applications with the Anthropic API that repeat long system prompts:

```python
# Add cache_control to stable prompt sections (min 1024 tokens)
{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}
```

Cache TTL: 5 minutes. Savings: 90% discount on cached input tokens.
See skill `cost-aware-llm-pipeline` for full implementation patterns.

## Performance Checklist

Before selecting a model or starting a large task:
- [ ] Use Haiku (`summarizer-haiku`) for summaries, classification, boilerplate
- [ ] Use Sonnet for main development work (default)
- [ ] Use Opus only for complex architectural decisions
- [ ] Context window < 80% before starting large refactors
- [ ] Set `CLAUDE_COST_WARN` and `CLAUDE_BUDGET_LIMIT` if spending is a concern
- [ ] Check if task can use Grep/Read instead of spawning an Agent

## Build Troubleshooting

If build fails:
1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix

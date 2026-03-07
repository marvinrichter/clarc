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

## Build Troubleshooting

If build fails:
1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix

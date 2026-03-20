# Idea: Clarc Lazy Context Loading

**Date:** 2026-03-20
**Status:** CAPTURED
**Feature:** clarc-lazy-context-loading

## Problem Statement

Every clarc session starts by loading all agents, skills, commands, and rules into
context regardless of project type — consuming an estimated 136K tokens before the
user types a single message. On a 200K-token model, this leaves only 64K tokens for
actual work. Developers using clarc on large codebases hit context limits sooner and
pay more per session than necessary.

## Target User

**Who:** Developer using Claude Code + clarc on a TypeScript, Python, or Go project
**Job-to-be-done:** Get effective AI coding assistance without burning through context
budget on infrastructure overhead
**Frequency:** Every single session (daily for active users)
**Pain level:** Significant friction — context limits are hit faster, costly on large
refactors, and the overhead is invisible/non-obvious to users

## Current State

All 249 skill files (~75K tokens), 63 agent bodies, 178 commands, and all 20 language
rule sets are loaded at session start unconditionally. A TypeScript developer also loads
Go, Ruby, PHP, Rust, and 16 other language rule sets they will never use. Skills are
fully loaded even when no agent has been invoked yet.

## Proposed Solution

Implement lazy/filtered context loading across four mechanisms:

1. **Skill index** — Replace full skill body loading with a name + 1-line description
   index at session start. Load full skill body only when an agent that uses it is invoked.
2. **Language-filtered rules** — Use the existing language detection in session-start.js
   to load only `rules/common/` + the detected project language(s), skipping all others.
3. **Command index** — Load command metadata (name + 50-char description) at session
   start instead of full command bodies. Load body on invocation.
4. **Agent lazy bodies** — Defer parsing `uses_skills` from agent frontmatter until
   the agent is actually invoked, not at session start.

## Success Metrics

- [ ] Fresh session token overhead drops from ~136K to <40K tokens (70%+ reduction)
- [ ] A TypeScript project loads 0 non-TypeScript language rule sets
- [ ] Skills only appear in context after the first agent invocation that references them
- [ ] No regression in agent quality (skills still load correctly when needed)
- [ ] Measurable with a token counter test: `node tests/token-overhead.test.js`

## Assumptions

- [ ] Claude Code loads CLAUDE.md and rules into context from disk at session start (not
  cached between sessions in a way that avoids token cost)
- [ ] Skills referenced in `uses_skills` frontmatter are currently being injected into
  context — not just metadata pointers
- [ ] The session-start hook is the primary injection point for skill content
- [ ] Language detection in session-start.js is reliable enough (>90% accuracy) for
  safe rule filtering

## Open Questions

- [ ] Does Claude Code have a native mechanism for on-demand context injection, or does
  lazy loading require a custom tool call pattern?
- [ ] What happens when a skill is needed mid-session — is there a hook for "agent invoked"
  that can trigger a context injection?
- [ ] Should there be a `--full-context` flag for users who want the current behavior?
- [ ] How do we test token overhead in CI to prevent regressions?

## Out of Scope (initial thoughts)

- Compressing or rewriting skill/agent content for brevity (separate idea)
- Changing the Claude Code protocol or adding MCP tools to support lazy loading
- Changing how users install clarc (install.sh already handles language selection)
- Any changes to the actual skill/agent/rule content quality

## Notes

Based on token analysis conducted 2026-03-20:
- Current estimated overhead: ~136K tokens/fresh session
- Target: <40K tokens/fresh session
- Biggest wins: defer skill loading (~75K), command index (~15K), language rules (~8K)
- Key files: `scripts/hooks/session-start.js`, `scripts/hooks/context-banner.js`,
  `agents/*.md` (uses_skills), `rules/` (language filter)
- The explore agent estimated 65–75% token reduction is achievable through lazy loading
  alone without changing any content quality

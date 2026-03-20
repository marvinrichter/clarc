# Evaluation: Clarc Lazy Context Loading

**Date:** 2026-03-20
**Evaluator:** product-evaluator agent
**Idea:** docs/ideas/2026-03-20-clarc-lazy-context-loading.md

## Summary

The idea proposes lazy/filtered context loading to reduce clarc's session-start token overhead from ~136K to <40K tokens. Research reveals that Claude Code already implements progressive disclosure natively for skills (metadata-only at startup, body on invocation), agents (description-only at startup, body in separate context window on invocation), and commands (name-only at startup, body on invocation). The core premise -- that all 249 skill files, 63 agent bodies, and 178 command bodies are loaded into the main context window at session start -- appears to be incorrect. The actual token overhead from clarc is likely dominated by rules (~8-20K tokens for all language rule sets) and the session-start hook output (~3-6K), not by skills, agents, or commands.

## Problem Assessment

**Is the problem real?**
Partially. Context window efficiency is a real concern for Claude Code users, especially on large codebases. However, the idea's core assumption -- that clarc consumes ~136K tokens at session start -- is almost certainly wrong. Claude Code's native architecture already handles lazy loading for the three largest categories (skills, agents, commands). The actual overhead from clarc is primarily:
1. Rules in `~/.claude/rules/` -- ALL `.md` files are loaded at session start by Claude Code natively. Clarc installs `common/` plus detected language rule sets. If all 20 language sets are installed, this is wasteful but likely ~8-20K tokens, not 75K+.
2. Session-start hook output -- injects previous session context, repomap, memory bank, agent instincts, and local skills via `stdout`. Capped at ~3K for session context, ~3K for repomap, ~6K for memory bank, and variable for instincts.
3. CLAUDE.md itself -- always loaded, ~2-4K tokens.

The 136K figure likely comes from counting raw file sizes of all skills, agents, and commands on disk, not from measuring what Claude Code actually loads into the main context window.

**Who has this problem?**
Developer using clarc who has installed ALL 20 language rule sets (instead of just their project languages). This is a self-inflicted problem -- `install.sh` already supports language-specific installation and auto-detection.

**How urgent is it?**
Low-to-moderate. Users who properly installed clarc with only their project languages already have a lean rule set. The session-start hook output is capped and filtered. The real pain point (if any) is users who ran `install.sh` without language args and got everything.

**Gaps in problem definition:**
- The 136K token estimate is not validated by actual measurement. No `/context` output or API token count is cited.
- The assumption that skills, agents, and commands are fully loaded at session start contradicts Claude Code's documented architecture.
- No distinction between tokens in the main context window vs. tokens in subagent context windows (agents run in isolated context).
- No user interviews or support tickets cited as evidence of the problem.

## Alternatives Research

| Alternative | Pros | Cons | Verdict |
|-------------|------|------|---------|
| **Do nothing (status quo)** | Claude Code already lazy-loads skills/agents/commands natively. Install.sh already supports language filtering. | Rules are still all-or-nothing once installed. | Mostly sufficient already |
| **Audit and prune rules** | Reduce token count by making rules more concise or using `globs` frontmatter for conditional loading. Zero code change needed. | Requires content review effort. | Worth evaluating -- low effort, high impact |
| **Use `globs` frontmatter on language rules** | Claude Code natively supports conditional rules via `globs` frontmatter -- rules only load when editing matching files. Already in Claude Code, zero custom code. | Requires adding frontmatter to each language rule file. | Best option -- uses native mechanism |
| **Uninstall unused language rules** | `install.sh --uninstall` + reinstall with correct languages. Immediate fix. | Requires user action. | Already available |
| **Custom lazy loading via session-start hook** | Full control over what loads when. | Fighting Claude Code's native architecture. Skills/agents/commands are already lazy. Rules are loaded by Claude Code, not by hooks -- cannot intercept. | Not suitable |

**Existing solutions assessment:**
Claude Code already provides the key mechanisms:
1. **Skills**: Progressive disclosure -- ~100 tokens of metadata per skill at startup, full body on invocation via `bash cat SKILL.md`.
2. **Agents**: Name + description in system prompt at startup, body becomes the subagent's own system prompt in a separate context window on invocation.
3. **Commands**: Name + description at startup, body loaded on invocation.
4. **Rules**: `globs` frontmatter allows conditional loading -- rules only activate when editing files matching the pattern.
5. **`/context` command**: Shows actual token breakdown so users can diagnose what is consuming space.

The proposed solution would largely re-implement what Claude Code already does natively.

## Feasibility Assessment

**Complexity:** Medium (but moot -- most of the work is unnecessary)

**Estimated effort:** 2-3 weeks if built as described, but the resulting system would fight Claude Code's native loading mechanism rather than leverage it.

**Key risks:**
- Building custom lazy loading for skills/agents/commands that Claude Code already lazy-loads natively would add complexity with no benefit.
- Rules loading is handled by Claude Code itself (it reads `~/.claude/rules/` directly). The session-start hook cannot intercept or filter this -- there is no hook for "before rules are loaded."
- The "skill index" mechanism described in the idea already exists natively in Claude Code (metadata in system prompt, body loaded on invocation).

**Unknowns:**
- Exact token count of clarc's actual contribution to context. Running `/context` at session start would answer this definitively.
- Whether the `globs` frontmatter approach works well enough for language-specific rules (e.g., `globs: ["**/*.ts", "**/*.tsx"]` on TypeScript rules).

## Scoring

| Dimension | Score | Reason |
|-----------|-------|--------|
| Problem Clarity | 2/5 | The 136K estimate is unvalidated and likely incorrect. The idea conflates on-disk file size with in-context token count. |
| User Fit | 3/5 | Real user exists (clarc power user on large codebase), but the pain is less severe than described. |
| Solution Fit | 2/5 | Three of four proposed mechanisms (skill index, command index, agent lazy bodies) re-implement what Claude Code already does natively. |
| Feasibility | 2/5 | Rules loading cannot be intercepted by hooks. The session-start hook has no control over when Claude Code reads `~/.claude/rules/`. |
| Differentiation | 1/5 | Claude Code already implements progressive disclosure for skills, agents, and commands. |
| Opportunity Cost | 3/5 | 2-3 weeks that could go toward content quality, new agents, or learning flywheel improvements. |
| **Total** | **13/30** | |

## Recommendation

### NO-GO

**Reason:**
The core premise is wrong. Claude Code already implements lazy loading for skills (metadata at startup, body on invocation), agents (description at startup, body in separate context window), and commands (name at startup, body on invocation). Three of the four proposed mechanisms would re-implement existing native behavior. The fourth (language-filtered rules) cannot be implemented via hooks because Claude Code reads `~/.claude/rules/` directly before any hook runs.

The 136K token estimate appears to be a raw file-size calculation, not an actual measurement of context window usage. Running `/context` at a fresh session start would likely show clarc's actual overhead is 15-30K tokens (rules + session-start hook output), not 136K.

**What to do instead:**

1. **Validate the actual overhead.** Run `/context` at the start of a fresh clarc session and record the real token breakdown. This takes 5 minutes and would either confirm or refute the 136K claim.
2. **Add `globs` frontmatter to language-specific rules.** This uses Claude Code's native conditional loading mechanism. For example, add `globs: ["**/*.ts", "**/*.tsx"]` to TypeScript rules so they only load when editing TypeScript files. Estimated effort: 1-2 hours.
3. **Document the "install only your languages" workflow.** Make sure `/quickstart` and the README clearly guide users to install only the language rule sets they need, rather than all 20. This is already supported by `install.sh` but may not be obvious.
4. **Trim session-start hook output.** Review whether the repomap, memory bank, agent instincts, and local skills output from the session-start hook can be further compressed. This is the one area where clarc actually controls what enters the context window.

## Open Questions

Questions to answer before reconsidering this idea:
- [ ] What does `/context` actually show at session start for a typical clarc user? Get real numbers.
- [ ] How many tokens do the installed rules (common + 1 language) actually consume?
- [ ] Does adding `globs` frontmatter to language rules effectively filter them from loading?
- [ ] Are there users who have reported hitting context limits specifically because of clarc overhead?
- [ ] What is the token cost of the session-start hook output (repomap + memory bank + instincts)?

## Research Sources

- [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)
- [Extend Claude with skills](https://code.claude.com/docs/en/skills)
- [Claude Code Context Buffer: The 33K-45K Token Problem](https://claudefa.st/blog/guide/mechanics/context-buffer-management)
- [Claude Code Rules Directory](https://claudefa.st/blog/guide/mechanics/rules-directory)
- [Claude Skills: A Technical Deep-Dive into Context Injection Architecture](https://medium.com/data-science-collective/claude-skills-a-technical-deep-dive-into-context-injection-architecture-ee6bf30cf514)
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Context Optimization: 54% reduction](https://gist.github.com/johnlindquist/849b813e76039a908d962b2f0923dc9a)
- [Inside Claude Code Skills: Structure, prompts, invocation](https://mikhail.io/2025/10/claude-code-skills/)
- [Claude Code system prompts repository](https://github.com/Piebald-AI/claude-code-system-prompts)

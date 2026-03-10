# Pre-Launch Hardening

**Status:** 🔄 In Progress
**Date:** 2026-03-10
**Goal:** Close all remaining P0/P1 issues from the March-10 system reviews before v1.0 — hooks security, stale config paths, agent examples, command naming, and skill cleanup.

## Problem Statement

After completing the skill-content-depth roadmap (PRs #24–#26), the following P0/P1 issues from the morning and post-Sprint-5 system reviews remain open:

- **P0-B**: `auto-checkpoint.js` uses `--no-verify`, bypassing the secret guard hook. Secrets committed via auto-checkpoint enter git history unscanned.
- **P0-D**: `evaluate-session.js` reads `skills/continuous-learning/config.json` (pre-v2 path). Silent failure — config is never found.
- **P0-H2**: `format-dispatch.js` calls `process.exit(0)` unconditionally — `exitCode=1` on formatter failure is silently swallowed.
- **P1-B**: `security-scan-nudge` matches filenames, not content. No cooldown. False positives on every edit of `session-end.js`, `auth-utils.ts`, etc.
- **P1-C**: 52/61 agents have `example_density: 7` (1 example). Need ≥2 examples per agent per `agent-format.md`.
- **P1-D**: Command `agent-review` breaks the `*-audit` naming pattern used by 9 other audit commands.
- **P1-E**: `deps`/`dep-audit` (~60% overlap) and `discover`/`brainstorm` (~70% overlap) have no cross-references.
- **P1-G**: `e2e-testing` and `security-review` skills contain Solana/Web3 domain-specific content with no relevance to general engineering.
- **P1-H**: `tdd-workflow` skill references GitHub Actions v3 (deprecated, now v4).
- **P1-I**: `observe.sh` uses `set -e` with no error trap. Silent failure if Python3 is missing.

## Open Items

### H1 — Hook security & reliability

- **P0-B**: Add `scanForSecrets()` inside `auto-checkpoint.js` before any `git commit`. Reuse the existing secret patterns from `pre-bash-dispatch.js` (AWS AKIA keys, GH tokens, PEM headers, Slack xox\*, api_key/token=…). If secrets found: abort commit, print warning, exit 2.
- **P0-H2**: Fix `format-dispatch.js` — change final `process.exit(0)` → `process.exit(exitCode)` so formatter failures are surfaced.
- **P1-B**: Fix `post-edit-workflow-nudge.js` security-scan nudge: trigger on file content (`/api_key|password|secret|token/i`) not filename; add 30-min cooldown (reuse nudge-cooldown pattern).
- **P1-I**: Fix `observe.sh`: wrap body in `|| true` after `set -e`, or add `trap 'exit 0' ERR` so missing Python3 doesn't silently abort the hook.

### H2 — Config & dead paths

- **P0-D**: Fix `evaluate-session.js` line reading `skills/continuous-learning/config.json` → `skills/continuous-learning-v2/config.json`.

### H3 — Skill cleanup

- **P1-G**: Delete Solana/Web3 sections from `skills/e2e-testing/SKILL.md` and `skills/security-review/SKILL.md`.
- **P1-H**: Update `skills/tdd-workflow/SKILL.md`: replace all `actions/checkout@v3` → `v4`, `actions/setup-node@v3` → `v4`.

### H4 — Command naming & cross-references

- **P1-D**: Rename command `commands/agent-review.md` → `commands/agent-audit.md`. Update all references (README, docs/hub, docs/wiki/agents-reference.md, any skills/commands referencing it).
- **P1-E**: Add `> See also: dep-audit` to `commands/deps.md` and vice versa. Add `> See also: brainstorm` to `commands/discover.md` and vice versa.

### H5 — Agent examples (large batch)

- **P1-C**: Add a second `## Examples` entry to all agents currently at `example_density: 7`. Target: 45 agents, each needs 1 additional example covering a different use case or language.

## Issue Tracker

| ID | Item | Status |
|----|------|--------|
| H1-P0-B | auto-checkpoint scanForSecrets | ⬜ |
| H1-P0-H2 | format-dispatch exitCode fix | ⬜ |
| H1-P1-B | security-scan-nudge content + cooldown | ⬜ |
| H1-P1-I | observe.sh error trap | ⬜ |
| H2-P0-D | evaluate-session.js config path | ⬜ |
| H3-P1-G | Remove Solana/Web3 from 2 skills | ⬜ |
| H3-P1-H | tdd-workflow GH Actions v3 → v4 | ⬜ |
| H4-P1-D | agent-review → agent-audit rename | ⬜ |
| H4-P1-E | deps/dep-audit + discover/brainstorm cross-refs | ⬜ |
| H5-P1-C | ## Examples: 45 agents | ⬜ |

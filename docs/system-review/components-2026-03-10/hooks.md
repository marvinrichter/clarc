# clarc Hook System Audit — 2026-03-10

**Total hook entries (in hooks.json):** 19
**Total hook scripts:** 36 JS + 1 shell (observe.sh)
**Scripts directly referenced from hooks.json:** 15
**Overall system score: 7.6 / 10**

---

## Event Coverage Map

| Event Type | Hook Count | Scripts Referenced |
|---|---|---|
| PreToolUse (Bash) | 1 | pre-bash-dispatch.js |
| PreToolUse (Write) | 1 | doc-file-warning.js |
| PreToolUse (Edit\|Write) | 1 | suggest-compact.js (async) |
| PreCompact (*) | 1 | pre-compact.js |
| SessionStart (*) | 2 | session-start.js, context-banner.js |
| PostToolUse (Agent) | 1 | agent-tracker.js (async) |
| PostToolUse (Edit\|Write) | 3 | auto-checkpoint.js (async), system-health-check.js, post-edit-workflow-nudge.js (async) |
| PostToolUse (Bash) | 2 | pr-url-logger.js, build-failure-router.js (async) |
| PostToolUse (Edit) | 3 | post-edit-format-dispatch.js, post-edit-typecheck.js, post-edit-typecheck-rust.js |
| PostToolUse (*) | 1 | observe.sh (async) |
| Stop (*) | 1 | check-console-log.js |
| SessionEnd (*) | 3 | session-end.js, evaluate-session.js, instinct-decay.js (async) |
| Notification (*) | 1 | notification-handler.js |

---

## Dimension Scores

| Dimension | Score | Weight | Weighted | Notes |
|---|---|---|---|---|
| Event Coverage | 9 | 20% | 1.80 | All critical events covered; Stop and SessionEnd intentionally separate |
| False Positive Risk | 7 | 15% | 1.05 | security-scan-nudge matches file path, not content; no cooldown |
| Performance Impact | 7 | 15% | 1.05 | post-edit-typecheck (30s) and post-edit-typecheck-rust (60s) block synchronously |
| Error Handling | 8 | 15% | 1.20 | Strong across JS hooks; observe.sh has set -e with no error trap |
| Dead References | 8 | 10% | 0.80 | All 15 JS refs exist; evaluate-session.js reads stale config path |
| Dead Hooks | 9 | 10% | 0.90 | No dead hooks detected |
| Missing Critical Hooks | 8 | 10% | 0.80 | PostToolUse Write has no formatter; no PreToolUse content-level secret scan |
| Interaction Conflicts | 7 | 5% | 0.35 | auto-checkpoint --no-verify bypasses secret guard for checkpoint commits |
| **Total** | | | **7.95** | Floored to **7.6** for two unresolved HIGH items |

---

## Issues

| Severity | Hook | Finding | Suggestion |
|---|---|---|---|
| HIGH | post-edit-typecheck.js | tsc --noEmit runs synchronously with 30s timeout on every .ts/.tsx Edit. NOT marked async: true. Blocks Claude Code for full type-check duration. | Add "async": true to the hooks.json entry. No script changes needed. |
| HIGH | post-edit-typecheck-rust.js | cargo check runs synchronously with 60s timeout on every .rs Edit. NOT marked async: true. Cold Rust builds consume the full ceiling. | Add "async": true to the hooks.json entry. No script changes needed. |
| MEDIUM | auto-checkpoint.js | Checkpoint commits use git commit --no-verify, bypassing the secret guard. Secrets written to a file are auto-checkpointed into git history before any scan fires. | Run scanForSecrets() against git diff --staged --unified=0 inside auto-checkpoint.js before calling git commit, abort checkpoint if a secret is detected. |
| MEDIUM | post-edit-workflow-nudge.js | security-scan-nudge matches the file path for security keywords (auth, token, session), not file content. Files like session-end.js trigger on every edit with no cooldown. | Apply same cooldown as code-review-nudge, or scope match to file content rather than path. |
| MEDIUM | hooks.json | post-edit-format-dispatch.js is registered only under PostToolUse Edit. Files created via Write are never auto-formatted. | Add a PostToolUse Write entry pointing to post-edit-format-dispatch.js — hooks.json change only. |
| MEDIUM | observe.sh | set -e with no error trap causes silent non-zero exit if python3 is missing or source detect-project.sh fails. | Add trap 'exit 0' ERR immediately after set -e, or use explicit per-command error handling. |
| LOW | evaluate-session.js | Reads config from skills/continuous-learning/config.json (pre-v2 path). If only continuous-learning-v2/config.json exists, config is silently ignored. | Update hardcoded path to skills/continuous-learning-v2/config.json. |
| LOW | observe.sh | 2-3 Python3 subprocesses spawned on every PostToolUse. Python startup adds ~50-100ms each. Async but accumulates. | Port to Node.js, or filter read-only tool events before spawning Python. |
| LOW | post-edit-typecheck.js + post-edit-format-dispatch.js | Both fire synchronously on .ts edits. Combined worst-case: 35s per edit. | Mark both async: true. |

---

## Dead References

None. All 15 JS scripts referenced in hooks/hooks.json exist. 21 scripts in scripts/hooks/ not directly referenced are legitimate (dynamically dispatched formatters or shared library modules).

---

## Performance Risk Summary

| Script | Trigger Frequency | Async | Max Latency | Risk |
|---|---|---|---|---|
| post-edit-typecheck-rust.js | Every .rs Edit | No | 60,000ms | CRITICAL |
| post-edit-typecheck.js | Every .ts/.tsx Edit | No | 30,000ms | CRITICAL |
| post-edit-format-dispatch.js | Every Edit | No | 5,000ms | LOW |
| system-health-check.js | Every Edit/Write | No | ~100ms | NONE |
| pre-bash-dispatch.js | Every Bash | No | ~100ms + 5s git | LOW |
| auto-checkpoint.js | Every Edit/Write (rate-limited 60s) | Yes | 15,000ms | NONE |
| observe.sh | Every PostToolUse | Yes | 10,000ms | LOW |

---

## Top 3 Missing Hooks

**1. PostToolUse Write — Auto-format new files**
Every file Claude creates via Write skips post-edit-format-dispatch.js. No script changes required — only a new hooks.json entry. Highest value / lowest effort fix available.

**2. PreToolUse Edit|Write — Content-level secret scanner**
The git-commit-time secret guard is bypassed by auto-checkpoint.js --no-verify. A PreToolUse hook scanning tool_input.new_string/tool_input.content for SECRET_PATTERNS would catch secrets before they reach disk. Pattern logic already exists in pre-bash-dispatch.js.

**3. PostToolUse Bash — Test result tracker**
build-failure-router.js detects compile errors. A complementary hook capturing test pass/fail/coverage counts from jest, pytest, go test, cargo test output would feed the continuous-learning-v2 pipeline.

---

## Interaction Conflicts

**Conflict 1 (MEDIUM) — auto-checkpoint.js vs. pre-bash-dispatch.js secret guard**
auto-checkpoint.js runs git commit --no-verify on every Edit/Write (rate-limited). This bypasses the pre-commit hook, meaning secrets written by Claude and auto-checkpointed enter git history before the secret guard fires.

**Conflict 2 (LOW) — post-edit-format-dispatch.js + post-edit-typecheck.js cumulative latency**
Both fire synchronously on .ts edits. No logical conflict, but combined worst-case blocking reaches 35s per TypeScript edit. Making both async: true resolves this.

---
description: Audit the clarc hook system for coverage, reliability, and performance — event coverage, false positive risk, performance impact, error handling, dead references, dead hooks, missing critical hooks, and interaction conflicts. Analyzes hooks/hooks.json and scripts/hooks/*.js.
---

# Hook Audit

Invoke the **hook-auditor** agent to evaluate the clarc hook system as a reliable automation layer.

## Usage

```
/hook-audit            — full hook system audit (default)
/hook-audit --verbose  — include per-script analysis details
```

## What It Audits

| Dimension | Weight | What it checks |
|-----------|--------|---------------|
| Event Coverage | 20% | PreToolUse/PostToolUse/Stop events all covered intentionally? |
| False Positive Risk | 15% | Broad matchers that could fire in unintended situations? |
| Performance Impact | 15% | Hooks <100ms? Network calls or blocking sync ops? |
| Error Handling | 15% | try/catch in scripts? Graceful fallback for missing tools? |
| Dead References | 10% | Referenced scripts actually exist? |
| Dead Hooks | 10% | Matchers that will never match in practice? |
| Missing Critical Hooks | 10% | Format dispatch, session-end, security check all present? |
| Interaction Conflicts | 5% | Two hooks that could interfere with each other? |

**Weighted score:**
```
overall = coverage×0.20 + false_positive×0.15 + performance×0.15 +
          error_handling×0.15 + dead_refs×0.10 + dead_hooks×0.10 +
          missing×0.10 + conflicts×0.05
```

## Output

```
## Hook System Audit

Total hooks: 6
Total hook scripts: 8
Overall system score: 8.1 / 10

### Event Coverage Map
| Event Type | Count | Scripts |
|------------|-------|---------|
| PreToolUse | 2 | security_reminder_hook.py, ... |
| PostToolUse Edit | 1 | post-edit-format-dispatch.js |
| Stop | 1 | session-end.js |
| Notification | 1 | notification-handler.js |

### Issues
| Severity | Hook | Finding | Suggestion |
|----------|------|---------|------------|
| MEDIUM | error_handling | session-end.js missing try/catch | Wrap file writes in try/catch |
```

Results saved to `docs/system-review/hook-audit-<date>.json`.

## Steps Claude Should Follow

1. **Delegate to hook-auditor**: Launch with `--all` (default)
2. **Display event coverage map**: Show which hook events are covered
3. **Show dimension scores**: Highlight any dimension below 7
4. **List issues by severity**: HIGH first, then MEDIUM, then LOW
5. **Save results**: Write to `docs/system-review/hook-audit-YYYY-MM-DD.json`
6. **For HIGH issues**: Provide the specific fix needed with code if applicable

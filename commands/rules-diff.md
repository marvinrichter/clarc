---
description: "Preview what has changed in clarc rules since your installed version — without applying changes. Dry-run mode for /update-rules."
---

# Rules Diff Command

Shows what has changed in the upstream clarc rules compared to your installed version.
Does **not** apply any changes — use `/update-rules` to apply them.

## What It Does

1. Reads your installed rules version from `~/.clarc/installed-rules-version`
2. Reads the upstream version from `~/.clarc/rules/RULES_VERSION`
3. Runs `scripts/update-rules.js --dry-run` to compute the diff
4. Displays: added files, changed files, removed files, and unchanged files

## Usage

```
/rules-diff
```

Run `scripts/update-rules.js --dry-run` to show the diff:

```bash
node ~/.clarc/scripts/update-rules.js --dry-run
```

## Example Output

```
clarc rules-diff — comparing installed vs upstream

Installed: v0.8.5  →  Available: v0.9.0

+ rules/kotlin/coding-style.md     (NEW)
+ rules/kotlin/testing.md          (NEW)
~ rules/common/security.md         (CHANGED — 12 lines added)
~ rules/common/agents.md           (CHANGED — priority hierarchy section added)
  rules/common/coding-style.md     (unchanged)
  rules/typescript/testing.md      (unchanged)

2 new files  ·  2 changed  ·  0 removed

Run /update-rules to apply these changes.
```

## Flags

| Flag | Behavior |
|------|----------|
| _(none)_ | Show diff of all changed files |

## Related

- Command: `/update-rules` — apply the changes shown by this command
- Command: `/doctor` — full health check including rules staleness

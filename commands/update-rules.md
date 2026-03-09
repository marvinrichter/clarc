---
description: "Apply latest clarc rule updates from upstream. Skips user-modified files. Use --dry-run to preview, --force to overwrite user modifications."
---

# Update Rules Command

Pulls the latest clarc rules and applies them to your `~/.claude/rules/` directory.

## What It Does

1. Compares your installed rules version against the upstream version in `~/.clarc/rules/RULES_VERSION`
2. Applies new rule files (always safe)
3. Applies changed rule files — unless you modified them after install (those are skipped)
4. Updates `~/.clarc/installed-rules-version` to the new version
5. Prints a summary of what changed

## Safety

User-modified files are **never overwritten** by default. The script detects modifications by comparing the file's modification time against the install timestamp.

To overwrite user-modified files: use `--force` (with a warning per file).

## Usage

```bash
# Preview changes first (no modifications)
node ~/.clarc/scripts/update-rules.js --dry-run

# Apply updates (skips user-modified files)
node ~/.clarc/scripts/update-rules.js

# Apply all updates, including user-modified files
node ~/.clarc/scripts/update-rules.js --force
```

## Example Output (apply mode)

```
clarc update-rules

Installed: v0.8.5
Available: v0.9.0

+ rules/kotlin/coding-style.md   (NEW)
+ rules/kotlin/testing.md        (NEW)
~ rules/common/security.md       (CHANGED)
! rules/common/coding-style.md   (user-modified, skipped)

2 new  ·  1 updated  ·  1 skipped (user-modified)

✅ Rules updated to v0.9.0
1 user-modified file(s) skipped. Run --force to overwrite.
```

## Flags

| Flag | Behavior |
|------|----------|
| _(none)_ | Apply updates, skip user-modified files |
| `--dry-run` | Preview only — no files changed |
| `--force` | Overwrite user-modified files (warns per file) |

## Related

- Command: `/rules-diff` — preview changes without applying
- Command: `/doctor` — check rules age and available updates
- Script: `scripts/update-rules.js` — underlying implementation

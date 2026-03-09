# Rules Staleness & Update Path Roadmap

**Status:** 📋 Planned
**Date:** 2026-03-09
**Motivation:** Rules are installed once via `install.sh` and never updated unless the user manually runs `cd ~/.clarc && git pull`. There is no `/update-rules` command, no staleness detection, no diff against upstream, and no notification when new rules are available. Rules stagnate after first install.

---

## Problem Statement

Current update flow:
```
npx github:marvinrichter/clarc (install) → rules in ~/.claude/rules/ → never updated
```

User must know to:
1. `cd ~/.clarc && git pull` (only if they remember clarc lives there)
2. `./install.sh` again to re-symlink new files
3. Manually review what changed

No user who installed clarc 3 months ago has updated their rules unless they're power users.

### Symptoms

- Users run on outdated security rules that miss new OWASP guidance
- New language rule sets (e.g., a new `kotlin/` directory) are invisible to existing users
- Rule updates that fix incorrect guidance continue to mislead users after the fix ships
- `/doctor` doesn't report stale rules — only missing symlinks

---

## Gap Analysis

| Need | Current State | Desired State |
|------|--------------|---------------|
| Rules version tracking | None | `~/.clarc/rules/RULES_VERSION` file |
| Staleness detection | Not in `doctor` | `/doctor` shows last update date + clarc version |
| Update command | None | `/update-rules` applies upstream changes |
| Changelog for rules | None | `rules/CHANGELOG.md` per version |
| New rule notification | None | Session-start banner when rules > 30 days old |
| Diff on update | None | `--dry-run` shows what changed before applying |

---

## Proposed Deliverables

### Version Tracking (2 files)

| File | Description |
|------|-------------|
| `rules/RULES_VERSION` | Semver string matching clarc package.json version, e.g. `0.9.0` |
| `rules/CHANGELOG.md` | Per-version rule changes: "0.9.0: Added kotlin/ rules, expanded security.md Zero-Trust section" |

### Commands (2)

| Command | Description |
|---------|-------------|
| `/update-rules` | Pulls latest clarc upstream, applies rule updates (new files + changed files), shows diff summary. Does not overwrite user-modified files. |
| `/rules-diff` | Shows what has changed in rules since the installed version, without applying changes |

### `doctor` Enhancement (2 checks)

| Check | Description |
|-------|-------------|
| Rules version check | Compare installed `RULES_VERSION` against upstream. Report: "Rules are 47 days old (v0.8.5, latest: v0.9.0)" |
| Missing language rules | Detect project language (from session-start) and report if language-specific rules are not installed |

### Hook (1)

| Hook | Event | Behavior |
|------|-------|----------|
| `rules-staleness-banner` | SessionStart | If rules are > 30 days old, print one-line notice: "Rules last updated 47 days ago. Run /update-rules to get latest." Max once per 7-day window. |

### Script (1)

| Script | Description |
|--------|-------------|
| `scripts/update-rules.js` | Underlying logic for `/update-rules`: git pull, detect changed rule files, re-symlink new files, skip user-modified files, output diff summary |

---

## Update Safety Protocol

`/update-rules` must not overwrite user-modified files:

```
1. git stash (if clarc repo has user changes)
2. git pull origin main
3. For each changed rule file:
   a. If symlink → target is unmodified: update symlink (or re-copy for --copy installs)
   b. If target was modified by user: SKIP, report "user-modified, skipped: rules/common/security.md"
4. git stash pop (if stashed)
5. Print summary: "Updated 12 rules, skipped 2 (user-modified), added 3 new files"
```

User-modification detection: compare file mtime against `install-manifest.json` install timestamp (from uninstall roadmap).

---

## Implementation Phases

### Phase 1 — Version Tracking
- Create `rules/RULES_VERSION` file with current version
- Create `rules/CHANGELOG.md` with retrospective changelog
- Update `install.sh` to copy `RULES_VERSION` to `~/.clarc/installed-rules-version` on install
- Update CI to bump `RULES_VERSION` when any rule file changes (matching package.json version)

### Phase 2 — `/doctor` Enhancements
- Add version comparison to doctor command
- Add missing-language-rules check
- Report days since last update

### Phase 3 — `/rules-diff` Command
- Implement dry-run diff: compare installed version against upstream
- Show added/changed/removed rule files
- Use `git diff` format for changed file content

### Phase 4 — `/update-rules` Command + Script
- Implement `scripts/update-rules.js`
- Implement user-modification detection
- Wire to `/update-rules` command
- Add `--dry-run` flag (same as `/rules-diff`)
- Add `--force` flag (overwrite even user-modified files, with warning)

### Phase 5 — Session-Start Banner Hook
- Implement `rules-staleness-banner` hook
- Read installed version, compare against `~/.clarc/rules/RULES_VERSION`
- Cooldown: max once per 7 days
- Suppressible via `.clarc/config.json { "suppress_rules_banner": true }`

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Auto-updating rules without user action | Too invasive; always require explicit user consent |
| Per-rule version tracking | Too granular; package-level versioning is sufficient |
| Rolling back rule updates | Git history provides rollback; no custom rollback needed |

---

## Success Criteria

- [ ] `rules/RULES_VERSION` exists and matches package.json
- [ ] `/doctor` reports rules age and version
- [ ] `/rules-diff` shows changes without applying them
- [ ] `/update-rules` applies changes and skips user-modified files
- [ ] Session-start banner fires for rules > 30 days old
- [ ] CI bumps `RULES_VERSION` on rule changes

# Uninstall & Cleanup Path Roadmap

**Status:** 📋 Planned
**Date:** 2026-03-09
**Motivation:** `install.sh` symlinks clarc components into `~/.claude/`. There is no `--uninstall` flag, no cleanup script, and no way for users to selectively remove components without manually hunting symlinks. This creates a one-way ratchet: easy in, impossible out.

---

## Problem Statement

Current install creates symlinks like:
```
~/.claude/agents/tdd-guide.md → ~/.clarc/agents/tdd-guide.md
~/.claude/rules/common/ → ~/.clarc/rules/common/
~/.claude/commands/tdd.md → ~/.clarc/commands/tdd.md
... (hundreds of symlinks)
```

To remove clarc today, a user must:
1. Know which directories were affected (`agents/`, `commands/`, `rules/`, etc.)
2. Find all symlinks pointing to `~/.clarc/`
3. Delete them one by one
4. Know not to delete files that weren't created by clarc

No documentation explains this. No script helps.

### Symptoms

- Users who try clarc and dislike it have no clean exit path
- Updating clarc may leave orphan symlinks if a file was renamed/removed upstream
- No way to do a "partial uninstall" (e.g., keep agents, remove hooks)
- `npx github:marvinrichter/clarc doctor` can't detect orphan symlinks

---

## Gap Analysis

| Need | Current State | Desired State |
|------|--------------|---------------|
| Full uninstall | Manual symlink deletion | `./install.sh --uninstall` |
| Selective uninstall | Not possible | `./install.sh --uninstall agents` |
| Orphan detection | Not in `doctor` | `./install.sh --check` detects orphan symlinks |
| Dry-run mode | Not available | `./install.sh --dry-run` shows what would be done |
| Install manifest | None | `.clarc/install-manifest.json` tracks all created symlinks |
| Re-install / upgrade | Manual | `./install.sh --upgrade` removes stale, adds new |

---

## Proposed Deliverables

### Install Manifest (1)

On every install, write `.clarc/install-manifest.json`:

```json
{
  "version": "0.9.0",
  "installed_at": "2026-03-09T10:00:00Z",
  "target": "claude",
  "languages": ["typescript", "python"],
  "symlinks": [
    { "src": "~/.clarc/agents/tdd-guide.md", "dst": "~/.claude/agents/tdd-guide.md" },
    ...
  ]
}
```

### install.sh Flags (4 new flags)

| Flag | Description |
|------|-------------|
| `--uninstall` | Remove all symlinks listed in install manifest |
| `--uninstall <component>` | Selectively remove: `agents`, `commands`, `rules`, `skills`, `hooks` |
| `--dry-run` | Print what would be installed/uninstalled without making changes |
| `--upgrade` | Detect and remove orphan symlinks (pointing to deleted source), then re-install |

### `doctor` Enhancement (1)

Add orphan detection to existing `/doctor` command:
- Scan `~/.claude/agents/`, `~/.claude/commands/`, `~/.claude/rules/` for broken symlinks
- Report which symlinks are orphaned (source file deleted from `~/.clarc/`)
- Suggest `--upgrade` to fix

### npx Command (1)

| Command | Description |
|---------|-------------|
| `npx github:marvinrichter/clarc uninstall` | Runs `install.sh --uninstall` from the npx entry point |

---

## Implementation Phases

### Phase 1 — Install Manifest
- Modify `install.sh` to write `.clarc/install-manifest.json` after every install
- Record all symlinks created with src/dst paths
- Handle manifest updates on re-install (merge, don't replace)

### Phase 2 — Dry-Run Mode
- Add `--dry-run` flag to `install.sh`
- Print `[DRY RUN] would create symlink: src → dst` for all planned operations
- Exit 0 without making changes
- Apply dry-run to both install and uninstall paths

### Phase 3 — Uninstall Flag
- Read `.clarc/install-manifest.json`
- Remove all listed symlinks (verify they still point to `~/.clarc/` before deleting — never delete user-owned files)
- Support partial: `--uninstall agents` filters manifest by component type
- Print summary: `Removed 47 symlinks from ~/.claude/`

### Phase 4 — Orphan Detection + Upgrade
- Add orphan detection to `install.sh --check` and `/doctor` command
- Implement `--upgrade`: run orphan cleanup, then re-install current version
- Add to `scripts/setup-wizard.js` upgrade flow

### Phase 5 — npx Entry Point
- Add `uninstall` subcommand to `scripts/setup-wizard.js`
- Delegate to `install.sh --uninstall`
- Print confirmation prompt before removing (with `--yes` flag to skip)

---

## Safety Constraints

- **Never delete non-symlinks**: Only remove entries that are symlinks pointing to `~/.clarc/`
- **Never delete user-owned files**: If a path exists as a regular file (user created it), skip with warning
- **Confirmation prompt**: `--uninstall` prints what will be removed and asks for `y/n` unless `--yes` is passed
- **Backup manifest**: Keep previous `install-manifest.json` as `install-manifest.backup.json` in case uninstall needs rollback

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Uninstalling clarc itself (`~/.clarc/`) | User manages their own `~/.clarc/` clone; clarc only manages symlinks into `~/.claude/` |
| GUI uninstall wizard | Out of scope for CLI tool |
| Package manager uninstall (npm/bun) | clarc is installed as a git clone, not a global package |

---

## Success Criteria

- [ ] `install.sh --dry-run` shows planned operations without making changes
- [ ] `install.sh --uninstall` removes all clarc-managed symlinks
- [ ] `install.sh --uninstall agents` selectively removes only agent symlinks
- [ ] `/doctor` reports orphan symlinks
- [ ] `install.sh --upgrade` cleans orphans and re-installs
- [ ] Install manifest is written on every install and correctly tracks all symlinks

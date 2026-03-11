---
description: "Promote a project-local skill from .clarc/skills/<name>/ to global clarc (~/.clarc/skills/). Optionally opens a PR to upstream clarc."
---

# Promote Skill Command

Copies a project-local skill to global clarc scope, making it available across all projects.

## Usage

```
/promote-skill <name>
/promote-skill <name> --pr
```

## What It Does

1. Validates that `.clarc/skills/<name>/SKILL.md` exists
2. Warns if the skill contains project-specific content (checks for hardcoded paths, internal URLs, company names in the description)
3. Copies `.clarc/skills/<name>/` to `~/.clarc/skills/<name>/`
4. Updates `~/.clarc/skills/INDEX.md` with the new skill entry (if it exists)
5. If `--pr` is passed and `gh` is available: opens a pull request to the upstream clarc repository

## Implementation Steps

### 1. Locate the skill

```bash
SKILL_DIR=".clarc/skills/<name>"
SKILL_FILE="$SKILL_DIR/SKILL.md"
```

If `$SKILL_FILE` does not exist → print error and stop.

### 2. Warn about project-specific content

Read the SKILL.md and flag if it contains:
- Absolute paths (e.g., `/Users/`, `/home/`)
- Internal URLs (`.internal`, `.corp`, company-specific domains)
- Words suggesting PII or secrets

Print a warning per item, then ask the user to confirm before continuing.

### 3. Copy to global scope

```bash
cp -r ".clarc/skills/<name>" "$HOME/.clarc/skills/<name>"
```

If `~/.clarc/skills/<name>` already exists, ask before overwriting.

### 4. Update INDEX.md (if present)

Add a row to `~/.clarc/skills/INDEX.md`:

```
| <name> | <title> | <description> |
```

### 5. Open PR (--pr flag)

If `--pr` is passed and `gh` is installed:

```bash
cd ~/.clarc
git checkout -b feat/add-skill-<name>
git add skills/<name>/
git commit -m "feat: add <name> skill (promoted from project)"
gh pr create --title "feat: add <name> skill" --body "Promoted from project-local scope.\n\n<description>"
```

## Example Output

```
/promote-skill our-auth-pattern

Promoting: our-auth-pattern
Source:    .clarc/skills/our-auth-pattern/SKILL.md
Target:    ~/.clarc/skills/our-auth-pattern/

⚠️  Warning: SKILL.md contains internal URL: auth.internal.corp
   → Review and remove project-specific content before promoting.

Proceed? [y/N]: y

✅ Promoted to ~/.clarc/skills/our-auth-pattern/
   Skill is now available globally across all projects.

To propose this skill to all clarc users:
   /promote-skill our-auth-pattern --pr
```

## Safety Notes

- **Never** auto-promote without user confirmation
- **Always** warn about project-specific content
- Promoted skills are global — remove company names, internal URLs, PII
- The original `.clarc/skills/<name>/` is **not** deleted after promotion

## Related

- Command: `/skill-create --local <name>` — scaffold a new project-local skill
- Command: `/skills-local` — list all project-local skills
- Skill: `project-local-skills` — full workflow guide

## After This

- `/skill-depth` — verify the promoted skill's quality score
- `/system-review components` — re-run component review after promotion

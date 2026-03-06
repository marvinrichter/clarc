---
description: Cut a new release. Reads git history since the last tag, determines the version bump (semver), updates CHANGELOG, bumps version files, creates a git tag, and generates GitHub Release notes.
---

# Release

Cut a new versioned release from the current state of main.

## Instructions

### 1. Verify Clean State

```bash
git status  # must be clean
git branch  # must be on main
git log --oneline -3
```

If not clean or not on main, stop and report: "Please commit or stash changes and switch to main before releasing."

### 2. Find the Last Release

```bash
git describe --tags --abbrev=0  # latest tag
git log <last-tag>..HEAD --oneline  # commits since
```

If no tags exist, use all commits.

### 3. Analyze Commits → Determine Version Bump

Read each commit message since the last tag. Apply conventional commits rules:
- Any `feat!:` or `BREAKING CHANGE:` in footer → **MAJOR**
- Any `feat:` → **MINOR** (if not already MAJOR)
- Any `fix:` → **PATCH** (if not already MINOR or MAJOR)
- `chore:`, `docs:`, `test:`, `refactor:` → no bump

Parse `$ARGUMENTS` for override:
- `major` → force MAJOR
- `minor` → force MINOR
- `patch` → force PATCH
- `<version>` (e.g. `1.5.0`) → use exactly that version

Calculate new version from last tag + bump rule.

### 4. Show Plan — WAIT FOR CONFIRMATION

```
RELEASE PLAN
════════════════════

Current:  v1.3.2
New:      v1.4.0 (MINOR — new feature detected)

Commits since v1.3.2:
  feat(auth): add OAuth2 GitHub login (#241)
  feat(api): add cursor-based pagination (#234)
  fix(auth): handle expired tokens (#243)
  fix(orders): race condition in processing (#245)
  docs: update API authentication guide

CHANGELOG will add:
  ## [1.4.0] — 2026-03-06
  ### Added
    - OAuth2 GitHub login
    - Cursor-based pagination on list endpoints
  ### Fixed
    - Expired token handling
    - Race condition in order processing

Files to update:
  CHANGELOG.md
  package.json (version field)

Tag to create: v1.4.0

Continue? (yes / version: <override> / no)
```

Do not proceed until user confirms.

### 5. Update CHANGELOG

Read `CHANGELOG.md` (create if missing using Keep a Changelog format).
Insert new version section after `## [Unreleased]`:

```markdown
## [<new-version>] — <today-date>

### Added
<list of feat: commits>

### Fixed
<list of fix: commits>

### Changed
<list of refactor: / perf: commits>

### Security
<list of security-related commits>
```

Only include sections that have content. Do not add empty sections.

### 6. Bump Version in Project Files

Update the version field in whichever files exist:
- `package.json` → `"version": "<new-version>"`
- `pyproject.toml` → `version = "<new-version>"`
- `go.mod` → (no version field, skip)
- `pom.xml` → `<version><new-version></version>`
- `build.gradle` → `version = '<new-version>'`

### 7. Commit, Tag, Push

```bash
git add CHANGELOG.md package.json  # (or whichever files changed)
git commit -m "chore: release v<new-version>"
git tag -a v<new-version> -m "Release v<new-version>"
git push origin main
git push origin v<new-version>
```

### 8. Create GitHub Release

```bash
gh release create v<new-version> \
  --title "v<new-version>" \
  --notes "<CHANGELOG section for this version>" \
  --latest
```

### 9. Report

```
RELEASE COMPLETE
════════════════

Version:  v<new-version>
Tag:      v<new-version> (pushed)
Release:  <GitHub Release URL>

CHANGELOG: updated
Version:   bumped in package.json

Next steps:
  - Deploy to staging, verify /health/ready
  - Approve production deployment in GitHub Actions
  - Notify team
```

## Arguments

`$ARGUMENTS` can be:
- (empty) — auto-detect version bump from commits
- `patch` — force PATCH bump
- `minor` — force MINOR bump
- `major` — force MAJOR bump
- `1.5.0` — use exact version

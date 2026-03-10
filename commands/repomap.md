---
description: Inject or refresh the compact codebase map — hot files, key symbols, and directory structure. Improves Claude's codebase orientation without burning context on full file reads.
---

# Repomap

Generate and inject a compact codebase snapshot into the current session context.

## Usage

```
/repomap                — inject current map (uses 24h cache)
/repomap --refresh      — force regenerate (bypass cache)
/repomap --show         — print the raw map without injecting
```

## What It Generates

```
--- Codebase Map (2026-03-10) ---
Hot files (recently modified):
  src/api/routes.ts                          Route, handleRequest, validateAuth [145L]
  src/services/auth.ts                       AuthService, generateToken, verifyToken [98L]
  src/models/user.ts                         User, UserRepository, createUser [76L]

Structure (8 dirs, 42 files):
  src/          12 files
  tests/        12 files
  scripts/       8 files
  docs/          5 files

Run /repomap --refresh to regenerate.
---
```

## How It Works

1. **Hot files** — `git log --name-only -50` finds recently changed files (most relevant to current work)
2. **Symbols** — exported functions, classes, and types extracted via language regex (TS, Go, Python, Rust)
3. **Structure** — `git ls-files` builds directory summary (respects `.gitignore`)
4. **Cache** — stored in `.clarc/repomap.txt`, refreshed automatically every 24h

No tree-sitter or native dependencies required — runs anywhere Node.js runs.

## Steps Claude Should Follow

1. Run `generateCompactRepomap(process.cwd(), flags.refresh)` from `session-start.js`
2. If `--refresh`: delete `.clarc/repomap.txt` first to force regeneration
3. If `--show`: print the map to the user without `output()` injection
4. Otherwise: inject via `output()` and confirm with a one-line summary

## Notes

- The repomap is automatically injected at every session start (cached, no overhead)
- Run `/repomap --refresh` after major refactors or branch switches
- The map is capped at 3000 chars to protect the context window
- `.clarc/repomap.txt` can be added to `.gitignore` (it's a generated artifact)

For deeper analysis → skill: `repomap`
For full project context → `/context`

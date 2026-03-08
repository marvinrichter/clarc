# clarc Memory Bank — `.clarc/` Standard

Per-project persistent memory that survives across Claude Code sessions.
Session-start reads it; session-end writes it.

## Directory structure

```
<your-project>/
└── .clarc/
    ├── brief.md       — What is this project? (written once, manually)
    ├── context.md     — Current sprint/focus (session-end overwrites each time)
    ├── progress.md    — What was done, what's next (session-end appends each session)
    └── decisions.md   — Architecture decisions captured during sessions (session-end appends)
```

## File formats

### `brief.md` — write once, edit manually

```markdown
# <Project Name>

## What it is
<1-3 sentences describing the project>

## Tech stack
- Language: TypeScript / Go / Python / ...
- Framework: Next.js / Gin / FastAPI / ...
- Database: PostgreSQL / ...
- Deployment: Vercel / AWS / ...

## Key conventions
- Package manager: pnpm
- Test framework: vitest
- Style: ...
```

### `context.md` — overwritten by session-end each time

```markdown
# Session Context — YYYY-MM-DD

## Current focus
<What was the main topic of the last session?>

## Open TODOs
- [ ] ...

## Next steps
<What should happen in the next session?>

## Key findings
<Important decisions and insights from the session>
```

### `progress.md` — session-end appends each session

```markdown
## Session YYYY-MM-DD HH:MM

### Completed
- ...

### Files changed
- ...

### Notes
- ...
```

### `decisions.md` — session-end appends when ADRs are mentioned

```markdown
## YYYY-MM-DD — <Decision title>

**Context:** <Why this decision was needed>
**Decision:** <What was decided>
**Consequences:** <What this means going forward>
```

## Git recommendations

```gitignore
# Commit brief.md (project overview) but not the auto-generated files
.clarc/context.md
.clarc/progress.md
.clarc/decisions.md
```

For team projects where shared memory is useful, commit all `.clarc/` files.

## Activation

Memory Bank is loaded automatically when `session-start.js` detects a `.clarc/` directory.
No configuration needed beyond creating the directory.

```bash
# Initialize Memory Bank for a project
mkdir -p .clarc
cat > .clarc/brief.md << 'EOF'
# My Project

## What it is
<describe your project here>

## Tech stack
- ...
EOF
```

After the next Claude Code session starts, the Memory Bank will be loaded automatically.

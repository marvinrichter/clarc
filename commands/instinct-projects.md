---
name: instinct-projects
description: List registered projects and their instinct/observation counts — part of the continuous-learning-v2 system.
command: true
---

# Projects Command

List project registry entries and per-project instinct/observation counts for continuous-learning-v2.

## Implementation

Run the instinct CLI using the plugin root path:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" projects
```

Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation):

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py projects
```

## Usage

```bash
/projects
```

## Preconditions

Before running, verify:
- `~/.claude/homunculus/` exists — if not, instruct user to run `install.sh --enable-learning`
- `projects.json` exists in `~/.claude/homunculus/` — if not, no projects have been registered yet (run a session in a git repo first)

## Execution

1. Read `~/.claude/homunculus/projects.json`
2. For each project, display:
   - Project name, id, root, remote
   - Personal and inherited instinct counts
   - Observation event count
   - Last seen timestamp
3. Also display global instinct totals

## Output Format

```
REGISTERED PROJECTS (3)
=======================

  my-app        a1b2c3d4e5f6  ~/projects/my-app
    instincts:  8 personal + 2 inherited
    events:     47
    last seen:  2026-03-10

  api-service   b2c3d4e5f6a1  ~/projects/api-service
    instincts:  3 personal + 0 inherited
    events:     12
    last seen:  2026-03-08

GLOBAL INSTINCTS: 4
```

## Output Interpretation

- **Many events, few instincts**: the quality gate in `/learn-eval` is filtering out low-confidence patterns — this is normal
- **Stale project** (last seen > 30 days): instincts for that project may have decayed — run `/instinct-report` from within it to check
- **Missing project**: not registered yet — open a session from within that project's git root to register it automatically

## After This

- `/instinct-status` — check instinct scores for the listed projects

---
name: instinct-status
description: Show learned instincts (project + global) with confidence
command: true
---

# Instinct Status Command

Shows learned instincts for the current project plus global instincts, grouped by domain.

## Implementation

Run the instinct CLI using the plugin root path:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" status
```

Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation), use:

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py status
```

## Usage

```
/instinct-status
```

## Preconditions

Before running, verify:
- `~/.claude/homunculus/` exists — if not, instruct user to run `install.sh --enable-learning`
- `instinct-cli.py` is accessible at `${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py`
- Current directory is inside a git repository (required for project context detection)

## Execution

1. Detect current project context (git remote/path hash)
2. Read project instincts from `~/.claude/homunculus/projects/<project-id>/instincts/`
3. Read global instincts from `~/.claude/homunculus/instincts/`
4. Merge with precedence rules (project overrides global when IDs collide)
5. Display grouped by domain with confidence bars and observation stats

## Output Interpretation

- **No instincts shown**: normal for new projects — instincts accumulate over sessions via `/learn-eval`
- **Conflicts shown**: run `/evolve` to cluster and resolve contradictions
- **Low-confidence instincts** (< 50%): consider running `/instinct-outcome <id> bad` if they caused issues
- **After reviewing**: use `/instinct-report` for a ranked confidence view or `/instinct-promote` for global promotion

## Conflict Detection

After showing instincts, also run the conflict detector:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/conflict-detector.py"
```

If `~/.claude/homunculus/conflicts.json` exists and has unresolved conflicts, show a **Conflicts** section at the end:

```
============================================================
  CONFLICTS REQUIRING RESOLUTION (2)
============================================================

  Domain: workflow | Keywords: [functional, class]
  A [project] prefer-functional (conf=0.72)
  B [global]  prefer-classes (conf=0.45)
  Resolution: keep 'prefer-functional' (higher confidence)
  Run /evolve to resolve, or /instinct-status --fix to auto-resolve.
```

## Output Format

```
============================================================
  INSTINCT STATUS - 12 total
============================================================

  Project: my-app (a1b2c3d4e5f6)
  Project instincts: 8
  Global instincts:  4

## PROJECT-SCOPED (my-app)
  ### WORKFLOW (3)
    ███████░░░  70%  grep-before-edit [project]
              trigger: when modifying code

## GLOBAL (apply to all projects)
  ### SECURITY (2)
    █████████░  85%  validate-user-input [global]
              trigger: when handling user input
```

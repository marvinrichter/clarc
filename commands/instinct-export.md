---
name: instinct-export
description: Export instincts from project/global scope to a file
command: true
---

# Instinct Export Command

Exports instincts to a shareable format. Perfect for:
- Sharing with teammates
- Transferring to a new machine
- Contributing to project conventions

## Usage

```
/instinct-export                           # Export all personal instincts
/instinct-export --domain testing          # Export only testing instincts
/instinct-export --min-confidence 0.7      # Only export high-confidence instincts
/instinct-export --output team-instincts.yaml
/instinct-export --scope project --output project-instincts.yaml
```

## Preconditions

Before running, verify:
- `~/.claude/homunculus/` exists — if not, instruct user to run `install.sh --enable-learning`
- For `--scope project`: current directory must be inside a known project (check `homunculus/projects.json`)
- At least one instinct exists to export — if none, suggest running a few sessions with `/learn-eval` first

## Execution

1. Detect current project context
2. Load instincts by selected scope:
   - `project`: current project only
   - `global`: global only
   - `all`: project + global merged (default)
3. Apply filters (`--domain`, `--min-confidence`)
4. Write YAML-style export to file (or stdout if no output path provided)

## Output Format

Creates a YAML file:

```yaml
# Instincts Export
# Generated: 2025-01-22
# Source: personal
# Count: 12 instincts

---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.8
domain: code-style
source: session-observation
scope: project
project_id: a1b2c3d4e5f6
project_name: my-app
---

# Prefer Functional Style

## Action
Use functional patterns over classes.
```

## Flags

- `--domain <name>`: Export only specified domain
- `--min-confidence <n>`: Minimum confidence threshold
- `--output <file>`: Output file path (prints to stdout when omitted)
- `--scope <project|global|all>`: Export scope (default: `all`)

## Output Interpretation

- **File written**: share the YAML file with teammates or commit it to the project repo
- **Stdout output** (no `--output`): copy/paste directly or pipe to a file for review
- **Next steps**: teammates can import with `/instinct-import <file>` to inherit the same patterns
- Use `--min-confidence 0.7` to export only battle-tested instincts when sharing with others

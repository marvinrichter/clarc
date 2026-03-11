---
description: Search all available skills by keyword and return the top matches with their descriptions. Use when unsure which skill covers a topic.
---

# Find Skill

Search the skills library by keyword. Returns the top matching skills with descriptions and activation criteria.

## Usage

```
/find-skill <keyword or topic>
```

## Examples

```
/find-skill jwt auth
/find-skill postgres query optimization
/find-skill react state
/find-skill go testing mocks
/find-skill api design versioning
```

## Workflow

Run this Bash command to search:

```bash
QUERY="$ARGUMENTS"
SKILLS_DIR="${CLAUDE_PLUGIN_ROOT:-$HOME/.claude}/skills"

echo "Searching skills for: $QUERY"
echo "---"

grep -rl --include="SKILL.md" -i "$QUERY" "$SKILLS_DIR" 2>/dev/null \
  | while read -r file; do
      dir=$(dirname "$file")
      name=$(basename "$dir")
      desc=$(grep -m1 '^description:' "$file" | sed 's/^description: *//;s/^"//;s/"$//')
      when=$(awk '/^## When to (Activate|Use)/,/^##/' "$file" | grep '^- ' | head -3 | sed 's/^- /  • /')
      echo "[$name]"
      echo "  $desc"
      if [ -n "$when" ]; then
        echo "  When to use:"
        echo "$when"
      fi
      echo ""
    done \
  | head -80

echo "To load a skill: mention its name in your next message, e.g. 'Use the jpa-patterns skill'"
```

If no results found, try a broader keyword or check `/instinct-status` for learned project-specific patterns.

## After This

- Read the matched skill file to understand the pattern in detail
- `/guide <topic>` — get a workflow plan using the matched skill

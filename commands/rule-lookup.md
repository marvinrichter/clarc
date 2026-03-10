---
name: rule-lookup
description: Look up the rule constraint AND the linked skill for a given topic — makes the two-layer rules/skills system navigable
command: true
---

# Rule Lookup

Given a topic, returns:
1. The constraint from the relevant rule file (the "thou shalt")
2. The linked skill for deeper reference (the "how to")

## Usage

```
/rule-lookup <topic>
/rule-lookup security
/rule-lookup testing
/rule-lookup gitops
/rule-lookup agents
/rule-lookup git
/rule-lookup performance
```

## Topic → Rule Mapping

| Topic | Rule File | Linked Skills |
|-------|-----------|---------------|
| `security` | `rules/common/security.md` | `gdpr-privacy`, `zero-trust-review`, `security-review` |
| `privacy` | `rules/common/security.md` | `gdpr-privacy` |
| `zero-trust` | `rules/common/security.md` | `zero-trust-review` |
| `testing` | `rules/common/testing.md` | `tdd-workflow`, `python-testing`, `typescript-testing`, `go-testing` |
| `tdd` | `rules/common/testing.md` | `tdd-workflow` |
| `gitops` | `rules/common/gitops.md` | `gitops-patterns` |
| `kubernetes` | `rules/common/gitops.md` | `gitops-patterns`, `kubernetes-patterns` |
| `agents` | `rules/common/agents.md` | `multi-agent-patterns` |
| `git` | `rules/common/git-workflow.md` | (see development-workflow) |
| `commit` | `rules/common/git-workflow.md` | (see development-workflow) |
| `performance` | `rules/common/performance.md` | `performance-profiling` |
| `model` | `rules/common/performance.md` | (see Anthropic docs) |
| `hooks` | `rules/common/hooks.md` | `hooks-config` |
| `patterns` | `rules/common/patterns.md` | `api-design`, `legacy-modernization` |
| `coding` | `rules/common/coding-style.md` | (see language-specific rules) |
| `style` | `rules/common/coding-style.md` | (see language-specific rules) |

## What to Do

1. Identify the topic from the user's query (exact match or fuzzy)
2. Look up the rule file in the mapping above
3. Read the relevant section from the rule file
4. Report:
   - The key constraint(s) as a brief summary
   - The checklist items (if any)
   - The linked skill(s) for deeper reference
5. If the topic is not in the mapping, say so and suggest `/find-skill <topic>` to search skills instead

## Output Format

```
Rule: <rule-file>
Constraint: <one-sentence summary of the key mandate>

Checklist:
- [ ] item 1
- [ ] item 2

For implementation examples → skill: `<skill-name>`
Run /find-skill <topic> to search for more specific guidance.
```

## Notes

- If the user provides a topic not in the mapping, do a best-effort match against rule file names and content
- If still no match, explain that no rule exists for that topic and suggest creating one in `rules/common/`
- The two-layer model: rules = constraints (≤ 80 lines), skills = patterns and examples (≥ 50 lines)

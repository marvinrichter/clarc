---
description: Show which agents depend on a skill and what would be affected by changing it
---

# Skill Impact

Show which agents declare a dependency on a skill and what would break if you changed it. Run this before editing any skill that other agents reference.

Show the impact of changing skill `$ARGUMENTS`.

1. **Parse the skill name** from `$ARGUMENTS`. If empty, ask the user for a skill name.

2. **Read `skills/SKILL_AGENTS.md`** (the reverse index). Search for a section matching `\`<skill-name>\``.

3. **If found**, output:

   ```
   ## Impact: <skill-name>

   **Agents using this skill:**
   - <agent-1> — <one-line description from agents/<agent-1>.md frontmatter>
   - <agent-2> — ...

   **Before changing this skill, review:**
   - [ ] Each dependent agent's instructions still align with the updated patterns
   - [ ] Any WRONG/CORRECT code examples in the skill are language-agnostic or correctly scoped
   - [ ] The skill_family and related_agents fields in SKILL.md frontmatter are up to date

   **To update agents after a skill change:**
   Run: node scripts/ci/validate-agent-skill-refs.js
   Run: node scripts/ci/generate-skill-agents-index.js
   ```

4. **If not found** in `SKILL_AGENTS.md`:
   - Check if `skills/<skill-name>/SKILL.md` exists
   - If it exists but has no agents: "No agents currently declare a dependency on `<skill-name>`. If you add `uses_skills` to an agent that uses this skill, run `node scripts/ci/generate-skill-agents-index.js` to update the index."
   - If the skill does not exist at all: "Skill `<skill-name>` not found. Run `/find-skill <keyword>` to search for available skills."

5. **Always append at the end:**
   > Index source: `skills/SKILL_AGENTS.md` — regenerate with `node scripts/ci/generate-skill-agents-index.js`

## After This

- `/system-review components` — full system review if high-impact skills are missing

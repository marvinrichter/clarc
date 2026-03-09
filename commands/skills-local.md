---
description: "List all project-local skills in .clarc/skills/. Shows skill names, descriptions, and which ones override global clarc skills."
---

# Skills Local Command

Lists all project-local skills in `.clarc/skills/` for the current project.

## What It Does

1. Scans `.clarc/skills/*/SKILL.md` in the current working directory
2. Reads each skill's frontmatter (title, description, tags)
3. Detects overrides — local skills that share a name with a global clarc skill
4. Prints a summary table

## Usage

```
/skills-local
```

## Implementation

Run the following analysis:

1. Check if `.clarc/skills/` exists in `cwd` — if not, print "No project-local skills found."
2. For each subdirectory in `.clarc/skills/`, look for `SKILL.md`
3. Parse frontmatter: `title`, `description`, `tags`, `scope`, `team`
4. Check if the directory name matches any skill in the global clarc index (`~/.clarc/skills/`) — mark as `[overrides global]` if so
5. Print a table like the example below

## Example Output

```
Project-local skills — .clarc/skills/ (3 skills)

  our-auth-pattern         How we use the internal auth library
  internal-api-guide       Conventions for calling our internal API      [overrides global: api-design]
  payment-flow             Approved payment integration pattern

Total: 3 local skills  ·  1 overrides global  ·  2 unique
```

If `.clarc/skills/` does not exist or is empty:

```
No project-local skills found.

Create one with: /skill-create --local <name>
```

## Related

- Command: `/skill-create --local <name>` — scaffold a new project-local skill
- Command: `/promote-skill <name>` — promote a local skill to global clarc
- Skill: `project-local-skills` — full workflow guide for local skills

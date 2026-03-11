---
description: Audit the prompt engineering quality of all clarc agents and commands. Delegates to the prompt-quality-scorer agent to score and rank each component across 6 dimensions.
---

# Prompt Audit

Audit the prompt engineering quality of clarc components: $ARGUMENTS

## Usage

```
/prompt-audit          — score all agents and commands
/prompt-audit agents   — score agents only
/prompt-audit commands — score commands only
/prompt-audit <name>   — score a single agent or command file
```

## Step 1 — Invoke prompt-quality-scorer

Use the **prompt-quality-scorer** agent with the scope from `$ARGUMENTS`.

Pass:
- Target scope (all / agents / commands / specific file path)
- Any focus areas mentioned in `$ARGUMENTS`

The agent will score each component across 6 dimensions:
1. **Specificity** — how precise and unambiguous the instructions are
2. **Completeness** — whether all required steps and edge cases are covered
3. **Output definition** — how clearly the expected output format is defined
4. **Ambiguity** — presence of vague language that could cause inconsistent behavior
5. **Safety coverage** — guardrails for edge cases, errors, and misuse
6. **Example density** — quality and coverage of worked examples

## Step 2 — Interpret the Report

The agent returns a ranked report from lowest to highest score.

**Action thresholds:**
- Score **< 5.0** — P0: improve before next release
- Score **5.0–6.9** — P1: schedule for improvement this sprint
- Score **7.0–8.9** — P2: note for future iteration
- Score **≥ 9.0** — no action needed

## Step 3 — Prioritize Fixes

Focus on the bottom 5 scoring components first. Common issues to fix:
- Add a worked example with realistic input → expected output
- Replace vague language ("appropriate", "as needed") with specific criteria
- Add an output format specification with an example
- Add a "When NOT to Use" or "Limits" section for safety

## After This

- `/system-review components` — run all component analyzers including prompt quality
- `/skill-depth` — deep-dive into a specific skill's prompt quality
- `/code-review` — review any agent/command files you've edited

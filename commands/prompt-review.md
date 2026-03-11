---
description: Review a system prompt or prompt template for quality, safety, and effectiveness. Invokes the prompt-reviewer agent.
---

# Prompt Review

## What This Command Does

Reads a prompt file or inline prompt text and invokes the **prompt-reviewer** agent to audit it for:

- Security vulnerabilities (injection risk, hardcoded secrets)
- Correctness issues (contradictions, missing output format, ambiguous persona)
- Quality problems (redundancy, weak instructions, missing examples)
- Style issues (filler phrases, passive instructions)

## Usage

```
/prompt-review <file-path>
/prompt-review <inline-prompt-text>
```

Pass a file path via `$ARGUMENTS` to review a prompt stored on disk, or paste the prompt text directly.

## Steps

1. **Read prompt content** — if `$ARGUMENTS` looks like a file path (starts with `/`, `./`, or `../`, or ends with `.md`/`.txt`), read the file. Otherwise treat the arguments as inline prompt text.
2. **Invoke prompt-reviewer agent** — pass the full prompt content as context.
3. **Report findings** — the agent outputs findings grouped by severity (CRITICAL / HIGH / MEDIUM / LOW) and a final verdict.
4. **Remediation** — if CRITICAL or HIGH issues are found, offer to apply the suggested fixes directly to the file.

## After This

- `/prompt-audit` — audit the full prompt system after individual fixes
- `/tdd` — add eval tests for the reviewed prompt

---
description: Review a clarc agent file for quality across 8 dimensions — instruction clarity, model appropriateness, tool coverage, trigger precision, exit criteria, examples, overlap detection, and safety guardrails. Produces a scored JSON report. Use /agent-review --all to review all agents at once.
---

# Agent Review

Invoke the **agent-quality-reviewer** agent to evaluate one or all clarc agents against a structured 8-dimension quality rubric.

## Usage

```
/agent-review <agent-name>     — review a specific agent
/agent-review --all            — review all agents in agents/
```

## What It Reviews

Each agent is scored 1–10 on 8 weighted dimensions:

| Dimension | Weight | What it checks |
|-----------|--------|---------------|
| Instruction Clarity | 25% | Are tasks described with concrete verbs and clear scope? |
| Model Appropriateness | 15% | Is Haiku/Sonnet/Opus matched to task complexity? |
| Tool Coverage | 15% | Exactly the right tools — no missing, no excess? |
| Trigger Precision | 15% | Is the description specific enough to avoid mis-routing? |
| Exit Criteria | 10% | Does the agent know when it's done? Is the output format exact? |
| Example Density | 10% | ≥2 input/output examples provided? |
| Overlap Detection | 5% | Does this agent duplicate another agent's function? |
| Safety Guardrails | 5% | Are destructive operations confirmed? Dry-run option? |

**Weighted overall score:**
```
overall = clarity×0.25 + model×0.15 + tools×0.15 + trigger×0.15 +
          exit×0.10 + examples×0.10 + overlap×0.05 + safety×0.05
```

## Output

### Single Agent (`/agent-review code-reviewer`)

```json
{
  "agent": "code-reviewer",
  "file": "agents/code-reviewer.md",
  "overall_score": 8.2,
  "dimensions": {
    "instruction_clarity":   { "score": 9, "note": "Steps are concrete and ordered" },
    "model_appropriateness": { "score": 7, "note": "Sonnet is correct for this task" },
    "tool_coverage":         { "score": 8, "note": "All needed tools present" },
    "trigger_precision":     { "score": 6, "issue": "Description overlaps with typescript-reviewer" },
    "exit_criteria":         { "score": 9, "note": "Output format is exact JSON schema" },
    "example_density":       { "score": 5, "issue": "Only 1 partial example provided" },
    "overlap_detection":     { "score": 8, "note": "Distinct orchestrator role vs. specialists" },
    "safety_guardrails":     { "score": 10, "note": "Read-only agent, no safety risk" }
  },
  "issues": [
    {
      "severity": "MEDIUM",
      "dimension": "trigger_precision",
      "finding": "Description uses 'review code' which matches typescript-reviewer routing",
      "suggestion": "Add 'routes to specialist reviewer' to distinguish orchestrator role"
    }
  ],
  "verdict": "GOOD — 1 medium issue to address"
}
```

### All Agents (`/agent-review --all`)

Summary table sorted by score ascending (lowest first), followed by full JSON for agents scoring below 7.0:

```
| Agent | Score | Issues |
|-------|-------|--------|
| hook-auditor | 6.1 | HIGH: no exit criteria |
| code-reviewer | 9.2 | — |
```

Results saved to `docs/system-review/agent-review-<date>.json`.

## Steps Claude Should Follow

1. **Delegate to agent-quality-reviewer**: Launch it with the agent name or `--all` flag
2. **For single agent**: Display the JSON report and highlight any HIGH or MEDIUM issues
3. **For --all mode**:
   - Save results to `docs/system-review/agent-review-YYYY-MM-DD.json`
   - Display the summary table (sorted by score ascending)
   - Print full JSON only for agents scoring below 7.0
4. **Suggest fixes**: For each HIGH issue, offer a concrete suggestion on how to fix the agent

## Issue Severity

- **HIGH** (score 1–4): Must fix — significantly reduces agent effectiveness
- **MEDIUM** (score 5–6): Should fix — noticeable quality gap
- **LOW** (score 7–8, below threshold): Nice to fix — minor improvement possible

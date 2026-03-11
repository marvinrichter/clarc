---
description: Orchestrate a structured self-review of the entire clarc system. Three modes: quick (wiring + naming, ~5 min), components (all component analyzers, ~30 min), full (everything + competitive analysis, ~90 min). Produces a report in docs/system-review/.
---

# System Review

Orchestrate a comprehensive self-review of clarc as a Workflow-OS. Runs component analyzers, cross-component validators, and (in full mode) systemic effectiveness analysis.

## Usage

```
/system-review quick        — wiring + naming validation (~5 min)
/system-review components   — all component analyzers (~30 min)
/system-review full         — complete review including competitive gap analysis (~90 min)
```

## Modes

### Quick Mode (`/system-review quick`)

Runs static validators — fastest feedback after any structural change:
1. `node scripts/ci/validate-wiring.js` — broken cross-references
2. `node scripts/ci/validate-naming.js` — naming convention violations

**Use after**: Any add/remove/rename of agents, skills, or commands.
**Output**: Inline report (no file saved for quick mode).

### Components Mode (`/system-review components`)

Runs all 4 component-level analyzers in parallel where possible:
1. **agent-quality-reviewer `--all`** → scores all agents on 8 dimensions
2. **skill-depth-analyzer `--all`** → scores all skills on 7 dimensions
3. **command-auditor `--all`** → audits command system ergonomics
4. **hook-auditor** → audits hook system reliability

Saves results to `docs/system-review/components-YYYY-MM-DD/`.
**Use**: Weekly or after a major release.

### Full Mode (`/system-review full`)

Runs all components + systemic analysis. Recommended with `/overnight`:
1. All steps from Components Mode
2. **prompt-quality-scorer `--all`** → prompt engineering quality
3. `/learning-audit` → continuous-learning-v2 health
4. `/workflow-check` → 6 critical developer journey coverage
5. `/competitive-review` → clarc vs. competitors feature matrix
6. **agent-system-reviewer** → synthesizes everything into a unified Priority Matrix

**Use**: Monthly, before major roadmap planning sessions.

## Steps Claude Should Follow

### For Quick Mode

1. Run `node scripts/ci/validate-wiring.js`
2. Run `node scripts/ci/validate-naming.js`
3. Report results inline — errors block, warnings note
4. If errors: suggest specific fixes

### For Components Mode

1. **Create output directory**: `docs/system-review/components-YYYY-MM-DD/`
2. **Launch in parallel** (agents run as subagents):
   - Launch agent-quality-reviewer `--all` → save to `components-<date>/agents.json`
   - Launch skill-depth-analyzer `--all` → save to `components-<date>/skills.json`
   - Launch command-auditor `--all` → save to `components-<date>/commands.json`
   - Launch hook-auditor → save to `components-<date>/hooks.json`
3. **Generate summary**: Combine results into `docs/system-review/YYYY-MM-DD-components-report.md`
4. **Show top issues**: List all HIGH severity issues across all components

### For Full Mode

1. Run all Components Mode steps
2. **Sequential additions** (these depend on components output):
   - Launch prompt-quality-scorer `--all`
   - Run `/learning-audit`
   - Run `/workflow-check`
   - Run `/competitive-review`

3. **Synthesize**: Launch agent-system-reviewer to produce the Priority Matrix
4. **Final report**: Save to `docs/system-review/YYYY-MM-DD-full-report.md`
5. **Recommended actions**: End with top 5 P0/P1 actions for next roadmap

## Output Structure

```
docs/system-review/
├── coverage-map.md                        # Always updated (B02)
├── YYYY-MM-DD-quick-report.md             # Quick mode results
├── YYYY-MM-DD-components-report.md        # Components mode
├── YYYY-MM-DD-full-report.md              # Full mode
├── agent-review-YYYY-MM-DD.json           # Agent scores
├── skill-depth-YYYY-MM-DD.json            # Skill scores
├── command-audit-YYYY-MM-DD.json          # Command audit
├── hook-audit-YYYY-MM-DD.json             # Hook audit
├── prompt-quality-YYYY-MM-DD.json         # Prompt scores
├── learning-audit-YYYY-MM-DD.md           # Learning health
├── workflow-check-YYYY-MM-DD.md           # Journey coverage
└── competitive-analysis-YYYY-MM-DD.md     # Competitive gaps
```

## Report Format

See `docs/templates/system-review-report.md` for the full report template.

Every report includes:
- Overall Health Score (X.X / 10)
- Critical Issues (P0) count
- Coverage gaps
- Priority Matrix
- Recommended next roadmap items

## After This

- Create a new roadmap from the P0/P1 findings in `docs/roadmaps/`
- `/command-audit` — re-run command ergonomics check if command issues dominate
- `/competitive-review` — deeper competitive analysis if market gaps are flagged

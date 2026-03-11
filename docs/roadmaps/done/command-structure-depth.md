# Command Structure Depth

**Status:** ✅ Complete
**Date:** 2026-03-11
**Goal:** Lift command UX quality from 6.2→8.0 by adding structural guidance, argument docs, next-step suggestions, and fixing delegation wiring across the 164-command system.

## Summary

Completed all 30 items across P0, P1, P2 priorities. The command system now has:
- All HIGH-severity commands expanded with usage blocks, step structure, and next-step sections
- 16 thin `*-review` wrappers have disambiguation tables vs `/code-review`
- Agent delegation is explicit in security-review, profile, and finops-audit
- system-review uses correct `/slash-command` syntax for sub-commands
- incident, migrate, python-test, rust-test have formal `## Step N` structure
- 2 new commands created: `prompt-audit` and `arch-design`

## Completed Items

| ID | Item | Status |
|----|------|--------|
| P0-C1 | code-review: structure + next-step | ✅ |
| P0-C2 | e2e: add ## Step N headings | ✅ |
| P0-C3 | overnight: add ## Step N headings (Phase → Step rename) | ✅ |
| P1-D1 | security-review: fix devsecops-reviewer delegation | ✅ |
| P1-D2 | profile: invoke performance-analyst | ✅ |
| P1-D3 | finops-audit: invoke finops-advisor | ✅ |
| P1-D4 | system-review: fix bold → slash command refs | ✅ |
| P1-D5 | agent-design + orchestrator-design: scope boundary table | ✅ |
| P1-R1–16 | 16× *-review: disambiguation + next-step | ✅ |
| P1-S1 | plan: already had Integration section — no change needed | ✅ |
| P1-S2 | incident: convert ### N. → ## Step N — | ✅ |
| P1-S3 | migrate: fix bold refs + convert to ## Step N — | ✅ |
| P1-S4 | python-test: add ## Step 1–3 | ✅ |
| P1-S5 | rust-test: add ## Step 1–3 | ✅ |
| P2-N1 | Add commands/prompt-audit.md | ✅ |
| P2-N2 | Add commands/arch-design.md | ✅ |

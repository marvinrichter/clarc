# Contextual Discoverability Roadmap

**Status:** ✅ Completed
**Date:** 2026-03-09
**Motivation:** clarc has 422+ components (61 agents, 222 skills, 139 commands). New users face an overwhelming static catalog. Discovery depends on memorizing commands or reading the README — not on contextual, project-aware guidance.

---

## Problem Statement

The current entry points are:
- `/quickstart` — static onboarding text
- `/clarc-way` — static workflow guide
- `/find-skill` — requires knowing you need to search

None of these are context-aware. A user working on a Go backend with auth endpoints gets the same entry experience as someone building a Flutter app. There is no "Lot"-mechanism that surfaces relevant components based on detected project context.

### Symptoms

- Users default to `/help` or ask Claude directly instead of using clarc commands
- Skills with high relevance to a project type go unused
- Low command diversity — users tend to reuse a small personal subset
- `/find-skill` is underused because users don't know the vocabulary

---

## Gap Analysis

| Area | Current State | Desired State |
|------|--------------|---------------|
| Project context detection | Exists in `session-start.js` (pkg manager, lang) | Surfaces relevant skills/commands proactively |
| Component surface | Flat list in README + INDEX.md | Layered: core → language → task → optional |
| Onboarding path | Static `/quickstart` text | Dynamic, project-aware recommendations |
| In-session guidance | User must remember or search | Session-start suggests top 5 relevant components |
| Command naming | Flat namespace, no grouping | Grouped by workflow stage visible in `/clarc-way` |

---

## Proposed Deliverables

### Commands (2)

| Command | Description |
|---------|-------------|
| `/context` | Analyzes current project (stack, domain, team size signals) and outputs a curated list of relevant skills, agents, and commands with one-line rationale per item |
| `/guide <task>` | Given a task description ("add auth", "write E2E tests", "deploy to k8s"), returns an ordered workflow plan using clarc components |

### Skill (1)

| Skill | Description |
|-------|-------------|
| `clarc-onboarding` | Staged onboarding framework — Day 1 (core 10 commands), Week 1 (workflow integration), Month 1 (advanced agents). Differentiates solo dev vs. team onboarding. |

### Hook (1)

| Hook | Event | Behavior |
|------|-------|----------|
| `context-banner` | SessionStart | After language detection, prints top 3 recommended commands for the detected project type. Suppressible via `.clarc/config.json`. |

### Agent enhancement (1)

| Agent | Change |
|-------|--------|
| `planner` | Add a "clarc component suggestion" step: before generating a plan, emit which clarc skills/agents/commands the plan will rely on |

---

## Implementation Phases

### Phase 1 — Context Command
- Read `session-start.js` language/package-manager detection output
- Map detected stack to a curated component list (skill: `clarc-onboarding`)
- Implement `/context` command that outputs the curated list

### Phase 2 — Task Guide Command
- Implement `/guide <task>` using keyword→workflow mapping
- Cover the 20 most common task types (auth, testing, deploy, review, refactor, etc.)
- Output ordered steps with clarc commands per step

### Phase 3 — Session-Start Banner Hook
- Add `context-banner` hook to `hooks.json`
- Wire to `session-start.js` detection output
- Add suppression config

### Phase 4 — Skill: clarc-onboarding
- Write `skills/clarc-onboarding/SKILL.md`
- Staged curriculum: Day 1 / Week 1 / Month 1
- Solo vs. Team differentiation

---

## What Is Intentionally Left Out

| Topic | Why excluded |
|-------|-------------|
| Telemetry / usage tracking | Privacy — no opt-in analytics in clarc |
| AI-powered component matching | Adds latency to session start; rule-based is sufficient |
| GUI / web dashboard | Out of scope for CLI-first tool |

---

## Success Criteria

- [ ] `/context` correctly identifies stack and surfaces ≥5 relevant components
- [ ] `/guide <task>` covers 20 common task types
- [ ] Session-start banner appears and is suppressible
- [ ] New user can reach their first useful command in < 60 seconds without reading README

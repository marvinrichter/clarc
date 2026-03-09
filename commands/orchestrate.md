---
description: Orchestrate multiple agents for complex tasks — auto-selects coordination pattern (fan-out, split-role, explorer+validator, worktree, pipeline)
agent: orchestrator
subtask: true
---

# Orchestrate Command

Orchestrate multiple specialized agents for: $ARGUMENTS

## Pattern Auto-Selection

Before creating the execution plan, analyze the task and select the best coordination pattern:

| Task Signal | Pattern |
|-------------|---------|
| Review/analyze N files independently | **Fan-Out → Fan-In** |
| Decision needing multiple perspectives | **Split-Role** |
| Unknown codebase / research task | **Explorer + Validator** |
| Parallel independent features | **Worktree Isolation** |
| Feature from plan → test → code → review | **Sequential Pipeline** |

Load skill `multi-agent-coordination` for full pattern specifications.

## Your Task

1. **Analyze the task** — identify complexity, dependencies, and domain
2. **Select pattern** — choose from the 5 patterns above and justify
3. **Identify optimal agents** — match agents to subtasks
4. **Create execution plan** — phases with dependencies
5. **Execute** — parallel where possible, sequential where required
6. **Detect conflicts** — compare agent outputs for contradictions at the same code locations
7. **Resolve conflicts** — apply the priority hierarchy from `docs/agent-priority-hierarchy.md`; every conflict must appear in `### Conflicts Resolved`
8. **Synthesize** — merge results into unified output

## Available Agents

| Agent | Specialty | Use For |
|-------|-----------|---------|
| planner | Implementation planning | Complex feature design |
| architect | System design | Architectural decisions |
| code-reviewer | Code quality | Review changes |
| security-reviewer | Security analysis | Vulnerability detection |
| tdd-guide | Test-driven dev | Feature implementation |
| build-error-resolver | Build fixes | TypeScript/build errors |
| e2e-runner | E2E testing | User flow testing |
| doc-updater | Documentation | Updating docs |
| refactor-cleaner | Code cleanup | Dead code removal |
| go-reviewer | Go code | Go-specific review |
| go-build-resolver | Go builds | Go build errors |
| database-reviewer | Database | Query optimization |
| typescript-reviewer | TypeScript/JS | TS/JS-specific review |
| python-reviewer | Python | Python-specific review |

## Coordination Patterns

### Fan-Out / Fan-In
```
Orchestrator ─┬─ Agent A (target-1) ─┐
              ├─ Agent B (target-2) ─┼─ Synthesizer
              └─ Agent C (target-3) ─┘
```
Use: identical task across multiple independent targets

### Split-Role
```
Orchestrator ─┬─ Implementer (build it)
              ├─ Critic (find issues)
              └─ Security (find vulns)
                       ↓ reconcile
```
Use: same task, different perspectives needed

### Explorer + Validator
```
Phase 1: Explorer → findings
Phase 2: Validator → verified-findings
Phase 3: Implementer → uses verified-findings
```
Use: unknown codebase, uncertain requirements

### Worktree Isolation
```
Orchestrator ─┬─ Agent A (isolation: worktree, feature/A)
              ├─ Agent B (isolation: worktree, feature/B)
              └─ Agent C (isolation: worktree, fix/C)
                       ↓ review + merge diffs
```
Use: parallel independent write operations

### Sequential Pipeline
```
planner → tdd-guide → implementer → code-reviewer → security-reviewer
```
Use: each phase depends on the previous output

## Execution Plan Format

### Selected Pattern: [pattern-name]
**Justification:** [why this pattern fits the task]

### Phase 1: [Name] — [parallel|sequential]
- Agent: [agent-name]
- Task: [specific task]
- Depends on: [none or previous phase]
- isolation: [worktree|none]

### Phase 2: [Name] (parallel)
- Agent A: [agent-name] — [task]
- Agent B: [agent-name] — [task]
- Depends on: Phase 1

### Phase N: Synthesis
- Combine results from Phase N-1
- Generate unified output

## Coordination Rules

1. **Pattern first** — select and justify pattern before planning
2. **Parallelize by default** — only serialize when there's a dependency
3. **Worktree for writes** — use `isolation: "worktree"` for any agent that modifies files
4. **Minimal context per agent** — pass only what the agent needs
5. **Synthesize explicitly** — always produce a unified final output
6. **Fail gracefully** — if one agent fails, complete others and report partial results
7. **Conflict detection mandatory** — compare outputs for contradictions; resolve via priority hierarchy; never silently apply a lower-priority recommendation

---

**See also:** Skill `multi-agent-coordination` for full pattern specifications.
**Conflict resolution:** Skill `agent-conflict-resolution` for priority hierarchy and decision trees.

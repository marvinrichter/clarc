---
name: autonomous-loops
description: "Autonomous loop patterns for Claude — sequential pipelines, NanoClaw REPL, infinite agentic loops, continuous PR loops, De-Sloppify, and Ralphinho RFC-driven DAG orchestration. Pattern selection matrix and anti-patterns."
---

# Autonomous Loops Skill

Patterns, architectures, and reference implementations for running Claude Code autonomously in loops. Covers everything from simple `claude -p` pipelines to full RFC-driven multi-agent DAG orchestration.

## When to Use

- Setting up autonomous development workflows that run without human intervention
- Choosing the right loop architecture for your problem (simple vs complex)
- Building CI/CD-style continuous development pipelines
- Running parallel agents with merge coordination
- Implementing context persistence across loop iterations
- Adding quality gates and cleanup passes to autonomous workflows

## Loop Pattern Spectrum

From simplest to most sophisticated:

| Pattern | Complexity | Best For |
|---------|-----------|----------|
| [Sequential Pipeline](#1-sequential-pipeline-claude--p) | Low | Daily dev steps, scripted workflows |
| [NanoClaw REPL](#2-nanoclaw-repl) | Low | Interactive persistent sessions |
| [Infinite Agentic Loop](#3-infinite-agentic-loop) | Medium | Parallel content generation, spec-driven work |
| [Continuous Claude PR Loop](#4-continuous-claude-pr-loop) | Medium | Multi-day iterative projects with CI gates |
| [De-Sloppify Pattern](#5-the-de-sloppify-pattern) | Add-on | Quality cleanup after any Implementer step |
| [Ralphinho / RFC-Driven DAG](#6-ralphinho--rfc-driven-dag-orchestration) | High | Large features, multi-unit parallel work with merge queue |

---

## 1. Sequential Pipeline (`claude -p`)

**The simplest loop.** Break daily development into a sequence of non-interactive `claude -p` calls. Each call is a focused step with a clear prompt.

### Core Insight

> If you can't figure out a loop like this, it means you can't even drive the LLM to fix your code in interactive mode.

The `claude -p` flag runs Claude Code non-interactively with a prompt, exits when done. Chain calls to build a pipeline:

```bash
#!/bin/bash
# daily-dev.sh — Sequential pipeline for a feature branch

set -e

# Step 1: Implement the feature
claude -p "Read the spec in docs/auth-spec.md. Implement OAuth2 login in src/auth/. Write tests first (TDD). Do NOT create any new documentation files."

# Step 2: De-sloppify (cleanup pass)
claude -p "Review all files changed by the previous commit. Remove any unnecessary type tests, overly defensive checks, or testing of language features (e.g., testing that TypeScript generics work). Keep real business logic tests. Run the test suite after cleanup."

# Step 3: Verify
claude -p "Run the full build, lint, type check, and test suite. Fix any failures. Do not add new features."

# Step 4: Commit
claude -p "Create a conventional commit for all staged changes. Use 'feat: add OAuth2 login flow' as the message."
```

### Quick Start

```bash
#!/bin/bash
# minimal-pipeline.sh — run this to start a sequential pipeline
set -e

SPEC="${1:-docs/feature-spec.md}"   # pass spec file as first arg

claude -p "Read ${SPEC}. Implement the feature using TDD. Write tests first."
claude -p "Review all changed files. Remove redundant type tests and dead code. Run the test suite."
claude -p "Run: npm run build && npm test && npm run lint. Fix any failures. Do not add features."
claude -p "Create a conventional commit for staged changes. Use the spec filename as context."

echo "Pipeline complete."
```

### Key Design Principles

1. **Each step is isolated** — A fresh context window per `claude -p` call means no context bleed between steps.
2. **Order matters** — Steps execute sequentially. Each builds on the filesystem state left by the previous.
3. **Negative instructions are dangerous** — Don't say "don't test type systems." Instead, add a separate cleanup step (see [De-Sloppify Pattern](#5-the-de-sloppify-pattern)).
4. **Exit codes propagate** — `set -e` stops the pipeline on failure.

### Variations

**With model routing:**
```bash
# Research with Opus (deep reasoning)
claude -p --model opus "Analyze the codebase architecture and write a plan for adding caching..."

# Implement with Sonnet (fast, capable)
claude -p "Implement the caching layer according to the plan in docs/caching-plan.md..."

# Review with Opus (thorough)
claude -p --model opus "Review all changes for security issues, race conditions, and edge cases..."
```

**With environment context:**
```bash
# Pass context via files, not prompt length
echo "Focus areas: auth module, API rate limiting" > .claude-context.md
claude -p "Read .claude-context.md for priorities. Work through them in order."
rm .claude-context.md
```

**With `--allowedTools` restrictions:**
```bash
# Read-only analysis pass
claude -p --allowedTools "Read,Grep,Glob" "Audit this codebase for security vulnerabilities..."

# Write-only implementation pass
claude -p --allowedTools "Read,Write,Edit,Bash" "Implement the fixes from security-audit.md..."
```

---

## 2. NanoClaw REPL

**clarc's built-in persistent loop.** A session-aware REPL that calls `claude -p` synchronously with full conversation history.

```bash
# Start the default session
node scripts/claw.js

# Named session with skill context
CLAW_SESSION=my-project CLAW_SKILLS=tdd-workflow,security-review node scripts/claw.js
```

### How It Works

1. Loads conversation history from `~/.claude/claw/{session}.md`
2. Each user message is sent to `claude -p` with full history as context
3. Responses are appended to the session file (Markdown-as-database)
4. Sessions persist across restarts

### When NanoClaw vs Sequential Pipeline

| Use Case | NanoClaw | Sequential Pipeline |
|----------|----------|-------------------|
| Interactive exploration | Yes | No |
| Scripted automation | No | Yes |
| Session persistence | Built-in | Manual |
| Context accumulation | Grows per turn | Fresh each step |
| CI/CD integration | Poor | Excellent |

### Quick Start

```bash
# Start a named NanoClaw session with skill context injected
CLAW_SESSION=my-feature CLAW_SKILLS=tdd-workflow node scripts/claw.js

# Or start an unnamed default session (history in ~/.claude/claw/default.md)
node scripts/claw.js

# View session history
cat ~/.claude/claw/my-feature.md
```

See the `/claw` command documentation for full details.

---

## 3. Infinite Agentic Loop

**A two-prompt system** that orchestrates parallel sub-agents for specification-driven generation. Developed by disler (credit: @disler).

### The Pattern

1. **Spec Analysis** — Orchestrator reads a Markdown spec defining what to generate
2. **Directory Recon** — Scans existing output to find the highest iteration number
3. **Parallel Deployment** — Launches N sub-agents, each with the full spec, a unique creative direction, a specific iteration number, and a snapshot of existing iterations
4. **Wave Management** — For infinite mode, deploys waves of 3-5 agents until context is exhausted

### Implementation via Claude Code Commands

Create `.claude/commands/infinite.md`:

```markdown
Parse from $ARGUMENTS: spec_file, output_dir, count (integer or "infinite")

PHASE 1: Read and deeply understand the specification.
PHASE 2: List output_dir, find highest iteration number. Start at N+1.
PHASE 3: Plan creative directions — each agent gets a DIFFERENT theme/approach.
PHASE 4: Deploy sub-agents in parallel (Task tool). Each receives full spec,
  directory snapshot, assigned iteration number, and unique creative direction.
PHASE 5 (infinite mode): Loop in waves of 3-5 until context is low.
```

**Invoke:**
```bash
/project:infinite specs/component-spec.md src/ 5
/project:infinite specs/component-spec.md src/ infinite
```

### Quick Start

```bash
# 1. Create the command file (one-time setup)
mkdir -p .claude/commands
cat > .claude/commands/infinite.md << 'EOF'
Parse from $ARGUMENTS: spec_file, output_dir, count (integer or "infinite")
PHASE 1: Read and deeply understand the specification.
PHASE 2: List output_dir, find highest iteration number. Start at N+1.
PHASE 3: Plan creative directions — each agent gets a DIFFERENT theme/approach.
PHASE 4: Deploy sub-agents in parallel (Task tool). Each receives full spec,
  directory snapshot, assigned iteration number, and unique creative direction.
PHASE 5 (infinite mode): Loop in waves of 3-5 until context is low.
EOF

# 2. Invoke — generate 5 component variants from a spec
/project:infinite specs/button-spec.md src/components/ 5

# 3. Infinite mode — runs until context is exhausted
/project:infinite specs/test-cases-spec.md tests/ infinite
```

### Key Insight: Uniqueness via Assignment

Don't rely on agents to self-differentiate. The orchestrator **assigns** each agent a specific creative direction and iteration number. This prevents duplicate concepts across parallel agents.

---

## 4. Continuous Claude PR Loop

**A production-grade shell script** that runs Claude Code in a continuous loop, creating PRs, waiting for CI, and merging automatically. Created by AnandChowdhary (credit: @AnandChowdhary).

### Core Loop

```plantuml
@startuml
start
:Create branch (continuous-claude/iteration-N);
:Run claude -p with enhanced prompt;
:Reviewer pass (optional);
:Commit changes;
:Push + create PR;
:Wait for CI checks;
if (CI failure?) then (yes)
  :Auto-fix pass — claude -p;
  -> back to wait;
  :Wait for CI checks;
endif
:Merge PR;
-> repeat;
:Return to main;
stop
note right
  Limit by: --max-runs N | --max-cost $X
  --max-duration 2h | completion signal
end note
@enduml
```

### Quick Start

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/AnandChowdhary/continuous-claude/HEAD/install.sh | bash

# Run: fix all linter errors, up to 5 iterations, cost cap $3
continuous-claude \
  --prompt "Fix all ESLint errors across the codebase. Run npm run lint after each fix." \
  --max-runs 5 \
  --max-cost 3.00 \
  --completion-signal "CONTINUOUS_CLAUDE_PROJECT_COMPLETE"
```

### Installation

```bash
curl -fsSL https://raw.githubusercontent.com/AnandChowdhary/continuous-claude/HEAD/install.sh | bash
```

### Usage

```bash
# Basic: 10 iterations
continuous-claude --prompt "Add unit tests for all untested functions" --max-runs 10

# Cost-limited
continuous-claude --prompt "Fix all linter errors" --max-cost 5.00

# Time-boxed
continuous-claude --prompt "Improve test coverage" --max-duration 8h

# With code review pass
continuous-claude \
  --prompt "Add authentication feature" \
  --max-runs 10 \
  --review-prompt "Run npm test && npm run lint, fix any failures"

# Parallel via worktrees
continuous-claude --prompt "Add tests" --max-runs 5 --worktree tests-worker &
continuous-claude --prompt "Refactor code" --max-runs 5 --worktree refactor-worker &
wait
```

### Cross-Iteration Context: SHARED_TASK_NOTES.md

The critical innovation: a `SHARED_TASK_NOTES.md` file persists across iterations:

```markdown
## Progress
- [x] Added tests for auth module (iteration 1)
- [x] Fixed edge case in token refresh (iteration 2)
- [ ] Still need: rate limiting tests, error boundary tests

## Next Steps
- Focus on rate limiting module next
- The mock setup in tests/helpers.ts can be reused
```

Claude reads this file at iteration start and updates it at iteration end. This bridges the context gap between independent `claude -p` invocations.

### CI Failure Recovery

When PR checks fail, Continuous Claude automatically:
1. Fetches the failed run ID via `gh run list`
2. Spawns a new `claude -p` with CI fix context
3. Claude inspects logs via `gh run view`, fixes code, commits, pushes
4. Re-waits for checks (up to `--ci-retry-max` attempts)

### Completion Signal

Claude can signal "I'm done" by outputting a magic phrase:

```bash
continuous-claude \
  --prompt "Fix all bugs in the issue tracker" \
  --completion-signal "CONTINUOUS_CLAUDE_PROJECT_COMPLETE" \
  --completion-threshold 3  # Stops after 3 consecutive signals
```

Three consecutive iterations signaling completion stops the loop, preventing wasted runs on finished work.

### Key Configuration

| Flag | Purpose |
|------|---------|
| `--max-runs N` | Stop after N successful iterations |
| `--max-cost $X` | Stop after spending $X |
| `--max-duration 2h` | Stop after time elapsed |
| `--merge-strategy squash` | squash, merge, or rebase |
| `--worktree <name>` | Parallel execution via git worktrees |
| `--disable-commits` | Dry-run mode (no git operations) |
| `--review-prompt "..."` | Add reviewer pass per iteration |
| `--ci-retry-max N` | Auto-fix CI failures (default: 1) |

---

## 5. The De-Sloppify Pattern

**An add-on pattern for any loop.** Add a dedicated cleanup/refactor step after each Implementer step.

### The Problem

When you ask an LLM to implement with TDD, it over-generates:
- Tests that verify TypeScript's type system rather than business logic
- Overly defensive runtime checks the type system already guarantees
- Excessive error handling that obscures actual code

Adding negative instructions ("don't test type systems") makes the model hesitant about ALL testing, degrading quality unpredictably. Instead, let the Implementer be thorough, then add a focused cleanup agent:

```bash
# Step 1: Implement (let it be thorough)
claude -p "Implement the feature with full TDD. Be thorough with tests."

# Step 2: De-sloppify (separate context, focused cleanup)
claude -p "Review all changes in the working tree. Remove:
- Tests that verify language/framework behavior rather than business logic
- Redundant type checks that the type system already enforces
- Over-defensive error handling for impossible states
- Console.log statements and commented-out code

Keep all business logic tests. Run the test suite after cleanup."
```

### Quick Start

```bash
#!/bin/bash
# de-sloppify.sh — run after any implement step
set -e

BRANCH="${1:-HEAD}"

# Step 1: implement (already done — this script runs after)
echo "Running De-Sloppify cleanup pass on branch: ${BRANCH}"

# Step 2: dedicated cleanup agent in a fresh context
claude -p "Review all files changed since $(git merge-base main ${BRANCH}).
Remove:
- Tests that verify TypeScript generics or JavaScript language behavior (not business logic)
- Redundant null checks the type system already rules out
- console.log and commented-out code
- Overly defensive error handling for impossible states
Keep all business logic tests intact. Run: npm test after cleanup."

echo "De-Sloppify complete. Run: git diff to review."
```

### Key Insight

> Two focused agents (Implementer + De-Sloppify) outperform one constrained agent with negative instructions.

---

## 6. Ralphinho / RFC-Driven DAG Orchestration

**The most sophisticated pattern.** An RFC-driven, multi-agent pipeline that decomposes a spec into a dependency DAG, runs each unit through a tiered quality pipeline, and lands them via an agent-driven merge queue. Created by enitrat (credit: @enitrat).

**Flow:** RFC/PRD → AI decomposition into work units + dependency DAG → parallel quality pipelines per unit (each in own worktree) → merge queue (rebase → test → land or evict with context).

### RFC Decomposition

AI reads the RFC and produces work units:

```typescript
interface WorkUnit {
  id: string;              // kebab-case identifier
  name: string;            // Human-readable name
  rfcSections: string[];   // Which RFC sections this addresses
  description: string;     // Detailed description
  deps: string[];          // Dependencies (other unit IDs)
  acceptance: string[];    // Concrete acceptance criteria
  tier: "trivial" | "small" | "medium" | "large";
}
```

**Decomposition Rules:**
- Prefer fewer, cohesive units (minimize merge risk)
- Minimize cross-unit file overlap (avoid conflicts)
- Keep tests WITH implementation (never separate "implement X" + "test X")
- Dependencies only where real code dependency exists

The dependency DAG determines execution order:
```
Layer 0: [unit-a, unit-b]     ← no deps, run in parallel
Layer 1: [unit-c]             ← depends on unit-a
Layer 2: [unit-d, unit-e]     ← depend on unit-c
```

### Complexity Tiers

Different tiers get different pipeline depths:

| Tier | Pipeline Stages |
|------|----------------|
| **trivial** | implement → test |
| **small** | implement → test → code-review |
| **medium** | research → plan → implement → test → PRD-review + code-review → review-fix |
| **large** | research → plan → implement → test → PRD-review + code-review → review-fix → final-review |

This prevents expensive operations on simple changes while ensuring architectural changes get thorough scrutiny.

### Separate Context Windows (Author-Bias Elimination)

Each stage runs in its own agent process with its own context window:

| Stage | Model | Purpose |
|-------|-------|---------|
| Research | Sonnet | Read codebase + RFC, produce context doc |
| Plan | Opus | Design implementation steps |
| Implement | claude-sonnet-latest | Write code following the plan |
| Test | Sonnet | Run build + test suite |
| PRD Review | Sonnet | Spec compliance check |
| Code Review | Opus | Quality + security check |
| Review Fix | claude-sonnet-latest | Address review issues |
| Final Review | Opus | Quality gate (large tier only) |

**Critical design:** The reviewer never wrote the code it reviews. This eliminates author bias — the most common source of missed issues in self-review.

### Merge Queue with Eviction

After quality pipelines complete, each unit branch: rebases onto main → runs build + tests → if clean, fast-forward merges; if conflict or test failure, **evicts** with full context (diffs, test output) fed back to the implementer on the next Ralph pass.

**File Overlap Intelligence:** Non-overlapping units land speculatively in parallel; overlapping units land one-by-one, rebasing each time.

### Worktree Isolation

Every unit runs in an isolated worktree (`/tmp/workflow-wt-{unit-id}/`). Stages for the same unit share a worktree, preserving context files, plan files, and code changes across research → plan → implement → test → review.

### Quick Start

```bash
# 1. Write an RFC document (e.g., docs/rfcs/auth-refactor.md)
# 2. Run the Ralphinho orchestrator pointing at your RFC
claude -p "
Read docs/rfcs/auth-refactor.md.
Decompose into work units with a dependency DAG (JSON format: id, deps[], tier, acceptance[]).
For each layer in the DAG, launch parallel sub-agents (Task tool) in isolated worktrees.
Each sub-agent runs the pipeline for its tier (trivial→implement+test; medium→research+plan+implement+test+review).
After all units complete, run the merge queue: rebase each branch onto main, run tests, fast-forward merge or evict with context.
Output: list of merged branches and any evicted units with reasons.
"
```

### Key Design Principles

1. **Deterministic execution** — Upfront decomposition locks in parallelism and ordering
2. **Separate concerns** — Each stage in its own context window; the reviewer never wrote the code
3. **Conflict recovery with context** — Full eviction context enables intelligent re-runs, not blind retries
4. **Tier-driven depth** — Trivial changes skip research/review; large changes get maximum scrutiny
5. **Resumable workflows** — Full state persisted to SQLite; resume from any point

### When to Use Ralphinho vs Simpler Patterns

| Signal | Use Ralphinho | Use Simpler Pattern |
|--------|--------------|-------------------|
| Multiple interdependent work units | Yes | No |
| Need parallel implementation | Yes | No |
| Merge conflicts likely | Yes | No (sequential is fine) |
| Single-file change | No | Yes (sequential pipeline) |
| Multi-day project | Yes | Maybe (continuous-claude) |
| Spec/RFC already written | Yes | Maybe |
| Quick iteration on one thing | No | Yes (NanoClaw or pipeline) |

---

## Choosing the Right Pattern

### Decision Matrix

```plantuml
@startuml
start
if (Single focused change?) then (yes)
  :Sequential Pipeline\nor NanoClaw;
  stop
else (no)
  if (Written spec/RFC?) then (yes)
    if (Need parallel implementation?) then (yes)
      :Ralphinho\n(DAG orchestration);
      stop
    else (no)
      :Continuous Claude\n(iterative PR loop);
      stop
    endif
  else (no)
    if (Many variations of the same thing?) then (yes)
      :Infinite Agentic Loop\n(spec-driven generation);
      stop
    else (no)
      :Sequential Pipeline\n+ de-sloppify;
      stop
    endif
  endif
endif
@enduml
```

### Combining Patterns

These patterns compose well:

1. **Sequential Pipeline + De-Sloppify** — The most common combination. Every implement step gets a cleanup pass.

2. **Continuous Claude + De-Sloppify** — Add `--review-prompt` with a de-sloppify directive to each iteration.

3. **Any loop + Verification** — Use clarc's `/verify` command or `verification-loop` skill as a gate before commits.

4. **Ralphinho's tiered approach in simpler loops** — Even in a sequential pipeline, you can route simple tasks to Haiku and complex tasks to Opus:
   ```bash
   # Simple formatting fix
   claude -p --model haiku "Fix the import ordering in src/utils.ts"

   # Complex architectural change
   claude -p --model opus "Refactor the auth module to use the strategy pattern"
   ```

---

## Anti-Patterns

### Common Mistakes

1. **Infinite loops without exit conditions** — Always have a max-runs, max-cost, max-duration, or completion signal.

2. **No context bridge between iterations** — Each `claude -p` call starts fresh. Use `SHARED_TASK_NOTES.md` or filesystem state to bridge context.

3. **Retrying the same failure** — If an iteration fails, don't just retry. Capture the error context and feed it to the next attempt.

4. **Negative instructions instead of cleanup passes** — Don't say "don't do X." Add a separate pass that removes X.

5. **All agents in one context window** — For complex workflows, separate concerns into different agent processes. The reviewer should never be the author.

6. **Ignoring file overlap in parallel work** — If two parallel agents might edit the same file, you need a merge strategy (sequential landing, rebase, or conflict resolution).

---

## References

| Project | Author | Link |
|---------|--------|------|
| Ralphinho | enitrat | credit: @enitrat |
| Infinite Agentic Loop | disler | credit: @disler |
| Continuous Claude | AnandChowdhary | credit: @AnandChowdhary |
| NanoClaw | clarc | `/claw` command in this repo |
| Verification Loop | clarc | `skills/verification-loop/` in this repo |

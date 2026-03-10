# clarc Command System Audit — 2026-03-10

**Total commands inventoried:** 160 (152 at audit time, 8 new added this session)
**Commands deep-audited:** 42
**Overall ergonomics score: 7.6 / 10**

---

## Dimension Scores

| Dimension | Score | Note |
|-----------|-------|------|
| Naming Consistency | 7.0 | Mostly kebab-case; `agent-review` breaks `*-audit` pattern; `whats-the-rule` is natural-language; `instinct-projects.md` registers as `/projects` (frontmatter mismatch); `*-test` family has semantic split |
| Built-in Conflicts | 9.0 | No direct conflicts; `session-cost` correctly avoids reserved `/cost`; minor near-miss: `eval` could confuse with `/evaluate` |
| Overlap Detection | 6.5 | `deps` vs `dep-audit` share ~60% functional surface; `discover` vs `brainstorm` share ~70% ideation purpose |
| Missing Commands | 7.0 | 8 language-reviewer agents lacked commands (now fixed: kotlin, flutter, php, csharp, bash, scala, c, r) |
| Argument Design | 7.5 | High-quality commands (`deps`, `incident`, `evaluate`, `release`) document args clearly; low-quality tail (`skill-impact`) use bare $ARGUMENTS with no format |
| Feedback Loop | 8.0 | Most commands show progress, produce structured summaries, and suggest next steps |
| Step Count | 7.5 | `tdd.md` is 327 lines (tutorial reference, not concise command); `code-review.md` is 17 lines (minimal delegation, works but thin) |
| Agent Invocation | 8.0 | Most delegations explicit and agent names verified; `skill-impact` and `update-docs` self-implement without named agent |

---

## P0 Issues — Must Fix Immediately

| # | Command | Dimension | Finding | Suggestion |
|---|---------|-----------|---------|------------|
| 1 | `instinct-projects.md` | Naming | `name: projects` in frontmatter registers as `/projects`, not `/instinct-projects`. Desynchronized from filename. | Change frontmatter to `name: instinct-projects`. |
| 2 | `e2e.md` | Content quality | Lines 287-330 contain "PMX-Specific Critical Flows" with hardcoded PMX features (wallet, trading markets). Leaked project-specific content. | Delete lines 287-330. Generic Playwright best practices already cover the use case. |
| 3 | `multi-workflow.md` | Naming | Internal usage docs say `/workflow <task>` but the file is `multi-workflow.md`. Users who try `/workflow` get an error. | Either rename to `workflow.md` or fix usage line to say `/multi-workflow <task>`. |

---

## P1 Issues — Fix in Next Sprint

| # | Command | Dimension | Finding | Suggestion |
|---|---------|-----------|---------|------------|
| 4 | `agent-review` | Naming | 9 self-inspection commands use `*-audit` suffix pattern. `agent-review` breaks this. Users cannot predict the command name. | Rename to `agent-audit.md`. Update all cross-references. |
| 5 | `deps` vs `dep-audit` | Overlap | Both audit dependencies for vulnerabilities. ~60% functional overlap with no clear differentiation. | Add "Not covered here — use /dep-audit" callout in deps, and vice versa. |
| 6 | `discover` vs `brainstorm` | Overlap | Both take a problem space and generate product ideas. ~70% purpose overlap. | Update discover to lead with "From external market data"; brainstorm to lead with "From structured ideation frameworks". Add cross-references. |
| 7 | `whats-the-rule` | Naming | Natural-language question name, not verb-noun convention. Hard to type. | Rename to `rule-lookup.md`. |
| 8 | `*-test` semantic split | Naming | `go-test` and `rust-test` enforce TDD. `python-test` just runs tests. Same pattern, different semantics. | Update `python-test` to enforce TDD matching `go-test`/`rust-test`. |
| 9 | Language reviewer commands gap | Missing | 8 agents existed without commands at audit time (now fixed this session: kotlin-review, flutter-review, php-review, csharp-review, bash-review, scala-review, c-review, r-review). | Completed. |
| 10 | `skill-impact.md` | Structure | Only command without a `#` heading. Starts with bare instruction text. | Add `# Skill Impact` heading and "What This Command Does" paragraph. |
| 11 | `build-fix.md`, `refactor.md` | Agent Invocation | Both self-implement instead of delegating to the corresponding agents (`build-error-resolver`, `refactor-cleaner`). | Add explicit agent delegation in both command files. |

---

## Top 3 Best-Designed Commands (Templates)

| Rank | Command | Why It Excels |
|------|---------|---------------|
| 1 | `/incident` | Multi-mode argument design: handles open incident, post-mortem, runbook in one command. Five distinct steps with human-readable output. Production artifacts (status page + Slack) are first-class outputs. |
| 2 | `/release` | Shows plan before execution with confirmation gate. Auto-detects version bump from conventional commits. Touches all necessary files (CHANGELOG, version, git tag, GitHub Release). Clear next steps. |
| 3 | `/evaluate` | Clear argument contract: three distinct cases (exact name, partial match, empty). Graceful fallback with actionable errors ("Run /idea first"). Delegates cleanly to `product-evaluator` with full context. |

---

## Summary Table (Sampled Commands)

| Command | Lines | Steps | Agent Delegation | Notable Issues |
|---------|-------|-------|-----------------|----------------|
| `tdd` | 327 | 8 | tdd-guide | Tutorial-length; works but not scannable |
| `code-review` | 17 | 5 | code-reviewer | Very lean — appropriate given delegation |
| `e2e` | 364 | 6 | e2e-runner | P0: PMX-specific content lines 287-330 |
| `evaluate` | 72 | 5 | product-evaluator | Best practice template |
| `explore` | 71 | 5 | solution-designer | Excellent consistency with evaluate |
| `incident` | 157 | 8 | None (self-implements) | Best-in-class multi-mode design |
| `release` | 160 | 9 | None (self-implements) | Best-in-class argument design |
| `instinct-projects` | 39 | 3 | None | P0: name: projects mismatch |
| `multi-workflow` | 197 | 6 | None | P0: /workflow vs /multi-workflow |
| `whats-the-rule` | 76 | 5 | None | P1: violates verb-noun convention |
| `agent-review` | ~40 | 3 | agent-quality-reviewer | P1: should be agent-audit |
| `skill-impact` | 36 | 4 | None | P1: no heading, no next-step |
| `discover` | ~60 | 5 | competitive-analyst (partial) | P1: overlaps brainstorm |
| `brainstorm` | ~60 | 5 | None | P1: overlaps discover |

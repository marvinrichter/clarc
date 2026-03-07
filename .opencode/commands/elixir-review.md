---
description: Comprehensive Elixir/Phoenix code review for OTP patterns, Ecto queries, security (Sobelow), and idiomatic functional Elixir. Invokes the elixir-reviewer agent.
---

# Elixir Code Review

Invoke the **elixir-reviewer** agent to perform a comprehensive review of recent Elixir changes.

## What Gets Reviewed

- OTP patterns: GenServer correctness, Supervisor tree design
- Ecto: N+1 queries, missing indexes, unsafe raw queries
- Phoenix: context boundary violations, LiveView lifecycle issues
- Security: Sobelow findings, SQL injection via raw queries, mass assignment
- Idiomatic Elixir: pattern matching, pipe operator usage, function clauses

## Instructions

Delegate immediately to the **elixir-reviewer** agent with full context of:
1. The files changed (run `git diff --name-only` to determine scope)
2. Any specific areas the user wants focused on (from `$ARGUMENTS`)
3. Phoenix/LiveView context if applicable

Pass `$ARGUMENTS` verbatim to the agent as the focus hint.

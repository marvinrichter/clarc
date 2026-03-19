# Changelog

All notable changes to clarc are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [Semantic Versioning](https://semver.org/)

---

## [1.0.0] — 2026-03-19

First public release.

### What's in the box

**62 agents** — specialist subagents covering every phase of the development lifecycle: planning, TDD, code review (12 language-specific reviewers), security, E2E testing, architecture, documentation, and more.

**248 skills** — deep workflow reference for specific tasks: framework patterns (Spring Boot, Django, Go, TypeScript, React, Flutter, Rust, …), testing strategies, DDD, event-driven architecture, observability, FinOps, and more.

**172 commands** — slash commands for the full workflow: `/plan`, `/tdd`, `/code-review`, `/security-review`, `/e2e`, `/commit-push-pr`, `/doctor`, `/quickstart`, and many more.

**20 language rule sets** — always-on guidelines for TypeScript, Python, Go, Java, Swift, Rust, C++, Ruby, Elixir, Kotlin, Scala, PHP, C#, R, C, Dart, and common cross-language rules.

**Continuous learning flywheel** — instinct system that extracts patterns from sessions and promotes them to skills, commands, and agents over time.

**Multi-editor support** — Claude Code (primary), Cursor, OpenCode, Codex.

### The clarc Way

A complete opinionated methodology ships with clarc:

```
Phase 0: Discovery        /idea → /evaluate → /explore → /prd
Phase 1: Planning         /plan
Phase 2: Implementation   /tdd  (RED → GREEN → IMPROVE)
Phase 3: Quality          /code-review  +  /security-review
Phase 4: Ship             /commit-push-pr
```

### Install

```bash
npx github:marvinrichter/clarc
```

### Attribution

clarc is a heavily extended fork of [everything-claude-code](https://github.com/affaan-m/everything-claude-code) by Affaan Mustafa, released under the MIT License.

---

[1.0.0]: https://github.com/marvinrichter/clarc/releases/tag/v1.0.0

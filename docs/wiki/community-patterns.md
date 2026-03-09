# Community Patterns

Proven clarc workflows contributed by the community. These are real-world usage patterns that go beyond the default methodology.

> **Contributing:** Share your workflow in [GitHub Discussions → Community Patterns](https://github.com/marvinrichter/clarc/discussions). High-quality patterns may be promoted into official skills or commands.

---

## Pattern Template

When sharing a community pattern, include:

```markdown
## Pattern Name
**Contributed by:** @username
**Context:** What kind of project / team / situation this applies to
**Problem:** What challenge this solves

### Workflow
Step-by-step commands and what to expect

### Why it works
Brief explanation of the reasoning

### Variations
Adaptations for different contexts
```

---

## Example Patterns (Seed Content)

### Solo Developer Daily Loop

**Context:** Solo developer, no PR reviews, ship fast
**Problem:** Full clarc-way pipeline is too heavy for one person moving fast

```
Morning:
/sessions          → resume yesterday's context

Feature work:
/plan              → 5-minute planning
/tdd               → implement with tests
/commit            → ship

End of day:
/learn-eval        → extract session learnings
```

Skip `/code-review` if you're moving fast — run it weekly in batch instead.

---

### Team Code Review Workflow

**Context:** Team of 3–8 engineers, async review
**Problem:** Every PR review covers the same issues repeatedly

```
Before opening PR:
/code-review       → fix issues Claude finds (so humans don't have to)
/security          → if touching auth/APIs
/commit-push-pr    → opens PR with test plan pre-filled

PR description template:
- Auto-filled by /commit-push-pr
- Reviewer focus: business logic only (style/security already reviewed)
```

Result: PRs merge 40% faster because trivial feedback is eliminated.

---

### Monorepo Multi-Language Workflow

**Context:** TypeScript frontend + Go backend in one repo
**Problem:** Language-specific reviewers need to be invoked correctly

```
Frontend changes:
/typescript-review

Backend changes:
/go-review

Shared API changes:
/code-review       → routes to both reviewers automatically
/api-contract      → check for breaking changes
```

---

### Weekly Maintenance Loop

**Context:** Any project, ongoing maintenance
**Problem:** Technical debt accumulates without a regular cleanup cycle

```
Monday:
/instinct-status   → see what clarc learned last week

Wednesday:
/deps              → check for vulnerable or outdated packages

Friday:
/debt-audit        → surface top 3 tech debt items
/learn-eval        → extract week's learnings
/evolve            → promote stable instincts to skills
```

---

## Submit Your Pattern

Share in [GitHub Discussions](https://github.com/marvinrichter/clarc/discussions) under **Community Patterns**.

Patterns that get 10+ upvotes will be considered for promotion into official clarc skills or commands.

---
description: Write a full article draft from an outline. Applies voice, banned-pattern rules, and section-by-section discipline. Third step of the article writing workflow.
---

# Article Draft

Turn a structured outline into a full prose draft.

## Usage

```
/article-draft                          — uses outline from current conversation
/article-draft docs/outline.md          — reads outline from file
/article-draft docs/outline.md --voice docs/voice-examples.md
```

## Steps

1. Read the outline (from conversation or file); read voice examples if `--voice` is provided
2. Apply the `article-writing` skill:
   - If voice examples are given, run the Voice Capture Workflow first
   - Write each section in order — start every section with the evidence or example from the outline
   - Apply all Banned Patterns rules as you write (not as a post-pass)
   - Do not invent facts, metrics, or biographical details
3. Output the complete draft in Markdown
4. Append a self-check summary:

```
## Draft Self-Check

- [ ] Every section starts with evidence or example (not explanation)
- [ ] No banned patterns found
- [ ] Voice matches examples (or defaults to operator-style)
- [ ] Opening does not announce the article's contents
- [ ] CTA is specific and singular
```

## After This

- `/article-review` — get editorial critique from the article-editor agent
- `/article-polish` — skip review and go straight to final polish
- `/article` — run the full pipeline from the start

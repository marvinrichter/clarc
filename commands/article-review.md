---
description: Editorial critique for an article draft — structure, opening, voice, evidence, banned patterns, SEO basics. Delegates to the article-editor agent. Fourth step of the article writing workflow.
---

# Article Review

Get structured, actionable editorial feedback on your draft before publishing.

## Usage

```
/article-review                         — reviews draft from current conversation
/article-review docs/draft.md           — reads draft from file
/article-review docs/draft.md structure — focuses on structure only
/article-review docs/draft.md opening   — focuses on opening only
/article-review docs/draft.md seo       — focuses on SEO only
```

Pass `$ARGUMENTS` as an optional focus area. Without a focus, all six dimensions are reviewed.

## Focus Areas

| Focus | What gets reviewed |
|---|---|
| `structure` | Thesis, section logic, argument flow |
| `opening` | Hook, promise, first-paragraph strength |
| `voice` | Tone consistency, banned patterns |
| `evidence` | Unsupported claims, missing examples |
| `closing` | Takeaways, CTA clarity |
| `seo` | Title, meta description, headings, first paragraph keywords |

## Steps

1. Read the draft (from conversation or file)
2. Ask for any missing context: audience, platform, voice references, article goal
3. Delegate to the `article-editor` agent with the draft and context
4. Return the agent's structured feedback

## What This Produces

Six dimensions of prose feedback, each referencing specific passages in the draft, ending with:

```
## Top 3 Changes (by impact)

1. [Most impactful change] — [Why]
2. [Second change] — [Why]
3. [Third change] — [Why]
```

If the opening is weak, the agent rewrites it as an example — not just flags it.

## After This

- `/article-polish` — apply fixes and run the final polish pass
- `/article-draft` — rewrite sections based on the feedback

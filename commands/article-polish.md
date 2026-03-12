---
description: Final polish pass on an article draft — voice check, banned-pattern removal, SEO title/meta/headings, and formatting for the target platform. Fifth and final step before publishing.
---

# Article Polish

Final pass before hitting publish: voice, SEO, formatting, and banned patterns.

## Usage

```
/article-polish                         — polishes draft from current conversation
/article-polish docs/draft.md           — reads draft from file
/article-polish docs/draft.md --voice docs/voice-examples.md
/article-polish docs/draft.md seo       — SEO pass only
/article-polish docs/draft.md voice     — voice and banned-pattern pass only
```

## Steps

1. Read the draft (from conversation or file); read voice examples if `--voice` is provided
2. Run the polish passes in order:

### Pass 1 — Banned Patterns

Find and rewrite every instance of:
- "In today's rapidly evolving landscape" (and variants)
- "game-changer", "cutting-edge", "revolutionary", "innovative", "seamless", "robust"
- "Moreover", "Furthermore", "In conclusion", "It is important to note"
- "It goes without saying"
- Any sentence that announces the article's contents instead of delivering them

For each flagged phrase: show the original line, the rewritten version, and a one-line note.

### Pass 2 — Voice Check

If voice examples are provided: verify the draft matches. Flag paragraphs that drift in tone.
If no voice examples: verify the draft is consistently direct, operator-style. Flag formal/corporate drift.

### Pass 3 — SEO

Check and fix:
- **Title tag**: target keyword present, ≤60 characters, angle is clear
- **Meta description**: 140–160 characters, matches article content, contains keyword
- **H2 headings**: descriptive and keyword-bearing where natural (not "Introduction", "Conclusion")
- **First 100 words**: target keyword appears naturally
- **Anchor text**: links use descriptive text, not "click here" or "read more"

Produce a filled SEO block at the end of the polished article:

```
## SEO

**Title tag:** [≤60 chars]
**Meta description:** [140–160 chars]
**Target keyword:** [primary keyword]
**Keyword in first 100 words:** [yes/no]
```

### Pass 4 — Platform Formatting

Apply formatting rules for the target platform:
- **Personal blog / dev.to**: standard Markdown, code blocks for all code
- **Substack**: shorter paragraphs, no more than 3 lines per paragraph
- **LinkedIn**: no Markdown headers, use line breaks, bold for key phrases
- **HN / lobste.rs**: plain prose, no promotional language, code blocks only for code

If platform is unknown, default to standard Markdown.

## Output

Return the fully polished article followed by a change summary:

```
## Changes Made

### Banned patterns removed
- [original] → [rewritten]

### Voice adjustments
- [section name]: [what changed]

### SEO additions
- Title tag: [new title]
- Meta description: [new meta]
- [any heading changes]
```

## After This

- Use the `content-engine` skill to repurpose the article into X threads, LinkedIn posts, or a newsletter
- The article is ready to publish

---
description: Turn a raw topic or notes into a structured article brief — defines audience, angle, core argument, competitive gap, and voice. First step of the article writing workflow.
---

# Article Idea

Structure a raw idea into a brief before any writing begins.

## Usage

```
/article-idea "why connection pooling matters"
/article-idea docs/notes/latency-post.md
/article-idea                                   — prompts for topic interactively
```

## Steps

1. If a file path is given, read it first; otherwise use `$ARGUMENTS` as the raw topic
2. Apply the `article-strategy` skill:
   - Ask the five First Questions (audience, platform, voice, goal, source material)
   - Do not ask questions already answered in the input
   - Offer 3 angle options with a recommendation if the angle is unclear
3. Produce the structured brief in the format defined by the skill
4. Confirm with the user before proceeding

## What This Produces

```markdown
## Article Brief

**Working title:** ...
**Audience:** ...
**Platform:** ...
**Goal:** ...
**Core argument:** ...
**Competitive gap:** ...
**Voice:** ...
**Suggested length:** ...
**Source material:** ...
```

## After This

- `/article-outline` — build a section-by-section outline from the brief
- `/article` — run the full pipeline (idea → outline → draft → review)

---
description: Full interactive article pipeline — from raw idea to publish-ready draft. Walks through idea → outline → draft → review → polish step by step, pausing for confirmation at each stage.
---

# Article

Full article pipeline — from raw idea to publish-ready draft, one step at a time.

## Usage

```
/article "why connection pooling matters"
/article docs/notes/latency-post.md
/article                                    — prompts for topic interactively
```

## Pipeline

This command runs the full workflow **interactively** — it pauses after each step and waits for your confirmation before continuing. You can stop at any point and use individual commands to resume.

```
Step 1: /article-idea    — brief (audience, angle, core argument, voice)
Step 2: /article-outline — section-by-section structure
Step 3: /article-draft   — full prose draft
Step 4: /article-review  — editorial critique (article-editor agent)
Step 5: /article-polish  — voice, banned patterns, SEO, platform formatting
```

## Steps

### Step 1 — Brief

Apply the `article-strategy` skill:
- Ask the five First Questions (audience, platform, voice, goal, source material)
- Offer 3 angle options with a recommendation if the angle is unclear
- Produce the structured brief

**Pause.** Ask: "Brief looks good? Shall we build the outline?" Wait for confirmation before continuing.

### Step 2 — Outline

Apply the `article-writing` skill — Outline Structure section:
- One thesis, max 5 sections, each with purpose + evidence + transition
- Write the opening hook in full

**Pause.** Ask: "Does this outline cover what you want to say? Any sections to add, cut, or reorder?" Wait for confirmation before continuing.

### Step 3 — Draft

Apply the `article-writing` skill — Writing Process:
- Every section starts with evidence or example
- Voice matches the brief (or operator-style default)
- No banned patterns

**Pause.** Ask: "Draft complete. Want to go straight to polish, or get editorial feedback first?"
- "feedback" → continue to Step 4
- "polish" → skip to Step 5

### Step 4 — Editorial Review (optional)

Delegate to the `article-editor` agent with the draft and brief context.
Return feedback with Top 3 Changes.

**Pause.** Ask: "Review done. Apply the changes and continue to polish?" Wait for confirmation.

If user says yes: apply the top changes to the draft, then continue to Step 5.

### Step 5 — Polish

Run `/article-polish` passes in order:
1. Banned patterns removed and rewritten
2. Voice consistency verified
3. SEO block produced (title tag, meta description, keyword check)
4. Platform formatting applied

Output the final polished article + change summary + SEO block.

**Done.** Suggest next steps:

```
The article is ready to publish.

Next:
- Use the `content-engine` skill to repurpose into X threads, LinkedIn posts, or a newsletter
- /article-review [focus] — re-review a specific dimension if needed
```

## Skipping Steps

If you already have a brief or outline, use individual commands to enter the pipeline mid-way:

| You have | Start with |
|---|---|
| Raw topic | `/article` (full pipeline) |
| Structured brief | `/article-outline` |
| Completed outline | `/article-draft` |
| First draft | `/article-review` |
| Reviewed draft | `/article-polish` |

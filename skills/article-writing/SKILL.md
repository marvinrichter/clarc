---
name: article-writing
description: Write articles, guides, blog posts, tutorials, newsletter issues, and other long-form content in a distinctive voice derived from supplied examples or brand guidance. Use when the user wants polished written content longer than a paragraph, especially when voice consistency, structure, and credibility matter.
---

# Article Writing

Write long-form content that sounds like a real person or brand, not generic AI output.

## When to Activate

- drafting blog posts, essays, launch posts, guides, tutorials, or newsletter issues
- turning notes, transcripts, or research into polished articles
- matching an existing founder, operator, or brand voice from examples
- tightening structure, pacing, and evidence in already-written long-form copy
- writing a technical post-mortem or retrospective that needs narrative structure and a clear lesson arc
- creating a launch announcement that must balance engineering detail with accessible storytelling for a mixed audience
- converting internal documentation or design docs into a publishable developer guide or case study

## Core Rules

1. Lead with the concrete thing: example, output, anecdote, number, screenshot description, or code block.
2. Explain after the example, not before.
3. Prefer short, direct sentences over padded ones.
4. Use specific numbers when available and sourced.
5. Never invent biographical facts, company metrics, or customer evidence.

## Voice Capture Workflow

If the user wants a specific voice, collect one or more of:
- published articles
- newsletters
- X / LinkedIn posts
- docs or memos
- a short style guide

Then extract:
- sentence length and rhythm
- whether the voice is formal, conversational, or sharp
- favored rhetorical devices such as parentheses, lists, fragments, or questions
- tolerance for humor, opinion, and contrarian framing
- formatting habits such as headers, bullets, code blocks, and pull quotes

If no voice references are given, default to a direct, operator-style voice: concrete, practical, and low on hype.

## Banned Patterns

Delete and rewrite any of these:
- generic openings like "In today's rapidly evolving landscape"
- filler transitions such as "Moreover" and "Furthermore"
- hype phrases like "game-changer", "cutting-edge", or "revolutionary"
- vague claims without evidence
- biography or credibility claims not backed by provided context

## Outline Structure

Before drafting, build the outline in this format:

```markdown
## Outline

**Thesis:** [One declarative sentence — what this article proves]
**Estimated length:** [word count]

### Opening
**Hook type:** [Scene / Statistic / Counterintuitive claim / Problem statement]
**Hook draft:** [Write it out — do not leave as placeholder]
**Promise:** [What the reader will get from reading — one sentence]

### Section 1: [Name]
**Purpose:** [What this section proves or establishes]
**Evidence/example:** [Specific data point, code snippet, story, or case]
**Transition:** [Bridging sentence to next section]

### Section N: [repeat]

### Closing
**Takeaway 1:** [Most important insight]
**Takeaway 2:** [Supporting insight]
**Takeaway 3:** [Actionable next step]
**CTA:** [One specific action — URL, command, repo, or next article]
```

Rules:
- Maximum 5 sections (excluding opening and closing)
- Every section has exactly one purpose — split if it has two
- No section exists without a specific piece of evidence or example
- Transitions are written out, not marked as [TBD]

## Writing Process

1. Clarify the audience and purpose (or consume the article brief from `article-strategy`).
2. Build the outline above with one purpose per section.
3. Start each section with evidence, example, or scene.
4. Expand only where the next sentence earns its place.
5. Remove anything that sounds templated or self-congratulatory.

## Structure Guidance

### Technical Guides
- open with what the reader gets
- use code or terminal examples in every major section
- end with concrete takeaways, not a soft summary

### Essays / Opinion Pieces
- start with tension, contradiction, or a sharp observation
- keep one argument thread per section
- use examples that earn the opinion

### Newsletters
- keep the first screen strong
- mix insight with updates, not diary filler
- use clear section labels and easy skim structure

## Quality Gate

Before delivering:
- verify factual claims against provided sources
- remove filler and corporate language
- confirm the voice matches the supplied examples
- ensure every section adds new information
- check formatting for the intended platform

## Example: Rewriting a Weak Opening

### Before (weak)
```
In this article, I will discuss the important topic of database connection pooling,
which is a critical concept for anyone building scalable web applications today.
Connection pooling has been around for many years and has become increasingly important.
```

**Problems:** Announces intent instead of delivering. "Important" and "critical" without evidence. Passive framing.

### After (strong)
```
Last month, a production database fell over at 3 AM because 847 API servers each opened
their own connection. The fix took 4 minutes. The postmortem took 3 days.
Here's what connection pooling actually is and why the default settings will eventually burn you.
```

**Why it works:** Opens with a scene (conflict + stakes). "Actually is" signals "the explanation you haven't gotten before." Ends with a promise that's specific to the reader's fear.

### Pattern
1. Start in a scene or with a specific, surprising number
2. Create a tension (expectation vs. reality, before vs. after)
3. Make an implicit or explicit promise: "here's what you'll understand after this"
4. Never use: "In this article...", "It is important to...", "Today we will discuss..."

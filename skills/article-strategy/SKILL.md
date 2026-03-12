---
name: article-strategy
description: Turn a raw idea into a structured article brief — defines audience, angle, core argument, competitive gap, and voice. Use before writing an outline or draft. The output of this skill is a brief that feeds directly into article-writing.
skill_family: content
related_agents:
  - article-editor
---

# Article Strategy

Turn a raw topic, note dump, or vague idea into a sharp brief before writing begins. Good briefs prevent rewrites.

## When to Activate

- user has a topic but hasn't defined the audience or angle yet
- user wants to write a blog post, essay, or guide but isn't sure what the core argument is
- user wants to avoid writing something that already exists (competitive gap check)
- turning internal notes, a talk, or a conversation into a publishable article

## First Questions (always ask — do not skip)

Collect these before producing the brief. If the user has already answered some in their message, do not re-ask:

1. **Audience** — Who reads this? (role, experience level, what they care about)
2. **Platform** — Where will it be published? (personal blog, company blog, dev.to, Substack, LinkedIn, HN)
3. **Voice** — Should it match a specific voice? If yes, ask for 1–3 examples (published articles, posts, memos)
4. **Goal** — What should the reader do or think differently after reading?
5. **Source material** — Are there notes, transcripts, research, or prior drafts to draw from?

If the user says they have no voice preference, default to: direct, operator-style — concrete, practical, no hype.

## Brief Structure

Produce the brief in this exact format:

```markdown
## Article Brief

**Working title:** [Specific, not generic. Should signal the angle, not just the topic]
**Audience:** [Role + experience level + what they already know]
**Platform:** [Where it will be published — affects tone, length, formatting norms]
**Goal:** [One sentence: what the reader thinks or does differently after reading]
**Core argument:** [One declarative sentence. Not a question. Not "this article explores..."]
**Competitive gap:** [What existing articles on this topic get wrong, skip, or miss — why this one is worth reading]
**Voice:** [2–3 adjectives + one example sentence in that voice]
**Suggested length:** [Word count range based on platform and depth]
**Source material:** [File paths or "none"]
```

## Angle Selection

If the user hasn't landed on a specific angle, offer 3 options with a recommendation:

| Option | Angle | Core argument | Best for |
|---|---|---|---|
| A | [e.g., Tutorial] | [One sentence] | [Audience segment] |
| B | [e.g., Opinion] | [One sentence] | [Audience segment] |
| C | [e.g., Case study] | [One sentence] | [Audience segment] |

Recommend one and explain why in one sentence.

## Competitive Gap Analysis

Before finalizing the brief, identify what makes this article worth reading:

- What's the most common framing of this topic? (so we can differentiate)
- What do existing articles assume that isn't true for this audience?
- What's the insight or evidence that others don't have?

If the user doesn't know, ask: "What do you know about this topic that most articles don't cover?"

## Working Title Formula

Strong working titles follow one of these patterns:

- **The Reversal**: "Why [common belief] is wrong — and what to do instead"
- **The Concrete Promise**: "How we [specific outcome] in [timeframe]"
- **The Counterintuitive Fact**: "[Surprising number or observation] about [topic]"
- **The Named Problem**: "The [specific failure mode] trap — and how to avoid it"

Avoid: "A guide to...", "Everything you need to know about...", "Introduction to..."

## Voice Capture (if examples provided)

Extract from the provided examples:

- sentence length and rhythm (short/punchy vs. long/layered)
- formal / conversational / sharp
- favored devices: parentheses, fragments, lists, rhetorical questions, em-dashes
- tolerance for humor, strong opinion, contrarian framing
- formatting habits: headers, bullets, code blocks, pull quotes

Produce one example sentence in the captured voice to confirm with the user.

## Output

After collecting answers to the First Questions, produce:
1. The completed brief
2. (If angle not fixed) Three angle options with a recommendation
3. A confirmation question: "Does this brief match what you had in mind, or should we adjust the angle/audience?"

Do not proceed to outlining until the user confirms the brief.

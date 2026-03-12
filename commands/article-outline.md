---
description: Build a section-by-section article outline from a brief or topic. Each section gets a purpose, evidence slot, and transition. Second step of the article writing workflow.
---

# Article Outline

Create a structured outline with one purpose per section before writing a word of prose.

## Usage

```
/article-outline                        — uses brief from current conversation
/article-outline docs/brief.md          — reads brief from file
/article-outline "why pgbouncer matters" — starts from raw topic (runs article-idea first)
```

## Steps

1. If input is a file path, read it; if it's a raw topic, run the `article-strategy` skill first to produce a brief
2. Apply the `article-writing` skill — Outline Structure section:
   - Write the thesis as one declarative sentence
   - Draft the opening hook in full (not a placeholder)
   - Define 3–5 sections, each with a single purpose and a specific evidence slot
   - Write all transitions out in full
3. Output the complete outline
4. Ask: "Does this structure cover what you wanted to say, or should we adjust any section?"

## Output Format

```markdown
## Outline

**Thesis:** [One declarative sentence]
**Estimated length:** [word count range]

### Opening
**Hook type:** [Scene / Statistic / Counterintuitive claim / Problem statement]
**Hook draft:** [Written out in full]
**Promise:** [What the reader gets — one sentence]

### Section 1: [Name]
**Purpose:** [What this section proves]
**Evidence/example:** [Specific data, code, story, or case]
**Transition:** [Bridging sentence to next section]

### Section 2–N: [repeat]

### Closing
**Takeaway 1:** [Most important insight]
**Takeaway 2:** [Supporting insight]
**Takeaway 3:** [Actionable next step]
**CTA:** [One specific action]
```

## After This

- `/article-draft` — write the full prose draft from this outline
- `/article` — run the full pipeline from the start

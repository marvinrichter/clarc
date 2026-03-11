---
description: Create a talk outline with time allocation, key points per section, speaker notes skeleton, and Q&A preparation questions.
---

# Talk Outline

Create a structured talk outline from a topic or draft notes.

## Usage

```
/talk-outline "Observability for Microservices" --duration 30 --audience engineers
/talk-outline docs/notes.md --duration 45 --audience executives
```

## Steps

1. Read source material if a file path is given; otherwise use `$ARGUMENTS` as the topic
2. Apply the `talk-preparation` skill: audience analysis, narrative arc selection, time boxing
3. Output the outline in the format below — do not skip any section

## Output Format

```markdown
# [Talk Title]

**Audience:** [Role and experience level]
**Duration:** [X] minutes
**Thesis:** [One sentence — what the audience will think or do differently]
**Narrative arc:** [Problem/Solution/Evidence | Before/After/Bridge | Why/What/How]

---

## Opening ([X] min)

**Hook:** [Write the full hook sentence — do not leave as placeholder]
**Why this matters to them:** [Explicit audience relevance — one sentence]

---

## Section 1: [Name] ([X] min)

**Key point:** [One-sentence statement of what this section proves]
**Supporting evidence:** [Data point, demo description, or example]
**Speaker note:** [Keywords, not prose]
**Transition:** [Exact bridging sentence to the next section]

---

## Section 2: [Name] ([X] min)

[same structure]

---

## Section 3: [Name] ([X] min)

[same structure]

---

## Closing ([X] min)

**Takeaway 1:** [Most important insight from the talk]
**Takeaway 2:** [Complementary insight]
**Takeaway 3:** [Actionable next step]
**CTA:** [One specific action — URL, command, or next step]

---

## Q&A Preparation

1. **[Question]** → [Answer bullet points]
2. **[Question]** → [Answer bullet points]
3. **[Question]** → [Answer bullet points]
4. **[Question]** → [Answer bullet points]
5. **[Question]** → [Answer bullet points]
6. **[Question]** → [Answer bullet points]
7. **[Question]** → [Answer bullet points]
8. **[Question]** → [Answer bullet points]
9. **[Question]** → [Answer bullet points]
10. **[Hostile / skeptical question]** → [Acknowledge + reframe + redirect]
```

## Reference Skills

- `talk-preparation` — time boxing, outline structure, Q&A preparation, speaker note format
- `presentation-design` — narrative arc selection, opening hooks, closing patterns

## After This

- `/slide-deck` — build the slide deck from the completed outline
- `/cfp` — write a CFP abstract based on the outline

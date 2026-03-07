---
name: talk-preparation
description: "Prepare a talk from scratch: audience analysis, time boxing per section, outline structure, speaker notes, rehearsal strategy, Q&A preparation, and nervous system management. Use for conference talks, team presentations, demos, and webinars of any length."
---

# Talk Preparation Skill

## When to Activate

- Preparing a conference talk, webinar, meetup, or team presentation
- Time-boxing a talk outline to fit a slot
- Writing speaker notes that aid delivery without being read verbatim
- Preparing for Q&A with difficult questions
- Rehearsing effectively within available time

---

## Audience Analysis

Before writing a single slide, answer these four questions:

1. **Who is in the room?** (role, technical level, familiarity with the topic)
2. **What do they already know?** (baseline — don't explain what they know, don't assume what they don't)
3. **What problem do they have that my talk addresses?** (if no answer, reconsider the talk)
4. **What should they do or think differently after this talk?** (the one outcome)

Write the answer to question 4 in one sentence — this becomes the talk's thesis.

---

## Time Boxing

### Rules of thumb

| Talk type | Pace | Buffer |
|-----------|------|--------|
| Technical / code-heavy | 1 slide per 2 min | +10% |
| Keynote / story-driven | 1 slide per 3 min | +10% |
| Workshop / interactive | 1 slide per 5 min | +15% |

**Live runs 15% slower than rehearsal.** Budget for it.

### Time allocation per section

For a 30-minute talk:

```
Opening hook:           2 min  (no agenda slide)
Context / setup:        4 min
Main point 1:           7 min
Main point 2:           7 min
Main point 3:           5 min
Conclusion + CTA:       3 min
Buffer:                 2 min
─────────────────────────────
Total:                 30 min
```

Adjust ratio to content — demo-heavy talks may spend 60% on one section.

### Slide count calculator

```
Slide count ≈ Talk duration (min) / Pace (min per slide)

Example: 30 min technical talk = 30 / 2 = 15 slides
```

---

## Outline Structure

A talk outline has five components:

```
Talk: [Title]
Audience: [Role, level]
Duration: [X] minutes
Thesis: [One sentence — what the audience will think differently after]

Opening (X min)
  Hook: [Specific question, stat, or story — write it out in full]
  Why this matters to them: [explicit audience relevance]

Section 1: [Name] (X min)
  Key point: [One sentence]
  Supporting evidence: [Data, example, demo]
  Transition to next: [Exact bridging sentence]

Section 2: [Name] (X min)
  [same structure]

Section 3: [Name] (X min)
  [same structure]

Closing (X min)
  Takeaway 1: [Most important insight]
  Takeaway 2: [Second insight]
  Takeaway 3: [Third insight]
  CTA: [One specific action]

Q&A Prep
  [See below]
```

---

## Speaker Notes Format

Speaker notes exist to prevent going blank — not to be read aloud.

### Format rules

```
WRONG — prose that gets read verbatim:
"In this section I will explain how the system works by walking you
through the architecture diagram and then I will show you the key
components including the API gateway and the message queue."

CORRECT — keywords + timing markers:
[2 min] → gateway → queue → show diagram
→ "this is the part that surprised us" [pause for effect]
→ demo: open terminal, run `make demo` → wait for output
→ transition: "so how does this affect you?"
```

### Include in notes

- **Timing markers**: `[1:30]` at points where you need to be at that time
- **Demo steps**: exact commands to run, in order
- **Transition sentences**: write the bridging sentence to the next slide verbatim — transitions are hardest to improvise
- **Pause indicators**: `[pause]` or `[breath]` after key points
- **Fallback**: if demo fails, which screenshot shows the same thing?

---

## Rehearsal Strategy

Three rehearsal passes, in order:

### Pass 1 — Out loud, with timer

- Speak every word out loud (do not "think through" silently)
- Set a visible timer
- Do not stop for mistakes — push through
- Note sections that ran long or where you stumbled

### Pass 2 — Record video

- Record yourself on your phone or laptop camera
- Watch it back at 1.25x speed — you will spot filler words, pacing issues, and awkward transitions
- Fix the top 3 issues, then do another out-loud run

### Pass 3 — Live audience

- Present to at least one real person (colleague, friend)
- Ask them to note: anything confusing, anything slow, anything they'd ask a question about
- Their confusion points are your Q&A list

### Time check guideline

After Pass 1: if you ran >10% over, cut content. If >20% under, add depth or slow down — rushing is a sign of nerves.

---

## Q&A Preparation

Generate 10 questions before the talk — you will get most of them.

### Question categories to cover

1. **"Why not X?"** — Why did you choose this approach over the obvious alternative?
2. **"What about scale?"** — Does this work at 10x the load?
3. **"How long did it take?"** — Budget / effort reality check
4. **"What failed?"** — What did you try that didn't work?
5. **"Is this open source / available?"** — Availability and access
6. **"How do you handle [edge case]?"** — One specific edge case relevant to the domain
7. **"What would you do differently?"** — Honest retrospective
8. **"Who is using this in production?"** — Proof of real-world use
9. **[Domain-specific technical question]** — Deepest technical question possible
10. **[Hostile / skeptical question]** — "This is just [competitor] but worse"

### Handling hostile questions

```
Pattern: Acknowledge → Reframe → Redirect

"That's a fair concern. [Acknowledge the validity of the pushback.]
In our context, [explain your specific constraint or assumption].
We've found [your evidence]. Happy to discuss more after the talk."
```

### "I don't know"

It is better to say "I don't know — I'll find out and post on the conference Slack" than to guess and be wrong publicly. Prepare this exact phrase.

---

## Checklist

- [ ] Audience analysis written: who, baseline, problem, one outcome
- [ ] Thesis stated in one sentence
- [ ] Time-boxed outline with per-section minutes
- [ ] Slide count matches pace rule (not more than 1 slide/2min for technical)
- [ ] Opening hook written in full (not "I'll figure out something catchy")
- [ ] Transition sentences written for every section hand-off
- [ ] Speaker notes are keywords + timing markers, not prose
- [ ] Demo fallback screenshot ready
- [ ] Pass 1 (out loud, timed) completed
- [ ] Pass 2 (video recording) completed
- [ ] Pass 3 (live audience) completed
- [ ] 10 Q&A questions prepared with answer bullets
- [ ] "I don't know" phrase rehearsed

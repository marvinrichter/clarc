---
name: presentation-design
description: "Presentation structure, narrative design, and slide layout principles. Covers the problem-solution-evidence arc, slide density rules (one idea per slide), slide type catalogue, opening hooks, and closing patterns. Use when structuring any slide deck — conference talk, demo, investor pitch, or team update."
---

# Presentation Design Skill

## When to Activate

- Structuring a slide deck from scratch
- Reviewing a presentation for narrative clarity
- Choosing between narrative frameworks (technical talk, executive update, investor pitch)
- Writing an opening hook or closing CTA
- Adapting the same content for different audiences
- Reducing slide density when too many ideas compete on a single slide
- Selecting the correct data-slide headline format (conclusion-first, not metric name)
- Preparing a conference talk, demo day, or board presentation where audience engagement is critical

---

## Narrative Arcs

Choose the arc based on the goal of the presentation.

### Problem → Solution → Evidence (technical talks, demos)

```
1. The Problem     — what breaks today, who suffers, how much it costs
2. Our Approach    — what we built and why this approach
3. Evidence        — demo, metrics, before/after
4. How to Get It   — next steps, availability, call to action
```

Best for: conference talks, internal engineering demos, product launches.

### Before → After → Bridge (transformation story)

```
1. Before          — current state (painful, expensive, slow)
2. After           — future state (fast, profitable, delightful)
3. Bridge          — how to get from Before to After (your solution)
```

Best for: sales decks, executive presentations, change management.

### Why → What → How (executive / board)

```
1. Why             — the strategic opportunity or risk (1-2 slides)
2. What            — the recommendation / decision needed (1 slide)
3. How             — the plan to execute (2-3 slides)
```

Best for: board presentations, executive summaries, budget requests.

### Choosing the right arc

| Audience | Arc |
|----------|-----|
| Engineers / practitioners | Problem → Solution → Evidence |
| Sales / customers | Before → After → Bridge |
| Executives / board | Why → What → How |
| Mixed | Why → What → How (keep technical detail in appendix) |

---

## Slide Density Rules

**One idea per slide.** If you have two ideas, use two slides.

| Rule | Target |
|------|--------|
| Words per slide | ≤ 40 (headline + bullets) |
| Font size minimum | 28pt for body text, 36pt+ for headlines |
| Bullet points | ≤ 5 per slide; prefer 3 |
| Images vs. text | One chart or image per slide, not multiple |
| Full sentences | Only for quotes — all other text in fragments |

### The "squint test"

Hold the slide at arm's length and squint. One thing should stand out as the main point. If two things compete, split the slide.

---

## Slide Type Catalogue

| Type | Purpose | Key layout rule |
|------|---------|----------------|
| **Title** | Opening, section dividers | Large headline, no body text |
| **Agenda** | Show structure up front | 3-5 items max; use later as progress marker |
| **Concept** | Explain a single idea | Headline + icon or single diagram |
| **Data** | Show metrics or results | One chart only; headline states the conclusion |
| **Demo** | Live demo or screenshots | "Demo" label; fallback screenshot always ready |
| **Quote** | Social proof, customer voice | Large quote, attribution; no bullets |
| **Transition** | Section separator | Title only; restate section theme |
| **Call to Action** | Close the loop | One clear action; remove everything else |

### Data slide rule

The headline on a data slide states the conclusion — not the chart title.

```
WRONG headline:  "Monthly Active Users"
CORRECT headline: "MAU grew 40% YoY, driven by mobile"
```

---

## Opening Hooks

The first 60 seconds determine audience engagement for the rest of the talk. Choose one:

### 1. Provocative question

Ask something the audience cannot immediately answer:
> "How many of your production deployments would fail a GDPR audit right now?"

### 2. Surprising statistic

Use a number that defies expectations:
> "The average developer spends 4.5 hours a week waiting for CI. That's 3 full weeks per year."

### 3. Short story (60 seconds)

A concrete incident with a clear protagonist:
> "In March 2023, a single missing database index took down our checkout page for 47 minutes. This talk is about why that took us 3 hours to find — and the alerting system we built so it can never happen again."

### 4. Problem statement

Name the problem directly — no preamble:
> "Code review is broken. PRs sit open for 4 days on average. By then, the author has context-switched twice and the reviewer has forgotten the ticket. Today I'm showing you how we cut that to 8 hours."

---

## Closing Patterns

### The 3-Point Takeaway

End with exactly three bullets — the most memorable structure:

```
## What to remember

1. [Most important insight from the talk]
2. [Second insight — complements, not contradicts]
3. [Actionable next step]
```

### Single CTA (Call to Action)

One clear action — not a menu of options:

```
WRONG: "Check out our docs, follow us on Twitter, try the beta, or reach out on Slack"

CORRECT: "Try it today at clarc.sh/get-started"
```

### Q&A slide

Never end on a blank slide. Always have:
- The Q&A invite ("Questions?")
- Your name, handle, or contact
- One reminder of the single most important takeaway

---

## Audience Adaptation

### Technical audience (engineers, practitioners)

- Show code snippets — but only 10-15 lines, syntax highlighted
- Include architecture diagrams
- Reference specific tools, libraries, versions
- Demo is expected and valued

### Executive audience

- Lead with business impact (revenue, cost, risk)
- Avoid acronyms or define on first use
- Use analogies for technical concepts
- Keep detail in backup slides (appendix)

### General / mixed audience

- Analogies bridge technical concepts ("It's like a traffic light for your code")
- Story-driven: one protagonist with a problem, your solution helps them
- Avoid industry jargon entirely

---

## Checklist

- [ ] One narrative arc chosen and applied consistently
- [ ] First slide is not a title slide with just the talk name — start with the hook
- [ ] ≤40 words per slide
- [ ] ≥28pt font throughout
- [ ] Data slides: headline states the conclusion, not the metric name
- [ ] One chart per slide maximum
- [ ] Opening hook is concrete (statistic, question, or story) — not "Hi, I'm X and today I'll talk about Y"
- [ ] Closing has exactly 3 takeaways and one CTA
- [ ] Last slide includes contact / Q&A prompt (not a blank or "Thank You")
- [ ] Appendix prepared for deep-dive questions

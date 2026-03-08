---
description: Generate a slide deck structure from a topic, document, or notes. Produces a Reveal.js HTML presentation or Markdown slide structure (Marp-compatible). Invokes the presentation-designer agent.
---

# Slide Deck

Generate a complete slide deck from a topic, document, or notes.

## Usage

```
/slide-deck <topic or file path>
/slide-deck "Observability for Microservices" --audience engineers --duration 30 --format reveal
/slide-deck docs/architecture.md --audience executives --duration 15 --format marp
```

## Arguments

- `$ARGUMENTS` — topic description, file path, or notes to base the deck on
- `--audience` — `engineers` | `executives` | `mixed` (default: `mixed`)
- `--duration` — talk duration in minutes (default: `30`)
- `--format` — `reveal` (Reveal.js HTML) | `marp` (Marp Markdown) (default: `reveal`)

## Steps

1. **Read source material** — if `$ARGUMENTS` is a file path, read it; otherwise treat as topic/notes

2. **Invoke presentation-designer agent** — pass: source material, audience, duration, format

3. **Confirm outline first** — the agent outputs the slide-by-slide outline (title + one-sentence description per slide) before generating the full deck. Confirm before continuing.

4. **Generate deck** — output as a single self-contained file:
   - `reveal`: `presentation.html` using the `html-slides` skill patterns
   - `marp`: `slides.md` with Marp frontmatter (`marp: true`)

## Output format — Reveal.js (reveal)

Uses the `html-slides` skill patterns:
- Self-contained HTML (no CDN dependency)
- Dark or light theme based on topic
- Code blocks with syntax highlighting
- Speaker notes in `<aside class="notes">` tags

## Output format — Marp Markdown (marp)

```markdown
---
marp: true
theme: default
paginate: true
---

# Talk Title
Subtitle — Speaker Name — Conference 2024

---

## Slide Title

- Bullet one
- Bullet two

<!-- Speaker note here -->

---
```

## Reference Skills

- `presentation-design` — narrative arc, slide density, slide type catalogue
- `talk-preparation` — time boxing, speaker notes format
- `html-slides` — self-contained Reveal.js output

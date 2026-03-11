---
description: "cfp — write a conference talk proposal (Call For Papers abstract)"
---

# CFP

Write a conference abstract and speaker bio for a CFP (Call for Papers/Proposals) submission.

## Usage

```
/cfp "How we cut deployment time from 45 min to 90 seconds"
/cfp --conference KubeCon --topic "Zero-downtime migrations at scale"
```

## Input

Provide via `$ARGUMENTS` or interactively:

1. **Talk topic or working title** (required)
2. **Core theme** — 2-3 sentences: what problem, what approach, what result
3. **Target conference** (or "general" for a generic submission)
4. **Speaker background** — bullet points: role, company, 1-2 relevant accomplishments
5. **Audience** — who benefits most from this talk (role + level)

If any of these are missing, ask before generating.

## Output

### 1. Three title variants

Apply the `conference-abstract` skill title formats:

```
Option A (How We...): "How We [Specific Surprising Achievement]"
Option B (Number):    "[N] Things You Need to Know About [Topic]"
Option C (Claim):     "[Provocative One-Sentence Claim]"
```

### 2. Abstract — three word counts

Generate all three. The submitter picks the one that matches the CFP requirement.

**200-word version** (abstract only):
- Hook + problem (2-3 sentences)
- Approach (1-2 sentences)
- Evidence (1 sentence with metric)
- Takeaways combined (1-2 sentences: "Attendees will leave knowing X, Y, and Z")
- Audience fit (1 sentence)

**300-word version** (abstract + brief outline):
- Full 200-word abstract
- 3-4 outline sections with one-sentence descriptions

**500-word version** (full proposal):
- Full 200-word abstract
- Detailed outline (each section 2-3 sentences)
- What attendees build/leave with (bullet list)
- Why this speaker (2-3 sentences of relevant experience)

### 3. Speaker bio — two lengths

**50-word version:**
> [Name] is [role] at [company] where [one-line of work]. [One concrete accomplishment with metric]. [Optional personal touch in one sentence].

**150-word version:**
> [Full professional narrative: current role + scope, previous relevant experience, specific accomplishments with numbers, writing/speaking/open source, one personal detail]

### 4. Three session tags

Suggest 3 tags appropriate for the target conference (e.g., for KubeCon: `platform-engineering`, `observability`, `gitops`).

## Quality checks (apply before outputting)

- First sentence of abstract is NOT "In this talk, I will..."
- Evidence sentence contains a specific number
- Takeaways use "attendees will leave knowing/able to" format
- No vendor pitch language
- Title contains a specific claim or number

## Reference Skill

`conference-abstract` — abstract structure, rejection reasons, title formats, bio templates, CFP format adaptation

## After This

- `/slide-deck` — build the slide deck for the accepted talk
- `/talk-outline` — structure the talk before building slides

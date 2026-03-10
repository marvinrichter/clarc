---
name: conference-abstract
description: "Write CFP (Call for Papers/Proposals) abstracts and speaker bios that get accepted. Covers hook sentences, problem framing, audience-fit statements, concrete takeaways, and adapting to different CFP formats (200/300/500 words). Use when submitting to any technical conference or meetup."
---

# Conference Abstract Skill

## When to Activate

- Submitting a CFP (Call for Papers/Proposals) to a conference or meetup
- Writing a talk abstract for a company blog, internal proposal, or conference site
- Writing a speaker bio for any event
- Getting feedback on an existing abstract that was rejected
- Adapting a single talk idea to different CFP word-count requirements (200, 300, or 500 words) without losing the core argument
- Helping an engineer who has strong technical content but struggles to frame it as a compelling audience benefit
- Crafting a title for a talk that currently has a generic name like "Introduction to Observability" and needs a hook format that stands out

---

## Abstract Structure

A CFP abstract has seven sentences in order. Follow the structure exactly — reviewers scan dozens of abstracts and pattern-match on this structure.

```
Sentence 1: HOOK — a surprising statistic, provocative claim, or specific incident
Sentence 2: THE PROBLEM — what is broken, painful, or risky for the audience
Sentence 3: WHY NOW — what makes this problem urgent or newly solvable
Sentence 4: YOUR APPROACH — what you built, decided, or discovered
Sentence 5: THE EVIDENCE — what happened (metric, result, demo)
Sentences 6-7: TAKEAWAYS — three concrete things attendees will leave knowing or able to do
Sentence 8: AUDIENCE FIT — who this is for (role, experience level, prerequisite knowledge)
```

### Example (200 words)

> The average team merges a dependency with a known CVE every 6 days — without knowing it. As applications grow, manual security review of third-party packages becomes impossible at the velocity modern teams ship.
>
> In 2023, we faced the same problem at Acme Corp: 800 direct dependencies, 40 engineers, and zero visibility into what changed. We built an automated dependency audit pipeline that classifies vulnerabilities by exploitability — not just severity — and integrates into every PR without slowing down review.
>
> Attendees will leave knowing: (1) how to distinguish exploitable CVEs from theoretical risks using CVSS v3.1 vectors, (2) how to integrate Trivy or Grype into GitHub Actions in under an hour, and (3) a prioritization framework that reduces alert fatigue by 80%.
>
> This talk is for engineers and security practitioners who manage CI/CD pipelines. Basic knowledge of GitHub Actions is helpful but not required.

---

## Common Rejection Reasons

| Reason | Example | Fix |
|--------|---------|-----|
| Too vague | "We'll explore approaches to scaling" | Name the specific approach you took |
| No takeaways | Abstract describes what the talk is about, not what attendees gain | Add explicit "attendees will leave knowing X, Y, Z" |
| Vendor pitch | "Our product solves this problem perfectly" | Focus on the problem and technique, not the product |
| Audience unclear | No mention of who benefits | Add explicit audience fit sentence |
| Boring title | "Introduction to Docker" | Use a hook format (see below) |
| No evidence | "We improved performance significantly" | "We reduced P99 latency from 4.2s to 180ms" |
| Passive construction | "This talk will cover..." | "You will leave knowing..." / "We built..." |

---

## Title Design

The title is the first filter — reviewers decide in 2 seconds whether to read the abstract.

### Formats that work

```
# How We [Did Something Specific and Surprising]
"How We Cut Deployment Time from 45 Minutes to 90 Seconds"

# [Number] Things You Need to Know About [Topic]
"5 Things Nobody Told You About Database Indexing"

# [Provocative Claim]
"Your Microservices Are Making You Slower"
"Most Observability Is a Lie"

# [Problem] Without [Sacrifice]
"Zero-Downtime Deployments Without Kubernetes"
"Test Coverage Without Slowing Down"
```

### Title checklist

- Contains a specific claim or number (not just a topic)
- Could stand alone without the abstract and still communicate value
- Avoids: "Introduction to", "Overview of", "A Deep Dive Into"
- Under 10 words

---

## Speaker Bio

Write two versions for every submission: 50-word and 150-word.

### Required elements

1. Current role and company (or "independent")
2. Domain of expertise (specific, not "technology")
3. One concrete accomplishment (shipped X, led Y, contributed to Z)
4. Optional: one personal detail that makes you memorable

### 50-word version

> Maria Chen is a Principal Engineer at Acme Corp where she leads the platform reliability team. She contributed to the OpenTelemetry specification and speaks regularly at KubeCon and SREcon. When not diagnosing distributed system failures, she runs ultramarathons.

### 150-word version

> Maria Chen is a Principal Engineer at Acme Corp, where she leads the platform reliability team responsible for 99.99% uptime across 200+ microservices. Before Acme, she spent four years at FinanceOps Inc rebuilding the settlement pipeline that processes $4B in daily transactions.
>
> Maria contributed the baggage propagation specification to OpenTelemetry and has spoken at KubeCon NA, SREcon Americas, and QCon London. She writes at mariachen.dev about practical observability and the human side of on-call.
>
> She is particularly interested in making reliability engineering accessible to teams without dedicated SRE functions — and has open-sourced a starter alerting template used by over 400 teams. When not diagnosing distributed system failures, she runs ultramarathons.

---

## CFP Format Adaptation

Adjust depth based on word count requirement:

### 200 words (abstract only)

- Hook + problem (2-3 sentences)
- Your approach (1-2 sentences)
- Takeaways (1-2 sentences, can combine into one)
- Audience (1 sentence)

### 300 words (abstract + brief outline)

- Full abstract (200 words)
- Outline: 3-4 sections with one-sentence descriptions

### 500 words (full proposal)

- Full abstract (200 words)
- Detailed outline: each section with 2-3 sentences
- What attendees build / leave with (concrete list)
- Why you are the right person to give this talk (2-3 sentences of relevant experience)
- Previous speaking experience if any

### Outline section format (for 300/500 word submissions)

```
**Section 1: The Hidden Cost of CVE Severity Scores (5 min)**
We examine why severity alone is a poor proxy for risk, using real examples
of high-severity CVEs that were not exploitable in practice.

**Section 2: Exploitability Vectors in CVSS v3.1 (10 min)**
...
```

---

## Checklist

- [ ] Title follows a hook format (not "Introduction to X")
- [ ] Title contains a specific claim or number
- [ ] First sentence is a hook (statistic, claim, or incident) — not "In this talk"
- [ ] Problem is specific and measurable
- [ ] Your approach is named (not "best practices")
- [ ] Evidence is quantified ("80% reduction", "from X to Y")
- [ ] Takeaways use "attendees will leave knowing/able to" format
- [ ] Audience is explicitly stated (role + level)
- [ ] No vendor pitch language
- [ ] Abstract word count matches CFP requirement
- [ ] Two bio versions ready: 50-word and 150-word
- [ ] Bio includes one concrete accomplishment with a number

---
description: From external market data — discover product opportunities by searching competitor features, user pain points on Reddit/HN, tech trends, and market gaps in a given domain. For structured ideation frameworks (JTBD, HMW, analogy thinking) without external research, use /brainstorm instead.
---

# Discover

Research a market domain and surface product opportunities from public signals.

## Instructions

### 1. Parse the Research Scope

`$ARGUMENTS` defines what to research. Examples:
- `auth developer experience` — a domain + angle
- `project management SMB` — a market + segment
- `linear jira shortcut` — specific competitors to analyze
- `why is <X> still hard` — a known frustration to dig into

If empty: ask "What market, domain, or problem space should I research?"

Identify from the arguments:
- **Domain/topic** — what area?
- **Competitors** — if named, focus on them; otherwise find the top 3-5 players
- **Angle** — user pain? trends? gaps? competitive analysis?

### 2. Research Strategy

Run searches in parallel across these signal sources:

**Competitor signals:**
- `<competitor> changelog 2025 2026` — what are they building?
- `<competitor> pricing` — how are they monetizing?
- `<competitor> vs <competitor>` — how do users compare them?
- `<competitor> job postings engineering` — what are they investing in?

**User pain signals:**
- `site:reddit.com <domain> frustrating OR "wish it could" OR "can't figure out"` — authentic complaints
- `site:news.ycombinator.com <domain> OR "Ask HN: why is <X> hard"` — tech community
- `<domain> complaints OR "alternative to"` — people looking to switch
- `<product> reviews g2 OR capterra 2025` — structured review data

**Trend signals:**
- `<domain> trends 2026` — what's emerging?
- `<technology> adoption 2025 2026` — what's gaining traction?
- `github trending <language> <domain>` — what are developers building?

### 3. Delegate to competitive-analyst

If competitors are identified, use the **competitive-analyst** agent to build a systematic feature matrix and gap analysis.

### 4. Synthesize Findings

After research, synthesize across all sources:

**What users are complaining about** (recurring themes in Reddit/HN/reviews)

**What competitors are investing in** (from changelogs, job postings)

**What nobody does well** (common frustrations across all products in the space)

**Emerging trends that nobody has productized yet**

### 5. Generate Idea Seeds

For each significant opportunity found, create a draft idea:
- Save to `docs/ideas/discovered/YYYY-MM-DD-<name>.md`
- Include: evidence (links, quotes), user signal strength, competitive context

### 6. Save Research Report

Save full research to `docs/insights/discover-YYYY-MM-DD-<topic>.md` with:
- Sources searched
- Key findings per source
- Synthesized opportunities

### 7. Output Summary

```
DISCOVERY RESEARCH: <Topic>
════════════════════════════

Research scope:   <domain, competitors, angle>
Sources searched: <N searches across Reddit, HN, G2, competitor sites>

TOP OPPORTUNITIES FOUND
───────────────────────

#1 — Passkey support in small SaaS auth
     Signal: 47 Reddit threads, "why doesn't <X> support passkeys yet"
     Competitor gap: Auth0 has it, Clerk has it, most indie auth libs don't
     Trend: Passkey adoption +340% YoY (Apple/Google pushing hard)
     → /idea passkey-authentication

#2 — One-click approval on mobile
     Signal: 23 HN comments, G2 reviews of Linear/Jira cite mobile as #1 weakness
     Competitor gap: everyone has "mobile apps" but approval flows require desktop
     → /idea mobile-one-click-approval

#3 — Real-time collab on async tools
     Signal: Figma's model being requested for PM tools
     Trend: "multiplayer" becoming table stakes
     → /idea realtime-collaboration

Idea seeds created:  docs/ideas/discovered/ (<N> files)
Full report:         docs/insights/discover-YYYY-MM-DD-<topic>.md

Next:
  /evaluate <name>     — assess viability of each opportunity
  /analyze-feedback    — validate against your own user data
  /competitive-analysis <competitors> — deeper competitor deep-dive
```

## Arguments

`$ARGUMENTS` examples:
- `developer authentication 2026` — domain + year
- `notion obsidian logseq` — named competitor set
- `why is software deployment still hard` — pain-first framing
- `b2b saas onboarding trends` — trend-focused
- (empty) — asks for the domain

## After This

- `/brainstorm` — generate ideas from discovered opportunities
- `/idea` — capture the best discovery as a structured idea

---
name: market-research
description: Conduct market research, competitive analysis, investor due diligence, and industry intelligence with source attribution and decision-oriented summaries. Use when the user wants market sizing, competitor comparisons, fund research, technology scans, or research that informs business decisions.
---

# Market Research

Produce research that supports decisions, not research theater.

## When to Activate

- researching a market, category, company, investor, or technology trend
- building TAM/SAM/SOM estimates
- comparing competitors or adjacent products
- preparing investor dossiers before outreach
- pressure-testing a thesis before building, funding, or entering a market
- gathering technology or vendor intelligence before committing to a stack decision
- synthesizing qualitative and quantitative signals into a concise decision recommendation with sourced evidence

## Research Standards

1. Every important claim needs a source.
2. Prefer recent data and call out stale data.
3. Include contrarian evidence and downside cases.
4. Translate findings into a decision, not just a summary.
5. Separate fact, inference, and recommendation clearly.

## Common Research Modes

### Investor / Fund Diligence
Collect:
- fund size, stage, and typical check size
- relevant portfolio companies
- public thesis and recent activity
- reasons the fund is or is not a fit
- any obvious red flags or mismatches

### Competitive Analysis
Collect:
- product reality, not marketing copy
- funding and investor history if public
- traction metrics if public
- distribution and pricing clues
- strengths, weaknesses, and positioning gaps

### Market Sizing
Use:
- top-down estimates from reports or public datasets
- bottom-up sanity checks from realistic customer acquisition assumptions
- explicit assumptions for every leap in logic

### Technology / Vendor Research
Collect:
- how it works
- trade-offs and adoption signals
- integration complexity
- lock-in, security, compliance, and operational risk

## Output Format

Default structure:
1. executive summary
2. key findings
3. implications
4. risks and caveats
5. recommendation
6. sources

## Quality Gate

Before delivering:
- all numbers are sourced or labeled as estimates
- old data is flagged
- the recommendation follows from the evidence
- risks and counterarguments are included
- the output makes a decision easier

## Example Output: TAM/SAM/SOM Analysis

**Prompt used:** "Research the project management software market for a B2B SaaS targeting 10-50 person engineering teams."

| Market Level | Size | Calculation |
|---|---|---|
| TAM (Total) | $8.2B | Global PM software market (Gartner 2024) |
| SAM (Addressable) | $1.4B | B2B SaaS PM tools with API integration |
| SOM (Obtainable) | $42M | Engineering-specific PM tools, 3% SAM |

**Key competitors identified:**

| Tool | Pricing | Engineering focus | API quality |
|------|---------|------------------|-------------|
| Linear | $8/user/mo | High (GitHub/Jira native) | Excellent |
| Shortcut | $8.50/user/mo | Medium | Good |
| Height | $6.99/user/mo | Medium | Good |
| Notion | $10/user/mo | Low | Limited |

**Differentiator opportunities:** None offer AI-powered sprint auto-planning. Linear lacks Slack-to-task creation.

## Example Output: Investor / Fund Diligence

**Prompt used:** "Research Accel Partners before a seed pitch. We're a developer-tooling B2B SaaS."

| Dimension | Finding |
|-----------|---------|
| Fund size | Accel XV: $650M (2023) |
| Typical check | $1M–$5M seed, leads rounds |
| Relevant portfolio | Atlassian, Segment, Qualtrics, Webflow |
| Active thesis | Developer-led growth, bottom-up SaaS, API-first infrastructure |
| Recent activity | Led Merge.dev Series B (2023), Retool Series C (2022) |
| Fit assessment | Strong — thesis explicitly covers developer productivity tools |
| Red flags | Atlassian is a portfolio conflict to address proactively |

**Recommended personalization hooks:**
- Reference Segment acquisition: shows they back infrastructure bets all the way to exit
- Cite their "developer-led growth" blog post from 2022 — maps directly to the bottom-up GTM
- Address Atlassian conflict head-on: "We target teams that have outgrown Jira, not teams evaluating it"

## Example: Competitive Analysis Summary Card

**One-paragraph format for executive summaries:**

> Linear dominates the engineering PM category on brand and API quality but has no AI layer and limited support for non-engineering stakeholders. Shortcut is cheaper but perceived as a Linear also-ran since 2022. Notion competes on consolidation ("one tool for everything") but scores poorly on engineering-specific workflows. The gap is AI-native sprint automation — no current tool closes the loop between Slack/GitHub signals and sprint board state without manual copy-paste.

Use this format when the audience needs a paragraph they can paste into a board memo or investor update, not a table.

## How to Sanity-Check Market Size Numbers

Top-down estimates (from analyst reports) tend to be inflated — they include every conceivable buyer. Always run a bottom-up check:

1. Estimate the number of reachable customers: "~50,000 engineering teams of 10-50 people in North America and Europe"
2. Multiply by realistic ACV: "$2,400/year per team"
3. Result: $120M realistic ceiling — compare to the SOM estimate ($42M) to check plausibility
4. If bottom-up and top-down are within 3x, the estimate is defensible. If they differ by 10x, explain why or revise.

Label every number as sourced (cite the report), estimated (your calculation with stated assumptions), or derived (combination of sourced + estimated). Never present a number without its label.

---
name: content-engine
description: Create platform-native content systems for X, LinkedIn, TikTok, YouTube, newsletters, and repurposed multi-platform campaigns. Use when the user wants social posts, threads, scripts, content calendars, or one source asset adapted cleanly across platforms.
---

# Content Engine

Turn one idea into strong, platform-native content instead of posting the same thing everywhere.

## When to Activate

- writing X posts or threads
- drafting LinkedIn posts or launch updates
- scripting short-form video or YouTube explainers
- repurposing articles, podcasts, demos, or docs into social content
- building a lightweight content plan around a launch, milestone, or theme
- turning a long engineering blog post into a series of platform-native X threads and a LinkedIn summary without duplicating copy
- creating a content calendar for a product launch that sequences announcements across multiple platforms over one to two weeks
- adapting a recorded conference talk or demo video into short-form TikTok or YouTube Shorts scripts with strong opening hooks

## First Questions

Clarify:
- source asset: what are we adapting from
- audience: builders, investors, customers, operators, or general audience
- platform: X, LinkedIn, TikTok, YouTube, newsletter, or multi-platform
- goal: awareness, conversion, recruiting, authority, launch support, or engagement

## Core Rules

1. Adapt for the platform. Do not cross-post the same copy.
2. Hooks matter more than summaries.
3. Every post should carry one clear idea.
4. Use specifics over slogans.
5. Keep the ask small and clear.

## Platform Guidance

### X
- open fast
- one idea per post or per tweet in a thread
- keep links out of the main body unless necessary
- avoid hashtag spam

### LinkedIn
- strong first line
- short paragraphs
- more explicit framing around lessons, results, and takeaways

### TikTok / Short Video
- first 3 seconds must interrupt attention
- script around visuals, not just narration
- one demo, one claim, one CTA

### YouTube
- show the result early
- structure by chapter
- refresh the visual every 20-30 seconds

### Newsletter
- deliver one clear lens, not a bundle of unrelated items
- make section titles skimmable
- keep the opening paragraph doing real work

## Repurposing Flow

Default cascade:
1. anchor asset: article, video, demo, memo, or launch doc
2. extract 3-7 atomic ideas
3. write platform-native variants
4. trim repetition across outputs
5. align CTAs with platform intent

## Deliverables

When asked for a campaign, return:
- the core angle
- platform-specific drafts
- optional posting order
- optional CTA variants
- any missing inputs needed before publishing

## Quality Gate

Before delivering:
- each draft reads natively for its platform
- hooks are strong and specific
- no generic hype language
- no duplicated copy across platforms unless requested
- the CTA matches the content and audience

## Example: Repurposing a Blog Post

**Source asset:** "How we reduced our API response time by 70% using edge caching"

### X Thread (12 posts)
```
1/ We cut API response time by 70% in 2 weeks without rewriting anything.
   Here's exactly what we did (and what didn't work): 🧵

2/ The problem: users in Southeast Asia were getting 800ms responses.
   US users got 120ms. Same API. 6x difference.

3/ Our first attempt: moved to a bigger server.
   Result: US got 100ms. SEA still got 750ms.
   We were solving the wrong problem.

4/ The actual problem: our server was in Virginia.
   Every SEA request had to travel 9,000 miles.

[...continue with the discovery, solution, results, and a CTA to the full post]

12/ Full write-up with the exact Cloudflare Workers config we used:
    [link]
```

### LinkedIn Post (single post)
```
We reduced API latency by 70% without touching our codebase.

The surprising part: the fix took 2 hours. The diagnosis took 2 weeks.

Here's what we learned about why geography is often the real bottleneck —
and the exact edge caching setup that fixed it for our Southeast Asia users.

[Link to full post in comments]

---
What's the biggest "obvious in hindsight" performance fix you've shipped?
```

### Key differences by platform
| Platform | Hook | Length | CTA |
|---|---|---|---|
| X thread | Surprising stat in post 1 | 12-15 posts, ~280 chars each | Link in last post |
| LinkedIn | Story-driven, professional | 150-300 words | Link in comment |
| Newsletter | Context + depth | 500-1500 words | Multiple inline links |

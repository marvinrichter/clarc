---
description: Open and manage a production incident. Creates a structured incident document, guides root cause analysis, generates status page updates and Slack messages, and sets up a post-mortem after resolution.
---

# Incident

Open a production incident, guide the response, and generate all communication artifacts.

## Instructions

### 1. Parse Arguments

`$ARGUMENTS` can be:
- Description of what's broken: `checkout failing with 500 errors`
- Severity override: `P0 checkout down`
- `post-mortem <incident-file>`: write post-mortem for a resolved incident
- `runbook <service> <failure>`: generate a runbook

If empty: ask "What's broken? Describe the symptoms."

### 2. Assess Severity

Based on the description, determine severity:
- P0: complete outage, login broken, payments failing, data loss
- P1: major feature broken for many users
- P2: degraded performance or minor feature broken
- P3: cosmetic, workaround exists

Ask for confirmation if uncertain: "Based on the description, this looks like P1. Correct?"

### 3. Create Incident Document

Create `docs/incidents/YYYY-MM-DD-HH-MM-<short-name>.md`:

```markdown
# Incident: <Description>

**Date:** YYYY-MM-DD
**Time:** HH:MM UTC
**Severity:** P<N>
**Status:** INVESTIGATING
**Incident Commander:** <user — ask if unknown>

## Impact

- **What broke:** <from description>
- **Who is affected:** <estimate — ask if unknown>

## Timeline

| Time (UTC) | Event |
|-----------|-------|
| HH:MM | Incident opened |

## Root Cause

(investigating)

## Resolution

(in progress)

## Action Items

| Action | Owner | Due | Ticket |
|--------|-------|-----|--------|
```

### 4. Generate Communication

**Status page message:**
```
🔴 Investigating — [Service] Degraded
We are aware of an issue affecting [feature].
Our team is investigating.
Next update in 15 minutes.
```

**Slack message for incident channel:**
```
🚨 INCIDENT P<N>: <Description>
Commander: @<you>
Started: HH:MM UTC
Status: INVESTIGATING

What we know: <symptoms>

I'll post updates every 15 minutes.
```

Output both messages for the user to post.

### 5. Guide Root Cause Analysis

Ask diagnostic questions based on the symptoms:
- "When did it start? Was there a recent deploy?"
- "What do the error logs show? (Check: `kubectl logs` / Sentry / Datadog)"
- "What metrics are elevated? (Error rate? Latency? CPU?)"
- "Is it affecting all users or a subset? (All regions? Specific accounts?)"

As answers come in, update the Timeline section in the incident doc.

### 6. Resolution

When the user says the issue is resolved:

1. Update incident doc:
   - Add resolution time to timeline
   - Fill in Root Cause (best known so far)
   - Change Status to RESOLVED
   - Calculate duration

2. Generate resolved status page message:
   ```
   🟢 Resolved — [Service] Operational
   The issue has been resolved.
   Duration: X hours Y minutes
   Post-mortem will follow within 48 hours.
   ```

3. Prompt post-mortem:
   ```
   Incident closed. A post-mortem is recommended for P0/P1 incidents.
   Run: /incident post-mortem docs/incidents/<this-file>.md
   ```

### 7. Post-Mortem Mode

If `$ARGUMENTS` starts with `post-mortem`:

Read the incident file. Generate a full post-mortem using the blameless format (see `incident-response` skill):
- Executive summary
- What went well / wrong
- 5 Whys root cause analysis
- Action items (P0/P1/P2 priorities)

Save to `docs/incidents/post-mortems/YYYY-MM-DD-<name>-post-mortem.md`.

### 8. Runbook Mode

If `$ARGUMENTS` starts with `runbook <service> <failure>`:

Generate a runbook at `docs/runbooks/<service>/<failure>.md` with:
- Symptoms
- Immediate actions (< 5 min)
- Extended actions (if not resolved in 10 min)
- Root cause investigation steps
- Escalation path
- Prevention notes

## Arguments

`$ARGUMENTS` examples:
- `checkout failing 500 errors` → open P1 incident
- `P0 no users can log in` → open P0 incident
- `post-mortem docs/incidents/2026-03-06-checkout.md` → write post-mortem
- `runbook order-service db-connection-pool` → generate runbook

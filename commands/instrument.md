---
description: Add product analytics event tracking to an existing feature or file. Designs event taxonomy, chooses the right analytics call (track/identify/group), and instruments the code without breaking existing logic.
---

# Instrument — Add Analytics Event Tracking

Add product analytics instrumentation to: $ARGUMENTS

---

## Step 1 — Understand the feature

Read the target file(s) and answer:
1. What user action does this feature enable?
2. What is the "happy path" (success state)?
3. Where are the error/failure branches?
4. Is this server-side or client-side code?

## Step 2 — Design the event taxonomy

For each meaningful action, define:

```
Event name:  <object>_<action>   (past tense, snake_case)
Trigger:     When exactly does this fire?
Properties:  What context is useful for analysis?
```

Minimum viable events per feature:
- `<feature>_viewed` — user saw the UI
- `<feature>_<primary_action>_started` — user initiated the action
- `<feature>_<primary_action>_completed` — action succeeded
- `<feature>_<primary_action>_failed` — action failed (include error reason)

## Step 3 — Detect the analytics stack

Check for existing analytics integrations:

```bash
grep -r "analytics\.\|posthog\.\|mixpanel\.\|amplitude\.\|gtag\|ga4" \
  --include="*.ts" --include="*.js" --include="*.py" \
  -l . 2>/dev/null | head -5
```

Use the detected SDK. If none found: recommend Segment (universal) or PostHog (self-hosted).

## Step 4 — Instrument the code

Rules:
- **Track after success**, not before (prevents double-counting on retry)
- **Never block the user flow** — wrap tracking in try/catch
- **No PII in properties** — no email, password, SSN, credit card
- **Server-side for revenue events** — payment events from backend only

```typescript
// Pattern: track after success
async function createProject(userId: string, name: string) {
  const project = await db.projects.create({ userId, name });

  // Track after successful creation
  try {
    analytics.track('project_created', {
      project_id: project.id,
      project_name_length: name.length, // length is OK, not the name itself
      user_id: userId,
    });
  } catch {
    // Analytics failure must never break core flow
  }

  return project;
}
```

## Step 5 — Add identify call (if applicable)

If this code runs at login, signup, or profile update:

```typescript
analytics.identify(user.id, {
  plan: user.subscription.plan,
  created_at: user.createdAt,
  // No password, no raw email unless privacy policy covers it
});
```

## Step 6 — Verify

1. Trigger the action manually in development
2. Check the analytics tool's live event stream / debugger
3. Confirm event name, properties, and user_id are correct
4. Confirm no PII leakage in properties

---

## Output format

After instrumenting, report:

```markdown
## Events Added

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `project_created` | After successful DB insert | project_id, template |
| `project_creation_failed` | On DB error | error_code |

## Files Modified
- `src/services/project.ts` — added 2 track calls

## Verify
Open [analytics tool] → Live Events and create a project to confirm.
```

## After This

- `/slo` — define SLOs using the new instrumentation
- `/tdd` — add tests for instrumentation code

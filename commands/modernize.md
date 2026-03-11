---
description: Create a step-by-step modernization plan for a specific component — interface extraction, Branch-by-Abstraction, Strangler Fig, feature toggle cutover, and rollback strategy
---

# Modernize Command

Create a modernization plan for a specific component: $ARGUMENTS

Usage:
- `/modernize <component-path>` — per-component plan (this command)
- `/modernize --full` — invoke **modernization-planner** agent for full-codebase Churn×Complexity hotspot analysis, legacy indicator detection across all files, and a phased roadmap with risk assessment

For the full-codebase analysis, delegate to the **modernization-planner** agent directly.

## Your Task

Analyze the specified component and produce a concrete, step-by-step modernization plan. Choose the right strategy, generate the key code artifacts, and define success criteria.

## Step 1 — Analyze the Component

```bash
# Read the component
wc -l $COMPONENT_PATH

# Who calls this component?
grep -rn "import.*$(basename $COMPONENT_PATH .ts .java .py .go)\|require.*$(basename $COMPONENT_PATH)" \
  src/ --include="*.ts" --include="*.java" --include="*.py" --include="*.go" | \
  grep -v "test\|spec" | wc -l

# What does it depend on?
head -30 $COMPONENT_PATH  # Check imports

# Test coverage
find . -name "$(basename $COMPONENT_PATH .ts)*test*" -o -name "*test*$(basename $COMPONENT_PATH .ts)*" 2>/dev/null
```

Read the component fully. Identify:
- Number of responsibilities (each "and" in a description = extra responsibility)
- External dependencies (database, HTTP, filesystem, third-party)
- Test coverage
- Callers (how many, how varied)
- Change frequency (from git log)

## Step 2 — Choose Strategy

**Strangler Fig** — when component is accessed via HTTP/RPC and can be proxied:
```
Signs: It's a service, controller, or API handler
Migration: Route traffic via proxy, run parallel, shift gradually
```

**Branch-by-Abstraction** — when component is a library/class used inside a codebase:
```
Signs: It's imported and called directly by other classes
Migration: Extract interface, implement twice, toggle, delete old
```

**Extract and Sprout** — when component does too many things but can't be fully replaced yet:
```
Signs: God Class with mixed responsibilities, tight coupling
Migration: Extract new responsibility into new class, leave old class as facade
```

**Direct Replacement** — only when:
```
- Component is < 200 lines
- > 80% test coverage
- Single clear responsibility
- Low traffic / business criticality
```

## Step 3 — Generate Key Code Artifacts

### For Branch-by-Abstraction

**Step 3a — Extract interface**

Generate the interface/protocol based on the current component's public methods:

```typescript
// Current (example)
export class LegacyEmailService {
  sendWelcome(email: string, name: string): Promise<void>
  sendPasswordReset(email: string, token: string): Promise<void>
  sendOrderConfirmation(order: Order): Promise<void>
}

// Generated interface
export interface EmailService {
  sendWelcome(email: string, name: string): Promise<void>
  sendPasswordReset(email: string, token: string): Promise<void>
  sendOrderConfirmation(order: Order): Promise<void>
}

// Wrap legacy behind interface
export class LegacyEmailAdapter implements EmailService {
  private readonly legacy = new LegacyEmailService();
  // delegate all methods
}

// New implementation
export class SendgridEmailService implements EmailService {
  // new implementation
}
```

**Step 3b — Feature toggle**

```typescript
// Dependency injection / factory
export function createEmailService(config: Config): EmailService {
  if (config.featureFlags.sendgridEnabled) {
    return new SendgridEmailService(config.sendgridApiKey);
  }
  return new LegacyEmailAdapter();
}
```

**Step 3c — Tests for interface**

Generate test suite that runs against both implementations:
```typescript
describe.each([
  ['Legacy', () => new LegacyEmailAdapter()],
  ['Sendgrid', () => new SendgridEmailService(process.env.SENDGRID_KEY)],
])('%s EmailService', (name, factory) => {
  let service: EmailService;
  beforeEach(() => { service = factory(); });

  it('sends welcome email', async () => {
    await expect(service.sendWelcome('test@example.com', 'Test')).resolves.not.toThrow();
  });
});
```

### For Strangler Fig

Generate proxy configuration and monitoring setup:

```nginx
# Phase 1: Proxy in front of legacy
upstream user_service {
    server new-user-service:8080 weight=0;    # 0% to new (start here)
    server legacy-user-service:8080 weight=100;
}
```

```javascript
// Shadow mode middleware
async function shadowMode(req, res, next) {
  const legacyResult = await forwardToLegacy(req);

  // Fire and forget — don't await, don't fail on error
  compareWithNew(req, legacyResult).catch(err =>
    logger.warn('Shadow comparison failed', { err, path: req.path })
  );

  res.json(legacyResult);
}
```

## Step 4 — Full Modernization Plan

Output the complete plan:

```markdown
# Modernization Plan: [Component Name]

**Component:** [path]
**Strategy:** [Branch-by-Abstraction / Strangler Fig / Extract-and-Sprout]
**Estimated Timeline:** [N weeks]
**Risk Level:** [Low / Medium / High]

---

## Phase 0: Safety Net (prerequisite — [N days])

Before any code changes:

1. Document all callers:
   - [N] direct callers found
   - Critical callers: [list top 3 by business impact]

2. Write characterization tests (capture current behavior):
   - [Specific test cases based on observed behavior]
   - Goal: >60% line coverage before changes begin

3. Set up monitoring baseline:
   - Metric: [success rate / latency / error rate]
   - Current: [value]
   - Alert threshold: [X% degradation triggers rollback]

---

## Phase 1: Interface Extraction ([N days])

**Deliverable:** Component works exactly as before, but behind an interface.
**Risk:** Zero — no behavior change.

Steps:
1. Extract interface/protocol: `[interface code]`
2. Wrap existing implementation: `[adapter code]`
3. Update all callers to use interface (compiler/IDE-assisted)
4. Verify all tests pass (no behavior change)

---

## Phase 2: New Implementation ([N weeks])

**Deliverable:** New implementation passes all interface tests.
**Risk:** Low — not in production yet.

Steps:
1. Create new implementation of interface
2. Run interface test suite against new implementation
3. Shadow mode: run both, compare, serve legacy

Shadow comparison to run for [N days] minimum before Phase 3.

---

## Phase 3: Gradual Cutover ([N weeks])

**Gate:** Shadow mode shows 0 critical discrepancies.

Cutover schedule:
- Day 1: 10% of traffic to new implementation (internal users only)
- Day 3: 25% (monitor error rates)
- Day 7: 50% (if no incidents)
- Day 14: 100%

**Rollback:** Set feature flag to false — instant rollback to legacy.

---

## Phase 4: Legacy Removal ([N days])

**Gate:** 14+ days at 100% new implementation, no incidents.

1. Delete legacy implementation
2. Remove adapter/wrapper
3. Remove feature flag
4. Remove shadow mode code
5. Clean up tests referencing legacy

---

## Rollback Plan

At any phase: `[specific rollback action — e.g., feature flag command, nginx config change]`

Recovery time: < 5 minutes

---

## Success Criteria

- [ ] All existing tests pass
- [ ] New implementation passes interface test suite
- [ ] Shadow mode: 0 critical discrepancies over [N] days
- [ ] Error rate after cutover: within 0.1% of baseline
- [ ] Legacy code deleted (not just disabled)
- [ ] Test coverage of new implementation: >80%

---

## Key Risks and Mitigations

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Hidden business logic in legacy | Medium | Shadow mode comparison catches it |
| Data migration needed | [Yes/No] | [Dual-write approach / N/A] |
| Performance regression | Low | Load test new implementation |
```

## Reference Skills

- `legacy-modernization` — full patterns (Strangler Fig, ACL, Branch-by-Abstraction, database migration)
- `technical-debt` — assessing whether this component should be modernized vs. deferred
- `tdd-workflow` — writing characterization tests before starting migration

## After This

- `/tdd` — write tests before migrating legacy code
- `/plan` — create detailed migration plan
- `/code-review` — review migrated code

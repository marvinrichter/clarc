---
name: security-review-advanced
description: Security anti-patterns — localStorage token storage (XSS risk), trusting client-side authorization checks, reflecting full error details to clients, blacklist vs whitelist input validation, using npm install instead of npm ci in CI pipelines.
---

# Security Review — Anti-Patterns

This skill extends `security-review` with common security mistakes and how to fix them. Load `security-review` first.

## When to Activate

- JWT or session tokens stored in `localStorage` (XSS risk)
- API endpoints rely on frontend UI hiding buttons instead of server-side permission checks
- Error handlers return `error.stack` or raw database error messages to clients
- Input validation uses `replace()` to strip known bad strings (blacklist pattern)
- CI pipelines use `npm install` instead of `npm ci`

---

## Anti-Patterns

### Storing Tokens in localStorage

**Wrong:**

```typescript
// XSS can steal the token from any script on the page
localStorage.setItem('access_token', token);
const token = localStorage.getItem('access_token');
fetch('/api/data', { headers: { Authorization: `Bearer ${token}` } });
```

**Correct:**

```typescript
// Store refresh token in httpOnly cookie — JS cannot read it
res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
// Store access token in memory only (lost on page refresh — that's fine)
let accessToken = responseBody.access_token;
```

**Why:** `localStorage` is accessible to any JavaScript on the page, making tokens trivially stealable via XSS.

---

### Trusting Client-Side Authorization Checks

**Wrong:**

```typescript
// Frontend hides the "Delete" button for non-admins — but the API accepts the request anyway
app.delete('/api/orders/:id', async (req, res) => {
  await db.orders.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

**Correct:**

```typescript
app.delete('/api/orders/:id', requireAuth, requirePermission('orders:delete'), async (req, res) => {
  await db.orders.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

**Why:** Attackers call APIs directly — hiding UI elements is not access control.

---

### Reflecting Full Error Details to the Client

**Wrong:**

```typescript
catch (error) {
  res.status(500).json({ error: error.message, stack: error.stack, query: error.query });
}
```

**Correct:**

```typescript
catch (error) {
  logger.error('Unhandled error', { error, userId: req.user?.id });
  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
}
```

**Why:** Stack traces and raw DB error messages reveal internal structure that attackers use to craft targeted exploits.

---

### Using Blacklist Validation Instead of Whitelist

**Wrong:**

```typescript
// Blocks known bad values — attackers find variants
function sanitizeInput(input: string) {
  return input.replace(/<script>/gi, '').replace(/javascript:/gi, '');
}
```

**Correct:**

```typescript
import { z } from 'zod';
// Define exactly what is allowed — everything else is rejected
const schema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/),
  bio: z.string().max(500),
});
```

**Why:** Blacklists are always incomplete; whitelists define a finite safe set and reject everything outside it.

---

### Using `npm install` in CI Pipelines

**Wrong:**

```yaml
# Can silently upgrade dependencies, introducing unvetted changes
- run: npm install
```

**Correct:**

```yaml
# Installs exactly what's in the lock file — fails if lock file is out of sync
- run: npm ci
```

**Why:** `npm install` can update the lock file mid-CI run, making builds non-reproducible and bypassing dependency review.

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/security)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [Web Security Academy](https://portswigger.net/web-security)

**Remember**: Security is not optional. One vulnerability can compromise the entire platform. When in doubt, err on the side of caution.

## Reference

- `security-review` — OWASP Top 10, secrets management, SQL injection, XSS, CSRF, input validation checklist
- `auth-patterns` — JWT, OAuth 2.0, RBAC, session management
- `gdpr-privacy` — PII classification, retention patterns, RTBF implementation

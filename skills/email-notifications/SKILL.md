---
name: email-notifications
description: "Email and notification architecture: transactional email with Resend/SendGrid, React Email templates, notification preferences (channel, frequency, opt-out), delivery tracking, in-app notifications, and push notifications. Covers the full notification stack."
origin: ECC
---

# Email & Notifications Skill

## When to Activate

- Sending transactional emails (welcome, reset password, receipts)
- Building notification preferences and opt-out flows
- Adding in-app notifications or activity feeds
- Setting up push notifications for web or mobile
- Email deliverability issues (landing in spam)

---

## Technology Selection

| Layer | Recommended | Alternative |
|-------|-------------|-------------|
| Transactional email API | Resend | SendGrid, Postmark |
| Email templates | React Email | MJML, Handlebars |
| In-app notifications | DB-backed (custom) | Novu, Courier |
| Push (web) | Web Push API | OneSignal |
| Push (mobile) | FCM / APNs | Expo Notifications |
| Notification orchestration | Novu | Courier, MagicBell |

---

## Pattern 1: Transactional Email with Resend + React Email

```tsx
// emails/WelcomeEmail.tsx
import {
  Html, Head, Body, Container, Heading, Text, Button, Hr, Img,
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
}

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px' }}>
          <Img src="https://yourdomain.com/logo.png" width={120} alt="Logo" />
          <Heading>Welcome, {userName}!</Heading>
          <Text>
            Your account is ready. Click below to get started.
          </Text>
          <Button
            href={loginUrl}
            style={{
              backgroundColor: '#3b82f6',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            Get started
          </Button>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
            You're receiving this because you created an account.
            {/* Always include unsubscribe link, even for transactional */}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Preview at http://localhost:3001 with: npx react-email dev
```

```typescript
// services/email.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { WelcomeEmail } from '../emails/WelcomeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(user: { email: string; name: string }) {
  const html = await render(
    WelcomeEmail({
      userName: user.name,
      loginUrl: `${process.env.APP_URL}/login`,
    })
  );

  const { data, error } = await resend.emails.send({
    from: 'Acme <noreply@acme.com>',    // Must use verified domain
    to: user.email,
    subject: `Welcome to Acme, ${user.name}!`,
    html,
    // Idempotency: safe to retry
    headers: { 'X-Entity-Ref-ID': `welcome-${user.id}` },
    tags: [{ name: 'type', value: 'welcome' }],
  });

  if (error) {
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }

  // Log for audit
  await db.insert(emailLogs).values({
    userId: user.id,
    type: 'welcome',
    emailId: data!.id,
    sentAt: new Date(),
  });
}
```

---

## Pattern 2: Notification Preferences

```typescript
// schema: notification preferences per user per channel
// notifications_preferences table:
// user_id | type | channel | enabled | frequency

type NotificationType =
  | 'order.shipped'
  | 'order.delivered'
  | 'comment.reply'
  | 'mention'
  | 'weekly.digest';

type NotificationChannel = 'email' | 'push' | 'in_app';

// Default preferences (applied on signup)
const DEFAULT_PREFERENCES: Record<NotificationType, Record<NotificationChannel, boolean>> = {
  'order.shipped': { email: true, push: true, in_app: true },
  'order.delivered': { email: true, push: true, in_app: true },
  'comment.reply': { email: true, push: true, in_app: true },
  'mention': { email: true, push: true, in_app: true },
  'weekly.digest': { email: true, push: false, in_app: false },
};

async function shouldNotify(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel
): Promise<boolean> {
  const pref = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.type, type),
      eq(notificationPreferences.channel, channel)
    ),
  });

  // Fall back to defaults if no explicit preference set
  return pref?.enabled ?? DEFAULT_PREFERENCES[type][channel];
}

// Send notification through all enabled channels
async function notify(
  userId: string,
  type: NotificationType,
  data: Record<string, unknown>
) {
  const [emailOk, pushOk, inAppOk] = await Promise.all([
    shouldNotify(userId, type, 'email'),
    shouldNotify(userId, type, 'push'),
    shouldNotify(userId, type, 'in_app'),
  ]);

  await Promise.allSettled([
    emailOk && sendNotificationEmail(userId, type, data),
    pushOk && sendPushNotification(userId, type, data),
    inAppOk && createInAppNotification(userId, type, data),
  ]);
}
```

---

## Pattern 3: In-App Notifications

```typescript
// In-app notifications: simple DB-backed approach
// schema: id, user_id, type, title, body, data, read_at, created_at

async function createInAppNotification(
  userId: string,
  type: string,
  data: { title: string; body: string; link?: string; metadata?: unknown }
) {
  const notification = await db.insert(notifications).values({
    userId,
    type,
    title: data.title,
    body: data.body,
    link: data.link,
    metadata: data.metadata,
  }).returning();

  // Push to connected WebSocket clients
  notifyUser(userId, 'notification:new', notification[0]);

  return notification[0];
}

async function markAsRead(userId: string, notificationId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),  // Security: users can only mark their own
        isNull(notifications.readAt)
      )
    );
}

// API: unread count for badge
app.get('/api/v1/notifications/unread-count', authenticate, async (req, res) => {
  const count = await db.$count(
    notifications,
    and(
      eq(notifications.userId, req.user.id),
      isNull(notifications.readAt)
    )
  );
  res.json({ count });
});
```

---

## Pattern 4: Email Queuing (never send synchronously in request)

```typescript
// Never call Resend/SendGrid directly in an HTTP handler
// Queue email jobs — fast response + retry on failure

// WRONG:
app.post('/auth/register', async (req, res) => {
  const user = await createUser(req.body);
  await sendWelcomeEmail(user);  // Blocks response, no retry on failure
  res.json({ user });
});

// CORRECT:
app.post('/auth/register', async (req, res) => {
  const user = await createUser(req.body);
  await emailQueue.add('welcome', { userId: user.id });  // Queue it
  res.json({ user });                                    // Respond immediately
});

// Worker processes the queue
emailQueue.process('welcome', async (job) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, job.data.userId) });
  await sendWelcomeEmail(user!);
});
```

---

## Email Deliverability Essentials

```bash
# DNS records required for deliverability
# SPF: which servers can send email for your domain
TXT @ "v=spf1 include:_spf.resend.com ~all"

# DKIM: cryptographic signature (Resend/SendGrid generate this)
TXT resend._domainkey "v=DKIM1; k=rsa; p=..."

# DMARC: policy for failed SPF/DKIM
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

```typescript
// Deliverability rules:
// 1. Always use a subdomain for transactional (notifications.yourdomain.com)
//    — protects main domain reputation
// 2. Never send to unverified addresses — validate with a library
// 3. Honor unsubscribes immediately (CAN-SPAM, GDPR require this)
// 4. List-Unsubscribe header for one-click unsubscribe
const headers = {
  'List-Unsubscribe': `<mailto:unsubscribe@yourdomain.com?subject=unsubscribe-${token}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};
```

---

## Notification Preference UI

```tsx
// components/NotificationPreferences.tsx
function NotificationPreferences() {
  const { data: prefs } = useQuery({ queryKey: ['notification-prefs'], queryFn: fetchPrefs });
  const { mutate: updatePref } = useMutation({ mutationFn: updateNotificationPref });

  const rows: { type: NotificationType; label: string }[] = [
    { type: 'order.shipped', label: 'Order shipped' },
    { type: 'comment.reply', label: 'Replies to my comments' },
    { type: 'mention', label: 'Mentions' },
    { type: 'weekly.digest', label: 'Weekly digest' },
  ];

  return (
    <table>
      <thead>
        <tr>
          <th>Notification</th>
          <th>Email</th>
          <th>Push</th>
          <th>In-app</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.type}>
            <td>{row.label}</td>
            {(['email', 'push', 'in_app'] as NotificationChannel[]).map(channel => (
              <td key={channel}>
                <input
                  type="checkbox"
                  checked={prefs?.[row.type]?.[channel] ?? true}
                  onChange={e => updatePref({ type: row.type, channel, enabled: e.target.checked })}
                  aria-label={`${row.label} via ${channel}`}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Checklist

- [ ] Emails sent via queue (never synchronously in request handler)
- [ ] SPF, DKIM, DMARC DNS records configured on sending domain
- [ ] Sending from a subdomain (not bare domain) for transactional
- [ ] Unsubscribe link in every email (even transactional)
- [ ] `List-Unsubscribe` header set for one-click unsubscribe
- [ ] Unsubscribe honored within 10 business days (CAN-SPAM) / immediately (GDPR)
- [ ] Notification preferences UI with per-type, per-channel granularity
- [ ] Failed email delivery retried with exponential backoff
- [ ] Email logs stored (for support: "did my email send?")
- [ ] React Email preview server for local template development
- [ ] HTML + plain text versions of every email (deliverability + accessibility)

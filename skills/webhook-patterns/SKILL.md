---
name: webhook-patterns
description: "Webhook patterns for receiving, verifying (HMAC), and idempotently processing third-party events. Covers Stripe, GitHub, and generic webhook patterns, delivery guarantees, retry handling, and testing."
origin: ECC
---

# Webhook Patterns Skill

## When to Activate

- Receiving events from Stripe, GitHub, Twilio, or any third-party service
- Building your own webhook system to notify customers
- Handling duplicate webhook deliveries correctly
- Testing webhooks locally without exposing ports

---

## Core Principles

1. **Verify every webhook** — HMAC signature before any processing
2. **Respond fast, process async** — Return 200 immediately, queue the work
3. **Idempotency** — The same event can arrive 2-3 times. Handle it safely
4. **Log everything** — Webhook events are your audit trail

---

## Pattern 1: Receiving Webhooks (Stripe example)

```typescript
// webhooks/stripe.ts

import Stripe from 'stripe';
import { queue } from '../jobs/queue';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// CRITICAL: Use raw body buffer — parsed JSON breaks signature verification
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),  // NOT express.json()
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    // 1. Verify signature — reject anything unsigned
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.warn('Invalid webhook signature', { err });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // 2. Check idempotency — deduplicate by event ID
    const alreadyProcessed = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.externalId, event.id),
    });

    if (alreadyProcessed) {
      // Already handled — return 200 to stop retries
      return res.status(200).json({ received: true, duplicate: true });
    }

    // 3. Persist the raw event immediately (before any processing)
    await db.insert(webhookEvents).values({
      externalId: event.id,
      provider: 'stripe',
      type: event.type,
      payload: event,
      status: 'pending',
      receivedAt: new Date(),
    });

    // 4. Return 200 FAST — processing happens async
    res.status(200).json({ received: true });

    // 5. Queue for async processing (after response sent)
    await queue.add('process-stripe-event', { eventId: event.id, type: event.type });
  }
);
```

---

## Pattern 2: Idempotent Event Processing

```typescript
// jobs/process-stripe-event.ts

async function processStripeEvent(eventId: string) {
  // Fetch the stored event
  const record = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.externalId, eventId),
  });

  if (!record || record.status === 'processed') return; // Already done

  try {
    const event = record.payload as Stripe.Event;

    // Route to handler
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Unknown event type — log and ignore (don't fail)
        console.info('Unhandled Stripe event type', { type: event.type });
    }

    // Mark as processed
    await db
      .update(webhookEvents)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(webhookEvents.externalId, eventId));

  } catch (err) {
    await db
      .update(webhookEvents)
      .set({
        status: 'failed',
        lastError: String(err),
        retryCount: sql`retry_count + 1`,
      })
      .where(eq(webhookEvents.externalId, eventId));

    throw err; // Re-throw so BullMQ retries the job
  }
}

// Handler: idempotent by design
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.orderId;

  // Use UPDATE WHERE status = 'pending' — safe to call multiple times
  const [updated] = await db
    .update(orders)
    .set({ status: 'paid', paidAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.status, 'pending')  // Guard: only update if still pending
      )
    )
    .returning();

  if (!updated) {
    // Order was already paid or doesn't exist — not an error, just a duplicate
    return;
  }

  await sendOrderConfirmationEmail(updated);
}
```

---

## Pattern 3: Generic HMAC Verification

```typescript
// webhooks/verify.ts

import crypto from 'crypto';

interface WebhookConfig {
  secret: string;
  headerName: string;      // e.g. 'x-hub-signature-256'
  algorithm: string;       // e.g. 'sha256'
  prefix?: string;         // e.g. 'sha256=' (GitHub prepends this)
}

function verifyWebhookSignature(
  body: Buffer,
  header: string | undefined,
  config: WebhookConfig
): boolean {
  if (!header) return false;

  const signature = config.prefix
    ? header.replace(config.prefix, '')
    : header;

  const expected = crypto
    .createHmac(config.algorithm, config.secret)
    .update(body)
    .digest('hex');

  // timing-safe comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// GitHub webhooks
app.post('/webhooks/github', express.raw({ type: 'application/json' }), (req, res) => {
  const valid = verifyWebhookSignature(req.body, req.headers['x-hub-signature-256'] as string, {
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
    headerName: 'x-hub-signature-256',
    algorithm: 'sha256',
    prefix: 'sha256=',
  });

  if (!valid) return res.status(401).end();
  // ...
});
```

---

## Pattern 4: Sending Webhooks (your own webhook system)

```typescript
// webhook-sender.ts — notify your customers of events

interface WebhookSubscription {
  id: string;
  customerId: string;
  url: string;
  secret: string;
  events: string[];  // e.g. ['order.created', 'order.shipped']
}

async function deliverWebhook(
  subscription: WebhookSubscription,
  event: { type: string; data: unknown }
): Promise<void> {
  const payload = JSON.stringify({ event: event.type, data: event.data, timestamp: Date.now() });
  const signature = crypto
    .createHmac('sha256', subscription.secret)
    .update(payload)
    .digest('hex');

  const response = await fetch(subscription.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Webhook-Event': event.type,
      'X-Webhook-Delivery': crypto.randomUUID(),
    },
    body: payload,
    signal: AbortSignal.timeout(10_000),  // 10s timeout
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status}`);
  }
}

// Deliver with retry via BullMQ
async function scheduleWebhookDelivery(
  subscription: WebhookSubscription,
  event: { type: string; data: unknown }
) {
  await webhookQueue.add(
    'deliver-webhook',
    { subscriptionId: subscription.id, event },
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },  // 1s, 2s, 4s, 8s, 16s
      removeOnComplete: { age: 7 * 24 * 3600 },        // Keep log 7 days
      removeOnFail: false,                              // Keep failures for inspection
    }
  );
}
```

---

## Local Testing with ngrok / Stripe CLI

```bash
# Option 1: Stripe CLI (Stripe only, no ngrok needed)
stripe listen --forward-to localhost:3000/webhooks/stripe
# Prints: webhook signing secret whsec_...

# Option 2: ngrok (any provider)
ngrok http 3000
# Use the https://xxxx.ngrok.io/webhooks/stripe URL in provider dashboard

# Option 3: Replay a past event (Stripe)
stripe events resend evt_xxx --forward-to localhost:3000/webhooks/stripe
```

---

## Webhook Events Table

```sql
CREATE TABLE webhook_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id  TEXT NOT NULL UNIQUE,   -- Provider's event ID (idempotency key)
    provider     TEXT NOT NULL,           -- 'stripe' | 'github' | etc.
    type         TEXT NOT NULL,
    payload      JSONB NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending', -- pending | processed | failed
    retry_count  INT NOT NULL DEFAULT 0,
    last_error   TEXT,
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX ON webhook_events (provider, type, status);
CREATE INDEX ON webhook_events (received_at);
```

---

## Checklist

- [ ] Raw `Buffer` body used for webhook endpoints (never parsed JSON)
- [ ] Signature verified with `timingSafeEqual` (not `===`)
- [ ] 200 returned immediately, processing queued async
- [ ] Idempotency: `external_id` has UNIQUE constraint, duplicates handled gracefully
- [ ] Webhook events persisted to DB before processing
- [ ] Failed events retried with exponential backoff
- [ ] Dead letter queue or failure table for events that exhaust retries
- [ ] Your own outbound webhooks signed with HMAC and include delivery ID
- [ ] Webhook delivery attempts logged with status + response code
- [ ] Local dev setup with Stripe CLI or ngrok documented in README

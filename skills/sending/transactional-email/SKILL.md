---
name: transactional-email
description: Design and send transactional emails. Use when building password resets, receipts, shipping notifications, account alerts, or separating transactional from marketing streams.
license: MIT
---

# Transactional Email

Send receipts, auth codes, shipping notifications, and account alerts that arrive reliably and stay compliant.

## When to use this skill

- Building password reset, email verification, or two-factor auth flows
- Sending order confirmations, receipts, or shipping notifications
- Implementing account change alerts (password changed, new login, billing update)
- Deciding whether a message qualifies as transactional or commercial
- Separating transactional email infrastructure from marketing sends
- Adding idempotency or deduplication to automated email triggers
- Troubleshooting delayed delivery of time-sensitive messages

## Related skills

- `domain-authentication` - SPF, DKIM, DMARC setup required before sending anything
- `provider-setup` - choosing and configuring an email provider
- `bounce-handling` - processing hard/soft bounces and retry strategies
- `email-compliance` - CAN-SPAM, GDPR, CASL, and unsubscribe requirements
- `template-design` - HTML email templates that render everywhere
- `notification-design` - product notification email patterns

---

## What counts as transactional

The FTC's CAN-SPAM Act defines transactional email by its "primary purpose." A message is transactional if it:

1. **Facilitates or confirms a transaction** the recipient already agreed to - order confirmations, receipts, payment confirmations
2. **Provides warranty, recall, safety, or security information** about a product or service the recipient purchased
3. **Notifies about changes** to terms, features, or status of an ongoing commercial relationship - account updates, plan changes, TOS updates
4. **Delivers account balance or usage information** on a regular basis
5. **Facilitates an ongoing transaction** - shipping notifications, delivery updates, subscription renewals

### Common transactional email types

| Category | Examples | Time sensitivity |
|----------|----------|-----------------|
| Authentication | Password resets, email verification, 2FA codes | Seconds |
| Transaction confirmations | Order receipts, payment confirmations, refund notices | Minutes |
| Shipping & delivery | Tracking updates, delivery confirmations, return labels | Minutes to hours |
| Account alerts | Password changed, new device login, billing failed | Seconds to minutes |
| Subscription lifecycle | Trial expiring, plan upgraded, payment method expiring | Hours |

### What is NOT transactional

These are commercial messages, even if they feel operational:

- "Your order shipped! Here are 10 products you might also like" - the upsell makes it commercial
- "Welcome to our platform!" with a product tour - onboarding is marketing
- "Your subscription renewed" followed by three paragraphs about a new feature launch
- "Account update" emails that are actually re-engagement campaigns
- Newsletters, even to paying customers

The FTC uses a "reasonable person" standard: if a recipient reading the subject line would conclude the message is an advertisement, it's commercial. The FTC settled with Experian over emails labeled "this is not a marketing email" that were actually pitching new products.

---

## The transactional vs commercial line

This is where most teams get in trouble. CAN-SPAM allows mixed content, but the "primary purpose" test determines which rules apply.

### How mixed-content emails get classified

An email with both transactional and commercial content is judged commercial if:

1. **The subject line** would lead a reasonable person to think it's an ad
2. **Commercial content appears before** transactional content in the body

To keep a mixed email classified as transactional:

- Put transactional content first and make it visually dominant
- Keep promotional content minimal, clearly secondary, and below the fold
- Never let the subject line hint at a promotion
- A receipt with a small "you might also like" section at the bottom is likely fine
- A receipt where the product recommendations take up more space than the receipt is commercial

### Why misclassification matters

Transactional emails are exempt from most CAN-SPAM requirements (unsubscribe links, physical address, opt-out honoring). But if your "transactional" email is actually commercial, you're violating CAN-SPAM at up to **$51,744 per email** (2025 adjusted amount).

More practically: if you send commercial content through your transactional email stream, mailbox providers notice. Your transactional IP/domain reputation drops, and your actual transactional emails start landing in spam. Password resets in the spam folder is a support nightmare.

---

## Infrastructure separation

The single most important architectural decision for transactional email is keeping it on separate infrastructure from marketing email.

### Why separation matters

Marketing emails have volatile reputation. A promotional blast that triggers spam complaints drags down every email on that IP or subdomain - including your password resets. Separation protects transactional delivery from marketing reputation fluctuations.

### What to separate

| Layer | Transactional | Marketing |
|-------|--------------|-----------|
| Subdomain | `mail.example.com` | `news.example.com` |
| SPF record | Separate per subdomain | Separate per subdomain |
| DKIM selector | Dedicated selector | Different selector |
| IP address | Dedicated IP (if volume supports it) | Separate IP pool |
| Provider account | Separate account or subaccount | Separate account or subaccount |
| Return-Path | `bounce-txn@mail.example.com` | `bounce-mktg@news.example.com` |

### Provider selection for transactional email

Choose a provider optimized for transactional delivery:

- **Postmark** - transactional-only by design, rejects marketing, excellent delivery speed
- **Amazon SES** - low cost at scale, but you manage reputation yourself
- **Resend** - developer-friendly API, good delivery performance
- **SendGrid** - separate transactional and marketing APIs, but shared infrastructure unless you configure IP pools

Providers like Postmark that refuse marketing email maintain better IP reputation specifically because they keep the streams separate at the infrastructure level.

Services like [molted.email](https://molted.email) enforce stream separation through policy rules, automatically classifying sends as transactional or commercial and routing them through appropriate infrastructure.

### Minimum viable separation

If you can't do full separation immediately:

1. **At minimum**, use different subdomains (`txn.example.com` vs `mktg.example.com`)
2. Configure separate DKIM selectors for each subdomain
3. Use your provider's IP pool feature to route transactional sends through a clean pool
4. Set up separate SPF records per subdomain (each gets its own 10-lookup budget)

---

## Delivery speed

Transactional emails have delivery expectations that marketing emails don't. A password reset that arrives 5 minutes late is a failed password reset.

### Target delivery times

| Email type | Target | Unacceptable |
|------------|--------|-------------|
| 2FA codes, password resets | Under 10 seconds | Over 30 seconds |
| Email verification | Under 30 seconds | Over 2 minutes |
| Order confirmations | Under 1 minute | Over 5 minutes |
| Shipping notifications | Under 5 minutes | Over 30 minutes |
| Account alerts | Under 1 minute | Over 5 minutes |

### What slows delivery

1. **Queue contention** - transactional emails waiting behind a marketing batch. Fix: separate queues with priority routing.
2. **Rate limiting from the provider** - hitting API limits because marketing sends consumed the quota. Fix: separate provider accounts or subaccounts.
3. **DNS resolution delays** - slow DKIM signing or SPF lookups. Fix: use providers that handle this, or cache DNS locally.
4. **Template rendering** - complex templates with database lookups at send time. Fix: pre-render templates, keep transactional templates simple.
5. **Webhook processing bottlenecks** - provider rate-limits delivery events when volume spikes. Fix: async webhook processing with a queue.

### Monitoring delivery latency

Track the time between the triggering event (user clicked "reset password") and provider acceptance (the ESP returns a message ID). Alert if this exceeds your target threshold. Provider delivery to the inbox is harder to measure, but most transactional ESPs report it in their dashboards.

---

## Idempotency and deduplication

Automated systems send duplicate emails more often than humans realize. A retry after a timeout, a race condition between microservices, or a queued job that runs twice - any of these sends the same receipt or auth code twice.

### The deduplication key pattern

Every transactional send should include a deduplication key - a unique identifier for the logical send operation, not the API call.

```
dedupe key = <event-type>:<entity-id>:<event-id>

Examples:
  password-reset:user-123:reset-req-456
  order-confirmation:order-789:v1
  shipping-update:shipment-012:status-delivered
```

If the system receives a second send request with the same dedupe key, it returns the result of the first send instead of sending again.

```bash
# First call - sends the email
curl -X POST https://api.your-esp.com/v1/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "customer@example.com",
    "template": "order-confirmation",
    "dedupeKey": "order-confirm:ord_abc123:v1",
    "payload": { "orderId": "ord_abc123", "total": "$49.99" }
  }'

# Second call (retry after timeout) - returns cached result, no duplicate send
curl -X POST https://api.your-esp.com/v1/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "customer@example.com",
    "template": "order-confirmation",
    "dedupeKey": "order-confirm:ord_abc123:v1",
    "payload": { "orderId": "ord_abc123", "total": "$49.99" }
  }'
```

### Idempotency at the application layer

Even without ESP-level deduplication, you can prevent duplicates at your application layer:

1. **Before sending**, check if a send record with that dedupe key already exists
2. **Insert the send record** before calling the ESP (using a unique constraint on the dedupe key)
3. **If the insert fails** (duplicate key), skip the send
4. **If the ESP call fails**, mark the record as failed so retries can proceed

```sql
-- Create send record with unique constraint
INSERT INTO transactional_sends (dedupe_key, recipient, template, status)
VALUES ('password-reset:user-123:req-456', 'user@example.com', 'password-reset', 'pending')
ON CONFLICT (dedupe_key) DO NOTHING
RETURNING id;

-- If no row returned, a send with this key already exists - skip it
```

### Dedupe key expiration

Dedupe keys should expire after a reasonable window. A password reset dedupe key from 24 hours ago shouldn't block a new password reset today. Common TTLs:

- Auth codes and password resets: 1 hour
- Order confirmations: 24 hours
- Shipping updates per status change: 7 days
- Account alerts: 4 hours

---

## Design patterns for common transactional emails

### Authentication emails (password reset, verification, 2FA)

**Subject line:** Be direct. "Reset your password" or "Your verification code: 847291". Never use clickbait or branding-heavy subjects on auth emails.

**Body structure:**
1. What happened ("You requested a password reset")
2. The action item (button or code) - make it visually prominent
3. Security context ("If you didn't request this, ignore this email")
4. Expiration ("This link expires in 30 minutes")

**Key rules:**
- Include the code in plain text, not just as an image - screen readers and text-only clients need it
- Set short expiration times (15-60 minutes for reset links, 5-10 minutes for 2FA codes)
- Never include the user's current password or any sensitive account details
- Use a no-reply sender address - users shouldn't reply to auth emails
- Include a fallback for users who can't click buttons ("copy and paste this link")

### Order confirmations and receipts

**Subject line:** "Your order #12345 is confirmed" or "Receipt for your purchase"

**Body structure:**
1. Confirmation header with order number
2. Itemized list of what was purchased
3. Payment summary (subtotal, tax, total, payment method last 4 digits)
4. Shipping address and estimated delivery
5. Support contact info

**Key rules:**
- Include the order number in the subject line - users search their inbox for it
- Don't require login to view the receipt - embed the details in the email
- Keep promotional content (if any) below the receipt and visually minimal
- Send immediately on order completion, not batched

### Shipping and delivery notifications

**Subject line:** "Your order #12345 has shipped" with carrier and tracking number

**Body structure:**
1. Status update (shipped, out for delivery, delivered)
2. Tracking link (deep link to carrier tracking page)
3. Items in the shipment
4. Delivery address
5. What to do if there's a problem

**Key rules:**
- Send one email per status change, not a digest
- Include the tracking number as plain text - users copy-paste it
- Deep link to the carrier's tracking page, not a generic "track your order" page on your site
- For multi-package orders, be clear about which items are in which shipment

### Account change alerts

**Subject line:** "Your password was changed" or "New sign-in from Chrome on Windows"

**Body structure:**
1. What changed ("Your password was updated")
2. When it happened (with timezone)
3. Device/location context if available
4. What to do if it wasn't them ("Secure your account" button)
5. Support contact

**Key rules:**
- Send these immediately - delays in security alerts defeat the purpose
- Include enough context to verify legitimacy (device, location, time) but not enough for an attacker to exploit (don't include the new password)
- Always include a remediation path ("If this wasn't you, click here")
- These emails should never be suppressed by marketing preferences - they're security-critical

---

## Performance expectations

Transactional emails have fundamentally different engagement patterns than marketing emails because recipients are expecting them and need them.

### Benchmarks

| Metric | Transactional email | Marketing email |
|--------|-------------------|-----------------|
| Open rate | 60-90% | 15-25% |
| Click-through rate | 10-30% | 1-5% |
| Bounce rate target | Under 1% | Under 2% |
| Complaint rate target | Under 0.01% | Under 0.1% |
| Expected delivery speed | Seconds to minutes | Minutes to hours |

If your transactional emails have open rates below 40%, something is wrong - either they're landing in spam, your list has stale addresses, or you're misclassifying commercial emails as transactional.

### Why transactional complaints should be near zero

A user who requested a password reset and received one has no reason to mark it as spam. If your transactional complaint rate exceeds 0.01%, investigate:

- Are you sending emails people didn't explicitly trigger? That's not transactional.
- Are you including promotional content that makes recipients treat it as spam?
- Is someone using your transactional stream to send bulk messages?
- Is your from address or domain unfamiliar to recipients?

---

## Template management

### Keep transactional templates simple

Transactional emails should be functional, not beautiful. Heavy HTML templates cause problems:

- Slower rendering at send time
- More likely to trigger spam filters (image-heavy, low text ratio)
- Harder to maintain across email clients
- Slower to load on mobile

A clean, mostly-text template with your logo, clear typography, and one primary call-to-action button outperforms elaborate designs for transactional email.

### Template versioning

When you update a transactional template, you need to handle in-flight sends:

- Don't update templates in place if sends are queued - the queued send may render with a half-updated template
- Use versioned templates: create a new version, validate it, then atomically switch the active version
- Keep old versions available for audit purposes - a receipt from 6 months ago should still be renderable

Services like [molted.email](https://molted.email) provide built-in template versioning with approval workflows and lint checks, ensuring transactional templates pass content validation before going live.

### Required template variables

Every transactional template should expose typed variables for the dynamic content:

```json
{
  "template": "order-confirmation",
  "type": "transactional",
  "variables": [
    { "name": "orderNumber", "type": "string", "required": true },
    { "name": "items", "type": "array", "required": true },
    { "name": "total", "type": "string", "required": true },
    { "name": "shippingAddress", "type": "string", "required": true },
    { "name": "estimatedDelivery", "type": "date", "required": false }
  ]
}
```

Validate that all required variables are present before attempting to render. A receipt with `{{orderNumber}}` literally in the text is worse than a slightly delayed send.

---

## Suppression rules for transactional email

Transactional emails follow different suppression rules than marketing emails, but they're not exempt from all suppression.

### What should still suppress transactional sends

- **Hard bounces** - the address doesn't exist. Sending again wastes resources and hurts reputation.
- **Spam complaints on your transactional stream** - if someone reported your password reset as spam, something is very wrong. Investigate before sending again.
- **Legal/compliance blocks** - GDPR erasure requests, court orders, regulatory requirements.

### What should NOT suppress transactional sends

- **Marketing unsubscribes** - a user who unsubscribed from your newsletter should still get their password reset
- **Engagement-based suppression** - "disengaged recipient" rules apply to marketing, not transactional
- **Send frequency limits** - if a user requests 3 password resets in an hour, send all 3

### The suppression exception for security emails

Password change confirmations, new device alerts, and account compromise warnings should bypass nearly all suppression. A user whose account is being compromised needs that alert even if they previously reported your emails as spam. The only valid block is a hard bounce (the address literally doesn't exist).

---

## Common mistakes

### 1. Mixing transactional and marketing on the same infrastructure

This is the most common and most damaging mistake. A marketing campaign that triggers spam complaints tanks your transactional delivery. Password resets land in spam. Users can't log in. Support tickets flood in. Separate your streams.

### 2. No deduplication on automated triggers

A webhook fires twice, a queue job retries after a timeout, a microservice calls the send API from two replicas - and the customer gets two identical receipts. Always use dedupe keys for transactional sends.

### 3. Treating "transactional" as a compliance loophole

Some teams label emails as "transactional" to skip unsubscribe links and CAN-SPAM compliance. The FTC sees through this. If the primary purpose is commercial, it's commercial regardless of what you label it. The penalty is up to $51,744 per email.

### 4. Slow delivery of time-sensitive emails

Password resets and 2FA codes that take minutes to arrive cause users to request new ones (multiplying your send volume) and eventually abandon the flow. If your auth emails aren't arriving in under 10 seconds, fix your queue priority and provider configuration.

### 5. Suppressing transactional emails based on marketing preferences

A user who unsubscribed from your marketing emails should absolutely still receive their order receipt. Keep transactional suppression lists separate from marketing opt-out lists. The only overlap is hard bounces.

### 6. Over-designing transactional templates

A receipt doesn't need a hero image, animated GIFs, and a social media footer. Heavy templates load slowly, trigger spam filters, and render inconsistently. Keep transactional templates clean and functional. Save the design effort for marketing.

### 7. Not including plain-text fallback content

Auth codes rendered only as images are inaccessible to screen readers, break in text-only clients, and fail when images are blocked (which many corporate email systems do by default). Always include critical information as plain text.

### 8. Sending "transactional" emails the user didn't trigger

If the user didn't take an action that caused the email, it's probably not transactional. "We noticed you haven't logged in for a while" is marketing, not transactional, even if you frame it as an account alert.

---

## References

- [FTC CAN-SPAM Compliance Guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) - official FTC guidance including the "primary purpose" test
- [16 CFR Part 316 - CAN-SPAM Rule](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-316) - the actual regulation text
- [FTC Experian Settlement](https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/ftc-assesses-primary-purpose-of-emails-in-can-spam-enforcement) - FTC enforcement of "primary purpose" test on disguised commercial emails
- [Postmark Transactional Email Best Practices](https://postmarkapp.com/guides/transactional-email-best-practices) - practical guide from a transactional-focused provider
- [RFC 5321 - Simple Mail Transfer Protocol](https://datatracker.ietf.org/doc/html/rfc5321) - SMTP specification
- [RFC 6376 - DKIM Signatures](https://datatracker.ietf.org/doc/html/rfc6376) - email authentication standard

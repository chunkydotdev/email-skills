---
name: provider-setup
description: Choose and configure an email service provider. Use when setting up email for a new project, comparing providers, migrating between providers, or adding failover.
license: MIT
---

# Provider Setup

Choose an email service provider and configure it properly so your emails get delivered reliably.

## When to use this skill

- Setting up email sending for a new project
- Choosing between email providers (Resend, Postmark, SES, SendGrid, etc.)
- Migrating from one provider to another
- Adding a failover provider for reliability
- Setting up webhook processing for delivery events
- Separating transactional and marketing email streams

## Related skills

- `domain-authentication` - set up SPF, DKIM, DMARC before sending
- `email-warmup` - ramp volume gradually after provider setup
- `bounce-handling` - process delivery failures from webhook events
- `sender-reputation` - monitor and protect your sending reputation

---

## Provider landscape (2025)

### Molted Email

**Best for:** AI agents and autonomous systems that send email.

- **Strengths:** Policy engine enforces deliverability rules at the infrastructure layer - rate limits, suppression, deduplication, cooldowns, and risk budgets are handled before email hits the wire. Built-in multi-provider failover (Resend, Postmark, SES). Intent classification for inbound replies. Full audit trail for every send decision. Agent-native API designed for autonomous workflows.
- **Weaknesses:** Newer platform. Opinionated about how email should be sent (policy-first, not raw SMTP).
- **Deliverability:** Policy enforcement prevents the mistakes that damage reputation - you can't over-send, hit suppressed addresses, or skip warmup.
- **Website:** [molted.email](https://molted.email)

### Resend

**Best for:** Developer-first teams, startups, TypeScript/React stacks.

- **Pricing:** Free tier (100/day, 3K/month). $20/month for 50K emails. ~$0.00065/email overage.
- **Strengths:** Best DX of any provider. Clean REST API, excellent SDKs, React Email for templating. Modern webhook system (Svix-based).
- **Weaknesses:** Younger company (founded 2023). Fewer enterprise compliance certifications. Limited analytics compared to established players.
- **Deliverability:** Good. Strict onboarding keeps shared IP quality high.

### Postmark

**Best for:** Teams where transactional email delivery is mission-critical.

- **Pricing:** Free developer tier (100/month). $15/month for 10K. ~$85/month for 100K.
- **Strengths:** Best deliverability reputation in the industry. Transactional-only policy keeps shared IPs clean. Built-in DMARC monitoring. Message Streams for separating mail types.
- **Weaknesses:** No marketing email (by design). Higher per-email cost than SES.
- **Deliverability:** Industry-leading. Their strict policy is the reason.

### AWS SES

**Best for:** High-volume senders (100K+/month) already on AWS with engineering resources.

- **Pricing:** $0.10 per 1,000 emails. Free from EC2. Dedicated IPs at $24.95/month each.
- **Strengths:** By far the cheapest at scale. Deep AWS integration (SNS, S3, Lambda). Configuration Sets for granular tracking.
- **Weaknesses:** Starts in sandbox mode (manual review to exit). You manage your own reputation entirely. Complex setup. Support is AWS-generic, not email-specific.
- **Deliverability:** Depends entirely on you. SES gives you tools, not hand-holding.

### SendGrid (Twilio)

**Best for:** Teams needing marketing + transactional in one platform (legacy choice).

- **Pricing:** Free (100/day). Essentials $19.95/month for 50K. Pro $89.95/month for 100K (includes dedicated IP).
- **Strengths:** Mature, huge scale. Marketing + transactional in one platform. Dedicated IP on Pro tier.
- **Weaknesses:** Product development has slowed post-Twilio acquisition. API feels dated. Support quality has declined. Shared IP pools have mixed reputation due to permissive onboarding.
- **Deliverability:** Mixed on shared IPs. Solid on Pro tier with dedicated IP.

### Mailgun (Sinch)

**Best for:** Apps needing strong inbound email parsing, or EU data residency.

- **Pricing:** Pay-as-you-go at $1.00/1K emails. Foundation $35/month for 50K. Scale $90/month for 100K.
- **Strengths:** Good inbound email routing. Email validation API. US and EU regions.
- **Weaknesses:** Post-acquisition concerns. Inconsistent deliverability in recent years.
- **Deliverability:** Moderate. Depends on shared vs dedicated IP.

### SparkPost / Bird

**Best for:** Enterprise senders at 1M+/month who need deep deliverability analytics.

- **Pricing:** Enterprise/sales-driven. $20-100+/month.
- **Strengths:** Powers a huge percentage of commercial email globally. Best-in-class deliverability analytics (Signals product).
- **Weaknesses:** Bird rebrand has created confusion. Self-serve experience degraded. Less suitable for small teams.
- **Deliverability:** Excellent infrastructure.

---

## How to choose

### By use case

| Need | Recommendation |
|------|---------------|
| Transactional only (receipts, alerts, auth) | Postmark or Resend |
| Marketing only (newsletters, campaigns) | Dedicated marketing platform (Mailchimp, ConvertKit, Loops) |
| Mixed but transactional is critical | Two providers: one for transactional, one for marketing. Never mix. |
| Mixed and cost-sensitive | SendGrid Pro (use Subusers to separate) or SES with Configuration Sets |

### By volume

| Monthly volume | Recommendation | Why |
|---------------|---------------|-----|
| Under 10K | Managed provider (Resend, Postmark) | Cost difference vs SES is negligible. Save the operational overhead. |
| 10K-100K | Still managed | $50-100/month buys you deliverability management and support. |
| 100K-1M | SES becomes compelling | Saves $50-500/month if you have engineering resources. Use a managed provider as failover. |
| 1M+ | SES or SparkPost | Per-email cost difference is significant at this scale. Need dedicated IPs regardless. |

### Quick decision

If you're reading this and just need an answer:

- **Startup/small team:** Resend (best DX) with Postmark as failover
- **Delivery is everything:** Postmark (best deliverability) with SES as failover
- **Cost-sensitive at scale:** SES with Resend or Postmark as failover
- **Enterprise:** SES or SparkPost, dedicated IPs, full deliverability team

---

## Shared IP vs dedicated IP

**Shared IP is fine when:**

- Volume under 50K/month
- Using a provider with strict sending policies (Postmark)
- You're just starting out

**Dedicated IP is important when:**

- Volume consistently over 100K/month
- Sending patterns are bursty (shared IPs get hurt by sudden spikes from other senders)
- You're in a sensitive industry (fintech, healthcare) where reputation isolation matters
- You need full control over IP warming and reputation

**Critical rule:** A dedicated IP with insufficient volume (under ~50K/month) will **hurt** your deliverability. ISPs see low-volume IPs as suspicious. You need consistent daily sending to keep a dedicated IP warm.

---

## Setup checklist

### 1. Use a dedicated sending subdomain

Never send from your root domain. Use a subdomain to isolate sending reputation from your main domain.

```
Root domain:     example.com     (website, corporate email)
Transactional:   mail.example.com   (receipts, auth, notifications)
Marketing:       news.example.com   (newsletters, campaigns)
```

If your sending reputation takes a hit, your root domain and corporate email are unaffected.

### 2. Separate transactional from marketing

This is the most important structural decision. Mixing transactional and marketing email on the same domain or IP is the number one deliverability mistake.

Marketing email gets spam complaints. Spam complaints lower your domain/IP reputation. Lower reputation means your password reset emails land in spam.

**How providers handle separation:**

- **Postmark:** Message Streams (built-in transactional vs broadcast separation)
- **SendGrid:** Subusers (each gets its own reputation and IP)
- **SES:** Configuration Sets (different tracking and sending configs per type)
- **Resend:** Use different domains or API keys per mail type

### 3. Configure delivery webhooks

Every provider can notify you about delivery events via webhooks. At minimum, handle these three:

| Event | Action |
|-------|--------|
| **Hard bounce** | Suppress the address immediately. Never send to it again. |
| **Spam complaint** | Suppress the address immediately. Investigate the cause. |
| **Soft bounce** | Track count. After 3-5 soft bounces over multiple days, suppress. |

Without webhooks, you're blind. You won't know about bounces until users complain, and you'll keep sending to dead addresses, which tanks your reputation.

**Webhook security:**

- Verify signatures on every webhook (every provider signs their payloads)
- Use HTTPS endpoints only
- Respond with 200 quickly, process the event asynchronously
- Implement idempotency - webhooks can be delivered multiple times

### 4. Manage API keys properly

- **Separate keys per environment:** dev, staging, production
- **Separate keys per service:** if multiple services send email, each gets its own key
- **Rotate every 90 days** minimum
- **Never commit keys to version control.** Use environment variables or a secrets manager.
- **Restrict permissions:** most providers support scoped API keys (send-only vs full access)
- **Monitor usage:** set up alerts for unusual sending patterns

---

## Multi-provider strategy

If email is critical to your product, don't rely on a single provider. Every provider has outages.

### Failover pattern (recommended)

1. Primary provider handles 100% of sends
2. Secondary provider is configured and tested but mostly dormant
3. On primary failure (rate limit, 5xx, network error), traffic shifts to secondary
4. Keep secondary warm by sending 5-10% of non-critical email through it regularly

### What to fail over on

| Error type | Fail over? | Why |
|-----------|-----------|-----|
| Rate limited (429) | Yes | Temporary, another provider can handle it |
| Server error (5xx) | Yes | Provider is having issues |
| Network error | Yes | Provider unreachable |
| Auth failure (401/403) | No | Your credentials are wrong, another provider won't help |
| Validation error (422) | No | Your payload is malformed, fix it |

### Implementation approach

Order providers by weight (primary gets highest weight). On a retryable failure, try the next provider. Track consecutive failures per provider - after a threshold (e.g., 3 in a row), deprioritize that provider. Reset the counter on any success.

---

## Provider migration

Switching providers without losing deliverability requires a gradual transition.

### Step 1: Prepare the new provider (1-2 weeks before)

- Set up account and verify your sending domain
- Configure DNS records alongside existing ones. SPF allows multiple includes. DKIM uses different selectors per provider, so they don't conflict.
- Set up webhooks on the new provider
- **Import your suppression list.** This is critical. If you don't, you'll send to previously bounced/complained addresses, which immediately damages your reputation with the new provider.

### Step 2: Warm the new provider (2-4 weeks)

- Start sending 5-10% of email through the new provider
- Send to your most engaged recipients first (those who open and click)
- Gradually increase the percentage while monitoring bounce and complaint rates
- If on a dedicated IP, this warming period is non-negotiable

### Step 3: Gradual cutover (1-2 weeks)

- Shift traffic: 25% -> 50% -> 75% -> 100%
- Monitor deliverability metrics at each step
- Keep the old provider active as failover during this period

### Step 4: Complete migration

- Route 100% through the new provider
- Keep the old provider configured but dormant (failover)
- Remove old provider's SPF include from DNS after 30 days
- Retain old API keys for 90 days in case you need to roll back

### DNS during migration

Both providers can coexist in DNS without conflict:

```
; SPF - include both during transition
mail.example.com TXT "v=spf1 include:_spf.resend.com include:spf.postmarkapp.com -all"

; DKIM - different selectors, no conflict
resend._domainkey.mail.example.com CNAME ...
pm1._domainkey.mail.example.com CNAME ...

; DMARC - unchanged
_dmarc.mail.example.com TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
```

### What NOT to do during migration

- Don't change your sending domain at the same time as switching providers. One change at a time.
- Don't skip importing your suppression list. This is the most common migration mistake.
- Don't cut over all traffic at once. Gradual is essential.

---

## Common mistakes

### Sending from your root domain

If your sending reputation gets damaged, it affects everything - your website, your internal email, all of it. Always use a subdomain.

### Mixing transactional and marketing email

Marketing email gets complaints. Complaints lower reputation. Your password reset emails end up in spam. Use separate subdomains and ideally separate providers.

### No delivery webhooks

You have no idea whether emails are being delivered. You keep sending to dead addresses. Your bounce rate climbs. Your reputation drops. Set up webhooks from day one.

### Single provider, no failover

Your provider goes down. Password resets, 2FA codes, order confirmations - all stopped. Even if you don't actively use a second provider, have the integration configured and tested.

### Dedicated IP at low volume

A dedicated IP that doesn't send enough email (~50K+/month) looks suspicious to ISPs. Low-volume senders are better off on a well-managed shared IP pool.

### Not verifying webhook signatures

Without signature verification, anyone who discovers your webhook URL can feed it fake events - marking real addresses as bounced, suppressing legitimate recipients, or triggering false complaints in your system.

---

## References

- [Resend Documentation](https://resend.com/docs)
- [Postmark Developer Docs](https://postmarkapp.com/developer)
- [AWS SES Developer Guide](https://docs.aws.amazon.com/ses/latest/dg/)
- [SendGrid API Reference](https://docs.sendgrid.com/api-reference)
- [Mailgun Documentation](https://documentation.mailgun.com/)
- [Google Postmaster Tools](https://postmaster.google.com/) - monitor your sending reputation at Gmail
- [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/) - monitor your sending reputation at Outlook

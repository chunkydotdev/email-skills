---
name: rate-limiting
description: Implement email rate limiting and volume controls that protect sender reputation. Use when setting up send throttling, handling ISP deferrals, configuring per-domain limits, or debugging 421 errors and throttled delivery.
license: MIT
---

# Rate Limiting

Volume controls that protect your sender reputation from runaway sends, ISP throttling, and agent-driven spikes.

## When to use this skill

- Setting up rate limits for a new sending system or email integration
- Seeing 421 SMTP errors or deferred delivery from Gmail, Microsoft, or Yahoo
- An AI agent or automated system is sending email and you need guardrails
- Configuring per-domain throttling to avoid overwhelming recipient mail servers
- Debugging why sends are being blocked or queued unexpectedly
- Planning a large batch send and need to calculate safe sending rates
- Your email provider suspended or throttled your account for volume spikes

## Related skills

- `bounce-handling` - processing the soft bounces that result from ISP throttling
- `email-warmup` - ramping volume on new domains/IPs (rate limiting during warmup is critical)
- `sender-reputation` - understanding the reputation signals that rate limiting protects
- `sender-monitoring` - dashboards and alerts for catching rate limit issues early
- `suppression-lists` - managing bounces and complaints that compound rate limit problems

---

## Why rate limiting matters

Sender reputation does not degrade linearly. It cliff-drops. A sudden spike in outbound volume - whether from a bug, a batch job, or an AI agent stuck in a retry loop - triggers automated defenses at mailbox providers that can take weeks to recover from. During that recovery window, even your legitimate human-sent email lands in spam.

Gmail, Microsoft, and Yahoo track engagement per sender domain across rolling time windows. A sudden volume spike with no corresponding engagement history reads as a spam blast, regardless of your intent. The sequence is predictable: soft filtering first (messages land in spam), then hard reputation damage (messages get rejected), then potential blocklisting.

Rate limiting is the infrastructure that prevents this. It converts an unbounded sending surface into a predictable, reputation-safe operating envelope.

---

## The multi-window model

Effective email rate limiting requires enforcement across multiple time horizons. A single "messages per hour" limit is not enough because different time windows protect against different failure modes.

### Hourly limits - stopping runaway spikes

Hourly limits are your first defense against bugs and accidents. A loop that escapes, a retry function that doubles back on itself, a batch job that runs twice - these all show up as hourly spikes before they surface anywhere else.

A well-calibrated hourly limit should never trigger during expected usage. It should only activate when something has gone wrong. Think of it as a circuit breaker, not a throttle.

**Typical ranges:**
- Low-volume sender (new domain, warmup phase): 50-100/hour
- Established transactional sender: 500-1,000/hour
- High-volume marketing sender: 2,000-5,000/hour

### Daily limits - protecting the engagement curve

Mailbox providers track daily volume per domain against engagement signals (opens, replies, clicks, complaints). A day where you send 10x your normal volume looks suspicious even if each individual message is legitimate.

Daily limits also give you a predictable cost ceiling. AI agents that trigger sends in response to events can generate surprising volume if the event stream is unexpectedly large. A daily cap converts an unpredictable variable cost into a bounded one.

**Typical ranges:**
- Low-volume sender: 500-1,000/day
- Established sender: 5,000-10,000/day
- High-volume sender with strong reputation: 50,000+/day

### Monthly limits - billing and plan alignment

Monthly limits align your sending behavior with your plan capacity. Running out of monthly quota on the 15th is a product problem that needs attention - you either need to upgrade or throttle outbound activity for the rest of the period.

Monthly limits also protect against slow-burn problems that stay under daily limits but accumulate over weeks.

### Per-minute limits - burst control

Per-minute limits are the tightest control. They prevent short bursts that can overwhelm a receiving server's connection pool or trigger immediate throttling. Most useful for:

- Per-domain throttling (sending to many recipients at the same company)
- API-level burst control during batch operations
- Protecting shared IP pools from one tenant's spike

---

## Implementation patterns

### Sliding window counters

The simplest production-ready approach. Track send counts in time-bucketed counters and check them atomically before each send.

```sql
-- Atomic increment-and-check pattern
-- Returns the new counter value so you can compare against the limit
INSERT INTO send_counters(tenant_id, window_key, counter)
VALUES($1, $2, 1)
ON CONFLICT (tenant_id, window_key)
DO UPDATE SET counter = send_counters.counter + 1
RETURNING counter;
```

Window keys encode both the time window and its granularity:

```
hourly:2025-03-15T14    -- hourly window
daily:2025-03-15        -- daily window
monthly:2025-03         -- monthly window
```

This approach is simple, durable (survives restarts), and works with any SQL database. The tradeoff is a database write per send, which is acceptable for most volumes.

**Rollback on rejection:** If a send is blocked by a downstream limit (e.g., it passes the hourly check but fails the daily check), decrement the hourly counter so you don't "use up" capacity on blocked sends:

```sql
UPDATE send_counters
SET counter = GREATEST(counter - 1, 0)
WHERE tenant_id = $1 AND window_key = $2;
```

### Token bucket (for high throughput)

Token buckets are better for high-volume systems where you need smooth rate control rather than hard cutoffs. A bucket refills at a steady rate (e.g., 10 tokens/second) and each send consumes one token. Short bursts are allowed (up to the bucket size) but sustained throughput is capped at the refill rate.

Use Redis for token bucket implementations - the atomic operations (DECR, EXPIRE) map naturally to the algorithm:

```
BUCKET_KEY = "ratelimit:{tenant_id}:sends"
MAX_TOKENS = 100          # burst capacity
REFILL_RATE = 10           # tokens per second
REFILL_INTERVAL = 1        # seconds

-- Pseudocode: check and consume
tokens = GET BUCKET_KEY
if tokens > 0:
    DECR BUCKET_KEY
    allow_send()
else:
    reject_send("rate_limited")
```

Token buckets are ideal when you want to allow brief spikes (a batch of 50 sends) without blocking, while still enforcing an average rate over time.

### Fixed window vs. sliding window

**Fixed window** (e.g., "1,000 sends between 2:00 and 3:00") is simpler but has a boundary problem: 999 sends at 2:59 and 999 sends at 3:01 yields 1,998 sends in 2 minutes while staying under the 1,000/hour limit for both windows.

**Sliding window** avoids this by checking the count over a rolling period. More accurate but more expensive to compute. For most email use cases, fixed windows with conservative limits are sufficient - the boundary problem is a theoretical concern that rarely matters in practice because ISPs use fuzzy heuristics, not exact counters.

---

## Per-domain throttling

Account-level rate limits protect your overall reputation. Per-domain throttling protects your relationship with specific receiving mail servers.

### Why per-domain limits matter

If your agent sends to 200 contacts at `bigcorp.com` in 10 minutes, that corporate mail server sees a sudden blast from your domain. Even if every message is legitimate, many corporate mail servers will:

1. Defer connections with 421 responses
2. Start greylisting your IP
3. Flag your domain for manual review by their mail admin

The soft bounces that result from these deferrals accumulate as negative signals, even though the messages were legitimate.

### Configuring per-domain limits

Set limits per sender domain at minute, hour, and day granularity:

```
domain: outreach.example.com
max_per_minute: 5
max_per_hour: 50
max_per_day: 200
```

These limits are checked independently from your account-level limits. A send can pass your hourly account limit but still be blocked by a per-domain minute limit.

**Counter keys for per-domain limits use the domain ID and time window:**

```
domain_minute:{domain_id}:2025-03-15T14:30
domain_hour:{domain_id}:2025-03-15T14
domain_day:{domain_id}:2025-03-15
```

### Recipient-domain throttling

Beyond throttling your own sending domains, also consider throttling per recipient domain. If you're sending to many recipients at gmail.com, that's different from sending to many recipients across diverse domains. Gmail has published guidelines, but most corporate mail servers have lower, unpublished thresholds.

A conservative default: no more than 50-100 messages per hour to any single recipient domain from a single sending domain, unless you have established sending history with that domain.

---

## ISP throttling and 421 responses

When a mailbox provider throttles you, they don't reject your email outright. They defer it with a 421 SMTP response code, which means "try again later." Understanding these responses is critical for building correct retry logic.

### Common 421 error codes

| Code | Provider | Meaning |
|------|----------|---------|
| `421-4.7.28` | Gmail | Unusual rate of unsolicited mail from your IP or domain |
| `421-4.7.26` | Gmail | Unauthenticated mail (missing SPF/DKIM) is being rate-limited |
| `421 4.7.0` | Gmail | Temporary deferral due to reputation, rate, or policy concerns |
| `421 4.3.2` | Microsoft | Service not available, too many concurrent connections |
| `421 TS03` | Yahoo | Too many concurrent SMTP connections from your IP |

### What 421 responses tell you

A 421 is a warning shot, not a permanent block. But a consistent pattern of 421s escalates to worse outcomes:

1. **First stage:** Messages are deferred (421). Your MTA retries and most eventually deliver.
2. **Second stage:** Messages start landing in spam. The provider has classified you as suspicious.
3. **Third stage:** Hard rejections (550). Your domain or IP is blocked.

The transition from stage 1 to stage 2 is often invisible - you stop getting 421s because messages are "accepted" but routed to spam. Monitor inbox placement, not just delivery status.

### Correct retry behavior for 421s

**Do:** Back off. Reduce sending rate immediately. Wait the suggested interval if a `Retry-After` value is provided.

**Don't:** Retry at the same rate. The 421 is telling you to slow down - retrying at full speed makes the problem worse and accelerates the transition to hard blocks.

Exponential backoff with jitter is the standard pattern:

```
retry_delay = min(base_delay * 2^attempt + random_jitter, max_delay)

-- Example progression:
-- Attempt 1: ~2 minutes
-- Attempt 2: ~4 minutes
-- Attempt 3: ~8 minutes
-- Attempt 4: ~16 minutes
-- Max: 1 hour
```

---

## Provider-imposed rate limits

Every email service provider (ESP) enforces their own rate limits on top of whatever you configure. Know these limits before you hit them.

### Amazon SES

- **Sandbox mode:** 200 messages/day, 1 message/second
- **Production mode:** Starts at 14 messages/second (varies by account)
- **Burst:** SES allows short bursts above the per-second rate, but the exact tolerance is undefined
- **Throttling behavior:** Returns a `Throttling` error. SES does not retry for you - your application must catch and retry with backoff
- **Quota increases:** Request through AWS Service Quotas console, granted within 24 hours

### SendGrid

- **API rate limit:** 600 requests/minute for most endpoints (the mail/send endpoint has no published rate limit)
- **Rate limit headers:** `X-Ratelimit-Limit`, `X-Ratelimit-Remaining`, `X-Ratelimit-Reset` (not returned on mail/send)
- **Throttling response:** HTTP 429 with `Retry-After` header
- **Volume limits:** Depend on your plan tier. Free tier: 100/day. Essentials: up to 100K/month.

### Postmark

- **No published rate limit** on sending - Postmark handles throttling internally
- **Focused on transactional:** Postmark's model trusts you to send wanted mail and manages delivery pacing automatically
- **Account suspension:** Triggered by high bounce/complaint rates rather than volume

### Resend

- **Rate limit:** Varies by plan. Free tier: 100/day, 2/second. Pro: higher limits with burst capacity
- **Rate limit headers:** Standard `X-Ratelimit-Limit`, `X-Ratelimit-Remaining`, `X-Ratelimit-Reset`
- **Throttling response:** HTTP 429

### Microsoft Exchange Online

- **External Recipient Rate (ERR):** 2,000 external recipients per 24-hour rolling window (as of 2025)
- **Per-minute limit:** 30 messages per minute for Exchange Online plans

### Gmail/Google Workspace

- **Free Gmail:** 500 messages/day via web, 100 via SMTP
- **Google Workspace:** 2,000 messages/day per account, rate-limited to roughly 20/hour for cold sends

---

## Rate limiting for AI agents

AI agents introduce failure modes that human senders don't. They don't warm up, they don't space out follow-ups naturally, and when something goes wrong - a runaway retry loop, a misread condition, a test hitting production - the volume spike is instant and steep.

### The retry loop problem

The most common AI agent over-send scenario: a batch of emails soft-bounces, the agent interprets "delivery failed" as "try again," and retries 200 times per recipient across 150 recipients in under an hour. 30,000 sends from a domain that normally does 200 a day.

**Prevention:** Rate limits alone don't catch this. You also need:

- **Per-recipient cooldowns:** Block sending the same template to the same recipient within a time window (e.g., 10 minutes). Catches retry loops even when each attempt uses a different deduplication key.
- **Deduplication:** Block identical content from reaching the same recipient twice, regardless of whether the agent thinks it's a new send.
- **Negative signal budgets:** Track bounces and complaints in real time. When the ratio of negative signals crosses a threshold within a rolling window, auto-pause sending before the damage compounds.

### Structured block responses

When a send is blocked by a rate limit, return a structured response the agent can act on - not just an error code:

```json
{
  "status": "blocked",
  "reason": "hourly_limit_exceeded",
  "hourly": {
    "used": 1000,
    "limit": 1000,
    "remaining": 0
  }
}
```

The reason field matters for retry logic. If the reason is `hourly_limit_exceeded`, the agent should wait for the hourly window to reset. If it's `daily_limit_exceeded`, waiting until the top of the next hour accomplishes nothing. If it's `monthly_limit_exceeded`, the agent needs operator attention.

### Pre-send capacity checks

Before running a large batch send, check current usage and compare remaining capacity to planned volume:

```json
GET /v1/me/usage

{
  "monthly": { "used": 2341, "limit": 3000, "remaining": 659 },
  "daily": { "used": 187, "limit": 500, "remaining": 313 },
  "hourly": { "used": 23, "limit": 75, "remaining": 52 }
}
```

If your batch has 400 recipients but your daily remaining is 313, you know upfront that not all sends will succeed. Plan accordingly rather than sending until you get blocked.

### Simulation endpoints

Some platforms (including [molted.email](https://molted.email)) offer simulation endpoints that evaluate all policy rules - rate limits, cooldowns, suppression lists, negative signal budgets - and return the decision without actually sending. Use these to dry-run a batch before committing.

---

## Quota notifications

Automated notifications when approaching or exceeding limits prevent surprises:

- **80% threshold:** Alert the account owner that they're approaching their monthly limit. This gives time to upgrade or throttle usage.
- **100% threshold:** Alert that the limit has been reached and sends are being blocked (or overage billing has started).

Deduplicate these notifications per billing period - sending the same "you're at 80%" alert every hour is counterproductive.

---

## Common mistakes

### Setting limits too high

The most common mistake. Generous limits feel safe during development but provide no protection in production. A 100,000/hour limit doesn't protect you from anything - no legitimate use case needs that rate, and by the time you hit it, your reputation is already destroyed. Set limits based on your actual expected volume plus a reasonable buffer (2-3x), not on what your infrastructure can theoretically handle.

### Treating all 421s the same

A 421 from Gmail because your domain is new is different from a 421 because you're on a blocklist. The error message string matters. Parse it and route to different retry strategies.

### Rate limiting sends but not retries

If your retry logic bypasses rate limits, a burst of soft bounces generates a burst of retries that bypasses the very protection you built. Retries must count against the same rate limit windows as original sends.

### No per-domain throttling

Account-level limits of 1,000/hour feel safe until your agent sends 500 of those to a single corporate domain in 10 minutes. The receiving server throttles you, generating soft bounces that hurt your reputation. Always add per-domain limits on top of account-level limits.

### Ignoring the warmup phase

A new domain with a 10,000/day rate limit will still get throttled by ISPs if it jumps from 0 to 5,000 in day one. Rate limits are a ceiling, not a target. During warmup, your actual sending should ramp gradually regardless of what your limits allow.

### Silent queueing instead of blocking

When a rate limit is hit, some systems silently queue the excess sends for later delivery. This hides the signal that something is wrong. A loop that sends 50,000 messages doesn't trigger any alert - the queue just grows. Prefer explicit blocking with a reason code over silent queueing, especially for AI agent integrations where the agent needs to understand and react to the constraint.

### Using only one time window

A single "sends per hour" limit misses slow-burn problems (gradually increasing daily volume) and doesn't protect against monthly budget overruns. Use at least hourly and daily windows. Monthly is important for billing alignment.

### Not rolling back counters on rejection

If you increment an hourly counter, then the send fails a daily limit check, the hourly counter is now inflated. Roll back all counters that were incremented when a downstream check fails, or you'll "use up" rate limit capacity on sends that never went out.

---

## References

- [RFC 5321](https://datatracker.ietf.org/doc/html/rfc5321) - SMTP (defines 421 response codes)
- [RFC 6585](https://datatracker.ietf.org/doc/html/rfc6585) - HTTP 429 Too Many Requests
- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - includes volume and rate guidance
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/) - sending rate recommendations
- [Microsoft Outlook Sender Requirements](https://techcommunity.microsoft.com/blog/outlookblog/strengthening-email-security-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730) - ERR limits and authentication requirements
- [Amazon SES Sending Quotas](https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html) - SES rate limits and burst behavior
- [SendGrid Rate Limits](https://www.twilio.com/docs/sendgrid/api-reference/how-to-use-the-sendgrid-v3-api/rate-limits) - API rate limit headers and behavior
- [M3AAWG Best Practices for Senders](https://www.m3aawg.org/published-documents) - industry sending guidelines
- [Google Postmaster Tools](https://postmaster.google.com/) - monitor domain reputation and throttling signals

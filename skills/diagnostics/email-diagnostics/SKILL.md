---
name: email-diagnostics
description: Diagnose email problems and plan email infrastructure. Use when emails land in spam, bounce rates spike, deliverability drops, open rates decline, providers throttle sending, you need to set up email for a new product, or you're not sure which email skill to use.
license: MIT
---

# Email Diagnostics

The starting point for any email problem or project. This skill routes you to the right diagnostic steps and the right specialized skills - so you fix the actual cause, not the symptom you noticed first.

## When to use this skill

- Something is wrong with your email and you don't know where to start
- Emails are landing in spam
- Bounce rate or complaint rate is climbing
- You got listed on a blocklist
- Open rates are dropping
- Provider is throttling or deferring your sends (421 errors)
- You need to set up email infrastructure from scratch
- You're migrating between email providers
- You need to scale sending volume
- An AI agent is sending email and something's going wrong
- You need to choose between a traditional ESP and an agent-native inbox provider
- You need to handle inbound email for the first time
- You received a compliance complaint or data deletion request
- You want to audit your current email health

## Related skills

This skill references all other skills in this collection. Each diagnostic path tells you exactly which skills to load for the detailed guidance.

---

## Quick routing: find your situation

| Your situation | Jump to |
|---|---|
| Emails landing in spam | [Spam diagnosis](#emails-landing-in-spam) |
| Bounce rate spiking | [Bounce diagnosis](#bounce-rate-spiking) |
| Listed on a blocklist | [Blocklist response](#blocklist-listing) |
| Open rates dropping | [Engagement diagnosis](#open-rates-dropping) |
| Getting throttled (421 errors) | [Throttling diagnosis](#getting-throttled) |
| Complaint rate rising | [Complaint diagnosis](#complaint-rate-rising) |
| Setting up email from scratch | [Greenfield setup](#setting-up-email-from-scratch) |
| Migrating providers | [Migration plan](#migrating-email-providers) |
| Scaling send volume | [Scale plan](#scaling-send-volume) |
| Setting up inbound email | [Inbound setup](#setting-up-inbound-email) |
| Giving an AI agent its own inbox | [Agent inbox](#giving-an-ai-agent-its-own-inbox) |
| AI agent sending email | [Agent diagnostics](#ai-agent-email-problems) |
| Compliance request or complaint | [Compliance response](#compliance-request-or-legal-complaint) |
| General health check | [5-minute audit](#the-5-minute-health-check) |

---

## Emails landing in spam

The most common email problem. Work through these checks in order - each step is cheaper than the next, and most problems are caught in the first three.

### Step 1: Check authentication (5 minutes)

Run these DNS checks against your sending domain:

```bash
dig TXT example.com           # SPF record
dig TXT sel._domainkey.example.com  # DKIM (replace sel with your selector)
dig TXT _dmarc.example.com    # DMARC record
```

Send a test email and check the headers for:
- `spf=pass`
- `dkim=pass`
- `dmarc=pass`

If anything fails, stop here. Load `domain-authentication` and fix it before investigating further. Authentication failures cause immediate spam placement or rejection at most providers since November 2025.

### Step 2: Check reputation (10 minutes)

Check these in order:

1. **Google Postmaster Tools** - look at domain reputation and spam rate. If spam rate is above 0.10%, that's the problem. Above 0.30% is critical.
2. **Blocklists** - check Spamhaus (SBL, DBL, XBL), Barracuda, SpamCop at MXToolbox. If listed, jump to [Blocklist response](#blocklist-listing).
3. **Microsoft SNDS** - check IP reputation. Red status = stop sending and investigate.

If reputation is damaged, load `sender-reputation` for the recovery playbook.

### Step 3: Check content (10 minutes)

Content is only ~10% of the placement decision, but it can be the tipping point:

1. **Image-only email?** Single image with no text is the strongest content-based spam signal. Add real text content.
2. **URL shorteners?** bit.ly and tinyurl get 2-4 SpamAssassin points. Use full URLs or a branded short domain.
3. **Spam phrases?** Check for "Act now", "Free", "Click here", "Guaranteed" - especially in subject lines.
4. **HTML quality?** Broken tags, JavaScript, embedded forms, missing DOCTYPE all correlate with spam placement.
5. **Link count?** More than 7 links with minimal text looks like phishing.

Load `spam-filter-avoidance` for the full content checklist.

### Step 4: Check engagement (ongoing)

If authentication, reputation, and content all look clean, the problem is almost certainly engagement:

- Are you sending to people who haven't opened in 90+ days? Stop.
- Is your list purchased or scraped? You're hitting spam traps.
- Are you sending the same content to everyone regardless of engagement? Segment.

Load `inbox-placement` for the engagement signal hierarchy and fatigue scoring model. Load `suppression-lists` for list hygiene.

### Skill loading order for spam problems

1. `domain-authentication` - fix any auth failures first
2. `sender-reputation` - if reputation is damaged
3. `spam-filter-avoidance` - if content triggers are present
4. `inbox-placement` - for engagement optimization
5. `suppression-lists` - for list hygiene
6. `email-warmup` - if you need to rebuild after fixing root cause

---

## Bounce rate spiking

Healthy bounce rate is under 1%. Warning at 1-2%. Above 2% is dangerous - providers will throttle or block you.

### Classify the bounces first

The fix depends entirely on whether they're hard or soft:

| Bounce type | SMTP codes | Meaning | Action |
|---|---|---|---|
| Hard (permanent) | 5.1.1, 5.1.2, 5.2.1, 5.7.1 | Address doesn't exist, domain gone, blocked | Suppress immediately, never retry |
| Soft (temporary) | 4.2.1, 4.2.2, 4.3.1, 4.7.0 | Mailbox full, server down, rate limited | Retry with backoff (1h, 4h, 24h), suppress after 3 failures in 30 days |

### Hard bounce spike diagnostic

If hard bounces are climbing:

1. **Did you import a new list?** Purchased/scraped lists are the #1 cause. Validate the list with a verification service before any more sends.
2. **Did you email a stale segment?** Addresses go bad over time. If you haven't sent to a segment in 6+ months, verify first.
3. **Is one recipient domain bouncing everything?** Check per-domain bounce rates. A single domain problem needs domain-level suppression, not panic.
4. **Are you generating addresses programmatically?** AI agents guessing contact@company.com produce bounces that count against you.

### Soft bounce spike diagnostic

If soft bounces are piling up:

1. **Are you seeing 421 codes?** Jump to [Getting throttled](#getting-throttled).
2. **Is it one provider?** Gmail, Microsoft, and Yahoo throttle independently. A spike at one provider while others are fine usually means reputation damage with that specific provider.
3. **Did your volume spike suddenly?** More than 2x your normal daily volume triggers defensive filtering at most providers.

Load `bounce-handling` for SMTP code reference, retry strategies, and provider-specific webhook formats. Load `suppression-lists` for automated suppression workflows.

---

## Blocklist listing

A Spamhaus SBL listing can drop delivery rates by 90% within hours. This is an emergency.

### Immediate response (first hour)

1. **Identify which list.** Check Spamhaus, Barracuda, SpamCop, SORBS at MXToolbox.
2. **Stop non-essential sending.** Keep transactional email (password resets, order confirmations) flowing if possible, but pause all marketing and outreach.
3. **Find the cause.** Common triggers: sending to spam traps (list quality), complaint spike, compromised account sending spam, open relay.
4. **Fix the root cause before requesting removal.** Requesting delisting without fixing the problem gets you re-listed faster and makes future removals harder.

### Delisting process

| Blocklist | Self-service removal? | Typical timeline |
|---|---|---|
| Spamhaus SBL | Yes, via lookup tool | Hours to days |
| Spamhaus XBL | Automatic after cleanup | 30 minutes |
| Barracuda BRBL | Yes, via removal form | Hours |
| SpamCop | Automatic | 24-48 hours |
| SORBS | Varies by list type | Days |

### After delisting

You need to re-warm. Your reputation took a hit and sending at full volume immediately will put you right back.

1. Load `sender-reputation` for the recovery playbook (timeline: 2-12+ weeks depending on damage).
2. Load `email-warmup` - start at 25% of normal volume with your most engaged segment.
3. Load `sender-monitoring` - set up alerts so you catch the next problem before it becomes a blocklist event.

---

## Open rates dropping

Declining open rates over 2+ weeks usually means placement is degrading. This is the slow-motion version of going to spam - your emails are being deprioritized, not outright filtered.

### Quick checks

1. **Is it one provider or all of them?** Check per-provider breakdown (Gmail vs Microsoft vs Yahoo). If it's one provider, the problem is usually reputation with that specific provider.
2. **Apple Mail Privacy Protection.** iOS 15+ auto-loads tracking pixels, inflating open rates. If your audience is consumer-heavy, apparent "drops" might be a shift in audience composition, not real. Weight click rates more heavily.
3. **Check Google Postmaster Tools.** Is your domain reputation declining? Is spam rate creeping up?
4. **Did something change?** New template, new content strategy, new sending frequency, new list segment. Roll back the change and see if rates recover.

### Common causes and fixes

| Cause | Signal | Fix |
|---|---|---|
| Sending to disengaged recipients | High volume, low engagement | Suppress recipients with no engagement in 90+ days |
| Reputation degradation | Postmaster Tools shows declining domain reputation | Load `sender-reputation` for recovery |
| Content fatigue | Steady decline across all segments | Load `email-copywriting`, test new approaches with `ab-testing` |
| Tab placement change | Gmail open rates specifically dropped | Emails moved to Promotions - load `inbox-placement` |
| Frequency too high | Unsubscribe rate climbing alongside open rate drop | Reduce frequency or move to digests - load `notification-design` |

---

## Getting throttled

421 SMTP responses mean the receiving provider is telling you to slow down. Retrying at the same rate makes it worse.

### Identify the throttle type

| Code | Provider | Meaning |
|---|---|---|
| 421-4.7.28 | Gmail | Unusual rate of unsolicited mail |
| 421-4.7.26 | Gmail | Unauthenticated mail rate-limited |
| 421 4.3.2 | Microsoft | Too many concurrent connections |
| 421 TS03 | Yahoo | Too many concurrent SMTP connections |

### Fix

1. **Back off immediately.** Exponential backoff: 2 min, 4 min, 8 min, 16 min, max 1 hour.
2. **Check your per-domain send rate.** Conservative default: 50-100 messages/hour to any single recipient domain. If you're above this, add per-domain throttling.
3. **Check volume patterns.** Did you send your entire daily allocation in 10 minutes? Spread sends evenly across the day.
4. **Is this a warmup issue?** New domains and IPs without warmup get throttled aggressively. Load `email-warmup`.

Load `rate-limiting` for multi-window rate limit implementation and per-domain throttling. Load `bounce-handling` for soft bounce retry strategies.

---

## Complaint rate rising

Google enforces 0.3% as a hard limit. Above 0.1% is already a warning. Complaints are the single most damaging signal to your reputation.

### Immediate actions

1. **Check which emails are generating complaints.** Most ESPs show complaint source by campaign or template.
2. **Is your unsubscribe link working?** Broken or hidden unsubscribe links force people to use the spam button. Test it.
3. **Are List-Unsubscribe headers present?** Required since June 2024 for Gmail/Yahoo, May 2025 for Microsoft. Missing headers mean the only "unsubscribe" option recipients see is the spam button.
4. **Did you recently change frequency?** Going from weekly to daily without recipient opt-in causes complaint spikes.
5. **Did you add a new segment?** Emailing people who didn't expect to hear from you is the top complaint driver.

### Structural fixes

- Load `email-compliance` for unsubscribe requirements (RFC 8058, one-click) and consent management.
- Load `suppression-lists` for automated complaint suppression (suppress immediately on complaint, permanently).
- Load `notification-design` if the problem is frequency-related - implement preference centers and digests.

---

## Setting up email from scratch

The correct sequence matters. Skipping steps or doing them out of order creates problems that are expensive to fix later.

**If you're building for an AI agent** that needs to send and receive autonomously, consider an agent-native inbox provider instead of wiring up a traditional ESP. Load `inbox-providers` for the comparison. If you go the agent-native route, the provider handles most of phases 1-2 below. If you're building on a traditional ESP, follow the full sequence.

### Phase 1: Infrastructure (week 1)

1. **Choose a sending subdomain.** Never send from your root domain. Use `mail.example.com` for transactional, `news.example.com` for marketing. Load `provider-setup` for the full decision framework.
2. **Set up authentication.** SPF, DKIM, and DMARC on every sending subdomain. Start with `p=none` on DMARC. Load `domain-authentication`.
3. **Choose a provider.** Decision depends on volume, use case, and whether you need dedicated IPs. Load `provider-setup`.
4. **Configure webhooks.** You need bounce, complaint, and delivery event processing from day one. Load `webhook-processing`.

### Phase 2: Warmup (weeks 2-5)

5. **Warm your domain.** Start at 50/day, ramp gradually, never more than 2x day-over-day. Send to your most engaged recipients first. Load `email-warmup`.
6. **Set up monitoring.** Google Postmaster Tools, Microsoft SNDS, blocklist checks. Set alert thresholds. Load `sender-monitoring`.
7. **Implement rate limiting.** Multi-window (hourly, daily, monthly). Per-domain throttling. Load `rate-limiting`.

### Phase 3: Sending (weeks 3+, overlapping with warmup)

8. **Build suppression infrastructure.** Hard bounce suppression, complaint suppression, unsubscribe handling. Load `suppression-lists`.
9. **Set up compliance.** CAN-SPAM, GDPR, or CASL depending on your audience's jurisdiction. Consent collection and records. Load `email-compliance`.
10. **Build your first email flow.** Which skill to load depends on your use case:

| Use case | Skill to load |
|---|---|
| Password resets, receipts, notifications | `transactional-email` |
| Welcome sequences, onboarding | `onboarding-emails` |
| Drip campaigns, nurture | `email-sequences` |
| Product notifications | `notification-design` |
| Sales outreach | `cold-outreach` |

11. **Write the content.** Load `email-copywriting` for copy and `template-design` for HTML.

### Phase 4: Optimize (ongoing)

12. **Test and iterate.** Load `ab-testing` once you have enough volume (minimum 200-300 sends per variant for meaningful results).
13. **Monitor continuously.** Weekly review of metrics, monthly review of list health, quarterly holdout tests.

---

## Migrating email providers

Provider migrations are where most reputation damage happens - because people forget to carry their suppression lists.

### Pre-migration (1-2 weeks before)

1. **Export your suppression list from the old provider.** This is the most critical step. Hard bounces, complaints, unsubscribes - all of them. Load `suppression-lists`.
2. **Set up the new provider.** DNS records (SPF include swap, new DKIM selector), webhook endpoints, API keys. Load `provider-setup`.
3. **Import suppressions into the new provider.** Verify with spot-checks on specific addresses.
4. **Test end-to-end.** Send test messages through the new provider, verify authentication headers pass.

### Cutover (2-4 weeks)

5. **Warm the new provider.** Even with an established domain, a new provider relationship needs warming. Start at 5-10% of volume, send to engaged recipients first. Load `email-warmup`.
6. **Gradual ramp.** 25% -> 50% -> 75% -> 100%. Monitor bounce and complaint rates at each step. Hold at each level for 2-3 days minimum.
7. **Keep old provider as failover.** Don't decommission until new provider is at 100% for at least 2 weeks with clean metrics.

### Post-migration

8. **Remove old SPF include** after 30 days at full volume on the new provider.
9. **Monitor closely** for 4 weeks. Load `sender-monitoring`.

---

## Scaling send volume

Scaling too fast damages reputation. Scaling too slowly costs opportunity. Here's how to do it right.

### Determine your current position

| Current volume | Target volume | Approach |
|---|---|---|
| Under 10K/month | 10K-50K | Ramp gradually over 2-4 weeks |
| 10K-50K/month | 50K-100K | Consider dedicated IP, 4-6 week ramp |
| 50K-100K/month | 100K-500K | Dedicated IP required, 6-8 week ramp |
| 100K+ /month | 500K+ | Multi-IP, separate mail streams, 8+ weeks |

### Rules for scaling

- Never increase more than 30-50% per week.
- Send new volume to your most engaged recipients first.
- Monitor complaint rate (stay under 0.1%) and bounce rate (stay under 1%) at each step.
- If either metric crosses the warning threshold, hold volume for an extra week before increasing.

### When you need dedicated IPs

If your consistent volume will exceed 50K/month, load `provider-setup` for the shared vs dedicated IP decision. Below 50K/month, dedicated IPs are counterproductive - low volume makes them look suspicious.

### Infrastructure to have in place before scaling

- Multi-window rate limiting (`rate-limiting`)
- Automated bounce/complaint suppression (`suppression-lists`, `bounce-handling`)
- Per-domain throttling (`rate-limiting`)
- Monitoring and alerts (`sender-monitoring`)
- Separate mail streams for transactional vs marketing (`provider-setup`)

---

## Setting up inbound email

Receiving and processing email is a different problem from sending. Here's the setup sequence.

### Step 1: Choose inbound method

| Provider | Best for | Key trait |
|---|---|---|
| Postmark | Stateless thread association via MailboxHash | JSON payload, clean parsing |
| SendGrid | High volume inbound | Posts as multipart/form-data, not JSON |
| Mailgun | Auto-stripping quoted replies | Routes with stripped-text/stripped-html |
| SES | AWS-native, raw MIME | S3 store + SNS notify, US/EU regions only |

Load `inbound-processing` for provider setup, MIME parsing, and content extraction.

### Step 2: Build classification

Once you can receive and parse email, you need to classify it:

1. **Auto-reply/OOO detection** - check headers first (Auto-Submitted, Precedence). This catches 20-40% of inbound with near-perfect accuracy.
2. **Bounce detection** - DSN messages (Content-Type: multipart/report).
3. **Intent classification** - interested, not_now, objection, support, billing, unsubscribe.

Load `reply-classification` for the full taxonomy, keyword scoring, confidence thresholds, and routing rules.

### Step 3: Thread management

Link inbound messages to conversations:

1. Store outbound Message-IDs at send time.
2. Match inbound In-Reply-To headers against stored IDs.
3. Strip quoted reply content to extract only the new text.
4. Detect thread anomalies (new sender in existing thread, intent flips).

Load `thread-management` for threading headers, provider differences (Gmail vs Outlook), and quoted reply stripping.

### Step 4: Security

Inbound email is an attack vector. Before any AI agent processes email content:

1. Sanitize HTML (allowlist, not blocklist).
2. Strip invisible Unicode characters.
3. Detect prompt injection patterns.
4. Validate URLs before following them.

Load `email-security` for the full security pipeline including prompt injection detection, BEC patterns, and attachment scanning.

---

## Giving an AI agent its own inbox

If your AI agent needs to send and receive email autonomously, you have two paths: build on a traditional ESP or use an agent-native inbox provider.

### Traditional ESP vs agent-native inbox provider

| Capability | Traditional ESP (build yourself) | Agent inbox provider (built in) |
|---|---|---|
| Sending | API call | API call |
| Receiving | Configure inbound webhooks, parse MIME | Built-in inbox, parsed and classified |
| Suppression | Query your own suppression database | Checked automatically, send rejected if suppressed |
| Rate limiting | Implement sliding window counters | Enforced at infrastructure layer |
| Deduplication | Track dedupe keys yourself | Built-in |
| Prompt injection scanning | Build detection pipeline | Built-in before agent sees content |
| Reply classification | Build or integrate classifier | Built-in (interested, OOO, objection, etc.) |

**Use a traditional ESP** if your agent only sends occasional transactional email, you already have email infrastructure, or volume is under 100 emails/day. Load `provider-setup`.

**Use an agent-native inbox provider** if your agent sends at scale, handles replies, or operates autonomously. The build-vs-buy calculation tips toward agent-native providers quickly when you factor in suppression, rate limiting, deduplication, and safety scanning. Load `inbox-providers`.

### Quick decision

| Need | Recommendation |
|---|---|
| Policy enforcement, deliverability guardrails | Molted Email |
| Many inboxes, email-as-identity | AgentMail |
| Agent self-provisioning, zero human setup | LobsterMail |
| Graduated trust, start sandboxed | MailMolt |
| Just sending, no inbound, no agent autonomy | Traditional ESP (`provider-setup`) |

Load `inbox-providers` for full provider comparison, setup steps, and safety architecture.

---

## AI agent email problems

AI agents have specific failure modes that humans don't. If an agent is sending email and something's going wrong, check these first.

### Common agent failures

| Symptom | Likely cause | Fix |
|---|---|---|
| Bounce rate exploding | Agent guessing email addresses | Validate addresses before sending, never construct addresses programmatically without verification |
| Volume spike triggering blocks | Agent retry loop, no rate limiting | Per-recipient cooldowns (10 min minimum), deduplication, multi-window rate limits |
| Sending entire daily quota in minutes | No hourly rate cap | Set hourly limits, not just daily - load `rate-limiting` |
| Reputation burning fast | Agent ignoring bounce/complaint signals | Implement negative signal budgets - auto-pause when thresholds crossed |
| Prompt injection in outbound | Agent processing inbound email into outbound | Treat email content as data, never as instructions - load `email-security` |
| Duplicate emails flooding recipients | No deduplication | Dedupe keys: `<skill>:<flow>:<entity>:<event>` with TTL |

### Agent-specific guardrails

If you're building these yourself on a traditional ESP, you need all of the following. Agent-native inbox providers (load `inbox-providers`) handle most of this at the infrastructure layer.

1. **Rate limits at infrastructure layer, not application.** Agents will find ways around application-level limits.
2. **Per-recipient cooldowns.** 10-minute minimum between emails to the same recipient per template.
3. **Negative signal budgets.** Auto-pause sending when bounce rate exceeds 3% or complaint rate exceeds 0.1%.
4. **Fatigue scoring.** Score above 70 = stop sending, 40-70 = reduce frequency, below 40 = safe. Load `sender-reputation` for the scoring model.
5. **Start on an established domain.** Don't put an agent on a brand-new domain. Warm with human-reviewed sends first, then hand over to the agent.

---

## Compliance request or legal complaint

Legal email compliance spans three jurisdictions with different rules. Getting it wrong has real penalties.

### Unsubscribe request

- Honor immediately. CAN-SPAM allows 10 business days, but Google/Yahoo require functional one-click unsubscribe, and best practice is seconds.
- Suppress the address - don't just remove from list. Removing allows re-addition. Suppressing prevents it.
- Don't send a "sorry to see you go" email. That's another email they didn't ask for.
- Load `email-compliance` and `suppression-lists`.

### GDPR erasure request (right to be forgotten)

This creates a paradox: you must delete personal data, but you must also prevent future sending. The solution:

**Keep:** email address, suppression flag, reason code (legal_request), date, jurisdiction.
**Delete:** name, company, demographics, send history, engagement data, CRM fields, consent records beyond what's needed for suppression.

Load `suppression-lists` for the full GDPR erasure workflow.

### CAN-SPAM complaint

- Penalty: up to $51,744 per email.
- Check: accurate From address, honest subject line, physical postal address present, working unsubscribe mechanism, opt-outs honored within 10 days.
- Load `email-compliance`.

### CASL complaint (Canada)

- Penalty: up to $10 million per violation.
- Check: did you have express or implied consent? Implied consent expires (purchase: 2 years, inquiry: 6 months). Were consent records retained (3-year requirement)?
- Load `email-compliance`.

---

## The 5-minute health check

Run this periodically, or any time you want a quick snapshot of your email health. Each check takes under a minute.

### 1. Authentication (pass/fail)

Send a test email to yourself. Check headers for:
- `spf=pass` with alignment
- `dkim=pass` with alignment
- `dmarc=pass`

If anything fails, load `domain-authentication`.

### 2. Reputation (check three sources)

- **Google Postmaster Tools**: spam rate under 0.10%? Domain reputation Medium or High?
- **MXToolbox blocklist check**: listed on any blocklist?
- **Microsoft SNDS**: IP reputation green?

If reputation is degraded, load `sender-reputation`.

### 3. Bounce and complaint rates (check your ESP dashboard)

| Metric | Healthy | Investigate |
|---|---|---|
| Hard bounce rate | < 0.5% | > 0.5% |
| Total bounce rate | < 1% | > 2% |
| Complaint rate | < 0.1% | > 0.1% |
| Unsubscribe rate | < 0.5% | > 1% |
| Delivery rate | > 98% | < 95% |

If any metric is in the "investigate" column, load `sender-monitoring` for alert configuration and `bounce-handling` or `suppression-lists` for the fix.

### 4. List hygiene (quick check)

- When did you last clean your list? If more than 3 months ago, verify before your next send.
- What percentage of your list has engaged (opened or clicked) in the last 90 days? If under 30%, you're carrying too much dead weight.

### 5. Compliance (quick check)

- Is there a working unsubscribe link in every marketing email?
- Are `List-Unsubscribe` and `List-Unsubscribe-Post` headers present?
- Is a physical postal address included (CAN-SPAM)?
- Are you tracking consent with timestamps and source?

If anything is missing, load `email-compliance`.

---

## The diagnostic decision tree

When you're not sure where to start, walk this tree:

```
Is authentication passing? (SPF, DKIM, DMARC all pass)
  NO  --> Fix authentication first (domain-authentication)
  YES
    |
    v
Is your domain on any blocklist?
  YES --> Emergency: stop marketing sends, fix cause, request delisting
         (sender-reputation, sender-monitoring)
  NO
    |
    v
Is complaint rate above 0.1%?
  YES --> Fix unsubscribe flow, check consent, reduce frequency
         (email-compliance, suppression-lists, notification-design)
  NO
    |
    v
Is bounce rate above 2%?
  YES --> Classify hard vs soft, clean list, check for bad segments
         (bounce-handling, suppression-lists)
  NO
    |
    v
Is delivery rate below 95%?
  YES --> Check per-provider breakdown, look for throttling
         (sender-monitoring, rate-limiting)
  NO
    |
    v
Are open rates declining?
  YES --> Check engagement segments, content quality, tab placement
         (inbox-placement, email-copywriting, ab-testing)
  NO
    |
    v
Your email health looks good. Focus on optimization:
  - Test subject lines and content (ab-testing)
  - Optimize send timing (email-sequences)
  - Improve templates (template-design)
  - Build preference centers (notification-design)
```

---

## Skill map: when to load what

Quick reference for all 26 skills organized by the problem you're solving.

### Something is broken

| Problem | Primary skills | Supporting skills |
|---|---|---|
| Landing in spam | `domain-authentication`, `sender-reputation` | `spam-filter-avoidance`, `inbox-placement` |
| High bounce rate | `bounce-handling`, `suppression-lists` | `sender-monitoring`, `webhook-processing` |
| Blocklist listing | `sender-reputation`, `sender-monitoring` | `email-warmup`, `suppression-lists` |
| Getting throttled | `rate-limiting`, `bounce-handling` | `email-warmup`, `sender-monitoring` |
| Complaints rising | `email-compliance`, `suppression-lists` | `notification-design`, `email-copywriting` |
| Open rates declining | `inbox-placement`, `email-copywriting` | `ab-testing`, `sender-reputation` |

### Building something new

| Goal | Skills in order |
|---|---|
| Email from scratch | `domain-authentication` -> `provider-setup` -> `email-warmup` -> `sender-monitoring` |
| Transactional email | `transactional-email` -> `template-design` -> `bounce-handling` |
| Onboarding sequence | `onboarding-emails` -> `email-sequences` -> `email-copywriting` |
| Marketing campaigns | `email-copywriting` -> `template-design` -> `ab-testing` -> `inbox-placement` |
| Cold outreach | `cold-outreach` -> `email-warmup` -> `reply-classification` |
| Product notifications | `notification-design` -> `template-design` -> `rate-limiting` |
| Inbound processing | `inbound-processing` -> `reply-classification` -> `thread-management` -> `email-security` |
| Agent inbox (send + receive) | `inbox-providers` -> `domain-authentication` -> `email-security` |
| Provider migration | `provider-setup` -> `suppression-lists` -> `email-warmup` -> `sender-monitoring` |

---

## Common mistakes

1. **Fixing content when the problem is reputation.** Content is ~10% of the placement decision. If your reputation is bad, perfect content won't save you. Check authentication and reputation before touching copy.
2. **Treating symptoms instead of causes.** Open rates dropping is a symptom. The cause might be reputation, engagement, content, or tab placement. Diagnose before you treat.
3. **No monitoring until something breaks.** Set up Google Postmaster Tools, Microsoft SNDS, and blocklist monitoring before you need them. The time to build dashboards is not during an incident.
4. **Skipping suppression list export during migration.** This is the single most common cause of reputation damage during provider migrations. Hard bounces and complaints from your old provider don't automatically transfer.
5. **Scaling volume without warming.** Whether it's a new domain, new IP, new provider, or resuming after inactivity - you need to ramp gradually. More than 2x day-over-day increase triggers defensive filtering.
6. **Separate mail streams? What's that?** Mixing transactional and marketing on the same domain/IP means a bad marketing campaign can block your password reset emails. Use different subdomains at minimum.
7. **Ignoring the agent-specific failure modes.** AI agents don't get tired, don't notice patterns, and will happily retry 200 times in an hour. Infrastructure-level rate limits and negative signal budgets are not optional.
8. **Treating the diagnostic tree as linear.** Email problems are usually multi-causal. A bounce spike might be caused by a stale list (list hygiene) triggered by a new campaign (content) sent too fast (rate limiting) on a domain that wasn't warmed (warmup). Fix all the causes, not just the first one you find.

## References

- [Google Postmaster Tools](https://postmaster.google.com)
- [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/)
- [Yahoo Sender Hub](https://senders.yahooinc.com)
- [Spamhaus Blocklist Lookup](https://check.spamhaus.org)
- [MXToolbox Blocklist Check](https://mxtoolbox.com/blacklists.aspx)
- [M3AAWG Best Practices](https://www.m3aawg.org/published-documents)
- [Google Bulk Sender Guidelines](https://support.google.com/mail/answer/81126)
- [RFC 7208 - SPF](https://www.rfc-editor.org/rfc/rfc7208)
- [RFC 6376 - DKIM](https://www.rfc-editor.org/rfc/rfc6376)
- [RFC 7489 - DMARC](https://www.rfc-editor.org/rfc/rfc7489)
- [RFC 8058 - One-Click Unsubscribe](https://www.rfc-editor.org/rfc/rfc8058)
- [molted.email](https://molted.email) - email infrastructure with policy enforcement, deliverability protection, and inbound classification built in

---
name: sender-monitoring
description: Build dashboards, alerts, and monitoring systems for email sending operations. Use when setting up deliverability monitoring, configuring alert thresholds, checking blocklists, building email metrics dashboards, or responding to deliverability incidents.
license: MIT
---

# Sender Monitoring

Set up the dashboards, alerts, and monitoring systems that tell you when something is wrong with your email sending before your recipients (or providers) tell you.

## When to use this skill

- Setting up monitoring for a new sending domain or email system
- Building a dashboard to track delivery rates, bounces, and complaints
- Configuring alerts for deliverability problems
- Checking if your domain or IP is on a blocklist
- Investigating a sudden drop in deliverability or open rates
- Setting up Google Postmaster Tools, Microsoft SNDS, or Yahoo Sender Hub
- Building an incident response process for email deliverability issues
- Deciding which metrics to track and what thresholds to alert on

## Related skills

- `sender-reputation` - understanding the reputation signals you're monitoring
- `bounce-handling` - processing the bounces that feed your monitoring metrics
- `webhook-processing` - receiving the delivery events that power your dashboards
- `rate-limiting` - volume controls that monitoring should track
- `domain-authentication` - authentication failures that monitoring should catch
- `suppression-lists` - suppression growth is a key metric to watch

---

## The metrics that matter

Not all email metrics deserve equal attention. These are the ones that predict deliverability problems before they become crises, ordered by how urgently you should respond.

### Tier 1: Alert immediately

| Metric | Healthy | Warning | Critical | Why it matters |
|--------|---------|---------|----------|----------------|
| Spam complaint rate | < 0.1% | 0.1-0.3% | > 0.3% | Gmail and Yahoo enforce 0.3% as a hard limit. Exceeding it triggers throttling within hours. |
| Hard bounce rate | < 0.5% | 0.5-2% | > 2% | Signals list quality problems. Providers treat persistent high bounce rates as a spam indicator. |
| Authentication failure rate | 0% | > 0% | > 1% | Any SPF/DKIM/DMARC failure means messages are being rejected or spam-foldered. Should be zero. |
| Blocklist presence | Not listed | - | Listed on any major list | A single Spamhaus SBL listing can drop delivery rates by 90% within hours. |

### Tier 2: Review daily

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Delivery rate | > 98% | 95-98% | < 95% |
| Soft bounce rate | < 2% | 2-5% | > 5% |
| Unsubscribe rate | < 0.5% | 0.5-1% | > 1% |
| Quota utilization | < 80% | 80-95% | > 95% |

### Tier 3: Review weekly

| Metric | What to look for |
|--------|-----------------|
| Open rate trend | Declining open rates over 2+ weeks suggest inbox placement problems |
| Click-to-open ratio | Dropping CTOR with stable open rates means content problems, not deliverability |
| Reply rate | For outreach/transactional email, replies are the strongest positive signal |
| Suppression list growth | Rapid growth means acquisition or list hygiene problems |
| Provider distribution | Delivery rates broken out by Gmail, Microsoft, Yahoo, other |

### Calculating these metrics

Be precise about denominators. Wrong denominators produce misleading rates.

```
Delivery rate     = (delivered / (sent - suppressed)) * 100
Bounce rate       = (bounced / (sent - suppressed)) * 100
Complaint rate    = (complaints / delivered_to_inbox) * 100
Open rate         = (unique_opens / delivered) * 100
Click-to-open     = (unique_clicks / unique_opens) * 100
```

Important: Gmail and Yahoo calculate complaint rate as complaints divided by messages delivered to inbox, not total sent. Your internal calculation should match this definition or you'll be surprised when providers see a higher rate than you do.

---

## Provider monitoring tools

Every major mailbox provider offers free tools to see how they view your sending. Set up all three - they each show different data.

### Google Postmaster Tools

The most important monitoring tool for any sender. Gmail processes roughly 30% of all email globally.

**What it shows (v2, as of late 2025):**
- **Compliance status** - whether you meet Gmail's bulk sender requirements
- **Spam rate** - percentage of inbox-delivered messages marked as spam by recipients
- **Authentication rates** - SPF, DKIM, DMARC pass rates
- **Delivery errors** - rejection reasons and error codes

**Setup:**
1. Go to [postmaster.google.com](https://postmaster.google.com/)
2. Add and verify your sending domain (requires adding a DNS TXT record)
3. Data appears within 24-48 hours of verification
4. Minimum daily volume to Gmail required for data to populate (typically 100+ messages/day)

**Key changes in v2:** Google retired the historical domain and IP reputation dashboards in September 2025. The v2 dashboard focuses on compliance status, spam rate thresholds, and authentication. It now shows visual threshold lines - a recommended threshold at 0.10% spam rate and a policy violation line at 0.30%.

**What to watch:**
- Spam rate above 0.10%: investigate immediately
- Spam rate above 0.30%: you are violating Gmail's policy and will be throttled
- Any authentication failures: fix before they accumulate
- Compliance status anything other than "compliant": address the flagged issues

**Limitations:** Data updates roughly once per 24 hours (typically late afternoon US time). This is not real-time. A problem that starts at 9am won't show up until the next day.

### Microsoft SNDS (Smart Network Data Services)

Covers Outlook.com, Hotmail, and Live.com - but not Office 365 or Exchange Online business accounts.

**What it shows:**
- Per-IP reputation data (green/yellow/red traffic light)
- Message volume per IP
- Spam trap hits
- Complaint rates via JMRP (Junk Mail Reporting Program)

**Setup:**
1. Go to [sendersupport.olc.protection.outlook.com/snds](https://sendersupport.olc.protection.outlook.com/snds/)
2. Request access for your sending IP ranges
3. Microsoft verifies ownership (takes 24-48 hours)
4. Also sign up for JMRP to receive complaint feedback loops

**What to watch:**
- Any IP showing "red" status: stop sending from that IP and investigate
- Spam trap hits: even one means list hygiene problems
- Complaint rate above 0.3%: same threshold as Gmail

**Limitations:** Only covers consumer Microsoft domains. If your audience is primarily B2B on Microsoft 365, SNDS tells you almost nothing. You'll need to monitor delivery rates to those domains from your own logs instead.

**2025 update:** Microsoft now requires senders of 5,000+ messages/day to meet authentication requirements similar to Gmail's. SNDS access requires authentication as of November 2025.

### Yahoo Sender Hub

Covers Yahoo Mail and AOL Mail.

**What it shows:**
- Spam complaint rate per authenticated (DKIM) domain
- Delivered message count
- Trend data showing changes over time

**Setup:**
1. Go to [senders.yahooinc.com](https://senders.yahooinc.com/)
2. Verify your DKIM-signing domain
3. Activate the Insights feature in the Dashboard section
4. Data populates within 24-48 hours if you meet minimum daily volume

**What to watch:**
- Complaint rate trending upward: Yahoo's Insights shows you the exact percentage and how it's changing
- Yahoo calculates complaint rate from inbox-delivered messages only (not spam-foldered messages), which is the true complaint rate

**Key advantage over Google:** Yahoo Sender Hub shows the actual numeric complaint rate, while Google Postmaster Tools v2 only shows whether you're above or below threshold lines.

---

## Blocklist monitoring

Being listed on a major blocklist is the fastest way to go from 99% delivery to near-zero. Check proactively - don't wait for users to report missing emails.

### The blocklists that matter

Not all blocklists are equal. Major providers only consult a handful:

| Blocklist | Impact | What triggers listing | Removal |
|-----------|--------|----------------------|---------|
| **Spamhaus SBL** | Severe - used by most major providers | Spam sending, snowshoe spam, botnet hosting | Contact ISP/ESP; they must request removal |
| **Spamhaus XBL** | Severe | Compromised/infected host | Auto-expires when fixed; or manual request |
| **Spamhaus DBL** | Severe | Domain used in spam content | Request via Spamhaus removal center |
| **Spamhaus PBL** | Moderate | IP in a range that shouldn't send email directly | ISP must remove; usually a misconfiguration |
| **Barracuda BRBL** | Moderate | Poor sending practices | Self-service removal at barracudacentral.org |
| **SpamCop** | Low-Moderate | User spam reports | Auto-expires in 24-48 hours if reports stop |
| **SORBS** | Low | Various spam indicators | Self-service removal (some lists require payment) |
| **UCEProtect** | Low | Depends on level (1/2/3) | Level 1 auto-expires; levels 2/3 are network-wide |

**Priority:** If you can only monitor one blocklist, make it Spamhaus. A Spamhaus SBL or DBL listing will cripple your deliverability faster than any other single event.

### How to check

**Manual check (one-time):**
- Spamhaus: [check.spamhaus.org](https://check.spamhaus.org/) - check both IP and domain
- MXToolbox: [mxtoolbox.com/blacklists.aspx](https://mxtoolbox.com/blacklists.aspx) - checks 80+ lists at once
- Barracuda: [barracudacentral.org/lookups](https://www.barracudacentral.org/lookups)

**Automated monitoring (recommended):**

```bash
# DNS-based blocklist check - works for any DNSBL
# Reverse the IP octets and query the blocklist's DNS zone
# Example: checking 192.0.2.1 against Spamhaus ZEN (combined list)

dig +short 1.2.0.192.zen.spamhaus.org

# No result = not listed
# 127.0.0.x result = listed (the last octet indicates which sub-list)
# 127.0.0.2 = SBL
# 127.0.0.3 = SBL CSS
# 127.0.0.4-7 = XBL
# 127.0.0.10-11 = PBL
```

```bash
# Check domain against Spamhaus DBL
dig +short yourdomain.com.dbl.spamhaus.org

# No result = not listed
# 127.0.1.2 = spam domain
# 127.0.1.4 = phishing domain
# 127.0.1.5 = malware domain
# 127.0.1.6 = botnet C&C domain
```

**Run these checks on a schedule.** Every 15-30 minutes for critical sending domains, hourly for others. Alert immediately on any listing.

### Removal process

Getting delisted is not instant. Each blocklist has its own process:

1. **Fix the root cause first.** Requesting removal without fixing the problem gets you re-listed within hours.
2. **For Spamhaus SBL:** Your ESP or ISP must contact Spamhaus on your behalf. End users cannot request SBL removal directly.
3. **For Spamhaus XBL:** Fix the compromised system, then request removal at [spamhaus.org/lookup](https://www.spamhaus.org/lookup/). Auto-expires if the abuse stops.
4. **For Spamhaus DBL:** Request removal via the Spamhaus removal center. Response within 24 hours if the domain is no longer used for spam.
5. **For Barracuda:** Self-service removal at [barracudacentral.org](https://www.barracudacentral.org/). Usually processed within 12 hours.
6. **For SpamCop:** No removal process. Listings auto-expire in 24-48 hours once reports stop.

---

## Building your monitoring dashboard

A monitoring dashboard needs to answer one question at a glance: "Is anything broken right now?" Everything else is secondary.

### Essential dashboard panels

**1. Health scorecard (top of dashboard)**

A single traffic-light view for each sending domain/mailbox:

```
Domain              Status    Delivery    Bounce    Complaints    Auth
marketing.acme.com  GREEN     99.2%       0.3%      0.02%        100%
notify.acme.com     YELLOW    96.1%       1.8%      0.15%        100%
outreach.acme.com   RED       87.4%       4.2%      0.41%        98.7%
```

Green = all metrics healthy. Yellow = any metric in warning range. Red = any metric critical.

**2. Send volume over time (time series)**

Plot sends per hour/day. Look for:
- Unexpected spikes (runaway automation, bugs)
- Unexpected drops (sending system down, queue backed up)
- Volume changes that correlate with deliverability shifts

**3. Delivery funnel (stacked bar or sankey)**

For each time period, show the breakdown:
```
Sent -> Delivered (inbox) -> Opened -> Clicked
     -> Delivered (spam)
     -> Bounced (hard)
     -> Bounced (soft)
     -> Suppressed (not sent)
     -> Complained
```

**4. Per-provider breakdown**

Delivery rates by recipient domain. The top 4 matter most:
- Gmail (@gmail.com, @googlemail.com)
- Microsoft (@outlook.com, @hotmail.com, @live.com, plus Office 365 custom domains)
- Yahoo (@yahoo.com, @aol.com, @verizon.net)
- Apple (@icloud.com, @me.com, @mac.com)

If your delivery rate to Gmail drops but Microsoft stays stable, the problem is Gmail-specific (likely a reputation or compliance issue visible in Postmaster Tools).

**5. Quota and rate limit utilization**

Show current usage against limits at all time windows:
- Monthly: used / limit (with 80% warning line)
- Daily: used / limit
- Hourly: used / limit

This is especially critical for systems with billing-based quotas. The rate limiter pattern from production systems tracks counters at monthly, daily, and hourly windows, with automatic notifications at 80% and 100% of monthly limits.

**6. Suppression list growth**

Plot suppression entries over time by reason (hard bounce, soft bounce, complaint, manual). A sudden spike in hard bounce suppressions means you sent to bad data. A spike in complaints means content or targeting problems.

### Data sources for your dashboard

Your dashboard pulls from three sources:

1. **Your own delivery events** - webhook data from your ESP (bounces, deliveries, complaints, opens, clicks). This is your primary data source and the only one that's near-real-time.

2. **Provider postmaster tools** - Google Postmaster Tools, Microsoft SNDS, Yahoo Sender Hub. These give you the provider's view of your reputation. Updated daily, not real-time.

3. **Blocklist checks** - DNS queries against Spamhaus, Barracuda, etc. Run on a schedule (every 15-30 minutes).

### Event-driven metrics tracking

Structure your delivery events as a consistent event stream that your monitoring system can aggregate:

```
{
  event_type: "delivered" | "bounced" | "complained" | "opened" | "clicked",
  timestamp: "2025-01-15T12:00:00Z",
  sending_domain: "mail.acme.com",
  mailbox_id: "mb_123",
  recipient_domain: "gmail.com",
  provider: "resend",
  is_soft_bounce: false,
  smtp_status: "5.1.1",
  correlation_id: "cor_abc123"
}
```

Use correlation IDs to trace individual messages through the entire pipeline - from send request to delivery event to any downstream processing. This is invaluable when debugging why a specific message bounced or was complained about.

The audit trail pattern - writing structured events to an append-only audit log with aggregate type, aggregate ID, event type, and event JSON - gives you full traceability alongside your real-time metrics. When something goes wrong, you need both the aggregate "bounce rate is 5%" view and the ability to drill into individual events.

---

## Alert configuration

The difference between a minor deliverability hiccup and a reputation crisis is usually about 4-6 hours. Good alerting buys you that time.

### Alert rules

**Immediate alerts (page someone):**

| Condition | Threshold | Window | Action |
|-----------|-----------|--------|--------|
| Spam complaint rate | > 0.3% | Rolling 24h | Pause affected mailbox. Investigate immediately. |
| Hard bounce rate | > 5% | Rolling 24h | Pause sending. List quality emergency. |
| Blocklist detection | Any major list | Per check | Begin removal process. May need to switch IPs. |
| Authentication failure rate | > 1% | Rolling 1h | Check DNS records. SPF/DKIM may be misconfigured. |
| Delivery rate drop | > 10% below baseline | Rolling 4h | Check per-provider breakdown. Identify affected provider. |
| Send volume spike | > 3x normal hourly rate | Per hour | Check for runaway automation. May trigger provider throttling. |

**Warning alerts (email/Slack, don't page):**

| Condition | Threshold | Window |
|-----------|-----------|--------|
| Spam complaint rate | > 0.1% | Rolling 24h |
| Hard bounce rate | > 2% | Rolling 24h |
| Soft bounce retry exhaustion | > 50% of retries failing | Rolling 7d |
| Quota utilization | > 80% of monthly limit | Current month |
| Open rate drop | > 20% below 30-day average | Rolling 7d |
| Suppression list growth | > 2x normal daily additions | Rolling 24h |

**Informational (daily digest):**

- Total sends, delivery rate, bounce breakdown
- Top bouncing recipient domains
- Quota utilization summary
- Blocklist check summary (all clear / any issues)
- Week-over-week metric trends

### Alert fatigue prevention

Bad alerting is worse than no alerting. If your team ignores alerts because they fire too often, you'll miss the real crisis.

- **Set thresholds above noise.** If your baseline bounce rate is 0.8%, alerting at 1% will fire constantly. Alert at 2% (2.5x baseline) for warnings, 5% for critical.
- **Use rolling windows, not point-in-time.** A single bounced email out of 10 is a 10% bounce rate. Use a minimum sample size (at least 100 sends in the window) before calculating rates.
- **Separate by sending domain.** Your marketing domain and transactional domain have different baselines. Alert thresholds should be per-domain.
- **Auto-resolve alerts.** If bounce rate spikes to 3% for one hour then drops back to 0.5%, auto-resolve the alert. Don't leave stale alerts cluttering the dashboard.
- **Minimum send volume gate.** Don't fire rate-based alerts when volume is below a meaningful threshold. 1 bounce out of 2 sends is 50% bounce rate but not meaningful.

---

## Incident response playbook

When monitoring detects a problem, you need a systematic response. Panic-driven troubleshooting wastes time and sometimes makes things worse.

### Severity levels

| Level | Trigger | Response time | Example |
|-------|---------|--------------|---------|
| SEV-1 | Sending completely blocked or blocklisted | Immediate | Spamhaus SBL listing, provider account suspended |
| SEV-2 | Significant delivery degradation | Within 1 hour | Bounce rate > 5%, complaint rate > 0.3%, delivery < 90% |
| SEV-3 | Gradual degradation trend | Within 24 hours | Slow decline in open rates, increasing soft bounces |
| SEV-4 | Informational anomaly | Next business day | Unusual volume pattern, minor metric shift |

### SEV-1/SEV-2 response checklist

When a critical alert fires, work through this in order:

**1. Contain (first 15 minutes)**
- Pause all non-critical sending from the affected domain/IP
- Keep transactional email (password resets, order confirmations) running if possible - route through a different domain if needed
- Notify stakeholders that sending is paused

**2. Diagnose (15-60 minutes)**
- Check blocklists (Spamhaus, Barracuda, SpamCop)
- Check Google Postmaster Tools, SNDS, Yahoo Sender Hub for reputation data
- Review bounce logs for patterns (specific recipient domains? specific error codes?)
- Review recent sending for anomalies (volume spike? new list segment? content change?)
- Check authentication: run SPF, DKIM, DMARC checks against a recent message
- Check DNS records haven't been modified or expired

**3. Remediate (1-24 hours depending on cause)**

| Root cause | Fix |
|-----------|-----|
| Bad list segment | Remove the segment, suppress bounced addresses, clean the list |
| Authentication failure | Fix DNS records, verify DKIM key rotation didn't break signing |
| Blocklist listing | Fix root cause, then request removal (see blocklist section) |
| Content triggering filters | Review recent template changes, revert if needed |
| Volume spike | Identify the source (bug? batch job?), implement rate limiting |
| Provider account issue | Contact your ESP's deliverability team directly |

**4. Verify recovery (24-72 hours)**
- Gradually resume sending (start at 25% of normal volume)
- Monitor all metrics closely for 48-72 hours
- Confirm blocklist removal is reflected
- Check Postmaster Tools for reputation recovery (may take several days)

**5. Post-incident review**
- Document what happened, when it was detected, how long until resolution
- Identify what monitoring missed or alerted too late
- Update alert thresholds or add new checks based on learnings
- Update runbooks if the response process had gaps

### SEV-3 investigation template

For gradual degradation, use a structured investigation:

```
1. When did the metric start declining? (check time-series graphs)
2. Does it affect all recipient providers or just one?
   - Gmail only -> check Postmaster Tools compliance status
   - Microsoft only -> check SNDS, recent Outlook policy changes
   - All providers -> likely a sending-side issue (list, content, auth)
3. Did anything change around the time degradation started?
   - New email template deployed?
   - New list segment or data source added?
   - DNS changes (SPF/DKIM)?
   - Volume increase?
   - Provider or infrastructure change?
4. What do the bounce messages say? (read the actual diagnostic text)
5. Are engagement metrics (opens, clicks, replies) also declining?
   - Yes -> inbox placement problem (messages going to spam)
   - No -> sending-side issue (messages not being sent)
```

---

## Log analysis patterns

Raw logs are often the fastest way to diagnose a problem. Know what to look for.

### Key log queries

**Find the highest-bouncing recipient domains (last 24h):**
```sql
SELECT
  split_part(recipient_email, '@', 2) AS domain,
  COUNT(*) AS bounce_count,
  COUNT(*) FILTER (WHERE NOT is_soft) AS hard_bounces,
  COUNT(*) FILTER (WHERE is_soft) AS soft_bounces
FROM delivery_events
WHERE event_type = 'bounced'
  AND occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY domain
ORDER BY bounce_count DESC
LIMIT 20;
```

**Spot authentication failures:**
```sql
SELECT
  sending_domain,
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE auth_status = 'fail') AS auth_failures,
  ROUND(100.0 * COUNT(*) FILTER (WHERE auth_status = 'fail') / COUNT(*), 2) AS failure_pct
FROM delivery_events
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY sending_domain
HAVING COUNT(*) > 50
ORDER BY failure_pct DESC;
```

**Identify complaint sources:**
```sql
SELECT
  campaign_id,
  template_id,
  COUNT(*) AS complaints,
  COUNT(*) FILTER (WHERE event_type = 'delivered') AS delivered,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'complained')
    / NULLIF(COUNT(*) FILTER (WHERE event_type = 'delivered'), 0), 3) AS complaint_rate
FROM delivery_events
WHERE occurred_at > NOW() - INTERVAL '7 days'
  AND event_type IN ('delivered', 'complained')
GROUP BY campaign_id, template_id
HAVING COUNT(*) FILTER (WHERE event_type = 'complained') > 0
ORDER BY complaint_rate DESC;
```

**Detect volume anomalies:**
```sql
WITH hourly AS (
  SELECT
    date_trunc('hour', occurred_at) AS hour,
    COUNT(*) AS sends
  FROM delivery_events
  WHERE event_type = 'sent'
    AND occurred_at > NOW() - INTERVAL '7 days'
  GROUP BY hour
),
stats AS (
  SELECT AVG(sends) AS avg_sends, STDDEV(sends) AS stddev_sends FROM hourly
)
SELECT h.hour, h.sends, s.avg_sends,
  ROUND((h.sends - s.avg_sends) / NULLIF(s.stddev_sends, 0), 1) AS z_score
FROM hourly h, stats s
WHERE h.sends > s.avg_sends + 2 * s.stddev_sends
ORDER BY h.hour DESC;
```

### What to grep for in application logs

When something breaks, these patterns help you find the cause:

```bash
# Rate limit rejections
grep "rate_limit\|limit_exceeded\|throttled" /var/log/email-sender.log

# Provider API errors
grep "status=[45][0-9][0-9]\|provider_error\|api_error" /var/log/email-sender.log

# Authentication failures in SMTP responses
grep "spf=fail\|dkim=fail\|dmarc=fail\|authentication" /var/log/email-sender.log

# Queue buildup indicators
grep "queue_size\|backlog\|enqueue_failed" /var/log/email-sender.log
```

---

## Automated health checks

Beyond reactive monitoring, run proactive health checks on a schedule.

### Daily automated checks

**1. Authentication verification**

Send a test email to a monitoring address and verify headers:

```bash
# Check received message headers for authentication results
# Look for these in the Authentication-Results header:
#   spf=pass
#   dkim=pass
#   dmarc=pass

# If any show "fail" or "none", your DNS config needs attention
```

Use services like [mail-tester.com](https://www.mail-tester.com/) or [learndmarc.com](https://learndmarc.com/) for manual spot-checks, but don't rely on them for continuous monitoring.

**2. DNS record validation**

```bash
# Verify SPF record exists and is valid
dig +short TXT yourdomain.com | grep "v=spf1"

# Verify DKIM selector is publishing
dig +short TXT selector._domainkey.yourdomain.com

# Verify DMARC policy is in place
dig +short TXT _dmarc.yourdomain.com
```

Run this daily. DNS changes (intentional or not) are a common cause of authentication failures. TTLs mean a bad change might not be visible for hours.

**3. Seed list testing**

Maintain a list of test addresses at major providers (Gmail, Outlook, Yahoo, iCloud) and send a test message weekly. Manually verify inbox placement. This catches spam-folder problems that webhook data won't show you - providers don't tell you when a message lands in spam.

**4. SMTP connectivity check**

```bash
# Verify your sending IPs can connect to major MX servers
# Connection refusal or timeouts indicate IP-level blocking

nc -z -w5 gmail-smtp-in.l.google.com 25 && echo "Gmail: OK" || echo "Gmail: BLOCKED"
nc -z -w5 outlook-com.olc.protection.outlook.com 25 && echo "Microsoft: OK" || echo "Microsoft: BLOCKED"
```

---

## Reputation scoring model

For systems that track sender reputation internally (for inbound mail classification or outbound health scoring), a weighted scoring model with time decay provides a practical approximation.

### Signal weights

A production-tested approach uses these signals:

| Signal | Direction | Weight | Cap |
|--------|-----------|--------|-----|
| Reply received | Positive | +0.05 per reply | +0.20 max |
| Authentication pass | Positive | +0.02 per pass | +0.15 max |
| Marked "not spam" | Positive | +0.10 per mark | +0.30 max |
| Marked as spam | Negative | -0.05 per mark | -0.30 max |
| Authentication failure | Negative | -0.03 per failure | -0.15 max |

Start at 0.5 (neutral). Clamp to [0, 1]. Apply time decay so the score drifts back toward 0.5 when no new signals arrive - a half-life of 30 days works well in practice.

### Why time decay matters

Without decay, a sender who was good 2 years ago but hasn't sent recently keeps a high score. With decay, the score naturally returns to neutral, requiring recent positive signals to maintain a good reputation. This matches how mailbox providers actually work - they weight recent behavior far more heavily than historical behavior.

---

## Common mistakes

**1. Only monitoring delivery rate.** A 99% delivery rate means nothing if 30% of "delivered" messages land in spam. Delivery rate tells you the message was accepted by the receiving server, not that it reached the inbox. Monitor inbox placement (via seed testing) alongside delivery rate.

**2. Not setting up provider postmaster tools.** Google Postmaster Tools, Microsoft SNDS, and Yahoo Sender Hub are free and take 10 minutes each to set up. They show you how providers actually view your sending. Running without them is flying blind.

**3. Alerting on every anomaly.** If your alert threshold is too low or your sample size too small, you'll get constant false alarms and start ignoring alerts. Require a minimum sample size (100+ sends in the window) and set thresholds at 2-3x baseline, not just above zero.

**4. No per-provider breakdown.** "Our overall delivery rate is fine" hides the fact that Gmail delivery dropped to 80% while all other providers are at 99%. Always break metrics out by major recipient provider.

**5. Treating monitoring as set-and-forget.** Baselines shift over time. A domain that normally sends 1,000 emails/day might grow to 10,000/day. Alert thresholds need to be recalibrated as your sending patterns change.

**6. Only checking blocklists when something breaks.** By the time you notice delivery problems from a blocklist listing, you've been listed for hours and potentially thousands of messages have been affected. Check every 15-30 minutes automatically.

**7. No incident response plan.** When the critical alert fires at 2am, you don't want to be figuring out the troubleshooting steps for the first time. Write the playbook before you need it.

**8. Ignoring soft metrics.** Open rate and click rate are noisier than bounce rate and complaint rate, but trending declines in engagement over 2+ weeks are early warning signals of inbox placement problems. By the time bounces spike, you've already lost weeks of inbox placement.

**9. Monitoring sends but not the queue.** A backed-up send queue means emails are delayed, which can be worse than a bounce for time-sensitive transactional messages. Monitor queue depth, processing latency, and dead-letter queue size.

**10. Separate monitoring for each sending domain.** If you use different domains for transactional and marketing email (which you should), each needs its own baselines and alert thresholds. A 0.5% complaint rate is normal for marketing but a red flag for transactional.

---

## References

- [Google Postmaster Tools](https://postmaster.google.com/) - monitor your spam rate and compliance status with Gmail
- [Google Bulk Sender Guidelines](https://support.google.com/a/answer/81126) - the requirements you must meet
- [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/) - IP reputation and spam trap data for Outlook.com
- [Microsoft JMRP](https://sendersupport.olc.protection.outlook.com/snds/JMRP.aspx) - complaint feedback loop for Microsoft domains
- [Yahoo Sender Hub](https://senders.yahooinc.com/) - complaint rate monitoring for Yahoo/AOL
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/) - Yahoo's sender requirements
- [Spamhaus Blocklist Lookup](https://check.spamhaus.org/) - check if your IP or domain is listed
- [Spamhaus Blocklist FAQs](https://www.spamhaus.org/faqs/spamhaus-blocklist/) - understanding SBL listings and removal
- [Barracuda Reputation Lookup](https://www.barracudacentral.org/lookups) - check Barracuda blocklist status
- [MXToolbox Blacklist Check](https://mxtoolbox.com/blacklists.aspx) - multi-blocklist lookup tool
- [M3AAWG Sending Best Practices](https://www.m3aawg.org/sites/default/files/m3aawg-senders-bcp-2022-06.pdf) - industry-standard monitoring recommendations
- [RFC 3463 - Enhanced Mail System Status Codes](https://datatracker.ietf.org/doc/html/rfc3463) - understanding bounce code structure

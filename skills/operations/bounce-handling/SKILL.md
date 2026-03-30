# Bounce Handling

Process hard and soft bounces correctly so you protect sender reputation and stop wasting sends on dead addresses.

## When to use this skill

- Your bounce rate is climbing above 2%
- You received a hard bounce (5xx SMTP code) and need to decide what to do
- Soft bounces are piling up and you need a retry strategy
- A provider paused or throttled your sending due to bounces
- You're building a webhook handler for delivery events
- You need to clean a stale email list before sending
- You want to set up automated suppression rules

## Related skills

- `domain-authentication` - proper SPF/DKIM/DMARC prevents authentication-related bounces
- `sender-reputation` - bounces directly damage reputation; monitoring catches problems early
- `suppression-lists` - where bounced addresses end up; managing the lifecycle
- `webhook-processing` - how to receive and process bounce notifications from providers
- `email-warmup` - high bounce rates during warmup can permanently damage a new domain
- `rate-limiting` - throttling sends to avoid triggering provider bounce limits

---

## Hard bounce vs soft bounce

The distinction matters because it determines whether you suppress immediately or retry.

**Hard bounce (5xx):** The receiving server permanently rejected the message. The address is invalid, the domain doesn't exist, or the server explicitly refuses mail from you. Never retry. Suppress the address immediately.

**Soft bounce (4xx):** The receiving server temporarily rejected the message. The mailbox might be full, the server might be overloaded, or you're being greylisted. Retry with backoff. Suppress only after repeated failures.

The first digit of the SMTP enhanced status code tells you the class:

| First digit | Meaning | Action |
|-------------|---------|--------|
| 2.x.x | Success | No action needed |
| 4.x.x | Temporary failure | Retry with backoff |
| 5.x.x | Permanent failure | Suppress immediately |

---

## SMTP bounce codes reference

These are the enhanced status codes defined by RFC 3463 (and extended by RFC 3886). The second digit indicates the subject category, and the third digit gives the specific detail.

### Hard bounces - suppress immediately

| Code | Meaning | What happened | Action |
|------|---------|--------------|--------|
| 5.1.0 | Other address status | Generic addressing problem | Suppress |
| 5.1.1 | Bad destination mailbox | User doesn't exist at this domain | Suppress |
| 5.1.2 | Bad destination system | Domain doesn't exist or isn't accepting mail | Suppress. Verify the domain is real. |
| 5.1.3 | Bad destination syntax | Malformed address (missing @, invalid chars) | Suppress. Fix the address in your data. |
| 5.1.6 | Mailbox has moved | Destination mailbox moved, no forwarding | Suppress. Update to the new address if provided. |
| 5.2.1 | Mailbox disabled | Account suspended, closed, or deactivated | Suppress |
| 5.4.4 | Unable to route | No route to destination; DNS failure | Suppress. Check if the domain still exists. |
| 5.5.0 | Other protocol status | Generic protocol error | Suppress |
| 5.7.1 | Delivery not authorized | Policy rejection (blocked sender, content filter) | Investigate. May be a content/reputation problem, not an address problem. |
| 5.7.13 | Sender not authenticated | DMARC/SPF/DKIM failure caused rejection | Fix authentication. See the `domain-authentication` skill. |

### Soft bounces - retry then suppress

| Code | Meaning | What happened | Action |
|------|---------|--------------|--------|
| 4.2.1 | Mailbox disabled (temporary) | Mailbox temporarily unavailable | Retry. Suppress after 3 failures in 30 days. |
| 4.2.2 | Mailbox full | Recipient hasn't cleared their inbox | Retry. Suppress after 3 failures in 30 days. |
| 4.3.1 | System full | Receiving server out of disk space | Retry. Not a recipient problem. |
| 4.3.2 | System not accepting messages | Server temporarily refusing all mail | Retry. Usually resolves within hours. |
| 4.4.1 | No answer from host | Connection timed out | Retry. Check if the domain's MX is down. |
| 4.4.2 | Bad connection | Connection dropped during transfer | Retry immediately. |
| 4.7.0 | Other security status | Generic temporary security rejection | Retry. May be greylisting. |
| 4.7.1 | Temporary auth failure | SPF/DKIM check temporarily failed | Retry. If persistent, check your DNS. |

### Ambiguous bounces - treat as hard unless proven otherwise

| Code | Meaning | Notes |
|------|---------|-------|
| 5.2.2 | Mailbox full (permanent) | Some servers return 5xx for long-term full mailboxes. Suppress. |
| 5.5.1 | Invalid command | Usually indicates a server configuration problem, not an address problem. Retry once. |
| 5.0.0 | Other/undefined | Generic catch-all. Default to suppress unless the bounce message text indicates a transient issue. |

**When in doubt, treat unknown bounces as hard.** This is safer for your sender reputation. A false suppression can be manually reversed; a damaged reputation takes weeks to recover.

---

## Retry strategy for soft bounces

Don't retry immediately. Don't retry indefinitely. Use escalating delays with a hard cutoff.

### Recommended retry schedule

| Attempt | Delay after bounce | Rationale |
|---------|-------------------|-----------|
| 1st retry | 1 hour | Give the issue time to resolve naturally |
| 2nd retry | 4 hours | Most transient issues clear within a few hours |
| 3rd retry | 24 hours | Last attempt; if it's still failing, suppress |

After 3 soft bounces within a 30-day window, suppress the address with a time-limited suppression (90 days). This lets the address "cool off" and automatically become sendable again if the issue was truly temporary.

### Implementation pattern

```
on soft_bounce(recipient, attempt_count):
  if attempt_count >= 3:
    suppress(recipient, reason="soft_bounce", expires_in=90_days)
    return

  delays = [1_hour, 4_hours, 24_hours]
  delay = delays[min(attempt_count, len(delays) - 1)]
  re_enqueue(recipient, delay=delay, attempt=attempt_count + 1)
```

Key details:
- **Track soft bounces per recipient, not per message.** If you sent 5 different emails and 3 bounced, that's 3 strikes.
- **Use a rolling window.** Count bounces within the last 30 days, not all time. An address that bounced once 6 months ago shouldn't count against today's threshold.
- **Time-limited suppression, not permanent.** Use 90-day expiry for soft bounce suppressions. Permanent suppression is for hard bounces and complaints.
- **Create a new send request for each retry.** Don't reuse the original request ID - you need a clean audit trail.

---

## Provider bounce webhook formats

Each email provider reports bounces differently. Your webhook handler needs to normalize these into a consistent internal format.

### Amazon SES

SES delivers bounce notifications via SNS. The bounce object is nested inside the SNS message:

```json
{
  "notificationType": "Bounce",
  "bounce": {
    "bounceType": "Permanent",
    "bounceSubType": "General",
    "bouncedRecipients": [
      {
        "emailAddress": "user@example.com",
        "status": "5.1.1",
        "diagnosticCode": "smtp; 550 5.1.1 user unknown"
      }
    ],
    "timestamp": "2025-01-15T12:00:00.000Z"
  }
}
```

- `bounceType: "Permanent"` = hard bounce. Suppress immediately.
- `bounceType: "Transient"` = soft bounce. Retry with backoff.
- `bounceSubType` gives detail: `General`, `NoEmail`, `MessageTooLarge`, `ContentRejected`, `AttachmentRejected`.
- SES also uses `bounceType: "Undetermined"` - treat as hard bounce for safety.

### Postmark

Postmark sends a JSON payload directly to your webhook URL:

```json
{
  "RecordType": "Bounce",
  "Type": "HardBounce",
  "TypeCode": 1,
  "Email": "user@example.com",
  "From": "sender@yourdomain.com",
  "BouncedAt": "2025-01-15T12:00:00Z",
  "Description": "The server was unable to deliver your message.",
  "Details": "smtp;550 5.1.1 The email account does not exist.",
  "Inactive": true,
  "CanActivate": true
}
```

- `Type: "HardBounce"` or `TypeCode: 1` = hard bounce.
- `Type: "SoftBounce"` or `Type: "Transient"` = soft bounce.
- `TypeCode` in the range 4000-4099 = soft bounce.
- Postmark auto-deactivates bounced addresses (`Inactive: true`). You still need your own suppression list.

### Resend

Resend sends webhook events with minimal bounce classification:

```json
{
  "type": "email.bounced",
  "data": {
    "email_id": "abc123",
    "to": "user@example.com",
    "created_at": "2025-01-15T12:00:00.000Z"
  }
}
```

Resend does not provide an explicit hard/soft bounce distinction in its webhook payload. **Default to treating Resend bounces as hard bounces** unless you can inspect the underlying SMTP status code. This is the safer choice for sender reputation.

### SendGrid

```json
{
  "event": "bounce",
  "email": "user@example.com",
  "timestamp": 1705315200,
  "status": "550",
  "reason": "550 5.1.1 The email account does not exist.",
  "type": "bounce"
}
```

- `event: "bounce"` with a `status` starting with `5` = hard bounce.
- `event: "deferred"` = soft bounce (SendGrid uses a separate event type for deferrals).
- `event: "blocked"` = the message was rejected before delivery. Check `reason` for details.

### Normalizing bounce events

Regardless of provider, normalize every bounce event into a consistent structure:

```
{
  provider_event_id: string    // Dedupe key - prevent processing the same event twice
  event_type: "bounced"
  is_soft: boolean             // Derived from provider-specific classification
  recipient_email: string
  smtp_status: string          // e.g., "5.1.1"
  diagnostic: string           // The raw bounce message
  occurred_at: timestamp
}
```

Always deduplicate by `provider_event_id`. Providers sometimes send the same webhook multiple times.

---

## Bounce rate thresholds

These are the numbers that matter in 2025.

### Provider thresholds

| Metric | Safe | Warning | Dangerous |
|--------|------|---------|-----------|
| Total bounce rate | < 1% | 1-2% | > 2% |
| Hard bounce rate | < 0.5% | 0.5-1% | > 1% |
| Spam complaint rate | < 0.1% | 0.1-0.3% | > 0.3% |

### What happens when you exceed them

**Google (Gmail):** As of late 2025, Gmail actively enforces bounce and complaint thresholds. Messages from senders with high bounce or complaint rates are temporarily rate-limited (421 responses), then permanently rejected (550) if the problem persists. Bulk senders (5,000+ messages/day to Gmail) must keep spam complaint rates below 0.3%.

**Yahoo/AOL:** Similar enforcement to Gmail. Bulk senders must authenticate with SPF, DKIM, and DMARC, and maintain low bounce/complaint rates. Non-compliant senders get throttled, then blocked.

**Microsoft (Outlook/Hotmail):** Uses Smart Network Data Services (SNDS) to track sender reputation. High bounce rates trigger throttling and eventually junk folder placement or outright blocks.

### Auto-pause as a safety net

Production systems should automatically pause a mailbox when bounce rates exceed a critical threshold. A sensible configuration:

- **Warning at 5% bounce rate:** Alert the operator. Something may be wrong with the list.
- **Auto-pause at 15% bounce rate:** Stop sending from this mailbox. Require manual investigation before resuming.
- **Auto-pause on any complaint:** Even a single spam complaint is a serious signal. Pause and investigate.

After pausing, reset the counters and require a human to review what went wrong before unpausing. Don't auto-resume - the underlying problem needs to be fixed first.

---

## Suppression rules

When a bounce triggers suppression, it needs to be scoped correctly.

### Suppression reason codes

| Reason code | Trigger | Scope | Expiry |
|-------------|---------|-------|--------|
| `hard_bounce` | 5xx SMTP response | Tenant (all campaigns) | Permanent |
| `soft_bounce` | 3+ soft bounces in 30 days | Tenant (all campaigns) | 90 days |
| `complaint` | Recipient marked as spam | Tenant (all campaigns) | Permanent |
| `manual_dnc` | Operator added to do-not-contact | Tenant or global | Permanent |
| `role_account` | Address is a role account (info@, etc.) | Tenant | Permanent |
| `domain_suppressed` | Entire domain is suppressed | Tenant | Permanent |

### Checking suppression before sending

Every send must check suppression before queueing. The check should cover:

1. **Email-level suppression** - is this specific address suppressed?
2. **Domain-level suppression** - is the entire domain suppressed?
3. **Expiry** - has a time-limited suppression expired?

```
is_suppressed(email, tenant_id):
  check email in suppressions where (tenant matches or global) and not expired
  check domain in suppressed_domains where tenant matches
  return first match or false
```

### Role account detection

Role-based addresses (info@, support@, admin@, etc.) should generally be suppressed for marketing and cold outreach. They're shared mailboxes that often trigger complaints because no single person opted in.

Common role account prefixes to detect:

```
abuse, admin, billing, compliance, devnull, dns, ftp, hostmaster,
info, inoc, ispfeedback, ispsupport, list, list-request, maildaemon,
mailer-daemon, mailerdaemon, marketing, noc, no-reply, noreply,
nospam, null, phish, phishing, postmaster, privacy, registrar,
root, security, spam, support, sysadmin, tech, undisclosed-recipients,
unsubscribe, usenet, uucp, webmaster, www
```

Note: For transactional email (password resets, order confirmations), sending to role accounts is fine. The suppression should apply to marketing/outreach sends only.

---

## List hygiene

Bounce handling is reactive. List hygiene is proactive. Do both.

### Before sending to a list

1. **Verify on acquisition.** Run new addresses through a verification service before they enter your system. Catches typos, disposable addresses, and known-bad domains.
2. **Double opt-in.** For marketing lists, require email confirmation. This eliminates typos and fake signups. It's also legally required in some jurisdictions (GDPR for EU contacts).
3. **Remove obviously bad addresses.** Syntax validation catches `user@gmial.com` and `user@.com`. Do this at the form level.

### Ongoing maintenance

1. **Remove hard bounces immediately.** Every hard bounce should trigger instant suppression. No exceptions.
2. **Track engagement.** If a contact hasn't opened or clicked in 90+ days, flag them as disengaged. Consider a re-engagement campaign before removing them.
3. **Re-verify periodically.** Run your list through a verification service every 3-6 months. Addresses go stale - people leave companies, mailboxes get shut down.
4. **Monitor per-domain bounce rates.** If a specific domain (e.g., `@bigcorp.com`) is bouncing at a high rate, suppress the entire domain and investigate. The company may have changed email systems.

### Domain-level suppression

Sometimes a whole domain goes bad - company shuts down, domain expires, MX records break. When you see multiple bounces from the same domain:

- 3+ hard bounces from a domain within 7 days: suppress the domain
- Before sending to any new address at that domain, verify the domain's MX records are still valid

---

## Monitoring and alerting

### Metrics to track

- **Bounce rate by type** (hard vs soft) per sending domain, per mailbox, per campaign
- **Bounce rate trend** over time (daily/weekly) - a sudden spike means something changed
- **Top bouncing domains** - identifies systematic problems with specific recipient domains
- **Suppression list growth** - if it's growing fast, your acquisition is broken
- **Retry success rate** - what percentage of soft bounce retries eventually deliver?

### Alert thresholds

| Metric | Alert level | Action |
|--------|------------|--------|
| Bounce rate > 2% (rolling 24h) | Warning | Review recent sends, check for list quality issues |
| Bounce rate > 5% (rolling 24h) | Critical | Pause sending, investigate immediately |
| Hard bounce spike (2x normal) | Critical | Check if a domain went down or a list was corrupted |
| Soft bounce retry exhaustion > 50% | Warning | Recipient infrastructure may have changed |

---

## Common mistakes

**1. Retrying hard bounces.** A 550 "user unknown" will never succeed no matter how many times you retry. Each retry damages your reputation further. Suppress immediately.

**2. Treating all bounces the same.** Hard bounces and soft bounces require completely different handling. Mixing them up either wastes sends (retrying hard bounces) or loses valid recipients (suppressing soft bounces too aggressively).

**3. No suppression expiry on soft bounces.** Permanently suppressing after a soft bounce means you'll never send to that address again, even if the issue was a temporarily full mailbox. Use 90-day expiry for soft bounce suppressions.

**4. Ignoring bounce rate until a provider blocks you.** By the time Google or Yahoo blocks your domain, the damage is done. Monitor continuously and set alerts at 2% total bounce rate.

**5. Not deduplicating webhook events.** Providers send webhooks at-least-once, not exactly-once. If you don't deduplicate by provider event ID, you'll double-count bounces and trigger false suppressions.

**6. Buying or scraping email lists.** Purchased lists have bounce rates of 20-40%. One bad send from a purchased list can get your domain blacklisted permanently. There's no technical fix for bad data.

**7. No domain-level suppression.** When a company's domain goes offline, you'll get hundreds of individual bounces instead of one domain-level suppression. Track per-domain bounce rates and suppress at the domain level when patterns emerge.

**8. Sending marketing email to role accounts.** Addresses like info@, support@, and postmaster@ are shared mailboxes. Nobody opted in personally, so complaints are common. Suppress role accounts for marketing sends.

**9. Not tracking bounces per recipient across campaigns.** A recipient that soft-bounces on campaign A and soft-bounces on campaign B has soft-bounced twice. Track bounce counts per recipient, not per campaign.

**10. Auto-resuming after a pause without investigation.** When a mailbox gets auto-paused for high bounce rates, someone needs to figure out why before turning it back on. Auto-resume just repeats the problem.

---

## References

- [RFC 3463 - Enhanced Mail System Status Codes](https://datatracker.ietf.org/doc/html/rfc3463) - the spec that defines bounce code structure
- [RFC 3886 - Extended Status Code Registry](https://datatracker.ietf.org/doc/html/rfc3886) - additional status codes
- [RFC 2142 - Mailbox Names for Common Roles](https://www.ietf.org/rfc/rfc2142.txt) - defines role-based addresses like postmaster@ and abuse@
- [Google Postmaster Tools](https://postmaster.google.com/) - monitor your reputation with Gmail
- [Google Bulk Sender Guidelines](https://support.google.com/a/answer/81126) - bounce and complaint rate requirements
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/) - Yahoo's sender requirements
- [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/) - Outlook/Hotmail reputation data
- [Postmark Bounce Webhook Docs](https://postmarkapp.com/developer/webhooks/bounce-webhook) - Postmark's bounce webhook format
- [M3AAWG Sending Best Practices](https://www.m3aawg.org/sites/default/files/m3aawg-senders-bcp-2022-06.pdf) - industry-standard sender best practices
- [Postmark Transactional Email Bounce Handling Guide](https://postmarkapp.com/guides/transactional-email-bounce-handling-best-practices) - practical bounce handling advice

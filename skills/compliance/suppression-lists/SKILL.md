# Suppression Lists

Manage bounces, complaints, unsubscribes, and do-not-contact records to protect sender reputation and stay legally compliant.

## When to use this skill

- Setting up suppression handling for a new email system
- Bounce rates or complaint rates are climbing
- Migrating between email providers and need to carry suppressions forward
- Handling a GDPR erasure request while maintaining suppression compliance
- Deciding whether to re-engage inactive or previously suppressed contacts
- Building automated suppression workflows from webhook events
- Suppressing entire domains or role accounts from outbound sends

## Related skills

- `bounce-handling` - retry strategies for soft bounces, processing hard bounces
- `email-compliance` - CAN-SPAM, GDPR, CASL, unsubscribe requirements
- `sender-reputation` - how suppressions protect (and repair) your sending reputation
- `webhook-processing` - handling delivery events that trigger suppressions
- `domain-authentication` - authentication failures that cause delivery issues

---

## What a suppression list is

A suppression list is a set of email addresses (or domains) that your system will never send to, regardless of whether they appear in a campaign audience or journey. It is the final gate before mail leaves your infrastructure.

Every email platform maintains one, but the important distinction is scope. You need suppressions at multiple levels:

| Scope | What it covers | Example |
|-------|---------------|---------|
| Global | Addresses suppressed across all tenants/accounts | Known spam traps, legal requests |
| Account/tenant | Addresses suppressed for a specific sender | A recipient who complained about your emails |
| Campaign | Addresses suppressed for a specific campaign only | Opt-out from a particular newsletter |

Most platforms only give you account-level suppression. That is not enough if you operate multiple brands, send on behalf of customers, or run different mail streams. Build your suppression model with all three scopes from the start.

---

## Types of suppressions

Not all suppressions are equal. The reason an address was suppressed determines whether it can ever be removed.

### Hard bounce

The mailbox does not exist or the domain cannot receive mail. The receiving server returned a permanent failure (5xx SMTP status code).

**Action:** Suppress immediately on first hard bounce. Never retry.

Hard bounces above 0.5% of a send indicate a list quality problem. Providers like Gmail and Microsoft track your hard bounce rate as a sender reputation signal. Above 2%, expect throttling or blocking.

### Spam complaint

The recipient clicked "Report Spam" or "Mark as Junk" in their mail client. You receive this via feedback loops (FBLs) from providers.

**Action:** Suppress immediately. A single complaint is a stronger negative signal than a bounce. Gmail's threshold is 0.3% complaint rate, but they recommend staying below 0.1%.

Never email someone who has complained. Not once more. Not to confirm. Not to ask why. Suppression is permanent.

### Unsubscribe

The recipient clicked your unsubscribe link or used the one-click List-Unsubscribe mechanism (RFC 8058).

**Action:** Suppress within 2 days. CAN-SPAM allows 10 business days, but Google and Yahoo enforce faster processing. Practical standard in 2025+ is immediate or same-day.

Unsubscribe suppressions are scoped. If someone unsubscribes from your newsletter, that does not necessarily suppress them from transactional email (order confirmations, password resets). But if they unsubscribe from "all marketing," respect that globally.

### Soft bounce (repeated)

Temporary delivery failures - mailbox full, server temporarily unavailable, message too large. Individual soft bounces are not suppressions; they are retries. But repeated soft bounces to the same address indicate a problem.

**Action:** After 3 soft bounces within 30 days, suppress with an expiration. A 90-day suppression with automatic expiry is a reasonable default. This protects your reputation while allowing recovery for addresses that come back online.

Retry strategy for individual soft bounces before suppression:
- 1st soft bounce: retry after 1 hour
- 2nd soft bounce: retry after 6 hours
- 3rd soft bounce: suppress for 90 days

### Manual do-not-contact (DNC)

An address added manually by your team - sales prospects who asked not to be contacted, known-bad addresses from list cleaning, addresses flagged during onboarding.

**Action:** Treat as permanent unless explicitly removed. Document the source and date for audit purposes.

### Legal request

A suppression resulting from a legal demand - GDPR erasure request, CAN-SPAM complaint to the FTC, CASL complaint, cease-and-desist.

**Action:** Suppress permanently. Never remove. Document the legal basis, jurisdiction, and date. This is the one suppression type where you must retain a record even if the person demands full data deletion (see GDPR section below).

### No engagement

A recipient who has received multiple emails over an extended period with no opens, clicks, or replies. Not a hard signal like a bounce - more a slow fade.

**Action:** Suppress after a defined inactivity window (typically 90-180 days of no engagement). Consider a re-engagement attempt before suppression (see re-engagement section).

### Role accounts

Addresses like `info@`, `postmaster@`, `abuse@`, `sales@`, `support@`, `webmaster@`, `admin@`, `noc@` (see RFC 2142). These go to shared mailboxes or distribution lists, not individuals.

**Action:** Suppress from marketing and cold outreach. Role accounts generate disproportionate complaint rates because multiple people receive the message and any one of them can report it. They are also common spam trap candidates.

Transactional email to role accounts is fine if the address is a legitimate customer (e.g., `billing@company.com` signed up for your service).

### Domain-level suppression

An entire domain suppressed, not just individual addresses. Useful for:
- Domains that always hard bounce (expired, parked, or invalid domains)
- Competitor domains you never want to email
- Known spam trap domains
- Internal/test domains you want to exclude from production sends

**Action:** Suppress all addresses `*@domain.com`. Check both email-level and domain-level suppressions before every send.

---

## Suppression architecture

### Storage model

At minimum, store these fields for each suppression record:

| Field | Purpose |
|-------|---------|
| `recipient_email` | The suppressed address (normalized to lowercase) |
| `scope` | `global`, `tenant`, or `campaign` |
| `reason_code` | `hard_bounce`, `complaint`, `manual_dnc`, `legal_request`, `soft_bounce`, `role_account`, `domain_suppressed`, `no_engagement` |
| `source` | How the suppression was created: `webhook`, `api`, `import`, `manual` |
| `source_event_id` | Link to the originating event (bounce ID, complaint ID) |
| `expires_at` | Null for permanent, timestamp for temporary (soft bounce) |
| `created_at` | When the suppression was added |

For domain-level suppressions, maintain a separate table with `domain`, `reason_code`, and `source`.

### Lookup performance

Suppression checks happen on every single send. This is your hottest path. Design for it:

- Index on `recipient_email` for email-level lookups
- Index on `domain` for domain-level lookups
- Check both email-level and domain-level in parallel
- Filter out expired suppressions at query time (`expires_at IS NULL OR expires_at > NOW()`)
- Account for scope hierarchy: global suppressions override tenant, tenant overrides campaign

A typical query checks: "Is this email (or its domain) suppressed at global, tenant, or campaign scope, and is the suppression currently active?"

### Upsert, don't duplicate

When the same address is suppressed again (e.g., a second complaint), update the existing record rather than creating a duplicate. Use an upsert on the natural key of `(recipient_email, scope, tenant_id, campaign_id)`. Update the reason code, source, and event ID to reflect the most recent signal.

---

## Automation: webhook-driven suppression

The highest-value pattern is fully automated suppression from delivery events. Your system should process provider webhooks and create suppressions without human intervention.

### Event-to-suppression mapping

| Webhook event | Suppression action |
|--------------|-------------------|
| `bounced` (permanent/hard) | Suppress immediately, scope: tenant, reason: `hard_bounce` |
| `bounced` (transient/soft) | Track count. After 3 in 30 days, suppress with 90-day expiry |
| `complained` | Suppress immediately, scope: tenant, reason: `complaint` |
| Unsubscribe (via List-Unsubscribe POST or link click) | Suppress immediately, scope depends on unsubscribe type |

### Distinguishing soft from hard bounces

Provider webhook payloads encode bounce type differently:

- **Amazon SES:** `bounce.bounceType` is `Permanent` or `Transient`
- **Postmark:** `Type` is `HardBounce` or `SoftBounce`; `TypeCode` 4000-4099 for soft bounces
- **Resend:** Check bounce metadata for type classification

When the bounce type is ambiguous or missing, **treat it as a hard bounce**. False positives (suppressing a soft bounce permanently) are far less costly than false negatives (continuing to send to a dead address).

---

## GDPR: the erasure vs. suppression paradox

This is the most commonly misunderstood compliance issue in email suppression.

### The paradox

Under GDPR Article 17, a person can request deletion of all their personal data ("right to be forgotten"). But if you delete their email address entirely, you lose the ability to suppress them - meaning they could be re-added to a list and emailed again, violating the very preference they expressed.

### The resolution

GDPR Article 17(3)(b) permits retention of personal data when necessary for "compliance with a legal obligation" or to establish, exercise, or defend legal claims. The ICO (UK), CNIL (France), and EDPB have all acknowledged that maintaining a suppression list is a legitimate basis for retaining the minimal data needed to prevent unwanted contact.

**What you can keep:**
- The email address itself
- The fact that it is suppressed
- The reason code (complaint, legal request, etc.)
- The date of suppression
- The jurisdiction

**What you must delete:**
- All other personal data (name, company, demographics, behavioral data)
- Send history and engagement data
- Contact metadata and CRM fields
- Consent records beyond what is needed for the suppression

### Implementation

When processing a GDPR erasure request:

1. Delete all personal data from your systems (contacts, accounts, analytics, CRM)
2. Retain only the suppression record with reason code `legal_request`
3. Add the jurisdiction (`GDPR`) to the record
4. Document the request date for audit purposes
5. Confirm deletion to the data subject, noting that you retain their email address solely to prevent future contact

The 2025 EDPB coordinated enforcement action specifically examined how controllers handle this balance. Controllers who automatically applied the "legal obligation" exception without case-by-case assessment were cited. Document your reasoning for each retention.

---

## Provider migration: carrying suppressions forward

When switching email providers, your suppression list is the single most important data export. Missing it causes immediate reputation damage.

### Migration checklist

1. **Export everything.** Pull all hard bounces, complaints, unsubscribes, and manual suppressions from your old provider. Most providers offer CSV export via API or dashboard.

2. **Preserve reason codes.** Don't flatten everything into a single "suppressed" list. You need to know why each address was suppressed because different reasons have different re-engagement rules.

3. **Import before your first send.** Upload the complete suppression list to your new provider before sending a single message. This is non-negotiable.

4. **Verify the import.** Send a test batch and confirm that previously suppressed addresses are blocked. Don't trust the import count alone - spot-check specific addresses.

5. **Maintain the old provider's list.** Keep a backup of the exported suppressions. Provider data retention varies and you may lose access after cancellation.

### What providers don't share

Provider-level suppression lists (their internal blocklists) do not transfer. If Postmark internally suppressed an address based on cross-customer signals, that intelligence stays with Postmark. You only get your own account's suppressions.

This means your first sends from a new provider may hit addresses that were previously blocked by the old provider's shared intelligence. Monitor bounce and complaint rates closely during the first 2-4 weeks after migration.

---

## Re-engagement: when it is safe and when it is not

### Never re-engage

These suppression types are permanent. Do not attempt re-engagement under any circumstances:

- **Spam complaints** - The recipient explicitly marked you as spam. Re-engaging is a legal and deliverability risk.
- **Legal requests** - A legal demand to stop contact. Re-engaging could be a violation.
- **Hard bounces** - The address does not exist. There is nothing to re-engage.

### Potentially safe to re-engage

These types may be candidates for careful, limited re-engagement:

- **Soft bounce (expired suppression)** - After the suppression expires (e.g., 90 days), the address is automatically eligible again. Monitor closely on the first send back.
- **No engagement** - Recipients who stopped opening/clicking but never complained. Send a single re-engagement email with a clear unsubscribe option. If no response, suppress permanently.
- **Unsubscribe (from a specific list)** - If someone unsubscribed from your newsletter but is still opted in to product updates, they are not suppressed from product updates. This is not really re-engagement - it is respecting granular preferences.

### Re-engagement campaign rules

If you run a re-engagement campaign for disengaged contacts:

1. Send a **single** email, not a sequence
2. Include a clear, prominent unsubscribe link
3. Set a deadline: if no engagement within 7-14 days, suppress permanently
4. Monitor complaint rates on the re-engagement send separately from your regular sends
5. If the re-engagement send generates complaint rates above 0.1%, stop immediately
6. Never re-engage addresses that were suppressed for longer than 12 months

---

## Role account detection

Detecting role accounts requires checking the local part (the portion before the @) against known role patterns.

### Common role account patterns

```
# RFC 2142 mandated or recommended
postmaster, abuse, hostmaster, webmaster, noc, security

# Business functions
info, sales, marketing, support, billing, admin, contact, office,
help, feedback, hello, general, team, press, media, careers, jobs, hr

# Technical/operations
sysadmin, administrator, root, devops, ops, engineering, it, tech,
dns, ftp, www, mail, smtp, imap

# Catch-all indicators
no-reply, noreply, do-not-reply, mailer-daemon, bounce
```

### Implementation approach

Match against the local part, case-insensitive. Some of these (like `info@`) are extremely common and generate high complaint rates when sent unsolicited marketing. Others (like `sales@`) might be legitimate contacts in some contexts.

For cold outreach and marketing: suppress all role accounts by default. For transactional email: allow role accounts that are verified customers.

---

## Consent tracking alongside suppressions

Suppressions tell you who not to email. Consent records tell you who gave permission and on what basis. These are separate concerns but they interact.

### Consent basis types

| Basis | Description | Example |
|-------|-------------|---------|
| Explicit opt-in | Person actively chose to receive email | Checked a box, submitted a form |
| Legitimate interest | You have a business reason, GDPR Article 6(1)(f) | Existing customer, relevant content |
| Contractual | Email is necessary to fulfill a contract | Order confirmations, account notifications |
| Legal obligation | Email is legally required | Compliance notices, tax documents |

### How consent and suppression interact

- A suppression always wins over consent. If someone opted in but later complained, the complaint suppression overrides the opt-in.
- Revoking consent creates a suppression. When someone withdraws consent, add an unsubscribe suppression.
- Consent records should be kept even after suppression for audit purposes - they document the chain of events.

---

## Monitoring and alerts

### Key metrics to track

| Metric | Healthy threshold | Action if exceeded |
|--------|------------------|-------------------|
| Hard bounce rate | Below 0.5% per send | Pause and clean list |
| Spam complaint rate | Below 0.1% (Google's recommendation) | Investigate content and targeting |
| Unsubscribe rate | Below 0.5% per send | Review content relevance and frequency |
| Suppression list growth rate | Steady or declining | If accelerating, investigate root cause |
| Suppression check latency | Under 10ms p99 | Optimize indexes or add caching |

### Automated safeguards

Build these circuit breakers into your send pipeline:

1. **Complaint spike detection.** If complaint rate exceeds 0.3% in a rolling window, auto-pause the sending tenant/mailbox.
2. **Bounce spike detection.** If bounce rate exceeds 2% in a single send batch, pause and investigate.
3. **Negative signal budget.** Track daily bounces + complaints as a combined "negative signal" count. When it exceeds a threshold, block further sends until reviewed.

These safeguards prevent a single bad list import or misconfigured campaign from destroying your sender reputation. Tools like [molted.email](https://molted.email) build these circuit breakers into the send pipeline automatically.

---

## Common mistakes

### 1. Not importing suppressions when switching providers

This is the number one cause of reputation damage during migration. Your new provider has zero context about who has bounced or complained. You will immediately re-send to dead addresses and angry recipients.

### 2. Treating all suppressions the same

Hard bounces, complaints, and unsubscribes have different severities and different rules for potential removal. A flat "suppressed" flag with no reason code means you cannot make informed decisions later.

### 3. Only checking suppressions at send time

Check suppressions at list import time, at campaign audience selection, and at send time. Catching bad addresses early prevents them from inflating your audience counts and distorting campaign metrics.

### 4. Deleting suppression records during GDPR erasure

If you delete the suppression record along with everything else, the address can re-enter your system through a list import or API call and get emailed again. Keep the suppression, delete everything else.

### 5. Ignoring domain-level suppression

You suppress `user@dead-domain.com` after a hard bounce, but next week `other-user@dead-domain.com` enters your list and bounces too. Suppress the domain, not just individual addresses, when the domain itself is the problem.

### 6. No expiry on soft bounce suppressions

Soft bounce suppressions should expire. Mailboxes that were full 6 months ago might be fine now. Permanent suppression for soft bounces loses you legitimate recipients over time.

### 7. Sending a "we're sorry to see you go" email after suppression

When someone unsubscribes or complains, do not send them a confirmation or win-back email. They asked to stop receiving email. Send them more email and you risk another complaint, which compounds the reputation damage.

### 8. Not suppressing role accounts from cold outreach

`info@company.com` goes to a shared inbox. Multiple people see your cold email. Any one of them can report it as spam. Role accounts have disproportionately high complaint rates for unsolicited mail.

---

## References

- [RFC 2142](https://datatracker.ietf.org/doc/html/rfc2142) - Mailbox names for common services, roles, and functions
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-click unsubscribe for List-Unsubscribe
- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - Spam rate and bounce requirements
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/) - Suppression and complaint handling
- [Microsoft Outlook Sender Requirements (May 2025)](https://techcommunity.microsoft.com/blog/outlookblog/strengthening-email-security-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730) - Bounce and complaint handling enforcement
- [M3AAWG Sender Best Common Practices v3](https://www.m3aawg.org/documents/en/m3aawg-sender-best-common-practices-version-30) - Industry-wide suppression recommendations
- [EDPB Coordinated Enforcement Action on Right to Erasure (2025)](https://www.edpb.europa.eu/news/news/2025/cef-2025-launch-coordinated-enforcement-right-erasure_en) - How DPAs evaluate erasure vs. suppression retention
- [GDPR Article 17](https://gdpr.eu/right-to-be-forgotten/) - Right to erasure and its exceptions
- [CAN-SPAM Act](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) - US unsubscribe processing requirements
- [Amazon SES Suppression List](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html) - Provider-level suppression management
- [Mailgun Suppressions Documentation](https://help.mailgun.com/hc/en-us/articles/360012287493-Suppressions-Bounces-Complaints-Unsubscribes-Allowlists) - Provider suppression categories and handling

# Sender Reputation

Understand how mailbox providers score your domain, monitor your reputation, and recover when it degrades.

## When to use this skill

- Setting up monitoring for a new sending domain
- Deliverability has dropped and you need to diagnose why
- You've been listed on a blocklist and need to get removed
- Bounce rates or complaint rates are climbing
- You're evaluating whether your domain reputation is healthy enough to increase volume
- Planning a reputation recovery after a bad sending event

## Related skills

- `domain-authentication` - SPF, DKIM, DMARC setup (prerequisite for good reputation)
- `email-warmup` - ramping volume on new domains/IPs without damaging reputation
- `bounce-handling` - processing bounces that directly affect reputation signals
- `suppression-lists` - managing the lists that protect you from repeat damage
- `rate-limiting` - volume controls that prevent reputation-damaging spikes

---

## How reputation actually works

Mailbox providers maintain a score for every domain (and IP) that sends email to their users. This score determines whether your messages land in the inbox, the spam folder, or get rejected outright. The score is not a single number you can look up - each provider calculates its own, using its own signals and weights.

The core signals are the same everywhere:

| Signal | Weight | Threshold |
|--------|--------|-----------|
| Spam complaint rate | Highest | Under 0.1% (hard limit 0.3%) |
| Bounce rate | High | Under 2% (ideally under 1%) |
| Spam trap hits | High | Zero tolerance for pristine traps |
| Engagement (opens, replies, clicks) | High | Provider-specific, relative to your history |
| Volume patterns | Medium | Consistent, no sudden spikes |
| Authentication (SPF, DKIM, DMARC) | Medium | All three passing and aligned |
| List age and hygiene | Medium | No purchased/scraped lists |
| Content patterns | Lower | No spam-trigger phrases or deceptive content |

Two things to internalize about reputation:

1. **It is earned slowly and lost quickly.** A domain with two years of clean history can be degraded to spam-folder status within 48 hours by a single bad sending event.
2. **Domain reputation now outweighs IP reputation.** Gmail explicitly treats domain reputation as the most heavily weighted metric. You cannot escape a damaged domain reputation by switching IPs or providers - the reputation follows the domain.

---

## Domain reputation vs IP reputation

Until roughly 2020, IP reputation was king. You could warm up a new dedicated IP, build its reputation, and deliverability was primarily an IP-level concern. Shared IPs meant shared risk.

That has shifted. Modern mailbox providers - Gmail especially - now weight domain reputation more heavily than IP reputation. Here is why that matters:

**Domain reputation:**
- Follows your domain across providers, IPs, and infrastructure changes
- Built from engagement, complaints, bounces, and authentication over time
- Cannot be reset by switching providers or IPs
- Takes weeks to months to recover when damaged

**IP reputation:**
- Tied to the specific sending IP address
- Matters most during warmup and for dedicated IP senders
- Can be rebuilt in 2-4 weeks of clean sending
- Shared IPs pool reputation across all senders on that IP

**Practical implications:**
- Switching email providers does not reset your reputation. Your domain reputation travels with you.
- Using a new subdomain (e.g., `mail.example.com` instead of `example.com`) gives you a fresh domain reputation, but providers are increasingly sophisticated at linking subdomains to parent domains.
- If you use shared IPs (most SaaS email providers), your IP reputation is partially out of your control. Domain reputation is what you can directly influence.

---

## The five reputation signals in detail

### 1. Spam complaints

This is the single most damaging signal. When a recipient clicks "Report Spam" or "Mark as Junk," that is a direct negative vote against your domain.

**Thresholds:**
- Under 0.1% - healthy. Google recommends staying here.
- 0.1% to 0.3% - warning zone. You will see deliverability degradation.
- Over 0.3% - critical. Google and Yahoo will actively filter or reject your mail.
- Over 0.5% - emergency. Expect blocklisting and significant delivery failures.

Complaint rate is calculated as complaints divided by delivered messages (not sent messages). A 0.1% rate means 1 complaint per 1,000 delivered emails.

**What drives complaints up:**
- Sending to people who did not opt in
- Sending too frequently to people who did opt in
- Making it hard to unsubscribe (so people use "Report Spam" instead)
- Content that does not match what recipients expected when they signed up
- Continuing to send to disengaged recipients

### 2. Bounce rate

Every hard bounce - a permanent delivery failure to an address that does not exist or permanently rejects mail - is a negative signal. Providers interpret high bounce rates as evidence that you are not maintaining your lists.

**Thresholds:**
- Under 1% - healthy
- 1% to 2% - acceptable but worth investigating
- 2% to 5% - problematic. Automated scrutiny begins.
- Over 5% - critical. Some providers will throttle or block your sends.

Soft bounces (temporary failures like a full mailbox or server timeout) are less damaging individually but indicate problems if they persist. A recipient that soft-bounces repeatedly (3-5 times across multiple sends) should be suppressed. Providers track whether you continue sending to addresses that keep bouncing.

### 3. Spam traps

Spam traps are email addresses operated by mailbox providers, blocklist operators, and anti-spam organizations specifically to catch senders with bad practices. There are three types:

**Pristine traps** are addresses created solely to catch spammers. They have never belonged to a real person and have never opted in to anything. Hitting one means you acquired the address through scraping, purchasing lists, or guessing. The consequences are severe - immediate blocklisting is common.

**Recycled traps** are abandoned email addresses that providers have repurposed. They were once real addresses, returned bounces for a period (typically 6-12 months), and were then reactivated as traps. Hitting one means you are not cleaning your list of addresses that have been bouncing. The impact is less severe than pristine traps but still degrades reputation over time.

**Typo traps** capture emails sent to common misspellings of major domains (e.g., `user@gmial.com`, `user@yaho.com`). These indicate you are not validating addresses at the point of collection.

You will never know which specific addresses are spam traps. The only defense is list hygiene: validate addresses at collection, remove addresses that bounce, and never purchase or scrape email lists.

### 4. Engagement

Mailbox providers track how recipients interact with your messages. Positive engagement (opens, clicks, replies) signals that your mail is wanted. Negative engagement (ignoring, deleting without reading, moving to spam) signals the opposite.

Gmail is particularly engagement-heavy in its scoring. A domain that sends to a large list with low open rates will see worse inbox placement over time, even if no one is actively complaining. The mail is just not wanted enough.

**Engagement signals that help reputation:**
- Opens (measured via tracking pixel or BIMI indicator loading)
- Replies
- Clicks on links
- Moving from spam to inbox ("not spam" action)
- Adding sender to contacts

**Engagement signals that hurt reputation:**
- Deleting without reading
- Ignoring consistently (never opening across multiple sends)
- Moving from inbox to spam

Disengaged recipients are a slow poison. They do not cause immediate damage like complaints or bounces, but they steadily erode your engagement ratios. A production email system should track recipient fatigue - scoring each contact based on send frequency, bounce history, complaint history, and engagement decay - and stop sending to contacts that show sustained disengagement.

### 5. Volume patterns

Mailbox providers watch for sudden changes in sending volume. A domain that normally sends 500 emails per day and suddenly sends 50,000 looks like a compromised account or a new spam operation.

**What triggers volume-based filtering:**
- Sending 2x or more of your typical daily volume
- Starting a new sending domain or IP with high volume immediately (no warmup)
- Erratic patterns - high volume some days, nothing on others
- Time-of-day anomalies - sending at hours unusual for your region or business type

Consistent, predictable volume is what providers want to see. Ramp gradually. If you need to increase volume, do it over weeks, not days. See the `email-warmup` skill for specific ramp schedules.

---

## Monitoring your reputation

You cannot manage what you cannot measure. Set up monitoring on all three major provider tools and at least one third-party blocklist checker.

### Google Postmaster Tools

The primary tool for monitoring Gmail deliverability. Free, requires domain verification.

**Setup:**
1. Go to [Google Postmaster Tools](https://gmail.com/postmaster/)
2. Add your sending domain
3. Verify ownership via DNS TXT record
4. Data populates once you send sufficient volume to Gmail (typically 100+ messages/day)

**What it shows (as of the 2025 v2 update):**
- Spam rate with threshold lines (recommended: under 0.10%, violation: over 0.30%)
- Authentication rates (SPF, DKIM, DMARC pass/fail)
- Encryption (TLS usage)
- Delivery errors

**Important change:** In September 2025, Google retired the domain and IP reputation dashboards from Postmaster Tools, shifting to compliance-driven metrics. You no longer see a "High/Medium/Low/Bad" reputation label. Instead, focus on keeping your spam rate below the threshold lines and authentication rates at 100%.

### Microsoft SNDS (Smart Network Data Services)

Microsoft's equivalent for Outlook.com, Hotmail, and Live.com recipients.

**Setup:**
1. Go to [SNDS](https://sendersupport.olc.protection.outlook.com/snds/)
2. Sign in with a Microsoft account
3. Request access for each sending IP address or IP range
4. Verify ownership (automated process)

**What it shows:**
- Filter results per IP (Green/Yellow/Red)
- Spam trap hits
- Complaint rates via the Junk Email Reporting Program (JMRP)

**Limitations:** SNDS is IP-based, not domain-based. You need to know your sending IPs. If you use a shared-IP provider, you may not be able to access SNDS data directly - ask your provider for it. Requires a minimum of 100 messages per day to an IP for data to appear.

### Yahoo Sender Hub

Yahoo's monitoring tool for Yahoo Mail and AOL recipients.

**Setup:**
1. Go to [Yahoo Sender Hub](https://senders.yahooinc.com/)
2. Sign in or create an account
3. Add your sending domain (the domain used in your DKIM signature)
4. Verify by adding a DNS TXT record Yahoo provides
5. Activate the "Insights" dashboard after verification

**What it shows:**
- Spam complaint rate (percentage marked as spam after inbox delivery)
- Delivered volume
- Complaint Feedback Loop (CFL) data

**Notes:** Data populates within 24-48 hours for domains meeting Yahoo's minimum daily volume. No API access available - you must check manually. Register for their CFL to receive individual complaint notifications.

### Third-party monitoring

In addition to provider-specific tools, use these:

**Blocklist checkers:**
- [MXToolbox Blacklist Check](https://mxtoolbox.com/blacklists.aspx) - checks 100+ blocklists at once
- [MultiRBL](https://multirbl.valli.org/) - comprehensive multi-list checker
- Run checks weekly, or daily if you are in a recovery period

**Sender Score:**
- [Validity Sender Score](https://senderscore.org/) - free reputation score (0-100) based on sending IP behavior
- Scores above 80 are healthy. Below 70 indicates problems.

**Feedback loops:**
Register for feedback loops (FBLs) with major providers. When a recipient marks your email as spam, the FBL sends you a notification so you can suppress that address immediately. Most ESPs handle this automatically, but verify it is configured.

---

## Blocklists

Blocklists (also called blacklists or DNSBLs) are databases of IPs and domains known to send spam. Mailbox providers and corporate mail servers query these lists in real time when deciding whether to accept a message.

### Major blocklists

| Blocklist | Type | Impact | What gets you listed |
|-----------|------|--------|---------------------|
| Spamhaus SBL | IP | Very high | Sending spam, hosting spam operations |
| Spamhaus DBL | Domain | Very high | Spam domains in URLs, From addresses, or sending infrastructure |
| Spamhaus XBL | IP | High | Compromised/infected machines sending spam |
| Spamhaus PBL | IP | Medium | End-user IP ranges that should not send mail directly |
| Barracuda BRBL | IP | High | High spam volume from the IP |
| Spamcop | IP | Medium | User-reported spam from the IP |
| SORBS | IP | Medium | Various spam and abuse signals |

Spamhaus is the most consequential. A Spamhaus listing will affect delivery to a significant portion of the internet because most large mail servers query Spamhaus.

### How to check if you are listed

Check your sending domain and IPs against major blocklists:

```bash
# Check Spamhaus (replace with your IP)
dig +short 4.3.2.1.zen.spamhaus.org
# Non-empty response means you are listed

# Check Spamhaus DBL (domain)
dig +short example.com.dbl.spamhaus.org

# Check Barracuda
dig +short 4.3.2.1.b.barracudacentral.org
```

Or use a web-based tool like MXToolbox that checks multiple lists at once.

### Delisting process

**Spamhaus:**
1. Go to [Spamhaus Lookup](https://check.spamhaus.org/)
2. Enter your IP or domain
3. Follow the removal instructions specific to the list you are on
4. You must fix the underlying problem first - Spamhaus will not delist if the issue is ongoing
5. SBL listings require manual review and may take days
6. XBL listings can be self-service if you prove the compromise is resolved

**Barracuda:**
1. Go to [Barracuda Central](https://www.barracudacentral.org/lookups)
2. Enter your IP
3. Submit a removal request with your email, phone, and explanation
4. Typically processed within 12 hours
5. Do not submit multiple requests - they will be ignored

**General rules for any blocklist:**
- Stop sending from the listed IP/domain immediately
- Fix the root cause (compromised account, bad list, missing authentication)
- Submit the delisting request only after the problem is resolved
- Monitor to make sure you are not re-listed within 24-48 hours

---

## Reputation recovery

Recovery is harder than prevention. A domain with damaged reputation needs a disciplined, multi-week process to rebuild trust with mailbox providers.

### Assess the damage

Before you fix anything, understand the scope:

1. Check Google Postmaster Tools for spam rate trends
2. Check SNDS for filter results (Red = bad)
3. Check blocklists via MXToolbox
4. Pull your bounce rate and complaint rate from your ESP dashboard
5. Check your authentication - run `dig` for SPF, DKIM, and DMARC records

### Immediate actions

1. **Stop all non-essential sending.** Pause marketing campaigns, sequences, and automated outreach. Keep only transactional email (password resets, receipts, account notifications) flowing.
2. **Clean your list aggressively.** Remove all addresses that have hard-bounced. Remove addresses that have not engaged in 90+ days. Remove any addresses from purchased or scraped sources.
3. **Fix authentication.** Ensure SPF, DKIM, and DMARC are all passing. Check alignment. See the `domain-authentication` skill.
4. **Request blocklist removal** if applicable. Only after fixing the root cause.
5. **Suppress all complainers.** Every address that has ever filed a spam complaint should be permanently suppressed.

### Rebuild phase (2-8 weeks)

1. **Start with your most engaged segment.** Send only to recipients who have opened or clicked in the last 30 days.
2. **Begin at 25% of your normal volume.** Increase by 25% weekly if metrics stay healthy.
3. **Monitor daily.** Watch bounce rate (must stay under 1%), complaint rate (must stay under 0.1%), and engagement rates.
4. **Expand gradually.** After 2 weeks of clean metrics with engaged recipients, begin adding less-engaged segments in small batches.
5. **Do not rush.** Increasing volume before metrics stabilize will extend the recovery period.

### Recovery timeline

| Damage level | Typical recovery time |
|-------------|----------------------|
| Minor (slightly elevated spam rate, no blocklisting) | 2-4 weeks |
| Moderate (spam rate over 0.3%, some filtering) | 4-8 weeks |
| Severe (blocklisted, widespread spam-folder placement) | 8-12+ weeks |
| Domain burned (persistent blocklisting, extensive complaints) | Consider a new subdomain with fresh warmup |

### What not to do

- **Do not switch to a new domain to escape reputation.** Providers track this pattern and it often makes things worse. A brand-new domain with the same sending patterns will get flagged faster than the original.
- **Do not buy a "clean" domain.** Providers can detect newly registered domains sending at volume and treat them with extra suspicion.
- **Do not blast your full list to "re-engage" people.** This generates complaints and bounces from exactly the addresses that damaged your reputation in the first place.
- **Do not ignore the problem.** Reputation does not recover passively. Without active remediation, it tends to get worse as disengaged recipients accumulate and engagement ratios decline.

---

## Protecting reputation proactively

The cheapest reputation management is prevention. These practices keep your reputation healthy so you never need the recovery playbook.

### List hygiene

- Validate email addresses at the point of collection (syntax check, MX record check, ideally a verification API)
- Remove hard bounces immediately and permanently
- Suppress soft bounces after 3-5 consecutive failures
- Remove recipients who have not engaged in 90-180 days (or move them to a re-engagement campaign, then remove if they still do not engage)
- Never purchase, rent, or scrape email lists

### Volume management

- Keep daily sending volume consistent (within 2x of your rolling average)
- Warm new domains and IPs gradually (see `email-warmup` skill)
- Use rate limiting with independent hourly, daily, and monthly windows
- If you need to increase volume, ramp over weeks: increase by no more than 30-50% per week

### Complaint management

- Make unsubscribe easy and obvious - one click, no login required, honored within 2 days
- Include `List-Unsubscribe` and `List-Unsubscribe-Post` headers in all non-transactional email
- Register for feedback loops with major providers
- Automatically suppress any address that generates a complaint
- Monitor complaint rate daily. If it exceeds 0.1%, investigate immediately.

### Engagement hygiene

- Track per-recipient engagement over time
- Score recipients on fatigue: send frequency, bounce history, complaint history, and engagement decay
- Stop sending to recipients with high fatigue scores (70+ out of 100)
- Reduce frequency for moderate fatigue scores (40-70)
- Segment by engagement level and send your best content to less-engaged segments

### Separate your mail streams

Use different subdomains for different types of email:

| Stream | Subdomain example | Why |
|--------|-------------------|-----|
| Transactional | `mail.example.com` | Protects critical email (receipts, auth) from marketing reputation |
| Marketing | `news.example.com` | Isolates marketing risk from transactional delivery |
| Cold outreach | `outreach.example.com` | Highest risk - keep completely separate |

Each subdomain builds its own reputation. A problem with your marketing sends will not drag down your transactional delivery. Each subdomain also gets its own SPF record, solving the 10-lookup limit problem.

---

## Common mistakes

**Ignoring disengaged recipients.** The most common reputation killer is not bounces or complaints - it is continuing to send to people who never open your emails. Engagement ratios decline slowly, inbox placement drops gradually, and by the time you notice, your domain reputation has been degraded for weeks.

**Reacting to blocklisting by switching IPs.** Your domain reputation follows you. A new IP does not fix a domain reputation problem. Fix the root cause first.

**Not monitoring until something breaks.** By the time you notice deliverability problems in your open rates, the reputation damage happened days or weeks ago. Set up Google Postmaster Tools and SNDS before you need them.

**Treating all bounces the same.** Hard bounces (address does not exist) and soft bounces (temporary failure) require different handling. Hard bounces need immediate permanent suppression. Soft bounces need retry logic with escalation to suppression after repeated failures.

**Sending the same volume every day including weekends.** Some senders configure automated sends to run identically every day. Weekend sending patterns that match weekday patterns can look unusual to providers. Match your volume to natural business patterns.

**No separation between transactional and marketing mail.** When marketing sends get filtered, your password reset emails and order confirmations go with them. Use separate subdomains.

**Assuming your ESP handles everything.** Your ESP manages the technical sending infrastructure, but reputation is your domain's reputation. You are responsible for list hygiene, complaint rates, and engagement management. The ESP cannot fix bad sending practices.

**Over-sending to new subscribers.** A new subscriber who gets 5 emails in their first week is more likely to complain than one who gets a welcome email and then joins the normal cadence. Space out early touches.

---

## References

- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - official requirements including complaint rate thresholds
- [Google Postmaster Tools](https://gmail.com/postmaster/) - domain reputation monitoring for Gmail
- [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/) - IP reputation monitoring for Outlook
- [Yahoo Sender Hub](https://senders.yahooinc.com/) - reputation monitoring for Yahoo/AOL
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/) - Yahoo's official sender guidelines
- [Spamhaus](https://www.spamhaus.org/blocklists/) - the most impactful blocklist operator
- [Barracuda Central](https://www.barracudacentral.org/lookups) - blocklist lookup and removal
- [MXToolbox Blacklist Check](https://mxtoolbox.com/blacklists.aspx) - multi-blocklist checker
- [Validity Sender Score](https://senderscore.org/) - free IP-based reputation scoring
- [M3AAWG Sender Best Practices](https://www.m3aawg.org/published-documents) - industry group best practices for email senders
- [Microsoft Outlook Sender Requirements (2025)](https://techcommunity.microsoft.com/blog/outlookblog/strengthening-email-security-outlook-s-new-requirements-for-high-volume-senders/4399730) - Microsoft's bulk sender rules

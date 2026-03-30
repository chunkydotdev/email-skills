---
name: email-warmup
description: Ramp sending volume on new domains and IPs. Use when launching a new sending domain, switching providers, moving to a dedicated IP, or resuming sends after a pause.
license: MIT
---

# Email Warmup

Gradually ramp sending volume on new domains and IPs so mailbox providers trust you before you need to send at scale.

## When to use this skill

- Setting up a new sending domain or subdomain
- Switching to a dedicated IP address
- Moving to a new email service provider (even with an existing domain)
- Resuming sending after a long period of inactivity (30+ days)
- Scaling up from low volume to high volume sending
- Seeing deferrals, throttling, or spam folder placement on a new domain
- An AI agent needs to send email and you haven't established sending history yet

## Related skills

- `domain-authentication` - SPF, DKIM, and DMARC must be in place before you start warming up
- `sender-reputation` - warmup builds initial reputation; this skill covers maintaining and recovering it
- `rate-limiting` - volume controls that protect reputation during and after warmup
- `inbox-placement` - factors beyond warmup that determine inbox vs spam
- `bounce-handling` - processing delivery failures during warmup without compounding damage

---

## Why warmup matters

Mailbox providers (Gmail, Microsoft, Yahoo) track sending behavior per domain and per IP. A domain or IP with no sending history is unknown - not trusted, not distrusted. When an unknown sender suddenly pushes thousands of messages, it looks indistinguishable from a spammer who just registered a fresh domain.

Warmup is the process of sending gradually increasing volumes of email to build a positive reputation before you need full throughput. Skip it and you'll hit deferrals, spam folder placement, or outright blocks that can take weeks to recover from.

## Domain warming vs IP warming

In 2025, **domain reputation is more important than IP reputation** for most senders. Here's why:

**Domain reputation follows you everywhere.** When you switch providers (Postmark to SendGrid, SES to Resend), your domain reputation comes with you. IP reputation resets. Gmail and Microsoft shifted their filtering algorithms toward domain-centric signals starting in 2024, because domain reputation is harder to game - you can't just rotate to a new domain the way spammers rotate IPs.

**IP reputation still matters, but less often.** If you're on a shared IP pool (which most senders under 50,000 emails/month are), IP warming isn't your problem - the provider manages it. You only need to worry about IP warming when you move to a **dedicated IP**, which is typically only worth doing above 50,000-100,000 emails per month.

**Every new combination needs warming.** A warm domain on a new IP still needs IP warming. A warm IP with a new domain still needs domain warming. Changing both at once (new provider + new domain) is the hardest scenario.

| Scenario | What needs warming | Difficulty |
|----------|-------------------|------------|
| New domain, shared IP | Domain only | Moderate |
| Existing domain, new dedicated IP | IP only | Moderate |
| New domain, new dedicated IP | Both | Hard - warm sequentially |
| Existing domain, new provider (shared IP) | Domain re-establishment | Easy-moderate |
| Resuming after inactivity | Domain re-warming | Easy-moderate |

---

## The warmup schedule

The core principle: start low, increase gradually, never more than 2x the previous day's volume in a single jump. The exact numbers depend on your target volume.

### For marketing/bulk email (targeting 50,000+/month)

This schedule assumes a new dedicated IP and new or low-reputation domain. If you're on a shared IP, you can be slightly more aggressive because the IP already has history.

| Day | Daily volume | Cumulative |
|-----|-------------|------------|
| 1 | 50 | 50 |
| 2 | 100 | 150 |
| 3 | 200 | 350 |
| 4 | 400 | 750 |
| 5 | 600 | 1,350 |
| 6 | 1,000 | 2,350 |
| 7 | 1,500 | 3,850 |
| 8 | 2,000 | 5,850 |
| 9 | 3,000 | 8,850 |
| 10 | 4,000 | 12,850 |
| 11 | 6,000 | 18,850 |
| 12 | 8,000 | 26,850 |
| 13 | 10,000 | 36,850 |
| 14 | 15,000 | 51,850 |
| 15-21 | 20,000-30,000 | - |
| 22-28 | 30,000-50,000 | - |
| 29+ | Full volume | - |

**Key rules:**
- Never increase by more than 2x from one day to the next
- If you see bounce rates above 3% or spam complaints above 0.1%, cut volume in half and hold for 2-3 days
- If you see deferrals (4xx responses), slow down - don't retry aggressively
- Send to your most engaged recipients first (recent openers, recent purchasers)
- Maintain consistent daily sending - don't skip days, especially in weeks 1-2

### For cold outreach (per mailbox)

Cold outreach warmup is per-mailbox, not per-domain, because individual mailbox reputation matters for 1:1 sending.

| Week | Warmup emails/day | Cold emails/day | Total |
|------|-------------------|-----------------|-------|
| 1 | 3-5 | 0 | 3-5 |
| 2 | 5-10 | 5 | 10-15 |
| 3 | 15-25 | 10-15 | 25-40 |
| 4 | 25-40 | 20-30 | 45-70 |
| 5+ | 30-40 | 30-50 | 60-90 |

Warmup emails here means messages to real contacts who will open and reply (colleagues, partners, newsletter signups). The goal is to generate engagement signals that establish the mailbox as a legitimate sender before you start cold outreach.

**Cap cold outreach at 50 emails per mailbox per day.** Going higher on a single mailbox dramatically increases the chance of triggering spam filters, regardless of how well you warmed up.

### For transactional email

Transactional email (password resets, order confirmations, verification codes) gets more leeway from mailbox providers because recipients expect it. You don't need a strict day-by-day ramp, but you do need to be careful if volume is spiky.

- If you're launching a new product and expect a sudden flood of signups, have your transactional email infrastructure ready on a domain that already has some sending history
- If you must use a brand-new domain for transactional mail, send a few hundred test messages over the first week before going live
- Separate transactional and marketing email on different subdomains (e.g., `mail.example.com` for transactional, `news.example.com` for marketing) so marketing reputation problems don't block your password reset emails

---

## Who to send to first

The recipients you choose during warmup matter as much as the volume. Mailbox providers weight engagement signals (opens, clicks, replies) heavily when evaluating a new sender.

**Best warmup recipients (in order):**

1. **People who replied to you recently** - replies are the strongest positive signal
2. **People who opened or clicked in the last 30 days** - recent engagement proves interest
3. **People who opened or clicked in the last 90 days** - still good, slightly weaker signal
4. **New opt-ins** - they just signed up, so they expect to hear from you
5. **Everyone else** - save inactive and old contacts for after warmup is complete

**Never use during warmup:**

- Purchased or scraped lists - high bounce rates will destroy your reputation before it's established
- Contacts who haven't engaged in 6+ months - they're likely to ignore or report you
- Role-based addresses (info@, sales@, support@) - lower engagement, higher complaint rates

---

## Provider-specific warmup features

### Amazon SES

SES has **automatic IP warmup** built in for dedicated IPs. When you provision dedicated IPs (standard), SES splits your traffic between dedicated and shared IPs, gradually increasing the dedicated IP percentage over **45 days**. You don't need to manually control volume - SES handles the ramp.

For **managed dedicated IPs**, SES uses an adaptive strategy that warms per-ISP independently. If all your traffic goes to Gmail, SES considers the IP warm for Gmail but still cold for Microsoft. This is more sophisticated than time-based warming.

**Domain warmup on SES is still your responsibility.** SES automatic warmup only handles IP reputation. If you're using a new domain, you still need to ramp volume gradually.

### SendGrid

SendGrid offers automated IP warmup that follows a predefined schedule when you enable it on a new dedicated IP. It starts at 50 emails/day and increases over 30-41 days. Excess volume is routed through shared IPs during warmup.

You can also manually control the warmup percentage if the automatic schedule doesn't fit your needs.

### Postmark

Postmark uses shared IP pools and focuses on domain reputation. There's no IP warmup to manage. If you're switching to Postmark with an existing domain, they recommend starting with your most engaged recipients and ramping up over 2-4 weeks. Postmark's account approval process itself acts as a gatekeeping step - they review your use case before you can send.

### Resend

Resend uses shared infrastructure. No IP warmup needed. Focus on domain warmup - start with low volumes and ramp up. Their onboarding guides recommend beginning with transactional email (which has natural, organic volume growth) before adding marketing sends.

---

## Dedicated IP vs shared IP

**Use shared IPs if:**

- You send fewer than 50,000 emails per month
- You don't want to manage warmup yourself
- You're a startup or early-stage product with growing but inconsistent volume
- You send transactional email with variable volume patterns

**Use dedicated IPs if:**

- You send more than 100,000 emails per month consistently
- You need full control over your sender reputation
- You want to isolate your reputation from other senders
- You're sending high-volume marketing campaigns

**The in-between (50,000-100,000/month):** Most providers recommend staying on shared IPs at this volume. Dedicated IPs need consistent volume to maintain reputation - if your sending is spiky (big campaigns some weeks, nothing other weeks), a dedicated IP will actually hurt you because the IP goes "cold" during low-volume periods.

**Separate IPs for separate streams.** If you use dedicated IPs and send both transactional and marketing email, use at least two IPs - one for each stream. A bad marketing campaign shouldn't block your password reset emails.

---

## Signs warmup is going wrong

Monitor these signals daily during warmup. If any of them trigger, reduce volume immediately.

### Deferrals (4xx SMTP responses)

The receiving server is telling you to slow down. Common messages:

- `421 Too many connections from your IP`
- `450 Requested mail action not taken: mailbox unavailable`
- `421 Try again later`

**What to do:** Reduce hourly sending rate. Add delays between messages. Do not retry aggressively - that makes it worse. Most deferrals resolve within 1-4 hours if you back off.

### Rising bounce rate

- **Under 2%:** Normal. Keep going.
- **2-3%:** Warning. Clean your list before sending more. Check if a specific domain is bouncing.
- **Above 3%:** Stop warmup. You have a list quality problem, not a warmup problem. Remove invalid addresses before continuing.

### Spam complaint rate

- **Under 0.1%:** Good. Google recommends staying below this threshold.
- **0.1-0.3%:** Concerning. Review your content and targeting. Are you emailing people who didn't opt in?
- **Above 0.3%:** Stop warmup. Google will begin blocking your domain. This is a content or consent problem.

### Declining open rates

If open rates drop below 15-20% during warmup, you're either sending to unengaged recipients (fix your targeting) or your messages are landing in spam (check placement with seed testing).

### Google Postmaster Tools signals

Set up Google Postmaster Tools before you start warmup. It shows:

- **Domain reputation:** High, Medium, Low, Bad. You want to stay at Medium or above during warmup, trending toward High.
- **IP reputation:** Same scale. Only relevant if you're on a dedicated IP.
- **Spam rate:** Percentage of your mail marked as spam by Gmail users. Must stay below 0.1%.
- **Authentication:** Confirms SPF, DKIM, DMARC are passing. Should be 100% - if not, fix authentication before continuing warmup.

**Note:** Postmaster Tools data only appears after you're sending meaningful volume to Gmail (typically 100+ messages/day). You won't see data during the first few days of warmup.

---

## Warmup for AI agents

AI agents introduce specific risks during warmup because they don't have the natural speed governors that human senders have. A loop that goes wrong, a retry bug, or a batch operation that triggers unexpectedly can spike volume and destroy a warming domain's reputation in minutes.

**Critical safeguards for agent warmup:**

1. **Enforce rate limits at the infrastructure layer, not in agent code.** Application-level rate limiting breaks under bugs - which is exactly when you need it most. Use a policy engine or provider-level limits that the agent cannot bypass.

2. **Set hourly limits, not just daily limits.** An agent that sends its entire daily allocation in 10 minutes looks like a spam blast to mailbox providers, even if the total volume is within your warmup target.

3. **Use per-recipient cooldowns.** An agent stuck in a retry loop can hammer the same recipient repeatedly. A cooldown window (e.g., 10 minutes per template per recipient) prevents this.

4. **Monitor negative signal ratios, not just absolute counts.** A risk budget that tracks bounces and complaints relative to send volume catches list quality problems early - before they compound into reputation damage.

5. **Start agents on a domain with established reputation.** Don't point a new AI agent at a brand-new domain. Warm the domain first with controlled, human-reviewed sends, then let the agent take over once reputation is established.

Services like [molted.email](https://molted.email) provide infrastructure-level policy enforcement (rate limits, cooldowns, negative signal budgets, auto-pause) specifically designed for AI agent email sending, catching over-send scenarios before they damage your reputation.

---

## After warmup

Warmup builds initial reputation. Keeping it requires ongoing discipline.

- **Maintain consistent volume.** Don't send 50,000 emails one week and zero the next. Mailbox providers notice volume drops and treat the next spike with suspicion.
- **Clean your list regularly.** Remove hard bounces immediately. Suppress soft bounces after 3-5 consecutive failures. Remove contacts who haven't engaged in 6+ months.
- **Watch your metrics.** Check Google Postmaster Tools weekly. Set up alerts for bounce rate spikes and complaint rate increases.
- **Don't undo your work.** Sending to a purchased list, ignoring unsubscribe requests, or changing your From domain without re-warming are the most common ways people destroy established reputation.

---

## Common mistakes

1. **Skipping warmup entirely.** "We only send 500 emails a day, we don't need warmup." You do. Even low volumes on a brand-new domain with no sending history get filtered. Send 50/day for a week first.

2. **Warming up without authentication.** SPF, DKIM, and DMARC must be in place and passing before you send your first warmup email. Warming up without authentication is like trying to build credit with a fake ID.

3. **Sending to your full list from day one.** The most common mistake. People warm up for a week, then dump their entire 100,000-person list into a campaign. The sudden volume spike erases whatever reputation you built.

4. **Ignoring deferrals and retrying aggressively.** A 4xx response means "slow down." Retrying immediately or increasing retry frequency makes the problem worse. Back off and reduce volume.

5. **Using purchased lists during warmup.** Purchased lists have high bounce rates and low engagement. During warmup, when you have no reputation cushion, this is fatal. Use only opted-in contacts with recent engagement.

6. **Warming the IP but not the domain (or vice versa).** Both need warming independently. A new domain on a warm IP still needs domain warmup. Don't assume one covers the other.

7. **Inconsistent sending during warmup.** Sending 500 on Monday, 0 on Tuesday-Thursday, then 2,000 on Friday confuses mailbox providers. Send every day during warmup, at consistent volumes.

8. **Not separating mail streams.** Marketing and transactional email should be on different subdomains. If you warm up everything on one domain and then a marketing campaign generates complaints, your transactional delivery suffers too.

9. **Stopping warmup emails when cold outreach starts.** The warmup emails (to engaged contacts who open and reply) should continue alongside cold sends. They maintain the engagement signals that keep your reputation healthy.

10. **Thinking warmup is a one-time event.** If you stop sending for 30+ days, you need to re-warm. If you switch providers, you may need to re-establish domain reputation. Reputation decays without consistent positive signals.

---

## References

- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - authentication requirements and spam rate thresholds
- [Google Postmaster Tools](https://postmaster.google.com/) - monitor domain and IP reputation for Gmail
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/) - Yahoo's sender requirements
- [Microsoft Outlook Sender Requirements](https://techcommunity.microsoft.com/blog/outlookblog/strengthening-email-security-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730) - Microsoft's 2025 bulk sender rules
- [AWS SES IP Warming Guide](https://docs.aws.amazon.com/ses/latest/dg/dedicated-ip-warming.html) - SES automatic warmup documentation
- [AWS SES Domain and IP Warming Blog](https://aws.amazon.com/blogs/messaging-and-targeting/guide-to-ip-and-domain-warming-and-migrating-to-amazon-ses/) - comprehensive SES migration warmup guide
- [SendGrid IP Warmup Documentation](https://www.twilio.com/docs/sendgrid/ui/sending-email/warming-up-an-ip-address) - SendGrid's warmup schedule and automation
- [Braze IP Warming Guide](https://www.braze.com/docs/user_guide/message_building_by_channel/email/email_setup/ip_warming) - day-by-day IP warming schedule
- [Customer.io Domain Warming Guide](https://docs.customer.io/journeys/domain-warming/) - practical domain warmup process
- [M3AAWG Best Practices](https://www.m3aawg.org/published-documents) - industry standards for messaging
- [SparkPost IP Warm-up Overview](https://support.sparkpost.com/docs/deliverability/ip-warm-up-overview) - warmup strategy and monitoring

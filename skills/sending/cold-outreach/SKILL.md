# Cold Outreach

Send B2B cold email that gets replies without getting your domain blacklisted.

## When to use this skill

- Starting cold outbound for the first time
- Scaling cold email volume beyond a single mailbox
- Emails are landing in spam or getting blocked
- Setting up infrastructure for an outbound sales team or AI agent
- Building a follow-up sequence for cold prospects
- Evaluating whether your cold email program is compliant with CAN-SPAM, GDPR, or CASL
- Recovering from a blacklisting or reputation hit caused by cold outreach

## Related skills

- `domain-authentication` - SPF, DKIM, DMARC setup (required before sending anything)
- `email-warmup` - ramping volume on new domains and mailboxes
- `sender-reputation` - monitoring and recovering reputation
- `email-compliance` - full legal compliance guide (CAN-SPAM, GDPR, CASL)
- `suppression-lists` - managing bounces, complaints, and opt-outs
- `email-sequences` - drip campaigns and automated follow-up sequences
- `reply-classification` - categorizing prospect replies (interested, OOO, objection)

---

## Infrastructure setup

Get infrastructure right before you write a single email. Most cold email failures are infrastructure failures, not copy failures.

### Never use your primary domain

This is the cardinal rule of cold outreach. Your primary domain (`yourcompany.com`) handles transactional email, employee communication, and customer support. One bad cold campaign can damage all of that.

Register a separate domain for outbound:

| Primary domain | Outbound domain(s) |
|---------------|-------------------|
| `acme.com` | `acme-mail.com`, `tryacme.com`, `getacme.com` |

Rules for outbound domains:
- Register a domain that clearly relates to your brand (not random strings)
- Set up a basic landing page so the domain doesn't look abandoned
- Configure full authentication: SPF, DKIM, DMARC (see `domain-authentication` skill)
- Use Google Workspace or Microsoft 365 - not custom SMTP - for better baseline reputation
- Register the domain at least 2 weeks before you start warming up

### Mailbox setup

Create individual mailboxes that look like real people, not robots:

**Good:** `alex@tryacme.com`, `sarah.chen@acme-mail.com`
**Bad:** `sales@tryacme.com`, `outbound1@acme-mail.com`, `noreply@tryacme.com`

Each mailbox should:
- Have a real name in the display name
- Have a profile photo set in the email provider
- Be capable of receiving replies (never use no-reply addresses)
- Have its own signature with name, title, and company

### Scaling with multiple domains

If you need to send more than 50-100 cold emails per day, use multiple domains with multiple mailboxes each:

```
tryacme.com
  - alex@tryacme.com      (50/day)
  - jordan@tryacme.com    (50/day)

getacme.com
  - sarah@getacme.com     (50/day)
  - mike@getacme.com      (50/day)
```

This gives you 200 emails/day spread across 4 mailboxes on 2 domains. No single domain or mailbox takes too much load.

For serious scale (500+ emails/day), teams typically run 3-5 domains with 2-3 mailboxes each. Rotate which domains send on which days to further distribute reputation risk.

---

## Volume limits

Sending too fast is the fastest way to destroy a domain. These limits are based on what actually works in practice, not provider maximums.

### Per-mailbox limits

| Mailbox age | Daily limit | Hourly limit |
|-------------|------------|--------------|
| Week 1-2 (warmup) | 5-10 | 3-5 |
| Week 3-4 | 15-25 | 8-10 |
| Week 5-6 | 30-40 | 12-15 |
| Week 7+ (steady state) | 40-50 | 15-20 |

These are cold emails specifically. Replies, internal emails, and warmup emails don't count against these limits but they do contribute positively to your sending profile.

### Per-domain limits

Even with multiple mailboxes, cap total cold volume per domain:
- **New domain (< 3 months):** 100 emails/day across all mailboxes
- **Established domain (3-6 months):** 150-200 emails/day
- **Mature domain (6+ months, clean reputation):** 200-300 emails/day

### Weekly limits matter too

Don't just think in daily limits. An agent or automation that maxes out daily sends 7 days a week looks suspicious. Human sales teams don't work weekends. Send Monday through Friday, with most volume Tuesday through Thursday.

Multi-window rate limiting prevents agents from gaming daily limits:

```
rateLimits:
  hourly: 25
  daily: 150
  weekly: 750
```

The weekly cap of 750 (not 150 x 7 = 1050) forces spreading and prevents weekend sends.

### Threshold metrics

Monitor these and stop sending if you cross them:

| Metric | Safe | Warning | Stop immediately |
|--------|------|---------|-----------------|
| Bounce rate | < 2% | 2-5% | > 5% |
| Spam complaint rate | < 0.1% | 0.1-0.3% | > 0.3% |
| Reply rate | > 2% | 1-2% | < 1% (your targeting is off) |

Google requires spam complaint rates below 0.1% for bulk senders. Microsoft adopted similar requirements in May 2025. Exceeding these thresholds, even briefly, can result in temporary or permanent sending blocks.

---

## Legal requirements

Cold email is legal in most jurisdictions, but each has specific rules. Getting this wrong means fines up to $51,744 per email (CAN-SPAM) or 4% of global revenue (GDPR).

### CAN-SPAM (United States)

CAN-SPAM uses an **opt-out** model. You can send unsolicited commercial email as long as you:

1. **Identify yourself.** Real sender name, real company.
2. **Use truthful subject lines.** No deception about the content.
3. **Include your physical mailing address.** A PO box counts.
4. **Include a working unsubscribe mechanism.** One-click preferred, must work for at least 30 days after sending.
5. **Honor opt-outs within 10 business days.** In practice, do it instantly.
6. **Label adult content.** If applicable.

CAN-SPAM does NOT require prior consent. This is what makes cold email legal in the US.

### GDPR (European Union / EEA)

GDPR uses an **opt-in** model, but B2B cold email is possible under the "legitimate interest" legal basis (Article 6(1)(f)):

- You must have a genuine business reason to contact them
- You must use minimal personal data (just business email and name)
- You must provide an easy opt-out in every message
- You must document your legitimate interest assessment
- The recipient's interests must not override yours

In practice, this means you can email a VP of Engineering at their work address about a relevant developer tool, but you cannot email their personal Gmail about the same thing.

**Country-level rules vary.** Germany is stricter (often requires consent even for B2B). The UK (post-Brexit, under UK GDPR + PECR) allows B2B cold email to corporate addresses under similar legitimate interest rules.

### CASL (Canada)

CASL is the strictest major framework. It requires **express or implied consent** before sending:

- **Express consent:** They explicitly agreed to receive emails from you.
- **Implied consent:** Exists for 2 years after a purchase, 6 months after an inquiry, or if they published their email in a context that implies they'd welcome your type of message (e.g., a business directory listing).

Without consent, don't email Canadian addresses. Fines reach $10 million per violation.

### Every jurisdiction

Regardless of location, every cold email must include:
- Clear sender identification (who you are and what company)
- Working unsubscribe link that processes within 10 business days
- Physical mailing address
- No deceptive subject lines or sender names

---

## Writing cold emails that work

The difference between cold email that generates pipeline and cold email that generates spam complaints is specificity.

### Subject lines

Keep subject lines short (4-7 words), specific, and honest:

**Good:**
- `Quick question about [specific thing]`
- `[Mutual connection] suggested I reach out`
- `Saw your talk at [conference]`
- `[Their company] + [your company]`

**Bad:**
- `RE: Our conversation` (deceptive - you never talked)
- `URGENT: Don't miss this opportunity`
- `I have a gift for you`
- `[First name], you won't believe this`

Emails with 36-50 character subject lines get the highest response rates. All-caps words, excessive punctuation, and fake reply threads (`RE:` / `FW:`) trigger spam filters and violate CAN-SPAM's truthful subject line requirement.

### Body copy

Keep it under 100 words. Three components:

1. **Personalized hook** (1-2 sentences). Reference something specific - a LinkedIn post, a job listing, a company announcement, a technology choice. This proves you did research.
2. **Value statement** (1-2 sentences). What you can do for them, framed as their problem, not your features.
3. **Low-friction CTA** (1 sentence). Ask for a reply, not a 30-minute meeting. "Worth a quick chat?" not "Book a 30-minute demo."

```
Hi Sarah,

I saw your post about expanding into EMEA - congrats on the growth.
We help mid-market SaaS companies like [similar company] handle GDPR
compliance for their email infrastructure. Saved them about 40 hours/month
on data subject requests.

Worth a quick conversation?

Alex
```

### Personalization that works vs. personalization theater

**Works:** Referencing something that shows you understand their situation - a specific challenge their company faces, a recent milestone, or a technology choice visible on their website.

**Theater:** `"Hi {{first_name}}, I noticed {{company}} is in the {{industry}} space."` This is merge-field personalization that every recipient recognizes as automated. It's worse than no personalization because it signals you're mass-emailing while pretending not to.

The test: would this sentence make sense sent to a different person at a different company? If yes, it's not personalized.

### What triggers spam filters

Content patterns that increase your spam score:
- Spam trigger phrases: "act now," "limited time," "100% free," "risk-free," "buy now"
- Excessive capitalization (more than 50% uppercase letters)
- More than 2-3 links in a cold email (1 is ideal)
- HTML-heavy emails with images and formatting (plain text performs better for cold)
- Tracking pixels from cold email tools (many providers flag these)
- URL shorteners (bit.ly, etc.) - they're associated with phishing

---

## Follow-up sequences

Most replies come from follow-ups, not the initial email. But there's a right way and a wrong way.

### Sequence structure

A proven cold outreach sequence uses 3-5 emails with widening gaps:

| Email | Timing | Purpose |
|-------|--------|---------|
| Email 1 | Day 0 | Initial outreach - personalized hook + value prop |
| Email 2 | Day 3 | Follow-up - add a new angle or piece of evidence |
| Email 3 | Day 7 | Different value prop or case study |
| Email 4 | Day 14 | Brief check-in, reference previous emails |
| Email 5 | Day 28 | Breakup email - "closing the loop" |

The widening gaps matter. Day 1, Day 2, Day 3, Day 4 looks like harassment. The increasing intervals mimic natural human follow-up behavior and reduce "velocity load" on your domain reputation.

### Follow-up rules

1. **Each email must add something new.** Don't just say "checking in" or "bumping this to the top of your inbox." Add a new case study, a relevant insight, or a different angle on the value prop.
2. **Stop after the breakup email.** If 5 touches get no response, the prospect isn't interested. Continuing damages your reputation and wastes your time.
3. **Thread or don't thread.** Threading follow-ups (replying to your own email) increases open rates because the subject line is familiar. But some cold email practitioners prefer standalone emails so each one looks fresh. Test both.
4. **Monitor for disengagement.** If someone opens every email but never replies after 3+ touches, treat them as passively disinterested. Continuing to email them is how you get spam complaints.

### Engagement-based suppression

Don't just rely on explicit unsubscribes. Track engagement patterns:

- 3 emails with no opens or replies - reduce frequency or pause
- 4+ emails with opens but no replies - they're reading but not interested, send the breakup email
- Any spam complaint - immediately suppress, never email again

Production systems implement this as fatigue scoring. Each contact gets a score based on send frequency, bounces, complaints, replies, and time since last engagement. When the score crosses a threshold, sending stops automatically:

- Score >= 70: stop sending immediately
- Score 40-70: reduce frequency
- Score < 40: safe to continue

Key factors that increase fatigue:
- More than 3 sends per week to the same contact: +20 points
- Each bounce: +10 points
- Each complaint: +15 points
- No engagement after 30+ days: +10 points
- Multiple sends with zero engagement ever: +10 points

---

## Suppression and list hygiene

Your suppression list is your reputation's immune system. A weak one will kill your outreach program.

### Sources of suppression

Maintain a unified suppression list that includes:

1. **Explicit unsubscribes.** Anyone who clicked unsubscribe or replied asking to be removed.
2. **Hard bounces.** Invalid email addresses. Remove after the first hard bounce.
3. **Spam complaints.** Anyone who marked your email as spam. Never contact again.
4. **Soft bounce repeats.** Addresses that soft-bounce 3+ times across different sends.
5. **Disengaged contacts.** 4+ outreach attempts with no engagement.
6. **Role-based addresses.** `info@`, `support@`, `sales@` - these go to shared inboxes and generate high complaint rates.
7. **Competitor/partner domains.** Don't cold email your competitors or existing partners.

### Deduplication

If you're running multiple campaigns or have multiple SDRs, deduplication prevents the same prospect from getting hit by different sequences simultaneously:

- Dedupe by email address across all active campaigns
- Use a logical dedupe key (e.g., `outbound-sarah-q1-2026`) to prevent retries of the same logical outreach
- Set a cooldown period (e.g., 90 days) before a suppressed contact can be re-entered into a new campaign

### List verification

Before loading a new prospect list, verify every address:

- Run the list through an email verification service (ZeroBounce, NeverBounce, Clearout)
- Remove catch-all domains unless you have high confidence in the specific address
- Remove any address older than 6 months without re-verification
- Target a verified rate above 95% before sending

Purchased lists are almost never worth it. They contain spam traps (addresses maintained by blocklist operators specifically to catch bulk senders), outdated addresses, and contacts who never consented. One spam trap hit can get your domain blacklisted instantly.

---

## AI agent considerations

AI agents are increasingly used for cold outreach. They're great at research and personalization but dangerous without guardrails.

### What goes wrong

Common failure modes when agents handle cold email:

- **Retry loops.** Agent hits a rate limit, retries the same email 47 times.
- **Misinterpreting signals.** Agent classifies a hard bounce as a temporary issue and keeps sending.
- **Over-sending.** Agent composes and queues an entire day's volume in 60 seconds, creating suspicious sending patterns.
- **Unauthorized content.** Agent promises discounts, shares roadmap details, or makes compliance claims nobody approved.
- **Ignoring suppression.** Agent doesn't check cross-campaign suppression lists or consent status.

### Guardrails for agents

If you're building or configuring an AI agent for outbound:

1. **Enforce rate limits at the infrastructure level.** Don't rely on the agent to pace itself. Use multi-window rate limits (hourly, daily, weekly) that the agent cannot bypass.
2. **Check suppression before every send.** The agent should query a central suppression API, not maintain its own list.
3. **Classify intent on replies.** When a prospect replies, classify the intent (interested, objection, not now, out of office) before the agent takes action. Objections and "not interested" replies should automatically suppress.
4. **Require human approval for edge cases.** Safety-flagged content, sensitive intents (legal, security), and contacts with high fatigue scores should route to a human.
5. **Log every decision.** Every send attempt should produce an audit trail showing which policy checks passed or failed.

Tools like [molted.email](https://molted.email) provide agent-native mailboxes with built-in policy enforcement - rate limits, suppression checking, content analysis, and decision traces happen automatically on every send request, so the agent gets a simple API while the infrastructure handles compliance.

---

## Cold email tools

The cold email tooling landscape in 2025:

| Tool | Best for | Notes |
|------|----------|-------|
| Instantly | High-volume cold email with inbox rotation | Popular for managing multiple sending accounts |
| Smartlead | Multi-channel sequences (email + LinkedIn) | Good warmup features |
| Apollo | Prospecting + sequencing in one platform | Built-in prospect database |
| Lemlist | Personalization-heavy campaigns | Strong template and image personalization |
| Saleshandy | Budget-friendly cold email at scale | Unlimited email accounts on higher plans |
| Woodpecker | Agency and team use cases | Good for managing multiple client campaigns |

These tools handle sending mechanics. They don't replace the need for proper infrastructure (separate domains, authentication, warmup) or good list hygiene.

---

## Common mistakes

1. **Using your primary domain for cold email.** One spam complaint wave and your CEO's emails start landing in spam. Always use a separate domain.

2. **Skipping warmup.** Sending 200 cold emails on day one from a new domain is how you get blacklisted before your campaign even starts. Warm up for 2-4 weeks minimum.

3. **Sending the same template to thousands of people.** Even with merge fields, identical email bodies are a spam signal. Vary your templates, create multiple variants, and segment your lists.

4. **Not verifying your list.** A 5% bounce rate on your first campaign will tank your domain reputation. Verify before you send.

5. **Ignoring disengagement signals.** Just because someone didn't unsubscribe doesn't mean they want more emails. 4+ sends with no response is a clear signal to stop.

6. **Following up too aggressively.** Emailing every day or every other day looks like spam to both recipients and email providers. Use widening gaps (3, 7, 14, 28 days).

7. **Using deceptive subject lines.** `RE: Our meeting` when you never met. `FW: Important document` when there's no document. This violates CAN-SPAM and annoys people. It might boost open rates short-term but destroys reply rates and trust.

8. **No unsubscribe mechanism.** Required by law in every major jurisdiction. A simple "Reply STOP to opt out" at minimum, though a one-click unsubscribe link is better.

9. **Treating cold email like marketing email.** Cold email should look and feel like a personal message from one human to another. HTML templates with headers, images, and footers scream "mass email." Plain text wins.

10. **Not monitoring blacklists.** Check your sending domains against major blocklists (Spamhaus, Barracuda, SORBS) weekly. By the time you notice deliverability dropping, you may have been listed for days.

---

## References

- [CAN-SPAM Act](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) - FTC compliance guide
- [GDPR Article 6(1)(f)](https://gdpr-info.eu/art-6-gdpr/) - Legitimate interest legal basis
- [CASL Requirements](https://crtc.gc.ca/eng/internet/anti.htm) - Canadian Anti-Spam Legislation
- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - bulk sender requirements
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/)
- [Microsoft Outlook Sender Requirements](https://techcommunity.microsoft.com/blog/outlookblog/strengthening-email-security-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730)
- [M3AAWG Sending Best Practices](https://www.m3aawg.org/published-documents) - industry group best practices
- [Spamhaus Blocklist](https://www.spamhaus.org/) - check if your domain/IP is listed
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-Click Unsubscribe for email

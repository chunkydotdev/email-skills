---
name: inbox-placement
description: Understand what determines inbox vs spam placement. Use when emails land in spam, investigating Gmail Promotions tab, diagnosing deliverability issues, or optimizing engagement signals.
license: MIT
---

# Inbox Placement

Understand the factors that determine whether your email lands in the inbox, spam folder, or a secondary tab - and how to control them.

## When to use this skill

- Emails are landing in spam despite passing SPF/DKIM/DMARC
- Open rates have dropped and you suspect filtering issues
- You need to understand why Gmail is sending you to Promotions instead of Primary
- You're launching email on a new domain and want to maximize inbox placement from the start
- You want to audit your sending program for content or engagement issues
- You need to set up inbox placement testing with seed lists
- Emails reach Gmail but get filtered at Microsoft (or vice versa)

## Related skills

- `domain-authentication` - SPF, DKIM, DMARC setup (a prerequisite for inbox placement)
- `sender-reputation` - building and monitoring the reputation signals that drive placement
- `email-warmup` - ramping volume on new domains/IPs to establish reputation
- `spam-filter-avoidance` - deep dive on content patterns that trigger filters
- `bounce-handling` - managing bounces that degrade your placement over time
- `suppression-lists` - keeping your list clean to protect engagement metrics

---

## How inbox placement actually works

Inbox placement is the outcome of a scoring system. Every major mailbox provider runs incoming email through a multi-signal classifier that produces a disposition: inbox, spam, or a category tab (Gmail Promotions, Outlook Other). The classifier weighs several signal categories, and their relative importance has shifted significantly since 2023.

### The signal hierarchy (2025)

Here is the rough weighting that major providers apply, from most to least influential:

| Signal | Weight | What it means |
|--------|--------|---------------|
| Sender reputation | ~40% | Domain and IP history, complaint rates, bounce rates |
| Engagement signals | ~25% | Opens, clicks, replies, deletes, moves-to-spam per recipient |
| Authentication | ~15% | SPF/DKIM/DMARC pass/fail, alignment |
| Content analysis | ~10% | Spam phrases, formatting, link patterns, HTML quality |
| Infrastructure | ~10% | IP age, domain age, DNS configuration, TLS |

These percentages are approximate - providers don't publish exact weights, and they vary by provider. But the ranking is consistent: reputation and engagement matter far more than content tricks. A sender with excellent reputation can use the word "free" in a subject line without consequences. A sender with poor reputation will land in spam even with perfect content.

This is the single most important thing to understand about inbox placement: **you cannot content-hack your way into the inbox if your reputation or engagement signals are bad.**

---

## Authentication: the baseline requirement

Authentication is table stakes, not a differentiator. Without it, you're filtered or rejected before any other signal is evaluated.

### What providers enforce (2025)

| Requirement | Gmail | Microsoft | Yahoo |
|------------|-------|-----------|-------|
| SPF pass + alignment | Required for bulk | Required for bulk (May 2025) | Required for bulk |
| DKIM pass + alignment | Required for bulk | Required for bulk (May 2025) | Required for bulk |
| DMARC (p=none minimum) | Required for bulk | Required for bulk (May 2025) | Required for bulk |
| TLS for SMTP | Required | Required | Required |
| Valid PTR records | Required | Recommended | Required |

"Bulk" means 5,000+ messages per day to that provider's users.

### Authentication failure effects

- **SPF fail alone**: message may still pass DMARC if DKIM passes and aligns. Minor negative signal.
- **DKIM fail alone**: same as above, but DKIM failures are weighted more heavily because they suggest message tampering.
- **DMARC fail**: depends on your published policy. With `p=reject`, the message is bounced. With `p=quarantine`, it goes to spam. With `p=none`, it's delivered but with a negative signal attached.
- **No authentication at all**: nearly guaranteed spam placement at Gmail and Yahoo. Microsoft is slightly more lenient but moving toward the same stance.

Since November 2025, Gmail has moved beyond soft filtering for non-compliant bulk senders - emails may be rejected at the SMTP level with 4xx/5xx errors rather than silently filtered.

See the `domain-authentication` skill for full setup details.

---

## Engagement signals: what providers actually measure

Engagement is the signal category that has grown most in influence. Providers track per-recipient and per-sender engagement patterns over time, and these directly affect future placement.

### Positive signals (help placement)

| Signal | Weight | Notes |
|--------|--------|-------|
| Replies | Very high | Strongest positive signal. A reply tells the provider this is a wanted conversation. |
| Moves from spam to inbox | Very high | Explicit user correction - tells the provider they got it wrong. |
| Opens | Medium | Tracked via pixel, but less reliable due to Apple Mail Privacy Protection and image blocking. |
| Clicks | Medium | Indicates content relevance. But excessive link tracking can itself trigger filters. |
| Adding sender to contacts | High | Strong trust signal, especially at Gmail. |
| Starring or flagging | Medium | Indicates importance to the recipient. |

### Negative signals (hurt placement)

| Signal | Weight | Notes |
|--------|--------|-------|
| Mark as spam | Very high | The single most damaging action. Google requires complaint rates below 0.1% for healthy delivery, and starts filtering at 0.3%. |
| Delete without opening | Medium | Repeated pattern indicates unwanted email. |
| Ignore (no interaction) | Low-medium | Accumulates over time. If a recipient ignores 10 consecutive emails, future sends are increasingly likely to be filtered. |
| Unsubscribe via header | Low | Better than a spam complaint. Providers view List-Unsubscribe usage as a positive infrastructure signal even though the recipient is leaving. |

### The engagement decay problem

Even if a recipient never complains, persistent non-engagement degrades your placement over time. Here is how it works in practice:

1. You send 10 emails over 2 months. The recipient opens none.
2. The provider starts routing your emails to a less prominent position (Promotions tab, Other inbox).
3. Because the emails are now less visible, the recipient is even less likely to engage.
4. After continued non-engagement, future emails start going to spam.

This is a death spiral. The fix is to stop sending to disengaged recipients before the provider starts penalizing you. A fatigue scoring system helps - tracking sends, opens, and time since last engagement per recipient, and suppressing or reducing frequency when the score crosses a threshold.

A practical fatigue model scores contacts on these factors:

- **Send frequency**: more than 3 sends per week to the same contact starts adding fatigue points
- **Monthly volume**: more than 10-20 sends per month to the same contact is a strong negative
- **Bounce history**: any bounces add significant fatigue
- **Complaint history**: complaints are the highest-weight fatigue factor
- **Engagement decay**: days since last open/reply/click, especially when total sends exceed 3 with no engagement

Contacts scoring above 70 on a 0-100 scale should stop receiving email. Between 40 and 70, reduce frequency. Below 40, safe to send.

---

## Content analysis: what actually triggers filters

Content filtering is less influential than reputation, but it can still tip borderline emails into spam. Modern filters use ML classifiers, not just keyword matching, but certain patterns reliably trigger negative scoring.

### Spam phrase categories

These are the phrase patterns that consistently trigger filters across providers:

**Urgency/pressure language:**
- "Act now", "Limited time", "Urgent", "Expires today", "Last chance", "Don't miss out"
- These mimic scam patterns. The more urgency language in a single email, the worse the score.

**Financial promises:**
- "Free money", "No obligation", "Guaranteed", "Risk-free", "Double your income", "No cost"
- Financial language combined with urgency is the highest-scoring spam pattern.

**Engagement bait:**
- "Congratulations", "Winner", "You've been selected", "Exclusive access"
- These mimic phishing patterns and score heavily negative.

**Deceptive calls to action:**
- "Click here", "Buy now", "Order now", "Sign up free"
- Not always fatal on their own, but they contribute to an overall "promotional" score.

**Health/pharmaceutical:**
- Weight loss claims, medication names, supplement promises
- Heavily scrutinized due to pharmaceutical spam and FDA regulations.

Context matters more than individual words. Modern filters evaluate patterns, tone, and how words work together. "Free shipping on orders over $50" in a transactional receipt is fine. "FREE!!! Click here for your FREE gift!!!" is not. The combination of trigger words, urgency, excessive formatting, and lack of established sender relationship is what pushes emails into spam.

### Formatting patterns that trigger filters

**ALL CAPS in subject lines or body text.** Occasional emphasis is fine. Full sentences in caps score negatively.

**Excessive exclamation marks.** One is fine. Three in a row ("!!!") is a spam signal. This applies to both subject lines and body content.

**Colored or oversized text.** Large red text, especially combined with urgency language, mimics classic spam formatting.

**Misleading subject lines.** Starting with "Re:" or "Fwd:" when it's not a reply or forward. Providers detect this and penalize it.

**Single-image emails.** An email that is just one large image with no text is a strong spam signal. Spam filters can't analyze image content as easily as text, so spammers historically used image-only emails to evade keyword filters. Providers learned to flag this pattern.

### Link and URL patterns

**Link-to-text ratio.** Keep it reasonable - 2 to 3 links per email is standard. An email with 15 links and minimal text looks like a phishing attempt.

**URL shorteners.** Services like bit.ly, tinyurl, and similar shorteners are heavily scrutinized because they obscure the destination. Use full URLs or your own branded short domain.

**Mismatched anchor text and URLs.** If the visible link text says "google.com" but the href points to a different domain, that's a phishing signal. Filters catch this.

**HTTP links (not HTTPS).** Insecure URLs in email are a negative signal. All links should use HTTPS.

**Too many tracking redirects.** Every click-tracking system adds a redirect. Multiple layers of redirects look suspicious.

### Image-to-text ratio

The general guideline is 60% text, 40% images or less. However, research shows that emails with 500+ characters of text are not meaningfully penalized regardless of image count. The real risk is emails with very little text and one or more large images - this pattern strongly correlates with spam.

### HTML quality

Poorly structured HTML is correlated with lower inbox placement. Emails failing HTML validation are 18-25% more likely to land in spam at Gmail and Outlook. Common issues:

- Unclosed tags
- Inline CSS that references external resources
- Missing DOCTYPE or character encoding
- JavaScript (which gets stripped and scores negatively)
- Embedded forms (some providers block these entirely)

---

## Gmail-specific placement: Primary vs Promotions vs Spam

Gmail uses three main destinations for email, and each has different implications.

### Primary tab

Reserved for personal, conversational email. To land here:

- Email should look like it came from a person, not a marketing platform
- Plain text or simple HTML performs better than heavy templates
- Replies and conversation-style engagement are strong signals
- Consistent, low-volume sending from the same address helps
- The recipient has previously interacted with your emails (opened, replied, moved to Primary)

### Promotions tab

Gmail routes marketing and commercial email here. Triggers include:

- Promotional keywords: "sale", "discount", "offer", "deal", "free shipping"
- HTML-heavy templates with images, buttons, and styled layouts
- Bulk sending patterns (same content to many recipients)
- Presence of `List-Unsubscribe` headers (signals marketing email)
- Tracking pixels and click-tracking links

**The Promotions tab is not spam.** As of 2025, 54% of Gmail users check their Promotions tab daily. Open rates in Promotions (~19%) are only slightly lower than Primary (~22%). The real impact on total campaign performance is often less than half a percentage point.

In September 2025, Google changed the Promotions tab to sort by relevance rather than recency by default. This means emails from brands the recipient engages with most appear at the top. High engagement actually benefits you more in Promotions than it used to.

**Promotions tab annotations** let you add product carousels, deal badges, and expiration dates to your promotional emails. These increase visibility within the tab rather than trying to escape it.

### Spam folder

Content, reputation, or authentication failures land you here. Unlike Promotions, spam placement is actively harmful - it degrades your reputation further and creates the engagement death spiral described above.

### Moving between tabs

When a user drags an email from Promotions to Primary, Gmail learns that preference for that sender. Enough users doing this for a given sender can shift the default placement. The reverse is also true - users moving emails from Primary to Promotions or spam trains the classifier against you.

---

## Microsoft-specific placement: Focused vs Other vs Junk

Microsoft Outlook uses a similar but distinct system.

### Focused inbox

Prioritizes emails that seem important based on:

- Frequency of communication with the sender
- Past interactions (opens, replies, forwards)
- Whether the sender is in the recipient's contacts
- Content type (personal messages rank higher than bulk)

### Other inbox

Routes lower-priority email here:

- Newsletters and marketing emails
- Automated notifications
- Bulk email from infrequent contacts
- Content that looks promotional or templated

### Dynamic learning

Outlook's Focused Inbox continuously reevaluates placement based on recipient behavior. If a user starts opening newsletters from a specific sender more frequently, future emails from that sender may move to Focused. If they start ignoring emails from a previously-engaged sender, those emails migrate to Other.

### Microsoft sender requirements (May 2025)

Microsoft announced requirements for high-volume senders to Outlook.com and Hotmail, effective May 5, 2025:

- SPF, DKIM, and DMARC (p=none minimum) required
- Non-compliant messages go to Junk initially
- Future phases will reject non-compliant messages outright
- Valid sender addresses (From and Reply-To must be real, can receive replies)
- Functional unsubscribe mechanisms
- Transparent mailing practices and honest subject lines

---

## List quality signals

Your list quality directly affects inbox placement through bounce rates, spam trap hits, and engagement ratios.

### Bounce rate thresholds

| Bounce rate | Impact |
|-------------|--------|
| < 2% | Healthy. No placement impact. |
| 2-5% | Yellow zone. Providers start watching more closely. |
| 5-10% | Active filtering likely. Some providers throttle delivery. |
| > 10% | Severe. Expect spam placement or outright blocking. |

Hard bounces (address doesn't exist) are worse than soft bounces (temporary failures). Every hard bounce should immediately suppress that address so it's never tried again.

### Spam traps

Spam traps are email addresses operated by providers and blocklist operators specifically to catch senders with poor list hygiene. There are two types:

**Pristine traps**: Addresses that were never used by a real person. They exist solely to catch scraped or purchased lists. Hitting one is strong evidence of bad list acquisition.

**Recycled traps**: Addresses that once belonged to real users but were abandoned and repurposed. They catch senders who don't clean their lists - if the address has been inactive for a year and you're still sending to it, your list hygiene is poor.

Hitting spam traps has an outsized impact on reputation. There's no way to identify trap addresses in your list - the only defense is good acquisition practices (never buy lists) and regular list cleaning (suppress addresses that haven't engaged in 6+ months).

### Unknown user rates

A high rate of "unknown user" rejections (550 5.1.1 responses) tells providers you don't verify addresses before sending. This is especially relevant for AI agents that construct recipient addresses dynamically - guessing "contact@company.com" without verification produces bounces that count against you.

---

## Infrastructure signals

These are baseline factors that affect placement before any email is sent.

### IP reputation

- **New IPs have no reputation**, which is treated as suspicious. New IPs must be warmed gradually (see the `email-warmup` skill).
- **Shared IPs** pool reputation across all senders on that IP. One bad sender can affect everyone. Shared IPs are fine for low volume but risky at scale.
- **Dedicated IPs** give you full control of your reputation but require enough volume (typically 50,000+ messages/month) to build and maintain that reputation.

### Domain age

Domains registered less than 30 days ago are treated with suspicion by most providers. Domains less than 7 days old are frequently blocked outright for bulk sending. Register your sending domain well in advance of your first campaign.

### DNS configuration

- **Valid PTR records**: forward and reverse DNS must match for sending IPs. Required by Google and Yahoo for bulk senders.
- **Proper MX records**: even if you only send (never receive), having MX records adds legitimacy.
- **HTTPS on your domain**: some filters check whether the sending domain has a working website. A domain with no web presence looks disposable.

---

## Inbox placement testing

Inbox placement testing (seed testing) measures where your emails actually land across providers before you send to your real list.

### How seed testing works

1. **Build or rent a seed list** - a set of test email addresses across Gmail, Outlook, Yahoo, Apple Mail, and other providers.
2. **Send your actual email** to the seed list using the same domain, IP, provider, headers, and content you'll use for the real send.
3. **Check each seed mailbox** to see where the message landed: inbox, spam, Promotions tab, Other tab, or missing entirely.
4. **Analyze results per provider** - you might inbox at Gmail but spam at Outlook, which indicates a provider-specific issue.

### What seed testing tells you

- **Inbox rate**: percentage of seed addresses where the email reached the primary inbox
- **Spam rate**: percentage that landed in spam/junk
- **Missing rate**: percentage where the email never arrived at all (often indicates a block at the server level)
- **Tab placement**: Gmail Promotions vs Primary, Outlook Focused vs Other

### Limitations of seed testing

Seed testing shows how a neutral, new subscriber would receive your email. It does not account for:

- Per-recipient engagement history (a real subscriber who always opens your email may inbox it even if the seed test shows spam)
- Individual user spam filter training
- Mailbox-level rules and filters

Seed testing is best used as a baseline diagnostic, not as a guarantee of real-world placement. Run seed tests when:

- Launching a new sending domain or IP
- Making significant changes to email templates
- Investigating a drop in open rates
- After recovering from a reputation incident

### Seed testing tools

Services like Validity Everest, GlockApps, MailMonitor, Mailtrap, and InboxMonster maintain seed lists and provide placement dashboards. Some ESPs (Mailgun, SendGrid) have built-in placement testing.

---

## The placement equation: putting it together

Inbox placement is the result of all these signals evaluated together. Here is a practical framework for diagnosing placement issues:

### If emails are going to spam

1. **Check authentication first.** Run `dig` on your SPF, DKIM, and DMARC records. Send a test email and check the headers for `dmarc=pass`, `spf=pass`, `dkim=pass`. If any fail, fix them before investigating further.
2. **Check sender reputation.** Use Google Postmaster Tools (requires 100+ daily sends to Gmail). Look at your domain reputation (High/Medium/Low/Bad) and complaint rate. If reputation is Low or Bad, this is your primary problem.
3. **Check bounce and complaint rates.** Bounce rate above 2% or complaint rate above 0.1% will degrade placement. Suppress bad addresses and investigate why complaints are happening.
4. **Check content.** Run your email through a spam phrase check. Look for urgency language, financial promises, excessive formatting, or image-heavy templates with minimal text.
5. **Check engagement patterns.** Are you sending to a large number of disengaged recipients? Segment by engagement and stop sending to contacts who haven't interacted in 90+ days.
6. **Run a seed test.** If everything above looks clean, run a seed test to see whether the issue is provider-specific.

### If emails are going to Promotions/Other instead of Primary/Focused

This is a different problem from spam placement and usually isn't worth fighting. But if Primary/Focused placement matters for your use case:

1. Send from a personal-looking address (person@domain.com, not noreply@domain.com)
2. Use plain text or minimal HTML - avoid heavy templates
3. Write conversational content, not marketing copy
4. Reduce the number of links and images
5. Send to engaged recipients who have previously replied to your emails
6. Keep volume low and consistent

### Monitoring ongoing placement

- **Google Postmaster Tools**: free, shows domain/IP reputation, spam rate, authentication results, encryption. Requires 100+ daily sends to Gmail.
- **Complaint rate**: track via feedback loops (most ESPs surface this). Stay below 0.1%.
- **Bounce rate**: track and suppress. Stay below 2%.
- **Open rate trends**: a sudden drop often indicates a placement change before you see it in other metrics.
- **Seed tests**: run monthly or after any significant change to your sending program.

---

## Common mistakes

**Obsessing over spam trigger words while ignoring reputation.** "Free" in a subject line won't send you to spam if your reputation is good. A perfectly worded email will land in spam if your reputation is bad. Fix reputation first, content second.

**Trying to game the Promotions tab.** Marketers spend enormous effort trying to escape Gmail's Promotions tab. The actual open rate difference is small (~3%), and the September 2025 relevance-based sorting means high-engagement senders benefit from Promotions placement. Focus on making your Promotions-tab emails worth opening instead.

**Sending to your entire list regardless of engagement.** Every email to a disengaged recipient hurts your placement for everyone else. Segment by engagement. Stop sending to contacts who haven't opened or clicked in 90 days. Re-engage them with a specific win-back campaign, and if that doesn't work, suppress them.

**Not monitoring complaint rates.** Google's threshold is 0.1% for healthy delivery, with problems starting at 0.3%. Many senders don't check until they're already in trouble. Set up Google Postmaster Tools and feedback loops from your ESP on day one.

**Assuming authentication equals deliverability.** SPF/DKIM/DMARC passing is necessary but not sufficient. It gets you past the front door. Reputation, engagement, and content determine which room you end up in.

**Using URL shorteners in email.** bit.ly, tinyurl, and similar services are heavily penalized because they obscure link destinations. Use full URLs or set up a branded redirect domain.

**Sending image-only emails.** A single large image with no text content is one of the strongest spam signals. Always include substantive text content alongside images.

**Ignoring Microsoft.** Many deliverability guides focus exclusively on Gmail. Microsoft (Outlook.com, Hotmail, Office 365) has its own filtering stack, its own reputation system, and as of May 2025, its own bulk sender requirements. Test and monitor placement at both.

**Buying or scraping email lists.** Purchased lists contain spam traps, invalid addresses, and people who never consented to hear from you. The bounce rates and complaint rates from a purchased list can destroy a domain's reputation in a single send. There is no shortcut to list building.

**Not suppressing bounced addresses immediately.** Every subsequent send to a known-bad address compounds the reputation damage. Automate suppression on hard bounce - the address should be blocked before the next send attempt even reaches your provider.

---

## References

- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - official bulk sender requirements
- [Google Postmaster Tools](https://postmaster.google.com/) - reputation and authentication monitoring
- [Microsoft Outlook Sender Requirements (May 2025)](https://techcommunity.microsoft.com/blog/outlookblog/strengthening-email-security-outlook-new-requirements-for-high-volume-senders/4399730) - bulk sender requirements for Outlook
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/) - Yahoo's sender guidelines
- [M3AAWG Sending Best Practices](https://www.m3aawg.org/published-documents) - industry consortium recommendations
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-Click Unsubscribe (required for marketing email)
- [Validity 2025 Email Deliverability Benchmark Report](https://www.validity.com/wp-content/uploads/2025/03/2025-Benchmark-Report-FINAL.pdf) - industry benchmarks for inbox placement rates
- [SpamAssassin](https://spamassassin.apache.org/) - open-source spam filter used by many smaller providers

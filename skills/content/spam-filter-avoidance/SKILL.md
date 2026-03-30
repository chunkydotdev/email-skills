# Spam Filter Avoidance

Understand how spam filters evaluate your email and write content that passes cleanly - without tricks.

## When to use this skill

- Writing email content and want to avoid common spam filter triggers
- Emails are landing in spam despite good authentication and reputation
- Building HTML email templates and need to know what patterns get flagged
- Generating email content programmatically (AI agents, templates with dynamic variables)
- Diagnosing why a specific email was filtered when everything else looks correct
- Reviewing outbound email for content-level deliverability risks

## Related skills

- `inbox-placement` - the full picture of what determines inbox vs spam (reputation, engagement, authentication, and content)
- `domain-authentication` - SPF, DKIM, DMARC setup (filters check authentication before content)
- `sender-reputation` - reputation signals that outweigh content in filter decisions
- `template-design` - building HTML emails that render correctly and avoid structural triggers
- `email-compliance` - legal requirements like unsubscribe links that also affect filtering

---

## How spam filters actually work

Modern spam filters are not keyword blocklists. They are multi-signal classifiers that evaluate messages across several dimensions simultaneously. Understanding the architecture matters because it tells you what you can and cannot control at the content level.

### The filtering pipeline

When your email arrives at a mailbox provider, it passes through these stages in order:

1. **Connection-level checks** - IP reputation, DNS blocklists, TLS, rate limiting. Bad senders get rejected here before the message is even read.
2. **Authentication checks** - SPF, DKIM, DMARC. Failures add negative weight or cause outright rejection (Gmail rejects unauthenticated mail from bulk senders as of November 2025).
3. **Reputation scoring** - Domain history, complaint rates, bounce rates, past engagement. This is the heaviest signal.
4. **Content analysis** - The message itself: headers, subject, body text, HTML structure, links, attachments. This is where the patterns in this skill apply.
5. **Engagement prediction** - ML models predict whether this specific recipient will engage with this specific message, based on past behavior with this sender.
6. **Final disposition** - Inbox, spam, or category tab (Promotions, Other, etc.).

Content analysis is stage 4 of 6. By the time a filter evaluates your content, it has already formed an opinion based on your reputation and authentication. This is why the same content can land in inbox from one sender and spam from another.

### The ML reality

Gmail processes over 15 billion unwanted messages daily using ML models trained on billions of user interactions. These models evaluate:

- **Semantic meaning** - NLP models interpret context and tone, not just keywords
- **Structural patterns** - HTML complexity, text-to-image ratio, link density
- **Behavioral correlation** - how recipients with similar profiles reacted to similar messages
- **Temporal patterns** - unusual send times, volume spikes, sudden content changes

SpamAssassin (still widely used by corporate mail servers, ISPs, and hosting providers) takes a different approach: rule-based scoring where each matched rule adds points toward a threshold (default 5.0). This means specific patterns have specific, predictable scores.

The practical consequence: you need to satisfy both ML classifiers (Gmail, Outlook) and rule-based systems (SpamAssassin, enterprise filters). ML classifiers are harder to game but more forgiving of individual signals. Rule-based systems are predictable but unforgiving when you trip multiple rules.

---

## Subject line patterns

The subject line gets disproportionate attention from filters because spammers rely heavily on urgency and deception in subjects.

### What triggers filters

**ALL CAPS subjects.** SpamAssassin rule `SUBJ_ALL_CAPS` adds 1.5+ points. Gmail's classifier also treats all-caps as a negative signal. A subject like `LIMITED TIME OFFER` trips both systems.

**Excessive punctuation.** Multiple exclamation marks (`!!!`), question marks (`???`), or dollar signs (`$$$`) are classic spam signals. SpamAssassin has specific rules for these. One exclamation mark is fine. Three is a flag.

**Spam trigger phrases in subjects.** These phrases in subject lines carry more weight than the same phrases in the body:

| Category | Examples | Why they trigger |
|----------|----------|-----------------|
| Urgency | "Act now", "Limited time", "Urgent", "Expires today" | Pressure tactics are the most common spam pattern |
| Financial | "Free money", "No obligation", "Guaranteed", "Double your income" | Financial fraud is the #1 spam category |
| Deceptive | "Re:", "Fwd:" (on non-replies), "You've been selected" | Fake threading and fake personalization |
| Medical | "Lose weight", "Miracle cure", "No prescription" | Pharmaceutical spam is heavily targeted |

**Misleading Re:/Fwd: prefixes.** Adding `Re:` to a subject that isn't a reply trips the `FAKE_REPLY` rule in SpamAssassin and is actively penalized by Gmail. Same for `Fwd:` on messages that aren't forwards. Filters check Message-ID, In-Reply-To, and References headers to verify threading.

### What's actually safe

- Normal capitalization and punctuation
- Specific, descriptive subjects ("Your invoice for March" not "IMPORTANT DOCUMENT ENCLOSED")
- Personalization with real data (recipient name, company name) - but not fake personalization like "Hi {{first_name}}" with an unfilled variable
- Emojis in moderation - one emoji is fine, five is a flag

---

## Body content patterns

### Spam phrases in context

The phrases listed below are not absolute blocklist words. A sender with strong reputation can use "free" or "guaranteed" without consequence. But these phrases add negative weight, and when combined with other signals (new domain, low engagement, poor HTML), they push the score over the threshold.

**High-risk phrases** (carry the most weight across both ML and rule-based systems):

- "Act now" / "Buy now" / "Order now"
- "Click here" (as the sole anchor text for a link)
- "Free money" / "No cost" / "Risk-free"
- "Winner" / "Congratulations" / "You've won"
- "No obligation" / "No strings attached"
- "Guaranteed" / "100% satisfied"
- "Double your income" / "Earn extra cash"

**Medium-risk phrases** (contribute to score but rarely trigger alone):

- "Limited time offer"
- "Exclusive deal"
- "Don't miss out"
- "Special promotion"
- "While supplies last"

**The real rule:** Density matters more than individual words. One instance of "free" in a 500-word email is noise. Five instances of pressure phrases in a 100-word email is spam. Filters evaluate the ratio of promotional language to total content.

### Invisible text and encoding tricks

Filters specifically detect attempts to hide content or fool classifiers:

**Zero-width characters.** Inserting Unicode zero-width spaces (U+200B), zero-width joiners (U+200D), byte order marks (U+FEFF), or soft hyphens (U+00AD) between letters to break up spam words (like "V\u200Biagra") is an old trick that every modern filter detects. These characters are actively flagged and their presence alone is a spam signal.

**Invisible text.** White text on white background, font-size:0, display:none, or visibility:hidden content is detected by both SpamAssassin (`HIDDEN_TEXT` rules) and Gmail. Spammers use this to inject "good" text (like news articles) that the recipient can't see but the classifier reads, trying to dilute the spam score. Filters now treat hidden text as a strong negative signal.

**HTML comment stuffing.** Adding legitimate-looking text inside HTML comments (`<!-- buy stocks at ... -->`) to influence classifiers. Detected and penalized.

**Character substitution.** Using Cyrillic characters that look like Latin (e.g., Cyrillic "a" instead of Latin "a") or HTML entities (`&#V;iagra`) to bypass text matching. Modern filters normalize text before evaluation.

### Text-to-code ratio

The ratio of visible text to HTML markup matters. An email that is mostly HTML tags with very little readable text looks like it's trying to hide something. Aim for substantial readable text in every email.

---

## Link patterns

Links are the most scrutinized element in email content because they are the primary mechanism for phishing and malware delivery.

### URL shorteners

Do not use URL shorteners (bit.ly, tinyurl.com, t.co, etc.) in email. They are heavily penalized because:

1. They obscure the destination URL, which is the primary phishing vector
2. Spammers use them to evade URL blocklist checks
3. If another sender using the same shortener service gets blocked, your emails using that service may be blocked too - guilt by shared domain
4. SpamAssassin has specific rules for known shortener domains (scored 2-4 points)

Use your own domain for all links. If you need click tracking, use a subdomain you own (e.g., `track.example.com/click/...`) with proper HTTPS.

### Link density

Too many links signal promotional or phishing email:

- **0-3 links** - normal for transactional and personal email
- **4-7 links** - acceptable for newsletters with good text-to-link ratio
- **8+ links** - starts triggering density rules, especially if links point to different domains
- **20+ links** - almost certainly flagged

SpamAssassin scores increase progressively with link count. The `LOTS_OF_MONEY` and `URI_COUNT` family of rules fire at various thresholds.

### Mismatched anchor text

When the visible text of a link is a URL that doesn't match the actual href, filters treat this as phishing:

```html
<!-- BAD - anchor text says one URL, href goes somewhere else -->
<a href="https://evil.com/steal">https://www.yourbank.com/login</a>

<!-- BAD - "Click here" as sole anchor text -->
<a href="https://example.com/offer">Click here</a>

<!-- GOOD - descriptive, honest anchor text -->
<a href="https://example.com/pricing">View pricing details</a>

<!-- GOOD - matching URL text -->
<a href="https://example.com">https://example.com</a>
```

Gmail specifically checks for URL-as-anchor-text mismatches and flags them as potential phishing.

### URL blocklists

Every link in your email is checked against real-time URL blocklists (URIBL, SURBL, Google Safe Browsing). SpamAssassin's URIBL rules carry high scores (1.5-3.6 points each). If any domain in your email appears on these lists, the entire message is penalized.

This means:

- Don't link to domains you don't control unless you trust them
- Don't use third-party redirect services
- Monitor your own domains on blocklists (MXToolbox, multirbl.valli.org)
- If you link to user-generated content, validate URLs before including them

### HTTP vs HTTPS

All links should use HTTPS. SpamAssassin has rules for HTTP links in email (`HTTP_IN_EMAIL`), and Gmail treats HTTP links as a minor negative signal. More importantly, some enterprise filters block HTTP links outright as a security policy.

---

## HTML structure

The way your HTML email is constructed tells filters a lot about whether you're a legitimate sender.

### Text-to-image ratio

The widely cited guideline is 60:40 text-to-image ratio (by area). The practical rules:

- **Minimum 400-500 characters of visible text.** Below this, filters suspect your content is hidden in images.
- **Never send image-only emails.** An email that is one large image with no text is a strong spam signal. Filters can't read text in images, so they treat image-only messages as potentially hiding content.
- **Alt text on every image.** Besides accessibility, alt text provides text content that helps your text-to-image ratio when images are blocked (which is the default in many email clients on first view).

SpamAssassin's `HTML_IMAGE_RATIO_02` rule fires when text-to-image ratio is below 20%. The rule itself has a low score, but it compounds with other signals.

### HTML quality

Broken, malformed, or unnecessarily complex HTML is a spam signal:

- **Missing closing tags** - sloppy HTML suggests auto-generated spam
- **Excessive nested tables** - some depth is needed for email layout, but extreme nesting (10+ levels) is a flag
- **Non-standard tags** - `<marquee>`, `<blink>`, `<embed>`, `<object>`, `<form>` tags are stripped by email clients and flagged by filters
- **JavaScript** - `<script>` tags, `onclick`, `onload`, and other event handlers are always stripped by email clients and are a strong spam signal
- **Iframes** - always stripped and flagged
- **CSS external stylesheets** - not supported by most email clients and flagged by some filters. Use inline styles.
- **Extremely large HTML** - emails with more than 100KB of HTML are unusual for legitimate messages

### Encoding and character sets

- Declare your character encoding explicitly (`charset=UTF-8` in Content-Type)
- Don't mix character encodings within a single message
- Avoid base64-encoding the entire body unless necessary (it looks like you're trying to hide content)

### Multipart messages

Always send multipart messages with both HTML and plain text parts (`multipart/alternative`). Missing the plain text version is flagged by SpamAssassin (`MIME_HTML_ONLY`, scored at 0.7 points) and is a minor negative signal for Gmail.

The plain text part should be a real text rendering of your content, not a copy-paste of the HTML, not blank, and not "View this email in your browser." Recipients on text-only clients or with images disabled see this version.

---

## Header hygiene

Missing or malformed headers are easy to detect and consistently penalized.

### Required headers

Every email should include these headers:

| Header | Purpose | What happens without it |
|--------|---------|------------------------|
| `From` | Sender display name and address | Rejected by most servers |
| `To` | Recipient address | Some filters flag missing/empty To |
| `Date` | When the message was sent | SpamAssassin `MISSING_DATE` rule fires |
| `Subject` | Message topic | Not technically required but absence is suspicious |
| `Message-ID` | Unique identifier for this message | `MISSING_MID` rule fires, some providers reject |
| `MIME-Version` | Always `1.0` | `MISSING_MIME_VERSION` fires |
| `Content-Type` | Media type and charset | Assumed text/plain but absence is a flag |

### List-Unsubscribe (marketing email)

For any promotional or marketing email, include both headers:

```
List-Unsubscribe: <https://example.com/unsub?id=abc123>, <mailto:unsub@example.com?subject=unsubscribe>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Gmail and Yahoo require one-click unsubscribe for bulk senders (5,000+ messages/day). Microsoft requires it for Outlook.com/Hotmail as of May 2025. Missing these headers on marketing email causes:

1. No "Unsubscribe" button shown in email clients (forcing recipients to use the spam button instead)
2. Higher complaint rates (because "report spam" becomes the only easy opt-out)
3. Filter penalties for non-compliance with bulk sender requirements

The `List-Unsubscribe-Post` header tells email clients to use POST instead of GET for the unsubscribe request, preventing accidental unsubscribes from security scanners that follow links.

### Headers to avoid

- **X-Priority: 1** / **Importance: High** - marking your own email as high priority is a spam signal
- **X-Mailer** headers from known spam tools
- **Excessively long Received chains** - suggest the message is being relayed through open relays

---

## Provider-specific differences

Gmail, Microsoft, and Yahoo run different filtering stacks. What passes at one may fail at another.

### Gmail

- Heaviest reliance on engagement signals (opens, replies, time spent reading)
- ML-based classifier trained on billions of user actions
- Reply rates are a strong positive signal - a 2-3% reply rate significantly improves placement
- Strict authentication enforcement since November 2025 (unauthenticated bulk mail is rejected, not just filtered)
- Promotions tab is not spam - promotional email that Gmail routes to Promotions is being correctly classified, not penalized

### Microsoft (Outlook.com, Hotmail, Exchange Online)

- Uses Exchange Online Protection (EOP) and Microsoft Defender for Office 365
- Introduced LLM-based semantic analysis for BEC (business email compromise) detection in late 2024
- More conservative filtering - Outlook's inbox placement rate has been significantly lower than Gmail's (as low as 27% in Q1 2025 vs Gmail's 87%)
- Sender reputation scoring is less transparent than Gmail's
- More sensitive to link patterns and attachment types
- Stricter authentication requirements for Outlook.com/Hotmail since May 2025

### Yahoo

- Aligned with Gmail's bulk sender requirements since February 2024
- Slightly more permissive than Gmail on content signals
- Strong DMARC enforcement
- Less sophisticated engagement tracking than Gmail

### SpamAssassin and enterprise filters

- Used by corporate mail servers, hosting providers, and ISPs
- Rule-based scoring with a configurable threshold (default 5.0)
- Over 700 rules covering headers, content, HTML, links, and Bayesian analysis
- Predictable - you can test against SpamAssassin before sending
- Commonly customized per organization, so scores and thresholds vary

---

## Attachments

Attachments carry risk because they're the primary vector for malware delivery.

### High-risk attachment types

These file types are blocked by most enterprise filters and many consumer providers:

- **Executable:** `.exe`, `.bat`, `.cmd`, `.msi`, `.scr`, `.pif`, `.com`
- **Script:** `.js`, `.vbs`, `.wsf`, `.ps1`, `.sh`
- **Macro-capable:** `.docm`, `.xlsm`, `.pptm` (macro-enabled Office files)
- **Archives with executables inside:** `.zip`, `.rar`, `.7z` containing any of the above

### Lower-risk attachment types

- **PDF** - generally safe but scanned for embedded JavaScript and links
- **Images** - `.jpg`, `.png`, `.gif` are fine
- **Standard Office** - `.docx`, `.xlsx`, `.pptx` (non-macro) are usually accepted
- **Calendar invites** - `.ics` files are fine

### Best practices for attachments

- Host files on your server and link to them instead of attaching when possible
- Keep attachment sizes under 10MB (many filters reject larger messages)
- Don't password-protect archives in transactional email - this is a common malware delivery pattern and is flagged

---

## What doesn't work (and why)

These are techniques that either never worked, worked briefly, or actively make things worse.

### "Spinning" or synonym substitution

Replacing spam words with synonyms ("F.R.E.E" instead of "free", "vi@gra" instead of "viagra") was defeated by filters over a decade ago. Modern classifiers normalize text, expand character substitutions, and evaluate semantic meaning. Attempted obfuscation is itself a spam signal.

### White text / hidden text injection

Adding invisible "good" text (news articles, Shakespeare) to dilute spam scores stopped working when filters started detecting hidden content as a strong negative signal. SpamAssassin has specific rules for hidden text. Gmail's classifier treats any hidden content as suspicious.

### Image-only emails

Putting all your content in a single image to avoid text analysis has never worked reliably. Filters can't read the text, so they assume the worst. Additionally, many email clients block images by default, so the recipient sees a blank email.

### Sending from constantly new domains

Rotating through new domains to avoid reputation damage doesn't work because new domains have no reputation, which is itself a strong spam signal. Warming up a domain takes weeks, and providers track patterns across domains registered by the same entity.

### Character encoding tricks

Using Unicode homoglyphs, zero-width characters, or HTML entities to break up spam words is detected by modern filters. The content-sanitizer in production email systems strips these characters before evaluation. Presence of these characters is treated as an evasion attempt.

---

## Testing before sending

### SpamAssassin scoring

Test your emails against SpamAssassin before sending. Several tools offer this:

- **mail-tester.com** - send an email, get a SpamAssassin score breakdown
- **GlockApps** - tests against SpamAssassin plus inbox placement across providers
- **Mailtrap** - SpamAssassin scoring in staging environments

Target a SpamAssassin score below 3.0 (threshold is 5.0, but some servers use lower thresholds like 3.0 or even 2.0).

### Seed list testing

Send to test accounts at Gmail, Outlook, Yahoo, and any provider your recipients commonly use. Check:

- Does it land in inbox or spam?
- If Gmail, does it go to Primary or Promotions?
- Do images load? Do links work?
- What does the "Show original" reveal about authentication and filter headers?

### Header analysis

Check the `Authentication-Results` and `X-Spam-Status` headers on received messages. They tell you exactly which checks passed, failed, and what scores were assigned.

---

## Content checklist

Before sending, verify:

- [ ] Subject line uses normal capitalization (not ALL CAPS)
- [ ] No excessive punctuation (!!!, ???, $$$)
- [ ] No fake Re:/Fwd: prefixes on non-threaded messages
- [ ] Body contains at least 400-500 characters of visible text
- [ ] No hidden text (white-on-white, font-size:0, display:none)
- [ ] No zero-width Unicode characters or encoding tricks
- [ ] All links use HTTPS
- [ ] No URL shorteners (bit.ly, tinyurl, etc.)
- [ ] Link anchor text is descriptive (not "Click here")
- [ ] Link anchor text matches destination URL (no mismatches)
- [ ] Fewer than 8 links in a single message (fewer is better)
- [ ] Links don't point to blocklisted domains
- [ ] Images have alt text
- [ ] HTML includes a plain text alternative (multipart/alternative)
- [ ] HTML is well-formed (no unclosed tags, no script/iframe/form elements)
- [ ] Message-ID, Date, MIME-Version headers are present
- [ ] List-Unsubscribe and List-Unsubscribe-Post headers are present (marketing email)
- [ ] No high-priority markers (X-Priority: 1)
- [ ] Attachments (if any) use safe file types
- [ ] SpamAssassin score is below 3.0

---

## Common mistakes

**Obsessing over spam words while ignoring reputation.** Content analysis is roughly 10% of the inbox placement decision. If your domain reputation is poor or your complaint rate is above 0.1%, no amount of content optimization will save you. Fix reputation first, then optimize content.

**Sending image-only emails for "beautiful design."** A single large image with no text is the worst thing you can send from a deliverability perspective. Build your layout in HTML with real text. Use images for supporting visuals, not as the entire message.

**Using URL shorteners for "cleaner" links.** bit.ly and similar services share their domain across all users, including spammers. Use your own domain for tracking links.

**Adding invisible text to "improve" spam scores.** This backfired years ago and now actively hurts deliverability. Hidden text, white-on-white text, and zero-width character insertion are all detected and penalized.

**Missing the plain text part.** Sending HTML-only email without a text/plain alternative trips SpamAssassin's `MIME_HTML_ONLY` rule and is a minor negative across all providers. Always include a real plain text version.

**Not testing across providers.** An email that passes Gmail's filter might fail Microsoft's, or vice versa. Test at the providers your recipients actually use, not just the one you use.

**Ignoring List-Unsubscribe headers on marketing email.** Without the unsubscribe header, recipients who want to opt out will hit the "Report Spam" button instead. Every spam complaint costs you significantly more than an unsubscribe.

**Dynamic content without content review.** AI agents and template systems that generate email content at runtime can produce phrases or patterns that score poorly in spam classifiers. The sender doesn't see the content before it goes out, so problems compound silently. Implement content linting on outbound messages - check for known spam phrases, validate link patterns, and enforce text-to-image ratios before the message reaches the wire.

---

## References

- [Gmail Spam Filter and Sender Guidelines](https://support.google.com/a/answer/81126) - Google's official sender requirements
- [Microsoft Anti-spam Protection](https://learn.microsoft.com/en-us/defender-office-365/anti-spam-protection-about) - Exchange Online Protection documentation
- [Yahoo Sender Best Practices](https://senders.yahooinc.com/best-practices/) - Yahoo's sender requirements
- [SpamAssassin Test Descriptions](https://spamassassin.apache.org/old/tests_3_3_x.html) - full list of SpamAssassin rules
- [SpamAssassin Default Scores](https://github.com/apache/spamassassin/blob/trunk/rules/50_scores.cf) - scoring configuration
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-Click Unsubscribe
- [RFC 2045](https://datatracker.ietf.org/doc/html/rfc2045) - MIME format specification
- [M3AAWG Best Practices](https://www.m3aawg.org/published-documents) - industry anti-abuse guidelines
- [Google Postmaster Tools](https://postmaster.google.com/) - monitor your domain's reputation and spam rate at Gmail
- [URIBL](https://uribl.com/) - real-time URI blocklist
- [SURBL](https://www.surbl.org/) - spam URI blocklist

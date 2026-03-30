---
name: email-copywriting
description: Write emails people actually read. Use when crafting subject lines, structuring email content, writing CTAs, optimizing preview text, or improving open and click rates.
license: MIT
---

# Email Copywriting

Write emails people actually read - subject lines that get opened, body copy that gets read, and CTAs that get clicked.

## When to use this skill

- Writing any email - transactional, marketing, cold outreach, onboarding, or notifications
- Improving open rates, click-through rates, or reply rates
- Drafting subject lines or preview text
- Structuring email body copy for engagement
- Writing calls to action that convert
- Reviewing email copy for spam-trigger phrases or tone issues
- Adapting email content for mobile readers
- Deciding between plain text and HTML format

## Related skills

- `spam-filter-avoidance` - content patterns that trigger spam filters
- `template-design` - HTML email templates that render everywhere
- `ab-testing` - testing subject lines, content, and send times
- `onboarding-emails` - welcome sequences and activation emails
- `email-sequences` - drip campaigns and automated sequences
- `email-compliance` - CAN-SPAM, GDPR, unsubscribe requirements

---

## Subject lines

The subject line determines whether your email gets opened. Average open rates hover around 22% globally, and most of the variance comes from the subject line.

### Length

Keep subject lines between 30 and 50 characters (roughly 5-9 words). Front-load the most important words - on mobile, anything past 35-40 characters gets cut off. The first 3-4 words need to carry the message on their own.

**Good:** `Your API key expires Friday`
**Bad:** `Important information regarding the upcoming expiration of your API key`

### Formulas that work

**Question format** - gets 21% higher open rates than statements because it engages curiosity:
- `Did you see the new dashboard?`
- `Ready to send your first email?`

**How-to** - promises clear value:
- `How to cut your bounce rate in half`
- `How 3 lines of code fix your deliverability`

**Specificity** - numbers and concrete details outperform vague promises:
- `3 templates that reduced our churn by 40%`
- `Your March sending report: 12,847 delivered`

**Curiosity gap** - incomplete information that only the email resolves:
- `The one setting most senders miss`
- `We changed how warmup works`

### What to avoid in subject lines

- **ALL CAPS** - triggers spam filters and reads as shouting. Spam classifiers flag messages where the uppercase letter ratio exceeds 50%.
- **Excessive punctuation** - `!!!` or `???` signals spam.
- **Spam trigger phrases** - words like "act now," "limited time," "buy now," "free money," "no obligation," "winner," "congratulations," "urgent," and "guaranteed" are flagged by content filters. Production spam detection systems check both subject and body for these patterns.
- **Misleading subject lines** - `Re:` or `Fwd:` on messages that aren't replies or forwards. This violates CAN-SPAM and destroys trust.
- **Emoji overuse** - one emoji can work in some contexts (especially B2C), but stacking them looks spammy and renders inconsistently across clients.

---

## Preview text

Preview text is the snippet that appears after the subject line in the inbox list view. It's your second chance to earn the open.

### Length and display

- **35-55 characters** is the safe zone for mobile devices (iOS and Android truncate around 50 characters)
- Desktop clients show up to 90 characters
- Put the most important words in the first 40 characters

### Writing effective preview text

The preview text should complement the subject line, not repeat it. Think of them as a one-two punch - the subject line hooks, the preview text sells.

| Subject Line | Bad Preview Text | Good Preview Text |
|---|---|---|
| `Your March sending report` | `Your March sending report is ready` | `12,847 delivered, 3 issues to fix` |
| `Ready to send your first email?` | `Get started with email sending` | `It takes 2 minutes. Here's how.` |
| `We changed how warmup works` | `Read about our warmup changes` | `50% faster ramp-up, same deliverability` |

### Technical implementation

If you don't set preview text explicitly, email clients pull the first visible text from your email body. This often means they show "View in browser" or "Unsubscribe" or your logo alt text - none of which help your open rate.

In HTML emails, add preview text as the first element in the body, then hide the remaining preheader space with invisible characters to prevent the email client from pulling additional body text:

```html
<div style="display:none;max-height:0;overflow:hidden;">
  Your preview text here.
  &#847; &#847; &#847; &#847; &#847; <!-- invisible spacers -->
</div>
```

---

## Email structure

How you organize the body matters as much as what you write. Three frameworks work well for email, each suited to different purposes.

### Inverted pyramid (best for transactional and notifications)

Lead with the most important information. Supporting details follow. Background comes last (or gets cut).

```
[WHAT HAPPENED]      "Your payment of $49 was processed."
[DETAILS]            "Plan: Pro. Next billing date: April 15."
[ACTION IF NEEDED]   "View receipt"
```

This works because most people scan emails, especially on mobile. If they only read the first sentence, they should get the core message. Transactional emails - receipts, alerts, status updates - should almost always use this structure.

### PAS - Problem, Agitate, Solve (best for cold outreach and re-engagement)

Identify a problem the reader has. Make them feel the pain. Present your solution.

```
[PROBLEM]    "Most teams don't know their emails are hitting spam
              until a customer mentions it."
[AGITATE]    "By then you've lost weeks of sends. Reputation damage
              compounds - the longer it goes unnoticed, the harder
              the recovery."
[SOLUTION]   "Molted monitors your deliverability in real time and
              alerts you the moment placement drops."
```

PAS works well when you know your reader's pain point. It fails when you guess wrong or when the agitation feels manipulative.

### AIDA - Attention, Interest, Desire, Action (best for marketing and announcements)

Grab attention. Build interest with relevant details. Create desire with benefits. Close with a clear action.

```
[ATTENTION]  "We just shipped journey orchestration."
[INTEREST]   "Event-driven email sequences that send based on what
              users actually do, not a calendar."
[DESIRE]     "Teams using it see 3x higher activation rates because
              every email arrives at the right moment."
[ACTION]     "Set up your first journey"
```

### Choosing a framework

| Email type | Best framework | Why |
|---|---|---|
| Transactional (receipts, alerts) | Inverted pyramid | Reader needs the key info immediately |
| Cold outreach | PAS | You need to earn attention by showing you understand their problem |
| Product announcements | AIDA | You're building excitement toward a specific action |
| Onboarding / activation | Inverted pyramid + CTA | Clear instruction, one next step |
| Re-engagement | PAS | Remind them what they're missing |
| Newsletters | Inverted pyramid | Lead with the best content, let readers self-select |

---

## Tone and voice

### Match tone to email type

Different email types demand different tones. Using the wrong tone is one of the fastest ways to lose readers.

**Transactional** - clear, neutral, direct. These are utility emails. Don't try to be clever in a password reset email.
```
Subject: Reset your password
Body: Click the link below to set a new password. This link expires in 1 hour.
```

**Onboarding** - warm, encouraging, specific. Guide without condescending.
```
Subject: You just sent your first email
Body: Nice - your first email went out to alex@example.com and was
delivered successfully. Here's what to try next.
```

**Marketing** - conversational, benefit-focused, energetic without being pushy.
```
Subject: 3 things that changed in March
Body: We shipped journey orchestration, revamped the dashboard, and
cut warmup time by half. Here's what each one means for you.
```

**Cold outreach** - brief, relevant, human. No pitch in the first sentence.
```
Subject: Quick question about your onboarding emails
Body: I noticed your trial-to-paid conversion is public at 12%.
Most of that drop happens in the first 48 hours after signup.
Would a 15-minute walkthrough of what high-converting onboarding
sequences look like be useful?
```

### Humanizer patterns

When AI agents draft emails, the copy often sounds robotic - overly formal, padded with filler, lacking personality. Good humanization follows these principles:

- **Use contractions.** "You're all set" not "You are all set."
- **Shorter sentences.** Break up compound sentences. One idea per sentence.
- **Cut filler words.** Remove "just," "actually," "basically," "in order to," "leverage," "utilize."
- **Active voice.** "We processed your payment" not "Your payment has been processed."
- **Match the reader's vocabulary.** Don't say "deliverability" to someone who says "my emails aren't arriving."

Three tone presets cover most needs:
- **Casual** - contractions, shorter sentences, warm. Good for B2C and community.
- **Professional** - clear and direct, polished without being stiff. Good for B2B.
- **Friendly** - warm and personable, upbeat without being over the top. Good for onboarding and support.

---

## Personalization beyond {first_name}

Using `{{first_name}}` in a subject line is table stakes. It barely moves the needle anymore. Real personalization uses behavioral data to make the email genuinely relevant.

### Personalization tiers

**Tier 1 - Merge fields (basic):**
- First name, company name
- Barely affects engagement on its own
- Looks broken when data is missing: "Hi ," is worse than "Hi there"

**Tier 2 - Segment-based (good):**
- Different content for different user groups
- "You've sent 500 emails this month" vs. "You haven't sent an email yet"
- Based on lifecycle stage, plan tier, activity level

**Tier 3 - Behavioral (best):**
- Triggered by specific actions or inactions
- "You created a mailbox but haven't sent your first email"
- "Your bounce rate jumped from 2% to 8% this week"
- References what the person actually did

### Event-driven personalization in practice

The highest-converting emails reference exactly where the user is in their journey. Instead of time-based drips ("Day 3: here's a feature"), trigger emails based on milestones:

| Trigger event | Email content |
|---|---|
| `user.signed_up` | Welcome + quickstart guide |
| `api.first_call` made | "Nice - here's what to try next" |
| `api.first_call` not made after 24h | "Here's how to make your first API call" |
| `email.first_sent` | "Your first email is delivered" |
| Bounce rate spike | "Your bounce rate needs attention" |

The stall recovery emails - the ones that catch users who started but got stuck - consistently outperform scheduled drip emails because they're actually relevant.

### Fallback values

Always declare fallback values for merge variables. An email that says "Hi {{first_name}}" when the data is missing looks broken. Set defaults:

```
{{first_name | default: "there"}}
{{company_name | default: "your team"}}
```

Template linting should catch undeclared variables before they reach production. Any variable used in a template but not declared in the template's variable list is a bug waiting to happen.

---

## Calls to action

### One CTA per email

Emails with a single call to action increase click-through rates by up to 371% compared to emails with multiple competing CTAs. Every email should have one primary action you want the reader to take.

If you must include secondary links (e.g., documentation, a settings page), visually de-emphasize them. The primary CTA should be unmistakable.

### CTA copy

Use action verbs that describe what happens next, not vague instructions:

| Weak CTA | Strong CTA |
|---|---|
| Click here | View your report |
| Learn more | See the 3 new features |
| Submit | Create my mailbox |
| Get started | Send your first email |

**First-person framing** increases clicks by up to 90%. "Start my free trial" outperforms "Start your free trial."

Keep CTA text to 2-5 words. Longer than that and it stops looking like a button label.

### CTA design

- **Buttons outperform text links** by up to 45% in click-through rate, but only in HTML emails. For cold outreach, plain text links perform better because they look personal.
- **Contrast matters.** The button color needs to stand out from the surrounding content. This is about contrast, not about which specific color is "best."
- **Size for mobile.** Touch targets should be at least 44x44 pixels. Fingers are bigger than cursors.
- **Placement.** Put the primary CTA above the fold (visible without scrolling). For longer emails, repeat it at the bottom.

### CTA in context

The sentences around your CTA matter. A button that says "Set up your mailbox" works better when preceded by a reason:

**Weak:**
```
Click below to get started.
[Set up your mailbox]
```

**Strong:**
```
Your domain is authenticated and ready to send.
The last step is creating a mailbox - it takes about 30 seconds.
[Set up your mailbox]
```

---

## Writing for mobile

78% of email opens happen on mobile devices. If your email doesn't work on a phone, it doesn't work.

### Copy rules for mobile

- **Short paragraphs.** 2-3 sentences max. On a phone screen, a paragraph that's 5 lines on desktop becomes a wall of text.
- **Short sentences.** 8-15 words per sentence. Long sentences require re-reading on small screens.
- **Front-load meaning.** Put the key information at the start of each sentence and paragraph. Mobile readers scan the left edge.
- **Bullet points for lists.** Anything with 3+ items should be a list, not a run-on sentence.
- **One column.** Multi-column layouts break on mobile. Use a single-column layout.

### What not to do

- Don't rely on images to convey information. Many mobile clients block images by default.
- Don't use small text. 14-16px minimum for body copy.
- Don't put important content below a long block of unrelated text. Mobile readers won't scroll that far.
- Don't use wide fixed-width tables. They force horizontal scrolling.

### The scan test

Before sending, scan your email for 3 seconds on a phone-sized screen. Can you tell:
1. Who it's from?
2. What it's about?
3. What you're supposed to do?

If not, restructure.

---

## Plain text vs HTML

This isn't an either/or decision. Each format has a purpose.

### When to use plain text

- **Cold outreach** - plain text emails feel personal and avoid spam filters that flag heavy HTML. They see 23% higher open rates in B2B contexts.
- **1:1 replies** - if you're replying to someone, HTML with a branded header looks impersonal.
- **Transactional alerts** - "Your API key expires in 24 hours" doesn't need a logo and hero image.
- **Deliverability concerns** - complex HTML with large file sizes and many images triggers content-based spam filters more often.

### When to use HTML

- **Marketing campaigns** - you need visual hierarchy, branding, and styled CTAs.
- **Product announcements** - screenshots, diagrams, and formatted feature lists communicate better visually.
- **Newsletters** - multiple sections with headers, images, and links benefit from structured layout.
- **Receipts and invoices** - formatted tables are easier to read than plain text line items.

### The hybrid approach

Send multipart emails that include both HTML and plain text versions. The recipient's email client chooses which to display. This improves deliverability (spam filters view the plain text part as a positive signal) and handles clients that strip HTML.

If you send HTML without a plain text alternative, some spam filters flag the mismatch. Always include both parts.

---

## What makes people unsubscribe

Understanding why people leave helps you write emails that keep them. The top reasons, by frequency:

### Too many emails (44-69% of unsubscribes)

The most common reason by a wide margin. Sending more than one promotional email per day doubles unsubscribe rates.

**Fix:** Respect send frequency. More than 3 marketing emails per week to the same person is aggressive for most industries. Watch recipient fatigue signals - if someone hasn't engaged in 30+ days despite multiple sends, they're telling you to stop.

Fatigue scoring in production systems looks at weekly and monthly send counts, bounce history, complaint history, and days since last engagement. A recipient who's received 5+ emails in 7 days with zero engagement is a fatigue risk.

### Content isn't relevant (54% of unsubscribes)

People signed up for one thing and got another, or the content stopped being useful.

**Fix:** Segment your audience. Send different content to different groups based on their behavior, not just their demographics. An enterprise customer and a hobbyist on a free plan shouldn't get the same email.

### Never asked to receive emails (19%)

The sender added them to a list without explicit opt-in.

**Fix:** Use confirmed opt-in (double opt-in) for marketing lists. Never import purchased lists. This also protects your sender reputation - unsolicited email generates complaints that damage deliverability for all your sends.

### Preference centers

Let subscribers control frequency and content type. A preference center that offers "weekly digest" vs. "every update" can save subscribers who would otherwise unsubscribe entirely.

---

## Common mistakes

### Writing for yourself, not the reader

The email is about what the reader gets, not what you did. "We're excited to announce our new feature" tells the reader nothing. "You can now send emails triggered by product events" tells them what changed for them.

### Burying the lead

If the most important information is in the third paragraph, most readers will never see it. Put the key message in the first 1-2 sentences.

### Too many links

Emails with more than 5 links trigger spam classification signals. Every link dilutes the impact of your primary CTA. Include only the links that serve the email's purpose.

### No plain text version

Sending HTML-only emails hurts deliverability. Always include a plain text alternative. Multipart (HTML + text) is the standard.

### Generic subject lines

"Monthly Update" or "Newsletter #47" tells the reader nothing about why they should open this specific email. Every subject line should promise specific value.

### Writing long emails

Most marketing emails should be 50-125 words. Transactional emails should be even shorter. If you need to explain something complex, link to a page - don't put the entire article in the email.

### Ignoring preview text

If you don't set preview text, the email client pulls whatever text comes first in your HTML - often navigation links, alt text, or "View in browser." This wastes prime real estate in the inbox.

### Using images for text

Text in images isn't searchable, isn't accessible, and doesn't show when images are blocked. Use real text for important content. Reserve images for visual content that genuinely adds value.

### Forgetting the unsubscribe link

Marketing emails must include an unsubscribe mechanism. Since 2024, Google and Yahoo require one-click unsubscribe via the `List-Unsubscribe-Post` header for bulk senders. Missing unsubscribe links are a template linting error that should be caught before send.

---

## References

- [Litmus - CTA Best Practices](https://www.litmus.com/blog/click-tap-and-touch-a-guide-to-cta-best-practices) - comprehensive CTA design and copy guidance
- [Litmus - Ultimate Guide to Preview Text](https://www.litmus.com/blog/the-ultimate-guide-to-preview-text-support) - preview text rendering across clients
- [Campaign Monitor - Inverted Pyramid Model for Email](https://www.campaignmonitor.com/email/inverted-pyramid-model/) - email structure and visual hierarchy
- [Campaign Monitor - Subject Line Formulas](https://www.campaignmonitor.com/blog/email-marketing/subject-line-formulas/) - proven subject line patterns with data
- [Mailchimp - Email Subject Line Best Practices](https://mailchimp.com/help/best-practices-for-email-subject-lines/) - length, personalization, and testing advice
- [HubSpot - Plain Text vs HTML Emails](https://blog.hubspot.com/marketing/plain-text-vs-html-emails-data) - format performance comparison with data
- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - Google's requirements for bulk senders
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-Click Unsubscribe (List-Unsubscribe-Post)

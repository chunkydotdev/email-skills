---
name: notification-design
description: Design product notification emails. Use when building activity alerts, digests, status updates, or managing notification frequency and user preferences.
license: MIT
---

# Notification Design

Design product notification emails that inform without overwhelming - covering notification types, frequency management, digest strategies, and preference centers.

## When to use this skill

- Building a notification system for a product or SaaS app
- Users are unsubscribing or complaining about too many emails
- Deciding which events should trigger an email vs. push vs. in-app
- Implementing digest or batching logic to reduce notification volume
- Designing a preference center for notification controls
- Choosing between instant alerts and periodic summaries
- Notification open rates or click rates are declining

## Related skills

- `transactional-email` - receipts, auth emails, and other must-deliver messages
- `email-sequences` - drip campaigns and automated multi-step flows
- `template-design` - HTML email templates that render everywhere
- `email-compliance` - CAN-SPAM, GDPR, unsubscribe requirements
- `suppression-lists` - managing bounces, complaints, and opt-outs
- `rate-limiting` - volume controls that protect sender reputation

---

## Notification types

Not all notifications are equal. Each type has different urgency, expected frequency, and design requirements.

### Security and account alerts

Password resets, login from new device, two-factor codes, account lockouts.

- **Channel:** Email (primary) + push (secondary)
- **Timing:** Immediate, always
- **User control:** None - these are mandatory. Users cannot opt out of security notifications.
- **Design:** Minimal, direct. Lead with the event ("Someone signed in to your account from a new device"). Include device/location/time details. Clear CTA ("If this wasn't you, secure your account"). Never include sensitive data in the email body - say "your payment was processed" not "your payment of $4,231.00 was processed."

### Transactional confirmations

Order confirmations, shipping updates, subscription renewals, payment receipts.

- **Channel:** Email (primary)
- **Timing:** Immediate, triggered by user action
- **User control:** None for critical confirmations. Optional for shipping status updates.
- **Design:** Structured, scannable. Order number, line items, totals, tracking links. Keep the layout consistent across all transactional emails so users recognize the pattern instantly.

### Activity notifications

Comments on your post, mentions, replies, collaboration invites, task assignments.

- **Channel:** Email, push, or in-app depending on urgency and user preference
- **Timing:** Immediate or batched into digests
- **User control:** Full control - type, frequency, and channel
- **Design:** Context-rich. Show who did what, include enough preview text that the user can decide whether to click through. "Alex commented on your design: 'Can we try a darker shade for the header?'"

### Social and engagement notifications

New followers, likes, reactions, shares, endorsements.

- **Channel:** In-app (primary), email digest (secondary)
- **Timing:** Batched - never send individual emails for likes or reactions
- **User control:** Full control, default to digest or off for email
- **Design:** Aggregated. "3 people reacted to your post" not three separate emails. These are low-urgency, high-volume - the worst candidates for individual emails.

### Product and system updates

New features, maintenance windows, policy changes, terms updates.

- **Channel:** Email + in-app banner
- **Timing:** Scheduled, infrequent
- **User control:** Optionable for feature announcements, mandatory for terms/policy changes
- **Design:** Brief, scannable. Lead with what changed and why it matters to the user. Link to full details.

### Billing and usage alerts

Approaching plan limits, failed payments, upcoming renewals, usage spikes.

- **Channel:** Email (primary) + in-app
- **Timing:** Triggered by threshold or calendar event
- **User control:** Limited - payment failures and renewal reminders should be mandatory. Usage alerts can be configurable.
- **Design:** Clear numbers. "You've used 8,500 of your 10,000 monthly API calls (85%)." Include a direct link to upgrade or update payment method.

---

## Channel selection

The biggest mistake in notification design is sending everything via email. Each channel has a natural fit.

### When to use email

- The user needs a permanent record (receipts, confirmations, legal notices)
- The content is detailed enough to need formatting (order summaries, reports)
- The user may not be online right now but should see this eventually
- Digests and summaries that aggregate multiple events
- The user hasn't installed your app or enabled push

### When to use push notifications

- Time-sensitive actions that need attention within minutes (security alerts, delivery arriving)
- The user is likely on their phone and the notification is glanceable
- Re-engagement nudges for users who haven't opened the app recently
- Real-time collaboration (someone is typing, live updates)

### When to use in-app notifications

- The user is currently active in your product
- Feature announcements and tips shown in context
- Social engagement signals (likes, views) that don't warrant interruption
- Anything you'd feel bad about putting in someone's inbox

### The urgency-channel mapping

Users associate different urgency levels with different channels. Respect this:

| Urgency | Best channel | Examples |
|---------|-------------|----------|
| Critical - act now | Push + email | Security breach, payment failed, system down |
| Important - act today | Email | New comment needing response, task assigned |
| Informational - act when convenient | Email digest | Activity summary, weekly report |
| Low - FYI only | In-app | Likes, views, minor updates |

Sending low-urgency notifications through high-urgency channels (push for likes, individual emails for reactions) trains users to ignore all your notifications - including the important ones.

---

## Frequency management

Notification fatigue is the primary reason users unsubscribe. More than 3 emails per week from a single product starts driving fatigue scores up significantly.

### Frequency thresholds

Based on production fatigue scoring (from [molted.email](https://molted.email)):

| Weekly sends to one recipient | Fatigue level | Recommendation |
|-------------------------------|---------------|----------------|
| 0-1 | Low (score 0-10) | Safe to send |
| 2-3 | Moderate (score 10-20) | Monitor engagement |
| 4-5 | High (score 20-30) | Reduce frequency, switch to digests |
| 5+ | Critical (score 30+) | Stop individual sends, digest only |

These are per-product thresholds. A user getting 2 emails/week from your app plus 3 from their bank plus 4 from a shopping site is getting 9 total - your 2 feel like more than 2.

### Fatigue signals to monitor

Track these per-recipient to catch fatigue before unsubscribes:

- **Days since last engagement**: If a user hasn't opened or clicked in 14+ days, reduce frequency. At 30+ days with no engagement, consider stopping non-critical emails entirely.
- **Bounce count**: Even one bounce adds significant fatigue risk. Multiple bounces should trigger suppression.
- **Complaint count**: A single spam complaint is a severe signal. Two complaints from the same user means stop immediately.
- **Reply rate**: For notifications that invite response, declining reply rates signal disengagement.

### Implementing frequency caps

Set hard limits on how many notifications a single user receives:

```
Per-recipient caps:
- Security/transactional: unlimited (but these should be rare by nature)
- Activity notifications: max 5/day via email, overflow goes to digest
- Marketing/product updates: max 2/week
- Social/engagement: email digest only, max 1/day
```

When a user hits the cap for a category, queue remaining notifications for the next digest instead of dropping them.

---

## Digest and batching strategies

Digests consolidate multiple notifications into a single email. They are the primary tool for fighting notification fatigue while keeping users informed.

### Time-based digests

Group notifications by fixed time windows:

- **Hourly digest**: For high-activity products where users expect near-real-time awareness (project management, team chat overflow). Only send if there are 3+ pending notifications.
- **Daily digest**: The most common pattern. Send once per day at a consistent time. Best for activity summaries, social engagement roundups, content recommendations.
- **Weekly digest**: For low-frequency products or summary/analytics content. Weekly engagement reports, content roundups, community highlights.

### Event-based digests

Trigger a digest when conditions are met rather than on a fixed schedule:

- **Threshold-based**: Send when 5+ notifications have accumulated, regardless of time.
- **Activity spike**: When a piece of content gets sudden attention (10+ reactions in an hour), send one "your post is getting traction" email instead of 10 individual notifications.
- **Session-based**: Batch notifications while the user is active in-app, then send a summary email after they leave.

### Smart batching

The Padlet approach is a good model: when a user is on pace to receive more than 3 emails about the same resource they haven't visited, send one email saying "there's a lot of activity" instead of continuing to send individual notifications. This respects the inbox while still surfacing the signal.

### Digest design patterns

A good digest email has:

1. **A clear summary header**: "12 updates since yesterday" or "Weekly activity on your projects"
2. **Grouped by context, not by time**: Group notifications by project/thread/resource, not chronologically. Users care about "what happened on Project X" not "what happened at 3:14 PM."
3. **Priority ordering**: Most important or most active items first. A comment that needs your response ranks above 5 likes.
4. **Truncated previews**: Show enough to decide whether to click through - usually the first line of a comment or the event summary. Don't try to put the full content in the digest.
5. **One clear CTA per group**: "View conversation" or "See all activity" - not a CTA for every individual notification.
6. **Unread count by category**: "3 comments needing response, 7 reactions, 2 new followers"

### What to never digest

Some notifications must always be sent immediately, never batched:

- Security alerts (new login, password change, 2FA codes)
- Payment failures and billing issues
- Time-sensitive invitations with deadlines
- Direct messages from another user (first message only - subsequent can be batched)
- Anything the user explicitly asked for in real-time

---

## Preference centers

A preference center lets users control their notification experience instead of choosing between "everything" and "unsubscribe from all."

### Essential preference options

At minimum, offer these controls:

```
Notification preferences for [User Name]

Activity on your content
  [ ] Comments and replies        [Instant / Daily digest / Off]
  [ ] Mentions                    [Instant / Daily digest / Off]
  [ ] Reactions and likes         [Daily digest / Weekly digest / Off]

Collaboration
  [ ] Task assignments            [Instant / Daily digest / Off]
  [ ] Project invitations         [Instant / Off]
  [ ] Status changes              [Daily digest / Weekly digest / Off]

Product updates
  [ ] New features                [On / Off]
  [ ] Tips and best practices     [On / Off]

Billing
  [ ] Payment confirmations       [Always on]
  [ ] Usage alerts                [On / Off]
  [ ] Renewal reminders           [Always on]

Account security
  [ ] Login alerts                [Always on]
  [ ] Password changes            [Always on]

--
Pause all non-essential emails for: [1 week / 1 month / 3 months]
Unsubscribe from all marketing emails
```

### Preference center design rules

1. **Single page.** Don't make users click through multiple screens. Every option should be visible at once.
2. **Accessible from every email.** Link to the preference center near the unsubscribe link in every notification. "Manage notification preferences" should be as prominent as "Unsubscribe."
3. **Include a pause option.** Let users snooze non-essential emails for a set period instead of unsubscribing permanently. This retains subscribers who are temporarily overwhelmed.
4. **Show what each option means.** Brief descriptions next to each toggle: "Get an email when someone replies to your comment" not just "Replies."
5. **Pre-populate with current settings.** Users should see their current preferences, not blank defaults.
6. **Respect choices immediately.** Changes should take effect within minutes, not "within 24-48 hours." Delayed preference changes erode trust.
7. **Keep security and billing notifications non-optional.** Mark them as "Always on" so users understand they can't be disabled - and so you stay compliant.
8. **Mobile responsive.** Over 50% of email opens happen on mobile. Your preference center must work well on a phone screen.
9. **No login required for basic changes.** Use a signed token in the preference center URL so users can adjust settings without logging in. Friction kills engagement with preference centers.
10. **Comply with CAN-SPAM and GDPR.** If you replace the unsubscribe link with a preference center link, you must still include an option to opt out of all non-transactional emails.

### Default settings matter

Your defaults determine the experience for 80%+ of users who never visit the preference center.

- **Start conservative.** Default to digest mode for high-frequency notification types. Users who want instant alerts will find the setting. Users who get overwhelmed won't.
- **Ramp with usage.** A new user doesn't need notifications about features they haven't used yet. Enable notification categories as users activate the relevant features.
- **Different defaults by user type.** Power users who log in daily may want instant notifications. Infrequent users are better served by weekly digests.

---

## Notification email design

### Consistent structure

Every notification email from your product should share a recognizable structure:

```
[Your Logo]

[Notification headline - what happened]

[Context - who did it, where, preview of content]

[Primary CTA button]

[Footer: manage preferences | unsubscribe | help]
```

Once users recognize the pattern, they can scan your notifications in seconds without reading every word.

### Subject line patterns

Subject lines for notifications should be scannable and differentiated by type:

| Type | Pattern | Example |
|------|---------|---------|
| Activity | `[Actor] [action] [object]` | "Alex commented on your design" |
| Digest | `[Count] updates [timeframe]` | "8 updates on your projects today" |
| Security | `[Urgency]: [event]` | "Security alert: new login from Chicago" |
| Billing | `[Event]: [detail]` | "Payment failed: Visa ending 4242" |
| System | `[Product]: [change]` | "Acme: New export feature available" |

Avoid generic subjects like "You have a notification" or "New activity on your account." They train users to ignore you.

### Plain text fallback

Always include a plain text version. Some corporate email systems strip HTML, and accessibility tools work better with plain text. The plain text version should contain the same information and links as the HTML version.

### Keep it short

Notification emails are not newsletters. They should convey one piece of information and one action. A comment notification doesn't need your full product tour in the footer. Design for scan-and-decide: the user should know in 3 seconds whether they need to act.

### Threading

Use consistent `Message-ID`, `In-Reply-To`, and `References` headers to group related notifications into threads in the user's inbox. Activity on the same resource (post, project, document) should thread together rather than creating separate inbox entries.

If your notification system supports threading, replies within a thread can bypass per-recipient cooldowns since the user is already engaged in the conversation. Production email policy engines (like [molted.email](https://molted.email)) handle this by skipping cooldown checks when a `threadId` is present.

---

## Metrics to track

### Per-notification-type metrics

Track these for each notification category independently. A 40% open rate on security alerts and a 5% open rate on social notifications tell you very different stories.

| Metric | Healthy range | Warning signs |
|--------|--------------|---------------|
| Open rate | 40-60% for transactional, 20-40% for activity, 15-25% for digests | Below 15% for any type means users aren't finding value |
| Click rate | 5-15% for transactional, 2-5% for activity digests | Below 2% across the board suggests poor CTAs or irrelevant content |
| Unsubscribe rate | Below 0.2% per send | Above 0.5% per send is a frequency or relevance problem |
| Complaint rate | Below 0.1% | Above 0.3% risks deliverability damage (Google's threshold) |

Note: Apple Mail Privacy Protection inflates open rates by preloading images for ~46% of email clients. Weight click-through rates and downstream actions more heavily than open rates for accurate measurement.

### System-level metrics

- **Notification-to-action ratio**: What percentage of notifications result in the user taking the intended action? This is the true measure of notification value.
- **Time to action**: How long between notification delivery and user action? Increasing latency signals declining relevance.
- **Digest engagement vs. instant**: Compare click rates for digested vs. instant notifications. If digests perform equally well, you're sending too many instant notifications.
- **Preference center visit rate**: If users are frequently visiting the preference center, they're trying to reduce volume. If they never visit, either your defaults are good or they don't know it exists.
- **Unsubscribe-to-preference-change ratio**: Users who adjust preferences instead of unsubscribing are giving you a second chance. A high ratio of unsubscribes to preference changes means your preference center isn't visible or useful enough.

---

## Common mistakes

### Treating all notifications as equally important

The most common mistake. When every event generates an email - new comment, new like, new follower, new view - users learn that your emails are noise. Reserve email for notifications that actually need attention. Route low-value signals to in-app or digest only.

### No notification strategy at launch

Teams add notification emails ad-hoc as features ship. "Users should know when someone comments, right?" leads to 15 notification types with no frequency management, no digests, and no preference center. Design the notification taxonomy before building individual notifications.

### Defaulting to instant for everything

New users who sign up, trigger a few actions, and immediately get 8 emails in an hour will unsubscribe or mark you as spam. Default to digest mode for high-frequency categories. Let users opt into instant delivery.

### Making the preference center hard to find

If the only way to reduce notifications is to unsubscribe entirely, that's what users will do. Put "Manage notification preferences" in every email footer, right next to the unsubscribe link. Better yet, offer inline frequency controls: "Too many emails? Switch to weekly digest" directly in the notification.

### Sending notifications for your benefit, not the user's

"You haven't logged in for 7 days!" is for your engagement metrics, not for the user. Re-engagement notifications should offer genuine value: "3 tasks are waiting for your review" is actionable. "We miss you!" is not.

### Ignoring engagement signals

Continuing to send the same volume to users who stopped opening emails 30 days ago. Track per-recipient engagement and automatically reduce frequency for disengaged users. After 30+ days of no engagement despite multiple sends, stop non-critical notifications entirely until the user re-engages.

### Not separating transactional and notification infrastructure

When your notification emails share infrastructure with marketing campaigns, a bad marketing send (high bounces or complaints) can damage delivery of your transactional and notification emails. Use separate sending domains or subdomains: `notifications.example.com` for product notifications, `mail.example.com` for marketing.

### No deduplication

User triggers the same action twice (double-clicks, page refresh, API retry) and gets duplicate notifications. Use deduplication keys tied to the event, not the request. If the same comment already generated a notification, don't send another one.

---

## Implementation checklist

- [ ] **Notification taxonomy**: Document every notification type with urgency level, default channel, and default frequency
- [ ] **Channel routing**: Route each type to the appropriate channel (email, push, in-app) based on urgency
- [ ] **Digest system**: Implement time-based digests for activity and social notifications
- [ ] **Frequency caps**: Set per-recipient, per-category limits with overflow to digest
- [ ] **Preference center**: Build with per-type granularity, pause option, and no-login-required access
- [ ] **Fatigue monitoring**: Track per-recipient engagement and auto-reduce frequency for disengaged users
- [ ] **Deduplication**: Dedupe on event identity, not request identity
- [ ] **Threading**: Use consistent message headers to group related notifications
- [ ] **Separate infrastructure**: Use dedicated sending domain/subdomain for notifications
- [ ] **Plain text fallback**: Include plain text version of every notification
- [ ] **Per-type metrics**: Track open, click, unsubscribe, and complaint rates per notification category
- [ ] **Compliance**: Unsubscribe option in every email, preference center meets CAN-SPAM/GDPR requirements

---

## References

- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-Click Unsubscribe (required for marketing/promotional notifications)
- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - complaint rate thresholds and bulk sender requirements
- [Smashing Magazine: Design Guidelines for Better Notifications UX](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/) - urgency-channel mapping, user notification profiles
- [Padlet: Designing an Email Notification System That Respects Your Inbox](https://padlet.blog/designing-an-email-notification-system-that-respects-your-inbox/) - activity spike batching, relevance minimum bar
- [Postmark: Transactional Email Best Practices](https://postmarkapp.com/guides/transactional-email-best-practices) - separating transactional from marketing infrastructure
- [OneSignal: When to Use Push, SMS, Email, and In-App Messaging](https://onesignal.com/blog/app-communication-when-to-use-push-notifications-sms-and-in-app-messaging/) - channel selection framework
- [Courier: How to Reduce Notification Fatigue](https://www.courier.com/blog/how-to-reduce-notification-fatigue-7-proven-product-strategies-for-saas) - digest strategies, throttling, and smart batching
- [SuprSend: Best Practices for Batching & Digest](https://docs.suprsend.com/docs/best-practices-for-batching-digest) - time-based vs event-based batching patterns
- [Litmus: Email Preference Center Best Practices](https://www.litmus.com/blog/email-preferences-center-best-practices) - preference center design and compliance
- [MailerLite: Email Cadence and Frequency Best Practices](https://www.mailerlite.com/blog/email-cadence-and-frequency-best-practices) - frequency benchmarks by industry

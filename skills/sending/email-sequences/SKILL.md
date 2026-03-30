# Email Sequences

Design and run automated email sequences (drip campaigns) that convert without fatiguing recipients or damaging sender reputation.

## When to use this skill

- Building an onboarding, nurture, re-engagement, or winback sequence
- Deciding how many emails to include and how far apart to space them
- Setting up entry triggers and exit conditions for automated flows
- Adding branching logic based on opens, clicks, replies, or behavior
- Running A/B tests within a sequence (subject lines, content, timing)
- Diagnosing why a sequence has declining engagement or rising unsubscribes
- Preventing overlap between multiple sequences hitting the same contact

## Related skills

- `onboarding-emails` - deep dive on welcome and activation sequences specifically
- `cold-outreach` - cold email follow-up sequences (different rules, different infrastructure)
- `email-copywriting` - writing emails people actually read
- `ab-testing` - testing methodology beyond sequence-specific tests
- `suppression-lists` - managing bounces, complaints, and opt-outs
- `bounce-handling` - processing delivery failures and retry strategies
- `rate-limiting` - volume controls that protect reputation
- `email-compliance` - CAN-SPAM, GDPR, CASL, unsubscribe requirements
- `sender-reputation` - monitoring and recovering reputation

---

## Sequence types and recommended structure

Different goals require different sequence shapes. Here are the common types with proven structures.

### Onboarding / welcome

Goal: get a new user to their first success moment.

| Step | Timing | Content |
|------|--------|---------|
| 1 | Immediate | Welcome + single most important next action |
| 2 | Day 1 | Quick win - help them complete one key task |
| 3 | Day 3 | Feature highlight relevant to their use case |
| 4 | Day 5 | Social proof - how others succeeded |
| 5 | Day 7 | Check-in - ask if they need help |

**Length:** 3-5 emails over 7-10 days. Welcome emails get 60%+ open rates - the rest of the sequence won't match that. Front-load your most important content.

**Exit when:** user completes the activation milestone (not just opens an email).

### Lead nurture

Goal: move a prospect from awareness to purchase readiness.

| Step | Timing | Content |
|------|--------|---------|
| 1 | Day 0 | Value-first content related to their interest |
| 2 | Day 3 | Educational content addressing a pain point |
| 3 | Day 7 | Case study or social proof |
| 4 | Day 10 | How your product solves their specific problem |
| 5 | Day 14 | Soft CTA - free trial, demo, consultation |
| 6 | Day 21 | Final value piece + direct CTA |

**Length:** 5-8 emails over 2-4 weeks. Space emails 2-4 days apart. Never more than 3 emails per week.

**Exit when:** prospect converts (signs up, books demo, makes purchase) or replies.

### Re-engagement

Goal: revive contacts who stopped opening or clicking.

| Step | Timing | Content |
|------|--------|---------|
| 1 | Day 0 | "We noticed you've been quiet" + best recent content |
| 2 | Day 4 | What's new since they disengaged |
| 3 | Day 10 | Direct ask - "still interested?" with easy opt-out |

**Length:** 2-3 emails over 10-14 days. Shorter is better - if 3 emails don't re-engage them, more won't either.

**Exit when:** contact engages (opens, clicks), or after the final email. If no engagement after the sequence, move to suppression or reduce to quarterly cadence.

### Winback

Goal: recover a cancelled customer or lost deal.

| Step | Timing | Content |
|------|--------|---------|
| 1 | Day 1 after cancellation | Acknowledge + ask why |
| 2 | Day 7 | Address common objections + what's changed |
| 3 | Day 14 | Incentive offer (if applicable) |
| 4 | Day 30 | Final reach-out + easy re-activation path |

**Length:** 3-4 emails over 30 days. Wider spacing - they just left, so don't be aggressive.

**Exit when:** customer re-activates, replies, or explicitly declines.

### Upsell / cross-sell

Goal: expand an existing customer relationship.

| Step | Timing | Content |
|------|--------|---------|
| 1 | Triggered by usage milestone | Congratulate + introduce next tier/feature |
| 2 | Day 3 | How similar customers benefited from the upgrade |
| 3 | Day 7 | ROI comparison or specific value unlock |

**Length:** 2-3 emails. Only trigger when usage data actually supports the upsell. Untargeted upsells annoy people fast.

**Exit when:** customer upgrades, dismisses, or replies.

---

## Timing and cadence

### Spacing between emails

The right gap depends on urgency and sequence type:

| Context | Minimum gap | Sweet spot | Maximum gap |
|---------|-------------|------------|-------------|
| Post-signup onboarding | 1 day | 2 days | 3 days |
| Lead nurture | 2 days | 3-4 days | 7 days |
| Re-engagement | 3 days | 4-5 days | 7 days |
| Winback | 5 days | 7 days | 14 days |
| Post-purchase education | 2 days | 3-4 days | 7 days |

**Never send more than 3 emails per week to the same contact across all sequences combined.** This is the single most important cadence rule. Exceeding this drives unsubscribes and spam complaints regardless of how good the content is.

### Send timing

- **Weekdays outperform weekends** for B2B. Tuesday, Wednesday, and Thursday are the strongest days.
- **B2C is more flexible** - weekends can work for consumer products, especially Saturday morning.
- **Send during business hours in the recipient's timezone.** 9 AM - 3 PM local time gets the best open rates.
- **Avoid Monday morning and Friday afternoon.** Inboxes are either overloaded or already mentally checked out.

### Fatigue scoring

Track engagement signals per contact and adjust cadence dynamically. A simple fatigue model:

```
Fatigue score components:
- Send frequency (0-30 points): >5/week = 30, >3/week = 20, >1/week = 10
- Monthly volume (0-15 points): >20/month = 15, >10/month = 10, >5/month = 5
- Bounces (0-20 points): each bounce = 10 points (cap at 20)
- Complaints (0-25 points): each complaint = 15 points (cap at 25)
- Engagement decay (0-10 points): >30 days since last engagement = 10

Thresholds:
- Score >= 70: stop sending
- Score >= 40: reduce frequency
- Score < 40: safe to send
```

When the fatigue score hits "reduce frequency," double the gap between sequence emails. When it hits "stop sending," pause the sequence and move the contact to a re-engagement flow instead.

---

## Entry triggers

### Event-based triggers (best)

Start a sequence when a specific event occurs:

- **Signup completed** - onboarding sequence
- **Trial started** - trial nurture sequence
- **Cart abandoned** - recovery sequence (send within 1 hour)
- **Feature milestone reached** - upsell sequence
- **Subscription cancelled** - winback sequence
- **Inactivity threshold** - re-engagement sequence (e.g., no login for 14 days)

Event triggers are the most reliable because they're based on something the contact actually did (or stopped doing).

### Segment-based triggers

Enroll contacts when they match specific criteria:

```
Segment: "Trial users who used Feature X but not Feature Y"
Filter:
  - lifecycle_stage = "trial"
  - AND event_count("feature_x_used", last 7 days) > 0
  - AND event_count("feature_y_used", last 7 days) = 0
```

Segment-based triggers are powerful for targeting specific user profiles but require clean data. Evaluate segments on a schedule (daily or hourly), not continuously, to avoid race conditions.

### Manual enrollment

For sales-driven sequences where a human decides to enroll a prospect. Always check suppression status before enrollment.

### Trigger rules

- **One trigger per sequence.** If multiple events should start the same email flow, route them through a single entry point that deduplicates.
- **Deduplicate enrollments.** A contact should only have one active run per sequence. If the trigger fires again while they're already in the sequence, ignore it.
- **Check suppressions at enrollment.** Don't enroll contacts who have unsubscribed, complained, or hard-bounced.

---

## Exit conditions

Exit conditions determine when to stop sending to a contact before the sequence finishes naturally. Get these wrong and you'll send irrelevant emails that damage trust and deliverability.

### Required exit conditions

Every sequence needs these:

1. **Goal achieved.** The contact did the thing the sequence was designed to produce (purchased, activated, booked a demo). This is the happy path exit.
2. **Explicit opt-out.** The contact unsubscribed or replied asking to stop. Honor immediately - not after the next scheduled email.
3. **Hard bounce.** The email address doesn't exist. Remove from the sequence and suppress.
4. **Spam complaint.** Stop all email to this contact, not just the current sequence.
5. **Reply received.** In most cases, a reply means the conversation should move to a human or a different flow. Continuing the automated sequence after a reply looks robotic and damages trust.

### Recommended exit conditions

6. **Entered a higher-priority sequence.** If a lead nurture contact starts a free trial, they should exit the nurture sequence and enter the onboarding sequence instead.
7. **Fatigue threshold crossed.** If the contact's engagement has been declining across all email, pause rather than keep sending.
8. **Negative signal detected.** If inbound reply classification detects intent like "objection" or "not_now," exit the sequence and route appropriately.

### Implementing exit conditions

Check exit conditions at two points:

- **At enrollment** - don't start a sequence for a suppressed contact
- **Before each step executes** - re-evaluate conditions before every send, not just at enrollment

This matters because a contact might reply between step 2 and step 3. If you only check conditions at enrollment, step 3 fires anyway.

```
Before executing step N:
1. Is the contact suppressed? -> exit
2. Has the contact achieved the goal? -> exit
3. Has the contact replied? -> exit (route to human/different flow)
4. Is the contact in a higher-priority sequence? -> exit
5. Does the fatigue score say "stop"? -> exit
6. Has the contact complained about any email? -> exit
All clear -> execute step N
```

---

## Branching logic

Branching transforms a linear sequence into an adaptive flow that responds to what each contact does.

### Behavioral branches

Branch based on what the contact did (or didn't do) in previous steps:

```json
{
  "type": "branch",
  "config": {
    "conditions": [
      { "field": "lastLoginDaysAgo", "operator": "lt", "value": "7" }
    ],
    "onMatch": { "nextStep": 5 },
    "onNoMatch": { "nextStep": 4 }
  }
}
```

Common behavioral branches:

| Condition | Yes path | No path |
|-----------|----------|---------|
| Opened previous email | Send deeper content | Re-send with new subject line |
| Clicked a specific link | Send related content/offer | Continue nurture track |
| Used a feature | Advance to next feature | Send help content for current feature |
| Replied (positive intent) | Route to sales | Continue sequence |
| Logged in during delay | End sequence (intervention worked) | Continue to next step |

### Segment-based branches

Branch based on contact attributes, not just behavior:

```
If contact.lifecycle_stage == "enterprise":
  -> send enterprise case study
Else:
  -> send SMB case study
```

### Time-based branches

Branch based on when the contact entered or how long they've been in the sequence:

```
If days_since_enrollment > 30 and no_engagement:
  -> move to re-engagement track
Else:
  -> continue nurture
```

### Keep branching simple

Every branch doubles the paths you need to test and maintain. In practice:

- **1-2 branch points** per sequence works well
- **3+ branch points** creates complexity that rarely improves results enough to justify the maintenance cost
- If you need heavy branching, you probably need separate sequences for separate segments instead

---

## A/B testing within sequences

### What to test

Test one variable at a time within a single step. The most impactful variables, in order:

1. **Subject line** - highest impact, easiest to test
2. **Send time** - morning vs. afternoon, different days
3. **CTA** - button text, placement, number of CTAs
4. **Content length** - short vs. long
5. **Content approach** - educational vs. social proof vs. direct pitch

### How to test

For each step you want to test, create variants with different weights:

```
Step 3 - Feature highlight:
  Variant A (50%): "3 ways to use [feature]" (educational)
  Variant B (50%): "How [company] increased revenue 40% with [feature]" (social proof)
```

Use deterministic assignment - the same contact should always see the same variant if re-evaluated. Hash-based bucketing (hash of experiment ID + contact email) ensures consistency without storing assignments upfront.

### Statistical significance

Don't call a winner too early. You need enough data:

- **Minimum sample size:** at least 200-300 sends per variant before drawing conclusions
- **Significance threshold:** p-value < 0.05 (95% confidence)
- **Run time:** let the test run for at least one full cycle through the step (all contacts in the current cohort should have received it)

A two-proportion z-test works for comparing conversion rates between variants. If your control converts at 5% and the variant converts at 7%, you need roughly 1,500 sends per variant to detect that difference with 95% confidence.

### What to measure

Don't optimize for opens alone. Measure by step position:

| Metric | Use for |
|--------|---------|
| Open rate | Subject line tests |
| Click rate | CTA and content tests |
| Reply rate | Nurture and outreach sequences |
| Conversion rate | The actual goal metric - sign up, purchase, activation |
| Unsubscribe rate | Safety check - if a variant increases unsubs, kill it regardless of other metrics |

---

## Sequence performance metrics

### Per-step metrics

Track these for every step in the sequence:

| Metric | What it tells you | Action threshold |
|--------|-------------------|-----------------|
| Delivery rate | Infrastructure health | < 95% = fix bounces/list quality |
| Open rate | Subject line + sender relevance | < 15% = rework subject or timing |
| Click rate | Content + CTA relevance | < 1.5% = rework content or CTA |
| Reply rate | Engagement quality | Depends on sequence type |
| Unsubscribe rate | Fatigue / relevance | > 0.5% per step = rethink content or cadence |
| Spam complaint rate | Serious reputation risk | > 0.1% = stop and investigate |

### Sequence-level metrics

| Metric | How to calculate | Healthy range |
|--------|-----------------|---------------|
| Completion rate | Contacts who reached last step / total enrolled | 40-70% (varies by length) |
| Goal conversion rate | Contacts who achieved goal / total enrolled | Depends on goal |
| Step-over-step retention | Opens at step N / opens at step N-1 | > 80% step-to-step |
| Average time to conversion | Mean time from enrollment to goal event | Track trend, not absolute |
| Revenue per sequence run | Total attributed revenue / total runs | Compare across sequences |

### Drop-off analysis

The most actionable sequence metric is **where people stop engaging**. Plot open/click rates by step:

```
Step 1: 45% open, 8% click
Step 2: 38% open, 5% click
Step 3: 35% open, 4% click   <- normal decay
Step 4: 18% open, 1% click   <- problem step - content, timing, or fatigue
Step 5: 15% open, 0.8% click
```

A steep drop between specific steps means something is wrong with that email or the gap before it. A gradual decline across all steps means the sequence is too long.

### Attribution

Tie sequence sends to business outcomes. Each email in the sequence is a touchpoint, and when a contact converts, attribute the conversion to the steps that preceded it.

Common attribution models for sequences:

- **Last touch:** credit the final email before conversion. Simple but undervalues earlier nurturing steps.
- **First touch:** credit the first email. Useful for measuring which sequences initiate journeys that eventually convert.
- **Linear:** equal credit to every step the contact received. Best default for sequence optimization.
- **Time decay:** more credit to recent touches. Good for long sequences where later steps are more directly influential.

---

## Preventing sequence overlap

When a contact is eligible for multiple sequences, you need rules to prevent them from getting buried in email.

### Priority system

Rank your sequences by priority:

```
Priority 1: Transactional (receipts, password resets) - always send
Priority 2: Onboarding (new user activation) - high priority
Priority 3: Trial expiration (time-sensitive) - high priority
Priority 4: Nurture (education, relationship) - medium priority
Priority 5: Re-engagement (reviving inactive) - low priority
Priority 6: Upsell/cross-sell - low priority
Priority 7: Marketing newsletter - lowest priority
```

When a contact qualifies for a higher-priority sequence, either:
- **Pause** lower-priority sequences (resume when the higher-priority one finishes)
- **Exit** lower-priority sequences (re-evaluate enrollment later)

### Global send budget

Regardless of how many sequences a contact is in, cap the total sends per contact:

- **Maximum 3 emails per week** across all sequences combined
- **Maximum 10 emails per month** across all sequences combined
- **Minimum 24-hour gap** between any two emails to the same contact

When a sequence step is due but the contact has hit their send budget, delay it - don't skip it. Skipping creates holes in the sequence logic.

### Cooldown enforcement

Enforce cooldowns at the infrastructure level, not in sequence logic. The sequence shouldn't need to know about other sequences - it just sends, and the policy layer blocks if cooldown hasn't elapsed.

```json
{
  "status": "blocked",
  "reason": "cooldown",
  "detail": "Contact received a message 18 hours ago. Cooldown is 48h.",
  "nextEligibleAt": "2026-03-31T08:00:00Z"
}
```

The sequence engine reschedules the step for `nextEligibleAt` and continues normally.

---

## Sequence architecture

### State management

Each sequence run needs to track:

- **Run ID** - unique identifier for this contact's run through this sequence
- **Current step** - which step is next
- **Status** - active, paused, completed, exited
- **Context** - data collected during the run (which branches taken, engagement data)
- **Enrollment time** - when the contact entered

The key architectural decision: **the sequence engine should be stateful, but email sending should be stateless.** The engine tracks where each contact is in the sequence. Each individual send goes through the same policy evaluation as any other email - deduplication, suppression, rate limiting, cooldown.

### Step types

A well-designed sequence engine supports these step types:

| Type | Purpose |
|------|---------|
| `send` | Send an email using a specific template |
| `delay` | Wait a specified duration before the next step |
| `branch` | Evaluate conditions and route to different steps |
| `end` | Terminate the sequence run |

Example journey definition:

```json
{
  "name": "Trial nurture",
  "triggerEvent": "trial.started",
  "steps": [
    {
      "type": "send",
      "position": 1,
      "config": {
        "templateId": "trial-welcome",
        "payload": { "subject": "Welcome to your trial" }
      }
    },
    {
      "type": "delay",
      "position": 2,
      "config": { "delayMinutes": 4320 }
    },
    {
      "type": "branch",
      "position": 3,
      "config": {
        "conditions": [
          { "field": "hasCompletedSetup", "operator": "eq", "value": true }
        ],
        "onMatch": { "nextStep": 5 },
        "onNoMatch": { "nextStep": 4 }
      }
    },
    {
      "type": "send",
      "position": 4,
      "config": {
        "templateId": "trial-setup-help",
        "payload": { "subject": "Need help getting started?" }
      }
    },
    {
      "type": "send",
      "position": 5,
      "config": {
        "templateId": "trial-power-features",
        "payload": { "subject": "3 features most teams discover in week 2" }
      }
    },
    {
      "type": "delay",
      "position": 6,
      "config": { "delayMinutes": 7200 }
    },
    {
      "type": "send",
      "position": 7,
      "config": {
        "templateId": "trial-ending-soon",
        "payload": { "subject": "Your trial ends in 3 days" }
      }
    },
    {
      "type": "end",
      "position": 8
    }
  ]
}
```

### Deduplication

Each contact should only have one active run per sequence. If the trigger event fires again while a run is active, the second run should be rejected. This prevents the most common sequence failure: a customer getting duplicate emails because multiple instances of an automation detected the same condition.

Use a dedupe key composed of `journeyId + contactEmail` and check for active runs before creating a new one.

### Reply handling

When a contact replies to a sequence email, the reply should be classified by intent and routed accordingly:

| Intent | Action |
|--------|--------|
| `interested` | Exit sequence, route to sales/human |
| `objection` | Exit sequence, route to human review |
| `not_now` | Pause sequence, schedule re-evaluation in 30 days |
| `out_of_office` | Keep in sequence, extend delays by OOO duration |
| `unsubscribe` | Exit sequence, add to suppression list |

Continuing to send automated emails after someone has replied is the fastest way to get spam complaints. Even if the reply is just "thanks," pause the sequence and evaluate.

---

## Common mistakes

### 1. No exit conditions beyond sequence completion

The sequence has 7 steps, so every contact gets all 7 emails regardless of what happens. A contact who purchased after step 2 still gets step 3-7 ("here's why you should buy"). This is the most common sequence mistake and the most damaging to trust.

**Fix:** Implement goal-based exits. Check before every step whether the contact has already achieved the sequence goal.

### 2. Ignoring replies

Contact replies "Not interested right now" and still gets the next 4 emails on schedule. Nothing says "automated" louder than ignoring a direct response.

**Fix:** Classify inbound replies by intent and exit or pause the sequence when a reply is received.

### 3. No cross-sequence coordination

A contact is in the onboarding sequence, the trial expiration sequence, AND the feature education sequence simultaneously. They get 3 emails on Tuesday.

**Fix:** Implement a global send budget per contact. Cap at 3 emails/week across all sequences. Use sequence priority to determine which emails get delayed when the budget is hit.

### 4. Testing on opens instead of conversions

You A/B test subject lines and pick the variant with higher opens. But the high-open variant had clickbait subjects that led to lower conversions. Opens are a proxy metric, not the goal.

**Fix:** Measure the metric that matters for the sequence goal - conversion rate, activation rate, revenue per contact.

### 5. Sequences that are too long

A 12-email nurture sequence running over 8 weeks. By step 8, open rates are 5% and you're just training spam filters. Engagement data consistently shows that most reply/conversion value comes from the first 4-5 emails.

**Fix:** Start with 3-5 emails. Add steps only when data shows contacts are still engaging at that point in the sequence.

### 6. Same content to everyone

A single nurture sequence for all leads regardless of industry, company size, or stated interest. The content is generic enough to be irrelevant to everyone.

**Fix:** Use segment-based branching or separate sequences for meaningfully different audiences. Two well-targeted 4-email sequences beat one generic 8-email sequence.

### 7. No warmup for sequence volume

You build a 5-step sequence and enroll 10,000 contacts on day one. Even if the emails are great, sending 10,000 emails from a new template in the first hour triggers rate limits and spam filters.

**Fix:** Ramp enrollment gradually. Start with 100-200 contacts, monitor delivery and engagement, then increase by 2x every few days. See the `email-warmup` skill.

### 8. Sending during cooldown windows

The sequence engine doesn't know about the cooldown from yesterday's transactional email, so it fires step 3 six hours after a receipt email. The contact gets two emails in half a day.

**Fix:** Enforce cooldowns at the infrastructure level, not in the sequence. Every send - whether from a sequence, a transactional trigger, or a one-off campaign - goes through the same policy engine. The sequence should handle "blocked: cooldown" responses by rescheduling, not by skipping.

---

## Checklist: launching a new sequence

- [ ] Sequence has a clear, measurable goal (not "engagement" - a specific conversion event)
- [ ] Entry trigger is defined and deduplication is in place
- [ ] Exit conditions cover: goal achieved, reply received, unsubscribe, bounce, complaint
- [ ] Each step has a minimum delay of 24 hours from the previous step
- [ ] Total emails per week per contact won't exceed 3 across all active sequences
- [ ] Suppression list is checked at enrollment AND before each step
- [ ] Reply handling is configured - replies exit or pause the sequence
- [ ] Fatigue scoring is active - contacts with high fatigue get reduced frequency or are paused
- [ ] A/B tests (if any) have enough expected volume for statistical significance
- [ ] Initial enrollment is ramped gradually, not all at once
- [ ] Step-level metrics are being tracked (delivery, open, click, unsubscribe, complaint)
- [ ] Drop-off analysis is set up to identify problem steps
- [ ] Sequence priority is set relative to other active sequences

---

## References

- [Mailchimp - What Is an Email Sequence](https://mailchimp.com/resources/email-sequence/) - fundamentals and examples
- [MailerLite - Email Cadence & Frequency Best Practices](https://www.mailerlite.com/blog/email-cadence-and-frequency-best-practices) - data-backed timing guidance
- [Omnisend - Email Automation](https://www.omnisend.com/blog/email-automation/) - automation benchmarks (automations earn 16x more per send than broadcast)
- [Moosend - Email Fatigue](https://moosend.com/blog/email-fatigue/) - fatigue signals and prevention
- [Instantly - Email Sequence Troubleshooting](https://instantly.ai/blog/email-sequence-troubleshooting-why-sequences-fail-and-how-to-fix-them/) - common technical failures
- [ActiveCampaign - Email Marketing Benchmarks 2025](https://www.activecampaign.com/glossary/email-marketing-benchmarks) - industry benchmark data
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-Click Unsubscribe (required for marketing sequences)
- [Google Email Sender Guidelines](https://support.google.com/a/answer/81126) - bulk sender requirements
- [M3AAWG Best Practices](https://www.m3aawg.org/published-documents) - industry standards for responsible sending

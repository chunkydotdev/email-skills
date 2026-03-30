---
name: reply-classification
description: Classify inbound email replies by intent and route them appropriately. Use when building reply handling for outreach, support, or transactional email - detecting interested, not interested, OOO, bounce, unsubscribe, forwarded, and question replies.
license: MIT
---

# Reply Classification

Classify inbound email replies so your system knows what happened and what to do next.

## When to use this skill

- Building automated reply handling for sales outreach or drip campaigns
- Detecting out-of-office, bounce, and auto-reply messages
- Routing replies to the right team or queue based on intent
- Deciding whether to continue, pause, or stop a sequence based on reply content
- Triaging inbound email for support or transactional flows
- Building human escalation triggers for ambiguous or high-risk replies

## Related skills

- `inbound-processing` - receiving and parsing incoming email before classification
- `thread-management` - maintaining conversation context across reply chains
- `bounce-handling` - processing hard/soft bounces and retry strategies
- `suppression-lists` - managing bounces, complaints, and opt-outs after classification
- `email-compliance` - legal requirements for honoring unsubscribe replies

---

## The classification taxonomy

Start with a taxonomy that maps cleanly to actions. Too many categories creates ambiguity; too few misses important signals. Here is a proven set of 9 categories that covers the vast majority of reply types:

| Intent | Description | Typical action |
|--------|------------|----------------|
| `interested` | Positive engagement - wants to learn more, book a meeting, see pricing | Notify owner immediately (5-min SLA) |
| `not_now` | Timing is wrong but not a hard no - "maybe next quarter", "circle back later" | Auto-archive, schedule follow-up |
| `objection` | Hard no - "not interested", "remove me", "stop emailing" | Auto-archive, suppress from sequence |
| `out_of_office` | Vacation, leave, or away auto-reply | Auto-archive, note return date if present |
| `unsubscribe` | Explicit opt-out request | Honor immediately, add to suppression list |
| `question` | Asks a question without clear positive/negative signal | Route to owner for manual response |
| `support` | Reports a problem, bug, or needs help | Route to support queue |
| `billing` | Invoice, payment, refund, or subscription topic | Route for approval (60-min SLA) |
| `unclassified` | No clear signal - short replies, ambiguous content | Route to owner with low-confidence flag |

Some systems add `referral` (forwarded to a colleague), `meeting_booked` (calendar confirmation), or `legal`/`security` for sensitive intents. Add these only when you have distinct actions for them - categories without actions just create noise.

### Sensitive vs. routine intents

Not all intents should be handled the same way. Split them into tiers:

- **Auto-actionable:** `out_of_office`, `not_now`, `objection` - safe to archive or suppress automatically when confidence is high.
- **Notify-and-act:** `interested`, `question`, `support` - route to a human but don't block on approval.
- **Require approval:** `billing`, `legal`, `security` - never auto-act. These need human review before any response.
- **Immediate compliance:** `unsubscribe` - must be honored within 10 business days per CAN-SPAM, but best practice is to process within seconds.

---

## Auto-reply and OOO detection

Auto-replies are the easiest category to detect with near-perfect accuracy because they follow standardized patterns. Always check headers before content.

### Header-based detection (check these first)

These headers are defined by RFC 3834 and widely used. If any match, the message is an auto-reply - skip content analysis entirely.

**Auto-Submitted (RFC 3834):**
```
Auto-Submitted: auto-replied
Auto-Submitted: auto-generated
Auto-Submitted: auto-notified
```
Any value other than `no` (or absent) means the message is automated. This is the most reliable signal.

**Precedence:**
```
Precedence: bulk
Precedence: auto_reply
Precedence: list
Precedence: junk
```
Legacy header, but still widely set. Treat `bulk`, `auto_reply`, `list`, and `junk` as auto-generated.

**X-Auto-Response-Suppress (Microsoft Exchange/Outlook):**
```
X-Auto-Response-Suppress: All
X-Auto-Response-Suppress: DR, AutoReply
X-Auto-Response-Suppress: OOF
```
If this contains `DR`, `AutoReply`, `OOF`, or `All`, the message is automated. Microsoft products set this consistently.

**Other indicators:**
- `X-Autoreply: yes` - some mail servers set this
- `X-Mail-Autoreply: yes` - variant
- `Return-Path: <>` (empty) - DSN/bounce, not a human reply
- `From` or `Reply-To` contains `noreply@`, `no-reply@`, or `no_reply@`
- `Content-Type` includes `report-type=delivery-status` - this is a DSN (RFC 3464)
- `List-Unsubscribe` header present - newsletter, not a personal reply

### Subject-line patterns

If headers are inconclusive, check the subject:

```
/^(re:\s*)?(out of office|ooo|away from|on vacation|on leave|automatic reply|auto[\s-]?reply|autoreply)/i
```

Also check for localized variants:
- French: `Absence du bureau`, `Re automatique`
- German: `Abwesenheitsnotiz`, `Automatische Antwort`
- Spanish: `Fuera de la oficina`, `Respuesta automatica`
- Portuguese: `Fora do escritorio`, `Resposta automatica`
- Japanese: `不在`
- Chinese: `外出`

### Body patterns for OOO

When headers and subject are ambiguous, scan the body for patterns:

```
/I am (currently )?(out of (the )?office|on vacation|on leave|away|unavailable)/i
/I will (be )?(back|return|returning) (on |by )?/i
/limited access to email/i
/I will respond (to your (email|message) )?when I return/i
/If (this is |your matter is )?urgent/i
/please contact .+ in my absence/i
```

The combination of two or more of these patterns in a single message is a very strong OOO signal.

### Return date extraction

OOO messages often contain a return date. Extract it to schedule follow-ups:

```
/(?:back|return|returning|available)\s+(?:on\s+)?(\w+ \d{1,2}(?:,?\s+\d{4})?|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i
```

Parse dates carefully - handle both US (MM/DD) and international (DD/MM) formats. When in doubt, default to the interpretation that produces a future date.

---

## Bounce detection

Bounces arrive as DSNs (Delivery Status Notifications, RFC 3464) or as freeform rejection messages from mail servers.

### DSN detection via headers

```
Content-Type: multipart/report; report-type=delivery-status
```

If this header is present, parse the `message/delivery-status` MIME part for the status code:

| Code pattern | Meaning | Classification |
|-------------|---------|----------------|
| `5.1.1` | Mailbox does not exist | Hard bounce |
| `5.1.2` | Domain does not exist | Hard bounce |
| `5.2.1` | Mailbox disabled | Hard bounce |
| `5.2.2` | Mailbox full | Soft bounce |
| `5.4.1` | No answer from host | Soft bounce |
| `5.7.1` | Delivery not authorized | Hard bounce (policy) |
| `4.x.x` | Transient failure | Soft bounce |

### Subject-line bounce patterns

Many bounces don't use proper DSN format. Detect them via subject:

```
/^(returned mail|undeliverable|delivery (status )?notification|mail delivery (failed|failure)|failure notice|returned to sender)/i
```

### Action on bounces

- **Hard bounce:** Suppress the recipient immediately. Never retry.
- **Soft bounce:** Retry with exponential backoff (e.g., 1h, 4h, 12h). Suppress after 3-5 consecutive soft bounces within 7 days.

---

## Keyword-based intent classification

For replies that aren't auto-generated or bounces, classify by intent using keyword matching. This is the workhorse of most classification systems.

### Scoring approach

A weighted keyword scoring system outperforms simple keyword presence checks. For each intent, maintain a list of keywords with a base weight. Then score:

1. **Count keyword matches** in both subject and body.
2. **Weight subject matches higher** (3x is a good starting multiplier) - subject lines are more intentional than body text.
3. **Factor in keyword density** - "interested" in a 500-word email is weaker than "interested" in a 10-word reply.
4. **Cap the boost** from multiple matches to prevent runaway scores.
5. **Pick the highest-scoring intent** as the classification.

### Example keyword lists

**Interested (weight: 0.85):**
```
interested, tell me more, demo, schedule a call, set up a meeting,
learn more, pricing, sounds great, let's chat, let's connect, free trial,
show me, walk me through, send me info, book a time
```

**Objection (weight: 0.85):**
```
not interested, no thanks, no thank you, unsubscribe, remove me,
stop emailing, do not contact, opt out, take me off, please stop,
wrong person, not relevant
```

**Not now (weight: 0.80):**
```
not right now, not interested right now, maybe later, reach out later,
bad timing, next quarter, next year, circle back, check back,
not a priority, too busy right now
```

**Support (weight: 0.75):**
```
help, support, issue, problem, bug, error, not working, broken,
trouble, can't access, doesn't work, how do I
```

**Billing (weight: 0.85):**
```
invoice, billing, payment, charge, refund, subscription,
cancel subscription, receipt, credit, pricing question
```

### Handling short replies

Short replies (under 5 words) are common and tricky. "Thanks" could be positive acknowledgment or dismissal. "OK" could mean interested or just acknowledging receipt.

Rules of thumb:
- Single-word positive ("Thanks", "Great", "Perfect") - classify as weak `interested` with low confidence.
- Single-word negative ("No", "Pass", "Stop") - classify as `objection`.
- Single-word ambiguous ("OK", "Sure", "Fine") - classify as `unclassified` and route to owner.
- If the reply is part of a thread, use the thread context to disambiguate. A "Thanks" after a demo scheduling email is `interested`. A "Thanks" after an intro email is ambiguous.

---

## Conflict detection

Sometimes a reply matches multiple intents. "I'm interested but the timing is bad - maybe next quarter" scores for both `interested` and `not_now`. This is common and you need a strategy for it.

### When to flag conflicts

Flag a conflict when:
- The top two intents both score above a minimum threshold (e.g., 0.5) AND the gap between them is small (e.g., less than 0.15).
- The top two intents are an opposing pair (`interested` + `objection`, `interested` + `not_now`, `out_of_office` + `interested`).

### What to do with conflicts

Conflicting intents should escalate to human review. Never auto-act on a conflicting classification. The routing action should be `require_approval` with a short SLA (15 minutes).

Include both intents and their scores in the classification output so the reviewer has context:

```json
{
  "intent": "interested",
  "confidence": 0.72,
  "runnerUpIntent": "not_now",
  "runnerUpConfidence": 0.65,
  "flags": ["conflicting_intents"]
}
```

---

## Confidence scoring and thresholds

Raw keyword scores need to be normalized into a confidence value between 0 and 1. Key thresholds:

| Confidence | Meaning | Recommended action |
|-----------|---------|-------------------|
| 0.85+ | High confidence | Safe to auto-act (archive, notify) |
| 0.60-0.85 | Medium confidence | Act but flag for review if wrong |
| Below 0.60 | Low confidence | Do NOT auto-act. Route for human review |

### Low-confidence handling

When confidence is below 0.60, override the default routing action:
- If the default action is `auto_archive`, upgrade to `require_approval`.
- If the default action is `notify_owner`, upgrade to `require_approval`.
- Keep `require_approval` actions as-is (they're already going to a human).

This prevents false classifications from silently archiving important emails or triggering wrong workflows.

---

## Routing based on classification

Classification without routing is useless. Every intent needs a clear routing action.

### Routing action types

| Action | Description | When to use |
|--------|-------------|-------------|
| `notify_owner` | Send alert to the contact's owner/rep | Interested, support, unclassified |
| `auto_archive` | Mark as processed, no human action needed | OOO, not_now, objection (high confidence) |
| `require_approval` | Queue for human review before any action | Billing, legal, security, low-confidence |
| `escalate` | Flag for senior review | Safety concerns, adversarial content |
| `spam` | Route to spam queue | Failed safety classification |

### SLA by intent

Not all intents have the same urgency:

| Intent | SLA | Why |
|--------|-----|-----|
| `interested` | 5 minutes | Hot lead - speed matters |
| `security` | 15 minutes | Potential incident |
| `legal` | 30 minutes | Compliance risk |
| `support` | 30 minutes | Customer satisfaction |
| `billing` | 60 minutes | Revenue impact |
| `unclassified` | 60 minutes | Needs triage |
| `out_of_office` | None | Auto-archived |
| `not_now` | None | Auto-archived |
| `objection` | None | Auto-archived |

### Owner resolution

When routing to `notify_owner`, you need to resolve who the owner is. Typical resolution order:

1. Contact record's assigned owner (from CRM sync)
2. The sender of the original outbound email
3. Account-level owner
4. Default/fallback owner for the mailbox

If no owner can be resolved, treat it as `require_approval` - someone needs to claim it.

---

## Safety classification layer

Reply classification and safety classification are complementary but separate concerns. Intent classification asks "what does this person want?" Safety classification asks "is this message dangerous?"

Run safety classification in parallel with intent classification. Safety verdicts override intent-based routing:

| Safety verdict | Override action |
|---------------|----------------|
| `clean` | No override - use intent-based routing |
| `spam` | Route to spam queue |
| `phishing` | Quarantine for human review |
| `malware` | Reject or quarantine |
| `abuse` | Quarantine for human review |
| `impersonation` | Quarantine for human review |

### Signals that feed safety classification

- **Email authentication:** SPF/DKIM/DMARC failures increase phishing score.
- **Content patterns:** Executable references, urgency + credential requests, excessive caps, excessive links.
- **Sender reputation:** Historical spam reports, bounce rates, prior feedback.
- **Injection patterns:** Prompt injection attempts in the body (relevant when using LLMs to process replies).

### Whitelisted senders

Trusted senders (verified customers, known domains) should bypass safety classification to avoid false positives. Maintain a whitelist at both the email and domain level.

---

## Human escalation triggers

Some replies must always go to a human, regardless of classification confidence:

1. **Conflicting intents** - Two strong signals pointing in opposite directions.
2. **Adversarial position** - Keywords for sensitive intents (legal, security) appear only in the body with action indicators ("can you", "please", "help me") but not in the subject. This pattern suggests the sender is asking about these topics rather than representing them.
3. **Injection risk** - Prompt injection patterns detected in the body (if you use AI to process replies).
4. **Thread anomaly** - The reply's content is dramatically different from the thread history (e.g., a support thread suddenly containing legal language).
5. **High-risk intents** - Legal and security intents should never be bulk-approved or auto-actioned.

### Classification flags

Include flags in your classification output to explain why escalation happened:

| Flag | Meaning |
|------|---------|
| `conflicting_intents` | Top two intents are close in score or opposing |
| `adversarial_position` | Sensitive-intent keywords in unexpected position |
| `low_confidence` | Top score below confidence threshold |
| `injection_risk` | Prompt injection patterns detected |
| `thread_anomaly` | Reply doesn't match thread context |

---

## Next-best-action after classification

Classification feeds into a next-best-action engine that considers the full contact context, not just the current reply:

| Context | Recommendation |
|---------|---------------|
| Contact is suppressed | `stop` - do not send anything |
| Recent objection or negative signal | `stop` - respect the no |
| Unsafe safety verdict | `escalate` - human review needed |
| Sensitive intent (legal, billing, security) | `escalate` - human review |
| Positive intent (interested) | `reply` - respond promptly |
| Last outbound < 24h with no reply | `wait` - don't pile on |
| No activity > 7 days | `nudge` - gentle follow-up |
| No strong signal either way | `wait` - monitor for changes |

The key insight: a single reply's classification is necessary but not sufficient. You need the full timeline - sends, replies, bounces, journey state - to make a good decision.

---

## Rule-based vs. ML vs. LLM classification

Three approaches, each with trade-offs:

### Rule-based (keyword matching)

**Pros:** Deterministic, fast (sub-millisecond), no training data needed, easy to debug, no external dependencies.

**Cons:** Misses nuance, can't handle sarcasm or complex phrasing, requires manual keyword list maintenance.

**Best for:** Auto-reply/OOO detection (near-perfect accuracy), bounce detection, unsubscribe detection - categories with predictable patterns.

### Traditional ML (SVM, Naive Bayes, BERT fine-tuned)

**Pros:** Handles nuance better, learns from your data, good accuracy with 50-100 labeled examples per category.

**Cons:** Requires training data, needs retraining as language evolves, still struggles with very short replies.

**Best for:** Intent classification at scale when you have labeled training data from past campaigns.

### LLM-based (GPT, Claude, etc.)

**Pros:** Handles nuance and context exceptionally well, works zero-shot (no training data), understands sarcasm and complex phrasing.

**Cons:** Slow (100-500ms per classification), expensive at scale, non-deterministic, vulnerable to prompt injection in the email body.

**Best for:** Low-volume high-value classification, fallback for low-confidence rule-based results, classification where context from the thread matters.

### Recommended approach: layered classification

Use all three in layers:

1. **Headers first** (rule-based) - Catch auto-replies, bounces, and DSNs. This handles 20-40% of replies with near-perfect accuracy and zero latency.
2. **Keywords second** (rule-based) - Score remaining replies against keyword lists. This handles another 40-50% with good accuracy.
3. **ML/LLM third** (optional) - For low-confidence results from step 2, use a trained model or LLM to break ties. This catches the remaining 10-20% edge cases.

This layered approach gives you speed where it matters and accuracy where it's needed, without running every reply through an expensive model.

---

## Common mistakes

1. **Treating auto-replies as human responses.** OOO and auto-acknowledgment replies should never trigger sequence steps, CRM updates, or rep notifications. Check headers before content - always.

2. **Not honoring unsubscribes from replies.** When someone replies "unsubscribe" or "remove me", that's a valid opt-out even if they didn't click your unsubscribe link. CAN-SPAM requires you to honor any reasonable opt-out request. Process it immediately.

3. **Auto-acting on low-confidence classifications.** If your classifier is only 55% sure an email is "not interested", don't auto-archive it. That email might be from a prospect saying "I'm not interested in Plan A, but tell me about Plan B." Route low-confidence results to a human.

4. **Ignoring the runner-up intent.** When the top two intents are close in score, the classification is ambiguous. Logging only the winner throws away important signal. Always capture the runner-up intent and its score.

5. **Using a single threshold for all intents.** A 0.7 confidence for "out_of_office" is very different from 0.7 for "interested". OOO detection is reliable at 0.7; interest detection needs more scrutiny. Adjust thresholds per intent or at least per risk tier.

6. **Classifying without thread context.** "Yes" means nothing without knowing what question was asked. If you have thread history, use it. A "yes" reply to "Would you like a demo?" is `interested`. A "yes" reply to "Should I remove you from the list?" is `objection`.

7. **Running LLM classification on unsanitized email bodies.** Email bodies can contain prompt injection attacks. If you feed raw reply content into an LLM, an attacker can manipulate your classification. Sanitize content and use structured prompts that separate the instruction from the email content.

8. **Treating all bounces the same.** Hard bounces (5.1.1 - mailbox doesn't exist) and soft bounces (5.2.2 - mailbox full) require completely different handling. Hard bounces should suppress immediately. Soft bounces should retry with backoff.

9. **Bulk-approving high-risk intents.** Legal and security intents should never be bulk-approved. Each one needs individual review. An email that mentions "attorney" or "compliance" could be a serious matter.

10. **Not rate-limiting classification.** If you use an external service (ML model, LLM API) for classification, a sudden spike in inbound volume can overwhelm it. Queue classifications and process them at a controlled rate.

---

## Implementation checklist

1. **Define your taxonomy.** Pick categories that map to actions. Start with the 9-category set above and adjust.
2. **Build header-based detection first.** Auto-Submitted, Precedence, X-Auto-Response-Suppress, Return-Path, Content-Type for DSNs.
3. **Add keyword scoring.** Weighted keywords for each intent, subject weighted 3x over body, density-adjusted scoring.
4. **Set confidence thresholds.** 0.60 floor for auto-actions, 0.85+ for high-confidence auto-archiving.
5. **Add conflict detection.** Flag when top two intents are close or opposing.
6. **Build routing rules.** Map each intent to an action type with SLAs.
7. **Add safety classification.** Run in parallel - don't let a phishing email get routed as "interested".
8. **Add escalation triggers.** Conflicting intents, adversarial patterns, injection risk, thread anomalies.
9. **Log everything.** Every classification should persist the intent, confidence, all scores, flags, and safety verdict. You need this for debugging and model improvement.
10. **Build a feedback loop.** Let humans correct wrong classifications. Use corrections to improve keyword lists or retrain models.

Services like [molted.email](https://molted.email) handle the full classification and routing pipeline out of the box - intent classification, safety filtering, routing with SLAs, and human approval workflows - so you can focus on what to do with the results rather than building the classifier.

---

## References

- [RFC 3834 - Recommendations for Automatic Responses to Electronic Mail](https://datatracker.ietf.org/doc/html/rfc3834) - the standard for auto-reply headers and behavior
- [RFC 3464 - Extensible Message Format for Delivery Status Notifications](https://datatracker.ietf.org/doc/html/rfc3464) - DSN format for bounce detection
- [RFC 3463 - Enhanced Mail System Status Codes](https://datatracker.ietf.org/doc/html/rfc3463) - the X.Y.Z bounce code system
- [How to Detect Automatically Generated Emails](https://www.arp242.net/autoreply.html) - practical guide to auto-reply header detection
- [SendGrid - Handling Auto Responses From Recipients](https://support.sendgrid.com/hc/en-us/articles/6584372156315-Handling-Auto-Responses-From-Recipients) - provider-specific guidance
- [CAN-SPAM Act](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) - legal requirements for honoring opt-out requests

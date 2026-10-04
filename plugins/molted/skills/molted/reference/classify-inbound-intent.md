<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Classify Inbound Intent

Classify an email's intent. This calls the exact same classification pipeline the
live inbound worker uses (tenant safety settings, spam feedback, sender reputation,
the allow-list, and the same clean-mail masking to `unclassified` production
applies), so the result here always matches what actually happens to a real
inbound message with the same content and sender.

```
POST /v1/agent/classify-intent
```

```json
{
  "tenantId": "your-tenant-id",
  "subject": "Re: your proposal",
  "bodyText": "Thanks, I'd love to schedule a demo next week.",
  "fromEmail": "alice@example.com"
}
```

`fromEmail` is optional but recommended: when set, it loads that sender's tenant
safety settings, spam feedback, sender reputation and allow-list status, the same
context the live pipeline uses. `fromName`/`replyTo` are also optional (the same
sender fields inbound ingestion captures) and `bodyHtml` feeds the excessive-links
safety signal. Omit `fromEmail` when there's no real sender to classify against --
no placeholder is needed or used.

Response:
```json
{
  "intent": "unclassified",
  "confidence": 0.5,
  "suggestedAction": "notify_owner",
  "safetyVerdict": "clean",
  "safetyAction": "deliver",
  "masked": true,
  "route": {
    "actionType": "notify_owner",
    "slaMinutes": 60,
    "status": "pending"
  },
  "signals": {
    "safety": [],
    "injectionRiskLevel": "none",
    "injectionScore": 0,
    "injectionMatchedPatterns": []
  }
}
```

A clean (non-spam/phishing/etc.), non-unsubscribe email is always masked to
`unclassified` at confidence 0.5 -- this matches production, which treats keyword
intent scoring on clean mail as too false-positive-prone to route on (e.g. "ooo"
substring-matching "out_of_office"). `unsubscribe` is the one exception: it's
always surfaced and routed, clean or not, since opt-out is compliance-critical.
`masked: true` means the returned `intent`/`confidence` were replaced this way;
`route` is the full action (including any safety override, e.g. `spam` or
`require_approval` for a quarantined message) the live pipeline would take, and
`signals` are the safety/injection signals behind `safetyVerdict`. `suggestedAction`
is kept for backward compatibility and now always matches `route.actionType`.

This endpoint never calls the Carapace/Jev model shadow -- only the deterministic
keyword pipeline the worker's live routing decision itself is based on.

### Intent Values

| Intent | Description |
|--------|-------------|
| `interested` | Positive engagement, wants to proceed |
| `not_now` | Timing isn't right, may revisit |
| `objection` | Concern or pushback on offering ("not interested", "no thanks") |
| `unsubscribe` | Opt-out / removal request -- compliance-critical, never auto-archive |
| `support` | Needs help with product/service |
| `billing` | Billing or payment related |
| `legal` | Legal matter (compliance, GDPR, etc.) |
| `security` | Security concern or report |
| `out_of_office` | Auto-reply / OOO |
| `unclassified` | Could not determine intent |

### Suggested Actions

| Action | Description |
|--------|-------------|
| `notify_owner` | Alert the contact owner |
| `require_approval` | Queue for human review before responding |
| `auto_archive` | Safe to archive without action |
| `trigger_unsubscribe` | Add the contact to the suppression list and acknowledge -- legally required for opt-out requests under CAN-SPAM, GDPR, CASL. Never auto-archive these. |
| `escalate` | Needs immediate human attention |

A low-confidence unsubscribe (below 0.6) is held as `require_approval` instead of
acting immediately. Approving that routing action (`POST /v1/inbound/:id/approve`
or `POST /v1/inbound/bulk-approve?intent=unsubscribe`) suppresses the sender at
approval time, same as an immediate `trigger_unsubscribe`; leaving it unapproved
never suppresses the contact.

### Batch Classify

```
POST /v1/agent/batch/classify-intent
```

```json
{
  "tenantId": "your-tenant-id",
  "messages": [
    { "subject": "Re: demo", "bodyText": "Yes, interested", "fromEmail": "alice@example.com" },
    { "subject": "OOO", "bodyText": "I am out of office until Monday" }
  ]
}
```

Each message accepts the same optional `bodyHtml`/`fromEmail`/`fromName`/`replyTo`
fields as the single classify-intent call above; `results` is in the same order as
`messages`, each entry shaped like a single classify-intent response (including
`route`/`signals`/`masked`).

---

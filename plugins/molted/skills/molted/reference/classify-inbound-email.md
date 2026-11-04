<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Classify Inbound Email

Classify an email the way the live inbound pipeline would. This calls the exact
same classification pipeline the live inbound worker uses (tenant safety settings,
spam feedback, sender reputation and the allow-list), so the result here matches
what actually happens to a real inbound message with the same content and sender.

```
POST /v1/agent/classify-intent
```

```json
{
  "subject": "Re: your proposal",
  "bodyText": "Thanks, I'd love to schedule a demo next week.",
  "fromEmail": "alice@example.com"
}
```

`fromEmail` is optional but recommended: when set, it loads that sender's tenant
safety settings, spam feedback, sender reputation and allow-list status, the same
context the live pipeline uses. `fromName`/`replyTo` are also optional (the same
sender fields inbound ingestion captures). `bodyHtml` feeds the excessive-links
safety signal and the injection scan, and when `bodyText` is empty every classifier
reads a text rendering of it instead, the same as for an HTML-only inbound message.
When both are given, the safety check also reads whatever the HTML says that the
text does not, the same as for a multipart inbound message.
Omit `fromEmail` when there's no real sender to classify against --
no placeholder is needed or used.

Response:
```json
{
  "platformLabel": null,
  "autoReplyKind": "unknown",
  "safetyVerdict": "clean",
  "safetyAction": "deliver",
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
  },
  "intent": "unclassified",
  "confidence": 0.5,
  "masked": true,
  "suggestedAction": "notify_owner"
}
```

`platformLabel` here is `opt_out` or `null`. This endpoint takes no headers, so it
can't tell an automatic reply or a bounce apart (`autoReplyKind` is always
`unknown`): read those on a received message instead.

`route` is the full action (including any safety override, e.g. `spam` or
`require_approval` for a quarantined message) the live pipeline would take, and
`signals` are the safety/injection signals behind `safetyVerdict`. `suggestedAction`
is kept for backward compatibility and always matches `route.actionType`.

The deprecated `intent` field: a clean (non-spam/phishing/etc.), non-unsubscribe
email is always masked to `unclassified` at confidence 0.5 (`masked: true`), so
for clean mail `intent` only ever says `unsubscribe` or `unclassified` here.
`allScores`, `runnerUpIntent` and `runnerUpConfidence` are deprecated with it.

This endpoint never calls the Carapace/Jev model shadow -- only the deterministic
keyword pipeline the worker's live routing decision itself is based on.

### Suggested Actions

| Action | Description |
|--------|-------------|
| `notify_owner` | Alert the contact owner |
| `require_approval` | Queue for human review before responding |
| `auto_archive` | Safe to archive without action |
| `trigger_unsubscribe` | Add the contact to the suppression list and acknowledge -- legally required for opt-out requests under CAN-SPAM, GDPR, CASL. Never auto-archive these. |
| `escalate` | Needs immediate human attention |

A low-confidence opt-out (below 0.6), or one that asks for more than one thing or
reads as written to steer your agent, is held as `require_approval` instead of
acting immediately. Approving that routing action (`POST /v1/inbound/:id/approve`
or `POST /v1/inbound/bulk-approve?label=opt_out`) suppresses the sender at
approval time, same as an immediate `trigger_unsubscribe`; leaving it unapproved
never suppresses the contact. A label correction never changes this: it is
feedback, it neither stops an opt-out from being honoured nor removes a
suppression.

In the dashboard, the card for a held opt-out shows the start of the email,
says "Low confidence" when the classifier was below 0.6, warns when the sender
is in a conversation with the workspace (they wrote and you replied in the last
30 days), and spells out that approving stops all email from the workspace to
that contact. A person who approved one by mistake can undo it from the
dashboard or the phone app for 10 minutes (`POST /v1/me/inbound-approvals/:id/undo`,
person only, no agent route): the email waits for a decision again and the
suppression that approval added is removed. After that, removing the
suppression is the way back, and it is a human decision.

`POST /v1/inbound/bulk-approve?label=` approves every pending routing action whose
message carries that platform label (`opt_out`, `auto_reply` or
`delivery_notice`), within the key's `manage` mailbox scope. Mail the safety check
held has no label, so it is never included. It is a human decision, like approve.
`?intent=` still works but is deprecated (answered with `Deprecation: true`); it
matches the stored intent, as before.

A routing action can also be rejected (`POST /v1/inbound/:id/reject`, same
`manage` mailbox scope and human gate as approve): its status becomes `rejected`,
the email stays where it is and nothing runs. Both decisions record who made
them and when. Only a `pending` routing action can be decided: repeating the
same decision is a no-op, and the other decision on one already decided returns
`409` `{ "error": "already_decided", "status": "completed" | "rejected" }`.
`GET /v1/inbound?status=pending|completed|rejected` filters by routing status.
A person decides these one at a time as cards on the portal's Home.

### Batch Classify

```
POST /v1/agent/batch/classify-intent
```

```json
{
  "messages": [
    { "subject": "Re: demo", "bodyText": "Please take me off this list.", "fromEmail": "alice@example.com" },
    { "subject": "OOO", "bodyText": "I am out of office until Monday" }
  ]
}
```

Each message accepts the same optional `bodyHtml`/`fromEmail`/`fromName`/`replyTo`
fields as the single classify-intent call above; `results` is in the same order as
`messages`, each entry shaped like a single classify-intent response (including
`platformLabel`/`autoReplyKind`/`route`/`signals`).

---

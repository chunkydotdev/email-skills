<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Platform Labels

Molted puts a label on an inbound message only when it acts on it. There are three:

| `platformLabel` | Meaning | What Molted does |
|-----------------|---------|------------------|
| `opt_out` | The sender asked to stop receiving mail | Suppresses the sender automatically when it is confident. When it isn't (`routingAction: "require_approval"`), the request waits for a decision, and the agent reading the message should act on it (add a suppression or unsubscribe the contact). Use `GET /v1/suppressions/check` (MCP `check_suppression`) to confirm. |
| `auto_reply` | An automatic reply, such as out of office or a vacation responder | Never counts as a reply: it doesn't cancel a follow-up or count as engagement |
| `delivery_notice` | A bounce or delivery status notification | Same as `auto_reply` |
| `null` | None of these | Nothing: the message is yours to read |

`opt_out` reads only what the sender wrote. It ignores the quoted reply history (`>` lines, "On ... wrote:" blocks, forwarded messages) and footer or template text the sender quotes or pastes: a line with a `{{...}}` placeholder, an "Unsubscribe" link label in a `·` or `|` separated footer line, the text of an unsubscribe link. A support question that quotes your footer is not an opt-out; "please unsubscribe me" above it still is. The subject counts like the body does, except when it only mentions the word as a topic ("Re: Unsubscribe link broken", "Question about the unsubscribe footer", "How do I unsubscribe a contact?"); that does not make an opt-out by itself, unless it also says so outright ("... so please unsubscribe me") or the message has no body text to go on. A subject that asks to leave a conversation ("Remove me from the CC") is not an opt-out either, but "Unsubscribe me" or "Remove me" on its own is.

Only mail the safety check delivered gets a label: mail it did not deliver (quarantined or rejected) gets `null` (an unsubscribe footer on quarantined spam is not the sender asking to stop, and nothing is suppressed for it). If your safety settings deliver spam, a delivered opt-out is `opt_out` and Molted acts on it as on any other. What a message is about (a sales lead, a support request, a complaint) is for your agent to decide. Molted doesn't label business meaning: put it in [your own labels](#labels).

`platformLabel` is on every inbound message you read: each message in `GET /v1/agent/threads/:id` (in `messages` and in `envelopedMessages[].metadata`), `platform_label` on `GET /v1/inbound` and on `GET /v1/agent/override/held-messages` rows, `lastClassification` in thread-context, the `inbound.classified` event, and the classify endpoints below. Next to it, `autoReplyKind` says what the message's headers said: `human`, `auto_reply`, `delivery_report` or `unknown` (no headers to check). `opt_out` wins over the headers: an opt-out sent from an auto-responder is still an opt-out. Outbound messages have `null` for both. `autoReplyKind` is known as soon as a message arrives; `platformLabel` stays `null` until it is classified.

### Correcting a label

When a label is wrong, say so. You read the email, so you decide: no person has to approve it.

```
POST /v1/agent/override/messages/:messageId/label-correction
```

```json
{ "label": "none" }
```

Served by both hosts (api.molted.email needs `tenantId`). `label` is what the `platformLabel` should have been: `opt_out`, `auto_reply`, `delivery_notice`, or `none` (not any of these, for example "not an opt-out"). `messageId` is the inbound message's id from `GET /v1/agent/threads/:id`. Response (`201`): `{ messageId, id, threadId, originalLabel, correctedLabel, alreadyRecorded, auditEventId }`, where `originalLabel` is the message's label when you corrected it.

A correction is feedback only. It helps Molted learn to sort mail, and it changes nothing else: not routing, not a suppression, and not the `platformLabel` anyone reads (the message keeps the classifier's label). So act on the message yourself:

- **A real opt-out Molted missed:** correct it to `opt_out` and add a suppression (`POST /v1/suppressions`, MCP `add_suppression`, `molted suppressions add`).
- **Not an opt-out:** correct it to `none`. If Molted already suppressed the sender, that stays: removing a suppression is a person's decision ([Remove a Suppression](#remove-a-suppression)).
- **An auto-responder that quoted an unsubscribe footer** Molted didn't recognise as one can read `opt_out` (it outranks the headers). If it isn't an opt-out, correct it to what its headers say (`autoReplyKind`): `auto_reply` or `delivery_notice`, not `none`. `none` says it isn't an automatic reply either.
- **Repeating yourself is free.** If your latest correction of a message already says the same label, nothing is written: the answer carries that correction's `id` with `alreadyRecorded: true` and `auditEventId: null`. Changing your mind (a different label) is recorded.

Needs `operator` scope and `manage` on the message's mailbox. `400` for any other `label`, `404` for a message that isn't an inbound message in your workspace, `400` for one with no inbound record. MCP: `correct_label`. CLI: `molted overrides correct-label <messageId> <label>`.

The older `POST /v1/agent/override/messages/:messageId/intent-correction` (body `{ "intent": ... }`) is deprecated: it records the label correction the intent stands for (`unsubscribe` = `opt_out`; any other intent keeps what the headers say, `auto_reply` or `delivery_notice`; otherwise `out_of_office` = `auto_reply` and anything else = `none`) and answers with `Deprecation: true`.

**`intent` is deprecated.** It still comes back, unchanged, everywhere it did, but don't branch on it: for delivered (clean) mail it is only ever `unsubscribe` (= `opt_out`), `out_of_office` (= `auto_reply` or `delivery_notice`) or `unclassified`. Values such as `interested` or `support` only appear on mail the safety filter flagged, which is quarantined. The classify endpoints answer with a `Deprecation: true` header and a `Link` to these docs; a removal date (`Sunset`) follows later, with notice.

<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Thread Context

Get a contact's whole history in one call: their sends, inbound messages and journey runs, plus suppression status, the account's open incidents and the latest inbound classification.

```
GET /v1/agent/thread-context?contactEmail=alice@example.com
```

Response:
```json
{
  "timeline": {
    "sends": [
      {
        "id": "send_2",
        "template_id": "welcome",
        "status": "sent",
        "delivery_status": "delivered",
        "created_at": "2026-10-02T09:00:00.000Z",
        "template_name": "Welcome email",
        "template_slug": "welcome",
        "subject": "Day 1 tips",
        "journey_id": "jrn_1",
        "journey_run_id": "run_1"
      }
    ],
    "journeyRuns": [
      {
        "id": "run_1",
        "journey_name": "Onboarding",
        "status": "cancelled",
        "started_at": "2026-10-01T09:00:00.000Z",
        "completed_at": "2026-10-03T08:15:00.000Z",
        "journey_id": "jrn_1",
        "cancel_reason": "contact_replied",
        "next_step_at": null,
        "current_step_id": "step_2"
      }
    ],
    "inboundMessages": [
      {
        "id": "msg_1",
        "subject": "Re: Day 1 tips",
        "from_email": "alice@example.com",
        "created_at": "2026-10-03T08:14:00.000Z",
        "inbound_quota_held": false,
        "pending_classification": false,
        "quarantined": false,
        "auto_reply_kind": "human",
        "platform_label": null,
        "verdict": "clean",
        "safety_action": "deliver",
        "thread_id": "thr_1",
        "replied_to_send_id": "send_2",
        "contentTrust": "untrusted"
      }
    ],
    "has_more": { "sends": false, "journeyRuns": false, "inboundMessages": false },
    "next_before": { "sends": null, "journeyRuns": null, "inboundMessages": null }
  },
  "suppressionStatus": { "suppressed": false },
  "activeIncidents": [],
  "lastClassification": { "platformLabel": null, "autoReplyKind": "human", "intent": "unclassified", "confidence": 0.5 }
}
```

Timeline rows keep their snake_case keys (the rest of the response is camelCase). Every list is newest first.

| List | Fields |
|------|--------|
| `sends` | `id`, `template_id` (the slug or id the send named), `template_name`, `template_slug` (null when no template of yours matches), `subject` (the rendered subject), `status`, `delivery_status`, `journey_id`, `journey_run_id` (both null unless a journey step sent it), `created_at` |
| `journeyRuns` | `id`, `journey_id`, `journey_name`, `status`, `current_step_id`, `next_step_at`, `cancel_reason` (`contact_replied` when a reply ended the run, else null), `started_at`, `completed_at` |
| `inboundMessages` | `id`, `from_email`, `subject`, `created_at`, `thread_id`, `replied_to_send_id` (the send the message answered, when Molted linked it), `auto_reply_kind`, `platform_label`, `verdict`, `safety_action`, `quarantined`, `inbound_quota_held`, `pending_classification`, `contentTrust` |

An inbound `subject` is `null` while the message is held for the inbound allowance or still pending classification, and `platform_label` is `null` until it is classified.

**Paging.** These optional query parameters apply to each list on its own:

- `limit`: rows per list, 1 to 500, default 50.
- `since`: only rows on or after this time (`created_at` for sends and inbound messages, `started_at` for journey runs). An ISO 8601 date (`2026-10-01`, read as midnight UTC) or a date and time with an offset (`2026-10-01T09:00:00Z`, `2026-10-01T11:00:00+02:00`).
- `sends_before`, `journey_runs_before`, `inbound_messages_before`: the cursor from `timeline.next_before.<list>`, for the next older page of that list.

`timeline.has_more.<list>` is `true` when that list had more matching rows than `limit`: the rows left out are older than the oldest one returned, so raise `limit`, or walk back with a cursor (below). A `limit` that isn't a whole number from 1 to 500 is `400 invalid_limit`; a `since` in any other form (a date that doesn't exist, a time without an offset) is `400 invalid_since`.

```
GET /v1/agent/thread-context?contactEmail=alice@example.com&since=2026-10-01&limit=200
```

To reach rows older than a page, walk a list back with its cursor. `timeline.next_before.<list>` is the cursor for that list's next older page, and `null` when `has_more.<list>` is `false`. Pass it as the list's `<list>_before` parameter: `sends_before`, `journey_runs_before` or `inbound_messages_before`. A list given a cursor returns rows strictly older than the cursor's position (still on or after `since`, at most `limit`); a list without one returns its newest page, so page one list at a time. Rows that share a timestamp are ordered by id, so a walk sees every row exactly once. A cursor is opaque: pass back exactly what you were given. A malformed one is `400 invalid_cursor`.

```
# page one: the newest 200 sends
GET /v1/agent/thread-context?contactEmail=alice@example.com&limit=200
# → timeline.has_more.sends is true, timeline.next_before.sends is "eyJ0Ijoi..."

# the next 200, older than the last one returned
GET /v1/agent/thread-context?contactEmail=alice@example.com&limit=200&sends_before=eyJ0Ijoi...
# repeat until timeline.next_before.sends is null
```

A mailbox-scoped key sees only the sends and inbound messages of its own mailboxes, and `replied_to_send_id` only when that send is in one of them too. Journey runs have no mailbox and are always listed.

`lastClassification` is the contact's latest classified inbound message: its `platformLabel` (see [Platform Labels](#platform-labels)) and `autoReplyKind`, plus the deprecated `intent`/`confidence`. `null` when the contact never wrote in.

MCP: `get_context` (`contact_email`, `since`, `limit`, `sends_before`, `journey_runs_before`, `inbound_messages_before`). CLI: `molted contacts context <email> [--since] [--limit] [--sends-before] [--journey-runs-before] [--inbound-messages-before]`.

Every `inboundMessages` entry carries `contentTrust: "untrusted"` -- its `subject` came from the contact. See [Untrusted Content](#untrusted-content) below.

---

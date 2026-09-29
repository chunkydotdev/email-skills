<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Real-Time Events (SSE)

Subscribe to a live event stream for your tenant:

```
GET /v1/agent/events/stream?tenantId=your-tenant-id&eventTypes=send.*,delivery.*
```

Query parameters:

| Param | Required | Description |
|-------|----------|-------------|
| `tenantId` | yes | Your tenant ID |
| `eventTypes` | no | Comma-separated filter with wildcards (e.g., `send.*`, `delivery.delivered`) |
| `contactEmail` | no | Filter events for a single contact |
| `since` | no | Replay events after this event ID before switching to live delivery (see Replay below) |

### Replay (`since`)

Pass the `id` of the last event you processed as `since` to resume: the stream replays every persisted event after it, then transitions to live delivery. No event published in between is lost or delivered twice, including anything published while the replay query is still running. `eventTypes` wildcards (e.g. `inbound.*`) and `contactEmail` apply to replay the same way they do to live events. A backlog bigger than one page is paged through automatically; you never need to page manually.

If the server can't guarantee it caught everything up (a burst of live events too large to buffer while paging, or a backlog too large to finish paging through), it sends a `gap` event instead of a possibly-incomplete replay:

```
event: gap
data: {"reason":"buffer_overflow"}
```

`reason` is `buffer_overflow` or `backlog_too_large`. A `gap` event has no `id` -- don't advance your resume cursor from it -- and the stream keeps running with live events right after. `molted listen` prints a warning and continues.

### Event Types

| Event | Fired When |
|-------|------------|
| `send.queued` | Send accepted and queued for delivery |
| `send.approval_pending` | Send held for human approval (mailbox autonomy gate) |
| `send.approval_decided` | A held send was approved or rejected |
| `send.approval_expired` | Nobody decided a held send before its deadline; it was rejected |
| `policy.blocked` | Policy rejected a send request |
| `delivery.queued` | Email accepted and queued for sending |
| `delivery.accepted` | Email accepted by the provider |
| `delivery.sent` | Email handed to provider |
| `delivery.delivered` | Delivery confirmed |
| `delivery.deferred` | Delivery temporarily deferred by the provider |
| `delivery.bounced` | Hard or soft bounce |
| `delivery.complained` | Spam complaint received |
| `delivery.failed` | Delivery failed permanently |
| `delivery.opened` | Recipient opened the email (requires open tracking on the domain) |
| `delivery.clicked` | Recipient clicked a link (requires click tracking on the domain) |
| `suppression.created` | Address auto-suppressed (hard bounce, complaint, or 3+ soft bounces). Send response shows `status: queued` at the time of the call; this event fires when the address becomes un-sendable for future sends. |
| `inbound.classified` | Inbound email classified with an intent |
| `inbound.routed` | Inbound email routed to a handler |
| `journey.step_completed` | A journey step completed for a contact |
| `journey.completed` | A journey run completed for a contact |
| `followup.scheduled` | Followup scheduled |
| `followup.executed` | Followup fired |
| `coordination.lease_acquired` | Agent acquired a contact lease |
| `coordination.lease_released` | Contact lease released |
| `coordination.consensus_requested` | A consensus vote was created |
| `thread.sla_breached` | A thread's SLA deadline passed with no reply; delivered live as it happens, not only on the next replay |

---

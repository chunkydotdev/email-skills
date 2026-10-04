<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Schedule Followup

Schedule a delayed send that auto-cancels if the recipient replies. Use either `delayMinutes` (relative) or `scheduledAt` (absolute ISO 8601 timestamp) — exactly one is required:

```
POST /v1/agent/schedule-followup
```

**Relative delay:**
```json
{
  "tenantId": "your-tenant-id",
  "contactEmail": "alice@example.com",
  "threadRequestId": "req_abc123",
  "delayMinutes": 1440,
  "cancelOnReply": true
}
```

**Absolute time:**
```json
{
  "tenantId": "your-tenant-id",
  "contactEmail": "alice@example.com",
  "threadRequestId": "req_abc123",
  "scheduledAt": "2026-03-27T09:00:00Z",
  "cancelOnReply": true
}
```

**Choosing the content** (optional; defaults to a `followup-default` template if your tenant has created one):
```json
{
  "tenantId": "your-tenant-id",
  "contactEmail": "alice@example.com",
  "threadRequestId": "req_abc123",
  "delayMinutes": 1440,
  "triggerConditions": {
    "templateId": "followup-nudge",
    "payload": { "firstName": "Alice" }
  }
}
```

Response:
```json
{
  "followupId": "fu_xyz",
  "status": "pending",
  "scheduledAt": "2026-02-26T10:00:00Z"
}
```

`delayMinutes` range: 1–43200 (1 minute to 30 days).

**Content** comes from `triggerConditions` at execute time, not from anything on this call directly: `triggerConditions.templateId` names a template slug (or template ID) to render, defaulting to `followup-default` if you don't set one -- create a template with that slug in your tenant to give every follow-up that names no template its content. `triggerConditions.payload` supplies the template's variables. Set `templateId` to `_default` to skip template lookup entirely and pass literal `subject`/`html`/`text` in `payload` instead. No template resolves (no `templateId` given and no `followup-default` template exists, or an explicit `templateId` that doesn't exist) or the template fails to render: the follow-up is cancelled (reason `template_not_found` or `render_failed`) rather than sent with no content.

At execute time the follow-up also checks suppression and the tenant's billing plan before it sends. A suppressed contact, or a `trial` (not yet activated) or `expired` tenant, cancels the follow-up outright (reason `suppressed`, `trial_not_activated`, or `subscription_expired`, recorded in the audit trail) rather than deferring it, since the follow-up isn't something worth waiting out.

**Approval hold:** a follow-up goes through the same account/mailbox pause and mailbox autonomy gate as any other agent send. At autonomy level 3 it's queued straight away; at level 1 (every send) or level 2 (first contact with this recipient) it's held (`send_approvals`, status `pending_approval`) and shows up in the portal's approval queue like any other held send -- approving it sends the same content. A follow-up scheduled well before its send time and only reaching execution more than 24 hours late (worker downtime, for example) is cancelled (reason `stale_before_delivery_fix`) rather than sent stale.

There is no endpoint to fetch a follow-up's status or cancellation reason directly today.

### Cancel Followup

```
DELETE /v1/agent/followups/fu_xyz
```

### Cancel Scheduled Send

Cancel a send that is currently in the `scheduled` delivery state (either explicitly scheduled via `scheduledAt`, or auto-deferred by the warmup ramp with `reason: 'warmup_defer'`). Immediate (`queued`) or already-sent requests cannot be cancelled.

```
DELETE /v1/agent/sends/:requestId?tenantId=your-tenant-id
Authorization: Bearer <api-key>
```

Response:
```json
{ "cancelled": true }
```

If the send has already been picked up, is not scheduled, or does not exist, the API returns `{ "cancelled": false, "reason": "not_cancellable" | "not_found" }` (reason is `not_cancellable` when the request exists but is not in the scheduled state; `not_found` when the id doesn't match any request for this tenant). Cancelling a warmup-deferred send releases its reserved slot back to that day's pool so other sends can use the capacity.

---

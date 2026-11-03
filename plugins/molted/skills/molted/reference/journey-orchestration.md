<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Journey Orchestration

Journeys are multi-step sequences triggered by product events. Each journey has ordered steps that execute automatically. A new journey starts in `draft`: add its steps, then set it `active`. Listing and getting journeys need only a valid key; listing runs needs a key that reaches every mailbox, and every write also needs a write-level scope (`automation`, `manage` or `admin`).

**CLI:** `molted journeys create --name <n> --trigger-event <event> [--trigger-conditions <json>]`, `molted journeys list|get <id>|delete <id>`, `molted journeys update <id> [--name] [--status active|paused|archived]`, `molted journeys add-step <id> --step-order <n> --step-type send|delay|branch|end [--config <json>]`, `molted journeys update-step|delete-step`, `molted journeys runs list|cancel|cancel-all`, `molted journeys trigger --event <name> --contact <email> --properties <json>`. **MCP:** `create_journey`, `add_journey_step`, `update_journey_step`, `activate_journey`, `journey_status`, `trigger_journey`, `cancel_journey_run`, `cancel_all_journey_runs`.

### Create a Journey

```
POST /v1/journeys
```

```json
{
  "name": "Onboarding Sequence",
  "triggerEvent": "user.signed_up"
}
```

Optional: `triggerConditions` (object).

### List Journeys

```
GET /v1/journeys
```

### Get a Journey

```
GET /v1/journeys/:id
```

### Update a Journey

```
PATCH /v1/journeys/:id
```

```json
{ "status": "active" }
```

Statuses: `active` (processing), `paused` (stops new enrollments; in-flight runs are parked and resume automatically once active again), `archived` (stops processing and cancels every in-flight run -- not permanent, set status back to `active` to reactivate).

### Stop on a Reply

A journey stops for a contact once they reply: `exitOnReply` (create and update, default `true`; `exit_on_reply` on reads). When a message from a run's contact (same workspace, address matched normalized: case, `+tags` and Gmail dots ignored) arrives after the journey has sent them at least one email, every active run of a journey with `exitOnReply` for that contact is cancelled: status `cancelled`, reason `contact_replied` in the run's `context.cancelReason` and the `journey.cancelled` event, and any of the run's sends waiting for approval are rejected. Automatic replies (out of office), delivery notices, spam, and mail the safety check quarantined or rejected never count; an opt-out does, and so does a clean reply held for a person's review. Set `"exitOnReply": false` for a journey that should keep sending after a reply (`PATCH /v1/journeys/:id`, which applies to runs already in flight).

### Add Steps

```
POST /v1/journeys/:id/steps
```

```json
{
  "stepOrder": 1,
  "stepType": "send",
  "config": {
    "templateId": "onboarding-welcome",
    "dedupeKeyPrefix": "onboarding",
    "payload": { "trialDays": 14 }
  }
}
```

#### Step Types

| Type | Config Fields | Description |
|------|--------------|-------------|
| `send` | `templateId`, `dedupeKeyPrefix`, `payload` | Send an email (policy-evaluated) |
| `delay` | `delayMinutes` | Wait before the next step (default: 60) |
| `branch` | `conditions[]` | Evaluate conditions and route to a step |
| `end` | — | Complete the journey run |

A `send` step checks suppression (email and domain) and the tenant's billing plan before enqueueing. If the contact is suppressed, or the plan is `trial` (not yet activated) or `expired`, the step is recorded as a `blocked` send with reason `suppressed`, `trial_not_activated` or `subscription_expired` -- never dropped silently -- and the run carries on to the next step, the same as a `thread_taken_over` skip.

Before any step runs, the journey must be `active` and the run must still be `active`. A `paused` journey defers the step and retries later (resuming automatically once active again); an `archived` journey cancels the run.

Branch condition example -- `field` is a dot path resolved against the run's trigger payload (a bare field and a `properties.`-prefixed one are equivalent); conditions are tried in order and the first match wins, `defaultNextStepOrder` is the fallback:
```json
{
  "stepType": "branch",
  "config": {
    "conditions": [
      { "field": "properties.plan", "operator": "eq", "value": "pro", "nextStepOrder": 3 },
      { "field": "properties.plan", "operator": "eq", "value": "free", "nextStepOrder": 5 }
    ],
    "defaultNextStepOrder": 5
  }
}
```
A legacy shape (`conditions` without `nextStepOrder`, plus `onMatch: { nextStep }` / `onNoMatch: { nextStep }`, where every condition must match) is still accepted but shouldn't be used for new steps. `config` is validated on create/update -- an invalid shape is rejected with `400`, and so is any target step_order that isn't strictly greater than the branch step's own (branching backward or to itself would silently stall the run -- the worker cannot re-run a step already completed for it).

### Update a Step

```
PATCH /v1/journeys/:id/steps/:stepId
```

```json
{
  "stepOrder": 2,
  "config": {
    "templateId": "new-template",
    "dedupeKeyPrefix": "onboarding",
    "payload": { "trialDays": 30 }
  }
}
```

Refused (`400`) while the journey is `active`: pause it first. All fields are optional: only provided fields are updated.

### Delete a Step

```
DELETE /v1/journeys/:id/steps/:stepId
```

Removes a step and reorders remaining steps. Refused (`400`) while the journey is `active`.

### Delete a Journey

```
DELETE /v1/journeys/:id
```

Deletes a journey in `draft`, `paused`, `archived` or `completed` status. An `active` journey is refused (`400`): pause or archive it first (`PATCH /v1/journeys/:id` with `"status": "paused"`). Any run still waiting (a paused journey's parked runs) is cancelled and its pending send approvals are rejected. Returns `{ "deleted": true, "id": "...", "cancelledRuns": 0 }`. The journey disappears from list and get; its runs and send history are kept. CLI: `molted journeys delete <id>`; MCP: `delete_journey`.

### Delete a Template

```
DELETE /v1/templates/:id
```

`:id` is the template's UUID or slug. Returns `{ "deleted": true, "id": "...", "slug": "...", "rejectedApprovals": 0 }`, and the slug is free to reuse right away. Refused with `409` for `_default`, and while a step of an `active` or `paused` journey uses the template (the message names those journeys: archive or delete them, or change their send steps, first). Versions waiting for approval are rejected. A deleted template can't be sent, rendered or read; emails already sent with it keep their history. CLI: `molted templates delete <id-or-slug>`.

### List Journey Runs

```
GET /v1/journeys/:id/runs
```

### Cancel a Journey Run

```
POST /v1/journeys/:id/runs/:runId/cancel
```

Stops a single in-flight run immediately; any step job already queued for it (a pending
delay, or one deferred for a paused mailbox/journey) becomes a no-op. Returns `404` for an
unknown run, `400` if it's already completed/failed/cancelled.

To cancel every active run of a journey at once (e.g. before deleting it):

```
POST /v1/journeys/:id/runs/cancel-all
```

### Trigger a Journey via Event Ingestion

```
POST /v1/agent/events/ingest
```

```json
{
  "eventName": "user.signed_up",
  "contactEmail": "alice@example.com",
  "payload": { "plan": "starter" }
}
```

`eventName`, `contactEmail` and `payload` (an object, may be `{}`) are required. The old `POST /v1/events/ingest` still answers but is deprecated (`Deprecation`/`Sunset: 2026-09-01` headers, `Link` to the successor); use `/v1/agent/events/ingest`.

When `eventName` matches a journey's `triggerEvent`, a run is created for that contact and its first step is queued. Runs start before the response returns, and the response (`201`) says what happened per journey whose `trigger_event` matched (#2597), so you never need to poll journeys or runs to find out:

```json
{
  "eventId": "uuid",
  "journeys": [
    { "journey_id": "uuid", "journey_name": "Onboarding", "outcome": "started", "run_id": "uuid" },
    { "journey_id": "uuid", "journey_name": "Win-back", "outcome": "skipped", "reason": "already_active", "active_run_id": "uuid" },
    { "journey_id": "uuid", "journey_name": "Pro upsell", "outcome": "skipped", "reason": "trigger_conditions_not_met" },
    { "journey_id": "uuid", "journey_name": "Old onboarding", "outcome": "skipped", "reason": "journey_not_active", "journey_status": "paused" }
  ]
}
```

- `started`: `run_id` is the run that was created (the same id `GET /v1/journeys/:id/runs` lists).
- `skipped`, `reason`:
  - `already_active`: the contact already has an active run in this journey (one per contact per journey, also under concurrent events). `active_run_id` names it (`null` if it ended in the meantime).
  - `trigger_conditions_not_met`: the payload does not equal every `trigger_conditions` entry.
  - `journey_not_active`: the journey is not active; `journey_status` is `paused`, `draft`, `archived` or `deleted`.
  - `no_steps`: the journey has no steps.
- An empty `journeys` list means no journey triggers on `eventName`.

Suppression and consent are not enrolment checks: a suppressed contact still starts a run, and its send steps are blocked by the send gate. `eventId` is unchanged; the entries use snake_case like the journey and run objects elsewhere in the API.

**CLI:** `molted journeys trigger --event <name> --contact <email> --properties '<json>'`. **MCP:** `trigger_journey`.

---

<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Journey Orchestration

Journeys are multi-step sequences triggered by product events. Each journey has ordered steps that execute automatically.

### Create a Journey

```
POST /v1/journeys
```

```json
{
  "tenantId": "your-tenant-id",
  "name": "Onboarding Sequence",
  "triggerEvent": "user.signed_up"
}
```

### List Journeys

```
GET /v1/journeys?tenantId=your-tenant-id
```

### Get a Journey

```
GET /v1/journeys/:id?tenantId=your-tenant-id
```

### Update a Journey

```
PATCH /v1/journeys/:id
```

```json
{ "tenantId": "your-tenant-id", "status": "active" }
```

Statuses: `active` (processing), `paused` (stops new enrollments; in-flight runs are parked and resume automatically once active again), `archived` (stops processing and cancels every in-flight run -- not permanent, set status back to `active` to reactivate).

### Add Steps

```
POST /v1/journeys/:id/steps
```

```json
{
  "tenantId": "your-tenant-id",
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
  "tenantId": "your-tenant-id",
  "stepOrder": 2,
  "config": {
    "templateId": "new-template",
    "dedupeKeyPrefix": "onboarding",
    "payload": { "trialDays": 30 }
  }
}
```

Only allowed on journeys in `draft` status. All fields are optional — only provided fields are updated.

### Delete a Step

```
DELETE /v1/journeys/:id/steps/:stepId?tenantId=your-tenant-id
```

Removes a step and reorders remaining steps. Only allowed on journeys in `draft` status.

### Delete a Journey

```
DELETE /v1/journeys/:id?tenantId=your-tenant-id
```

Deletes a journey and its steps. Only allowed on journeys in `draft` or `completed` status with no active runs -- use `POST /v1/journeys/:id/runs/cancel-all` (below) to stop them first.

### List Journey Runs

```
GET /v1/journeys/:id/runs?tenantId=your-tenant-id
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
POST /v1/events/ingest
```

```json
{
  "tenantId": "your-tenant-id",
  "eventName": "user.signed_up",
  "contactEmail": "alice@example.com",
  "payload": { "plan": "starter" }
}
```

When `eventName` matches a journey's `triggerEvent`, a run is created for that contact and the first step is executed.

> Duplicate runs for the same journey + contact are automatically prevented.

---

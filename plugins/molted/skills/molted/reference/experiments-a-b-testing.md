<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Experiments (A/B Testing)

Run experiments on journey steps to compare template variants. `type` is `ab` or `holdout`.

**CLI:** `molted experiments create --name <n> --journey <journeyId> --journey-step <stepId> --type ab|holdout --variants '<json>|@file'`, `molted experiments list [--journey <id>]`, `molted experiments get|start|stop|results <id>`. No MCP tool.

> **Auth:** Experiments endpoints accept either a Bearer API key (plus your `tenantId` on `api.molted.email`) or a portal session cookie (same as templates).

### Create an Experiment

```
POST /v1/experiments
Authorization: Bearer mm_live_...
```

(or `Cookie: <session cookie>` from the portal -- either works, see the Auth note above)

```json
{
  "journeyId": "j_abc",
  "journeyStepId": "step_1",
  "name": "Welcome Email Subject Test",
  "type": "ab",
  "segmentId": "seg_123",
  "variants": [
    { "id": "v1", "name": "Control", "weight": 50, "templateVersionId": "tv_1", "isControl": true, "isHoldout": false },
    { "id": "v2", "name": "Casual Subject", "weight": 50, "templateVersionId": "tv_2", "isControl": false, "isHoldout": false }
  ]
}
```

`journeyId`, `journeyStepId` and `segmentId` must belong to your workspace (a deleted journey does not count, and a given step must belong to the given journey), else `404` (`journey_not_found`, `journey_step_not_found`, `segment_not_found`), the same answer as for an id that does not exist. A malformed id (not a UUID) is `400 invalid_id`.

### Start / Stop

```
POST /v1/experiments/:id/start
POST /v1/experiments/:id/stop
```

### Get Results

```
GET /v1/experiments/:id/results
```

Response:
```json
[
  {
    "variantId": "v1",
    "variantName": "Control",
    "totalAssigned": 500,
    "totalSent": 498,
    "totalDelivered": 490,
    "totalConverted": 45,
    "conversionRate": 0.09,
    "isSignificant": false,
    "pValue": 0.12,
    "confidenceInterval": [0.065, 0.115]
  },
  {
    "variantId": "v2",
    "variantName": "Casual Subject",
    "totalAssigned": 500,
    "totalSent": 497,
    "totalDelivered": 489,
    "totalConverted": 62,
    "conversionRate": 0.124,
    "isSignificant": true,
    "pValue": 0.03,
    "confidenceInterval": [0.095, 0.153]
  }
]
```

---

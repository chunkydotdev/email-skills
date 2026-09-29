<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Outcome Tracking & Attribution

Record business outcomes and attribute them to email touchpoints.

### Ingest an Outcome

```
POST /v1/outcomes/ingest
```

```json
{
  "tenantId": "your-tenant-id",
  "contactEmail": "alice@example.com",
  "eventType": "deal_closed",
  "eventName": "Enterprise Deal Won",
  "revenue": 15000,
  "metadata": { "dealId": "deal_xyz" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tenantId` | yes | Your tenant identifier |
| `contactEmail` | yes | Contact email to attribute |
| `eventType` | yes | One of: `activation`, `trial_conversion`, `meeting_booked`, `deal_closed`, `upsell`, `custom` |
| `eventName` | yes | Human-readable event label |
| `revenue` | no | Revenue amount attributed to this outcome |
| `metadata` | no | Arbitrary metadata (object) |
| `occurredAt` | no | ISO 8601 timestamp. Defaults to now if omitted. |

### List Outcomes

```
GET /v1/outcomes?tenantId=your-tenant-id&eventType=deal_closed&startDate=2026-01-01&endDate=2026-02-28
```

### Outcomes Dashboard

Get a summary of outcomes over the last 30 days:

```
GET /v1/outcomes/dashboard?tenantId=your-tenant-id
```

Response:
```json
{
  "totalOutcomes": 120,
  "totalRevenue": 48000,
  "byType": [
    { "event_type": "deal_closed", "count": 15, "revenue": 35000 },
    { "event_type": "meeting_booked", "count": 45, "revenue": 0 },
    { "event_type": "trial_conversion", "count": 60, "revenue": 13000 }
  ]
}
```

### Journey Impact Report

See how journeys contribute to outcomes:

```
GET /v1/outcomes/journey-impact?tenantId=your-tenant-id
```

Response:
```json
[
  {
    "journeyId": "j_abc",
    "journeyName": "Onboarding Sequence",
    "totalOutcomes": 120,
    "totalRevenue": 48000,
    "attributedOutcomes": 85,
    "attributedRevenue": 34000,
    "segmentBreakdown": { "seg_123": { "outcomes": 50, "revenue": 20000 } },
    "experimentBreakdown": { "exp_456": { "outcomes": 30, "revenue": 12000 } }
  }
]
```

---

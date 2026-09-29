<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Agent Analytics

### Contact Fatigue Score

Check how fatigued a contact is before deciding to send:

```
GET /v1/agent/analytics/contact-fatigue?tenantId=your-tenant-id&contactEmail=alice@example.com
```

Response:
```json
{
  "contactEmail": "alice@example.com",
  "fatigueScore": 45,
  "factors": {
    "sendFrequency": 15,
    "bounceCount": 0,
    "complaintCount": 0,
    "replyRate": 0.3,
    "daysSinceLastEngagement": 12
  },
  "recommendation": "reduce_frequency"
}
```

| Score | Recommendation | Meaning |
|-------|---------------|---------|
| 0–39 | `safe_to_send` | Contact is healthy, send freely |
| 40–69 | `reduce_frequency` | Reduce cadence, space out sends |
| 70–100 | `stop_sending` | Contact is over-contacted or disengaged — stop |

### Send Velocity

```
GET /v1/agent/analytics/send-velocity?tenantId=your-tenant-id
```

Returns send volume counts across time windows and an hourly trend for the last 24 hours.

```json
{
  "tenantId": "your-tenant-id",
  "lastHour": 12,
  "last24Hours": 156,
  "last7Days": 892,
  "hourlyTrend": [
    { "hour": "2026-04-10 08:00:00+00", "count": 5 },
    { "hour": "2026-04-10 09:00:00+00", "count": 8 }
  ]
}
```

`hourlyTrend` is an empty array when there are no sends in the last 24 hours.

### Deliverability Stats

```
GET /v1/agent/analytics/deliverability?tenantId=your-tenant-id&period=7d
```

Periods: `24h`, `7d`, `30d`. Returns bounce rate, complaint rate, and delivery success rate.

### Segment Membership Check

```
GET /v1/agent/analytics/segment-check?tenantId=your-tenant-id&segmentId=seg_123&contactEmail=alice@example.com
```

Returns whether the contact is a member of the segment.

### Policy Decisions

```
GET /v1/agent/analytics/policy-decisions?tenantId=your-tenant-id&period=7d
```

Periods: `24h`, `7d`, `30d`. Returns a breakdown of policy decisions (blocked reasons with counts and percentages).

### Suppression Analytics

```
GET /v1/agent/analytics/suppressions?tenantId=your-tenant-id&period=7d
```

Periods: `24h`, `7d`, `30d`. Returns suppression counts grouped by reason code.

---

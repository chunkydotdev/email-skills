<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Agent Analytics

For a mailbox-scoped key, send velocity, deliverability and policy decisions count only the mailboxes it can read, and suppression analytics need a key with access to all mailboxes. Contact fatigue always counts every mailbox, so a scoped agent sees the contact's full load.

### Contact Fatigue Score

Check how fatigued a contact is before deciding to send:

```
GET /v1/agent/analytics/contact-fatigue?contactEmail=alice@example.com
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
GET /v1/agent/analytics/send-velocity
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
GET /v1/agent/analytics/deliverability?period=7d
```

Periods: `24h`, `7d`, `30d`. Returns `totalSent`, `delivered`, `bounced`, `complained`, `deliveryRate`, `bounceRate`, `complaintRate`, and `hasData`. `hasData` is `false` when `totalSent` is 0 for the period -- the rates are 0 too, but that means nothing was sent, not a perfect score.

### Segment Membership Check

```
GET /v1/agent/analytics/segment-check?segmentId=seg_123&contactEmail=alice@example.com
```

Returns whether the contact is a member of the segment.

### Policy Decisions

```
GET /v1/agent/analytics/policy-decisions?period=7d
```

Periods: `24h`, `7d`, `30d`. Returns `totalAllowed`, `totalBlocked`, `blockRate`, `hasData`, `blocksByReason`, and `dailyTrend`. `hasData` is `false` when there were no policy decisions in the period -- `blockRate` is 0 too, but that means no data, not "nothing was blocked".

### Suppression Analytics

```
GET /v1/agent/analytics/suppressions?period=7d
```

Periods: `24h`, `7d`, `30d`. Returns suppression counts grouped by reason code.

---

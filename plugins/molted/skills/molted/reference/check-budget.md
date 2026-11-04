<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Check Budget

See remaining send quota before committing to a batch:

```
GET /v1/agent/budget
```

Response:
```json
{
  "tenantId": "your-tenant-id",
  "monthly": { "used": 450, "limit": 1000, "remaining": 550 },
  "daily": { "used": 42, "limit": 1000, "remaining": 958 },
  "hourly": { "used": 8, "limit": 100, "remaining": 92 },
  "inbound": { "used": 120, "limit": 5000, "remaining": 4880, "held": 0, "heldReason": null, "overAllowanceBehavior": "overage" },
  "negativeSignals": { "count": 1, "budget": 50, "remaining": 49 },
  "timestamp": "2026-02-25T15:30:00Z"
}
```

`inbound` is the month's received mail against the inbound allowance (see [Activate billing](#activate-billing)), `null` if it couldn't be read (`limit`/`remaining` `null` = unlimited). `teamAddressSends: { used }` counts this month's sends to verified team addresses (members' verified emails and confirmed notification addresses), which count toward the hourly limit only.

**Free plan ramp (#1465):** a new Free account's daily limit ramps by age from its Free activation: 20/day in week 1, 50/day in week 2, then the plan's 100/day. During the ramp `daily.limit` is the ramp step, `daily.planLimit` the plan's cap, and `daily.freeRamp` carries `step`, `dailyLimit`, `startedAt`, `held`, `holdReason` (`complaint_rate` above 0.1%, `bounce_rate` above 5% from 20 sends, or `mailbox_paused`), `nextStepDailyLimit` and `nextStepAt`. A held account stays at its step until the rates recover. Both fields are absent once the ramp is done (and for accounts that were on Free before it shipped). Over the ramp's limit, sends block with `daily_limit_exceeded`.

---

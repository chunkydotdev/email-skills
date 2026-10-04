<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Rate Limits

Per-tenant quotas (configurable by plan):

| Window | Default |
|--------|---------|
| Monthly | Plan-based (Trial: 100, Free: 3,000, Solo: 10,000, Team: 50,000) |
| Daily | 10,000 |
| Hourly | 1,000 |
| Negative signal budget | 50 bounces+complaints per 24h |

Check current usage with `GET /v1/agent/budget` before large batches.

**What counts toward quota:** only a send actually accepted for delivery -- queued, scheduled (including a warmup-deferred slot), or a held send once a human approves it and it reaches the queue. A send blocked by policy (suppression, cooldown, disengagement, a pause, warmup/domain throttling, `rate_limited` itself), a duplicate `dedupeKey` retry, and a held send that is rejected or expires unanswered never consume quota, even though a `send_requests` row is recorded for them.

---

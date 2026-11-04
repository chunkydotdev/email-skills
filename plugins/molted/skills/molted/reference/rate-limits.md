<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Rate Limits

Per-tenant quotas (configurable by plan):

| Plan | Monthly | Daily | Hourly |
|------|---------|-------|--------|
| Trial (no plan yet; sends blocked until one is active) and a paid plan's 3-day trial | 100 in total | 50 | 20 |
| Free | 3,000 | 100 (20/day in week 1, 50/day in week 2) | 40 |
| Solo | 10,000 | 1,000 | 200 |
| Team | 50,000 | 5,000 | 1,000 |
| Enterprise | unlimited | unlimited | unlimited |

Plus a negative-signal budget: 50 bounces + complaints per 24h (`negative_signal_budget_exceeded`).

Check current usage with `GET /v1/agent/budget` before large batches.

**What counts toward quota:** only a send actually accepted for delivery -- queued, scheduled (including a warmup-deferred slot), or a held send once a human approves it and it reaches the queue. A send blocked by policy (suppression, cooldown, disengagement, a pause, warmup/domain throttling, `rate_limited` itself), a duplicate `dedupeKey` retry, and a held send that is rejected or expires unanswered never consume quota, even though a `send_requests` row is recorded for them.

---

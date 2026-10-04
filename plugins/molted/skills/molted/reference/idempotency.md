<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Idempotency

The `dedupeKey` field guarantees exactly-once semantics:

- First call with a given `dedupeKey` → processed normally
- Subsequent calls with the same `dedupeKey` → blocked with reason `duplicate`

Use deterministic keys like `{workflow}-{contactId}-{step}` to make retries safe. Empty or whitespace-only `dedupeKey` values are rejected with `400 dedupe_key_required` -- they would cause all such sends to collide into one "duplicate" and silently block subsequent sends.

---

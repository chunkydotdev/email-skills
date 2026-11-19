<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Error Handling

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success (check `status` field — may be `blocked`) |
| 400 | Validation error (missing/invalid fields) |
| 401 | Invalid or missing API key, or `key_creator_not_member` (the person who created the key has left the workspace) |
| 403 | Insufficient scope or tenant mismatch |
| 403 | Also `role_required`, when your key's creator's [workspace role](#workspace-roles) is too low for the action. Don't retry; show `message` and `how_to_fix` to a person |
| 402 | Plan or payment problem (e.g. `subscription_expired`, `humanizer_allowance_exhausted`) |
| 403 | Also `human_decision_required` (with a `decisionUrl`): a human must decide, don't retry |
| 404 | Resource not found |
| 409 | Conflict with the current state (duplicate resource, wrong state, `thread_taken_over`, ...) |
| 408 | `request_timeout`: a large request body (an upload, or a body over 100 KB sent with a valid key) did not arrive within 30 seconds. Retry on a faster connection |
| 429 | Too many requests on a rate-limited route (e.g. `confirmation_rate_limited`, `rate_limited`, `device_flow_busy`). Wait for `retryAfterSeconds` (also the `Retry-After` header) and retry |
| 429 | Also `key_verify_throttled`: too many wrong keys that start like yours came from your network, so keys with that start are checked once every 30 seconds. Retry after `retryAfterMs` (the CLI retries once for you). A key that has been used successfully is never refused this way. If it keeps happening, rotate the key |
| 429 | Also `too_many_large_bodies`: this key already has 4 request bodies over 100 KB being read at once on `mailbox.molted.email`. Wait for one to finish and retry |
| 409 | Also `invite_limit_reached`: the workspace already has 50 open invites. Revoke some or wait for them to expire |
| 500 | Server error |
| 503 | A dependency is unavailable (e.g. `suppression_check_unavailable`); retry later, never treat as success |
| 503 | Also `key_verify_busy`: Molted is checking too many keys it cannot recognise quickly at once. Nothing is wrong with your key; retry after `retryAfterSeconds` |

**Key distinction:** A policy-blocked send returns `200` with `status: "blocked"`, not a 4xx. This is intentional — the request was valid, policy just didn't allow it. Always inspect the response body.

**Reporting a problem:** `traceId` in an error body, or the `x-request-id` header on any response, identifies the HTTP request; quote it when reporting a problem. It is not a send's `requestId`.

---

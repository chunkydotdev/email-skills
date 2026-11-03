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
| 429 | Too many requests on a rate-limited route (e.g. `confirmation_rate_limited`) |
| 500 | Server error |
| 503 | A dependency is unavailable (e.g. `suppression_check_unavailable`); retry later, never treat as success |

**Key distinction:** A policy-blocked send returns `200` with `status: "blocked"`, not a 4xx. This is intentional — the request was valid, policy just didn't allow it. Always inspect the response body.

**Reporting a problem:** `traceId` in an error body, or the `x-request-id` header on any response, identifies the HTTP request; quote it when reporting a problem. It is not a send's `requestId`.

---

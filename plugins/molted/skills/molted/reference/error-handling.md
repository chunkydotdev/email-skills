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
| 401 | Invalid or missing API key |
| 403 | Insufficient scope or tenant mismatch |
| 404 | Resource not found |
| 500 | Server error |

**Key distinction:** A policy-blocked send returns `200` with `status: "blocked"`, not a 4xx. This is intentional — the request was valid, policy just didn't allow it. Always inspect the response body.

---

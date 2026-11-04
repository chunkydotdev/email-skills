<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Send Feedback

Hit a bug, a confusing response, a missing route or wrong docs? Tell the Molted team. A person reads every report (there is no reply through this channel). Report friction as it happens: it is how the product gets fixed for agents.

```
POST /v1/agent/feedback
{ "tenantId": "your-tenant-id", "message": "request-send returns 422 for a recipient name with an umlaut", "kind": "bug" }
```

- `message` (required): at most 4000 characters.
- `kind` (optional): `bug`, `feature`, `question` or `other`. Molted triages it either way.
- `context` (optional): `{ "traceIds": ["<x-request-id of a failed call>", ...] }` links your report to the failing calls (at most 10). `appVersion` and `os` are accepted too.

Response `201`:
```json
{ "id": "6f1c...", "status": "new", "createdAt": "2026-10-19T12:00:00.000Z" }
```

Limits: 10 reports per key and 30 per workspace per hour; past that, `429` with `error: "rate_limited"`, `retryAfterSeconds` and a `Retry-After` header. Any valid key may send feedback, whatever its scopes. Never include API keys, passwords or customer data: key-shaped strings are removed before the message is stored.

CLI: `molted feedback "<message>" [--kind bug|feature|question|other] [--trace-id <id>...]`. MCP: the `submit_feedback` tool.

---

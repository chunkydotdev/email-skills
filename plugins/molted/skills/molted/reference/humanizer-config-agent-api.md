<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Humanizer Config (Agent API)

Get and update the email humanizer configuration. When enabled, outbound emails pass through AI processing to improve tone and readability.

### Get Humanizer Config

```
GET /v1/agent/config/humanizer?tenantId=your-tenant-id
```

Response:
```json
{
  "enabled": true,
  "style": "professional",
  "provider": "anthropic"
}
```

### Update Humanizer Config

```
PUT /v1/agent/config/humanizer?tenantId=your-tenant-id
```

```json
{
  "enabled": true,
  "style": "friendly",
  "provider": "anthropic"
}
```

Fields:
- `enabled` (boolean, required) - whether outbound emails are humanized before delivery
- `style` (string, optional) - humanization tone/style
- `provider` (string, optional) - AI provider: "anthropic" or "openai"

**Plan limits (#1460):** each rewrite counts against the plan's allowance (Free 0, Solo 50/mo, Team 300/mo, paid trial 5 in total, Enterprise unlimited). Solo and Team continue with credits at $0.02 each up to twice the allowance, billed on the next renewal invoice (a workspace whose plan is set by Molted support gets the allowance but no credits). A retried delivery counts once; a failed rewrite doesn't count.
- Turning it on (`"enabled": true`, here or via `PUT /v1/agent/agents/:agentId/config` with `humanizer_enabled: true`) on a plan without it returns `403 {"error": "humanizer_not_in_plan", "message": "...", "plan": "free"}`. Turning it off always works.
- A send is never refused for this. When its rewrite will be skipped (not in the plan, the allowance used on a plan without credits such as a trial or a plan set by Molted support, or the monthly cap reached), the email still goes out un-rewritten and the send response (and each batch result) carries `"warnings": ["humanizer_not_in_plan" | "humanizer_allowance_exhausted" | "humanizer_credit_cap_reached"]`. The worker records `humanizer.skipped` in the audit log, and once per workspace `humanizer.disabled_by_plan` when a saved setting is on but the plan doesn't include it.

---

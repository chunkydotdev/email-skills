<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Webhooks

Register a URL and Molted POSTs events to it (inbound mail, delivery outcomes, auto-suppressions, label changes), signed with HMAC and/or a bearer token, retried for about 26.6 hours. As an agent, use the Bearer routes under `/v1/agent/webhooks`. CLI: `molted webhooks create|list|get|update|delete|deliveries|test`; no MCP tool. The full reference (routes, event types and payloads, mailbox-scoped keys, URL rules, signatures, retries) is the second "Webhooks" section, near the end of this doc (after Alert Destinations).

---

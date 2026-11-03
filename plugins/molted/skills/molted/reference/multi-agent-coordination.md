<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Multi-Agent Coordination

When multiple agents operate on the same tenant, use coordination primitives to prevent conflicts.

The agent registry, leases and consensus votes are shared by every mailbox, so register, lease, release, list leases, create consensus and vote need a key that reaches every mailbox (a mailbox-scoped key gets `403 mailbox_scope_denied`) with a write-level scope (`automation`, `manage` or `admin`; otherwise `403 insufficient_scope`). Heartbeat only needs a valid key for the tenant.

**CLI:** `molted agents register|heartbeat|lease|release-lease|leases`, `molted agents consensus create|get|vote`, `molted agents config|update-config`. **MCP:** `register_agent`, `heartbeat`, `acquire_lease`, `release_lease`, `list_leases`, `create_consensus`, `get_consensus`, `vote`.

### Register Agent

```
POST /v1/agent/register
```

```json
{
  "agentName": "outbound-sdr",
  "agentRole": "outbound",
  "bindKey": true
}
```

Response:
```json
{
  "id": "agent_1a2b3c4d-5e6",
  "tenantId": "your-tenant-id",
  "agentName": "outbound-sdr",
  "agentRole": "outbound",
  "lastHeartbeat": "2026-10-21T10:00:00.000Z",
  "registeredAt": "2026-10-21T10:00:00.000Z",
  "apiKeyBinding": "bound"
}
```

`id` is `agent_` plus the first 12 characters of a UUID. Use it as `agentId` in subsequent calls (every coordination route also accepts `agentName` in its place). Registering is an upsert on `(tenant, agentName)`: re-registering the same name returns the same `id` and refreshes its heartbeat and `agentRole`. `agentRole` is free text (default `general`).

`bindKey` (default `false` on this raw API route; the CLI and MCP tool default it to `true`) binds
the calling API key to this agent, so per-agent config (`PUT /v1/agent/agents/:agentId/config`, e.g.
`humanizer_enabled`) applies to every send this key makes -- without a bound key, only an `x-agent-id`
header picks the agent (only an agent no key is bound to), and no first-party client sends one. A bound
key's agent also decides the contact-lease check and wins over `x-agent-id`.

**Binding is permanent for a key.** A key already bound to a different agent is never re-pointed, and
an agent that already has a different key bound to it never gets a second one. There is no unbind or
rebind route today -- to act as a different agent, use a different API key. The response carries
`apiKeyBinding`: `"bound"`, `"already_bound"` (a re-register with the same key/agent),
`"bound_to_other_agent"` (with `boundToAgentId`; this key kept its original agent),
`"agent_has_other_key"` (a different key already answers for this agent; this key was not bound),
`"not_requested"` (`bindKey` was false/absent), or `"not_applicable"` (no key to bind: the env key, a
human session, or a system hop). `bound_to_other_agent` and `agent_has_other_key` still return a 200 --
registration of the agent itself succeeded, only the binding did not.

### Heartbeat

Keep your registration alive:

```
POST /v1/agent/coordination/heartbeat
```

```json
{
  "agentId": "agent_abc123"
}
```

Response: `{ "ok": true }`. An unknown agent is `404 agent_not_found`.

### Contact Lease

Acquire exclusive access to a contact for a time window. Prevents other agents from sending to the same person simultaneously:

```
POST /v1/agent/coordination/lease
```

```json
{
  "agentId": "agent_abc123",
  "contactEmail": "alice@example.com",
  "intent": "outbound_sales",
  "durationMinutes": 30
}
```

`durationMinutes` defaults to 30 and `intent` to `general`. Acquiring a lease you already hold extends it (new `expiresAt`, same `id`).

**Success:**
```json
{
  "id": "lease-uuid",
  "tenantId": "your-tenant-id",
  "agentId": "agent_abc123",
  "contactEmail": "alice@example.com",
  "intent": "outbound_sales",
  "expiresAt": "2026-02-25T16:00:00Z",
  "createdAt": "2026-02-25T15:30:00Z"
}
```

**Conflict** (another agent holds the lease; still a `200`, check `conflict`):
```json
{
  "conflict": true,
  "leaseHolder": {
    "agentId": "agent_other",
    "agentName": "retention-agent",
    "expiresAt": "2026-02-25T15:45:00Z"
  }
}
```

If you get a conflict: wait until `expiresAt` or try a different contact.

Sends to a leased contact by a non-holder agent are blocked with reason `lease_conflict`. The holder is the agent the sending API key is bound to, so a bound key's own sends go through (batch sends are not checked against leases).

### List Active Leases

```
GET /v1/agent/coordination/leases
```

Returns all active contact leases for your tenant.

### Release Lease

```
DELETE /v1/agent/coordination/lease/:id
```

Response: `{ "released": true }` (`false` when no such lease exists for your tenant).

### Consensus Voting

For high-stakes decisions, request approval from peer agents:

```
POST /v1/agent/coordination/consensus
```

```json
{
  "requestingAgentId": "agent_abc123",
  "action": "send_pricing_override",
  "contactEmail": "cto@bigcorp.com",
  "reason": "Contact requested custom pricing, sending override proposal",
  "timeoutMinutes": 60
}
```

`contactEmail` and `reason` are required. `proposerAgent` is accepted for `requestingAgentId` and `proposedAction` for `action`. `timeoutMinutes` defaults to 5; a request still `pending` at its timeout becomes `expired`.

Check consensus status:

```
GET /v1/agent/coordination/consensus/:id
```

Response:
```json
{
  "id": "consensus-uuid",
  "tenantId": "your-tenant-id",
  "requestingAgentId": "agent_sales",
  "action": "send_proposal",
  "contactEmail": "lead@example.com",
  "reason": "Lead scored 85+",
  "status": "approved",
  "timeoutAt": "2025-01-01T00:05:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

Other agents vote:

```
POST /v1/agent/coordination/consensus/:id/vote
```

```json
{
  "agentId": "agent_reviewer",
  "vote": "approve",
  "reason": "Contact is qualified, pricing is within bounds"
}
```

The voting agent must be registered to your tenant, and the consensus request must belong to it; otherwise the vote returns `404`. `agentName` works in place of `agentId`.

The vote response includes the current consensus status:
```json
{
  "id": "vote-uuid",
  "consensusRequestId": "consensus-uuid",
  "agentId": "agent_reviewer",
  "vote": "approve",
  "consensusStatus": "approved",
  "createdAt": "2025-01-01T00:00:01.000Z"
}
```

Status progresses: `pending` → `approved` | `rejected` | `expired`. After each vote the request is `approved` once approve votes reach a strict majority (more than half, at least one vote) of the tenant's active agents (a heartbeat or registration in the last 5 minutes), else `rejected` once reject votes do, where the approving (rejecting) side must also outnumber the other (votes from agents that have since gone inactive still count); an exact tie stays `pending`. A key bound to an agent votes, leases, heartbeats and releases only as that agent: naming another is `403` `agent_mismatch`, and omitting the agent uses the key's. A key with no bound agent may name only agents no key is bound to (`403` `agent_bound_to_key` otherwise), and release only their leases. A vote on a request that is already decided or expired, or past its `timeoutAt`, returns `409` `{ "error": "consensus_closed", "status": "<current status>" }` and is not recorded. `vote` must be `approve` or `reject` (`400` otherwise).

### Agent Config

Get or update per-agent configuration (e.g., humanizer settings):

```
GET /v1/agent/agents/:agentId/config
```

Response:
```json
{
  "humanizer_enabled": true,
  "humanizer_style": "professional",
  "humanizer_provider": "anthropic"
}
```

```
PUT /v1/agent/agents/:agentId/config
```

```json
{
  "humanizer_enabled": true,
  "humanizer_style": "friendly"
}
```

Allowed config keys: `humanizer_enabled` (boolean), `humanizer_style` (string), `humanizer_provider` (string, accepted but ignored -- see below). Unknown keys are silently ignored. This agent's setting overrides the tenant's for sends carrying its agent id; against the sending mailbox's own switch, an explicit off at either wins over an on, and the agent's `humanizer_style` wins over the mailbox's (see [Email Humanizer - Configuration Hierarchy](#configuration-hierarchy)); turning it off always works from an agent key, turning it on or changing its style while on is a human decision. `PUT` needs a key that reaches every mailbox with the `manage` scope (any agent's config is a workspace setting); `GET` needs only a valid key.

### Tenant Settings

Get or update tenant-level settings like the cooldown period between duplicate sends, the physical mailing address for CAN-SPAM compliance, and consent enforcement for marketing sends.

```
GET /v1/agent/config/settings
```

Response:
```json
{
  "cooldownMinutes": 10,
  "physicalAddress": "123 Main St, Suite 100, San Francisco, CA 94105",
  "requireConsentForMarketing": false
}
```

```
PATCH /v1/agent/config/settings
```

```json
{
  "cooldownMinutes": 5,
  "physicalAddress": "123 Main St, Suite 100, San Francisco, CA 94105",
  "requireConsentForMarketing": true
}
```

Fields:
- `cooldownMinutes` (number, 0-1440) - minutes before the same template can be sent to the same recipient again. Default: 10.
- `physicalAddress` (string | null, max 500 chars) - physical mailing address for CAN-SPAM compliance. Required for marketing emails. Set to `null` to clear. Marketing sends are blocked if this is not set.
- `requireConsentForMarketing` (boolean) - opt-in, **default false**. When true, a MARKETING template send to a recipient without active consent (see `consent check`/`consent record` above) is blocked with reason `no_consent`. Transactional templates, `_default`, and `_`-bucket inline sends are always exempt. Turning this on tightens (any key may do it); turning it off loosens and needs a human -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen) above.

`PATCH` needs a key that reaches every mailbox with the `manage` scope; `GET` needs only a valid key. For an agent key, lowering `cooldownMinutes`, changing or clearing an existing `physicalAddress` (setting one where none exists is fine) and turning `requireConsentForMarketing` off are loosening changes and need a human. `cooldownMinutes` is rounded and clamped to 0-1440.

**CLI:** `molted settings get`, `molted settings update [--cooldown-minutes <n>] [--require-consent-for-marketing true|false] [--physical-address <address>]`.

---

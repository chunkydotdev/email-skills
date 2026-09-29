<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Multi-Agent Coordination

When multiple agents operate on the same tenant, use coordination primitives to prevent conflicts.

### Register Agent

```
POST /v1/agent/register
```

```json
{
  "tenantId": "your-tenant-id",
  "agentName": "outbound-sdr",
  "agentRole": "outbound"
}
```

Response includes your `id` (format: `agent_<uuid>`). Use this as `agentId` in subsequent calls.

### Heartbeat

Keep your registration alive:

```
POST /v1/agent/coordination/heartbeat
```

```json
{
  "tenantId": "your-tenant-id",
  "agentId": "agent_abc123"
}
```

### Contact Lease

Acquire exclusive access to a contact for a time window. Prevents other agents from sending to the same person simultaneously:

```
POST /v1/agent/coordination/lease
```

```json
{
  "tenantId": "your-tenant-id",
  "agentId": "agent_abc123",
  "contactEmail": "alice@example.com",
  "intent": "outbound_sales",
  "durationMinutes": 30
}
```

**Success:**
```json
{
  "id": "lease_xyz",
  "agentId": "agent_abc123",
  "contactEmail": "alice@example.com",
  "expiresAt": "2026-02-25T16:00:00Z"
}
```

**Conflict** (another agent holds the lease):
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

Sends to a leased contact by a non-holder agent are blocked with reason `lease_conflict`.

### List Active Leases

```
GET /v1/agent/coordination/leases?tenantId=your-tenant-id
```

Returns all active contact leases for your tenant.

### Release Lease

```
DELETE /v1/agent/coordination/lease/lease_xyz?tenantId=your-tenant-id
```

### Consensus Voting

For high-stakes decisions, request approval from peer agents:

```
POST /v1/agent/coordination/consensus
```

```json
{
  "tenantId": "your-tenant-id",
  "requestingAgentId": "agent_abc123",
  "action": "send_pricing_override",
  "contactEmail": "cto@bigcorp.com",
  "reason": "Contact requested custom pricing, sending override proposal",
  "timeoutMinutes": 60
}
```

Check consensus status:

```
GET /v1/agent/coordination/consensus/:id?tenantId=your-tenant-id
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
  "tenantId": "your-tenant-id",
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

Status progresses: `pending` → `approved` | `rejected` | `expired`.

### Agent Config

Get or update per-agent configuration (e.g., humanizer settings):

```
GET /v1/agent/agents/:agentId/config?tenantId=your-tenant-id
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
PUT /v1/agent/agents/:agentId/config?tenantId=your-tenant-id
```

```json
{
  "humanizer_enabled": true,
  "humanizer_style": "friendly"
}
```

Allowed config keys: `humanizer_enabled` (boolean), `humanizer_style` (string), `humanizer_provider` (string). Unknown keys are silently ignored. This agent's setting overrides the tenant's for sends carrying its agent id -- the mailbox level is style-only (it can't turn the humanizer on or off), so it only ever competes with the agent's `humanizer_style` for which style runs, never for `enabled`/`provider` (see [Email Humanizer - Configuration Hierarchy](#configuration-hierarchy)); turning it off always works from an agent key, turning it on or changing its style/provider while on is a human decision.

### Tenant Settings

Get or update tenant-level settings like the cooldown period between duplicate sends, the physical mailing address for CAN-SPAM compliance, and consent enforcement for marketing sends.

```
GET /v1/agent/config/settings?tenantId=your-tenant-id
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
PATCH /v1/agent/config/settings?tenantId=your-tenant-id
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

---

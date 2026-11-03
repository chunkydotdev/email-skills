<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Agent Adoption (Agent API)

Adoption is how a new agent joins an existing workspace without its owner's password: someone with a key mints a one-time invite token, and the agent claims it for its own API key. A second flow, the device flow, lets an agent with no token ask a person to approve it in the portal.

For the end-to-end walkthrough, including the portal-session `/v1/me/adopt/*` routes a person uses, see [Join an existing workspace (adoption)](#join-an-existing-workspace-adoption). This section is the reference for the agent-facing routes.

**CLI:**

```bash
# Owner side (a key already stored via `molted auth init`, `auth signup` or an earlier adoption)
molted adopt create [--label <label>] [--mailbox <id> ...] [--permissions read,send] [--all-mailboxes] [--expires <minutes>]
molted adopt list
molted adopt revoke <id>

# Agent side (no key needed)
molted adopt claim <token> [--base-url <url>]
molted adopt request [--label <label>] [--base-url <url>]
```

`adopt create` defaults: `--label agent`, `--permissions read,send` (applied to every `--mailbox`), `--expires 1440` (24 hours, max 43200 = 30 days). `adopt create` needs `--mailbox` or `--all-mailboxes`: with neither it errors before sending anything (the API answers `400 scope_required` to a scopeless invite). `adopt claim` and `adopt request` store the new key as the active profile's credentials (`~/.molted/profiles/<profile>.json`). There is no MCP adoption tool.

### Create Invite Token

```
POST /v1/agent/adopt/invite
```

```json
{
  "label": "outreach-agent",
  "scopeAllMailboxes": false,
  "mailboxScopes": [
    { "mailboxId": "mailbox-uuid", "permissions": ["read", "send"] }
  ],
  "expiresMinutes": 1440
}
```

`label` (default `"agent"`, becomes the key's label and the agent's registered name) and `expiresMinutes` (integer 1-43200, default 1440) are optional. The scope is required: set `scopeAllMailboxes: true` (then `mailboxScopes` is ignored) or `mailboxScopes` with at least one entry whose `permissions` include `read`, `send` or `manage` (any other permission is a `400`). With neither, the API answers `400 {"error": "scope_required"}` rather than minting a key with no mailbox access. The device approval (`POST /v1/me/adopt/device/:userCode/approve`) has the same rule.

Response (`token` is shown only here; it is stored hashed):
```json
{
  "id": "invite-uuid",
  "tenantId": "your-tenant-id",
  "label": "outreach-agent",
  "flow": "invite",
  "status": "pending",
  "scopeAllMailboxes": false,
  "mailboxScopes": [{ "mailboxId": "mailbox-uuid", "permissions": ["read", "send"] }],
  "userCode": null,
  "expiresAt": "2026-10-22T10:00:00.000Z",
  "claimedAt": null,
  "approvedAt": null,
  "createdAt": "2026-10-21T10:00:00.000Z",
  "token": "ma_inv_..."
}
```

An invite becomes a key when claimed, so it follows the key rules: an agent key may only invite within its own scope (no all-mailbox invite from a mailbox-scoped key, no mailbox or permission it lacks itself). Anything wider is a human decision: `403 human_decision_required` with a `decisionUrl` in `enforce` mode (see [Decisions need a human](#decisions-need-a-human)). An app connected through OAuth (the hosted MCP) cannot create invites at all (`403 oauth_forbidden`).

### List Pending Tokens

```
GET /v1/agent/adopt/pending
```

Response: an array of the same objects as above, without `token`, newest first: every unclaimed, unrevoked, unexpired invite of the workspace, plus device-flow requests a person already approved but the agent has not yet picked up (`flow: "device"`, `status: "approved"`). A mailbox-scoped key sees only invites it created itself; an all-mailbox key sees every invite in the workspace.

### Revoke Token

```
DELETE /v1/agent/adopt/:id
```

Response:
```json
{
  "revoked": true
}
```

Only a `pending` (or approved, not yet claimed) token can be revoked; a claimed one, or the key it became, is untouched (revoke the key instead). Revoking is a tightening, never gated. A mailbox-scoped key can revoke only an invite it created; anything else, an unknown id, or an already claimed token is `404 Token not found or already claimed`, so ids don't leak.

### Claim an Invite (agent side)

```
POST /v1/adopt/claim
```

```json
{ "token": "ma_inv_..." }
```

No API key: the token is the credential. Response:
```json
{
  "apiKey": "mm_live_...",
  "tenantId": "workspace-tenant-id",
  "keyId": "key-uuid",
  "label": "outreach-agent",
  "agentId": "agent_1a2b3c4d-5e6",
  "next": { "setup": "/v1/agent/setup", "hint": "Call GET /v1/agent/setup with this key next ..." }
}
```

Claiming mints the key with the invite's mailbox scope, registers an agent named after the label (`agentId`, role `general`, with the key bound to it) and points you at your setup checklist ([`GET /v1/agent/setup`](#2-check-your-setup)). A token claims once. An unknown, expired or already claimed token is `404 Invalid or expired token`; a revoked one is `404` with "This code was replaced or revoked. Ask your human for a new prompt." `molted adopt claim` stores the key and prints `{ message, tenant_id, label, agent_id, ready_to_send, next_step, hint }` from the setup checklist; run `molted doctor` next.

### Device Flow (agent side)

For an agent with no token. Start a request (no API key):

```
POST /v1/adopt/device
```

```json
{ "label": "sales-agent" }
```

Response: `{ "deviceCode": "ma_dev_...", "userCode": "ABCD23", "expiresAt": "...", "verificationUrl": "<portal>/adopt/ABCD23" }`. Keep `deviceCode` private; give the person the `verificationUrl` (or the 6-character `userCode`). The request expires after 15 minutes. A signed-in person opens the URL, chooses the mailboxes and permissions, and approves.

Poll until then (no API key):

```
GET /v1/adopt/device/:deviceCode/poll
```

Response: `{ "status": "pending" }` until approved, then once `{ "status": "complete", "apiKey": "mm_live_...", "tenantId": "...", "keyId": "...", "label": "...", "agentId": "...", "next": {...} }` (the same claim as above), or `{ "status": "invalid" }` for an unknown, expired, revoked or already completed request (still a `200`). `molted adopt request` prints the URL and code on stderr, polls every 5 seconds until `expiresAt`, and stores the key on approval.

---

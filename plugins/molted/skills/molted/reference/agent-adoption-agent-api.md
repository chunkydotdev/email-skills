<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Agent Adoption (Agent API)

Manage agent adoption tokens. Owner-side operations for creating, listing, and revoking invite tokens.

### Create Invite Token

```
POST /v1/agent/adopt/invite?tenantId=your-tenant-id
```

```json
{
  "label": "outreach-agent",
  "scopeAllMailboxes": false,
  "mailboxScopes": [
    { "mailboxId": "mbx_abc", "permissions": ["read", "send"] }
  ],
  "expiresMinutes": 1440
}
```

Response:
```json
{
  "id": "tok_abc123",
  "token": "ma_inv_...",
  "label": "outreach-agent",
  "expiresAt": "2026-04-02T12:00:00Z"
}
```

### List Pending Tokens

```
GET /v1/agent/adopt/pending?tenantId=your-tenant-id
```

Response: array of pending adoption tokens. A mailbox-scoped key gets 403 `mailbox_scope_denied` here and on revoke.

### Revoke Token

```
DELETE /v1/agent/adopt/:id?tenantId=your-tenant-id
```

Response:
```json
{
  "revoked": true
}
```

---

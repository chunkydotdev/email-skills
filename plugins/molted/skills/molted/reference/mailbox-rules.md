<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Mailbox Rules

Automate thread routing with pattern-based rules. Rules are evaluated in priority order on incoming messages.

### List Rules

```
GET /v1/agent/rules?tenantId=your-tenant-id
```

### Create a Rule

```
POST /v1/agent/rules
```

```json
{
  "tenantId": "your-tenant-id",
  "mailboxId": "mbx_abc123",
  "name": "Route billing inquiries",
  "field": "subject",
  "pattern": "invoice|billing|payment",
  "action": "move_to_folder",
  "actionConfig": { "folder": "billing" },
  "enabled": true
}
```

### Get a Rule

```
GET /v1/agent/rules/:id?tenantId=your-tenant-id
```

### Update a Rule

```
PATCH /v1/agent/rules/:id?tenantId=your-tenant-id
```

### Delete a Rule

```
DELETE /v1/agent/rules/:id?tenantId=your-tenant-id
```

### Reorder Rules

Change the evaluation priority of rules:

```
POST /v1/agent/rules/reorder
```

```json
{
  "tenantId": "your-tenant-id",
  "ruleIds": ["rule_1", "rule_2", "rule_3"]
}
```

Rules are evaluated top-to-bottom; first match wins.

---

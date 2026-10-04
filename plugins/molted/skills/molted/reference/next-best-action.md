<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Next Best Action

Get a recommendation for what to do next with a contact:

```
POST /v1/agent/next-best-action
```

```json
{
  "tenantId": "your-tenant-id",
  "contactEmail": "alice@example.com"
}
```

Response:
```json
{
  "recommendation": "nudge",
  "reasoning": "Last send was 5 days ago with no response. Contact is in trial stage. A gentle followup is appropriate.",
  "contactSummary": {
    "email": "alice@example.com",
    "name": "Alice",
    "lastSendAt": "2026-02-20T10:00:00Z",
    "lastInboundAt": null,
    "isSuppressed": false,
    "activeIncidents": 0
  }
}
```

### Batch Next Best Action

Get recommendations for multiple contacts at once:

```
POST /v1/agent/batch/next-best-action
```

```json
{
  "tenantId": "your-tenant-id",
  "contactEmails": ["alice@example.com", "bob@example.com"]
}
```

### Recommendation Values

| Value | Meaning |
|-------|---------|
| `reply` | Contact sent something — respond to it |
| `wait` | Too soon to reach out again, let them breathe |
| `nudge` | Time for a gentle followup |
| `stop` | Contact is suppressed, disengaged, or at risk — do not send |
| `escalate` | Situation needs human judgment |

---

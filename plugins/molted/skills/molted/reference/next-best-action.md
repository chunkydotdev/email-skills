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
  "contactEmails": ["alice@example.com", "bob@example.com"]
}
```

### Recommendation Values

| Value | Meaning |
|-------|---------|
| `wait` | Too soon to reach out again (a send, or one awaiting approval, in the last 24 hours with no reply), or no strong signal either way |
| `nudge` | No activity for more than 7 days, or none at all yet: time for a gentle followup or a first outreach |
| `stop` | The contact is suppressed, or recently asked to stop receiving mail (`opt_out`): do not send |
| `escalate` | A recent inbound message from the contact got a non-clean safety verdict: a human should look first |

`reply` is still part of the response type but is no longer returned: what an inbound message asks for is for your agent to read and decide.

---

<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Thread Context

Get the full operational context for a contact — sends, inbound, journeys, suppression:

```
GET /v1/agent/thread-context?tenantId=your-tenant-id&contactEmail=alice@example.com
```

Response:
```json
{
  "timeline": {
    "sends": [
      { "requestId": "req_1", "templateId": "welcome", "status": "delivered", "createdAt": "2026-02-18T10:00:00Z" }
    ],
    "journeyRuns": [
      { "journeyId": "j_1", "runId": "run_1", "status": "active", "createdAt": "2026-02-18T10:00:00Z" }
    ],
    "inboundMessages": [
      { "id": "msg_1", "subject": "Re: welcome", "fromEmail": "alice@example.com", "createdAt": "2026-02-19T14:00:00Z", "contentTrust": "untrusted" }
    ]
  },
  "suppressionStatus": { "suppressed": false },
  "activeIncidents": [],
  "lastClassification": { "intent": "interested", "confidence": 0.92 }
}
```

Every `inboundMessages` entry carries `contentTrust: "untrusted"` -- its `subject` came from the contact. See [Untrusted Content](#untrusted-content) below.

---

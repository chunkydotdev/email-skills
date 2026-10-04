<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Safety Settings (Agent API)

Get and update tenant-wide safety settings that control inbound classification and sending guardrails.

### Get Safety Settings

```
GET /v1/agent/config/safety-settings?tenantId=your-tenant-id
```

Response:
```json
{
  "tenantId": "tenant-xxx",
  "quarantineHighInjection": true,
  "holdCriticalAnomalies": true,
  "blockCanaryViolations": true,
  "spamAction": "quarantine",
  "phishingAction": "quarantine",
  "malwareAction": "reject",
  "abuseAction": "quarantine",
  "impersonationAction": "quarantine",
  "spamThreshold": 0.5,
  "maxLinksThreshold": 5,
  "blockNoAuth": false,
  "blockedKeywords": [],
  "allowedSenders": [],
  "spamActionLowConfidence": "deliver"
}
```

### Update Safety Settings

PUT is a partial update - only fields you include are changed.

```
PUT /v1/agent/config/safety-settings?tenantId=your-tenant-id
```

```json
{
  "spamAction": "reject",
  "spamThreshold": 0.7,
  "blockedKeywords": ["lottery", "urgent"]
}
```

Fields:

Threat response actions (valid values: `"deliver"`, `"quarantine"`, `"reject"`):
- `spamAction` (string) - action for detected spam (default: quarantine)
- `phishingAction` (string) - action for detected phishing (default: quarantine)
- `malwareAction` (string) - action for detected malware (default: reject)
- `abuseAction` (string) - action for abuse/harassment (default: quarantine)
- `impersonationAction` (string) - action for impersonation attempts (default: quarantine)
- `spamActionLowConfidence` (string) - action when spam score is below threshold (default: deliver)

Classification thresholds:
- `spamThreshold` (number, 0.1-1.0) - spam score cutoff, default 0.5
- `maxLinksThreshold` (number, 1-100) - max links per message before flagging, default 5

Guardrail flags (boolean):
- `quarantineHighInjection` (boolean) - quarantine messages with high prompt-injection risk (default: true)
- `holdCriticalAnomalies` (boolean) - hold messages flagged as critical anomalies (default: true)
- `blockCanaryViolations` (boolean) - block messages that trip canary tokens (default: true)
- `blockNoAuth` (boolean) - block messages with no SPF/DKIM authentication (default: false)

Allow/deny lists:
- `blockedKeywords` (string[], max 100) - keywords that trigger quarantine
- `allowedSenders` (string[], max 100) - sender addresses that bypass safety checks

---

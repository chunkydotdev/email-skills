<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Safety Settings (Agent API)

Get and update tenant-wide safety settings that control inbound classification and sending guardrails. This is the one reference for these settings: the same stored settings are also read and written by `GET/PUT /v1/ops/safety-settings` (Bearer), `GET/PUT /v1/me/safety-settings` (portal session) and, for the spam-filter subset, `GET/PUT /v1/spam-filter/rules` (see [Spam Filter Rules](#spam-filter-rules)).

**CLI:** `molted safety get`, `molted safety update --settings '<json>'`. There is no MCP tool for these settings.

### Get Safety Settings

```
GET /v1/agent/config/safety-settings
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

PUT is a partial update - only fields you include are changed (a `null` keeps the current value). An unknown field is a `400`. Needs a key that reaches every mailbox with the `manage` scope (`403 mailbox_scope_denied` / `insufficient_scope` otherwise); `GET` needs only a valid key.

```
PUT /v1/agent/config/safety-settings
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
- `spamActionLowConfidence` (string) - action for a `spam` verdict whose confidence is below 0.5 (default: deliver). Takes precedence over `spamAction` for those messages.

Classification thresholds:
- `spamThreshold` (number, 0.1-1.0) - spam verdict threshold, default 0.5. Lower is more aggressive.
- `maxLinksThreshold` (number, 1-100) - links in a message before the `excessive_links` signal fires, default 5

Guardrail flags (boolean):
- `quarantineHighInjection` (boolean) - quarantine inbound messages with high prompt-injection risk (default: true)
- `holdCriticalAnomalies` (boolean) - hold messages with critical thread anomalies (forged injection, intent flips) for review (default: true)
- `blockCanaryViolations` (boolean) - block outbound sends that leak a thread's canary token (default: true; see [Canary Tokens](#canary-tokens))
- `blockNoAuth` (boolean) - add a heavy spam penalty (+0.5) when SPF, DKIM and DMARC all fail (default: false). It raises the spam score; it does not block on its own.

Allow/deny lists:
- `blockedKeywords` (string[], max 100) - each matching keyword adds +0.4 to the spam score
- `allowedSenders` (string[], max 100) - exact addresses or whole domains. A match only ever downgrades a `spam` verdict to clean, and only when the message passes DMARC; it never masks phishing, malware, abuse, impersonation or a high injection risk (the same rule as the [Sender Allow-List](#sender-allow-list))

**Agents may tighten, never loosen.** For an agent key, a change that loosens is a human decision (`403 human_decision_required` with a `decisionUrl` in `enforce` mode, see [Decisions need a human](#decisions-need-a-human)): turning a guardrail flag off, a weaker action (`reject` > `quarantine` > `deliver`), raising `spamThreshold` or `maxLinksThreshold`, removing a `blockedKeywords` entry, or adding an `allowedSenders` entry. The opposite changes always work.

---

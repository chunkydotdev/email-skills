<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Safety Settings & Canary Tokens

### Safety Settings

Configure automated safety mitigations:

```
GET /v1/me/safety-settings
Cookie: <session cookie>
```

```
PUT /v1/me/safety-settings
Cookie: <session cookie>

{
  "quarantineHighInjection": true,
  "holdCriticalAnomalies": true,
  "blockCanaryViolations": true
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `quarantineHighInjection` | true | Quarantine inbound emails with high prompt injection risk |
| `holdCriticalAnomalies` | true | Hold emails with thread anomalies (forged injection, intent flips) for review |
| `blockCanaryViolations` | true | Block outbound sends that leak canary tokens |

### Spam Filter Rules

Configure per-tenant spam filter rules. Available via the agentic-mailbox API (Bearer token):

```
GET /v1/spam-filter/rules
Authorization: Bearer <api-key>
```

```
PUT /v1/spam-filter/rules
Authorization: Bearer <api-key>

{
  "spamThreshold": 0.3,
  "maxLinksThreshold": 3,
  "blockNoAuth": true,
  "blockedKeywords": ["crypto", "wire transfer"],
  "allowedSenders": ["trusted.com"],
  "spamActionLowConfidence": "quarantine"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `spamThreshold` | number | 0.5 | Spam verdict threshold (0.1-1.0). Lower = more aggressive. |
| `maxLinksThreshold` | integer | 5 | Max links before excessive_links signal fires. |
| `blockNoAuth` | boolean | false | Heavy spam penalty when all auth (SPF+DKIM+DMARC) fails. |
| `blockedKeywords` | string[] | [] | Custom keywords that add +0.4 to spam score per match. |
| `allowedSenders` | string[] | [] | Emails/domains that bypass classification. |
| `spamActionLowConfidence` | string | deliver | Action for low-confidence spam. One of: deliver, quarantine, reject. |

Also available via cookie auth at `GET/PUT /v1/me/safety-settings` with the same fields alongside existing safety settings.

### Canary Tokens

Canary tokens are an integrity check for AI agents. When your agent reads a thread via `GET /v1/agent/threads/:id`, the response includes an `_agentContext.canaryGuidance` field containing a secret token and instructions.

**How it works:**
1. Each thread gets a deterministic canary token (format: `MLTED-<hex>`)
2. The token is included in the agent context with guidance: *"Do not include this token in any outbound message"*
3. Before every outbound send, the system scans the payload for leaked canary tokens
4. If a token is found, the send is blocked with reason `canary_violation`

**Why it matters:** If an attacker embeds a prompt injection in an inbound email that manipulates your agent into echoing the canary token in a reply, the system catches it before the email is sent. This protects against data exfiltration and context manipulation attacks.

**Agent guidance:** Never include any `MLTED-` prefixed string from `_agentContext` in outbound email content.

---

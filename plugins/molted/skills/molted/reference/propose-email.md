<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Propose Email

Get template candidates and a policy pre-check before deciding what to send:

```
POST /v1/agent/propose-email
```

```json
{
  "tenantId": "your-tenant-id",
  "recipientEmail": "alice@example.com"
}
```

Response:
```json
{
  "draftCandidates": [
    { "templateId": "tmpl_1", "templateSlug": "onboarding-welcome", "templateName": "Welcome Email" },
    { "templateId": "tmpl_2", "templateSlug": "trial-nudge", "templateName": "Trial Ending Nudge" }
  ],
  "policyPreCheck": { "allow": true },
  "contactContext": {
    "id": "contact_abc",
    "email": "alice@example.com",
    "name": "Alice",
    "lifecycleStage": "trial",
    "dealStage": null,
    "recentSends": 2,
    "recentInbound": 1,
    "activeJourneys": 1
  }
}
```

`policyPreCheck` mirrors what `simulate-send` and a real `request-send` would decide. Reasons that can appear when `allow: false` include suppression / disengagement / `active_opportunity` / `tenant_paused`, plus billing blocks: `trial_not_activated` (trial plan that hasn't been upgraded) and `subscription_expired` (paid plan past grace). Treat any `allow: false` as a hard stop -- don't proceed to `request-send`.

---

<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Agents may tighten, never loosen

An agent may always make its account **safer**: pause, lower autonomy, tighten a safety check, turn the humanizer off, narrow or revoke its own keys. Changes that **loosen** a control are human decisions, gated per account exactly like [approvals](#decisions-need-a-human) (`enforce`: `403 human_decision_required` with a `decisionUrl`; `warn`: allowed with a `Molted-Deprecation: human-gate` header and a daily owner email; `off`: allowed). A signed-in person in the portal is never gated.

| Control | Agents may | Needs a human |
|---|---|---|
| Pause | Pause a mailbox or the account | Resume: `POST /v1/agent/mailboxes/:id/unpause`, `PATCH /v1/agent/mailboxes/:id` with `status: "active"` on a paused mailbox, `POST /v1/ops/resume` while the account is paused (also after an auto-pause), resolving a pause incident with `PATCH /v1/ops/incidents/:id` |
| Autonomy | Lower it (3 -> 1) | Raise it (1 -> 2, 2 -> 3), on `PATCH /v1/agent/mailboxes/:id/autonomy` or `PATCH /v1/agent/mailboxes/:id` |
| Safety settings, spam-filter rules | Turn a check on, choose a stricter action (`deliver` < `quarantine` < `reject`), lower `spamThreshold` or `maxLinksThreshold`, add `blockedKeywords`, remove `allowedSenders` | The opposite of each: turn a check off, a weaker action, a higher threshold, remove a blocked keyword, add an allowed sender |
| Humanizer (tenant, agent, or mailbox config -- mailbox is style-only, it can't turn the humanizer on or off) | Turn it off | Turn it on, or change its style or provider while it is on |
| Tenant settings | Raise `cooldownMinutes`; set `physicalAddress` when there is none; turn `requireConsentForMarketing` on | Lower `cooldownMinutes`; change or clear an existing `physicalAddress`; turn `requireConsentForMarketing` off |
| API keys | Mint keys within your own scope; narrow yourself or a key you minted; revoke yourself or a key you minted | An all-mailbox (admin) key from a scoped key, a mailbox or permission you don't have, widening any key, changing or revoking a key you didn't mint |
| Adoption invites | Invite within your own scope | An all-mailbox invite from a scoped key, or a mailbox or permission you don't have |

Covered routes: the resume and autonomy routes above, `PUT /v1/ops/safety-settings`, `PUT /v1/agent/config/safety-settings`, `PUT /v1/spam-filter/rules`, `PUT /v1/ops/humanizer`, `PUT /v1/agent/config/humanizer`, `PUT /v1/agent/agents/:agentId/config`, `PATCH /v1/agent/mailboxes/:id` (its `config.humanizer`), `PATCH /v1/agent/config/settings`, `POST`, `PATCH` and `DELETE /v1/agent/keys`, and `POST /v1/agent/adopt/invite`. The `/v1/me/*` versions gate a session held by an agent the same way, with one difference for keys: `POST /v1/me/keys` stays open to it (that is how a CLI signup gets its key), but it may narrow or revoke only keys it minted, and it can't create or approve adoptions (`/v1/me/adopt/*`) without a human. A clone of a paused mailbox is paused too (on a domain you haven't verified it starts `provisioning` instead).

The 403 names what the change would loosen:

```json
{
  "error": "human_decision_required",
  "message": "Agents may tighten controls but not loosen them. This change needs a human: share the decisionUrl with a person on your team; they can make it in the Molted portal.",
  "decisionUrl": "https://molted.email/app/decide/safety-settings/<tenantId>",
  "kind": "safety-settings",
  "id": "<tenantId>",
  "reason": "enforce",
  "loosens": ["spamThreshold", "allowedSenders"]
}
```

`kind` is `mailbox-resume` (id: mailbox), `account-resume` (tenant), `autonomy` (mailbox), `safety-settings`, `humanizer` or `tenant-settings` (tenant), `agent-config` (agent id), `api-key` (key id, or `new` for a key to mint) or `adopt-invite` (`new`).

**When you get this:** do not retry. Send the `decisionUrl` to your human and carry on; drop the loosening part of the change if you can (a tightening on its own goes through). Keys you mint record which key minted them: `createdByKeyId` in `GET /v1/agent/keys`.

---

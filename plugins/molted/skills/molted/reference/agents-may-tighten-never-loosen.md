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
| Humanizer (tenant, agent, or mailbox config; `provider` is fixed to `anthropic` and not a setting, #2115) | Turn it off (a mailbox: `config.humanizer.enabled: false`) | Turn it on, or change its style while it is on. For a mailbox, "on" is its effective state given the tenant setting (`true` while the tenant is off, or clearing a `false` while it is on), and any change to its own style counts |
| Tenant settings | Raise `cooldownMinutes`; set `physicalAddress` when there is none; turn `requireConsentForMarketing` on | Lower `cooldownMinutes`; change or clear an existing `physicalAddress`; turn `requireConsentForMarketing` off |
| API keys | Mint keys within your own scope; narrow yourself or a key you minted; revoke yourself or a key you minted (any key you own, from a session) | An all-mailbox (admin) key from a scoped key, a mailbox or permission you don't have, widening any key, narrowing a key you didn't mint |
| Adoption invites | Invite within your own scope; revoke an invite (a mailbox-scoped key: only one it created) | An all-mailbox invite from a scoped key, or a mailbox or permission you don't have |
| Suppressions | Add a suppression (`POST /v1/suppressions`, `/v1/ops/suppressions`, `/v1/ops/suppressions/bulk`); re-adding one never shortens an active suppression's expiry or replaces a stronger reason with a weaker one, and `source: "portal_keep_away"` is reserved (`400 reserved_source`) | Remove one (`DELETE /v1/suppressions/:id`, `/v1/ops/suppressions/:id`), or un-suppress a whole domain (`DELETE /v1/suppressed-domains/:domain`) |
| Domain warmup | Read status | Skip it (`POST /v1/agent/domains/:id/warmup/skip`) -- can't be undone |
| Domain rate limits | Lower a limit | Raise a limit, or clear one to unlimited, on `PATCH /v1/agent/domains/:id/rate-limits` |
| Contacts | Create, update, sync (#2231, #2232) | Delete a contact record (`DELETE /v1/contacts/:id`) -- irreversible, see [Contacts](#contacts) below |
| Mailbox address and catch-all | Read them; send the value already stored (a no-op) | Any change to `address` (a change in case only counts too), and turning `catchAll` on or off, on `PATCH /v1/agent/mailboxes/:id` (`kind: "mailbox-address"`, `id`: the mailbox id). Either one changes which email reaches the mailbox. The whole request is refused, other fields included. So are creating or cloning a mailbox onto an address another mailbox's catch-all receives (`id`: the catch-all mailbox), and deleting a catch-all mailbox. A person makes the change in the portal, on the mailbox's page under Address (the `decisionUrl` opens it). `GET /v1/agent/mailboxes/:id` has `catchAllAvailable`: whether the domain can have a catch-all at all. Addresses ignore case: a create, clone, rename or restore onto an address a live mailbox has, in any case, is `409 mailbox_address_taken` for everyone |

Covered routes: the resume and autonomy routes above, `PUT /v1/ops/safety-settings`, `PUT /v1/agent/config/safety-settings`, `PUT /v1/spam-filter/rules`, `PUT /v1/ops/humanizer`, `PUT /v1/agent/config/humanizer`, `PUT /v1/agent/agents/:agentId/config`, `PATCH /v1/agent/mailboxes/:id` (its `config.humanizer`, `address` and `catchAll`), `PATCH /v1/agent/config/settings`, `POST /v1/agent/keys`, `PATCH` and `DELETE /v1/agent/keys/:id`, `POST /v1/agent/adopt/invite` (revoking with `DELETE /v1/agent/adopt/:id` is never gated), `DELETE /v1/suppressions/:id`, `DELETE /v1/ops/suppressions/:id`, `DELETE /v1/suppressed-domains/:domain`, `POST /v1/agent/domains/:id/warmup/skip`, `PATCH /v1/agent/domains/:id/rate-limits` and `DELETE /v1/contacts/:id` (same route under `/v1/agent/contacts/:id` and the agentic-mailbox's native `/v1/contacts/:id`). The `/v1/me/*` versions gate a session held by an agent the same way, with one difference for keys: `POST /v1/me/keys` stays open to it (that is how a CLI signup gets its key), and revoking any key it owns is never gated (a tightening), but it may narrow only a key it minted, and it can't create an invite, approve a device-flow request or read an invite's status (`/v1/me/adopt/*`) without a human -- revoking an adoption invite there is open, same as the agent route. Removing a contact's portal keep-away (`DELETE /v1/me/contacts/:id/keep-away`) is gated as a suppression removal. A clone of a paused mailbox is paused too (on a domain you haven't verified it starts `provisioning` instead).

Narrowing a key does not cascade: a key it already minted keeps its wider scope until you narrow or revoke that key too. Check `createdByKeyId` in `GET /v1/agent/keys` to find what a key minted.

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

`kind` is `mailbox-resume` (id: mailbox), `account-resume` (tenant), `autonomy` (mailbox), `safety-settings`, `humanizer` or `tenant-settings` (tenant), `agent-config` (agent id), `api-key` (key id, or `new` for a key to mint), `adopt-invite` (`new`), `suppression` (the suppression id, or the domain for `DELETE /v1/suppressed-domains/:domain`), `domain-warmup` or `domain-rate-limits` (domain id), `contact` (the contact id), or `mailbox-address` (mailbox: a change to its address or catch-all).

**When you get this:** do not retry. Send the `decisionUrl` to your human and carry on; drop the loosening part of the change if you can (a tightening on its own goes through). Keys you mint record which key minted them: `createdByKeyId` in `GET /v1/agent/keys`.

### Pausing and resuming the account

Pausing the whole account (every mailbox) is open to agents at any time; resuming is the loosening half of the same control (see the table above).

```
POST /v1/ops/pause
Authorization: Bearer mm_live_...
Content-Type: application/json

{ "reason": "investigating a bounce spike" }
```

`reason` is optional (defaults to `"Manual pause"`). This opens a `manual_pause` incident and is **not idempotent** -- calling it again while already paused opens a second incident (tracked in #1907). Check `GET /v1/ops/incidents?status=open` first if you want to avoid piling up incidents.

```
POST /v1/ops/resume
Authorization: Bearer mm_live_...
```

No body required. Gated per [Agents may tighten, never loosen](#agents-may-tighten-never-loosen): `enforce` returns `403 human_decision_required` with a `decisionUrl`; `warn` allows it with a `Molted-Deprecation: human-gate` header; `off` allows it. A human can also resolve the pause incident directly (`PATCH /v1/ops/incidents/:id` with `status: "resolved"`), which resumes the account the same way.

```
GET /v1/ops/incidents?status=open
```

Lists open/acknowledged/resolved incidents (`manual_pause`, `auto_pause`, and others) for the tenant.

CLI: `molted incidents list`, `molted incidents list --status open`, `molted incidents ack <id>` (never gated), `molted incidents resolve <id>` (gated the same as `molted resume` when the incident is an open pause).

---

<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Authentication

Every request requires a Bearer token and your tenant ID:

```
Authorization: Bearer mm_live_...
```

On `https://api.molted.email`, include `tenantId` in the request body (POST) or query string (GET/DELETE) for every call; some POST routes read it from the query string instead (`POST /v1/agent/adopt/invite`). The base URL (`https://mailbox.molted.email`, the host the CLI and MCP use) fills it in from your key, so the examples here leave it out.

Keys can be scoped to specific mailboxes with granular permissions:

| Permission | Capabilities |
|------------|-------------|
| `read` | View emails, threads, metrics for the mailbox |
| `send` | Send and propose emails from the mailbox |
| `manage` | Update settings, approve/reject approval queue, archive emails |

A key created without `mailboxScopes` (and without `"scopeAllMailboxes": false`) is an all-mailbox `admin` key. A key explicitly scoped to no mailboxes has no access at all. New keys created in the portal default to explicit mailbox scoping.

Example: An onboarding agent's key might have `read` + `send` on the support mailbox only, while a monitoring key has `read` on all mailboxes.

**Workspace-wide routes.** Some routes act on the whole workspace, not one mailbox: domains (add, verify, delete, warmup skip, rate limits, tracking), provider policy and health checks, billing `setup-link` and `activate-free`, alert destinations (all of them, including the list and deliveries), inbound hooks (all of them), account, humanizer and safety settings under `/v1/agent/config/*` and `/v1/ops/*`, resuming the account, updating incidents, an agent's config, writes to contacts, lists and segments, removing suppressions and suppressed domains and the full suppression lists, granting consent, agent coordination (register, leases including the lease list, consensus), the event, outcome and deliverability-event ingest routes, and writes to journeys, templates and experiments (plus journey runs and experiment results). A mailbox-scoped key gets `403 mailbox_scope_denied` on these, even with `manage` on its mailbox. Changes that only tighten are the exception, so a scoped agent can honour an unsubscribe: adding a suppression or suppressed domain, recording a consent withdrawal (`POST /v1/consent` with `revokedAt`) and unsubscribing from a list work for a scoped key with `send` or `manage` on at least one mailbox (a read-only key gets `403 mailbox_scope_denied`). A key with access to all mailboxes also needs a write-level scope for the changes (`manage` or `admin` for settings, contacts, lists, segments and removing a suppression; `automation`, `manage` or `admin` for the rest), else `403 insufficient_scope`; keys created for all mailboxes are `admin`. Reading domains, contacts, lists, segments, templates, journeys and experiments, and checking one address with `GET /v1/suppressions/check`, stay open to a scoped key. The same applies through the CLI, MCP and the mailbox service. Use an all-mailbox key for an agent that manages shared data or workspace settings.

### Workspace roles

Every person in a workspace has one of four roles. From lowest to highest:

| Role | What it may do |
|---|---|
| `viewer` | Read everything. Change nothing. A viewer has no API keys. They can't create one, and the key list shows them none. |
| `member` | The day-to-day work. Decide the needs-you cards (send, inbound and template approvals), release or reject held mail, reply, take over, close, restore from trash, labels and label corrections, templates, journeys, lists, segments, contacts, consent, keep-away, unsubscribe-all. Changes that make things safer, such as pausing sending, adding a suppression, lowering a mailbox's autonomy or marking one conversation not spam. Create, see and revoke their own API keys, for specific mailboxes only. |
| `admin` | Everything a member does. Plus everyone's API keys, workspace, mailbox and sender settings, domains, webhooks, alert destinations, inbound hooks, notification addresses, providers, routing rules, the spam filter, creating, deleting and restoring mailboxes, exporting contacts, deleting a conversation for good, erasing one contact, revoking adoption invites and undoing what an agent key changed. Plus every change that loosens a safety control, such as removing a suppression, releasing from quarantine, resuming sending or a mailbox, lifting a reputation pause, raising autonomy, turning reply deadlines off, trusting a sender (not spam with `allowSender`) or lifting a keep-away. |
| `owner` | One per workspace. Everything, plus billing (checkout, the billing portal, start now, Free, the setup link), login links (`POST /v1/agent/login-token`), accepting the terms, deleting the workspace or cancelling that, and erasing all contacts or all message content. Nobody else can remove or demote the owner, or revoke a key the owner created. |

**Your key acts with its creator's role.** A key has no role of its own. It acts with the current role of the person who created it, read again on every request. A key minted by a key belongs to the parent key's person, and a key from an adoption belongs to the person who made the invite or approved the device. When that person's role changes, their keys follow on the very next request. The key's own scopes (what it was minted for) still apply on top, capped at the role. A member's key never acts with `admin`, and a viewer's key only reads. The [human gate](#agents-may-tighten-never-loosen) still applies on top of both. A key whose creator has left the workspace is refused with `401 key_creator_not_member`. Removing a person revokes every key they created there, and every key those keys minted.

A workspace you signed up yourself (`molted auth signup`) has your account as its owner until a person claims it, so your keys act as the owner. When a person claims it, your account becomes an admin and your keys move to that person, so they keep the owner's rights.

**When the role is too low**, the call is refused with `403` and the same body on every surface (the API, the mailbox host, the MCP server and the CLI pass it on unchanged):

```json
{
  "error": "role_required",
  "action": "webhook.create",
  "required_role": "admin",
  "key_role": "member",
  "message": "To create a customer webhook, this key needs the admin role in this workspace. A key acts with the current role of the person who created it, and that person is a member.",
  "how_to_fix": "Give the person who created this key the admin role, or have an admin create the key."
}
```

`action` is the action's id (`scope:<scope>` on a route that doesn't declare one yet). `key_role` is your key's creator's role, or `null` when it could not be confirmed. For an owner-only action, `how_to_fix` is "Only the workspace owner can do this. Use a key the owner created, or ask the owner to do it." Don't retry. Show `message` and `how_to_fix` to your human.

Three refusals look alike but mean different things:

| Error | It is about | What helps |
|---|---|---|
| `insufficient_scope`, `missing_scope:<scope>`, `mailbox_scope_denied` | What your key was minted for. | A key with that scope. Rescope this one, or mint another. |
| `role_required` | Who created your key. | That person gets a higher role, or someone who has it does this (or creates the key). |
| `human_decision_required` | A decision a person must make. | Send the `decisionUrl` to a person. |

### List API keys

```
GET /v1/agent/keys
Authorization: Bearer mm_live_...
```

Needs a key with access to all mailboxes: a mailbox-scoped key gets 403 `mailbox_scope_denied`. It lists every key in the workspace when your key's creator is an admin or the owner, only the keys that person created for a member, and none for a viewer. `molted auth keys list` and the portal's `GET /v1/me/keys` follow the same rule.

### Create an API key

```
POST /v1/agent/keys
Authorization: Bearer mm_live_...
Content-Type: application/json

{ "label": "worker-2" }
```

Mint a **scoped** key by adding `scopeAllMailboxes` or `mailboxScopes`. You may
only scope a key to mailboxes your own tenant owns — the API returns `403
mailbox_not_owned` otherwise. The raw key is returned once in the `rawKey`
field; store it then.

A key mints only keys within its own scope: a label-only key is an all-mailbox
admin key, so a scoped key must pass `mailboxScopes` within its own. Anything
wider is a human decision (`403 human_decision_required`, see
[Agents may tighten, never loosen](#agents-may-tighten-never-loosen)).

A key also never outranks its creator ([Workspace roles](#workspace-roles)). An
all-mailbox key is an admin key, so only a key whose creator is an admin or the
owner may mint one. A member's key mints keys for specific mailboxes only
(`403 role_required` otherwise), and a viewer's key mints none.

```
{ "label": "sender",
  "mailboxScopes": [{ "mailboxId": "mbx_...", "permissions": ["read", "send"] }] }
```

CLI (routes through the mailbox automatically — no tenantId needed):

```
molted auth keys create --label sender --mailbox mbx_... --permissions read,send
molted auth keys create --label ops --scope-all
molted auth keys create --label multi --scope mbx_a:read,send --scope mbx_b:read
molted auth keys update <id> --mailbox mbx_... --permissions manage
molted auth keys list
molted auth keys revoke <id>
```

### Update API key scopes

An agent may only narrow itself or a key it minted; widening a key is a human decision.

```
PATCH /v1/agent/keys/:id
Authorization: Bearer mm_live_...
Content-Type: application/json

{ "scopeAllMailboxes": false, "mailboxScopes": [{ "mailboxId": "mbx_...", "permissions": ["read", "send"] }] }
```

### Revoke an API key

An agent may revoke itself or a key it minted; revoking any other key is a human decision. From a session (`DELETE /v1/me/keys/:id`), revoking is a tightening and is never gated (#1412): an agent-held session may revoke any key its user owns, including one made before a key recorded who minted it (the CLI's stale-key cleanup relies on this).

```
DELETE /v1/agent/keys/:id
Authorization: Bearer mm_live_...
```

### A person can undo what your key changed

Every settings change your key makes is recorded with your key's id, the value before and the value after. An admin or the workspace owner can undo all of them since a time, from Settings > Access > Undo changes…: Molted first revokes your key, or suspends it, and does the same to every key you minted with it (`POST /v1/agent/keys`), then puts back each of those keys' changes that nobody else touched since. A suspended key answers `401` everywhere until an admin or the owner reactivates it (`POST /v1/me/keys/:id/reactivate`, person-only); key lists show it as `status: "suspended"`. No agent key can revoke or rescope a suspended key, not even the one that minted it (`403 key_suspended`), and it still holds the agent it was bound to. Minting keys with keys goes at most 20 generations deep (`422 key_chain_too_deep`), and a mint by a key that was stopped meanwhile creates nothing (`403 minting_key_inactive`). Suppressions you added are never removed; they are listed for the person to review. Changes you made through your own sign-in, without the key, are counted for the person but not undone. These routes are person-only, after a fresh password sign-in: `GET /v1/me/keys/:id/changes` and `POST /v1/me/keys/:id/changes/revert` answer `403 human_required` to an agent.

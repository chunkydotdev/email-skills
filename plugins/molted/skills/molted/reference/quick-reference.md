<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Quick Reference

Every route below is served by the base URL, `https://mailbox.molted.email`, which fills in `tenantId` from your key. Routes marked **(mailbox service)** are served only there: api.molted.email answers `404` for them. Every other route here also works on `https://api.molted.email`, with `tenantId`. The MCP server talks to the mailbox service by default; the CLI sends these calls to its mailbox URL (`--mailbox-url`, `MOLTED_MAILBOX_URL`, or `mailbox_url` in `~/.molted/profiles/<profile>.json`), which defaults to `https://mailbox.molted.email` (or to the base URL when you point the CLI at a custom one such as localhost).

| Goal | Method | Endpoint |
|------|--------|----------|
| Send an email | POST | `/v1/agent/request-send` (include `mailboxId`) |
| Batch send | POST | `/v1/agent/batch/request-send` (include `mailboxId`) |
| Dry-run policy check | POST | `/v1/agent/simulate-send` |
| Batch dry-run | POST | `/v1/agent/simulate-batch` |
| Get template candidates | POST | `/v1/agent/propose-email` |
| Capture a contact into a list (optional confirmation email) | POST | `/v1/agent/capture` |
| Classify an inbound email (platform label, safety, route) | POST | `/v1/agent/classify-intent` |
| Batch classify | POST | `/v1/agent/batch/classify-intent` |
| Get next-best-action | POST | `/v1/agent/next-best-action` |
| Batch next-best-action | POST | `/v1/agent/batch/next-best-action` |
| Get contact timeline | GET | `/v1/agent/thread-context` |
| Schedule followup | POST | `/v1/agent/schedule-followup` |
| Cancel followup | DELETE | `/v1/agent/followups/:id` |
| Cancel scheduled send | DELETE | `/v1/agent/sends/:requestId` |
| Check send budget | GET | `/v1/agent/budget` |
| Record inbound email | POST | `/v1/agent/record-inbound` (include `mailboxId` or auto-resolved from `toEmail`) |
| Get raw MIME for message | GET | `/v1/agent/messages/:id/raw` |
| Hand the workspace to your human (take-over email, claim or portal link) | POST | `/v1/agent/login-token` |
| Verify your token | POST | `/v1/agent/whoami` |
| Can I send yet? (setup checklist, next step and whose move) | GET | `/v1/agent/setup` (optional `mailboxId`) |
| Subscribe to events | GET | `/v1/agent/events/stream` (SSE, supports `since` replay) |
| Tell the Molted team about a problem or a missing feature | POST | `/v1/agent/feedback` |

### Account Ops

| Goal | Method | Endpoint |
|------|--------|----------|
| Pause the account | POST | `/v1/ops/pause` |
| Resume the account | POST | `/v1/ops/resume` (loosening -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)) |
| List incidents | GET | `/v1/ops/incidents?status=` |
| Resolve/acknowledge an incident | PATCH | `/v1/ops/incidents/:id` |
| Bulk add suppressions | POST | `/v1/ops/suppressions/bulk` |

### API Keys

| Goal | Method | Endpoint |
|------|--------|----------|
| List keys (all-mailbox key only) | GET | `/v1/agent/keys` |
| Create a key (within your own scope) | POST | `/v1/agent/keys` |
| Narrow a key's scopes | PATCH | `/v1/agent/keys/:id` |
| Revoke a key | DELETE | `/v1/agent/keys/:id` |

See [Authentication](#authentication). CLI: `molted auth keys list|create|update|revoke`.

### Agent Adoption

| Goal | Method | Endpoint |
|------|--------|----------|
| Claim an invite code (no auth) | POST | `/v1/adopt/claim` |
| Start the device flow (no auth) | POST | `/v1/adopt/device` |
| Poll the device flow (no auth) | GET | `/v1/adopt/device/:deviceCode/poll` |
| Create invite token | POST | `/v1/agent/adopt/invite` |
| List pending tokens | GET | `/v1/agent/adopt/pending` |
| Revoke token | DELETE | `/v1/agent/adopt/:id` |

An invite's scope must be within the calling key's own (no all-mailbox invite from a scoped key). A mailbox-scoped key lists and revokes only the invites it created itself; an all-mailbox key sees and can revoke every invite in the workspace. Revoking an invite you didn't create (or an unknown id) is a 404, not a 403, so ids don't leak. Both flows step by step: [Join an existing workspace (adoption)](#join-an-existing-workspace-adoption). CLI: `molted adopt claim|request|create|list|revoke`.

### Mailboxes

Every email (sent and received) belongs to a mailbox. Mailboxes are the primary organizational unit in the portal: each has its own Sent, Inbox, Approvals, and Flagged views.

| Goal | Method | Endpoint |
|------|--------|----------|
| Create mailbox | POST | `/v1/agent/mailboxes` |
| List mailboxes | GET | `/v1/agent/mailboxes` |
| Get mailbox | GET | `/v1/agent/mailboxes/:id` |
| Update mailbox (`{ "isDefault": true }` makes it the default) | PATCH | `/v1/agent/mailboxes/:id` |
| Clone mailbox | POST | `/v1/agent/mailboxes/:id/clone` |
| Delete mailbox (restorable for 14 days) | DELETE | `/v1/agent/mailboxes/:id` |
| Restore deleted mailbox | POST | `/v1/agent/mailboxes/:id/restore` |
| Mailbox stats | GET | `/v1/agent/mailboxes/:id/stats?period=7d` |
| Get autonomy level | GET | `/v1/agent/mailboxes/:id/autonomy` |
| Change autonomy level (raising it loosens) | PATCH | `/v1/agent/mailboxes/:id/autonomy` |
| Get reputation stats | GET | `/v1/agent/mailboxes/:id/reputation` |
| Force reputation recalculation (5-min cooldown) | POST | `/v1/agent/mailboxes/:id/reputation/recalculate` |
| Resume a paused mailbox (loosening) | POST | `/v1/agent/mailboxes/:id/unpause` |
| List mailbox threads | GET | `/v1/agent/threads?mailboxId=:id` |
| List mailbox approvals | GET | `/v1/send/approvals?mailboxId=:id` |
| Find the approval of one held send | GET | `/v1/send/approvals?status=pending&requestId=:requestId` |

A mailbox-scoped key sees only approvals on its own mailboxes; `?mailboxId=` for a mailbox outside its scope returns `403 mailbox_scope_denied`. Mailbox scope applies the same through the CLI, MCP and the mailbox service as it does directly against the API.

Each approval row has exactly: `id`, `request_id`, `mailbox_id`, `status`, `decision_reason`, `decided_at`, `decided_by`, `expires_at`, `created_at`, `recipient_email`, `template_id`, `reply_to`, `send_reason`, `scheduled_at`, `attachments` (`[{ id, filename, contentType }]`) and `payload_json` (the content to be sent; internal `_`-prefixed keys are removed). `GET /v1/send/approvals/:id` returns the same shape. `?requestId=<uuid>` (the `requestId` a held send returned; 400 if it is not a UUID) returns only that send's approval, found in the database however many newer approvals exist, and never one outside a scoped key's mailboxes.

CLI: `molted approvals list`, `molted approvals list --status pending`, `molted approvals list --mailbox <mailboxId>`, and `molted approvals withdraw <approvalId>` or `molted approvals withdraw --request <requestId> [--reason <text>]` to withdraw your own pending send (there is no approve subcommand). MCP: `withdraw_send` (`policy` toolset, off by default: `?toolsets=policy`; `approval_id` or `request_id`, optional `reason`). A raw `PATCH` withdrawal should send `"withdraw": true`: anyone else's send is then `403 not_own_send` in every gate mode.

Deciding an approval (`PATCH /v1/send/approvals/:id`) is a human decision; an agent may only withdraw its own send. See [Decisions need a human](#decisions-need-a-human).

#### Mailbox Reputation

Reputation is recalculated automatically after bounces/complaints. When thresholds are breached, the mailbox is auto-paused.

```
GET /v1/agent/mailboxes/:id/reputation      — get reputation stats
POST /v1/agent/mailboxes/:id/reputation/recalculate     — force recalculation (5-min cooldown)
  Body: {}
POST /v1/agent/mailboxes/:id/unpause                    — unpause a paused mailbox
  Body: {}
```

Resuming is a human decision: an agent gets `403 human_decision_required` (`kind: "mailbox-resume"`) in `enforce`. See [Agents may tighten, never loosen](#agents-may-tighten-never-loosen). A person resumes from the portal (`POST /v1/me/mailboxes/:id/resume`, or `/v1/me/mailboxes/:id/unpause`, which also resets the counters). A mailbox on a custom domain that isn't verified for your account can't be resumed (`409 Conflict`, error `domain_not_verified`).

#### Mailbox Autonomy Level

Control how much human oversight a mailbox requires. Requires `manage` scope on the mailbox.

| Level | Name | Behavior |
|-------|------|----------|
| 1 | Full approval | Every send requires explicit human approval |
| 2 | First-contact | Requires approval until a message has actually been delivered to the recipient, or one has been received from them; a still-pending or rejected draft doesn't count |
| 3 | Full auto | Sends execute without approval (default) |

```
GET /v1/agent/mailboxes/:id/autonomy   — get current autonomy level
PATCH /v1/agent/mailboxes/:id/autonomy  — update autonomy level
  Body: { "autonomyLevel": 1 | 2 | 3 }
```

Agents may lower autonomy; raising it is a human decision (`403 human_decision_required`, `kind: "autonomy"`).

### Threads, Outbound and Overrides

| Goal | Method | Endpoint |
|------|--------|----------|
| Send from mailbox | POST | `/v1/agent/outbound/send` |
| Reply to thread | POST | `/v1/agent/outbound/reply` |
| Schedule thread followup | POST | `/v1/agent/outbound/schedule-followup` |
| List threads | GET | `/v1/agent/threads` |
| Get thread with messages | GET | `/v1/agent/threads/:id` |
| Update thread | PATCH | `/v1/agent/threads/:id` |
| Archive threads | POST | `/v1/agent/threads/archive` |
| Unarchive threads | POST | `/v1/agent/threads/unarchive` |
| Trash threads | POST | `/v1/agent/threads/trash` |
| Restore threads | POST | `/v1/agent/threads/restore` |
| Permanently delete thread | DELETE | `/v1/agent/threads/:id/permanent` |
| Hand a thread to a human | POST | `/v1/agent/threads/:id/handoff` |
| Withdraw a handoff request | POST | `/v1/agent/threads/:id/handoff/cancel` |
| Get a thread's latest handoff | GET | `/v1/agent/threads/:id/handoff` |
| Override queue counts | GET | `/v1/agent/override/queues/counts` |
| List queue items | GET | `/v1/agent/override/queues/:queue` |
| List held messages | GET | `/v1/agent/override/held-messages` |
| Release held message | POST | `/v1/agent/override/held-messages/:messageId/release` |
| Reject held message | POST | `/v1/agent/override/held-messages/:messageId/reject` |
| Approve send | POST | `/v1/agent/override/:threadId/approve` |
| Reject send | POST | `/v1/agent/override/:threadId/reject` |
| Edit and approve | POST | `/v1/agent/override/:threadId/edit` |
| Escalate thread | POST | `/v1/agent/override/:threadId/escalate` |
| Mark not spam | POST | `/v1/agent/override/:threadId/not-spam` |
| Delete spam | POST | `/v1/agent/override/:threadId/delete-spam` |
| Report spam | POST | `/v1/agent/override/:threadId/report-spam` |
| Spam feedback stats | GET | `/v1/agent/override/spam-feedback/stats` |
| Sender reputation | GET | `/v1/agent/override/sender-reputation?domain=X` |
| List sender allow-list | GET | `/v1/agent/override/allowlist` |
| Remove allow-list entry | DELETE | `/v1/agent/override/allowlist/:id` |
| Correct a platform label | POST | `/v1/agent/override/messages/:messageId/label-correction` |
| Alert status | GET | `/v1/agent/alerts/status` |

### Labels and Rules

| Goal | Method | Endpoint |
|------|--------|----------|
| List labels | GET | `/v1/agent/labels?mailboxId=X` |
| Create a label | POST | `/v1/agent/labels` |
| Get a label | GET | `/v1/agent/labels/:id` |
| Rename, recolour or reorder a label | PATCH | `/v1/agent/labels/:id` |
| Delete a label | DELETE | `/v1/agent/labels/:id` |
| Apply a label to threads | POST | `/v1/agent/labels/:id/threads` |
| Remove a label from threads | POST | `/v1/agent/labels/:id/threads/remove` |
| List mailbox rules | GET | `/v1/agent/rules?mailboxId=X` |
| Create a rule | POST | `/v1/agent/rules` |
| Get a rule | GET | `/v1/agent/rules/:id` |
| Update a rule | PATCH | `/v1/agent/rules/:id` |
| Delete a rule | DELETE | `/v1/agent/rules/:id` |
| Reorder rules | POST | `/v1/agent/rules/reorder` |

See [Labels](#labels) and [Mailbox Rules](#mailbox-rules).

### Attachments

| Goal | Method | Endpoint |
|------|--------|----------|
| Upload attachment | POST | `/v1/attachments` |
| List by message | GET | `/v1/attachments?messageId=&messageType=` (`messageType` must be `inbound` or `thread`) |
| Get download URL | GET | `/v1/attachments/:id/download` |

### Search

| Goal | Method | Endpoint |
|------|--------|----------|
| Search conversations (subject, sender, attachment filename, message text) | POST | `/v1/agent/search` |

### Agent Domain Management

| Goal | Method | Endpoint |
|------|--------|----------|
| Add a sending domain | POST | `/v1/agent/domains` |
| List domains | GET | `/v1/agent/domains` |
| Get domain details | GET | `/v1/agent/domains/:domainId` |
| Check one-click DNS setup | GET | `/v1/agent/domains/:domainId/domain-connect` |
| Verify domain DNS | POST | `/v1/agent/domains/:domainId/verify` |
| Remove domain | DELETE | `/v1/agent/domains/:domainId` |
| Get warmup status | GET | `/v1/agent/domains/:domainId/warmup` |
| Skip warmup (loosening -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)) | POST | `/v1/agent/domains/:domainId/warmup/skip` |
| Get domain rate limits | GET | `/v1/agent/domains/:domainId/rate-limits` |
| Update domain rate limits (raising or clearing a limit loosens -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)) | PATCH | `/v1/agent/domains/:domainId/rate-limits` |
| Update open/click tracking | PATCH | `/v1/agent/domains/:domainId/tracking` |

### Agent Analytics

| Goal | Method | Endpoint |
|------|--------|----------|
| Contact fatigue score | GET | `/v1/agent/analytics/contact-fatigue` |
| Send velocity | GET | `/v1/agent/analytics/send-velocity` |
| Deliverability stats | GET | `/v1/agent/analytics/deliverability` |
| Segment membership check | GET | `/v1/agent/analytics/segment-check` |
| Policy decision breakdown | GET | `/v1/agent/analytics/policy-decisions` |
| Suppression breakdown | GET | `/v1/agent/analytics/suppressions` |

### Delivery Tracking

| Goal | Method | Endpoint |
|------|--------|----------|
| Full decision trace | GET | `/v1/ops/trace/:requestId` |
| Delivery event timeline | GET | `/v1/dashboard/request/:id/timeline` |
| Message lifecycle events | GET | `/v1/agent/messages/:id/events` |
| Delivery summary counts (a mailbox-scoped key: its mailboxes only) | GET | `/v1/dashboard/delivery-summary` |

### Webhooks, Inbound Hooks and Alerts

| Goal | Method | Endpoint |
|------|--------|----------|
| Register a webhook | POST | `/v1/agent/webhooks` |
| List webhooks | GET | `/v1/agent/webhooks` |
| Get a webhook | GET | `/v1/agent/webhooks/:id` |
| Update a webhook | PATCH | `/v1/agent/webhooks/:id` |
| Delete a webhook | DELETE | `/v1/agent/webhooks/:id` |
| List a webhook's deliveries | GET | `/v1/agent/webhooks/:id/deliveries` |
| Send a test event | POST | `/v1/agent/webhooks/:id/test` |
| Create an inbound hook | POST | `/v1/agent/inbound-hooks` |
| List inbound hooks | GET | `/v1/agent/inbound-hooks` |
| Get an inbound hook | GET | `/v1/agent/inbound-hooks/:id` |
| Update an inbound hook | PATCH | `/v1/agent/inbound-hooks/:id` |
| Delete an inbound hook | DELETE | `/v1/agent/inbound-hooks/:id` |
| Inbound hook logs | GET | `/v1/agent/inbound-hooks/:id/logs` |
| Test an inbound hook | POST | `/v1/agent/inbound-hooks/:id/test` |
| List notification addresses | GET | `/v1/agent/notification-addresses` |
| Add a notification address | POST | `/v1/agent/notification-addresses` |
| Remove a notification address | DELETE | `/v1/agent/notification-addresses/:id` |
| List alert destinations | GET | `/v1/agent/alerts/destinations` |
| Add an alert destination | POST | `/v1/agent/alerts/destinations` |
| Remove an alert destination | DELETE | `/v1/agent/alerts/destinations/:id` |
| Test an alert destination | POST | `/v1/agent/alerts/destinations/:id/test` |
| Alert destination deliveries | GET | `/v1/agent/alerts/destinations/:id/deliveries` |

See [Webhooks](#webhooks) below; inbound hooks, notification addresses and alert destinations have their own sections further down.

### Templates

Templates have a `type` field: `marketing` (default) or `transactional`. Transactional templates bypass certain policy checks (e.g., suppression rules may differ). A default `_default` transactional template is auto-created at signup.

| Goal | Method | Endpoint |
|------|--------|----------|
| Create template | POST | `/v1/templates` |
| List templates | GET | `/v1/templates` |
| Get template | GET | `/v1/templates/:id` |
| Add version | POST | `/v1/templates/:id/versions` |
| Publish version | POST | `/v1/templates/:id/publish` |
| Approve/reject (a human decision) | PATCH | `/v1/templates/approvals/:id` |
| Test render | POST | `/v1/templates/:id/render` |
| Delete template (not `_default`, not while an active or paused journey uses it; slug reusable after) | DELETE | `/v1/templates/:id` |

### Journeys

| Goal | Method | Endpoint |
|------|--------|----------|
| Create journey | POST | `/v1/journeys` |
| List journeys | GET | `/v1/journeys` |
| Get journey | GET | `/v1/journeys/:id` |
| Update journey | PATCH | `/v1/journeys/:id` |
| Delete journey (draft, paused, archived or completed) | DELETE | `/v1/journeys/:id` |
| Add step | POST | `/v1/journeys/:id/steps` |
| Update step | PATCH | `/v1/journeys/:id/steps/:stepId` |
| Delete step | DELETE | `/v1/journeys/:id/steps/:stepId` |
| List runs | GET | `/v1/journeys/:id/runs` |
| Cancel a run | POST | `/v1/journeys/:id/runs/:runId/cancel` |
| Ingest trigger event | POST | `/v1/agent/events/ingest` |

### Segments

| Goal | Method | Endpoint |
|------|--------|----------|
| Create segment | POST | `/v1/segments` |
| List segments | GET | `/v1/segments` |
| Get segment | GET | `/v1/segments/:id` |
| Update segment | PATCH | `/v1/segments/:id` |
| Archive segment | DELETE | `/v1/segments/:id` |
| Trigger compute | POST | `/v1/segments/:id/compute` |
| List members | GET | `/v1/segments/:id/members` |
| Get contact segments | GET | `/v1/segments/contact/:contactId/segments` |

### Email Lists

| Goal | Method | Endpoint |
|------|--------|----------|
| Create list | POST | `/v1/agent/lists` |
| List all lists | GET | `/v1/agent/lists` |
| Get list | GET | `/v1/agent/lists/:id` |
| Update list | PATCH | `/v1/agent/lists/:id` |
| Archive list | DELETE | `/v1/agent/lists/:id` |
| Subscribe contact | POST | `/v1/agent/lists/:id/subscribers` |
| Unsubscribe contact | POST | `/v1/agent/lists/:id/unsubscribe` |
| List subscribers | GET | `/v1/agent/lists/:id/subscribers` |
| Bulk subscribe | POST | `/v1/agent/lists/:id/subscribers/bulk` |
| Send broadcast | POST | `/v1/agent/lists/:id/send` |
| List sends | GET | `/v1/agent/lists/:id/sends` |
| List stats | GET | `/v1/agent/lists/:id/stats` |
| List growth | GET | `/v1/agent/lists/:id/stats/growth` |
| List send performance | GET | `/v1/agent/lists/:id/stats/sends` |

### Contacts

| Goal | Method | Endpoint |
|------|--------|----------|
| List contacts | GET | `/v1/contacts` |
| Get a contact | GET | `/v1/contacts/:id` |
| Create a contact | POST | `/v1/contacts` |
| Update a contact | PATCH | `/v1/contacts/:id` |
| Delete a contact record (a human decision) | DELETE | `/v1/contacts/:id` |
| Sync contacts in bulk | POST | `/v1/contacts/sync` |

### Experiments

> **Auth:** Experiments endpoints accept either a Bearer API key (plus your `tenantId` on `api.molted.email`), or a portal session cookie (same as templates).

| Goal | Method | Endpoint |
|------|--------|----------|
| Create experiment | POST | `/v1/experiments` |
| List experiments | GET | `/v1/experiments` |
| Get experiment | GET | `/v1/experiments/:id` |
| Start experiment | POST | `/v1/experiments/:id/start` |
| Stop experiment | POST | `/v1/experiments/:id/stop` |
| Get results | GET | `/v1/experiments/:id/results` |

### Outcomes & Attribution

| Goal | Method | Endpoint |
|------|--------|----------|
| Ingest outcome | POST | `/v1/outcomes/ingest` |
| List outcomes | GET | `/v1/outcomes` |
| Get outcome | GET | `/v1/outcomes/:id` |
| Outcomes dashboard | GET | `/v1/outcomes/dashboard` |
| Journey impact report | GET | `/v1/outcomes/journey-impact` |

### Suppressions & Consent

| Goal | Method | Endpoint |
|------|--------|----------|
| Add suppression | POST | `/v1/suppressions` |
| Remove suppression (loosening -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)) | DELETE | `/v1/suppressions/:id` |
| Check a recipient or domain (the send gate's answer) | GET | `/v1/suppressions/check` |
| List suppressions | GET | `/v1/suppressions` |
| Add domain suppression | POST | `/v1/suppressed-domains` |
| Remove domain suppression (loosening -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)) | DELETE | `/v1/suppressed-domains/:domain` |
| List domain suppressions | GET | `/v1/suppressed-domains` |
| Record consent | POST | `/v1/consent` |
| Get consent status | GET | `/v1/consent` |

Recipient email matching for suppressions covers every spelling of the same mailbox: case and whitespace, a `+tag` in either direction (`tom+news@acme.com` and `tom@acme.com` are the same suppression), dots in a Gmail/Googlemail local part (and `googlemail.com` is `gmail.com`), a trailing dot on the domain, a Unicode or punycode domain, a quoted local part (`"tom"@acme.com`) and a display-name form (`"Tom" <tom@acme.com>`). A Unicode lookalike is a different address and is not matched. Removing a suppression deletes one row: a row for a variant spelling still blocks the address until it is removed too.

### Safety & Configuration

Safety and humanizer settings can be configured at the tenant level or per-mailbox. Per-mailbox safety settings override tenant defaults; a mailbox's own humanizer config (`config.humanizer.enabled` and `.style`) overrides the tenant's for its sends, and an explicit off at the mailbox or the agent wins over an on (see [Email Humanizer - Configuration Hierarchy](#configuration-hierarchy)).

| Goal | Method | Endpoint |
|------|--------|----------|
| Get tenant safety settings | GET | `/v1/agent/config/safety-settings` (or `/v1/ops/safety-settings`) |
| Update tenant safety settings | PUT | `/v1/agent/config/safety-settings` (or `/v1/ops/safety-settings`) |
| Get spam filter rules **(mailbox service)** | GET | `/v1/spam-filter/rules` |
| Update spam filter rules **(mailbox service)** | PUT | `/v1/spam-filter/rules` |
| Get tenant humanizer config | GET | `/v1/agent/config/humanizer` (or `/v1/ops/humanizer`) |
| Update tenant humanizer config | PUT | `/v1/agent/config/humanizer` (or `/v1/ops/humanizer`) |
| Preview a humanizer rewrite (nothing is sent) | POST | `/v1/agent/humanizer/preview` |
| Get tenant settings | GET | `/v1/agent/config/settings` |
| Update tenant settings | PATCH | `/v1/agent/config/settings` |
| Get agent config | GET | `/v1/agent/agents/:agentId/config` |
| Update agent config | PUT | `/v1/agent/agents/:agentId/config` |
| Get tenant safety settings (portal session) | GET | `/v1/me/safety-settings` |
| Update tenant safety settings (portal session) | PUT | `/v1/me/safety-settings` |
| Get tenant humanizer config (portal session) | GET | `/v1/me/humanizer` |
| Update tenant humanizer config (portal session) | PUT | `/v1/me/humanizer` |

Per-mailbox safety and humanizer config is managed via `PATCH /v1/agent/mailboxes/:id` in the mailbox `config` JSON field. The `/v1/me/*` rows are the cookie-session versions a signed-in person uses in the portal.

Agents may tighten safety, spam-filter, humanizer and tenant settings but not loosen them (humanizer on, a lower cooldown, a weaker safety check); see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen).

### Multi-Agent Coordination

| Goal | Method | Endpoint |
|------|--------|----------|
| Register agent | POST | `/v1/agent/register` |
| Heartbeat | POST | `/v1/agent/coordination/heartbeat` |
| Acquire contact lease | POST | `/v1/agent/coordination/lease` |
| Release lease | DELETE | `/v1/agent/coordination/lease/:id` |
| List active leases | GET | `/v1/agent/coordination/leases` |
| Request consensus vote | POST | `/v1/agent/coordination/consensus` |
| Get consensus status | GET | `/v1/agent/coordination/consensus/:id` |
| Cast vote | POST | `/v1/agent/coordination/consensus/:id/vote` |

---

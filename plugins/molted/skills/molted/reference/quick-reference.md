<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Quick Reference

| Goal | Method | Endpoint |
|------|--------|----------|
| Send an email | POST | `/v1/agent/request-send` (include `mailboxId`) |
| Batch send | POST | `/v1/agent/batch/request-send` (include `mailboxId`) |
| Dry-run policy check | POST | `/v1/agent/simulate-send` |
| Batch dry-run | POST | `/v1/agent/simulate-batch` |
| Get template candidates | POST | `/v1/agent/propose-email` |
| Classify inbound intent | POST | `/v1/agent/classify-intent` |
| Batch classify | POST | `/v1/agent/batch/classify-intent` |
| Get next-best-action | POST | `/v1/agent/next-best-action` |
| Batch next-best-action | POST | `/v1/agent/batch/next-best-action` |
| Get contact timeline | GET | `/v1/agent/thread-context` |
| Schedule followup | POST | `/v1/agent/schedule-followup` |
| Cancel followup | DELETE | `/v1/agent/followups/:id` |
| Cancel scheduled send | DELETE | `/v1/agent/sends/:requestId?tenantId=` |
| Check send budget | GET | `/v1/agent/budget` |
| Record inbound email | POST | `/v1/agent/record-inbound` (include `mailboxId` or auto-resolved from `toEmail`) |
| Get raw MIME for message | GET | `/v1/agent/messages/:id/raw?tenantId=` |
| Generate portal login link | POST | `/v1/agent/login-token` |
| Verify your token | POST | `/v1/agent/whoami` |
| Subscribe to events | GET | `/v1/agent/events/stream` (SSE, supports `since` replay) |

### Mailboxes

| Goal | Method | Endpoint |
|------|--------|----------|
| Create mailbox | POST | `/v1/agent/mailboxes` |
| List mailboxes | GET | `/v1/agent/mailboxes` |
| Get mailbox | GET | `/v1/agent/mailboxes/:id` |
| Update mailbox | PATCH | `/v1/agent/mailboxes/:id` |
| Clone mailbox | POST | `/v1/agent/mailboxes/:id/clone` |
| Delete mailbox | DELETE | `/v1/agent/mailboxes/:id` |
| Mailbox stats | GET | `/v1/agent/mailboxes/:id/stats?period=7d` |

### Outbound (Mailbox)

| Goal | Method | Endpoint |
|------|--------|----------|
| Send from mailbox | POST | `/v1/agent/outbound/send` |
| Reply from mailbox | POST | `/v1/agent/outbound/reply` |
| Schedule followup | POST | `/v1/agent/outbound/schedule-followup` |

### Attachments

| Goal | Method | Endpoint |
|------|--------|----------|
| Upload attachment | POST | `/v1/attachments` |
| List by message | GET | `/v1/attachments?messageId=&messageType=` (`messageType` must be `inbound` or `thread`) |
| Get download URL | GET | `/v1/attachments/:id/download` |

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
| Skip warmup | POST | `/v1/agent/domains/:domainId/warmup/skip` |
| Update open/click tracking | PATCH | `/v1/agent/domains/:domainId/tracking` |

### Agent Analytics

| Goal | Method | Endpoint |
|------|--------|----------|
| Contact fatigue score | GET | `/v1/agent/analytics/contact-fatigue` |
| Send velocity | GET | `/v1/agent/analytics/send-velocity` |
| Deliverability stats | GET | `/v1/agent/analytics/deliverability` |
| Segment membership check | GET | `/v1/agent/analytics/segment-check` |

### Delivery Tracking

| Goal | Method | Endpoint |
|------|--------|----------|
| Full decision trace | GET | `/v1/ops/trace/:requestId` |
| Delivery event timeline | GET | `/v1/dashboard/request/:id/timeline` |
| Message lifecycle events | GET | `/v1/agent/messages/:id/events?tenantId=` |
| Delivery summary counts | GET | `/v1/dashboard/delivery-summary` |

### Templates

Templates have a `type` field: `marketing` (default) or `transactional`. Transactional templates bypass certain policy checks (e.g., suppression rules may differ). A default `_default` transactional template is auto-created at signup.

| Goal | Method | Endpoint |
|------|--------|----------|
| Create template | POST | `/v1/templates` |
| List templates | GET | `/v1/templates` |
| Get template | GET | `/v1/templates/:id` |
| Add version | POST | `/v1/templates/:id/versions` |
| Publish version | POST | `/v1/templates/:id/publish` |
| Approve/reject | PATCH | `/v1/templates/approvals/:id` |
| Test render | POST | `/v1/templates/:id/render` |

### Journeys

| Goal | Method | Endpoint |
|------|--------|----------|
| Create journey | POST | `/v1/journeys` |
| List journeys | GET | `/v1/journeys` |
| Get journey | GET | `/v1/journeys/:id` |
| Update journey | PATCH | `/v1/journeys/:id` |
| Add step | POST | `/v1/journeys/:id/steps` |
| List runs | GET | `/v1/journeys/:id/runs` |
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

### Experiments

> **Note:** Experiments endpoints use session cookie auth (not Bearer token).

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
| Remove suppression | DELETE | `/v1/suppressions/:id` |
| Check a recipient or domain (the send gate's answer) | GET | `/v1/suppressions/check` |
| List suppressions | GET | `/v1/suppressions` |
| Add domain suppression | POST | `/v1/suppressed-domains` |
| Remove domain suppression | DELETE | `/v1/suppressed-domains/:domain` |
| List domain suppressions | GET | `/v1/suppressed-domains` |
| Record consent | POST | `/v1/consent` |
| Get consent status | GET | `/v1/consent` |

Recipient email matching for suppressions is case-insensitive (trimmed and lowercased on write and on read) -- `User@Example.com` and `user@example.com` are the same suppression.

### Safety & Configuration

Safety and humanizer settings can be configured at the tenant level or per-mailbox. Per-mailbox safety settings override tenant defaults; per-mailbox humanizer config is style-only (it can't turn the humanizer on or off, only override which style runs once it's already on -- see [Email Humanizer - Configuration Hierarchy](#configuration-hierarchy)).

| Goal | Method | Endpoint |
|------|--------|----------|
| Get tenant safety settings | GET | `/v1/me/safety-settings` |
| Update tenant safety settings | PUT | `/v1/me/safety-settings` |
| Get spam filter rules | GET | `/v1/spam-filter/rules` |
| Update spam filter rules | PUT | `/v1/spam-filter/rules` |
| Get tenant humanizer config | GET | `/v1/me/humanizer` |
| Update tenant humanizer config | PUT | `/v1/me/humanizer` |

Per-mailbox safety and humanizer config is managed via `PATCH /v1/agent/mailboxes/:id` in the mailbox `config` JSON field.

Agents may tighten safety, spam-filter and humanizer settings but not loosen them; see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen).

### Mailboxes

Every email (sent and received) belongs to a mailbox. Mailboxes are the primary organizational unit in the portal — each has its own Sent, Inbox, Approvals, and Flagged views.

| Goal | Method | Endpoint |
|------|--------|----------|
| Create mailbox | POST | `/v1/agent/mailboxes` |
| List mailboxes | GET | `/v1/agent/mailboxes` |
| Get mailbox | GET | `/v1/agent/mailboxes/:id` |
| Update mailbox | PATCH | `/v1/agent/mailboxes/:id` |
| Delete mailbox | DELETE | `/v1/agent/mailboxes/:id` |
| Mailbox stats | GET | `/v1/agent/mailboxes/:id/stats?period=7d` |
| List mailbox threads | GET | `/v1/agent/threads?mailboxId=:id` |
| List mailbox approvals | GET | `/v1/send/approvals?mailboxId=:id` |

A mailbox-scoped key sees only approvals on its own mailboxes; `?mailboxId=` for a mailbox outside its scope returns `403 mailbox_scope_denied`. Mailbox scope applies the same through the CLI, MCP and the mailbox service as it does directly against the API.

Deciding an approval (`PATCH /v1/send/approvals/:id`) is a human decision; an agent may only withdraw its own send. See [Decisions need a human](#decisions-need-a-human).

#### Mailbox Reputation

Reputation is recalculated automatically after bounces/complaints. When thresholds are breached, the mailbox is auto-paused.

```
GET /v1/me/mailboxes/:id/reputation              — get reputation stats
POST /v1/me/mailboxes/:id/reputation/recalculate  — force recalculation (5-min cooldown)
POST /v1/me/mailboxes/:id/unpause                 — unpause and reset counters
```

Only a human resumes a paused mailbox, including after an auto-pause (`POST /v1/me/mailboxes/:id/resume` in the portal). A mailbox on a custom domain that isn't verified for your account can't be resumed (`409 Conflict`, error `domain_not_verified`).

#### Mailbox Autonomy Level

Control how much human oversight a mailbox requires. Requires `manage` scope on the mailbox.

| Level | Name | Behavior |
|-------|------|----------|
| 1 | Full approval | Every send requires explicit human approval |
| 2 | First-contact | Requires approval until a message has actually been delivered to the recipient, or one has been received from them; a still-pending or rejected draft doesn't count |
| 3 | Full auto | Sends execute without approval (default) |

```
GET /v1/agent/mailboxes/:id/autonomy?tenantId=T   — get current autonomy level
PATCH /v1/agent/mailboxes/:id/autonomy?tenantId=T  — update autonomy level
  Body: { "autonomyLevel": 1 | 2 | 3 }
```

Agents may lower autonomy; raising it is a human decision (`403 human_decision_required`, `kind: "autonomy"`).

### Mailbox Reputation

```
GET /v1/agent/mailboxes/:id/reputation?tenantId=T      — get reputation stats
POST /v1/agent/mailboxes/:id/reputation/recalculate     — force recalculation (5-min cooldown)
  Body: { "tenantId": "your-tenant-id" }
POST /v1/agent/mailboxes/:id/unpause                    — unpause a paused mailbox
  Body: { "tenantId": "your-tenant-id" }
```

Resuming is a human decision: an agent gets `403 human_decision_required` (`kind: "mailbox-resume"`) in `enforce`. See [Agents may tighten, never loosen](#agents-may-tighten-never-loosen).

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
| Get agent config | GET | `/v1/agent/agents/:agentId/config` |
| Update agent config | PUT | `/v1/agent/agents/:agentId/config` |
| Get tenant settings | GET | `/v1/agent/config/settings` |
| Update tenant settings | PATCH | `/v1/agent/config/settings` |
| Get humanizer config | GET | `/v1/agent/config/humanizer` |
| Update humanizer config | PUT | `/v1/agent/config/humanizer` |
| Get safety settings | GET | `/v1/agent/config/safety-settings` |
| Update safety settings | PUT | `/v1/agent/config/safety-settings` |

Config updates that loosen a control (humanizer on, a lower cooldown, a weaker safety check) are human decisions; see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen).

### Agent Adoption

| Goal | Method | Endpoint |
|------|--------|----------|
| Create invite token | POST | `/v1/agent/adopt/invite` |
| List pending tokens | GET | `/v1/agent/adopt/pending` |
| Revoke token | DELETE | `/v1/agent/adopt/:id` |

An invite's scope must be within the calling key's own (no all-mailbox invite from a scoped key). Listing and revoking tokens needs a key with access to all mailboxes: a mailbox-scoped key gets 403 `mailbox_scope_denied`.

### Agentic Mailbox

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
| Alert status | GET | `/v1/agent/alerts/status` |

---

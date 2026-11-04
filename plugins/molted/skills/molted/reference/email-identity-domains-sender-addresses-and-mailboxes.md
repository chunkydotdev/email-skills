<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Email Identity: Domains, Sender Addresses, and Mailboxes

There are three layers to email identity. Understanding them will help you configure sending and receiving correctly.

| Concept | Purpose | Scope |
|---------|---------|-------|
| **Domain** | DNS authentication (DKIM, SPF, DMARC) | Authorizes you to send from a domain |
| **Sender address** | The `from` address on outbound emails | One default is auto-provisioned on `agent.molted.email` |
| **Mailbox** | A named inbox that owns sends and receives | Every email belongs to a mailbox |

### How sending works

When you send an email, the system resolves your `from` address in this order:

1. **Mailbox address** — if you provide `mailboxId`, the mailbox's address is used as the sender
2. **Default sender address** — auto-created at signup (e.g., `yourslug@agent.molted.email`)
3. **Verified domain fallback** — if no sender address exists, uses `noreply@{your-verified-domain}`
4. **No match** — send is blocked

**Recommended:** Always include `mailboxId` in your send requests. This scopes the send to a specific mailbox, making it visible in the portal's mailbox view and enabling per-mailbox metrics, approvals, and audit trails.

### Manage Your Sender Address

List your sender addresses and update the local part (the bit before `@`):

```
GET /v1/me/sender-addresses
Cookie: <session cookie>
```

```
PATCH /v1/me/sender-address
Cookie: <session cookie>

{ "localPart": "hello" }
```

This changes your from-address to `hello@agent.molted.email`. Creating additional sender addresses requires admin access.

### How receiving works

Inbound emails are routed based on the **mailbox address**. When someone replies to an email your agent sent, the system matches the `To` address to a mailbox. If you're using the agentic mailbox, create a mailbox with the address you want to receive at.

> **Note:** The `/v1/me/*` endpoints below use session cookie auth (the cookie from sign-up). These are setup actions, not runtime API calls.

---

### Set Up a Sending Domain (optional)

Add and verify a custom domain so messages are authenticated with DKIM, SPF, and DMARC under your brand:

```
POST /v1/me/domains
Cookie: <session cookie>

{ "domain": "mail.yourco.com" }
```

Response:
```json
{
  "id": "dom_abc123",
  "domain": "mail.yourco.com",
  "status": "pending",
  "dnsRecords": [
    { "type": "TXT", "name": "mail._domainkey.yourco.com", "value": "v=DKIM1; k=rsa; p=..." },
    { "type": "TXT", "name": "mail.yourco.com", "value": "v=spf1 include:..." },
    { "type": "TXT", "name": "_dmarc.yourco.com", "value": "v=DMARC1; p=none; ..." }
  ]
}
```

Add the DNS records at your registrar, then verify:

```
POST /v1/me/domains/dom_abc123/verify
Cookie: <session cookie>
```

Other domain endpoints:

```
GET /v1/me/domains                      — list domains
GET /v1/me/domains/:domainId            — get domain details
DELETE /v1/me/domains/:domainId         — remove domain
```

---

### Create a Mailbox

To receive and manage threaded conversations, create a mailbox with a specific email address.

Mailbox endpoints use the same base URL (`https://mailbox.molted.email`):

```
POST /v1/agent/mailboxes
Authorization: Bearer mm_live_...

{
  "address": "support@yourco.com",
  "displayName": "Support Inbox"
}
```

Response:
```json
{
  "id": "mbx_abc123",
  "tenantId": "your-tenant-id",
  "address": "support@yourco.com",
  "displayName": "Support Inbox",
  "status": "active",
  "isDefault": false,
  "replyDeadlinesEnabled": false,
  "config": {}
}
```

`replyDeadlinesEnabled` says whether inbound mail to the mailbox gets a reply deadline, and an email still unanswered when it passes is escalated to the person (Needs you, "Reply deadline missed", a `thread.sla_breached` event). It is on for mailboxes that existed before the switch and off for new ones. You can read it but never change it: only a person does, from the mailbox's page in the portal, and a `PATCH` that includes it returns `403 reply_deadlines_human_only`. With it off, nothing else changes: routing, approvals and quarantine are the same.

Mailboxes on verified or shared domains are **auto-activated** on creation (`status: "active"`). Mailboxes on unverified domains start as `"provisioning"` — verify the domain first, then activate the mailbox via `PATCH /v1/agent/mailboxes/:id` with `{ "status": "active" }`. Both creating and activating on a custom domain require *your own* tenant to hold the verified `tenant_domains` row for it — a domain another tenant has already verified is rejected on create (`409 Conflict`), and a mailbox stuck in `provisioning` on an unverified domain can't be force-activated either, until it's verified.

Sending from a provisioning mailbox is blocked with reason `mailbox_not_active` (the send does **not** silently fall back to another sender).

Only an `active` mailbox can be paused: pausing a `provisioning` mailbox returns `400 Bad Request`. Resuming a paused mailbox on a custom domain (the portal's resume, `POST .../unpause`, or `PATCH` to `active`) requires that domain to be verified for your own account, else `409 Conflict`. A clone of a paused mailbox is paused only when it would otherwise start `active`; on a domain you haven't verified it starts `provisioning`.

Every send also checks its from address at send time: a mailbox whose domain is neither the shared domain nor verified for your account is never used as a sender, whatever its status. A verified domain that is temporarily failing DNS checks (`temporary_failure`) still counts; `pending` and `failed` do not. The send is blocked with reason `sender_domain_not_verified`, including approved and already-queued sends.

Extra rules apply on the shared domain (`agent.molted.email` by default), since an address there is visible to every tenant — none of these apply on a verified custom domain you own:
- Reserved, role-like local parts (`admin`, `support`, `security`, `billing`, `postmaster`, and others) are rejected with `409 Conflict`, on create and clone.
- Addresses must be ASCII, lowercase alphanumeric with dots/hyphens only (`400 Bad Request`) — no plus-addressing (`support+x@...`) and no non-ASCII local part or domain.
- Addresses are unique **across all tenants**, not just your own, and against every tenant's sender addresses too — creating or cloning another tenant's shared-domain address, whether it's a mailbox or a sender address, returns `409 Conflict`.
- Catch-all cannot be enabled on a shared-domain mailbox (`400 Bad Request`) — only a verified, receiving-enabled custom domain can be a catch-all.
- Display names are screened for impersonation (role, brand and security words like `support`, `billing`, `admin`, `official`, `verification`, `bank`, `team`, `noreply`, plus a short brand list, matched case- and homoglyph-insensitively), and, separately, for a shape that reads as an email address or a domain (`support@paypal.com`, `ceo@bank.com`, `paypal.com`) — a display name containing `@` or a `label.tld` run is rejected regardless of whether it also contains a banned word. On create or clone, a rejected display name is silently replaced with the address's own local part and the response includes a `displayNameWarning` field explaining why. On update (`PATCH`), a rejected display name is refused outright with `400 Bad Request`. None of this applies on a verified custom domain — any display name is allowed there.
- The same screening runs again on every send from a shared-domain mailbox, not just when the name is set: a name saved before the screening existed still can't reach a recipient's inbox as-is. A name that now fails goes out bare (address only, no display name) for that send; the mailbox's stored `displayName` is untouched. A custom domain's display name is always sent as-is.

```
GET /v1/agent/mailboxes                       — list mailboxes
GET /v1/agent/mailboxes/:id                   — get a single mailbox
PATCH /v1/agent/mailboxes/:id                 - update display name, status, or config; { "isDefault": true } makes it the default; a change to address or catchAll is a human decision
POST /v1/agent/mailboxes/:id/clone            — clone a mailbox with its settings (requires admin scope)
DELETE /v1/agent/mailboxes/:id                - delete a mailbox: archived for 14 days, then gone (requires admin scope)
POST /v1/agent/mailboxes/:id/restore          - undo a delete inside the 14 days (requires admin scope)
GET /v1/agent/mailboxes/:id/stats?period=7d   — per-mailbox usage stats (sends, deliverability, inbound)
```

**Deleting a mailbox is recoverable for 14 days.** `DELETE` (admin scope, `manage` on the mailbox) archives it: it stops sending and disappears from every agent route at once (lists, threads, inbox, `get_context`), and its threads are hidden, not trashed. Its address stays reserved, so nobody can create it again meanwhile. Mail that arrives for it is stored and held, with no `inbound.received`/`inbound.classified` events; only mail to its own address, so a catch-all mailbox stops catching at once, and deleting one is a human decision (`kind: "mailbox-address"`, see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)). The response says so: `{ "deleted": true, "archived": true, "mailboxId", "address", "archivedAt", "purgeAfter", "restorableBy", "message" }`. Its pending follow-ups wait (they resume if it's restored). The person running the workspace sees a card saying your agent deleted it, and can restore it from the portal until `purgeAfter`; after that it is deleted for good (threads, messages, held mail, attachments, the content of its sends, and its pending follow-ups). `POST /v1/agent/mailboxes/:id/restore` (same scopes) undoes a delete an agent made: the mailbox, its threads and the held mail come back as they were, with an `inbound.released` event (`reason: "mailbox_restored"`) per held message. A mailbox a person deleted can only be restored by a person (`restorableBy: "person"`): an agent gets `403 human_archive`. After `purgeAfter` it answers `410 archive_expired`; at the plan's mailbox limit, `403 mailbox_limit`. Creating an archived address again is `409 mailbox_archived` (with its `mailboxId`). You still can't delete the last mailbox. On a custom domain, restore re-checks ownership: if it's no longer verified for your account the mailbox comes back as `provisioning` (`domainNeedsVerification: true` in the response, with a message); if a different account has since verified it, the restore is refused outright with `409 domain_conflict`. On the shared domain, restore also refuses with `409 address_taken` if a different account now holds the exact address (as a mailbox or a sender address). A mailbox soft-deleted before this 14-day window existed got one too (`archived_by_kind: "system"`): it raises its own needs-you card instead of none, and restoring it behaves the same as any other archived mailbox, including these same restore checks.

**The default mailbox.** A send without a `mailboxId` (and a journey step or follow-up with no mailbox) goes out from the workspace's default mailbox: the one chosen with `PATCH /v1/agent/mailboxes/:id` `{ "isDefault": true }` (CLI `molted mailboxes set-default <id>`, MCP `set_default_mailbox`, or a person in the portal), else the oldest active mailbox. The signup mailbox starts as the default. Every mailbox response carries `isDefault`, `true` on exactly the mailbox such a send uses right now. Only an `active` mailbox can be chosen (`409 mailbox_not_active`); `"isDefault": false` is `400` (choose another mailbox instead); a key scoped to some mailboxes gets `403 mailbox_scope_denied` (it needs access to every mailbox, since the default redirects every unattributed send). While the chosen default is paused or deleted, sends fall back to the oldest active mailbox (and `isDefault` follows); a paused default takes over again once resumed, a deleted one does not, even after a restore. A key scoped to some mailboxes sends without a `mailboxId` from its own first active mailbox, not the workspace default.

Mailbox limits by plan:

| Plan | Max Mailboxes |
|------|---------------|
| Trial | 3 |
| Free | 3 |
| Solo | 10 |
| Team | 50 |
| Enterprise | Unlimited |

---

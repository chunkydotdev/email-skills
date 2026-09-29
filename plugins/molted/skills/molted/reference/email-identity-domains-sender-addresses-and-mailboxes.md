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

Mailbox endpoints use the same base URL (`https://api.molted.email`):

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
  "config": {}
}
```

Mailboxes on verified or shared domains are **auto-activated** on creation (`status: "active"`). Mailboxes on unverified domains start as `"provisioning"` — verify the domain first, then activate the mailbox via `PATCH /v1/agent/mailboxes/:id` with `{ "status": "active" }`. Both creating and activating on a custom domain require *your own* tenant to hold the verified `tenant_domains` row for it — a domain another tenant has already verified is rejected on create (`409 Conflict`), and a mailbox stuck in `provisioning` on an unverified domain can't be force-activated either, until it's verified.

Sending from a provisioning mailbox is blocked with reason `mailbox_not_active` (the send does **not** silently fall back to another sender).

Only an `active` mailbox can be paused: pausing a `provisioning` mailbox returns `400 Bad Request`. Resuming a paused mailbox on a custom domain (the portal's resume, `POST .../unpause`, or `PATCH` to `active`) requires that domain to be verified for your own account, else `409 Conflict`. A clone of a paused mailbox is paused only when it would otherwise start `active`; on a domain you haven't verified it starts `provisioning`.

Every send also checks its from address at send time: a mailbox whose domain is neither the shared domain nor verified for your account is never used as a sender, whatever its status. A verified domain that is temporarily failing DNS checks (`temporary_failure`) still counts; `pending` and `failed` do not. The send is blocked with reason `sender_domain_not_verified`, including approved and already-queued sends.

Extra rules apply on the shared domain (`agent.molted.email` by default), since an address there is visible to every tenant — none of these apply on a verified custom domain you own:
- Reserved, role-like local parts (`admin`, `support`, `security`, `billing`, `postmaster`, and others) are rejected with `409 Conflict`, on create and clone.
- Addresses must be ASCII, lowercase alphanumeric with dots/hyphens only (`400 Bad Request`) — no plus-addressing (`support+x@...`) and no non-ASCII local part or domain.
- Addresses are unique **across all tenants**, not just your own, and against every tenant's sender addresses too — creating or cloning another tenant's shared-domain address, whether it's a mailbox or a sender address, returns `409 Conflict`.
- Catch-all cannot be enabled on a shared-domain mailbox (`400 Bad Request`) — only a verified, receiving-enabled custom domain can be a catch-all.
- Display names are screened for impersonation (role, brand and security words like `support`, `billing`, `admin`, `official`, `verification`, `bank`, `team`, `noreply`, plus a short brand list, matched case- and homoglyph-insensitively). On create or clone, a rejected display name is silently replaced with the address's own local part and the response includes a `displayNameWarning` field explaining why. On update (`PATCH`), a rejected display name is refused outright with `400 Bad Request`. None of this applies on a verified custom domain — any display name is allowed there.
- The same screening runs again on every send from a shared-domain mailbox, not just when the name is set: a name saved before the screening existed still can't reach a recipient's inbox as-is. A name that now fails goes out bare (address only, no display name) for that send; the mailbox's stored `displayName` is untouched. A custom domain's display name is always sent as-is.

```
GET /v1/agent/mailboxes                       — list mailboxes
GET /v1/agent/mailboxes/:id                   — get a single mailbox
PATCH /v1/agent/mailboxes/:id                 — update address, display name, status, or config
POST /v1/agent/mailboxes/:id/clone            — clone a mailbox with its settings (requires admin scope)
DELETE /v1/agent/mailboxes/:id                — soft-delete a mailbox (requires admin scope)
GET /v1/agent/mailboxes/:id/stats?period=7d   — per-mailbox usage stats (sends, deliverability, inbound)
```

Mailbox limits by plan:

| Plan | Max Mailboxes |
|------|---------------|
| Trial | 3 |
| Free | 3 |
| Solo | 10 |
| Team | 50 |
| Enterprise | Unlimited |

---

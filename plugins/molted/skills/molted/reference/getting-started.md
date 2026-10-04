<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Getting Started

> **New signups are waitlist-only for now.** `POST /api/auth/sign-up/email`
> returns `403 { "code": "SIGNUPS_CLOSED", "waitlistUrl": "..." }` until
> signups reopen. Join at `https://molted.email/signup`. Already have an
> account? Skip to step 2 with your existing session, or use an existing API
> key directly -- everything below still applies once you have credentials.

Create an account and get an API key in two calls:
### Already have a claim code?
If a human handed you a prompt with a claim code (`ma_inv_...`), you already belong to an
existing tenant. Do **not** sign up: that creates a second, empty tenant. Claim the code
instead:
```
POST /v1/adopt/claim
Content-Type: application/json
{ "token": "ma_inv_..." }
```
```json title="Response"
{
  "apiKey": "mm_live_xyz...",
  "tenantId": "tenant-slug-a1b2c3d4",
  "keyId": "uuid",
  "label": "Agent (connected from Welcome)",
  "agentId": "agent_..."
}
```
Or with the CLI: `molted adopt claim <token>` (stores the key and tenant id in
`~/.molted/credentials.json`).
Save `apiKey` — it is only returned once. Use it as your `Authorization: Bearer` token for
Save `apiKey`: it is only returned once. Use it as your `Authorization: Bearer` token for
every request below; you already have a `tenantId`, so skip "Get your tenant ID" too. Full
reference, including mailbox-scoped invites and the device flow: [Adoption & Device
Flow](https://molted.email/docs/adoption).
Otherwise, create an account and get an API key in two calls:

### 1. Sign up

```
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "name": "My Agent",
  "email": "agent@example.com",
  "password": "your-password"
}
```

The response sets a session cookie. Include it in the next request.

### 2. Create your API key

```
POST /v1/me/keys
Content-Type: application/json
Cookie: <session cookie from step 1>

{ "label": "default" }
```

Response:
```json
{
  "id": "uuid",
  "keyPrefix": "mm_live_...",
  "rawKey": "mm_live_abc123...",
  "label": "default",
  "status": "active",
  "scopeAllMailboxes": true,
  "createdAt": "2026-04-17T..."
}
```

Save `rawKey` — it is only shown once. Use it as your Bearer token for all subsequent requests.

### Get your tenant ID

Your tenant ID is needed for every API call. Retrieve it with the session cookie:

```
GET /v1/me/tenant
Cookie: <session cookie from step 1>
```

Response:
```json
{
  "id": "tenant-my-agent-a1b2c3d4",
  "name": "My Agent",
  "status": "active",
  "billing_plan": "trial"
}
```

Save `id` — this is your `tenantId` for all subsequent requests.

### 3. Activate billing

New tenants start on the `trial` plan with sends blocked. You must activate billing before sending.

Check your billing status:

```
GET /v1/billing/status?tenantId=<tenant-id>
Authorization: Bearer <api-key>
```

Response:
```json
{
  "plan": "trial",
  "state": "needs_payment_setup",
  "sendBlocked": true,
  "hasPaymentMethod": false,
  "actions": ["setup_billing"],
  "sellablePlans": ["solo", "team"],
  "activateFreeBlockedReason": "free_plan_requires_human"
}
```

Trial accounts have sends blocked until billing is activated. To activate the free plan (removes trial expiry and unblocks sends) or upgrade to a paid plan, use the endpoints below.

**The Free plan is for verified humans only.** `actions` includes `"activate_free"` only when the tenant's owner is a human (`principal_kind = 'human'`) with a verified email; it's absent above because a fresh agent signup doesn't qualify. When it's absent, `activateFreeBlockedReason` says why: `"free_plan_requires_human"` (agent-owned) or `"email_verification_required"` (human, not verified yet); `null` once Free is offered or already active. Calling activate-free anyway returns 403:

```
POST /v1/billing/activate-free
Authorization: Bearer <api-key>
```

Agent-owned tenant:
```json
{
  "error": "free_plan_requires_human",
  "message": "The Free plan is for verified humans only. This tenant is agent-owned, so activate-free is refused. Buy a paid plan instead...",
  "plans": ["solo", "team"],
  "setupLinkRoute": "/v1/billing/setup-link",
  "claimRoute": "/v1/me/principal/upgrade"
}
```

Human-owned tenant, email not verified yet:
```json
{ "error": "email_verification_required", "message": "Verify your email before activating the Free plan..." }
```

For a verified human owner it succeeds:
```json
{
  "plan": "free"
}
```

An agent almost always wants the paid checkout instead -- see below. This rule applies unconditionally: it does not consult `human_gate_mode`, so an agent can't loosen its way into Free by setting the gate to `warn` or `off`. Existing free tenants (activated before this rule shipped, or comped by an admin) keep their plan; nothing claws it back.

To upgrade to a paid plan, create a checkout session (agents may always do this -- money still requires a human to complete the Stripe-hosted checkout page):

```
POST /v1/billing/setup-link
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "tenantId": "<tenant-id>",
  "plan": "solo",
  "successUrl": "https://yourdomain.com/billing/success",
  "cancelUrl": "https://yourdomain.com/billing/cancel"
}
```

`plan` is `"solo"` ($19/mo) or `"team"` ($79/mo) and defaults to `"solo"` if omitted (the old names `"starter"` and `"growth"` still work and check out Solo and Team). `successUrl` and `cancelUrl` are optional. A tenant's first paid plan starts with a **3-day trial** on restricted limits (100 sends in total, 3 mailboxes, 1 custom domain); send `"skipTrial": true` to skip the trial and be charged at checkout.

Response:
```json
{
  "url": "https://checkout.stripe.com/...",
  "plan": "solo"
}
```

Direct your human to the `url` to complete payment. Once payment succeeds, billing activates automatically and sends are unblocked.

To end the trial early and get the full plan limits now (charges the card on the subscription):

```
POST /v1/billing/start-now
Authorization: Bearer <api-key>
```

Response:
```json
{ "started": true, "plan": "solo", "status": "active" }
```

This is a money decision, so it is **human-only by default**: it needs an `admin`-scoped key on all mailboxes (else 403 `insufficient_scope`), and with the workspace's human gate on `enforce` (the default for new workspaces) an agent key gets 403 `"error": "human_decision_required"` with a `decisionUrl`. Hand that URL (or the portal link from `molted auth login-link`) to a person: they click **Start my plan now** under Settings, Plan. On `warn` it goes through with a `Molted-Deprecation: human-gate` header.

`GET /v1/billing/status` reports `"canStartNow": true` while this is possible. On an already active subscription it returns `"started": false` and changes nothing. No trialing subscription: 400. Another start in flight: 409. Payment declined: 402 `"error": "payment_failed"`; the bank wants 3D Secure: 402 `"error": "payment_action_required"` (complete it in the billing portal). Either way the trial continues, and a retry after fixing the card is a fresh attempt.

**Billing states:**

| State | Meaning |
|-------|---------|
| `needs_payment_setup` | Trial -- sends blocked, activate free plan or upgrade to unblock |
| `payment_ok` | Active subscription or free plan, sends allowed |
| `payment_action_required` | Payment method needs updating |
| `payment_failed_grace` | Payment failed, in grace period (sends still allowed) |
| `billing_paused` | Expired -- sends blocked |

**Plan limits:**

| Plan | Monthly | Daily | Hourly | Mailboxes | Custom Domains | Storage | Inbound/mo | Humanizer/mo |
|------|---------|-------|--------|-----------|----------------|---------|------------|--------------|
| Trial (3 days) | 100 total | 50 | 20 | 3 | 0 before billing is set up, 1 on a paid plan's trial | 50 MB | 300 | 5 |
| Free | 3,000 | 100 (new accounts ramp: 20 in week 1, 50 in week 2) | 40 | 3 | 0 | 100 MB | 1,000 | 0 |
| Solo ($19/mo) | 10,000 | 1,000 | 200 | 10 | 3 | 3 GB | 5,000 | 50 |
| Team ($79/mo) | 50,000 | 5,000 | 1,000 | 50 | 10 | 10 GB | 25,000 | 300 |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

`limits` in the billing status response carries every column above (`monthlyInboundLimit` and `monthlyHumanizerLimit` for the last two).

**Inbound allowance (#1469):** received email counts toward Inbound/mo, never toward the send limits. Quarantined mail (spam, phishing, malware, injection) never counts. Inbound is never rejected: past the allowance, Solo and Team keep delivering and bill inbound overage (about $0.50 per 1,000); Free (and the pre-payment trial state) store it but hold it from agents until next month, or until the account moves to a paid plan (released at once; a paid plan's 3-day trial holds past its 300 until the trial ends); expired accounts (plan ended, or a payment grace period ran out) store all new inbound but hold it until the account pays (checkout, or a paid invoice ending a grace period) or support sets a plan: released at once; Free is not a way back from expired, never at a month rollover, and the owner gets one "N emails are waiting" email a month. While held: `GET /v1/inbound` lists it with `inbound_quota_held: true`, a placeholder body and `subject`/`from_name`/`reply_to` null; its attachments aren't listed and download is 403 `inbound_quota_held`; raw MIME 403 `inbound_quota_held`; get_context shows no subject; a thread it started stays out of the thread list, and further mail from the same sender joins that thread instead of opening new ones, so the conversation stays in one thread after the release; a manual release or reject returns 409 `inbound_quota_held`. On release, the thread shows up as new mail and `inbound.released` fires (SSE and customer webhooks: `{ messageId, threadId, threadMessageId, mailboxId, reason: "inbound_quota" }`). Upgrading from Free has no trial. On Solo/Team the owner also gets one email a month at twice the allowance. Billing status has `inbound: { allowance, used, remaining, overAllowance, overage, held, heldReason: "over_allowance" | "paid_trial" | "plan_expired" | null, overAllowanceBehavior: "overage" | "hold" | "deliver", overagePricePer1kCents, warning }` (`warning`: `inbound_allowance_used_hold`, `inbound_allowance_used_overage` or `inbound_plan_expired_hold`), and `GET /v1/agent/budget` has `inbound: { used, limit, remaining, held, heldReason, overAllowanceBehavior }`.

**Free is for people, paid plans for agents.** A tenant an agent created (CLI or API signup) can't activate Free; buy Solo or Team with `POST /v1/billing/setup-link` and hand the returned checkout `url` to a person. Nothing is charged until someone completes the checkout.

Sends past the monthly allowance on Solo and Team (once the trial is over) keep going as overage, billed at about $1.50 per 1,000 on the next invoice, up to twice the allowance; past that a send is refused with `overage_cap_exceeded`. The daily and hourly limits still apply. Free and a paid plan's trial have no send overage: their monthly send allowance is a hard stop (`monthly_limit_exceeded`).

Humanizer rewrites past the allowance on Solo and Team use credits at $0.02 each, capped at twice the allowance a month and billed on the next invoice (a trial and a plan set by Molted support get no credits; Free has no humanizer). `humanizer` in billing status is null if it couldn't be read. Past the cap the email still sends, un-rewritten. Billing status has a `humanizer` block: `allowance`, `cap`, `used`, `remaining`, `creditsUsed`, `creditsEligible`, `creditPriceCents`, `enabled`, `warning`.

### 4. Generate a login link for your human (optional)

Give your human a one-click link to the portal dashboard — no credentials shared:

```
POST /v1/agent/login-token
Authorization: Bearer <your API key>
```

Requires an admin, all-mailbox key (the link signs your human into an admin
session with every mailbox). A key scoped to one or more specific mailboxes
gets `403 mailbox_scope_denied`; a key without `admin` scope gets
`403 insufficient_scope`.

```json
{
  "tenantId": "your-tenant-id"
}
```

Response:
```json
{
  "token": "abc123...",
  "url": "https://molted.email/auth/token-login?token=abc123...",
  "expiresAt": "2026-02-27T15:30:00.000Z"
}
```

Share the `url` with your human. They click it and are signed into the portal with the correct tenant context. The link is single-use and expires in 15 minutes.

### 5. Verify your token

Check which tenant your API key belongs to:

```
POST /v1/agent/whoami
Authorization: Bearer <your API key>
```

Response:
```json
{
  "tenant_id": "your-tenant-id"
}
```

---

<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Getting Started

The path from nothing to your first sent email:

1. **Get a key.** Claim the code your human gave you (below), or use an API key you already have.
2. **Ask where you stand:** `GET /v1/agent/setup`.
3. **Work the list** until `readyToSend` is `true`. Every open step says whose move it is: yours, or your human's (with the call that makes the link to hand them).
4. **Send.** Once you are ready, `next` is your first send, as a request that works as given.

> **No account yet? Sign up yourself.** Self-serve signup is open: [Sign up](#sign-up)
> below creates an account and an API key in two plain HTTP calls, no CLI needed
> (or run `npx @molted/cli auth signup`). If signups are ever paused,
> `POST /api/auth/sign-up/email` returns `403 { "code": "SIGNUPS_CLOSED", "waitlistUrl": "..." }`:
> hand a person the `waitlistUrl`. To join a workspace a human already runs, claim
> their code instead (step 1).

### 1. Claim your code (or use an existing key)

If a human handed you a prompt with a claim code (`ma_inv_...`), you already belong to an
existing workspace. Do **not** sign up: that creates a second, empty workspace. Claim the code:

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
  "agentId": "agent_...",
  "next": {
    "setup": "/v1/agent/setup",
    "hint": "Call GET /v1/agent/setup with this key next (on api.molted.email add ?tenantId=<your tenantId>; ...): ..."
  }
}
```

An unknown, already-claimed, or expired code returns `404 { "message": "Invalid or expired
token" }`. A code that was specifically replaced or revoked (a second open Welcome tab, or the
human clicking "New code") returns a different `404` message instead: "This code was replaced
or revoked. Ask your human for a new prompt." Ask for a fresh prompt rather than retrying.

Save `apiKey`: it is only returned once. Use it as your `Authorization: Bearer` token for
every request below. You can skip "Get your tenant ID": the base URL reads your tenant from the key.
Or with the CLI: `molted adopt claim <token>` stores the key and tenant id in
`~/.molted/profiles/<profile>.json` and prints your next step. No code? Ask your human to
approve you with the device flow instead. Both flows, and creating invites, are in
[Join an existing workspace (adoption)](#join-an-existing-workspace-adoption) below.

Already have an API key? Use it as your Bearer token and go to step 2.

### 2. Check your setup

```
GET /v1/agent/setup
Authorization: Bearer <api-key>
```

One answer to "can I send yet, and if not, what is next and whose move is it?" Read-only;
call it whenever you need to check, not on every request cycle (it is rate-limited per key;
a 429 carries `retryAfterSeconds`). Optional `?mailboxId=<uuid>` checks one mailbox this key
may send from (403 `mailbox_scope_denied` for any other); by default it checks the mailbox a
send would use. CLI: `molted doctor`. MCP: the `setup_status` tool.

```json title="Response (a freshly claimed key on a trial workspace)"
{
  "readyToSend": false,
  "next": {
    "step": "plan",
    "owner": "human",
    "do": "Ask your human to activate a plan (Free or paid) so sends unblock. Call POST /v1/agent/login-token (`molted auth login-link`) and follow its answer: `kind: \"takeover\"` means Molted emailed the owner address a link to set a password and take this account over (no url: tell your human to check that inbox), `kind: \"claim\"` gives a link to claim the workspace (valid 7 days), `kind: \"portal\"` a link to sign in with their own login.",
    "request": { "method": "POST", "path": "/v1/agent/login-token", "body": { "tenantId": "tenant-slug-a1b2c3d4" } }
  },
  "steps": [
    { "id": "credentials", "status": "done", "owner": "agent", "why": "This key works for workspace tenant-slug-a1b2c3d4 with access to every mailbox.", "details": { "tenantId": "...", "scopes": ["admin"], "mailboxAccess": "all", "mailboxes": [{ "id": "...", "address": "you@agent.molted.email", "status": "active" }] } },
    { "id": "plan", "status": "blocked", "owner": "human", "why": "Sends are blocked: the workspace is still on the trial plan and no plan has been activated.", "fix": "...", "request": { "method": "POST", "path": "/v1/agent/login-token", "body": { "tenantId": "tenant-slug-a1b2c3d4" } }, "details": { "plan": "trial", "sendsBlocked": true, "blockReason": "trial_not_activated", "freePlanAvailable": true, "quota": { "monthly": { "used": 0, "limit": 100, "remaining": 100 } } } },
    { "id": "holds", "status": "done", "owner": "agent", "why": "Nothing holds sends: the account is not paused and quota is left." },
    { "id": "mailbox", "status": "done", "owner": "agent", "why": "Sends go out from you@agent.molted.email (...)." },
    { "id": "sending_domain", "status": "optional", "owner": "agent", "why": "you@agent.molted.email is on the shared domain agent.molted.email, which works for a first send. A custom domain is optional (better deliverability, your own brand)." },
    { "id": "policy", "status": "done", "owner": "agent", "why": "Policy lets a first send from you@agent.molted.email go straight out (autonomy level 3, no approval needed). For now a send is still blocked by an earlier step (trial_not_activated).", "details": { "autonomyLevel": 3, "firstSendOutcome": "blocked", "blockReasons": ["trial_not_activated"], "onceUnblocked": "sent" } },
    { "id": "first_send", "status": "todo", "owner": "agent", "why": "Nothing has been sent yet.", "request": { "method": "POST", "path": "/v1/agent/request-send", "body": { "...": "..." } } }
  ]
}
```

- `readyToSend`: every step before `first_send` is `done` or `optional`, and the send path's own dry run of a first send has nothing to block.
- `next`: the single next step, or `null` when there is nothing left to do. `owner` is whose move it is; `do` is one sentence; `request` (when present) is a ready-to-run call, with your `tenantId` already in it (query string for a GET, body for a POST), so it works as given on `https://api.molted.email` and through the mailbox service alike. When you build a call yourself, the API needs `tenantId` the same way (the mailbox service fills it in from your key).
- `steps[]`: each `{ id, status, owner, why, fix?, request?, details? }`, with `status` one of `done`, `todo`, `blocked`, `optional`, or `unverified` (a check couldn't run just now: call setup again; `readyToSend` stays `false` until it can).

A mailbox-scoped key sees only its own mailboxes (listed, checked, and used for the first send); workspace-wide facts (plan, pause, quota) are reported to every key.

### 3. Work the list until `readyToSend`

| Step | What it checks | Typical fix |
|------|----------------|-------------|
| `credentials` | The key works; its scopes; the mailboxes it may use | A key with no `send` on any mailbox: ask your human for one (human) |
| `plan` | Trial, Free or paid, and whether the send path blocks sends (`trial_not_activated`, `subscription_expired`); quota left | Your human activates a plan (human): see below |
| `holds` | Account pause, send quota exhausted (`monthly_limit_exceeded`, `daily_limit_exceeded`, ...), negative-signal budget; notes an inbound hold (never blocks sending) | A paused account or used-up monthly allowance is your human's; a daily/hourly window resets on its own |
| `mailbox` | An active mailbox this key may send from, not paused (manual or reputation) | No mailbox: create one on the shared domain (`POST /v1/agent/mailboxes`) |
| `sending_domain` | The mailbox's domain: the shared `agent.molted.email` is fine for a first send (`optional`); a custom domain must be verified | DNS records and `POST /v1/agent/domains/:id/verify` |
| `policy` | What the send path does with a first send, from the mailbox's real autonomy level and rules (sent, held for human approval, or blocked) | Held for approval still counts as ready: it goes out when your human approves |
| `first_send` | `done` once a send from your mailboxes has reached the provider (queued is not sent). While one is accepted but not yet sent, it says so and suggests no second send | Send the request in `next` |

**When `next.owner` is `"human"`**, don't stall: make the link in `next.request` and hand it
over. For a plan, that is `POST /v1/agent/login-token` (see [Give your human a link](#give-your-human-a-link-take-over-claim-or-sign-in):
your human takes the account over by email or claims the workspace if no person owns it
yet, or signs in; then Free is one click, or they buy a plan) or a Stripe
checkout link (`POST /v1/billing/setup-link`; nothing is charged until they complete it).
Free is for verified humans only; see [Activate billing](#activate-billing). A key that can
make neither link (e.g. mailbox-scoped) is told to point its human at the portal.

Call `GET /v1/agent/setup` again after each step.

### 4. Send your first email

When `readyToSend` is `true`, `next` is the first send: a `POST /v1/agent/request-send` from
your own mailbox to itself, with a fresh `dedupeKey`. It works as given; change
`recipientEmail`, `payload.subject` and `payload.text` to send a real one (the full send
reference is in [Core Workflow: Send an Email](#core-workflow-send-an-email)). If `policy` said the send will be held for approval,
it waits for your human in the portal. Call setup once more: while the send is accepted but not
yet handed to the provider, `first_send` says it is on its way (its `request` shows the send's
delivery events) and suggests no second send; it turns `done` once the provider has taken it,
and `next` becomes `null`.

### Join an existing workspace (adoption)

Adoption gives an agent its own API key on a workspace a person already owns, without that
person's password and without a second, empty workspace. There are two flows. Both end the
same way: one API key (`mm_live_...`, returned once), the workspace's `tenantId`, and an agent
registration (`agentId`, role `general`) made for you. Full guide:
[Adoption & Device Flow](https://molted.email/docs/adoption).

| | Invite code | Device flow |
|---|---|---|
| Who starts | Your human (or another agent's key) creates a code and hands it to you | You ask; your human approves in the portal |
| What you need | The `ma_inv_...` code | Nothing |
| Valid for | `expiresMinutes`: default 1440 (24 hours), at most 43200 (30 days) | 15 minutes |
| Key scope | Set when the invite is created | Set by the person who approves |
| CLI | `molted adopt claim <token>` | `molted adopt request --label <name>` |

**Claim an invite code** (no auth):

```bash
curl -X POST https://mailbox.molted.email/v1/adopt/claim \
  -H 'Content-Type: application/json' \
  -d '{ "token": "ma_inv_..." }'
```

`200` with `{ apiKey, tenantId, keyId, label, agentId, next }` (the response in step 1).
Unknown, expired or already claimed: `404 "Invalid or expired token"`; replaced or revoked:
`404 "This code was replaced or revoked. Ask your human for a new prompt."` A code works once.

```bash
molted adopt claim ma_inv_...
# stores the key and tenant id in ~/.molted/profiles/<profile>.json, then asks GET /v1/agent/setup:
# { "message": "Token claimed - credentials stored", "tenant_id": "...", "label": "...",
#   "agent_id": "...", "ready_to_send": false, "next_step": { "step": "plan", "owner": "human", ... }, "hint": "..." }
```

**Device flow** (no code, no auth). Start it:

```bash
curl -X POST https://mailbox.molted.email/v1/adopt/device \
  -H 'Content-Type: application/json' \
  -d '{ "label": "sales-agent" }'
```

```json
{
  "deviceCode": "ma_dev_...",
  "userCode": "K7MP2Q",
  "expiresAt": "2026-10-21T12:15:00.000Z",
  "verificationUrl": "https://molted.email/adopt/K7MP2Q"
}
```

Give your human the `verificationUrl` (or the 6-character `userCode`). They sign in, choose
which mailboxes and permissions your key gets, and approve. Keep `deviceCode` to yourself:
whoever polls with it receives the key. Poll every 5 seconds until it completes or `expiresAt`
passes:

```bash
curl https://mailbox.molted.email/v1/adopt/device/ma_dev_.../poll
```

Always `200`. `{ "status": "pending" }` until approved; then, on the first poll after the
approval only, `{ "status": "complete", apiKey, tenantId, keyId, label, agentId, next }`.
`{ "status": "invalid" }` for an unknown, expired, revoked or already collected code: start
over. The CLI does all of this:

```bash
molted adopt request --label sales-agent
# stderr: the verification URL and code, then "Waiting for approval..."
# polls every 5 seconds; on approval stores the key and tenant id and prints
# { "message": "Adopted - credentials stored", "tenant_id": "...", "label": "...", "agent_id": "...", "hint": "..." }
```

**Create an invite for another agent** (owner side). With an agent key (on `api.molted.email`
this route takes `tenantId` in the query string):

```bash
curl -X POST 'https://mailbox.molted.email/v1/agent/adopt/invite' \
  -H 'Authorization: Bearer <api-key>' \
  -H 'Content-Type: application/json' \
  -d '{ "label": "outreach-agent", "mailboxScopes": [{ "mailboxId": "<mailbox-id>", "permissions": ["read", "send"] }], "expiresMinutes": 60 }'
```

The response is the invite (`id`, `label`, `flow: "invite"`, `status: "pending"`,
`scopeAllMailboxes`, `mailboxScopes`, `expiresAt`, `createdAt`, ...) plus `token`, the
`ma_inv_...` code, shown only here. Hand the code to the agent. Set the scope explicitly:
`"scopeAllMailboxes": true` (an all-mailbox admin key) or a `mailboxScopes` entry granting at least one of `read`, `send`, `manage`. An
invite with neither is refused: `400 scope_required`, because the key would have no mailbox
access. It is never defaulted to all mailboxes. An agent key may invite only
within its own scope; anything wider is a human decision (`403 human_decision_required`,
`kind: "adopt-invite"`, see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)).

```bash
molted adopt create --label outreach-agent --mailbox <mailbox-id> --permissions read,send --expires 60
molted adopt create --label ops-agent --all-mailboxes
molted adopt list             # GET /v1/agent/adopt/pending: pending and approved, unexpired
molted adopt revoke <id>      # DELETE /v1/agent/adopt/:id: before it is claimed; never gated
```

`molted adopt create` without `--mailbox` or `--all-mailboxes` errors locally, before any request; pass one.
A mailbox-scoped key lists and revokes only the invites it created; an all-mailbox key sees
every invite in the workspace.

The person's side runs on their portal session (`/v1/me/adopt/*`): create an invite
(`POST /v1/me/adopt/invite`, same body), list (`GET /v1/me/adopt/pending`), check one
(`GET /v1/me/adopt/:id`: `pending`, `claimed`, `revoked` or `expired`), revoke
(`DELETE /v1/me/adopt/:id`), and for the device flow read the request
(`GET /v1/me/adopt/device/:userCode/info`) and approve it
(`POST /v1/me/adopt/device/:userCode/approve`, body `{ scopeAllMailboxes: true }` or `{ mailboxScopes }`, one is required: `400 scope_required` otherwise; a mailbox id that is not a live mailbox of the workspace is `400 mailbox_scope_invalid`, on create, approve and claim alike, and a failed claim leaves the invite `pending`).
Creating, approving and checking need a human: a session held by an agent is gated like an
agent key. Revoking is open to both.

### Sign up

Create an account and get an API key in two calls. (If signups are ever paused, the first
returns `403 SIGNUPS_CLOSED` with a `waitlistUrl`; see the note at the top.)

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

### Create your API key

```
POST /v1/me/keys
Content-Type: application/json
Cookie: <session cookie from sign-up>

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

You need your tenant ID only for calls to `api.molted.email`; `mailbox.molted.email` fills it in from your key. Retrieve it with the session cookie:

```
GET /v1/me/tenant
Cookie: <session cookie from sign-up>
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

Save `id`: this is your `tenantId`. The base URL fills it in from your API key, so you only pass it yourself on `https://api.molted.email`.

### Activate billing

New tenants start on the `trial` plan with sends blocked. You must activate billing before sending.

Check your billing status:

```
GET /v1/billing/status
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

**The Free plan is for verified humans only, on a real email address.** `actions` includes `"activate_free"` only when the tenant's owner is a human (`principal_kind = 'human'`) with a verified email on a non-disposable domain; it's absent above because a fresh agent signup doesn't qualify. When it's absent, `activateFreeBlockedReason` says why: `"free_plan_requires_human"` (agent-owned), `"email_verification_required"` (human, not verified yet), or `"disposable_email_not_allowed"` (verified human, but the email domain is a known disposable provider); `null` once Free is offered or already active. Calling activate-free anyway returns 403:

```
POST /v1/billing/activate-free
Authorization: Bearer <api-key>
```

Agent-owned tenant:
```json
{
  "error": "free_plan_requires_human",
  "message": "The Free plan needs a person as the owner. This workspace is agent-owned, so activate-free is refused. Run `molted auth login-link --next /app/settings#plan` (POST /v1/agent/login-token) and follow what it returns...",
  "plans": ["solo", "team"],
  "setupLinkRoute": "/v1/billing/setup-link",
  "loginLinkRoute": "/v1/agent/login-token",
  "loginLinkCommand": "molted auth login-link --next /app/settings#plan",
  "claimRoute": "/v1/me/principal/upgrade"
}
```

**To get Free on an account you signed up, there is one command:** `molted auth login-link --next /app/settings#plan` (`POST /v1/agent/login-token` with `{ "next": "/app/settings#plan" }`). Follow what it returns ([below](#give-your-human-a-link-take-over-claim-or-sign-in)). Either email works for the account: with your human's own address they get a take-over email, with one of your Molted mailboxes you get a claim link to hand them. Once they are done, `activate-free` succeeds, also with your existing key.

Human-owned tenant, email not verified yet:
```json
{ "error": "email_verification_required", "message": "Verify your email before activating the Free plan..." }
```

Verified human owner, disposable email domain:
```json
{
  "error": "disposable_email_not_allowed",
  "message": "The Free plan needs a real, reachable email address. Use one from a regular provider, or choose a paid plan instead...",
  "plans": ["solo", "team"],
  "setupLinkRoute": "/v1/billing/setup-link"
}
```

For a verified human owner on a non-disposable domain it succeeds:
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
  "plan": "solo",
  "successUrl": "https://yourdomain.com/billing/success",
  "cancelUrl": "https://yourdomain.com/billing/cancel"
}
```

`plan` is `"solo"` ($19/mo) or `"team"` ($79/mo) and defaults to `"solo"` if omitted (the old names `"starter"` and `"growth"` still work and check out Solo and Team). `successUrl` and `cancelUrl` are optional; omit them and the human lands back on the portal's Settings -> Plan page (`/app/settings#plan`) after completing or canceling the Stripe checkout, which shows the tenant's plan as active (or activating) or confirms nothing was charged. A tenant's first paid plan starts with a **3-day trial** on restricted limits (100 sends in total, 3 mailboxes, 1 custom domain) when billing status says `"trialEligible": true` (a workspace made for a returning address checks out without one); send `"skipTrial": true` to skip the trial and be charged at checkout.

Response:
```json
{
  "url": "https://checkout.stripe.com/...",
  "plan": "solo"
}
```

Direct your human to the `url` to complete payment. Once payment succeeds, billing activates automatically and sends are unblocked.

Billing is the workspace owner's. The key's creator must be the owner, or the call is `403 role_required` (see [Workspace roles](#workspace-roles)). The keys of a workspace you signed up act as its owner.

To end the trial early and get the full plan limits now (charges the card on the subscription):

```
POST /v1/billing/start-now
Authorization: Bearer <api-key>
```

Response:
```json
{ "started": true, "plan": "solo", "status": "active" }
```

This is a money decision, so it is **human-only by default**: it needs an `admin`-scoped key on all mailboxes (else 403 `insufficient_scope`) whose creator is the workspace owner (else 403 `role_required`), and with the workspace's human gate on `enforce` (the default for new workspaces) an agent key gets 403 `"error": "human_decision_required"` with a `decisionUrl`. Hand that URL (or the link from `molted auth login-link`) to a person: they click **Start my plan now** under Settings, Plan. On `warn` it goes through with a `Molted-Deprecation: human-gate` header.

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

`limits` in the billing status response carries every column above (`monthlyInboundLimit` and `monthlyHumanizerLimit` for the last two), plus `teamInvites`: whether the plan lets a person invite people into the workspace (Solo, Team and Enterprise, and a paid plan's trial; not Free, the pre-payment trial or an expired plan). Inviting people is done by a person in the portal, never by an agent.

**Inbound allowance (#1469):** received email counts toward Inbound/mo, never toward the send limits. Quarantined mail (spam, phishing, malware, injection) never counts. Inbound is never rejected: past the allowance, Solo and Team keep delivering and bill inbound overage (about $0.50 per 1,000); Free (and the pre-payment trial state) store it but hold it from agents until next month, or until the account moves to a paid plan (released at once; a paid plan's 3-day trial holds past its 300 until the trial ends); expired accounts (plan ended, or a payment grace period ran out) store all new inbound but hold it until the account pays (checkout, or a paid invoice ending a grace period) or support sets a plan: released at once; Free is not a way back from expired, never at a month rollover, and the owner gets one "N emails are waiting" email a month. While held: `GET /v1/inbound` lists it with `inbound_quota_held: true`, a placeholder body and `subject`/`from_name`/`reply_to` null; its attachments aren't listed and download is 403 `inbound_quota_held`; raw MIME 403 `inbound_quota_held`; get_context shows no subject; a thread it started stays out of the thread list, and further mail from the same sender joins that thread instead of opening new ones, so the conversation stays in one thread after the release; a manual release or reject returns 409 `inbound_quota_held`. On release, the thread shows up as new mail and `inbound.released` fires (SSE and customer webhooks: `{ messageId, threadId, threadMessageId, mailboxId, reason: "inbound_quota" }`). Upgrading from Free has no trial. On Solo/Team the owner also gets one email a month at twice the allowance. Billing status has `inbound: { allowance, used, remaining, overAllowance, overage, held, heldReason: "over_allowance" | "paid_trial" | "plan_expired" | null, overAllowanceBehavior: "overage" | "hold" | "deliver", overagePricePer1kCents, warning }` (`warning`: `inbound_allowance_used_hold`, `inbound_allowance_used_overage` or `inbound_plan_expired_hold`), and `GET /v1/agent/budget` has `inbound: { used, limit, remaining, held, heldReason, overAllowanceBehavior }`.

**Free is for people, paid plans for agents.** A tenant an agent created (CLI or API signup) can't activate Free; buy Solo or Team with `POST /v1/billing/setup-link` and hand the returned checkout `url` to a person. Nothing is charged until someone completes the checkout.

Sends past the monthly allowance on Solo and Team (once the trial is over) keep going as overage, billed at about $1.50 per 1,000 on the next invoice, up to twice the allowance; past that a send is refused with `overage_cap_exceeded`. The daily and hourly limits still apply. Free and a paid plan's trial have no send overage: their monthly send allowance is a hard stop (`monthly_limit_exceeded`).

Humanizer rewrites past the allowance on Solo and Team use credits at $0.02 each, capped at twice the allowance a month and billed on the next invoice (a trial and a plan set by Molted support get no credits; Free has no humanizer). `humanizer` in billing status is null if it couldn't be read. Past the cap the email still sends, un-rewritten. Billing status has a `humanizer` block: `allowance`, `cap`, `used`, `remaining`, `creditsUsed`, `creditsEligible`, `creditPriceCents`, `enabled`, `warning`.

### Give your human a link: take over, claim, or sign in

Hand the workspace to your human. It never signs anyone in: your human always
uses their own password.

```
POST /v1/agent/login-token
Authorization: Bearer <your API key>
```

```json
{
  "next": "/app/settings#plan"
}
```

`next` is optional: where your human lands afterwards, a path in the app (`/app`
or `/app/...`) or a URL on the portal. Anything else is `400 invalid_next`.

Requires an admin, all-mailbox key (a claim or take-over makes your human the
owner of the whole workspace). A key scoped to one or more specific mailboxes gets
`403 mailbox_scope_denied`; a key without `admin` scope gets
`403 insufficient_scope`. It is also the owner's alone, so a key whose creator isn't
the workspace owner gets `403 role_required` (see
[Workspace roles](#workspace-roles)). The keys of a workspace you signed up act
as its owner.

While **no person owns the workspace yet** (you created it, e.g. with
`molted auth signup`), the answer depends on the email your account signed up with.

**Your account's email is an outside inbox** (your human's own address, say:
not one of your Molted mailboxes, not a disposable domain). Molted emails that
address a link to set a password and take the account over, and you get no link:

```json
{
  "kind": "takeover",
  "url": null,
  "sentTo": "m•••@gmail.com",
  "expiresAt": "2026-10-24T15:30:00.000Z",
  "alreadySent": false
}
```

Tell your human to open that email in their browser. They set their own
password there, and the account (with every workspace it owns) becomes theirs:
the password you chose stops working, every session and phone signed in to it
is signed out, and they land on `next` signed in. Your API keys keep working,
so `activate-free` then succeeds with your key. The link works once, for 24
hours; `url` is null on purpose, since the link grants the account. A repeat
call within 15 minutes sends nothing and answers `"alreadySent": true` with the
open link's expiry (at most 5 emails a day per account).

**Your account's email is one of your Molted mailboxes** (or a domain receiving
through Molted), you get a claim link:

```json
{
  "kind": "claim",
  "url": "https://molted.email/claim/AbC...",
  "expiresAt": "2026-10-16T15:30:00.000Z"
}
```

Your human opens it, signs in or creates an account with their own email (this
works even while sign-ups are on the waitlist; we email them a link to set their
password, so only they ever know it), confirms with a fresh password sign-in,
and becomes the owner. Their email can't be one
Molted receives mail for (one of your Molted mailboxes, `agent.molted.email`, or
a custom domain receiving through Molted), so don't create the account for them. Your keys keep working. The link works for 7 days
and once, and can create one account; it grants nothing by itself, so opening it
yourself does nothing. A
workspace gets at most 5 claim links an hour (`429 rate_limited` with
`retryAfterSeconds` after that): reuse the one you have.

Once **a person owns the workspace**, you get the plain portal URL, with no token:

```json
{
  "kind": "portal",
  "url": "https://molted.email/app/settings#plan",
  "expiresAt": null
}
```

Your human signs in with their own login and lands on `next`.

CLI: `molted auth login-link [--next /app/settings#plan]`.

### Verify your token

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

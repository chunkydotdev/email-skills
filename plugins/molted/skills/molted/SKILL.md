---
name: molted
description: Add email (sending, replying, reading a test inbox) to an agent you're building, using Molted's agent-native email infrastructure. Use when the user wants to give their agent an inbox, send transactional/agentic email, read/classify inbound replies, or asks "how do I add email to my agent". Not for generic email best practices (deliverability, DMARC, spam) - see the other skills in this repo for that.
license: MIT
---

# Molted

Molted is agent-native email infrastructure: an API and MCP server for agents to send, receive,
and reason about email, with built-in policy guardrails (rate limits, suppressions, consent,
humanization) so an agent can't accidentally spam or get an account blocked.

## When to use this skill

- The user is building an agent and wants to add "send an email" or "check the inbox" as a tool.
- The user wants a real test inbox an agent can read and reply from.
- The user is deciding between calling Molted's REST API directly vs. using its MCP server.
- The user asks about Molted's safety model (autonomy levels, human approval gates, humanizer).

For general email deliverability, authentication, compliance, or content-quality guidance that
isn't Molted-specific, see the other skills in this repo (`skills/deliverability/`,
`skills/compliance/`, etc.) instead.

## Two ways to integrate

**MCP (recommended for an agent you're building with Claude, or any MCP-capable runtime).**
This plugin ships a `molted` MCP server (`plugins/molted/.mcp.json`) pointed at
`https://mcp.molted.email/mcp`, authenticated with `Authorization: Bearer $MOLTED_API_KEY`. It
exposes ~74 tools covering send, reply, read-inbox, classify, journeys, segments, and more. Run
`/setup` first to get a key into your environment. Tool names are namespaced:
`mcp__plugin_molted_molted__<tool-name>` (e.g. `mcp__plugin_molted_molted__send_email`).

**REST (for anything that isn't an MCP-capable agent, e.g. a backend service, a cron job, or an
agent runtime that doesn't speak MCP).** Call `https://api.molted.email` directly with the same
Bearer token. The full endpoint reference is split out in `reference/` - start with
`reference/getting-started.md` and `reference/quick-reference.md`.

Both paths hit the same policy engine and the same account, so you can mix them (e.g. MCP for the
agent loop, REST from a webhook handler).

## Auth in three steps

1. **Get an account.** Signups are waitlist-only right now:
   `https://molted.email/signup?utm_source=claude-code-plugin`.
2. **Get an API key.** Dashboard (API Keys) or CLI:
   `molted auth keys create --label claude-code --mailbox mbx_... --permissions read`.
   Keys are mailbox-scoped with a `permissions` list (`read`, `send`, or both).
3. **Set `MOLTED_API_KEY`** in your shell profile (never paste it into a chat) and restart your
   agent runtime so it picks up the env var.

**Default to a read-only key** (`--permissions read`) for anything that's just reading a test
inbox, classifying replies, or drafting. That makes sending impossible server-side - the safest
default for a new integration. Add `send` only once you actually want the agent sending mail, and
treat that as a deliberate opt-in, not the default. See `/setup` in this plugin for a guided
walkthrough, including a `permissions.deny` snippet to block send-capable tools client-side if you
want dry-run behavior without any chance of a real send.

`dry_run` (the `simulate-send` / `simulate-batch` endpoints, or the `dry_run` MCP tool) needs
`send` permission even though it never actually sends - it runs the real policy engine and reports
what would happen.

## The send + inbox loop

**Send:**
- REST: `POST /v1/agent/request-send` with `tenantId`, `recipientEmail`, `templateId` or raw
  content, `mailboxId`, and a `dedupeKey` (idempotency - reusing a key returns the original
  result instead of sending twice).
- MCP: `send_email` (or `draft_email` to get a draft back without sending, `reply` to answer an
  existing thread).
- A 200 response doesn't necessarily mean "sent" - check `policyTrace.decision.allow`. A blocked
  send is still a 200 with the reason in the trace, not a 4xx.

**Read / react:**
- REST: `GET /v1/agent/thread-context` for a contact's history, `POST /v1/agent/classify-intent`
  to classify an inbound reply (interested / OOO / bounce / unsubscribe / etc.), `POST
  /v1/agent/next-best-action` to get a suggested next step.
- MCP: `read_inbox`, `get_thread`, `classify_inbound`, `next_best_action`.
- For real-time reaction instead of polling, subscribe to `GET /v1/agent/events/stream` (SSE,
  supports replay via `since`) or configure webhooks - see `reference/webhooks.md` and
  `reference/real-time-events-sse.md`.

Full request/response shapes: `reference/core-workflow-send-an-email.md`,
`reference/simulate-before-sending.md`, `reference/classify-inbound-intent.md`,
`reference/thread-context.md`.

## The policy and safety model (why this isn't just "call sendmail")

Every send goes through a policy engine before it leaves: rate limits, suppression lists (bounces,
complaints, unsubscribes), consent checks for marketing sends, and contact fatigue scoring. You
don't reimplement any of this - the API/MCP call either allows the send or tells you why not.

Three things worth knowing before you wire an agent in:

- **Autonomy levels (1-3)** gate how much an agent can do unattended per mailbox. An agent can
  always *lower* its own autonomy or tighten a safety setting; *raising* autonomy or loosening a
  safety control (turning a check off, raising a threshold, removing a blocked keyword) is a human
  decision - the API returns `403 human_decision_required` with a `decisionUrl` to hand to a
  person. See `reference/agents-may-tighten-never-loosen.md`.
- **The humanizer** can lightly rewrite agent-drafted copy to read less like a template. It only
  ever tightens toward "more human," never loosens, and mailbox-level config is style-only (it
  can't turn the humanizer on/off, only the tenant/agent level can). See
  `reference/humanizer-config-agent-api.md` and `reference/email-humanizer.md`.
- **Trial accounts have sends blocked** until billing is activated (`GET /v1/billing/status`).
  Reads, drafts, and dry-runs still work on trial.

## Reference

`reference/INDEX.md` lists every section, generated verbatim from the live Molted skill.md (the
same doc Molted serves at `https://molted.email/skill.md` for any agent to fetch directly). Files
there are regenerated by `scripts/sync-molted-skill.mjs` and shouldn't be hand-edited - if
something in there looks wrong or stale, the fix is either upstream (molted.email/skill.md) or a
re-run of the sync script, not a manual patch to a `reference/*.md` file.

Worth knowing up front: `reference/quick-reference.md` (endpoint table), `reference/attachments.md`,
`reference/rate-limits.md`, `reference/idempotency.md`, `reference/error-handling.md`,
`reference/suppression-management.md`, `reference/multi-agent-coordination.md` (if more than one
agent shares a mailbox).

## Codex

Codex's plugin format currently forbids env-var substitution in MCP headers (`Authorization:
Bearer ${MOLTED_API_KEY}` isn't expressible), so this plugin doesn't support Codex yet. It's
blocked on Codex adding MCP OAuth or an equivalent secret-injection mechanism. REST still works
fine from a Codex-driven agent; you'd just wire the Bearer token in yourself rather than via a
plugin manifest.

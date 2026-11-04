<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Humanizer Config (Agent API)

Get and update the email humanizer configuration. When enabled, outbound emails pass through AI processing to improve tone and readability. Molted picks the model (Claude Sonnet 5.5) -- `provider` is no longer a choice (#2115): it is always `"anthropic"` on read, and a `provider` sent on update is accepted (for backward compatibility) but ignored, with a `"warnings": ["humanizer_provider_ignored"]` on the response.

**CLI:** `molted humanizer get`, `molted humanizer update --config '<json>'`, `molted humanizer preview ...` (below). **MCP:** `get_humanizer_config`, `preview_humanized`. `PUT` needs a key that reaches every mailbox with the `manage` scope; for an agent key, any change that leaves the humanizer on (turning it on, changing its style) is a human decision, turning it off always works.

### Get Humanizer Config

```
GET /v1/agent/config/humanizer
```

Response:
```json
{
  "enabled": true,
  "style": "professional",
  "provider": "anthropic"
}
```

### Update Humanizer Config

```
PUT /v1/agent/config/humanizer
```

```json
{
  "enabled": true,
  "style": "friendly"
}
```

Fields:
- `enabled` (boolean, required) - whether outbound emails are humanized before delivery
- `style` (string, optional) - humanization tone/style
- `provider` (string, optional, ignored) - accepted for backward compatibility but no longer configurable; Molted always rewrites with Claude Sonnet 5.5, and a value here is reported back in `warnings` as `humanizer_provider_ignored`, never persisted

**Plan limits (#1460):** each rewrite counts against the plan's allowance (Free 0, Solo 50/mo, Team 300/mo, paid trial 5 in total, Enterprise unlimited). Solo and Team continue with credits at $0.02 each up to twice the allowance, billed on the next renewal invoice (a workspace whose plan is set by Molted support gets the allowance but no credits). A retried delivery counts once; a failed rewrite doesn't count.
- Turning it on (`"enabled": true`, here or via `PUT /v1/agent/agents/:agentId/config` with `humanizer_enabled: true`) on a plan without it returns `403 {"error": "humanizer_not_in_plan", "message": "...", "plan": "free"}`. Turning it off always works.
- A send is never refused for this. When its rewrite will be skipped (not in the plan, the allowance used on a plan without credits such as a trial or a plan set by Molted support, or the monthly cap reached), the email still goes out un-rewritten and the send response (and each batch result) carries `"warnings": ["humanizer_not_in_plan" | "humanizer_allowance_exhausted" | "humanizer_credit_cap_reached"]`. The worker records `humanizer.skipped` in the audit log, and once per workspace `humanizer.disabled_by_plan` when a saved setting is on but the plan doesn't include it.

### Preview a Rewrite

See how the humanizer would rewrite an email before sending it. Nothing is sent. A rewrite that passes the checks is kept, encrypted, for 24 hours under a `previewId`: send with `humanizePreviewId` to deliver exactly it (see [Send Exactly What You Previewed](#send-exactly-what-you-previewed)).

```
POST /v1/agent/humanizer/preview
```

```json
{
  "templateId": "onboarding-welcome",
  "payload": { "firstName": "Alice" },
  "diff": true
}
```

Pass either `templateId` (with `payload`) or raw `html` and/or `text` (with an optional `subject`), not both. Optional: `mailboxId` (the mailbox whose style applies; defaults to the one a send would use, and a mailbox-scoped key needs `send` on it, else `403 mailbox_scope_denied`; a deleted mailbox or another workspace's is `404 mailbox_not_found`), `style` (`casual`/`professional`/`friendly` instead of the configured style, reported in `warnings` as `preview_style_override` when the model ran with it; a send by this preview's id delivers the rewrite in that style, a send without the id uses its own `humanizeStyle` or the configured one), and `diff: true` (a line diff of the rewrite, `"- "` original and `"+ "` rewritten lines).

Response:
```json
{
  "effective": { "enabled": true, "style": "friendly", "provider": "anthropic", "source": "tenant" },
  "original": { "subject": "Welcome, Alice", "html": "<p>Hi Alice, thanks for signing up...</p>", "text": "Hi Alice, thanks for signing up..." },
  "humanized": { "html": "<p>Hi Alice, great to have you...</p>", "text": "Hi Alice, great to have you..." },
  "applied": true,
  "checks": { "ok": true, "failures": [] },
  "model": "claude-sonnet-5-5",
  "usage": { "inputTokens": 412, "outputTokens": 356, "latencyMs": 2140 },
  "diff": "- Hi Alice, thanks for signing up...\n+ Hi Alice, great to have you...",
  "previewId": "6f1c1b1e-3a5f-4c6e-9a61-1c2d3e4f5a6b",
  "expiresAt": "2026-09-30T10:00:00.000Z",
  "warnings": []
}
```

- `previewId` / `expiresAt`: only with an applied rewrite (never with `applied: false` or the humanizer off). If the rewrite could not be stored, there is no `previewId` and `warnings` has `preview_not_stored`.
- The content is built by the send path's own code: the same template rendering, compliance footer and unsubscribe placement a send gets, except that the unsubscribe link is the placeholder `https://unsubscribe.molted.invalid/preview-only` (warning `unsubscribe_link_placeholder`). The subject is never rewritten.
- `effective` is resolved exactly as for a send (see Configuration Hierarchy below); `source` is `agent`, `mailbox`, `tenant` or `default`. With the humanizer off: `humanized: null`, `applied: false`, no model call, no credit.
- `applied: false` with a `skipReason` (the `humanizer.skipped` reasons under Guardrails below) means a send would go out as written. `checks` is `{ ok, failures: [{ kind, count }] }` when the link/address/number check ran, `null` when it didn't.
- **Cost:** a preview is a real rewrite. Each preview that reaches the model takes one humanizer credit from the plan allowance, whether or not the rewrite passes the checks (a rejected, truncated or timed-out rewrite still costs it; `preview_used_paid_credit` in `warnings` when it was a paid credit). Only a preview that never calls the model is free (humanizer off, or nothing to rewrite). With none left: `403 humanizer_not_in_plan`, `402 humanizer_allowance_exhausted` or `402 humanizer_credit_cap_reached`.
- Other errors: `400 invalid_humanize_style` / `invalid_preview_input` / `invalid_mailbox_id`, `404 template_not_found` / `mailbox_not_found`, `400 missing_physical_address` / `template_render_failed` (a send would be blocked the same way), `413 preview_too_large` (over 64 KB of rendered html and text), `503 humanizer_unavailable` (the server has no LLM key for the provider).
- CLI: `molted humanizer preview --template <slug> --payload <json|@file>` or `--subject --body/--html` (built exactly like `molted send --body/--html`, so the previewId fits that send; `--text` sets the text part as given), with `[--mailbox <id>] [--style <style>] [--diff] [--json]`. MCP: `preview_humanized` (snake_case fields; `body`/`html` are built like `send_email`'s).
- A send WITHOUT the preview id isn't tied to it: the worker rewrites again, so the delivered wording can differ (the same checks apply). A send held for approval and then approved goes out exactly as approved, never rewritten (see Configuration Hierarchy below): send it with the preview id to have the approver see, and send, the rewrite. The preview waits 20s for the model (under the mailbox proxy's 30s), a send 25s, so a very long email can show `timeout` in the preview and still be rewritten when sent without the id.

### Send Exactly What You Previewed

Add `humanizePreviewId` (the preview's `previewId`) to `POST /v1/agent/request-send`, to an item of `POST /v1/agent/batch/request-send` (per item only, no batch-level id, and each item needs its own preview), or to `POST /v1/agent/outbound/reply` / `POST /v1/agent/outbound/send`. The send delivers the stored rewrite instead of a new one. **A preview id sends once.**

```json
{
  "recipientEmail": "alice@example.com",
  "templateId": "onboarding-welcome",
  "dedupeKey": "onboarding-alice-step1",
  "payload": { "firstName": "Alice" },
  "humanizePreviewId": "6f1c1b1e-3a5f-4c6e-9a61-1c2d3e4f5a6b"
}
```

- **Byte for byte:** the html and text sent (and stored) are the preview's `humanized` html and text, with the placeholder unsubscribe link replaced by the send's own signed per-recipient link.
- **Content must match:** the send's rendered html and text must be the ones the preview was built from (same template and payload, or same body/html, same physical-address footer). Otherwise `409 humanize_preview_mismatch` and nothing is sent. The subject is not compared (never rewritten; a reply's `Re: ...` subject is fine).
- **Not found:** an unknown or expired id (24 hours), another workspace's, or one previewed with a `mailboxId` for a different mailbox than the send's: `404 humanize_preview_not_found`. A preview made without a `mailboxId` (all-mailbox key) fits any mailbox, also for a mailbox-scoped key sending from a mailbox in its own scope (the key's scope still applies: `403 mailbox_scope_denied` outside it).
- **Single-use:** the first send that applies the id uses it up (claimed atomically; of concurrent sends with one id exactly one gets it). Any other send with it: `409 humanize_preview_used`, preview again. Keeps metering at one humanizer credit per humanized email, the same as the normal path. A preview that is not applied (humanizer off since, or the send refused with one of these errors) stays unused.
- **No second rewrite, no second credit:** the send carries `humanize: false` internally, so the worker never rewrites it (not on delivery, after an approval, or on a soft-bounce retry). A send held for approval stores the rewrite as its draft: the approver approves exactly that text.
- **Tighten-only:** if the agent or tenant humanizer was turned off after the preview, the original goes out and the response has `"warnings": ["humanize_preview_ignored_humanizer_off"]`. The preview's style is the one delivered.
- **400s:** `humanize_preview_conflict` (with `humanize: false`, or with a `humanizeStyle` other than the preview's style), `invalid_humanize_preview_id` (not a UUID). In a batch, every preview error fails only its item: `{"status": "error", "reason": "humanize_preview_mismatch"}` (or `_not_found`, `_used`, `_conflict`, `invalid_humanize_preview_id`).
- **Retries:** the same `dedupeKey` returns the original result without touching the preview, even after it was used or expired.
- **Audit:** `humanizer.applied` with `source: "preview"` and `previewId` on the send.
- CLI: `molted send ... --humanize-preview <id>`, `molted threads reply <threadId> --body ... --humanize-preview <id>`, and `"humanizePreviewId"` on a `molted send batch --recipients` entry. MCP: `humanize_preview_id` on `send_email`, `reply` and each `batch_send` item.

---

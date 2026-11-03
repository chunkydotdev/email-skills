<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Email Humanizer

LLM-powered content rewriting that makes templated emails sound more natural. The humanizer runs in the send pipeline between template rendering and provider delivery. To see a rewrite before sending, use `POST /v1/agent/humanizer/preview` (see [Humanizer Config - Preview a Rewrite](#preview-a-rewrite)).

### Per-Send Override

Add `humanize`/`humanizeStyle` to any `POST /v1/agent/request-send`, `POST /v1/agent/batch/request-send` (top-level, or per-item in `sends[]` -- an item's own value overrides the batch default), or `POST /v1/agent/outbound/reply` call. To send a rewrite you already previewed, add `humanizePreviewId` instead (see [Send Exactly What You Previewed](#send-exactly-what-you-previewed)); it can't be combined with `humanize: false`. `humanizeProvider` is `request-send`/`batch` only: the outbound DTOs behind `outbound/reply` (and the mailbox's own send/reply routes) don't declare it, so the global `whitelist: true` ValidationPipe silently drops it there rather than validating it. The CLI's `molted send`, `molted send batch` and `molted threads reply` take `--humanize`/`--no-humanize`/`--humanize-style <style>`; the MCP `send_email`, `batch_send` and `reply` tools take `humanize`/`humanize_style`. Neither the CLI nor MCP exposes `humanizeProvider`.

| Field | Type | Description |
|-------|------|-------------|
| `humanize` | boolean | `false` always tightens: the mail is delivered exactly as written, whatever the agent, mailbox or tenant setting says. `true` cannot turn the humanizer on by itself (agents may tighten a control, never loosen it -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)): if the agent, mailbox and tenant settings leave it off (see Configuration Hierarchy below), the mail still goes out as written, and the response carries `"warnings": ["humanizer_ignored_owner_disabled"]`. If they already have it on, the send goes ahead rewritten. |
| `humanizeStyle` | string | `casual`, `professional`, or `friendly`. Honored whenever the humanizer ends up running on this send, whether that's because of `humanize: true` or an agent/tenant setting that was already on; if so, the style resolves send > agent > mailbox > tenant > `professional`. An unknown value is a 400 on every route that accepts this field, including `outbound/reply`. |
| `humanizeProvider` | string | Accepted but ignored (#2115): Molted always rewrites with Claude Sonnet 5.5, so there is no provider to select. `request-send`/`batch` only (see above). Still validated there (400 on an unknown value) for backward compatibility. |
| `humanizePreviewId` | string | A humanizer preview's `previewId`: deliver exactly that rewrite, once. Per item in a batch (one preview per item). See [Send Exactly What You Previewed](#send-exactly-what-you-previewed). |

```json
{
  "recipientEmail": "alice@example.com",
  "templateId": "onboarding-welcome",
  "dedupeKey": "onboarding-alice-step1",
  "payload": { "firstName": "Alice" },
  "humanize": true,
  "humanizeStyle": "friendly"
}
```

### Configuration Hierarchy

Whether the humanizer runs on a given send resolves in order:

1. **Send** -- `humanize: false` on the request itself always wins; `true` is limited as described in Per-Send Override above.
2. **An explicit off at the agent or the mailbox** -- the agent is the config of the agent your API key is bound to (`PUT /v1/agent/agents/:agentId/config`; a key is bound by `POST /v1/agent/register` with `bindKey: true`, the CLI and MCP default, or when it was created by claiming an adoption invite); the mailbox is the sending mailbox's `config.humanizer.enabled` (`PATCH /v1/agent/mailboxes/:id`).
3. **An explicit on at the agent or the mailbox** -- turns it on.
4. **Tenant** -- the workspace-wide setting (`PUT /v1/agent/config/humanizer` / `PUT /v1/me/humanizer`), the default for every mailbox without its own setting.
5. **Default** -- off.

So a mailbox can be humanized while the tenant setting is off, and an off at the agent or the mailbox can't be overridden by an on at the other. A mailbox with no `enabled` of its own follows the tenant (every mailbox starts that way). The style resolves on its own, whichever level turned the humanizer on: **send** > **agent** > **mailbox** > **tenant** > `professional` (the default). The provider is fixed to `anthropic` (#2115) -- Molted picks the model (Claude Sonnet 5.5); it is never read from agent, mailbox, or tenant config, whatever is stored there.

Each of agent and tenant follows the same tighten-only rule as the send level: an agent key may turn its own level off, never on (or change its style while on) -- that's a human decision (`403 human_decision_required`), same as every other loosening change; see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen). The mailbox level is gated the same way: turning a mailbox's humanizer on (its effective state, given the tenant setting, going from off to on) or changing its stored style is a human decision too, and `{"humanizer": {"enabled": false}}` always works. A plan without the humanizer can't turn it on at any level (`403 humanizer_not_in_plan`).

This hierarchy never applies to mail a human approved through the approval queue, or wrote directly (a portal reply, or a send made after taking over a thread): that mail is delivered exactly as approved or written, whatever `humanize` or the agent/mailbox/tenant config say, and no humanizer credit is taken for it. The same holds for a soft-bounce retry of one of those sends. The skip is recorded in the audit log as `humanizer.skipped` with reason `held_for_approval` or `human_authored`. To have a held send rewritten, rewrite it before it is held: send it with a `humanizePreviewId`, and the held draft is the rewrite.

### Get / Update Tenant Config

```
GET /v1/me/humanizer
Cookie: <session cookie>
```

```
PUT /v1/me/humanizer
Cookie: <session cookie>

{ "enabled": true, "style": "professional" }
```

The agent-level equivalent is `GET`/`PUT /v1/agent/agents/:agentId/config` (see [Coordination - Agent Config](#agent-config)); the mailbox-level equivalent is `config.humanizer` on `PATCH /v1/agent/mailboxes/:id` (`{ "config": { "humanizer": { "enabled": true, "style": "casual" } } }`: `enabled` true, false, or `null` to follow the tenant; `style` or `null` for the tenant's. `config` replaces the whole object on write apart from `humanizer`, which is merged, so include every other field you want to keep). Every response that returns a mailbox (get, list, `PATCH`, create, clone, and a restore's `mailbox`) carries `humanizer: { setting, enabled, source }`: the stored `enabled` (null when unset), whether a send from it is humanized when neither the agent nor the send sets it, and which setting decided (`mailbox`, `tenant` or `default`).

| Style | Behavior |
|-------|----------|
| `casual` | Conversational, contractions, warm tone |
| `professional` | Clear, direct, polished (default) |
| `friendly` | Warm, personable, upbeat |

### Guardrails

Every rewrite is checked before it is used, no configuration needed:

- Every URL (including the signed unsubscribe link), every email address, and every number token (a price, a percentage, a date, a time, phone digits) in the original must appear in the rewrite exactly as written, and the rewrite may not add a new one either. A changed value (not just a dropped one) fails the check.
- When the email has an HTML part, the physical-address compliance footer required for marketing mail is kept out of the rewrite entirely and reattached afterward, unchanged. A text-only send has no equivalent structural protection for its footer; it relies on the link/address/number check above.
- A reply the model cut off partway through, refused, or that came back blank/whitespace-only, is treated the same as a failed rewrite.
- The email body (including any quoted prior message) is sent to the model delimited as content to restyle, not as instructions it could follow.

When any check fails, the original (un-rewritten) content is sent instead. A failed rewrite, including a retry that fails again, is never counted against the plan allowance and never billed as a credit.

Check why a specific send was rewritten or skipped with `molted trace <requestId>` or `GET /v1/ops/trace/:requestId`. A successful rewrite writes a `humanizer.applied` audit event (style, provider, model, token usage). A skipped one writes `humanizer.skipped` with a `reason`: the plan-limit reasons (`not_in_plan`, `allowance_exhausted`, `credit_cap_reached`) and approval-exemption reasons (`held_for_approval`, `human_authored`) described above, plus the guardrail reasons here: `truncated` (cut off), `refused` (the model declined rather than running out of room), `empty_response` (blank reply), `check_failed` (a link, address, or number added, dropped, or changed -- kinds and counts only, never the raw values), `nothing_to_rewrite` (nothing left once the compliance footer was cut out, not a failed check), `timeout` (the rewrite call took too long), and `provider_error` (any other rewrite failure).

---

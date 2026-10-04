<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Email Humanizer

LLM-powered content rewriting that makes templated emails sound more natural. The humanizer runs in the send pipeline between template rendering and provider delivery.

### Per-Send Override

Add `humanize`/`humanizeStyle` to any `POST /v1/agent/request-send`, `POST /v1/agent/batch/request-send` (top-level, or per-item in `sends[]` -- an item's own value overrides the batch default), or `POST /v1/agent/outbound/reply` call. `humanizeProvider` is `request-send`/`batch` only: the outbound DTOs behind `outbound/reply` (and the mailbox's own send/reply routes) don't declare it, so the global `whitelist: true` ValidationPipe silently drops it there rather than validating it. The CLI's `molted send`, `molted send batch` and `molted threads reply` take `--humanize`/`--no-humanize`/`--humanize-style <style>`; the MCP `send_email`, `batch_send` and `reply` tools take `humanize`/`humanize_style`. Neither the CLI nor MCP exposes `humanizeProvider`.

| Field | Type | Description |
|-------|------|-------------|
| `humanize` | boolean | `false` always tightens: the mail is delivered exactly as written, whatever the agent or tenant setting says. `true` cannot turn the humanizer on by itself (agents may tighten a control, never loosen it -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen)): if the agent and tenant are both off, the mail still goes out as written, and the response carries `"warnings": ["humanizer_ignored_owner_disabled"]`. If either already has it on, the send goes ahead rewritten. The mailbox level never affects this -- it's style-only, see Configuration Hierarchy below. |
| `humanizeStyle` | string | `casual`, `professional`, or `friendly`. Honored whenever the humanizer ends up running on this send, whether that's because of `humanize: true` or an agent/tenant setting that was already on; if so, the style resolves send > agent > mailbox > tenant > `professional`. An unknown value is a 400 on every route that accepts this field, including `outbound/reply`. |
| `humanizeProvider` | string | `anthropic` or `openai`. `request-send`/`batch` only (see above). Validated there (400 on an unknown value) but never selects the provider -- the agent or tenant setting always decides that; the mailbox never sets one. |

```json
{
  "tenantId": "your-tenant-id",
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

1. **Send** -- `humanize` on the request itself, limited as described in Per-Send Override above.
2. **Agent** -- the config of the agent your API key is bound to (`PUT /v1/agent/agents/:agentId/config`); a key only has one once it's been claimed through agent adoption.
3. **Tenant** -- the workspace-wide setting (`PUT /v1/agent/config/humanizer` / `PUT /v1/me/humanizer`).
4. **Default** -- off.

The mailbox level is style-only: it can't turn the humanizer on or off, only pick which style runs once it's already on. So the style, once running, resolves in a slightly wider order: **send** > **agent** > **mailbox** > **tenant** > `professional` (the default). The provider follows the same order as `enabled` -- **agent** > **tenant** > `anthropic` (the default) -- the mailbox never sets one.

Each of agent and tenant follows the same tighten-only rule as the send level: an agent key may turn its own level off, never on (or change its style/provider while on) -- that's a human decision (`403 human_decision_required`), same as every other loosening change; see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen). The mailbox level is gated the same way for its one setting: changing its stored style while the humanizer is on (agent or tenant) is a human decision too.

This hierarchy never applies to mail a human approved through the approval queue, or wrote directly (a portal reply, or a send made after taking over a thread): that mail is delivered exactly as approved or written, whatever `humanize` or the agent/mailbox/tenant config say, and no humanizer credit is taken for it. The same holds for a soft-bounce retry of one of those sends. The skip is recorded in the audit log as `humanizer.skipped` with reason `held_for_approval` or `human_authored`.

### Get / Update Tenant Config

```
GET /v1/me/humanizer
Cookie: <session cookie>
```

```
PUT /v1/me/humanizer
Cookie: <session cookie>

{ "enabled": true, "style": "professional", "provider": "anthropic" }
```

The agent-level equivalent is `GET`/`PUT /v1/agent/agents/:agentId/config` (see [Coordination - Agent Config](#agent-config)); the mailbox-level equivalent is `config.humanizer` on `PATCH /v1/agent/mailboxes/:id` (`{ "config": { "humanizer": { "style": "casual" } } }` -- `config` replaces the whole object on write, so include every field you want to keep).

| Style | Behavior |
|-------|----------|
| `casual` | Conversational, contractions, warm tone |
| `professional` | Clear, direct, polished (default) |
| `friendly` | Warm, personable, upbeat |

> The humanizer preserves all HTML structure, links, compliance text, and unsubscribe links. It only rewrites prose.

---

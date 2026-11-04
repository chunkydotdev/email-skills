<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Template Management

Templates define the content your agent sends. Each template has versioned content, variable declarations, and optional approval gates.

**Auth:** every template endpoint requires `Authorization: Bearer <api-key>` (on `api.molted.email` plus your `tenantId`, query string or body), or a portal session cookie. Requests without credentials get `401`. Another tenant's template or approval ID returns `404`. Create, add-version, publish and review need a key that reaches every mailbox with a write-level scope (`automation`, `manage` or `admin`).

**CLI:** `molted templates create --name <name> --slug <slug> [--type marketing|transactional] [--approval-required] [--subject --body --text --variables <json>] [--auto-publish]`, `molted templates list|get <id>`, `molted templates add-version <id> --subject <s> --body <html> [--text] [--variables <json>]`, `molted templates publish <id> [--requested-by <name>]`, `molted templates approve|reject <approvalId> [--reviewed-by] [--comment]` (a human decision, see below), `molted templates render <id> --payload <json>`. **MCP:** `list_templates`, `render_template`.

### Create a Template

```
POST /v1/templates
```

```json
{
  "slug": "onboarding-welcome",
  "name": "Welcome Email",
  "type": "marketing",
  "approvalRequired": true
}
```

`type` is `marketing` (default) or `transactional`; it decides the unsubscribe and physical-address requirements and how warmup treats the send. Optional `content` (`{ subjectTemplate, htmlTemplate, textTemplate?, variables? }`) creates the first version in the same call, and `autoPublish: true` publishes it; the response is then `{ template, version, publishResult }` instead of the bare template.

### List Templates

```
GET /v1/templates
```

### Get a Template

```
GET /v1/templates/:idOrSlug
```

Accepts either the template UUID or its slug (slug lookups are scoped to your tenant). Returns the template with its current version details, or `404` if no template with that ID or slug exists in your tenant.

### Add a Version

```
POST /v1/templates/:id/versions
```

```json
{
  "subjectTemplate": "Welcome to Acme, {{firstName}}!",
  "htmlTemplate": "<h1>Hi {{firstName}}</h1><p>Your trial starts today.</p><p><a href=\"https://acme.com/unsubscribe\">Unsubscribe</a></p>",
  "textTemplate": "Hi {{firstName}}, your trial starts today.",
  "variables": [
    { "name": "firstName", "type": "string", "required": true, "description": "Recipient first name" }
  ]
}
```

### Publish a Version

Submits the latest version for approval (if `approvalRequired` is true):

```
POST /v1/templates/:id/publish
```

```json
{ "requestedBy": "agent-outbound-sdr" }
```

### Approve or Reject

```
PATCH /v1/templates/approvals/:approvalId
```

```json
{
  "reviewedBy": "human-reviewer",
  "decision": "approved",
  "comment": "Looks good"
}
```

Reviewing a template approval is a human decision: a signed-in person in the portal, or an agent only while the account's gate is `off` or `warn`. Otherwise it returns `403 human_decision_required` with a `decisionUrl` (see [Decisions need a human](#decisions-need-a-human)). Only a pending approval can be reviewed: repeating its current decision returns it unchanged, the other decision returns `409` `{ "error": "already_decided", "status": "..." }`, so a rejected version is never published later by approving the same request. Approving a version older than the live one, or than one waiting for review, returns `409` `{ "error": "superseded" }`: reject it instead. In the portal, a person previews the version (with its lint results; a lint error warns but doesn't block) and approves or rejects it from a card on Home.

### Test Render

Preview a template with sample data without sending. Accepts either the template UUID or its slug:

```
POST /v1/templates/:idOrSlug/render
```

```json
{ "payload": { "firstName": "Alice" } }
```

### Linting Rules

Every template version is automatically linted. A version with any `error` result has `lintPassed: false`, and a send of it is blocked with reason `template_lint_failed`; warnings never block:

| Rule | Severity | Description |
|------|----------|-------------|
| `spam_phrase` | warning | Detects trigger phrases ("act now", "buy now", "click here", etc.) |
| `undeclared_variable` | error | `{{var}}` used in template but not declared. **System variables** (see below) are exempt -- you can use them without declaring. |
| `unused_variable` | warning | Variable declared but never referenced |
| `system_variable_redeclared` | warning | A system variable was passed in `variables[]`. Remove it -- Molted auto-injects it at send time. |
| `insecure_url` | error | `href="http://..."` found — must use HTTPS |
| `missing_unsubscribe` | error | HTML body must contain the word "unsubscribe" (not checked for `transactional` templates) |
| `missing_physical_address` | warning | A `marketing` template without `{{physical_address}}` (filled with the workspace's address at send time) or a mailing/postal address |

### System Variables

Variables auto-injected by Molted at send time. Use them in your templates **without declaring them in `variables[]`** -- the linter recognizes them and the renderer fills them in for you. Declaring one as a user variable triggers `system_variable_redeclared` and is ignored at send time.

| Variable | Description |
|----------|-------------|
| `{{unsubscribe_url}}` | Per-recipient unsubscribe link. Marketing templates should use this in the unsubscribe `<a href>` to satisfy `missing_unsubscribe` without breaking `undeclared_variable`. The namespaced `{{molted:unsubscribe_url}}` spelling works the same way (used by agent senders that build the body directly). Both are filled in on every send path -- request-send, batch, approved sends, list broadcasts, journey `send` steps and follow-ups -- with `List-Unsubscribe` / `List-Unsubscribe-Post` one-click headers attached whenever the link is used. |
| `{{physical_address}}` | Filled with the workspace's physical mailing address (`physicalAddress` in settings, CAN-SPAM) on every send path -- request-send, batch, approved sends, list broadcasts, journey `send` steps and follow-ups -- for any template type, HTML-escaped in the HTML part. The workspace setting always wins: a `physical_address` value in the payload is ignored. A marketing email whose HTML or text part doesn't carry the address gets it appended to that part as a footer, so `Acme · {{physical_address}} · <a href="{{unsubscribe_url}}">Unsubscribe</a>` shows the address once, inline. A marketing template with no address on file blocks the send with reason `missing_physical_address`; any other template renders it empty. |

`templates render` fills `{{physical_address}}` from the workspace the same way, and reports an `unfilled_system_variable` warning when a system variable has no value (for `{{physical_address}}`: the workspace has none set), instead of silently rendering it as an empty string with no indication why. The `dry_run` / `simulate` preview renders the content the send would deliver instead: the unsubscribe link is a placeholder that never resolves (warning `unsubscribe_link_placeholder`), since a dry run mints no real link, and a template using `{{physical_address}}` while the workspace has none set carries the warning `physical_address_unset`.

---

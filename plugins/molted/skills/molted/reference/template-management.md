<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Template Management

Templates define the content your agent sends. Each template has versioned content, variable declarations, and optional approval gates.

**Auth:** every template endpoint requires `Authorization: Bearer <api-key>` plus your `tenantId` (query string or body), or a portal session cookie. Requests without credentials get `401`. Another tenant's template or approval ID returns `404`.

### Create a Template

```
POST /v1/templates
```

```json
{
  "tenantId": "your-tenant-id",
  "slug": "onboarding-welcome",
  "name": "Welcome Email",
  "approvalRequired": true
}
```

### List Templates

```
GET /v1/templates?tenantId=your-tenant-id
```

### Get a Template

```
GET /v1/templates/:idOrSlug?tenantId=your-tenant-id
```

Accepts either the template UUID or its slug (slug lookups are scoped to your tenant). Returns the template with its current version details, or `404` if no template with that ID or slug exists in your tenant.

### Add a Version

```
POST /v1/templates/:id/versions
```

```json
{
  "tenantId": "your-tenant-id",
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
{ "tenantId": "your-tenant-id", "requestedBy": "agent-outbound-sdr" }
```

### Approve or Reject

```
PATCH /v1/templates/approvals/:approvalId
```

```json
{
  "tenantId": "your-tenant-id",
  "reviewedBy": "human-reviewer",
  "decision": "approved",
  "comment": "Looks good"
}
```

Reviewing a template approval is a human decision: a signed-in person in the portal, or an agent only while the account's gate is `off` or `warn`. Otherwise it returns `403 human_decision_required` with a `decisionUrl` (see [Decisions need a human](#decisions-need-a-human)).

### Test Render

Preview a template with sample data without sending. Accepts either the template UUID or its slug:

```
POST /v1/templates/:idOrSlug/render
```

```json
{ "tenantId": "your-tenant-id", "payload": { "firstName": "Alice" } }
```

### Linting Rules

Every template version is automatically linted. Lint failures block sends:

| Rule | Severity | Description |
|------|----------|-------------|
| `spam_phrase` | warning | Detects trigger phrases ("act now", "buy now", "click here", etc.) |
| `undeclared_variable` | error | `{{var}}` used in template but not declared. **System variables** (see below) are exempt -- you can use them without declaring. |
| `unused_variable` | warning | Variable declared but never referenced |
| `system_variable_redeclared` | warning | A system variable was passed in `variables[]`. Remove it -- Molted auto-injects it at send time. |
| `insecure_url` | error | `href="http://..."` found — must use HTTPS |
| `missing_unsubscribe` | error | HTML body must contain the word "unsubscribe" |

### System Variables

Variables auto-injected by Molted at send time. Use them in your templates **without declaring them in `variables[]`** -- the linter recognizes them and the renderer fills them in for you. Declaring one as a user variable triggers `system_variable_redeclared` and is ignored at send time.

| Variable | Description |
|----------|-------------|
| `{{unsubscribe_url}}` | Per-recipient unsubscribe link. Marketing templates should use this in the unsubscribe `<a href>` to satisfy `missing_unsubscribe` without breaking `undeclared_variable`. The namespaced `{{molted:unsubscribe_url}}` spelling works the same way (used by agent senders that build the body directly). Both are filled in on every send path -- request-send, batch, approved sends, list broadcasts, and journey `send` steps -- with `List-Unsubscribe` / `List-Unsubscribe-Post` one-click headers attached whenever the link is used. |
| `{{physical_address}}` | The tenant's configured physical mailing address (CAN-SPAM). The send pipeline also auto-appends a footer when this is missing from marketing templates (all send paths, including journeys). A marketing template with none on file blocks the send with reason `missing_physical_address`. |

`templates render` and the `dry_run` / `simulate` preview report an `unfilled_system_variable` warning when a system variable has no value in the preview payload, instead of silently rendering it as an empty string with no indication why.

---

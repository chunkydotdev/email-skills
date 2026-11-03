<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Propose Email

Get template candidates and a policy pre-check before deciding what to send:

```
POST /v1/agent/propose-email
```

```json
{
  "recipientEmail": "alice@example.com"
}
```

Response:
```json
{
  "draftCandidates": [
    { "templateId": "tmpl_1", "templateSlug": "onboarding-welcome", "templateName": "Welcome Email" },
    { "templateId": "tmpl_2", "templateSlug": "trial-nudge", "templateName": "Trial Ending Nudge" }
  ],
  "policyPreCheck": {
    "allow": true,
    "wouldRequireApproval": false,
    "notChecked": ["template_render", "template_type_rules", "content_check", "duplicate", "cooldown", "template_lint", "consent"]
  },
  "contactContext": {
    "id": "contact_abc",
    "email": "alice@example.com",
    "name": "Alice",
    "lifecycleStage": "trial",
    "dealStage": null,
    "recentSends": 2,
    "recentInbound": 1,
    "activeJourneys": 1
  }
}
```

`policyPreCheck` runs a real send's own checks for this recipient, in the real send's order, from the mailbox a real send would use (send `mailboxId` to name one; otherwise your key's send mailbox, else the tenant default), and changes nothing. Every check that does not need a template is the same one `simulate-send` and `request-send` run: billing (`trial_not_activated`, `subscription_expired`, including a paid plan past its grace period), `tenant_paused`, `mailbox_paused`, sender and domain blocks, `suppressed`, `disengaged`, `active_opportunity`, `thread_taken_over`, `lease_conflict` (send your `x-agent-id`), the per-domain and daily limits, and the approval hold (`wouldRequireApproval: true`, with `approvalReason`, is an allow that a human must approve). Treat any `allow: false` as a hard stop -- don't proceed to `request-send`.

**`allow: true` is not a promise.** No template has been chosen yet, so the checks that depend on one cannot run. `notChecked` lists them by a stable id, and a real send can still be blocked by any of them:

| `notChecked` id | What was not checked |
|---|---|
| `template_render` | Rendering the template (`template_not_found`, `template_render_failed`, `missing_physical_address`) |
| `template_lint` | The template's approval and lint status |
| `template_type_rules` | Rules that differ for marketing and transactional templates (warmup: a marketing send over the cap is deferred, a transactional one refused; the per-recipient-domain hourly limit). Propose judges the general (marketing) rules |
| `consent` | Consent for a marketing template (`no_consent`) |
| `cooldown` | The cooldown, which is per recipient and template (`cooldown`) |
| `duplicate` | A dedupe key already used (`duplicate`) |
| `content_check` | The outbound content check on the email's text |

The list is not ordered, and an id can be absent when an earlier check already blocked (an `allow: false` needs no more checks). Once you have chosen a template, run `simulate-send` with it for the full verdict.

---

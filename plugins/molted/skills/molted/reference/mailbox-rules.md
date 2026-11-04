<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Mailbox Rules

Label or archive new conversations automatically, by sender or subject. Rules run on the first message of a new thread, in `position` order; a matching rule with `stopProcessing: true` (the default) ends the run.

### List Rules

```
GET /v1/agent/rules?mailboxId=mbx-uuid
```

### Create a Rule

```
POST /v1/agent/rules
```

```json
{
  "mailboxId": "mbx-uuid",
  "name": "Billing mail",
  "conditionType": "subject",
  "conditionOperator": "contains",
  "conditionValue": "invoice",
  "actionType": "apply_label",
  "actionValue": "label-uuid"
}
```

- `conditionType`: `sender_domain`, `sender_email` or `subject`.
- `conditionOperator`: `equals`, `contains`, `ends_with` or `matches_pattern` (SQL `LIKE`: `%` and `_`).
- `actionType`: `apply_label` (with `actionValue` a [label](#labels) id of the same mailbox), or `auto_archive`. `move_to_folder` is the old name of `apply_label` and still works.
- Optional: `enabled` (default `true`), `position`, `stopProcessing` (default `true`).

A label applied by a rule is recorded with `appliedBy: { "type": "rule", "id": "<rule id>" }`. Deleting the label disables its rules. Needs `manage` on the mailbox.

A rule read carries `invalidLabel: true` and `invalidLabelReason` (`label_missing` or `label_in_other_mailbox`) when its label can't be applied: the label was deleted, or (a rule made before rules had to name a label of their own mailbox) it belongs to another mailbox. Such a rule matches but applies nothing: point it at a label of its own mailbox.

### Get a Rule

```
GET /v1/agent/rules/:id
```

### Update a Rule

```
PATCH /v1/agent/rules/:id
```

### Delete a Rule

```
DELETE /v1/agent/rules/:id
```

### Reorder Rules

Change the evaluation order of a mailbox's rules:

```
POST /v1/agent/rules/reorder
```

```json
{
  "mailboxId": "mbx-uuid",
  "ruleIds": ["rule-uuid-1", "rule-uuid-2", "rule-uuid-3"]
}
```

Reads need `read`; create, update, delete and reorder need `manage` on the mailbox. `PATCH` takes any of the create fields except `mailboxId`.

**CLI:** `molted rules list --mailbox <id>`, `molted rules create --mailbox <id> --name <name> --condition-type <t> --condition-operator <op> --condition-value <v> --action-type <t> [--action-value <labelId>] [--position <n>] [--no-stop-processing]`, `molted rules get|delete <id>`, `molted rules update <id> [...] [--enabled|--no-enabled]`, `molted rules reorder --mailbox <id> --rule-ids <id1,id2,...>`. No MCP tool for rules.

---

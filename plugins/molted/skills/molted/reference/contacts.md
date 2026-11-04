<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Contacts

Manage your contact database. Contacts are created automatically when you send emails, or can be synced from your CRM. Reads need `read`; create, update, sync and delete need a key that reaches every mailbox with the `manage` scope (`403 mailbox_scope_denied` / `insufficient_scope` otherwise).

**CLI:** `molted contacts list [--email <email>]`, `molted contacts get <id>`, `molted contacts create --email <email> [--name] [--owner-email] [--lifecycle-stage] [--deal-stage] [--external-id] [--metadata <json>]`, `molted contacts update <id> [same flags]`, `molted contacts sync --contacts '<json>' | --stdin`, `molted contacts delete <id>`, `molted contacts context <email>`. **MCP:** `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `sync_contacts`, `delete_contact`, `get_context`.

### List Contacts

```
GET /v1/contacts?email=alice@example.com
```

The `email` query param is optional. Without it the list returns up to 100 contacts, most recently updated first.

### Get a Contact

```
GET /v1/contacts/:id
```

### Create a Contact

Create a single contact. The email must be unique within the tenant — a duplicate returns `409`. (Use Sync for bulk upserts that tolerate duplicates.)

The email is stored lowercased, with a Unicode or fullwidth domain converted to its ASCII form and a trailing dot dropped, so `Alice@Example.com` is stored (and checked for duplicates) as `alice@example.com`. Sync, update and every other contact write store it the same way.

```
POST /v1/contacts
```

```json
{
  "email": "alice@example.com",
  "name": "Alice Smith",
  "lifecycleStage": "lead",
  "metadata": { "plan": "pro" }
}
```

Returns the created contact (`201`).

### Update a Contact

Update fields on a contact by ID. `metadata` is merged at the top level (supplied keys overwrite, others are preserved).

```
PATCH /v1/contacts/:id
```

```json
{
  "name": "Alice S.",
  "metadata": { "plan": "enterprise" }
}
```

Returns the updated contact, or `404` if it does not exist.

### Delete a Contact

Permanently delete the contact record. Also removes the contact from any lists (decrementing subscriber counts) and segments, and drops its sender allow-list entry. Irreversible. **This is not a GDPR erasure:** the address stays on sends, messages, threads, consent records, events and the audit trail, and it is not suppressed (add a suppression if they must not be emailed again). A full right-to-erasure deletion is the owner-only `POST /v1/me/delete/contact` (portal session). A list unsubscribe outlives the delete (kept as a one-way hash of the address per list): recreating the contact and subscribing it again returns `"reason": "previously_unsubscribed"`. Changing a contact's email (`PATCH /v1/contacts/:id`) keeps the old address unsubscribed the same way.

Loosening -- see [Agents may tighten, never loosen](#agents-may-tighten-never-loosen) (`kind: "contact"`, #2231): `enforce` refuses with `403 human_decision_required` and a `decisionUrl` instead of deleting anything; `warn` deletes with the `Molted-Deprecation: human-gate` header; `off` deletes with no gate. The delete is audited (`audit_events`, `contact.erased`) whichever way it went through. A verified human is never gated -- the portal's own Erase (contact dialog, owner-only, confirmed, async) is unaffected either way.

```
DELETE /v1/contacts/:id
```

Returns `{ "deleted": true }`, or `404` if it does not exist. An agent key refused by the gate gets the loosening 403 shown in [Agents may tighten, never loosen](#agents-may-tighten-never-loosen) instead.

CLI: `molted contacts delete <id>` (prints the 403 body, including `decisionUrl`, on stderr when gated). MCP: `delete_contact`.

### Sync Contacts

Upsert contacts from an external system (CRM, data warehouse, etc.):

```
POST /v1/contacts/sync
```

```json
{
  "contacts": [
    {
      "externalId": "crm-12345",
      "email": "alice@example.com",
      "name": "Alice Smith",
      "lifecycleStage": "customer",
      "dealStage": "closed_won",
      "metadata": { "plan": "enterprise" }
    }
  ]
}
```

Response:
```json
{ "syncId": "...", "processed": 1, "segmentsRecomputeQueued": 3 }
```

`segmentsRecomputeQueued` is the number of active segments whose snapshot was enqueued for recompute by the worker. Segment `contactCount` / `snapshotVersion` (visible via `GET /v1/segments`) catch up shortly after the sync without you needing to call `POST /v1/segments/:id/compute`. The recompute is best-effort -- if the queue is unavailable, the field will be `0` and you can run `compute` manually.

---

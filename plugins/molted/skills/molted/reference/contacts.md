<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Contacts

Manage your contact database. Contacts are created automatically when you send emails, or can be synced from your CRM.

### List Contacts

```
GET /v1/contacts?tenantId=your-tenant-id&email=alice@example.com
```

The `email` query param is optional — omit it to list all contacts.

### Get a Contact

```
GET /v1/contacts/:id?tenantId=your-tenant-id
```

### Create a Contact

Create a single contact. The email must be unique within the tenant — a duplicate returns `409`. (Use Sync for bulk upserts that tolerate duplicates.)

```
POST /v1/contacts
```

```json
{
  "tenantId": "your-tenant-id",
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
  "tenantId": "your-tenant-id",
  "name": "Alice S.",
  "metadata": { "plan": "enterprise" }
}
```

Returns the updated contact, or `404` if it does not exist.

### Delete a Contact

Permanently delete a contact (GDPR erasure). Also removes the contact from any lists (decrementing subscriber counts) and segments. Irreversible.

```
DELETE /v1/contacts/:id?tenantId=your-tenant-id
```

Returns `{ "deleted": true }`, or `404` if it does not exist.

### Sync Contacts

Upsert contacts from an external system (CRM, data warehouse, etc.):

```
POST /v1/contacts/sync
```

```json
{
  "tenantId": "your-tenant-id",
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

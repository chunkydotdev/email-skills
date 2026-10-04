<!--
GENERATED FILE. Do not hand-edit.
Source: https://molted.email/skill.md
Regenerate with: node scripts/sync-molted-skill.mjs
-->

## Audience Segmentation

Build filtered audiences for targeting and analytics.

### Create a Segment

```
POST /v1/segments
```

```json
{
  "tenantId": "your-tenant-id",
  "name": "Active Trial Users",
  "filterGroup": {
    "logic": "and",
    "filters": [
      { "type": "contact_field", "field": "lifecycleStage", "operator": "eq", "value": "trial" },
      { "type": "behavioral", "field": "event_count", "operator": "gte", "value": 3,
        "behavioralWindow": { "eventName": "page.viewed", "windowDays": 7, "countOperator": "gte", "countValue": 3 }
      }
    ]
  }
}
```

### Filter Types

| Type | Description |
|------|-------------|
| `contact_field` | Filter on contact fields (email, name, lifecycleStage, dealStage) |
| `account_field` | Filter on account/company fields |
| `metadata` | Filter on custom contact metadata |
| `firmographic` | Filter on firmographic data (industry, size) |
| `behavioral` | Filter on event counts within a time window |

### Filter Operators

`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`, `in`, `not_in`, `exists`, `not_exists`, `between`

### Accepted filterGroup shapes

The canonical shape is `{ logic: 'and' | 'or', filters: [...] }`. The evaluator also tolerates two legacy / shorthand variants so old data and ad-hoc CLI calls keep working:

- CLI shorthand inside a group: `operator` (alias for `logic`), `conditions` (alias for `filters`), and `op` (alias for `operator` on individual filters).
- Bare filter at the top level: `{ field, op|operator, value }` is treated as a single-filter `and` group. Useful when you stored a single condition directly as the `filterGroup`. New writes (\`POST /v1/segments\`) normalize all of these to the canonical shape.

### List / Get / Update Segments

```
GET /v1/segments?tenantId=your-tenant-id
GET /v1/segments/:id
PATCH /v1/segments/:id   — update name or filters
DELETE /v1/segments/:id  — archive
```

### Compute Membership

Trigger an async membership computation:

```
POST /v1/segments/:id/compute?tenantId=your-tenant-id
```

### List Members

```
GET /v1/segments/:id/members?tenantId=your-tenant-id&limit=50&offset=0
```

### Get Contact Segments

List all active segments a contact belongs to:

```
GET /v1/segments/contact/:contactId/segments
```

Response:
```json
[
  { "id": "seg_123", "name": "Active Trial Users", "status": "active" },
  { "id": "seg_456", "name": "High Intent Leads", "status": "active" }
]
```

---

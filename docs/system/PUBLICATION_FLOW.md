# ROOT to OBSERVATORY Publication Flow

Canonical states:

`DRAFT → REVIEWED → APPROVED_FOR_PUBLICATION → PUBLISHED → SUPERSEDED | RETRACTED`

## Rules

- Only a founder-authorized server operation may review, approve, publish, supersede or retract.
- OBSERVATORY may read only rows with `status = 'PUBLISHED'` and a non-null `published_at`.
- Public consumers receive `public_payload` and declared `public_fields`, never the private source row.
- Publication does not delete or mutate FIELD evidence.
- Retraction removes a publication from the public read set but preserves internal audit history.
- Every state transition must produce `sfi_audit_events` with before and after state.

## Required publication fields

- `source_type`
- `source_id`
- `public_fields`
- `public_payload`
- `snapshot_version`
- `confidence`
- `approved_by`
- `status`
- timestamps

## Sanitization

The publisher must explicitly construct `public_payload`. It must not serialize a full private row and then remove selected keys. No user ID, email, private URI, storage path, internal error, SQL message, service metadata or private evidence text may be included unless separately approved and intended for public release.

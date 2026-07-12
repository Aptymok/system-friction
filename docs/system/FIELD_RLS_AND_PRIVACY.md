# FIELD RLS and Privacy

## Ownership

Every private FIELD entity is bound to `auth.users.id` through `owner_id`. Dependent records also include `case_id` for traceability.

The client may submit content, but it must not be treated as authority for ownership. Server handlers must derive owner identity from the authenticated Supabase user.

## RLS policies

The migration defines owner policies for:

- `field_profiles`
- `field_cases`
- `field_case_evidence`
- `field_moph_runs`
- `field_mihm_readings`
- `field_hypotheses`
- `field_interventions`
- `field_returns`
- `field_outcomes`
- `field_lessons`

For private rows:

- SELECT: `owner_id = auth.uid()`
- INSERT: `owner_id = auth.uid()`
- UPDATE: existing and resulting `owner_id = auth.uid()`
- DELETE: `owner_id = auth.uid()`

`field_profiles` uses `user_id = auth.uid()`.

## Storage

Bucket: `field-evidence`

Visibility: private

Canonical path:

`{owner_id}/{case_id}/{object_id}/{sanitized_filename}`

Storage policies verify the first folder segment equals `auth.uid()`.

Route handlers must additionally validate:

- case ownership;
- object ownership;
- MIME type;
- extension;
- file size;
- sanitized filename;
- path consistency.

## Founder access

Founder oversight must use server-only routes after `requireFounder()`. Service-role access must not be exposed to the browser and must not be used as a substitute for checking founder identity.

## Deletion

The schema supports cascade deletion from a FIELD case to dependent analytical records. A future account deletion workflow must define retention, exports, audit retention and irreversible storage deletion before exposing a deletion control.

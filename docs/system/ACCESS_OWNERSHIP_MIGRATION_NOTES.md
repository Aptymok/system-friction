# Access and Ownership Migration Notes

Migration:

`supabase/migrations/20260711103000_system_access_ownership_foundation.sql`

## Application status

The migration is versioned in GitHub but is not applied automatically to production by this PR.

## Non-destructive behavior

- Creates FIELD, publication and canonical audit tables only when absent.
- Adds nullable `owner_id` to existing Studio session/object/upload tables.
- Does not delete existing Studio rows.
- Does not backfill legacy Studio ownership.
- Creates a private `field-evidence` bucket.
- Adds explicit owner RLS policies.

## Required environment

Preferred founder identity:

`SFI_FOUNDER_USER_IDS`

Optional compatibility:

- `SFI_FOUNDER_EMAILS`
- `SYSTEM_ROOT_EMAIL`

Existing Supabase variables remain required.

## Before production application

1. Review existing policies on `studio_sessions`, `studio_objects` and `studio_uploads`.
2. Confirm whether any current client workflow depends on broader Studio RLS policies.
3. Identify ownership for legacy Studio rows before backfill.
4. Confirm `storage.foldername` is available in the Supabase Storage schema.
5. Apply in staging first.
6. Test with anonymous, user A, user B and founder identities.
7. Verify rollback procedure before production.

## Known limitation

Existing Studio objects with null ownership are intentionally not granted to ordinary authenticated users. Founder server routes may inspect them only after founder authorization. A separate audited backfill is required.

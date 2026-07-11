# Canonical Access Boundaries

## Roles

- `PUBLIC`: unauthenticated public read access to approved Observatory data only.
- `FIELD_USER`: authenticated user with access only to owned FIELD and owned Studio resources.
- `FOUNDER`: explicitly allowed founder identity with private ROOT governance access.

## Server enforcement

Canonical helpers:

- `requireAuthenticatedUser()`
- `requireFieldUser()`
- `requireFounder()`
- `requireFounderPage()`
- `requireCaseOwner(caseId)`
- `requireObjectOwner(objectId)`
- `requirePublicationAuthority()`

Middleware is an early gate, not the sole authorization layer. ROOT pages and administrative route handlers must call founder authorization before reading private data.

## Founder configuration

Preferred variable:

`SFI_FOUNDER_USER_IDS=<supabase-user-uuid>[,<uuid>]`

Compatibility variables:

- `SFI_FOUNDER_EMAILS`
- `SYSTEM_ROOT_EMAIL`
- profile roles `root` and `system`

User ID allowlisting is preferred because email can change.

## ROOT

- Session required.
- Founder authorization required before loading governance state.
- No indexation.
- FIELD users receive the unauthorized surface.
- Founder-only writes must produce `sfi_audit_events`.

## FIELD

- Session required for `/field` and descendants.
- All new private records include `owner_id`.
- RLS validates `owner_id = auth.uid()` for SELECT, INSERT, UPDATE and DELETE.
- The client must never be trusted to choose an owner.
- Evidence storage uses private owner-prefixed paths.

## OBSERVATORY

- Public read-only surface.
- Public state may contain only persisted WorldSpect snapshots or `PUBLISHED` rows from `sfi_publications`.
- It must not query FIELD tables or expose internal publication source records.

## Studio

The migration adds nullable `owner_id` columns non-destructively. New Studio writes must set owner IDs. Legacy rows remain inaccessible to ordinary owner policies until an explicit backfill is designed and reviewed.

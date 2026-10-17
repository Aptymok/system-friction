-- MEM-003 / 2026-10-17 / NEON CONTINUITY
-- Idempotent schema support for a distinct historical-journal receipt.
-- Not an execution receipt and NOT evidence that a protected value was
-- copied to PRIMARY. Source images, operation identifiers and original errors
-- remain in the durable journal. No user account/password/grant is changed.
--
-- Verified production one-time incident:
-- Liliana Murillo Moreno: 6 historical conflicts; Poke: 2 historical
-- pending updates. Their CURRENT semantic authority projections matched
-- independently between primary Supabase and Neon after omitting ONLY:
--   grant: created_at, updated_at, last_invite_error
--   profile: created_at, updated_at, last_seen_at.
-- Historical source operations were classified SUPERSEDED_BY_PRIMARY only
-- after checking exact record ids, emails, and current authority hashes.
--
-- Future resolutions use guarded server-side comparisons, not blanket
-- timestamp tolerance or mass conversion of conflicts.
ALTER TABLE public.sfi_data_plane_write_journal
  DROP CONSTRAINT IF EXISTS sfi_data_plane_write_journal_status_check;

ALTER TABLE public.sfi_data_plane_write_journal
  ADD CONSTRAINT sfi_data_plane_write_journal_status_check
  CHECK (status IN (
    'PENDING','REPLAYING','REPLAYED','CONFLICT',
    'LOCAL_ONLY','EXPIRED_CREDENTIAL','SUPERSEDED_BY_PRIMARY'
  ));

COMMENT ON TABLE public.sfi_data_plane_write_journal IS
  'Continuity source journal. SUPERSEDED_BY_PRIMARY means a protected historical image is preserved, NOT replayed, after independent cross-plane semantic authority parity verification. PENDING/REPLAYING/CONFLICT continue to block PRIMARY certification.';

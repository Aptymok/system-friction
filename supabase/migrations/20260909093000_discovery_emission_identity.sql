-- SFI-DISCOVERY-EMISSION-IDENTITY-1.0
-- WS-03 assurance repair: lifecycle-independent idempotency for discovery emission receipts.
-- This does not create a new persistence owner. It constrains the existing
-- public.sfi_external_representations owner so concurrent/retry execution
-- cannot duplicate the same canonical-object representation content.

create unique index if not exists sfi_external_representations_discovery_identity_uidx
  on public.sfi_external_representations (
    canonical_object_key,
    representation_kind,
    content_hash
  )
  where representation_kind = 'DISCOVERY_EMISSION'
    and content_hash is not null;

comment on index public.sfi_external_representations_discovery_identity_uidx is
  'WS-03 lifecycle-independent identity for one discovery representation content hash. State transitions such as READY -> PUBLISHED do not permit a duplicate receipt for the same canonical object/content.';

alter table public.sfi_oauth_clients
  drop constraint if exists sfi_oauth_clients_redirect_uris_check;

alter table public.sfi_oauth_clients
  add constraint sfi_oauth_clients_redirect_uris_check
  check (
    (audience = 'OWNER_ONLY' and cardinality(redirect_uris) between 0 and 10)
    or
    (audience = 'TRUSTED_MULTI_USER' and cardinality(redirect_uris) between 1 and 10)
  );

comment on column public.sfi_oauth_clients.redirect_uris is
  'Exact redirect allowlist. OWNER_ONLY clients may start empty and bind their first exact redirect during an authenticated owner authorization request; TRUSTED_MULTI_USER clients must be provisioned with at least one redirect.';

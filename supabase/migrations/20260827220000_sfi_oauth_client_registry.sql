create table if not exists public.sfi_oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  client_secret_hash text not null,
  name text not null,
  created_by uuid not null,
  redirect_uris text[] not null,
  allowed_scopes text[] not null default '{}',
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sfi_oauth_clients_status_check
    check (status in ('ACTIVE', 'REVOKED')),
  constraint sfi_oauth_clients_redirect_uris_check
    check (cardinality(redirect_uris) between 1 and 10)
);

alter table public.sfi_oauth_clients enable row level security;

-- The application accesses this registry only through the server-side service
-- client. No browser/user role receives direct table access.
revoke all on table public.sfi_oauth_clients from anon, authenticated;
grant select, insert, update, delete on table public.sfi_oauth_clients to service_role;

create index if not exists sfi_oauth_clients_created_by_idx
  on public.sfi_oauth_clients (created_by, created_at desc);

create index if not exists sfi_oauth_clients_status_idx
  on public.sfi_oauth_clients (status, created_at desc);

comment on table public.sfi_oauth_clients is
  'Persistent registry for external OAuth clients. Redirect URIs are exact-match allowlists; secrets are stored only as hashes. Service-role access only.';

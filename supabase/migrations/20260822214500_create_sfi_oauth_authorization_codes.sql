create table if not exists public.sfi_oauth_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  client_id text not null,
  redirect_uri text not null,
  subject_id uuid not null,
  actor_id text not null,
  label text,
  role text not null default 'agent',
  tenant_id text not null default 'sfi',
  scopes text[] not null default '{}',
  code_challenge text,
  code_challenge_method text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sfi_oauth_code_challenge_method_check
    check (code_challenge_method is null or code_challenge_method = 'S256')
);

alter table public.sfi_oauth_authorization_codes enable row level security;

create index if not exists sfi_oauth_authorization_codes_expires_at_idx
  on public.sfi_oauth_authorization_codes (expires_at);

create index if not exists sfi_oauth_authorization_codes_subject_id_idx
  on public.sfi_oauth_authorization_codes (subject_id, created_at desc);

comment on table public.sfi_oauth_authorization_codes is
  'Short-lived, one-time authorization codes for governed external SFI OAuth clients. Service-role access only; no RLS policies are intentionally granted.';

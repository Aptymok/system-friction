create table if not exists public.sfi_public_runtime_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null unique,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  payload jsonb not null,
  warnings text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_public_runtime_snapshots_key_generated_idx
  on public.sfi_public_runtime_snapshots (snapshot_key, generated_at desc);

create or replace function public.set_sfi_public_runtime_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sfi_public_runtime_snapshots_updated_at
on public.sfi_public_runtime_snapshots;

create trigger set_sfi_public_runtime_snapshots_updated_at
before update on public.sfi_public_runtime_snapshots
for each row
execute function public.set_sfi_public_runtime_snapshots_updated_at();

alter table public.sfi_public_runtime_snapshots enable row level security;

drop policy if exists "sfi public runtime snapshots service role full access"
on public.sfi_public_runtime_snapshots;

create policy "sfi public runtime snapshots service role full access"
on public.sfi_public_runtime_snapshots
for all
to service_role
using (true)
with check (true);

revoke all on public.sfi_public_runtime_snapshots from anon, authenticated;
grant all on public.sfi_public_runtime_snapshots to service_role;
create extension if not exists pgcrypto;

create table if not exists public.sfi_user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'preview' check (tier in ('preview', 'field_observer', 'full_moph')),
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  valid_until timestamptz,
  source text not null default 'stripe',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sfi_user_phenotype_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.field_cases(id) on delete cascade,
  moph_run_id uuid references public.field_moph_runs(id) on delete cascade,
  code text not null,
  label text not null,
  summary text not null,
  dimensions jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0,
  source text not null default 'mini_moph',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists sfi_user_entitlements_stripe_subscription_idx
  on public.sfi_user_entitlements(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists sfi_user_phenotype_profiles_owner_idx
  on public.sfi_user_phenotype_profiles(owner_id, observed_at desc);

alter table public.sfi_user_entitlements enable row level security;
alter table public.sfi_user_phenotype_profiles enable row level security;

drop policy if exists sfi_user_entitlements_owner_read on public.sfi_user_entitlements;
create policy sfi_user_entitlements_owner_read on public.sfi_user_entitlements
for select to authenticated using (user_id = auth.uid());

drop policy if exists sfi_user_phenotype_profiles_owner_select on public.sfi_user_phenotype_profiles;
create policy sfi_user_phenotype_profiles_owner_select on public.sfi_user_phenotype_profiles
for select to authenticated using (owner_id = auth.uid());

drop policy if exists sfi_user_phenotype_profiles_owner_insert on public.sfi_user_phenotype_profiles;
create policy sfi_user_phenotype_profiles_owner_insert on public.sfi_user_phenotype_profiles
for insert to authenticated with check (owner_id = auth.uid());

comment on table public.sfi_user_entitlements is 'Commercial access boundary for normal-user FIELD and full MOP-H capabilities.';
comment on table public.sfi_user_phenotype_profiles is 'Longitudinal phenotype observations derived from authenticated MOP-H executions.';

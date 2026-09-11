create table if not exists public.sfi_account_access_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  title text not null,
  access_class text not null check (access_class in ('INSTITUTIONAL_OBSERVER','INSTITUTIONAL_OPERATOR')),
  status text not null default 'PENDING' check (status in ('PENDING','INVITED','ACTIVE','SUSPENDED','INVITE_FAILED')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  activated_at timestamptz,
  last_invite_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sfi_account_access_email_normalized check (email = lower(trim(email)))
);

create index if not exists sfi_account_access_grants_status_idx
  on public.sfi_account_access_grants(status, updated_at desc);

alter table public.sfi_account_access_grants enable row level security;

-- Access grants are intentionally service-side only. Authentication grants access to an
-- account, never authority to administer other accounts. No direct authenticated policy
-- is created for this table.

comment on table public.sfi_account_access_grants is
  'ROOT-administered account access. Account access is not an institutional appointment and never grants founder/canonical authority.';
comment on column public.sfi_account_access_grants.access_class is
  'Bounded access profile only. Generic account administration cannot create controller, director, founder, sovereign, or canonical authority.';

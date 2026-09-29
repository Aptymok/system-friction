create table if not exists public.sfi_public_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  subject text not null,
  message text not null,
  consent boolean not null default false,
  source text not null default 'PUBLIC',
  status text not null default 'RECEIVED' check (status in ('RECEIVED','REVIEWED','ARCHIVED')),
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_public_newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default false,
  source text not null default 'PUBLIC',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','UNSUBSCRIBED')),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.sfi_public_contact_submissions enable row level security;
alter table public.sfi_public_newsletter_subscribers enable row level security;

revoke all on table public.sfi_public_contact_submissions from anon, authenticated;
revoke all on table public.sfi_public_newsletter_subscribers from anon, authenticated;
grant select, insert, update on table public.sfi_public_contact_submissions to service_role;
grant select, insert, update on table public.sfi_public_newsletter_subscribers to service_role;

create index if not exists sfi_public_contact_created_idx on public.sfi_public_contact_submissions(created_at desc);
create index if not exists sfi_public_newsletter_status_idx on public.sfi_public_newsletter_subscribers(status, updated_at desc);

-- Correct the institutional member identity from the misspelled
-- edwing.tzolkin@gmail.com to the actual Supabase account.
-- This migration is additive/corrective so previously applied migrations remain immutable.

update public.profiles
set
  alias = case
    when alias is null or btrim(alias) = '' or alias = 'Edwing' then 'Edwin'
    else alias
  end,
  email = 'edwin.tzolkin@gmail.com',
  updated_at = now()
where lower(email) = 'edwing.tzolkin@gmail.com';

insert into public.profiles (
  user_id,
  alias,
  email,
  role,
  subscription_tier,
  module_access,
  created_at,
  updated_at
)
select
  users.id,
  'Edwin',
  lower(users.email),
  'operator',
  'enterprise',
  jsonb_build_object(
    'observatory', true,
    'planner', true,
    'simulator', true,
    'executor', false,
    'social', true,
    'field', true,
    'studio', true,
    'world_field', true,
    'root', false
  ),
  now(),
  now()
from auth.users as users
where lower(users.email) = 'edwin.tzolkin@gmail.com'
on conflict (user_id) do update
set
  alias = case
    when public.profiles.alias is null or btrim(public.profiles.alias) = '' or public.profiles.alias = 'Edwing'
      then excluded.alias
    else public.profiles.alias
  end,
  email = excluded.email,
  role = case
    when public.profiles.role in ('root', 'controller') then public.profiles.role
    else 'operator'
  end,
  subscription_tier = 'enterprise',
  module_access = coalesce(public.profiles.module_access, '{}'::jsonb) || excluded.module_access,
  updated_at = now();

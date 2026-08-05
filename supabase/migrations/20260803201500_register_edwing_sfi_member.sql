-- Register the existing Supabase account as an SFI institutional operator.
-- This does not grant ROOT/founder authority.
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
  'Edwing',
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
where lower(users.email) = 'edwing.tzolkin@gmail.com'
on conflict (user_id) do update
set
  alias = case when public.profiles.alias is null or btrim(public.profiles.alias) = '' then excluded.alias else public.profiles.alias end,
  email = excluded.email,
  role = case when public.profiles.role in ('root', 'controller') then public.profiles.role else 'operator' end,
  subscription_tier = 'enterprise',
  module_access = coalesce(public.profiles.module_access, '{}'::jsonb) || excluded.module_access,
  updated_at = now();

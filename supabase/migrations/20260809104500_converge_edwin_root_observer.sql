-- Converge Edwin's persisted institutional profile to ROOT observer semantics.
-- ROOT observation is allowed; sovereign execution is explicitly denied.

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
  'observer',
  'enterprise',
  jsonb_build_object(
    'observatory', true,
    'planner', true,
    'simulator', true,
    'social', true,
    'field', true,
    'studio', true,
    'world_field', true,
    'root', true,
    'root_observe', true,
    'full_access', false,
    'executor', false,
    'root_execution', false,
    'governance_write', false,
    'sovereign_actions', false,
    'canonical_promotion', false
  ),
  now(),
  now()
from auth.users as users
where lower(users.email) = 'edwin.tzolkin@gmail.com'
on conflict (user_id) do update
set
  alias = case
    when public.profiles.alias is null or btrim(public.profiles.alias) = '' or public.profiles.alias in ('Edwing', 'edwin.tzolkin')
      then 'Edwin'
    else public.profiles.alias
  end,
  email = excluded.email,
  role = 'observer',
  subscription_tier = 'enterprise',
  module_access = coalesce(public.profiles.module_access, '{}'::jsonb) || excluded.module_access,
  updated_at = now();

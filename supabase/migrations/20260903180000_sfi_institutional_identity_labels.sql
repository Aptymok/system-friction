-- Presentation identity only. This migration does not change authority, roles,
-- module permissions, tenant membership, ROOT gates or canonical governance.

update public.profiles
set
  alias = 'Juan Antonio Marín Liera',
  module_access = coalesce(module_access, '{}'::jsonb) || jsonb_build_object(
    'display_title', 'Founder — System Friction Institute'
  ),
  updated_at = now()
where lower(email) = 'aptymok@gmail.com';

update public.profiles
set
  alias = 'Edwing Peredo Guadarrama',
  module_access = coalesce(module_access, '{}'::jsonb) || jsonb_build_object(
    'display_title', 'Director de Dominio — SFI Studio'
  ),
  updated_at = now()
where lower(email) = 'edwin.tzolkin@gmail.com';

-- Auth metadata is a UI fallback only. No authorization code may derive SFI
-- authority from raw_user_meta_data.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'name', 'Juan Antonio Marín Liera',
  'full_name', 'Juan Antonio Marín Liera',
  'display_title', 'Founder — System Friction Institute'
)
where lower(email) = 'aptymok@gmail.com';

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'name', 'Edwing Peredo Guadarrama',
  'full_name', 'Edwing Peredo Guadarrama',
  'display_title', 'Director de Dominio — SFI Studio'
)
where lower(email) = 'edwin.tzolkin@gmail.com';

update public.field_profiles as fp
set display_name = case lower(u.email)
  when 'aptymok@gmail.com' then 'Juan Antonio Marín Liera'
  when 'edwin.tzolkin@gmail.com' then 'Edwing Peredo Guadarrama'
  else fp.display_name
end
from auth.users as u
where fp.user_id = u.id
  and lower(u.email) in ('aptymok@gmail.com', 'edwin.tzolkin@gmail.com');

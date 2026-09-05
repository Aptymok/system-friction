-- SFI institutional authority reconciliation.
-- This migration does not create new sovereign authority classes in profiles.role.
-- It preserves the existing coarse role constraint and records institutional mandate in module_access.

update public.profiles
set
  role = 'root',
  subscription_tier = 'founder',
  module_access = (
    coalesce(module_access, '{}'::jsonb)
    - array[
      'experiment_id','experiment_end','experiment_role','experiment_start',
      'experiment_scopes','experiment_observer','experiment_observability'
    ]
  ) || jsonb_build_object(
    'institutional_member', true,
    'institutional_role', 'founder_root',
    'institutional_domain', 'institution',
    'display_title', 'Founder — System Friction Institute',
    'institutional_read', true,
    'institutional_write', true,
    'institutional_execute', true,
    'evidence_review', true,
    'account_provision', true,
    'account_manage', true,
    'domain_role_assign', true,
    'personal_cross_user', false,
    'canonical_promotion', true,
    'sovereign_actions', true,
    'root_execution', true,
    'full_access', true
  )
where lower(email) = 'aptymok@gmail.com';

update public.profiles
set
  alias = 'Edwing Peredo Guadarrama',
  role = 'controller',
  subscription_tier = 'enterprise',
  module_access = (
    coalesce(module_access, '{}'::jsonb)
    - array[
      'experiment_id','experiment_end','experiment_role','experiment_start',
      'experiment_scopes','experiment_observer','experiment_observability'
    ]
  ) || jsonb_build_object(
    'institutional_member', true,
    'institutional_role', 'institutional_director',
    'institutional_domain', 'institution',
    'display_title', 'Director Institucional — System Friction Institute',
    'institutional_read', true,
    'institutional_write', true,
    'institutional_execute', true,
    'evidence_review', true,
    'account_provision', true,
    'account_manage', true,
    'domain_role_assign', true,
    'personal_cross_user', false,
    'field', true,
    'studio', true,
    'observatory', true,
    'world_field', true,
    'method_lab', true,
    'governance', true,
    'library', true,
    'research_graph', true,
    'machine_interfaces', true,
    'planner', true,
    'simulator', true,
    'social', true,
    'root', true,
    'root_observe', true,
    'full_access', false,
    'executor', false,
    'root_execution', false,
    'governance_write', false,
    'sovereign_actions', false,
    'canonical_promotion', false
  )
where lower(email) = 'edwin.tzolkin@gmail.com';

insert into public.sfi_audit_events (
  actor_id, action, target_type, target_id, before_state, after_state, context
)
select
  null,
  'SFI_INSTITUTIONAL_AUTHORITY_RECONCILED',
  'migration',
  '20260905073500_reconcile_institutional_authority_roles',
  null,
  jsonb_build_object(
    'founder_role', 'founder_root',
    'director_role', 'institutional_director',
    'canon_reserved_to_founder', true,
    'personal_cross_user', false
  ),
  jsonb_build_object('source', 'repository_migration', 'authority', 'SFI-CI-008')
where not exists (
  select 1
  from public.sfi_audit_events
  where action = 'SFI_INSTITUTIONAL_AUTHORITY_RECONCILED'
    and target_id = '20260905073500_reconcile_institutional_authority_roles'
);

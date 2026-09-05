export type SfiInstitutionalRoleKey =
  | 'founder_root'
  | 'institutional_director'
  | 'domain_director'
  | 'institutional_operator'
  | 'researcher_maker'
  | 'data_steward'
  | 'observer'
  | 'external_collaborator';

export type SfiInstitutionalDomain =
  | 'institution'
  | 'field'
  | 'studio'
  | 'observatory'
  | 'world_field'
  | 'method_lab'
  | 'governance'
  | 'library'
  | 'research_graph'
  | 'machine_interfaces';

export type SfiTechnicalProfileRole = 'observer' | 'operator' | 'controller' | 'root' | 'system';
export type SfiAccountAdminAuthority = 'founder' | 'institutional_director';

export const SFI_INSTITUTIONAL_ROLE_LABELS: Record<SfiInstitutionalRoleKey, string> = {
  founder_root: 'Founder / ROOT',
  institutional_director: 'Director Institucional',
  domain_director: 'Director de Dominio',
  institutional_operator: 'Operador Institucional',
  researcher_maker: 'Investigador / Maker',
  data_steward: 'Data Steward',
  observer: 'Observador / Auditor',
  external_collaborator: 'Colaborador Externo',
};

export const SFI_INSTITUTIONAL_DOMAIN_LABELS: Record<SfiInstitutionalDomain, string> = {
  institution: 'Institución',
  field: 'Field',
  studio: 'Studio',
  observatory: 'Observatory',
  world_field: 'World Field',
  method_lab: 'Method Lab',
  governance: 'Governance',
  library: 'Library / Archive',
  research_graph: 'Research Graph',
  machine_interfaces: 'Machine Interfaces',
};

const TECHNICAL_ROLE: Record<SfiInstitutionalRoleKey, SfiTechnicalProfileRole> = {
  founder_root: 'root',
  institutional_director: 'controller',
  domain_director: 'controller',
  institutional_operator: 'operator',
  researcher_maker: 'operator',
  data_steward: 'operator',
  observer: 'observer',
  external_collaborator: 'observer',
};

const DIRECTOR_ASSIGNABLE: readonly SfiInstitutionalRoleKey[] = [
  'domain_director',
  'institutional_operator',
  'researcher_maker',
  'data_steward',
  'observer',
  'external_collaborator',
];

const FOUNDER_ASSIGNABLE: readonly SfiInstitutionalRoleKey[] = [
  'institutional_director',
  ...DIRECTOR_ASSIGNABLE,
];

export function isInstitutionalRole(value: unknown): value is SfiInstitutionalRoleKey {
  return typeof value === 'string' && value in SFI_INSTITUTIONAL_ROLE_LABELS;
}

export function isInstitutionalDomain(value: unknown): value is SfiInstitutionalDomain {
  return typeof value === 'string' && value in SFI_INSTITUTIONAL_DOMAIN_LABELS;
}

export function assignableInstitutionalRoles(authority: SfiAccountAdminAuthority) {
  return authority === 'founder' ? FOUNDER_ASSIGNABLE : DIRECTOR_ASSIGNABLE;
}

export function canAssignInstitutionalRole(
  authority: SfiAccountAdminAuthority,
  role: SfiInstitutionalRoleKey,
) {
  return assignableInstitutionalRoles(authority).includes(role);
}

export function technicalRoleForInstitutionalRole(role: SfiInstitutionalRoleKey) {
  return TECHNICAL_ROLE[role];
}

export function institutionalTitle(role: SfiInstitutionalRoleKey, domain: SfiInstitutionalDomain) {
  if (role === 'founder_root') return 'Founder — System Friction Institute';
  if (role === 'institutional_director') return 'Director Institucional — System Friction Institute';
  if (role === 'domain_director') return `Director de Dominio — SFI ${SFI_INSTITUTIONAL_DOMAIN_LABELS[domain]}`;
  return `${SFI_INSTITUTIONAL_ROLE_LABELS[role]} — SFI ${SFI_INSTITUTIONAL_DOMAIN_LABELS[domain]}`;
}

function domainFlags(domain: SfiInstitutionalDomain) {
  return {
    field: domain === 'institution' || domain === 'field',
    studio: domain === 'institution' || domain === 'studio',
    observatory: domain === 'institution' || domain === 'observatory',
    world_field: domain === 'institution' || domain === 'world_field',
    method_lab: domain === 'institution' || domain === 'method_lab',
    governance: domain === 'institution' || domain === 'governance',
    library: domain === 'institution' || domain === 'library',
    research_graph: domain === 'institution' || domain === 'research_graph',
    machine_interfaces: domain === 'institution' || domain === 'machine_interfaces',
  };
}

export function institutionalModuleAccessForRole(
  role: SfiInstitutionalRoleKey,
  domain: SfiInstitutionalDomain,
  current?: Record<string, unknown>,
) {
  const director = role === 'institutional_director';
  const founder = role === 'founder_root';
  const flags = domainFlags(founder || director ? 'institution' : domain);
  const write = founder || director || role === 'domain_director' || role === 'institutional_operator' || role === 'researcher_maker' || role === 'data_steward';
  const execute = founder || director || role === 'domain_director' || role === 'institutional_operator';
  const evidenceReview = founder || director || role === 'domain_director' || role === 'data_steward';

  const next: Record<string, unknown> = {
    ...(current ?? {}),
    institutional_member: true,
    institutional_role: role,
    institutional_domain: founder || director ? 'institution' : domain,
    display_title: institutionalTitle(role, founder || director ? 'institution' : domain),
    institutional_read: true,
    institutional_write: write,
    institutional_execute: execute,
    evidence_review: evidenceReview,
    account_provision: founder || director,
    account_manage: founder || director,
    domain_role_assign: founder || director,
    personal_cross_user: false,
    ...flags,
    planner: flags.field,
    simulator: flags.studio,
    social: flags.world_field,
    root: founder || director,
    root_observe: founder || director,
    full_access: founder,
    executor: false,
    root_execution: founder,
    governance_write: founder,
    sovereign_actions: founder,
    canonical_promotion: founder,
  };

  // Experimental delegation metadata must never survive promotion to a durable role.
  for (const key of [
    'experiment_id',
    'experiment_end',
    'experiment_role',
    'experiment_start',
    'experiment_scopes',
    'experiment_observer',
    'experiment_observability',
  ]) delete next[key];

  // No non-Founder role may inherit sovereign authority from older profile state.
  if (!founder) {
    next.full_access = false;
    next.root_execution = false;
    next.governance_write = false;
    next.sovereign_actions = false;
    next.canonical_promotion = false;
    next.personal_cross_user = false;
  }

  return next;
}

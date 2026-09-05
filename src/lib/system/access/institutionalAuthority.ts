import type { SfiAuthorityClass } from '../../sfi/cognitive-runtime/cognitivePassportRegistry';

export const SFI_INSTITUTIONAL_AUTHORITY_CONTRACT = 'SFI-INSTITUTIONAL-AUTHORITY-1.0' as const;

export type SfiInstitutionalRoleKey =
  | 'founder_root'
  | 'institutional_director'
  | 'domain_director';

export type SfiInstitutionalDomainId =
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

export type SfiProtectedAuthoritySurface =
  | 'ROOT'
  | 'ROOT_OBSERVATION'
  | 'CANON'
  | 'SOVEREIGN_ACTIONS'
  | 'PERSONAL_CROSS_USER'
  | 'FOUNDER_PRIVATE_COGNITIVE_TWIN'
  | 'FOUNDER_PRIVATE_AMV'
  | 'CONSTITUTIONAL_SUCCESSION';

export type SfiRoleScopeMode = 'INSTITUTIONAL' | 'MANDATED_DOMAIN';
export type SfiAppointmentPolicy = 'CONSTITUTIONAL_ONLY' | 'SOVEREIGN_RESOLUTION_ONLY' | 'GOVERNED_RESOLUTION';
export type SfiAccountAdministrationCeiling = 'NONE' | 'SUBORDINATE_INSTITUTIONAL_ACCOUNTS';

export type SfiInstitutionalRoleDefinition = {
  contract: typeof SFI_INSTITUTIONAL_AUTHORITY_CONTRACT;
  roleId: SfiInstitutionalRoleKey;
  label: string;
  purpose: string;
  authorityCeiling: SfiAuthorityClass;
  scopeMode: SfiRoleScopeMode;
  appointmentRequired: boolean;
  appointmentPolicy: SfiAppointmentPolicy;
  accountAdministrationCeiling: SfiAccountAdministrationCeiling;
  forbiddenInheritedSurfaces: readonly SfiProtectedAuthoritySurface[];
};

const NON_SOVEREIGN_SURFACES: readonly SfiProtectedAuthoritySurface[] = [
  'ROOT',
  'ROOT_OBSERVATION',
  'CANON',
  'SOVEREIGN_ACTIONS',
  'PERSONAL_CROSS_USER',
  'FOUNDER_PRIVATE_COGNITIVE_TWIN',
  'FOUNDER_PRIVATE_AMV',
  'CONSTITUTIONAL_SUCCESSION',
] as const;

export const SFI_INSTITUTIONAL_ROLE_DEFINITIONS: Readonly<Record<SfiInstitutionalRoleKey, SfiInstitutionalRoleDefinition>> = {
  founder_root: {
    contract: SFI_INSTITUTIONAL_AUTHORITY_CONTRACT,
    roleId: 'founder_root',
    label: 'Founder / ROOT',
    purpose: 'Preserve the existing constitutional Founder / ROOT authority boundary without creating a generic succession path.',
    authorityCeiling: 'CANON',
    scopeMode: 'INSTITUTIONAL',
    appointmentRequired: false,
    appointmentPolicy: 'CONSTITUTIONAL_ONLY',
    accountAdministrationCeiling: 'SUBORDINATE_INSTITUTIONAL_ACCOUNTS',
    forbiddenInheritedSurfaces: [],
  },
  institutional_director: {
    contract: SFI_INSTITUTIONAL_AUTHORITY_CONTRACT,
    roleId: 'institutional_director',
    label: 'Institutional Director',
    purpose: 'Operate within a governed institutional mandate while remaining strictly below Founder / ROOT and CANON sovereignty.',
    authorityCeiling: 'EXECUTE_EXTERNAL',
    scopeMode: 'INSTITUTIONAL',
    appointmentRequired: true,
    appointmentPolicy: 'SOVEREIGN_RESOLUTION_ONLY',
    accountAdministrationCeiling: 'SUBORDINATE_INSTITUTIONAL_ACCOUNTS',
    forbiddenInheritedSurfaces: NON_SOVEREIGN_SURFACES,
  },
  domain_director: {
    contract: SFI_INSTITUTIONAL_AUTHORITY_CONTRACT,
    roleId: 'domain_director',
    label: 'Domain Director',
    purpose: 'Operate only within the domain, mandate and authority ceiling of an explicit appointment.',
    authorityCeiling: 'EXECUTE_REVERSIBLE',
    scopeMode: 'MANDATED_DOMAIN',
    appointmentRequired: true,
    appointmentPolicy: 'GOVERNED_RESOLUTION',
    accountAdministrationCeiling: 'NONE',
    forbiddenInheritedSurfaces: NON_SOVEREIGN_SURFACES,
  },
} as const;

export type SfiAppointmentLifecycleState =
  | 'VACANT'
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'REVOKED';

export type SfiInstitutionalOffice = {
  roleId: SfiInstitutionalRoleKey;
  state: Extract<SfiAppointmentLifecycleState, 'VACANT' | 'PENDING'>;
  incumbentAppointmentId: null;
  appointmentDisposition: 'UNASSIGNED' | 'PENDING_SOVEREIGN_APPOINTMENT';
};

export const SFI_INSTITUTIONAL_DIRECTOR_OFFICE: Readonly<SfiInstitutionalOffice> = {
  roleId: 'institutional_director',
  state: 'VACANT',
  incumbentAppointmentId: null,
  appointmentDisposition: 'PENDING_SOVEREIGN_APPOINTMENT',
} as const;

const AUTHORITY_ORDER: Readonly<Record<SfiAuthorityClass, number>> = {
  READ: 0,
  RECOMMEND: 1,
  WRITE_INTERNAL: 2,
  EXECUTE_REVERSIBLE: 3,
  EXECUTE_EXTERNAL: 4,
  IRREVERSIBLE: 5,
  CANON: 6,
} as const;

export function authorityAtOrBelow(value: SfiAuthorityClass, ceiling: SfiAuthorityClass) {
  return AUTHORITY_ORDER[value] <= AUTHORITY_ORDER[ceiling];
}

export function roleDefinition(roleId: SfiInstitutionalRoleKey) {
  return SFI_INSTITUTIONAL_ROLE_DEFINITIONS[roleId];
}

export function roleDefinitionContainsPersonIdentity(definition: SfiInstitutionalRoleDefinition) {
  const keys = Object.keys(definition).map((key) => key.toLowerCase());
  return keys.some((key) =>
    key.includes('person') ||
    key.includes('principal') ||
    key.includes('email') ||
    key.includes('user_id') ||
    key.includes('userid') ||
    key.includes('incumbent'),
  );
}

export function roleForbidsSurface(roleId: SfiInstitutionalRoleKey, surface: SfiProtectedAuthoritySurface) {
  return roleDefinition(roleId).forbiddenInheritedSurfaces.includes(surface);
}

export function canGenericAccountAdministrationCreateAppointment(_roleId: SfiInstitutionalRoleKey) {
  return false;
}

export function canGenericAccountAdministrationAlterFounder() {
  return false;
}

export function canGenericAccountAdministrationPerformConstitutionalSuccession() {
  return false;
}

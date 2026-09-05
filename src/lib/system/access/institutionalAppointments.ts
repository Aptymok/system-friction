import type { SfiAuthorityClass } from '../../sfi/cognitive-runtime/cognitivePassportRegistry';
import {
  authorityAtOrBelow,
  roleDefinition,
  roleForbidsSurface,
  type SfiAppointmentLifecycleState,
  type SfiInstitutionalDomainId,
  type SfiInstitutionalRoleKey,
  type SfiProtectedAuthoritySurface,
} from './institutionalAuthority';

export const SFI_INSTITUTIONAL_APPOINTMENT_CONTRACT = 'SFI-INSTITUTIONAL-APPOINTMENT-1.0' as const;

export type SfiAppointmentState = Exclude<SfiAppointmentLifecycleState, 'VACANT'>;
export type SfiAppointmentPrincipalKind = 'HUMAN' | 'EXTERNAL_GPT' | 'SERVICE_ACCOUNT' | 'ACCOUNT';

export type SfiInstitutionalMandate = {
  mandateId: string;
  domainId: SfiInstitutionalDomainId;
  scope: readonly string[];
  authorityCeiling: SfiAuthorityClass;
};

export type SfiInstitutionalAppointment = {
  contract: typeof SFI_INSTITUTIONAL_APPOINTMENT_CONTRACT;
  appointmentId: string;
  principal: {
    principalId: string;
    kind: SfiAppointmentPrincipalKind;
  };
  roleId: SfiInstitutionalRoleKey;
  state: SfiAppointmentState;
  mandate: SfiInstitutionalMandate;
  authorityCeiling: SfiAuthorityClass;
  appointingAuthority: {
    kind: 'SOVEREIGN_RESOLUTION' | 'GOVERNED_INSTITUTIONAL_AUTHORITY';
    authorityRef: string;
  };
  effectiveAt: string;
  reviewAt: string;
  expiresAt: string | null;
  provenance: {
    resolutionId: string;
    sourceRef: string;
    recordedAt: string;
  };
  returnRequirement: {
    required: true;
    reviewAt: string;
    observationContract: string;
  };
};

export type SfiAppointmentValidation = {
  valid: boolean;
  errors: string[];
};

function nonBlank(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateInstitutionalAppointment(appointment: SfiInstitutionalAppointment): SfiAppointmentValidation {
  const errors: string[] = [];
  const definition = roleDefinition(appointment.roleId);

  if (appointment.contract !== SFI_INSTITUTIONAL_APPOINTMENT_CONTRACT) errors.push('INVALID_CONTRACT');
  if (!nonBlank(appointment.appointmentId)) errors.push('MISSING_APPOINTMENT_ID');
  if (!nonBlank(appointment.principal.principalId)) errors.push('MISSING_PRINCIPAL_ID');
  if (appointment.principal.kind !== 'HUMAN') errors.push('HUMAN_PRINCIPAL_REQUIRED');
  if (appointment.roleId === 'founder_root') errors.push('FOUNDER_GENERIC_APPOINTMENT_FORBIDDEN');
  if (!nonBlank(appointment.mandate.mandateId)) errors.push('MISSING_MANDATE_ID');
  if (appointment.mandate.scope.length === 0 || appointment.mandate.scope.some((item) => !nonBlank(item))) {
    errors.push('MANDATE_SCOPE_REQUIRED');
  }
  if (!authorityAtOrBelow(appointment.authorityCeiling, definition.authorityCeiling)) {
    errors.push('APPOINTMENT_CEILING_EXCEEDS_ROLE');
  }
  if (!authorityAtOrBelow(appointment.mandate.authorityCeiling, appointment.authorityCeiling)) {
    errors.push('MANDATE_CEILING_EXCEEDS_APPOINTMENT');
  }

  if (appointment.roleId === 'institutional_director') {
    if (appointment.appointingAuthority.kind !== 'SOVEREIGN_RESOLUTION') {
      errors.push('INSTITUTIONAL_DIRECTOR_REQUIRES_SOVEREIGN_RESOLUTION');
    }
    if (appointment.mandate.domainId !== 'institution') {
      errors.push('INSTITUTIONAL_DIRECTOR_REQUIRES_INSTITUTIONAL_MANDATE');
    }
  }

  if (appointment.roleId === 'domain_director' && appointment.mandate.domainId === 'institution') {
    errors.push('DOMAIN_DIRECTOR_REQUIRES_BOUNDED_DOMAIN');
  }

  if (!nonBlank(appointment.appointingAuthority.authorityRef)) errors.push('MISSING_APPOINTING_AUTHORITY');
  if (!nonBlank(appointment.provenance.resolutionId)) errors.push('MISSING_PROVENANCE_RESOLUTION');
  if (!nonBlank(appointment.provenance.sourceRef)) errors.push('MISSING_PROVENANCE_SOURCE');
  if (!nonBlank(appointment.provenance.recordedAt)) errors.push('MISSING_PROVENANCE_RECORDED_AT');
  if (!appointment.returnRequirement.required) errors.push('RETURN_REQUIRED');
  if (!nonBlank(appointment.returnRequirement.observationContract)) errors.push('RETURN_OBSERVATION_CONTRACT_REQUIRED');
  if (appointment.returnRequirement.reviewAt !== appointment.reviewAt) errors.push('RETURN_REVIEW_DATE_MISMATCH');

  const effectiveAt = timestamp(appointment.effectiveAt);
  const reviewAt = timestamp(appointment.reviewAt);
  const recordedAt = timestamp(appointment.provenance.recordedAt);
  const expiresAt = appointment.expiresAt ? timestamp(appointment.expiresAt) : null;

  if (effectiveAt === null) errors.push('INVALID_EFFECTIVE_DATE');
  if (reviewAt === null) errors.push('INVALID_REVIEW_DATE');
  if (recordedAt === null) errors.push('INVALID_PROVENANCE_DATE');
  if (appointment.expiresAt && expiresAt === null) errors.push('INVALID_EXPIRY_DATE');
  if (effectiveAt !== null && reviewAt !== null && reviewAt <= effectiveAt) errors.push('REVIEW_MUST_FOLLOW_EFFECTIVE_DATE');
  if (effectiveAt !== null && expiresAt !== null && expiresAt <= effectiveAt) errors.push('EXPIRY_MUST_FOLLOW_EFFECTIVE_DATE');

  return { valid: errors.length === 0, errors };
}

export type SfiInstitutionalAuthorityDenial =
  | 'MISSING_APPOINTMENT'
  | 'INVALID_APPOINTMENT'
  | 'PRINCIPAL_MISMATCH'
  | 'NON_HUMAN_PRINCIPAL'
  | 'APPOINTMENT_NOT_ACTIVE'
  | 'APPOINTMENT_NOT_EFFECTIVE'
  | 'APPOINTMENT_EXPIRED'
  | 'REVIEW_DUE'
  | 'SURFACE_CLASSIFICATION_FAILED'
  | 'SURFACE_SCOPE_MISMATCH'
  | 'PROTECTED_SURFACE_FORBIDDEN'
  | 'ACCOUNT_ADMINISTRATION_FORBIDDEN'
  | 'DOMAIN_OUTSIDE_MANDATE'
  | 'SCOPE_OUTSIDE_MANDATE'
  | 'AUTHORITY_EXCEEDS_ROLE_CEILING'
  | 'AUTHORITY_EXCEEDS_APPOINTMENT_CEILING'
  | 'AUTHORITY_EXCEEDS_MANDATE_CEILING';

export type SfiInstitutionalAuthorityDecision =
  | {
      authorized: true;
      roleId: SfiInstitutionalRoleKey;
      appointmentId: string;
      mandateId: string;
      authorityCeiling: SfiAuthorityClass;
    }
  | {
      authorized: false;
      reason: SfiInstitutionalAuthorityDenial;
      validationErrors?: readonly string[];
    };

export type SfiInstitutionalAuthorityRequest = {
  principalId: string;
  principalKind: SfiAppointmentPrincipalKind;
  appointment: SfiInstitutionalAppointment | null;
  requestedAuthority: SfiAuthorityClass;
  requestedDomain: SfiInstitutionalDomainId;
  requestedScope: string;
  targetSurface?: 'INSTITUTIONAL' | SfiProtectedAuthoritySurface;
  now: string;
};

type SfiAuthoritativeSurface = 'INSTITUTIONAL' | SfiProtectedAuthoritySurface;
type SfiRequestedAccountAdministration = 'NONE' | 'SUBORDINATE_INSTITUTIONAL_ACCOUNTS';

type SfiScopeClassification =
  | {
      valid: true;
      surface: SfiAuthoritativeSurface;
      accountAdministration: SfiRequestedAccountAdministration;
    }
  | { valid: false };

function classifyRequestedScope(
  requestedScope: string,
  requestedDomain: SfiInstitutionalDomainId,
): SfiScopeClassification {
  const scope = requestedScope.trim();
  if (!scope) return { valid: false };

  if (scope === 'root:observe') {
    return { valid: true, surface: 'ROOT_OBSERVATION', accountAdministration: 'NONE' };
  }
  if (scope.startsWith('root:')) {
    return { valid: true, surface: 'ROOT', accountAdministration: 'NONE' };
  }
  if (scope.startsWith('canon:')) {
    return { valid: true, surface: 'CANON', accountAdministration: 'NONE' };
  }
  if (scope.startsWith('sovereign:')) {
    return { valid: true, surface: 'SOVEREIGN_ACTIONS', accountAdministration: 'NONE' };
  }
  if (scope === 'personal:cross-user' || scope.startsWith('personal:cross-user:')) {
    return { valid: true, surface: 'PERSONAL_CROSS_USER', accountAdministration: 'NONE' };
  }
  if (scope === 'founder:private-cognitive-twin' || scope.startsWith('founder:private-cognitive-twin:')) {
    return { valid: true, surface: 'FOUNDER_PRIVATE_COGNITIVE_TWIN', accountAdministration: 'NONE' };
  }
  if (scope === 'founder:private-amv' || scope.startsWith('founder:private-amv:')) {
    return { valid: true, surface: 'FOUNDER_PRIVATE_AMV', accountAdministration: 'NONE' };
  }
  if (scope === 'constitutional:succession' || scope.startsWith('constitutional:succession:')) {
    return { valid: true, surface: 'CONSTITUTIONAL_SUCCESSION', accountAdministration: 'NONE' };
  }
  if (scope === 'accounts:subordinate-admin') {
    return {
      valid: true,
      surface: 'INSTITUTIONAL',
      accountAdministration: 'SUBORDINATE_INSTITUTIONAL_ACCOUNTS',
    };
  }
  if (scope.startsWith('accounts:')) {
    return { valid: false };
  }

  if (scope.startsWith(`${requestedDomain}:`)) {
    return { valid: true, surface: 'INSTITUTIONAL', accountAdministration: 'NONE' };
  }

  return { valid: false };
}

export function resolveInstitutionalAuthority(request: SfiInstitutionalAuthorityRequest): SfiInstitutionalAuthorityDecision {
  if (!request.appointment) return { authorized: false, reason: 'MISSING_APPOINTMENT' };

  const appointment = request.appointment;
  const validation = validateInstitutionalAppointment(appointment);
  if (!validation.valid) {
    return { authorized: false, reason: 'INVALID_APPOINTMENT', validationErrors: validation.errors };
  }

  if (request.principalKind !== 'HUMAN' || appointment.principal.kind !== 'HUMAN') {
    return { authorized: false, reason: 'NON_HUMAN_PRINCIPAL' };
  }
  if (appointment.principal.principalId !== request.principalId) {
    return { authorized: false, reason: 'PRINCIPAL_MISMATCH' };
  }
  if (appointment.state !== 'ACTIVE') {
    return { authorized: false, reason: 'APPOINTMENT_NOT_ACTIVE' };
  }

  const now = timestamp(request.now);
  const effectiveAt = timestamp(appointment.effectiveAt);
  const reviewAt = timestamp(appointment.reviewAt);
  const expiresAt = appointment.expiresAt ? timestamp(appointment.expiresAt) : null;
  if (now === null || effectiveAt === null || reviewAt === null) {
    return { authorized: false, reason: 'INVALID_APPOINTMENT', validationErrors: ['INVALID_RUNTIME_DATE'] };
  }
  if (now < effectiveAt) return { authorized: false, reason: 'APPOINTMENT_NOT_EFFECTIVE' };
  if (expiresAt !== null && now >= expiresAt) return { authorized: false, reason: 'APPOINTMENT_EXPIRED' };
  if (now >= reviewAt) return { authorized: false, reason: 'REVIEW_DUE' };

  const definition = roleDefinition(appointment.roleId);
  const classification = classifyRequestedScope(request.requestedScope, request.requestedDomain);
  if (!classification.valid) {
    return { authorized: false, reason: 'SURFACE_CLASSIFICATION_FAILED' };
  }
  if (request.targetSurface !== undefined && request.targetSurface !== classification.surface) {
    return { authorized: false, reason: 'SURFACE_SCOPE_MISMATCH' };
  }
  if (classification.surface !== 'INSTITUTIONAL' && roleForbidsSurface(appointment.roleId, classification.surface)) {
    return { authorized: false, reason: 'PROTECTED_SURFACE_FORBIDDEN' };
  }
  if (
    classification.accountAdministration !== 'NONE' &&
    definition.accountAdministrationCeiling !== classification.accountAdministration
  ) {
    return { authorized: false, reason: 'ACCOUNT_ADMINISTRATION_FORBIDDEN' };
  }

  if (definition.scopeMode === 'MANDATED_DOMAIN' && request.requestedDomain !== appointment.mandate.domainId) {
    return { authorized: false, reason: 'DOMAIN_OUTSIDE_MANDATE' };
  }
  if (definition.scopeMode === 'INSTITUTIONAL' && appointment.mandate.domainId !== 'institution') {
    return { authorized: false, reason: 'DOMAIN_OUTSIDE_MANDATE' };
  }
  if (!appointment.mandate.scope.includes(request.requestedScope)) {
    return { authorized: false, reason: 'SCOPE_OUTSIDE_MANDATE' };
  }

  if (!authorityAtOrBelow(request.requestedAuthority, definition.authorityCeiling)) {
    return { authorized: false, reason: 'AUTHORITY_EXCEEDS_ROLE_CEILING' };
  }
  if (!authorityAtOrBelow(request.requestedAuthority, appointment.authorityCeiling)) {
    return { authorized: false, reason: 'AUTHORITY_EXCEEDS_APPOINTMENT_CEILING' };
  }
  if (!authorityAtOrBelow(request.requestedAuthority, appointment.mandate.authorityCeiling)) {
    return { authorized: false, reason: 'AUTHORITY_EXCEEDS_MANDATE_CEILING' };
  }

  return {
    authorized: true,
    roleId: appointment.roleId,
    appointmentId: appointment.appointmentId,
    mandateId: appointment.mandate.mandateId,
    authorityCeiling: appointment.mandate.authorityCeiling,
  };
}

export function appointmentLineageReceipt(appointment: SfiInstitutionalAppointment) {
  return {
    contract: appointment.contract,
    appointmentId: appointment.appointmentId,
    principalId: appointment.principal.principalId,
    roleId: appointment.roleId,
    state: appointment.state,
    mandateId: appointment.mandate.mandateId,
    mandateDomain: appointment.mandate.domainId,
    appointmentAuthorityCeiling: appointment.authorityCeiling,
    mandateAuthorityCeiling: appointment.mandate.authorityCeiling,
    appointingAuthority: appointment.appointingAuthority,
    effectiveAt: appointment.effectiveAt,
    reviewAt: appointment.reviewAt,
    expiresAt: appointment.expiresAt,
    provenance: appointment.provenance,
    returnRequirement: appointment.returnRequirement,
  } as const;
}

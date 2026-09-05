import assert from 'node:assert/strict';
import test from 'node:test';
import { findInstitutionalMember } from './institutionalMembers';
import {
  SFI_INSTITUTIONAL_DIRECTOR_OFFICE,
  SFI_INSTITUTIONAL_ROLE_DEFINITIONS,
  canGenericAccountAdministrationAlterFounder,
  canGenericAccountAdministrationCreateAppointment,
  canGenericAccountAdministrationPerformConstitutionalSuccession,
  roleDefinitionContainsPersonIdentity,
  roleForbidsSurface,
} from './institutionalAuthority';
import {
  SFI_INSTITUTIONAL_APPOINTMENT_CONTRACT,
  appointmentLineageReceipt,
  resolveInstitutionalAuthority,
  validateInstitutionalAppointment,
  type SfiInstitutionalAppointment,
} from './institutionalAppointments';

const NOW = '2026-09-05T12:30:00.000Z';

function domainDirectorAppointment(state: SfiInstitutionalAppointment['state'] = 'ACTIVE'): SfiInstitutionalAppointment {
  return {
    contract: SFI_INSTITUTIONAL_APPOINTMENT_CONTRACT,
    appointmentId: 'qa-appointment-domain-director',
    principal: { principalId: 'qa-human-principal', kind: 'HUMAN' },
    roleId: 'domain_director',
    state,
    mandate: {
      mandateId: 'qa-mandate-studio',
      domainId: 'studio',
      scope: ['studio:read', 'studio:content', 'studio:run'],
      authorityCeiling: 'EXECUTE_REVERSIBLE',
    },
    authorityCeiling: 'EXECUTE_REVERSIBLE',
    appointingAuthority: {
      kind: 'GOVERNED_INSTITUTIONAL_AUTHORITY',
      authorityRef: 'qa-governed-resolution',
    },
    effectiveAt: '2026-09-01T00:00:00.000Z',
    reviewAt: '2026-12-01T00:00:00.000Z',
    expiresAt: null,
    provenance: {
      resolutionId: 'qa-resolution-domain-director',
      sourceRef: 'qa://institutional-authority/domain-director',
      recordedAt: '2026-09-01T00:00:00.000Z',
    },
    returnRequirement: {
      required: true,
      reviewAt: '2026-12-01T00:00:00.000Z',
      observationContract: 'RESOLUTION -> APPOINTMENT -> AUTHORIZED ACTIONS -> OBSERVED ACTIVITY -> RETURN -> REVIEW',
    },
  };
}

function institutionalDirectorAppointment(): SfiInstitutionalAppointment {
  return {
    contract: SFI_INSTITUTIONAL_APPOINTMENT_CONTRACT,
    appointmentId: 'qa-appointment-institutional-director',
    principal: { principalId: 'qa-human-principal', kind: 'HUMAN' },
    roleId: 'institutional_director',
    state: 'ACTIVE',
    mandate: {
      mandateId: 'qa-mandate-institution',
      domainId: 'institution',
      scope: ['institution:operate', 'accounts:subordinate-admin'],
      authorityCeiling: 'EXECUTE_EXTERNAL',
    },
    authorityCeiling: 'EXECUTE_EXTERNAL',
    appointingAuthority: {
      kind: 'SOVEREIGN_RESOLUTION',
      authorityRef: 'qa-sovereign-resolution',
    },
    effectiveAt: '2026-09-01T00:00:00.000Z',
    reviewAt: '2026-12-01T00:00:00.000Z',
    expiresAt: null,
    provenance: {
      resolutionId: 'qa-resolution-institutional-director',
      sourceRef: 'qa://institutional-authority/institutional-director',
      recordedAt: '2026-09-01T00:00:00.000Z',
    },
    returnRequirement: {
      required: true,
      reviewAt: '2026-12-01T00:00:00.000Z',
      observationContract: 'RESOLUTION -> APPOINTMENT -> AUTHORIZED ACTIONS -> OBSERVED ACTIVITY -> RETURN -> REVIEW',
    },
  };
}

function request(
  appointment: SfiInstitutionalAppointment | null,
  overrides: Partial<Parameters<typeof resolveInstitutionalAuthority>[0]> = {},
) {
  return resolveInstitutionalAuthority({
    principalId: 'qa-human-principal',
    principalKind: 'HUMAN',
    appointment,
    requestedAuthority: 'READ',
    requestedDomain: appointment?.roleId === 'domain_director' ? 'studio' : 'institution',
    requestedScope: appointment?.roleId === 'domain_director' ? 'studio:read' : 'institution:operate',
    targetSurface: 'INSTITUTIONAL',
    now: NOW,
    ...overrides,
  });
}

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / role definition exists without person or appointment', () => {
  for (const definition of Object.values(SFI_INSTITUTIONAL_ROLE_DEFINITIONS)) {
    assert.equal(roleDefinitionContainsPersonIdentity(definition), false);
  }
  assert.equal(SFI_INSTITUTIONAL_ROLE_DEFINITIONS.institutional_director.roleId, 'institutional_director');
  assert.equal(request(null).authorized, false);
  assert.deepEqual(request(null), { authorized: false, reason: 'MISSING_APPOINTMENT' });
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / Institutional Director is canonically vacant', () => {
  assert.deepEqual(SFI_INSTITUTIONAL_DIRECTOR_OFFICE, {
    roleId: 'institutional_director',
    state: 'VACANT',
    incumbentAppointmentId: null,
    appointmentDisposition: 'PENDING_SOVEREIGN_APPOINTMENT',
  });
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / Edwing remains Domain Director — SFI Studio and is not Institutional Director', () => {
  const member = findInstitutionalMember('edwin.tzolkin@gmail.com');
  assert.ok(member);
  assert.equal(member.displayName, 'Edwing Peredo Guadarrama');
  assert.equal(member.title, 'Director de Dominio — SFI Studio');
  assert.notEqual(member.title, 'Director Institucional — System Friction Institute');
  assert.equal(SFI_INSTITUTIONAL_DIRECTOR_OFFICE.incumbentAppointmentId, null);
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / Domain Director cannot inherit institution-wide authority', () => {
  const appointment = domainDirectorAppointment();
  assert.equal(request(appointment).authorized, true);
  assert.deepEqual(
    request(appointment, { requestedDomain: 'institution', requestedScope: 'studio:read' }),
    { authorized: false, reason: 'DOMAIN_OUTSIDE_MANDATE' },
  );
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / Institutional Director cannot inherit ROOT, CANON, sovereignty, or PERSONAL cross-user', () => {
  const appointment = institutionalDirectorAppointment();
  for (const surface of ['ROOT', 'ROOT_OBSERVATION', 'SOVEREIGN_ACTIONS', 'PERSONAL_CROSS_USER'] as const) {
    assert.equal(roleForbidsSurface('institutional_director', surface), true);
    assert.deepEqual(
      request(appointment, { targetSurface: surface }),
      { authorized: false, reason: 'PROTECTED_SURFACE_FORBIDDEN' },
    );
  }
  assert.equal(roleForbidsSurface('institutional_director', 'CANON'), true);
  assert.deepEqual(
    request(appointment, { requestedAuthority: 'CANON' }),
    { authorized: false, reason: 'AUTHORITY_EXCEEDS_ROLE_CEILING' },
  );
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / role, account, and authentication facts cannot create appointment', () => {
  assert.equal(canGenericAccountAdministrationCreateAppointment('institutional_director'), false);
  assert.equal(canGenericAccountAdministrationCreateAppointment('domain_director'), false);
  assert.deepEqual(request(null), { authorized: false, reason: 'MISSING_APPOINTMENT' });
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / inactive, revoked, expired, and review-due appointments fail closed', () => {
  for (const state of ['PENDING', 'SUSPENDED', 'EXPIRED', 'REVOKED'] as const) {
    assert.deepEqual(request(domainDirectorAppointment(state)), { authorized: false, reason: 'APPOINTMENT_NOT_ACTIVE' });
  }

  const timeExpired = { ...domainDirectorAppointment(), expiresAt: '2026-09-05T12:00:00.000Z' };
  assert.deepEqual(request(timeExpired), { authorized: false, reason: 'APPOINTMENT_EXPIRED' });

  const reviewDue = {
    ...domainDirectorAppointment(),
    reviewAt: '2026-09-05T12:00:00.000Z',
    returnRequirement: {
      ...domainDirectorAppointment().returnRequirement,
      reviewAt: '2026-09-05T12:00:00.000Z',
    },
  };
  assert.deepEqual(request(reviewDue), { authorized: false, reason: 'REVIEW_DUE' });
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / appointment and mandate cannot exceed role or appointment ceilings', () => {
  const exceedsRole = { ...domainDirectorAppointment(), authorityCeiling: 'EXECUTE_EXTERNAL' as const };
  assert.ok(validateInstitutionalAppointment(exceedsRole).errors.includes('APPOINTMENT_CEILING_EXCEEDS_ROLE'));

  const base = domainDirectorAppointment();
  const exceedsAppointment: SfiInstitutionalAppointment = {
    ...base,
    authorityCeiling: 'READ',
    mandate: { ...base.mandate, authorityCeiling: 'WRITE_INTERNAL' },
  };
  assert.ok(validateInstitutionalAppointment(exceedsAppointment).errors.includes('MANDATE_CEILING_EXCEEDS_APPOINTMENT'));

  assert.deepEqual(
    request(domainDirectorAppointment(), { requestedAuthority: 'EXECUTE_EXTERNAL', requestedScope: 'studio:run' }),
    { authorized: false, reason: 'AUTHORITY_EXCEEDS_ROLE_CEILING' },
  );
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / generic Founder account administration is not constitutional succession', () => {
  assert.equal(canGenericAccountAdministrationAlterFounder(), false);
  assert.equal(canGenericAccountAdministrationPerformConstitutionalSuccession(), false);
  assert.equal(canGenericAccountAdministrationCreateAppointment('founder_root'), false);
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / external GPT cannot inherit a human appointment', () => {
  const appointment = domainDirectorAppointment();
  assert.deepEqual(
    request(appointment, { principalKind: 'EXTERNAL_GPT' }),
    { authorized: false, reason: 'NON_HUMAN_PRINCIPAL' },
  );

  const externalAppointment: SfiInstitutionalAppointment = {
    ...appointment,
    principal: { principalId: 'qa-external-gpt', kind: 'EXTERNAL_GPT' },
  };
  assert.ok(validateInstitutionalAppointment(externalAppointment).errors.includes('HUMAN_PRINCIPAL_REQUIRED'));
});

test('SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0 / provenance and RETURN lineage remain explicit', () => {
  const appointment = domainDirectorAppointment();
  const validation = validateInstitutionalAppointment(appointment);
  assert.equal(validation.valid, true);
  const receipt = appointmentLineageReceipt(appointment);
  assert.equal(receipt.provenance.resolutionId, appointment.provenance.resolutionId);
  assert.equal(receipt.provenance.sourceRef, appointment.provenance.sourceRef);
  assert.equal(receipt.returnRequirement.required, true);
  assert.equal(receipt.reviewAt, receipt.returnRequirement.reviewAt);
});

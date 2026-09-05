import assert from 'node:assert/strict';
import test from 'node:test';
import { findInstitutionalMember } from './institutionalMembers';
import {
  SFI_INSTITUTIONAL_DIRECTOR_OFFICE,
  SFI_INSTITUTIONAL_ROLE_DEFINITIONS,
  canGenericAccountAdministrationCreateAppointment,
  roleDefinitionContainsPersonIdentity,
} from './institutionalAuthority';
import {
  SFI_INSTITUTIONAL_APPOINTMENT_CONTRACT,
  resolveInstitutionalAuthority,
  validateInstitutionalAppointment,
  type SfiInstitutionalAppointment,
} from './institutionalAppointments';

function validAppointment(): SfiInstitutionalAppointment {
  return {
    contract: SFI_INSTITUTIONAL_APPOINTMENT_CONTRACT,
    appointmentId: 'qa-separation-appointment',
    principal: { principalId: 'qa-separation-human', kind: 'HUMAN' },
    roleId: 'domain_director',
    state: 'ACTIVE',
    mandate: {
      mandateId: 'qa-separation-mandate',
      domainId: 'studio',
      scope: ['studio:read'],
      authorityCeiling: 'READ',
    },
    authorityCeiling: 'READ',
    appointingAuthority: {
      kind: 'GOVERNED_INSTITUTIONAL_AUTHORITY',
      authorityRef: 'qa-separation-resolution',
    },
    effectiveAt: '2026-09-01T00:00:00.000Z',
    reviewAt: '2026-12-01T00:00:00.000Z',
    expiresAt: null,
    provenance: {
      resolutionId: 'qa-separation-resolution',
      sourceRef: 'qa://appointment-separation',
      recordedAt: '2026-09-01T00:00:00.000Z',
    },
    returnRequirement: {
      required: true,
      reviewAt: '2026-12-01T00:00:00.000Z',
      observationContract: 'RETURN required before renewal, amendment, revocation, or expiry review',
    },
  };
}

test('SFI-INSTITUTIONAL-APPOINTMENT-SEPARATION-1.0 / ROLE DEFINITION != PERSON APPOINTMENT', () => {
  const definition = SFI_INSTITUTIONAL_ROLE_DEFINITIONS.institutional_director;
  assert.equal(roleDefinitionContainsPersonIdentity(definition), false);
  assert.equal(definition.appointmentRequired, true);
  assert.equal(SFI_INSTITUTIONAL_DIRECTOR_OFFICE.state, 'VACANT');
  assert.equal(SFI_INSTITUTIONAL_DIRECTOR_OFFICE.incumbentAppointmentId, null);

  const withoutAppointment = resolveInstitutionalAuthority({
    principalId: 'authenticated-account-only',
    principalKind: 'HUMAN',
    appointment: null,
    requestedAuthority: 'READ',
    requestedDomain: 'institution',
    requestedScope: 'institution:operate',
    now: '2026-09-05T12:30:00.000Z',
  });
  assert.deepEqual(withoutAppointment, { authorized: false, reason: 'MISSING_APPOINTMENT' });
});

test('SFI-INSTITUTIONAL-APPOINTMENT-SEPARATION-1.0 / person existence and organization membership do not imply appointment', () => {
  const member = findInstitutionalMember('edwin.tzolkin@gmail.com');
  assert.ok(member);
  assert.equal(member.title, 'Director de Dominio — SFI Studio');
  assert.equal(SFI_INSTITUTIONAL_DIRECTOR_OFFICE.incumbentAppointmentId, null);
  assert.equal(canGenericAccountAdministrationCreateAppointment('institutional_director'), false);
});

test('SFI-INSTITUTIONAL-APPOINTMENT-SEPARATION-1.0 / future appointment fails closed without required independent resolution fields', () => {
  const appointment = validAppointment();
  const invalid: SfiInstitutionalAppointment = {
    ...appointment,
    principal: { ...appointment.principal, principalId: '' },
    mandate: { ...appointment.mandate, scope: [] },
    appointingAuthority: { ...appointment.appointingAuthority, authorityRef: '' },
    provenance: { ...appointment.provenance, resolutionId: '', sourceRef: '' },
    returnRequirement: { ...appointment.returnRequirement, observationContract: '' },
  };
  const validation = validateInstitutionalAppointment(invalid);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes('MISSING_PRINCIPAL_ID'));
  assert.ok(validation.errors.includes('MANDATE_SCOPE_REQUIRED'));
  assert.ok(validation.errors.includes('MISSING_APPOINTING_AUTHORITY'));
  assert.ok(validation.errors.includes('MISSING_PROVENANCE_RESOLUTION'));
  assert.ok(validation.errors.includes('MISSING_PROVENANCE_SOURCE'));
  assert.ok(validation.errors.includes('RETURN_OBSERVATION_CONTRACT_REQUIRED'));
});

test('SFI-INSTITUTIONAL-APPOINTMENT-SEPARATION-1.0 / a valid role definition never materializes an appointment', () => {
  const roleDefinition = SFI_INSTITUTIONAL_ROLE_DEFINITIONS.domain_director;
  assert.equal(roleDefinition.roleId, 'domain_director');
  assert.equal(roleDefinition.appointmentRequired, true);
  assert.equal('principal' in roleDefinition, false);
  assert.equal('appointmentId' in roleDefinition, false);
  assert.equal('mandate' in roleDefinition, false);
});

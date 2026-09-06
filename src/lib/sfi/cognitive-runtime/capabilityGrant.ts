import { createHash, randomUUID } from 'node:crypto';

import {
  cognitivePassportForCapability,
  type SfiCapabilityBrokerDecision,
  type SfiCapabilityHistoryEntry,
  type SfiCapabilityRequest,
} from './capabilityBroker';
import type { SfiAuthorityClass } from './cognitivePassportRegistry';
import type { KernelContext } from './kernelContext';

export const SFI_CAPABILITY_GRANT_CONTRACT = 'SFI-CAPABILITY-GRANT-1.0' as const;
export const SFI_CAPABILITY_GRANT_SCOPE_GATE = 'SFI-CAPABILITY-GRANT-SCOPE-1.0' as const;
export const SFI_CAPABILITY_GRANT_EXPIRY_GATE = 'SFI-CAPABILITY-GRANT-EXPIRY-1.0' as const;
export const SFI_CAPABILITY_GRANT_REPLAY_GATE = 'SFI-CAPABILITY-GRANT-REPLAY-1.0' as const;
export const SFI_CAPABILITY_GRANT_REVOCATION_GATE = 'SFI-CAPABILITY-GRANT-REVOCATION-1.0' as const;

export const SFI_CAPABILITY_GRANT_REVOKED = 'SFI_CAPABILITY_GRANT_REVOKED' as const;

export type SfiCapabilityGrantState = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface SfiCapabilityGrant {
  grantId: string;
  principal: string;
  trajectoryId: string;
  stepId: string;
  capabilityId: string;
  resource: string;
  allowedActions: string[];
  authorityCeiling: SfiAuthorityClass;
  issuedAt: string;
  expiresAt: string;
  confirmationRequired: boolean;
  sensitivity: string;
  parentGrantId: string | null;
  nonce: string;
  state: SfiCapabilityGrantState;
}

export type SfiPublicCapabilityGrant = Omit<SfiCapabilityGrant, 'nonce'>;

export type SfiCapabilityGrantIssueInput = {
  request: SfiCapabilityRequest;
  decision: SfiCapabilityBrokerDecision;
  context: KernelContext;
  parentGrant?: SfiPublicCapabilityGrant | null;
  history?: SfiCapabilityHistoryEntry[];
  now?: Date;
  grantId?: string;
  nonce?: string;
};

export type SfiCapabilityGrantIssueResult =
  | { ok: true; grant: SfiCapabilityGrant }
  | { ok: false; reasons: string[] };

export type SfiCapabilityGrantUseInput = {
  grant: SfiCapabilityGrant;
  request: SfiCapabilityRequest;
  parentGrant?: SfiPublicCapabilityGrant | null;
  history?: SfiCapabilityHistoryEntry[];
  now?: Date;
};

export type SfiCapabilityGrantUseResult = {
  ok: boolean;
  reasons: string[];
  effectiveState: SfiCapabilityGrantState;
};

type Row = Record<string, unknown>;

const AUTHORITY_ORDER: Record<SfiAuthorityClass, number> = {
  READ: 0,
  RECOMMEND: 1,
  WRITE_INTERNAL: 2,
  EXECUTE_REVERSIBLE: 3,
  EXECUTE_EXTERNAL: 4,
  IRREVERSIBLE: 5,
  CANON: 6,
};

const SENSITIVITY_ORDER: Record<string, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  RESTRICTED: 2,
  CONFIDENTIAL: 3,
  SECRET: 4,
};

const INVOKE_ACTION = 'INVOKE_CAPABILITY';
const REQUEST_CHILD_ACTION = 'REQUEST_CHILD_CAPABILITY';
const SECRET_MARKER = /(service[_-]?role|raw[_-]?secret|private[_-]?key|bearer\s+[a-z0-9._-]+)/i;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}

function validDate(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

function authorityClass(value: unknown): SfiAuthorityClass | null {
  return typeof value === 'string' && value in AUTHORITY_ORDER ? value as SfiAuthorityClass : null;
}

function grantState(value: unknown): SfiCapabilityGrantState | null {
  return value === 'ACTIVE' || value === 'REVOKED' || value === 'EXPIRED' ? value : null;
}

function authorityAtOrBelow(actual: SfiAuthorityClass, ceiling: SfiAuthorityClass) {
  return AUTHORITY_ORDER[actual] <= AUTHORITY_ORDER[ceiling];
}

function sensitivityAtLeast(actual: string, floor: string) {
  const actualRank = SENSITIVITY_ORDER[actual.toUpperCase()];
  const floorRank = SENSITIVITY_ORDER[floor.toUpperCase()];
  if (actualRank === undefined || floorRank === undefined) return actual === floor;
  return actualRank >= floorRank;
}

function historyPayload(entry: SfiCapabilityHistoryEntry) {
  return row(entry.payload);
}

function historyGrant(entry: SfiCapabilityHistoryEntry) {
  return row(historyPayload(entry).grant);
}

function executionGrantRefs(entry: SfiCapabilityHistoryEntry) {
  const metadata = row(historyPayload(entry).metadata);
  const refs = row(metadata.refs);
  return row(refs.capabilityGrant);
}

function matchingGrantId(entry: SfiCapabilityHistoryEntry, grantId: string) {
  return text(historyPayload(entry).grantId) === grantId
    || text(historyGrant(entry).grantId) === grantId
    || text(executionGrantRefs(entry).grantId) === grantId;
}

function matchingNonceHash(entry: SfiCapabilityHistoryEntry, nonceHash: string) {
  return text(historyPayload(entry).nonceHash) === nonceHash
    || text(historyGrant(entry).nonceHash) === nonceHash
    || text(executionGrantRefs(entry).nonceHash) === nonceHash;
}

export function capabilityGrantNonceHash(nonce: string) {
  return createHash('sha256').update(nonce).digest('hex');
}

export function publicCapabilityGrant(grant: SfiCapabilityGrant): SfiPublicCapabilityGrant {
  const { nonce: _nonce, ...publicGrant } = grant;
  return publicGrant;
}

export function validatePublicCapabilityGrantShape(grant: SfiPublicCapabilityGrant): string[] {
  const errors: string[] = [];
  if (!grant.grantId.trim()) errors.push('GRANT_ID_REQUIRED');
  if (!grant.principal.trim()) errors.push('PRINCIPAL_REQUIRED');
  if (!grant.trajectoryId.trim()) errors.push('TRAJECTORY_REQUIRED');
  if (!grant.stepId.trim()) errors.push('STEP_REQUIRED');
  if (!grant.capabilityId.trim()) errors.push('CAPABILITY_REQUIRED');
  if (!grant.resource.trim()) errors.push('RESOURCE_REQUIRED');
  if (grant.allowedActions.length === 0) errors.push('ALLOWED_ACTIONS_REQUIRED');
  if (unique(grant.allowedActions).length !== grant.allowedActions.length) errors.push('ALLOWED_ACTIONS_DUPLICATE');
  if (!(grant.authorityCeiling in AUTHORITY_ORDER)) errors.push('AUTHORITY_CEILING_INVALID');
  if (!validDate(grant.issuedAt)) errors.push('ISSUED_AT_INVALID');
  if (!validDate(grant.expiresAt)) errors.push('EXPIRES_AT_INVALID');
  if (validDate(grant.issuedAt) && validDate(grant.expiresAt) && new Date(grant.expiresAt).getTime() <= new Date(grant.issuedAt).getTime()) {
    errors.push('EXPIRY_NOT_AFTER_ISSUANCE');
  }
  if (!grant.sensitivity.trim()) errors.push('SENSITIVITY_REQUIRED');
  if (!['ACTIVE', 'REVOKED', 'EXPIRED'].includes(grant.state)) errors.push('STATE_INVALID');
  if (SECRET_MARKER.test(JSON.stringify(grant))) errors.push('SECRET_MARKER_FORBIDDEN_IN_GRANT_SCOPE');
  return errors.sort();
}

export function validateCapabilityGrantShape(grant: SfiCapabilityGrant): string[] {
  const errors = validatePublicCapabilityGrantShape(publicCapabilityGrant(grant));
  if (!grant.nonce.trim()) errors.push('NONCE_REQUIRED');
  return errors.sort();
}

export function capabilityGrantParentFromContext(context: KernelContext): SfiPublicCapabilityGrant | null {
  const candidate = row(context.metadata?.capabilityGrant);
  const authorityCeiling = authorityClass(candidate.authorityCeiling);
  const state = grantState(candidate.state);
  const allowedActions = Array.isArray(candidate.allowedActions)
    ? candidate.allowedActions.filter((item): item is string => typeof item === 'string')
    : [];
  const parentGrantValid = candidate.parentGrantId === null || text(candidate.parentGrantId) !== null;
  const parentGrantId = candidate.parentGrantId === null ? null : text(candidate.parentGrantId);
  const grant: SfiPublicCapabilityGrant | null = authorityCeiling && state && parentGrantValid
    && typeof candidate.confirmationRequired === 'boolean'
    && text(candidate.grantId)
    && text(candidate.principal)
    && text(candidate.trajectoryId)
    && text(candidate.stepId)
    && text(candidate.capabilityId)
    && text(candidate.resource)
    && text(candidate.issuedAt)
    && text(candidate.expiresAt)
    && text(candidate.sensitivity)
    ? {
      grantId: text(candidate.grantId)!,
      principal: text(candidate.principal)!,
      trajectoryId: text(candidate.trajectoryId)!,
      stepId: text(candidate.stepId)!,
      capabilityId: text(candidate.capabilityId)!,
      resource: text(candidate.resource)!,
      allowedActions,
      authorityCeiling,
      issuedAt: text(candidate.issuedAt)!,
      expiresAt: text(candidate.expiresAt)!,
      confirmationRequired: candidate.confirmationRequired,
      sensitivity: text(candidate.sensitivity)!,
      parentGrantId,
      state,
    }
    : null;
  return grant && validatePublicCapabilityGrantShape(grant).length === 0 ? grant : null;
}

export function effectiveCapabilityGrantState(
  grant: SfiPublicCapabilityGrant,
  now: Date = new Date(),
  history: SfiCapabilityHistoryEntry[] = [],
): SfiCapabilityGrantState {
  if (grant.state === 'REVOKED') return 'REVOKED';
  if (history.some((entry) => entry.eventName === SFI_CAPABILITY_GRANT_REVOKED && matchingGrantId(entry, grant.grantId))) {
    return 'REVOKED';
  }
  if (grant.state === 'EXPIRED' || now.getTime() >= new Date(grant.expiresAt).getTime()) return 'EXPIRED';
  return 'ACTIVE';
}

function parentScopeErrors(
  child: SfiCapabilityGrant,
  request: SfiCapabilityRequest,
  parent: SfiPublicCapabilityGrant,
  history: SfiCapabilityHistoryEntry[],
  now: Date,
) {
  const errors = validatePublicCapabilityGrantShape(parent);
  const parentState = effectiveCapabilityGrantState(parent, now, history);
  if (parentState !== 'ACTIVE') errors.push(`PARENT_GRANT_NOT_ACTIVE:${parentState}`);
  if (parent.principal !== request.requestedByCapabilityId || parent.capabilityId !== request.requestedByCapabilityId) {
    errors.push('PARENT_GRANT_PRINCIPAL_MISMATCH');
  }
  if (!parent.allowedActions.includes(REQUEST_CHILD_ACTION)) errors.push('PARENT_CHILD_REQUEST_NOT_ALLOWED');
  if (child.parentGrantId !== parent.grantId) errors.push('PARENT_GRANT_LINEAGE_MISMATCH');
  if (child.trajectoryId !== parent.trajectoryId) errors.push('CHILD_TRAJECTORY_EXPANSION');
  if (child.resource !== parent.resource) errors.push('CHILD_RESOURCE_EXPANSION');
  if (!child.allowedActions.every((action) => parent.allowedActions.includes(action))) errors.push('CHILD_ACTION_EXPANSION');
  if (!authorityAtOrBelow(child.authorityCeiling, parent.authorityCeiling)) errors.push('CHILD_AUTHORITY_EXPANSION');
  if (new Date(child.expiresAt).getTime() > new Date(parent.expiresAt).getTime()) errors.push('CHILD_EXPIRY_EXPANSION');
  if (parent.confirmationRequired && !child.confirmationRequired) errors.push('CHILD_CONFIRMATION_WEAKENED');
  if (!sensitivityAtLeast(child.sensitivity, parent.sensitivity)) errors.push('CHILD_SENSITIVITY_WEAKENED');
  return errors;
}

export function issueEphemeralCapabilityGrant(input: SfiCapabilityGrantIssueInput): SfiCapabilityGrantIssueResult {
  const request = input.request;
  const decision = input.decision;
  const now = input.now ?? new Date();
  const requesterPassport = cognitivePassportForCapability(request.requestedByCapabilityId);
  const requestedPassport = cognitivePassportForCapability(request.requestedCapabilityId);
  const errors: string[] = [];

  if (decision.disposition !== 'ADMIT' || !decision.executionAllowed) errors.push('BROKER_ADMISSION_REQUIRED');
  if (decision.authorityBoundary !== 'CAPABILITY_REQUEST_IS_NOT_AUTHORIZATION') errors.push('BROKER_AUTHORITY_BOUNDARY_INVALID');
  if (decision.requesterPassportId !== request.requestedByCapabilityId) errors.push('BROKER_REQUESTER_PASSPORT_MISMATCH');
  if (decision.requestedPassportId !== request.requestedCapabilityId) errors.push('BROKER_REQUESTED_PASSPORT_MISMATCH');
  if (request.trajectoryId !== input.context.cycleId) errors.push('TRAJECTORY_MISMATCH');
  if (!requesterPassport) errors.push('REQUESTER_PASSPORT_UNAVAILABLE');
  if (!requestedPassport) errors.push('REQUESTED_PASSPORT_UNAVAILABLE');
  if (errors.length > 0 || !requesterPassport || !requestedPassport) return { ok: false, reasons: unique(errors) };

  if (!authorityAtOrBelow(requestedPassport.authority.ceiling, requesterPassport.authority.ceiling)) {
    errors.push('GRANT_EXCEEDS_REQUESTER_PASSPORT_AUTHORITY');
  }
  if (requestedPassport.authority.confirmationRequirement !== 'NONE') {
    errors.push(`CONFIRMATION_REQUIRED:${requestedPassport.authority.confirmationRequirement}`);
  }

  const issuedAtMs = now.getTime();
  const ttlMs = Math.min(
    requesterPassport.security.defaultTtlSeconds,
    requestedPassport.security.defaultTtlSeconds,
    900,
  ) * 1000;
  let expiresAtMs = issuedAtMs + ttlMs;
  if (input.parentGrant) expiresAtMs = Math.min(expiresAtMs, new Date(input.parentGrant.expiresAt).getTime());
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= issuedAtMs) errors.push('GRANT_TTL_EXHAUSTED');

  const grant: SfiCapabilityGrant = {
    grantId: input.grantId ?? randomUUID(),
    principal: request.requestedCapabilityId,
    trajectoryId: request.trajectoryId,
    stepId: request.parentStepId ?? input.context.taskId,
    capabilityId: request.requestedCapabilityId,
    resource: `trajectory:${request.trajectoryId}`,
    allowedActions: requestedPassport.orchestration.mayRequestCapabilities
      ? [INVOKE_ACTION, REQUEST_CHILD_ACTION]
      : [INVOKE_ACTION],
    authorityCeiling: requestedPassport.authority.ceiling,
    issuedAt: now.toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    confirmationRequired: requestedPassport.authority.confirmationRequirement !== 'NONE',
    sensitivity: requestedPassport.security.sensitivityClass,
    parentGrantId: input.parentGrant?.grantId ?? null,
    nonce: input.nonce ?? randomUUID(),
    state: 'ACTIVE',
  };

  errors.push(...validateCapabilityGrantShape(grant));
  if (input.parentGrant) errors.push(...parentScopeErrors(grant, request, input.parentGrant, input.history ?? [], now));
  return errors.length > 0 ? { ok: false, reasons: unique(errors) } : { ok: true, grant };
}

export function validateCapabilityGrantUse(input: SfiCapabilityGrantUseInput): SfiCapabilityGrantUseResult {
  const grant = input.grant;
  const request = input.request;
  const history = input.history ?? [];
  const now = input.now ?? new Date();
  const errors = validateCapabilityGrantShape(grant);
  const requesterPassport = cognitivePassportForCapability(request.requestedByCapabilityId);
  const requestedPassport = cognitivePassportForCapability(request.requestedCapabilityId);
  const effectiveState = effectiveCapabilityGrantState(publicCapabilityGrant(grant), now, history);

  if (effectiveState !== 'ACTIVE') errors.push(`GRANT_NOT_ACTIVE:${effectiveState}`);
  if (grant.principal !== request.requestedCapabilityId) errors.push('GRANT_PRINCIPAL_MISMATCH');
  if (grant.trajectoryId !== request.trajectoryId) errors.push('GRANT_TRAJECTORY_MISMATCH');
  if (grant.capabilityId !== request.requestedCapabilityId) errors.push('GRANT_CAPABILITY_MISMATCH');
  if (request.parentStepId && grant.stepId !== request.parentStepId) errors.push('GRANT_STEP_MISMATCH');
  if (grant.resource !== `trajectory:${request.trajectoryId}`) errors.push('GRANT_RESOURCE_MISMATCH');
  if (!grant.allowedActions.includes(INVOKE_ACTION)) errors.push('GRANT_ACTION_NOT_ALLOWED');
  if (!requesterPassport || !requestedPassport) errors.push('PASSPORT_UNAVAILABLE_AT_GRANT_USE');
  if (requesterPassport && !authorityAtOrBelow(grant.authorityCeiling, requesterPassport.authority.ceiling)) {
    errors.push('GRANT_EXCEEDS_REQUESTER_PASSPORT_AUTHORITY');
  }
  if (requestedPassport && !authorityAtOrBelow(grant.authorityCeiling, requestedPassport.authority.ceiling)) {
    errors.push('GRANT_EXCEEDS_REQUESTED_PASSPORT_AUTHORITY');
  }
  if (grant.confirmationRequired) errors.push('UNSATISFIED_GRANT_CONFIRMATION');

  const nonceHash = capabilityGrantNonceHash(grant.nonce);
  if (history.some((entry) => (
    entry.eventName === 'SFI_AGENT_EXECUTED'
    || entry.eventName === 'SFI_AGENT_SKIPPED'
  ) && (matchingGrantId(entry, grant.grantId) || matchingNonceHash(entry, nonceHash)))) {
    errors.push('GRANT_REPLAY_DETECTED');
  }
  if (input.parentGrant) errors.push(...parentScopeErrors(grant, request, input.parentGrant, history, now));

  return { ok: errors.length === 0, reasons: unique(errors), effectiveState };
}

export function capabilityGrantRevocationPayload(input: {
  grantId: string;
  reason: string;
  revokedBy: string;
  revokedAt?: string;
}) {
  if (!input.grantId.trim()) throw new Error('GRANT_ID_REQUIRED');
  if (!input.reason.trim()) throw new Error('REVOCATION_REASON_REQUIRED');
  if (!input.revokedBy.trim()) throw new Error('REVOKED_BY_REQUIRED');
  const revokedAt = input.revokedAt ?? new Date().toISOString();
  if (!validDate(revokedAt)) throw new Error('REVOKED_AT_INVALID');
  return {
    contract: SFI_CAPABILITY_GRANT_CONTRACT,
    grantId: input.grantId,
    reason: input.reason,
    revokedBy: input.revokedBy,
    revokedAt,
    state: 'REVOKED' as const,
    authorizationAllowed: false,
  };
}
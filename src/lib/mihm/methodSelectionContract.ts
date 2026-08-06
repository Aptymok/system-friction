import type { MihmInstrumentType } from './instrumentContract';

export type MihmMethodId =
  | 'MOP_H'
  | 'SCOREFRICTION'
  | 'WORLD_VECTOR'
  | 'PPOI'
  | 'SFI_INSTITUTIONAL';

export type MihmObservationSubject =
  | 'PERSON'
  | 'SESSION'
  | 'OBJECT'
  | 'SIGNAL'
  | 'ARTIFACT'
  | 'WORLD_CONTEXT'
  | 'PHENOMENON'
  | 'CASE'
  | 'ORGANIZATION'
  | 'SFI_SYSTEM'
  | 'UNKNOWN';

export type MihmTemporalScope =
  | 'POINT_IN_TIME'
  | 'SESSION'
  | 'BOUNDED_WINDOW'
  | 'LONGITUDINAL'
  | 'CURRENT_WORLD_STATE'
  | 'UNKNOWN';

export type MihmEvidenceModality =
  | 'TEXT'
  | 'AUDIO'
  | 'VIDEO'
  | 'IMAGE'
  | 'SOFTWARE'
  | 'DATASET'
  | 'INTERVIEW'
  | 'FIELD'
  | 'MODEL'
  | 'PAPER'
  | 'CONVERSATION'
  | 'INSTITUTIONAL_RECORD'
  | 'TELEMETRY'
  | 'UNKNOWN';

export type MihmMethodSelectionInput = {
  subject: MihmObservationSubject;
  temporalScope: MihmTemporalScope;
  evidenceModalities: MihmEvidenceModality[];
  subjectId?: string | null;
  ownerId?: string | null;
  caseId?: string | null;
  phenomenonId?: string | null;
  sessionId?: string | null;
  worldContextRequested?: boolean;
  requiresTrajectory?: boolean;
  requiresRivalHypothesis?: boolean;
  requiresInterventionTracking?: boolean;
  evidenceCount?: number;
  observationSpanDays?: number;
  isSfiInternal?: boolean;
  requestedMethod?: MihmMethodId | null;
  metadata?: Record<string, unknown>;
};

export type MihmMethodSelectionReasonCode =
  | 'PERSON_OR_SESSION'
  | 'BOUNDED_OBJECT_OR_SIGNAL'
  | 'WORLD_CONTEXT'
  | 'LONGITUDINAL_PHENOMENON'
  | 'CASE_REQUIRES_CONTAINER'
  | 'ORGANIZATION_REQUIRES_CASE_CONTAINER'
  | 'SFI_INSTITUTIONAL_STATE'
  | 'SUPPORTING_WORLD_CONTEXT'
  | 'SUPPORTING_OBJECT_ANALYSIS'
  | 'SUPPORTING_PERSONAL_IMPACT'
  | 'REQUESTED_METHOD_COMPATIBLE'
  | 'REQUESTED_METHOD_INCOMPATIBLE'
  | 'INSUFFICIENT_CLASSIFICATION';

export type MihmMethodSelectionBlocker = {
  code:
    | 'SUBJECT_UNKNOWN'
    | 'SESSION_ID_REQUIRED'
    | 'OBJECT_ID_REQUIRED'
    | 'WORLD_SOURCE_REQUIRED'
    | 'PHENOMENON_ID_OR_CREATION_REQUIRED'
    | 'INSTITUTIONAL_SCOPE_REQUIRED'
    | 'REQUESTED_METHOD_CONFLICT';
  message: string;
  field?: keyof MihmMethodSelectionInput;
};

export type MihmSelectedMethod = {
  methodId: MihmMethodId;
  instrumentType: MihmInstrumentType;
  role: 'PRIMARY' | 'SUPPORTING';
  reasonCodes: MihmMethodSelectionReasonCode[];
  objectId: string | null;
  requiredInputs: string[];
  expectedOutputs: string[];
};

export type MihmMethodSelectionResult = {
  version: '2026-08-05.method-selection.v1';
  status: 'READY' | 'BLOCKED' | 'AMBIGUOUS';
  primary: MihmSelectedMethod | null;
  supporting: MihmSelectedMethod[];
  blockers: MihmMethodSelectionBlocker[];
  rationale: string[];
  confidence: number;
  requiresGovernanceReview: boolean;
};

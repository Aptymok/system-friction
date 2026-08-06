import { getMihmMethodDefinition } from './methodologyRegistry';
import type {
  MihmMethodId,
  MihmMethodSelectionBlocker,
  MihmMethodSelectionInput,
  MihmMethodSelectionReasonCode,
  MihmMethodSelectionResult,
  MihmSelectedMethod,
} from './methodSelectionContract';

const VERSION = '2026-08-05.method-selection.v1' as const;

function selected(
  methodId: MihmMethodId,
  role: MihmSelectedMethod['role'],
  reasonCodes: MihmMethodSelectionReasonCode[],
  objectId: string | null,
): MihmSelectedMethod {
  const definition = getMihmMethodDefinition(methodId);
  return {
    methodId,
    instrumentType: definition.instrumentType,
    role,
    reasonCodes,
    objectId,
    requiredInputs: definition.primaryInputs,
    expectedOutputs: definition.outputs,
  };
}

function uniqueMethods(methods: MihmSelectedMethod[]): MihmSelectedMethod[] {
  const seen = new Set<string>();
  return methods.filter((method) => {
    const key = `${method.role}:${method.methodId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compatible(methodId: MihmMethodId, input: MihmMethodSelectionInput): boolean {
  const definition = getMihmMethodDefinition(methodId);
  return definition.validSubjects.includes(input.subject)
    && definition.validTemporalScopes.includes(input.temporalScope);
}

function primaryFor(input: MihmMethodSelectionInput): {
  methodId: MihmMethodId | null;
  reasons: MihmMethodSelectionReasonCode[];
} {
  if (input.subject === 'SFI_SYSTEM' || input.isSfiInternal === true) {
    return { methodId: 'SFI_INSTITUTIONAL', reasons: ['SFI_INSTITUTIONAL_STATE'] };
  }

  if (input.subject === 'PERSON' || input.subject === 'SESSION') {
    return { methodId: 'MOP_H', reasons: ['PERSON_OR_SESSION'] };
  }

  if (input.subject === 'WORLD_CONTEXT') {
    return { methodId: 'WORLD_VECTOR', reasons: ['WORLD_CONTEXT'] };
  }

  const longitudinal = input.temporalScope === 'LONGITUDINAL'
    || input.requiresTrajectory === true
    || input.requiresRivalHypothesis === true
    || input.requiresInterventionTracking === true
    || (input.observationSpanDays ?? 0) > 1
    || (input.evidenceCount ?? 0) > 1;

  if (input.subject === 'CASE') {
    return { methodId: 'PPOI', reasons: ['CASE_REQUIRES_CONTAINER'] };
  }

  if (input.subject === 'ORGANIZATION') {
    return { methodId: 'PPOI', reasons: ['ORGANIZATION_REQUIRES_CASE_CONTAINER'] };
  }

  if (input.subject === 'PHENOMENON' || longitudinal) {
    return { methodId: 'PPOI', reasons: ['LONGITUDINAL_PHENOMENON'] };
  }

  if (input.subject === 'OBJECT' || input.subject === 'SIGNAL' || input.subject === 'ARTIFACT') {
    return { methodId: 'SCOREFRICTION', reasons: ['BOUNDED_OBJECT_OR_SIGNAL'] };
  }

  return { methodId: null, reasons: ['INSUFFICIENT_CLASSIFICATION'] };
}

function blockersFor(
  input: MihmMethodSelectionInput,
  primaryMethod: MihmMethodId | null,
): MihmMethodSelectionBlocker[] {
  const blockers: MihmMethodSelectionBlocker[] = [];

  if (input.subject === 'UNKNOWN' || primaryMethod === null) {
    blockers.push({
      code: 'SUBJECT_UNKNOWN',
      field: 'subject',
      message: 'El sujeto de observación no permite seleccionar una metodología con integridad.',
    });
  }

  if (primaryMethod === 'MOP_H' && !input.sessionId) {
    blockers.push({
      code: 'SESSION_ID_REQUIRED',
      field: 'sessionId',
      message: 'MOP-H requiere una sesión identificada; una lectura personal no puede convertirse en estado global.',
    });
  }

  if (primaryMethod === 'SCOREFRICTION' && !input.subjectId) {
    blockers.push({
      code: 'OBJECT_ID_REQUIRED',
      field: 'subjectId',
      message: 'ScoreFriction requiere un objeto, señal o artefacto delimitado e identificable.',
    });
  }

  if (primaryMethod === 'WORLD_VECTOR' && input.evidenceModalities.length === 0) {
    blockers.push({
      code: 'WORLD_SOURCE_REQUIRED',
      field: 'evidenceModalities',
      message: 'World Vector requiere fuentes observables; no puede generarse desde un estado visual vacío.',
    });
  }

  if (primaryMethod === 'PPOI' && !input.phenomenonId && !input.caseId && !input.subjectId) {
    blockers.push({
      code: 'PHENOMENON_ID_OR_CREATION_REQUIRED',
      field: 'phenomenonId',
      message: 'PPOI requiere un fenómeno existente o información suficiente para crear uno de forma trazable.',
    });
  }

  if (primaryMethod === 'SFI_INSTITUTIONAL' && input.subject !== 'SFI_SYSTEM' && input.isSfiInternal !== true) {
    blockers.push({
      code: 'INSTITUTIONAL_SCOPE_REQUIRED',
      field: 'isSfiInternal',
      message: 'ΦSF institucional sólo puede calcularse sobre el ciclo operativo de SFI.',
    });
  }

  if (input.requestedMethod && primaryMethod && input.requestedMethod !== primaryMethod && !compatible(input.requestedMethod, input)) {
    blockers.push({
      code: 'REQUESTED_METHOD_CONFLICT',
      field: 'requestedMethod',
      message: `La metodología solicitada ${input.requestedMethod} no es compatible con ${input.subject}/${input.temporalScope}.`,
    });
  }

  return blockers;
}

function supportingFor(
  input: MihmMethodSelectionInput,
  primaryMethod: MihmMethodId | null,
): MihmSelectedMethod[] {
  if (!primaryMethod) return [];
  const methods: MihmSelectedMethod[] = [];

  if (primaryMethod === 'PPOI') {
    if (input.worldContextRequested) {
      methods.push(selected('WORLD_VECTOR', 'SUPPORTING', ['SUPPORTING_WORLD_CONTEXT'], null));
    }

    const hasObjectEvidence = input.evidenceModalities.some((modality) =>
      ['TEXT', 'AUDIO', 'VIDEO', 'IMAGE', 'SOFTWARE', 'DATASET'].includes(modality),
    );
    if (hasObjectEvidence) {
      methods.push(selected('SCOREFRICTION', 'SUPPORTING', ['SUPPORTING_OBJECT_ANALYSIS'], input.subjectId ?? null));
    }

    if (input.sessionId) {
      methods.push(selected('MOP_H', 'SUPPORTING', ['SUPPORTING_PERSONAL_IMPACT'], input.sessionId));
    }
  }

  if (primaryMethod !== 'WORLD_VECTOR' && input.worldContextRequested && !methods.some((method) => method.methodId === 'WORLD_VECTOR')) {
    methods.push(selected('WORLD_VECTOR', 'SUPPORTING', ['SUPPORTING_WORLD_CONTEXT'], null));
  }

  return uniqueMethods(methods);
}

function confidenceFor(input: MihmMethodSelectionInput, blockers: MihmMethodSelectionBlocker[]): number {
  let confidence = 0.55;
  if (input.subject !== 'UNKNOWN') confidence += 0.15;
  if (input.temporalScope !== 'UNKNOWN') confidence += 0.10;
  if (input.subjectId || input.sessionId || input.caseId || input.phenomenonId) confidence += 0.10;
  if (input.evidenceModalities.length > 0) confidence += 0.05;
  if (input.requestedMethod) confidence += 0.05;
  confidence -= blockers.length * 0.15;
  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
}

export function resolveMihmMethod(input: MihmMethodSelectionInput): MihmMethodSelectionResult {
  const normalized: MihmMethodSelectionInput = {
    ...input,
    evidenceModalities: Array.from(new Set(input.evidenceModalities)),
    evidenceCount: Math.max(0, input.evidenceCount ?? 0),
    observationSpanDays: Math.max(0, input.observationSpanDays ?? 0),
  };

  const resolution = primaryFor(normalized);
  const blockers = blockersFor(normalized, resolution.methodId);
  const supporting = supportingFor(normalized, resolution.methodId);
  const requestedCompatible = normalized.requestedMethod
    ? compatible(normalized.requestedMethod, normalized)
    : false;

  const primaryReasons = [...resolution.reasons];
  if (normalized.requestedMethod && normalized.requestedMethod === resolution.methodId && requestedCompatible) {
    primaryReasons.push('REQUESTED_METHOD_COMPATIBLE');
  } else if (normalized.requestedMethod && normalized.requestedMethod !== resolution.methodId) {
    primaryReasons.push('REQUESTED_METHOD_INCOMPATIBLE');
  }

  const objectId = resolution.methodId === 'MOP_H'
    ? normalized.sessionId ?? null
    : resolution.methodId === 'PPOI'
      ? normalized.phenomenonId ?? normalized.caseId ?? normalized.subjectId ?? null
      : normalized.subjectId ?? null;

  const primary = resolution.methodId
    ? selected(resolution.methodId, 'PRIMARY', primaryReasons, objectId)
    : null;

  const status: MihmMethodSelectionResult['status'] = blockers.length > 0
    ? 'BLOCKED'
    : primary
      ? 'READY'
      : 'AMBIGUOUS';

  const rationale = [
    primary
      ? `${getMihmMethodDefinition(primary.methodId).label} se seleccionó como instrumento primario para ${normalized.subject}/${normalized.temporalScope}.`
      : 'No existe suficiente clasificación para seleccionar un instrumento primario.',
    ...supporting.map((method) => `${getMihmMethodDefinition(method.methodId).label} se añade como instrumento de apoyo; no sustituye al contenedor primario.`),
    ...blockers.map((blocker) => blocker.message),
  ];

  return {
    version: VERSION,
    status,
    primary,
    supporting,
    blockers,
    rationale,
    confidence: confidenceFor(normalized, blockers),
    requiresGovernanceReview: blockers.some((blocker) => blocker.code === 'REQUESTED_METHOD_CONFLICT')
      || normalized.subject === 'ORGANIZATION'
      || normalized.isSfiInternal === true,
  };
}

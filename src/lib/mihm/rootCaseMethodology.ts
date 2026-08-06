import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { MihmEvidenceModality, MihmMethodSelectionInput, MihmMethodSelectionResult, MihmObservationSubject, MihmTemporalScope } from './methodSelectionContract';
import { resolveMihmMethod } from './methodSelectionResolver';

function text(row: RootRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function numberValue(row: RootRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function evidenceModalities(row: RootRow): MihmEvidenceModality[] {
  const joined = [
    text(row, ['source', 'type', 'evidence_type', 'modality', 'channel']),
    text(row, ['summary', 'description', 'public_signal', 'pain', 'notes']),
  ].filter(Boolean).join(' ').toLowerCase();
  const result = new Set<MihmEvidenceModality>();
  if (/audio|wav|mp3|sound/.test(joined)) result.add('AUDIO');
  if (/video|mp4|clip/.test(joined)) result.add('VIDEO');
  if (/image|imagen|png|jpg|visual/.test(joined)) result.add('IMAGE');
  if (/software|app|repository|repo|code|código/.test(joined)) result.add('SOFTWARE');
  if (/dataset|datos|database|csv|xlsx/.test(joined)) result.add('DATASET');
  if (/interview|entrevista/.test(joined)) result.add('INTERVIEW');
  if (/field|campo/.test(joined)) result.add('FIELD');
  if (/paper|artículo|article/.test(joined)) result.add('PAPER');
  if (/conversation|conversación|mensaje|email|correo/.test(joined)) result.add('CONVERSATION');
  if (/telemetry|telemetría|runtime|agent/.test(joined)) result.add('TELEMETRY');
  if (/record|registro|contract|contrato|document|documento|text|texto/.test(joined)) result.add('INSTITUTIONAL_RECORD');
  if (result.size === 0) result.add('TEXT');
  return [...result];
}

function subjectFor(row: RootRow): MihmObservationSubject {
  const type = [text(row, ['type', 'entity_type', 'subject_type', 'kind']), text(row, ['title', 'name', 'company', 'entity_name'])]
    .filter(Boolean).join(' ').toLowerCase();
  if (/sfi|system friction institute/.test(type) && /internal|institutional|operational|runtime/.test(type)) return 'SFI_SYSTEM';
  if (/person|persona|session|sesión|patient|paciente/.test(type)) return 'PERSON';
  if (/world|mundo|global|geopolit/.test(type)) return 'WORLD_CONTEXT';
  if (/artifact|artefacto|object|objeto|signal|señal|audio|image|software/.test(type)) return 'ARTIFACT';
  if (/organization|organización|company|empresa|client|cliente/.test(type)) return 'ORGANIZATION';
  if (/phenomenon|fenómeno/.test(type)) return 'PHENOMENON';
  return 'CASE';
}

function temporalScopeFor(row: RootRow, subject: MihmObservationSubject): MihmTemporalScope {
  if (subject === 'WORLD_CONTEXT') return 'CURRENT_WORLD_STATE';
  if (subject === 'PERSON') return text(row, ['session_id', 'sessionId']) ? 'SESSION' : 'POINT_IN_TIME';
  const span = numberValue(row, ['observation_span_days', 'span_days', 'age_days']);
  const status = text(row, ['status', 'stage', 'state'])?.toLowerCase() ?? '';
  if ((span ?? 0) > 1 || /open|active|follow|monitor|pending|abierto|seguimiento/.test(status)) return 'LONGITUDINAL';
  return 'BOUNDED_WINDOW';
}

export type RootCaseMethodology = {
  caseId: string;
  title: string;
  input: MihmMethodSelectionInput;
  resolution: MihmMethodSelectionResult;
  nextAction: 'LINK_EXISTING_PPOI' | 'CREATE_PPOI' | 'RUN_PRIMARY_METHOD' | 'RESOLVE_BLOCKERS';
};

export function resolveRootCaseMethodology(row: RootRow, index = 0): RootCaseMethodology {
  const caseId = text(row, ['id', 'case_id', 'opportunity_id', 'proposal_id']) ?? `root-case-${index + 1}`;
  const title = text(row, ['title', 'name', 'company', 'entity_name', 'label']) ?? `Caso ${index + 1}`;
  const subject = subjectFor(row);
  const temporalScope = temporalScopeFor(row, subject);
  const phenomenonId = text(row, ['phenomenon_id', 'ppoi_phenomenon_id']);
  const input: MihmMethodSelectionInput = {
    subject,
    temporalScope,
    evidenceModalities: evidenceModalities(row),
    subjectId: text(row, ['subject_id', 'object_id', 'entity_id', 'client_id']) ?? caseId,
    ownerId: text(row, ['owner_id', 'created_by']),
    caseId,
    phenomenonId,
    sessionId: text(row, ['session_id', 'moph_session_id']),
    worldContextRequested: subject === 'ORGANIZATION' || subject === 'CASE' || Boolean(row.world_context_requested),
    requiresTrajectory: temporalScope === 'LONGITUDINAL',
    requiresRivalHypothesis: Boolean(row.requires_rival_hypothesis),
    requiresInterventionTracking: Boolean(row.requires_intervention_tracking) || /proposal|intervention|seguimiento/i.test(String(row.stage ?? row.status ?? '')),
    evidenceCount: numberValue(row, ['evidence_count', 'evidenceCount']) ?? 1,
    observationSpanDays: numberValue(row, ['observation_span_days', 'span_days']) ?? (temporalScope === 'LONGITUDINAL' ? 2 : 0),
    isSfiInternal: subject === 'SFI_SYSTEM',
  };
  const resolution = resolveMihmMethod(input);
  const nextAction = resolution.blockers.length
    ? 'RESOLVE_BLOCKERS'
    : resolution.primary?.methodId === 'PPOI'
      ? phenomenonId ? 'LINK_EXISTING_PPOI' : 'CREATE_PPOI'
      : 'RUN_PRIMARY_METHOD';
  return { caseId, title, input, resolution, nextAction };
}

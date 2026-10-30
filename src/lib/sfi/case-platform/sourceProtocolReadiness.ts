/**
 * Case Platform: custom research declares its required SOURCE types in an
 * append-only, source-bounded case RECORD. This is source-coverage readiness,
 * NOT evidence adjudication, intervention authority, ROOT admission or RETURN.
 */
export const SFI_CASE_SOURCE_PROTOCOL_CONTRACT = 'SFI-CASE-SOURCE-PROTOCOL-1.0' as const;
export type CaseSourceProtocolObject = {
  kind: string;
  payload: Record<string, unknown>;
  canonicalRef?: { id?: string };
};
export type CaseSourceReadiness = {
  requiredSources: string[];
  presentSourceTypes: string[];
  missingSources: string[];
  sourceCoverage: number;
  readyForAnalysis: boolean;
  protocolStatus: 'PROFILE_DEFINED' | 'DECLARATION_MISSING' | 'DECLARATION_INVALID' | 'DECLARATION_CONFLICT' | 'DECLARED';
  sourceProtocolRef: string | null;
  boundary: 'SOURCE_TYPES_PRESENT_NOT_ACCEPTED_EVIDENCE_OR_ROOT_AUTHORITY';
};

function validRequiredTypes(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 6) return null;
  if (!raw.every(v => typeof v === 'string' && /^[A-Z][A-Z0-9_]{2,49}$/.test(v)
    && !['DECLARED_BY_PROTOCOL','SOURCE_PROTOCOL_UNAVAILABLE','SOURCE_PROTOCOL_INVALID'].includes(v))) return null;
  const unique = [...new Set(raw as string[])];
  return unique.length === raw.length ? unique : null;
}

export function computeCaseSourceReadiness(
  profileRequirements: readonly string[],
  caseObjects: readonly CaseSourceProtocolObject[],
  caseCutoff: string,
): CaseSourceReadiness {
  const presentSourceTypes = [...new Set(caseObjects
    .filter(o => o.kind === 'SOURCE')
    .map(o => o.payload.sourceType)
    .filter((v): v is string => typeof v === 'string' && Boolean(v.trim()))
  )].sort();

  let requiredSources = [...profileRequirements];
  let protocolStatus: CaseSourceReadiness['protocolStatus'] = 'PROFILE_DEFINED';
  let sourceProtocolRef: string | null = null;
  const sentinel = 'DECLARED_BY_PROTOCOL';
  if (requiredSources.includes(sentinel)) {
    const records = caseObjects.filter(o =>
      o.kind === 'RECORD' && o.payload.contract === SFI_CASE_SOURCE_PROTOCOL_CONTRACT
    );
    if (records.length !== 1) {
      protocolStatus = records.length === 0 ? 'DECLARATION_MISSING' : 'DECLARATION_CONFLICT';
      requiredSources = ['SOURCE_PROTOCOL_UNAVAILABLE'];
    } else {
      const selected = records[0];
      const types = validRequiredTypes(selected.payload.requiredSourceTypes);
      if (!types || selected.payload.caseCutoff !== caseCutoff ||
        selected.payload.observationMode !== 'READ_ONLY' ||
        typeof selected.payload.question !== 'string' || !selected.payload.question.trim()) {
        protocolStatus = 'DECLARATION_INVALID';
        requiredSources = ['SOURCE_PROTOCOL_INVALID'];
      } else {
        protocolStatus = 'DECLARED';
        requiredSources = [...requiredSources.filter(s => s !== sentinel), ...types];
        sourceProtocolRef = selected.canonicalRef?.id ?? null;
      }
    }
  }

  const missingSources = requiredSources.filter(s => !presentSourceTypes.includes(s));
  return {
    requiredSources, presentSourceTypes, missingSources,
    sourceCoverage: requiredSources.length
      ? (requiredSources.length - missingSources.length) / requiredSources.length : 1,
    readyForAnalysis: protocolStatus !== 'DECLARATION_MISSING'
      && protocolStatus !== 'DECLARATION_INVALID'
      && protocolStatus !== 'DECLARATION_CONFLICT'
      && missingSources.length === 0,
    protocolStatus, sourceProtocolRef,
    boundary:'SOURCE_TYPES_PRESENT_NOT_ACCEPTED_EVIDENCE_OR_ROOT_AUTHORITY',
  };
}

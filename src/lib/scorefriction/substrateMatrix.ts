export type ScoreFrictionSubstrateKind =
  | 'text'
  | 'audio'
  | 'image'
  | 'video'
  | 'conversation'
  | 'document'
  | 'repository'
  | 'operation'
  | 'event'
  | 'world_domain'
  | 'multimodal';

export type ScoreFrictionTextSubtype =
  | 'lyrics'
  | 'poem'
  | 'book_fragment'
  | 'post'
  | 'conversation_transcript'
  | 'manifesto'
  | 'report'
  | 'institutional_text'
  | 'technical_document'
  | 'fragment'
  | 'unknown';

export type ScoreFrictionAnalysisCluster =
  | 'semantic'
  | 'narrative'
  | 'acoustic'
  | 'visual'
  | 'temporal'
  | 'relational'
  | 'institutional'
  | 'operational'
  | 'economic'
  | 'digital'
  | 'cultural'
  | 'affective'
  | 'world'
  | 'repository'
  | 'multimodal_coupling';

export type ScoreFrictionSubstrateProfile = {
  kind: ScoreFrictionSubstrateKind;
  subtype?: ScoreFrictionTextSubtype | string | null;
  modalities?: ScoreFrictionSubstrateKind[];
  clusters: ScoreFrictionAnalysisCluster[];
  confidence: number;
  notes: string[];
};

export const SUBSTRATE_CLUSTER_MATRIX: Record<ScoreFrictionSubstrateKind, ScoreFrictionAnalysisCluster[]> = {
  text: ['semantic', 'narrative', 'temporal', 'affective', 'cultural'],
  audio: ['acoustic', 'temporal', 'affective', 'cultural'],
  image: ['visual', 'cultural', 'affective'],
  video: ['visual', 'temporal', 'acoustic', 'narrative', 'cultural'],
  conversation: ['semantic', 'relational', 'temporal', 'affective'],
  document: ['semantic', 'institutional', 'operational', 'temporal'],
  repository: ['repository', 'operational', 'digital', 'temporal', 'institutional'],
  operation: ['operational', 'economic', 'temporal', 'institutional', 'cultural'],
  event: ['temporal', 'cultural', 'institutional', 'affective', 'world'],
  world_domain: ['world', 'cultural', 'economic', 'institutional', 'digital'],
  multimodal: ['multimodal_coupling'],
};

export const TEXT_SUBTYPE_CLUSTER_EXTENSIONS: Partial<Record<ScoreFrictionTextSubtype, ScoreFrictionAnalysisCluster[]>> = {
  lyrics: ['multimodal_coupling'],
  conversation_transcript: ['relational'],
  institutional_text: ['institutional'],
  technical_document: ['operational'],
  report: ['institutional', 'operational'],
  manifesto: ['cultural', 'affective'],
};

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

export function clustersForSubstrate(input: {
  kind: ScoreFrictionSubstrateKind;
  subtype?: ScoreFrictionTextSubtype | string | null;
  modalities?: ScoreFrictionSubstrateKind[] | null;
}): ScoreFrictionAnalysisCluster[] {
  const base = SUBSTRATE_CLUSTER_MATRIX[input.kind] ?? [];
  const modalityClusters = (input.modalities ?? []).flatMap((kind) => SUBSTRATE_CLUSTER_MATRIX[kind] ?? []);
  const textSubtype = input.kind === 'text' && input.subtype
    ? TEXT_SUBTYPE_CLUSTER_EXTENSIONS[input.subtype as ScoreFrictionTextSubtype] ?? []
    : [];

  return unique([
    ...base,
    ...modalityClusters,
    ...textSubtype,
    ...((input.modalities?.length ?? 0) > 1 ? ['multimodal_coupling' as const] : []),
  ]);
}

export function createSubstrateProfile(input: {
  kind: ScoreFrictionSubstrateKind;
  subtype?: ScoreFrictionTextSubtype | string | null;
  modalities?: ScoreFrictionSubstrateKind[] | null;
  confidence?: number | null;
  notes?: string[] | null;
}): ScoreFrictionSubstrateProfile {
  const confidence = typeof input.confidence === 'number' && Number.isFinite(input.confidence)
    ? Math.max(0, Math.min(1, input.confidence))
    : 0.5;

  return {
    kind: input.kind,
    subtype: input.subtype ?? null,
    modalities: input.modalities ?? undefined,
    clusters: clustersForSubstrate(input),
    confidence,
    notes: input.notes ?? [],
  };
}

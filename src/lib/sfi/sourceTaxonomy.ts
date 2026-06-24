export type SfiSourceLayer =
  | 'world_external'
  | 'sfi_internal'
  | 'user_internal'
  | 'case_internal'
  | 'cultural_object'
  | 'execution_state'
  | 'declared_attractor';

type SourceLike = {
  layer?: unknown;
  source_layer?: unknown;
  sourceLayer?: unknown;
  kind?: unknown;
  type?: unknown;
  source_type?: unknown;
  provider?: unknown;
  source?: unknown;
  id?: unknown;
  source_id?: unknown;
};

const layers = new Set<SfiSourceLayer>([
  'world_external',
  'sfi_internal',
  'user_internal',
  'case_internal',
  'cultural_object',
  'execution_state',
  'declared_attractor',
]);

const worldExternalHints = ['world', 'external', 'public', 'news', 'gdelt', 'rss', 'market', 'climate', 'source_health'];
const sfiInternalHints = ['sfi', 'root', 'memory', 'evidence_map', 'internal_evidence'];
const userInternalHints = ['user', 'document', 'upload', 'medium', 'atlas', 'rem618', 'kxtxr'];
const caseInternalHints = ['case', 'campaign', 'brief', 'object_case'];
const culturalObjectHints = ['object', 'text', 'song', 'script', 'cultural_object', 'scorefriction'];
const executionStateHints = ['execution', 'ledger', 'outcome', 'lesson', 'recovery_queue', 'pipeline'];
const declaredAttractorHints = ['attractor', 'declared_attractor', 'future_state', 'alignment'];

function text(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function joinedSourceText(source: SourceLike | string | null | undefined) {
  if (typeof source === 'string') return source.toLowerCase();
  if (!source || typeof source !== 'object') return '';

  return [
    source.layer,
    source.source_layer,
    source.sourceLayer,
    source.kind,
    source.type,
    source.source_type,
    source.provider,
    source.source,
    source.id,
    source.source_id,
  ].map(text).filter(Boolean).join(' ');
}

function hasAny(value: string, hints: string[]) {
  return hints.some((hint) => value.includes(hint));
}

export function classifySourceLayer(source: SourceLike | SfiSourceLayer | string | null | undefined): SfiSourceLayer {
  const explicit = text(typeof source === 'object' && source !== null ? source.layer ?? source.source_layer ?? source.sourceLayer : source);
  if (layers.has(explicit as SfiSourceLayer)) return explicit as SfiSourceLayer;

  const value = joinedSourceText(source);

  if (hasAny(value, declaredAttractorHints)) return 'declared_attractor';
  if (hasAny(value, executionStateHints)) return 'execution_state';
  if (hasAny(value, culturalObjectHints)) return 'cultural_object';
  if (hasAny(value, caseInternalHints)) return 'case_internal';
  if (hasAny(value, userInternalHints)) return 'user_internal';
  if (hasAny(value, sfiInternalHints)) return 'sfi_internal';
  if (hasAny(value, worldExternalHints)) return 'world_external';

  return 'sfi_internal';
}

export function isWorldExternalSource(source: SourceLike | SfiSourceLayer | string | null | undefined) {
  return classifySourceLayer(source) === 'world_external';
}

export function isInternalSfiSource(source: SourceLike | SfiSourceLayer | string | null | undefined) {
  return classifySourceLayer(source) === 'sfi_internal';
}

export function isCaseOrUserSource(source: SourceLike | SfiSourceLayer | string | null | undefined) {
  const layer = classifySourceLayer(source);
  return layer === 'case_internal' || layer === 'user_internal';
}

export function canContributeToWorldSpectCoverage(source: SourceLike | SfiSourceLayer | string | null | undefined) {
  return classifySourceLayer(source) === 'world_external';
}

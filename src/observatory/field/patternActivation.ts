import {
  coreFieldPatterns,
  fieldPatterns,
  type FieldMode,
  type FieldPattern,
} from './patternModel';

type RankInput = {
  command?: string;
  activeNode?: {
    id?: string | null;
    label?: string | null;
    commandMode?: string | null;
  } | string | null;
  fieldMode?: FieldMode | string | null;
  nodeVariables?: string[];
  nodePatterns?: string[];
  recentEvents?: Array<{
    event_name?: string;
    event_type?: string;
    payload?: Record<string, unknown>;
  }>;
  candidates?: FieldPattern[];
};

export type RankedPattern = {
  pattern: FieldPattern;
  score: number;
  matchedTerms: string[];
};

export type PatternRankResult = {
  primaryPattern: RankedPattern | null;
  secondaryPatterns: RankedPattern[];
  hiddenPatterns: RankedPattern[];
  activationScore: number;
};

const genericWords = new Set([
  'sistema',
  'campo',
  'riesgo',
  'operacion',
  'decision',
  'accion',
  'senal',
  'patron',
  'contexto',
  'metrica',
]);

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function activeNodeText(activeNode: RankInput['activeNode']) {
  if (!activeNode) return '';
  if (typeof activeNode === 'string') return normalize(activeNode);
  return normalize(`${activeNode.id || ''} ${activeNode.label || ''} ${activeNode.commandMode || ''}`);
}

function eventText(events: RankInput['recentEvents'] = []) {
  return normalize(events.map((event) => {
    const payload = event.payload || {};
    return [
      event.event_name,
      event.event_type,
      payload.fragment,
      payload.message,
      payload.pattern_id,
    ].filter(Boolean).join(' ');
  }).join(' '));
}

function includesTerm(text: string, term: string) {
  const normalized = normalize(term);
  return normalized.length > 1 && text.includes(normalized);
}

function nodeMatches(pattern: FieldPattern, activeNodeTextValue: string, nodeTerms: string[]) {
  if (!activeNodeTextValue && !nodeTerms.length) return false;
  return pattern.nodos_relacionados.some((node) => includesTerm(activeNodeTextValue, node))
    || nodeTerms.some((term) => pattern.nodos_relacionados.some((node) => includesTerm(node, term) || includesTerm(term, node)))
    || nodeTerms.some((term) => pattern.que_lo_activa.some((trigger) => includesTerm(trigger, term) || includesTerm(term, trigger)));
}

function modeMatches(pattern: FieldPattern, mode: string) {
  if (!mode) return false;
  const normalizedMode = normalize(mode);
  return pattern.nodos_relacionados.some((node) => includesTerm(node, normalizedMode))
    || pattern.que_lo_activa.some((trigger) => includesTerm(trigger, normalizedMode))
    || includesTerm(pattern.que_detecta, normalizedMode);
}

function scorePattern(pattern: FieldPattern, input: RankInput): RankedPattern {
  const commandText = normalize(input.command || '');
  const nodeText = activeNodeText(input.activeNode);
  const modeText = normalize(input.fieldMode || '');
  const recentText = eventText(input.recentEvents);
  const nodeTerms = [...(input.nodeVariables || []), ...(input.nodePatterns || [])].map(normalize);
  const matchedTerms = pattern.que_lo_activa.filter((term) => includesTerm(commandText, term));
  const directMatch = matchedTerms.length > 0;
  const activeNodeMatch = nodeMatches(pattern, nodeText, nodeTerms);
  const activeModeMatch = modeMatches(pattern, modeText);
  const recentMatch = pattern.que_lo_activa.some((term) => includesTerm(recentText, term))
    || includesTerm(recentText, pattern.id)
    || includesTerm(recentText, pattern.palabra);
  const genericOnly = directMatch && matchedTerms.every((term) => genericWords.has(normalize(term)));
  const hasAction = pattern.accion_sugerida.trim().length > 3;
  const isCore = coreFieldPatterns.some((corePattern) => corePattern.id === pattern.id);

  let score = 0;
  score += 0.05;
  if (directMatch) score += 0.4;
  if (activeNodeMatch) score += 0.25;
  if (activeModeMatch) score += 0.2;
  if (recentMatch) score += 0.2;
  if (pattern.nivel_friccion >= 4) score += 0.15;
  if (isCore) score += 0.1;
  if (genericOnly) score -= 0.2;
  if (nodeText && !activeNodeMatch) score -= 0.3;
  if (!hasAction) score -= 0.4;

  return {
    pattern,
    score: clamp(Number(score.toFixed(3))),
    matchedTerms,
  };
}

export function rankDetectedPatterns(input: RankInput): PatternRankResult {
  const candidates = input.candidates?.length ? input.candidates : fieldPatterns;
  const ranked = candidates
    .map((pattern) => scorePattern(pattern, input))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.pattern.nivel_friccion !== a.pattern.nivel_friccion) return b.pattern.nivel_friccion - a.pattern.nivel_friccion;
      const aCore = coreFieldPatterns.some((pattern) => pattern.id === a.pattern.id) ? 1 : 0;
      const bCore = coreFieldPatterns.some((pattern) => pattern.id === b.pattern.id) ? 1 : 0;
      return bCore - aCore;
    });

  const primaryPattern = ranked[0] || null;
  const secondaryPatterns = ranked.slice(1, 3);
  const hiddenPatterns = ranked.slice(3);

  return {
    primaryPattern,
    secondaryPatterns,
    hiddenPatterns,
    activationScore: primaryPattern?.score || 0,
  };
}

import type {
  FieldNodeVector,
  GraphVectorState,
  PatternVector,
  UserSignalVector,
} from './vectorTypes';
import type { PatternRankResult } from './patternActivation';

const weights = {
  patternPrimary: 0.45,
  patternSecondary: 0.18,
  userSignal: 0.2,
  mihm: 0.1,
  trace: 0.07,
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function includesTerm(text: string, term: string) {
  return term.length > 1 && text.includes(term);
}

function nodeText(nodeVector: FieldNodeVector) {
  return [
    nodeVector.nodeId,
    nodeVector.label,
    nodeVector.commandMode,
    nodeVector.cluster,
    ...nodeVector.variables,
    ...nodeVector.patterns,
    ...nodeVector.linkedSfNodes,
    ...nodeVector.relationIds,
  ].join(' ').toLowerCase();
}

function semanticPatternBoost(patternId: string, nodeVector: FieldNodeVector) {
  const text = nodeText(nodeVector);
  if (patternId.includes('decision') || patternId.includes('incertidumbre') || patternId.includes('claridad')) {
    if (includesTerm(text, 'project') || includesTerm(text, 'intencion') || includesTerm(text, 'bitacora') || includesTerm(text, 'amv') || includesTerm(text, 'trazabilidad') || includesTerm(text, 'evidencia')) return 0.72;
  }
  if (patternId.includes('compliance') || patternId.includes('ficcion') || patternId.includes('metrica')) {
    if (includesTerm(text, 'mihm') || includesTerm(text, 'trazabilidad') || includesTerm(text, 'friccion') || includesTerm(text, 'coherencia')) return 0.78;
  }
  if (patternId.includes('nadie') || patternId.includes('persistencia') || patternId.includes('responsabilidad')) {
    if (includesTerm(text, 'bitacora') || includesTerm(text, 'trazabilidad') || includesTerm(text, 'gobernanza') || includesTerm(text, 'project')) return 0.76;
  }
  if (patternId.includes('contexto') || patternId.includes('origen')) {
    if (includesTerm(text, 'trazabilidad') || includesTerm(text, 'evidencia') || includesTerm(text, 'memoria') || includesTerm(text, 'bitacora')) return 0.68;
  }
  return 0;
}

function intentBoost(intent: string | null, nodeVector: FieldNodeVector) {
  const text = nodeText(nodeVector);
  if (intent === 'salida_publica') {
    if (includesTerm(text, 'project') || includesTerm(text, 'intencion') || includesTerm(text, 'bitacora') || includesTerm(text, 'amv') || includesTerm(text, 'trazabilidad') || includesTerm(text, 'evidencia')) return 0.95;
    if (includesTerm(text, 'media')) return 0.45;
  }
  if (intent === 'validacion_operativa') {
    if (includesTerm(text, 'mihm') || includesTerm(text, 'trazabilidad') || includesTerm(text, 'friccion') || includesTerm(text, 'coherencia')) return 0.72;
  }
  if (intent === 'decision_implicita') {
    if (includesTerm(text, 'bitacora') || includesTerm(text, 'trazabilidad') || includesTerm(text, 'gobernanza') || includesTerm(text, 'project')) return 0.72;
  }
  if (intent === 'trazabilidad') {
    if (includesTerm(text, 'trazabilidad') || includesTerm(text, 'evidencia') || includesTerm(text, 'bitacora')) return 0.75;
  }
  if (intent === 'friccion_de_accion') {
    if (includesTerm(text, 'project') || includesTerm(text, 'intervencion') || includesTerm(text, 'amv') || includesTerm(text, 'intencion')) return 0.68;
  }
  return 0;
}

export function scorePatternToNode(patternVector: PatternVector, nodeVector: FieldNodeVector) {
  const text = nodeText(nodeVector);
  const related = patternVector.relatedNodes.some((node) => includesTerm(text, node.toLowerCase()));
  const terms = patternVector.activationTerms.some((term) => includesTerm(text, term.toLowerCase()));
  const directPattern = nodeVector.patterns.some((pattern) => pattern === patternVector.patternId || includesTerm(patternVector.patternId, pattern.toLowerCase()));
  return clamp((related ? 0.45 : 0) + (terms ? 0.25 : 0) + (directPattern ? 0.25 : 0) + semanticPatternBoost(patternVector.patternId, nodeVector) + patternVector.frictionLevel * 0.02);
}

export function scoreUserSignalToNode(userSignal: UserSignalVector, nodeVector: FieldNodeVector) {
  const text = nodeText(nodeVector);
  const command = userSignal.normalizedCommand;
  const directNode = userSignal.activeNodeId && userSignal.activeNodeId === nodeVector.nodeId;
  const matched = userSignal.matchedTerms.some((term) => includesTerm(text, term.toLowerCase()) || includesTerm(command, term.toLowerCase()));
  const mode = includesTerm(text, String(userSignal.fieldMode).toLowerCase());
  return clamp((directNode ? 0.45 : 0) + (matched ? 0.35 : 0) + (mode ? 0.15 : 0) + intentBoost(userSignal.detectedIntent, nodeVector) + (userSignal.evidencePresent ? 0.05 : 0));
}

export function scoreMihmToNode(nodeVector: FieldNodeVector) {
  const text = nodeText(nodeVector);
  if (nodeVector.mihmVariables.length > 0) return 0.8;
  if (includesTerm(text, 'mihm') || includesTerm(text, 'estabilidad')) return 0.7;
  if (includesTerm(text, 'trazabilidad') || includesTerm(text, 'latencia') || includesTerm(text, 'friccion')) return 0.35;
  return 0.08;
}

export function scoreTraceToNode(nodeVector: FieldNodeVector) {
  const text = nodeText(nodeVector);
  if (nodeVector.docRefs.length > 0) return 0.75;
  if (includesTerm(text, 'trazabilidad') || includesTerm(text, 'evidencia') || includesTerm(text, 'bitacora')) return 0.5;
  if (nodeVector.linkedSfNodes.length > 0) return 0.25;
  return 0.06;
}

export function computeNodeActivation(input: {
  nodeVector: FieldNodeVector;
  rankedPatterns: PatternRankResult;
  userSignal: UserSignalVector;
}) {
  const { nodeVector, rankedPatterns, userSignal } = input;
  const primary = rankedPatterns.primaryPattern
    ? scorePatternToNode({
      patternId: rankedPatterns.primaryPattern.pattern.id,
      palabra: rankedPatterns.primaryPattern.pattern.palabra,
      activationTerms: rankedPatterns.primaryPattern.pattern.que_lo_activa,
      relatedNodes: rankedPatterns.primaryPattern.pattern.nodos_relacionados,
      frictionLevel: rankedPatterns.primaryPattern.pattern.nivel_friccion,
      action: rankedPatterns.primaryPattern.pattern.accion_sugerida,
      isCore: !rankedPatterns.primaryPattern.pattern.id.startsWith('cs-'),
    }, nodeVector)
    : 0;

  const secondary = rankedPatterns.secondaryPatterns.reduce((max, item) => Math.max(max, scorePatternToNode({
    patternId: item.pattern.id,
    palabra: item.pattern.palabra,
    activationTerms: item.pattern.que_lo_activa,
    relatedNodes: item.pattern.nodos_relacionados,
    frictionLevel: item.pattern.nivel_friccion,
    action: item.pattern.accion_sugerida,
    isCore: !item.pattern.id.startsWith('cs-'),
  }, nodeVector)), 0);

  const user = scoreUserSignalToNode(userSignal, nodeVector);
  const mihm = scoreMihmToNode(nodeVector);
  const trace = scoreTraceToNode(nodeVector);

  let activation = clamp(
    nodeVector.baseWeight * 0.12
    + primary * weights.patternPrimary
    + secondary * weights.patternSecondary
    + user * weights.userSignal
    + mihm * weights.mihm
    + trace * weights.trace,
  );
  if (nodeVector.commandMode === 'mihm' && userSignal.detectedIntent === 'salida_publica') activation = Math.min(activation, 0.42);
  if (nodeVector.commandMode === 'mihm' && userSignal.detectedIntent === 'decision_implicita') activation = Math.min(activation, 0.45);
  return activation;
}

export function topActivatedNodeIds(graphVectorState: Pick<GraphVectorState, 'nodeVectors'>, count = 5) {
  return [...graphVectorState.nodeVectors]
    .sort((a, b) => b.activation - a.activation)
    .slice(0, count)
    .map((node) => node.nodeId);
}

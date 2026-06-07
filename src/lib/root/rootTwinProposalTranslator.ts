import { classifyRootLayer } from './rootLayers';
import { getRootLayerLabel } from './rootLayerLabels';
import { translateRootNode } from './rootNodeTranslator';
import { translateRootState, type RootStateTranslation } from './rootStateTranslator';

export type RootTwinProposalKind = 'proposal' | 'mutation' | 'evidence' | 'pending_action' | 'executed_action';

export type RootTwinProposalTranslation = {
  id: string;
  operationalTitle: string;
  reason: string;
  evidence: string;
  affectedNode: string;
  affectedAttractor: string;
  consequenceIfAccepted: string;
  consequenceIfRejected: string;
  state: RootStateTranslation;
  date: string;
  expiresAt: string;
  result: string;
  derivedLearning: string;
  missing: string;
  recommendedAction: string;
  kind: RootTwinProposalKind;
  layerLabel: string;
};

type VisibleRecord = Record<string, unknown>;

function record(value: unknown): VisibleRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as VisibleRecord : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => {
      if (typeof item === 'string') return item;
      const itemRecord = record(item);
      return text(itemRecord.label) || text(itemRecord.title) || text(itemRecord.name) || text(itemRecord.nodeKey) || text(itemRecord.documentId) || text(itemRecord.patternId);
    }).filter((item): item is string => Boolean(item))
    : [];
}

function firstText(source: VisibleRecord, keys: string[]) {
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return undefined;
}

function payloads(proposal: VisibleRecord) {
  const expected = record(proposal.expected_field_delta);
  const payload = {
    ...record(proposal.linked_event_payload),
    ...record(proposal.payload),
    ...record(expected.payload),
  };
  const innerProposal = record(payload.proposal);
  const seedEvidence = record(payload.seed_evidence);
  const summary = record(proposal.visor_summary);
  return { expected, payload, innerProposal, seedEvidence, summary };
}

function idFor(proposal: VisibleRecord, index: number) {
  return firstText(proposal, ['id', 'proposal_id', 'event_id']) ?? `twin-proposal-${index}`;
}

function titleFor(proposal: VisibleRecord, innerProposal: VisibleRecord, expected: VisibleRecord, index: number) {
  return firstText(innerProposal, ['title', 'objective', 'requested_output', 'label', 'name'])
    ?? firstText(expected, ['objective', 'title'])
    ?? firstText(proposal, ['title', 'objective', 'label', 'proposalType', 'proposal_type'])
    ?? `propuesta visible ${index + 1}`;
}

function dateFor(proposal: VisibleRecord) {
  return firstText(proposal, ['created_at', 'createdAt', 'updated_at', 'updatedAt', 'timestamp', 'occurred_at'])
    ?? 'sin fecha visible';
}

function expiryFor(proposal: VisibleRecord, innerProposal: VisibleRecord) {
  return firstText(innerProposal, ['expires_at', 'expiresAt', 'deadline', 'valid_until', 'caducity'])
    ?? firstText(proposal, ['expires_at', 'expiresAt', 'deadline', 'valid_until'])
    ?? 'sin caducidad visible';
}

function proposalType(proposal: VisibleRecord, innerProposal: VisibleRecord, expected: VisibleRecord) {
  return firstText(proposal, ['proposalType', 'proposal_type', 'type'])
    ?? firstText(innerProposal, ['proposalType', 'proposal_type', 'type'])
    ?? firstText(expected, ['proposalType', 'proposal_type'])
    ?? 'proposal';
}

function kindFor(proposal: VisibleRecord, innerProposal: VisibleRecord, expected: VisibleRecord): RootTwinProposalKind {
  const raw = `${proposalType(proposal, innerProposal, expected)} ${firstText(proposal, ['status', 'state']) ?? ''}`.toLowerCase();
  if (raw.includes('evidence')) return 'evidence';
  if (raw.includes('mutation') || raw.includes('mutacion')) return 'mutation';
  if (raw.includes('outcome') || raw.includes('executed') || raw.includes('realized')) return 'executed_action';
  if (raw.includes('queued') || raw.includes('pending') || raw.includes('action')) return 'pending_action';
  return 'proposal';
}

function evidenceFor(proposal: VisibleRecord, seedEvidence: VisibleRecord, summary: VisibleRecord) {
  const direct = firstText(proposal, ['evidence', 'evidence_summary'])
    ?? firstText(seedEvidence, ['summary', 'evidence_summary'])
    ?? firstText(summary, ['evidence', 'hypothesis']);
  if (direct) return direct;

  const seedSummary = record(proposal.seedEvidenceSummary);
  const nodeNames = stringList(seedSummary.nodeNames).concat(stringList(summary.seed_nodes));
  const patternNames = stringList(seedSummary.patternNames).concat(stringList(summary.seed_patterns));
  const documentNames = stringList(seedSummary.documentNames).concat(stringList(summary.seed_documents));
  const nodeCount = numberValue(seedSummary.nodes) ?? stringList(seedEvidence.nodes).length;
  const patternCount = numberValue(seedSummary.patterns) ?? stringList(seedEvidence.patterns).length;
  const documentCount = numberValue(seedSummary.documents) ?? stringList(seedEvidence.documents).length;
  const parts = [
    nodeNames.length ? `nodos: ${nodeNames.slice(0, 3).join(', ')}` : nodeCount ? `${nodeCount} nodo(s) sin nombre visible` : undefined,
    patternNames.length ? `patrones: ${patternNames.slice(0, 3).join(', ')}` : patternCount ? `${patternCount} patron(es) sin nombre visible` : undefined,
    documentNames.length ? `documentos: ${documentNames.slice(0, 3).join(', ')}` : documentCount ? `${documentCount} documento(s) sin nombre visible` : undefined,
  ].filter(Boolean);

  return parts.length ? parts.join(' / ') : 'sin evidencia visible suficiente';
}

function affectedNodeFor(proposal: VisibleRecord, innerProposal: VisibleRecord, summary: VisibleRecord) {
  const node = firstText(innerProposal, ['node_id', 'nodeId', 'selected_node', 'selectedNode', 'target_node_id', 'targetNodeId'])
    ?? firstText(proposal, ['node_id', 'nodeId'])
    ?? firstText(summary, ['node_id']);
  if (!node) return 'sin nodo afectado visible';
  return translateRootNode({ id: node, label: node, nodeType: 'proposal_target' }, node).operationalName;
}

function affectedAttractorFor(proposal: VisibleRecord, innerProposal: VisibleRecord, expected: VisibleRecord) {
  const attractor = firstText(innerProposal, ['attractor', 'attractor_id', 'attractorId', 'direction', 'vector_direction'])
    ?? firstText(expected, ['attractor', 'direction'])
    ?? firstText(proposal, ['attractor', 'direction']);
  if (attractor) return attractor;
  const type = proposalType(proposal, innerProposal, expected).toLowerCase();
  return type.includes('attractor') || type.includes('atractor') ? 'atractor propuesto sin identificador visible' : 'sin atractor afectado visible';
}

function resultFor(proposal: VisibleRecord, payload: VisibleRecord) {
  const outcome = record(proposal.outcome ?? payload.outcome);
  return firstText(outcome, ['result', 'summary', 'status', 'notes'])
    ?? firstText(proposal, ['result', 'outcome_status', 'outcome'])
    ?? 'sin resultado visible';
}

function learningFor(proposal: VisibleRecord, payload: VisibleRecord) {
  const outcome = record(proposal.outcome ?? payload.outcome);
  return firstText(outcome, ['learning', 'derived_learning', 'lesson'])
    ?? firstText(proposal, ['learning', 'derived_learning', 'lesson'])
    ?? 'sin aprendizaje derivado visible';
}

function missingFor(evidence: string, node: string, state: RootStateTranslation, result: string) {
  const missing: string[] = [];
  if (evidence === 'sin evidencia visible suficiente') missing.push('evidencia visible');
  if (node === 'sin nodo afectado visible') missing.push('nodo afectado');
  if (state.normalizedState === 'accepted') missing.push('Accion de Realidad verificada');
  if (result === 'sin resultado visible' && ['queued', 'accepted', 'pending'].includes(state.normalizedState)) missing.push('resultado o cierre');
  return missing.length ? `falta ${missing.join(', ')}` : 'sin faltante critico visible';
}

export function translateRootTwinProposal(value: unknown, index = 0): RootTwinProposalTranslation {
  const proposal = record(value);
  const { expected, payload, innerProposal, seedEvidence, summary } = payloads(proposal);
  const id = idFor(proposal, index);
  const type = proposalType(proposal, innerProposal, expected);
  const state = translateRootState(firstText(proposal, ['status', 'state', 'runtimeState']) ?? firstText(innerProposal, ['status', 'state']) ?? 'proposed');
  const classification = classifyRootLayer({
    id,
    title: titleFor(proposal, innerProposal, expected, index),
    type,
    state: state.normalizedState,
    tags: [type, state.normalizedState],
    payload: proposal,
  });
  const evidence = evidenceFor(proposal, seedEvidence, summary);
  const node = affectedNodeFor(proposal, innerProposal, summary);
  const result = resultFor(proposal, payload);
  const missing = missingFor(evidence, node, state, result);
  const kind = kindFor(proposal, innerProposal, expected);

  return {
    id,
    operationalTitle: titleFor(proposal, innerProposal, expected, index),
    reason: firstText(innerProposal, ['reason', 'why', 'rationale', 'hypothesis'])
      ?? firstText(summary, ['objective', 'hypothesis'])
      ?? 'Twin / AMV propone una lectura; el motivo especifico no esta declarado.',
    evidence,
    affectedNode: node,
    affectedAttractor: affectedAttractorFor(proposal, innerProposal, expected),
    consequenceIfAccepted: kind === 'executed_action'
      ? 'Aceptar lectura del resultado no crea evidencia externa nueva; requiere testigo visible.'
      : 'Queda autorizada o preparada dentro del sistema, pero no cuenta como realidad modificada sin ejecucion verificable.',
    consequenceIfRejected: 'La direccion queda descartada o pendiente de nueva evidencia; no debe seguir empujando el campo.',
    state,
    date: dateFor(proposal),
    expiresAt: expiryFor(proposal, innerProposal),
    result,
    derivedLearning: learningFor(proposal, payload),
    missing,
    recommendedAction: missing === 'sin faltante critico visible' ? state.recommendedAction : `${state.recommendedAction} Antes de cerrar: ${missing}.`,
    kind,
    layerLabel: getRootLayerLabel(classification.layer).label,
  };
}

export function translateRootTwinProposals(values: unknown[] | undefined): RootTwinProposalTranslation[] {
  return Array.isArray(values) ? values.map(translateRootTwinProposal) : [];
}

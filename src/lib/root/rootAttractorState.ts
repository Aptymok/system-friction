import { classifyRootLayer } from './rootLayers';
import { getRootLayerLabel } from './rootLayerLabels';
import { translateRootTwinProposals } from './rootTwinProposalTranslator';
import { detectRootEjectors, type RootEjector } from './rootEjectorDetector';

export type RootAttractorSupport = {
  label: string;
  source: string;
  directionalWeight: string;
};

export type RootAttractorState = {
  activeAttractor: string;
  currentDirection: string;
  stabilizationForce: string;
  supportingEvidence: RootAttractorSupport[];
  reinforcingPatterns: string[];
  ejectors: RootEjector[];
  directionalWeight: string;
  externalValidation: string;
  closedCircuitRisk: string;
  recommendedAction: string;
  sufficient: boolean;
};

type VisibleRecord = Record<string, unknown>;

function record(value: unknown): VisibleRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as VisibleRecord : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function title(value: unknown, fallback: string) {
  const item = record(value);
  const payload = record(item.payload);
  const proposal = record(payload.proposal);
  return text(item.title) || text(item.label) || text(item.name) || text(proposal.title) || text(proposal.objective) || text(item.id) || fallback;
}

function directionalWeight(value: unknown) {
  const item = record(value);
  const payload = record(item.payload);
  const proposal = record(payload.proposal);
  const weight = item.directionalWeight ?? item.directional_weight ?? proposal.directionalWeight ?? proposal.directional_weight;
  if (typeof weight === 'number' && Number.isFinite(weight)) {
    if (weight >= 0.75) return 'alto declarado';
    if (weight >= 0.4) return 'medio declarado';
    return 'bajo declarado';
  }
  if (typeof weight === 'string' && weight.trim()) return weight.trim();
  return null;
}

function externalValidation(value: unknown) {
  const item = record(value);
  const payload = record(item.payload);
  const proposal = record(payload.proposal);
  return text(item.externalValidation)
    || text(item.external_validation)
    || text(proposal.externalValidation)
    || text(proposal.external_validation)
    || text(item.validator)
    || null;
}

function supportFrom(value: unknown, fallback: string): RootAttractorSupport | null {
  const item = record(value);
  const weight = directionalWeight(item);
  const classification = classifyRootLayer({ ...item, title: title(item, fallback), directionalWeight: item.directionalWeight ?? item.directional_weight });
  if (!weight || classification.layer === 'sandbox' || classification.layer === 'technical_audit') return null;
  return {
    label: title(item, fallback),
    source: text(item.source) || text(item.sourceType) || text(item.documentId) || 'fuente visible sin detalle',
    directionalWeight: weight,
  };
}

function patternsFrom(values: unknown[]) {
  return values.map((item, index) => {
    const pattern = record(item);
    const weight = directionalWeight(pattern);
    const classification = classifyRootLayer({ ...pattern, title: title(pattern, `patron ${index + 1}`), directionalWeight: pattern.directionalWeight ?? pattern.directional_weight });
    if (!weight || classification.layer === 'sandbox' || classification.layer === 'technical_audit') return null;
    return title(pattern, `patron ${index + 1}`);
  }).filter((item): item is string => Boolean(item)).slice(0, 6);
}

export function buildRootAttractorState(input: unknown): RootAttractorState {
  const root = record(input);
  const data = Object.keys(record(root.data)).length ? record(root.data) : root;
  const seed = record(data.seed);
  const proposals = translateRootTwinProposals(array(data.proposals));
  const directionalProposal = proposals.find((proposal) => !proposal.affectedAttractor.startsWith('sin atractor'));
  const supports = [
    ...array(seed.documentCatalog).map((item, index) => supportFrom(item, `evidencia ${index + 1}`)),
    ...array(data.proposals).map((item, index) => supportFrom(item, `propuesta ${index + 1}`)),
    ...array(seed.executionCatalog).map((item, index) => supportFrom(item, `ejecucion ${index + 1}`)),
  ].filter((item): item is RootAttractorSupport => Boolean(item));
  const patterns = patternsFrom(array(seed.patternCatalog));
  const ejectors = detectRootEjectors(data);
  const validation = [
    ...array(seed.documentCatalog).map(externalValidation),
    ...array(data.proposals).map(externalValidation),
  ].find(Boolean);
  if (!directionalProposal || supports.length === 0) {
    return {
      activeAttractor: 'Sin lectura suficiente.',
      currentDirection: directionalProposal?.affectedAttractor ?? 'Sin lectura suficiente.',
      stabilizationForce: 'Sin lectura suficiente.',
      supportingEvidence: [],
      reinforcingPatterns: patterns,
      ejectors,
      directionalWeight: 'Sin lectura suficiente.',
      externalValidation: validation ?? 'sin validacion externa visible',
      closedCircuitRisk: 'Sin lectura suficiente.',
      recommendedAction: 'declarar ausencia de peso direccional; no fortalecer atractor hasta tener evidencia con peso direccional visible.',
      sufficient: false,
    };
  }

  const highSupport = supports.some((support) => support.directionalWeight.includes('alto'));
  const mediumSupport = supports.some((support) => support.directionalWeight.includes('medio'));
  return {
    activeAttractor: directionalProposal.affectedAttractor,
    currentDirection: directionalProposal.affectedAttractor,
    stabilizationForce: highSupport ? 'alta declarada por soporte direccional visible' : mediumSupport ? 'media declarada por soporte direccional visible' : 'baja o parcial; requiere validacion externa',
    supportingEvidence: supports.slice(0, 6),
    reinforcingPatterns: patterns,
    ejectors,
    directionalWeight: highSupport ? 'alto visible' : mediumSupport ? 'medio visible' : 'bajo visible',
    externalValidation: validation ?? 'sin validacion externa visible',
    closedCircuitRisk: validation && ejectors.filter((item) => item.severity === 'high' || item.severity === 'critical').length === 0
      ? 'bajo visible; existe validacion externa y no hay eyector fuerte declarado'
      : 'Sin lectura suficiente.',
    recommendedAction: validation
      ? 'mantener trazabilidad y verificar que la accion real exista antes de fortalecer atractor.'
      : 'buscar validacion externa o Accion de Realidad verificable antes de consolidar direccion.',
    sufficient: true,
  };
}

export function describeAttractorLayer(value: unknown) {
  const classification = classifyRootLayer(value);
  return getRootLayerLabel(classification.layer).label;
}

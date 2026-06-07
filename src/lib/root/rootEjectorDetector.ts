import { classifyRootLayer } from './rootLayers';
import { getRootLayerLabel } from './rootLayerLabels';
import { translateRootState } from './rootStateTranslator';

export type RootEjectorSeverity = 'critical' | 'high' | 'medium' | 'low';

export type RootEjector = {
  name: string;
  effect: string;
  origin: string;
  severity: RootEjectorSeverity;
  affectedLayer: string;
  recommendedAction: string;
  status: 'active' | 'possible';
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

function nameFor(value: unknown, fallback: string) {
  const item = record(value);
  const payload = record(item.payload);
  const proposal = record(payload.proposal);
  return text(item.title)
    || text(item.label)
    || text(item.name)
    || text(proposal.title)
    || text(proposal.objective)
    || text(item.id)
    || fallback;
}

function statusFor(value: unknown) {
  const item = record(value);
  return text(item.status) || text(item.state) || text(item.runtimeState) || text(item.sourceState) || text(item.source_state) || 'missing';
}

function sourceFor(value: unknown) {
  const item = record(value);
  return text(item.source)
    || text(item.sourceType)
    || text(item.proposal_type)
    || text(item.proposalType)
    || text(item.nodeType)
    || text(item.type)
    || 'origen no visible';
}

function severityFor(state: string, layer: string): RootEjectorSeverity {
  const translated = translateRootState(state);
  if (translated.severity === 'critical') return 'critical';
  if (layer === 'sandbox') return 'high';
  if (translated.normalizedState === 'degraded' || translated.normalizedState === 'failed') return 'high';
  if (['queued', 'pending', 'accepted', 'proposed'].includes(translated.normalizedState)) return 'medium';
  return 'low';
}

function ejectorFrom(value: unknown, fallback: string): RootEjector | null {
  const item = record(value);
  const status = statusFor(item);
  const translated = translateRootState(status);
  const classification = classifyRootLayer({
    ...item,
    state: status,
    status,
    title: nameFor(item, fallback),
  });
  const missingEvidence = !array(item.linkedDocuments).length && !array(item.evidence).length && !record(item.seedEvidenceSummary).documents;
  const openState = ['queued', 'pending', 'accepted', 'proposed', 'design_approved'].includes(translated.normalizedState);
  const degraded = ['degraded', 'failed', 'missing', 'blocked'].includes(translated.normalizedState);
  const sandbox = classification.layer === 'sandbox';
  const audit = classification.layer === 'technical_audit';

  if (!sandbox && !degraded && !openState && !missingEvidence && !audit) return null;

  const severity = severityFor(status, classification.layer);
  const possible = missingEvidence || audit || openState;
  return {
    name: nameFor(item, fallback),
    effect: sandbox
      ? 'Puede contaminar la lectura si se mezcla con evidencia real.'
      : degraded
        ? 'Reduce confiabilidad y puede desviar decisiones si no se reobserva.'
        : openState
          ? 'Mantiene decision abierta y puede debilitar cierre del campo.'
          : 'Puede parecer soporte, pero falta relacion direccional visible.',
    origin: sourceFor(item),
    severity,
    affectedLayer: getRootLayerLabel(classification.layer).label,
    recommendedAction: sandbox
      ? 'mantener en Sandbox; no alimentar regimen ni atractor.'
      : degraded
        ? 'reobservar fuente, causa y evidencia antes de usar.'
        : openState
          ? 'cerrar, ejecutar con evidencia verificable, reobservar o archivar.'
          : 'declarar como posible eyector hasta tener datos suficientes.',
    status: possible && severity !== 'critical' ? 'possible' : 'active',
  };
}

export function detectRootEjectors(input: unknown): RootEjector[] {
  const root = record(input);
  const data = Object.keys(record(root.data)).length ? record(root.data) : root;
  const seed = record(data.seed);
  const items = [
    ...array(seed.nodeCatalog),
    ...array(seed.documentCatalog),
    ...array(seed.patternCatalog),
    ...array(seed.executionCatalog),
    ...array(seed.recentEvents),
    ...array(data.proposals),
    ...array(data.warnings).map((warning) => ({ title: String(warning), status: 'degraded', source: 'warning' })),
  ];

  const seen = new Set<string>();
  return items
    .map((item, index) => ejectorFrom(item, `senal ${index + 1}`))
    .filter((item): item is RootEjector => Boolean(item))
    .filter((item) => {
      const key = `${item.name}:${item.origin}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

import { getRootLayerLabel } from './rootLayerLabels';
import { classifyRootLayer, type RootLayerClassification } from './rootLayers';
import { translateRootState, type RootStateTranslation } from './rootStateTranslator';

export type RootNodeTranslation = {
  id: string;
  operationalName: string;
  function: string;
  cluster: string;
  state: RootStateTranslation;
  generalWeight: string;
  directionalWeight: string;
  dependencies: string[];
  consequenceIfDegrades: string;
  recommendedAction: string;
  layer: RootLayerClassification;
  layerLabel: string;
  evidenceCount: number | null;
};

type RuntimeNodeRecord = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function textArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter((item): item is string => Boolean(item))
    : [];
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function record(value: unknown): RuntimeNodeRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeNodeRecord : {};
}

function nodeId(node: RuntimeNodeRecord, fallback = 'nodo') {
  return text(node.nodeKey) || text(node.id) || text(node.key) || text(node.label) || fallback;
}

function nodeName(node: RuntimeNodeRecord, fallback: string) {
  return text(node.label) || text(node.name) || text(node.title) || nodeId(node, fallback);
}

function nodeKind(node: RuntimeNodeRecord) {
  return `${text(node.nodeType) || ''} ${text(node.ontologyType) || ''} ${text(node.type) || ''}`.toLowerCase();
}

function functionFor(node: RuntimeNodeRecord, layer: RootLayerClassification) {
  const explicit = text(node.function) || text(node.description) || text(node.summary);
  if (explicit) return explicit;
  const raw = `${nodeKind(node)} ${nodeName(node, '')}`.toLowerCase();
  if (raw.includes('evidence') || raw.includes('document') || raw.includes('doc')) return 'Sostiene lectura con evidencia o documento asociado.';
  if (raw.includes('proposal') || raw.includes('acp') || raw.includes('govern')) return 'Ordena decision, propuesta o cierre gobernado.';
  if (raw.includes('mihm') || raw.includes('metric')) return 'Aporta lectura calculada cuando declara objeto observado.';
  if (raw.includes('pattern') || raw.includes('attractor')) return 'Agrupa repeticion o direccion; no prueba ejecucion por si solo.';
  if (layer.layer === 'sfi_archive') return 'Conserva memoria o referencia del sistema.';
  if (layer.layer === 'sandbox') return 'Contiene prueba o simulacion sin afectar regimen.';
  if (layer.layer === 'technical_audit') return 'Permite revisar trazabilidad, fuente o estado tecnico.';
  return 'Nodo operativo del campo vivo.';
}

function clusterFor(node: RuntimeNodeRecord, layer: RootLayerClassification) {
  const explicit = text(node.cluster) || text(node.group);
  if (explicit) return explicit;
  const raw = `${nodeKind(node)} ${nodeName(node, '')}`.toLowerCase();
  if (raw.includes('twin') || raw.includes('usuario') || raw.includes('personal')) return 'Twin / persona';
  if (raw.includes('acp') || raw.includes('govern') || raw.includes('proposal')) return 'Gobierno / decision';
  if (raw.includes('doc') || raw.includes('evidence')) return 'Evidencia / documentos';
  if (raw.includes('mihm') || raw.includes('metric')) return 'Lectura calculada';
  if (raw.includes('pattern') || raw.includes('attractor')) return 'Patrones / atractores';
  return getRootLayerLabel(layer.layer).label;
}

function explicitGeneralWeight(node: RuntimeNodeRecord) {
  const raw = numberValue(node.evidenceWeight) ?? numberValue(node.weight) ?? numberValue(node.confidence);
  if (raw === undefined) return undefined;
  if (raw >= 0.75) return 'alto visible';
  if (raw >= 0.4) return 'medio visible';
  return 'bajo visible';
}

function evidenceCount(node: RuntimeNodeRecord) {
  const explicit = numberValue(node.evidenceCount);
  if (explicit !== undefined) return explicit;
  const linkedDocuments = textArray(node.linkedDocuments).length;
  const linkedEvidence = textArray(node.linkedEvidence).length;
  const documents = Array.isArray(node.documents) ? node.documents.length : 0;
  const total = linkedDocuments + linkedEvidence + documents;
  return total > 0 ? total : null;
}

function generalWeightFor(node: RuntimeNodeRecord) {
  const explicit = explicitGeneralWeight(node);
  if (explicit) return explicit;
  const count = evidenceCount(node);
  if (count === null) return 'sin peso declarado';
  if (count >= 3) return 'medio por evidencia visible';
  if (count >= 1) return 'bajo por evidencia visible';
  return 'sin peso declarado';
}

function directionalWeightFor(node: RuntimeNodeRecord, layer: RootLayerClassification) {
  const explicit = numberValue(node.directionalWeight);
  if (explicit !== undefined) {
    if (explicit >= 0.75) return 'alto declarado';
    if (explicit >= 0.4) return 'medio declarado';
    return 'bajo declarado';
  }
  const raw = `${nodeKind(node)} ${nodeName(node, '')}`.toLowerCase();
  if (layer.layer === 'attractor') return 'requiere Accion de Realidad verificable para pesar';
  if (raw.includes('attractor') || raw.includes('atractor')) return 'posible direccion sin ejecucion verificada';
  return 'no aplica visible';
}

function dependenciesFor(node: RuntimeNodeRecord) {
  const dependencies = [
    ...textArray(node.dependencies),
    ...textArray(node.dependsOn),
    ...textArray(node.linkedNodes),
    ...textArray(node.linkedSfNodes),
    ...textArray(node.linkedDocuments),
  ];
  return [...new Set(dependencies)].slice(0, 8);
}

function consequenceFor(layer: RootLayerClassification, state: RootStateTranslation) {
  if (state.severity === 'critical') return 'Puede bloquear lectura o decision hasta resolver evidencia, fase o autorizacion.';
  if (layer.layer === 'sandbox') return 'Debe permanecer contenido; si se degrada no afecta regimen real.';
  if (layer.layer === 'attractor') return 'Puede empujar direccion falsa si no se vincula a Accion de Realidad verificable.';
  if (layer.layer === 'living_observatory') return 'Puede contaminar el campo vivo o aumentar deuda si queda abierto.';
  if (layer.layer === 'technical_audit') return 'Puede ocultar trazabilidad y dificultar lectura posterior.';
  return 'Puede volver obsoleta una referencia o memoria si no se reobserva.';
}

export function translateRootNode(value: unknown, fallbackId = 'nodo'): RootNodeTranslation {
  const node = record(value);
  const id = nodeId(node, fallbackId);
  const name = nodeName(node, id);
  const rawState = text(node.runtimeState) || text(node.state) || text(node.status) || 'missing';
  const layer = classifyRootLayer({
    id,
    title: name,
    type: text(node.nodeType) || text(node.ontologyType) || text(node.type),
    state: rawState,
    source: text(node.source),
    tags: [
      ...textArray(node.tags),
      ...textArray(node.patterns),
      ...textArray(node.variables),
      ...textArray(node.layers),
    ],
    payload: node,
  });
  const state = translateRootState(rawState);
  const layerLabel = getRootLayerLabel(layer.layer).label;

  return {
    id,
    operationalName: name,
    function: functionFor(node, layer),
    cluster: clusterFor(node, layer),
    state,
    generalWeight: generalWeightFor(node),
    directionalWeight: directionalWeightFor(node, layer),
    dependencies: dependenciesFor(node),
    consequenceIfDegrades: consequenceFor(layer, state),
    recommendedAction: state.recommendedAction,
    layer,
    layerLabel,
    evidenceCount: evidenceCount(node),
  };
}

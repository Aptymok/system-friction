import type { RootLayer, RootLayerClassification } from './rootLayers';

export type RootLayerLabel = {
  layer: RootLayer;
  label: string;
  shortLabel: string;
  question: string;
  explanation: string;
  implication: string;
};

export const ROOT_LAYER_LABELS: Record<RootLayer, RootLayerLabel> = {
  sfi_archive: {
    layer: 'sfi_archive',
    label: 'Archivo SFI',
    shortLabel: 'Archivo',
    question: 'Que existe en el corpus?',
    explanation: 'Corpus completo del instituto: catalogo, documentos, frontmatter, patrones historicos, modelos y registros fundacionales.',
    implication: 'Puede informar lectura, pero no declara que algo este operando hoy.',
  },
  living_observatory: {
    layer: 'living_observatory',
    label: 'Observatorio Vivo',
    shortLabel: 'Vivo',
    question: 'Que esta operando ahora?',
    explanation: 'Evidencias activas, senales recientes, WSV diario, MIHM reciente, mutaciones abiertas, patrones candidatos y acciones pendientes.',
    implication: 'Puede afectar la lectura actual, pero no fortalece atractor sin peso direccional y accion verificable.',
  },
  attractor: {
    layer: 'attractor',
    label: 'Atractor',
    shortLabel: 'Atractor',
    question: 'Hacia donde tiende el sistema si sigue actuando igual?',
    explanation: 'Solo elementos con peso direccional suficiente para afectar direccion.',
    implication: 'No puede alimentarse de pruebas, simulaciones ni propuestas aceptadas sin accion de realidad verificada.',
  },
  sandbox: {
    layer: 'sandbox',
    label: 'Sandbox',
    shortLabel: 'Prueba',
    question: 'Que existe, pero no debe afectar nada real?',
    explanation: 'Pruebas tecnicas, simulaciones, tests, datos sin origen suficiente y experimentos no validados.',
    implication: 'No sostiene regimen, no alimenta atractor y no debe mezclarse con evidencia real.',
  },
  technical_audit: {
    layer: 'technical_audit',
    label: 'Auditoria Tecnica',
    shortLabel: 'Auditoria',
    question: 'Que ocurrio internamente?',
    explanation: 'Logs, trazabilidad, eventos de lectura, rutas internas y evidencia tecnica secundaria.',
    implication: 'Sirve para linaje y control, pero no gobierna la experiencia principal.',
  },
};

export function getRootLayerLabel(layer: RootLayer): RootLayerLabel {
  return ROOT_LAYER_LABELS[layer];
}

export function describeRootLayer(classification: RootLayerClassification) {
  const label = getRootLayerLabel(classification.layer);
  return {
    ...label,
    confidence: classification.confidence,
    reason: classification.reason,
    matchedSignals: classification.matchedSignals,
  };
}

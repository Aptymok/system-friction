import type { SfiAsset } from '@/lib/types';
import type { OperationalReading } from '@/lib/sfi/inference';
import { criticalSystemsPatterns } from './criticalSystemsPatterns';

export type FieldLanguageLayer = 'DOCUMENT_LAYER' | 'FIELD_LAYER' | 'TRACE_LAYER';

export type FieldPattern = {
  id: string;
  nombre: string;
  palabra: string;
  oracion_visible: string;
  que_detecta: string;
  que_lo_activa: string[];
  nodos_relacionados: string[];
  accion_sugerida: string;
  nivel_friccion: 1 | 2 | 3 | 4 | 5;
  capa_visible: FieldLanguageLayer;
};

export type FieldMode = 'SFI' | 'CT' | 'NODE_CT';

export type BitacoraEventType =
  | 'FIELD_MODE_CHANGED'
  | 'PATTERN_DETECTED'
  | 'OUTPUT_INHIBITED'
  | 'MIHM_ACTIVATED'
  | 'PATTERN_RANKED'
  | 'GRAPH_VECTOR_STATE_UPDATED'
  | 'WORLD_SPECT_TRIGGER_DETECTED'
  | 'WORLD_SPECT_READING_TRIGGERED'
  | 'OBSERVATION_WINDOW_SUGGESTED'
  | 'WORLD_SPECT_PANEL_OPENED'
  | 'SOCIAL_DRAFT_CREATED'
  | 'SOCIAL_DRAFT_MIHM_REVIEWED'
  | 'SOCIAL_DRAFT_WORLDSPECT_REVIEWED'
  | 'SOCIAL_DRAFT_CONTENT_APPROVED'
  | 'SOCIAL_DRAFT_CONFIRMATION_REQUIRED'
  | 'SOCIAL_DRAFT_ARCHIVED'
  | 'SOCIAL_MANUAL_POST_RECORDED'
  | 'SOCIAL_RETURN_MANUAL_RECORDED'
  | 'SOCIAL_RETURN_CAPTURED'
  | 'ROUTE_SUGGESTED'
  | 'REORGANIZATION_PROPOSED'
  | 'ACTION_ACCEPTED'
  | 'ACTION_REJECTED'
  | 'SANDBOX_CREATED'
  | 'TRACE_LAYER_REQUESTED';

export type BitacoraEntry = {
  id: string;
  event_type: BitacoraEventType;
  message: string;
  node_id?: string;
  pattern_id?: string;
  trace_payload?: Record<string, unknown>;
  created_at: string;
};

export const coreFieldPatterns: FieldPattern[] = [
  {
    id: 'nti',
    nombre: 'Nodo de Trazabilidad Institucional',
    palabra: 'Trazabilidad',
    oracion_visible: 'El sistema puede mostrar de donde salio algo.',
    que_detecta: 'Origen faltante o conclusion sin fuente visible.',
    que_lo_activa: ['consulta de origen', 'decision sin evidencia', 'explicacion solicitada'],
    nodos_relacionados: ['bitacora', 'amv', 'mihm'],
    accion_sugerida: 'Ver origen',
    nivel_friccion: 2,
    capa_visible: 'FIELD_LAYER',
  },
  {
    id: 'latencia',
    nombre: 'Latencia operativa',
    palabra: 'Demora',
    oracion_visible: 'La accion tarda mas que la decision.',
    que_detecta: 'Decision declarada sin paso verificable.',
    que_lo_activa: ['pendiente', 'bloqueo', 'retraso', 'manana', 'no he'],
    nodos_relacionados: ['mihm', 'intervencion', 'calendarizacion'],
    accion_sugerida: 'Elegir una accion pequena',
    nivel_friccion: 3,
    capa_visible: 'FIELD_LAYER',
  },
  {
    id: 'mihm_estabilidad',
    nombre: 'Estabilidad MIHM',
    palabra: 'Estabilidad',
    oracion_visible: 'Mide que sostiene o rompe el sistema.',
    que_detecta: 'Desbalance entre evidencia, ejecucion y demora.',
    que_lo_activa: ['senal inicial', 'asset activo', 'riesgo operativo'],
    nodos_relacionados: ['mihm', 'friccion_sistemica', 'campo_cognitivo'],
    accion_sugerida: 'Validar estado',
    nivel_friccion: 2,
    capa_visible: 'FIELD_LAYER',
  },
  {
    id: 'r16_origen',
    nombre: 'R16 origen',
    palabra: 'Origen',
    oracion_visible: 'Este nodo necesita origen.',
    que_detecta: 'Nodo o conclusion sin traza al nodo raiz.',
    que_lo_activa: ['sin evidencia', 'fuente faltante', 'origen pedido'],
    nodos_relacionados: ['trazabilidad', 'bitacora', 'evidencia'],
    accion_sugerida: 'Anclar evidencia',
    nivel_friccion: 3,
    capa_visible: 'FIELD_LAYER',
  },
  {
    id: 'r17_redistribucion',
    nombre: 'R17 redistribucion',
    palabra: 'Traslado',
    oracion_visible: 'Esto no desaparecio. Se movio a otra parte.',
    que_detecta: 'Friccion no resuelta que cambia de nodo.',
    que_lo_activa: ['repeticion', 'mismo bloqueo', 'nuevo sintoma'],
    nodos_relacionados: ['friccion_recurrente', 'ct', 'intervencion'],
    accion_sugerida: 'Localizar nuevo punto de carga',
    nivel_friccion: 4,
    capa_visible: 'FIELD_LAYER',
  },
  {
    id: 'r18_restauracion',
    nombre: 'R18 restauracion',
    palabra: 'Referencia',
    oracion_visible: 'No hay referencia suficiente. Las decisiones grandes quedan pausadas.',
    que_detecta: 'Baja trazabilidad con velocidad alta de cambio.',
    que_lo_activa: ['NTI bajo', 'sin referencia', 'decision grande'],
    nodos_relacionados: ['mihm', 'trazabilidad', 'nodo_raiz'],
    accion_sugerida: 'Pausar y validar estado',
    nivel_friccion: 5,
    capa_visible: 'FIELD_LAYER',
  },
];

export const fieldPatterns: FieldPattern[] = [
  ...coreFieldPatterns,
  ...criticalSystemsPatterns,
];

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value.toLowerCase()));
}

function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function patternById(id: string) {
  return fieldPatterns.find((pattern) => pattern.id === id);
}

function stateNumber(asset: SfiAsset, key: string, fallback: number) {
  const raw = asset.state_vector?.[key] ?? asset.state_vector?.[key.toLowerCase()];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

export function detectFieldPatterns(input: {
  asset?: SfiAsset | null;
  reading?: OperationalReading | null;
  command?: string;
  selectedNodeId?: string | null;
  eventText?: string;
}): FieldPattern[] {
  const command = normalizeText(input.command || '');
  const eventText = normalizeText(input.eventText || '');
  const reading = input.reading;
  const asset = input.asset;
  const nti = reading?.technical.NTI_obs ?? (asset ? stateNumber(asset, 'NTI_obs', 0.42) : 0.42);
  const ldi = reading?.technical.LDI_hours ?? (asset ? stateNumber(asset, 'LDI_hours', 48) : 24);
  const phi = reading?.technical.PHI_SF ?? (asset ? stateNumber(asset, 'PHI_SF', 0.32) : 0.32);
  const text = normalizeText(`${command} ${eventText} ${reading?.phenomenon || ''} ${reading?.nextAction || ''}`);
  const detected = new Set<FieldPattern>();
  const addById = (id: string) => {
    const pattern = patternById(id);
    if (pattern) detected.add(pattern);
  };

  if (nti < 0.38 || includesAny(text, ['origen', 'evidencia', 'fuente', 'traza'])) detected.add(fieldPatterns[0]);
  if (ldi > 42 || includesAny(text, ['pendiente', 'bloqueo', 'retraso', 'manana', 'no he'])) detected.add(fieldPatterns[1]);
  if (asset || reading) detected.add(fieldPatterns[2]);
  if (nti < 0.3 || includesAny(text, ['sin evidencia', 'sin fuente', 'origen'])) detected.add(fieldPatterns[3]);
  if (includesAny(text, ['repite', 'repeticion', 'mismo', 'otra vez', 'regresa'])) detected.add(fieldPatterns[4]);
  if (nti < 0.3 && (ldi > 62 || phi < 0.22)) detected.add(fieldPatterns[5]);
  if (includesAny(text, ['publicar', 'post', 'pieza', 'copy', 'salida publica'])) {
    addById('cs-009-deuda-de-decision');
    addById('cs-005-escritura-sin-intencion-visible');
    addById('cs-007-contexto-perdido');
  }
  if (includesAny(text, ['no se', 'no s', 'incertidumbre', 'sin reglas', 'ambiguo'])) {
    if (!includesAny(text, ['publicar', 'post', 'pieza', 'copy'])) addById('cs-008-personas-en-alta-incertidumbre');
    if (!includesAny(text, ['publicar', 'post', 'pieza', 'copy'])) addById('cs-030-deuda-de-claridad');
  }
  if (includesAny(text, ['nadie decidio', 'nadie decidi', 'se volvio parte', 'se volvi', 'zona gris'])) {
    addById('cs-001-decisiones-que-nadie-tomo');
    addById('cs-040-persistencia-de-error');
    addById('cs-025-responsabilidad-distribuida');
  }
  if (includesAny(text, ['compliance', 'cumplimiento', 'auditoria'])) {
    addById('cs-003-compliance-como-narrativa');
    addById('cs-026-metricas-vs-realidad');
    addById('cs-020-ficcion-institucional');
  }
  if (includesAny(text, ['alerta', 'alarma', 'indicador', 'monitor'])) {
    addById('cs-006-sistemas-de-alerta-que-nadie-revisa');
    addById('cs-011-alarmas-silenciosas');
  }
  if (includesAny(text, ['umbral', 'limite oficial', 'limite real'])) addById('cs-012-umbrales-oficiales-vs-reales');
  if (includesAny(text, ['contexto', 'se perdio', 'registro incompleto'])) addById('cs-007-contexto-perdido');
  if (includesAny(text, ['metrica', 'numero', 'indicador'])) addById('cs-026-metricas-vs-realidad');
  if (includesAny(text, ['proxy', 'objetivo reemplazado'])) addById('cs-085-evaluacion-de-proxy-vs-objetivo');
  if (includesAny(text, ['dependencia', 'depende de', 'interdependencia'])) {
    addById('cs-034-dependencias-ocultas');
    addById('cs-097-mapeo-de-dependencias-criticas');
  }

  return [...detected].sort((a, b) => b.nivel_friccion - a.nivel_friccion);
}

export function formatFieldAmvReading(patterns: FieldPattern[], reading?: OperationalReading | null) {
  const primary = patterns[0];
  const saw = reading?.phenomenon || 'Hay una senal activa.';
  const means = primary?.oracion_visible || reading?.risk?.detail || 'El campo necesita una accion menor antes de expandirse.';
  const next = primary?.accion_sugerida || reading?.nextAction || 'Elegir una accion verificable.';
  const secondary = patterns.slice(1, 3).map((pattern) => pattern.palabra).filter(Boolean);
  const also = secondary.length ? `\n\nTambien toca: ${secondary.join(', ')}.` : '';

  return `Veo:\n${saw}\n\nSignifica:\n${means}\n\nSigue:\n${next}${also}`;
}

export function buildLowFrictionRoute(input: {
  patterns: FieldPattern[];
  reading?: OperationalReading | null;
  selectedNodeLabel?: string;
}) {
  const primary = input.patterns[0];
  const action = primary?.accion_sugerida || input.reading?.nextAction || 'Elegir una accion verificable';
  const evidence = input.reading?.requiredEvidence?.[0] || 'guardar una evidencia';
  const node = input.selectedNodeLabel || primary?.palabra || 'campo';

  return [
    `Mirar ${node}`,
    action,
    `Cerrar con ${evidence}`,
  ];
}

export function makeBitacoraEntry(input: {
  event_type: BitacoraEventType;
  message: string;
  node_id?: string;
  pattern_id?: string;
  trace_payload?: Record<string, unknown>;
}): BitacoraEntry {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    event_type: input.event_type,
    message: input.message,
    node_id: input.node_id,
    pattern_id: input.pattern_id,
    trace_payload: input.trace_payload,
    created_at: new Date().toISOString(),
  };
}

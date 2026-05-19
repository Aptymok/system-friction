import type { SfiAsset } from '@/lib/types';
import type { OperationalReading } from '@/lib/sfi/inference';

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
  created_at: string;
};

export const fieldPatterns: FieldPattern[] = [
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

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value.toLowerCase()));
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
  const command = input.command?.toLowerCase() || '';
  const eventText = input.eventText?.toLowerCase() || '';
  const reading = input.reading;
  const asset = input.asset;
  const nti = reading?.technical.NTI_obs ?? (asset ? stateNumber(asset, 'NTI_obs', 0.42) : 0.42);
  const ldi = reading?.technical.LDI_hours ?? (asset ? stateNumber(asset, 'LDI_hours', 48) : 48);
  const phi = reading?.technical.PHI_SF ?? (asset ? stateNumber(asset, 'PHI_SF', 0.32) : 0.32);
  const text = `${command} ${eventText} ${reading?.phenomenon || ''} ${reading?.nextAction || ''}`.toLowerCase();
  const detected = new Set<FieldPattern>();

  if (nti < 0.38 || includesAny(text, ['origen', 'evidencia', 'fuente', 'traza'])) detected.add(fieldPatterns[0]);
  if (ldi > 42 || includesAny(text, ['pendiente', 'bloqueo', 'retraso', 'manana', 'no he'])) detected.add(fieldPatterns[1]);
  if (asset || reading) detected.add(fieldPatterns[2]);
  if (nti < 0.3 || includesAny(text, ['sin evidencia', 'sin fuente', 'origen'])) detected.add(fieldPatterns[3]);
  if (includesAny(text, ['repite', 'repeticion', 'mismo', 'otra vez', 'regresa'])) detected.add(fieldPatterns[4]);
  if (nti < 0.3 && (ldi > 62 || phi < 0.22)) detected.add(fieldPatterns[5]);

  return [...detected].sort((a, b) => b.nivel_friccion - a.nivel_friccion).slice(0, 3);
}

export function formatFieldAmvReading(patterns: FieldPattern[], reading?: OperationalReading | null) {
  const primary = patterns[0];
  const saw = primary?.oracion_visible || reading?.phenomenon || 'Hay una senal activa.';
  const means = reading?.risk?.detail || primary?.que_detecta || 'El campo necesita una accion menor antes de expandirse.';
  const next = primary?.accion_sugerida || reading?.nextAction || 'Elegir una accion verificable.';

  return `Veo:\n${saw}\n\nSignifica:\n${means}\n\nSigue:\n${next}`;
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
}): BitacoraEntry {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    event_type: input.event_type,
    message: input.message,
    node_id: input.node_id,
    pattern_id: input.pattern_id,
    created_at: new Date().toISOString(),
  };
}

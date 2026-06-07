import { classifyRootLayer } from './rootLayers';
import { getRootLayerLabel } from './rootLayerLabels';
import { translateRootState } from './rootStateTranslator';

export type RootGovernanceTranslation = {
  state: string;
  reason: string;
  consequence: string;
  nextAction: string;
  affectedLayer: string;
  relatedPhase: string;
};

const BLOCKS: Record<string, Omit<RootGovernanceTranslation, 'state' | 'affectedLayer' | 'relatedPhase'>> = {
  blocked_by_governance: {
    reason: 'Bloqueado por regla de gobernanza.',
    consequence: 'No debe forzarse sin autorizacion raiz y evidencia visible.',
    nextAction: 'revisar regla, evidencia y fase antes de continuar.',
  },
  missing_evidence: {
    reason: 'Bloqueado porque falta evidencia.',
    consequence: 'No puede sostener decision fuerte ni cierre.',
    nextAction: 'adjuntar evidencia verificable o archivar la operacion.',
  },
  simulation_detected: {
    reason: 'Bloqueado porque es simulacion.',
    consequence: 'No sostiene regimen ni atractor.',
    nextAction: 'mantener en Sandbox o reobservar con fuente real.',
  },
  attractor_risk: {
    reason: 'Bloqueado porque puede afectar el atractor.',
    consequence: 'Puede fortalecer una direccion sin soporte real.',
    nextAction: 'exigir peso direccional visible y validacion externa.',
  },
  root_approval_required: {
    reason: 'Bloqueado porque requiere aprobacion raiz.',
    consequence: 'Agentes y Twin no pueden avanzar por cuenta propia.',
    nextAction: 'solicitar decision de Aptymok con motivo y evidencia.',
  },
  phase_not_authorized: {
    reason: 'Bloqueado porque esta fase no autoriza esta operacion.',
    consequence: 'Avanzar seria saltar la secuencia constitucional.',
    nextAction: 'esperar fase correspondiente o documentar bloqueo.',
  },
  unknown_block: {
    reason: 'Bloqueado, pero falta razon visible. Revisar auditoria.',
    consequence: 'No debe tratarse como seguro ni cerrado.',
    nextAction: 'revisar linaje tecnico secundario.',
  },
};

type VisibleRecord = Record<string, unknown>;

function record(value: unknown): VisibleRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as VisibleRecord : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalize(value: unknown) {
  return typeof value === 'string'
    ? value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    : '';
}

function blockKey(value: unknown) {
  const normalized = normalize(value);
  if (normalized in BLOCKS) return normalized;
  if (normalized.includes('evidence')) return 'missing_evidence';
  if (normalized.includes('simulat') || normalized.includes('sandbox')) return 'simulation_detected';
  if (normalized.includes('attractor') || normalized.includes('atractor')) return 'attractor_risk';
  if (normalized.includes('root') || normalized.includes('approval')) return 'root_approval_required';
  if (normalized.includes('phase') || normalized.includes('fase')) return 'phase_not_authorized';
  if (normalized.includes('govern')) return 'blocked_by_governance';
  return 'unknown_block';
}

export function translateRootGovernanceBlock(value: unknown): RootGovernanceTranslation {
  const item = record(value);
  const raw = text(item.error) || text(item.reason) || text(item.status) || text(item.state) || (typeof value === 'string' ? value : undefined) || 'unknown_block';
  const key = blockKey(raw);
  const block = BLOCKS[key] ?? BLOCKS.unknown_block;
  const layer = classifyRootLayer({ ...item, status: raw, state: raw, title: text(item.title) || raw });
  return {
    state: translateRootState(raw).label,
    affectedLayer: getRootLayerLabel(layer.layer).label,
    relatedPhase: text(item.phase) || text(item.relatedPhase) || 'sin fase declarada',
    ...block,
  };
}

export function translateRootAccess(value: unknown): RootGovernanceTranslation {
  const item = record(value);
  const error = text(item.error);
  if (!error && item.isRoot === true) {
    return {
      state: 'Acceso permitido.',
      reason: 'Sesion con permiso raiz visible.',
      consequence: 'ROOT puede abrirse para Aptymok.',
      nextAction: 'continuar observacion.',
      affectedLayer: 'Auditoria Tecnica',
      relatedPhase: 'Fase 11',
    };
  }
  if (error === 'Unauthorized' || item.session === false) {
    return {
      state: 'Acceso bloqueado.',
      reason: 'Acceso bloqueado porque falta sesion activa.',
      consequence: 'ROOT no debe abrirse sin sesion.',
      nextAction: 'iniciar sesion otra vez.',
      affectedLayer: 'Auditoria Tecnica',
      relatedPhase: 'Fase 11',
    };
  }
  if (error === 'root_required' || item.isRoot === false) {
    return {
      state: 'Acceso bloqueado.',
      reason: 'Acceso bloqueado porque esta sesion no tiene permiso raiz.',
      consequence: 'ROOT es solo para Aptymok.',
      nextAction: 'usar una sesion raiz o volver al espacio de usuario.',
      affectedLayer: 'Auditoria Tecnica',
      relatedPhase: 'Fase 11',
    };
  }
  return translateRootGovernanceBlock(error ?? 'unknown_block');
}

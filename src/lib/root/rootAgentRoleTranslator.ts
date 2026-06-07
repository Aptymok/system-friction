import { classifyRootLayer } from './rootLayers';
import { getRootLayerLabel } from './rootLayerLabels';
import { translateRootState } from './rootStateTranslator';

export type RootAgentRoleTranslation = {
  operationalName: string;
  function: string;
  observes: string;
  canPropose: string;
  cannotDo: string;
  evidenceGenerated: string;
  layerLabel: string;
  stateLabel: string;
  nextAction: string;
};

type AgentRecord = Record<string, unknown>;

function record(value: unknown): AgentRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AgentRecord : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function knownName(raw: string) {
  const normalized = raw.toLowerCase();
  if (normalized.includes('twin') || normalized.includes('amv')) return 'Interlocutor operativo';
  if (normalized.includes('visor')) return 'Interprete de memoria visible';
  if (normalized.includes('wsv') || normalized.includes('world')) return 'Lectura del mundo observado';
  if (normalized.includes('mihm')) return 'Lectura homeostatica';
  if (normalized.includes('codex')) return 'Agente tecnico de implementacion';
  if (normalized.includes('calendar') || normalized.includes('calendario')) return 'Reloj operativo';
  if (normalized.includes('govern')) return 'Regla de control';
  return raw || 'Rol interno';
}

export function translateRootAgentRole(value: unknown): RootAgentRoleTranslation {
  const agent = record(value);
  const label = text(agent.label) || text(agent.agentId) || 'Agente interno';
  const role = text(agent.role) || 'observador';
  const allowed = list(agent.allowedActions);
  const forbidden = list(agent.forbiddenActions);
  const classification = classifyRootLayer({
    id: text(agent.agentId),
    title: label,
    type: role,
    tags: [role, ...allowed, ...forbidden],
  });
  const state = translateRootState(agent.executionAuthority === true ? 'active' : 'blocked');

  return {
    operationalName: knownName(`${label} ${role}`),
    function: text(agent.responsibility) || 'Observa, traduce o prepara informacion dentro de ROOT.',
    observes: allowed.length ? allowed.slice(0, 4).join(', ') : 'sin observacion declarada',
    canPropose: allowed.length ? 'Puede proponer dentro de su rol declarado.' : 'sin propuesta declarada',
    cannotDo: forbidden.length
      ? forbidden.join(', ')
      : 'no ejecuta fuera de ROOT, no modifica Constitucion y no sustituye a Aptymok.',
    evidenceGenerated: role.toLowerCase().includes('audit') ? 'trazabilidad tecnica secundaria' : 'lectura o propuesta, no evidencia externa por si sola',
    layerLabel: getRootLayerLabel(classification.layer).label,
    stateLabel: state.label,
    nextAction: agent.executionAuthority === true
      ? 'verificar que cualquier ejecucion tenga decision raiz y evidencia.'
      : 'mantener sin autoridad externa; usar solo para observar, traducir o preparar.',
  };
}

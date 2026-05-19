import type { PatternRankResult } from '@/observatory/field/patternActivation';
import type { FieldMode } from '@/observatory/field/patternModel';
import type { WorldSpectVariable } from './worldSpectTypes';
import { worldSpectTriggers, type WorldSpectTrigger } from './worldSpectTriggers';

type MihmState = {
  IHG?: number | null;
  NTI_obs?: number | null;
  LDI_hours?: number | null;
  PHI_SF?: number | null;
  regime?: string | null;
};

type RecentEvent = {
  event_name?: string;
  event_type?: string;
  payload?: Record<string, unknown>;
};

export type WorldSpectTriggerDetectionInput = {
  command?: string;
  activeNode?: { id?: string | null; label?: string | null; commandMode?: string | null } | string | null;
  fieldMode?: FieldMode | string | null;
  rankedPatterns?: PatternRankResult | null;
  mihmState?: MihmState | null;
  recentEvents?: RecentEvent[];
};

export type WorldSpectTriggerDetection = {
  activeTriggers: WorldSpectTrigger[];
  primaryTrigger: WorldSpectTrigger | null;
  shouldReadWorldSpect: boolean;
  variables: WorldSpectVariable[];
};

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function eventText(events: RecentEvent[] = []) {
  return normalize(events.map((event) => {
    const payload = event.payload || {};
    return [
      event.event_name,
      event.event_type,
      payload.fragment,
      payload.message,
      payload.platform,
    ].filter(Boolean).join(' ');
  }).join(' '));
}

function nodeText(node: WorldSpectTriggerDetectionInput['activeNode']) {
  if (!node) return '';
  if (typeof node === 'string') return normalize(node);
  return normalize(`${node.id || ''} ${node.label || ''} ${node.commandMode || ''}`);
}

function addTrigger(
  map: Map<string, WorldSpectTrigger>,
  trigger: WorldSpectTrigger,
  variables: Set<WorldSpectVariable>,
) {
  map.set(trigger.id, trigger);
  trigger.activatesVariables.forEach((variable) => variables.add(variable));
}

export function detectWorldSpectTriggers(input: WorldSpectTriggerDetectionInput): WorldSpectTriggerDetection {
  const text = normalize([
    input.command || '',
    nodeText(input.activeNode),
    input.fieldMode || '',
    eventText(input.recentEvents),
  ].join(' '));
  const primaryPattern = input.rankedPatterns?.primaryPattern?.pattern || null;
  const triggers = new Map<string, WorldSpectTrigger>();
  const variables = new Set<WorldSpectVariable>();
  const mihm = input.mihmState;
  const phi = typeof mihm?.PHI_SF === 'number' ? mihm.PHI_SF : null;
  const nti = typeof mihm?.NTI_obs === 'number' ? mihm.NTI_obs : null;
  const ldi = typeof mihm?.LDI_hours === 'number' ? mihm.LDI_hours : null;

  if (/(publicar|publicacion|post|linkedin|twitter|x\.com|instagram|tiktok|youtube|salida publica|pieza)/.test(text)) {
    addTrigger(triggers, worldSpectTriggers.TR_PUBLICATION_INTENT, variables);
  }

  if (/(campana|campania|redes|contenido social|audiencia|marca|reel|copy|plataforma)/.test(text)) {
    addTrigger(triggers, worldSpectTriggers.TR_CAMPAIGN_INTENT, variables);
  }

  if (
    primaryPattern?.nivel_friccion === 5
    || /(riesgo institucional|riesgo critico|critico|seguridad real|umbral real)/.test(text)
  ) {
    addTrigger(triggers, worldSpectTriggers.TR_RISK_PATTERN, variables);
  }

  if (/(contradiccion|dice que.*pero|todo esta bien pero|relato|narrativa|ficcion|operacion no)/.test(text)) {
    addTrigger(triggers, worldSpectTriggers.TR_CONTRADICTION, variables);
  }

  if (phi !== null && phi < 0.3 || nti !== null && nti < 0.3 || ldi !== null && ldi > 72 || mihm?.regime === 'CRITICAL') {
    addTrigger(triggers, worldSpectTriggers.TR_LOW_MIHM_STABILITY, variables);
  }

  if (/(evento externo|noticia|mercado|mundo|contexto externo|cambio externo)/.test(text)) {
    addTrigger(triggers, worldSpectTriggers.TR_EXTERNAL_EVENT, variables);
  }

  if (/(social_resonance|resonancia social|engagement|comentarios|retorno social|respuesta del campo)/.test(text)) {
    addTrigger(triggers, worldSpectTriggers.TR_SOCIAL_RETURN, variables);
  }

  if (/(decision publica|posicion publica|anunciar|declarar|lanzar)/.test(text)) {
    addTrigger(triggers, worldSpectTriggers.TR_PUBLIC_DECISION, variables);
  }

  if (/(de donde salio|donde salio|origen|fuente|traza|trazabilidad|evidencia)/.test(text)) {
    addTrigger(triggers, worldSpectTriggers.TR_ORIGIN_REQUEST, variables);
  }

  const activeTriggers = Array.from(triggers.values());
  const primaryTrigger = activeTriggers[0] || null;

  return {
    activeTriggers,
    primaryTrigger,
    shouldReadWorldSpect: Boolean(primaryTrigger),
    variables: Array.from(variables),
  };
}

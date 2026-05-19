import type { WorldSpectVariable } from './worldSpectTypes';

export type WorldSpectTriggerId =
  | 'TR_PUBLICATION_INTENT'
  | 'TR_CAMPAIGN_INTENT'
  | 'TR_RISK_PATTERN'
  | 'TR_CONTRADICTION'
  | 'TR_LOW_MIHM_STABILITY'
  | 'TR_EXTERNAL_EVENT'
  | 'TR_SOCIAL_RETURN'
  | 'TR_PUBLIC_DECISION'
  | 'TR_ORIGIN_REQUEST';

export type WorldSpectTrigger = {
  id: WorldSpectTriggerId;
  symbol: string;
  name: string;
  activatesVariables: WorldSpectVariable[];
  condition: string;
  visibleSummary: string;
};

export const worldSpectTriggers: Record<WorldSpectTriggerId, WorldSpectTrigger> = {
  TR_PUBLICATION_INTENT: {
    id: 'TR_PUBLICATION_INTENT',
    symbol: '↗P',
    name: 'Intencion de publicacion',
    activatesVariables: ['platform', 'semantic', 'social', 'factual'],
    condition: 'La senal apunta a publicacion, post, pieza o salida publica.',
    visibleSummary: 'La senal quiere salir al campo publico.',
  },
  TR_CAMPAIGN_INTENT: {
    id: 'TR_CAMPAIGN_INTENT',
    symbol: '⟲C',
    name: 'Intencion de campana',
    activatesVariables: ['platform', 'semantic', 'social', 'attention'],
    condition: 'La senal menciona campana, redes, audiencia, marca o contenido social.',
    visibleSummary: 'La senal depende de respuesta social.',
  },
  TR_RISK_PATTERN: {
    id: 'TR_RISK_PATTERN',
    symbol: '⚠T',
    name: 'Patron critico',
    activatesVariables: ['risk', 'factual', 'macro'],
    condition: 'El patron primario tiene nivel de friccion critico.',
    visibleSummary: 'La senal toca riesgo antes de moverse.',
  },
  TR_CONTRADICTION: {
    id: 'TR_CONTRADICTION',
    symbol: '⧉K',
    name: 'Contradiccion operativa',
    activatesVariables: ['semantic', 'factual', 'risk'],
    condition: 'La senal separa relato declarado de operacion observada.',
    visibleSummary: 'Hay diferencia entre lo dicho y lo observado.',
  },
  TR_LOW_MIHM_STABILITY: {
    id: 'TR_LOW_MIHM_STABILITY',
    symbol: '↓H',
    name: 'Estabilidad baja',
    activatesVariables: ['risk', 'macro', 'factual'],
    condition: 'MIHM muestra estabilidad baja o regimen critico.',
    visibleSummary: 'La estabilidad no alcanza para una decision grande.',
  },
  TR_EXTERNAL_EVENT: {
    id: 'TR_EXTERNAL_EVENT',
    symbol: '◎E',
    name: 'Evento externo',
    activatesVariables: ['macro', 'factual', 'attention'],
    condition: 'Eventos recientes indican retorno o perturbacion externa.',
    visibleSummary: 'El campo recibio una senal externa.',
  },
  TR_SOCIAL_RETURN: {
    id: 'TR_SOCIAL_RETURN',
    symbol: '↩R',
    name: 'Retorno social',
    activatesVariables: ['platform', 'attention', 'social'],
    condition: 'Se registro resonancia social o respuesta de plataforma.',
    visibleSummary: 'La respuesta del campo social regreso al sistema.',
  },
  TR_PUBLIC_DECISION: {
    id: 'TR_PUBLIC_DECISION',
    symbol: '◆D',
    name: 'Decision publica',
    activatesVariables: ['risk', 'semantic', 'factual', 'platform'],
    condition: 'La accion solicitada cambia una posicion visible o publica.',
    visibleSummary: 'La decision puede quedar visible fuera del sistema.',
  },
  TR_ORIGIN_REQUEST: {
    id: 'TR_ORIGIN_REQUEST',
    symbol: '◷O',
    name: 'Solicitud de origen',
    activatesVariables: ['factual', 'semantic'],
    condition: 'El usuario pide fuente, origen, traza o de donde salio algo.',
    visibleSummary: 'Se necesita origen antes de continuar.',
  },
};

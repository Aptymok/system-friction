import { SFI_OPERATIONAL_ORGANS, type OperationalOrgan } from './organs';

export type OperationalEventKind =
  | 'observation'
  | 'decision'
  | 'opportunity'
  | 'publication_draft'
  | 'governance_decision'
  | 'system_patch'
  | 'signal';

export type OperationalEvent = {
  id: string;
  created_at: string;
  organ: string;
  kind: OperationalEventKind;
  title: string;
  summary: string;
  source?: string;
  payload?: Record<string, unknown>;
  risk?: 'low' | 'medium' | 'high';
  status?: 'observed' | 'classified' | 'pending' | 'approved' | 'blocked' | 'drafted';
  next_action?: string;
};

const now = new Date().toISOString();

export const SFI_OPERATIONAL_SEED_EVENTS: OperationalEvent[] = [
  {
    id: 'evt-p01-operational-membrane',
    created_at: now,
    organ: 'operational_membrane',
    kind: 'system_patch',
    title: 'P01 instalado: membrana operacional central',
    summary: 'Los órganos SFI quedaron declarados y /api/sfi/operational-state centraliza el estado del organismo.',
    source: 'P01',
    risk: 'low',
    status: 'observed',
    next_action: 'Conectar eventos reales para que el régimen deje de ser declarativo.',
  },
  {
    id: 'evt-edwing-access-request',
    created_at: now,
    organ: 'market',
    kind: 'opportunity',
    title: 'Actor externo solicita acceso al motor generador SFI',
    summary: 'Edwing aparece como posible promotor/aliado, pero solicita activo de alto riesgo: motor generador SFI.',
    source: 'conversacion_operativa',
    risk: 'high',
    status: 'classified',
    payload: {
      actor: 'Edwing',
      interest: 'promover SFI',
      requested_asset: 'motor generador SFI',
      opportunity_type: 'promoter_or_partner',
      allowed_initial_level: 'DEMO',
    },
    next_action: 'No entregar núcleo. Preparar demo limitada, one-pager público y registro formal de acceso.',
  },
  {
    id: 'evt-governance-no-core-transfer',
    created_at: now,
    organ: 'governance',
    kind: 'governance_decision',
    title: 'Decisión: no transferir núcleo generador sin contrato',
    summary: 'El motor generador es activo institucional. Su transferencia requiere alcance, atribución, monetización y límites por escrito.',
    source: 'governance/access-request',
    risk: 'high',
    status: 'blocked',
    payload: {
      denied_level: 'CORE_ACCESS',
      allowed_level: 'DEMO',
      required_before_escalation: ['scope', 'attribution', 'monetization_terms', 'access_boundary'],
    },
    next_action: 'Crear paquete DEMO / LIMITED_OPERATOR antes de cualquier conversación de acceso profundo.',
  },
  {
    id: 'evt-scorefriction-next-daily-state',
    created_at: now,
    organ: 'scorefriction',
    kind: 'signal',
    title: 'ScoreFriction requiere estado diario unificado',
    summary: 'El órgano existe. P02 registra la necesidad de conectar API diaria, WSV desglosado y narrativa puntual en salida única.',
    source: 'scorefriction-operational',
    risk: 'medium',
    status: 'pending',
    next_action: 'Conectar /api/scorefriction/state o crear adaptador si la ruta todavía no devuelve contrato estable.',
  },
  {
    id: 'evt-publisher-absent-but-required',
    created_at: now,
    organ: 'publisher',
    kind: 'publication_draft',
    title: 'Publicador detectado como cuello de botella',
    summary: 'SFI observa y formaliza, pero todavía no emite de forma sostenida. P02 registra borrador operacional inicial.',
    source: 'publisher/draft',
    risk: 'medium',
    status: 'drafted',
    payload: {
      draft_title: 'Señal operacional SFI: de órgano declarado a evento registrado',
      destination: ['Medium', 'LinkedIn', 'site_report'],
    },
    next_action: 'Generar borradores revisables, no publicar automáticamente.',
  },
];

const globalStore = globalThis as typeof globalThis & { __sfiOperationalEvents?: OperationalEvent[] };

export function getOperationalEvents(): OperationalEvent[] {
  if (!globalStore.__sfiOperationalEvents) {
    globalStore.__sfiOperationalEvents = [...SFI_OPERATIONAL_SEED_EVENTS];
  }
  return globalStore.__sfiOperationalEvents;
}

export function appendOperationalEvent(input: Partial<OperationalEvent>): OperationalEvent {
  const event: OperationalEvent = {
    id: input.id || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: input.created_at || new Date().toISOString(),
    organ: input.organ || 'unknown',
    kind: input.kind || 'observation',
    title: input.title || 'Evento operacional sin título',
    summary: input.summary || 'Evento registrado sin resumen.',
    source: input.source || 'manual',
    payload: input.payload || {},
    risk: input.risk || 'medium',
    status: input.status || 'observed',
    next_action: input.next_action || 'Clasificar y conectar al órgano correspondiente.',
  };

  const events = getOperationalEvents();
  events.unshift(event);
  globalStore.__sfiOperationalEvents = events.slice(0, 200);
  return event;
}

export function latestEventByKind(kind: OperationalEventKind): OperationalEvent | null {
  return getOperationalEvents().find((event) => event.kind === kind) || null;
}

export function latestEventByOrgan(organ: string): OperationalEvent | null {
  return getOperationalEvents().find((event) => event.organ === organ) || null;
}

export function organRuntimeStatus(organ: OperationalOrgan): OperationalOrgan & { latestEvent: OperationalEvent | null } {
  return { ...organ, latestEvent: latestEventByOrgan(organ.id) };
}

export function getRuntimeOrgans() {
  return SFI_OPERATIONAL_ORGANS.map(organRuntimeStatus);
}

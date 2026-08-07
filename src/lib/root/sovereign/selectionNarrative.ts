import type { RootRow } from './rootSovereignState';

export type RootSelectionNarrative = {
  title: string;
  statement: string;
  meaning: string;
  nextState: string;
  evidenceLabel: string;
  facts: Array<{ label: string; value: string }>;
};

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function first(data: RootRow, keys: string[]) {
  for (const key of keys) {
    const value = text(data[key]);
    if (value) return value;
  }
  return null;
}

function countEvidence(data: RootRow, explicitCount: number) {
  if (explicitCount > 0) return explicitCount;
  const candidates = [data.evidence_refs, data.evidenceIds, data.evidence_ids, data.lineage];
  return Math.max(0, ...candidates.map((value) => Array.isArray(value) ? value.filter(Boolean).length : 0));
}

function sentenceCase(value: string) {
  const normalized = value.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Registro institucional';
}

export function humanEventLabel(eventName: string) {
  const parts = eventName.split('.').filter(Boolean);
  const action = parts.at(-1)?.toLowerCase() ?? '';
  const object = parts.length > 1 ? parts.slice(0, -1).join(' ') : eventName;
  if (action === 'created') return `Se registró ${sentenceCase(object).toLowerCase()}`;
  if (action === 'updated') return `Se actualizó ${sentenceCase(object).toLowerCase()}`;
  if (action === 'executed') return `Se ejecutó ${sentenceCase(object).toLowerCase()}`;
  if (action === 'completed') return `Concluyó ${sentenceCase(object).toLowerCase()}`;
  if (action === 'failed') return `Falló ${sentenceCase(object).toLowerCase()}`;
  if (action === 'blocked') return `Se bloqueó ${sentenceCase(object).toLowerCase()}`;
  if (action === 'proposed') return `Se propuso ${sentenceCase(object).toLowerCase()}`;
  return sentenceCase(eventName);
}

export function describeRootSelection(input: {
  kind: string;
  technicalTitle: string;
  data: RootRow;
  evidenceCount: number;
}): RootSelectionNarrative {
  const kind = input.kind.toLowerCase();
  const data = input.data;
  const technicalEvent = first(data, ['eventName', 'event_name', 'event_type']) ?? (input.technicalTitle.includes('.') ? input.technicalTitle : null);
  const status = first(data, ['status', 'state', 'learning_state', 'epistemicClass', 'epistemic_class']);
  const actor = first(data, ['agentId', 'agent_id', 'sourceId', 'source_id', 'actor_id', 'created_by', 'requester_id']);
  const subject = first(data, ['subject', 'title', 'label', 'objective', 'question', 'hypothesis', 'name']);
  const action = first(data, ['action', 'proposal_type', 'proposalType', 'operation', 'intent']);
  const evidenceCount = countEvidence(data, input.evidenceCount);
  const evidenceLabel = evidenceCount > 0
    ? `${evidenceCount} referencia${evidenceCount === 1 ? '' : 's'} vinculada${evidenceCount === 1 ? '' : 's'}`
    : 'Sin referencias de evidencia vinculadas';

  const facts: Array<{ label: string; value: string }> = [];
  if (actor) facts.push({ label: 'PRODUCIDO POR', value: actor });
  if (subject) facts.push({ label: 'SOBRE', value: subject });
  if (action) facts.push({ label: 'ACCIÓN / INTENCIÓN', value: action });
  if (status) facts.push({ label: 'ESTADO REGISTRADO', value: status });
  if (technicalEvent) facts.push({ label: 'EVENTO TÉCNICO', value: technicalEvent });

  if (kind.includes('proposal') || technicalEvent?.includes('proposal')) {
    return {
      title: subject ?? 'Propuesta registrada',
      statement: technicalEvent ? humanEventLabel(technicalEvent) : 'Se registró una propuesta institucional.',
      meaning: 'Existe una propuesta persistida para evaluación. Su existencia no significa que haya sido aprobada, ejecutada ni que haya producido un resultado.',
      nextState: evidenceCount > 0
        ? 'Puede contrastarse contra la evidencia vinculada y pasar por la autoridad correspondiente.'
        : 'No debe promoverse ni ejecutarse como conclusión hasta vincular evidencia suficiente o documentar explícitamente que es una propuesta exploratoria.',
      evidenceLabel,
      facts,
    };
  }

  if (kind.includes('event') || technicalEvent) {
    const epistemic = first(data, ['epistemicClass', 'epistemic_class']);
    return {
      title: technicalEvent ? humanEventLabel(technicalEvent) : 'Evento institucional',
      statement: technicalEvent ? humanEventLabel(technicalEvent) : 'Se persistió un evento institucional.',
      meaning: epistemic
        ? `El registro documenta que el evento existe con clase epistémica ${epistemic}. Esto describe el registro, no valida por sí solo cualquier afirmación contenida en él.`
        : 'El registro demuestra que el evento fue persistido. No constituye por sí mismo validación del contenido o del resultado asociado.',
      nextState: evidenceCount > 0
        ? 'La evidencia vinculada permite inspeccionar qué sostiene este evento.'
        : 'Faltan referencias de evidencia en este punto; el evento debe tratarse como no verificable desde esta vista hasta enlazar procedencia.',
      evidenceLabel,
      facts,
    };
  }

  if (kind.includes('agent')) {
    const purpose = first(data, ['purpose', 'description']);
    return {
      title: subject ?? input.technicalTitle,
      statement: status ? `El agente está registrado actualmente como ${status}.` : 'El agente está registrado en el runtime cognitivo.',
      meaning: purpose ?? 'La presencia del agente y su contrato no prueban una ejecución reciente.',
      nextState: status?.toLowerCase() === 'operational'
        ? 'La vista debe poder rastrear su ejecución reciente y los eventos que produjo.'
        : 'Para declararlo operativo se requiere evidencia de ejecución atribuible, no sólo registro o contrato.',
      evidenceLabel,
      facts,
    };
  }

  if (kind.includes('evidence') || kind.includes('ledger')) {
    return {
      title: subject ?? 'Evidencia persistida',
      statement: 'Este punto representa evidencia o una referencia de procedencia persistida.',
      meaning: 'Su presencia prueba que el registro existe. La fuerza probatoria depende de su fuente, integridad, contexto, linaje y relación explícita con la afirmación que pretende sostener.',
      nextState: evidenceCount > 0 ? 'Puede seguirse su linaje desde las referencias vinculadas.' : 'No hay referencias adicionales enlazadas desde este punto.',
      evidenceLabel,
      facts,
    };
  }

  if (kind.includes('hypothesis') || kind.includes('prediction')) {
    return {
      title: subject ?? 'Hipótesis o proyección',
      statement: status ? `La hipótesis/proyección se encuentra en estado ${status}.` : 'Existe una hipótesis o proyección persistida.',
      meaning: 'Es una formulación contrastable, no una observación ni un resultado confirmado.',
      nextState: evidenceCount > 0 ? 'Debe contrastarse contra su evidencia y regla de verificación.' : 'Requiere evidencia o una regla de verificación antes de elevar su confianza.',
      evidenceLabel,
      facts,
    };
  }

  if (kind.includes('attractor')) {
    return {
      title: subject ?? input.technicalTitle,
      statement: 'Este punto representa un atractor declarado o persistido.',
      meaning: 'El atractor expresa una dirección de reorganización o convergencia. No demuestra que esa dirección ya haya sido alcanzada.',
      nextState: evidenceCount > 0 ? 'Debe compararse longitudinalmente con fenómenos y evidencia que lo soporten o contradigan.' : 'Su dirección puede existir como declaración, pero su aproximación no debe inferirse sin evidencia vinculada.',
      evidenceLabel,
      facts,
    };
  }

  return {
    title: subject ?? input.technicalTitle,
    statement: status ? `Este registro se encuentra en estado ${status}.` : 'Este registro forma parte del estado institucional observado por ROOT.',
    meaning: 'ROOT muestra su procedencia y contenido sin convertir la representación en una afirmación adicional.',
    nextState: evidenceCount > 0 ? 'Puede inspeccionarse mediante sus referencias de evidencia.' : 'No hay referencias de evidencia vinculadas en este punto.',
    evidenceLabel,
    facts,
  };
}

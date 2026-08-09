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

function record(value: unknown): RootRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {};
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

function display(value: unknown, fallback = 'MISSING') {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'SÍ' : 'NO';
  return text(value) ?? fallback;
}

function divergenceMeaning(id: string, observation: string) {
  if (id === 'reader-errors') {
    return 'Una o más fuentes que ROOT necesita para describir el estado institucional devolvieron error o timeout. La degradación está en la adquisición/lectura del estado, no necesariamente en el objeto institucional que esas fuentes representan.';
  }
  if (id === 'cognitive-continuity') {
    return 'La continuidad cognitiva no puede declararse completa porque no todos los agentes registrados tienen ejecución observada en la ventana utilizada por el runtime. Registro de agente y ejecución observada son estados distintos.';
  }
  if (id === 'graph-traceability') {
    return 'Hay elementos del grafo sin referencia de evidencia o linaje explícito. El problema no es que el nodo no exista: es que ROOT no puede recorrer todavía una cadena probatoria completa para todos los elementos.';
  }
  if (id === 'capability-gap') {
    return 'El catálogo conoce más capacidades de las que están disponibles para ejecución en este corte. Una capacidad registrada, parcial o gated no debe contarse como capacidad ejecutable.';
  }
  if (id === 'attractor-reader-gap') {
    return 'ROOT no está recibiendo desde este lector un atractor suficiente para comparar dirección declarada contra trayectoria observada. La interfaz no debe reconstruir esa dirección a partir de texto decorativo.';
  }
  if (id === 'institutional-position-gap') {
    return 'No hay datos suficientes para calcular una posición ΦSFI en este corte. MISSING significa ausencia de lectura suficiente, no un valor cero.';
  }
  return observation || 'La divergencia identifica una diferencia explícita entre estados que ROOT no debe colapsar en una sola etiqueta.';
}

function divergenceNext(id: string) {
  if (id === 'reader-errors') return 'Revisar las fuentes listadas como fallidas y recuperar su lectura. No requiere cargar evidencia por defecto.';
  if (id === 'cognitive-continuity') return 'Revisar qué agentes carecen de ejecución observada y distinguir si están gated, degradados o realmente sin ejecución.';
  if (id === 'graph-traceability') return 'Identificar los nodos o relaciones sin linaje y vincular procedencia sólo donde exista una relación probatoria real.';
  if (id === 'capability-gap') return 'Abrir el registro de capacidades y localizar cuáles están partial/gated y cuál es la condición que impide su disponibilidad.';
  if (id === 'attractor-reader-gap') return 'Abrir el campo del atractor y verificar si existe una declaración persistida y una trayectoria comparable.';
  if (id === 'institutional-position-gap') return 'Revisar las métricas de entrada requeridas por Math Core antes de intentar interpretar ΦSFI.';
  return 'Seguir la fuente indicada y contrastar los dos estados que producen la divergencia.';
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
    : 'Sin referencias vinculadas';

  if (kind === 'institutional-position' || kind === 'institutional-fact') {
    const phiFact = record(data.phiFact ?? data);
    const divergences = Array.isArray(data.divergences) ? data.divergences : [];
    const sourceHealth = record(data.sourceHealth);
    const phiValue = display(phiFact.value ?? data.value, 'NO DETERMINADA');
    const phiClass = display(phiFact.status ?? data.status, 'MISSING').toUpperCase();
    const facts = [
      { label: 'CLASE DEL DATO', value: phiClass },
      { label: 'POSICIÓN', value: phiValue },
      { label: 'SALUD DE FUENTES', value: sourceHealth.total ? `${display(sourceHealth.ok, '0')}/${display(sourceHealth.total, '0')} sin error` : 'MISSING' },
      { label: 'DIVERGENCIAS ACTIVAS', value: String(divergences.length) },
    ];
    return {
      title: 'Lectura institucional de ROOT',
      statement: `${phiValue}. ROOT detecta ${divergences.length} divergencia${divergences.length === 1 ? '' : 's'} activa${divergences.length === 1 ? '' : 's'} en este corte.`,
      meaning: 'DERIVED describe la clase epistémica de ΦSFI: es un valor calculado. DEGRADED describe la salud o cobertura de una fuente/lector. No son estados rivales: un valor puede ser DERIVED y, al mismo tiempo, provenir de un sistema con una o más fuentes DEGRADED. La ventana debe mostrar ambos ejes por separado.',
      nextState: divergences.length
        ? 'Revisar “DÓNDE ESTÁ LA DIVERGENCIA” en esta misma ventana. Cada entrada identifica el hueco observado, su fuente y el siguiente paso operativo.'
        : 'No hay divergencias activas en las fuentes consultadas; conservar la lectura como derivada y seguir observando longitudinalmente.',
      evidenceLabel,
      facts,
    };
  }

  if (kind === 'system-item') {
    const state = record(data.state);
    const openItems = record(data.openItems);
    const health = display(state.status, 'MISSING').toUpperCase();
    const reported = display(state.value, 'MISSING');
    const explanation = display(state.explanation, 'Sin explicación de lector.');
    const warning = text(state.warning) ?? text(data.warning);
    const facts = [
      { label: 'SALUD DE LECTURA', value: health },
      { label: 'ESTADO REPORTADO', value: reported },
      { label: 'ELEMENTOS ABIERTOS', value: display(openItems.value, 'MISSING') },
      { label: 'EXPLICACIÓN', value: explanation },
    ];
    if (warning) facts.push({ label: 'CAUSA DE DEGRADACIÓN', value: warning });
    return {
      title: subject ?? input.technicalTitle,
      statement: warning
        ? `${input.technicalTitle} aparece con salud ${health} porque su lector reporta una condición concreta: ${warning}`
        : `${input.technicalTitle} tiene salud de lectura ${health} y reporta estado ${reported}.`,
      meaning: '“Salud de lectura” responde si ROOT pudo obtener y reconciliar el estado con suficiente integridad. “Estado reportado” describe lo que la fuente dijo sobre el sistema. Una fuente puede responder parcialmente y por eso estar DEGRADED aunque el objeto tenga otro estado funcional.',
      nextState: warning
        ? 'Corregir o reintentar la fuente indicada en la causa de degradación. Cargar evidencia sólo corresponde si el problema real es falta de procedencia, no como acción universal.'
        : 'No hay una degradación explícita que resolver desde este registro. Puede inspeccionarse el estado técnico si se necesita diagnóstico adicional.',
      evidenceLabel,
      facts,
    };
  }

  if (kind === 'divergence') {
    const id = display(data.id, input.technicalTitle);
    const observation = display(data.observation, 'Sin observación detallada.');
    const divergenceStatus = display(data.status, 'OPEN').toUpperCase();
    const relatedFact = record(data.relatedFact);
    const facts = [
      { label: 'SEVERIDAD', value: divergenceStatus },
      { label: 'HUECO OBSERVADO', value: observation },
    ];
    if (Object.keys(relatedFact).length) {
      facts.push({ label: 'LECTURA RELACIONADA', value: `${display(relatedFact.label, 'Registro')} · ${display(relatedFact.value)}` });
      facts.push({ label: 'CLASE RELACIONADA', value: display(relatedFact.status).toUpperCase() });
    }
    return {
      title: subject ?? input.technicalTitle,
      statement: observation,
      meaning: divergenceMeaning(id, observation),
      nextState: divergenceNext(id),
      evidenceLabel,
      facts,
    };
  }

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
        : 'Si este evento necesita sostener una afirmación, entonces sí debe vincular procedencia; si sólo es telemetría, no se debe forzar una carga de evidencia.',
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
        ? 'Rastrear su ejecución reciente y los eventos atribuibles que produjo.'
        : 'Para declararlo operativo se requiere ejecución atribuible; no se resuelve automáticamente cargando evidencia manual.',
      evidenceLabel,
      facts,
    };
  }

  if (kind.includes('evidence') || kind.includes('ledger')) {
    const epistemic = (first(data, ['epistemicClass', 'epistemic_class']) ?? 'imported').toLowerCase();
    const imported = epistemic === 'imported' || epistemic === 'imported_provenance';
    return {
      title: subject ?? 'Evidencia persistida',
      statement: imported
        ? 'Este nodo conserva una pieza o referencia de evidencia importada con procedencia persistida.'
        : 'Este nodo conserva evidencia persistida con una clase epistémica explícita.',
      meaning: imported
        ? 'La marca IMPORTED no rebaja visualmente la evidencia: indica que SFI conoce y conserva su procedencia histórica, pero no convierte automáticamente las afirmaciones internas del artefacto en observaciones verificadas.'
        : 'La fuerza probatoria depende de fuente, integridad, contexto, linaje y de la relación explícita entre esta evidencia y la afirmación que pretende sostener.',
      nextState: evidenceCount > 0
        ? 'Seguir las referencias vinculadas para inspeccionar linaje o relaciones probatorias.'
        : 'No hay otra referencia enlazada desde este nodo. Eso no implica que debas cargar algo: sólo significa que este punto termina aquí por ahora.',
      evidenceLabel,
      facts,
    };
  }

  if (kind.includes('hypothesis') || kind.includes('prediction')) {
    return {
      title: subject ?? 'Hipótesis o proyección',
      statement: status ? `La hipótesis/proyección se encuentra en estado ${status}.` : 'Existe una hipótesis o proyección persistida.',
      meaning: 'Es una formulación contrastable, no una observación ni un resultado confirmado.',
      nextState: evidenceCount > 0 ? 'Contrastar contra su evidencia y regla de verificación.' : 'Aquí sí corresponde vincular evidencia o una regla de verificación antes de elevar confianza.',
      evidenceLabel,
      facts,
    };
  }

  if (kind.includes('attractor')) {
    return {
      title: subject ?? input.technicalTitle,
      statement: 'Este punto representa un atractor declarado o persistido.',
      meaning: 'El atractor expresa una dirección de reorganización o convergencia. No demuestra que esa dirección ya haya sido alcanzada.',
      nextState: 'Abrir el campo del atractor para contrastar longitudinalmente dimensiones soportadas, contradichas o todavía sin evidencia.',
      evidenceLabel,
      facts,
    };
  }

  return {
    title: subject ?? input.technicalTitle,
    statement: status ? `Este registro se encuentra en estado ${status}.` : 'Este registro forma parte del estado institucional leído por ROOT.',
    meaning: 'ROOT expone este registro en su contexto operativo. La interfaz no debe convertir automáticamente cada objeto en una solicitud de evidencia.',
    nextState: evidenceCount > 0 ? 'Puede inspeccionarse mediante sus referencias vinculadas.' : 'No existe una acción universal requerida para este registro.',
    evidenceLabel,
    facts,
  };
}

'use client';

import { useMemo, useState } from 'react';
import { findVisorContext, type VisorChatMessage, type VisorContextKey, type VisorSnapshot } from './visorTypes';

type VisibleRecord = Record<string, unknown>;

type TwinState = {
  ok?: boolean;
  data?: {
    proposals?: unknown[];
    seed?: {
      nodeCatalog?: unknown[];
      documentCatalog?: unknown[];
      patternCatalog?: unknown[];
      recentEvents?: unknown[];
    };
  };
};

type VisorIntent = 'site' | 'attractor' | 'acp' | 'theory' | 'explain' | 'support' | 'closure' | 'reading' | 'personal_unknown' | 'logbook' | 'memory' | 'observatory_gap' | 'open';

const SFI_VISOR_ROOT_PROMPT = `Eres VISOR ROOT, interlocutor operativo de SystemFriction Institute.

No eres una base de datos con chat.
No eres un inventario de nodos.
Eres el observador conversacional del instituto.

Tienes acceso al contexto visible del instituto:
nodos, documentos, evidencias, patrones, propuestas, bitacoras, atlas, workbook, ledger y eventos recientes.

Tu funcion:
ayudar al usuario root a entender, usar y consolidar SFI.

Puedes explicar, teorizar, inferir, proponer rutas, traducir bitacoras, orientar uso del observatorio, sugerir nuevos observatorios, detectar huecos y generar prompts para Codex.

No puedes ejecutar acciones, crear registros, aprobar decisiones, fingir que algo esta registrado si no esta, ni inventar evidencia.

Regla critica:
No abras respuestas con conteos de nodos.
Solo menciona conteos si el usuario pide inventario, estado o auditoria.

Si algo esta registrado, usa el registro.
Si algo no esta registrado, dilo y ofrece inferencia, explicacion general, hipotesis o ruta de observacion.

Toda respuesta debe acercar SFI a mas claridad, mejor arquitectura, mejor uso del observatorio, mejor decision y mejor consolidacion.

Tono: claro, simple y directo.`;

function count(value: unknown[] | undefined) {
  return Array.isArray(value) ? value.length : 0;
}

function readSnapshot(twin: TwinState | null): VisorSnapshot {
  const seed = twin?.data?.seed;
  return {
    proposals: count(twin?.data?.proposals),
    nodes: count(seed?.nodeCatalog),
    documents: count(seed?.documentCatalog),
    patterns: count(seed?.patternCatalog),
    events: count(seed?.recentEvents),
  };
}

function contextDataAvailable(contextKey: VisorContextKey, snapshot: VisorSnapshot) {
  if (contextKey === 'nodes') return snapshot.nodes > 0;
  if (contextKey === 'evidence' || contextKey === 'atlas') return snapshot.documents > 0;
  if (contextKey === 'acp' || contextKey === 'ledger') return snapshot.proposals > 0 || snapshot.events > 0;
  if (contextKey === 'attractors') return snapshot.proposals > 0 || snapshot.patterns > 0;
  if (contextKey === 'bitacoras') return snapshot.events > 0;
  if (contextKey === 'amc') return snapshot.patterns > 0 || snapshot.events > 0;
  return false;
}

function normalize(input: string) {
  return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function intentFor(prompt: string): VisorIntent {
  const normalized = normalize(prompt);
  if (normalized.includes('acp') || normalized.includes('propuesta') || normalized.includes('propuestas') || normalized.includes('configurando')) return 'acp';
  if (normalized.includes('bitacora') || normalized.includes('logbook') || normalized.includes('recent event')) return 'logbook';
  if (normalized.includes('que sabes de mi') || normalized.includes('memoria visible') || normalized.includes('sobre mi') || normalized.includes('en el instituto')) return 'memory';
  if (normalized.includes('observatorio falta') || normalized.includes('que observatorio') || normalized.includes('nuevo observatorio') || normalized.includes('modulo falta')) return 'observatory_gap';
  if (normalized.includes('que es el sitio') || normalized.includes('que es este sitio') || normalized.includes('que hace el sitio') || normalized.includes('systemfriction') || normalized.includes('system friction')) return 'site';
  if (normalized.includes('perro') || normalized.includes('mascota') || normalized.includes('mi gato') || normalized.includes('mi familia') || normalized.includes('mi casa')) return 'personal_unknown';
  if (normalized.includes('atractor') || normalized.includes('direccion de atractor') || normalized.includes('cuenca')) return 'attractor';
  if (normalized.includes('teoria') || normalized.includes('hipotesis') || normalized.includes('que puede')) return 'theory';
  if (normalized.includes('duda') || normalized.includes('explica') || normalized.includes('por que') || normalized.includes('porque')) return 'explain';
  if (normalized.includes('que hago') || normalized.includes('ayuda') || normalized.includes('acompan') || normalized.includes('proceso')) return 'support';
  if (normalized.includes('falta') || normalized.includes('cerrar') || normalized.includes('abierto')) return 'closure';
  if (normalized.includes('cambio') || normalized.includes('semana') || normalized.includes('repetid') || normalized.includes('friccion')) return 'reading';
  return 'open';
}

function asRecord(value: unknown): VisibleRecord | null {
  return value && typeof value === 'object' ? value as VisibleRecord : null;
}

function field(record: VisibleRecord | null, keys: string[]) {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }
  return undefined;
}

function titleFor(value: unknown, fallback: string) {
  const record = asRecord(value);
  return field(record, ['title', 'name', 'label', 'summary', 'event_name', 'type', 'id']) || (typeof value === 'string' ? value : fallback);
}

function detailFor(value: unknown) {
  const record = asRecord(value);
  if (!record) return typeof value === 'string' ? value : undefined;
  const parts = [
    field(record, ['status', 'state', 'phase']),
    field(record, ['risk', 'risk_level']),
    field(record, ['expected_time', 'timeframe', 'horizon']),
    field(record, ['description', 'hypothesis', 'rationale', 'notes', 'payload']),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

function readableEntries(value: unknown[] | undefined, label: string, limit = 6) {
  if (!Array.isArray(value) || value.length === 0) return `${label}: sin entradas visibles.`;
  return `${label}:\n${value.slice(0, limit).map((item, index) => {
    const detail = detailFor(item);
    return `- ${titleFor(item, `entrada ${index + 1}`)}${detail ? ` — ${detail}` : ''}`;
  }).join('\n')}`;
}

function visibleMemory(twin: TwinState | null) {
  const seed = twin?.data?.seed;
  return [
    readableEntries(seed?.nodeCatalog, 'Nodos visibles', 5),
    readableEntries(seed?.documentCatalog, 'Documentos/evidencias visibles', 5),
    readableEntries(seed?.patternCatalog, 'Patrones visibles', 5),
    readableEntries(twin?.data?.proposals, 'Propuestas ACP visibles', 7),
    readableEntries(seed?.recentEvents, 'Eventos recientes visibles', 7),
  ].join('\n\n');
}

function focusedMemory(twin: TwinState | null, intent: VisorIntent) {
  const seed = twin?.data?.seed;
  if (intent === 'acp') return [readableEntries(twin?.data?.proposals, 'Propuestas ACP visibles', 10), readableEntries(seed?.recentEvents, 'Eventos recientes ligados al registro', 8)].join('\n\n');
  if (intent === 'attractor') return [readableEntries(twin?.data?.proposals, 'Propuestas con posible direccion de atractor', 8), readableEntries(seed?.patternCatalog, 'Patrones que pueden sostener atractor', 8)].join('\n\n');
  if (intent === 'logbook') return readableEntries(seed?.recentEvents, 'Entradas de bitacora/eventos recientes', 10);
  if (intent === 'memory') return visibleMemory(twin);
  return visibleMemory(twin);
}

function lensText(contextKey: VisorContextKey, snapshot: VisorSnapshot) {
  const context = findVisorContext(contextKey);
  const contextHasData = contextDataAvailable(contextKey, snapshot);
  return contextHasData
    ? `Registro visible: la capa ${context.label} tiene datos conectados.`
    : `No veo registro directo en la capa ${context.label}. Puedo inferir o proponerte ruta sin fingir registro.`;
}

function localCompanionResponse(contextKey: VisorContextKey, prompt: string, twin: TwinState | null) {
  const context = findVisorContext(contextKey);
  const snapshot = readSnapshot(twin);
  const intent = intentFor(prompt);
  const lensLimit = lensText(contextKey, snapshot);
  const memory = focusedMemory(twin, intent);

  if (intent === 'site') {
    return 'SystemFriction Institute es el campo donde estas convirtiendo friccion, memoria, evidencia y decision en un sistema observable. No es solo un sitio: es una herramienta para operar bitacoras, atlas, nodos, atractores, propuestas, decisiones, observatorios y rutas de ejecucion.';
  }

  if (intent === 'personal_unknown') {
    return 'No lo veo registrado en SFI. Aun asi puedo conversar sobre eso. Cuentame que pasa y lo observamos sin forzarlo a nodo: conducta, contexto, senal, repeticion y que te preocupa.';
  }

  if (intent === 'acp') {
    return [
      'Lectura ACP desde memoria visible:',
      memory,
      'Traduccion: ACP esta intentando convertir posibilidades en propuestas observables. Lo que ya tenga estado, riesgo, horizonte o evento asociado puede leerse como configuracion visible. Lo que no tenga evidencia suficiente queda como hipotesis, no como cierre.',
      'Para hacerlo util: el siguiente paso es escoger una propuesta, exigir evidencia minima, definir criterio de cierre y decidir si se promueve a atractor, bitacora o ejecucion.',
    ].join('\n\n');
  }

  if (intent === 'logbook') {
    return [
      'Bitacora visible en VISOR:',
      memory,
      'Lectura: cada entrada debe separarse en registro, inferencia e hipotesis. Si una entrada se repite, puede volverse patron. Si un patron jala decisiones, puede sostener atractor. Si no tiene evidencia, no se cierra.',
    ].join('\n\n');
  }

  if (intent === 'memory') {
    return [
      'Esto es lo que VISOR recibe como memoria visible ahora:',
      memory,
      'Si algo que esperas no aparece aqui, el problema no es interpretacion: falta mapear esa fuente al twin/state o a visible_memory.',
    ].join('\n\n');
  }

  if (intent === 'observatory_gap') {
    return [
      'Hipotesis operativa: puede faltar un observatorio de traduccion entre bitacora y ejecucion minima.',
      'Ruta propuesta: 1) detectar entrada repetida, 2) exigir evidencia minima, 3) formular perturbacion de bajo riesgo, 4) declarar criterio de cierre, 5) registrar solo si el resultado deja rastro verificable.',
      'Tambien pueden faltar observatorios por ecosistema digital: identidad/acceso, publicaciones, ventas, soporte, comunidad, automatizaciones y deuda tecnica.',
    ].join('\n\n');
  }

  if (intent === 'attractor') {
    return [
      'Lectura de atractores desde memoria visible:',
      memory,
      lensLimit,
      'Interpretacion: un atractor no es una etiqueta; es una direccion de convergencia. Si una propuesta se repite, tiene horizonte y aparece conectada a patrones, puede tratarse como atractor provisional. Si no aparece en memoria visible, solo puedo inferirlo.',
    ].join('\n\n');
  }

  if (intent === 'theory') {
    return [
      'Puedo teorizar, pero separando capas: registro, inferencia e hipotesis.',
      lensLimit,
      'Conocimiento general: en sistemas complejos importa mas la repeticion que la intensidad aislada. En SFI eso se traduce en observar rastros, no solo sensaciones fuertes.',
    ].join('\n\n');
  }

  if (intent === 'explain') {
    return [
      `Lectura desde ${context.label}: ${context.description}`,
      lensLimit,
      'Si lo que preguntas no esta en SFI, no lo convierto en dato. Puedo explicarlo con conocimiento general o proponerte como observarlo sin crear registros desde el chat.',
    ].join('\n\n');
  }

  if (intent === 'support') {
    return [
      'Si. Puedo acompanar la pregunta sin ejecutar nada ni crear registros.',
      'Dime el residuo en una frase. Yo lo devuelvo como: registro visible si existe, inferencia si hay base, hipotesis si falta evidencia, y ruta minima si conviene observarlo.',
    ].join('\n\n');
  }

  if (intent === 'closure') {
    return [
      'Para cerrar algo en SFI hace falta una cadena minima: que paso, que evidencia lo sostiene, que patron toca, que decision pide y que criterio permite decir cerrado.',
      lensLimit,
      'Si falta una pieza, no conviene cerrarlo. Conviene dejarlo como hipotesis, pendiente de workbook o ruta de observacion.',
    ].join('\n\n');
  }

  if (intent === 'reading') {
    return [
      'Lectura operativa: busca repeticion, no dramatismo. Una friccion pequena pero recurrente suele pesar mas que una senal intensa y aislada.',
      lensLimit,
      'Puedo ayudarte a convertir esa lectura en pregunta observable, bitacora legible o ruta de perturbacion minima sin ejecutar cambios desde el chat.',
    ].join('\n\n');
  }

  return [
    'Si. Puedo dialogar libremente contigo desde VISOR.',
    'Uso SFI como memoria y marco cuando aplica, y conocimiento general cuando la pregunta lo requiere.',
    'Memoria visible disponible:',
    memory,
    'Mi limite es no mentir: no invento registros ni ejecuto cambios. Puedo ayudarte a pensar, traducir, proyectar, disenar rutas y consolidar el instituto.',
  ].join('\n\n');
}

async function llmCompanionResponse(contextKey: VisorContextKey, prompt: string, twin: TwinState | null) {
  const context = findVisorContext(contextKey);
  const snapshot = readSnapshot(twin);
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      task: 'explain',
      input: prompt,
      mode: 'sfi_visor_companion',
      context: {
        visor_context: context,
        system_snapshot: snapshot,
        visible_memory: {
          nodes: twin?.data?.seed?.nodeCatalog ?? [],
          documents: twin?.data?.seed?.documentCatalog ?? [],
          patterns: twin?.data?.seed?.patternCatalog ?? [],
          proposals: twin?.data?.proposals ?? [],
          recentEvents: twin?.data?.seed?.recentEvents ?? [],
        },
        rule: SFI_VISOR_ROOT_PROMPT,
      },
    }),
  }).catch(() => null);

  if (!response?.ok) return null;
  const json = await response.json().catch(() => null) as { ok?: boolean; text?: string; output?: string } | null;
  if (!json?.ok) return null;
  return json.text || json.output || null;
}

export function useVisorMode() {
  const [enabled, setEnabled] = useState(false);
  return {
    enabled,
    setEnabled,
    toggle: () => setEnabled((current) => !current),
  };
}

export function useVisorContext(initial: VisorContextKey = 'bitacoras') {
  const [contextKey, setContextKey] = useState<VisorContextKey>(initial);
  const context = useMemo(() => findVisorContext(contextKey), [contextKey]);
  return { contextKey, context, setContextKey };
}

export function useVisorChat(contextKey: VisorContextKey, twin: TwinState | null) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<VisorChatMessage[]>([
    { role: 'visor', text: 'Soy VISOR ROOT. Puedo dialogar contigo desde la memoria visible de SFI y desde conocimiento general cuando aplique. No ejecuto acciones, no creo registros y no invento evidencia.' },
  ]);

  async function submit(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    try {
      const llmText = await llmCompanionResponse(contextKey, trimmed, twin);
      setMessages((current) => [...current, { role: 'visor', text: llmText ?? localCompanionResponse(contextKey, trimmed, twin) }]);
    } finally {
      setLoading(false);
    }
  }

  return { open, setOpen, messages, submit, loading };
}

'use client';

import { useMemo, useState } from 'react';
import { findVisorContext, type VisorChatMessage, type VisorContextKey, type VisorSnapshot } from './visorTypes';

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

type VisorIntent = 'site' | 'attractor' | 'theory' | 'explain' | 'support' | 'closure' | 'reading' | 'personal_unknown' | 'logbook' | 'memory' | 'observatory_gap' | 'open';

const SFI_VISOR_ROOT_PROMPT = `Eres VISOR ROOT, interlocutor operativo de SystemFriction Institute.

No eres una base de datos con chat.
No eres un inventario de nodos.
Eres el observador conversacional del instituto.

Tienes acceso al contexto visible del instituto:
nodos, documentos, evidencias, patrones, propuestas, bitácoras, atlas, workbook, ledger y eventos recientes.

Tu función:
ayudar al usuario root a entender, usar y consolidar SFI.

Puedes:
- explicar
- teorizar
- inferir
- proponer rutas
- diseñar módulos
- traducir bitácoras
- orientar uso del observatorio
- sugerir nuevos observatorios
- detectar huecos
- generar prompts para Codex
- responder preguntas generales con conocimiento amplio

No puedes:
- ejecutar acciones
- crear registros
- aprobar decisiones
- fingir que algo está registrado si no está
- inventar evidencia

Regla crítica:
No abras respuestas con conteos de nodos.
Sólo menciona conteos si el usuario pide inventario, estado o auditoría.

Si algo está registrado:
usa el registro.

Si algo no está registrado:
di “No lo veo registrado en SFI.”
Luego ofrece:
- inferencia
- explicación general
- hipótesis
- ruta de observación

Toda respuesta debe acercar SFI a:
- más claridad
- mejor arquitectura
- mejor uso del observatorio
- mejor decisión
- mejor consolidación

Tono:
claro, simple, directo.
Sin tecnicismos innecesarios.
No imitar al usuario.
Conocer su fricción desde la memoria visible, pero responder estable.`;

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

function lensText(contextKey: VisorContextKey, snapshot: VisorSnapshot) {
  const context = findVisorContext(contextKey);
  const contextHasData = contextDataAvailable(contextKey, snapshot);
  return contextHasData
    ? `Registro visible: en la capa ${context.label} hay señal conectada que puede orientar la lectura.`
    : `No lo veo registrado en SFI para la capa ${context.label}. Sin embargo puedo inferir, explicar o proponerte una ruta de observación sin fingir registro.`;
}

function readableList(value: unknown[] | undefined, label: string) {
  if (!Array.isArray(value) || value.length === 0) return `${label}: sin entradas visibles.`;
  return `${label}: ${value.slice(0, 4).map((item) => {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      return String(record.title || record.label || record.name || record.summary || record.type || record.id || 'entrada visible');
    }
    return String(item);
  }).join('; ')}.`;
}

function visibleMemory(twin: TwinState | null) {
  const seed = twin?.data?.seed;
  return [
    readableList(seed?.nodeCatalog, 'Nodos'),
    readableList(seed?.documentCatalog, 'Documentos/evidencias'),
    readableList(seed?.patternCatalog, 'Patrones'),
    readableList(twin?.data?.proposals, 'Propuestas'),
    readableList(seed?.recentEvents, 'Eventos recientes'),
  ].join('\n');
}

function localCompanionResponse(contextKey: VisorContextKey, prompt: string, twin: TwinState | null) {
  const context = findVisorContext(contextKey);
  const snapshot = readSnapshot(twin);
  const intent = intentFor(prompt);
  const lensLimit = lensText(contextKey, snapshot);

  if (intent === 'site') {
    return 'SystemFriction Institute es el campo donde estás convirtiendo fricción, memoria, evidencia y decisión en un sistema observable. No es sólo un sitio: es una herramienta para operar bitácoras, atlas, nodos, atractores, propuestas, decisiones, observatorios y rutas de ejecución.';
  }

  if (intent === 'personal_unknown') {
    return 'No lo veo registrado en SFI. Aun así puedo conversar sobre eso. Cuéntame qué pasa y lo observamos sin forzarlo a nodo: conducta, contexto, señal, repetición y qué te preocupa.';
  }

  if (intent === 'logbook') {
    return [
      'La bitácora en VISOR debe funcionar como memoria viva: qué pasó, qué se repitió, qué quedó abierto y qué pide cierre.',
      snapshot.events > 0
        ? 'Registro visible: hay eventos recientes conectados. Úsalos como entradas Usuario/Sistema/Agente antes de convertirlos en conclusión.'
        : 'Bitácora sin entradas legibles. Falta mapear recentEvents/logbook a entradas Usuario/Sistema/Agente.',
      'Ruta útil: leer la entrada, separar registro/inferencia/hipótesis, decidir si requiere evidencia y sólo después proponer una ruta de registro o cierre.',
    ].join('\n\n');
  }

  if (intent === 'memory') {
    return [
      'Puedo leer la memoria visible que llega al VISOR: nodos, documentos/evidencias, patrones, propuestas y eventos recientes. No leo capas privadas que no estén conectadas a este contexto.',
      visibleMemory(twin),
      'Inferencia: si una capa aparece vacía, no significa que no exista en tu historia; significa que no está visible para SFI en esta vista. Puedo ayudarte a decidir qué conviene registrar y qué conviene dejar como conversación.',
    ].join('\n\n');
  }

  if (intent === 'observatory_gap') {
    return [
      'Hipótesis operativa: puede faltar un observatorio de traducción entre bitácora y ejecución mínima.',
      'Ruta propuesta: 1) detectar entrada repetida, 2) exigir evidencia mínima, 3) formular perturbación MOP-H de bajo riesgo, 4) declarar criterio de cierre, 5) registrar sólo si el resultado deja rastro verificable.',
      'También pueden faltar observatorios por ecosistema digital: identidad/acceso, publicaciones, ventas, soporte, comunidad, automatizaciones y deuda técnica. Puedo convertir cualquiera en mapa de señales, riesgos y próximos pasos.',
    ].join('\n\n');
  }

  if (intent === 'attractor') {
    return [
      'Un atractor en SFI es una dirección de convergencia: no ordena por sí mismo, pero permite observar si decisiones, evidencias y acciones se alinean o se dispersan.',
      lensLimit,
      'Inferencia útil: si la misma fricción vuelve, hay patrón posible; si el patrón arrastra decisiones hacia una misma forma, hay atractor probable; si falta evidencia, queda como hipótesis y no como registro cerrado.',
    ].join('\n\n');
  }

  if (intent === 'theory') {
    return [
      'Puedo teorizar, pero separando capas: registro, inferencia e hipótesis.',
      lensLimit,
      'Conocimiento general: en sistemas complejos importa más la repetición que la intensidad aislada. En SFI eso se traduce en observar rastros, no sólo sensaciones fuertes.',
    ].join('\n\n');
  }

  if (intent === 'explain') {
    return [
      `Lectura desde ${context.label}: ${context.description}`,
      lensLimit,
      'Si lo que preguntas no está en SFI, no lo convierto en dato. Puedo explicarlo con conocimiento general o proponerte cómo observarlo sin crear registros desde el chat.',
    ].join('\n\n');
  }

  if (intent === 'support') {
    return [
      'Sí. Puedo acompañar la pregunta sin ejecutar nada ni crear registros.',
      'Dime el residuo en una frase. Yo lo devuelvo como: registro visible si existe, inferencia si hay base, hipótesis si falta evidencia, y ruta mínima si conviene observarlo.',
    ].join('\n\n');
  }

  if (intent === 'closure') {
    return [
      'Para cerrar algo en SFI hace falta una cadena mínima: qué pasó, qué evidencia lo sostiene, qué patrón toca, qué decisión pide y qué criterio permite decir “cerrado”.',
      lensLimit,
      'Si falta una pieza, no conviene cerrarlo. Conviene dejarlo como hipótesis, pendiente de workbook o ruta de observación.',
    ].join('\n\n');
  }

  if (intent === 'reading') {
    return [
      'Lectura operativa: busca repetición, no dramatismo. Una fricción pequeña pero recurrente suele pesar más que una señal intensa y aislada.',
      lensLimit,
      'Puedo ayudarte a convertir esa lectura en pregunta observable, bitácora legible o ruta de perturbación mínima sin ejecutar cambios desde el chat.',
    ].join('\n\n');
  }

  return 'Sí. Puedo dialogar libremente contigo desde VISOR. Uso SFI como memoria y marco cuando aplica, y conocimiento general cuando la pregunta lo requiere. Mi límite es no mentir: no invento registros ni ejecuto cambios. Puedo ayudarte a pensar, traducir, proyectar, diseñar rutas y consolidar el instituto.';
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

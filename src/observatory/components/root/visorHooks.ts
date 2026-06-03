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

type VisorIntent = 'site' | 'attractor' | 'theory' | 'explain' | 'support' | 'closure' | 'reading' | 'personal_unknown' | 'open';

const SFI_FREE_VISOR_CONTEXT = [
  'VISOR MODE es una capa de observación conversacional libre dentro de SystemFriction Institute.',
  'Debe responder como chat abierto: explicar, interpretar, preguntar, teorizar, reconocer límites y orientar búsqueda interna.',
  'No está obligado a convertir todo en nodos, evidencias o registros. Puede hablar de forma natural si la pregunta es abierta.',
  'Marco interno: SFI observa fricción sistémica, trazabilidad de decisiones, evidencias, bitácoras, atlas, atractores, patrones, nodos y cambios de régimen.',
  'Un atractor se entiende como una dirección, configuración o cuenca de coherencia hacia la que el sistema tiende o que el usuario declara para orientar observación y acción.',
  'Si el usuario pregunta qué es el sitio, explicar el sitio libremente: observatorio, laboratorio y sistema de lectura/registro de fricción, decisiones, evidencia, patrones y dirección operativa.',
  'Si el usuario pregunta por algo no registrado, no inventar. Decir que no está registrado como nodo y pedir contexto de forma abierta.',
  'Si falta evidencia, separar dato conectado, inferencia razonable y hueco no observado.',
].join('\n');

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

function hasConnectedData(snapshot: VisorSnapshot) {
  return snapshot.proposals + snapshot.nodes + snapshot.documents + snapshot.patterns + snapshot.events > 0;
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

function inventoryText(snapshot: VisorSnapshot) {
  return `Tengo a la vista: ${snapshot.nodes} nodos, ${snapshot.documents} documentos/evidencias, ${snapshot.patterns} patrones, ${snapshot.proposals} propuestas y ${snapshot.events} eventos recientes.`;
}

function lensText(contextKey: VisorContextKey, snapshot: VisorSnapshot) {
  const context = findVisorContext(contextKey);
  const contextHasData = contextDataAvailable(contextKey, snapshot);
  return contextHasData
    ? `Para ${context.label}, sí hay señal conectada.`
    : `Para ${context.label}, no veo una fuente directa conectada todavía. Puedo responder desde el marco SFI y declarar cuando algo sea inferencia.`;
}

function localCompanionResponse(contextKey: VisorContextKey, prompt: string, twin: TwinState | null) {
  const context = findVisorContext(contextKey);
  const snapshot = readSnapshot(twin);
  const connected = hasConnectedData(snapshot);
  const intent = intentFor(prompt);
  const inventory = inventoryText(snapshot);
  const lensLimit = lensText(contextKey, snapshot);

  if (intent === 'site') {
    return [
      'SystemFriction Institute es un sitio-observatorio: no sólo presenta información, organiza una forma de mirar sistemas.',
      'Su función es permitir que el usuario observe fricción, decisiones, bitácoras, evidencia, nodos, patrones, atractores y cambios de estado sin mover el sistema accidentalmente.',
      connected ? inventory : 'En este momento no necesito datos conectados para responder esto: hablo desde el marco del sitio.',
      'En términos simples: el sitio intenta convertir ruido operativo en trazabilidad; y trazabilidad en dirección de acción.',
    ].join('\n\n');
  }

  if (intent === 'attractor') {
    return [
      inventory,
      lensLimit,
      'Dirección de atractor: es la orientación hacia la que el sistema busca estabilizar lectura, decisión o acción. No es una orden mágica; es una hipótesis de convergencia.',
      '¿Por qué atractores? Porque en teoría de sistemas dinámicos un atractor describe regiones hacia las que ciertas trayectorias tienden. En SFI se usa como lenguaje operativo: una dirección declarada que permite observar si las acciones, evidencias y decisiones convergen o se dispersan.',
      'Si me pides el atractor actual y no está registrado, debo decirlo. Puedo inferir una dirección probable desde el contexto, pero no la presento como dato conectado.',
    ].join('\n\n');
  }

  if (intent === 'personal_unknown') {
    return [
      'No lo tengo registrado como nodo visible en este contexto.',
      'Cuéntame de ello y puedo ayudarte a observarlo sin forzarlo al sistema: qué es, por qué importa, qué relación tiene contigo y si conviene registrarlo o sólo conversarlo.',
    ].join('\n\n');
  }

  if (intent === 'theory') {
    return [
      connected ? inventory : 'No hay inventario conectado suficiente para afirmar un dato interno específico.',
      lensLimit,
      'Lectura teórica: puedo formular hipótesis dentro del marco SFI, pero debo separar lo observado de lo inferido.',
      'Si aparece residuo, puede ser una relación sin cierre entre evidencia, decisión y destino. Si aparece repetición, puede ser patrón. Si aparece dirección persistente, puede leerse como atractor provisional.',
      'No infiero como verdad. Propongo lectura, declaro límite y señalo qué evidencia faltaría.',
    ].join('\n\n');
  }

  if (intent === 'explain') {
    return [
      connected ? inventory : 'No hay datos conectados suficientes para este lente, pero puedo responder desde el marco general.',
      lensLimit,
      `Lectura corta: ${context.description} Visor no está aquí para mover nada; está para mirar, explicar y ordenar sin ruido.`,
      'Si algo no cuadra, separo tres capas: dato conectado, inferencia razonable y hueco sin evidencia.',
    ].join('\n\n');
  }

  if (intent === 'support') {
    return [
      connected ? inventory : 'No necesito un nodo conectado para acompañar esta pregunta.',
      'Estoy en modo observación. No ejecuto, no apruebo, no escribo registros.',
      'Dime el residuo o la duda en una frase. La convierto en una pregunta verificable o en una lectura tentativa, según corresponda.',
    ].join('\n\n');
  }

  if (intent === 'closure') {
    return [
      connected ? inventory : 'No veo todavía inventario suficiente para cerrar algo con certeza.',
      lensLimit,
      'Para cerrar algo, se requiere cadena mínima: qué existe, por qué existe, qué evidencia lo sostiene y qué destino correcto tiene.',
      'Si falta una pieza, no lo cierres como verdad. Déjalo como pendiente, hipótesis, workbook o pregunta abierta.',
    ].join('\n\n');
  }

  if (intent === 'reading') {
    return [
      connected ? inventory : 'Sin datos conectados puedo dar una guía de lectura, no un dictamen interno.',
      lensLimit,
      'Lectura: busca repetición, no intensidad. Una fricción repetida vale más que una alarma fuerte pero aislada.',
      'Puedo comparar patrones, eventos y propuestas visibles. Si no existen, puedo ayudarte a definir qué observar primero.',
    ].join('\n\n');
  }

  return [
    connected ? inventory : 'No hay datos conectados suficientes para este lente. Eso no bloquea la conversación.',
    lensLimit,
    'Puedo responder libremente dentro del marco SFI: explicar el sitio, pensar atractores, ordenar dudas, teorizar, hacer preguntas, detectar huecos y decir “no sé” cuando no haya base.',
    'Límite: no ejecuto acciones, no creo registros y no presento inferencias como datos.',
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
        rule: [
          SFI_FREE_VISOR_CONTEXT,
          'Tono: clínico, directo, estable. Precisión antes que dramatización.',
          'Responder libremente como chat conversacional de VISOR MODE, no como formulario de nodos.',
          'Puede contestar preguntas generales sobre el sitio, SFI, atractores, bitácoras, atlas, workbook, evidencia y dirección.',
          'Si pregunta por un objeto no registrado —por ejemplo un perro, una persona o una historia personal— decir que no está registrado como nodo y pedir contexto sin bloquear la conversación.',
          'No encadenar todo a evidencia si la pregunta es conceptual. Sí declarar límites cuando falte dato conectado.',
          'No ejecutar acciones, no crear registros, no aprobar decisiones y no fingir acceso a datos inexistentes.',
        ].join('\n'),
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

export function useVisorContext(initial: VisorContextKey = 'nodes') {
  const [contextKey, setContextKey] = useState<VisorContextKey>(initial);
  const context = useMemo(() => findVisorContext(contextKey), [contextKey]);
  return { contextKey, context, setContextKey };
}

export function useVisorChat(contextKey: VisorContextKey, twin: TwinState | null) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<VisorChatMessage[]>([
    { role: 'visor', text: 'Estoy en Visor Mode. Puedes preguntarme libremente. Observo el contexto de SystemFriction Institute, pero no estoy encadenado a nodos: si falta dato, lo digo; si la pregunta es conceptual, respondo desde el marco.' },
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

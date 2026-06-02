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

function intentFor(prompt: string) {
  const normalized = normalize(prompt);
  if (normalized.includes('teoria') || normalized.includes('hipotesis') || normalized.includes('que puede')) return 'theory';
  if (normalized.includes('duda') || normalized.includes('explica') || normalized.includes('por que') || normalized.includes('porque')) return 'explain';
  if (normalized.includes('que hago') || normalized.includes('ayuda') || normalized.includes('acompan') || normalized.includes('proceso')) return 'support';
  if (normalized.includes('falta') || normalized.includes('cerrar') || normalized.includes('abierto')) return 'closure';
  if (normalized.includes('cambio') || normalized.includes('semana') || normalized.includes('repetid') || normalized.includes('friccion')) return 'reading';
  return 'open';
}

function localCompanionResponse(contextKey: VisorContextKey, prompt: string, twin: TwinState | null) {
  const context = findVisorContext(contextKey);
  const snapshot = readSnapshot(twin);
  const connected = hasConnectedData(snapshot);
  const contextHasData = contextDataAvailable(contextKey, snapshot);
  const intent = intentFor(prompt);

  if (!connected) {
    return [
      'No hay datos conectados todavía para este lente.',
      'Puedo acompañarte igual: ordenar la duda, proponer una lectura tentativa o ayudarte a decidir qué mirar primero.',
      `Ahora estás mirando ${context.label}. Podemos empezar simple: ¿quieres entender, cerrar, comparar o detectar residuo?`,
    ].join('\n\n');
  }

  const inventory = `Tengo a la vista: ${snapshot.nodes} nodos, ${snapshot.documents} documentos/evidencias, ${snapshot.patterns} patrones, ${snapshot.proposals} propuestas y ${snapshot.events} eventos recientes.`;
  const lensLimit = contextHasData
    ? `Para ${context.label}, sí hay señal conectada.`
    : `Para ${context.label}, no veo una fuente directa conectada todavía; puedo cruzarlo con el estado general sin fingir detalle.`;

  if (intent === 'theory') {
    return [
      inventory,
      lensLimit,
      'Teoría de trabajo: si aparece residuo, probablemente no es un objeto nuevo; es una relación sin cierre entre evidencia, decisión y destino. Yo lo leería como presión acumulada hasta que aparezca una prueba mejor.',
      'Lo que haría ahora: escoger un solo hilo y preguntar qué evidencia lo sostiene. Lo que no haría: convertir la teoría en verdad del sistema.',
    ].join('\n\n');
  }

  if (intent === 'explain') {
    return [
      inventory,
      lensLimit,
      `Lectura corta: ${context.description} Visor no está aquí para mover nada; está para ayudarte a mirar sin ruido.`,
      'Si algo no cuadra, puedo separar tres capas: dato conectado, inferencia razonable y hueco sin evidencia.',
    ].join('\n\n');
  }

  if (intent === 'support') {
    return [
      inventory,
      'Estoy contigo en modo observación. No ejecuto, no apruebo, no escribo registros.',
      'Primero bajaría la presión: dime qué residuo te preocupa y lo convertimos en una pregunta verificable. Menos superficie, más precisión.',
    ].join('\n\n');
  }

  if (intent === 'closure') {
    return [
      inventory,
      lensLimit,
      'Para cerrar algo, necesito ver una cadena mínima: qué existe, por qué existe, qué evidencia lo sostiene y qué destino correcto tiene.',
      'Si falta una de esas piezas, no lo cierres todavía. Déjalo en Workbook/Cuadernillo o vuelve al flujo ACP.',
    ].join('\n\n');
  }

  if (intent === 'reading') {
    return [
      inventory,
      lensLimit,
      'Lectura: busca repetición, no intensidad. Una fricción repetida vale más que una alarma fuerte pero aislada.',
      'Puedo ayudarte a comparar patrones, eventos y propuestas visibles, pero no voy a inventar nombres que el estado no trae.',
    ].join('\n\n');
  }

  return [
    inventory,
    lensLimit,
    'Puedo responder libremente dentro de este marco: explicar, ordenar, teorizar, hacer preguntas, detectar huecos y acompañar el proceso.',
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
        rule: 'Responder como voz del sistema: quirurgico, puntual, menos es mas. Puede explicar, teorizar, apoyar y preguntar. No ejecutar. No mentir. Si falta dato, declararlo.',
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
    { role: 'visor', text: 'Estoy en Visor Mode. Puedo explicar, ordenar dudas, generar hipótesis y acompañarte. No ejecuto acciones ni invento datos.' },
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

'use client';

import { useMemo, useState } from 'react';
import { findVisorContext, type VisorChatMessage, type VisorContextKey } from './visorTypes';

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

function responseFor(contextKey: VisorContextKey, prompt: string, twin: TwinState | null) {
  const normalized = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const seed = twin?.data?.seed;
  const proposals = count(twin?.data?.proposals);
  const nodes = count(seed?.nodeCatalog);
  const docs = count(seed?.documentCatalog);
  const patterns = count(seed?.patternCatalog);
  const events = count(seed?.recentEvents);

  if (!twin?.ok && !seed) return 'No hay datos conectados todavía para este lente.';

  if (contextKey === 'nodes') {
    if (!nodes) return 'No hay datos conectados todavía para este lente.';
    return `Nodos disponibles: ${nodes}. Puedo observar el catalogo, pero no crear ni mover nodos desde Visor Mode.`;
  }

  if (contextKey === 'evidence') {
    if (!docs) return 'No hay datos conectados todavía para este lente.';
    return `Evidencia/documentos visibles: ${docs}. Si quieres cierre, revisa validacion fuera del Visor.`;
  }

  if (contextKey === 'acp' || contextKey === 'ledger') {
    if (!proposals && !events) return 'No hay datos conectados todavía para este lente.';
    return `ACP/Ledger visible: ${proposals} propuestas y ${events} eventos recientes. Visor solo observa; no aprueba ni ejecuta.`;
  }

  if (contextKey === 'attractors') {
    if (!proposals && !patterns) return 'No hay datos conectados todavía para este lente.';
    if (normalized.includes('abierto') || normalized.includes('cerrar') || normalized.includes('evidencia')) {
      return `Hay ${proposals} propuestas y ${patterns} patrones visibles para contrastar atractores. No cierres nada desde Visor; usa ACP o Workbook.`;
    }
    return `Atractores observables por propuestas/patrones: ${proposals + patterns}. Falta conectar detalle especifico si necesitas nombres.`;
  }

  if (contextKey === 'atlas') {
    if (!docs) return 'No hay datos conectados todavía para este lente.';
    return `Atlas tiene ${docs} documentos observables desde el estado Twin. Para promover entradas, sal del Visor y usa Atlas/Cuadernillo.`;
  }

  if (contextKey === 'workbook') {
    return 'No hay datos conectados todavía para este lente.';
  }

  if (contextKey === 'bitacoras') {
    if (!events) return 'No hay datos conectados todavía para este lente.';
    return `Bitacoras/eventos recientes visibles: ${events}. Puedo resumir acumulacion, pero no escribir entradas desde Visor.`;
  }

  if (contextKey === 'amc') {
    if (!patterns && !events) return 'No hay datos conectados todavía para este lente.';
    return `AMC observable: ${patterns} patrones y ${events} eventos recientes. Para mutar, usa el flujo gobernado ACP.`;
  }

  if (contextKey === 'folders') {
    return 'No hay datos conectados todavía para este lente.';
  }

  return 'No hay datos conectados todavía para este lente.';
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
  const [messages, setMessages] = useState<VisorChatMessage[]>([
    { role: 'visor', text: 'Selecciona un lente y pregunta. Visor observa; no crea registros ni ejecuta acciones.' },
  ]);

  function submit(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: 'user', text: trimmed },
      { role: 'visor', text: responseFor(contextKey, trimmed, twin) },
    ]);
  }

  return { open, setOpen, messages, submit };
}

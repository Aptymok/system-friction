import { appendSfiOperationalEvent, type SfiOperationalEvent } from '@/lib/sfi/operational/events';

type AdapterResult = {
  ok: boolean;
  organ: string;
  source: string;
  status: 'connected' | 'degraded' | 'unavailable';
  summary: string;
  payload?: Record<string, unknown>;
  event?: SfiOperationalEvent;
};

async function safeJsonFromLocalRoute(route: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
      'http://localhost:3000';

    const response = await fetch(`${baseUrl}${route}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' }
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP_${response.status}` };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_error' };
  }
}

export async function observeScoreFrictionAdapter(): Promise<AdapterResult> {
  const candidates = ['/api/scorefriction/state', '/api/scorefriction/worldspect', '/api/worldspect/state'];

  for (const route of candidates) {
    const result = await safeJsonFromLocalRoute(route);
    if (result.ok) {
      const event = appendSfiOperationalEvent({
        organ: 'scorefriction',
        kind: 'adapter_observation',
        title: 'ScoreFriction adapter conectado',
        summary: `P04 leyó estado desde ${route}.`,
        source: route,
        risk: 'medium',
        status: 'observed',
        payload: { route, data: result.data as Record<string, unknown> },
        next_action: 'Normalizar esta salida a WSV desglosado + narrativa puntual.'
      });

      return {
        ok: true,
        organ: 'scorefriction',
        source: route,
        status: 'connected',
        summary: `ScoreFriction respondió desde ${route}.`,
        payload: { data: result.data as Record<string, unknown> },
        event
      };
    }
  }

  const event = appendSfiOperationalEvent({
    organ: 'scorefriction',
    kind: 'adapter_degraded',
    title: 'ScoreFriction sin contrato estable detectado',
    summary: 'P04 no encontró una ruta ScoreFriction estable que devuelva estado operativo.',
    source: 'p04/adapters/scorefriction',
    risk: 'medium',
    status: 'pending',
    next_action: 'Crear /api/scorefriction/state como contrato estable.'
  });

  return {
    ok: false,
    organ: 'scorefriction',
    source: 'p04/adapters/scorefriction',
    status: 'degraded',
    summary: 'No se encontró estado ScoreFriction estable.',
    event
  };
}

export async function observeEvaluatorAdapter(): Promise<AdapterResult> {
  const candidates = ['/api/mihm/state', '/api/mihm', '/api/sfi-engine/evaluate'];

  for (const route of candidates) {
    const result = await safeJsonFromLocalRoute(route);
    if (result.ok) {
      const event = appendSfiOperationalEvent({
        organ: 'evaluator',
        kind: 'adapter_observation',
        title: 'Evaluator / MIHM adapter conectado',
        summary: `P04 leyó estado desde ${route}.`,
        source: route,
        risk: 'medium',
        status: 'observed',
        payload: { route, data: result.data as Record<string, unknown> },
        next_action: 'Normalizar salida MIHM a IHG / NTI / LTI / FS / PHI + narrativa.'
      });

      return {
        ok: true,
        organ: 'evaluator',
        source: route,
        status: 'connected',
        summary: `Evaluator respondió desde ${route}.`,
        payload: { data: result.data as Record<string, unknown> },
        event
      };
    }
  }

  const event = appendSfiOperationalEvent({
    organ: 'evaluator',
    kind: 'adapter_degraded',
    title: 'Evaluator / MIHM sin salida operacional estable',
    summary: 'P04 no encontró ruta MIHM estable de estado evaluador.',
    source: 'p04/adapters/evaluator',
    risk: 'medium',
    status: 'pending',
    next_action: 'Crear contrato /api/mihm/state o adaptar /api/mihm/process.'
  });

  return {
    ok: false,
    organ: 'evaluator',
    source: 'p04/adapters/evaluator',
    status: 'degraded',
    summary: 'No se encontró estado Evaluator / MIHM estable.',
    event
  };
}

export async function observeAmvAdapter(): Promise<AdapterResult> {
  const candidates = ['/api/amv/state', '/api/amv', '/api/cognitive-twin', '/api/twin/state'];

  for (const route of candidates) {
    const result = await safeJsonFromLocalRoute(route);
    if (result.ok) {
      const event = appendSfiOperationalEvent({
        organ: 'amv_cognitive_twin',
        kind: 'adapter_observation',
        title: 'AMV + Gemelo Cognitivo adapter conectado',
        summary: `P04 leyó estado desde ${route}.`,
        source: route,
        risk: 'medium',
        status: 'observed',
        payload: { route, data: result.data as Record<string, unknown> },
        next_action: 'Separar observación, inferencia, propuesta y decisión como campos formales.'
      });

      return {
        ok: true,
        organ: 'amv_cognitive_twin',
        source: route,
        status: 'connected',
        summary: `AMV/Gemelo respondió desde ${route}.`,
        payload: { data: result.data as Record<string, unknown> },
        event
      };
    }
  }

  const event = appendSfiOperationalEvent({
    organ: 'amv_cognitive_twin',
    kind: 'adapter_degraded',
    title: 'AMV + Gemelo Cognitivo sin contrato estable',
    summary: 'P04 no encontró ruta AMV/Gemelo estable de estado operacional.',
    source: 'p04/adapters/amv',
    risk: 'medium',
    status: 'pending',
    next_action: 'Crear /api/amv/state con observación, inferencia, propuesta y decisión separadas.'
  });

  return {
    ok: false,
    organ: 'amv_cognitive_twin',
    source: 'p04/adapters/amv',
    status: 'degraded',
    summary: 'No se encontró estado AMV/Gemelo estable.',
    event
  };
}

export async function runP04Adapters() {
  const [scorefriction, evaluator, amv] = await Promise.all([
    observeScoreFrictionAdapter(),
    observeEvaluatorAdapter(),
    observeAmvAdapter()
  ]);

  return {
    ok: true,
    patch: 'P04',
    status: 'adapter_probe_complete',
    generated_at: new Date().toISOString(),
    adapters: {
      scorefriction,
      evaluator,
      amv_cognitive_twin: amv
    },
    next_action: 'Convertir las rutas conectadas en contratos estables o crear adaptadores internos si siguen degradadas.'
  };
}

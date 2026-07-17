import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';
import { scoreFrictionToInstrumentState } from '@/lib/mihm/adapters/scoreFrictionInstrumentAdapter';
import { worldVectorToInstrumentState } from '@/lib/mihm/adapters/worldVectorInstrumentAdapter';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import type { RootDataStatus, RootObservedValue, RootSystemItem } from '../rootSovereignState';
import { errorMessage } from './readerSupport';

/**
 * Este archivo existe para responder una sola pregunta, en un solo lugar:
 * "¿cómo está el instrumento, ahora mismo, sin tener que recordar dónde
 * mirar?" Llena `matrix` en readRootSystemState.ts, que hasta hoy estaba
 * hardcodeado vacío (`matrix: []`). No crea una vista nueva — se muestra en
 * el OVERVIEW que ya existe, vía el componente SystemMatrix que ya existía
 * pero no tenía nada que mostrar.
 *
 * Deliberadamente NO incluye al agente Cognitive Twin aquí (sería una
 * llamada a LLM en cada carga de /root, con el costo y la latencia que eso
 * implica). Esta matriz es lectura de datos ya persistidos, no inferencia
 * nueva en cada visita.
 */

function emptyOpenItems(source: string): RootObservedValue<number> {
  return { value: null, status: 'missing', source, observedAt: null, confidence: null, evidenceIds: [], explanation: '', warning: null };
}

function textValue(input: {
  value: string | null;
  status: RootDataStatus;
  source: string;
  observedAt: string | null;
  confidence?: number | null;
  explanation?: string;
  warning?: string | null;
}): RootObservedValue<string> {
  return {
    value: input.value,
    status: input.status,
    source: input.source,
    observedAt: input.observedAt,
    confidence: input.confidence ?? null,
    evidenceIds: [],
    explanation: input.explanation ?? '',
    warning: input.warning ?? null,
  };
}

function instrumentStateToSystemItem(id: string, label: string, explanation: string, state: MihmInstrumentState): RootSystemItem {
  const hasReading = state.homeostaticState !== null;
  const status: RootDataStatus = !hasReading ? 'missing' : state.warnings.length > 0 ? 'degraded' : 'observed';
  const value = hasReading
    ? `${state.homeostaticState!.symbol} = ${state.homeostaticState!.value?.toFixed(3) ?? '—'}`
    : null;

  return {
    id,
    label,
    state: textValue({
      value,
      status,
      source: state.instrument,
      observedAt: state.observedAt,
      confidence: state.confidence,
      explanation,
      warning: state.warnings[0] ?? null,
    }),
    openItems: emptyOpenItems(state.instrument),
  };
}

async function readPersonalRow(): Promise<RootSystemItem> {
  // Φₚ (MOP-H) es una lectura por sesión, no un estado global — no hay
  // "última sesión" única con sentido para todo el sistema. Se declara
  // así explícitamente en vez de fabricar un promedio sin base.
  return {
    id: 'mihm-phi-p',
    label: 'Φₚ · MOP-H',
    state: textValue({
      value: null,
      status: 'missing',
      source: 'moph_sessions',
      observedAt: null,
      explanation: 'Lectura por sesión, no global. Consultar /api/moph/session?id=<clave de sesión>.',
    }),
    openItems: emptyOpenItems('moph_sessions'),
  };
}

async function readPhenomenologicalRow(): Promise<RootSystemItem> {
  try {
    const client = createServiceSupabaseClient();
    const [{ data: latest, error: latestError }, { count, error: countError }] = await Promise.all([
      client
        .from('ppoi_phenomena')
        .select('fp_code, current_composite, indices_calculated_at')
        .not('current_composite', 'is', null)
        .order('indices_calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client.from('ppoi_phenomena').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    ]);
    if (latestError) throw new Error(errorMessage(latestError));
    if (countError) throw new Error(errorMessage(countError));

    const hasReading = Boolean(latest) && typeof latest?.current_composite === 'number';

    return {
      id: 'mihm-phi-f',
      label: 'Φ𝒻 · PPOI',
      state: textValue({
        value: hasReading ? `Φ𝒻 = ${Number(latest!.current_composite).toFixed(3)} (${latest!.fp_code})` : null,
        status: hasReading ? 'observed' : 'missing',
        source: 'ppoi_phenomena',
        observedAt: hasReading && typeof latest!.indices_calculated_at === 'string' ? latest!.indices_calculated_at : null,
        explanation: 'Expediente PPOI con recalibración más reciente entre todos los abiertos.',
      }),
      openItems: {
        value: count ?? null,
        status: count === null ? 'missing' : 'observed',
        source: 'ppoi_phenomena',
        observedAt: null,
        confidence: null,
        evidenceIds: [],
        explanation: 'Expedientes PPOI en estado ACTIVE.',
        warning: null,
      },
    };
  } catch (error) {
    return {
      id: 'mihm-phi-f',
      label: 'Φ𝒻 · PPOI',
      state: textValue({ value: null, status: 'degraded', source: 'ppoi_phenomena', observedAt: null, warning: errorMessage(error) }),
      openItems: emptyOpenItems('ppoi_phenomena'),
    };
  }
}

function readProvidersRow(): RootSystemItem {
  const providers = getLlmProviderStatus();
  const available = providers.filter((provider: { available: boolean }) => provider.available);

  return {
    id: 'mihm-llm-providers',
    label: 'PROVEEDORES LLM',
    state: textValue({
      value: `${available.length}/${providers.length} configurados`,
      status: available.length > 0 ? 'observed' : 'missing',
      source: 'providerRouter',
      observedAt: null,
      explanation: available.length > 0
        ? `Activos: ${available.map((provider: { id: string }) => provider.id).join(', ')}.`
        : 'Ninguna llave de proveedor configurada en este entorno — todo agente cae a modo degradado con texto estático.',
      warning: available.length === 0 ? 'sin_proveedor_configurado' : null,
    }),
    openItems: emptyOpenItems('providerRouter'),
  };
}

export async function readRootMihmMatrix(): Promise<RootSystemItem[]> {
  const [personal, systemic, world, phenomenological] = await Promise.all([
    readPersonalRow(),
    buildDerivedMihmRuntime()
      .then((runtime: Awaited<ReturnType<typeof buildDerivedMihmRuntime>>) => scoreFrictionToInstrumentState(runtime))
      .then((state: MihmInstrumentState) => instrumentStateToSystemItem('mihm-phi-s', 'Φₛ · ScoreFriction', 'Derivado de scorefriction_vectors, agregado más reciente.', state))
      .catch((error: unknown) => ({
        id: 'mihm-phi-s',
        label: 'Φₛ · ScoreFriction',
        state: textValue({ value: null, status: 'degraded' as RootDataStatus, source: 'scorefriction_vectors', observedAt: null, warning: errorMessage(error) }),
        openItems: emptyOpenItems('scorefriction_vectors'),
      })),
    worldVectorToInstrumentState()
      .then((state: MihmInstrumentState) => instrumentStateToSystemItem('mihm-phi-w', 'Φ𝓌 · World Vector', 'wsi agregado de 10 dominios, worldspect_snapshots más reciente.', state))
      .catch((error: unknown) => ({
        id: 'mihm-phi-w',
        label: 'Φ𝓌 · World Vector',
        state: textValue({ value: null, status: 'degraded' as RootDataStatus, source: 'worldspect_snapshots', observedAt: null, warning: errorMessage(error) }),
        openItems: emptyOpenItems('worldspect_snapshots'),
      })),
    readPhenomenologicalRow(),
  ]);

  return [personal, systemic, world, phenomenological, readProvidersRow()];
}

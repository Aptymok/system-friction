import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';
import { scoreFrictionToInstrumentState } from '@/lib/mihm/adapters/scoreFrictionInstrumentAdapter';
import { worldVectorToInstrumentState } from '@/lib/mihm/adapters/worldVectorInstrumentAdapter';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import { clamp01, evaluateSfi } from '@/lib/sfi/math';
import type { RootDataStatus, RootObservedValue, RootSystemItem } from '../rootSovereignState';
import { errorMessage } from './readerSupport';

function emptyOpenItems(source: string): RootObservedValue<number> {
  return {
    value: null,
    status: 'missing',
    source,
    observedAt: null,
    confidence: null,
    evidenceIds: [],
    explanation: '',
    warning: null,
  };
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

function instrumentStateToSystemItem(
  id: string,
  label: string,
  explanation: string,
  state: MihmInstrumentState,
): RootSystemItem {
  const hasReading = state.homeostaticState !== null;
  const status: RootDataStatus = !hasReading
    ? 'missing'
    : state.warnings.length > 0
      ? 'degraded'
      : 'observed';
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

function bounded(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? clamp01(parsed) : null;
}

function sourceMeta(value: unknown): {
  status: RootDataStatus;
  confidence: number;
  warning: string | null;
} {
  const status = String(value ?? 'thin').toLowerCase();
  if (status === 'observed') {
    return { status: 'observed', confidence: 1, warning: null };
  }
  if (status === 'failed') {
    return { status: 'degraded', confidence: 0.2, warning: 'indicator_snapshot_failed' };
  }
  if (status === 'degraded') {
    return { status: 'degraded', confidence: 0.5, warning: 'indicator_snapshot_degraded' };
  }
  return { status: 'derived', confidence: 0.7, warning: 'indicator_snapshot_thin' };
}

function institutionalRow(input: {
  id: string;
  label: string;
  value: number | string | null;
  status: RootDataStatus;
  observedAt: string | null;
  confidence: number | null;
  explanation: string;
  warning?: string | null;
}): RootSystemItem {
  return {
    id: input.id,
    label: input.label,
    state: textValue({
      value: typeof input.value === 'number' ? input.value.toFixed(6) : input.value,
      status: input.status,
      source: 'sfi_indicator_snapshots',
      observedAt: input.observedAt,
      confidence: input.confidence,
      explanation: input.explanation,
      warning: input.warning ?? null,
    }),
    openItems: emptyOpenItems('sfi_indicator_snapshots'),
  };
}

function unavailableInstitutionalRows(
  status: RootDataStatus,
  warning: string | null,
): RootSystemItem[] {
  const explanation = 'No existe un snapshot institucional completo. Ejecuta el ciclo ROOT de observación para generarlo.';
  return [
    ['ihg', 'IHG · INSTITUCIONAL'],
    ['nti', 'NTI · INSTITUCIONAL'],
    ['ldi', 'LDI · INSTITUCIONAL'],
    ['xi', 'ξ · RESIDUAL'],
    ['phi_sf', 'Φ_SF · INSTITUCIONAL'],
    ['friction_index', 'F_s · FRICCIÓN SISTÉMICA'],
    ['wsv', 'WSV · WORLD STATE VECTOR'],
    ['regime', 'RÉGIMEN · INSTITUCIONAL'],
  ].map(([id, label]) => institutionalRow({
    id,
    label,
    value: null,
    status,
    observedAt: null,
    confidence: null,
    explanation,
    warning,
  }));
}

async function readInstitutionalRows(): Promise<RootSystemItem[]> {
  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from('sfi_indicator_snapshots')
      .select('captured_at,ihg,nti,ldi,wsv,source_status')
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(errorMessage(error));
    if (!data) return unavailableInstitutionalRows('missing', 'indicator_snapshot_missing');

    const ihg = bounded(data.ihg);
    const nti = bounded(data.nti);
    const ldi = bounded(data.ldi);
    const wsv = bounded(data.wsv);
    const observedAt = typeof data.captured_at === 'string' ? data.captured_at : null;

    if (ihg === null || nti === null || ldi === null) {
      return unavailableInstitutionalRows('degraded', 'indicator_snapshot_incomplete');
    }

    const xi = 0.03;
    const metrics = evaluateSfi({ ihg, nti, ldi, xi });
    const meta = sourceMeta(data.source_status);
    const baseWarning = meta.warning;
    const derivedWarning = [baseWarning, 'xi_default_0.03'].filter(Boolean).join(' | ');

    return [
      institutionalRow({
        id: 'ihg',
        label: 'IHG · INSTITUCIONAL',
        value: metrics.ihg,
        status: meta.status,
        observedAt,
        confidence: meta.confidence,
        explanation: 'Integridad/cohesión institucional derivada del snapshot operativo persistido.',
        warning: baseWarning,
      }),
      institutionalRow({
        id: 'nti',
        label: 'NTI · INSTITUCIONAL',
        value: metrics.nti,
        status: meta.status,
        observedAt,
        confidence: meta.confidence,
        explanation: 'Intensidad y trazabilidad institucional persistidas en el snapshot operativo.',
        warning: baseWarning,
      }),
      institutionalRow({
        id: 'ldi',
        label: 'LDI · INSTITUCIONAL',
        value: metrics.ldi,
        status: meta.status,
        observedAt,
        confidence: meta.confidence,
        explanation: 'Disipación longitudinal institucional persistida en el snapshot operativo.',
        warning: baseWarning,
      }),
      institutionalRow({
        id: 'xi',
        label: 'ξ · RESIDUAL',
        value: metrics.xi,
        status: 'derived',
        observedAt,
        confidence: Math.min(meta.confidence, 0.7),
        explanation: 'Residual canónico por defecto. Debe sustituirse cuando exista ξ calibrado.',
        warning: derivedWarning,
      }),
      institutionalRow({
        id: 'phi_sf',
        label: 'Φ_SF · INSTITUCIONAL',
        value: metrics.phi,
        status: meta.status === 'degraded' ? 'degraded' : 'derived',
        observedAt,
        confidence: Math.min(meta.confidence, 0.7),
        explanation: 'Φ_SF = clamp01((IHG × NTI) / (1 + LDI) + ξ), versión Math Core vigente.',
        warning: derivedWarning,
      }),
      institutionalRow({
        id: 'friction_index',
        label: 'F_s · FRICCIÓN SISTÉMICA',
        value: metrics.fs,
        status: meta.status === 'degraded' ? 'degraded' : 'derived',
        observedAt,
        confidence: Math.min(meta.confidence, 0.7),
        explanation: 'F_s = 1 − Φ_SF bajo el Math Core canónico.',
        warning: derivedWarning,
      }),
      institutionalRow({
        id: 'wsv',
        label: 'WSV · WORLD STATE VECTOR',
        value: wsv,
        status: wsv === null ? 'missing' : meta.status,
        observedAt,
        confidence: wsv === null ? null : meta.confidence,
        explanation: 'Estado mundial agregado asociado al mismo snapshot institucional.',
        warning: wsv === null ? 'wsv_missing_in_snapshot' : baseWarning,
      }),
      institutionalRow({
        id: 'regime',
        label: 'RÉGIMEN · INSTITUCIONAL',
        value: metrics.regime,
        status: meta.status === 'degraded' ? 'degraded' : 'derived',
        observedAt,
        confidence: Math.min(meta.confidence, 0.7),
        explanation: 'Clasificación HOMEOSTATICO / CRITICO / ENTROPICO calculada con el Math Core.',
        warning: derivedWarning,
      }),
    ];
  } catch (error) {
    return unavailableInstitutionalRows('degraded', errorMessage(error));
  }
}

async function readPersonalRow(): Promise<RootSystemItem> {
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
        observedAt: hasReading && typeof latest!.indices_calculated_at === 'string'
          ? latest!.indices_calculated_at
          : null,
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
      state: textValue({
        value: null,
        status: 'degraded',
        source: 'ppoi_phenomena',
        observedAt: null,
        warning: errorMessage(error),
      }),
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
  const [institutional, personal, systemic, world, phenomenological] = await Promise.all([
    readInstitutionalRows(),
    readPersonalRow(),
    buildDerivedMihmRuntime()
      .then((runtime: Awaited<ReturnType<typeof buildDerivedMihmRuntime>>) =>
        scoreFrictionToInstrumentState(runtime))
      .then((state: MihmInstrumentState) =>
        instrumentStateToSystemItem(
          'mihm-phi-s',
          'Φₛ · ScoreFriction',
          'Derivado de scorefriction_vectors, agregado más reciente.',
          state,
        ))
      .catch((error: unknown) => ({
        id: 'mihm-phi-s',
        label: 'Φₛ · ScoreFriction',
        state: textValue({
          value: null,
          status: 'degraded' as RootDataStatus,
          source: 'scorefriction_vectors',
          observedAt: null,
          warning: errorMessage(error),
        }),
        openItems: emptyOpenItems('scorefriction_vectors'),
      })),
    worldVectorToInstrumentState()
      .then((state: MihmInstrumentState) =>
        instrumentStateToSystemItem(
          'mihm-phi-w',
          'Φ𝓌 · World Vector',
          'WSI agregado de 10 dominios, worldspect_snapshots más reciente.',
          state,
        ))
      .catch((error: unknown) => ({
        id: 'mihm-phi-w',
        label: 'Φ𝓌 · World Vector',
        state: textValue({
          value: null,
          status: 'degraded' as RootDataStatus,
          source: 'worldspect_snapshots',
          observedAt: null,
          warning: errorMessage(error),
        }),
        openItems: emptyOpenItems('worldspect_snapshots'),
      })),
    readPhenomenologicalRow(),
  ]);

  return [
    ...institutional,
    personal,
    systemic,
    world,
    phenomenological,
    readProvidersRow(),
  ];
}

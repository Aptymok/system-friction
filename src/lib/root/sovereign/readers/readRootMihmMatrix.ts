import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';
import { scoreFrictionToInstrumentState } from '@/lib/mihm/adapters/scoreFrictionInstrumentAdapter';
import { worldVectorToInstrumentState } from '@/lib/mihm/adapters/worldVectorInstrumentAdapter';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import { normalizePpoiComposite } from '@/lib/mihm/phiContract';
import { readInstitutionalPhiState } from '@/lib/mihm/institutionalPhiState';
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

function statusFromEpistemic(value: string): RootDataStatus {
  if (value === 'OBSERVED') return 'observed';
  if (value === 'DERIVED' || value === 'THIN') return 'derived';
  if (value === 'MISSING') return 'missing';
  return 'degraded';
}

function instrumentStateToSystemItem(
  id: string,
  label: string,
  explanation: string,
  state: MihmInstrumentState,
): RootSystemItem {
  const reading = state.homeostaticState;
  const status: RootDataStatus = reading
    ? statusFromEpistemic(reading.epistemicStatus)
    : 'missing';

  return {
    id,
    label,
    state: textValue({
      value: reading?.value === null || reading?.value === undefined
        ? null
        : `${reading.label} = ${reading.value.toFixed(3)}`,
      status,
      source: state.instrument,
      observedAt: state.observedAt,
      confidence: state.confidence,
      explanation: reading
        ? `${explanation} · ${reading.formulaVersion} · ${reading.semanticRole}`
        : explanation,
      warning: state.warnings.join(' | ') || null,
    }),
    openItems: emptyOpenItems(state.instrument),
  };
}

function institutionalItem(input: {
  id: string;
  label: string;
  value: number | string | null;
  status: RootDataStatus;
  observedAt: string | null;
  confidence: number | null;
  explanation: string;
  warning: string | null;
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
      warning: input.warning,
    }),
    openItems: emptyOpenItems('sfi_indicator_snapshots'),
  };
}

async function readInstitutionalRows(): Promise<RootSystemItem[]> {
  const state = await readInstitutionalPhiState();
  const status = statusFromEpistemic(state.status);
  const warning = state.warnings.join(' | ') || null;
  const metrics = state.metrics;

  if (!metrics) {
    return [
      institutionalItem({
        id: 'mihm-phi-sfi',
        label: 'Φ_SFI · INSTITUCIÓN',
        value: null,
        status,
        observedAt: state.observedAt,
        confidence: state.confidence,
        explanation: 'No existe un snapshot institucional suficiente para calcular Φ_SFI.',
        warning,
      }),
    ];
  }

  return [
    institutionalItem({ id: 'mihm-sfi-ihg', label: 'IHG · SFI', value: metrics.ihg, status, observedAt: state.observedAt, confidence: state.confidence, explanation: 'Integridad institucional del snapshot identificado.', warning }),
    institutionalItem({ id: 'mihm-sfi-nti', label: 'NTI · SFI', value: metrics.nti, status, observedAt: state.observedAt, confidence: state.confidence, explanation: 'Intensidad y trazabilidad institucional del snapshot identificado.', warning }),
    institutionalItem({ id: 'mihm-sfi-ldi', label: 'LDI · SFI', value: metrics.ldi, status, observedAt: state.observedAt, confidence: state.confidence, explanation: 'Disipación longitudinal institucional del snapshot identificado.', warning }),
    institutionalItem({ id: 'mihm-sfi-xi', label: 'ξ · SFI', value: metrics.xi, status: 'derived', observedAt: state.observedAt, confidence: state.confidence, explanation: 'Residual temporal por defecto; el estado permanece THIN hasta que ξ sea calibrado.', warning }),
    institutionalItem({ id: 'mihm-phi-sfi', label: 'Φ_SFI · INSTITUCIÓN', value: metrics.phi, status, observedAt: state.observedAt, confidence: state.confidence, explanation: `Estado institucional exclusivo de SFI · ${state.formulaVersion}.`, warning }),
    institutionalItem({ id: 'mihm-sfi-fs', label: 'F_S · SFI', value: metrics.fs, status, observedAt: state.observedAt, confidence: state.confidence, explanation: 'F_S = 1 − Φ_SFI.', warning }),
    institutionalItem({ id: 'mihm-sfi-regime', label: 'RÉGIMEN · SFI', value: metrics.regime, status, observedAt: state.observedAt, confidence: state.confidence, explanation: 'Régimen institucional derivado del mismo snapshot.', warning }),
  ];
}

function readPersonalRow(): RootSystemItem {
  return {
    id: 'mihm-phi-h',
    label: 'Φ_H · MOP-H',
    state: textValue({
      value: null,
      status: 'missing',
      source: 'moph_sessions',
      observedAt: null,
      explanation: 'Lectura humana por sesión identificada. No existe un Φ_H global ni se agrega a Φ_SFI.',
    }),
    openItems: emptyOpenItems('moph_sessions'),
  };
}

async function readPhenomenologicalRow(): Promise<RootSystemItem> {
  try {
    const client = createServiceSupabaseClient();
    const PPOI_ACTIVE_SAMPLE_LIMIT = 201;
    const [{ data: latest, error: latestError }, { data: activeRows, error: activeError }] = await Promise.all([
      client
        .from('ppoi_phenomena')
        .select('fp_code, current_composite, indices_calculated_at')
        .not('current_composite', 'is', null)
        .order('indices_calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from('ppoi_phenomena')
        .select('id')
        .eq('status', 'ACTIVE')
        .limit(PPOI_ACTIVE_SAMPLE_LIMIT),
    ]);

    if (latestError) throw new Error(errorMessage(latestError));
    if (activeError) throw new Error(errorMessage(activeError));

    const rawComposite = typeof latest?.current_composite === 'number' ? latest.current_composite : null;
    const phiF = rawComposite === null ? null : normalizePpoiComposite(rawComposite);
    const sampledActiveCount = activeRows?.length ?? 0;
    const sampleSaturated = sampledActiveCount >= PPOI_ACTIVE_SAMPLE_LIMIT;

    return {
      id: 'mihm-phi-f',
      label: 'Φ_F · PPOI',
      state: textValue({
        value: phiF === null ? null : `Φ_F = ${phiF.toFixed(3)} (${latest!.fp_code}; compuesto ${rawComposite!.toFixed(3)}/5)`,
        status: phiF === null ? 'missing' : 'derived',
        source: 'ppoi_phenomena',
        observedAt: typeof latest?.indices_calculated_at === 'string' ? latest.indices_calculated_at : null,
        explanation: 'Persistencia fenomenológica normalizada desde el compuesto PPOI 0–5. No representa salud institucional.',
      }),
      openItems: {
        value: sampledActiveCount,
        status: 'observed',
        source: 'ppoi_phenomena',
        observedAt: null,
        confidence: null,
        evidenceIds: [],
        explanation: sampleSaturated
          ? `Se observaron al menos ${sampledActiveCount} expedientes PPOI ACTIVE dentro del límite interactivo; no se ejecutó COUNT(*) exacto.`
          : 'Expedientes PPOI en estado ACTIVE observados dentro de una lectura acotada.',
        warning: sampleSaturated ? 'PPOI_ACTIVE_COUNT_BOUNDED_NOT_EXHAUSTIVE' : null,
      },
    };
  } catch (error) {
    return {
      id: 'mihm-phi-f',
      label: 'Φ_F · PPOI',
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
        : 'Ninguna llave de proveedor configurada. La disponibilidad de LLM no modifica el contrato MIHM.',
      warning: available.length === 0 ? 'sin_proveedor_configurado' : null,
    }),
    openItems: emptyOpenItems('providerRouter'),
  };
}

export async function readRootMihmMatrix(): Promise<RootSystemItem[]> {
  const [institutional, systemic, world, phenomenological] = await Promise.all([
    readInstitutionalRows(),
    buildDerivedMihmRuntime()
      .then((runtime) => scoreFrictionToInstrumentState(runtime))
      .then((state) => instrumentStateToSystemItem(
        'mihm-phi-s',
        'Φ_S · ScoreFriction',
        'Objeto o sistema delimitado derivado de scorefriction_vectors.',
        state,
      ))
      .catch((error: unknown): RootSystemItem => ({
        id: 'mihm-phi-s',
        label: 'Φ_S · ScoreFriction',
        state: textValue({ value: null, status: 'degraded', source: 'scorefriction_vectors', observedAt: null, warning: errorMessage(error) }),
        openItems: emptyOpenItems('scorefriction_vectors'),
      })),
    worldVectorToInstrumentState()
      .then((state) => instrumentStateToSystemItem(
        'mihm-phi-w',
        'Φ_W · World Vector',
        'Contexto mundial; en esta versión Φ_W es el alias tipado de WSI.',
        state,
      ))
      .catch((error: unknown): RootSystemItem => ({
        id: 'mihm-phi-w',
        label: 'Φ_W · World Vector',
        state: textValue({ value: null, status: 'degraded', source: 'worldspect_snapshots', observedAt: null, warning: errorMessage(error) }),
        openItems: emptyOpenItems('worldspect_snapshots'),
      })),
    readPhenomenologicalRow(),
  ]);

  return [
    ...institutional,
    readPersonalRow(),
    systemic,
    phenomenological,
    world,
    readProvidersRow(),
  ];
}

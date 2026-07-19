import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { inferPpoiTrajectory } from '@/lib/ppoi/hypothesisEngine';
import type { PpoiIndices } from '@/lib/ppoi/calibration';
import { scoreFrictionToInstrumentState } from '@/lib/mihm/adapters/scoreFrictionInstrumentAdapter';
import { worldVectorToInstrumentState } from '@/lib/mihm/adapters/worldVectorInstrumentAdapter';
import type { MihmInstrumentState } from '@/lib/mihm/instrumentContract';
import type { RootDataStatus, RootSource } from '../rootSovereignState';
import { errorMessage } from './readerSupport';

/**
 * Telemetría no es un panel más. Es la respuesta directa a "quiero ver la
 * trayectoria del sistema en su espacio de fase, no un número que sube".
 *
 * El plano atractor/eyector NO es decorativo: cada punto se posiciona con
 * los 8 scores de afinidad direccional que `hypothesisEngine.ts` YA calcula
 * para cada expediente PPOI. Eje X = fuerza de atracción hacia estructura
 * (EXPANSION + INSTITUTIONALIZATION + CONVERGENCE). Eje Y = fuerza de
 * eyección hacia disolución (DEGRADATION + FRAGMENTATION). Son los mismos
 * números que ya sostienen la hipótesis principal y la rival — aquí se
 * visualizan en vez de solo leerse como texto.
 *
 * Los sparklines usan `ppoi_hypotheses.composite_snapshot` histórico real
 * — cada recalibración queda registrada, así que el historial no se simula.
 */

export type TelemetryInstrument = {
  id: string;
  symbol: string;
  label: string;
  value: number | null;
  status: RootDataStatus;
  warning: string | null;
};

export type TelemetryPhenomenon = {
  id: string;
  fpCode: string;
  name: string;
  composite: number | null;
  attractorPull: number;
  ejectorPull: number;
  direction: string | null;
  rivalDirection: string | null;
  history: Array<{ at: string; composite: number }>;
};

export type TelemetryData = {
  instruments: TelemetryInstrument[];
  phenomena: TelemetryPhenomenon[];
};

function instrumentReading(id: string, label: string, state: MihmInstrumentState): TelemetryInstrument {
  const hasReading = state.homeostaticState !== null;
  return {
    id,
    symbol: state.homeostaticState?.symbol ?? '—',
    label,
    value: state.homeostaticState?.value ?? null,
    status: !hasReading ? 'missing' : state.warnings.length > 0 ? 'degraded' : 'observed',
    warning: state.warnings[0] ?? null,
  };
}

function pull(scores: Array<{ direction: string; score: number }>, directions: string[]) {
  const matched = scores.filter((entry) => directions.includes(entry.direction));
  if (matched.length === 0) return 0;
  return Number((matched.reduce((sum, entry) => sum + entry.score, 0) / matched.length).toFixed(3));
}

const ATTRACTOR_DIRECTIONS = ['EXPANSION', 'INSTITUTIONALIZATION', 'CONVERGENCE'];
const EJECTOR_DIRECTIONS = ['DEGRADATION', 'FRAGMENTATION'];

async function readPhenomena(): Promise<TelemetryPhenomenon[]> {
  const client = createServiceSupabaseClient();

  const { data: phenomena, error: phenomenaError } = await client
    .from('ppoi_phenomena')
    .select('id, fp_code, name, current_composite')
    .not('current_composite', 'is', null)
    .order('indices_calculated_at', { ascending: false })
    .limit(24);
  if (phenomenaError) throw new Error(errorMessage(phenomenaError));
  if (!Array.isArray(phenomena) || phenomena.length === 0) return [];

  const ids = phenomena.map((row) => row.id as string);
  const { data: hypotheses, error: hypothesesError } = await client
    .from('ppoi_hypotheses')
    .select('phenomenon_id, direction, rival_direction, index_snapshot, composite_snapshot, generated_at, is_current')
    .in('phenomenon_id', ids)
    .order('generated_at', { ascending: true });
  if (hypothesesError) throw new Error(errorMessage(hypothesesError));

  type HypothesisRow = {
    phenomenon_id: string;
    direction: string;
    rival_direction: string;
    index_snapshot: unknown;
    composite_snapshot: number | null;
    generated_at: string;
    is_current: boolean;
  };

  const byPhenomenon = new Map<string, HypothesisRow[]>();
  for (const row of (hypotheses ?? []) as HypothesisRow[]) {
    const list = byPhenomenon.get(row.phenomenon_id) ?? [];
    list.push(row);
    byPhenomenon.set(row.phenomenon_id, list);
  }

  return phenomena.map((row) => {
    const rows = byPhenomenon.get(row.id as string) ?? [];
    const current = rows.find((entry: HypothesisRow) => entry.is_current) ?? rows[rows.length - 1] ?? null;
    const history = rows
      .filter((entry: HypothesisRow) => typeof entry.composite_snapshot === 'number')
      .map((entry: HypothesisRow) => ({ at: String(entry.generated_at), composite: Number(entry.composite_snapshot) }));

    let attractorPull = 0;
    let ejectorPull = 0;
    if (current && current.index_snapshot) {
      const indices = current.index_snapshot as PpoiIndices;
      const trajectory = inferPpoiTrajectory(indices, Number(row.current_composite));
      attractorPull = pull(trajectory.scores, ATTRACTOR_DIRECTIONS);
      ejectorPull = pull(trajectory.scores, EJECTOR_DIRECTIONS);
    }

    return {
      id: row.id as string,
      fpCode: row.fp_code as string,
      name: row.name as string,
      composite: typeof row.current_composite === 'number' ? row.current_composite : null,
      attractorPull,
      ejectorPull,
      direction: current ? String(current.direction) : null,
      rivalDirection: current ? String(current.rival_direction) : null,
      history,
    };
  });
}

export async function readRootTelemetry(): Promise<RootSource<TelemetryData>> {
  const observedAt = new Date().toISOString();
  try {
    const [systemicState, worldState, phenomena] = await Promise.all([
      scoreFrictionToInstrumentState(),
      worldVectorToInstrumentState(),
      readPhenomena(),
    ]);

    const instruments: TelemetryInstrument[] = [
      instrumentReading('telemetry-phi-s', 'Φₛ · SISTÉMICO', systemicState),
      instrumentReading('telemetry-phi-w', 'Φ𝓌 · MUNDO', worldState),
    ];

    return {
      data: { instruments, phenomena },
      source: 'scorefriction + worldspect + ppoi_phenomena + ppoi_hypotheses',
      dataClass: phenomena.length > 0 ? 'observed' : 'missing',
      observedAt,
      error: null,
    };
  } catch (error) {
    return {
      data: { instruments: [], phenomena: [] },
      source: 'scorefriction + worldspect + ppoi_phenomena + ppoi_hypotheses',
      dataClass: 'degraded',
      observedAt,
      error: errorMessage(error),
    };
  }
}
import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readOperationalConsoleState } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const state = await readOperationalConsoleState();
    const cycle = state.operationalCycle.data ?? {};
    const stability = state.stability.data ?? {};
    const pipeline = state.pipelineLoss.data ?? {};
    const evidence = state.evidenceMap.data ?? [];
    const internalEvidence = evidence
      .filter((item) => String(item.evidence_side ?? '').toLowerCase() === 'internal')
      .reduce((sum, item) => sum + Number(item.evidence_count ?? 0), 0);
    const externalEvidence = evidence
      .filter((item) => String(item.evidence_side ?? '').toLowerCase() === 'external')
      .reduce((sum, item) => sum + Number(item.evidence_count ?? 0), 0);

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('sfi_operational_snapshots')
      .insert({
        signal_events: cycle.signal_events ?? null,
        technical_events: cycle.technical_events ?? null,
        signal_ratio: cycle.signal_ratio ?? null,
        technical_ratio: cycle.technical_ratio ?? null,
        operational_regime: cycle.operational_regime ?? null,
        worldspect_snapshots: cycle.worldspect_snapshots ?? null,
        scorefriction_observations: cycle.scorefriction_observations ?? null,
        scorefriction_vectors: cycle.scorefriction_vectors ?? null,
        proposals_approved: cycle.proposals_approved ?? pipeline.approved ?? null,
        executions_prepared: cycle.executions_prepared ?? pipeline.prepared ?? null,
        outcomes_recorded: cycle.outcomes_recorded ?? pipeline.outcome_recorded ?? null,
        internal_evidence_count: internalEvidence || null,
        external_evidence_count: externalEvidence || null,
        interpretation: stability.stability_regime
          ? `${stability.stability_regime}: ${pipeline.interpretation ?? 'not enough trace'}`
          : 'not enough trace',
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'operational_snapshot_failed' }, { status: 400 });
  }
}

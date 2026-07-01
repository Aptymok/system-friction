import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { deriveCoreIndicators } from './coreIndicators';
import type { SfiWorldInterfaceState } from './worldInterfaceState';
import type { WorldVectorDomainValue } from '@/lib/world-vector/types';

export type SfiIndicatorSnapshotRow = {
  captured_at: string;
  ihg: number;
  nti: number;
  ldi: number;
  wsv: number;
  domain_breakdown: WorldVectorDomainValue[];
  source_status: 'observed' | 'thin' | 'degraded' | 'failed';
};

const TOLERANCE_HOURS = 4;

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function persistIndicatorSnapshot(
  state: SfiWorldInterfaceState,
  domainBreakdown: WorldVectorDomainValue[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { ihg, nti, ldi, wsv } = deriveCoreIndicators(state);
    const sourceStatus: SfiIndicatorSnapshotRow['source_status'] = state.warnings.some((w) =>
      w.includes('failed'),
    )
      ? 'failed'
      : state.warnings.length > 2
        ? 'degraded'
        : state.warnings.length > 0
          ? 'thin'
          : 'observed';

    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from('sfi_indicator_snapshots').insert({
      captured_at: state.generatedAt,
      ihg,
      nti,
      ldi,
      wsv,
      domain_breakdown: domainBreakdown,
      source_status: sourceStatus,
      warnings: state.warnings,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_persist_error' };
  }
}

export async function readSnapshotNear24hAgo(): Promise<SfiIndicatorSnapshotRow | null> {
  try {
    const supabase = createServiceSupabaseClient();
    const now = Date.now();
    const target = new Date(now - 24 * 60 * 60 * 1000);
    const lowerBound = new Date(target.getTime() - TOLERANCE_HOURS * 60 * 60 * 1000).toISOString();
    const upperBound = new Date(target.getTime() + TOLERANCE_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('sfi_indicator_snapshots')
      .select('captured_at,ihg,nti,ldi,wsv,domain_breakdown,source_status')
      .gte('captured_at', lowerBound)
      .lte('captured_at', upperBound)
      .order('captured_at', { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const row = data[0] as Record<string, unknown>;
    return {
      captured_at: String(row.captured_at),
      ihg: toNumber(row.ihg),
      nti: toNumber(row.nti),
      ldi: toNumber(row.ldi),
      wsv: toNumber(row.wsv),
      domain_breakdown: Array.isArray(row.domain_breakdown) ? (row.domain_breakdown as WorldVectorDomainValue[]) : [],
      source_status: (row.source_status as SfiIndicatorSnapshotRow['source_status']) ?? 'thin',
    };
  } catch {
    return null;
  }
}

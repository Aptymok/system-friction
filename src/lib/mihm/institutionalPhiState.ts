import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { evaluateSfi, type SfiMetrics } from '@/lib/sfi/math';
import { getMihmPhiDefinition } from './phiContract';

export type InstitutionalPhiStatus = 'DERIVED' | 'THIN' | 'DEGRADED' | 'MISSING';

export type InstitutionalPhiState = {
  status: InstitutionalPhiStatus;
  objectId: 'SYSTEM_FRICTION_INSTITUTE';
  symbol: 'PHI_SFI';
  notation: 'Φ_SFI';
  observedAt: string | null;
  source: 'sfi_indicator_snapshots';
  sourceStatus: string | null;
  confidence: number | null;
  metrics: SfiMetrics | null;
  wsv: number | null;
  formulaVersion: string;
  warnings: string[];
};

function bounded(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
}

function missingState(warning: string): InstitutionalPhiState {
  const definition = getMihmPhiDefinition('PHI_SFI');
  return {
    status: 'MISSING',
    objectId: 'SYSTEM_FRICTION_INSTITUTE',
    symbol: 'PHI_SFI',
    notation: 'Φ_SFI',
    observedAt: null,
    source: 'sfi_indicator_snapshots',
    sourceStatus: null,
    confidence: null,
    metrics: null,
    wsv: null,
    formulaVersion: definition.formulaVersion,
    warnings: [warning],
  };
}

export async function readInstitutionalPhiState(): Promise<InstitutionalPhiState> {
  const definition = getMihmPhiDefinition('PHI_SFI');

  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from('sfi_indicator_snapshots')
      .select('captured_at,ihg,nti,ldi,wsv,source_status,warnings')
      .not('ihg', 'is', null)
      .not('nti', 'is', null)
      .not('ldi', 'is', null)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return missingState(`indicator_snapshot_read_failed:${error.message}`);
    if (!data) return missingState('complete_indicator_snapshot_missing');

    const ihg = bounded(data.ihg);
    const nti = bounded(data.nti);
    const ldi = bounded(data.ldi);
    const wsv = bounded(data.wsv);
    const observedAt = typeof data.captured_at === 'string' ? data.captured_at : null;
    const sourceStatus = typeof data.source_status === 'string' ? data.source_status : 'thin';

    if (ihg === null || nti === null || ldi === null || !observedAt) {
      return {
        ...missingState('indicator_snapshot_incomplete'),
        status: 'DEGRADED',
        observedAt,
        sourceStatus,
        confidence: null,
        wsv,
      };
    }

    const sourceWarnings = Array.isArray(data.warnings)
      ? data.warnings.filter((warning): warning is string => typeof warning === 'string')
      : [];

    // A stored numeric field is not an admitted observation when acquisition
    // itself failed. Preserve the original row, but do not surface a fabricated
    // institutional Phi or regime. Never silently fall back to an older row.
    if (['degraded', 'failed'].includes(sourceStatus.toLowerCase())) {
      return {
        ...missingState('indicator_snapshot_source_not_admissible'),
        status: 'DEGRADED',
        observedAt,
        sourceStatus,
        wsv,
        warnings: [...sourceWarnings, 'source_status_non_admissible_for_phi_sfi'],
      };
    }

    const xi = 0.03;
    const metrics = evaluateSfi({ ihg, nti, ldi, xi });
    const warnings = [...sourceWarnings, 'xi_default_0.03'];

    return {
      status: 'THIN',
      objectId: 'SYSTEM_FRICTION_INSTITUTE',
      symbol: 'PHI_SFI',
      notation: 'Φ_SFI',
      observedAt,
      source: 'sfi_indicator_snapshots',
      sourceStatus,
      confidence: null,
      metrics,
      wsv,
      formulaVersion: definition.formulaVersion,
      warnings,
    };
  } catch (error) {
    return missingState(error instanceof Error ? `indicator_snapshot_unavailable:${error.message}` : 'indicator_snapshot_unavailable');
  }
}

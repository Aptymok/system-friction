import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type {
  WorldVectorCycleRange,
  WorldVectorObservation,
  WorldVectorPersistenceStatus,
  WorldVectorReport,
  WorldVectorReportType,
} from './types';

export const REQUIRED_WORLD_VECTOR_TABLES = [
  'world_vector_cycles',
  'world_vector_observations',
  'world_vector_reports',
];

type BlockReason = Extract<WorldVectorPersistenceStatus, { enabled: false }>['reason'];

type PersistenceResult<T> =
  | { ok: true; data: T; persisted: true; existing?: boolean }
  | { ok: false; blocked: true; reason: BlockReason; details?: string };

type ReportRow = {
  id: string;
  cycle_id: string | null;
  report_type: WorldVectorReportType;
  target_audience: string;
  generated_at: string;
  period_start: string | null;
  period_end: string | null;
  title: string;
  body: string;
  json_payload: Record<string, unknown>;
  status: string;
  created_at: string;
};

function tableMissing(message: string) {
  return /does not exist|schema cache|not find|relation/i.test(message);
}

function blocked(reason: BlockReason, details?: string): { ok: false; blocked: true; reason: BlockReason; details?: string } {
  return {
    ok: false,
    blocked: true,
    reason,
    details,
  };
}

export async function getWorldVectorPersistenceStatus(): Promise<WorldVectorPersistenceStatus> {
  try {
    const service = createServiceSupabaseClient();
    const checks = await Promise.all(REQUIRED_WORLD_VECTOR_TABLES.map(async (table) => {
      const { error } = await service
        .from(table)
        .select('id')
        .limit(1);
      return { table, error };
    }));
    const failed = checks.find((check) => check.error);

    if (!failed?.error) {
      return {
        enabled: true,
        reason: 'world_vector_tables_ready',
        required_tables: REQUIRED_WORLD_VECTOR_TABLES,
      };
    }

    if (tableMissing(failed.error.message)) {
      return {
        enabled: false,
        reason: 'world_vector_tables_not_installed',
        required_tables: REQUIRED_WORLD_VECTOR_TABLES,
        details: `${failed.table}: ${failed.error.message}`,
      };
    }

    return {
      enabled: false,
      reason: 'world_vector_table_read_failed',
      required_tables: REQUIRED_WORLD_VECTOR_TABLES,
      details: `${failed.table}: ${failed.error.message}`,
    };
  } catch (error) {
    return {
      enabled: false,
      reason: 'world_vector_table_read_failed',
      required_tables: REQUIRED_WORLD_VECTOR_TABLES,
      details: error instanceof Error ? error.message : 'world_vector_persistence_status_failed',
    };
  }
}

async function ensureCycle(range: WorldVectorCycleRange, observation?: WorldVectorObservation) {
  const service = createServiceSupabaseClient();
  const { data: existing, error: selectError } = await service
    .from('world_vector_cycles')
    .select('*')
    .eq('cycle_start_date', range.cycle_start_date)
    .eq('cycle_end_date', range.cycle_end_date)
    .limit(1)
    .maybeSingle();

  if (selectError) return { ok: false as const, error: selectError.message };
  if (existing) return { ok: true as const, data: existing as { id: string } };

  const dominant = observation?.domain_values[0] ?? null;
  const { data, error } = await service
    .from('world_vector_cycles')
    .insert({
      cycle_start_date: range.cycle_start_date,
      cycle_end_date: range.cycle_end_date,
      status: 'open',
      dominant_domain: dominant?.domain ?? null,
      dominant_signal: observation?.dominant_signal ?? null,
      summary_internal: observation?.interpretation ?? null,
      summary_public: observation?.status === 'failed' ? null : observation?.interpretation ?? null,
    })
    .select('*')
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as { id: string } };
}

export async function persistWorldVectorObservation(input: {
  observation: WorldVectorObservation;
  cycleRange: WorldVectorCycleRange;
}): Promise<PersistenceResult<Record<string, unknown>>> {
  const readiness = await getWorldVectorPersistenceStatus();
  if (!readiness.enabled) return blocked(readiness.reason, readiness.details);
  if (!input.observation.observed_at) return blocked('world_vector_tables_not_installed', 'worldspect_snapshot_missing');

  const service = createServiceSupabaseClient();
  const cycle = await ensureCycle(input.cycleRange, input.observation);
  if (!cycle.ok) return blocked('world_vector_table_read_failed', cycle.error);

  const day = input.observation.observed_at.slice(0, 10);
  const start = `${day}T00:00:00.000Z`;
  const end = `${day}T23:59:59.999Z`;
  const { data: existing, error: selectError } = await service
    .from('world_vector_observations')
    .select('*')
    .eq('sector', input.observation.sector)
    .gte('observed_at', start)
    .lte('observed_at', end)
    .limit(1)
    .maybeSingle();

  if (selectError) return blocked(tableMissing(selectError.message) ? 'world_vector_tables_not_installed' : 'world_vector_table_read_failed', selectError.message);
  if (existing) return { ok: true, data: existing as Record<string, unknown>, persisted: true, existing: true };

  const { data, error } = await service
    .from('world_vector_observations')
    .insert({
      cycle_id: cycle.data.id,
      observed_at: input.observation.observed_at,
      day_of_week: input.observation.day_of_week,
      sector: input.observation.sector,
      source_snapshot_id: input.observation.source_snapshot_id,
      domain_values: input.observation.domain_values,
      dominant_sources: input.observation.dominant_sources,
      dominant_signal: input.observation.dominant_signal,
      interpretation: input.observation.interpretation,
      confidence: input.observation.confidence,
      status: input.observation.status,
      warnings: input.observation.warnings,
    })
    .select('*')
    .single();

  if (error) return blocked(tableMissing(error.message) ? 'world_vector_tables_not_installed' : 'world_vector_table_read_failed', error.message);
  return { ok: true, data: data as Record<string, unknown>, persisted: true };
}

export async function persistWorldVectorReport(input: {
  report: WorldVectorReport;
  cycleRange: WorldVectorCycleRange;
  observation?: WorldVectorObservation;
}): Promise<PersistenceResult<ReportRow>> {
  const readiness = await getWorldVectorPersistenceStatus();
  if (!readiness.enabled) return blocked(readiness.reason, readiness.details);

  const service = createServiceSupabaseClient();
  const cycle = await ensureCycle(input.cycleRange, input.observation);
  if (!cycle.ok) return blocked('world_vector_table_read_failed', cycle.error);

  const { data, error } = await service
    .from('world_vector_reports')
    .insert({
      cycle_id: cycle.data.id,
      report_type: input.report.report_type,
      target_audience: input.report.target_audience,
      period_start: input.report.period_start,
      period_end: input.report.period_end,
      title: input.report.title,
      body: input.report.body,
      json_payload: input.report.json_payload,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) return blocked(tableMissing(error.message) ? 'world_vector_tables_not_installed' : 'world_vector_table_read_failed', error.message);
  return { ok: true, data: data as ReportRow, persisted: true };
}

export async function closeWorldVectorCycle(input: {
  cycleRange: WorldVectorCycleRange;
  report: WorldVectorReport;
  observation?: WorldVectorObservation;
}) {
  const report = await persistWorldVectorReport(input);
  if (!report.ok) return report;

  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('world_vector_cycles')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      dominant_domain: input.observation?.domain_values[0]?.domain ?? null,
      dominant_signal: input.observation?.dominant_signal ?? null,
      summary_internal: input.report.body,
      summary_public: input.report.target_audience === 'repository' || input.report.target_audience === 'linkedin'
        ? input.report.body
        : null,
    })
    .eq('cycle_start_date', input.cycleRange.cycle_start_date)
    .eq('cycle_end_date', input.cycleRange.cycle_end_date)
    .select('*')
    .single();

  if (error) return blocked(tableMissing(error.message) ? 'world_vector_tables_not_installed' : 'world_vector_table_read_failed', error.message);

  return {
    ok: true as const,
    persisted: true as const,
    report: report.data,
    cycle: data as Record<string, unknown>,
  };
}

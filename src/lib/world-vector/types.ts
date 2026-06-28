export type WorldVectorSector =
  | 'institutional'
  | 'technology_ai_data'
  | 'architecture_city_space'
  | 'economy_market_capital'
  | 'culture_signal_narrative'
  | 'social_behavioral'
  | 'cycle_close';

export type WorldVectorCycleDay = {
  dayOfWeek: string;
  sector: WorldVectorSector;
  sectorLabel: string;
  isCycleClose: boolean;
};

export type WorldVectorObservationStatus = 'observed' | 'thin' | 'degraded' | 'failed';

export type WorldVectorPersistenceStatus =
  | {
    enabled: true;
    reason: 'world_vector_tables_ready';
    required_tables: string[];
  }
  | {
    enabled: false;
    reason: 'world_vector_tables_not_installed' | 'world_vector_table_read_failed';
    required_tables: string[];
    details?: string;
  };

export type WorldVectorDomainValue = {
  domain: string;
  value: number | null;
  confidence: number | null;
  source_count: number;
};

export type WorldVectorDominantSource = {
  key: string;
  label: string;
  domain: string;
  value: number | null;
  confidence: number | null;
};

export type WorldVectorObservation = {
  observed_at: string | null;
  sector: WorldVectorSector;
  day_of_week: string;
  source_snapshot_id: string | null;
  domain_values: WorldVectorDomainValue[];
  dominant_sources: WorldVectorDominantSource[];
  dominant_signal: string | null;
  interpretation: string;
  confidence: number;
  status: WorldVectorObservationStatus;
  warnings: string[];
};

export type WorldVectorCycleRange = {
  cycle_start_date: string;
  cycle_end_date: string;
};

export type WorldVectorPersistedObservation = WorldVectorObservation & {
  id: string;
  cycle_id: string | null;
  created_at: string;
};

export type WorldVectorReportType = 'internal_daily' | 'public_weekly' | 'cycle_close';
export type WorldVectorReportAudience = 'founder' | 'linkedin' | 'repository';

export type WorldVectorReport = {
  title: string;
  body: string;
  report_type: WorldVectorReportType;
  target_audience: WorldVectorReportAudience;
  period_start: string | null;
  period_end: string | null;
  json_payload: Record<string, unknown>;
};

export type WorldVectorStatus = {
  ok: true;
  mode: 'read_only';
  pulse: {
    latest_snapshot_available: boolean;
    latest_observed_at: string | null;
    sample_count: number;
  };
  memory: WorldVectorPersistenceStatus;
  current_cycle_day: WorldVectorCycleDay;
  warnings: string[];
};

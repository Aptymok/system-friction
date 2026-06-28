import type {
  WorldVectorObservation,
  WorldVectorPersistenceResult,
  WorldVectorPersistenceStatus,
  WorldVectorReport,
} from '../types';

export type WorldVectorAgentMode = 'read_only' | 'persist_if_ready' | 'protected_action';

export type WorldVectorAgentResult<T = Record<string, unknown>> = {
  ok: true;
  agent: string;
  mode: WorldVectorAgentMode;
  memory: WorldVectorPersistenceStatus;
  data: T;
  warnings: string[];
  blocked: string[];
};

export type DailyObservationAgentData = {
  observation: WorldVectorObservation;
  persistence: WorldVectorPersistenceResult | WorldVectorPersistenceStatus;
};

export type ReportAgentData = {
  report: WorldVectorReport;
  persistence: WorldVectorPersistenceResult | WorldVectorPersistenceStatus;
};

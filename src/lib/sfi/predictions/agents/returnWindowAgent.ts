import type {
  SfiPredictionEntry,
  SfiPredictionReturnWindow,
  SfiPredictionReturnWindowAgentResult,
  SfiPredictionReturnWindowStatus,
} from '../types';

const WINDOW_CONFIG: Array<{
  window: SfiPredictionReturnWindow;
  field: SfiPredictionReturnWindowStatus['field'];
  days: number;
}> = [
  { window: '72h', field: 'resultado_72h', days: 3 },
  { window: '7d', field: 'resultado_7d', days: 7 },
  { window: '30d', field: 'resultado_30d', days: 30 },
  { window: '90d', field: 'resultado_90d', days: 90 },
];

function timeValue(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function textComplete(value: string | null) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function runReturnWindowAgent(entry: SfiPredictionEntry, now = new Date()): SfiPredictionReturnWindowAgentResult {
  const baseTime = timeValue(entry.perturbation_applied_at) ?? timeValue(entry.prediction_registered_at);
  const blocked = baseTime === null ? ['return_window_base_time_unavailable'] : [];
  const nowMs = now.getTime();

  const windows = WINDOW_CONFIG.map<SfiPredictionReturnWindowStatus>((config) => {
    const dueAtMs = baseTime === null ? null : baseTime + config.days * 24 * 60 * 60 * 1000;
    const due = dueAtMs !== null && nowMs >= dueAtMs;
    const overdue = dueAtMs !== null && nowMs > dueAtMs + 24 * 60 * 60 * 1000;
    const complete = textComplete(entry[config.field]);

    return {
      window: config.window,
      field: config.field,
      due_at: dueAtMs === null ? null : new Date(dueAtMs).toISOString(),
      complete,
      pending: !complete,
      due: due && !complete,
      overdue: overdue && !complete,
    };
  });

  return {
    agent: 'returnWindowAgent',
    mode: 'passive_deterministic',
    ok: blocked.length === 0,
    hypothesis_id: entry.hypothesis_id,
    blocked,
    warnings: [],
    root_approval_required: true,
    windows,
    pending_count: windows.filter((window) => window.pending).length,
    complete_count: windows.filter((window) => window.complete).length,
    due_count: windows.filter((window) => window.due).length,
    overdue_count: windows.filter((window) => window.overdue).length,
  };
}

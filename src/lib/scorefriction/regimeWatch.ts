import type { OperationalCycleState } from './contracts/operationalCycle';

export type RegimeWatchResult = {
  active: boolean;
  severity: 'none' | 'watch' | 'warning' | 'critical';
  changed_regime: boolean;
  previous_regime: string | null;
  current_regime: string | null;
  direction_shift: boolean;
  degradation_level: number;
  weak_signal_basis: unknown[];
  critical_window: string | null;
  minimal_action: string | null;
  evidence_required: string | null;
};

export function evaluateRegimeWatch(state: OperationalCycleState): RegimeWatchResult {
  const degradation = typeof state.degradation.level === 'number' ? state.degradation.level : 0;
  const changed = Boolean(state.regime.changed);
  const directionShift = Boolean(state.direction.current && state.direction.projected && state.direction.current !== state.direction.projected);
  const persistentWeakSignals = state.weak_signals.slice(0, 5);
  const severity: RegimeWatchResult['severity'] =
    degradation >= 0.8 || (changed && directionShift) ? 'critical'
      : degradation >= 0.58 || changed || directionShift ? 'warning'
        : persistentWeakSignals.length > 0 ? 'watch'
          : 'none';

  return {
    active: severity !== 'none',
    severity,
    changed_regime: changed,
    previous_regime: state.regime.previous ?? null,
    current_regime: state.regime.vector ?? state.regime.world ?? null,
    direction_shift: directionShift,
    degradation_level: Number(degradation.toFixed(4)),
    weak_signal_basis: persistentWeakSignals,
    critical_window: severity === 'critical' ? '0-72h' : severity === 'warning' ? '3-14d' : null,
    minimal_action: severity === 'none' ? null : 'Ejecutar una perturbacion minima y abrir ventana de verificacion.',
    evidence_required: severity === 'none' ? null : 'Registrar evidencia antes/despues y outcome verificable.',
  };
}


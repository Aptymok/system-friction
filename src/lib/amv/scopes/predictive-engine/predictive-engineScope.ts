import type { AmvScopeDefinition } from '../../core/amvTypes';
import { getPredictiveEngineHealth } from '@/lib/predictive-engine/service';

export const predictiveEngineScope: AmvScopeDefinition = {
  id: 'predictive-engine',
  subject: 'SFI Predictive Learning Engine',
  async buildContext(request) {
    const health = await getPredictiveEngineHealth().catch((error) => ({
      ok: false,
      models: 0,
      activeModels: 0,
      runs: 0,
      openRuns: 0,
      dueRuns: 0,
      evaluatedRuns: 0,
      verifiedOutcomes: 0,
      appliedLearningEvents: 0,
      calibration: [],
      warnings: [`PREDICTIVE_ENGINE_UNAVAILABLE:${error instanceof Error ? error.message : String(error)}`],
    }));
    return {
      subject: 'SFI Predictive Learning Engine',
      scope: 'predictive-engine',
      context: {
        message: request.message,
        health,
        selectedContext: request.selectedContext ?? null,
      },
      agents: [
        { id: 'prediction-agent', label: 'Prediction Agent', source: 'sfi_predictive_runs', status: health.ok ? 'available' : 'deferred', trust: health.ok ? 'observed' : 'degraded' },
        { id: 'verification-agent', label: 'Verification Agent', source: 'sfi_predictive_outcomes', status: health.ok ? 'available' : 'deferred', trust: health.verifiedOutcomes > 0 ? 'observed' : 'degraded' },
        { id: 'learning-agent', label: 'Learning Agent', source: 'sfi_predictive_learning_events', status: health.ok ? 'available' : 'deferred', trust: health.appliedLearningEvents > 0 ? 'observed' : 'derived' },
      ],
      policy: {
        maxVisibleRoutes: 1,
        hideNonRouteChangingInference: true,
        requireZeroTrust: true,
        riskManagement: true,
        allowLogbookSelectionDemand: false,
      },
      sources: [
        { id: 'predictive-models', label: 'Model states', trust: health.ok ? 'observed' : 'degraded', reason: `${health.activeModels} active model(s).` },
        { id: 'predictive-outcomes', label: 'Verified outcomes', trust: health.verifiedOutcomes > 0 ? 'observed' : 'degraded', reason: `${health.verifiedOutcomes} verified outcome(s).` },
        { id: 'predictive-learning', label: 'Applied learning events', trust: health.appliedLearningEvents > 0 ? 'observed' : 'derived', reason: `${health.appliedLearningEvents} applied update(s).` },
      ],
    };
  },
  async decide({ scopeContext }) {
    const health = scopeContext.context.health as Awaited<ReturnType<typeof getPredictiveEngineHealth>>;
    const due = health.dueRuns;
    const verified = health.verifiedOutcomes;
    const driftModels = health.calibration.filter((item) => item.status === 'DRIFT_WARNING').length;
    const uncalibrated = health.calibration.filter((item) => item.status === 'BOOTSTRAP_UNCALIBRATED').length;
    const route = driftModels > 0
      ? 'Congelar decisiones irreversibles, revisar los modelos con drift y comparar estados antes/después de cada learning event.'
      : due > 0
        ? 'Cerrar primero las ventanas vencidas con evidencia verificable; no generar outcomes automáticos.'
        : verified < 10
          ? 'Acumular outcomes comparables y verificados antes de presentar probabilidades como calibradas.'
          : 'Continuar pruebas reversibles y vigilar Brier, MAE, bias y calibration status por modelo.';
    return {
      event: `Motor predictivo: ${health.runs} run(s), ${due} vencido(s), ${verified} outcome(s) verificado(s).`,
      result: driftModels > 0
        ? `${driftModels} modelo(s) presentan drift. ${uncalibrated} modelo(s) permanecen bootstrap.`
        : `${health.appliedLearningEvents} actualización(es) aplicadas con traza reversible.`,
      effect: health.ok
        ? 'AMV observa el ciclo predictivo; no modifica números ni modelos desde esta lectura.'
        : 'La capa predictiva está degradada y no debe usarse para decisión.',
      window: due > 0 ? 'Retorno vencido: atención inmediata.' : 'Revisión diaria por reconciliador.',
      route,
      risk: driftModels > 0 ? 'high' : due > 0 || verified < 10 ? 'medium' : 'low',
      confidence: health.ok ? Math.min(1, 0.35 + verified / 30) : 0.1,
      sourceTrust: health.ok ? 'observed' : 'degraded',
      changedDecision: driftModels > 0 || due > 0,
      warnings: health.warnings,
    };
  },
};

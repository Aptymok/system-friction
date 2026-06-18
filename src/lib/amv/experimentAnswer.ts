import type { OperationalCycleState, OperationalExperiment } from '@/lib/scorefriction/contracts/operationalCycle';

export type AmvOperationalAnswer = {
  can_answer: boolean;
  answer: string;
  evidence_used: string[];
  missing_evidence: string[];
  allowed_claims: string[];
  blocked_claims: string[];
  proposed_experiment?: OperationalExperiment;
};

function warningEvidence(state: OperationalCycleState) {
  return state.technical_state.warnings.slice(0, 6);
}

export function answerAmvOperationalQuestion(question: string, state: OperationalCycleState): AmvOperationalAnswer {
  const experiment = state.recommended_experiments?.[0];
  const hasObject = state.object_presence === 'provided';
  const unsupported = hasObject && state.mihm?.available === false && state.mihm.reason?.startsWith('analysis_unavailable_');
  const evidenceUsed = [
    state.world_context?.summary,
    `world_regime:${state.regime.world ?? 'unknown'}`,
    `filtered_vector:${String((state.filtered_vector as Record<string, unknown> | null)?.domain ?? 'WORLD')}`,
    ...warningEvidence(state).map((item) => `warning:${item}`),
  ].filter((item): item is string => Boolean(item));

  const missing = [
    hasObject ? null : 'objeto evaluado',
    unsupported ? `analizador especifico para ${state.object_type}` : null,
    ...(experiment?.evidence_required ?? []),
  ].filter((item): item is string => Boolean(item));

  if (!hasObject) {
    return {
      can_answer: true,
      answer: 'Puedo explicar el campo mundial y la evidencia que falta. No puedo recomendar intervencion porque no hay objeto. Siguiente paso: cargar un objeto y registrar fuente, objetivo y ventana de verificacion.',
      evidence_used: evidenceUsed,
      missing_evidence: missing,
      allowed_claims: state.allowed_claims ?? ['world reading'],
      blocked_claims: state.blocked_claims ?? ['intervention recommendation'],
      proposed_experiment: experiment,
    };
  }

  if (unsupported) {
    return {
      can_answer: false,
      answer: `No puedo saber todavia como se comporta este ${state.object_type}. Falta analizador especifico; no lo voy a tratar como texto JSON.`,
      evidence_used: evidenceUsed,
      missing_evidence: missing,
      allowed_claims: state.allowed_claims ?? ['world reading'],
      blocked_claims: state.blocked_claims ?? [`${state.object_type} analysis without analyzer`],
      proposed_experiment: experiment,
    };
  }

  const q = question.toLowerCase();
  const why = /por que|por qué|why|evidencia|metrics|metricas|métricas/.test(q);
  const experimentText = experiment ? `Experimento minimo: ${experiment.action} Verificar en ${experiment.verification_window}.` : 'No hay experimento suficiente.';
  return {
    can_answer: true,
    answer: why
      ? `Lo digo por estas bases: regimen ${state.regime.world ?? 'desconocido'}, direccion ${state.direction.current ?? 'sin direccion'}, MIHM ${state.mihm?.coherence ?? 'no disponible'}, PSI ${state.psi?.persistence ?? 'no disponible'} y ScoreFriction ${state.scorefriction?.opportunity ?? 'no disponible'}. ${experimentText}`
      : `${state.amv_answer?.answer ?? 'El objeto puede contrastarse contra el campo.'} ${experimentText}`,
    evidence_used: evidenceUsed,
    missing_evidence: missing,
    allowed_claims: state.allowed_claims ?? [],
    blocked_claims: state.blocked_claims ?? [],
    proposed_experiment: experiment,
  };
}

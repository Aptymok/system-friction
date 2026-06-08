import type { AmvProjectionRequest, AmvProjectionResult } from './amvProjectionTypes'

export function runAmvProjection(request: AmvProjectionRequest): AmvProjectionResult {
  const scope = request.scope || 'root'
  const subject = request.subject || scope

  return {
    ok: true,
    sandboxOnly: true,
    feedsRegime: false,
    executesIntervention: false,
    scope,
    subject,
    scenarios: [
      {
        id: `${scope}.continue`,
        label: 'Si el campo continua igual',
        probability: 0.5,
        impact: 'medium',
        evidenceBoundary: 'Proyeccion sandbox; no alimenta regimen.',
      },
      {
        id: `${scope}.threshold`,
        label: 'Si aparece umbral verificable',
        probability: 0.25,
        impact: 'high',
        evidenceBoundary: 'Requiere evidencia visible antes de recomendar accion.',
      },
    ],
    warnings: ['sandbox_only', 'no_intervention_execution'],
  }
}

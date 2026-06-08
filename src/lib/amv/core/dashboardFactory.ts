import { validateDashboardGeneration, type DashboardGenerationInput } from './dashboardGenerationPolicy'

export function createDashboardContract(input: DashboardGenerationInput) {
  const validation = validateDashboardGeneration(input)
  if (!validation.ok) {
    return {
      ok: false as const,
      validation,
      specDraft: {
        scope: input.scope ?? 'missing',
        status: 'spec_only',
        missing: validation.missing,
      },
    }
  }

  return {
    ok: true as const,
    validation,
    dashboard: {
      scope: input.scope,
      ontologicalQuestion: input.ontologicalQuestion,
      observableObject: input.observableObject,
      evidenceTrust: input.evidenceTrust,
      sources: input.sources,
      emptyState: input.emptyState,
      outputModes: input.outputModes,
      archiveLayer: input.archiveLayer,
      prohibitions: input.prohibitions,
      closureCriteria: input.closureCriteria,
    },
  }
}

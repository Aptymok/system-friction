import type { AmvArchiveLayer } from './archiveLayerPolicy'
import type { AmvEvidenceTrust } from './evidenceTypes'
import type { AmvOutputMode } from './outputModeTypes'

export type DashboardGenerationInput = {
  scope?: string
  ontologicalQuestion?: string
  observableObject?: string
  evidenceTrust?: AmvEvidenceTrust[]
  sources?: string[]
  emptyState?: string
  outputModes?: AmvOutputMode[]
  archiveLayer?: AmvArchiveLayer
  prohibitions?: string[]
  closureCriteria?: string
}

export function validateDashboardGeneration(input: DashboardGenerationInput) {
  const missing = [
    ['scope', input.scope],
    ['ontologicalQuestion', input.ontologicalQuestion],
    ['observableObject', input.observableObject],
    ['evidenceTrust', input.evidenceTrust?.length],
    ['sources', input.sources?.length],
    ['emptyState', input.emptyState],
    ['outputModes', input.outputModes?.length],
    ['archiveLayer', input.archiveLayer],
    ['prohibitions', input.prohibitions?.length],
    ['closureCriteria', input.closureCriteria],
  ].filter(([, value]) => !value).map(([key]) => key)

  return {
    ok: missing.length === 0,
    missing,
    action: missing.length === 0 ? 'generate_dashboard' : 'create_spec_only',
    warning: missing.length === 0 ? null : 'No generar UI: faltan campos de contrato AMV.',
  }
}

import type { AmvPolicy, AmvRiskLevel, AmvSourceSignal, AmvTrustLevel } from './amvTypes'
import type { AmvArchiveLayer } from './archiveLayerPolicy'
import type { AmvEvidenceTrust } from './evidenceTypes'
import type { AmvFieldOperator } from './fieldOperatorTypes'
import type { AmvFocusVariable } from './focusVariableTypes'
import type { AmvObservableObjectType } from './observableObjectTypes'
import type { AmvObservationMode } from './observationModes'
import type { AmvOutputMode } from './outputModeTypes'
import type { AmvReportRegime } from './regimeTypes'

export type AmvInstrumentTable = {
  id: string
  label: string
  purpose: string
  trust: AmvTrustLevel
  access: 'read' | 'write' | 'none'
}

export type AmvInstrumentMetric = {
  id: string
  label: string
  meaning: string
  source: string
  requiredEvidence: string
}

export type AmvInstrumentAction = {
  id: string
  label: string
  consequence: string
  risk: AmvRiskLevel
  requiresRootApproval: boolean
}

export type AmvInstrumentPanel = {
  id: string
  title: string
  question: string
  observationMode?: AmvObservationMode
  fieldOperators?: AmvFieldOperator[]
  outputModes?: AmvOutputMode[]
  reportRegimes?: AmvReportRegime[]
  observableObjects?: AmvObservableObjectType[]
  focusVariables?: AmvFocusVariable[]
  evidenceTrust?: AmvEvidenceTrust[]
  observes: string
  sources: string[]
  metrics: string[]
  actions: string[]
  risk: AmvRiskLevel
  minimumEvidence: string
  emptyState: string
}

export type AmvInstrumentResponsePolicy = AmvPolicy & {
  visibleStructure: string[]
  forbiddenClaims: string[]
  uncertaintyLabel: string
}

export type AmvInstrumentDefinition = {
  id: string
  name: string
  ontologicalQuestion: string
  observedObject: string
  scope: string
  observationModes?: AmvObservationMode[]
  fieldOperators?: AmvFieldOperator[]
  outputModes?: AmvOutputMode[]
  reportRegimes?: AmvReportRegime[]
  observableObjects?: AmvObservableObjectType[]
  focusVariables?: AmvFocusVariable[]
  evidenceTrust?: AmvEvidenceTrust[]
  archiveLayers?: AmvArchiveLayer[]
  sources: AmvSourceSignal[]
  tables: AmvInstrumentTable[]
  metrics: AmvInstrumentMetric[]
  requiredAgents: string[]
  allowedActions: AmvInstrumentAction[]
  prohibitedActions: AmvInstrumentAction[]
  panels: AmvInstrumentPanel[]
  risk: AmvRiskLevel
  minimumEvidence: string
  amvBriefing: string
  responsePolicy: AmvInstrumentResponsePolicy
}

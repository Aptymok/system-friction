import type { AmvEvidenceTrust } from './evidenceTypes'
import type { AmvFieldOperator } from './fieldOperatorTypes'
import type { AmvObservationMode } from './observationModes'
import type { AmvOutputMode } from './outputModeTypes'
import type { AmvReportRegime } from './regimeTypes'

export type AmvReportContract = {
  id: string
  observationMode: AmvObservationMode
  fieldOperators: AmvFieldOperator[]
  outputMode: AmvOutputMode
  reportRegime?: AmvReportRegime
  evidenceTrust: AmvEvidenceTrust[]
  summary: string
  boundary: string
  externalExecution: false
  createsDashboard: false
}

export type AmvReportSafety = {
  stochasticProjectionSandbox: true
  interventionExternalExecution: false
  attractorExternalExecution: false
  ejectorCanBlockClosure: true
  reportRegimeIsEvidence: false
}

export const AMV_REPORT_SAFETY: AmvReportSafety = {
  stochasticProjectionSandbox: true,
  interventionExternalExecution: false,
  attractorExternalExecution: false,
  ejectorCanBlockClosure: true,
  reportRegimeIsEvidence: false,
}

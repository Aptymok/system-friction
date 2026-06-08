import type { AmvFocusVariable } from './focusVariableTypes'
import type { AmvObservableObjectType } from './observableObjectTypes'
import type { AmvObservationMode } from './observationModes'
import type { AmvEvidenceTrust } from './evidenceTypes'
import type { AmvFieldOperator } from './fieldOperatorTypes'
import type { AmvOutputMode } from './outputModeTypes'
import type { AmvReportRegime } from './regimeTypes'

export type AmvObservationOutputType =
  | 'reading'
  | 'evidence_record'
  | 'risk_change'
  | 'route_change'
  | 'closure_candidate'
  | 'archive_entry'
  | 'degraded_result'

export type AmvObservationOutput = {
  outputType: AmvObservationOutputType
  mode: AmvObservationMode
  fieldOperators?: AmvFieldOperator[]
  outputMode?: AmvOutputMode
  reportRegime?: AmvReportRegime
  observableObject: AmvObservableObjectType
  focusVariable?: AmvFocusVariable
  evidenceTrust: AmvEvidenceTrust
  summary: string
  changesRoute: boolean
  changesRisk: boolean
  closesLoop: boolean
  visible: boolean
  reason: string
}

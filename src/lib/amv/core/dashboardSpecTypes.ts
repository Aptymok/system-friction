import type { AmvInstrumentDefinition, AmvInstrumentPanel } from './instrumentTypes'
import type { AmvEvidenceTrust } from './evidenceTypes'
import type { AmvFieldOperator } from './fieldOperatorTypes'
import type { AmvFocusVariable } from './focusVariableTypes'
import type { AmvObservableObjectType } from './observableObjectTypes'
import type { AmvObservationMode } from './observationModes'
import type { AmvOutputMode } from './outputModeTypes'
import type { AmvReportRegime } from './regimeTypes'

export type AmvDashboardLane =
  | 'field'
  | 'attractor'
  | 'ejector'
  | 'wsv'
  | 'mihm'
  | 'governance'
  | 'logbook'
  | 'amv'
  | 'audit'

export type AmvPanelRenderMode = 'summary' | 'evidence' | 'action' | 'audit'

export type AmvDashboardPanelSpec = AmvInstrumentPanel & {
  lane: AmvDashboardLane
  order: number
  renderMode: AmvPanelRenderMode
  observationMode?: AmvObservationMode
  fieldOperators?: AmvFieldOperator[]
  outputModes?: AmvOutputMode[]
  reportRegimes?: AmvReportRegime[]
  observableObjects?: AmvObservableObjectType[]
  focusVariables?: AmvFocusVariable[]
  evidenceTrust?: AmvEvidenceTrust[]
}

export type AmvDashboardSpec = {
  id: string
  instrumentId: string
  scope: string
  title: string
  visibleFormat: string[]
  lanes: AmvDashboardLane[]
  observationModes?: AmvObservationMode[]
  fieldOperators?: AmvFieldOperator[]
  outputModes?: AmvOutputMode[]
  reportRegimes?: AmvReportRegime[]
  observableObjects?: AmvObservableObjectType[]
  focusVariables?: AmvFocusVariable[]
  evidenceTrust?: AmvEvidenceTrust[]
  panels: AmvDashboardPanelSpec[]
  instrument: AmvInstrumentDefinition
  defaultMihm?: {
    object: string
    node: string
    baseline: string
  }
}

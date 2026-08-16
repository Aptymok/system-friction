import type { AmvEvidenceTrust } from '@/lib/amv/core/evidenceTypes'
import type { AmvFocusVariable } from '@/lib/amv/core/focusVariableTypes'
import type { AmvObservableObjectType } from '@/lib/amv/core/observableObjectTypes'
import type { AmvObservationMode } from '@/lib/amv/core/observationModes'

export type PythonRuntimeStatus =
  | 'not_configured'
  | 'available_not_invoked'
  | 'contract_ready'
  | 'degraded'
  | 'blocked_by_quarantine'

export type CognitiveTwinRequest = {
  contractVersion: 'amv-python-cognitive-twin/v1'
  requestId: string
  correlationId: string
  scope: string
  nodeId: string
  requestedBy: string
  mode: AmvObservationMode
  observableObject: AmvObservableObjectType
  focusVariables: AmvFocusVariable[]
  sourceDescriptor: {
    sourceId: string
    sourceType: 'fixture' | 'declared' | 'observed' | 'document' | 'system'
    observedAt?: string
  }
  payloadHash: string
  payloadRef: string
  requestedOutput: 'epistemic_event' | 'cognitive_graph' | 'degraded_status'
  requiresHumanReview: boolean
}

export type EpistemicEventPayload = {
  contractVersion: 'amv-epistemic-event/v1'
  eventId: string
  nodeId: string
  signalType: 'observed' | 'declared' | 'derived' | 'inferred' | 'simulated' | 'missing'
  evidenceTrust: AmvEvidenceTrust
  evidenceLevel: 'direct' | 'behavioral' | 'statistical' | 'semantic' | 'speculative' | 'none'
  sourceModule: string
  summary: string
  payload: Record<string, unknown>
  confidence: number
  parentEventId?: string
  inferenceChain: string[]
  invalidated: boolean
  invalidationReason?: string
  occurredAt: string
  checksum: string
}

export type CognitiveGraphPayload = {
  contractVersion: 'amv-cognitive-graph/v1'
  graphId: string
  profile: 'cognitive_twin' | 'shared'
  nodes: Array<{
    nodeId: string
    label: string
    ontologyType: string
    evidenceTrust: AmvEvidenceTrust
    confidence: number
    lineage: string[]
  }>
  edges: Array<{
    edgeId: string
    sourceNodeId: string
    targetNodeId: string
    relation: string
    weight: number
    evidenceTrust: AmvEvidenceTrust
    confidence: number
    lineage: string[]
  }>
  generatedAt: string
  checksum: string
}

export type DegradedPythonResult = {
  contractVersion: 'amv-python-cognitive-twin/v1'
  requestId: string
  status: PythonRuntimeStatus
  reason: string
  safeFallback: 'do_not_invoke_python' | 'return_missing' | 'return_audit_only'
  warnings: string[]
}

export type CognitiveTwinResponse = {
  contractVersion: 'amv-python-cognitive-twin/v1'
  requestId: string
  correlationId: string
  status: PythonRuntimeStatus
  epistemicEvent?: EpistemicEventPayload
  cognitiveGraph?: CognitiveGraphPayload
  degraded?: DegradedPythonResult
  requiresHumanReview: boolean
  warnings: string[]
}

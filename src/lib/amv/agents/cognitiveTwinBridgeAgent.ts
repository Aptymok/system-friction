import type {
  CognitiveTwinRequest,
  CognitiveTwinResponse,
  DegradedPythonResult,
  PythonBridgeStatus,
} from '../core/pythonBridgeContract'

export const PYTHON_COGNITIVE_TWIN_BRIDGE_STATUS: PythonBridgeStatus = 'contract_ready'

export function degradedPythonResult(
  request: Pick<CognitiveTwinRequest, 'requestId'>,
  reason = 'Python Cognitive Twin is contract-defined but not invoked from TypeScript runtime.',
): DegradedPythonResult {
  return {
    contractVersion: 'amv-python-cognitive-twin/v1',
    requestId: request.requestId,
    status: 'available_not_invoked',
    reason,
    safeFallback: 'do_not_invoke_python',
    warnings: ['python_not_invoked', 'no_direct_services_python_import', 'quarantine_boundary_preserved'],
  }
}

export function buildCognitiveTwinBridgeResponse(request: CognitiveTwinRequest): CognitiveTwinResponse {
  return {
    contractVersion: 'amv-python-cognitive-twin/v1',
    requestId: request.requestId,
    correlationId: request.correlationId,
    status: 'available_not_invoked',
    degraded: degradedPythonResult(request),
    requiresHumanReview: true,
    warnings: ['python_bridge_contract_only', 'no_python_execution'],
  }
}

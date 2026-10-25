import { listBoundedCognitiveMissions, type SfiCognitiveMission } from './missionCatalog';

/**
 * C07 explicit, synchronous mission invocation via the existing ROOT executor.
 * This validation never creates a grant, queue item, receipt, or authorization.
 * ROOT's authenticated operation gate and the canonical execution preflight
 * still govern any actual invocation.
 */
export type MissionDispatchValidation =
  | { ok: true; mission: SfiCognitiveMission }
  | { ok: false; status: 400 | 409; error: string };

const asRow = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

export function validateMissionDispatchRequest(value: unknown): MissionDispatchValidation {
  const body = asRow(value);
  if (typeof body.missionId !== 'string' || !body.missionId.trim()
      || typeof body.agentId !== 'string' || !body.agentId.trim()) {
    return { ok: false, status: 400, error: 'mission_and_agent_required' };
  }
  const mission = listBoundedCognitiveMissions().find(item => item.missionId === body.missionId);
  if (!mission || mission.agentId !== body.agentId) {
    return { ok: false, status: 400, error: 'mission_agent_mismatch' };
  }
  if (!mission.executorBound) {
    return { ok: false, status: 409, error: 'mission_executor_unavailable' };
  }
  if (!Array.isArray(body.targets) || body.targets.length < mission.minimumTargets
      || body.targets.length > mission.maximumTargets) {
    return { ok: false, status: 400, error: 'mission_target_count_invalid' };
  }
  const seen = new Set<string>();
  for (const item of body.targets) {
    const target = asRow(item);
    if (typeof target.kind !== 'string' || typeof target.id !== 'string'
        || !target.id.trim() || !mission.inputKinds.includes(target.kind as typeof mission.inputKinds[number])) {
      return { ok: false, status: 400, error: 'mission_target_kind_or_identity_invalid' };
    }
    const key = target.kind + ':' + target.id;
    if (seen.has(key)) return { ok: false, status: 400, error: 'mission_target_duplicate' };
    seen.add(key);
  }
  if (typeof body.purpose !== 'string' || !body.purpose.trim()) {
    return { ok: false, status: 400, error: 'mission_purpose_required' };
  }
  if (!Array.isArray(body.anchors) || body.anchors.length === 0) {
    return { ok: false, status: 400, error: 'mission_anchor_required' };
  }
  return { ok: true, mission };
}

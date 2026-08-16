import {
  CT_CONSUMPTION_TRACE_SCHEMA_VERSION,
  type CognitiveContextConsumptionInput,
  type CognitiveContextConsumptionTrace,
} from '../contracts/consumptionTrace';
import { normalizeTimestamp } from '../serialization/canonicalSerialize';

function normalizedOptional(value: string | null | undefined, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (!value || value.trim() !== value) {
    throw new Error(`COGNITIVE_SPINE_INVALID_${label}:${JSON.stringify(value)}`);
  }
  return value;
}

export function buildCognitiveContextConsumptionTrace(
  input: CognitiveContextConsumptionInput,
): CognitiveContextConsumptionTrace {
  const executionId = normalizedOptional(input.executionId, 'EXECUTION_ID');
  if (!executionId) throw new Error('COGNITIVE_SPINE_EXECUTION_ID_REQUIRED');

  const availableId = normalizedOptional(input.ctSnapshotAvailable, 'AVAILABLE_SNAPSHOT_ID');
  const availableHash = normalizedOptional(input.ctSnapshotHashAvailable, 'AVAILABLE_SNAPSHOT_HASH');
  const consumedId = normalizedOptional(input.consumedSnapshotId, 'CONSUMED_SNAPSHOT_ID');
  const consumedHash = normalizedOptional(input.consumedSnapshotHash, 'CONSUMED_SNAPSHOT_HASH');
  const projectionProfile = normalizedOptional(input.projectionProfile, 'PROJECTION_PROFILE');
  const blindedObservation = Boolean(input.blindedObservation);

  if (Boolean(availableId) !== Boolean(availableHash)) {
    throw new Error('COGNITIVE_SPINE_AVAILABLE_SNAPSHOT_ID_HASH_PAIR_REQUIRED');
  }

  if (blindedObservation && input.ctSnapshotConsumed) {
    throw new Error('COGNITIVE_SPINE_BLINDED_OBSERVATION_CANNOT_CONSUME_CT');
  }

  if (input.ctSnapshotConsumed) {
    if (!consumedId || !consumedHash || !projectionProfile) {
      throw new Error('COGNITIVE_SPINE_CONSUMPTION_REQUIRES_SNAPSHOT_HASH_AND_PROFILE');
    }
    if (!availableId || !availableHash) {
      throw new Error('COGNITIVE_SPINE_CONSUMED_SNAPSHOT_MUST_HAVE_BEEN_AVAILABLE');
    }
    if (consumedId !== availableId || consumedHash !== availableHash) {
      throw new Error('COGNITIVE_SPINE_CONSUMED_SNAPSHOT_MUST_MATCH_AVAILABLE_SNAPSHOT');
    }
  } else if (consumedId || consumedHash || projectionProfile) {
    throw new Error('COGNITIVE_SPINE_NON_CONSUMPTION_MUST_NOT_DECLARE_CONSUMED_CONTEXT');
  }

  return {
    schemaVersion: CT_CONSUMPTION_TRACE_SCHEMA_VERSION,
    executionId,
    ctSnapshotAvailable: availableId,
    ctSnapshotHashAvailable: availableHash,
    ctSnapshotConsumed: input.ctSnapshotConsumed,
    consumedSnapshotId: consumedId,
    consumedSnapshotHash: consumedHash,
    projectionProfile,
    blindedObservation,
    recordedAt: normalizeTimestamp(input.recordedAt),
  };
}

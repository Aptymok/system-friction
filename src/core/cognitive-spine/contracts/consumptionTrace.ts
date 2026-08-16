export const CT_CONSUMPTION_TRACE_SCHEMA_VERSION = 'SFI-CT-CONTEXT-CONSUMPTION-1.0' as const;

export type CognitiveContextConsumptionTrace = {
  schemaVersion: typeof CT_CONSUMPTION_TRACE_SCHEMA_VERSION;
  executionId: string;
  ctSnapshotAvailable: string | null;
  ctSnapshotHashAvailable: string | null;
  ctSnapshotConsumed: boolean;
  consumedSnapshotId: string | null;
  consumedSnapshotHash: string | null;
  projectionProfile: string | null;
  profileVersion: string | null;
  consumptionReason: string | null;
  blindedObservation: boolean;
  recordedAt: string;
};

export type CognitiveContextConsumptionInput = {
  executionId: string;
  ctSnapshotAvailable?: string | null;
  ctSnapshotHashAvailable?: string | null;
  ctSnapshotConsumed: boolean;
  consumedSnapshotId?: string | null;
  consumedSnapshotHash?: string | null;
  projectionProfile?: string | null;
  profileVersion?: string | null;
  consumptionReason?: string | null;
  blindedObservation?: boolean;
  recordedAt: string;
};

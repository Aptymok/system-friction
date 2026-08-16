import type { CognitiveStateProjectionInput } from '../contracts/snapshot';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);
const D = 'd'.repeat(64);
const E = 'e'.repeat(64);

export const CPRT_A_PROFILE = 'CPRT_A_V1';

export function cprtAProjectionInputA(): CognitiveStateProjectionInput {
  return {
    sourceCutoff: '2026-08-16T07:30:00.000Z',
    projectorVersion: 'P1',
    policyVersion: 'E1',
    projectionProfile: CPRT_A_PROFILE,
    records: [
      {
        ref: 'EVID-001',
        kind: 'EVIDENCE',
        recordedAt: '2026-08-16T07:00:00.000Z',
        sourceHash: A,
        epistemicAssessmentRef: 'EA-001',
        epistemicClass: 'OBSERVED',
        ancestryRoots: ['ROOT-B', 'ROOT-A', 'ROOT-A'],
        visibilityProfiles: [CPRT_A_PROFILE],
      },
      {
        ref: 'EV-001',
        kind: 'EVENT',
        recordedAt: '2026-08-16T06:59:00.000Z',
        sourceHash: B,
        ancestryRoots: ['ROOT-A'],
      },
      {
        ref: 'H-001',
        kind: 'HYPOTHESIS',
        recordedAt: '2026-08-16T07:05:00.000Z',
        sourceHash: C,
        epistemicAssessmentRef: 'EA-002',
        epistemicClass: 'INFERRED',
        ancestryRoots: ['ROOT-A'],
      },
      {
        ref: 'Q-001',
        kind: 'QUESTION',
        recordedAt: '2026-08-16T07:06:00.000Z',
        sourceHash: D,
        epistemicAssessmentRef: 'EA-003',
        epistemicClass: 'DERIVED',
        ancestryRoots: ['ROOT-C'],
        debtType: 'VERIFICATION',
      },
      {
        ref: 'EV-FUTURE',
        kind: 'EVENT',
        recordedAt: '2026-08-16T07:31:00.000Z',
        sourceHash: E,
      },
      {
        ref: 'EV-HIDDEN',
        kind: 'EVENT',
        recordedAt: '2026-08-16T07:10:00.000Z',
        sourceHash: E,
        visibilityProfiles: ['OTHER_PROFILE'],
      },
    ],
  };
}

export function cprtAProjectionInputB(): CognitiveStateProjectionInput {
  const base = cprtAProjectionInputA();
  const evidence = base.records.find((record) => record.ref === 'EVID-001');
  if (!evidence) throw new Error('CPRT_A_FIXTURE_MISSING_EVIDENCE');

  return {
    ...base,
    sourceCutoff: '2026-08-16T01:30:00-06:00',
    records: [
      ...base.records.slice().reverse().map((record) => record.ref === 'EVID-001'
        ? {
            ...record,
            recordedAt: '2026-08-16T01:00:00-06:00',
            ancestryRoots: ['ROOT-A', 'ROOT-B'],
          }
        : record),
      {
        ...evidence,
        ancestryRoots: ['ROOT-B', 'ROOT-A', 'ROOT-A'],
      },
    ],
  };
}

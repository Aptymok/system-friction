export type ContinuityMode =
  | 'NORMAL'
  | 'FOUNDER_ABSENT_PREP'
  | 'FOUNDER_ABSENT_ACTIVE'
  | 'DEGRADED_SAFE'
  | 'EMERGENCY_HALT'
  | 'RECOVERY';

export type AutonomyLevel = 'A0' | 'A1' | 'A2' | 'A3';
export type CapabilityHealth = 'OPERATIONAL' | 'DEGRADED' | 'FAILED' | 'BLOCKED';

export type ContinuityCapability = {
  id: string;
  name: string;
  autonomyLevel: AutonomyLevel;
  probePath: string;
  timeoutMs: number;
  critical: boolean;
  allowedInFounderAbsence: boolean;
};

export const CONTINUITY_CAPABILITIES: ContinuityCapability[] = [
  { id: 'world_vector', name: 'World Vector', autonomyLevel: 'A0', probePath: '/api/worldspect/state', timeoutMs: 8000, critical: true, allowedInFounderAbsence: true },
  { id: 'scorefriction', name: 'ScoreFriction', autonomyLevel: 'A0', probePath: '/api/scorefriction/state', timeoutMs: 8000, critical: true, allowedInFounderAbsence: true },
  { id: 'mihm', name: 'MIHM', autonomyLevel: 'A0', probePath: '/api/mihm', timeoutMs: 8000, critical: true, allowedInFounderAbsence: true },
  { id: 'cognitive_runtime', name: 'Cognitive Runtime', autonomyLevel: 'A1', probePath: '/api/root/cognitive-runtime', timeoutMs: 10000, critical: true, allowedInFounderAbsence: true },
  { id: 'evidence', name: 'Evidence Ledger', autonomyLevel: 'A1', probePath: '/api/root/evidence', timeoutMs: 8000, critical: true, allowedInFounderAbsence: true },
  { id: 'observatory', name: 'Public Observatory', autonomyLevel: 'A1', probePath: '/api/observatory/state', timeoutMs: 8000, critical: false, allowedInFounderAbsence: true },
  { id: 'governance', name: 'Governance', autonomyLevel: 'A3', probePath: '/api/governance/acp', timeoutMs: 8000, critical: true, allowedInFounderAbsence: false },
  { id: 'publication', name: 'Institutional Publication', autonomyLevel: 'A3', probePath: '/api/publisher/draft', timeoutMs: 8000, critical: false, allowedInFounderAbsence: false },
];

export const SAFE_ABSENCE_RULES = {
  mayObserve: true,
  mayPrepareDrafts: true,
  mayRunReversibleJobs: true,
  mayPublish: false,
  mayChangeCanon: false,
  mayChangeFormula: false,
  mayGrantRootAccess: false,
  mayExecuteIrreversibleExternalAction: false,
} as const;

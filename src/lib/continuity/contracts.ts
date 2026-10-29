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

export type ContinuityTrialSchedule =
  | { state: 'DISABLED' | 'INVALID' }
  | { state: 'NOT_STARTED' | 'EXPIRED'; cycleId: string; startsAt: string; expiresAt: string }
  | { state: 'READY'; cycleId: string; startsAt: string; expiresAt: string; slot: number };

/** Server-owned, finite authority envelope for the existing heartbeat only.
 * It never enables general scheduled egress or the retired Neon adapter.
 */
export function readContinuityTrialSchedule(raw: string | undefined, nowMs = Date.now()): ContinuityTrialSchedule {
  if (!raw?.trim()) return { state: 'DISABLED' };
  if (raw.length > 1000 || !Number.isFinite(nowMs)) return { state: 'INVALID' };
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { state: 'INVALID' };
    const item = v as Record<string, unknown>;
    if (Object.keys(item).sort().join(',') !== 'cycleId,expiresAt,startsAt'
      || typeof item.cycleId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.cycleId)) return { state: 'INVALID' };
    const instant = (value: unknown) => {
      if (typeof value !== 'string') return NaN;
      const match = /^(\d{4}-\d\d-\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,3})?(Z|([+-])(\d\d):(\d\d))$/.exec(value);
      if (!match || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59
        || Number(match[7] ?? 0) > 23 || Number(match[8] ?? 0) > 59) return NaN;
      const ms = Date.parse(value);
      const offset = match[5] === 'Z' ? 0
        : (Number(match[7]) * 60 + Number(match[8])) * (match[6] === '-' ? -1 : 1);
      return Number.isFinite(ms) && new Date(ms + offset * 60000).toISOString().slice(0,10) === match[1] ? ms : NaN;
    };
    const start = instant(item.startsAt), end = instant(item.expiresAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end - start !== 3 * 3600000) return { state: 'INVALID' };
    const scope = {cycleId:item.cycleId.toLowerCase(),startsAt:new Date(start).toISOString(),expiresAt:new Date(end).toISOString()};
    if (nowMs < start) return { state: 'NOT_STARTED',...scope };
    if (nowMs >= end) return { state: 'EXPIRED',...scope };
    return { state: 'READY',...scope,
      slot: Math.floor((nowMs - start) / 3600000) };
  } catch { return { state: 'INVALID' }; }
}

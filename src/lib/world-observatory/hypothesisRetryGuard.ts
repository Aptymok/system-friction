/**
 * Persisted retry guard for the two existing World execution surfaces.
 *
 * The receipt family is shared between OAuth world:run and the scheduled
 * World cron. Merely waiting out a cooldown does not add information.
 * Suppress further identical provider-bound inference after repeated
 * failures unless the source set changes or a provider has a later
 * independently recorded successful canary/operation.
 */
export const SFI_WORLD_REPEAT_RETRY_GUARD = 'SFI-WORLD-REPEAT-RETRY-GUARD-1.0' as const;

export type WorldRetryReceipt = {
  event_name: string;
  occurred_at: string;
  payload: unknown;
};

export type WorldRetryProviderStatus = {
  available: boolean;
  circuitOpen: boolean;
  state: string;
  canaryOk: boolean | null;
  lastSuccessAt: string | null;
};

function timestamp(value: unknown): number {
  if(typeof value!=='string') return 0;
  const parsed=Date.parse(value);
  return Number.isFinite(parsed)?parsed:0;
}

function sourceCycleRef(value: unknown): string | null {
  if(!value || typeof value!=='object' || Array.isArray(value)) return null;
  const ref=(value as Record<string,unknown>).sourcePartialEventId;
  return typeof ref==='string' && ref.trim()?ref.trim():null;
}

export function assessWorldRepeatRetryGuard(input:{
  sourcePartialEventId: string;
  retryReceipts: WorldRetryReceipt[];
  latestObservationFetchedAt: string | null;
  providerStatuses: WorldRetryProviderStatus[];
  repeatLimit?: number;
}) {
  const limit=Math.max(1,Math.min(6,Math.floor(input.repeatLimit??3)));
  const observedAt=timestamp(input.latestObservationFetchedAt);
  const matching=input.retryReceipts.filter(receipt=>
    receipt.event_name==='external.world.hypothesis_resume.partial' &&
    sourceCycleRef(receipt.payload)===input.sourcePartialEventId &&
    timestamp(receipt.occurred_at)>0
  ).sort((a,b)=>timestamp(b.occurred_at)-timestamp(a.occurred_at));
  const failuresOnUnchangedSource=matching.filter(receipt=>
    observedAt===0 || timestamp(receipt.occurred_at)>=observedAt
  );
  const latestFailedAt=timestamp(matching[0]?.occurred_at);
  const newObservationSinceLastFailure=observedAt>latestFailedAt && latestFailedAt>0;
  const providerRecovered=input.providerStatuses.some(p=>
    p.available && !p.circuitOpen && p.state==='HEALTHY' &&
    p.canaryOk===true && timestamp(p.lastSuccessAt)>latestFailedAt && latestFailedAt>0
  );
  const repeated=failuresOnUnchangedSource.length>=limit;
  const suspended=repeated && !newObservationSinceLastFailure && !providerRecovered;
  return {
    contract:SFI_WORLD_REPEAT_RETRY_GUARD,
    status:suspended?'RETRY_SUSPENDED_UNCHANGED_OBSERVATIONS':'RETRY_ELIGIBLE' as
      'RETRY_SUSPENDED_UNCHANGED_OBSERVATIONS'|'RETRY_ELIGIBLE',
    suspended,
    previousFailureCount:failuresOnUnchangedSource.length,
    repeatLimit:limit,
    newObservationSinceLastFailure,
    providerRecovered,
    latestFailedAt:latestFailedAt?new Date(latestFailedAt).toISOString():null,
    worldReturnVerified:false as const,
    writesPerformed:false as const,
    boundary:'Only persisted hypothesis-retry receipts for the same partial cycle count. A new independently fetched source or post-failure verified provider recovery can reopen a prospective attempt. No fabricated hypothesis, action authority, canonical learning or retrospective T0 rewrite.',
  };
}

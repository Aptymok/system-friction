import type { RootSessionEvent } from './sovereignTypes';

export function RootActionStrip({ events, stale, warning }: { events: RootSessionEvent[]; stale: boolean; warning: string | null }) {
  const latest = events[0];
  return <footer className="rs-action-strip"><span>ACTION / EVENT</span><strong data-status={latest?.status ?? (stale ? 'blocked' : 'done')}>{latest ? `${latest.label}: ${latest.status.toUpperCase()}` : stale ? 'STALE STATE' : 'READY'}</strong><em>{latest?.detail ?? warning ?? 'Sin mutaciones en esta sesión.'}</em>{latest?.auditId ? <code>AUDIT {latest.auditId}</code> : null}</footer>;
}

'use client';

import { useState } from 'react';

type RootOperationalJob = 'daily' | 'reports' | 'audit' | 'all';

const ROOT_ROUTE = ['/api/root/operational', 'trigger-observation'].join('/');

export function RootOperationalTrigger({ job = 'all', compact = false }: { job?: RootOperationalJob; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'blocked'>('idle');

  async function run() {
    setState('running');
    try {
      const response = await fetch(`${ROOT_ROUTE}?job=${encodeURIComponent(job)}`, { method: 'POST' });
      setState(response.ok ? 'done' : 'blocked');
    } catch {
      setState('blocked');
    }
  }

  const label = state === 'running' ? 'RUNNING' : state === 'done' ? 'SYNCED' : state === 'blocked' ? 'GATED' : compact ? 'SYNC' : 'RUN ROOT SYNC';
  return <button type="button" className="rc-btn" onClick={run} disabled={state === 'running'} title="Runs the governed ROOT observation route. No parallel queue is created.">{label}</button>;
}

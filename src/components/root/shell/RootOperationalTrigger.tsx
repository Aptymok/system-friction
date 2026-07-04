'use client';

import { useState } from 'react';

type RootOperationalJob = 'all' | 'reports';

export function RootOperationalTrigger({ job, compact = false }: { job: RootOperationalJob; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');

  async function run() {
    setState('running');
    try {
      const response = await fetch(`/api/world-vector/agents/system-run?job=${encodeURIComponent(job)}&persist=true`, { method: 'POST' });
      setState(response.ok ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
  }

  const label = state === 'running' ? 'RUNNING' : state === 'done' ? 'SYNCED' : state === 'failed' ? 'GATED' : compact ? 'SYNC' : 'RUN ROOT SYNC';
  return <button type="button" className="rc-btn" onClick={run} disabled={state === 'running'} title="Runs an existing World Vector agent endpoint. No ROOT governance queue is created.">{label}</button>;
}

import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';

export function RootTopBar({ state, refreshing, onRefresh }: { state: RootSovereignState; refreshing: boolean; onRefresh: () => void }) {
  const governance = state.system.data.matrix.find((item) => item.id === 'governance');
  return (
    <header className="rs-topbar">
      <div className="rs-identity"><span>SFI</span><strong>ROOT</strong><em>SOVEREIGN CONSOLE</em></div>
      <div className="rs-system-state"><span>SYSTEM STATE</span><strong data-status={governance?.state.status}>{governance?.state.value ?? 'SIN DATO'}</strong><small>ACP · {governance?.state.observedAt ?? 'NO MEDIDO'}</small></div>
      <div className="rs-topbar-actions"><time>{new Date(state.generatedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</time><button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'REFRESHING' : 'REFRESH'}</button></div>
    </header>
  );
}

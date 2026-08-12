import Link from 'next/link';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';

export function RootTopBar({ state, refreshing, onRefresh }: { state: RootSovereignState; refreshing: boolean; onRefresh: () => void }) {
  const governance = state.system.data.matrix.find((item) => item.id === 'governance');
  const linkStyle = { color: '#d8c488', fontSize: 11, textDecoration: 'none', border: '1px solid #6c5a2d', padding: '7px 9px' } as const;
  return <header className="rs-topbar"><div className="rs-identity"><span>SFI</span><strong>ROOT</strong><em>SOVEREIGN CONSOLE</em></div><div className="rs-system-state"><span>SYSTEM STATE</span><strong data-status={governance?.state.status}>{governance?.state.value ?? 'SIN DATO'}</strong><small>ACP · {governance?.state.observedAt ?? 'NO MEDIDO'}</small></div><div className="rs-topbar-actions"><Link href="/root/evidence/intake" style={linkStyle}>EVIDENCE</Link><Link href="/root/attractor" style={linkStyle}>ATTRACTOR</Link><Link href="/root/readiness" style={linkStyle}>READINESS</Link><Link href="/root/agents" style={linkStyle}>AGENTS</Link><Link href="/root/cognitive-twin" style={linkStyle}>COGNITIVE TWIN</Link><time>{new Date(state.generatedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</time><button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'REFRESHING' : 'REFRESH'}</button></div></header>;
}

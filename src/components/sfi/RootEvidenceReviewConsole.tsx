'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { RootEvidenceCandidateLane } from '@/components/sfi/RootEvidenceCandidateLane';

type Proposal = { id: string; title?: string; status?: string; proposalType?: string };
type CacheEntry = { at:number; proposals:Proposal[] };

const CACHE_TTL_MS=120_000;
const proposalCache=new Map<string,CacheEntry>();

export function RootEvidenceReviewConsole() {
  const auth=useAuthState();
  const userKey=auth.identity?.userId??'unknown';
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading,setLoading]=useState(false);

  const pull=useCallback(async(force=false)=>{
    const cached=proposalCache.get(userKey);
    if(!force&&userKey!=='unknown'&&cached&&Date.now()-cached.at<CACHE_TTL_MS){setProposals(cached.proposals);setError(null);return;}
    setLoading(true);
    try {
      const response = await fetch('/api/acp/proposals', { cache: 'no-store' });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(`${response.status}: ${json?.error ?? 'proposal_source_failed'}`);
      const next=Array.isArray(json.data?.proposals) ? json.data.proposals : [];
      if(userKey!=='unknown')proposalCache.set(userKey,{at:Date.now(),proposals:next});
      setProposals(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {setLoading(false)}
  },[userKey]);

  useEffect(() => { void pull(false); }, [pull]);

  const waiting = useMemo(() => proposals
    .filter((proposal) => proposal.status === 'waiting_evidence' || proposal.status === 'needs_evidence')
    .map((proposal) => ({ id: proposal.id, title: proposal.title || proposal.proposalType || 'Propuesta esperando evidencia' })), [proposals]);

  return <main style={{ minHeight: '100vh', background: '#010407', color: '#e8f5fc', padding: '24px' }}>
    <header style={{ maxWidth: 1500, margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'end' }}>
      <div>
        <small style={{ letterSpacing: '.16em', color: '#719bb2' }}>ROOT · EVIDENCE GOVERNANCE</small>
        <h1 style={{ margin: '6px 0', fontSize: 30, fontWeight: 500 }}>EVIDENCE SEARCH / REVIEW</h1>
        <p style={{ margin: 0, maxWidth: 820, color: '#7896a8', fontSize: 12 }}>La búsqueda y los agentes pueden proponer fuentes. Ninguna fuente entra como evidencia elegible hasta que ROOT la acepte.</p>
      </div>
      <div style={{display:'flex',gap:12,alignItems:'center'}}><button type="button" disabled={loading} onClick={()=>void pull(true)} style={{border:'1px solid #33546a',background:'#061018',color:'#9cd8f5',padding:'8px 10px',fontFamily:'monospace',fontSize:10,cursor:'pointer'}}>{loading?'LEYENDO…':'ACTUALIZAR'}</button><Link href="/root" style={{ color: '#9cd8f5', fontFamily: 'monospace', fontSize: 11 }}>← ROOT</Link></div>
    </header>
    <div style={{ maxWidth: 1500, margin: '0 auto' }}>
      {error && <p style={{ color: '#e1a867', fontFamily: 'monospace', fontSize: 10 }}>DEGRADED · {error}</p>}
      {!error && !waiting.length && <p style={{ color: '#6f8795', fontFamily: 'monospace', fontSize: 11 }}>No hay propuestas en WAITING_EVIDENCE.</p>}
      <RootEvidenceCandidateLane proposals={waiting} />
    </div>
  </main>;
}
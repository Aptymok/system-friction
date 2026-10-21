'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthState } from '@/components/auth/AuthProvider';
import { RootEvidenceCandidateLane } from '@/components/sfi/RootEvidenceCandidateLane';
import { InstitutionalEvidenceInventory } from '@/components/sfi/InstitutionalEvidenceInventory';
import type { InstitutionalEvidenceInventory as EvidenceInventory } from '@/lib/evidence/institutionalInventoryProjection';
import './RootEvidenceReviewConsole.css';

type Proposal = { id: string; title?: string; status?: string; proposalType?: string };
type ScopedCase = { id: string; subject: string; status: string; updatedAt: string | null };
type CacheEntry = { at:number; proposals:Proposal[] };

const CACHE_TTL_MS=120_000;
const proposalCache=new Map<string,CacheEntry>();

export function RootEvidenceReviewConsole() {
  const auth=useAuthState();
  const userKey=auth.identity?.userId??'unknown';
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading,setLoading]=useState(false);
  const [inventory, setInventory] = useState<EvidenceInventory | null>(null);
  const [cases, setCases] = useState<ScopedCase[]>([]);
  const [caseWarnings, setCaseWarnings] = useState<string[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const response = await fetch('/api/root/evidence/inventory', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.inventory) throw new Error(data?.error ?? `inventory_http_${response.status}`);
      setInventory(data.inventory as EvidenceInventory);
      setCases(Array.isArray(data.cases) ? data.cases : []);
      setCaseWarnings(Array.isArray(data.caseWarnings) ? data.caseWarnings : []);
      setInventoryError(null);
    } catch (cause) {
      setInventory(null);
      setCases([]);
      setInventoryError(cause instanceof Error ? cause.message : String(cause));
    } finally { setInventoryLoading(false); }
  }, []);

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

  useEffect(() => { void pull(false); void loadInventory(); }, [pull, loadInventory]);

  const waiting = useMemo(() => proposals
    .filter((proposal) => proposal.status === 'waiting_evidence' || proposal.status === 'needs_evidence')
    .map((proposal) => ({ id: proposal.id, title: proposal.title || proposal.proposalType || 'Proposal waiting for evidence' })), [proposals]);

  return <main className="rootEvidenceShell">
    <header className="rootEvidenceHeader">
      <div>
        <small>ROOT · EVIDENCE GOVERNANCE</small>
        <h1>Evidence is admitted, not assumed.</h1>
        <p>Search and agents may propose sources. No source becomes eligible evidence until ROOT admits it.</p>
      </div>
      <div className="rootEvidenceActions"><button type="button" disabled={loading || inventoryLoading} onClick={()=>{ void pull(true); void loadInventory(); }}>{loading || inventoryLoading?'READING…':'REFRESH'}</button></div>
    </header>
    <section className="rootEvidenceBoundary"><b>SOURCE ≠ EVIDENCE</b><span>CANDIDATE ≠ ADMITTED · SEARCH ≠ TRUTH · ADMISSION ≠ AUTHORITY</span></section>
    <div className="rootEvidenceBody">
      {inventoryError && <p className="rootEvidenceDegraded" role="status">INVENTORY UNAVAILABLE · {inventoryError}</p>}
      {inventory ? <InstitutionalEvidenceInventory context="ROOT" inventory={inventory} cases={cases} caseWarnings={caseWarnings} /> : null}
      <h2>Governance proposals awaiting evidence</h2>
      {error && <p className="rootEvidenceDegraded">DEGRADED · {error}</p>}
      {!error && !waiting.length && <div className="rootEvidenceEmpty"><small>QUEUE STATE</small><strong>NO WAITING EVIDENCE</strong><p>The absence of candidates is not interpreted as absence of evidence in the world.</p></div>}
      <RootEvidenceCandidateLane proposals={waiting} />
    </div>
  </main>;
}
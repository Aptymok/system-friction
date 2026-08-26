'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { RootEvidenceCandidateLane } from '@/components/sfi/RootEvidenceCandidateLane';

type Proposal = { id: string; title?: string; status?: string; proposalType?: string };

export function RootEvidenceReviewConsole() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      try {
        const response = await fetch('/api/acp/proposals', { cache: 'no-store' });
        const json = await response.json().catch(() => null);
        if (stop) return;
        if (!response.ok || !json?.ok) throw new Error(`${response.status}: ${json?.error ?? 'proposal_source_failed'}`);
        setProposals(Array.isArray(json.data?.proposals) ? json.data.proposals : []);
        setError(null);
      } catch (cause) {
        if (!stop) setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    void pull();
    const timer = window.setInterval(pull, 20_000);
    return () => { stop = true; window.clearInterval(timer); };
  }, []);

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
      <Link href="/root" style={{ color: '#9cd8f5', fontFamily: 'monospace', fontSize: 11 }}>← ROOT</Link>
    </header>
    <div style={{ maxWidth: 1500, margin: '0 auto' }}>
      {error && <p style={{ color: '#e1a867', fontFamily: 'monospace', fontSize: 10 }}>DEGRADED · {error}</p>}
      {!error && !waiting.length && <p style={{ color: '#6f8795', fontFamily: 'monospace', fontSize: 11 }}>No hay propuestas en WAITING_EVIDENCE.</p>}
      <RootEvidenceCandidateLane proposals={waiting} />
    </div>
  </main>;
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import './RootEvidenceCandidateLane.css';

type ProposalRef = { id: string; title: string };
type Candidate = {
  id: string;
  parentProposalId: string;
  title: string;
  status: string;
  createdAt: string | null;
  requestNote: string | null;
  acquisitionProvider: string | null;
  acquisitionOrigin: 'automatic_search' | 'manual_url' | 'external_agent';
  source: {
    url: string;
    title: string;
    publisher: string | null;
    snippet: string;
    publishedAt: string | null;
    retrievedAt: string;
    sourceType: string;
    reliability: number;
    referenceHash: string;
    contentHash: null;
    contentType?: string | null;
    lastModified?: string | null;
  };
};

type EvidenceReadiness = {
  state: 'MISSING' | 'REVIEW_REQUIRED' | 'SATISFIED';
  jobId: string;
  owner: 'evidence_hunter' | 'ROOT';
  nextExpectedEvent: string;
  rootActionRequired: boolean;
  slots: Array<{
    key: string;
    label: string;
    status: 'MISSING' | 'CANDIDATE' | 'ACCEPTED';
    candidateIds: string[];
    acceptedEvidenceIds: string[];
  }>;
  counts: { required: number; accepted: number; candidate: number; missing: number; rejectedCandidates: number };
};

type Props = { proposals: ProposalRef[] };

export function RootEvidenceCandidateLane({ proposals }: Props) {
  const [proposalId, setProposalId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [readiness, setReadiness] = useState<EvidenceReadiness | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proposals.length) {
      setProposalId('');
      setCandidates([]);
      setReadiness(null);
      return;
    }
    if (!proposals.some((proposal) => proposal.id === proposalId)) setProposalId(proposals[0].id);
  }, [proposals, proposalId]);

  const selectedProposal = proposals.find((proposal) => proposal.id === proposalId) ?? proposals[0] ?? null;

  const load = async (targetId = proposalId) => {
    if (!targetId) return;
    try {
      const response = await fetch(`/api/sfi/proposals/${targetId}/evidence-candidates`, { cache: 'no-store' });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(`${response.status}: ${json?.error ?? 'evidence_candidate_read_failed'}`);
      setCandidates(Array.isArray(json.candidates) ? json.candidates : []);
      setReadiness(json.evidenceReadiness ?? null);
      setError(json.readinessWarning ? `READINESS DEGRADED · ${json.readinessWarning}` : null);
    } catch (cause) {
      setCandidates([]);
      setReadiness(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  useEffect(() => { void load(proposalId); }, [proposalId]);

  const counts = useMemo(() => ({
    proposed: candidates.filter((candidate) => candidate.status === 'proposed').length,
    accepted: candidates.filter((candidate) => candidate.status === 'accepted').length,
    rejected: candidates.filter((candidate) => candidate.status === 'rejected').length,
  }), [candidates]);

  const acquire = async (action: 'search' | 'add_url') => {
    if (!proposalId || busy) return;
    if (action === 'add_url' && !url.trim()) return;
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/sfi/proposals/${proposalId}/evidence-candidates`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'search'
          ? { action: 'search', request_note: 'Buscar candidatos suficientes para resolver el gate de evidencia de esta propuesta.' }
          : { action: 'add_url', url: url.trim(), request_note: 'URL agregada por ROOT para revisión como evidencia candidata.' }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok && response.status !== 207) throw new Error(`${response.status}: ${json?.error ?? 'evidence_candidate_acquisition_failed'}`);
      if (action === 'add_url') setUrl('');
      await load(proposalId);
      if (json?.warnings?.length) setError(`SEARCH WARNINGS · ${json.warnings.join(' · ')}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  const decide = async (candidate: Candidate, decision: 'accept' | 'reject') => {
    if (!proposalId || busy) return;
    setBusy(candidate.id);
    setError(null);
    try {
      const response = await fetch(`/api/sfi/proposals/${proposalId}/evidence-candidates/${candidate.id}/${decision}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: decision === 'reject' ? JSON.stringify({ reason: 'Rejected by ROOT during source eligibility review.' }) : '{}',
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.ok === false) throw new Error(`${response.status}: ${json?.error ?? `evidence_candidate_${decision}_failed`}`);
      await load(proposalId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  };

  if (!proposals.length) return null;

  return <section className="rootEvidenceCandidates" aria-label="Evidence candidate review">
    <header>
      <div>
        <small>EVIDENCE SEARCH / ROOT REVIEW</small>
        <strong>LA MÁQUINA BUSCA · ROOT DECIDE QUÉ ENTRA</strong>
      </div>
      <span>{counts.accepted} aceptadas · {counts.proposed} por revisar · {counts.rejected} rechazadas</span>
    </header>

    <div className="rootEvidenceProposalTabs">
      {proposals.map((proposal) => <button key={proposal.id} data-active={proposal.id === proposalId} onClick={() => setProposalId(proposal.id)}>
        <b>{proposal.title}</b><small>{proposal.id}</small>
      </button>)}
    </div>

    {readiness && <div className="rootEvidenceControls" aria-label="Evidence readiness">
      <div>
        <span>EVIDENCE GATE</span>
        <b>{readiness.state}</b>
        <small>{readiness.counts.accepted}/{readiness.counts.required} slots aceptados · owner {readiness.owner}</small>
      </div>
      <div>
        <span>NEXT EXPECTED EVENT</span>
        <b>{readiness.nextExpectedEvent}</b>
        <small>ROOT: {readiness.rootActionRequired ? 'ACCIÓN REQUERIDA' : 'ninguna acción ahora'}</small>
      </div>
      <div>
        <span>JOB</span>
        <b>{readiness.jobId}</b>
      </div>
    </div>}

    {readiness?.slots?.length ? <div className="rootEvidenceCandidateList" aria-label="Evidence slots">
      {readiness.slots.map((slot) => <article key={slot.key} data-status={slot.status === 'ACCEPTED' ? 'accepted' : slot.status === 'CANDIDATE' ? 'proposed' : 'missing'}>
        <div className="rootEvidenceCandidateHead">
          <div><small>EVIDENCE SLOT</small><b>{slot.label}</b></div>
          <strong>{slot.status}</strong>
        </div>
        <p>{slot.status === 'ACCEPTED' ? 'Persistida y aceptada por ROOT.' : slot.status === 'CANDIDATE' ? 'Existe fuente candidata; ROOT debe decidir elegibilidad.' : 'Falta candidato elegible; evidence_hunter conserva el siguiente trabajo.'}</p>
      </article>)}
    </div> : null}

    {selectedProposal && <div className="rootEvidenceControls">
      <button disabled={Boolean(busy)} onClick={() => void acquire('search')}>{busy === 'search' ? 'BUSCANDO…' : 'BUSCAR / REINTENTAR'}</button>
      <label>
        <span>AGREGAR URL COMO CANDIDATO</span>
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.inegi.org.mx/..." />
      </label>
      <button disabled={Boolean(busy) || !url.trim()} onClick={() => void acquire('add_url')}>{busy === 'add_url' ? 'REGISTRANDO…' : 'AGREGAR URL'}</button>
    </div>}

    {error && <p className="rootEvidenceError">{error}</p>}

    <div className="rootEvidenceCandidateList">
      {candidates.map((candidate) => <article key={candidate.id} data-status={candidate.status}>
        <div className="rootEvidenceCandidateHead">
          <div><small>{candidate.source.sourceType.toUpperCase()} · {candidate.acquisitionOrigin.replaceAll('_', ' ').toUpperCase()}</small><b>{candidate.source.title}</b></div>
          <strong>{candidate.status.toUpperCase()}</strong>
        </div>
        <p>{candidate.source.snippet || 'Sin extracto; revisar la fuente original.'}</p>
        <dl>
          <div><dt>Publisher</dt><dd>{candidate.source.publisher ?? '—'}</dd></div>
          <div><dt>Publicado</dt><dd>{candidate.source.publishedAt ?? '—'}</dd></div>
          <div><dt>Recuperado</dt><dd>{candidate.source.retrievedAt}</dd></div>
          <div><dt>Reliability</dt><dd>{candidate.source.reliability.toFixed(2)}</dd></div>
          <div><dt>Reference hash</dt><dd>{candidate.source.referenceHash.slice(0, 20)}…</dd></div>
          <div><dt>Content hash</dt><dd>UNOBSERVED</dd></div>
        </dl>
        <div className="rootEvidenceCandidateActions">
          <a href={candidate.source.url} target="_blank" rel="noreferrer">VER FUENTE ↗</a>
          {candidate.status === 'proposed' && <>
            <button disabled={Boolean(busy)} onClick={() => void decide(candidate, 'accept')}>{busy === candidate.id ? 'PERSISTIENDO…' : 'ACEPTAR COMO EVIDENCIA'}</button>
            <button disabled={Boolean(busy)} onClick={() => void decide(candidate, 'reject')}>RECHAZAR</button>
          </>}
        </div>
        {candidate.status === 'accepted' && <small className="rootEvidenceBoundary">PERSISTIDA POR EL WRITER CANÓNICO · aceptación de elegibilidad ≠ verificación automática de todas las afirmaciones de la fuente.</small>}
      </article>)}
      {!candidates.length && !error && <em>No hay candidatos todavía. “PEDIR EVIDENCIA” inicia adquisición; el watchdog reintenta y también puedes agregar una URL.</em>}
    </div>
  </section>;
}

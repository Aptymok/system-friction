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
  owner: 'evidence_hunter' | 'evidence_assessment';
  nextExpectedEvent: string;
  rootActionRequired: false;
  basis?: 'NONE' | 'WORKING_SOURCES' | 'ACCEPTED_EVIDENCE' | 'MIXED';
  slots: Array<{
    key: string;
    label: string;
    status: 'MISSING' | 'CANDIDATE' | 'ACCEPTED';
    candidateIds: string[];
    acceptedEvidenceIds: string[];
  }>;
  counts: { required: number; accepted: number; candidate: number; missing: number; rejectedCandidates: number; usable?: number };
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
    working: candidates.filter((candidate) => candidate.status === 'proposed').length,
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
          ? { action: 'search', request_note: 'Buscar fuentes suficientes para completar el análisis de esta propuesta.' }
          : { action: 'add_url', url: url.trim(), request_note: 'URL agregada como fuente de trabajo trazable.' }),
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

  if (!proposals.length) return null;

  return <section className="rootEvidenceCandidates" aria-label="Working evidence sources">
    <header>
      <div>
        <small>FUENTES / TRABAJO OPERATIVO</small>
        <strong>SFI BUSCA, CLASIFICA Y CONTINÚA · ROOT NO APRUEBA FUENTES</strong>
      </div>
      <span>{counts.working} de trabajo · {counts.accepted} ya persistidas · {counts.rejected} descartadas</span>
    </header>

    <div className="rootEvidenceProposalTabs">
      {proposals.map((proposal) => <button key={proposal.id} data-active={proposal.id === proposalId} onClick={() => setProposalId(proposal.id)}>
        <b>{proposal.title}</b><small>{proposal.id}</small>
      </button>)}
    </div>

    {readiness && <div className="rootEvidenceControls" aria-label="Evidence readiness">
      <div>
        <span>ESTADO PARA TRABAJAR</span>
        <b>{readiness.state}</b>
        <small>{readiness.counts.usable ?? readiness.counts.accepted + readiness.counts.candidate}/{readiness.counts.required} necesidades cubiertas · {readiness.basis ?? '—'}</small>
      </div>
      <div>
        <span>QUÉ SIGUE</span>
        <b>{readiness.nextExpectedEvent}</b>
        <small>Tu intervención: ninguna por revisión de fuentes</small>
      </div>
      <div>
        <span>RESPONSABLE</span>
        <b>{readiness.owner}</b>
      </div>
    </div>}

    {readiness?.slots?.length ? <div className="rootEvidenceCandidateList" aria-label="Evidence slots">
      {readiness.slots.map((slot) => <article key={slot.key} data-status={slot.status === 'ACCEPTED' ? 'accepted' : slot.status === 'CANDIDATE' ? 'proposed' : 'missing'}>
        <div className="rootEvidenceCandidateHead">
          <div><small>NECESIDAD DE EVIDENCIA</small><b>{slot.label}</b></div>
          <strong>{slot.status}</strong>
        </div>
        <p>{slot.status === 'ACCEPTED'
          ? 'Existe evidencia persistida; SFI puede usarla conservando su trazabilidad.'
          : slot.status === 'CANDIDATE'
            ? 'Existe una fuente de trabajo trazable. SFI puede analizarla sin pedir aprobación; eso no la vuelve verdad institucional.'
            : 'Falta una fuente adecuada; SFI conserva la búsqueda como siguiente trabajo.'}</p>
      </article>)}
    </div> : null}

    {selectedProposal && <div className="rootEvidenceControls">
      <button disabled={Boolean(busy)} onClick={() => void acquire('search')}>{busy === 'search' ? 'BUSCANDO…' : 'BUSCAR / REINTENTAR'}</button>
      <label>
        <span>APORTAR URL COMO FUENTE</span>
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.inegi.org.mx/..." />
      </label>
      <button disabled={Boolean(busy) || !url.trim()} onClick={() => void acquire('add_url')}>{busy === 'add_url' ? 'REGISTRANDO…' : 'AGREGAR URL'}</button>
    </div>}

    {error && <p className="rootEvidenceError">{error}</p>}

    <div className="rootEvidenceCandidateList">
      {candidates.map((candidate) => <article key={candidate.id} data-status={candidate.status}>
        <div className="rootEvidenceCandidateHead">
          <div><small>{candidate.source.sourceType.toUpperCase()} · {candidate.acquisitionOrigin.replaceAll('_', ' ').toUpperCase()}</small><b>{candidate.source.title}</b></div>
          <strong>{candidate.status === 'proposed' ? 'FUENTE DE TRABAJO' : candidate.status.toUpperCase()}</strong>
        </div>
        <p>{candidate.source.snippet || 'Sin extracto; SFI conserva la referencia y sus límites.'}</p>
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
        </div>
        <small className="rootEvidenceBoundary">USO OPERATIVO ≠ VERIFICACIÓN DE TODAS LAS AFIRMACIONES ≠ CANON. Si después se pretende cambiar SFI con esta información, esa decisión aparece separadamente.</small>
      </article>)}
      {!candidates.length && !error && <em>No hay fuentes todavía. SFI inicia o reintenta la adquisición automáticamente; también puedes aportar una URL si ya la tienes.</em>}
    </div>
  </section>;
}

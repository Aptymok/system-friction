'use client';

import { useCallback, useState } from 'react';
import type { CulturalVectorResponse } from '@/lib/scorefriction/cultural-vector-contract';
import './CulturalVectorDashboard.css';

type EvidenceEntry = {
  id: string;
  source_name: string;
  evidence_type: string;
  reliability_score: number | null;
  provenance_notes: string | null;
  source_coverage_contribution: number | null;
  evidence_hash: string;
  created_at: string;
  summary: string | null;
};

type EvidenceResponse = { ok?: boolean; entries?: EvidenceEntry[]; error?: string };

function numberInput(value: string) {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

function value(value: unknown, digits = 3) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

export default function CulturalVectorDashboard() {
  const [caseId, setCaseId] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [territory, setTerritory] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [reliability, setReliability] = useState('');
  const [coverage, setCoverage] = useState('');
  const [provenance, setProvenance] = useState('');
  const [narrative, setNarrative] = useState('');
  const [data, setData] = useState<CulturalVectorResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [status, setStatus] = useState('Introduce un case_id persistido o registra evidencia nueva.');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setBusy(true);
    try {
      const [evaluationResponse, evidenceResponse] = await Promise.all([
        fetch(`/api/scorefriction/evaluate?case_id=${encodeURIComponent(id.trim())}`, { cache: 'no-store' }),
        fetch(`/api/scorefriction/evidence?case_id=${encodeURIComponent(id.trim())}`, { cache: 'no-store' }),
      ]);
      const evidenceJson = await evidenceResponse.json().catch(() => ({})) as EvidenceResponse;
      setEvidence(evidenceJson.entries ?? []);
      if (evaluationResponse.status === 404) {
        setData(null);
        setStatus('No existe todavía un vector evaluable para ese case_id. La ausencia se conserva como ausencia.');
        return;
      }
      const evaluationJson = await evaluationResponse.json().catch(() => null) as CulturalVectorResponse | null;
      if (!evaluationResponse.ok || !evaluationJson) throw new Error('No se pudo leer el estado ScoreFriction.');
      setData(evaluationJson);
      setStatus('Estado cargado desde observaciones y vectores persistidos.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error de lectura.');
    } finally {
      setBusy(false);
    }
  }, []);

  async function registerObservation() {
    const reliabilityScore = numberInput(reliability);
    const sourceCoverage = numberInput(coverage);
    if (!caseId.trim() || !sourceName.trim() || !evidenceType.trim() || !provenance.trim() || !narrative.trim() || reliabilityScore === null || sourceCoverage === null) {
      setStatus('case_id, source, evidence_type, provenance, texto, reliability y coverage válidos son obligatorios.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/scorefriction/observe/manual', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId.trim(),
          source_name: sourceName.trim(),
          source_url: sourceUrl.trim() || null,
          territory: territory.trim() || null,
          evidence_type: evidenceType.trim(),
          reliability_score: reliabilityScore,
          source_coverage_contribution: sourceCoverage,
          provenance_notes: provenance.trim(),
          raw_payload: { text: narrative.trim(), submitted_from: 'scorefriction_evidence_workspace' },
        }),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? 'No se pudo persistir la observación.');
      setStatus('Observación persistida. Recalculando lectura desde evidencia real.');
      await load(caseId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error de persistencia.');
    } finally {
      setBusy(false);
    }
  }

  const vector = data?.cultural_vector;
  return (
    <main className="sf-cvd" style={{ minHeight: '100vh', padding: 24 }}>
      <header className="sf-cvd-header" style={{ position: 'static' }}>
        <div className="sf-cvd-brand">SFI</div>
        <div className="sf-cvd-stat">SCOREFRICTION <span>EVIDENCE WORKSPACE</span></div>
        <div className="sf-cvd-stat">CVΦ <span>{value(vector?.cvphi)}</span></div>
        <div className="sf-cvd-stat">EVD <span>{data?.evidence?.observation_count ?? evidence.length}</span></div>
        <div className="sf-cvd-stat">COV <span>{value(data?.evidence?.source_coverage, 2)}</span></div>
      </header>

      <section className="sf-panel" style={{ marginTop: 18, padding: 18 }}>
        <div className="sf-zone-label">identidad del objeto observado</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          <input value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="case_id" />
          <button type="button" disabled={busy || !caseId.trim()} onClick={() => void load(caseId)}>Cargar estado</button>
        </div>
      </section>

      <section className="sf-panel" style={{ marginTop: 18, padding: 18 }}>
        <div className="sf-zone-label">ingesta de evidencia con procedencia explícita</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="source_name" />
          <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="source_url (opcional)" />
          <input value={territory} onChange={(event) => setTerritory(event.target.value)} placeholder="territory (si aplica)" />
          <input value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} placeholder="evidence_type" />
          <input value={reliability} onChange={(event) => setReliability(event.target.value)} placeholder="reliability 0..1" />
          <input value={coverage} onChange={(event) => setCoverage(event.target.value)} placeholder="coverage 0..1" />
        </div>
        <input style={{ width: '100%', marginTop: 10 }} value={provenance} onChange={(event) => setProvenance(event.target.value)} placeholder="provenance_notes" />
        <textarea style={{ width: '100%', minHeight: 130, marginTop: 10 }} value={narrative} onChange={(event) => setNarrative(event.target.value)} placeholder="contenido observado; no se completará ni interpretará automáticamente" />
        <button type="button" disabled={busy} onClick={() => void registerObservation()}>Registrar observación</button>
        <p>{status}</p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18, marginTop: 18 }}>
        <article className="sf-panel" style={{ padding: 18 }}>
          <div className="sf-zone-label">vector cultural observado</div>
          {vector ? (
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(vector).map(([key, entry]) => <div key={key}><dt>{key}</dt><dd>{typeof entry === 'number' ? value(entry) : String(entry)}</dd></div>)}
            </dl>
          ) : <p>Sin vector completo. No se genera un fallback.</p>}
        </article>

        <article className="sf-panel" style={{ padding: 18 }}>
          <div className="sf-zone-label">evidencia persistida</div>
          {evidence.length ? evidence.map((entry) => (
            <div key={entry.id} style={{ borderBottom: '1px solid rgba(200,169,81,.12)', padding: '10px 0' }}>
              <strong>{entry.source_name} · {entry.evidence_type}</strong>
              <p>{entry.summary ?? 'Sin resumen derivado.'}</p>
              <small>{entry.created_at} · reliability {entry.reliability_score ?? '—'} · coverage {entry.source_coverage_contribution ?? '—'} · {entry.evidence_hash}</small>
              {entry.provenance_notes ? <p>{entry.provenance_notes}</p> : null}
            </div>
          )) : <p>Sin evidencia persistida para este case_id.</p>}
        </article>
      </section>
    </main>
  );
}

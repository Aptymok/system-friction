'use client';

import { useCallback, useEffect, useState } from 'react';

import '../root-phenomenological-observatory.css';

type PhenomenonHit = {
  id: string;
  name: string;
  status: string;
  opened_at: string;
  last_evidence_at: string | null;
  current_composite: number | null;
};

type Props = {
  onRefresh?: () => void;
};

export function RootPhenomenologicalObservatory({
  onRefresh,
}: Props) {
  const [phenomena, setPhenomena] = useState<PhenomenonHit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<PhenomenonHit | null>(null);
  const [newCaseName, setNewCaseName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Array<Record<string, unknown>> | null>(null);

  const [evSource, setEvSource] = useState('');
  const [evDomain, setEvDomain] = useState('');
  const [evText, setEvText] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evType, setEvType] = useState('OBSERVATION');

  const fetchPhenomena = useCallback(async () => {
    try {
      const res = await fetch('/api/ppoi/phenomena', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setPhenomena(data.phenomena ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPhenomena();
  }, [fetchPhenomena]);

  useEffect(() => {
    if (selectedId) {
      const found = phenomena.find(p => p.id === selectedId);
      setSelected(found ?? null);
    } else {
      setSelected(null);
    }
  }, [selectedId, phenomena]);

  function selectHit(hit: PhenomenonHit) {
    setSelectedId(hit ? hit.id : null);
  }

  async function openCase(forceCreate = false) {
    if (!newCaseName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/ppoi/phenomena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCaseName.trim(), forceCreate }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }

      // La resolución de identidad ya viene calculada por el backend
      // (resolvePhenomenonIdentity). El observatorio debe reflejarla,
      // no tratarla siempre como creación.
      if (body.action === 'SELECT_EXISTING') {
        setCandidates(body.candidates ?? []);
        return;
      }

      if (body.action === 'OPEN_EXISTING') {
        const existing = body.phenomenon as Record<string, unknown>;
        setCandidates(null);
        setNewCaseName('');
        onRefresh?.();
        if (existing?.id) setSelectedId(String(existing.id));
        return;
      }

      // action === 'CREATED'
      setCandidates(null);
      setNewCaseName('');
      onRefresh?.();
      fetchPhenomena();
    } finally {
      setBusy(false);
    }
  }

  function selectCandidate(candidateId: string) {
    setCandidates(null);
    setNewCaseName('');
    onRefresh?.();
    setSelectedId(candidateId);
  }

  function cancelResolution() {
    setCandidates(null);
  }

  async function addEvidence() {
    if (!selectedId || !evSource.trim() || !evDomain.trim() || !evText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/ppoi/phenomena/${selectedId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: evSource.trim(),
          domain: evDomain.trim(),
          content_text: evText.trim(),
          observed_at: evDate || new Date().toISOString(),
          evidence_type: evType,
        }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setEvSource('');
      setEvDomain('');
      setEvText('');
      setEvDate('');
      fetchPhenomena();
      onRefresh?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="po-root">
      <div className="po-list">
        <span>CASOS ABIERTOS</span>
        {phenomena.length === 0 ? (
          <div className="po-empty">Todavía no hay casos abiertos.</div>
        ) : (
          <ul>
            {phenomena.map((p) => (
              <li key={p.id} className={p.id === selectedId ? 'po-active' : ''}>
                <button type="button" onClick={() => selectHit(p)}>
                  <strong>{p.name}</strong>
                  <span>{p.status} · {p.current_composite?.toFixed(2) ?? '—'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="po-open-case">
        <span>ABRIR CASO</span>
        <input value={newCaseName} onChange={(event) => setNewCaseName(event.target.value)} placeholder="Nombre del fenómeno" />
        <button type="button" onClick={() => openCase(false)} disabled={busy}>{busy ? '...' : 'ABRIR'}</button>
        {error ? <span style={{ color: '#e06c67' }}>{error}</span> : null}
      </div>

      {candidates && candidates.length > 0 ? (
        <div className="po-resolve">
          <span>¿QUERÍAS DECIR?</span>
          <div className="po-resolve-list">
            {candidates.map((candidate) => {
              const id = String(candidate.id ?? '');
              const name = String(candidate.name ?? candidate.label ?? 'sin nombre');
              const similarity = Number(candidate.similarity ?? 0);
              const origin = String(candidate.originModule ?? candidate.module ?? 'ppoi').toUpperCase();
              return (
                <button type="button" key={id || name} className="po-resolve-item" onClick={() => selectCandidate(id)} disabled={!id}>
                  <strong>{name}</strong>
                  <span>{origin} · similitud {(similarity * 100).toFixed(0)}%</span>
                </button>
              );
            })}
          </div>
          <div className="po-resolve-actions">
            <button type="button" onClick={() => openCase(true)} disabled={busy}>CREAR NUEVO DE TODAS FORMAS</button>
            <button type="button" onClick={cancelResolution}>CANCELAR</button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="po-panel">
          <button type="button" className="po-panel-close" onClick={() => setSelectedId(null)}>CERRAR ×</button>
          <h2>{selected.name}</h2>
          <p>Estado: {selected.status}</p>
          <p>Última evidencia: {selected.last_evidence_at ? new Date(selected.last_evidence_at).toLocaleString() : '—'}</p>
          <hr />
          <div className="po-evidence-form">
            <h3>Añadir evidencia</h3>
            <input
              placeholder="Fuente (ej. URL, autor)"
              value={evSource}
              onChange={(e) => setEvSource(e.target.value)}
            />
            <input
              placeholder="Dominio (ej. música, redes, política)"
              value={evDomain}
              onChange={(e) => setEvDomain(e.target.value)}
            />
            <select value={evType} onChange={(e) => setEvType(e.target.value)}>
              <option value="OBSERVATION">Observación</option>
              <option value="DOCUMENT">Documento</option>
              <option value="TESTIMONY">Testimonio</option>
              <option value="DATASET">Dataset</option>
            </select>
            <input
              type="datetime-local"
              value={evDate}
              onChange={(e) => setEvDate(e.target.value)}
            />
            <textarea
              placeholder="Contenido textual de la evidencia"
              value={evText}
              onChange={(e) => setEvText(e.target.value)}
              rows={4}
            />
            <button type="button" onClick={addEvidence} disabled={busy}>
              {busy ? '...' : 'AÑADIR EVIDENCIA'}
            </button>
            {error ? <span style={{ color: '#e06c67' }}>{error}</span> : null}
          </div>
        </div>
      ) : (
        <div className="po-empty-state">Selecciona un caso para ver detalles.</div>
      )}
    </div>
  );
}
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Phenomenon = {
  id: string;
  fp_code: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  is_calibration_case: boolean;
  opened_at: string;
  last_evidence_at: string | null;
  current_indices: Record<string, number> | null;
  current_composite: number | null;
  indices_calculated_at: string | null;
};

type Evidence = {
  id: string;
  evidence_type: string;
  source: string;
  domain: string;
  content_url: string | null;
  content_text: string | null;
  generates_artifact: boolean;
  artifact_note: string | null;
  observed_at: string;
};

type Hypothesis = {
  direction: string;
  rationale: string;
  rival_direction: string;
  rival_rationale: string;
};

const EVIDENCE_TYPES = ['text', 'audio', 'video', 'image', 'software', 'dataset', 'interview', 'field', 'model', 'paper', 'conversation', 'institutional_record'];
const DIRECTION_LABEL: Record<string, string> = {
  DEEPENING: 'Deepening',
  EXPANSION: 'Expansion',
  FRAGMENTATION: 'Fragmentation',
  CONVERGENCE: 'Convergence',
  INSTITUTIONALIZATION: 'Institutionalization',
  DEGRADATION: 'Degradation',
  ABSTRACTION: 'Abstraction',
  OPERATIONALIZATION: 'Operationalization',
};

const box = 'border border-[#2f2a1e] bg-[#0b0b09] p-5';
const label = 'font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]';
const input = 'w-full border border-[#312b1d] bg-[#050504] px-3 py-2 text-sm text-[#eee4cb] outline-none placeholder:text-[#5d574a] focus:border-[#c9aa54]';
const button = 'border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951] disabled:cursor-not-allowed disabled:opacity-40';

export function PpoiConsole({ authenticated }: { authenticated: boolean }) {
  const [loading, setLoading] = useState(authenticated);
  const [phenomena, setPhenomena] = useState<Phenomenon[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [calibrationNotes, setCalibrationNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIsCalibration, setNewIsCalibration] = useState(false);
  const [evType, setEvType] = useState(EVIDENCE_TYPES[0]);
  const [evSource, setEvSource] = useState('');
  const [evDomain, setEvDomain] = useState('');
  const [evUrl, setEvUrl] = useState('');
  const [evText, setEvText] = useState('');
  const [evGenerates, setEvGenerates] = useState(false);
  const [evArtifactNote, setEvArtifactNote] = useState('');

  const selected = useMemo(() => phenomena.find((item) => item.id === selectedId) ?? null, [phenomena, selectedId]);

  useEffect(() => {
    if (authenticated) void loadPhenomena();
  }, [authenticated]);

  async function loadPhenomena() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ppoi/phenomena', { cache: 'no-store' });
      const body = await response.json();
      if (body.ok) setPhenomena(body.phenomena);
      else setError(body.details || body.error);
    } catch {
      setError('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(phenomenonId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/ppoi/phenomena/${phenomenonId}`, { cache: 'no-store' });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setEvidence(body.evidence);
      setHypothesis(body.currentHypothesis);
      setPhenomena((current) => current.map((item) => (item.id === phenomenonId ? body.phenomenon : item)));
    } finally {
      setBusy(false);
    }
  }

  async function openCase() {
    if (!newName.trim()) {
      setError('PHENOMENON_NAME_REQUIRED');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/ppoi/phenomena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), isCalibrationCase: newIsCalibration }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setPhenomena((current) => [body.phenomenon, ...current]);
      setSelectedId(body.phenomenon.id);
      setEvidence([]);
      setHypothesis(null);
      setNewName('');
      setNewIsCalibration(false);
    } finally {
      setBusy(false);
    }
  }

  async function selectCase(phenomenonId: string) {
    setSelectedId(phenomenonId);
    await loadDetail(phenomenonId);
  }

  async function addEvidence() {
    if (!selectedId) return;
    if (!evSource.trim() || !evDomain.trim() || (!evUrl.trim() && !evText.trim())) {
      setError('EVIDENCE_SOURCE_DOMAIN_AND_CONTENT_REQUIRED');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/ppoi/phenomena/${selectedId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceType: evType,
          source: evSource.trim(),
          domain: evDomain.trim(),
          contentUrl: evUrl.trim() || null,
          contentText: evText.trim() || null,
          generatesArtifact: evGenerates,
          artifactNote: evArtifactNote.trim() || null,
        }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setCalibrationNotes(body.calibrationNotes ?? []);
      setEvSource('');
      setEvUrl('');
      setEvText('');
      setEvGenerates(false);
      setEvArtifactNote('');
      await loadDetail(selectedId);
    } finally {
      setBusy(false);
    }
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
        <div className="mx-auto max-w-2xl">
          <div className={box}>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">PPOI</p>
            <h1 className="mt-4 text-2xl font-semibold text-[#f5eedc]">Persistent Phenomena Observation Instrument</h1>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">A session is required to open private phenomenon files.</p>
            <Link href="/login?next=%2Fstudio%2Fppoi" className={`mt-4 inline-block ${button}`}>Login</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className={box}>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">PPOI</p>
          <h1 className="mt-4 text-3xl font-semibold text-[#f5eedc]">Persistent phenomena with automatic recalibration.</h1>
          <p className="mt-3 text-sm leading-6 text-[#9f9788]">
            Open a private phenomenon file, add evidence, and let PPOI recalculate PT/PM/IE/RC/CG/ES/LT/IO plus a trajectory hypothesis.
          </p>
        </header>

        {error && <div className="border border-[#5a2a1e] bg-[#0b0b09] p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d98a6a]">{error}</div>}

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <div className={box}>
              <p className={label}>Open file</p>
              <div className="mt-3 space-y-2">
                <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Phenomenon name" className={input} />
                <label className="flex items-center gap-2 text-xs text-[#9f9788]">
                  <input type="checkbox" checked={newIsCalibration} onChange={(event) => setNewIsCalibration(event.target.checked)} />
                  Calibration case
                </label>
                <button type="button" onClick={openCase} disabled={busy} className={button}>Open</button>
              </div>
            </div>

            <div className={box}>
              <p className={label}>Files</p>
              {loading ? (
                <p className="mt-3 text-sm text-[#9f9788]">Loading...</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {phenomena.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void selectCase(item.id)}
                        className={`w-full border px-3 py-2 text-left text-sm ${selectedId === item.id ? 'border-[#c9aa54] text-[#f5eedc]' : 'border-[#241f16] text-[#9f9788]'}`}
                      >
                        <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[#c8a951]">{item.fp_code}</span>
                        {item.name}
                        {item.current_composite !== null && <span className="ml-2 text-xs text-[#8f8878]">Phi_f {item.current_composite.toFixed(2)}</span>}
                      </button>
                    </li>
                  ))}
                  {phenomena.length === 0 && <li className="text-sm text-[#9f9788]">No files yet.</li>}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {!selected && <div className={box}><p className="text-sm text-[#9f9788]">Select or open a file to inspect PPOI state.</p></div>}

            {selected && (
              <>
                <div className={box}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className={label}>{selected.fp_code} {selected.is_calibration_case ? '/ calibration' : ''}</p>
                      <h2 className="mt-1 text-2xl font-semibold text-[#f5eedc]">{selected.name}</h2>
                    </div>
                    {selected.current_composite !== null && (
                      <span className="border border-[#c9aa54] px-3 py-2 font-mono text-lg text-[#c8a951]">Phi_f = {selected.current_composite.toFixed(2)}</span>
                    )}
                  </div>

                  {selected.current_indices ? (
                    <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
                      {Object.entries(selected.current_indices).map(([key, value]) => (
                        <div key={key} className="border border-[#241f16] px-2 py-2 text-center">
                          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#8f8878]">{key}</p>
                          <p className="text-sm text-[#eee4cb]">{typeof value === 'number' ? value.toFixed(1) : 'MISSING'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-[#9f9788]">No evidence yet. Add evidence to produce the first PPOI reading.</p>
                  )}
                </div>

                {hypothesis && (
                  <div className={box}>
                    <p className={label}>Trajectory hypothesis</p>
                    <p className="mt-2 text-lg text-[#f5eedc]">{DIRECTION_LABEL[hypothesis.direction] ?? hypothesis.direction}</p>
                    <p className="mt-1 text-sm leading-6 text-[#9f9788]">{hypothesis.rationale}</p>
                    <p className="mt-4 border-t border-[#241f16] pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">
                      Rival: {DIRECTION_LABEL[hypothesis.rival_direction] ?? hypothesis.rival_direction}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#9f9788]">{hypothesis.rival_rationale}</p>
                  </div>
                )}

                {calibrationNotes.length > 0 && (
                  <div className={box}>
                    <p className={label}>Latest recalibration notes</p>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-[#9f9788]">
                      {calibrationNotes.map((note, index) => <li key={index}>{note}</li>)}
                    </ul>
                  </div>
                )}

                <div className={box}>
                  <p className={label}>Add evidence</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs text-[#9f9788]">
                      Type
                      <select value={evType} onChange={(event) => setEvType(event.target.value)} className={input}>
                        {EVIDENCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs text-[#9f9788]">
                      Source
                      <input value={evSource} onChange={(event) => setEvSource(event.target.value)} className={input} />
                    </label>
                    <label className="grid gap-1 text-xs text-[#9f9788]">
                      Domain
                      <input value={evDomain} onChange={(event) => setEvDomain(event.target.value)} className={input} />
                    </label>
                    <label className="grid gap-1 text-xs text-[#9f9788]">
                      URL
                      <input value={evUrl} onChange={(event) => setEvUrl(event.target.value)} className={input} />
                    </label>
                  </div>
                  <label className="mt-3 grid gap-1 text-xs text-[#9f9788]">
                    Text or note
                    <textarea value={evText} onChange={(event) => setEvText(event.target.value)} rows={3} className={`${input} resize-y`} />
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-xs text-[#9f9788]">
                    <input type="checkbox" checked={evGenerates} onChange={(event) => setEvGenerates(event.target.checked)} />
                    This evidence generated a new artifact
                  </label>
                  {evGenerates && <input value={evArtifactNote} onChange={(event) => setEvArtifactNote(event.target.value)} placeholder="Artifact note" className={`${input} mt-2`} />}
                  <button type="button" onClick={() => void addEvidence()} disabled={busy} className={`mt-4 ${button}`}>
                    {busy ? 'Recalibrating...' : 'Add evidence and recalibrate'}
                  </button>
                </div>

                <div className={box}>
                  <p className={label}>Evidence ({evidence.length})</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#9f9788]">
                    {evidence.map((item) => (
                      <li key={item.id} className="border border-[#241f16] px-3 py-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#8f8878]">
                          {item.evidence_type} / {item.domain} / {item.source} / {new Date(item.observed_at).toLocaleDateString()}
                        </span>
                        {item.content_text && <p className="mt-1">{item.content_text}</p>}
                        {item.content_url && <p className="mt-1 break-all text-[#8f8878]">{item.content_url}</p>}
                        {item.generates_artifact && <p className="mt-1 text-[#c8a951]">{item.artifact_note || 'Generated artifact'}</p>}
                      </li>
                    ))}
                    {evidence.length === 0 && <li>No evidence yet.</li>}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

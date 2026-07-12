'use client';

import { useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from '../sovereignTypes';
import { AmvLattice } from '../visual/AmvLattice';

const OBJECT_CLASSES = [
  'music',
  'article',
  'social_post',
  'website',
  'institution',
  'company',
  'ai_response',
  'historical_event',
  'cultural_signal',
  'person',
  'organization',
  'movement',
  'other',
];

function rawValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function optionalNumber(value: string): number | null | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RootAmvView({ state, onSelect, onAction }: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
  onAction: (action: RootActionRequest) => void;
}) {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Record<string, unknown> | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [text, setText] = useState('');
  const [source, setSource] = useState('root_manual');
  const [caseId, setCaseId] = useState('');
  const [evalObjectId, setEvalObjectId] = useState('');
  const [evalThemes, setEvalThemes] = useState('');

  const [evidenceObjectId, setEvidenceObjectId] = useState('');
  const [evidenceObjectClass, setEvidenceObjectClass] = useState('article');
  const [evidenceSourceType, setEvidenceSourceType] = useState('manual_audited_capture');
  const [evidenceSourceRef, setEvidenceSourceRef] = useState('');
  const [evidenceMetricKey, setEvidenceMetricKey] = useState('');
  const [evidenceRawValue, setEvidenceRawValue] = useState('');
  const [evidenceNormalizedValue, setEvidenceNormalizedValue] = useState('');
  const [evidenceUnit, setEvidenceUnit] = useState('');
  const [evidenceReliability, setEvidenceReliability] = useState('0.7');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceClass, setEvidenceClass] = useState('declared');
  const [evidenceCapturedAt, setEvidenceCapturedAt] = useState('');

  const [consentObjectId, setConsentObjectId] = useState('');
  const [consentEvidenceId, setConsentEvidenceId] = useState('');
  const [consentNote, setConsentNote] = useState('');
  const [consentScope, setConsentScope] = useState('');

  async function search() {
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch('/api/root/agentic/amv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'search', query }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setSearchResult(body);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'search_failed');
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="rs-view">
      <div className="rs-view-title">
        <span>AMV</span>
        <h1>PERSISTENT SIGNAL LATTICE</h1>
        <p>Memoria, evidencia, fases y consentimiento. Ingestar una declaración no la convierte en hecho verificado.</p>
      </div>

      <div className="rs-amv-grid">
        <article className="wide">
          <header>MEMORY LATTICE</header>
          <AmvLattice memories={state.amv.data.memories} onSelect={onSelect} />
        </article>

        <article>
          <header>SEARCH MEMORY</header>
          <form className="rs-form" onSubmit={(event) => { event.preventDefault(); void search(); }}>
            <label>QUERY<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <button type="submit" disabled={searching}>{searching ? 'SEARCHING' : 'SEARCH'}</button>
          </form>
          {searchError ? <div className="rs-source-warning">{searchError}</div> : null}
          {searchResult ? <pre className="rs-result">{JSON.stringify(searchResult, null, 2)}</pre> : null}
        </article>

        <article>
          <header>INGEST AMV</header>
          <form className="rs-form" onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            onAction({
              id: `amv-ingest-${Date.now()}`,
              label: 'INGEST AMV',
              effect: 'Registra memoria declarada y trazable. No la clasifica como evidencia verificada.',
              target: caseId || source,
              endpoint: '/api/root/agentic/amv',
              method: 'POST',
              body: { operation: 'ingest', text, source, caseId: caseId || null },
            });
          }}>
            <label>SOURCE<input value={source} onChange={(event) => setSource(event.target.value)} required /></label>
            <label>CASE ID<input value={caseId} onChange={(event) => setCaseId(event.target.value)} /></label>
            <label>TEXT<textarea value={text} onChange={(event) => setText(event.target.value)} required /></label>
            <button type="submit" disabled={text.trim().length < 6}>REVIEW INGEST</button>
          </form>
        </article>

        <article>
          <header>ROOT OBJECT EVALUATOR</header>
          <p className="rs-view-note">Persiste síntesis y proyección. Solo registra un número predictivo cuando Fase 1, Fase 2 y consentimiento están completos.</p>
          <form className="rs-form" onSubmit={(event) => {
            event.preventDefault();
            if (!evalObjectId.trim()) return;
            onAction({
              id: `root-evaluate-${Date.now()}`,
              label: 'ROOT OBJECT EVALUATOR',
              effect: `Evalúa ${evalObjectId}, registra el caso en Reference Bank y respeta los gates epistemológicos.`,
              target: evalObjectId,
              endpoint: '/api/root/evaluate',
              method: 'POST',
              body: {
                objectId: evalObjectId,
                themes: evalThemes.split(',').map((item) => item.trim()).filter(Boolean),
              },
            });
          }}>
            <label>STUDIO OBJECT ID<input value={evalObjectId} onChange={(event) => setEvalObjectId(event.target.value)} required /></label>
            <label>ATLAS THEMES<input value={evalThemes} onChange={(event) => setEvalThemes(event.target.value)} placeholder="editorial, medium, cultural" /></label>
            <button type="submit" disabled={!evalObjectId.trim()}>REVIEW EVALUATION</button>
          </form>
        </article>

        <article className="wide">
          <header>EXTERNAL EVIDENCE INTAKE</header>
          <p className="rs-view-note">Registra una observación externa real. `normalizedValue` puede quedar vacío; no se transforma en cero.</p>
          <form className="rs-form" onSubmit={(event) => {
            event.preventDefault();
            const reliability = Number(evidenceReliability);
            const normalizedValue = optionalNumber(evidenceNormalizedValue);
            if (!evidenceObjectId.trim() || !evidenceMetricKey.trim() || !evidenceNote.trim() || !Number.isFinite(reliability) || normalizedValue === null) return;
            onAction({
              id: `external-evidence-${Date.now()}`,
              label: 'RECORD EXTERNAL EVIDENCE',
              effect: `Registra ${evidenceMetricKey} para ${evidenceObjectId}, con procedencia, confiabilidad y nota explícita.`,
              target: evidenceObjectId,
              endpoint: '/api/root/external-evidence',
              method: 'POST',
              body: {
                objectId: evidenceObjectId,
                objectClass: evidenceObjectClass,
                sourceType: evidenceSourceType,
                sourceRef: evidenceSourceRef || null,
                metricKey: evidenceMetricKey,
                rawValue: rawValue(evidenceRawValue),
                normalizedValue,
                unit: evidenceUnit || null,
                reliability,
                evidenceNote,
                epistemicClass: evidenceClass,
                capturedAt: evidenceCapturedAt || new Date().toISOString(),
              },
            });
          }}>
            <label>OBJECT ID<input value={evidenceObjectId} onChange={(event) => setEvidenceObjectId(event.target.value)} required /></label>
            <label>OBJECT CLASS<select value={evidenceObjectClass} onChange={(event) => setEvidenceObjectClass(event.target.value)}>{OBJECT_CLASSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>SOURCE TYPE<input value={evidenceSourceType} onChange={(event) => setEvidenceSourceType(event.target.value)} required /></label>
            <label>SOURCE REF<input value={evidenceSourceRef} onChange={(event) => setEvidenceSourceRef(event.target.value)} placeholder="URL, export id or document ref" /></label>
            <label>METRIC KEY<input value={evidenceMetricKey} onChange={(event) => setEvidenceMetricKey(event.target.value)} placeholder="exposure, read_or_completion, evaluation" required /></label>
            <label>RAW VALUE<textarea value={evidenceRawValue} onChange={(event) => setEvidenceRawValue(event.target.value)} placeholder="Number, text or JSON" required /></label>
            <label>NORMALIZED VALUE [0–1]<input value={evidenceNormalizedValue} onChange={(event) => setEvidenceNormalizedValue(event.target.value)} inputMode="decimal" placeholder="optional" /></label>
            <label>UNIT<input value={evidenceUnit} onChange={(event) => setEvidenceUnit(event.target.value)} placeholder="views, ratio, seconds" /></label>
            <label>RELIABILITY [0–1]<input value={evidenceReliability} onChange={(event) => setEvidenceReliability(event.target.value)} inputMode="decimal" required /></label>
            <label>EPISTEMIC CLASS<select value={evidenceClass} onChange={(event) => setEvidenceClass(event.target.value)}><option value="observed">observed</option><option value="declared">declared</option><option value="derived">derived</option><option value="inferred">inferred</option><option value="missing">missing</option></select></label>
            <label>CAPTURED AT<input value={evidenceCapturedAt} onChange={(event) => setEvidenceCapturedAt(event.target.value)} placeholder="ISO timestamp; blank = now" /></label>
            <label>EVIDENCE NOTE<textarea value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="What was captured, how and under what conditions" required /></label>
            <button type="submit" disabled={!evidenceObjectId.trim() || !evidenceMetricKey.trim() || evidenceNote.trim().length < 6}>REVIEW EVIDENCE</button>
          </form>
        </article>

        <article>
          <header>CONSENT PROTOCOL</header>
          <p className="rs-view-note">Obligatorio cuando el objeto es persona, organización o movimiento. La nota debe declarar alcance y fuente del consentimiento.</p>
          <form className="rs-form" onSubmit={(event) => {
            event.preventDefault();
            if (!consentObjectId.trim() || consentNote.trim().length < 12) return;
            onAction({
              id: `amv-consent-${Date.now()}`,
              label: 'RECORD AMV CONSENT',
              effect: `Registra consentimiento explícito y su alcance para ${consentObjectId}.`,
              target: consentObjectId,
              endpoint: '/api/root/consent',
              method: 'POST',
              body: {
                objectId: consentObjectId,
                documented: true,
                evidenceId: consentEvidenceId || null,
                evidenceNote: consentNote,
                scope: consentScope || null,
              },
            });
          }}>
            <label>STUDIO OBJECT ID<input value={consentObjectId} onChange={(event) => setConsentObjectId(event.target.value)} required /></label>
            <label>EVIDENCE ID<input value={consentEvidenceId} onChange={(event) => setConsentEvidenceId(event.target.value)} placeholder="document, event or agreement id" /></label>
            <label>SCOPE<input value={consentScope} onChange={(event) => setConsentScope(event.target.value)} placeholder="what may be observed and for how long" /></label>
            <label>EVIDENCE NOTE<textarea value={consentNote} onChange={(event) => setConsentNote(event.target.value)} required /></label>
            <button type="submit" disabled={!consentObjectId.trim() || consentNote.trim().length < 12}>REVIEW CONSENT</button>
          </form>
        </article>

        <article>
          <header>ATTRACTORS / CONTRADICTIONS</header>
          <div className="rs-card-list">
            {state.amv.data.attractors.slice(0, 8).map((item) => (
              <button type="button" key={String(item.id)} onClick={() => onSelect({
                kind: 'attractor',
                id: String(item.attractor_key ?? item.id),
                title: String(item.label ?? 'Attractor'),
                source: 'sfi_attractors',
                observedAt: typeof item.updated_at === 'string' ? item.updated_at : null,
                confidence: typeof item.confidence === 'number' ? item.confidence : null,
                evidenceIds: [],
                warning: null,
                data: item,
              })}>
                <span>{String(item.status ?? 'SIN DATO')}</span>
                <strong>{String(item.label ?? item.attractor_key)}</strong>
                <em>EVIDENCE {String(item.evidence_count ?? 'NO MEDIDO')}</em>
              </button>
            ))}
            {state.amv.data.ejectors.slice(0, 8).map((item) => (
              <button type="button" key={String(item.id)} onClick={() => onSelect({
                kind: 'contradiction',
                id: String(item.ejector_key ?? item.id),
                title: String(item.label ?? 'Contradiction'),
                source: 'sfi_ejectors',
                observedAt: typeof item.updated_at === 'string' ? item.updated_at : null,
                confidence: null,
                evidenceIds: [],
                warning: null,
                data: item,
              })}>
                <span>CONTRADICTION</span>
                <strong>{String(item.label ?? item.ejector_key)}</strong>
                <em>{String(item.status ?? 'SIN DATO')}</em>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

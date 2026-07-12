'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from '../sovereignTypes';
import { EvidenceGraph } from '../visual/EvidenceGraph';

const FILTERS = ['evidence','signal','hypothesis','prediction','outcome','report','atlas','moph','world_vector','amv'];

type AtlasTrajectory = {
  runId: string;
  generatedAt: string;
  prediction: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  confidence: number | null;
  state: string;
  modelVersion: number | null;
  calibrationStatus: string | null;
  dueAt: string | null;
};

type AtlasCase = {
  caseId: string;
  caseCode: string;
  objectId: string;
  objectTitle: string;
  objectClass: string | null;
  openedAt: string | null;
  closedAt: string | null;
  themes: string[];
  evidenceCount: number;
  evidenceSources: string[];
  trajectory: AtlasTrajectory[];
  latestPrediction: number | null;
  latestConfidence: number | null;
  latestState: string | null;
  latestRunAt: string | null;
};

type AtlasResponse = {
  ok: boolean;
  cases?: AtlasCase[];
  allThemes?: string[];
  warnings?: string[];
  error?: string;
  details?: string;
};

export function RootEvidenceAtlasView({ state, onSelect, onAction }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void; onAction: (action: RootActionRequest) => void }) {
  const [active, setActive] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [intakeTitle, setIntakeTitle] = useState('');
  const [intakeContent, setIntakeContent] = useState('');
  const [intakeType, setIntakeType] = useState('root_evidence');
  const [atlasCases, setAtlasCases] = useState<AtlasCase[]>([]);
  const [atlasThemes, setAtlasThemes] = useState<string[]>([]);
  const [atlasTheme, setAtlasTheme] = useState('');
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [atlasError, setAtlasError] = useState<string | null>(null);
  const [atlasWarnings, setAtlasWarnings] = useState<string[]>([]);
  const [atlasObjectId, setAtlasObjectId] = useState('');
  const [atlasThemeInput, setAtlasThemeInput] = useState('');
  const filtered = active.length ? state.evidence.data.nodes.filter((node) => active.includes(node.type) || active.includes(node.source.replace('sfi_', ''))) : state.evidence.data.nodes;

  const loadAtlas = useCallback(async (theme: string, signal?: AbortSignal) => {
    setAtlasLoading(true);
    setAtlasError(null);
    try {
      const suffix = theme ? `?theme=${encodeURIComponent(theme)}` : '';
      const response = await fetch(`/api/root/atlas${suffix}`, { cache: 'no-store', credentials: 'include', signal });
      const body = await response.json().catch(() => null) as AtlasResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setAtlasCases(body.cases ?? []);
      setAtlasThemes(body.allThemes ?? []);
      setAtlasWarnings(body.warnings ?? []);
    } catch (cause) {
      if (signal?.aborted) return;
      setAtlasError(cause instanceof Error ? cause.message : 'atlas_query_failed');
    } finally {
      if (!signal?.aborted) setAtlasLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAtlas(atlasTheme, controller.signal);
    return () => controller.abort();
  }, [atlasTheme, loadAtlas]);

  async function search() {
    setSearching(true);
    setError(null);
    try {
      const response = await fetch('/api/root/agentic/neural-graph', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, filters: active.length ? active : FILTERS, generateInterpretation: false }) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setResult(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'graph_query_failed');
    } finally {
      setSearching(false);
    }
  }

  const selectAtlas = (item: AtlasCase) => onSelect({
    kind: 'atlas case',
    id: item.caseId,
    title: item.objectTitle,
    source: 'sfi_predictive_runs + studio_objects + studio_evidence_traces',
    observedAt: item.latestRunAt ?? item.openedAt,
    confidence: item.latestConfidence,
    evidenceIds: [],
    warning: null,
    data: item as unknown as Record<string, unknown>,
  });

  return (
    <section className="rs-view">
      <div className="rs-view-title"><span>EVIDENCE / ATLAS</span><h1>REAL EVIDENCE GRAPH</h1><p>Solo nodos, aristas, pesos y relaciones persistidas.</p></div>

      <article>
        <header>LONGITUDINAL ATLAS</header>
        <div className="rs-filter-row">
          <select value={atlasTheme} onChange={(event) => setAtlasTheme(event.target.value)} aria-label="Atlas theme filter">
            <option value="">ALL THEMES</option>
            {atlasThemes.map((theme) => <option key={theme} value={theme}>{theme}</option>)}
          </select>
          <button type="button" onClick={() => void loadAtlas(atlasTheme)} disabled={atlasLoading}>{atlasLoading ? 'LOADING' : 'REFRESH ATLAS'}</button>
        </div>
        {atlasError ? <div className="rs-source-warning">ATLAS · {atlasError}</div> : null}
        {atlasWarnings.length ? <div className="rs-source-warning">ATLAS DEGRADED · {atlasWarnings.join(' | ')}</div> : null}
        <div className="rs-card-list horizontal">
          {atlasCases.length ? atlasCases.map((item) => <button type="button" key={item.caseId} onClick={() => selectAtlas(item)}><span>{item.latestState ?? 'SIN RUN'}</span><strong>{item.objectTitle}</strong><em>{item.trajectory.length} RUNS · EVIDENCE {item.evidenceCount} · {item.latestPrediction === null ? 'P —' : `P ${item.latestPrediction.toFixed(3)}`}</em></button>) : <div className="rs-empty"><b>{atlasLoading ? 'LOADING' : 'SIN TRAYECTORIAS'}</b></div>}
        </div>
        <form className="rs-form" onSubmit={(event) => {
          event.preventDefault();
          if (!atlasObjectId.trim()) return;
          const themes = atlasThemeInput.split(',').map((item) => item.trim()).filter(Boolean);
          onAction({
            id: `atlas-themes-${Date.now()}`,
            label: 'DECLARE ATLAS THEMES',
            effect: `Actualiza los temas declarados del objeto ${atlasObjectId}.`,
            target: atlasObjectId,
            endpoint: '/api/root/atlas',
            method: 'POST',
            body: { objectId: atlasObjectId, themes },
          });
        }}>
          <label>STUDIO OBJECT ID<input value={atlasObjectId} onChange={(event) => setAtlasObjectId(event.target.value)} required /></label>
          <label>THEMES<input value={atlasThemeInput} onChange={(event) => setAtlasThemeInput(event.target.value)} placeholder="cultural, memetic, audio" /></label>
          <button type="submit" disabled={!atlasObjectId.trim()}>REVIEW THEMES</button>
        </form>
      </article>

      <div className="rs-filter-row">{FILTERS.map((filter) => <button type="button" key={filter} className={active.includes(filter) ? 'active' : ''} onClick={() => setActive((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter])}>{filter}</button>)}</div>
      <EvidenceGraph nodes={filtered} edges={state.evidence.data.edges} onSelect={onSelect} />
      <div className="rs-stat-strip"><span><b>{filtered.length}</b>PERSISTED NODES</span><span><b>{state.evidence.data.edges.length}</b>PERSISTED EDGES</span><span><b>{state.evidence.data.entries.length + state.evidence.data.ledger.length}</b>EVIDENCE ENTRIES</span></div>
      <article><header>QUERY NEURAL GRAPH</header><form className="rs-form" onSubmit={(event) => { event.preventDefault(); void search(); }}><label>QUERY<input value={query} onChange={(event) => setQuery(event.target.value)} /></label><button type="submit" disabled={searching}>{searching ? 'QUERYING' : 'QUERY'}</button></form>{error ? <div className="rs-source-warning">{error}</div> : null}{result ? <pre className="rs-result">{JSON.stringify(result, null, 2)}</pre> : null}</article>
      <article>
        <header>EVIDENCE INTAKE</header>
        <form className="rs-form" onSubmit={(event) => {
          event.preventDefault();
          if (!intakeContent.trim()) return;
          onAction({
            id: `evidence-intake-${Date.now()}`,
            label: 'EVIDENCE INTAKE',
            effect: `Registra "${intakeTitle || 'root.evidence'}" con evento epistémico, nodo de grafo y auditoría.`,
            target: 'root_evidence_entries',
            endpoint: '/api/root/evidence',
            method: 'POST',
            body: { title: intakeTitle || undefined, content: intakeContent, evidenceType: intakeType, source: 'root_console' },
          });
        }}>
          <label>TÍTULO<input value={intakeTitle} onChange={(event) => setIntakeTitle(event.target.value)} placeholder="root.evidence" /></label>
          <label>TIPO<select value={intakeType} onChange={(event) => setIntakeType(event.target.value)}>
            <option value="root_evidence">root_evidence</option>
            <option value="signal">signal</option>
            <option value="hypothesis">hypothesis</option>
            <option value="report">report</option>
            <option value="atlas">atlas</option>
            <option value="moph">moph</option>
          </select></label>
          <label>CONTENIDO<textarea value={intakeContent} onChange={(event) => setIntakeContent(event.target.value)} rows={4} required /></label>
          <button type="submit" disabled={!intakeContent.trim()}>PREPARAR REGISTRO</button>
        </form>
      </article>
    </section>
  );
}

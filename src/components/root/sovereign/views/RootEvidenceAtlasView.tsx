'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from '../sovereignTypes';
import { EvidenceGraph } from '../visual/EvidenceGraph';

const FILTERS = ['evidence','signal','hypothesis','prediction','outcome','report','atlas','moph','world_vector','amv'];
const OBJECT_CLASSES = ['music','article','social_post','website','institution','company','ai_response','historical_event','cultural_signal','person','organization','movement','other'];
const CASE_STATUSES = ['REGISTERED','OBSERVING','WAITING_OUTCOME','CLOSED','UNVERIFIABLE','ARCHIVED'];
const RELATIONS = ['SUPPORTS','CONTRADICTS','CONTEXTUALIZES','VERIFIES_OUTCOME','DOCUMENTS_INTERVENTION','GOVERNS','RECORDS_ACCESS'];

type BankCase = {
  id: string;
  case_code: string;
  entity_id: string | null;
  object_id: string;
  object_class: string;
  title: string;
  manifestation: string | null;
  cohort: string;
  prospective: boolean;
  status: string;
  opened_at: string;
  closed_at: string | null;
  t0_cutoff: string;
  phase_status: Record<string, unknown>;
  fields_documented: string[];
  missing_fields: string[];
  prediction_run_id: string | null;
  model_key: string | null;
  model_version: number | null;
  consent_required: boolean;
  consent_evidence_id: string | null;
  evidenceLinks: Array<Record<string, unknown>>;
  externalEvidence: Array<Record<string, unknown>>;
  predictionAtT0: {
    value: number | null;
    lowerBound: number | null;
    upperBound: number | null;
    confidence: number | null;
    timestamp: string | null;
    calibrationStatus: string | null;
    modelVersion: number | null;
  } | null;
  observedOutcome: {
    value: number | null;
    timestamp: string | null;
    sourceQuality: string | null;
    sourceRef: string | null;
  } | null;
  predictionError: number | null;
  absoluteError: number | null;
  squaredError: number | null;
  learningEvents: Array<Record<string, unknown>>;
};

type BankResponse = {
  ok: boolean;
  bank?: {
    cases: BankCase[];
    cohorts: string[];
    objectClasses: string[];
    counts: { total: number; closed: number; prospective: number };
    warnings?: string[];
  };
  error?: string;
  details?: string;
};

function score(value: number | null) {
  return value === null ? '—' : value.toFixed(3);
}

export function RootEvidenceAtlasView({ state, onSelect, onAction }: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
  onAction: (action: RootActionRequest) => void;
}) {
  const [active, setActive] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [intakeTitle, setIntakeTitle] = useState('');
  const [intakeContent, setIntakeContent] = useState('');
  const [intakeType, setIntakeType] = useState('root_evidence');

  const [bankCases, setBankCases] = useState<BankCase[]>([]);
  const [bankCohorts, setBankCohorts] = useState<string[]>([]);
  const [bankClasses, setBankClasses] = useState<string[]>([]);
  const [bankCounts, setBankCounts] = useState({ total: 0, closed: 0, prospective: 0 });
  const [bankWarnings, setBankWarnings] = useState<string[]>([]);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [filterCohort, setFilterCohort] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [caseCode, setCaseCode] = useState('');
  const [objectId, setObjectId] = useState('');
  const [objectClass, setObjectClass] = useState('article');
  const [caseTitle, setCaseTitle] = useState('');
  const [manifestation, setManifestation] = useState('');
  const [cohort, setCohort] = useState('editorial');
  const [prospective, setProspective] = useState(true);
  const [openedAt, setOpenedAt] = useState('');
  const [t0Cutoff, setT0Cutoff] = useState('');
  const [consentEvidenceId, setConsentEvidenceId] = useState('');

  const [linkCaseId, setLinkCaseId] = useState('');
  const [linkEvidenceSource, setLinkEvidenceSource] = useState('root_evidence_entries');
  const [linkEvidenceId, setLinkEvidenceId] = useState('');
  const [linkRelation, setLinkRelation] = useState('CONTEXTUALIZES');
  const [linkNote, setLinkNote] = useState('');

  const filtered = active.length
    ? state.evidence.data.nodes.filter((node) => active.includes(node.type) || active.includes(node.source.replace('sfi_', '')))
    : state.evidence.data.nodes;

  const loadBank = useCallback(async (signal?: AbortSignal) => {
    setBankLoading(true);
    setBankError(null);
    try {
      const params = new URLSearchParams();
      if (filterCohort) params.set('cohort', filterCohort);
      if (filterClass) params.set('objectClass', filterClass);
      if (filterStatus) params.set('status', filterStatus);
      const suffix = params.size ? `?${params.toString()}` : '';
      const response = await fetch(`/api/root/reference-bank${suffix}`, {
        cache: 'no-store',
        credentials: 'include',
        signal,
      });
      const body = await response.json().catch(() => null) as BankResponse | null;
      if (!response.ok || !body?.ok || !body.bank) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setBankCases(body.bank.cases ?? []);
      setBankCohorts(body.bank.cohorts ?? []);
      setBankClasses(body.bank.objectClasses ?? []);
      setBankCounts(body.bank.counts ?? { total: 0, closed: 0, prospective: 0 });
      setBankWarnings(body.bank.warnings ?? []);
    } catch (cause) {
      if (!signal?.aborted) setBankError(cause instanceof Error ? cause.message : 'reference_bank_query_failed');
    } finally {
      if (!signal?.aborted) setBankLoading(false);
    }
  }, [filterCohort, filterClass, filterStatus]);

  useEffect(() => {
    const controller = new AbortController();
    void loadBank(controller.signal);
    return () => controller.abort();
  }, [loadBank]);

  async function search() {
    setSearching(true);
    setError(null);
    try {
      const response = await fetch('/api/root/agentic/neural-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters: active.length ? active : FILTERS, generateInterpretation: false }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setResult(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'graph_query_failed');
    } finally {
      setSearching(false);
    }
  }

  const selectCase = (item: BankCase) => onSelect({
    kind: 'reference case',
    id: item.id,
    title: `${item.case_code} · ${item.title}`,
    source: 'sfi_reference_cases + explicit evidence links',
    observedAt: item.closed_at ?? item.opened_at,
    confidence: item.predictionAtT0?.confidence ?? null,
    evidenceIds: item.evidenceLinks.map((link) => String(link.evidence_id ?? '')).filter(Boolean),
    warning: item.missing_fields.length ? `MISSING:${item.missing_fields.join(',')}` : null,
    data: item as unknown as Record<string, unknown>,
  });

  return (
    <section className="rs-view">
      <div className="rs-view-title">
        <span>EVIDENCE / ATLAS</span>
        <h1>REFERENCE BANK + EVIDENCE GRAPH</h1>
        <p>Casos observables, T0, outcomes y relaciones explícitas. Los eventos de acceso permanecen como RECORDS_ACCESS.</p>
      </div>

      <article>
        <header>SFI REFERENCE BANK</header>
        <div className="rs-stat-strip">
          <span><b>{bankLoading ? '—' : bankCounts.total}</b>CASES</span>
          <span><b>{bankLoading ? '—' : bankCounts.closed}</b>CLOSED / 30</span>
          <span><b>{bankLoading ? '—' : bankCounts.prospective}</b>PROSPECTIVE</span>
        </div>
        <div className="rs-filter-row">
          <select value={filterCohort} onChange={(event) => setFilterCohort(event.target.value)} aria-label="Reference Bank cohort">
            <option value="">ALL COHORTS</option>
            {bankCohorts.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={filterClass} onChange={(event) => setFilterClass(event.target.value)} aria-label="Reference Bank object class">
            <option value="">ALL CLASSES</option>
            {bankClasses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Reference Bank status">
            <option value="">ALL STATES</option>
            {CASE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => void loadBank()} disabled={bankLoading}>{bankLoading ? 'LOADING' : 'REFRESH BANK'}</button>
          <button type="button" onClick={() => onAction({
            id: `reference-bootstrap-${Date.now()}`,
            label: 'BOOTSTRAP STUDIO REFERENCE CASES',
            effect: 'Registra únicamente objetos que ya tienen trazas Studio o runs persistidos. No crea evidencia ni outcomes sintéticos.',
            target: 'persisted_studio_sources',
            endpoint: '/api/root/reference-bank',
            method: 'POST',
            body: { operation: 'bootstrap_studio' },
          })}>REVIEW STUDIO BOOTSTRAP</button>
        </div>
        {bankError ? <div className="rs-source-warning">REFERENCE BANK · {bankError}</div> : null}
        {bankWarnings.length ? <div className="rs-source-warning">REFERENCE BANK DEGRADED · {bankWarnings.join(' | ')}</div> : null}
        <div className="rs-card-list horizontal">
          {bankCases.length ? bankCases.map((item) => (
            <button type="button" key={item.id} onClick={() => selectCase(item)}>
              <span>{item.status} · {item.object_class}</span>
              <strong>{item.case_code} · {item.title}</strong>
              <em>T0 {String(item.t0_cutoff).slice(0, 16)} · P {score(item.predictionAtT0?.value ?? null)} · O {score(item.observedOutcome?.value ?? null)} · E {score(item.absoluteError)}</em>
            </button>
          )) : <div className="rs-empty"><b>{bankLoading ? 'LOADING' : 'SIN CASOS NORMALIZADOS'}</b></div>}
        </div>
      </article>

      <article>
        <header>CASE INTAKE</header>
        <p className="rs-view-note">Registra Medium, REM618, KXTXR, Instagram, TikTok, sitios, IA, compañías o eventos históricos. Un caso retrospectivo debe fijar un T0 anterior al outcome.</p>
        <form className="rs-form" onSubmit={(event) => {
          event.preventDefault();
          if (!caseCode.trim() || !objectId.trim() || !caseTitle.trim() || !cohort.trim()) return;
          const timestamp = new Date().toISOString();
          onAction({
            id: `reference-case-${Date.now()}`,
            label: 'REGISTER REFERENCE CASE',
            effect: `Registra ${caseCode} como caso ${prospective ? 'prospectivo' : 'retrospectivo'}, sin fabricar evidencia ni outcome.`,
            target: caseCode,
            endpoint: '/api/root/reference-bank',
            method: 'POST',
            body: {
              operation: 'register',
              caseCode,
              objectId,
              objectClass,
              title: caseTitle,
              manifestation: manifestation || null,
              cohort,
              prospective,
              status: 'REGISTERED',
              openedAt: openedAt || timestamp,
              t0Cutoff: t0Cutoff || openedAt || timestamp,
              consentRequired: ['person','organization','movement'].includes(objectClass),
              consentEvidenceId: consentEvidenceId || null,
              phaseStatus: {
                phase0: 'READY',
                phase1: 'MISSING',
                phase2: 'MISSING',
                phase3: 'GATED',
                phase4: 'NOT_EXECUTED',
                phase5: 'PENDING',
                phase6: 'NOT_CALIBRATED',
              },
              fieldsDocumented: [],
              missingFields: ['phase1', 'phase2', 'outcome'],
            },
          });
        }}>
          <label>CASE CODE<input value={caseCode} onChange={(event) => setCaseCode(event.target.value)} placeholder="MEDIUM-WS-001" required /></label>
          <label>OBJECT ID<input value={objectId} onChange={(event) => setObjectId(event.target.value)} placeholder="stable object/entity reference" required /></label>
          <label>OBJECT CLASS<select value={objectClass} onChange={(event) => setObjectClass(event.target.value)}>{OBJECT_CLASSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>TITLE<input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} required /></label>
          <label>MANIFESTATION<input value={manifestation} onChange={(event) => setManifestation(event.target.value)} placeholder="Medium publication, Instagram reel, site release" /></label>
          <label>COHORT<input value={cohort} onChange={(event) => setCohort(event.target.value)} placeholder="editorial, social, system, ai-response" required /></label>
          <label>OPENED AT<input value={openedAt} onChange={(event) => setOpenedAt(event.target.value)} placeholder="ISO timestamp; blank = now" /></label>
          <label>T0 CUTOFF<input value={t0Cutoff} onChange={(event) => setT0Cutoff(event.target.value)} placeholder="information cutoff before outcome" /></label>
          <label>MODE<select value={prospective ? 'prospective' : 'retrospective'} onChange={(event) => setProspective(event.target.value === 'prospective')}><option value="prospective">prospective</option><option value="retrospective">retrospective / backtest</option></select></label>
          <label>CONSENT EVIDENCE ID<input value={consentEvidenceId} onChange={(event) => setConsentEvidenceId(event.target.value)} placeholder="required for person/org/movement" /></label>
          <button type="submit" disabled={!caseCode.trim() || !objectId.trim() || !caseTitle.trim()}>REVIEW CASE</button>
        </form>
      </article>

      <article>
        <header>EXPLICIT EVIDENCE LINKAGE</header>
        <form className="rs-form" onSubmit={(event) => {
          event.preventDefault();
          if (!linkCaseId.trim() || !linkEvidenceSource.trim() || !linkEvidenceId.trim()) return;
          onAction({
            id: `case-evidence-link-${Date.now()}`,
            label: 'LINK CASE EVIDENCE',
            effect: `Vincula ${linkEvidenceSource}/${linkEvidenceId} como ${linkRelation}.`,
            target: linkCaseId,
            endpoint: '/api/root/reference-bank',
            method: 'POST',
            body: {
              operation: 'link_evidence',
              caseId: linkCaseId,
              evidenceSource: linkEvidenceSource,
              evidenceId: linkEvidenceId,
              relationType: linkRelation,
              note: linkNote || null,
            },
          });
        }}>
          <label>REFERENCE CASE UUID<input value={linkCaseId} onChange={(event) => setLinkCaseId(event.target.value)} required /></label>
          <label>EVIDENCE SOURCE<input value={linkEvidenceSource} onChange={(event) => setLinkEvidenceSource(event.target.value)} required /></label>
          <label>EVIDENCE ID<input value={linkEvidenceId} onChange={(event) => setLinkEvidenceId(event.target.value)} required /></label>
          <label>RELATION<select value={linkRelation} onChange={(event) => setLinkRelation(event.target.value)}>{RELATIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>NOTE<input value={linkNote} onChange={(event) => setLinkNote(event.target.value)} /></label>
          <button type="submit" disabled={!linkCaseId.trim() || !linkEvidenceId.trim()}>REVIEW LINK</button>
        </form>
      </article>

      <div className="rs-filter-row">{FILTERS.map((filter) => <button type="button" key={filter} className={active.includes(filter) ? 'active' : ''} onClick={() => setActive((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter])}>{filter}</button>)}</div>
      <EvidenceGraph nodes={filtered} edges={state.evidence.data.edges} onSelect={onSelect} />
      <div className="rs-stat-strip"><span><b>{filtered.length}</b>PERSISTED NODES</span><span><b>{state.evidence.data.edges.length}</b>PERSISTED EDGES</span><span><b>{state.evidence.data.entries.length + state.evidence.data.ledger.length}</b>EVIDENCE ENTRIES</span></div>

      <article>
        <header>QUERY NEURAL GRAPH</header>
        <form className="rs-form" onSubmit={(event) => { event.preventDefault(); void search(); }}>
          <label>QUERY<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <button type="submit" disabled={searching}>{searching ? 'QUERYING' : 'QUERY'}</button>
        </form>
        {error ? <div className="rs-source-warning">{error}</div> : null}
        {result ? <pre className="rs-result">{JSON.stringify(result, null, 2)}</pre> : null}
      </article>

      <article>
        <header>EVIDENCE INTAKE</header>
        <form className="rs-form" onSubmit={(event) => {
          event.preventDefault();
          if (!intakeContent.trim()) return;
          onAction({
            id: `evidence-intake-${Date.now()}`,
            label: 'EVIDENCE INTAKE',
            effect: `Registra "${intakeTitle || 'root.evidence'}" con evento epistémico, nodo de grafo y auditoría. Después debe vincularse al caso con una relación explícita.`,
            target: 'root_evidence_entries',
            endpoint: '/api/root/evidence',
            method: 'POST',
            body: { title: intakeTitle || undefined, content: intakeContent, evidenceType: intakeType, source: 'root_console' },
          });
        }}>
          <label>TITLE<input value={intakeTitle} onChange={(event) => setIntakeTitle(event.target.value)} placeholder="root.evidence" /></label>
          <label>TYPE<select value={intakeType} onChange={(event) => setIntakeType(event.target.value)}><option value="root_evidence">root_evidence</option><option value="signal">signal</option><option value="hypothesis">hypothesis</option><option value="report">report</option><option value="atlas">atlas</option><option value="moph">moph</option></select></label>
          <label>CONTENT<textarea value={intakeContent} onChange={(event) => setIntakeContent(event.target.value)} rows={4} required /></label>
          <button type="submit" disabled={!intakeContent.trim()}>REVIEW RECORD</button>
        </form>
      </article>
    </section>
  );
}

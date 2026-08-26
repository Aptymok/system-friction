'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import './MethodLabResearchReview.css';

export type MethodLabFindingView = {
  id: string;
  title: string;
  state: string;
  summary: string;
  evidenceRefs: string[];
};

export type MethodLabResearchObjectView = {
  objectId: string;
  objectClass: string;
  title: string;
  publicTitle: string;
  objective: string;
  method: string;
  state: string;
  epistemicState: string;
  returnState: string;
  publicationState: string;
  summary: string;
  publicSummary: string;
  confidence: number | null;
  evidenceRefs: string[];
  findings: MethodLabFindingView[];
  publicFindings: MethodLabFindingView[];
  metrics: Record<string, string | number | boolean | null>;
  publicMetrics: Record<string, string | number | boolean | null>;
  limitations: string[];
  publicLimitations: string[];
  lineage: string[];
  version: string;
  source: string;
  updatedAt: string | null;
};

export type MethodLabResearchStateView = {
  generatedAt: string;
  sourceOfTruth: string;
  publicationRule: string;
  transportRule: string;
  objects: MethodLabResearchObjectView[];
  warnings: string[];
};

type JsonRecord = Record<string, unknown>;

async function postJson(url: string, body: JsonRecord) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as JsonRecord;
  if (!response.ok || payload.ok === false) throw new Error(String(payload.details ?? payload.error ?? `HTTP_${response.status}`));
  return payload;
}

const FLOW = ['OBJECT', 'OBSERVE', 'MODEL', 'FRICTION', 'GOVERNANCE', 'INTERVENTION', 'RETURN', 'PUBLIC TRACE'];

function metricPreview(object: MethodLabResearchObjectView) {
  return Object.entries(object.metrics).slice(0, 4);
}

function objectProgress(object: MethodLabResearchObjectView) {
  const state = object.state.toUpperCase();
  if (object.publicationState === 'RELEASED') return 8;
  if (['HUB_PUBLISHED', 'RELEASE_CANDIDATE'].includes(object.publicationState)) return 8;
  if (object.publicationState === 'PROMOTION_REQUESTED') return 7;
  if (object.returnState === 'VERIFIED' || object.returnState === 'OBSERVED') return 7;
  if (state.includes('INTERVENTION')) return 6;
  if (state.includes('FINDING')) return 5;
  if (state.includes('MODEL')) return 3;
  if (['OBSERVED', 'EMPIRICAL_OBSERVATION_COMPLETE'].includes(state)) return 2;
  return 1;
}

export function MethodLabResearchReview({ research }: { research: MethodLabResearchStateView }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<JsonRecord | null>(null);
  const [selectedId, setSelectedId] = useState(research.objects.find((item) => item.objectClass === 'AUDIT')?.objectId ?? research.objects[0]?.objectId ?? '');
  const [draft, setDraft] = useState({ objectId: '', objectClass: 'AUDIT', title: '', method: 'SFI_AUDIT', summary: '' });

  const selected = useMemo(() => research.objects.find((item) => item.objectId === selectedId) ?? research.objects[0] ?? null, [research.objects, selectedId]);
  async function execute(label: string, action: () => Promise<JsonRecord>) {
    setBusy(label); setMessage(''); setResult(null);
    try { const payload = await action(); setResult(payload); setMessage(`${label}: OK`); router.refresh(); }
    catch (error) { setMessage(`${label}: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(null); }
  }

  const audits = research.objects.filter((item) => item.objectClass === 'AUDIT').length;
  const ready = research.objects.filter((item) => item.publicationState === 'PUBLIC_DERIVATIVE_READY').length;
  const promotion = research.objects.filter((item) => item.publicationState === 'PROMOTION_REQUESTED').length;

  return (
    <section className="mlr-shell">
      <div className="mlr-head">
        <div>
          <span>TOTAL REVIEW LABS REPORTING</span>
          <h2>Research objects are operated here. The Hub is a governed projection.</h2>
        </div>
        <p>{research.publicationRule}</p>
      </div>

      <div className="mlr-dashboard">
        <div className="mlr-stat"><span>OBJECTS</span><strong>{research.objects.length}</strong><small>{research.sourceOfTruth}</small></div>
        <div className="mlr-stat"><span>AUDITS</span><strong>{audits}</strong><small>bounded external objects</small></div>
        <div className="mlr-stat"><span>PUBLIC READY</span><strong>{ready}</strong><small>not yet promoted</small></div>
        <div className="mlr-stat"><span>PROMOTION</span><strong>{promotion}</strong><small>ROOT decision required</small></div>
      </div>

      {selected ? (
        <div className="mlr-process">
          <header>
            <div><span>{selected.objectClass} · {selected.objectId}</span><h3>{selected.title}</h3></div>
            <div className="mlr-badges"><b>{selected.epistemicState}</b><b>{selected.publicationState}</b><b>RETURN {selected.returnState}</b></div>
          </header>
          <div className="mlr-flow">
            {FLOW.map((stage, index) => <div key={stage} data-active={index < objectProgress(selected)}><i>{String(index + 1).padStart(2, '0')}</i><span>{stage}</span></div>)}
          </div>
          <div className="mlr-review-grid">
            <article>
              <span>OBJECT / METHOD</span>
              <p>{selected.objective || selected.summary}</p>
              <dl><div><dt>METHOD</dt><dd>{selected.method}</dd></div><div><dt>STATE</dt><dd>{selected.state}</dd></div><div><dt>VERSION</dt><dd>{selected.version}</dd></div><div><dt>SOURCE</dt><dd>{selected.source}</dd></div></dl>
            </article>
            <article>
              <span>FINDINGS</span>
              <div className="mlr-findings">{selected.findings.length ? selected.findings.map((finding) => <div key={finding.id}><b>{finding.id}</b><em>{finding.state}</em><p>{finding.title}</p></div>) : <p>No findings registered.</p>}</div>
            </article>
            <article>
              <span>METRICS</span>
              <dl>{metricPreview(selected).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>)}</dl>
              <small>{selected.evidenceRefs.length} evidence refs · {selected.lineage.length} lineage nodes</small>
            </article>
            <article>
              <span>REVIEW / REPORTING</span>
              <p>{selected.publicSummary || selected.summary}</p>
              <div className="mlr-actions">
                <button disabled={Boolean(busy)} onClick={() => execute(`REPORT ${selected.objectId}`, () => postJson('/api/root/method-lab/research', { operation: 'report', objectId: selected.objectId }))}>GENERATE REVIEW PACKAGE</button>
                <button className="mlr-promote" disabled={Boolean(busy) || !['PUBLIC_DERIVATIVE_READY', 'PROMOTION_REQUESTED'].includes(selected.publicationState)} onClick={() => execute(`PROMOTE ${selected.objectId}`, () => postJson('/api/root/method-lab/research', { operation: 'promote', objectId: selected.objectId }))}>REQUEST HUB PROMOTION</button>
              </div>
              <small>No GitHub or Zenodo mutation occurs from this screen. ROOT authorizes; an external agent transports the exact package.</small>
            </article>
          </div>
        </div>
      ) : null}

      <div className="mlr-object-grid">
        {research.objects.map((object) => (
          <button key={object.objectId} data-selected={object.objectId === selected?.objectId} onClick={() => setSelectedId(object.objectId)}>
            <span>{object.objectClass}</span><b>{object.objectId}</b><p>{object.title}</p><small>{object.state} · {object.publicationState}</small>
          </button>
        ))}
      </div>

      <div className="mlr-agent-grid">
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!draft.objectId.trim() || !draft.title.trim()) return;
          void execute(`REGISTER ${draft.objectId}`, () => postJson('/api/root/method-lab/research', {
            operation: 'upsert',
            object: {
              ...draft,
              publicTitle: draft.title,
              objective: draft.summary,
              state: 'CAPTURED',
              epistemicState: 'DERIVED',
              returnState: 'PENDING',
              publicationState: 'PRIVATE',
              publicSummary: draft.summary,
              confidence: null,
              evidenceRefs: [], findings: [], publicFindings: [], metrics: {}, publicMetrics: {}, limitations: [], publicLimitations: [], lineage: ['METHOD_LAB'], version: '0.1.0', source: 'METHOD_LAB', updatedAt: null,
            },
          }));
        }}>
          <span>REGISTER OBJECT</span>
          <input placeholder="SFI-AUDIT-0002" value={draft.objectId} onChange={(event) => setDraft({ ...draft, objectId: event.target.value.toUpperCase() })} />
          <select value={draft.objectClass} onChange={(event) => setDraft({ ...draft, objectClass: event.target.value })}><option>AUDIT</option><option>RESEARCH</option><option>CASE</option><option>SPECIFICATION</option><option>DERIVATIVE</option></select>
          <input placeholder="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <input placeholder="Method / protocol" value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })} />
          <textarea placeholder="Bounded object / objective" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
          <button disabled={Boolean(busy) || !draft.objectId.trim() || !draft.title.trim()}>PERSIST IN METHOD LAB</button>
        </form>

        <div className="mlr-agent-contract">
          <span>EXTERNAL AGENT CONTRACT</span>
          <h3>ChatGPT · Gemini · Claude</h3>
          <p>{research.transportRule}</p>
          <code>POST /api/external/v1/lab</code>
          <pre>{`{
  "operation": "persist",
  "commandId": "research:SFI-AUDIT-0002:v0.1.0",
  "title": "Research object snapshot",
  "content": "Bounded update",
  "metadata": {
    "kind": "METHOD_LAB_RESEARCH_OBJECT",
    "researchObject": { "objectId": "SFI-AUDIT-0002", "...": "..." }
  }
}`}</pre>
          <p>Use <code>{`{"operation":"report","objectId":"SFI-AUDIT-0001"}`}</code> to retrieve the current review and publication package.</p>
        </div>
      </div>

      {research.warnings.length ? <div className="mlr-warnings">{research.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
      {message ? <div className="mlr-toast" data-error={!message.endsWith(': OK')}>{message}</div> : null}
      {result ? <details className="mlr-result"><summary>REVIEW OUTPUT</summary><pre>{JSON.stringify(result, null, 2)}</pre></details> : null}
    </section>
  );
}

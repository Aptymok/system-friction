'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import './MethodLabResearchReview.css';

export type ResearchEvidenceInventoryItem = {
  id: string;
  label: string;
  kind: string;
  source: string;
  observedAt: string | null;
};

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

/** Viewer-only resolution: the presence of a reference does not prove its target exists. */
function referencedResearchId(ref: string, objects: MethodLabResearchObjectView[]): string | null {
  const candidate = ref.startsWith('research:') ? ref.slice('research:'.length) : ref.startsWith('object:') ? ref.slice('object:'.length) : ref;
  return objects.some(object => object.objectId === candidate) ? candidate : null;
}

function ReferenceList({ label, refs, objects, evidenceInventory, onSelect }: {
  label: string;
  refs: readonly string[];
  objects: MethodLabResearchObjectView[];
  evidenceInventory: readonly ResearchEvidenceInventoryItem[];
  onSelect: (id: string) => void;
}) {
  return <section className="mlr-reference-section">
    <h4>{label} <small>{refs.length} registradas</small></h4>
    {refs.length === 0 ? <p>No hay referencias registradas en este campo.</p> : (
      <ul className="mlr-reference-list">
        {[...new Set(refs)].map(ref => {
          const target = referencedResearchId(ref, objects);
          const evidenceKey = ref.startsWith('evidence:') ? ref.slice('evidence:'.length) : ref;
          const inventoryItem = evidenceInventory.find(item => item.id === evidenceKey);
          return <li key={ref}>
            {target ? (
              <button type="button" onClick={() => onSelect(target)} title="Abrir el objeto vinculado en el índice de Method Lab">{ref} · abrir objeto</button>
            ) : <code>{ref}</code>}
            <small>{target ? 'OBJETO EN ÍNDICE · no verifica evidencia externa' : inventoryItem ? 'EVIDENCIA LOCALIZADA EN INVENTARIO PARCIAL · sin validar su contenido' : 'REFERENCIA REGISTRADA · no localizada en el inventario parcial'}</small>
            {inventoryItem ? <small>{inventoryItem.label} · {inventoryItem.kind} · {inventoryItem.source} · {inventoryItem.observedAt ?? 'fecha desconocida'}</small> : null}
          </li>;
        })}
      </ul>
    )}
  </section>;
}

function metricPreview(object: MethodLabResearchObjectView) {
  return Object.entries(object.metrics).slice(0, 4);
}


export function MethodLabResearchReview({ research, evidenceInventory = [] }: { research: MethodLabResearchStateView; evidenceInventory?: readonly ResearchEvidenceInventoryItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<JsonRecord | null>(null);
  const [selectedId, setSelectedId] = useState(research.objects.find((item) => item.objectClass === 'RESEARCH')?.objectId ?? research.objects[0]?.objectId ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [publicationFilter, setPublicationFilter] = useState<'ALL'|'PUBLIC'|'DEVELOPMENT'>('ALL');
  const [draft, setDraft] = useState({ objectId: '', objectClass: 'AUDIT', title: '', method: 'SFI_AUDIT', summary: '' });

  const selected = useMemo(() => research.objects.find((item) => item.objectId === selectedId) ?? research.objects[0] ?? null, [research.objects, selectedId]);
  async function execute(label: string, action: () => Promise<JsonRecord>) {
    setBusy(label); setMessage(''); setResult(null);
    try { const payload = await action(); setResult(payload); setMessage(`${label}: OK`); router.refresh(); }
    catch (error) { setMessage(`${label}: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(null); }
  }

  const visibleObjects = research.objects.filter((object) => {
    const query = searchTerm.trim().toLowerCase();
    const published = ['HUB_PUBLISHED','RELEASE_CANDIDATE','RELEASED'].includes(object.publicationState);
    return (publicationFilter === 'ALL' || (publicationFilter === 'PUBLIC' ? published : !published))
      && (!query || [object.title, object.objectId, object.method, object.objectClass, object.state].join(' ').toLowerCase().includes(query));
  });
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

      <div className="mlr-library-controls" style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',margin:'14px 0'}}>
        <label htmlFor="mlr-search" style={{fontSize:12,color:'#b0cadf'}}>Buscar investigación</label>
        <input id="mlr-search" value={searchTerm} onChange={event=>setSearchTerm(event.target.value)} placeholder="Título, método, identificador..." style={{flex:'1 1 260px',padding:10,background:'#071019',color:'#e7f2f9',border:'1px solid #35566c'}} />
        <select aria-label="Filtrar estado de publicación" value={publicationFilter} onChange={event=>setPublicationFilter(event.target.value as typeof publicationFilter)} style={{padding:10,background:'#071019',color:'#e7f2f9',border:'1px solid #35566c'}}>
          <option value="ALL">Todas</option><option value="PUBLIC">Publicadas</option><option value="DEVELOPMENT">En desarrollo / revisión</option>
        </select>
        <small style={{color:'#86a5ba'}}>{visibleObjects.length} investigaciones visibles</small>
      </div>
      <div className="mlr-object-grid">
        {visibleObjects.map((object) => (
          <button key={object.objectId} data-selected={object.objectId === selected?.objectId} onClick={() => setSelectedId(object.objectId)}>
            <span>{object.objectClass}</span><b>{object.objectId}</b><p>{object.title}</p><small>{object.state} · {object.publicationState}</small>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mlr-process">
          <header>
            <div><span>{selected.objectClass} · {selected.objectId}</span><h3>{selected.title}</h3></div>
            <div className="mlr-badges"><b>{selected.epistemicState}</b><b>{selected.publicationState}</b><b>RETURN {selected.returnState}</b></div>
          </header>
          <p style={{fontSize:11,color:'#94adbc',margin:'14px 0 0'}}>Secuencia metodológica de referencia; ninguna etapa se da por ejecutada o verificada por el nombre del estado.</p>
          <div className="mlr-flow">
            {FLOW.map((stage, index) => <div key={stage} data-active={false}><i>{String(index + 1).padStart(2, '0')}</i><span>{stage}</span></div>)}
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
          <details className="mlr-trace-panel" open>
            <summary>Expediente de trazabilidad · evidencia y vínculos</summary>
            <p>Vista de solo lectura del registro institucional. Una referencia no demuestra que su fuente exista, sea accesible o respalde una afirmación. No se ejecutan experimentos ni se publica información desde este panel.</p>
            <div className="mlr-trace-meta">
              <span>IDENTIDAD: {selected.objectId}</span>
              <span>VERSIÓN: {selected.version}</span>
              <span>ESTADO EPISTÉMICO: {selected.epistemicState}</span>
              <span>RETURN: {selected.returnState}</span>
              <span>ÚLTIMO REGISTRO: {selected.updatedAt ?? 'NO CONSTA'}</span>
            </div>
            <div className="mlr-trace-columns">
              <ReferenceList label="Evidencias citadas por la investigación" refs={selected.evidenceRefs} objects={research.objects} evidenceInventory={evidenceInventory} onSelect={setSelectedId} />
              <ReferenceList label="Genealogía y relaciones declaradas" refs={selected.lineage} objects={research.objects} evidenceInventory={evidenceInventory} onSelect={setSelectedId} />
            </div>
            <h4>Hallazgos y vínculo con su evidencia</h4>
            {selected.findings.length === 0 ? <p>Este registro no contiene hallazgos individualizados. No debe inferirse que no existen en otros expedientes.</p> : (
              <div className="mlr-finding-traces">{selected.findings.map(finding => (
                <article key={finding.id}>
                  <div><strong>{finding.id} · {finding.title}</strong><span>{finding.state}</span></div>
                  <p>{finding.summary || 'Sin descripción registrada.'}</p>
                  <ReferenceList label="Fuentes asociadas al hallazgo" refs={finding.evidenceRefs} objects={research.objects} evidenceInventory={evidenceInventory} onSelect={setSelectedId} />
                </article>
              ))}</div>
            )}
            <div className="mlr-trace-boundary">
              <strong>Pasaporte de Realidad · cobertura documental</strong>
              <p>T0′, observación, inferencia, autoridad, perturbación, RETURN, contraste, integración y T1′ solo pueden cerrarse con registros temporales y evidencia propios. Este índice muestra el estado disponible; no rellena etapas ausentes.</p>
              <p>DOI: NO VERIFICADO EN ESTE REGISTRO · Texto completo y anexos: NO VINCULADOS AUTOMÁTICAMENTE · Integridad de archivos: NO VALIDADA AQUÍ.</p>
            </div>
          </details>
        </div>
      ) : null}

      <details className="mlr-new-research" style={{marginTop:18}}>
        <summary style={{cursor:'pointer',padding:'14px 16px',border:'1px solid rgba(105,158,202,.25)',color:'#c5ddec'}}>Administración avanzada · registrar o actualizar una investigación</summary>
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
          <p>Use <code>{`{"operation":"report","objectId":"<AUTHORIZED_OBJECT_ID>"}`}</code> to retrieve the current review and publication package.</p>
        </div>
      </div>

      </details>

      {research.warnings.length ? <div className="mlr-warnings">{research.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
      {message ? <div className="mlr-toast" data-error={!message.endsWith(': OK')}>{message}</div> : null}
      {result ? <details className="mlr-result"><summary>REVIEW OUTPUT</summary><pre>{JSON.stringify(result, null, 2)}</pre></details> : null}
    </section>
  );
}

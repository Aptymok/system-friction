'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import './MethodLabNativeHub.css';

type Protocol = {
  id: string;
  name: string;
  purpose: string;
  status: string;
  epistemicClass: string;
  runCount: number;
  lastRunAt: string | null;
  lastValidationLevel: string | null;
  missingDependencies: string[];
  warnings: string[];
};

type DecisionTransfer = {
  status: string;
  totalEvaluations: number;
  passCount: number;
  failCount: number;
  blockedCount: number;
  validationRule: string;
  authorityRule: string;
};

type LabState = {
  generatedAt: string;
  contractVersion: string;
  status: string;
  sharedPersistence: string;
  epistemicRule: string;
  promotionRule: string;
  protocols: Protocol[];
  decisionTransfer: DecisionTransfer;
  warnings: string[];
};

type Session = {
  id: string;
  sessionKey: string;
  title: string;
  objective: string;
  condition: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  eventCount: number;
  analysisCount: number;
};

type EvidenceOption = {
  id: string;
  label: string;
  kind: string;
  source: 'root_evidence_entries' | 'sfi_evidence_ledger';
  caseId: string | null;
  observedAt: string | null;
  claimBoundary: string | null;
};

type Props = {
  initialState: LabState;
  initialSessions: Session[];
  evidenceOptions: EvidenceOption[];
  evidenceWarnings: string[];
};

type JsonRecord = Record<string, unknown>;

async function postJson(url: string, body: JsonRecord) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as JsonRecord;
  if (!response.ok || payload.ok === false) {
    const detail = String(payload.details ?? payload.error ?? `HTTP_${response.status}`);
    throw new Error(detail);
  }
  return payload;
}

function formatTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function MethodLabNativeHub({ initialState, initialSessions, evidenceOptions, evidenceWarnings }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [result, setResult] = useState<JsonRecord | null>(null);
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [simulationProtocol, setSimulationProtocol] = useState<'sociotechnical_simulation' | 'economic_simulation'>('sociotechnical_simulation');
  const [newSession, setNewSession] = useState({ title: '', objective: '', condition: 'FOUNDER_TWIN' });
  const [eventDraft, setEventDraft] = useState({ sessionId: initialSessions.find((item) => item.status === 'OPEN')?.id ?? '', eventKind: 'OBSERVATION', provenance: 'FOUNDER_ORIGINATED', actorKey: 'FOUNDER', content: '' });
  const [interactionPrompts, setInteractionPrompts] = useState<Record<string, string>>({});
  const [founderReadings, setFounderReadings] = useState<Record<string, string>>({});

  const visibleEvidence = useMemo(() => {
    const q = evidenceSearch.trim().toLowerCase();
    if (!q) return evidenceOptions;
    return evidenceOptions.filter((item) => [item.label, item.kind, item.caseId ?? '', item.source].join(' ').toLowerCase().includes(q));
  }, [evidenceOptions, evidenceSearch]);

  async function execute(label: string, action: () => Promise<JsonRecord>) {
    setBusy(label);
    setMessage('');
    setResult(null);
    try {
      const payload = await action();
      setResult(payload);
      setMessage(`${label}: OK`);
      router.refresh();
    } catch (error) {
      setMessage(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(null);
    }
  }

  function toggleEvidence(id: string) {
    setSelectedEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const operational = initialState.protocols.filter((item) => item.status === 'OPERATIONAL').length;
  const gated = initialState.protocols.filter((item) => item.status === 'GATED').length;
  const degraded = initialState.protocols.filter((item) => item.status === 'DEGRADED').length;

  return (
    <main className="mlh-shell">
      <header className="mlh-topbar">
        <Link href="/root" className="mlh-brand">SFI.</Link>
        <div><span>METHOD LAB</span><b>{initialState.status}</b></div>
        <div><span>CONTRACT</span><b>{initialState.contractVersion}</b></div>
        <Link href="/root" className="mlh-return">RETURN TO ROOT ↖</Link>
      </header>

      <section className="mlh-hero">
        <div>
          <span className="mlh-kicker">PROTOCOL · EVIDENCE · RUN · RETURN · CONTRAST</span>
          <h1>Laboratorio operativo, sin confundir simulación con mundo.</h1>
          <p>{initialState.epistemicRule}</p>
        </div>
        <div className="mlh-metrics">
          <article><small>PROTOCOLS</small><strong>{initialState.protocols.length}</strong><span>{operational} operational</span></article>
          <article><small>GATED</small><strong>{gated}</strong><span>{degraded} degraded</span></article>
          <article><small>CRL SESSIONS</small><strong>{initialSessions.length}</strong><span>{initialSessions.filter((item) => item.status === 'CLOSED').length} closed</span></article>
          <article><small>DECISION TRANSFER</small><strong>{initialState.decisionTransfer.status}</strong><span>{initialState.decisionTransfer.totalEvaluations} evaluations</span></article>
        </div>
      </section>

      <section className="mlh-section">
        <div className="mlh-section-head"><div><span>01 / REGISTRY</span><h2>Instrumentos registrados</h2></div><p>{initialState.promotionRule}</p></div>
        <div className="mlh-protocol-grid">
          {initialState.protocols.map((protocol) => (
            <article className="mlh-card" data-state={protocol.status} key={protocol.id}>
              <div className="mlh-card-head"><span>{protocol.epistemicClass}</span><b>{protocol.status}</b></div>
              <h3>{protocol.name}</h3>
              <p>{protocol.purpose}</p>
              <dl>
                <div><dt>RUNS</dt><dd>{protocol.runCount}</dd></div>
                <div><dt>LAST</dt><dd>{formatTime(protocol.lastRunAt)}</dd></div>
                <div><dt>VALIDATION</dt><dd>{protocol.lastValidationLevel ?? 'NO QUALIFYING RUN'}</dd></div>
              </dl>
              {protocol.missingDependencies.length ? <small className="mlh-warning">MISSING: {protocol.missingDependencies.join(' · ')}</small> : <small>DEPENDENCIES AVAILABLE</small>}
            </article>
          ))}
        </div>
      </section>

      <section className="mlh-section">
        <div className="mlh-section-head"><div><span>02 / SIMULATION</span><h2>Ejecutar con evidencia persistida</h2></div><p>Sólo `sociotechnical_simulation` y `economic_simulation` usan este runner. El resultado permanece SIMULATED.</p></div>
        <div className="mlh-two-col">
          <div className="mlh-panel">
            <label>PROTOCOLO
              <select value={simulationProtocol} onChange={(event) => setSimulationProtocol(event.target.value as typeof simulationProtocol)}>
                <option value="sociotechnical_simulation">Sociotechnical Simulation</option>
                <option value="economic_simulation">Observable Economic Simulation</option>
              </select>
            </label>
            <label>BUSCAR EVIDENCIA
              <input value={evidenceSearch} onChange={(event) => setEvidenceSearch(event.target.value)} placeholder="caso, título, tipo, fuente…" />
            </label>
            <div className="mlh-evidence-list">
              {visibleEvidence.slice(0, 60).map((item) => (
                <label key={item.id} className="mlh-evidence-row">
                  <input type="checkbox" checked={selectedEvidence.includes(item.id)} onChange={() => toggleEvidence(item.id)} />
                  <span><b>{item.label}</b><small>{item.kind} · {item.caseId ?? item.source} · {item.id}</small>{item.claimBoundary ? <em>{item.claimBoundary}</em> : null}</span>
                </label>
              ))}
            </div>
            <button className="mlh-action" disabled={Boolean(busy) || selectedEvidence.length === 0} onClick={() => execute('METHOD LAB RUN', () => postJson('/api/root/method-lab/simulate', { protocolId: simulationProtocol, evidenceIds: selectedEvidence, parameters: {}, cognitiveSpineContextRefs: [] }))}>
              {busy === 'METHOD LAB RUN' ? 'EJECUTANDO…' : `EJECUTAR CON ${selectedEvidence.length} EVIDENCIAS`}
            </button>
            {simulationProtocol === 'economic_simulation' ? <p className="mlh-boundary">No ejecutes Economic sólo para subir el contador: selecciona evidencia económica/world realmente admisible.</p> : null}
          </div>
          <div className="mlh-panel mlh-readout">
            <span>BOUNDARY</span>
            <h3>SIMULATED ≠ OBSERVED</h3>
            <p>Un run prueba el instrumento y deja un resultado reproducible. Sólo un RETURN posterior puede elevar la validación.</p>
            <dl>
              <div><dt>SELECTED EVIDENCE</dt><dd>{selectedEvidence.length}</dd></div>
              <div><dt>PERSISTENCE</dt><dd>{initialState.sharedPersistence}</dd></div>
              <div><dt>DT</dt><dd>{initialState.decisionTransfer.passCount} PASS / {initialState.decisionTransfer.failCount} FAIL / {initialState.decisionTransfer.blockedCount} BLOCKED</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mlh-section">
        <div className="mlh-section-head"><div><span>03 / COGNITIVE RELATIONAL LAB</span><h2>Sesión → eventos → blind → fundador → contraste</h2></div><p>El BLIND siempre corre antes de recibir la lectura del fundador.</p></div>

        <div className="mlh-three-col">
          <form className="mlh-panel" onSubmit={(event) => { event.preventDefault(); void execute('CREATE CRL SESSION', () => postJson('/api/root/cognitive-lab/sessions', newSession)); }}>
            <h3>ACTIVAR SESIÓN</h3>
            <label>TÍTULO<input value={newSession.title} onChange={(event) => setNewSession({ ...newSession, title: event.target.value })} /></label>
            <label>OBJETIVO<textarea value={newSession.objective} onChange={(event) => setNewSession({ ...newSession, objective: event.target.value })} /></label>
            <label>CONDICIÓN<select value={newSession.condition} onChange={(event) => setNewSession({ ...newSession, condition: event.target.value })}>
              <option value="FOUNDER_TWIN">FOUNDER + COGNITIVE TWIN</option>
              <option value="FOUNDER_MODEL">FOUNDER + MODEL</option>
              <option value="FOUNDER_SOLO">FOUNDER SOLO</option>
              <option value="FOUNDER_HUMAN_TECH">FOUNDER + HUMAN + TECH</option>
              <option value="TWIN_ONLY">TWIN ONLY</option>
              <option value="OTHER">OTHER</option>
            </select></label>
            <button className="mlh-action" disabled={Boolean(busy) || !newSession.title.trim() || !newSession.objective.trim()}>ACTIVAR SESIÓN</button>
          </form>

          <form className="mlh-panel" onSubmit={(event) => { event.preventDefault(); if (!eventDraft.sessionId) return; void execute('RECORD CRL EVENT', () => postJson(`/api/root/cognitive-lab/sessions/${eventDraft.sessionId}/events`, { eventKind: eventDraft.eventKind, provenance: eventDraft.provenance, actorKey: eventDraft.actorKey, payload: { content: eventDraft.content }, evidenceRefs: selectedEvidence })); }}>
            <h3>REGISTRAR EVENTO</h3>
            <label>SESIÓN<select value={eventDraft.sessionId} onChange={(event) => setEventDraft({ ...eventDraft, sessionId: event.target.value })}><option value="">SELECT…</option>{initialSessions.filter((item) => !['CLOSED', 'REJECTED'].includes(item.status)).map((item) => <option value={item.id} key={item.id}>{item.sessionKey} · {item.status}</option>)}</select></label>
            <label>EVENTO<select value={eventDraft.eventKind} onChange={(event) => setEventDraft({ ...eventDraft, eventKind: event.target.value })}>{['OBSERVATION','FOUNDER_DECISION','TOOL_EXECUTION','ARTIFACT','OUTCOME','FRICTION','OMISSION','OTHER'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>PROVENANCE<select value={eventDraft.provenance} onChange={(event) => setEventDraft({ ...eventDraft, provenance: event.target.value })}>{['FOUNDER_ORIGINATED','MODEL_PROPOSED','CO_DEVELOPED','SYSTEM_EMERGENT','EXTERNAL','FOUNDER_AUTHORIZATION','UNKNOWN'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>ACTOR<input value={eventDraft.actorKey} onChange={(event) => setEventDraft({ ...eventDraft, actorKey: event.target.value })} /></label>
            <label>CONTENIDO<textarea value={eventDraft.content} onChange={(event) => setEventDraft({ ...eventDraft, content: event.target.value })} /></label>
            <button className="mlh-action" disabled={Boolean(busy) || !eventDraft.sessionId || !eventDraft.content.trim()}>REGISTRAR</button>
          </form>

          <div className="mlh-panel mlh-readout">
            <span>CRL STATE</span><h3>{initialSessions.length} sesiones</h3>
            <p>{initialSessions.filter((item) => item.status === 'READY_FOR_BLIND').length} listas para BLIND · {initialSessions.filter((item) => item.status === 'BLIND_COMPLETE').length} listas para contraste.</p>
            <p className="mlh-boundary">FOUNDER_AUTHORIZATION no equivale a FOUNDER_ORIGINATED.</p>
          </div>
        </div>

        <div className="mlh-session-list">
          {initialSessions.map((session) => (
            <article className="mlh-session" data-state={session.status} key={session.id}>
              <header><div><span>{session.condition}</span><h3>{session.sessionKey}</h3><p>{session.title}</p></div><b>{session.status}</b></header>
              <p>{session.objective}</p>
              <dl><div><dt>EVENTS</dt><dd>{session.eventCount}</dd></div><div><dt>ANALYSES</dt><dd>{session.analysisCount}</dd></div><div><dt>START</dt><dd>{formatTime(session.startedAt)}</dd></div><div><dt>END</dt><dd>{formatTime(session.endedAt)}</dd></div></dl>

              {!['CLOSED', 'REJECTED'].includes(session.status) && ['FOUNDER_MODEL', 'FOUNDER_TWIN', 'TWIN_ONLY'].includes(session.condition) ? <div className="mlh-inline-action"><textarea value={interactionPrompts[session.id] ?? ''} onChange={(event) => setInteractionPrompts({ ...interactionPrompts, [session.id]: event.target.value })} placeholder="Prompt real para registrar interacción…"/><button disabled={Boolean(busy) || !(interactionPrompts[session.id] ?? '').trim()} onClick={() => execute('CRL INTERACTION', () => postJson(`/api/root/cognitive-lab/sessions/${session.id}/interact`, { prompt: interactionPrompts[session.id] ?? '', history: [] }))}>INTERACTUAR</button></div> : null}

              {session.status === 'READY_FOR_BLIND' ? <button className="mlh-action" disabled={Boolean(busy)} onClick={() => execute('CRL BLIND', () => postJson(`/api/root/cognitive-lab/sessions/${session.id}/blind`, {}))}>EJECUTAR BLIND</button> : null}

              {['BLIND_COMPLETE', 'CONTRAST_PENDING'].includes(session.status) ? <div className="mlh-contrast"><label>LECTURA DEL FUNDADOR<textarea value={founderReadings[session.id] ?? ''} onChange={(event) => setFounderReadings({ ...founderReadings, [session.id]: event.target.value })} placeholder="Tu lectura posterior al BLIND: acuerdos, divergencias, omisiones, causalidad y quién cambió a quién…" /></label><button className="mlh-action" disabled={Boolean(busy) || !(founderReadings[session.id] ?? '').trim()} onClick={() => execute('CRL CONTRAST', () => postJson(`/api/root/cognitive-lab/sessions/${session.id}/contrast`, { founderReading: founderReadings[session.id] ?? '' }))}>CONTRASTAR Y CERRAR</button></div> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mlh-section mlh-status-section">
        <div><span>DECISION TRANSFER</span><strong>{initialState.decisionTransfer.status}</strong><p>{initialState.decisionTransfer.validationRule}</p></div>
        <div><span>AUTHORITY</span><strong>ROOT</strong><p>{initialState.decisionTransfer.authorityRule}</p></div>
      </section>

      {[...initialState.warnings, ...evidenceWarnings].length ? <section className="mlh-section"><div className="mlh-warning-box"><span>WARNINGS</span>{[...initialState.warnings, ...evidenceWarnings].map((warning) => <p key={warning}>{warning}</p>)}</div></section> : null}

      {message ? <div className="mlh-toast" data-error={!message.endsWith(': OK')}>{message}</div> : null}
      {result ? <details className="mlh-result"><summary>ÚLTIMO RESULTADO</summary><pre>{JSON.stringify(result, null, 2)}</pre></details> : null}
    </main>
  );
}

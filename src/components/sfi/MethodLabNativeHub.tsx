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

type ModelAccess = {
  transport: 'MCP';
  endpoint: string;
  operationId: string;
  scope: string;
  authentication: string;
  localProviderCredentialsRequired: boolean;
  modelSelectionOwner: string;
  executionOwner: string;
  status: string;
  boundary: string;
};

type LabState = {
  generatedAt: string;
  contractVersion: string;
  status: string;
  sharedPersistence: string;
  epistemicRule: string;
  promotionRule: string;
  modelAccess: ModelAccess;
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
type RunMode = 'AUTO' | 'sociotechnical_simulation' | 'economic_simulation';

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
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 16).replace('T', ' ');
}

function tokens(value: string) {
  return value.toLowerCase().split(/[^a-záéíóúñ0-9]+/i).filter((item) => item.length > 2);
}

function chooseProtocol(objective: string): Exclude<RunMode, 'AUTO'> {
  return /(econom|market|capital|price|cost|inflation|labor|trade|finance|budget|resource|fiscal|monetary)/i.test(objective)
    ? 'economic_simulation'
    : 'sociotechnical_simulation';
}

function suggestedEvidence(options: EvidenceOption[], objective: string) {
  const wanted = tokens(objective);
  const scored = options.map((item, index) => {
    const haystack = [item.label, item.kind, item.caseId ?? '', item.source, item.claimBoundary ?? ''].join(' ').toLowerCase();
    const score = wanted.reduce((sum, token) => sum + (haystack.includes(token) ? 4 : 0), 0) + (item.observedAt ? 1 : 0) - index * 0.001;
    return { item, score };
  }).sort((a, b) => b.score - a.score);
  const matched = scored.filter((item) => item.score > 1).slice(0, 8).map((item) => item.item.id);
  return matched.length ? matched : scored.slice(0, Math.min(6, scored.length)).map((item) => item.item.id);
}

function resultText(result: JsonRecord | null, key: string) {
  if (!result) return null;
  const value = result[key];
  return typeof value === 'string' ? value : null;
}

export function MethodLabNativeHub({ initialState, initialSessions, evidenceOptions, evidenceWarnings }: Props) {
  const router = useRouter();
  const [objective, setObjective] = useState('');
  const [mode, setMode] = useState<RunMode>('AUTO');
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<JsonRecord | null>(null);

  const visibleEvidence = useMemo(() => {
    const q = evidenceSearch.trim().toLowerCase();
    if (!q) return evidenceOptions;
    return evidenceOptions.filter((item) => [item.label, item.kind, item.caseId ?? '', item.source].join(' ').toLowerCase().includes(q));
  }, [evidenceOptions, evidenceSearch]);

  const resolvedProtocol = mode === 'AUTO' ? chooseProtocol(objective) : mode;
  const automaticEvidence = useMemo(() => suggestedEvidence(evidenceOptions, objective), [evidenceOptions, objective]);
  const effectiveEvidence = selectedEvidence.length ? selectedEvidence : automaticEvidence;
  const available = initialState.protocols.filter((item) => item.status === 'AVAILABLE').length;
  const operational = initialState.protocols.filter((item) => item.status === 'OPERATIONAL').length;
  const degraded = initialState.protocols.filter((item) => item.status === 'DEGRADED').length;

  function toggleEvidence(id: string) {
    setSelectedEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function run() {
    if (!objective.trim()) {
      setMessage('Describe what you want to test.');
      return;
    }
    if (!effectiveEvidence.length) {
      setMessage('No persisted evidence is available for an automatic run.');
      return;
    }
    setBusy(true);
    setMessage('');
    setResult(null);
    try {
      const payload = await postJson('/api/root/method-lab/simulate', {
        protocolId: resolvedProtocol,
        evidenceIds: effectiveEvidence,
        parameters: {
          objective: objective.trim(),
          preparationMode: selectedEvidence.length ? 'MANUAL_EVIDENCE_OVERRIDE' : 'AUTO_EVIDENCE_SELECTION',
        },
        cognitiveSpineContextRefs: [],
      });
      setSelectedEvidence(effectiveEvidence);
      setResult(payload);
      setMessage('RUN COMPLETE · SIMULATED result persisted');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mlh-shell">
      <div className="mlh-backdrop" aria-hidden="true" />
      <header className="mlh-topbar">
        <Link href="/root" className="mlh-brand">SFI</Link>
        <span>METHOD LAB</span>
        <nav><a href="#run">RUN</a><a href="#protocols">PROTOCOLS</a><a href="#history">HISTORY</a></nav>
        <div className="mlh-transport"><i /> MODEL ACCESS · MCP</div>
      </header>

      <section className="mlh-workspace" id="run">
        <aside className="mlh-library" id="protocols">
          <small>PROTOCOL LIBRARY</small>
          <h1>Method Lab</h1>
          <p>Describe the question. SFI prepares the protocol and evidence automatically.</p>
          <div className="mlh-library-list">
            {initialState.protocols.map((protocol) => (
              <button type="button" key={protocol.id} onClick={() => {
                if (protocol.id === 'economic_simulation' || protocol.id === 'sociotechnical_simulation') setMode(protocol.id);
              }} data-state={protocol.status} data-active={resolvedProtocol === protocol.id ? 'true' : undefined}>
                <i />
                <span>{protocol.name}</span>
                <b>{protocol.status}</b>
              </button>
            ))}
          </div>
          <div className="mlh-library-stats">
            <span>{operational} OPERATIONAL</span><span>{available} AVAILABLE</span><span>{degraded} DEGRADED</span>
          </div>
        </aside>

        <section className="mlh-center">
          <div className="mlh-question">
            <span>WHAT DO YOU WANT TO TEST?</span>
            <textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Example: What changes if this institutional decision is applied under the current evidence?" />
            <div className="mlh-mode">
              {([
                ['AUTO', 'AUTO'],
                ['sociotechnical_simulation', 'SOCIO-TECHNICAL'],
                ['economic_simulation', 'ECONOMIC'],
              ] as const).map(([value, label]) => <button type="button" key={value} data-active={mode === value ? 'true' : undefined} onClick={() => setMode(value)}>{label}</button>)}
            </div>
          </div>

          <div className="mlh-orchestration">
            <header><span>AUTOMATIC ORCHESTRATION</span><b>{busy ? 'RUNNING' : 'READY'}</b></header>
            <div className="mlh-flow">
              <div><i />QUESTION<small>{objective.trim() ? 'DEFINED' : 'WAITING'}</small></div>
              <em>→</em>
              <div><i />PROTOCOL<small>{resolvedProtocol.replaceAll('_', ' ').toUpperCase()}</small></div>
              <em>→</em>
              <div><i />EVIDENCE<small>{effectiveEvidence.length} PERSISTED ROWS</small></div>
              <em>→</em>
              <div><i />SIMULATION<small>SIMULATED</small></div>
              <em>→</em>
              <div><i />RETURN<small>OBSERVATION LATER</small></div>
            </div>
          </div>

          <div className="mlh-auto-summary">
            <div><span>PROTOCOL</span><b>{resolvedProtocol.replaceAll('_', ' ')}</b></div>
            <div><span>EVIDENCE</span><b>{effectiveEvidence.length} items</b></div>
            <div><span>PREPARATION</span><b>{selectedEvidence.length ? 'manual override' : 'automatic'}</b></div>
            <div><span>MODEL TRANSPORT</span><b>MCP</b></div>
          </div>

          <button className="mlh-run" type="button" disabled={busy || !objective.trim() || !effectiveEvidence.length} onClick={() => void run()}>
            {busy ? 'RUNNING EXPERIMENT…' : 'RUN EXPERIMENT'}
          </button>

          <details className="mlh-advanced">
            <summary>ADVANCED · OVERRIDE AUTOMATIC EVIDENCE</summary>
            <div className="mlh-evidence-tools">
              <input value={evidenceSearch} onChange={(event) => setEvidenceSearch(event.target.value)} placeholder="Search persisted evidence…" />
              <button type="button" onClick={() => setSelectedEvidence([])}>USE AUTO SELECTION</button>
            </div>
            <div className="mlh-evidence-list">
              {visibleEvidence.slice(0, 80).map((item) => (
                <label key={item.id}>
                  <input type="checkbox" checked={selectedEvidence.includes(item.id)} onChange={() => toggleEvidence(item.id)} />
                  <span><b>{item.label}</b><small>{item.kind} · {item.caseId ?? item.source}</small></span>
                </label>
              ))}
            </div>
          </details>
        </section>

        <aside className="mlh-right">
          <section className="mlh-run-card">
            <header><span>ACTIVE / LAST RUN</span><b data-live={busy ? 'true' : undefined}>{busy ? 'RUNNING' : result ? 'COMPLETE' : 'READY'}</b></header>
            <h2>{resolvedProtocol === 'economic_simulation' ? 'Observable Economic Simulation' : 'Sociotechnical Simulation'}</h2>
            <p>{objective.trim() || 'No experiment running. Describe a question and press RUN EXPERIMENT.'}</p>
            <dl>
              <div><dt>CLASS</dt><dd>SIMULATED</dd></div>
              <div><dt>EVIDENCE</dt><dd>{effectiveEvidence.length}</dd></div>
              <div><dt>ANALYSIS</dt><dd>{resultText(result, 'labAnalysisId') ?? '—'}</dd></div>
              <div><dt>TRANSPORT</dt><dd>MCP / INTERNAL EXECUTION</dd></div>
            </dl>
            <p className="mlh-boundary">SIMULATED ≠ OBSERVED. A successful run is not a real-world RETURN.</p>
          </section>

          <section className="mlh-mcp">
            <header><span>MODEL CONNECTION</span><b>{initialState.modelAccess.status}</b></header>
            <h3>MCP is the model boundary.</h3>
            <code>{initialState.modelAccess.endpoint}</code>
            <dl>
              <div><dt>OPERATION</dt><dd>{initialState.modelAccess.operationId}</dd></div>
              <div><dt>SCOPE</dt><dd>{initialState.modelAccess.scope}</dd></div>
              <div><dt>AUTH</dt><dd>{initialState.modelAccess.authentication}</dd></div>
              <div><dt>LOCAL PROVIDER KEYS</dt><dd>NOT REQUIRED</dd></div>
            </dl>
            <p>{initialState.modelAccess.boundary}</p>
          </section>

          <section className="mlh-result-card">
            <header><span>RESULT / CONTRAST</span><b>{initialState.decisionTransfer.status}</b></header>
            <div className="mlh-result-metrics">
              <div><b>{initialState.decisionTransfer.passCount}</b><span>PASS</span></div>
              <div><b>{initialState.decisionTransfer.failCount}</b><span>FAIL</span></div>
              <div><b>{initialState.decisionTransfer.blockedCount}</b><span>BLOCKED</span></div>
            </div>
            <p>{initialState.decisionTransfer.validationRule}</p>
          </section>
        </aside>
      </section>

      <section className="mlh-history" id="history">
        <header><span>RUN / SESSION HISTORY</span><b>{initialSessions.length} COGNITIVE-LAB SESSIONS</b></header>
        <div className="mlh-history-track">
          {initialSessions.slice(0, 10).map((session) => (
            <article key={session.id}>
              <i />
              <small>{formatTime(session.startedAt)}</small>
              <b>{session.sessionKey || session.condition}</b>
              <span>{session.status} · {session.eventCount} events · {session.analysisCount} analyses</span>
            </article>
          ))}
          {!initialSessions.length ? <p>NO COGNITIVE-LAB SESSION OBSERVED YET.</p> : null}
        </div>
      </section>

      {[...initialState.warnings, ...evidenceWarnings].length ? (
        <details className="mlh-warnings">
          <summary>DEGRADED / MISSING DEPENDENCIES</summary>
          {[...initialState.warnings, ...evidenceWarnings].map((warning) => <p key={warning}>{warning}</p>)}
        </details>
      ) : null}

      {message ? <div className="mlh-toast" data-error={message.startsWith('RUN COMPLETE') ? undefined : 'true'}>{message}</div> : null}
      {result ? <details className="mlh-raw"><summary>RUN RECEIPT</summary><pre>{JSON.stringify(result, null, 2)}</pre></details> : null}
    </main>
  );
}

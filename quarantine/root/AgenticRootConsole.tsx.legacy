'use client';

import { useMemo, useState } from 'react';
import { BrainCircuit, Clipboard, Download, FileText, GitBranch, Loader2, Radar, RefreshCw, Search, ShieldCheck, Target } from 'lucide-react';
import type { AgenticRootState, IfnormReport, ReportType } from '@/lib/agents/sfiAgents';
import type { NeuralGraphAgentResult, NeuralGraphFilter } from '@/lib/agents/neuralGraphAgent';

type TabId =
  | 'overview'
  | 'world_vector'
  | 'neural_graph'
  | 'amv'
  | 'momentum'
  | 'client_finder'
  | 'prediction_registry'
  | 'atlas'
  | 'reports'
  | 'cognitive_twin'
  | 'execution_queue'
  | 'system_health'
  | 'routes';

type ReportResult = {
  ok: boolean;
  type: ReportType;
  title: string;
  body: string;
  evidence: string[];
  provider: string;
  warnings: string[];
  trace: { trace_id: string };
};

const tabs: Array<[TabId, string]> = [
  ['overview', 'Overview'],
  ['world_vector', 'World Vector'],
  ['neural_graph', 'Neural Graph'],
  ['amv', 'AMV'],
  ['momentum', 'Momentum'],
  ['client_finder', 'Client Finder'],
  ['prediction_registry', 'Prediction Registry'],
  ['atlas', 'Atlas'],
  ['reports', 'Reports'],
  ['cognitive_twin', 'Cognitive Twin'],
  ['execution_queue', 'Execution Queue'],
  ['system_health', 'System Health'],
  ['routes', 'Routes'],
];

const graphFilters: NeuralGraphFilter[] = ['evidence', 'signal', 'prospect', 'hypothesis', 'prediction', 'outcome', 'report', 'atlas', 'moph', 'world_vector', 'amv'];

const reportTypes: ReportType[] = [
  'world_vector_internal',
  'world_vector_public',
  'ifnorm',
  'sfi_dr01',
  'neural_graph_evidence',
  'amv_recurrence',
  'calibration',
  'atlas_entry',
  'linkedin_draft',
  'contact_draft',
];

function pct(value: number | null | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function PanelMetric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="border border-[#272219] bg-[#080806] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c816b]">{label}</div>
      <div className="mt-2 break-words text-sm text-[#f0e7d0]">{String(value ?? 'not_available')}</div>
    </div>
  );
}

function ActionButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 border border-[#c8a951]/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap border border-[#272219] bg-[#050504] p-3 text-xs leading-5 text-[#cfc3aa]">{JSON.stringify(value, null, 2)}</pre>;
}

function IfnormTable({ reports }: { reports: IfnormReport[] }) {
  if (reports.length === 0) return <div className="border border-[#272219] bg-[#080806] p-4 text-sm text-[#8c816b]">No IFNORM draft generated in this session.</div>;
  return (
    <div className="overflow-auto border border-[#272219]">
      <table className="w-full min-w-[1180px] border-collapse bg-[#080806] text-left text-xs">
        <thead className="bg-[#120f09] text-[#c8a951]">
          <tr>
            {['Compania', 'Persona/Rol', 'Dolor', 'Evidencia', 'Oferta SFI', 'Como vincularlo', 'Mensaje', 'Probabilidad', 'Accion', 'Estado'].map((head) => (
              <th key={head} className="border-b border-[#272219] p-3 uppercase tracking-[0.12em]">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.trace.trace_id} className="border-b border-[#1c1811] align-top">
              <td className="p-3 text-[#f0e7d0]">{report.entity_name}</td>
              <td className="p-3 text-[#cfc3aa]">{report.person_or_role}</td>
              <td className="p-3 text-[#cfc3aa]">{report.detected_pain}</td>
              <td className="p-3 text-[#9c927f]">{report.evidence.slice(0, 3).join(' | ') || 'required'}</td>
              <td className="p-3 text-[#c8a951]">{report.recommended_offer}</td>
              <td className="p-3 text-[#cfc3aa]">{report.linking_strategy}</td>
              <td className="p-3 text-[#cfc3aa]">{report.suggested_human_message}</td>
              <td className="p-3 text-[#cfc3aa]">{pct(report.p_response)} / {pct(report.p_meeting)}</td>
              <td className="p-3 text-[#cfc3aa]">{report.recommended_action}</td>
              <td className="p-3 text-[#c8a951]">{report.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AgenticRootConsole({ initialState }: { initialState: AgenticRootState }) {
  const [state, setState] = useState(initialState);
  const [tab, setTab] = useState<TabId>('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [graphQuery, setGraphQuery] = useState('latest SFI operating opportunities');
  const [activeFilters, setActiveFilters] = useState<NeuralGraphFilter[]>(['evidence', 'signal', 'prediction', 'world_vector', 'amv', 'prospect']);
  const [graphResult, setGraphResult] = useState<NeuralGraphAgentResult>(initialState.neuralGraph);
  const [amvQuery, setAmvQuery] = useState('');
  const [amvIngest, setAmvIngest] = useState('');
  const [ifnorms, setIfnorms] = useState<IfnormReport[]>([]);
  const [clientForm, setClientForm] = useState({ entityName: '', personOrRole: '', sector: '', publicSignal: '', source: '', notes: '' });
  const [reportType, setReportType] = useState<ReportType>('world_vector_internal');
  const [reportSubject, setReportSubject] = useState('');
  const [report, setReport] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerSummary = useMemo(() => {
    const available = state.providers.filter((item) => item.available);
    return available.length ? available.map((item) => `${item.id}:${item.model}`).join(' | ') : 'degraded/manual mode';
  }, [state.providers]);

  async function refresh() {
    setBusy('refresh');
    setError(null);
    try {
      const response = await fetch('/api/root/agentic-state', { cache: 'no-store', credentials: 'include' });
      const json = await response.json();
      if (!response.ok || json.ok === false) throw new Error(json.error ?? 'agentic_state_failed');
      setState(json as AgenticRootState);
      setGraphResult((json as AgenticRootState).neuralGraph);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'agentic_state_failed');
    } finally {
      setBusy(null);
    }
  }

  async function searchGraph(generateInterpretation = false) {
    setBusy('graph');
    setError(null);
    try {
      const response = await fetch('/api/root/agentic/neural-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: graphQuery, filters: activeFilters, generateInterpretation }),
      });
      const json = await response.json();
      if (!response.ok || json.ok === false) throw new Error(json.error ?? 'neural_graph_failed');
      setGraphResult(json as NeuralGraphAgentResult);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'neural_graph_failed');
    } finally {
      setBusy(null);
    }
  }

  async function runAmv(operation: 'search' | 'ingest') {
    setBusy('amv');
    setError(null);
    try {
      const response = await fetch('/api/root/agentic/amv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(operation === 'ingest'
          ? { operation, source: 'root_manual', text: amvIngest }
          : { operation, query: amvQuery, useEmbeddings: true }),
      });
      const json = await response.json();
      if (!response.ok || json.ok === false) throw new Error(json.error ?? 'amv_failed');
      setState((current) => ({ ...current, amv: json as AgenticRootState['amv'] }));
      if (operation === 'ingest') setAmvIngest('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'amv_failed');
    } finally {
      setBusy(null);
    }
  }

  async function createIfnorm() {
    setBusy('client_finder');
    setError(null);
    try {
      const response = await fetch('/api/root/agentic/client-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(clientForm),
      });
      const json = await response.json();
      if (!response.ok || json.ok === false) throw new Error(json.error ?? 'client_finder_failed');
      setIfnorms((current) => [json.ifnorm as IfnormReport, ...current].slice(0, 12));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'client_finder_failed');
    } finally {
      setBusy(null);
    }
  }

  async function generateReport() {
    setBusy('report');
    setError(null);
    try {
      const response = await fetch('/api/root/agentic/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: reportType, subject: reportSubject, ifnorm: ifnorms[0] ?? null }),
      });
      const json = await response.json();
      if (!response.ok || json.ok === false) throw new Error(json.error ?? 'report_failed');
      setReport(json as ReportResult);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'report_failed');
    } finally {
      setBusy(null);
    }
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(`${report.title}\n\n${report.body}`);
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([`${report.title}\n\n${report.body}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.type}-${report.trace.trace_id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const tabView = (() => {
    if (tab === 'overview') {
      return (
        <div className="grid gap-4 xl:grid-cols-4">
          <PanelMetric label="LLM Provider Router" value={providerSummary} />
          <PanelMetric label="Neural Graph" value={`${graphResult.nodes.length} nodes / ${graphResult.edges.length} edges`} />
          <PanelMetric label="AMV" value={`${state.amv.status} / ${state.amv.total_items} items`} />
          <PanelMetric label="Prediction Registry" value={state.predictionRegistry.degraded ? 'degraded' : 'operational'} />
          <PanelMetric label="Client Finder" value={state.clientFinder.status} />
          <PanelMetric label="Reports" value={`${state.reports.available.length} report types / approval required`} />
          <PanelMetric label="Execution Queue" value={`${state.executionQueue.length} queued`} />
          <PanelMetric label="System Health" value={state.systemHealth.graphStatus} />
        </div>
      );
    }

    if (tab === 'world_vector') {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelMetric label="current_signal_state" value={state.worldVectorAgent.current_signal_state} />
          <PanelMetric label="dominant_pattern" value={state.worldVectorAgent.dominant_pattern} />
          <PanelMetric label="sector_tension" value={state.worldVectorAgent.sector_tension} />
          <PanelMetric label="what_client_class_to_seek" value={state.worldVectorAgent.what_client_class_to_seek} />
          <section className="border border-[#272219] bg-[#080806] p-4 lg:col-span-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Root interpretation</div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#cfc3aa]">{state.worldVectorAgent.root_interpretation}</p>
          </section>
        </div>
      );
    }

    if (tab === 'neural_graph') {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <input value={graphQuery} onChange={(event) => setGraphQuery(event.target.value)} className="border border-[#272219] bg-[#080806] px-3 py-3 text-sm text-[#f0e7d0] outline-none focus:border-[#c8a951]" />
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => void searchGraph(false)} disabled={busy === 'graph'}>{busy === 'graph' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search</ActionButton>
              <ActionButton onClick={() => void searchGraph(true)} disabled={busy === 'graph'}><BrainCircuit className="h-4 w-4" /> Generate interpretation</ActionButton>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {graphFilters.map((filter) => (
              <button key={filter} type="button" onClick={() => setActiveFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter])} className={activeFilters.includes(filter) ? 'border border-[#c8a951] bg-[#c8a951] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#050504]' : 'border border-[#272219] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8c816b]'}>
                {filter}
              </button>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <section className="border border-[#272219] bg-[#080806] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Nodes</div>
              <div className="mt-3 space-y-2">
                {graphResult.nodes.slice(0, 12).map((node) => <PanelMetric key={node.id} label={`${node.type} / ${node.connection}`} value={node.label} />)}
              </div>
            </section>
            <section className="border border-[#272219] bg-[#080806] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Evidence</div>
              <div className="mt-3 space-y-2">
                {graphResult.evidence.slice(0, 12).map((item) => <PanelMetric key={item.id} label={`${item.source} / ${item.connection}`} value={item.summary} />)}
              </div>
            </section>
            <section className="border border-[#272219] bg-[#080806] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Trace</div>
              <JsonBlock value={{ trace: graphResult.trace, edges: graphResult.edges.slice(0, 8), missing_context: graphResult.missing_context, interpretation: graphResult.interpretation }} />
            </section>
          </div>
        </div>
      );
    }

    if (tab === 'amv') {
      return (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className="space-y-3 border border-[#272219] bg-[#080806] p-4">
            <PanelMetric label="status" value={`${state.amv.status} / ${state.amv.mode}`} />
            <PanelMetric label="items" value={state.amv.total_items} />
            <input value={amvQuery} onChange={(event) => setAmvQuery(event.target.value)} placeholder="search memory" className="w-full border border-[#272219] bg-[#050504] px-3 py-3 text-sm text-[#f0e7d0]" />
            <ActionButton onClick={() => void runAmv('search')} disabled={busy === 'amv'}><Search className="h-4 w-4" /> Search memory</ActionButton>
            <textarea value={amvIngest} onChange={(event) => setAmvIngest(event.target.value)} placeholder="manual evidence ingest" rows={5} className="w-full border border-[#272219] bg-[#050504] px-3 py-3 text-sm text-[#f0e7d0]" />
            <ActionButton onClick={() => void runAmv('ingest')} disabled={busy === 'amv' || amvIngest.trim().length < 6}><BrainCircuit className="h-4 w-4" /> Ingest evidence</ActionButton>
          </section>
          <section className="grid gap-3 lg:grid-cols-2">
            {state.amv.items.slice(0, 10).map((item) => <PanelMetric key={item.id} label={`${item.source} / ${item.kind}`} value={item.summary} />)}
            <JsonBlock value={{ recurrent_patterns: state.amv.recurrent_patterns, associations: state.amv.associations, actions: state.amv.actions }} />
          </section>
        </div>
      );
    }

    if (tab === 'client_finder' || tab === 'momentum') {
      return (
        <div className="space-y-4">
          <section className="grid gap-3 lg:grid-cols-3">
            {Object.entries(clientForm).map(([key, value]) => (
              <label key={key} className={key === 'publicSignal' || key === 'notes' ? 'grid gap-2 lg:col-span-3' : 'grid gap-2'}>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c816b]">{key}</span>
                {key === 'publicSignal' || key === 'notes' ? (
                  <textarea value={value} rows={3} onChange={(event) => setClientForm((current) => ({ ...current, [key]: event.target.value }))} className="border border-[#272219] bg-[#080806] px-3 py-3 text-sm text-[#f0e7d0]" />
                ) : (
                  <input value={value} onChange={(event) => setClientForm((current) => ({ ...current, [key]: event.target.value }))} className="border border-[#272219] bg-[#080806] px-3 py-3 text-sm text-[#f0e7d0]" />
                )}
              </label>
            ))}
          </section>
          <ActionButton onClick={() => void createIfnorm()} disabled={busy === 'client_finder'}><Target className="h-4 w-4" /> Create IFNORM</ActionButton>
          <IfnormTable reports={ifnorms} />
        </div>
      );
    }

    if (tab === 'prediction_registry') {
      return <JsonBlock value={state.predictionRegistry} />;
    }

    if (tab === 'atlas') {
      return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {graphResult.nodes.slice(0, 12).map((node) => (
            <section key={node.id} className="border border-[#272219] bg-[#080806] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">{node.type}</div>
              <h3 className="mt-2 text-lg text-[#f0e7d0]">{node.label}</h3>
              <p className="mt-3 text-sm leading-6 text-[#9c927f]">{node.summary}</p>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8c816b]">{node.connection}</div>
            </section>
          ))}
        </div>
      );
    }

    if (tab === 'reports') {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[260px_1fr_auto]">
            <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className="border border-[#272219] bg-[#080806] px-3 py-3 text-sm text-[#f0e7d0]">
              {reportTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={reportSubject} onChange={(event) => setReportSubject(event.target.value)} placeholder="subject" className="border border-[#272219] bg-[#080806] px-3 py-3 text-sm text-[#f0e7d0]" />
            <ActionButton onClick={() => void generateReport()} disabled={busy === 'report'}><FileText className="h-4 w-4" /> Generate</ActionButton>
          </div>
          {report ? (
            <section className="border border-[#272219] bg-[#080806] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">{report.type}</div>
                  <h3 className="mt-2 text-xl text-[#f0e7d0]">{report.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton onClick={() => void copyReport()}><Clipboard className="h-4 w-4" /> Copy</ActionButton>
                  <ActionButton onClick={downloadReport}><Download className="h-4 w-4" /> Download</ActionButton>
                </div>
              </div>
              <pre className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#cfc3aa]">{report.body}</pre>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8c816b]">approval_queue=required provider={report.provider}</div>
            </section>
          ) : null}
        </div>
      );
    }

    if (tab === 'cognitive_twin') return <JsonBlock value={state.cognitiveTwin} />;
    if (tab === 'execution_queue') return <JsonBlock value={state.executionQueue} />;
    if (tab === 'system_health') return <JsonBlock value={state.systemHealth} />;
    return <JsonBlock value={{ canonical_routes: ['/', '/field', '/world-vector', '/repository', '/root', '/contact', '/login'], rule: 'No route is treated as dead. Existing modules stay available as providers or surfaces.' }} />;
  })();

  return (
    <section className="border-b border-[#272219] bg-[#050504] px-4 py-5 text-[#cfc3aa] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">ROOT Agentic Console</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#f0e7d0]">Observe {'->'} investigate {'->'} connect {'->'} predict {'->'} approve.</h2>
          </div>
          <ActionButton onClick={() => void refresh()} disabled={busy === 'refresh'}>{busy === 'refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh</ActionButton>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? 'border border-[#c8a951] bg-[#c8a951] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#050504]' : 'border border-[#272219] bg-[#080806] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]'}>
              {label}
            </button>
          ))}
        </div>

        {error ? <div className="mt-4 border border-[#7d3b31] bg-[#170d0b] p-3 text-sm text-[#d69a8b]">{error}</div> : null}

        <div className="mt-5">{tabView}</div>

        <footer className="mt-5 grid gap-3 border-t border-[#272219] pt-4 text-xs text-[#9c927f] md:grid-cols-3">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#c8a951]" /> no automatic outreach</div>
          <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-[#c8a951]" /> direct and inferred connections are labeled</div>
          <div className="flex items-center gap-2"><Radar className="h-4 w-4 text-[#c8a951]" /> degraded/manual mode remains explicit</div>
        </footer>
      </div>
    </section>
  );
}

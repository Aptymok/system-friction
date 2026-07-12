'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileUp,
  Fingerprint,
  Gauge,
  Loader2,
  Orbit,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics/client';

type WorldSummary = {
  observedAt: string | null;
  regime: string;
  wsv: number | null;
  tension: number | null;
  confidence: number | null;
  dominantDomains: Array<{ label: string; value: number }>;
  warning: string | null;
};

type Row = Record<string, unknown>;

type FieldCase = Row & {
  id: string;
  title: string;
  domain: string;
  status: string;
  verification_window: string;
  created_at: string;
  metadata: Row;
  hypothesis: Row | null;
  intervention: Row | null;
  return: Row | null;
  outcome: Row | null;
  latestMihm: Row | null;
  evidence: Row[];
};

type CycleListResponse = {
  ok: boolean;
  cases?: FieldCase[];
  summary?: { total: number; waitingReturn: number; closed: number; verified: number };
  warnings?: string[];
  error?: string;
  details?: string;
};

type CreateResult = {
  case: FieldCase;
  seal: string;
  expectedAt: string;
  expectedValue: number;
  hypothesis: Row;
  intervention: Row;
  mihm: Row;
  world: Row;
  warnings: string[];
};

type ReturnResult = {
  caseId: string;
  expectedValue: number;
  actualValue: number;
  delta: number;
  accepted: boolean;
  verified: boolean;
  explanation: string;
  nextStep: string;
  mihm: Row;
};

type CreateForm = {
  title: string;
  domain: string;
  stuckSystem: string;
  objective: string;
  attempts: string;
  evidence: string;
  consequence: string;
  declaredAttractor: string;
  evidenceSource: string;
  evidenceUri: string;
  reliability: number;
  verificationWindow: '72h' | '7d' | '30d';
  consent: boolean;
};

type ReturnForm = {
  evidenceNote: string;
  evidenceSource: string;
  evidenceUri: string;
  reliability: number;
  actualOutcome: number;
  interventionFidelity: number;
};

const INITIAL_CREATE: CreateForm = {
  title: '',
  domain: 'personal_system',
  stuckSystem: '',
  objective: '',
  attempts: '',
  evidence: '',
  consequence: '',
  declaredAttractor: '',
  evidenceSource: 'participant_declared',
  evidenceUri: '',
  reliability: 0.45,
  verificationWindow: '72h',
  consent: false,
};

const INITIAL_RETURN: ReturnForm = {
  evidenceNote: '',
  evidenceSource: 'participant_return',
  evidenceUri: '',
  reliability: 0.55,
  actualOutcome: 0.5,
  interventionFidelity: 0.7,
};

function numeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function dateLabel(value: unknown) {
  if (typeof value !== 'string') return 'SIN FECHA';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : value;
}

function percent(value: number | null) {
  return value === null ? 'NO MEDIDO' : `${Math.round(value * 100)}%`;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-[#3a321f] bg-[#090806cc] p-4 backdrop-blur-sm">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8e846d]">{label}</div>
      <strong className="mt-2 block text-xl font-medium text-[#f4e8c9]">{value}</strong>
      <p className="mt-2 text-xs leading-5 text-[#928976]">{detail}</p>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-y border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm leading-6 text-[#eee4cb] outline-none placeholder:text-[#5d574a] focus:border-[#c9aa54]"
      />
    </label>
  );
}

function RangeField({ label, value, onChange, low, high }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  low: string;
  high: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[#a49572]">
        {label}<b className="text-[#e5ca81]">{Math.round(value * 100)}%</b>
      </span>
      <input type="range" min="0" max="1" step="0.05" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="flex justify-between text-[10px] text-[#655f52]"><i>{low}</i><i>{high}</i></span>
    </label>
  );
}

function MihmReadout({ reading }: { reading: Row | null }) {
  const metrics = Array.isArray(reading?.metrics) ? reading.metrics.filter((item): item is Row => Boolean(item) && typeof item === 'object') : [];
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.length ? metrics.map((metric) => {
        const value = numeric(metric.value);
        return (
          <div key={text(metric.key)} className="border border-[#2e281c] bg-[#070705] p-3">
            <div className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8f856d]">
              <span>{text(metric.key)}</span><span>{text(metric.status)}</span>
            </div>
            <strong className="mt-2 block text-lg text-[#f0dfb4]">{value === null ? 'MISSING' : value.toFixed(3)}</strong>
            <p className="mt-2 text-[11px] leading-5 text-[#817968]">{text(metric.explanation, 'Sin explicación disponible.')}</p>
          </div>
        );
      }) : <div className="border border-[#2e281c] bg-[#070705] p-4 text-sm text-[#817968]">Sin lectura MIHM persistida.</div>}
    </div>
  );
}

export function FieldOperationalConsole({ authenticated, world }: { authenticated: boolean; world: WorldSummary }) {
  const [mode, setMode] = useState<'new' | 'cases'>('new');
  const [form, setForm] = useState<CreateForm>(INITIAL_CREATE);
  const [returnForm, setReturnForm] = useState<ReturnForm>(INITIAL_RETURN);
  const [cases, setCases] = useState<FieldCase[]>([]);
  const [summary, setSummary] = useState({ total: 0, waitingReturn: 0, closed: 0, verified: 0 });
  const [selected, setSelected] = useState<FieldCase | null>(null);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<'baseline' | 'return' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const loadCases = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const response = await fetch('/api/field/cases', { cache: 'no-store', credentials: 'include' });
      const body = await response.json().catch(() => null) as CycleListResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setCases(body.cases ?? []);
      setSummary(body.summary ?? { total: 0, waitingReturn: 0, closed: 0, verified: 0 });
      setWarnings(body.warnings ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'field_cases_failed');
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => { void loadCases(); }, [loadCases]);

  const dueCases = useMemo(() => cases.filter((item) => String(item.status).includes('WAITING')), [cases]);

  async function uploadFile(file: File, target: 'baseline' | 'return') {
    setUploading(target);
    setError(null);
    trackEvent('evidence_intake_start', { evidence_stage: target, surface: 'field' });
    try {
      const data = new FormData();
      data.set('file', file);
      const response = await fetch('/api/field/evidence/upload', { method: 'POST', credentials: 'include', body: data });
      const body = await response.json().catch(() => null) as { ok?: boolean; file?: { uri?: string; filename?: string }; error?: string; details?: string } | null;
      if (!response.ok || !body?.ok || !body.file?.uri) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      if (target === 'baseline') setForm((current) => ({ ...current, evidenceUri: body.file?.uri ?? '', evidenceSource: `private_upload:${body.file?.filename ?? 'file'}` }));
      else setReturnForm((current) => ({ ...current, evidenceUri: body.file?.uri ?? '', evidenceSource: `private_upload:${body.file?.filename ?? 'file'}` }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'field_upload_failed');
    } finally {
      setUploading(null);
    }
  }

  async function createCycle() {
    setLoading(true);
    setError(null);
    setReturnResult(null);
    trackEvent('field_flow_start', { domain: form.domain, verification_window: form.verificationWindow });
    try {
      const response = await fetch('/api/field/cases', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; result?: CreateResult; error?: string; details?: string } | null;
      if (!response.ok || !body?.ok || !body.result) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setCreateResult(body.result);
      setWarnings(body.result.warnings ?? []);
      trackEvent('field_step_complete', { field_step: 'cycle_sealed', verification_window: form.verificationWindow, domain: form.domain });
      await loadCases();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'field_cycle_failed');
    } finally {
      setLoading(false);
    }
  }

  async function submitReturn() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/field/cases/${encodeURIComponent(selected.id)}/return`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnForm),
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; result?: ReturnResult; error?: string; details?: string } | null;
      if (!response.ok || !body?.ok || !body.result) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setReturnResult(body.result);
      trackEvent('field_step_complete', { field_step: 'return_recorded', accepted: body.result.accepted, verified: body.result.verified });
      await loadCases();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'field_return_failed');
    } finally {
      setLoading(false);
    }
  }

  function openReturn(item: FieldCase) {
    setSelected(item);
    setReturnResult(null);
    setReturnForm(INITIAL_RETURN);
    trackEvent('field_return_open', { case_status: item.status, verification_window: item.verification_window });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030302] text-[#e9dfc8]">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(201,170,84,0.16),transparent_30%),radial-gradient(circle_at_12%_64%,rgba(109,59,39,0.2),transparent_32%),linear-gradient(rgba(201,170,84,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(201,170,84,0.035)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]" />
        <div className="absolute left-[12%] top-[24%] h-72 w-72 animate-pulse rounded-full border border-[#c9aa5422]" />
        <div className="absolute right-[10%] top-[18%] h-48 w-48 animate-pulse rounded-full border border-[#c9aa5420] [animation-delay:1.4s]" />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <header className="border border-[#352f21] bg-[#070705d9] px-5 py-5 backdrop-blur-xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#c9aa54]"><Orbit className="h-4 w-4" /> SFI FIELD · MOP-H 72H</div>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.03] text-[#fff4d8] md:text-6xl">No te entrega una opinión. Cierra una hipótesis y espera evidencia.</h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#9c9380] md:text-base">Declara el sistema, observa el estado del mundo, ejecuta una sola perturbación reversible y regresa con evidencia. FIELD conserva T0, hash, hipótesis, intervención, retorno, MIHM provisional y diferencia entre lo esperado y lo observado.</p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
              <Link href="/observatory" className="border border-[#3a321f] px-4 py-3 text-[#d9c58e]">World State</Link>
              <Link href="/repository" className="border border-[#3a321f] px-4 py-3 text-[#d9c58e]">Method</Link>
              <Link href="/privacy" className="border border-[#3a321f] px-4 py-3 text-[#d9c58e]">Privacy</Link>
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="World regime" value={world.regime} detail={world.observedAt ? `Observed ${dateLabel(world.observedAt)}` : 'No current observation'} />
          <Metric label="World persistence" value={world.wsv === null ? 'MISSING' : world.wsv.toFixed(3)} detail="Context, not wellbeing or crisis probability." />
          <Metric label="World tension" value={world.tension === null ? 'MISSING' : world.tension.toFixed(3)} detail="Used as contextual field state, not causal proof." />
          <Metric label="Source confidence" value={percent(world.confidence)} detail={world.warning ?? 'Current public source state.'} />
          <Metric label="Your corpus" value={authenticated ? `${summary.closed}/${summary.total}` : 'LOGIN'} detail={authenticated ? `${summary.waitingReturn} awaiting return · ${summary.verified} verified` : 'Persistence begins after authentication.'} />
        </section>

        {world.dominantDomains.length ? (
          <div className="mt-3 flex flex-wrap gap-2 border border-[#2d281c] bg-[#060604b8] p-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8f856d]">
            <span className="text-[#c9aa54]">Dominant observed context</span>
            {world.dominantDomains.map((item) => <span key={item.label} className="border-l border-[#3a321f] pl-3">{item.label} {item.value.toFixed(3)}</span>)}
          </div>
        ) : null}

        {!authenticated ? (
          <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <article className="border border-[#42371e] bg-[#080704e8] p-7 backdrop-blur-xl">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c9aa54]">Operational sequence</span>
              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {[
                  ['01', 'Declare', 'System, objective, evidence and consequence.'],
                  ['02', 'Seal', 'Hypothesis, minimal intervention, T0 and SHA-256 return hash.'],
                  ['03', 'Execute', 'One reversible variable during the selected window.'],
                  ['04', 'Return', 'Evidence, MIHM comparison, outcome and next controlled step.'],
                ].map(([number, title, detail]) => <div key={number} className="border border-[#312a1c] bg-[#050504] p-4"><b className="font-mono text-xs text-[#c9aa54]">{number}</b><strong className="mt-3 block text-lg text-[#f2e4bf]">{title}</strong><p className="mt-2 text-xs leading-5 text-[#817968]">{detail}</p></div>)}
              </div>
            </article>
            <article className="flex flex-col justify-between border border-[#c9aa5555] bg-[radial-gradient(circle_at_top_right,rgba(201,170,84,0.18),transparent_45%),#090806] p-7">
              <div><ShieldCheck className="h-8 w-8 text-[#c9aa54]" /><h2 className="mt-5 text-3xl text-[#fff0c9]">Private by default.</h2><p className="mt-4 text-sm leading-7 text-[#9d927b]">Your objective, evidence and return remain inside your account. Public output requires a separate governance decision.</p></div>
              <Link href="/login?next=%2Ffield" data-analytics-label="field_login" className="mt-8 inline-flex items-center justify-center gap-2 border border-[#c9aa54] bg-[#c9aa54] px-5 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#050504]">Enter FIELD <ArrowRight className="h-4 w-4" /></Link>
            </article>
          </section>
        ) : (
          <>
            <nav className="mt-5 flex flex-wrap gap-2 border-b border-[#332d20] pb-3 font-mono text-[10px] uppercase tracking-[0.14em]">
              <button type="button" onClick={() => setMode('new')} className={`px-4 py-3 ${mode === 'new' ? 'bg-[#c9aa54] text-[#050504]' : 'border border-[#332d20] text-[#a99d83]'}`}>New cycle</button>
              <button type="button" onClick={() => setMode('cases')} className={`px-4 py-3 ${mode === 'cases' ? 'bg-[#c9aa54] text-[#050504]' : 'border border-[#332d20] text-[#a99d83]'}`}>Cases · {summary.total}</button>
              <button type="button" onClick={() => void loadCases()} disabled={loading} className="ml-auto inline-flex items-center gap-2 border border-[#332d20] px-4 py-3 text-[#a99d83]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            </nav>

            {error ? <div className="mt-4 border border-[#733d31] bg-[#180d09] p-4 text-sm text-[#e0a18d]">{error}</div> : null}
            {warnings.length ? <div className="mt-4 border border-[#6e5729] bg-[#151006] p-4 font-mono text-[10px] leading-5 text-[#c6a85d]">DEGRADED · {warnings.join(' | ')}</div> : null}

            {mode === 'new' ? (
              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_470px]">
                <article className="border border-[#373020] bg-[#080705e8] p-5 backdrop-blur-xl md:p-7">
                  <div className="flex items-start justify-between gap-5"><div><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c9aa54]">T0 · Intake</span><h2 className="mt-2 text-3xl text-[#f4e7c5]">Define exactly what is stuck.</h2></div><Fingerprint className="h-7 w-7 text-[#c9aa54]" /></div>
                  <div className="mt-7 grid gap-5 md:grid-cols-2">
                    <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]">Case title</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm text-[#eee4cb] outline-none focus:border-[#c9aa54]" placeholder="Example: publication approval bottleneck" /></label>
                    <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]">Domain</span><select value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} className="border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm text-[#eee4cb] outline-none focus:border-[#c9aa54]"><option value="personal_system">Personal system</option><option value="team">Team</option><option value="organization">Organization</option><option value="institution">Institution</option><option value="company">Company</option><option value="project">Project</option><option value="cultural_signal">Cultural signal</option><option value="other">Other</option></select></label>
                  </div>
                  <div className="mt-5 grid gap-5">
                    <TextArea label="System currently stuck" value={form.stuckSystem} onChange={(value) => setForm((current) => ({ ...current, stuckSystem: value }))} placeholder="Describe the process, relation or decision that is not converting into movement." rows={4} />
                    <TextArea label="Observable objective" value={form.objective} onChange={(value) => setForm((current) => ({ ...current, objective: value }))} placeholder="What must be observably different at the end of the window?" />
                    <TextArea label="Previous attempts" value={form.attempts} onChange={(value) => setForm((current) => ({ ...current, attempts: value }))} placeholder="What has already been tried and what happened?" />
                    <TextArea label="Baseline evidence" value={form.evidence} onChange={(value) => setForm((current) => ({ ...current, evidence: value }))} placeholder="Document what is true now. Use dates, counts, artifacts or direct observations." rows={4} />
                    <TextArea label="Consequence if unchanged" value={form.consequence} onChange={(value) => setForm((current) => ({ ...current, consequence: value }))} placeholder="What becomes more expensive, slow, unstable or irreversible?" />
                    <TextArea label="Declared attractor / desired stable state" value={form.declaredAttractor} onChange={(value) => setForm((current) => ({ ...current, declaredAttractor: value }))} placeholder="What stable behavior should the system move toward?" />
                  </div>

                  <div className="mt-6 grid gap-5 border-t border-[#302a1d] pt-6 md:grid-cols-2">
                    <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]">Evidence source</span><input value={form.evidenceSource} onChange={(event) => setForm((current) => ({ ...current, evidenceSource: event.target.value }))} className="border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm text-[#eee4cb] outline-none focus:border-[#c9aa54]" /></label>
                    <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]">Verification window</span><select value={form.verificationWindow} onChange={(event) => setForm((current) => ({ ...current, verificationWindow: event.target.value as CreateForm['verificationWindow'] }))} className="border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm text-[#eee4cb] outline-none focus:border-[#c9aa54]"><option value="72h">72 hours</option><option value="7d">7 days</option><option value="30d">30 days</option></select></label>
                    <RangeField label="Declared source reliability" value={form.reliability} onChange={(value) => setForm((current) => ({ ...current, reliability: value }))} low="thin" high="verified" />
                    <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]">Private evidence file</span><span className="flex items-center gap-3"><input type="file" className="min-w-0 flex-1 text-xs text-[#817968]" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file, 'baseline'); }} /><FileUp className="h-4 w-4 text-[#c9aa54]" /></span><em className="break-all text-[10px] text-[#655f52]">{uploading === 'baseline' ? 'UPLOADING…' : form.evidenceUri || 'No private file uploaded'}</em></label>
                  </div>

                  <label className="mt-6 flex items-start gap-3 border border-[#3a321f] bg-[#060604] p-4 text-sm leading-6 text-[#9a927f]"><input type="checkbox" checked={form.consent} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} className="mt-1" /><span>I consent to private persistence of this cycle and confirm that I have authority to submit the described system and evidence. Organization or institution observation must be authorized.</span></label>

                  <button type="button" onClick={() => void createCycle()} disabled={loading || !form.consent || form.stuckSystem.trim().length < 12 || form.objective.trim().length < 8 || form.evidence.trim().length < 8} className="mt-6 inline-flex w-full items-center justify-center gap-3 border border-[#c9aa54] bg-[#c9aa54] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[#050504] disabled:cursor-not-allowed disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />} Seal T0, hypothesis and return hash</button>
                </article>

                <aside className="space-y-4">
                  <article className="border border-[#3a321f] bg-[#080705e8] p-5 backdrop-blur-xl"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c9aa54]"><Gauge className="h-4 w-4" /> MIHM evidence evaluator</div><p className="mt-4 text-sm leading-6 text-[#8e8573]">FIELD computes transparent evidence proxies and leaves unsupported MIHM variables as MISSING. It does not infer psychology or present a textual proxy as calibrated MIHM.</p></article>
                  {createResult ? (
                    <article className="border border-[#c9aa5555] bg-[radial-gradient(circle_at_top_right,rgba(201,170,84,0.13),transparent_38%),#080705] p-5">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c9aa54]"><CheckCircle2 className="h-4 w-4" /> Cycle sealed</div>
                      <h3 className="mt-4 text-2xl text-[#f7e8bf]">{text(createResult.case.title)}</h3>
                      <dl className="mt-5 grid gap-3 text-sm">
                        <div><dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#786f5e]">Return due</dt><dd className="mt-1 text-[#d9c99f]">{dateLabel(createResult.expectedAt)}</dd></div>
                        <div><dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#786f5e]">Provisional expected movement</dt><dd className="mt-1 text-[#d9c99f]">{createResult.expectedValue.toFixed(3)}</dd></div>
                        <div><dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#786f5e]">Hypothesis</dt><dd className="mt-1 leading-6 text-[#aaa08b]">{text(createResult.hypothesis.statement)}</dd></div>
                        <div><dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#786f5e]">Minimal intervention</dt><dd className="mt-1 leading-6 text-[#aaa08b]">{text(createResult.intervention.minimum_change)}</dd></div>
                        <div><dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#786f5e]">SHA-256 return seal</dt><dd className="mt-1 break-all font-mono text-[10px] leading-5 text-[#c9aa54]">{createResult.seal}</dd></div>
                      </dl>
                      <div className="mt-5"><MihmReadout reading={createResult.mihm} /></div>
                    </article>
                  ) : (
                    <article className="border border-[#2f291d] bg-[#070705] p-5 text-sm leading-6 text-[#756e60]"><Clock3 className="h-5 w-5 text-[#8e7a48]" /><p className="mt-4">Nothing is sealed yet. The system will not display a clean prediction until T0, evidence, intervention and return conditions exist.</p></article>
                  )}
                </aside>
              </section>
            ) : (
              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
                <article className="border border-[#373020] bg-[#080705e8] p-5 backdrop-blur-xl">
                  <header className="flex items-center justify-between gap-4"><div><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c9aa54]">Longitudinal cases</span><h2 className="mt-2 text-3xl text-[#f4e7c5]">Your controlled cycles</h2></div><Activity className="h-6 w-6 text-[#c9aa54]" /></header>
                  <div className="mt-6 grid gap-3">
                    {cases.length ? cases.map((item) => {
                      const metadata = item.metadata ?? {};
                      const expectedAt = metadata.expectedAt;
                      const returnReady = String(item.status).includes('WAITING');
                      return (
                        <button type="button" key={item.id} onClick={() => returnReady ? openReturn(item) : setSelected(item)} className="grid gap-4 border border-[#302a1d] bg-[#050504] p-4 text-left transition hover:border-[#8f783c] md:grid-cols-[1fr_auto]">
                          <div><div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[#897f6a]"><span className="text-[#c9aa54]">{item.status}</span><span>{item.domain}</span><span>{item.verification_window}</span></div><strong className="mt-2 block text-lg text-[#eee0bb]">{item.title}</strong><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#7f7767]">{text(item.hypothesis?.statement, 'Hypothesis not available')}</p></div>
                          <div className="flex min-w-44 flex-col justify-between text-right font-mono text-[9px] uppercase tracking-[0.12em] text-[#746d5e]"><span>{expectedAt ? dateLabel(expectedAt) : dateLabel(item.created_at)}</span><b className={returnReady ? 'text-[#c9aa54]' : 'text-[#8e856f]'}>{returnReady ? 'OPEN RETURN →' : text(item.outcome?.verified, 'CLOSED')}</b></div>
                        </button>
                      );
                    }) : <div className="border border-[#302a1d] bg-[#050504] p-8 text-center text-sm text-[#766f61]">No cycles yet.</div>}
                  </div>
                </article>

                <aside className="space-y-4">
                  {selected ? (
                    <article className="border border-[#c9aa5544] bg-[#080705] p-5">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c9aa54]"><Clock3 className="h-4 w-4" /> Return evidence</div>
                      <h3 className="mt-3 text-2xl text-[#f1e1b8]">{selected.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-[#8d8472]">Sealed hypothesis: {text(selected.hypothesis?.statement, 'MISSING')}</p>
                      <p className="mt-3 text-sm leading-6 text-[#8d8472]">Intervention: {text(selected.intervention?.minimum_change, 'MISSING')}</p>
                      {String(selected.status).includes('WAITING') ? (
                        <div className="mt-6 grid gap-5">
                          <TextArea label="What was actually observed?" value={returnForm.evidenceNote} onChange={(value) => setReturnForm((current) => ({ ...current, evidenceNote: value }))} placeholder="Document outcome, timestamp, counts, artifact or direct observation." rows={5} />
                          <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]">Return source</span><input value={returnForm.evidenceSource} onChange={(event) => setReturnForm((current) => ({ ...current, evidenceSource: event.target.value }))} className="border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm text-[#eee4cb] outline-none focus:border-[#c9aa54]" /></label>
                          <label className="grid gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]">Private return file</span><span className="flex items-center gap-3"><input type="file" className="min-w-0 flex-1 text-xs text-[#817968]" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file, 'return'); }} /><FileUp className="h-4 w-4 text-[#c9aa54]" /></span><em className="break-all text-[10px] text-[#655f52]">{uploading === 'return' ? 'UPLOADING…' : returnForm.evidenceUri || 'No private file uploaded'}</em></label>
                          <RangeField label="Observed normalized movement" value={returnForm.actualOutcome} onChange={(value) => setReturnForm((current) => ({ ...current, actualOutcome: value }))} low="no movement" high="objective reached" />
                          <RangeField label="Intervention fidelity" value={returnForm.interventionFidelity} onChange={(value) => setReturnForm((current) => ({ ...current, interventionFidelity: value }))} low="changed substantially" high="executed as sealed" />
                          <RangeField label="Return source reliability" value={returnForm.reliability} onChange={(value) => setReturnForm((current) => ({ ...current, reliability: value }))} low="declared" high="verifiable" />
                          <button type="button" onClick={() => void submitReturn()} disabled={loading || returnForm.evidenceNote.trim().length < 12} className="inline-flex items-center justify-center gap-2 border border-[#c9aa54] bg-[#c9aa54] px-5 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#050504] disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Contrast and close return</button>
                        </div>
                      ) : (
                        <div className="mt-5"><MihmReadout reading={selected.latestMihm} /></div>
                      )}
                    </article>
                  ) : <article className="border border-[#302a1d] bg-[#070705] p-5 text-sm leading-6 text-[#756e60]">Select an open case to submit return evidence.</article>}

                  {returnResult ? (
                    <article className="border border-[#5f6d3d] bg-[#0a1007] p-5">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#b7c979]"><CheckCircle2 className="h-4 w-4" /> Return processed</div>
                      <div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Expected" value={returnResult.expectedValue.toFixed(3)} detail="Sealed at T0" /><Metric label="Observed" value={returnResult.actualValue.toFixed(3)} detail={returnResult.accepted ? 'Accepted' : 'Unverified'} /><Metric label="Delta" value={returnResult.delta.toFixed(3)} detail={returnResult.verified ? 'Verified source' : 'Not independently verified'} /></div>
                      <p className="mt-5 text-sm leading-7 text-[#b8bea5]">{returnResult.explanation}</p>
                      <p className="mt-4 border-l border-[#b7c979] pl-4 text-sm leading-7 text-[#d8dfc0]">{returnResult.nextStep}</p>
                      <div className="mt-5"><MihmReadout reading={returnResult.mihm} /></div>
                    </article>
                  ) : null}
                </aside>
              </section>
            )}
          </>
        )}

        <footer className="mt-8 flex flex-col gap-3 border-t border-[#2f291d] py-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#655f51] md:flex-row md:items-center md:justify-between"><span>FIELD · PRIVATE EVIDENCE · EXPLICIT RETURN</span><span>PROVISIONAL UNTIL CLOSED CASES SUPPORT CALIBRATION</span></footer>
      </div>
    </main>
  );
}

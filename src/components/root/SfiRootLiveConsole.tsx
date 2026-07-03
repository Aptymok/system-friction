'use client';

import { useMemo, useState } from 'react';
import { Activity, Bot, CheckCircle2, CircuitBoard, Compass, FlaskConical, GitBranch, Orbit, RadioTower, ShieldCheck, Sparkles, Target, XCircle } from 'lucide-react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';

type HubId = 'total' | 'predictions' | 'agents' | 'founder' | 'expansion' | 'functions' | 'world';

type ApprovalState = {
  draftJson: string;
  probability: string;
  status: string | null;
  error: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = 'not_available') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value: unknown) {
  return `${Math.round(numberValue(value) * 100)}%`;
}

function MiniMetric({ label, value, tone = 'neutral' }: { label: string; value: unknown; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good'
    ? 'text-emerald-200 border-emerald-400/25'
    : tone === 'warn'
      ? 'text-amber-200 border-amber-300/25'
      : tone === 'bad'
        ? 'text-red-200 border-red-400/25'
        : 'text-[#f4ead0] border-[#d4af37]/20';

  return (
    <div className={`rounded-2xl border bg-black/35 p-3 backdrop-blur-md ${toneClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f846d]">{label}</div>
      <div className="mt-2 truncate font-mono text-sm">{String(value ?? 'not_available')}</div>
    </div>
  );
}

function HubButton({ id, active, label, value, icon, onClick }: { id: HubId; active: boolean; label: string; value: string; icon: React.ReactNode; onClick: (id: HubId) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`group relative overflow-hidden rounded-3xl border p-4 text-left transition ${active ? 'border-[#d4af37]/70 bg-[#201607]/80 shadow-[0_0_48px_rgba(212,175,55,0.14)]' : 'border-[#d4af37]/15 bg-black/35 hover:border-[#d4af37]/45 hover:bg-[#130f08]/80'}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-[#d4af37]/20 bg-black/45 p-2 text-[#d4af37]">{icon}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f846d]">{value}</div>
      </div>
      <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#f4ead0]">{label}</div>
      <div className="mt-2 h-1 rounded-full bg-[#2a2112]">
        <div className={`h-1 rounded-full ${active ? 'w-4/5 bg-[#d4af37]' : 'w-1/3 bg-[#6b5a2e]'}`} />
      </div>
    </button>
  );
}

function DataList({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div className="rounded-3xl border border-[#d4af37]/15 bg-black/35 p-5 backdrop-blur-xl">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d4af37]">{title}</div>
      <div className="mt-4 space-y-3">
        {items.length ? items.slice(0, 6).map((item, index) => {
          const record = asRecord(item);
          return (
            <div key={`${title}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#f4ead0]">{text(record.action ?? record.hypothesis_id ?? record.id ?? record.type, `item_${index + 1}`)}</div>
              <div className="mt-2 line-clamp-3 text-xs leading-5 text-[#b9ad93]">{text(record.reason ?? record.prediccion_explicita ?? record.prediction ?? record.summary ?? record.expected_outcome, 'sin descripcion')}</div>
            </div>
          );
        }) : <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#8f846d]">No hay registros disponibles.</div>}
      </div>
    </div>
  );
}

function PredictionApprovalPanel() {
  const [approval, setApproval] = useState<ApprovalState>({ draftJson: '', probability: '', status: null, error: null });
  const [busy, setBusy] = useState(false);

  async function approveDraft() {
    setBusy(true);
    setApproval((current) => ({ ...current, status: null, error: null }));
    try {
      const draft = JSON.parse(approval.draftJson);
      const probability = Number(approval.probability);
      const response = await fetch('/api/root/predictions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ draft, probabilidad_estimativa: probability }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.ok === false) throw new Error(json.error ?? 'prediction_approval_failed');
      setApproval((current) => ({ ...current, status: `persisted:${json.prediction_entry?.hypothesis_id ?? 'prediction_entry'}`, error: null }));
    } catch (error) {
      setApproval((current) => ({ ...current, error: error instanceof Error ? error.message : 'prediction_approval_failed' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-[#d4af37]/20 bg-[#070605]/75 p-5 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d4af37]">ROOT Prediction Approval</div>
          <div className="mt-2 text-xs text-[#9d927a]">Pega un draft generado por ScoreFriction. ROOT asigna probabilidad humana y persiste.</div>
        </div>
        <ShieldCheck className="h-5 w-5 text-[#d4af37]" />
      </div>
      <textarea
        value={approval.draftJson}
        onChange={(event) => setApproval((current) => ({ ...current, draftJson: event.target.value }))}
        placeholder="prediction_draft JSON"
        className="mt-4 h-44 w-full rounded-2xl border border-[#d4af37]/15 bg-black/50 p-3 font-mono text-xs text-[#f4ead0] outline-none focus:border-[#d4af37]/50"
      />
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={approval.probability}
          onChange={(event) => setApproval((current) => ({ ...current, probability: event.target.value }))}
          placeholder="probabilidad_estimativa 0-1"
          className="rounded-2xl border border-[#d4af37]/15 bg-black/50 px-3 py-3 font-mono text-xs text-[#f4ead0] outline-none focus:border-[#d4af37]/50"
        />
        <button
          type="button"
          onClick={approveDraft}
          disabled={busy}
          className="rounded-2xl border border-[#d4af37]/50 bg-[#d4af37]/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#f4ead0] disabled:opacity-40"
        >
          {busy ? 'Persistiendo' : 'Aprobar'}
        </button>
      </div>
      {approval.status ? <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-200">{approval.status}</div> : null}
      {approval.error ? <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{approval.error}</div> : null}
    </div>
  );
}

function ActiveHubPanel({ activeHub, state, worldVector }: { activeHub: HubId; state: AgenticRootState; worldVector: unknown }) {
  const world = asRecord(worldVector);
  const today = asRecord(world.today);
  const observation = asRecord(today.observation);
  const registry = asRecord(state.predictionRegistry);
  const health = asRecord(registry.health);
  const systemHealth = asRecord(state.systemHealth);
  const executionQueue = asArray(state.executionQueue);
  const predictionEntries = asArray(registry.entries);
  const neural = asRecord(state.neuralGraph);
  const evidence = asArray(neural.evidence);
  const amv = asRecord(state.amv);
  const amvItems = asArray(amv.items);

  if (activeHub === 'predictions') {
    return (
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <PredictionApprovalPanel />
        <DataList title="Prediction registry" items={predictionEntries} />
      </div>
    );
  }

  if (activeHub === 'agents') {
    const agentCards = [
      { action: 'World Vector Agent', reason: text(asRecord(state.worldVectorAgent).dominant_pattern), status: asRecord(state.worldVectorAgent).current_signal_state },
      { action: 'Neural Graph Agent', reason: `${asArray(neural.nodes).length} nodes · ${evidence.length} evidence`, status: systemHealth.graphStatus },
      { action: 'AMV Agent', reason: `${amvItems.length} memory items`, status: amv.status },
      { action: 'Prediction Registry Agent', reason: `${health.pending_returns_count ?? 0} pending returns`, status: systemHealth.predictionStatus },
      { action: 'Cognitive Twin Agent', reason: text(asRecord(state.cognitiveTwin).single_action), status: asRecord(state.cognitiveTwin).expansion_vs_closure },
    ];
    return <DataList title="Agent status and recent traces" items={agentCards} />;
  }

  if (activeHub === 'founder') {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <DataList title="Founder action queue" items={executionQueue} />
        <DataList title="AMV recent institutional memory" items={amvItems} />
      </div>
    );
  }

  if (activeHub === 'expansion') {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <DataList title="Emergent evidence and expansion signals" items={evidence} />
        <div className="rounded-3xl border border-[#d4af37]/15 bg-black/35 p-5 backdrop-blur-xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d4af37]">Expansion pressure</div>
          <div className="mt-4 text-sm leading-7 text-[#d5c8aa]">{text(asRecord(state.cognitiveTwin).what_to_close, 'Cerrar evidencia faltante antes de expandir rutas.')}</div>
          <div className="mt-4 text-xs leading-6 text-[#8f846d]">Regla: ninguna ruta nueva pasa a desarrollo sin evidencia, hipotesis y aprobacion ROOT.</div>
        </div>
      </div>
    );
  }

  if (activeHub === 'functions') {
    const functions = [
      { action: 'Evaluate substrate', reason: '/api/scorefriction/evaluate produce contract + draft' },
      { action: 'Approve prediction', reason: '/api/root/predictions/approve persists only after ROOT probability' },
      { action: 'Generate report', reason: 'ReportAgent drafts remain approval_queue only' },
      { action: 'Search AMV', reason: 'AMV memory supports recurrence and institutional memory' },
      { action: 'Inspect graph', reason: 'NeuralGraphAgent links evidence, predictions, reports and outcomes' },
    ];
    return <DataList title="Institute functions" items={functions} />;
  }

  if (activeHub === 'world') {
    return (
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-[#d4af37]/15 bg-black/35 p-5 backdrop-blur-xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d4af37]">World Vector</div>
          <div className="mt-4 text-sm leading-7 text-[#d5c8aa]">{text(observation.interpretation, text(asRecord(state.worldVectorAgent).root_interpretation))}</div>
        </div>
        <DataList title="World-linked evidence" items={evidence} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <MiniMetric label="World signal" value={text(observation.status, text(asRecord(state.worldVectorAgent).current_signal_state))} tone={text(observation.status) === 'observed' ? 'good' : 'warn'} />
      <MiniMetric label="Predictions" value={`${health.entries_count ?? predictionEntries.length} entries`} tone={health.ok === true ? 'good' : 'warn'} />
      <MiniMetric label="Agent health" value={`${systemHealth.llmProvidersAvailable ?? 0} LLM providers`} tone={Number(systemHealth.llmProvidersAvailable ?? 0) > 0 ? 'good' : 'bad'} />
      <MiniMetric label="AMV" value={text(amv.status)} />
      <MiniMetric label="Graph" value={text(systemHealth.graphStatus)} tone={text(systemHealth.graphStatus) === 'operational' ? 'good' : 'warn'} />
      <MiniMetric label="Generated" value={state.generated_at} />
    </div>
  );
}

export default function SfiRootLiveConsole({ initialState, worldVector }: { initialState: AgenticRootState; worldVector: unknown }) {
  const [activeHub, setActiveHub] = useState<HubId>('total');
  const registry = asRecord(initialState.predictionRegistry);
  const health = asRecord(registry.health);
  const world = asRecord(worldVector);
  const today = asRecord(world.today);
  const observation = asRecord(today.observation);
  const systemHealth = asRecord(initialState.systemHealth);
  const evidenceCount = asArray(asRecord(initialState.neuralGraph).evidence).length;
  const warnings = asArray(systemHealth.warnings);

  const hubs = useMemo(() => [
    { id: 'total' as const, label: 'Estado total SFI', value: text(observation.status, 'field'), icon: <Orbit className="h-4 w-4" /> },
    { id: 'predictions' as const, label: 'Prediccion e hipotesis', value: `${health.entries_count ?? 0} reg`, icon: <Target className="h-4 w-4" /> },
    { id: 'agents' as const, label: 'Agentes vivos', value: `${systemHealth.llmProvidersAvailable ?? 0} llm`, icon: <Bot className="h-4 w-4" /> },
    { id: 'founder' as const, label: 'Acciones fundador', value: `${asArray(initialState.executionQueue).length} queue`, icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'expansion' as const, label: 'Expansion e investigacion', value: `${evidenceCount} ev`, icon: <Compass className="h-4 w-4" /> },
    { id: 'functions' as const, label: 'Funciones instituto', value: 'tools', icon: <FlaskConical className="h-4 w-4" /> },
    { id: 'world' as const, label: 'World vector', value: pct(observation.confidence), icon: <RadioTower className="h-4 w-4" /> },
  ], [evidenceCount, health.entries_count, initialState.executionQueue, observation.confidence, observation.status, systemHealth.llmProvidersAvailable]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#030303] text-[#f4ead0]">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-1/2 top-[-20%] h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-[#d4af37]/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[620px] w-[620px] rounded-full bg-[#7a1f1f]/20 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_38%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:100%_100%,56px_56px,56px_56px]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-5 py-5 lg:px-8">
        <header className="rounded-[2rem] border border-[#d4af37]/20 bg-black/45 p-5 backdrop-blur-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">
                <span>ROOT ACCESS</span>
                <span className="text-[#5f563f]">/</span>
                <span>SFI LIVE CONSOLE</span>
                <span className="text-[#5f563f]">/</span>
                <span>{initialState.generated_at}</span>
              </div>
              <h1 className="mt-4 max-w-5xl text-3xl font-semibold tracking-[-0.04em] text-[#fff7df] md:text-5xl">System Friction Institute · founder operating field</h1>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-[#a99d82]">Estado total primero. Las capas se abren como mini-vistas; ninguna propuesta persiste ni calibra sin aprobacion ROOT.</p>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-3">
              <MiniMetric label="Institution friction" value={warnings.length ? `${warnings.length} warnings` : 'stable'} tone={warnings.length ? 'warn' : 'good'} />
              <MiniMetric label="Prediction health" value={health.ok === true ? 'operational' : 'degraded'} tone={health.ok === true ? 'good' : 'warn'} />
            </div>
          </div>
        </header>

        <div className="mt-5 grid flex-1 gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="grid content-start gap-3">
            {hubs.map((hub) => (
              <HubButton key={hub.id} {...hub} active={activeHub === hub.id} onClick={setActiveHub} />
            ))}
          </aside>

          <section className="min-h-[620px] rounded-[2rem] border border-[#d4af37]/20 bg-black/35 p-5 backdrop-blur-2xl">
            <div className="mb-5 flex flex-col gap-4 border-b border-[#d4af37]/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d4af37]">Mini vista activa</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#fff7df]">{hubs.find((hub) => hub.id === activeHub)?.label}</div>
              </div>
              <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f846d]">
                <span className="rounded-full border border-[#d4af37]/15 px-3 py-2"><Activity className="mr-2 inline h-3 w-3" />live</span>
                <span className="rounded-full border border-[#d4af37]/15 px-3 py-2"><CircuitBoard className="mr-2 inline h-3 w-3" />agentic</span>
                <span className="rounded-full border border-[#d4af37]/15 px-3 py-2"><GitBranch className="mr-2 inline h-3 w-3" />traceable</span>
              </div>
            </div>
            <ActiveHubPanel activeHub={activeHub} state={initialState} worldVector={worldVector} />
          </section>
        </div>

        <footer className="relative mt-5 flex flex-col gap-3 rounded-[2rem] border border-[#d4af37]/10 bg-black/35 p-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6f654e] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <span><Sparkles className="mr-2 inline h-3 w-3 text-[#d4af37]" />Dashboard vivo dinamico de tension SFI</span>
          <span>{health.ok === true ? <CheckCircle2 className="mr-2 inline h-3 w-3 text-emerald-300" /> : <XCircle className="mr-2 inline h-3 w-3 text-red-300" />}ROOT governs proposals · agents do not commit alone</span>
        </footer>
      </section>
    </main>
  );
}

'use client';

import { useMemo, useState } from 'react';
import ExecutionStatePanel from './ExecutionStatePanel';

type PipelineResult = Record<string, any>;

const stages = ['observed', 'evaluated', 'contrasted', 'proposed', 'materialized', 'drafted', 'archived'];

function value(input: unknown) {
  if (input === null || input === undefined || input === '') return '—';
  if (typeof input === 'number') return Number.isInteger(input) ? String(input) : input.toFixed(3);
  if (typeof input === 'boolean') return input ? 'sí' : 'no';
  return String(input);
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-none border border-[#d6b46a]/30 bg-black/50 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <h2 className="text-xs uppercase tracking-[0.28em] text-[#d6b46a]">{title}</h2>
        <span className="h-1.5 w-1.5 rounded-full bg-[#d6b46a]" />
      </div>
      {children}
    </section>
  );
}

function Metric({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="border-b border-white/10 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-1 break-words text-sm text-white/85">{value(data)}</div>
    </div>
  );
}

function ListBlock({ items }: { items?: unknown[] }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return <p className="text-sm text-white/45">Sin registros.</p>;
  return (
    <ul className="space-y-2 text-sm text-white/75">
      {list.map((item, index) => (
        <li key={index} className="border-l border-[#d6b46a]/40 pl-3">{String(item)}</li>
      ))}
    </ul>
  );
}

function DownloadLink({ label, href }: { label: string; href?: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/70 hover:border-[#d6b46a]/60 hover:text-[#d6b46a]"
    >
      {label}
    </a>
  );
}

export default function SfiConsoleClient() {
  const [input, setInput] = useState('');
  const [caseId, setCaseId] = useState('SFI-OP-001');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [media, setMedia] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPipeline() {
    setLoading(true);
    setError(null);
    setMedia(null);

    try {
      const response = await fetch('/api/scorefriction/execution/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: input || undefined, case_id: caseId || undefined }),
      });

      const json = await response.json();
      const pipeline = json.result ?? json;
      setResult(pipeline);

      setMediaLoading(true);
      const mediaResponse = await fetch('/api/scorefriction/media/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pipeline, request: { text: input || undefined, case_id: caseId || undefined } }),
      });

      const mediaJson = await mediaResponse.json();
      setMedia(mediaJson.media ?? mediaJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'pipeline_failed');
    } finally {
      setLoading(false);
      setMediaLoading(false);
    }
  }

  const data = result ?? {};
  const contrast = data.contrast ?? {};
  const proposal = data.proposal ?? {};
  const material = data.material ?? {};
  const draft = data.publisherDraft ?? {};
  const atlas = data.atlasMemory?.memory ?? data.atlasMemory ?? {};
  const stageMap = data.stages ?? {};
  const assets = media?.assets ?? {};

  const statusLabel = useMemo(() => {
    if (loading) return 'RUNNING';
    if (mediaLoading) return 'RENDERING_MEDIA';
    return data.status ?? 'READY';
  }, [loading, mediaLoading, data.status]);

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-[#d6b46a]/30 pb-6">
          <p className="text-xs uppercase tracking-[0.45em] text-[#d6b46a]">System Friction Institute</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white md:text-5xl">SFI Console</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
            Entrada mínima → evaluación → cotejo → propuesta → material → draft → memoria Atlas → render multimedia local.
          </p>
        </header>

        <section className="mb-6 grid items-stretch gap-4 border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Texto, señal, URL o instrucción mínima..."
            className="min-h-24 w-full resize-none border border-white/10 bg-black p-3 text-sm text-white outline-none focus:border-[#d6b46a]/70"
          />
          <input
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            placeholder="case_id"
            className="h-full min-h-24 w-full border border-white/10 bg-black p-3 text-sm text-white outline-none focus:border-[#d6b46a]/70"
          />
          <button
            onClick={runPipeline}
            disabled={loading || mediaLoading}
            className="h-full min-h-24 w-full border border-[#d6b46a]/70 bg-[#d6b46a]/10 px-4 py-3 text-xs uppercase tracking-[0.25em] text-[#d6b46a] hover:bg-[#d6b46a]/20 disabled:opacity-40"
          >
            {loading ? 'Procesando' : mediaLoading ? 'Renderizando' : 'Run SFI Pipeline'}
          </button>
        </section>

        {error && <div className="mb-6 border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

        <section className="mb-6 border border-white/10 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.3em] text-white/45">Estado</span>
            <span className="text-xs uppercase tracking-[0.3em] text-[#d6b46a]">{statusLabel}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-7">
            {stages.map((stage) => (
              <div key={stage} className={`border p-3 text-center text-[10px] uppercase tracking-[0.18em] ${stageMap[stage] ? 'border-[#d6b46a]/60 text-[#d6b46a]' : 'border-white/10 text-white/35'}`}>
                {stage}
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="MIHM">
            <Metric label="regime" data={contrast.mihm_regime} />
            <Metric label="confidence" data={contrast.confidence} />
            <Metric label="graph state" data={contrast.graph_state} />
            <Metric label="observation" data={contrast.observation_id} />
            <Metric label="vector" data={contrast.vector_id} />
          </Panel>

          <Panel title="Cotejo">
            <div className="mb-4">
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">Coincidencias</div>
              <ListBlock items={contrast.matches} />
            </div>
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">Riesgos</div>
              <ListBlock items={contrast.risks} />
            </div>
          </Panel>

          <Panel title="Propuesta">
            <Metric label="title" data={proposal.title} />
            <Metric label="material type" data={proposal.material_type} />
            <Metric label="target medium" data={proposal.target_medium} />
            <Metric label="risk" data={proposal.risk} />
            <Metric label="approval" data={proposal.approval_required} />
          </Panel>

          <Panel title="Material">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-5 text-white/70">
              {material.atlas_block ?? material.body ?? 'Sin material generado.'}
            </pre>
          </Panel>

          <Panel title="Publisher">
            <Metric label="channel" data={draft.channel} />
            <Metric label="status" data={draft.status} />
            <Metric label="draft" data={draft.draft_id} />
            <Metric label="approval" data={draft.approval_required} />
          </Panel>

          <Panel title="Atlas Memory">
            <Metric label="entry" data={atlas.atlas_entry_id ?? atlas.entry_id} />
            <Metric label="nucleus" data={atlas.nucleus} />
            <Metric label="page type" data={atlas.page_type} />
            <Metric label="reading path" data={Array.isArray(atlas.reading_path) ? atlas.reading_path.join(' → ') : atlas.reading_path} />
            <Metric label="persisted" data={atlas.persistence?.persisted} />
          </Panel>

          <Panel title="Media Render Engine">
            <Metric label="media id" data={media?.media_id} />
            <Metric label="status" data={media?.status} />
            <Metric label="video rendered" data={assets.video?.rendered} />
            <div className="mt-4 grid gap-2">
              <DownloadLink label="Open Image" href={assets.image?.url} />
              <DownloadLink label="Open Audio" href={assets.audio?.url} />
              <DownloadLink label="Open Video" href={assets.video?.rendered ? assets.video?.url : undefined} />
              <DownloadLink label="Open Markdown" href={assets.markdown?.url} />
              <DownloadLink label="Open JSON" href={assets.json?.url} />
            </div>
            {!assets.video?.rendered && media?.video?.install_hint && (
              <p className="mt-3 text-xs leading-5 text-white/45">Video MP4 requiere ffmpeg: {media.video.install_hint}</p>
            )}
          </Panel>
        </div>

        <ExecutionStatePanel caseId={caseId} />
      </div>
    </main>
  );
}

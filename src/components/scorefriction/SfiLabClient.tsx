'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Clipboard, FileDown, FileText, Layers3, Play, Upload } from 'lucide-react';
import type { SfiLabAnalysis, SfiLabMode, SfiReport } from '@/lib/sfi-psi/types';

const MODES: Array<{ value: SfiLabMode; label: string }> = [
  { value: 'detect_signals', label: 'Detectar señales' },
  { value: 'generate_report', label: 'Generar reporte' },
  { value: 'propose_campaign', label: 'Proponer campaña' },
  { value: 'generate_assets', label: 'Generar assets' },
];

const SAMPLE_TEXT = `2026-06-14 señal: la comunidad repite fricción institucional y archivo vivo.
2026-06-15 señal: archivo vivo reaparece como necesidad de reporte operativo.
2026-06-16 señal: fricción institucional reaparece y pide campaña sobria.
2026-06-16 señal: archivo vivo conserva identidad aunque la coherencia sea baja.`;

type HistoryItem = {
  id: string;
  createdAt: string;
  source: string;
  label: string;
};

function metric(value: number | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Panel(props: { title: string; children: ReactNode }) {
  return (
    <section className="border border-[#29251c] bg-[#080807] p-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#c4a24d]">{props.title}</div>
      {props.children}
    </section>
  );
}

export default function SfiLabClient({ embedded = false }: { embedded?: boolean }) {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [source, setSource] = useState('sfi-lab-manual');
  const [tags, setTags] = useState('SFI-PSI, SMLI-P');
  const [mode, setMode] = useState<SfiLabMode>('detect_signals');
  const [fileMeta, setFileMeta] = useState<{ name: string; type: string; size: number; lastModified: number } | null>(null);
  const [analysis, setAnalysis] = useState<SfiLabAnalysis | null>(null);
  const [report, setReport] = useState<SfiReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Listo para analizar.');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem('sfi-lab-history');
    if (raw) setHistory(JSON.parse(raw) as HistoryItem[]);
  }, []);

  const jsonExport = useMemo(() => JSON.stringify({ analysis, report }, null, 2), [analysis, report]);
  const markdownExport = report?.markdown ?? '# SFI Lab\n\nGenera un reporte despues del analisis.\n';

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileMeta({ name: file.name, type: file.type, size: file.size, lastModified: file.lastModified });
    setSource(file.name);
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
      setText(await file.text());
    }
  }

  async function analyze() {
    setBusy(true);
    setStatus('Analizando entrada...');
    try {
      const response = await fetch('/api/scorefriction/lab/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          source,
          mode,
          file: fileMeta,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const json = await response.json() as SfiLabAnalysis;
      setAnalysis(json);
      setReport(null);
      const nextHistory = [
        { id: json.analysisId, createdAt: json.createdAt, source: json.source, label: json.nodes[0]?.name || json.signals[0]?.name || 'analisis SFI' },
        ...history.filter((item) => item.id !== json.analysisId),
      ].slice(0, 8);
      setHistory(nextHistory);
      window.localStorage.setItem('sfi-lab-history', JSON.stringify(nextHistory));
      setStatus(`Analisis listo: ${json.reappearances.length} reapariciones, ${json.signals.length} señales, ${json.nodes.length} nodos.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'sfi_lab_analyze_failed');
    } finally {
      setBusy(false);
    }
  }

  async function generateReport() {
    if (!analysis) return;
    setBusy(true);
    setStatus('Generando reporte...');
    try {
      const response = await fetch('/api/scorefriction/lab/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ analysis }),
      });
      const json = await response.json() as SfiReport & { ok: true };
      setReport(json);
      setStatus('Reporte Markdown generado.');
    } finally {
      setBusy(false);
    }
  }

  async function generateMediaPlan() {
    if (!analysis) return;
    setBusy(true);
    setStatus('Generando media plan...');
    try {
      const response = await fetch('/api/scorefriction/lab/media-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ analysis }),
      });
      const json = await response.json() as { mediaPlan: SfiLabAnalysis['mediaPlan'] };
      setAnalysis({ ...analysis, mediaPlan: json.mediaPlan });
      setStatus('Media plan generado con fallback deterministico.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={embedded ? "bg-black text-[#f4efe4]" : "min-h-screen bg-black text-[#f4efe4]"}>
      <form
        action="/api/scorefriction/lab/analyze"
        method="post"
        encType="multipart/form-data"
        onSubmit={(event) => {
          event.preventDefault();
          void analyze();
        }}
        className={embedded ? "grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]" : "mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[390px_minmax(0,1fr)]"}
      >
        <aside className="space-y-4">
          <div className="border border-[#3a3020] bg-[#090908] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#c4a24d]">System Friction Institute</div>
            <h1 className="mt-3 text-3xl font-semibold text-white">SFI-LAB / Campaign Generator</h1>
            <p className="mt-2 text-sm leading-6 text-[#b8ad98]">Instrumento longitudinal para detectar señales persistentes y generar reportes operativos.</p>
          </div>

          <Panel title="Entrada">
            <label className="block text-xs uppercase tracking-[0.18em] text-[#8f846f]">Modo</label>
            <select name="mode" value={mode} onChange={(event) => setMode(event.target.value as SfiLabMode)} className="mt-2 w-full border border-[#29251c] bg-black p-3 text-sm text-white outline-none focus:border-[#c4a24d]">
              {MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <label className="mt-4 block text-xs uppercase tracking-[0.18em] text-[#8f846f]">Source</label>
            <input name="source" value={source} onChange={(event) => setSource(event.target.value)} className="mt-2 w-full border border-[#29251c] bg-black p-3 text-sm text-white outline-none focus:border-[#c4a24d]" />
            <label className="mt-4 block text-xs uppercase tracking-[0.18em] text-[#8f846f]">Tags</label>
            <input name="tags" value={tags} onChange={(event) => setTags(event.target.value)} className="mt-2 w-full border border-[#29251c] bg-black p-3 text-sm text-white outline-none focus:border-[#c4a24d]" />
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-[#4b3f2a] p-4 text-sm text-[#d8c27a] hover:border-[#c4a24d]">
              <Upload size={16} /> Upload archivo
              <input name="file" type="file" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
            </label>
            {fileMeta ? <p className="mt-2 font-mono text-[11px] text-[#8f846f]">{fileMeta.name} · {Math.round(fileMeta.size / 1024)}kb</p> : null}
          </Panel>

          <Panel title="Historial">
            <div className="space-y-2">
              {history.length ? history.map((item) => (
                <div key={item.id} className="border border-[#211d16] p-3">
                  <div className="font-mono text-[10px] text-[#c4a24d]">{item.id}</div>
                  <div className="mt-1 text-sm text-white">{item.label}</div>
                  <div className="text-xs text-[#8f846f]">{item.source}</div>
                </div>
              )) : <p className="text-sm text-[#8f846f]">Sin analisis guardados en este navegador.</p>}
            </div>
          </Panel>
        </aside>

        <section className="space-y-4">
          <Panel title="Archivo / señal">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              name="text"
              spellCheck={false}
              className="min-h-[220px] w-full resize-y border border-[#29251c] bg-black p-4 font-mono text-sm leading-6 text-[#e8ddc7] outline-none focus:border-[#c4a24d]"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 border border-[#c4a24d] bg-[#c4a24d] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
                <Play size={16} /> Analyze
              </button>
              <button type="button" disabled={busy || !analysis} onClick={() => void generateReport()} className="inline-flex items-center gap-2 border border-[#3a3020] px-4 py-2 text-sm text-[#ead8aa] disabled:opacity-40">
                <FileText size={16} /> Generate Report
              </button>
              <button type="button" disabled={busy || !analysis} onClick={() => void generateMediaPlan()} className="inline-flex items-center gap-2 border border-[#3a3020] px-4 py-2 text-sm text-[#ead8aa] disabled:opacity-40">
                <Layers3 size={16} /> Generate Media Plan
              </button>
              <button type="button" disabled={!analysis} onClick={() => void navigator.clipboard.writeText(jsonExport)} className="inline-flex items-center gap-2 border border-[#3a3020] px-4 py-2 text-sm text-[#d8d0bd] disabled:opacity-40">
                <Clipboard size={16} /> Copy JSON
              </button>
              <button type="button" disabled={!report} onClick={() => void navigator.clipboard.writeText(markdownExport)} className="inline-flex items-center gap-2 border border-[#3a3020] px-4 py-2 text-sm text-[#d8d0bd] disabled:opacity-40">
                <Clipboard size={16} /> Copy Markdown
              </button>
              <button type="button" disabled={!analysis} onClick={() => downloadText('sfi-lab-analysis.json', jsonExport, 'application/json')} className="inline-flex items-center gap-2 border border-[#3a3020] px-4 py-2 text-sm text-[#d8d0bd] disabled:opacity-40">
                <FileDown size={16} /> Export JSON
              </button>
              <button type="button" disabled={!report} onClick={() => downloadText('sfi-lab-report.md', markdownExport, 'text/markdown')} className="inline-flex items-center gap-2 border border-[#3a3020] px-4 py-2 text-sm text-[#d8d0bd] disabled:opacity-40">
                <FileDown size={16} /> Export Markdown
              </button>
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8f846f]">{status}</p>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Reappearances">
              <ul className="space-y-2 text-sm text-[#d8d0bd]">
                {analysis?.reappearances.slice(0, 6).map((item) => <li key={item.id}>{item.pattern} · recurrence {item.recurrence}</li>) ?? <li>Sin analisis.</li>}
              </ul>
            </Panel>
            <Panel title="Signals">
              <ul className="space-y-2 text-sm text-[#d8d0bd]">
                {analysis?.signals.slice(0, 6).map((item) => <li key={item.id}>{item.name} · {item.status}</li>) ?? <li>Sin analisis.</li>}
              </ul>
            </Panel>
            <Panel title="Nodes">
              <ul className="space-y-2 text-sm text-[#d8d0bd]">
                {analysis?.nodes.length ? analysis.nodes.map((item) => <li key={item.id}>{item.name} · identity {metric(item.identityScore)}</li>) : <li>Sin nodo confirmado; mantener como señal débil.</li>}
              </ul>
            </Panel>
            <Panel title="SFI Vector">
              <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
                {analysis ? Object.entries(analysis.sfiVector).filter(([, value]) => typeof value === 'number').slice(0, 12).map(([key, value]) => (
                  <div key={key} className="border border-[#211d16] p-2"><span className="text-[#c4a24d]">{key}</span><br />{metric(value as number)}</div>
                )) : <div className="col-span-4 text-[#8f846f]">Sin vector.</div>}
              </div>
            </Panel>
            <Panel title="Hypotheses">
              <ul className="space-y-2 text-sm text-[#d8d0bd]">
                {analysis?.hypotheses.map((item) => <li key={item.id}>{item.title}: {item.statement}</li>) ?? <li>Sin hipotesis.</li>}
              </ul>
            </Panel>
            <Panel title="Campaign">
              <p className="text-sm leading-6 text-[#d8d0bd]">{analysis?.campaign.hypothesis ?? 'Sin propuesta.'}</p>
            </Panel>
            <Panel title="Media Plan">
              <ul className="space-y-2 text-sm text-[#d8d0bd]">
                {analysis?.mediaPlan.imagePrompts.slice(0, 3).map((item) => <li key={item}>{item}</li>) ?? <li>Sin plan.</li>}
              </ul>
            </Panel>
            <Panel title="Report">
              <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-[#b8ad98]">{markdownExport}</pre>
            </Panel>
          </div>
        </section>
      </form>
    </main>
  );
}

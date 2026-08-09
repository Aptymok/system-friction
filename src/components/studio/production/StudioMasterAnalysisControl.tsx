'use client';

import { useState } from 'react';

type Props = {
  objectId: string | null;
  objectTitle: string;
  objectType: string;
  analysisStatus: string;
};

type LoopResponse = {
  ok?: boolean;
  error?: string;
  details?: string;
  finite?: boolean;
  minPasses?: number;
  maxPasses?: number;
  passCount?: number;
  convergence?: string;
  final?: {
    result?: {
      summary?: string | null;
      production?: { status?: string; reason?: string; blockers?: string[] };
      identity?: { status?: string; confidence?: number };
    };
    agents?: { executed?: string[] };
    llm?: { provider?: string | null; model?: string | null };
  };
};

function label(value: string | undefined) {
  return String(value ?? '—').replace(/_/g, ' ');
}

export function StudioMasterAnalysisControl({ objectId, objectTitle, objectType, analysisStatus }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LoopResponse | null>(null);

  const eligible = Boolean(objectId) && objectType === 'music' && analysisStatus === 'COMPLETE';

  async function execute() {
    if (!objectId || !eligible || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch(`/api/studio/objects/${encodeURIComponent(objectId)}/master-analysis`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await response.json().catch(() => ({})) as LoopResponse;
      setResult(body);
    } catch (error) {
      setResult({ ok: false, error: 'MASTER_ANALYSIS_REQUEST_FAILED', details: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  if (!objectId) return null;

  return (
    <section className="border-b border-[#2c281f] bg-[#080807] px-5 py-4 text-[#d7d0bf] md:px-10" aria-label="Análisis profundo finito de master">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">MASTER ANALYSIS LOOP · FINITE</span>
          <p className="mt-1 text-sm text-[#eee4cf]">{objectTitle}</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#8f8879]">
            Ejecuta la batería cognitiva, vuelve a observar el estado persistido y cierra cuando la estructura se estabiliza. Mínimo 2 pasadas, máximo 3; nunca espera indefinidamente ni crea un loop autónomo abierto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void execute()}
          disabled={!eligible || busy}
          className="min-w-[250px] border border-[#6e5d31] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#e5cf8a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'ANALIZANDO · PASADAS FINITAS…' : eligible ? 'ANALIZAR MASTER · 2–3 PASADAS' : `NO DISPONIBLE · ${analysisStatus}`}
        </button>
      </div>

      {result ? (
        <div className="mx-auto mt-4 max-w-[1500px] border-t border-[#242017] pt-3 font-mono text-[10px] leading-5 text-[#9f9785]">
          {result.ok ? (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>PASADAS <strong className="text-[#eee4cf]">{result.passCount ?? '—'}/{result.maxPasses ?? 3}</strong></span>
                <span>CIERRE <strong className="text-[#eee4cf]">{label(result.convergence)}</strong></span>
                <span>PRODUCCIÓN <strong className="text-[#eee4cf]">{label(result.final?.result?.production?.status)}</strong></span>
                <span>IDENTIDAD <strong className="text-[#eee4cf]">{label(result.final?.result?.identity?.status)}</strong></span>
                <span>AGENTES <strong className="text-[#eee4cf]">{result.final?.agents?.executed?.length ?? 0}</strong></span>
                <span>LLM <strong className="text-[#eee4cf]">{result.final?.llm?.provider ?? '—'}{result.final?.llm?.model ? ` · ${result.final.llm.model}` : ''}</strong></span>
              </div>
              {result.final?.result?.summary ? <p className="mt-2 max-w-5xl font-sans text-sm leading-6 text-[#d7d0bf]">{result.final.result.summary}</p> : null}
              {result.final?.result?.production?.reason ? <p className="mt-1 font-sans text-xs leading-5 text-[#8f8879]">{result.final.result.production.reason}</p> : null}
            </>
          ) : (
            <p className="text-[#c9877e]">{result.error ?? 'MASTER_ANALYSIS_FAILED'}{result.details ? ` · ${result.details}` : ''}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

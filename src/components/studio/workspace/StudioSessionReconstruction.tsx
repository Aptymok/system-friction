'use client';

import { useEffect, useState } from 'react';

type ReconstructionResult = {
  summary?: string;
  reconstructedObjects?: Array<unknown>;
  relations?: Array<unknown>;
  contradictions?: string[];
  missingEvidence?: string[];
  nextAction?: string;
};

type PersistedReconstruction = {
  id?: string;
  payload?: {
    result?: ReconstructionResult;
    provider?: string | null;
    model?: string | null;
  };
  created_at?: string;
};

function resultFromTrace(value: PersistedReconstruction | null): ReconstructionResult | null {
  return value?.payload?.result ?? null;
}

export function StudioSessionReconstruction({
  sessionId,
  activeObjectId,
  objectCount,
}: {
  sessionId: string | null;
  activeObjectId: string | null;
  objectCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ReconstructionResult | null>(null);
  const [stamp, setStamp] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetch(`/api/studio/session/reconstruct?sessionId=${encodeURIComponent(sessionId)}`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.ok === false) return;
        if (cancelled) return;
        const trace = body.reconstruction as PersistedReconstruction | null;
        setResult(resultFromTrace(trace));
        setStamp(typeof trace?.created_at === 'string' ? trace.created_at : null);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [sessionId]);

  async function reconstruct() {
    if (!sessionId || !activeObjectId) {
      setMessage('La reconstrucción requiere una sesión y al menos un objeto activo.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/studio/session/reconstruct', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, activeObjectId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) throw new Error(String(body?.details ?? body?.error ?? `HTTP ${response.status}`));
      setResult(body.result ?? null);
      setStamp(new Date().toISOString());
      setMessage('Reconstrucción persistida en la sesión privada y registrada en Cognitive Twin.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!sessionId) return null;

  const relationCount = result?.relations?.length ?? 0;
  const missingCount = result?.missingEvidence?.length ?? 0;

  return (
    <section className="mx-auto mb-3 grid max-w-[1500px] gap-4 border border-[#322b1e] bg-[#080706] px-5 py-4 text-[#e8dfca] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#c8a951]">SESSION RECONSTRUCTION · OWNER PRIVATE</div>
        <strong className="mt-1 block text-sm font-medium text-[#f0e5cc]">{objectCount} objetos · reconstrucción longitudinal y relacional del campo actual</strong>
        <p className="mt-2 max-w-4xl text-xs leading-5 text-[#938977]">
          Relee objetos, trazas, hipótesis, intervenciones y cronología de esta sesión bajo el mismo owner_id; ejecuta el runtime cognitivo sobre ese dossier y persiste la reconstrucción. No importa datos de otra cuenta ni supone routing por nombres de archivo.
        </p>
        {result?.summary ? <p className="mt-3 text-sm leading-6 text-[#cfc4ab]">{result.summary}</p> : null}
        {result ? <div className="mt-2 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#756d5e]"><span>RELACIONES {relationCount}</span><span>MISSING {missingCount}</span>{stamp ? <span>{new Date(stamp).toLocaleString('es-MX')}</span> : null}</div> : null}
        {result?.nextAction ? <p className="mt-2 text-xs leading-5 text-[#9d927d]">SIGUIENTE: {result.nextAction}</p> : null}
        {message ? <p className="mt-2 text-xs leading-5 text-[#c9aa54]">{message}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => void reconstruct()}
        disabled={busy || !activeObjectId}
        className="border border-[#6e5a31] bg-[#0b0a07] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#e2c57b] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'RECONSTRUYENDO…' : result ? 'RECONSTRUIR DE NUEVO' : 'RECONSTRUIR SESIÓN'}
      </button>
    </section>
  );
}

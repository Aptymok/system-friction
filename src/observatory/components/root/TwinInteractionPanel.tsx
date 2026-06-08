'use client';

import { useEffect, useState } from 'react';

type AmvVisibleResponse = {
  evento: string;
  resultado: string;
  efecto: string;
  ventana: string;
  ruta_unica: string;
};

type AmvRuntimeResult = {
  ok?: boolean;
  error?: string;
  scope?: string;
  subject?: string;
  response?: AmvVisibleResponse;
  warnings?: string[];
};

type AmvSessionResult = {
  ok?: boolean;
  error?: string;
  sessionId?: string;
  scope?: string;
  briefing?: {
    event?: string;
    risk?: string;
    route?: string;
    generatedAt?: string;
  };
};

const PROMPTS = [
  'que nodo esta peor',
  'muestrame degradacion',
  'que deberia cerrar primero',
  'proyecta atractor',
  'manda esto al Sobre Negro',
  'reconecta esto',
];

function requestedOutput(input: string) {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('degrad') || normalized.includes('peor') || normalized.includes('atorado')) return 'degradation_reading';
  if (
    normalized.includes('define atractor')
    || normalized.includes('proyecta atractor')
    || normalized.includes('que quiero sostener')
    || normalized.includes('hacia donde voy')
    || normalized.includes('que no debo repetir')
    || normalized.includes('atractor')
    || normalized.includes('sostener')
    || normalized.includes('cerrar primero')
    || normalized.includes('avance')
  ) return 'attractor_projection';
  if (normalized.includes('reconecta') || normalized.includes('conexion') || normalized.includes('conexi')) return 'reconnection_proposal';
  if (normalized.includes('perturb') || normalized.includes('accion') || normalized.includes('hacer')) return 'perturbation_route';
  if (normalized.includes('atlas') || normalized.includes('cuadernillo') || normalized.includes('sobre')) return 'artifact_routing';
  if (normalized.includes('ruta') || normalized.includes('escoger') || normalized.includes('elige')) return 'field_direction';
  return 'field_reading';
}

function ResponseLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a7035]">{label}</span><br />
      <span>{children}</span>
    </p>
  );
}

export function TwinInteractionPanel({
  compact = false,
  selectedNodeLabel,
  onArtifactIntent,
}: {
  compact?: boolean;
  selectedNodeLabel?: string | null;
  onArtifactIntent?: () => void;
}) {
  const [input, setInput] = useState('');
  const [session, setSession] = useState<AmvSessionResult | null>(null);
  const [result, setResult] = useState<AmvRuntimeResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/amv/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ scope: 'root' }),
    })
      .then((res) => res.json())
      .then(setSession)
      .catch(() => setSession({ ok: false, error: 'AMV_SESSION_FAILED' }));
  }, []);

  async function submit(value = input) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const output = requestedOutput(trimmed);
    if (output === 'artifact_routing') onArtifactIntent?.();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/amv', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          scope: 'root',
          message: trimmed,
          selectedContext: {},
        }),
      }).then(async (res) => {
        const json = await res.json().catch(() => ({ ok: false, error: `HTTP_${res.status}` }));
        if (!res.ok && !json.error) return { ...json, ok: false, error: `HTTP_${res.status}` };
        return json;
      });
      setResult(response);
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : 'AMV_INTERACTION_FAILED' });
    } finally {
      setLoading(false);
    }
  }

  const answer = result?.ok ? result.response : null;

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">AMV / interlocutor ROOT</div>
        {selectedNodeLabel ? <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#c8a951]">nodo activo: {selectedNodeLabel}</div> : null}
        {session?.briefing ? (
          <div className="mt-2 font-mono text-[8px] leading-4 text-[#7a7568]">
            Briefing diario: {session.briefing.event ?? 'sesion iniciada'} Ruta: {session.briefing.route ?? 'preguntar a AMV.'}
          </div>
        ) : null}
      </div>
      <div className="p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className={`${compact ? 'min-h-20' : 'min-h-24'} w-full resize-none border border-[#1e1c17] bg-[#060605] p-3 font-mono text-xs text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]`}
          placeholder="Preguntale a AMV: que nodo esta peor, proyecta atractor, manda esto al Sobre Negro, reconecta esto"
        />
        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" onClick={() => { setInput(prompt); void submit(prompt); }} className="border border-[#1e1c17] bg-[#131210] px-3 py-2 text-left font-mono text-[9px] text-[#7a7568] hover:border-[#8a7035] hover:text-[#c8a951]">
              {prompt}
            </button>
          ))}
        </div>
        <button type="button" disabled={loading || !input.trim()} onClick={() => void submit()} className="mt-3 border border-[#8a7035] bg-[#2e2410] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40">
          {loading ? 'Leyendo' : 'Enviar a AMV'}
        </button>

        {answer ? (
          <div className="mt-3 border border-[#8a7035] bg-[#2e2410]/30 p-4">
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8a7035]">AMV / scope=root</div>
            <div className="mt-2 space-y-2 text-sm leading-6 text-[#ccc8bc]">
              <ResponseLine label="evento">{answer.evento}</ResponseLine>
              <ResponseLine label="resultado">{answer.resultado}</ResponseLine>
              <ResponseLine label="efecto">{answer.efecto}</ResponseLine>
              <ResponseLine label="ventana">{answer.ventana}</ResponseLine>
              <ResponseLine label="ruta unica">{answer.ruta_unica}</ResponseLine>
            </div>
          </div>
        ) : null}

        {result && !result.ok ? <div className="mt-3 border border-[#5a2020] bg-[#5a2020]/10 p-3 font-mono text-[9px] text-[#c87060]">{result.error ?? 'No fue posible responder AMV.'}</div> : null}
      </div>
    </section>
  );
}

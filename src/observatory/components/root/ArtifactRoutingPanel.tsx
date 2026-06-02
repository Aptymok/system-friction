'use client';

import { useState } from 'react';

type Destination = 'atlas' | 'workbook' | 'black_envelope';

type ProposalResult = {
  ok?: boolean;
  error?: string;
  data?: {
    id?: string;
    status?: string;
    risk_level?: string;
    expected_field_delta?: {
      payload?: {
        seed_hash?: string;
        proposal_hash?: string;
        seed_evidence?: {
          nodes?: unknown[];
          patterns?: unknown[];
          documents?: unknown[];
          mihmRuntimeMatrix?: { sourceState?: string; regime?: string };
        };
      };
    };
  };
};

const ARTIFACTS: Array<{
  destination: Destination;
  title: string;
  subtitle: string;
  function: string;
  placeholder: string;
  action: string;
}> = [
  {
    destination: 'atlas',
    title: 'Atlas',
    subtitle: 'baja entropía · patrones estabilizados',
    function: 'Recibe lo que ya puede organizarse: conceptos, mapas, nodos, taxonomías, evidencias y relaciones verificadas.',
    placeholder: 'Describe el patrón, nodo, evidencia o relación que ya puede quedar ordenada…',
    action: 'Enviar al Atlas',
  },
  {
    destination: 'workbook',
    title: 'Cuadernillo',
    subtitle: 'bifurcación · trabajo activo',
    function: 'Recibe lo que todavía está en proceso: preguntas, hipótesis, fricciones vivas, tensiones que necesitan trabajo manual.',
    placeholder: 'Escribe la pregunta activa, hipótesis, tensión o acción mínima que debe trabajarse…',
    action: 'Enviar al Cuadernillo',
  },
  {
    destination: 'black_envelope',
    title: 'Sobre Negro',
    subtitle: 'sumidero · residuo no metabolizado',
    function: 'Recibe lo que no debe ordenar el sistema todavía: ruido, dolor, anomalía, contradicción sin clasificación, material sin destino.',
    placeholder: 'Deposita anomalía, residuo, ruido, contradicción o señal todavía no clasificable…',
    action: 'Enviar al Sobre Negro',
  },
];

function shortHash(value?: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '—';
}

function focusFromContent(destination: Destination, content: string) {
  const base = [destination, 'artifact_routing', 'pcp'];
  const extracted = content
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_\-]+/)
    .filter((term) => term.length >= 4)
    .slice(0, 6);
  return [...base, ...extracted];
}

function destinationLabel(destination: Destination) {
  if (destination === 'atlas') return 'Atlas';
  if (destination === 'workbook') return 'Cuadernillo';
  return 'Sobre Negro';
}

export function ArtifactRoutingPanel({ compact = false }: { compact?: boolean }) {
  const [drafts, setDrafts] = useState<Record<Destination, string>>({ atlas: '', workbook: '', black_envelope: '' });
  const [busy, setBusy] = useState<Destination | null>(null);
  const [result, setResult] = useState<{ destination: Destination; response: ProposalResult } | null>(null);

  async function route(destination: Destination) {
    const content = drafts[destination].trim();
    if (!content) return;
    setBusy(destination);
    setResult(null);

    try {
      const response = await fetch('/api/twin/propose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          proposal: {
            objective: `Enrutar entrada al artefacto ${destinationLabel(destination)} bajo SFI-PCP-001.`,
            focus: focusFromContent(destination, content),
            requested_output: 'artifact_routing',
            artifact_destination: destination,
            artifact_label: destinationLabel(destination),
            artifact_entry: content,
            acp_instruction: 'Registrar como propuesta gobernada. No ejecutar acción externa. No mutar fuera del ledger ACP.',
          },
        }),
      }).then((res) => res.json());
      setResult({ destination, response });
      if (response.ok) setDrafts((current) => ({ ...current, [destination]: '' }));
    } catch (error) {
      setResult({ destination, response: { ok: false, error: error instanceof Error ? error.message : 'ARTIFACT_ROUTING_FAILED' } });
    } finally {
      setBusy(null);
    }
  }

  const evidence = result?.response.data?.expected_field_delta?.payload?.seed_evidence;
  const payload = result?.response.data?.expected_field_delta?.payload;

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">PCP · Artifact Routing Persistence</p>
        <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Atlas · Cuadernillo · Sobre Negro</h2>
        <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">
          Cada entrada crea una propuesta ACP trazable. No es nota suelta. No ejecuta. No clasifica sin registro.
        </p>
      </div>

      <div className={`grid grid-cols-1 gap-1 p-3 ${compact ? '' : 'xl:grid-cols-3'}`}>
        {ARTIFACTS.map((artifact) => (
          <article key={artifact.destination} className="border border-[#1e1c17] bg-[#131210] p-4">
            <div className="font-serif text-xl text-[#c8a951]">{artifact.title}</div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#8a7035]">{artifact.subtitle}</div>
            <p className="mt-4 min-h-20 text-xs leading-6 text-[#7a7568]">{artifact.function}</p>
            <textarea
              value={drafts[artifact.destination]}
              onChange={(event) => setDrafts((current) => ({ ...current, [artifact.destination]: event.target.value }))}
              className="mt-3 min-h-28 w-full resize-none border border-[#1e1c17] bg-[#060605] p-3 font-mono text-xs text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]"
              placeholder={artifact.placeholder}
            />
            <button
              type="button"
              disabled={busy === artifact.destination || !drafts[artifact.destination].trim()}
              onClick={() => void route(artifact.destination)}
              className="mt-3 w-full border border-[#8a7035] bg-[#2e2410] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40"
            >
              {busy === artifact.destination ? 'Registrando' : artifact.action}
            </button>
          </article>
        ))}
      </div>

      {result ? (
        <div className={`m-3 border p-3 font-mono text-[9px] ${result.response.ok ? 'border-[#2a5a3a] bg-[#2a5a3a]/10 text-[#6ab88a]' : 'border-[#5a2020] bg-[#5a2020]/10 text-[#c87060]'}`}>
          {result.response.ok ? (
            <div className="space-y-2">
              <div className="uppercase tracking-[0.14em]">Entrada enviada a {destinationLabel(result.destination)} · propuesta {result.response.data?.status ?? 'proposed'}</div>
              <div className="grid grid-cols-2 gap-1 text-[#7a7568] md:grid-cols-4">
                <div className="bg-[#131210] p-2"><span className="text-[#35312a]">id</span><br />{result.response.data?.id?.slice(0, 8) ?? '—'}</div>
                <div className="bg-[#131210] p-2"><span className="text-[#35312a]">nodes</span><br />{evidence?.nodes?.length ?? 0}</div>
                <div className="bg-[#131210] p-2"><span className="text-[#35312a]">patterns</span><br />{evidence?.patterns?.length ?? 0}</div>
                <div className="bg-[#131210] p-2"><span className="text-[#35312a]">docs</span><br />{evidence?.documents?.length ?? 0}</div>
                <div className="bg-[#131210] p-2"><span className="text-[#35312a]">MIHM</span><br />{evidence?.mihmRuntimeMatrix?.sourceState ?? '—'}</div>
                <div className="bg-[#131210] p-2"><span className="text-[#35312a]">regime</span><br />{evidence?.mihmRuntimeMatrix?.regime ?? '—'}</div>
                <div className="bg-[#131210] p-2"><span className="text-[#35312a]">proposal</span><br />{shortHash(payload?.proposal_hash)}</div>
                <div className="bg-[#131210] p-2"><span className="text-[#35312a]">seed</span><br />{shortHash(payload?.seed_hash)}</div>
              </div>
              <div className="text-[#8a7035]">El registro queda en cola ACP. Para cerrar el ciclo: Propuestas → aprobar/preparar/cerrar.</div>
            </div>
          ) : (
            <div>{result.response.error ?? 'No fue posible enrutar el artefacto.'}</div>
          )}
        </div>
      ) : null}
    </section>
  );
}
